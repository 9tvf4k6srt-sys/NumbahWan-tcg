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
  cardId: number;                // Reference to cards.json card
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

type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

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

// ============================================================================
// CARD GENERATION (For Minting Physical Cards)
// ============================================================================

export interface MintRequest {
  cardId: number;        // From cards.json
  rarity: CardRarity;
  quantity: number;
  set: string;
}

export function mintPhysicalCards(
  request: MintRequest,
  cardMetadata: { name: string; description: string; image: string }
): { cards: PhysicalCard[]; claimCodes: { cardId: string; code: string }[] } {
  const cards: PhysicalCard[] = [];
  const claimCodes: { cardId: string; code: string }[] = [];
  const printRun = Math.min(request.quantity, CARD_PRINT_RUNS[request.rarity]);
  
  for (let i = 1; i <= printRun; i++) {
    const physicalId = generateCardId(request.rarity, request.cardId * 1000 + i);
    const claimCode = generateClaimCode();
    
    cards.push({
      id: physicalId,
      cardId: request.cardId,
      serialNumber: i,
      printRun,
      rarity: request.rarity,
      claimCode: hashClaimCode(claimCode),
      status: 'unclaimed',
      mintedAt: Date.now(),
      nwgLocked: CARD_NWG_VALUES[request.rarity],
      metadata: {
        ...cardMetadata,
        set: request.set
      }
    });
    
    claimCodes.push({
      cardId: physicalId,
      code: claimCode  // Store unhashed for printing
    });
  }
  
  return { cards, claimCodes };
}

// ============================================================================
// CARD CLAIMING
// ============================================================================

export interface ClaimResult {
  success: boolean;
  message: string;
  card?: PhysicalCard;
  nwgAwarded?: number;
  isOGHolder?: boolean;
}

export async function claimCard(
  cache: KVNamespace,
  claimCode: string,
  walletAddress: string
): Promise<ClaimResult> {
  const hashedCode = hashClaimCode(claimCode);
  
  // Get all physical cards
  const cardsData = await cache.get(CARD_CACHE_KEYS.PHYSICAL_CARDS);
  const cards: PhysicalCard[] = cardsData ? JSON.parse(cardsData) : [];
  
  // Find card by claim code
  const cardIndex = cards.findIndex(c => c.claimCode === hashedCode);
  if (cardIndex === -1) {
    return { success: false, message: 'Invalid claim code' };
  }
  
  const card = cards[cardIndex];
  
  if (card.status !== 'unclaimed') {
    return { success: false, message: 'Card already claimed' };
  }
  
  // Count total claims (for OG holder bonus)
  const totalClaimed = cards.filter(c => c.status !== 'unclaimed').length;
  const isOGHolder = totalClaimed < 100;
  
  // Update card
  card.status = 'claimed';
  card.ownerId = walletAddress;
  card.claimedAt = Date.now();
  cards[cardIndex] = card;
  
  // Save updated cards
  await cache.put(CARD_CACHE_KEYS.PHYSICAL_CARDS, JSON.stringify(cards));
  
  // Record transfer
  const transfers = await getTransfers(cache);
  transfers.push({
    id: `TRF-${Date.now()}`,
    physicalCardId: card.id,
    fromWallet: 'MINT',
    toWallet: walletAddress,
    transferType: 'claim',
    nwgAmount: card.nwgLocked,
    timestamp: Date.now(),
    txHash: `CLM-${Date.now().toString(36)}`
  });
  await cache.put(CARD_CACHE_KEYS.CARD_TRANSFERS, JSON.stringify(transfers));
  
  // Bonus NWG for claiming
  const bonusNWG = isOGHolder ? card.nwgLocked * 0.1 : 0; // 10% bonus for first 100
  
  return {
    success: true,
    message: isOGHolder 
      ? `🎉 OG Holder! Card claimed + ${bonusNWG} bonus NWG!`
      : `✅ Card claimed! ${card.nwgLocked} NWG locked.`,
    card,
    nwgAwarded: bonusNWG,
    isOGHolder
  };
}

// ============================================================================
// STAKING SYSTEM
// ============================================================================

