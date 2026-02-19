import { Hono } from 'hono'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

const router = new Hono<{ Bindings: Bindings }>()

// ============================================================================
// AVATAR STUDIO API - MapleStory Avatar Generation
// ============================================================================

// POST /api/avatar/generate - Generate avatar art from screenshot
router.post('/generate', async (c) => {
  try {
    const body = await c.req.json()
    const { image, pose, prompt: _prompt } = body

    if (!image || !pose) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: image and pose',
        },
        400,
      )
    }

    // In production, this would call the AI image generation API
    // For now, return a demo response
    //
    // Production implementation would:
    // 1. Upload image to temporary storage
    // 2. Call nano-banana-pro model with the prompt
    // 3. Return generated image URL

    const poseDescriptions: Record<string, string> = {
      hero: 'heroic battle stance',
      cute: 'adorable kawaii pose',
      cool: 'relaxed cool stance',
      victory: 'victory celebration',
      magic: 'casting magical spell',
      action: 'dynamic action pose',
      relaxed: 'peaceful relaxed pose',
      party: 'festive party pose',
    }

    return c.json({
      success: true,
      message: 'Avatar generation queued',
      requestId: `avatar-${Date.now()}`,
      pose: pose,
      poseDescription: poseDescriptions[pose] || pose,
      // In production: imageUrl would be the generated image
      imageUrl: image, // For demo, return the input image
      status: 'demo_mode',
      note: 'Connect to AI generation service for actual avatar creation',
    })
  } catch (e) {
    return c.json(
      {
        success: false,
        error: String(e),
      },
      500,
    )
  }
})

// GET /api/avatar/poses - Get available poses
router.get('/poses', (c) => {
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
      { id: 'party', name: 'Party Time!', emoji: '🎉', description: 'Dancing celebration' },
    ],
  })
})

// GET /api/avatar/components - Get avatar component library
router.get('/components', async (c) => {
  try {
    // Load from the components JSON file
    const components = await import('../../public/static/data/avatar-components.json')
    return c.json({
      success: true,
      ...components,
    })
  } catch (_e) {
    return c.json({
      success: false,
      error: 'Could not load components',
      fallback: {
        slots: ['hat', 'hair', 'eyewear', 'face', 'costume', 'weapon', 'skin', 'background'],
        note: 'Load avatar-components.json for full data',
      },
    })
  }
})
export default router
