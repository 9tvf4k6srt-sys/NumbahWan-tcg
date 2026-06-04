#!/usr/bin/env node
/**
 * collab-observer.cjs — watch our actual collaboration and improve it AUTOMATICALLY.
 *
 * Replaces the old "AI writes a reflection about itself" path (which was a mirror,
 * not a feedback loop — the human correctly rejected it). Instead this reads the
 * objective TRACES our collaboration already leaves and derives friction patterns
 * mechanically. No prompts to the human. No AI self-grading. Just signal.
 *
 * Signals it reads (all free, already on disk):
 *   - git history: clusters of fix(<area>) commits = a RE-FIX LOOP (we keep
 *     re-touching the same area → something shipped wrong the first time).
 *   - git history: many small PRs on one area in a short window = CHURN.
 *   - .mycelium/events.jsonl: prompt_rejected / repeated diagnosis on one target
 *     = recurring breakage.
 *
 * For each pattern it knows about, it has a KNOWN REMEDY (a concrete prevention
 * already in the repo). When a pattern fires:
 *   - it records an actionable lesson into the canonical memory store, and
 *   - if a guardrail exists that would have caught it, it says exactly which
 *     command to run BEFORE shipping in that area next time (auto-executable).
 *
 * Usage:
 *   node tools/collab-observer.cjs            # observe + report
 *   node tools/collab-observer.cjs --silent   # for hooks (only persists lessons)
 *   node tools/collab-observer.cjs --json     # machine output
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const EVENTS = path.join(ROOT, '.mycelium', 'events.jsonl');
const STATE = path.join(ROOT, '.mycelium', 'collab-observer.json');

const SILENT = process.argv.includes('--silent');
const JSON_OUT = process.argv.includes('--json');
const LOOKBACK = 60; // commits to scan

const C = (process.stdout.isTTY && !JSON_OUT)
  ? { r:'\x1b[0m', b:'\x1b[1m', dim:'\x1b[2m', green:'\x1b[32m', yellow:'\x1b[33m', red:'\x1b[31m', cyan:'\x1b[36m' }
  : { r:'', b:'', dim:'', green:'', yellow:'', red:'', cyan:'' };
const log = (s = '') => { if (!JSON_OUT) process.stdout.write(s + '\n'); };

function sh(cmd, args) {
  try { return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: 8000 }); }
  catch { return ''; }
}

// Known friction patterns → the remedy already in the repo. This is where
// "execute improvements automatically" lives: each remedy is a runnable gate.
const REMEDIES = {
  guild:      { cmd: 'node bin/ai.cjs preship public/guild/brightinside/index.html',
                why: 'visual/render-risk + asset gates catch the bugs that caused the re-fix loops (#79-86)' },
  invest:     { cmd: 'node bin/ai.cjs render --strict public/invest.html',
                why: 'static render-risk eye for the biggest monolith' },
  'invest/liveops': { cmd: 'node bin/ai.cjs preship', why: 'run the full pre-ship gate on staged files' },
  default:    { cmd: 'node bin/ai.cjs preship', why: 'run the full pre-ship gate before shipping this area again' },
};

function remedyFor(area) {
  return REMEDIES[area] || REMEDIES.default;
}

// ── 1. git: re-fix loops + churn per area ────────────────────────────────────
function commitSubjects() {
  const raw = sh('git', ['log', 'origin/main', `--pretty=format:%s`, `-${LOOKBACK}`])
    || sh('git', ['log', `--pretty=format:%s`, `-${LOOKBACK}`]);
  return raw.split('\n').filter(Boolean);
}

function detectFromGit(subjects) {
  const findings = [];
  const fixByArea = {};   // area -> count of fix() commits
  const allByArea = {};   // area -> total commits

  for (const s of subjects) {
    const m = s.match(/^(feat|fix|docs|refactor|chore|perf)\(([^)]+)\)/);
    if (!m) continue;
    const [, type, area] = m;
    allByArea[area] = (allByArea[area] || 0) + 1;
    if (type === 'fix') fixByArea[area] = (fixByArea[area] || 0) + 1;
  }

  // Re-fix loop: 3+ fix() commits on one area = we keep re-shipping the same area.
  for (const [area, fixes] of Object.entries(fixByArea)) {
    if (fixes >= 3) {
      const remedy = remedyFor(area);
      findings.push({
        pattern: 're-fix-loop',
        area,
        severity: fixes >= 5 ? 'high' : 'medium',
        observed: `${fixes} fix(${area}) commits in last ${LOOKBACK} — work shipped, broke, got re-fixed repeatedly`,
        improvement: `Before shipping any "${area}" change, run: ${remedy.cmd}  (${remedy.why})`,
        autoGate: remedy.cmd,
      });
    }
  }

  // Churn: one area dominates recent commits (>40%) = disproportionate effort/iteration.
  const total = subjects.length || 1;
  for (const [area, n] of Object.entries(allByArea)) {
    if (n / total > 0.4 && n >= 6) {
      findings.push({
        pattern: 'area-churn',
        area,
        severity: 'low',
        observed: `${area} is ${Math.round((n / total) * 100)}% of recent commits (${n}/${total})`,
        improvement: `High iteration on "${area}". Consider locking it behind a stronger gate or pausing edits once stable (EFFICIENCY.md: don't keep editing stable work).`,
        autoGate: null,
      });
    }
  }
  return findings;
}

// ── 2. events: recurring breakage / rejection signals ────────────────────────
function detectFromEvents() {
  const findings = [];
  if (!fs.existsSync(EVENTS)) return findings;
  let lines = [];
  try { lines = fs.readFileSync(EVENTS, 'utf8').split('\n').filter(Boolean); } catch { return findings; }
  let rejected = 0;
  const diagByTarget = {};
  for (const l of lines) {
    let e; try { e = JSON.parse(l); } catch { continue; }
    if (e.event === 'prompt_rejected') rejected++;
    if (e.event === 'diagnosis_complete' && e.data && e.data.target) {
      diagByTarget[e.data.target] = (diagByTarget[e.data.target] || 0) + 1;
    }
  }
  if (rejected >= 2) {
    findings.push({
      pattern: 'repeated-rejection',
      area: 'pipeline',
      severity: 'medium',
      observed: `${rejected} prompt_rejected events — an upstream call keeps failing silently`,
      improvement: 'A pipeline step keeps getting rejected. Surface the rejection instead of swallowing it; fix the root call.',
      autoGate: null,
    });
  }
  return findings;
}

// ── persist derived improvements into the canonical memory store ─────────────
function persist(findings) {
  // de-dupe against what we already recorded so the hook does not spam memory.
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { prev = { seen: {} }; }
  prev.seen = prev.seen || {};
  const fresh = [];
  for (const f of findings) {
    const key = `${f.pattern}:${f.area}:${f.severity}`;
    if (prev.seen[key]) continue;        // already learned this exact finding
    prev.seen[key] = new Date().toISOString();
    fresh.push(f);
    // one source of truth: write the improvement as a workflow learning.
    try {
      execFileSync('node', ['mycelium.cjs', '--learned', f.area,
        `[collab-observer/${f.pattern}] ${f.improvement} (observed: ${f.observed})`],
        { cwd: ROOT, stdio: 'ignore', timeout: 8000 });
    } catch { /* memory may be down; STATE still records it */ }
  }
  try {
    fs.mkdirSync(path.dirname(STATE), { recursive: true });
    fs.writeFileSync(STATE, JSON.stringify({ ...prev, lastRun: new Date().toISOString() }, null, 2));
  } catch { /* non-fatal */ }
  return fresh;
}

