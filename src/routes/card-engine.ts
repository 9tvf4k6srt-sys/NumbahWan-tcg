import { Hono } from 'hono'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

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

// CARD ENGINE API - Rebalance, Audit, Combat Simulation, Meta Analysis
// Automatic card mechanic rebalancing/audit system for long-term balance

// NW-CARD-ENGINE v2.0 — Server-Side Balance Rules
// Matches nw-card-engine.js v2.0 (Age of Alimony)
// Shrine penalty: 88% power budget vs NW cards
const TIER_RULES: any = {
  common: {
    costRange: [1, 2],
    atkRange: [1, 3],
    hpRange: [1, 6],
    maxPower: 12,
    maxAbilities: 0,
    critCap: 0.1,
    dodgeCap: 0.1,
  },
  uncommon: {
    costRange: [1, 3],
    atkRange: [1, 4],
    hpRange: [2, 7],
    maxPower: 15,
    maxAbilities: 0,
    critCap: 0.14,
    dodgeCap: 0.14,
  },
  rare: {
    costRange: [2, 4],
    atkRange: [2, 5],
    hpRange: [2, 7],
    maxPower: 19,
    maxAbilities: 1,
    critCap: 0.15,
    dodgeCap: 0.15,
  },
  epic: {
    costRange: [3, 5],
    atkRange: [2, 7],
    hpRange: [3, 9],
    maxPower: 25,
    maxAbilities: 1,
    critCap: 0.18,
    dodgeCap: 0.18,
  },
  legendary: {
    costRange: [5, 8],
    atkRange: [4, 8],
    hpRange: [6, 11],
    maxPower: 32,
    maxAbilities: 2,
    critCap: 0.2,
    dodgeCap: 0.18,
  },
  mythic: {
    costRange: [7, 10],
    atkRange: [6, 10],
    hpRange: [5, 11],
    maxPower: 40,
    maxAbilities: 3,
    critCap: 0.2,
    dodgeCap: 0.1,
  },
}
const SHRINE_PENALTY = 0.88
const calcCardPower = (card: any) => {
  const gs = card.gameStats || {}
  return (
    (gs.atk || 0) * 1.5 + (gs.hp || 0) + (gs.crit || 0) * 30 + (gs.dodge || 0) * 25 + (gs.abilities || []).length * 3
  )
}

