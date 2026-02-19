import { Hono } from 'hono'
import type { Bindings } from '../types'

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
// PHYSICAL CARD CLAIM API - QR Code Redemption System
// ============================================================================

// POST /api/physical/verify - Verify a claim code without claiming
router.post('/verify', async (c) => {
  try {
    const body = await c.req.json()
    const { code } = body

    if (!code || code.length < 12) {
      return c.json({ success: false, error: 'INVALID_CODE', message: 'Invalid claim code' }, 400)
    }

    const db = c.env?.GUILD_DB

    // Demo mode without database
    if (!db) {
      // Simulate card lookup based on code prefix
      const demoCards: Record<string, any> = {
        OG: {
          setNumber: 'OG-001',
          cardId: 1,
          name: 'RegginA, The Eternal Flame',
          rarity: 'mythic',
          printNumber: 47,
          totalPrint: 250,
          isFirstEdition: true,
          img: 'reggina-eternal-flame-mythic-v3.webp',
          nwgValue: 1500,
          dailyYield: 5.0,
        },
        LE: {
          setNumber: 'OG-005',
          cardId: 101,
          name: 'RegginA - Practicing Trainee',
          rarity: 'legendary',
          printNumber: 123,
          totalPrint: 1000,
          isFirstEdition: true,
          img: 'mythic-01-practicing-trainee.webp',
          nwgValue: 500,
          dailyYield: 2.5,
        },
        EP: {
          setNumber: 'OG-011',
          cardId: 202,
          name: 'Burnout, The Eternal Grinder',
          rarity: 'epic',
          printNumber: 456,
          totalPrint: 4000,
          isFirstEdition: true,
          img: 'legendary-burnout.webp',
          nwgValue: 200,
          dailyYield: 1.0,
        },
        RA: {
          setNumber: 'OG-019',
          cardId: 309,
          name: 'Server Crash',
          rarity: 'rare',
          printNumber: 789,
          totalPrint: 10000,
          isFirstEdition: true,
          img: 'epic-server-crash.webp',
          nwgValue: 75,
          dailyYield: 0.5,
        },
      }

      const prefix = code.substring(0, 2).toUpperCase()
      const card = demoCards[prefix] || demoCards.OG

      return c.json({
        success: true,
        card,
        rewards: {
          nwg: card.nwgValue,
          physicalBonus: 2.0,
          firstEditionBonus: card.isFirstEdition ? 1.5 : 1.0,
        },
      })
    }

    // Production mode with D1
    const claimCode = (await db
      .prepare('SELECT * FROM physical_claim_codes WHERE code = ?')
      .bind(code.toUpperCase())
      .first()) as Record<string, any> | null

    if (!claimCode) {
      return c.json({ success: false, error: 'NOT_FOUND', message: 'Code not found' }, 404)
    }

    if (claimCode.claimed_by) {
      return c.json({ success: false, error: 'ALREADY_CLAIMED', message: 'This card has already been claimed' })
    }

    if (claimCode.is_blocked) {
      return c.json({ success: false, error: 'BLOCKED', message: 'This code has been blocked' }, 403)
    }

    // Get card info from physical origins set
    const originsSet = await import('../../public/static/data/physical-origins-set.json')
    const cardInfo = originsSet.cards.find((c: any) => c.setNumber === claimCode.set_number)

    return c.json({
      success: true,
      card: {
        setNumber: claimCode.set_number,
        cardId: claimCode.card_id,
        name: cardInfo?.name || 'Unknown Card',
        rarity: claimCode.rarity,
        printNumber: claimCode.print_number,
        totalPrint: claimCode.total_print,
        isFirstEdition: claimCode.is_first_edition === 1,
        isHolographic: claimCode.is_holographic === 1,
        img: getCardImageByRarity(claimCode.rarity, claimCode.card_id),
        nwgValue: cardInfo?.nwgValue || 10,
        dailyYield: cardInfo?.dailyYield || 0.1,
      },
      rewards: {
        nwg: cardInfo?.nwgValue || 10,
        physicalBonus: 2.0,
        firstEditionBonus: claimCode.is_first_edition === 1 ? 1.5 : 1.0,
      },
    })
  } catch (e) {
    console.error('Verify error:', e)
    return c.json({ success: false, error: 'SERVER_ERROR', message: String(e) }, 500)
  }
})

