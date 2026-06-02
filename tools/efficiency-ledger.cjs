#!/usr/bin/env node
/**
 * tools/efficiency-ledger.cjs — a cost-proxy ledger for building lean
 * ====================================================================
 * The agent cannot see its own token usage at runtime, and post-task cost is
 * too coarse to learn from. So we measure the OBSERVABLE drivers of spend and
 * track whether they trend down over time. Cannot improve what you cannot
 * measure; this is the measurement.
 *
 * The proxy (all read from git, no API, model-agnostic):
 *   - filesTouched   how many files the slice changed
 *   - linesChanged   insertions + deletions since the slice's base
 *   - newFiles       files created (cheaper to reason about than edits-in-place)
 *   - churnRatio     linesChanged / max(filesTouched,1) — high churn on few
 *                    files often means read→edit→re-read thrash
 * Optional, if the human/agent knows them (passed as flags), we also store:
 *   - reads          full-file reads done (the #1 avoidable token sink here)
 *   - calls          tool calls made
 * These are honest if supplied and simply absent if not. No fabrication.
 *
 * A slice is scored 0..100 "leanness" from the proxy (higher = leaner). It is
 * GUIDANCE, never a gate. The point is the trend line, not any single number.
 *
 * Storage mirrors commit-telemetry: append-only JSON, capped, archive on
 * overflow. Lives at .mycelium/efficiency.json.
 *
 * Usage:
 *   node tools/efficiency-ledger.cjs log "<task>" [--reads=N] [--calls=N] [--base=<ref>]
 *   node tools/efficiency-ledger.cjs trend [--n=12]
 *   node tools/efficiency-ledger.cjs log "<task>" --json
 *
 * Exit code is always 0 (advisory).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { colors } = require('./lib/aitell-common.cjs');

const ROOT = path.resolve(__dirname, '..');
const LEDGER = path.join(ROOT, '.mycelium', 'efficiency.json');
const ARCHIVE = path.join(ROOT, '.mycelium', 'efficiency-archive.json');
const CAP = 300;
const C = colors(process.stdout);

const args = process.argv.slice(2);
const cmd = args[0];
const JSON_OUT = args.includes('--json');
function flag(name, dflt) {
  const a = args.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : dflt;
}

// ── git proxy ───────────────────────────────────────────────────────────────
function sh(cmdArr) {
  const r = spawnSync(cmdArr[0], cmdArr.slice(1), { cwd: ROOT, encoding: 'utf8' });
  return (r.stdout || '').trim();
}

// Measure the working slice: everything changed since `base` (default: the
// last pushed main, falling back to HEAD so it still works pre-commit).
function sliceStats(base) {
  let ref = base;
  if (!ref) {
    // prefer origin/main if it exists, else HEAD (staged+unstaged then count)
    const hasOriginMain = sh(['git', 'rev-parse', '--verify', '--quiet', 'origin/main']);
    ref = hasOriginMain ? 'origin/main' : 'HEAD';
  }
  // numstat across committed-since-base + staged + unstaged, de-duped by file
  const files = new Map(); // file -> {add, del}
  function ingest(numstat) {
    for (const line of numstat.split('\n').filter(Boolean)) {
      const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
      if (!m) continue;
      const add = m[1] === '-' ? 0 : parseInt(m[1], 10);
      const del = m[2] === '-' ? 0 : parseInt(m[2], 10);
      const f = m[3];
      const prev = files.get(f) || { add: 0, del: 0 };
      prev.add += add; prev.del += del;
      files.set(f, prev);
    }
  }
  // committed since base
  ingest(sh(['git', 'diff', '--numstat', `${ref}...HEAD`]));
  // staged
  ingest(sh(['git', 'diff', '--numstat', '--cached']));
  // unstaged
  ingest(sh(['git', 'diff', '--numstat']));

  // mark new files (added in any of the above)
  const added = new Set();
  for (const src of [
    sh(['git', 'diff', '--name-status', `${ref}...HEAD`]),
    sh(['git', 'diff', '--name-status', '--cached']),
    sh(['git', 'diff', '--name-status']),
  ]) {
    for (const line of src.split('\n').filter(Boolean)) {
      const [st, f] = line.split('\t');
      if (st && st[0] === 'A' && f) added.add(f);
    }
  }
  // untracked files do not appear in numstat; count their lines explicitly so a
  // slice that creates files is not under-reported.
  for (const line of sh(['git', 'status', '--porcelain']).split('\n').filter(Boolean)) {
    if (line.startsWith('?? ')) {
      const f = line.slice(3).trim();
      if (!f || f.endsWith('/')) continue; // skip dirs (shallow count only)
      let lc = 0;
      try { lc = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').length; } catch {}
      if (!files.has(f)) { files.set(f, { add: lc, del: 0 }); added.add(f); }
    }
  }

  let add = 0, del = 0;
  for (const v of files.values()) { add += v.add; del += v.del; }
  const filesTouched = files.size;
  const newFiles = [...files.keys()].filter(f => added.has(f)).length;
  const linesChanged = add + del;
  const churnRatio = filesTouched ? +(linesChanged / filesTouched).toFixed(1) : 0;

  return { base: ref, filesTouched, newFiles, insertions: add, deletions: del, linesChanged, churnRatio };
}

// ── leanness score (advisory) ────────────────────────────────────────────────
// We reward focused slices. The shape: a slice that touches few files with
// proportionate line changes and (if known) few reads/calls scores high.
// This is a heuristic, tuned to be forgiving — it should nudge, not nag.
function leanness(stat, reads, calls) {
  let score = 100;
  // churn thrash: very high lines-per-file often means read/edit churn
  if (stat.churnRatio > 400) score -= 25;
  else if (stat.churnRatio > 200) score -= 12;
  // sprawl: touching many files for one slice
  if (stat.filesTouched > 12) score -= 20;
  else if (stat.filesTouched > 7) score -= 8;
  // reads are the #1 avoidable sink, when known
  if (reads != null) {
    if (reads > 25) score -= 25;
    else if (reads > 15) score -= 12;
    else if (reads > 8) score -= 5;
  }
  if (calls != null) {
    if (calls > 60) score -= 20;
    else if (calls > 35) score -= 8;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function band(score) {
  if (score >= 80) return { tag: '✓', label: 'lean', col: C.green };
  if (score >= 55) return { tag: '·', label: 'ok', col: C.cyan };
  if (score >= 35) return { tag: '·', label: 'heavy', col: C.yellow };
  return { tag: '⚠', label: 'expensive', col: C.red };
}

// ── ledger io ─────────────────────────────────────────────────────────────────
function load() {
  try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')); } catch { return { entries: [] }; }
}
function save(data) {
  if (data.entries.length > CAP) {
    const overflow = data.entries.splice(0, data.entries.length - CAP);
    let archive = { entries: [] };
    try { archive = JSON.parse(fs.readFileSync(ARCHIVE, 'utf8')); } catch {}
    archive.entries.push(...overflow);
    fs.writeFileSync(ARCHIVE, JSON.stringify(archive, null, 2));
  }
  fs.writeFileSync(LEDGER, JSON.stringify(data, null, 2));
}

// ── commands ───────────────────────────────────────────────────────────────────
function cmdLog() {
  const task = args.find(a => !a.startsWith('--') && a !== 'log') || '(unnamed slice)';
  const reads = flag('reads') != null ? parseInt(flag('reads'), 10) : null;
  const calls = flag('calls') != null ? parseInt(flag('calls'), 10) : null;
  const stat = sliceStats(flag('base'));
  const score = leanness(stat, reads, calls);
  const entry = {
    ts: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    task: task.slice(0, 120),
    ...stat,
    reads, calls,
    leanness: score,
  };
  const data = load();
  data.entries.push(entry);
  save(data);

  if (JSON_OUT) { console.log(JSON.stringify(entry, null, 2)); return; }
  const b = band(score);
  console.log('');
  console.log(`  ${C.b}EFFICIENCY · slice logged${C.r}`);
  console.log(`  ${b.col}${b.tag} leanness ${score}/100 (${b.label})${C.r}  ${C.dim}vs ${stat.base}${C.r}`);
  console.log(`  ${stat.filesTouched} files · ${stat.linesChanged} lines (+${stat.insertions}/-${stat.deletions}) · churn ${stat.churnRatio}/file` +
    (reads != null ? ` · ${reads} reads` : '') + (calls != null ? ` · ${calls} calls` : ''));
  console.log(`  ${C.dim}task: ${entry.task}${C.r}`);
  if (score < 55) {
    console.log(`  ${C.yellow}heavy slice. record the cheaper move:${C.r}`);
    console.log(`  ${C.dim}node bin/ai.cjs memory constraint "efficiency" "<what to do less of next time>"${C.r}`);
  }
  console.log('');
}

function cmdTrend() {
  const n = parseInt(flag('n', '12'), 10);
  const data = load();
  const all = data.entries;
  if (JSON_OUT) { console.log(JSON.stringify({ entries: all.slice(-n) }, null, 2)); return; }
  console.log('');
  console.log(`  ${C.b}EFFICIENCY · trend${C.r}  ${C.dim}(${all.length} slices logged, showing last ${Math.min(n, all.length)})${C.r}`);
  console.log('  ═══════════════════════════════════════════════════════════');
  if (all.length === 0) {
    console.log(`  no slices logged yet. after a slice: ${C.cyan}node bin/ai.cjs efficiency log "<task>"${C.r}`);
    console.log('');
    return;
  }
  const recent = all.slice(-n);
  for (const e of recent) {
    const b = band(e.leanness);
    const bar = '█'.repeat(Math.round(e.leanness / 10)).padEnd(10, '░');
    console.log(`  ${e.date}  ${b.col}${bar} ${String(e.leanness).padStart(3)}${C.r}  ${C.dim}${e.filesTouched}f/${e.linesChanged}L${C.r}  ${e.task.slice(0, 40)}`);
  }
  // simple direction read: avg of first half vs second half
  if (recent.length >= 4) {
    const half = Math.floor(recent.length / 2);
    const avg = arr => Math.round(arr.reduce((a, x) => a + x.leanness, 0) / arr.length);
    const early = avg(recent.slice(0, half));
    const late = avg(recent.slice(half));
    const delta = late - early;
    const dir = delta > 4 ? `${C.green}leaner (+${delta})${C.r}` : delta < -4 ? `${C.red}heavier (${delta})${C.r}` : `${C.dim}flat${C.r}`;
    console.log('');
    console.log(`  direction: ${dir}  ${C.dim}(early avg ${early} → recent avg ${late})${C.r}`);
  }
  console.log('');
}

// ── dispatch ─────────────────────────────────────────────────────────────────
if (cmd === 'log') cmdLog();
else if (cmd === 'trend') cmdTrend();
else {
  console.log('');
  console.log('  efficiency-ledger — cost-proxy for building lean');
  console.log('  usage:');
  console.log('    node tools/efficiency-ledger.cjs log "<task>" [--reads=N] [--calls=N] [--base=<ref>]');
  console.log('    node tools/efficiency-ledger.cjs trend [--n=12]');
  console.log('');
}

process.exit(0);
