import type { CardRarity } from '../types'
import type { PhysicalCard, CardStake, CardListing, CardTransfer, FusionRecipe, CardCollection } from './card-nwg-bridge-types';
import { CARD_NWG_VALUES, CARD_YIELD_RATES, CARD_PRINT_RUNS, FUSION_RECIPES, STAKING_BOOSTS, CARD_CACHE_KEYS, generateCardId, generateClaimCode, hashClaimCode, generateQRCodeData, calculatePendingYield, calculateBoostMultiplier } from './card-nwg-bridge-types';
export type { PhysicalCard, CardStake, CardListing, CardTransfer, FusionRecipe, CardCollection };
export { CARD_NWG_VALUES, CARD_YIELD_RATES, CARD_PRINT_RUNS, FUSION_RECIPES, STAKING_BOOSTS, CARD_CACHE_KEYS, generateCardId, generateClaimCode, hashClaimCode, generateQRCodeData, calculatePendingYield, calculateBoostMultiplier };

// ── KV Cache Helpers ──────────────────────────────────────────
async function getCards(cache: KVNamespace): Promise<PhysicalCard[]> {
  const raw = await cache.get(CARD_CACHE_KEYS.PHYSICAL_CARDS);
  return raw ? JSON.parse(raw) : [];
}

async function saveCards(cache: KVNamespace, cards: PhysicalCard[]): Promise<void> {
  await cache.put(CARD_CACHE_KEYS.PHYSICAL_CARDS, JSON.stringify(cards));
}

async function getStakes(cache: KVNamespace): Promise<CardStake[]> {
  const raw = await cache.get(CARD_CACHE_KEYS.CARD_STAKES);
  return raw ? JSON.parse(raw) : [];
}

async function getTransfers(cache: KVNamespace): Promise<any[]> {
  const raw = await cache.get(CARD_CACHE_KEYS.CARD_TRANSFERS);
  return raw ? JSON.parse(raw) : [];
}

async function getCollection(cache: KVNamespace, walletAddress: string): Promise<any> {
  const cards = await getCards(cache);
  const ownedCards = cards.filter((c: PhysicalCard) => c.ownerId === walletAddress).map((c: PhysicalCard) => c.id);
  return { ownedCards };
}

// CARD GENERATION (For Minting Physical Cards)

export interface MintRequest {
  cardId: number;        // From cards-v2.json
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

// CARD CLAIMING

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

// STAKING SYSTEM

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

// TRADING SYSTEM

export { listCardForSale, buyCard, cancelListing, fuseCards, getCollection, getMarketplaceStats } from './card-nwg-marketplace';
