#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   NWG Quick Screenshot Helper
   Usage: node dev-screenshot.js [section-id] [output-name]
   Takes targeted screenshots of icon sections for rapid review.
   ═══════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright');

const SECTIONS = {
  'world':     { sel: '#world .feature-grid',        name: 'World Features' },
  'combat':    { sel: '#combat .feature-grid',        name: 'Combat Features' },
  'social':    { sel: '#social .feature-grid',        name: 'Social Features' },
  'crafting':  { sel: '#crafting .feature-grid',      name: 'Crafting Features' },
  'endgame':   { sel: '#endgame .feature-grid',       name: 'Endgame Features' },
  'dlc-flex':  { sel: '#dlc-flex .feature-grid, .dlc-flex-grid', name: 'DLC Flex' },
  'dlc-acts':  { sel: '#dlc-activities .feature-grid', name: 'DLC Activities' },
  'dlc-duel':  { sel: '#dlc-duel .feature-grid',      name: 'DLC Duel System' },
  'dlc-spec':  { sel: '#dlc-spectator .feature-grid',  name: 'DLC Spectator' },
  'dlc-exotic':{ sel: '#dlc-exotic .feature-grid',     name: 'DLC Exotic Biomes' },
  'dlc-time':  { sel: '#dlc-timerift .feature-grid',   name: 'DLC Time Rift' },
  'dlc-regina':{ sel: '#dlc-regina .feature-grid',     name: 'DLC Regina' },
  'dlc-rms':   { sel: '#dlc-rms .feature-grid',        name: 'DLC RMS Extra' },
  'all':       { sel: null,                             name: 'Full Page' }
};

async function run() {
  const target = process.argv[2] || 'all';
  const outName = process.argv[3] || `screenshot-${target}`;
  
  if (target === 'list') {
    console.log('Available sections:');
    Object.entries(SECTIONS).forEach(([k,v]) => console.log(`  ${k.padEnd(12)} → ${v.name}`));
    process.exit(0);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5173/world/nwg-the-game.html', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  if (target === 'all') {
    // Screenshot each section
    for (const [key, info] of Object.entries(SECTIONS)) {
      if (key === 'all') continue;
      try {
        const el = await page.$(info.sel.split(',')[0].trim());
        if (el) {
          await el.scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
          await el.screenshot({ path: `/home/user/webapp/screenshot-${key}.png` });
          console.log(`✓ ${key} → screenshot-${key}.png`);
        } else {
          console.log(`✗ ${key} → selector not found`);
        }
      } catch(e) {
        console.log(`✗ ${key} → ${e.message}`);
      }
    }
  } else {
    const info = SECTIONS[target];
    if (!info) { console.error(`Unknown section: ${target}`); process.exit(1); }
    const el = await page.$(info.sel.split(',')[0].trim());
    if (el) {
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await el.screenshot({ path: `/home/user/webapp/${outName}.png` });
      console.log(`✓ ${info.name} → ${outName}.png`);
    } else {
      // Fallback: full page
      await page.screenshot({ path: `/home/user/webapp/${outName}.png`, fullPage: true });
      console.log(`⚠ Selector not found, took full page screenshot → ${outName}.png`);
    }
  }

  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
