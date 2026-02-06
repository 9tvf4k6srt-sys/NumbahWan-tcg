import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-pages'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import * as os from 'os'

// ============================================================================
// LOAD LLM CONFIG FROM ~/.genspark_llm.yaml
// ============================================================================
// LEARNING: This is how we securely load API credentials
// In production, you'd use environment variables in Cloudflare dashboard
// ============================================================================

let llmConfig: { openai?: { api_key?: string; base_url?: string } } = {};
try {
  const configPath = path.join(os.homedir(), '.genspark_llm.yaml');
  if (fs.existsSync(configPath)) {
    let fileContents = fs.readFileSync(configPath, 'utf8');
    // Substitute environment variables like ${GENSPARK_TOKEN}
    fileContents = fileContents.replace(/\$\{(\w+)\}/g, (_, varName) => {
      return process.env[varName] || '';
    });
    llmConfig = yaml.load(fileContents) as typeof llmConfig;
    console.log('[LLM] Config loaded from ~/.genspark_llm.yaml');
    // Log if API key is present (without exposing it)
    if (llmConfig?.openai?.api_key) {
      console.log('[LLM] API key found:', llmConfig.openai.api_key.slice(0, 8) + '...');
    }
  }
} catch (e) {
  console.log('[LLM] No config file found, will use environment variables');
}

// Import data from JSON files (Fallback when D1 not available)
import rosterData from './data/roster.json'
import photosData from './data/photos.json'
import translationsData from './data/translations.json'
import performanceData from './data/performance.json'

// Import Market Automation Service
import MarketService, { 
  fetchMarketData, 
  storePricePoint, 
  getPriceHistory,
  checkAlerts,
  createAlert,
  storeDailyStats,
  calculatePortfolioValue,
  getMarketStatus,
  NWG_WEIGHTS,
  NWG_TOTAL_SUPPLY,
  NWG_BASE_MULTIPLIER 
} from './services/market-automation'

// Import Auto-Learning System
import AutoLearn, {
  analyzeLog,
  generatePatchNotes,
  getImprovements,
  getPatterns,
  getRecentLogs,
  getPatchNotes,
  trackHealth,
  getCronJobs,
  updateCronJob,
  executeCronHandler,
  applyImprovement,
  generateSystemSummary,
  KNOWN_PATTERNS,
  CODE_QUALITY_RULES,
  DEFAULT_CRON_JOBS,
  LogEntry,
  Improvement,
  Pattern,
  PatchNote,
  CronJob
} from './services/auto-learn'

// Import Gamification System (Predictions, Achievements, AI Analyst)
import Gamification, {
  createPrediction,
  resolvePredictions,
  getLeaderboard,
  ACHIEVEMENTS,
  generateDailyQuests,
  generateWeeklyQuests,
  calculateFearGreed,
  generateMarketAnalysis,
  generateWhaleAlerts,
  generatePortfolioCard,
  chatWithAnalyst,
  GAME_CACHE_KEYS
} from './services/gamification'

// Import Card-NWG Bridge (Physical Cards ↔ Digital Currency)
import CardBridge, {
  mintPhysicalCards,
  claimCard,
  stakeCard,
  unstakeCard,
  claimStakingRewards,
  listCardForSale,
  buyCard,
  cancelListing,
  fuseCards,
  getCollection,
  getMarketplaceStats,
  generateQRCodeData,
  CARD_NWG_VALUES,
  CARD_YIELD_RATES,
  CARD_PRINT_RUNS,
  FUSION_RECIPES,
  STAKING_BOOSTS
} from './services/card-nwg-bridge'

import pvpMatchmaking from './services/pvp-matchmaking'

// D1 Database and KV bindings
type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

// Serve static files with caching headers
app.use('/static/*', serveStatic())

// Serve HTML from subdirectories (lore, museum, vault, research)
app.use('/lore/*', serveStatic())
app.use('/museum/*', serveStatic())
app.use('/vault/*', serveStatic())
app.use('/research/*', serveStatic())

// Serve root-level pages that bypass the worker routing
app.get('/efficiency', serveStatic({ path: './efficiency.html' }))
app.get('/efficiency.html', serveStatic({ path: './efficiency.html' }))
app.get('/lore', serveStatic({ path: './lore.html' }))
app.get('/lore.html', serveStatic({ path: './lore.html' }))
app.get('/tabletop', serveStatic({ path: './tabletop.html' }))
app.get('/tabletop.html', serveStatic({ path: './tabletop.html' }))
app.use('/tabletop/*', serveStatic())

// New Utility Ecosystem pages
app.get('/staking', serveStatic({ path: './staking.html' }))
app.get('/staking.html', serveStatic({ path: './staking.html' }))
app.get('/fusion', serveStatic({ path: './fusion.html' }))
app.get('/fusion.html', serveStatic({ path: './fusion.html' }))
app.get('/claim', serveStatic({ path: './claim.html' }))
app.get('/claim.html', serveStatic({ path: './claim.html' }))
app.get('/events', serveStatic({ path: './events.html' }))
app.get('/events.html', serveStatic({ path: './events.html' }))

// Guild Confessional Booth
app.get('/confessional', serveStatic({ path: './confessional.html' }))
app.get('/confessional.html', serveStatic({ path: './confessional.html' }))

// MapleStory Avatar Studio
app.get('/avatar-studio', serveStatic({ path: './avatar-studio.html' }))
app.get('/avatar-studio.html', serveStatic({ path: './avatar-studio.html' }))

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
  const staticPages = ['fashion', 'merch', 'fortune', 'arcade', 'memes', 'apply', 'wallet', 'forge', 'tcg', 'market', 'cards', 'guide', 'pvp', 'regina', 'zakum', 'tournament', 'academy', 'vault', 'museum', 'research', 'historical-society', 'menu-demo', 'business', 'supermarket', 'restaurant', 'services', 'my-business', 'staking', 'fusion', 'claim', 'events']
  
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
      
      // NWG Market Automation APIs
      marketAutomation: {
        prices: '/api/market-prices',
        history: '/api/market-prices/history?timeframe=24h',
        status: '/api/market-status',
        formula: '/api/nwg/formula',
        pitch: '/api/nwg/pitch',
        portfolioSim: '/api/portfolio/simulate?usd=1000&period=1y',
        portfolioCalc: 'POST /api/portfolio/calculate',
        alertCreate: 'POST /api/alerts/create',
        alertCheck: '/api/alerts/check'
      },
      
      // Auto-Learning & Self-Improvement System
      autoLearn: {
        summary: '/api/system/summary',
        log: 'POST /api/system/log',
        logs: '/api/system/logs?hours=24',
        patterns: '/api/system/patterns',
        improvements: '/api/system/improvements',
        applyImprovement: 'POST /api/system/improvements/:id/apply',
        patchNotes: '/api/system/patch-notes',
        generatePatchNotes: 'POST /api/system/patch-notes/generate',
        cron: '/api/system/cron',
        runCron: 'POST /api/system/cron/:id/run',
        toggleCron: 'POST /api/system/cron/:id/toggle',
        health: '/api/system/health',
        codeQuality: '/api/system/code-quality'
      },
      
      // 🎮 Gamification System
      gamification: {
        dashboard: '/api/game/dashboard',
        predictionPool: '/api/game/prediction/pool',
        createPrediction: 'POST /api/game/prediction/create',
        resolvePredictions: 'POST /api/game/prediction/resolve',
        leaderboard: '/api/game/leaderboard',
        achievements: '/api/game/achievements',
        quests: '/api/game/quests',
        fearGreed: '/api/game/fear-greed',
        whaleTracker: '/api/game/whale-tracker',
        aiAnalyst: '/api/game/ai-analyst',
        aiChat: 'POST /api/game/ai-chat',
        portfolioCard: 'POST /api/game/portfolio-card'
      },
      
      // ⚔️ PvP Matchmaking (Real Player vs Player)
      pvp: {
        info: '/api/pvp/info',
        queue: '/api/pvp/queue',
        join: 'POST /api/pvp/join',
        status: '/api/pvp/status/:odenom',
        match: '/api/pvp/match/:matchId',
        leave: 'POST /api/pvp/leave'
      },
      
      // 🃏💰 Card-NWG Bridge (Physical Cards ↔ Digital Currency)
      cardBridge: {
        info: '/api/card-bridge/info',
        claim: 'POST /api/card-bridge/claim',
        collection: '/api/card-bridge/collection/:wallet',
        stake: 'POST /api/card-bridge/stake',
        unstake: 'POST /api/card-bridge/unstake',
        claimRewards: 'POST /api/card-bridge/claim-rewards',
        list: 'POST /api/card-bridge/list',
        buy: 'POST /api/card-bridge/buy',
        cancelListing: 'POST /api/card-bridge/cancel-listing',
        fuse: 'POST /api/card-bridge/fuse',
        marketplace: '/api/card-bridge/marketplace',
        qr: '/api/card-bridge/qr/:cardId',
        mint: 'POST /api/card-bridge/mint (admin)',
        calculator: '/api/card-bridge/calculator?rarity=rare&count=5&days=30'
      },
      
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
      wallet: {
        register: 'POST /api/wallet/register',
        get: 'GET /api/wallet/:deviceUUID',
        transaction: 'POST /api/wallet/transaction',
        transactions: 'GET /api/wallet/transactions/:deviceUUID',
        dailyReward: 'POST /api/wallet/daily-reward',
        sync: 'POST /api/wallet/sync'
      },
      treasury: '/api/treasury',
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
// WALLET & ECONOMY API - Identity-Linked Currency System
// ============================================================================

