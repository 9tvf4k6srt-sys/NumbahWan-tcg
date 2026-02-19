#!/usr/bin/env node
/**
 * Factory Doctor v1.0 — Pipeline Health Diagnostics
 * 
 * One-command diagnosis of the ENTIRE factory pipeline.
 * Checks every tool, every dependency, every file the factory needs.
 * Produces a clear report with fix suggestions.
 *
 * Usage:
 *   node bin/factory-doctor.cjs             # full diagnosis
 *   node bin/factory-doctor.cjs --quick     # fast check (skip slow tests)
 *   node bin/factory-doctor.cjs --json      # machine-readable output
 *   node bin/factory-doctor.cjs --fix       # attempt auto-fix
 */

const fs = require('fs');
const path = require('path');
const core = require('./factory-core.cjs');
const { ROOT, ok, fail, warn, info, header, divider, table, run, runQuiet, 
        timer, humanDuration, readJSON, ensureDir, fileExists, fileSizeKB,
        B, G, R, Y, C, M, X, SPEC_TYPES, emit } = core;

const args = process.argv.slice(2);
const quickMode = args.includes('--quick');
const jsonMode = args.includes('--json');
const fixMode = args.includes('--fix');

// ═══════════════════════════════════════════════════════════════
// DIAGNOSTIC CHECKS
// ═══════════════════════════════════════════════════════════════

const checks = [];

function check(category, name, fn) {
  const start = Date.now();
  try {
    const result = fn();
    const elapsed = Date.now() - start;
    checks.push({ category, name, ...result, duration_ms: elapsed });
    return result;
  } catch (e) {
    checks.push({ category, name, status: 'error', msg: e.message, duration_ms: Date.now() - start });
  }
}

// ── 1. Tool Availability ──
function checkTools() {
  const tools = [
    { file: 'bin/factory-core.cjs', name: 'Factory Core (shared lib)', required: true },
    { file: 'bin/factory-runner.cjs', name: 'Factory Runner (pipeline)', required: true },
    { file: 'bin/page-gen.cjs', name: 'Page Generator', required: true },
    { file: 'bin/factory-memory.cjs', name: 'Factory Memory (learning)', required: true },
    { file: 'bin/orchestrator.cjs', name: 'Orchestrator', required: false },
    { file: 'bin/intent-parser.cjs', name: 'Intent Parser', required: false },
    { file: 'bin/quality-scorecard.cjs', name: 'Quality Scorecard', required: true },
    { file: 'bin/deploy-gate.cjs', name: 'Deploy Gate', required: true },
    { file: 'bin/agent-loop.cjs', name: 'Agent Loop', required: false },
    { file: 'bin/mcp-server.cjs', name: 'MCP Server', required: false },
    { file: 'bin/gen-context.cjs', name: 'Context Generator', required: false },
    { file: 'bin/agent-brief.cjs', name: 'Agent Brief', required: false },
    { file: 'bin/mycelium.cjs', name: 'Mycelium CLI', required: false },
    { file: 'sentinel.cjs', name: 'Sentinel Guardian', required: false },
    { file: 'tools/event-bus.cjs', name: 'Event Bus', required: false },
  ];

  tools.forEach(t => {
    check('tools', t.name, () => {
      const exists = fileExists(path.join(ROOT, t.file));
      const size = fileSizeKB(path.join(ROOT, t.file));
      if (exists) return { status: 'pass', msg: `${size}KB` };
      if (t.required) return { status: 'fail', msg: 'MISSING — required for pipeline', fix: `Create ${t.file}` };
      return { status: 'warn', msg: 'Missing (optional)' };
    });
  });
}

// ── 2. Dependencies ──
function checkDeps() {
  check('deps', 'Node.js', () => {
    const r = run('node --version');
    return r.ok ? { status: 'pass', msg: r.stdout } : { status: 'fail', msg: 'Node.js not found' };
  });

  check('deps', 'js-yaml', () => {
    try { require('js-yaml'); return { status: 'pass', msg: 'installed' }; }
    catch { return { status: 'fail', msg: 'Missing — run: npm install js-yaml', fix: 'npm install js-yaml' }; }
  });

  check('deps', 'npm scripts', () => {
    const pkg = readJSON(path.join(ROOT, 'package.json'));
    const factoryScripts = Object.keys(pkg?.scripts || {}).filter(k => k.startsWith('factory'));
    return factoryScripts.length >= 10
      ? { status: 'pass', msg: `${factoryScripts.length} factory scripts` }
      : { status: 'warn', msg: `Only ${factoryScripts.length} factory scripts (expected ≥10)` };
  });
}

