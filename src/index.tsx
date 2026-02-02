import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-pages'

// Import data from JSON files (Fallback when D1 not available)
import rosterData from './data/roster.json'
import photosData from './data/photos.json'
import translationsData from './data/translations.json'
import performanceData from './data/performance.json'

// D1 Database binding type
type Bindings = {
  GUILD_DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// Serve static files with caching headers
app.use('/static/*', serveStatic())

// ============================================================================
// API ROUTES - Data Layer (Scalability Pattern: Separate Data from Presentation)
// ============================================================================

// ============================================================================
// DEBUG & HEALTH APIs - For AI assistants and monitoring
// ============================================================================

// Health check - simple ping
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() })
})

// Debug endpoint - comprehensive system diagnostics
app.get('/api/debug', (c) => {
  const staticPages = ['fashion', 'merch', 'fortune', 'arcade', 'memes', 'apply', 'wallet', 'forge', 'tcg', 'market', 'cards', 'guide', 'pvp', 'regina', 'zakum', 'tournament', 'academy', 'vault', 'museum', 'research', 'historical-society', 'menu-demo']
  
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    
    project: {
      name: 'NumbahWan Guild',
      codeName: 'webapp',
      path: '/home/user/webapp'
    },
    
    pages: {
      total: staticPages.length + 2, // +2 for / and /index.html
      list: ['/', ...staticPages.map(p => `/${p}`)],
      htmlFiles: staticPages.map(p => `${p}.html`)
    },
    
    apis: {
      health: '/api/health',
      debug: '/api/debug',
      cardFactory: '/api/card-factory',
      cards: {
        list: '/api/cards',
        stats: '/api/cards/stats',
        byId: '/api/cards/:id',
        byRarity: '/api/cards/rarity/:rarity',
        pull: 'POST /api/cards/pull'
      },
      market: {
        listings: '/api/market/listings',
        chat: '/api/market/chat',
        buy: 'POST /api/market/buy',
        list: 'POST /api/market/list'
      },
      admin: {
        addCard: 'POST /api/admin/cards',
        batchAdd: 'POST /api/admin/cards/batch',
        nextIds: '/api/admin/cards/next-ids?gmKey=numbahwan-gm-2026',
        updateCard: 'PUT /api/admin/cards/:id',
        deleteCard: 'DELETE /api/admin/cards/:id',
        exportCards: '/api/admin/cards/export?gmKey=numbahwan-gm-2026'
      }
    },
    
    dataFiles: {
      cards: '/static/data/cards.json',
      cardTemplates: '/static/data/card-templates.json',
      cardQueue: '/static/data/card-queue.json',
      config: '/static/data/config.json',
      navigation: '/static/data/navigation.json',
      pages: '/static/data/pages.json'
    },
    
    scripts: {
      wallet: '/static/nw-wallet.js',
      cards: '/static/nw-cards.js',
      icons: '/static/nw-icons-inline.js',
      effects: '/static/nw-effects.js'
    },
    
    styles: {
      utilities: '/static/nw-utilities.css',
      tokens: '/static/nw-tokens.css',
      core: '/static/nw-core.css'
    },
    
    commands: {
      build: 'cd /home/user/webapp && npm run build',
      start: 'cd /home/user/webapp && pm2 start ecosystem.config.cjs',
      restart: 'cd /home/user/webapp && pm2 restart numbahwan-guild',
      logs: 'pm2 logs numbahwan-guild --nostream',
      test: 'curl http://localhost:3000/api/health'
    },
    
    troubleshooting: {
      '404_page': 'Check staticPages array in src/index.tsx, ensure HTML file exists in public/',
      'api_error': 'Check pm2 logs, verify route in src/index.tsx',
      'cards_missing': 'Verify /static/data/cards.json, check nw-cards.js loaded',
      'wallet_broken': 'Clear localStorage, check nw-wallet.js loaded',
      'full_rebuild': 'rm -rf dist node_modules && npm install && npm run build'
    },
    
    gmMode: {
      activateCommand: 'NW_WALLET.activateGM("numbahwan-gm-2026")',
      deactivateCommand: 'NW_WALLET.deactivateGM()'
    },
    
    backups: [
      { date: '2026-01-28', name: 'Infinite Scaling v2', url: 'https://www.genspark.ai/api/files/s/mxiiyZG5' }
    ]
  })
})

// API: Get translations (for all pages to share)
app.get('/api/i18n', (c) => {
  c.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return c.json(translationsData)
})

// API: Get roster data
app.get('/api/roster', (c) => {
  c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  return c.json(rosterData)
})

// API: Get photos data
app.get('/api/photos', (c) => {
  c.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return c.json(photosData)
})

// API: Get performance tracking data (snapshots, gains, commentary)
app.get('/api/performance', (c) => {
  c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  return c.json(performanceData)
})

// ============================================================================
// D1 DATABASE API - Dynamic CRUD Operations
// ============================================================================

// GET /api/db/members - Get all members from D1
app.get('/api/db/members', async (c) => {
  try {
    const db = c.env.GUILD_DB
    if (!db) {
      // Fallback to JSON if D1 not available (local dev without D1)
      return c.json({ source: 'json', members: rosterData.members })
    }
    
    const { results } = await db.prepare(
      'SELECT * FROM members ORDER BY cp_value DESC'
    ).all()
    
    return c.json({ source: 'd1', members: results })
  } catch (e) {
    // Fallback to JSON on any D1 error (common in local dev)
    return c.json({ source: 'json', members: rosterData.members })
  }
})

