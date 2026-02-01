/* =====================================================
   NUMBAHWAN ADDICTIVE PROGRESSION SYSTEM v1.0
   - "Almost There" mechanics for maximum engagement
   - Zero-waste currency interchange
   - Early purchase long-term benefits
   - Psychological scarcity for Sacred Log
   ===================================================== */

const NW_PROGRESSION = {
    // ═══════════════════════════════════════════════════════════════
    // IMPROVED EXCHANGE RATES - "Almost There" Design
    // Lower numbers = easier progression = more dopamine hits
    // ═══════════════════════════════════════════════════════════════
    EXCHANGE_RATES: {
        // UPGRADE PATH (lower tier → higher tier)
        'diamond->gold': 10,      // Was 100 - Now 10:1 feels achievable
        'gold->iron': 5,          // Was 50 - Now 5:1 quick progress
        'iron->stone': 5,         // Was 25 - Now 5:1 smooth ladder
        'stone->wood': 50,        // INTENTIONAL BOTTLENECK - makes Sacred Log SPECIAL
        
        // DOWNGRADE PATH (higher tier → lower tier) - slight penalty to encourage forward
        'gold->diamond': 8,       // Get 8 diamond per 1 gold (20% loss)
        'iron->gold': 4,          // Get 4 gold per 1 iron (20% loss)
        'stone->iron': 4,         // Get 4 iron per 1 stone (20% loss)
        'wood->stone': 40         // Get 40 stone per 1 log (20% loss) - DON'T do this!
    },
    
    // ═══════════════════════════════════════════════════════════════
    // SACRED LOG SCARCITY SYSTEM
    // Make the Sacred Log feel LEGENDARY
    // ═══════════════════════════════════════════════════════════════
    SACRED_LOG_CONFIG: {
        // Base exchange: 50 Black Jade = 1 Sacred Log (unchanged)
        baseExchangeRate: 50,
        
        // DAILY LIMIT - creates scarcity and FOMO
        dailyExchangeLimit: 3,    // Max 3 logs from exchange per day
        dailyPurchaseLimit: 10,   // Max 10 logs from purchase per day
        
        // BONUS MILESTONES - reward loyal players
        milestones: {
            firstLog: { reward: 'badge', name: 'Log Seeker', description: 'Obtained your first Sacred Log' },
            tenLogs: { reward: 'bonus_log', name: 'Log Collector', description: '+1 FREE Log at 10 total' },
            fiftyLogs: { reward: 'exchange_discount', discount: 0.1, name: 'Log Hoarder', description: '10% cheaper exchanges' },
            hundredLogs: { reward: 'vip_status', name: 'Log Legend', description: 'Exclusive Log Legend badge' }
        },
        
        // VISUAL RARITY TIER
        rarityTier: 'mythic',     // Treated as mythic-tier currency
        glowColor: '#ff00ff',     // Mythic purple glow
        auraEffect: true          // Enable floating aura particles
    },
    
    // ═══════════════════════════════════════════════════════════════
    // "ALMOST THERE" PROGRESS TRACKING
    // Shows player how close they are to next milestone
    // ═══════════════════════════════════════════════════════════════
    calculateAlmostThere(currency, balance) {
        const thresholds = {
            diamond: [100, 500, 1000, 5000, 10000],    // Progress milestones
            gold: [50, 100, 500, 1000, 5000],
            iron: [25, 50, 100, 500, 1000],
            stone: [10, 25, 50, 100, 500],            // Black Jade milestones
            wood: [1, 5, 10, 25, 50, 100]             // Sacred Log - precious!
        };
        
        const currencyThresholds = thresholds[currency] || [10, 50, 100];
        let nextMilestone = null;
        let progressPercent = 0;
        
        for (const threshold of currencyThresholds) {
            if (balance < threshold) {
                nextMilestone = threshold;
                const prevThreshold = currencyThresholds[currencyThresholds.indexOf(threshold) - 1] || 0;
                progressPercent = ((balance - prevThreshold) / (threshold - prevThreshold)) * 100;
                break;
            }
        }
        
        // Generate "almost there" message for engagement
        let message = null;
        if (progressPercent >= 80) {
            message = `🔥 SO CLOSE! Just ${nextMilestone - balance} more ${currency} to reach ${nextMilestone}!`;
        } else if (progressPercent >= 50) {
            message = `💪 Halfway there! ${nextMilestone - balance} ${currency} to go!`;
        } else if (progressPercent >= 25) {
            message = `📈 Making progress! ${nextMilestone - balance} ${currency} remaining`;
        }
        
        return {
            currentBalance: balance,
            nextMilestone: nextMilestone,
            progress: progressPercent,
            remaining: nextMilestone ? nextMilestone - balance : 0,
            message: message,
            isAlmostThere: progressPercent >= 70
        };
    },
    
    // ═══════════════════════════════════════════════════════════════
    // ZERO-WASTE EXCHANGE CALCULATOR
    // Never leave leftover currency - maximize every transaction
    // ═══════════════════════════════════════════════════════════════
    calculateOptimalExchange(fromCurrency, toCurrency, fromBalance) {
        const rate = this.EXCHANGE_RATES[`${fromCurrency}->${toCurrency}`];
        if (!rate) return null;
        
        const isUpgrade = ['diamond', 'gold', 'iron', 'stone'].indexOf(fromCurrency) < 
                         ['diamond', 'gold', 'iron', 'stone'].indexOf(toCurrency);
        
        if (isUpgrade) {
            // Upgrading: Need X of fromCurrency for 1 toCurrency
            const maxExchanges = Math.floor(fromBalance / rate);
            const exactAmount = maxExchanges * rate;  // Use exact multiples only
            const leftover = fromBalance - exactAmount;
            
            return {
                fromAmount: exactAmount,
                toAmount: maxExchanges,
                leftover: leftover,
                rate: rate,
                suggestion: leftover > 0 ? 
                    `Exchange ${exactAmount} ${fromCurrency} → ${maxExchanges} ${toCurrency}. ` +
                    `Keep ${leftover} ${fromCurrency} for games or next exchange.` : null,
                isOptimal: leftover === 0
            };
        } else {
            // Downgrading: Get X toCurrency per 1 fromCurrency
            return {
                fromAmount: fromBalance,
                toAmount: fromBalance * rate,
                leftover: 0,
                rate: rate,
                suggestion: `Downgrading loses 20% value. Consider keeping ${fromCurrency} instead.`,
                isOptimal: true,
                warning: 'DOWNGRADE_VALUE_LOSS'
            };
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // EARLY PURCHASE BENEFITS CALCULATOR
    // Show players the long-term value of buying early
    // ═══════════════════════════════════════════════════════════════
    EARLY_BIRD_BONUSES: {
        // First week bonuses
        week1: { bonusPercent: 50, label: 'LAUNCH WEEK', color: '#ff00ff' },
        // First month bonuses
        month1: { bonusPercent: 25, label: 'EARLY BIRD', color: '#ffd700' },
        // Ongoing loyalty
        loyalty: { bonusPercent: 10, label: 'LOYAL MEMBER', color: '#22c55e' }
    },
    
    calculatePurchaseValue(baseAmount, purchaseDate = null) {
        const now = new Date();
        const launchDate = new Date('2026-01-01'); // Game launch date
        const daysSinceLaunch = Math.floor((now - launchDate) / (1000 * 60 * 60 * 24));
        
        let bonus = this.EARLY_BIRD_BONUSES.loyalty; // Default
        
        if (daysSinceLaunch <= 7) {
            bonus = this.EARLY_BIRD_BONUSES.week1;
        } else if (daysSinceLaunch <= 30) {
            bonus = this.EARLY_BIRD_BONUSES.month1;
        }
        
        const bonusAmount = Math.floor(baseAmount * (bonus.bonusPercent / 100));
        const totalAmount = baseAmount + bonusAmount;
        
        return {
            baseAmount: baseAmount,
            bonusPercent: bonus.bonusPercent,
            bonusAmount: bonusAmount,
            totalAmount: totalAmount,
            bonusLabel: bonus.label,
            bonusColor: bonus.color,
            message: `🎁 ${bonus.label}: Get ${bonusAmount} BONUS (${bonus.bonusPercent}% extra)!`
        };
    },
    
    // ═══════════════════════════════════════════════════════════════
    // PROGRESSION PATH CALCULATOR
    // Show the full journey from Diamond → Sacred Log
    // ═══════════════════════════════════════════════════════════════
    calculatePathToLog(currentBalances) {
        const path = [];
        const rates = this.EXCHANGE_RATES;
        
        // Diamond → Gold
        const diamondToGold = Math.floor(currentBalances.diamond / rates['diamond->gold']);
        path.push({
            from: 'diamond',
            to: 'gold',
            input: currentBalances.diamond,
            output: diamondToGold,
            rate: rates['diamond->gold'],
            icon: '💎 → 🪙'
        });
        
        // Gold → Iron  
        const totalGold = currentBalances.gold + diamondToGold;
        const goldToIron = Math.floor(totalGold / rates['gold->iron']);
        path.push({
            from: 'gold',
            to: 'iron',
            input: totalGold,
            output: goldToIron,
            rate: rates['gold->iron'],
            icon: '🪙 → ⚙️'
        });
        
        // Iron → Stone (Black Jade)
        const totalIron = currentBalances.iron + goldToIron;
        const ironToStone = Math.floor(totalIron / rates['iron->stone']);
        path.push({
            from: 'iron',
            to: 'stone',
            input: totalIron,
            output: ironToStone,
            rate: rates['iron->stone'],
            icon: '⚙️ → 🪨'
        });
        
        // Stone → Wood (Sacred Log) - THE BIG ONE
        const totalStone = currentBalances.stone + ironToStone;
        const stoneToWood = Math.floor(totalStone / rates['stone->wood']);
        path.push({
            from: 'stone',
            to: 'wood',
            input: totalStone,
            output: stoneToWood,
            rate: rates['stone->wood'],
            icon: '🪨 → 🪵',
            highlight: true,
            mythic: true
        });
        
        return {
            path: path,
            totalLogsAchievable: stoneToWood,
            totalPullsPossible: stoneToWood,
            message: stoneToWood > 0 ? 
                `🔥 You can forge ${stoneToWood} Sacred Log${stoneToWood > 1 ? 's' : ''}!` :
                `Keep grinding! You need ${rates['stone->wood'] - totalStone} more Black Jade for a Sacred Log.`
        };
    },
    
    // ═══════════════════════════════════════════════════════════════
    // DAILY CHECK-IN REWARDS SYSTEM
    // Incentivize daily play with escalating rewards
    // ═══════════════════════════════════════════════════════════════
    DAILY_REWARDS: [
        { day: 1, currency: 'diamond', amount: 50, label: 'Day 1' },
        { day: 2, currency: 'gold', amount: 20, label: 'Day 2' },
        { day: 3, currency: 'iron', amount: 15, label: 'Day 3' },
        { day: 4, currency: 'diamond', amount: 100, label: 'Day 4' },
        { day: 5, currency: 'stone', amount: 10, label: 'Day 5 - Black Jade!' },
        { day: 6, currency: 'gold', amount: 50, label: 'Day 6' },
        { day: 7, currency: 'wood', amount: 1, label: 'Day 7 - FREE SACRED LOG!', mythic: true }
    ],
    
    calculateDailyReward(streakDay) {
        const dayIndex = ((streakDay - 1) % 7); // 7-day cycle
        const multiplier = Math.floor((streakDay - 1) / 7) + 1; // Increases each week
        const baseReward = this.DAILY_REWARDS[dayIndex];
        
        return {
            ...baseReward,
            amount: baseReward.amount * multiplier,
            streak: streakDay,
            weekMultiplier: multiplier,
            isLogDay: baseReward.currency === 'wood'
        };
    },
    
    // ═══════════════════════════════════════════════════════════════
    // FOMO TRIGGERS - Limited time urgency
    // ═══════════════════════════════════════════════════════════════
    generateFOMO() {
        const triggers = [
            {
                type: 'limited_exchange',
                message: '⚡ LIMITED: Exchange rate 40:1 for next 2 hours!',
                expires: Date.now() + (2 * 60 * 60 * 1000),
                discount: 20
            },
            {
                type: 'bonus_log',
                message: '🔥 BONUS LOG: Pull now for 2x mythic chance!',
                expires: Date.now() + (4 * 60 * 60 * 1000)
            },
            {
                type: 'whale_spotted',
                message: '🐋 WHALE ALERT: Player just pulled 3 MYTHICS!',
                expires: Date.now() + (30 * 60 * 1000)
            }
        ];
        
        return triggers[Math.floor(Math.random() * triggers.length)];
    },
    
    // Initialize progression tracking for current session
    init() {
        console.log('[NW_PROGRESSION] 📈 Progression system initialized');
        console.log('[NW_PROGRESSION] Exchange rates:', this.EXCHANGE_RATES);
        console.log('[NW_PROGRESSION] Sacred Log config:', this.SACRED_LOG_CONFIG);
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('nw-progression-ready', { detail: this }));
    }
};

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    NW_PROGRESSION.init();
});

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NW_PROGRESSION;
}
