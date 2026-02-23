#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Art Forge v2.0 — Efficient Game Art Pipeline for the Factory
 *
 * KEY UPGRADE: Sheet-based batch generation.
 * Instead of generating 10 weapons as 10 separate API calls, we generate
 * ONE image containing all 10 weapons arranged in a grid, then extract
 * each individually via bounding-box crop + background removal.
 *
 * Pipeline:
 *   YAML spec → manifest builder → BATCH prompt builder
 *   → generate sheet images (fewer API calls) → rmbg each
 *   → pixel-crop (tight bounds) → resize → individual PNGs
 *   → atlas JSON → base64 embed map → single-file HTML ready
 *
 * Efficiency gains:
 *   - 10 weapons: 1 sheet gen + 1 rmbg = 2 calls (was 20)
 *   - 6 items: 1 sheet gen + 1 rmbg = 2 calls (was 12)
 *   - Characters/bosses still 1:1 (too complex to sheet)
 *
 * Usage:
 *   const forge = require('./art-forge.cjs');
 *   const manifest = forge.buildManifest(spec);
 *   const plan = forge.planGeneration(manifest, './art');
 *   console.log(forge.printReport(plan));
 *   // Execute plan with your image_generation tool...
 *
 * CLI:
 *   node bin/art-forge.cjs --plan specs/games/deadrift.yaml
 *   node bin/art-forge.cjs --report specs/games/deadrift.yaml
 *   node bin/art-forge.cjs --deadrift-plan
 * ═══════════════════════════════════════════════════════════════════════════
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────
// 1. ART CATEGORIES — Each asset type with generation + sheet rules
// ─────────────────────────────────────────────────────────────────────────

const ART_CATEGORIES = {
  character: {
    description: 'Playable character sprites — full body, side view',
    defaultStyle: 'side-view 2D game character sprite, full body, transparent background, no background',
    defaultRatio: '2:3',
    defaultModel: 'nano-banana-pro',
    cropRequired: true,
    sheetable: false,         // Too complex — generate individually
    sizes: { sm: 128, md: 256, lg: 512 },
    defaultSize: 'md',
  },
  enemy: {
    description: 'Enemy/zombie/monster sprites',
    defaultStyle: 'side-view 2D game enemy sprite, full body, transparent background, no background',
    defaultRatio: '2:3',
    defaultModel: 'nano-banana-pro',
    cropRequired: true,
    sheetable: false,         // Enemies vary too much for sheet packing
    sizes: { sm: 96, md: 192, lg: 384 },
    defaultSize: 'md',
  },
  weapon: {
    description: 'Weapon sprites — isolated item, no hand',
    defaultStyle: 'isolated 2D game weapon sprite, clean edges, transparent background, no background, top-down angled view, single item centered',
    defaultRatio: '1:1',
    defaultModel: 'nano-banana-pro',
    cropRequired: true,
    sheetable: true,          // ★ BATCH: many weapons on one sheet
    maxPerSheet: 6,           // Max items per sheet image
    sheetLayout: 'grid',      // grid arrangement
    sheetPromptPrefix: 'A clean grid of isolated 2D game weapon sprites, each weapon in its own cell, transparent background, no background, clean edges, game-ready assets. Weapons shown:',
    sizes: { sm: 64, md: 128, lg: 256 },
    defaultSize: 'sm',
  },
  item: {
    description: 'Pickup items, materials, consumables',
    defaultStyle: 'isolated 2D game item icon, clean edges, transparent background, no background, single item centered',
    defaultRatio: '1:1',
    defaultModel: 'nano-banana-pro',
    cropRequired: true,
    sheetable: true,          // ★ BATCH: many items on one sheet
    maxPerSheet: 6,
    sheetLayout: 'grid',
    sheetPromptPrefix: 'A clean grid of isolated 2D game item icons, each item in its own cell, transparent background, no background, clean edges, game-ready assets. Items shown:',
    sizes: { sm: 48, md: 96, lg: 192 },
    defaultSize: 'sm',
  },
  background: {
    description: 'Zone/level backgrounds — wide panoramic',
    defaultStyle: 'side-scrolling game background, wide panoramic view, no people, digital painting, high detail, game art',
    defaultRatio: '16:9',
    defaultModel: 'nano-banana-pro',
    cropRequired: false,
    sheetable: false,
    sizes: { sm: 768, md: 1376, lg: 1920 },
    defaultSize: 'md',
  },
  effect: {
    description: 'VFX sprites — explosions, muzzle flashes, impacts',
    defaultStyle: 'isolated 2D game VFX sprite, transparent background, no background, bright glow, single effect centered',
    defaultRatio: '1:1',
    defaultModel: 'nano-banana-pro',
    cropRequired: true,
    sheetable: true,          // ★ BATCH: effects on sheet
    maxPerSheet: 4,
    sheetLayout: 'grid',
    sheetPromptPrefix: 'A clean grid of isolated 2D game VFX sprites, each effect in its own cell, transparent background, no background, bright glow. Effects shown:',
    sizes: { sm: 64, md: 128, lg: 256 },
    defaultSize: 'sm',
  },
  ui: {
    description: 'UI elements — buttons, frames, icons',
    defaultStyle: 'clean 2D game UI element, flat design, transparent background, no background',
    defaultRatio: '1:1',
    defaultModel: 'nano-banana-pro',
    cropRequired: true,
    sheetable: true,
    maxPerSheet: 8,
    sheetLayout: 'grid',
    sheetPromptPrefix: 'A clean grid of 2D game UI icons, each in its own cell, transparent background, flat design. Icons shown:',
    sizes: { sm: 48, md: 96, lg: 192 },
    defaultSize: 'sm',
  },
  costume: {
    description: 'Alternate character skins/outfits',
    defaultStyle: 'side-view 2D game character costume variant, full body, transparent background, no background',
    defaultRatio: '2:3',
    defaultModel: 'nano-banana-pro',
    cropRequired: true,
    sheetable: false,         // Costumes are character variants — generate individually
    sizes: { sm: 128, md: 256, lg: 512 },
    defaultSize: 'md',
  },
};


