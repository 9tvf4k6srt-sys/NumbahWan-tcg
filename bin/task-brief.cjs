#!/usr/bin/env node
'use strict';

/**
 * task-brief.cjs — the CONTEXT FIREWALL.
 *
 * The failure mode this kills: an agent reads the whole repo to "understand it",
 * burns its context window, and then forgets the parts that mattered halfway
 * through the task. The fix is to NOT read the repo — read a task-scoped brief
 * instead: given what you're about to do, here is the small set of things you
 * actually need to hold in context.
 *
 *   node bin/task-brief.cjs "fix nav overflow on mobile"
 *
 * It returns, in a few hundred tokens:
 *   1. the GATES you must satisfy (the permanent rules the loop has learned)
 *   2. the PAST DEFECTS in this area (what broke here before + the fix)
 *   3. the RELEVANT FILES (from memory + a shallow name match — never a deep scan)
 *   4. a token budget suggestion for the slice
 *
 * Everything is pulled from data the repo already maintains (factory-memory +
 * the gate list). No deep traversal, no whole-file reads. That is the point:
 * the brief must cost less than the context it saves.
 */

const fs = require('fs');
const path = require('path');
const fm = require('./factory-memory.cjs');

let colors;
try {
  ({ colors } = require('../tools/lib/aitell-common.cjs'));
} catch {
  colors = () => new Proxy({}, { get: () => '' });
}
const C = colors(process.stdout);
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const task = args.filter((a) => !a.startsWith('--')).join(' ').trim();

// Map free-text task language to the memory categories so we can scope the brief.
const KEYWORD_CATEGORY = [
  [/i18n|translat|locale|lang|trilingual/i, 'i18n'],
  [/nav|menu|header|overflow|layout|css|style|gradient|shadow|spacing|mobile|responsive/i, 'layout'],
  [/render|word.?fuse|break|headline|wrap/i, 'render'],
  [/copy|text|prose|wording|tone|voice|buzzword|ai.?tell/i, 'ai-tell'],
  [/perf|size|bundle|weight|speed|slow/i, 'perf'],
  [/type|tsc|typescript|interface/i, 'types'],
  [/test|spec|regression|vitest/i, 'logic'],
  [/logo|emblem|asset|webp|png|alpha|transparent/i, 'asset'],
];

function categoriesFor(text) {
  const hits = new Set();
  for (const [re, cat] of KEYWORD_CATEGORY) if (re.test(text)) hits.add(cat);
  return hits;
}

function tokenEstimate(text) {
  return Math.ceil(text.length / 4);
}

// ── Role + Format + Constraints scaffold ─────────────────────────────────────
// The trainer cheat sheet's "Foundational Structure": Role + Task + Context +
// Format + Constraints. The brief already gives Task (the string) + Context
// (gates/defects/files). This adds the three missing legs — but DERIVED from the
// task's own categories, never generic boilerplate. A scaffold the agent can
// paste into a sub-prompt: who to be, what to emit, what not to do.
//
// Honesty rule: every constraint here traces to a real category the task hit or
// a permanent gate the loop earned. We don't invent rules to look thorough.
const ROLE_BY_CATEGORY = {
  layout: 'senior front-end engineer who treats every visual change as a re-see-before-ship gate',
  render: 'senior front-end engineer who treats every visual change as a re-see-before-ship gate',
  i18n: 'localization engineer fluent in the trilingual surface (en/es/zh)',
  'ai-tell': 'editor who strips buzzwords and AI-tell, writing in a plain human voice',
  perf: 'performance engineer who tracks bundle weight and token cost religiously',
  types: 'TypeScript engineer who keeps `tsc --noEmit` at zero errors',
  logic: 'test-driven engineer who pins behaviour with a failing test first',
  asset: 'asset pipeline engineer careful with alpha/transparency and file weight',
};
const DEFAULT_ROLE = 'senior engineer on this repo who works evidence-first and ships only what passes the gates';

// Format = how the answer should come back, by the dominant category.
const FORMAT_BY_CATEGORY = {
  layout: 'a diff plus the exact `ai preship <files>` command run before any visual ship',
  render: 'a diff plus the exact `ai preship <files>` command run before any visual ship',
  i18n: 'parallel changes across all locales, listed per-locale so none is missed',
  types: 'a diff that leaves `tsc --noEmit` clean — show the type, not just the value',
  logic: 'the failing test first, then the change that makes it pass',
};
const DEFAULT_FORMAT = 'a focused diff + the one verification command that proves it (no prose victory laps)';

function scaffold(cats, gates) {
  const catList = [...cats];
  // Role: first category with a specific role wins; else the default.
  const roleCat = catList.find((c) => ROLE_BY_CATEGORY[c]);
  const role = roleCat ? ROLE_BY_CATEGORY[roleCat] : DEFAULT_ROLE;

  // Format: first category with a specific format wins; else the default.
  const fmtCat = catList.find((c) => FORMAT_BY_CATEGORY[c]);
  const format = fmtCat ? FORMAT_BY_CATEGORY[fmtCat] : DEFAULT_FORMAT;

  // Constraints: the permanent gates that apply, phrased as do-not rules, plus
  // the universal honesty brake. Each one traces to a real gate or the contract.
  const constraints = [];
  for (const g of gates.slice(0, 4)) {
    constraints.push(`${g.category}: ${g.rule}`);
  }
  // the standing constraint that outlives any single gate
  constraints.push('honesty: every claim of "done"/"passing" must cite the check that proves it, else say "unverified"');

  return { role, format, constraints };
}

