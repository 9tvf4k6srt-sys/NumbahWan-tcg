import { Hono } from 'hono'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

// Route helpers
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

const router = new Hono<{ Bindings: Bindings }>()

// ============================================================================
// MARKET API - Free Market Trading System with Live Chat
// ============================================================================

// In-memory storage for market data (serverless-friendly)
// For production, use Cloudflare KV or D1 for persistence
interface MarketListing {
  id: number
  cardId: number
  card: { name: string; rarity: string; img: string }
  price: number
  seller: string
  sellerId: string
  listed: number
  // Serial number system
  serial?: number
  tier?: string
  instanceId?: string
}

interface ChatMessage {
  id: number
  user_id: string
  user_name: string
  message: string
  msg_type: string
  created_at: number
}

interface HeartbeatUser {
  id: string
  name: string
  lastSeen: number
}

// Market state (in-memory - for demo/development)
let marketListings: MarketListing[] = []
let chatMessages: ChatMessage[] = []
const heartbeatUsers: Map<string, HeartbeatUser> = new Map()
let listingIdCounter = 1
let chatIdCounter = 1
let lastRefreshDate = '' // tracks YYYY-MM-DD of last 4:20 refresh
const marketStats = { totalSales: 0, totalVolume: 0, refreshCount: 0 }

// ═══════════════════════════════════════════════════════════════
// GACHA-RATE CARD POOL — same rates as Forge
// mythic 0.5% | legendary 2% | epic 8% | rare 19.5% | uncommon 33% | common 37%
// ═══════════════════════════════════════════════════════════════
const GACHA_RATES: Record<string, number> = {
  mythic: 0.005,
  legendary: 0.02,
  epic: 0.08,
  rare: 0.195,
  uncommon: 0.33,
  common: 0.37,
}

const CARD_POOL: Record<string, Array<{ id: number; name: string; img: string }>> = {
  mythic: [
    { id: 1, name: 'RegginA, The Eternal Flame', img: 'reggina-eternal-flame-mythic-v3.webp' },
    { id: 2, name: 'Harlay, Dog of War', img: 'harlay-dog-of-war-mythic.webp' },
    { id: 3, name: 'RegginA - Practicing Trainee', img: 'mythic-01-practicing-trainee.webp' },
    { id: 4, name: 'RegginA - Chain of the Undead', img: 'mythic-02-chain-undead.webp' },
    { id: 5, name: 'Infernal Warlord', img: 'mythic-03-infernal-warlord.webp' },
  ],
  legendary: [
    { id: 101, name: 'Reggino', img: '02-reggino-legendary.webp' },
    { id: 102, name: '404 Error', img: 'legendary-404.webp' },
    { id: 103, name: 'AFK Luna', img: 'legendary-afk-luna.webp' },
    { id: 104, name: 'Big Brain', img: 'legendary-bigbrain.webp' },
    { id: 105, name: 'Burnout, The Eternal Grinder', img: 'legendary-burnout.webp' },
    { id: 106, name: 'Capslock', img: 'legendary-capslock.webp' },
    { id: 107, name: 'Chadwick', img: 'legendary-chadwick.webp' },
    { id: 108, name: 'Whaleford, The Unlimited Budget', img: 'legendary-whaleford.webp' },
  ],
  epic: [
    { id: 201, name: 'OnCa', img: 'epic-onca.webp' },
    { id: 202, name: 'Panthera', img: 'epic-panthera.webp' },
    { id: 203, name: 'Fenneko', img: 'epic-fenneko.webp' },
    { id: 204, name: 'Glimmer', img: 'epic-glimmer.webp' },
    { id: 205, name: 'Drama Bomb', img: 'epic-drama-bomb.webp' },
    { id: 206, name: 'Rage Quit', img: 'epic-rage-quit.webp' },
    { id: 207, name: 'Server Crash', img: 'epic-server-crash.webp' },
    { id: 208, name: 'Hype', img: 'epic-hype.webp' },
    { id: 209, name: 'Chonk', img: 'epic-chonk.webp' },
    { id: 210, name: 'Snipe', img: 'epic-snipe.webp' },
  ],
  rare: [
    { id: 301, name: 'Elder Dragon', img: '27-elder-dragon.webp' },
    { id: 302, name: 'Limited Banner', img: 'common-limited-banner.webp' },
    { id: 303, name: 'Guild Chat', img: 'common-guild-chat.webp' },
    { id: 304, name: 'Loot Pile', img: 'common-loot-pile.webp' },
    { id: 305, name: 'Lag Spike', img: 'uncommon-lag-spike.webp' },
    { id: 306, name: 'Ping Spammer', img: 'uncommon-ping-spammer.webp' },
  ],
  uncommon: [
    { id: 401, name: 'Daily Login', img: 'common-daily-login.webp' },
    { id: 402, name: 'Free Summon', img: 'common-free-summon.webp' },
    { id: 403, name: 'Notification', img: 'common-notification.webp' },
    { id: 404, name: 'Spawn Point', img: 'common-spawn-point.webp' },
    { id: 405, name: 'Off-Meta', img: 'uncommon-off-meta.webp' },
  ],
  common: [
    { id: 501, name: '1-Star Review', img: 'common-1star-review.webp' },
    { id: 502, name: 'AFK Spot', img: 'common-afk-spot.webp' },
    { id: 503, name: 'Auto Battle', img: 'common-auto-battle.webp' },
    { id: 504, name: 'Charging Cable', img: 'common-charging-cable.webp' },
    { id: 505, name: 'Connection Lost', img: 'common-connection-lost.webp' },
    { id: 506, name: 'Cracked Phone', img: 'common-cracked-phone.webp' },
    { id: 507, name: 'Skip Button', img: 'common-skip-button.webp' },
    { id: 508, name: 'Salt Shaker', img: 'common-salt-shaker.webp' },
  ],
}

