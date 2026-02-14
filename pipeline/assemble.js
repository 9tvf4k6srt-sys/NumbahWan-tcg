#!/usr/bin/env node
/**
 * NWG Trailer Pipeline — Assembler v2
 * 
 * Reads a trailer manifest JSON and assembles the final video:
 * 1. Validates all source assets exist
 * 2. Trims/prepares video clips with camera motions
 * 3. Burns captions with FFmpeg drawtext + auto-wrap for vertical
 * 4. Concatenates with transitions (crossfade, dip-to-black, flash-white)
 * 5. Overlays music track with fade-in/out
 * 6. Exports web-optimized MP4 in 16:9 and optionally native 9:16
 * 
 * Usage:
 *   node pipeline/assemble.js manifest.json [--music=track.mp3] [--vertical] [--preview]
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, basename } from 'path';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const WORK = join(ROOT, 'pipeline', '.work');
const OUT = join(ROOT, 'pipeline', 'output');

// ─── CLI Arg Parsing ────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const positional = args.filter(a => !a.startsWith('--'));

const manifestPath = positional[0];
const musicArg = flags.find(f => f.startsWith('--music='))?.split('=')[1] || positional[1] || null;
const doVertical = flags.includes('--vertical');
const doPreview = flags.includes('--preview');
const TRANSITION_DURATION = 0.6;

// ─── Helpers ────────────────────────────────────────────────────
function run(cmd, label) {
  const short = cmd.length > 140 ? cmd.slice(0, 137) + '...' : cmd;
  console.log(`  [${label || 'cmd'}] ${short}`);
  try {
    return execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 50 * 1024 * 1024 }).toString().trim();
  } catch (e) {
    console.error(`  ERROR: ${e.stderr?.toString().slice(0, 500) || e.message}`);
    throw e;
  }
}

function ensureDir(d) { mkdirSync(d, { recursive: true }); }
function cleanWork() {
  if (existsSync(WORK)) {
    readdirSync(WORK).forEach(f => { try { unlinkSync(join(WORK, f)); } catch {} });
  }
}

function getDuration(file) {
  return parseFloat(run(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${file}"`, 'probe'
  ));
}

function resolveSource(src) {
  const p = join(PUBLIC, src);
  if (existsSync(p)) return p;
  throw new Error(`Source not found: ${src}`);
}

// Escape text for FFmpeg drawtext
function escText(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\u2019')
    .replace(/:/g, '\\:')
    .replace(/%/g, '%%')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/**
 * Wraps text to fit within a given pixel width.
 * Assumes each character is ~0.55 * fontSize pixels wide.
 */
function wrapText(text, fontSize, maxWidthPx) {
  const avgCharWidth = fontSize * 0.55;
  const maxChars = Math.floor(maxWidthPx / avgCharWidth);
  if (text.length <= maxChars) return [text];

  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line.length + word.length + 1 > maxChars && line.length > 0) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ─── Caption Builder with auto-wrap ─────────────────────────────
