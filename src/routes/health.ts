/**
 * Health & Debug Routes
 */
import { Hono } from 'hono'

// Import data
import rosterData from '../data/roster.json'

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
    architecture: 'modular-routes'
  })
})

// Debug endpoint - comprehensive system diagnostics
router.get('/debug', (c) => {
  const staticPages = [
    'fashion', 'merch', 'fortune', 'arcade', 'memes', 'apply', 'wallet', 'forge',
    'tcg', 'market', 'cards', 'guide', 'pvp', 'regina', 'zakum', 'tournament',
    'academy', 'vault', 'museum', 'research', 'historical-society', 'menu-demo',
    'business', 'supermarket', 'restaurant', 'services', 'my-business',
    'staking', 'fusion', 'claim', 'events', 'auction-house', 'system-dashboard', 'card-utility'
  ]
  
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    architecture: {
      type: 'modular-routes',
      modules: [
        'health', 'data', 'database', 'market', 'cards',
        'wallet', 'market-automation',
        'gamification', 'card-bridge', 'purchase',
        'events-merch', 'confessional', 'physical',
        'avatar', 'guide', 'translate', 'gm', 'auction'
      ],
      improvement: 'Monolith split into modular routes with continuous learning'
    },
    
    project: {
      name: 'NumbahWan Guild',
      codeName: 'webapp',
      path: '/home/user/webapp'
    },
    
    pages: {
      total: staticPages.length + 2,
      list: ['/', ...staticPages.map(p => `/${p}`)],
      htmlFiles: staticPages.map(p => `${p}.html`)
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
        stats: '/api/auction/stats'
      }
    },
    
    commands: {
      build: 'cd /home/user/webapp && npm run build',
      start: 'cd /home/user/webapp && pm2 start ecosystem.config.cjs',
      restart: 'cd /home/user/webapp && pm2 restart numbahwan-guild',
      test: 'cd /home/user/webapp && npm test',
      logs: 'pm2 logs numbahwan-guild --nostream'
    }
  })
})

export default router
