import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-pages'
import pvpMatchmaking from './services/pvp-matchmaking'
import {
  healthRoutes, dataRoutes, sentinelRoutes, pagesRoutes,
  databaseRoutes, marketTradingRoutes, cardDbRoutes,
  adminCardsRoutes, walletEconomyRoutes, auctionRoutes,
  marketPricesRoutes, autoLearnRoutes, gamificationRoutes,
  cardBridgeRoutes, purchaseRoutes, eventsMerchRoutes,
  confessionalRoutes, shrineRoutes, cardEngineRoutes,
  cardEngineExtraRoutes, walletExtraRoutes,
  physicalRoutes, avatarRoutes, guideRoutes, translateRoutes,
  gmRoutes, cipherRoutes
} from './routes'

// ============================================================================
// NumbahWan Guild - Architecture v4.0 (Fully Modular)
// Sentinel Health: All route handlers extracted into domain modules
// ============================================================================

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

// ── Security Headers Middleware ──────────────────────────────────
app.use('*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'SAMEORIGIN')
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self' https:")
})

// Static file serving
app.use('/static/*', serveStatic())
app.use('/lore/*', serveStatic())
app.use('/museum/*', serveStatic())
app.use('/vault/*', serveStatic())
app.use('/research/*', serveStatic())

// Named static pages with clean URLs
const namedStatic = [
  'efficiency', 'lore', 'tabletop', 'staking', 'fusion',
  'claim', 'events', 'confessional', 'avatar-studio', 'research-library',
  'cipher'
]
namedStatic.forEach(page => {
  app.get(`/${page}`, serveStatic({ path: `./${page}.html` }))
  app.get(`/${page}.html`, serveStatic({ path: `./${page}.html` }))
})
app.use('/tabletop/*', serveStatic())

// Mount all route modules
app.route('/api', healthRoutes)
app.route('/api', dataRoutes)
app.route('/api/system', sentinelRoutes)
app.route('/api/db', databaseRoutes)
app.route('/api/market', marketTradingRoutes)
app.route('/api/cards', cardDbRoutes)
app.route('/api/admin', adminCardsRoutes)
app.route('/api/wallet', walletEconomyRoutes)
app.route('/api/auction', auctionRoutes)
app.route('/api', marketPricesRoutes)
app.route('/api/system', autoLearnRoutes)
app.route('/api/game', gamificationRoutes)
app.route('/api/pvp', pvpMatchmaking)
app.route('/api/card-bridge', cardBridgeRoutes)
app.route('/api/purchase', purchaseRoutes)
app.route('/api', eventsMerchRoutes)
app.route('/api', confessionalRoutes)
app.route('/api/shrine', shrineRoutes)
app.route('/api/card-engine', cardEngineRoutes)
app.route('/api/card-engine', cardEngineExtraRoutes)
app.route('/api/wallet', walletExtraRoutes)
app.route('/api/physical', physicalRoutes)
app.route('/api/avatar', avatarRoutes)
app.route('/api/guide', guideRoutes)
app.route('/api', translateRoutes)
app.route('/api/gm', gmRoutes)
app.route('/api/cipher', cipherRoutes)

// Page routes (static pages, /, /regina, /pvp, museum, vault, research, lore)
app.route('', pagesRoutes)

export default app
