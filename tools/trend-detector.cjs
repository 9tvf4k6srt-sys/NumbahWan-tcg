#!/usr/bin/env node
/**
 * Trend Detector — early warning before regressions become breakages.
 * ─────────────────────────────────────────────────────────────────
 * Reads time-series data already in the repo (memory.snapshots,
 * events.jsonl, eval-history) and looks for trajectories that
 * usually precede a real failure:
 *   - score declining over a window
 *   - failure rate climbing
 *   - bundle size growing
 *   - event volume collapsing (system going dark)
 *   - mean-reversion: a metric oscillating around a falling baseline
 *
 * Each detector emits a structured signal. Signals are written to
 * .mycelium/trends.json and pushed to the event bus so the
 * learning-loop picks them up next pass and turns recurring trends
 * into auto-rules. That is the closing stitch — trends become rules
 * become enforcement become better commits.
 *
 * Reused by:
 *   tools/observer-runner.cjs (profile: keeper, ci)
 *   tools/freshness-keeper.cjs (called when memory-snapshot refreshes)
 *   tools/system-health.cjs (--with-trends flag surfaces top signal)
 *   npm run trends / npm run trends:json
 *   require('./tools/trend-detector').analyze() / .signals()
 *
 * Pure analyzers exported for testing. Adding a new detector: append
 * to DETECTORS — every consumer picks it up.
 */

'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const MYC = path.join(ROOT, '.mycelium')
const EVENTS_FILE = path.join(MYC, 'events.jsonl')
const MEMORY_FILE = path.join(MYC, 'memory.json')
const TRENDS_FILE = path.join(MYC, 'trends.json')

/* ─── I/O ──────────────────────────────────────────────────── */
function readEvents() {
  if (!fs.existsSync(EVENTS_FILE)) return []
  return fs.readFileSync(EVENTS_FILE, 'utf8')
    .split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l) } catch { return null } })
    .filter(Boolean)
}
function readMemory() {
  try { return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')) } catch { return null }
}

/* ─── Math helpers (pure) ────────────────────────────────────
   Linear regression slope across [{x,y}]; positive = rising. */
function slope(points) {
  const n = points.length
  if (n < 2) return 0
  let sx = 0, sy = 0, sxy = 0, sxx = 0
  for (const { x, y } of points) { sx += x; sy += y; sxy += x * y; sxx += x * x }
  const denom = n * sxx - sx * sx
  return denom === 0 ? 0 : (n * sxy - sx * sy) / denom
}
function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 }
function stdev(arr) {
  if (arr.length < 2) return 0
  const m = mean(arr)
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1))
}

/* ─── Detectors ──────────────────────────────────────────────
   Each returns null OR a signal:
     { id, severity, direction, magnitude, summary, data } */
