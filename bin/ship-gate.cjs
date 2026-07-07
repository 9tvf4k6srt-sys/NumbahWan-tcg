#!/usr/bin/env node
/**
 * NW Ship Gate v1.0: one command, every quality gate, changed-file aware.
 *
 * Why this exists: the repo has 200+ npm scripts and the quality gates live
 * in five different namespaces (lint:landing, aitell, scorecard, test:i18n,
 * factory:gate). Every gate only fired when someone remembered to run it.
 * This runner is the single entry point that local hooks AND GitHub Actions
 * CI both call, so what passes locally is exactly what passes in CI.
 *
 * Design constraints honored:
 *   - Zero npm dependencies (Node builtins only), so CI never needs npm ci.
 *   - Changed-file scoped by default: the repo carries pre-existing debt
 *     (aitell --all: ~40 blocking, i18n guard full run: ~89 failures,
 *     scorecard: 2 failing pages). A repo-wide gate would be red on day one
 *     and teach everyone to ignore it. Scoping to the diff means every PR
 *     is judged only on what it touched, and debt burns down naturally.
 *   - Repo-wide where already clean: landing-lint --all is currently green,
 *     so it runs unscoped and stays a hard floor.
 *
 * Gates:
 *   1. syntax        node --check on changed .cjs/.mjs files        BLOCKING
 *   2. landing-lint  tools/landing-lint.cjs --all (repo-wide)       BLOCKING
 *   3. aitell        tools/ai-tell-lint.cjs --file= per changed
 *                    .html/.md file                                 BLOCKING
 *   4. scorecard     bin/quality-scorecard.cjs --json, changed
 *                    public pages must score >= 70                  BLOCKING
 *   5. i18n          tests/nw-i18n-guard.cjs per changed top-level
 *                    public/*.html page                             BLOCKING
 *   6. smoke         tests/smoke-test.cjs (needs live server),
 *                    only with --smoke                              OPT-IN
 *
 * Usage:
 *   node bin/ship-gate.cjs                     # diff vs origin/main (or HEAD~1)
 *   node bin/ship-gate.cjs --base=origin/main  # explicit diff base
 *   node bin/ship-gate.cjs --all               # ignore diff, gate everything
 *   node bin/ship-gate.cjs --ci                # plain output, base from GITHUB_BASE_REF
 *   node bin/ship-gate.cjs --smoke             # include smoke test (server on :8788)
 *   node bin/ship-gate.cjs --json              # machine-readable result
 *   node bin/ship-gate.cjs --install-ci        # copy every ci/*.yml into
 *                                              # .github/workflows/ (the bot
 *                                              # token cannot push workflow
 *                                              # files; a human commits them
 *                                              # once with their own creds)
 *
 * Exit code: 0 = ship it, 1 = blocked.
 */
'use strict';

const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const ALL = args.includes('--all');
const CI = args.includes('--ci') || !!process.env.CI;
const JSON_OUT = args.includes('--json');
const SMOKE = args.includes('--smoke');
const BASE_ARG = (args.find(a => a.startsWith('--base=')) || '').slice(7);

