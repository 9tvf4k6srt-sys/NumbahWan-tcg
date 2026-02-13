/* @deprecated - Orphaned global. Export not used by any page. Candidate for removal. */
/**
 * NW_USER_DATA - Unified user data layer
 * Connects wallet, collection, decks, and progression across all pages
 */

const NW_USER_DATA = {
    initialized: false,
    
    // ===== INITIALIZATION =====
    async init() {
        if (this.initialized) return;
        
        // Initialize wallet first
        if (typeof NW_WALLET !== 'undefined') {
            await NW_WALLET.init();
        }
        
        // Initialize cards database
        if (typeof NW_CARDS !== 'undefined') {
            await NW_CARDS.init();
        }
        
        // Load decks from localStorage (not in wallet to keep wallet clean)
        this.loadDecks();
        
        // Load card progression (levels, XP)
        this.loadProgression();
        
        this.initialized = true;
        console.log('[NW_USER_DATA] Initialized');
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('nw-user-data-ready'));
        
        return this;
    },
    
    // ===== COLLECTION =====
    getOwnedCards() {
        if (typeof NW_WALLET === 'undefined') return [];
        return NW_WALLET.getCollection() || [];
    },
    
    getOwnedCardsWithData() {
        const ownedIds = this.getOwnedCards();
        if (typeof NW_CARDS === 'undefined') return [];
        
        return ownedIds.map(id => {
            const card = NW_CARDS.getById(id);
            if (!card) return null;
            
            // Add progression data
            const prog = this.getCardProgression(id);
            return {
                ...card,
                owned: true,
                copies: prog.copies,
                level: prog.level,
                xp: prog.xp
            };
        }).filter(c => c !== null);
    },
    
    ownsCard(cardId) {
        if (typeof NW_WALLET === 'undefined') return false;
        return NW_WALLET.hasCard(cardId);
    },
    
    addCard(cardId) {
        if (typeof NW_WALLET === 'undefined') return false;
        
        // Add to collection
        NW_WALLET.addToCollection(cardId);
        
        // Update progression (add copy)
        this.addCardCopy(cardId);
        
        return true;
    },
    
    getCollectionStats() {
        const owned = this.getOwnedCards();
        const total = typeof NW_CARDS !== 'undefined' ? NW_CARDS.getAll().length : 108;
        
        // Count by rarity
        const byRarity = { mythic: 0, legendary: 0, epic: 0, rare: 0, uncommon: 0, common: 0 };
        
        if (typeof NW_CARDS !== 'undefined') {
            owned.forEach(id => {
                const card = NW_CARDS.getById(id);
                if (card && byRarity[card.rarity] !== undefined) {
                    byRarity[card.rarity]++;
                }
            });
        }
        
        return {
            owned: owned.length,
            total: total,
            percentage: Math.round((owned.length / total) * 100),
            byRarity
        };
    },
    
    // ===== CARD PROGRESSION =====
    PROGRESSION_KEY: 'nw_card_progression',
    progression: {},
    
    loadProgression() {
        try {
            this.progression = JSON.parse(localStorage.getItem(this.PROGRESSION_KEY) || '{}');
        } catch (e) {
            this.progression = {};
        }
    },
    
    saveProgression() {
        localStorage.setItem(this.PROGRESSION_KEY, JSON.stringify(this.progression));
    },
    
    getCardProgression(cardId) {
        return this.progression[cardId] || { copies: 1, level: 1, xp: 0 };
    },
    
    addCardCopy(cardId) {
        if (!this.progression[cardId]) {
            this.progression[cardId] = { copies: 1, level: 1, xp: 0 };
        } else {
            this.progression[cardId].copies++;
            // Duplicates give XP
            this.addCardXP(cardId, 50);
        }
        this.saveProgression();
    },
    
    addCardXP(cardId, amount) {
        if (!this.progression[cardId]) {
            this.progression[cardId] = { copies: 1, level: 1, xp: 0 };
        }
        
        this.progression[cardId].xp += amount;
        
        // Check for level up (100 XP per level)
        const xpNeeded = this.progression[cardId].level * 100;
        while (this.progression[cardId].xp >= xpNeeded && this.progression[cardId].level < 10) {
            this.progression[cardId].xp -= xpNeeded;
            this.progression[cardId].level++;
            console.log(`[NW_USER_DATA] Card ${cardId} leveled up to ${this.progression[cardId].level}!`);
        }
        
        this.saveProgression();
        return this.progression[cardId];
    },
    
    // ===== DECKS =====
    DECKS_KEY: 'nw_decks',
    decks: [],
    
    loadDecks() {
        try {
            this.decks = JSON.parse(localStorage.getItem(this.DECKS_KEY) || '[]');
        } catch (e) {
            this.decks = [];
        }
    },
    
    saveDecks() {
        localStorage.setItem(this.DECKS_KEY, JSON.stringify(this.decks));
    },
    
    getDecks() {
        return this.decks;
    },
    
    getDeck(deckId) {
        return this.decks.find(d => d.id === deckId);
    },
    
    getActiveDeck() {
        return this.decks.find(d => d.active) || this.decks[0] || null;
    },
    
    createDeck(name, cardIds = []) {
        const deck = {
            id: 'deck_' + Date.now(),
            name: name,
            cards: cardIds,
            active: this.decks.length === 0, // First deck is active
            createdAt: Date.now()
        };
        this.decks.push(deck);
        this.saveDecks();
        return deck;
    },
    
    updateDeck(deckId, cardIds) {
        const deck = this.getDeck(deckId);
        if (deck) {
            deck.cards = cardIds;
            deck.updatedAt = Date.now();
            this.saveDecks();
        }
        return deck;
    },
    
    setActiveDeck(deckId) {
        this.decks.forEach(d => d.active = (d.id === deckId));
        this.saveDecks();
    },
    
    deleteDeck(deckId) {
        this.decks = this.decks.filter(d => d.id !== deckId);
        this.saveDecks();
    },
    
    // ===== CURRENCIES (proxy to wallet) =====
    getLogs() {
        if (typeof NW_WALLET === 'undefined') return 0;
        return NW_WALLET.getBalance('wood');
    },
    
    spendLogs(amount) {
        if (typeof NW_WALLET === 'undefined') return false;
        return NW_WALLET.spend('wood', amount, 'FORGE_PULL');
    },
    
    earnLogs(amount, source) {
        if (typeof NW_WALLET === 'undefined') return false;
        return NW_WALLET.earn('wood', amount, source);
    },
    
    getAllCurrencies() {
        if (typeof NW_WALLET === 'undefined') return {};
        return NW_WALLET.getAllBalances();
    },
    
    // ===== BATTLE STATS =====
    recordBattleResult(won, opponent = 'AI') {
        if (typeof NW_WALLET !== 'undefined') {
            NW_WALLET.recordGame(won);
            
            // Earn logs for winning
            if (won) {
                NW_WALLET.earn('wood', 10, 'BATTLE_WIN');
            }
        }
    },
    
    getBattleStats() {
        if (typeof NW_WALLET === 'undefined') return { played: 0, won: 0, winRate: 0 };
        
        const stats = NW_WALLET.getStats();
        return {
            played: stats.gamesPlayed || 0,
            won: stats.gamesWon || 0,
            winRate: stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0
        };
    },
    
    // ===== QUICK HELPERS =====
    isGM() {
        return typeof NW_WALLET !== 'undefined' && NW_WALLET.isGM;
    },
    
    getGuestId() {
        if (typeof NW_WALLET === 'undefined') return 'Guest';
        return NW_WALLET.getGuestId() || 'Guest';
    }
};

// Auto-init when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NW_USER_DATA.init());
} else {
    NW_USER_DATA.init();
}

console.log('[NW_USER_DATA] Module loaded');
