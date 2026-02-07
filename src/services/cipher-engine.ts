// Cipher Engine — Generation, validation, pot math, hint logic
// No cron jobs. Pot = rate × elapsed days. Pure math.

import type { CipherVault, CipherHint, CipherWinner, CipherType } from './cipher-types'
import { DIFFICULTY_SETTINGS, CACHE_KEYS } from './cipher-types'

const MS_PER_DAY = 86_400_000

// SHA-256 hash using Web Crypto (available in Workers)
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.toLowerCase().trim())
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Cipher algorithms ────────────────────────────────────

function caesarEncrypt(text: string, shift: number): string {
  return text.split('').map(ch => {
    if (ch >= 'a' && ch <= 'z') return String.fromCharCode(((ch.charCodeAt(0) - 97 + shift) % 26) + 97)
    if (ch >= 'A' && ch <= 'Z') return String.fromCharCode(((ch.charCodeAt(0) - 65 + shift) % 26) + 65)
    return ch
  }).join('')
}

function base64Encode(text: string, layers: number): string {
  let result = text
  for (let i = 0; i < layers; i++) result = btoa(result)
  return result
}

function substitutionEncrypt(text: string, key: string): string {
  const alpha = 'abcdefghijklmnopqrstuvwxyz'
  return text.split('').map(ch => {
    const lower = ch.toLowerCase()
    const idx = alpha.indexOf(lower)
    if (idx === -1) return ch
    const mapped = key[idx]
    return ch === lower ? mapped : mapped.toUpperCase()
  }).join('')
}

function reverseAndCaesar(text: string, shift: number): string {
  return caesarEncrypt(text.split('').reverse().join(''), shift)
}

// ── Pre-built cipher vault templates ─────────────────────

interface CipherTemplate {
  cipherType: CipherType
  difficulty: number
  solution: string
  flavorTitle: string
  flavorLore: string
  encrypt: () => string
  hints: CipherHint[]
}

