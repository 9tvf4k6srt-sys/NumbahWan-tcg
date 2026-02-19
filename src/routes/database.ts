import { Hono } from 'hono'
import photosData from '../data/photos.json'
import rosterData from '../data/roster.json'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

// Route helpers - reduce repetitive error handling patterns
function _jsonError(c: any, msg: string, status = 400) {
  return c.json({ success: false, error: msg }, status)
}

function _jsonSuccess(c: any, data: any) {
  return c.json({ success: true, ...data })
}

function _parseIntParam(val: string | undefined, fallback: number): number {
  const n = parseInt(val || '', 10)
  return Number.isNaN(n) ? fallback : n
}

function _requireFields(body: any, fields: string[]): string | null {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') return f
  }
  return null
}

function _safeString(val: any, maxLen = 200): string {
  return String(val || '')
    .trim()
    .slice(0, maxLen)
}

const router = new Hono<{ Bindings: Bindings }>()

// D1 DATABASE API - Dynamic CRUD Operations

// GET /api/db/members - Get all members from D1
router.get('/members', async (c) => {
  try {
    const db = c.env.GUILD_DB
    if (!db) {
      // Fallback to JSON if D1 not available (local dev without D1)
      return c.json({ source: 'json', members: rosterData.members })
    }

    const { results } = await db.prepare('SELECT * FROM members ORDER BY cp_value DESC').all()

    return c.json({ source: 'd1', members: results })
  } catch (_e) {
    // Fallback to JSON on any D1 error (common in local dev)
    return c.json({ source: 'json', members: rosterData.members })
  }
})

// GET /api/db/members/:name - Get single member
router.get('/members/:name', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    const name = c.req.param('name')

    if (!db) {
      const member = rosterData.members.find((m) => m.name === name)
      return member ? c.json(member) : c.json({ error: 'Not found' }, 404)
    }

    const result = await db.prepare('SELECT * FROM members WHERE name = ?').bind(name).first()

    return result ? c.json(result) : c.json({ error: 'Not found' }, 404)
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// POST /api/db/members - Add new member
router.post('/members', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    if (!db) return c.json({ error: 'Database not available' }, 503)

    const body = await c.req.json()
    const { name, level, cp, cp_value, contribution, upgrade, role, avatar, note } = body

    if (!name) return c.json({ error: 'Name is required' }, 400)

    await db
      .prepare(`
      INSERT INTO members (name, level, cp, cp_value, contribution, upgrade, role, avatar, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        name,
        level || 1,
        cp || '0',
        cp_value || 0,
        contribution || 0,
        upgrade || 0,
        role || 'Guild Member',
        avatar,
        note,
      )
      .run()

    return c.json({ success: true, message: `Member ${name} added` })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// PUT /api/db/members/:name - Update member
router.put('/members/:name', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    if (!db) return c.json({ error: 'Database not available' }, 503)

    const name = c.req.param('name')
    const body = await c.req.json()

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []

    if (body.level !== undefined) {
      updates.push('level = ?')
      values.push(body.level)
    }
    if (body.cp !== undefined) {
      updates.push('cp = ?')
      values.push(body.cp)
    }
    if (body.cp_value !== undefined) {
      updates.push('cp_value = ?')
      values.push(body.cp_value)
    }
    if (body.contribution !== undefined) {
      updates.push('contribution = ?')
      values.push(body.contribution)
    }
    if (body.upgrade !== undefined) {
      updates.push('upgrade = ?')
      values.push(body.upgrade)
    }
    if (body.role !== undefined) {
      updates.push('role = ?')
      values.push(body.role)
    }
    if (body.online !== undefined) {
      updates.push('online = ?')
      values.push(body.online ? 1 : 0)
    }
    if (body.avatar !== undefined) {
      updates.push('avatar = ?')
      values.push(body.avatar)
    }
    if (body.note !== undefined) {
      updates.push('note = ?')
      values.push(body.note)
    }

    if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400)

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(name)

    await db
      .prepare(`UPDATE members SET ${updates.join(', ')} WHERE name = ?`)
      .bind(...values)
      .run()

    return c.json({ success: true, message: `Member ${name} updated` })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// DELETE /api/db/members/:name - Remove member
router.delete('/members/:name', async (c) => {
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
router.get('/photos', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    if (!db) {
      return c.json({ source: 'json', photos: photosData.guildPhotos })
    }

    const { results } = await db.prepare('SELECT * FROM photos ORDER BY id ASC').all()

    // Transform to match frontend expected format
    const photos = results?.map((p: any) => ({
      id: p.id,
      title: { en: p.title_en, zh: p.title_zh, th: p.title_th },
      description: { en: p.description_en, zh: p.description_zh, th: p.description_th },
      image: p.image,
    }))

    return c.json({ source: 'd1', photos })
  } catch (e) {
    return c.json({ source: 'json', photos: photosData.guildPhotos, error: String(e) })
  }
})

// POST /api/db/photos - Add new photo
router.post('/photos', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    if (!db) return c.json({ error: 'Database not available' }, 503)

    const body = await c.req.json()
    const { title_en, title_zh, title_th, description_en, description_zh, description_th, image, uploaded_by } = body

    if (!image) return c.json({ error: 'Image path is required' }, 400)

    await db
      .prepare(`
      INSERT INTO photos (title_en, title_zh, title_th, description_en, description_zh, description_th, image, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(title_en, title_zh, title_th, description_en, description_zh, description_th, image, uploaded_by)
      .run()

    return c.json({ success: true, message: 'Photo added' })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// DELETE /api/db/photos/:id - Remove photo
router.delete('/photos/:id', async (c) => {
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
router.get('/stats', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    if (!db) {
      return c.json({ source: 'json', stats: rosterData.guildStats })
    }

    const { results } = await db.prepare('SELECT * FROM guild_stats').all()

    // Transform to key-value object
    const stats: Record<string, string> = {}
    results?.forEach((r: any) => {
      stats[r.stat_key] = r.stat_value
    })

    return c.json({ source: 'd1', stats })
  } catch (e) {
    return c.json({ source: 'json', stats: rosterData.guildStats, error: String(e) })
  }
})

// PUT /api/db/stats - Update guild stat
router.put('/stats', async (c) => {
  try {
    const db = c.env?.GUILD_DB
    if (!db) return c.json({ error: 'Database not available' }, 503)

    const body = await c.req.json()
    const { key, value } = body

    if (!key || value === undefined) return c.json({ error: 'Key and value required' }, 400)

    await db
      .prepare(`
      INSERT OR REPLACE INTO guild_stats (stat_key, stat_value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `)
      .bind(key, String(value))
      .run()

    return c.json({ success: true, message: `Stat ${key} updated` })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})
export default router