// ─────────────────────────────────────────────────────────────────────────
// 2. PROMPT BUILDER — Individual + Sheet prompts
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build a detailed prompt from a single sprite entry.
 */
function buildPrompt(entry, gameStyle = '') {
  const cat = ART_CATEGORIES[entry.category];
  if (!cat) throw new Error(`Unknown art category: ${entry.category}`);

  const parts = [
    cat.defaultStyle,
    entry.description || '',
    entry.colorScheme ? `Color palette: ${entry.colorScheme}` : '',
    gameStyle ? `Art style: ${gameStyle}` : '',
    entry.extras || '',
    'high detail, clean sprite art, game-ready asset',
  ].filter(Boolean);

  return parts.join('. ') + '.';
}

/**
 * Build a SHEET prompt for batch generation.
 * Generates a prompt that produces multiple items in a grid layout.
 *
 * @param {ArtEntry[]} entries - Array of entries to batch
 * @param {string} gameStyle - Global art style
 * @returns {string} Sheet prompt
 */
function buildSheetPrompt(entries, gameStyle = '') {
  if (!entries.length) return '';
  const cat = ART_CATEGORIES[entries[0].category];
  if (!cat || !cat.sheetable) throw new Error(`Category ${entries[0].category} is not sheetable`);

  const cols = Math.min(entries.length, 3);
  const rows = Math.ceil(entries.length / cols);

  const itemDescriptions = entries.map((e, i) =>
    `${i + 1}. ${e.description || e.id}`
  ).join('; ');

  const parts = [
    cat.sheetPromptPrefix,
    itemDescriptions,
    `Arranged in a ${cols}x${rows} grid`,
    'Each item clearly separated with space between them',
    'Every item has equal size and consistent style',
    gameStyle ? `Art style: ${gameStyle}` : '',
    'high detail, clean sprite art, game-ready assets, white or transparent background',
  ].filter(Boolean);

  return parts.join('. ') + '.';
}


// ─────────────────────────────────────────────────────────────────────────
// 3. MANIFEST BUILDER — Reads spec art block
// ─────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ArtEntry
 * @property {string} id       - Unique asset ID
 * @property {string} category - One of ART_CATEGORIES keys
 * @property {string} prompt   - Full generation prompt
 * @property {string} ratio    - Aspect ratio
 * @property {string} model    - Image generation model
 * @property {boolean} crop    - Whether to remove background
 * @property {string} size     - Target size key (sm/md/lg)
 * @property {string} [file]   - Output filename
 */

/**
 * Build manifest from spec's `art:` block.
 */
function buildManifest(spec) {
  const artBlock = spec.art;
  if (!artBlock) return [];

  const globalStyle = artBlock.style || '';
  const manifest = [];

  const categoryMap = {
    characters: 'character',
    enemies: 'enemy',
    weapons: 'weapon',
    items: 'item',
    backgrounds: 'background',
    effects: 'effect',
    ui: 'ui',
    costumes: 'costume',
  };

  for (const [specKey, catKey] of Object.entries(categoryMap)) {
    const entries = artBlock[specKey];
    if (!entries || !Array.isArray(entries)) continue;

    const cat = ART_CATEGORIES[catKey];
    for (const entry of entries) {
      manifest.push({
        id: entry.id,
        category: catKey,
        prompt: buildPrompt({ ...entry, category: catKey }, globalStyle),
        ratio: entry.ratio || cat.defaultRatio,
        model: entry.model || cat.defaultModel,
        crop: entry.crop !== undefined ? entry.crop : cat.cropRequired,
        size: entry.size || cat.defaultSize,
        file: entry.file || `${entry.id}.png`,
        description: entry.description || '',
        colorScheme: entry.colorScheme || '',
      });
    }
  }

  return manifest;
}

/**
 * Create a manifest directly (no spec file needed).
 */
