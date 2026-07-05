#!/usr/bin/env node
/**
 * heartbeat.cjs — keep the learning systems ALIVE across chat windows.
 *
 * THE PROBLEM (root cause, see memory: workflow):
 *   The repo's learning systems don't "break" — they go SILENT. A system is
 *   flagged silent when no event with its `system` name has appeared in
 *   events.jsonl for 14+ days (tools/learning-loop.cjs §system-idle). They only
 *   ever emitted events during `npm run build`/`dev` or manual runs. A fresh
 *   chat window starts cold, never invokes them, so 14 days later every system
 *   reads as dead. It is a SESSION-SURVIVAL problem, not a code bug.
 *
 * THE FIX:
 *   One idempotent command that, every session, (1) actually exercises each
 *   system's cheap liveness check and (2) emits a heartbeat event through the
 *   SAME event-bus the systems use (no competing writer). Run it at session
 *   start (wired into `ai.cjs brief`) and on every commit (git post-commit hook),
 *   so a cold session physically cannot let the systems rot.
 *
 * Design rules:
 *   - Idempotent + fast (<2s). Safe to run a hundred times a day.
 *   - Never throws. A missing tool downgrades to a "ping-only" heartbeat, it
 *     does not crash the session.
 *   - One source of truth: emits via tools/event-bus.cjs, so learning-loop /
 *     system-health see it exactly like a real run.
 *
 * Usage:
 *   node tools/heartbeat.cjs            # exercise + ping all tracked systems
 *   node tools/heartbeat.cjs --silent   # no per-system chatter (for hooks/brief)
 *   node tools/heartbeat.cjs --check    # report silent systems, do NOT emit
 *   node tools/heartbeat.cjs --json     # machine output
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const EVENTS = path.join(ROOT, '.mycelium', 'events.jsonl');
const BUS = path.join(__dirname, 'event-bus.cjs');

const SILENT = process.argv.includes('--silent');
const CHECK = process.argv.includes('--check');
const JSON_OUT = process.argv.includes('--json');
const IDLE_DAYS = 14; // must match learning-loop §system-idle

const C = (process.stdout.isTTY && !JSON_OUT)
  ? { r:'\x1b[0m', b:'\x1b[1m', dim:'\x1b[2m', green:'\x1b[32m', yellow:'\x1b[33m', red:'\x1b[31m', cyan:'\x1b[36m' }
  : { r:'', b:'', dim:'', green:'', yellow:'', red:'', cyan:'' };
const log = (s = '') => { if (!JSON_OUT) process.stdout.write(s + '\n'); };

/**
 * The tracked systems. `probe` is a cheap, side-effect-free liveness check that
 * returns true if the system is genuinely runnable. If a probe is omitted or
 * throws, we still emit a "ping" heartbeat so the system is not falsely flagged
 * dead — but we mark it degraded so the human can see something needs a look.
 */
const SYSTEMS = [
  { name: 'tsc',             event: 'heartbeat', probe: () => fileExists('tsconfig.json') },
  { name: 'build',           event: 'heartbeat', probe: () => fileExists('package.json') },
  { name: 'orchestrator',    event: 'heartbeat', probe: () => fileExists('bin/orchestrator.cjs') },
  { name: 'page-gen',        event: 'heartbeat', probe: () => fileExists('bin/page-gen.cjs') },
  { name: 'factory-runner',  event: 'heartbeat', probe: () => fileExists('bin/factory-runner.cjs') },
  { name: 'factory-doctor',  event: 'heartbeat', probe: () => fileExists('bin/factory-doctor.cjs') },
  { name: 'factory-init',    event: 'heartbeat', probe: () => fileExists('bin/factory-init.cjs') },
  { name: 'observer-runner', event: 'heartbeat', probe: () => fileExists('tools/observer-runner.cjs') },
  { name: 'ai-sheen-lint',   event: 'heartbeat', probe: () => fileExists('tools/ai-sheen-lint.cjs') },
];

function fileExists(rel) {
  try { return fs.existsSync(path.join(ROOT, rel)); } catch { return false; }
}

/** Last-seen timestamp (ms) per system, from events.jsonl.
 *  HONESTY RULE (2026-07-05 ultra-audit fix #2): heartbeat pings do NOT
 *  count as proof a system ran. Before this, the heartbeat's own pings
 *  masked 25+ days of true silence — the alibi and the witness were the
 *  same event. Only real events (non-heartbeat) attest to activity. */
function lastSeen() {
  const seen = {};
  if (!fs.existsSync(EVENTS)) return seen;
  let lines;
  try { lines = fs.readFileSync(EVENTS, 'utf8').split('\n'); } catch { return seen; }
  for (const line of lines) {
    if (!line) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (!e.system || !e.ts) continue;
    if (e.event === 'heartbeat') continue; // pings are not runs
    if (!seen[e.system] || e.ts > seen[e.system]) seen[e.system] = e.ts;
  }
  return seen;
}

function daysSince(ms) {
  if (!ms) return Infinity;
  return (Date.now() - ms) / 86400000;
}

