#!/usr/bin/env node
/**
 * Memory Trimmer v1.0
 * ═══════════════════════════════════════════════════════════════
 * Trims memory.json and watch.json to prevent unbounded growth.
 * Archives old data and deduplicates entries.
 *
 * Usage:
 *   node tools/memory-trimmer.cjs              # Trim + report
 *   node tools/memory-trimmer.cjs --dry-run    # Report without changes
 *   node tools/memory-trimmer.cjs --aggressive # Tighter limits
 *
 * Targets:
 *   memory.json < 100KB
 *   watch.json  < 200KB
 *
 * @version 1.0.0
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const MEMORY_FILE = path.join(ROOT, '.mycelium', 'memory.json')
const WATCH_FILE = path.join(ROOT, '.mycelium', 'watch.json')
const ARCHIVE_DIR = path.join(ROOT, '.mycelium', 'archive')

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const AGGRESSIVE = args.includes('--aggressive')

// Limits
const LIMITS = AGGRESSIVE ? {
  snapshots: 20,
  breakages: 20,
  learnings: 30,
  decisions: 15,
  reflections: 5,
  autoRules: 30,
  healHistory: 5,
  watchCommits: 50,
  watchBreakages: 30,
  watchCouplings: 20,
  watchHotspots: 30,
  watchRisks: 20,
  watchPatterns: 20,
  watchEvaluations: 10,
} : {
  snapshots: 30,
  breakages: 30,
  learnings: 50,
  decisions: 20,
  reflections: 10,
  autoRules: 50,
  healHistory: 10,
  watchCommits: 100,
  watchBreakages: 50,
  watchCouplings: 30,
  watchHotspots: 50,
  watchRisks: 30,
  watchPatterns: 30,
  watchEvaluations: 20,
}

function fileSize(fp) {
  try { return fs.statSync(fp).size } catch { return 0 }
}

function fmtKB(bytes) { return `${Math.round(bytes / 1024)}KB` }

function trimArray(arr, limit, key = 'ts') {
  if (!Array.isArray(arr) || arr.length <= limit) return { kept: arr || [], removed: [] }
  const sorted = [...arr].sort((a, b) => (b[key] || 0) - (a[key] || 0))
  return { kept: sorted.slice(0, limit), removed: sorted.slice(limit) }
}

function dedup(arr, keyFn) {
  if (!Array.isArray(arr)) return arr
  const seen = new Set()
  return arr.filter(item => {
    const key = keyFn(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Trim memory.json ────────────────────────────────────────
function trimMemory() {
  if (!fs.existsSync(MEMORY_FILE)) {
    console.log('  No memory.json found')
    return
  }

  const beforeSize = fileSize(MEMORY_FILE)
  const mem = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'))
  const archived = { ts: Date.now(), type: 'memory', data: {} }
  let totalRemoved = 0

  console.log(`\n  Memory Trimmer`)
  console.log(`  ─────────────────────────────`)
  console.log(`  Before: ${fmtKB(beforeSize)}`)

  // Trim each collection
  const collections = {
    snapshots: LIMITS.snapshots,
    breakages: LIMITS.breakages,
    learnings: LIMITS.learnings,
    decisions: LIMITS.decisions,
    reflections: LIMITS.reflections,
    autoRules: LIMITS.autoRules,
    healHistory: LIMITS.healHistory,
  }

  for (const [key, limit] of Object.entries(collections)) {
    if (!mem[key]) continue
    const before = Array.isArray(mem[key]) ? mem[key].length : 0

    // Dedup first
    if (key === 'breakages') {
      mem[key] = dedup(mem[key], b => `${b.area}:${(b.what || '').slice(0, 50)}`)
    }
    if (key === 'learnings') {
      mem[key] = dedup(mem[key], l => `${l.area}:${(l.lesson || '').slice(0, 50)}`)
    }
    if (key === 'autoRules') {
      mem[key] = dedup(mem[key], r => `${r.type}:${r.rule?.slice(0, 50) || r.pair || r.file || r.area}`)
    }

    const { kept, removed } = trimArray(mem[key], limit)
    if (removed.length > 0) {
      archived.data[key] = removed
      totalRemoved += removed.length
    }
    mem[key] = kept
    const after = kept.length
    if (before !== after) {
      console.log(`  ${key}: ${before} → ${after} (${before - after} removed)`)
    }
  }

  // Trim evaluations (nested in different format)
  if (mem.evaluations && Array.isArray(mem.evaluations) && mem.evaluations.length > 10) {
    const removed = mem.evaluations.length - 10
    archived.data.evaluations = mem.evaluations.slice(0, -10)
    mem.evaluations = mem.evaluations.slice(-10)
    totalRemoved += removed
    console.log(`  evaluations: trimmed ${removed}`)
  }

  if (!DRY_RUN && totalRemoved > 0) {
    // Archive removed data
    if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true })
    const archiveFile = path.join(ARCHIVE_DIR, `memory-${Date.now()}.json`)
    fs.writeFileSync(archiveFile, JSON.stringify(archived, null, 2))

    fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem, null, 2))
    const afterSize = fileSize(MEMORY_FILE)
    console.log(`  After: ${fmtKB(afterSize)} (saved ${fmtKB(beforeSize - afterSize)})`)
    console.log(`  Archived ${totalRemoved} items to ${path.basename(archiveFile)}`)
  } else if (DRY_RUN) {
    console.log(`  [DRY RUN] Would remove ${totalRemoved} items`)
  } else {
    console.log(`  Already within limits`)
  }
}

// ── Trim watch.json ─────────────────────────────────────────
function trimWatch() {
  if (!fs.existsSync(WATCH_FILE)) {
    console.log('  No watch.json found')
    return
  }

  const beforeSize = fileSize(WATCH_FILE)
  const watch = JSON.parse(fs.readFileSync(WATCH_FILE, 'utf8'))
  let totalRemoved = 0

  console.log(`\n  Watch Trimmer`)
  console.log(`  ─────────────────────────────`)
  console.log(`  Before: ${fmtKB(beforeSize)}`)

  const watchCollections = {
    commits: LIMITS.watchCommits,
    breakages: LIMITS.watchBreakages,
    couplings: LIMITS.watchCouplings,
    hotspots: LIMITS.watchHotspots,
    risks: LIMITS.watchRisks,
    evaluations: LIMITS.watchEvaluations,
    healHistory: LIMITS.healHistory,
  }

  for (const [key, limit] of Object.entries(watchCollections)) {
    if (!watch[key] || !Array.isArray(watch[key])) continue
    const before = watch[key].length
    if (before > limit) {
      watch[key] = watch[key].slice(-limit)
      totalRemoved += before - limit
      console.log(`  ${key}: ${before} → ${limit} (${before - limit} removed)`)
    }
  }

  // Handle patterns (may be object, not array)
  if (watch.patterns && typeof watch.patterns === 'object' && !Array.isArray(watch.patterns)) {
    // Keep as-is but trim inner arrays
    for (const [pKey, pVal] of Object.entries(watch.patterns)) {
      if (Array.isArray(pVal) && pVal.length > LIMITS.watchPatterns) {
        const before = pVal.length
        watch.patterns[pKey] = pVal.slice(-LIMITS.watchPatterns)
        totalRemoved += before - LIMITS.watchPatterns
      }
    }
  }

  // Handle stats (keep but compact)
  if (watch.stats && typeof watch.stats === 'object') {
    const statsStr = JSON.stringify(watch.stats)
    if (statsStr.length > 50000) {
      // Trim stats to essential fields only
      const essentials = ['totalCommits', 'totalBreakages', 'lastUpdate']
      const trimmedStats = {}
      for (const k of essentials) {
        if (watch.stats[k] !== undefined) trimmedStats[k] = watch.stats[k]
      }
      watch.stats = trimmedStats
      console.log(`  stats: compacted`)
    }
  }

  if (!DRY_RUN && totalRemoved > 0) {
    fs.writeFileSync(WATCH_FILE, JSON.stringify(watch, null, 2))
    const afterSize = fileSize(WATCH_FILE)
    console.log(`  After: ${fmtKB(afterSize)} (saved ${fmtKB(beforeSize - afterSize)})`)
  } else if (DRY_RUN) {
    console.log(`  [DRY RUN] Would remove ${totalRemoved} items`)
  } else {
    console.log(`  Already within limits`)
  }
}

// ── Main ───────────────────────────────────────────────────
trimMemory()
trimWatch()
console.log()
