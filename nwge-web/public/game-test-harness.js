// ═══════════════════════════════════════════════════════════════
// NWGE Game Testing Harness
// Inject into game.html via console or Playwright to:
//  1. Teleport player to key locations & capture screenshots
//  2. Exercise all game features (combat, quests, trading)
//  3. Extract canvas pixel metrics
//  4. Generate visual reports
// ═══════════════════════════════════════════════════════════════

window.NWGE_TEST = (() => {
  const results = {};
  const screenshots = [];
  const metrics = {};

  // ─── Utility: wait N frames ───
  function waitFrames(n) {
    return new Promise(resolve => {
      let count = 0;
      function tick() {
        if (++count >= n) resolve();
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  // ─── Utility: capture canvas as data URL ───
  function captureScreen(label) {
    const c = document.getElementById('gameCanvas');
    const url = c.toDataURL('image/png');
    screenshots.push({ label, url, timestamp: Date.now() });
    return url;
  }

  // ─── Utility: set player state ───
  function teleport(x, y, angle, pitch) {
    if (typeof player === 'undefined') return;
    player.x = x;
    player.y = y;
    if (angle !== undefined) player.angle = angle;
    if (pitch !== undefined) player.pitch = pitch;
  }

  // ─── TOOL 1: Screenshot Walker ───
  // Teleports to key locations, waits for render, captures
  async function screenshotWalker() {
    const locations = [
      // [label, x, y, angle, pitch, description]
      ['spawn_start', 22.5, 34.5, 0, 0, 'Player spawn point - Goldshire center'],
      ['inn_front', 25.5, 35.5, -Math.PI/2, 0, 'Facing Goldshire Inn entrance'],
      ['road_east', 35, 33, 0, 0, 'East road looking toward river/forest'],
      ['road_west', 15, 33, Math.PI, 0, 'West road looking into village'],
      ['crossroad', 24, 20, -Math.PI/2, 0, 'North-south crossroad looking north'],
      ['guard_tower', 32, 33, -Math.PI*0.3, 0, 'Facing the guard tower'],
      ['pond_view', 28, 42, -Math.PI/2, -10, 'Looking down at the pond'],
      ['npc_marshal', 25.0, 34.5, -Math.PI/2, 0, 'Near Marshal Dughan (quest giver)'],
      ['npc_merchant', 20.0, 33.0, -Math.PI*0.3, 0, 'Near Tharyn Bouden (merchant)'],
      ['forest_nw', 10, 10, Math.PI*0.25, 0, 'Inside NW forest (kobold territory)'],
      ['forest_ne', 45, 10, 0, 0, 'NE forest (wolf territory)'],
      ['wolf_area', 42, 32, 0, 0, 'East grassland - wolf spawns'],
      ['river_view', 50, 30, 0, 0, 'Looking at the river'],
      ['barn_area', 42, 20, Math.PI, 0, 'Farm area with barn and fences'],
      ['sky_view', 22.5, 34.5, 0, 80, 'Looking up at sky (clouds, sun, god rays)'],
      ['ground_view', 22.5, 34.5, 0, -60, 'Looking down at ground textures'],
      ['chapel_view', 24, 26, Math.PI/2, 0, 'Chapel building'],
      ['smithy_view', 17, 28, 0, 0, 'Smithy building with Smith Argus'],
    ];

    console.log(`[NWGE_TEST] Screenshot walker: ${locations.length} locations`);

    for (const [label, x, y, angle, pitch, desc] of locations) {
      teleport(x, y, angle, pitch);
      await waitFrames(5); // let 5 frames render
      captureScreen(label);
      console.log(`  ✓ ${label}: ${desc}`);
    }

    console.log(`[NWGE_TEST] Walker complete. ${screenshots.length} screenshots.`);
    return screenshots;
  }

  // ─── TOOL 2: Feature Exerciser ───
  // Programmatically exercises each game system
  async function featureExerciser() {
    console.log('[NWGE_TEST] Feature exerciser starting...');
    const featureResults = {};

    // 2a. Quest dialog
    teleport(25.2, 33.8, -Math.PI/2, 0); // near Marshal
    await waitFrames(5);
    captureScreen('before_interact_marshal');
    if (typeof tryInteract === 'function') tryInteract();
    await waitFrames(3);
    captureScreen('quest_dialog_open');
    featureResults.questDialog = document.querySelector('.dialog-overlay.active') !== null
      || document.getElementById('questOverlay').innerHTML.length > 10;
    if (typeof closeAllDialogs === 'function') closeAllDialogs();
    await waitFrames(2);

    // 2b. Merchant dialog
    teleport(20.2, 32.8, -Math.PI*0.3, 0); // near merchant
    await waitFrames(5);
    if (typeof tryInteract === 'function') tryInteract();
    await waitFrames(3);
    captureScreen('merchant_dialog_open');
    featureResults.merchantDialog = document.getElementById('merchantOverlay').innerHTML.length > 10;
    if (typeof closeAllDialogs === 'function') closeAllDialogs();
    await waitFrames(2);

    // 2c. Combat
    teleport(42, 32, 0, 0); // wolf area
    await waitFrames(5);
    captureScreen('before_combat');
    // Find nearest wolf
    let nearestWolf = null, nearDist = Infinity;
    if (typeof enemies !== 'undefined') {
      for (const e of enemies) {
        if (!e.alive || e.type !== 'wolf') continue;
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < nearDist) { nearDist = d; nearestWolf = e; }
      }
    }
    if (nearestWolf) {
      // Teleport right next to wolf, facing it
      const ang = Math.atan2(nearestWolf.y - player.y, nearestWolf.x - player.x);
      teleport(nearestWolf.x - Math.cos(ang)*1.5, nearestWolf.y - Math.sin(ang)*1.5, ang, 0);
      await waitFrames(5);
      captureScreen('facing_wolf');
      // Attack
      if (typeof tryAttack === 'function') {
        attackCooldown = 0;
        tryAttack();
      }
      await waitFrames(3);
      captureScreen('after_attack_wolf');
      featureResults.combat = true;
    } else {
      featureResults.combat = false;
    }

    // 2d. Pickup
    teleport(10, 12, 0, 0); // kobold candle area
    await waitFrames(5);
    captureScreen('pickup_area');
    let nearestPickup = null, pDist = Infinity;
    if (typeof pickups !== 'undefined') {
      for (const p of pickups) {
        if (p.collected) continue;
        const d = Math.hypot(p.x - player.x, p.y - player.y);
        if (d < pDist) { pDist = d; nearestPickup = p; }
      }
    }
    if (nearestPickup) {
      teleport(nearestPickup.x, nearestPickup.y, 0, 0);
      await waitFrames(5);
      captureScreen('at_pickup');
    }

    // 2e. HUD state capture
    teleport(22.5, 34.5, 0, 0);
    await waitFrames(5);
    captureScreen('full_hud_view');

    // 2f. Check player state
    featureResults.playerState = {
      x: player.x, y: player.y,
      health: player.health, maxHealth: player.maxHealth,
      mana: player.mana, maxMana: player.maxMana,
      gold: player.gold, level: player.level,
      xp: player.xp, xpNeeded: player.xpNeeded,
      inventoryCount: player.inventory.length,
      target: player.target ? player.target.name : null,
    };

    // 2g. Count alive entities
    featureResults.aliveEnemies = typeof enemies !== 'undefined'
      ? enemies.filter(e => e.alive).length : 0;
    featureResults.uncollectedPickups = typeof pickups !== 'undefined'
      ? pickups.filter(p => !p.collected).length : 0;
    featureResults.npcCount = typeof npcs !== 'undefined' ? npcs.length : 0;
    featureResults.activeQuestCount = typeof activeQuests !== 'undefined' ? activeQuests.length : 0;

    console.log('[NWGE_TEST] Feature exerciser complete:', featureResults);
    return featureResults;
  }

  // ─── TOOL 3: Canvas Metric Extractor ───
  // Analyzes actual pixel data from the canvas
  function extractMetrics() {
    const c = document.getElementById('gameCanvas');
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const W = c.width, H = c.height;
    const imageData = ctx.getImageData(0, 0, W, H);
    const px = imageData.data;
    const totalPixels = W * H;

    // Color distribution (sample every 4th pixel for speed)
    let rSum=0, gSum=0, bSum=0;
    let darkPixels=0, brightPixels=0;
    let skyColorSum=[0,0,0], skyCount=0;
    let groundColorSum=[0,0,0], groundCount=0;
    let samples = 0;

    // Region analysis
    const regions = {
      sky:    { y0: 0,      y1: H*0.35, r:0, g:0, b:0, count:0 },
      horizon:{ y0: H*0.35, y1: H*0.55, r:0, g:0, b:0, count:0 },
      ground: { y0: H*0.55, y1: H*0.85, r:0, g:0, b:0, count:0 },
      hud:    { y0: H*0.85, y1: H,      r:0, g:0, b:0, count:0 },
    };

    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        const i = (y * W + x) * 4;
        const r = px[i], g = px[i+1], b = px[i+2];
        rSum += r; gSum += g; bSum += b;
        samples++;

        const lum = r*0.299 + g*0.587 + b*0.114;
        if (lum < 40) darkPixels++;
        if (lum > 200) brightPixels++;

        // Region accumulation
        for (const key in regions) {
          const reg = regions[key];
          if (y >= reg.y0 && y < reg.y1) {
            reg.r += r; reg.g += g; reg.b += b; reg.count++;
          }
        }
      }
    }

    // Compute averages
    const avgColor = {
      r: Math.round(rSum / samples),
      g: Math.round(gSum / samples),
      b: Math.round(bSum / samples),
    };

    const regionColors = {};
    for (const key in regions) {
      const reg = regions[key];
      if (reg.count > 0) {
        regionColors[key] = {
          r: Math.round(reg.r / reg.count),
          g: Math.round(reg.g / reg.count),
          b: Math.round(reg.b / reg.count),
          hex: '#' + [reg.r, reg.g, reg.b].map(c =>
            Math.round(c / reg.count).toString(16).padStart(2, '0')
          ).join(''),
        };
      }
    }

    // Color variety (unique colors in a center sample)
    const colorSet = new Set();
    const cx = Math.floor(W/2), cy = Math.floor(H/2);
    for (let y = cy-50; y < cy+50; y++) {
      for (let x = cx-50; x < cx+50; x++) {
        const i = (y * W + x) * 4;
        // Quantize to reduce noise (bucket by 16)
        const qr = (px[i] >> 4) << 4;
        const qg = (px[i+1] >> 4) << 4;
        const qb = (px[i+2] >> 4) << 4;
        colorSet.add(`${qr},${qg},${qb}`);
      }
    }

    // Check if specific UI elements are rendering
    // (sample specific pixel locations where HUD should be)
    const hudChecks = {
      healthBarArea: sampleRegionColor(px, W, 72, 16, 180, 22),   // health bar location
      manaBarArea:   sampleRegionColor(px, W, 72, 41, 180, 22),   // mana bar location
      minimapArea:   sampleRegionColor(px, W, W-80, 16, 64, 64),  // minimap top-right
      actionBarArea: sampleRegionColor(px, W, W/2-200, H-60, 400, 42), // action bar bottom
      xpBarArea:     sampleRegionColor(px, W, W/2-100, H-12, 200, 10), // xp bar very bottom
    };

    metrics.canvasSize = { width: W, height: H };
    metrics.avgColor = avgColor;
    metrics.darkPixelPct = Math.round(darkPixels / samples * 100);
    metrics.brightPixelPct = Math.round(brightPixels / samples * 100);
    metrics.regionColors = regionColors;
    metrics.centerColorVariety = colorSet.size;
    metrics.hudPresence = hudChecks;
    metrics.fps = typeof fps !== 'undefined' ? fps : 'N/A';

    console.log('[NWGE_TEST] Metrics extracted:', metrics);
    return metrics;
  }

  function sampleRegionColor(px, W, x0, y0, w, h) {
    let r=0, g=0, b=0, count=0;
    for (let y = Math.max(0, y0); y < y0+h; y += 2) {
      for (let x = Math.max(0, x0); x < x0+w; x += 2) {
        const i = (y * W + x) * 4;
        r += px[i]; g += px[i+1]; b += px[i+2];
        count++;
      }
    }
    if (count === 0) return { r:0, g:0, b:0, hex:'#000000', nonBlack: false };
    r = Math.round(r/count); g = Math.round(g/count); b = Math.round(b/count);
    return {
      r, g, b,
      hex: '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join(''),
      nonBlack: (r+g+b) > 30,  // is there actually something rendered here?
    };
  }

  // ─── TOOL 4: Full Test Run ───
  // Runs everything and returns a complete report
  async function runFullTest() {
    console.log('[NWGE_TEST] ═══ FULL TEST RUN START ═══');
    const report = {};

    // Screenshots
    report.screenshots = await screenshotWalker();
    console.log(`  Screenshots: ${report.screenshots.length}`);

    // Features
    report.features = await featureExerciser();
    console.log('  Features:', report.features);

    // Metrics
    report.metrics = extractMetrics();
    console.log('  Metrics:', report.metrics);

    // Summary
    report.summary = {
      totalScreenshots: report.screenshots.length,
      screenshotLabels: report.screenshots.map(s => s.label),
      gameRunning: report.metrics.fps !== 'N/A' && report.metrics.fps > 0,
      hudRendering: Object.values(report.metrics.hudPresence).some(h => h.nonBlack),
      colorVariety: report.metrics.centerColorVariety,
      avgSceneColor: report.metrics.avgColor,
      regionColors: report.metrics.regionColors,
      entities: {
        npcs: report.features.npcCount,
        aliveEnemies: report.features.aliveEnemies,
        pickups: report.features.uncollectedPickups,
      },
    };

    console.log('[NWGE_TEST] ═══ FULL TEST RUN COMPLETE ═══');
    console.log('[NWGE_TEST] Summary:', JSON.stringify(report.summary, null, 2));

    // Store globally for retrieval
    window.NWGE_TEST_REPORT = report;
    return report;
  }

  // ─── TOOL 5: Generate Report HTML ───
  // Creates a visual report page from collected screenshots
  function generateReportHTML() {
    const ss = screenshots;
    if (ss.length === 0) return '<p>No screenshots captured. Run screenshotWalker() first.</p>';

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>NWGE Visual Report</title>
    <style>
      body { background:#1a1a2a; color:#ddd; font-family:Arial; margin:20px; }
      h1 { color:#c8a040; }
      .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(400px,1fr)); gap:12px; }
      .card { background:#222; border:1px solid #444; border-radius:6px; overflow:hidden; }
      .card img { width:100%; display:block; }
      .card .label { padding:8px; font-size:13px; color:#aaa; }
      .card .label b { color:#e8c060; }
      .metrics { background:#222; padding:15px; border-radius:6px; margin:15px 0; }
      .metrics td { padding:4px 12px; }
      .color-swatch { display:inline-block; width:20px; height:20px; border:1px solid #555; vertical-align:middle; margin-right:6px; }
    </style></head><body>
    <h1>NWGE Game Visual Report</h1>
    <p>Generated: ${new Date().toISOString()} | Screenshots: ${ss.length}</p>`;

    // Metrics section
    if (Object.keys(metrics).length > 0) {
      html += `<div class="metrics"><h3>Canvas Metrics</h3><table>`;
      html += `<tr><td>Canvas Size</td><td>${metrics.canvasSize?.width}×${metrics.canvasSize?.height}</td></tr>`;
      html += `<tr><td>FPS</td><td>${metrics.fps}</td></tr>`;
      html += `<tr><td>Avg Color</td><td><span class="color-swatch" style="background:rgb(${metrics.avgColor?.r},${metrics.avgColor?.g},${metrics.avgColor?.b})"></span> rgb(${metrics.avgColor?.r},${metrics.avgColor?.g},${metrics.avgColor?.b})</td></tr>`;
      html += `<tr><td>Dark Pixels</td><td>${metrics.darkPixelPct}%</td></tr>`;
      html += `<tr><td>Bright Pixels</td><td>${metrics.brightPixelPct}%</td></tr>`;
      html += `<tr><td>Color Variety (center)</td><td>${metrics.centerColorVariety} unique colors</td></tr>`;
      if (metrics.regionColors) {
        for (const [region, color] of Object.entries(metrics.regionColors)) {
          html += `<tr><td>${region} region</td><td><span class="color-swatch" style="background:${color.hex}"></span> ${color.hex}</td></tr>`;
        }
      }
      if (metrics.hudPresence) {
        for (const [element, data] of Object.entries(metrics.hudPresence)) {
          html += `<tr><td>HUD: ${element}</td><td>${data.nonBlack ? '✅ rendering' : '❌ not visible'} (${data.hex})</td></tr>`;
        }
      }
      html += `</table></div>`;
    }

    // Screenshot grid
    html += `<div class="grid">`;
    for (const s of ss) {
      html += `<div class="card">
        <img src="${s.url}" alt="${s.label}">
        <div class="label"><b>${s.label}</b></div>
      </div>`;
    }
    html += `</div></body></html>`;
    return html;
  }

  // Public API
  return {
    screenshotWalker,
    featureExerciser,
    extractMetrics,
    runFullTest,
    generateReportHTML,
    captureScreen,
    teleport,
    getScreenshots: () => screenshots,
    getMetrics: () => metrics,
  };
})();

console.log('[NWGE_TEST] Test harness loaded. Available commands:');
console.log('  NWGE_TEST.runFullTest()         - Run everything');
console.log('  NWGE_TEST.screenshotWalker()    - Capture all locations');
console.log('  NWGE_TEST.featureExerciser()    - Test all features');
console.log('  NWGE_TEST.extractMetrics()      - Analyze pixels');
console.log('  NWGE_TEST.generateReportHTML()  - Build visual report');
console.log('  NWGE_TEST.teleport(x,y,angle)   - Move player');
console.log('  NWGE_TEST.captureScreen(label)   - Single screenshot');
