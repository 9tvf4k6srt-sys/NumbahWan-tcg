#!/usr/bin/env node
'use strict';

/**
 * learn-loop.cjs — close the defect → lesson → gate flywheel automatically.
 *
 * The repo already has every piece of a learning system:
 *   - the gates catch problems (aitell, layout, render-risk, tsc, vitest)
 *   - factory-memory.cjs can recordDefect(), detect recurrence, and evolve()
 *     frequent defects into AUTO-GATE prevention rules.
 * What was missing is the WIRE between them: when a gate fails, the failure was
 * printed and thrown away. Nothing learned. This module is that wire.
 *
 *   capture  — turn a gate failure into a structured defect in factory-memory
 *              (with a category + a prevention rule), detect if it's a REPEAT,
 *              and auto-promote repeats into a permanent gate.
 *   recurring — list the defects that keep coming back (your real weak spots).
 *   status    — the one honest number: how many logged defects recurred anyway.
 *
 * This is what makes "gets better as I build" true instead of decorative: every
 * escape is captured once, and the second time it tries to escape it is blocked.
 */

const path = require('path');
const fm = require('./factory-memory.cjs');

let colors;
try {
  ({ colors } = require('../tools/lib/aitell-common.cjs'));
} catch {
  colors = () => new Proxy({}, { get: () => '' });
}
const C = colors(process.stdout);

const args = process.argv.slice(2);
const cmd = args[0];
const JSON_OUT = args.includes('--json');

function flag(name, dflt) {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : dflt;
}

// ── map a gate/tool to a defect category + a prevention rule ─────────────────
// Categories line up with factory-memory's buckets and evolve()'s grouping so
// recurrence + auto-gating "just work" on top of the existing engine.
const GATE_MAP = {
  'ai-tell': { category: 'ai-tell', rule: 'Run `ai aitell` on copy before ship; rewrite flagged phrases in a human voice.' },
  aitell: { category: 'ai-tell', rule: 'Run `ai aitell` on copy before ship; rewrite flagged phrases in a human voice.' },
  stylometry: { category: 'ai-tell', rule: 'Vary sentence length/rhythm; machine-rhythm score must stay human (<60).' },
  layout: { category: 'layout', rule: 'Run `ai layout`; no emoji-as-icon, no stock indigo→purple gradient, no default shadow.' },
  render: { category: 'render', rule: 'Run `ai render --strict`; check word-fuse, mid-word break, mobile overflow.' },
  'render-risk': { category: 'render', rule: 'Run `ai render --strict` on any visual change before ship.' },
  pagesize: { category: 'perf', rule: 'Keep pages under the size baseline; split heavy inline JS/CSS.' },
  'page-size': { category: 'perf', rule: 'Keep pages under the size baseline; split heavy inline JS/CSS.' },
  asset: { category: 'asset', rule: 'Run asset-alpha gate; no opaque corners / enclosed dark holes in logos.' },
  tsc: { category: 'types', rule: 'Run `tsc --noEmit` clean before ship; no implicit any / missing types.' },
  vitest: { category: 'logic', rule: 'All unit tests green before ship; add a regression test for the fix.' },
  i18n: { category: 'i18n', rule: 'Every user-facing string keyed + translated; run the i18n gate.' },
};

function classify(gate) {
  const key = String(gate || '').toLowerCase();
  for (const k of Object.keys(GATE_MAP)) {
    if (key.includes(k)) return GATE_MAP[k];
  }
  return { category: 'unknown', rule: `Re-run the "${gate}" gate before ship and fix what it flags.` };
}

function out(obj, human) {
  if (JSON_OUT) process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
  else process.stdout.write(human + '\n');
}

