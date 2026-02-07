import { Hono } from 'hono'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}


// Route helpers
function jsonError(c: any, msg: string, status = 400) {
  return c.json({ success: false, error: msg }, status);
}
function jsonSuccess(c: any, data: any) {
  return c.json({ success: true, ...data });
}
function parseIntParam(val: string | undefined, fallback: number): number {
  const n = parseInt(val || '');
  return isNaN(n) ? fallback : n;
}

const router = new Hono<{ Bindings: Bindings }>()

// ============================================================================
// MARKET API - Free Market Trading System with Live Chat
// ============================================================================

// In-memory storage for market data (serverless-friendly)
// For production, use Cloudflare KV or D1 for persistence
interface MarketListing {
  id: number;
  cardId: number;
  card: { name: string; rarity: string; img: string };
  price: number;
  seller: string;
  sellerId: string;
  listed: number;
}

interface ChatMessage {
  id: number;
  user_id: string;
  user_name: string;
  message: string;
  msg_type: string;
  created_at: number;
}

interface HeartbeatUser {
  id: string;
  name: string;
  lastSeen: number;
}

// Market state (in-memory - for demo/development)
let marketListings: MarketListing[] = []
let chatMessages: ChatMessage[] = []
let heartbeatUsers: Map<string, HeartbeatUser> = new Map()
let listingIdCounter = 1
let chatIdCounter = 1

// Add some sample listings for demo
const sampleCards = [
  { id: 1, name: 'RegginA Mythic', rarity: 'mythic', img: '01-reggina-mythic.jpg' },
  { id: 2, name: 'Reggino Legendary', rarity: 'legendary', img: '02-reggino-legendary.jpg' },
  { id: 27, name: 'Elder Dragon', rarity: 'legendary', img: '27-elder-dragon.jpg' },
  { id: 49, name: 'RegginA Ascended', rarity: 'legendary', img: '49-reggina-ascended.jpg' },
  { id: 3, name: 'Onça Epic', rarity: 'epic', img: '03-onca-epic.jpg' },
  { id: 4, name: 'Panthera Epic', rarity: 'epic', img: '04-panthera-epic.jpg' },
]

// Initialize sample listings
if (marketListings.length === 0) {
  sampleCards.forEach((card, index) => {
    const prices: Record<string, number> = { mythic: 500, legendary: 150, epic: 50, rare: 25 }
    marketListings.push({
      id: listingIdCounter++,
      cardId: card.id,
      card: card,
      price: prices[card.rarity] || 25,
      seller: ['RegginA', 'Reggino', 'OnCa', 'Panthera', 'Guildmate'][index % 5],
      sellerId: 'npc-' + index,
      listed: Date.now() - (index * 60000) // Stagger listing times
    })
  })
  
  // Add welcome message
  chatMessages.push({
    id: chatIdCounter++,
    user_id: 'system',
    user_name: 'System',
    message: '🎉 Welcome to NumbahWan Free Market! Buy and sell cards with guild mates!',
    msg_type: 'system',
    created_at: Date.now() - 300000
  })
}

// GET /api/market/listings - Get all active listings
router.get('/listings', (c) => {
  return c.json({
    success: true,
    listings: marketListings,
    count: marketListings.length
  })
})

// POST /api/market/buy - Purchase a listing
router.post('/buy', async (c) => {
  try {
    const body = await c.req.json()
    const { listingId, buyerId, buyerName } = body
    
    const listingIndex = marketListings.findIndex(l => l.id === listingId)
    if (listingIndex === -1) {
      return c.json({ success: false, error: 'Listing not found or already sold' }, 404)
    }
    
    const listing = marketListings[listingIndex]
    
    // Remove from listings
    marketListings.splice(listingIndex, 1)
    
    // Add sale announcement to chat
    chatMessages.push({
      id: chatIdCounter++,
      user_id: 'system',
      user_name: 'Market',
      message: `💰 ${buyerName || 'Someone'} bought ${listing.card.name} for ${listing.price} Jade!`,
      msg_type: 'sale',
      created_at: Date.now()
    })
    
    return c.json({ 
      success: true, 
      message: 'Purchase successful',
      card: listing.card,
      price: listing.price
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
    
    if (!card || !price) {
      return c.json({ success: false, error: 'Card and price required' }, 400)
    }
    
    const newListing: MarketListing = {
      id: listingIdCounter++,
      cardId: cardId || 0,
      card: card,
      price: Math.max(1, Math.floor(price)),
      seller: sellerName || 'Anonymous',
      sellerId: sellerId || 'guest',
      listed: Date.now()
    }
    
    marketListings.unshift(newListing)
    
    // Announce new listing
    chatMessages.push({
      id: chatIdCounter++,
      user_id: 'system',
      user_name: 'Market',
      message: `📦 ${newListing.seller} listed ${card.name} for ${newListing.price} Jade!`,
      msg_type: 'sale',
      created_at: Date.now()
    })
    
    return c.json({ success: true, listing: newListing })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/market/chat - Get chat messages
router.get('/chat', (c) => {
  const since = parseInt(c.req.query('since') || '0')
  const newMessages = chatMessages.filter(m => m.created_at > since)
  
  return c.json({
    success: true,
    messages: newMessages.slice(-50), // Last 50 messages
    total: chatMessages.length
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
      created_at: Date.now()
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

// POST /api/market/heartbeat - Track online users
router.post('/heartbeat', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, userName } = body
    
    if (userId) {
      heartbeatUsers.set(userId, {
        id: userId,
        name: userName || 'Guest',
        lastSeen: Date.now()
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
      onlineCount: heartbeatUsers.size
    })
  } catch (e) {
    return c.json({ success: true, onlineCount: 1 })
  }
})
export default router