// GET /api/card-engine/audit - Run full audit on all cards
router.get('/audit', async (c) => {
  try {
    // Load card data
    const cardsData = await import('../../public/static/data/cards-v2.json')
    const cards = cardsData.cards || cardsData.default?.cards || []

    const tiers = TIER_RULES

    const tierStats: any = {}
    for (const rarity of Object.keys(tiers)) {
      const tier = cards.filter((c: any) => c.rarity === rarity)
      if (!tier.length) continue
      const powers = tier.map(calcCardPower)
      tierStats[rarity] = {
        count: tier.length,
        avgPower: +(powers.reduce((a: number, b: number) => a + b, 0) / tier.length).toFixed(1),
        minPower: +Math.min(...powers).toFixed(1),
        maxPower: +Math.max(...powers).toFixed(1),
      }
    }

    const issues: any[] = []
    for (const card of cards) {
      const gs = (card as any).gameStats || {}
      const rules = (tiers as any)[(card as any).rarity]
      if (!rules) continue
      const power = calcCardPower(card)
      const isShrine = (card as any).set === 'shrine'
      const effectiveMax = isShrine ? rules.maxPower * SHRINE_PENALTY : rules.maxPower
      const cardIssues: any[] = []

      if ((gs.crit || 0) > rules.critCap) cardIssues.push({ type: 'CRIT_OVERCAP', severity: 'fix' })
      if ((gs.dodge || 0) > rules.dodgeCap) cardIssues.push({ type: 'DODGE_OVERCAP', severity: 'fix' })
      if ((gs.abilities || []).length > rules.maxAbilities)
        cardIssues.push({ type: 'TOO_MANY_ABILITIES', severity: 'fix' })
      if (power > effectiveMax)
        cardIssues.push({
          type: 'OVER_BUDGET',
          msg: `Power ${power.toFixed(1)} > ${effectiveMax.toFixed(1)}${isShrine ? ' (shrine-penalized)' : ''}`,
          severity: 'fix',
        })

      const tierOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
      const idx = tierOrder.indexOf((card as any).rarity)
      const nextTier = idx < 5 ? tierOrder[idx + 1] : null
      if (nextTier && tierStats[nextTier] && power > tierStats[nextTier].avgPower)
        cardIssues.push({ type: 'CROSS_TIER_OP', severity: 'critical' })

      if (cardIssues.length > 0) {
        issues.push({
          id: (card as any).id,
          name: (card as any).name,
          rarity: (card as any).rarity,
          set: (card as any).set,
          power: +power.toFixed(1),
          issues: cardIssues,
        })
      }
    }

    // Shrine vs NW analysis
    const shrineAnalysis: any = {}
    for (const rarity of ['rare', 'epic', 'legendary', 'mythic']) {
      const shrine = cards.filter((c: any) => c.rarity === rarity && c.set === 'shrine')
      const nw = cards.filter((c: any) => c.rarity === rarity && c.set !== 'shrine')
      if (!shrine.length) continue
      const shrinePow = shrine.reduce((s: number, c: any) => s + calcCardPower(c), 0) / shrine.length
      const nwPow = nw.length ? nw.reduce((s: number, c: any) => s + calcCardPower(c), 0) / nw.length : 0
      shrineAnalysis[rarity] = {
        shrinePower: +shrinePow.toFixed(1),
        nwPower: +nwPow.toFixed(1),
        ratio: nwPow ? +((shrinePow / nwPow) * 100).toFixed(1) : 0,
        isWeaker: shrinePow < nwPow,
        verdict: shrinePow < nwPow ? 'SHRINE WEAKER (correct)' : 'WARN: shrine too strong!',
      }
    }

    return c.json({
      success: true,
      totalCards: cards.length,
      totalIssues: issues.length,
      criticalIssues: issues.filter((i: any) => i.issues.some((x: any) => x.severity === 'critical')).length,
      tierStats,
      shrineAnalysis,
      issues,
      lastRebalance: (cardsData as any).lastRebalance || (cardsData as any).default?.lastRebalance || null,
      rebalanceVersion: (cardsData as any).rebalanceVersion || (cardsData as any).default?.rebalanceVersion || null,
      engine: 'nw-card-engine v2.0',
      designPhilosophy:
        'NW cards = #1 raw power. Shrine cards = exciting underdogs (77-98% power). Asmongold wins ONLY with perfect play + luck.',
    })
  } catch (e) {
    return c.json({ success: false, error: `Audit failed: ${String(e)}` }, 500)
  }
})

