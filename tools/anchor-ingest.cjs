#!/usr/bin/env node
'use strict';

/**
 * anchor-ingest.cjs
 *
 * Ingest a real-photo anchor into references/visual-anchors/.
 * Downloads (or copies) the file, reads EXIF when available, runs verification
 * heuristics, writes a .meta.json sidecar, and appends a row to SOURCES.md.
 *
 * Hard rule: this tool refuses to save anything flagged AI-suspect by the
 * verification heuristics unless --force-review is passed (which still flags
 * the file for human review).
 *
 * Usage:
 *   node tools/anchor-ingest.cjs \
 *     --url https://example.com/photo.jpg \
 *     --category taipei-real \
 *     --photographer "Chang Yung" \
 *     --publication "Cereal Magazine #21" \
 *     --license "editorial-fair-use-private-reference" \
 *     --notes "Taipei 101 38F tenant office, golden hour"
 *
 *   node tools/anchor-ingest.cjs \
 *     --file /home/user/Downloads/photo.jpg \
 *     --category designer-real \
 *     --photographer "Frédéric Vercruysse" \
 *     --notes "Vervoordt Kanaal HQ Antwerp"
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ANCHORS_DIR = path.join(ROOT, 'references', 'visual-anchors');
const META_DIR = path.join(ANCHORS_DIR, '_meta');
const SOURCES_MD = path.join(ANCHORS_DIR, 'SOURCES.md');
const VALID_CATEGORIES = ['taipei-real', 'designer-real', 'materials', 'imperfection'];

// ----------------------------- arg parsing -----------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

// ------------------------------- download ------------------------------------

function downloadToBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'PINFORGE-anchor-ingest/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // follow one redirect
        return downloadToBuffer(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || '' }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('timeout')));
  });
}

// ------------------------------- helpers -------------------------------------

function inferExtension(contentType, urlOrPath) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('jpeg')) return '.jpg';
  if (ct.includes('png')) return '.png';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('avif')) return '.avif';
  const m = (urlOrPath || '').match(/\.(jpe?g|png|webp|avif)(\?|$)/i);
  if (m) return '.' + m[1].toLowerCase().replace('jpeg', 'jpg');
  return '.bin';
}

function slugify(s) {
  return (s || 'anchor')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function todayISO() {
  return new Date().toISOString();
}

// --------------------------- minimal EXIF probe ------------------------------
// Best-effort: detect presence of EXIF in JPEGs without external deps.
// Real EXIF parsing happens via verify (or downstream tooling); here we just
// surface a boolean signal for the sidecar.

function hasJpegExifMarker(buf) {
  if (!buf || buf.length < 4) return false;
  // JPEG starts with FF D8
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return false;
  let i = 2;
  while (i < Math.min(buf.length - 4, 65536)) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    const segLen = (buf[i + 2] << 8) | buf[i + 3];
    // APP1 (FF E1) with "Exif\0\0" → real EXIF block
    if (marker === 0xe1 && buf.slice(i + 4, i + 10).toString('ascii').startsWith('Exif')) {
      return true;
    }
    i += 2 + segLen;
  }
  return false;
}

function probeImage(buf) {
  const out = { format: 'unknown', width: null, height: null, exif: false };
  if (buf.length >= 12 && buf[0] === 0xff && buf[1] === 0xd8) {
    out.format = 'jpeg';
    out.exif = hasJpegExifMarker(buf);
  } else if (buf.length >= 8 && buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
    out.format = 'png';
    out.width = buf.readUInt32BE(16);
    out.height = buf.readUInt32BE(20);
  } else if (buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    out.format = 'webp';
  } else if (buf.length >= 12 && buf.slice(4, 12).toString('ascii').startsWith('ftypavif')) {
    out.format = 'avif';
  }
  return out;
}

// --------------------------- AI-suspect heuristics ---------------------------
// These are deliberately conservative. A "suspect" verdict means human review,
// not automatic rejection. Real photographs frequently fail one or two checks.

function aiSuspectHeuristics(buf, probe) {
  const flags = [];

  // 1. AI generators frequently strip EXIF. Missing EXIF on a JPEG is mild signal.
  if (probe.format === 'jpeg' && !probe.exif) {
    flags.push('jpeg-without-exif');
  }

  // 2. Suspiciously round file sizes (some AI outputs land on 1MB / 2MB / 4MB).
  const size = buf.length;
  const round = [1048576, 2097152, 4194304];
  if (round.some((r) => Math.abs(size - r) < 1024)) {
    flags.push('suspiciously-round-filesize');
  }

  // 3. Histogram smoothness — sample bytes and check tonal distribution.
  //    AI images often have unusually smooth histograms vs real photos.
  if (probe.format === 'jpeg' || probe.format === 'png') {
    const sample = buf.slice(Math.floor(buf.length / 4), Math.floor(buf.length * 3 / 4));
    const hist = new Array(256).fill(0);
    const step = Math.max(1, Math.floor(sample.length / 10000));
    for (let i = 0; i < sample.length; i += step) hist[sample[i]]++;
    // Coefficient of variation across histogram buckets
    const total = hist.reduce((a, b) => a + b, 0) || 1;
    const mean = total / 256;
    const variance = hist.reduce((a, b) => a + (b - mean) ** 2, 0) / 256;
    const cv = Math.sqrt(variance) / mean;
    if (cv < 0.35) flags.push('low-histogram-variance');
  }

  // 4. Filename obvious signals
  // (caller passes original name; we surface that downstream)

  // Verdict
  const suspect = flags.length >= 2;
  return { suspect, flags };
}

// ----------------------------- SOURCES.md row --------------------------------

function appendSourcesRow({ category, file, sidecar }) {
  const md = fs.readFileSync(SOURCES_MD, 'utf8');
  const sectionHeader = `## ${category}/`;
  const lines = md.split('\n');
  const start = lines.findIndex((l) => l.trim() === sectionHeader);
  if (start === -1) {
    console.warn(`[warn] section ${sectionHeader} not found in SOURCES.md`);
    return;
  }
  // Find the table within the section, then the empty placeholder row
  let tableEnd = start;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ') || lines[i].startsWith('---')) {
      tableEnd = i;
      break;
    }
    if (i === lines.length - 1) tableEnd = i + 1;
  }

  // Build row based on category
  const row = buildRow(category, file, sidecar);

  // Drop placeholder "_(empty)_" row if present, then insert above tableEnd
  let inserted = false;
  const newLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (i >= start && i < tableEnd && lines[i].includes('_(empty')) {
      // skip placeholder
      continue;
    }
    if (i === tableEnd && !inserted) {
      newLines.push(row);
      inserted = true;
    }
    newLines.push(lines[i]);
  }
  if (!inserted) newLines.push(row);

  // Bump stats
  const updated = newLines.join('\n').replace(/_Will be set automatically on first ingest._/, todayISO());
  fs.writeFileSync(SOURCES_MD, updated);
}

function buildRow(category, file, m) {
  const aiCol = m.verification.suspect ? `⚠️ ${m.verification.flags.join(',')}` : 'no';
  const exifCol = m.probe.exif ? 'yes' : 'no';
  const url = m.source.url || '—';
  const license = m.source.license || '—';
  const photog = m.source.photographer || '—';
  const pub = m.source.publication || '—';
  const notes = (m.source.notes || '').replace(/\|/g, '\\|');
  const date = m.source.captureDate || '—';

  if (category === 'taipei-real') {
    return `| ${file} | ${photog} | ${pub} | ${url} | ${license} | ${date} | ${exifCol} | ${aiCol} | ${notes} |`;
  }
  if (category === 'designer-real') {
    const designer = m.source.designer || '—';
    return `| ${file} | ${designer} | ${photog} | ${pub} | ${url} | ${license} | ${exifCol} | ${aiCol} | ${notes} |`;
  }
  if (category === 'materials') {
    const material = m.source.material || '—';
    return `| ${file} | ${material} | ${photog} | ${url} | ${license} | ${exifCol} | ${aiCol} | ${notes} |`;
  }
  if (category === 'imperfection') {
    const subject = m.source.subject || '—';
    return `| ${file} | ${subject} | ${photog} | ${pub} | ${url} | ${license} | ${exifCol} | ${aiCol} | ${notes} |`;
  }
  return `| ${file} | ${photog} | ${url} | ${license} | ${exifCol} | ${aiCol} | ${notes} |`;
}

// ---------------------------------- main -------------------------------------

async function main() {
  const args = parseArgs(process.argv);

  if (args.help || (!args.url && !args.file)) {
    console.log('Usage: anchor-ingest.cjs --url <URL> | --file <path> --category <cat> [options]');
    console.log('Categories:', VALID_CATEGORIES.join(', '));
    console.log('Options: --photographer --publication --license --designer --material --subject --captureDate --notes --force-review');
    process.exit(args.help ? 0 : 1);
  }

  const category = args.category;
  if (!VALID_CATEGORIES.includes(category)) {
    console.error(`[err] invalid category. Use one of: ${VALID_CATEGORIES.join(', ')}`);
    process.exit(1);
  }

  // Acquire buffer
  let buffer, contentType, source;
  if (args.url) {
    console.log(`[1/5] downloading ${args.url}`);
    const r = await downloadToBuffer(args.url);
    buffer = r.buffer;
    contentType = r.contentType;
    source = args.url;
  } else {
    console.log(`[1/5] reading ${args.file}`);
    buffer = fs.readFileSync(args.file);
    contentType = '';
    source = args.file;
  }

  // Probe
  console.log('[2/5] probing image format + EXIF');
  const probe = probeImage(buffer);
  if (probe.format === 'unknown') {
    console.error('[err] unrecognized image format. Aborting.');
    process.exit(1);
  }

  // AI-suspect heuristics
  console.log('[3/5] running AI-suspect heuristics');
  const verification = aiSuspectHeuristics(buffer, probe);
  if (verification.suspect && !args['force-review']) {
    console.error(`[reject] anchor flagged AI-suspect: ${verification.flags.join(', ')}`);
    console.error('[reject] pass --force-review to save with manual-review flag, or use a different source.');
    process.exit(2);
  }

  // Compose filename
  const ext = inferExtension(contentType, source);
  const baseSlug = slugify(args.notes || args.subject || args.designer || args.photographer || 'anchor');
  const hash = sha256(buffer).slice(0, 8);
  const filename = `${baseSlug}-${hash}${ext}`;

  const targetDir = path.join(ANCHORS_DIR, category);
  const targetFile = path.join(targetDir, filename);
  fs.writeFileSync(targetFile, buffer);

  // Sidecar
  console.log('[4/5] writing sidecar');
  const sidecar = {
    file: `${category}/${filename}`,
    sha256: sha256(buffer),
    bytes: buffer.length,
    probe,
    verification,
    needsManualReview: verification.suspect,
    ingestedAt: todayISO(),
    source: {
      url: args.url || null,
      localOrigin: args.file || null,
      photographer: args.photographer || null,
      publication: args.publication || null,
      designer: args.designer || null,
      material: args.material || null,
      subject: args.subject || null,
      license: args.license || null,
      captureDate: args.captureDate || null,
      notes: args.notes || null,
    },
  };
  const sidecarPath = path.join(META_DIR, `${filename}.meta.json`);
  fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));

  // SOURCES.md row
  console.log('[5/5] appending row to SOURCES.md');
  appendSourcesRow({ category, file: filename, sidecar });

  console.log(`\n✓ saved ${targetFile}`);
  console.log(`✓ sidecar ${sidecarPath}`);
  if (verification.suspect) {
    console.log(`⚠ flagged for manual review: ${verification.flags.join(', ')}`);
  }
}

main().catch((e) => {
  console.error('[err]', e.message);
  process.exit(1);
});
