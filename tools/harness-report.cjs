#!/usr/bin/env node
/**
 * tools/harness-report.cjs — turns private .mycelium/ state into a public,
 * renderable proof pack: public/static/data/harness-report.json.
 * ─────────────────────────────────────────────────────────────────────────
 * The learning machinery writes to .mycelium/ (private, gitignored-style
 * working state). The /harness dashboard needs a stable public snapshot.
 * This is the bridge. It reads what already exists — merge-diff verdicts,
 * eval history, efficiency leanness, trends, pending improvement proposals,
 * the golden-eval receipt — and writes one JSON the dashboard fetches.
 *
 * Design rules:
 *   - read-only on .mycelium/ (never writes there)
 *   - missing sources degrade gracefully (dashboard shows "no data yet")
 *   - numbers pass through verbatim; no re-scoring, no fabrication
 *   - runs in the build pipeline alongside the sentinel-report generator
 *
 * Usage:
 *   node tools/harness-report.cjs            # write + short summary
 *   node tools/harness-report.cjs --json     # print JSON, do not write
 *   node tools/harness-report.cjs --quiet    # write only (build pipeline)
 *
 * Exit code always 0 (a dashboard is never worth failing a build).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MYC = path.join(ROOT, '.mycelium');
const OUT = path.join(ROOT, 'public', 'static', 'data', 'harness-report.json');
const EVAL_RECEIPT = path.join(ROOT, 'evals', 'results', 'context-cost.json');
const OUTCOME_HISTORY = path.join(ROOT, 'evals', 'results', 'outcome-history.jsonl');
const OUTCOME_RECEIPT = path.join(ROOT, 'evals', 'results', 'outcome-eval.json');

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const QUIET = args.includes('--quiet');

function readJSON(file, dflt) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return dflt;
  }
}

function collect() {
  const mergeDiff = readJSON(path.join(MYC, 'merge-diff.json'), { snapshots: [] });
  const evalHist = readJSON(path.join(MYC, 'eval-history.json'), { evaluations: [] });
  const efficiency = readJSON(path.join(MYC, 'efficiency.json'), { entries: [] });
  const trends = readJSON(path.join(MYC, 'trends.json'), { signals: [] });
  const proposals = readJSON(path.join(MYC, 'improve-proposals.json'), { proposals: [] });
  const receipt = readJSON(EVAL_RECEIPT, null);

  const snaps = mergeDiff.snapshots || [];
  const evals = evalHist.evaluations || [];
  const entries = efficiency.entries || [];
  const lastEval = evals.length ? evals[evals.length - 1] : null;

  /* Verdict history for the sparkline: newest last, cap 20. */
  const verdicts = snaps.slice(-20).map((s) => ({
    date: s.date,
    verdict: s.verdict,
    score: s.score,
  }));

  /* Leanness trend: last 12 efficiency entries. */
  const leanness = entries.slice(-12).map((e) => ({
    date: e.date,
    leanness: e.leanness,
  }));

  /* Eval overall trend: last 12 evals. */
  const evalTrend = evals.slice(-12).map((e) => ({
    ts: e.ts,
    overall: e.overall,
    grade: e.grade,
  }));

  const pendingProposals = (proposals.proposals || []).filter((p) => p.status === 'pending');

  /* Outcome-eval time series: the proof is a TREND of MEMORY-HELPS across
     runs/model generations, not a snapshot. One line per --write run. */
  const outcomeHistory = (() => {
    try {
      return fs.readFileSync(OUTCOME_HISTORY, 'utf8')
        .split('\n').filter(Boolean)
        .map((l) => { try { return JSON.parse(l); } catch (_) { return null; } })
        .filter(Boolean);
    } catch (_) { return []; }
  })();
  const outcomeTrend = outcomeHistory.slice(-12).map((h) => ({
    ts: h.ts,
    overall: h.overall,
    models: h.models,
    runs: h.runs,
    taskCount: h.taskCount,
    factDelta: h.perModel
      ? Math.round((Object.values(h.perModel).reduce((a, m) => a + (m.factDelta || 0), 0)
          / Math.max(1, Object.keys(h.perModel).length)) * 1000) / 1000
      : null,
  }));
  const outcomeReceipt = readJSON(OUTCOME_RECEIPT, null);
  const outcome = outcomeReceipt ? {
    ts: outcomeReceipt.ts,
    overall: outcomeReceipt.overall,
    models: outcomeReceipt.models,
    runs: outcomeReceipt.runs,
    taskCount: outcomeReceipt.taskCount,
    authoredCount: outcomeReceipt.authoredCount,
    scores: outcomeReceipt.scores,
  } : null;

  return {
    generatedAt: new Date().toISOString(),
    verdicts,
    latest: snaps.length ? {
      date: snaps[snaps.length - 1].date,
      verdict: snaps[snaps.length - 1].verdict,
      score: snaps[snaps.length - 1].score,
      kpis: snaps[snaps.length - 1].kpis || null,
    } : null,
    eval: lastEval ? {
      overall: lastEval.overall,
      grade: lastEval.grade,
      ts: lastEval.ts,
      bundleKB: lastEval.bundleKB ?? null,
      fixRate: lastEval.fixRateAfterReal ?? null,
    } : null,
    evalTrend,
    leanness,
    trends: {
      active: (trends.signals || []).length,
      high: (trends.signals || []).filter((s) => s.severity === 'high').length,
      summaries: (trends.signals || []).slice(0, 3).map((s) => s.summary).filter(Boolean),
    },
    proposals: {
      pending: pendingProposals.length,
      items: pendingProposals.slice(0, 3).map((p) => ({
        id: p.id,
        severity: p.severity,
        firedCount: p.firedCount,
        targetDoc: p.targetDoc,
        summary: p.evidence && p.evidence.summary,
      })),
    },
    goldenEval: receipt ? {
      savedPct: receipt.totals.savedPct,
      savedTokens: receipt.totals.savedTokens,
      naiveTokens: receipt.totals.naiveTokens,
      harnessTokens: receipt.totals.harnessTokens,
      tasks: receipt.totals.tasks,
      generatedAt: receipt.generatedAt,
    } : null,
    outcome,
    outcomeTrend,
  };
}

function main() {
  const report = collect();

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(report, null, 1) + '\n');
    return;
  }

  try {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
  } catch (err) {
    process.stderr.write(`[harness-report] could not write ${OUT}: ${err.message}\n`);
  }

  if (QUIET) return;
  const v = report.latest;
  process.stdout.write(
    `harness-report → public/static/data/harness-report.json\n` +
    `  verdicts ${report.verdicts.length} · latest ${v ? v.verdict : '—'} · ` +
    `eval ${report.eval ? report.eval.overall : '—'} · trends ${report.trends.active} (${report.trends.high} high) · ` +
    `pending proposals ${report.proposals.pending} · golden eval ${report.goldenEval ? `-${report.goldenEval.savedPct}%` : '—'} · ` +
    `outcome ${report.outcome ? report.outcome.overall : '—'} (trend ${report.outcomeTrend.length} runs)\n`
  );
}

main();
process.exit(0);
