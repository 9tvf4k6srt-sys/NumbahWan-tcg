#!/usr/bin/env node
'use strict';

/**
 * route-task.cjs — complexity-aware routing (the high-impact idea from the
 * trainer cheat sheet: "simple tasks → fast path; complex → full reasoning"
 * — the lever that cuts tokens hard without losing success).
 *
 * The repo already had the inputs but nothing tied them together:
 *   - task-brief.cjs knows the CONTEXT (gates, past defects, files)
 *   - technique-log.cjs knows WHICH TECHNIQUE actually works per task-class
 *   - token-budget.cjs knows the COST
 * route-task is the router: given a task string, it
 *   1. classifies the task class (lookup / reasoning / design / action / synthesis)
 *   2. scores complexity from measurable signals (not vibes)
 *   3. picks the reasoning technique — EVIDENCE-FIRST from technique-log when
 *      there's enough data, else a sane default for the class
 *   4. decides fast-path vs full-reasoning and suggests a token budget
 *
 * Honesty rule (inherited from optimize-loop / technique-log): when the log has
 * no evidence for a class, the technique pick is labelled `default` (a heuristic),
 * never dressed up as `evidence`. We don't fake confidence we haven't earned.
 */

const path = require('path');

let colors, argFlag;
try {
  ({ colors, argFlag } = require('../tools/lib/aitell-common.cjs'));
} catch {
  colors = () => new Proxy({}, { get: () => '' });
  argFlag = (name, dflt, argv) => {
    const a = (argv || process.argv.slice(2)).find((x) => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : dflt;
  };
}
const C = colors(process.stdout);

// reuse the existing classifiers / evidence — no new vocab to drift out of sync
let categoriesFor;
try {
  ({ categoriesFor } = require('./task-brief.cjs'));
} catch {
  categoriesFor = () => new Set();
}
let techScore, MIN_EVIDENCE;
try {
  const tl = require('./technique-log.cjs');
  techScore = tl.score;
  MIN_EVIDENCE = tl.MIN_EVIDENCE;
} catch {
  techScore = () => ({ byClass: {} });
  MIN_EVIDENCE = 3;
}

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const task = args.filter((a) => !a.startsWith('--')).join(' ').trim();

// ── 1 · task class ──────────────────────────────────────────────────────────
// language signals → one of technique-log's five classes. Order matters: more
// specific / higher-deliberation intents win over generic ones. Deliberation
// verbs (design / refactor / decide / whether / should we) are checked BEFORE
// the action verbs, because a task that asks us to DECIDE needs reasoning even
// when an incidental imperative ("build", "run") appears in the sentence —
// misrouting a design call to the cheap fast path is the exact failure mode the
// cheat sheet's "complexity-aware routing" warns against (lost success to save
// tokens). Action stays last among the "doing" classes: pure imperative, no
// deliberation word present.
const CLASS_SIGNALS = [
  ['design', /\b(design|architect|refactor|restructure|trade.?off|decide|whether|choose|approach|strategy|plan the|should we|options?)\b/i],
  ['synthesis', /\b(summari|synthesi|compare|review the|audit|analyze|across the|whole repo|all the)\b/i],
  ['lookup', /\b(what is|where is|which file|look ?up|definition of|grep)\b/i],
  ['action', /\b(deploy|ship|push|merge|run|build|install|migrate|rename|move|delete|fix the build|release)\b/i],
  ['reasoning', /\b(why|debug|diagnose|figure out|root cause|because|implement|add (a|the)|wire|calculate)\b/i],
];
function classify(text) {
  for (const [cls, re] of CLASS_SIGNALS) if (re.test(text)) return cls;
  return 'reasoning'; // safe middle default — never the cheapest, never the most expensive
}

// ── 2 · complexity score (0..100) from measurable signals ───────────────────
// Each signal adds points. We keep it explicit and auditable — anyone can read
// why a task scored what it did. No hidden model call.
function complexity(text) {
  const t = text.toLowerCase();
  const signals = [];
  let score = 0;
  const add = (n, why) => { score += n; signals.push(`+${n} ${why}`); };

  // length / scope
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words > 25) add(15, 'long task description (>25 words)');
  else if (words > 12) add(8, 'medium task description');

  // multi-step conjunctions — "and then" / "after that" but also a bare "and"
  // joining two clauses ("refactor X and decide Y"), and enumerations.
  const steps = (t.match(/\b(and then|then|after that|also|plus|;|\d\.)\b/g) || []).length
    + (t.match(/\band\b/g) || []).length;
  if (steps >= 2) add(15, `multi-step (${steps} step markers)`);
  else if (steps === 1) add(7, 'two-part task');

  // ambiguity / open-endedness
  if (/\b(maybe|somehow|figure out|not sure|explore|investigate|best way|improve|better)\b/.test(t))
    add(15, 'open-ended / ambiguous wording');

  // deliberation / decision — "decide whether", "should we", "choose", "trade-off".
  // A genuine decision is inherently more complex than a mechanical edit.
  if (/\b(decide|whether|should we|choose|trade.?off|approach|options?|design|architect|restructure)\b/.test(t))
    add(12, 'requires a design decision');

  // visual / CSS risk — the repo's #1 token sink (the re-see loop)
  const cats = categoriesFor(text);
  if (cats.has('layout') || cats.has('render')) add(20, 'visual/CSS change (high re-see risk)');
  if (cats.has('i18n')) add(8, 'i18n (multi-locale surface)');

  // breadth markers
  if (/\b(all|every|across|entire|whole|each)\b/.test(t)) add(12, 'breadth marker (all/every/across)');

  // pure-lookup discount
  if (/^\s*(what|where|which|show|list|find)\b/.test(t) && words < 12) add(-10, 'narrow lookup');

  return { score: Math.max(0, Math.min(100, score)), signals, categories: [...cats] };
}