const DETECTORS = [
  /* SCORE TRAJECTORY: snapshot scores trending down. */
  {
    id: 'snapshot-score-decline',
    analyze(events, memory) {
      const snaps = (memory?.snapshots || []).slice(-15)
      if (snaps.length < 5) return null
      const points = snaps.map((s, i) => ({ x: i, y: s.score || 0 }))
      const m = slope(points)
      const recent = mean(points.slice(-3).map((p) => p.y))
      const earlier = mean(points.slice(0, 3).map((p) => p.y))
      const delta = recent - earlier
      if (m < -0.5 && delta < -5) {
        return {
          severity: m < -1.5 ? 'high' : 'medium',
          direction: 'falling',
          magnitude: Math.round(-delta),
          summary: `Snapshot score trending down: ${earlier.toFixed(0)} → ${recent.toFixed(0)} over ${snaps.length} commits (slope ${m.toFixed(2)}/commit)`,
          data: { slope: m, recent, earlier, sampleSize: snaps.length },
        }
      }
      return null
    },
  },

  /* FAILURE RATE: observer/test failures climbing. */
  {
    id: 'failure-rate-climbing',
    analyze(events) {
      const recent = events.filter((e) => Date.now() - e.ts < 14 * 86400000)
      if (recent.length < 20) return null
      /* Bucket by 2-day window to smooth noise */
      const buckets = {}
      for (const e of recent) {
        const day = Math.floor((Date.now() - e.ts) / (2 * 86400000))
        if (!buckets[day]) buckets[day] = { total: 0, fails: 0 }
        buckets[day].total++
        if (/fail|error/.test(e.event) || e.severity === 'error') buckets[day].fails++
      }
      const series = Object.entries(buckets)
        .sort((a, b) => Number(b[0]) - Number(a[0])) /* oldest first */
        .map(([day, v], i) => ({ x: i, y: v.total ? v.fails / v.total : 0 }))
      if (series.length < 4) return null
      const m = slope(series)
      const recentRate = mean(series.slice(-2).map((p) => p.y))
      if (m > 0.02 && recentRate > 0.1) {
        return {
          severity: recentRate > 0.25 ? 'high' : 'medium',
          direction: 'rising',
          magnitude: Math.round(recentRate * 100),
          summary: `Failure rate rising: ${(recentRate * 100).toFixed(0)}% of recent events are failures (slope ${(m * 100).toFixed(1)}%/window)`,
          data: { slope: m, recentRate, sampleSize: recent.length },
        }
      }
      return null
    },
  },

  /* BUNDLE GROWTH: bundleKB across build_metrics events. */
  {
    id: 'bundle-growth-trend',
    analyze(events) {
      const builds = events
        .filter((e) => e.event === 'build_metrics' && typeof e.data?.bundleKB === 'number')
        .slice(-10)
      if (builds.length < 4) return null
      const points = builds.map((b, i) => ({ x: i, y: b.data.bundleKB }))
      const m = slope(points)
      const first = points[0].y
      const last = points[points.length - 1].y
      const pct = ((last - first) / Math.max(1, first)) * 100
      if (pct > 5) {
        return {
          severity: pct > 15 ? 'high' : 'medium',
          direction: 'rising',
          magnitude: Math.round(pct),
          summary: `Bundle size growing: ${first}KB → ${last}KB (+${pct.toFixed(1)}% over ${builds.length} builds, slope ${m.toFixed(2)}KB/build)`,
          data: { slope: m, first, last, pct, sampleSize: builds.length },
        }
      }
      return null
    },
  },

  /* EVENT VOLUME COLLAPSE: a system going dark (early-warning for
     hooks breaking, integrations dying, etc). */
  {
    id: 'event-volume-collapse',
    analyze(events) {
      const last30 = events.filter((e) => Date.now() - e.ts < 30 * 86400000)
      const last7 = events.filter((e) => Date.now() - e.ts < 7 * 86400000)
      const bySystem30 = {}
      const bySystem7 = {}
      for (const e of last30) bySystem30[e.system] = (bySystem30[e.system] || 0) + 1
      for (const e of last7) bySystem7[e.system] = (bySystem7[e.system] || 0) + 1
      const collapses = []
      for (const [sys, n30] of Object.entries(bySystem30)) {
        /* Expected weekly rate: n30 / 30 * 7. Allow large variance for low-volume systems. */
        const expected = (n30 / 30) * 7
        const actual = bySystem7[sys] || 0
        if (n30 >= 10 && expected >= 3 && actual < expected * 0.3) {
          collapses.push({ sys, n30, last7: actual, expected: expected.toFixed(1) })
        }
      }
      if (collapses.length === 0) return null
      return {
        severity: collapses.length >= 3 ? 'high' : 'medium',
        direction: 'falling',
        magnitude: collapses.length,
        summary: `${collapses.length} system(s) emitting <30% of expected volume: ${collapses.map((c) => c.sys).join(', ')}`,
        data: { collapses },
      }
    },
  },

  /* DURATION DRIFT: observer-runner pipelines getting slower. */
  {
    id: 'pipeline-duration-drift',
    analyze(events) {
      const runs = events
        .filter((e) => e.event === 'observer_run_complete' && typeof e.data?.durationMs === 'number')
        .slice(-12)
      if (runs.length < 6) return null
      const points = runs.map((r, i) => ({ x: i, y: r.data.durationMs }))
      const m = slope(points)
      const first = mean(points.slice(0, 3).map((p) => p.y))
      const last = mean(points.slice(-3).map((p) => p.y))
      const pct = ((last - first) / Math.max(1, first)) * 100
      if (pct > 30 && m > 50) {
        return {
          severity: pct > 100 ? 'high' : 'medium',
          direction: 'rising',
          magnitude: Math.round(pct),
          summary: `Observer pipeline slowing: ${Math.round(first)}ms → ${Math.round(last)}ms (+${pct.toFixed(0)}% over ${runs.length} runs)`,
          data: { slope: m, first, last, pct, sampleSize: runs.length },
        }
      }
      return null
    },
  },

  /* MEMORY GROWTH: memory.json byte size over time (proxied via
     snapshot count; if trim isn't running this rises monotonically). */
  {
    id: 'memory-growth-uncontrolled',
    analyze(events, memory) {
      try {
        const size = fs.statSync(MEMORY_FILE).size
        const snaps = memory?.snapshots?.length || 0
        const learnings = memory?.learnings?.length || 0
        const breakages = memory?.breakages?.length || 0
        /* Heuristic: > 250KB is uncontrolled growth (trim limit ≈ 100-200KB) */
        if (size > 250000) {
          return {
            severity: size > 400000 ? 'high' : 'medium',
            direction: 'rising',
            magnitude: Math.round(size / 1024),
            summary: `memory.json at ${Math.round(size / 1024)}KB — trim should be running weekly. Current: ${snaps}↺ ${breakages}✗ ${learnings}✓`,
            data: { sizeBytes: size, snapshots: snaps, learnings, breakages },
          }
        }
      } catch { /* missing file */ }
      return null
    },
  },

  /* OSCILLATION: snapshot scores swinging > 2σ — usually means
     scoring inputs are unstable, not the codebase. */
  {
    id: 'score-oscillation',
    analyze(events, memory) {
      const snaps = (memory?.snapshots || []).slice(-15)
      if (snaps.length < 8) return null
      const scores = snaps.map((s) => s.score || 0)
      const sd = stdev(scores)
      const m = mean(scores)
      /* Coefficient of variation > 0.25 → unstable scoring */
      if (m > 0 && sd / m > 0.25) {
        return {
          severity: 'low',
          direction: 'oscillating',
          magnitude: Math.round((sd / m) * 100),
          summary: `Snapshot scores oscillating: σ=${sd.toFixed(1)}, μ=${m.toFixed(1)}, CV=${(sd / m * 100).toFixed(0)}% — scoring inputs may be noisy`,
          data: { stdev: sd, mean: m, cv: sd / m, sampleSize: snaps.length },
        }
      }
      return null
    },
  },
]

