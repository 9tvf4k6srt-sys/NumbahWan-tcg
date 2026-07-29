#!/usr/bin/env node
/**
 * tools/add-failure-task.cjs — failure intake: turn a real breakage into an
 * outcome-eval task in the same commit that fixes it.
 * ─────────────────────────────────────────────────────────────────────────
 * Why: synthetic tasks can always be accused of "the builder taught to the
 * test". A task written from a REAL failure can't — reality authored it.
 * This is the eval's immune system: every breakage permanently tests that
 * the harness would have prevented it.
 *
 * Usage:
 *   node tools/add-failure-task.cjs --id fr-short-slug --kind fact|control|poison \
 *     --q "Question to an agent, demanding a short answer" \
 *     --require "must,contain" --forbid "must-not,contain" \
 *     --fact "One-line ground truth" --source "commit sha or PR or incident"
 *
 * Validates the entry, appends to evals/tasks/failures.json (tracked), and
 * refuses duplicates by id. Grading stays mechanical (require/forbid).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'evals', 'tasks', 'failures.json');
const KINDS = new Set(['fact', 'control', 'adversarial', 'poison']);

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function main() {
  const id = arg('id');
  const kind = arg('kind') || 'fact';
  const q = arg('q');
  const fact = arg('fact') || '';
  const source = arg('source') || '';
  const require = (arg('require') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const forbid = (arg('forbid') || '').split(',').map((s) => s.trim()).filter(Boolean);

  const problems = [];
  if (!id || !/^[a-z0-9-]+$/.test(id)) problems.push('--id must be kebab-case (e.g. fr-pm2-zombie)');
  if (!id.startsWith('fr-')) problems.push('--id must start with fr- (failure-reality)');
  if (!KINDS.has(kind)) problems.push('--kind must be one of: ' + [...KINDS].join(', '));
  if (!q || q.length < 10) problems.push('--q is required and should be a real question');
  if (!require.length) problems.push('--require needs at least one substring a correct answer must contain');
  if (!source) problems.push('--source is required — a failure task without provenance is just a synthetic task');

  if (problems.length) {
    console.error('Cannot add failure task:\n  - ' + problems.join('\n  - '));
    process.exit(1);
  }

  let db = { description: 'Tasks authored by REAL breakages (reality-written; immune to taught-to-the-test). One per fix commit.', failures: [] };
  try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { /* first entry */ }
  db.failures = db.failures || [];

  if (db.failures.some((f) => f.id === id)) {
    console.error('A failure task with id "' + id + '" already exists — failures are append-only.');
    process.exit(1);
  }

  db.failures.push({
    id, kind, q, require, forbid, fact, source,
    addedAt: new Date().toISOString().slice(0, 10),
  });
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2) + '\n');
  console.log('Added failure task ' + id + ' (' + db.failures.length + ' total) → evals/tasks/failures.json');
  console.log('It joins the outcome corpus on the next run: node evals/outcome-eval.cjs --dry-run');
}

main();
