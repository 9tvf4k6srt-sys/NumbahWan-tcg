/**
 * NumbahWan Card System v2.0
 * Central card database with API sync and infinite scaling
 * 
 * Usage:
 *   await NW_CARDS.init();
 *   const allCards = NW_CARDS.getAll();
 *   const card = NW_CARDS.getById(1);
 *   const mythics = NW_CARDS.getByRarity('mythic');
 */

const NW_CARDS = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    let cardDatabase = null;
    let cardsById = {};
    let cardsByRarity = {};
    let initialized = false;
    let loading = false;
    const listeners = [];
    const CACHE_KEY = 'nw_cards_cache';
    const CACHE_VERSION_KEY = 'nw_cards_version';
    const API_URL = '/static/data/cards.json';

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════
    async function init(forceRefresh = false) {
        if (initialized && !forceRefresh) return cardDatabase;
        if (loading) {
            return new Promise((resolve) => {
                const checkLoaded = setInterval(() => {
                    if (initialized) {
                        clearInterval(checkLoaded);
                        resolve(cardDatabase);
                    }
                }, 50);
            });
        }

        loading = true;

        try {
            // Check cache first
            const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
            const cachedData = localStorage.getItem(CACHE_KEY);

            if (!forceRefresh && cachedData && cachedVersion) {
                try {
                    const parsed = JSON.parse(cachedData);
                    // Check if cache is recent (within 1 hour)
                    const cacheTime = parseInt(localStorage.getItem('nw_cards_cache_time') || '0');
                    if (Date.now() - cacheTime < 3600000) {
                        processDatabase(parsed);
                        console.log('[NW_CARDS] Loaded from cache');
                        loading = false;
                        return cardDatabase;
                    }
                } catch (e) {
                    console.warn('[NW_CARDS] Cache parse error, fetching fresh');
                }
            }

            // Fetch from API
            const response = await fetch(API_URL + '?t=' + Date.now());
            if (!response.ok) throw new Error('Failed to fetch cards');
            
            const data = await response.json();
            processDatabase(data);
            
            // Update cache
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CACHE_VERSION_KEY, data.version);
            localStorage.setItem('nw_cards_cache_time', Date.now().toString());
            
            console.log(`[NW_CARDS] Loaded ${data.cards.length} cards (v${data.version})`);
        } catch (error) {
            console.error('[NW_CARDS] Init error:', error);
            // Try to use cached data as fallback
            const cachedData = localStorage.getItem(CACHE_KEY);
            if (cachedData) {
                processDatabase(JSON.parse(cachedData));
                console.log('[NW_CARDS] Using cached data as fallback');
            }
        }

        loading = false;
        return cardDatabase;
    }

    function processDatabase(data) {
        cardDatabase = data;
        cardsById = {};
        cardsByRarity = {
            mythic: [],
            legendary: [],
            epic: [],
            rare: [],
            uncommon: [],
            common: []
        };

        data.cards.forEach(card => {
            cardsById[card.id] = card;
            if (cardsByRarity[card.rarity]) {
                cardsByRarity[card.rarity].push(card);
            }
        });

        initialized = true;
        notifyListeners('init', { totalCards: data.cards.length });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CARD RETRIEVAL
    // ═══════════════════════════════════════════════════════════════════════════
    function getAll() {
        return cardDatabase?.cards || [];
    }

    function getById(id) {
        return cardsById[id] || null;
    }

    function getByRarity(rarity) {
        return cardsByRarity[rarity] || [];
    }

    function getBySet(setName) {
        return (cardDatabase?.cards || []).filter(c => c.set === setName);
    }

    function getReservedList() {
        return (cardDatabase?.cards || []).filter(c => c.reserved);
    }

    function getRarityInfo(rarity) {
        return cardDatabase?.rarities?.[rarity] || null;
    }

    function getAllRarities() {
        return cardDatabase?.rarities || {};
    }

    function getTotalCards() {
        return cardDatabase?.totalCards || 0;
    }

    function getVersion() {
        return cardDatabase?.version || '0.0.0';
    }

    function search(query) {
        const q = query.toLowerCase();
        return (cardDatabase?.cards || []).filter(c => 
            c.name.toLowerCase().includes(q) || 
            c.rarity.toLowerCase().includes(q) ||
            (c.set && c.set.toLowerCase().includes(q))
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GACHA SYSTEM - Pull cards with rarity rates
    // ═══════════════════════════════════════════════════════════════════════════
    function pullCard(pityCounters = {}) {
        if (!initialized) {
            console.error('[NW_CARDS] Not initialized');
            return null;
        }

        const rarities = cardDatabase.rarities;
        let pulledRarity = 'common';
        const roll = Math.random() * 100;

        // Check pity first (guaranteed pulls)
        if (pityCounters.mythic >= rarities.mythic.hardPity) {
            pulledRarity = 'mythic';
        } else if (pityCounters.legendary >= rarities.legendary.hardPity) {
            pulledRarity = 'legendary';
        } else if (pityCounters.epic >= rarities.epic.hardPity) {
            pulledRarity = 'epic';
        } else {
            // Calculate rates with soft pity boost
            let mythicRate = rarities.mythic.rate;
            let legendaryRate = rarities.legendary.rate;
            let epicRate = rarities.epic.rate;

            // Soft pity increases
            if (pityCounters.mythic >= rarities.mythic.softPity) {
                const overPity = pityCounters.mythic - rarities.mythic.softPity;
                mythicRate += overPity * 0.5; // +0.5% per pull after soft pity
            }
            if (pityCounters.legendary >= rarities.legendary.softPity) {
                const overPity = pityCounters.legendary - rarities.legendary.softPity;
                legendaryRate += overPity * 2; // +2% per pull after soft pity
            }
            if (pityCounters.epic >= rarities.epic.softPity) {
                const overPity = pityCounters.epic - rarities.epic.softPity;
                epicRate += overPity * 3; // +3% per pull after soft pity
            }

            // Determine rarity
            let cumulative = 0;
            if (roll < (cumulative += mythicRate)) {
                pulledRarity = 'mythic';
            } else if (roll < (cumulative += legendaryRate)) {
                pulledRarity = 'legendary';
            } else if (roll < (cumulative += epicRate)) {
                pulledRarity = 'epic';
            } else if (roll < (cumulative += rarities.rare.rate)) {
                pulledRarity = 'rare';
            } else if (roll < (cumulative += rarities.uncommon.rate)) {
                pulledRarity = 'uncommon';
            } else {
                pulledRarity = 'common';
            }
        }

        // Get random card from that rarity
        const cardsOfRarity = cardsByRarity[pulledRarity];
        if (cardsOfRarity.length === 0) {
            // Fallback to common if no cards of that rarity
            pulledRarity = 'common';
        }
        
        const card = cardsOfRarity[Math.floor(Math.random() * cardsOfRarity.length)];

        // Update pity counters
        const newPity = { ...pityCounters };
        if (pulledRarity === 'mythic') {
            newPity.mythic = 0;
        } else {
            newPity.mythic = (newPity.mythic || 0) + 1;
        }
        if (pulledRarity === 'legendary' || pulledRarity === 'mythic') {
            newPity.legendary = 0;
        } else {
            newPity.legendary = (newPity.legendary || 0) + 1;
        }
        if (pulledRarity === 'epic' || pulledRarity === 'legendary' || pulledRarity === 'mythic') {
            newPity.epic = 0;
        } else {
            newPity.epic = (newPity.epic || 0) + 1;
        }

        notifyListeners('pull', { card, pulledRarity, pity: newPity });

        return {
            card: { ...card },
            rarity: pulledRarity,
            pity: newPity
        };
    }

    // Multi-pull
    function pullCards(count, pityCounters = {}) {
        const results = [];
        let pity = { ...pityCounters };
        
        for (let i = 0; i < count; i++) {
            const result = pullCard(pity);
            if (result) {
                results.push(result);
                pity = result.pity;
            }
        }
        
        return { results, finalPity: pity };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COLLECTION HELPERS
    // ═══════════════════════════════════════════════════════════════════════════
    function getCardImageUrl(card) {
        if (!card) return '/static/cards/placeholder.jpg';
        return `/static/cards/${card.img}`;
    }

    function getRarityColor(rarity) {
        const info = getRarityInfo(rarity);
        return info?.color || '#888888';
    }

    function getCollectionStats(ownedCardIds = []) {
        const stats = {
            total: getTotalCards(),
            owned: 0,
            byRarity: {}
        };

        const uniqueOwned = new Set(ownedCardIds);
        stats.owned = uniqueOwned.size;

        Object.keys(cardsByRarity).forEach(rarity => {
            const total = cardsByRarity[rarity].length;
            const owned = cardsByRarity[rarity].filter(c => uniqueOwned.has(c.id)).length;
            stats.byRarity[rarity] = { total, owned, percent: total > 0 ? Math.round((owned / total) * 100) : 0 };
        });

        stats.percent = stats.total > 0 ? Math.round((stats.owned / stats.total) * 100) : 0;
        return stats;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENT SYSTEM - For syncing across components
    // ═══════════════════════════════════════════════════════════════════════════
    function on(event, callback) {
        listeners.push({ event, callback });
    }

    function off(event, callback) {
        const index = listeners.findIndex(l => l.event === event && l.callback === callback);
        if (index > -1) listeners.splice(index, 1);
    }

    function notifyListeners(event, data) {
        listeners
            .filter(l => l.event === event || l.event === '*')
            .forEach(l => {
                try {
                    l.callback(event, data);
                } catch (e) {
                    console.error('[NW_CARDS] Listener error:', e);
                }
            });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS - For easy card management
    // ═══════════════════════════════════════════════════════════════════════════
    function addCard(card) {
        if (!initialized) return false;
        if (!card.id || !card.name || !card.rarity) {
            console.error('[NW_CARDS] Invalid card:', card);
            return false;
        }
        
        cardDatabase.cards.push(card);
        cardsById[card.id] = card;
        if (cardsByRarity[card.rarity]) {
            cardsByRarity[card.rarity].push(card);
        }
        cardDatabase.totalCards = cardDatabase.cards.length;
        
        notifyListeners('add', { card });
        return true;
    }

    function updateCard(id, updates) {
        const card = cardsById[id];
        if (!card) return false;
        
        // If rarity changed, update rarity arrays
        if (updates.rarity && updates.rarity !== card.rarity) {
            const oldRarity = card.rarity;
            const idx = cardsByRarity[oldRarity].findIndex(c => c.id === id);
            if (idx > -1) cardsByRarity[oldRarity].splice(idx, 1);
            cardsByRarity[updates.rarity].push(card);
        }
        
        Object.assign(card, updates);
        notifyListeners('update', { card });
        return true;
    }

    function removeCard(id) {
        const card = cardsById[id];
        if (!card) return false;
        
        const idx = cardDatabase.cards.findIndex(c => c.id === id);
        if (idx > -1) cardDatabase.cards.splice(idx, 1);
        
        const rarityIdx = cardsByRarity[card.rarity].findIndex(c => c.id === id);
        if (rarityIdx > -1) cardsByRarity[card.rarity].splice(rarityIdx, 1);
        
        delete cardsById[id];
        cardDatabase.totalCards = cardDatabase.cards.length;
        
        notifyListeners('remove', { id, card });
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EXPORT CURRENT STATE (for saving to JSON)
    // ═══════════════════════════════════════════════════════════════════════════
    function exportDatabase() {
        if (!cardDatabase) return null;
        return JSON.stringify(cardDatabase, null, 2);
    }

    function clearCache() {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_VERSION_KEY);
        localStorage.removeItem('nw_cards_cache_time');
        initialized = false;
        cardDatabase = null;
        cardsById = {};
        cardsByRarity = {};
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════
    return {
        // Initialization
        init,
        clearCache,
        
        // Getters
        getAll,
        getById,
        getByRarity,
        getBySet,
        getReservedList,
        getRarityInfo,
        getAllRarities,
        getTotalCards,
        getVersion,
        search,
        
        // Gacha
        pullCard,
        pullCards,
        
        // Helpers
        getCardImageUrl,
        getRarityColor,
        getCollectionStats,
        
        // Events
        on,
        off,
        
        // Admin
        addCard,
        updateCard,
        removeCard,
        exportDatabase,
        
        // Properties
        get initialized() { return initialized; },
        get database() { return cardDatabase; }
    };
})();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => NW_CARDS.init());
    } else {
        NW_CARDS.init();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NW_CARDS;
}
