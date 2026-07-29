#!/usr/bin/env node
/**
 * tools/failure-intake-lint.cjs — advisory intake check.
 * ─────────────────────────────────────────────────────────────────────────
 * If the staged commit is a fix (message starts with fix[:(]) but doesn't
 * touch evals/tasks/failures.json, print a reminder that real breakages
 * should become outcome-eval tasks. ADVISORY ONLY — never blocks a commit
 * (not every fix deserves a task; judgment stays human).
 *
 * Wired at the tail of .husky/pre-commit. Exit code always 0.
 */

'use strict';

const { execSync } = require('child_process');

function sh(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(); }
  catch (_) { return ''; }
}

function main() {
  const msgFile = process.argv[2];
  // In pre-commit there is no message yet — inspect the staged diff intent via
  // the branch's in-progress commit message if present, else staged files only.
  let isFix = false;
  if (msgFile) {
    const fs = require('fs');
    try { isFix = /^fix(\(|:)/i.test(fs.readFileSync(msgFile, 'utf8')); } catch (_) { /* no msg */ }
  } else {
    // pre-commit: no message file; use a light heuristic — allow override via env.
    isFix = process.env.FAILURE_INTAKE_ASSUME_FIX === '1';
  }
  if (!isFix) process.exit(0);

  const staged = sh('git diff --cached --name-only');
  if (staged.split('\n').includes('evals/tasks/failures.json')) process.exit(0);

  process.stderr.write(
    '\n  [failure-intake] This looks like a fix commit but evals/tasks/failures.json is untouched.\n' +
    '  If this fixes a REAL breakage, record it so reality keeps authoring the eval:\n' +
    '    node tools/add-failure-task.cjs --id fr-<slug> --kind fact \\\n' +
    '      --q "..." --require "..." --forbid "..." --source "what broke + where"\n' +
    '  (advisory — not every fix deserves a task; commit proceeds)\n\n'
  );
  process.exit(0);
}

main();
