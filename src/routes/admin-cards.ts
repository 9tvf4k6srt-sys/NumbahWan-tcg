import { Hono } from 'hono'
import cardDatabase from '../../public/static/data/cards-v2.json'
import { toErrorResponse } from '../errors'
import { logger } from '../logger'
import type { Bindings } from '../types'
import { BatchCreateCardsSchema, CreateCardSchema, formatZodError } from '../validation'

const GM_KEY = 'numbahwan-gm-2026'

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

const cardData = { ...cardDatabase } as any

// ADMIN CARD API - For card management (GM mode)

// POST /api/admin/cards - Add new card (Zod-validated)
router.post('/cards', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = CreateCardSchema.safeParse(body)

    if (!parsed.success) {
      logger.warn('Card creation validation failed', { errors: formatZodError(parsed.error) })
      return c.json({ success: false, error: formatZodError(parsed.error), code: 'VALIDATION_ERROR' }, 400)
    }

    const { name, rarity, img, set, reserved, description, gmKey } = parsed.data

    if (gmKey !== GM_KEY) {
      return c.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
    }

    // Generate new ID (max + 1)
    const maxId = Math.max(...cardData.cards.map((c: any) => c.id))
    const newCard = {
      id: maxId + 1,
      name,
      rarity,
      img,
      set,
      reserved,
      description,
    }

    cardData.cards.push(newCard)
    cardData.totalCards = cardData.cards.length

    logger.info('Card created', { cardId: newCard.id, name, rarity })
    return c.json({ success: true, card: newCard })
  } catch (e) {
    const { body, status } = toErrorResponse(e)
    return c.json(body, status as any)
  }
})

// PUT /api/admin/cards/:id - Update card
router.put('/cards/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)
    const body = await c.req.json()
    const { gmKey, ...updates } = body

    if (gmKey !== GM_KEY) {
      return c.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
    }

    const cardIndex = cardData.cards.findIndex((card: any) => card.id === id)
    if (cardIndex === -1) {
      return c.json({ success: false, error: 'Card not found', code: 'NOT_FOUND' }, 404)
    }

    // Update card properties
    Object.assign(cardData.cards[cardIndex], updates)

    logger.info('Card updated', { cardId: id })
    return c.json({ success: true, card: cardData.cards[cardIndex] })
  } catch (e) {
    const { body, status } = toErrorResponse(e)
    return c.json(body, status as any)
  }
})

// DELETE /api/admin/cards/:id - Delete card
router.delete('/cards/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)
    const gmKey = c.req.query('gmKey')

    if (gmKey !== GM_KEY) {
      return c.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
    }

    const cardIndex = cardData.cards.findIndex((card: any) => card.id === id)
    if (cardIndex === -1) {
      return c.json({ success: false, error: 'Card not found', code: 'NOT_FOUND' }, 404)
    }

    const deletedCard = cardData.cards.splice(cardIndex, 1)[0]
    cardData.totalCards = cardData.cards.length

    logger.info('Card deleted', { cardId: id, name: deletedCard.name })
    return c.json({ success: true, deleted: deletedCard })
  } catch (e) {
    const { body, status } = toErrorResponse(e)
    return c.json(body, status as any)
  }
})

// GET /api/admin/cards/export - Export current card database
router.get('/cards/export', (c) => {
  const gmKey = c.req.query('gmKey')

  if (gmKey !== GM_KEY) {
    return c.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
  }

  c.header('Content-Type', 'application/json')
  c.header('Content-Disposition', 'attachment; filename="cards-v2.json"')
  return c.json(cardData)
})

// POST /api/admin/cards/batch - Add multiple cards at once (Zod-validated)
router.post('/cards/batch', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = BatchCreateCardsSchema.safeParse(body)

    if (!parsed.success) {
      logger.warn('Batch card creation validation failed', { errors: formatZodError(parsed.error) })
      return c.json({ success: false, error: formatZodError(parsed.error), code: 'VALIDATION_ERROR' }, 400)
    }

    const { cards, gmKey } = parsed.data

    if (gmKey !== GM_KEY) {
      return c.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
    }

    // ID ranges by rarity for auto-assignment
    const idRanges: Record<string, number> = {
      mythic: 106,
      legendary: 209,
      epic: 309,
      rare: 409,
      uncommon: 531,
      common: 641,
    }

    // Find next available IDs
    cardData.cards.forEach((card: any) => {
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
      const slug = card.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      const img = card.img || `${card.rarity}-${id}-${slug}.jpg`

      const newCard = {
        id,
        name: card.name,
        rarity: card.rarity,
        img,
        set: card.set || 'custom',
        reserved: card.reserved || false,
        description: card.description || '',
      }

      cardData.cards.push(newCard)
      addedCards.push(newCard)
    }

    cardData.totalCards = cardData.cards.length

    logger.info('Batch cards created', { count: addedCards.length, errorCount: errors.length })
    return c.json({
      success: true,
      added: addedCards.length,
      cards: addedCards,
      errors: errors.length > 0 ? errors : undefined,
      total: cardData.totalCards,
    })
  } catch (e) {
    const { body, status } = toErrorResponse(e)
    return c.json(body, status as any)
  }
})