export async function stakeCard(
  cache: KVNamespace,
  physicalCardId: string,
  walletAddress: string
): Promise<{ success: boolean; message: string; stake?: CardStake }> {
  const cards = await getCards(cache);
  const card = cards.find(c => c.id === physicalCardId);
  
  if (!card) {
    return { success: false, message: 'Card not found' };
  }
  
  if (card.ownerId !== walletAddress) {
    return { success: false, message: 'You do not own this card' };
  }
  
  if (card.status === 'staked') {
    return { success: false, message: 'Card already staked' };
  }
  
  if (card.status === 'listed') {
    return { success: false, message: 'Cannot stake listed card. Cancel listing first.' };
  }
  
  // Get collection for boost calculation
  const collection = await getCollection(cache, walletAddress);
  const boostMultiplier = calculateBoostMultiplier(collection);
  
  const stake: CardStake = {
    id: `STK-${Date.now()}`,
    physicalCardId,
    ownerId: walletAddress,
    stakedAt: Date.now(),
    lastClaimAt: Date.now(),
    totalEarned: 0,
    yieldRate: CARD_YIELD_RATES[card.rarity],
    boostMultiplier
  };
  
  // Update card status
  card.status = 'staked';
  await saveCards(cache, cards);
  
  // Save stake
  const stakes = await getStakes(cache);
  stakes.push(stake);
  await cache.put(CARD_CACHE_KEYS.CARD_STAKES, JSON.stringify(stakes));
  
  return {
    success: true,
    message: `🔒 Card staked! Earning ${stake.yieldRate * boostMultiplier} NWG/day`,
    stake
  };
}

export async function unstakeCard(
  cache: KVNamespace,
  physicalCardId: string,
  walletAddress: string
): Promise<{ success: boolean; message: string; yieldClaimed?: number }> {
  const stakes = await getStakes(cache);
  const stakeIndex = stakes.findIndex(s => s.physicalCardId === physicalCardId);
  
  if (stakeIndex === -1) {
    return { success: false, message: 'Card not staked' };
  }
  
  const stake = stakes[stakeIndex];
  
  if (stake.ownerId !== walletAddress) {
    return { success: false, message: 'You do not own this stake' };
  }
  
  // Calculate final yield
  const pendingYield = calculatePendingYield(stake);
  const totalYield = stake.totalEarned + pendingYield;
  
  // Remove stake
  stakes.splice(stakeIndex, 1);
  await cache.put(CARD_CACHE_KEYS.CARD_STAKES, JSON.stringify(stakes));
  
  // Update card status
  const cards = await getCards(cache);
  const card = cards.find(c => c.id === physicalCardId);
  if (card) {
    card.status = 'claimed';
    await saveCards(cache, cards);
  }
  
  return {
    success: true,
    message: `🔓 Card unstaked! Claimed ${pendingYield} NWG`,
    yieldClaimed: pendingYield
  };
}

export async function claimStakingRewards(
  cache: KVNamespace,
  walletAddress: string
): Promise<{ success: boolean; totalClaimed: number; stakes: CardStake[] }> {
  const stakes = await getStakes(cache);
  const userStakes = stakes.filter(s => s.ownerId === walletAddress);
  
  let totalClaimed = 0;
  
  for (const stake of userStakes) {
    const pending = calculatePendingYield(stake);
    stake.totalEarned += pending;
    stake.lastClaimAt = Date.now();
    totalClaimed += pending;
  }
  
  await cache.put(CARD_CACHE_KEYS.CARD_STAKES, JSON.stringify(stakes));
  
  return {
    success: true,
    totalClaimed,
    stakes: userStakes
  };
}

// ============================================================================
// TRADING SYSTEM
// ============================================================================

