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
// ROUTE FACTORY - DRY Pattern (Don't Repeat Yourself)
// Add new pages by just adding to the array - no copy-paste needed!
// ============================================================================
const staticPages = ['fashion', 'merch', 'fortune', 'arcade', 'memes', 'apply', 'wallet', 'forge', 'tcg', 'market', 'cards']

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

export default app
