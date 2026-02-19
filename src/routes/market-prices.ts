import { Hono } from 'hono'
import {
  calculatePortfolioValue,
  checkAlerts,
  createAlert,
  fetchMarketData,
  getMarketStatus,
  getPriceHistory,
  NWG_BASE_MULTIPLIER,
  NWG_TOTAL_SUPPLY,
  NWG_WEIGHTS,
  storeDailyStats,
  storePricePoint,
} from '../services/market-automation'

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

// LIVE MARKET PRICES API v2 - Automated NWG Portfolio System
//
// Features:
// - Multi-source price aggregation (Coinbase, CoinGecko)
// - KV-based caching for instant responses
// - Automatic price history storage
// - Portfolio value calculations
// - Market status awareness (NYSE hours)
// - Alert triggers for significant price movements
//
// NWG Formula: Silver(25%) + Gold(20%) + BTC(20%) + PLTR(20%) + AVGO(15%)

// GET /api/market-prices - Get live prices with KV caching
router.get('/market-prices', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    const data = await fetchMarketData(cache)

    // Auto-store price history (non-blocking)
    if (cache) {
      storePricePoint(cache, data).catch(() => {})
      storeDailyStats(cache, data).catch(() => {})
    }

    c.header('Cache-Control', 'public, max-age=5, stale-while-revalidate=15')

    return c.json({
      success: true,
      timestamp: data.timestamp,
      live: data.realSourceCount > 0,
      realSourceCount: data.realSourceCount,
      marketStatus: data.marketStatus,
      nwg: {
        ...data.nwg,
        formula: 'NWG = (Silver × 25%) + (Gold × 20%) + (BTC × 20%) + (PLTR × 20%) + (AVGO × 15%)',
      },
      assets: data.assets,
      weights: NWG_WEIGHTS,
      sources: data.sources,
    })
  } catch (e) {
    console.error('Market prices error:', e)
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/market-prices/history - Get historical price data with KV storage
router.get('/market-prices/history', async (c) => {
  try {
    const timeframe = (c.req.query('timeframe') || '7d') as '1h' | '24h' | '7d' | '1m'
    const cache = c.env?.MARKET_CACHE

    let points: any
    if (cache) {
      points = await getPriceHistory(cache, timeframe)
    } else {
      // Fallback to generated history
      const config = {
        '1h': { duration: 60, interval: 1 },
        '24h': { duration: 24 * 60, interval: 5 },
        '7d': { duration: 7 * 24 * 60, interval: 60 },
        '1m': { duration: 30 * 24 * 60, interval: 240 },
      }

      const { duration, interval } = config[timeframe] || config['7d']
      points = []
      const now = Date.now()
      let price = 0.01 * 0.95

      for (let i = duration; i >= 0; i -= interval) {
        const timestamp = now - i * 60 * 1000
        const change = (Math.random() - 0.45) * 0.0002
        price = Math.max(0.005, price * (1 + change))
        points.push({ timestamp, price })
      }
    }

    c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')

    return c.json({
      success: true,
      timeframe,
      points,
      count: points.length,
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/market-status - Get detailed market status info
router.get('/market-status', (c) => {
  const { status, nextChange } = getMarketStatus()

  return c.json({
    success: true,
    status,
    isOpen: status === 'OPEN',
    isPreMarket: status === 'PRE_MARKET',
    isAfterHours: status === 'AFTER_HOURS',
    nextChange: {
      ms: nextChange,
      minutes: Math.round(nextChange / 60000),
      hours: Math.round((nextChange / 3600000) * 10) / 10,
    },
    schedule: {
      preMarket: '9:00-14:30 UTC (4:00-9:30 AM EST)',
      market: '14:30-21:00 UTC (9:30 AM-4:00 PM EST)',
      afterHours: '21:00-01:00 UTC (4:00-8:00 PM EST)',
      timezone: 'Prices follow NYSE trading hours',
    },
  })
})

// POST /api/portfolio/calculate - Calculate portfolio value
router.post('/portfolio/calculate', async (c) => {
  try {
    const body = await c.req.json()
    const { nwgAmount, purchasePrice = 0.01 } = body

    if (!nwgAmount || nwgAmount <= 0) {
      return c.json({ success: false, error: 'Invalid NWG amount' }, 400)
    }

    const cache = c.env?.MARKET_CACHE
    const marketData = await fetchMarketData(cache)
    const portfolio = calculatePortfolioValue(nwgAmount, marketData, purchasePrice)

    return c.json({
      success: true,
      portfolio,
      marketData: {
        nwgPrice: marketData.nwg.price,
        change24h: marketData.nwg.change24h,
        marketStatus: marketData.marketStatus,
      },
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/portfolio/simulate - Simulate investment returns
router.get('/portfolio/simulate', async (c) => {
  try {
    const usdAmount = parseFloat(c.req.query('usd') || '100')
    const period = c.req.query('period') || '1y' // 1m, 3m, 6m, 1y, 5y

    const cache = c.env?.MARKET_CACHE
    const marketData = await fetchMarketData(cache)
    const nwgAmount = usdAmount / marketData.nwg.price

    // Historical performance projections based on asset mix
    const returns: Record<string, { low: number; mid: number; high: number }> = {
      '1m': { low: -5, mid: 3, high: 12 },
      '3m': { low: -10, mid: 8, high: 25 },
      '6m': { low: -15, mid: 15, high: 45 },
      '1y': { low: -20, mid: 35, high: 100 },
      '5y': { low: 20, mid: 150, high: 500 },
    }

    const projections = returns[period] || returns['1y']

    return c.json({
      success: true,
      investment: {
        usd: usdAmount,
        nwg: Math.round(nwgAmount),
        currentPrice: marketData.nwg.price,
      },
      projections: {
        period,
        conservative: {
          return: projections.low,
          value: usdAmount * (1 + projections.low / 100),
        },
        moderate: {
          return: projections.mid,
          value: usdAmount * (1 + projections.mid / 100),
        },
        optimistic: {
          return: projections.high,
          value: usdAmount * (1 + projections.high / 100),
        },
      },
      disclaimer:
        'Past performance does not guarantee future results. These are hypothetical projections based on historical asset performance.',
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/alerts/create - Create price alert
router.post('/alerts/create', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    if (!cache) {
      return c.json({ success: false, error: 'Alerts require KV storage' }, 400)
    }

    const body = await c.req.json()
    const { asset, condition, threshold } = body

    if (!asset || !condition || threshold === undefined) {
      return c.json({ success: false, error: 'Missing required fields: asset, condition, threshold' }, 400)
    }

    const validAssets = ['nwg', 'btc', 'gold', 'silver', 'pltr', 'avgo']
    const validConditions = ['above', 'below', 'change_pct']

    if (!validAssets.includes(asset)) {
      return c.json({ success: false, error: `Invalid asset. Valid: ${validAssets.join(', ')}` }, 400)
    }

    if (!validConditions.includes(condition)) {
      return c.json({ success: false, error: `Invalid condition. Valid: ${validConditions.join(', ')}` }, 400)
    }

    const alert = await createAlert(cache, { asset, condition, threshold })

    return c.json({
      success: true,
      alert,
      message: `Alert created: ${asset.toUpperCase()} ${condition} ${threshold}`,
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/alerts/check - Check for triggered alerts
router.get('/alerts/check', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    if (!cache) {
      return c.json({ success: false, error: 'Alerts require KV storage' }, 400)
    }

    const marketData = await fetchMarketData(cache)
    const triggered = await checkAlerts(cache, marketData)

    return c.json({
      success: true,
      triggered,
      count: triggered.length,
      currentPrices: {
        nwg: marketData.nwg.price,
        btc: marketData.assets.btc.price,
        gold: marketData.assets.gold.price,
        silver: marketData.assets.silver.price,
        pltr: marketData.assets.pltr.price,
        avgo: marketData.assets.avgo.price,
      },
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/nwg/formula - Get detailed NWG formula breakdown
router.get('/nwg/formula', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    const data = await fetchMarketData(cache)

    // Calculate each component's contribution
    const breakdown = Object.entries(NWG_WEIGHTS).map(([asset, weight]) => {
      const price = data.assets[asset].price
      const contribution = price * weight * NWG_BASE_MULTIPLIER
      return {
        asset: asset.toUpperCase(),
        weight: `${weight * 100}%`,
        price,
        contribution,
        pctOfTotal: `${((contribution / data.nwg.price) * 100).toFixed(2)}%`,
      }
    })

    return c.json({
      success: true,
      formula: {
        expression: 'NWG = (Silver × 25%) + (Gold × 20%) + (BTC × 20%) + (PLTR × 20%) + (AVGO × 15%)',
        multiplier: NWG_BASE_MULTIPLIER,
        totalSupply: NWG_TOTAL_SUPPLY,
        calculation: `(${breakdown.map((b) => `${b.asset}×${b.weight}`).join(' + ')}) × ${NWG_BASE_MULTIPLIER}`,
      },
      breakdown,
      result: {
        nwgPrice: data.nwg.price,
        marketCap: data.nwg.marketCap,
        change24h: data.nwg.change24h,
      },
      philosophy: {
        silver: '25% - Industrial & monetary metal, inflation hedge',
        gold: '20% - Ultimate safe haven, central bank reserves',
        btc: '20% - Digital gold, institutional adoption growing',
        pltr: '20% - AI/defense leader, government contracts',
        avgo: '15% - Semiconductor powerhouse, AI infrastructure',
      },
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/nwg/pitch - Get the NWG investment pitch
router.get('/nwg/pitch', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE
    const data = await fetchMarketData(cache)

    return c.json({
      success: true,
      headline: 'One Currency. Five Explosive Assets. Zero Guesswork.',
      tagline: 'NWG: The Ultimate Portfolio in a Single Token',

      keyPoints: [
        '🪙 Fixed Supply: 1,000,000,000 NWG - Never minted again',
        '💰 $1 = 100 NWG - Simple, transparent pricing',
        '📈 5-Asset Backing: Silver, Gold, BTC, Palantir, Broadcom',
        '🤖 AI + Crypto + Precious Metals in one investment',
        '🌍 Real-time price tracking via Coinbase & CoinGecko',
      ],

      assets: {
        silver: { weight: '25%', theme: 'Industrial Revolution + Inflation Hedge', highlight: '+146% in 2025' },
        gold: { weight: '20%', theme: 'Central Bank Demand + Safe Haven', highlight: '+64% in 2025' },
        btc: { weight: '20%', theme: 'Institutional Adoption + Digital Gold', highlight: 'ATH $126K' },
        pltr: { weight: '20%', theme: 'AI Enterprise + Government Contracts', highlight: '+150% in 2025' },
        avgo: { weight: '15%', theme: 'AI Infrastructure + Semiconductor', highlight: '+49% in 2025' },
      },

      currentPrice: data.nwg.price,
      marketCap: data.nwg.marketCap,

      callToAction: 'Own the future. Start with NWG today.',

      disclaimer: 'NWG is a conceptual portfolio token. Past asset performance does not guarantee future results.',
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})
export default router
