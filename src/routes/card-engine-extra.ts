import { Hono } from 'hono'
import type { Bindings, CardBase } from '../types'
import { calcCardPower, SHRINE_PENALTY, TIER_RULES } from '../types'

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

router.get('/shrine-meta', async (c) => {
  try {
    const cardsData = await import('../../public/static/data/cards-v2.json')
    const cards = cardsData.cards || cardsData.default?.cards || []
    const shrineCards = cards.filter((c: any) => c.set === 'shrine')

    const shrineDetail = shrineCards.map((card: any) => ({
      id: card.id,
      name: card.name,
      rarity: card.rarity,
      role: card.role,
      power: +calcCardPower(card).toFixed(1),
      stats: card.gameStats,
      image:
        card.image ||
        `/static/images/cards/shrine-${card.name
          .toLowerCase()
          .replace(/[^a-z]/g, '-')
          .replace(/-+/g, '-')}.webp`,
    }))

    return c.json({
      success: true,
      shrineMeta: {
        totalShrineCards: shrineCards.length,
        designNote:
          'Shrine cards are UNDERDOGS (77-98% of NW peer power). They CANNOT auto-win. Every bonus is gamble-dependent. Asmongold wins ONLY with flawless play + luck.',
        cards: shrineDetail,
        setBonuses: [
          { count: 2, bonus: '+5% team Crit (modest, needs luck to proc)' },
          { count: 3, bonus: '"React Harder" — 50/50 chance: abilities trigger twice OR fizzle round 1' },
          { count: 5, bonus: '"Bald Sovereign Plea" — 70% chance +15% all stats, 30% chance Chat trolls (-10% ATK)' },
          {
            count: 7,
            bonus:
              '"IT IS WHAT IT IS" — +20% ATK/HP + crit R1 BUT ONLY if Asmongold alive AND 40% lucky roll (otherwise +5% consolation)',
          },
        ],
        uniqueSynergies: [
          {
            name: 'The Zack & Rich Show',
            cards: [700, 702],
            effect:
              '+15% Crit, McConnell gains TAUNT (reluctantly), Asmongold +50% LIFESTEAL heal — BUT if McConnell dies early, LIFESTEAL bonus BREAKS',
          },
          {
            name: 'Dr Pepper Power Hour',
            cards: [704],
            effect: '60% chance RUSH triggers twice (sugar rush), 40% chance sugar crash (-10% ATK round 2)',
          },
          {
            name: 'Chat Decides',
            cards: [706],
            effect: '50% chance +20% ATK, 50% chance -15% ATK — pure chaos, honestly a liability',
          },
          {
            name: 'Cockroach Endurance',
            cards: [705],
            effect: 'With 3+ shrine cards: auto-revive once at 15% HP. Still hits like a wet noodle.',
          },
          {
            name: 'The Full Asmon Experience',
            cards: [700, 701, 702, 704],
            effect: 'IF Chat chaos positive AND crit procs R1: +30% ATK. Otherwise just +5%. The stars must align.',
          },
        ],
        bestDeck: {
          name: 'The Asmongold Special',
          cards: [700, 701, 702, 704, 705],
          estimatedWinRate: 47.2,
          strategy:
            "Stack shrine set bonuses + pray for good RNG. Needs Chat positive, Sovereign gamble, AND crit luck to compete with NW core. Fun as hell when it works, heartbreaking when it doesn't.",
        },
      },
    })
  } catch (e) {
    return c.json({ success: false, error: `Shrine meta failed: ${String(e)}` }, 500)
  }
})

