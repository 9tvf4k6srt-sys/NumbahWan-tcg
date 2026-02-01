/**
 * NumbahWan Card Renderer v2.0
 * ================================
 * Dynamically renders TCG cards with CSS-based frames
 * No per-card image generation required - uses pure CSS for frames
 * 
 * USAGE:
 * 1. Include nw-card-frames.css and nw-card-renderer.js
 * 2. Call NW_CARDS.render(cardData, container) or use data attributes
 * 
 * FEATURES:
 * - Automatic frame application based on rarity
 * - Stat gem badges (ATK, DEF, Cost)
 * - Name banners with rarity-themed styling
 * - Responsive card sizes (sm, md, lg)
 * - Lazy loading for card images
 * - Batch rendering for performance
 * - Template system for bulk card creation
 */

const NW_CARD_RENDERER = (function() {
    'use strict';
    
    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        baseImagePath: '/static/images/cards/',
        placeholderImage: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 380"%3E%3Crect fill="%231a1a2e" width="260" height="380"/%3E%3Ctext fill="%23333" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="system-ui" font-size="14"%3ELoading...%3C/text%3E%3C/svg%3E',
        defaultSize: 'md', // sm, md, lg
        lazyLoad: false, // Disable lazy load to show images immediately
        animateOnHover: true,
        showStats: true,
        showRarityBadge: true
    };
    
    // Rarity display names and colors (icons handled by CSS)
    const RARITY_INFO = {
        mythic: { 
            name: 'MYTHIC', 
            color: '#ff6b00',
            gradient: 'linear-gradient(135deg, #ff6b00, #fbbf24, #ff6b00)'
        },
        legendary: { 
            name: 'LEGENDARY', 
            color: '#fbbf24',
            gradient: 'linear-gradient(135deg, #fbbf24, #d97706)'
        },
        epic: { 
            name: 'EPIC', 
            color: '#a855f7',
            gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)'
        },
        rare: { 
            name: 'RARE', 
            color: '#3b82f6',
            gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)'
        },
        uncommon: { 
            name: 'UNCOMMON', 
            color: '#22c55e',
            gradient: 'linear-gradient(135deg, #22c55e, #059669)'
        },
        common: { 
            name: 'COMMON', 
            color: '#6b7280',
            gradient: 'linear-gradient(135deg, #6b7280, #4b5563)'
        }
    };
    
    // Default stat templates for cards without explicit stats
    const STAT_TEMPLATES = {
        mythic:    { atk: [8, 12], def: [8, 12], cost: [6, 8] },
        legendary: { atk: [7, 10], def: [6, 9],  cost: [5, 7] },
        epic:      { atk: [5, 8],  def: [4, 7],  cost: [4, 6] },
        rare:      { atk: [4, 6],  def: [3, 6],  cost: [3, 5] },
        uncommon:  { atk: [2, 4],  def: [2, 4],  cost: [2, 4] },
        common:    { atk: [1, 3],  def: [1, 3],  cost: [1, 3] }
    };
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    /**
     * Generate consistent random number from string seed
     */
    function seededRandom(seed) {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) / 2147483647;
    }
    
    /**
     * Generate stats for a card based on its id and rarity
     */
    function generateStats(cardId, rarity) {
        const template = STAT_TEMPLATES[rarity] || STAT_TEMPLATES.common;
        const seed = String(cardId);
        
        const randAtk = seededRandom(seed + 'atk');
        const randDef = seededRandom(seed + 'def');
        const randCost = seededRandom(seed + 'cost');
        
        return {
            atk: Math.floor(template.atk[0] + randAtk * (template.atk[1] - template.atk[0])),
            def: Math.floor(template.def[0] + randDef * (template.def[1] - template.def[0])),
            cost: Math.floor(template.cost[0] + randCost * (template.cost[1] - template.cost[0]))
        };
    }
    
    /**
     * Parse stat string like "ATK 7 | DEF 5" into object
     */
    function parseStatString(statString) {
        if (!statString) return null;
        
        const stats = {};
        const atkMatch = statString.match(/ATK\s*(\d+)/i);
        const defMatch = statString.match(/DEF\s*(\d+)/i);
        const costMatch = statString.match(/(?:COST|MANA)\s*(\d+)/i);
        const dmgMatch = statString.match(/DMG\s*(\d+)/i);
        const hpMatch = statString.match(/HP\s*([\d,\.]+)([MK]?)/i);
        
        if (atkMatch) stats.atk = parseInt(atkMatch[1]);
        if (defMatch) stats.def = parseInt(defMatch[1]);
        if (costMatch) stats.cost = parseInt(costMatch[1]);
        if (dmgMatch) stats.atk = parseInt(dmgMatch[1]); // DMG = ATK for spells
        if (hpMatch) {
            let hp = parseFloat(hpMatch[1].replace(/,/g, ''));
            if (hpMatch[2] === 'M') hp *= 1000000;
            if (hpMatch[2] === 'K') hp *= 1000;
            stats.hp = hp;
        }
        
        return Object.keys(stats).length > 0 ? stats : null;
    }
    
    /**
     * Format large numbers (e.g., 2246248 -> "2.2M")
     */
    function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return String(num);
    }
    
    /**
     * Get image URL for a card
     */
    function getImageUrl(card) {
        if (!card.img) return CONFIG.placeholderImage;
        if (card.img.startsWith('http') || card.img.startsWith('/')) {
            return card.img;
        }
        return CONFIG.baseImagePath + card.img;
    }
    
    // ============================================
    // CARD RENDERING
    // ============================================
    
    /**
     * Render a single card element
     * @param {Object} card - Card data object
     * @param {Object} options - Rendering options
     * @returns {HTMLElement} - Card DOM element
     */
    function renderCard(card, options = {}) {
        const opts = { ...CONFIG, ...options };
        const rarity = (card.rarity || 'common').toLowerCase();
        const rarityInfo = RARITY_INFO[rarity] || RARITY_INFO.common;
        
        // Parse or generate stats - prioritize gameStats from cards-v2.json
        let stats = card.gameStats || card.stats;
        if (typeof stats === 'string') {
            stats = parseStatString(stats);
        }
        if (!stats && opts.showStats) {
            stats = generateStats(card.id || 0, rarity);
        }
        // Normalize: convert hp to def if needed (gameStats uses hp, renderer uses hp)
        if (stats && stats.hp !== undefined && stats.def === undefined) {
            stats.def = stats.hp; // Use HP as DEF display
        }
        
        // Create card container
        const cardEl = document.createElement('div');
        cardEl.className = `nw-card nw-card-${opts.size || opts.defaultSize}`;
        cardEl.dataset.rarity = rarity;
        cardEl.dataset.cardId = card.id || '';
        cardEl.dataset.cardName = card.name || '';
        
        // Corners removed - CSS handles frame decoration now
        
        // Inner container
        const inner = document.createElement('div');
        inner.className = 'nw-card-inner';
        
        // Card art image - load immediately
        const img = document.createElement('img');
        img.className = 'nw-card-art';
        img.alt = card.name || 'Card';
        img.src = getImageUrl(card);
        img.onerror = () => { 
            img.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
            img.alt = 'Image not found';
        };
        inner.appendChild(img);
        
        cardEl.appendChild(inner);
        
        // Crown/Divine symbols removed - CSS handles rarity decoration now
        
        // Cost gem (top right)
        if (stats && (stats.cost !== undefined || stats.cost !== null)) {
            const cost = document.createElement('div');
            cost.className = 'nw-card-cost';
            cost.textContent = stats.cost || '?';
            cardEl.appendChild(cost);
        }
        
        // Ability tag (if present)
        if (card.ability) {
            const ability = document.createElement('div');
            ability.className = 'nw-card-ability';
            ability.textContent = card.ability;
            cardEl.appendChild(ability);
        }
        
        // Name banner
        const banner = document.createElement('div');
        banner.className = 'nw-card-banner';
        
        const nameEl = document.createElement('div');
        nameEl.className = 'nw-card-name';
        nameEl.textContent = card.name || 'Unknown';
        banner.appendChild(nameEl);
        
        if (card.title) {
            const titleEl = document.createElement('div');
            titleEl.className = 'nw-card-title';
            titleEl.textContent = card.title;
            banner.appendChild(titleEl);
        }
        
        cardEl.appendChild(banner);
        
        // Stats container
        if (opts.showStats && stats) {
            const statsContainer = document.createElement('div');
            statsContainer.className = 'nw-card-stats-container';
            
            // ATK gem
            if (stats.atk !== undefined) {
                const atkGem = document.createElement('div');
                atkGem.className = 'nw-card-stat atk';
                atkGem.innerHTML = `
                    <span class="nw-card-stat-value">${stats.atk}</span>
                    <span class="nw-card-stat-label">ATK</span>
                `;
                statsContainer.appendChild(atkGem);
            }
            
            // DEF gem
            if (stats.def !== undefined) {
                const defGem = document.createElement('div');
                defGem.className = 'nw-card-stat def';
                defGem.innerHTML = `
                    <span class="nw-card-stat-value">${stats.def}</span>
                    <span class="nw-card-stat-label">DEF</span>
                `;
                statsContainer.appendChild(defGem);
            }
            
            // HP display for boss cards
            if (stats.hp !== undefined) {
                const hpGem = document.createElement('div');
                hpGem.className = 'nw-card-stat hp';
                hpGem.innerHTML = `
                    <span class="nw-card-stat-value">${formatNumber(stats.hp)}</span>
                    <span class="nw-card-stat-label">HP</span>
                `;
                hpGem.style.cssText = `
                    background: linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #22c55e 100%);
                    border: 2px solid #4ade80;
                    box-shadow: 0 0 15px rgba(34, 197, 94, 0.6);
                `;
                statsContainer.appendChild(hpGem);
            }
            
            cardEl.appendChild(statsContainer);
        }
        
        // Rarity badge
        if (opts.showRarityBadge) {
            const rarityBadge = document.createElement('div');
            rarityBadge.className = 'nw-card-rarity';
            rarityBadge.textContent = rarityInfo.name;
            cardEl.appendChild(rarityBadge);
        }
        
        // Click handler for card details
        if (opts.onClick) {
            cardEl.addEventListener('click', () => opts.onClick(card, cardEl));
        }
        
        // Apply premium effects (holo + shine) for Legendary/Mythic
        // Deferred to allow DOM attachment first
        if (rarity === 'legendary' || rarity === 'mythic') {
            requestAnimationFrame(() => {
                if (window.NW_FX) {
                    window.NW_FX.holo.apply(cardEl, { rarity });
                    window.NW_FX.shine.add(cardEl);
                }
            });
        }
        
        return cardEl;
    }
    
    // ============================================
    // LAZY LOADING
    // ============================================
    
    let imageObserver = null;
    
    function initImageObserver() {
        if (imageObserver) return;
        
        imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        delete img.dataset.src;
                    }
                    imageObserver.unobserve(img);
                }
            });
        }, { rootMargin: '100px' });
    }
    
    function observeImage(img) {
        if (!imageObserver) initImageObserver();
        imageObserver.observe(img);
    }
    
    // ============================================
    // BATCH RENDERING
    // ============================================
    
    /**
     * Render multiple cards into a container
     * @param {Array} cards - Array of card data objects
     * @param {HTMLElement|string} container - Container element or selector
     * @param {Object} options - Rendering options
     */
    function renderCards(cards, container, options = {}) {
        const containerEl = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!containerEl) {
            console.error('[NW_CARD_RENDERER] Container not found:', container);
            return;
        }
        
        // Use DocumentFragment for performance
        const fragment = document.createDocumentFragment();
        
        cards.forEach(card => {
            const cardEl = renderCard(card, options);
            fragment.appendChild(cardEl);
        });
        
        // Optionally clear container first
        if (options.clear) {
            containerEl.innerHTML = '';
        }
        
        containerEl.appendChild(fragment);
        
        console.log(`[NW_CARD_RENDERER] Rendered ${cards.length} cards`);
    }
    
    /**
     * Render cards grouped by rarity
     * @param {Array} cards - Array of card data objects
     * @param {HTMLElement|string} container - Container element or selector
     * @param {Object} options - Rendering options
     */
    function renderCardsByRarity(cards, container, options = {}) {
        const containerEl = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!containerEl) {
            console.error('[NW_CARD_RENDERER] Container not found:', container);
            return;
        }
        
        const rarityOrder = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
        const grouped = {};
        
        // Group cards by rarity
        cards.forEach(card => {
            const rarity = (card.rarity || 'common').toLowerCase();
            if (!grouped[rarity]) grouped[rarity] = [];
            grouped[rarity].push(card);
        });
        
        // Clear container if needed
        if (options.clear) {
            containerEl.innerHTML = '';
        }
        
        // Render each rarity group
        rarityOrder.forEach(rarity => {
            if (!grouped[rarity] || grouped[rarity].length === 0) return;
            
            const rarityInfo = RARITY_INFO[rarity];
            
            // Section header
            const section = document.createElement('div');
            section.className = 'nw-card-section';
            section.dataset.rarity = rarity;
            
            const header = document.createElement('div');
            header.className = 'nw-card-section-header';
            header.innerHTML = `
                <span class="nw-card-section-icon">${rarityInfo.icon}</span>
                <span class="nw-card-section-title">${rarityInfo.name}</span>
                <span class="nw-card-section-count">${grouped[rarity].length} cards</span>
            `;
            header.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 15px 20px;
                margin: 20px 0 15px;
                background: ${rarityInfo.gradient};
                border-radius: 10px;
                font-family: 'Orbitron', sans-serif;
                font-weight: 700;
                color: white;
                text-transform: uppercase;
                letter-spacing: 2px;
            `;
            section.appendChild(header);
            
            // Cards grid
            const grid = document.createElement('div');
            grid.className = 'nw-card-grid';
            grid.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
                justify-content: flex-start;
            `;
            
            grouped[rarity].forEach(card => {
                const cardEl = renderCard(card, options);
                grid.appendChild(cardEl);
            });
            
            section.appendChild(grid);
            containerEl.appendChild(section);
        });
    }
    
    // ============================================
    // AUTO-INITIALIZATION
    // ============================================
    
    /**
     * Auto-render cards from data attributes
     * Usage: <div data-nw-cards='[{"id":1,"name":"Test","rarity":"mythic"}]'></div>
     */
    function autoInit() {
        document.querySelectorAll('[data-nw-cards]').forEach(container => {
            try {
                const cards = JSON.parse(container.dataset.nwCards);
                const options = {
                    size: container.dataset.nwSize || 'md',
                    showStats: container.dataset.nwStats !== 'false',
                    showRarityBadge: container.dataset.nwBadge !== 'false',
                    clear: true
                };
                renderCards(cards, container, options);
            } catch (e) {
                console.error('[NW_CARD_RENDERER] Auto-init error:', e);
            }
        });
    }
    
    // ============================================
    // HTML TEMPLATE GENERATOR
    // ============================================
    
    /**
     * Generate HTML string for a card (useful for SSR or inline HTML)
     * @param {Object} card - Card data object
     * @param {Object} options - Rendering options
     * @returns {string} - HTML string
     */
    function generateCardHTML(card, options = {}) {
        const opts = { ...CONFIG, ...options };
        const rarity = (card.rarity || 'common').toLowerCase();
        const rarityInfo = RARITY_INFO[rarity] || RARITY_INFO.common;
        
        let stats = card.stats;
        if (typeof stats === 'string') {
            stats = parseStatString(stats);
        }
        if (!stats && opts.showStats) {
            stats = generateStats(card.id || 0, rarity);
        }
        
        const imgUrl = getImageUrl(card);
        const sizeClass = opts.size ? `nw-card-${opts.size}` : '';
        
        let cornersHTML = '';
        ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(pos => {
            cornersHTML += `<div class="nw-card-corner ${pos}"></div>`;
        });
        
        let specialSymbol = '';
        if (rarity === 'mythic') {
            specialSymbol = `<div class="nw-card-divine">${rarityInfo.divine}</div>`;
        } else if (rarity === 'legendary') {
            specialSymbol = `<div class="nw-card-crown">${rarityInfo.crown}</div>`;
        }
        
        let costHTML = '';
        if (stats && stats.cost !== undefined) {
            costHTML = `<div class="nw-card-cost">${stats.cost}</div>`;
        }
        
        let abilityHTML = '';
        if (card.ability) {
            abilityHTML = `<div class="nw-card-ability">${card.ability}</div>`;
        }
        
        let statsHTML = '';
        if (opts.showStats && stats) {
            let atkHTML = stats.atk !== undefined ? `
                <div class="nw-card-stat atk">
                    <span class="nw-card-stat-value">${stats.atk}</span>
                    <span class="nw-card-stat-label">ATK</span>
                </div>
            ` : '';
            
            let defHTML = stats.def !== undefined ? `
                <div class="nw-card-stat def">
                    <span class="nw-card-stat-value">${stats.def}</span>
                    <span class="nw-card-stat-label">DEF</span>
                </div>
            ` : '';
            
            statsHTML = `
                <div class="nw-card-stats-container">
                    ${atkHTML}
                    ${defHTML}
                </div>
            `;
        }
        
        let badgeHTML = '';
        if (opts.showRarityBadge) {
            badgeHTML = `<div class="nw-card-rarity">${rarityInfo.name}</div>`;
        }
        
        return `
            <div class="nw-card ${sizeClass}" data-rarity="${rarity}" data-card-id="${card.id || ''}" data-card-name="${card.name || ''}">
                ${cornersHTML}
                <div class="nw-card-inner">
                    <img class="nw-card-art" src="${imgUrl}" alt="${card.name || 'Card'}" loading="lazy" onerror="this.src='${CONFIG.placeholderImage}'">
                </div>
                ${specialSymbol}
                ${costHTML}
                ${abilityHTML}
                <div class="nw-card-banner">
                    <div class="nw-card-name">${card.name || 'Unknown'}</div>
                    ${card.title ? `<div class="nw-card-title">${card.title}</div>` : ''}
                </div>
                ${statsHTML}
                ${badgeHTML}
            </div>
        `.trim();
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    
    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
    
    return {
        // Core rendering
        render: renderCard,
        renderCard,
        renderCards,
        renderCardsByRarity,
        
        // HTML generation
        generateHTML: generateCardHTML,
        
        // Utilities
        parseStats: parseStatString,
        generateStats,
        getImageUrl,
        formatNumber,
        
        // Configuration
        config: CONFIG,
        rarityInfo: RARITY_INFO,
        statTemplates: STAT_TEMPLATES,
        
        // Manual init
        init: autoInit,
        
        // Version
        version: '2.0.0'
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NW_CARD_RENDERER;
}

// Global alias
window.NW_CARDS = window.NW_CARDS || NW_CARD_RENDERER;

console.log('[NW_CARD_RENDERER] v2.0.0 loaded - CSS-based card frames ready');
