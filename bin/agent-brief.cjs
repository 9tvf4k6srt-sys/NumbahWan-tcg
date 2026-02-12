#!/usr/bin/env node
/**
 * agent-brief.cjs — One-command project state for AI agents
 * 
 * Usage:
 *   node bin/agent-brief.cjs              # Full brief (structured JSON)
 *   node bin/agent-brief.cjs --quick      # Minimal brief (~500 tokens)
 *   node bin/agent-brief.cjs --rules      # Hard constraints only
 *   node bin/agent-brief.cjs --health     # Health scores only
 *   node bin/agent-brief.cjs --files      # File map
 *   node bin/agent-brief.cjs --onboard    # First-time agent onboarding
 *   node bin/agent-brief.cjs --workflow   # Git workflow steps
 * 
 * For AI agents: pipe to your context window
 *   node bin/agent-brief.cjs --quick | pbcopy
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = args[0] || '--full';

// ── Helpers ─────────────────────────────────────────────────────
function loadJson(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return null; }
}

function run(cmd) {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 5000 }).trim(); } catch { return ''; }
}

function fileSize(fp) {
  try { return fs.statSync(fp).size; } catch { return 0; }
}

// ── Data Sources ────────────────────────────────────────────────
const sentinel = loadJson(path.join(ROOT, 'public/static/data/sentinel-report.json'));
const pkg = loadJson(path.join(ROOT, 'package.json'));
const branch = run('git branch --show-current');
const lastCommit = run('git log --oneline -1');
const uncommitted = run('git status --porcelain').split('\n').filter(Boolean).length;
const htmlPages = run('ls public/*.html 2>/dev/null | wc -l');

// ── Quick Brief (~500 tokens) ───────────────────────────────────
function quickBrief() {
  const s = sentinel?.summary || {};
  return {
    project: 'NumbahWan TCG',
    branch,
    health: `${s.healthScore || '?'}/100 (${s.grade || '?'})`,
    critical: s.critical || 0,
    pages: htmlPages,
    lastCommit,
    uncommitted,
    tools: 'sentinel.cjs (guardian) | mycelium.cjs (memory) | tests/*.cjs',
    brands: 'NW=#ff6b00 | KINTSUGI=#c9a84c — never merge',
    mobile: 'iPhone 375px — always test mobile first',
    i18n: 'EN/ZH/TH (NW) | EN/ZH/JP (KINTSUGI)',
    api: '/api/agent/brief | /api/agent/context | /api/agent/rules'
  };
}

// ── Health Only ─────────────────────────────────────────────────
function healthBrief() {
  const s = sentinel?.summary || {};
  const modules = {};
  for (const [name, mod] of Object.entries(sentinel?.modules || {})) {
    modules[name] = { score: mod.score, grade: mod.grade, issues: mod.issues?.length || 0 };
  }
  return {
    composite: s.healthScore || 0,
    grade: s.grade || '?',
    issues: { critical: s.critical || 0, warnings: s.warnings || 0, suggestions: s.suggestions || 0 },
    modules,
    weakest: Object.entries(modules)
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, 3)
      .map(([n, m]) => `${n}: ${m.score}`),
    commands: {
      scan: 'node sentinel.cjs',
      heal: 'node sentinel.cjs --heal',
      guard: 'node sentinel.cjs --guard'
    }
  };
}

// ── Rules ───────────────────────────────────────────────────────
function rulesBrief() {
  return {
    design: [
      'TWO_BRANDS: NW (#ff6b00) and KINTSUGI (#c9a84c) never cross-contaminate',
      'MOBILE_FIRST: Owner reviews on iPhone 375px',
      'NO_EMOJI_ICONS: Professional SVG/WebP only',
      'FONT_SIZES: Only bump 9-13px to 11-15px, never touch headings'
    ],
    i18n: [
      'NW pages: EN + ZH (Traditional) + TH',
      'KINTSUGI pages: EN + ZH (Traditional) + JP',
      'Every page with data-i18n needs NW_I18N.register()',
      'No hardcoded user-facing text'
    ],
    includes: [
      'nw-nav.js on every NW public page',
      'nw-i18n-core.js on every page with data-i18n',
      'nw-icons-inline.js before nw-ux.js',
      'viewport meta on every page'
    ],
    workflow: [
      'Branch: genspark_ai_developer',
      'Commit after every change',
      'PR after every commit',
      'Squash before PR push',
      'git fetch origin main && rebase before PR'
    ]
  };
}

// ── Files Map ───────────────────────────────────────────────────
function filesBrief() {
  const keyFiles = {
    'src/index.tsx': { desc: 'Hono entrypoint', size: fileSize(path.join(ROOT, 'src/index.tsx')) },
    'src/routes/agent.ts': { desc: 'Agent-first API', size: fileSize(path.join(ROOT, 'src/routes/agent.ts')) },
    'sentinel.cjs': { desc: 'NW-GUARDIAN v3.0', size: fileSize(path.join(ROOT, 'sentinel.cjs')) },
    'mycelium.cjs': { desc: 'Project memory', size: fileSize(path.join(ROOT, 'mycelium.cjs')) },
    'bin/mycelium.cjs': { desc: 'CLI entry', size: fileSize(path.join(ROOT, 'bin/mycelium.cjs')) },
    'bin/agent-brief.cjs': { desc: 'Agent brief CLI', size: fileSize(path.join(ROOT, 'bin/agent-brief.cjs')) },
    'tests/run-tests.cjs': { desc: 'API tests', size: fileSize(path.join(ROOT, 'tests/run-tests.cjs')) },
    'tests/smoke-test.cjs': { desc: 'Smoke tests', size: fileSize(path.join(ROOT, 'tests/smoke-test.cjs')) },
    'tests/nw-i18n-guard.cjs': { desc: 'i18n guard', size: fileSize(path.join(ROOT, 'tests/nw-i18n-guard.cjs')) },
    'AGENT-CONTEXT.md': { desc: 'Agent onboarding', size: fileSize(path.join(ROOT, 'AGENT-CONTEXT.md')) },
    'CLAUDE.md': { desc: 'Claude protocol', size: fileSize(path.join(ROOT, 'CLAUDE.md')) }
  };
  
  // Format sizes
  for (const [, v] of Object.entries(keyFiles)) {
    v.size = `${Math.round(v.size / 1024)}KB`;
  }
  
  return { keyFiles, totalHtmlPages: htmlPages, totalRouteModules: 30 };
}

// ── Workflow Steps ──────────────────────────────────────────────
function workflowBrief() {
  return {
    setup: [
      'cd /home/user/webapp',
      'node bin/agent-brief.cjs --quick    # get project state',
      'node sentinel.cjs --guard           # check current issues'
    ],
    develop: [
      '1. Make changes (respect design rules)',
      '2. node sentinel.cjs --guard        # validate',
      '3. git add . && git commit -m "type(scope): desc"',
      '4. Repeat for each logical change'
    ],
    ship: [
      '1. git fetch origin main',
      '2. git rebase origin/main',
      '3. Resolve conflicts (prefer remote code)',
      '4. Squash: git reset --soft HEAD~N && git commit -m "msg"',
      '5. git push -f origin genspark_ai_developer',
      '6. Create/update PR, share URL'
    ],
    validate: [
      'node sentinel.cjs          # full health scan',
      'node sentinel.cjs --heal   # auto-fix what it can',
      'node sentinel.cjs --guard  # design + i18n + include checks',
      'node tests/smoke-test.cjs  # HTTP smoke tests',
      'node tests/nw-i18n-guard.cjs # deep i18n validation'
    ]
  };
}

// ── Onboard: First-time full context ────────────────────────────
function onboardBrief() {
  return {
    _meta: 'First-time agent onboarding. Read this once, then use --quick for subsequent sessions.',
    ...quickBrief(),
    rules: rulesBrief(),
    health: healthBrief(),
    files: filesBrief(),
    workflow: workflowBrief(),
    api: {
      agent: {
        brief: 'GET /api/agent/brief — quick context (~2K tokens)',
        context: 'GET /api/agent/context — full context (~8K tokens)',
        files: 'GET /api/agent/files — file map',
        health: 'GET /api/agent/health — unified health',
        rules: 'GET /api/agent/rules — hard constraints',
        task: 'GET /api/agent/task — work queue',
        diff: 'GET /api/agent/diff — recent changes'
      },
      system: {
        sentinel: 'GET /api/system/sentinel — full sentinel report',
        health: 'GET /api/system/health — unified health score'
      }
    }
  };
}

// ── Full Brief ──────────────────────────────────────────────────
function fullBrief() {
  return {
    quick: quickBrief(),
    health: healthBrief(),
    rules: rulesBrief(),
    files: filesBrief(),
    workflow: workflowBrief()
  };
}

// ── Main ────────────────────────────────────────────────────────
const handlers = {
  '--quick': quickBrief,
  '--health': healthBrief,
  '--rules': rulesBrief,
  '--files': filesBrief,
  '--workflow': workflowBrief,
  '--onboard': onboardBrief,
  '--full': fullBrief
};

const handler = handlers[flag];
if (!handler) {
  console.log('Usage: node bin/agent-brief.cjs [--quick|--health|--rules|--files|--workflow|--onboard|--full]');
  process.exit(1);
}

const result = handler();

// Pretty print for humans, compact for pipes
if (process.stdout.isTTY) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  AGENT BRIEF — ${flag.replace('--', '').toUpperCase()}`);
  console.log('═'.repeat(60));
  console.log(JSON.stringify(result, null, 2));
  console.log('═'.repeat(60) + '\n');
} else {
  console.log(JSON.stringify(result));
}