// ── 3. Data Files ──
function checkData() {
  const dataFiles = [
    { file: '.mycelium/factory-memory.json', name: 'Factory Memory', maxKB: 200 },
    { file: '.mycelium/events.jsonl', name: 'Event Bus Log', maxKB: 500 },
    { file: '.mycelium/checkpoint.json', name: 'Work Checkpoint', maxKB: 10 },
    { file: '.mycelium/factory-checkpoint.json', name: 'Pipeline Checkpoint', maxKB: 10 },
  ];

  dataFiles.forEach(d => {
    check('data', d.name, () => {
      const fp = path.join(ROOT, d.file);
      if (!fileExists(fp)) return { status: 'info', msg: 'Not created yet (OK for first run)' };
      const size = fileSizeKB(fp);
      if (size > d.maxKB) return { status: 'warn', msg: `${size}KB — exceeds ${d.maxKB}KB budget, consider trimming`, fix: `Trim ${d.file}` };
      return { status: 'pass', msg: `${size}KB` };
    });
  });

  check('data', 'Factory Logs Dir', () => {
    const logDir = path.join(ROOT, '.mycelium', 'factory-logs');
    if (!fileExists(logDir)) return { status: 'info', msg: 'Will be created on first pipeline run' };
    const files = fs.readdirSync(logDir).length;
    return { status: 'pass', msg: `${files} log files` };
  });
}

// ── 4. Spec Files ──
function checkSpecs() {
  check('specs', 'Specs Directory', () => {
    const specDir = path.join(ROOT, 'specs');
    if (!fileExists(specDir)) return { status: 'warn', msg: 'No specs/ directory', fix: 'mkdir specs' };
    const files = fs.readdirSync(specDir).filter(f => f.endsWith('.yaml'));
    return { status: 'pass', msg: `${files.length} spec file(s): ${files.join(', ')}` };
  });

  // Validate each spec
  const specDir = path.join(ROOT, 'specs');
  if (fileExists(specDir)) {
    const files = fs.readdirSync(specDir).filter(f => f.endsWith('.yaml'));
    files.forEach(f => {
      check('specs', `Spec: ${f}`, () => {
        try {
          const yaml = require('js-yaml');
          const spec = yaml.load(fs.readFileSync(path.join(specDir, f), 'utf-8'));
          const validation = core.validateSpec(spec);
          if (validation.valid) return { status: 'pass', msg: `${spec.type} — ${spec.slug}` };
          return { status: 'fail', msg: validation.errors.map(e => e.msg).join('; '), fix: validation.errors.map(e => e.fix).join('; ') };
        } catch (e) {
          return { status: 'fail', msg: `YAML parse error: ${e.message}` };
        }
      });
    });
  }
}

// ── 5. Pipeline Integration ──
function checkPipeline() {
  const scripts = [
    { cmd: 'node scripts/i18n-inject.cjs --check 2>&1 | tail -3', name: 'i18n Inject', timeout: 15000 },
    { cmd: 'node bin/quality-scorecard.cjs 2>&1 | tail -3', name: 'Quality Scorecard', timeout: 30000 },
  ];

  if (!quickMode) {
    scripts.push(
      { cmd: 'node sentinel.cjs --guard 2>&1 | tail -5', name: 'Sentinel Guard', timeout: 30000 },
    );
  }

  scripts.forEach(s => {
    check('pipeline', s.name, () => {
      const r = run(s.cmd, { timeout: s.timeout });
      if (r.ok) return { status: 'pass', msg: `OK (${humanDuration(r.duration_ms)})` };
      return { status: 'warn', msg: `Issues detected (${humanDuration(r.duration_ms)})` };
    });
  });
}

