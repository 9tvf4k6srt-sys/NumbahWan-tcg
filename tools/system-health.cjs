#!/usr/bin/env node
/**
 * System Health — one screen across every learning system.
 * ─────────────────────────────────────────────────────────────────
 * Replaces five manual file reads with one command. Reads:
 *   .mycelium/memory.json          (mycelium core)
 *   .mycelium/watch.json           (commit intelligence)
 *   .mycelium/eval.json            (sentinel score)
 *   .mycelium/factory-memory.json  (page-gen learning)
 *   .mycelium/observer-run.json    (last hook run)
 *   .mycelium/events.jsonl         (event bus)
 *   .mycelium-mined/auto-mine-state.json + quality-report.json
 *   .mycelium/tsc-results.json + vitest-results.json + smoke-report.json
 *   .mycelium/last-error.log
 *
 * Reusable in:
 *   npm run health                 → human-readable summary
 *   npm run health -- --json       → machine-readable for CI / sentinel HUD
 *   npm run health -- --gate=70    → exit non-zero if composite < threshold (CI gate)
 *   require('./tools/system-health').snapshot()  → object form
 */

'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const MYC = path.join(ROOT, '.mycelium')
const MINED = path.join(ROOT, '.mycelium-mined')

const COLOR = process.stdout.isTTY && !process.env.NO_COLOR
const dim   = (s) => COLOR ? `\x1b[2m${s}\x1b[0m`  : s
const bold  = (s) => COLOR ? `\x1b[1m${s}\x1b[0m`  : s
const green = (s) => COLOR ? `\x1b[32m${s}\x1b[0m` : s
const red   = (s) => COLOR ? `\x1b[31m${s}\x1b[0m` : s
const amber = (s) => COLOR ? `\x1b[33m${s}\x1b[0m` : s
const cyan  = (s) => COLOR ? `\x1b[36m${s}\x1b[0m` : s

/* ─── Helpers ──────────────────────────────────────────── */
const safeRead  = (p) => { try { return fs.readFileSync(p, 'utf8') } catch { return null } }
const safeJSON  = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }
const fileSize  = (p) => { try { return fs.statSync(p).size } catch { return 0 } }
const fileMTime = (p) => { try { return fs.statSync(p).mtime.getTime() } catch { return 0 } }
const kb = (b) => `${Math.round(b / 1024)}KB`
const ageDays = (ms) => ms ? Math.round((Date.now() - ms) / 86400000) : null

/* ─── Collectors (each returns {status, score, detail}) ─── */
function collectMycelium() {
  const mem = safeJSON(path.join(MYC, 'memory.json'))
  const size = fileSize(path.join(MYC, 'memory.json'))
  if (!mem) return { status: 'missing', score: 0, detail: 'memory.json not found' }
  const breakages = (mem.breakages || []).length
  const learnings = (mem.learnings || []).length
  const decisions = (mem.decisions || []).length
  const snapshots = (mem.snapshots || []).length
  /* Score: penalise bloat, reward content. 100 at < 80KB, 0 at > 300KB. */
  const sizeScore = Math.max(0, Math.min(100, 100 - (size - 80000) / 2200))
  return {
    status: size > 250000 ? 'bloat' : size > 200000 ? 'watch' : 'ok',
    score: Math.round(sizeScore),
    detail: `${kb(size)} · ${snapshots}↺ ${breakages}✗ ${learnings}✓ ${decisions}⚖`,
  }
}

function collectWatch() {
  const size = fileSize(path.join(MYC, 'watch.json'))
  if (!size) return { status: 'missing', score: 0, detail: 'watch.json not found' }
  const w = safeJSON(path.join(MYC, 'watch.json')) || {}
  const commits = (w.commits || []).length
  /* Watch tolerates more bloat (up to 400KB) since it's commit intelligence. */
  const sizeScore = Math.max(0, Math.min(100, 100 - (size - 200000) / 4000))
  return {
    status: size > 500000 ? 'bloat' : size > 400000 ? 'watch' : 'ok',
    score: Math.round(sizeScore),
    detail: `${kb(size)} · ${commits} commits tracked`,
  }
}

function collectEval() {
  const e = safeJSON(path.join(MYC, 'eval.json'))
  if (!e) return { status: 'missing', score: 0, detail: 'eval.json not found' }
  const generated = e.generated ? new Date(e.generated).getTime() : 0
  const days = ageDays(generated)
  const stale = days !== null && days > 14
  return {
    status: stale ? 'stale' : 'ok',
    score: e.overall || 0,
    detail: `${e.overall || '?'}/${e.grade || '?'}${days !== null ? ` · ${days}d old` : ''}`,
  }
}

