/**
 * NWG Gamification System
 *
 * Features:
 * - Price Prediction Game (bet on price direction)
 * - Achievement System with badges
 * - Daily/Weekly Quests
 * - Leaderboards
 * - Whale Tracker
 * - Fear & Greed Index
 * - AI Market Analyst
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Prediction {
  id: string
  odenom: string // wallet address
  direction: 'up' | 'down'
  targetPrice?: number
  betAmount: number
  timeframe: '1h' | '24h' | '7d'
  startPrice: number
  startTime: number
  endTime: number
  status: 'active' | 'won' | 'lost' | 'expired'
  payout?: number
  actualPrice?: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'trading' | 'holding' | 'social' | 'explorer' | 'whale'
  requirement: {
    type: string
    value: number
  }
  reward: {
    nwg?: number
    nwx?: number
    badge?: string
  }
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
}

export interface UserAchievement {
  odenom: string
  achievementId: string
  unlockedAt: number
  progress: number
}

export interface Quest {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'special'
  requirement: {
    action: string
    count: number
  }
  reward: {
    nwg?: number
    nwx?: number
    xp?: number
  }
  expiresAt: number
}

export interface LeaderboardEntry {
  odenom: string
  displayName: string
  score: number
  wins: number
  totalBets: number
  winRate: number
  totalProfit: number
  rank?: number
}

export interface WhaleAlert {
  id: string
  type: 'buy' | 'sell' | 'transfer'
  asset: string
  amount: number
  usdValue: number
  timestamp: number
  from?: string
  to?: string
}

export interface FearGreedData {
  value: number // 0-100
  label: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
  factors: {
    volatility: number
    momentum: number
    volume: number
    socialSentiment: number
  }
  history: { timestamp: number; value: number }[]
}

export interface MarketAnalysis {
  summary: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  keyFactors: string[]
  topMover: { asset: string; change: number; reason: string }
  recommendation: string
  confidence: number
}

// ============================================================================
// CACHE KEYS
// ============================================================================

export const GAME_CACHE_KEYS = {
  PREDICTIONS: 'game:predictions',
  LEADERBOARD: 'game:leaderboard',
  ACHIEVEMENTS: 'game:achievements',
  USER_ACHIEVEMENTS: 'game:user_achievements:',
  QUESTS: 'game:quests',
  USER_QUESTS: 'game:user_quests:',
  WHALE_ALERTS: 'game:whales',
  FEAR_GREED: 'game:feargreed',
  PREDICTION_POOL: 'game:pool',
} as const

// ============================================================================
// ACHIEVEMENTS DEFINITIONS
// ============================================================================

export const ACHIEVEMENTS: Achievement[] = [
  // Trading Achievements
  {
    id: 'first-prediction',
    name: 'Fortune Teller',
    description: 'Make your first price prediction',
    icon: '🔮',
    category: 'trading',
    requirement: { type: 'predictions', value: 1 },
    reward: { nwg: 10, badge: 'fortune-teller' },
    rarity: 'common',
  },
  {
    id: 'winning-streak-3',
    name: 'Hot Hand',
    description: 'Win 3 predictions in a row',
    icon: '🔥',
    category: 'trading',
    requirement: { type: 'win_streak', value: 3 },
    reward: { nwg: 50, badge: 'hot-hand' },
    rarity: 'rare',
  },
  {
    id: 'winning-streak-10',
    name: 'Oracle',
    description: 'Win 10 predictions in a row',
    icon: '👁️',
    category: 'trading',
    requirement: { type: 'win_streak', value: 10 },
    reward: { nwg: 500, badge: 'oracle' },
    rarity: 'legendary',
  },
  {
    id: 'total-wins-50',
    name: 'Market Master',
    description: 'Win 50 total predictions',
    icon: '📈',
    category: 'trading',
    requirement: { type: 'total_wins', value: 50 },
    reward: { nwg: 200, badge: 'market-master' },
    rarity: 'epic',
  },

  // Holding Achievements
  {
    id: 'diamond-hands-7',
    name: 'Paper Hands? Never!',
    description: 'Hold NWG for 7 days straight',
    icon: '💎',
    category: 'holding',
    requirement: { type: 'hold_days', value: 7 },
    reward: { nwg: 25, badge: 'paper-never' },
    rarity: 'common',
  },
  {
    id: 'diamond-hands-30',
    name: 'Diamond Hands',
    description: 'Hold NWG for 30 days straight',
    icon: '💎',
    category: 'holding',
    requirement: { type: 'hold_days', value: 30 },
    reward: { nwg: 100, badge: 'diamond-hands' },
    rarity: 'rare',
  },
  {
    id: 'diamond-hands-365',
    name: 'True Believer',
    description: 'Hold NWG for 1 year',
    icon: '🙏',
    category: 'holding',
    requirement: { type: 'hold_days', value: 365 },
    reward: { nwg: 1000, badge: 'true-believer' },
    rarity: 'mythic',
  },

  // Whale Achievements
  {
    id: 'whale-100',
    name: 'Baby Whale',
    description: 'Own 100+ NWG',
    icon: '🐋',
    category: 'whale',
    requirement: { type: 'balance', value: 100 },
    reward: { badge: 'baby-whale' },
    rarity: 'common',
  },
  {
    id: 'whale-10000',
    name: 'Whale',
    description: 'Own 10,000+ NWG',
    icon: '🐳',
    category: 'whale',
    requirement: { type: 'balance', value: 10000 },
    reward: { nwg: 100, badge: 'whale' },
    rarity: 'epic',
  },
  {
    id: 'whale-1000000',
    name: 'Mega Whale',
    description: 'Own 1,000,000+ NWG',
    icon: '🌊',
    category: 'whale',
    requirement: { type: 'balance', value: 1000000 },
    reward: { nwg: 10000, badge: 'mega-whale' },
    rarity: 'mythic',
  },

  // Explorer Achievements
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Login for 7 consecutive days',
    icon: '🐦',
    category: 'explorer',
    requirement: { type: 'login_streak', value: 7 },
    reward: { nwg: 50, badge: 'early-bird' },
    rarity: 'rare',
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Make a prediction between 2-4 AM',
    icon: '🦉',
    category: 'explorer',
    requirement: { type: 'night_prediction', value: 1 },
    reward: { nwg: 25, badge: 'night-owl' },
    rarity: 'rare',
  },
  {
    id: 'explorer-all-pages',
    name: 'Explorer',
    description: 'Visit every page in NWG',
    icon: '🧭',
    category: 'explorer',
    requirement: { type: 'pages_visited', value: 20 },
    reward: { nwg: 30, badge: 'explorer' },
    rarity: 'common',
  },

  // Social Achievements
  {
    id: 'social-share',
    name: 'Influencer',
    description: 'Share your portfolio 5 times',
    icon: '📱',
    category: 'social',
    requirement: { type: 'shares', value: 5 },
    reward: { nwg: 25, badge: 'influencer' },
    rarity: 'common',
  },
  {
    id: 'top-10',
    name: 'Elite Trader',
    description: 'Reach top 10 on the leaderboard',
    icon: '🏆',
    category: 'social',
    requirement: { type: 'leaderboard_rank', value: 10 },
    reward: { nwg: 500, badge: 'elite-trader' },
    rarity: 'legendary',
  },
]
