/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NW GACHA ULTIMATE - The Most Addictive Pull Animation System
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Based on addiction-by-design psychology:
 * 1. Variable Ratio Reinforcement - Unpredictable timing
 * 2. Anticipation > Reward - The waiting IS the drug
 * 3. Escalating Audio/Visual Cues - Builds excitement
 * 4. Near Miss Effect - "Almost got legendary!"
 * 5. Skip Button Anxiety - Missing out on epic animations
 * 
 * PHASES:
 * 1. SUMMON CIRCLE - Tap to summon (commitment)
 * 2. ORBS GATHER - Energy balls converge (building)
 * 3. RARITY REVEAL - Orb color hints at result (anticipation)
 * 4. EXPLOSION - Pack shatters based on rarity (climax)
 * 5. CARD REVEAL - Slow dramatic flip (payoff)
 */

const NW_GACHA = {
    version: '1.0.0',
    
    // Rarity configurations
    RARITIES: {
        common: {
            color: '#9ca3af',
            glow: 'rgba(156,163,175,0.5)',
            sound: 'whoosh',
            delay: 800, // Fast, boring
            particles: 5,
            screenEffect: null,
            orbCount: 3
        },
        uncommon: {
            color: '#22c55e',
            glow: 'rgba(34,197,94,0.6)',
            sound: 'whoosh',
            delay: 1000,
            particles: 8,
            screenEffect: null,
            orbCount: 4
        },
        rare: {
            color: '#3b82f6',
            glow: 'rgba(59,130,246,0.7)',
            sound: 'shimmer',
            delay: 1500,
            particles: 12,
            screenEffect: null,
            orbCount: 5
        },
        epic: {
            color: '#a855f7',
            glow: 'rgba(168,85,247,0.8)',
            sound: 'epic_reveal',
            delay: 2500, // Longer wait = more tension
            particles: 20,
            screenEffect: 'pulse_purple',
            orbCount: 6
        },
        legendary: {
            color: '#ffd700',
            glow: 'rgba(255,215,0,0.9)',
            sound: 'legendary_fanfare',
            delay: 3500, // Maximum suspense
            particles: 35,
            screenEffect: 'golden_flash',
            orbCount: 8
        },
        mythic: {
            color: '#ff00ff',
            glow: 'rgba(255,0,255,1)',
            sound: 'mythic_explosion',
            delay: 4500, // Heart-pounding wait
            particles: 50,
            screenEffect: 'rainbow_burst',
            orbCount: 12
        }
    },

    // State
    isAnimating: false,
    skipEnabled: false,
    currentResolve: null,
    
    /**
     * Main entry point - Show the gacha pull experience
     */
    async pull(cards) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        // Determine highest rarity
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
        const highestRarity = cards.reduce((highest, card) => {
            return rarityOrder.indexOf(card.rarity) > rarityOrder.indexOf(highest) 
                ? card.rarity : highest;
        }, 'common');
        
        console.log('[NW_GACHA] Starting pull for', cards.length, 'cards, highest:', highestRarity);
        
        // Create and show the overlay
        const overlay = this._createOverlay();
        document.body.appendChild(overlay);
        
        await this._sleep(100);
        overlay.classList.add('active');
        
        return new Promise(async (resolve) => {
            this.currentResolve = resolve;
            
            try {
                // PHASE 1: Summon Circle (commitment)
                await this._phase1_summonCircle(overlay, cards.length);
                
                // PHASE 2: Orbs Gather (building tension)
                await this._phase2_orbsGather(overlay, highestRarity);
                
                // PHASE 3: Rarity Reveal (the suspense)
                await this._phase3_rarityReveal(overlay, highestRarity);
                
                // PHASE 4: Explosion (climax)
                await this._phase4_explosion(overlay, highestRarity);
                
                // PHASE 5: Cards Fly Out (payoff tease)
                await this._phase5_cardsReveal(overlay, cards);
                
            } catch (e) {
                console.error('[NW_GACHA] Animation error:', e);
            }
            
            // Cleanup
            overlay.classList.remove('active');
            await this._sleep(400);
            overlay.remove();
            
            this.isAnimating = false;
            resolve();
        });
    },
    
    /**
     * PHASE 1: SUMMON CIRCLE
     * Player taps to activate - creates commitment
     */
    async _phase1_summonCircle(overlay, cardCount) {
        const container = overlay.querySelector('.nw-gacha-container');
        
        // Create summon circle
        const circle = document.createElement('div');
        circle.className = 'nw-summon-circle';
        circle.innerHTML = `
            <div class="nw-circle-outer"></div>
            <div class="nw-circle-middle"></div>
            <div class="nw-circle-inner"></div>
            <div class="nw-circle-runes">
                ${this._generateRunes()}
            </div>
            <div class="nw-summon-text">
                <span class="nw-tap-text">TAP TO SUMMON</span>
                <span class="nw-card-count">${cardCount} ${cardCount === 1 ? 'CARD' : 'CARDS'}</span>
            </div>
        `;
        container.appendChild(circle);
        
        // Play ambient sound
        this._playSound('summon_ambient');
        
        // Wait for tap
        await new Promise(resolve => {
            const handleTap = () => {
                circle.removeEventListener('click', handleTap);
                circle.removeEventListener('touchend', handleTap);
                
                // Activation animation
                circle.classList.add('activating');
                this._playSound('summon_activate');
                this._haptic('impact');
                
                setTimeout(resolve, 800);
            };
            
            // Pulse animation to encourage tap
            circle.classList.add('waiting');
            circle.addEventListener('click', handleTap);
            circle.addEventListener('touchend', handleTap);
        });
        
        // Circle activated - spin up
        circle.classList.add('active');
        await this._sleep(500);
    },
    
    /**
     * PHASE 2: ORBS GATHER
     * Energy orbs fly in from edges - building anticipation
     */
    async _phase2_orbsGather(overlay, rarity) {
        const container = overlay.querySelector('.nw-gacha-container');
        const circle = container.querySelector('.nw-summon-circle');
        const config = this.RARITIES[rarity];
        
        // Create orbs
        const orbCount = config.orbCount;
        const orbs = [];
        
        for (let i = 0; i < orbCount; i++) {
            const orb = document.createElement('div');
            orb.className = 'nw-energy-orb';
            
            // Random start position at screen edges
            const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
            let startX, startY;
            switch(edge) {
                case 0: startX = Math.random() * 100; startY = -10; break;
                case 1: startX = 110; startY = Math.random() * 100; break;
                case 2: startX = Math.random() * 100; startY = 110; break;
                case 3: startX = -10; startY = Math.random() * 100; break;
            }
            
            orb.style.cssText = `
                left: ${startX}%;
                top: ${startY}%;
                --delay: ${i * 0.15}s;
            `;
            container.appendChild(orb);
            orbs.push(orb);
            
            // Small haptic for each orb
            setTimeout(() => this._haptic('tap'), i * 150);
        }
        
        // Play gathering sound
        this._playSound('orbs_gather');
        
        // Animate orbs to center
        await this._sleep(200);
        orbs.forEach((orb, i) => {
            orb.classList.add('gathering');
        });
        
        // Wait for orbs to converge
        await this._sleep(1200);
        
        // Orbs merge - flash
        this._screenFlash('#fff', 0.3);
        this._haptic('flip');
        orbs.forEach(orb => orb.classList.add('merged'));
        
        await this._sleep(400);
        
        // Remove orbs
        orbs.forEach(orb => orb.remove());
    },
    
    /**
     * PHASE 3: RARITY REVEAL
     * The central orb changes color to hint at rarity
     * THIS IS THE ADDICTION MOMENT - variable delay based on rarity
     */
    async _phase3_rarityReveal(overlay, rarity) {
        const container = overlay.querySelector('.nw-gacha-container');
        const circle = container.querySelector('.nw-summon-circle');
        const config = this.RARITIES[rarity];
        
        // Create the result orb
        const resultOrb = document.createElement('div');
        resultOrb.className = 'nw-result-orb';
        container.appendChild(resultOrb);
        
        // Start with white/unknown
        resultOrb.style.background = 'radial-gradient(circle, #fff 0%, #aaa 100%)';
        resultOrb.classList.add('pulsing');
        
        // Play suspense sound
        this._playSound('suspense_build');
        
        // VARIABLE DELAY - The psychology trick
        // Higher rarity = longer wait = more dopamine
        const delay = config.delay + (Math.random() * 500); // Add randomness
        
        // During the wait, show "scanning" effects
        const scanInterval = setInterval(() => {
            // Flash through colors to build suspense
            const fakeColors = ['#9ca3af', '#22c55e', '#3b82f6', '#a855f7'];
            const fakeColor = fakeColors[Math.floor(Math.random() * fakeColors.length)];
            resultOrb.style.boxShadow = `0 0 30px ${fakeColor}`;
        }, 200);
        
        // Heartbeat sound increases
        let heartbeatSpeed = 800;
        const heartbeatInterval = setInterval(() => {
            this._haptic('tap');
            heartbeatSpeed = Math.max(200, heartbeatSpeed - 50);
        }, heartbeatSpeed);
        
        // Show skip button after 2 seconds (creates anxiety about missing animation)
        setTimeout(() => {
            const skipBtn = overlay.querySelector('.nw-skip-btn');
            if (skipBtn) skipBtn.classList.add('visible');
        }, 2000);
        
        await this._sleep(delay);
        
        clearInterval(scanInterval);
        clearInterval(heartbeatInterval);
        
        // REVEAL THE TRUE COLOR
        resultOrb.classList.remove('pulsing');
        resultOrb.classList.add('revealing');
        resultOrb.style.background = `radial-gradient(circle, ${config.color} 0%, ${config.glow} 100%)`;
        resultOrb.style.boxShadow = `0 0 50px ${config.color}, 0 0 100px ${config.glow}`;
        
        this._playSound(config.sound);
        this._haptic('impact');
        
        // Screen effect based on rarity
        if (config.screenEffect) {
            this._triggerScreenEffect(config.screenEffect);
        }
        
        // Hide circle
        circle.classList.add('hidden');
        
        await this._sleep(600);
    },
    
    /**
     * PHASE 4: EXPLOSION
     * The orb explodes with particles matching rarity
     */
    async _phase4_explosion(overlay, rarity) {
        const container = overlay.querySelector('.nw-gacha-container');
        const resultOrb = container.querySelector('.nw-result-orb');
        const config = this.RARITIES[rarity];
        
        // Explosion animation
        resultOrb.classList.add('exploding');
        
        // Create particles
        for (let i = 0; i < config.particles; i++) {
            const particle = document.createElement('div');
            particle.className = 'nw-explosion-particle';
            
            const angle = (i / config.particles) * Math.PI * 2;
            const distance = 100 + Math.random() * 200;
            const size = 4 + Math.random() * 12;
            
            particle.style.cssText = `
                --angle: ${angle}rad;
                --distance: ${distance}px;
                --size: ${size}px;
                --color: ${config.color};
                --delay: ${Math.random() * 0.2}s;
            `;
            container.appendChild(particle);
            
            // Remove after animation
            setTimeout(() => particle.remove(), 1500);
        }
        
        // Screen shake
        this._screenShake(rarity === 'mythic' ? 15 : rarity === 'legendary' ? 10 : 5);
        this._screenFlash(config.color, rarity === 'mythic' ? 0.8 : 0.5);
        this._haptic(rarity === 'mythic' ? 'heavy' : 'impact');
        
        await this._sleep(800);
        
        // Remove orb
        resultOrb.remove();
    },
    
    /**
     * PHASE 5: CARDS REVEAL
     * Cards fly out from center
     */
    async _phase5_cardsReveal(overlay, cards) {
        const container = overlay.querySelector('.nw-gacha-container');
        
        // Create card preview container
        const cardPreview = document.createElement('div');
        cardPreview.className = 'nw-card-preview';
        container.appendChild(cardPreview);
        
        // Show cards flying out with stagger
        for (let i = 0; i < Math.min(cards.length, 5); i++) {
            const card = cards[i];
            const cardEl = document.createElement('div');
            cardEl.className = 'nw-preview-card';
            cardEl.style.cssText = `
                --index: ${i};
                --rarity-color: ${this.RARITIES[card.rarity].color};
            `;
            cardEl.innerHTML = `
                <img src="/static/images/cards/${card.img}" alt="${card.name}">
            `;
            cardPreview.appendChild(cardEl);
            
            await this._sleep(150);
            cardEl.classList.add('visible');
            this._haptic('tap');
        }
        
        // Show "more cards" indicator if applicable
        if (cards.length > 5) {
            const moreIndicator = document.createElement('div');
            moreIndicator.className = 'nw-more-cards';
            moreIndicator.textContent = `+${cards.length - 5} MORE`;
            cardPreview.appendChild(moreIndicator);
        }
        
        await this._sleep(1000);
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    _createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'nw-gacha-overlay';
        overlay.innerHTML = `
            <div class="nw-gacha-container"></div>
            <button class="nw-skip-btn">SKIP ›</button>
        `;
        
        // Skip button handler
        overlay.querySelector('.nw-skip-btn').addEventListener('click', () => {
            this.skipEnabled = true;
        });
        
        return overlay;
    },
    
    _generateRunes() {
        const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ'];
        return runes.map((rune, i) => 
            `<span class="nw-rune" style="--index: ${i}">${rune}</span>`
        ).join('');
    },
    
    _sleep(ms) {
        if (this.skipEnabled) return Promise.resolve();
        return new Promise(r => setTimeout(r, ms));
    },
    
    _playSound(name) {
        try {
            if (typeof NW_JUICE !== 'undefined') {
                NW_JUICE.sound.play(name);
            } else if (typeof PremiumAudio !== 'undefined') {
                PremiumAudio.play(name);
            } else if (typeof NW_SOUNDS !== 'undefined') {
                NW_SOUNDS.play(name);
            }
        } catch (e) {
            console.log('[NW_GACHA] Sound not available:', name);
        }
    },
    
    _haptic(type) {
        try {
            if (typeof NW_JUICE !== 'undefined') {
                NW_JUICE.haptic[type]?.();
            } else if (navigator.vibrate) {
                const patterns = {
                    tap: [10],
                    flip: [20, 10, 20],
                    impact: [50],
                    heavy: [100, 30, 100]
                };
                navigator.vibrate(patterns[type] || [10]);
            }
        } catch (e) {}
    },
    
    _screenFlash(color, intensity = 0.5) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            inset: 0;
            background: ${color};
            opacity: ${intensity};
            z-index: 100000;
            pointer-events: none;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(flash);
        setTimeout(() => flash.style.opacity = '0', 50);
        setTimeout(() => flash.remove(), 400);
    },
    
    _screenShake(intensity = 5) {
        const el = document.body;
        const originalTransform = el.style.transform;
        let shakeCount = 0;
        const shakeInterval = setInterval(() => {
            if (shakeCount++ > 10) {
                clearInterval(shakeInterval);
                el.style.transform = originalTransform;
                return;
            }
            const x = (Math.random() - 0.5) * intensity;
            const y = (Math.random() - 0.5) * intensity;
            el.style.transform = `translate(${x}px, ${y}px)`;
        }, 30);
    },
    
    _triggerScreenEffect(effect) {
        switch(effect) {
            case 'pulse_purple':
                this._screenFlash('#a855f7', 0.3);
                break;
            case 'golden_flash':
                this._screenFlash('#ffd700', 0.5);
                setTimeout(() => this._screenFlash('#fff', 0.3), 200);
                break;
            case 'rainbow_burst':
                ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#9400d3'].forEach((color, i) => {
                    setTimeout(() => this._screenFlash(color, 0.2), i * 80);
                });
                break;
        }
    }
};

// Export for use
if (typeof window !== 'undefined') {
    window.NW_GACHA = NW_GACHA;
}