export async function listCardForSale(
  cache: KVNamespace,
  physicalCardId: string,
  walletAddress: string,
  priceNWG: number,
  durationDays: number = 7
): Promise<{ success: boolean; message: string; listing?: CardListing }> {
  const cards = await getCards(cache);
  const card = cards.find(c => c.id === physicalCardId);
  
  if (!card || card.ownerId !== walletAddress) {
    return { success: false, message: 'Card not found or not owned' };
  }
  
  if (card.status === 'staked') {
    return { success: false, message: 'Unstake card before listing' };
  }
  
  if (card.status === 'listed') {
    return { success: false, message: 'Card already listed' };
  }
  
  // Minimum price = locked NWG value
  if (priceNWG < card.nwgLocked) {
    return { success: false, message: `Minimum price: ${card.nwgLocked} NWG` };
  }
  
  const listing: CardListing = {
    id: `LST-${Date.now()}`,
    physicalCardId,
    sellerId: walletAddress,
    priceNWG,
    priceUSD: priceNWG * 0.01, // 1 NWG ≈ $0.01
    listedAt: Date.now(),
    expiresAt: Date.now() + (durationDays * 24 * 60 * 60 * 1000),
    status: 'active'
  };
  
  // Update card status
  card.status = 'listed';
  await saveCards(cache, cards);
  
  // Save listing
  const listings = await getListings(cache);
  listings.push(listing);
  await cache.put(CARD_CACHE_KEYS.CARD_LISTINGS, JSON.stringify(listings));
  
  return {
    success: true,
    message: `📢 Card listed for ${priceNWG} NWG`,
    listing
  };
}

export async function buyCard(
  cache: KVNamespace,
  listingId: string,
  buyerWallet: string
): Promise<{ success: boolean; message: string; card?: PhysicalCard }> {
  const listings = await getListings(cache);
  const listingIndex = listings.findIndex(l => l.id === listingId);
  
  if (listingIndex === -1) {
    return { success: false, message: 'Listing not found' };
  }
  
  const listing = listings[listingIndex];
  
  if (listing.status !== 'active') {
    return { success: false, message: 'Listing no longer active' };
  }
  
  if (listing.sellerId === buyerWallet) {
    return { success: false, message: 'Cannot buy your own card' };
  }
  
  if (listing.expiresAt && listing.expiresAt < Date.now()) {
    listing.status = 'cancelled';
    await cache.put(CARD_CACHE_KEYS.CARD_LISTINGS, JSON.stringify(listings));
    return { success: false, message: 'Listing expired' };
  }
  
  // Transfer card
  const cards = await getCards(cache);
  const card = cards.find(c => c.id === listing.physicalCardId);
  
  if (!card) {
    return { success: false, message: 'Card not found' };
  }
  
  // Update ownership
  const previousOwner = card.ownerId;
  card.ownerId = buyerWallet;
  card.status = 'claimed';
  await saveCards(cache, cards);
  
  // Update listing
  listing.status = 'sold';
  listings[listingIndex] = listing;
  await cache.put(CARD_CACHE_KEYS.CARD_LISTINGS, JSON.stringify(listings));
  
  // Record transfer
  const transfers = await getTransfers(cache);
  transfers.push({
    id: `TRF-${Date.now()}`,
    physicalCardId: card.id,
    fromWallet: previousOwner || 'UNKNOWN',
    toWallet: buyerWallet,
    transferType: 'trade',
    nwgAmount: listing.priceNWG,
    timestamp: Date.now(),
    txHash: `TRD-${Date.now().toString(36)}`
  });
  await cache.put(CARD_CACHE_KEYS.CARD_TRANSFERS, JSON.stringify(transfers));
  
  return {
    success: true,
    message: `🎉 Card purchased for ${listing.priceNWG} NWG!`,
    card
  };
}

export async function cancelListing(
  cache: KVNamespace,
  listingId: string,
  walletAddress: string
): Promise<{ success: boolean; message: string }> {
  const listings = await getListings(cache);
  const listing = listings.find(l => l.id === listingId);
  
  if (!listing) {
    return { success: false, message: 'Listing not found' };
  }
  
  if (listing.sellerId !== walletAddress) {
    return { success: false, message: 'Not your listing' };
  }
  
  listing.status = 'cancelled';
  await cache.put(CARD_CACHE_KEYS.CARD_LISTINGS, JSON.stringify(listings));
  
  // Update card status
  const cards = await getCards(cache);
  const card = cards.find(c => c.id === listing.physicalCardId);
  if (card) {
    card.status = 'claimed';
    await saveCards(cache, cards);
  }
  
  return { success: true, message: 'Listing cancelled' };
}

// ============================================================================
// FUSION SYSTEM
// ============================================================================

