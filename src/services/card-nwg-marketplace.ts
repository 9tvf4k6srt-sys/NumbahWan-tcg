import type { CardRarity } from '../types'
import { mintPhysicalCards } from './card-nwg-bridge'
import type { CardListing, CardStake, PhysicalCard } from './card-nwg-bridge-types'
import { CARD_CACHE_KEYS, CARD_NWG_VALUES, calculatePendingYield, FUSION_RECIPES } from './card-nwg-bridge-types'

interface MarketTransfer {
  id: string
  physicalCardId: string
  fromWallet: string
  toWallet: string
  transferType: string
  nwgAmount: number
  timestamp: number
  txHash: string
}

export async function listCardForSale(
  cache: KVNamespace,
  physicalCardId: string,
  walletAddress: string,
  priceNWG: number,
  durationDays: number = 7,
): Promise<{ success: boolean; message: string; listing?: CardListing }> {
  const cards = await getCards(cache)
  const card = cards.find((c) => c.id === physicalCardId)

  if (!card || card.ownerId !== walletAddress) {
    return { success: false, message: 'Card not found or not owned' }
  }

  if (card.status === 'staked') {
    return { success: false, message: 'Unstake card before listing' }
  }

  if (card.status === 'listed') {
    return { success: false, message: 'Card already listed' }
  }

  // Minimum price = locked NWG value
  if (priceNWG < card.nwgLocked) {
    return { success: false, message: `Minimum price: ${card.nwgLocked} NWG` }
  }

  const listing: CardListing = {
    id: `LST-${Date.now()}`,
    physicalCardId,
    sellerId: walletAddress,
    priceNWG,
    priceUSD: priceNWG * 0.01, // 1 NWG ≈ $0.01
    listedAt: Date.now(),
    expiresAt: Date.now() + durationDays * 24 * 60 * 60 * 1000,
    status: 'active',
  }

  // Update card status
  card.status = 'listed'
  await saveCards(cache, cards)

  // Save listing
  const listings = await getListings(cache)
  listings.push(listing)
  await cache.put(CARD_CACHE_KEYS.CARD_LISTINGS, JSON.stringify(listings))

  return {
    success: true,
    message: `📢 Card listed for ${priceNWG} NWG`,
    listing,
  }
}

export async function buyCard(
  cache: KVNamespace,
  listingId: string,
  buyerWallet: string,
): Promise<{ success: boolean; message: string; card?: PhysicalCard }> {
  const listings = await getListings(cache)
  const listingIndex = listings.findIndex((l) => l.id === listingId)

  if (listingIndex === -1) {
    return { success: false, message: 'Listing not found' }
  }

  const listing = listings[listingIndex]

  if (listing.status !== 'active') {
    return { success: false, message: 'Listing no longer active' }
  }

  if (listing.sellerId === buyerWallet) {
    return { success: false, message: 'Cannot buy your own card' }
  }

  if (listing.expiresAt && listing.expiresAt < Date.now()) {
    listing.status = 'cancelled'
    await cache.put(CARD_CACHE_KEYS.CARD_LISTINGS, JSON.stringify(listings))
    return { success: false, message: 'Listing expired' }
  }

  // Transfer card
  const cards = await getCards(cache)
  const card = cards.find((c) => c.id === listing.physicalCardId)

  if (!card) {
    return { success: false, message: 'Card not found' }
  }

  // Update ownership
  const previousOwner = card.ownerId
  card.ownerId = buyerWallet
  card.status = 'claimed'
  await saveCards(cache, cards)

  // Update listing
  listing.status = 'sold'
  listings[listingIndex] = listing
  await cache.put(CARD_CACHE_KEYS.CARD_LISTINGS, JSON.stringify(listings))

  // Record transfer
  const transfers = await getTransfers(cache)
  transfers.push({
    id: `TRF-${Date.now()}`,
    physicalCardId: card.id,
    fromWallet: previousOwner || 'UNKNOWN',
    toWallet: buyerWallet,
    transferType: 'trade',
    nwgAmount: listing.priceNWG,
    timestamp: Date.now(),
    txHash: `TRD-${Date.now().toString(36)}`,
  })
  await cache.put(CARD_CACHE_KEYS.CARD_TRANSFERS, JSON.stringify(transfers))

  return {
    success: true,
    message: `🎉 Card purchased for ${listing.priceNWG} NWG!`,
    card,
  }
}