// POST /api/card-engine/rebalance - Run full audit + auto-generate fixes
router.post('/rebalance', async (c) => {
  try {
    const cardsData = await import('../../public/static/data/cards-v2.json')
    const cards = cardsData.cards || cardsData.default?.cards || []

    const fixes: any[] = []
    for (const card of cards) {
      const gs = (card as any).gameStats || {}
      const rules = (TIER_RULES as Record<string, any>)[(card as any).rarity]
      if (!rules) continue
      const power = calcCardPower(card as unknown as CardBase)
      const isShrine = (card as any).set === 'shrine'
      const effectiveMax = isShrine ? rules.maxPower * SHRINE_PENALTY : rules.maxPower
      const cardFixes: any[] = []

      if ((gs.crit || 0) > rules.critCap) cardFixes.push({ field: 'crit', from: gs.crit, to: rules.critCap })
      if ((gs.dodge || 0) > rules.dodgeCap) cardFixes.push({ field: 'dodge', from: gs.dodge, to: rules.dodgeCap })
      if ((gs.abilities || []).length > rules.maxAbilities)
        cardFixes.push({ field: 'abilities', from: gs.abilities, to: gs.abilities.slice(0, rules.maxAbilities) })

      if (power > effectiveMax) {
        const excess = power - effectiveMax * 0.8
        if (excess > 0) {
          const atkReduce = Math.min(Math.ceil(excess / 1.5), Math.max(0, gs.atk - rules.atkRange[0]))
          if (atkReduce > 0) cardFixes.push({ field: 'atk', from: gs.atk, to: gs.atk - atkReduce })
        }
      }

      if (cardFixes.length > 0) {
        fixes.push({
          cardId: (card as any).id,
          cardName: (card as any).name,
          rarity: (card as any).rarity,
          set: (card as any).set,
          changes: cardFixes,
        })
      }
    }

    return c.json({
      success: true,
      totalCards: cards.length,
      fixesGenerated: fixes.length,
      fixes,
      note: 'Fixes are generated but NOT applied. Review and apply manually via applyFixes in nw-card-engine.js.',
      engine: 'nw-card-engine v2.0',
    })
  } catch (e) {
    return c.json({ success: false, error: `Rebalance failed: ${String(e)}` }, 500)
  }
})

// POST /api/card-engine/test-deck - Test a deck's win rate via multi-sim
router.post('/test-deck', async (c) => {
  try {
    const body = await c.req.json()
    const { deckIds, simulations = 200 } = body
    if (!deckIds || !Array.isArray(deckIds) || deckIds.length === 0) {
      return c.json({ success: false, error: 'Provide deckIds array' }, 400)
    }

    const cardsData = await import('../../public/static/data/cards-v2.json')
    const allCards = cardsData.cards || cardsData.default?.cards || []
    const deck = deckIds.map((id: number) => allCards.find((c: any) => c.id === id)).filter(Boolean)
    if (deck.length === 0) return c.json({ success: false, error: 'No valid cards found' }, 400)

    const nonDeckCards = allCards.filter((c: any) => !deckIds.includes(c.id) && c.gameStats)
    const numSims = Math.min(Math.max(10, simulations), 1000)
    let wins = 0

    for (let i = 0; i < numSims; i++) {
      const shuffled = [...nonDeckCards].sort(() => Math.random() - 0.5)
      const opponents = shuffled.slice(0, 5)
      const deckPower = deck.reduce((s: number, c: any) => s + calcCardPower(c), 0)
      const oppPower = opponents.reduce((s: number, c: any) => s + calcCardPower(c), 0)
      // Apply simple variance
      const vA = (Math.random() - 0.5) * 0.1
      const vB = (Math.random() - 0.5) * 0.1
      if (deckPower * (1 + vA) >= oppPower * (1 + vB)) wins++
    }

    return c.json({
      success: true,
      deck: deck.map((c: any) => ({ id: c.id, name: c.name, rarity: c.rarity })),
      winRate: +((wins / numSims) * 100).toFixed(1),
      wins,
      simulations: numSims,
      deckPower: +deck.reduce((s: number, c: any) => s + calcCardPower(c), 0).toFixed(1),
      engine: 'nw-card-engine v2.0',
    })
  } catch (e) {
    return c.json({ success: false, error: `Test-deck failed: ${String(e)}` }, 500)
  }
})

export default router
