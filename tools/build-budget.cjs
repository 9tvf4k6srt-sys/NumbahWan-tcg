#!/usr/bin/env node
/**
 * Build Performance Budget v1.0
 * ═══════════════════════════════════════════════════════════════
 * Tracks bundle size, enforces budgets, alerts on regressions.
 * Integrates with event bus for cross-system feedback.
 *
 * Usage:
 *   node tools/build-budget.cjs              # Check current build against budget
 *   node tools/build-budget.cjs --record     # Record build metrics post-build
 *   node tools/build-budget.cjs --trend      # Show size trend
 *   node tools/build-budget.cjs --ci         # CI mode: fail if over budget
 *
 * Budget defaults (configurable):
 *   Worker bundle: 600KB warning, 800KB error
 *   HTML pages: must be > 100
 *   Dist size: < 500MB
 *
 * @version 1.0.0
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const EVENTS_FILE = path.join(ROOT, '.mycelium', 'events.jsonl')
const BUDGET_HISTORY = path.join(ROOT, '.mycelium', 'build-budget-history.json')

// Budget thresholds
const BUDGET = {
  bundleWarnKB: 600,
  bundleErrorKB: 800,
  minHtmlPages: 100,
  maxDistMB: 500,
}

function appendEvent(event) {
  const dir = path.dirname(EVENTS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const record = { ts: Date.now(), date: new Date().toISOString(), ...event }
  fs.appendFileSync(EVENTS_FILE, JSON.stringify(record) + '\n')
}

function getDistMetrics() {
  if (!fs.existsSync(DIST)) return null

  // Worker bundle size
  const workerPath = path.join(DIST, '_worker.js')
  const bundleKB = fs.existsSync(workerPath) ? Math.round(fs.statSync(workerPath).size / 1024) : 0

  // HTML page count
  let htmlCount = 0
  try {
    htmlCount = parseInt(execSync(`find "${DIST}" -name '*.html' | wc -l`, { encoding: 'utf8' }).trim())
  } catch { htmlCount = 0 }

  // Total dist size
  let distMB = 0
  try {
    const duOut = execSync(`du -sm "${DIST}" 2>/dev/null`, { encoding: 'utf8' }).trim()
    distMB = parseInt(duOut.split('\t')[0]) || 0
  } catch { distMB = 0 }

  // Top 10 largest files
  let topFiles = []
  try {
    const lsOut = execSync(`find "${DIST}" -type f -exec ls -la {} + 2>/dev/null | sort -k5 -rn | head -10`, { encoding: 'utf8' }).trim()
    topFiles = lsOut.split('\n').map(line => {
      const parts = line.split(/\s+/)
      return { size: Math.round(parseInt(parts[4] || 0) / 1024), file: (parts.slice(8).join(' ') || '').replace(DIST + '/', '') }
    }).filter(f => f.file)
  } catch { /* noop */ }

  return { bundleKB, htmlCount, distMB, topFiles }
}

function checkBudget(metrics) {
  const violations = []
  const warnings = []

  if (metrics.bundleKB > BUDGET.bundleErrorKB) {
    violations.push(`Bundle ${metrics.bundleKB}KB exceeds error budget ${BUDGET.bundleErrorKB}KB`)
  } else if (metrics.bundleKB > BUDGET.bundleWarnKB) {
    warnings.push(`Bundle ${metrics.bundleKB}KB exceeds warn budget ${BUDGET.bundleWarnKB}KB`)
  }

  if (metrics.htmlCount < BUDGET.minHtmlPages) {
    violations.push(`Only ${metrics.htmlCount} HTML pages (minimum: ${BUDGET.minHtmlPages})`)
  }

  if (metrics.distMB > BUDGET.maxDistMB) {
    violations.push(`Dist ${metrics.distMB}MB exceeds budget ${BUDGET.maxDistMB}MB`)
  }

  return { violations, warnings, pass: violations.length === 0 }
}

