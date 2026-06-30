#!/usr/bin/env node
'use strict';

/**
 * optimize-loop.cjs — the Evaluator-Optimizer loop (the OPRO half, on disk).
 *
 * learn-loop.cjs closed the defect → lesson → gate flywheel: a repeated escape
 * becomes a permanent gate. That answers "stop the SAME mistake twice."
 * It does NOT answer the next question: are the standing rules we already have
 * actually any GOOD? A rule can exist and defects can still keep escaping in its
 * category — that means the instruction is weak, not missing.
 *
 * This module optimises the INSTRUCTIONS themselves using observed performance,
 * the way OPRO optimises a prompt against a score:
 *
 *   evaluate  — score every standing rule (required_checks) by how its category
 *               is REALLY doing: recurrence rate in that category, drawn from
 *               actual defect history. Honest null when there is no evidence.
 *   propose   — for weak or uncovered categories, generate candidate sharper
 *               rules (OPRO-style: several candidates, ranked, best kept), and
 *               show the diff. Read-only by default.
 *   apply     — promote the winning candidate into required_checks (backs the
 *               memory up first; never silent). Gated behind --apply.
 *   status    — one honest line: how many rules are proven / weak / unproven.
 *
 * The signal is real (defect recurrence per category), so a rule that keeps
 * letting things through is demoted/sharpened, and the rule set gets better as
 * you build — not just bigger.
 */

const fs = require('fs');
const path = require('path');
const fm = require('./factory-memory.cjs');