if (args.includes('--install-ci')) {
  const srcDir = path.join(ROOT, 'ci');
  const dstDir = path.join(ROOT, '.github', 'workflows');
  fs.mkdirSync(dstDir, { recursive: true });
  const ymls = fs.readdirSync(srcDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  for (const f of ymls) {
    fs.copyFileSync(path.join(srcDir, f), path.join(dstDir, f));
    console.log(`installed .github/workflows/${f}`);
  }
  console.log('commit with YOUR credentials (bot tokens cannot push workflow files):');
  console.log('  git add .github/workflows/ && git commit -m "ci: install workflows" && git push');
  process.exit(0);
}

// TTY-aware colors, silent under --ci / pipes
const useColor = !CI && !JSON_OUT && process.stdout.isTTY;
const c = (n) => useColor ? `\x1b[${n}m` : '';
const B = c(1), G = c(32), R = c(31), Y = c(33), D = c(2), X = c(0);

function sh(cmd, cmdArgs, opts = {}) {
  try {
    const out = execFileSync(cmd, cmdArgs, {
      cwd: ROOT, encoding: 'utf-8', timeout: opts.timeout || 120000,
      maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status == null ? 1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

// ── Resolve diff base and changed files ─────────────────────────────
function resolveBase() {
  if (BASE_ARG) return BASE_ARG;
  if (process.env.GITHUB_BASE_REF) return `origin/${process.env.GITHUB_BASE_REF}`;
  // Prefer merge-base with origin/main; fall back to previous commit.
  const probe = sh('git', ['rev-parse', '--verify', '--quiet', 'origin/main']);
  if (probe.code === 0) return 'origin/main';
  return 'HEAD~1';
}

function changedFiles(base) {
  // merge-base three-dot diff: only THIS branch's changes, not drift on main
  const r = sh('git', ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`]);
  if (r.code !== 0) {
    // Shallow clone or unknown ref: two-dot fallback, then give up to --all
    const r2 = sh('git', ['diff', '--name-only', '--diff-filter=ACMR', base]);
    if (r2.code !== 0) return null;
    return r2.out.split('\n').filter(Boolean);
  }
  const committed = r.out.split('\n').filter(Boolean);
  // Also include uncommitted AND untracked work so the local run judges
  // what you WOULD ship, not just what you already committed.
  const dirty = sh('git', ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']);
  const staged = sh('git', ['diff', '--name-only', '--cached', '--diff-filter=ACMR']);
  const untracked = sh('git', ['ls-files', '--others', '--exclude-standard']);
  const set = new Set(committed);
  for (const f of (dirty.out || '').split('\n')) if (f) set.add(f);
  for (const f of (staged.out || '').split('\n')) if (f) set.add(f);
  for (const f of (untracked.out || '').split('\n')) if (f) set.add(f);
  return [...set].filter(f => fs.existsSync(path.join(ROOT, f)));
}

// ── Gate implementations ────────────────────────────────────────────
// Each returns { status: 'pass'|'fail'|'skip', detail, failures: [] }

function gateSyntax(files) {
  const targets = files.filter(f =>
    (f.endsWith('.cjs') || f.endsWith('.mjs')) &&
    !f.startsWith('node_modules/') && !f.startsWith('dist/'));
  if (targets.length === 0) return { status: 'skip', detail: 'no changed .cjs/.mjs files' };
  const failures = [];
  for (const f of targets) {
    const r = sh(process.execPath, ['--check', f]);
    if (r.code !== 0) failures.push(`${f}: ${r.out.split('\n')[0]}`);
  }
  return failures.length
    ? { status: 'fail', detail: `${failures.length}/${targets.length} files broken`, failures }
    : { status: 'pass', detail: `${targets.length} file(s) parse clean` };
}

function gateLandingLint() {
  const r = sh(process.execPath, ['tools/landing-lint.cjs', '--all']);
  const m = r.out.match(/Result: (.+)/);
  return r.code === 0
    ? { status: 'pass', detail: m ? m[1].trim() : 'clean' }
    : { status: 'fail', detail: 'blocking issues', failures: r.out.split('\n').filter(l => /✗|D\d|H\d|M\d|A\d/.test(l)).slice(0, 12) };
}

function gateAitell(files) {
  const targets = files.filter(f =>
    (f.endsWith('.html') || f.endsWith('.md')) &&
    !f.startsWith('node_modules/') && !f.startsWith('dist/'));
  if (targets.length === 0) return { status: 'skip', detail: 'no changed .html/.md files' };
  const failures = [];
  for (const f of targets) {
    const r = sh(process.execPath, ['tools/ai-tell-lint.cjs', `--file=${f}`]);
    if (r.code !== 0) {
      const lines = r.out.split('\n').filter(l => /WARN|BLOCK/.test(l)).slice(0, 6);
      failures.push(`${f}:`, ...lines.map(l => '  ' + l.trim()));
    }
  }
  return failures.length
    ? { status: 'fail', detail: 'AI-tell blocking issues in changed files', failures }
    : { status: 'pass', detail: `${targets.length} file(s) read human` };
}

function gateScorecard(files) {
  const pages = files.filter(f =>
    f.startsWith('public/') && f.endsWith('.html') &&
    !path.basename(f).startsWith('_'));
  if (pages.length === 0 && !ALL) return { status: 'skip', detail: 'no changed public pages' };
  const r = sh(process.execPath, ['bin/quality-scorecard.cjs', '--json'], { timeout: 180000 });
  if (r.code !== 0) return { status: 'fail', detail: 'scorecard crashed', failures: [r.out.slice(0, 400)] };
  let results;
  try { results = JSON.parse(r.out); } catch {
    return { status: 'fail', detail: 'scorecard emitted invalid JSON', failures: [] };
  }
  const avg = Math.round(results.reduce((s, p) => s + p.score, 0) / results.length);
  const byPage = new Map(results.map(p => [p.page, p]));
  const judged = ALL ? results : pages
    .map(f => byPage.get(path.relative('public', f)) || byPage.get(f.replace(/^public\//, '')))
    .filter(Boolean);
  const failing = judged.filter(p => p.score < 70);
  if (failing.length) {
    return {
      status: 'fail',
      detail: `${failing.length} changed page(s) below 70 (repo avg ${avg})`,
      failures: failing.map(p => `${p.page}: ${p.score}/100 (${p.grade})`),
    };
  }
  const scored = judged.map(p => `${p.page} ${p.score}`).slice(0, 5).join(', ');
  return { status: 'pass', detail: `${judged.length} page(s) >= 70 (${scored}${judged.length > 5 ? ', ...' : ''}); repo avg ${avg}` };
}

function gateI18n(files) {
  // i18n guard's repo scope is top-level public/*.html only; mirror that.
  const pages = files.filter(f =>
    /^public\/[^/]+\.html$/.test(f) && !path.basename(f).startsWith('_'));
  if (pages.length === 0) return { status: 'skip', detail: 'no changed top-level public pages' };
  const failures = [];
  for (const f of pages) {
    const rel = f.replace(/^public\//, '');
    const r = sh(process.execPath, ['tests/nw-i18n-guard.cjs', rel], { timeout: 60000 });
    if (r.code !== 0) {
      const lines = r.out.replace(/\x1b\[[0-9;]*m/g, '').split('\n')
        .filter(l => /•|missing|orphan|FAILED/.test(l)).slice(0, 6);
      failures.push(`${rel}:`, ...lines.map(l => '  ' + l.trim()));
    }
  }
  return failures.length
    ? { status: 'fail', detail: 'i18n failures in changed pages', failures }
    : { status: 'pass', detail: `${pages.length} page(s) i18n clean` };
}

function gateSmoke() {
  if (!SMOKE) return { status: 'skip', detail: 'opt-in (--smoke, needs server on :8788)' };
  const r = sh(process.execPath, ['tests/smoke-test.cjs'], { timeout: 300000 });
  const m = r.out.match(/SMOKE TEST v2: (\d+)\/(\d+) passed/);
  return r.code === 0
    ? { status: 'pass', detail: m ? `${m[1]}/${m[2]} checks` : 'passed' }
    : { status: 'fail', detail: m ? `${m[1]}/${m[2]} checks` : 'failures', failures: r.out.split('\n').filter(l => l.includes(' — ')).slice(0, 10) };
}

// ── Run ─────────────────────────────────────────────────────────────
function main() {
  const base = ALL ? null : resolveBase();
  let files = [];
  let scopeNote;
  if (ALL) {
    // Repo-wide: hand every tracked file to the scoped gates
    const r = sh('git', ['ls-files']);
    files = r.out.split('\n').filter(Boolean);
    scopeNote = 'FULL REPO (--all)';
  } else {
    const changed = changedFiles(base);
    if (changed === null) {
      console.error(`${Y}cannot diff against ${base}; falling back to --all${X}`);
      const r = sh('git', ['ls-files']);
      files = r.out.split('\n').filter(Boolean);
      scopeNote = `FULL REPO (diff vs ${base} failed)`;
    } else {
      files = changed;
      scopeNote = `${files.length} changed file(s) vs ${base}`;
    }
  }

  if (!JSON_OUT) {
    console.log(`\n${B}NW Ship Gate v1.0${X}  ${D}${scopeNote}${X}\n`);
  }

  const gates = [
    ['syntax', () => gateSyntax(files)],
    ['landing-lint', gateLandingLint],
    ['aitell', () => gateAitell(files)],
    ['scorecard', () => gateScorecard(files)],
    ['i18n', () => gateI18n(files)],
    ['smoke', gateSmoke],
  ];

  const results = [];
  let blocked = 0;
  for (const [name, fn] of gates) {
    const t0 = Date.now();
    let res;
    try { res = fn(); } catch (e) { res = { status: 'fail', detail: `gate crashed: ${e.message}`, failures: [] }; }
    res.name = name;
    res.ms = Date.now() - t0;
    results.push(res);
    if (res.status === 'fail') blocked++;
    if (!JSON_OUT) {
      const icon = res.status === 'pass' ? `${G}PASS${X}` : res.status === 'fail' ? `${R}FAIL${X}` : `${D}skip${X}`;
      console.log(`  ${icon}  ${B}${name.padEnd(14)}${X}${res.detail}  ${D}${res.ms}ms${X}`);
      for (const line of res.failures || []) console.log(`         ${R}${line}${X}`);
    }
  }

  const verdict = blocked === 0;
  if (JSON_OUT) {
    console.log(JSON.stringify({ ship: verdict, scope: scopeNote, gates: results }, null, 2));
  } else {
    console.log(verdict
      ? `\n  ${G}${B}SHIP IT${X}  all gates green\n`
      : `\n  ${R}${B}BLOCKED${X}  ${blocked} gate(s) failing\n`);
  }
  process.exit(verdict ? 0 : 1);
}

main();
