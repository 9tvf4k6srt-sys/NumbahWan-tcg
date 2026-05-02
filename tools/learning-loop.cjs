#!/usr/bin/env node
/**
 * Learning Loop — turn events into rules, automatically.
 * ─────────────────────────────────────────────────────────────────
 * The bus already records events. The trimmer keeps memory clean.
 * What was missing: a process that reads the event stream, finds
 * patterns, and writes new constraints back into memory.json so
 * the next commit benefits from what the last commit revealed.
 *
 * This is the closing stitch of the recursive loop:
 *   commit → events → patterns → constraints → enforce → better commit
 *
 * Reused by:
 *   tools/observer-runner.cjs (profile: post-commit, post-merge, keeper)
 *   tools/freshness-keeper.cjs (called when memory-trim TTL expires)
 *   npm run learn / npm run learn:dry / npm run learn:report
 *   require('./tools/learning-loop').derive() / .applyTo(memory)
 *
 * Pure functions exported for unit-testing.
 *
 * Each derivation rule:
 *   { id, match(events), produce(matches) → constraint }
 *
 * Adding a new pattern: append to DERIVATIONS. No copy-paste.
 */

'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const MYC = path.join(ROOT, '.mycelium')
const EVENTS_FILE = path.join(MYC, 'events.jsonl')
const MEMORY_FILE = path.join(MYC, 'memory.json')

/* ─── Read events as a stream ──────────────────────────────── */
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

/* ─── Helpers used across derivations ─────────────────────── */
function within(events, days) {
  const cutoff = Date.now() - days * 86400000
  return events.filter((e) => (e.ts || 0) >= cutoff)
}

function streak(events, predicate) {
  /* longest tail-anchored run where predicate holds */
  let n = 0
  for (let i = events.length - 1; i >= 0; i--) {
    if (predicate(events[i])) n++
    else break
  }
  return n
}

function avgNum(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 }

/* ─── Derivation rules — every rule must produce a constraint
       that points at one or more files / areas. Generic rules go
       into mem.constraints; rules with a clear lesson go into
       mem.learnings (auto-generated, source tagged). ──────── */