export async function cancelListing(
  cache: KVNamespace,
  listingId: string,
  walletAddress: string,
): Promise<{ success: boolean; message: string }> {
  const listings = await getListings(cache)
  const listing = listings.find((l) => l.id === listingId)

  if (!listing) {
    return { success: false, message: 'Listing not found' }
  }

  if (listing.sellerId !== walletAddress) {
    return { success: false, message: 'Not your listing' }
  }

  listing.status = 'cancelled'
  await cache.put(CARD_CACHE_KEYS.CARD_LISTINGS, JSON.stringify(listings))

  // Update card status
  const cards = await getCards(cache)
  const card = cards.find((c) => c.id === listing.physicalCardId)
  if (card) {
    card.status = 'claimed'
    await saveCards(cache, cards)
  }

  return { success: true, message: 'Listing cancelled' }
}

// FUSION SYSTEM

export async function fuseCards(
  cache: KVNamespace,
  cardIds: string[],
  walletAddress: string,
  targetRarity: CardRarity,
): Promise<{ success: boolean; message: string; newCard?: PhysicalCard; burned?: string[] }> {
  // Find recipe
  const recipe = FUSION_RECIPES.find((r) => r.outputRarity === targetRarity)
  if (!recipe) {
    return { success: false, message: 'No fusion recipe for target rarity' }
  }

  if (cardIds.length !== recipe.inputCount) {
    return { success: false, message: `Need exactly ${recipe.inputCount} cards` }
  }

  const cards = await getCards(cache)
  const inputCards = cardIds.map((id) => cards.find((c) => c.id === id)).filter(Boolean) as PhysicalCard[]

  if (inputCards.length !== cardIds.length) {
    return { success: false, message: 'Some cards not found' }
  }

  // Verify ownership and rarity
  for (const card of inputCards) {
    if (card.ownerId !== walletAddress) {
      return { success: false, message: `You don't own card ${card.id}` }
    }
    if (card.rarity !== recipe.inputRarity) {
      return { success: false, message: `Card ${card.id} is wrong rarity. Need ${recipe.inputRarity}` }
    }
    if (card.status === 'staked' || card.status === 'listed') {
      return { success: false, message: `Card ${card.id} must be unstaked/unlisted` }
    }
  }

  // Roll for success
  const roll = Math.random() * 100
  const success = roll <= recipe.successRate

  if (!success) {
    // Fusion failed - cards are NOT burned (merciful)
    return {
      success: false,
      message: `💥 Fusion failed! (${recipe.successRate}% chance). Cards preserved.`,
    }
  }

  // Burn input cards
  for (const card of inputCards) {
    card.status = 'burned'
    card.ownerId = undefined
  }
  await saveCards(cache, cards)

  // Mint new card
  const { cards: newCards, claimCodes: _claimCodes } = mintPhysicalCards(
    {
      cardId: 9000 + Math.floor(Math.random() * 1000), // Fusion cards get special IDs
      rarity: targetRarity,
      quantity: 1,
      set: 'fusion',
    },
    {
      name: `Fusion ${targetRarity.charAt(0).toUpperCase() + targetRarity.slice(1)}`,
      description: `Born from the fusion of ${recipe.inputCount} ${recipe.inputRarity} cards`,
      image: `fusion-${targetRarity}.jpg`,
    },
  )

  // Auto-claim to user
  const newCard = newCards[0]
  newCard.status = 'claimed'
  newCard.ownerId = walletAddress
  newCard.claimedAt = Date.now()

  // Add to cards list
  cards.push(newCard)
  await saveCards(cache, cards)

  // Record transfer
  const transfers = await getTransfers(cache)
  transfers.push({
    id: `TRF-${Date.now()}`,
    physicalCardId: newCard.id,
    fromWallet: 'FUSION',
    toWallet: walletAddress,
    transferType: 'fusion',
    nwgAmount: newCard.nwgLocked,
    timestamp: Date.now(),
    txHash: `FSN-${Date.now().toString(36)}`,
  })
  await cache.put(CARD_CACHE_KEYS.CARD_TRANSFERS, JSON.stringify(transfers))

  return {
    success: true,
    message: `🔥 FUSION SUCCESS! Created ${targetRarity} card worth ${newCard.nwgLocked} NWG!`,
    newCard,
    burned: cardIds,
  }
}

// COLLECTION & STATS

