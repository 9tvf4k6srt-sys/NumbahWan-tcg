/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NW_FORGE - Mythic Forge Game Logic
 * ═══════════════════════════════════════════════════════════════════════════
 * Version: 1.0.0
 * 
 * Centralized forge/gacha logic for NumbahWan TCG:
 * - Pull execution with pity system
 * - Pack opening orchestration
 * - Card reveal sequencing
 * - State management integration
 * - Audio/visual effect coordination
 * 
 * USAGE:
 * ─────────────────────────────────────────────────────────────────────────────
 * // Initialize
 * await NW_FORGE.init();
 * 
 * // Execute pull
 * const cards = await NW_FORGE.pull(5); // 5-pull
 * 
 * // Get current state
 * const state = NW_FORGE.getState();
 * 
 * // Subscribe to changes
 * NW_FORGE.on('pull', (cards) => console.log('Pulled:', cards));
 * NW_FORGE.on('mythic', (card) => console.log('MYTHIC!', card));
 */

const NW_FORGE = (function() {
    'use strict';

    const VERSION = '1.0.0';

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    const CONFIG = {
        // Pull costs
        SINGLE_COST: 160,
        BULK_5_COST: 800,    // 5 pulls
        BULK_10_COST: 1440,  // 10 pulls (10% discount)
        
        // Actual cards received
        PULL_COUNTS: {
            1: 1,
            5: 6,   // 5 pulls = 6 cards (bonus)
            10: 12  // 10 pulls = 12 cards (bonus)
        },
        
        // Pity thresholds
        PITY: {
            mythic: { soft: 150, hard: 200 },
            legendary: { soft: 50, hard: 80 },
            epic: { soft: 15, hard: 25 }
        },
        
        // Base rates (percentage)
        BASE_RATES: {
            mythic: 0.5,
            legendary: 3,
            epic: 10,
            rare: 20,
            uncommon: 30,
            common: 36.5
        },
        
        // Bonuses for rare pulls
        PULL_BONUSES: {
            mythic: 100,
            legendary: 20,
            epic: 5
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════

    let state = {
        logs: 0,
        totalPulls: 0,
        pity: { mythic: 0, legendary: 0, epic: 0 },
        collection: new Set(),
        recentCards: [],
        mythicsOwned: 0,
        initialized: false
    };

    const listeners = new Map();
    let cards = []; // Card pool

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    async function init(options = {}) {
        if (state.initialized) return state;

        // Load saved state
        loadState();

        // Get cards from NW_CARDS if available
        if (typeof NW_CARDS !== 'undefined' && NW_CARDS.cards) {
            cards = NW_CARDS.cards;
        }

        // Sync with NW_STATE if available
        if (typeof NW_STATE !== 'undefined') {
            NW_STATE.configure({ persist: true, persistKey: 'nw_forge_state' });
            
            // Two-way sync
            NW_STATE.subscribe('forge', (newState) => {
                if (newState) Object.assign(state, newState);
            });
        }

        // Sync with NW_WALLET if available
        if (typeof NW_WALLET !== 'undefined') {
            const walletInfo = NW_WALLET.getWalletInfo?.();
            if (walletInfo?.logs !== undefined) {
                state.logs = walletInfo.logs;
            }
        }

        state.initialized = true;
        emit('init', state);
        console.log(`[NW_FORGE] v${VERSION} initialized with ${cards.length} cards`);
        
        return state;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PULL SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Execute a pull
     * @param {number} pullCount - 1, 5, or 10
     * @returns {Array} Cards pulled
     */
    async function pull(pullCount = 1) {
        const cost = getPullCost(pullCount);
        
        // Check affordability
        if (!canAfford(cost)) {
            emit('error', { type: 'insufficient_logs', cost, current: state.logs });
            if (typeof NW_UI !== 'undefined') {
                NW_UI.error('Not enough Sacred Logs!');
            }
            return null;
        }

        // Spend logs
        spendLogs(cost);

        // Calculate actual card count (with bonuses)
        const actualCount = CONFIG.PULL_COUNTS[pullCount] || pullCount;

        // Roll cards
        const pulledCards = [];
        for (let i = 0; i < actualCount; i++) {
            const rarity = rollRarity();
            const card = getRandomCard(rarity);
            
            if (card) {
                pulledCards.push(card);
                processCardPull(card, rarity);
            }
        }

        // Sort by rarity (best last for suspense)
        const order = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
        pulledCards.sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));

        // Update stats
        state.totalPulls += actualCount;
        state.recentCards.push(...pulledCards);
        if (state.recentCards.length > 50) {
            state.recentCards = state.recentCards.slice(-50);
        }

        // Save and emit
        saveState();
        emit('pull', pulledCards);

        return pulledCards;
    }

    /**
     * Process individual card pull (pity, collection, bonuses)
     */
    function processCardPull(card, rarity) {
        // Update collection
        state.collection.add(card.id);

        // Update pity counters
        updatePity(rarity);

        // Award bonuses
        const bonus = CONFIG.PULL_BONUSES[rarity];
        if (bonus) {
            addLogs(bonus, `${rarity.toUpperCase()}_PULL_BONUS`);
            emit(rarity, card);
        }

        // Sync with wallet
        if (typeof NW_WALLET !== 'undefined') {
            NW_WALLET.recordPull?.(rarity);
            NW_WALLET.addToCollection?.(card.id);
        }
    }

    /**
     * Roll rarity with pity system
     */
    function rollRarity() {
        const rates = getAdjustedRates();
        const roll = Math.random() * 100;
        
        let cumulative = 0;
        for (const [rarity, rate] of Object.entries(rates)) {
            cumulative += rate;
            if (roll < cumulative) {
                // Hard pity guarantees
                if (state.pity.mythic >= CONFIG.PITY.mythic.hard) return 'mythic';
                if (state.pity.legendary >= CONFIG.PITY.legendary.hard) return 'legendary';
                if (state.pity.epic >= CONFIG.PITY.epic.hard) return 'epic';
                return rarity;
            }
        }
        return 'common';
    }

    /**
     * Get adjusted rates with soft pity
     */
    function getAdjustedRates() {
        const rates = { ...CONFIG.BASE_RATES };
        
        // Mythic soft pity
        if (state.pity.mythic >= CONFIG.PITY.mythic.soft) {
            const over = state.pity.mythic - CONFIG.PITY.mythic.soft;
            rates.mythic += over * 0.5;
        }
        
        // Legendary soft pity
        if (state.pity.legendary >= CONFIG.PITY.legendary.soft) {
            const over = state.pity.legendary - CONFIG.PITY.legendary.soft;
            rates.legendary += over * 2;
        }
        
        // Epic soft pity
        if (state.pity.epic >= CONFIG.PITY.epic.soft) {
            const over = state.pity.epic - CONFIG.PITY.epic.soft;
            rates.epic += over * 3;
        }
        
        return rates;
    }

    /**
     * Update pity counters
     */
    function updatePity(rarity) {
        // Increment all pity
        state.pity.mythic++;
        state.pity.legendary++;
        state.pity.epic++;
        
        // Reset on hit
        if (rarity === 'mythic') {
            state.pity.mythic = 0;
            state.pity.legendary = 0;
            state.pity.epic = 0;
            state.mythicsOwned++;
        } else if (rarity === 'legendary') {
            state.pity.legendary = 0;
            state.pity.epic = 0;
        } else if (rarity === 'epic') {
            state.pity.epic = 0;
        }
    }

    /**
     * Get random card of specified rarity
     */
    function getRandomCard(rarity) {
        const pool = cards.filter(c => c.rarity === rarity);
        if (pool.length === 0) {
            // Fallback if no cards of that rarity
            return cards[Math.floor(Math.random() * cards.length)];
        }
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CURRENCY MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    function getLogs() {
        // Sync with wallet if available
        if (typeof NW_WALLET !== 'undefined') {
            const walletLogs = NW_WALLET.getLogs?.();
            if (walletLogs !== undefined) return walletLogs;
        }
        return state.logs;
    }

    function addLogs(amount, reason = '') {
        if (typeof NW_WALLET !== 'undefined') {
            NW_WALLET.addLogs?.(amount, reason);
        }
        state.logs = getLogs() + amount;
        emit('logs_change', { amount, reason, total: state.logs });
        saveState();
    }

    function spendLogs(amount) {
        if (typeof NW_WALLET !== 'undefined') {
            return NW_WALLET.spendLogs?.(amount);
        }
        if (state.logs >= amount) {
            state.logs -= amount;
            emit('logs_change', { amount: -amount, reason: 'pull', total: state.logs });
            saveState();
            return true;
        }
        return false;
    }

    function canAfford(cost) {
        return getLogs() >= cost;
    }

    function getPullCost(pullCount) {
        if (pullCount === 10) return CONFIG.BULK_10_COST;
        if (pullCount === 5) return CONFIG.BULK_5_COST;
        return pullCount * CONFIG.SINGLE_COST;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    function getState() {
        return {
            ...state,
            logs: getLogs(),
            collection: [...state.collection],
            rates: getAdjustedRates(),
            pityProgress: {
                mythic: (state.pity.mythic / CONFIG.PITY.mythic.hard) * 100,
                legendary: (state.pity.legendary / CONFIG.PITY.legendary.hard) * 100,
                epic: (state.pity.epic / CONFIG.PITY.epic.hard) * 100
            }
        };
    }

    function saveState() {
        const saveData = {
            totalPulls: state.totalPulls,
            pity: state.pity,
            collection: [...state.collection],
            recentCards: state.recentCards.slice(-50),
            mythicsOwned: state.mythicsOwned
        };
        
        try {
            localStorage.setItem('nw_forge', JSON.stringify(saveData));
            
            // Also sync with NW_STATE if available
            if (typeof NW_STATE !== 'undefined') {
                NW_STATE.set('forge', saveData, { silent: true });
            }
        } catch (e) {
            console.warn('[NW_FORGE] Save failed:', e);
        }
    }

    function loadState() {
        try {
            const saved = localStorage.getItem('nw_forge');
            if (saved) {
                const data = JSON.parse(saved);
                state.totalPulls = data.totalPulls || 0;
                state.pity = data.pity || { mythic: 0, legendary: 0, epic: 0 };
                state.collection = new Set(data.collection || []);
                state.recentCards = data.recentCards || [];
                state.mythicsOwned = data.mythicsOwned || 0;
            }
        } catch (e) {
            console.warn('[NW_FORGE] Load failed:', e);
        }
    }

    function resetState() {
        state = {
            logs: 0,
            totalPulls: 0,
            pity: { mythic: 0, legendary: 0, epic: 0 },
            collection: new Set(),
            recentCards: [],
            mythicsOwned: 0,
            initialized: true
        };
        localStorage.removeItem('nw_forge');
        emit('reset', state);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENT SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════

    function on(event, callback) {
        if (!listeners.has(event)) {
            listeners.set(event, new Set());
        }
        listeners.get(event).add(callback);
        
        // Return unsubscribe function
        return () => listeners.get(event)?.delete(callback);
    }

    function off(event, callback) {
        listeners.get(event)?.delete(callback);
    }

    function emit(event, data) {
        listeners.get(event)?.forEach(cb => {
            try {
                cb(data);
            } catch (e) {
                console.error(`[NW_FORGE] Event handler error for ${event}:`, e);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get highest rarity in a set of cards
     */
    function getHighestRarity(cardList) {
        const order = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
        let highest = 'common';
        for (const card of cardList) {
            if (order.indexOf(card.rarity) > order.indexOf(highest)) {
                highest = card.rarity;
            }
        }
        return highest;
    }

    /**
     * Format logs with icon
     */
    function formatLogs(amount) {
        if (typeof NW_GUILD !== 'undefined') {
            return NW_GUILD.formatCurrency(amount, { symbol: '🪵 ' });
        }
        return `🪵 ${amount.toLocaleString()}`;
    }

    /**
     * Get pity status text
     */
    function getPityStatus() {
        const mythicProg = Math.floor((state.pity.mythic / CONFIG.PITY.mythic.hard) * 100);
        const legendaryProg = Math.floor((state.pity.legendary / CONFIG.PITY.legendary.hard) * 100);
        const epicProg = Math.floor((state.pity.epic / CONFIG.PITY.epic.hard) * 100);
        
        return {
            mythic: { count: state.pity.mythic, progress: mythicProg, inSoft: state.pity.mythic >= CONFIG.PITY.mythic.soft },
            legendary: { count: state.pity.legendary, progress: legendaryProg, inSoft: state.pity.legendary >= CONFIG.PITY.legendary.soft },
            epic: { count: state.pity.epic, progress: epicProg, inSoft: state.pity.epic >= CONFIG.PITY.epic.soft }
        };
    }

    /**
     * Preload card images
     */
    async function preloadCards(cardList) {
        const promises = cardList.map(card => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = resolve;
                img.onerror = resolve;
                img.src = `/static/images/cards/${card.img}`;
            });
        });
        await Promise.all(promises);
    }

    /**
     * Set card pool
     */
    function setCards(cardPool) {
        cards = cardPool;
        console.log(`[NW_FORGE] Card pool set: ${cards.length} cards`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════

    console.log(`[NW_FORGE] v${VERSION} loaded`);

    return {
        VERSION,
        CONFIG,
        
        // Initialization
        init,
        setCards,
        
        // Pull System
        pull,
        rollRarity,
        getAdjustedRates,
        getHighestRarity,
        
        // Currency
        getLogs,
        addLogs,
        spendLogs,
        canAfford,
        getPullCost,
        formatLogs,
        
        // State
        getState,
        saveState,
        loadState,
        resetState,
        getPityStatus,
        
        // Events
        on,
        off,
        emit,
        
        // Utilities
        preloadCards
    };
})();

window.NW_FORGE = NW_FORGE;