function build(task) {
  const mem = fm.loadMemory();
  const cats = categoriesFor(task);
  const tl = task.toLowerCase();

  // 1 · GATES you must satisfy (scoped to the task's categories, else all).
  const allGates = (mem.patterns && mem.patterns.required_checks) || [];
  let gates = allGates.filter((g) => cats.size === 0 || cats.has(g.category));
  if (gates.length === 0) gates = allGates; // never leave them blind
  gates = gates.map((g) => ({ category: g.category, rule: g.description, auto: !!g.autoGenerated }));

  // 2 · PAST DEFECTS in this area (category match OR text overlap with the task).
  const defects = (mem.defects || [])
    .filter((d) => {
      if (cats.has(d.category)) return true;
      const blob = `${d.description} ${d.rootCause || ''} ${d.fix || ''}`.toLowerCase();
      // cheap word overlap — no embeddings, no scan
      return tl.split(/\s+/).some((w) => w.length > 4 && blob.includes(w));
    })
    .slice(-6)
    .map((d) => ({
      id: d.id,
      category: d.category,
      what: d.description,
      fix: d.fix || d.preventionRule || null,
      recurrence: d.recurrence || 0,
    }));

  // 3 · RELEVANT FILES — from memory's recorded pages/lessons + a shallow match.
  // We deliberately do NOT walk the tree; we trust what memory already knows.
  const fileHints = new Set();
  for (const d of mem.defects || []) if (d.page && (cats.has(d.category) || tl.includes('page'))) fileHints.add(d.page);
  for (const l of mem.lessons || []) {
    const f = l.data && (l.data.file || l.data.page);
    if (f) {
      const blob = JSON.stringify(l.data).toLowerCase();
      if (tl.split(/\s+/).some((w) => w.length > 4 && blob.includes(w))) fileHints.add(f);
    }
  }

  // 4 · token budget suggestion — focused slices should stay small.
  const suggestedBudget = cats.has('layout') || cats.has('render') ? 12000 : 8000;

  // 5 · Role + Format + Constraints scaffold (Foundational Structure) — derived
  // from THIS task's categories + gates, not generic boilerplate.
  const sc = scaffold(cats, gates);

  return {
    task,
    categories: [...cats],
    role: sc.role,
    format: sc.format,
    constraints: sc.constraints,
    gates,
    pastDefects: defects,
    relevantFiles: [...fileHints],
    suggestedBudget,
    note: 'Read this instead of the repo. Grep specific files only when a gate or defect points at one.',
  };
}

function render(b) {
  const L = [];
  L.push('');
  L.push(`  ${C.b}Task Brief${C.r}  ${C.dim}${b.task || '(no task given)'}${C.r}`);
  L.push(`  ${C.dim}context firewall — hold THIS, not the whole repo${C.r}`);
  if (b.categories.length) L.push(`  ${C.dim}areas: ${b.categories.join(', ')}${C.r}`);
  L.push('');

  // 0 · the scaffold to paste into a sub-prompt (Role + Format + Constraints).
  L.push(`  ${C.b}0 · Prompt scaffold${C.r}  ${C.dim}(Role + Task + Context + Format + Constraints)${C.r}`);
  L.push(`     ${C.yellow}Role${C.r}     Act as a ${b.role}.`);
  L.push(`     ${C.yellow}Format${C.r}   Return ${b.format}.`);
  L.push(`     ${C.yellow}Don't${C.r}`);
  for (const c of b.constraints) L.push(`        ${C.red}·${C.r} ${c}`);
  L.push('');

  L.push(`  ${C.b}1 · Gates you must satisfy${C.r}`);
  if (!b.gates.length) L.push(`     ${C.dim}none learned yet${C.r}`);
  for (const g of b.gates.slice(0, 8)) {
    L.push(`     ${g.auto ? C.red + '⚑' + C.r : C.green + '✓' + C.r} ${C.yellow}${g.category}${C.r}  ${g.rule}`);
  }
  L.push('');

  L.push(`  ${C.b}2 · What broke here before${C.r}`);
  if (!b.pastDefects.length) L.push(`     ${C.dim}no past defects in this area — fresh ground${C.r}`);
  for (const d of b.pastDefects) {
    const rep = d.recurrence ? ` ${C.red}(came back ${d.recurrence + 1}×)${C.r}` : '';
    L.push(`     ${C.dim}${d.id}${C.r} ${d.what}${rep}`);
    if (d.fix) L.push(`        ${C.green}fix:${C.r} ${d.fix}`);
  }
  L.push('');

  L.push(`  ${C.b}3 · Files memory points at${C.r}`);
  if (!b.relevantFiles.length) L.push(`     ${C.dim}none recorded — grep for the anchor, don't read whole files${C.r}`);
  for (const f of b.relevantFiles.slice(0, 8)) L.push(`     ${C.cyan}${f}${C.r}`);
  L.push('');

  L.push(`  ${C.b}4 · Suggested token budget${C.r}  ${C.cyan}${b.suggestedBudget.toLocaleString()} tok${C.r}`);
  L.push(`     ${C.dim}ai budget declare "${b.task}" --budget=${b.suggestedBudget}${C.r}`);
  L.push('');
  L.push(`  ${C.dim}${b.note}${C.r}`);
  const cost = tokenEstimate(L.join('\n'));
  L.push(`  ${C.dim}(this brief ≈ ${cost} tokens — vs. thousands to read the repo)${C.r}`);
  L.push('');
  return L.join('\n');
}

if (require.main === module) {
  const b = build(task);
  if (JSON_OUT) process.stdout.write(JSON.stringify(b, null, 2) + '\n');
  else process.stdout.write(render(b));
}

module.exports = { build, categoriesFor, scaffold, KEYWORD_CATEGORY, ROLE_BY_CATEGORY, FORMAT_BY_CATEGORY };