function createManifest(opts) {
  const globalStyle = opts.style || '';
  return (opts.entries || []).map(entry => {
    const cat = ART_CATEGORIES[entry.category];
    if (!cat) throw new Error(`Unknown category: ${entry.category}`);
    return {
      id: entry.id,
      category: entry.category,
      prompt: buildPrompt(entry, globalStyle),
      ratio: entry.ratio || cat.defaultRatio,
      model: entry.model || cat.defaultModel,
      crop: entry.crop !== undefined ? entry.crop : cat.cropRequired,
      size: entry.size || cat.defaultSize,
      file: entry.file || `${entry.id}.png`,
      description: entry.description || '',
      colorScheme: entry.colorScheme || '',
    };
  });
}


// ─────────────────────────────────────────────────────────────────────────
// 4. GENERATION PLAN — Efficient batch + individual strategy
// ─────────────────────────────────────────────────────────────────────────

/**
 * Group manifest entries by category for batch processing.
 */
function groupByCategory(manifest) {
  const groups = {};
  for (const entry of manifest) {
    if (!groups[entry.category]) groups[entry.category] = [];
    groups[entry.category].push(entry);
  }
  return groups;
}

/**
 * Split an array into chunks of max size.
 */
function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Generate an EFFICIENT execution plan.
 * Uses sheet-based batching for sheetable categories (weapons, items, effects, ui).
 * Individual generation for complex assets (characters, enemies, bosses, backgrounds).
 *
 * @param {ArtEntry[]} manifest
 * @param {string} outputDir
 * @param {object} [opts] - { gameStyle, forceIndividual }
 * @returns {object} Plan with steps, stats, efficiency metrics
 */
function planGeneration(manifest, outputDir = './art', opts = {}) {
  const gameStyle = opts.gameStyle || '';
  const forceIndividual = opts.forceIndividual || false;
  const groups = groupByCategory(manifest);

  const steps = [];
  const stats = {
    total: manifest.length,
    individual: 0,
    batched: 0,
    sheets: 0,
    cropSteps: 0,
    extractSteps: 0,
    totalApiCalls: 0,
    naiveApiCalls: manifest.length + manifest.filter(e => e.crop).length,
    categories: {},
  };

  for (const [category, entries] of Object.entries(groups)) {
    const cat = ART_CATEGORIES[category];
    stats.categories[category] = entries.length;

    if (cat.sheetable && !forceIndividual && entries.length > 1) {
      // ★ BATCH STRATEGY: Generate sheets, then extract
      const sheets = chunk(entries, cat.maxPerSheet || 6);
      stats.sheets += sheets.length;
      stats.batched += entries.length;

      sheets.forEach((sheetEntries, sheetIdx) => {
        const sheetId = `sheet_${category}_${sheetIdx}`;
        const cols = Math.min(sheetEntries.length, 3);
        const rows = Math.ceil(sheetEntries.length / cols);

        // Step A: Generate sheet image
        steps.push({
          type: 'generate_sheet',
          sheetId,
          category,
          entries: sheetEntries,
          cols,
          rows,
          tool: 'image_generation',
          params: {
            query: buildSheetPrompt(sheetEntries, gameStyle),
            model: cat.defaultModel,
            aspect_ratio: cols >= rows ? '16:9' : '1:1',
            image_urls: [],
            task_summary: `Generate ${category} sheet ${sheetIdx + 1}/${sheets.length} (${sheetEntries.length} items)`,
          },
          outputFile: path.join(outputDir, 'sheets', `${sheetId}.png`),
        });
        stats.totalApiCalls++;

        // Step B: Remove background from entire sheet
        if (cat.cropRequired) {
          steps.push({
            type: 'crop_sheet',
            sheetId,
            tool: 'image_generation',
            params: {
              query: `Remove background from this sprite sheet, keep only the ${category} sprites with clean transparent background`,
              model: 'fal-bria-rmbg',
              image_urls: ['{{SHEET_OUTPUT}}'],
              aspect_ratio: 'auto',
              task_summary: `Remove background: ${sheetId}`,
            },
            inputFile: path.join(outputDir, 'sheets', `${sheetId}.png`),
            outputFile: path.join(outputDir, 'sheets', `${sheetId}_cropped.png`),
          });
          stats.cropSteps++;
          stats.totalApiCalls++;
        }

        // Step C: Extract individual sprites from sheet
        sheetEntries.forEach((entry, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          steps.push({
            type: 'extract_from_sheet',
            sheetId,
            entry,
            gridPosition: { col, row, cols, rows },
            description: `Extract ${entry.id} from sheet at [${row},${col}]`,
            // This is a code operation, not an API call — done via canvas/sharp
            outputFile: path.join(outputDir, 'cropped', entry.file),
          });
          stats.extractSteps++;
        });
      });

    } else {
      // INDIVIDUAL STRATEGY: One API call per asset
      stats.individual += entries.length;

      for (const entry of entries) {
        // Step 1: Generate
        steps.push({
          type: 'generate',
          entry,
          tool: 'image_generation',
          params: {
            query: entry.prompt,
            model: entry.model,
            aspect_ratio: entry.ratio,
            image_urls: [],
            task_summary: `Generate ${entry.category}: ${entry.id}`,
          },
          outputFile: path.join(outputDir, 'raw', entry.file),
        });
        stats.totalApiCalls++;

        // Step 2: Remove background
        if (entry.crop) {
          steps.push({
            type: 'crop',
            entry,
            tool: 'image_generation',
            params: {
              query: `Remove background from this sprite, keep only the ${entry.category} with pixel-perfect edges, transparent background`,
              model: 'fal-bria-rmbg',
              image_urls: ['{{PREV_OUTPUT}}'],
              aspect_ratio: 'auto',
              task_summary: `Remove background: ${entry.id}`,
            },
            inputFile: path.join(outputDir, 'raw', entry.file),
            outputFile: path.join(outputDir, 'cropped', entry.file),
          });
          stats.cropSteps++;
          stats.totalApiCalls++;
        }
      }
    }
  }

  stats.efficiency = stats.naiveApiCalls > 0
    ? Math.round((1 - stats.totalApiCalls / stats.naiveApiCalls) * 100)
    : 0;

  return { steps, stats, outputDir, manifest, gameStyle };
}


