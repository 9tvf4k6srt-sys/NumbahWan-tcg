/**
 * NumbahWan 3D Animation Engine v1.0
 * ==================================
 * In-house 3D animation system for TCG
 * - Gacha pack opening animations
 * - Card flip and reveal effects
 * - PvP battle animations
 * - Card interactions and combat
 * 
 * PERFORMANCE OPTIMIZED:
 * - CSS 3D transforms (GPU accelerated)
 * - RequestAnimationFrame timing
 * - Object pooling for particles
 * - Will-change hints
 * - Composite-only animations
 */

const NW_3D = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════
    const CONFIG = {
        // Timing
        packOpenDuration: 1500,
        cardRevealDuration: 800,
        attackDuration: 400,
        deathDuration: 600,
        
        // 3D Settings
        perspective: 1200,
        cardDepth: 50,
        
        // Particle limits
        maxParticles: 100,
        
        // Easing functions
        easing: {
            // Smooth start and end
            easeInOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
            // Bounce at end
            easeOutBack: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
            // Elastic bounce
            easeOutElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
            // Quick start, slow end
            easeOutQuart: t => 1 - Math.pow(1 - t, 4),
            // Dramatic impact
            easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
            // Spring physics
            spring: (t, tension = 0.5) => 1 - Math.cos(t * Math.PI * (0.5 + 2.5 * tension)) * Math.exp(-t * 6)
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // CSS INJECTION
    // ═══════════════════════════════════════════════════════════════════
    const STYLES = `
    /* ===== 3D SCENE CONTAINER ===== */
    .nw-3d-scene {
        perspective: ${CONFIG.perspective}px;
        perspective-origin: 50% 50%;
        transform-style: preserve-3d;
    }
    
    .nw-3d-object {
        transform-style: preserve-3d;
        will-change: transform;
    }
    
    /* ===== GACHA PACK ===== */
    .nw-pack {
        width: 200px;
        height: 280px;
        position: relative;
        transform-style: preserve-3d;
        cursor: pointer;
    }
    
    .nw-pack-face {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        border-radius: 12px;
        overflow: hidden;
    }
    
    .nw-pack-front {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        border: 3px solid #ffd700;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 
            0 0 20px rgba(255, 215, 0, 0.3),
            inset 0 0 40px rgba(255, 215, 0, 0.1);
    }
    
    .nw-pack-back {
        transform: rotateY(180deg);
        background: linear-gradient(135deg, #2d1f0f, #1a1208);
        border: 3px solid #8B5A2B;
    }
    
    .nw-pack-side {
        position: absolute;
        background: linear-gradient(to bottom, #ffd700, #b8860b);
    }
    
    .nw-pack-side-left {
        width: ${CONFIG.cardDepth}px;
        height: 100%;
        left: -${CONFIG.cardDepth}px;
        transform: rotateY(-90deg);
        transform-origin: right center;
    }
    
    .nw-pack-side-right {
        width: ${CONFIG.cardDepth}px;
        height: 100%;
        right: -${CONFIG.cardDepth}px;
        transform: rotateY(90deg);
        transform-origin: left center;
    }
    
    .nw-pack-side-top {
        width: 100%;
        height: ${CONFIG.cardDepth}px;
        top: -${CONFIG.cardDepth}px;
        transform: rotateX(90deg);
        transform-origin: bottom center;
    }
    
    .nw-pack-side-bottom {
        width: 100%;
        height: ${CONFIG.cardDepth}px;
        bottom: -${CONFIG.cardDepth}px;
        transform: rotateX(-90deg);
        transform-origin: top center;
    }
    
    /* Pack opening animation */
    .nw-pack.opening {
        animation: packShake 0.5s ease-in-out;
    }
    
    .nw-pack.opened .nw-pack-top-flap {
        animation: packFlapOpen 0.6s ease-out forwards;
    }
    
    @keyframes packShake {
        0%, 100% { transform: translateX(0) rotateZ(0); }
        20% { transform: translateX(-10px) rotateZ(-2deg); }
        40% { transform: translateX(10px) rotateZ(2deg); }
        60% { transform: translateX(-8px) rotateZ(-1deg); }
        80% { transform: translateX(8px) rotateZ(1deg); }
    }
    
    @keyframes packFlapOpen {
        0% { transform: rotateX(0deg); }
        100% { transform: rotateX(-160deg); }
    }
    
    /* Pack glow by rarity */
    .nw-pack.glow-mythic { 
        box-shadow: 0 0 40px rgba(255, 0, 255, 0.8), 0 0 80px rgba(0, 255, 255, 0.5);
        animation: mythicPackPulse 1s ease-in-out infinite;
    }
    .nw-pack.glow-legendary { 
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 107, 0, 0.5);
        animation: legendaryPackPulse 1.2s ease-in-out infinite;
    }
    .nw-pack.glow-epic { 
        box-shadow: 0 0 25px rgba(168, 85, 247, 0.7);
    }
    
    @keyframes mythicPackPulse {
        0%, 100% { box-shadow: 0 0 40px rgba(255, 0, 255, 0.8), 0 0 80px rgba(0, 255, 255, 0.5); }
        50% { box-shadow: 0 0 60px rgba(255, 0, 255, 1), 0 0 120px rgba(0, 255, 255, 0.8); }
    }
    
    @keyframes legendaryPackPulse {
        0%, 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 107, 0, 0.5); }
        50% { box-shadow: 0 0 50px rgba(255, 215, 0, 1), 0 0 100px rgba(255, 107, 0, 0.8); }
    }
    
    /* ===== CARD STACK (Cards flying out) ===== */
    .nw-card-stack {
        position: relative;
        transform-style: preserve-3d;
    }
    
    .nw-stacked-card {
        position: absolute;
        transform-style: preserve-3d;
        transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    /* ===== PVP BATTLE ARENA ===== */
    .nw-battle-arena {
        perspective: 1000px;
        perspective-origin: 50% 70%;
        transform-style: preserve-3d;
    }
    
    .nw-battle-field {
        transform: rotateX(45deg);
        transform-style: preserve-3d;
    }
    
    .nw-battle-card {
        transform-style: preserve-3d;
        transition: transform 0.3s ease-out;
    }
    
    /* Card attack animation (works with both .nw-battle-card and .board-card) */
    .nw-battle-card.attacking,
    .board-card.attacking {
        animation: cardAttack3D 0.5s ease-out;
    }
    
    @keyframes cardAttack3D {
        0% { transform: translateZ(0) scale(1); }
        30% { transform: translateZ(50px) translateY(-20px) scale(1.1) rotateX(-10deg); }
        50% { transform: translateZ(100px) translateY(-30px) scale(1.15) rotateX(-5deg); }
        70% { transform: translateZ(50px) scale(1.05); }
        100% { transform: translateZ(0) scale(1); }
    }
    
    /* Card hit reaction */
    .nw-battle-card.hit,
    .board-card.hit {
        animation: cardHit3D 0.4s ease-out;
    }
    
    @keyframes cardHit3D {
        0% { transform: translateZ(0) rotateY(0); filter: brightness(1); }
        20% { transform: translateZ(-30px) rotateY(15deg) rotateX(10deg); filter: brightness(2); }
        50% { transform: translateZ(-15px) rotateY(-10deg); filter: brightness(1.5); }
        100% { transform: translateZ(0) rotateY(0); filter: brightness(1); }
    }
    
    /* Card death */
    .nw-battle-card.dying,
    .board-card.dying {
        animation: cardDeath3D 0.8s ease-out forwards;
    }
    
    @keyframes cardDeath3D {
        0% { transform: translateZ(0) rotateX(0) scale(1); opacity: 1; }
        30% { transform: translateZ(50px) rotateX(-20deg) scale(1.1); opacity: 1; }
        100% { transform: translateZ(-200px) rotateX(90deg) scale(0.5); opacity: 0; }
    }
    
    /* Card summon */
    .nw-battle-card.summoning,
    .board-card.summoning {
        animation: cardSummon3D 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    @keyframes cardSummon3D {
        0% { transform: translateZ(200px) translateY(-100px) rotateX(-90deg) scale(0.3); opacity: 0; }
        50% { transform: translateZ(50px) translateY(10px) rotateX(10deg) scale(1.1); opacity: 1; }
        100% { transform: translateZ(0) translateY(0) rotateX(0) scale(1); opacity: 1; }
    }
    
    /* ===== 3D PARTICLES ===== */
    .nw-3d-particle {
        position: absolute;
        pointer-events: none;
        transform-style: preserve-3d;
    }
    
    .nw-3d-particle.spark {
        width: 4px;
        height: 4px;
        background: radial-gradient(circle, #fff 0%, #ffd700 50%, transparent 100%);
        border-radius: 50%;
    }
    
    .nw-3d-particle.shard {
        width: 8px;
        height: 12px;
        background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,215,0,0.6));
        clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
    }
    
    .nw-3d-particle.energy {
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(168,85,247,0.4) 50%, transparent 100%);
        border-radius: 50%;
        filter: blur(2px);
    }
    
    /* ===== IMPACT EFFECTS ===== */
    .nw-impact-ring {
        position: absolute;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.8);
        animation: impactRing 0.6s ease-out forwards;
        pointer-events: none;
    }
    
    @keyframes impactRing {
        0% { transform: scale(0); opacity: 1; }
        100% { transform: scale(3); opacity: 0; }
    }
    
    /* ===== DAMAGE NUMBERS ===== */
    .nw-damage-number {
        position: absolute;
        font-family: 'Orbitron', sans-serif;
        font-weight: 900;
        font-size: 32px;
        color: #ff4444;
        text-shadow: 2px 2px 0 #000, -1px -1px 0 #000;
        pointer-events: none;
        animation: damageFloat 1s ease-out forwards;
        z-index: 1000;
    }
    
    .nw-damage-number.heal {
        color: #44ff44;
    }
    
    .nw-damage-number.crit {
        font-size: 48px;
        color: #ffff00;
        animation: damageCrit 1s ease-out forwards;
    }
    
    @keyframes damageFloat {
        0% { transform: translateY(0) scale(1); opacity: 1; }
        20% { transform: translateY(-20px) scale(1.2); }
        100% { transform: translateY(-60px) scale(0.8); opacity: 0; }
    }
    
    @keyframes damageCrit {
        0% { transform: translateY(0) scale(0.5) rotateZ(-10deg); opacity: 0; }
        20% { transform: translateY(-10px) scale(1.5) rotateZ(5deg); opacity: 1; }
        40% { transform: translateY(-25px) scale(1.3) rotateZ(-3deg); }
        100% { transform: translateY(-80px) scale(1); opacity: 0; }
    }
    `;

    // Inject styles
    function injectStyles() {
        if (document.getElementById('nw-3d-styles')) return;
        const style = document.createElement('style');
        style.id = 'nw-3d-styles';
        style.textContent = STYLES;
        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════════════════
    // ANIMATION UTILITIES
    // ═══════════════════════════════════════════════════════════════════
    
    // Smooth animation with requestAnimationFrame
    function animate(duration, callback, easing = CONFIG.easing.easeInOut) {
        const start = performance.now();
        
        return new Promise(resolve => {
            function frame(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easing(progress);
                
                callback(easedProgress, progress);
                
                if (progress < 1) {
                    requestAnimationFrame(frame);
                } else {
                    resolve();
                }
            }
            requestAnimationFrame(frame);
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // GACHA PACK SYSTEM
    // ═══════════════════════════════════════════════════════════════════
    const pack = {
        // Create a 3D pack element
        create(options = {}) {
            const {
                width = 200,
                height = 280,
                image = null,
                rarity = 'common'
            } = options;
            
            const pack = document.createElement('div');
            pack.className = 'nw-pack nw-3d-object';
            pack.innerHTML = `
                <div class="nw-pack-face nw-pack-front">
                    ${image ? `<img src="${image}" alt="Pack">` : '<span style="font-size:60px">🔥</span>'}
                </div>
                <div class="nw-pack-face nw-pack-back"></div>
                <div class="nw-pack-side nw-pack-side-top nw-pack-top-flap"></div>
            `;
            
            pack.style.width = width + 'px';
            pack.style.height = height + 'px';
            
            return pack;
        },
        
        // Shake pack before opening (anticipation)
        async shake(packEl, intensity = 1, duration = 500) {
            packEl.classList.add('opening');
            
            // Add haptic feedback
            if (typeof NW_JUICE !== 'undefined') {
                NW_JUICE.haptic.light();
            }
            
            await animate(duration, (t) => {
                const shake = Math.sin(t * Math.PI * 8) * (1 - t) * 10 * intensity;
                const rotate = Math.sin(t * Math.PI * 6) * (1 - t) * 3 * intensity;
                packEl.style.transform = `translateX(${shake}px) rotateZ(${rotate}deg)`;
            });
            
            packEl.style.transform = '';
            packEl.classList.remove('opening');
        },
        
        // Open pack with 3D animation
        async open(packEl, cards = [], options = {}) {
            const {
                onCardReveal = null,
                delayBetweenCards = 300
            } = options;
            
            // Determine highest rarity for glow
            const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
            const highestRarity = cards.reduce((highest, card) => {
                return rarityOrder.indexOf(card.rarity) > rarityOrder.indexOf(highest) 
                    ? card.rarity : highest;
            }, 'common');
            
            // Add anticipation glow
            if (['mythic', 'legendary', 'epic'].includes(highestRarity)) {
                packEl.classList.add(`glow-${highestRarity}`);
            }
            
            // Shake with increasing intensity
            await this.shake(packEl, 1, 400);
            await this.shake(packEl, 1.5, 300);
            await this.shake(packEl, 2, 200);
            
            // Burst open
            packEl.classList.add('opened');
            
            // Create explosion particles
            particles.burst3D(packEl, 30, highestRarity);
            
            // Sound effect
            if (typeof NW_JUICE !== 'undefined') {
                NW_JUICE.sound.play('pack_open');
                NW_JUICE.haptic.heavy();
            }
            
            // Fly cards out
            await this.flyCardsOut(packEl, cards, onCardReveal, delayBetweenCards);
            
            // Cleanup
            packEl.classList.remove(`glow-${highestRarity}`, 'opened');
        },
        
        // Cards flying out of pack
        async flyCardsOut(packEl, cards, onReveal, delay) {
            const rect = packEl.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                
                // Create flying card element
                const cardEl = document.createElement('div');
                cardEl.className = 'nw-stacked-card';
                cardEl.style.cssText = `
                    position: fixed;
                    left: ${centerX}px;
                    top: ${centerY}px;
                    width: 120px;
                    height: 168px;
                    background: url('${card.img}') center/cover;
                    border-radius: 8px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    z-index: ${1000 + i};
                    transform: translateX(-50%) translateY(-50%) rotateY(180deg) scale(0.5);
                    opacity: 0;
                `;
                document.body.appendChild(cardEl);
                
                // Fly out animation
                const angle = (i / cards.length) * Math.PI * 0.8 - Math.PI * 0.4;
                const distance = 150 + Math.random() * 50;
                const targetX = centerX + Math.sin(angle) * distance;
                const targetY = centerY - 100 - Math.random() * 50;
                
                await animate(400, (t) => {
                    const x = centerX + (targetX - centerX) * t;
                    const y = centerY + (targetY - centerY) * t - Math.sin(t * Math.PI) * 100;
                    const rotateY = 180 * (1 - t);
                    const scale = 0.5 + t * 0.5;
                    
                    cardEl.style.transform = `
                        translateX(-50%) translateY(-50%)
                        translateX(${x - centerX}px) translateY(${y - centerY}px)
                        rotateY(${rotateY}deg)
                        scale(${scale})
                    `;
                    cardEl.style.opacity = t;
                }, CONFIG.easing.easeOutBack);
                
                // Callback for each card
                if (onReveal) {
                    onReveal(card, cardEl, i);
                }
                
                // Wait before next card
                if (i < cards.length - 1) {
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // CARD ANIMATIONS
    // ═══════════════════════════════════════════════════════════════════
    const card = {
        // 3D flip reveal
        async flip(cardEl, duration = 800) {
            await animate(duration, (t) => {
                const rotateY = 180 * t;
                const scale = 1 + Math.sin(t * Math.PI) * 0.1;
                cardEl.style.transform = `rotateY(${rotateY}deg) scale(${scale})`;
            }, CONFIG.easing.easeInOut);
        },
        
        // Card entrance (summon to field)
        async summon(cardEl, fromY = -200) {
            cardEl.classList.add('summoning');
            
            if (typeof NW_JUICE !== 'undefined') {
                NW_JUICE.sound.play('summon');
                NW_JUICE.haptic.medium();
            }
            
            await new Promise(r => setTimeout(r, 700));
            cardEl.classList.remove('summoning');
        },
        
        // Hover lift effect
        enableHover(cardEl) {
            cardEl.addEventListener('mouseenter', () => {
                cardEl.style.transform = 'translateZ(30px) scale(1.05)';
                cardEl.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
            });
            
            cardEl.addEventListener('mouseleave', () => {
                cardEl.style.transform = '';
                cardEl.style.boxShadow = '';
            });
        },
        
        // Tilt card based on mouse position
        enableTilt(cardEl, intensity = 15) {
            cardEl.addEventListener('mousemove', (e) => {
                const rect = cardEl.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                
                cardEl.style.transform = `
                    perspective(1000px)
                    rotateY(${x * intensity}deg)
                    rotateX(${-y * intensity}deg)
                    translateZ(20px)
                `;
            });
            
            cardEl.addEventListener('mouseleave', () => {
                cardEl.style.transform = '';
            });
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // PVP BATTLE SYSTEM
    // ═══════════════════════════════════════════════════════════════════
    const battle = {
        // Card attacks another card
        async attack(attackerEl, targetEl, damage, isCrit = false) {
            const attackerRect = attackerEl.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();
            
            // Calculate direction
            const dx = targetRect.left - attackerRect.left;
            const dy = targetRect.top - attackerRect.top;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Attacker lunges
            attackerEl.classList.add('attacking');
            
            if (typeof NW_JUICE !== 'undefined') {
                NW_JUICE.sound.play('attack');
            }
            
            // Move toward target
            await animate(200, (t) => {
                const moveX = (dx / distance) * 80 * t;
                const moveY = (dy / distance) * 80 * t;
                attackerEl.style.transform = `translate(${moveX}px, ${moveY}px) translateZ(${50 * t}px) scale(${1 + t * 0.1})`;
            }, CONFIG.easing.easeOutQuart);
            
            // Impact!
            targetEl.classList.add('hit');
            this.showDamage(targetEl, damage, isCrit);
            this.createImpact(targetRect.left + targetRect.width/2, targetRect.top + targetRect.height/2);
            
            if (typeof NW_JUICE !== 'undefined') {
                NW_JUICE.sound.play('hit');
                NW_JUICE.screen.shake(isCrit ? 'heavy' : 'medium');
                NW_JUICE.haptic.medium();
            }
            
            // Return to position
            await animate(300, (t) => {
                const moveX = (dx / distance) * 80 * (1 - t);
                const moveY = (dy / distance) * 80 * (1 - t);
                attackerEl.style.transform = `translate(${moveX}px, ${moveY}px) translateZ(${50 * (1-t)}px) scale(${1 + (1-t) * 0.1})`;
            }, CONFIG.easing.easeOutBack);
            
            attackerEl.style.transform = '';
            attackerEl.classList.remove('attacking');
            
            await new Promise(r => setTimeout(r, 200));
            targetEl.classList.remove('hit');
        },
        
        // Show floating damage number
        showDamage(targetEl, amount, isCrit = false) {
            const rect = targetEl.getBoundingClientRect();
            const num = document.createElement('div');
            num.className = `nw-damage-number ${isCrit ? 'crit' : ''}`;
            num.textContent = isCrit ? `${amount}!` : amount;
            num.style.left = (rect.left + rect.width/2 + (Math.random() - 0.5) * 40) + 'px';
            num.style.top = (rect.top + rect.height/3) + 'px';
            document.body.appendChild(num);
            
            setTimeout(() => num.remove(), 1000);
        },
        
        // Show heal number
        showHeal(targetEl, amount) {
            const rect = targetEl.getBoundingClientRect();
            const num = document.createElement('div');
            num.className = 'nw-damage-number heal';
            num.textContent = '+' + amount;
            num.style.left = (rect.left + rect.width/2) + 'px';
            num.style.top = (rect.top + rect.height/3) + 'px';
            document.body.appendChild(num);
            
            setTimeout(() => num.remove(), 1000);
        },
        
        // Create impact ring effect
        createImpact(x, y, color = '#fff') {
            for (let i = 0; i < 2; i++) {
                const ring = document.createElement('div');
                ring.className = 'nw-impact-ring';
                ring.style.cssText = `
                    left: ${x}px;
                    top: ${y}px;
                    width: 50px;
                    height: 50px;
                    transform: translate(-50%, -50%);
                    border-color: ${color};
                    animation-delay: ${i * 0.1}s;
                `;
                document.body.appendChild(ring);
                setTimeout(() => ring.remove(), 700);
            }
        },
        
        // Card death animation
        async death(cardEl) {
            cardEl.classList.add('dying');
            
            if (typeof NW_JUICE !== 'undefined') {
                NW_JUICE.sound.play('death');
                NW_JUICE.screen.shake('light');
            }
            
            // Spawn death particles
            const rect = cardEl.getBoundingClientRect();
            particles.burst3D(cardEl, 20, 'common');
            
            await new Promise(r => setTimeout(r, 800));
            cardEl.remove();
        },
        
        // Ability activation effect
        async activateAbility(cardEl, abilityName, color = '#a855f7') {
            // Glow effect
            cardEl.style.boxShadow = `0 0 30px ${color}, 0 0 60px ${color}`;
            cardEl.style.transform = 'translateZ(30px) scale(1.05)';
            
            // Show ability name
            const rect = cardEl.getBoundingClientRect();
            const text = document.createElement('div');
            text.textContent = abilityName;
            text.style.cssText = `
                position: fixed;
                left: ${rect.left + rect.width/2}px;
                top: ${rect.top - 30}px;
                transform: translateX(-50%);
                font-family: 'Orbitron', sans-serif;
                font-size: 16px;
                font-weight: bold;
                color: ${color};
                text-shadow: 0 0 10px ${color};
                z-index: 1000;
                animation: damageFloat 1.5s ease-out forwards;
            `;
            document.body.appendChild(text);
            
            if (typeof NW_JUICE !== 'undefined') {
                NW_JUICE.sound.play('ability');
                NW_JUICE.haptic.light();
            }
            
            await new Promise(r => setTimeout(r, 500));
            
            cardEl.style.boxShadow = '';
            cardEl.style.transform = '';
            
            setTimeout(() => text.remove(), 1500);
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // 3D PARTICLE SYSTEM
    // ═══════════════════════════════════════════════════════════════════
    const particles = {
        pool: [],
        
        // Get or create particle
        getParticle(type = 'spark') {
            let p = this.pool.find(p => !p.active && p.type === type);
            
            if (!p) {
                const el = document.createElement('div');
                el.className = `nw-3d-particle ${type}`;
                p = { el, active: false, type };
                this.pool.push(p);
            }
            
            p.active = true;
            return p;
        },
        
        // Release particle back to pool
        release(particle) {
            particle.active = false;
            particle.el.remove();
        },
        
        // 3D burst effect
        burst3D(sourceEl, count = 20, rarity = 'common') {
            const rect = sourceEl.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const colors = {
                mythic: ['#ff00ff', '#00ffff', '#ffff00'],
                legendary: ['#ffd700', '#ff6b00', '#fff'],
                epic: ['#a855f7', '#7c3aed', '#fff'],
                rare: ['#3b82f6', '#60a5fa', '#fff'],
                uncommon: ['#22c55e', '#4ade80', '#fff'],
                common: ['#9ca3af', '#d1d5db', '#fff']
            };
            
            const particleColors = colors[rarity] || colors.common;
            
            for (let i = 0; i < count; i++) {
                const p = this.getParticle(Math.random() > 0.7 ? 'shard' : 'spark');
                const color = particleColors[Math.floor(Math.random() * particleColors.length)];
                
                p.el.style.cssText = `
                    position: fixed;
                    left: ${centerX}px;
                    top: ${centerY}px;
                    background: ${color};
                    z-index: 10000;
                `;
                document.body.appendChild(p.el);
                
                // Random 3D trajectory
                const angle = Math.random() * Math.PI * 2;
                const speed = 100 + Math.random() * 200;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed - 100; // Upward bias
                const vz = (Math.random() - 0.5) * 200;
                const rotateSpeed = (Math.random() - 0.5) * 720;
                const life = 500 + Math.random() * 500;
                
                const startTime = performance.now();
                
                const animateParticle = (now) => {
                    const elapsed = now - startTime;
                    const t = elapsed / life;
                    
                    if (t >= 1) {
                        this.release(p);
                        return;
                    }
                    
                    const gravity = 500;
                    const x = vx * t;
                    const y = vy * t + 0.5 * gravity * t * t;
                    const z = vz * t;
                    const rotate = rotateSpeed * t;
                    const scale = 1 - t * 0.5;
                    const opacity = 1 - t;
                    
                    p.el.style.transform = `
                        translate(${x}px, ${y}px)
                        translateZ(${z}px)
                        rotate(${rotate}deg)
                        scale(${scale})
                    `;
                    p.el.style.opacity = opacity;
                    
                    requestAnimationFrame(animateParticle);
                };
                
                requestAnimationFrame(animateParticle);
            }
        },
        
        // Energy trail effect
        trail(element, color = '#ffd700', duration = 1000) {
            const rect = element.getBoundingClientRect();
            const interval = 50;
            let elapsed = 0;
            
            const createTrailParticle = () => {
                if (elapsed >= duration) return;
                
                const p = this.getParticle('energy');
                const currentRect = element.getBoundingClientRect();
                
                p.el.style.cssText = `
                    position: fixed;
                    left: ${currentRect.left + currentRect.width/2}px;
                    top: ${currentRect.top + currentRect.height/2}px;
                    background: radial-gradient(circle, ${color} 0%, transparent 70%);
                    z-index: 9999;
                    opacity: 0.8;
                `;
                document.body.appendChild(p.el);
                
                // Fade out
                animate(300, (t) => {
                    p.el.style.opacity = 0.8 * (1 - t);
                    p.el.style.transform = `scale(${1 + t})`;
                }).then(() => this.release(p));
                
                elapsed += interval;
                setTimeout(createTrailParticle, interval);
            };
            
            createTrailParticle();
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // SCREEN EFFECTS
    // ═══════════════════════════════════════════════════════════════════
    const screen = {
        // Zoom effect
        async zoom(intensity = 1.1, duration = 300) {
            const scene = document.querySelector('.nw-3d-scene') || document.body;
            
            await animate(duration / 2, (t) => {
                const scale = 1 + (intensity - 1) * t;
                scene.style.transform = `scale(${scale})`;
            });
            
            await animate(duration / 2, (t) => {
                const scale = intensity - (intensity - 1) * t;
                scene.style.transform = `scale(${scale})`;
            });
            
            scene.style.transform = '';
        },
        
        // Slow motion effect
        async slowMotion(duration = 1000, speed = 0.3) {
            document.body.style.transition = `all ${duration}ms`;
            document.body.style.animationDuration = `${1/speed}s`;
            
            await new Promise(r => setTimeout(r, duration));
            
            document.body.style.transition = '';
            document.body.style.animationDuration = '';
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    function init() {
        injectStyles();
        console.log('[NW_3D] 3D Animation Engine v1.0 loaded');
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    return {
        config: CONFIG,
        easing: CONFIG.easing,
        
        // Animation utility
        animate,
        
        // Gacha pack system
        pack,
        
        // Card animations
        card,
        
        // PvP battle system
        battle,
        
        // Particle effects
        particles,
        
        // Screen effects
        screen,
        
        // Manual init
        init
    };
})();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NW_3D;
}