export async function fuseCards(
  cache: KVNamespace,
  cardIds: string[],
  walletAddress: string,
  targetRarity: CardRarity
): Promise<{ success: boolean; message: string; newCard?: PhysicalCard; burned?: string[] }> {
  // Find recipe
  const recipe = FUSION_RECIPES.find(r => r.outputRarity === targetRarity);
  if (!recipe) {
    return { success: false, message: 'No fusion recipe for target rarity' };
  }
  
  if (cardIds.length !== recipe.inputCount) {
    return { success: false, message: `Need exactly ${recipe.inputCount} cards` };
  }
  
  const cards = await getCards(cache);
  const inputCards = cardIds.map(id => cards.find(c => c.id === id)).filter(Boolean) as PhysicalCard[];
  
  if (inputCards.length !== cardIds.length) {
    return { success: false, message: 'Some cards not found' };
  }
  
  // Verify ownership and rarity
  for (const card of inputCards) {
    if (card.ownerId !== walletAddress) {
      return { success: false, message: `You don't own card ${card.id}` };
    }
    if (card.rarity !== recipe.inputRarity) {
      return { success: false, message: `Card ${card.id} is wrong rarity. Need ${recipe.inputRarity}` };
    }
    if (card.status === 'staked' || card.status === 'listed') {
      return { success: false, message: `Card ${card.id} must be unstaked/unlisted` };
    }
  }
  
  // Roll for success
  const roll = Math.random() * 100;
  const success = roll <= recipe.successRate;
  
  if (!success) {
    // Fusion failed - cards are NOT burned (merciful)
    return {
      success: false,
      message: `💥 Fusion failed! (${recipe.successRate}% chance). Cards preserved.`
    };
  }
  
  // Burn input cards
  for (const card of inputCards) {
    card.status = 'burned';
    card.ownerId = undefined;
  }
  await saveCards(cache, cards);
  
  // Mint new card
  const { cards: newCards, claimCodes } = mintPhysicalCards(
    {
      cardId: 9000 + Math.floor(Math.random() * 1000), // Fusion cards get special IDs
      rarity: targetRarity,
      quantity: 1,
      set: 'fusion'
    },
    {
      name: `Fusion ${targetRarity.charAt(0).toUpperCase() + targetRarity.slice(1)}`,
      description: `Born from the fusion of ${recipe.inputCount} ${recipe.inputRarity} cards`,
      image: `fusion-${targetRarity}.jpg`
    }
  );
  
  // Auto-claim to user
  const newCard = newCards[0];
  newCard.status = 'claimed';
  newCard.ownerId = walletAddress;
  newCard.claimedAt = Date.now();
  
  // Add to cards list
  cards.push(newCard);
  await saveCards(cache, cards);
  
  // Record transfer
  const transfers = await getTransfers(cache);
  transfers.push({
    id: `TRF-${Date.now()}`,
    physicalCardId: newCard.id,
    fromWallet: 'FUSION',
    toWallet: walletAddress,
    transferType: 'fusion',
    nwgAmount: newCard.nwgLocked,
    timestamp: Date.now(),
    txHash: `FSN-${Date.now().toString(36)}`
  });
  await cache.put(CARD_CACHE_KEYS.CARD_TRANSFERS, JSON.stringify(transfers));
  
  return {
    success: true,
    message: `🔥 FUSION SUCCESS! Created ${targetRarity} card worth ${newCard.nwgLocked} NWG!`,
    newCard,
    burned: cardIds
  };
}

// ============================================================================
// COLLECTION & STATS
// ============================================================================

export async function getCollection(cache: KVNamespace, walletAddress: string): Promise<CardCollection> {
  const cards = await getCards(cache);
  const stakes = await getStakes(cache);
  
  const userCards = cards.filter(c => c.ownerId === walletAddress && c.status !== 'burned');
  const userStakes = stakes.filter(s => s.ownerId === walletAddress);
  
  const totalValue = userCards.reduce((sum, c) => sum + c.nwgLocked, 0);
  const pendingYield = userStakes.reduce((sum, s) => sum + calculatePendingYield(s), 0);
  
  // Calculate achievements
  const achievements: string[] = [];
  if (userCards.length >= 10) achievements.push('collector_bronze');
  if (userCards.length >= 25) achievements.push('collector_silver');
  if (userCards.length >= 50) achievements.push('collector_gold');
  if (userCards.length >= 100) achievements.push('collector_platinum');
  
  // Check for all rarities
  const rarities = new Set(userCards.map(c => c.rarity));
  if (rarities.size === 6) achievements.push('rarity_master');
  
  // Check for OG holder
  const firstClaims = cards
    .filter(c => c.claimedAt)
    .sort((a, b) => (a.claimedAt || 0) - (b.claimedAt || 0))
    .slice(0, 100);
  if (firstClaims.some(c => c.ownerId === walletAddress)) {
    achievements.push('og_holder');
  }
  
  return {
    ownerId: walletAddress,
    cards: userCards.map(c => c.id),
    totalValue,
    stakedCount: userStakes.length,
    pendingYield,
    achievements
  };
}

