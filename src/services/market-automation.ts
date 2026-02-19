import type { AssetPrice, HistoryPoint, MarketData, PriceAlert } from './market-automation-types'
import { CACHE_KEYS, CACHE_TTL, NWG_BASE_MULTIPLIER, NWG_TOTAL_SUPPLY, NWG_WEIGHTS } from './market-automation-types'
export type { AssetPrice, MarketData, PriceAlert, HistoryPoint }
export { NWG_WEIGHTS, NWG_TOTAL_SUPPLY, NWG_BASE_MULTIPLIER, CACHE_KEYS, CACHE_TTL }

export function getMarketStatus(): { status: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS'; nextChange: number } {
  const now = new Date()
  const hour = now.getUTCHours()
  const minute = now.getUTCMinutes()
  const dayOfWeek = now.getUTCDay()
  const utcTime = hour + minute / 60

  // NYSE hours in UTC (EST + 5)
  // Pre-market: 4:00-9:30 AM EST = 9:00-14:30 UTC
  // Market: 9:30 AM - 4:00 PM EST = 14:30-21:00 UTC
  // After-hours: 4:00-8:00 PM EST = 21:00-01:00 UTC

  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

  if (!isWeekday) {
    // Calculate next Monday 9:00 UTC
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    return { status: 'CLOSED', nextChange: daysUntilMonday * 24 * 60 * 60 * 1000 }
  }

  let status: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS'
  let nextChange: number

  if (utcTime >= 9 && utcTime < 14.5) {
    status = 'PRE_MARKET'
    nextChange = (14.5 - utcTime) * 60 * 60 * 1000
  } else if (utcTime >= 14.5 && utcTime < 21) {
    status = 'OPEN'
    nextChange = (21 - utcTime) * 60 * 60 * 1000
  } else if (utcTime >= 21 && utcTime < 25) {
    status = 'AFTER_HOURS'
    nextChange = (25 - utcTime) * 60 * 60 * 1000
  } else {
    status = 'CLOSED'
    nextChange = (9 - utcTime + (utcTime > 1 ? 0 : 24)) * 60 * 60 * 1000
  }

  return { status, nextChange }
}

// PRICE FETCHERS

async function fetchCoinbasePrices(): Promise<{ btc?: number; paxg?: number }> {
  try {
    const response = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD')
    if (!response.ok) return {}

    const data: any = await response.json()
    const rates = data?.data?.rates || {}

    return {
      btc: rates.BTC ? Math.round(1 / parseFloat(rates.BTC)) : undefined,
      paxg: rates.PAXG ? Math.round((1 / parseFloat(rates.PAXG)) * 100) / 100 : undefined,
    }
  } catch {
    return {}
  }
}

async function fetchCoinGeckoBTC(): Promise<{ price?: number; change?: number }> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
    )
    if (!response.ok) return {}

    const data: any = await response.json()
    const btc = data?.bitcoin

    return {
      price: btc?.usd ? Math.round(btc.usd) : undefined,
      change: btc?.usd_24h_change ? Math.round(btc.usd_24h_change * 100) / 100 : undefined,
    }
  } catch {
    return {}
  }
}

// STOCK SIMULATION

function simulateStockPrice(basePrice: number, baseChange: number, volatility: number): AssetPrice {
  const price = Math.round((basePrice + (Math.random() - 0.5) * basePrice * volatility * 10) * 100) / 100
  const change = Math.round((baseChange + (Math.random() - 0.5) * 2) * 100) / 100

  return {
    price,
    change,
    high24h: Math.round(price * 1.02 * 100) / 100,
    low24h: Math.round(price * 0.98 * 100) / 100,
    lastUpdate: Date.now(),
    source: 'simulated',
  }
}

// MAIN MARKET DATA FETCHER

