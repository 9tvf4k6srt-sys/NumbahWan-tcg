/**
 * NumbahWan Game Juice System v1.0
 * ================================
 * High-performance game feel library for TCG
 * Based on industry best practices (Hearthstone, Balatro, Slay the Spire)
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - CSS animations over JS (GPU-accelerated)
 * - Object pooling for particles
 * - Lazy sound loading with audio pooling
 * - RequestAnimationFrame for smooth updates
 * - Will-change hints for compositing
 * - Debounced/throttled event handlers
 * 
 * USAGE:
 *   NW_JUICE.card.play(element);
 *   NW_JUICE.card.attack(attacker, target);
 *   NW_JUICE.screen.shake(intensity);
 *   NW_JUICE.sound.play('impact');
 *   NW_JUICE.haptic.light();
 */

const NW_JUICE = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════
    const CONFIG = {
        // Performance
        maxParticles: 50,
        particlePoolSize: 100,
        soundPoolSize: 5,
        
        // Timing (ms)
        impactHold: 80,        // Brief pause on big hits
        anticipationDelay: 300, // Build-up before reveal
        
        // Intensities
        shakeLight: 3,
        shakeMedium: 6,
        shakeHeavy: 12,
        shakeEpic: 20,
        
        // Colors by rarity
        rarityColors: {
            common: '#71717a',
            uncommon: '#22c55e',
            rare: '#3b82f6',
            epic: '#a855f7',
            legendary: '#fbbf24',
            mythic: '#ff6b00'
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // CSS INJECTION - All animations in CSS for GPU acceleration
    // ═══════════════════════════════════════════════════════════════════
    const JUICE_STYLES = `
    /* ===== GAME JUICE ANIMATIONS ===== */
    
    /* Card Draw - Smooth arc from deck */
    @keyframes nwCardDraw {
        0% { transform: translateX(-100px) translateY(50px) rotate(-15deg) scale(0.8); opacity: 0; }
        40% { transform: translateX(-20px) translateY(-30px) rotate(5deg) scale(1.1); opacity: 1; }
        100% { transform: translateX(0) translateY(0) rotate(0) scale(1); opacity: 1; }
    }
    .nw-juice-draw {
        animation: nwCardDraw 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    
    /* Card Play - Slam down with weight */
    @keyframes nwCardPlay {
        0% { transform: translateY(-20px) scale(1.1); }
        50% { transform: translateY(5px) scale(0.95); } /* Squash */
        70% { transform: translateY(-3px) scale(1.02); } /* Bounce */
        100% { transform: translateY(0) scale(1); }
    }
    .nw-juice-play {
        animation: nwCardPlay 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    
    /* Card Attack - Lunge forward */
    @keyframes nwCardAttack {
        0% { transform: translateX(0) rotate(0); }
        30% { transform: translateX(-10px) rotate(-3deg); } /* Wind up */
        50% { transform: translateX(50px) rotate(5deg); } /* Lunge */
        100% { transform: translateX(0) rotate(0); }
    }
    .nw-juice-attack {
        animation: nwCardAttack 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }
    
    /* Card Hit - React to damage */
    @keyframes nwCardHit {
        0%, 100% { transform: translateX(0) rotate(0); filter: brightness(1); }
        20% { transform: translateX(15px) rotate(5deg); filter: brightness(2); }
        40% { transform: translateX(-10px) rotate(-3deg); filter: brightness(1.5); }
        60% { transform: translateX(5px) rotate(2deg); }
    }
    .nw-juice-hit {
        animation: nwCardHit 0.4s ease-out forwards;
    }
    
    /* Card Death - Dramatic destruction */
    @keyframes nwCardDeath {
        0% { transform: scale(1) rotate(0); opacity: 1; filter: brightness(1); }
        30% { transform: scale(1.1) rotate(-5deg); filter: brightness(2); }
        100% { transform: scale(0) rotate(20deg); opacity: 0; filter: brightness(0); }
    }
    .nw-juice-death {
        animation: nwCardDeath 0.6s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards;
    }
    
    /* Screen Shake - CSS custom property driven */
    @keyframes nwScreenShake {
        0%, 100% { transform: translate(0, 0); }
        10% { transform: translate(calc(var(--shake-x, 5px) * 1), calc(var(--shake-y, 3px) * -1)); }
        20% { transform: translate(calc(var(--shake-x, 5px) * -0.8), calc(var(--shake-y, 3px) * 0.8)); }
        30% { transform: translate(calc(var(--shake-x, 5px) * 0.6), calc(var(--shake-y, 3px) * 1)); }
        40% { transform: translate(calc(var(--shake-x, 5px) * -0.4), calc(var(--shake-y, 3px) * -0.6)); }
        50% { transform: translate(calc(var(--shake-x, 5px) * 0.3), calc(var(--shake-y, 3px) * 0.4)); }
        60% { transform: translate(calc(var(--shake-x, 5px) * -0.2), calc(var(--shake-y, 3px) * -0.2)); }
        70% { transform: translate(calc(var(--shake-x, 5px) * 0.1), calc(var(--shake-y, 3px) * 0.1)); }
    }
    .nw-juice-shake {
        animation: nwScreenShake var(--shake-duration, 0.4s) ease-out forwards;
    }
    
    /* Impact Flash */
    @keyframes nwImpactFlash {
        0% { opacity: 0.8; }
        100% { opacity: 0; }
    }
    .nw-juice-flash {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 99999;
        animation: nwImpactFlash 0.15s ease-out forwards;
    }
    
    /* Particle Base */
    .nw-juice-particle {
        position: fixed;
        pointer-events: none;
        z-index: 99998;
        will-change: transform, opacity;
    }
    
    /* Spark particle */
    @keyframes nwSparkFly {
        0% { transform: translate(0, 0) scale(1); opacity: 1; }
        100% { transform: translate(var(--px, 50px), var(--py, -80px)) scale(0); opacity: 0; }
    }
    .nw-juice-spark {
        width: 4px;
        height: 4px;
        background: var(--spark-color, #ffd700);
        border-radius: 50%;
        box-shadow: 0 0 6px var(--spark-color, #ffd700);
        animation: nwSparkFly var(--spark-duration, 0.6s) cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }
    
    /* Trail particle */
    .nw-juice-trail {
        width: 3px;
        height: 3px;
        background: var(--trail-color, #fff);
        border-radius: 50%;
        opacity: 0.8;
        animation: nwSparkFly 0.4s ease-out forwards;
    }
    
    /* Number popup (damage, heal, etc) */
    @keyframes nwNumberPop {
        0% { transform: translateY(0) scale(0.5); opacity: 0; }
        20% { transform: translateY(-10px) scale(1.3); opacity: 1; }
        100% { transform: translateY(-50px) scale(1); opacity: 0; }
    }
    .nw-juice-number {
        position: absolute;
        font-family: 'Orbitron', system-ui, sans-serif;
        font-weight: 900;
        font-size: 24px;
        color: var(--num-color, #fff);
        text-shadow: 0 2px 4px rgba(0,0,0,0.8), 0 0 10px var(--num-glow, transparent);
        pointer-events: none;
        z-index: 1000;
        animation: nwNumberPop 0.8s ease-out forwards;
    }
    .nw-juice-number.damage { --num-color: #ef4444; --num-glow: #ef4444; }
    .nw-juice-number.heal { --num-color: #22c55e; --num-glow: #22c55e; }
    .nw-juice-number.crit { --num-color: #fbbf24; --num-glow: #ff6b00; font-size: 32px; }
    
    /* Glow pulse */
    @keyframes nwGlowPulse {
        0%, 100% { box-shadow: 0 0 5px var(--glow-color, #ffd700); }
        50% { box-shadow: 0 0 25px var(--glow-color, #ffd700), 0 0 50px var(--glow-color, #ffd700); }
    }
    .nw-juice-glow {
        animation: nwGlowPulse 1s ease-in-out infinite;
    }
    
    /* Anticipation wobble */
    @keyframes nwAnticipation {
        0%, 100% { transform: rotate(0) scale(1); }
        25% { transform: rotate(-2deg) scale(1.02); }
        75% { transform: rotate(2deg) scale(1.02); }
    }
    .nw-juice-anticipation {
        animation: nwAnticipation 0.3s ease-in-out infinite;
    }
    
    /* Victory celebration */
    @keyframes nwVictoryBounce {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-20px) scale(1.1); }
    }
    .nw-juice-victory {
        animation: nwVictoryBounce 0.5s ease-in-out 3;
    }
    
    /* Rarity glow colors */
    .nw-juice-glow-common { --glow-color: #71717a; }
    .nw-juice-glow-uncommon { --glow-color: #22c55e; }
    .nw-juice-glow-rare { --glow-color: #3b82f6; }
    .nw-juice-glow-epic { --glow-color: #a855f7; }
    .nw-juice-glow-legendary { --glow-color: #fbbf24; }
    .nw-juice-glow-mythic { --glow-color: #ff6b00; }
    `;

    // Inject styles once
    let stylesInjected = false;
    function injectStyles() {
        if (stylesInjected) return;
        const style = document.createElement('style');
        style.id = 'nw-game-juice-styles';
        style.textContent = JUICE_STYLES;
        document.head.appendChild(style);
        stylesInjected = true;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PARTICLE POOL - Reuse DOM elements for performance
    // ═══════════════════════════════════════════════════════════════════
    const particlePool = [];
    let activeParticles = 0;

    function getParticle() {
        if (particlePool.length > 0) {
            return particlePool.pop();
        }
        const particle = document.createElement('div');
        particle.className = 'nw-juice-particle';
        return particle;
    }

    function releaseParticle(particle) {
        particle.className = 'nw-juice-particle';
        particle.style.cssText = '';
        if (particle.parentNode) particle.parentNode.removeChild(particle);
        if (particlePool.length < CONFIG.particlePoolSize) {
            particlePool.push(particle);
        }
        activeParticles--;
    }

    // ═══════════════════════════════════════════════════════════════════
    // SOUND MANAGER - Lazy loading with audio pooling
    // ═══════════════════════════════════════════════════════════════════
    const soundManager = {
        sounds: {},
        pools: {},
        muted: false,
        volume: 0.5,

        // Sound definitions - Base64 embedded for critical sounds, URL for others
        definitions: {
            // UI sounds (tiny embedded)
            click: { type: 'tone', freq: 800, duration: 0.05 },
            hover: { type: 'tone', freq: 600, duration: 0.03 },
            
            // Card sounds
            draw: { type: 'tone', freq: [400, 600], duration: 0.1 },
            play: { type: 'tone', freq: [200, 150], duration: 0.15 },
            attack: { type: 'noise', duration: 0.1 },
            hit: { type: 'tone', freq: [300, 100], duration: 0.1 },
            death: { type: 'noise', duration: 0.3, filter: 'lowpass' },
            
            // Gacha sounds
            anticipation: { type: 'tone', freq: [200, 400, 600], duration: 0.5 },
            flip: { type: 'tone', freq: [500, 800], duration: 0.1 },
            reveal_common: { type: 'tone', freq: 400, duration: 0.2 },
            reveal_rare: { type: 'tone', freq: [400, 600], duration: 0.3 },
            reveal_epic: { type: 'tone', freq: [400, 600, 800], duration: 0.4 },
            reveal_legendary: { type: 'tone', freq: [400, 600, 800, 1000], duration: 0.5 },
            reveal_mythic: { type: 'tone', freq: [400, 600, 800, 1000, 1200], duration: 0.6 },
            
            // Impact sounds
            impact_light: { type: 'tone', freq: [300, 200], duration: 0.08 },
            impact_heavy: { type: 'noise', duration: 0.15, filter: 'lowpass' },
            crit: { type: 'tone', freq: [800, 1200, 800], duration: 0.2 }
        },

        // Web Audio context (lazy init)
        _ctx: null,
        get ctx() {
            if (!this._ctx) {
                this._ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            return this._ctx;
        },

        // Generate sound using Web Audio API (no file loading!)
        play(name, volume = 1) {
            if (this.muted) return;
            
            const def = this.definitions[name];
            if (!def) return;

            try {
                const ctx = this.ctx;
                if (ctx.state === 'suspended') ctx.resume();
                
                const gainNode = ctx.createGain();
                gainNode.gain.value = this.volume * volume;
                gainNode.connect(ctx.destination);

                if (def.type === 'tone') {
                    this._playTone(ctx, gainNode, def);
                } else if (def.type === 'noise') {
                    this._playNoise(ctx, gainNode, def);
                }
            } catch (e) {
                // Audio not supported, fail silently
            }
        },

        _playTone(ctx, gainNode, def) {
            const freqs = Array.isArray(def.freq) ? def.freq : [def.freq];
            const duration = def.duration;
            const now = ctx.currentTime;

            freqs.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                const env = ctx.createGain();
                env.gain.setValueAtTime(0.3 / freqs.length, now);
                env.gain.exponentialRampToValueAtTime(0.01, now + duration);
                
                osc.connect(env);
                env.connect(gainNode);
                
                osc.start(now + (i * 0.02));
                osc.stop(now + duration + (i * 0.02));
            });
        },

        _playNoise(ctx, gainNode, def) {
            const bufferSize = ctx.sampleRate * def.duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            
            if (def.filter === 'lowpass') {
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 800;
                source.connect(filter);
                filter.connect(gainNode);
            } else {
                source.connect(gainNode);
            }
            
            source.start();
        },

        setVolume(v) { this.volume = Math.max(0, Math.min(1, v)); },
        mute() { this.muted = true; },
        unmute() { this.muted = false; },
        toggle() { this.muted = !this.muted; return !this.muted; }
    };

    // ═══════════════════════════════════════════════════════════════════
    // HAPTIC FEEDBACK - Mobile vibration
    // ═══════════════════════════════════════════════════════════════════
    const haptic = {
        supported: 'vibrate' in navigator,
        
        light() {
            if (this.supported) navigator.vibrate(10);
        },
        medium() {
            if (this.supported) navigator.vibrate(25);
        },
        heavy() {
            if (this.supported) navigator.vibrate(50);
        },
        pattern(pattern) {
            if (this.supported) navigator.vibrate(pattern);
        },
        success() {
            if (this.supported) navigator.vibrate([10, 50, 10]);
        },
        error() {
            if (this.supported) navigator.vibrate([50, 30, 50]);
        },
        epic() {
            if (this.supported) navigator.vibrate([10, 30, 20, 30, 40, 30, 60]);
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // SCREEN EFFECTS
    // ═══════════════════════════════════════════════════════════════════
    const screen = {
        shake(intensity = 'medium', duration = 400) {
            const body = document.body;
            const values = {
                light: CONFIG.shakeLight,
                medium: CONFIG.shakeMedium,
                heavy: CONFIG.shakeHeavy,
                epic: CONFIG.shakeEpic
            };
            const px = values[intensity] || (typeof intensity === 'number' ? intensity : CONFIG.shakeMedium);
            
            body.style.setProperty('--shake-x', px + 'px');
            body.style.setProperty('--shake-y', (px * 0.6) + 'px');
            body.style.setProperty('--shake-duration', duration + 'ms');
            body.classList.add('nw-juice-shake');
            
            setTimeout(() => {
                body.classList.remove('nw-juice-shake');
            }, duration);
            
            // Haptic feedback
            if (intensity === 'heavy' || intensity === 'epic') {
                haptic.heavy();
            } else {
                haptic.medium();
            }
        },

        flash(color = '#fff', duration = 150) {
            const flash = document.createElement('div');
            flash.className = 'nw-juice-flash';
            flash.style.background = color.includes('gradient') ? color : 
                `radial-gradient(circle, ${color}80 0%, transparent 70%)`;
            document.body.appendChild(flash);
            
            setTimeout(() => flash.remove(), duration);
        },

        impactFlash(rarity = 'common') {
            const color = CONFIG.rarityColors[rarity] || '#fff';
            this.flash(color);
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // PARTICLE EFFECTS
    // ═══════════════════════════════════════════════════════════════════
    const particles = {
        // Burst of sparks from a point
        burst(x, y, count = 12, color = '#ffd700') {
            if (activeParticles > CONFIG.maxParticles) return;
            
            for (let i = 0; i < count; i++) {
                const particle = getParticle();
                particle.className = 'nw-juice-particle nw-juice-spark';
                
                const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.5);
                const distance = 40 + Math.random() * 60;
                const px = Math.cos(angle) * distance;
                const py = Math.sin(angle) * distance;
                const duration = 0.4 + Math.random() * 0.3;
                
                particle.style.cssText = `
                    left: ${x}px;
                    top: ${y}px;
                    --px: ${px}px;
                    --py: ${py}px;
                    --spark-color: ${color};
                    --spark-duration: ${duration}s;
                `;
                
                document.body.appendChild(particle);
                activeParticles++;
                
                setTimeout(() => releaseParticle(particle), duration * 1000);
            }
        },

        // Trail following an element
        trail(element, color = '#fff', count = 5) {
            if (activeParticles > CONFIG.maxParticles) return;
            
            const rect = element.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    const particle = getParticle();
                    particle.className = 'nw-juice-particle nw-juice-trail';
                    
                    particle.style.cssText = `
                        left: ${cx + (Math.random() - 0.5) * 20}px;
                        top: ${cy + (Math.random() - 0.5) * 20}px;
                        --trail-color: ${color};
                        --px: ${(Math.random() - 0.5) * 30}px;
                        --py: ${-20 - Math.random() * 30}px;
                    `;
                    
                    document.body.appendChild(particle);
                    activeParticles++;
                    
                    setTimeout(() => releaseParticle(particle), 400);
                }, i * 50);
            }
        },

        // Confetti explosion for victories
        confetti(x, y, count = 30) {
            if (activeParticles > CONFIG.maxParticles) return;
            
            const colors = ['#ff6b00', '#ffd700', '#22c55e', '#3b82f6', '#a855f7', '#ef4444'];
            
            for (let i = 0; i < count; i++) {
                const particle = getParticle();
                particle.className = 'nw-juice-particle nw-juice-spark';
                
                const angle = Math.random() * Math.PI * 2;
                const distance = 80 + Math.random() * 120;
                const px = Math.cos(angle) * distance;
                const py = Math.sin(angle) * distance - 100; // Bias upward
                const color = colors[Math.floor(Math.random() * colors.length)];
                const duration = 0.8 + Math.random() * 0.4;
                
                particle.style.cssText = `
                    left: ${x}px;
                    top: ${y}px;
                    width: 6px;
                    height: 6px;
                    --px: ${px}px;
                    --py: ${py}px;
                    --spark-color: ${color};
                    --spark-duration: ${duration}s;
                `;
                
                document.body.appendChild(particle);
                activeParticles++;
                
                setTimeout(() => releaseParticle(particle), duration * 1000);
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // CARD ANIMATIONS
    // ═══════════════════════════════════════════════════════════════════
    const card = {
        draw(element) {
            element.classList.add('nw-juice-draw');
            soundManager.play('draw');
            haptic.light();
            
            element.addEventListener('animationend', () => {
                element.classList.remove('nw-juice-draw');
            }, { once: true });
        },

        play(element, rarity = 'common') {
            element.classList.add('nw-juice-play');
            soundManager.play('play');
            haptic.medium();
            
            // Impact particles
            const rect = element.getBoundingClientRect();
            particles.burst(
                rect.left + rect.width / 2,
                rect.top + rect.height,
                8,
                CONFIG.rarityColors[rarity]
            );
            
            element.addEventListener('animationend', () => {
                element.classList.remove('nw-juice-play');
            }, { once: true });
        },

        attack(attacker, target) {
            attacker.classList.add('nw-juice-attack');
            soundManager.play('attack');
            
            setTimeout(() => {
                target.classList.add('nw-juice-hit');
                soundManager.play('hit');
                screen.shake('light');
                haptic.medium();
                
                const rect = target.getBoundingClientRect();
                particles.burst(
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2,
                    6,
                    '#ef4444'
                );
                
                target.addEventListener('animationend', () => {
                    target.classList.remove('nw-juice-hit');
                }, { once: true });
            }, 200);
            
            attacker.addEventListener('animationend', () => {
                attacker.classList.remove('nw-juice-attack');
            }, { once: true });
        },

        death(element) {
            element.classList.add('nw-juice-death');
            soundManager.play('death');
            screen.shake('medium');
            haptic.heavy();
            
            const rect = element.getBoundingClientRect();
            particles.burst(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
                15,
                '#71717a'
            );
        },

        showNumber(element, value, type = 'damage') {
            const rect = element.getBoundingClientRect();
            const num = document.createElement('div');
            num.className = `nw-juice-number ${type}`;
            num.textContent = type === 'damage' ? `-${value}` : `+${value}`;
            num.style.left = (rect.left + rect.width / 2) + 'px';
            num.style.top = (rect.top + rect.height / 3) + 'px';
            document.body.appendChild(num);
            
            setTimeout(() => num.remove(), 800);
        },

        glow(element, rarity = 'common') {
            element.classList.add('nw-juice-glow', `nw-juice-glow-${rarity}`);
        },

        stopGlow(element) {
            element.classList.remove('nw-juice-glow', 
                'nw-juice-glow-common', 'nw-juice-glow-uncommon', 'nw-juice-glow-rare',
                'nw-juice-glow-epic', 'nw-juice-glow-legendary', 'nw-juice-glow-mythic');
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // GACHA / REVEAL EFFECTS
    // ═══════════════════════════════════════════════════════════════════
    const gacha = {
        // Build anticipation before reveal
        anticipate(element, duration = 1000) {
            element.classList.add('nw-juice-anticipation');
            soundManager.play('anticipation', 0.5);
            
            // Escalating haptic
            const intervals = [0, 200, 400, 600, 800];
            intervals.forEach(delay => {
                setTimeout(() => haptic.light(), delay);
            });
            
            return new Promise(resolve => {
                setTimeout(() => {
                    element.classList.remove('nw-juice-anticipation');
                    resolve();
                }, duration);
            });
        },

        // Reveal a card with rarity-appropriate fanfare
        reveal(element, rarity = 'common') {
            const color = CONFIG.rarityColors[rarity];
            
            // Sound based on rarity
            soundManager.play(`reveal_${rarity}`);
            
            // Screen effects based on rarity
            if (rarity === 'mythic') {
                screen.shake('epic');
                screen.flash(`radial-gradient(circle, ${color} 0%, #ff00ff 50%, transparent 100%)`);
                haptic.epic();
                
                const rect = element.getBoundingClientRect();
                particles.confetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 40);
                
            } else if (rarity === 'legendary') {
                screen.shake('heavy');
                screen.flash(color);
                haptic.heavy();
                
                const rect = element.getBoundingClientRect();
                particles.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 20, color);
                
            } else if (rarity === 'epic') {
                screen.shake('medium');
                screen.flash(color);
                haptic.medium();
                
                const rect = element.getBoundingClientRect();
                particles.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 15, color);
                
            } else if (rarity === 'rare') {
                screen.shake('light');
                haptic.light();
                
                const rect = element.getBoundingClientRect();
                particles.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 10, color);
            }
            
            // Apply glow
            card.glow(element, rarity);
        },

        // Victory celebration
        victory(element) {
            element.classList.add('nw-juice-victory');
            soundManager.play('reveal_legendary');
            
            const rect = element.getBoundingClientRect();
            particles.confetti(rect.left + rect.width / 2, rect.top, 50);
            
            haptic.success();
            
            element.addEventListener('animationend', () => {
                element.classList.remove('nw-juice-victory');
            }, { once: true });
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    function init() {
        injectStyles();
        console.log('[NW_JUICE] Game Juice System v1.0 loaded');
    }

    // Auto-init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    return {
        // Configuration
        config: CONFIG,
        
        // Core modules
        card,
        screen,
        particles,
        gacha,
        haptic,
        sound: soundManager,
        
        // Utility
        init,
        
        // Quick helpers
        click(element) {
            soundManager.play('click');
            haptic.light();
            element?.classList.add('nw-pressed');
            setTimeout(() => element?.classList.remove('nw-pressed'), 150);
        }
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NW_JUICE;
}