function buildCaptionFilters(scene, meta, resW, resH) {
  const en = scene.caption || '';
  if (!en) return [];

  const style = { ...meta.caption_style, ...(scene.caption_style_override || {}) };
  const delay = scene.caption_delay || 0.5;
  const dur = scene.caption_duration || (scene.duration - 1);
  const showStart = delay;
  const showEnd = delay + dur;
  const enableExpr = `between(t\\,${showStart.toFixed(2)}\\,${showEnd.toFixed(2)})`;

  const scaleFactor = resH / 720;
  const baseSizes = { small: 24, medium: 32, large: 48, xlarge: 64 };
  let fontSize = Math.round((baseSizes[style.size] || 32) * scaleFactor);

  // For vertical (narrow) formats, reduce font size
  const isVertical = resW < resH;
  if (isVertical) fontSize = Math.round(fontSize * 0.75);

  const color = (style.color || '#FFFFFF').replace('#', '');
  const pos = style.position || 'bottom-center';
  const isCenter = pos === 'center';

  // Wrap text for available width (85% safe zone)
  const safeWidth = Math.round(resW * 0.85);
  const lines = wrapText(en, fontSize, safeWidth);
  const lineGap = Math.round(6 * scaleFactor);

  // Calculate total block height
  const totalH = lines.length * (fontSize + lineGap);
  const margin = Math.round(isVertical ? 120 * scaleFactor : 60 * scaleFactor);
  const baseY = isCenter ? `(h-${totalH})/2` : `h-${totalH}-${margin}`;

  const filters = [];
  let yOffset = 0;

  for (const line of lines) {
    const yExpr = `${baseY}+${yOffset}`;
    filters.push(
      `drawtext=text='${escText(line)}':fontsize=${fontSize}:fontcolor=0x${color}:` +
      `x=(w-tw)/2:y=${yExpr}:` +
      `shadowcolor=0x000000@0.85:shadowx=3:shadowy=3:` +
      `borderw=1:bordercolor=0x000000@0.3:` +
      `enable='${enableExpr}'`
    );
    yOffset += fontSize + lineGap;
  }

  return filters;
}

// ─── Scene Processors ──────────────────────────────────────────
function processImageScene(scene, meta, idx, resW, resH) {
  const src = resolveSource(scene.source);
  const outFile = join(WORK, `scene-${idx.toString().padStart(2, '0')}.mp4`);
  const dur = scene.duration || 5;
  const fps = meta.fps || 24;
  const totalFrames = dur * fps;

  const cam = scene.camera || 'static';
  const zoomPresets = {
    'slow-zoom-in': `z='min(zoom+0.0008,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
    'slow-zoom-out': `z='if(eq(on,1),1.15,max(zoom-0.0008,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
    'slow-pan-right': `z='1.1':x='if(eq(on,1),0,min(x+2,iw-iw/zoom))':y='ih/2-(ih/zoom/2)'`,
    'slow-pan-left': `z='1.1':x='if(eq(on,1),iw/zoom,max(x-2,0))':y='ih/2-(ih/zoom/2)'`,
    'slow-dolly-forward': `z='min(zoom+0.001,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
    'slow-tilt-down': `z='1.1':x='iw/2-(iw/zoom/2)':y='if(eq(on,1),0,min(y+1,ih-ih/zoom))'`,
    'static': `z='1.0':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
  };
  const zp = zoomPresets[cam] || zoomPresets['static'];
  const zoompan = `zoompan=${zp}:d=${totalFrames}:s=${resW}x${resH}:fps=${fps}`;

  let filters = [zoompan, `format=yuv420p`];
  const captionFilters = buildCaptionFilters(scene, meta, resW, resH);
  filters.push(...captionFilters);

  const preset = doPreview ? 'ultrafast' : 'fast';
  run(
    `ffmpeg -y -loop 1 -i "${src}" -vf "${filters.join(',')}" -t ${dur} -c:v libx264 -preset ${preset} -crf 22 -an "${outFile}"`,
    `img-${scene.id}`
  );
  return outFile;
}

function processVideoScene(scene, meta, idx, resW, resH) {
  const src = resolveSource(scene.source);
  const outFile = join(WORK, `scene-${idx.toString().padStart(2, '0')}.mp4`);
  const fps = meta.fps || 24;

  let filters = [`scale=${resW}:${resH}:force_original_aspect_ratio=decrease,pad=${resW}:${resH}:(ow-iw)/2:(oh-ih)/2,setsar=1`];
  const captionFilters = buildCaptionFilters(scene, meta, resW, resH);
  filters.push(...captionFilters);

  const trim = scene.trim || {};
  const ss = trim.start !== undefined ? `-ss ${trim.start}` : '';
  const to = trim.end !== undefined ? `-to ${trim.end}` : '';
  const preset = doPreview ? 'ultrafast' : 'fast';

  run(
    `ffmpeg -y ${ss} ${to} -i "${src}" -vf "${filters.join(',')}" -r ${fps} -c:v libx264 -preset ${preset} -crf 22 -an "${outFile}"`,
    `vid-${scene.id}`
  );
  return outFile;
}