export async function getCollection(cache: KVNamespace, walletAddress: string): Promise<any> {
  const cards = await getCards(cache)
  const stakes = await getStakes(cache)

  const userCards = cards.filter((c) => c.ownerId === walletAddress && c.status !== 'burned')
  const userStakes = stakes.filter((s) => s.ownerId === walletAddress)

  const totalValue = userCards.reduce((sum, c) => sum + c.nwgLocked, 0)
  const pendingYield = userStakes.reduce((sum, s) => sum + calculatePendingYield(s), 0)

  // Calculate achievements
  const achievements: string[] = []
  if (userCards.length >= 10) achievements.push('collector_bronze')
  if (userCards.length >= 25) achievements.push('collector_silver')
  if (userCards.length >= 50) achievements.push('collector_gold')
  if (userCards.length >= 100) achievements.push('collector_platinum')

  // Check for all rarities
  const rarities = new Set(userCards.map((c) => c.rarity))
  if (rarities.size === 6) achievements.push('rarity_master')

  // Check for OG holder
  const firstClaims = cards
    .filter((c) => c.claimedAt)
    .sort((a, b) => (a.claimedAt || 0) - (b.claimedAt || 0))
    .slice(0, 100)
  if (firstClaims.some((c) => c.ownerId === walletAddress)) {
    achievements.push('og_holder')
  }

  return {
    ownerId: walletAddress,
    cards: userCards.map((c) => c.id),
    totalValue,
    stakedCount: userStakes.length,
    pendingYield,
    achievements,
  }
}

export async function getMarketplaceStats(cache: KVNamespace): Promise<{
  totalCards: number
  claimedCards: number
  stakedCards: number
  listedCards: number
  totalNWGLocked: number
  activeListings: number
  totalVolume: number
  floorPrices: Record<CardRarity, number>
}> {
  const cards = await getCards(cache)
  const listings = await getListings(cache)
  const transfers = await getTransfers(cache)

  const activeListings = listings.filter((l) => l.status === 'active')
  const trades = transfers.filter((t) => t.transferType === 'trade')

  // Calculate floor prices
  const floorPrices: Record<CardRarity, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
    mythic: 0,
  }

  for (const rarity of Object.keys(floorPrices) as CardRarity[]) {
    const rarityListings = activeListings.filter((l) => {
      const card = cards.find((c) => c.id === l.physicalCardId)
      return card?.rarity === rarity
    })
    if (rarityListings.length > 0) {
      floorPrices[rarity] = Math.min(...rarityListings.map((l) => l.priceNWG))
    } else {
      floorPrices[rarity] = CARD_NWG_VALUES[rarity] // Default to locked value
    }
  }

  return {
    totalCards: cards.length,
    claimedCards: cards.filter((c) => c.status !== 'unclaimed' && c.status !== 'burned').length,
    stakedCards: cards.filter((c) => c.status === 'staked').length,
    listedCards: cards.filter((c) => c.status === 'listed').length,
    totalNWGLocked: cards.reduce((sum, c) => (c.status !== 'burned' ? sum + c.nwgLocked : sum), 0),
    activeListings: activeListings.length,
    totalVolume: trades.reduce((sum, t) => sum + (t.nwgAmount || 0), 0),
    floorPrices,
  }
}

// HELPER FUNCTIONS

async function getCards(cache: KVNamespace): Promise<PhysicalCard[]> {
  const data = await cache.get(CARD_CACHE_KEYS.PHYSICAL_CARDS)
  return data ? JSON.parse(data) : []
}

async function saveCards(cache: KVNamespace, cards: PhysicalCard[]): Promise<void> {
  await cache.put(CARD_CACHE_KEYS.PHYSICAL_CARDS, JSON.stringify(cards))
}

async function getStakes(cache: KVNamespace): Promise<CardStake[]> {
  const data = await cache.get(CARD_CACHE_KEYS.CARD_STAKES)
  return data ? JSON.parse(data) : []
}

async function getListings(cache: KVNamespace): Promise<CardListing[]> {
  const data = await cache.get(CARD_CACHE_KEYS.CARD_LISTINGS)
  return data ? JSON.parse(data) : []
}

async function getTransfers(cache: KVNamespace): Promise<MarketTransfer[]> {
  const data = await cache.get(CARD_CACHE_KEYS.CARD_TRANSFERS)
  return data ? JSON.parse(data) : []
}

// DEFAULT EXPORT
