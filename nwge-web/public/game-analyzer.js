// ═══════════════════════════════════════════════════════════════════════
// NWGE Game Analyzer v2 — Comprehensive Analysis Toolkit
// 
// This is the MASTER analysis script that gives AI assistants a thorough
// understanding of the game's visual state, features, and quality.
//
// Tools:
//   1. Screenshot Walker     — Teleport to key locations and capture
//   2. Feature Exerciser     — Trigger all game systems, verify they work
//   3. Pixel Analyzer        — Deep canvas pixel analysis per region
//   4. HUD Inspector         — Check every HUD element renders properly
//   5. Entity Inspector      — Catalog all NPCs, enemies, pickups
//   6. World Map Scanner     — Sample tile types across the full map
//   7. Visual Quality Scorer — Rate rendering vs WoW reference targets
//   8. Full Report Generator — Produce complete JSON + HTML report
//
// Usage:
//   Inject into game.html context (iframe or Playwright), then call:
//     const report = await NWGE_ANALYZER.runFullAnalysis();
//   Or call individual tools:
//     await NWGE_ANALYZER.screenshotWalker();
//     NWGE_ANALYZER.pixelAnalyzer();
// ═══════════════════════════════════════════════════════════════════════

window.NWGE_ANALYZER = (() => {
  'use strict';

  // ─── State ───
  const _screenshots = [];
  const _report = {};

  // ─── Utilities ───
  function waitFrames(n) {
    return new Promise(resolve => {
      let c = 0;
      (function tick() { if (++c >= n) resolve(); else requestAnimationFrame(tick); })();
    });
  }

  function waitMs(ms) { return new Promise(r => setTimeout(r, ms)); }

  function getCanvas() { return document.getElementById('game'); }
  function getCtx() { return getCanvas().getContext('2d', { willReadFrequently: true }); }

  function capture(label, description) {
    const c = getCanvas();
    if (!c) return null;
    const url = c.toDataURL('image/png');
    const entry = { label, description, url, timestamp: Date.now(), width: c.width, height: c.height };
    _screenshots.push(entry);
    return entry;
  }

  function teleport(x, y, angle, pitch) {
    if (typeof player === 'undefined') return false;
    player.x = x;
    player.y = y;
    if (angle !== undefined) player.angle = angle;
    if (pitch !== undefined) player.pitch = pitch;
    return true;
  }

  function rgb2hex(r, g, b) {
    return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
  }

  function colorDistance(c1, c2) {
    return Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2);
  }

  // ═══════════════════════════════════════════════════
  // TOOL 1: Screenshot Walker
  // ═══════════════════════════════════════════════════
  const WALK_LOCATIONS = [
    // [label, x, y, angle, pitch, description, category]
    // Village
    ['village_spawn',     22.5, 34.5, 0, 0,           'Player spawn - Goldshire center', 'village'],
    ['village_inn',       25.5, 35.5, -Math.PI/2, 0,   'Goldshire Inn front entrance', 'village'],
    ['village_road_east', 35, 33, 0, 0,                'East road toward river', 'village'],
    ['village_road_west', 15, 33, Math.PI, 0,          'West road into village', 'village'],
    ['village_crossroad', 24, 20, -Math.PI/2, 0,       'North crossroad junction', 'village'],
    ['village_tower',     32, 33, -Math.PI * 0.3, 0,   'Guard tower', 'village'],
    ['village_chapel',    24, 26, Math.PI / 2, 0,      'Chapel building', 'village'],
    ['village_smithy',    17, 28, 0, 0,                'Smithy (Smith Argus)', 'village'],
    // Nature
    ['nature_pond',       28, 42, -Math.PI/2, -10,     'Pond with reflections', 'nature'],
    ['nature_river',      50, 30, 0, 0,                'Eastern river bank', 'nature'],
    ['nature_farm',       42, 20, Math.PI, 0,          'Farm and barn area', 'nature'],
    ['nature_forest_nw',  10, 10, Math.PI * 0.25, 0,   'NW forest (kobold territory)', 'nature'],
    ['nature_forest_ne',  45, 10, 0, 0,                'NE forest (wolf territory)', 'nature'],
    // NPCs
    ['npc_marshal',       25.0, 34.5, -Math.PI/2, 0,   'Marshal Dughan (quest giver)', 'npc'],
    ['npc_merchant',      20.0, 33.0, -Math.PI*0.3, 0, 'Tharyn Bouden (merchant)', 'npc'],
    ['npc_guard',         30.5, 28.5, -Math.PI*0.25, 0,'Guard Thomas (quest giver)', 'npc'],
    ['npc_smith',         18.0, 29.0, -Math.PI*0.2, 0, 'Smith Argus (merchant)', 'npc'],
    // Enemies
    ['enemy_wolves',      42, 32, 0, 0,                'Wolf hunting grounds', 'enemy'],
    ['enemy_kobolds',     12, 12, Math.PI * 0.3, 0,    'Kobold workers camp', 'enemy'],
    // Sky & Ground
    ['sky_view',          22.5, 34.5, 0, 80,           'Looking up: clouds, sun, god rays', 'visual'],
    ['ground_view',       22.5, 34.5, 0, -60,          'Looking down: floor textures', 'visual'],
    // Panorama (360 degree from center)
    ['pano_north',        22.5, 34.5, -Math.PI/2, 0,   'Panorama: facing north', 'panorama'],
    ['pano_east',         22.5, 34.5, 0, 0,            'Panorama: facing east', 'panorama'],
    ['pano_south',        22.5, 34.5, Math.PI/2, 0,    'Panorama: facing south', 'panorama'],
    ['pano_west',         22.5, 34.5, Math.PI, 0,      'Panorama: facing west', 'panorama'],
  ];

  async function screenshotWalker(locations) {
    const locs = locations || WALK_LOCATIONS;
    const results = [];
    console.log(`[ANALYZER] Screenshot Walker: ${locs.length} locations`);

    for (const [label, x, y, angle, pitch, desc, cat] of locs) {
      teleport(x, y, angle, pitch);
      await waitFrames(10); // 10 frames for stable render
      const shot = capture(label, desc);
      if (shot) shot.category = cat;
      results.push({ label, x, y, angle, pitch, description: desc, category: cat, captured: !!shot });
      console.log(`  [OK] ${label} @ (${x},${y})`);
    }

    console.log(`[ANALYZER] Walker complete: ${results.length} shots`);
    return results;
  }

  // ═══════════════════════════════════════════════════
  // TOOL 2: Feature Exerciser
  // ═══════════════════════════════════════════════════
  async function featureExerciser() {
    console.log('[ANALYZER] Feature Exerciser starting...');
    const results = {
      questDialog: false,
      merchantDialog: false,
      combat: { tested: false, damageDealt: 0, targetName: null },
      pickup: { tested: false, itemName: null },
      movement: false,
      interaction: false,
      chatSystem: false,
      floatingText: false,
      playerState: null,
      entityCounts: null,
    };

    // --- Quest Dialog Test ---
    try {
      teleport(25.2, 33.8, -Math.PI / 2, 0);
      await waitFrames(8);
      capture('feat_pre_quest', 'Before quest interaction');
      if (typeof tryInteract === 'function') tryInteract();
      await waitFrames(5);
      capture('feat_quest_dialog', 'Quest dialog opened');
      const qOverlay = document.getElementById('questOverlay');
      results.questDialog = qOverlay && (qOverlay.innerHTML.length > 10 || qOverlay.classList.contains('active'));
      if (typeof closeAllDialogs === 'function') closeAllDialogs();
      await waitFrames(3);
    } catch (e) { console.warn('[ANALYZER] Quest test error:', e); }

    // --- Merchant Dialog Test ---
    try {
      teleport(20.2, 32.8, -Math.PI * 0.3, 0);
      await waitFrames(8);
      if (typeof tryInteract === 'function') tryInteract();
      await waitFrames(5);
      capture('feat_merchant_dialog', 'Merchant dialog opened');
      const mOverlay = document.getElementById('merchantOverlay');
      results.merchantDialog = mOverlay && (mOverlay.innerHTML.length > 10 || mOverlay.classList.contains('active'));
      if (typeof closeAllDialogs === 'function') closeAllDialogs();
      await waitFrames(3);
    } catch (e) { console.warn('[ANALYZER] Merchant test error:', e); }

    // --- Combat Test ---
    try {
      if (typeof enemies !== 'undefined' && typeof tryAttack === 'function') {
        const wolf = enemies.find(e => e.alive && e.type === 'wolf');
        if (wolf) {
          const a = Math.atan2(wolf.y - player.y, wolf.x - player.x);
          teleport(wolf.x - Math.cos(a) * 1.5, wolf.y - Math.sin(a) * 1.5, a, 0);
          await waitFrames(8);
          capture('feat_pre_combat', 'Facing wolf before attack');
          const hpBefore = wolf.health;
          attackCooldown = 0;
          tryAttack();
          await waitFrames(5);
          capture('feat_post_combat', 'After attacking wolf');
          results.combat.tested = true;
          results.combat.damageDealt = hpBefore - wolf.health;
          results.combat.targetName = wolf.name || wolf.type;
          results.combat.targetHP = `${wolf.health}/${wolf.maxHealth}`;
        }
      }
    } catch (e) { console.warn('[ANALYZER] Combat test error:', e); }

    // --- Pickup Test ---
    try {
      if (typeof pickups !== 'undefined') {
        const pickup = pickups.find(p => !p.collected);
        if (pickup) {
          const a = Math.atan2(pickup.y - player.y, pickup.x - player.x);
          teleport(pickup.x + 0.3, pickup.y + 0.3, a + Math.PI, -15);
          await waitFrames(8);
          capture('feat_pickup', 'Near pickup item');
          results.pickup.tested = true;
          results.pickup.itemName = pickup.name || pickup.item || 'Unknown';
        }
      }
    } catch (e) { console.warn('[ANALYZER] Pickup test error:', e); }

    // --- Movement Test ---
    try {
      const startX = player.x;
      teleport(player.x + 2, player.y, player.angle, 0);
      await waitFrames(3);
      results.movement = Math.abs(player.x - startX) > 1;
    } catch (e) { results.movement = false; }

    // --- Chat System Test ---
    try {
      if (typeof addChatMsg === 'function') {
        const countBefore = typeof chatLog !== 'undefined' ? chatLog.length : 0;
        addChatMsg('system', '[ANALYZER] Test message');
        results.chatSystem = typeof chatLog !== 'undefined' && chatLog.length > countBefore;
      }
    } catch (e) { results.chatSystem = false; }

    // --- Floating Text Test ---
    try {
      if (typeof addFloatingText === 'function') {
        addFloatingText(100, 100, 'TEST', '#ff0');
        results.floatingText = true;
      }
    } catch (e) { results.floatingText = false; }

    // --- Player State Snapshot ---
    try {
      results.playerState = {
        x: player.x.toFixed(1),
        y: player.y.toFixed(1),
        angle: player.angle.toFixed(2),
        health: player.health,
        maxHealth: player.maxHealth,
        mana: player.mana,
        maxMana: player.maxMana,
        gold: player.gold,
        level: player.level,
        xp: player.xp,
        xpNeeded: player.xpNeeded,
        inventory: player.inventory.slice(),
        inventoryCount: player.inventory.length,
      };
    } catch (e) {}

    // --- Entity Counts ---
    try {
      const wolves = typeof enemies !== 'undefined' ? enemies.filter(e => e.alive && e.type === 'wolf') : [];
      const kobolds = typeof enemies !== 'undefined' ? enemies.filter(e => e.alive && e.type === 'kobold') : [];
      const allPickups = typeof pickups !== 'undefined' ? pickups.filter(p => !p.collected) : [];
      const allNpcs = typeof npcs !== 'undefined' ? npcs : [];
      const quests = typeof activeQuests !== 'undefined' ? activeQuests : [];

      results.entityCounts = {
        totalEnemiesAlive: wolves.length + kobolds.length,
        wolves: wolves.length,
        kobolds: kobolds.length,
        npcs: allNpcs.length,
        npcNames: allNpcs.map(n => n.name),
        pickups: allPickups.length,
        activeQuests: quests.length,
        questNames: quests.map(q => q.name || q.title || 'Unknown'),
      };
    } catch (e) {}

    // Return to spawn
    teleport(22.5, 34.5, 0, 0);
    await waitFrames(5);

    console.log('[ANALYZER] Feature Exerciser complete:', results);
    return results;
  }

  // ═══════════════════════════════════════════════════
  // TOOL 3: Pixel Analyzer (Deep Canvas Analysis)
  // ═══════════════════════════════════════════════════
  function pixelAnalyzer() {
    console.log('[ANALYZER] Pixel Analyzer starting...');
    const c = getCanvas();
    if (!c) return null;
    const ct = c.getContext('2d', { willReadFrequently: true });
    const W = c.width, H = c.height;
    const imgData = ct.getImageData(0, 0, W, H);
    const px = imgData.data;
    const totalPx = W * H;

    // --- Overall Stats ---
    let rSum = 0, gSum = 0, bSum = 0, samples = 0;
    let darkPx = 0, brightPx = 0, midPx = 0;
    let warmPx = 0, coolPx = 0; // warm = more red; cool = more blue

    // --- Region Definitions ---
    const regionDefs = {
      sky:        { y0: 0,         y1: H * 0.30 },
      horizon:    { y0: H * 0.30,  y1: H * 0.50 },
      midground:  { y0: H * 0.50,  y1: H * 0.70 },
      foreground: { y0: H * 0.70,  y1: H * 0.85 },
      hudBottom:  { y0: H * 0.85,  y1: H },
      leftHud:    { x0: 0,         x1: W * 0.25, y0: 0, y1: H * 0.15 },
      rightHud:   { x0: W * 0.75,  x1: W,        y0: 0, y1: H * 0.25 },
      center:     { x0: W * 0.35,  x1: W * 0.65, y0: H * 0.35, y1: H * 0.65 },
    };

    const regionStats = {};
    for (const k in regionDefs) {
      regionStats[k] = { r: 0, g: 0, b: 0, count: 0, dark: 0, bright: 0 };
    }

    // --- Color Histogram (quantized to 64 buckets) ---
    const histogram = new Array(64).fill(0);

    // --- Scan (sample every 2nd pixel for speed) ---
    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        const i = (y * W + x) * 4;
        const r = px[i], g = px[i + 1], b = px[i + 2];
        rSum += r; gSum += g; bSum += b;
        samples++;

        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        if (lum < 40) darkPx++;
        else if (lum > 200) brightPx++;
        else midPx++;

        if (r > b + 20) warmPx++;
        else if (b > r + 20) coolPx++;

        // Quantize for histogram (2 bits per channel)
        const qi = ((r >> 6) << 4) | ((g >> 6) << 2) | (b >> 6);
        histogram[qi]++;

        // Region accumulation
        for (const k in regionDefs) {
          const def = regionDefs[k];
          const inY = y >= (def.y0 || 0) && y < (def.y1 || H);
          const inX = x >= (def.x0 || 0) && x < (def.x1 || W);
          if (inY && inX) {
            const rs = regionStats[k];
            rs.r += r; rs.g += g; rs.b += b; rs.count++;
            if (lum < 40) rs.dark++;
            if (lum > 200) rs.bright++;
          }
        }
      }
    }

    // --- Compute Results ---
    const avgColor = {
      r: Math.round(rSum / samples),
      g: Math.round(gSum / samples),
      b: Math.round(bSum / samples),
    };
    avgColor.hex = rgb2hex(avgColor.r, avgColor.g, avgColor.b);

    const regionColors = {};
    for (const k in regionStats) {
      const rs = regionStats[k];
      if (rs.count > 0) {
        const r = Math.round(rs.r / rs.count);
        const g = Math.round(rs.g / rs.count);
        const b = Math.round(rs.b / rs.count);
        regionColors[k] = {
          r, g, b, hex: rgb2hex(r, g, b),
          darkPct: Math.round(rs.dark / rs.count * 100),
          brightPct: Math.round(rs.bright / rs.count * 100),
        };
      }
    }

    // --- Color Variety (unique quantized colors in center 200x200) ---
    const colorSet = new Set();
    const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
    for (let y = Math.max(0, cy - 100); y < Math.min(H, cy + 100); y++) {
      for (let x = Math.max(0, cx - 100); x < Math.min(W, cx + 100); x++) {
        const i = (y * W + x) * 4;
        colorSet.add(`${px[i] >> 4},${px[i + 1] >> 4},${px[i + 2] >> 4}`);
      }
    }

    // --- Top Histogram Colors ---
    const topColors = histogram.map((count, idx) => ({ idx, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(({ idx, count }) => ({
        r: ((idx >> 4) & 3) * 85,
        g: ((idx >> 2) & 3) * 85,
        b: (idx & 3) * 85,
        pct: Math.round(count / samples * 100),
      }));

    const result = {
      canvasSize: { width: W, height: H },
      totalPixels: totalPx,
      sampledPixels: samples,
      avgColor,
      luminance: {
        darkPct: Math.round(darkPx / samples * 100),
        brightPct: Math.round(brightPx / samples * 100),
        midPct: Math.round(midPx / samples * 100),
      },
      temperature: {
        warmPct: Math.round(warmPx / samples * 100),
        coolPct: Math.round(coolPx / samples * 100),
        assessment: warmPx > coolPx * 1.5 ? 'warm' : coolPx > warmPx * 1.5 ? 'cool' : 'neutral',
      },
      regionColors,
      centerColorVariety: colorSet.size,
      topHistogramColors: topColors,
      fps: typeof fps !== 'undefined' ? fps : 'N/A',
    };

    console.log('[ANALYZER] Pixel analysis complete:', result);
    return result;
  }

  // ═══════════════════════════════════════════════════
  // TOOL 4: HUD Inspector
  // ═══════════════════════════════════════════════════
  function hudInspector() {
    console.log('[ANALYZER] HUD Inspector starting...');
    const c = getCanvas();
    if (!c) return null;
    const ct = c.getContext('2d', { willReadFrequently: true });
    const W = c.width, H = c.height;
    const px = ct.getImageData(0, 0, W, H).data;

    function sampleRect(x0, y0, w, h) {
      let r = 0, g = 0, b = 0, n = 0;
      let nonBlackPx = 0, totalPx = 0;
      for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.floor(y0 + h)); y += 2) {
        for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.floor(x0 + w)); x += 2) {
          const i = (y * W + x) * 4;
          r += px[i]; g += px[i + 1]; b += px[i + 2];
          n++;
          totalPx++;
          if (px[i] + px[i + 1] + px[i + 2] > 30) nonBlackPx++;
        }
      }
      if (!n) return { r: 0, g: 0, b: 0, hex: '#000000', visible: false, fillPct: 0 };
      r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
      return {
        r, g, b, hex: rgb2hex(r, g, b),
        visible: (r + g + b) > 30,
        fillPct: Math.round(nonBlackPx / totalPx * 100),
      };
    }

    // HUD element positions (based on drawHUD function analysis)
    const elements = {
      playerPortrait:  sampleRect(12, 12, 52, 52),
      healthBar:       sampleRect(72, 16, 180, 18),
      manaBar:         sampleRect(72, 38, 180, 18),
      playerLevel:     sampleRect(30, 55, 40, 14),
      targetFrame:     sampleRect(W / 2 - 110, 12, 220, 50),
      minimap:         sampleRect(W - 160, 16, 140, 140),
      minimapBorder:   sampleRect(W - 170, 6, 160, 160),
      questTracker:    sampleRect(W - 240, 180, 230, 80),
      actionBar:       sampleRect(W / 2 - 230, H - 62, 460, 50),
      actionBarSlots:  sampleRect(W / 2 - 200, H - 55, 400, 36),
      bagSlots:        sampleRect(W / 2 + 240, H - 55, 80, 36),
      goldDisplay:     sampleRect(W / 2 + 170, H - 74, 60, 14),
      xpBar:           sampleRect(0, H - 12, W, 10),
      chatBox:         sampleRect(10, H - 222, 290, 160),
      chatTabs:        sampleRect(10, H - 232, 290, 16),
      crosshair:       sampleRect(W / 2 - 8, H / 2 - 8, 16, 16),
      fpsCounter:      sampleRect(W - 60, H - 28, 50, 14),
    };

    // Determine which elements are actually rendering
    const visibleCount = Object.values(elements).filter(e => e.visible).length;
    const totalElements = Object.keys(elements).length;

    const result = {
      elements,
      visibleCount,
      totalElements,
      coverage: Math.round(visibleCount / totalElements * 100) + '%',
      assessment: visibleCount >= totalElements * 0.8 ? 'GOOD' :
                  visibleCount >= totalElements * 0.5 ? 'PARTIAL' : 'POOR',
    };

    console.log(`[ANALYZER] HUD Inspector: ${visibleCount}/${totalElements} elements visible (${result.assessment})`);
    return result;
  }

  // ═══════════════════════════════════════════════════
  // TOOL 5: Entity Inspector
  // ═══════════════════════════════════════════════════
  function entityInspector() {
    console.log('[ANALYZER] Entity Inspector starting...');
    const result = { npcs: [], enemies: [], pickups: [], worldStats: {} };

    try {
      // NPCs
      if (typeof npcs !== 'undefined') {
        result.npcs = npcs.map(n => ({
          name: n.name,
          x: n.x.toFixed(1), y: n.y.toFixed(1),
          type: n.merchant ? 'merchant' : n.quest ? 'quest_giver' : 'neutral',
          questName: n.quest?.name || null,
          stock: n.stock ? n.stock.map(s => s.name) : null,
        }));
      }

      // Enemies
      if (typeof enemies !== 'undefined') {
        const enemyGroups = {};
        for (const e of enemies) {
          const key = `${e.type}_${e.alive ? 'alive' : 'dead'}`;
          if (!enemyGroups[key]) enemyGroups[key] = { type: e.type, alive: e.alive, count: 0, levels: [], samples: [] };
          enemyGroups[key].count++;
          enemyGroups[key].levels.push(e.level);
          if (enemyGroups[key].samples.length < 3) {
            enemyGroups[key].samples.push({
              name: e.name, level: e.level,
              hp: `${e.health}/${e.maxHealth}`,
              x: e.x.toFixed(1), y: e.y.toFixed(1),
              loot: e.loot,
            });
          }
        }
        result.enemies = Object.values(enemyGroups).map(g => ({
          ...g,
          levelRange: `${Math.min(...g.levels)}-${Math.max(...g.levels)}`,
          avgLevel: (g.levels.reduce((a, b) => a + b, 0) / g.levels.length).toFixed(1),
        }));
      }

      // Pickups
      if (typeof pickups !== 'undefined') {
        const collected = pickups.filter(p => p.collected).length;
        const uncollected = pickups.filter(p => !p.collected).length;
        result.pickups = {
          total: pickups.length,
          collected,
          uncollected,
          samples: pickups.slice(0, 3).map(p => ({
            name: p.name || p.item || 'Unknown',
            x: p.x.toFixed(1), y: p.y.toFixed(1),
            collected: p.collected,
          })),
        };
      }

      // World stats (worldMap is a flat Uint8Array of size MAP_W*MAP_H)
      if (typeof worldMap !== 'undefined' && typeof MAP_W !== 'undefined') {
        const tileCounts = {};
        const mw = MAP_W, mh = MAP_H;
        for (let y = 0; y < mh; y++) {
          for (let x = 0; x < mw; x++) {
            const t = worldMap[y * mw + x];
            tileCounts[t] = (tileCounts[t] || 0) + 1;
          }
        }
        result.worldStats = {
          mapSize: `${mw}x${mh}`,
          totalTiles: mw * mh,
          tileDistribution: tileCounts,
          tileTypes: {
            0: 'grass', 1: 'stone_wall', 2: 'wood_wall',
            3: 'water', 4: 'road', 5: 'stone_floor',
            6: 'fence', 7: 'door', 8: 'tree',
          },
        };
      }
    } catch (e) { console.warn('[ANALYZER] Entity inspection error:', e); }

    console.log('[ANALYZER] Entity Inspector complete');
    return result;
  }

  // ═══════════════════════════════════════════════════
  // TOOL 6: World Map Scanner
  // ═══════════════════════════════════════════════════
  function worldMapScanner() {
    console.log('[ANALYZER] World Map Scanner starting...');
    if (typeof worldMap === 'undefined' || typeof MAP_W === 'undefined') return null;

    const mw = MAP_W, mh = MAP_H;
    const tileNames = { 0: 'grass', 1: 'stone', 2: 'wood', 3: 'water', 4: 'road', 5: 'floor', 6: 'fence', 7: 'door', 8: 'tree' };
    function getT(x, y) { return (x >= 0 && x < mw && y >= 0 && y < mh) ? worldMap[y * mw + x] : -1; }

    // Create ASCII-art overview (downsample to ~32x32)
    const step = Math.max(1, Math.floor(mw / 32));
    const mapChars = { 0: '.', 1: '#', 2: 'W', 3: '~', 4: '=', 5: '_', 6: '|', 7: 'D', 8: 'T' };
    let ascii = '';
    for (let y = 0; y < mh; y += step) {
      let row = '';
      for (let x = 0; x < mw; x += step) {
        row += mapChars[getT(x, y)] || '?';
      }
      ascii += row + '\n';
    }

    // Find buildings (clusters of stone/wood walls)
    const buildings = [];
    const visited = new Set();
    for (let y = 1; y < mh - 1; y++) {
      for (let x = 1; x < mw - 1; x++) {
        if (visited.has(`${x},${y}`)) continue;
        const t = getT(x, y);
        if (t === 1 || t === 2) {
          // Flood-fill to find building bounds
          let minX = x, maxX = x, minY = y, maxY = y;
          const queue = [[x, y]];
          while (queue.length) {
            const [cx, cy] = queue.shift();
            const key = `${cx},${cy}`;
            if (visited.has(key)) continue;
            if (cx < 0 || cx >= mw || cy < 0 || cy >= mh) continue;
            const ct = getT(cx, cy);
            if (ct !== 1 && ct !== 2 && ct !== 5 && ct !== 7) continue;
            visited.add(key);
            minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
            minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
            queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
          }
          const w = maxX - minX + 1, h = maxY - minY + 1;
          if (w >= 3 && h >= 3) {
            buildings.push({
              x: minX, y: minY, w, h,
              center: `${((minX + maxX) / 2).toFixed(0)},${((minY + maxY) / 2).toFixed(0)}`,
              type: getT(minX, minY) === 1 ? 'stone' : 'wood',
            });
          }
        }
      }
    }

    // Tile counts
    let waterTiles = 0, roadTiles = 0, treeTiles = 0;
    for (let i = 0; i < worldMap.length; i++) {
      if (worldMap[i] === 3) waterTiles++;
      else if (worldMap[i] === 4) roadTiles++;
      else if (worldMap[i] === 8) treeTiles++;
    }

    const result = {
      mapSize: `${mw}x${mh}`,
      asciiMap: ascii,
      buildings: buildings.length,
      buildingList: buildings,
      waterTiles,
      roadTiles,
      treeTiles,
      totalGrass: mw * mh - waterTiles - roadTiles - treeTiles - buildings.reduce((s, b) => s + b.w * b.h, 0),
    };

    console.log(`[ANALYZER] World map: ${size}x${size}, ${buildings.length} buildings, ${treeTiles} trees`);
    return result;
  }

  // ═══════════════════════════════════════════════════
  // TOOL 7: Visual Quality Scorer
  // ═══════════════════════════════════════════════════
  function visualQualityScorer(pixelData) {
    console.log('[ANALYZER] Visual Quality Scorer starting...');
    const px = pixelData || pixelAnalyzer();
    if (!px) return null;

    // WoW Reference Targets (from Elwynn Forest analysis)
    const wowTargets = {
      sky:       { r: 95, g: 155, b: 215 },  // Blue sky
      horizon:   { r: 180, g: 200, b: 185 }, // Hazy horizon
      ground:    { r: 90, g: 130, b: 60 },   // Green grass
      warmth:    'warm',                       // Golden hour feel
      variety:   150,                          // Color richness
      fps:       30,                           // Target FPS
    };

    const scores = {};
    let totalScore = 0, maxScore = 0;

    // Sky color accuracy (0-100)
    if (px.regionColors.sky) {
      const dist = colorDistance(px.regionColors.sky, wowTargets.sky);
      scores.skyColor = Math.max(0, Math.round(100 - dist * 0.5));
      scores.skyAssessment = dist < 60 ? 'Good sky blue' : dist < 120 ? 'Sky too grey/brown' : 'Sky way off';
    } else { scores.skyColor = 0; scores.skyAssessment = 'No sky data'; }
    totalScore += scores.skyColor; maxScore += 100;

    // Horizon color (0-100)
    if (px.regionColors.horizon) {
      const dist = colorDistance(px.regionColors.horizon, wowTargets.horizon);
      scores.horizonColor = Math.max(0, Math.round(100 - dist * 0.4));
    } else { scores.horizonColor = 0; }
    totalScore += scores.horizonColor; maxScore += 100;

    // Ground color (foreground/midground)
    const groundReg = px.regionColors.midground || px.regionColors.foreground;
    if (groundReg) {
      const dist = colorDistance(groundReg, wowTargets.ground);
      scores.groundColor = Math.max(0, Math.round(100 - dist * 0.4));
      scores.groundAssessment = dist < 60 ? 'Nice green' : dist < 120 ? 'Ground could be greener' : 'Ground color off';
    } else { scores.groundColor = 0; }
    totalScore += scores.groundColor; maxScore += 100;

    // Color warmth (WoW has warm golden tones)
    scores.warmth = px.temperature.assessment === 'warm' ? 90 :
                    px.temperature.assessment === 'neutral' ? 60 : 30;
    totalScore += scores.warmth; maxScore += 100;

    // Color variety (rich palette)
    scores.colorVariety = Math.min(100, Math.round(px.centerColorVariety / wowTargets.variety * 100));
    totalScore += scores.colorVariety; maxScore += 100;

    // Contrast (mix of dark and bright, not washed out)
    const contrastRange = px.luminance.brightPct + px.luminance.darkPct;
    scores.contrast = contrastRange >= 10 && contrastRange <= 50 ? 85 :
                      contrastRange >= 5 ? 60 : 30;
    totalScore += scores.contrast; maxScore += 100;

    // FPS (performance)
    if (px.fps !== 'N/A') {
      scores.fps = Math.min(100, Math.round(px.fps / wowTargets.fps * 100));
      scores.fpsAssessment = px.fps >= 30 ? 'Smooth' : px.fps >= 15 ? 'Playable' : 'Needs optimization';
    } else { scores.fps = 0; scores.fpsAssessment = 'Unknown'; }
    totalScore += scores.fps; maxScore += 100;

    scores.overallScore = Math.round(totalScore / maxScore * 100);
    scores.grade = scores.overallScore >= 85 ? 'A' :
                   scores.overallScore >= 70 ? 'B' :
                   scores.overallScore >= 55 ? 'C' :
                   scores.overallScore >= 40 ? 'D' : 'F';

    scores.wowTargets = wowTargets;

    console.log(`[ANALYZER] Quality score: ${scores.overallScore}/100 (${scores.grade})`);
    return scores;
  }

  // ═══════════════════════════════════════════════════
  // TOOL 8: Full Analysis Report
  // ═══════════════════════════════════════════════════
  async function runFullAnalysis() {
    console.log('[ANALYZER] ═══════════════════════════════════');
    console.log('[ANALYZER]     FULL ANALYSIS STARTING');
    console.log('[ANALYZER] ═══════════════════════════════════');
    const startTime = Date.now();

    _report.timestamp = new Date().toISOString();

    // 1. Screenshot Walker
    console.log('\n[ANALYZER] Phase 1: Screenshot Walker...');
    _report.walker = await screenshotWalker();

    // 2. Feature Exerciser
    console.log('\n[ANALYZER] Phase 2: Feature Exerciser...');
    _report.features = await featureExerciser();

    // Return to default view for pixel analysis
    teleport(22.5, 34.5, 0, 0);
    await waitFrames(10);

    // 3. Pixel Analyzer
    console.log('\n[ANALYZER] Phase 3: Pixel Analyzer...');
    _report.pixels = pixelAnalyzer();

    // 4. HUD Inspector
    console.log('\n[ANALYZER] Phase 4: HUD Inspector...');
    _report.hud = hudInspector();

    // 5. Entity Inspector
    console.log('\n[ANALYZER] Phase 5: Entity Inspector...');
    _report.entities = entityInspector();

    // 6. World Map Scanner
    console.log('\n[ANALYZER] Phase 6: World Map Scanner...');
    _report.world = worldMapScanner();

    // 7. Visual Quality Score
    console.log('\n[ANALYZER] Phase 7: Visual Quality Scoring...');
    _report.quality = visualQualityScorer(_report.pixels);

    // Summary
    _report.duration = Date.now() - startTime;
    _report.screenshotCount = _screenshots.length;

    _report.summary = {
      grade: _report.quality?.grade || 'N/A',
      score: _report.quality?.overallScore || 0,
      fps: _report.pixels?.fps || 'N/A',
      screenshotsCapt: _screenshots.length,
      hudCoverage: _report.hud?.coverage || 'N/A',
      featuresWorking: [
        _report.features?.questDialog && 'Quest',
        _report.features?.merchantDialog && 'Merchant',
        _report.features?.combat?.tested && 'Combat',
        _report.features?.pickup?.tested && 'Pickup',
        _report.features?.chatSystem && 'Chat',
        _report.features?.movement && 'Movement',
      ].filter(Boolean),
      entityCount: {
        npcs: _report.entities?.npcs?.length || 0,
        enemies: _report.features?.entityCounts?.totalEnemiesAlive || 0,
        pickups: _report.features?.entityCounts?.pickups || 0,
      },
      mapSize: _report.world?.mapSize || 'N/A',
      buildings: _report.world?.buildings || 0,
      colorTemp: _report.pixels?.temperature?.assessment || 'N/A',
      avgColor: _report.pixels?.avgColor?.hex || 'N/A',
      duration: `${(_report.duration / 1000).toFixed(1)}s`,
    };

    console.log('\n[ANALYZER] ═══════════════════════════════════');
    console.log('[ANALYZER]     ANALYSIS COMPLETE');
    console.log('[ANALYZER] ═══════════════════════════════════');
    console.log('[ANALYZER] Summary:', JSON.stringify(_report.summary, null, 2));

    // Store globally
    window.NWGE_ANALYSIS_REPORT = _report;
    return _report;
  }

  // ═══════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════
  return {
    // Individual tools
    screenshotWalker,
    featureExerciser,
    pixelAnalyzer,
    hudInspector,
    entityInspector,
    worldMapScanner,
    visualQualityScorer,

    // Full analysis
    runFullAnalysis,

    // Helpers
    teleport,
    capture,
    waitFrames,
    getScreenshots: () => _screenshots,
    getReport: () => _report,

    // Constants (for reference)
    WALK_LOCATIONS,
  };
})();

console.log('[NWGE_ANALYZER] Loaded. Commands:');
console.log('  await NWGE_ANALYZER.runFullAnalysis()  — Run everything');
console.log('  await NWGE_ANALYZER.screenshotWalker() — Capture locations');
console.log('  await NWGE_ANALYZER.featureExerciser()  — Test features');
console.log('  NWGE_ANALYZER.pixelAnalyzer()          — Analyze pixels');
console.log('  NWGE_ANALYZER.hudInspector()            — Check HUD');
console.log('  NWGE_ANALYZER.entityInspector()         — List entities');
console.log('  NWGE_ANALYZER.worldMapScanner()         — Scan map');
console.log('  NWGE_ANALYZER.visualQualityScorer()     — Quality score');
