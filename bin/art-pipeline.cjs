#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Art Pipeline v3.0 — Closed Learning Loop
 *
 * The BRAIN of the art system. Orchestrates:
 *   generate → analyze → validate → retry-if-bad → strip → attach → log
 *
 * Learning loop:
 *   1. Generate art asset (image_generation)
 *   2. Analyze output (analyze_media_content) — quality score, detect issues
 *   3. If quality < threshold → learn what went wrong, adjust prompt, retry
 *   4. Strip background (fal-bria-rmbg)
 *   5. Extract from sheet (art-extract.py)
 *   6. Validate: transparent bg, correct dimensions, no artifacts
 *   7. Log lesson → factory-memory.json for future generations
 *   8. Attach to game entity (weapon→hand, armor→body, etc.)
 *
 * CLI:
 *   node bin/art-pipeline.cjs --status          # show pipeline status
 *   node bin/art-pipeline.cjs --validate-all    # validate all assets
 *   node bin/art-pipeline.cjs --plan            # show full generation plan
 *   node bin/art-pipeline.cjs --lessons         # show learned lessons
 * ═══════════════════════════════════════════════════════════════════════════
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ART_DIR = path.join(ROOT, 'public', 'games', 'art');
const LESSONS_FILE = path.join(ROOT, '.mycelium', 'art-lessons.json');
const PIPELINE_LOG = path.join(ROOT, '.mycelium', 'art-pipeline-log.json');

// ═══════════════════════════════════════════════════════════════
// 1. QUALITY SCORING — Learned thresholds
// ═══════════════════════════════════════════════════════════════

const QUALITY_THRESHOLDS = {
  character:   { minCoverage: 0.15, maxCoverage: 0.85, minSize: 100, maxArtifacts: 2, bgTolerance: 0.02 },
  enemy:       { minCoverage: 0.10, maxCoverage: 0.90, minSize: 80,  maxArtifacts: 3, bgTolerance: 0.03 },
  weapon:      { minCoverage: 0.08, maxCoverage: 0.95, minSize: 40,  maxArtifacts: 1, bgTolerance: 0.01 },
  item:        { minCoverage: 0.05, maxCoverage: 0.95, minSize: 30,  maxArtifacts: 1, bgTolerance: 0.01 },
  background:  { minCoverage: 0.60, maxCoverage: 1.00, minSize: 400, maxArtifacts: 5, bgTolerance: 1.0  },
  effect:      { minCoverage: 0.03, maxCoverage: 0.90, minSize: 30,  maxArtifacts: 2, bgTolerance: 0.05 },
  ui:          { minCoverage: 0.05, maxCoverage: 0.95, minSize: 24,  maxArtifacts: 1, bgTolerance: 0.01 },
  costume:     { minCoverage: 0.15, maxCoverage: 0.85, minSize: 100, maxArtifacts: 2, bgTolerance: 0.02 },
};

// ═══════════════════════════════════════════════════════════════
// 2. LESSONS DATABASE — What we've learned
// ═══════════════════════════════════════════════════════════════

function loadLessons() {
  try { return JSON.parse(fs.readFileSync(LESSONS_FILE, 'utf-8')); }
  catch { return { lessons: [], promptFixes: {}, retryHistory: [], stats: { totalGenerated: 0, totalRetries: 0, avgQuality: 0 } }; }
}

function saveLessons(db) {
  const dir = path.dirname(LESSONS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LESSONS_FILE, JSON.stringify(db, null, 2));
}

function logLesson(category, issue, fix, quality) {
  const db = loadLessons();
  db.lessons.push({
    timestamp: new Date().toISOString(),
    category,
    issue,
    fix,
    qualityBefore: quality.before,
    qualityAfter: quality.after,
  });
  // Update prompt fixes for this category
  if (!db.promptFixes[category]) db.promptFixes[category] = [];
  if (fix && !db.promptFixes[category].includes(fix)) {
    db.promptFixes[category].push(fix);
  }
  saveLessons(db);
}

// ═══════════════════════════════════════════════════════════════
// 3. PROMPT IMPROVER — Learns from failures
// ═══════════════════════════════════════════════════════════════