// ─────────────────────────────────────────────────────────────────────────
// 5. ATLAS PACKER — Sprite sheet layout spec
// ─────────────────────────────────────────────────────────────────────────

/**
 * Generate atlas packing plan from manifest.
 */
function planAtlases(manifest) {
  const groups = {};
  for (const entry of manifest) {
    if (!groups[entry.category]) groups[entry.category] = [];
    groups[entry.category].push(entry);
  }

  const atlases = [];
  for (const [category, entries] of Object.entries(groups)) {
    if (category === 'background') continue;
    const cat = ART_CATEGORIES[category];
    const size = cat.sizes[entries[0]?.size || cat.defaultSize] || 128;
    const cols = Math.ceil(Math.sqrt(entries.length));
    const rows = Math.ceil(entries.length / cols);
    const isCharType = category === 'character' || category === 'enemy' || category === 'costume';

    atlases.push({
      category,
      file: `atlas_${category}.png`,
      entries: entries.map((e, i) => ({
        id: e.id,
        file: e.file,
        col: i % cols,
        row: Math.floor(i / cols),
      })),
      spriteWidth: size,
      spriteHeight: isCharType ? Math.floor(size * 1.5) : size,
      cols,
      rows,
      totalWidth: cols * size,
      totalHeight: rows * (isCharType ? Math.floor(size * 1.5) : size),
    });
  }

  return atlases;
}


// ─────────────────────────────────────────────────────────────────────────
// 6. EMBED MAP — Base64 data URI generation
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create map of asset IDs → base64 data URIs for HTML embedding.
 */
function buildEmbedMap(artDir, manifest) {
  const map = {};
  for (const entry of manifest) {
    const filePath = entry.crop
      ? path.join(artDir, 'cropped', entry.file)
      : path.join(artDir, 'raw', entry.file);

    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(entry.file).toLowerCase().replace('.', '');
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
      map[entry.id] = {
        dataUri: `data:${mime};base64,${data.toString('base64')}`,
        category: entry.category,
        file: entry.file,
        sizeBytes: data.length,
        sizeKB: Math.round(data.length / 1024),
      };
    }
  }
  return map;
}

/**
 * Generate JS embed loader code for single-file HTML games.
 */
function generateEmbedLoader(embedMap) {
  const lines = ['/* Art Forge v2.0 — Embedded Assets */'];
  lines.push('const ART={},ART_READY={};');
  lines.push(`const ART_TOTAL=${Object.keys(embedMap).length};`);
  lines.push('let artLoaded=0;');

  for (const [id, info] of Object.entries(embedMap)) {
    lines.push(`(function(){const i=new Image();i.onload=function(){ART['${id}']=i;ART_READY['${id}']=true;artLoaded++};i.src='${info.dataUri}';})();`);
  }

  return lines.join('\n');
}


// ─────────────────────────────────────────────────────────────────────────
// 7. EXTRACT INSTRUCTIONS — How to crop individual items from sheets
// ─────────────────────────────────────────────────────────────────────────

/**
 * Generate extraction instructions for a sheet step.
 * These instructions tell the runtime (or human/AI) how to crop.
 *
 * @param {object} step - An 'extract_from_sheet' step from the plan
 * @param {number} sheetWidth - Actual sheet image width in pixels
 * @param {number} sheetHeight - Actual sheet image height in pixels
 * @returns {object} Crop coordinates { x, y, width, height }
 */
