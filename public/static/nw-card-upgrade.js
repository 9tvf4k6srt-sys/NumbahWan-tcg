/**
 * NumbahWan Card Upgrade System v2.0
 * ==================================
 * UNIFIED WITH NW_ECONOMY - Cards ARE locked NWG
 * 
 * Duplicate cards → Star upgrades → Better stats + Higher NWG value
 * Burn cards → Get NWG + Sacred Logs back (with appreciation)
 * 
 * STAR SYSTEM:
 * - 1★ = Base card (first pull) = Base NWG value
 * - 2★ = Need 1 dupe (2 total) = +25% NWG value
 * - 3★ = Need 2 more dupes (4 total) = +50% NWG value  
 * - 4★ = Need 4 more dupes (8 total) = +100% NWG value
 * - 5★ = Need 8 more dupes (16 total) = +200% NWG value (MAX)
 * 
 * INVESTMENT THESIS:
 * Cards lock NWG + earn passive NWG + can be burned for NWG profit
 */

const NW_UPGRADE = {
    VERSION: '2.0.0',
    
    // Storage key
    STORAGE_KEY: 'nw_card_upgrades',
    
    // Star level requirements (total cards needed)
    STAR_REQUIREMENTS: {
        1: 1,   // Base card
        2: 2,   // +1 dupe
        3: 4,   // +2 more
        4: 8,   // +4 more
        5: 16   // +8 more (MAX)
    },
    
    // Stat multipliers per star level
    STAT_MULTIPLIERS: {
        1: 1.00,  // Base
        2: 1.15,  // +15%
        3: 1.30,  // +30%
        4: 1.50,  // +50%
        5: 1.75   // +75%
    },
    
    // Sacred Log rewards from burning (prestige)
    SACRED_LOG_VALUES: {
        common:    { 1: 0,   2: 0,   3: 0,   4: 1,   5: 2  },
        uncommon:  { 1: 0,   2: 0,   3: 1,   4: 2,   5: 3  },
        rare:      { 1: 0,   2: 1,   3: 2,   4: 3,   5: 5  },
        epic:      { 1: 1,   2: 2,   3: 3,   4: 5,   5: 10 },
        legendary: { 1: 2,   2: 4,   3: 6,   4: 10,  5: 20 },
        mythic:    { 1: 5,   2: 10,  3: 15,  4: 25,  5: 50 }
    },
    
    // NWG value uses NW_ECONOMY.cardValues (single source of truth)
    // This provides backward compatibility for existing code
    BURN_VALUES: {
        // Legacy - redirects to SACRED_LOG_VALUES
        common:    { 1: 0,   2: 0,   3: 0,   4: 1,   5: 2  },
        uncommon:  { 1: 0,   2: 0,   3: 1,   4: 2,   5: 3  },
        rare:      { 1: 0,   2: 1,   3: 2,   4: 3,   5: 5  },
        epic:      { 1: 1,   2: 2,   3: 3,   4: 5,   5: 10 },
        legendary: { 1: 2,   2: 4,   3: 6,   4: 10,  5: 20 },
        mythic:    { 1: 5,   2: 10,  3: 15,  4: 25,  5: 50 }
    },
    
    // In-memory upgrade data
    _data: null,
    
    // ===== INITIALIZATION =====
    init() {
        this._data = this._load();
        console.log('[NW_UPGRADE] v2.0 Initialized -', Object.keys(this._data.cards).length, 'upgraded cards tracked');
        console.log('[NW_UPGRADE] Cards = Locked NWG | Burn = NWG + Sacred Logs');
        return this;
    },
    
    _load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('[NW_UPGRADE] Load error:', e);
        }
        return { cards: {}, totalBurned: 0, totalLogsEarned: 0 };
    },
    
    _save() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._data));
    },
    
    // ===== CORE FUNCTIONS =====
    
    /**
     * Get card's current star level and duplicate count
     * @param {string} cardId - e.g., "s1-001" or "1"
     * @returns {object} { stars: 1-5, dupes: number, canUpgrade: boolean, dupesNeeded: number }
     */
    getCardStatus(cardId) {
        const id = String(cardId);
        const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
        const cardData = this._data.cards[id] || { dupes: 0, stars: 0 };
        
        // Count total copies - check both NW_WALLET (primary) and NW_USER
        let totalCopies = 0;
        
        // Check NW_WALLET first (forge uses this)
        if (typeof NW_WALLET !== 'undefined' && NW_WALLET.wallet?.collection) {
            const walletCard = NW_WALLET.getCardData(numericId) || NW_WALLET.getCardData(id);
            if (walletCard) {
                totalCopies = walletCard.count || 1;
            }
        }
        
        // Fallback to NW_USER if wallet doesn't have it
        if (totalCopies === 0 && typeof NW_USER !== 'undefined' && NW_USER.initialized) {
            totalCopies = NW_USER.collection.getCardCount(id);
        }
        
        // Calculate current star level based on total copies
        let currentStars = 1;
        for (let s = 5; s >= 1; s--) {
            if (totalCopies >= this.STAR_REQUIREMENTS[s]) {
                currentStars = s;
                break;
            }
        }
        
        // If no copies, no stars
        if (totalCopies === 0) currentStars = 0;
        
        // Check if can upgrade
        const nextStar = Math.min(currentStars + 1, 5);
        const dupesNeeded = currentStars < 5 ? this.STAR_REQUIREMENTS[nextStar] - totalCopies : 0;
        const canUpgrade = currentStars < 5 && totalCopies >= this.STAR_REQUIREMENTS[nextStar];
        
        return {
            cardId: id,
            stars: currentStars,
            totalCopies,
            canUpgrade,
            dupesNeeded: Math.max(0, dupesNeeded),
            nextStarAt: currentStars < 5 ? this.STAR_REQUIREMENTS[nextStar] : null,
            isMaxed: currentStars >= 5
        };
    },
    
    /**
     * Upgrade a card to the next star level (consumes duplicates)
     * @param {string} cardId
     * @returns {object} { success, newStars, message }
     */
    upgradeCard(cardId) {
        const status = this.getCardStatus(cardId);
        
        if (status.stars === 0) {
            return { success: false, message: "You don't own this card" };
        }
        
        if (status.isMaxed) {
            return { success: false, message: "Card is already at MAX (5★)" };
        }
        
        if (!status.canUpgrade) {
            return { success: false, message: `Need ${status.dupesNeeded} more copies to upgrade` };
        }
        
        // Perform upgrade - mark as upgraded
        const id = String(cardId);
        if (!this._data.cards[id]) {
            this._data.cards[id] = { stars: 1, upgradedAt: [] };
        }
        
        const newStars = status.stars + 1;
        this._data.cards[id].stars = newStars;
        this._data.cards[id].upgradedAt.push(Date.now());
        this._save();
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('nw-card-upgraded', {
            detail: { cardId: id, oldStars: status.stars, newStars }
        }));
        
        console.log(`[NW_UPGRADE] Card ${id} upgraded to ${newStars}★`);
        
        return {
            success: true,
            oldStars: status.stars,
            newStars,
            message: `Upgraded to ${newStars}★!`
        };
    },
    
    /**
     * Get boosted stats for a card based on star level
     * @param {object} baseStats - { atk, hp, cost, spd, crit, dodge }
     * @param {number} stars - 1-5
     * @returns {object} Boosted stats
     */
    getBoostedStats(baseStats, stars) {
        const multiplier = this.STAT_MULTIPLIERS[stars] || 1;
        
        return {
            atk: Math.round(baseStats.atk * multiplier),
            hp: Math.round(baseStats.hp * multiplier),
            cost: baseStats.cost, // Cost doesn't change
            spd: Math.round((baseStats.spd || 5) * multiplier),
            crit: Math.round((baseStats.crit || 5) * multiplier),
            dodge: Math.round((baseStats.dodge || 5) * multiplier),
            // Meta
            _stars: stars,
            _multiplier: multiplier,
            _boosted: stars > 1
        };
    },
    
    /**
     * Burn a card for Sacred Logs
     * @param {string} cardId
     * @param {string} rarity - common/uncommon/rare/epic/legendary/mythic
     * @param {number} quantity - How many to burn (default 1)
     * @returns {object} { success, logsEarned, message }
     */
    burnCard(cardId, rarity, quantity = 1) {
        const status = this.getCardStatus(cardId);
        
        if (status.totalCopies < quantity) {
            return { success: false, message: `Not enough copies (have ${status.totalCopies})` };
        }
        
        // Can't burn if it would drop below star requirement
        const afterBurn = status.totalCopies - quantity;
        let newStarLevel = 0;
        for (let s = 5; s >= 1; s--) {
            if (afterBurn >= this.STAR_REQUIREMENTS[s]) {
                newStarLevel = s;
                break;
            }
        }
        
        // Warning if burning would reduce stars
        const willReduceStars = newStarLevel < status.stars;
        
        // Calculate rewards (NWG + Sacred Logs)
        const burnPreview = this.getBurnPreview(cardId, rarity, quantity, 0);
        const nwgEarned = burnPreview.nwg;
        const logsEarned = burnPreview.sacredLogs;
        
        // Remove cards from collection - primary: NW_WALLET
        const numericId = parseInt(cardId.replace(/\D/g, ''), 10) || cardId;
        
        if (typeof NW_WALLET !== 'undefined' && NW_WALLET.wallet?.collection) {
            const walletCard = NW_WALLET.wallet.collection[numericId] || NW_WALLET.wallet.collection[cardId];
            if (walletCard) {
                walletCard.count = Math.max(0, (walletCard.count || 1) - quantity);
                if (walletCard.count <= 0) {
                    delete NW_WALLET.wallet.collection[numericId];
                    delete NW_WALLET.wallet.collection[cardId];
                }
                NW_WALLET.saveWallet();
            }
            // Add NWG + Sacred Logs to wallet
            if (nwgEarned > 0) NW_WALLET.earn('nwg', nwgEarned, 'CARD_BURN');
            if (logsEarned > 0) NW_WALLET.earn('wood', logsEarned, 'CARD_BURN');
        } else if (typeof NW_USER !== 'undefined' && NW_USER.initialized) {
            // Fallback to NW_USER
            for (let i = 0; i < quantity; i++) {
                const idx = NW_USER._data.collection.cards.findIndex(c => c.id === cardId);
                if (idx !== -1) {
                    NW_USER._data.collection.cards.splice(idx, 1);
                }
            }
            NW_USER._save();
            if (nwgEarned > 0) NW_USER.wallet.earn('nwg', nwgEarned, 'CARD_BURN');
            if (logsEarned > 0) NW_USER.wallet.earn('wood', logsEarned, 'CARD_BURN');
        }
        
        // Update tracking
        this._data.totalBurned += quantity;
        this._data.totalLogsEarned += logsEarned;
        if (!this._data.totalNWGEarned) this._data.totalNWGEarned = 0;
        this._data.totalNWGEarned += nwgEarned;
        this._save();
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('nw-card-burned', {
            detail: { cardId, quantity, nwgEarned, logsEarned, rarity, newStarLevel }
        }));
        
        console.log(`[NW_UPGRADE] Burned ${quantity}x ${cardId} (${rarity}) for ${nwgEarned} NWG + ${logsEarned} Sacred Logs`);
        
        return {
            success: true,
            nwgEarned,
            logsEarned,
            quantity,
            newStarLevel,
            starsReduced: willReduceStars,
            message: `Burned ${quantity} card(s) for ◆${nwgEarned} NWG${logsEarned > 0 ? ` + ⧫${logsEarned} Sacred Logs` : ''}!`
        };
    },
    
    /**
     * Get NWG value of a card (uses NW_ECONOMY if available)
     * @param {string} rarity 
     * @param {number} stars 
     * @param {number} daysHeld - Days the card has been held
     * @returns {number} NWG value
     */
    getCardNWGValue(rarity, stars = 1, daysHeld = 0) {
        // Use NW_ECONOMY if available (single source of truth)
        if (typeof NW_ECONOMY !== 'undefined' && NW_ECONOMY.cardValues) {
            return NW_ECONOMY.cardValues.calculateCardValue(rarity, stars, 0, daysHeld);
        }
        
        // Fallback values if NW_ECONOMY not loaded
        const baseValues = {
            common: 10, uncommon: 25, rare: 75,
            epic: 200, legendary: 500, mythic: 1500
        };
        const starMult = { 1: 1, 2: 1.25, 3: 1.5, 4: 2, 5: 3 };
        
        return Math.floor((baseValues[rarity] || 10) * (starMult[stars] || 1));
    },
    
    /**
     * Get full burn preview (NWG + Sacred Logs)
     * @param {string} cardId 
     * @param {string} rarity 
     * @param {number} quantity 
     * @param {number} daysHeld
     * @returns {object} { nwg, sacredLogs, total }
     */
    getBurnPreview(cardId, rarity, quantity = 1, daysHeld = 0) {
        const status = this.getCardStatus(cardId);
        const stars = Math.max(1, status.stars);
        
        // NWG from card value + 10% burn premium
        const cardValue = this.getCardNWGValue(rarity, stars, daysHeld);
        const burnPremium = Math.floor(cardValue * 0.10);
        const nwgPerCard = cardValue + burnPremium;
        
        // Sacred Logs
        const logsPerCard = this.SACRED_LOG_VALUES[rarity]?.[stars] || 0;
        
        return {
            nwg: nwgPerCard * quantity,
            sacredLogs: logsPerCard * quantity,
            nwgPerCard,
            logsPerCard,
            cardValue,
            burnPremium,
            quantity
        };
    },
    
    /**
     * Get burn value preview without burning (legacy - returns sacred logs only)
     */
    getBurnValue(cardId, rarity, quantity = 1) {
        const status = this.getCardStatus(cardId);
        const burnValue = this.SACRED_LOG_VALUES[rarity]?.[Math.max(1, status.stars)] || 0;
        return burnValue * quantity;
    },
    
    /**
     * Get daily NWG yield from card staking
     */
    getCardDailyYield(rarity, stars = 1) {
        if (typeof NW_ECONOMY !== 'undefined' && NW_ECONOMY.cardStaking) {
            return NW_ECONOMY.cardStaking.calculateDailyYield(rarity, stars);
        }
        
        // Fallback
        const yields = { common: 0.1, uncommon: 0.25, rare: 0.5, epic: 1, legendary: 2.5, mythic: 5 };
        const starMult = { 1: 1, 2: 1.2, 3: 1.5, 4: 2, 5: 3 };
        return (yields[rarity] || 0.1) * (starMult[stars] || 1);
    },
    
    /**
     * Get APY equivalent for card staking
     */
    getCardAPY(rarity, stars = 1) {
        if (typeof NW_ECONOMY !== 'undefined' && NW_ECONOMY.cardStaking) {
            return NW_ECONOMY.cardStaking.calculateAPY(rarity, stars);
        }
        
        const dailyYield = this.getCardDailyYield(rarity, stars);
        const cardValue = this.getCardNWGValue(rarity, stars);
        return ((dailyYield * 365 / cardValue) * 100).toFixed(1) + '%';
    },
    
    /**
     * Get all cards that can be upgraded
     */
    getUpgradeableCards() {
        if (typeof NW_USER === 'undefined' || !NW_USER.initialized) return [];
        
        const cardIds = [...new Set(NW_USER.collection.cards.map(c => c.id))];
        return cardIds
            .map(id => this.getCardStatus(id))
            .filter(s => s.canUpgrade);
    },
    
    /**
     * Get stats summary
     */
    getStats() {
        return {
            totalBurned: this._data.totalBurned,
            totalLogsEarned: this._data.totalLogsEarned,
            upgradedCards: Object.keys(this._data.cards).length
        };
    },
    
    // ===== UI HELPERS =====
    
    /**
     * Render star display
     */
    renderStars(stars, maxStars = 5) {
        let html = '';
        for (let i = 1; i <= maxStars; i++) {
            if (i <= stars) {
                html += '<span class="star filled">★</span>';
            } else {
                html += '<span class="star empty">☆</span>';
            }
        }
        return html;
    },
    
    /**
     * Get star color
     */
    getStarColor(stars) {
        const colors = {
            1: '#888888',    // Gray
            2: '#22c55e',    // Green
            3: '#3b82f6',    // Blue
            4: '#a855f7',    // Purple
            5: '#ffd700'     // Gold
        };
        return colors[stars] || '#888888';
    },
    
    /**
     * Format stats comparison
     */
    formatStatBoost(baseStat, stars) {
        const boosted = Math.round(baseStat * (this.STAT_MULTIPLIERS[stars] || 1));
        if (stars <= 1) return String(boosted);
        const diff = boosted - baseStat;
        return `${boosted} <span class="stat-boost">(+${diff})</span>`;
    }
};

// Auto-init
window.NW_UPGRADE = NW_UPGRADE;
document.addEventListener('DOMContentLoaded', () => NW_UPGRADE.init());

console.log('[NW_UPGRADE] v1.0 Module loaded');
