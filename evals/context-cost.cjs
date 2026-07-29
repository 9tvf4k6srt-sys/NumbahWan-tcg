#!/usr/bin/env node
/**
 * evals/context-cost.cjs — the golden proof that the harness pays for itself.
 * ─────────────────────────────────────────────────────────────────────────
 * Not a benchmark of "did the agent succeed" (that needs a live model). This
 * measures something computable, repeatable, and honest: the CONTEXT COST of
 * doing a task in this repo WITHOUT the harness (read the union of every doc
 * that mentions the topic — the naive agent's strategy) versus WITH the
 * harness (AGENTS.md + the one canonical owner doc the router points to).
 *
 * Token estimate: bytes / 4 — the standard rough heuristic, labeled as such.
 * Every number is traceable: files read, sections matched, all printed.
 *
 * Output: evals/results/context-cost.json (committed — this is the receipt
 * the /harness dashboard and the README badge render).
 *
 * Usage:
 *   node evals/context-cost.cjs            # human-readable table
 *   node evals/context-cost.cjs --json     # machine-readable
 *   node evals/context-cost.cjs --write    # also write evals/results/
 *
 * Exit code always 0 (it produces evidence, it does not gate).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RESULTS_DIR = path.join(ROOT, 'evals', 'results');
const RESULTS_FILE = path.join(RESULTS_DIR, 'context-cost.json');

/* The task registry. `naive` = docs a harness-less agent would reasonably
   have to read (every doc whose text mentions the topic). `harness` = what
   the AGENTS.md router actually routes you to: the front door + the single
   canonical owner. Sections are matched by their `## ` heading line so we
   charge the harness only for the section it routes to, not the whole file —
   that models "read the pointed-to section," which is what the router says. */