function processTitleCard(scene, meta, idx, resW, resH) {
  const outFile = join(WORK, `scene-${idx.toString().padStart(2, '0')}.mp4`);
  const dur = scene.duration || 4;
  const fps = meta.fps || 24;
  const bg = (scene.background || '#000000').replace('#', '');
  const preset = doPreview ? 'ultrafast' : 'fast';

  // Step 1: Generate plain color background
  const baseFile = join(WORK, `title-base-${idx.toString().padStart(2, '0')}.mp4`);
  run(
    `ffmpeg -y -f lavfi -i "color=c=0x${bg}:size=${resW}x${resH}:d=${dur}:r=${fps},format=yuv420p" -c:v libx264 -preset ultrafast -crf 18 -t ${dur} "${baseFile}"`,
    `title-base-${scene.id}`
  );

  // Step 2: Burn captions on top
  const captionFilters = buildCaptionFilters(scene, meta, resW, resH);
  if (captionFilters.length > 0) {
    run(
      `ffmpeg -y -i "${baseFile}" -vf "${captionFilters.join(',')}" -c:v libx264 -preset ${preset} -crf 22 "${outFile}"`,
      `title-cap-${scene.id}`
    );
  } else {
    run(`cp "${baseFile}" "${outFile}"`, 'copy');
  }
  return outFile;
}