// GET /api/card-engine/meta - Get meta analysis (best cards, combos, winrates)
router.get('/meta', (c) => {
  return c.json({
    success: true,
    meta: {
      season: 1,
      designNote:
        'NW cards are the consistent winners. Asmongold shrine cards CANNOT win on their own — they need perfect play + luck.',
      topDecks: [
        {
          name: 'RegginA All-Stars',
          cards: [1, 101, 102, 104, 105],
          winRate: 94.7,
          set: 'origins+core',
          desc: 'Pure mythic power — raw stat dominance. THE meta deck.',
        },
        {
          name: 'The Asmongold Special',
          cards: [700, 701, 702, 704, 705],
          winRate: 47.2,
          set: 'shrine',
          desc: 'Shrine synergy deck — CAN win with perfect RNG (Chat positive + crit + sovereign gamble), but usually loses to NW decks.',
        },
        {
          name: 'Legendary Core',
          cards: [201, 202, 207, 210, 212],
          winRate: 80.0,
          set: 'core',
          desc: 'Balanced legendary core set synergy — reliable tier 2 choice',
        },
      ],
      bestCombos: [
        {
          cards: ['Asmongold + McConnell'],
          synergy: 'The Zack & Rich Show',
          effect:
            '+15% Crit, McConnell gains TAUNT (reluctantly), Asmongold +50% LIFESTEAL heal — BUT if McConnell dies, LIFESTEAL bonus breaks',
        },
        {
          cards: ['Dr Pepper + Any Carry'],
          synergy: 'Dr Pepper Power Hour',
          effect: '60% chance RUSH triggers twice (sugar rush), 40% chance sugar crash (-10% ATK round 2)',
        },
        { cards: ['2x Carry'], synergy: 'The Classic Carry', effect: '+15% ATK to both carries' },
        {
          cards: ['Theory Crafter + Troll'],
          synergy: 'Divorced Dad Energy',
          effect: '+12% Crit (spite-fueled precision)',
        },
        { cards: ['2x Guild Parent'], synergy: 'The Parent Trap', effect: 'Full team heals 10% HP/round' },
        { cards: ['Carry + Leech'], synergy: 'Carry Me Please', effect: 'Carry +20% ATK, Leech +30% HP' },
        {
          cards: ['Chat (706)'],
          synergy: 'Chat Decides',
          effect: '50% chance +20% ATK or -15% ATK — pure chaos, a LIABILITY',
        },
        {
          cards: ['2x Rage Quitter'],
          synergy: 'Rage Quit Chain Reaction',
          effect: 'When one dies, the other deals +50% ATK',
        },
      ],
      abilities: {
        RUSH: { effect: 'Attack first, +20% ATK on first strike', bestOn: ['carry', 'grinder'] },
        CRIT_BOOST: { effect: 'Crit +15%, crits deal 2x damage', bestOn: ['carry', 'theory_crafter'] },
        LIFESTEAL: { effect: 'Heal 30% of damage dealt', bestOn: ['carry', 'leech'] },
        TAUNT: { effect: 'Force enemies to attack this card, +20% HP', bestOn: ['grinder', 'guild_parent'] },
        SHIELD: { effect: 'Block the first hit entirely', bestOn: ['guild_parent', 'grinder'] },
        BUFF: { effect: 'Boost team ATK by 10% (stacks)', bestOn: ['simp', 'guild_parent'] },
        STEALTH: { effect: 'Untargetable 1 round, +25% ATK from shadows', bestOn: ['lurker', 'leech'] },
        DODGE: { effect: '25% dodge chance', bestOn: ['lurker', 'fashion_main'] },
        DODGE_BOOST: { effect: '+10% dodge for entire team', bestOn: ['lurker', 'troll'] },
        DEBUFF: { effect: 'Reduce enemy ATK by 15% for 2 rounds', bestOn: ['troll', 'lurker'] },
        HEAL: { effect: 'Heal lowest HP teammate 25% each round', bestOn: ['guild_parent', 'simp'] },
        SELF_DESTRUCT: { effect: 'On death: 150% ATK to all enemies', bestOn: ['rage_quitter', 'troll'] },
      },
      setBonuses: {
        shrine: [
          '2: +5% Crit (modest)',
          '3: "React Harder" — 50/50: abilities trigger twice OR fizzle R1',
          '5: "Bald Sovereign Plea" — 70% chance +15% stats, 30% chance Chat trolls (-10% ATK)',
          '7: "IT IS WHAT IT IS" — +20% ATK/HP + crit R1 BUT ONLY if Asmongold alive AND 40% lucky roll',
        ],
        core: [
          '3: +5% HP (reliable)',
          '5: +10% HP, +5% Crit (solid)',
          '8: "Guild Bond" — TAUNT cards gain SHIELD (fortress)',
        ],
        origins: ['2: +10% ATK (carry diff, always fires)', '4: RUSH on all origins, +15% Crit'],
        moments: ['3: +8% Dodge', '5: "Plot Armor" — first death revives 30% HP'],
        gear: ['3: +5% ATK/HP', '5: SHIELD on all gear cards'],
        vibes: ['3: +10% Crit', '5: +25% ATK but -10% HP (tilt mode)'],
      },
    },
  })
})