/* ─── Run all detectors, persist signals, push to bus ────── */
function analyze() {
  const events = readEvents()
  const memory = readMemory()
  const signals = []
  for (const det of DETECTORS) {
    try {
      const sig = det.analyze(events, memory)
      if (sig) signals.push({ id: det.id, ...sig })
    } catch (err) {
      signals.push({
        id: det.id,
        severity: 'low',
        direction: 'error',
        magnitude: 0,
        summary: `Detector "${det.id}" threw: ${err.message}`,
        data: { error: err.message },
      })
    }
  }
  return { ranAt: new Date().toISOString(), eventsConsidered: events.length, signals }
}

function emitTrendEvents(report) {
  try {
    if (!fs.existsSync(MYC)) fs.mkdirSync(MYC, { recursive: true })
    for (const sig of report.signals) {
      const record = {
        ts: Date.now(),
        date: new Date().toISOString(),
        system: 'trend-detector',
        event: 'trend_signal',
        severity: sig.severity,
        data: { id: sig.id, direction: sig.direction, magnitude: sig.magnitude, summary: sig.summary },
      }
      fs.appendFileSync(EVENTS_FILE, JSON.stringify(record) + '\n')
    }
  } catch { /* never block on telemetry */ }
}

function persist(report) {
  try {
    fs.writeFileSync(TRENDS_FILE, JSON.stringify(report, null, 2))
  } catch { /* noop */ }
}

/* ─── Public run ──────────────────────────────────────────── */
function run({ verbose = false, emit = true } = {}) {
  const report = analyze()
  persist(report)
  if (emit) emitTrendEvents(report)
  if (verbose) {
    process.stdout.write(`\n  Trend Detector\n  ${'─'.repeat(40)}\n`)
    process.stdout.write(`  Events considered: ${report.eventsConsidered}\n`)
    process.stdout.write(`  Signals raised   : ${report.signals.length}\n\n`)
    if (report.signals.length === 0) {
      process.stdout.write(`  No regressions detected — trends look healthy.\n\n`)
    } else {
      const order = { high: 0, medium: 1, low: 2 }
      const sorted = [...report.signals].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9))
      for (const s of sorted) {
        const icon = s.severity === 'high' ? '!!' : s.severity === 'medium' ? '! ' : '· '
        process.stdout.write(`  ${icon} [${s.severity}] ${s.id} (${s.direction})\n`)
        process.stdout.write(`     ${s.summary}\n`)
      }
      process.stdout.write('\n')
    }
  }
  return report
}

/* ─── CLI ─────────────────────────────────────────────────── */
if (require.main === module) {
  const argv = process.argv.slice(2)
  const wantJSON = argv.includes('--json')
  const noEmit = argv.includes('--no-emit')
  const verbose = !argv.includes('--quiet')
  const report = run({ verbose: verbose && !wantJSON, emit: !noEmit })
  if (wantJSON) process.stdout.write(JSON.stringify(report, null, 2) + '\n')
  /* Exit non-zero on high-severity signal so CI gates can use this */
  const hasHigh = report.signals.some((s) => s.severity === 'high')
  process.exit(hasHigh && argv.includes('--gate') ? 1 : 0)
}

module.exports = { analyze, run, DETECTORS }