function recordMetrics(metrics, budget) {
  const history = fs.existsSync(BUDGET_HISTORY)
    ? JSON.parse(fs.readFileSync(BUDGET_HISTORY, 'utf8'))
    : { records: [] }

  // Check for size regression
  const prev = history.records[history.records.length - 1]
  let delta = null
  if (prev) {
    delta = {
      bundleDelta: metrics.bundleKB - (prev.bundleKB || 0),
      htmlDelta: metrics.htmlCount - (prev.htmlCount || 0),
      distDelta: metrics.distMB - (prev.distMB || 0),
    }
  }

  history.records.push({
    ts: Date.now(),
    date: new Date().toISOString(),
    ...metrics,
    violations: budget.violations.length,
    warnings: budget.warnings.length,
  })

  // Keep last 100 records
  if (history.records.length > 100) {
    history.records = history.records.slice(-100)
  }

  const dir = path.dirname(BUDGET_HISTORY)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(BUDGET_HISTORY, JSON.stringify(history, null, 2))

  // Emit events
  appendEvent({
    system: 'build',
    event: 'build_metrics',
    severity: budget.pass ? 'info' : 'error',
    data: { ...metrics, delta, violations: budget.violations },
  })

  if (delta && delta.bundleDelta > 50) {
    appendEvent({
      system: 'build',
      event: 'bundle_alert',
      severity: 'warning',
      data: {
        sizeKB: metrics.bundleKB,
        budgetKB: BUDGET.bundleWarnKB,
        deltaKB: delta.bundleDelta,
        topFiles: metrics.topFiles?.slice(0, 3).map(f => `${f.file} (${f.size}KB)`),
      },
    })
  }

  return delta
}

function showTrend() {
  if (!fs.existsSync(BUDGET_HISTORY)) {
    console.log('No build budget history. Run: node tools/build-budget.cjs --record')
    return
  }
  const history = JSON.parse(fs.readFileSync(BUDGET_HISTORY, 'utf8'))
  console.log(`\n  Build Size Trend (last ${Math.min(history.records.length, 20)})`)
  console.log(`  ${'─'.repeat(50)}`)
  console.log(`  ${'Date'.padEnd(12)} ${'Bundle'.padStart(8)} ${'Pages'.padStart(6)} ${'Dist'.padStart(6)} Status`)
  for (const r of history.records.slice(-20)) {
    const date = (r.date || '').split('T')[0] || '?'
    const status = r.violations > 0 ? '✗' : r.warnings > 0 ? '⚠' : '✓'
    console.log(`  ${date.padEnd(12)} ${(r.bundleKB + 'KB').padStart(8)} ${String(r.htmlCount).padStart(6)} ${(r.distMB + 'MB').padStart(6)} ${status}`)
  }
  console.log()
}

// ── Main ───────────────────────────────────────────────────
const args = process.argv.slice(2)
const CI_MODE = args.includes('--ci')

if (args.includes('--trend')) {
  showTrend()
  process.exit(0)
}

const metrics = getDistMetrics()
if (!metrics) {
  console.log('  [build-budget] No dist/ directory. Run: npm run build')
  process.exit(CI_MODE ? 1 : 0)
}

const budget = checkBudget(metrics)

console.log(`\n  Build Budget Check`)
console.log(`  ─────────────────────────────`)
console.log(`  Bundle:     ${metrics.bundleKB}KB / ${BUDGET.bundleWarnKB}KB warn / ${BUDGET.bundleErrorKB}KB error`)
console.log(`  HTML pages: ${metrics.htmlCount} / ${BUDGET.minHtmlPages} minimum`)
console.log(`  Dist size:  ${metrics.distMB}MB / ${BUDGET.maxDistMB}MB maximum`)

if (budget.warnings.length > 0) {
  console.log(`\n  Warnings:`)
  budget.warnings.forEach(w => console.log(`    ⚠ ${w}`))
}

if (budget.violations.length > 0) {
  console.log(`\n  Violations:`)
  budget.violations.forEach(v => console.log(`    ✗ ${v}`))
}

if (metrics.topFiles?.length) {
  console.log(`\n  Top 5 largest files:`)
  metrics.topFiles.slice(0, 5).forEach(f => console.log(`    ${String(f.size + 'KB').padStart(8)} ${f.file}`))
}

if (args.includes('--record')) {
  const delta = recordMetrics(metrics, budget)
  if (delta) {
    const sign = (n) => n > 0 ? `+${n}` : String(n)
    console.log(`\n  Delta from last build:`)
    console.log(`    Bundle: ${sign(delta.bundleDelta)}KB, Pages: ${sign(delta.htmlDelta)}, Dist: ${sign(delta.distDelta)}MB`)
  }
}

console.log(`\n  Status: ${budget.pass ? '✓ Within budget' : '✗ OVER BUDGET'}`)
console.log()

if (CI_MODE && !budget.pass) process.exit(1)
