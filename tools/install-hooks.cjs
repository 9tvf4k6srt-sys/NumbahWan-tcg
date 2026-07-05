#!/usr/bin/env node
/**
 * install-hooks.cjs — make the tracked git hooks ACTUALLY FIRE, no Husky needed.
 *
 * Why: the repo tracks hooks in .husky/ (pre-commit, post-commit, post-merge),
 * but they only run if git's core.hooksPath points at that dir. Husky normally
 * sets that during `npm install`, but in a fresh sandbox/clone Husky often is
 * not installed, so git falls back to .git/hooks (empty) and EVERY hook is
 * dormant. That is a second reason the learning systems go silent across
 * sessions: the post-commit heartbeat never fires.
 *
 * This installer points core.hooksPath at .husky and verifies the hooks are
 * executable. Idempotent — safe to run every session. No dependencies.
 *
 * Usage:
 *   node tools/install-hooks.cjs           # install + report
 *   node tools/install-hooks.cjs --check   # report only, exit 1 if not wired
 *   node tools/install-hooks.cjs --silent  # install, no output (for npm prepare / heartbeat)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HOOKS_DIR = '.husky';
const CHECK = process.argv.includes('--check');
const SILENT = process.argv.includes('--silent');

const C = process.stdout.isTTY
  ? { r:'\x1b[0m', b:'\x1b[1m', dim:'\x1b[2m', green:'\x1b[32m', yellow:'\x1b[33m', red:'\x1b[31m' }
  : { r:'', b:'', dim:'', green:'', yellow:'', red:'' };
const log = (s = '') => { if (!SILENT) process.stdout.write(s + '\n'); };

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function currentHooksPath() {
  try { return git(['config', '--local', 'core.hooksPath']); } catch { return ''; }
}

const dirAbs = path.join(ROOT, HOOKS_DIR);
const hooks = ['pre-commit', 'post-commit', 'post-merge'];
const present = hooks.filter((h) => fs.existsSync(path.join(dirAbs, h)));

if (CHECK) {
  const wired = currentHooksPath() === HOOKS_DIR;
  log('');
  log(`  ${C.b}GIT HOOKS${C.r}`);
  log(`  core.hooksPath = ${currentHooksPath() || C.dim + '(unset → .git/hooks, dormant)' + C.r}`);
  log(`  tracked hooks  = ${present.join(', ') || '(none)'}`);
  if (wired && present.length) {
    log(`  ${C.green}✓ hooks are active${C.r}`);
    process.exit(0);
  }
  log(`  ${C.yellow}✗ hooks NOT active — run: node bin/ai.cjs hooks${C.r}`);
  process.exit(1);
}

if (!fs.existsSync(dirAbs)) {
  log(`  ${C.red}✗ ${HOOKS_DIR}/ not found — nothing to install${C.r}`);
  process.exit(1);
}

// Point git at the tracked hooks dir (works without Husky installed).
// Guarded: `npm install` from a tarball / non-git context must never fail.
try {
  git(['config', '--local', 'core.hooksPath', HOOKS_DIR]);
} catch (err) {
  log(`  ${C.yellow}✗ could not set core.hooksPath (not a git checkout?)${C.r}`);
  process.exit(SILENT ? 0 : 1);
}

// Ensure each hook is executable.
let fixed = 0;
for (const h of present) {
  const fp = path.join(dirAbs, h);
  try {
    fs.chmodSync(fp, 0o755);
    fixed++;
  } catch { /* non-fatal */ }
}

log('');
log(`  ${C.b}GIT HOOKS — installed${C.r}`);
log(`  ${C.green}✓${C.r} core.hooksPath → ${HOOKS_DIR}`);
log(`  ${C.green}✓${C.r} ${fixed} hook${fixed === 1 ? '' : 's'} executable: ${present.join(', ')}`);
log(`  ${C.dim}post-commit now fires the heartbeat on every commit.${C.r}`);
process.exit(0);
