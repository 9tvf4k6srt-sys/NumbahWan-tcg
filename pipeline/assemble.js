#!/usr/bin/env node
/**
 * NWG Trailer Pipeline — Assembler
 * 
 * Reads a trailer manifest JSON and assembles the final video:
 * 1. Validates all source assets exist
 * 2. Trims/prepares video clips
 * 3. Burns captions with FFmpeg drawtext
 * 4. Concatenates with transitions
 * 5. Overlays music track
 * 6. Exports web-optimized MP4
 * 
 * Usage: node pipeline/assemble.js pipeline/trailer-manifest.json [music.mp3]
 */

import { execSync, exec } from 'child_process';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename, dirname } from 'path';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const WORK = join(ROOT, 'pipeline', '.work');
const OUT = join(ROOT, 'pipeline', 'output');

// ─── Helpers ────────────────────────────────────────────────────────
function run(cmd, label) {
  console.log(`  [${label || 'cmd'}] ${cmd.slice(0, 120)}${cmd.length > 120 ? '...' : ''}`);
  try {
    return execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 50 * 1024 * 1024 }).toString().trim();
  } catch (e) {
    console.error(`  ERROR: ${e.stderr?.toString().trim() || e.message}`);
    throw e;
  }
}

function ensureDir(d) { mkdirSync(d, { recursive: true }); }

function getDuration(file) {
  return parseFloat(run(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${file}"`,
    'probe'
  ));
}

function resolveSource(src, fallback) {
  const p = join(PUBLIC, src);
  if (existsSync(p)) return p;
  if (fallback) {
    const fb = join(PUBLIC, fallback);
    if (existsSync(fb)) return fb;
  }
  throw new Error(`Source not found: ${src} (and no valid fallback)`);
}

