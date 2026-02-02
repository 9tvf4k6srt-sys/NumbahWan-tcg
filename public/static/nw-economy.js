/**
 * NumbahWan Economy System v1.0
 * The most coveted currency system in gaming
 * 
 * PHILOSOPHY:
 * - Every currency has clear PURPOSE
 * - Every currency leads to CARDS or MERCH
 * - Scarcity creates VALUE
 * - Multiple paths to rewards = engagement
 */

const NW_ECONOMY = {
    // ═══════════════════════════════════════════════════════════════
    // CURRENCY DEFINITIONS
    // ═══════════════════════════════════════════════════════════════
    
    currencies: {
        // ◆ DIAMOND - Premium Currency (Cyan)
        // The "whale" currency - fastest path to everything
        diamond: {
            id: 'diamond',
            name: 'Diamond',
            icon: '◆',
            color: '#00ffff',
            iconPath: '/static/icons/diamond.svg',
            tier: 'premium',
            description: 'Premium currency - the fastest path to everything',
            howToEarn: [
                'Daily login streaks (Day 7: +50)',
                'Achievement milestones',
                'Event rewards',
                'Refer friends (+100 each)',
                'GM gifts'
            ],
            uses: [
                { action: 'Card Pull x1', cost: 10 },
                { action: 'Card Pull x10 (Bonus pull!)', cost: 90 },
                { action: 'Guaranteed Rare+ Pull', cost: 50 },
                { action: 'Pity Reset Skip', cost: 200 },
                { action: 'Convert to 100 Gold', cost: 10 },
                { action: 'Merch Discount 10%', cost: 50 }
            ],
            exchangeRate: { toGold: 10, toIron: 25, toStone: 50 },
            startingAmount: 500,
            dailyEarn: 5, // From daily login
            rarity: 'rare'
        },
        
        // ● GOLD - Standard Currency (Gold)
        // The "grinder" currency - earned through play
        gold: {
            id: 'gold',
            name: 'Gold',
            icon: '●',
            color: '#ffd700',
            iconPath: '/static/icons/gold.svg',
            tier: 'standard',
            description: 'Standard currency - earned through dedication',
            howToEarn: [
                'Daily login (+25)',
                'Complete daily quests (+50-200)',
                'Win card battles (+10-50)',
                'Sell duplicate cards',
                'Achievement rewards',
                'Mini-games in Arcade'
            ],
            uses: [
                { action: 'Card Pull x1', cost: 100 },
                { action: 'Card Pull x10', cost: 900 },
                { action: 'Card Level Up', cost: 50, note: 'per level' },
                { action: 'Reroll Card Stats', cost: 200 },
                { action: 'Convert to 2 Iron', cost: 10 },
                { action: 'Merch: Stickers', cost: 500 }
            ],
            exchangeRate: { toIron: 2, toStone: 5, toDiamond: null },
            startingAmount: 100,
            dailyEarn: 25,
            rarity: 'common'
        },
        
        // ⬡ IRON - Crafting Currency (Silver)
        // The "crafter" currency - for upgrading and forging
        iron: {
            id: 'iron',
            name: 'Iron',
            icon: '⬡',
            color: '#94a3b8',
            iconPath: '/static/icons/iron.svg',
            tier: 'crafting',
            description: 'Crafting currency - power up your collection',
            howToEarn: [
                'Daily login (+10)',
                'Salvage unwanted cards',
                'Complete forge challenges',
                'Weekly boss raids',
                'Trade Stone for Iron'
            ],
            uses: [
                { action: 'Card Upgrade (Common→Rare)', cost: 100 },
                { action: 'Card Upgrade (Rare→Epic)', cost: 250 },
                { action: 'Card Upgrade (Epic→Legendary)', cost: 500 },
                { action: 'Craft Card Frame', cost: 150 },
                { action: 'Craft Card Back', cost: 200 },
                { action: 'Merch: Enamel Pin', cost: 1000 }
            ],
            exchangeRate: { toStone: 2, toGold: null, toDiamond: null },
            startingAmount: 50,
            dailyEarn: 10,
            rarity: 'uncommon'
        },
        
        // ▣ STONE - Foundation Currency (Green)  
        // The "builder" currency - bulk resource
        stone: {
            id: 'stone',
            name: 'Stone',
            icon: '▣',
            color: '#00ff88',
            iconPath: '/static/icons/black-jade.svg',
            tier: 'foundation',
            description: 'Foundation currency - build your empire',
            howToEarn: [
                'Daily login (+50)',
                'Auto-mine every hour',
                'Complete tutorials',
                'Guild activities',
                'Watch replays'
            ],
            uses: [
                { action: 'Unlock Card Slot', cost: 500 },
                { action: 'Expand Deck Size', cost: 1000 },
                { action: 'Reset Daily Quests', cost: 200 },
                { action: 'Convert to 1 Iron', cost: 25 },
                { action: 'Convert to 5 Gold', cost: 100 },
                { action: 'Merch: Digital Wallpaper', cost: 200 }
            ],
            exchangeRate: { toIron: 0.04, toGold: 0.05, toDiamond: null },
            startingAmount: 25,
            dailyEarn: 50,
            rarity: 'common'
        },
        
        // ⧫ SACRED LOG - Ultra Rare Currency (Brown)
        // The "elite" currency - only for true collectors
        wood: {
            id: 'wood',
            name: 'Sacred Log',
            icon: '⧫',
            color: '#c97f3d',
            iconPath: '/static/icons/sacred-log.svg',
            tier: 'legendary',
            description: 'Ultra rare - the mark of a true collector',
            howToEarn: [
                'Pull a Mythic card (+1)',
                '7-day login streak (+1)',
                'Complete card set (+2)',
                'Top 10 weekly leaderboard (+3)',
                'Special events only',
                'NEVER purchasable'
            ],
            uses: [
                { action: 'Guaranteed Mythic Pull', cost: 10, note: '100% Mythic!' },
                { action: 'Legendary Card Selector', cost: 5, note: 'Choose any!' },
                { action: 'Exclusive Merch Access', cost: 3, note: 'Members only items' },
                { action: 'Custom Card Border', cost: 2 },
                { action: 'Profile Title: "Legend"', cost: 1 },
                { action: 'Physical Merch: Hoodie', cost: 15 },
                { action: 'Physical Merch: Art Print', cost: 8 }
            ],
            exchangeRate: {}, // Cannot be exchanged - too precious!
            startingAmount: 0, // Must be EARNED
            dailyEarn: 0, // Only from achievements
            rarity: 'mythic'
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // MERCH PRICING (Dual Currency)
    // ═══════════════════════════════════════════════════════════════
    
    merchPricing: {
        // Category: Digital (Stone/Gold only)
        digital: {
            wallpaper: { usd: 0, stone: 200, name: 'Digital Wallpaper Pack' },
            profileFrame: { usd: 0, gold: 500, name: 'Profile Frame' },
            cardBack: { usd: 0, iron: 200, name: 'Custom Card Back' },
            emote: { usd: 0, gold: 300, name: 'Chat Emote Pack' }
        },
        
        // Category: Small Items (Gold/Diamond)
        small: {
            sticker: { usd: 5, gold: 500, diamond: 50, name: 'Sticker Pack' },
            keychain: { usd: 12, gold: 1200, diamond: 100, name: 'Metal Keychain' },
            pin: { usd: 15, iron: 1000, diamond: 120, name: 'Enamel Pin' },
            lanyard: { usd: 18, gold: 1800, diamond: 150, name: 'Premium Lanyard' }
        },
        
        // Category: Medium Items (Diamond/Sacred Log)
        medium: {
            mug: { usd: 28, diamond: 250, name: 'Ceramic Mug' },
            mousepad: { usd: 35, diamond: 300, name: 'XL Mousepad' },
            beanie: { usd: 42, diamond: 400, wood: 2, name: 'Merino Beanie' },
            pinSet: { usd: 45, diamond: 420, wood: 2, name: 'Pin Collector Set' }
        },
        
        // Category: Premium Items (Sacred Log required)
        premium: {
            tshirt: { usd: 55, diamond: 500, wood: 3, name: 'Premium T-Shirt' },
            artPrint: { usd: 75, diamond: 700, wood: 5, name: 'Signed Art Print' },
            hoodie: { usd: 89, wood: 10, name: 'OG Hoodie' },
            jacket: { usd: 129, wood: 15, name: 'Limited Jacket' }
        },
        
        // Category: Legendary Items (Sacred Log ONLY)
        legendary: {
            framedArt: { usd: 199, wood: 25, name: 'Framed Canvas Art' },
            figurine: { usd: 299, wood: 35, name: 'Limited Figurine' },
            collectorBox: { usd: 499, wood: 50, name: 'Ultimate Collector Box' }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // CARD PULL COSTS
    // ═══════════════════════════════════════════════════════════════
    
    pullCosts: {
        single: {
            diamond: 10,
            gold: 100,
            wood: null // Can't use wood for regular pulls
        },
        tenPull: {
            diamond: 90,  // 10% discount!
            gold: 900,
            wood: null
        },
        guaranteedRare: {
            diamond: 50,
            gold: null, // Diamond only
            wood: null
        },
        guaranteedMythic: {
            diamond: null,
            gold: null,
            wood: 10 // ONLY Sacred Logs!
        },
        legendarySelector: {
            diamond: null,
            gold: null,
            wood: 5 // Choose any Legendary!
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // DAILY REWARDS
    // ═══════════════════════════════════════════════════════════════
    
    dailyRewards: {
        day1: { stone: 50, gold: 25 },
        day2: { stone: 75, gold: 30, iron: 10 },
        day3: { stone: 100, gold: 50, iron: 15 },
        day4: { stone: 125, gold: 75, iron: 20, diamond: 5 },
        day5: { stone: 150, gold: 100, iron: 25, diamond: 10 },
        day6: { stone: 200, gold: 150, iron: 30, diamond: 20 },
        day7: { stone: 300, gold: 200, iron: 50, diamond: 50, wood: 1 } // SACRED LOG!
    },
    
    // ═══════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════
    
    // Get currency info
    getCurrency(id) {
        return this.currencies[id] || null;
    },
    
    // Format currency amount with icon - uses NW_CURRENCY if available
    formatAmount(currencyId, amount) {
        if (typeof NW_CURRENCY !== 'undefined') {
            return NW_CURRENCY.format(currencyId, amount);
        }
        // Fallback
        const currency = this.currencies[currencyId];
        if (!currency) return amount;
        return `${amount.toLocaleString()}`;
    },
    
    // Get all currencies as array
    getAllCurrencies() {
        return Object.values(this.currencies);
    },
    
    // Calculate exchange
    exchange(fromCurrency, toCurrency, amount) {
        const from = this.currencies[fromCurrency];
        if (!from || !from.exchangeRate[`to${toCurrency.charAt(0).toUpperCase() + toCurrency.slice(1)}`]) {
            return null; // Exchange not allowed
        }
        const rate = from.exchangeRate[`to${toCurrency.charAt(0).toUpperCase() + toCurrency.slice(1)}`];
        return Math.floor(amount * rate);
    },
    
    // Get merch price display
    getMerchPrice(category, item) {
        const pricing = this.merchPricing[category]?.[item];
        if (!pricing) return null;
        
        const prices = [];
        const fmt = (type, amt) => typeof NW_CURRENCY !== 'undefined' 
            ? NW_CURRENCY.format(type, amt) 
            : `${amt}`;
        
        if (pricing.usd > 0) prices.push(`$${pricing.usd}`);
        if (pricing.wood) prices.push(fmt('wood', pricing.wood));
        if (pricing.diamond) prices.push(fmt('diamond', pricing.diamond));
        if (pricing.gold) prices.push(fmt('gold', pricing.gold));
        if (pricing.iron) prices.push(fmt('iron', pricing.iron));
        if (pricing.stone) prices.push(fmt('stone', pricing.stone));
        
        return {
            name: pricing.name,
            prices: prices,
            primary: pricing.wood ? fmt('wood', pricing.wood) : 
                     pricing.diamond ? fmt('diamond', pricing.diamond) : 
                     `$${pricing.usd}`
        };
    },
    
    // Check if user can afford
    canAfford(walletBalances, costs) {
        for (const [currency, amount] of Object.entries(costs)) {
            if (amount && (!walletBalances[currency] || walletBalances[currency] < amount)) {
                return false;
            }
        }
        return true;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.NW_ECONOMY = NW_ECONOMY;
}
if (typeof module !== 'undefined') {
    module.exports = NW_ECONOMY;
}

console.log('💰 NW Economy System loaded - The most coveted currencies await!');
