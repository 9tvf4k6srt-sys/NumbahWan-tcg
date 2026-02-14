/**
 * ============================================================================
 *   N U M B A H W A N   G U I L D — Server Architecture v4.1
 *   ~~~ The Hono Application: A Renaissance Blueprint ~~~
 * ============================================================================
 *
 *   "As a well-spent day brings happy sleep, so a well-used life
 *    brings happy death."
 *                                      — Leonardo da Vinci
 *
 *   This is the living heart of Castle NumbahWan — the Hono application
 *   that orchestrates every API response, serves every static page, and
 *   guards every gate with proper security headers.
 *
 *   Architecture (top to bottom, like the castle's 7 floors):
 *
 *     F7  Security Middleware .... CORS, CSP, HSTS — the outer walls
 *     F6  Image Handlers ........ /static/world/* and /static/game/*
 *     F5  Static File Serving ... Assets, lore, museum, vault, world
 *     F4  API Routes ............ Health, data, sentinel, market, cards...
 *     F3  Game Systems .......... PvP, card engine, gamification
 *     F2  Utility Routes ........ Translate, guide, cipher, oracle
 *     F1  Page Routes ........... Static HTML pages (/, /regina, /pvp...)
 *
 *   Sentinel Health: All route handlers extracted into domain modules.
 *   Every import is a wing of the castle. Every route is a door.
 *
 * ============================================================================
 */

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
  gmRoutes, cipherRoutes, oracleRoutes, npcChatRoutes
} from './routes'

// ── Type Bindings ─────────────────────────────────────────────────
type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()


// ════════════════════════════════════════════════════════════════════
//   F7 — THE OUTER WALLS: Security Headers
// ════════════════════════════════════════════════════════════════════
//
//   Every response passes through these walls. Like the castle's arrow
//   slits and enchanted gargoyles, they protect without obstructing.
//
//   CSP Policy:
//     • self           — our own origin, the castle itself
//     • unsafe-inline  — inline scripts in sovereign HTML pages
//     • cdn.*          — Tailwind, highlight.js, fonts — our allies
//     • img-src https: — images may come from any HTTPS origin
//     • connect-src    — APIs may reach any HTTPS endpoint
//
app.use('*', async (c, next) => {
  await next()

  // Structural defenses
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'SAMEORIGIN')
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // The Content Security Policy — our most detailed fortification
  c.header('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https:",
  ].join('; '))
})


// ════════════════════════════════════════════════════════════════════
//   F6 — THE IMAGE GALLERIES: World & Game Asset Serving
// ════════════════════════════════════════════════════════════════════
//
//   "The painter has the universe in his mind and hands."
//
//   These handlers serve the castle's visual treasures through the
//   worker, ensuring they work everywhere — sandbox proxies, production
//   CDN, and local development. They must be registered BEFORE the
//   generic serveStatic() middleware, like guards posted before the
//   main gates open.
//
//   Two galleries exist:
//     /static/world/*  — 21 pixel-art rooms of Castle NumbahWan
//     /static/game/*   — 15 UE5 concept renders of NWG The Game
//

const IMAGE_CODEX: Record<string, string> = {
  webp: 'image/webp',    png:  'image/png',
  jpg:  'image/jpeg',    jpeg: 'image/jpeg',
  gif:  'image/gif',     svg:  'image/svg+xml',
  avif: 'image/avif',    ico:  'image/x-icon',
}

/**
 * Creates a handler for a named image gallery.
 *
 * Strategy (dual-path, like the castle's drawbridge and secret tunnel):
 *   1. Production — fetch from Cloudflare ASSETS binding (edge CDN)
 *   2. Development — read from local filesystem (public/ directory)
 *
 * Security: path traversal is blocked. Only known extensions are served.
 */
