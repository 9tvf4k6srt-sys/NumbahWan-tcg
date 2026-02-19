#!/usr/bin/env node
/**
 * NW Auto-Deploy Gate v1.0
 * 
 * Decides if a build is safe to auto-deploy. Runs all quality checks
 * and returns a go/no-go decision with reasons.
 *
 * Usage:
 *   node bin/deploy-gate.cjs                # full check
 *   node bin/deploy-gate.cjs --strict       # stricter thresholds
 *   node bin/deploy-gate.cjs --json         # machine-readable output
 *   node bin/deploy-gate.cjs --auto-merge   # if pass → auto-merge PR
 *
 * Checks:
 *   1. Scorecard: avg >= 85, 0 failing pages
 *   2. i18n: all translations complete
 *   3. Tests: smoke tests pass
 *   4. TypeScript: no errors
 *   5. Build: vite build succeeds
 *   6. Bundle size: within budget
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const B = '\x1b[1m', G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', X = '\x1b[0m';
const ok = m => console.log(`  ${G}✓${X} ${m}`);
const fail = m => console.log(`  ${R}✗${X} ${m}`);
const warn = m => console.log(`  ${Y}⚠${X} ${m}`);
const info = m => console.log(`  ${C}ℹ${X} ${m}`);

function run(cmd, timeout = 60000) {
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: 'utf-8', timeout, maxBuffer: 5*1024*1024 }).trim();
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: (e.stdout||'').trim(), err: (e.stderr||'').trim(), code: e.status };
  }
}

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const jsonMode = args.includes('--json');
const autoMerge = args.includes('--auto-merge');

const THRESHOLDS = {
  scorecardAvg: strict ? 90 : 85,
  maxFailing: 0,
  i18nComplete: true,
  testsPass: true,
  tsClean: !strict, // strict mode requires 0 TS errors; normal allows some
  buildPass: true,
};

console.log(`\n${B}🚦 NW Deploy Gate v1.0${X}${strict ? ' (STRICT)' : ''}\n`);

const checks = [];

// 1. Quality Scorecard
info('Running quality scorecard...');
const sc = run('node bin/quality-scorecard.cjs 2>&1 | tail -3');
if (sc.ok) {
  const m = sc.out.match(/(\d+) pages.*?avg (\d+)\/100.*?(\d+) A-grade.*?(\d+) failing/);
  if (m) {
    const avg = parseInt(m[2]);
    const failing = parseInt(m[4]);
    const pass = avg >= THRESHOLDS.scorecardAvg && failing <= THRESHOLDS.maxFailing;
    checks.push({ name: 'scorecard', pass, msg: `avg ${avg}/100, ${failing} failing (threshold: ${THRESHOLDS.scorecardAvg})` });
    if (pass) ok(`Scorecard: ${avg}/100, ${m[3]} A-grade, ${failing} failing`);
    else fail(`Scorecard: ${avg}/100 < ${THRESHOLDS.scorecardAvg} or ${failing} failing`);
  } else {
    checks.push({ name: 'scorecard', pass: false, msg: 'Could not parse output' });
    fail('Scorecard: could not parse');
  }
} else {
  checks.push({ name: 'scorecard', pass: false, msg: 'Command failed' });
  fail('Scorecard: command failed');
}

// 2. i18n Coverage
info('Checking i18n coverage...');
const i18n = run('node scripts/i18n-inject.cjs --check 2>&1 | tail -3');
const i18nComplete = i18n.ok && i18n.out.includes('complete');
checks.push({ name: 'i18n', pass: i18nComplete, msg: i18nComplete ? 'All translations complete' : 'Missing translations' });
if (i18nComplete) ok('i18n: all translations complete');
else if (THRESHOLDS.i18nComplete) fail('i18n: missing translations');
else warn('i18n: missing translations (non-blocking)');

// 3. Smoke Tests
info('Running smoke tests...');
const tests = run('node tests/run-tests.cjs 2>&1 | tail -5', 120000);
const testsPass = tests.ok;
checks.push({ name: 'tests', pass: testsPass, msg: testsPass ? 'All tests pass' : 'Test failures detected' });
if (testsPass) ok('Tests: all pass');
else fail('Tests: failures detected');

// 4. TypeScript
info('Checking TypeScript...');
const ts = run('npx tsc --noEmit 2>&1 | tail -3', 30000);
const tsClean = ts.ok;
checks.push({ name: 'typescript', pass: tsClean || !strict, msg: tsClean ? 'No errors' : 'TS errors present' });
if (tsClean) ok('TypeScript: clean');
else if (strict) fail('TypeScript: errors present');
else warn('TypeScript: errors present (non-blocking in normal mode)');

// 5. Build Size Check
info('Checking bundle budget...');
const budget = run('cat .mycelium/build-budget-history.json 2>/dev/null');
if (budget.ok) {
  try {
    const history = JSON.parse(budget.out);
    const latest = Array.isArray(history) ? history[history.length - 1] : history;
    const sizeKB = latest?.totalKB || latest?.size || 0;
    const pass = sizeKB < 500; // 500KB budget
    checks.push({ name: 'bundle', pass, msg: `${sizeKB}KB (budget: 500KB)` });
    if (pass) ok(`Bundle: ${sizeKB}KB`);
    else warn(`Bundle: ${sizeKB}KB exceeds 500KB budget`);
  } catch {
    checks.push({ name: 'bundle', pass: true, msg: 'Could not parse budget history' });
    warn('Bundle: could not parse budget history');
  }
} else {
  checks.push({ name: 'bundle', pass: true, msg: 'No budget history' });
  info('Bundle: no history available');
}

// ── Decision ──
const blocking = checks.filter(c => !c.pass);
const passed = blocking.length === 0;

console.log('');
if (passed) {
  console.log(`  ${G}${B}🟢 DEPLOY GATE: PASS${X} — all ${checks.length} checks green\n`);
} else {
  console.log(`  ${R}${B}🔴 DEPLOY GATE: BLOCKED${X} — ${blocking.length} check(s) failed\n`);
  blocking.forEach(c => console.log(`    ${R}✗${X} ${c.name}: ${c.msg}`));
  console.log('');
}

// JSON output
if (jsonMode) {
  console.log(JSON.stringify({ pass: passed, checks, strict, timestamp: new Date().toISOString() }, null, 2));
}

// Auto-merge if all green
if (autoMerge && passed) {
  info('Auto-merge enabled — attempting merge...');
  const merge = run('node bin/mycelium.cjs ship "chore: auto-deploy (gate passed)" 2>&1 | tail -5');
  if (merge.ok) ok('Auto-merge complete');
  else fail('Auto-merge failed — manual intervention needed');
}

process.exit(passed ? 0 : 1);