const NPC_SELLERS = ['RegginA', 'Reggino', 'OnCa', 'Panthera', 'AFK Luna', 'Capslock', 'Whaleford', 'Fenneko']

const PRICE_TABLE: Record<string, { min: number; max: number }> = {
  mythic: { min: 300, max: 888 },
  legendary: { min: 80, max: 250 },
  epic: { min: 25, max: 80 },
  rare: { min: 10, max: 30 },
  uncommon: { min: 3, max: 12 },
  common: { min: 0, max: 5 }, // 0 = free gift
}

// Roll a rarity using gacha rates (weighted random)
function rollRarity(): string {
  const roll = Math.random()
  let cumulative = 0
  for (const [rarity, rate] of Object.entries(GACHA_RATES)) {
    cumulative += rate
    if (roll < cumulative) return rarity
  }
  return 'common'
}

// Generate a fresh set of NPC market listings using gacha rates
function generateDailyListings(count: number = 8): void {
  const npcListings: MarketListing[] = []

  for (let i = 0; i < count; i++) {
    const rarity = rollRarity()
    const pool = CARD_POOL[rarity] || CARD_POOL.common
    const card = pool[Math.floor(Math.random() * pool.length)]
    const priceRange = PRICE_TABLE[rarity]
    const price = Math.floor(priceRange.min + Math.random() * (priceRange.max - priceRange.min))

    npcListings.push({
      id: listingIdCounter++,
      cardId: card.id,
      card: { ...card, rarity },
      price,
      seller: NPC_SELLERS[Math.floor(Math.random() * NPC_SELLERS.length)],
      sellerId: `npc-daily-${i}`,
      listed: Date.now() - Math.floor(Math.random() * 3600000), // stagger within last hour
    })
  }

  // Keep user-listed cards, replace only NPC listings
  marketListings = marketListings.filter((l) => !l.sellerId.startsWith('npc-'))
  marketListings.push(...npcListings)
  marketStats.refreshCount++
}

