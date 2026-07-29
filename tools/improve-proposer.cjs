#!/usr/bin/env node
/**
 * tools/improve-proposer.cjs — turns repeated trend signals into concrete,
 * HUMAN-GATED doctrine edit proposals. This is the closing stitch of the
 * self-improvement loop:
 *
 *   sensors (hooks) → trends (detector) → merge-diff (verdict)
 *     → improve-proposer (this) → human approves → doctrine gets smarter
 *
 * Why human-gated: an agent that can rewrite its own rules can also game
 * them (see CLAUDE.md "EVAL ANTI-GAMING"). So this tool NEVER edits doctrine
 * files. It writes a pending proposal with evidence and a suggested edit;
 * the human (or a PR the human approves) applies it.
 *
 * Rules encoded from the repo's own doctrine:
 *   - persistence threshold: a signal must fire in >= 3 observer runs before
 *     it earns a proposal (one-off blips are noise)
 *   - rate limit: max ONE new proposal per run — churn destroys the stability
 *     that makes this repo a good template
 *   - idempotent: a proposed signal is never re-proposed unless it clears and
 *     later returns (count resets after absence)
 *
 * Storage: .mycelium/improve-proposals.json (append-only proposals, capped,
 * same convention as efficiency.json / merge-diff.json).
 *
 * Reused by:
 *   tools/observer-runner.cjs (profile: post-merge, after mergeDiff)
 *   npm run improve / improve:json / improve:list
 *
 * Usage:
 *   node tools/improve-proposer.cjs            # scan + print new proposal (if any)
 *   node tools/improve-proposer.cjs --list     # print pending proposals
 *   node tools/improve-proposer.cjs --json     # machine-readable
 *   node tools/improve-proposer.cjs --quiet    # scan + write only (hooks)
 *   node tools/improve-proposer.cjs --dry-run  # compute, do not write
 *
 * Exit code is always 0 (advisory).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { colors } = require('./lib/aitell-common.cjs');

const ROOT = path.resolve(__dirname, '..');
const MYC = path.join(ROOT, '.mycelium');
const TRENDS = path.join(MYC, 'trends.json');
const STORE = path.join(MYC, 'improve-proposals.json');
const PERSISTENCE = 3; // signal must fire this many runs before proposing
const MAX_NEW_PER_RUN = 1; // rate limit: one proposal per merge, max
const CAP = 50;
const C = colors(process.stdout);

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const QUIET = args.includes('--quiet');
const DRY_RUN = args.includes('--dry-run');
const LIST = args.includes('--list');

function readJSON(file, dflt) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return dflt;
  }
}

/* Map a signal to the doctrine file that owns its domain. Keyword-based,
   conservative — when unsure, AI_PLAYBOOK.md (the canonical playbook). */
function targetDoc(signal) {
  const text = `${signal.id || ''} ${signal.summary || ''}`.toLowerCase();
  if (/(token|efficien|cost|leanness|churn|bundle|weight|slow|duration|perf)/.test(text)) return 'EFFICIENCY.md';
  if (/(mobile|ios|iphone|safari|viewport)/.test(text)) return 'AGENT-CONTEXT.md';
  if (/(brand|cross-contaminat|kintsugi)/.test(text)) return 'AGENT-CONTEXT.md';
  if (/(session|stall|protocol|compaction)/.test(text)) return 'CLAUDE.md';
  if (/(memory|mycelium|learn|observer)/.test(text)) return 'AI_PLAYBOOK.md';
  return 'AI_PLAYBOOK.md';
}

function buildProposal(signal, count) {
  const doc = targetDoc(signal);
  return {
    id: `imp-${Date.now()}`,
    ts: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    signalId: signal.id,
    severity: signal.severity || 'unknown',
    firedCount: count,
    status: 'pending',
    evidence: {
      summary: signal.summary || signal.id,
      direction: signal.direction || null,
      magnitude: signal.magnitude ?? null,
      sampleSize: signal.data && signal.data.sampleSize ? signal.data.sampleSize : null,
    },
    targetDoc: doc,
    suggestedEdit:
      `Add a rule to ${doc} addressing the recurring trend: "${signal.summary || signal.id}". ` +
      `The rule should (a) state the constraint in one line, (b) name the verification command ` +
      `that proves it, and (c) cite this proposal id for traceability.`,
    humanChecklist: [
      `Reproduce: confirm the trend is real (npm run trends)`,
      `Write the one-line rule in ${doc}`,
      `Mark this proposal resolved: set status to "resolved" in .mycelium/improve-proposals.json`,
    ],
  };
}