// GET /api/admin/cards/next-ids - Get next available IDs for each rarity
router.get('/cards/next-ids', (c) => {
  const gmKey = c.req.query('gmKey')

  if (gmKey !== GM_KEY) {
    return c.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
  }

  // Base ID ranges
  const idRanges: Record<string, number> = {
    mythic: 106,
    legendary: 209,
    epic: 309,
    rare: 409,
    uncommon: 531,
    common: 641,
  }

  // Find next available IDs
  cardData.cards.forEach((card: any) => {
    const range = idRanges[card.rarity]
    if (range && card.id >= range) {
      idRanges[card.rarity] = Math.max(idRanges[card.rarity], card.id + 1)
    }
  })

  return c.json({
    success: true,
    nextIds: idRanges,
    counts: {
      mythic: cardData.cards.filter((cd: any) => cd.rarity === 'mythic').length,
      legendary: cardData.cards.filter((cd: any) => cd.rarity === 'legendary').length,
      epic: cardData.cards.filter((cd: any) => cd.rarity === 'epic').length,
      rare: cardData.cards.filter((cd: any) => cd.rarity === 'rare').length,
      uncommon: cardData.cards.filter((cd: any) => cd.rarity === 'uncommon').length,
      common: cardData.cards.filter((cd: any) => cd.rarity === 'common').length,
    },
  })
})

// GET /api/card-factory - Card creation helper for AI
router.get('/api/card-factory', (c) => {
  return c.json({
    description: 'Card Factory v2 - Full bleed, likeness-capturing card art',
    version: '2.0.0',

    quickAdd: {
      endpoint: 'POST /api/admin/cards/batch',
      body: {
        gmKey: 'numbahwan-gm-2026',
        cards: [{ name: 'Card Name', rarity: 'epic', description: 'Optional desc' }],
      },
      note: 'ID and image filename auto-generated if not provided',
    },

    imageSettings: {
      model: 'nano-banana-pro',
      aspectRatio: '3:4',
      size: '768x1024',
      fullBleed: true,
    },

    promptStructure: {
      template:
        '[SUBJECT with exact likeness details], [RARITY STYLE], full bleed trading card artwork, edge-to-edge composition, no borders, no card frame, [BACKGROUND], dramatic lighting, ultra detailed, professional TCG illustration',
      likenessCapture: [
        'Exact facial features (eyes, nose, mouth, skin tone)',
        'Exact hair (style, color, length)',
        'Exact outfit (all clothing, colors, patterns)',
        'Exact accessories (weapons, jewelry, armor)',
        'Distinguishing marks (scars, tattoos, glasses, beard)',
      ],
      alwaysInclude: ['full bleed', 'edge-to-edge', 'no borders', 'no card frame'],
      neverInclude: ['card border', 'card frame', 'text overlay', 'white borders'],
    },

    rarityPrompts: {
      mythic:
        '[SUBJECT exact likeness], legendary mythic hero radiating divine power, golden aura and holy light, full bleed TCG artwork edge-to-edge, no borders no frame, epic cosmic purple void with golden swirling energy, dramatic divine backlighting, masterpiece ultra detailed 4k',
      legendary:
        '[SUBJECT exact likeness], powerful legendary warrior with intense elemental aura, full bleed TCG artwork edge-to-edge, no borders no frame, dark gradient with [ELEMENT] energy effects filling frame, dramatic side lighting, professional TCG art 4k',
      epic: '[SUBJECT exact likeness], elite champion in dynamic action with magical energy, full bleed TCG artwork edge-to-edge, no borders no frame, purple gradient with magical particles to all edges, dramatic action lighting, detailed TCG art',
      rare: '[SUBJECT exact likeness], skilled adventurer confident pose with subtle magic, full bleed TCG artwork edge-to-edge, no borders no frame, blue gradient with particles filling frame, balanced lighting',
      uncommon:
        '[SUBJECT exact likeness], capable warrior ready stance, full bleed TCG artwork edge-to-edge, no borders no frame, green gradient filling entire frame, clean lighting',
      common:
        '[SUBJECT exact likeness], basic character, full bleed TCG artwork edge-to-edge, no borders no frame, gray gradient background, standard lighting',
    },

    exampleWithReference: {
      scenario: 'User provides image of character with white beard, sunglasses, brown armor, golden hammer',
      prompt:
        'Character with white beard, cool pixel sunglasses, brown leather armor with golden trim and buckles, wielding large golden glowing hammer with yellow energy aura, stocky heroic build, legendary mythic hero radiating divine power, golden aura and holy light, full bleed trading card artwork edge-to-edge, no borders no card frame, epic cosmic purple void background with golden swirling energy and particles, dramatic divine backlighting with golden rim light, masterpiece TCG illustration ultra detailed 4k',
    },

    imageNaming: '{rarity}-{id}-{slug}.jpg',
    imagePath: '/public/static/cards/',

    nextIds: (() => {
      const ranges: Record<string, number> = {
        mythic: 106,
        legendary: 209,
        epic: 309,
        rare: 409,
        uncommon: 531,
        common: 641,
      }
      cardData.cards.forEach((cd: any) => {
        if (cd.id >= ranges[cd.rarity]) ranges[cd.rarity] = cd.id + 1
      })
      return ranges
    })(),

    workflow: [
      '1. If reference image: Analyze and extract ALL likeness details',
      '2. Build prompt: [likeness details] + [rarity prompt] + full bleed instructions',
      '3. Generate image (nano-banana-pro, 3:4 aspect)',
      '4. Save to /public/static/cards/{rarity}-{id}-{slug}.jpg',
      '5. POST to /api/admin/cards/batch',
      '6. npm run build && pm2 restart numbahwan-guild',
    ],
  })
})
export default router
