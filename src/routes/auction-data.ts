type _Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

// ============================================================================
// TYPES
// ============================================================================

export interface Auction {
  id: string
  sellerId: string
  sellerName: string
  card: {
    id: number
    name: string
    rarity: string
    img: string
    stars?: number
  }
  startPrice: number
  currentBid: number
  buyNowPrice?: number
  bidCount: number
  bids: AuctionBid[]
  duration: '1h' | '6h' | '24h' | '72h'
  startTime: number
  endTime: number
  status: 'active' | 'sold' | 'expired' | 'cancelled'
  winnerId?: string
  winnerName?: string
  finalPrice?: number
  category: 'card' | 'bundle' | 'rare-find'
  featured: boolean
}

export interface AuctionBid {
  id: string
  auctionId: string
  bidderId: string
  bidderName: string
  amount: number
  timestamp: number
  isAutoBid: boolean
}

export interface AuctionNotification {
  id: string
  userId: string
  type: 'outbid' | 'won' | 'sold' | 'ending-soon' | 'price-drop'
  auctionId: string
  message: string
  read: boolean
  timestamp: number
}

export interface TraderStats {
  wallet: string
  name: string
  totalBought: number
  totalSold: number
  totalSpent: number
  totalEarned: number
  winRate: number
  avgBidAmount: number
  favRarity: string
  reputation: number
}

// ============================================================================
// IN-MEMORY STORAGE (Production: use KV/D1)
// ============================================================================

export const auctions: Map<string, Auction> = new Map()
export const notifications: Map<string, AuctionNotification[]> = new Map()
export const traderStats: Map<string, TraderStats> = new Map()
export const priceHistory: Map<string, { timestamp: number; price: number; rarity: string }[]> = new Map()

export let auctionIdCounter = 1000

// Duration mappings in milliseconds
export const DURATION_MS: Record<string, number> = {
  '1h': 3600000,
  '6h': 21600000,
  '24h': 86400000,
  '72h': 259200000,
}

// Minimum bid increments by current price tier
export const BID_INCREMENT: Record<string, number> = {
  low: 5, // < 100 gold
  medium: 10, // 100-500 gold
  high: 25, // 500-2000 gold
  ultra: 50, // > 2000 gold
}

// Rarity-based listing fees (% of start price)
export const LISTING_FEE_PCT: Record<string, number> = {
  common: 0.02,
  uncommon: 0.02,
  rare: 0.03,
  epic: 0.04,
  legendary: 0.05,
  mythic: 0.05,
}

// Snipe protection: extend auction if bid within last 2 minutes
export const SNIPE_PROTECTION_MS = 120000 // 2 minutes
export const SNIPE_EXTENSION_MS = 120000 // extend by 2 minutes

export function getMinIncrement(currentBid: number): number {
  if (currentBid < 100) return BID_INCREMENT.low
  if (currentBid < 500) return BID_INCREMENT.medium
  if (currentBid < 2000) return BID_INCREMENT.high
  return BID_INCREMENT.ultra
}

export function generateAuctionId(): string {
  return `AUC-${++auctionIdCounter}-${Date.now().toString(36)}`
}

export function addNotification(userId: string, notif: Omit<AuctionNotification, 'id'>) {
  const userNotifs = notifications.get(userId) || []
  userNotifs.push({
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  })
  // Keep last 50 notifications per user
  if (userNotifs.length > 50) userNotifs.shift()
  notifications.set(userId, userNotifs)
}

export function updateTraderStats(wallet: string, name: string, type: 'buy' | 'sell', amount: number) {
  const stats = traderStats.get(wallet) || {
    wallet,
    name,
    totalBought: 0,
    totalSold: 0,
    totalSpent: 0,
    totalEarned: 0,
    winRate: 0,
    avgBidAmount: 0,
    favRarity: 'common',
    reputation: 100,
  }
  if (type === 'buy') {
    stats.totalBought++
    stats.totalSpent += amount
  } else {
    stats.totalSold++
    stats.totalEarned += amount
  }
  stats.name = name
  traderStats.set(wallet, stats)
}

// Initialize sample auctions
export function initSampleAuctions() {
  if (auctions.size > 0) return

  const samples = [
    {
      card: { id: 1, name: 'RegginA, The Eternal Flame', rarity: 'mythic', img: '01-reggina-mythic-maplestory.webp' },
      startPrice: 500,
      buyNow: 2000,
      seller: 'GuildVault',
      sellerId: 'npc-vault',
    },
    {
      card: { id: 27, name: 'Elder Dragon', rarity: 'legendary', img: '27-elder-dragon.webp' },
      startPrice: 100,
      buyNow: 500,
      seller: 'DragonKeeper',
      sellerId: 'npc-dragon',
    },
    {
      card: { id: 3, name: 'Onca, The Jungle Fury', rarity: 'epic', img: 'epic-onca.webp' },
      startPrice: 30,
      buyNow: 150,
      seller: 'CardMaster',
      sellerId: 'npc-cards',
    },
    {
      card: { id: 2, name: 'Reggino, Vice Commander', rarity: 'legendary', img: '02-reggino-legendary.webp', stars: 3 },
      startPrice: 200,
      buyNow: 800,
      seller: 'Collector42',
      sellerId: 'npc-collector',
    },
    {
      card: { id: 5, name: 'Panthera, Shadow Stalker', rarity: 'epic', img: 'epic-panthera.webp' },
      startPrice: 15,
      seller: 'NewTrader',
      sellerId: 'npc-new',
    },
  ]

  samples.forEach((s, i) => {
    const id = generateAuctionId()
    const duration = (['6h', '24h', '24h', '72h', '1h'] as const)[i]
    const now = Date.now()
    auctions.set(id, {
      id,
      sellerId: s.sellerId,
      sellerName: s.seller,
      card: s.card,
      startPrice: s.startPrice,
      currentBid: s.startPrice,
      buyNowPrice: s.buyNow,
      bidCount: Math.floor(Math.random() * 5),
      bids: [],
      duration,
      startTime: now - Math.floor(Math.random() * DURATION_MS[duration] * 0.3),
      endTime: now + DURATION_MS[duration] * (0.3 + Math.random() * 0.7),
      status: 'active',
      category: 'card',
      featured: i < 2,
    })
  })
}

initSampleAuctions()

// ============================================================================
// ROUTES
// ============================================================================