export async function fetchMarketData(cache?: KVNamespace): Promise<MarketData> {
  const now = Date.now()

  // Check cache first (if KV available)
  if (cache) {
    try {
      const cached = await cache.get(CACHE_KEYS.PRICES)
      if (cached) {
        const data = JSON.parse(cached) as MarketData
        // Use cache if less than 30 seconds old
        if (now - data.timestamp < CACHE_TTL.PRICES * 1000) {
          return data
        }
      }
    } catch {
      // Cache miss or error, continue to fetch fresh
    }
  }

  // Fetch from all sources in parallel
  const [coinbase, coinGecko] = await Promise.all([fetchCoinbasePrices(), fetchCoinGeckoBTC()])

  const { status: marketStatus } = getMarketStatus()
  const isMarketHours = marketStatus === 'OPEN'
  const stockVolatility = isMarketHours ? 0.002 : 0.0005

  // Build asset prices
  const sources: Record<string, string> = {}
  const assets: Record<string, AssetPrice> = {}

  // BTC - Primary: Coinbase, Fallback: CoinGecko
  const btcPrice = coinbase.btc || coinGecko.price || 78500
  const btcChange = coinGecko.change ?? 2.5
  sources.btc = coinbase.btc ? 'Coinbase' : coinGecko.price ? 'CoinGecko' : 'fallback'

  assets.btc = {
    price: btcPrice,
    change: btcChange,
    high24h: Math.round(btcPrice * (1 + Math.abs(btcChange) / 100)),
    low24h: Math.round(btcPrice * (1 - Math.abs(btcChange) / 100)),
    lastUpdate: now,
    source: sources.btc,
  }

  // Gold - Coinbase PAXG (1:1 with gold oz)
  const goldPrice = coinbase.paxg || 2875
  sources.gold = coinbase.paxg ? 'Coinbase (PAXG)' : 'fallback'

  assets.gold = {
    price: goldPrice,
    change: 0.65,
    high24h: Math.round(goldPrice * 1.01 * 100) / 100,
    low24h: Math.round(goldPrice * 0.99 * 100) / 100,
    lastUpdate: now,
    source: sources.gold,
  }

  // Silver - Calculated from Gold (historical ratio ~85:1)
  const silverPrice = Math.round((goldPrice / 85) * 100) / 100
  sources.silver = 'Calculated (Gold÷85)'

  assets.silver = {
    price: silverPrice,
    change: assets.gold.change * 1.2, // Silver more volatile
    high24h: Math.round(silverPrice * 1.015 * 100) / 100,
    low24h: Math.round(silverPrice * 0.985 * 100) / 100,
    lastUpdate: now,
    source: sources.silver,
  }

  // Stocks - Simulated with market-hours awareness
  assets.pltr = simulateStockPrice(78.5, 1.25, stockVolatility)
  sources.pltr = 'simulated'

  assets.avgo = simulateStockPrice(225.3, 0.95, stockVolatility)
  sources.avgo = 'simulated'

  // Calculate NWG price
  let nwgPrice = 0
  let weightedChange = 0

  for (const [asset, weight] of Object.entries(NWG_WEIGHTS)) {
    nwgPrice += assets[asset].price * weight
    weightedChange += assets[asset].change * weight
  }

  nwgPrice *= NWG_BASE_MULTIPLIER
  weightedChange = Math.round(weightedChange * 100) / 100

  const realSourceCount = Object.values(sources).filter(
    (s) => !s.includes('fallback') && !s.includes('simulated'),
  ).length

  const marketData: MarketData = {
    timestamp: now,
    assets,
    nwg: {
      price: nwgPrice,
      change24h: weightedChange,
      high24h: nwgPrice * (1 + Math.abs(weightedChange) / 100),
      low24h: nwgPrice * (1 - Math.abs(weightedChange) / 100),
      marketCap: Math.round(nwgPrice * NWG_TOTAL_SUPPLY),
      totalSupply: NWG_TOTAL_SUPPLY,
    },
    marketStatus,
    realSourceCount,
    sources,
  }

  // Update cache (if KV available)
  if (cache) {
    try {
      await cache.put(CACHE_KEYS.PRICES, JSON.stringify(marketData), {
        expirationTtl: CACHE_TTL.PRICES,
      })
    } catch {
      // Cache write failed, continue
    }
  }

  return marketData
}

// PRICE HISTORY MANAGEMENT

export async function storePricePoint(cache: KVNamespace, data: MarketData): Promise<void> {
  const timeframe = '1h'
  const key = `${CACHE_KEYS.HISTORY_PREFIX}${timeframe}`

  try {
    // Get existing history
    const existing = await cache.get(key)
    let history: HistoryPoint[] = existing ? JSON.parse(existing) : []

    // Add new point
    history.push({
      timestamp: data.timestamp,
      price: data.nwg.price,
      assets: Object.fromEntries(Object.entries(data.assets).map(([k, v]) => [k, v.price])),
    })

    // Keep last 720 points (1 hour = 720 points at 5-second intervals)
    if (history.length > 720) {
      history = history.slice(-720)
    }

    await cache.put(key, JSON.stringify(history), {
      expirationTtl: CACHE_TTL.HISTORY,
    })
  } catch (e) {
    console.error('Failed to store price point:', e)
  }
}

export async function getPriceHistory(
  cache: KVNamespace,
  timeframe: '1h' | '24h' | '7d' | '1m',
): Promise<HistoryPoint[]> {
  const key = `${CACHE_KEYS.HISTORY_PREFIX}${timeframe}`

  try {
    const data = await cache.get(key)
    if (data) {
      return JSON.parse(data)
    }
  } catch {
    // Fallback to generated history
  }

  // Generate simulated history if not cached
  return generateSimulatedHistory(timeframe)
}

function generateSimulatedHistory(timeframe: '1h' | '24h' | '7d' | '1m'): HistoryPoint[] {
  const config = {
    '1h': { duration: 60, interval: 1 },
    '24h': { duration: 24 * 60, interval: 5 },
    '7d': { duration: 7 * 24 * 60, interval: 60 },
    '1m': { duration: 30 * 24 * 60, interval: 240 },
  }

  const { duration, interval } = config[timeframe]
  const points: HistoryPoint[] = []
  const now = Date.now()
  let price = 0.01 * 0.95

  for (let i = duration; i >= 0; i -= interval) {
    const timestamp = now - i * 60 * 1000
    const change = (Math.random() - 0.45) * 0.0002
    price = Math.max(0.005, price * (1 + change))
    points.push({ timestamp, price })
  }

  return points
}

