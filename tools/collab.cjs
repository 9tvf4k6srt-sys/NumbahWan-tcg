#!/usr/bin/env node
/**
 * collab.cjs — the executable side of COLLAB-PROTOCOL.md
 *
 * Turns the human's "AI upgrade manual" into cheap-to-run rituals so the
 * discernment / boundary / reflection discipline actually gets used. It writes
 * collaboration lessons into the SAME mycelium memory store (no orphan loop —
 * the manual explicitly warns against disconnected learning stores).
 *
 * Sub-commands:
 *   fp "<problem>"        first-principles decomposition prompt
 *   discern "<claim>"     run the discernment checklist on a claim
 *   boundary "<task>"     mechanical vs judgment + what to hand back to the human
 *   reflect [flags]       log a collaboration lesson with a strengthen/weaken verdict
 *   audit                 trend: are our interactions strengthening the human?
 *
 * Read-only by default. Only `reflect` writes (one line into the memory store).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STORE = path.join(ROOT, '.mycelium', 'collab.jsonl');

// ── tiny ansi (mirror tools/lib/aitell-common.cjs convention) ─────────────
const C = process.stdout.isTTY
  ? { r:'\x1b[0m', b:'\x1b[1m', dim:'\x1b[2m', cyan:'\x1b[36m', green:'\x1b[32m',
      yellow:'\x1b[33m', red:'\x1b[31m', mag:'\x1b[35m' }
  : { r:'', b:'', dim:'', cyan:'', green:'', yellow:'', red:'', mag:'' };
const out = (s = '') => process.stdout.write(s + '\n');
const rule = () => out(C.dim + '  ' + '─'.repeat(58) + C.r);

// ── helpers ───────────────────────────────────────────────────────────────
function header(title) {
  out('');
  out(`  ${C.b}${title}${C.r}`);
  rule();
}

function bullet(label, body) {
  out(`  ${C.cyan}${label}${C.r}  ${body}`);
}

/** Persist a collaboration lesson into the shared mycelium memory + local jsonl. */
function recordLesson(entry) {
  // local append-only log (cheap, always works)
  try {
    fs.mkdirSync(path.dirname(STORE), { recursive: true });
    fs.appendFileSync(STORE, JSON.stringify(entry) + '\n');
  } catch (e) { /* non-fatal */ }
  // mirror into the canonical memory store so there is ONE source of truth
  // (manual: do not create disconnected loops). Best-effort; never blocks.
  try {
    const lesson = `[collab/${entry.verdict}] ${entry.change || entry.note || 'collaboration note'}`;
    execFileSync('node', ['mycelium.cjs', '--learned', 'collab', lesson], {
      cwd: ROOT, stdio: 'ignore', timeout: 8000,
    });
  } catch (e) { /* mycelium may be unavailable; local log still holds it */ }
}

