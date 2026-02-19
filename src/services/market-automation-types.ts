/**
 * NWG Market Automation Service
 *
 * Features:
 * - Multi-source price aggregation (Coinbase, CoinGecko, calculated)
 * - KV-based caching for instant responses
 * - Automatic price history storage
 * - Portfolio value calculations
 * - Market status awareness (NYSE hours)
 * - Alert triggers for significant price movements
 *
 * NWG Formula: Silver(25%) + Gold(20%) + BTC(20%) + PLTR(20%) + AVGO(15%)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AssetPrice {
  price: number
  change: number
  high24h: number
  low24h: number
  lastUpdate: number
  source: string
}

export interface MarketData {
  timestamp: number
  assets: Record<string, AssetPrice>
  nwg: {
    price: number
    change24h: number
    high24h: number
    low24h: number
    marketCap: number
    totalSupply: number
  }
  marketStatus: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS'
  realSourceCount: number
  sources: Record<string, string>
}

export interface PriceAlert {
  id: string
  asset: string
  condition: 'above' | 'below' | 'change_pct'
  threshold: number
  triggered: boolean
  createdAt: number
  triggeredAt?: number
}

export interface HistoryPoint {
  timestamp: number
  price: number
  assets?: Record<string, number>
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const NWG_WEIGHTS = {
  silver: 0.25,
  gold: 0.2,
  btc: 0.2,
  pltr: 0.2,
  avgo: 0.15,
} as const

export const NWG_TOTAL_SUPPLY = 1_000_000_000
export const NWG_BASE_MULTIPLIER = 0.00001

// Cache keys
export const CACHE_KEYS = {
  PRICES: 'market:prices',
  HISTORY_PREFIX: 'market:history:',
  ALERTS: 'market:alerts',
  LAST_UPDATE: 'market:lastUpdate',
  DAILY_STATS: 'market:daily:',
} as const

// Cache TTLs (seconds)
export const CACHE_TTL = {
  PRICES: 30, // 30 seconds for live prices
  HISTORY: 3600, // 1 hour for history
  DAILY_STATS: 86400, // 24 hours for daily stats
} as const

// ============================================================================
// MARKET STATUS DETECTION
// ============================================================================
