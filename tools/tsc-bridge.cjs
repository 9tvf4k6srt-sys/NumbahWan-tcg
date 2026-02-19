#!/usr/bin/env node
/**
 * TypeScript → Mycelium Bridge v1.0
 * ═══════════════════════════════════════════════════════════════
 * Runs `tsc --noEmit` and bridges errors into the event bus + memory.
 * Captures TypeScript error patterns as learnings to prevent recurrence.
 *
 * Usage:
 *   node tools/tsc-bridge.cjs           # Run tsc + record results
 *   node tools/tsc-bridge.cjs --report  # Show last recorded TS errors
 *
 * @version 1.0.0
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const EVENTS_FILE = path.join(ROOT, '.mycelium', 'events.jsonl')
const MEMORY_FILE = path.join(ROOT, '.mycelium', 'memory.json')
const RESULTS_FILE = path.join(ROOT, '.mycelium', 'tsc-results.json')

function appendEvent(event) {
  const dir = path.dirname(EVENTS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const record = { ts: Date.now(), date: new Date().toISOString(), ...event }
  fs.appendFileSync(EVENTS_FILE, JSON.stringify(record) + '\n')
}

function readMemory() {
  try { return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')) } catch { return null }
}

function writeMemory(mem) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem, null, 2))
}

// ── Error category explanations ────────────────────────────
const ERROR_TIPS = {
  TS7006: 'Always add explicit types to function parameters',
  TS18047: 'Add null checks before accessing potentially undefined values',
  TS2345: 'Ensure argument types match parameter types — check interface definitions',
  TS2339: 'Property does not exist — check spelling or add to interface',
  TS2304: 'Name not found — check imports and ensure module is installed',
  TS2322: 'Type mismatch in assignment — verify both sides match',
  TS2440: 'Import type mismatch — verify import path and exported types',
  TS2554: 'Wrong number of arguments — check function signature',
  TS2769: 'No overload matches — check all argument types against overload signatures',
  TS2741: 'Missing required property — add all required fields to object literal',
}

function runTsc() {
  console.log('  [tsc-bridge] Running TypeScript check...')
  let output = ''
  let exitCode = 0

  try {
    output = execSync('npx tsc --noEmit --skipLibCheck 2>&1', {
      cwd: ROOT, encoding: 'utf8', timeout: 30000,
    })
  } catch (e) {
    output = e.stdout || e.stderr || ''
    exitCode = e.status || 1
  }

  // Parse errors
  const errors = []
  const errorRegex = /^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/gm
  let match
  match = errorRegex.exec(output)
  while (match !== null) {
    errors.push({
      file: match[1].replace(ROOT + '/', ''),
      line: parseInt(match[2]),
      col: parseInt(match[3]),
      code: match[4],
      message: match[5],
    })
    match = errorRegex.exec(output)
  }

  return { errors, exitCode, total: errors.length }
}

function bridgeResults(data) {
  const { errors, total } = data

  // Save results
  const dir = path.dirname(RESULTS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  // Categorize by error code
  const byCode = {}
  const byFile = {}
  for (const e of errors) {
    byCode[e.code] = (byCode[e.code] || 0) + 1
    byFile[e.file] = (byFile[e.file] || 0) + 1
  }

  const results = {
    ts: Date.now(),
    total,
    success: total === 0,
    byCode,
    byFile,
    topErrors: Object.entries(byCode).sort((a, b) => b[1] - a[1]).slice(0, 10),
    topFiles: Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 10),
    errors: errors.slice(0, 50), // Keep first 50 for reference
  }

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2))

  if (total === 0) {
    appendEvent({
      system: 'tsc',
      event: 'type_clean',
      severity: 'info',
      data: { total: 0 },
    })
    console.log('  [tsc-bridge] ✓ Zero TypeScript errors')
    return true
  }

  // Emit events for each error category
  for (const [code, count] of Object.entries(byCode)) {
    appendEvent({
      system: 'tsc',
      event: 'type_error',
      severity: 'error',
      data: {
        code,
        count,
        files: errors.filter(e => e.code === code).map(e => e.file).filter((f, i, a) => a.indexOf(f) === i).slice(0, 5),
        tip: ERROR_TIPS[code] || `Fix ${code} errors in affected files`,
      },
    })
  }

  // Record to memory as learnings (one per error category)
  const mem = readMemory()
  if (mem) {
    if (!mem.learnings) mem.learnings = []
    for (const [code, count] of Object.entries(byCode)) {
      const files = errors.filter(e => e.code === code).map(e => e.file).filter((f, i, a) => a.indexOf(f) === i)
      mem.learnings.push({
        ts: Date.now(),
        date: new Date().toISOString().split('T')[0],
        area: 'typescript',
        lesson: `${code} (${count}x) in ${files.slice(0, 3).join(', ')}${files.length > 3 ? ` +${files.length - 3} more` : ''}. ${ERROR_TIPS[code] || 'Check types.'}`,
        autoGenerated: true,
        source: 'tsc-bridge',
      })
    }
    writeMemory(mem)
    console.log(`  [tsc-bridge] ✗ ${total} errors in ${Object.keys(byCode).length} categories → recorded as learnings`)
  }

  return false
}

function showReport() {
  if (!fs.existsSync(RESULTS_FILE)) {
    console.log('No tsc-results.json found. Run: node tools/tsc-bridge.cjs')
    return
  }
  const data = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'))
  console.log(`\n  TypeScript Error Report`)
  console.log(`  ──────────────────────────`)
  console.log(`  Total errors: ${data.total}`)
  if (data.topErrors?.length) {
    console.log(`  By code:`)
    for (const [code, count] of data.topErrors) {
      console.log(`    ${code}: ${count} ${ERROR_TIPS[code] ? `— ${ERROR_TIPS[code]}` : ''}`)
    }
  }
  if (data.topFiles?.length) {
    console.log(`  By file:`)
    for (const [file, count] of data.topFiles) {
      console.log(`    ${file}: ${count}`)
    }
  }
  console.log()
}

// ── Main ───────────────────────────────────────────────────
const args = process.argv.slice(2)

if (args.includes('--report')) {
  showReport()
} else {
  const data = runTsc()
  const success = bridgeResults(data)
  process.exit(success ? 0 : 1)
}
