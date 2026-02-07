import { Hono } from 'hono'
import { STAKING_BOOSTS, FUSION_RECIPES } from '../services/card-nwg-bridge'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

const router = new Hono<{ Bindings: Bindings }>()

// ============================================================================
// UTILITY ECOSYSTEM API - Staking, Fusion, Merch Claims, Events
// ============================================================================

// GET /api/events - Get current and upcoming events
router.get('/events', (c) => {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday

  const weeklyEvents = [
    { id: 'market_monday', name: 'Market Monday', day: 1, emoji: '🏪', bonuses: { tradeBonus: 0.1, marketDiscount: 0.05 } },
    { id: 'training_tuesday', name: 'Training Tuesday', day: 2, emoji: '⚔️', bonuses: { xpMultiplier: 1.5 } },
    { id: 'war_wednesday', name: 'War Wednesday', day: 3, emoji: '🏆', bonuses: { battleRewards: 1.5, tournamentEntry: true } },
    { id: 'throwback_thursday', name: 'Throwback Thursday', day: 4, emoji: '⏰', bonuses: { legacyCardsAvailable: true } },
    { id: 'forge_friday', name: 'Forge Friday', day: 5, emoji: '🔥', bonuses: { pityBonus: 0.5, mythicRateBoost: 2.0 } },
    { id: 'social_saturday', name: 'Social Saturday', day: 6, emoji: '🤝', bonuses: { coopRewards: 2.0, guildBonus: 1.5 } },
    { id: 'stake_sunday', name: 'Stake Sunday', day: 0, emoji: '💎', bonuses: { stakingMultiplier: 2.0 } }
  ]

  const todayEvent = weeklyEvents.find(e => e.day === dayOfWeek) || weeklyEvents[0]

  return c.json({
    success: true,
    today: todayEvent,
    weekly: weeklyEvents,
    activeBonuses: todayEvent.bonuses,
    serverTime: now.toISOString()
  })
})

// GET /api/staking/rates - Get staking reward rates
router.get('/staking/rates', (c) => {
  const rates = {
    common: { goldPerDay: 1, logsPerWeek: 0, minLockDays: 7 },
    uncommon: { goldPerDay: 2, logsPerWeek: 0, minLockDays: 7 },
    rare: { goldPerDay: 5, logsPerWeek: 0, minLockDays: 7 },
    epic: { goldPerDay: 15, logsPerWeek: 0, minLockDays: 7 },
    legendary: { goldPerDay: 50, logsPerWeek: 1, minLockDays: 7 },
    mythic: { goldPerDay: 200, logsPerWeek: 5, minLockDays: 7 }
  }

  // Check if Sunday (stake bonus)
  const isStakeSunday = new Date().getDay() === 0
  const multiplier = isStakeSunday ? 2.0 : 1.0

  return c.json({
    success: true,
    rates,
    currentMultiplier: multiplier,
    isStakeSunday,
    earlyUnstakePenalty: 0.1 // 10%
  })
})

// GET /api/fusion/recipes - Get fusion recipes
router.get('/fusion/recipes', (c) => {
  const recipes = [
    { input: 'common', inputCount: 5, output: 'uncommon', goldCost: 50 },
    { input: 'uncommon', inputCount: 5, output: 'rare', goldCost: 200 },
    { input: 'rare', inputCount: 3, output: 'epic', goldCost: 500 },
    { input: 'epic', inputCount: 3, output: 'legendary', goldCost: 2000 },
    { input: 'legendary', inputCount: 2, output: 'mythic', goldCost: 10000 }
  ]

  return c.json({
    success: true,
    recipes,
    evolutionRecipe: {
      description: 'Same card x3 → Evolved version',
      levels: ['Base', 'Evolved', 'Prismatic']
    }
  })
})

// POST /api/merch/claim - Claim merch code rewards
router.post('/merch/claim', async (c) => {
  try {
    const body = await c.req.json()
    const { code, deviceUUID } = body

    if (!code) {
      return c.json({ success: false, error: 'Code required' }, 400)
    }

    // Demo codes for testing
    const demoCodes: Record<string, any> = {
      'NWMR-TEST-BRNZ': {
        tier: 'bronze',
        product: 'NumbahWan T-Shirt',
        rewards: { cards: [{ name: 'Loyal Guardian', rarity: 'rare' }], gold: 100, logs: 0, discount: 0.05, title: 'Supporter' }
      },
      'NWMR-TEST-SLVR': {
        tier: 'silver',
        product: 'NumbahWan Hoodie',
        rewards: { cards: [{ name: 'Storm Caller', rarity: 'epic' }], gold: 250, logs: 50, discount: 0.10, title: 'Collector' }
      },
      'NWMR-TEST-GOLD': {
        tier: 'gold',
        product: 'NumbahWan Premium Bundle',
        rewards: { cards: [{ name: 'Golden Phoenix', rarity: 'legendary' }], gold: 1000, logs: 200, discount: 0.15, title: 'Elite Member' }
      },
      'NWMR-TEST-PLAT': {
        tier: 'platinum',
        product: "NumbahWan Collector's Edition",
        rewards: { cards: [{ name: 'Primordial Dragon', rarity: 'mythic' }], gold: 5000, logs: 500, discount: 0.20, title: 'Founding Member' }
      }
    }

    const normalizedCode = code.toUpperCase().trim()
    const demoReward = demoCodes[normalizedCode]

    if (demoReward) {
      return c.json({
        success: true,
        ...demoReward,
        message: 'Rewards claimed successfully!'
      })
    }

    // In production, would check D1 database
    return c.json({ success: false, error: 'Invalid or expired code' }, 400)
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/merch/tiers - Get merch tier info
router.get('/merch/tiers', (c) => {
  const tiers = {
    bronze: {
      priceRange: '$15-30',
      rewards: ['1 Rare card', '"Supporter" title', '5% permanent discount']
    },
    silver: {
      priceRange: '$30-60',
      rewards: ['1 Epic card', 'Profile badge', '10% discount', '50 Sacred Logs']
    },
    gold: {
      priceRange: '$60-100',
      rewards: ['1 Legendary card', 'Profile border', '15% discount', '200 Sacred Logs']
    },
    platinum: {
      priceRange: '$100+',
      rewards: ['1 Mythic card', '"Founder" status', '20% discount', '500 Sacred Logs', '2× voting power']
    }
  }

  return c.json({ success: true, tiers })
})

export default router
