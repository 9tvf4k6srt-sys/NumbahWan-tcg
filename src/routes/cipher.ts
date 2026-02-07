// Cipher Vault — API Routes
// GET  /active       — Current cipher, pot, hints
// POST /attempt      — Submit solution
// GET  /leaderboard  — Hall of fame
// GET  /history      — Past solved ciphers

import { Hono } from 'hono'
import { CIPHER_CONFIG, DIFFICULTY_SETTINGS } from '../services/cipher-types'
import {
  calculatePot, getRevealedHints, getLockedHints, validateAttempt,
  createVault, getActiveVault, saveActiveVault, getLeaderboard,
  addWinner, getHistory, archiveVault, checkRateLimit, recordAttempt
} from '../services/cipher-engine'

type Bindings = { GUILD_DB: D1Database; MARKET_CACHE: KVNamespace }

function jsonError(c: any, msg: string, status = 400) {
  return c.json({ success: false, error: msg }, status)
}

// In-memory fallback when KV is unavailable (local dev)
const memStore = new Map<string, string>()
const memKV: KVNamespace = {
  get: async (key: string) => memStore.get(key) ?? null,
  put: async (key: string, value: string) => { memStore.set(key, value) },
  delete: async (key: string) => { memStore.delete(key) },
  list: async () => ({ keys: [], list_complete: true, cacheStatus: null }),
  getWithMetadata: async () => ({ value: null, metadata: null, cacheStatus: null }),
} as any

function getCache(c: any): KVNamespace {
  return c.env?.MARKET_CACHE || memKV
}

const router = new Hono<{ Bindings: Bindings }>()

// ── GET /active — Current cipher state ───────────────────

router.get('/active', async (c) => {
  try {
    const cache = getCache(c)
    let vault = await getActiveVault(cache)

    // Auto-create first vault if none exists
    if (!vault || vault.status !== 'active') {
      vault = await createVault(0) // Start with Level 1 Caesar
      await saveActiveVault(cache, vault)
    }

    const pot = calculatePot(vault)
    const revealed = getRevealedHints(vault)
    const locked = getLockedHints(vault)
    const daysElapsed = (Date.now() - vault.createdAt) / 86_400_000
    const settings = DIFFICULTY_SETTINGS[vault.difficulty]

    return c.json({
      success: true,
      vault: {
        id: vault.id,
        status: vault.status,
        cipherType: vault.cipherType,
        difficulty: vault.difficulty,
        difficultyLabel: settings?.label || 'Unknown',
        flavorTitle: vault.flavorTitle,
        flavorLore: vault.flavorLore,
        encryptedMessage: vault.encryptedMessage,
        pot: {
          current: pot,
          rate: vault.nwgPerDay,
          unit: 'NWG/day',
        },
        timing: {
          createdAt: vault.createdAt,
          daysElapsed: Math.floor(daysElapsed * 100) / 100,
        },
        hints: {
          revealed,
          locked: locked.map(h => ({ daysUntil: h.daysUntil })),
          totalHints: vault.hints.length,
        },
        stats: {
          totalAttempts: vault.totalAttempts,
          uniqueAttempters: vault.uniqueAttempters.length,
        },
      }
    })
  } catch (e) {
    return jsonError(c, String(e), 500)
  }
})

// ── POST /attempt — Submit a solution ────────────────────

