#!/usr/bin/env node
/**
 * Freshness Keeper — keeps every learning system's data alive.
 * ─────────────────────────────────────────────────────────────────
 * The systems were going stale because nothing ran them on a clock.
 * Each data file gets a TTL; when stale, the keeper triggers the
 * tool that produces it. One pass refreshes anything that's old.
 *
 * Reused by:
 *   tools/observer-runner.cjs (profile: keeper)
 *   tools/system-health.cjs (--auto-keep flag triggers run)
 *   .husky/post-commit (already runs via observer-runner)
 *   npm run keep / npm run keep:dry / npm run keep:force
 *   require('./tools/freshness-keeper').check() / .runStale()
 *
 * Adding a new freshness rule: append to RULES. Every consumer picks
 * it up automatically. No copy-paste.
 *
 * Each rule:
 *   { id, file, ttlDays, refreshCmd, optional }
 *
 *   ttlDays    — how long the data may sit before being stale
 *   refreshCmd — { cmd, args, timeoutMs } the tool that rebuilds it
 *   optional   — missing tool is fine (fresh clone case)
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const MYC = path.join(ROOT, '.mycelium')
const MINED = path.join(ROOT, '.mycelium-mined')
const EVENTS_FILE = path.join(MYC, 'events.jsonl')

/* ─── Freshness rules — one place, every consumer reads them ── */
const RULES = [
  {
    id: 'sentinel-eval',
    file: path.join(MYC, 'eval.json'),
    ttlDays: 7,
    refreshCmd: { cmd: 'node', args: ['sentinel.cjs', '--quick'], timeoutMs: 60000 },
    optional: true,
    description: 'Health score (10 modules, weighted)',
  },
  {
    id: 'mining-snapshot',
    file: path.join(MINED, 'auto-mine-state.json'),
    ttlDays: 14,
    refreshCmd: { cmd: 'node', args: ['tools/mycelium-auto-mine.cjs', '--full'], timeoutMs: 60000 },
    optional: true,
    description: 'Pattern mining over commit history',
  },
  {
    id: 'mining-quality',
    file: path.join(MINED, 'quality-report.json'),
    ttlDays: 14,
    refreshCmd: { cmd: 'node', args: ['tools/validate-mined-data.cjs', '--report'], timeoutMs: 30000 },
    optional: true,
    description: 'Mined-data quality gate',
  },
  {
    id: 'memory-snapshot',
    file: path.join(MYC, 'memory.json'),
    ttlDays: 7,
    refreshCmd: { cmd: 'node', args: ['mycelium.cjs'], timeoutMs: 30000 },
    optional: true,
    description: 'Mycelium core memory snapshot',
  },
  {
    id: 'area-config',
    file: path.join(MYC, 'config.json'),
    ttlDays: 30,
    refreshCmd: { cmd: 'node', args: ['tools/area-config-gen.cjs'], timeoutMs: 15000 },
    optional: false,
    description: 'Codebase → area mapping (drift-prone)',
  },
  {
    id: 'memory-trim',
    file: path.join(MYC, 'memory.json'),
    /* Trim is age-based: re-run weekly even if file mtime is fresh */
    ttlDays: 7,
    sentinelFile: path.join(MYC, 'archive'),
    refreshCmd: { cmd: 'node', args: ['tools/memory-trimmer.cjs'], timeoutMs: 15000 },
    optional: false,
    description: 'Memory + watch trim pass',
  },
  {
    id: 'event-bus-process',
    file: EVENTS_FILE,
    ttlDays: 1,
    refreshCmd: { cmd: 'node', args: ['tools/event-bus.cjs', 'process'], timeoutMs: 10000 },
    optional: false,
    description: 'Process new events into learnings',
  },
  {
    id: 'event-bus-trim',
    file: EVENTS_FILE,
    ttlDays: 30,
    refreshCmd: { cmd: 'node', args: ['tools/event-bus.cjs', 'trim'], timeoutMs: 10000 },
    optional: false,
    description: 'Trim events older than 30 days',
  },
]

/* ─── Helpers ──────────────────────────────────────────────── */
function ageDays(filePath) {
  try {
    const mtime = fs.statSync(filePath).mtime.getTime()
    return (Date.now() - mtime) / 86400000
  } catch { return Infinity /* missing file is maximally stale */ }
}

function exists(p) { try { fs.accessSync(p); return true } catch { return false } }

function emitEvent(event, data) {
  try {
    if (!fs.existsSync(MYC)) fs.mkdirSync(MYC, { recursive: true })
    const record = {
      ts: Date.now(),
      date: new Date().toISOString(),
      system: 'freshness-keeper',
      event,
      severity: 'info',
      data,
    }
    fs.appendFileSync(EVENTS_FILE, JSON.stringify(record) + '\n')
  } catch { /* never block on telemetry */ }
}

/* ─── Pure check (read-only) ────────────────────────────────
   Returns [{ id, file, ageDays, ttlDays, stale, missing, optional }]. */