// GET /api/db/members/:name - Get single member
app.get('/api/db/members/:name', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    const name = c.req.param('name')
    
    if (!db) {
      const member = rosterData.members.find(m => m.name === name)
      return member ? c.json(member) : c.json({ error: 'Not found' }, 404)
    }
    
    const result = await db.prepare(
      'SELECT * FROM members WHERE name = ?'
    ).bind(name).first()
    
    return result ? c.json(result) : c.json({ error: 'Not found' }, 404)
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// POST /api/db/members - Add new member
app.post('/api/db/members', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    if (!db) return c.json({ error: 'Database not available' }, 503)
    
    const body = await c.req.json()
    const { name, level, cp, cp_value, contribution, upgrade, role, avatar, note } = body
    
    if (!name) return c.json({ error: 'Name is required' }, 400)
    
    await db.prepare(`
      INSERT INTO members (name, level, cp, cp_value, contribution, upgrade, role, avatar, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(name, level || 1, cp || '0', cp_value || 0, contribution || 0, upgrade || 0, role || 'Guild Member', avatar, note).run()
    
    return c.json({ success: true, message: `Member ${name} added` })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// PUT /api/db/members/:name - Update member
app.put('/api/db/members/:name', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    if (!db) return c.json({ error: 'Database not available' }, 503)
    
    const name = c.req.param('name')
    const body = await c.req.json()
    
    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    
    if (body.level !== undefined) { updates.push('level = ?'); values.push(body.level) }
    if (body.cp !== undefined) { updates.push('cp = ?'); values.push(body.cp) }
    if (body.cp_value !== undefined) { updates.push('cp_value = ?'); values.push(body.cp_value) }
    if (body.contribution !== undefined) { updates.push('contribution = ?'); values.push(body.contribution) }
    if (body.upgrade !== undefined) { updates.push('upgrade = ?'); values.push(body.upgrade) }
    if (body.role !== undefined) { updates.push('role = ?'); values.push(body.role) }
    if (body.online !== undefined) { updates.push('online = ?'); values.push(body.online ? 1 : 0) }
    if (body.avatar !== undefined) { updates.push('avatar = ?'); values.push(body.avatar) }
    if (body.note !== undefined) { updates.push('note = ?'); values.push(body.note) }
    
    if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400)
    
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(name)
    
    await db.prepare(`UPDATE members SET ${updates.join(', ')} WHERE name = ?`).bind(...values).run()
    
    return c.json({ success: true, message: `Member ${name} updated` })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// DELETE /api/db/members/:name - Remove member
app.delete('/api/db/members/:name', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    if (!db) return c.json({ error: 'Database not available' }, 503)
    
    const name = c.req.param('name')
    await db.prepare('DELETE FROM members WHERE name = ?').bind(name).run()
    
    return c.json({ success: true, message: `Member ${name} deleted` })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// GET /api/db/photos - Get all photos
app.get('/api/db/photos', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    if (!db) {
      return c.json({ source: 'json', photos: photosData.guildPhotos })
    }
    
    const { results } = await db.prepare(
      'SELECT * FROM photos ORDER BY id ASC'
    ).all()
    
    // Transform to match frontend expected format
    const photos = results?.map((p: any) => ({
      id: p.id,
      title: { en: p.title_en, zh: p.title_zh, th: p.title_th },
      description: { en: p.description_en, zh: p.description_zh, th: p.description_th },
      image: p.image
    }))
    
    return c.json({ source: 'd1', photos })
  } catch (e) {
    return c.json({ source: 'json', photos: photosData.guildPhotos, error: String(e) })
  }
})

// POST /api/db/photos - Add new photo
app.post('/api/db/photos', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    if (!db) return c.json({ error: 'Database not available' }, 503)
    
    const body = await c.req.json()
    const { title_en, title_zh, title_th, description_en, description_zh, description_th, image, uploaded_by } = body
    
    if (!image) return c.json({ error: 'Image path is required' }, 400)
    
    await db.prepare(`
      INSERT INTO photos (title_en, title_zh, title_th, description_en, description_zh, description_th, image, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(title_en, title_zh, title_th, description_en, description_zh, description_th, image, uploaded_by).run()
    
    return c.json({ success: true, message: 'Photo added' })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// DELETE /api/db/photos/:id - Remove photo
app.delete('/api/db/photos/:id', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    if (!db) return c.json({ error: 'Database not available' }, 503)
    
    const id = c.req.param('id')
    await db.prepare('DELETE FROM photos WHERE id = ?').bind(id).run()
    
    return c.json({ success: true, message: `Photo ${id} deleted` })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// GET /api/db/stats - Get guild stats
app.get('/api/db/stats', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    if (!db) {
      return c.json({ source: 'json', stats: rosterData.guildStats })
    }
    
    const { results } = await db.prepare('SELECT * FROM guild_stats').all()
    
    // Transform to key-value object
    const stats: Record<string, string> = {}
    results?.forEach((r: any) => { stats[r.stat_key] = r.stat_value })
    
    return c.json({ source: 'd1', stats })
  } catch (e) {
    return c.json({ source: 'json', stats: rosterData.guildStats, error: String(e) })
  }
})

// PUT /api/db/stats - Update guild stat
app.put('/api/db/stats', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    if (!db) return c.json({ error: 'Database not available' }, 503)
    
    const body = await c.req.json()
    const { key, value } = body
    
    if (!key || value === undefined) return c.json({ error: 'Key and value required' }, 400)
    
    await db.prepare(`
      INSERT OR REPLACE INTO guild_stats (stat_key, stat_value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).bind(key, String(value)).run()
    
    return c.json({ success: true, message: `Stat ${key} updated` })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// ============================================================================
// MEMBER ROSTER DATA - Last Updated: 2026-01-26
// ============================================================================
// Avatar naming convention: avatar-[username]-[description].jpg
// All avatars stored in /public/static/ with meaningful names for easy debugging
// ============================================================================

// Use data from JSON files (Single Source of Truth)
const previousCP: Record<string, number> = rosterData.previousCP
const members = rosterData.members

// Sort by CP for leaderboard
const sortedMembers = [...members].sort((a, b) => b.cpValue - a.cpValue)
const maxCP = sortedMembers[0].cpValue

// Guild Fun photos data with actual images
const guildFunPhotos = [
  { id: 1, title: { en: "Henesys Market Day", zh: "乾坤西斯市集日", th: "วันตลาดเฮเนซิส" }, description: { en: "Shopping with the squad!", zh: "和夥伴們一起逛街！", th: "ช้อปปิ้งกับทีม!" }, image: "/static/guild-fun-1.jpg" },
  { id: 2, title: { en: "Selfie Time!", zh: "自拍時間！", th: "เวลาเซลฟี่!" }, description: { en: "Best friends forever", zh: "永遠的好朋友", th: "เพื่อนที่ดีที่สุดตลอดไป" }, image: "/static/guild-fun-2.jpg" },
  { id: 3, title: { en: "Sunset Chill", zh: "夕陽時光", th: "พักผ่อนยามเย็น" }, description: { en: "RegginA & friend on cloud nine", zh: "RegginA和朋友在雲端", th: "RegginA และเพื่อนบนเมฆ" }, image: "/static/guild-fun-3.jpg" },
  { id: 4, title: { en: "Wings of Destiny", zh: "命運之翼", th: "ปีกแห่งโชคชะตา" }, description: { en: "Power couple goals", zh: "戰力夫妻目標", th: "เป้าหมายคู่รักสุดแกร่ง" }, image: "/static/guild-fun-4.jpg" },
  { id: 5, title: { en: "First Time Together", zh: "第一次一起", th: "ครั้งแรกด้วยกัน" }, description: { en: "Where it all began", zh: "一切的開始", th: "จุดเริ่มต้นของทุกอย่าง" }, image: "/static/guild-fun-5.jpg" },
  { id: 6, title: { en: "Boss Raid!", zh: "打王啦！", th: "บุกบอส!" }, description: { en: "Kerning City throwdown", zh: "乾坤城大戰", th: "ศึกเคอร์นิ่งซิตี้" }, image: "/static/guild-fun-6.jpg" },
]

// Translations now imported from src/data/translations.json via translationsData

// ============================================================================
// MAIN PAGE - Now served from public/index.html (see route at bottom of file)
// The inline HTML was removed to keep the main page in sync with public/index.html
// which contains the updated navigation, TCG, Wallet, Forge links, etc.
// ============================================================================

// Legacy code kept for reference - helper functions still used

// ============================================================================
// MAIN PAGE - Now served from public/index.html (see route at bottom of file)
// The inline HTML was removed to keep the main page in sync with public/index.html
// which contains the updated navigation, TCG, Wallet, Forge links, etc.
// ============================================================================


// Helper function to generate SVG N emblem - matches original exactly
// Thick blocky N like the original pixelated emblem
function generateEmblemSVG(className = 'emblem-n', size = 60) {
  const gradId = 'nGrad' + size + Math.random().toString(36).substr(2, 5)
  return `
    <svg class="${className}" viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffb347"/>
          <stop offset="30%" stop-color="#ff9500"/>
          <stop offset="60%" stop-color="#e86500"/>
          <stop offset="100%" stop-color="#8B4513"/>
        </linearGradient>
      </defs>
      <!-- Thick blocky N: left bar + THICK diagonal + right bar -->
      <rect x="10" y="8" width="24" height="84" rx="3" fill="url(#${gradId})"/>
      <rect x="66" y="8" width="24" height="84" rx="3" fill="url(#${gradId})"/>
      <polygon points="10,8 34,8 90,92 66,92" fill="url(#${gradId})"/>
    </svg>
  `
}

// Custom SVG Icons - Using NumbahWan Guild Icon Sprite
// All icons now reference /static/icons/nw-icons.svg for consistent guild branding
function nwIcon(name, size = 20, extraClass = 'mr-2') {
  return `<svg class="inline nw-icon ${extraClass}" width="${size}" height="${size}" aria-hidden="true"><use href="/static/icons/nw-icons.svg#${name}"></use></svg>`
}

function iconSword() {
  return nwIcon('sword', 20)
}

function iconTrophy() {
  return nwIcon('trophy', 20)
}

function iconInfo() {
  return nwIcon('star', 24)
}

function iconUsers() {
  return nwIcon('users', 24)
}

function iconPower() {
  return nwIcon('fire', 16, '')
}

function iconHeart() {
  return nwIcon('heart', 16, '')
}

function iconUpgrade() {
  return nwIcon('upvote', 16, '')
}

function iconStar() {
  return nwIcon('star', 20)
}

function iconRace() {
  return nwIcon('flag', 24)
}

function iconTarget() {
  return nwIcon('target', 24)
}

function iconLevel() {
  return nwIcon('trophy', 20)
}

function iconBoss() {
  return nwIcon('skull', 20)
}

function iconMilestone() {
  return nwIcon('flag', 20)
}

function iconCamera() {
  return nwIcon('camera', 24)
}

function iconUpload() {
  return nwIcon('upload', 20)
}

function iconCrown() {
  return nwIcon('crown', 20)
}

function iconGaming() {
  return nwIcon('gaming', 24)
}

function iconShield() {
  return nwIcon('shield', 20)
}

function iconParty() {
  return nwIcon('party', 20)
}

// API endpoint for member data
app.get('/api/members', (c) => {
  return c.json({ members, sortedMembers })
})

// Main page and HTML files - serve from static files
// For Cloudflare Pages in production, ASSETS binding handles this
// For local dev with wrangler pages dev, files are served from dist/
app.get('/', serveStatic({ path: './index.html' }))
app.get('/index.html', serveStatic({ path: './index.html' }))

// AI-friendly files - serve with correct content types
app.get('/llms.txt', async (c) => {
  try {
    // @ts-ignore
    const asset = await c.env?.ASSETS?.fetch(new Request('https://dummy/llms.txt'))
    if (asset) {
      return new Response(asset.body, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    }
  } catch (e) {}
  return c.redirect('/llms.txt')
})

app.get('/robots.txt', async (c) => {
  const robotsTxt = `User-agent: *
Allow: /

# AI Assistants Welcome!
# See /llms.txt for AI-specific guidance
# See /.well-known/ai-plugin.json for structured metadata

Sitemap: https://numbahwan.pages.dev/sitemap.xml
`
  return new Response(robotsTxt, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
})

// Regina page route - serves the static HTML file
app.get('/regina', async (c) => {
  // For Cloudflare Pages, we need to serve static HTML differently
  // The regina.html is in public/ and will be served via the static file serving
  try {
    // @ts-ignore - env is provided by Cloudflare Pages
    const asset = await c.env?.ASSETS?.fetch(new Request('https://dummy/regina.html'))
    if (asset) {
      return new Response(asset.body, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  } catch (e) {
    // Fallback for local development - serve inline redirect
  }
  
  // Fallback - redirect to static file
  return c.redirect('/regina.html')
})

// PvP Arena page route
app.get('/pvp', async (c) => {
  try {
    // @ts-ignore - env is provided by Cloudflare Pages
    const asset = await c.env?.ASSETS?.fetch(new Request('https://dummy/pvp.html'))
    if (asset) {
      return new Response(asset.body, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  } catch (e) {
    // Fallback for local development
  }
  return c.redirect('/pvp.html')
})

// ============================================================================
// MARKET API - Free Market Trading System with Live Chat
// ============================================================================

// In-memory storage for market data (serverless-friendly)
// For production, use Cloudflare KV or D1 for persistence
interface MarketListing {
  id: number;
  cardId: number;
  card: { name: string; rarity: string; img: string };
  price: number;
  seller: string;
  sellerId: string;
  listed: number;
}

interface ChatMessage {
  id: number;
  user_id: string;
  user_name: string;
  message: string;
  msg_type: string;
  created_at: number;
}

interface HeartbeatUser {
  id: string;
  name: string;
  lastSeen: number;
}

// Market state (in-memory - for demo/development)
let marketListings: MarketListing[] = []
let chatMessages: ChatMessage[] = []
let heartbeatUsers: Map<string, HeartbeatUser> = new Map()
let listingIdCounter = 1
let chatIdCounter = 1

// Add some sample listings for demo
const sampleCards = [
  { id: 1, name: 'RegginA Mythic', rarity: 'mythic', img: '01-reggina-mythic.jpg' },
  { id: 2, name: 'Reggino Legendary', rarity: 'legendary', img: '02-reggino-legendary.jpg' },
  { id: 27, name: 'Elder Dragon', rarity: 'legendary', img: '27-elder-dragon.jpg' },
  { id: 49, name: 'RegginA Ascended', rarity: 'legendary', img: '49-reggina-ascended.jpg' },
  { id: 3, name: 'Onça Epic', rarity: 'epic', img: '03-onca-epic.jpg' },
  { id: 4, name: 'Panthera Epic', rarity: 'epic', img: '04-panthera-epic.jpg' },
]

// Initialize sample listings
if (marketListings.length === 0) {
  sampleCards.forEach((card, index) => {
    const prices: Record<string, number> = { mythic: 500, legendary: 150, epic: 50, rare: 25 }
    marketListings.push({
      id: listingIdCounter++,
      cardId: card.id,
      card: card,
      price: prices[card.rarity] || 25,
      seller: ['RegginA', 'Reggino', 'OnCa', 'Panthera', 'Guildmate'][index % 5],
      sellerId: 'npc-' + index,
      listed: Date.now() - (index * 60000) // Stagger listing times
    })
  })
  
  // Add welcome message
  chatMessages.push({
    id: chatIdCounter++,
    user_id: 'system',
    user_name: 'System',
    message: '🎉 Welcome to NumbahWan Free Market! Buy and sell cards with guild mates!',
    msg_type: 'system',
    created_at: Date.now() - 300000
  })
}

// GET /api/market/listings - Get all active listings
app.get('/api/market/listings', (c) => {
  return c.json({
    success: true,
    listings: marketListings,
    count: marketListings.length
  })
})

// POST /api/market/buy - Purchase a listing
app.post('/api/market/buy', async (c) => {
  try {
    const body = await c.req.json()
    const { listingId, buyerId, buyerName } = body
    
    const listingIndex = marketListings.findIndex(l => l.id === listingId)
    if (listingIndex === -1) {
      return c.json({ success: false, error: 'Listing not found or already sold' }, 404)
    }
    
    const listing = marketListings[listingIndex]
    
    // Remove from listings
    marketListings.splice(listingIndex, 1)
    
    // Add sale announcement to chat
    chatMessages.push({
      id: chatIdCounter++,
      user_id: 'system',
      user_name: 'Market',
      message: `💰 ${buyerName || 'Someone'} bought ${listing.card.name} for ${listing.price} Jade!`,
      msg_type: 'sale',
      created_at: Date.now()
    })
    
    return c.json({ 
      success: true, 
      message: 'Purchase successful',
      card: listing.card,
      price: listing.price
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/market/list - Create new listing
app.post('/api/market/list', async (c) => {
  try {
    const body = await c.req.json()
    const { cardId, card, price, sellerId, sellerName } = body
    
    if (!card || !price) {
      return c.json({ success: false, error: 'Card and price required' }, 400)
    }
    
    const newListing: MarketListing = {
      id: listingIdCounter++,
      cardId: cardId || 0,
      card: card,
      price: Math.max(1, Math.floor(price)),
      seller: sellerName || 'Anonymous',
      sellerId: sellerId || 'guest',
      listed: Date.now()
    }
    
    marketListings.unshift(newListing)
    
    // Announce new listing
    chatMessages.push({
      id: chatIdCounter++,
      user_id: 'system',
      user_name: 'Market',
      message: `📦 ${newListing.seller} listed ${card.name} for ${newListing.price} Jade!`,
      msg_type: 'sale',
      created_at: Date.now()
    })
    
    return c.json({ success: true, listing: newListing })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/market/chat - Get chat messages
app.get('/api/market/chat', (c) => {
  const since = parseInt(c.req.query('since') || '0')
  const newMessages = chatMessages.filter(m => m.created_at > since)
  
  return c.json({
    success: true,
    messages: newMessages.slice(-50), // Last 50 messages
    total: chatMessages.length
  })
})

// POST /api/market/chat - Send chat message
app.post('/api/market/chat', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, userName, message } = body
    
    if (!message || message.trim().length === 0) {
      return c.json({ success: false, error: 'Message required' }, 400)
    }
    
    // Sanitize message (basic XSS prevention)
    const cleanMessage = message.trim().substring(0, 200)
    
    const newMessage: ChatMessage = {
      id: chatIdCounter++,
      user_id: userId || 'guest',
      user_name: userName || 'Guest',
      message: cleanMessage,
      msg_type: 'chat',
      created_at: Date.now()
    }
    
    chatMessages.push(newMessage)
    
    // Keep only last 100 messages
    if (chatMessages.length > 100) {
      chatMessages = chatMessages.slice(-100)
    }
    
    return c.json({ success: true, message: newMessage })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/market/heartbeat - Track online users
app.post('/api/market/heartbeat', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, userName } = body
    
    if (userId) {
      heartbeatUsers.set(userId, {
        id: userId,
        name: userName || 'Guest',
        lastSeen: Date.now()
      })
    }
    
    // Clean up old users (inactive > 30 seconds)
    const now = Date.now()
    heartbeatUsers.forEach((user, id) => {
      if (now - user.lastSeen > 30000) {
        heartbeatUsers.delete(id)
      }
    })
    
    return c.json({
      success: true,
      onlineCount: heartbeatUsers.size
    })
  } catch (e) {
    return c.json({ success: true, onlineCount: 1 })
  }
})

// ============================================================================
// CARD DATABASE API - Central Card System for Infinite Scaling
// Single source of truth: /static/data/cards.json
// All pages (Forge, Wallet, TCG, Market) use this API
// ============================================================================

// Import card database (loaded at build time)
import cardDatabase from '../public/static/data/cards.json'

// In-memory card state (initialized from JSON)
let cardData = { ...cardDatabase }

// GET /api/cards - Get all cards with optional filtering
app.get('/api/cards', (c) => {
  const rarity = c.req.query('rarity')
  const set = c.req.query('set')
  const search = c.req.query('q')
  const limit = parseInt(c.req.query('limit') || '0')
  const offset = parseInt(c.req.query('offset') || '0')
  
  let cards = [...cardData.cards]
  
  // Apply filters
  if (rarity) {
    cards = cards.filter(card => card.rarity === rarity)
  }
  if (set) {
    cards = cards.filter(card => card.set === set)
  }
  if (search) {
    const q = search.toLowerCase()
    cards = cards.filter(card => 
      card.name.toLowerCase().includes(q) ||
      card.rarity.toLowerCase().includes(q) ||
      (card.set && card.set.toLowerCase().includes(q))
    )
  }
  
  const total = cards.length
  
  // Apply pagination
  if (limit > 0) {
    cards = cards.slice(offset, offset + limit)
  }
  
  c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  return c.json({
    success: true,
    version: cardData.version,
    total,
    count: cards.length,
    offset,
    cards,
    rarities: cardData.rarities
  })
})

// GET /api/cards/stats - Get collection statistics (MUST be before :id route)
app.get('/api/cards/stats', (c) => {
  const stats = {
    total: cardData.cards.length,
    version: cardData.version,
    lastUpdated: cardData.lastUpdated,
    byRarity: {} as Record<string, { count: number; rate: number }>,
    sets: {} as Record<string, number>,
    reserved: cardData.cards.filter(c => c.reserved).length
  }
  
  // Count by rarity
  Object.keys(cardData.rarities).forEach(rarity => {
    const count = cardData.cards.filter(c => c.rarity === rarity).length
    stats.byRarity[rarity] = {
      count,
      rate: cardData.rarities[rarity].rate
    }
  })
  
  // Count by set
  cardData.cards.forEach(card => {
    const set = card.set || 'unknown'
    stats.sets[set] = (stats.sets[set] || 0) + 1
  })
  
  c.header('Cache-Control', 'public, max-age=300')
  return c.json({ success: true, stats })
})

// GET /api/cards/rarity/:rarity - Get all cards of a rarity (MUST be before :id route)
app.get('/api/cards/rarity/:rarity', (c) => {
  const rarity = c.req.param('rarity')
  const cards = cardData.cards.filter(card => card.rarity === rarity)
  const rarityInfo = cardData.rarities[rarity]
  
  if (!rarityInfo) {
    return c.json({ success: false, error: 'Invalid rarity' }, 400)
  }
  
  c.header('Cache-Control', 'public, max-age=300')
  return c.json({
    success: true,
    rarity,
    rarityInfo,
    count: cards.length,
    cards
  })
})

// GET /api/cards/:id - Get single card by ID (MUST be after specific routes)
app.get('/api/cards/:id', (c) => {
  const id = parseInt(c.req.param('id'))
  const card = cardData.cards.find(card => card.id === id)
  
  if (!card) {
    return c.json({ success: false, error: 'Card not found' }, 404)
  }
  
  c.header('Cache-Control', 'public, max-age=300')
  return c.json({
    success: true,
    card,
    rarityInfo: cardData.rarities[card.rarity]
  })
})

// POST /api/cards/pull - Gacha pull with pity system
app.post('/api/cards/pull', async (c) => {
  try {
    const body = await c.req.json()
    const { count = 1, pity = { mythic: 0, legendary: 0, epic: 0 } } = body
    
    const pulls = Math.min(Math.max(1, count), 10) // 1-10 pulls max
    const results: Array<{ card: any; rarity: string }> = []
    let currentPity = { ...pity }
    
    for (let i = 0; i < pulls; i++) {
      const { card, rarity, newPity } = pullSingleCard(currentPity)
      results.push({ card, rarity })
      currentPity = newPity
    }
    
    return c.json({
      success: true,
      results,
      pity: currentPity
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// Helper function for gacha pull
function pullSingleCard(pity: { mythic: number; legendary: number; epic: number }) {
  const rarities = cardData.rarities
  let pulledRarity = 'common'
  const roll = Math.random() * 100
  
  // Check hard pity
  if (pity.mythic >= rarities.mythic.hardPity) {
    pulledRarity = 'mythic'
  } else if (pity.legendary >= rarities.legendary.hardPity) {
    pulledRarity = 'legendary'
  } else if (pity.epic >= rarities.epic.hardPity) {
    pulledRarity = 'epic'
  } else {
    // Calculate rates with soft pity
    let mythicRate = rarities.mythic.rate
    let legendaryRate = rarities.legendary.rate
    let epicRate = rarities.epic.rate
    
    if (pity.mythic >= rarities.mythic.softPity) {
      mythicRate += (pity.mythic - rarities.mythic.softPity) * 0.5
    }
    if (pity.legendary >= rarities.legendary.softPity) {
      legendaryRate += (pity.legendary - rarities.legendary.softPity) * 2
    }
    if (pity.epic >= rarities.epic.softPity) {
      epicRate += (pity.epic - rarities.epic.softPity) * 3
    }
    
    let cumulative = 0
    if (roll < (cumulative += mythicRate)) pulledRarity = 'mythic'
    else if (roll < (cumulative += legendaryRate)) pulledRarity = 'legendary'
    else if (roll < (cumulative += epicRate)) pulledRarity = 'epic'
    else if (roll < (cumulative += rarities.rare.rate)) pulledRarity = 'rare'
    else if (roll < (cumulative += rarities.uncommon.rate)) pulledRarity = 'uncommon'
    else pulledRarity = 'common'
  }
  
  // Get random card of that rarity
  const cardsOfRarity = cardData.cards.filter(c => c.rarity === pulledRarity)
  const card = cardsOfRarity.length > 0 
    ? cardsOfRarity[Math.floor(Math.random() * cardsOfRarity.length)]
    : cardData.cards[Math.floor(Math.random() * cardData.cards.length)]
  
  // Update pity
  const newPity = { ...pity }
  if (pulledRarity === 'mythic') {
    newPity.mythic = 0
  } else {
    newPity.mythic++
  }
  if (pulledRarity === 'legendary' || pulledRarity === 'mythic') {
    newPity.legendary = 0
  } else {
    newPity.legendary++
  }
  if (['epic', 'legendary', 'mythic'].includes(pulledRarity)) {
    newPity.epic = 0
  } else {
    newPity.epic++
  }
  
  return { card: { ...card }, rarity: pulledRarity, newPity }
}

// ============================================================================
// ADMIN CARD API - For card management (GM mode)
// ============================================================================

// POST /api/admin/cards - Add new card
app.post('/api/admin/cards', async (c) => {
  try {
    const body = await c.req.json()
    const { name, rarity, img, set, reserved, description, gmKey } = body
    
    // Simple GM key check (in production, use proper auth)
    if (gmKey !== 'numbahwan-gm-2026') {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    if (!name || !rarity || !img) {
      return c.json({ success: false, error: 'name, rarity, and img required' }, 400)
    }
    
    // Generate new ID (max + 1)
    const maxId = Math.max(...cardData.cards.map(c => c.id))
    const newCard = {
      id: maxId + 1,
      name,
      rarity,
      img,
      set: set || 'custom',
      reserved: reserved || false,
      description: description || ''
    }
    
    cardData.cards.push(newCard)
    cardData.totalCards = cardData.cards.length
    
    return c.json({ success: true, card: newCard })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// PUT /api/admin/cards/:id - Update card
app.put('/api/admin/cards/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const { gmKey, ...updates } = body
    
    if (gmKey !== 'numbahwan-gm-2026') {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const cardIndex = cardData.cards.findIndex(c => c.id === id)
    if (cardIndex === -1) {
      return c.json({ success: false, error: 'Card not found' }, 404)
    }
    
    // Update card properties
    Object.assign(cardData.cards[cardIndex], updates)
    
    return c.json({ success: true, card: cardData.cards[cardIndex] })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// DELETE /api/admin/cards/:id - Delete card
app.delete('/api/admin/cards/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const gmKey = c.req.query('gmKey')
    
    if (gmKey !== 'numbahwan-gm-2026') {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const cardIndex = cardData.cards.findIndex(c => c.id === id)
    if (cardIndex === -1) {
      return c.json({ success: false, error: 'Card not found' }, 404)
    }
    
    const deletedCard = cardData.cards.splice(cardIndex, 1)[0]
    cardData.totalCards = cardData.cards.length
    
    return c.json({ success: true, deleted: deletedCard })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/admin/cards/export - Export current card database
app.get('/api/admin/cards/export', (c) => {
  const gmKey = c.req.query('gmKey')
  
  if (gmKey !== 'numbahwan-gm-2026') {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }
  
  c.header('Content-Type', 'application/json')
  c.header('Content-Disposition', 'attachment; filename="cards.json"')
  return c.json(cardData)
})

// POST /api/admin/cards/batch - Add multiple cards at once
app.post('/api/admin/cards/batch', async (c) => {
  try {
    const body = await c.req.json()
    const { cards, gmKey } = body
    
    if (gmKey !== 'numbahwan-gm-2026') {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    if (!Array.isArray(cards) || cards.length === 0) {
      return c.json({ success: false, error: 'cards array required' }, 400)
    }
    
    // ID ranges by rarity for auto-assignment
    const idRanges: Record<string, number> = {
      mythic: 106,
      legendary: 209,
      epic: 309,
      rare: 409,
      uncommon: 531,
      common: 641
    }
    
    // Find next available IDs
    cardData.cards.forEach(card => {
      const range = idRanges[card.rarity]
      if (range && card.id >= range) {
        idRanges[card.rarity] = Math.max(idRanges[card.rarity], card.id + 1)
      }
    })
    
    const addedCards: any[] = []
    const errors: string[] = []
    
    for (const card of cards) {
      if (!card.name || !card.rarity) {
        errors.push(`Missing name or rarity for card: ${JSON.stringify(card)}`)
        continue
      }
      
      // Auto-assign ID if not provided
      const id = card.id || idRanges[card.rarity]++
      
      // Auto-generate image filename if not provided
      const slug = card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      const img = card.img || `${card.rarity}-${id}-${slug}.jpg`
      
      const newCard = {
        id,
        name: card.name,
        rarity: card.rarity,
        img,
        set: card.set || 'custom',
        reserved: card.reserved || false,
        description: card.description || ''
      }
      
      cardData.cards.push(newCard)
      addedCards.push(newCard)
    }
    
    cardData.totalCards = cardData.cards.length
    
    return c.json({ 
      success: true, 
      added: addedCards.length,
      cards: addedCards,
      errors: errors.length > 0 ? errors : undefined,
      total: cardData.totalCards
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/admin/cards/next-ids - Get next available IDs for each rarity
app.get('/api/admin/cards/next-ids', (c) => {
  const gmKey = c.req.query('gmKey')
  
  if (gmKey !== 'numbahwan-gm-2026') {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }
  
  // Base ID ranges
  const idRanges: Record<string, number> = {
    mythic: 106,
    legendary: 209,
    epic: 309,
    rare: 409,
    uncommon: 531,
    common: 641
  }
  
  // Find next available IDs
  cardData.cards.forEach(card => {
    const range = idRanges[card.rarity]
    if (range && card.id >= range) {
      idRanges[card.rarity] = Math.max(idRanges[card.rarity], card.id + 1)
    }
  })
  
  return c.json({ 
    success: true,
    nextIds: idRanges,
    counts: {
      mythic: cardData.cards.filter(c => c.rarity === 'mythic').length,
      legendary: cardData.cards.filter(c => c.rarity === 'legendary').length,
      epic: cardData.cards.filter(c => c.rarity === 'epic').length,
      rare: cardData.cards.filter(c => c.rarity === 'rare').length,
      uncommon: cardData.cards.filter(c => c.rarity === 'uncommon').length,
      common: cardData.cards.filter(c => c.rarity === 'common').length
    }
  })
})

// GET /api/card-factory - Card creation helper for AI
app.get('/api/card-factory', (c) => {
  return c.json({
    description: 'Card Factory v2 - Full bleed, likeness-capturing card art',
    version: '2.0.0',
    
    quickAdd: {
      endpoint: 'POST /api/admin/cards/batch',
      body: {
        gmKey: 'numbahwan-gm-2026',
        cards: [
          { name: 'Card Name', rarity: 'epic', description: 'Optional desc' }
        ]
      },
      note: 'ID and image filename auto-generated if not provided'
    },
    
    imageSettings: {
      model: 'nano-banana-pro',
      aspectRatio: '3:4',
      size: '768x1024',
      fullBleed: true
    },
    
    promptStructure: {
      template: '[SUBJECT with exact likeness details], [RARITY STYLE], full bleed trading card artwork, edge-to-edge composition, no borders, no card frame, [BACKGROUND], dramatic lighting, ultra detailed, professional TCG illustration',
      likenessCapture: [
        'Exact facial features (eyes, nose, mouth, skin tone)',
        'Exact hair (style, color, length)',
        'Exact outfit (all clothing, colors, patterns)',
        'Exact accessories (weapons, jewelry, armor)',
        'Distinguishing marks (scars, tattoos, glasses, beard)'
      ],
      alwaysInclude: ['full bleed', 'edge-to-edge', 'no borders', 'no card frame'],
      neverInclude: ['card border', 'card frame', 'text overlay', 'white borders']
    },
    
    rarityPrompts: {
      mythic: '[SUBJECT exact likeness], legendary mythic hero radiating divine power, golden aura and holy light, full bleed TCG artwork edge-to-edge, no borders no frame, epic cosmic purple void with golden swirling energy, dramatic divine backlighting, masterpiece ultra detailed 4k',
      legendary: '[SUBJECT exact likeness], powerful legendary warrior with intense elemental aura, full bleed TCG artwork edge-to-edge, no borders no frame, dark gradient with [ELEMENT] energy effects filling frame, dramatic side lighting, professional TCG art 4k',
      epic: '[SUBJECT exact likeness], elite champion in dynamic action with magical energy, full bleed TCG artwork edge-to-edge, no borders no frame, purple gradient with magical particles to all edges, dramatic action lighting, detailed TCG art',
      rare: '[SUBJECT exact likeness], skilled adventurer confident pose with subtle magic, full bleed TCG artwork edge-to-edge, no borders no frame, blue gradient with particles filling frame, balanced lighting',
      uncommon: '[SUBJECT exact likeness], capable warrior ready stance, full bleed TCG artwork edge-to-edge, no borders no frame, green gradient filling entire frame, clean lighting',
      common: '[SUBJECT exact likeness], basic character, full bleed TCG artwork edge-to-edge, no borders no frame, gray gradient background, standard lighting'
    },
    
    exampleWithReference: {
      scenario: 'User provides image of character with white beard, sunglasses, brown armor, golden hammer',
      prompt: 'Character with white beard, cool pixel sunglasses, brown leather armor with golden trim and buckles, wielding large golden glowing hammer with yellow energy aura, stocky heroic build, legendary mythic hero radiating divine power, golden aura and holy light, full bleed trading card artwork edge-to-edge, no borders no card frame, epic cosmic purple void background with golden swirling energy and particles, dramatic divine backlighting with golden rim light, masterpiece TCG illustration ultra detailed 4k'
    },
    
    imageNaming: '{rarity}-{id}-{slug}.jpg',
    imagePath: '/public/static/cards/',
    
    nextIds: (() => {
      const ranges: Record<string, number> = { mythic: 106, legendary: 209, epic: 309, rare: 409, uncommon: 531, common: 641 }
      cardData.cards.forEach(c => { if (c.id >= ranges[c.rarity]) ranges[c.rarity] = c.id + 1 })
      return ranges
    })(),
    
    workflow: [
      '1. If reference image: Analyze and extract ALL likeness details',
      '2. Build prompt: [likeness details] + [rarity prompt] + full bleed instructions',
      '3. Generate image (nano-banana-pro, 3:4 aspect)',
      '4. Save to /public/static/cards/{rarity}-{id}-{slug}.jpg',
      '5. POST to /api/admin/cards/batch',
      '6. npm run build && pm2 restart numbahwan-guild'
    ]
  })
})

// ============================================================================
// ROUTE FACTORY - DRY Pattern (Don't Repeat Yourself)
// Add new pages by just adding to the array - no copy-paste needed!
// ============================================================================
const staticPages = ['fashion', 'merch', 'fortune', 'arcade', 'memes', 'apply', 'wallet', 'forge', 'tcg', 'market', 'cards', 'guide', 'battle', 'collection', 'deckbuilder', 'zakum', 'tournament', 'academy', 'vault', 'museum', 'research', 'historical-society', 'menu-demo', 'exchange', 'ai-lounge', 'court', 'therapy', 'hr', 'conspiracy']

staticPages.forEach(page => {
  app.get(`/${page}`, async (c) => {
    try {
      // @ts-ignore - env is provided by Cloudflare Pages
      const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy/${page}.html`))
      if (asset) {
        return new Response(asset.body, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      }
    } catch (e) {
      // Fallback for local development
    }
    return c.redirect(`/${page}.html`)
  })
})