// GET /api/card-engine/synergies - Get all synergies and their requirements
router.get('/synergies', (c) => {
  return c.json({
    success: true,
    roleSynergies: [
      {
        name: 'The Classic Carry',
        requires: '2x carry',
        effect: '+15% ATK to both',
        flavor: '"Just duo queue, bro." — Famous last words',
      },
      {
        name: 'The Grind Never Stops',
        requires: '3x grinder',
        effect: '+20% HP to grinders',
        flavor: '"Sleep is for the numbahtwo guild."',
      },
      {
        name: 'Trolling is a Art',
        requires: '2x troll',
        effect: 'Random enemy -20% ATK',
        flavor: '"kekw" — Ancient troll scripture',
      },
      {
        name: 'The Lurker Network',
        requires: '3x lurker',
        effect: '+15% Dodge to all',
        flavor: '"We were here the whole time. Watching."',
      },
      {
        name: 'Whale Spending Spree',
        requires: '2x whale',
        effect: '+10% all stats',
        flavor: '"I spent $500 on this game and I\'ll spend $500 more."',
      },
      {
        name: 'AFK but Still Winning',
        requires: '3x afk_king',
        effect: 'Auto-heal 5% HP/round',
        flavor: '"brb" — Last seen 3 weeks ago',
      },
      {
        name: 'Simp Shield',
        requires: '2x simp',
        effect: '+10% HP to all',
        flavor: '"I would die for content." — Every simp ever',
      },
      {
        name: 'Rage Quit Chain Reaction',
        requires: '2x rage_quitter',
        effect: 'Death fury +50% ATK',
        flavor: '"THIS GAME IS TRASH. *queues again*"',
      },
      {
        name: 'The Parent Trap',
        requires: '2x guild_parent',
        effect: 'Team heals 10% HP/round',
        flavor: '"Did everyone eat? Did everyone pot? WHO DIED ALREADY?"',
      },
      {
        name: 'Divorced Dad Energy',
        requires: 'theory_crafter + troll',
        effect: '+12% Crit (spite-fueled)',
        flavor: '"Actually, if you read the patch notes—" "NOBODY CARES, NERD"',
      },
      {
        name: 'Carry Me Please',
        requires: 'carry + leech',
        effect: 'Carry +20% ATK, Leech +30% HP',
        flavor: '"I contributed emotionally." — The leech',
      },
      {
        name: 'Alimony Payment',
        requires: 'whale + leech',
        effect: 'When whale dies, enemy -15% ATK',
        flavor: '"The court has ruled: half of everything goes."',
      },
      {
        name: 'Custody Battle',
        requires: 'carry + guild_parent',
        effect: 'Carry +10% ATK, Parent +15% HP (stress eating)',
        flavor: '"I got the kids this weekend." "You got the kids LAST weekend."',
      },
      {
        name: 'Weekend Dad',
        requires: 'afk_king + carry',
        effect: 'AFK auto-heal 8%, Carry +5% ATK',
        flavor: '"I\'ll be there for the boss fight. Probably."',
      },
      {
        name: 'The Zack & Rich Show',
        requires: 'Asmongold (700) + McConnell (702)',
        effect:
          '+15% Crit, McConnell gains TAUNT, Asmongold +50% LIFESTEAL — BUT McConnell is fragile, if he dies LIFESTEAL bonus BREAKS',
        flavor: '"We\'re not friends." — Both of them',
      },
      {
        name: 'Dr Pepper Power Hour',
        requires: 'Dr Pepper (704) + any carry',
        effect: '60% sugar rush (RUSH x2), 40% sugar crash (-10% ATK R2)',
        flavor: '"23 flavors of MAYBE winning."',
      },
      {
        name: 'Chat Decides',
        requires: 'Chat (706) in team',
        effect: '50% +20% ATK, 50% -15% ATK — a LIABILITY',
        flavor: '"KEKW" — 10,000 voices making your strategy meaningless',
      },
      {
        name: 'Cockroach Endurance',
        requires: 'Cockroach (705) + 3 shrine',
        effect: 'Auto-revive once at 15% HP. Still hits like a wet noodle.',
        flavor: '"Even after the apocalypse, this thing will still be watching streams."',
      },
      {
        name: 'The Full Asmon Experience',
        requires: '700+701+702+704',
        effect: 'IF Chat positive AND crit R1: +30% ATK. Otherwise +5%. Stars must align.',
        flavor: '"It is what it is... and what it is, is a coin flip."',
      },
    ],
    engine: 'nw-card-engine v2.0',
  })
})

