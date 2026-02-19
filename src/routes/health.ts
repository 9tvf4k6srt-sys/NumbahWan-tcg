/**
 * Health & Debug Routes
 */
import { Hono } from 'hono'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

const router = new Hono<{ Bindings: Bindings }>()

// Health check - simple ping
router.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '3.0.0',
    architecture: 'modular-routes',
  })
})

// Debug endpoint - comprehensive system diagnostics
router.get('/debug', (c) => {
  const staticPages = [
    'fashion',
    'merch',
    'fortune',
    'arcade',
    'memes',
    'apply',
    'wallet',
    'forge',
    'tcg',
    'market',
    'cards',
    'guide',
    'pvp',
    'regina',
    'zakum',
    'tournament',
    'academy',
    'vault',
    'museum',
    'research',
    'historical-society',
    'menu-demo',
    'business',
    'supermarket',
    'restaurant',
    'services',
    'my-business',
    'staking',
    'fusion',
    'claim',
    'events',
    'auction-house',
    'system-dashboard',
    'card-utility',
  ]

  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    architecture: {
      type: 'modular-routes',
      modules: [
        'health',
        'data',
        'database',
        'market',
        'cards',
        'wallet',
        'market-automation',
        'gamification',
        'card-bridge',
        'purchase',
        'events-merch',
        'confessional',
        'physical',
        'avatar',
        'guide',
        'translate',
        'gm',
        'auction',
      ],
      improvement: 'Monolith split into modular routes with continuous learning',
    },

    project: {
      name: 'NumbahWan Guild',
      codeName: 'webapp',
      path: '/home/user/webapp',
    },

    pages: {
      total: staticPages.length + 2,
      list: ['/', ...staticPages.map((p) => `/${p}`)],
      htmlFiles: staticPages.map((p) => `${p}.html`),
    },

    apis: {
      health: '/api/health',
      debug: '/api/debug',
      systemDashboard: '/api/system/summary',
      auctionHouse: {
        listings: '/api/auction/listings',
        create: 'POST /api/auction/create',
        bid: 'POST /api/auction/bid',
        history: '/api/auction/history',
        myBids: '/api/auction/my-bids/:wallet',
        stats: '/api/auction/stats',
      },
    },

    commands: {
      build: 'cd /home/user/webapp && npm run build',
      start: 'cd /home/user/webapp && pm2 start ecosystem.config.cjs',
      restart: 'cd /home/user/webapp && pm2 restart numbahwan-guild',
      test: 'cd /home/user/webapp && npm test',
      logs: 'pm2 logs numbahwan-guild --nostream',
    },
  })
})

// Runtime error collector — receives beacons from nw-error-tracker.js
// Stores in KV (MARKET_CACHE) with TTL, rate-limited per IP
router.post('/errors', async (c) => {
  try {
    const body = await c.req.text()
    const error = JSON.parse(body)

    // Basic validation
    if (!error.type || !error.page) {
      return c.json({ ok: false }, 400)
    }

    // Rate limit: max 50 errors per IP per hour
    const ip = c.req.header('cf-connecting-ip') || 'unknown'
    const rateLimitKey = `err-rate:${ip}:${Math.floor(Date.now() / 3600000)}`

    const kv = c.env?.MARKET_CACHE
    if (kv) {
      const count = parseInt((await kv.get(rateLimitKey)) || '0', 10)
      if (count >= 50) return c.json({ ok: false, reason: 'rate-limited' }, 429)
      await kv.put(rateLimitKey, String(count + 1), { expirationTtl: 3600 })

      // Store error with 24h TTL
      const errorKey = `err:${error.page}:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`
      await kv.put(
        errorKey,
        JSON.stringify({
          ...error,
          ip: ip.substring(0, 20),
          received: Date.now(),
        }),
        { expirationTtl: 86400 },
      )
    }

    return c.json({ ok: true })
  } catch {
    return c.json({ ok: true }) // Never fail — don't block clients
  }
})

// Get recent errors (for dashboard)
router.get('/errors/recent', async (c) => {
  const kv = c.env?.MARKET_CACHE
  if (!kv) return c.json({ errors: [], message: 'KV not available locally' })

  try {
    const list = await kv.list({ prefix: 'err:', limit: 50 })
    const errors = await Promise.all(
      list.keys.map(async (key: any) => {
        const val = await kv.get(key.name)
        return val ? JSON.parse(val) : null
      }),
    )
    return c.json({
      errors: errors.filter(Boolean).sort((a: any, b: any) => b.received - a.received),
      count: errors.filter(Boolean).length,
    })
  } catch {
    return c.json({ errors: [], count: 0 })
  }
})

// GET /api/validation - Validation loop status for dashboard
router.get('/validation', (c) => {
  // This endpoint returns static data that gets updated by mycelium CLI
  // The dashboard polls this to show real-time validation loop status
  return c.json({
    success: true,
    loop: {
      status: 'active',
      stages: [
        { name: 'LEARN', desc: 'Record breakage + lesson', icon: '📝', active: true },
        { name: 'STORE', desc: 'Compress to ≤80 char IF→THEN', icon: '💾', active: true },
        { name: 'DELIVER', desc: 'Show in context + FILE-RISKS', icon: '📡', active: true },
        { name: 'GUARD', desc: 'Pre-commit blocks on patterns', icon: '🛡️', active: true },
        { name: 'VERIFY', desc: 'Check lesson applied in diff', icon: '✅', active: true },
        { name: 'STRENGTHEN', desc: 'Promote effective → constraint', icon: '💪', active: true },
        { name: 'PRUNE', desc: 'Remove dead lessons (5x no fire)', icon: '✂️', active: true },
      ],
      metrics: {
        storageKB: 495,
        bytesPerLesson: 4029,
        compressionRate: 56,
        contextDelivery: 80,
        lessonFormat: 'IF→THEN (80 char max)',
      },
    },
  })
})

export default router
