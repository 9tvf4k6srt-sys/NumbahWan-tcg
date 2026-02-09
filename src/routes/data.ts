/**
 * Data Routes - Static JSON data APIs
 * Split from monolithic index.tsx
 * 
 * v2: Data files moved to /static/data/ — loaded via fetch instead of import
 * This cuts ~27KB from the worker bundle (translations, roster, performance, photos)
 * Data is cached on first request per isolate lifetime
 */
import { Hono } from 'hono'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

const router = new Hono<{ Bindings: Bindings }>()

// ── Lazy-load cache for static data ──────────────────────────
let _dataCache: Record<string, any> = {}

async function loadStaticData(origin: string, name: string): Promise<any> {
  if (_dataCache[name]) return _dataCache[name]
  try {
    const resp = await fetch(`${origin}/static/data/${name}.json`)
    if (resp.ok) {
      _dataCache[name] = await resp.json()
      return _dataCache[name]
    }
  } catch (e) {
    // Fallback: return empty
  }
  return {}
}

// API: Get translations (for all pages to share)
router.get('/i18n', async (c) => {
  c.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  const origin = new URL(c.req.url).origin
  const data = await loadStaticData(origin, 'translations')
  return c.json(data)
})

// API: Get roster data
router.get('/roster', async (c) => {
  c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  const origin = new URL(c.req.url).origin
  const data = await loadStaticData(origin, 'roster')
  return c.json(data)
})

// API: Get photos data
router.get('/photos', async (c) => {
  c.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  const origin = new URL(c.req.url).origin
  const data = await loadStaticData(origin, 'photos')
  return c.json(data)
})

// API: Get performance tracking data
router.get('/performance', async (c) => {
  c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  const origin = new URL(c.req.url).origin
  const data = await loadStaticData(origin, 'performance')
  return c.json(data)
})

// API: Get member data
router.get('/members', async (c) => {
  const origin = new URL(c.req.url).origin
  const rosterData = await loadStaticData(origin, 'roster')
  const members = rosterData.members || []
  const sortedMembers = [...members].sort((a: any, b: any) => b.cpValue - a.cpValue)
  return c.json({ members, sortedMembers })
})

export default router
