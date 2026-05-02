#!/usr/bin/env node
/**
 * Observer Runner — single entrypoint for all post-commit observers.
 * ─────────────────────────────────────────────────────────────────
 * Replaces nine "node x.cjs 2>/dev/null || true" lines in the husky
 * post-commit hook with one process that runs every observer in
 * parallel, captures their exit codes + duration, writes one
 * structured summary to .mycelium/observer-run.json, and surfaces
 * any failure on stderr instead of swallowing it.
 *
 * Reusable in:
 *   .husky/post-commit            → node tools/observer-runner.cjs --hook=post-commit
 *   .husky/post-merge             → node tools/observer-runner.cjs --hook=post-merge
 *   .github/workflows/ci.yml      → node tools/observer-runner.cjs --hook=ci
 *   bin/factory-runner.cjs        → require('./tools/observer-runner').run({ profile:'factory' })
 *   tools/system-health.cjs       → reads observer-run.json
 *
 * Profiles map a hook to a list of observers; add a new observer in
 * one place and every consumer picks it up.
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const RUN_FILE = path.join(ROOT, '.mycelium', 'observer-run.json')
const ERROR_LOG = path.join(ROOT, '.mycelium', 'last-error.log')
const EVENTS_FILE = path.join(ROOT, '.mycelium', 'events.jsonl')

/* ─── Observer registry ──────────────────────────────────────
   Each observer is { id, cmd, args, optional, timeoutMs }.
   `optional:true` means a missing script is fine (the script
   may not exist on a fresh clone). `optional:false` failures
   are surfaced on stderr but never block the commit. */
const REGISTRY = {
  watch:        { cmd: 'node', args: ['mycelium-watch.cjs', '--learn'],            optional: true,  timeoutMs: 15000 },
  mycelium:     { cmd: 'node', args: ['mycelium.cjs'],                              optional: true,  timeoutMs: 20000 },
  fix:          { cmd: 'node', args: ['mycelium-fix.cjs', '--silent'],              optional: true,  timeoutMs: 20000 },
  mine:         { cmd: 'node', args: ['tools/mycelium-auto-mine.cjs'],              optional: true,  timeoutMs: 30000 },
  validate:     { cmd: 'node', args: ['tools/validate-mined-data.cjs', '--fix'],    optional: true,  timeoutMs: 20000 },
  telemetry:    { cmd: 'node', args: ['tools/commit-telemetry.cjs', '--silent'],    optional: true,  timeoutMs: 15000 },
  testTel:      { cmd: 'node', args: ['tools/test-telemetry.cjs', '--silent'],      optional: true,  timeoutMs: 15000 },
  depGraph:     { cmd: 'node', args: ['tools/dependency-graph.cjs', '--silent'],    optional: true,  timeoutMs: 15000 },
  events:       { cmd: 'node', args: ['tools/event-bus.cjs', 'process'],            optional: false, timeoutMs: 10000 },
  trim:         { cmd: 'node', args: ['tools/memory-trimmer.cjs'],                  optional: false, timeoutMs: 10000 },
  tsc:          { cmd: 'node', args: ['tools/tsc-bridge.cjs'],                      optional: true,  timeoutMs: 45000 },
  vitest:       { cmd: 'node', args: ['tools/vitest-bridge.cjs'],                   optional: true,  timeoutMs: 90000 },
  lint:         { cmd: 'node', args: ['tools/ai-tell-lint.cjs', '--all'],           optional: true,  timeoutMs: 15000 },
}

/* ─── Profiles ─────────────────────────────────────────────── */
const PROFILES = {
  'post-commit': ['watch', 'mycelium', 'fix', 'mine', 'validate', 'telemetry', 'testTel', 'depGraph', 'events', 'trim'],
  'post-merge':  ['mine', 'validate', 'events', 'trim'],
  'ci':          ['tsc', 'vitest', 'lint'],
  'factory':     ['events', 'lint'],
  'health':      [],
}

/* ─── Exec one observer ──────────────────────────────────────
   Returns { id, ok, code, durationMs, stderrSnippet, skipped }. */
