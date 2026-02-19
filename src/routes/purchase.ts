import { Hono } from 'hono'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

const router = new Hono<{ Bindings: Bindings }>()

// ============================================================================
// PURCHASE API (Demo Mode)
// ============================================================================

// POST /api/purchase/create-checkout - Create checkout session (Demo)
router.post('/create-checkout', async (c) => {
  try {
    const body = await c.req.json()
    const { package: pkgName, usd, nwg, walletId } = body

    // In demo mode, we just return a flag indicating demo
    // In production, this would create a Stripe checkout session

    // For now, demo mode - will be replaced with real Stripe integration
    return c.json({
      success: true,
      demo: true,
      message: 'Demo mode active. In production, this redirects to Stripe.',
      package: pkgName,
      amount: { usd, nwg },
      walletId,
    })

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
    console.error('Purchase error:', e)
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// GET /api/purchase/verify - Verify purchase after Stripe webhook
router.get('/verify', async (c) => {
  const sessionId = c.req.query('session_id')

  // Demo mode - always succeed
  return c.json({
    success: true,
    demo: true,
    message: 'Payment verification (demo mode)',
    sessionId,
  })
})
export default router
