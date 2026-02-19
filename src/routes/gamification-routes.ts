import { Hono } from 'hono'
import {
  ACHIEVEMENTS,
  calculateFearGreed,
  chatWithAnalyst,
  createPrediction,
  GAME_CACHE_KEYS,
  generateDailyQuests,
  generateMarketAnalysis,
  generatePortfolioCard,
  generateWeeklyQuests,
  generateWhaleAlerts,
  getLeaderboard,
  resolvePredictions,
} from '../services/gamification'
import { fetchMarketData } from '../services/market-automation'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

// Route helpers - reduce repetitive error handling patterns
function _jsonError(c: any, msg: string, status = 400) {
  return c.json({ success: false, error: msg }, status)
}

function _jsonSuccess(c: any, data: any) {
  return c.json({ success: true, ...data })
}

function _parseIntParam(val: string | undefined, fallback: number): number {
  const n = parseInt(val || '', 10)
  return Number.isNaN(n) ? fallback : n
}

function _requireFields(body: any, fields: string[]): string | null {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') return f
  }
  return null
}

function _safeString(val: any, maxLen = 200): string {
  return String(val || '')
    .trim()
    .slice(0, maxLen)
}

const router = new Hono<{ Bindings: Bindings }>()

// 🎮 GAMIFICATION SYSTEM - Fun & Interactive Features
//
// Features:
// - Price Prediction Game (bet on direction)
// - Achievements & Badges
// - Daily/Weekly Quests
// - Leaderboards
// - Fear & Greed Index
// - Whale Tracker
// - AI Market Analyst
// - Portfolio Cards (shareable)