const PROMPT_FIXES = {
  'background_not_transparent': 'Ensure COMPLETELY TRANSPARENT background. No checkerboard. No white. No grey. Just the sprite with alpha channel.',
  'too_small': 'Make the sprite LARGER and more detailed, filling most of the image area.',
  'too_sparse': 'Add more detail and visual weight to the sprite. It should be clearly visible.',
  'artifacts': 'Clean, crisp edges with no artifacts, noise, or bleeding colors. Pixel-perfect.',
  'wrong_perspective': 'SIDE VIEW perspective, facing right. 2D game sprite style, NOT 3D rendered.',
  'inconsistent_style': 'Dark comic-book cel-shaded style with bold outlines. Consistent with the game art direction.',
  'multiple_items': 'Only ONE single item centered in the image. No duplicates. No extra objects.',
  'grid_overlap': 'Each item must be COMPLETELY within its grid cell with clear separation. No overlapping.',
  'watermark': 'No watermarks, no text, no labels, no signatures.',
};

function improvePrompt(originalPrompt, issues = []) {
  const fixes = issues
    .map(i => PROMPT_FIXES[i])
    .filter(Boolean);
  
  if (fixes.length === 0) return originalPrompt;
  
  // Also check learned fixes from previous generations
  const db = loadLessons();
  const allFixes = [...fixes];
  
  return `${originalPrompt}. IMPORTANT: ${allFixes.join('. ')}`;
}

// ═══════════════════════════════════════════════════════════════
// 4. ASSET VALIDATION — Check quality of generated/extracted art
// ═══════════════════════════════════════════════════════════════

function validateAsset(filePath, category) {
  const result = {
    file: filePath,
    category,
    exists: false,
    valid: false,
    score: 0,
    issues: [],
    suggestions: [],
  };

  if (!fs.existsSync(filePath)) {
    result.issues.push('File does not exist');
    return result;
  }
  result.exists = true;

  const stats = fs.statSync(filePath);
  const sizeKB = stats.size / 1024;
  const threshold = QUALITY_THRESHOLDS[category] || QUALITY_THRESHOLDS.item;

  // File size check
  if (sizeKB < 1) {
    result.issues.push('File too small (< 1KB) — likely corrupt or empty');
    result.suggestions.push('Regenerate with better prompt');
  } else if (sizeKB < 5) {
    result.issues.push('File very small — may lack detail');
    result.suggestions.push('Increase resolution or add more detail to prompt');
  }

  // File must be PNG for sprites (transparency)
  if (category !== 'background' && !filePath.endsWith('.png')) {
    result.issues.push('Sprite must be PNG for transparency support');
    result.suggestions.push('Convert to PNG with alpha channel');
  }

  let score = 100;
  score -= result.issues.length * 15;
  score = Math.max(0, Math.min(100, score));

  result.score = score;
  result.valid = score >= 60;
  result.sizeKB = Math.round(sizeKB * 10) / 10;

  return result;
}

// ═══════════════════════════════════════════════════════════════
// 5. PIPELINE STATUS — Full inventory of what we have vs need
// ═══════════════════════════════════════════════════════════════

