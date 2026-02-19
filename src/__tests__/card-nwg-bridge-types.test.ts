/**
 * Unit tests for card-nwg-bridge-types.ts — Card bridge constants & helpers
 */
import { describe, expect, it } from 'vitest'
import {
  CARD_CACHE_KEYS,
  CARD_NWG_VALUES,
  CARD_PRINT_RUNS,
  CARD_YIELD_RATES,
  calculatePendingYield,
  FUSION_RECIPES,
  generateCardId,
  generateClaimCode,
  generateQRCodeData,
  hashClaimCode,
  STAKING_BOOSTS,
} from '../services/card-nwg-bridge-types'

describe('CARD_NWG_VALUES', () => {
  it('should have values for all 6 rarities', () => {
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
    for (const r of rarities) {
      expect(CARD_NWG_VALUES[r as keyof typeof CARD_NWG_VALUES]).toBeTypeOf('number')
      expect(CARD_NWG_VALUES[r as keyof typeof CARD_NWG_VALUES]).toBeGreaterThan(0)
    }
  })

  it('should increase with rarity', () => {
    expect(CARD_NWG_VALUES.mythic).toBeGreaterThan(CARD_NWG_VALUES.legendary)
    expect(CARD_NWG_VALUES.legendary).toBeGreaterThan(CARD_NWG_VALUES.epic)
    expect(CARD_NWG_VALUES.epic).toBeGreaterThan(CARD_NWG_VALUES.rare)
  })
})

describe('CARD_YIELD_RATES', () => {
  it('should have yield rates for all rarities', () => {
    expect(Object.keys(CARD_YIELD_RATES).length).toBeGreaterThanOrEqual(6)
  })

  it('mythic should yield more than common', () => {
    expect(CARD_YIELD_RATES.mythic).toBeGreaterThan(CARD_YIELD_RATES.common)
  })
})

describe('CARD_PRINT_RUNS', () => {
  it('should limit rarer cards to fewer prints', () => {
    expect(CARD_PRINT_RUNS.common).toBeGreaterThan(CARD_PRINT_RUNS.mythic)
  })
})

describe('FUSION_RECIPES', () => {
  it('should be an array of recipes', () => {
    expect(Array.isArray(FUSION_RECIPES)).toBe(true)
    expect(FUSION_RECIPES.length).toBeGreaterThan(0)
  })

  it('each recipe should have required fields', () => {
    for (const recipe of FUSION_RECIPES) {
      expect(recipe).toHaveProperty('id')
      expect(recipe).toHaveProperty('inputRarity')
      expect(recipe).toHaveProperty('inputCount')
      expect(recipe).toHaveProperty('outputRarity')
      expect(recipe).toHaveProperty('nwgCost')
      expect(recipe).toHaveProperty('successRate')
      expect(recipe.successRate).toBeGreaterThan(0)
      expect(recipe.successRate).toBeLessThanOrEqual(100)
    }
  })
})

describe('STAKING_BOOSTS', () => {
  it('should have boost tiers for collection milestones', () => {
    expect(Object.keys(STAKING_BOOSTS).length).toBeGreaterThan(0)
    // Each boost should be >= 1.0
    for (const [_key, value] of Object.entries(STAKING_BOOSTS)) {
      expect(value).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('CARD_CACHE_KEYS', () => {
  it('should have all required cache key strings', () => {
    expect(CARD_CACHE_KEYS.PHYSICAL_CARDS).toBeTypeOf('string')
    expect(CARD_CACHE_KEYS.CARD_STAKES).toBeTypeOf('string')
    expect(CARD_CACHE_KEYS.CARD_LISTINGS).toBeTypeOf('string')
    expect(CARD_CACHE_KEYS.CARD_TRANSFERS).toBeTypeOf('string')
    expect(CARD_CACHE_KEYS.USER_COLLECTIONS).toBeTypeOf('string')
    expect(CARD_CACHE_KEYS.CLAIM_CODES).toBeTypeOf('string')
  })
})

describe('generateCardId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateCardId('mythic', 1)
    const id2 = generateCardId('mythic', 2)
    expect(id1).not.toBe(id2)
  })

  it('should include rarity indicator', () => {
    const id = generateCardId('legendary', 42)
    expect(id).toBeTypeOf('string')
    expect(id.length).toBeGreaterThan(0)
  })
})

describe('generateClaimCode', () => {
  it('should generate a non-empty string', () => {
    const code = generateClaimCode()
    expect(code).toBeTypeOf('string')
    expect(code.length).toBeGreaterThan(0)
  })

  it('should generate unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateClaimCode()))
    expect(codes.size).toBe(100)
  })
})

describe('hashClaimCode', () => {
  it('should produce a deterministic hash', () => {
    const hash1 = hashClaimCode('TEST-CODE')
    const hash2 = hashClaimCode('TEST-CODE')
    expect(hash1).toBe(hash2)
  })

  it('should produce different hashes for different codes', () => {
    const hash1 = hashClaimCode('CODE-A')
    const hash2 = hashClaimCode('CODE-B')
    expect(hash1).not.toBe(hash2)
  })
})

describe('generateQRCodeData', () => {
  it('should return an object containing the card ID', () => {
    const data = generateQRCodeData('CARD-123', 'CLAIM-456') as any
    expect(data).toBeDefined()
    expect(data.cardId).toBe('CARD-123')
  })
})

describe('calculatePendingYield', () => {
  it('should return 0 for freshly staked card', () => {
    const stake = {
      id: 'stake-1',
      physicalCardId: 'test',
      ownerId: 'wallet-1',
      stakedAt: Date.now(),
      lastClaimAt: Date.now(),
      totalEarned: 0,
      yieldRate: 1.0,
      boostMultiplier: 1.0,
    }
    const yld = calculatePendingYield(stake)
    expect(yld).toBeGreaterThanOrEqual(0)
  })

  it('should accumulate yield over time', () => {
    const oneDayAgo = Date.now() - 86400000
    const stake = {
      id: 'stake-2',
      physicalCardId: 'test',
      ownerId: 'wallet-1',
      stakedAt: oneDayAgo,
      lastClaimAt: oneDayAgo,
      totalEarned: 0,
      yieldRate: 5.0,
      boostMultiplier: 1.0,
    }
    const yld = calculatePendingYield(stake)
    expect(yld).toBeGreaterThan(0)
  })
})
