/**
 * 🃏💰 NWG Card-to-Crypto Bridge
 * 
 * Connect physical cards to digital NWG currency
 * 
 * Features:
 * - Physical Card Registration (QR/NFC claim)
 * - Card Staking (earn passive NWG)
 * - Card Trading (P2P marketplace)
 * - Card Fusion (combine cards)
 * - QR Code Generation
 * - Card Value Calculator
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PhysicalCard {
  id: string;                    // Unique card ID (e.g., "NWG-M-0001")
  cardId: number;                // Reference to cards-v2.json card
  serialNumber: number;          // Print number (e.g., 1 of 100)
  printRun: number;              // Total prints (e.g., 100)
  rarity: CardRarity;
  claimCode: string;             // Unique claim code (hashed)
  status: 'unclaimed' | 'claimed' | 'staked' | 'listed' | 'burned';
  ownerId?: string;              // Current owner's wallet address
  claimedAt?: number;
  mintedAt: number;
  nwgLocked: number;             // NWG value locked in card
  metadata: {
    name: string;
    description: string;
    image: string;
    set: string;
  };
}

export interface CardStake {
  id: string;
  physicalCardId: string;
  ownerId: string;
  stakedAt: number;
  lastClaimAt: number;
  totalEarned: number;
  yieldRate: number;             // NWG per day
  boostMultiplier: number;       // From achievements, combos, etc.
}

export interface CardListing {
  id: string;
  physicalCardId: string;
  sellerId: string;
  priceNWG: number;
  priceUSD?: number;
  listedAt: number;
  expiresAt?: number;
  status: 'active' | 'sold' | 'cancelled';
}

export interface CardTransfer {
  id: string;
  physicalCardId: string;
  fromWallet: string;
  toWallet: string;
  transferType: 'claim' | 'trade' | 'gift' | 'fusion';
  nwgAmount?: number;
  timestamp: number;
  txHash: string;
}

export interface FusionRecipe {
  id: string;
  inputRarity: CardRarity;
  inputCount: number;
  outputRarity: CardRarity;
  nwgCost: number;
  successRate: number;
}

export interface CardCollection {
  ownerId: string;
  cards: string[];               // Physical card IDs
  totalValue: number;            // Total NWG locked
  stakedCount: number;
  pendingYield: number;
  achievements: string[];
}

export type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

// ============================================================================
// CONSTANTS
// ============================================================================

// NWG locked per card rarity
export const CARD_NWG_VALUES: Record<CardRarity, number> = {
  common: 100,
  uncommon: 250,
  rare: 500,
  epic: 2000,
  legendary: 10000,
  mythic: 50000
};

// Daily yield per card rarity (NWG/day)
export const CARD_YIELD_RATES: Record<CardRarity, number> = {
  common: 1,
  uncommon: 3,
  rare: 10,
  epic: 50,
  legendary: 200,
  mythic: 1000
};

// Print runs per rarity
export const CARD_PRINT_RUNS: Record<CardRarity, number> = {
  common: 10000,
  uncommon: 5000,
  rare: 1000,
  epic: 250,
  legendary: 50,
  mythic: 10
};

// Fusion recipes
export const FUSION_RECIPES: FusionRecipe[] = [
  { id: 'f1', inputRarity: 'common', inputCount: 5, outputRarity: 'uncommon', nwgCost: 100, successRate: 100 },
  { id: 'f2', inputRarity: 'uncommon', inputCount: 5, outputRarity: 'rare', nwgCost: 500, successRate: 95 },
  { id: 'f3', inputRarity: 'rare', inputCount: 4, outputRarity: 'epic', nwgCost: 2000, successRate: 85 },
  { id: 'f4', inputRarity: 'epic', inputCount: 3, outputRarity: 'legendary', nwgCost: 10000, successRate: 70 },
  { id: 'f5', inputRarity: 'legendary', inputCount: 2, outputRarity: 'mythic', nwgCost: 50000, successRate: 50 }
];

// Staking boost achievements
export const STAKING_BOOSTS = {
  'collector_bronze': 1.1,      // 10+ cards
  'collector_silver': 1.25,     // 25+ cards
  'collector_gold': 1.5,        // 50+ cards
  'collector_platinum': 2.0,    // 100+ cards
  'full_set': 1.5,              // Complete a set
  'rarity_master': 1.3,         // All rarities owned
  'diamond_hands': 1.2,         // 30+ days staking
  'og_holder': 2.0              // First 100 claimers
};

// Cache keys
export const CARD_CACHE_KEYS = {
  PHYSICAL_CARDS: 'physical_cards',
  CARD_STAKES: 'card_stakes',
  CARD_LISTINGS: 'card_listings',
  CARD_TRANSFERS: 'card_transfers',
  USER_COLLECTIONS: 'user_collections',
  CLAIM_CODES: 'claim_codes'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Generate unique card ID
export function generateCardId(rarity: CardRarity, serialNumber: number): string {
  const rarityCode = rarity.charAt(0).toUpperCase();
  return `NWG-${rarityCode}-${serialNumber.toString().padStart(4, '0')}`;
}

// Generate claim code (for QR codes)
export function generateClaimCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code; // Format: XXXX-XXXX-XXXX-XXXX
}

// Hash claim code for storage (simple hash for demo)
export function hashClaimCode(code: string): string {
  let hash = 0;
  const cleanCode = code.replace(/-/g, '');
  for (let i = 0; i < cleanCode.length; i++) {
    const char = cleanCode.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'CLM' + Math.abs(hash).toString(16).padStart(12, '0');
}

// Generate QR code data URL (returns SVG-based QR placeholder)
export function generateQRCodeData(cardId: string, claimCode: string): object {
  const claimUrl = `https://numbahwan.pages.dev/claim?card=${cardId}&code=${claimCode}`;
  return {
    cardId,
    claimUrl,
    qrContent: claimUrl,
    // In production, use a QR library like 'qrcode' to generate actual QR
    placeholder: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(claimUrl)}`
  };
}

// Calculate pending yield
export function calculatePendingYield(stake: CardStake): number {
  const now = Date.now();
  const daysSinceLastClaim = (now - stake.lastClaimAt) / (1000 * 60 * 60 * 24);
  return Math.floor(stake.yieldRate * daysSinceLastClaim * stake.boostMultiplier);
}

// Calculate collection boost multiplier
export function calculateBoostMultiplier(collection: CardCollection): number {
  let boost = 1.0;
  
  // Card count boosts
  if (collection.cards.length >= 100) boost *= STAKING_BOOSTS.collector_platinum;
  else if (collection.cards.length >= 50) boost *= STAKING_BOOSTS.collector_gold;
  else if (collection.cards.length >= 25) boost *= STAKING_BOOSTS.collector_silver;
  else if (collection.cards.length >= 10) boost *= STAKING_BOOSTS.collector_bronze;
  
  // Achievement boosts
  collection.achievements.forEach(achievement => {
    if (STAKING_BOOSTS[achievement as keyof typeof STAKING_BOOSTS]) {
      boost *= STAKING_BOOSTS[achievement as keyof typeof STAKING_BOOSTS];
    }
  });
  
  return Math.round(boost * 100) / 100;
}

