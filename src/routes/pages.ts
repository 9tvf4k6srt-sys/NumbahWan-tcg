import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-pages'
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

// Main page
router.get('/', async (c) => {
  try {
    // @ts-ignore
    const asset = await c.env?.ASSETS?.fetch(new Request('https://dummy/index.html'))
    if (asset) {
      return new Response(asset.body, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  } catch (e) {}
  return c.redirect('/index.html')
})
router.get('/index.html', serveStatic({ path: './index.html' }))

// AI-friendly & crawler files (all served from public/ static files)
const textFiles = ['llms.txt', 'llms-full.txt', 'robots.txt']
textFiles.forEach(file => {
  router.get(`/${file}`, async (c) => {
    try {
      // @ts-ignore
      const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy/${file}`))
      if (asset) {
        return new Response(asset.body, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
        })
      }
    } catch (e) {}
    return c.text(`${file} not found`, 404)
  })
})

// Sitemap XML
router.get('/sitemap.xml', async (c) => {
  try {
    // @ts-ignore
    const asset = await c.env?.ASSETS?.fetch(new Request('https://dummy/sitemap.xml'))
    if (asset) {
      return new Response(asset.body, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
      })
    }
  } catch (e) {}
  return c.text('sitemap.xml not found', 404)
})

// Named page routes (regina, pvp)
const namedPages = ['regina', 'pvp']
namedPages.forEach(page => {
  router.get(`/${page}`, async (c) => {
    try {
      // @ts-ignore
      const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy/${page}.html`))
      if (asset) {
        return new Response(asset.body, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      }
    } catch (e) {}
    return c.redirect(`/${page}.html`)
  })
})

// Static pages served via route factory
const staticPages = ['fashion', 'merch', 'fortune', 'arcade', 'memes', 'apply', 'wallet', 'forge', 'tcg', 'market', 'cards', 'guide', 'battle', 'pvp-battle', 'card-bridge', 'collection', 'deckbuilder', 'zakum', 'tournament', 'academy', 'vault', 'museum', 'research', 'historical-society', 'menu-demo', 'exchange', 'ai-lounge', 'court', 'therapy', 'hr', 'conspiracy', 'updates', 'about', 'treasury', 'intelligence', 'citizenship', 'invest', 'markets', 'buy', 'business', 'supermarket', 'restaurants', 'services', 'crafts', 'realestate', 'jobs', 'my-business', 'cafeteria', 'lost-found', 'parking', 'maintenance', 'breakroom', 'basement', 'nwg-shop', 'card-print-template', 'wyckoff', 'matchalatte', 'embassy', 'profile-card', 'achievements', 'lore', 'restaurant', 'card-lab', 'avatar-builder', 'tavern-tales', 'leaderboard', 'research-library', 'auction-house', 'system-dashboard', 'card-utility', 'shrine', 'card-audit', 'oracle', 'showcase', 'tools', 'admin-physical', 'battle-legacy', 'battle-old', 'battle-simple']

staticPages.forEach(page => {
  router.get(`/${page}`, async (c) => {
    try {
      // @ts-ignore
      const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy/${page}.html`))
      if (asset) {
        return new Response(asset.body, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      }
    } catch (e) {}
    return c.redirect(`/${page}.html`)
  })
})

// Museum exhibits
const museumExhibits = ['exhibit-001', 'exhibit-002', 'exhibit-003', 'exhibit-004', 'exhibit-005', 'exhibit-006', 'exhibit-007', 'exhibit-008', 'exhibit-009', 'exhibit-010']
museumExhibits.forEach(exhibit => {
  router.get(`/museum/${exhibit}`, async (c) => {
    try {
      // @ts-ignore
      const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy/museum/${exhibit}.html`))
      if (asset) {
        return new Response(asset.body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }
    } catch (e) {}
    return c.redirect(`/museum/${exhibit}.html`)
  })
})

// Vault floors
const vaultFloors = ['b3-decontamination', 'b7-hall-of-failures', 'b12-antechamber']
vaultFloors.forEach(floor => {
  router.get(`/vault/${floor}`, async (c) => {
    try {
      // @ts-ignore
      const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy/vault/${floor}.html`))
      if (asset) {
        return new Response(asset.body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }
    } catch (e) {}
    return c.redirect(`/vault/${floor}.html`)
  })
})

// Research papers
const researchPapers = ['work-gloves-economic-impact', 'zakum-helmet-spectral-analysis', 'reggina-misprint-forensic-examination', 'vault-security-analysis', 'nx-fashion-revolution', 'transparent-set-psychology']
researchPapers.forEach(paper => {
  router.get(`/research/${paper}`, async (c) => {
    try {
      // @ts-ignore
      const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy/research/${paper}.html`))
      if (asset) {
        return new Response(asset.body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }
    } catch (e) {}
    return c.redirect(`/research/${paper}.html`)
  })
})

// Lore pages
const lorePages = ['reggina-origin']
lorePages.forEach(page => {
  router.get(`/lore/${page}`, async (c) => {
    try {
      // @ts-ignore
      const asset = await c.env?.ASSETS?.fetch(new Request(`https://dummy/lore/${page}.html`))
      if (asset) {
        return new Response(asset.body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }
    } catch (e) {}
    return c.redirect(`/lore/${page}.html`)
  })
})

export default router
