#!/usr/bin/env node
'use strict';

/**
 * session-scorecard.cjs — the proof, not the claim.
 *
 * The repo's thesis is "build with this and you get better results for fewer
 * tokens, and it compounds." A thesis you can't measure is marketing. This
 * tool turns the data the factory already collects into four numbers a senior
 * engineer can trust, plus a cross-session trend that shows whether they're
 * actually improving:
 *
 *   1. EFFICIENCY   median leanness of recent work slices (token/read/churn proxy)
 *                   — source: .mycelium/efficiency.json (efficiency-ledger.cjs)
 *   2. WASTE        re-reads, sprawl, high-churn slices — the avoidable spend
 *                   — source: efficiency ledger churn/reads/files signals
 *   3. CATCH-RATE   share of defects caught BEFORE ship vs. after
 *                   — source: .mycelium/events.jsonl severity + factory memory
 *   4. LEARNING     learning-system score trend (does memory pay off over time)
 *                   — source: .mycelium/eval-history.json
 *
 * It invents no new instrumentation: every number is read from files the
 * factory writes during normal use. Run it any time:
 *
 *   node bin/session-scorecard.cjs            # human report
 *   node bin/session-scorecard.cjs --json     # machine-readable
 *   node bin/session-scorecard.cjs --window=10 # last N slices (default 10)
 */

const fs = require('fs');
const path = require('path');

let colors;
try {
  ({ colors } = require('../tools/lib/aitell-common.cjs'));
} catch {
  colors = () => new Proxy({}, { get: () => '' });
}

const ROOT = path.resolve(__dirname, '..');
const MY = path.join(ROOT, '.mycelium');
const EFFICIENCY = path.join(MY, 'efficiency.json');
const EFFICIENCY_ARCHIVE = path.join(MY, 'efficiency-archive.json');
const EVENTS = path.join(MY, 'events.jsonl');
const EVAL_HISTORY = path.join(MY, 'eval-history.json');

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const C = colors(process.stdout);

function flag(name, dflt) {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : dflt;
}
const WINDOW = Math.max(1, parseInt(flag('window', '10'), 10) || 10);

