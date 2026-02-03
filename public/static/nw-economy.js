/**
 * NumbahWan Economy System v2.0
 * Simple 3-Tier Currency System
 * 
 * 💵 USD → 💎 NWG → 🪙 Gold → ⧫ Sacred Log (prestige only)
 * 
 * INVESTMENT THESIS:
 * - NWG has FIXED supply (1 billion total)
 * - Clear USD anchor ($1 = 100 NWG)
 * - One-way conversion creates deflation
 * - Sacred Log = non-purchasable prestige
 */

const NW_ECONOMY = {
    version: '2.0.0',
    
    // ═══════════════════════════════════════════════════════════════
    // CORE EXCHANGE RATES (The Foundation of Everything)
    // ═══════════════════════════════════════════════════════════════
    
    rates: {
        USD_TO_NWG: 100,      // $1 = 100 NWG (fixed anchor)
        NWG_TO_GOLD: 10,      // 1 NWG = 10 Gold (one-way)
        // Gold cannot convert back to NWG (deflationary)
        // Sacred Log cannot be exchanged (prestige only)
    },
    
    // Total supply caps
    supply: {
        NWG_TOTAL: 1_000_000_000,  // 1 billion NWG max ever
        NWG_CIRCULATING: 0,        // Tracked in real-time
        NWG_RESERVED: 500_000_000, // 50% locked for future
        NWG_REWARDS_POOL: 300_000_000, // 30% for daily rewards
        NWG_DISTRIBUTED: 200_000_000,  // 20% in circulation
    },
    
    // ═══════════════════════════════════════════════════════════════
    // 3-TIER CURRENCY SYSTEM
    // ═══════════════════════════════════════════════════════════════
    
    currencies: {
        // 💎 NWG - Premium Currency (The Investment)
        nwg: {
            id: 'nwg',
            name: 'NWG',
            fullName: 'NumbahWan Gold',
            icon: '◆',
            color: '#00d4ff',
            iconPath: '/static/icons/nwg.svg',
            tier: 'premium',
            purchasable: true,
            description: {
                en: 'Premium currency - backed by fixed supply economics',
                zh: '高級貨幣 - 固定供應經濟學支撐',
                th: 'สกุลเงินพรีเมียม - หนุนด้วยเศรษฐศาสตร์อุปทานคงที่'
            },
            valueUSD: 0.01, // 1 NWG = $0.01
            howToGet: [
                { method: 'Purchase', detail: '$1 = 100 NWG', icon: '💵' },
                { method: 'Daily Login (Day 7)', detail: '+50 NWG', icon: '📅' },
                { method: 'Achievements', detail: 'Varies', icon: '🏆' },
                { method: 'Referrals', detail: '+100 NWG each', icon: '👥' }
            ],
            uses: [
                { action: 'Card Pull x1', cost: 10 },
                { action: 'Card Pull x10', cost: 90, note: 'Save 10%!' },
                { action: 'Guaranteed Rare+', cost: 50 },
                { action: 'Convert to Gold', cost: 1, note: '= 10 Gold' },
                { action: 'Premium Merch', cost: 'varies' }
            ]
        },
        
        // 🪙 GOLD - Earned Currency (The Grind)
        gold: {
            id: 'gold',
            name: 'Gold',
            fullName: 'Gold',
            icon: '●',
            color: '#ffd700',
            iconPath: '/static/icons/gold.svg',
            tier: 'standard',
            purchasable: false, // Must earn or convert from NWG
            description: {
                en: 'Earned through gameplay - the grinder\'s reward',
                zh: '通過遊戲賺取 - 肝帝的獎勵',
                th: 'ได้จากการเล่น - รางวัลของนักบด'
            },
            valueUSD: 0.001, // 1 Gold = $0.001 (10 Gold = 1 NWG)
            howToGet: [
                { method: 'Daily Login', detail: '+25-200 Gold', icon: '📅' },
                { method: 'Arcade Games', detail: '+10-500 Gold', icon: '🎮' },
                { method: 'Card Battles', detail: '+10-50 Gold', icon: '⚔️' },
                { method: 'Quests', detail: '+50-200 Gold', icon: '📋' },
                { method: 'Convert NWG', detail: '1 NWG = 10 Gold', icon: '💎' }
            ],
            uses: [
                { action: 'Card Pull x1', cost: 100 },
                { action: 'Card Pull x10', cost: 900 },
                { action: 'Card Upgrades', cost: 50, note: 'per level' },
                { action: 'Cosmetics', cost: 'varies' },
                { action: 'Basic Merch', cost: 'varies' }
            ]
        },
        
        // ⧫ SACRED LOG - Prestige Currency (The Flex)
        wood: {
            id: 'wood',
            name: 'Sacred Log',
            fullName: 'Sacred Log',
            icon: '⧫',
            color: '#c97f3d',
            iconPath: '/static/icons/sacred-log.svg',
            tier: 'prestige',
            purchasable: false, // NEVER purchasable
            tradeable: false,   // Cannot be traded
            description: {
                en: 'Ultra rare - proves you\'re a true collector. NEVER purchasable.',
                zh: '超稀有 - 證明你是真正的收藏家。永遠無法購買。',
                th: 'หายากมาก - พิสูจน์ว่าคุณเป็นนักสะสมตัวจริง ซื้อไม่ได้เด็ดขาด'
            },
            valueUSD: null, // Priceless - not for sale
            howToGet: [
                { method: 'Pull Mythic Card', detail: '+1 Log', icon: '🌟' },
                { method: '7-Day Login Streak', detail: '+1 Log', icon: '📅' },
                { method: 'Complete Card Set', detail: '+2 Logs', icon: '🃏' },
                { method: 'Top 10 Leaderboard', detail: '+3 Logs', icon: '🏆' },
                { method: 'Special Events', detail: 'Limited', icon: '🎉' }
            ],
            uses: [
                { action: 'Guaranteed Mythic', cost: 10, note: '100% Mythic!' },
                { action: 'Choose Any Legendary', cost: 5 },
                { action: 'Exclusive Merch Access', cost: 3 },
                { action: 'Custom Card Border', cost: 2 },
                { action: '"Legend" Title', cost: 1 }
            ]
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // PRICING STRUCTURE
    // ═══════════════════════════════════════════════════════════════
    
    // Card Pull Costs
    pullCosts: {
        single: { nwg: 10, gold: 100 },
        tenPull: { nwg: 90, gold: 900 },  // 10% discount
        guaranteedRare: { nwg: 50 },       // NWG only
        guaranteedMythic: { wood: 10 }     // Sacred Log only
    },
    
    // Daily Rewards (7-day cycle)
    dailyRewards: {
        day1: { gold: 50 },
        day2: { gold: 75 },
        day3: { gold: 100, nwg: 5 },
        day4: { gold: 150 },
        day5: { gold: 200, nwg: 10 },
        day6: { gold: 300 },
        day7: { gold: 500, nwg: 50, wood: 1 }  // SACRED LOG on Day 7!
    },
    
    // NWG Purchase Packages
    packages: [
        { id: 'starter', nwg: 500, usd: 4.99, bonus: 0, label: 'Starter' },
        { id: 'value', nwg: 1100, usd: 9.99, bonus: 100, label: 'Best Value', popular: true },
        { id: 'pro', nwg: 2400, usd: 19.99, bonus: 400, label: 'Pro Pack' },
        { id: 'whale', nwg: 6500, usd: 49.99, bonus: 1500, label: 'Whale Pack' },
        { id: 'mega', nwg: 14000, usd: 99.99, bonus: 4000, label: 'Mega Pack', best: true }
    ],
    
    // Merch Pricing (simplified - NWG or Sacred Log)
    merch: {
        digital: {
            wallpaper: { nwg: 50, name: 'Digital Wallpaper' },
            cardBack: { nwg: 100, name: 'Custom Card Back' },
            profileFrame: { gold: 500, name: 'Profile Frame' }
        },
        physical: {
            sticker: { nwg: 200, usd: 5, name: 'Sticker Pack' },
            pin: { nwg: 500, usd: 12, name: 'Enamel Pin' },
            mug: { nwg: 1000, usd: 25, name: 'Ceramic Mug' },
            tshirt: { nwg: 2000, usd: 35, name: 'T-Shirt' },
            hoodie: { wood: 10, usd: 75, name: 'OG Hoodie', exclusive: true }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════
    
    getCurrency(id) {
        // Support old 'diamond' references -> 'nwg'
        if (id === 'diamond') id = 'nwg';
        return this.currencies[id] || null;
    },
    
    formatAmount(currencyId, amount) {
        if (currencyId === 'diamond') currencyId = 'nwg';
        const currency = this.currencies[currencyId];
        if (!currency) return amount.toLocaleString();
        return `${currency.icon} ${amount.toLocaleString()}`;
    },
    
    formatUSD(amount) {
        return `$${amount.toFixed(2)}`;
    },
    
    // Convert NWG to Gold (one-way)
    convertNWGtoGold(nwgAmount) {
        return nwgAmount * this.rates.NWG_TO_GOLD;
    },
    
    // Calculate NWG value in USD
    getNWGValueUSD(nwgAmount) {
        return nwgAmount / this.rates.USD_TO_NWG;
    },
    
    // Get package by ID
    getPackage(id) {
        return this.packages.find(p => p.id === id);
    },
    
    // Check affordability
    canAfford(wallet, costs) {
        for (const [currency, amount] of Object.entries(costs)) {
            const currencyId = currency === 'diamond' ? 'nwg' : currency;
            if (amount && (!wallet[currencyId] || wallet[currencyId] < amount)) {
                return false;
            }
        }
        return true;
    },
    
    // Get all currencies as array
    getAllCurrencies() {
        return Object.values(this.currencies);
    }
};

// Legacy support: diamond -> nwg alias
NW_ECONOMY.currencies.diamond = NW_ECONOMY.currencies.nwg;

// Export
if (typeof window !== 'undefined') {
    window.NW_ECONOMY = NW_ECONOMY;
}

console.log('💰 NW Economy v2.0 - 3-Tier System: NWG → Gold → Sacred Log');
