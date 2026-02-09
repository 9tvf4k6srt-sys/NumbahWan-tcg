/**
 * NW_PREMIUM_FX - Premium Visual Effects Library v1.0
 * ====================================================
 * High-impact effects for NumbahWan TCG
 * 
 * FEATURES:
 * - Holographic card shimmer (Legendary/Mythic)
 * - Mouse-follow shine effect
 * - Live activity toast system
 * - Seasonal particle weather
 * - Epic pull celebrations
 * - Card inspection modal
 * 
 * ARCHITECTURE:
 * - Extends existing NW_JUICE, NW_EFFECTS systems
 * - CSS-first approach (GPU accelerated)
 * - Modular - enable/disable features independently
 * - Debug-friendly with console logging
 * 
 * USAGE:
 *   NW_FX.holo.apply(cardElement);          // Add holographic effect
 *   NW_FX.shine.init();                      // Enable mouse-follow shine
 *   NW_FX.toast.show('Player pulled Mythic!', { type: 'mythic' });
 *   NW_FX.weather.start('maple');            // Start seasonal particles
 *   NW_FX.celebrate.epicPull('legendary');   // Trigger celebration
 * 
 * DEBUG:
 *   NW_FX.debug.status();      // Show all active effects
 *   NW_FX.debug.disable();     // Disable all effects
 *   NW_FX.debug.enable();      // Re-enable all effects
 */

