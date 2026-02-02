/* NW_FORGE - Gacha/Forge Engine v1.0
   Core gacha logic extracted from forge.html
   Handles: Pull rates, pity system, card pool management
*/

const NW_FORGE = {
    // Config
    CARDS: [],
    initialized: false,
    
    // Pull rates by rarity
    RATES: {
        mythic: 0.0001,     // 0.01%
        legendary: 0.01,    // 1%
        epic: 0.08,         // 8%
        rare: 0.20,         // 20%
        uncommon: 0.30,     // 30%
        common: 0.4099      // ~41%
    },
    
    // Pity system
    PITY: {
        mythic: { soft: 150, hard: 200 },
        legendary: { soft: 50, hard: 80 },
        epic: { soft: 15, hard: 25 }
    },
    
    // State
    state: {
        pityCounters: { mythic: 0, legendary: 0, epic: 0 },
        totalPulls: 0,
        history: []
    },
    
    // Event callbacks
    _callbacks: {},
    
    // ===== INIT =====
    async init() {
        if (this.initialized) return;
        this.loadState();
        this.initialized = true;
        console.log('[NW_FORGE] Initialized');
        return this;
    },
    
    setCards(cards) {
        this.CARDS = cards.filter(c => c.rarity && c.id);
        console.log('[NW_FORGE] Card pool set:', this.CARDS.length);
    },
    
    // ===== PULL LOGIC =====
    pull(count = 1) {
        const results = [];
        for (let i = 0; i < count; i++) {
            const card = this._doPull();
            results.push(card);
            this._recordPull(card);
        }
        this.saveState();
        return count === 1 ? results[0] : results;
    },
    
    _doPull() {
        // Determine rarity with pity
        const rarity = this._rollRarity();
        
        // Get cards of that rarity
        const pool = this.CARDS.filter(c => c.rarity === rarity);
        if (pool.length === 0) {
            // Fallback to common if no cards of rarity
            const fallback = this.CARDS.filter(c => c.rarity === 'common');
            return fallback[Math.floor(Math.random() * fallback.length)] || this.CARDS[0];
        }
        
        // Random card from pool
        return pool[Math.floor(Math.random() * pool.length)];
    },
    
    _rollRarity() {
        const roll = Math.random();
        let cumulative = 0;
        
        // Check pity first
        const pity = this.state.pityCounters;
        
        // Mythic hard pity
        if (pity.mythic >= this.PITY.mythic.hard) {
            this._resetPity('mythic');
            return 'mythic';
        }
        
        // Legendary hard pity
        if (pity.legendary >= this.PITY.legendary.hard) {
            this._resetPity('legendary');
            return 'legendary';
        }
        
        // Calculate boosted rates
        const rates = { ...this.RATES };
        
        // Soft pity boosts
        if (pity.mythic >= this.PITY.mythic.soft) {
            const boost = (pity.mythic - this.PITY.mythic.soft) * 0.005;
            rates.mythic = Math.min(0.1, rates.mythic + boost);
        }
        if (pity.legendary >= this.PITY.legendary.soft) {
            const boost = (pity.legendary - this.PITY.legendary.soft) * 0.02;
            rates.legendary = Math.min(0.3, rates.legendary + boost);
        }
        
        // Roll
        for (const [rarity, rate] of Object.entries(rates)) {
            cumulative += rate;
            if (roll < cumulative) {
                if (['mythic', 'legendary', 'epic'].includes(rarity)) {
                    this._resetPity(rarity);
                }
                return rarity;
            }
        }
        
        return 'common';
    },
    
    _resetPity(rarity) {
        this.state.pityCounters[rarity] = 0;
        // Also reset lower rarities
        if (rarity === 'mythic') {
            this.state.pityCounters.legendary = 0;
            this.state.pityCounters.epic = 0;
        } else if (rarity === 'legendary') {
            this.state.pityCounters.epic = 0;
        }
    },
    
    _recordPull(card) {
        this.state.totalPulls++;
        this.state.pityCounters.mythic++;
        this.state.pityCounters.legendary++;
        this.state.pityCounters.epic++;
        
        // History (keep last 100)
        this.state.history.unshift({
            cardId: card.id,
            rarity: card.rarity,
            time: Date.now()
        });
        if (this.state.history.length > 100) {
            this.state.history = this.state.history.slice(0, 100);
        }
        
        // Trigger events
        this._emit(card.rarity, card);
        if (card.rarity === 'mythic') this._emit('mythic', card);
        if (card.rarity === 'legendary') this._emit('legendary', card);
    },
    
    // ===== PITY INFO =====
    getPityInfo() {
        return {
            mythic: {
                current: this.state.pityCounters.mythic,
                soft: this.PITY.mythic.soft,
                hard: this.PITY.mythic.hard,
                inSoftPity: this.state.pityCounters.mythic >= this.PITY.mythic.soft
            },
            legendary: {
                current: this.state.pityCounters.legendary,
                soft: this.PITY.legendary.soft,
                hard: this.PITY.legendary.hard,
                inSoftPity: this.state.pityCounters.legendary >= this.PITY.legendary.soft
            },
            totalPulls: this.state.totalPulls
        };
    },
    
    // ===== PERSISTENCE =====
    saveState() {
        try {
            localStorage.setItem('nw_forge_state', JSON.stringify(this.state));
        } catch (e) {}
    },
    
    loadState() {
        try {
            const saved = localStorage.getItem('nw_forge_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed };
            }
        } catch (e) {}
    },
    
    // ===== EVENTS =====
    on(event, callback) {
        if (!this._callbacks[event]) this._callbacks[event] = [];
        this._callbacks[event].push(callback);
    },
    
    _emit(event, data) {
        (this._callbacks[event] || []).forEach(cb => cb(data));
    },
    
    // ===== STATS =====
    getStats() {
        const history = this.state.history;
        const counts = { mythic: 0, legendary: 0, epic: 0, rare: 0, uncommon: 0, common: 0 };
        history.forEach(h => counts[h.rarity]++);
        
        return {
            totalPulls: this.state.totalPulls,
            last100: counts,
            rates: {
                mythic: history.length ? (counts.mythic / history.length * 100).toFixed(2) + '%' : '0%',
                legendary: history.length ? (counts.legendary / history.length * 100).toFixed(2) + '%' : '0%'
            }
        };
    }
};

window.NW_FORGE = NW_FORGE;
