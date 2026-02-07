import { Hono } from 'hono'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

const router = new Hono<{ Bindings: Bindings }>()

router.get('/api/treasury', async (c) => {
  try {
    const db = c.env?.GUILD_DB;

    if (!db) {
      // Fallback mock data for local dev
      return c.json({
        success: true,
        source: 'mock',
        treasury: {
          totalSupplyNWG: 1000000000,
          circulatingNWG: 5000,
          reserveNWG: 500000000,
          rewardsPoolNWG: 299995000,
          totalCitizens: 50,
          totalTransactions: 500
        }
      });
    }

    const treasury = await db.prepare('SELECT * FROM treasury WHERE id = 1').first();

    return c.json({
      success: true,
      source: 'd1',
      treasury: {
        totalSupplyNWG: treasury.total_supply_nwg,
        circulatingNWG: treasury.circulating_nwg,
        reserveNWG: treasury.reserve_nwg,
        rewardsPoolNWG: treasury.rewards_pool_nwg,
        circulatingNWX: treasury.circulating_nwx,
        burnedNWG: treasury.burned_nwg,
        burnedNWX: treasury.burned_nwx,
        totalCitizens: treasury.total_citizens,
        totalTransactions: treasury.total_transactions,
        totalVolumeNWG: treasury.total_volume_nwg,
        totalVolumeNWX: treasury.total_volume_nwx,
        lastUpdated: treasury.updated_at
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/wallet/daily-reward - Claim daily login reward
router.post('/daily-reward', async (c) => {
  try {
    const db = c.env?.GUILD_DB;
    const body = await c.req.json();
    const { deviceUUID } = body;

    if (!db) {
      return c.json({ success: true, message: 'Local dev mode', reward: { nwg: 10, nwx: 50 } });
    }

    // Get citizen
    const citizen = await db.prepare(
      'SELECT c.id, w.id as wallet_id, w.balance_nwg, w.balance_nwx FROM citizens c JOIN wallets w ON c.id = w.citizen_id WHERE c.device_uuid = ?'
    ).bind(deviceUUID).first();

    if (!citizen) {
      return c.json({ success: false, error: 'Citizen not found' }, 404);
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if already claimed today
    const existing = await db.prepare(
      'SELECT * FROM daily_rewards WHERE citizen_id = ? AND reward_date = ?'
    ).bind(citizen.id, today).first();

    if (existing) {
      return c.json({ success: false, error: 'Already claimed today', nextClaimAt: new Date(Date.now() + 86400000).toISOString() });
    }

    // Get streak
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const yesterdayReward = await db.prepare(
      'SELECT streak_day FROM daily_rewards WHERE citizen_id = ? AND reward_date = ?'
    ).bind(citizen.id, yesterday).first();

    const streakDay = yesterdayReward ? (yesterdayReward.streak_day + 1) : 1;

    // Calculate rewards (increases with streak, caps at day 7)
    const baseNWG = 10;
    const baseNWX = 50;
    const multiplier = Math.min(streakDay, 7);
    const rewardNWG = baseNWG * multiplier;
    const rewardNWX = baseNWX * multiplier;

    // Record daily reward
    await db.prepare(`
      INSERT INTO daily_rewards (citizen_id, reward_date, streak_day, reward_nwg, reward_nwx)
      VALUES (?, ?, ?, ?, ?)
    `).bind(citizen.id, today, streakDay, rewardNWG, rewardNWX).run();

    // Update wallet
    await db.prepare(`
      UPDATE wallets SET
        balance_nwg = balance_nwg + ?,
        balance_nwx = balance_nwx + ?,
        total_earned_nwg = total_earned_nwg + ?,
        total_earned_nwx = total_earned_nwx + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(rewardNWG, rewardNWX, rewardNWG, rewardNWX, citizen.wallet_id).run();

    // Record transaction
    await db.prepare(`
      INSERT INTO transactions (tx_hash, wallet_id, citizen_id, tx_type, currency, amount, balance_before, balance_after, description, source, device_uuid)
      VALUES (?, ?, ?, 'DAILY_LOGIN', 'NWG', ?, ?, ?, ?, 'SYSTEM', ?)
    `).bind(
      generateTxHash(), citizen.wallet_id, citizen.id, rewardNWG,
      citizen.balance_nwg, citizen.balance_nwg + rewardNWG,
      `Day ${streakDay} login bonus`, deviceUUID
    ).run();

    return c.json({
      success: true,
      reward: {
        nwg: rewardNWG,
        nwx: rewardNWX
      },
      streak: {
        day: streakDay,
        multiplier
      },
      newBalance: {
        nwg: citizen.balance_nwg + rewardNWG,
        nwx: citizen.balance_nwx + rewardNWX
      }
    });
  } catch (e) {
    console.error('Daily reward error:', e);
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/wallet/sync - Sync client wallet with server
router.post('/sync', async (c) => {
  try {
    const db = c.env?.GUILD_DB;
    const body = await c.req.json();
    const { deviceUUID, clientWallet, clientVersion } = body;

    if (!db) {
      return c.json({ success: true, message: 'Local dev mode', action: 'use_client' });
    }

    // Get server wallet
    const result = await db.prepare(`
      SELECT w.*, c.trust_score, c.visit_count FROM wallets w
      JOIN citizens c ON w.citizen_id = c.id
      WHERE c.device_uuid = ?
    `).bind(deviceUUID).first();

    if (!result) {
      // No server wallet - client should register
      return c.json({ success: true, action: 'register', message: 'No server wallet found' });
    }

    // Server is authoritative - return server state
    return c.json({
      success: true,
      action: 'sync',
      serverWallet: {
        address: result.wallet_address,
        balance_nwg: result.balance_nwg,
        balance_nwx: result.balance_nwx,
        balance_diamond: result.balance_diamond,
        balance_gold: result.balance_gold,
        balance_iron: result.balance_iron,
        balance_stone: result.balance_stone,
        balance_wood: result.balance_wood,
        lastSync: result.last_sync,
        version: result.version
      },
      trustScore: result.trust_score,
      visitCount: result.visit_count
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});
export default router


