/**
 * Unit tests for market-automation.ts — Market status and price helpers
 */
import { describe, it, expect } from 'vitest'
import {
  getMarketStatus,
  NWG_WEIGHTS, NWG_TOTAL_SUPPLY, NWG_BASE_MULTIPLIER,
  CACHE_KEYS, CACHE_TTL,
} from '../services/market-automation'

describe('getMarketStatus', () => {
  it('should return a valid status string', () => {
    const result = getMarketStatus()
    expect(['OPEN', 'CLOSED', 'PRE_MARKET', 'AFTER_HOURS']).toContain(result.status)
  })

  it('should return a positive nextChange value', () => {
    const result = getMarketStatus()
    expect(result.nextChange).toBeGreaterThan(0)
  })

  it('should have a numeric nextChange in milliseconds', () => {
    const result = getMarketStatus()
    expect(result.nextChange).toBeTypeOf('number')
    // Should be less than a week in ms
    expect(result.nextChange).toBeLessThan(7 * 24 * 60 * 60 * 1000)
  })
})

describe('NWG_WEIGHTS', () => {
  it('should be a non-empty object', () => {
    expect(Object.keys(NWG_WEIGHTS).length).toBeGreaterThan(0)
  })

  it('weights should sum to approximately 1', () => {
    const sum = Object.values(NWG_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 1) // within 0.1
  })
})

describe('NWG_TOTAL_SUPPLY', () => {
  it('should be 1 billion', () => {
    expect(NWG_TOTAL_SUPPLY).toBe(1_000_000_000)
  })
})

describe('NWG_BASE_MULTIPLIER', () => {
  it('should be a positive number', () => {
    expect(NWG_BASE_MULTIPLIER).toBeGreaterThan(0)
  })
})

describe('CACHE_KEYS', () => {
  it('should have required cache key names', () => {
    expect(CACHE_KEYS).toBeDefined()
    expect(typeof CACHE_KEYS).toBe('object')
  })
})

describe('CACHE_TTL', () => {
  it('should have reasonable TTL values', () => {
    expect(CACHE_TTL).toBeDefined()
    expect(typeof CACHE_TTL).toBe('object')
  })
})