function check() {
  return RULES.map((rule) => {
    const target = exists(rule.file) ? rule.file : (rule.sentinelFile || rule.file)
    const age = ageDays(target)
    return {
      id: rule.id,
      file: rule.file,
      description: rule.description,
      ageDays: Number.isFinite(age) ? Math.round(age * 10) / 10 : null,
      ttlDays: rule.ttlDays,
      stale: age > rule.ttlDays,
      missing: !Number.isFinite(age),
      optional: rule.optional,
    }
  })
}

/* ─── Run-stale (write) ────────────────────────────────────
   Triggers the refreshCmd for every stale rule. Each refresh runs
   sequentially with its own timeout; failures are logged + emitted
   but never throw. Returns a structured summary. */
function runStale({ dryRun = false, force = false, verbose = false } = {}) {
  const status = check()
  const work = status.filter((s) => force || s.stale)
  const summary = { ranAt: new Date().toISOString(), total: work.length, refreshed: 0, failed: 0, skipped: 0, results: [] }

  for (const item of work) {
    const rule = RULES.find((r) => r.id === item.id)
    const scriptPath = path.join(ROOT, rule.refreshCmd.args[0])

    if (rule.optional && !exists(scriptPath)) {
      summary.skipped++
      summary.results.push({ id: item.id, status: 'skipped', reason: 'tool not present' })
      continue
    }

    if (dryRun) {
      summary.results.push({ id: item.id, status: 'would-refresh', ageDays: item.ageDays, ttlDays: item.ttlDays })
      continue
    }

    const t0 = Date.now()
    let out
    try {
      out = spawnSync(rule.refreshCmd.cmd, rule.refreshCmd.args, {
        cwd: ROOT,
        timeout: rule.refreshCmd.timeoutMs,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (err) {
      summary.failed++
      summary.results.push({ id: item.id, status: 'crashed', error: err.message })
      emitEvent('freshness_refresh_failed', { id: item.id, error: err.message })
      continue
    }

    const durationMs = Date.now() - t0
    const ok = out.status === 0 && !out.error
    if (ok) {
      summary.refreshed++
      summary.results.push({ id: item.id, status: 'refreshed', durationMs, ageDays: item.ageDays })
      emitEvent('freshness_refreshed', { id: item.id, durationMs, wasStaleByDays: Math.max(0, (item.ageDays || 0) - item.ttlDays) })
    } else {
      summary.failed++
      summary.results.push({
        id: item.id,
        status: 'failed',
        exitCode: out.status,
        durationMs,
        stderr: (out.stderr?.toString() || '').split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 400),
      })
      emitEvent('freshness_refresh_failed', { id: item.id, exitCode: out.status })
    }
  }

  /* Persist run summary so system-health can read it */
  try {
    const file = path.join(MYC, 'freshness-run.json')
    fs.writeFileSync(file, JSON.stringify(summary, null, 2))
  } catch { /* noop */ }

  if (verbose) {
    process.stdout.write(`\n  Freshness Keeper\n  ${'─'.repeat(40)}\n`)
    if (work.length === 0) {
      process.stdout.write(`  All ${status.length} systems within TTL\n\n`)
    } else {
      for (const r of summary.results) {
        const icon = r.status === 'refreshed' ? '✓' : r.status === 'would-refresh' ? '·' : r.status === 'skipped' ? '○' : '✗'
        process.stdout.write(`  ${icon} ${r.id.padEnd(22)} ${r.status}${r.durationMs ? ` (${r.durationMs}ms)` : ''}\n`)
      }
      process.stdout.write(`\n  ${summary.refreshed} refreshed · ${summary.failed} failed · ${summary.skipped} skipped\n\n`)
    }
  }

  return summary
}

/* ─── CLI ─────────────────────────────────────────────────── */
if (require.main === module) {
  const argv = process.argv.slice(2)
  const wantJSON = argv.includes('--json')
  const dryRun = argv.includes('--dry-run')
  const force = argv.includes('--force')
  const verbose = !argv.includes('--quiet')

  if (argv.includes('--check')) {
    const status = check()
    if (wantJSON) {
      process.stdout.write(JSON.stringify(status, null, 2) + '\n')
    } else {
      process.stdout.write(`\n  Freshness Status\n  ${'─'.repeat(58)}\n`)
      for (const s of status) {
        const flag = s.missing ? 'missing' : s.stale ? 'STALE' : 'fresh'
        const age = s.missing ? '—' : `${s.ageDays}d`
        process.stdout.write(`  ${flag.padEnd(8)} ${s.id.padEnd(22)} age ${age.padStart(6)} ttl ${String(s.ttlDays).padStart(2)}d  ${s.description}\n`)
      }
      process.stdout.write('\n')
    }
    process.exit(0)
  }

  const summary = runStale({ dryRun, force, verbose: verbose && !wantJSON })
  if (wantJSON) process.stdout.write(JSON.stringify(summary, null, 2) + '\n')
  process.exit(0)
}

module.exports = { check, runStale, RULES }
