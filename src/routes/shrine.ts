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
// SHRINE API - Asmongold Summoning Shrine
// The React Lord Collection - Viral summoning mechanic
// ============================================================================

// In-memory shrine state (demo; production uses KV/D1)
const shrineState = {
  globalCount: 47832, // Start with some existing summons for social proof
  prayers: [
    {
      id: 1,
      text: "Dear Bald One, please grace our guild with your presence. We've been grinding for 3 weeks.",
      flames: 342,
      walletId: 'NW-SEED01',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 2,
      text: 'My copium reserves are running low. We need you, Zack.',
      flames: 256,
      walletId: 'NW-SEED02',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 3,
      text: 'I sacrificed 200 Sacred Logs for this. Please. PLEASE.',
      flames: 189,
      walletId: 'NW-SEED03',
      created_at: new Date(Date.now() - 14400000).toISOString(),
    },
    {
      id: 4,
      text: "McConnell told me this wouldn't work. Prove him wrong.",
      flames: 445,
      walletId: 'NW-SEED04',
      created_at: new Date(Date.now() - 21600000).toISOString(),
    },
    {
      id: 5,
      text: "If you come to MapleStory, I'll donate my entire transmog collection.",
      flames: 167,
      walletId: 'NW-SEED05',
      created_at: new Date(Date.now() - 28800000).toISOString(),
    },
    {
      id: 6,
      text: "The cockroach in my apartment said you'd come. Don't make it a liar.",
      flames: 523,
      walletId: 'NW-SEED06',
      created_at: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: 7,
      text: "Day 47 of summoning. The shrine is starting to crack. Or maybe that's just me.",
      flames: 298,
      walletId: 'NW-SEED07',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 8,
      text: "It is what it is. But it doesn't have to be.",
      flames: 712,
      walletId: 'NW-SEED08',
      created_at: new Date(Date.now() - 172800000).toISOString(),
    },
  ],
  nextPrayerId: 9,
  summoners: new Map<string, { attempts: number; bestPull: string }>(),
  milestoneReached: new Set<number>(),
}

// GET /api/shrine/count - Global summoning counter
router.get('/count', (c) => {
  return c.json({
    success: true,
    count: shrineState.globalCount,
    milestone:
      shrineState.globalCount >= 1000000
        ? '1M'
        : shrineState.globalCount >= 100000
          ? '100K'
          : shrineState.globalCount >= 10000
            ? '10K'
            : null,
    nextMilestone:
      shrineState.globalCount < 10000
        ? 10000
        : shrineState.globalCount < 100000
          ? 100000
          : shrineState.globalCount < 1000000
            ? 1000000
            : 10000000,
  })
})

// POST /api/shrine/summon - Perform a summoning attempt
router.post('/summon', async (c) => {
  try {
    const body = await c.req.json()
    const walletId = body.walletId || 'anon'

    shrineState.globalCount++

    // Track per-summoner stats
    const summoner = shrineState.summoners.get(walletId) || { attempts: 0, bestPull: 'None yet' }
    summoner.attempts++
    shrineState.summoners.set(walletId, summoner)

    // Check milestone triggers
    const milestones = [10000, 100000, 1000000]
    let milestoneHit = null
    for (const m of milestones) {
      if (shrineState.globalCount >= m && !shrineState.milestoneReached.has(m)) {
        shrineState.milestoneReached.add(m)
        milestoneHit = m
      }
    }

    return c.json({
      success: true,
      count: shrineState.globalCount,
      yourAttempts: summoner.attempts,
      milestoneHit,
    })
  } catch (_e) {
    shrineState.globalCount++
    return c.json({ success: true, count: shrineState.globalCount })
  }
})

// GET /api/shrine/prayers - Get prayer wall
router.get('/prayers', (c) => {
  const limit = parseInt(c.req.query('limit') || '20', 10)
  const sorted = [...shrineState.prayers].sort((a, b) => b.flames - a.flames)
  return c.json({
    success: true,
    prayers: sorted.slice(0, limit),
    total: shrineState.prayers.length,
  })
})