router.post('/attempt', async (c) => {
  try {
    const cache = getCache(c)

    const body = await c.req.json()
    const { wallet, answer, name } = body

    if (!wallet || typeof wallet !== 'string') return jsonError(c, 'wallet is required')
    if (!answer || typeof answer !== 'string') return jsonError(c, 'answer is required')
    if (answer.trim().length < CIPHER_CONFIG.MIN_ANSWER_LENGTH) return jsonError(c, 'Answer too short')
    if (answer.trim().length > CIPHER_CONFIG.MAX_ANSWER_LENGTH) return jsonError(c, 'Answer too long')

    // Rate limit check
    const rateCheck = await checkRateLimit(cache, wallet)
    if (!rateCheck.allowed) {
      const minutes = Math.ceil(rateCheck.retryAfterMs / 60_000)
      return c.json({
        success: false,
        error: `Rate limited. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
        retryAfterMs: rateCheck.retryAfterMs,
      }, 429)
    }

    let vault = await getActiveVault(cache)
    if (!vault || vault.status !== 'active') {
      vault = await createVault(0)
      await saveActiveVault(cache, vault)
    }

    const correct = await validateAttempt(vault, answer.trim())

    // Record attempt (updates rate limit)
    await recordAttempt(cache, wallet, correct)

    // Track stats
    vault.totalAttempts++
    if (!vault.uniqueAttempters.includes(wallet)) {
      vault.uniqueAttempters.push(wallet)
    }

    if (!correct) {
      await saveActiveVault(cache, vault)
      return c.json({
        success: false,
        correct: false,
        message: 'Incorrect. The cipher remains unsolved.',
        attemptsRemaining: Math.max(0, CIPHER_CONFIG.MAX_ATTEMPTS_PER_HOUR - (vault.totalAttempts % CIPHER_CONFIG.MAX_ATTEMPTS_PER_HOUR)),
      })
    }

    // ── WINNER! ──
    const pot = calculatePot(vault)
    const daysElapsed = (Date.now() - vault.createdAt) / 86_400_000

    // Claim the vault
    vault.status = 'claimed'
    vault.claimedBy = wallet
    vault.claimedAt = Date.now()
    vault.claimedAmount = pot

    // Archive solved vault
    await archiveVault(cache, vault)

    // Add to leaderboard
    await addWinner(cache, {
      vaultId: vault.id,
      wallet,
      name: name || wallet.slice(0, 8) + '...',
      amount: pot,
      daysElapsed: Math.floor(daysElapsed * 100) / 100,
      difficulty: vault.difficulty,
      cipherType: vault.cipherType,
      solvedAt: Date.now(),
    })

    // Spawn next vault (next difficulty level, wraps around)
    const nextDifficulty = (vault.difficulty % 5)
    const nextVault = await createVault(nextDifficulty)
    await saveActiveVault(cache, nextVault)

    return c.json({
      success: true,
      correct: true,
      message: `YOU CRACKED THE CIPHER! ${pot} NWG claimed after ${Math.floor(daysElapsed)} days!`,
      prize: {
        amount: pot,
        daysElapsed: Math.floor(daysElapsed * 100) / 100,
        difficulty: vault.difficulty,
        cipherType: vault.cipherType,
        vaultId: vault.id,
      },
      nextVault: {
        id: nextVault.id,
        difficulty: nextVault.difficulty,
        flavorTitle: nextVault.flavorTitle,
        message: 'A new cipher has appeared...',
      }
    })
  } catch (e) {
    return jsonError(c, String(e), 500)
  }
})

// ── GET /leaderboard — Hall of Fame ──────────────────────

router.get('/leaderboard', async (c) => {
  try {
    const cache = getCache(c)
    const board = await getLeaderboard(cache)

    return c.json({
      success: true,
      leaderboard: board,
      totalSolved: board.length,
      totalNwgAwarded: board.reduce((sum, w) => sum + w.amount, 0),
    })
  } catch (e) {
    return jsonError(c, String(e), 500)
  }
})

// ── GET /history — Past solved ciphers (educational) ─────

router.get('/history', async (c) => {
  try {
    const cache = getCache(c)
    const history = await getHistory(cache)

    return c.json({
      success: true,
      history: history.map(v => ({
        id: v.id,
        cipherType: v.cipherType,
        difficulty: v.difficulty,
        difficultyLabel: DIFFICULTY_SETTINGS[v.difficulty]?.label,
        flavorTitle: v.flavorTitle,
        flavorLore: v.flavorLore,
        encryptedMessage: v.encryptedMessage,
        pot: v.claimedAmount,
        claimedBy: v.claimedBy,
        claimedAt: v.claimedAt,
        daysActive: v.claimedAt ? Math.floor(((v.claimedAt - v.createdAt) / 86_400_000) * 100) / 100 : null,
        totalAttempts: v.totalAttempts,
        uniqueAttempters: v.uniqueAttempters.length,
        hints: v.hints,
      })),
      count: history.length,
    })
  } catch (e) {
    return jsonError(c, String(e), 500)
  }
})

export default router
