#!/usr/bin/env node
/**
 * NWG Image Compression Tool
 * 
 * Usage: node tools/compress-game-images.cjs [--quality 58] [--width 1024]
 * 
 * Compresses all .webp images in public/static/game/ and generates
 * LQIP (Low Quality Image Placeholders) as base64 in lqip.json.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const GAME_DIR = path.join(__dirname, '..', 'public/static/game');
const args = process.argv.slice(2);
const quality = parseInt(args.find((a,i,arr) => arr[i-1] === '--quality') || '58');
const width = parseInt(args.find((a,i,arr) => arr[i-1] === '--width') || '1024');

async function run() {
  const files = fs.readdirSync(GAME_DIR)
    .filter(f => f.endsWith('.webp') && !fs.statSync(path.join(GAME_DIR, f)).isDirectory());
  
  console.log(`Compressing ${files.length} images (quality: ${quality}, width: ${width})...\n`);
  
  const results = [];
  const lqipData = {};
  
  for (const file of files) {
    const inputPath = path.join(GAME_DIR, file);
    const buf = fs.readFileSync(inputPath);
    const origSize = buf.length;
    
    // Generate LQIP from original
    const lqip = await sharp(buf).resize(20).webp({ quality: 20 }).toBuffer();
    lqipData[file] = 'data:image/webp;base64,' + lqip.toString('base64');
    
    // Compress
    const out = await sharp(buf)
      .resize(width, null, { withoutEnlargement: true })
      .webp({ quality, effort: 6, smartSubsample: true })
      .toBuffer();
    
    fs.writeFileSync(inputPath, out);
    const ratio = ((1 - out.length / origSize) * 100).toFixed(1);
    results.push({ file, orig: origSize, out: out.length, ratio });
    process.stdout.write(`  ${file}: ${(origSize/1024).toFixed(0)}KB -> ${(out.length/1024).toFixed(0)}KB (-${ratio}%)\n`);
  }
  
  fs.writeFileSync(path.join(GAME_DIR, 'lqip.json'), JSON.stringify(lqipData));
  
  const totalOrig = results.reduce((s,r) => s + r.orig, 0);
  const totalOut = results.reduce((s,r) => s + r.out, 0);
  console.log(`\n  Total: ${(totalOrig/1024).toFixed(0)}KB -> ${(totalOut/1024).toFixed(0)}KB (${((1-totalOut/totalOrig)*100).toFixed(1)}% reduction)`);
  console.log(`  LQIP: ${(fs.statSync(path.join(GAME_DIR, 'lqip.json')).size / 1024).toFixed(1)}KB`);
}

run().catch(e => { console.error(e); process.exit(1); });