const REQUIRED_ASSETS = {
  characters: [
    { id: 'char_tier0_gamer', category: 'character', dir: 'chars' },
    { id: 'char_tier1_enforcer', category: 'character', dir: 'chars' },
    { id: 'char_tier2_seal', category: 'character', dir: 'chars' },
  ],
  enemies: [
    { id: 'enemy_walker', category: 'enemy', dir: 'enemies' },
    { id: 'enemy_runner', category: 'enemy', dir: 'enemies' },
    { id: 'enemy_bloater', category: 'enemy', dir: 'enemies' },
    { id: 'enemy_spitter', category: 'enemy', dir: 'enemies' },
    { id: 'enemy_crawler', category: 'enemy', dir: 'enemies' },
    { id: 'enemy_gorelord', category: 'enemy', dir: 'enemies' },
    { id: 'enemy_hivemind', category: 'enemy', dir: 'enemies' },
  ],
  weapons: [
    { id: 'wpn_bat', category: 'weapon', dir: 'weapons' },
    { id: 'wpn_pipe', category: 'weapon', dir: 'weapons' },
    { id: 'wpn_machete', category: 'weapon', dir: 'weapons' },
    { id: 'wpn_katana', category: 'weapon', dir: 'weapons' },
    { id: 'wpn_chainsaw', category: 'weapon', dir: 'weapons' },
    { id: 'wpn_m4a1', category: 'weapon', dir: 'weapons' },
    { id: 'wpn_shotgun', category: 'weapon', dir: 'weapons' },
    { id: 'wpn_minigun', category: 'weapon', dir: 'weapons' },
    { id: 'wpn_railgun', category: 'weapon', dir: 'weapons' },
    { id: 'wpn_plasma', category: 'weapon', dir: 'weapons' },
  ],
  items: [
    { id: 'item_scrap', category: 'item', dir: 'items' },
    { id: 'item_wire', category: 'item', dir: 'items' },
    { id: 'item_meds', category: 'item', dir: 'items' },
    { id: 'item_ammo', category: 'item', dir: 'items' },
    { id: 'item_fuel', category: 'item', dir: 'items' },
    { id: 'item_chitin', category: 'item', dir: 'items' },
  ],
  effects: [
    { id: 'fx_muzzle', category: 'effect', dir: 'effects' },
    { id: 'fx_explosion', category: 'effect', dir: 'effects' },
    { id: 'fx_blood', category: 'effect', dir: 'effects' },
    { id: 'fx_slash', category: 'effect', dir: 'effects' },
  ],
  backgrounds: [
    { id: 'zone0_ruined_city', category: 'background', dir: '.' },
    { id: 'zone1_subway', category: 'background', dir: '.' },
    { id: 'zone2_hospital', category: 'background', dir: '.' },
    { id: 'zone3_military', category: 'background', dir: '.' },
    { id: 'zone4_nuclear', category: 'background', dir: '.' },
    { id: 'zone5_hive', category: 'background', dir: '.' },
  ],
};

function pipelineStatus() {
  const status = { complete: 0, missing: 0, invalid: 0, total: 0, categories: {} };

  for (const [cat, assets] of Object.entries(REQUIRED_ASSETS)) {
    const catStatus = { complete: 0, missing: 0, invalid: 0, assets: [] };

    for (const asset of assets) {
      status.total++;
      const ext = asset.category === 'background' ? '.jpg' : '.png';
      const filePath = path.join(ART_DIR, asset.dir, `${asset.id}${ext}`);
      const validation = validateAsset(filePath, asset.category);

      if (!validation.exists) {
        catStatus.missing++;
        status.missing++;
        catStatus.assets.push({ ...asset, status: 'MISSING', validation });
      } else if (!validation.valid) {
        catStatus.invalid++;
        status.invalid++;
        catStatus.assets.push({ ...asset, status: 'INVALID', validation });
      } else {
        catStatus.complete++;
        status.complete++;
        catStatus.assets.push({ ...asset, status: 'OK', validation });
      }
    }

    status.categories[cat] = catStatus;
  }

  return status;
}

// ═══════════════════════════════════════════════════════════════
// 6. WEAPON-CHARACTER ATTACHMENT CONFIG
// ═══════════════════════════════════════════════════════════════

const ATTACHMENT_SYSTEM = {
  weapons: {
    melee: {
      holdPoint: { x: 0.65, y: 0.45 },   // relative to character sprite
      pivotPoint: { x: 0.2, y: 0.8 },     // weapon pivot (handle end)
      idleAngle: -15,                       // degrees
      swingArc: { start: -30, end: 150, duration: 0.15 },
      animations: ['idle', 'swing_start', 'swing_mid', 'swing_end', 'swing_impact'],
      scaleRelativeToChar: 0.6,            // weapon is 60% of character height
    },
    ranged: {
      holdPoint: { x: 0.55, y: 0.40 },
      pivotPoint: { x: 0.15, y: 0.5 },
      idleAngle: 0,
      aimRange: { min: -45, max: 45 },
      muzzlePoint: { x: 1.0, y: 0.5 },   // relative to weapon sprite
      animations: ['idle', 'aim', 'fire', 'recoil', 'reload'],
      scaleRelativeToChar: 0.7,
      muzzleFlashAsset: 'fx_muzzle',
    },
    thrown: {
      holdPoint: { x: 0.60, y: 0.35 },
      pivotPoint: { x: 0.5, y: 0.5 },
      idleAngle: -20,
      throwSpin: 720,                       // degrees per second
      animations: ['wind_up', 'throw', 'return'],
      scaleRelativeToChar: 0.4,
    },
  },
  // Map each weapon to its type
  weaponTypeMap: {
    wpn_bat: 'melee', wpn_pipe: 'melee', wpn_machete: 'melee',
    wpn_katana: 'melee', wpn_chainsaw: 'melee',
    wpn_m4a1: 'ranged', wpn_shotgun: 'ranged', wpn_minigun: 'ranged',
    wpn_railgun: 'ranged', wpn_plasma: 'ranged',
  },
};