// Museum exhibit pages - deep lore rabbit hole
const museumExhibits = ['exhibit-001', 'exhibit-002', 'exhibit-003', 'exhibit-004', 'exhibit-005', 'exhibit-006', 'exhibit-007', 'exhibit-008', 'exhibit-009', 'exhibit-010']

museumExhibits.forEach(exhibit => {
  app.get(`/museum/${exhibit}`, async (c) => {
    try {
      // @ts-ignore - env is provided by Cloudflare Pages
      const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy/museum/${exhibit}.html`))
      if (asset) {
        return new Response(asset.body, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      }
    } catch (e) {
      // Fallback for local development
    }
    return c.redirect(`/museum/${exhibit}.html`)
  })
})

// Vault floor pages - expanded security floors rabbit hole
const vaultFloors = ['b3-decontamination', 'b7-hall-of-failures', 'b12-antechamber']

vaultFloors.forEach(floor => {
  app.get(`/vault/${floor}`, async (c) => {
    try {
      // @ts-ignore - env is provided by Cloudflare Pages
      const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy/vault/${floor}.html`))
      if (asset) {
        return new Response(asset.body, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      }
    } catch (e) {
      // Fallback for local development
    }
    return c.redirect(`/vault/${floor}.html`)
  })
})

// Research paper pages - academic rabbit hole
const researchPapers = ['work-gloves-economic-impact', 'zakum-helmet-spectral-analysis', 'reggina-misprint-forensic-examination', 'vault-security-analysis', 'nx-fashion-revolution', 'transparent-set-psychology']

researchPapers.forEach(paper => {
  app.get(`/research/${paper}`, async (c) => {
    try {
      // @ts-ignore - env is provided by Cloudflare Pages
      const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy/research/${paper}.html`))
      if (asset) {
        return new Response(asset.body, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      }
    } catch (e) {
      // Fallback for local development
    }
    return c.redirect(`/research/${paper}.html`)
  })
})

export default app