// ─── Transition Engine ──────────────────────────────────────────
function concatenateWithTransitions(clips, scenes) {
  if (clips.length === 1) return clips[0];

  const transitions = [];
  for (let i = 0; i < clips.length - 1; i++) {
    transitions.push(scenes[i]?.transition_out || 'crossfade');
  }

  const durations = clips.map(c => getDuration(c));
  const hasRealTransitions = transitions.some(t => t !== 'cut-on-beat');

  if (!hasRealTransitions) {
    const concatList = join(WORK, 'concat.txt');
    writeFileSync(concatList, clips.map(c => `file '${c}'`).join('\n'));
    const out = join(WORK, 'concat-final.mp4');
    run(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${out}"`, 'concat');
    return out;
  }

  let currentClip = clips[0];
  let currentDur = durations[0];

  for (let i = 0; i < clips.length - 1; i++) {
    const nextClip = clips[i + 1];
    const tType = transitions[i];

    if (tType === 'cut-on-beat') {
      const tmpConcat = join(WORK, `concat-step-${i}.txt`);
      writeFileSync(tmpConcat, `file '${currentClip}'\nfile '${nextClip}'`);
      const tmpOut = join(WORK, `xfade-step-${i}.mp4`);
      run(`ffmpeg -y -f concat -safe 0 -i "${tmpConcat}" -c copy "${tmpOut}"`, `cut-${i}`);
      currentClip = tmpOut;
      currentDur = getDuration(tmpOut);
    } else {
      const offset = Math.max(0, currentDur - TRANSITION_DURATION);
      let xfadeType;
      switch (tType) {
        case 'dip-to-black': case 'fade-to-black': xfadeType = 'fadeblack'; break;
        case 'flash-white': xfadeType = 'fadewhite'; break;
        default: xfadeType = 'fade'; break;
      }

      const tmpOut = join(WORK, `xfade-step-${i}.mp4`);
      run(
        `ffmpeg -y -i "${currentClip}" -i "${nextClip}" ` +
        `-filter_complex "[0:v][1:v]xfade=transition=${xfadeType}:duration=${TRANSITION_DURATION}:offset=${offset.toFixed(3)},format=yuv420p[v]" ` +
        `-map "[v]" -c:v libx264 -preset ${doPreview ? 'ultrafast' : 'fast'} -crf 22 "${tmpOut}"`,
        `xfade-${i}`
      );
      currentClip = tmpOut;
      currentDur = getDuration(tmpOut);
    }
  }
  return currentClip;
}

// ─── Music Overlay ──────────────────────────────────────────────
function addMusic(videoFile, musicPath, outFile) {
  const vidDur = getDuration(videoFile);
  const musicDur = getDuration(musicPath);
  const fadeOutStart = Math.max(0, vidDur - 2.5);
  const audioFilter = `afade=t=in:d=1,afade=t=out:st=${fadeOutStart.toFixed(2)}:d=2.5`;
  const loopFlag = musicDur < vidDur ? '-stream_loop -1' : '';

  run(
    `ffmpeg -y -i "${videoFile}" ${loopFlag} -i "${musicPath}" ` +
    `-filter_complex "[1:a]${audioFilter}[a]" ` +
    `-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 128k -shortest "${outFile}"`,
    'music'
  );
}

// ─── Vertical (9:16) — Native Re-Render ─────────────────────────
function buildVerticalTrailer(manifest, resolvedMusic, outputFile) {
  const { meta, scenes } = manifest;
  const vertW = 720;
  const vertH = 1280;
  const vertMeta = { ...meta, resolution: `${vertW}x${vertH}`, aspect_ratio: '9:16' };

  console.log('  Re-rendering all scenes natively at 720x1280...');

  const clips = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    let clipPath;
    switch (scene.type) {
      case 'image-to-video':
        clipPath = processImageScene(scene, vertMeta, 100 + i, vertW, vertH);
        break;
      case 'video':
        clipPath = processVideoScene(scene, vertMeta, 100 + i, vertW, vertH);
        break;
      case 'title-card':
        clipPath = processTitleCard(scene, vertMeta, 100 + i, vertW, vertH);
        break;
      default:
        continue;
    }
    clips.push(clipPath);
  }

  const concatOut = concatenateWithTransitions(clips, scenes);
  const withMusic = join(WORK, 'vertical-music.mp4');

  if (resolvedMusic) {
    addMusic(concatOut, resolvedMusic, withMusic);
  } else {
    run(
      `ffmpeg -y -i "${concatOut}" -f lavfi -i "anullsrc=r=44100:cl=stereo" ` +
      `-map 0:v -map 1:a -c:v copy -c:a aac -b:a 64k -shortest "${withMusic}"`,
      'vert-silence'
    );
  }

  const encPreset = doPreview ? 'ultrafast' : 'slow';
  run(
    `ffmpeg -y -i "${withMusic}" -c:v libx264 -preset ${encPreset} -crf 23 ` +
    `-b:v 1500k -maxrate 2000k -bufsize 3000k -c:a aac -b:a 128k ` +
    `-movflags +faststart "${outputFile}"`,
    'optimize-9x16'
  );
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  if (!manifestPath) {
    console.error('Usage: node pipeline/assemble.js <manifest.json> [music.mp3] [--vertical] [--preview]');
    console.error('  --music=path    Specify music track');
    console.error('  --vertical      Also export native 9:16 vertical version');
    console.error('  --preview       Fast low-res preview build');
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const { meta, scenes } = manifest;

  const musicPath = musicArg || meta.music_file || null;
  const resolvedMusic = musicPath && existsSync(join(ROOT, musicPath))
    ? join(ROOT, musicPath)
    : (musicPath && existsSync(musicPath) ? musicPath : null);

  const [resW, resH] = (meta.resolution || '1280x720').split('x').map(Number);

  console.log(`\n======================================================`);
  console.log(`  NWG Trailer Pipeline - Assembler v2`);
  console.log(`======================================================`);
  console.log(`  Title:      ${meta.title}`);
  console.log(`  Scenes:     ${scenes.length}`);
  console.log(`  Target:     ~${meta.duration_target_seconds}s @ ${resW}x${resH} ${meta.fps}fps`);
  console.log(`  Music:      ${resolvedMusic || '(silent)'}`);
  console.log(`  Vertical:   ${doVertical ? 'YES (native 9:16)' : 'no'}`);
  console.log(`  Preview:    ${doPreview ? 'YES (fast)' : 'no (production)'}`);
  console.log('');

  ensureDir(WORK);
  ensureDir(OUT);
  cleanWork();

  // Step 1: Process scenes
  console.log('-- Step 1: Processing scenes --');
  const clips = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`\n  [${i + 1}/${scenes.length}] ${scene.id} (${scene.type}) "${scene.caption || '(no caption)'}"`);

    let clipPath;
    switch (scene.type) {
      case 'image-to-video': clipPath = processImageScene(scene, meta, i, resW, resH); break;
      case 'video': clipPath = processVideoScene(scene, meta, i, resW, resH); break;
      case 'title-card': clipPath = processTitleCard(scene, meta, i, resW, resH); break;
      default: console.warn(`  SKIP: Unknown type "${scene.type}"`); continue;
    }

    const clipDur = getDuration(clipPath);
    console.log(`  -> ${basename(clipPath)} (${clipDur.toFixed(1)}s)`);
    clips.push(clipPath);
  }

  // Step 2: Concatenate with transitions
  console.log('\n-- Step 2: Concatenating with transitions --');
  const transTypes = scenes.map(s => s.transition_out || 'crossfade');
  console.log(`  Transitions: ${transTypes.slice(0, -1).join(' -> ')}`);

  const concatOut = concatenateWithTransitions(clips, scenes);
  const totalDur = getDuration(concatOut);
  console.log(`  Total duration: ${totalDur.toFixed(1)}s`);

  // Step 3: Add music
  const titleSlug = meta.title.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().replace(/-+$/, '');
  const withMusic = join(WORK, `${titleSlug}-music.mp4`);

  if (resolvedMusic) {
    console.log('\n-- Step 3: Adding music (fade in 1s, fade out 2.5s) --');
    addMusic(concatOut, resolvedMusic, withMusic);
  } else {
    console.log('\n-- Step 3: No music - adding silence --');
    run(
      `ffmpeg -y -i "${concatOut}" -f lavfi -i "anullsrc=r=44100:cl=stereo" ` +
      `-map 0:v -map 1:a -c:v copy -c:a aac -b:a 64k -shortest "${withMusic}"`,
      'silence'
    );
  }

  // Step 4: Web optimization
  console.log('\n-- Step 4: Web optimization --');
  const webOut = join(OUT, `${titleSlug}-web.mp4`);
  const encPreset = doPreview ? 'ultrafast' : 'slow';
  run(
    `ffmpeg -y -i "${withMusic}" -c:v libx264 -preset ${encPreset} -crf 23 ` +
    `-b:v 1500k -maxrate 2000k -bufsize 3000k -c:a aac -b:a 128k ` +
    `-movflags +faststart "${webOut}"`,
    'optimize'
  );

  const finalSize = run(`du -h "${webOut}" | cut -f1`, 'size');
  const finalDur = getDuration(webOut);
  console.log(`\n  16:9 -> ${webOut}  (${finalSize}, ${finalDur.toFixed(1)}s)`);

  // Step 5: Vertical export (optional, native re-render)
  let vertOut = null;
  if (doVertical) {
    console.log('\n-- Step 5: Native 9:16 vertical re-render --');
    vertOut = join(OUT, `${titleSlug}-vertical-web.mp4`);
    buildVerticalTrailer(manifest, resolvedMusic, vertOut);
    const vertSize = run(`du -h "${vertOut}" | cut -f1`, 'size');
    const vertDur = getDuration(vertOut);
    console.log(`  9:16 -> ${vertOut}  (${vertSize}, ${vertDur.toFixed(1)}s)`);
  }

  // Summary
  console.log(`\n======================================================`);
  console.log(`  BUILD COMPLETE`);
  console.log(`======================================================`);
  console.log(`  16:9  ${webOut}  (${finalSize}, ${finalDur.toFixed(1)}s)`);
  if (vertOut) {
    const vs = run(`du -h "${vertOut}" | cut -f1`, 'size');
    console.log(`  9:16  ${vertOut}  (${vs})`);
  }
  console.log(`  Scenes: ${clips.length}  |  Music: ${resolvedMusic ? 'YES' : 'silent'}`);
  console.log('');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
