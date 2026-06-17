#!/usr/bin/env node
'use strict';

/**
 * token-budget.cjs — the ACTIVE token-budget enforcer.
 *
 * The repo already has passive token tooling (mycelium --token-check shows you
 * what you've spent). This is the active half: a per-task budget *contract*.
 *
 *   1. DECLARE a budget for the task up front:
 *        node bin/token-budget.cjs declare "fix nav overflow" --budget=8000
 *   2. CHECK files BEFORE reading — get told if a read will blow the budget,
 *      and the cheaper pattern to use instead:
 *        node bin/token-budget.cjs check public/invest.html mycelium.cjs
 *   3. STATUS — actual vs. declared, with a verdict:
 *        node bin/token-budget.cjs status
 *   4. CLOSE — finalise the task, append a waste-signal the scorecard reads:
 *        node bin/token-budget.cjs close
 *
 * It reuses the exact estimation constants from the platform doctrine so its
 * numbers agree with mycelium's --token-check. The point is to make "super
 * token efficiency" something you FEEL mid-task, not a doc you read once.
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
const STATE = path.join(ROOT, '.mycelium', 'token-budget.json');
const WASTE_LOG = path.join(ROOT, '.mycelium', 'budget-waste.jsonl');

// ── doctrine constants (kept in sync with mycelium.cjs on purpose) ───────────
const CHARS_PER_TOKEN = 4; // conservative: code ≈ 3.5–4 chars/token
const MAX_SINGLE_FILE_READ_TOKENS = 15000; // never read a file bigger than this whole
const DEFAULT_BUDGET = 10000; // a focused slice should rarely exceed this

const C = colors(process.stdout);
const args = process.argv.slice(2);
const cmd = args[0];
const JSON_OUT = args.includes('--json');

function flag(name, dflt) {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : dflt;
}

// ── estimation (matches mycelium fileCostTier) ───────────────────────────────
function estimateFileTokens(fp) {
  try {
    const resolved = path.resolve(ROOT, fp);
    if (!fs.existsSync(resolved)) return 0;
    return Math.ceil(fs.statSync(resolved).size / CHARS_PER_TOKEN);
  } catch {
    return 0;
  }
}
function costTier(tokens) {
  if (tokens === 0) return { tier: 0, label: 'empty', strategy: 'skip' };
  if (tokens <= 3000) return { tier: 1, label: 'cheap', strategy: 'safe to read whole' };
  if (tokens <= MAX_SINGLE_FILE_READ_TOKENS)
    return { tier: 2, label: 'medium', strategy: 'read whole OR grep + chunk' };
  if (tokens <= 50000) return { tier: 3, label: 'expensive', strategy: 'GREP ONLY — never read whole' };
  return { tier: 4, label: 'FATAL', strategy: 'use CLI (--query/--status), NEVER read' };
}

// ── state io ─────────────────────────────────────────────────────────────────
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, 'utf8'));
  } catch {
    return null;
  }
}
function saveState(s) {
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(s, null, 2) + '\n');
}
function out(obj, human) {
  if (JSON_OUT) process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
  else process.stdout.write(human + '\n');
}

// ── commands ─────────────────────────────────────────────────────────────────
function cmdDeclare() {
  const task = args.slice(1).filter((a) => !a.startsWith('--')).join(' ') || 'unnamed task';
  const budget = Math.max(500, parseInt(flag('budget', String(DEFAULT_BUDGET)), 10) || DEFAULT_BUDGET);
  const state = {
    task,
    budget,
    spent: 0,
    reads: [],
    declaredAt: new Date().toISOString(),
    overages: 0,
  };
  saveState(state);
  out(
    { ok: true, task, budget },
    `\n  ${C.b}Budget declared${C.r}  ${C.dim}${task}${C.r}\n  ${C.cyan}${budget.toLocaleString()} tokens${C.r} for this slice. Run ${C.b}check <files>${C.r} before each read.\n`
  );
}

function cmdCheck() {
  const state = loadState();
  const files = args.slice(1).filter((a) => !a.startsWith('--'));
  if (files.length === 0) {
    out({ error: 'no files' }, `${C.yellow}Usage: token-budget check <file> [file...]${C.r}`);
    process.exit(2);
  }

  const budget = state ? state.budget : DEFAULT_BUDGET;
  const alreadySpent = state ? state.spent : 0;
  let planTotal = 0;
  const rows = [];
  const suggestions = [];

  for (const f of files) {
    const tokens = estimateFileTokens(f);
    const tier = costTier(tokens);
    planTotal += tier.tier >= 3 ? 0 : tokens; // tier3+ should be grepped, not read whole
    rows.push({ file: f, tokens, ...tier });
    if (tier.tier >= 3) {
      suggestions.push(
        `${C.yellow}${f}${C.r} is ${C.b}${tokens.toLocaleString()} tok${C.r} (${tier.label}) — ${C.b}${tier.strategy}${C.r}. ` +
          `Use: ${C.dim}grep -n "<anchor>" ${f}${C.r} then Read with offset/limit.`
      );
    }
  }

  const projected = alreadySpent + planTotal;
  const pct = Math.round((projected / budget) * 100);
  const overBudget = projected > budget;

  const human = [];
  human.push('');
  human.push(`  ${C.b}Read plan${C.r}${state ? ` ${C.dim}· ${state.task}${C.r}` : ''}`);
  for (const r of rows) {
    const tierCol = r.tier >= 3 ? C.red : r.tier === 2 ? C.yellow : C.green;
    human.push(
      `    ${tierCol}T${r.tier}${C.r} ${String(r.tokens).padStart(7)} tok  ${r.file}  ${C.dim}${r.label}${C.r}`
    );
  }
  human.push('');
  human.push(
    `  Plan cost (read-whole only): ${C.b}~${planTotal.toLocaleString()} tok${C.r}` +
      `   Budget: ${budget.toLocaleString()}   Spent: ${alreadySpent.toLocaleString()}`
  );
  const verdictCol = overBudget ? C.red : pct >= 70 ? C.yellow : C.green;
  human.push(`  Projected after these reads: ${verdictCol}${pct}% of budget${C.r}`);
  if (overBudget) {
    human.push(`  ${C.red}⚠ This plan blows the budget.${C.r} Grep the expensive files instead of reading whole.`);
  }
  if (suggestions.length) {
    human.push('');
    human.push(`  ${C.b}Cheaper pattern:${C.r}`);
    for (const s of suggestions) human.push(`    • ${s}`);
  }
  human.push('');

  out(
    {
      budget,
      alreadySpent,
      planTotal,
      projected,
      pct,
      overBudget,
      files: rows.map((r) => ({ file: r.file, tokens: r.tokens, tier: r.tier, label: r.label })),
      suggestions: suggestions.length,
    },
    human.join('\n')
  );
  // Non-zero exit when the plan would blow the budget — lets a hook block it.
  if (overBudget) process.exit(1);
}

function cmdSpend() {
  // Record actual reads (a wrapper/hook can call this after a Read happens).
  const state = loadState();
  if (!state) {
    out({ error: 'no active budget' }, `${C.yellow}No budget declared. Run: token-budget declare "<task>"${C.r}`);
    process.exit(2);
  }
  const files = args.slice(1).filter((a) => !a.startsWith('--'));
  for (const f of files) {
    const tokens = estimateFileTokens(f);
    state.reads.push({ file: f, tokens, at: Date.now() });
    state.spent += tokens;
  }
  if (state.spent > state.budget) state.overages++;
  saveState(state);
  cmdStatus();
}

function cmdStatus() {
  const state = loadState();
  if (!state) {
    out({ active: false }, `\n  ${C.dim}No active budget. Declare one: token-budget declare "<task>" --budget=8000${C.r}\n`);
    return;
  }
  const pct = Math.round((state.spent / state.budget) * 100);
  const remaining = state.budget - state.spent;
  const col = pct >= 100 ? C.red : pct >= 70 ? C.yellow : C.green;
  const human = [
    '',
    `  ${C.b}Token Budget${C.r}  ${C.dim}${state.task}${C.r}`,
    `  ${col}${state.spent.toLocaleString()} / ${state.budget.toLocaleString()} tok  (${pct}%)${C.r}   remaining: ${remaining.toLocaleString()}`,
    `  reads: ${state.reads.length}${state.overages ? `   ${C.red}overages: ${state.overages}${C.r}` : ''}`,
  ];
  if (pct >= 100) human.push(`  ${C.red}⚠ Over budget. Wrap up — grep, don't read; commit what you have.${C.r}`);
  else if (pct >= 70) human.push(`  ${C.yellow}Approaching limit — switch to grep-only for anything big.${C.r}`);
  human.push('');
  out({ active: true, ...state, pct, remaining }, human.join('\n'));
}

function cmdClose() {
  const state = loadState();
  if (!state) {
    out({ closed: false }, `${C.dim}No active budget to close.${C.r}`);
    return;
  }
  const pct = Math.round((state.spent / state.budget) * 100);
  const wasted = Math.max(0, state.spent - state.budget);
  // Append a waste signal the Session Scorecard can fold into its waste metric.
  const record = {
    ts: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    task: state.task,
    budget: state.budget,
    spent: state.spent,
    pct,
    overBudget: state.spent > state.budget,
    wastedTokens: wasted,
    reads: state.reads.length,
  };
  try {
    fs.mkdirSync(path.dirname(WASTE_LOG), { recursive: true });
    fs.appendFileSync(WASTE_LOG, JSON.stringify(record) + '\n');
  } catch {}
  try {
    fs.unlinkSync(STATE);
  } catch {}
  const col = pct > 100 ? C.red : pct >= 70 ? C.yellow : C.green;
  out(
    { closed: true, ...record },
    `\n  ${C.b}Budget closed${C.r}  ${C.dim}${state.task}${C.r}\n  ${col}${state.spent.toLocaleString()} / ${state.budget.toLocaleString()} (${pct}%)${C.r}` +
      (record.overBudget ? `  ${C.red}— ${wasted.toLocaleString()} tok over${C.r}` : `  ${C.green}— within budget${C.r}`) +
      `\n  ${C.dim}Recorded to budget-waste.jsonl for the scorecard.${C.r}\n`
  );
}

function usage() {
  process.stdout.write(
    `\n  ${C.b}token-budget${C.r} — active per-task token budget enforcer\n\n` +
      `  ${C.b}declare${C.r} "<task>" [--budget=N]   start a budget contract (default ${DEFAULT_BUDGET})\n` +
      `  ${C.b}check${C.r}   <files...>              estimate a read plan vs. remaining budget (exit 1 if over)\n` +
      `  ${C.b}spend${C.r}   <files...>              record actual reads against the budget\n` +
      `  ${C.b}status${C.r}                          show spent vs. budget\n` +
      `  ${C.b}close${C.r}                           finalise + log a waste signal for the scorecard\n\n` +
      `  Add --json to any command for machine-readable output.\n`
  );
}

// Only dispatch when run as a CLI — keep `require()` side-effect-free so tests
// (and the scorecard) can import the pure functions without printing usage.
if (require.main === module) {
  switch (cmd) {
    case 'declare':
      cmdDeclare();
      break;
    case 'check':
      cmdCheck();
      break;
    case 'spend':
      cmdSpend();
      break;
    case 'status':
      cmdStatus();
      break;
    case 'close':
      cmdClose();
      break;
    default:
      usage();
  }
}

module.exports = { estimateFileTokens, costTier, CHARS_PER_TOKEN, MAX_SINGLE_FILE_READ_TOKENS };
