/**
 * NW Animation Helper Library v1.0
 * Animation utilities for NumbahWan Guild
 */

const NW_ANIM = {
    version: '1.0.0',
    initialized: false,

    // Initialize animation system
    init() {
        if (this.initialized) return this;
        this.initialized = true;
        this.setupAnimationStyles();
        console.log('[NW_ANIM] v1.0.0 initialized');
        return this;
    },

    // Add animation styles to document
    setupAnimationStyles() {
        if (document.getElementById('nw-anim-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'nw-anim-styles';
        style.textContent = `
            @keyframes nw-fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes nw-fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes nw-slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes nw-slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
            @keyframes nw-slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes nw-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
            @keyframes nw-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
            @keyframes nw-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes nw-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            
            .nw-anim-fadeIn { animation: nw-fadeIn 0.3s ease; }
            .nw-anim-fadeOut { animation: nw-fadeOut 0.3s ease; }
            .nw-anim-slideIn { animation: nw-slideIn 0.3s ease; }
            .nw-anim-slideUp { animation: nw-slideUp 0.3s ease; }
            .nw-anim-pulse { animation: nw-pulse 2s ease-in-out infinite; }
            .nw-anim-shake { animation: nw-shake 0.3s ease; }
            .nw-anim-spin { animation: nw-spin 1s linear infinite; }
            .nw-anim-bounce { animation: nw-bounce 1s ease-in-out infinite; }
            
            .nw-spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255,107,0,0.3);
                border-top-color: #ff6b00;
                border-radius: 50%;
                animation: nw-spin 0.8s linear infinite;
            }
        `;
        document.head.appendChild(style);
    },

    // Animate element
    animate(element, animation, duration = 300) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return Promise.resolve();

        return new Promise(resolve => {
            el.style.animation = `nw-${animation} ${duration}ms ease`;
            setTimeout(() => {
                el.style.animation = '';
                resolve();
            }, duration);
        });
    },

    // Fade in
    fadeIn(element, duration = 300) {
        return this.animate(element, 'fadeIn', duration);
    },

    // Fade out
    fadeOut(element, duration = 300) {
        return this.animate(element, 'fadeOut', duration);
    },

    // Slide up
    slideUp(element, duration = 300) {
        return this.animate(element, 'slideUp', duration);
    },

    // Pulse
    pulse(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (el) el.classList.add('nw-anim-pulse');
    },

    // Shake
    shake(element) {
        return this.animate(element, 'shake', 300);
    },

    // Stagger animation for multiple elements
    stagger(elements, animation, staggerDelay = 100) {
        const els = typeof elements === 'string' ? document.querySelectorAll(elements) : elements;
        els.forEach((el, i) => {
            setTimeout(() => this.animate(el, animation), i * staggerDelay);
        });
    }
};

// Auto-initialize
if (typeof window !== 'undefined') {
    window.NW_ANIM = NW_ANIM;
    document.addEventListener('DOMContentLoaded', () => NW_ANIM.init());
}
