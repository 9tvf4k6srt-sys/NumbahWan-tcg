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

// 🕯️ GUILD CONFESSIONAL BOOTH - "Unburden your TCG soul"

// AI Priest response generator
const PRIEST_RESPONSES: Record<string, string[]> = {
  greed: [
    'Regina forgives you. Your wallet does not.',
    'Your penance: F2P for one week. May your restraint be tested.',
    'The gacha gods have noted your excessive... enthusiasm.',
    'Greed is merely passion without patience. Delete 10 commons as penance.',
    'Your credit card weeps. Say 3 Hail Reginas and check your bank balance.',
  ],
  addiction: [
    'Your dedication to disappointment is inspiring. Touch grass for 10 minutes.',
    "The forge is not a lifestyle, it's a game. A very, very addictive game.",
    'Sleep is for those without login bonuses. You are forgiven... this time.',
    'Your penance: Actually play a different game. Any game. For one hour.',
    'The daily reset will wait. Your health will not. Rest, child.',
  ],
  betrayal: [
    'Trust, once broken, requires many Sacred Logs to repair.',
    'Your actions echo in the void. Send an apology gift of 100 gold.',
    'The guild remembers. The guild always remembers.',
    'Your penance: Help 3 newbies without expecting anything in return.',
    'Multi-accounting is the path to the dark side. Delete your alts.',
  ],
  stupidity: [
    'Reading is fundamental, my child. Your penance: Read all tooltips.',
    'The forge thanks you for your generous sacrifice. Others do not.',
    'Mistakes are the tuition of wisdom. Consider yourself educated.',
    'Your penance: Actually read the confirmation popup. Out loud. Twice.',
    'Even legends were once noobs. You are on the right path. Keep failing forward.',
  ],
  salt: [
    'The salt flows through you. Your penance: Send a sincere GG.',
    'Jealousy is just admiration wearing a disguise. Compliment their collection.',
    "Your opponent's luck is not a personal attack. Breathe.",
    'RNG favors no one... except that guy. Seriously, how does he do it?',
    'Your penance: Report only actual cheaters. Salt is not a valid report reason.',
  ],
  shame: [
    'Shame is the first step to redemption. The second is logging off.',
    'We have all been there. Some of us are still there. You are not alone.',
    'Your secret is safe with the confessional. And the 500 people reading this.',
    'Embarrassment is temporary. Screenshots are forever. Be cautious.',
    'Your penance: Embrace your cringe. Post it in general chat.',
  ],
}

// Generate AI priest response based on sin category
function generatePriestResponse(category: string): string {
  const responses = PRIEST_RESPONSES[category] || PRIEST_RESPONSES.shame
  return responses[Math.floor(Math.random() * responses.length)]
}

