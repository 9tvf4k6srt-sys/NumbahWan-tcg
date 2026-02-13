#!/usr/bin/env node
/**
 * Area Config Generator v1.0
 * ═══════════════════════════════════════════════════════════════════
 * Auto-seeds .mycelium/config.json areas from actual codebase structure.
 * Makes every downstream tool (watch, mine, enrich, guard) categorize
 * code into correct project domains instead of guessing "other".
 *
 * USAGE:
 *   node tools/area-config-gen.cjs              # Generate + write config
 *   node tools/area-config-gen.cjs --dry-run    # Show what would be written
 *   node tools/area-config-gen.cjs --json       # Output JSON only
 *
 * @version 1.0.0
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(ROOT, '.mycelium', 'config.json');
const PUBLIC = path.join(ROOT, 'public');
const STATIC = path.join(PUBLIC, 'static');

// ═══════════════════════════════════════════════════════════════════
// DOMAIN DEFINITIONS — the project's actual feature areas
// ═══════════════════════════════════════════════════════════════════
// Each area has seed keywords. The generator expands by scanning the
// filesystem for files matching those keywords, then adds JS/CSS
// dependencies discovered in the HTML.

const AREA_SEEDS = {
  battle: {
    keywords: ['battle', 'pvp', 'combat', 'deck', 'autoplay', 'coach'],
    pages: ['battle.html', 'battle-legacy.html', 'battle-old.html', 'battle-simple.html', 'pvp.html', 'pvp-battle.html', 'deckbuilder.html'],
  },
  cards: {
    keywords: ['card', 'collection', 'forge', 'fusion', 'card-lab', 'card-bridge', 'card-print', 'card-audit', 'card-utility'],
    pages: ['cards.html', 'card-lab.html', 'card-bridge.html', 'card-print-template.html', 'card-audit.html', 'card-utility.html', 'collection.html', 'collection-stats.html', 'forge.html', 'fusion.html'],
  },
  guild: {
    keywords: ['guild', 'siege', 'guild-siege', 'citizenship', 'court', 'embassy'],
    pages: ['guild-siege.html', 'citizenship.html', 'court.html', 'embassy.html'],
  },
  market: {
    keywords: ['market', 'economy', 'trade', 'exchange', 'auction', 'shop', 'buy', 'coin', 'currency', 'invest', 'wallet', 'merch', 'nwg-shop'],
    pages: ['market.html', 'markets.html', 'exchange.html', 'auction-house.html', 'coin-shop.html', 'coin-test.html', 'buy.html', 'invest.html', 'wallet.html', 'merch.html', 'nwg-shop.html'],
  },
  lore: {
    keywords: ['lore', 'museum', 'exhibit', 'oracle', 'regina', 'story', 'conspiracy', 'sacred', 'whale', 'historical'],
    pages: ['lore.html', 'oracle.html', 'conspiracy.html', 'historical-society.html', 'lore/afk-incident.html', 'lore/conspiracy-board.html', 'lore/reggina-origin.html', 'lore/sacred-log.html', 'lore/whale-wars.html'],
    dirs: ['museum/'],
  },
  identity: {
    keywords: ['avatar', 'profile', 'identity', 'fashion', 'apply', 'hr', 'jobs', 'citizenship'],
    pages: ['avatar-builder.html', 'avatar-studio.html', 'profile-card.html', 'fashion.html', 'apply.html', 'hr.html', 'jobs.html'],
  },
  social: {
    keywords: ['breakroom', 'cafeteria', 'confessional', 'memes', 'fortune', 'arcade', 'lost-found', 'parking', 'basement'],
    pages: ['breakroom.html', 'cafeteria.html', 'confessional.html', 'memes.html', 'fortune.html', 'arcade.html', 'lost-found.html', 'parking.html', 'basement.html'],
  },
  ai: {
    keywords: ['ai-', 'agent', 'pcp', 'intelligence', 'cipher', 'deepdive'],
    pages: ['agent.html', 'ai-assets.html', 'ai-lounge.html', 'intelligence.html', 'cipher.html'],
  },
  business: {
    keywords: ['business', 'my-business', 'realestate', 'warehouse', 'supply'],
    pages: ['business.html', 'my-business.html', 'realestate.html', 'warehouse.html', 'supply.html'],
  },
  infra: {
    keywords: ['sentinel', 'mycelium', 'guardian', 'dashboard', 'maintenance', 'tools', 'showcase', 'what-is', 'about', 'guide', 'academy'],
    pages: ['dashboard.html', 'maintenance.html', 'showcase.html', 'what-is-nwg.html', 'about.html', 'guide.html', 'academy.html', 'efficiency.html'],
  },
  ui: {
    keywords: ['nav', 'boot', 'core', 'components', 'effects', 'juice', 'i18n', 'config', 'utilities', 'menu'],
    pages: ['menu-demo.html', 'kintsugi.html', 'qinqin.html', 'matchalatte.html', 'index.html'],
  },
};

// ═══════════════════════════════════════════════════════════════════
// SCANNER — discover files that belong to each area
// ═══════════════════════════════════════════════════════════════════

function scanHTMLDeps(htmlFile) {
  /** Extract CSS/JS dependencies from an HTML file */
  const deps = [];
  try {
    const content = fs.readFileSync(htmlFile, 'utf8');
    // <link rel="stylesheet" href="...">
    const cssMatches = content.matchAll(/href=["']([^"']*\.css)["']/g);
    for (const m of cssMatches) deps.push(m[1]);
    // <script src="...">
    const jsMatches = content.matchAll(/src=["']([^"']*\.js)["']/g);
    for (const m of jsMatches) deps.push(m[1]);
  } catch {}
  return deps.map(d => d.replace(/^\/static\//, '').replace(/^\/?/, '')).filter(Boolean);
}

function generateAreas() {
  const areas = {};

  for (const [areaName, seed] of Object.entries(AREA_SEEDS)) {
    const files = new Set();

    // 1. Add seed pages
    for (const page of seed.pages || []) {
      files.add(page);
    }

    // 2. Add museum/lore subdirs
    for (const dir of seed.dirs || []) {
      const dirPath = path.join(PUBLIC, dir);
      if (fs.existsSync(dirPath)) {
        for (const f of fs.readdirSync(dirPath)) {
          if (f.endsWith('.html')) files.add(`${dir}${f}`);
        }
      }
    }

    // 3. Scan static/ for JS/CSS matching keywords
    if (fs.existsSync(STATIC)) {
      const staticFiles = fs.readdirSync(STATIC).filter(f => f.endsWith('.js') || f.endsWith('.css'));
      for (const sf of staticFiles) {
        const lower = sf.toLowerCase();
        for (const kw of seed.keywords) {
          if (lower.includes(kw.toLowerCase())) {
            files.add(`static/${sf}`);
            break;
          }
        }
      }
      // Also check helpers/
      const helpersDir = path.join(STATIC, 'helpers');
      if (fs.existsSync(helpersDir)) {
        for (const hf of fs.readdirSync(helpersDir)) {
          const lower = hf.toLowerCase();
          for (const kw of seed.keywords) {
            if (lower.includes(kw.toLowerCase())) {
              files.add(`static/helpers/${hf}`);
              break;
            }
          }
        }
      }
    }

    // 4. Scan HTML dependencies — add CSS/JS each page loads
    for (const page of [...(seed.pages || [])]) {
      const htmlPath = path.join(PUBLIC, page);
      if (fs.existsSync(htmlPath)) {
        const deps = scanHTMLDeps(htmlPath);
        for (const dep of deps) {
          // Only add area-specific deps, not shared (nw-boot, nw-nav, i18n)
          const lower = dep.toLowerCase();
          for (const kw of seed.keywords) {
            if (lower.includes(kw.toLowerCase())) {
              files.add(dep.startsWith('static/') ? dep : `static/${dep}`);
              break;
            }
          }
        }
      }
    }

    // 5. Scan src/routes/ for matching route handlers
    const routesDir = path.join(ROOT, 'src', 'routes');
    if (fs.existsSync(routesDir)) {
      for (const rf of fs.readdirSync(routesDir)) {
        const lower = rf.toLowerCase();
        for (const kw of seed.keywords) {
          if (lower.includes(kw.toLowerCase())) {
            files.add(`src/routes/${rf}`);
            break;
          }
        }
      }
    }

    // 6. Scan src/data/ for matching data files
    const dataDir = path.join(ROOT, 'src', 'data');
    if (fs.existsSync(dataDir)) {
      for (const df of fs.readdirSync(dataDir)) {
        const lower = df.toLowerCase();
        for (const kw of seed.keywords) {
          if (lower.includes(kw.toLowerCase())) {
            files.add(`src/data/${df}`);
            break;
          }
        }
      }
    }

    // Convert to sorted array of keywords (for config.json compatibility)
    // The config uses keyword matching, not exact file paths
    areas[areaName] = [...files].sort();
  }

  return areas;
}

// ═══════════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════════

function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const jsonOnly = args.includes('--json');

  const areas = generateAreas();

  // Stats
  let totalFiles = 0;
  for (const files of Object.values(areas)) totalFiles += files.length;

  if (jsonOnly) {
    console.log(JSON.stringify(areas, null, 2));
    return;
  }

  if (!dryRun) {
    // Read existing config, merge areas
    let config = {};
    try { config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}
    config.areas = areas;
    config._areasMeta = {
      generatedAt: new Date().toISOString(),
      generator: 'area-config-gen@1.0.0',
      areaCount: Object.keys(areas).length,
      totalFiles,
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }

  console.log('');
  console.log(`  AREA CONFIG ${dryRun ? '(DRY RUN)' : 'GENERATED'}`);
  console.log('  ═══════════════════════════════════════════════════');
  for (const [name, files] of Object.entries(areas)) {
    console.log(`  ${name.padEnd(12)} ${files.length} files`);
  }
  console.log('  ───────────────────────────────────────────────────');
  console.log(`  Total: ${Object.keys(areas).length} areas, ${totalFiles} files mapped`);
  if (!dryRun) console.log(`  Written to: ${CONFIG_FILE}`);
  console.log('');
}

run();