// ALERTS SYSTEM

export async function checkAlerts(cache: KVNamespace, data: MarketData): Promise<PriceAlert[]> {
  try {
    const alertsJson = await cache.get(CACHE_KEYS.ALERTS)
    if (!alertsJson) return []

    const alerts: PriceAlert[] = JSON.parse(alertsJson)
    const triggered: PriceAlert[] = []

    for (const alert of alerts) {
      if (alert.triggered) continue

      const assetPrice = alert.asset === 'nwg' ? data.nwg.price : data.assets[alert.asset]?.price

      if (!assetPrice) continue

      let shouldTrigger = false

      switch (alert.condition) {
        case 'above':
          shouldTrigger = assetPrice > alert.threshold
          break
        case 'below':
          shouldTrigger = assetPrice < alert.threshold
          break
        case 'change_pct': {
          const change = alert.asset === 'nwg' ? data.nwg.change24h : data.assets[alert.asset]?.change || 0
          shouldTrigger = Math.abs(change) > alert.threshold
          break
        }
      }

      if (shouldTrigger) {
        alert.triggered = true
        alert.triggeredAt = Date.now()
        triggered.push(alert)
      }
    }

    // Update alerts in cache
    if (triggered.length > 0) {
      await cache.put(CACHE_KEYS.ALERTS, JSON.stringify(alerts))
    }

    return triggered
  } catch {
    return []
  }
}

export async function createAlert(
  cache: KVNamespace,
  alert: Omit<PriceAlert, 'id' | 'triggered' | 'createdAt'>,
): Promise<PriceAlert> {
  const newAlert: PriceAlert = {
    ...alert,
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    triggered: false,
    createdAt: Date.now(),
  }

  try {
    const existing = await cache.get(CACHE_KEYS.ALERTS)
    const alerts: PriceAlert[] = existing ? JSON.parse(existing) : []
    alerts.push(newAlert)
    await cache.put(CACHE_KEYS.ALERTS, JSON.stringify(alerts))
  } catch {
    // Failed to save alert
  }

  return newAlert
}

// DAILY STATISTICS

export async function storeDailyStats(cache: KVNamespace, data: MarketData): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const key = `${CACHE_KEYS.DAILY_STATS}${today}`

  try {
    const existing = await cache.get(key)

    if (!existing) {
      // First entry of the day - store opening prices
      await cache.put(
        key,
        JSON.stringify({
          date: today,
          open: data.nwg.price,
          high: data.nwg.price,
          low: data.nwg.price,
          close: data.nwg.price,
          assets: Object.fromEntries(
            Object.entries(data.assets).map(([k, v]) => [
              k,
              {
                open: v.price,
                high: v.price,
                low: v.price,
                close: v.price,
              },
            ]),
          ),
          updates: 1,
        }),
        { expirationTtl: CACHE_TTL.DAILY_STATS },
      )
    } else {
      // Update existing stats
      const stats = JSON.parse(existing)
      stats.high = Math.max(stats.high, data.nwg.price)
      stats.low = Math.min(stats.low, data.nwg.price)
      stats.close = data.nwg.price
      stats.updates++

      // Update asset stats
      for (const [asset, assetData] of Object.entries(data.assets)) {
        if (stats.assets[asset]) {
          stats.assets[asset].high = Math.max(stats.assets[asset].high, assetData.price)
          stats.assets[asset].low = Math.min(stats.assets[asset].low, assetData.price)
          stats.assets[asset].close = assetData.price
        }
      }

      await cache.put(key, JSON.stringify(stats), { expirationTtl: CACHE_TTL.DAILY_STATS })
    }
  } catch (e) {
    console.error('Failed to store daily stats:', e)
  }
}

// PORTFOLIO CALCULATOR

export interface PortfolioValue {
  totalValue: number
  nwgAmount: number
  breakdown: Record<string, { amount: number; value: number; pct: number }>
  gainLoss: number
  gainLossPct: number
}

export function calculatePortfolioValue(
  nwgAmount: number,
  data: MarketData,
  purchasePrice: number = 0.01,
): PortfolioValue {
  const totalValue = nwgAmount * data.nwg.price
  const costBasis = nwgAmount * purchasePrice
  const gainLoss = totalValue - costBasis
  const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

  // Calculate breakdown by underlying asset
  const breakdown: Record<string, { amount: number; value: number; pct: number }> = {}

  for (const [asset, weight] of Object.entries(NWG_WEIGHTS)) {
    const assetValue = totalValue * weight
    const assetPrice = data.assets[asset].price

    breakdown[asset] = {
      amount: assetValue / assetPrice,
      value: assetValue,
      pct: weight * 100,
    }
  }

  return {
    totalValue,
    nwgAmount,
    breakdown,
    gainLoss,
    gainLossPct: Math.round(gainLossPct * 100) / 100,
  }
}
