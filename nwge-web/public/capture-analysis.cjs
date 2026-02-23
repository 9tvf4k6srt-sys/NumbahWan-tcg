// ═══════════════════════════════════════════════════════════════════════
// NWGE Capture & Analysis Tool (Playwright-based)
//
// Headless browser capture tool that:
//   1. Opens game.html in Chromium
//   2. Injects game-analyzer.js
//   3. Runs full analysis (screenshots, features, pixels, HUD, entities, map, quality)
//   4. Saves screenshots as PNGs and a full JSON report
//
// Usage:
//   node capture-analysis.cjs [game_url] [output_dir]
//   node capture-analysis.cjs http://localhost:3000/game.html ./analysis-output
//
// Output:
//   analysis-output/
//     screenshots/          — All captured PNG screenshots
//     report.json           — Full analysis data
//     summary.txt           — Human-readable summary
//     hud-check.json        — HUD element detection results
//     pixel-analysis.json   — Detailed pixel/color data
//     entity-data.json      — NPC/enemy/pickup catalog
//     world-map.txt         — ASCII world map
//     quality-score.json    — Visual quality vs WoW reference
// ═══════════════════════════════════════════════════════════════════════

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const GAME_URL = process.argv[2] || 'http://localhost:3000/game.html';
const OUTPUT_DIR = process.argv[3] || path.join(__dirname, 'analysis-output');
const SS_DIR = path.join(OUTPUT_DIR, 'screenshots');

