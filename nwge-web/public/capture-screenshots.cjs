const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const GAME_URL = process.argv[2] || 'http://localhost:3000/game.html';
const OUTPUT = path.join(__dirname, 'test-output');
if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  console.log('Loading game:', GAME_URL);
  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#game', { timeout: 10000 });
  console.log('Waiting for render...');
  await page.waitForTimeout(4000);

  // Take page screenshot first
  await page.screenshot({ path: path.join(OUTPUT, '00_page_initial.png') });
  console.log('✓ Page screenshot saved');

  // Define views to capture
  const views = [
    { label: '01_spawn', x: 22.5, y: 34.5, a: 0, p: 0 },
    { label: '02_inn', x: 25.5, y: 35.5, a: -Math.PI/2, p: 0 },
    { label: '03_road_east', x: 35, y: 33, a: 0, p: 0 },
    { label: '04_crossroad', x: 24, y: 20, a: -Math.PI/2, p: 0 },
    { label: '05_tower', x: 32, y: 33, a: -0.9, p: 0 },
    { label: '06_pond', x: 28, y: 42, a: -Math.PI/2, p: -10 },
    { label: '07_marshal_npc', x: 25.0, y: 34.5, a: -Math.PI/2, p: 0 },
    { label: '08_kobolds', x: 10, y: 10, a: 0.8, p: 0 },
    { label: '09_wolves', x: 45, y: 10, a: 0, p: 0 },
    { label: '10_river', x: 50, y: 30, a: 0, p: 0 },
    { label: '11_farm', x: 42, y: 20, a: Math.PI, p: 0 },
    { label: '12_sky', x: 22.5, y: 34.5, a: 0, p: 80 },
    { label: '13_ground', x: 22.5, y: 34.5, a: 0, p: -60 },
  ];

  for (const v of views) {
    await page.evaluate(({x, y, a, p}) => {
      player.x = x; player.y = y; player.angle = a; player.pitch = p;
    }, { x: v.x, y: v.y, a: v.a, p: v.p });

    // Wait for frames
    await page.evaluate(() => new Promise(r => {
      let c = 0;
      function tick() { if (++c >= 10) r(); else requestAnimationFrame(tick); }
      requestAnimationFrame(tick);
    }));

    // Get canvas as dataURL
    const dataUrl = await page.evaluate(() => {
      return document.getElementById('game').toDataURL('image/png');
    });

    // Save
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(OUTPUT, v.label + '.png'), Buffer.from(base64, 'base64'));
    console.log(`✓ ${v.label}`);
  }

  // Feature test - quest dialog
  await page.evaluate(() => {
    player.x=25.2; player.y=33.8; player.angle=-Math.PI/2;
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => tryInteract());
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUTPUT, '14_quest_dialog.png') });
  console.log('✓ 14_quest_dialog');
  await page.evaluate(() => closeAllDialogs());

  // Merchant dialog
  await page.evaluate(() => {
    player.x=20.2; player.y=32.8; player.angle=-Math.PI*0.3;
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => tryInteract());
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUTPUT, '15_merchant_dialog.png') });
  console.log('✓ 15_merchant_dialog');
  await page.evaluate(() => closeAllDialogs());

  // Combat
  await page.evaluate(() => {
    const wolf = enemies.find(e => e.alive && e.type === 'wolf');
    if (wolf) {
      const a = Math.atan2(wolf.y - player.y, wolf.x - player.x);
      player.x = wolf.x - Math.cos(a)*1.5;
      player.y = wolf.y - Math.sin(a)*1.5;
      player.angle = a;
    }
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => { attackCooldown = 0; tryAttack(); });
  await page.waitForTimeout(200);

  const combatDataUrl = await page.evaluate(() => document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(OUTPUT, '16_combat.png'), Buffer.from(combatDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
  console.log('✓ 16_combat');

  // Metrics
  const metrics = await page.evaluate(() => {
    const c = document.getElementById('game');
    const ctx2 = c.getContext('2d', {willReadFrequently:true});
    const d = ctx2.getImageData(0,0,c.width,c.height).data;
    let rs=0,gs=0,bs=0,n=0;
    for(let i=0;i<d.length;i+=16){rs+=d[i];gs+=d[i+1];bs+=d[i+2];n++;}
    return {
      fps: typeof fps !== 'undefined' ? fps : 0,
      avgColor: {r:Math.round(rs/n),g:Math.round(gs/n),b:Math.round(bs/n)},
      enemies: enemies.filter(e=>e.alive).length,
      npcs: npcs.length,
      pickups: pickups.filter(p=>!p.collected).length,
      player: {level:player.level,hp:player.health,gold:player.gold},
    };
  });

  console.log('\n═══ METRICS ═══');
  console.log('FPS:', metrics.fps);
  console.log('Avg color:', `rgb(${metrics.avgColor.r},${metrics.avgColor.g},${metrics.avgColor.b})`);
  console.log('Entities:', metrics.enemies, 'enemies,', metrics.npcs, 'npcs,', metrics.pickups, 'pickups');
  console.log('Player:', JSON.stringify(metrics.player));

  fs.writeFileSync(path.join(OUTPUT, 'metrics.json'), JSON.stringify(metrics, null, 2));

  await browser.close();
  console.log('\n✅ Done. Screenshots in', OUTPUT);
})().catch(e => { console.error(e); process.exit(1); });
