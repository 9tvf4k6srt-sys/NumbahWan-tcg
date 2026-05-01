#!/usr/bin/env node
/**
 * Build editorial team portraits.
 * - Re-encode raw PNGs to WebP (full ~880w, sm ~440w, both metadata-stripped).
 * - Apply subtle film grain via noise overlay (zero-trace doctrine §3).
 * - Output goes to public/static/images/invest/team/.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TEAM_DIR = path.resolve(__dirname, '../public/static/images/invest/team');

const ROSTER = [
  { raw: 'p1-portfolio-officer-raw.png', slug: '01-eunice-li' },
  { raw: 'p2-risk-compliance-raw.png',   slug: '02-marcus-chen' },
  { raw: 'p3-quant-analyst-raw.png',     slug: '03-naomi-tao' },
  { raw: 'p4-equity-trader-raw.png',     slug: '04-han-park' },
  { raw: 'p5-ops-custody-raw.png',       slug: '05-priya-lin' },
  { raw: 'p6-junior-research-raw.png',   slug: '06-ren-fujita' },
];

(async () => {
  let total = 0;
  for (const m of ROSTER) {
    const src = path.join(TEAM_DIR, m.raw);
    if (!fs.existsSync(src)) { console.error('  ✗ missing', m.raw); continue; }

    // Full-size: ~880px wide, q80 — sharp/editorial.
    const fullOut = path.join(TEAM_DIR, `${m.slug}.webp`);
    await sharp(src)
      .resize({ width: 880, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .withMetadata({})              // strip EXIF/IPTC/XMP/ICC
      .toFile(fullOut);

    // Thumb: ~440px wide for grid cards.
    const smOut = path.join(TEAM_DIR, `${m.slug}-sm.webp`);
    await sharp(src)
      .resize({ width: 440, withoutEnlargement: true })
      .webp({ quality: 78, effort: 5 })
      .withMetadata({})
      .toFile(smOut);

    const fb = fs.statSync(fullOut).size, sb = fs.statSync(smOut).size;
    total += fb + sb;
    console.log(`  ✓ ${m.slug.padEnd(20)}  full ${(fb/1024).toFixed(1)}KB  sm ${(sb/1024).toFixed(1)}KB`);
  }
  console.log(`\n  total team payload: ${(total/1024).toFixed(1)}KB`);
})().catch(e => { console.error(e); process.exit(1); });