function main() {
  const store = readJSON(STORE, { version: 1, seen: {}, proposals: [] });
  store.seen = store.seen || {};
  store.proposals = store.proposals || [];

  if (LIST) {
    const pending = store.proposals.filter((p) => p.status === 'pending');
    if (JSON_OUT) {
      process.stdout.write(JSON.stringify(pending, null, 1) + '\n');
    } else if (!pending.length) {
      process.stdout.write('improve-proposer: no pending proposals.\n');
    } else {
      for (const p of pending) {
        process.stdout.write(`\n${C.b}${p.id}${C.r}  [${p.severity}]  fired ${p.firedCount}x  →  ${p.targetDoc}\n`);
        process.stdout.write(`  evidence: ${p.evidence.summary}\n`);
        process.stdout.write(`  edit:     ${p.suggestedEdit}\n`);
        for (const step of p.humanChecklist) process.stdout.write(`  ${C.dim}☐ ${step}${C.r}\n`);
      }
      process.stdout.write('\n');
    }
    return;
  }

  const trends = readJSON(TRENDS, null);
  const signals = trends && Array.isArray(trends.signals) ? trends.signals : [];
  const activeIds = new Set(signals.map((s) => s.id));

  /* Persistence bookkeeping: increment counts for active signals; a signal
     absent this run decays (not instant reset — one quiet run could be a
     flake; two absences = cleared). */
  for (const s of signals) {
    const rec = store.seen[s.id] || { count: 0, absent: 0, proposed: false };
    rec.count += 1;
    rec.absent = 0;
    store.seen[s.id] = rec;
  }
  for (const [id, rec] of Object.entries(store.seen)) {
    if (!activeIds.has(id)) {
      rec.absent = (rec.absent || 0) + 1;
      if (rec.absent >= 2) {
        rec.count = 0;
        rec.proposed = false; // eligible again if it returns
      }
    }
  }

  /* Earned proposals: persisted >= PERSISTENCE, not yet proposed. */
  const earned = signals.filter((s) => {
    const rec = store.seen[s.id];
    return rec && rec.count >= PERSISTENCE && !rec.proposed;
  });
  const newProposals = earned.slice(0, MAX_NEW_PER_RUN).map((s) => {
    store.seen[s.id].proposed = true;
    return buildProposal(s, store.seen[s.id].count);
  });

  if (!DRY_RUN) {
    store.proposals.push(...newProposals);
    while (store.proposals.length > CAP) store.proposals.shift();
    try {
      fs.mkdirSync(MYC, { recursive: true });
      fs.writeFileSync(STORE, JSON.stringify(store, null, 1));
    } catch (err) {
      process.stderr.write(`[improve-proposer] could not write ${STORE}: ${err.message}\n`);
    }
  }

  const pendingTotal = store.proposals.filter((p) => p.status === 'pending').length +
    (DRY_RUN ? newProposals.length : 0);

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ newProposals, pendingTotal, tracked: Object.keys(store.seen).length }, null, 1) + '\n');
    return;
  }
  if (QUIET) return;

  if (!newProposals.length) {
    process.stdout.write(`improve-proposer: no new proposals (${pendingTotal} pending, ${Object.keys(store.seen).length} signals tracked).\n`);
    return;
  }
  for (const p of newProposals) {
    process.stdout.write(`\n${C.yellow}NEW IMPROVEMENT PROPOSAL${C.r}  ${C.b}${p.id}${C.r}  [${p.severity}]  fired ${p.firedCount}x\n`);
    process.stdout.write(`  evidence: ${p.evidence.summary}\n`);
    process.stdout.write(`  target:   ${p.targetDoc}\n`);
    process.stdout.write(`  edit:     ${p.suggestedEdit}\n`);
    process.stdout.write(`  ${C.dim}human-gated: nothing was changed. Review with: npm run improve:list${C.r}\n\n`);
  }
}

main();
process.exit(0);
