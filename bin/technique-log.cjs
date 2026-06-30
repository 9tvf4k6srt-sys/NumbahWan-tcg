#!/usr/bin/env node
'use strict';

/**
 * technique-log.cjs — turn "which reasoning approach works" from folklore into
 * evidence (the genuinely-new idea the self-upgrade protocol points at).
 *
 * The protocol says: pick CoT / ToT / ReAct by task class, and meta-learn which
 * approach works. That last part is usually a vibe ("ToT felt better for design").
 * This makes it mechanical: log {task-class, technique, outcome} after a task,
 * and score the success rate per (task-class × technique) from the real log.
 *
 *   log <task-class> <technique> <outcome>   append one observation
 *   score [--json]                            success-rate per class×technique
 *   recent [--json]                           the raw tail of the log
 *
 * Honesty rule (inherited from optimize-loop): a success-rate is reported as
 * `insufficient` (null) until there is enough evidence to mean anything. We do
 * NOT print a confident "100%" off one data point. The minimum is MIN_EVIDENCE.
 *
 * Storage: .mycelium/technique-log.jsonl (one JSON object per line, gitignored
 * like the other runtime ledgers). Append-only; never rewritten.
 */

const fs = require('fs');
const path = require('path');

let colors;
try {
  ({ colors } = require('../tools/lib/aitell-common.cjs'));
} catch {
  colors = () => new Proxy({}, { get: () => '' });
}
const C = colors(process.stdout);

const ROOT = path.resolve(__dirname, '..');
const LOG = path.join(ROOT, '.mycelium', 'technique-log.jsonl');

// how many observations a (class×technique) cell needs before we'll quote a
// rate. Below this we say "insufficient" rather than invent confidence.
const MIN_EVIDENCE = 3;

// the vocabularies we accept — kept small and aligned with the protocol so the
// data stays groupable. Unknown values are allowed (logged as-is) but flagged.
const TASK_CLASSES = ['lookup', 'reasoning', 'design', 'action', 'synthesis'];
const TECHNIQUES = ['direct', 'cot', 'tot', 'react', 'self-consistency'];
const OUTCOMES = ['clean', 'rework', 'fail']; // clean = shipped no rework

const args = process.argv.slice(2);
const cmd = args[0];
const JSON_OUT = args.includes('--json');