const DERIVATIONS = [
  /* RULE 1: Repeated test failure on the same file → hardening rule */
  {
    id: 'repeated-test-failure',
    description: 'Same file fails ≥3 times in 14d → mark as fragile',
    derive(events) {
      const recent = within(events, 14).filter((e) => e.event === 'test_fail')
      const byFile = {}
      for (const e of recent) {
        const f = e.data?.file
        if (!f) continue
        byFile[f] = (byFile[f] || 0) + 1
      }
      const out = []
      for (const [file, count] of Object.entries(byFile)) {
        if (count >= 3) {
          out.push({
            type: 'fragile-file',
            target: file,
            rule: `${file} failed ${count} times in 14d — require coverage check before merge`,
            confidence: Math.min(0.95, 0.5 + count * 0.1),
            source: 'learning-loop:repeated-test-failure',
          })
        }
      }
      return out
    },
  },

  /* RULE 2: TypeScript clean streak → relax warning threshold */
  {
    id: 'tsc-clean-streak',
    description: '≥10 consecutive type_clean → record clean-streak milestone',
    derive(events) {
      const tsc = events.filter((e) => e.system === 'tsc')
      const n = streak(tsc, (e) => e.event === 'type_clean')
      if (n >= 10) {
        return [{
          type: 'health-milestone',
          target: 'tsc',
          rule: `TypeScript clean streak: ${n} commits — codebase typing discipline holding`,
          confidence: 1.0,
          source: 'learning-loop:tsc-clean-streak',
        }]
      }
      return []
    },
  },

  /* RULE 3: Bundle size growth → flag perf regression */
  {
    id: 'bundle-growth',
    description: 'Bundle size grew >10% over last 5 builds → perf regression',
    derive(events) {
      const builds = events.filter((e) => e.event === 'build_metrics' && typeof e.data?.bundleKB === 'number').slice(-5)
      if (builds.length < 5) return []
      const first = builds[0].data.bundleKB
      const last = builds[builds.length - 1].data.bundleKB
      const growthPct = ((last - first) / first) * 100
      if (growthPct > 10) {
        return [{
          type: 'perf-regression',
          target: 'bundle',
          rule: `Bundle grew ${growthPct.toFixed(1)}% (${first}KB → ${last}KB) over 5 builds — investigate top contributors`,
          confidence: Math.min(0.95, 0.6 + growthPct / 100),
          source: 'learning-loop:bundle-growth',
        }]
      }
      return []
    },
  },

  /* RULE 4: Health score drop → freeze the area that caused it */
  {
    id: 'score-drop-area',
    description: 'Sentinel score_drop on a module → constrain that area',
    derive(events) {
      const drops = within(events, 30).filter((e) => e.event === 'score_drop')
      const byModule = {}
      for (const e of drops) {
        const m = e.data?.module
        if (!m || m === 'composite') continue
        byModule[m] = (byModule[m] || 0) + 1
      }
      const out = []
      for (const [mod, count] of Object.entries(byModule)) {
        if (count >= 2) {
          out.push({
            type: 'area-watch',
            target: mod,
            rule: `${mod} score dropped ${count}× in 30d — require justification for changes touching this area`,
            confidence: Math.min(0.9, 0.5 + count * 0.15),
            source: 'learning-loop:score-drop-area',
          })
        }
      }
      return out
    },
  },

  /* RULE 5: Freshness rule failures → auto-disable that rule */
  {
    id: 'flaky-freshness-rule',
    description: 'A freshness rule fails ≥3× in 7d → tool likely broken',
    derive(events) {
      const fails = within(events, 7).filter((e) => e.event === 'freshness_refresh_failed')
      const byId = {}
      for (const e of fails) {
        const id = e.data?.id
        if (!id) continue
        byId[id] = (byId[id] || 0) + 1
      }
      const out = []
      for (const [id, count] of Object.entries(byId)) {
        if (count >= 3) {
          out.push({
            type: 'tool-broken',
            target: id,
            rule: `Freshness rule "${id}" failed ${count}× in 7d — investigate the underlying tool`,
            confidence: 0.85,
            source: 'learning-loop:flaky-freshness-rule',
          })
        }
      }
      return out
    },
  },

  /* RULE 6: Observer runner failure clustering → an observer is sick */
  {
    id: 'observer-failure-cluster',
    description: 'Same observer fails ≥3× in 14d → mark for repair',
    derive(events) {
      const recent = within(events, 14).filter((e) => e.event === 'observer_run_failed')
      if (recent.length < 3) return []
      return [{
        type: 'observer-unstable',
        target: 'observer-runner',
        rule: `Observer pipeline reported ${recent.length} failures in 14d — see .mycelium/last-error.log`,
        confidence: 0.8,
        source: 'learning-loop:observer-failure-cluster',
      }]
    },
  },

  /* RULE 7: System idle → recommend a refresh */
  {
    id: 'system-idle',
    description: 'No events from a system in 14d → it has gone silent',
    derive(events) {
      const lastBySystem = {}
      for (const e of events) {
        const sys = e.system
        if (!sys) continue
        if (!lastBySystem[sys] || e.ts > lastBySystem[sys]) lastBySystem[sys] = e.ts
      }
      const out = []
      const now = Date.now()
      for (const [sys, ts] of Object.entries(lastBySystem)) {
        const days = (now - ts) / 86400000
        if (days > 14) {
          out.push({
            type: 'system-silent',
            target: sys,
            rule: `${sys} has been silent for ${Math.round(days)}d — verify it is still running`,
            confidence: Math.min(0.9, 0.4 + days / 60),
            source: 'learning-loop:system-idle',
          })
        }
      }
      return out
    },
  },
]

