import { Hono } from 'hono'
import type { Bindings } from '../types'
import {
  type Auction,
  type AuctionBid,
  addNotification,
  auctions,
  DURATION_MS,
  generateAuctionId,
  getMinIncrement,
  LISTING_FEE_PCT,
  notifications,
  priceHistory,
  SNIPE_EXTENSION_MS,
  SNIPE_PROTECTION_MS,
  traderStats,
  updateTraderStats,
} from './auction-data'

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

// GET /api/auction/listings - Get active auctions with filters
router.get('/listings', (c) => {
  const rarity = c.req.query('rarity')
  const sort = c.req.query('sort') || 'ending-soon' // ending-soon, price-low, price-high, newest, most-bids
  const category = c.req.query('category')
  const search = c.req.query('q')
  const limit = parseInt(c.req.query('limit') || '20', 10)
  const offset = parseInt(c.req.query('offset') || '0', 10)

  const now = Date.now()
  let items = Array.from(auctions.values()).filter((a) => {
    if (a.status !== 'active') return false
    if (a.endTime < now) {
      // Auto-expire
      a.status = 'expired'
      return false
    }
    return true
  })

  // Filters
  if (rarity) items = items.filter((a) => a.card.rarity === rarity)
  if (category) items = items.filter((a) => a.category === category)
  if (search) {
    const q = search.toLowerCase()
    items = items.filter((a) => a.card.name.toLowerCase().includes(q) || a.sellerName.toLowerCase().includes(q))
  }

  // Sort
  switch (sort) {
    case 'ending-soon':
      items.sort((a, b) => a.endTime - b.endTime)
      break
    case 'price-low':
      items.sort((a, b) => a.currentBid - b.currentBid)
      break
    case 'price-high':
      items.sort((a, b) => b.currentBid - a.currentBid)
      break
    case 'newest':
      items.sort((a, b) => b.startTime - a.startTime)
      break
    case 'most-bids':
      items.sort((a, b) => b.bidCount - a.bidCount)
      break
  }

  // Featured first
  items.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))

  const total = items.length
  items = items.slice(offset, offset + limit)

  return c.json({
    success: true,
    total,
    count: items.length,
    offset,
    auctions: items.map((a) => ({
      ...a,
      timeRemaining: Math.max(0, a.endTime - now),
      minNextBid: a.currentBid + getMinIncrement(a.currentBid),
      bids: undefined, // Don't leak full bid history in listing
    })),
  })
})