// GET /api/confessions - Get recent confessions
router.get('/confessions', async (c) => {
  const sort = c.req.query('sort') || 'new' // 'new' or 'hot'
  const limit = parseInt(c.req.query('limit') || '20', 10)
  const offset = parseInt(c.req.query('offset') || '0', 10)
  const category = c.req.query('category') // Optional filter

  try {
    // Try D1 database first
    if (c.env?.GUILD_DB) {
      let query = 'SELECT * FROM confessions WHERE reported < 5'
      const params: any[] = []

      if (category) {
        query += ' AND sin_category = ?'
        params.push(category)
      }

      if (sort === 'hot') {
        query += ' ORDER BY prayers DESC, created_at DESC'
      } else {
        query += ' ORDER BY created_at DESC'
      }

      query += ' LIMIT ? OFFSET ?'
      params.push(limit, offset)

      const result = await c.env.GUILD_DB.prepare(query)
        .bind(...params)
        .all()

      // Get sinner of the week
      const sinnerResult = await c.env.GUILD_DB.prepare(`
        SELECT c.*, s.total_prayers as week_prayers
        FROM sinner_of_week s
        JOIN confessions c ON c.id = s.confession_id
        ORDER BY s.week_start DESC LIMIT 1
      `).all()

      return c.json({
        success: true,
        confessions: result.results || [],
        sinnerOfWeek: sinnerResult.results?.[0] || null,
        total: result.results?.length || 0,
      })
    }
  } catch (e) {
    console.error('[Confessional] D1 error:', e)
  }

  // Fallback: Return seed data for demo
  const seedConfessions = [
    {
      id: 1,
      confession_text: 'I spent 500 logs chasing a mythic and got 47 copies of the same common',
      sin_category: 'addiction',
      priest_response:
        "Your dedication to disappointment is noted. Say 5 'May the pulls be ever in your favor' and touch grass for 10 minutes.",
      prayers: 127,
      sames: 89,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 2,
      confession_text: "I told my wife the $200 charge was for 'work software'",
      sin_category: 'greed',
      priest_response: 'Regina forgives you. Your bank account does not. Your penance: F2P for one week.',
      prayers: 256,
      sames: 142,
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 3,
      confession_text: 'I accidentally fed my only mythic to the forge because I was pulling while half asleep at 3am',
      sin_category: 'stupidity',
      priest_response:
        "The forge thanks you for your generous sacrifice. Your mythic is in a better place now (someone else's collection).",
      prayers: 89,
      sames: 34,
      created_at: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: 4,
      confession_text: "I mass-sold my legendaries for 1 NWG each because I didn't read the confirmation popup",
      sin_category: 'stupidity',
      priest_response: 'Reading is fundamental, my child. Your penance: Actually read the Terms of Service. All of it.',
      prayers: 312,
      sames: 201,
      created_at: new Date(Date.now() - 14400000).toISOString(),
    },
    {
      id: 5,
      confession_text: 'I set a 4am alarm every day to catch the daily reset',
      sin_category: 'addiction',
      priest_response: 'The gacha gods appreciate your devotion. Your sleep schedule does not.',
      prayers: 178,
      sames: 156,
      created_at: new Date(Date.now() - 18000000).toISOString(),
    },
    {
      id: 6,
      confession_text: "I have 47 copies of the same card because 'what if they buff it'",
      sin_category: 'greed',
      priest_response: 'Hope is a beautiful thing. So is inventory management. Delete 46 of them.',
      prayers: 145,
      sames: 88,
      created_at: new Date(Date.now() - 21600000).toISOString(),
    },
    {
      id: 7,
      confession_text: 'I pretend to understand the meta but I just use whatever looks cool',
      sin_category: 'shame',
      priest_response: 'Aesthetics > Statistics. You are forgiven, fashion icon.',
      prayers: 234,
      sames: 198,
      created_at: new Date(Date.now() - 25200000).toISOString(),
    },
    {
      id: 8,
      confession_text: "I reported someone for 'cheating' when they just had better cards than me",
      sin_category: 'salt',
      priest_response: "The salt flows through you. Your penance: Send them a 'GG' and mean it.",
      prayers: 156,
      sames: 112,
      created_at: new Date(Date.now() - 28800000).toISOString(),
    },
  ]

  const sorted = sort === 'hot' ? [...seedConfessions].sort((a, b) => b.prayers - a.prayers) : seedConfessions

  const filtered = category ? sorted.filter((c) => c.sin_category === category) : sorted

  return c.json({
    success: true,
    confessions: filtered.slice(offset, offset + limit),
    sinnerOfWeek: sorted[0], // Top by prayers
    total: filtered.length,
    isDemo: true,
  })
})

