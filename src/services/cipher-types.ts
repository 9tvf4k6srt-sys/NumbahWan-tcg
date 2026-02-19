// Cipher Vault — Types & Constants
// The longer it goes unsolved, the bigger the prize

export interface CipherVault {
  id: string
  status: 'active' | 'claimed'
  cipherType: CipherType
  difficulty: number
  encryptedMessage: string
  solutionHash: string
  nwgPerDay: number
  createdAt: number
  hints: CipherHint[]
  claimedBy: string | null
  claimedAt: number | null
  claimedAmount: number | null
  totalAttempts: number
  uniqueAttempters: string[]
  flavorTitle: string
  flavorLore: string
}

export interface CipherHint {
  text: string
  revealAfterDays: number
}

export interface CipherAttempt {
  wallet: string
  answer: string
  timestamp: number
  correct: boolean
}

export interface CipherWinner {
  vaultId: string
  wallet: string
  name: string
  amount: number
  daysElapsed: number
  difficulty: number
  cipherType: CipherType
  solvedAt: number
}

export type CipherType = 'caesar' | 'base64' | 'substitution' | 'multi-layer' | 'reverse-caesar'

export const CIPHER_CONFIG = {
  MAX_ATTEMPTS_PER_HOUR: 10,
  COOLDOWN_MS: 15 * 60 * 1000,
  COOLDOWN_AFTER_FAILS: 5,
  MIN_ANSWER_LENGTH: 3,
  MAX_ANSWER_LENGTH: 100,
} as const

export const DIFFICULTY_SETTINGS: Record<number, { nwgPerDay: number; label: string }> = {
  1: { nwgPerDay: 25, label: 'Novice' },
  2: { nwgPerDay: 50, label: 'Apprentice' },
  3: { nwgPerDay: 100, label: 'Adept' },
  4: { nwgPerDay: 250, label: 'Master' },
  5: { nwgPerDay: 500, label: 'Legendary' },
}

export const CACHE_KEYS = {
  ACTIVE_VAULT: 'cipher:active',
  ATTEMPTS: 'cipher:attempts',
  LEADERBOARD: 'cipher:leaderboard',
  HISTORY: 'cipher:history',
  RATE_LIMIT_PREFIX: 'cipher:rate:',
} as const