function getTemplates(): CipherTemplate[] {
  return [
    {
      cipherType: 'caesar',
      difficulty: 1,
      solution: 'maple warrior',
      flavorTitle: 'The Shifted Scroll',
      flavorLore: 'An ancient guild message was found in the Perion archives, encoded by a simple shift cipher. The warriors who wrote it trusted no one.',
      encrypt: () => caesarEncrypt('maple warrior', 7),
      hints: [
        { text: 'This is a Caesar cipher — each letter is shifted by a fixed number.', revealAfterDays: 2 },
        { text: 'The shift value is a single digit, greater than 5.', revealAfterDays: 5 },
        { text: 'Shift = 7. Now just decode the message.', revealAfterDays: 8 },
      ]
    },
    {
      cipherType: 'base64',
      difficulty: 2,
      solution: 'numbahwan guild forever',
      flavorTitle: 'The Layered Archive',
      flavorLore: 'Deep in the guild database, a message was encoded multiple times. Each layer of encoding hides the truth further.',
      encrypt: () => base64Encode('numbahwan guild forever', 3),
      hints: [
        { text: 'The message is Base64 encoded — but more than once.', revealAfterDays: 3 },
        { text: 'It was encoded exactly 3 times. Decode 3 layers.', revealAfterDays: 6 },
        { text: 'The answer is 3 words, all lowercase. Guild-related.', revealAfterDays: 10 },
      ]
    },
    {
      cipherType: 'substitution',
      difficulty: 3,
      solution: 'the sacred log burns eternal',
      flavorTitle: 'The Forbidden Alphabet',
      flavorLore: 'The guild\'s inner circle communicated using a scrambled alphabet. Only those who can reconstruct the mapping will read their secrets.',
      encrypt: () => substitutionEncrypt('the sacred log burns eternal', 'qwertyuiopasdfghjklzxcbnvm'),
      hints: [
        { text: 'This is a substitution cipher. Each letter maps to a different letter.', revealAfterDays: 3 },
        { text: 'The key starts with: q=a, w=b, e=c, r=d, t=e ...', revealAfterDays: 7 },
        { text: 'The mapping follows QWERTY keyboard layout as the cipher alphabet.', revealAfterDays: 12 },
        { text: 'First word is 3 letters. Second word is 6 letters.', revealAfterDays: 16 },
      ]
    },
    {
      cipherType: 'multi-layer',
      difficulty: 4,
      solution: 'reggina watches from beyond',
      flavorTitle: 'The Four Seals',
      flavorLore: 'Protected by four layers of encryption, this message was sealed by the guild founders. Caesar, reverse, Base64, and Caesar again. Only the worthy shall break all four seals.',
      encrypt: () => {
        let msg = 'reggina watches from beyond'
        msg = caesarEncrypt(msg, 3)            // Layer 1: Caesar +3
        msg = msg.split('').reverse().join('') // Layer 2: Reverse
        msg = base64Encode(msg, 1)             // Layer 3: Base64
        msg = caesarEncrypt(msg, 5)            // Layer 4: Caesar +5
        return msg
      },
      hints: [
        { text: 'Four layers of encryption protect this message.', revealAfterDays: 5 },
        { text: 'Layer order: Caesar → Reverse → Base64 → Caesar. Undo in reverse order.', revealAfterDays: 10 },
        { text: 'Outer Caesar shift = 5. Inner Caesar shift = 3.', revealAfterDays: 18 },
        { text: 'The first word is the name of a legendary guild card.', revealAfterDays: 25 },
      ]
    },
    {
      cipherType: 'reverse-caesar',
      difficulty: 5,
      solution: 'only the patient claim the throne',
      flavorTitle: 'The Eternal Cipher',
      flavorLore: 'Hidden for generations. Reversed, shifted, encoded, shifted again, and reversed once more. The guild\'s ultimate secret rewards only the most persistent decoder.',
      encrypt: () => {
        let msg = 'only the patient claim the throne'
        msg = msg.split('').reverse().join('')     // Layer 1: Reverse
        msg = caesarEncrypt(msg, 13)                // Layer 2: ROT13
        msg = base64Encode(msg, 2)                  // Layer 3: Double Base64
        msg = caesarEncrypt(msg, 8)                  // Layer 4: Caesar +8
        msg = msg.split('').reverse().join('')       // Layer 5: Reverse again
        return msg
      },
      hints: [
        { text: 'Five layers. The ultimate test.', revealAfterDays: 7 },
        { text: 'Operations: reverse, shift, encode, shift, reverse.', revealAfterDays: 14 },
        { text: 'Shifts used: ROT13 and Caesar+8. Base64 is doubled.', revealAfterDays: 25 },
        { text: 'The answer is 7 words. It\'s about patience and reward.', revealAfterDays: 35 },
        { text: 'Undo from outside in: reverse → un-Caesar(8) → un-Base64(×2) → un-ROT13 → reverse.', revealAfterDays: 45 },
      ]
    }
  ]
}

// ── Vault lifecycle ──────────────────────────────────────

export function calculatePot(vault: CipherVault): number {
  const elapsed = Date.now() - vault.createdAt
  const days = elapsed / MS_PER_DAY
  return Math.floor(vault.nwgPerDay * days)
}

export function getRevealedHints(vault: CipherVault): CipherHint[] {
  const daysSinceCreation = (Date.now() - vault.createdAt) / MS_PER_DAY
  return vault.hints.filter(h => daysSinceCreation >= h.revealAfterDays)
}

export function getLockedHints(vault: CipherVault): { revealAfterDays: number, daysUntil: number }[] {
  const daysSinceCreation = (Date.now() - vault.createdAt) / MS_PER_DAY
  return vault.hints
    .filter(h => daysSinceCreation < h.revealAfterDays)
    .map(h => ({ revealAfterDays: h.revealAfterDays, daysUntil: Math.ceil(h.revealAfterDays - daysSinceCreation) }))
}

export async function validateAttempt(vault: CipherVault, answer: string): Promise<boolean> {
  const hash = await sha256(answer)
  return hash === vault.solutionHash
}

