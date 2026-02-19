import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '../..')

describe('Event Bus', () => {
  const eventsFile = path.join(ROOT, '.mycelium', 'events.jsonl')
  let originalContent: string | null = null

  beforeEach(() => {
    originalContent = fs.existsSync(eventsFile) ? fs.readFileSync(eventsFile, 'utf8') : null
  })

  afterEach(() => {
    // Restore original events file
    if (originalContent !== null) {
      fs.writeFileSync(eventsFile, originalContent)
    } else if (fs.existsSync(eventsFile)) {
      fs.unlinkSync(eventsFile)
    }
  })

  it('should emit events to JSONL file', () => {
    execSync(`node tools/event-bus.cjs emit --system=test --event=unit_test --data='{"msg":"hello"}' --silent`, {
      cwd: ROOT,
      encoding: 'utf8',
    })
    const content = fs.readFileSync(eventsFile, 'utf8')
    const lines = content.split('\n').filter(Boolean)
    const last = JSON.parse(lines[lines.length - 1])
    expect(last.system).toBe('test')
    expect(last.event).toBe('unit_test')
    expect(last.data.msg).toBe('hello')
    expect(last.ts).toBeGreaterThan(0)
  })

  it('should show stats without error', () => {
    const output = execSync('node tools/event-bus.cjs stats', {
      cwd: ROOT,
      encoding: 'utf8',
    })
    expect(output).toContain('Event Bus Stats')
  })

  it('should trim old events', () => {
    execSync('node tools/event-bus.cjs trim', { cwd: ROOT, encoding: 'utf8' })
    // Should not throw
  })
})

describe('TSC Bridge', () => {
  it('should run TypeScript check and produce results', () => {
    const output = execSync('node tools/tsc-bridge.cjs', {
      cwd: ROOT,
      encoding: 'utf8',
    })
    expect(output).toContain('[tsc-bridge]')
    // Since we have 0 TS errors, should pass
    expect(output).toContain('Zero TypeScript errors')
  })
})

describe('Build Budget', () => {
  it('should report metrics when dist exists', () => {
    // Build if needed
    if (!fs.existsSync(path.join(ROOT, 'dist'))) {
      execSync('npm run build', { cwd: ROOT, encoding: 'utf8', timeout: 60000 })
    }
    const output = execSync('node tools/build-budget.cjs', {
      cwd: ROOT,
      encoding: 'utf8',
    })
    expect(output).toContain('Build Budget Check')
    expect(output).toContain('Bundle:')
    expect(output).toContain('HTML pages:')
  })
})

describe('Memory Trimmer', () => {
  it('should run dry-run without modifying files', () => {
    const memBefore = fs.existsSync(path.join(ROOT, '.mycelium', 'memory.json'))
      ? fs.readFileSync(path.join(ROOT, '.mycelium', 'memory.json'), 'utf8')
      : null

    const output = execSync('node tools/memory-trimmer.cjs --dry-run', {
      cwd: ROOT,
      encoding: 'utf8',
    })

    expect(output).toContain('Memory Trimmer')

    // Verify memory.json unchanged
    if (memBefore) {
      const memAfter = fs.readFileSync(path.join(ROOT, '.mycelium', 'memory.json'), 'utf8')
      expect(memAfter).toBe(memBefore)
    }
  })
})
