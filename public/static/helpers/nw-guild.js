/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NW_GUILD - Guild-Specific Utilities
 * ═══════════════════════════════════════════════════════════════════════════
 * Version: 2.0.0
 * 
 * NumbahWan Guild specific helpers:
 * - Wallet integration
 * - Card system helpers
 * - Gacha/pulling mechanics
 * - Currency formatting
 * - Rarity utilities
 * - Leaderboards
 * - Achievements
 */

const NW_GUILD = (function() {
    'use strict';

    const VERSION = '2.0.0';

    // ═══════════════════════════════════════════════════════════════════════════
    // RARITY SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════

    const RARITIES = {
        mythic: {
            name: 'Mythic',
            color: '#ff00ff',
            gradient: 'linear-gradient(135deg, #ff00ff 0%, #ff6b00 50%, #ffd700 100%)',
            glow: '0 0 20px rgba(255,0,255,0.6), 0 0 40px rgba(255,107,0,0.4)',
            rate: 0.01,
            softPity: 75,
            hardPity: 90,
            multiplier: 100
        },
        legendary: {
            name: 'Legendary',
            color: '#ffd700',
            gradient: 'linear-gradient(135deg, #ffd700 0%, #ff9500 100%)',
            glow: '0 0 15px rgba(255,215,0,0.5)',
            rate: 1,
            softPity: 35,
            hardPity: 50,
            multiplier: 25
        },
        epic: {
            name: 'Epic',
            color: '#a855f7',
            gradient: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
            glow: '0 0 12px rgba(168,85,247,0.5)',
            rate: 8,
            softPity: 15,
            hardPity: 25,
            multiplier: 10
        },
        rare: {
            name: 'Rare',
            color: '#3b82f6',
            gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            glow: '0 0 10px rgba(59,130,246,0.4)',
            rate: 20,
            multiplier: 5
        },
        uncommon: {
            name: 'Uncommon',
            color: '#22c55e',
            gradient: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
            glow: '0 0 8px rgba(34,197,94,0.3)',
            rate: 30,
            multiplier: 2
        },
        common: {
            name: 'Common',
            color: '#9ca3af',
            gradient: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
            glow: 'none',
            rate: 40.99,
            multiplier: 1
        }
    };

    /** Get rarity info */
    function getRarity(name) {
        return RARITIES[name?.toLowerCase()] || RARITIES.common;
    }

    /** Get rarity color */
    function getRarityColor(name) {
        return getRarity(name).color;
    }

    /** Get rarity gradient */
    function getRarityGradient(name) {
        return getRarity(name).gradient;
    }

    /** Apply rarity styling to element */
    function applyRarityStyle(element, rarity) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return;

        const r = getRarity(rarity);
        el.style.borderColor = r.color;
        el.style.boxShadow = r.glow;
        el.dataset.rarity = rarity;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CURRENCY FORMATTING
    // ═══════════════════════════════════════════════════════════════════════════

    /** Format guild currency (NWG) */
    function formatCurrency(amount, options = {}) {
        const { symbol = '⚡', compact = false, decimals = 0 } = options;
        
        if (compact && amount >= 1000000) {
            return `${symbol}${(amount / 1000000).toFixed(1)}M`;
        }
        if (compact && amount >= 1000) {
            return `${symbol}${(amount / 1000).toFixed(1)}K`;
        }
        
        return `${symbol}${amount.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        })}`;
    }

    /** Format crystals */
    function formatCrystals(amount) {
        return formatCurrency(amount, { symbol: '💎' });
    }

    /** Format gold */
    function formatGold(amount) {
        return formatCurrency(amount, { symbol: '🪙', compact: true });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GACHA HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Calculate pull cost */
    function getPullCost(pullCount = 1) {
        const SINGLE_PULL_COST = 160;
        const TEN_PULL_COST = 1440; // 10% discount
        
        if (pullCount >= 10) {
            const tenPulls = Math.floor(pullCount / 10);
            const singles = pullCount % 10;
            return (tenPulls * TEN_PULL_COST) + (singles * SINGLE_PULL_COST);
        }
        return pullCount * SINGLE_PULL_COST;
    }

    /** Calculate pity progress */
    function getPityProgress(pityCounters = {}) {
        return {
            mythic: {
                current: pityCounters.mythic || 0,
                softPity: RARITIES.mythic.softPity,
                hardPity: RARITIES.mythic.hardPity,
                progress: ((pityCounters.mythic || 0) / RARITIES.mythic.hardPity) * 100,
                inSoftPity: (pityCounters.mythic || 0) >= RARITIES.mythic.softPity
            },
            legendary: {
                current: pityCounters.legendary || 0,
                softPity: RARITIES.legendary.softPity,
                hardPity: RARITIES.legendary.hardPity,
                progress: ((pityCounters.legendary || 0) / RARITIES.legendary.hardPity) * 100,
                inSoftPity: (pityCounters.legendary || 0) >= RARITIES.legendary.softPity
            },
            epic: {
                current: pityCounters.epic || 0,
                softPity: RARITIES.epic.softPity,
                hardPity: RARITIES.epic.hardPity,
                progress: ((pityCounters.epic || 0) / RARITIES.epic.hardPity) * 100,
                inSoftPity: (pityCounters.epic || 0) >= RARITIES.epic.softPity
            }
        };
    }

    /** Simulate pull rates with current pity */
    function getAdjustedRates(pityCounters = {}) {
        const rates = { ...RARITIES };
        
        // Apply soft pity boosts
        if ((pityCounters.mythic || 0) >= RARITIES.mythic.softPity) {
            const overPity = pityCounters.mythic - RARITIES.mythic.softPity;
            rates.mythic = { ...rates.mythic, rate: RARITIES.mythic.rate + (overPity * 0.5) };
        }
        
        if ((pityCounters.legendary || 0) >= RARITIES.legendary.softPity) {
            const overPity = pityCounters.legendary - RARITIES.legendary.softPity;
            rates.legendary = { ...rates.legendary, rate: RARITIES.legendary.rate + (overPity * 2) };
        }
        
        if ((pityCounters.epic || 0) >= RARITIES.epic.softPity) {
            const overPity = pityCounters.epic - RARITIES.epic.softPity;
            rates.epic = { ...rates.epic, rate: RARITIES.epic.rate + (overPity * 3) };
        }
        
        return rates;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CARD DISPLAY HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Generate card HTML */
    function renderCard(card, options = {}) {
        const { size = 'md', showStats = true, onClick = null } = options;
        const rarity = getRarity(card.rarity);
        
        const sizeClasses = {
            sm: 'nw-card-sm',
            md: 'nw-card',
            lg: 'nw-card-lg',
            xl: 'nw-card-xl'
        };

        return `
            <div class="${sizeClasses[size] || 'nw-card'}" 
                 data-rarity="${card.rarity}" 
                 data-card-id="${card.id}"
                 ${onClick ? `onclick="${onClick}"` : ''}>
                <div class="nw-card-art">
                    <img src="/static/cards/${card.img}" alt="${card.name}" loading="lazy">
                </div>
                <div class="nw-card-info">
                    <span class="nw-card-name">${card.name}</span>
                    ${showStats && card.atk !== undefined ? `
                        <span class="nw-card-stats">
                            <span class="atk">${card.atk}</span> / <span class="def">${card.def}</span>
                        </span>
                    ` : ''}
                </div>
                <span class="nw-card-rarity" style="background: ${rarity.gradient}">${rarity.name}</span>
            </div>
        `;
    }

    /** Render card grid */
    function renderCardGrid(cards, options = {}) {
        const { containerClass = 'nw-card-grid', ...cardOptions } = options;
        return `
            <div class="${containerClass}">
                ${cards.map(card => renderCard(card, cardOptions)).join('')}
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACHIEVEMENTS
    // ═══════════════════════════════════════════════════════════════════════════

    const ACHIEVEMENTS = {
        first_pull: { name: 'First Pull', desc: 'Pull your first card', reward: 100 },
        collector_10: { name: 'Collector I', desc: 'Collect 10 unique cards', reward: 500 },
        collector_50: { name: 'Collector II', desc: 'Collect 50 unique cards', reward: 2000 },
        collector_100: { name: 'Collector III', desc: 'Collect 100 unique cards', reward: 5000 },
        lucky_pull: { name: 'Lucky', desc: 'Pull a legendary card', reward: 1000 },
        jackpot: { name: 'Jackpot!', desc: 'Pull a mythic card', reward: 5000 },
        whale: { name: 'Big Spender', desc: 'Spend 10,000 crystals', reward: 2000 },
        hoarder: { name: 'Hoarder', desc: 'Have 50,000 gold', reward: 1000 }
    };

    /** Check achievement conditions */
    function checkAchievements(playerData) {
        const unlocked = [];
        const { totalPulls = 0, uniqueCards = [], totalSpent = 0, gold = 0, cardsByRarity = {} } = playerData;

        if (totalPulls >= 1) unlocked.push('first_pull');
        if (uniqueCards.length >= 10) unlocked.push('collector_10');
        if (uniqueCards.length >= 50) unlocked.push('collector_50');
        if (uniqueCards.length >= 100) unlocked.push('collector_100');
        if ((cardsByRarity.legendary || 0) > 0) unlocked.push('lucky_pull');
        if ((cardsByRarity.mythic || 0) > 0) unlocked.push('jackpot');
        if (totalSpent >= 10000) unlocked.push('whale');
        if (gold >= 50000) unlocked.push('hoarder');

        return unlocked;
    }

    /** Get achievement info */
    function getAchievement(id) {
        return ACHIEVEMENTS[id] || null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LEADERBOARD
    // ═══════════════════════════════════════════════════════════════════════════

    /** Format leaderboard rank */
    function formatRank(rank) {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    }

    /** Render leaderboard entry */
    function renderLeaderboardEntry(entry, index) {
        const rank = index + 1;
        const rankDisplay = formatRank(rank);
        
        return `
            <div class="nw-leaderboard-entry ${rank <= 3 ? 'top-3' : ''}">
                <span class="rank">${rankDisplay}</span>
                <span class="name">${entry.name}</span>
                <span class="score">${entry.score.toLocaleString()}</span>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REWARD CALCULATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Calculate card sell value */
    function getSellValue(card) {
        const rarity = getRarity(card.rarity);
        const baseValue = 10;
        return baseValue * rarity.multiplier;
    }

    /** Calculate duplicate value (fusion) */
    function getDuplicateValue(card, count) {
        const baseValue = getSellValue(card);
        return Math.floor(baseValue * count * 0.5);
    }

    /** Calculate daily login reward */
    function getDailyReward(streak) {
        const baseReward = 50;
        const streakBonus = Math.min(streak, 7) * 10;
        const weekBonus = Math.floor(streak / 7) * 100;
        return baseReward + streakBonus + weekBonus;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Generate guest ID */
    function generateGuestId() {
        return 'guest_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    }

    /** Validate guest ID */
    function isValidGuestId(id) {
        return typeof id === 'string' && id.startsWith('guest_') && id.length > 10;
    }

    /** Hash string (simple) */
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    function init() {
        console.log(`[NW_GUILD] v${VERSION} initialized`);
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════

    return {
        VERSION,
        
        // Rarity
        RARITIES, getRarity, getRarityColor, getRarityGradient, applyRarityStyle,
        
        // Currency
        formatCurrency, formatCrystals, formatGold,
        
        // Gacha
        getPullCost, getPityProgress, getAdjustedRates,
        
        // Cards
        renderCard, renderCardGrid,
        
        // Achievements
        ACHIEVEMENTS, checkAchievements, getAchievement,
        
        // Leaderboard
        formatRank, renderLeaderboardEntry,
        
        // Rewards
        getSellValue, getDuplicateValue, getDailyReward,
        
        // Utils
        generateGuestId, isValidGuestId, simpleHash
    };
})();

window.NW_GUILD = NW_GUILD;
