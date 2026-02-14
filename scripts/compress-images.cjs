#!/usr/bin/env node
/**
 * NW Image Compression Pipeline
 * Compresses WebP/PNG/JPG images on over-budget pages.
 * Uses sharp (already installed) to re-encode WebP at quality 75.
 * Skips images already under threshold.
 *
 * Usage:
 *   node scripts/compress-images.cjs                  # dry-run (report only)
 *   node scripts/compress-images.cjs --apply          # actually compress
 *   node scripts/compress-images.cjs --apply --q=60   # custom quality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

// --- Config ---
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const qualityArg = args.find(a => a.startsWith('--q='));
const QUALITY = qualityArg ? parseInt(qualityArg.split('=')[1], 10) : 75;
const THRESHOLD_KB = 100; // only compress files > 100KB

// --- Gather all image paths referenced in HTML ---
function getImagePathsFromHTML(htmlFile) {
  const content = fs.readFileSync(htmlFile, 'utf8');
  const imgs = new Set();
  // Match src="..." for images
  const srcRe = /src=["']([^"']*\.(?:webp|png|jpg|jpeg))["']/gi;
  let m;
  while ((m = srcRe.exec(content)) !== null) {
    let p = m[1];
    if (p.startsWith('/')) p = p.slice(1); // remove leading /
    if (!p.startsWith('http')) imgs.add(path.join(PUBLIC, '..', p));
  }
  // Also match background-image: url(...)
  const bgRe = /url\(["']?([^"')]*\.(?:webp|png|jpg|jpeg))["']?\)/gi;
  while ((m = bgRe.exec(content)) !== null) {
    let p = m[1];
    if (p.startsWith('/')) p = p.slice(1);
    if (!p.startsWith('http')) imgs.add(path.join(PUBLIC, '..', p));
  }
  return [...imgs];
}

// --- Also find unreferenced large images in known directories ---
function findLargeImages(dirs) {
  const imgs = [];
  for (const dir of dirs) {
    const fullDir = path.join(PUBLIC, dir);
    if (!fs.existsSync(fullDir)) continue;
    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const fp = path.join(d, entry.name);
        if (entry.isDirectory()) walk(fp);
        else if (/\.(webp|png|jpg|jpeg)$/i.test(entry.name)) {
          const stat = fs.statSync(fp);
          if (stat.size > THRESHOLD_KB * 1024) imgs.push(fp);
        }
      }
    };
    walk(fullDir);
  }
  return imgs;
}

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('sharp not found. Install: npm install sharp');
    process.exit(1);
  }

  console.log(`NW Image Compression Pipeline`);
  console.log(`  Mode: ${APPLY ? 'APPLY (will modify files)' : 'DRY RUN (report only)'}`);
  console.log(`  Quality: ${QUALITY}`);
  console.log(`  Threshold: >${THRESHOLD_KB}KB\n`);

  // Collect all images from over-budget and heavy pages
  const targetPages = [
    'public/regina.html',
    'public/tournament.html',
    'public/academy.html',
    'public/world/nwg-the-game.html',
    'public/merch.html',
    'public/index.html',
  ];

  const allImages = new Set();

  // Images referenced in HTML
  for (const page of targetPages) {
    const htmlPath = path.join(ROOT, page);
    if (!fs.existsSync(htmlPath)) continue;
    const imgs = getImagePathsFromHTML(htmlPath);
    imgs.forEach(i => allImages.add(i));
  }

  // Large images in known heavy directories
  const heavyDirs = ['static/regina', 'static/suites', 'static/images/tournament', 'static/images/academy', 'static/images/alumni'];
  const largeImgs = findLargeImages(heavyDirs);
  largeImgs.forEach(i => allImages.add(i));

  // Filter to only existing files > threshold
  const toCompress = [];
  for (const img of allImages) {
    const resolved = path.resolve(img);
    if (!fs.existsSync(resolved)) continue;
    const stat = fs.statSync(resolved);
    if (stat.size > THRESHOLD_KB * 1024) {
      toCompress.push({ path: resolved, sizeBefore: stat.size });
    }
  }

  toCompress.sort((a, b) => b.sizeBefore - a.sizeBefore);

  if (toCompress.length === 0) {
    console.log('No images above threshold found. All good!');
    return;
  }

  console.log(`Found ${toCompress.length} images above ${THRESHOLD_KB}KB:\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  const results = [];

  for (const item of toCompress) {
    const rel = path.relative(ROOT, item.path);
    const ext = path.extname(item.path).toLowerCase();
    totalBefore += item.sizeBefore;

    if (APPLY) {
      try {
        const input = fs.readFileSync(item.path);
        let output;

        if (ext === '.webp') {
          output = await sharp(input).webp({ quality: QUALITY }).toBuffer();
        } else if (ext === '.png') {
          output = await sharp(input).png({ quality: QUALITY, compressionLevel: 9 }).toBuffer();
        } else if (ext === '.jpg' || ext === '.jpeg') {
          output = await sharp(input).jpeg({ quality: QUALITY }).toBuffer();
        } else {
          output = input;
        }

        // Only write if actually smaller
        if (output.length < item.sizeBefore) {
          fs.writeFileSync(item.path, output);
          totalAfter += output.length;
          const pct = ((1 - output.length / item.sizeBefore) * 100).toFixed(1);
          results.push({ rel, before: item.sizeBefore, after: output.length, pct });
          console.log(`  ${pct.padStart(5)}% smaller  ${(item.sizeBefore/1024).toFixed(0).padStart(6)}KB -> ${(output.length/1024).toFixed(0).padStart(6)}KB  ${rel}`);
        } else {
          totalAfter += item.sizeBefore;
          console.log(`  SKIP (already optimal)  ${(item.sizeBefore/1024).toFixed(0).padStart(6)}KB  ${rel}`);
        }
      } catch (err) {
        totalAfter += item.sizeBefore;
        console.log(`  ERROR: ${rel} - ${err.message}`);
      }
    } else {
      totalAfter += item.sizeBefore;
      console.log(`  ${(item.sizeBefore/1024).toFixed(0).padStart(6)}KB  ${rel}`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`  Files:  ${toCompress.length}`);
  console.log(`  Before: ${(totalBefore/1024/1024).toFixed(2)} MB`);
  if (APPLY) {
    console.log(`  After:  ${(totalAfter/1024/1024).toFixed(2)} MB`);
    console.log(`  Saved:  ${((totalBefore-totalAfter)/1024/1024).toFixed(2)} MB (${((1-totalAfter/totalBefore)*100).toFixed(1)}%)`);
  } else {
    console.log(`\n  Run with --apply to compress.`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