// POST /api/card-engine/simulate - Simulate a battle between two teams
// v2.0: NO auto-win bonuses. Shrine bonuses are LUCK-DEPENDENT.
router.post('/simulate', async (c) => {
  try {
    const body = await c.req.json()
    const { teamAIds, teamBIds, runs = 1 } = body
    if (!teamAIds || !teamBIds || !Array.isArray(teamAIds) || !Array.isArray(teamBIds)) {
      return c.json({ success: false, error: 'Provide teamAIds and teamBIds arrays' }, 400)
    }

    const cardsData = await import('../../public/static/data/cards-v2.json')
    const cards = cardsData.cards || cardsData.default?.cards || []

    const teamA = teamAIds.map((id: number) => cards.find((c: any) => c.id === id)).filter(Boolean)
    const teamB = teamBIds.map((id: number) => cards.find((c: any) => c.id === id)).filter(Boolean)

    if (teamA.length === 0 || teamB.length === 0) {
      return c.json({ success: false, error: 'Invalid card IDs' }, 400)
    }

    const teamAPower = teamA.reduce((s: number, c: any) => s + calcCardPower(c), 0)
    const teamBPower = teamB.reduce((s: number, c: any) => s + calcCardPower(c), 0)

    // Set detection
    const setsA: any = {}
    teamA.forEach((c: any) => {
      setsA[c.set] = (setsA[c.set] || 0) + 1
    })
    const setsB: any = {}
    teamB.forEach((c: any) => {
      setsB[c.set] = (setsB[c.set] || 0) + 1
    })

    const applySetBonuses = (basePower: number, sets: any, ids: Set<number>) => {
      let bonus = 0
      const bonusLog: string[] = []

      // NW Core bonuses (RELIABLE)
      if (sets.core >= 8) {
        bonus += basePower * 0.15
        bonusLog.push('core8: +15% HP (Guild Bond)')
      } else if (sets.core >= 5) {
        bonus += basePower * 0.1
        bonusLog.push('core5: +10% HP, +5% Crit')
      } else if (sets.core >= 3) {
        bonus += basePower * 0.05
        bonusLog.push('core3: +5% HP')
      }

      // Origins (RELIABLE)
      if (sets.origins >= 4) {
        bonus += basePower * 0.2
        bonusLog.push('origins4: RUSH all +15% Crit')
      } else if (sets.origins >= 2) {
        bonus += basePower * 0.1
        bonusLog.push('origins2: +10% ATK')
      }

      // Shrine bonuses (LUCK-DEPENDENT — gambles, not guaranteed)
      if (sets.shrine >= 7) {
        // "IT IS WHAT IT IS" — 40% chance of big payout
        const hasAsmon = ids.has(700)
        const lucky = Math.random() < 0.4
        if (hasAsmon && lucky) {
          bonus += basePower * 0.2
          bonusLog.push('shrine7: IT IS WHAT IT IS (LUCKY!) +20%')
        } else {
          bonus += basePower * 0.05
          bonusLog.push('shrine7: Stars didnt align. +5% consolation.')
        }
      } else if (sets.shrine >= 5) {
        // "Bald Sovereign Plea" — 70% chance +15%, 30% chance debuff
        const lucky = Math.random() < 0.7
        if (lucky) {
          bonus += basePower * 0.12
          bonusLog.push('shrine5: Sovereign Plea WIN +12%')
        } else {
          bonus -= basePower * 0.08
          bonusLog.push('shrine5: Chat trolled! -8%')
        }
      } else if (sets.shrine >= 3) {
        // "React Harder" — 50/50
        const lucky = Math.random() < 0.5
        if (lucky) {
          bonus += basePower * 0.05
          bonusLog.push('shrine3: React Harder WIN +5%')
        } else {
          bonusLog.push('shrine3: React Harder FIZZLE')
        }
      } else if (sets.shrine >= 2) {
        bonus += basePower * 0.03
        bonusLog.push('shrine2: +3% Crit (modest)')
      }

      // Asmon + McConnell synergy (conditional, not auto-win)
      if (ids.has(700) && ids.has(702)) {
        // +15% Crit bonus but McConnell is fragile
        bonus += basePower * 0.1
        bonusLog.push('Zack & Rich Show: +10% (crit+lifesteal conditional)')
      }

      // Chat chaos (706) — liability!
      if (ids.has(706)) {
        const positive = Math.random() < 0.5
        if (positive) {
          bonus += basePower * 0.08
          bonusLog.push('Chat: POGGERS +8%')
        } else {
          bonus -= basePower * 0.06
          bonusLog.push('Chat: KEKW -6%')
        }
      }

      return { bonus, bonusLog }
    }

    const aIds = new Set(teamA.map((c: any) => c.id))
    const bIds = new Set(teamB.map((c: any) => c.id))

    // Run simulation(s)
    const numRuns = Math.min(Math.max(1, runs), 1000)
    let aWins = 0
    let lastLog: string[] = []
    let lastResult: any = null

    for (let i = 0; i < numRuns; i++) {
      const bonusDataA = applySetBonuses(teamAPower, setsA, aIds)
      const bonusDataB = applySetBonuses(teamBPower, setsB, bIds)
      const finalA = teamAPower + bonusDataA.bonus
      const finalB = teamBPower + bonusDataB.bonus
      const variance = (Math.random() - 0.5) * 0.1 // ±5% variance
      const winner = finalA * (1 + variance) >= finalB ? 'A' : 'B'
      if (winner === 'A') aWins++
      lastLog = [...bonusDataA.bonusLog, ...bonusDataB.bonusLog]
      lastResult = {
        winner,
        finalA: +finalA.toFixed(1),
        finalB: +finalB.toFixed(1),
        bonusA: +bonusDataA.bonus.toFixed(1),
        bonusB: +bonusDataB.bonus.toFixed(1),
      }
    }

    return c.json({
      success: true,
      result: {
        winner: lastResult.winner,
        teamA: {
          cards: teamA.map((c: any) => ({ id: c.id, name: c.name, rarity: c.rarity })),
          power: +teamAPower.toFixed(1),
          bonus: +lastResult.bonusA,
          total: +lastResult.finalA,
        },
        teamB: {
          cards: teamB.map((c: any) => ({ id: c.id, name: c.name, rarity: c.rarity })),
          power: +teamBPower.toFixed(1),
          bonus: +lastResult.bonusB,
          total: +lastResult.finalB,
        },
        setsA,
        setsB,
        bonusLog: lastLog,
      },
      multiRun:
        numRuns > 1
          ? {
              runs: numRuns,
              teamAWinRate: +((aWins / numRuns) * 100).toFixed(1),
              teamBWinRate: +(((numRuns - aWins) / numRuns) * 100).toFixed(1),
            }
          : undefined,
      engine: 'nw-card-engine v2.0',
    })
  } catch (e) {
    return c.json({ success: false, error: `Simulation failed: ${String(e)}` }, 500)
  }
})

