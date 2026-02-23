const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 520, height: 560 });
  
  // Navigate to POC page
  console.log('Loading POC page...');
  await page.goto('http://localhost:3000/engine-v2-poc.html', { waitUntil: 'networkidle0', timeout: 15000 });
  
  // Wait for sprites to load
  await new Promise(r => setTimeout(r, 2000));
  
  // Capture ready state
  await page.screenshot({ path: 'nwge-web/public/test-output/v2poc-runner-ready.png', clip: { x: 0, y: 0, width: 520, height: 560 } });
  console.log('Saved: v2poc-runner-ready.png');
  
  // Click to start game
  await page.click('#runnerCanvas');
  await new Promise(r => setTimeout(r, 2000));
  
  // Capture playing state
  await page.screenshot({ path: 'nwge-web/public/test-output/v2poc-runner-playing.png', clip: { x: 0, y: 0, width: 520, height: 560 } });
  console.log('Saved: v2poc-runner-playing.png');
  
  // Jump a few times
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Space');
    await new Promise(r => setTimeout(r, 600));
  }
  
  // Capture action state
  await page.screenshot({ path: 'nwge-web/public/test-output/v2poc-runner-action.png', clip: { x: 0, y: 0, width: 520, height: 560 } });
  console.log('Saved: v2poc-runner-action.png');
  
  // Check for JS errors
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  
  if (errors.length) {
    console.log('JS Errors:', errors);
  } else {
    console.log('No JS errors detected');
  }
  
  await browser.close();
  console.log('Done!');
})().catch(e => { console.error(e); process.exit(1); });