// POST /api/physical/claim - Claim a physical card
router.post('/claim', async (c) => {
  try {
    const body = await c.req.json()
    const { code, deviceUUID } = body

    if (!code || !deviceUUID) {
      return c.json({ success: false, error: 'Missing code or deviceUUID' }, 400)
    }

    const db = c.env?.GUILD_DB

    // Demo mode without database
    if (!db) {
      // Simulate successful claim
      const nwgGranted = 2250 // 1500 * 1.5 first edition bonus

      return c.json({
        success: true,
        nwgGranted,
        card: {
          setNumber: 'OG-001',
          cardId: 1,
          name: 'RegginA, The Eternal Flame',
          rarity: 'mythic',
        },
        message: 'Card claimed successfully! (Demo mode)',
      })
    }

    // Production mode with D1
    const claimCode = (await db
      .prepare('SELECT * FROM physical_claim_codes WHERE code = ?')
      .bind(code.toUpperCase())
      .first()) as Record<string, any> | null

    if (!claimCode) {
      return c.json({ success: false, error: 'Code not found' }, 404)
    }

    if (claimCode.claimed_by) {
      return c.json({ success: false, error: 'Already claimed' }, 400)
    }

    // Get card info
    const originsSet = await import('../../public/static/data/physical-origins-set.json')
    const cardInfo = originsSet.cards.find((c: any) => c.setNumber === claimCode.set_number)

    // Calculate NWG reward
    const baseNwg = cardInfo?.nwgValue || 10
    const firstEditionBonus = claimCode.is_first_edition === 1 ? 1.5 : 1.0
    const nwgGranted = Math.round(baseNwg * firstEditionBonus)

    // Update claim code as claimed
    await db
      .prepare(`
      UPDATE physical_claim_codes 
      SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP, claim_ip = ?, nwg_granted = ?, bonus_multiplier = ?
      WHERE id = ?
    `)
      .bind(deviceUUID, c.req.header('CF-Connecting-IP') || 'unknown', nwgGranted, firstEditionBonus, claimCode.id)
      .run()

    // Create ownership record
    await db
      .prepare(`
      INSERT INTO physical_card_ownership 
      (owner_id, claim_code_id, set_id, set_number, card_id, rarity, print_number, is_first_edition, is_holographic)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        deviceUUID,
        claimCode.id,
        claimCode.set_id,
        claimCode.set_number,
        claimCode.card_id,
        claimCode.rarity,
        claimCode.print_number,
        claimCode.is_first_edition,
        claimCode.is_holographic,
      )
      .run()

    // Log transaction
    await db
      .prepare(`
      INSERT INTO claim_transactions (code, device_uuid, ip_address, user_agent, success, nwg_granted, card_granted)
      VALUES (?, ?, ?, ?, TRUE, ?, ?)
    `)
      .bind(
        code.toUpperCase(),
        deviceUUID,
        c.req.header('CF-Connecting-IP') || 'unknown',
        c.req.header('User-Agent') || 'unknown',
        nwgGranted,
        JSON.stringify({ setNumber: claimCode.set_number, cardId: claimCode.card_id, rarity: claimCode.rarity }),
      )
      .run()

    // Add NWG to wallet
    const citizen = await db
      .prepare(
        'SELECT w.id as wallet_id, w.balance_nwg FROM citizens c JOIN wallets w ON c.id = w.citizen_id WHERE c.device_uuid = ?',
      )
      .bind(deviceUUID)
      .first()

    if (citizen) {
      await db
        .prepare(`
        UPDATE wallets SET balance_nwg = balance_nwg + ?, total_earned_nwg = total_earned_nwg + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `)
        .bind(nwgGranted, nwgGranted, citizen.wallet_id)
        .run()
    }

    return c.json({
      success: true,
      nwgGranted,
      card: {
        setNumber: claimCode.set_number,
        cardId: claimCode.card_id,
        name: cardInfo?.name || 'Unknown Card',
        rarity: claimCode.rarity,
        printNumber: claimCode.print_number,
        isFirstEdition: claimCode.is_first_edition === 1,
      },
      message: 'Card claimed successfully!',
    })
  } catch (e) {
    console.error('Claim error:', e)
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// Helper to get card image by rarity and ID
function getCardImageByRarity(rarity: string, cardId: number): string {
  const images: Record<number, string> = {
    1: 'reggina-eternal-flame-mythic-v3.webp',
    2: 'harlay-dog-of-war-mythic.webp',
    3: 'mythic-05-paladin-reggina.webp',
    107: 'mythic-sacred-log.webp',
    101: 'mythic-01-practicing-trainee.webp',
    102: 'mythic-02-chain-undead.webp',
    103: 'mythic-03-infernal-warlord.webp',
    104: 'mythic-04-sky-sovereign.webp',
    105: 'mythic-05-paladin-reggina.webp',
    106: 'harlay-dog-of-war-mythic.webp',
    202: 'legendary-burnout.webp',
    203: 'legendary-whaleford.webp',
    204: '27-elder-dragon.webp',
    205: 'legendary-webweaver.webp',
    206: 'legendary-afk-luna.webp',
    208: 'legendary-mochi.webp',
    209: 'legendary-404.webp',
    211: 'legendary-capslock.webp',
  }
  return images[cardId] || `${rarity}-${cardId}.webp`
}

// GET /api/physical/my-cards/:deviceUUID - Get user's physical cards
router.get('/my-cards/:deviceUUID', async (c) => {
  try {
    const deviceUUID = c.req.param('deviceUUID')
    const db = c.env?.GUILD_DB

    if (!db) {
      return c.json({ success: true, cards: [], message: 'Demo mode - no database' })
    }

    const { results } = await db
      .prepare(`
      SELECT * FROM physical_card_ownership WHERE owner_id = ? ORDER BY claimed_at DESC
    `)
      .bind(deviceUUID)
      .all()

    return c.json({
      success: true,
      cards: results || [],
      count: results?.length || 0,
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/physical/stats - Get physical card claim statistics
router.get('/stats', async (c) => {
  try {
    const db = c.env?.GUILD_DB

    if (!db) {
      return c.json({
        success: true,
        source: 'mock',
        stats: {
          totalCodes: 50000,
          claimedCodes: 1250,
          claimRate: 2.5,
          byRarity: {
            mythic: { total: 1000, claimed: 47 },
            legendary: { total: 6000, claimed: 150 },
            epic: { total: 32000, claimed: 400 },
            rare: { total: 120000, claimed: 350 },
            uncommon: { total: 200000, claimed: 200 },
            common: { total: 300000, claimed: 103 },
          },
        },
      })
    }

    const { results } = await db.prepare('SELECT * FROM claim_stats').all()

    return c.json({
      success: true,
      source: 'd1',
      stats: results,
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

export default router
