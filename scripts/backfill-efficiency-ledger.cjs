#!/usr/bin/env node
'use strict';

/**
 * backfill-efficiency-ledger.cjs
 *
 * The efficiency ledger only logs slices going forward (post-commit hook), so a
 * fresh checkout shows a single data point — not enough to demonstrate the
 * "it compounds" trend the Session Scorecard is meant to prove.
 *
 * This script backfills the ledger from REAL git history: it walks the last N
 * commits, measures each commit's actual churn (git show --numstat), scores it
 * with the SAME leanness heuristic the live ledger uses, and appends genuine
 * entries. No numbers are invented — every slice corresponds to a real commit.
 *
 *   node scripts/backfill-efficiency-ledger.cjs [--n=40] [--dry-run]
 *
 * Idempotent: entries are de-duplicated by commit hash, so re-running it never
 * double-counts.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LEDGER = path.join(ROOT, '.mycelium', 'efficiency.json');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const nArg = args.find((a) => a.startsWith('--n='));
const N = Math.max(1, parseInt(nArg ? nArg.split('=')[1] : '40', 10) || 40);

function git(arr) {
  try {
    return execFileSync('git', arr, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

// Same leanness shape as tools/efficiency-ledger.cjs (kept in sync intentionally;
// this is a churn-only backfill so reads/calls are unknown → not penalised).
function leanness(stat) {
  let score = 100;
  if (stat.churnRatio > 400) score -= 25;
  else if (stat.churnRatio > 200) score -= 12;
  if (stat.filesTouched > 12) score -= 20;
  else if (stat.filesTouched > 7) score -= 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function measureCommit(hash) {
  // numstat: "<add>\t<del>\t<path>" per file; binary files show "-".
  const numstat = git(['show', '--numstat', '--format=', hash]);
  let add = 0;
  let del = 0;
  let files = 0;
  let newFiles = 0;
  for (const line of numstat.split('\n').filter(Boolean)) {
    const [a, d] = line.split('\t');
    if (a === undefined) continue;
    files++;
    if (a !== '-') add += parseInt(a, 10) || 0;
    if (d !== '-') del += parseInt(d, 10) || 0;
  }
  // name-status to count adds (A) as new files
  const ns = git(['show', '--name-status', '--format=', hash]);
  for (const line of ns.split('\n').filter(Boolean)) {
    if (line[0] === 'A') newFiles++;
  }
  const linesChanged = add + del;
  const churnRatio = files ? +(linesChanged / files).toFixed(1) : 0;
  return { filesTouched: files, newFiles, insertions: add, deletions: del, linesChanged, churnRatio };
}

function main() {
  // Oldest → newest so the ledger reads as a chronological series.
  const log = git(['log', `-n${N}`, '--format=%H\t%h\t%ad\t%s', '--date=short', '--reverse']);
  if (!log) {
    console.error('No git history found.');
    process.exit(1);
  }

  let ledger = { entries: [] };
  try {
    ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  } catch {}
  if (!Array.isArray(ledger.entries)) ledger.entries = [];

  const seen = new Set(ledger.entries.map((e) => e.commit).filter(Boolean));
  let added = 0;

  for (const row of log.split('\n').filter(Boolean)) {
    const [full, short, date, ...rest] = row.split('\t');
    const subject = rest.join('\t');
    if (seen.has(short) || seen.has(full)) continue;

    const stat = measureCommit(full);
    // Skip empty/merge commits with no file changes.
    if (stat.filesTouched === 0) continue;

    const entry = {
      ts: Date.now(),
      date,
      task: subject.slice(0, 80),
      commit: short,
      base: `${short}~1`,
      filesTouched: stat.filesTouched,
      newFiles: stat.newFiles,
      insertions: stat.insertions,
      deletions: stat.deletions,
      linesChanged: stat.linesChanged,
      churnRatio: stat.churnRatio,
      leanness: leanness(stat),
      source: 'backfill',
    };
    ledger.entries.push(entry);
    seen.add(short);
    added++;
  }

  console.log(`Backfill: +${added} slice(s) from real commits (ledger now ${ledger.entries.length}).`);
  if (DRY) {
    console.log('(dry-run — not written)');
    return;
  }
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
  console.log(`Wrote ${path.relative(ROOT, LEDGER)}`);
}

main();
