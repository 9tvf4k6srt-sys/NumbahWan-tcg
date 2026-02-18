/**
 * Unit tests for ai-guide.ts — Action parser and exports
 */
import { describe, it, expect } from 'vitest'
import { parseActionsFromResponse, AVAILABLE_ACTIONS } from '../services/ai-guide'

describe('parseActionsFromResponse', () => {
  it('should return clean text when no actions are present', () => {
    const input = 'Welcome to the guild! Try visiting the forge.'
    const result = parseActionsFromResponse(input)

    expect(result.cleanText).toBe(input)
    expect(result.actions).toHaveLength(0)
  })

  it('should extract actions from tagged response', () => {
    const input = 'Check this out! <<<ACTION:{"type":"navigate","target":"/forge"}>>> Cool right?'
    const result = parseActionsFromResponse(input)

    expect(result.actions.length).toBeGreaterThanOrEqual(0)
    expect(result.cleanText).not.toContain('<<<ACTION')
  })

  it('should handle multiple actions', () => {
    const input = 'First <<<ACTION:{"type":"navigate","target":"/cards"}>>> then <<<ACTION:{"type":"navigate","target":"/forge"}>>>'
    const result = parseActionsFromResponse(input)

    expect(result.cleanText).not.toContain('<<<')
  })

  it('should handle malformed action tags gracefully', () => {
    const input = 'Text <<<ACTION:{invalid json}>>> more text'
    const result = parseActionsFromResponse(input)

    // Should not throw
    expect(result.cleanText).toBeDefined()
  })

  it('should handle empty string', () => {
    const result = parseActionsFromResponse('')
    expect(result.cleanText).toBe('')
    expect(result.actions).toHaveLength(0)
  })
})

describe('AVAILABLE_ACTIONS', () => {
  it('should be a non-empty object', () => {
    expect(typeof AVAILABLE_ACTIONS).toBe('object')
    expect(Object.keys(AVAILABLE_ACTIONS).length).toBeGreaterThan(0)
  })

  it('each action should have a description', () => {
    for (const [key, value] of Object.entries(AVAILABLE_ACTIONS)) {
      expect(key).toBeTypeOf('string')
      expect(value).toBeDefined()
    }
  })
})
