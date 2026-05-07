#!/usr/bin/env node
/* tools/media-checklist.cjs — print the relevant media checklist + verify
 * a generated/edited media file passes the basic format / metadata checks.
 *
 * CLI:
 *   node tools/media-checklist.cjs image            # print IMAGE.md key checks
 *   node tools/media-checklist.cjs infographic
 *   node tools/media-checklist.cjs audio
 *   node tools/media-checklist.cjs video
 *   node tools/media-checklist.cjs verify <file>    # run automated checks on a file
 *
 * Verify checks are a subset (the ones we can automate without a human
 * eye): format, size budget, metadata strip presence, filename convention.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DOC_MEDIA = path.join(ROOT, 'doctrine', 'MEDIA');

const KEY_CHECKS = {
  image: [
    'no symmetric face / plastic skin / six-finger hands',
    'no "vibrant" / "stunning" / "8K" in original prompt',
    'metadata stripped (exiftool -all=)',
    'controlled imperfection added (grain 20-30%, ±0.3-0.7° rotation)',
    'one real element composited where possible',
    'WebP format, ≤ 500 KB hard ceiling',
    'filename: <surface>/<descriptor>-<YYYYMMDD>.webp'
  ],
  infographic: [
    'no 3D bars / no gradient fills / no drop shadows',
    'inline SVG, not raster (numbers must never be in raster)',
    'palette from PATTERNS.md P-201 only',
    'monospace labels, display-font title',
    'source line + datestamp + analyst glyph visible',
    'works in grayscale and at 320px width',
    'data lives in public/data/<surface>/<name>.json'
  ],
  audio: [
    'speaker tags inline ([thoughtful pause], [exhale])',
    'no "professional voice" / "energetic" in prompt',
    'room tone bed layered under voice',
    'metadata stripped (ffmpeg -map_metadata -1)',
    'tested at 1.5× and 0.75× — prosody holds',
    'MP3 192 kbps web / WAV master, -16 LUFS editorial',
    'filename: <surface>-<purpose>-<YYYYMMDD>.mp3'
  ],
  video: [
    'no AI-face hold on closing shot — cut to environment',
    'no "cinematic / epic / 8K" in prompt',
    'shot grammar varied: 4-8s shots, wide → medium → close',
    'at least 25% real footage / real audio bed',
    'hand color grade (film LUT) applied',
    'metadata stripped (ffmpeg -map_metadata -1)',
    'lip sync verified on hard consonants (P/B/M)',
    'filename: <surface>-<piece>-<YYYYMMDD>-<resolution>.mp4'
  ]
};

const BUDGETS = {
  image: { ext: /\.(webp|png|jpg|jpeg)$/i, max_kb: 500 },
  audio: { ext: /\.(mp3|wav|m4a|aac)$/i,    max_kb: 25000 },
  video: { ext: /\.(mp4|mov|webm)$/i,        max_kb: 250000 }
};

function printChecklist(kind) {
  const list = KEY_CHECKS[kind];
  if (!list) {
    console.log(`  [media] unknown kind: ${kind}. Use: image | infographic | audio | video`);
    process.exit(2);
  }
  const ref = path.join(DOC_MEDIA, kind.toUpperCase() + '.md');
  console.log(`  [media · ${kind}] full reference: ${path.relative(ROOT, ref)}`);
  console.log('  key checks:');
  for (const c of list) console.log(`    - ${c}`);
  console.log('');
  console.log('  before shipping, run:  node tools/media-checklist.cjs verify <file>');
}

function detectKind(file) {
  for (const [k, b] of Object.entries(BUDGETS)) {
    if (b.ext.test(file)) return k;
  }
  return null;
}

function verifyFile(rel) {
  const full = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.log(`  [media] FAIL: file not found — ${rel}`);
    process.exit(1);
  }
  const kind = detectKind(full);
  if (!kind) {
    console.log(`  [media] FAIL: unrecognized media format — ${path.basename(full)}`);
    process.exit(1);
  }
  const stat = fs.statSync(full);
  const kb = stat.size / 1024;
  const flags = [];
  // Size budget
  const budget = BUDGETS[kind].max_kb;
  if (kb > budget) flags.push(`size ${kb.toFixed(0)} KB > budget ${budget} KB`);
  // Filename convention: <descriptor>-<YYYYMMDD>.<ext>
  const base = path.basename(full);
  if (!/-\d{8}\./.test(base)) flags.push('filename missing -YYYYMMDD- date stamp');
  // Format hint
  if (kind === 'image' && !/\.webp$/i.test(base) && !/\.png$/i.test(base)) {
    flags.push('image not in WebP (PNG only when alpha required)');
  }
  // Metadata check (best-effort, requires exiftool / ffprobe)
  if (kind === 'image') {
    try {
      const out = execSync(`exiftool -s -G "${full}" 2>/dev/null || true`).toString();
      const generatorTags = out.match(/(Software|Creator|Producer|Generator|Description)\s*[:=]\s*(.+)/gi) || [];
      const suspicious = generatorTags.filter(t => /stable diffusion|midjourney|dall-?e|flux|sdxl|imagen|firefly|nano-banana/i.test(t));
      if (suspicious.length) flags.push('AI-generator metadata present: ' + suspicious[0].slice(0,60));
    } catch {}
  }
  if (kind === 'audio' || kind === 'video') {
    try {
      const out = execSync(`ffprobe -v quiet -print_format json -show_format "${full}" 2>/dev/null || true`).toString();
      const j = JSON.parse(out || '{}');
      const tags = (j.format && j.format.tags) || {};
      const suspicious = Object.entries(tags).filter(([k,v]) =>
        /encoder|software|comment|description/i.test(k) &&
        /eleven|gemini|sora|veo|kling|pixverse|mureka|cassette/i.test(String(v))
      );
      if (suspicious.length) flags.push('AI-generator metadata present: ' + suspicious[0].join('='));
    } catch {}
  }

  const tag = flags.length === 0 ? 'OK' : 'FLAGS';
  console.log(`  [media · ${kind}] ${tag}  ${rel}  (${kb.toFixed(1)} KB)`);
  if (flags.length) {
    for (const f of flags) console.log(`    - ${f}`);
    console.log(`  see ${path.relative(ROOT, path.join(DOC_MEDIA, kind.toUpperCase() + '.md'))} for full rules`);
  }
  process.exit(flags.length === 0 ? 0 : 1);
}

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.log('  usage:');
  console.log('    node tools/media-checklist.cjs <image|infographic|audio|video>   # print checks');
  console.log('    node tools/media-checklist.cjs verify <file>                     # run automated checks');
  process.exit(0);
}
if (argv[0] === 'verify') {
  if (!argv[1]) { console.log('  [media] verify: pass a file path'); process.exit(2); }
  verifyFile(argv[1]);
} else {
  printChecklist(argv[0]);
}