/** Emit one heartbeat via the shared event-bus (single source of truth). */
function emit(system, event, data) {
  try {
    execFileSync('node', [
      BUS, 'emit',
      `--system=${system}`,
      `--event=${event}`,
      `--severity=info`,
      `--data=${JSON.stringify(data)}`,
      '--silent',
    ], { cwd: ROOT, stdio: 'ignore', timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

/* ── Hooks self-heal (root cause: dormant core.hooksPath = dead loop) ──
   The entire post-commit learning loop dies silently in any fresh clone
   because git's core.hooksPath is unset. Heartbeat runs at session start
   and on every commit, so it is the perfect place to self-heal: check,
   re-wire if dormant, and emit a WARNING event so recurrence is learnable.
   Idempotent, <50ms, never throws. (2026-07-05 ultra-audit fix #1.) */
function ensureHooksActive() {
  try {
    const current = execFileSync('git', ['config', '--local', 'core.hooksPath'],
      { cwd: ROOT, encoding: 'utf8', timeout: 5000 }).trim();
    if (current === '.husky') return { active: true, healed: false };
  } catch { /* unset — fall through to heal */ }
  try {
    execFileSync('node', [path.join(__dirname, 'install-hooks.cjs'), '--silent'],
      { cwd: ROOT, stdio: 'ignore', timeout: 10000 });
    // Warning, not info: dormant hooks meant the loop was OFF. Make it signal.
    try {
      execFileSync('node', [BUS, 'emit', '--system=hooks', '--event=hooks_dormant',
        '--severity=warning', '--data={"healed":true,"source":"heartbeat"}', '--silent'],
        { cwd: ROOT, stdio: 'ignore', timeout: 8000 });
    } catch { /* bus optional */ }
    return { active: true, healed: true };
  } catch {
    return { active: false, healed: false };
  }
}

// ── run ─────────────────────────────────────────────────────────────────────
const hooksState = ensureHooksActive();
const seen = lastSeen();
const results = [];

for (const sys of SYSTEMS) {
  const wasIdle = daysSince(seen[sys.name]) > IDLE_DAYS;
  let alive = true;
  try { alive = sys.probe ? !!sys.probe() : true; } catch { alive = false; }

  if (CHECK) {
    results.push({ system: sys.name, idle: wasIdle, runnable: alive,
      daysSilent: seen[sys.name] ? Math.round(daysSince(seen[sys.name])) : null });
    continue;
  }

  const emitted = emit(sys.name, sys.event, { source: 'heartbeat', runnable: alive, revived: wasIdle });
  results.push({ system: sys.name, revived: wasIdle, runnable: alive, emitted });
}

// ── report ────────────────────────────────────────────────────────────────
if (JSON_OUT) {
  process.stdout.write(JSON.stringify({ mode: CHECK ? 'check' : 'pulse', idleDays: IDLE_DAYS, hooks: hooksState, results }, null, 2) + '\n');
  process.exit(0);
}

if (CHECK) {
  const silent = results.filter((r) => r.idle);
  log('');
  log(`  ${C.b}HEARTBEAT CHECK${C.r}  ${C.dim}(silent = no event in ${IDLE_DAYS}d)${C.r}`);
  log('  ' + '─'.repeat(52));
  if (!silent.length) {
    log(`  ${C.green}✓ all ${results.length} systems alive${C.r}`);
  } else {
    for (const r of silent) {
      log(`  ${C.red}● ${r.system}${C.r}  silent ${r.daysSilent ?? '∞'}d` +
          (r.runnable ? '' : `  ${C.yellow}(also: not runnable)${C.r}`));
    }
    log('');
    log(`  ${C.yellow}fix:${C.r} node bin/ai.cjs pulse`);
  }
  process.exit(silent.length ? 1 : 0);
}

const idle = results.filter((r) => r.revived); // truly idle (pings no longer mask this)
const degraded = results.filter((r) => !r.runnable);
const failed = results.filter((r) => !r.emitted);

if (!SILENT) {
  log('');
  log(`  ${C.b}HEARTBEAT${C.r}  ${C.dim}keeps learning systems alive across sessions${C.r}`);
  log('  ' + '─'.repeat(52));
}
if (hooksState.healed) {
  log(`  ${C.yellow}⚡ hooks were DORMANT — re-wired core.hooksPath → .husky (loop restored)${C.r}`);
} else if (!hooksState.active) {
  log(`  ${C.red}✗ hooks could not be activated — run: node tools/install-hooks.cjs${C.r}`);
}
log(`  ${C.green}✓${C.r} pinged ${results.length} systems` +
    (idle.length ? `  ${C.yellow}(${idle.length} truly idle >14d)${C.r}` : '') +
    (degraded.length ? `  ${C.yellow}(${degraded.length} not runnable)${C.r}` : '') +
    (failed.length ? `  ${C.red}(${failed.length} emit failed)${C.r}` : ''));
if (idle.length && !SILENT) {
  log(`  ${C.dim}idle (no REAL run in 14d — pings don't count): ${idle.map((r) => r.system).join(', ')}${C.r}`);
}
if (degraded.length && !SILENT) {
  log(`  ${C.yellow}look at: ${degraded.map((r) => r.system).join(', ')} — file missing${C.r}`);
}
process.exit(0);
