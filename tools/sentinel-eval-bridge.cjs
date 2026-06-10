#!/usr/bin/env node
/**
 * Sentinel → eval.json bridge
 * ═══════════════════════════════════════════════════════════════
 * Root cause this fixes: the freshness-keeper rule `sentinel-eval`
 * "healed" a stale .mycelium/eval.json by running `sentinel.cjs --quick`
 * — but sentinel writes public/static/data/sentinel-report.json, never
 * eval.json. So eval.json sat 119 days stale, the health dashboard
 * scored sentinel on February data, and `stale: sentinel-eval` appeared
 * on every run forever. The heal loop was a no-op.
 *
 * This bridge runs sentinel (fresh) and projects its summary into the
 * eval.json shape that tools/system-health.cjs reads (overall, grade,
 * generated). Existing fields (proof, metrics, …) are preserved when
 * present so older consumers keep working.
 *
 * Usage:
 *   node tools/sentinel-eval-bridge.cjs            # refresh eval.json
 *   node tools/sentinel-eval-bridge.cjs --check    # report age, no write
 *
 * Wired into: tools/freshness-keeper.cjs (rule id: sentinel-eval)
 */

'use strict'

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const EVAL_FILE = path.join(ROOT, '.mycelium', 'eval.json')
const REPORT_FILE = path.join(ROOT, 'public', 'static', 'data', 'sentinel-report.json')

const CHECK_ONLY = process.argv.includes('--check')
const QUIET = process.argv.includes('--quiet')

function log(msg) {
  if (!QUIET) console.log(msg)
}

function gradeFor(score) {
  if (score >= 97) return 'A+'
  if (score >= 93) return 'A'
  if (score >= 90) return 'A-'
  if (score >= 87) return 'B+'
  if (score >= 83) return 'B'
  if (score >= 80) return 'B-'
  if (score >= 77) return 'C+'
  if (score >= 73) return 'C'
  if (score >= 70) return 'C-'
  if (score >= 60) return 'D'
  return 'F'
}

function readJSON(fp) {
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'))
  } catch {
    return null
  }
}

function reportIsFresh(report, maxAgeMs) {
  if (!report || !report.timestamp) return false
  const ts = typeof report.timestamp === 'number' ? report.timestamp : Date.parse(report.timestamp)
  return Number.isFinite(ts) && Date.now() - ts < maxAgeMs
}

function main() {
  const existing = readJSON(EVAL_FILE) || {}

  if (CHECK_ONLY) {
    const gen = existing.generated ? Date.parse(existing.generated) : null
    const days = gen ? Math.round((Date.now() - gen) / 86400000) : null
    log(`eval.json: ${days === null ? 'missing/unreadable' : `${days}d old`} (overall: ${existing.overall ?? '?'})`)
    process.exit(0)
  }

  // Reuse a recent report if one exists (sentinel already ran < 1h ago);
  // otherwise run sentinel fresh. Keeps the bridge cheap on hot paths.
  let report = readJSON(REPORT_FILE)
  if (!reportIsFresh(report, 60 * 60 * 1000)) {
    try {
      execSync('node sentinel.cjs --json > /dev/null 2>&1', { cwd: ROOT, timeout: 120000 })
    } catch {
      /* sentinel exits non-zero below thresholds — the report is still written */
    }
    report = readJSON(REPORT_FILE)
  }

  const summary = report && report.summary
  if (!summary || typeof summary.healthScore !== 'number') {
    console.error('  [sentinel-eval-bridge] no usable sentinel report — eval.json left untouched')
    process.exit(1)
  }

  const next = {
    ...existing,
    version: existing.version || '1.0',
    generated: new Date().toISOString(),
    overall: summary.healthScore,
    grade: summary.grade || gradeFor(summary.healthScore),
    source: 'sentinel-eval-bridge',
    moduleScores: summary.moduleScores || existing.moduleScores,
  }

  fs.mkdirSync(path.dirname(EVAL_FILE), { recursive: true })
  fs.writeFileSync(EVAL_FILE, JSON.stringify(next, null, 2))
  log(`  [sentinel-eval-bridge] eval.json refreshed — ${next.overall}/${next.grade}`)
}

main()