// ── 6. Memory Health ──
function checkMemory() {
  let memory;
  try { memory = require('./factory-memory.cjs'); } catch { 
    check('memory', 'Memory Module', () => ({ status: 'fail', msg: 'Cannot load factory-memory.cjs' }));
    return;
  }

  check('memory', 'Memory Load', () => {
    const mem = memory.loadMemory();
    return { status: 'pass', msg: `${mem.stats.totalBuilds} builds, ${mem.stats.totalLessons} lessons, Gen ${mem.templateDNA.generation}` };
  });

  check('memory', 'Defect Tracking', () => {
    const mem = memory.loadMemory();
    const open = mem.defects.filter(d => !d.fixApplied).length;
    const fixed = mem.defects.filter(d => d.fixApplied).length;
    if (open > 0) return { status: 'warn', msg: `${open} open defects, ${fixed} fixed` };
    return { status: 'pass', msg: `All ${fixed} defects fixed, clean streak: ${mem.stats.currentStreak}` };
  });

  check('memory', 'Pattern Library', () => {
    const mem = memory.loadMemory();
    const counts = Object.entries(mem.patterns)
      .filter(([, v]) => Array.isArray(v))
      .map(([k, v]) => `${k}: ${v.length}`)
      .join(', ');
    return { status: 'pass', msg: counts || 'No patterns yet' };
  });
}

// ── 7. Git Health ──
function checkGit() {
  check('git', 'Branch', () => {
    const r = run('git branch --show-current');
    return { status: 'pass', msg: r.stdout || 'unknown' };
  });

  check('git', 'Uncommitted', () => {
    const r = run('git status --porcelain');
    const count = (r.stdout || '').split('\n').filter(Boolean).length;
    if (count > 20) return { status: 'warn', msg: `${count} uncommitted files — consider committing` };
    if (count > 0) return { status: 'info', msg: `${count} uncommitted files` };
    return { status: 'pass', msg: 'Clean working tree' };
  });
}

// ═══════════════════════════════════════════════════════════════
// RUN ALL CHECKS
// ═══════════════════════════════════════════════════════════════

const clock = timer();

if (!jsonMode) header('🩺', 'Factory Doctor v1.0 — Pipeline Health Diagnostics');

checkTools();
checkDeps();
checkData();
checkSpecs();
checkPipeline();
checkMemory();
checkGit();

// ═══════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════

if (jsonMode) {
  const summary = {
    pass: checks.filter(c => c.status === 'pass').length,
    warn: checks.filter(c => c.status === 'warn').length,
    fail: checks.filter(c => c.status === 'fail').length,
    info: checks.filter(c => c.status === 'info').length,
    total: checks.length,
    duration_ms: clock.ms(),
    checks,
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.fail > 0 ? 1 : 0);
}

// Group by category
const byCategory = {};
checks.forEach(c => { (byCategory[c.category] = byCategory[c.category] || []).push(c); });

Object.entries(byCategory).forEach(([cat, items]) => {
  console.log(`\n  ${B}${cat.toUpperCase()}${X}`);
  items.forEach(c => {
    const icon = c.status === 'pass' ? `${G}✓` : c.status === 'fail' ? `${R}✗` : c.status === 'warn' ? `${Y}⚠` : `${C}ℹ`;
    console.log(`    ${icon}${X} ${c.name.padEnd(25)} ${c.msg}`);
  });
});

// Summary
const passed = checks.filter(c => c.status === 'pass').length;
const warned = checks.filter(c => c.status === 'warn').length;
const failed = checks.filter(c => c.status === 'fail').length;
const total = checks.length;
const elapsed = clock.human();

console.log('');
divider();
if (failed === 0) {
  console.log(`  ${G}${B}✓ Factory Health: GOOD${X} — ${passed}/${total} pass, ${warned} warnings (${elapsed})`);
} else {
  console.log(`  ${R}${B}✗ Factory Health: ISSUES${X} — ${failed} failures, ${warned} warnings out of ${total} checks (${elapsed})`);
}

// Show fixes for failures
const fixable = checks.filter(c => c.fix);
if (fixable.length > 0) {
  console.log(`\n  ${B}Suggested Fixes:${X}`);
  fixable.forEach(c => {
    console.log(`    ${Y}→${X} ${c.name}: ${c.fix}`);
  });
}

// Auto-fix if requested
if (fixMode && fixable.length > 0) {
  console.log(`\n  ${B}Auto-fixing...${X}`);
  fixable.forEach(c => {
    if (c.fix && c.fix.startsWith('npm ')) {
      info(`Running: ${c.fix}`);
      run(c.fix);
    }
  });
  // Also run factory heal
  info('Running factory heal...');
  run('node bin/factory-runner.cjs --heal 2>&1');
  ok('Auto-fix complete');
}

emit('factory-doctor', 'diagnosis_complete', { passed, warned, failed, total, duration_ms: clock.ms() });
console.log('');
process.exit(failed > 0 ? 1 : 0);