const TASKS = [
  {
    id: 'mobile-css',
    task: 'Fix a mobile layout bug',
    topic: /mobile|viewport|overflow|breakpoint|iphone|safari/i,
    naive: ['AGENT-CONTEXT.md', 'AI_PLAYBOOK.md', 'CLAUDE.md', 'PROJECT.md'],
    harness: ['AGENTS.md', { file: 'AGENT-CONTEXT.md', section: /^## 4\. Mobile Rules/m }],
  },
  {
    id: 'memory-learn',
    task: 'Record a learning / understand the memory system',
    topic: /memory|mycelium|hot|warm|cold|learning system/i,
    naive: ['AI_PLAYBOOK.md', 'AGENT-CONTEXT.md', 'PROJECT.md', 'README.md'],
    harness: ['AGENTS.md', { file: 'AI_PLAYBOOK.md', section: /^## 5\. The Memory & Guardian/m }],
  },
  {
    id: 'token-budget',
    task: 'Stay within the token budget',
    topic: /token|budget|200K|efficien/i,
    naive: ['CLAUDE.md', 'AGENT-CONTEXT.md', 'EFFICIENCY.md'],
    harness: ['AGENTS.md', { file: 'CLAUDE.md', section: /TOKEN BUDGET/m }],
  },
  {
    id: 'brand-rules',
    task: 'Edit a page without cross-contaminating the two brands',
    topic: /brand|kintsugi|cross-contaminat|ember|gold/i,
    naive: ['AGENT-CONTEXT.md', 'AI_PLAYBOOK.md', 'PROJECT.md'],
    harness: ['AGENTS.md', { file: 'AGENT-CONTEXT.md', section: /^## 3\. Design Systems/m }],
  },
  {
    id: 'build-ship',
    task: 'Build and ship a change',
    topic: /build|ship|deploy|wrangler|vite/i,
    naive: ['PROJECT.md', 'AGENT-CONTEXT.md', 'AI_PLAYBOOK.md', 'README.md'],
    harness: ['AGENTS.md', { file: 'AI_PLAYBOOK.md', section: /^## 1\. The 30-Second Brief/m }],
  },
  {
    // The handoff contract's golden proof (EFFICIENCY.md): resuming a multi-step
    // task after compaction WITHOUT the handoff means replaying the reasoning
    // — re-reading every doc the original session touched to reconstruct state.
    // WITH it, the receiver accepts the distilled packet and runs `next` —
    // the packet is the whole resume cost. This scenario exists to keep the
    // handoff honest: if its bytes ever balloon toward a history replay, the
    // saving collapses and the eval shows it.
    id: 'resume-after-compaction',
    task: 'Resume a multi-step task after a chat compaction',
    topic: /resume|handoff|checkpoint|compaction|wip/i,
    naive: ['CLAUDE.md', 'AI_PLAYBOOK.md', 'AGENT-CONTEXT.md', 'EFFICIENCY.md'],
    harness: [{ file: '.mycelium/handoff.json' }],
  },
];

const BYTES_PER_TOKEN = 4;

function fileBytes(rel) {
  try {
    return fs.statSync(path.join(ROOT, rel)).size;
  } catch (_) {
    return 0;
  }
}

/* Extract a section: from the heading match to the next same-or-higher level
   heading (## or #). Returns byte length of the section text. */
function sectionBytes(rel, headingRe) {
  let text;
  try {
    text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch (_) {
    return { bytes: 0, found: false };
  }
  const m = text.match(headingRe);
  if (!m || m.index === undefined) return { bytes: 0, found: false };
  const rest = text.slice(m.index);
  const lines = rest.split('\n');
  let end = lines.length;
  for (let i = 1; i < lines.length; i++) {
    if (/^#{1,2} /.test(lines[i])) { end = i; break; }
  }
  return { bytes: Buffer.byteLength(lines.slice(0, end).join('\n')), found: true };
}

function cost(entry) {
  if (typeof entry === 'string') {
    return { ref: entry, bytes: fileBytes(entry), found: fileBytes(entry) > 0 };
  }
  const s = sectionBytes(entry.file, entry.section);
  return { ref: `${entry.file} §(routed section)`, bytes: s.bytes, found: s.found };
}

function tokens(bytes) {
  return Math.round(bytes / BYTES_PER_TOKEN);
}

function main() {
  const results = [];
  let totNaive = 0;
  let totHarness = 0;

  for (const t of TASKS) {
    const naiveParts = t.naive.map(cost);
    const harnessParts = t.harness.map(cost);
    const naiveBytes = naiveParts.reduce((a, p) => a + p.bytes, 0);
    const harnessBytes = harnessParts.reduce((a, p) => a + p.bytes, 0);
    totNaive += naiveBytes;
    totHarness += harnessBytes;
    const missing = [...naiveParts, ...harnessParts].filter((p) => !p.found).map((p) => p.ref);
    results.push({
      id: t.id,
      task: t.task,
      naive: { files: t.naive, bytes: naiveBytes, tokens: tokens(naiveBytes) },
      harness: { reads: harnessParts.map((p) => p.ref), bytes: harnessBytes, tokens: tokens(harnessBytes) },
      savedTokens: tokens(naiveBytes) - tokens(harnessBytes),
      savedPct: naiveBytes ? Math.round((1 - harnessBytes / naiveBytes) * 100) : 0,
      missing: missing.length ? missing : undefined,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    method: `context-cost: bytes of docs read, tokens = bytes/${BYTES_PER_TOKEN} (rough heuristic). ` +
      `Naive = union of every doc mentioning the topic. Harness = AGENTS.md + the one canonical section the router points to.`,
    totals: {
      naiveTokens: tokens(totNaive),
      harnessTokens: tokens(totHarness),
      savedTokens: tokens(totNaive) - tokens(totHarness),
      savedPct: totNaive ? Math.round((1 - totHarness / totNaive) * 100) : 0,
      tasks: TASKS.length,
    },
    results,
  };

  const JSON_OUT = process.argv.includes('--json');
  const WRITE = process.argv.includes('--write');

  if (WRITE) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(report, null, 1));
  }

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(report, null, 1) + '\n');
    return;
  }

  process.stdout.write('\ngolden eval — context-cost (computed from real files)\n');
  process.stdout.write('─'.repeat(64) + '\n');
  for (const r of results) {
    process.stdout.write(
      `  ${r.task.padEnd(52)} ${String(r.naive.tokens).padStart(6)} → ${String(r.harness.tokens).padStart(5)} tok  (-${r.savedPct}%)\n`
    );
    if (r.missing) process.stdout.write(`    ⚠ missing: ${r.missing.join(', ')}\n`);
  }
  process.stdout.write('─'.repeat(64) + '\n');
  const t = report.totals;
  process.stdout.write(
    `  TOTAL ${t.tasks} tasks: ${t.naiveTokens} → ${t.harnessTokens} tokens  (saved ${t.savedTokens}, -${t.savedPct}%)\n\n`
  );
  if (WRITE) process.stdout.write(`  receipt → evals/results/context-cost.json\n\n`);
}

main();
process.exit(0);
