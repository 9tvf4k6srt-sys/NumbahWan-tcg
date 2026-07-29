#!/usr/bin/env node
/**
 * tools/merge-diff.cjs — merge-vs-merge verdict: did this merge make the repo
 * better, worse, or neither — measured, not vibes.
 * ─────────────────────────────────────────────────────────────────────────
 * The repo already has sensors (efficiency-ledger, eval-history, telemetry,
 * trend-detector). What it lacked was the reflex: one command that runs after
 * a merge and answers "compared to the last merge, are we better?" from the
 * data those sensors already collect. This is that reflex. No new sensors.
 *
 * KPIs (all read from existing stores, missing data degrades gracefully):
 *   - leanness      avg of efficiency-ledger entries in the merge window
 *   - evalOverall   latest mycelium eval score + delta vs baseline snapshot
 *   - bundleKB      latest bundle size from eval-history + delta
 *   - churn         commits / files / lines in the window (from git)
 *   - trends        active trend-detector signals by severity
 *
 * Verdict scoring is deliberately simple and explainable — each KPI casts a
 * vote (+1 / 0 / -1), the sum decides. No fake precision. Every number in the
 * report is traceable to its source file.
 *
 * Output: appends one snapshot to .mycelium/merge-diff.json (capped, append-
 * only, same convention as efficiency.json). First run records a baseline and
 * says FIRST-RUN — honest, because there is nothing to compare against yet.
 *
 * Reused by:
 *   tools/observer-runner.cjs (profile: post-merge)
 *   npm run merge-diff / merge-diff:json
 *
 * Usage:
 *   node tools/merge-diff.cjs            # human-readable verdict
 *   node tools/merge-diff.cjs --json     # machine-readable
 *   node tools/merge-diff.cjs --quiet    # only write the snapshot
 *   node tools/merge-diff.cjs --dry-run  # compute but do not write
 *
 * Exit code is always 0 (advisory — a regression is information, not a gate).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { colors } = require('./lib/aitell-common.cjs');

const ROOT = path.resolve(__dirname, '..');
const MYC = path.join(ROOT, '.mycelium');
const STORE = path.join(MYC, 'merge-diff.json');
const EFFICIENCY = path.join(MYC, 'efficiency.json');
const EVAL_HISTORY = path.join(MYC, 'eval-history.json');
const TRENDS = path.join(MYC, 'trends.json');
const CAP = 100;
const C = colors(process.stdout);

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const QUIET = args.includes('--quiet');
const DRY_RUN = args.includes('--dry-run');

// ── helpers ─────────────────────────────────────────────────────────────────
function readJSON(file, dflt) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return dflt;
  }
}

function sh(cmdArr) {
  const r = spawnSync(cmdArr[0], cmdArr.slice(1), { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) return '';
  return (r.stdout || '').trim();
}

function avg(nums) {
  const valid = nums.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (!valid.length) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

function delta(cur, prev) {
  if (typeof cur !== 'number' || typeof prev !== 'number') return null;
  return Math.round((cur - prev) * 10) / 10;
}

// ── KPI collectors ──────────────────────────────────────────────────────────
function gitWindow(prevCommit) {
  const head = sh(['git', 'rev-parse', '--short', 'HEAD']);
  const range = prevCommit ? `${prevCommit}..HEAD` : 'HEAD';
  const commits = prevCommit
    ? parseInt(sh(['git', 'rev-list', '--count', range]), 10) || 0
    : parseInt(sh(['git', 'rev-list', '--count', 'HEAD']), 10) || 0;
  const stat = sh(['git', 'diff', '--shortstat', range]);
  const files = (stat.match(/(\d+) files? changed/) || [])[1];
  const lines =
    parseInt((stat.match(/(\d+) insertions?/) || [])[1] || '0', 10) +
    parseInt((stat.match(/(\d+) deletions?/) || [])[1] || '0', 10);
  return {
    head,
    base: prevCommit || null,
    commits,
    filesTouched: files ? parseInt(files, 10) : 0,
    linesChanged: Number.isFinite(lines) ? lines : 0,
  };
}

function leannessInWindow(sinceTs) {
  const entries = (readJSON(EFFICIENCY, { entries: [] }).entries || []).filter(
    (e) => !sinceTs || (e.ts || 0) > sinceTs
  );
  return {
    n: entries.length,
    avgLeanness: avg(entries.map((e) => e.leanness)),
    avgChurnRatio: avg(entries.map((e) => e.churnRatio)),
  };
}

function latestEval() {
  const evals = readJSON(EVAL_HISTORY, { evaluations: [] }).evaluations || [];
  if (!evals.length) return null;
  const last = evals[evals.length - 1];
  return {
    ts: last.ts || null,
    overall: typeof last.overall === 'number' ? last.overall : null,
    grade: last.grade || null,
    fixRate: typeof last.fixRateAfterReal === 'number' ? last.fixRateAfterReal : null,
    repeatRate: typeof last.repeatRate === 'number' ? last.repeatRate : null,
    bundleKB: typeof last.bundleKB === 'number' ? last.bundleKB : null,
  };
}

function trendSignals() {
  const t = readJSON(TRENDS, null);
  if (!t || !Array.isArray(t.signals)) return { n: 0, high: 0, medium: 0, summaries: [] };
  const signals = t.signals;
  return {
    n: signals.length,
    high: signals.filter((s) => s.severity === 'high').length,
    medium: signals.filter((s) => s.severity === 'medium').length,
    summaries: signals.slice(0, 3).map((s) => s.summary).filter(Boolean),
  };
}

// ── verdict ─────────────────────────────────────────────────────────────────
function vote(cur, prev, betterWhenHigher, threshold) {
  const d = delta(cur, prev);
  if (d === null) return { d: null, v: 0 };
  if (Math.abs(d) < threshold) return { d, v: 0 };
  const improved = betterWhenHigher ? d > 0 : d < 0;
  return { d, v: improved ? 1 : -1 };
}

function buildVerdict(cur, prev) {
  if (!prev) {
    return { verdict: 'FIRST-RUN', score: 0, votes: [], note: 'baseline recorded — no previous merge to compare against' };
  }
  const votes = [];
  const push = (name, res, detail) => votes.push({ kpi: name, delta: res.d, vote: res.v, detail });

  push('leanness', vote(cur.kpis.leanness, prev.kpis.leanness, true, 3),
    'avg efficiency-ledger leanness in window (±3 = noise)');
  push('evalOverall', vote(cur.kpis.evalOverall, prev.kpis.evalOverall, true, 1),
    'latest mycelium eval score');
  push('bundleKB', vote(cur.kpis.bundleKB, prev.kpis.bundleKB, false, Math.max(5, (prev.kpis.bundleKB || 0) * 0.05)),
    'bundle size (±5% = noise)');
  const trendVote = cur.kpis.trendHigh > 0 ? -1 : 0;
  votes.push({ kpi: 'trends', delta: cur.kpis.trendHigh, vote: trendVote, detail: 'high-severity trend signals active' });

  const score = votes.reduce((a, v) => a + v.vote, 0);
  const verdict = score > 0 ? 'IMPROVED' : score < 0 ? 'REGRESSED' : 'STEADY';
  return { verdict, score, votes, note: null };
}

// ── main ────────────────────────────────────────────────────────────────────
function main() {
  const store = readJSON(STORE, { version: 1, snapshots: [] });
  const snapshots = store.snapshots || [];
  const prev = snapshots.length ? snapshots[snapshots.length - 1] : null;

  const window_ = gitWindow(prev && prev.git && prev.git.head);
  const lean = leannessInWindow(prev && prev.ts);
  const evalNow = latestEval();
  const trends = trendSignals();

  const snapshot = {
    ts: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    git: window_,
    kpis: {
      leanness: lean.avgLeanness,
      churnRatio: lean.avgChurnRatio,
      efficiencyEntries: lean.n,
      evalOverall: evalNow ? evalNow.overall : null,
      evalGrade: evalNow ? evalNow.grade : null,
      fixRate: evalNow ? evalNow.fixRate : null,
      repeatRate: evalNow ? evalNow.repeatRate : null,
      bundleKB: evalNow ? evalNow.bundleKB : null,
      trendSignals: trends.n,
      trendHigh: trends.high,
    },
    trendSummaries: trends.summaries,
  };

  const result = buildVerdict(snapshot, prev);
  snapshot.verdict = result.verdict;
  snapshot.score = result.score;
  snapshot.votes = result.votes;
  if (result.note) snapshot.note = result.note;

  if (!DRY_RUN) {
    snapshots.push(snapshot);
    while (snapshots.length > CAP) snapshots.shift();
    try {
      fs.mkdirSync(MYC, { recursive: true });
      fs.writeFileSync(STORE, JSON.stringify({ version: 1, snapshots }, null, 1));
    } catch (err) {
      process.stderr.write(`[merge-diff] could not write ${STORE}: ${err.message}\n`);
    }
  }

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(snapshot, null, 1) + '\n');
    return;
  }
  if (QUIET) return;

  const color =
    result.verdict === 'IMPROVED' ? C.green :
    result.verdict === 'REGRESSED' ? C.red :
    result.verdict === 'FIRST-RUN' ? C.cyan : C.dim;
  const base = window_.base ? `${window_.base}..${window_.head}` : window_.head;
  process.stdout.write(`\n${C.b}merge-diff${C.r}  ${color}${result.verdict}${C.r}  (score ${result.score})\n`);
  process.stdout.write(`  window     ${base}  ·  ${window_.commits} commits, ${window_.filesTouched} files, ${window_.linesChanged} lines\n`);
  const fmt = (v, unit) => (v === null || v === undefined ? '—' : `${v}${unit || ''}`);
  process.stdout.write(
    `  kpis       leanness ${fmt(snapshot.kpis.leanness)}  ·  eval ${fmt(snapshot.kpis.evalOverall)} (${snapshot.kpis.evalGrade || '—'})  ·  bundle ${fmt(snapshot.kpis.bundleKB, 'KB')}  ·  trends ${snapshot.kpis.trendSignals} (${snapshot.kpis.trendHigh} high)\n`
  );
  for (const v of result.votes) {
    if (v.vote === 0) continue;
    const mark = v.vote > 0 ? `${C.green}+${C.r}` : `${C.red}-${C.r}`;
    process.stdout.write(`  ${mark} ${v.kpi}: ${v.detail} (delta ${v.delta})\n`);
  }
  if (snapshot.trendSummaries.length) {
    for (const s of snapshot.trendSummaries) process.stdout.write(`  ${C.dim}trend:${C.r} ${s}\n`);
  }
  process.stdout.write(`  ${C.dim}snapshot → .mycelium/merge-diff.json (advisory, never blocks)${C.r}\n\n`);
}

main();
process.exit(0);
