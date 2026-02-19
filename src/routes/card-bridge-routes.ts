import { Hono } from 'hono'
import {
  buyCard,
  CARD_NWG_VALUES,
  CARD_PRINT_RUNS,
  CARD_YIELD_RATES,
  calculateBoostMultiplier,
  cancelListing,
  claimCard,
  claimStakingRewards,
  FUSION_RECIPES,
  fuseCards,
  generateClaimCode,
  generateQRCodeData,
  getCollection,
  getMarketplaceStats,
  listCardForSale,
  mintPhysicalCards,
  STAKING_BOOSTS,
  stakeCard,
  unstakeCard,
} from '../services/card-nwg-bridge'
import type { Bindings } from '../types'

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

// 🃏💰 CARD-NWG BRIDGE API - Physical Cards ↔ Digital Currency

// GET /api/card-bridge/info - Get bridge system info
router.get('/info', (c) => {
  return c.json({
    success: true,
    system: 'NWG Card-to-Crypto Bridge',
    version: '1.0.0',
    description: 'Connect physical NumbahWan cards to digital NWG currency',
    features: [
      'Physical Card Registration (QR/NFC claim)',
      'Card Staking (earn passive NWG)',
      'P2P Card Trading',
      'Card Fusion System',
      'QR Code Generation',
    ],
    nwgValues: CARD_NWG_VALUES,
    yieldRates: CARD_YIELD_RATES,
    printRuns: CARD_PRINT_RUNS,
    fusionRecipes: FUSION_RECIPES,
    stakingBoosts: STAKING_BOOSTS,
    howItWorks: {
      step1: 'Get physical NWG card (purchased or from events)',
      step2: 'Scan QR code on card',
      step3: 'Claim card to your wallet (one-time)',
      step4: 'Stake card to earn passive NWG',
      step5: 'Trade cards on marketplace or fuse for upgrades',
    },
  })
})