function readLessons() {
  if (!fs.existsSync(STORE)) return [];
  return fs.readFileSync(STORE, 'utf8')
    .split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

// ── sub-commands ────────────────────────────────────────────────────────────

function cmdFp(problem) {
  header('FIRST PRINCIPLES — decompose before you delegate');
  out(`  ${C.dim}problem:${C.r} ${problem || '(state the problem)'}`);
  out('');
  out('  Answer these IN ORDER before reaching for any tool:');
  out('');
  bullet('1. Optimize?', 'What is actually being optimized — one sentence, no jargon.');
  bullet('2. Real constraint?', 'What is the binding constraint (time, tokens, trust, truth)?');
  bullet('3. No-tools?', 'How would you solve this with no AI/tools at all? That is the spine.');
  bullet('4. Primitives?', 'Break it into parts that cannot be broken further.');
  bullet('5. Then delegate', 'ONLY now pick the tool — and only for the mechanical primitives.');
  out('');
  out(`  ${C.yellow}Why:${C.r} the most expensive error is solving the wrong problem fast.`);
  out(`  ${C.dim}(COLLAB-PROTOCOL.md §5)${C.r}`);
}

function cmdDiscern(claim) {
  header('DISCERNMENT — never accept output as oracle (mine included)');
  out(`  ${C.dim}claim:${C.r} ${claim || '(state the claim under test)'}`);
  out('');
  bullet('Source?', 'primary > secondary > model prior. Label which one this is.');
  bullet('Reasoning?', 'show the chain. If it can\'t be shown, it can\'t be asserted.');
  bullet('Alternatives?', 'steel-man at least one real counter-position.');
  bullet('Falsify?', 'what single fact would prove this wrong? Name it.');
  bullet('Cross-check?', 'fast-moving domain → verify vs CURRENT primary data, not memory.');
  out('');
  out(`  ${C.yellow}Apply to your OWN draft first.${C.r} A confident wrong answer is the`);
  out(`  most expensive output there is. ${C.dim}(COLLAB-PROTOCOL.md §3)${C.r}`);
}

function cmdBoundary(task) {
  header('DELEGATION BOUNDARY — mechanical or judgment?');
  out(`  ${C.dim}task:${C.r} ${task || '(name the task)'}`);
  out('');
  out(`  ${C.green}MECHANICAL${C.r} — AI owns it, move fast:`);
  out('    data aggregation · summarization · drafting · refactor · scaffolding');
  out('    lint / verify / ship pipeline · format · search');
  out('');
  out(`  ${C.mag}JUDGMENT${C.r} — human owns it, hand it back:`);
  out('    which strategy · what "good" means here · final go/no-go');
  out('    anything touching real money / reputation / ethics / relationships');
  out('');
  out(`  ${C.b}If it crosses into judgment, STOP and surface:${C.r}`);
  bullet('options', 'the real choices, not a single pre-picked one');
  bullet('tradeoffs', 'honest cost of each');
  bullet('recommendation', 'mine, clearly labeled as a recommendation');
  bullet('change-my-mind', 'what fact would flip my recommendation');
  out('');
  out(`  ${C.yellow}Rule:${C.r} on growth-critical work, keep AI under ~50% of the thinking.`);
  out(`  Doing 100% of the thinking is a failure even if the output is right.`);
  out(`  ${C.dim}(COLLAB-PROTOCOL.md §2)${C.r}`);
}

function parseFlags(args) {
  const f = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = (args[i + 1] && !args[i + 1].startsWith('--')) ? args[++i] : 'true';
      f[key] = val;
    }
  }
  return f;
}

function cmdReflect(args) {
  const f = parseFlags(args);
  const verdict = (f.verdict || '').toLowerCase();
  const valid = ['strengthen', 'weaken', 'neutral'];
  if (!valid.includes(verdict)) {
    header('REFLECT — close the loop (this is what compounds)');
    out('  Log a collaboration lesson. The verdict is the point: did this');
    out('  interaction strengthen or weaken the human\'s independent capability?');
    out('');
    out('  Usage:');
    out(`    ${C.cyan}collab reflect --verdict <strengthen|weaken|neutral> \\${C.r}`);
    out(`      ${C.cyan}--human "<what only a human could do>" \\${C.r}`);
    out(`      ${C.cyan}--ai "<what was pure leverage>" \\${C.r}`);
    out(`      ${C.cyan}--change "<one thing to change in HOW we collaborate>"${C.r}`);
    out('');
    out(`  ${C.dim}(COLLAB-PROTOCOL.md §4)${C.r}`);
    process.exit(verdict ? 1 : 0);
  }
  const entry = {
    ts: new Date().toISOString(),
    verdict,
    human: f.human || '',
    ai: f.ai || '',
    change: f.change || '',
    note: f.note || '',
  };
  recordLesson(entry);
  header('REFLECT — logged');
  bullet('verdict', verdict === 'weaken'
    ? `${C.red}weaken${C.r}  ← flag: rebalance next time, human did too little`
    : verdict === 'strengthen'
      ? `${C.green}strengthen${C.r}`
      : `${C.yellow}neutral${C.r}`);
  if (entry.human)  bullet('human ', entry.human);
  if (entry.ai)     bullet('ai    ', entry.ai);
  if (entry.change) bullet('change', entry.change);
  out('');
  out(`  ${C.dim}saved → .mycelium/collab.jsonl  +  mirrored into memory store${C.r}`);
}