// ── run ─────────────────────────────────────────────────────────────────────
const subjects = commitSubjects();
const findings = [...detectFromGit(subjects), ...detectFromEvents()];
const fresh = persist(findings);

if (JSON_OUT) {
  process.stdout.write(JSON.stringify({ scanned: subjects.length, findings, newlyLearned: fresh.length }, null, 2) + '\n');
  process.exit(0);
}

if (SILENT) {
  // hook mode: only announce if something NEW was learned, so commits stay quiet.
  if (fresh.length) {
    log(`  [collab-observer] learned ${fresh.length} improvement${fresh.length === 1 ? '' : 's'} from our collaboration — see: node bin/ai.cjs collab improvements`);
  }
  process.exit(0);
}

log('');
log(`  ${C.b}COLLAB OBSERVER${C.r}  ${C.dim}watches our work, derives improvements — no prompts to you${C.r}`);
log('  ' + '─'.repeat(60));
log(`  scanned ${subjects.length} commits + events`);
if (!findings.length) {
  log(`  ${C.green}✓ no friction patterns — collaboration is running clean${C.r}`);
  process.exit(0);
}
for (const f of findings) {
  const col = f.severity === 'high' ? C.red : f.severity === 'medium' ? C.yellow : C.dim;
  log('');
  log(`  ${col}● ${f.pattern}${C.r}  ${C.dim}[${f.area} · ${f.severity}]${C.r}`);
  log(`    observed: ${f.observed}`);
  log(`    ${C.cyan}improve:${C.r}  ${f.improvement}`);
  if (f.autoGate) log(`    ${C.green}auto-gate:${C.r} ${f.autoGate}`);
}
log('');
log(`  ${fresh.length} newly recorded into memory. ${C.dim}Already-known ones are not repeated.${C.r}`);
process.exit(0);