function collectFactory() {
  const f = safeJSON(path.join(MYC, 'factory-memory.json'))
  if (!f) return { status: 'missing', score: 0, detail: 'factory-memory.json not found' }
  const lessons = (f.lessons || []).length
  const gen = f.templateDNA?.generation
  const builds = f.metrics?.totalBuilds || 0
  /* Factory needs build data to be meaningful. */
  return {
    status: builds === 0 ? 'idle' : 'ok',
    score: Math.min(100, lessons * 10 + builds * 5),
    detail: `${lessons} lessons · gen ${gen ?? '?'} · ${builds} builds`,
  }
}

function collectMining() {
  const a = safeJSON(path.join(MINED, 'auto-mine-state.json'))
  const q = safeJSON(path.join(MINED, 'quality-report.json'))
  if (!a || !q) return { status: 'missing', score: 0, detail: 'mined data not found' }
  const mtime = fileMTime(path.join(MINED, 'auto-mine-state.json'))
  const days = ageDays(mtime)
  const stale = days !== null && days > 30
  return {
    status: stale ? 'stale' : 'ok',
    score: q.overall || 0,
    detail: `${q.overall ?? '?'}/${q.grade ?? '?'} · ${a.totalCommitsMined ?? 0} commits${days !== null ? ` · ${days}d old` : ''}`,
  }
}

function collectObservers() {
  const o = safeJSON(path.join(MYC, 'observer-run.json'))
  if (!o) return { status: 'missing', score: 0, detail: 'no observer run yet' }
  const days = ageDays(new Date(o.runAt).getTime())
  const failed = o.failures || 0
  const ok = o.total - failed
  return {
    status: failed > 0 ? 'failing' : days !== null && days > 7 ? 'stale' : 'ok',
    score: o.total ? Math.round(100 * ok / o.total) : 0,
    detail: `${ok}/${o.total} ok · last run ${days !== null ? `${days}d ago` : 'unknown'} · ${o.profile || '?'}`,
  }
}

function collectGates() {
  const tsc    = safeJSON(path.join(MYC, 'tsc-results.json'))
  const vit    = safeJSON(path.join(MYC, 'vitest-results.json'))
  const smoke  = safeJSON(path.join(MYC, 'smoke-report.json'))

  const parts = []
  let scoreSum = 0
  let scoreN = 0
  let worst = 'ok'

  if (tsc) {
    const ok = tsc.total === 0
    parts.push(`tsc:${ok ? green(`${tsc.total} err`) : red(`${tsc.total} err`)}`)
    scoreSum += ok ? 100 : Math.max(0, 100 - tsc.total * 5); scoreN++
    if (!ok) worst = 'failing'
  }
  if (vit) {
    const ok = vit.failed === 0
    parts.push(`vitest:${ok ? green(`${vit.passed}/${vit.total}`) : red(`${vit.failed} failed`)}`)
    scoreSum += ok ? 100 : Math.round(100 * vit.passed / Math.max(1, vit.total)); scoreN++
    if (!ok) worst = 'failing'
  }
  if (smoke) {
    const ok = smoke.failed === 0
    parts.push(`smoke:${ok ? green(`${smoke.passed}/${smoke.total}`) : amber(`${smoke.failed} failed`)}`)
    scoreSum += ok ? 100 : Math.round(100 * smoke.passed / Math.max(1, smoke.total)); scoreN++
    if (!ok && worst !== 'failing') worst = 'watch'
  }

  return {
    status: worst,
    score: scoreN ? Math.round(scoreSum / scoreN) : 0,
    detail: parts.join(' · ') || 'no gate data',
  }
}

function collectEvents() {
  const lines = (safeRead(path.join(MYC, 'events.jsonl')) || '').split('\n').filter(Boolean)
  if (!lines.length) return { status: 'missing', score: 0, detail: 'no events recorded' }
  const last = (() => { try { return JSON.parse(lines[lines.length - 1]) } catch { return null } })()
  const lastTs = last?.ts || 0
  const days = ageDays(lastTs)
  const stale = days !== null && days > 7
  /* Tally severities across the last 200 events for a rough bus health metric. */
  const tail = lines.slice(-200).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const errs = tail.filter((e) => e.severity === 'error').length
  return {
    status: stale ? 'stale' : errs > tail.length * 0.2 ? 'noisy' : 'ok',
    score: stale ? 30 : Math.max(0, 100 - errs * 2),
    detail: `${lines.length} events · last ${days !== null ? `${days}d ago` : 'unknown'} · ${errs} errors in last 200`,
  }
}