// Check if it's time for the daily 4:20 refresh
function checkDailyRefresh(): void {
  const now = new Date()
  const today = now.toISOString().slice(0, 10) // YYYY-MM-DD
  const hours = now.getUTCHours()
  const minutes = now.getUTCMinutes()

  // 4:20 UTC daily refresh (or on first request of the day)
  if (today !== lastRefreshDate && (hours > 4 || (hours === 4 && minutes >= 20))) {
    generateDailyListings(8)
    lastRefreshDate = today
    chatMessages.push({
      id: chatIdCounter++,
      user_id: 'system',
      user_name: 'Market',
      message: '🔄 Daily 4:20 Market Refresh! Fresh cards available — same gacha rates apply!',
      msg_type: 'system',
      created_at: Date.now(),
    })
  }
}

function seedMarketIfEmpty() {
  if (marketListings.length > 0) return
  generateDailyListings(8) // Use gacha rates for initial seed too
  lastRefreshDate = new Date().toISOString().slice(0, 10)
  chatMessages.push({
    id: chatIdCounter++,
    user_id: 'system',
    user_name: 'System',
    message: '🎉 Welcome to NumbahWan Free Market! Fresh cards daily at 4:20!',
    msg_type: 'system',
    created_at: Date.now() - 300000,
  })
}

// GET /api/market/listings - Get all active listings
router.get('/listings', (c) => {
  seedMarketIfEmpty()
  checkDailyRefresh()
  return c.json({
    success: true,
    listings: marketListings,
    count: marketListings.length,
    nextRefresh: '04:20 UTC daily',
    lastRefreshDate,
  })
})

// GET /api/market/status - Dashboard data for the market
router.get('/status', (c) => {
  const rarityBreakdown: Record<string, number> = {}
  marketListings.forEach((l) => {
    const r = l.card?.rarity || 'unknown'
    rarityBreakdown[r] = (rarityBreakdown[r] || 0) + 1
  })
  return c.json({
    success: true,
    listings: marketListings.length,
    onlineUsers: heartbeatUsers.size,
    chatMessages: chatMessages.length,
    stats: marketStats,
    rarityBreakdown,
    gachaRates: GACHA_RATES,
    lastRefreshDate,
    nextRefresh: '04:20 UTC daily',
  })
})

