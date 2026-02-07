import { Hono } from 'hono'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

const router = new Hono<{ Bindings: Bindings }>()

// ============================================================================
// GM VERIFICATION API - Server-Side GM Status Check
// ============================================================================
// Verifies if a guest ID is a Game Master. GMs get infinite resources.
// ============================================================================

// GM Whitelist - Add Guest IDs here
const GM_WHITELIST = [
  // Owner/Admin accounts - These IDs get auto-GM status
  // Add your Guest ID here (visible on /wallet page)
];

// GM Key for activation
const GM_ACTIVATION_KEY = 'numbahwan-gm-2026';

router.get('/verify/:guestId', async (c) => {
  const guestId = c.req.param('guestId');
  const gmKey = c.req.query('key');
  
  // Check whitelist
  const inWhitelist = GM_WHITELIST.includes(guestId);
  
  // Check if valid GM key provided
  const hasValidKey = gmKey === GM_ACTIVATION_KEY;
  
  return c.json({
    success: true,
    guestId,
    isGM: inWhitelist || hasValidKey,
    method: inWhitelist ? 'whitelist' : hasValidKey ? 'key' : 'none',
    features: inWhitelist || hasValidKey ? {
      infiniteResources: true,
      adminPanel: true,
      testMode: true
    } : null
  });
});

// Activate GM via API
router.post('/activate', async (c) => {
  try {
    const body = await c.req.json();
    const { guestId, key } = body;
    
    if (key !== GM_ACTIVATION_KEY) {
      return c.json({
        success: false,
        error: 'Invalid activation key'
      }, 401);
    }
    
    return c.json({
      success: true,
      guestId,
      isGM: true,
      message: 'GM mode activated! You now have infinite resources.',
      features: {
        infiniteResources: true,
        adminPanel: true,
        testMode: true
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

export default router
