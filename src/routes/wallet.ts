// Wallet API Routes
// Split from index.tsx for maintainability

import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
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

// POST /register - Register citizen and create wallet
router.post('/register', async (c) => {
  const { env } = c
  const { deviceUUID, deviceHash, trustScore, spoofFlags } = await c.req.json()
  
  if (!deviceUUID || !deviceHash) {
    return c.json({ error: 'Missing required fields' }, 400)
  }
  
  try {
    // Check if citizen exists
    const existing = await env.DB.prepare(
      'SELECT * FROM citizens WHERE device_uuid = ?'
    ).bind(deviceUUID).first()
    
    if (existing) {
      // Update last seen
      await env.DB.prepare(
        'UPDATE citizens SET last_seen = CURRENT_TIMESTAMP, visit_count = visit_count + 1 WHERE device_uuid = ?'
      ).bind(deviceUUID).run()
      
      // Get wallet
      const wallet = await env.DB.prepare(
        'SELECT * FROM wallets WHERE citizen_id = ?'
      ).bind(existing.id).first()
      
      return c.json({ citizen: existing, wallet, isNew: false })
    }
    
    // Create new citizen
    const citizenResult = await env.DB.prepare(`
      INSERT INTO citizens (device_uuid, device_hash, trust_score, spoof_flags)
      VALUES (?, ?, ?, ?)
    `).bind(deviceUUID, deviceHash, trustScore || 50, JSON.stringify(spoofFlags || [])).run()
    
    const citizenId = citizenResult.meta.last_row_id
    
    // Generate wallet address
    const walletAddress = `NW-W-${deviceUUID.substring(3, 11)}`
    
    // Create wallet with starting balances
    await env.DB.prepare(`
      INSERT INTO wallets (citizen_id, wallet_address, balance_diamond, balance_gold, balance_iron, balance_stone, balance_wood)
      VALUES (?, ?, 50, 25, 10, 5, 0)
    `).bind(citizenId, walletAddress).run()
    
    const newCitizen = await env.DB.prepare('SELECT * FROM citizens WHERE id = ?').bind(citizenId).first()
    const newWallet = await env.DB.prepare('SELECT * FROM wallets WHERE citizen_id = ?').bind(citizenId).first()
    
    return c.json({ citizen: newCitizen, wallet: newWallet, isNew: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /:deviceUUID - Get wallet by device UUID
router.get('/:deviceUUID', async (c) => {
  const { env } = c
  const deviceUUID = c.req.param('deviceUUID')
  
  try {
    const citizen = await env.DB.prepare(
      'SELECT * FROM citizens WHERE device_uuid = ?'
    ).bind(deviceUUID).first()
    
    if (!citizen) {
      return c.json({ error: 'Citizen not found' }, 404)
    }
    
    const wallet = await env.DB.prepare(
      'SELECT * FROM wallets WHERE citizen_id = ?'
    ).bind(citizen.id).first()
    
    return c.json({ citizen, wallet })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /transaction - Record transaction
router.post('/transaction', async (c) => {
  const { env } = c
  const { deviceUUID, type, currency, amount, description, reference } = await c.req.json()
  
  if (!deviceUUID || !type || !currency || amount === undefined) {
    return c.json({ error: 'Missing required fields' }, 400)
  }
  
  try {
    const citizen = await env.DB.prepare(
      'SELECT id FROM citizens WHERE device_uuid = ?'
    ).bind(deviceUUID).first()
    
    if (!citizen) {
      return c.json({ error: 'Citizen not found' }, 404)
    }
    
    const wallet = await env.DB.prepare(
      'SELECT * FROM wallets WHERE citizen_id = ?'
    ).bind(citizen.id).first()
    
    if (!wallet) {
      return c.json({ error: 'Wallet not found' }, 404)
    }
    
    const balanceField = `balance_${currency}`
    const currentBalance = (wallet as any)[balanceField] || 0
    
    // Check sufficient balance for spend
    if (type === 'spend' && currentBalance < amount) {
      return c.json({ error: 'Insufficient balance', current: currentBalance }, 400)
    }
    
    const newBalance = type === 'earn' ? currentBalance + amount : currentBalance - amount
    
    // Update balance
    await env.DB.prepare(
      `UPDATE wallets SET ${balanceField} = ?, updated_at = CURRENT_TIMESTAMP WHERE citizen_id = ?`
    ).bind(newBalance, citizen.id).run()
    
    // Record transaction
    await env.DB.prepare(`
      INSERT INTO wallet_transactions (wallet_id, type, currency, amount, balance_after, description, reference_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(wallet.id, type, currency, amount, newBalance, description || '', reference || '').run()
    
    return c.json({ success: true, newBalance, currency })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /transactions/:deviceUUID - Get transaction history
router.get('/transactions/:deviceUUID', async (c) => {
  const { env } = c
  const deviceUUID = c.req.param('deviceUUID')
  const limit = parseInt(c.req.query('limit') || '50')
  
  try {
    const citizen = await env.DB.prepare(
      'SELECT id FROM citizens WHERE device_uuid = ?'
    ).bind(deviceUUID).first()
    
    if (!citizen) {
      return c.json({ error: 'Citizen not found' }, 404)
    }
    
    const wallet = await env.DB.prepare(
      'SELECT id FROM wallets WHERE citizen_id = ?'
    ).bind(citizen.id).first()
    
    if (!wallet) {
      return c.json({ error: 'Wallet not found' }, 404)
    }
    
    const transactions = await env.DB.prepare(`
      SELECT * FROM wallet_transactions 
      WHERE wallet_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).bind(wallet.id, limit).all()
    
    return c.json({ transactions: transactions.results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default router
