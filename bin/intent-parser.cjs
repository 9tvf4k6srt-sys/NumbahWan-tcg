#!/usr/bin/env node
/**
 * NW Intent Parser v1.0
 * 
 * Converts natural language descriptions into structured YAML specs.
 * No LLM required — uses pattern matching + templates.
 *
 * Usage:
 *   node bin/intent-parser.cjs "Add a DLC about underwater temples with a sea goddess boss"
 *   node bin/intent-parser.cjs --interactive     # guided wizard
 *   node bin/intent-parser.cjs --from-issue 123  # parse GitHub issue
 *   echo "description" | node bin/intent-parser.cjs --stdin
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const SPECS_DIR = path.join(ROOT, 'specs');
const B = '\x1b[1m', G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', X = '\x1b[0m';
const ok = m => console.log(`  ${G}✓${X} ${m}`);
const info = m => console.log(`  ${C}ℹ${X} ${m}`);

// ── Pattern library for intent extraction ──
const PATTERNS = {
  // Page type detection
  type: [
    { re: /\b(dlc|expansion|content.?pack)\b/i, type: 'dlc-page' },
    { re: /\b(lore|story|backstory|origin|saga)\b/i, type: 'lore-page' },
    { re: /\b(feature|system|mechanic|gameplay)\b/i, type: 'feature-page' },
    { re: /\b(world|zone|area|region|biome)\b/i, type: 'world-page' },
  ],
  // DLC number extraction
  dlcNum: /\b(?:dlc|expansion)\s*#?\s*(\d+)/i,
  // Boss/deity detection
  boss: [
    { re: /\bboss(?:es)?\b.*?(?:named?|called?|:)\s*["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i, field: 'name' },
    { re: /\b([A-Z][a-z]+(?:\s+(?:the\s+)?[A-Z][a-z]+)*)\b.*?\b(?:boss|deity|god(?:dess)?|dragon|titan|lord|queen|king)\b/i, field: 'name' },
    { re: /\b(?:boss|deity|god(?:dess)?|dragon|titan|lord|queen|king)\s+(?:named?|called?|:)?\s*["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i, field: 'name' },
  ],
  // Theme/color detection
  theme: [
    { re: /\b(water|ocean|sea|aqua|underwater|deep|abyss)/i, color: '#0077cc', name: 'ocean' },
    { re: /\b(fire|flame|lava|magma|volcanic|inferno)/i, color: '#ff4400', name: 'fire' },
    { re: /\b(ice|frost|frozen|glacier|tundra|snow)/i, color: '#44ccff', name: 'ice' },
    { re: /\b(shadow|dark|void|abyss|night|nether)/i, color: '#9b1dff', name: 'shadow' },
    { re: /\b(nature|forest|jungle|grove|garden|bloom)/i, color: '#22cc55', name: 'nature' },
    { re: /\b(sky|wind|cloud|storm|lightning|thunder)/i, color: '#ffcc00', name: 'sky' },
    { re: /\b(desert|sand|dune|oasis|sun|solar)/i, color: '#ff9900', name: 'desert' },
    { re: /\b(crystal|gem|diamond|jewel|prismatic)/i, color: '#ff44ff', name: 'crystal' },
    { re: /\b(blood|crimson|scarlet|war|battle)/i, color: '#cc0000', name: 'blood' },
    { re: /\b(gold|treasure|ancient|temple|ruin)/i, color: '#ffd700', name: 'gold' },
  ],
  // Feature/mechanic keywords
  features: [
    { re: /\b(pvp|versus|faction.?war|territory)\b/i, icon: '⚔️', title: 'PvP System' },
    { re: /\b(raid|40.?player|massive|group)\b/i, icon: '👥', title: 'Raid Encounter' },
    { re: /\b(puzzle|riddle|mystery|solve)\b/i, icon: '🧩', title: 'Puzzle Mechanics' },
    { re: /\b(craft|forge|build|create|smith)\b/i, icon: '🔨', title: 'Crafting System' },
    { re: /\b(stealth|sneak|infiltrat|shadow)\b/i, icon: '🌑', title: 'Stealth Gameplay' },
    { re: /\b(mount|ride|flying|flight)\b/i, icon: '🐉', title: 'Mount System' },
    { re: /\b(underwater|diving|swim|depth|pressure)\b/i, icon: '🌊', title: 'Underwater Mechanics' },
    { re: /\b(music|song|instrument|bard)\b/i, icon: '🎵', title: 'Music System' },
    { re: /\b(pet|companion|tame|summon)\b/i, icon: '🐾', title: 'Companion System' },
    { re: /\b(transform|morph|shape.?shift)\b/i, icon: '✨', title: 'Transformation' },
    { re: /\b(arena|colosseum|tournament|duel)\b/i, icon: '🏟️', title: 'Arena Combat' },
    { re: /\b(time|temporal|chrono|rewind)\b/i, icon: '⏳', title: 'Time Mechanics' },
  ],
  // Stat patterns
  stats: [
    { re: /(\d+)\s*(?:phase|stage)/i, label: 'Phases', key: 'StatPhases' },
    { re: /(\d+)\s*(?:player|person|man)\s*(?:raid|group|team)/i, label: '-Player', key: 'StatMode' },
    { re: /(\d+)\s*(?:floor|level|zone|area|room)/i, label: 'Zones', key: 'StatZones' },
    { re: /(\d+)\s*(?:boss|encounter|fight)/i, label: 'Bosses', key: 'StatBosses' },
  ],
};

// ── Extract structured data from natural language ──
function parseIntent(text) {
  const result = {
    type: 'dlc-page',
    title: '',
    slug: '',
    dlc: null,
    theme: { primary: '#ff6b00', name: 'default' },
    boss: null,
    features: [],
    stats: [],
    rawText: text,
  };

  // Page type
  for (const p of PATTERNS.type) {
    if (p.re.test(text)) { result.type = p.type; break; }
  }

  // DLC number
  const dlcMatch = text.match(PATTERNS.dlcNum);
  if (dlcMatch) result.dlc = parseInt(dlcMatch[1]);

  // Theme
  for (const t of PATTERNS.theme) {
    if (t.re.test(text)) {
      result.theme = { primary: t.color, name: t.name };
      break;
    }
  }

  // Boss name
  for (const b of PATTERNS.boss) {
    const m = text.match(b.re);
    if (m && m[1] && m[1].length > 2 && m[1].length < 40) {
      result.boss = m[1].trim();
      break;
    }
  }

  // Features
  for (const f of PATTERNS.features) {
    if (f.re.test(text)) {
      result.features.push({ icon: f.icon, title: f.title });
    }
  }

  // Stats
  for (const s of PATTERNS.stats) {
    const m = text.match(s.re);
    if (m) result.stats.push({ val: m[1], label: s.label, key: s.key });
  }

  // Title extraction — use the most descriptive noun phrase
  const titlePatterns = [
    /(?:about|called|named|titled)\s+["']?([^"'\n,.]+)/i,
    /(?:the|a)\s+((?:[A-Z][a-z]+\s*){2,5})/,
    /^(?:add|create|make|build)\s+(?:a\s+)?(?:new\s+)?(?:dlc|page|section)?\s*(?:about|for|with|on)?\s*(.+?)(?:\.|$)/i,
  ];
  for (const p of titlePatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      result.title = m[1].trim().replace(/\s+/g, ' ').substring(0, 60);
      break;
    }
  }
  if (!result.title && result.boss) result.title = result.boss;
  if (!result.title) result.title = text.split(/[.,!?]/)[0].substring(0, 50).trim();

  // Slug
  result.slug = (result.dlc ? `dlc-${result.dlc}-` : '') +
    result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 30);

  return result;
}

// ── Generate YAML spec from parsed intent ──
function generateSpec(parsed) {
  const slug = parsed.slug;
  const slugClean = slug.replace(/-/g, '');
  const c = parsed.theme.primary;
  const grad = `rgba(${hexToRgb(c)},0.08), rgba(3,3,5,1), rgba(${hexToRgb(c)},0.05)`;

  const spec = {
    type: parsed.type,
    slug: slug,
    title: parsed.title.toUpperCase(),
    ...(parsed.dlc ? { dlc: parsed.dlc } : {}),
    theme: { primary: c, gradient: grad },
    hero: {
      badge: parsed.dlc
        ? `DLC ${parsed.dlc} • ${parsed.title} • ${parsed.theme.name}`
        : parsed.title,
      title: parsed.title.toUpperCase(),
      subtitle: `[Auto-generated from intent — replace with creative lore text]\n${parsed.rawText}`,
      stats: [
        ...(parsed.boss ? [{ val: '1', label: 'Deity Boss', i18n_key: `${slugClean}StatBoss` }] : []),
        ...parsed.stats.map(s => ({
          val: s.val + (s.label.startsWith('-') ? '' : ''),
          label: s.val + s.label,
          i18n_key: `${slugClean}${s.key}`,
        })),
        { val: 'FREE', label: 'Price', i18n_key: `${slugClean}StatPrice` },
      ],
    },
  };

  // Explore section (if boss or features detected)
  if (parsed.boss || parsed.features.length > 0) {
    spec.explore = {
      tag: spec.hero.badge,
      title: parsed.boss
        ? `${parsed.boss} — [Add epithet here]`
        : `${parsed.title} — Features`,
      tagline: '[Auto-generated — replace with compelling one-liner]',
    };

    if (parsed.boss) {
      spec.explore.boss_image = {
        src: `/static/game/${parsed.theme.name}/${slug}-boss.webp`,
        alt: `${parsed.boss} — boss encounter`,
        frame_tag: parsed.boss.toUpperCase(),
        frame_engine: `${parsed.dlc ? 'DLC ' + parsed.dlc + ' ' : ''}BOSS`,
      };
      spec.explore.lore = {
        heading: `[Lore heading about ${parsed.boss}]`,
        paragraphs: [
          { key: `${slugClean}_p1`, en: `[Write lore paragraph 1 about ${parsed.boss} here]` },
          { key: `${slugClean}_p2`, en: `[Write lore paragraph 2 about the encounter here]` },
        ],
      };
    }

    if (parsed.features.length > 0) {
      spec.explore.features = parsed.features.map((f, i) => ({
        key: `feat_${slugClean}_${i}`,
        icon: f.icon,
        title: f.title,
        en: `[Write feature description for ${f.title} here]`,
      }));
    }
  }

  spec.i18n = 'auto';
  return spec;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── Interactive wizard ──
function runWizard() {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(r => rl.question(`  ${C}?${X} ${q}: `, r));

  (async () => {
    console.log(`\n${B}🏭 NW Intent Parser — Guided Wizard${X}\n`);

    const desc = await ask('Describe the content (natural language)');
    const parsed = parseIntent(desc);

    console.log(`\n  ${B}Detected:${X}`);
    info(`Type: ${parsed.type}`);
    info(`Title: ${parsed.title}`);
    info(`Theme: ${parsed.theme.name} (${parsed.theme.primary})`);
    if (parsed.boss) info(`Boss: ${parsed.boss}`);
    if (parsed.features.length) info(`Features: ${parsed.features.map(f => f.title).join(', ')}`);

    const confirm = await ask('Generate spec? (y/n)');
    if (confirm.toLowerCase() !== 'y') { rl.close(); return; }

    const dlcNum = parsed.dlc || await ask('DLC number (or press enter to skip)');
    if (dlcNum && !parsed.dlc) parsed.dlc = parseInt(dlcNum) || null;

    const spec = generateSpec(parsed);
    const specPath = path.join(SPECS_DIR, `${parsed.slug}.yaml`);
    fs.mkdirSync(SPECS_DIR, { recursive: true });
    fs.writeFileSync(specPath, yaml.dump(spec, { lineWidth: 120, quotingType: '"' }));
    ok(`Spec written: ${path.relative(ROOT, specPath)}`);
    info(`Next: npm run factory:gen ${path.relative(ROOT, specPath)}`);

    rl.close();
  })();
}

// ── CLI ──
const args = process.argv.slice(2);

if (args.includes('--interactive') || args.includes('-i')) {
  runWizard();
} else if (args.includes('--stdin')) {
  let input = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', d => input += d);
  process.stdin.on('end', () => {
    const parsed = parseIntent(input.trim());
    const spec = generateSpec(parsed);
    console.log(yaml.dump(spec, { lineWidth: 120, quotingType: '"' }));
  });
} else if (args.length > 0 && !args[0].startsWith('--')) {
  const text = args.filter(a => !a.startsWith('--')).join(' ');
  console.log(`\n${B}🏭 NW Intent Parser v1.0${X}\n`);

  const parsed = parseIntent(text);
  info(`Type: ${parsed.type}`);
  info(`Title: ${parsed.title}`);
  info(`Theme: ${parsed.theme.name} (${parsed.theme.primary})`);
  if (parsed.boss) info(`Boss: ${parsed.boss}`);
  if (parsed.features.length) info(`Features: ${parsed.features.map(f => f.title).join(', ')}`);
  if (parsed.stats.length) info(`Stats: ${parsed.stats.map(s => s.val + ' ' + s.label).join(', ')}`);

  const spec = generateSpec(parsed);
  const dryRun = args.includes('--dry-run');
  
  if (dryRun) {
    console.log(`\n${B}--- Generated Spec ---${X}`);
    console.log(yaml.dump(spec, { lineWidth: 120, quotingType: '"' }));
  } else {
    const specPath = path.join(SPECS_DIR, `${parsed.slug}.yaml`);
    fs.mkdirSync(SPECS_DIR, { recursive: true });
    fs.writeFileSync(specPath, yaml.dump(spec, { lineWidth: 120, quotingType: '"' }));
    ok(`Spec written: specs/${parsed.slug}.yaml`);
    info(`Next: npm run factory:gen specs/${parsed.slug}.yaml`);
    info(`Or full pipeline: npm run factory -- --gen specs/${parsed.slug}.yaml`);
  }
} else {
  console.log(`\n${B}🏭 NW Intent Parser v1.0${X}\n`);
  console.log(`Usage:`);
  console.log(`  node bin/intent-parser.cjs "Add a DLC about underwater temples"   # one-shot`);
  console.log(`  node bin/intent-parser.cjs --interactive                           # wizard`);
  console.log(`  node bin/intent-parser.cjs "..." --dry-run                        # preview only`);
  console.log(`  echo "description" | node bin/intent-parser.cjs --stdin            # pipe mode`);
}