const NW_FX = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════
    const CONFIG = {
        enabled: true,
        debug: false,
        
        // Holographic
        holo: {
            enabled: true,
            intensity: 1.0,
            rarities: ['legendary', 'mythic']  // Which rarities get holo effect
        },
        
        // Shine
        shine: {
            enabled: true,
            selector: '.nw-card[data-rarity="legendary"], .nw-card[data-rarity="mythic"]'
        },
        
        // Toast
        toast: {
            enabled: true,
            position: 'top-right',
            maxVisible: 5,
            defaultDuration: 4000
        },
        
        // Weather particles
        weather: {
            enabled: true,
            particleCount: 30,
            types: ['maple', 'snow', 'sakura', 'stars', 'embers']
        },
        
        // Celebrations
        celebrate: {
            enabled: true,
            screenFlash: true,
            confetti: true,
            sound: true
        }
    };

    // Track active state
    const state = {
        weatherActive: false,
        weatherType: null,
        weatherContainer: null,
        toastContainer: null,
        activeToasts: [],
        shineElements: new Set()
    };

    // ═══════════════════════════════════════════════════════════════════════
    // CSS INJECTION
    // ═══════════════════════════════════════════════════════════════════════
    const STYLES = `
/* ═══════════════════════════════════════════════════════════════════════════
   NW_PREMIUM_FX STYLES
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
   1. HOLOGRAPHIC CARD EFFECT
   Premium shimmer for Legendary/Mythic cards
   ───────────────────────────────────────────────────────────────────────────── */

.nw-holo {
    position: relative;
    overflow: hidden;
}

.nw-holo::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
        125deg,
        transparent 0%,
        transparent 25%,
        rgba(255, 0, 128, 0.15) 30%,
        rgba(255, 128, 0, 0.15) 35%,
        rgba(255, 255, 0, 0.15) 40%,
        rgba(0, 255, 128, 0.15) 45%,
        rgba(0, 128, 255, 0.15) 50%,
        rgba(128, 0, 255, 0.15) 55%,
        transparent 60%,
        transparent 100%
    );
    background-size: 200% 200%;
    animation: nwHoloShimmer 3s ease-in-out infinite;
    pointer-events: none;
    z-index: 10;
    mix-blend-mode: overlay;
    opacity: var(--holo-intensity, 1);
}

.nw-holo::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
        45deg,
        transparent 30%,
        rgba(255, 255, 255, 0.1) 50%,
        transparent 70%
    );
    background-size: 300% 300%;
    animation: nwHoloGlint 4s ease-in-out infinite;
    animation-delay: 0.5s;
    pointer-events: none;
    z-index: 11;
}

@keyframes nwHoloShimmer {
    0% { background-position: 200% 0%; }
    50% { background-position: 0% 100%; }
    100% { background-position: 200% 0%; }
}

@keyframes nwHoloGlint {
    0%, 100% { background-position: -100% -100%; opacity: 0; }
    50% { background-position: 200% 200%; opacity: 1; }
}

/* Mythic gets extra intense holo */
.nw-holo-mythic::before {
    background: linear-gradient(
        125deg,
        transparent 0%,
        rgba(255, 107, 0, 0.25) 20%,
        rgba(255, 0, 128, 0.2) 30%,
        rgba(255, 215, 0, 0.25) 40%,
        rgba(0, 255, 255, 0.2) 50%,
        rgba(255, 0, 255, 0.2) 60%,
        rgba(255, 107, 0, 0.25) 70%,
        transparent 100%
    );
    animation: nwHoloShimmer 2s ease-in-out infinite;
}

.nw-holo-mythic::after {
    background: radial-gradient(
        circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
        rgba(255, 215, 0, 0.3) 0%,
        transparent 50%
    );
    animation: none;
    opacity: 1;
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. MOUSE-FOLLOW SHINE EFFECT
   Gleam that follows cursor on premium cards
   ───────────────────────────────────────────────────────────────────────────── */

.nw-shine-wrap {
    position: relative;
    overflow: hidden;
}

.nw-shine-layer {
    position: absolute;
    inset: 0;
    background: radial-gradient(
        circle 150px at var(--shine-x, -100px) var(--shine-y, -100px),
        rgba(255, 255, 255, 0.4) 0%,
        rgba(255, 255, 255, 0.1) 30%,
        transparent 60%
    );
    pointer-events: none;
    z-index: 15;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.nw-shine-wrap:hover .nw-shine-layer {
    opacity: 1;
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. LIVE ACTIVITY TOAST SYSTEM
   Notifications for game events
   ───────────────────────────────────────────────────────────────────────────── */

#nw-toast-container {
    position: fixed;
    z-index: 100000;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 360px;
    width: 100%;
    padding: 16px;
}

#nw-toast-container.top-right { top: 0; right: 0; align-items: flex-end; }
#nw-toast-container.top-left { top: 0; left: 0; align-items: flex-start; }
#nw-toast-container.bottom-right { bottom: 0; right: 0; align-items: flex-end; }
#nw-toast-container.bottom-left { bottom: 0; left: 0; align-items: flex-start; }
#nw-toast-container.top-center { top: 0; left: 50%; transform: translateX(-50%); align-items: center; }
#nw-toast-container.bottom-center { bottom: 0; left: 50%; transform: translateX(-50%); align-items: center; }

.nw-toast {
    pointer-events: auto;
    background: rgba(15, 15, 20, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: nwToastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    max-width: 100%;
    font-family: 'Inter', system-ui, sans-serif;
}

.nw-toast.exit {
    animation: nwToastOut 0.3s ease-in forwards;
}

@keyframes nwToastIn {
    0% { opacity: 0; transform: translateX(100px) scale(0.8); }
    100% { opacity: 1; transform: translateX(0) scale(1); }
}

@keyframes nwToastOut {
    0% { opacity: 1; transform: translateX(0) scale(1); }
    100% { opacity: 0; transform: translateX(100px) scale(0.8); }
}

.nw-toast-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
}

.nw-toast-content {
    flex: 1;
    min-width: 0;
}

.nw-toast-title {
    font-weight: 600;
    font-size: 14px;
    color: #fff;
    margin-bottom: 2px;
}

.nw-toast-message {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.nw-toast-close {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    padding: 4px;
    font-size: 16px;
    transition: color 0.2s;
}

.nw-toast-close:hover { color: #fff; }

/* Toast Types */
.nw-toast-info .nw-toast-icon { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.nw-toast-success .nw-toast-icon { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.nw-toast-warning .nw-toast-icon { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.nw-toast-error .nw-toast-icon { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.nw-toast-rare .nw-toast-icon { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.nw-toast-epic .nw-toast-icon { background: rgba(168, 85, 247, 0.2); color: #a855f7; }
.nw-toast-legendary .nw-toast-icon { 
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(217, 119, 6, 0.3)); 
    color: #fbbf24; 
}
.nw-toast-mythic .nw-toast-icon { 
    background: linear-gradient(135deg, rgba(255, 107, 0, 0.3), rgba(255, 0, 128, 0.2)); 
    color: #ff6b00;
    animation: nwToastMythicGlow 2s ease-in-out infinite;
}

.nw-toast-legendary, .nw-toast-mythic {
    border-color: rgba(255, 215, 0, 0.3);
}

.nw-toast-mythic {
    border-color: rgba(255, 107, 0, 0.4);
    box-shadow: 0 8px 32px rgba(255, 107, 0, 0.2);
}

@keyframes nwToastMythicGlow {
    0%, 100% { box-shadow: 0 0 10px rgba(255, 107, 0, 0.5); }
    50% { box-shadow: 0 0 20px rgba(255, 107, 0, 0.8), 0 0 30px rgba(255, 0, 128, 0.4); }
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. SEASONAL PARTICLE WEATHER
   Ambient floating particles (maple leaves, snow, etc)
   ───────────────────────────────────────────────────────────────────────────── */

#nw-weather-container {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    overflow: hidden;
}

.nw-weather-particle {
    position: absolute;
    pointer-events: none;
    will-change: transform;
}

/* Maple Leaf */
.nw-particle-maple {
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, #ff6b00, #ff9d4d);
    clip-path: polygon(50% 0%, 80% 30%, 100% 50%, 80% 80%, 50% 100%, 20% 80%, 0% 50%, 20% 30%);
    animation: nwMapleFloat var(--duration, 10s) linear infinite;
    animation-delay: var(--delay, 0s);
    opacity: var(--opacity, 0.7);
}

@keyframes nwMapleFloat {
    0% { transform: translate(var(--start-x, 0), -30px) rotate(0deg); }
    100% { transform: translate(var(--end-x, 50px), calc(100vh + 30px)) rotate(720deg); }
}

/* Snowflake */
.nw-particle-snow {
    width: var(--size, 8px);
    height: var(--size, 8px);
    background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 100%);
    border-radius: 50%;
    animation: nwSnowFloat var(--duration, 8s) linear infinite;
    animation-delay: var(--delay, 0s);
    opacity: var(--opacity, 0.8);
}

@keyframes nwSnowFloat {
    0% { transform: translate(var(--start-x, 0), -20px); }
    50% { transform: translate(calc(var(--start-x, 0) + var(--sway, 30px)), 50vh); }
    100% { transform: translate(var(--start-x, 0), calc(100vh + 20px)); }
}

/* Sakura Petal */
.nw-particle-sakura {
    width: 12px;
    height: 16px;
    background: linear-gradient(135deg, #ffb7c5, #ff69b4);
    border-radius: 80% 0 55% 50% / 55% 0 80% 50%;
    animation: nwSakuraFloat var(--duration, 12s) linear infinite;
    animation-delay: var(--delay, 0s);
    opacity: var(--opacity, 0.8);
}

@keyframes nwSakuraFloat {
    0% { transform: translate(var(--start-x, 0), -20px) rotate(0deg) scale(1); }
    25% { transform: translate(calc(var(--start-x, 0) + 40px), 25vh) rotate(90deg) scale(0.9); }
    50% { transform: translate(calc(var(--start-x, 0) - 20px), 50vh) rotate(180deg) scale(1); }
    75% { transform: translate(calc(var(--start-x, 0) + 30px), 75vh) rotate(270deg) scale(0.9); }
    100% { transform: translate(var(--start-x, 0), calc(100vh + 20px)) rotate(360deg) scale(1); }
}

/* Stars */
.nw-particle-stars {
    width: var(--size, 4px);
    height: var(--size, 4px);
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 0 var(--size, 4px) rgba(255, 255, 255, 0.8);
    animation: nwStarsTwinkle var(--duration, 3s) ease-in-out infinite;
    animation-delay: var(--delay, 0s);
}

@keyframes nwStarsTwinkle {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.2); }
}

/* Embers */
.nw-particle-embers {
    width: var(--size, 6px);
    height: var(--size, 6px);
    background: radial-gradient(circle, #ff6b00 0%, #ff3300 50%, transparent 100%);
    border-radius: 50%;
    animation: nwEmbersFloat var(--duration, 6s) ease-out infinite;
    animation-delay: var(--delay, 0s);
}

@keyframes nwEmbersFloat {
    0% { transform: translate(var(--start-x, 0), 100vh) scale(1); opacity: 1; }
    100% { transform: translate(calc(var(--start-x, 0) + var(--drift, 100px)), -50px) scale(0); opacity: 0; }
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. EPIC PULL CELEBRATION
   Screen flash, confetti burst, glow effects
   ───────────────────────────────────────────────────────────────────────────── */

.nw-celebrate-flash {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 99999;
    animation: nwCelebrateFlash 0.6s ease-out forwards;
}

.nw-celebrate-flash-legendary {
    background: radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.6), transparent 70%);
}

.nw-celebrate-flash-mythic {
    background: radial-gradient(circle at 50% 50%, rgba(255, 107, 0, 0.7), rgba(255, 0, 128, 0.3) 50%, transparent 80%);
}

@keyframes nwCelebrateFlash {
    0% { opacity: 1; transform: scale(0.8); }
    50% { opacity: 0.8; transform: scale(1.2); }
    100% { opacity: 0; transform: scale(1.5); }
}

.nw-confetti {
    position: fixed;
    pointer-events: none;
    z-index: 99998;
    animation: nwConfettiFall var(--fall-duration, 3s) cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes nwConfettiFall {
    0% { 
        transform: translate(0, 0) rotate(0deg); 
        opacity: 1; 
    }
    100% { 
        transform: translate(var(--drift-x, 0), var(--drift-y, 500px)) rotate(var(--spin, 720deg)); 
        opacity: 0; 
    }
}

/* ─────────────────────────────────────────────────────────────────────────────
   6. CARD INSPECTION MODAL
   Full-screen card view with 3D rotation
   ───────────────────────────────────────────────────────────────────────────── */

.nw-inspect-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    animation: nwInspectFadeIn 0.3s ease-out forwards;
    cursor: zoom-out;
}

@keyframes nwInspectFadeIn {
    to { opacity: 1; }
}

.nw-inspect-card {
    transform-style: preserve-3d;
    transition: transform 0.1s ease-out;
    cursor: grab;
}

.nw-inspect-card:active { cursor: grabbing; }

.nw-inspect-close {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    transition: all 0.2s;
}

.nw-inspect-close:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
}
`;

    // Inject styles once
    function injectStyles() {
        if (document.getElementById('nw-premium-fx-styles')) return;
        const style = document.createElement('style');
        style.id = 'nw-premium-fx-styles';
        style.textContent = STYLES;
        document.head.appendChild(style);
        log('Styles injected');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════════════════
    
    function log(...args) {
        if (CONFIG.debug) console.log('[NW_FX]', ...args);
    }

    function warn(...args) {
        console.warn('[NW_FX]', ...args);
    }

    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    function randInt(min, max) {
        return Math.floor(rand(min, max + 1));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 1. HOLOGRAPHIC EFFECT
    // ═══════════════════════════════════════════════════════════════════════
    
    const holo = {
        /**
         * Apply holographic effect to a card element
         * @param {HTMLElement} el - Card element
         * @param {Object} opts - { intensity: 1.0, rarity: 'legendary' }
         */
        apply(el, opts = {}) {
            if (!CONFIG.enabled || !CONFIG.holo.enabled) return;
            
            const rarity = opts.rarity || el.dataset.rarity || 'legendary';
            const intensity = opts.intensity ?? CONFIG.holo.intensity;
            
            // Add base holo class
            el.classList.add('nw-holo');
            
            // Add rarity-specific class for mythic
            if (rarity === 'mythic') {
                el.classList.add('nw-holo-mythic');
            }
            
            // Set intensity via CSS variable
            el.style.setProperty('--holo-intensity', intensity);
            
            // Track mouse for mythic reactive glow
            if (rarity === 'mythic') {
                el.addEventListener('mousemove', this._handleMouseMove);
                el.addEventListener('mouseleave', this._handleMouseLeave);
            }
            
            log('Holo applied:', el, rarity);
        },

        /**
         * Remove holographic effect
         */
        remove(el) {
            el.classList.remove('nw-holo', 'nw-holo-mythic');
            el.style.removeProperty('--holo-intensity');
            el.removeEventListener('mousemove', this._handleMouseMove);
            el.removeEventListener('mouseleave', this._handleMouseLeave);
        },

        /**
         * Auto-apply to all matching cards
         */
        autoApply(container = document) {
            const selector = CONFIG.holo.rarities.map(r => `.nw-card[data-rarity="${r}"]`).join(', ');
            container.querySelectorAll(selector).forEach(card => this.apply(card));
        },

        _handleMouseMove(e) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
            e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
        },

        _handleMouseLeave(e) {
            e.currentTarget.style.setProperty('--mouse-x', '50%');
            e.currentTarget.style.setProperty('--mouse-y', '50%');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 2. MOUSE-FOLLOW SHINE EFFECT
    // ═══════════════════════════════════════════════════════════════════════
    
    const shine = {
        /**
         * Initialize shine effect on premium cards
         */
        init(selector = CONFIG.shine.selector) {
            if (!CONFIG.enabled || !CONFIG.shine.enabled) return;
            
            document.querySelectorAll(selector).forEach(card => {
                if (state.shineElements.has(card)) return;
                
                // Wrap card content
                card.classList.add('nw-shine-wrap');
                
                // Add shine layer
                const shineLayer = document.createElement('div');
                shineLayer.className = 'nw-shine-layer';
                card.appendChild(shineLayer);
                
                // Track mouse
                card.addEventListener('mousemove', this._handleMouseMove);
                
                state.shineElements.add(card);
            });
            
            log('Shine initialized on', state.shineElements.size, 'elements');
        },

        _handleMouseMove(e) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const shineLayer = e.currentTarget.querySelector('.nw-shine-layer');
            if (shineLayer) {
                shineLayer.style.setProperty('--shine-x', `${x}px`);
                shineLayer.style.setProperty('--shine-y', `${y}px`);
            }
        },

        /**
         * Manually add shine to an element
         */
        add(el) {
            if (state.shineElements.has(el)) return;
            
            el.classList.add('nw-shine-wrap');
            const shineLayer = document.createElement('div');
            shineLayer.className = 'nw-shine-layer';
            el.appendChild(shineLayer);
            el.addEventListener('mousemove', this._handleMouseMove);
            state.shineElements.add(el);
        },

        /**
         * Remove shine from element
         */
        remove(el) {
            el.classList.remove('nw-shine-wrap');
            const shineLayer = el.querySelector('.nw-shine-layer');
            if (shineLayer) shineLayer.remove();
            el.removeEventListener('mousemove', this._handleMouseMove);
            state.shineElements.delete(el);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 3. LIVE ACTIVITY TOAST SYSTEM
    // ═══════════════════════════════════════════════════════════════════════
    
    const toast = {
        /**
         * Initialize toast container
         */
        init() {
            if (state.toastContainer) return;
            
            const container = document.createElement('div');
            container.id = 'nw-toast-container';
            container.className = CONFIG.toast.position;
            document.body.appendChild(container);
            state.toastContainer = container;
            
            log('Toast container initialized');
        },

        /**
         * Show a toast notification
         * @param {string} message - Toast message
         * @param {Object} opts - { title, type, duration, icon }
         */
        show(message, opts = {}) {
            if (!CONFIG.enabled || !CONFIG.toast.enabled) return;
            
            this.init();
            
            const {
                title = '',
                type = 'info',
                duration = CONFIG.toast.defaultDuration,
                icon = this._getIcon(type),
                onClick = null
            } = opts;
            
            // Limit visible toasts
            while (state.activeToasts.length >= CONFIG.toast.maxVisible) {
                this._remove(state.activeToasts[0]);
            }
            
            // Create toast element
            const toastEl = document.createElement('div');
            toastEl.className = `nw-toast nw-toast-${type}`;
            toastEl.innerHTML = `
                <div class="nw-toast-icon">${icon}</div>
                <div class="nw-toast-content">
                    ${title ? `<div class="nw-toast-title">${title}</div>` : ''}
                    <div class="nw-toast-message">${message}</div>
                </div>
                <button class="nw-toast-close">&times;</button>
            `;
            
            // Add click handler
            if (onClick) {
                toastEl.style.cursor = 'pointer';
                toastEl.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('nw-toast-close')) {
                        onClick();
                    }
                });
            }
            
            // Close button handler
            toastEl.querySelector('.nw-toast-close').addEventListener('click', () => {
                this._remove(toastEl);
            });
            
            // Add to DOM
            state.toastContainer.appendChild(toastEl);
            state.activeToasts.push(toastEl);
            
            // Auto-remove after duration
            if (duration > 0) {
                setTimeout(() => this._remove(toastEl), duration);
            }
            
            log('Toast shown:', type, message);
            return toastEl;
        },

        /**
         * Show activity toast (player pulled card, etc)
         */
        activity(playerName, action, rarity = 'common') {
            const rarityNames = {
                common: 'Common', uncommon: 'Uncommon', rare: 'Rare',
                epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic'
            };
            
            return this.show(action, {
                title: playerName,
                type: rarity,
                icon: this._getIcon(rarity)
            });
        },

        _remove(toastEl) {
            if (!toastEl || !toastEl.parentNode) return;
            
            toastEl.classList.add('exit');
            setTimeout(() => {
                toastEl.remove();
                const idx = state.activeToasts.indexOf(toastEl);
                if (idx > -1) state.activeToasts.splice(idx, 1);
            }, 300);
        },

        _getIcon(type) {
            const icons = {
                info: 'ℹ',
                success: '',
                warning: '',
                error: '',
                common: '🃏',
                uncommon: '',
                rare: '',
                epic: '',
                legendary: '',
                mythic: ''
            };
            return icons[type] || icons.info;
        },

        /**
         * Clear all toasts
         */
        clear() {
            state.activeToasts.forEach(t => this._remove(t));
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 4. SEASONAL PARTICLE WEATHER
    // ═══════════════════════════════════════════════════════════════════════
    
    const weather = {
        /**
         * Start weather effect
         * @param {string} type - 'maple', 'snow', 'sakura', 'stars', 'embers'
         */
        start(type = 'maple') {
            if (!CONFIG.enabled || !CONFIG.weather.enabled) return;
            if (!CONFIG.weather.types.includes(type)) {
                warn('Unknown weather type:', type);
                return;
            }
            
            // Stop existing weather
            this.stop();
            
            // Create container
            const container = document.createElement('div');
            container.id = 'nw-weather-container';
            document.body.appendChild(container);
            state.weatherContainer = container;
            state.weatherActive = true;
            state.weatherType = type;
            
            // Create particles
            const count = CONFIG.weather.particleCount;
            for (let i = 0; i < count; i++) {
                this._createParticle(container, type, i);
            }
            
            log('Weather started:', type, count, 'particles');
        },

        _createParticle(container, type, index) {
            const particle = document.createElement('div');
            particle.className = `nw-weather-particle nw-particle-${type}`;
            
            // Randomize properties
            const startX = rand(0, window.innerWidth);
            const duration = rand(6, 15);
            const delay = rand(0, 10);
            const opacity = rand(0.4, 0.9);
            const size = rand(4, 12);
            const sway = rand(-50, 50);
            const drift = rand(-100, 100);
            const endX = startX + rand(-100, 100);
            
            particle.style.setProperty('--start-x', `${startX}px`);
            particle.style.setProperty('--end-x', `${endX}px`);
            particle.style.setProperty('--duration', `${duration}s`);
            particle.style.setProperty('--delay', `${delay}s`);
            particle.style.setProperty('--opacity', opacity);
            particle.style.setProperty('--size', `${size}px`);
            particle.style.setProperty('--sway', `${sway}px`);
            particle.style.setProperty('--drift', `${drift}px`);
            particle.style.left = `${startX}px`;
            
            container.appendChild(particle);
        },

        /**
         * Stop weather effect
         */
        stop() {
            if (state.weatherContainer) {
                state.weatherContainer.remove();
                state.weatherContainer = null;
            }
            state.weatherActive = false;
            state.weatherType = null;
            log('Weather stopped');
        },

        /**
         * Check if weather is active
         */
        isActive() {
            return state.weatherActive;
        },

        /**
         * Get current weather type
         */
        getType() {
            return state.weatherType;
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 5. EPIC PULL CELEBRATION
    // ═══════════════════════════════════════════════════════════════════════
    
    const celebrate = {
        /**
         * Trigger celebration for epic pull
         * @param {string} rarity - 'legendary' or 'mythic'
         * @param {Object} opts - { x, y, confettiCount }
         */
        epicPull(rarity = 'legendary', opts = {}) {
            if (!CONFIG.enabled || !CONFIG.celebrate.enabled) return;
            
            const {
                x = window.innerWidth / 2,
                y = window.innerHeight / 2,
                confettiCount = rarity === 'mythic' ? 100 : 50
            } = opts;
            
            // Screen flash
            if (CONFIG.celebrate.screenFlash) {
                this._flash(rarity);
            }
            
            // Confetti burst
            if (CONFIG.celebrate.confetti) {
                this._confetti(x, y, confettiCount, rarity);
            }
            
            // Screen shake via NW_JUICE if available
            if (window.NW_JUICE?.screen?.shake) {
                window.NW_JUICE.screen.shake(rarity === 'mythic' ? 'epic' : 'heavy');
            }
            
            log('Celebration triggered:', rarity);
        },

        _flash(rarity) {
            const flash = document.createElement('div');
            flash.className = `nw-celebrate-flash nw-celebrate-flash-${rarity}`;
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 600);
        },

        _confetti(x, y, count, rarity) {
            const colors = rarity === 'mythic' 
                ? ['#ff6b00', '#ff0080', '#ffd700', '#ff4444', '#ff9d4d']
                : ['#ffd700', '#fbbf24', '#d97706', '#ffffff', '#ffcc00'];
            
            for (let i = 0; i < count; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'nw-confetti';
                
                // Random shape
                const size = rand(8, 14);
                const isCircle = Math.random() > 0.5;
                confetti.style.cssText = `
                    left: ${x}px;
                    top: ${y}px;
                    width: ${size}px;
                    height: ${isCircle ? size : size * 1.5}px;
                    background: ${colors[randInt(0, colors.length - 1)]};
                    border-radius: ${isCircle ? '50%' : '2px'};
                `;
                
                // Random trajectory
                const angle = rand(0, Math.PI * 2);
                const velocity = rand(200, 500);
                const driftX = Math.cos(angle) * velocity;
                const driftY = Math.sin(angle) * velocity - 300; // Upward bias
                const spin = rand(360, 1080) * (Math.random() > 0.5 ? 1 : -1);
                const duration = rand(2, 4);
                
                confetti.style.setProperty('--drift-x', `${driftX}px`);
                confetti.style.setProperty('--drift-y', `${driftY}px`);
                confetti.style.setProperty('--spin', `${spin}deg`);
                confetti.style.setProperty('--fall-duration', `${duration}s`);
                
                document.body.appendChild(confetti);
                setTimeout(() => confetti.remove(), duration * 1000);
            }
        },

        /**
         * Simple confetti burst at position
         */
        confetti(x, y, count = 30) {
            this._confetti(x, y, count, 'legendary');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 6. CARD INSPECTION MODAL
    // ═══════════════════════════════════════════════════════════════════════
    
    const inspect = {
        /**
         * Open card inspection modal
         * @param {HTMLElement} cardEl - Card element to inspect
         */
        open(cardEl) {
            if (!CONFIG.enabled) return;
            
            // Clone card for inspection
            const cardClone = cardEl.cloneNode(true);
            cardClone.style.transform = 'scale(2)';
            cardClone.style.cursor = 'grab';
            cardClone.className += ' nw-inspect-card';
            
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'nw-inspect-overlay';
            overlay.innerHTML = `<button class="nw-inspect-close">&times;</button>`;
            overlay.appendChild(cardClone);
            
            // Close handlers
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay || e.target.classList.contains('nw-inspect-close')) {
                    this.close(overlay);
                }
            });
            
            // 3D rotation on mouse move
            overlay.addEventListener('mousemove', (e) => {
                const rect = overlay.getBoundingClientRect();
                const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
                const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
                cardClone.style.transform = `scale(2) perspective(1000px) rotateY(${x * 20}deg) rotateX(${-y * 20}deg)`;
            });
            
            overlay.addEventListener('mouseleave', () => {
                cardClone.style.transform = 'scale(2) perspective(1000px) rotateY(0) rotateX(0)';
            });
            
            // Escape key to close
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    this.close(overlay);
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
            
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
            
            log('Inspection opened');
        },

        close(overlay) {
            overlay.style.animation = 'nwInspectFadeIn 0.2s ease-out reverse forwards';
            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = '';
            }, 200);
            log('Inspection closed');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // DEBUG UTILITIES
    // ═══════════════════════════════════════════════════════════════════════
    
    const debug = {
        /**
         * Show status of all effects
         */
        status() {
            console.group('[NW_FX] Status');
            console.log('Enabled:', CONFIG.enabled);
            console.log('Holo:', CONFIG.holo.enabled);
            console.log('Shine:', CONFIG.shine.enabled, `(${state.shineElements.size} elements)`);
            console.log('Toast:', CONFIG.toast.enabled, `(${state.activeToasts.length} active)`);
            console.log('Weather:', state.weatherActive ? state.weatherType : 'inactive');
            console.log('Celebrate:', CONFIG.celebrate.enabled);
            console.groupEnd();
        },

        /**
         * Disable all effects
         */
        disable() {
            CONFIG.enabled = false;
            weather.stop();
            toast.clear();
            console.log('[NW_FX] All effects disabled');
        },

        /**
         * Enable all effects
         */
        enable() {
            CONFIG.enabled = true;
            console.log('[NW_FX] All effects enabled');
        },

        /**
         * Toggle debug logging
         */
        verbose(enabled = true) {
            CONFIG.debug = enabled;
            console.log('[NW_FX] Debug mode:', enabled);
        },

        /**
         * Test all effects
         */
        test() {
            console.log('[NW_FX] Running effect tests...');
            
            // Test toast
            toast.show('This is an info toast', { type: 'info', title: 'Info' });
            setTimeout(() => toast.show('Success!', { type: 'success', title: 'Success' }), 500);
            setTimeout(() => toast.activity('TestPlayer', 'pulled a Legendary Card!', 'legendary'), 1000);
            setTimeout(() => toast.activity('GuildMaster', 'found a MYTHIC!', 'mythic'), 1500);
            
            // Test weather
            setTimeout(() => {
                weather.start('maple');
                console.log('[NW_FX] Weather test: maple leaves');
            }, 2000);
            
            // Test celebration
            setTimeout(() => {
                celebrate.epicPull('legendary');
                console.log('[NW_FX] Celebration test: legendary');
            }, 4000);
            
            setTimeout(() => {
                celebrate.epicPull('mythic');
                console.log('[NW_FX] Celebration test: mythic');
            }, 6000);
            
            console.log('[NW_FX] Tests scheduled. Watch for effects...');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    
    function init() {
        injectStyles();
        toast.init();
        
        // Auto-apply holo to existing cards
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                holo.autoApply();
                shine.init();
            });
        } else {
            holo.autoApply();
            shine.init();
        }
        
        log('NW_FX initialized');
    }

    // Auto-init
    init();

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════
    
    return {
        // Core modules
        holo,
        shine,
        toast,
        weather,
        celebrate,
        inspect,
        
        // Debug tools
        debug,
        
        // Configuration
        config: CONFIG,
        
        // Manual init
        init,
        
        // Version
        version: '1.0.0'
    };

})();

// Global exposure
window.NW_FX = NW_FX;

console.log('[NW_FX] Premium Effects v1.0.0 loaded');
console.log('[NW_FX] Debug: NW_FX.debug.test() | NW_FX.debug.status()');
