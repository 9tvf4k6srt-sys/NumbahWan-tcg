const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const PORT = 38337;
const GAMES = ['runner', 'rpg', 'platformer', 'puzzle', 'tower_defense'];
const OUT = path.join(__dirname, 'nwge-web/public/test-output');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  
  const allErrors = [];
  
  for (const game of GAMES) {
    console.log(`\n--- Testing: ${game} ---`);
    
    const page = await browser.newPage();
    await page.setViewport({ width: 500, height: 520 });
    page.on('pageerror', e => allErrors.push(`[${game}] ${e.message}`));
    
    // Set HTML content directly with engine loaded via script tag
    await page.setContent(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;}body{background:#111;overflow:hidden;}</style></head>
<body><canvas id="c" width="460" height="460" style="display:block;"></canvas></body></html>`, { waitUntil: 'domcontentloaded' });
    
    // Inject the engine script from file
    const engineCode = fs.readFileSync(path.join(__dirname, 'nwge-web/public/mobile-game-engine.js'), 'utf8');
    await page.evaluate(code => {
      const script = document.createElement('script');
      script.textContent = code;
      document.head.appendChild(script);
    }, engineCode);
    
    // Generate the game
    const result = await page.evaluate((type) => {
      try {
        const canvas = document.getElementById('c');
        const result = MobileGameEngine.generateGame(canvas, {
          prompt: type === 'runner' ? 'endless runner dash sprint game in forest' :
               type === 'rpg' ? 'fantasy rpg quest adventure game with dragons and magic' :
               type === 'platformer' ? 'platformer jump side scroll game in forest' :
               type === 'puzzle' ? 'puzzle match tile block game colorful' :
               type === 'tower_defense' ? 'tower defense strategy defend wave game' :
               type + ' game'
        });
        return { ok: true, type: result.gameType };
      } catch(e) {
        return { ok: false, err: e.message };
      }
    }, game);
    console.log(`  Generate: ${JSON.stringify(result)}`);
    
    // Wait for SVGs to render
    await new Promise(r => setTimeout(r, 2000));
    
    // Screenshot: ready state
    await page.screenshot({ 
      path: path.join(OUT, `v2-${game}-ready.png`),
      clip: { x: 0, y: 0, width: 460, height: 460 }
    });
    console.log(`  Saved: v2-${game}-ready.png`);
    
    // Click canvas to start
    await page.mouse.click(230, 230);
    await new Promise(r => setTimeout(r, 500));
    
    // Game-specific play actions
    if (game === 'runner') {
      for (let i = 0; i < 4; i++) { await page.keyboard.press('Space'); await new Promise(r => setTimeout(r, 500)); }
    } else if (game === 'rpg') {
      for (let i = 0; i < 5; i++) { await page.keyboard.press('ArrowRight'); await new Promise(r => setTimeout(r, 150)); }
      for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowDown'); await new Promise(r => setTimeout(r, 150)); }
      for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowRight'); await new Promise(r => setTimeout(r, 150)); }
    } else if (game === 'platformer') {
      await page.keyboard.down('ArrowRight');
      for (let i = 0; i < 3; i++) { await page.keyboard.press('Space'); await new Promise(r => setTimeout(r, 600)); }
      await page.keyboard.up('ArrowRight');
    } else if (game === 'puzzle') {
      // Click pairs of tiles
      await page.mouse.click(200, 180); await new Promise(r => setTimeout(r, 200));
      await page.mouse.click(250, 180); await new Promise(r => setTimeout(r, 200));
      await page.mouse.click(180, 230); await new Promise(r => setTimeout(r, 200));
      await page.mouse.click(180, 280); await new Promise(r => setTimeout(r, 200));
    } else if (game === 'tower_defense') {
      // Select Arrow tower then place
      await page.mouse.click(350, 430); await new Promise(r => setTimeout(r, 200));
      await page.mouse.click(200, 40); await new Promise(r => setTimeout(r, 200));
      await page.mouse.click(350, 430); await new Promise(r => setTimeout(r, 200));
      await page.mouse.click(150, 300); await new Promise(r => setTimeout(r, 200));
    }
    
    await new Promise(r => setTimeout(r, 1500));
    
    // Screenshot: playing state
    await page.screenshot({ 
      path: path.join(OUT, `v2-${game}-playing.png`),
      clip: { x: 0, y: 0, width: 460, height: 460 }
    });
    console.log(`  Saved: v2-${game}-playing.png`);
    
    await page.close();
  }
  
  if (allErrors.length) {
    console.log('\n=== JS Errors ===');
    allErrors.forEach(e => console.log('  ', e));
  } else {
    console.log('\n=== No JS errors detected ===');
  }
  
  await browser.close();
  console.log('\nAll done!');
})().catch(e => { console.error(e); process.exit(1); });
