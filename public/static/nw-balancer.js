/* @deprecated - Orphaned global. Export not used by any page. Candidate for removal. */
/**
 * NumbahWan Auto-Balancer v1.0
 * Monitors economy and auto-adjusts to prevent inflation/deflation
 * 
 * This system:
 * 1. Tracks player earning patterns
 * 2. Detects economy imbalances
 * 3. Suggests/applies price adjustments
 * 4. Logs all balance changes to patch notes
 */

const NW_BALANCER = {
    // Storage keys
    STATS_KEY: 'nw_economy_stats',
    ADJUSTMENTS_KEY: 'nw_balance_adjustments',
    
    // Stats tracking
    stats: null,
    initialized: false,
    
    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
    init() {
        if (this.initialized) return;
        
        this.stats = this.loadStats();
        this.initialized = true;
        
        // Listen for wallet transactions
        window.addEventListener('nw-transaction', (e) => this.trackTransaction(e.detail));
        
        // Listen for config updates
        window.addEventListener('nw-config-update', (e) => this.onConfigUpdate(e.detail));
        
        // Run balance check on page load
        this.runBalanceCheck();
        
        console.log('[NW_BALANCER] Economy monitoring active');
    },
    
    // ═══════════════════════════════════════════════════════════════
    // STATS MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    loadStats() {
        try {
            const saved = localStorage.getItem(this.STATS_KEY);
            if (saved) {
                const stats = JSON.parse(saved);
                // Reset daily stats if new day
                if (this.isNewDay(stats.lastUpdate)) {
                    stats.dailyEarnings = { diamond: 0, gold: 0, iron: 0, stone: 0, wood: 0 };
                    stats.dailySpending = { diamond: 0, gold: 0, iron: 0, stone: 0, wood: 0 };
                }
                return stats;
            }
        } catch (e) {}
        
        return this.createFreshStats();
    },
    
    createFreshStats() {
        return {
            dailyEarnings: { diamond: 0, gold: 0, iron: 0, stone: 0, wood: 0 },
            dailySpending: { diamond: 0, gold: 0, iron: 0, stone: 0, wood: 0 },
            weeklyEarnings: { diamond: 0, gold: 0, iron: 0, stone: 0, wood: 0 },
            totalEarnings: { diamond: 0, gold: 0, iron: 0, stone: 0, wood: 0 },
            totalSpending: { diamond: 0, gold: 0, iron: 0, stone: 0, wood: 0 },
            transactionCount: 0,
            pageVisits: {},
            featureUsage: {},
            lastUpdate: Date.now(),
            startDate: Date.now()
        };
    },
    
    saveStats() {
        this.stats.lastUpdate = Date.now();
        localStorage.setItem(this.STATS_KEY, JSON.stringify(this.stats));
    },
    
    isNewDay(timestamp) {
        const last = new Date(timestamp);
        const now = new Date();
        return last.toDateString() !== now.toDateString();
    },
    
    // ═══════════════════════════════════════════════════════════════
    // TRANSACTION TRACKING
    // ═══════════════════════════════════════════════════════════════
    trackTransaction(detail) {
        if (!detail || !this.stats) return;
        
        const { type, currency, amount, source, page } = detail;
        
        if (type === 'earn' || type === 'add') {
            this.stats.dailyEarnings[currency] = (this.stats.dailyEarnings[currency] || 0) + amount;
            this.stats.weeklyEarnings[currency] = (this.stats.weeklyEarnings[currency] || 0) + amount;
            this.stats.totalEarnings[currency] = (this.stats.totalEarnings[currency] || 0) + amount;
        } else if (type === 'spend' || type === 'subtract') {
            this.stats.dailySpending[currency] = (this.stats.dailySpending[currency] || 0) + amount;
            this.stats.totalSpending[currency] = (this.stats.totalSpending[currency] || 0) + amount;
        }
        
        // Track feature usage
        if (source) {
            this.stats.featureUsage[source] = (this.stats.featureUsage[source] || 0) + 1;
        }
        
        // Track page activity
        if (page) {
            this.stats.pageVisits[page] = (this.stats.pageVisits[page] || 0) + 1;
        }
        
        this.stats.transactionCount++;
        this.saveStats();
        
        // Check balance after significant transactions
        if (this.stats.transactionCount % 10 === 0) {
            this.runBalanceCheck();
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // BALANCE CHECKING
    // ═══════════════════════════════════════════════════════════════
    runBalanceCheck() {
        if (!window.NW_CONFIG) return;
        
        const warnings = NW_CONFIG.checkBalance(this.stats);
        const adjustments = [];
        
        for (const warning of warnings) {
            if (warning.type === 'over_earning') {
                // Calculate suggested adjustment
                const adjustment = this.calculateAdjustment(warning);
                if (adjustment) {
                    adjustments.push(adjustment);
                }
            }
        }
        
        if (adjustments.length > 0) {
            this.proposeAdjustments(adjustments);
        }
        
        return { warnings, adjustments };
    },
    
    calculateAdjustment(warning) {
        const { currency, current, max } = warning;
        const overageRatio = current / max;
        
        // Only suggest adjustments if over by 20%+
        if (overageRatio < 1.2) return null;
        
        // Find which features are contributing most
        const topSources = Object.entries(this.stats.featureUsage)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        return {
            currency,
            reason: `Daily ${currency} earnings (${current}) exceed max (${max}) by ${Math.round((overageRatio - 1) * 100)}%`,
            suggestion: `Consider reducing ${currency} rewards from: ${topSources.map(s => s[0]).join(', ')}`,
            severity: overageRatio > 1.5 ? 'high' : 'medium',
            timestamp: Date.now()
        };
    },
    
    proposeAdjustments(adjustments) {
        // Save proposed adjustments
        localStorage.setItem(this.ADJUSTMENTS_KEY, JSON.stringify({
            proposed: adjustments,
            timestamp: Date.now()
        }));
        
        // Notify system
        window.dispatchEvent(new CustomEvent('nw-balance-warning', {
            detail: { adjustments }
        }));
        
        // Log to console for GM review
        console.warn('[NW_BALANCER] Balance adjustments suggested:', adjustments);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // AUTO-ADJUSTMENT (GM ONLY)
    // ═══════════════════════════════════════════════════════════════
    applyAdjustment(adjustmentKey, newValue) {
        // Only GMs can apply adjustments
        if (!window.NW_WALLET?.isGM) {
            console.warn('[NW_BALANCER] Only GMs can apply balance adjustments');
            return false;
        }
        
        // Update config
        if (window.NW_CONFIG?.economy?.costs?.[adjustmentKey]) {
            const oldValue = NW_CONFIG.economy.costs[adjustmentKey];
            NW_CONFIG.economy.costs[adjustmentKey] = newValue;
            
            // Log the change
            this.logAdjustment(adjustmentKey, oldValue, newValue);
            
            // Notify all pages
            NW_CONFIG.notifyUpdate('balance_adjustment', {
                key: adjustmentKey,
                oldValue,
                newValue
            });
            
            console.log(`[NW_BALANCER] Applied adjustment: ${adjustmentKey} ${JSON.stringify(oldValue)} → ${JSON.stringify(newValue)}`);
            return true;
        }
        
        return false;
    },
    
    logAdjustment(key, oldValue, newValue) {
        const history = JSON.parse(localStorage.getItem('nw_adjustment_history') || '[]');
        history.push({
            key,
            oldValue,
            newValue,
            timestamp: Date.now(),
            appliedBy: window.NW_WALLET?.wallet?.guestId || 'system'
        });
        localStorage.setItem('nw_adjustment_history', JSON.stringify(history.slice(-100)));
    },
    
    // ═══════════════════════════════════════════════════════════════
    // CONFIG UPDATE HANDLER
    // ═══════════════════════════════════════════════════════════════
    onConfigUpdate(detail) {
        if (detail.type === 'init') {
            console.log(`[NW_BALANCER] Config v${detail.version} detected`);
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // REPORTING
    // ═══════════════════════════════════════════════════════════════
    getReport() {
        const daysSinceStart = Math.max(1, (Date.now() - this.stats.startDate) / (1000 * 60 * 60 * 24));
        
        return {
            summary: {
                totalTransactions: this.stats.transactionCount,
                daysSinceStart: Math.round(daysSinceStart),
                avgDailyTransactions: Math.round(this.stats.transactionCount / daysSinceStart)
            },
            earnings: {
                daily: this.stats.dailyEarnings,
                weekly: this.stats.weeklyEarnings,
                total: this.stats.totalEarnings
            },
            spending: {
                daily: this.stats.dailySpending,
                total: this.stats.totalSpending
            },
            netFlow: {
                diamond: (this.stats.totalEarnings.diamond || 0) - (this.stats.totalSpending.diamond || 0),
                gold: (this.stats.totalEarnings.gold || 0) - (this.stats.totalSpending.gold || 0),
                iron: (this.stats.totalEarnings.iron || 0) - (this.stats.totalSpending.iron || 0),
                stone: (this.stats.totalEarnings.stone || 0) - (this.stats.totalSpending.stone || 0),
                wood: (this.stats.totalEarnings.wood || 0) - (this.stats.totalSpending.wood || 0)
            },
            topFeatures: Object.entries(this.stats.featureUsage)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10),
            topPages: Object.entries(this.stats.pageVisits)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
        };
    },
    
    // GM command to view report
    showReport() {
        const report = this.getReport();
        console.table(report.summary);
        console.table(report.earnings);
        console.table(report.spending);
        console.log('Top Features:', report.topFeatures);
        console.log('Top Pages:', report.topPages);
        return report;
    }
};

// Auto-initialize
if (typeof window !== 'undefined') {
    window.NW_BALANCER = NW_BALANCER;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => NW_BALANCER.init());
    } else {
        NW_BALANCER.init();
    }
}