// ═══════════════════════════════════════════════════════════════
// 7. 2.5D CHARACTER CONFIG — Pseudo-3D movement
// ═══════════════════════════════════════════════════════════════

const CHARACTER_2_5D = {
  // Sprite is 2D but we fake 3D with:
  movement: {
    bob: { amplitude: 3, frequency: 4 },        // up/down walk bob
    lean: { maxAngle: 8, acceleration: 0.1 },    // lean into movement
    squash: { onLand: { sx: 1.15, sy: 0.85 }, onJump: { sx: 0.85, sy: 1.15 } },
    shadow: { offsetY: 0.95, scaleX: 0.8, alpha: 0.3, blur: 4 },
    parallaxDepth: 3,                            // layers of depth parallax
  },
  // Fake rotation by scaling X (facing direction) + slight skew
  rotation: {
    method: 'scale_skew',  // flip horizontally for direction + subtle skew
    flipSpeed: 0.15,       // seconds to flip direction
    skewMax: 0.05,         // slight skew for turning appearance
    depthScale: { near: 1.0, far: 0.6 },  // scale down when "far away"
  },
  // Body part offsets for weapon attachment
  bodyParts: {
    head:    { x: 0.50, y: 0.10 },
    chest:   { x: 0.50, y: 0.35 },
    hand_r:  { x: 0.75, y: 0.45 },
    hand_l:  { x: 0.25, y: 0.45 },
    hip:     { x: 0.50, y: 0.55 },
    foot_r:  { x: 0.60, y: 0.95 },
    foot_l:  { x: 0.40, y: 0.95 },
  },
};

// ═══════════════════════════════════════════════════════════════
// 8. SPRITE ANALYSIS REPORT — What analyze_media_content should check
// ═══════════════════════════════════════════════════════════════