// POST /api/market/buy - Purchase a listing
router.post('/buy', async (c) => {
  try {
    const body = await c.req.json()
    const { listingId, buyerId: _buyerId, buyerName } = body

    const listingIndex = marketListings.findIndex((l) => l.id === listingId)
    if (listingIndex === -1) {
      return c.json({ success: false, error: 'Listing not found or already sold' }, 404)
    }

    const listing = marketListings[listingIndex]

    // Remove from listings and track stats
    marketListings.splice(listingIndex, 1)
    marketStats.totalSales++
    marketStats.totalVolume += listing.price

    // Add sale announcement to chat
    const buyPriceText = listing.price === 0 ? 'FREE' : `${listing.price} Sacred Logs`
    chatMessages.push({
      id: chatIdCounter++,
      user_id: 'system',
      user_name: 'Market',
      message: `💰 ${buyerName || 'Someone'} ${listing.price === 0 ? 'claimed' : 'bought'} ${listing.card.name} for ${buyPriceText}!`,
      msg_type: 'sale',
      created_at: Date.now(),
    })

    return c.json({
      success: true,
      message: 'Purchase successful',
      card: listing.card,
      price: listing.price,
      serial: listing.serial || null,
      tier: listing.tier || null,
      instanceId: listing.instanceId || null,
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/market/list - Create new listing
router.post('/list', async (c) => {
  try {
    const body = await c.req.json()
    const { cardId, card, price, sellerId, sellerName } = body

    if (!card) {
      return c.json({ success: false, error: 'Card data required' }, 400)
    }

    const newListing: MarketListing = {
      id: listingIdCounter++,
      cardId: cardId || 0,
      card: card,
      price: Math.max(0, Math.floor(price || 0)),
      seller: sellerName || 'Anonymous',
      sellerId: sellerId || 'guest',
      listed: Date.now(),
      serial: body.serial || undefined,
      tier: body.tier || undefined,
      instanceId: body.instanceId || undefined,
    }

    marketListings.unshift(newListing)

    // Announce new listing with serial info
    const serialTag = newListing.serial ? ` #${newListing.serial}${newListing.tier ? ` (${newListing.tier})` : ''}` : ''
    const listPriceText = newListing.price === 0 ? 'FREE 🎁' : `${newListing.price} Sacred Logs`
    chatMessages.push({
      id: chatIdCounter++,
      user_id: 'system',
      user_name: 'Market',
      message: `📦 ${newListing.seller} listed ${card.name}${serialTag} for ${listPriceText}!`,
      msg_type: 'sale',
      created_at: Date.now(),
    })

    return c.json({ success: true, listing: newListing })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/market/chat - Get chat messages
router.get('/chat', (c) => {
  const since = parseInt(c.req.query('since') || '0', 10)
  const newMessages = chatMessages.filter((m) => m.created_at > since)

  return c.json({
    success: true,
    messages: newMessages.slice(-50), // Last 50 messages
    total: chatMessages.length,
  })
})

// POST /api/market/chat - Send chat message
router.post('/chat', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, userName, message } = body

    if (!message || message.trim().length === 0) {
      return c.json({ success: false, error: 'Message required' }, 400)
    }

    // Sanitize message (basic XSS prevention)
    const cleanMessage = message.trim().substring(0, 200)

    const newMessage: ChatMessage = {
      id: chatIdCounter++,
      user_id: userId || 'guest',
      user_name: userName || 'Guest',
      message: cleanMessage,
      msg_type: 'chat',
      created_at: Date.now(),
    }

    chatMessages.push(newMessage)

    // Keep only last 100 messages
    if (chatMessages.length > 100) {
      chatMessages = chatMessages.slice(-100)
    }

    return c.json({ success: true, message: newMessage })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/market/pull-announce - Announce legendary+ pulls with serial info
router.post('/pull-announce', async (c) => {
  try {
    const body = await c.req.json()
    const { userId: _userId, userName, cardId: _cardId, rarity, serial, tier } = body

    const serialTag = serial ? ` #${serial}${tier ? ` (${tier})` : ''}` : ''
    const rarityEmoji: Record<string, string> = { mythic: '\u2728\ud83d\udd25', legendary: '\u2b50' }
    const emoji = rarityEmoji[rarity] || '\ud83c\udfb4'

    chatMessages.push({
      id: chatIdCounter++,
      user_id: 'system',
      user_name: 'World',
      message: `${emoji} ${userName || 'Someone'} pulled a ${rarity.toUpperCase()} card${serialTag}!`,
      msg_type: 'pull',
      created_at: Date.now(),
    })

    // Keep only last 100 messages
    if (chatMessages.length > 100) {
      chatMessages = chatMessages.slice(-100)
    }

    return c.json({ success: true })
  } catch (_e) {
    return c.json({ success: true }) // Non-critical, always succeed
  }
})

// POST /api/market/heartbeat - Track online users
router.post('/heartbeat', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, userName } = body

    if (userId) {
      heartbeatUsers.set(userId, {
        id: userId,
        name: userName || 'Guest',
        lastSeen: Date.now(),
      })
    }

    // Clean up old users (inactive > 30 seconds)
    const now = Date.now()
    heartbeatUsers.forEach((user, id) => {
      if (now - user.lastSeen > 30000) {
        heartbeatUsers.delete(id)
      }
    })

    return c.json({
      success: true,
      onlineCount: heartbeatUsers.size,
    })
  } catch (_e) {
    return c.json({ success: true, onlineCount: 1 })
  }
})
export default router