// POST /api/shrine/pray - Submit a prayer
router.post('/pray', async (c) => {
  try {
    const body = await c.req.json()
    const text = (body.text || '').trim()
    const walletId = body.walletId || 'anon'

    if (!text || text.length < 3 || text.length > 200) {
      return c.json({ success: false, error: 'Prayer must be 3-200 characters' }, 400)
    }

    // Basic profanity/spam check
    const prayer = {
      id: shrineState.nextPrayerId++,
      text: text.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      flames: 0,
      walletId: walletId.slice(0, 10),
      created_at: new Date().toISOString(),
    }

    shrineState.prayers.push(prayer)

    // Keep max 200 prayers
    if (shrineState.prayers.length > 200) {
      shrineState.prayers = shrineState.prayers.sort((a, b) => b.flames - a.flames).slice(0, 150)
    }

    return c.json({ success: true, prayer })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/shrine/prayers/:id/flame - Upvote a prayer
router.post('/prayers/:id/flame', (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const prayer = shrineState.prayers.find((p) => p.id === id)
  if (prayer) {
    prayer.flames++
    return c.json({ success: true, flames: prayer.flames })
  }
  return c.json({ success: false, error: 'Prayer not found' }, 404)
})

// GET /api/shrine/leaderboard - Top summoners
router.get('/leaderboard', (c) => {
  const leaders = Array.from(shrineState.summoners.entries())
    .map(([name, data]) => ({ name: name.slice(0, 10), attempts: data.attempts, bestPull: data.bestPull }))
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 10)

  // Seed with demo data if empty
  if (leaders.length < 5) {
    const demoLeaders = [
      { name: 'NW-A7F3B2', attempts: 847, bestPull: 'The Cockroach (Epic)' },
      { name: 'NW-9C1D4E', attempts: 623, bestPull: 'McConnell (Legendary)' },
      { name: 'NW-2EF826', attempts: 412, bestPull: 'Dr Pepper (Epic)' },
      { name: 'NW-8B3F1A', attempts: 389, bestPull: 'Chat (Rare)' },
      { name: 'NW-F4C2D9', attempts: 256, bestPull: 'None yet' },
      { name: 'NW-D1E7C3', attempts: 198, bestPull: 'Chat (Rare)' },
      { name: 'NW-B2A9F1', attempts: 145, bestPull: 'The Cockroach (Epic)' },
    ]
    // Merge demo with real, dedup by name
    const existing = new Set(leaders.map((l) => l.name))
    demoLeaders.forEach((d) => {
      if (!existing.has(d.name)) leaders.push(d)
    })
    leaders.sort((a, b) => b.attempts - a.attempts)
  }

  return c.json({
    success: true,
    leaders: leaders.slice(0, 10),
    globalCount: shrineState.globalCount,
  })
})

// POST /api/shrine/report-pull - Report a card pull (for leaderboard best pull)
router.post('/report-pull', async (c) => {
  try {
    const body = await c.req.json()
    const { walletId, cardName, rarity } = body
    if (!walletId || !cardName) return c.json({ success: false }, 400)

    const summoner = shrineState.summoners.get(walletId)
    if (summoner) {
      const rarityOrder: Record<string, number> = { mythic: 6, legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 }
      const currentBest = summoner.bestPull
      const currentRarity = currentBest ? currentBest.match(/\((\w+)\)/)?.[1] || 'common' : 'common'
      if ((rarityOrder[rarity] || 0) >= (rarityOrder[currentRarity] || 0)) {
        summoner.bestPull = `${cardName} (${rarity.charAt(0).toUpperCase() + rarity.slice(1)})`
      }
    }
    return c.json({ success: true })
  } catch (_e) {
    return c.json({ success: false }, 500)
  }
})

export default router
