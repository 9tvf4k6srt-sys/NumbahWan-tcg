/**
 * NumbahWan Currency System v1.0
 * SINGLE SOURCE OF TRUTH for all currency display
 * 
 * Premium, consistent icons across all pages
 * Digital-native design for permanence and trust
 */

const NW_CURRENCY = {
    // ═══════════════════════════════════════════════════════════════
    // CURRENCY DEFINITIONS
    // ═══════════════════════════════════════════════════════════════
    types: {
        diamond: {
            id: 'diamond',
            name: { en: 'Diamonds', zh: '鑽石', th: 'เพชร' },
            symbol: '◆',
            color: '#00d4ff',
            gradient: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 50%, #00d4ff 100%)',
            glow: '0 0 10px rgba(0, 212, 255, 0.5)',
            tier: 1, // Premium
            icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 9L12 22L22 9L12 2Z" fill="url(#diamond-grad)" stroke="#fff" stroke-width="0.5"/>
                <path d="M2 9H22M12 2L7 9L12 22L17 9L12 2" stroke="rgba(255,255,255,0.6)" stroke-width="0.5"/>
                <defs>
                    <linearGradient id="diamond-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#4df0ff"/>
                        <stop offset="50%" style="stop-color:#00d4ff"/>
                        <stop offset="100%" style="stop-color:#0099cc"/>
                    </linearGradient>
                </defs>
            </svg>`
        },
        gold: {
            id: 'gold',
            name: { en: 'Gold', zh: '金幣', th: 'ทอง' },
            symbol: '●',
            color: '#ffd700',
            gradient: 'linear-gradient(135deg, #ffd700 0%, #ffaa00 50%, #ffd700 100%)',
            glow: '0 0 10px rgba(255, 215, 0, 0.5)',
            tier: 2,
            icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="url(#gold-grad)" stroke="#b8860b" stroke-width="1"/>
                <circle cx="12" cy="12" r="7" stroke="rgba(255,255,255,0.4)" stroke-width="0.5" fill="none"/>
                <text x="12" y="16" text-anchor="middle" fill="#8B6914" font-size="10" font-weight="bold">G</text>
                <defs>
                    <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#ffe566"/>
                        <stop offset="50%" style="stop-color:#ffd700"/>
                        <stop offset="100%" style="stop-color:#cc9900"/>
                    </linearGradient>
                </defs>
            </svg>`
        },
        iron: {
            id: 'iron',
            name: { en: 'Iron', zh: '鐵', th: 'เหล็ก' },
            symbol: '⬡',
            color: '#a8a8a8',
            gradient: 'linear-gradient(135deg, #d4d4d4 0%, #a8a8a8 50%, #808080 100%)',
            glow: '0 0 8px rgba(168, 168, 168, 0.4)',
            tier: 3,
            icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" fill="url(#iron-grad)" stroke="#666" stroke-width="0.5"/>
                <path d="M12 2V22M3 7L21 17M21 7L3 17" stroke="rgba(255,255,255,0.3)" stroke-width="0.3"/>
                <defs>
                    <linearGradient id="iron-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#e0e0e0"/>
                        <stop offset="50%" style="stop-color:#a8a8a8"/>
                        <stop offset="100%" style="stop-color:#707070"/>
                    </linearGradient>
                </defs>
            </svg>`
        },
        stone: {
            id: 'stone',
            name: { en: 'Stone', zh: '石頭', th: 'หิน' },
            symbol: '▣',
            color: '#8b7355',
            gradient: 'linear-gradient(135deg, #a08060 0%, #8b7355 50%, #6b5344 100%)',
            glow: '0 0 6px rgba(139, 115, 85, 0.3)',
            tier: 4,
            icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="16" height="16" rx="3" fill="url(#stone-grad)" stroke="#5a4a3a" stroke-width="0.5"/>
                <path d="M7 10L12 7L17 10L12 13L7 10Z" fill="rgba(255,255,255,0.2)"/>
                <path d="M7 14L12 11L17 14" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
                <defs>
                    <linearGradient id="stone-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#b09070"/>
                        <stop offset="50%" style="stop-color:#8b7355"/>
                        <stop offset="100%" style="stop-color:#6b5344"/>
                    </linearGradient>
                </defs>
            </svg>`
        },
        wood: {
            id: 'wood',
            name: { en: 'Sacred Logs', zh: '神聖原木', th: 'ท่อนไม้ศักดิ์สิทธิ์' },
            symbol: '⧫',
            color: '#00ff88',
            gradient: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 50%, #009950 100%)',
            glow: '0 0 15px rgba(0, 255, 136, 0.6)',
            tier: 0, // Ultra Premium
            icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="3" width="12" height="18" rx="2" fill="url(#wood-grad)" stroke="#006633" stroke-width="0.5"/>
                <ellipse cx="12" cy="6" rx="4" ry="2" fill="url(#wood-top)"/>
                <path d="M8 8C8 8 9 10 12 10C15 10 16 8 16 8" stroke="rgba(0,0,0,0.3)" stroke-width="0.5"/>
                <path d="M8 12C8 12 9 14 12 14C15 14 16 12 16 12" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
                <path d="M8 16C8 16 9 18 12 18C15 18 16 16 16 16" stroke="rgba(0,0,0,0.1)" stroke-width="0.5"/>
                <!-- Glow effect -->
                <rect x="6" y="3" width="12" height="18" rx="2" fill="none" stroke="#00ff88" stroke-width="1" opacity="0.5"/>
                <defs>
                    <linearGradient id="wood-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#33ff99"/>
                        <stop offset="50%" style="stop-color:#00ff88"/>
                        <stop offset="100%" style="stop-color:#00cc6a"/>
                    </linearGradient>
                    <linearGradient id="wood-top" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#66ffaa"/>
                        <stop offset="100%" style="stop-color:#00dd77"/>
                    </linearGradient>
                </defs>
            </svg>`
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DISPLAY METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get currency icon HTML
     * @param {string} type - Currency type (diamond, gold, iron, stone, wood)
     * @param {object} options - { size: 16, animate: false, showGlow: true }
     */
    icon(type, options = {}) {
        const currency = this.types[type];
        if (!currency) return '';
        
        const size = options.size || 16;
        const animate = options.animate || false;
        const showGlow = options.showGlow !== false;
        
        const glowStyle = showGlow ? `filter: drop-shadow(${currency.glow});` : '';
        const animClass = animate ? 'nw-currency-pulse' : '';
        
        return `<span class="nw-currency-icon ${animClass}" data-currency="${type}" style="display: inline-flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; ${glowStyle}">${currency.icon}</span>`;
    },

    /**
     * Format currency with icon and amount
     * @param {string} type - Currency type
     * @param {number} amount - Amount to display
     * @param {object} options - { size: 16, compact: false, animate: false, showName: false }
     */
    format(type, amount, options = {}) {
        const currency = this.types[type];
        if (!currency) return amount.toString();
        
        const size = options.size || 16;
        const compact = options.compact || false;
        const showName = options.showName || false;
        const lang = options.lang || this._getLang();
        
        // Format number
        let displayAmount;
        if (compact && amount >= 1000000) {
            displayAmount = (amount / 1000000).toFixed(1) + 'M';
        } else if (compact && amount >= 1000) {
            displayAmount = (amount / 1000).toFixed(1) + 'K';
        } else {
            displayAmount = amount.toLocaleString();
        }
        
        const icon = this.icon(type, { size, animate: options.animate });
        const name = showName ? ` <span class="nw-currency-name">${currency.name[lang] || currency.name.en}</span>` : '';
        
        return `<span class="nw-currency" data-currency="${type}" data-amount="${amount}" style="display: inline-flex; align-items: center; gap: 4px; font-weight: 600; color: ${currency.color};">${icon}<span class="nw-currency-amount">${displayAmount}</span>${name}</span>`;
    },

    /**
     * Create a currency badge (larger, for headers/displays)
     * @param {string} type - Currency type
     * @param {number} amount - Amount
     * @param {object} options - { size: 'sm'|'md'|'lg', style: 'default'|'minimal'|'fancy' }
     */
    badge(type, amount, options = {}) {
        const currency = this.types[type];
        if (!currency) return '';
        
        const sizes = { sm: 20, md: 28, lg: 40 };
        const size = sizes[options.size] || sizes.md;
        const style = options.style || 'default';
        
        const displayAmount = amount.toLocaleString();
        const icon = this.icon(type, { size, showGlow: true, animate: style === 'fancy' });
        
        let badgeStyle = '';
        if (style === 'fancy') {
            badgeStyle = `background: ${currency.gradient}; color: #000; padding: 6px 12px; border-radius: 20px; box-shadow: ${currency.glow}, inset 0 1px 0 rgba(255,255,255,0.3);`;
        } else if (style === 'minimal') {
            badgeStyle = `color: ${currency.color};`;
        } else {
            badgeStyle = `background: rgba(0,0,0,0.6); border: 1px solid ${currency.color}40; padding: 4px 10px; border-radius: 12px; color: ${currency.color};`;
        }
        
        return `<span class="nw-currency-badge" data-currency="${type}" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: ${size * 0.6}px; ${badgeStyle}">${icon}<span>${displayAmount}</span></span>`;
    },

    /**
     * Create a full wallet display
     * @param {object} balances - { diamond: 100, gold: 50, ... }
     * @param {object} options - { layout: 'horizontal'|'vertical'|'grid', showZero: false }
     */
    wallet(balances, options = {}) {
        const layout = options.layout || 'horizontal';
        const showZero = options.showZero || false;
        const order = ['wood', 'diamond', 'gold', 'iron', 'stone']; // By tier
        
        const items = order
            .filter(type => showZero || (balances[type] && balances[type] > 0))
            .map(type => this.format(type, balances[type] || 0, { size: 18 }))
            .join(layout === 'vertical' ? '<br>' : '<span style="margin: 0 8px; opacity: 0.3;">|</span>');
        
        const layoutStyle = layout === 'grid' 
            ? 'display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px;'
            : layout === 'vertical'
            ? 'display: flex; flex-direction: column; gap: 6px;'
            : 'display: flex; align-items: center; flex-wrap: wrap;';
        
        return `<div class="nw-wallet-display" style="${layoutStyle}">${items}</div>`;
    },

    /**
     * Create a cost display (for purchases)
     * @param {object} costs - { diamond: 10, gold: 5 }
     * @param {object} options - { canAfford: true }
     */
    cost(costs, options = {}) {
        const canAfford = options.canAfford !== false;
        const items = Object.entries(costs)
            .filter(([_, amount]) => amount > 0)
            .map(([type, amount]) => this.format(type, amount, { size: 16 }))
            .join(' + ');
        
        const style = canAfford 
            ? '' 
            : 'opacity: 0.5; text-decoration: line-through;';
        
        return `<span class="nw-cost" style="${style}">${items}</span>`;
    },

    /**
     * Create a reward display (earned amounts with +)
     * @param {object} rewards - { diamond: 10, gold: 5 }
     */
    reward(rewards, options = {}) {
        const items = Object.entries(rewards)
            .filter(([_, amount]) => amount > 0)
            .map(([type, amount]) => {
                const currency = this.types[type];
                return `<span style="color: ${currency?.color || '#00ff88'}">+${this.format(type, amount, { size: 16 })}</span>`;
            })
            .join(' ');
        
        return `<span class="nw-reward">${items}</span>`;
    },

    // ═══════════════════════════════════════════════════════════════
    // CSS INJECTION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Inject required CSS (call once on page load)
     */
    injectStyles() {
        if (document.getElementById('nw-currency-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'nw-currency-styles';
        style.textContent = `
            /* Currency animations */
            @keyframes nw-currency-pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.9; }
            }
            
            @keyframes nw-currency-glow {
                0%, 100% { filter: brightness(1); }
                50% { filter: brightness(1.3); }
            }
            
            @keyframes nw-currency-earn {
                0% { transform: scale(0.5) translateY(10px); opacity: 0; }
                50% { transform: scale(1.2) translateY(-5px); opacity: 1; }
                100% { transform: scale(1) translateY(0); opacity: 1; }
            }
            
            @keyframes nw-currency-spend {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(0.5) translateY(-20px); opacity: 0; }
            }
            
            .nw-currency-pulse {
                animation: nw-currency-pulse 2s ease-in-out infinite;
            }
            
            .nw-currency-icon {
                transition: transform 0.2s ease, filter 0.2s ease;
            }
            
            .nw-currency-icon:hover {
                transform: scale(1.15);
            }
            
            .nw-currency-icon svg {
                width: 100%;
                height: 100%;
            }
            
            .nw-currency {
                font-variant-numeric: tabular-nums;
                transition: all 0.3s ease;
            }
            
            .nw-currency-badge {
                font-variant-numeric: tabular-nums;
                transition: all 0.3s ease;
            }
            
            .nw-currency-badge:hover {
                transform: translateY(-1px);
            }
            
            /* Earn animation */
            .nw-currency-earn {
                animation: nw-currency-earn 0.5s ease-out forwards;
            }
            
            /* Spend animation */
            .nw-currency-spend {
                animation: nw-currency-spend 0.3s ease-in forwards;
            }
            
            /* Premium Sacred Log glow */
            [data-currency="wood"] .nw-currency-icon {
                animation: nw-currency-glow 3s ease-in-out infinite;
            }
            
            /* Wallet display */
            .nw-wallet-display {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }
            
            /* Responsive */
            @media (max-width: 480px) {
                .nw-currency-badge {
                    padding: 3px 8px !important;
                    font-size: 12px !important;
                }
            }
        `;
        document.head.appendChild(style);
    },

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    _getLang() {
        return localStorage.getItem('numbahwan_lang') || 'en';
    },

    /**
     * Get currency info
     */
    getInfo(type) {
        const currency = this.types[type];
        if (!currency) return null;
        const lang = this._getLang();
        return {
            ...currency,
            displayName: currency.name[lang] || currency.name.en
        };
    },

    /**
     * Get all currency types
     */
    getAll() {
        return Object.keys(this.types);
    },

    /**
     * Convert emoji to premium icon (migration helper)
     */
    replaceEmoji(text) {
        const emojiMap = {
            '💎': this.icon('diamond', { size: 16 }),
            '🪙': this.icon('gold', { size: 16 }),
            '⚙️': this.icon('iron', { size: 16 }),
            '🪨': this.icon('stone', { size: 16 }),
            '🪵': this.icon('wood', { size: 16 })
        };
        
        let result = text;
        for (const [emoji, icon] of Object.entries(emojiMap)) {
            result = result.replace(new RegExp(emoji, 'g'), icon);
        }
        return result;
    },

    /**
     * Initialize - inject styles and replace emojis on page
     */
    init() {
        this.injectStyles();
        console.log('%c[NW_CURRENCY] v1.0 loaded - Premium currency display system', 
            'background: #1a1a2e; color: #00d4ff; font-size: 12px; padding: 4px 8px; border-radius: 4px;');
    }
};

// Auto-init on DOM ready
if (typeof window !== 'undefined') {
    window.NW_CURRENCY = NW_CURRENCY;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => NW_CURRENCY.init());
    } else {
        NW_CURRENCY.init();
    }
}