// POST /api/confess - Submit a new confession
router.post('/confess', async (c) => {
  try {
    const body = await c.req.json()
    const { confession, category, deviceId: _deviceId, language } = body

    if (!confession || confession.trim().length < 10) {
      return c.json({ success: false, error: 'Confession must be at least 10 characters' }, 400)
    }

    if (confession.length > 500) {
      return c.json({ success: false, error: 'Confession must be under 500 characters' }, 400)
    }

    const validCategories = ['greed', 'addiction', 'betrayal', 'stupidity', 'salt', 'shame']
    const sinCategory = validCategories.includes(category) ? category : 'shame'

    // Generate AI priest response
    const priestResponse = generatePriestResponse(sinCategory)

    // Try D1 database
    if (c.env?.GUILD_DB) {
      const result = await c.env.GUILD_DB.prepare(`
        INSERT INTO confessions (confession_text, sin_category, priest_response, language)
        VALUES (?, ?, ?, ?)
      `)
        .bind(confession.trim(), sinCategory, priestResponse, language || 'en')
        .run()

      return c.json({
        success: true,
        id: result.meta.last_row_id,
        priestResponse,
        message: 'Your confession has been received. May Regina have mercy on your pulls.',
      })
    }

    // Fallback for demo
    return c.json({
      success: true,
      id: Date.now(),
      priestResponse,
      message: 'Your confession has been received. May Regina have mercy on your pulls.',
      isDemo: true,
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/confessions/:id/pray - Pray for a confession
router.post('/confessions/:id/pray', async (c) => {
  try {
    const confessionId = parseInt(c.req.param('id'), 10)
    const body = await c.req.json()
    const { deviceId, reactionType } = body

    if (!confessionId) {
      return c.json({ success: false, error: 'Invalid confession ID' }, 400)
    }

    const validReactions = ['pray', 'same', 'report']
    const reaction = validReactions.includes(reactionType) ? reactionType : 'pray'

    // Try D1 database
    if (c.env?.GUILD_DB) {
      // Check if already reacted
      const existing = await c.env.GUILD_DB.prepare(`
        SELECT id FROM confession_prayers
        WHERE confession_id = ? AND device_id = ? AND reaction_type = ?
      `)
        .bind(confessionId, deviceId || 'anonymous', reaction)
        .first()

      if (existing) {
        return c.json({ success: false, error: 'You have already reacted to this confession' }, 400)
      }

      // Add prayer/reaction
      await c.env.GUILD_DB.prepare(`
        INSERT INTO confession_prayers (confession_id, device_id, reaction_type)
        VALUES (?, ?, ?)
      `)
        .bind(confessionId, deviceId || 'anonymous', reaction)
        .run()

      // Update confession count
      const column = reaction === 'pray' ? 'prayers' : reaction === 'same' ? 'sames' : 'reported'
      await c.env.GUILD_DB.prepare(`
        UPDATE confessions SET ${column} = ${column} + 1 WHERE id = ?
      `)
        .bind(confessionId)
        .run()

      // Get updated confession
      const updated = await c.env.GUILD_DB.prepare(`
        SELECT prayers, sames, reported FROM confessions WHERE id = ?
      `)
        .bind(confessionId)
        .first()

      return c.json({
        success: true,
        reaction,
        prayers: updated?.prayers || 0,
        sames: updated?.sames || 0,
        message:
          reaction === 'pray'
            ? '🙏 Your prayer has been noted'
            : reaction === 'same'
              ? '💀 Solidarity recorded'
              : '🚨 Report submitted for review',
      })
    }

    // Fallback for demo
    return c.json({
      success: true,
      reaction,
      prayers: Math.floor(Math.random() * 100) + 50,
      sames: Math.floor(Math.random() * 50) + 20,
      message:
        reaction === 'pray'
          ? '🙏 Your prayer has been noted'
          : reaction === 'same'
            ? '💀 Solidarity recorded'
            : '🚨 Report submitted for review',
      isDemo: true,
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/confessions/stats - Get confessional statistics
router.get('/confessions/stats', async (c) => {
  try {
    if (c.env?.GUILD_DB) {
      const stats = await c.env.GUILD_DB.prepare(`
        SELECT
          COUNT(*) as totalConfessions,
          SUM(prayers) as totalPrayers,
          SUM(sames) as totalSames,
          (SELECT COUNT(DISTINCT device_id) FROM confession_prayers) as uniqueSinners
        FROM confessions
      `).first()

      const categoryStats = await c.env.GUILD_DB.prepare(`
        SELECT sin_category, COUNT(*) as count
        FROM confessions
        GROUP BY sin_category
        ORDER BY count DESC
      `).all()

      return c.json({
        success: true,
        stats: {
          totalConfessions: stats?.totalConfessions || 0,
          totalPrayers: stats?.totalPrayers || 0,
          totalSames: stats?.totalSames || 0,
          uniqueSinners: stats?.uniqueSinners || 0,
          byCategory: categoryStats.results || [],
        },
      })
    }
  } catch (e) {
    console.error('[Confessional Stats] Error:', e)
  }

  // Fallback demo stats
  return c.json({
    success: true,
    stats: {
      totalConfessions: 1247,
      totalPrayers: 28934,
      totalSames: 12847,
      uniqueSinners: 892,
      byCategory: [
        { sin_category: 'addiction', count: 423 },
        { sin_category: 'greed', count: 312 },
        { sin_category: 'stupidity', count: 234 },
        { sin_category: 'shame', count: 156 },
        { sin_category: 'salt', count: 89 },
        { sin_category: 'betrayal', count: 33 },
      ],
    },
    isDemo: true,
  })
})

export default router
