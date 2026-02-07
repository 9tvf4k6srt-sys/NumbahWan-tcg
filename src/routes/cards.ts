// Cards API Routes
// Card data and collection management

import { Hono } from 'hono'

const router = new Hono()

// Card data cache (loaded from JSON files)
let cardCache: Map<string, any[]> = new Map()

// Helper to load cards
async function loadCards(season: string = 'all'): Promise<any[]> {
  // In production, these would be loaded dynamically
  // For now, return from cache or empty
  if (cardCache.has(season)) {
    return cardCache.get(season) || []
  }
  return []
}

// GET / - Get all cards or by query
router.get('/', async (c) => {
  const season = c.req.query('season')
  const rarity = c.req.query('rarity')
  const category = c.req.query('category')
  const search = c.req.query('search')?.toLowerCase()
  
  let allCards = await loadCards(season || 'all')
  
  // Apply filters
  if (rarity) {
    allCards = allCards.filter(card => card.rarity === rarity)
  }
  if (category) {
    allCards = allCards.filter(card => card.category === category)
  }
  if (search) {
    allCards = allCards.filter(card => 
      card.name?.toLowerCase().includes(search) ||
      card.description?.toLowerCase().includes(search)
    )
  }
  
  return c.json({ 
    cards: allCards, 
    count: allCards.length,
    filters: { season, rarity, category, search }
  })
})

// GET /:id - Get single card by ID
router.get('/:id', async (c) => {
  const id = c.req.param('id')
  const allCards = await loadCards('all')
  const card = allCards.find(card => card.id === id)
  
  if (!card) {
    return c.json({ error: 'Card not found' }, 404)
  }
  
  return c.json({ card })
})

// GET /rarity/:rarity - Get cards by rarity
router.get('/rarity/:rarity', async (c) => {
  const rarity = c.req.param('rarity')
  const allCards = await loadCards('all')
  const filtered = allCards.filter(card => card.rarity === rarity)
  
  return c.json({ 
    cards: filtered, 
    count: filtered.length,
    rarity 
  })
})

// GET /season/:season - Get cards by season
router.get('/season/:season', async (c) => {
  const season = c.req.param('season')
  const seasonCards = await loadCards(season)
  
  return c.json({ 
    cards: seasonCards, 
    count: seasonCards.length,
    season 
  })
})

// GET /random - Get random card(s)
router.get('/random', async (c) => {
  const count = Math.min(parseInt(c.req.query('count') || '1'), 10)
  const rarity = c.req.query('rarity')
  
  let pool = await loadCards('all')
  
  if (rarity) {
    pool = pool.filter(card => card.rarity === rarity)
  }
  
  if (pool.length === 0) {
    return c.json({ error: 'No cards in pool' }, 404)
  }
  
  const randomCards = []
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    randomCards.push(pool[idx])
  }
  
  return c.json({ cards: randomCards })
})

// GET /stats - Get card statistics
router.get('/stats', async (c) => {
  const allCards = await loadCards('all')
  
  const stats = {
    total: allCards.length,
    byRarity: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    bySeason: {} as Record<string, number>
  }
  
  allCards.forEach(card => {
    // By rarity
    stats.byRarity[card.rarity] = (stats.byRarity[card.rarity] || 0) + 1
    // By category
    if (card.category) {
      stats.byCategory[card.category] = (stats.byCategory[card.category] || 0) + 1
    }
    // By season (extract from ID like s1-001)
    const seasonMatch = card.id?.match(/^s(\d+)/)
    if (seasonMatch) {
      const season = `s${seasonMatch[1]}`
      stats.bySeason[season] = (stats.bySeason[season] || 0) + 1
    }
  })
  
  return c.json({ stats })
})

// Function to set card cache (called from main app)
export function setCardCache(season: string, cards: any[]) {
  cardCache.set(season, cards)
}

export default router