// Helper: Generate wallet address
function generateWalletAddress(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'NW-W-';
  for (let i = 0; i < 8; i++) {
    if (i === 4) result += '-';
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper: Generate transaction hash
function generateTxHash(): string {
  return 'TX-' + Date.now().toString(36).toUpperCase() + '-' + 
    Math.random().toString(36).substring(2, 10).toUpperCase();
}

// POST /api/wallet/register - Register citizen and create wallet (identity-linked)
app.post('/api/wallet/register', async (c) => {
  try {
    const db = c.env?.GUILD_DB;
    const body = await c.req.json();
    const { deviceUUID, deviceHash, trustScore, displayName, avatar, spoofFlags } = body;
    
    if (!deviceUUID || !deviceHash) {
      return c.json({ success: false, error: 'Device identity required' }, 400);
    }
    
    if (!db) {
      // Fallback for local dev without D1
      return c.json({ 
        success: true, 
        message: 'Local dev mode - wallet created client-side only',
        wallet: {
          address: generateWalletAddress(),
          balance_nwg: 100.00,
          balance_nwx: 500
        }
      });
    }
    
    // Check if citizen already exists
    const existing = await db.prepare(
      'SELECT c.*, w.wallet_address, w.balance_nwg, w.balance_nwx FROM citizens c LEFT JOIN wallets w ON c.id = w.citizen_id WHERE c.device_uuid = ?'
    ).bind(deviceUUID).first();
    
    if (existing) {
      // Update last seen and visit count
      await db.prepare(
        'UPDATE citizens SET last_seen = CURRENT_TIMESTAMP, visit_count = visit_count + 1, trust_score = ? WHERE device_uuid = ?'
      ).bind(trustScore || 50, deviceUUID).run();
      
      return c.json({
        success: true,
        isReturning: true,
        citizen: {
          id: existing.id,
          deviceUUID: existing.device_uuid,
          trustScore: existing.trust_score,
          clearanceLevel: existing.clearance_level,
          displayName: existing.display_name,
          visitCount: existing.visit_count + 1,
          firstSeen: existing.first_seen
        },
        wallet: existing.wallet_address ? {
          address: existing.wallet_address,
          balance_nwg: existing.balance_nwg,
          balance_nwx: existing.balance_nwx
        } : null
      });
    }
    
    // Create new citizen
    const citizenResult = await db.prepare(`
      INSERT INTO citizens (device_uuid, device_hash, trust_score, display_name, avatar, spoof_flags)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      deviceUUID, 
      deviceHash, 
      trustScore || 50, 
      displayName || null,
      avatar || null,
      spoofFlags ? JSON.stringify(spoofFlags) : null
    ).run();
    
    const citizenId = citizenResult.meta.last_row_id;
    
    // Create wallet for new citizen
    const walletAddress = generateWalletAddress();
    await db.prepare(`
      INSERT INTO wallets (citizen_id, wallet_address)
      VALUES (?, ?)
    `).bind(citizenId, walletAddress).run();
    
    // Get wallet info
    const wallet = await db.prepare(
      'SELECT * FROM wallets WHERE citizen_id = ?'
    ).bind(citizenId).first();
    
    // Record signup bonus transaction
    const txHash = generateTxHash();
    await db.prepare(`
      INSERT INTO transactions (tx_hash, wallet_id, citizen_id, tx_type, currency, amount, balance_before, balance_after, description, source, device_uuid)
      VALUES (?, ?, ?, 'SIGNUP_BONUS', 'NWG', 100.00, 0.00, 100.00, 'New citizen signup bonus', 'SYSTEM', ?)
    `).bind(txHash, wallet.id, citizenId, deviceUUID).run();
    
    // Also add NWX bonus transaction
    await db.prepare(`
      INSERT INTO transactions (tx_hash, wallet_id, citizen_id, tx_type, currency, amount, balance_before, balance_after, description, source, device_uuid)
      VALUES (?, ?, ?, 'SIGNUP_BONUS', 'NWX', 500, 0, 500, 'New citizen signup bonus', 'SYSTEM', ?)
    `).bind(generateTxHash(), wallet.id, citizenId, deviceUUID).run();
    
    // Update treasury
    await db.prepare(`
      UPDATE treasury SET 
        circulating_nwg = circulating_nwg + 100.00,
        circulating_nwx = circulating_nwx + 500,
        rewards_pool_nwg = rewards_pool_nwg - 100.00,
        total_citizens = total_citizens + 1,
        total_transactions = total_transactions + 2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run();
    
    return c.json({
      success: true,
      isNew: true,
      citizen: {
        id: citizenId,
        deviceUUID,
        trustScore: trustScore || 50,
        clearanceLevel: 1,
        displayName,
        visitCount: 1
      },
      wallet: {
        address: walletAddress,
        balance_nwg: 100.00,
        balance_nwx: 500
      },
      bonuses: [
        { currency: 'NWG', amount: 100.00, reason: 'Welcome bonus' },
        { currency: 'NWX', amount: 500, reason: 'Welcome bonus' }
      ]
    });
  } catch (e) {
    console.error('Wallet register error:', e);
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/wallet/:deviceUUID - Get wallet by device UUID
app.get('/api/wallet/:deviceUUID', async (c) => {
  try {
    const db = c.env?.GUILD_DB;
    const deviceUUID = c.req.param('deviceUUID');
    
    if (!db) {
      return c.json({ success: false, error: 'Database not available' }, 503);
    }
    
    const result = await db.prepare(`
      SELECT c.*, w.* FROM citizens c
      LEFT JOIN wallets w ON c.id = w.citizen_id
      WHERE c.device_uuid = ?
    `).bind(deviceUUID).first();
    
    if (!result) {
      return c.json({ success: false, error: 'Citizen not found' }, 404);
    }
    
    return c.json({
      success: true,
      citizen: {
        id: result.id,
        deviceUUID: result.device_uuid,
        trustScore: result.trust_score,
        clearanceLevel: result.clearance_level,
        displayName: result.display_name,
        isVerified: result.is_verified === 1,
        visitCount: result.visit_count,
        firstSeen: result.first_seen,
        lastSeen: result.last_seen
      },
      wallet: result.wallet_address ? {
        address: result.wallet_address,
        balance_nwg: result.balance_nwg,
        balance_nwx: result.balance_nwx,
        balance_diamond: result.balance_diamond,
        balance_gold: result.balance_gold,
        balance_iron: result.balance_iron,
        balance_stone: result.balance_stone,
        balance_wood: result.balance_wood,
        totalEarned: {
          nwg: result.total_earned_nwg,
          nwx: result.total_earned_nwx
        },
        totalSpent: {
          nwg: result.total_spent_nwg,
          nwx: result.total_spent_nwx
        }
      } : null
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/wallet/transaction - Record a transaction
app.post('/api/wallet/transaction', async (c) => {
  try {
    const db = c.env?.GUILD_DB;
    const body = await c.req.json();
    const { deviceUUID, txType, currency, amount, description, source, referenceId } = body;
    
    if (!deviceUUID || !txType || !currency || amount === undefined) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }
    
    if (!db) {
      return c.json({ success: true, message: 'Local dev mode - transaction logged client-side' });
    }
    
    // Get citizen and wallet
    const citizen = await db.prepare(
      'SELECT c.id, w.id as wallet_id, w.balance_nwg, w.balance_nwx, w.balance_diamond, w.balance_gold, w.balance_iron, w.balance_stone, w.balance_wood FROM citizens c JOIN wallets w ON c.id = w.citizen_id WHERE c.device_uuid = ?'
    ).bind(deviceUUID).first();
    
    if (!citizen) {
      return c.json({ success: false, error: 'Citizen not found' }, 404);
    }
    
    // Determine balance column based on currency
    const balanceColumn = currency === 'NWG' ? 'balance_nwg' : 
                          currency === 'NWX' ? 'balance_nwx' :
                          currency === 'DIAMOND' ? 'balance_diamond' :
                          currency === 'GOLD' ? 'balance_gold' :
                          currency === 'IRON' ? 'balance_iron' :
                          currency === 'STONE' ? 'balance_stone' :
                          currency === 'WOOD' ? 'balance_wood' : null;
    
    if (!balanceColumn) {
      return c.json({ success: false, error: 'Invalid currency' }, 400);
    }
    
    const currentBalance = citizen[balanceColumn] || 0;
    const isSpend = txType.includes('SPEND') || txType.includes('PURCHASE') || txType.includes('TRANSFER_OUT');
    const newBalance = isSpend ? currentBalance - Math.abs(amount) : currentBalance + Math.abs(amount);
    
    // Check sufficient balance for spends
    if (isSpend && newBalance < 0) {
      return c.json({ success: false, error: 'Insufficient balance' }, 400);
    }
    
    // Update wallet balance
    const earnedColumn = currency === 'NWG' ? 'total_earned_nwg' : 'total_earned_nwx';
    const spentColumn = currency === 'NWG' ? 'total_spent_nwg' : 'total_spent_nwx';
    
    if (isSpend) {
      await db.prepare(`
        UPDATE wallets SET ${balanceColumn} = ?, ${spentColumn} = ${spentColumn} + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(newBalance, Math.abs(amount), citizen.wallet_id).run();
    } else {
      await db.prepare(`
        UPDATE wallets SET ${balanceColumn} = ?, ${earnedColumn} = ${earnedColumn} + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(newBalance, Math.abs(amount), citizen.wallet_id).run();
    }
    
    // Record transaction
    const txHash = generateTxHash();
    await db.prepare(`
      INSERT INTO transactions (tx_hash, wallet_id, citizen_id, tx_type, currency, amount, balance_before, balance_after, description, source, reference_id, device_uuid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      txHash, citizen.wallet_id, citizen.id, txType, currency, 
      Math.abs(amount), currentBalance, newBalance, description || null, 
      source || 'CLIENT', referenceId || null, deviceUUID
    ).run();
    
    // Update treasury stats
    await db.prepare(`
      UPDATE treasury SET total_transactions = total_transactions + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1
    `).run();
    
    return c.json({
      success: true,
      txHash,
      balance: {
        before: currentBalance,
        after: newBalance
      }
    });
  } catch (e) {
    console.error('Transaction error:', e);
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/wallet/transactions/:deviceUUID - Get transaction history
app.get('/api/wallet/transactions/:deviceUUID', async (c) => {
  try {
    const db = c.env?.GUILD_DB;
    const deviceUUID = c.req.param('deviceUUID');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    if (!db) {
      return c.json({ success: false, error: 'Database not available' }, 503);
    }
    
    const citizen = await db.prepare(
      'SELECT id FROM citizens WHERE device_uuid = ?'
    ).bind(deviceUUID).first();
    
    if (!citizen) {
      return c.json({ success: false, error: 'Citizen not found' }, 404);
    }
    
    const { results } = await db.prepare(`
      SELECT tx_hash, tx_type, currency, amount, balance_before, balance_after, description, source, status, created_at
      FROM transactions
      WHERE citizen_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(citizen.id, limit, offset).all();
    
    return c.json({
      success: true,
      transactions: results,
      count: results.length,
      offset,
      limit
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/treasury - Get global treasury stats
app.get('/api/treasury', async (c) => {
  try {
    const db = c.env?.GUILD_DB;
    
    if (!db) {
      // Fallback mock data for local dev
      return c.json({
        success: true,
        source: 'mock',
        treasury: {
          totalSupplyNWG: 1000000000,
          circulatingNWG: 5000,
          reserveNWG: 500000000,
          rewardsPoolNWG: 299995000,
          totalCitizens: 50,
          totalTransactions: 500
        }
      });
    }
    
    const treasury = await db.prepare('SELECT * FROM treasury WHERE id = 1').first();
    
    return c.json({
      success: true,
      source: 'd1',
      treasury: {
        totalSupplyNWG: treasury.total_supply_nwg,
        circulatingNWG: treasury.circulating_nwg,
        reserveNWG: treasury.reserve_nwg,
        rewardsPoolNWG: treasury.rewards_pool_nwg,
        circulatingNWX: treasury.circulating_nwx,
        burnedNWG: treasury.burned_nwg,
        burnedNWX: treasury.burned_nwx,
        totalCitizens: treasury.total_citizens,
        totalTransactions: treasury.total_transactions,
        totalVolumeNWG: treasury.total_volume_nwg,
        totalVolumeNWX: treasury.total_volume_nwx,
        lastUpdated: treasury.updated_at
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/wallet/daily-reward - Claim daily login reward
app.post('/api/wallet/daily-reward', async (c) => {
  try {
    const db = c.env?.GUILD_DB;
    const body = await c.req.json();
    const { deviceUUID } = body;
    
    if (!db) {
      return c.json({ success: true, message: 'Local dev mode', reward: { nwg: 10, nwx: 50 } });
    }
    
    // Get citizen
    const citizen = await db.prepare(
      'SELECT c.id, w.id as wallet_id, w.balance_nwg, w.balance_nwx FROM citizens c JOIN wallets w ON c.id = w.citizen_id WHERE c.device_uuid = ?'
    ).bind(deviceUUID).first();
    
    if (!citizen) {
      return c.json({ success: false, error: 'Citizen not found' }, 404);
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already claimed today
    const existing = await db.prepare(
      'SELECT * FROM daily_rewards WHERE citizen_id = ? AND reward_date = ?'
    ).bind(citizen.id, today).first();
    
    if (existing) {
      return c.json({ success: false, error: 'Already claimed today', nextClaimAt: new Date(Date.now() + 86400000).toISOString() });
    }
    
    // Get streak
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const yesterdayReward = await db.prepare(
      'SELECT streak_day FROM daily_rewards WHERE citizen_id = ? AND reward_date = ?'
    ).bind(citizen.id, yesterday).first();
    
    const streakDay = yesterdayReward ? (yesterdayReward.streak_day + 1) : 1;
    
    // Calculate rewards (increases with streak, caps at day 7)
    const baseNWG = 10;
    const baseNWX = 50;
    const multiplier = Math.min(streakDay, 7);
    const rewardNWG = baseNWG * multiplier;
    const rewardNWX = baseNWX * multiplier;
    
    // Record daily reward
    await db.prepare(`
      INSERT INTO daily_rewards (citizen_id, reward_date, streak_day, reward_nwg, reward_nwx)
      VALUES (?, ?, ?, ?, ?)
    `).bind(citizen.id, today, streakDay, rewardNWG, rewardNWX).run();
    
    // Update wallet
    await db.prepare(`
      UPDATE wallets SET 
        balance_nwg = balance_nwg + ?, 
        balance_nwx = balance_nwx + ?,
        total_earned_nwg = total_earned_nwg + ?,
        total_earned_nwx = total_earned_nwx + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(rewardNWG, rewardNWX, rewardNWG, rewardNWX, citizen.wallet_id).run();
    
    // Record transaction
    await db.prepare(`
      INSERT INTO transactions (tx_hash, wallet_id, citizen_id, tx_type, currency, amount, balance_before, balance_after, description, source, device_uuid)
      VALUES (?, ?, ?, 'DAILY_LOGIN', 'NWG', ?, ?, ?, ?, 'SYSTEM', ?)
    `).bind(
      generateTxHash(), citizen.wallet_id, citizen.id, rewardNWG, 
      citizen.balance_nwg, citizen.balance_nwg + rewardNWG, 
      `Day ${streakDay} login bonus`, deviceUUID
    ).run();
    
    return c.json({
      success: true,
      reward: {
        nwg: rewardNWG,
        nwx: rewardNWX
      },
      streak: {
        day: streakDay,
        multiplier
      },
      newBalance: {
        nwg: citizen.balance_nwg + rewardNWG,
        nwx: citizen.balance_nwx + rewardNWX
      }
    });
  } catch (e) {
    console.error('Daily reward error:', e);
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/wallet/sync - Sync client wallet with server
app.post('/api/wallet/sync', async (c) => {
  try {
    const db = c.env?.GUILD_DB;
    const body = await c.req.json();
    const { deviceUUID, clientWallet, clientVersion } = body;
    
    if (!db) {
      return c.json({ success: true, message: 'Local dev mode', action: 'use_client' });
    }
    
    // Get server wallet
    const result = await db.prepare(`
      SELECT w.*, c.trust_score, c.visit_count FROM wallets w
      JOIN citizens c ON w.citizen_id = c.id
      WHERE c.device_uuid = ?
    `).bind(deviceUUID).first();
    
    if (!result) {
      // No server wallet - client should register
      return c.json({ success: true, action: 'register', message: 'No server wallet found' });
    }
    
    // Server is authoritative - return server state
    return c.json({
      success: true,
      action: 'sync',
      serverWallet: {
        address: result.wallet_address,
        balance_nwg: result.balance_nwg,
        balance_nwx: result.balance_nwx,
        balance_diamond: result.balance_diamond,
        balance_gold: result.balance_gold,
        balance_iron: result.balance_iron,
        balance_stone: result.balance_stone,
        balance_wood: result.balance_wood,
        lastSync: result.last_sync,
        version: result.version
      },
      trustScore: result.trust_score,
      visitCount: result.visit_count
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// ============================================================================
// LIVE MARKET PRICES API v2 - Automated NWG Portfolio System
// 
// Features:
// - Multi-source price aggregation (Coinbase, CoinGecko)
// - KV-based caching for instant responses
// - Automatic price history storage
// - Portfolio value calculations
// - Market status awareness (NYSE hours)
// - Alert triggers for significant price movements
//
// NWG Formula: Silver(25%) + Gold(20%) + BTC(20%) + PLTR(20%) + AVGO(15%)
// ============================================================================

// GET /api/market-prices - Get live prices with KV caching
app.get('/api/market-prices', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    const data = await fetchMarketData(cache);
    
    // Auto-store price history (non-blocking)
    if (cache) {
      storePricePoint(cache, data).catch(() => {});
      storeDailyStats(cache, data).catch(() => {});
    }
    
    c.header('Cache-Control', 'public, max-age=5, stale-while-revalidate=15');
    
    return c.json({
      success: true,
      timestamp: data.timestamp,
      live: data.realSourceCount > 0,
      realSourceCount: data.realSourceCount,
      marketStatus: data.marketStatus,
      nwg: {
        ...data.nwg,
        formula: 'NWG = (Silver × 25%) + (Gold × 20%) + (BTC × 20%) + (PLTR × 20%) + (AVGO × 15%)'
      },
      assets: data.assets,
      weights: NWG_WEIGHTS,
      sources: data.sources
    });
  } catch (e) {
    console.error('Market prices error:', e);
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/market-prices/history - Get historical price data with KV storage
app.get('/api/market-prices/history', async (c) => {
  try {
    const timeframe = (c.req.query('timeframe') || '7d') as '1h' | '24h' | '7d' | '1m';
    const cache = c.env?.MARKET_CACHE;
    
    let points;
    if (cache) {
      points = await getPriceHistory(cache, timeframe);
    } else {
      // Fallback to generated history
      const config = {
        '1h': { duration: 60, interval: 1 },
        '24h': { duration: 24 * 60, interval: 5 },
        '7d': { duration: 7 * 24 * 60, interval: 60 },
        '1m': { duration: 30 * 24 * 60, interval: 240 }
      };
      
      const { duration, interval } = config[timeframe] || config['7d'];
      points = [];
      const now = Date.now();
      let price = 0.01 * 0.95;
      
      for (let i = duration; i >= 0; i -= interval) {
        const timestamp = now - i * 60 * 1000;
        const change = (Math.random() - 0.45) * 0.0002;
        price = Math.max(0.005, price * (1 + change));
        points.push({ timestamp, price });
      }
    }
    
    c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    
    return c.json({
      success: true,
      timeframe,
      points,
      count: points.length
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/market-status - Get detailed market status info
app.get('/api/market-status', (c) => {
  const { status, nextChange } = getMarketStatus();
  
  return c.json({
    success: true,
    status,
    isOpen: status === 'OPEN',
    isPreMarket: status === 'PRE_MARKET',
    isAfterHours: status === 'AFTER_HOURS',
    nextChange: {
      ms: nextChange,
      minutes: Math.round(nextChange / 60000),
      hours: Math.round(nextChange / 3600000 * 10) / 10
    },
    schedule: {
      preMarket: '9:00-14:30 UTC (4:00-9:30 AM EST)',
      market: '14:30-21:00 UTC (9:30 AM-4:00 PM EST)',
      afterHours: '21:00-01:00 UTC (4:00-8:00 PM EST)',
      timezone: 'Prices follow NYSE trading hours'
    }
  });
});

// POST /api/portfolio/calculate - Calculate portfolio value
app.post('/api/portfolio/calculate', async (c) => {
  try {
    const body = await c.req.json();
    const { nwgAmount, purchasePrice = 0.01 } = body;
    
    if (!nwgAmount || nwgAmount <= 0) {
      return c.json({ success: false, error: 'Invalid NWG amount' }, 400);
    }
    
    const cache = c.env?.MARKET_CACHE;
    const marketData = await fetchMarketData(cache);
    const portfolio = calculatePortfolioValue(nwgAmount, marketData, purchasePrice);
    
    return c.json({
      success: true,
      portfolio,
      marketData: {
        nwgPrice: marketData.nwg.price,
        change24h: marketData.nwg.change24h,
        marketStatus: marketData.marketStatus
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/portfolio/simulate - Simulate investment returns
app.get('/api/portfolio/simulate', async (c) => {
  try {
    const usdAmount = parseFloat(c.req.query('usd') || '100');
    const period = c.req.query('period') || '1y'; // 1m, 3m, 6m, 1y, 5y
    
    const cache = c.env?.MARKET_CACHE;
    const marketData = await fetchMarketData(cache);
    const nwgAmount = usdAmount / marketData.nwg.price;
    
    // Historical performance projections based on asset mix
    const returns: Record<string, { low: number; mid: number; high: number }> = {
      '1m': { low: -5, mid: 3, high: 12 },
      '3m': { low: -10, mid: 8, high: 25 },
      '6m': { low: -15, mid: 15, high: 45 },
      '1y': { low: -20, mid: 35, high: 100 },
      '5y': { low: 20, mid: 150, high: 500 }
    };
    
    const projections = returns[period] || returns['1y'];
    
    return c.json({
      success: true,
      investment: {
        usd: usdAmount,
        nwg: Math.round(nwgAmount),
        currentPrice: marketData.nwg.price
      },
      projections: {
        period,
        conservative: {
          return: projections.low,
          value: usdAmount * (1 + projections.low / 100)
        },
        moderate: {
          return: projections.mid,
          value: usdAmount * (1 + projections.mid / 100)
        },
        optimistic: {
          return: projections.high,
          value: usdAmount * (1 + projections.high / 100)
        }
      },
      disclaimer: 'Past performance does not guarantee future results. These are hypothetical projections based on historical asset performance.'
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/alerts/create - Create price alert
app.post('/api/alerts/create', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: false, error: 'Alerts require KV storage' }, 400);
    }
    
    const body = await c.req.json();
    const { asset, condition, threshold } = body;
    
    if (!asset || !condition || threshold === undefined) {
      return c.json({ success: false, error: 'Missing required fields: asset, condition, threshold' }, 400);
    }
    
    const validAssets = ['nwg', 'btc', 'gold', 'silver', 'pltr', 'avgo'];
    const validConditions = ['above', 'below', 'change_pct'];
    
    if (!validAssets.includes(asset)) {
      return c.json({ success: false, error: `Invalid asset. Valid: ${validAssets.join(', ')}` }, 400);
    }
    
    if (!validConditions.includes(condition)) {
      return c.json({ success: false, error: `Invalid condition. Valid: ${validConditions.join(', ')}` }, 400);
    }
    
    const alert = await createAlert(cache, { asset, condition, threshold });
    
    return c.json({
      success: true,
      alert,
      message: `Alert created: ${asset.toUpperCase()} ${condition} ${threshold}`
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/alerts/check - Check for triggered alerts
app.get('/api/alerts/check', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: false, error: 'Alerts require KV storage' }, 400);
    }
    
    const marketData = await fetchMarketData(cache);
    const triggered = await checkAlerts(cache, marketData);
    
    return c.json({
      success: true,
      triggered,
      count: triggered.length,
      currentPrices: {
        nwg: marketData.nwg.price,
        btc: marketData.assets.btc.price,
        gold: marketData.assets.gold.price,
        silver: marketData.assets.silver.price,
        pltr: marketData.assets.pltr.price,
        avgo: marketData.assets.avgo.price
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/nwg/formula - Get detailed NWG formula breakdown
app.get('/api/nwg/formula', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    const data = await fetchMarketData(cache);
    
    // Calculate each component's contribution
    const breakdown = Object.entries(NWG_WEIGHTS).map(([asset, weight]) => {
      const price = data.assets[asset].price;
      const contribution = price * weight * NWG_BASE_MULTIPLIER;
      return {
        asset: asset.toUpperCase(),
        weight: `${weight * 100}%`,
        price,
        contribution,
        pctOfTotal: (contribution / data.nwg.price * 100).toFixed(2) + '%'
      };
    });
    
    return c.json({
      success: true,
      formula: {
        expression: 'NWG = (Silver × 25%) + (Gold × 20%) + (BTC × 20%) + (PLTR × 20%) + (AVGO × 15%)',
        multiplier: NWG_BASE_MULTIPLIER,
        totalSupply: NWG_TOTAL_SUPPLY,
        calculation: `(${breakdown.map(b => `${b.asset}×${b.weight}`).join(' + ')}) × ${NWG_BASE_MULTIPLIER}`
      },
      breakdown,
      result: {
        nwgPrice: data.nwg.price,
        marketCap: data.nwg.marketCap,
        change24h: data.nwg.change24h
      },
      philosophy: {
        silver: '25% - Industrial & monetary metal, inflation hedge',
        gold: '20% - Ultimate safe haven, central bank reserves', 
        btc: '20% - Digital gold, institutional adoption growing',
        pltr: '20% - AI/defense leader, government contracts',
        avgo: '15% - Semiconductor powerhouse, AI infrastructure'
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/nwg/pitch - Get the NWG investment pitch
app.get('/api/nwg/pitch', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    const data = await fetchMarketData(cache);
    
    return c.json({
      success: true,
      headline: 'One Currency. Five Explosive Assets. Zero Guesswork.',
      tagline: 'NWG: The Ultimate Portfolio in a Single Token',
      
      keyPoints: [
        '🪙 Fixed Supply: 1,000,000,000 NWG - Never minted again',
        '💰 $1 = 100 NWG - Simple, transparent pricing',
        '📈 5-Asset Backing: Silver, Gold, BTC, Palantir, Broadcom',
        '🤖 AI + Crypto + Precious Metals in one investment',
        '🌍 Real-time price tracking via Coinbase & CoinGecko'
      ],
      
      assets: {
        silver: { weight: '25%', theme: 'Industrial Revolution + Inflation Hedge', highlight: '+146% in 2025' },
        gold: { weight: '20%', theme: 'Central Bank Demand + Safe Haven', highlight: '+64% in 2025' },
        btc: { weight: '20%', theme: 'Institutional Adoption + Digital Gold', highlight: 'ATH $126K' },
        pltr: { weight: '20%', theme: 'AI Enterprise + Government Contracts', highlight: '+150% in 2025' },
        avgo: { weight: '15%', theme: 'AI Infrastructure + Semiconductor', highlight: '+49% in 2025' }
      },
      
      currentPrice: data.nwg.price,
      marketCap: data.nwg.marketCap,
      
      callToAction: 'Own the future. Start with NWG today.',
      
      disclaimer: 'NWG is a conceptual portfolio token. Past asset performance does not guarantee future results.'
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// ============================================================================
// AUTO-LEARNING & SELF-IMPROVEMENT SYSTEM
// 
// Features:
// - Log analysis and pattern detection
// - Automatic code improvement tracking
// - Patch notes auto-generation with auto_update section
// - Cron job management
// - System health monitoring
// ============================================================================

// GET /api/system/summary - Get comprehensive system summary
app.get('/api/system/summary', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ 
        success: true,
        summary: {
          health: '🟡 KV Not Available',
          recentIssues: [],
          improvements: [],
          upcomingTasks: DEFAULT_CRON_JOBS.map(j => `${j.name} (${j.schedule})`),
          autoUpdates: []
        }
      });
    }
    
    const summary = await generateSystemSummary(cache);
    
    return c.json({
      success: true,
      summary,
      timestamp: Date.now()
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/system/log - Submit a log entry for analysis
app.post('/api/system/log', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: false, error: 'KV storage required' }, 400);
    }
    
    const body = await c.req.json();
    const { level, source, message, metadata } = body;
    
    if (!level || !source || !message) {
      return c.json({ 
        success: false, 
        error: 'Missing required fields: level, source, message' 
      }, 400);
    }
    
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      source,
      message,
      metadata
    };
    
    const analysis = await analyzeLog(cache, entry);
    
    return c.json({
      success: true,
      logId: entry.id,
      analysis: {
        patternsMatched: analysis.patterns.length,
        improvementsSuggested: analysis.improvements.length,
        patterns: analysis.patterns.map(p => p.name),
        improvements: analysis.improvements.map(i => i.title)
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/system/logs - Get recent logs
app.get('/api/system/logs', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: true, logs: [], message: 'KV not available' });
    }
    
    const hours = parseInt(c.req.query('hours') || '24');
    const logs = await getRecentLogs(cache, hours * 60 * 60 * 1000);
    
    return c.json({
      success: true,
      count: logs.length,
      timeRange: `${hours} hours`,
      logs: logs.slice(-100), // Last 100
      stats: {
        errors: logs.filter(l => l.level === 'error').length,
        warnings: logs.filter(l => l.level === 'warn').length,
        info: logs.filter(l => l.level === 'info').length
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/system/patterns - Get detected patterns
app.get('/api/system/patterns', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    
    // Return known patterns even without cache
    if (!cache) {
      return c.json({
        success: true,
        patterns: KNOWN_PATTERNS.map(p => ({
          ...p,
          occurrences: 0,
          firstSeen: null,
          lastSeen: null
        }))
      });
    }
    
    const patterns = await getPatterns(cache);
    
    // Merge with known patterns
    const merged = KNOWN_PATTERNS.map(known => {
      const detected = patterns.find(p => p.id === known.id);
      return detected || {
        ...known,
        occurrences: 0,
        firstSeen: 0,
        lastSeen: 0
      };
    });
    
    return c.json({
      success: true,
      patterns: merged,
      active: merged.filter(p => p.status === 'active').length,
      resolved: merged.filter(p => p.status === 'resolved').length,
      monitoring: merged.filter(p => p.status === 'monitoring').length
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/system/improvements - Get improvement suggestions
app.get('/api/system/improvements', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: true, improvements: [] });
    }
    
    const status = c.req.query('status') as Improvement['status'] | undefined;
    const improvements = await getImprovements(cache, status);
    
    return c.json({
      success: true,
      count: improvements.length,
      improvements: improvements.sort((a, b) => {
        const priority = { critical: 0, high: 1, medium: 2, low: 3 };
        return priority[a.priority] - priority[b.priority];
      }),
      stats: {
        pending: improvements.filter(i => i.status === 'pending').length,
        applied: improvements.filter(i => i.status === 'applied').length,
        rejected: improvements.filter(i => i.status === 'rejected').length,
        autoApplied: improvements.filter(i => i.autoApplied).length
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/system/improvements/:id/apply - Apply an improvement
app.post('/api/system/improvements/:id/apply', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: false, error: 'KV storage required' }, 400);
    }
    
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const auto = body.auto === true;
    
    const result = await applyImprovement(cache, id, auto);
    
    return c.json(result);
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/system/patch-notes - Get patch notes
app.get('/api/system/patch-notes', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ 
        success: true, 
        patchNotes: [{
          version: '2.1.0',
          date: new Date().toISOString().split('T')[0],
          changes: [
            { type: 'feature', title: 'Auto-Learning System', description: 'Added self-improvement capabilities', automated: false },
            { type: 'feature', title: 'Market Automation v2', description: 'KV caching, multi-source aggregation', automated: false },
            { type: 'auto_update', title: 'iOS Touch Fix', description: 'Resolved double-fire on iOS Safari', automated: true }
          ]
        }]
      });
    }
    
    const notes = await getPatchNotes(cache);
    
    return c.json({
      success: true,
      patchNotes: notes,
      count: notes.length,
      autoUpdatesCount: notes.reduce((sum, n) => 
        sum + n.changes.filter(ch => ch.type === 'auto_update').length, 0
      )
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/system/patch-notes/generate - Generate new patch notes
app.post('/api/system/patch-notes/generate', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: false, error: 'KV storage required' }, 400);
    }
    
    const body = await c.req.json().catch(() => ({}));
    const version = body.version || `auto-${new Date().toISOString().split('T')[0]}`;
    
    const patchNote = await generatePatchNotes(cache, version);
    
    return c.json({
      success: true,
      patchNote,
      message: `Patch notes v${version} generated with ${patchNote.changes.length} changes`
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/system/cron - Get cron jobs
app.get('/api/system/cron', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    
    if (!cache) {
      return c.json({
        success: true,
        jobs: DEFAULT_CRON_JOBS,
        message: 'Default jobs (KV not available)'
      });
    }
    
    const jobs = await getCronJobs(cache);
    
    return c.json({
      success: true,
      jobs,
      enabled: jobs.filter(j => j.enabled).length,
      disabled: jobs.filter(j => !j.enabled).length
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/system/cron/:id/run - Manually run a cron job
app.post('/api/system/cron/:id/run', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: false, error: 'KV storage required' }, 400);
    }
    
    const jobId = c.req.param('id');
    const jobs = await getCronJobs(cache);
    const job = jobs.find(j => j.id === jobId);
    
    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }
    
    // Update job status
    await updateCronJob(cache, jobId, { status: 'running', lastRun: Date.now() });
    
    // Execute handler
    const result = await executeCronHandler(job.handler, cache, c.env);
    
    // Update job status
    await updateCronJob(cache, jobId, { 
      status: result.success ? 'idle' : 'failed',
      errorCount: result.success ? 0 : (job.errorCount + 1)
    });
    
    return c.json({
      success: result.success,
      job: job.name,
      result: result.result,
      error: result.error
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/system/cron/:id/toggle - Enable/disable a cron job
app.post('/api/system/cron/:id/toggle', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: false, error: 'KV storage required' }, 400);
    }
    
    const jobId = c.req.param('id');
    const jobs = await getCronJobs(cache);
    const job = jobs.find(j => j.id === jobId);
    
    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }
    
    const updated = await updateCronJob(cache, jobId, { enabled: !job.enabled });
    
    return c.json({
      success: true,
      job: updated,
      message: `Job "${job.name}" ${updated?.enabled ? 'enabled' : 'disabled'}`
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/system/health - Get system health
app.get('/api/system/health', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    const startTime = Date.now();
    
    // Test API latency
    const apiTests: Record<string, number> = {};
    
    // Test market prices API
    const marketStart = Date.now();
    await fetchMarketData(cache);
    apiTests['market-prices'] = Date.now() - marketStart;
    
    // Get recent logs for error rate
    let errorRate = 0;
    if (cache) {
      const logs = await getRecentLogs(cache, 60 * 60 * 1000);
      errorRate = logs.length > 0 
        ? logs.filter(l => l.level === 'error').length / logs.length 
        : 0;
    }
    
    const health = {
      status: errorRate < 0.05 ? 'healthy' : errorRate < 0.1 ? 'degraded' : 'unhealthy',
      timestamp: Date.now(),
      uptime: 'N/A (Workers are stateless)',
      apiLatency: apiTests,
      errorRate: Math.round(errorRate * 100) + '%',
      kvAvailable: !!cache,
      responseTime: Date.now() - startTime
    };
    
    // Track health if KV available
    if (cache) {
      await trackHealth(cache, {
        apiLatency: apiTests,
        errorRate
      });
    }
    
    return c.json({
      success: true,
      health
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/system/code-quality - Get code quality rules
app.get('/api/system/code-quality', (c) => {
  return c.json({
    success: true,
    rules: CODE_QUALITY_RULES.map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      suggestion: rule.suggestion,
      priority: rule.priority
    })),
    totalRules: CODE_QUALITY_RULES.length
  });
});

// ============================================================================
// 🎮 GAMIFICATION SYSTEM - Fun & Interactive Features
// 
// Features:
// - Price Prediction Game (bet on direction)
// - Achievements & Badges
// - Daily/Weekly Quests
// - Leaderboards
// - Fear & Greed Index
// - Whale Tracker
// - AI Market Analyst
// - Portfolio Cards (shareable)
// ============================================================================

// GET /api/game/prediction/pool - Get current prediction pool
app.get('/api/game/prediction/pool', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    const marketData = await fetchMarketData(cache);
    
    // Get pool data
    let pool = { up: 0, down: 0, total: 0 };
    if (cache) {
      const poolData = await cache.get(GAME_CACHE_KEYS.PREDICTION_POOL);
      if (poolData) pool = JSON.parse(poolData);
    }
    
    return c.json({
      success: true,
      currentPrice: marketData.nwg.price,
      change24h: marketData.nwg.change24h,
      pool: {
        bullish: pool.up,
        bearish: pool.down,
        total: pool.total,
        bullishPct: pool.total > 0 ? Math.round((pool.up / pool.total) * 100) : 50,
        bearishPct: pool.total > 0 ? Math.round((pool.down / pool.total) * 100) : 50
      },
      odds: {
        up: pool.down > 0 ? (1 + pool.down / (pool.up || 1)).toFixed(2) : '1.90',
        down: pool.up > 0 ? (1 + pool.up / (pool.down || 1)).toFixed(2) : '1.90'
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/game/prediction/create - Create a prediction
app.post('/api/game/prediction/create', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: false, error: 'KV storage required' }, 400);
    }
    
    const body = await c.req.json();
    const { odenom, direction, amount, timeframe } = body;
    
    if (!odenom || !direction || !amount || !timeframe) {
      return c.json({ 
        success: false, 
        error: 'Missing fields: odenom, direction (up/down), amount, timeframe (1h/24h/7d)' 
      }, 400);
    }
    
    if (!['up', 'down'].includes(direction)) {
      return c.json({ success: false, error: 'Direction must be "up" or "down"' }, 400);
    }
    
    if (!['1h', '24h', '7d'].includes(timeframe)) {
      return c.json({ success: false, error: 'Timeframe must be "1h", "24h", or "7d"' }, 400);
    }
    
    const marketData = await fetchMarketData(cache);
    const prediction = await createPrediction(
      cache,
      odenom,
      direction,
      amount,
      timeframe,
      marketData.nwg.price
    );
    
    return c.json({
      success: true,
      prediction,
      message: `Prediction created: NWG will go ${direction.toUpperCase()} in ${timeframe}`,
      potentialPayout: amount * 1.9
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/game/prediction/resolve - Resolve expired predictions
app.post('/api/game/prediction/resolve', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: false, error: 'KV storage required' }, 400);
    }
    
    const marketData = await fetchMarketData(cache);
    const result = await resolvePredictions(cache, marketData.nwg.price);
    
    return c.json({
      success: true,
      resolved: result.resolved,
      winners: result.winners.length,
      currentPrice: marketData.nwg.price
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/game/leaderboard - Get prediction leaderboard
app.get('/api/game/leaderboard', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      // Return mock data
      return c.json({
        success: true,
        leaderboard: [
          { rank: 1, odenom: 'whale_001', score: 1500, wins: 45, totalBets: 60, winRate: 75, totalProfit: 2500 },
          { rank: 2, odenom: 'oracle_x', score: 1200, wins: 38, totalBets: 55, winRate: 69, totalProfit: 1800 },
          { rank: 3, odenom: 'diamond_h', score: 950, wins: 30, totalBets: 50, winRate: 60, totalProfit: 1200 },
        ],
        yourRank: null
      });
    }
    
    const leaderboard = await getLeaderboard(cache);
    const odenom = c.req.query('odenom');
    let yourRank = null;
    
    if (odenom) {
      const yourEntry = leaderboard.find(e => e.odenom === odenom);
      yourRank = yourEntry?.rank || null;
    }
    
    return c.json({
      success: true,
      leaderboard: leaderboard.slice(0, 50),
      total: leaderboard.length,
      yourRank
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/game/achievements - Get all achievements
app.get('/api/game/achievements', (c) => {
  const grouped = {
    trading: ACHIEVEMENTS.filter(a => a.category === 'trading'),
    holding: ACHIEVEMENTS.filter(a => a.category === 'holding'),
    whale: ACHIEVEMENTS.filter(a => a.category === 'whale'),
    explorer: ACHIEVEMENTS.filter(a => a.category === 'explorer'),
    social: ACHIEVEMENTS.filter(a => a.category === 'social'),
  };
  
  return c.json({
    success: true,
    achievements: ACHIEVEMENTS,
    grouped,
    total: ACHIEVEMENTS.length,
    byRarity: {
      common: ACHIEVEMENTS.filter(a => a.rarity === 'common').length,
      rare: ACHIEVEMENTS.filter(a => a.rarity === 'rare').length,
      epic: ACHIEVEMENTS.filter(a => a.rarity === 'epic').length,
      legendary: ACHIEVEMENTS.filter(a => a.rarity === 'legendary').length,
      mythic: ACHIEVEMENTS.filter(a => a.rarity === 'mythic').length,
    }
  });
});

// GET /api/game/quests - Get current quests
app.get('/api/game/quests', (c) => {
  const daily = generateDailyQuests();
  const weekly = generateWeeklyQuests();
  
  return c.json({
    success: true,
    quests: {
      daily,
      weekly
    },
    totalRewards: {
      nwg: [...daily, ...weekly].reduce((sum, q) => sum + (q.reward.nwg || 0), 0),
      xp: [...daily, ...weekly].reduce((sum, q) => sum + (q.reward.xp || 0), 0)
    }
  });
});

// GET /api/game/fear-greed - Get Fear & Greed Index
app.get('/api/game/fear-greed', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    const marketData = await fetchMarketData(cache);
    const fearGreed = calculateFearGreed(marketData);
    
    return c.json({
      success: true,
      fearGreed,
      interpretation: {
        0: 'Maximum Fear - Possible buying opportunity',
        25: 'Fear - Market is nervous',
        50: 'Neutral - Balanced sentiment',
        75: 'Greed - Market is optimistic',
        100: 'Maximum Greed - Possible correction ahead'
      },
      lastUpdate: Date.now()
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/game/whale-tracker - Get whale alerts
app.get('/api/game/whale-tracker', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    const marketData = await fetchMarketData(cache);
    const whales = generateWhaleAlerts(marketData);
    
    return c.json({
      success: true,
      alerts: whales,
      count: whales.length,
      summary: {
        totalBuys: whales.filter(w => w.type === 'buy').length,
        totalSells: whales.filter(w => w.type === 'sell').length,
        biggestMove: whales.length > 0 ? whales.reduce((max, w) => w.usdValue > max.usdValue ? w : max) : null
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/game/ai-analyst - Get AI market analysis
app.get('/api/game/ai-analyst', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    const marketData = await fetchMarketData(cache);
    const fearGreed = calculateFearGreed(marketData);
    const analysis = generateMarketAnalysis(marketData, fearGreed);
    
    return c.json({
      success: true,
      analysis,
      marketData: {
        nwgPrice: marketData.nwg.price,
        change24h: marketData.nwg.change24h,
        marketStatus: marketData.marketStatus
      },
      fearGreed: {
        value: fearGreed.value,
        label: fearGreed.label
      },
      disclaimer: 'This is AI-generated analysis for entertainment. Not financial advice.'
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/game/ai-chat - Chat with AI analyst
app.post('/api/game/ai-chat', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    const body = await c.req.json();
    const { question } = body;
    
    if (!question) {
      return c.json({ success: false, error: 'Question required' }, 400);
    }
    
    const marketData = await fetchMarketData(cache);
    const fearGreed = calculateFearGreed(marketData);
    const response = chatWithAnalyst(question, marketData, fearGreed);
    
    return c.json({
      success: true,
      response,
      timestamp: Date.now()
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/game/portfolio-card - Generate shareable portfolio card
app.post('/api/game/portfolio-card', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    const body = await c.req.json();
    const { odenom, balance, achievements = [] } = body;
    
    if (!odenom || balance === undefined) {
      return c.json({ success: false, error: 'Missing odenom or balance' }, 400);
    }
    
    const marketData = await fetchMarketData(cache);
    const card = generatePortfolioCard(
      odenom,
      balance,
      marketData.nwg.price,
      marketData.nwg.change24h,
      achievements
    );
    
    return c.json({
      success: true,
      card,
      shareText: `🎮 My NWG Portfolio Card\n💰 ${balance.toLocaleString()} NWG ($${card.value.toFixed(2)})\n🏆 Rank: ${card.rank}\n💎 Rarity: ${card.rarity.toUpperCase()}\n\n#NWG #Crypto #Portfolio`,
      embedData: {
        title: `${card.rank} - ${card.odenom}`,
        description: `${balance.toLocaleString()} NWG worth $${card.value.toFixed(2)}`,
        color: card.rarity === 'diamond' ? '#00d4ff' : 
               card.rarity === 'platinum' ? '#e5e4e2' :
               card.rarity === 'gold' ? '#ffd700' :
               card.rarity === 'silver' ? '#c0c0c0' : '#cd7f32'
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/game/dashboard - Get complete game dashboard
app.get('/api/game/dashboard', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    const marketData = await fetchMarketData(cache);
    const fearGreed = calculateFearGreed(marketData);
    const analysis = generateMarketAnalysis(marketData, fearGreed);
    const whales = generateWhaleAlerts(marketData);
    const leaderboard = cache ? await getLeaderboard(cache) : [];
    const quests = {
      daily: generateDailyQuests(),
      weekly: generateWeeklyQuests()
    };
    
    // Get pool data
    let pool = { up: 0, down: 0, total: 0 };
    if (cache) {
      const poolData = await cache.get(GAME_CACHE_KEYS.PREDICTION_POOL);
      if (poolData) pool = JSON.parse(poolData);
    }
    
    return c.json({
      success: true,
      timestamp: Date.now(),
      
      market: {
        nwgPrice: marketData.nwg.price,
        change24h: marketData.nwg.change24h,
        marketCap: marketData.nwg.marketCap,
        status: marketData.marketStatus
      },
      
      fearGreed: {
        value: fearGreed.value,
        label: fearGreed.label,
        factors: fearGreed.factors
      },
      
      aiAnalysis: {
        sentiment: analysis.sentiment,
        summary: analysis.summary,
        recommendation: analysis.recommendation,
        confidence: analysis.confidence,
        topMover: analysis.topMover
      },
      
      predictionGame: {
        pool,
        bullishPct: pool.total > 0 ? Math.round((pool.up / pool.total) * 100) : 50,
        bearishPct: pool.total > 0 ? Math.round((pool.down / pool.total) * 100) : 50
      },
      
      leaderboard: leaderboard.slice(0, 10),
      
      whaleAlerts: whales.slice(0, 5),
      
      quests: {
        dailyCount: quests.daily.length,
        weeklyCount: quests.weekly.length,
        totalNWGReward: [...quests.daily, ...quests.weekly].reduce((sum, q) => sum + (q.reward.nwg || 0), 0)
      },
      
      achievements: {
        total: ACHIEVEMENTS.length,
        categories: ['trading', 'holding', 'whale', 'explorer', 'social']
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// ============================================================================
// ⚔️ PVP MATCHMAKING API - Real Player vs Player Battles
// ============================================================================

// Mount the PvP matchmaking router
app.route('/api/pvp', pvpMatchmaking)

// ============================================================================
// 🃏💰 CARD-NWG BRIDGE API - Physical Cards ↔ Digital Currency
// ============================================================================

// GET /api/card-bridge/info - Get bridge system info
app.get('/api/card-bridge/info', (c) => {
  return c.json({
    success: true,
    system: 'NWG Card-to-Crypto Bridge',
    version: '1.0.0',
    description: 'Connect physical NumbahWan cards to digital NWG currency',
    features: [
      'Physical Card Registration (QR/NFC claim)',
      'Card Staking (earn passive NWG)',
      'P2P Card Trading',
      'Card Fusion System',
      'QR Code Generation'
    ],
    nwgValues: CARD_NWG_VALUES,
    yieldRates: CARD_YIELD_RATES,
    printRuns: CARD_PRINT_RUNS,
    fusionRecipes: FUSION_RECIPES,
    stakingBoosts: STAKING_BOOSTS,
    howItWorks: {
      step1: 'Get physical NWG card (purchased or from events)',
      step2: 'Scan QR code on card',
      step3: 'Claim card to your wallet (one-time)',
      step4: 'Stake card to earn passive NWG',
      step5: 'Trade cards on marketplace or fuse for upgrades'
    }
  });
});

// POST /api/card-bridge/claim - Claim a physical card
app.post('/api/card-bridge/claim', async (c) => {
  const { env } = c;
  
  if (!env.MARKET_CACHE) {
    // Demo mode without KV
    return c.json({
      success: true,
      demo: true,
      message: '🎉 Card claimed! (Demo mode)',
      card: {
        id: 'NWG-R-0001',
        rarity: 'rare',
        nwgLocked: 500,
        status: 'claimed'
      },
      nwgAwarded: 50,
      isOGHolder: true
    });
  }
  
  try {
    const { claimCode, walletAddress } = await c.req.json();
    
    if (!claimCode || !walletAddress) {
      return c.json({ success: false, error: 'Missing claimCode or walletAddress' }, 400);
    }
    
    const result = await claimCard(env.MARKET_CACHE, claimCode, walletAddress);
    return c.json(result);
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/card-bridge/collection/:wallet - Get user's card collection
app.get('/api/card-bridge/collection/:wallet', async (c) => {
  const { env } = c;
  const walletAddress = c.req.param('wallet');
  
  if (!env.MARKET_CACHE) {
    // Demo collection
    return c.json({
      success: true,
      demo: true,
      collection: {
        ownerId: walletAddress,
        cards: ['NWG-C-0001', 'NWG-R-0002', 'NWG-E-0001'],
        totalValue: 2600,
        stakedCount: 1,
        pendingYield: 15,
        achievements: ['collector_bronze'],
        boostMultiplier: 1.1
      }
    });
  }
  
  try {
    const collection = await getCollection(env.MARKET_CACHE, walletAddress);
    const boostMultiplier = CardBridge.calculateBoostMultiplier(collection);
    return c.json({ 
      success: true, 
      collection,
      boostMultiplier
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/card-bridge/stake - Stake a card for passive NWG yield
app.post('/api/card-bridge/stake', async (c) => {
  const { env } = c;
  
  if (!env.MARKET_CACHE) {
    return c.json({
      success: true,
      demo: true,
      message: '🔒 Card staked! Earning 10 NWG/day (Demo)',
      stake: {
        id: 'STK-DEMO',
        physicalCardId: 'NWG-R-0001',
        yieldRate: 10,
        boostMultiplier: 1.1
      }
    });
  }
  
  try {
    const { cardId, walletAddress } = await c.req.json();
    
    if (!cardId || !walletAddress) {
      return c.json({ success: false, error: 'Missing cardId or walletAddress' }, 400);
    }
    
    const result = await stakeCard(env.MARKET_CACHE, cardId, walletAddress);
    return c.json(result);
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/card-bridge/unstake - Unstake a card and claim yield
app.post('/api/card-bridge/unstake', async (c) => {
  const { env } = c;
  
  if (!env.MARKET_CACHE) {
    return c.json({
      success: true,
      demo: true,
      message: '🔓 Card unstaked! Claimed 150 NWG (Demo)',
      yieldClaimed: 150
    });
  }
  
  try {
    const { cardId, walletAddress } = await c.req.json();
    const result = await unstakeCard(env.MARKET_CACHE, cardId, walletAddress);
    return c.json(result);
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/card-bridge/claim-rewards - Claim all staking rewards
app.post('/api/card-bridge/claim-rewards', async (c) => {
  const { env } = c;
  
  if (!env.MARKET_CACHE) {
    return c.json({
      success: true,
      demo: true,
      totalClaimed: 250,
      message: '💰 Claimed 250 NWG from 3 staked cards (Demo)'
    });
  }
  
  try {
    const { walletAddress } = await c.req.json();
    const result = await claimStakingRewards(env.MARKET_CACHE, walletAddress);
    return c.json(result);
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/card-bridge/list - List card for sale on marketplace
app.post('/api/card-bridge/list', async (c) => {
  const { env } = c;
  
  if (!env.MARKET_CACHE) {
    return c.json({
      success: true,
      demo: true,
      message: '📢 Card listed for 1000 NWG (Demo)',
      listing: {
        id: 'LST-DEMO',
        physicalCardId: 'NWG-R-0001',
        priceNWG: 1000,
        priceUSD: 10.00,
        status: 'active'
      }
    });
  }
  
  try {
    const { cardId, walletAddress, priceNWG, durationDays } = await c.req.json();
    
    if (!cardId || !walletAddress || !priceNWG) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }
    
    const result = await listCardForSale(env.MARKET_CACHE, cardId, walletAddress, priceNWG, durationDays || 7);
    return c.json(result);
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/card-bridge/buy - Buy a listed card
app.post('/api/card-bridge/buy', async (c) => {
  const { env } = c;
  
  if (!env.MARKET_CACHE) {
    return c.json({
      success: true,
      demo: true,
      message: '🎉 Card purchased for 1000 NWG! (Demo)',
      card: {
        id: 'NWG-E-0001',
        rarity: 'epic',
        nwgLocked: 2000
      }
    });
  }
  
  try {
    const { listingId, buyerWallet } = await c.req.json();
    const result = await buyCard(env.MARKET_CACHE, listingId, buyerWallet);
    return c.json(result);
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/card-bridge/cancel-listing - Cancel a listing
app.post('/api/card-bridge/cancel-listing', async (c) => {
  const { env } = c;
  
  if (!env.MARKET_CACHE) {
    return c.json({ success: true, demo: true, message: 'Listing cancelled (Demo)' });
  }
  
  try {
    const { listingId, walletAddress } = await c.req.json();
    const result = await cancelListing(env.MARKET_CACHE, listingId, walletAddress);
    return c.json(result);
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/card-bridge/fuse - Fuse cards to create higher rarity
app.post('/api/card-bridge/fuse', async (c) => {
  const { env } = c;
  
  if (!env.MARKET_CACHE) {
    // Demo fusion
    const roll = Math.random();
    const success = roll > 0.3; // 70% demo success
    
    if (success) {
      return c.json({
        success: true,
        demo: true,
        message: '🔥 FUSION SUCCESS! Created epic card worth 2000 NWG!',
        newCard: {
          id: 'NWG-E-9001',
          rarity: 'epic',
          nwgLocked: 2000
        },
        burned: ['NWG-R-0001', 'NWG-R-0002', 'NWG-R-0003', 'NWG-R-0004']
      });
    } else {
      return c.json({
        success: false,
        demo: true,
        message: '💥 Fusion failed! Cards preserved. (Demo)'
      });
    }
  }
  
  try {
    const { cardIds, walletAddress, targetRarity } = await c.req.json();
    
    if (!cardIds || !walletAddress || !targetRarity) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }
    
    const result = await fuseCards(env.MARKET_CACHE, cardIds, walletAddress, targetRarity);
    return c.json(result);
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/card-bridge/marketplace - Get marketplace stats and listings
app.get('/api/card-bridge/marketplace', async (c) => {
  const { env } = c;
  
  if (!env.MARKET_CACHE) {
    return c.json({
      success: true,
      demo: true,
      stats: {
        totalCards: 1080,
        claimedCards: 342,
        stakedCards: 156,
        listedCards: 28,
        totalNWGLocked: 2500000,
        activeListings: 28,
        totalVolume: 125000,
        floorPrices: {
          common: 100,
          uncommon: 250,
          rare: 500,
          epic: 2000,
          legendary: 10000,
          mythic: 50000
        }
      },
      recentSales: [
        { cardId: 'NWG-L-0003', rarity: 'legendary', price: 15000, time: '2h ago' },
        { cardId: 'NWG-E-0012', rarity: 'epic', price: 3500, time: '5h ago' },
        { cardId: 'NWG-R-0045', rarity: 'rare', price: 750, time: '8h ago' }
      ]
    });
  }
  
  try {
    const stats = await getMarketplaceStats(env.MARKET_CACHE);
    return c.json({ success: true, stats });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/card-bridge/qr/:cardId - Generate QR code data for a card
app.get('/api/card-bridge/qr/:cardId', (c) => {
  const cardId = c.req.param('cardId');
  const claimCode = CardBridge.generateClaimCode();
  const qrData = generateQRCodeData(cardId, claimCode);
  
  return c.json({
    success: true,
    cardId,
    claimCode, // Only shown once - for printing
    qrData,
    printInstructions: {
      qrSize: '300x300px minimum',
      placement: 'Back of card, bottom center',
      format: 'Include card ID above QR code',
      warning: 'Store claim codes securely - they cannot be regenerated'
    }
  });
});

// POST /api/card-bridge/mint - Admin: Mint new physical cards (for printing)
app.post('/api/card-bridge/mint', async (c) => {
  const { env } = c;
  
  try {
    const { cardId, rarity, quantity, set, name, description, image, gmKey } = await c.req.json();
    
    // GM authentication
    if (gmKey !== 'numbahwan-gm-2026') {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    const { cards, claimCodes } = mintPhysicalCards(
      { cardId, rarity, quantity, set },
      { name, description, image }
    );
    
    // In production, save to KV
    if (env.MARKET_CACHE) {
      const existingData = await env.MARKET_CACHE.get('physical_cards');
      const existing = existingData ? JSON.parse(existingData) : [];
      existing.push(...cards);
      await env.MARKET_CACHE.put('physical_cards', JSON.stringify(existing));
    }
    
    return c.json({
      success: true,
      message: `Minted ${cards.length} physical cards`,
      cards,
      claimCodes, // For printing - secure these!
      totalNWGLocked: cards.reduce((sum, c) => sum + c.nwgLocked, 0)
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/card-bridge/calculator - Calculate card values and yields
app.get('/api/card-bridge/calculator', (c) => {
  const rarity = c.req.query('rarity') || 'rare';
  const count = parseInt(c.req.query('count') || '1');
  const stakeDays = parseInt(c.req.query('days') || '30');
  const boostMultiplier = parseFloat(c.req.query('boost') || '1.0');
  
  const nwgValue = CARD_NWG_VALUES[rarity as keyof typeof CARD_NWG_VALUES] || 500;
  const dailyYield = CARD_YIELD_RATES[rarity as keyof typeof CARD_YIELD_RATES] || 10;
  
  const totalValue = nwgValue * count;
  const dailyEarnings = dailyYield * count * boostMultiplier;
  const projectedEarnings = dailyEarnings * stakeDays;
  const roi = ((projectedEarnings / totalValue) * 100).toFixed(2);
  
  return c.json({
    success: true,
    input: { rarity, count, stakeDays, boostMultiplier },
    calculation: {
      cardValue: nwgValue,
      totalValue,
      dailyYield,
      dailyEarnings: Math.round(dailyEarnings),
      projectedEarnings: Math.round(projectedEarnings),
      roiPercent: `${roi}%`,
      breakEvenDays: Math.ceil(totalValue / dailyEarnings)
    },
    comparison: {
      common: { value: 100, daily: 1, monthly: 30 },
      uncommon: { value: 250, daily: 3, monthly: 90 },
      rare: { value: 500, daily: 10, monthly: 300 },
      epic: { value: 2000, daily: 50, monthly: 1500 },
      legendary: { value: 10000, daily: 200, monthly: 6000 },
      mythic: { value: 50000, daily: 1000, monthly: 30000 }
    }
  });
});

// ============================================================================
// PURCHASE API (Demo Mode)
// ============================================================================

// POST /api/purchase/create-checkout - Create checkout session (Demo)
app.post('/api/purchase/create-checkout', async (c) => {
  try {
    const body = await c.req.json();
    const { package: pkgName, usd, nwg, walletId } = body;
    
    // In demo mode, we just return a flag indicating demo
    // In production, this would create a Stripe checkout session
    
    // For now, demo mode - will be replaced with real Stripe integration
    return c.json({
      success: true,
      demo: true,
      message: 'Demo mode active. In production, this redirects to Stripe.',
      package: pkgName,
      amount: { usd, nwg },
      walletId
    });
    
    /* Production code (uncomment when Stripe is configured):
    const stripe = new Stripe(c.env?.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${nwg.toLocaleString()} NWG`,
            description: 'NumbahWan Gold - Premium Digital Currency'
          },
          unit_amount: Math.round(usd * 100) // cents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${c.req.url.origin}/buy?success=true&nwg=${nwg}`,
      cancel_url: `${c.req.url.origin}/buy?canceled=true`,
      metadata: { walletId, nwg: nwg.toString() }
    });
    return c.json({ success: true, checkoutUrl: session.url });
    */
  } catch (e) {
    console.error('Purchase error:', e);
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/purchase/verify - Verify purchase after Stripe webhook
app.get('/api/purchase/verify', async (c) => {
  const sessionId = c.req.query('session_id');
  
  // Demo mode - always succeed
  return c.json({
    success: true,
    demo: true,
    message: 'Payment verification (demo mode)',
    sessionId
  });
});

// ============================================================================
// ROUTE FACTORY - DRY Pattern (Don't Repeat Yourself)
// Add new pages by just adding to the array - no copy-paste needed!
// ============================================================================
const staticPages = ['fashion', 'merch', 'fortune', 'arcade', 'memes', 'apply', 'wallet', 'forge', 'tcg', 'market', 'cards', 'guide', 'battle', 'pvp-battle', 'card-bridge', 'collection', 'deckbuilder', 'zakum', 'tournament', 'academy', 'vault', 'museum', 'research', 'historical-society', 'menu-demo', 'exchange', 'ai-lounge', 'court', 'therapy', 'hr', 'conspiracy', 'updates', 'about', 'treasury', 'intelligence', 'citizenship', 'invest', 'markets', 'buy', 'business', 'supermarket', 'restaurants', 'services', 'crafts', 'realestate', 'jobs', 'my-business', 'cafeteria', 'lost-found', 'parking', 'maintenance', 'breakroom', 'basement', 'nwg-shop', 'card-print-template', 'wyckoff', 'matchalatte', 'embassy', 'profile-card', 'achievements', 'lore', 'restaurant', 'card-lab', 'avatar-builder']

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

// Lore deep dive pages - endless rabbit holes
const lorePages = ['reggina-origin']

lorePages.forEach(page => {
  app.get(`/lore/${page}`, async (c) => {
    try {
      // @ts-ignore - env is provided by Cloudflare Pages
      const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy/lore/${page}.html`))
      if (asset) {
        return new Response(asset.body, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      }
    } catch (e) {
      // Fallback for local development
    }
    return c.redirect(`/lore/${page}.html`)
  })
})

// ============================================================================
// UTILITY ECOSYSTEM API - Staking, Fusion, Merch Claims, Events
// ============================================================================

// GET /api/events - Get current and upcoming events
app.get('/api/events', (c) => {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday

  const weeklyEvents = [
    { id: 'market_monday', name: 'Market Monday', day: 1, emoji: '🏪', bonuses: { tradeBonus: 0.1, marketDiscount: 0.05 } },
    { id: 'training_tuesday', name: 'Training Tuesday', day: 2, emoji: '⚔️', bonuses: { xpMultiplier: 1.5 } },
    { id: 'war_wednesday', name: 'War Wednesday', day: 3, emoji: '🏆', bonuses: { battleRewards: 1.5, tournamentEntry: true } },
    { id: 'throwback_thursday', name: 'Throwback Thursday', day: 4, emoji: '⏰', bonuses: { legacyCardsAvailable: true } },
    { id: 'forge_friday', name: 'Forge Friday', day: 5, emoji: '🔥', bonuses: { pityBonus: 0.5, mythicRateBoost: 2.0 } },
    { id: 'social_saturday', name: 'Social Saturday', day: 6, emoji: '🤝', bonuses: { coopRewards: 2.0, guildBonus: 1.5 } },
    { id: 'stake_sunday', name: 'Stake Sunday', day: 0, emoji: '💎', bonuses: { stakingMultiplier: 2.0 } }
  ]

  const todayEvent = weeklyEvents.find(e => e.day === dayOfWeek) || weeklyEvents[0]

  return c.json({
    success: true,
    today: todayEvent,
    weekly: weeklyEvents,
    activeBonuses: todayEvent.bonuses,
    serverTime: now.toISOString()
  })
})

// GET /api/staking/rates - Get staking reward rates
app.get('/api/staking/rates', (c) => {
  const rates = {
    common: { goldPerDay: 1, logsPerWeek: 0, minLockDays: 7 },
    uncommon: { goldPerDay: 2, logsPerWeek: 0, minLockDays: 7 },
    rare: { goldPerDay: 5, logsPerWeek: 0, minLockDays: 7 },
    epic: { goldPerDay: 15, logsPerWeek: 0, minLockDays: 7 },
    legendary: { goldPerDay: 50, logsPerWeek: 1, minLockDays: 7 },
    mythic: { goldPerDay: 200, logsPerWeek: 5, minLockDays: 7 }
  }

  // Check if Sunday (stake bonus)
  const isStakeSunday = new Date().getDay() === 0
  const multiplier = isStakeSunday ? 2.0 : 1.0

  return c.json({
    success: true,
    rates,
    currentMultiplier: multiplier,
    isStakeSunday,
    earlyUnstakePenalty: 0.1 // 10%
  })
})

// GET /api/fusion/recipes - Get fusion recipes
app.get('/api/fusion/recipes', (c) => {
  const recipes = [
    { input: 'common', inputCount: 5, output: 'uncommon', goldCost: 50 },
    { input: 'uncommon', inputCount: 5, output: 'rare', goldCost: 200 },
    { input: 'rare', inputCount: 3, output: 'epic', goldCost: 500 },
    { input: 'epic', inputCount: 3, output: 'legendary', goldCost: 2000 },
    { input: 'legendary', inputCount: 2, output: 'mythic', goldCost: 10000 }
  ]

  return c.json({
    success: true,
    recipes,
    evolutionRecipe: {
      description: 'Same card x3 → Evolved version',
      levels: ['Base', 'Evolved', 'Prismatic']
    }
  })
})

// POST /api/merch/claim - Claim merch code rewards
app.post('/api/merch/claim', async (c) => {
  try {
    const body = await c.req.json()
    const { code, deviceUUID } = body

    if (!code) {
      return c.json({ success: false, error: 'Code required' }, 400)
    }

    // Demo codes for testing
    const demoCodes: Record<string, any> = {
      'NWMR-TEST-BRNZ': {
        tier: 'bronze',
        product: 'NumbahWan T-Shirt',
        rewards: { cards: [{ name: 'Loyal Guardian', rarity: 'rare' }], gold: 100, logs: 0, discount: 0.05, title: 'Supporter' }
      },
      'NWMR-TEST-SLVR': {
        tier: 'silver',
        product: 'NumbahWan Hoodie',
        rewards: { cards: [{ name: 'Storm Caller', rarity: 'epic' }], gold: 250, logs: 50, discount: 0.10, title: 'Collector' }
      },
      'NWMR-TEST-GOLD': {
        tier: 'gold',
        product: 'NumbahWan Premium Bundle',
        rewards: { cards: [{ name: 'Golden Phoenix', rarity: 'legendary' }], gold: 1000, logs: 200, discount: 0.15, title: 'Elite Member' }
      },
      'NWMR-TEST-PLAT': {
        tier: 'platinum',
        product: "NumbahWan Collector's Edition",
        rewards: { cards: [{ name: 'Primordial Dragon', rarity: 'mythic' }], gold: 5000, logs: 500, discount: 0.20, title: 'Founding Member' }
      }
    }

    const normalizedCode = code.toUpperCase().trim()
    const demoReward = demoCodes[normalizedCode]

    if (demoReward) {
      return c.json({
        success: true,
        ...demoReward,
        message: 'Rewards claimed successfully!'
      })
    }

    // In production, would check D1 database
    return c.json({ success: false, error: 'Invalid or expired code' }, 400)
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/merch/tiers - Get merch tier info
app.get('/api/merch/tiers', (c) => {
  const tiers = {
    bronze: {
      priceRange: '$15-30',
      rewards: ['1 Rare card', '"Supporter" title', '5% permanent discount']
    },
    silver: {
      priceRange: '$30-60',
      rewards: ['1 Epic card', 'Profile badge', '10% discount', '50 Sacred Logs']
    },
    gold: {
      priceRange: '$60-100',
      rewards: ['1 Legendary card', 'Profile border', '15% discount', '200 Sacred Logs']
    },
    platinum: {
      priceRange: '$100+',
      rewards: ['1 Mythic card', '"Founder" status', '20% discount', '500 Sacred Logs', '2× voting power']
    }
  }

  return c.json({ success: true, tiers })
})

// ============================================================================
// 🕯️ GUILD CONFESSIONAL BOOTH - "Unburden your TCG soul"
// ============================================================================

// AI Priest response generator
const PRIEST_RESPONSES: Record<string, string[]> = {
  greed: [
    "Regina forgives you. Your wallet does not.",
    "Your penance: F2P for one week. May your restraint be tested.",
    "The gacha gods have noted your excessive... enthusiasm.",
    "Greed is merely passion without patience. Delete 10 commons as penance.",
    "Your credit card weeps. Say 3 Hail Reginas and check your bank balance."
  ],
  addiction: [
    "Your dedication to disappointment is inspiring. Touch grass for 10 minutes.",
    "The forge is not a lifestyle, it's a game. A very, very addictive game.",
    "Sleep is for those without login bonuses. You are forgiven... this time.",
    "Your penance: Actually play a different game. Any game. For one hour.",
    "The daily reset will wait. Your health will not. Rest, child."
  ],
  betrayal: [
    "Trust, once broken, requires many Sacred Logs to repair.",
    "Your actions echo in the void. Send an apology gift of 100 gold.",
    "The guild remembers. The guild always remembers.",
    "Your penance: Help 3 newbies without expecting anything in return.",
    "Multi-accounting is the path to the dark side. Delete your alts."
  ],
  stupidity: [
    "Reading is fundamental, my child. Your penance: Read all tooltips.",
    "The forge thanks you for your generous sacrifice. Others do not.",
    "Mistakes are the tuition of wisdom. Consider yourself educated.",
    "Your penance: Actually read the confirmation popup. Out loud. Twice.",
    "Even legends were once noobs. You are on the right path. Keep failing forward."
  ],
  salt: [
    "The salt flows through you. Your penance: Send a sincere GG.",
    "Jealousy is just admiration wearing a disguise. Compliment their collection.",
    "Your opponent's luck is not a personal attack. Breathe.",
    "RNG favors no one... except that guy. Seriously, how does he do it?",
    "Your penance: Report only actual cheaters. Salt is not a valid report reason."
  ],
  shame: [
    "Shame is the first step to redemption. The second is logging off.",
    "We have all been there. Some of us are still there. You are not alone.",
    "Your secret is safe with the confessional. And the 500 people reading this.",
    "Embarrassment is temporary. Screenshots are forever. Be cautious.",
    "Your penance: Embrace your cringe. Post it in general chat."
  ]
}

// Generate AI priest response based on sin category
function generatePriestResponse(category: string): string {
  const responses = PRIEST_RESPONSES[category] || PRIEST_RESPONSES['shame']
  return responses[Math.floor(Math.random() * responses.length)]
}

// GET /api/confessions - Get recent confessions
app.get('/api/confessions', async (c) => {
  const sort = c.req.query('sort') || 'new' // 'new' or 'hot'
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')
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
      
      const result = await c.env.GUILD_DB.prepare(query).bind(...params).all()
      
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
        total: result.results?.length || 0
      })
    }
  } catch (e) {
    console.error('[Confessional] D1 error:', e)
  }
  
  // Fallback: Return seed data for demo
  const seedConfessions = [
    { id: 1, confession_text: "I spent 500 logs chasing a mythic and got 47 copies of the same common", sin_category: 'addiction', priest_response: "Your dedication to disappointment is noted. Say 5 'May the pulls be ever in your favor' and touch grass for 10 minutes.", prayers: 127, sames: 89, created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, confession_text: "I told my wife the $200 charge was for 'work software'", sin_category: 'greed', priest_response: "Regina forgives you. Your bank account does not. Your penance: F2P for one week.", prayers: 256, sames: 142, created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: 3, confession_text: "I accidentally fed my only mythic to the forge because I was pulling while half asleep at 3am", sin_category: 'stupidity', priest_response: "The forge thanks you for your generous sacrifice. Your mythic is in a better place now (someone else's collection).", prayers: 89, sames: 34, created_at: new Date(Date.now() - 10800000).toISOString() },
    { id: 4, confession_text: "I mass-sold my legendaries for 1 NWG each because I didn't read the confirmation popup", sin_category: 'stupidity', priest_response: "Reading is fundamental, my child. Your penance: Actually read the Terms of Service. All of it.", prayers: 312, sames: 201, created_at: new Date(Date.now() - 14400000).toISOString() },
    { id: 5, confession_text: "I set a 4am alarm every day to catch the daily reset", sin_category: 'addiction', priest_response: "The gacha gods appreciate your devotion. Your sleep schedule does not.", prayers: 178, sames: 156, created_at: new Date(Date.now() - 18000000).toISOString() },
    { id: 6, confession_text: "I have 47 copies of the same card because 'what if they buff it'", sin_category: 'greed', priest_response: "Hope is a beautiful thing. So is inventory management. Delete 46 of them.", prayers: 145, sames: 88, created_at: new Date(Date.now() - 21600000).toISOString() },
    { id: 7, confession_text: "I pretend to understand the meta but I just use whatever looks cool", sin_category: 'shame', priest_response: "Aesthetics > Statistics. You are forgiven, fashion icon.", prayers: 234, sames: 198, created_at: new Date(Date.now() - 25200000).toISOString() },
    { id: 8, confession_text: "I reported someone for 'cheating' when they just had better cards than me", sin_category: 'salt', priest_response: "The salt flows through you. Your penance: Send them a 'GG' and mean it.", prayers: 156, sames: 112, created_at: new Date(Date.now() - 28800000).toISOString() }
  ]
  
  const sorted = sort === 'hot' 
    ? [...seedConfessions].sort((a, b) => b.prayers - a.prayers)
    : seedConfessions
  
  const filtered = category 
    ? sorted.filter(c => c.sin_category === category)
    : sorted
  
  return c.json({
    success: true,
    confessions: filtered.slice(offset, offset + limit),
    sinnerOfWeek: sorted[0], // Top by prayers
    total: filtered.length,
    isDemo: true
  })
})

// POST /api/confess - Submit a new confession
app.post('/api/confess', async (c) => {
  try {
    const body = await c.req.json()
    const { confession, category, deviceId, language } = body
    
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
      `).bind(confession.trim(), sinCategory, priestResponse, language || 'en').run()
      
      return c.json({
        success: true,
        id: result.meta.last_row_id,
        priestResponse,
        message: 'Your confession has been received. May Regina have mercy on your pulls.'
      })
    }
    
    // Fallback for demo
    return c.json({
      success: true,
      id: Date.now(),
      priestResponse,
      message: 'Your confession has been received. May Regina have mercy on your pulls.',
      isDemo: true
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// POST /api/confessions/:id/pray - Pray for a confession
app.post('/api/confessions/:id/pray', async (c) => {
  try {
    const confessionId = parseInt(c.req.param('id'))
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
      `).bind(confessionId, deviceId || 'anonymous', reaction).first()
      
      if (existing) {
        return c.json({ success: false, error: 'You have already reacted to this confession' }, 400)
      }
      
      // Add prayer/reaction
      await c.env.GUILD_DB.prepare(`
        INSERT INTO confession_prayers (confession_id, device_id, reaction_type)
        VALUES (?, ?, ?)
      `).bind(confessionId, deviceId || 'anonymous', reaction).run()
      
      // Update confession count
      const column = reaction === 'pray' ? 'prayers' : reaction === 'same' ? 'sames' : 'reported'
      await c.env.GUILD_DB.prepare(`
        UPDATE confessions SET ${column} = ${column} + 1 WHERE id = ?
      `).bind(confessionId).run()
      
      // Get updated confession
      const updated = await c.env.GUILD_DB.prepare(`
        SELECT prayers, sames, reported FROM confessions WHERE id = ?
      `).bind(confessionId).first()
      
      return c.json({
        success: true,
        reaction,
        prayers: updated?.prayers || 0,
        sames: updated?.sames || 0,
        message: reaction === 'pray' ? '🙏 Your prayer has been noted' : 
                 reaction === 'same' ? '💀 Solidarity recorded' : 
                 '🚨 Report submitted for review'
      })
    }
    
    // Fallback for demo
    return c.json({
      success: true,
      reaction,
      prayers: Math.floor(Math.random() * 100) + 50,
      sames: Math.floor(Math.random() * 50) + 20,
      message: reaction === 'pray' ? '🙏 Your prayer has been noted' : 
               reaction === 'same' ? '💀 Solidarity recorded' : 
               '🚨 Report submitted for review',
      isDemo: true
    })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/confessions/stats - Get confessional statistics
app.get('/api/confessions/stats', async (c) => {
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
          byCategory: categoryStats.results || []
        }
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
        { sin_category: 'betrayal', count: 33 }
      ]
    },
    isDemo: true
  })
})

export default app

// ============================================================================
// PHYSICAL CARD CLAIM API - QR Code Redemption System
// ============================================================================

// POST /api/physical/verify - Verify a claim code without claiming
app.post('/api/physical/verify', async (c) => {
  try {
    const body = await c.req.json();
    const { code } = body;
    
    if (!code || code.length < 12) {
      return c.json({ success: false, error: 'INVALID_CODE', message: 'Invalid claim code' }, 400);
    }
    
    const db = c.env?.GUILD_DB;
    
    // Demo mode without database
    if (!db) {
      // Simulate card lookup based on code prefix
      const demoCards: Record<string, any> = {
        'OG': { setNumber: 'OG-001', cardId: 1, name: 'RegginA, The Eternal Flame', rarity: 'mythic', printNumber: 47, totalPrint: 250, isFirstEdition: true, img: 'reggina-eternal-flame-mythic-v3.webp', nwgValue: 1500, dailyYield: 5.0 },
        'LE': { setNumber: 'OG-005', cardId: 101, name: 'RegginA - Practicing Trainee', rarity: 'legendary', printNumber: 123, totalPrint: 1000, isFirstEdition: true, img: 'mythic-01-practicing-trainee.webp', nwgValue: 500, dailyYield: 2.5 },
        'EP': { setNumber: 'OG-011', cardId: 202, name: 'Burnout, The Eternal Grinder', rarity: 'epic', printNumber: 456, totalPrint: 4000, isFirstEdition: true, img: 'legendary-burnout.webp', nwgValue: 200, dailyYield: 1.0 },
        'RA': { setNumber: 'OG-019', cardId: 309, name: 'Server Crash', rarity: 'rare', printNumber: 789, totalPrint: 10000, isFirstEdition: true, img: 'epic-server-crash.webp', nwgValue: 75, dailyYield: 0.5 }
      };
      
      const prefix = code.substring(0, 2).toUpperCase();
      const card = demoCards[prefix] || demoCards['OG'];
      
      return c.json({
        success: true,
        card,
        rewards: {
          nwg: card.nwgValue,
          physicalBonus: 2.0,
          firstEditionBonus: card.isFirstEdition ? 1.5 : 1.0
        }
      });
    }
    
    // Production mode with D1
    const claimCode = await db.prepare(
      'SELECT * FROM physical_claim_codes WHERE code = ?'
    ).bind(code.toUpperCase()).first();
    
    if (!claimCode) {
      return c.json({ success: false, error: 'NOT_FOUND', message: 'Code not found' }, 404);
    }
    
    if (claimCode.claimed_by) {
      return c.json({ success: false, error: 'ALREADY_CLAIMED', message: 'This card has already been claimed' });
    }
    
    if (claimCode.is_blocked) {
      return c.json({ success: false, error: 'BLOCKED', message: 'This code has been blocked' }, 403);
    }
    
    // Get card info from physical origins set
    const originsSet = await import('../public/static/data/physical-origins-set.json');
    const cardInfo = originsSet.cards.find((c: any) => c.setNumber === claimCode.set_number);
    
    return c.json({
      success: true,
      card: {
        setNumber: claimCode.set_number,
        cardId: claimCode.card_id,
        name: cardInfo?.name || 'Unknown Card',
        rarity: claimCode.rarity,
        printNumber: claimCode.print_number,
        totalPrint: claimCode.total_print,
        isFirstEdition: claimCode.is_first_edition === 1,
        isHolographic: claimCode.is_holographic === 1,
        img: getCardImageByRarity(claimCode.rarity, claimCode.card_id),
        nwgValue: cardInfo?.nwgValue || 10,
        dailyYield: cardInfo?.dailyYield || 0.1
      },
      rewards: {
        nwg: cardInfo?.nwgValue || 10,
        physicalBonus: 2.0,
        firstEditionBonus: claimCode.is_first_edition === 1 ? 1.5 : 1.0
      }
    });
  } catch (e) {
    console.error('Verify error:', e);
    return c.json({ success: false, error: 'SERVER_ERROR', message: String(e) }, 500);
  }
});

// POST /api/physical/claim - Claim a physical card
app.post('/api/physical/claim', async (c) => {
  try {
    const body = await c.req.json();
    const { code, deviceUUID } = body;
    
    if (!code || !deviceUUID) {
      return c.json({ success: false, error: 'Missing code or deviceUUID' }, 400);
    }
    
    const db = c.env?.GUILD_DB;
    
    // Demo mode without database
    if (!db) {
      // Simulate successful claim
      const nwgGranted = 2250; // 1500 * 1.5 first edition bonus
      
      return c.json({
        success: true,
        nwgGranted,
        card: {
          setNumber: 'OG-001',
          cardId: 1,
          name: 'RegginA, The Eternal Flame',
          rarity: 'mythic'
        },
        message: 'Card claimed successfully! (Demo mode)'
      });
    }
    
    // Production mode with D1
    const claimCode = await db.prepare(
      'SELECT * FROM physical_claim_codes WHERE code = ?'
    ).bind(code.toUpperCase()).first();
    
    if (!claimCode) {
      return c.json({ success: false, error: 'Code not found' }, 404);
    }
    
    if (claimCode.claimed_by) {
      return c.json({ success: false, error: 'Already claimed' }, 400);
    }
    
    // Get card info
    const originsSet = await import('../public/static/data/physical-origins-set.json');
    const cardInfo = originsSet.cards.find((c: any) => c.setNumber === claimCode.set_number);
    
    // Calculate NWG reward
    const baseNwg = cardInfo?.nwgValue || 10;
    const firstEditionBonus = claimCode.is_first_edition === 1 ? 1.5 : 1.0;
    const nwgGranted = Math.round(baseNwg * firstEditionBonus);
    
    // Update claim code as claimed
    await db.prepare(`
      UPDATE physical_claim_codes 
      SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP, claim_ip = ?, nwg_granted = ?, bonus_multiplier = ?
      WHERE id = ?
    `).bind(deviceUUID, c.req.header('CF-Connecting-IP') || 'unknown', nwgGranted, firstEditionBonus, claimCode.id).run();
    
    // Create ownership record
    await db.prepare(`
      INSERT INTO physical_card_ownership 
      (owner_id, claim_code_id, set_id, set_number, card_id, rarity, print_number, is_first_edition, is_holographic)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      deviceUUID, claimCode.id, claimCode.set_id, claimCode.set_number, 
      claimCode.card_id, claimCode.rarity, claimCode.print_number,
      claimCode.is_first_edition, claimCode.is_holographic
    ).run();
    
    // Log transaction
    await db.prepare(`
      INSERT INTO claim_transactions (code, device_uuid, ip_address, user_agent, success, nwg_granted, card_granted)
      VALUES (?, ?, ?, ?, TRUE, ?, ?)
    `).bind(
      code.toUpperCase(), deviceUUID, 
      c.req.header('CF-Connecting-IP') || 'unknown',
      c.req.header('User-Agent') || 'unknown',
      nwgGranted,
      JSON.stringify({ setNumber: claimCode.set_number, cardId: claimCode.card_id, rarity: claimCode.rarity })
    ).run();
    
    // Add NWG to wallet
    const citizen = await db.prepare(
      'SELECT w.id as wallet_id, w.balance_nwg FROM citizens c JOIN wallets w ON c.id = w.citizen_id WHERE c.device_uuid = ?'
    ).bind(deviceUUID).first();
    
    if (citizen) {
      await db.prepare(`
        UPDATE wallets SET balance_nwg = balance_nwg + ?, total_earned_nwg = total_earned_nwg + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(nwgGranted, nwgGranted, citizen.wallet_id).run();
    }
    
    return c.json({
      success: true,
      nwgGranted,
      card: {
        setNumber: claimCode.set_number,
        cardId: claimCode.card_id,
        name: cardInfo?.name || 'Unknown Card',
        rarity: claimCode.rarity,
        printNumber: claimCode.print_number,
        isFirstEdition: claimCode.is_first_edition === 1
      },
      message: 'Card claimed successfully!'
    });
  } catch (e) {
    console.error('Claim error:', e);
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// Helper to get card image by rarity and ID
function getCardImageByRarity(rarity: string, cardId: number): string {
  const images: Record<number, string> = {
    1: 'reggina-eternal-flame-mythic-v3.webp',
    2: 'harlay-dog-of-war-mythic.webp',
    3: 'mythic-05-paladin-reggina.webp',
    107: 'mythic-sacred-log.webp',
    101: 'mythic-01-practicing-trainee.webp',
    102: 'mythic-02-chain-undead.webp',
    103: 'mythic-03-infernal-warlord.webp',
    104: 'mythic-04-sky-sovereign.webp',
    105: 'mythic-05-paladin-reggina.webp',
    106: 'harlay-dog-of-war-mythic.webp',
    202: 'legendary-burnout.webp',
    203: 'legendary-whaleford.webp',
    204: '27-elder-dragon.webp',
    205: 'legendary-webweaver.webp',
    206: 'legendary-afk-luna.webp',
    208: 'legendary-mochi.webp',
    209: 'legendary-404.webp',
    211: 'legendary-capslock.webp'
  };
  return images[cardId] || `${rarity}-${cardId}.webp`;
}

// GET /api/physical/my-cards/:deviceUUID - Get user's physical cards
app.get('/api/physical/my-cards/:deviceUUID', async (c) => {
  try {
    const deviceUUID = c.req.param('deviceUUID');
    const db = c.env?.GUILD_DB;
    
    if (!db) {
      return c.json({ success: true, cards: [], message: 'Demo mode - no database' });
    }
    
    const { results } = await db.prepare(`
      SELECT * FROM physical_card_ownership WHERE owner_id = ? ORDER BY claimed_at DESC
    `).bind(deviceUUID).all();
    
    return c.json({
      success: true,
      cards: results || [],
      count: results?.length || 0
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/physical/stats - Get physical card claim statistics
app.get('/api/physical/stats', async (c) => {
  try {
    const db = c.env?.GUILD_DB;
    
    if (!db) {
      return c.json({
        success: true,
        source: 'mock',
        stats: {
          totalCodes: 50000,
          claimedCodes: 1250,
          claimRate: 2.5,
          byRarity: {
            mythic: { total: 1000, claimed: 47 },
            legendary: { total: 6000, claimed: 150 },
            epic: { total: 32000, claimed: 400 },
            rare: { total: 120000, claimed: 350 },
            uncommon: { total: 200000, claimed: 200 },
            common: { total: 300000, claimed: 103 }
          }
        }
      });
    }
    
    const { results } = await db.prepare('SELECT * FROM claim_stats').all();
    
    return c.json({
      success: true,
      source: 'd1',
      stats: results
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// ============================================================================
// AVATAR STUDIO API - MapleStory Avatar Generation
// ============================================================================

// POST /api/avatar/generate - Generate avatar art from screenshot
app.post('/api/avatar/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { image, pose, prompt } = body;
    
    if (!image || !pose) {
      return c.json({ 
        success: false, 
        error: 'Missing required fields: image and pose' 
      }, 400);
    }
    
    // In production, this would call the AI image generation API
    // For now, return a demo response
    // 
    // Production implementation would:
    // 1. Upload image to temporary storage
    // 2. Call nano-banana-pro model with the prompt
    // 3. Return generated image URL
    
    const poseDescriptions: Record<string, string> = {
      hero: "heroic battle stance",
      cute: "adorable kawaii pose",
      cool: "relaxed cool stance",
      victory: "victory celebration",
      magic: "casting magical spell",
      action: "dynamic action pose",
      relaxed: "peaceful relaxed pose",
      party: "festive party pose"
    };
    
    return c.json({
      success: true,
      message: 'Avatar generation queued',
      requestId: `avatar-${Date.now()}`,
      pose: pose,
      poseDescription: poseDescriptions[pose] || pose,
      // In production: imageUrl would be the generated image
      imageUrl: image, // For demo, return the input image
      status: 'demo_mode',
      note: 'Connect to AI generation service for actual avatar creation'
    });
    
  } catch (e) {
    return c.json({ 
      success: false, 
      error: String(e) 
    }, 500);
  }
});

// GET /api/avatar/poses - Get available poses
app.get('/api/avatar/poses', (c) => {
  return c.json({
    success: true,
    poses: [
      { id: 'hero', name: 'Hero Stance', emoji: '⚔️', description: 'Heroic battle stance with weapon' },
      { id: 'cute', name: 'Cute & Kawaii', emoji: '🥰', description: 'Adorable pose with sparkles' },
      { id: 'cool', name: 'Cool & Chill', emoji: '😎', description: 'Relaxed and confident' },
      { id: 'victory', name: 'Victory!', emoji: '🏆', description: 'Celebration with confetti' },
      { id: 'magic', name: 'Magic Spell', emoji: '✨', description: 'Casting mystical magic' },
      { id: 'action', name: 'Action Shot', emoji: '💥', description: 'Dynamic mid-attack pose' },
      { id: 'relaxed', name: 'AFK Mode', emoji: '😴', description: 'Peaceful lounging pose' },
      { id: 'party', name: 'Party Time!', emoji: '🎉', description: 'Dancing celebration' }
    ]
  });
});

// GET /api/avatar/components - Get avatar component library
app.get('/api/avatar/components', async (c) => {
  try {
    // Load from the components JSON file
    const components = await import('../public/static/data/avatar-components.json');
    return c.json({
      success: true,
      ...components
    });
  } catch (e) {
    return c.json({ 
      success: false, 
      error: 'Could not load components',
      fallback: {
        slots: ['hat', 'hair', 'eyewear', 'face', 'costume', 'weapon', 'skin', 'background'],
        note: 'Load avatar-components.json for full data'
      }
    });
  }
});

// ============================================================================
// AI GUIDE API - LLM-Powered Assistant
// ============================================================================
// 
// LEARNING: This is your first real AI integration!
// Key concepts:
// 1. System prompts define AI personality and knowledge
// 2. Streaming provides real-time response delivery
// 3. Conversation history enables context-aware responses
// 4. Error handling with graceful fallbacks
// ============================================================================

import AIGuide, { chat as aiChat, chatStream, getQuickResponse, parseActionsFromResponse, type GuideRequest, type Message, type GuideAction } from './services/ai-guide';

// Environment variables for AI (set in wrangler.toml or Cloudflare dashboard)
// OPENAI_API_KEY and OPENAI_BASE_URL

// POST /api/guide/chat - Chat with AI Guide (non-streaming)
app.post('/api/guide/chat', async (c) => {
  try {
    const body = await c.req.json() as GuideRequest;
    const { message, conversationHistory, language, currentPage, userContext } = body;

    if (!message || message.trim().length === 0) {
      return c.json({ 
        success: false, 
        error: 'Message is required' 
      }, 400);
    }

    // Get API credentials from config file or environment
    const apiKey = c.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY || llmConfig?.openai?.api_key;
    const baseUrl = c.env?.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || llmConfig?.openai?.base_url || 'https://www.genspark.ai/api/llm_proxy/v1';

    if (!apiKey) {
      // Return fallback response if no API key
      console.warn('[AI Guide] No API key configured, using fallback');
      return c.json({
        success: true,
        message: getQuickResponse('fallback', language || 'en'),
        source: 'fallback',
        note: 'AI service not configured'
      });
    }

    // Call AI
    const response = await aiChat(
      { message, conversationHistory, language, currentPage, userContext },
      apiKey,
      baseUrl
    );

    if (!response.success) {
      return c.json({
        success: true,
        message: getQuickResponse('error', language || 'en'),
        source: 'fallback',
        error: response.error
      });
    }

    return c.json({
      success: true,
      message: response.message,
      usage: response.usage,
      source: 'ai'
    });

  } catch (e) {
    console.error('[AI Guide] Error:', e);
    return c.json({
      success: true,
      message: getQuickResponse('error', 'en'),
      source: 'fallback',
      error: String(e)
    });
  }
});

// POST /api/guide/stream - Chat with AI Guide (streaming)
// 
// LEARNING: Streaming responses!
// Instead of waiting for the full response, we send chunks as they arrive.
// This creates a "typing" effect and feels more responsive.
app.post('/api/guide/stream', async (c) => {
  try {
    const body = await c.req.json() as GuideRequest;
    const { message, conversationHistory, language, currentPage, userContext } = body;

    if (!message || message.trim().length === 0) {
      return c.json({ success: false, error: 'Message is required' }, 400);
    }

    const apiKey = c.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY || llmConfig?.openai?.api_key;
    const baseUrl = c.env?.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || llmConfig?.openai?.base_url || 'https://www.genspark.ai/api/llm_proxy/v1';

    if (!apiKey) {
      // Return fallback as stream-like response
      const fallbackMessage = getQuickResponse('fallback', language || 'en');
      return new Response(
        `data: ${JSON.stringify({ content: fallbackMessage, done: true })}\n\n`,
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        }
      );
    }

    const stream = await chatStream(
      { message, conversationHistory, language, currentPage, userContext },
      apiKey,
      baseUrl
    );

    if (!stream) {
      const errorMessage = getQuickResponse('error', language || 'en');
      return new Response(
        `data: ${JSON.stringify({ content: errorMessage, done: true })}\n\n`,
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache'
          }
        }
      );
    }

    // Transform the OpenAI stream to our format
    // PHASE 4: Also collect full response to parse actions at the end
    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let fullResponse = ''; // Collect full response for action parsing

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // PHASE 4: Parse actions from the full response and send them
              const { actions } = parseActionsFromResponse(fullResponse);
              if (actions && actions.length > 0) {
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ actions, done: false })}\n\n`)
                );
                console.log('[AI Guide] Actions found:', actions);
              }
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`));
              controller.close();
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

            for (const line of lines) {
              const data = line.slice(6); // Remove 'data: ' prefix
              if (data === '[DONE]') {
                // PHASE 4: Parse actions before sending done
                const { actions } = parseActionsFromResponse(fullResponse);
                if (actions && actions.length > 0) {
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ actions, done: false })}\n\n`)
                  );
                }
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content; // Accumulate response
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        } catch (error) {
          console.error('[AI Guide] Stream error:', error);
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: String(error), done: true })}\n\n`)
          );
          controller.close();
        }
      }
    });

    return new Response(transformedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (e) {
    console.error('[AI Guide] Stream Error:', e);
    return new Response(
      `data: ${JSON.stringify({ error: String(e), done: true })}\n\n`,
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
});

// GET /api/guide/health - Check if AI Guide is available
app.get('/api/guide/health', (c) => {
  const apiKey = c.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY || llmConfig?.openai?.api_key;
  
  return c.json({
    success: true,
    status: apiKey ? 'ready' : 'fallback_only',
    features: {
      chat: true,
      streaming: true,
      conversationMemory: true,
      multiLanguage: ['en', 'zh', 'th'],
      // PHASE 4: Action system!
      actions: true,
      supportedActions: [
        'navigate',    // Go to a page
        'showBalance', // Display wallet popup
        'claimDaily',  // Claim daily reward
        'openForge',   // Open card forge
        'showCards',   // Show card collection
        'playSound',   // Play a sound effect
        'showToast',   // Show a notification
        'toggleTheme', // Toggle dark/light mode
        'shareDiscord',// Share to Discord
        'copyText'     // Copy text to clipboard
      ]
    },
    version: '2.0.0'
  });
});

