/**
 * NW_ESSENTIALS - All essential utilities in one file (~150 lines vs 7000)
 * Contains: Animation, Audio, UI, Debug
 */

// ============================================
// ANIMATION - Spring physics & basic animate
// ============================================
const NW_ANIM = {
    /**
     * Spring animation - bouncy, natural feel
     * @param {Element} el - Target element
     * @param {string} prop - CSS property (e.g., 'transform')
     * @param {string} target - Target value (e.g., 'scale(1)')
     * @param {Object} opts - {stiffness: 180, damping: 12, mass: 1}
     */
    spring(el, prop, target, opts = {}) {
        const { stiffness = 180, damping = 12, mass = 1 } = opts;
        return new Promise(resolve => {
            // Simple spring approximation using CSS transition
            const duration = Math.max(0.3, (mass * 1000) / (stiffness + damping) * 2);
            el.style.transition = `${prop} ${duration}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`;
            el.style[prop] = target;
            setTimeout(resolve, duration * 1000);
        });
    },

    /**
     * Basic animation with easing
     */
    animate(el, props, opts = {}) {
        const { duration = 300, easing = 'ease-out' } = opts;
        return new Promise(resolve => {
            el.style.transition = `all ${duration}ms ${easing}`;
            Object.assign(el.style, props);
            setTimeout(resolve, duration);
        });
    },

    /**
     * Count up animation for numbers
     */
    countTo(el, target, duration = 500) {
        const start = parseInt(el.textContent) || 0;
        const startTime = performance.now();
        const tick = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            el.textContent = Math.floor(start + (target - start) * progress);
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
};

// ============================================
// AUDIO - Simple sound effects
// ============================================
const NW_AUDIO = {
    sounds: {},
    volume: 0.5,
    
    /**
     * Load sounds from URLs
     */
    async load(soundMap) {
        for (const [name, url] of Object.entries(soundMap)) {
            try {
                this.sounds[name] = new Audio(url);
                this.sounds[name].volume = this.volume;
            } catch (e) {
                console.warn(`[AUDIO] Failed to load: ${name}`);
            }
        }
    },

    /**
     * Play a sound
     */
    play(name) {
        const sound = this.sounds[name];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(() => {});
        }
    },

    setVolume(v) {
        this.volume = v;
        Object.values(this.sounds).forEach(s => s.volume = v);
    }
};

// Alias for backward compatibility
const PremiumAudio = {
    initialized: true,
    buffers: NW_AUDIO.sounds,
    play: (name) => NW_AUDIO.play(name),
    loadAll: (map) => NW_AUDIO.load(map)
};

// ============================================
// UI - Toast notifications
// ============================================
const NW_UI = {
    /**
     * Show toast notification
     */
    toast(message, opts = {}) {
        const { duration = 3000, type = 'info' } = opts;
        const colors = { info: '#333', success: '#22c55e', error: '#ef4444', warning: '#f59e0b' };
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background: ${colors[type]}; color: white; padding: 12px 24px;
            border-radius: 8px; font-family: sans-serif; z-index: 99999;
            animation: toastIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// Add toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } }
    @keyframes toastOut { to { opacity: 0; transform: translateX(-50%) translateY(-20px); } }
`;
document.head.appendChild(style);

// ============================================
// DEBUG - Find problems fast
// ============================================
const NW_DEBUG = {
    findOrange() {
        const results = [];
        document.querySelectorAll('*').forEach(el => {
            const bg = getComputedStyle(el).background;
            if (bg.includes('255, 107') || bg.includes('255, 215') || bg.includes('255, 140') || 
                bg.includes('#ff6b') || bg.includes('#ffd7') || bg.includes('#ff8c')) {
                results.push({ el, class: el.className, bg: bg.slice(0, 60) });
                el.style.outline = '3px solid red';
            }
        });
        console.table(results.map(r => ({ class: r.class.toString().slice(0,40), bg: r.bg })));
        return results;
    },
    
    clearOutlines() {
        document.querySelectorAll('*').forEach(el => el.style.outline = '');
    },
    
    inspect(sel) {
        const el = document.querySelector(sel);
        if (!el) return console.log('Not found');
        const s = getComputedStyle(el);
        console.log({ el, class: el.className, bg: s.background, size: `${el.offsetWidth}x${el.offsetHeight}` });
        el.style.outline = '3px solid blue';
    }
};

console.log('[NW] Essentials loaded: NW_ANIM, NW_AUDIO, NW_UI, NW_DEBUG');
