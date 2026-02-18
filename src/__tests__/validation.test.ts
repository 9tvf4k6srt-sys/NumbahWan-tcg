/**
 * Unit tests for src/validation.ts — Zod schemas
 */
import { describe, it, expect } from 'vitest'
import {
  CreateCardSchema, BatchCreateCardsSchema, IdentifySchema,
  TransactionSchema, PlaceBidSchema, MintRequestSchema,
  ClaimCardSchema, ChatRequestSchema, CardRaritySchema,
  formatZodError,
} from '../validation'

describe('CardRaritySchema', () => {
  it('should accept valid rarities', () => {
    for (const r of ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']) {
      expect(CardRaritySchema.safeParse(r).success).toBe(true)
    }
  })

  it('should reject invalid rarity', () => {
    expect(CardRaritySchema.safeParse('ultra-rare').success).toBe(false)
    expect(CardRaritySchema.safeParse('').success).toBe(false)
    expect(CardRaritySchema.safeParse(42).success).toBe(false)
  })
})

describe('CreateCardSchema', () => {
  it('should accept a valid card creation request', () => {
    const result = CreateCardSchema.safeParse({
      name: 'RegginA',
      rarity: 'mythic',
      img: 'reggina.webp',
      gmKey: 'test-key',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.set).toBe('custom')
      expect(result.data.reserved).toBe(false)
    }
  })

  it('should reject missing required fields', () => {
    expect(CreateCardSchema.safeParse({ rarity: 'common' }).success).toBe(false)
    expect(CreateCardSchema.safeParse({ name: 'Test' }).success).toBe(false)
  })

  it('should reject name exceeding max length', () => {
    const result = CreateCardSchema.safeParse({
      name: 'x'.repeat(101),
      rarity: 'common',
      img: 'test.webp',
      gmKey: 'key',
    })
    expect(result.success).toBe(false)
  })
})

describe('BatchCreateCardsSchema', () => {
  it('should accept valid batch', () => {
    const result = BatchCreateCardsSchema.safeParse({
      gmKey: 'test',
      cards: [
        { name: 'Card A', rarity: 'common' },
        { name: 'Card B', rarity: 'epic', img: 'b.webp' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty cards array', () => {
    expect(BatchCreateCardsSchema.safeParse({ gmKey: 'test', cards: [] }).success).toBe(false)
  })

  it('should reject more than 100 cards', () => {
    const cards = Array.from({ length: 101 }, (_, i) => ({ name: `Card ${i}`, rarity: 'common' }))
    expect(BatchCreateCardsSchema.safeParse({ gmKey: 'test', cards }).success).toBe(false)
  })
})

describe('IdentifySchema', () => {
  it('should accept valid identify request', () => {
    const result = IdentifySchema.safeParse({ deviceUUID: 'abc12345' })
    expect(result.success).toBe(true)
  })

  it('should reject short deviceUUID', () => {
    expect(IdentifySchema.safeParse({ deviceUUID: 'abc' }).success).toBe(false)
  })
})

describe('TransactionSchema', () => {
  it('should accept valid transaction', () => {
    const result = TransactionSchema.safeParse({
      deviceUUID: 'test-device-1',
      txType: 'PURCHASE',
      currency: 'NWG',
      amount: 50,
    })
    expect(result.success).toBe(true)
  })

  it('should reject negative amount', () => {
    const result = TransactionSchema.safeParse({
      deviceUUID: 'test-device-1',
      txType: 'SPEND',
      currency: 'NWG',
      amount: -10,
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid currency', () => {
    const result = TransactionSchema.safeParse({
      deviceUUID: 'test-device-1',
      txType: 'SPEND',
      currency: 'GOLD',
      amount: 10,
    })
    expect(result.success).toBe(false)
  })
})

describe('PlaceBidSchema', () => {
  it('should accept valid bid', () => {
    const result = PlaceBidSchema.safeParse({
      auctionId: 'auction-1',
      bidderId: 'user-1',
      amount: 100,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isAutoBid).toBe(false)
    }
  })
})

describe('MintRequestSchema', () => {
  it('should accept valid mint request', () => {
    const result = MintRequestSchema.safeParse({
      cardId: 42,
      rarity: 'legendary',
      quantity: 10,
      set: 'origins',
    })
    expect(result.success).toBe(true)
  })

  it('should reject zero quantity', () => {
    expect(MintRequestSchema.safeParse({
      cardId: 1, rarity: 'common', quantity: 0, set: 'core',
    }).success).toBe(false)
  })
})

describe('ChatRequestSchema', () => {
  it('should accept valid chat request', () => {
    const result = ChatRequestSchema.safeParse({
      message: 'Hello, Oracle!',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.language).toBe('en')
    }
  })

  it('should reject empty message', () => {
    expect(ChatRequestSchema.safeParse({ message: '' }).success).toBe(false)
  })

  it('should reject message exceeding 2000 chars', () => {
    expect(ChatRequestSchema.safeParse({ message: 'x'.repeat(2001) }).success).toBe(false)
  })
})

describe('formatZodError', () => {
  it('should format validation errors into a readable string', () => {
    const result = CreateCardSchema.safeParse({ rarity: 'invalid' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const formatted = formatZodError(result.error)
      expect(formatted).toBeTypeOf('string')
      expect(formatted.length).toBeGreaterThan(0)
    }
  })
})