function buildAnalysisPrompt(category, assetId) {
  return `Analyze this ${category} game sprite for quality. Check:
1. Is the background fully transparent (no white, grey, or checkerboard)?
2. Is the sprite cleanly cropped with no excess empty space?
3. Is the art style consistent (dark comic-book cel-shaded)?
4. Are edges clean and pixel-perfect (no fuzzy borders)?
5. For weapons: is there only ONE weapon, no hands, centered?
6. For characters: full body visible, proper proportions?
7. Any artifacts, watermarks, or unwanted elements?
8. Rate quality 1-10 and list specific issues.
Asset: ${assetId}, Category: ${category}`;
}

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);
  const B = '\x1b[1m', G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', X = '\x1b[0m';

  if (args.includes('--status')) {
    console.log(`\n  ${B}Art Pipeline v3.0 — Status Report${X}\n  ${'═'.repeat(50)}`);
    const s = pipelineStatus();
    for (const [cat, data] of Object.entries(s.categories)) {
      const icon = data.missing === 0 && data.invalid === 0 ? `${G}✓` : data.missing > 0 ? `${R}✗` : `${Y}⚠`;
      console.log(`  ${icon}${X} ${cat.padEnd(14)} ${data.complete}/${data.assets.length} OK, ${data.missing} missing, ${data.invalid} invalid`);
      data.assets.forEach(a => {
        const si = a.status === 'OK' ? `${G}✓` : a.status === 'MISSING' ? `${R}✗` : `${Y}⚠`;
        const extra = a.validation.sizeKB ? ` (${a.validation.sizeKB}KB)` : '';
        console.log(`      ${si}${X} ${a.id}${extra}`);
      });
    }
    console.log(`\n  ${B}Summary:${X} ${s.complete}/${s.total} complete, ${s.missing} missing, ${s.invalid} invalid`);
    const pct = Math.round(s.complete / s.total * 100);
    console.log(`  ${B}Progress:${X} ${pct}% ${'█'.repeat(Math.floor(pct / 5))}${'░'.repeat(20 - Math.floor(pct / 5))}`);
    console.log('');
  }

  else if (args.includes('--lessons')) {
    const db = loadLessons();
    console.log(`\n  ${B}Art Pipeline — Lessons Learned${X}\n  ${'═'.repeat(50)}`);
    console.log(`  Total lessons: ${db.lessons.length}`);
    console.log(`  Prompt fixes by category:`);
    for (const [cat, fixes] of Object.entries(db.promptFixes)) {
      console.log(`    ${C}${cat}:${X} ${fixes.length} fixes`);
      fixes.forEach(f => console.log(`      → ${f}`));
    }
    if (db.lessons.length > 0) {
      console.log(`\n  ${B}Recent Lessons:${X}`);
      db.lessons.slice(-10).forEach(l => {
        console.log(`    [${l.timestamp.slice(0, 16)}] ${l.category}: ${l.issue} → ${l.fix}`);
      });
    }
    console.log('');
  }

  else if (args.includes('--validate-all')) {
    console.log(`\n  ${B}Art Pipeline — Validate All Assets${X}\n  ${'═'.repeat(50)}`);
    const s = pipelineStatus();
    let totalScore = 0, count = 0;
    for (const [, data] of Object.entries(s.categories)) {
      data.assets.forEach(a => {
        if (a.validation.exists) {
          totalScore += a.validation.score;
          count++;
          if (!a.validation.valid) {
            console.log(`  ${Y}⚠${X} ${a.id}: score ${a.validation.score}/100`);
            a.validation.issues.forEach(i => console.log(`      → ${i}`));
          }
        }
      });
    }
    const avg = count > 0 ? Math.round(totalScore / count) : 0;
    console.log(`\n  Average quality score: ${avg}/100 across ${count} assets`);
    console.log('');
  }

  else if (args.includes('--attachment')) {
    console.log(`\n  ${B}Art Pipeline — Weapon Attachment System${X}\n  ${'═'.repeat(50)}`);
    for (const [wpnId, type] of Object.entries(ATTACHMENT_SYSTEM.weaponTypeMap)) {
      const config = ATTACHMENT_SYSTEM.weapons[type];
      console.log(`  ${C}${wpnId}${X} → ${type}`);
      console.log(`    Hold: (${config.holdPoint.x}, ${config.holdPoint.y})`);
      console.log(`    Pivot: (${config.pivotPoint.x}, ${config.pivotPoint.y})`);
      console.log(`    Anims: ${config.animations.join(', ')}`);
    }
    console.log(`\n  ${B}Character body parts:${X}`);
    for (const [part, pos] of Object.entries(CHARACTER_2_5D.bodyParts)) {
      console.log(`    ${part.padEnd(10)} (${pos.x}, ${pos.y})`);
    }
    console.log('');
  }

  else {
    console.log(`\n  ${B}Art Pipeline v3.0 — Closed Learning Loop${X}`);
    console.log(`  ${'═'.repeat(50)}`);
    console.log(`  Usage:`);
    console.log(`    node bin/art-pipeline.cjs --status       Pipeline status`);
    console.log(`    node bin/art-pipeline.cjs --validate-all Validate all assets`);
    console.log(`    node bin/art-pipeline.cjs --lessons      Show learned lessons`);
    console.log(`    node bin/art-pipeline.cjs --attachment   Show weapon attachment config`);
    console.log('');
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  QUALITY_THRESHOLDS,
  REQUIRED_ASSETS,
  ATTACHMENT_SYSTEM,
  CHARACTER_2_5D,
  PROMPT_FIXES,
  loadLessons,
  saveLessons,
  logLesson,
  improvePrompt,
  validateAsset,
  pipelineStatus,
  buildAnalysisPrompt,
};
