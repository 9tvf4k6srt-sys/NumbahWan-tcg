import { Hono } from 'hono'
import rosterData from '../data/roster.json'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

// Route helpers
function jsonError(c: any, msg: string, status = 400) {
  return c.json({ success: false, error: msg }, status);
}
function jsonSuccess(c: any, data: any) {
  return c.json({ success: true, ...data });
}
function parseIntParam(val: string | undefined, fallback: number): number {
  const n = parseInt(val || '');
  return isNaN(n) ? fallback : n;
}

const router = new Hono<{ Bindings: Bindings }>()

// Member data (from JSON)
const members = rosterData.members
const sortedMembers = [...members].sort((a: any, b: any) => b.cpValue - a.cpValue)

// API endpoint for member data
router.get('/api/members', (c) => {
  return c.json({ members, sortedMembers })
})

// ── Universal static file server ─────────────────────────────────
// Works in both Cloudflare Pages (production) and Vite dev (local).
// Production: uses ASSETS binding for optimal CDN delivery.
// Dev: reads from disk via fs (Node.js) as fallback.
async function serveHtml(c: any, filePath: string) {
  // 1. Try Cloudflare ASSETS binding (production)
  try {
    const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy${filePath}`))
    if (asset && asset.status === 200) {
      return new Response(asset.body, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  } catch {}

  // 2. Fallback: read from disk (Vite dev mode)
  try {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const publicDir = path.resolve(process.cwd(), 'public')
    const fullPath = path.join(publicDir, filePath)
    
    // Security: prevent path traversal
    if (!fullPath.startsWith(publicDir)) {
      return c.text('Forbidden', 403)
    }
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8')
      return c.html(content)
    }
  } catch {}
  
  return c.text('Not found', 404)
}

async function serveFile(c: any, filePath: string, contentType: string) {
  try {
    const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy${filePath}`))
    if (asset && asset.status === 200) {
      return new Response(asset.body, { headers: { 'Content-Type': contentType } })
    }
  } catch {}

  try {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const publicDir = path.resolve(process.cwd(), 'public')
    const fullPath = path.join(publicDir, filePath)
    if (!fullPath.startsWith(publicDir)) return c.text('Forbidden', 403)
    if (fs.existsSync(fullPath)) {
      // Binary-safe: read as buffer for images/fonts, utf-8 for text
      const isBinary = /\.(webp|png|jpg|jpeg|gif|ico|woff2?|ttf|eot|svg|avif)$/i.test(filePath)
      if (isBinary) {
        const buf = fs.readFileSync(fullPath)
        return new Response(buf, {
          headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' }
        })
      }
      const content = fs.readFileSync(fullPath, 'utf-8')
      return new Response(content, { headers: { 'Content-Type': contentType } })
    }
  } catch {}
  
  return c.text('Not found', 404)
}

// ── Main page ────────────────────────────────────────────────────
router.get('/', (c) => serveHtml(c, '/index.html'))
router.get('/index.html', (c) => serveHtml(c, '/index.html'))

// AI-friendly & crawler files
const textFiles = ['llms.txt', 'llms-full.txt', 'robots.txt']
textFiles.forEach(file => {
  router.get(`/${file}`, (c) => serveFile(c, `/${file}`, 'text/plain; charset=utf-8'))
})

// Sitemap XML
router.get('/sitemap.xml', (c) => serveFile(c, '/sitemap.xml', 'application/xml; charset=utf-8'))

// ── All static pages — clean URL + .html ────────────────────────
const staticPages = [
  'regina', 'pvp', 'fashion', 'merch', 'fortune', 'arcade', 'memes',
  'apply', 'wallet', 'forge', 'tcg', 'market', 'cards', 'guide',
  'battle', 'pvp-battle', 'card-bridge', 'collection', 'deckbuilder',
  'zakum', 'tournament', 'academy', 'vault', 'museum', 'research',
  'historical-society', 'menu-demo', 'exchange', 'ai-lounge', 'court',
  'therapy', 'hr', 'conspiracy', 'updates', 'about', 'treasury',
  'intelligence', 'citizenship', 'invest', 'markets', 'buy', 'business',
  'supermarket', 'restaurants', 'services', 'crafts', 'realestate',
  'jobs', 'my-business', 'cafeteria', 'lost-found', 'parking',
  'maintenance', 'breakroom', 'basement', 'nwg-shop', 'card-print-template',
  'wyckoff', 'matchalatte', 'embassy', 'profile-card', 'achievements',
  'lore', 'restaurant', 'card-lab', 'avatar-builder', 'tavern-tales',
  'leaderboard', 'research-library', 'auction-house', 'system-dashboard',
  'card-utility', 'shrine', 'card-audit', 'oracle', 'showcase', 'tools',
  'admin-physical', 'battle-legacy', 'battle-old', 'battle-simple',
  'what-is-nwg', 'staking', 'fusion', 'claim', 'events', 'confessional',
  'avatar-studio', 'efficiency', 'tabletop', 'collection-stats', 'dashboard',
  'cipher', 'guild-siege', 'agent'
]

staticPages.forEach(page => {
  router.get(`/${page}`, (c) => serveHtml(c, `/${page}.html`))
  router.get(`/${page}.html`, (c) => serveHtml(c, `/${page}.html`))
})

// Museum exhibits
const museumExhibits = ['exhibit-001', 'exhibit-002', 'exhibit-003', 'exhibit-004', 'exhibit-005', 'exhibit-006', 'exhibit-007', 'exhibit-008', 'exhibit-009', 'exhibit-010']
museumExhibits.forEach(exhibit => {
  router.get(`/museum/${exhibit}`, (c) => serveHtml(c, `/museum/${exhibit}.html`))
  router.get(`/museum/${exhibit}.html`, (c) => serveHtml(c, `/museum/${exhibit}.html`))
})

// Vault floors
const vaultFloors = ['b3-decontamination', 'b7-hall-of-failures', 'b12-antechamber']
vaultFloors.forEach(floor => {
  router.get(`/vault/${floor}`, (c) => serveHtml(c, `/vault/${floor}.html`))
  router.get(`/vault/${floor}.html`, (c) => serveHtml(c, `/vault/${floor}.html`))
})

// Research papers
const researchPapers = ['work-gloves-economic-impact', 'zakum-helmet-spectral-analysis', 'reggina-misprint-forensic-examination', 'vault-security-analysis', 'nx-fashion-revolution', 'transparent-set-psychology']
researchPapers.forEach(paper => {
  router.get(`/research/${paper}`, (c) => serveHtml(c, `/research/${paper}.html`))
  router.get(`/research/${paper}.html`, (c) => serveHtml(c, `/research/${paper}.html`))
})

// Lore pages
const lorePages = ['reggina-origin', 'sacred-log', 'whale-wars']
lorePages.forEach(page => {
  router.get(`/lore/${page}`, (c) => serveHtml(c, `/lore/${page}.html`))
  router.get(`/lore/${page}.html`, (c) => serveHtml(c, `/lore/${page}.html`))
})

// World pages
const worldPages = ['castle', 'nwg-the-game']
worldPages.forEach(page => {
  router.get(`/world/${page}`, (c) => serveHtml(c, `/world/${page}.html`))
  router.get(`/world/${page}.html`, (c) => serveHtml(c, `/world/${page}.html`))
})

export default router