function getExtractionBounds(step, sheetWidth, sheetHeight) {
  const { col, row, cols, rows } = step.gridPosition;
  const cellWidth = Math.floor(sheetWidth / cols);
  const cellHeight = Math.floor(sheetHeight / rows);

  // Add small padding inward to avoid grid lines/borders
  const pad = Math.floor(Math.min(cellWidth, cellHeight) * 0.05);

  return {
    x: col * cellWidth + pad,
    y: row * cellHeight + pad,
    width: cellWidth - pad * 2,
    height: cellHeight - pad * 2,
    cellCol: col,
    cellRow: row,
  };
}

/**
 * Generate Canvas-based extraction code that can run in Node.js or browser.
 * Returns a JS function string that extracts all items from a sheet.
 */
function generateExtractionCode(plan) {
  const extractSteps = plan.steps.filter(s => s.type === 'extract_from_sheet');
  if (!extractSteps.length) return '/* No sheet extractions needed */';

  const code = [];
  code.push('/**');
  code.push(' * Auto-generated sheet extraction code — Art Forge v2.0');
  code.push(' * Extracts individual sprites from generated sheet images.');
  code.push(' */');
  code.push('async function extractSpritesFromSheet(sheetImg, entries, cols, rows) {');
  code.push('  const canvas = document.createElement("canvas");');
  code.push('  const ctx = canvas.getContext("2d");');
  code.push('  const cellW = Math.floor(sheetImg.width / cols);');
  code.push('  const cellH = Math.floor(sheetImg.height / rows);');
  code.push('  const pad = Math.floor(Math.min(cellW, cellH) * 0.05);');
  code.push('  const results = {};');
  code.push('  for (let i = 0; i < entries.length; i++) {');
  code.push('    const col = i % cols;');
  code.push('    const row = Math.floor(i / cols);');
  code.push('    canvas.width = cellW - pad * 2;');
  code.push('    canvas.height = cellH - pad * 2;');
  code.push('    ctx.clearRect(0, 0, canvas.width, canvas.height);');
  code.push('    ctx.drawImage(sheetImg, col * cellW + pad, row * cellH + pad, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);');
  code.push('    // Tight crop — find non-transparent bounds');
  code.push('    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);');
  code.push('    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;');
  code.push('    for (let y = 0; y < canvas.height; y++) {');
  code.push('      for (let x = 0; x < canvas.width; x++) {');
  code.push('        if (imgData.data[(y * canvas.width + x) * 4 + 3] > 10) {');
  code.push('          minX = Math.min(minX, x); minY = Math.min(minY, y);');
  code.push('          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);');
  code.push('        }');
  code.push('      }');
  code.push('    }');
  code.push('    if (maxX > minX && maxY > minY) {');
  code.push('      const cropW = maxX - minX + 1;');
  code.push('      const cropH = maxY - minY + 1;');
  code.push('      const out = document.createElement("canvas");');
  code.push('      out.width = cropW; out.height = cropH;');
  code.push('      out.getContext("2d").drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);');
  code.push('      const img = new Image();');
  code.push('      img.src = out.toDataURL("image/png");');
  code.push('      results[entries[i].id] = img;');
  code.push('    }');
  code.push('  }');
  code.push('  return results;');
  code.push('}');

  return code.join('\n');
}


// ─────────────────────────────────────────────────────────────────────────
// 8. WEAPON BINDING SPEC — How weapons attach to characters
// ─────────────────────────────────────────────────────────────────────────

const WEAPON_BINDING = {
  description: 'How weapon sprites bind to character sprites for rendering',
  types: {
    melee: {
      holdPoint: { x: 0.65, y: 0.45 },  // relative to character width/height
      swingArc: 120,            // degrees
      swingSpeed: 0.3,          // seconds per swing
      damageFrame: 0.5,         // when in the swing the damage applies (0-1)
      reachMultiplier: 1.0,     // sprite width * this = hitbox reach
      animations: ['idle_hold', 'swing_start', 'swing_mid', 'swing_end', 'swing_impact'],
    },
    ranged: {
      holdPoint: { x: 0.55, y: 0.4 },
      aimRange: 180,            // degrees of aim
      recoilPx: 4,             // kickback on fire
      muzzleOffset: { x: 1.0, y: 0.0 },  // relative to weapon tip
      fireRate: 'weapon_specific',
      animations: ['idle_hold', 'aim', 'fire', 'recoil', 'reload'],
      projectile: {
        speed: 800,            // px/s base
        gravity: false,        // for bullets; true for grenades
        trailLength: 3,
      },
    },
    thrown: {
      holdPoint: { x: 0.6, y: 0.35 },
      throwArc: true,
      spinRate: 720,           // degrees/s while in flight
      animations: ['wind_up', 'throw', 'return'],
    },
  },

  // Weapon classification — maps weapon IDs to types
  classify(weaponId) {
    const meleeIds = ['bat', 'pipe', 'machete', 'katana', 'chainsaw', 'axe', 'sword', 'hammer'];
    const rangedIds = ['m4a1', 'shotgun', 'minigun', 'railgun', 'plasma', 'pistol', 'smg', 'sniper', 'rpg'];
    const thrownIds = ['grenade', 'molotov', 'shuriken', 'knife_throw'];

    const lower = weaponId.toLowerCase();
    if (meleeIds.some(m => lower.includes(m))) return 'melee';
    if (rangedIds.some(r => lower.includes(r))) return 'ranged';
    if (thrownIds.some(t => lower.includes(t))) return 'thrown';
    return 'melee'; // default
  },

  /**
   * Generate weapon binding code for a specific weapon.
   */
  getBindingConfig(weaponId) {
    const type = this.classify(weaponId);
    return {
      type,
      ...this.types[type],
      weaponId,
    };
  },
};


