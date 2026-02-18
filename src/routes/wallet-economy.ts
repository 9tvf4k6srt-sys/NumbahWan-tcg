import type { Bindings } from '../types'
import { Hono } from 'hono'
import { IdentifySchema, TransactionSchema, formatZodError } from '../validation'
import { logger } from '../logger'
import { toErrorResponse } from '../errors'


const router = new Hono<{ Bindings: Bindings }>()

// WALLET & ECONOMY API - Identity-Linked Currency System

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

router.post('/register', async (c) => {
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
    ).bind(deviceUUID).first() as Record<string, any> | null;

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
    ).bind(citizenId).first() as Record<string, any> | null;

    if (!wallet) {
      return c.json({ success: false, error: 'Wallet creation failed' }, 500);
    }

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
router.get('/:deviceUUID', async (c) => {
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
    `).bind(deviceUUID).first() as Record<string, any> | null;

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
router.post('/transaction', async (c) => {
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
    ).bind(deviceUUID).first() as Record<string, any> | null;

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

    const currentBalance = Number(citizen[balanceColumn]) || 0;
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
router.get('/transactions/:deviceUUID', async (c) => {
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
    ).bind(deviceUUID).first() as Record<string, any> | null;

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

export default router
