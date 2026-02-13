import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-pages'
import pvpMatchmaking from './services/pvp-matchmaking'
import {
  healthRoutes, dataRoutes, sentinelRoutes, agentRoutes, pagesRoutes,
  databaseRoutes, marketTradingRoutes, cardDbRoutes,
  adminCardsRoutes, walletEconomyRoutes, auctionRoutes,
  marketPricesRoutes, gamificationRoutes,
  cardBridgeRoutes, purchaseRoutes, eventsMerchRoutes,
  confessionalRoutes, shrineRoutes, cardEngineRoutes,
  cardEngineExtraRoutes, walletExtraRoutes,
  physicalRoutes, avatarRoutes, guideRoutes, translateRoutes,
  gmRoutes, cipherRoutes, oracleRoutes
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

// ── World images — worker-routed for universal compatibility ────
// Serves world images through the worker so they work everywhere
// (sandbox proxies, production, dev). Must be BEFORE serveStatic.
const WORLD_MIME: Record<string, string> = {
  'webp': 'image/webp', 'png': 'image/png', 'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg', 'gif': 'image/gif', 'svg': 'image/svg+xml',
  'avif': 'image/avif', 'ico': 'image/x-icon'
}

async function serveWorldImage(c: any) {
  const file = c.req.param('file')
  if (!file || /[\/\\]/.test(file) || file.includes('..')) return c.text('Forbidden', 403)
  const ext = file.split('.').pop()?.toLowerCase() || ''
  const mime = WORLD_MIME[ext]
  if (!mime) return c.text('Not found', 404)
  const filePath = `/static/world/${file}`
  
  // 1. Try Cloudflare ASSETS binding (production)
  try {
    const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy${filePath}`))
    if (asset && asset.status === 200) {
      return new Response(asset.body, {
        headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=31536000, immutable' }
      })
    }
  } catch {}
  
  // 2. Fallback: read from disk (dev mode)
  try {
    const fs = await import('node:fs')
    const nodePath = await import('node:path')
    const publicDir = nodePath.resolve(process.cwd(), 'public')
    const fullPath = nodePath.join(publicDir, filePath)
    if (!fullPath.startsWith(publicDir)) return c.text('Forbidden', 403)
    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath)
      return new Response(buf, {
        headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=86400' }
      })
    }
  } catch {}
  
  return c.text('Not found', 404)
}

app.get('/static/world/:file', serveWorldImage)

// Static file serving
app.use('/.well-known/*', serveStatic())
app.use('/static/*', serveStatic())
app.use('/lore/*', serveStatic())
app.use('/museum/*', serveStatic())
app.use('/vault/*', serveStatic())
app.use('/research/*', serveStatic())

// Tabletop sub-routes (static assets)
app.use('/tabletop/*', serveStatic())

// Mount all route modules
app.route('/api', healthRoutes)
app.route('/api', dataRoutes)
app.route('/api/system', sentinelRoutes)
app.route('/api/pcp', agentRoutes)    // PCP standard routes
app.route('/api/agent', agentRoutes)  // Legacy alias (backward compat)
app.route('/api/db', databaseRoutes)
app.route('/api/market', marketTradingRoutes)
app.route('/api/cards', cardDbRoutes)
app.route('/api/admin', adminCardsRoutes)
app.route('/api/wallet', walletEconomyRoutes)
app.route('/api/auction', auctionRoutes)
app.route('/api', marketPricesRoutes)
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
app.route('/api/oracle', oracleRoutes)

// Page routes (static pages, /, /regina, /pvp, museum, vault, research, lore)
app.route('', pagesRoutes)

export default app