// GET /api/game/prediction/pool - Get current prediction pool
router.get('/prediction/pool', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    const marketData = await fetchMarketData(cache)

    // Get pool data
    let pool = { up: 0, down: 0, total: 0 }
    if (cache) {
      const poolData = await cache.get(GAME_CACHE_KEYS.PREDICTION_POOL)
      if (poolData) pool = JSON.parse(poolData)
    }

    return c.json({
      success: true,
      currentPrice: marketData.nwg.price,
      change24h: marketData.nwg.change24h,
      pool: {
        bullish: pool.up,
        bearish: pool.down,
        total: pool.total,
        bullishPct: pool.total > 0 ? Math.round((pool.up / pool.total) * 100) : 50,
        bearishPct: pool.total > 0 ? Math.round((pool.down / pool.total) * 100) : 50,
      },
      odds: {
        up: pool.down > 0 ? (1 + pool.down / (pool.up || 1)).toFixed(2) : '1.90',
        down: pool.up > 0 ? (1 + pool.up / (pool.down || 1)).toFixed(2) : '1.90',
      },
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/game/prediction/create - Create a prediction
router.post('/prediction/create', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    if (!cache) {
      return c.json({ success: false, error: 'KV storage required' }, 400)
    }

    const body = await c.req.json()
    const { odenom, direction, amount, timeframe } = body

    if (!odenom || !direction || !amount || !timeframe) {
      return c.json(
        {
          success: false,
          error: 'Missing fields: odenom, direction (up/down), amount, timeframe (1h/24h/7d)',
        },
        400,
      )
    }

    if (!['up', 'down'].includes(direction)) {
      return c.json({ success: false, error: 'Direction must be "up" or "down"' }, 400)
    }

    if (!['1h', '24h', '7d'].includes(timeframe)) {
      return c.json({ success: false, error: 'Timeframe must be "1h", "24h", or "7d"' }, 400)
    }

    const marketData = await fetchMarketData(cache)
    const prediction = await createPrediction(cache, odenom, direction, amount, timeframe, marketData.nwg.price)

    return c.json({
      success: true,
      prediction,
      message: `Prediction created: NWG will go ${direction.toUpperCase()} in ${timeframe}`,
      potentialPayout: amount * 1.9,
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/game/prediction/resolve - Resolve expired predictions
router.post('/prediction/resolve', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    if (!cache) {
      return c.json({ success: false, error: 'KV storage required' }, 400)
    }

    const marketData = await fetchMarketData(cache)
    const result = await resolvePredictions(cache, marketData.nwg.price)

    return c.json({
      success: true,
      resolved: result.resolved,
      winners: result.winners.length,
      currentPrice: marketData.nwg.price,
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/game/leaderboard - Get prediction leaderboard
router.get('/leaderboard', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    if (!cache) {
      // Return mock data
      return c.json({
        success: true,
        leaderboard: [
          { rank: 1, odenom: 'whale_001', score: 1500, wins: 45, totalBets: 60, winRate: 75, totalProfit: 2500 },
          { rank: 2, odenom: 'oracle_x', score: 1200, wins: 38, totalBets: 55, winRate: 69, totalProfit: 1800 },
          { rank: 3, odenom: 'diamond_h', score: 950, wins: 30, totalBets: 50, winRate: 60, totalProfit: 1200 },
        ],
        yourRank: null,
      })
    }

    const leaderboard = await getLeaderboard(cache)
    const odenom = c.req.query('odenom')
    let yourRank = null

    if (odenom) {
      const yourEntry = leaderboard.find((e) => e.odenom === odenom)
      yourRank = yourEntry?.rank || null
    }

    return c.json({
      success: true,
      leaderboard: leaderboard.slice(0, 50),
      total: leaderboard.length,
      yourRank,
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/game/achievements - Get all achievements
router.get('/achievements', (c) => {
  const grouped = {
    trading: ACHIEVEMENTS.filter((a) => a.category === 'trading'),
    holding: ACHIEVEMENTS.filter((a) => a.category === 'holding'),
    whale: ACHIEVEMENTS.filter((a) => a.category === 'whale'),
    explorer: ACHIEVEMENTS.filter((a) => a.category === 'explorer'),
    social: ACHIEVEMENTS.filter((a) => a.category === 'social'),
  }

  return c.json({
    success: true,
    achievements: ACHIEVEMENTS,
    grouped,
    total: ACHIEVEMENTS.length,
    byRarity: {
      common: ACHIEVEMENTS.filter((a) => a.rarity === 'common').length,
      rare: ACHIEVEMENTS.filter((a) => a.rarity === 'rare').length,
      epic: ACHIEVEMENTS.filter((a) => a.rarity === 'epic').length,
      legendary: ACHIEVEMENTS.filter((a) => a.rarity === 'legendary').length,
      mythic: ACHIEVEMENTS.filter((a) => a.rarity === 'mythic').length,
    },
  })
})

// GET /api/game/quests - Get current quests
router.get('/quests', (c) => {
  const daily = generateDailyQuests()
  const weekly = generateWeeklyQuests()

  return c.json({
    success: true,
    quests: {
      daily,
      weekly,
    },
    totalRewards: {
      nwg: [...daily, ...weekly].reduce((sum, q) => sum + (q.reward.nwg || 0), 0),
      xp: [...daily, ...weekly].reduce((sum, q) => sum + (q.reward.xp || 0), 0),
    },
  })
})

// GET /api/game/fear-greed - Get Fear & Greed Index
router.get('/fear-greed', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    const marketData = await fetchMarketData(cache)
    const fearGreed = calculateFearGreed(marketData)

    return c.json({
      success: true,
      fearGreed,
      interpretation: {
        0: 'Maximum Fear - Possible buying opportunity',
        25: 'Fear - Market is nervous',
        50: 'Neutral - Balanced sentiment',
        75: 'Greed - Market is optimistic',
        100: 'Maximum Greed - Possible correction ahead',
      },
      lastUpdate: Date.now(),
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/game/whale-tracker - Get whale alerts
router.get('/whale-tracker', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    const marketData = await fetchMarketData(cache)
    const whales = generateWhaleAlerts(marketData)

    return c.json({
      success: true,
      alerts: whales,
      count: whales.length,
      summary: {
        totalBuys: whales.filter((w) => w.type === 'buy').length,
        totalSells: whales.filter((w) => w.type === 'sell').length,
        biggestMove: whales.length > 0 ? whales.reduce((max, w) => (w.usdValue > max.usdValue ? w : max)) : null,
      },
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/game/ai-analyst - Get AI market analysis
router.get('/ai-analyst', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    const marketData = await fetchMarketData(cache)
    const fearGreed = calculateFearGreed(marketData)
    const analysis = generateMarketAnalysis(marketData, fearGreed)

    return c.json({
      success: true,
      analysis,
      marketData: {
        nwgPrice: marketData.nwg.price,
        change24h: marketData.nwg.change24h,
        marketStatus: marketData.marketStatus,
      },
      fearGreed: {
        value: fearGreed.value,
        label: fearGreed.label,
      },
      disclaimer: 'This is AI-generated analysis for entertainment. Not financial advice.',
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/game/ai-chat - Chat with AI analyst
router.post('/ai-chat', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    const body = await c.req.json()
    const { question } = body

    if (!question) {
      return c.json({ success: false, error: 'Question required' }, 400)
    }

    const marketData = await fetchMarketData(cache)
    const fearGreed = calculateFearGreed(marketData)
    const response = chatWithAnalyst(question, marketData, fearGreed)

    return c.json({
      success: true,
      response,
      timestamp: Date.now(),
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/game/portfolio-card - Generate shareable portfolio card
router.post('/portfolio-card', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    const body = await c.req.json()
    const { odenom, balance, achievements = [] } = body

    if (!odenom || balance === undefined) {
      return c.json({ success: false, error: 'Missing odenom or balance' }, 400)
    }

    const marketData = await fetchMarketData(cache)
    const card = generatePortfolioCard(odenom, balance, marketData.nwg.price, marketData.nwg.change24h, achievements)

    return c.json({
      success: true,
      card,
      shareText: `🎮 My NWG Portfolio Card\n💰 ${balance.toLocaleString()} NWG ($${card.value.toFixed(2)})\n🏆 Rank: ${card.rank}\n💎 Rarity: ${card.rarity.toUpperCase()}\n\n#NWG #Crypto #Portfolio`,
      embedData: {
        title: `${card.rank} - ${card.odenom}`,
        description: `${balance.toLocaleString()} NWG worth $${card.value.toFixed(2)}`,
        color:
          card.rarity === 'diamond'
            ? '#00d4ff'
            : card.rarity === 'platinum'
              ? '#e5e4e2'
              : card.rarity === 'gold'
                ? '#ffd700'
                : card.rarity === 'silver'
                  ? '#c0c0c0'
                  : '#cd7f32',
      },
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/game/dashboard - Get complete game dashboard
router.get('/dashboard', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    const marketData = await fetchMarketData(cache)
    const fearGreed = calculateFearGreed(marketData)
    const analysis = generateMarketAnalysis(marketData, fearGreed)
    const whales = generateWhaleAlerts(marketData)
    const leaderboard = cache ? await getLeaderboard(cache) : []
    const quests = {
      daily: generateDailyQuests(),
      weekly: generateWeeklyQuests(),
    }

    // Get pool data
    let pool = { up: 0, down: 0, total: 0 }
    if (cache) {
      const poolData = await cache.get(GAME_CACHE_KEYS.PREDICTION_POOL)
      if (poolData) pool = JSON.parse(poolData)
    }

    return c.json({
      success: true,
      timestamp: Date.now(),

      market: {
        nwgPrice: marketData.nwg.price,
        change24h: marketData.nwg.change24h,
        marketCap: marketData.nwg.marketCap,
        status: marketData.marketStatus,
      },

      fearGreed: {
        value: fearGreed.value,
        label: fearGreed.label,
        factors: fearGreed.factors,
      },

      aiAnalysis: {
        sentiment: analysis.sentiment,
        summary: analysis.summary,
        recommendation: analysis.recommendation,
        confidence: analysis.confidence,
        topMover: analysis.topMover,
      },

      predictionGame: {
        pool,
        bullishPct: pool.total > 0 ? Math.round((pool.up / pool.total) * 100) : 50,
        bearishPct: pool.total > 0 ? Math.round((pool.down / pool.total) * 100) : 50,
      },

      leaderboard: leaderboard.slice(0, 10),

      whaleAlerts: whales.slice(0, 5),

      quests: {
        dailyCount: quests.daily.length,
        weeklyCount: quests.weekly.length,
        totalNWGReward: [...quests.daily, ...quests.weekly].reduce((sum, q) => sum + (q.reward.nwg || 0), 0),
      },

      achievements: {
        total: ACHIEVEMENTS.length,
        categories: ['trading', 'holding', 'whale', 'explorer', 'social'],
      },
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// ⚔️ PVP MATCHMAKING API - Real Player vs Player Battles

// Mount the PvP matchmaking router
export default router