// ─────────────────────────────────────────────────────────────────────────
// 9. DEADRIFT-SPECIFIC MANIFEST — Full DEADRIFT art needs
// ─────────────────────────────────────────────────────────────────────────

const DEADRIFT_MANIFEST_SPEC = {
  style: 'dark comic-book cel-shaded style with vibrant colors and thick outlines, 2D side-scroller game art',
  characters: [
    { id: 'char_tier0_gamer', description: 'Overweight gamer male, stained hoodie, sweatpants, gaming headset, bag of chips, energy drink in pocket. Comedic, slouching posture', size: 'lg' },
    { id: 'char_tier1_enforcer', description: 'Muscular fit male, buzz cut, grey t-shirt under olive tactical vest, cargo pants, combat boots, holding nothing (hands ready). Stern expression', size: 'lg' },
    { id: 'char_tier2_seal', description: 'Elite Navy SEAL operator, full tactical gear, helmet with NVG, plate carrier with MOLLE pouches, camo pants, knee pads, combat boots. Weapon slung on back', size: 'lg' },
  ],
  enemies: [
    { id: 'zombie_walker', description: 'Slow shambling zombie, torn dirty clothes, green-grey rotting skin, missing jaw, exposed ribs, glowing red eyes', size: 'md' },
    { id: 'zombie_runner', description: 'Fast lean zombie, ripped clothes, long arms, mouth wide open screaming, sprinting pose, red glowing eyes', size: 'md' },
    { id: 'zombie_bloater', description: 'Huge fat bloated zombie, distended stomach about to burst, pustules, yellow-green skin, dripping toxic slime', size: 'lg' },
    { id: 'zombie_spitter', description: 'Hunched zombie with elongated neck, cheeks bulging with acid, toxic green drool, one arm mutated into tentacle', size: 'md' },
    { id: 'zombie_crawler', description: 'Half-zombie crawling on ground, no legs, dragging entrails, fast with arms, reaching forward', size: 'md' },
    { id: 'boss_gorelord', description: 'Massive gore demon, towering muscular frame, exposed muscles and bone, crown of bone spikes, glowing red chest cavity, two giant clawed arms', size: 'lg' },
    { id: 'boss_hivemind', description: 'Alien hivemind creature, multiple heads fused together, tentacles, bioluminescent orange pustules, floating slightly, ethereal horror', size: 'lg' },
  ],
  weapons: [
    { id: 'wpn_bat', description: 'Wooden baseball bat, worn grip tape, blood splatter, slightly cracked' },
    { id: 'wpn_pipe', description: 'Rusty metal pipe, bent slightly, wrapped with tape at grip end' },
    { id: 'wpn_machete', description: 'Military machete, dark blade with nicks, wrapped handle, blood on edge' },
    { id: 'wpn_katana', description: 'Japanese katana, gleaming steel blade, red and black wrapped handle, slight glow' },
    { id: 'wpn_chainsaw', description: 'Gas-powered chainsaw, orange and black, running with sparks, aggressive', size: 'md' },
    { id: 'wpn_m4a1', description: 'M4A1 assault rifle, black with red dot sight, military spec, side view', size: 'md' },
    { id: 'wpn_shotgun', description: 'Tactical pump shotgun, dark grey, short barrel, pistol grip', size: 'md' },
    { id: 'wpn_minigun', description: 'Handheld minigun, multiple rotating barrels, ammo belt, heavy military', size: 'md' },
    { id: 'wpn_railgun', description: 'Futuristic railgun, glowing blue energy coils, sleek sci-fi design', size: 'md' },
    { id: 'wpn_plasma', description: 'Plasma cannon, green glowing core, alien-tech design, energy crackling', size: 'md' },
  ],
  items: [
    { id: 'mat_scrap', description: 'Pile of metal scrap pieces, rusty bolts and gears' },
    { id: 'mat_wire', description: 'Bundle of copper electrical wire, stripped ends sparking' },
    { id: 'mat_meds', description: 'Medical supplies, bandages, pills, red cross symbol' },
    { id: 'mat_ammo', description: 'Box of ammunition, brass bullet casings visible, military markings' },
    { id: 'mat_fuel', description: 'Yellow fuel canister, radiation warning symbol, glowing slightly' },
    { id: 'mat_chitin', description: 'Alien chitin plate, dark glossy surface, organic curves, iridescent' },
  ],
  effects: [
    { id: 'fx_muzzle_flash', description: 'Bright yellow-white muzzle flash, star burst shape, hot sparks' },
    { id: 'fx_blood_splat', description: 'Dark red blood splatter, spray pattern, droplets' },
    { id: 'fx_explosion', description: 'Fiery explosion, orange and red flames, smoke, debris', size: 'md' },
    { id: 'fx_shield', description: 'Blue translucent energy shield bubble, hexagonal pattern, glowing edges', size: 'md' },
  ],
  backgrounds: [
    { id: 'zone0_ruined_city', description: 'Destroyed cityscape at night, broken skyscrapers with glowing purple/red windows, rubble, abandoned cars, distant fires, thick dark atmosphere', colorScheme: 'dark reds, deep purples, fire orange' },
    { id: 'zone1_subway', description: 'Dark underground subway tunnel, abandoned metro station, flickering teal emergency lights, puddles on tracks reflecting light, cracked pillars, graffiti, eerie fog', colorScheme: 'dark teal, cyan, black' },
    { id: 'zone2_hospital', description: 'Abandoned hospital corridor, flickering fluorescent lights, overturned gurneys, biohazard signs, blood smears, eerie purple lighting, broken windows', colorScheme: 'dark purple, sterile white, blood red' },
    { id: 'zone3_military', description: 'Military compound at night, fortified bunkers, sandbag walls, watchtowers, military vehicles, ammunition crates, yellow floodlights cutting through haze', colorScheme: 'olive green, dark khaki, yellow floodlight' },
    { id: 'zone4_nuclear', description: 'Nuclear power plant meltdown, cracked cooling towers leaking radioactive green glow, toxic waste barrels, radiation signs, dead vegetation, ominous clouds', colorScheme: 'toxic yellow-green, dark grey, nuclear glow' },
    { id: 'zone5_hive', description: 'Organic alien hive interior, fleshy red walls, pulsating veins, bone-like columns, blood pools, bioluminescent growths, horrific living architecture', colorScheme: 'deep crimson, blood red, bioluminescent orange' },
  ],
};