function readLog() {
  try {
    return fs
      .readFileSync(LOG, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function appendLog(rec) {
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.appendFileSync(LOG, `${JSON.stringify(rec)}\n`);
}

// ── score: success-rate per (task-class × technique), honest about evidence ──
// "success" = outcome 'clean'. We expose the rate, the n, and whether n is
// enough to trust. A cell with n < MIN_EVIDENCE reports rate = null.
function score(records) {
  const cells = new Map(); // "class::technique" -> { n, clean }
  for (const r of records) {
    const key = `${r.taskClass}::${r.technique}`;
    if (!cells.has(key)) cells.set(key, { n: 0, clean: 0 });
    const c = cells.get(key);
    c.n++;
    if (r.outcome === 'clean') c.clean++;
  }
  const rows = [...cells.entries()].map(([key, c]) => {
    const [taskClass, technique] = key.split('::');
    const enough = c.n >= MIN_EVIDENCE;
    return {
      taskClass,
      technique,
      n: c.n,
      clean: c.clean,
      // honest: null until there is enough evidence to mean anything
      successRate: enough ? +(c.clean / c.n).toFixed(3) : null,
      sufficient: enough,
    };
  });
  // best technique per task-class, only among cells with enough evidence
  const byClass = {};
  for (const row of rows) {
    if (!row.sufficient) continue;
    const cur = byClass[row.taskClass];
    if (!cur || row.successRate > cur.successRate) {
      byClass[row.taskClass] = { technique: row.technique, successRate: row.successRate, n: row.n };
    }
  }
  return { rows, byClass, total: records.length };
}

// ── commands ─────────────────────────────────────────────────────────────────
function cmdLog() {
  const [, taskClass, technique, outcome] = args;
  if (!taskClass || !technique || !outcome) {
    console.error(`${C.red}usage: technique log <task-class> <technique> <outcome>${C.r}`);
    console.error(`${C.dim}  task-class: ${TASK_CLASSES.join(' | ')}${C.r}`);
    console.error(`${C.dim}  technique:  ${TECHNIQUES.join(' | ')}${C.r}`);
    console.error(`${C.dim}  outcome:    ${OUTCOMES.join(' | ')}${C.r}`);
    process.exit(1);
  }
  const rec = {
    taskClass: taskClass.toLowerCase(),
    technique: technique.toLowerCase(),
    outcome: outcome.toLowerCase(),
    at: new Date().toISOString(),
  };
  const warn = [];
  if (!TASK_CLASSES.includes(rec.taskClass)) warn.push(`task-class "${rec.taskClass}" not in the known set`);
  if (!TECHNIQUES.includes(rec.technique)) warn.push(`technique "${rec.technique}" not in the known set`);
  if (!OUTCOMES.includes(rec.outcome)) warn.push(`outcome "${rec.outcome}" not in clean|rework|fail`);
  appendLog(rec);
  if (JSON_OUT) {
    console.log(JSON.stringify({ logged: rec, warnings: warn }, null, 2));
    return;
  }
  console.log(`${C.green}logged${C.r} ${rec.taskClass} · ${rec.technique} · ${rec.outcome}`);
  for (const w of warn) console.log(`${C.yellow}⚠ ${w} (logged anyway)${C.r}`);
}

function cmdScore() {
  const s = score(readLog());
  if (JSON_OUT) {
    console.log(JSON.stringify(s, null, 2));
    return;
  }
  console.log(`${C.b}Technique scoreboard — what actually works, by task class${C.r}\n`);
  if (!s.total) {
    console.log(`${C.dim}No observations yet. Log some: ai technique log design tot clean${C.r}`);
    return;
  }
  // group rows by task-class for readability
  const classes = [...new Set(s.rows.map((r) => r.taskClass))].sort();
  for (const cls of classes) {
    console.log(`${C.cyan}${cls}${C.r}`);
    for (const r of s.rows.filter((x) => x.taskClass === cls).sort((a, b) => b.n - a.n)) {
      const rate =
        r.successRate == null
          ? `${C.dim}insufficient (n=${r.n}, need ${MIN_EVIDENCE})${C.r}`
          : `${r.successRate} clean over ${r.n}`;
      console.log(`  ${r.technique.padEnd(16)} ${rate}`);
    }
    const best = s.byClass[cls];
    if (best) console.log(`  ${C.green}→ best so far: ${best.technique} (${best.successRate})${C.r}`);
    console.log('');
  }
  console.log(`${C.dim}${s.total} observation(s). Rates appear once a cell has ${MIN_EVIDENCE}+ data points.${C.r}`);
}

function cmdRecent() {
  const records = readLog().slice(-15);
  if (JSON_OUT) {
    console.log(JSON.stringify(records, null, 2));
    return;
  }
  if (!records.length) {
    console.log(`${C.dim}log is empty.${C.r}`);
    return;
  }
  for (const r of records) {
    console.log(`${C.dim}${r.at}${C.r}  ${r.taskClass} · ${r.technique} · ${r.outcome}`);
  }
}

function help() {
  console.log(`${C.b}technique-log${C.r} — evidence for which reasoning approach works

  ${C.cyan}log <class> <technique> <outcome>${C.r}   record one observation
  ${C.cyan}score${C.r}                               success-rate per class×technique (honest)
  ${C.cyan}recent${C.r}                              last 15 observations

  ${C.dim}class:     ${TASK_CLASSES.join(' | ')}${C.r}
  ${C.dim}technique: ${TECHNIQUES.join(' | ')}${C.r}
  ${C.dim}outcome:   ${OUTCOMES.join(' | ')}  (clean = shipped, no rework)${C.r}
  ${C.dim}flags: --json${C.r}`);
}

function main() {
  switch (cmd) {
    case 'log':
      return cmdLog();
    case 'score':
      return cmdScore();
    case 'recent':
      return cmdRecent();
    default:
      return help();
  }
}

if (require.main === module) {
  main();
}

module.exports = { score, readLog, MIN_EVIDENCE, TASK_CLASSES, TECHNIQUES, OUTCOMES };
