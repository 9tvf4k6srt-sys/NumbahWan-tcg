/**
 * NUMBAHWAN ZONE SYSTEM v1.0
 * "The Zone" - Flow State Engineering for Stress Relief
 * 
 * Based on flow state psychology principles:
 * - Immediate engagement (no waiting)
 * - Variable ratio reinforcement (unpredictable micro-rewards)
 * - Friction elimination (seamless transitions)
 * - Continuous ambient feedback
 * - Near-miss psychology (always almost there)
 * - Seamless loops (actions flow into actions)
 * 
 * Goal: Create a stress-free flow state that helps users
 * disconnect from daily worries through engaging gameplay
 */

const NW_ZONE = {
    version: '1.0.0',
    
    // =========================================
    // ZONE STATE TRACKING
    // =========================================
    state: {
        zoneLevel: 0,           // 0-100 "depth" in the zone
        sessionStart: null,
        totalActions: 0,
        rewardStreak: 0,
        lastRewardTime: 0,
        microRewardsGiven: 0,
        ambientMode: false,
        flowScore: 0
    },
    
    // =========================================
    // CONFIGURATION - VARIABLE RATIO SCHEDULES
    // =========================================
    config: {
        // Micro-reward timing (variable ratio - slot machine psychology)
        microRewardMinInterval: 3000,   // Min 3 seconds between
        microRewardMaxInterval: 12000,  // Max 12 seconds
        microRewardChance: 0.35,        // 35% base chance per action
        
        // Zone level thresholds
        zoneLevelIncrement: 2,          // Points per action
        zoneLevelDecay: 0.5,            // Points lost per second of inactivity
        maxZoneLevel: 100,
        
        // Near-miss frequency (optimal is ~30-35%)
        nearMissChance: 0.32,
        
        // Ambient feedback intervals
        ambientPulseInterval: 5000,     // Background pulse every 5s
        progressTeaseInterval: 15000,   // "You're close!" every 15s
        
        // Flow state indicators
        flowThreshold: 60,              // Zone level to consider "in flow"
        deepFlowThreshold: 85           // Deep immersion threshold
    },
    
    // =========================================
    // MICRO-REWARDS POOL (Variable, Unpredictable)
    // =========================================
    microRewards: [
        // Tiny instant gratification (most common)
        { type: 'sparkle', weight: 30, msg: '+✨', value: 0, visual: 'sparkle' },
        { type: 'glow', weight: 25, msg: '💫', value: 0, visual: 'glow-pulse' },
        { type: 'combo', weight: 15, msg: 'Nice!', value: 0, visual: 'text-pop' },
        
        // Small currency drops (uncommon)
        { type: 'gold', weight: 12, msg: '+1 Gold', value: 1, currency: 'gold', visual: 'coin-drop' },
        { type: 'gold2', weight: 8, msg: '+2 Gold', value: 2, currency: 'gold', visual: 'coin-rain' },
        
        // XP boosts (rare)
        { type: 'xp', weight: 5, msg: '+5 XP', value: 5, currency: 'xp', visual: 'xp-burst' },
        
        // Lucky drops (very rare)
        { type: 'lucky', weight: 3, msg: '🍀 Lucky!', value: 5, currency: 'gold', visual: 'rainbow' },
        { type: 'bonus', weight: 2, msg: '🎰 BONUS!', value: 10, currency: 'gold', visual: 'jackpot' }
    ],
    
    // =========================================
    // NEAR-MISS MESSAGES (Creates "almost there" feeling)
    // =========================================
    nearMissMessages: [
        { msg: 'So close!', icon: '😮' },
        { msg: 'Almost had it!', icon: '🔥' },
        { msg: 'Just missed!', icon: '💨' },
        { msg: 'Next time for sure!', icon: '✨' },
        { msg: 'One more try...', icon: '🎯' },
        { msg: 'Almost legendary!', icon: '⭐' },
        { msg: 'The odds are with you!', icon: '🍀' },
        { msg: 'So close to rare!', icon: '💎' }
    ],
    
    // =========================================
    // PROGRESS TEASE MESSAGES (Encouragement)
    // =========================================
    progressTeases: [
        { msg: "You're on a roll!", threshold: 20 },
        { msg: "Keep going! Something good is coming...", threshold: 30 },
        { msg: "Luck is building up!", threshold: 40 },
        { msg: "Mythic cards appear after streaks like this...", threshold: 50 },
        { msg: "The cards sense your dedication!", threshold: 60 },
        { msg: "You're in the ZONE!", threshold: 70 },
        { msg: "Legendary drops happen to dedicated players...", threshold: 80 },
        { msg: "✨ DEEP FLOW STATE ACHIEVED ✨", threshold: 85 }
    ],
    
    // =========================================
    // AMBIENT SOUNDS (Creates atmosphere)
    // =========================================
    ambientSounds: {
        enabled: true,
        volume: 0.1,
        sounds: {
            microReward: 'https://cdn.freesound.org/sounds/341/341695.mp3',    // Soft chime
            nearMiss: 'https://cdn.freesound.org/sounds/341/341234.mp3',       // Whoosh
            zoneUp: 'https://cdn.freesound.org/sounds/320/320655.mp3',         // Ascending tone
            deepFlow: 'https://cdn.freesound.org/sounds/411/411642.mp3'        // Achievement
        }
    },
    
    // =========================================
    // INITIALIZATION
    // =========================================
    init() {
        this.state.sessionStart = Date.now();
        this.loadState();
        this.injectStyles();
        this.createZoneIndicator();
        this.startAmbientLoop();
        this.bindGlobalActions();
        
        // Entry animation - instant engagement
        this.showEntryReward();
        
        console.log(`🌀 NW_ZONE v${this.version} initialized - Zone System Active`);
    },
    
    loadState() {
        const saved = localStorage.getItem('nw_zone_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Restore some state, but reset zone level (starts fresh each session)
            this.state.totalActions = parsed.totalActions || 0;
            this.state.microRewardsGiven = parsed.microRewardsGiven || 0;
        }
    },
    
    saveState() {
        localStorage.setItem('nw_zone_state', JSON.stringify({
            totalActions: this.state.totalActions,
            microRewardsGiven: this.state.microRewardsGiven,
            lastSession: Date.now()
        }));
    },
    
    // =========================================
    // INSTANT ENGAGEMENT - Entry Reward
    // =========================================
    showEntryReward() {
        // Immediate reward upon entering ANY page
        setTimeout(() => {
            this.showMicroFeedback('Welcome back! ✨', 'sparkle');
            this.incrementZone(5);
            
            // Check for returning user bonus
            const lastSession = localStorage.getItem('nw_zone_state');
            if (lastSession) {
                const parsed = JSON.parse(lastSession);
                const hoursSince = (Date.now() - parsed.lastSession) / (1000 * 60 * 60);
                
                if (hoursSince > 1 && hoursSince < 24) {
                    setTimeout(() => {
                        this.showMicroFeedback('Return bonus! +5 Gold 🎁', 'coin-drop');
                        this.giveReward('gold', 5);
                    }, 1500);
                }
            }
        }, 500);
    },
    
    // =========================================
    // ZONE LEVEL MANAGEMENT
    // =========================================
    incrementZone(amount = this.config.zoneLevelIncrement) {
        this.state.zoneLevel = Math.min(this.config.maxZoneLevel, this.state.zoneLevel + amount);
        this.updateZoneIndicator();
        
        // Check flow state transitions
        if (this.state.zoneLevel >= this.config.deepFlowThreshold && !this.state.deepFlowAchieved) {
            this.state.deepFlowAchieved = true;
            this.onDeepFlowAchieved();
        } else if (this.state.zoneLevel >= this.config.flowThreshold && !this.state.flowAchieved) {
            this.state.flowAchieved = true;
            this.onFlowAchieved();
        }
    },
    
    decayZone() {
        if (this.state.zoneLevel > 0) {
            this.state.zoneLevel = Math.max(0, this.state.zoneLevel - this.config.zoneLevelDecay);
            this.updateZoneIndicator();
            
            // Reset flow states if fallen out
            if (this.state.zoneLevel < this.config.flowThreshold) {
                this.state.flowAchieved = false;
            }
            if (this.state.zoneLevel < this.config.deepFlowThreshold) {
                this.state.deepFlowAchieved = false;
            }
        }
    },
    
    onFlowAchieved() {
        this.showZoneNotification("🔥 You're in the Zone!", 'flow');
        document.body.classList.add('nw-flow-state');
        this.playSound('zoneUp');
    },
    
    onDeepFlowAchieved() {
        this.showZoneNotification("✨ DEEP FLOW STATE ✨", 'deep-flow');
        document.body.classList.add('nw-deep-flow');
        this.playSound('deepFlow');
        this.giveReward('gold', 10);
    },
    
    // =========================================
    // VARIABLE RATIO REINFORCEMENT
    // =========================================
    onUserAction(actionType = 'generic') {
        this.state.totalActions++;
        this.incrementZone();
        
        // Variable ratio reward check
        const timeSinceLastReward = Date.now() - this.state.lastRewardTime;
        const minInterval = this.config.microRewardMinInterval;
        
        if (timeSinceLastReward > minInterval) {
            // Calculate dynamic chance (increases with zone level)
            const baseChance = this.config.microRewardChance;
            const zoneBonus = (this.state.zoneLevel / 100) * 0.15; // Up to 15% bonus
            const chance = baseChance + zoneBonus;
            
            if (Math.random() < chance) {
                this.giveMicroReward();
            } else if (Math.random() < this.config.nearMissChance) {
                // Near miss feedback
                this.showNearMiss();
            }
        }
        
        // Streak tracking
        this.state.rewardStreak++;
        
        this.saveState();
    },
    
    giveMicroReward() {
        // Weighted random selection
        const totalWeight = this.microRewards.reduce((sum, r) => sum + r.weight, 0);
        let random = Math.random() * totalWeight;
        
        let selected = this.microRewards[0];
        for (const reward of this.microRewards) {
            random -= reward.weight;
            if (random <= 0) {
                selected = reward;
                break;
            }
        }
        
        // Apply reward
        this.showMicroFeedback(selected.msg, selected.visual);
        
        if (selected.value > 0 && selected.currency) {
            this.giveReward(selected.currency, selected.value);
        }
        
        this.state.lastRewardTime = Date.now();
        this.state.microRewardsGiven++;
        this.playSound('microReward');
    },
    
    giveReward(currency, amount) {
        // Integrate with wallet system
        if (typeof NW_WALLET !== 'undefined' && NW_WALLET.earn) {
            NW_WALLET.earn(currency, amount, 'ZONE:micro_reward');
        } else {
            // Fallback: store locally
            const wallet = JSON.parse(localStorage.getItem('nw_wallet') || '{}');
            wallet[currency] = (wallet[currency] || 0) + amount;
            localStorage.setItem('nw_wallet', JSON.stringify(wallet));
        }
    },
    
    // =========================================
    // NEAR-MISS PSYCHOLOGY
    // =========================================
    showNearMiss() {
        const nearMiss = this.nearMissMessages[Math.floor(Math.random() * this.nearMissMessages.length)];
        this.showMicroFeedback(`${nearMiss.icon} ${nearMiss.msg}`, 'near-miss');
        this.playSound('nearMiss');
        
        // Near misses actually increase engagement
        this.incrementZone(1);
    },
    
    // =========================================
    // AMBIENT FEEDBACK LOOP
    // =========================================
    startAmbientLoop() {
        // Zone decay loop (creates urgency to keep playing)
        setInterval(() => {
            this.decayZone();
        }, 1000);
        
        // Ambient pulse (subtle visual feedback)
        setInterval(() => {
            if (this.state.zoneLevel > 30) {
                this.pulseAmbient();
            }
        }, this.config.ambientPulseInterval);
        
        // Progress tease (encouraging messages)
        setInterval(() => {
            this.showProgressTease();
        }, this.config.progressTeaseInterval);
    },
    
    pulseAmbient() {
        const indicator = document.getElementById('nw-zone-indicator');
        if (indicator) {
            indicator.classList.add('pulse');
            setTimeout(() => indicator.classList.remove('pulse'), 500);
        }
    },
    
    showProgressTease() {
        // Only show if actively engaged
        if (this.state.zoneLevel < 20) return;
        if (Date.now() - this.state.lastRewardTime > 30000) return; // Inactive
        
        // Find appropriate message for current zone level
        const applicable = this.progressTeases.filter(t => this.state.zoneLevel >= t.threshold);
        if (applicable.length > 0) {
            const tease = applicable[applicable.length - 1]; // Highest applicable
            this.showSubtleHint(tease.msg);
        }
    },
    
    // =========================================
    // VISUAL FEEDBACK SYSTEM
    // =========================================
    showMicroFeedback(message, visual) {
        const popup = document.createElement('div');
        popup.className = `nw-micro-feedback ${visual}`;
        popup.innerHTML = `<span>${message}</span>`;
        
        // Random position (creates unpredictability)
        const x = 30 + Math.random() * 40; // 30-70% from left
        const y = 30 + Math.random() * 40; // 30-70% from top
        popup.style.left = `${x}%`;
        popup.style.top = `${y}%`;
        
        document.body.appendChild(popup);
        
        // Animate in
        requestAnimationFrame(() => {
            popup.classList.add('show');
            
            // Remove after animation
            setTimeout(() => {
                popup.classList.add('hide');
                setTimeout(() => popup.remove(), 300);
            }, 1500);
        });
    },
    
    showSubtleHint(message) {
        const hint = document.createElement('div');
        hint.className = 'nw-subtle-hint';
        hint.textContent = message;
        document.body.appendChild(hint);
        
        requestAnimationFrame(() => {
            hint.classList.add('show');
            setTimeout(() => {
                hint.classList.remove('show');
                setTimeout(() => hint.remove(), 500);
            }, 3000);
        });
    },
    
    showZoneNotification(message, type) {
        const notif = document.createElement('div');
        notif.className = `nw-zone-notif ${type}`;
        notif.innerHTML = `
            <div class="nw-zone-notif-content">
                <span class="nw-zone-notif-text">${message}</span>
            </div>
        `;
        document.body.appendChild(notif);
        
        requestAnimationFrame(() => {
            notif.classList.add('show');
            setTimeout(() => {
                notif.classList.remove('show');
                setTimeout(() => notif.remove(), 500);
            }, 3000);
        });
    },
    
    // =========================================
    // ZONE INDICATOR UI
    // =========================================
    createZoneIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'nw-zone-indicator';
        indicator.className = 'nw-zone-indicator';
        indicator.innerHTML = `
            <div class="nw-zone-bar">
                <div class="nw-zone-fill"></div>
            </div>
            <div class="nw-zone-label">
                <span class="nw-zone-icon">🔥</span>
                <span class="nw-zone-text">Zone</span>
            </div>
        `;
        document.body.appendChild(indicator);
    },
    
    updateZoneIndicator() {
        const fill = document.querySelector('.nw-zone-fill');
        const label = document.querySelector('.nw-zone-text');
        const icon = document.querySelector('.nw-zone-icon');
        
        if (fill) {
            fill.style.width = `${this.state.zoneLevel}%`;
            
            // Color transitions based on zone level
            if (this.state.zoneLevel >= 85) {
                fill.style.background = 'linear-gradient(90deg, #ff6b00, #ffd700, #ff6b00)';
            } else if (this.state.zoneLevel >= 60) {
                fill.style.background = 'linear-gradient(90deg, #ff6b00, #ff9500)';
            } else {
                fill.style.background = '#ff6b00';
            }
        }
        
        if (label) {
            if (this.state.zoneLevel >= 85) {
                label.textContent = 'DEEP FLOW!';
            } else if (this.state.zoneLevel >= 60) {
                label.textContent = 'In the Zone!';
            } else if (this.state.zoneLevel >= 30) {
                label.textContent = 'Getting there...';
            } else {
                label.textContent = 'Zone';
            }
        }
        
        if (icon) {
            if (this.state.zoneLevel >= 85) {
                icon.textContent = '✨';
            } else if (this.state.zoneLevel >= 60) {
                icon.textContent = '🔥';
            } else if (this.state.zoneLevel >= 30) {
                icon.textContent = '💫';
            } else {
                icon.textContent = '⚡';
            }
        }
    },
    
    // =========================================
    // SOUND SYSTEM
    // =========================================
    playSound(soundName) {
        if (!this.ambientSounds.enabled) return;
        
        // Use NW_SOUNDS if available
        if (typeof NW_SOUNDS !== 'undefined' && NW_SOUNDS.play) {
            const soundMap = {
                'microReward': 'collect',
                'nearMiss': 'whoosh',
                'zoneUp': 'levelup',
                'deepFlow': 'achievement'
            };
            NW_SOUNDS.play(soundMap[soundName] || 'click');
        }
    },
    
    // =========================================
    // SEAMLESS LOOP SYSTEM
    // =========================================
    suggestNextAction() {
        // Based on current page, suggest next action
        const currentPage = location.pathname.replace(/^\/|\.html$/g, '') || 'index';
        
        const suggestions = {
            'forge': [
                { text: 'Open another pack!', href: '/forge', icon: '🎴' },
                { text: 'Check your collection', href: '/collection', icon: '📚' },
                { text: 'Battle with new cards', href: '/battle', icon: '⚔️' }
            ],
            'battle': [
                { text: 'Battle again!', href: '/battle', icon: '⚔️' },
                { text: 'Upgrade your deck', href: '/deckbuilder', icon: '📋' },
                { text: 'Open more packs', href: '/forge', icon: '🎴' }
            ],
            'collection': [
                { text: 'Build a deck', href: '/deckbuilder', icon: '📋' },
                { text: 'Get more cards', href: '/forge', icon: '🎴' },
                { text: 'Test in battle', href: '/battle', icon: '⚔️' }
            ],
            'default': [
                { text: 'Open packs', href: '/forge', icon: '🎴' },
                { text: 'Start battling', href: '/battle', icon: '⚔️' },
                { text: 'Explore cards', href: '/cards', icon: '📚' }
            ]
        };
        
        return suggestions[currentPage] || suggestions.default;
    },
    
    showNextActionPrompt() {
        const suggestions = this.suggestNextAction();
        const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        
        const prompt = document.createElement('div');
        prompt.className = 'nw-next-action';
        prompt.innerHTML = `
            <a href="${suggestion.href}" class="nw-next-action-btn">
                <span class="nw-next-icon">${suggestion.icon}</span>
                <span class="nw-next-text">${suggestion.text}</span>
                <span class="nw-next-arrow">→</span>
            </a>
        `;
        document.body.appendChild(prompt);
        
        requestAnimationFrame(() => prompt.classList.add('show'));
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            prompt.classList.remove('show');
            setTimeout(() => prompt.remove(), 300);
        }, 10000);
    },
    
    // =========================================
    // GLOBAL ACTION BINDING
    // =========================================
    bindGlobalActions() {
        // Track all clicks as user actions
        document.addEventListener('click', (e) => {
            // Only count meaningful clicks
            const target = e.target.closest('button, a, .card, .pack, .nw-interactive, [data-zone-action]');
            if (target) {
                const actionType = target.dataset.zoneAction || 'click';
                this.onUserAction(actionType);
            }
        });
        
        // Track scrolling (engagement indicator)
        let scrollTimeout;
        document.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.incrementZone(0.5); // Small zone boost for scrolling
            }, 200);
        }, { passive: true });
        
        // Track keyboard activity
        document.addEventListener('keydown', (e) => {
            if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
                this.incrementZone(0.3);
            }
        });
    },
    
    // =========================================
    // STYLES
    // =========================================
    injectStyles() {
        if (document.getElementById('nw-zone-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'nw-zone-styles';
        style.textContent = `
            /* ==========================================
             * NW_ZONE STYLES - Flow State UI
             * ========================================== */
            
            /* ----- ZONE INDICATOR ----- */
            .nw-zone-indicator {
                position: fixed;
                top: 60px;
                right: 16px;
                z-index: 500;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 12px;
                background: rgba(10, 10, 20, 0.9);
                border: 1px solid rgba(255, 107, 0, 0.3);
                border-radius: 20px;
                backdrop-filter: blur(8px);
                transition: all 0.3s ease;
            }
            .nw-zone-indicator.pulse {
                box-shadow: 0 0 20px rgba(255, 107, 0, 0.5);
            }
            .nw-zone-bar {
                width: 60px;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
            }
            .nw-zone-fill {
                height: 100%;
                width: 0%;
                background: #ff6b00;
                border-radius: 3px;
                transition: width 0.3s ease, background 0.5s ease;
            }
            .nw-zone-label {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.7);
            }
            .nw-zone-icon {
                font-size: 12px;
            }
            
            /* ----- MICRO FEEDBACK POPUPS ----- */
            .nw-micro-feedback {
                position: fixed;
                z-index: 10000;
                pointer-events: none;
                font-size: 16px;
                font-weight: 700;
                color: #fff;
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
                opacity: 0;
                transform: translateY(20px) scale(0.8);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .nw-micro-feedback.show {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            .nw-micro-feedback.hide {
                opacity: 0;
                transform: translateY(-30px) scale(1.2);
            }
            
            /* Feedback variants */
            .nw-micro-feedback.sparkle {
                color: #ffd700;
                animation: sparkleAnim 0.5s ease;
            }
            .nw-micro-feedback.glow-pulse {
                color: #ff6b00;
                animation: glowPulse 0.5s ease;
            }
            .nw-micro-feedback.coin-drop {
                color: #ffd700;
                font-size: 18px;
            }
            .nw-micro-feedback.coin-rain {
                color: #ffd700;
                font-size: 20px;
                animation: coinRain 0.5s ease;
            }
            .nw-micro-feedback.xp-burst {
                color: #22c55e;
                animation: xpBurst 0.5s ease;
            }
            .nw-micro-feedback.rainbow {
                background: linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                font-size: 20px;
            }
            .nw-micro-feedback.jackpot {
                color: #ffd700;
                font-size: 24px;
                animation: jackpotAnim 0.8s ease;
            }
            .nw-micro-feedback.near-miss {
                color: #ff9500;
                font-style: italic;
            }
            
            @keyframes sparkleAnim {
                0%, 100% { filter: brightness(1); }
                50% { filter: brightness(1.5); }
            }
            @keyframes glowPulse {
                0% { text-shadow: 0 0 5px #ff6b00; }
                50% { text-shadow: 0 0 20px #ff6b00, 0 0 40px #ff6b00; }
                100% { text-shadow: 0 0 5px #ff6b00; }
            }
            @keyframes coinRain {
                0% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-10px) scale(1.1); }
                100% { transform: translateY(0) scale(1); }
            }
            @keyframes xpBurst {
                0% { transform: scale(1); }
                50% { transform: scale(1.3); }
                100% { transform: scale(1); }
            }
            @keyframes jackpotAnim {
                0% { transform: scale(1) rotate(0deg); }
                25% { transform: scale(1.2) rotate(-5deg); }
                50% { transform: scale(1.3) rotate(5deg); }
                75% { transform: scale(1.2) rotate(-3deg); }
                100% { transform: scale(1) rotate(0deg); }
            }
            
            /* ----- SUBTLE HINTS ----- */
            .nw-subtle-hint {
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                z-index: 600;
                padding: 12px 24px;
                background: rgba(10, 10, 20, 0.9);
                border: 1px solid rgba(255, 107, 0, 0.3);
                border-radius: 25px;
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
                font-weight: 500;
                opacity: 0;
                transition: all 0.4s ease;
                backdrop-filter: blur(8px);
            }
            .nw-subtle-hint.show {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            
            /* ----- ZONE NOTIFICATIONS ----- */
            .nw-zone-notif {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.8);
                z-index: 10001;
                padding: 24px 48px;
                background: rgba(10, 10, 20, 0.95);
                border: 2px solid #ff6b00;
                border-radius: 20px;
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .nw-zone-notif.show {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            .nw-zone-notif.flow {
                border-color: #ff6b00;
                box-shadow: 0 0 40px rgba(255, 107, 0, 0.5);
            }
            .nw-zone-notif.deep-flow {
                border-color: #ffd700;
                background: linear-gradient(145deg, rgba(255, 215, 0, 0.1), rgba(10, 10, 20, 0.95));
                box-shadow: 0 0 60px rgba(255, 215, 0, 0.5);
            }
            .nw-zone-notif-text {
                font-size: 1.5rem;
                font-weight: 700;
                background: linear-gradient(135deg, #fff, #ff6b00);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .nw-zone-notif.deep-flow .nw-zone-notif-text {
                background: linear-gradient(135deg, #fff, #ffd700);
                -webkit-background-clip: text;
            }
            
            /* ----- NEXT ACTION PROMPT ----- */
            .nw-next-action {
                position: fixed;
                bottom: 80px;
                right: 20px;
                z-index: 500;
                opacity: 0;
                transform: translateX(20px);
                transition: all 0.3s ease;
            }
            .nw-next-action.show {
                opacity: 1;
                transform: translateX(0);
            }
            .nw-next-action-btn {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 20px;
                background: linear-gradient(135deg, #ff6b00, #ff9500);
                border-radius: 25px;
                color: white;
                text-decoration: none;
                font-weight: 600;
                box-shadow: 0 4px 20px rgba(255, 107, 0, 0.4);
                transition: all 0.2s ease;
            }
            .nw-next-action-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 6px 30px rgba(255, 107, 0, 0.5);
            }
            .nw-next-icon {
                font-size: 20px;
            }
            .nw-next-arrow {
                opacity: 0.7;
                transition: transform 0.2s ease;
            }
            .nw-next-action-btn:hover .nw-next-arrow {
                transform: translateX(4px);
            }
            
            /* ----- FLOW STATE BODY EFFECTS ----- */
            body.nw-flow-state {
                /* Subtle vignette effect */
            }
            body.nw-flow-state::after {
                content: '';
                position: fixed;
                inset: 0;
                pointer-events: none;
                background: radial-gradient(ellipse at center, transparent 50%, rgba(255, 107, 0, 0.05) 100%);
                z-index: 9999;
            }
            body.nw-deep-flow::after {
                background: radial-gradient(ellipse at center, transparent 40%, rgba(255, 215, 0, 0.08) 100%);
                animation: deepFlowPulse 3s ease-in-out infinite;
            }
            @keyframes deepFlowPulse {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 1; }
            }
            
            /* ----- RESPONSIVE ----- */
            @media (max-width: 480px) {
                .nw-zone-indicator {
                    top: auto;
                    bottom: 70px;
                    right: 10px;
                    padding: 4px 10px;
                }
                .nw-zone-bar {
                    width: 40px;
                }
                .nw-zone-label {
                    display: none;
                }
                .nw-subtle-hint {
                    bottom: 140px;
                    font-size: 12px;
                    padding: 10px 20px;
                }
                .nw-next-action {
                    bottom: 130px;
                    right: 10px;
                }
            }
        `;
        document.head.appendChild(style);
    },
    
    // =========================================
    // PUBLIC API
    // =========================================
    
    // Call after any meaningful user action
    action(type = 'generic') {
        this.onUserAction(type);
    },
    
    // Get current zone level
    getZoneLevel() {
        return this.state.zoneLevel;
    },
    
    // Check if user is in flow state
    isInFlow() {
        return this.state.zoneLevel >= this.config.flowThreshold;
    },
    
    // Check if user is in deep flow
    isInDeepFlow() {
        return this.state.zoneLevel >= this.config.deepFlowThreshold;
    },
    
    // Manually trigger next action prompt
    promptNextAction() {
        this.showNextActionPrompt();
    },
    
    // Disable zone system
    disable() {
        const indicator = document.getElementById('nw-zone-indicator');
        if (indicator) indicator.remove();
        document.body.classList.remove('nw-flow-state', 'nw-deep-flow');
    }
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NW_ZONE.init());
} else {
    NW_ZONE.init();
}

// Expose globally
window.NW_ZONE = NW_ZONE;

console.log('🌀 NW_ZONE module loaded - Flow State Engineering Active');
