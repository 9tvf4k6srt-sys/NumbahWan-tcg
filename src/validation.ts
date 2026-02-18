/**
 * ══════════════════════════════════════════════════════════════════
 *   Zod Validation Schemas — Request/Response contracts
 *   Single source of truth for API input validation.
 * ══════════════════════════════════════════════════════════════════
 */
import { z } from 'zod'

// ── Card Rarities ──────────────────────────────────────────────
export const CardRaritySchema = z.enum([
  'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic',
])

// ── Admin Card Endpoints ───────────────────────────────────────
export const CreateCardSchema = z.object({
  name: z.string().min(1).max(100),
  rarity: CardRaritySchema,
  img: z.string().min(1).max(200),
  set: z.string().max(50).optional().default('custom'),
  reserved: z.boolean().optional().default(false),
  description: z.string().max(500).optional().default(''),
  gmKey: z.string(),
})

export const BatchCreateCardsSchema = z.object({
  gmKey: z.string(),
  cards: z.array(z.object({
    name: z.string().min(1).max(100),
    rarity: CardRaritySchema,
    img: z.string().max(200).optional(),
    set: z.string().max(50).optional(),
    reserved: z.boolean().optional(),
    description: z.string().max(500).optional(),
    id: z.number().int().positive().optional(),
  })).min(1).max(100),
})

// ── Wallet / Economy ───────────────────────────────────────────
export const IdentifySchema = z.object({
  deviceUUID: z.string().min(8).max(64),
  displayName: z.string().max(32).optional(),
  trustScore: z.number().min(0).max(100).optional(),
})

export const TransactionSchema = z.object({
  deviceUUID: z.string().min(8).max(64),
  txType: z.string().min(1).max(32),
  currency: z.enum(['NWG', 'NWX', 'IRON', 'STONE', 'WOOD']),
  amount: z.number().positive(),
  description: z.string().max(200).optional(),
  targetDeviceUUID: z.string().max(64).optional(),
})

// ── Auction ────────────────────────────────────────────────────
export const PlaceBidSchema = z.object({
  auctionId: z.string().min(1),
  bidderId: z.string().min(1),
  bidderName: z.string().max(32).optional(),
  amount: z.number().positive(),
  isAutoBid: z.boolean().optional().default(false),
})

// ── Card Bridge ────────────────────────────────────────────────
export const MintRequestSchema = z.object({
  cardId: z.number().int().positive(),
  rarity: CardRaritySchema,
  quantity: z.number().int().min(1).max(1000),
  set: z.string().min(1).max(50),
})

export const ClaimCardSchema = z.object({
  claimCode: z.string().min(1).max(32),
  walletAddress: z.string().min(1).max(64),
})

// ── NPC Chat ───────────────────────────────────────────────────
export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  npcId: z.string().min(1).max(32).optional(),
  language: z.enum(['en', 'zh', 'th']).optional().default('en'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).max(20).optional(),
})

// ── Utility: Zod Error Formatter ───────────────────────────────
export function formatZodError(error: z.ZodError): string {
  return error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
}