// Create output dirs
[OUTPUT_DIR, SS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// Walk locations (must match game-analyzer.js)
const LOCATIONS = [
  { label: 'village_spawn', x: 22.5, y: 34.5, a: 0, p: 0 },
  { label: 'village_inn', x: 25.5, y: 35.5, a: -Math.PI/2, p: 0 },
  { label: 'village_road_east', x: 35, y: 33, a: 0, p: 0 },
  { label: 'village_road_west', x: 15, y: 33, a: Math.PI, p: 0 },
  { label: 'village_crossroad', x: 24, y: 20, a: -Math.PI/2, p: 0 },
  { label: 'village_tower', x: 32, y: 33, a: -Math.PI*0.3, p: 0 },
  { label: 'village_chapel', x: 24, y: 26, a: Math.PI/2, p: 0 },
  { label: 'village_smithy', x: 17, y: 28, a: 0, p: 0 },
  { label: 'nature_pond', x: 28, y: 42, a: -Math.PI/2, p: -10 },
  { label: 'nature_river', x: 50, y: 30, a: 0, p: 0 },
  { label: 'nature_farm', x: 42, y: 20, a: Math.PI, p: 0 },
  { label: 'nature_forest_nw', x: 10, y: 10, a: Math.PI*0.25, p: 0 },
  { label: 'nature_forest_ne', x: 45, y: 10, a: 0, p: 0 },
  { label: 'npc_marshal', x: 25.0, y: 34.5, a: -Math.PI/2, p: 0 },
  { label: 'npc_merchant', x: 20.0, y: 33.0, a: -Math.PI*0.3, p: 0 },
  { label: 'npc_guard', x: 30.5, y: 28.5, a: -Math.PI*0.25, p: 0 },
  { label: 'npc_smith', x: 18.0, y: 29.0, a: -Math.PI*0.2, p: 0 },
  { label: 'enemy_wolves', x: 42, y: 32, a: 0, p: 0 },
  { label: 'enemy_kobolds', x: 12, y: 12, a: Math.PI*0.3, p: 0 },
  { label: 'sky_view', x: 22.5, y: 34.5, a: 0, p: 80 },
  { label: 'ground_view', x: 22.5, y: 34.5, a: 0, p: -60 },
  { label: 'pano_north', x: 22.5, y: 34.5, a: -Math.PI/2, p: 0 },
  { label: 'pano_east', x: 22.5, y: 34.5, a: 0, p: 0 },
  { label: 'pano_south', x: 22.5, y: 34.5, a: Math.PI/2, p: 0 },
  { label: 'pano_west', x: 22.5, y: 34.5, a: Math.PI, p: 0 },
];

(async () => {
  console.log('═══ NWGE Capture & Analysis Tool ═══');
  console.log(`Game URL: ${GAME_URL}`);
  console.log(`Output:   ${OUTPUT_DIR}`);
  console.log('');

  // Launch browser
  console.log('[1/8] Launching browser...');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // Load game
  console.log('[2/8] Loading game...');
  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#game', { timeout: 15000 });
  await page.waitForTimeout(5000); // Let game initialize and render

  // Verify game loaded
  const gameOk = await page.evaluate(() => typeof player !== 'undefined' && typeof C !== 'undefined');
  if (!gameOk) {
    console.error('ERROR: Game objects not found');
    await browser.close();
    process.exit(1);
  }
  console.log('  Game loaded successfully');

  // Take initial page screenshot
  await page.screenshot({ path: path.join(SS_DIR, '00_page_full.png') });
  console.log('  Full page screenshot saved');

  // ── Phase 3: Screenshot Walker ──
  console.log('\n[3/8] Screenshot Walker...');
  let ssIndex = 1;
  for (const loc of LOCATIONS) {
    await page.evaluate(({x, y, a, p}) => {
      player.x = x; player.y = y; player.angle = a; player.pitch = p;
    }, { x: loc.x, y: loc.y, a: loc.a, p: loc.p });

    // Wait for render
    await page.evaluate(() => new Promise(r => {
      let c = 0;
      function tick() { if (++c >= 12) r(); else requestAnimationFrame(tick); }
      requestAnimationFrame(tick);
    }));

    // Capture canvas as PNG
    const dataUrl = await page.evaluate(() => document.getElementById('game').toDataURL('image/png'));
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const filename = `${String(ssIndex).padStart(2, '0')}_${loc.label}.png`;
    fs.writeFileSync(path.join(SS_DIR, filename), Buffer.from(base64, 'base64'));
    console.log(`  [${ssIndex}/${LOCATIONS.length}] ${loc.label}`);
    ssIndex++;
  }

  // ── Phase 4: Feature Tests ──
  console.log('\n[4/8] Feature Tests...');

  // Quest dialog
  await page.evaluate(() => { player.x=25.2; player.y=33.8; player.angle=-Math.PI/2; player.pitch=0; });
  await page.waitForTimeout(500);
  await page.evaluate(() => { if(typeof tryInteract==='function') tryInteract(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SS_DIR, 'feat_quest_dialog.png') });
  const questDialogOpen = await page.evaluate(() => {
    const q = document.getElementById('questOverlay');
    return q && (q.innerHTML.length > 10 || q.classList.contains('active'));
  });
  console.log(`  Quest dialog: ${questDialogOpen ? 'PASS' : 'FAIL'}`);
  await page.evaluate(() => { if(typeof closeAllDialogs==='function') closeAllDialogs(); });
  await page.waitForTimeout(200);

  // Merchant dialog
  await page.evaluate(() => { player.x=20.2; player.y=32.8; player.angle=-Math.PI*0.3; player.pitch=0; });
  await page.waitForTimeout(500);
  await page.evaluate(() => { if(typeof tryInteract==='function') tryInteract(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SS_DIR, 'feat_merchant_dialog.png') });
  const merchantDialogOpen = await page.evaluate(() => {
    const m = document.getElementById('merchantOverlay');
    return m && (m.innerHTML.length > 10 || m.classList.contains('active'));
  });
  console.log(`  Merchant dialog: ${merchantDialogOpen ? 'PASS' : 'FAIL'}`);
  await page.evaluate(() => { if(typeof closeAllDialogs==='function') closeAllDialogs(); });
  await page.waitForTimeout(200);

  // Combat
  const combatResult = await page.evaluate(() => {
    const wolf = enemies.find(e => e.alive && e.type === 'wolf');
    if (!wolf) return { tested: false };
    const a = Math.atan2(wolf.y - player.y, wolf.x - player.x);
    player.x = wolf.x - Math.cos(a)*1.5;
    player.y = wolf.y - Math.sin(a)*1.5;
    player.angle = a;
    player.pitch = 0;
    return { tested: true, name: wolf.name, hpBefore: wolf.health, maxHP: wolf.maxHealth };
  });
  await page.waitForTimeout(600);
  if (combatResult.tested) {
    await page.evaluate(() => { attackCooldown = 0; tryAttack(); });
    await page.waitForTimeout(300);
    const afterHP = await page.evaluate(() => {
      const wolf = enemies.find(e => e.type === 'wolf');
      return wolf ? wolf.health : -1;
    });
    combatResult.hpAfter = afterHP;
    combatResult.damageDealt = combatResult.hpBefore - afterHP;
  }
  const combatDataUrl = await page.evaluate(() => document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(SS_DIR, 'feat_combat.png'), Buffer.from(combatDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
  console.log(`  Combat: ${combatResult.tested ? `PASS (${combatResult.damageDealt} dmg to ${combatResult.name})` : 'FAIL'}`);

  // ── Phase 5: Pixel Analysis ──
  console.log('\n[5/8] Pixel Analysis...');
  await page.evaluate(() => { player.x=22.5; player.y=34.5; player.angle=0; player.pitch=0; });
  await page.evaluate(() => new Promise(r => { let c=0; function t(){if(++c>=10)r();else requestAnimationFrame(t);} requestAnimationFrame(t); }));

  const pixelAnalysis = await page.evaluate(() => {
    const c = document.getElementById('game');
    const ct = c.getContext('2d', { willReadFrequently: true });
    const W = c.width, H = c.height;
    const px = ct.getImageData(0, 0, W, H).data;
    let rS=0,gS=0,bS=0,n=0,dark=0,bright=0,warm=0,cool=0;
    const regions = {
      sky:       {y0:0,y1:H*0.30,r:0,g:0,b:0,n:0,dk:0,br:0},
      horizon:   {y0:H*0.30,y1:H*0.50,r:0,g:0,b:0,n:0,dk:0,br:0},
      midground: {y0:H*0.50,y1:H*0.70,r:0,g:0,b:0,n:0,dk:0,br:0},
      foreground:{y0:H*0.70,y1:H*0.85,r:0,g:0,b:0,n:0,dk:0,br:0},
      hudBottom: {y0:H*0.85,y1:H,r:0,g:0,b:0,n:0,dk:0,br:0},
    };
    for(let y=0;y<H;y+=2)for(let x=0;x<W;x+=2){
      const i=(y*W+x)*4,r=px[i],g=px[i+1],b=px[i+2];
      rS+=r;gS+=g;bS+=b;n++;
      const lum=r*0.299+g*0.587+b*0.114;
      if(lum<40)dark++;if(lum>200)bright++;
      if(r>b+20)warm++;else if(b>r+20)cool++;
      for(const k in regions){const rg=regions[k];if(y>=rg.y0&&y<rg.y1){rg.r+=r;rg.g+=g;rg.b+=b;rg.n++;if(lum<40)rg.dk++;if(lum>200)rg.br++;}}
    }
    const rc={};
    for(const k in regions){const rg=regions[k];if(rg.n>0){const r=Math.round(rg.r/rg.n),g=Math.round(rg.g/rg.n),b=Math.round(rg.b/rg.n);rc[k]={r,g,b,hex:'#'+[r,g,b].map(c=>c.toString(16).padStart(2,'0')).join(''),darkPct:Math.round(rg.dk/rg.n*100),brightPct:Math.round(rg.br/rg.n*100)};}}
    // Color variety
    const cs=new Set();const cx=W>>1,cy=H>>1;
    for(let y=Math.max(0,cy-100);y<Math.min(H,cy+100);y++)for(let x=Math.max(0,cx-100);x<Math.min(W,cx+100);x++){const i=(y*W+x)*4;cs.add(`${px[i]>>4},${px[i+1]>>4},${px[i+2]>>4}`);}
    return {
      canvasSize:{width:W,height:H},avgColor:{r:Math.round(rS/n),g:Math.round(gS/n),b:Math.round(bS/n)},
      luminance:{darkPct:Math.round(dark/n*100),brightPct:Math.round(bright/n*100),midPct:Math.round((n-dark-bright)/n*100)},
      temperature:{warmPct:Math.round(warm/n*100),coolPct:Math.round(cool/n*100),assessment:warm>cool*1.5?'warm':cool>warm*1.5?'cool':'neutral'},
      regionColors:rc,centerColorVariety:cs.size,
      fps:typeof fps!=='undefined'?fps:'N/A',
    };
  });
  pixelAnalysis.avgColor.hex = '#'+[pixelAnalysis.avgColor.r,pixelAnalysis.avgColor.g,pixelAnalysis.avgColor.b].map(c=>c.toString(16).padStart(2,'0')).join('');
  console.log(`  Avg color: ${pixelAnalysis.avgColor.hex}`);
  console.log(`  Temperature: ${pixelAnalysis.temperature.assessment}`);
  console.log(`  Color variety: ${pixelAnalysis.centerColorVariety}`);
  console.log(`  FPS: ${pixelAnalysis.fps}`);

  // ── Phase 6: HUD Inspection ──
  console.log('\n[6/8] HUD Inspection...');
  const hudCheck = await page.evaluate(() => {
    const c = document.getElementById('game');
    const ct = c.getContext('2d', { willReadFrequently: true });
    const W = c.width, H = c.height;
    const px = ct.getImageData(0, 0, W, H).data;
    function sr(x0,y0,w,h){let r=0,g=0,b=0,n=0,nb=0;
      for(let y=Math.max(0,y0|0);y<Math.min(H,(y0+h)|0);y+=2)for(let x=Math.max(0,x0|0);x<Math.min(W,(x0+w)|0);x+=2){
        const i=(y*W+x)*4;r+=px[i];g+=px[i+1];b+=px[i+2];n++;if(px[i]+px[i+1]+px[i+2]>30)nb++;}
      if(!n)return{r:0,g:0,b:0,hex:'#000000',visible:false,fillPct:0};
      r=Math.round(r/n);g=Math.round(g/n);b=Math.round(b/n);
      return{r,g,b,hex:'#'+[r,g,b].map(c=>c.toString(16).padStart(2,'0')).join(''),visible:(r+g+b)>30,fillPct:Math.round(nb/n*100)};}
    const elements = {
      playerPortrait:sr(12,12,52,52),healthBar:sr(72,16,180,18),manaBar:sr(72,38,180,18),
      targetFrame:sr(W/2-110,12,220,50),minimap:sr(W-160,16,140,140),
      questTracker:sr(W-240,180+64+30,230,80),actionBar:sr(W/2-230,H-62,460,50),
      xpBar:sr(0,H-12,W,10),chatBox:sr(10,H-222,290,160),crosshair:sr(W/2-8,H/2-8,16,16),
      fpsCounter:sr(W-60,H-28,50,14),
    };
    const vis=Object.values(elements).filter(e=>e.visible).length;
    return{elements,visibleCount:vis,totalElements:Object.keys(elements).length,coverage:Math.round(vis/Object.keys(elements).length*100)+'%'};
  });
  console.log(`  HUD: ${hudCheck.visibleCount}/${hudCheck.totalElements} visible (${hudCheck.coverage})`);
  for (const [name, data] of Object.entries(hudCheck.elements)) {
    console.log(`    ${data.visible ? '✅' : '❌'} ${name}: ${data.hex} (${data.fillPct}% fill)`);
  }

  // ── Phase 7: Entity & World Scan ──
  console.log('\n[7/8] Entity & World Scan...');
  const entityData = await page.evaluate(() => {
    const result = {npcs:[],enemies:[],pickups:{},worldStats:{}};
    if(typeof npcs!=='undefined') result.npcs = npcs.map(n => ({name:n.name,x:+n.x.toFixed(1),y:+n.y.toFixed(1),type:n.merchant?'merchant':n.quest?'quest_giver':'neutral',questName:n.quest?.name||null,stock:n.stock?n.stock.map(s=>s.name):null}));
    if(typeof enemies!=='undefined'){const groups={};enemies.forEach(e=>{const k=`${e.type}_${e.alive?'alive':'dead'}`;if(!groups[k])groups[k]={type:e.type,alive:e.alive,count:0,levels:[]};groups[k].count++;groups[k].levels.push(e.level);});result.enemies=Object.values(groups).map(g=>({...g,levelRange:`${Math.min(...g.levels)}-${Math.max(...g.levels)}`}));}
    if(typeof pickups!=='undefined') result.pickups = {total:pickups.length,collected:pickups.filter(p=>p.collected).length,uncollected:pickups.filter(p=>!p.collected).length};
    if(typeof worldMap!=='undefined'&&typeof MAP_W!=='undefined'){const mw=MAP_W,mh=MAP_H;const tc={};for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){const t=worldMap[y*mw+x];tc[t]=(tc[t]||0)+1;}result.worldStats={mapSize:`${mw}x${mh}`,totalTiles:mw*mh,tileDistribution:tc};}
    return result;
  });
  console.log(`  NPCs: ${entityData.npcs.length} (${entityData.npcs.map(n=>n.name).join(', ')})`);
  console.log(`  Enemies: ${entityData.enemies.map(e => `${e.count} ${e.type}s (${e.alive?'alive':'dead'}, Lv${e.levelRange})`).join(', ')}`);
  console.log(`  Pickups: ${entityData.pickups.uncollected}/${entityData.pickups.total} uncollected`);

  // World map ASCII
  const asciiMap = await page.evaluate(() => {
    if(typeof worldMap==='undefined'||typeof MAP_W==='undefined') return '';
    const mw=MAP_W,mh=MAP_H;const step=Math.max(1,Math.floor(mw/32));const chars={0:'.',1:'#',2:'W',3:'~',4:'=',5:'_',6:'|',7:'D',8:'T'};
    let m='';for(let y=0;y<mh;y+=step){let r='';for(let x=0;x<mw;x+=step)r+=chars[worldMap[y*mw+x]]||'?';m+=r+'\n';}return m;
  });

  // ── Phase 8: Quality Score ──
  console.log('\n[8/8] Visual Quality Score...');
  const wowTargets = { sky:{r:95,g:155,b:215}, horizon:{r:180,g:200,b:185}, ground:{r:90,g:130,b:60} };
  function cdist(a,b){return Math.sqrt((a.r-b.r)**2+(a.g-b.g)**2+(a.b-b.b)**2);}

  const qualityScore = {};
  let ts=0,ms=0;

  if(pixelAnalysis.regionColors.sky){const d=cdist(pixelAnalysis.regionColors.sky,wowTargets.sky);qualityScore.skyColor=Math.max(0,Math.round(100-d*0.5));qualityScore.skyNote=d<60?'Good sky blue':d<120?'Sky too grey/brown':'Sky way off';}else{qualityScore.skyColor=0;}
  ts+=qualityScore.skyColor;ms+=100;

  if(pixelAnalysis.regionColors.horizon){const d=cdist(pixelAnalysis.regionColors.horizon,wowTargets.horizon);qualityScore.horizonColor=Math.max(0,Math.round(100-d*0.4));}else{qualityScore.horizonColor=0;}
  ts+=qualityScore.horizonColor;ms+=100;

  const gr=pixelAnalysis.regionColors.midground||pixelAnalysis.regionColors.foreground;
  if(gr){const d=cdist(gr,wowTargets.ground);qualityScore.groundColor=Math.max(0,Math.round(100-d*0.4));qualityScore.groundNote=d<60?'Nice green':d<120?'Could be greener':'Ground color off';}else{qualityScore.groundColor=0;}
  ts+=qualityScore.groundColor;ms+=100;

  qualityScore.warmth=pixelAnalysis.temperature.assessment==='warm'?90:pixelAnalysis.temperature.assessment==='neutral'?60:30;ts+=qualityScore.warmth;ms+=100;
  qualityScore.colorVariety=Math.min(100,Math.round(pixelAnalysis.centerColorVariety/150*100));ts+=qualityScore.colorVariety;ms+=100;
  const cr=pixelAnalysis.luminance.brightPct+pixelAnalysis.luminance.darkPct;
  qualityScore.contrast=cr>=10&&cr<=50?85:cr>=5?60:30;ts+=qualityScore.contrast;ms+=100;
  if(pixelAnalysis.fps!=='N/A'){qualityScore.fps=Math.min(100,Math.round(pixelAnalysis.fps/30*100));qualityScore.fpsNote=pixelAnalysis.fps>=30?'Smooth':pixelAnalysis.fps>=15?'Playable':'Needs work';}else{qualityScore.fps=0;}
  ts+=qualityScore.fps;ms+=100;

  qualityScore.overall=Math.round(ts/ms*100);
  qualityScore.grade=qualityScore.overall>=85?'A':qualityScore.overall>=70?'B':qualityScore.overall>=55?'C':qualityScore.overall>=40?'D':'F';

  console.log(`\n  ╔═══════════════════════════════╗`);
  console.log(`  ║  Quality Grade:  ${qualityScore.grade}  (${qualityScore.overall}/100)  ║`);
  console.log(`  ╚═══════════════════════════════╝`);
  console.log(`  Sky: ${qualityScore.skyColor}/100 — ${qualityScore.skyNote||''}`);
  console.log(`  Horizon: ${qualityScore.horizonColor}/100`);
  console.log(`  Ground: ${qualityScore.groundColor}/100 — ${qualityScore.groundNote||''}`);
  console.log(`  Warmth: ${qualityScore.warmth}/100`);
  console.log(`  Color Variety: ${qualityScore.colorVariety}/100`);
  console.log(`  Contrast: ${qualityScore.contrast}/100`);
  console.log(`  FPS: ${qualityScore.fps}/100 — ${qualityScore.fpsNote||''}`);

  // ── Save all reports ──
  console.log('\nSaving reports...');

  // Full report
  const report = {
    timestamp: new Date().toISOString(),
    gameUrl: GAME_URL,
    screenshots: LOCATIONS.map((l, i) => ({
      label: l.label,
      file: `${String(i+1).padStart(2, '0')}_${l.label}.png`,
      position: { x: l.x, y: l.y, angle: l.a, pitch: l.p },
    })),
    featureTests: {
      questDialog: questDialogOpen,
      merchantDialog: merchantDialogOpen,
      combat: combatResult,
    },
    pixelAnalysis,
    hudCheck,
    entityData,
    qualityScore,
    summary: {
      grade: qualityScore.grade,
      score: qualityScore.overall,
      fps: pixelAnalysis.fps,
      hudCoverage: hudCheck.coverage,
      avgColor: pixelAnalysis.avgColor.hex,
      temperature: pixelAnalysis.temperature.assessment,
      colorVariety: pixelAnalysis.centerColorVariety,
      screenshotCount: LOCATIONS.length + 3, // +3 for feature test shots
      npcs: entityData.npcs.length,
      enemyGroups: entityData.enemies.length,
      pickups: entityData.pickups.uncollected,
      mapSize: entityData.worldStats.mapSize,
    },
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'pixel-analysis.json'), JSON.stringify(pixelAnalysis, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'hud-check.json'), JSON.stringify(hudCheck, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'entity-data.json'), JSON.stringify(entityData, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'quality-score.json'), JSON.stringify(qualityScore, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'world-map.txt'), asciiMap);

  // Human-readable summary
  const summaryText = `
NWGE Analysis Report
═══════════════════════════════════
Generated: ${report.timestamp}
Game URL:  ${GAME_URL}

QUALITY: ${qualityScore.grade} (${qualityScore.overall}/100)
  Sky Color:     ${qualityScore.skyColor}/100  ${qualityScore.skyNote||''}
  Horizon:       ${qualityScore.horizonColor}/100
  Ground Color:  ${qualityScore.groundColor}/100  ${qualityScore.groundNote||''}
  Warmth:        ${qualityScore.warmth}/100
  Color Variety: ${qualityScore.colorVariety}/100
  Contrast:      ${qualityScore.contrast}/100
  FPS:           ${qualityScore.fps}/100  ${qualityScore.fpsNote||''}

CANVAS: ${pixelAnalysis.canvasSize.width}×${pixelAnalysis.canvasSize.height}
  Avg Color: ${pixelAnalysis.avgColor.hex} rgb(${pixelAnalysis.avgColor.r},${pixelAnalysis.avgColor.g},${pixelAnalysis.avgColor.b})
  Dark: ${pixelAnalysis.luminance.darkPct}% | Mid: ${pixelAnalysis.luminance.midPct}% | Bright: ${pixelAnalysis.luminance.brightPct}%
  Temp: ${pixelAnalysis.temperature.assessment} (warm ${pixelAnalysis.temperature.warmPct}%, cool ${pixelAnalysis.temperature.coolPct}%)
  Center variety: ${pixelAnalysis.centerColorVariety} unique colors

REGIONS:
${Object.entries(pixelAnalysis.regionColors).map(([k,v]) => `  ${k.padEnd(12)} ${v.hex} rgb(${v.r},${v.g},${v.b}) dark:${v.darkPct}% bright:${v.brightPct}%`).join('\n')}

HUD: ${hudCheck.visibleCount}/${hudCheck.totalElements} elements (${hudCheck.coverage})
${Object.entries(hudCheck.elements).map(([k,v]) => `  ${v.visible?'✅':'❌'} ${k.padEnd(18)} ${v.hex} (${v.fillPct}% fill)`).join('\n')}

FEATURES:
  Quest dialog:    ${questDialogOpen ? '✅ PASS' : '❌ FAIL'}
  Merchant dialog: ${merchantDialogOpen ? '✅ PASS' : '❌ FAIL'}
  Combat:          ${combatResult.tested ? `✅ PASS (${combatResult.damageDealt} dmg to ${combatResult.name})` : '❌ FAIL'}

ENTITIES:
  NPCs: ${entityData.npcs.map(n => `${n.name} (${n.type})`).join(', ')}
  Enemies: ${entityData.enemies.map(e => `${e.count} ${e.type}s Lv${e.levelRange}`).join(', ')}
  Pickups: ${entityData.pickups.uncollected}/${entityData.pickups.total}

WORLD: ${entityData.worldStats.mapSize} (${entityData.worldStats.totalTiles} tiles)

SCREENSHOTS: ${LOCATIONS.length + 3} captured in ${SS_DIR}
`.trim();

  fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.txt'), summaryText);

  console.log(`\n✅ Analysis complete!`);
  console.log(`   ${SS_DIR} — ${LOCATIONS.length + 3} screenshots`);
  console.log(`   ${OUTPUT_DIR}/report.json — Full data`);
  console.log(`   ${OUTPUT_DIR}/summary.txt — Human-readable`);

  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
