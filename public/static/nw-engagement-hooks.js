/**
 * NUMBAHWAN ENGAGEMENT HOOKS v1.0
 * "Always one more reason to stay"
 * 
 * Plugs every dead-end in the player flow with a compelling next action.
 * Works WITH the existing NW_ZONE / NW_LOOPS / NW_FRICTION_FREE stack.
 * 
 * Philosophy: Respect time, reward engagement, never waste a moment.
 * 
 * Hooks:
 * 1. Pity Whisperer     — show how close you are to guaranteed pull
 * 2. Comeback Magnet    — "Your cards earned X NWG while you were away"
 * 3. Set Radar          — "You're 1 card away from completing [set]!"
 * 4. Collection Nudge   — after any card action, suggest the next best move
 * 5. Pull Streak Fire   — visible pull streak counter with escalating hype
 * 6. Post-Claim Router  — after daily claim, route to highest-value action
 * 7. Momentum Badges    — micro-milestone celebrations during a session
 */

const NW_HOOKS = {
    version: '1.0.0',
    
    // ═══════════════════════════════════════════════════════════════
    // CONFIG
    // ═══════════════════════════════════════════════════════════════
    config: {
        // Pity whisperer
        pityWhisperThreshold: 0.5,  // Show when past 50% of soft pity
        
        // Comeback magnet
        comebackMinHours: 1,        // Min hours away to trigger
        comebackMaxHours: 168,      // Max 1 week
        
        // Set radar
        setRadarMinOwned: 0.6,      // Show when ≥60% of a set is owned
        
        // Pull streak
        streakHypeThresholds: [3, 5, 10, 15, 20, 30, 50],
        
        // Momentum badges
        sessionMilestones: [
            { actions: 5,   badge: 'Warmed Up',     icon: '🔥', reward: 2 },
            { actions: 15,  badge: 'On a Roll',     icon: '⚡', reward: 5 },
            { actions: 30,  badge: 'Unstoppable',   icon: '💎', reward: 10 },
            { actions: 50,  badge: 'LEGENDARY Run', icon: '👑', reward: 25 },
            { actions: 100, badge: 'MYTHIC SESSION', icon: '🌟', reward: 50 }
        ]
    },
    
    // ═══════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════
    state: {
        pullStreak: 0,
        sessionActions: 0,
        milestonesHit: new Set(),
        lastPityWhisper: 0,
        initialized: false
    },
    
    // ═══════════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════════
    init() {
        if (this.state.initialized) return;
        this.state.initialized = true;
        
        this.injectStyles();
        this.setupComebackMagnet();
        this.setupSetRadar();
        this.setupMomentumTracking();
        this.setupPostClaimRouter();
        this.listenForPulls();
        this.listenForCardActions();
        
        console.log(`[NW_HOOKS] v${this.version} - Engagement Hooks Active`);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // 1. PITY WHISPERER
    // Shows "X pulls until guaranteed [rarity]" after each pull
    // Creates "sunk cost + anticipation" — the most powerful combo
    // ═══════════════════════════════════════════════════════════════
    getPityStatus() {
        // Read from forge engine state
        const forgeState = localStorage.getItem('nw_forge_state');
        if (!forgeState) return null;
        
        try {
            const state = JSON.parse(forgeState);
            const pity = state.pityCounters || state.pity || {};
            
            // Hard pity thresholds (from nw-forge-engine.js v3.2)
            const thresholds = {
                mythic: { soft: 120, hard: 180 },
                legendary: { soft: 30, hard: 50 },
                epic: { soft: 10, hard: 20 }
            };
            
            const status = [];
            
            for (const [rarity, limits] of Object.entries(thresholds)) {
                const current = pity[rarity] || 0;
                const remaining = limits.hard - current;
                const progress = current / limits.hard;
                
                if (progress >= this.config.pityWhisperThreshold) {
                    status.push({
                        rarity,
                        current,
                        remaining,
                        progress,
                        soft: current >= limits.soft,
                        message: this.getPityMessage(rarity, remaining, current >= limits.soft)
                    });
                }
            }
            
            return status.length > 0 ? status : null;
        } catch (e) {
            return null;
        }
    },
    
    getPityMessage(rarity, remaining, inSoftPity) {
        const colors = { mythic: '#ff00ff', legendary: '#ffd700', epic: '#a855f7' };
        const color = colors[rarity] || '#fff';
        
        if (remaining <= 5) {
            return { text: `🔥 ${remaining} pulls to GUARANTEED ${rarity.toUpperCase()}!`, color, urgency: 'critical' };
        }
        if (inSoftPity) {
            return { text: `⚡ Boosted rates! ${remaining} pulls max to ${rarity}`, color, urgency: 'high' };
        }
        return { text: `${remaining} pulls until guaranteed ${rarity}`, color, urgency: 'medium' };
    },
    
    // Render pity whisper in post-pull panel or forge UI
    renderPityWhisper(container) {
        const status = this.getPityStatus();
        if (!status || !container) return;
        
        // Show the closest/most exciting one
        const best = status.sort((a, b) => a.remaining - b.remaining)[0];
        if (!best) return;
        
        const el = document.createElement('div');
        el.className = 'nw-pity-whisper';
        el.style.cssText = `
            text-align: center; padding: 8px 12px; margin: 8px 0 4px;
            background: rgba(${best.message.urgency === 'critical' ? '255,0,100,0.15' : '255,215,0,0.08'});
            border-radius: 8px; font-size: 0.82rem; font-weight: 600;
            color: ${best.message.color};
            border: 1px solid ${best.message.color}33;
            ${best.message.urgency === 'critical' ? 'animation: nwh-pulse 1.5s ease infinite;' : ''}
        `;
        el.textContent = best.message.text;
        
        // Progress bar
        const bar = document.createElement('div');
        bar.style.cssText = `
            height: 3px; border-radius: 2px; margin-top: 6px;
            background: rgba(255,255,255,0.1); overflow: hidden;
        `;
        const fill = document.createElement('div');
        fill.style.cssText = `
            height: 100%; border-radius: 2px; transition: width 0.8s ease;
            background: ${best.message.color};
            width: ${Math.round(best.progress * 100)}%;
        `;
        bar.appendChild(fill);
        el.appendChild(bar);
        
        container.appendChild(el);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // 2. COMEBACK MAGNET
    // "While you were away, your staked cards earned X NWG!"
    // Creates FOMO for NOT playing + instant reward on return
    // ═══════════════════════════════════════════════════════════════
    setupComebackMagnet() {
        const lastVisit = localStorage.getItem('nw_hooks_last_visit');
        const now = Date.now();
        
        if (lastVisit) {
            const hoursAway = (now - parseInt(lastVisit)) / (1000 * 60 * 60);
            
            if (hoursAway >= this.config.comebackMinHours && hoursAway <= this.config.comebackMaxHours) {
                // Calculate pending staking rewards
                const pendingNWG = this.calculatePendingStakingRewards(hoursAway);
                const nearCompleteSets = this.getNearCompleteSets();
                
                setTimeout(() => {
                    this.showComebackBanner(hoursAway, pendingNWG, nearCompleteSets);
                }, 800);
            }
        }
        
        // Update last visit
        localStorage.setItem('nw_hooks_last_visit', now.toString());
    },
    
    calculatePendingStakingRewards(hoursAway) {
        try {
            if (typeof NW_WALLET !== 'undefined') {
                const summary = NW_WALLET.getStakingSummary();
                if (summary && summary.dailyTotal > 0) {
                    return Math.round(summary.dailyTotal * (hoursAway / 24) * 10) / 10;
                }
            }
        } catch (e) {}
        return 0;
    },
    
    showComebackBanner(hours, pendingNWG, nearSets) {
        const banner = document.createElement('div');
        banner.className = 'nw-comeback-banner';
        banner.id = 'nwComebackBanner';
        
        let content = '';
        const hoursText = hours < 24 ? Math.floor(hours) + 'h' : Math.floor(hours / 24) + 'd';
        
        if (pendingNWG > 0) {
            content = `
                <div class="nwcb-title">💰 Welcome back!</div>
                <div class="nwcb-body">Your staked cards earned <strong style="color:#ffd700;">${pendingNWG.toFixed(1)} NWG</strong> while you were away (${hoursText})</div>
                <div class="nwcb-actions">
                    <button class="nwcb-btn nwcb-primary" onclick="NW_HOOKS.claimAndRoute('staking')">⚡ Claim Rewards</button>
                    <button class="nwcb-btn nwcb-secondary" onclick="NW_HOOKS.claimAndRoute('forge')">🎴 Open Packs</button>
                </div>
            `;
        } else {
            // No staking rewards — entice with unclaimed daily or sets
            const canClaim = typeof NW_WALLET !== 'undefined' && NW_WALLET.canClaimDailyReward();
            if (canClaim) {
                content = `
                    <div class="nwcb-title">🌟 Daily Reward Ready!</div>
                    <div class="nwcb-body">You've been away ${hoursText}. Your daily reward is waiting!</div>
                    <div class="nwcb-actions">
                        <button class="nwcb-btn nwcb-primary" onclick="NW_HOOKS.claimAndRoute('daily')">🎁 Claim Now</button>
                        <button class="nwcb-btn nwcb-secondary" onclick="NW_HOOKS.dismissBanner()">Later</button>
                    </div>
                `;
            } else {
                content = `
                    <div class="nwcb-title">🎴 Welcome back!</div>
                    <div class="nwcb-body">The Forge awaits. What will you pull today?</div>
                    <div class="nwcb-actions">
                        <button class="nwcb-btn nwcb-primary" onclick="NW_HOOKS.claimAndRoute('forge')">🔥 Open Packs</button>
                        <button class="nwcb-btn nwcb-secondary" onclick="NW_HOOKS.dismissBanner()">Browse</button>
                    </div>
                `;
            }
        }
        
        // Near-complete set teaser
        if (nearSets && nearSets.length > 0) {
            const best = nearSets[0];
            content += `<div class="nwcb-set-tease">📦 You're <strong>${best.remaining} card${best.remaining > 1 ? 's' : ''}</strong> from completing <strong>${best.setName}</strong>!</div>`;
        }
        
        banner.innerHTML = content;
        document.body.appendChild(banner);
        
        requestAnimationFrame(() => banner.classList.add('show'));
        
        // Auto-dismiss after 12 seconds
        setTimeout(() => this.dismissBanner(), 12000);
    },
    
    claimAndRoute(destination) {
        this.dismissBanner();
        
        if (destination === 'staking' && typeof NW_WALLET !== 'undefined') {
            const result = NW_WALLET.claimAllStakingRewards();
            if (result.totalClaimed > 0) {
                this.showHypeToast(`💰 Claimed ${result.totalClaimed.toFixed(1)} NWG!`, '#ffd700');
            }
        } else if (destination === 'daily' && typeof NW_WALLET !== 'undefined') {
            const result = NW_WALLET.claimDailyReward();
            if (result.success) {
                const r = result.rewards;
                let msg = '🎁 ';
                if (r.nwg) msg += `+${r.nwg} NWG `;
                if (r.gold) msg += `+${r.gold} Gold `;
                if (r.wood) msg += `+${r.wood} Sacred Logs `;
                this.showHypeToast(msg.trim(), '#22c55e');
                
                // After claiming, route to forge with a delay
                setTimeout(() => {
                    this.showHypeToast('🔥 Spend it at the Forge!', '#ff6b00');
                }, 2000);
            }
        } else if (destination === 'forge') {
            location.href = '/forge';
        }
    },
    
    dismissBanner() {
        const banner = document.getElementById('nwComebackBanner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 400);
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // 3. SET RADAR
    // "You're 1 card from completing [Set Name]!" with missing card list
    // Creates targeted desire — player knows EXACTLY what to chase
    // ═══════════════════════════════════════════════════════════════
    getNearCompleteSets() {
        try {
            if (typeof NW_WALLET === 'undefined' || typeof NW_CARDS === 'undefined') return [];
            
            const collection = NW_WALLET.getFullCollection();
            const allCards = NW_CARDS.getAll();
            if (!collection || !allCards) return [];
            
            const ownedIds = new Set(Object.keys(collection).map(Number));
            
            // Group cards by set
            const sets = {};
            allCards.forEach(card => {
                const setName = card.set || 'core';
                if (!sets[setName]) sets[setName] = { total: 0, owned: 0, missing: [] };
                sets[setName].total++;
                if (ownedIds.has(card.id)) {
                    sets[setName].owned++;
                } else {
                    sets[setName].missing.push(card);
                }
            });
            
            // Find sets near completion
            const nearComplete = [];
            for (const [setName, info] of Object.entries(sets)) {
                if (info.total < 2) continue; // Skip tiny sets
                const pct = info.owned / info.total;
                if (pct >= this.config.setRadarMinOwned && info.missing.length > 0 && info.missing.length <= 5) {
                    nearComplete.push({
                        setName: setName.charAt(0).toUpperCase() + setName.slice(1),
                        total: info.total,
                        owned: info.owned,
                        remaining: info.missing.length,
                        missing: info.missing,
                        pct: Math.round(pct * 100)
                    });
                }
            }
            
            // Sort by closest to completion
            return nearComplete.sort((a, b) => a.remaining - b.remaining);
        } catch (e) {
            return [];
        }
    },
    
    setupSetRadar() {
        // Check periodically (e.g., after page load and after pulls)
        setTimeout(() => this.checkSetRadar(), 3000);
    },
    
    checkSetRadar() {
        const nearSets = this.getNearCompleteSets();
        if (nearSets.length === 0) return;
        
        // Only show once per session per set
        const shown = JSON.parse(sessionStorage.getItem('nw_set_radar_shown') || '[]');
        const unshown = nearSets.filter(s => !shown.includes(s.setName));
        if (unshown.length === 0) return;
        
        const best = unshown[0];
        shown.push(best.setName);
        sessionStorage.setItem('nw_set_radar_shown', JSON.stringify(shown));
        
        // Show subtle notification
        setTimeout(() => {
            const missingNames = best.missing.slice(0, 3).map(c => c.name?.en || c.name || '???').join(', ');
            const extra = best.missing.length > 3 ? ` +${best.missing.length - 3} more` : '';
            
            this.showSetRadarNotification(best.setName, best.remaining, best.pct, missingNames + extra);
        }, 5000);
    },
    
    showSetRadarNotification(setName, remaining, pct, missingNames) {
        const notif = document.createElement('div');
        notif.className = 'nw-set-radar';
        notif.innerHTML = `
            <div class="nwsr-icon">📦</div>
            <div class="nwsr-content">
                <div class="nwsr-title">${remaining} card${remaining > 1 ? 's' : ''} from <strong>${setName}</strong> (${pct}%)</div>
                <div class="nwsr-missing">Need: ${missingNames}</div>
            </div>
            <button class="nwsr-cta" onclick="this.parentElement.remove(); location.href='/forge'">🔥 Hunt</button>
            <button class="nwsr-close" onclick="this.parentElement.remove()">×</button>
        `;
        document.body.appendChild(notif);
        
        requestAnimationFrame(() => notif.classList.add('show'));
        setTimeout(() => {
            notif.classList.remove('show');
            setTimeout(() => notif.remove(), 400);
        }, 10000);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // 4. COLLECTION NUDGE
    // After any card action (stake/burn/craft/upgrade), suggest next move
    // Prevents the "okay now what?" moment
    // ═══════════════════════════════════════════════════════════════
    listenForCardActions() {
        const events = ['nw-card-upgraded', 'nw-card-burned', 'nw-staking-claimed'];
        
        events.forEach(evt => {
            window.addEventListener(evt, (e) => {
                this.state.sessionActions++;
                this.checkMomentumMilestone();
                
                // Show contextual nudge after the action's own toast clears
                setTimeout(() => {
                    this.showCollectionNudge(evt, e.detail);
                }, 2500);
            });
        });
    },
    
    showCollectionNudge(eventType, detail) {
        // Don't spam — max 1 nudge per 10 seconds
        if (Date.now() - (this.state.lastNudge || 0) < 10000) return;
        this.state.lastNudge = Date.now();
        
        let nudge;
        
        if (eventType === 'nw-card-upgraded') {
            nudge = this.pickRandom([
                { text: 'Stronger card! Test it in battle?', cta: '⚔️ Battle', href: '/battle' },
                { text: 'Nice upgrade! Get more dupes to keep going', cta: '🎴 Pull', href: '/forge' },
                { text: 'Upgraded! Stake it for daily NWG?', cta: '💰 Stake', action: 'scrollToStake' }
            ]);
        } else if (eventType === 'nw-card-burned') {
            nudge = this.pickRandom([
                { text: 'NWG earned! Spend it on packs?', cta: '🔥 Forge', href: '/forge' },
                { text: 'Burn for more Sacred Logs!', cta: '🃏 Browse', action: 'scrollToCards' },
                { text: 'Cash from cards! Keep the burn streak going', cta: '🔥 More', action: 'scrollToCards' }
            ]);
        } else if (eventType === 'nw-staking-claimed') {
            nudge = this.pickRandom([
                { text: 'Rewards claimed! Reinvest in packs?', cta: '🎴 Forge', href: '/forge' },
                { text: 'NWG in the bank! Upgrade a card?', cta: '⬆️ Cards', action: 'scrollToCards' }
            ]);
        }
        
        if (nudge) {
            this.showNudgeToast(nudge);
        }
    },
    
    showNudgeToast(nudge) {
        // Remove existing
        document.querySelectorAll('.nw-nudge-toast').forEach(el => el.remove());
        
        const toast = document.createElement('div');
        toast.className = 'nw-nudge-toast';
        toast.innerHTML = `
            <span class="nw-nudge-text">${nudge.text}</span>
            <button class="nw-nudge-cta" onclick="${nudge.href ? `location.href='${nudge.href}'` : `NW_HOOKS.doNudgeAction('${nudge.action}')`}">${nudge.cta}</button>
            <button class="nw-nudge-dismiss" onclick="this.parentElement.remove()">×</button>
        `;
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 6000);
    },
    
    doNudgeAction(action) {
        document.querySelectorAll('.nw-nudge-toast').forEach(el => el.remove());
        if (action === 'scrollToStake' || action === 'scrollToCards') {
            // Close modal if open, scroll to collection
            const modal = document.getElementById('cardModal');
            if (modal) modal.remove();
            const grid = document.querySelector('.collection-grid, .card-grid');
            if (grid) grid.scrollIntoView({ behavior: 'smooth' });
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // 5. PULL STREAK FIRE
    // Visible counter that builds hype: "🔥 5 PULL STREAK — luck is building!"
    // Creates sunk-cost momentum — "I've pulled 10 in a row, can't stop now"
    // ═══════════════════════════════════════════════════════════════
    listenForPulls() {
        // Listen for pack-opened / card-revealed events
        window.addEventListener('nw-card-pulled', () => this.onPull());
        window.addEventListener('pack-opened', () => this.onPull());
        
        // Also hook into forge state changes
        document.addEventListener('nw-forge-pull', () => this.onPull());
        
        // Detect pull via wallet transaction log
        if (typeof NW_WALLET !== 'undefined') {
            const originalSpend = NW_WALLET.spend?.bind(NW_WALLET);
            if (originalSpend) {
                NW_WALLET.spend = function(currency, amount, reason) {
                    const result = originalSpend(currency, amount, reason);
                    if (reason && (reason.includes('PULL') || reason.includes('FORGE') || reason.includes('PACK'))) {
                        NW_HOOKS.onPull();
                    }
                    return result;
                };
            }
        }
    },
    
    onPull() {
        this.state.pullStreak++;
        this.state.sessionActions++;
        this.checkMomentumMilestone();
        
        // Show streak counter at thresholds
        const threshold = this.config.streakHypeThresholds.find(t => this.state.pullStreak === t);
        if (threshold) {
            this.showStreakHype(this.state.pullStreak);
        }
        
        // Inject pity whisper into post-pull panel after a delay
        setTimeout(() => {
            const panel = document.getElementById('postPullPanel');
            if (panel && !panel.querySelector('.nw-pity-whisper')) {
                this.renderPityWhisper(panel.querySelector('div') || panel);
            }
        }, 600);
    },
    
    showStreakHype(count) {
        const messages = {
            3:  { text: `🔥 ${count} pulls! Warming up...`, color: '#ff6b00' },
            5:  { text: `🔥🔥 ${count} PULL STREAK! Luck is building!`, color: '#ff4500' },
            10: { text: `⚡ ${count} PULLS! Something big is coming...`, color: '#ffd700' },
            15: { text: `💎 ${count} PULLS — Legendary territory!`, color: '#a855f7' },
            20: { text: `👑 ${count} PULL STREAK — You're RELENTLESS!`, color: '#ff00ff' },
            30: { text: `🌟 ${count} PULLS — MYTHIC energy detected!`, color: '#ff00ff' },
            50: { text: `⭐ ${count} PULLS — ABSOLUTE LEGEND STATUS`, color: '#ffd700' }
        };
        
        const msg = messages[count] || { text: `🔥 ${count} pulls!`, color: '#ff6b00' };
        
        const hype = document.createElement('div');
        hype.className = 'nw-streak-hype';
        hype.style.cssText = `color: ${msg.color}; text-shadow: 0 0 20px ${msg.color}50;`;
        hype.innerHTML = `
            <div class="nwsh-text">${msg.text}</div>
            <div class="nwsh-sub">Pull streak × ${count}</div>
        `;
        document.body.appendChild(hype);
        
        requestAnimationFrame(() => hype.classList.add('show'));
        setTimeout(() => {
            hype.classList.remove('show');
            setTimeout(() => hype.remove(), 500);
        }, 3000);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // 6. POST-CLAIM ROUTER
    // After daily login claim, immediately suggest best next action
    // Converts "claim and leave" into "claim and play"
    // ═══════════════════════════════════════════════════════════════
    setupPostClaimRouter() {
        // Hook into daily reward claim
        if (typeof NW_WALLET !== 'undefined') {
            const originalClaim = NW_WALLET.claimDailyReward?.bind(NW_WALLET);
            if (originalClaim) {
                NW_WALLET.claimDailyReward = function() {
                    const result = originalClaim();
                    if (result.success) {
                        setTimeout(() => NW_HOOKS.showPostClaimRoute(result), 1500);
                    }
                    return result;
                };
            }
        }
    },
    
    showPostClaimRoute(claimResult) {
        const rewards = claimResult.rewards;
        const nwg = rewards?.nwg || 0;
        const gold = rewards?.gold || 0;
        
        // Calculate what they can do with these rewards
        const canPullNWG = Math.floor(nwg / 10); // 10 NWG per pull
        const canPullGold = Math.floor(gold / 100); // 100 Gold per pull
        const totalPulls = canPullNWG + canPullGold;
        
        if (totalPulls > 0) {
            setTimeout(() => {
                this.showHypeToast(`That's ${totalPulls} pull${totalPulls > 1 ? 's' : ''}! Hit the Forge? 🔥`, '#00d4ff', () => {
                    location.href = '/forge';
                });
            }, 1000);
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // 7. MOMENTUM BADGES
    // Micro-milestones within a single session
    // "You've done 15 actions this session — here's 5 Gold!"
    // Creates "I've invested time, might as well keep going"
    // ═══════════════════════════════════════════════════════════════
    setupMomentumTracking() {
        // Track generic actions
        document.addEventListener('click', (e) => {
            const isAction = e.target.closest('button, a, .card, .pack, [onclick]');
            if (isAction) {
                this.state.sessionActions++;
                this.checkMomentumMilestone();
            }
        });
    },
    
    checkMomentumMilestone() {
        const actions = this.state.sessionActions;
        
        for (const milestone of this.config.sessionMilestones) {
            if (actions >= milestone.actions && !this.state.milestonesHit.has(milestone.actions)) {
                this.state.milestonesHit.add(milestone.actions);
                this.awardMomentumBadge(milestone);
                break; // One at a time
            }
        }
    },
    
    awardMomentumBadge(milestone) {
        // Give the Gold reward
        if (typeof NW_WALLET !== 'undefined' && milestone.reward > 0) {
            NW_WALLET.earn('gold', milestone.reward, 'MOMENTUM:' + milestone.badge);
        }
        
        const badge = document.createElement('div');
        badge.className = 'nw-momentum-badge';
        badge.innerHTML = `
            <div class="nwmb-icon">${milestone.icon}</div>
            <div class="nwmb-info">
                <div class="nwmb-title">${milestone.badge}!</div>
                <div class="nwmb-reward">+${milestone.reward} Gold</div>
            </div>
        `;
        document.body.appendChild(badge);
        
        requestAnimationFrame(() => badge.classList.add('show'));
        
        // Play sound if available
        if (typeof NW_SOUNDS !== 'undefined') NW_SOUNDS.play('legendary');
        else if (typeof NW_ZONE !== 'undefined') NW_ZONE.playSound('zoneUp');
        
        setTimeout(() => {
            badge.classList.remove('show');
            setTimeout(() => badge.remove(), 500);
        }, 3500);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════════
    pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },
    
    showHypeToast(text, color, onClick) {
        const toast = document.createElement('div');
        toast.className = 'nw-hype-toast';
        toast.style.borderColor = color || '#ffd700';
        toast.textContent = text;
        if (onClick) {
            toast.style.cursor = 'pointer';
            toast.addEventListener('click', onClick);
        }
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // STYLES
    // ═══════════════════════════════════════════════════════════════
    injectStyles() {
        if (document.getElementById('nw-hooks-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'nw-hooks-styles';
        style.textContent = `
            @keyframes nwh-pulse { 0%,100% { opacity:1; } 50% { opacity:0.7; } }
            @keyframes nwh-slideUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
            @keyframes nwh-slideRight { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }
            @keyframes nwh-badgePop { 0% { transform:scale(0) rotate(-10deg); } 60% { transform:scale(1.15) rotate(2deg); } 100% { transform:scale(1) rotate(0); } }
            
            /* Comeback Banner */
            .nw-comeback-banner {
                position: fixed; top: 0; left: 0; right: 0; z-index: 10001;
                background: linear-gradient(180deg, rgba(13,17,23,0.98), rgba(13,17,23,0.95));
                border-bottom: 2px solid #ffd700;
                padding: 16px 20px 20px; text-align: center;
                transform: translateY(-100%); transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
                font-family: 'Inter', system-ui, sans-serif;
            }
            .nw-comeback-banner.show { transform: translateY(0); }
            .nwcb-title { font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 6px; }
            .nwcb-body { font-size: 0.85rem; color: #aaa; margin-bottom: 12px; }
            .nwcb-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
            .nwcb-btn {
                padding: 10px 20px; border-radius: 10px; border: none;
                font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
                font-family: 'Inter', system-ui, sans-serif;
            }
            .nwcb-btn:active { transform: scale(0.95); }
            .nwcb-primary { background: linear-gradient(135deg, #ffd700, #ff8c00); color: #000; }
            .nwcb-secondary { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid #333; }
            .nwcb-set-tease {
                margin-top: 10px; font-size: 0.8rem; color: #00d4ff;
                padding: 6px 12px; background: rgba(0,212,255,0.08);
                border-radius: 6px; display: inline-block;
            }
            
            /* Set Radar */
            .nw-set-radar {
                position: fixed; bottom: 70px; right: 16px; z-index: 9999;
                background: rgba(13,17,23,0.96); border: 1px solid #00d4ff33;
                border-radius: 12px; padding: 12px 14px; max-width: 320px;
                display: flex; align-items: center; gap: 10px;
                transform: translateX(120%); transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
                font-family: 'Inter', system-ui, sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            }
            .nw-set-radar.show { transform: translateX(0); }
            .nwsr-icon { font-size: 1.8rem; }
            .nwsr-content { flex: 1; }
            .nwsr-title { font-size: 0.82rem; color: #fff; font-weight: 600; }
            .nwsr-missing { font-size: 0.72rem; color: #888; margin-top: 2px; }
            .nwsr-cta {
                padding: 6px 14px; border-radius: 8px; border: none;
                background: linear-gradient(135deg, #ff4500, #ff6b00); color: #fff;
                font-weight: 700; font-size: 0.78rem; cursor: pointer; white-space: nowrap;
            }
            .nwsr-cta:active { transform: scale(0.95); }
            .nwsr-close { background:none; border:none; color:#555; font-size:16px; cursor:pointer; padding:2px 6px; }
            
            /* Nudge Toast */
            .nw-nudge-toast {
                position: fixed; bottom: 70px; left: 50%; transform: translateX(-50%) translateY(30px);
                z-index: 9998; background: rgba(13,17,23,0.96); border: 1px solid #ffd70033;
                border-radius: 12px; padding: 10px 16px; display: flex; align-items: center; gap: 10px;
                opacity: 0; transition: all 0.35s ease;
                font-family: 'Inter', system-ui, sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            }
            .nw-nudge-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
            .nw-nudge-text { font-size: 0.82rem; color: #ccc; }
            .nw-nudge-cta {
                padding: 6px 14px; border-radius: 8px; border: none;
                background: linear-gradient(135deg, #ffd700, #ff8c00); color: #000;
                font-weight: 700; font-size: 0.78rem; cursor: pointer; white-space: nowrap;
            }
            .nw-nudge-cta:active { transform: scale(0.95); }
            .nw-nudge-dismiss { background:none; border:none; color:#555; font-size:14px; cursor:pointer; }
            
            /* Streak Hype */
            .nw-streak-hype {
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.5);
                z-index: 10002; text-align: center; pointer-events: none;
                opacity: 0; transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
            }
            .nw-streak-hype.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            .nwsh-text {
                font-size: 1.4rem; font-weight: 900; letter-spacing: -0.5px;
                font-family: 'Inter', system-ui, sans-serif;
            }
            .nwsh-sub { font-size: 0.75rem; color: #888; margin-top: 4px; font-weight: 600; }
            
            /* Momentum Badge */
            .nw-momentum-badge {
                position: fixed; top: 80px; right: 16px; z-index: 10001;
                background: linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.1));
                border: 2px solid #ffd700; border-radius: 14px;
                padding: 12px 18px; display: flex; align-items: center; gap: 12px;
                transform: scale(0); transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
                font-family: 'Inter', system-ui, sans-serif; box-shadow: 0 4px 20px rgba(255,215,0,0.2);
            }
            .nw-momentum-badge.show { transform: scale(1); }
            .nwmb-icon { font-size: 2rem; }
            .nwmb-title { font-size: 0.9rem; font-weight: 800; color: #ffd700; }
            .nwmb-reward { font-size: 0.75rem; color: #ffaa00; font-weight: 600; }
            
            /* Hype Toast */
            .nw-hype-toast {
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.8);
                z-index: 10002; background: rgba(13,17,23,0.96);
                border: 2px solid #ffd700; border-radius: 14px;
                padding: 14px 24px; text-align: center;
                font-size: 1rem; font-weight: 700; color: #fff;
                opacity: 0; transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
                font-family: 'Inter', system-ui, sans-serif; box-shadow: 0 4px 30px rgba(255,215,0,0.15);
            }
            .nw-hype-toast.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            
            /* Mobile responsive */
            @media (max-width: 480px) {
                .nw-set-radar { bottom: 90px; right: 8px; left: 8px; max-width: unset; }
                .nw-nudge-toast { left: 8px; right: 8px; transform: translateY(30px); bottom: 90px; max-width: unset; }
                .nw-nudge-toast.show { transform: translateY(0); }
                .nw-streak-hype .nwsh-text { font-size: 1.1rem; }
                .nw-comeback-banner { padding: 12px 14px 16px; }
            }
        `;
        document.head.appendChild(style);
    }
};

// ═══════════════════════════════════════════════════════════════
// AUTO-INIT
// ═══════════════════════════════════════════════════════════════
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NW_HOOKS.init());
} else {
    NW_HOOKS.init();
}