// POST /api/auction/create - Create new auction
router.post('/create', async (c) => {
  try {
    const body = await c.req.json()
    const { card, startPrice, buyNowPrice, duration, sellerId, sellerName, category } = body

    if (!card || !startPrice || !duration || !sellerId) {
      return c.json({ success: false, error: 'card, startPrice, duration, and sellerId are required' }, 400)
    }

    if (!DURATION_MS[duration]) {
      return c.json({ success: false, error: 'Invalid duration. Use: 1h, 6h, 24h, 72h' }, 400)
    }

    if (startPrice < 1) {
      return c.json({ success: false, error: 'Start price must be at least 1' }, 400)
    }

    const fee = Math.ceil(startPrice * (LISTING_FEE_PCT[card.rarity] || 0.03))
    const id = generateAuctionId()
    const now = Date.now()

    const newAuction: Auction = {
      id,
      sellerId,
      sellerName: sellerName || 'Anonymous',
      card,
      startPrice,
      currentBid: startPrice,
      buyNowPrice: buyNowPrice || undefined,
      bidCount: 0,
      bids: [],
      duration,
      startTime: now,
      endTime: now + DURATION_MS[duration],
      status: 'active',
      category: category || 'card',
      featured: false,
    }

    auctions.set(id, newAuction)

    // Track price in history
    const histKey = card.rarity
    const hist = priceHistory.get(histKey) || []
    hist.push({ timestamp: now, price: startPrice, rarity: card.rarity })
    if (hist.length > 500) hist.shift()
    priceHistory.set(histKey, hist)

    return c.json({
      success: true,
      auction: newAuction,
      fee,
      message: `Auction created! Your ${card.name} is now live for ${duration}.`,
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/auction/bid - Place a bid
router.post('/bid', async (c) => {
  try {
    const body = await c.req.json()
    const { auctionId, bidderId, bidderName, amount, isAutoBid } = body

    if (!auctionId || !bidderId || !amount) {
      return c.json({ success: false, error: 'auctionId, bidderId, and amount required' }, 400)
    }

    const auc = auctions.get(auctionId)
    if (!auc) return c.json({ success: false, error: 'Auction not found' }, 404)
    if (auc.status !== 'active') return c.json({ success: false, error: 'Auction is not active' }, 400)

    const now = Date.now()
    if (auc.endTime < now) {
      auc.status = 'expired'
      return c.json({ success: false, error: 'Auction has ended' }, 400)
    }

    if (auc.sellerId === bidderId) {
      return c.json({ success: false, error: 'Cannot bid on your own auction' }, 400)
    }

    const minBid = auc.currentBid + getMinIncrement(auc.currentBid)
    if (amount < minBid) {
      return c.json(
        {
          success: false,
          error: `Minimum bid is ${minBid} (current: ${auc.currentBid} + ${getMinIncrement(auc.currentBid)} increment)`,
        },
        400,
      )
    }

    // Check Buy Now
    if (auc.buyNowPrice && amount >= auc.buyNowPrice) {
      // Instant purchase!
      auc.currentBid = auc.buyNowPrice
      auc.status = 'sold'
      auc.winnerId = bidderId
      auc.winnerName = bidderName || 'Anonymous'
      auc.finalPrice = auc.buyNowPrice

      updateTraderStats(bidderId, bidderName || 'Anonymous', 'buy', auc.buyNowPrice)
      updateTraderStats(auc.sellerId, auc.sellerName, 'sell', auc.buyNowPrice)

      addNotification(auc.sellerId, {
        userId: auc.sellerId,
        type: 'sold',
        auctionId,
        message: `Your ${auc.card.name} was bought for ${auc.buyNowPrice} Gold (Buy Now)!`,
        read: false,
        timestamp: now,
      })

      return c.json({
        success: true,
        type: 'buy-now',
        message: `You bought ${auc.card.name} for ${auc.buyNowPrice} Gold!`,
        auction: auc,
      })
    }

    // Notify previous highest bidder they've been outbid
    if (auc.bids.length > 0) {
      const prevBidder = auc.bids[auc.bids.length - 1]
      if (prevBidder.bidderId !== bidderId) {
        addNotification(prevBidder.bidderId, {
          userId: prevBidder.bidderId,
          type: 'outbid',
          auctionId,
          message: `You've been outbid on ${auc.card.name}! New bid: ${amount} Gold`,
          read: false,
          timestamp: now,
        })
      }
    }

    // Place the bid
    const bid: AuctionBid = {
      id: `bid-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      auctionId,
      bidderId,
      bidderName: bidderName || 'Anonymous',
      amount,
      timestamp: now,
      isAutoBid: isAutoBid || false,
    }

    auc.bids.push(bid)
    auc.currentBid = amount
    auc.bidCount++

    // Snipe protection: extend if bid within last 2 minutes
    const timeLeft = auc.endTime - now
    if (timeLeft < SNIPE_PROTECTION_MS) {
      auc.endTime += SNIPE_EXTENSION_MS
    }

    return c.json({
      success: true,
      type: 'bid',
      message: `Bid of ${amount} Gold placed on ${auc.card.name}!`,
      timeRemaining: Math.max(0, auc.endTime - now),
      minNextBid: amount + getMinIncrement(amount),
      extended: timeLeft < SNIPE_PROTECTION_MS,
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/auction/history - Price history for charts
router.get('/history', (c) => {
  const rarity = c.req.query('rarity') || 'all'
  const timeframe = c.req.query('timeframe') || '7d'

  let allHistory: { timestamp: number; price: number; rarity: string }[] = []

  if (rarity === 'all') {
    priceHistory.forEach((hist) => {
      allHistory.push(...hist)
    })
  } else {
    allHistory = priceHistory.get(rarity) || []
  }

  // Filter by timeframe
  const now = Date.now()
  const tfMap: Record<string, number> = {
    '1d': 86400000,
    '7d': 604800000,
    '30d': 2592000000,
  }
  const cutoff = now - (tfMap[timeframe] || tfMap['7d'])
  allHistory = allHistory.filter((h) => h.timestamp > cutoff)

  // Compute aggregates
  const prices = allHistory.map((h) => h.price)
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
  const min = prices.length ? Math.min(...prices) : 0
  const max = prices.length ? Math.max(...prices) : 0

  return c.json({
    success: true,
    rarity,
    timeframe,
    dataPoints: allHistory.length,
    stats: { avg: Math.round(avg), min, max },
    history: allHistory.sort((a, b) => a.timestamp - b.timestamp),
  })
})

// GET /api/auction/my-bids/:wallet - Get user's active bids and won auctions
router.get('/my-bids/:wallet', (c) => {
  const wallet = c.req.param('wallet')

  const myBids: any[] = []
  const won: any[] = []
  const selling: any[] = []

  auctions.forEach((auc) => {
    if (auc.sellerId === wallet) {
      selling.push(auc)
    }
    if (auc.winnerId === wallet) {
      won.push(auc)
    }
    const hasBid = auc.bids.some((b) => b.bidderId === wallet)
    if (hasBid && auc.status === 'active') {
      const myHighest = Math.max(...auc.bids.filter((b) => b.bidderId === wallet).map((b) => b.amount))
      const isWinning = auc.bids[auc.bids.length - 1]?.bidderId === wallet
      myBids.push({
        ...auc,
        myHighestBid: myHighest,
        isWinning,
        bids: undefined,
      })
    }
  })

  return c.json({
    success: true,
    activeBids: myBids,
    won,
    selling,
    stats: traderStats.get(wallet) || null,
  })
})

// GET /api/auction/notifications/:wallet - Get notifications
router.get('/notifications/:wallet', (c) => {
  const wallet = c.req.param('wallet')
  const notifs = notifications.get(wallet) || []
  const unread = notifs.filter((n) => !n.read).length

  return c.json({
    success: true,
    notifications: notifs.slice(-20),
    unread,
    total: notifs.length,
  })
})

// POST /api/auction/notifications/read - Mark notifications as read
router.post('/notifications/read', async (c) => {
  try {
    const body = await c.req.json()
    const { wallet, notificationIds } = body

    const notifs = notifications.get(wallet)
    if (notifs) {
      notifs.forEach((n) => {
        if (!notificationIds || notificationIds.includes(n.id)) {
          n.read = true
        }
      })
    }

    return c.json({ success: true })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/auction/stats - Marketplace statistics
router.get('/stats', (c) => {
  const now = Date.now()
  const active = Array.from(auctions.values()).filter((a) => a.status === 'active' && a.endTime > now)
  const sold = Array.from(auctions.values()).filter((a) => a.status === 'sold')
  const totalVolume = sold.reduce((sum, a) => sum + (a.finalPrice || 0), 0)

  // Average prices by rarity
  const rarityAvg: Record<string, { avg: number; count: number; highest: number }> = {}
  sold.forEach((a) => {
    const r = a.card.rarity
    if (!rarityAvg[r]) rarityAvg[r] = { avg: 0, count: 0, highest: 0 }
    rarityAvg[r].count++
    rarityAvg[r].avg += a.finalPrice || 0
    rarityAvg[r].highest = Math.max(rarityAvg[r].highest, a.finalPrice || 0)
  })
  Object.values(rarityAvg).forEach((v) => {
    if (v.count > 0) v.avg = Math.round(v.avg / v.count)
  })

  // Top traders
  const topTraders = Array.from(traderStats.values())
    .sort((a, b) => b.totalEarned + b.totalSpent - (a.totalEarned + a.totalSpent))
    .slice(0, 10)

  return c.json({
    success: true,
    overview: {
      activeListings: active.length,
      totalSold: sold.length,
      totalVolume,
      avgPrice: sold.length > 0 ? Math.round(totalVolume / sold.length) : 0,
      uniqueTraders: traderStats.size,
    },
    rarityAvg,
    topTraders,
    endingSoon: active
      .sort((a, b) => a.endTime - b.endTime)
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        cardName: a.card.name,
        rarity: a.card.rarity,
        currentBid: a.currentBid,
        timeRemaining: Math.max(0, a.endTime - now),
        bidCount: a.bidCount,
      })),
  })
})

// GET /api/auction/leaderboard - Top traders leaderboard
router.get('/leaderboard', (c) => {
  const traders = Array.from(traderStats.values())

  return c.json({
    success: true,
    topBuyers: [...traders].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10),
    topSellers: [...traders].sort((a, b) => b.totalEarned - a.totalEarned).slice(0, 10),
    mostActive: [...traders].sort((a, b) => b.totalBought + b.totalSold - (a.totalBought + a.totalSold)).slice(0, 10),
  })
})

// GET /api/auction/:id - Get single auction with full bid history
// IMPORTANT: Must be LAST to not shadow /stats, /history, /leaderboard etc.
router.get('/:id', (c) => {
  const id = c.req.param('id')
  const auc = auctions.get(id)

  if (!auc) return c.json({ success: false, error: 'Auction not found' }, 404)

  const now = Date.now()
  return c.json({
    success: true,
    auction: {
      ...auc,
      timeRemaining: Math.max(0, auc.endTime - now),
      minNextBid: auc.currentBid + getMinIncrement(auc.currentBid),
      bids: auc.bids.slice(-20), // Last 20 bids
    },
  })
})

export default router
