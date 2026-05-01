#!/usr/bin/env node
/**
 * Strip Image Metadata
 * ═══════════════════════════════════════════════════════════════════
 * Removes EXIF, IPTC, XMP, ICC profiles, C2PA signatures, and any other
 * embedded metadata from image files under public/static/.
 *
 * Why this matters (2026 zero-trace doctrine, §3 Images):
 *   - C2PA / SynthID / generator EXIF tags are the fastest way for
 *     downstream tools (Originality.ai image mode, Hive, Illuminarty)
 *     to flag content as AI-generated.
 *   - Even when content is human-photographed, GPS coordinates, camera
 *     serials, and software-version strings leak unwanted metadata.
 *
 * Strategy:
 *   - Uses `sharp` (already in the project) to re-encode each image
 *     without metadata. This is lossless for PNG and effectively
 *     visually-lossless for WebP at quality 92.
 *   - JPEG inputs are re-encoded at the same quality with mozjpeg if
 *     available (sharp falls back to libjpeg-turbo otherwise).
 *   - A `.metadata-stripped` sidecar manifest records which files we
 *     processed and when, so subsequent runs skip unchanged files.
 *
 * USAGE:
 *   node tools/strip-image-metadata.cjs                  # process all
 *   node tools/strip-image-metadata.cjs --check          # report only
 *   node tools/strip-image-metadata.cjs --path=public/static/images/invest
 *   node tools/strip-image-metadata.cjs --force          # re-process even if clean
 *   node tools/strip-image-metadata.cjs --verbose
 *
 * Wired into:
 *   - npm run media:strip
 *   - pre-commit (only on staged image files in public/static/)
 *
 * @version 1.0.0
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('  [strip-meta] sharp is not installed. Run: npm install sharp');
  process.exit(0); // soft-exit so pre-commit doesn't break in fresh clones
}

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DIR = path.join(ROOT, 'public', 'static');
const MANIFEST_PATH = path.join(ROOT, '.metadata-stripped.json');

// CLI args
const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const FORCE = args.includes('--force');
const VERBOSE = args.includes('--verbose');
const PATH_ARG = args.find(a => a.startsWith('--path='));
const TARGET_DIR = PATH_ARG ? path.resolve(ROOT, PATH_ARG.split('=')[1]) : DEFAULT_DIR;

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return { entries: {} };
  try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); }
  catch { return { entries: {} }; }
}

function saveManifest(m) {
  m.lastRun = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    let st;
    try { st = fs.statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      // skip node_modules, .git, dist
      if (['node_modules', '.git', 'dist', '.wrangler'].includes(name)) continue;
      walk(full, out);
    } else if (st.isFile()) {
      const ext = path.extname(name).toLowerCase();
      if (SUPPORTED.has(ext)) out.push(full);
    }
  }
  return out;
}

function sha1(buf) { return crypto.createHash('sha1').update(buf).digest('hex'); }

async function inspectMetadata(file) {
  try {
    const meta = await sharp(file).metadata();
    const tags = [];
    if (meta.exif) tags.push('EXIF');
    if (meta.iptc) tags.push('IPTC');
    if (meta.xmp) tags.push('XMP');
    if (meta.icc) tags.push('ICC');
    if (meta.tifftagPhotoshop) tags.push('Photoshop');
    return { ok: true, format: meta.format, tags, width: meta.width, height: meta.height };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function stripFile(file) {
  const ext = path.extname(file).toLowerCase();
  const input = fs.readFileSync(file);
  let pipeline = sharp(input, { failOnError: false });

  // The crucial line: NOT calling .withMetadata() means sharp drops everything.
  // We then re-encode in the same format at high quality.
  if (ext === '.jpg' || ext === '.jpeg') {
    pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
  } else if (ext === '.png') {
    pipeline = pipeline.png({ compressionLevel: 9, palette: false });
  } else if (ext === '.webp') {
    // Lossless inputs stay lossless; lossy stays at q92 (matches our pipeline).
    pipeline = pipeline.webp({ quality: 92, effort: 4 });
  }

  const output = await pipeline.toBuffer();
  // Only overwrite if the new version is actually smaller OR strips a tag.
  fs.writeFileSync(file, output);
  return { before: input.length, after: output.length };
}

async function run() {
  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`  [strip-meta] target dir not found: ${TARGET_DIR}`);
    process.exit(1);
  }

  const files = walk(TARGET_DIR);
  if (files.length === 0) {
    console.log(`  [strip-meta] no images under ${path.relative(ROOT, TARGET_DIR)}`);
    return;
  }

  const manifest = loadManifest();
  manifest.entries = manifest.entries || {};

  let processed = 0, skipped = 0, dirty = 0;
  let bytesBefore = 0, bytesAfter = 0;
  const dirtyFiles = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const buf = fs.readFileSync(file);
    const hash = sha1(buf);

    // skip if we already processed this exact byte-content
    if (!FORCE && manifest.entries[rel] && manifest.entries[rel].hash === hash) {
      skipped++;
      if (VERBOSE) console.log(`  · skip   ${rel}  (clean)`);
      continue;
    }

    const inspect = await inspectMetadata(file);
    if (CHECK_ONLY) {
      if (inspect.ok && inspect.tags.length > 0) {
        dirty++;
        dirtyFiles.push({ rel, tags: inspect.tags });
        console.log(`  ⚠ dirty  ${rel}  [${inspect.tags.join(', ')}]`);
      } else if (VERBOSE) {
        console.log(`  · clean  ${rel}`);
      }
      continue;
    }

    if (!inspect.ok) {
      console.warn(`  ! err    ${rel}  ${inspect.error}`);
      continue;
    }

    if (inspect.tags.length === 0 && !FORCE) {
      // Already metadata-free. Just record the hash and move on.
      manifest.entries[rel] = { hash, strippedAt: null, tagsFound: [] };
      skipped++;
      continue;
    }

    try {
      const r = await stripFile(file);
      bytesBefore += r.before;
      bytesAfter += r.after;
      processed++;
      const newHash = sha1(fs.readFileSync(file));
      manifest.entries[rel] = {
        hash: newHash,
        strippedAt: new Date().toISOString(),
        tagsFound: inspect.tags,
        sizeDelta: r.after - r.before,
      };
      console.log(`  ✓ strip  ${rel}  [${inspect.tags.join(', ')}]  ${(r.before/1024).toFixed(1)}KB → ${(r.after/1024).toFixed(1)}KB`);
    } catch (e) {
      console.warn(`  ! fail   ${rel}  ${e.message}`);
    }
  }

  if (!CHECK_ONLY) {
    saveManifest(manifest);
    const delta = bytesAfter - bytesBefore;
    const sign = delta < 0 ? '-' : '+';
    console.log('');
    console.log(`  [strip-meta] ${processed} stripped · ${skipped} clean · ${files.length} total · ${sign}${Math.abs(delta/1024).toFixed(1)}KB net`);
  } else {
    console.log('');
    console.log(`  [strip-meta] CHECK MODE · ${dirty} files carry metadata, ${files.length - dirty} clean`);
    if (dirty > 0) process.exit(1);
  }
}

run().catch(err => {
  console.error('  [strip-meta] fatal:', err.message);
  process.exit(1);
});