// ─────────────────────────────────────────────────────────────────────────
// 10. REPORT GENERATOR — Human-readable plan summary
// ─────────────────────────────────────────────────────────────────────────

function printReport(plan) {
  const { stats, steps, manifest } = plan;
  const lines = [];
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('  ART FORGE v2.0 — Generation Plan');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(`  Total assets:        ${stats.total}`);
  lines.push(`  Individual gen:      ${stats.individual} assets (1 API call each)`);
  lines.push(`  Batched (sheets):    ${stats.batched} assets across ${stats.sheets} sheets`);
  lines.push(`  Bg removal steps:    ${stats.cropSteps}`);
  lines.push(`  Sheet extractions:   ${stats.extractSteps} (code-only, no API)`);
  lines.push('');
  lines.push(`  ★ API calls needed:  ${stats.totalApiCalls}`);
  lines.push(`  ★ Naive (no batch):  ${stats.naiveApiCalls}`);
  lines.push(`  ★ Efficiency gain:   ${stats.efficiency}% fewer API calls`);
  lines.push('');
  lines.push('  By category:');
  for (const [cat, count] of Object.entries(stats.categories)) {
    const catDef = ART_CATEGORIES[cat];
    const mode = catDef?.sheetable ? '(sheet)' : '(individual)';
    lines.push(`    ${cat.padEnd(12)} ${String(count).padStart(3)} asset${count > 1 ? 's' : ' '} ${mode}`);
  }
  lines.push('');

  // Show step-by-step execution order
  lines.push('  Execution order:');
  let stepIdx = 0;
  for (const step of steps) {
    stepIdx++;
    if (step.type === 'generate') {
      lines.push(`    ${String(stepIdx).padStart(3)}. [gen] ${step.entry.category}/${step.entry.id}`);
    } else if (step.type === 'generate_sheet') {
      const ids = step.entries.map(e => e.id).join(', ');
      lines.push(`    ${String(stepIdx).padStart(3)}. [SHEET] ${step.category} x${step.entries.length} → ${ids}`);
    } else if (step.type === 'crop' || step.type === 'crop_sheet') {
      const target = step.entry?.id || step.sheetId;
      lines.push(`    ${String(stepIdx).padStart(3)}. [rmbg] ${target}`);
    } else if (step.type === 'extract_from_sheet') {
      lines.push(`    ${String(stepIdx).padStart(3)}. [extract] ${step.entry.id} from ${step.sheetId} @ [${step.gridPosition.row},${step.gridPosition.col}]`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  return lines.join('\n');
}


// ─────────────────────────────────────────────────────────────────────────
// 11. CLI INTERFACE
// ─────────────────────────────────────────────────────────────────────────

function cli() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === '--help') {
    console.log(`
Art Forge v2.0 — Efficient Game Art Pipeline

Usage:
  node bin/art-forge.cjs --plan <spec.yaml>       Plan generation from spec
  node bin/art-forge.cjs --report <spec.yaml>      Full report from spec
  node bin/art-forge.cjs --deadrift-plan            DEADRIFT built-in plan
  node bin/art-forge.cjs --deadrift-report          DEADRIFT built-in report
  node bin/art-forge.cjs --categories               Show art categories
  node bin/art-forge.cjs --weapon-bindings          Show weapon binding spec
  node bin/art-forge.cjs --help                     This help message
`);
    return;
  }

  if (cmd === '--categories') {
    console.log('\nArt Categories:');
    for (const [key, cat] of Object.entries(ART_CATEGORIES)) {
      console.log(`  ${key.padEnd(12)} ${cat.sheetable ? '[SHEET]' : '[INDIV]'} ${cat.description}`);
      console.log(`               Sizes: sm=${cat.sizes.sm} md=${cat.sizes.md} lg=${cat.sizes.lg} | Ratio: ${cat.defaultRatio} | Crop: ${cat.cropRequired}`);
    }
    return;
  }

  if (cmd === '--weapon-bindings') {
    console.log('\nWeapon Binding Types:');
    for (const [type, config] of Object.entries(WEAPON_BINDING.types)) {
      console.log(`  ${type.toUpperCase()}`);
      console.log(`    Hold point: (${config.holdPoint.x}, ${config.holdPoint.y})`);
      console.log(`    Animations: ${config.animations.join(', ')}`);
    }
    console.log('\nExamples:');
    ['wpn_bat', 'wpn_m4a1', 'wpn_katana', 'wpn_shotgun', 'wpn_chainsaw'].forEach(id => {
      console.log(`  ${id.padEnd(16)} → ${WEAPON_BINDING.classify(id)}`);
    });
    return;
  }

  if (cmd === '--deadrift-plan' || cmd === '--deadrift-report') {
    const manifest = createManifest({ style: DEADRIFT_MANIFEST_SPEC.style, entries: flattenManifestSpec(DEADRIFT_MANIFEST_SPEC) });
    const plan = planGeneration(manifest, './public/games/art');
    console.log(printReport(plan));

    if (cmd === '--deadrift-report') {
      console.log('\n--- Weapon Bindings ---');
      manifest.filter(e => e.category === 'weapon').forEach(w => {
        const binding = WEAPON_BINDING.getBindingConfig(w.id);
        console.log(`  ${w.id.padEnd(16)} → ${binding.type} (swing: ${binding.swingArc || 'N/A'}°, hold: [${binding.holdPoint.x},${binding.holdPoint.y}])`);
      });
      console.log('\n--- Atlas Plan ---');
      const atlases = planAtlases(manifest);
      atlases.forEach(a => {
        console.log(`  ${a.file.padEnd(24)} ${a.cols}x${a.rows} grid, ${a.spriteWidth}x${a.spriteHeight}px per sprite, ${a.entries.length} entries`);
      });
    }
    return;
  }

  // Load spec from YAML
  const specPath = args[1] || args[0];
  if (specPath && !specPath.startsWith('--')) {
    try {
      const yaml = require('js-yaml');
      const specFile = path.resolve(process.cwd(), specPath);
      const spec = yaml.load(fs.readFileSync(specFile, 'utf-8'));
      const manifest = buildManifest(spec);
      const plan = planGeneration(manifest, spec.art?.outputDir || './art');
      console.log(printReport(plan));
    } catch (e) {
      console.error(`Error: ${e.message}`);
      process.exit(1);
    }
    return;
  }

  console.log('Unknown command. Run --help for usage.');
}

/**
 * Flatten the DEADRIFT_MANIFEST_SPEC (multi-category) into a flat entries array
 */
function flattenManifestSpec(spec) {
  const categoryMap = {
    characters: 'character',
    enemies: 'enemy',
    weapons: 'weapon',
    items: 'item',
    backgrounds: 'background',
    effects: 'effect',
    ui: 'ui',
    costumes: 'costume',
  };
  const entries = [];
  for (const [specKey, catKey] of Object.entries(categoryMap)) {
    if (spec[specKey]) {
      for (const entry of spec[specKey]) {
        entries.push({ ...entry, category: catKey });
      }
    }
  }
  return entries;
}


// ─────────────────────────────────────────────────────────────────────────
// 12. EXPORTS
// ─────────────────────────────────────────────────────────────────────────

module.exports = {
  // Categories & config
  ART_CATEGORIES,
  WEAPON_BINDING,

  // Prompt building
  buildPrompt,
  buildSheetPrompt,

  // Manifest
  buildManifest,
  createManifest,
  flattenManifestSpec,

  // Planning
  planGeneration,
  planAtlases,
  groupByCategory,

  // Extraction
  getExtractionBounds,
  generateExtractionCode,

  // Embedding
  buildEmbedMap,
  generateEmbedLoader,

  // Report
  printReport,

  // Pre-built manifests
  manifests: {
    deadrift: DEADRIFT_MANIFEST_SPEC,
  },
};

// CLI entry
if (require.main === module) {
  cli();
}