// ── 3 · technique pick — evidence first, default second (never faked) ────────
const DEFAULT_TECHNIQUE = {
  lookup: 'direct',
  reasoning: 'cot',
  design: 'tot',
  action: 'react',
  synthesis: 'cot',
};
function pickTechnique(taskClass) {
  let evidence = null;
  try {
    const s = techScore(require('./technique-log.cjs').readLog());
    const best = s.byClass && s.byClass[taskClass];
    if (best) evidence = best; // { technique, successRate, n } — only set when sufficient
  } catch { /* no log; fall through to default */ }
  if (evidence) {
    return {
      technique: evidence.technique,
      source: 'evidence',
      successRate: evidence.successRate,
      n: evidence.n,
    };
  }
  return {
    technique: DEFAULT_TECHNIQUE[taskClass] || 'cot',
    source: 'default',
    successRate: null,
    n: 0,
  };
}

// ── 4 · route: fast-path vs full-reasoning + budget ──────────────────────────
function route(taskStr) {
  const taskClass = classify(taskStr);
  const cx = complexity(taskStr);

  // the core routing decision — the cheat sheet's "complexity-aware routing".
  // fast path for simple/cheap tasks; full reasoning only when it earns its cost.
  let path_;
  if (cx.score >= 45) path_ = 'full-reasoning';
  else if (cx.score >= 20) path_ = 'standard';
  else path_ = 'fast';

  const tech = pickTechnique(taskClass);

  // on the fast path, downgrade an expensive technique — no ToT on a one-liner.
  // If we downgrade AWAY from the evidenced pick, the evidence no longer applies
  // to the technique we're recommending, so we must drop back to 'default'
  // labelling — never show another technique's success-rate next to this one.
  let technique = tech.technique;
  let techniqueSource = tech.source;
  let techniqueEvidence = tech.source === 'evidence' ? { successRate: tech.successRate, n: tech.n } : null;
  if (path_ === 'fast' && (technique === 'tot' || technique === 'self-consistency')) {
    technique = taskClass === 'lookup' ? 'direct' : 'cot';
    techniqueSource = 'default-downgraded';
    techniqueEvidence = null;
  }

  // budget scales with path; visual work gets the bigger slice (re-see risk).
  const visual = cx.categories.includes('layout') || cx.categories.includes('render');
  const baseBudget = path_ === 'full-reasoning' ? 14000 : path_ === 'standard' ? 9000 : 5000;
  const suggestedBudget = visual ? baseBudget + 3000 : baseBudget;

  // what to actually do, in order — references tools we own.
  const steps = [];
  steps.push(`ai task "${taskStr.slice(0, 60)}${taskStr.length > 60 ? '…' : ''}"  # context firewall`);
  if (path_ !== 'fast') steps.push(`ai budget declare "${taskClass}" --budget=${suggestedBudget}`);
  if (path_ === 'full-reasoning') steps.push('reason in the open (CoT/ToT); name 2-3 options on design calls');
  if (visual) steps.push('ai preship <files>  # MANDATORY before any visual ship (the #1 token sink)');
  steps.push(`ai technique log ${taskClass} ${technique} <clean|rework|fail>  # close the evidence loop`);

  return {
    task: taskStr,
    taskClass,
    complexity: cx.score,
    complexitySignals: cx.signals,
    categories: cx.categories,
    path: path_,
    technique,
    techniqueSource,
    techniqueEvidence,
    suggestedBudget,
    plan: steps,
  };
}

// ── render ───────────────────────────────────────────────────────────────────
function render(r) {
  if (JSON_OUT) {
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  const pathColor = r.path === 'full-reasoning' ? C.red : r.path === 'standard' ? C.yellow : C.green;
  console.log(`${C.b}Route — ${r.task}${C.r}\n`);
  console.log(`  class       ${C.cyan}${r.taskClass}${C.r}`);
  console.log(`  complexity  ${r.complexity}/100  ${C.dim}(${r.complexitySignals.join(', ') || 'no signals'})${C.r}`);
  console.log(`  path        ${pathColor}${r.path}${C.r}`);
  const ev =
    r.techniqueSource === 'evidence'
      ? `${C.green}evidence${C.r} (${r.techniqueEvidence.successRate} clean over ${r.techniqueEvidence.n})`
      : r.techniqueSource === 'default-downgraded'
        ? `${C.dim}downgraded for fast path (evidenced pick was too heavy for this task)${C.r}`
        : `${C.dim}default (no evidence yet — log outcomes to earn one)${C.r}`;
  console.log(`  technique   ${C.cyan}${r.technique}${C.r}  ${ev}`);
  console.log(`  budget      ~${r.suggestedBudget} tokens`);
  console.log(`\n${C.b}Plan${C.r}`);
  for (const s of r.plan) console.log(`  ${C.dim}›${C.r} ${s}`);
}

function help() {
  console.log(`${C.b}route-task${C.r} — complexity-aware routing (fast path vs full reasoning)

  ${C.cyan}ai route "<task>"${C.r}   classify + score complexity + pick technique + plan

  ${C.dim}paths:  fast (<20) · standard (20-44) · full-reasoning (>=45)${C.r}
  ${C.dim}flags:  --json${C.r}`);
}

function main() {
  if (!task) return help();
  render(route(task));
}

if (require.main === module) {
  main();
}

module.exports = { classify, complexity, pickTechnique, route, DEFAULT_TECHNIQUE, CLASS_SIGNALS };
