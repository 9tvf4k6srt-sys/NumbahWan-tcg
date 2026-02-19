/**
 * Unit tests for card-nwg-bridge.ts — Minting and claim system
 */
import { describe, expect, it } from 'vitest'
import { type MintRequest, mintPhysicalCards } from '../services/card-nwg-bridge'
import { CARD_NWG_VALUES, CARD_PRINT_RUNS } from '../services/card-nwg-bridge-types'

describe('mintPhysicalCards', () => {
  const baseMeta = { name: 'RegginA', description: 'The Founder', image: 'reggina.webp' }

  it('should mint the correct number of cards for common rarity', () => {
    const request: MintRequest = { cardId: 1, rarity: 'common', quantity: 5, set: 'core' }
    const result = mintPhysicalCards(request, baseMeta)

    expect(result.cards).toHaveLength(5)
    expect(result.claimCodes).toHaveLength(5)
  })

  it('should cap minting at the print run limit', () => {
    const request: MintRequest = { cardId: 1, rarity: 'mythic', quantity: 9999, set: 'core' }
    const result = mintPhysicalCards(request, baseMeta)

    expect(result.cards.length).toBeLessThanOrEqual(CARD_PRINT_RUNS.mythic)
  })

  it('should assign correct NWG locked value based on rarity', () => {
    const request: MintRequest = { cardId: 1, rarity: 'legendary', quantity: 1, set: 'core' }
    const result = mintPhysicalCards(request, baseMeta)

    expect(result.cards[0].nwgLocked).toBe(CARD_NWG_VALUES.legendary)
  })

  it('should assign serial numbers starting from 1', () => {
    const request: MintRequest = { cardId: 1, rarity: 'rare', quantity: 3, set: 'origins' }
    const result = mintPhysicalCards(request, baseMeta)

    expect(result.cards[0].serialNumber).toBe(1)
    expect(result.cards[1].serialNumber).toBe(2)
    expect(result.cards[2].serialNumber).toBe(3)
  })

  it('should include metadata in each card', () => {
    const request: MintRequest = { cardId: 42, rarity: 'epic', quantity: 1, set: 'expansion' }
    const result = mintPhysicalCards(request, baseMeta)
    const card = result.cards[0]

    expect(card.metadata.name).toBe('RegginA')
    expect(card.metadata.set).toBe('expansion')
    expect(card.cardId).toBe(42)
  })

  it('should generate unique claim codes per card', () => {
    const request: MintRequest = { cardId: 1, rarity: 'uncommon', quantity: 10, set: 'core' }
    const result = mintPhysicalCards(request, baseMeta)

    const codes = result.claimCodes.map((c) => c.code)
    const unique = new Set(codes)
    expect(unique.size).toBe(codes.length)
  })

  it('should set initial status to unclaimed', () => {
    const request: MintRequest = { cardId: 1, rarity: 'common', quantity: 1, set: 'core' }
    const result = mintPhysicalCards(request, baseMeta)

    expect(result.cards[0].status).toBe('unclaimed')
    expect(result.cards[0].ownerId).toBeUndefined()
  })
})