export async function createVault(templateIndex?: number): Promise<CipherVault> {
  const templates = getTemplates()
  const idx = templateIndex !== undefined ? templateIndex % templates.length : Math.floor(Math.random() * templates.length)
  const t = templates[idx]
  const settings = DIFFICULTY_SETTINGS[t.difficulty]

  return {
    id: `VAULT-${String(idx + 1).padStart(3, '0')}-${Date.now().toString(36)}`,
    status: 'active',
    cipherType: t.cipherType,
    difficulty: t.difficulty,
    encryptedMessage: t.encrypt(),
    solutionHash: await sha256(t.solution),
    nwgPerDay: settings.nwgPerDay,
    createdAt: Date.now(),
    hints: t.hints,
    claimedBy: null,
    claimedAt: null,
    claimedAmount: null,
    totalAttempts: 0,
    uniqueAttempters: [],
    flavorTitle: t.flavorTitle,
    flavorLore: t.flavorLore,
  }
}

// ── KV persistence helpers ───────────────────────────────

export async function getActiveVault(cache: KVNamespace): Promise<CipherVault | null> {
  const raw = await cache.get(CACHE_KEYS.ACTIVE_VAULT)
  return raw ? JSON.parse(raw) : null
}

export async function saveActiveVault(cache: KVNamespace, vault: CipherVault): Promise<void> {
  await cache.put(CACHE_KEYS.ACTIVE_VAULT, JSON.stringify(vault))
}

export async function getLeaderboard(cache: KVNamespace): Promise<CipherWinner[]> {
  const raw = await cache.get(CACHE_KEYS.LEADERBOARD)
  return raw ? JSON.parse(raw) : []
}

export async function addWinner(cache: KVNamespace, winner: CipherWinner): Promise<void> {
  const board = await getLeaderboard(cache)
  board.unshift(winner)
  if (board.length > 50) board.length = 50
  await cache.put(CACHE_KEYS.LEADERBOARD, JSON.stringify(board))
}

export async function getHistory(cache: KVNamespace): Promise<CipherVault[]> {
  const raw = await cache.get(CACHE_KEYS.HISTORY)
  return raw ? JSON.parse(raw) : []
}

export async function archiveVault(cache: KVNamespace, vault: CipherVault): Promise<void> {
  const history = await getHistory(cache)
  history.unshift(vault)
  if (history.length > 20) history.length = 20
  await cache.put(CACHE_KEYS.HISTORY, JSON.stringify(history))
}

export async function checkRateLimit(cache: KVNamespace, wallet: string): Promise<{ allowed: boolean, retryAfterMs: number }> {
  const key = CACHE_KEYS.RATE_LIMIT_PREFIX + wallet
  const raw = await cache.get(key)
  const now = Date.now()

  if (!raw) return { allowed: true, retryAfterMs: 0 }

  const data: { attempts: number[], cooldownUntil: number } = JSON.parse(raw)

  if (data.cooldownUntil > now) {
    return { allowed: false, retryAfterMs: data.cooldownUntil - now }
  }

  const recentAttempts = data.attempts.filter(t => now - t < 3_600_000)
  if (recentAttempts.length >= 10) {
    return { allowed: false, retryAfterMs: Math.max(0, recentAttempts[0] + 3_600_000 - now) }
  }

  return { allowed: true, retryAfterMs: 0 }
}

export async function recordAttempt(cache: KVNamespace, wallet: string, correct: boolean): Promise<void> {
  const key = CACHE_KEYS.RATE_LIMIT_PREFIX + wallet
  const raw = await cache.get(key)
  const now = Date.now()

  let data: { attempts: number[], cooldownUntil: number } = raw
    ? JSON.parse(raw)
    : { attempts: [], cooldownUntil: 0 }

  data.attempts = data.attempts.filter(t => now - t < 3_600_000)
  data.attempts.push(now)

  if (!correct) {
    const recentFails = data.attempts.length
    if (recentFails >= 5 && data.cooldownUntil <= now) {
      data.cooldownUntil = now + 15 * 60 * 1000
    }
  }

  await cache.put(key, JSON.stringify(data), { expirationTtl: 7200 })
}