// POST /api/card-bridge/claim - Claim a physical card
router.post('/claim', async (c) => {
  const { env } = c

  if (!env.MARKET_CACHE) {
    // Demo mode without KV
    return c.json({
      success: true,
      demo: true,
      message: '🎉 Card claimed! (Demo mode)',
      card: {
        id: 'NWG-R-0001',
        rarity: 'rare',
        nwgLocked: 500,
        status: 'claimed',
      },
      nwgAwarded: 50,
      isOGHolder: true,
    })
  }

  try {
    const { claimCode, walletAddress } = await c.req.json()

    if (!claimCode || !walletAddress) {
      return c.json({ success: false, error: 'Missing claimCode or walletAddress' }, 400)
    }

    const result = await claimCard(env.MARKET_CACHE, claimCode, walletAddress)
    return c.json(result)
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/card-bridge/collection/:wallet - Get user's card collection
router.get('/collection/:wallet', async (c) => {
  const { env } = c
  const walletAddress = c.req.param('wallet')

  if (!env.MARKET_CACHE) {
    // Demo collection
    return c.json({
      success: true,
      demo: true,
      collection: {
        ownerId: walletAddress,
        cards: ['NWG-C-0001', 'NWG-R-0002', 'NWG-E-0001'],
        totalValue: 2600,
        stakedCount: 1,
        pendingYield: 15,
        achievements: ['collector_bronze'],
        boostMultiplier: 1.1,
      },
    })
  }

  try {
    const collection = await getCollection(env.MARKET_CACHE, walletAddress)
    const boostMultiplier = calculateBoostMultiplier(collection as any)
    return c.json({
      success: true,
      collection,
      boostMultiplier,
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/card-bridge/stake - Stake a card for passive NWG yield
router.post('/stake', async (c) => {
  const { env } = c

  if (!env.MARKET_CACHE) {
    return c.json({
      success: true,
      demo: true,
      message: '🔒 Card staked! Earning 10 NWG/day (Demo)',
      stake: {
        id: 'STK-DEMO',
        physicalCardId: 'NWG-R-0001',
        yieldRate: 10,
        boostMultiplier: 1.1,
      },
    })
  }

  try {
    const { cardId, walletAddress } = await c.req.json()

    if (!cardId || !walletAddress) {
      return c.json({ success: false, error: 'Missing cardId or walletAddress' }, 400)
    }

    const result = await stakeCard(env.MARKET_CACHE, cardId, walletAddress)
    return c.json(result)
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/card-bridge/unstake - Unstake a card and claim yield
router.post('/unstake', async (c) => {
  const { env } = c

  if (!env.MARKET_CACHE) {
    return c.json({
      success: true,
      demo: true,
      message: '🔓 Card unstaked! Claimed 150 NWG (Demo)',
      yieldClaimed: 150,
    })
  }

  try {
    const { cardId, walletAddress } = await c.req.json()
    const result = await unstakeCard(env.MARKET_CACHE, cardId, walletAddress)
    return c.json(result)
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/card-bridge/claim-rewards - Claim all staking rewards
router.post('/claim-rewards', async (c) => {
  const { env } = c

  if (!env.MARKET_CACHE) {
    return c.json({
      success: true,
      demo: true,
      totalClaimed: 250,
      message: '💰 Claimed 250 NWG from 3 staked cards (Demo)',
    })
  }

  try {
    const { walletAddress } = await c.req.json()
    const result = await claimStakingRewards(env.MARKET_CACHE, walletAddress)
    return c.json(result)
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/card-bridge/list - List card for sale on marketplace
router.post('/list', async (c) => {
  const { env } = c

  if (!env.MARKET_CACHE) {
    return c.json({
      success: true,
      demo: true,
      message: '📢 Card listed for 1000 NWG (Demo)',
      listing: {
        id: 'LST-DEMO',
        physicalCardId: 'NWG-R-0001',
        priceNWG: 1000,
        priceUSD: 10.0,
        status: 'active',
      },
    })
  }

  try {
    const { cardId, walletAddress, priceNWG, durationDays } = await c.req.json()

    if (!cardId || !walletAddress || !priceNWG) {
      return c.json({ success: false, error: 'Missing required fields' }, 400)
    }

    const result = await listCardForSale(env.MARKET_CACHE, cardId, walletAddress, priceNWG, durationDays || 7)
    return c.json(result)
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/card-bridge/buy - Buy a listed card
router.post('/buy', async (c) => {
  const { env } = c

  if (!env.MARKET_CACHE) {
    return c.json({
      success: true,
      demo: true,
      message: '🎉 Card purchased for 1000 NWG! (Demo)',
      card: {
        id: 'NWG-E-0001',
        rarity: 'epic',
        nwgLocked: 2000,
      },
    })
  }

  try {
    const { listingId, buyerWallet } = await c.req.json()
    const result = await buyCard(env.MARKET_CACHE, listingId, buyerWallet)
    return c.json(result)
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/card-bridge/cancel-listing - Cancel a listing
router.post('/cancel-listing', async (c) => {
  const { env } = c

  if (!env.MARKET_CACHE) {
    return c.json({ success: true, demo: true, message: 'Listing cancelled (Demo)' })
  }

  try {
    const { listingId, walletAddress } = await c.req.json()
    const result = await cancelListing(env.MARKET_CACHE, listingId, walletAddress)
    return c.json(result)
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/card-bridge/fuse - Fuse cards to create higher rarity
router.post('/fuse', async (c) => {
  const { env } = c

  if (!env.MARKET_CACHE) {
    // Demo fusion
    const roll = Math.random()
    const success = roll > 0.3 // 70% demo success

    if (success) {
      return c.json({
        success: true,
        demo: true,
        message: '🔥 FUSION SUCCESS! Created epic card worth 2000 NWG!',
        newCard: {
          id: 'NWG-E-9001',
          rarity: 'epic',
          nwgLocked: 2000,
        },
        burned: ['NWG-R-0001', 'NWG-R-0002', 'NWG-R-0003', 'NWG-R-0004'],
      })
    } else {
      return c.json({
        success: false,
        demo: true,
        message: '💥 Fusion failed! Cards preserved. (Demo)',
      })
    }
  }

  try {
    const { cardIds, walletAddress, targetRarity } = await c.req.json()

    if (!cardIds || !walletAddress || !targetRarity) {
      return c.json({ success: false, error: 'Missing required fields' }, 400)
    }

    const result = await fuseCards(env.MARKET_CACHE, cardIds, walletAddress, targetRarity)
    return c.json(result)
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/card-bridge/marketplace - Get marketplace stats and listings
router.get('/marketplace', async (c) => {
  const { env } = c

  if (!env.MARKET_CACHE) {
    return c.json({
      success: true,
      demo: true,
      stats: {
        totalCards: 1080,
        claimedCards: 342,
        stakedCards: 156,
        listedCards: 28,
        totalNWGLocked: 2500000,
        activeListings: 28,
        totalVolume: 125000,
        floorPrices: {
          common: 100,
          uncommon: 250,
          rare: 500,
          epic: 2000,
          legendary: 10000,
          mythic: 50000,
        },
      },
      recentSales: [
        { cardId: 'NWG-L-0003', rarity: 'legendary', price: 15000, time: '2h ago' },
        { cardId: 'NWG-E-0012', rarity: 'epic', price: 3500, time: '5h ago' },
        { cardId: 'NWG-R-0045', rarity: 'rare', price: 750, time: '8h ago' },
      ],
    })
  }

  try {
    const stats = await getMarketplaceStats(env.MARKET_CACHE)
    return c.json({ success: true, stats })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/card-bridge/qr/:cardId - Generate QR code data for a card
router.get('/qr/:cardId', (c) => {
  const cardId = c.req.param('cardId')
  const claimCode = generateClaimCode()
  const qrData = generateQRCodeData(cardId, claimCode)

  return c.json({
    success: true,
    cardId,
    claimCode, // Only shown once - for printing
    qrData,
    printInstructions: {
      qrSize: '300x300px minimum',
      placement: 'Back of card, bottom center',
      format: 'Include card ID above QR code',
      warning: 'Store claim codes securely - they cannot be regenerated',
    },
  })
})

// POST /api/card-bridge/mint - Admin: Mint new physical cards (for printing)
router.post('/mint', async (c) => {
  const { env } = c

  try {
    const { cardId, rarity, quantity, set, name, description, image, gmKey } = await c.req.json()

    // GM authentication
    if (gmKey !== 'numbahwan-gm-2026') {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const { cards, claimCodes } = mintPhysicalCards({ cardId, rarity, quantity, set }, { name, description, image })

    // In production, save to KV
    if (env.MARKET_CACHE) {
      const existingData = await env.MARKET_CACHE.get('physical_cards')
      const existing = existingData ? JSON.parse(existingData) : []
      existing.push(...cards)
      await env.MARKET_CACHE.put('physical_cards', JSON.stringify(existing))
    }

    return c.json({
      success: true,
      message: `Minted ${cards.length} physical cards`,
      cards,
      claimCodes, // For printing - secure these!
      totalNWGLocked: cards.reduce((sum, c) => sum + c.nwgLocked, 0),
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/card-bridge/calculator - Calculate card values and yields
router.get('/calculator', (c) => {
  const rarity = c.req.query('rarity') || 'rare'
  const count = parseInt(c.req.query('count') || '1', 10)
  const stakeDays = parseInt(c.req.query('days') || '30', 10)
  const boostMultiplier = parseFloat(c.req.query('boost') || '1.0')

  const nwgValue = CARD_NWG_VALUES[rarity as keyof typeof CARD_NWG_VALUES] || 500
  const dailyYield = CARD_YIELD_RATES[rarity as keyof typeof CARD_YIELD_RATES] || 10

  const totalValue = nwgValue * count
  const dailyEarnings = dailyYield * count * boostMultiplier
  const projectedEarnings = dailyEarnings * stakeDays
  const roi = ((projectedEarnings / totalValue) * 100).toFixed(2)

  return c.json({
    success: true,
    input: { rarity, count, stakeDays, boostMultiplier },
    calculation: {
      cardValue: nwgValue,
      totalValue,
      dailyYield,
      dailyEarnings: Math.round(dailyEarnings),
      projectedEarnings: Math.round(projectedEarnings),
      roiPercent: `${roi}%`,
      breakEvenDays: Math.ceil(totalValue / dailyEarnings),
    },
    comparison: {
      common: { value: 100, daily: 1, monthly: 30 },
      uncommon: { value: 250, daily: 3, monthly: 90 },
      rare: { value: 500, daily: 10, monthly: 300 },
      epic: { value: 2000, daily: 50, monthly: 1500 },
      legendary: { value: 10000, daily: 200, monthly: 6000 },
      mythic: { value: 50000, daily: 1000, monthly: 30000 },
    },
  })
})

export default router
