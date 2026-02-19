#!/usr/bin/env node
/**
 * Vitest → Mycelium Bridge v1.0
 * ═══════════════════════════════════════════════════════════════
 * Runs Vitest and bridges results into the event bus + memory.
 * Captures test failures as breakages, passes as learnings.
 *
 * Usage:
 *   node tools/vitest-bridge.cjs              # Run tests + record results
 *   node tools/vitest-bridge.cjs --json-only  # Parse existing vitest JSON output
 *
 * Integration:
 *   - Replaces raw `vitest run` in post-commit and CI
 *   - Emits events to event-bus for cross-system feedback
 *   - Records test failure patterns to prevent regressions
 *
 * @version 1.0.0
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const EVENTS_FILE = path.join(ROOT, '.mycelium', 'events.jsonl')
const MEMORY_FILE = path.join(ROOT, '.mycelium', 'memory.json')
const RESULTS_FILE = path.join(ROOT, '.mycelium', 'vitest-results.json')

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 60000, ...opts }).trim()
  } catch (e) {
    return { error: true, stdout: e.stdout || '', stderr: e.stderr || '', status: e.status }
  }
}

function appendEvent(event) {
  const dir = path.dirname(EVENTS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const record = { ts: Date.now(), date: new Date().toISOString(), ...event }
  fs.appendFileSync(EVENTS_FILE, JSON.stringify(record) + '\n')
  return record
}

function readMemory() {
  try { return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')) } catch { return null }
}

function writeMemory(mem) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem, null, 2))
}

// ── Run Vitest and capture output ──────────────────────────
function runVitest() {
  console.log('  [vitest-bridge] Running tests...')
  const result = run('npx vitest run --reporter=json 2>/dev/null')

  let jsonData = null

  if (typeof result === 'string') {
    // Successful run, parse JSON
    try { jsonData = JSON.parse(result) } catch {
      // Try extracting JSON from mixed output
      const jsonMatch = result.match(/\{[\s\S]*"testResults"[\s\S]*\}/)
      if (jsonMatch) try { jsonData = JSON.parse(jsonMatch[0]) } catch { /* noop */ }
    }
  } else if (result.error) {
    // Test failures still produce JSON
    const output = (result.stdout || '') + (result.stderr || '')
    const jsonMatch = output.match(/\{[\s\S]*"testResults"[\s\S]*\}/)
    if (jsonMatch) try { jsonData = JSON.parse(jsonMatch[0]) } catch { /* noop */ }
  }

  // Fallback: run with verbose reporter and parse manually
  if (!jsonData) {
    console.log('  [vitest-bridge] JSON parse failed, using verbose output...')
    const verboseResult = run('npx vitest run --reporter=verbose 2>&1')
    const output = typeof verboseResult === 'string' ? verboseResult : (verboseResult.stdout || '')
    return parseVerboseOutput(output)
  }

  return jsonData
}

// ── Parse verbose Vitest output as fallback ──────────────
function parseVerboseOutput(output) {
  const lines = output.split('\n')
  const suites = []
  let totalPassed = 0
  let totalFailed = 0
  const failures = []

  for (const line of lines) {
    // Match: ✓ src/__tests__/types.test.ts (13 tests) 6ms
    const suiteMatch = line.match(/[✓✗]\s+(src\/__tests__\/\S+)\s+\((\d+)\s+test/)
    if (suiteMatch) {
      const passed = line.includes('✓')
      suites.push({ file: suiteMatch[1], tests: parseInt(suiteMatch[2]), passed })
      if (passed) totalPassed += parseInt(suiteMatch[2])
    }

    // Match: Test Files  8 passed (8)
    const summaryMatch = line.match(/Test Files\s+(\d+) passed/)
    if (summaryMatch) { /* already counted */ }

    // Match: Tests  94 passed (94)
    const testsMatch = line.match(/Tests\s+(\d+) passed/)
    if (testsMatch) totalPassed = parseInt(testsMatch[1])

    // Match failed tests
    const failMatch = line.match(/Tests\s+(\d+) failed/)
    if (failMatch) totalFailed = parseInt(failMatch[1])

    // Match: FAIL src/__tests__/xxx.test.ts > test name
    const failLineMatch = line.match(/FAIL\s+(src\/__tests__\/\S+)\s+>\s+(.+)/)
    if (failLineMatch) {
      failures.push({ file: failLineMatch[1], testName: failLineMatch[2] })
    }
  }

  return {
    success: totalFailed === 0,
    numPassedTests: totalPassed,
    numFailedTests: totalFailed,
    numTotalTests: totalPassed + totalFailed,
    testSuites: suites.length,
    failures,
  }
}

// ── Bridge results to event bus + memory ─────────────────
function bridgeResults(data) {
  if (!data) {
    console.log('  [vitest-bridge] No test data to bridge')
    return
  }

  const passed = data.numPassedTests || 0
  const failed = data.numFailedTests || 0
  const total = data.numTotalTests || passed + failed
  const suites = data.testSuites || data.numPassedTestSuites || 0

  // Save results
  const dir = path.dirname(RESULTS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(RESULTS_FILE, JSON.stringify({
    ts: Date.now(),
    passed, failed, total, suites,
    success: failed === 0,
    failures: data.failures || [],
  }, null, 2))

  // Emit suite completion event
  appendEvent({
    system: 'vitest',
    event: 'suite_complete',
    severity: failed > 0 ? 'error' : 'info',
    data: { passed, failed, total, suites },
  })

  // Emit individual failure events
  const failures = data.failures || []
  if (data.testResults) {
    for (const suite of data.testResults) {
      if (suite.status === 'failed') {
        for (const assertion of (suite.assertionResults || [])) {
          if (assertion.status === 'failed') {
            appendEvent({
              system: 'vitest',
              event: 'test_fail',
              severity: 'error',
              data: {
                file: suite.name?.replace(ROOT + '/', '') || 'unknown',
                testName: assertion.fullName || assertion.title || 'unknown',
                error: (assertion.failureMessages || []).join('; ').slice(0, 500),
              },
            })
          }
        }
      }
    }
  } else if (failures.length > 0) {
    for (const f of failures) {
      appendEvent({
        system: 'vitest',
        event: 'test_fail',
        severity: 'error',
        data: { file: f.file, testName: f.testName, error: f.error || '' },
      })
    }
  }

  // Record to memory
  const mem = readMemory()
  if (mem && failed > 0) {
    if (!mem.breakages) mem.breakages = []
    mem.breakages.push({
      ts: Date.now(),
      date: new Date().toISOString().split('T')[0],
      area: 'backend',
      what: `${failed} Vitest test(s) failed out of ${total}. Failures: ${failures.map(f => f.testName || f.file).join(', ').slice(0, 300)}`,
      source: 'vitest-bridge',
    })
    writeMemory(mem)
  }

  // Summary
  const icon = failed === 0 ? '✓' : '✗'
  console.log(`  [vitest-bridge] ${icon} ${passed}/${total} passed, ${failed} failed across ${suites} suites`)
  if (failed > 0) {
    console.log(`  [vitest-bridge] Failures recorded as breakages in memory.json`)
  }

  return failed === 0
}

// ── Main ───────────────────────────────────────────────────
const args = process.argv.slice(2)

if (args.includes('--json-only')) {
  // Parse existing results
  if (fs.existsSync(RESULTS_FILE)) {
    const data = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'))
    console.log(JSON.stringify(data, null, 2))
  } else {
    console.log('No vitest-results.json found')
  }
} else {
  const data = runVitest()
  const success = bridgeResults(data)
  process.exit(success ? 0 : 1)
}
