/**
 * Shared type definitions for NumbahWan Guild
 *
 * Cloudflare Workers bindings, card system types, and common interfaces.
 */

// ── Cloudflare Workers Bindings ──────────────────────────────────
export type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
  OPENAI_API_KEY?: string
  OPENAI_BASE_URL?: string
  ASSETS: { fetch: (req: Request) => Promise<Response> }
}

// ── Card System Types ────────────────────────────────────────────
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'

export interface CardBase {
  id: number
  name: string
  rarity: CardRarity | string
  category: string
  role: string
  img: string
  set: string
  description: string
  hasArt: boolean
  flavorStats: { power: number; endurance: number }
  gameStats: {
    attack: number
    defense: number
    speed: number
    hp: number
    cost: number
    ability?: string
    abilityDescription?: string
  }
  flavorText?: string
  image?: string
  reserved?: boolean
}

export interface CardCollection {
  odenom: string
  cards: number[]
}

export interface CardTransfer {
  from: string
  to: string
  cardId: number
  timestamp: number
}

export interface CardBridge {
  id: string
  fromChain: string
  toChain: string
  cardId: number
  status: string
}

export interface AuctionBid {
  bidder: string
  amount: number
  timestamp: number
}

// ── Card Engine Helpers ──────────────────────────────────────────
export function calcCardPower(card: CardBase): number {
  const stats = card.gameStats
  return stats.attack + stats.defense + stats.speed + stats.hp + (stats.cost * 2)
}

export const TIER_RULES = {
  S: { minPower: 100, label: 'S-Tier' },
  A: { minPower: 75, label: 'A-Tier' },
  B: { minPower: 50, label: 'B-Tier' },
  C: { minPower: 25, label: 'C-Tier' },
  D: { minPower: 0, label: 'D-Tier' },
}

export const SHRINE_PENALTY = 0.15

export const FUSION_RECIPES: Record<string, { ingredients: string[]; result: string }> = {}