// ── recurrence stats over the live defect log (the honest number) ────────────
function recurrenceStats(mem) {
  const defects = mem.defects || [];
  // group by category+description — the same shape recordDefect() uses
  const seen = new Map();
  let repeats = 0;
  for (const d of defects) {
    const key = `${d.category}::${d.description}`;
    if (seen.has(key)) repeats++;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  const distinct = seen.size;
  const total = defects.length;
  // repeat-rate = share of logged defects that were a repeat of an earlier one
  const repeatRate = total ? +(repeats / total).toFixed(3) : null;
  // which ones keep coming back
  const recurring = [...seen.entries()]
    .filter(([, n]) => n > 1)
    .map(([key, n]) => {
      const [category, description] = key.split('::');
      return { category, description, occurrences: n };
    })
    .sort((a, b) => b.occurrences - a.occurrences);
  return { total, distinct, repeats, repeatRate, recurring };
}

// ── capture: a gate failure becomes a structured, learnable defect ───────────
function cmdCapture() {
  const gate = flag('gate', args[1] && !args[1].startsWith('--') ? args[1] : 'unknown');
  const desc =
    flag('desc', null) ||
    args.slice(1).filter((a) => !a.startsWith('--')).slice(1).join(' ') ||
    `${gate} gate failed`;
  const page = flag('page', null);
  const severity = flag('severity', 'medium');
  const { category, rule } = classify(gate);

  const mem = fm.loadMemory();
  const before = recurrenceStats(mem);

  const defect = fm.recordDefect(mem, {
    category,
    severity,
    page,
    description: desc,
    rootCause: `Caught by the "${gate}" gate.`,
    preventionRule: rule,
    fixApplied: false,
  });

  // If this category now has >=2 occurrences, evolve() will mint an AUTO-GATE.
  // We promote eagerly here so the *second* escape is blocked, not the third.
  const after = recurrenceStats(mem);
  const isRepeat = defect.recurrence > 0;
  let promoted = false;
  if (isRepeat) {
    fm.addPattern(mem, 'required_checks', {
      description: `AUTO-GATE: ${category} — ${rule}`,
      // prevention must be unique per category — addPattern() dedups by
      // description OR prevention, and a missing prevention would false-merge
      // this gate into an unrelated one whose prevention is also undefined.
      prevention: `auto-gate:${category}`,
      category,
      severity: 'error',
      autoGenerated: true,
      occurrences: defect.recurrence + 1,
    });
    promoted = true;
  }
  fm.saveMemory(mem);

  const human = [
    '',
    `  ${C.b}Captured${C.r}  ${C.dim}${defect.id} · ${category}${C.r}`,
    `  ${desc}`,
    isRepeat
      ? `  ${C.red}⚠ REPEAT (${defect.recurrence + 1}×)${C.r} — promoted to a permanent gate so it can't escape again.`
      : `  ${C.green}First time seen.${C.r} Logged with a prevention rule; a repeat will auto-gate it.`,
    `  ${C.dim}prevention:${C.r} ${rule}`,
    '',
  ];
  out(
    { ok: true, id: defect.id, category, severity, isRepeat, recurrence: defect.recurrence, promoted, repeatRate: after.repeatRate },
    human.join('\n')
  );
}

// ── recurring: the defects that keep coming back ─────────────────────────────
function cmdRecurring() {
  const mem = fm.loadMemory();
  const s = recurrenceStats(mem);
  if (!s.recurring.length) {
    out({ recurring: [] }, `\n  ${C.green}No recurring defects — every logged mistake stayed fixed.${C.r}\n`);
    return;
  }
  const human = ['', `  ${C.b}Recurring defects${C.r}  ${C.dim}(your real weak spots)${C.r}`];
  for (const r of s.recurring) {
    human.push(`    ${C.red}${r.occurrences}×${C.r}  ${C.yellow}${r.category}${C.r}  ${r.description}`);
  }
  human.push('');
  out({ recurring: s.recurring }, human.join('\n'));
}

// ── status: the one honest number ────────────────────────────────────────────
function cmdStatus() {
  const mem = fm.loadMemory();
  const s = recurrenceStats(mem);
  const gates = (mem.patterns && mem.patterns.required_checks) || [];
  const autoGates = gates.filter((g) => g.autoGenerated).length;
  const rPct = s.repeatRate == null ? null : Math.round(s.repeatRate * 100);
  const col = rPct == null ? C.dim : rPct === 0 ? C.green : rPct < 25 ? C.yellow : C.red;
  const human = [
    '',
    `  ${C.b}Learning Loop${C.r}  ${C.dim}defect → lesson → gate${C.r}`,
    `  defects logged: ${s.total}   distinct: ${s.distinct}   repeats: ${s.repeats}`,
    `  ${col}repeat-rate: ${rPct == null ? 'n/a' : rPct + '%'}${C.r}   ${C.dim}(share of defects that came back — drive to 0)${C.r}`,
    `  permanent gates: ${gates.length}   ${C.dim}auto-generated from repeats: ${autoGates}${C.r}`,
    '',
  ];
  out({ ...s, gates: gates.length, autoGates }, human.join('\n'));
}

function usage() {
  process.stdout.write(
    `\n  ${C.b}learn-loop${C.r} — close the defect → lesson → gate flywheel\n\n` +
      `  ${C.b}capture${C.r} <gate> "<what slipped>" [--page=.. --severity=..]   log a gate failure as a learnable defect (auto-gates repeats)\n` +
      `  ${C.b}recurring${C.r}                                            defects that keep coming back\n` +
      `  ${C.b}status${C.r}                                               repeat-rate + how many permanent gates exist\n\n` +
      `  Add --json to any command.\n`
  );
}

if (require.main === module) {
  switch (cmd) {
    case 'capture':
      cmdCapture();
      break;
    case 'recurring':
      cmdRecurring();
      break;
    case 'status':
      cmdStatus();
      break;
    default:
      usage();
  }
}

module.exports = { classify, recurrenceStats, GATE_MAP };
