/**
 * NumbahWan Currency System v3.0
 * THE WORLD'S MOST COVETED DIGITAL CURRENCY
 * 
 * 3-TIER ECONOMY: NWG (premium) → Gold (earned) → Sacred Log (prestige)
 * 
 * SINGLE SOURCE OF TRUTH for all currency display
 * Premium, consistent icons across all pages
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY NWG BEATS BITCOIN:
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │ • DEFLATIONARY: 1% burned on every transaction                        │
 * │ • STAKEABLE: Up to 40% APY for locking NWG                            │
 * │ • REAL VALUE: 10% of merch revenue backs NWG                          │
 * │ • TIER BENEFITS: Status + access increase with holdings               │
 * │ • EARN NOT JUST BUY: Gameplay rewards, not just purchases             │
 * └────────────────────────────────────────────────────────────────────────┘
 * 
 * Exchange Rates (ONE WAY ONLY - deflationary):
 * ┌─────────────────────────────────────────┐
 * │  $1 USD = 100 NWG (anchor)              │
 * │  1 NWG  = 10 Gold (one-way)             │
 * │  1% BURN on every transaction           │
 * │  Sacred Log = NEVER purchasable         │
 * └─────────────────────────────────────────┘
 */

const NW_CURRENCY = {
    // ═══════════════════════════════════════════════════════════════
    // SYSTEM INFO
    // ═══════════════════════════════════════════════════════════════
    version: '3.0',
    
    // Exchange rates (one-way conversions only + BURN)
    exchangeRates: {
        usdToNwg: 100,          // $1 = 100 NWG
        nwgToGold: 10,          // 1 NWG = 10 Gold
        transactionBurn: 0.01,  // 1% burned on spend
        exchangeBurn: 0.02,     // 2% burned on exchange
        // NO reverse exchanges - value flows DOWN only
        // Sacred Log cannot be bought/sold
    },

    // ═══════════════════════════════════════════════════════════════
    // CURRENCY DEFINITIONS (3-Tier System)
    // ═══════════════════════════════════════════════════════════════
    types: {
        nwg: {
            id: 'nwg',
            name: { 
                en: 'NWG', 
                zh: 'NWG幣', 
                th: 'NWG' 
            },
            fullName: {
                en: 'NumbahWan Gold',
                zh: 'NumbahWan 黃金幣',
                th: 'NumbahWan โกลด์'
            },
            symbol: '◆',
            color: '#00d4ff',
            gradient: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 50%, #00d4ff 100%)',
            glow: '0 0 10px rgba(0, 212, 255, 0.5)',
            tier: 1, // Premium
            description: {
                en: 'Deflationary, stakeable, revenue-backed. Beats Bitcoin.',
                zh: '通縮、可質押、收益支撐。超越比特幣。',
                th: 'เงินฝืด สเตคได้ มีรายได้หนุน ดีกว่า Bitcoin'
            },
            howToGet: {
                en: ['Purchase ($1 = 100 NWG)', 'Stake rewards (40% APY)', 'Daily login bonus', 'Achievements', 'Referrals (+100 each)'],
                zh: ['購買 ($1 = 100 NWG)', '質押獎勵 (40% APY)', '每日登入獎勵', '成就獎勵', '推薦 (+100 每位)'],
                th: ['ซื้อ ($1 = 100 NWG)', 'รางวัลสเตค (40% APY)', 'โบนัสเข้าสู่ระบบ', 'ความสำเร็จ', 'แนะนำ (+100 คน)']
            },
            uses: {
                en: ['Card pulls', 'Stake for APY', 'Convert to Gold (10x)', 'Premium merch', 'Tier benefits'],
                zh: ['抽卡', '質押賺息', '兌換金幣 (10x)', '高級周邊', '等級福利'],
                th: ['ดึงการ์ด', 'สเตครับ APY', 'แปลงเป็นทอง (10x)', 'สินค้าพรีเมียม', 'สิทธิ์ตามระดับ']
            },
            investmentThesis: {
                en: '1% burned per transaction • Up to 40% APY staking • 10% merch revenue backing • Tier benefits',
                zh: '每筆交易燃燒 1% • 最高 40% APY 質押 • 10% 商品收益支撐 • 等級福利',
                th: 'เผา 1% ต่อธุรกรรม • สเตคสูงสุด 40% APY • รายได้สินค้าหนุน 10% • สิทธิ์ตามระดับ'
            },
            icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 9L12 22L22 9L12 2Z" fill="url(#nwg-grad)" stroke="#fff" stroke-width="0.5"/>
                <path d="M2 9H22M12 2L7 9L12 22L17 9L12 2" stroke="rgba(255,255,255,0.6)" stroke-width="0.5"/>
                <text x="12" y="14" text-anchor="middle" fill="#fff" font-size="5" font-weight="bold">NWG</text>
                <defs>
                    <linearGradient id="nwg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#4df0ff"/>
                        <stop offset="50%" style="stop-color:#00d4ff"/>
                        <stop offset="100%" style="stop-color:#0099cc"/>
                    </linearGradient>
                </defs>
            </svg>`
        },
        gold: {
            id: 'gold',
            name: { 
                en: 'Gold', 
                zh: '金幣', 
                th: 'ทอง' 
            },
            fullName: {
                en: 'Gold Coins',
                zh: '金幣',
                th: 'เหรียญทอง'
            },
            symbol: '●',
            color: '#ffd700',
            gradient: 'linear-gradient(135deg, #ffd700 0%, #ffaa00 50%, #ffd700 100%)',
            glow: '0 0 10px rgba(255, 215, 0, 0.5)',
            tier: 2, // Standard (earned)
            description: {
                en: 'Earned through gameplay - Your dedication rewarded',
                zh: '透過遊戲賺取 - 您的努力得到回報',
                th: 'ได้รับจากการเล่น - รางวัลจากความทุ่มเท'
            },
            howToGet: {
                en: ['Win arcade games', 'Daily quests', 'Card battles', 'Convert from NWG (1:10)'],
                zh: ['贏得街機遊戲', '每日任務', '卡牌對戰', '從NWG兌換 (1:10)'],
                th: ['ชนะเกมอาร์เคด', 'เควสรายวัน', 'ต่อสู้การ์ด', 'แปลงจาก NWG (1:10)']
            },
            uses: {
                en: ['Standard pulls', 'Card upgrades', 'Merch purchases', 'Basic features'],
                zh: ['普通抽卡', '卡牌升級', '商品購買', '基本功能'],
                th: ['ดึงมาตรฐาน', 'อัพเกรดการ์ด', 'ซื้อสินค้า', 'ฟีเจอร์พื้นฐาน']
            },
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
        wood: {
            id: 'wood',
            name: { 
                en: 'Sacred Log', 
                zh: '神聖原木', 
                th: 'ท่อนไม้ศักดิ์สิทธิ์' 
            },
            fullName: {
                en: 'Sacred Log',
                zh: '神聖原木',
                th: 'ท่อนไม้ศักดิ์สิทธิ์'
            },
            symbol: '⧫',
            color: '#00ff88',
            gradient: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 50%, #009950 100%)',
            glow: '0 0 15px rgba(0, 255, 136, 0.6)',
            tier: 0, // Ultra Prestige (CANNOT BE BOUGHT)
            description: {
                en: 'Prestige currency - Proof of mastery',
                zh: '威望貨幣 - 精通的證明',
                th: 'สกุลเงินเกียรติยศ - หลักฐานแห่งความเชี่ยวชาญ'
            },
            howToGet: {
                en: ['Pull a Mythic card', '7-day login streak', 'Top 10 leaderboard', 'Complete card sets'],
                zh: ['抽到神話卡', '連續登入7天', '排行榜前10名', '完成卡組收集'],
                th: ['ดึงการ์ด Mythic', 'เข้าสู่ระบบ 7 วันติด', 'ติด Top 10', 'สะสมครบชุด']
            },
            uses: {
                en: ['Guaranteed Mythic pull', 'Legendary selector', 'Exclusive merch', 'Profile titles'],
                zh: ['保證神話抽卡', '傳奇選擇器', '專屬商品', '個人稱號'],
                th: ['ดึง Mythic แน่นอน', 'เลือก Legendary', 'สินค้าพิเศษ', 'ตำแหน่งโปรไฟล์']
            },
            special: {
                en: '⚠️ CANNOT BE PURCHASED - Must be EARNED!',
                zh: '⚠️ 無法購買 - 必須靠實力獲得！',
                th: '⚠️ ซื้อไม่ได้ - ต้องได้รับจากความสามารถ!'
            },
            icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="sacred-wood-body" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#2d1810"/>
                        <stop offset="50%" style="stop-color:#1a0f0a"/>
                        <stop offset="100%" style="stop-color:#0d0805"/>
                    </linearGradient>
                    <linearGradient id="sacred-rune-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#ffd700"/>
                        <stop offset="50%" style="stop-color:#ff9500"/>
                        <stop offset="100%" style="stop-color:#ffd700"/>
                    </linearGradient>
                    <filter id="sacred-glow">
                        <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                </defs>
                <!-- Dark wood body -->
                <rect x="6" y="2" width="12" height="20" rx="3" fill="url(#sacred-wood-body)" stroke="#3d2817" stroke-width="0.5"/>
                <!-- Wood rings -->
                <ellipse cx="12" cy="5" rx="4" ry="1.5" fill="none" stroke="#3d2817" stroke-width="0.3" opacity="0.5"/>
                <!-- Glowing runes -->
                <g filter="url(#sacred-glow)" fill="url(#sacred-rune-glow)">
                    <path d="M12 6L10 8L12 10L14 8Z" opacity="0.9"/>
                    <path d="M10 11L9 13L10 15L11 13Z" opacity="0.8"/>
                    <path d="M14 11L13 13L14 15L15 13Z" opacity="0.8"/>
                    <path d="M12 16L10.5 18L12 20L13.5 18Z" opacity="0.9"/>
                </g>
                <!-- Cosmic particles -->
                <circle cx="8" cy="7" r="0.5" fill="#ffd700" opacity="0.7">
                    <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2s" repeatCount="indefinite"/>
                </circle>
                <circle cx="16" cy="12" r="0.4" fill="#ff9500" opacity="0.6">
                    <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite"/>
                </circle>
                <circle cx="9" cy="18" r="0.3" fill="#ffd700" opacity="0.5">
                    <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.5s" repeatCount="indefinite"/>
                </circle>
            </svg>`
        },
        
        // LEGACY ALIASES (for backward compatibility)
        // These map to the new currencies
        diamond: null, // Will be set to reference 'nwg' below
        iron: null,    // DEPRECATED - removed
        stone: null    // DEPRECATED - removed
    },

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
    
    _initialized: false,
    
    init() {
        if (this._initialized) return;
        
        // Set up legacy aliases
        this.types.diamond = this.types.nwg;
        
        this.injectStyles();
        this._initialized = true;
        
        console.log('%c[NW_CURRENCY] v3.0 - World\'s Most Coveted Digital Currency', 
            'background: linear-gradient(90deg, #00d4ff, #ffd700, #00ff88); color: #000; font-size: 12px; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
        console.log('%c◆ NWG (Deflationary + Stakeable) → ● Gold (Earned) → ⧫ Sacred Log (Prestige)', 
            'color: #888; font-size: 11px;');
        console.log('%c🔥 1% BURN per transaction | 📈 Up to 40% APY | 💎 Tier benefits', 
            'color: #00d4ff; font-size: 10px;');
    },

    // ═══════════════════════════════════════════════════════════════
    // DISPLAY METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get currency icon HTML
     * @param {string} type - Currency type (nwg, gold, wood) or legacy (diamond)
     * @param {object} options - { size: 16, animate: false, showGlow: true }
     */
    icon(type, options = {}) {
        // Handle legacy 'diamond' -> 'nwg'
        if (type === 'diamond') type = 'nwg';
        
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
        // Handle legacy 'diamond' -> 'nwg'
        if (type === 'diamond') type = 'nwg';
        
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
     */
    badge(type, amount, options = {}) {
        if (type === 'diamond') type = 'nwg';
        
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
     * Create a full wallet display (3 currencies only)
     */
    wallet(balances, options = {}) {
        const layout = options.layout || 'horizontal';
        const showZero = options.showZero || false;
        const order = ['wood', 'nwg', 'gold']; // By tier
        
        // Handle legacy 'diamond' key
        if (balances.diamond && !balances.nwg) {
            balances.nwg = balances.diamond;
        }
        
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
     */
    cost(costs, options = {}) {
        // Handle legacy 'diamond' key
        if (costs.diamond) {
            costs.nwg = costs.diamond;
            delete costs.diamond;
        }
        
        const canAfford = options.canAfford !== false;
        const items = Object.entries(costs)
            .filter(([type, amount]) => amount > 0 && this.types[type])
            .map(([type, amount]) => this.format(type, amount, { size: 16 }))
            .join(' + ');
        
        const style = canAfford 
            ? '' 
            : 'opacity: 0.5; text-decoration: line-through;';
        
        return `<span class="nw-cost" style="${style}">${items}</span>`;
    },

    /**
     * Create a reward display (earned amounts with +)
     */
    reward(rewards, options = {}) {
        // Handle legacy 'diamond' key
        if (rewards.diamond) {
            rewards.nwg = rewards.diamond;
            delete rewards.diamond;
        }
        
        const items = Object.entries(rewards)
            .filter(([type, amount]) => amount > 0 && this.types[type])
            .map(([type, amount]) => {
                const currency = this.types[type];
                return `<span style="color: ${currency?.color || '#00ff88'}">+${this.format(type, amount, { size: 16 })}</span>`;
            })
            .join(' ');
        
        return `<span class="nw-reward">${items}</span>`;
    },

    // ═══════════════════════════════════════════════════════════════
    // EXCHANGE CALCULATOR
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Calculate exchange rate (one-way only)
     */
    calculateExchange(from, to, amount) {
        if (from === 'diamond') from = 'nwg';
        
        // Only allowed conversions:
        // USD -> NWG
        // NWG -> Gold
        
        if (from === 'usd' && to === 'nwg') {
            return amount * this.exchangeRates.usdToNwg;
        }
        if (from === 'nwg' && to === 'gold') {
            return amount * this.exchangeRates.nwgToGold;
        }
        
        // Sacred Log cannot be exchanged
        if (from === 'wood' || to === 'wood') {
            return null; // Not allowed
        }
        
        // Reverse exchanges not allowed
        return null;
    },
    
    /**
     * Get USD value of currency
     */
    getUsdValue(type, amount) {
        if (type === 'diamond') type = 'nwg';
        
        if (type === 'nwg') {
            return amount / this.exchangeRates.usdToNwg;
        }
        if (type === 'gold') {
            return amount / (this.exchangeRates.usdToNwg * this.exchangeRates.nwgToGold);
        }
        // Sacred Log is priceless
        return null;
    },

    // ═══════════════════════════════════════════════════════════════
    // CSS INJECTION
    // ═══════════════════════════════════════════════════════════════

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
            
            /* NWG shimmer effect */
            [data-currency="nwg"] .nw-currency-icon {
                animation: nw-currency-glow 2s ease-in-out infinite;
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

    getInfo(type) {
        if (type === 'diamond') type = 'nwg';
        const currency = this.types[type];
        if (!currency) return null;
        const lang = this._getLang();
        return {
            ...currency,
            displayName: currency.name[lang] || currency.name.en,
            displayDescription: currency.description[lang] || currency.description.en
        };
    },

    getAll() {
        return ['nwg', 'gold', 'wood']; // Only valid currencies
    },

    // Migration helper - convert old currency references
    migrateLegacy(text) {
        return text
            .replace(/diamond/gi, 'nwg')
            .replace(/iron/gi, 'gold')  // Iron was removed, gold is closest
            .replace(/stone/gi, 'gold'); // Stone was removed, gold is closest
    },

    replaceEmoji(text) {
        const emojiMap = {
            '💎': this.icon('nwg', { size: 16 }),
            '◆': this.icon('nwg', { size: 16 }),
            '🪙': this.icon('gold', { size: 16 }),
            '●': this.icon('gold', { size: 16 }),
            '🪵': this.icon('wood', { size: 16 }),
            '⧫': this.icon('wood', { size: 16 })
        };
        
        let result = text;
        for (const [emoji, icon] of Object.entries(emojiMap)) {
            result = result.replace(new RegExp(emoji, 'g'), icon);
        }
        return result;
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