function createGalleryHandler(gallery: string) {
  return async function (c: any) {
    const file = c.req.param('file')

    // Guard: reject traversal attempts and missing filenames
    if (!file || /[\/\\]/.test(file) || file.includes('..')) {
      return c.text('Forbidden', 403)
    }

    // Guard: only serve known image formats
    const ext = file.split('.').pop()?.toLowerCase() || ''
    const mime = IMAGE_CODEX[ext]
    if (!mime) return c.text('Not found', 404)

    const assetPath = `/static/${gallery}/${file}`

    // Path 1: The Drawbridge — Cloudflare ASSETS (production)
    try {
      const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy${assetPath}`))
      if (asset && asset.status === 200) {
        return new Response(asset.body, {
          headers: {
            'Content-Type': mime,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      }
    } catch { /* Production binding unavailable — fall through */ }

    // Path 2: The Secret Tunnel — Local filesystem (development)
    try {
      const fs = await import('node:fs')
      const nodePath = await import('node:path')
      const publicDir = nodePath.resolve(process.cwd(), 'public')
      const fullPath = nodePath.join(publicDir, assetPath)

      // Guard: ensure resolved path stays within public/
      if (!fullPath.startsWith(publicDir)) return c.text('Forbidden', 403)

      if (fs.existsSync(fullPath)) {
        const buffer = fs.readFileSync(fullPath)
        return new Response(buffer, {
          headers: {
            'Content-Type': mime,
            'Cache-Control': 'public, max-age=86400',
          },
        })
      }
    } catch { /* Filesystem unavailable in production — expected */ }

    return c.text('Not found', 404)
  }
}

// Register the two galleries
app.get('/static/world/:file', createGalleryHandler('world'))
app.get('/static/game/:file', createGalleryHandler('game'))


// ════════════════════════════════════════════════════════════════════
//   F5 — THE GREAT HALL: Static File Serving + Performance Caching
// ════════════════════════════════════════════════════════════════════
//
//   These middleware rules serve entire directories of static content
//   from the Cloudflare Pages asset store. Each path is a wing of
//   the castle — its own domain, its own purpose.
//
//   Cache Strategy (aggressive — images & fonts are immutable):
//     Images (.webp, .png, .jpg, .svg, .avif) → 1 year, immutable
//     Scripts (.js) → 1 year, immutable (filenames contain version)
//     Data (.json) → 5 minutes, stale-while-revalidate
//     HTML → no-cache (always fresh)
//

// --- Performance Caching Middleware ---
app.use('/static/*', async (c, next) => {
  await next()
  const path = c.req.path
  const ext = path.split('.').pop()?.toLowerCase() || ''
  if (['webp','png','jpg','jpeg','gif','svg','avif','ico','woff2','woff','ttf'].includes(ext)) {
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (ext === 'js' || ext === 'css') {
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (ext === 'json') {
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  }
})

app.use('/.well-known/*', serveStatic())   // Web standards & verification
app.use('/static/*', serveStatic())         // All static assets (CSS, JS, images, data)
app.use('/lore/*', serveStatic())           // Guild lore & narrative archives
app.use('/museum/*', serveStatic())         // Card museum & collection displays
app.use('/vault/*', serveStatic())          // Vault research documents
app.use('/research/*', serveStatic())       // Research papers & analysis
app.use('/tabletop/*', serveStatic())       // Tabletop game sub-application


// ════════════════════════════════════════════════════════════════════
//   F4 — THE WAR ROOM: Core API Routes
// ════════════════════════════════════════════════════════════════════
//
//   "Where raids are planned and bosses fear to be named."
//
//   Each route module is a specialist — extracted into its own domain
//   file for maintainability. The war table holds 47 figurines;
//   this router holds 27 route modules.
//

// Infrastructure & Monitoring
app.route('/api', healthRoutes)                    // Health checks & ping
app.route('/api', dataRoutes)                      // Static data endpoints
app.route('/api/system', sentinelRoutes)            // Sentinel monitoring system
app.route('/api/pcp', agentRoutes)                  // PCP standard routes
app.route('/api/agent', agentRoutes)                // Legacy alias (backward compat)

// Database & Core Systems
app.route('/api/db', databaseRoutes)                // D1 database operations

// Economy & Trading
app.route('/api/market', marketTradingRoutes)        // Market trading engine
app.route('/api', marketPricesRoutes)                // Price feeds & history
app.route('/api/auction', auctionRoutes)             // Auction house
app.route('/api/wallet', walletEconomyRoutes)        // Wallet & economy core
app.route('/api/wallet', walletExtraRoutes)          // Wallet extensions
app.route('/api/purchase', purchaseRoutes)            // Purchase processing
app.route('/api', eventsMerchRoutes)                 // Events & merchandise


// ════════════════════════════════════════════════════════════════════
//   F3 — THE CARD FORGE: Game System Routes
// ════════════════════════════════════════════════════════════════════
//
//   "Where cards are born and legends are sealed."
//

app.route('/api/cards', cardDbRoutes)                // Card database & queries
app.route('/api/admin', adminCardsRoutes)             // Admin card management
app.route('/api/card-bridge', cardBridgeRoutes)       // Cross-system card bridge
app.route('/api/card-engine', cardEngineRoutes)       // Card battle engine core
app.route('/api/card-engine', cardEngineExtraRoutes)  // Card engine extensions
app.route('/api/game', gamificationRoutes)            // Gamification & achievements
app.route('/api/pvp', pvpMatchmaking)                 // PvP matchmaking service


// ════════════════════════════════════════════════════════════════════
//   F2 — THE LIBRARY: Utility & Knowledge Routes
// ════════════════════════════════════════════════════════════════════
//
//   "Knowledge is power — and this room has a lot of both."
//

app.route('/api', confessionalRoutes)                // Confessional system
app.route('/api/shrine', shrineRoutes)               // Shrine of the Eternal Flame
app.route('/api/physical', physicalRoutes)            // Physical card system
app.route('/api/avatar', avatarRoutes)                // Avatar & profile system
app.route('/api/guide', guideRoutes)                  // Guide & tutorial system
app.route('/api', translateRoutes)                    // Translation service
app.route('/api/gm', gmRoutes)                        // Game Master tools
app.route('/api/cipher', cipherRoutes)                // Cipher & encoding system
app.route('/api/oracle', oracleRoutes)                // Oracle prophecy engine
app.route('/api/npc', npcChatRoutes)                   // AI NPC chat system


// ════════════════════════════════════════════════════════════════════
//   F1 — THE GRAND MARKET: Page Routes
// ════════════════════════════════════════════════════════════════════
//
//   Static pages — /, /regina, /pvp, /museum, /vault, /research,
//   /lore, and all the sovereign HTML documents that make up the
//   public face of Castle NumbahWan.
//
app.route('', pagesRoutes)


// ════════════════════════════════════════════════════════════════════
//   EXPORT — The Castle Stands
// ════════════════════════════════════════════════════════════════════
export default app