export async function getMarketplaceStats(cache: KVNamespace): Promise<{
  totalCards: number;
  claimedCards: number;
  stakedCards: number;
  listedCards: number;
  totalNWGLocked: number;
  activeListings: number;
  totalVolume: number;
  floorPrices: Record<CardRarity, number>;
}> {
  const cards = await getCards(cache);
  const listings = await getListings(cache);
  const transfers = await getTransfers(cache);
  
  const activeListings = listings.filter(l => l.status === 'active');
  const trades = transfers.filter(t => t.transferType === 'trade');
  
  // Calculate floor prices
  const floorPrices: Record<CardRarity, number> = {
    common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, mythic: 0
  };
  
  for (const rarity of Object.keys(floorPrices) as CardRarity[]) {
    const rarityListings = activeListings.filter(l => {
      const card = cards.find(c => c.id === l.physicalCardId);
      return card?.rarity === rarity;
    });
    if (rarityListings.length > 0) {
      floorPrices[rarity] = Math.min(...rarityListings.map(l => l.priceNWG));
    } else {
      floorPrices[rarity] = CARD_NWG_VALUES[rarity]; // Default to locked value
    }
  }
  
  return {
    totalCards: cards.length,
    claimedCards: cards.filter(c => c.status !== 'unclaimed' && c.status !== 'burned').length,
    stakedCards: cards.filter(c => c.status === 'staked').length,
    listedCards: cards.filter(c => c.status === 'listed').length,
    totalNWGLocked: cards.reduce((sum, c) => c.status !== 'burned' ? sum + c.nwgLocked : sum, 0),
    activeListings: activeListings.length,
    totalVolume: trades.reduce((sum, t) => sum + (t.nwgAmount || 0), 0),
    floorPrices
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getCards(cache: KVNamespace): Promise<PhysicalCard[]> {
  const data = await cache.get(CARD_CACHE_KEYS.PHYSICAL_CARDS);
  return data ? JSON.parse(data) : [];
}

async function saveCards(cache: KVNamespace, cards: PhysicalCard[]): Promise<void> {
  await cache.put(CARD_CACHE_KEYS.PHYSICAL_CARDS, JSON.stringify(cards));
}

async function getStakes(cache: KVNamespace): Promise<CardStake[]> {
  const data = await cache.get(CARD_CACHE_KEYS.CARD_STAKES);
  return data ? JSON.parse(data) : [];
}

async function getListings(cache: KVNamespace): Promise<CardListing[]> {
  const data = await cache.get(CARD_CACHE_KEYS.CARD_LISTINGS);
  return data ? JSON.parse(data) : [];
}

async function getTransfers(cache: KVNamespace): Promise<CardTransfer[]> {
  const data = await cache.get(CARD_CACHE_KEYS.CARD_TRANSFERS);
  return data ? JSON.parse(data) : [];
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Constants
  CARD_NWG_VALUES,
  CARD_YIELD_RATES,
  CARD_PRINT_RUNS,
  FUSION_RECIPES,
  STAKING_BOOSTS,
  
  // Utilities
  generateCardId,
  generateClaimCode,
  hashClaimCode,
  generateQRCodeData,
  calculatePendingYield,
  calculateBoostMultiplier,
  
  // Core functions
  mintPhysicalCards,
  claimCard,
  stakeCard,
  unstakeCard,
  claimStakingRewards,
  listCardForSale,
  buyCard,
  cancelListing,
  fuseCards,
  getCollection,
  getMarketplaceStats
};