// ─── Caption Filter Builder ─────────────────────────────────────────
function buildCaptionFilter(scene, meta) {
  if (!scene.caption || scene.caption.trim() === '') return null;

  const style = { ...meta.caption_style, ...(scene.caption_style_override || {}) };
  const delay = scene.caption_delay || 0.5;
  const dur = scene.caption_duration || (scene.duration - 1);
  const fadeIn = 0.5;
  const fadeOut = 0.5;

  // Font size mapping
  const sizeMap = { small: 24, medium: 32, large: 48, xlarge: 64 };
  const fontSize = sizeMap[style.size] || 32;
  
  // Font
  const font = style.font || meta.caption_style.font || 'sans-serif';
  const color = (style.color || meta.caption_style.color || '#FFFFFF').replace('#', '');
  const weight = style.weight || meta.caption_style.weight || 700;
  
  // Escape caption for FFmpeg
  const text = scene.caption.replace(/'/g, "\\'").replace(/:/g, "\\:");

  // Position
  const pos = style.position || 'bottom-center';
  let x = '(w-tw)/2', y = 'h-th-80';
  if (pos === 'center') { y = '(h-th)/2'; }
  else if (pos === 'top-center') { y = '80'; }

  // Alpha envelope: fade in, hold, fade out
  const alphaExpr = `if(lt(t,${delay}),0,if(lt(t,${delay + fadeIn}),(t-${delay})/${fadeIn},if(lt(t,${delay + dur - fadeOut}),1,if(lt(t,${delay + dur}),(${delay + dur}-t)/${fadeOut},0))))`;

  return `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=0x${color}:` +
    `x=${x}:y=${y}:` +
    `shadowcolor=0x000000@0.8:shadowx=2:shadowy=2:` +
    `alpha='${alphaExpr}'`;
}

// ─── Scene Processors ──────────────────────────────────────────────
function processImageScene(scene, meta, idx) {
  const src = resolveSource(scene.source, scene.source_fallback);
  const outFile = join(WORK, `scene-${idx.toString().padStart(2, '0')}.mp4`);
  const dur = scene.duration || 5;
  const fps = meta.fps || 24;
  const [w, h] = (meta.resolution || '1280x720').split('x').map(Number);

  // Camera motion via zoompan
  const cam = scene.camera || 'static';
  let zoompan = '';
  const totalFrames = dur * fps;
  
  switch (cam) {
    case 'slow-zoom-in':
      zoompan = `zoompan=z='min(zoom+0.0008,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=${fps}`;
      break;
    case 'slow-zoom-out':
      zoompan = `zoompan=z='if(eq(on,1),1.15,max(zoom-0.0008,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=${fps}`;
      break;
    case 'slow-pan-right':
      zoompan = `zoompan=z='1.1':x='if(eq(on,1),0,min(x+2,iw-iw/zoom))':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=${fps}`;
      break;
    case 'slow-pan-left':
      zoompan = `zoompan=z='1.1':x='if(eq(on,1),iw/zoom,max(x-2,0))':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=${fps}`;
      break;
    case 'slow-dolly-forward':
      zoompan = `zoompan=z='min(zoom+0.001,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=${fps}`;
      break;
    default: // static
      zoompan = `zoompan=z='1.0':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=${fps}`;
  }

  // Build filter chain
  let filters = [zoompan, `format=yuv420p`];
  const captionFilter = buildCaptionFilter(scene, meta);
  if (captionFilter) filters.push(captionFilter);

  const filterStr = filters.join(',');
  run(
    `ffmpeg -y -loop 1 -i "${src}" -vf "${filterStr}" -t ${dur} -c:v libx264 -preset fast -crf 22 -an "${outFile}"`,
    `scene-${idx}`
  );

  return outFile;
}

function processVideoScene(scene, meta, idx) {
  const src = resolveSource(scene.source);
  const outFile = join(WORK, `scene-${idx.toString().padStart(2, '0')}.mp4`);
  const [w, h] = (meta.resolution || '1280x720').split('x').map(Number);
  const fps = meta.fps || 24;

  let filters = [`scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1`];
  const captionFilter = buildCaptionFilter(scene, meta);
  if (captionFilter) filters.push(captionFilter);

  const trim = scene.trim || {};
  const ss = trim.start !== undefined ? `-ss ${trim.start}` : '';
  const to = trim.end !== undefined ? `-to ${trim.end}` : '';

  run(
    `ffmpeg -y ${ss} ${to} -i "${src}" -vf "${filters.join(',')}" -r ${fps} -c:v libx264 -preset fast -crf 22 -an "${outFile}"`,
    `scene-${idx}`
  );

  return outFile;
}

function processTitleCard(scene, meta, idx) {
  const outFile = join(WORK, `scene-${idx.toString().padStart(2, '0')}.mp4`);
  const dur = scene.duration || 4;
  const fps = meta.fps || 24;
  const [w, h] = (meta.resolution || '1280x720').split('x').map(Number);
  const bg = (scene.background || '#000000').replace('#', '');

  let filters = [`color=c=0x${bg}:size=${w}x${h}:d=${dur}:r=${fps},format=yuv420p`];
  const captionFilter = buildCaptionFilter(scene, meta);
  if (captionFilter) filters.push(captionFilter);

  run(
    `ffmpeg -y -f lavfi -i "${filters.join(',')}" -c:v libx264 -preset fast -crf 22 -t ${dur} "${outFile}"`,
    `scene-${idx}`
  );

  return outFile;
}

// ─── Main ──────────────────────────────────────────────────────────
async function main() {
  const manifestPath = process.argv[2];
  const musicPath = process.argv[3] || null;

  if (!manifestPath) {
    console.error('Usage: node pipeline/assemble.js <manifest.json> [music.mp3]');
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const { meta, scenes } = manifest;

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  NWG Trailer Pipeline — Assembler             ║`);
  console.log(`╚══════════════════════════════════════════════╝`);
  console.log(`  Title:    ${meta.title}`);
  console.log(`  Scenes:   ${scenes.length}`);
  console.log(`  Target:   ${meta.duration_target_seconds}s @ ${meta.resolution} ${meta.fps}fps`);
  console.log(`  Music:    ${musicPath || '(none — will be silent or add later)'}`);
  console.log('');

  ensureDir(WORK);
  ensureDir(OUT);

  // Step 1: Process each scene
  console.log('── Step 1: Processing scenes ──');
  const clips = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`\n  [${i + 1}/${scenes.length}] ${scene.id} (${scene.type}) — "${scene.caption || '(no caption)'}"`);
    
    let clipPath;
    switch (scene.type) {
      case 'image-to-video':
        clipPath = processImageScene(scene, meta, i);
        break;
      case 'video':
        clipPath = processVideoScene(scene, meta, i);
        break;
      case 'title-card':
        clipPath = processTitleCard(scene, meta, i);
        break;
      default:
        console.warn(`  SKIP: Unknown scene type "${scene.type}"`);
        continue;
    }
    
    const clipDur = getDuration(clipPath);
    console.log(`  → ${basename(clipPath)} (${clipDur.toFixed(1)}s)`);
    clips.push(clipPath);
  }

  // Step 2: Concatenate
  console.log('\n── Step 2: Concatenating clips ──');
  const concatList = join(WORK, 'concat.txt');
  writeFileSync(concatList, clips.map(c => `file '${c}'`).join('\n'));
  
  const concatOut = join(WORK, 'concat-raw.mp4');
  run(
    `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${concatOut}"`,
    'concat'
  );
  const totalDur = getDuration(concatOut);
  console.log(`  Total duration: ${totalDur.toFixed(1)}s`);

  // Step 3: Add music (if provided)
  const titleSlug = meta.title.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().replace(/-+$/, '');
  const finalOut = join(OUT, `${titleSlug}.mp4`);

  if (musicPath && existsSync(musicPath)) {
    console.log('\n── Step 3: Adding music track ──');
    run(
      `ffmpeg -y -i "${concatOut}" -i "${musicPath}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 128k -shortest "${finalOut}"`,
      'music'
    );
  } else {
    console.log('\n── Step 3: No music — adding silence ──');
    run(
      `ffmpeg -y -i "${concatOut}" -f lavfi -i "anullsrc=r=44100:cl=stereo" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 64k -shortest "${finalOut}"`,
      'silence'
    );
  }

  // Step 4: Optimize for web
  console.log('\n── Step 4: Web optimization (fast-start) ──');
  const webOut = join(OUT, `${titleSlug}-web.mp4`);
  run(
    `ffmpeg -y -i "${finalOut}" -c:v libx264 -preset slow -crf 23 -b:v 1500k -maxrate 2000k -bufsize 3000k -c:a aac -b:a 128k -movflags +faststart "${webOut}"`,
    'optimize'
  );

  const finalSize = run(`du -h "${webOut}" | cut -f1`, 'size');
  const finalDur = getDuration(webOut);

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  BUILD COMPLETE                               ║`);
  console.log(`╚══════════════════════════════════════════════╝`);
  console.log(`  Output:   ${webOut}`);
  console.log(`  Duration: ${finalDur.toFixed(1)}s`);
  console.log(`  Size:     ${finalSize}`);
  console.log(`  Scenes:   ${clips.length}`);
  console.log('');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