function collectErrors() {
  const log = safeRead(path.join(MYC, 'last-error.log'))
  if (!log) return { status: 'ok', score: 100, detail: 'no recorded failures' }
  const blocks = log.split(/\n(?=\[)/).filter(Boolean)
  const recent = blocks.slice(-3).map((b) => b.split('\n')[0].trim())
  return {
    status: blocks.length > 5 ? 'failing' : 'watch',
    score: Math.max(0, 100 - blocks.length * 10),
    detail: `${blocks.length} failure blocks · last: ${recent[recent.length - 1] || 'none'}`,
  }
}

/* ─── Public API ──────────────────────────────────────── */
function snapshot() {
  const systems = {
    mycelium:  collectMycelium(),
    watch:     collectWatch(),
    sentinel:  collectEval(),
    factory:   collectFactory(),
    mining:    collectMining(),
    observers: collectObservers(),
    gates:     collectGates(),
    events:    collectEvents(),
    errors:    collectErrors(),
  }
  /* Composite is a weighted average of the systems that actually have data. */
  const weights = { mycelium: 1.5, watch: 1.0, sentinel: 1.5, factory: 0.8, mining: 1.0, observers: 1.2, gates: 1.5, events: 1.0, errors: 1.5 }
  let sum = 0, w = 0
  for (const [k, v] of Object.entries(systems)) {
    if (v.status === 'missing') continue
    sum += v.score * weights[k]
    w += weights[k]
  }
  const composite = w > 0 ? Math.round(sum / w) : 0
  const grade = composite >= 90 ? 'A' : composite >= 80 ? 'B' : composite >= 70 ? 'C' : composite >= 60 ? 'D' : 'F'
  return { runAt: new Date().toISOString(), composite, grade, systems }
}

/* ─── Pretty print ────────────────────────────────────── */
function statusIcon(s) {
  if (s === 'ok')      return green('●')
  if (s === 'watch')   return amber('●')
  if (s === 'stale')   return amber('●')
  if (s === 'noisy')   return amber('●')
  if (s === 'idle')    return dim('○')
  if (s === 'bloat')   return red('●')
  if (s === 'failing') return red('●')
  if (s === 'missing') return dim('○')
  return dim('?')
}

function pretty(snap) {
  const lines = []
  lines.push('')
  lines.push(`  ${bold('System Health')}  ${cyan(snap.composite + '/' + snap.grade)}  ${dim(snap.runAt)}`)
  lines.push(`  ${dim('─'.repeat(58))}`)
  const order = ['mycelium', 'watch', 'sentinel', 'factory', 'mining', 'observers', 'gates', 'events', 'errors']
  const labels = { mycelium: 'mycelium ', watch: 'watch    ', sentinel: 'sentinel ', factory: 'factory  ', mining: 'mining   ', observers: 'observers', gates: 'gates    ', events: 'events   ', errors: 'errors   ' }
  for (const k of order) {
    const v = snap.systems[k]
    const score = String(v.score).padStart(3)
    lines.push(`  ${statusIcon(v.status)} ${labels[k]}  ${score}  ${dim(v.detail)}`)
  }
  lines.push('')
  return lines.join('\n')
}

/* ─── CLI ─────────────────────────────────────────────── */
if (require.main === module) {
  const argv = process.argv.slice(2)
  const wantJSON = argv.includes('--json')
  const gateArg = argv.find((a) => a.startsWith('--gate='))
  const gate = gateArg ? parseInt(gateArg.split('=')[1], 10) : null
  const snap = snapshot()
  if (wantJSON) {
    process.stdout.write(JSON.stringify(snap, null, 2) + '\n')
  } else {
    process.stdout.write(pretty(snap) + '\n')
  }
  if (gate !== null && snap.composite < gate) {
    process.stderr.write(`\n  composite ${snap.composite} below gate ${gate}\n`)
    process.exit(1)
  }
}

module.exports = { snapshot, pretty, collectMycelium, collectWatch, collectEval, collectFactory, collectMining, collectObservers, collectGates, collectEvents, collectErrors }