// GET /api/card-engine/balance-report - Full balance health report
router.get('/balance-report', async (c) => {
  try {
    const cardsData = await import('../../public/static/data/cards-v2.json')
    const cards = cardsData.cards || cardsData.default?.cards || []

    const tiers = TIER_RULES

    // Tier health scores
    const tierHealth: any = {}
    const tierOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']

    for (const rarity of tierOrder) {
      const tier = cards.filter((c: any) => c.rarity === rarity)
      if (!tier.length) continue
      const powers = tier.map(calcCardPower)
      const avg = powers.reduce((a: number, b: number) => a + b, 0) / tier.length
      const target = tiers[rarity].maxPower * 0.65
      const rules = tiers[rarity]

      let violations = 0
      for (const card of tier) {
        const gs = (card as any).gameStats || {}
        const p = calcCardPower(card)
        const isShrine = (card as any).set === 'shrine'
        const effectiveMax = isShrine ? rules.maxPower * SHRINE_PENALTY : rules.maxPower
        if (p > effectiveMax) violations++
        if ((gs.crit || 0) > rules.critCap) violations++
        if ((gs.dodge || 0) > rules.dodgeCap) violations++
        if ((gs.abilities || []).length > rules.maxAbilities) violations++
      }

      const healthScore = Math.max(0, 100 - (violations / tier.length) * 50 - Math.abs(avg - target) * 2)
      tierHealth[rarity] = {
        count: tier.length,
        avgPower: +avg.toFixed(1),
        target: +target.toFixed(1),
        minPower: +Math.min(...powers).toFixed(1),
        maxPower: +Math.max(...powers).toFixed(1),
        violations,
        healthScore: +healthScore.toFixed(0),
        healthGrade: healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : 'D',
      }
    }

    // Overall health
    const totalViolations = Object.values(tierHealth).reduce((s: number, t: any) => s + t.violations, 0)
    const avgHealth =
      Object.values(tierHealth).reduce((s: number, t: any) => s + t.healthScore, 0) / Object.keys(tierHealth).length

    // Top imbalanced cards
    const imbalanced = cards
      .map((card: any) => {
        const p = calcCardPower(card)
        const rules = tiers[(card as any).rarity]
        if (!rules) return null
        const isShrine = (card as any).set === 'shrine'
        const effectiveMax = isShrine ? rules.maxPower * SHRINE_PENALTY : rules.maxPower
        const deviation = ((p - effectiveMax * 0.65) / (effectiveMax * 0.65)) * 100
        return {
          id: (card as any).id,
          name: (card as any).name,
          rarity: (card as any).rarity,
          set: (card as any).set,
          power: +p.toFixed(1),
          deviation: +deviation.toFixed(1),
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => Math.abs(b.deviation) - Math.abs(a.deviation))
      .slice(0, 15)

    return c.json({
      success: true,
      report: {
        totalCards: cards.length,
        overallHealth: +avgHealth.toFixed(0),
        overallGrade: avgHealth >= 80 ? 'A' : avgHealth >= 60 ? 'B' : avgHealth >= 40 ? 'C' : 'D',
        totalViolations,
        tierHealth,
        mostImbalanced: imbalanced,
        lastUpdated: new Date().toISOString(),
        engine: 'nw-card-engine v2.0',
        season: 1,
        designPhilosophy:
          'NW = #1. Shrine = underdog (88% power budget). Asmongold wins ONLY with perfect play + luck.',
      },
    })
  } catch (e) {
    return c.json({ success: false, error: `Balance report failed: ${String(e)}` }, 500)
  }
})

// GET /api/card-engine/shrine-meta - Shrine card specific meta analysis
// v2.0: Asmongold is an UNDERDOG. No auto-win. Needs perfect play + luck.

export default router