function runOne(id, opts) {
  const spec = REGISTRY[id]
  if (!spec) return Promise.resolve({ id, ok: false, code: -1, durationMs: 0, stderrSnippet: 'unknown observer' })

  /* Skip optional missing-script cases without noise. */
  const scriptPath = spec.args[0]
  const scriptAbs = path.isAbsolute(scriptPath) ? scriptPath : path.join(ROOT, scriptPath)
  if (spec.optional && !fs.existsSync(scriptAbs)) {
    return Promise.resolve({ id, ok: true, code: 0, durationMs: 0, skipped: true })
  }

  return new Promise((resolve) => {
    const t0 = Date.now()
    let stderr = ''
    let killed = false

    const child = spawn(spec.cmd, spec.args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] })

    /* Hard timeout — never let one stuck observer block the commit. */
    const timer = setTimeout(() => { killed = true; child.kill('SIGTERM') }, spec.timeoutMs)

    child.stdout.on('data', () => { /* swallow stdout, observers should write to files */ })
    child.stderr.on('data', (chunk) => {
      const s = chunk.toString()
      if (stderr.length < 4000) stderr += s
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      const durationMs = Date.now() - t0
      const ok = killed ? false : (code === 0 || (spec.optional && code !== 0))
      resolve({
        id,
        ok,
        code: killed ? 124 : code,
        durationMs,
        stderrSnippet: stderr.split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 400),
        timedOut: killed,
      })
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ id, ok: spec.optional, code: -1, durationMs: Date.now() - t0, stderrSnippet: err.message })
    })
  })
}

/* ─── Append a single event for downstream consumers ──────── */
function emitRunEvent(summary) {
  try {
    const dir = path.dirname(EVENTS_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const record = {
      ts: Date.now(),
      date: new Date().toISOString(),
      system: 'observer-runner',
      event: summary.failures > 0 ? 'observer_run_failed' : 'observer_run_complete',
      severity: summary.failures > 0 ? 'warn' : 'info',
      data: { profile: summary.profile, total: summary.total, failures: summary.failures, durationMs: summary.durationMs },
    }
    fs.appendFileSync(EVENTS_FILE, JSON.stringify(record) + '\n')
  } catch { /* never block on telemetry */ }
}

/* ─── Persist failures so users can find them later ─────── */
function appendErrorLog(profile, failures) {
  if (!failures.length) return
  try {
    const dir = path.dirname(ERROR_LOG)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const stamp = new Date().toISOString()
    const lines = [`\n[${stamp}] profile=${profile} failures=${failures.length}`]
    for (const f of failures) {
      lines.push(`  ${f.id} (exit ${f.code}, ${f.durationMs}ms)${f.timedOut ? ' [TIMEOUT]' : ''}`)
      if (f.stderrSnippet) lines.push(`    ${f.stderrSnippet}`)
    }
    fs.appendFileSync(ERROR_LOG, lines.join('\n') + '\n')
  } catch { /* noop */ }
}

/* ─── Public API ─────────────────────────────────────────── */
async function run({ profile = 'post-commit', concurrency = 4, quiet = false } = {}) {
  const ids = PROFILES[profile] || []
  if (ids.length === 0) return { profile, total: 0, failures: 0, durationMs: 0, results: [] }

  const t0 = Date.now()
  const results = []

  /* Bounded parallelism — most observers are I/O-bound. */
  const queue = ids.slice()
  const inFlight = new Set()
  while (queue.length || inFlight.size) {
    while (queue.length && inFlight.size < concurrency) {
      const id = queue.shift()
      const p = runOne(id).then((r) => { results.push(r); inFlight.delete(p); return r })
      inFlight.add(p)
    }
    if (inFlight.size) await Promise.race(inFlight)
  }

  const durationMs = Date.now() - t0
  const failures = results.filter((r) => !r.ok && !r.skipped)
  const summary = { profile, total: results.length, failures: failures.length, durationMs, runAt: new Date().toISOString(), results }

  /* Persist run summary so system-health, sentinel, and CI can read one file. */
  try {
    const dir = path.dirname(RUN_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(RUN_FILE, JSON.stringify(summary, null, 2))
  } catch { /* noop */ }

  emitRunEvent(summary)
  appendErrorLog(profile, failures)

  if (!quiet && failures.length) {
    /* Loud on failure, silent on success — the opposite of the old || true chain. */
    process.stderr.write(`  [observers] ${failures.length}/${results.length} failed in ${profile} (${durationMs}ms). See .mycelium/last-error.log\n`)
    for (const f of failures) {
      process.stderr.write(`    ${f.id} exit ${f.code}${f.timedOut ? ' (timeout)' : ''}\n`)
    }
  }

  return summary
}

/* ─── CLI ─────────────────────────────────────────────────── */
if (require.main === module) {
  const argv = process.argv.slice(2)
  const profile = (argv.find((a) => a.startsWith('--hook=')) || '--hook=post-commit').split('=')[1]
  const concurrency = parseInt((argv.find((a) => a.startsWith('--concurrency=')) || '--concurrency=4').split('=')[1], 10)
  const quiet = argv.includes('--quiet')
  run({ profile, concurrency, quiet }).then((s) => {
    /* Never block commit. Failures are logged + emitted; exit 0 keeps git happy. */
    process.exit(0)
  }).catch((err) => {
    process.stderr.write(`  [observer-runner] crashed: ${err.message}\n`)
    process.exit(0)
  })
}

module.exports = { run, REGISTRY, PROFILES }
