/**
 * NW_SIZING - Unified Sizing System for NumbahWan TCG
 * 
 * PURPOSE: Single source of truth for ALL card/pack dimensions
 * USAGE: All components (pack, card reveal, card in hand, etc.) reference these values
 * 
 * RULE: If two things should be the same size, they MUST use the same constant
 */

const NW_SIZING = (() => {
    const VERSION = '1.0.0';
    
    // ========================================
    // MASTER DIMENSIONS - SINGLE SOURCE OF TRUTH
    // ========================================
    
    // Card aspect ratio (standard TCG card is roughly 2.5:3.5 = 5:7)
    const CARD_ASPECT_RATIO = 1.4; // height = width * 1.4
    
    // Base card size - used for pack art and reveal card
    // This is the VISIBLE card area, not including any UI chrome
    const CARD_BASE = {
        // Width calculation: smaller of 320px or 65% of viewport width
        width: 'min(320px, 65vw)',
        // Height is always width * aspect ratio
        get height() {
            return `calc(${this.width} * ${CARD_ASPECT_RATIO})`;
        }
    };
    
    // Pack seal (the tearable top part)
    const SEAL = {
        height: '60px',      // Fixed height for seal
        heightPercent: '12%' // As percentage of total pack height
    };
    
    // ========================================
    // COMPUTED SIZES
    // ========================================
    
    const SIZES = {
        // The card/pack art area (what matters for visual consistency)
        card: {
            width: CARD_BASE.width,
            height: CARD_BASE.height,
            aspectRatio: CARD_ASPECT_RATIO,
            borderRadius: '16px'
        },
        
        // Pack total size (art + seal)
        pack: {
            width: CARD_BASE.width,
            // Pack height = card height + seal height
            get height() {
                return `calc(${CARD_BASE.height} + ${SEAL.height})`;
            },
            seal: SEAL
        },
        
        // Reveal card (MUST match card.width and card.height exactly)
        reveal: {
            width: CARD_BASE.width,
            height: CARD_BASE.height,
            borderRadius: '16px'
        }
    };
    
    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    
    /**
     * Apply card sizing to an element
     * @param {HTMLElement} element 
     * @param {string} type - 'card', 'pack', or 'reveal'
     */
    function applySize(element, type = 'card') {
        if (!element) return;
        
        const size = SIZES[type] || SIZES.card;
        element.style.width = size.width;
        element.style.height = size.height;
        
        if (size.borderRadius) {
            element.style.borderRadius = size.borderRadius;
        }
        
        console.log(`[NW_SIZING] Applied ${type} size:`, size.width, 'x', size.height);
    }
    
    /**
     * Get CSS string for inline styles
     * @param {string} type - 'card', 'pack', or 'reveal'
     * @returns {string} CSS properties as string
     */
    function getStyleString(type = 'card') {
        const size = SIZES[type] || SIZES.card;
        return `width: ${size.width}; height: ${size.height};`;
    }
    
    /**
     * Get CSS variables to inject into :root
     * @returns {string} CSS variable declarations
     */
    function getCSSVariables() {
        return `
            --nw-card-width: ${CARD_BASE.width};
            --nw-card-height: ${CARD_BASE.height};
            --nw-card-aspect-ratio: ${CARD_ASPECT_RATIO};
            --nw-seal-height: ${SEAL.height};
            --nw-pack-width: ${SIZES.pack.width};
            --nw-pack-height: ${SIZES.pack.height};
            --nw-card-radius: 16px;
        `;
    }
    
    /**
     * Debug: Show size overlay on elements
     */
    function debugShowSizes() {
        const elements = [
            { selector: '.reveal-card', label: 'Reveal Card' },
            { selector: '.pack-bag', label: 'Pack Bag' },
            { selector: '.pack-bag-body', label: 'Pack Body' },
            { selector: '.card-stage', label: 'Card Stage' }
        ];
        
        elements.forEach(({ selector, label }) => {
            const el = document.querySelector(selector);
            if (el) {
                const rect = el.getBoundingClientRect();
                console.log(`[NW_SIZING DEBUG] ${label}:`, {
                    width: rect.width.toFixed(0) + 'px',
                    height: rect.height.toFixed(0) + 'px',
                    computed: {
                        width: getComputedStyle(el).width,
                        height: getComputedStyle(el).height
                    }
                });
            }
        });
    }
    
    /**
     * Inject CSS variables into document
     */
    function injectCSSVariables() {
        const style = document.createElement('style');
        style.id = 'nw-sizing-vars';
        style.textContent = `:root { ${getCSSVariables()} }`;
        
        // Remove existing if present
        const existing = document.getElementById('nw-sizing-vars');
        if (existing) existing.remove();
        
        document.head.appendChild(style);
        console.log('[NW_SIZING] CSS variables injected');
    }
    
    // ========================================
    // PUBLIC API
    // ========================================
    
    return {
        VERSION,
        CARD_ASPECT_RATIO,
        SIZES,
        SEAL,
        
        // Methods
        applySize,
        getStyleString,
        getCSSVariables,
        debugShowSizes,
        injectCSSVariables,
        
        // Quick access to raw values
        get cardWidth() { return CARD_BASE.width; },
        get cardHeight() { return CARD_BASE.height; },
        get packWidth() { return SIZES.pack.width; },
        get packHeight() { return SIZES.pack.height; }
    };
})();

// Auto-inject CSS variables on load
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => NW_SIZING.injectCSSVariables());
    } else {
        NW_SIZING.injectCSSVariables();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NW_SIZING;
}

console.log('[NW_SIZING] Loaded v' + NW_SIZING.VERSION);
