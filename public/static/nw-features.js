/**
 * NumbahWan Advanced Features v1.0
 * Based on Research Paper Insights:
 * - Paper #111: Daily Rewards & Habit Formation
 * - Paper #93, #120: FOMO & Limited-Time Offers
 * - Paper #109: Rare Items = Social Status
 * 
 * Features:
 * 1. Streak Protection System (in nw-wallet.js)
 * 2. Limited-Time Rotating Card
 * 3. Collection Value Leaderboard
 */

const NW_FEATURES = {
    // ═══════════════════════════════════════════════════════════════
    // LIMITED-TIME ROTATING CARD SYSTEM
    // Based on Paper #93: "FOMO is 3-5x more powerful than regular desire"
    // ═══════════════════════════════════════════════════════════════
    
    FEATURED_CARD_KEY: 'nw_featured_card',
    ROTATION_HOURS: 24, // Card rotates every 24 hours
    
    // Featured cards - curated selection for rotation
    // Each card gets 24 hours of spotlight with special bonus
    FEATURED_POOL: [
        { cardId: 1, bonus: { nwg: 10 }, rarity: 'mythic' },
        { cardId: 5, bonus: { gold: 50 }, rarity: 'legendary' },
        { cardId: 10, bonus: { nwg: 5 }, rarity: 'epic' },
        { cardId: 15, bonus: { gold: 25 }, rarity: 'rare' },
        { cardId: 20, bonus: { nwg: 3 }, rarity: 'epic' },
        { cardId: 25, bonus: { gold: 30 }, rarity: 'legendary' },
        { cardId: 30, bonus: { nwg: 8 }, rarity: 'epic' },
        { cardId: 35, bonus: { gold: 40 }, rarity: 'rare' }
    ],
    
    // Get current featured card
    getFeaturedCard() {
        const now = Date.now();
        const stored = this.getStoredFeaturedCard();
        
        // Check if current card has expired
        if (stored && stored.expiresAt > now) {
            return {
                ...stored,
                timeRemaining: stored.expiresAt - now,
                hoursRemaining: Math.floor((stored.expiresAt - now) / (1000 * 60 * 60)),
                minutesRemaining: Math.floor(((stored.expiresAt - now) % (1000 * 60 * 60)) / (1000 * 60))
            };
        }
        
        // Rotate to new card
        return this.rotateFeaturedCard();
    },
    
    getStoredFeaturedCard() {
        try {
            const data = localStorage.getItem(this.FEATURED_CARD_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },
    
    rotateFeaturedCard() {
        // Use day of year to ensure same card for all users on same day
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
        
        // Deterministic selection based on day
        const index = dayOfYear % this.FEATURED_POOL.length;
        const featured = this.FEATURED_POOL[index];
        
        // Set expiration at midnight UTC
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        
        const cardData = {
            ...featured,
            startedAt: now.getTime(),
            expiresAt: tomorrow.getTime(),
            dayOfYear
        };
        
        localStorage.setItem(this.FEATURED_CARD_KEY, JSON.stringify(cardData));
        
        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('nw-featured-card-rotated', {
            detail: cardData
        }));
        
        return {
            ...cardData,
            timeRemaining: cardData.expiresAt - Date.now(),
            hoursRemaining: Math.floor((cardData.expiresAt - Date.now()) / (1000 * 60 * 60)),
            minutesRemaining: Math.floor(((cardData.expiresAt - Date.now()) % (1000 * 60 * 60)) / (1000 * 60))
        };
    },
    
    // Check if user pulled the featured card during spotlight
    checkFeaturedCardPull(cardId) {
        const featured = this.getFeaturedCard();
        if (featured && featured.cardId === cardId) {
            // Give bonus!
            if (typeof NW_WALLET !== 'undefined' && NW_WALLET.wallet) {
                for (const [currency, amount] of Object.entries(featured.bonus)) {
                    NW_WALLET.earn(currency, amount, 'FEATURED_CARD_BONUS');
                }
            }
            
            window.dispatchEvent(new CustomEvent('nw-featured-card-pulled', {
                detail: { cardId, bonus: featured.bonus }
            }));
            
            return { success: true, bonus: featured.bonus };
        }
        return { success: false };
    },
    
    // ═══════════════════════════════════════════════════════════════
    // COLLECTION VALUE LEADERBOARD
    // Based on Paper #109: "Rare items signal wealth and dedication"
    // ═══════════════════════════════════════════════════════════════
    
    LEADERBOARD_KEY: 'nw_leaderboard',
    LEADERBOARD_SYNC_INTERVAL: 5 * 60 * 1000, // Sync every 5 minutes
    
    // Card values by rarity (in NWG equivalent)
    CARD_VALUES: {
        mythic: 500,
        legendary: 100,
        epic: 25,
        rare: 10,
        uncommon: 3,
        common: 1
    },
    
    // Star multipliers
    STAR_MULTIPLIERS: {
        1: 1.0,
        2: 1.5,
        3: 2.0,
        4: 3.0,
        5: 5.0
    },
    
    // Calculate collection value
    calculateCollectionValue(collection) {
        if (!collection || !Array.isArray(collection)) return 0;
        
        let totalValue = 0;
        const breakdown = {
            mythic: { count: 0, value: 0 },
            legendary: { count: 0, value: 0 },
            epic: { count: 0, value: 0 },
            rare: { count: 0, value: 0 },
            uncommon: { count: 0, value: 0 },
            common: { count: 0, value: 0 }
        };
        
        for (const card of collection) {
            const baseValue = this.CARD_VALUES[card.rarity] || 1;
            const starMultiplier = this.STAR_MULTIPLIERS[card.stars || 1] || 1;
            const duplicateBonus = (card.duplicates || 0) * 0.5;
            
            const cardValue = Math.floor(baseValue * starMultiplier * (1 + duplicateBonus));
            totalValue += cardValue;
            
            if (breakdown[card.rarity]) {
                breakdown[card.rarity].count++;
                breakdown[card.rarity].value += cardValue;
            }
        }
        
        return { totalValue, breakdown, cardCount: collection.length };
    },
    
    // Get local leaderboard (stored locally, synced with mock data)
    getLeaderboard() {
        try {
            const data = localStorage.getItem(this.LEADERBOARD_KEY);
            const leaderboard = data ? JSON.parse(data) : this.createDefaultLeaderboard();
            
            // Update current user's position
            this.updateUserPosition(leaderboard);
            
            return leaderboard;
        } catch (e) {
            return this.createDefaultLeaderboard();
        }
    },
    
    createDefaultLeaderboard() {
        // Create mock leaderboard with NPC players for competition feel
        const mockPlayers = [
            { name: 'RegginA', guestId: 'NW-FOUNDER001', value: 15000, cards: 89, title: 'Guild Master' },
            { name: 'WhaleKing', guestId: 'NW-WHALE0001', value: 12500, cards: 75, title: 'Mythic Collector' },
            { name: 'LuckyPull', guestId: 'NW-LUCKY0001', value: 8900, cards: 62, title: 'Fortune Blessed' },
            { name: 'CardHoarder', guestId: 'NW-HOARD0001', value: 7200, cards: 95, title: 'Completionist' },
            { name: 'F2PChamp', guestId: 'NW-F2P00001', value: 5500, cards: 48, title: 'Budget King' },
            { name: 'GrindMaster', guestId: 'NW-GRIND0001', value: 4800, cards: 55, title: 'Daily Warrior' },
            { name: 'NightOwl', guestId: 'NW-NIGHT0001', value: 3200, cards: 40, title: 'Late Night Puller' },
            { name: 'NewbieHope', guestId: 'NW-NEWBI0001', value: 1500, cards: 25, title: 'Rising Star' },
            { name: 'CasualFun', guestId: 'NW-CASUAL01', value: 800, cards: 18, title: 'Weekend Player' },
            { name: 'JustStarted', guestId: 'NW-NEW000001', value: 200, cards: 8, title: 'Fresh Adventurer' }
        ];
        
        const leaderboard = {
            entries: mockPlayers.map((p, i) => ({ ...p, rank: i + 1 })),
            lastUpdated: Date.now(),
            userRank: null
        };
        
        localStorage.setItem(this.LEADERBOARD_KEY, JSON.stringify(leaderboard));
        return leaderboard;
    },
    
    updateUserPosition(leaderboard) {
        if (typeof NW_WALLET === 'undefined' || !NW_WALLET.wallet) return;
        
        const guestId = NW_WALLET.wallet.guestId;
        const collection = this.getUserCollection();
        const { totalValue, cardCount } = this.calculateCollectionValue(collection);
        
        // Find or create user entry
        let userEntry = leaderboard.entries.find(e => e.guestId === guestId);
        
        if (!userEntry) {
            userEntry = {
                name: 'You',
                guestId,
                value: totalValue,
                cards: cardCount,
                title: this.getTitle(totalValue),
                isUser: true
            };
            leaderboard.entries.push(userEntry);
        } else {
            userEntry.value = totalValue;
            userEntry.cards = cardCount;
            userEntry.title = this.getTitle(totalValue);
            userEntry.isUser = true;
        }
        
        // Sort by value descending
        leaderboard.entries.sort((a, b) => b.value - a.value);
        
        // Update ranks
        leaderboard.entries.forEach((entry, i) => {
            entry.rank = i + 1;
            if (entry.isUser) {
                leaderboard.userRank = i + 1;
            }
        });
        
        leaderboard.lastUpdated = Date.now();
        localStorage.setItem(this.LEADERBOARD_KEY, JSON.stringify(leaderboard));
    },
    
    getUserCollection() {
        // Try to get from NW_CARDS or localStorage
        if (typeof NW_CARDS !== 'undefined' && NW_CARDS.getCollection) {
            return NW_CARDS.getCollection();
        }
        
        try {
            const data = localStorage.getItem('nw_card_collection');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },
    
    getTitle(value) {
        if (value >= 10000) return 'Mythic Collector';
        if (value >= 5000) return 'Legendary Hoarder';
        if (value >= 2000) return 'Epic Enthusiast';
        if (value >= 500) return 'Card Connoisseur';
        if (value >= 100) return 'Growing Collector';
        return 'New Adventurer';
    },
    
    // Get user's rank info
    getUserRankInfo() {
        const leaderboard = this.getLeaderboard();
        const userEntry = leaderboard.entries.find(e => e.isUser);
        
        if (!userEntry) {
            return {
                rank: leaderboard.entries.length + 1,
                value: 0,
                nextRank: leaderboard.entries[leaderboard.entries.length - 1],
                toNextRank: leaderboard.entries[leaderboard.entries.length - 1]?.value || 100
            };
        }
        
        const nextRankEntry = leaderboard.entries[userEntry.rank - 2]; // Entry above user
        
        return {
            rank: userEntry.rank,
            value: userEntry.value,
            title: userEntry.title,
            cards: userEntry.cards,
            nextRank: nextRankEntry || null,
            toNextRank: nextRankEntry ? (nextRankEntry.value - userEntry.value) : 0,
            percentile: Math.round(((leaderboard.entries.length - userEntry.rank + 1) / leaderboard.entries.length) * 100)
        };
    },
    
    // ═══════════════════════════════════════════════════════════════
    // STREAK DISPLAY COMPONENT
    // Renders streak info anywhere on the site
    // ═══════════════════════════════════════════════════════════════
    
    renderStreakBadge(containerId) {
        const container = document.getElementById(containerId);
        if (!container || typeof NW_WALLET === 'undefined') return;
        
        const info = NW_WALLET.getStreakInfo?.() || { currentStreak: 0, canClaim: false };
        
        const fireEmoji = info.currentStreak >= 7 ? '🔥🔥🔥' : 
                         info.currentStreak >= 3 ? '🔥🔥' : 
                         info.currentStreak > 0 ? '🔥' : '💤';
        
        container.innerHTML = `
            <div class="nw-streak-badge ${info.canClaim ? 'can-claim' : ''} ${info.streakBroken ? 'broken' : ''}">
                <span class="streak-fire">${fireEmoji}</span>
                <span class="streak-count">${info.currentStreak}</span>
                <span class="streak-label">day streak</span>
                ${info.protections > 0 ? `<span class="streak-shield">🛡️${info.protections}</span>` : ''}
                ${info.canClaim ? '<span class="claim-dot"></span>' : ''}
            </div>
        `;
        
        // Add click handler
        container.querySelector('.nw-streak-badge')?.addEventListener('click', () => {
            window.location.href = '/wallet';
        });
    },
    
    // ═══════════════════════════════════════════════════════════════
    // FEATURED CARD BANNER COMPONENT
    // Shows rotating card with countdown
    // ═══════════════════════════════════════════════════════════════
    
    renderFeaturedCardBanner(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const featured = this.getFeaturedCard();
        if (!featured) return;
        
        const bonusText = Object.entries(featured.bonus)
            .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
            .join(' ');
        
        container.innerHTML = `
            <div class="nw-featured-banner">
                <div class="featured-glow"></div>
                <div class="featured-content">
                    <div class="featured-label">
                        <span class="featured-icon">⭐</span>
                        <span>TODAY'S FEATURED CARD</span>
                    </div>
                    <div class="featured-card-preview" data-card-id="${featured.cardId}" data-rarity="${featured.rarity}">
                        <!-- Card image loaded dynamically -->
                    </div>
                    <div class="featured-bonus">
                        <span class="bonus-label">PULL BONUS:</span>
                        <span class="bonus-value">${bonusText}</span>
                    </div>
                    <div class="featured-timer">
                        <span class="timer-icon">⏰</span>
                        <span class="timer-value">${featured.hoursRemaining}h ${featured.minutesRemaining}m</span>
                        <span class="timer-label">remaining</span>
                    </div>
                </div>
            </div>
        `;
        
        // Start countdown timer
        this.startFeaturedCountdown(container);
    },
    
    startFeaturedCountdown(container) {
        const timerEl = container.querySelector('.timer-value');
        if (!timerEl) return;
        
        const updateTimer = () => {
            const featured = this.getFeaturedCard();
            if (featured) {
                timerEl.textContent = `${featured.hoursRemaining}h ${featured.minutesRemaining}m`;
            }
        };
        
        // Update every minute
        setInterval(updateTimer, 60000);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // LEADERBOARD COMPONENT
    // ═══════════════════════════════════════════════════════════════
    
    renderLeaderboard(containerId, limit = 10) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const leaderboard = this.getLeaderboard();
        const topEntries = leaderboard.entries.slice(0, limit);
        const userInfo = this.getUserRankInfo();
        
        const medalEmojis = ['🥇', '🥈', '🥉'];
        
        container.innerHTML = `
            <div class="nw-leaderboard">
                <div class="leaderboard-header">
                    <h3>🏆 Collection Value Leaderboard</h3>
                    <span class="leaderboard-update">Updated ${this.formatTimeAgo(leaderboard.lastUpdated)}</span>
                </div>
                <div class="leaderboard-list">
                    ${topEntries.map((entry, i) => `
                        <div class="leaderboard-entry ${entry.isUser ? 'is-user' : ''} ${i < 3 ? 'top-3' : ''}">
                            <span class="entry-rank">${i < 3 ? medalEmojis[i] : `#${entry.rank}`}</span>
                            <div class="entry-info">
                                <span class="entry-name">${entry.name}${entry.isUser ? ' (You)' : ''}</span>
                                <span class="entry-title">${entry.title}</span>
                            </div>
                            <div class="entry-stats">
                                <span class="entry-value">${entry.value.toLocaleString()} NWG</span>
                                <span class="entry-cards">${entry.cards} cards</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${userInfo.rank > limit ? `
                    <div class="leaderboard-user-position">
                        <span>Your Rank: #${userInfo.rank}</span>
                        <span>${userInfo.toNextRank > 0 ? `${userInfo.toNextRank} NWG to rank up` : 'Top rank!'}</span>
                    </div>
                ` : ''}
            </div>
        `;
    },
    
    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    },
    
    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
    
    init() {
        console.log('[NW_FEATURES] Initializing advanced features...');
        
        // Initialize featured card rotation
        this.getFeaturedCard();
        
        // Initialize leaderboard
        this.getLeaderboard();
        
        // Listen for card pulls to check featured bonus
        window.addEventListener('nw-card-pulled', (e) => {
            if (e.detail?.cardId) {
                this.checkFeaturedCardPull(e.detail.cardId);
            }
        });
        
        console.log('[NW_FEATURES] Features initialized!');
        
        return this;
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NW_FEATURES.init());
} else {
    NW_FEATURES.init();
}

// CSS for components (injected)
(function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Streak Badge */
        .nw-streak-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #1a1a25, #12121a);
            border: 1px solid #333;
            border-radius: 20px;
            padding: 6px 12px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 13px;
        }
        .nw-streak-badge:hover {
            border-color: #ff6b00;
            transform: translateY(-1px);
        }
        .nw-streak-badge.can-claim {
            border-color: #22c55e;
            animation: claimPulse 2s infinite;
        }
        .nw-streak-badge.broken {
            border-color: #ef4444;
        }
        .streak-fire { font-size: 16px; }
        .streak-count { font-weight: 700; color: #ff6b00; }
        .streak-label { color: #888; font-size: 11px; }
        .streak-shield { 
            background: rgba(59, 130, 246, 0.2);
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 11px;
        }
        .claim-dot {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            animation: pulse 1.5s infinite;
        }
        
        /* Featured Card Banner */
        .nw-featured-banner {
            position: relative;
            background: linear-gradient(135deg, #1a1a25, rgba(255, 107, 0, 0.1));
            border: 1px solid rgba(255, 107, 0, 0.3);
            border-radius: 16px;
            padding: 20px;
            overflow: hidden;
        }
        .featured-glow {
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255, 107, 0, 0.1) 0%, transparent 70%);
            animation: rotate 20s linear infinite;
        }
        @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .featured-content {
            position: relative;
            z-index: 1;
            text-align: center;
        }
        .featured-label {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 700;
            color: #ffd700;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }
        .featured-bonus {
            margin: 12px 0;
            padding: 8px 16px;
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.3);
            border-radius: 8px;
            display: inline-block;
        }
        .bonus-label { color: #888; font-size: 11px; margin-right: 8px; }
        .bonus-value { color: #22c55e; font-weight: 700; }
        .featured-timer {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin-top: 12px;
            color: #888;
            font-size: 13px;
        }
        .timer-value { color: #ff6b00; font-weight: 600; }
        
        /* Leaderboard */
        .nw-leaderboard {
            background: #12121a;
            border: 1px solid #2a2a35;
            border-radius: 16px;
            overflow: hidden;
        }
        .leaderboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border-bottom: 1px solid #2a2a35;
        }
        .leaderboard-header h3 {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
        }
        .leaderboard-update {
            font-size: 11px;
            color: #666;
        }
        .leaderboard-list {
            padding: 8px 0;
        }
        .leaderboard-entry {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            transition: background 0.2s;
        }
        .leaderboard-entry:hover {
            background: rgba(255, 255, 255, 0.02);
        }
        .leaderboard-entry.is-user {
            background: rgba(255, 107, 0, 0.1);
            border-left: 3px solid #ff6b00;
        }
        .leaderboard-entry.top-3 {
            background: linear-gradient(90deg, rgba(255, 215, 0, 0.05), transparent);
        }
        .entry-rank {
            width: 40px;
            font-weight: 700;
            font-size: 14px;
        }
        .entry-info {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .entry-name {
            font-weight: 600;
            font-size: 14px;
        }
        .entry-title {
            font-size: 11px;
            color: #888;
        }
        .entry-stats {
            text-align: right;
        }
        .entry-value {
            display: block;
            font-weight: 600;
            color: #ffd700;
            font-size: 14px;
        }
        .entry-cards {
            font-size: 11px;
            color: #666;
        }
        .leaderboard-user-position {
            display: flex;
            justify-content: space-between;
            padding: 12px 16px;
            background: rgba(255, 107, 0, 0.05);
            border-top: 1px solid #2a2a35;
            font-size: 13px;
        }
        
        @keyframes claimPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
            50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
        }
    `;
    document.head.appendChild(style);
})();
