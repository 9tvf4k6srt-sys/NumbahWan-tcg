/**
 * Data Routes - Static JSON data APIs
 * Split from monolithic index.tsx
 * 
 * AUTO-LEARN PATTERN: data-api-isolation
 * These endpoints serve static/semi-static data with proper caching
 */
import { Hono } from 'hono'
import rosterData from '../data/roster.json'
import photosData from '../data/photos.json'
import translationsData from '../data/translations.json'
import performanceData from '../data/performance.json'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

const router = new Hono<{ Bindings: Bindings }>()

// API: Get translations (for all pages to share)
router.get('/i18n', (c) => {
  c.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return c.json(translationsData)
})

// API: Get roster data
router.get('/roster', (c) => {
  c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  return c.json(rosterData)
})

// API: Get photos data
router.get('/photos', (c) => {
  c.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return c.json(photosData)
})

// API: Get performance tracking data
router.get('/performance', (c) => {
  c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  return c.json(performanceData)
})

// API: Get member data
router.get('/members', (c) => {
  const members = rosterData.members
  const sortedMembers = [...members].sort((a, b) => b.cpValue - a.cpValue)
  return c.json({ members, sortedMembers })
})

export default router
