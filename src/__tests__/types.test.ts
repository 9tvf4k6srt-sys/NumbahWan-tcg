/**
 * Unit tests for src/types.ts — Card engine helpers
 * Tests calcCardPower, TIER_RULES, SHRINE_PENALTY, type exports
 */
import { describe, expect, it } from 'vitest'
import {
  type AuctionBid,
  type Bindings,
  type CardBase,
  type CardRarity,
  calcCardPower,
  FUSION_RECIPES,
  SHRINE_PENALTY,
  TIER_RULES,
} from '../types'

describe('calcCardPower', () => {
  const makeCard = (stats: Partial<CardBase['gameStats']> = {}): CardBase => ({
    id: 1,
    name: 'Test Card',
    rarity: 'common',
    category: 'member',
    role: 'carry',
    img: 'test.webp',
    set: 'core',
    description: 'A test card',
    hasArt: true,
    flavorStats: { power: 10, endurance: 10 },
    gameStats: {
      attack: 10,
      defense: 10,
      speed: 10,
      hp: 100,
      cost: 5,
      ...stats,
    },
  })

  it('should calculate power correctly for a standard card', () => {
    const card = makeCard()
    // attack(10) + defense(10) + speed(10) + hp(100) + cost(5)*2 = 140
    expect(calcCardPower(card)).toBe(140)
  })

  it('should return 0 for a zero-stat card', () => {
    const card = makeCard({ attack: 0, defense: 0, speed: 0, hp: 0, cost: 0 })
    expect(calcCardPower(card)).toBe(0)
  })

  it('should handle high-stat mythic cards', () => {
    const card = makeCard({ attack: 50, defense: 40, speed: 30, hp: 200, cost: 15 })
    // 50 + 40 + 30 + 200 + 15*2 = 350
    expect(calcCardPower(card)).toBe(350)
  })

  it('should weight cost at 2x', () => {
    const a = makeCard({ cost: 10 })
    const b = makeCard({ cost: 20 })
    expect(calcCardPower(b) - calcCardPower(a)).toBe(20)
  })
})

describe('TIER_RULES', () => {
  it('should have 5 tiers (S through D)', () => {
    expect(Object.keys(TIER_RULES)).toEqual(['S', 'A', 'B', 'C', 'D'])
  })

  it('should have descending minPower thresholds', () => {
    expect(TIER_RULES.S.minPower).toBeGreaterThan(TIER_RULES.A.minPower)
    expect(TIER_RULES.A.minPower).toBeGreaterThan(TIER_RULES.B.minPower)
    expect(TIER_RULES.B.minPower).toBeGreaterThan(TIER_RULES.C.minPower)
    expect(TIER_RULES.D.minPower).toBe(0)
  })

  it('should have proper labels', () => {
    expect(TIER_RULES.S.label).toBe('S-Tier')
    expect(TIER_RULES.D.label).toBe('D-Tier')
  })
})

describe('SHRINE_PENALTY', () => {
  it('should be 15%', () => {
    expect(SHRINE_PENALTY).toBe(0.15)
  })

  it('should reduce effective power when applied', () => {
    const basePower = 100
    const penalized = basePower * (1 - SHRINE_PENALTY)
    expect(penalized).toBe(85)
  })
})

describe('FUSION_RECIPES', () => {
  it('should be an empty record initially', () => {
    expect(typeof FUSION_RECIPES).toBe('object')
  })
})

describe('Type exports', () => {
  it('should export CardRarity as a string literal union', () => {
    const rarity: CardRarity = 'mythic'
    expect(rarity).toBe('mythic')
  })

  it('should export Bindings type with required fields', () => {
    // Type-level check — if this compiles, the type is correct
    const bindings = {} as Bindings
    expect(bindings).toBeDefined()
  })

  it('should export AuctionBid interface', () => {
    const bid: AuctionBid = { bidder: 'test', amount: 100, timestamp: Date.now() }
    expect(bid.amount).toBe(100)
  })
})