/* ─── Run every derivation, dedup by (type,target,source) ── */
function derive(events) {
  const all = []
  for (const rule of DERIVATIONS) {
    try {
      const found = rule.derive(events) || []
      all.push(...found)
    } catch (err) {
      /* never let one bad rule break the loop */
      all.push({
        type: 'rule-error',
        target: rule.id,
        rule: `Derivation rule "${rule.id}" threw: ${err.message}`,
        confidence: 1.0,
        source: 'learning-loop:rule-error',
      })
    }
  }
  return dedup(all)
}

function dedup(constraints) {
  const seen = new Map()
  for (const c of constraints) {
    const key = `${c.type}::${c.target}::${c.source}`
    /* Prefer the higher-confidence version if duplicated */
    const prev = seen.get(key)
    if (!prev || (c.confidence || 0) > (prev.confidence || 0)) seen.set(key, c)
  }
  return [...seen.values()]
}

/* ─── Apply derived constraints to memory.json ─────────────
       - Adds to mem.autoRules with ts + source tag
       - Skips if an identical rule already exists (idempotent)
       - Returns { added, skipped, total } */
function applyTo(memory, constraints) {
  if (!memory) return { added: 0, skipped: 0, total: 0 }
  if (!Array.isArray(memory.autoRules)) memory.autoRules = []

  const existing = new Set(memory.autoRules.map((r) => `${r.type || ''}::${r.target || r.area || r.file || ''}::${r.source || ''}`))
  let added = 0, skipped = 0

  for (const c of constraints) {
    const key = `${c.type}::${c.target}::${c.source}`
    if (existing.has(key)) { skipped++; continue }
    memory.autoRules.push({
      ts: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      type: c.type,
      target: c.target,
      rule: c.rule,
      confidence: c.confidence,
      source: c.source,
      autoGenerated: true,
    })
    existing.add(key)
    added++
  }

  return { added, skipped, total: constraints.length }
}

/* ─── Public run ──────────────────────────────────────────── */
function run({ dryRun = false, verbose = false } = {}) {
  const events = readEvents()
  const constraints = derive(events)
  const summary = {
    ranAt: new Date().toISOString(),
    eventsConsidered: events.length,
    derived: constraints.length,
    added: 0,
    skipped: 0,
    constraints,
  }

  if (!dryRun && constraints.length > 0) {
    const memory = readMemory()
    if (memory) {
      const r = applyTo(memory, constraints)
      summary.added = r.added
      summary.skipped = r.skipped
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2))
    }
  }

  /* Persist run summary so trend-detector + system-health can read it */
  try {
    fs.writeFileSync(path.join(MYC, 'learning-run.json'), JSON.stringify(summary, null, 2))
  } catch { /* noop */ }

  if (verbose) {
    process.stdout.write(`\n  Learning Loop\n  ${'─'.repeat(40)}\n`)
    process.stdout.write(`  Events considered : ${events.length}\n`)
    process.stdout.write(`  Patterns derived  : ${constraints.length}\n`)
    process.stdout.write(`  Rules added       : ${summary.added}${dryRun ? ' (dry-run)' : ''}\n`)
    process.stdout.write(`  Already known     : ${summary.skipped}\n\n`)
    for (const c of constraints) {
      process.stdout.write(`  · [${c.type}] ${c.target} — ${c.rule}\n`)
    }
    process.stdout.write('\n')
  }

  return summary
}

/* ─── CLI ─────────────────────────────────────────────────── */
if (require.main === module) {
  const argv = process.argv.slice(2)
  const wantJSON = argv.includes('--json')
  const dryRun = argv.includes('--dry-run')
  const verbose = !argv.includes('--quiet')
  const summary = run({ dryRun, verbose: verbose && !wantJSON })
  if (wantJSON) process.stdout.write(JSON.stringify(summary, null, 2) + '\n')
  process.exit(0)
}

module.exports = { derive, applyTo, run, readEvents, DERIVATIONS }
