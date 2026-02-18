import type { Bindings } from '../types'
import { Hono } from 'hono'


const router = new Hono<{ Bindings: Bindings }>()

// ============================================================================
// CARD DATABASE API - Central Card System for Infinite Scaling
// Single source of truth: /static/data/cards-v2.json
// All pages (Forge, Wallet, TCG, Market) use this API
// ============================================================================

// Import card database (loaded at build time)
import cardDatabase from '../../public/static/data/cards-v2.json'

// In-memory card state (initialized from JSON)
let cardData = { ...cardDatabase } as any

// GET /api/cards - Get all cards with optional filtering
router.get('/', (c) => {
  const rarity = c.req.query('rarity')
  const set = c.req.query('set')
  const search = c.req.query('q')
  const limit = parseInt(c.req.query('limit') || '0')
  const offset = parseInt(c.req.query('offset') || '0')
  
  let cards = [...cardData.cards]
  
  // Apply filters
  if (rarity) {
    cards = cards.filter(card => card.rarity === rarity)
  }
  if (set) {
    cards = cards.filter(card => card.set === set)
  }
  if (search) {
    const q = search.toLowerCase()
    cards = cards.filter(card => 
      card.name.toLowerCase().includes(q) ||
      card.rarity.toLowerCase().includes(q) ||
      (card.set && card.set.toLowerCase().includes(q))
    )
  }
  
  const total = cards.length
  
  // Apply pagination
  if (limit > 0) {
    cards = cards.slice(offset, offset + limit)
  }
  
  c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  return c.json({
    success: true,
    version: cardData.version,
    total,
    count: cards.length,
    offset,
    cards,
    rarities: cardData.rarityInfo
  })
})

// GET /api/cards/stats - Get collection statistics (MUST be before :id route)
router.get('/stats', (c) => {
  const stats = {
    total: cardData.cards.length,
    version: cardData.version,
    lastUpdated: cardData.lastUpdated,
    byRarity: {} as Record<string, { count: number; rate: number }>,
    sets: {} as Record<string, number>,
    reserved: cardData.cards.filter((c: any) => c.reserved).length
  }
  
  // Count by rarity
  Object.keys(cardData.rarityInfo).forEach(rarity => {
    const count = cardData.cards.filter((c: any) => c.rarity === rarity).length
    stats.byRarity[rarity] = {
      count,
      rate: cardData.rarityInfo[rarity].rate
    }
  })
  
  // Count by set
  cardData.cards.forEach((card: any) => {
    const set = card.set || 'unknown'
    stats.sets[set] = (stats.sets[set] || 0) + 1
  })
  
  c.header('Cache-Control', 'public, max-age=300')
  return c.json({ success: true, stats })
})

// GET /api/cards/rarity/:rarity - Get all cards of a rarity (MUST be before :id route)
router.get('/rarity/:rarity', (c) => {
  const rarity = c.req.param('rarity')
  const cards = cardData.cards.filter((card: any) => card.rarity === rarity)
  const rarityInfo = cardData.rarityInfo[rarity]
  
  if (!rarityInfo) {
    return c.json({ success: false, error: 'Invalid rarity' }, 400)
  }
  
  c.header('Cache-Control', 'public, max-age=300')
  return c.json({
    success: true,
    rarity,
    rarityInfo,
    count: cards.length,
    cards
  })
})

// GET /api/cards/:id - Get single card by ID (MUST be after specific routes)
router.get('/:id', (c) => {
  const id = parseInt(c.req.param('id'))
  const card = cardData.cards.find((card: any) => card.id === id)
  
  if (!card) {
    return c.json({ success: false, error: 'Card not found' }, 404)
  }
  
  c.header('Cache-Control', 'public, max-age=300')
  return c.json({
    success: true,
    card,
    rarityInfo: cardData.rarityInfo[card.rarity]
  })
})

// POST /api/cards/pull - Gacha pull with pity system
router.post('/pull', async (c) => {
  try {
    const body = await c.req.json()
    const { count = 1, pity = { mythic: 0, legendary: 0, epic: 0 } } = body
    
    const pulls = Math.min(Math.max(1, count), 10) // 1-10 pulls max
    const results: Array<{ card: any; rarity: string }> = []
    let currentPity = { ...pity }
    
    for (let i = 0; i < pulls; i++) {
      const { card, rarity, newPity } = pullSingleCard(currentPity)
      results.push({ card, rarity })
      currentPity = newPity
    }
    
    return c.json({
      success: true,
      results,
      pity: currentPity
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// Helper function for gacha pull
function pullSingleCard(pity: { mythic: number; legendary: number; epic: number }) {
  const rarities = cardData.rarityInfo
  let pulledRarity = 'common'
  const roll = Math.random() * 100
  
  // Check hard pity
  if (pity.mythic >= rarities.mythic.hardPity) {
    pulledRarity = 'mythic'
  } else if (pity.legendary >= rarities.legendary.hardPity) {
    pulledRarity = 'legendary'
  } else if (pity.epic >= rarities.epic.hardPity) {
    pulledRarity = 'epic'
  } else {
    // Calculate rates with soft pity
    let mythicRate = rarities.mythic.rate
    let legendaryRate = rarities.legendary.rate
    let epicRate = rarities.epic.rate
    
    if (pity.mythic >= rarities.mythic.softPity) {
      mythicRate += (pity.mythic - rarities.mythic.softPity) * 0.5
    }
    if (pity.legendary >= rarities.legendary.softPity) {
      legendaryRate += (pity.legendary - rarities.legendary.softPity) * 2
    }
    if (pity.epic >= rarities.epic.softPity) {
      epicRate += (pity.epic - rarities.epic.softPity) * 3
    }
    
    let cumulative = 0
    if (roll < (cumulative += mythicRate)) pulledRarity = 'mythic'
    else if (roll < (cumulative += legendaryRate)) pulledRarity = 'legendary'
    else if (roll < (cumulative += epicRate)) pulledRarity = 'epic'
    else if (roll < (cumulative += rarities.rare.rate)) pulledRarity = 'rare'
    else if (roll < (cumulative += rarities.uncommon.rate)) pulledRarity = 'uncommon'
    else pulledRarity = 'common'
  }
  
  // Get random card of that rarity
  const cardsOfRarity = cardData.cards.filter((c: any) => c.rarity === pulledRarity)
  const card = cardsOfRarity.length > 0 
    ? cardsOfRarity[Math.floor(Math.random() * cardsOfRarity.length)]
    : cardData.cards[Math.floor(Math.random() * cardData.cards.length)]
  
  // Update pity
  const newPity = { ...pity }
  if (pulledRarity === 'mythic') {
    newPity.mythic = 0
  } else {
    newPity.mythic++
  }
  if (pulledRarity === 'legendary' || pulledRarity === 'mythic') {
    newPity.legendary = 0
  } else {
    newPity.legendary++
  }
  if (['epic', 'legendary', 'mythic'].includes(pulledRarity)) {
    newPity.epic = 0
  } else {
    newPity.epic++
  }
  
  return { card: { ...card }, rarity: pulledRarity, newPity }
}
export default router