let colors, argFlag, hasFlag;
try {
  ({ colors, argFlag, hasFlag } = require('../tools/lib/aitell-common.cjs'));
} catch {
  colors = () => new Proxy({}, { get: () => '' });
  argFlag = (name, dflt, argv) => {
    const a = (argv || process.argv.slice(2)).find((x) => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : dflt;
  };
  hasFlag = (name, argv) => (argv || process.argv.slice(2)).includes(`--${name}`);
}
const C = colors(process.stdout);

// RCOF safeguards layer: a hard ceiling on how many rules one apply pass may
// promote (so the self-modification path can never run away), plus the
// audited, reversible self-modification trail (Move 2). Both degrade safely if
// the lib is absent — the loop still works, just unguarded/unaudited.
let RecursionGuard;
try {
  ({ RecursionGuard } = require('../tools/lib/recursion-guard.cjs'));
} catch {
  RecursionGuard = class { enter() {} exit() {} shouldEscape() { return false; } state() { return {}; } };
}

// Append-only self-modification log: every time the optimizer mutates the
// standing rules we record WHAT changed, WHY, and the backup that can restore
// the prior state. This is the proposal's "audit logging and rollback" made
// real — the one place we already self-modify is now reversible by command.
const SELF_MOD_LOG = path.join(path.dirname(fm.MEMORY_PATH), 'self-mod-log.jsonl');
function appendSelfMod(record) {
  try {
    fs.mkdirSync(path.dirname(SELF_MOD_LOG), { recursive: true });
    fs.appendFileSync(SELF_MOD_LOG, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n');
  } catch { /* audit is best-effort; never block the mutation it describes */ }
}
function readSelfMod() {
  try {
    return fs.readFileSync(SELF_MOD_LOG, 'utf8').split('\n').filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

let recurrenceStats, GATE_MAP;
try {
  ({ recurrenceStats, GATE_MAP } = require('./learn-loop.cjs'));
} catch {
  recurrenceStats = (mem) => {
    const defects = (mem && mem.defects) || [];
    const seen = new Map();
    let repeats = 0;
    for (const d of defects) {
      const key = `${d.category}::${d.description}`;
      if (seen.has(key)) repeats++;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    return { total: defects.length, repeats, recurring: [] };
  };
  GATE_MAP = {};
}

const args = process.argv.slice(2);
const cmd = args[0];
const JSON_OUT = args.includes('--json');
const flag = (name, dflt) => argFlag(name, dflt, args);

// ── per-category recurrence: the performance signal ──────────────────────────
// Group defects by category, count how many were repeats of an earlier defect
// in the same category. High recurrence in a category = the standing rule for
// that category is weak (it exists but stuff keeps escaping).
function categoryStats(mem) {
  const defects = (mem && mem.defects) || [];
  const byCat = new Map(); // category -> { total, seen:Map(desc->n), repeats }
  for (const d of defects) {
    const cat = d.category || 'uncategorized';
    if (!byCat.has(cat)) byCat.set(cat, { total: 0, seen: new Map(), repeats: 0 });
    const c = byCat.get(cat);
    c.total++;
    const n = (c.seen.get(d.description) || 0) + 1;
    if (n > 1) c.repeats++;
    c.seen.set(d.description, n);
  }
  const out = {};
  for (const [cat, c] of byCat) {
    out[cat] = {
      total: c.total,
      distinct: c.seen.size,
      repeats: c.repeats,
      // honest: null when there is no evidence to judge by
      repeatRate: c.total ? +(c.repeats / c.total).toFixed(3) : null,
    };
  }
  return out;
}

// a required_checks entry is an object { description, category?, ... }; older /
// hand-written ones may be a bare string. Normalise to text + an optional
// authoritative category the entry already carries.
function ruleText(rule) {
  if (rule && typeof rule === 'object') return String(rule.description || '');
  return String(rule || '');
}
function ruleOwnCategory(rule) {
  return rule && typeof rule === 'object' && rule.category ? rule.category : null;
}

// classify a standing rule string into a category, reusing the same vocabulary
// learn-loop/GATE_MAP use so evaluate() lines up with how defects are bucketed.
function ruleCategory(rule) {
  // trust the entry's own category first — it's how the defect was bucketed.
  const own = ruleOwnCategory(rule);
  if (own) return own;
  const text = ruleText(rule).toLowerCase();
  // direct hits against the gate vocabulary first
  for (const k of Object.keys(GATE_MAP || {})) {
    if (text.includes(k)) return GATE_MAP[k].category;
  }
  // a few language-level fallbacks for hand-written rules
  const HINTS = [
    [/(ai[-\s]?tell|stylometry|human voice|em.?dash|rhythm)/, 'ai-tell'],
    [/(layout|emoji|gradient|shadow|spacing|contrast)/, 'layout'],
    [/(render|word.?fuse|overflow|mid.?word|headline)/, 'render'],
    [/(type|tsc|implicit any|noemit)/, 'types'],
    [/(test|vitest|regression)/, 'logic'],
    [/(size|budget|payload|bundle|kb)/, 'perf'],
    [/(asset|logo|alpha|png|corner)/, 'asset'],
    [/(i18n|translat|locale|rtl)/, 'i18n'],
  ];
  for (const [re, cat] of HINTS) if (re.test(text)) return cat;
  return 'uncategorized';
}

// score a rule: proven (category clean), weak (category recurs), or unproven
// (no defects in that category yet — can't judge it).
function scoreRule(rule, catStats) {
  const category = ruleCategory(rule);
  const s = catStats[category];
  if (!s || s.total === 0) {
    return { category, verdict: 'unproven', repeatRate: null, evidence: 0 };
  }
  // weak if anything recurred in its category; the rule isn't preventing repeats
  const verdict = s.repeats > 0 ? 'weak' : 'proven';
  return { category, verdict, repeatRate: s.repeatRate, evidence: s.total };
}

// ── OPRO-style candidate generation for a weak / uncovered category ──────────
// Not an LLM call — deterministic templates seeded by the category and by what
// actually recurred. Several candidates, ranked by specificity, best kept.
// (Specificity heuristic: concrete command + concrete check + measurable bar.)
const CATEGORY_PLAYBOOK = {
  'ai-tell': [
    'Before ship, run `ai aitell` on every user-facing string; rewrite any flagged phrase in a first-person human voice and re-run until 0 flags.',
    'Ban the AI-tell phrase set (em-dash pile-ups, "in today\'s world", "delve", "tapestry"); machine-rhythm score must stay < 60.',
    'Read the copy aloud; if a sentence has no human could-have-typed-this cadence, rewrite it.',
  ],
  layout: [
    'Run `ai layout --strict`; reject emoji-as-icon, the default indigo→purple gradient, and the default box-shadow before ship.',
    'Every section must differ from the template default in spacing OR type scale OR colour; no untouched scaffold ships.',
  ],
  render: [
    'Run `ai render --strict` on any visual change; block word-fuse, mid-word break, mobile overflow, and oversized headlines.',
    'Test the longest real string in every text slot at 320px width before ship.',
  ],
  types: [
    'Run `tsc --noEmit` clean before ship; zero implicit any, zero missing return types on exported fns.',
  ],
  logic: [
    'All vitest green before ship AND add one regression test that fails without the fix.',
  ],
  perf: [
    'Keep each page under the size baseline; split heavy inline JS/CSS; re-run `ai budget` and confirm no overrun.',
  ],
  asset: [
    'Run the asset-alpha gate; no opaque corners, no enclosed dark holes in logos/icons before ship.',
  ],
  i18n: [
    'Run the i18n gate on every locale; no untranslated keys, no hard-coded user-facing strings, RTL verified.',
  ],
  uncategorized: [
    'Define an explicit pass/fail check for this failure mode and add it to preship so it cannot ship unguarded.',
  ],
};

// crude specificity score so we can rank candidates deterministically:
// reward a backtick command, a measurable bar (<, 0, number, px), and the word
// "before ship"; penalise vagueness.
function specificity(rule) {
  let s = 0;
  if (/`[^`]+`/.test(rule)) s += 3;                 // has a concrete command
  if (/(\b\d+\b|<|>|0 flags|px|kb)/i.test(rule)) s += 2; // measurable bar
  if (/before ship/i.test(rule)) s += 1;            // ties to the gate moment
  if (/(reject|block|ban|must|zero|no )/i.test(rule)) s += 1; // imperative
  s -= Math.max(0, Math.floor(rule.length / 200));  // mild length penalty
  return s;
}

function proposeForCategory(category, catStats) {
  const candidates = (CATEGORY_PLAYBOOK[category] || CATEGORY_PLAYBOOK.uncategorized)
    .map((rule) => ({ rule, score: specificity(rule) }))
    .sort((a, b) => b.score - a.score);
  return { category, candidates, winner: candidates[0] };
}

// ── commands ─────────────────────────────────────────────────────────────────
function cmdEvaluate(mem) {
  const catStats = categoryStats(mem);
  const checks = (mem.patterns && mem.patterns.required_checks) || [];
  const scored = checks.map((rule) => ({ rule, ...scoreRule(rule, catStats) }));
  const summary = {
    rules: scored.length,
    proven: scored.filter((r) => r.verdict === 'proven').length,
    weak: scored.filter((r) => r.verdict === 'weak').length,
    unproven: scored.filter((r) => r.verdict === 'unproven').length,
  };
  if (JSON_OUT) {
    console.log(JSON.stringify({ summary, scored, categoryStats: catStats }, null, 2));
    return;
  }
  console.log(`${C.b}Evaluator — how good are the standing rules?${C.r}\n`);
  if (!scored.length) {
    console.log(`${C.dim}No required_checks yet. Build, capture defects, then optimise.${C.r}`);
    return;
  }
  for (const r of scored) {
    const tag =
      r.verdict === 'proven' ? `${C.green}proven${C.r}`
      : r.verdict === 'weak' ? `${C.red}weak${C.r}  `
      : `${C.dim}unproven${C.r}`;
    const ev = r.repeatRate == null ? `${C.dim}(no data)${C.r}` : `repeat-rate ${r.repeatRate} over ${r.evidence}`;
    console.log(`  [${tag}] ${C.cyan}${r.category}${C.r}  ${ev}`);
    console.log(`           ${ruleText(r.rule)}`);
  }
  console.log(
    `\n${C.dim}${summary.proven} proven · ${summary.weak} weak · ${summary.unproven} unproven (no evidence yet)${C.r}`,
  );
}

function cmdPropose(mem) {
  const catStats = categoryStats(mem);
  const checks = (mem.patterns && mem.patterns.required_checks) || [];
  const scored = checks.map((rule) => ({ rule, ...scoreRule(rule, catStats) }));

  // target categories: weak ones (rule exists but recurs) + categories that
  // have defects but no covering rule at all.
  const weakCats = new Set(scored.filter((r) => r.verdict === 'weak').map((r) => r.category));
  const coveredCats = new Set(scored.map((r) => r.category));
  const uncoveredCats = Object.entries(catStats)
    .filter(([cat, s]) => s.total > 0 && !coveredCats.has(cat) && cat !== 'uncategorized')
    .map(([cat]) => cat);
  const targets = [...new Set([...weakCats, ...uncoveredCats])];

  const proposals = targets.map((cat) => proposeForCategory(cat, catStats));

  if (JSON_OUT) {
    console.log(JSON.stringify({ targets, proposals }, null, 2));
    return;
  }
  console.log(`${C.b}Optimizer — sharper rules for the weak spots${C.r}\n`);
  if (!proposals.length) {
    console.log(`${C.green}Nothing to sharpen — no weak or uncovered categories with evidence.${C.r}`);
    return;
  }
  for (const p of proposals) {
    const reason = weakCats.has(p.category) ? 'recurs despite a rule' : 'has defects but no rule';
    console.log(`${C.yellow}▸ ${p.category}${C.r} ${C.dim}(${reason})${C.r}`);
    console.log(`  ${C.green}winner${C.r}  ${p.winner.rule}`);
    for (const alt of p.candidates.slice(1)) {
      console.log(`  ${C.dim}alt     ${alt.rule}${C.r}`);
    }
    console.log('');
  }
  console.log(`${C.dim}Read-only. Run with --apply to promote the winners into required_checks.${C.r}`);
}

function cmdApply(mem) {
  const catStats = categoryStats(mem);
  const checks = (mem.patterns && mem.patterns.required_checks) || [];
  const scored = checks.map((rule) => ({ rule, ...scoreRule(rule, catStats) }));
  const weakCats = new Set(scored.filter((r) => r.verdict === 'weak').map((r) => r.category));
  const coveredCats = new Set(scored.map((r) => r.category));
  const uncoveredCats = Object.entries(catStats)
    .filter(([cat, s]) => s.total > 0 && !coveredCats.has(cat) && cat !== 'uncategorized')
    .map(([cat]) => cat);
  const targets = [...new Set([...weakCats, ...uncoveredCats])];

  if (!targets.length) {
    console.log(`${C.green}Nothing to apply — rule set is healthy.${C.r}`);
    return;
  }

  // back up memory first — never mutate silently
  const backup = `${fm.MEMORY_PATH}.bak-${Date.now()}`;
  try {
    if (fs.existsSync(fm.MEMORY_PATH)) fs.copyFileSync(fm.MEMORY_PATH, backup);
  } catch { /* best effort */ }

  // Safeguard: bound how many rules one pass may promote. A self-modification
  // that wants to rewrite the whole rule set in a single run is a red flag, not
  // a feature — the guard caps it and escapes cleanly past the ceiling.
  const guard = new RecursionGuard({ maxDepth: 8, label: 'optimize-apply' });
  const applied = [];
  let added = 0;
  for (const cat of targets) {
    try { guard.enter(); }
    catch {
      if (!JSON_OUT) console.log(`${C.yellow}⚑ depth ceiling reached — stopping at ${added} rule(s) this pass${C.r}`);
      break;
    }
    const { winner } = proposeForCategory(cat, catStats);
    // addPattern(mem, bucket, pattern) dedups by description OR prevention; give
    // a unique prevention key so a sharpened rule does not false-merge into an
    // unrelated check, and stamp the category so evaluate() reads it back.
    fm.addPattern(mem, 'required_checks', {
      description: winner.rule,
      category: cat,
      prevention: `optimizer:${cat}`,
      severity: 'error',
      autoGenerated: true,
    });
    applied.push({ category: cat, rule: winner.rule });
    added++;
    guard.exit();
    if (!JSON_OUT) console.log(`${C.green}+ ${cat}${C.r}  ${winner.rule}`);
  }
  fm.saveMemory(mem);

  // Audit trail: record the self-modification so it can be explained and undone.
  appendSelfMod({
    action: 'optimize-apply',
    added,
    rules: applied,
    backup: path.basename(backup),
    backupPath: backup,
    reason: 'sharpen weak/uncovered rule categories from real recurrence',
  });

  if (JSON_OUT) {
    console.log(JSON.stringify({ applied: added, rules: applied, backup }, null, 2));
  } else {
    console.log(`\n${C.dim}Applied ${added} sharpened rule(s). Backup: ${path.basename(backup)}${C.r}`);
    console.log(`${C.dim}Audited in self-mod-log. Undo with: ai optimize rollback${C.r}`);
  }
}

// ── rollback: undo the most recent audited self-modification ─────────────────
// The proposal asks for "audit logging and rollback". apply() backs memory up
// and logs the change; rollback() restores the most recent backup and records
// the reversal (itself audited — the log is append-only, never rewritten).
function cmdRollback() {
  const log = readSelfMod();
  // find the most recent apply that hasn't already been rolled back
  const rolledBack = new Set(log.filter((e) => e.action === 'optimize-rollback').map((e) => e.restoredFrom));
  const last = [...log].reverse().find((e) => e.action === 'optimize-apply' && !rolledBack.has(e.backupPath));

  if (!last) {
    const msg = 'Nothing to roll back — no un-reverted self-modification in the log.';
    if (JSON_OUT) console.log(JSON.stringify({ rolledBack: false, reason: msg }, null, 2));
    else console.log(`${C.dim}${msg}${C.r}`);
    return;
  }
  if (!last.backupPath || !fs.existsSync(last.backupPath)) {
    const msg = `Backup missing (${last.backup}) — cannot roll back safely.`;
    if (JSON_OUT) console.log(JSON.stringify({ rolledBack: false, reason: msg }, null, 2));
    else console.log(`${C.red}${msg}${C.r}`);
    process.exit(1);
  }

  // safety: back up the CURRENT state before overwriting it, so a rollback is
  // itself reversible (never lose data, even when undoing).
  const preRollback = `${fm.MEMORY_PATH}.bak-prerollback-${Date.now()}`;
  try {
    if (fs.existsSync(fm.MEMORY_PATH)) fs.copyFileSync(fm.MEMORY_PATH, preRollback);
    fs.copyFileSync(last.backupPath, fm.MEMORY_PATH);
  } catch (e) {
    const msg = `Rollback failed: ${e.message}`;
    if (JSON_OUT) console.log(JSON.stringify({ rolledBack: false, reason: msg }, null, 2));
    else console.log(`${C.red}${msg}${C.r}`);
    process.exit(1);
  }

  appendSelfMod({
    action: 'optimize-rollback',
    restoredFrom: last.backupPath,
    undid: { added: last.added, rules: last.rules },
    preRollbackBackup: path.basename(preRollback),
  });

  if (JSON_OUT) {
    console.log(JSON.stringify({ rolledBack: true, restoredFrom: last.backup, undid: last.added }, null, 2));
  } else {
    console.log(`${C.green}Rolled back${C.r} — restored ${path.basename(last.backupPath)} (undid ${last.added} rule(s)).`);
    console.log(`${C.dim}Current state saved first as ${path.basename(preRollback)}.${C.r}`);
  }
}

// ── audit: show the self-modification history (honest, read-only) ────────────
function cmdAudit() {
  const log = readSelfMod();
  if (JSON_OUT) {
    console.log(JSON.stringify({ entries: log.length, log }, null, 2));
    return;
  }
  console.log(`${C.b}Self-modification audit${C.r} ${C.dim}(append-only; ${log.length} entr${log.length === 1 ? 'y' : 'ies'})${C.r}\n`);
  if (!log.length) {
    console.log(`${C.dim}No self-modifications recorded. The optimizer has never mutated the rule set.${C.r}`);
    return;
  }
  for (const e of log.slice(-12)) {
    if (e.action === 'optimize-apply') {
      console.log(`  ${C.green}apply${C.r}     ${C.dim}${e.ts}${C.r}  +${e.added} rule(s)  ${C.dim}backup ${e.backup}${C.r}`);
      for (const r of e.rules || []) console.log(`            ${C.cyan}${r.category}${C.r}  ${r.rule}`);
    } else if (e.action === 'optimize-rollback') {
      console.log(`  ${C.yellow}rollback${C.r}  ${C.dim}${e.ts}${C.r}  undid ${e.undid?.added ?? '?'} rule(s)  ${C.dim}from ${path.basename(e.restoredFrom || '')}${C.r}`);
    }
  }
}

function cmdStatus(mem) {
  const catStats = categoryStats(mem);
  const checks = (mem.patterns && mem.patterns.required_checks) || [];
  const scored = checks.map((rule) => ({ rule, ...scoreRule(rule, catStats) }));
  const proven = scored.filter((r) => r.verdict === 'proven').length;
  const weak = scored.filter((r) => r.verdict === 'weak').length;
  const unproven = scored.filter((r) => r.verdict === 'unproven').length;
  const overall = recurrenceStats(mem);
  if (JSON_OUT) {
    console.log(JSON.stringify({ rules: scored.length, proven, weak, unproven, overallRepeatRate: overall.repeatRate ?? null }, null, 2));
    return;
  }
  const rr = overall.repeatRate == null ? `${C.dim}n/a${C.r}` : `${overall.repeatRate}`;
  console.log(
    `${C.b}optimize:${C.r} ${scored.length} rules — ` +
    `${C.green}${proven} proven${C.r}, ${C.red}${weak} weak${C.r}, ${C.dim}${unproven} unproven${C.r} ` +
    `· overall repeat-rate ${rr}`,
  );
  if (weak) console.log(`${C.dim}↳ run \`ai optimize propose\` to see sharper rules for the weak spots.${C.r}`);
}

function help() {
  console.log(`${C.b}optimize-loop${C.r} — evaluator-optimizer for the repo's standing rules

  ${C.cyan}evaluate${C.r}   score every required_check by real recurrence in its category
  ${C.cyan}propose${C.r}    candidate sharper rules for weak/uncovered categories (read-only)
  ${C.cyan}apply${C.r}      promote the winning candidates into required_checks (--apply, backs up)
  ${C.cyan}status${C.r}     one-line health: proven / weak / unproven + overall repeat-rate
  ${C.cyan}audit${C.r}      show the self-modification history (apply / rollback events, read-only)
  ${C.cyan}rollback${C.r}   undo the most recent apply, restoring the backed-up memory (reversible)

  ${C.dim}flags: --json${C.r}`);
}

function main() {
  const mem = fm.loadMemory();
  switch (cmd) {
    case 'evaluate':
    case 'eval':
      return cmdEvaluate(mem);
    case 'propose':
      return cmdPropose(mem);
    case 'apply':
      return cmdApply(mem);
    case 'status':
      return cmdStatus(mem);
    case 'audit':
      return cmdAudit();
    case 'rollback':
      return cmdRollback();
    default:
      return help();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  categoryStats,
  ruleCategory,
  scoreRule,
  specificity,
  proposeForCategory,
  CATEGORY_PLAYBOOK,
  appendSelfMod,
  readSelfMod,
  SELF_MOD_LOG,
};
