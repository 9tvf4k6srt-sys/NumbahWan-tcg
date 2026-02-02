// Market API Routes
// Card trading marketplace

import { Hono } from 'hono'

// In-memory storage (replace with D1 for production)
let marketListings: any[] = []
let marketChat: any[] = []
let onlineUsers = new Map<string, { lastSeen: number; name: string }>()

const market = new Hono()

// GET /listings - Get all active listings
market.get('/listings', (c) => {
  const now = Date.now()
  // Filter out expired listings (24h)
  const activeListings = marketListings.filter(l => now - l.createdAt < 86400000)
  return c.json({ listings: activeListings, count: activeListings.length })
})

// POST /buy - Purchase a listing
market.post('/buy', async (c) => {
  const { listingId, buyerId, buyerName } = await c.req.json()
  
  const listingIndex = marketListings.findIndex(l => l.id === listingId)
  if (listingIndex === -1) {
    return c.json({ error: 'Listing not found or already sold' }, 404)
  }
  
  const listing = marketListings[listingIndex]
  
  // Remove listing
  marketListings.splice(listingIndex, 1)
  
  // Add to chat
  marketChat.push({
    id: Date.now().toString(),
    type: 'system',
    text: `🎉 ${buyerName || 'Someone'} bought ${listing.cardName} from ${listing.sellerName}!`,
    timestamp: Date.now()
  })
  
  // Trim chat to 100 messages
  if (marketChat.length > 100) {
    marketChat = marketChat.slice(-100)
  }
  
  return c.json({ 
    success: true, 
    card: listing.card,
    message: `You bought ${listing.cardName} for ${listing.price} ${listing.currency}!`
  })
})

// POST /list - Create new listing
market.post('/list', async (c) => {
  const { card, price, currency, sellerId, sellerName } = await c.req.json()
  
  if (!card || !price || !sellerId) {
    return c.json({ error: 'Missing required fields' }, 400)
  }
  
  // Check for duplicate listing
  const existingIndex = marketListings.findIndex(
    l => l.sellerId === sellerId && l.card?.id === card.id
  )
  
  if (existingIndex !== -1) {
    return c.json({ error: 'You already have this card listed' }, 400)
  }
  
  const listing = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    card,
    cardName: card.name,
    cardRarity: card.rarity,
    cardImg: card.img,
    price: Number(price),
    currency: currency || 'stone',
    sellerId,
    sellerName: sellerName || 'Anonymous',
    createdAt: Date.now()
  }
  
  marketListings.push(listing)
  
  // Announce in chat
  marketChat.push({
    id: Date.now().toString(),
    type: 'system',
    text: `📦 ${sellerName || 'Someone'} listed ${card.name} (${card.rarity}) for ${price} ${currency}!`,
    timestamp: Date.now()
  })
  
  return c.json({ success: true, listing })
})

// GET /chat - Get chat messages
market.get('/chat', (c) => {
  const since = parseInt(c.req.query('since') || '0')
  const messages = since > 0 
    ? marketChat.filter(m => m.timestamp > since)
    : marketChat.slice(-50)
  
  return c.json({ messages, online: onlineUsers.size })
})

// POST /chat - Send chat message
market.post('/chat', async (c) => {
  const { userId, userName, text } = await c.req.json()
  
  if (!text || text.trim().length === 0) {
    return c.json({ error: 'Empty message' }, 400)
  }
  
  // Sanitize
  const cleanText = text.trim().substring(0, 200)
  
  const message = {
    id: Date.now().toString(),
    type: 'user',
    userId,
    userName: userName || 'Guest',
    text: cleanText,
    timestamp: Date.now()
  }
  
  marketChat.push(message)
  
  // Trim
  if (marketChat.length > 100) {
    marketChat = marketChat.slice(-100)
  }
  
  return c.json({ success: true, message })
})

// POST /heartbeat - Update online status
market.post('/heartbeat', async (c) => {
  const { userId, userName } = await c.req.json()
  
  if (!userId) {
    return c.json({ error: 'Missing userId' }, 400)
  }
  
  onlineUsers.set(userId, { lastSeen: Date.now(), name: userName || 'Guest' })
  
  // Clean up offline users (5 min timeout)
  const now = Date.now()
  for (const [id, user] of onlineUsers) {
    if (now - user.lastSeen > 300000) {
      onlineUsers.delete(id)
    }
  }
  
  return c.json({ 
    online: onlineUsers.size,
    users: Array.from(onlineUsers.values()).map(u => u.name)
  })
})

// DELETE /listing/:id - Remove own listing
market.delete('/listing/:id', async (c) => {
  const listingId = c.req.param('id')
  const { sellerId } = await c.req.json()
  
  const listingIndex = marketListings.findIndex(l => l.id === listingId)
  if (listingIndex === -1) {
    return c.json({ error: 'Listing not found' }, 404)
  }
  
  const listing = marketListings[listingIndex]
  if (listing.sellerId !== sellerId) {
    return c.json({ error: 'Not your listing' }, 403)
  }
  
  marketListings.splice(listingIndex, 1)
  
  return c.json({ success: true })
})

export default market
