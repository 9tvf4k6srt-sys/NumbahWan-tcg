#!/usr/bin/env node
/**
 * Factory Init v1.0 — Scaffold New Specs From Templates
 * 
 * Generates ready-to-edit YAML spec files for any supported page type.
 * Each template includes all required fields, example data, and helpful comments.
 *
 * Usage:
 *   node bin/factory-init.cjs dlc-page my-new-dlc         # create DLC page spec
 *   node bin/factory-init.cjs landing-page product-launch  # create landing page spec
 *   node bin/factory-init.cjs app-page admin-dashboard     # create app page spec
 *   node bin/factory-init.cjs docs-page api-reference      # create docs page spec
 *   node bin/factory-init.cjs --list                       # list all templates
 *   node bin/factory-init.cjs --wizard                     # interactive guided setup
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const core = require('./factory-core.cjs');
const { ROOT, ok, fail, info, warn, header, emit, SPEC_TYPES, B, G, R, Y, C, X } = core;

const SPECS_DIR = path.join(ROOT, 'specs');

// ═══════════════════════════════════════════════════════════════
// SPEC TEMPLATES — one per supported type
// ═══════════════════════════════════════════════════════════════

const TEMPLATES = {
  'dlc-page': (slug, title) => ({
    type: 'dlc-page',
    slug,
    title: title.toUpperCase(),
    dlc: 13, // TODO: auto-detect next DLC number
    theme: { primary: '#ff6b00', gradient: 'rgba(255,107,0,.08), rgba(3,3,5,1), rgba(168,85,247,.05)' },
    hero: {
      badge: `DLC 13 • ${title} • [Tagline]`,
      title: title.toUpperCase(),
      subtitle: '[Write a compelling 2-sentence description of this DLC]',
      stats: [
        { val: '1', label: 'Deity Boss', i18n_key: `${slug.replace(/-/g,'')}StatBoss` },
        { val: '3', label: 'Phases', i18n_key: `${slug.replace(/-/g,'')}StatPhases` },
        { val: '40-Player Raid', label: '40-Player Raid', i18n_key: `${slug.replace(/-/g,'')}StatMode` },
        { val: 'FREE', label: 'Price', i18n_key: `${slug.replace(/-/g,'')}StatPrice` },
      ],
    },
    explore: {
      tag: `DLC 13 • [Boss Subtitle]`,
      title: '[Boss Name] — [Boss Epithet]',
      tagline: '[One compelling line about the boss encounter]',
      boss_image: {
        src: `/static/game/[zone]/${slug}-boss.webp`,
        alt: '[Describe the boss visually for accessibility]',
        frame_tag: '[BOSS NAME]',
        frame_engine: 'DLC 13 BOSS',
      },
      lore: {
        heading: '[Lore Section Title]',
        paragraphs: [
          { key: `${slug.replace(/-/g,'')}_p1`, en: '[First lore paragraph — set the scene]' },
          { key: `${slug.replace(/-/g,'')}_p2`, en: '[Second lore paragraph — describe the encounter]' },
        ],
      },
      features: [
        { key: `feat_${slug.replace(/-/g,'')}_0`, icon: '⚡', title: '[Feature 1 Name]', en: '[Describe what makes this feature unique]' },
        { key: `feat_${slug.replace(/-/g,'')}_1`, icon: '🔥', title: '[Feature 2 Name]', en: '[Describe what makes this feature unique]' },
        { key: `feat_${slug.replace(/-/g,'')}_2`, icon: '🛡️', title: '[Feature 3 Name]', en: '[Describe what makes this feature unique]' },
      ],
    },
    i18n: 'auto',
  }),

  'lore-page': (slug, title) => ({
    type: 'lore-page',
    slug,
    title: title.toUpperCase(),
    theme: { primary: '#c9a84c', gradient: 'rgba(201,168,76,.08), rgba(3,3,5,1), rgba(168,85,247,.05)' },
    hero: {
      badge: `Lore • ${title}`,
      title: title.toUpperCase(),
      subtitle: '[Write a compelling lore introduction]',
    },
    explore: {
      tag: `Lore • ${title}`,
      title: `${title} — [Subtitle]`,
      tagline: '[One line that hooks the reader]',
      lore: {
        heading: '[Chapter Title]',
        paragraphs: [
          { key: `${slug.replace(/-/g,'')}_p1`, en: '[Paragraph 1]' },
          { key: `${slug.replace(/-/g,'')}_p2`, en: '[Paragraph 2]' },
        ],
      },
    },
    i18n: 'auto',
  }),

  'landing-page': (slug, title) => ({
    type: 'landing-page',
    slug,
    title,
    theme: { primary: '#0077cc' },
    hero: {
      title,
      subtitle: '[Compelling value proposition in one sentence]',
    },
    cta: { text: 'Get Started', href: '#signup' },
    sections: [
      { title: '[Feature Section 1]', body: '[Describe the key benefit]' },
      { title: '[Feature Section 2]', body: '[Describe another benefit]', alt: true },
      { title: '[Social Proof]', body: '[Testimonial or statistic]' },
    ],
    i18n: 'auto',
  }),

  'app-page': (slug, title) => ({
    type: 'app-page',
    slug,
    title,
    layout: 'dashboard', // Options: single, sidebar, dashboard, split
    components: [
      { type: 'stats', title: '[Stats Widget]', body: '[Key metrics display]' },
      { type: 'table', title: '[Data Table]', body: '[Main content area]' },
      { type: 'chart', title: '[Chart Widget]', body: '[Visual data representation]' },
      { type: 'card', title: '[Action Card]', body: '[Quick actions or summary]' },
    ],
    i18n: 'auto',
  }),

  'docs-page': (slug, title) => ({
    type: 'docs-page',
    slug,
    title,
    sections: [
      { title: 'Overview', body: '[What this documentation covers]' },
      { title: 'Getting Started', body: '[Quick start guide]', code: '# Installation\nnpm install your-package' },
      { title: 'API Reference', body: '[Detailed API documentation]', code: 'const result = api.call(params);' },
      { title: 'Examples', body: '[Working examples]' },
    ],
    i18n: 'auto',
  }),

  'feature-page': (slug, title) => ({
    type: 'feature-page',
    slug,
    title: title.toUpperCase(),
    theme: { primary: '#22cc55' },
    hero: {
      badge: `Feature • ${title}`,
      title: title.toUpperCase(),
      subtitle: '[Describe this gameplay feature]',
    },
    explore: {
      tag: `Feature Spotlight`,
      title: `${title} — [Tagline]`,
      tagline: '[Why players love this feature]',
      features: [
        { key: `feat_${slug.replace(/-/g,'')}_0`, icon: '⚡', title: '[Sub-Feature 1]', en: '[Description]' },
        { key: `feat_${slug.replace(/-/g,'')}_1`, icon: '🎯', title: '[Sub-Feature 2]', en: '[Description]' },
      ],
    },
    i18n: 'auto',
  }),

  'world-page': (slug, title) => ({
    type: 'world-page',
    slug,
    title: title.toUpperCase(),
    theme: { primary: '#9b1dff' },
    hero: {
      badge: `World • ${title}`,
      title: title.toUpperCase(),
      subtitle: '[Describe this world/zone]',
    },
    explore: {
      tag: `World • ${title}`,
      title: `${title} — [Subtitle]`,
      tagline: '[What makes this zone unique]',
      lore: {
        heading: '[Zone Lore]',
        paragraphs: [
          { key: `${slug.replace(/-/g,'')}_p1`, en: '[Zone history paragraph 1]' },
          { key: `${slug.replace(/-/g,'')}_p2`, en: '[Zone atmosphere paragraph 2]' },
        ],
      },
    },
    i18n: 'auto',
  }),
};

// ═══════════════════════════════════════════════════════════════
// INTERACTIVE WIZARD
// ═══════════════════════════════════════════════════════════════

async function wizard() {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(r => rl.question(`  ${C}?${X} ${q}: `, r));

  header('🏭', 'Factory Init — Guided Wizard');

  // Choose type
  console.log(`  ${B}Available types:${X}`);
  Object.entries(SPEC_TYPES).forEach(([key, t]) => {
    console.log(`    ${G}${key.padEnd(16)}${X} ${t.description}`);
  });
  console.log('');

  const type = await ask('Page type');
  if (!SPEC_TYPES[type]) { fail(`Unknown type: ${type}. Use --list to see options.`); rl.close(); return; }

  const title = await ask('Title (e.g., "Fire Dragon Lair")');
  const slug = (await ask(`Slug (default: ${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)})`) || 
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30));

  const confirm = await ask('Generate spec? (y/n)');
  if (confirm.toLowerCase() !== 'y') { rl.close(); return; }

  createSpec(type, slug, title);
  rl.close();
}

// ═══════════════════════════════════════════════════════════════
// SPEC CREATION
// ═══════════════════════════════════════════════════════════════

function createSpec(type, slug, title) {
  const template = TEMPLATES[type];
  if (!template) { fail(`No template for type: ${type}`); return; }

  const spec = template(slug, title);
  const specPath = path.join(SPECS_DIR, `${slug}.yaml`);
  
  if (fs.existsSync(specPath)) {
    warn(`Spec already exists: ${specPath}`);
    info('Use a different slug or delete the existing file');
    return;
  }

  fs.mkdirSync(SPECS_DIR, { recursive: true });
  
  // Write with a helpful header comment
  const yamlContent = `# Factory Spec: ${title}\n# Type: ${type}\n# Generated: ${new Date().toISOString()}\n# \n# Edit the [bracketed] placeholders, then run:\n#   node bin/page-gen.cjs specs/${slug}.yaml --dry-run    # preview\n#   node bin/page-gen.cjs specs/${slug}.yaml              # generate\n#   node bin/factory-runner.cjs --gen specs/${slug}.yaml  # full pipeline\n#\n` + 
    yaml.dump(spec, { lineWidth: 120, quotingType: '"' });
  
  fs.writeFileSync(specPath, yamlContent);
  ok(`Spec created: specs/${slug}.yaml`);
  info(`Type: ${SPEC_TYPES[type].name}`);
  info(`Output: ${SPEC_TYPES[type].outputDir}/${slug}.html`);
  info(`Next: edit specs/${slug}.yaml, then run: node bin/page-gen.cjs specs/${slug}.yaml`);
  
  emit('factory-init', 'spec_created', { type, slug });
}

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

const args = process.argv.slice(2);

if (args.includes('--list') || args.includes('-l')) {
  header('🏭', 'Factory Init — Available Templates');
  Object.entries(SPEC_TYPES).forEach(([key, t]) => {
    console.log(`  ${G}${key.padEnd(16)}${X} ${t.description}`);
    console.log(`  ${' '.repeat(16)} Required: ${t.requiredFields.join(', ')}`);
    console.log(`  ${' '.repeat(16)} Output: ${t.outputDir}\n`);
  });
  console.log(`  ${B}Usage:${X} node bin/factory-init.cjs <type> <slug> [title]`);
  process.exit(0);
}

if (args.includes('--wizard') || args.includes('-w')) {
  wizard();
} else if (args.length >= 2 && !args[0].startsWith('--')) {
  const type = args[0];
  const slug = args[1];
  const title = args.slice(2).join(' ') || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  header('🏭', 'Factory Init v1.0');
  createSpec(type, slug, title);
} else {
  header('🏭', 'Factory Init v1.0');
  console.log(`  Scaffold a new spec file for any page type.\n`);
  console.log(`  ${B}Usage:${X}`);
  console.log(`    node bin/factory-init.cjs <type> <slug> [title]`);
  console.log(`    node bin/factory-init.cjs --list          # show all types`);
  console.log(`    node bin/factory-init.cjs --wizard        # guided setup\n`);
  console.log(`  ${B}Examples:${X}`);
  console.log(`    node bin/factory-init.cjs dlc-page dlc-13-fire-dragons "Fire Dragon Lair"`);
  console.log(`    node bin/factory-init.cjs landing-page product-launch "Product Launch"`);
  console.log(`    node bin/factory-init.cjs app-page admin-dashboard`);
  console.log(`    node bin/factory-init.cjs docs-page api-reference "API Reference"`);
}