// ── tiny io helpers ────────────────────────────────────────────────────────
function readJSON(fp, dflt) {
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return dflt;
  }
}
function readJSONL(fp) {
  try {
    return fs
      .readFileSync(fp, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}
function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

// ── 1 + 2 · EFFICIENCY & WASTE (from the slice ledger) ───────────────────────
function efficiencyAndWaste() {
  const live = readJSON(EFFICIENCY, { entries: [] });
  const archive = readJSON(EFFICIENCY_ARCHIVE, { entries: [] });
  const all = [...(archive.entries || []), ...(live.entries || [])];
  const recent = all.slice(-WINDOW);

  const leanScores = recent.map((e) => e.leanness).filter((n) => typeof n === 'number');
  const med = median(leanScores);

  // Waste signals — each is an avoidable cost the repo's doctrine warns about.
  let heavyReadSlices = 0; // > 15 reads in one slice = avoidable re-read churn
  let sprawlSlices = 0; // > 7 files touched for one slice
  let highChurnSlices = 0; // churnRatio > 200 = read/edit thrash
  for (const e of recent) {
    if (typeof e.reads === 'number' && e.reads > 15) heavyReadSlices++;
    if (typeof e.filesTouched === 'number' && e.filesTouched > 7) sprawlSlices++;
    if (typeof e.churnRatio === 'number' && e.churnRatio > 200) highChurnSlices++;
  }
  const wasteSlices = recent.filter(
    (e) =>
      (typeof e.reads === 'number' && e.reads > 15) ||
      (typeof e.filesTouched === 'number' && e.filesTouched > 7) ||
      (typeof e.churnRatio === 'number' && e.churnRatio > 200)
  ).length;

  // Trend: median of the older half vs. the newer half of the window.
  let trend = null;
  if (leanScores.length >= 4) {
    const half = Math.floor(leanScores.length / 2);
    const older = median(leanScores.slice(0, half));
    const newer = median(leanScores.slice(half));
    if (older != null && newer != null) trend = newer - older;
  }

  return {
    slicesConsidered: recent.length,
    medianLeanness: med,
    leanTrend: trend, // + = getting leaner
    waste: {
      wasteSlices,
      wasteRate: recent.length ? +(wasteSlices / recent.length).toFixed(2) : 0,
      heavyReadSlices,
      sprawlSlices,
      highChurnSlices,
    },
  };
}

// ── 3 · CATCH-RATE (defects caught before vs. after ship) ────────────────────
// Pre-ship catches = gate/lint/tsc/sentinel events with severity warn+ that
// fired during a build pipeline. Post-ship escapes = recorded defects in
// factory memory (a bug only gets a memory lesson once a human hit it).
function catchRate() {
  const events = readJSONL(EVENTS);
  const preShip = events.filter(
    (e) =>
      ['high', 'medium', 'warn'].includes(e.severity) &&
      e.event !== 'heartbeat'
  ).length;

  const fm = readJSON(path.join(MY, 'factory-memory.json'), {});
  const defects = (fm.defects || fm.buildHistory || []).length || 0;
  // Also count any rejected prompts/guards as pre-ship catches.
  const rejected = events.filter((e) => /reject|blocked|guard/i.test(e.event || '')).length;

  const totalPre = preShip + rejected;
  const totalIssues = totalPre + defects;
  return {
    preShipCatches: totalPre,
    postShipEscapes: defects,
    catchRate: totalIssues ? +(totalPre / totalIssues).toFixed(2) : null,
  };
}

// ── 4 · LEARNING (does the memory pay off over time) ─────────────────────────
function learningTrend() {
  const hist = readJSON(EVAL_HISTORY, { evaluations: [] });
  const evals = hist.evaluations || hist;
  if (!Array.isArray(evals) || evals.length === 0) return { points: 0 };
  const scores = evals.map((e) => e.overall).filter((n) => typeof n === 'number');
  const first = scores[0];
  const last = scores[scores.length - 1];
  const recent = scores.slice(-Math.min(5, scores.length));
  const recentAvg = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
  return {
    points: scores.length,
    firstScore: first,
    latestScore: last,
    recentAvg,
    delta: last != null && first != null ? last - first : null,
    repeatRate: evals[evals.length - 1].repeatRate ?? null,
  };
}

// ── composite "magnification" score ──────────────────────────────────────────
// One honest number, 0–100. It blends the four signals so a user sees a single
// north-star without losing the breakdown below it. Weighted toward the two
// things the thesis actually promises: efficiency and catching bugs early.
function magnification(eff, ctch, learn) {
  const parts = [];
  if (eff.medianLeanness != null) parts.push({ v: eff.medianLeanness, w: 0.35 });
  // Waste only counts as a signal once there are slices to judge — otherwise a
  // brand-new repo with zero data would score a misleading 100 on "no waste".
  if (eff.slicesConsidered > 0) parts.push({ v: (1 - eff.waste.wasteRate) * 100, w: 0.2 });
  if (ctch.catchRate != null) parts.push({ v: ctch.catchRate * 100, w: 0.3 });
  if (learn.recentAvg != null) parts.push({ v: learn.recentAvg, w: 0.15 });
  // No real signals → no honest composite. Return null, not a fake perfect score.
  if (!parts.length) return null;
  const wsum = parts.reduce((s, p) => s + p.w, 0) || 1;
  const score = parts.reduce((s, p) => s + p.v * p.w, 0) / wsum;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function build() {
  const eff = efficiencyAndWaste();
  const ctch = catchRate();
  const learn = learningTrend();
  const score = magnification(eff, ctch, learn);
  return { generatedAt: new Date().toISOString(), window: WINDOW, score, efficiency: eff, catch: ctch, learning: learn };
}

// ── render ───────────────────────────────────────────────────────────────────
function arrow(n) {
  if (n == null) return `${C.dim}—${C.r}`;
  if (n > 0) return `${C.green}↑ +${n}${C.r}`;
  if (n < 0) return `${C.red}↓ ${n}${C.r}`;
  return `${C.dim}→ 0${C.r}`;
}
function bar(pct, width = 20) {
  if (pct == null) return ' '.repeat(width);
  const filled = Math.round((pct / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}
function gradeColor(n) {
  if (n >= 80) return C.green;
  if (n >= 60) return C.cyan;
  if (n >= 40) return C.yellow;
  return C.red;
}

function render(r) {
  const g = gradeColor(r.score);
  const lines = [];
  lines.push('');
  lines.push(`  ${C.b}Session Scorecard${C.r} ${C.dim}— proof of compounding improvement${C.r}`);
  lines.push('');
  if (r.score == null) {
    lines.push(`  ${C.dim}— /100  (no data yet — log a few slices, then re-run)${C.r}`);
  } else {
    lines.push(`  ${g}${C.b}${r.score}/100${C.r}  ${g}${bar(r.score)}${C.r}  ${C.dim}magnification index${C.r}`);
  }
  lines.push('');

  const e = r.efficiency;
  lines.push(`  ${C.b}1 · Efficiency${C.r}  ${C.dim}(median leanness, last ${e.slicesConsidered} slices)${C.r}`);
  lines.push(`      ${e.medianLeanness == null ? C.dim + 'no slices logged yet' + C.r : gradeColor(e.medianLeanness) + e.medianLeanness + '/100' + C.r}   trend ${arrow(e.leanTrend)}`);
  lines.push('');

  const w = e.waste;
  lines.push(`  ${C.b}2 · Waste${C.r}  ${C.dim}(avoidable spend in window)${C.r}`);
  lines.push(`      ${w.wasteSlices} of ${e.slicesConsidered} slices flagged  ${C.dim}·${C.r}  re-reads:${w.heavyReadSlices} sprawl:${w.sprawlSlices} churn:${w.highChurnSlices}`);
  lines.push('');

  const c = r.catch;
  const crPct = c.catchRate == null ? null : Math.round(c.catchRate * 100);
  lines.push(`  ${C.b}3 · Catch-rate${C.r}  ${C.dim}(defects caught BEFORE ship)${C.r}`);
  lines.push(`      ${crPct == null ? C.dim + 'no data' + C.r : gradeColor(crPct) + crPct + '%' + C.r}   ${C.dim}pre-ship:${c.preShipCatches}  escaped:${c.postShipEscapes}${C.r}`);
  lines.push('');

  const l = r.learning;
  lines.push(`  ${C.b}4 · Learning${C.r}  ${C.dim}(engine score over ${l.points} evals)${C.r}`);
  if (l.points) {
    lines.push(`      ${gradeColor(l.recentAvg) + l.recentAvg + '/100' + C.r} recent avg   since first: ${arrow(l.delta)}   ${C.dim}repeat-rate:${l.repeatRate ?? '?'}${C.r}`);
  } else {
    lines.push(`      ${C.dim}no eval history — run: node mycelium.cjs --eval${C.r}`);
  }
  lines.push('');
  lines.push(`  ${C.dim}Every number above is read from data the factory already writes.${C.r}`);
  lines.push(`  ${C.dim}Re-run after a few work slices to watch the trend move.${C.r}`);
  lines.push('');
  return lines.join('\n');
}

function main() {
  const r = build();
  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(r, null, 2) + '\n');
  } else {
    process.stdout.write(render(r) + '\n');
  }
}

if (require.main === module) main();

module.exports = { build, efficiencyAndWaste, catchRate, learningTrend, magnification, median };