function cmdAudit() {
  const lessons = readLessons();
  header('COLLAB AUDIT — are our interactions strengthening the human?');
  if (!lessons.length) {
    out('  No reflections logged yet. After a meaningful task, run:');
    out(`    ${C.cyan}node bin/ai.cjs collab reflect --verdict <...> ...${C.r}`);
    out(`  ${C.dim}The weekly question only helps if it gets asked.${C.r}`);
    return;
  }
  const tally = { strengthen: 0, weaken: 0, neutral: 0 };
  for (const l of lessons) if (tally[l.verdict] != null) tally[l.verdict]++;
  const total = lessons.length;
  const pct = (n) => total ? Math.round((n / total) * 100) : 0;

  out(`  ${total} reflection${total === 1 ? '' : 's'} logged`);
  out('');
  out(`    ${C.green}strengthen${C.r}  ${tally.strengthen}  (${pct(tally.strengthen)}%)`);
  out(`    ${C.yellow}neutral   ${C.r}  ${tally.neutral}  (${pct(tally.neutral)}%)`);
  out(`    ${C.red}weaken    ${C.r}  ${tally.weaken}  (${pct(tally.weaken)}%)`);
  out('');
  // the verdict the manual cares about
  if (tally.weaken > tally.strengthen) {
    out(`  ${C.red}⚠ trend: AI is doing too much of the thinking.${C.r}`);
    out(`  ${C.red}  Rebalance — hand more judgment back to the human.${C.r}`);
  } else if (tally.strengthen >= Math.max(1, total * 0.5)) {
    out(`  ${C.green}✓ trend: collaboration is compounding the human's capability.${C.r}`);
  } else {
    out(`  ${C.yellow}~ trend: mixed. Watch the boundary on growth-critical tasks.${C.r}`);
  }
  out('');
  out(`  ${C.b}Recent changes-to-make:${C.r}`);
  lessons.filter((l) => l.change).slice(-3).forEach((l) => {
    out(`    ${C.dim}${l.ts.slice(0, 10)}${C.r} ${l.change}`);
  });
}

function menu() {
  out('');
  out(`  ${C.b}collab — the human+AI operating contract, made runnable${C.r}`);
  out(`  ${C.dim}Read COLLAB-PROTOCOL.md once. These commands keep the discipline cheap.${C.r}`);
  rule();
  bullet('fp "<problem>"     ', 'first-principles decomposition before delegating');
  bullet('discern "<claim>"  ', 'discernment checklist (source/reasoning/falsify/cross-check)');
  bullet('boundary "<task>"  ', 'mechanical vs judgment — what to hand back to the human');
  bullet('reflect --verdict… ', 'log a collaboration lesson (strengthen/weaken/neutral)');
  bullet('audit              ', 'trend: are our interactions strengthening the human?');
  out('');
  out(`  ${C.dim}Roles in every non-trivial task: Researcher → Critic → Synthesizer → Reflector.${C.r}`);
}

// ── dispatch ──────────────────────────────────────────────────────────────
const [sub, ...rest] = process.argv.slice(2);
switch (sub) {
  case 'fp':       cmdFp(rest.join(' ')); break;
  case 'discern':  cmdDiscern(rest.join(' ')); break;
  case 'boundary': cmdBoundary(rest.join(' ')); break;
  case 'reflect':  cmdReflect(rest); break;
  case 'audit':    cmdAudit(); break;
  case undefined:
  case 'help':     menu(); break;
  default:
    out(`${C.red}Unknown collab subcommand: ${sub}${C.r}`);
    menu();
    process.exit(1);
}
