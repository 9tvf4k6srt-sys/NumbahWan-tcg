/**
 * NumbahWan TCG - Unified Navigation System v9.0
 * 60FPS BUTTERY SMOOTH EDITION - Mobile Optimized
 * Progressive Disclosure — show 4 pages Day 1, unlock rest as you play
 * 
 * NEW in v9.0:
 * - Progressive Disclosure: sections unlock based on play stats
 * - Unlock notifications with toast animation
 * - Existing players auto-detected, see everything immediately
 * - All pages still accessible by direct URL (never blocked)
 * 
 * v8.2:
 * - Intuitive Back Button System
 * - Smart navigation history tracking
 * - Contextual back navigation (browser history or parent page)
 * 
 * Performance optimizations:
 * - GPU-accelerated transforms only (translate3d, no layout thrashing)
 * - Removed backdrop-filter blur (laggy on mobile Safari)
 * - will-change hints for compositor optimization
 * - requestAnimationFrame for smooth animations
 * - CSS containment for paint/layout isolation
 * - Passive event listeners
 * - backface-visibility hidden for GPU layers
 * - Faster transitions (0.08s-0.2s range)
 */

const NW_NAV = {
    // Inline icon paths
    icons: {
        home: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
        fire: '<path d="M12 2C9 6 9 9 9 9c0 2 1.5 3 3 3s3-1 3-3c0-3-3-7-3-7zm0 20c-5 0-8-4-8-8 0-4 2-7 4-9 0 3 2 5 4 5s4-2 4-5c2 2 4 5 4 9 0 4-3 8-8 8z"/>',
        swords: '<path d="M6 2l-2 2 6 6-4 4 2 2 4-4 6 6 2-2-6-6 4-4-2-2-4 4-6-6zm12 0l2 2-8 8 2 2 8-8 2 2V2h-6z"/>',
        wallet: '<path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm16 7a2 2 0 100-4h-2v4h2z"/>',
        trade: '<path d="M8 7h12l-4-4m0 8h-12l4 4m8-12v8m-8 4v-8"/>',
        'cards-stack': '<path d="M4 6h12v12H4zM8 2h12v12"/>',
        inventory: '<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>',
        clipboard: '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>',
        gaming: '<path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1-9l-4 4m0-4v4"/>',
        'shopping-bag': '<path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>',
        chart: '<path d="M3 3v18h18M9 17V9m4 8v-5m4 5V6"/>',
        coins: '<circle cx="9" cy="9" r="5"/><path d="M15 9a6 6 0 11-6 6"/>',
        shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        trophy: '<path d="M6 9H4a2 2 0 01-2-2V5h4m12 4h2a2 2 0 002-2V5h-4M12 17v4m-4 0h8M8 3h8v7a4 4 0 01-8 0V3z"/>',
        anchor: '<path d="M12 8a2 2 0 100-4 2 2 0 000 4zm0 0v12m-5-4c0 2.5 2.2 4 5 4s5-1.5 5-4M5 12H3m18 0h-2"/>',
        dress: '<path d="M12 2v2m0 4v2m-2-6h4m-6 4h8l2 12H6l2-12z"/>',
        meme: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
        crown: '<path d="M2 8l4 4 4-6 4 6 4-4v10H2V8z"/>',
        eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
        skull: '<circle cx="12" cy="10" r="8"/><path d="M8 16v4h2v-2h4v2h2v-4M9 10h.01M15 10h.01M10 13h4"/>',
        'crystal-ball': '<circle cx="12" cy="10" r="7"/><path d="M8 18h8l-1 3H9l-1-3z"/>',
        form: '<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.6a1 1 0 01.7.3l5.4 5.4a1 1 0 01.3.7V19a2 2 0 01-2 2z"/>',
        scroll: '<path d="M7 21h10a2 2 0 002-2V9.4a1 1 0 00-.3-.7l-5.4-5.4a1 1 0 00-.7-.3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>',
        lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
        menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
        close: '<path d="M6 18L18 6M6 6l12 12"/>',
        'arrow-right': '<path d="M9 18l6-6-6-6"/>',
        globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20 15 15 0 010-20z"/>',
        portal: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="4"/>',
        dragon: '<path d="M4 8c0-2 2-4 4-4 1 0 2 .5 3 1l1 1 1-1c1-.5 2-1 3-1 2 0 4 2 4 4 0 3-4 6-8 10-4-4-8-7-8-10z"/>',
        dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><circle cx="16" cy="8" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="8" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/>',
        book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
        lightning: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
        sparkles: '<path d="M12 2l2 7h7l-5.5 4 2 7-5.5-4-5.5 4 2-7L3 9h7l2-7z"/>',
        theater: '<path d="M4 8c0-2 2-4 4-4h8c2 0 4 2 4 4v8c0 2-2 4-4 4H8c-2 0-4-2-4-4V8zm4 3v2m8-2v2m-8 4c2 2 6 2 8 0"/>'
    },
    
    iconSvg(iconId, size = 18) {
        const path = this.icons[iconId] || this.icons.star;
        return `<svg class="nw-nav-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    },

    // ===== PROGRESSIVE DISCLOSURE =====
    // Tier thresholds — what stat unlocks what
    // Tier 0: brand new (pullsMade=0, gamesPlayed=0)
    // Tier 1: first pull (pullsMade >= 1)
    // Tier 2: engaged (pullsMade >= 10 OR gamesPlayed >= 5)
    // Tier 3: invested (collection >= 20 OR gamesPlayed >= 20)
    // Tier 4: veteran (collection >= 50 OR gamesPlayed >= 50)
    // Tier 5: endgame (collection >= 80 OR pullsMade >= 100)
    //
    // ALL PAGES are always accessible by direct URL. Only nav visibility changes.
    // Existing players (any stat > 0) auto-resolve to correct tier on first load.
    sectionUnlockTier: {
        core: 0,        // Always visible (Home, Forge, Battle, Wallet)
        cards: 0,       // Always visible (All Cards, My Cards)
        economy: 2,     // After engagement
        business: 3,    // After investment
        guild: 3,       // After investment
        government: 4,  // Veterans
        abyss: 3,       // After investment (lore = retention hook)
        tabletop: 4,    // Veterans (D&D content)
        buildlab: 4,    // Veterans
        resources: 2,   // After engagement (guide, academy)
        sisters: 5      // Endgame (alliance)
    },

    // Per-page overrides: some pages within an unlocked section need higher tier
    pageUnlockTier: {
        // Core pages — gate some behind first pull
        'profile-card': 1,
        'achievements': 1,
        'shrine': 1,
        // Cards — gate advanced features
        'leaderboard': 1,
        'deckbuilder': 2,
        'staking': 2,
        'fusion': 3,
        // Economy — events always visible once section unlocks
        'auction-house': 3,
        'exchange': 2
    },

    _playerTier: null,
    _unlockedSectionsKey: 'nw_unlocked_sections',

    // Calculate player tier from wallet stats — no new localStorage keys needed
    getPlayerTier() {
        if (this._playerTier !== null) return this._playerTier;

        // GM mode = max tier (all content visible)
        if (typeof NW_WALLET !== 'undefined' && NW_WALLET.isGM) {
            this._playerTier = 5;
            return 5;
        }
        // URL param shortcut: ?tier=5 for review
        try {
            const tp = new URLSearchParams(window.location.search).get('tier');
            if (tp !== null) { this._playerTier = Math.min(5, Math.max(0, parseInt(tp) || 0)); return this._playerTier; }
        } catch(e) {}

        // Read from NW_WALLET if available
        let stats = { pullsMade: 0, gamesPlayed: 0, gamesWon: 0 };
        let collectionCount = 0;

        if (typeof NW_WALLET !== 'undefined' && NW_WALLET.getStats) {
            const s = NW_WALLET.getStats();
            stats = { ...stats, ...s };
        }
        if (typeof NW_WALLET !== 'undefined' && NW_WALLET.getWalletInfo) {
            const info = NW_WALLET.getWalletInfo();
            if (info) collectionCount = info.collectionCount || 0;
        }

        // Fallback: try reading raw localStorage for wallets not yet initialized
        if (stats.pullsMade === 0 && stats.gamesPlayed === 0) {
            try {
                const raw = localStorage.getItem('nw_wallet_v2');
                if (raw) {
                    const w = JSON.parse(raw);
                    if (w.stats) {
                        stats = { ...stats, ...w.stats };
                    }
                    if (Array.isArray(w.collection)) {
                        collectionCount = w.collection.length;
                    } else if (w.collection && typeof w.collection === 'object') {
                        collectionCount = Object.keys(w.collection).length;
                    }
                }
            } catch (e) {}
        }

        let tier = 0;
        if (collectionCount >= 80 || stats.pullsMade >= 100) tier = 5;
        else if (collectionCount >= 50 || stats.gamesPlayed >= 50) tier = 4;
        else if (collectionCount >= 20 || stats.gamesPlayed >= 20) tier = 3;
        else if (stats.pullsMade >= 10 || stats.gamesPlayed >= 5) tier = 2;
        else if (stats.pullsMade >= 1) tier = 1;

        this._playerTier = tier;
        return tier;
    },

    // Recompute tier (call after wallet changes)
    refreshTier() {
        this._playerTier = null;
        const oldTier = parseInt(localStorage.getItem('nw_player_tier') || '0');
        const newTier = this.getPlayerTier();
        localStorage.setItem('nw_player_tier', String(newTier));
        if (newTier > oldTier && oldTier > 0) {
            this._showUnlockToast(newTier);
        }
        return newTier;
    },

    // Check if a section should be visible
    isSectionVisible(sectionKey) {
        const tier = this.getPlayerTier();
        const required = this.sectionUnlockTier[sectionKey] ?? 0;
        return tier >= required;
    },

    // Check if a page should be visible
    isPageVisible(pageId, sectionKey) {
        if (!this.isSectionVisible(sectionKey)) return false;
        const tier = this.getPlayerTier();
        const required = this.pageUnlockTier[pageId] ?? 0;
        return tier >= required;
    },

    // Get visible sections/pages for current tier
    getVisibleSections() {
        const tier = this.getPlayerTier();
        const result = {};
        for (const [key, section] of Object.entries(this.sections)) {
            if (!this.isSectionVisible(key)) continue;
            const visiblePages = section.pages.filter(p => {
                const pageTier = this.pageUnlockTier[p.id] ?? 0;
                return tier >= pageTier;
            });
            if (visiblePages.length > 0) {
                result[key] = { ...section, pages: visiblePages };
            }
        }
        return result;
    },

    // Toast notification when new sections unlock
    _showUnlockToast(newTier) {
        const tierNames = {
            1: { en: 'First Pull!', zh: '\u9996\u62BD\uff01', th: '\u0e14\u0e36\u0e07\u0e41\u0e23\u0e01!' },
            2: { en: 'Getting Hooked!', zh: '\u8d8a\u4f86\u8d8a\u611b\uff01', th: '\u0e15\u0e34\u0e14\u0e43\u0e08\u0e41\u0e25\u0e49\u0e27!' },
            3: { en: 'Deep Dive Unlocked', zh: '\u89e3\u9396\u6df1\u5165\u63a2\u7d22', th: '\u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e01\u0e32\u0e23\u0e14\u0e33\u0e14\u0e34\u0e48\u0e07\u0e25\u0e36\u0e01' },
            4: { en: 'Veteran Status!', zh: '\u8001\u624b\u5730\u4f4d\uff01', th: '\u0e23\u0e30\u0e14\u0e31\u0e1a\u0e17\u0e2b\u0e32\u0e23\u0e1c\u0e48\u0e32\u0e19\u0e28\u0e36\u0e01!' },
            5: { en: 'Full Access', zh: '\u5168\u90e8\u89e3\u9396', th: '\u0e40\u0e02\u0e49\u0e32\u0e16\u0e36\u0e07\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14' }
        };
        const name = tierNames[newTier];
        if (!name) return;
        const text = this.t(name);
        const toast = document.createElement('div');
        toast.className = 'nw-unlock-toast';
        toast.innerHTML = `<span class="nw-unlock-icon">${this.iconSvg('sparkles', 20)}</span><span>${text}</span><span class="nw-unlock-sub">${this.t({ en: 'New sections unlocked in menu!', zh: '\u83dc\u55ae\u4e2d\u5df2\u89e3\u9396\u65b0\u5340\u57df\uff01', th: '\u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e2a\u0e48\u0e27\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e43\u0e19\u0e40\u0e21\u0e19\u0e39!' })}</span>`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    },

    sections: {
        core: {
            name: { en: 'Core', zh: '核心', th: 'หลัก' },
            icon: 'fire',
            color: '#ff6b00',
            collapsed: false,
            pages: [
                { id: 'index', name: { en: 'Home', zh: '首頁', th: 'หน้าหลัก' }, icon: 'home', href: '/' },
                { id: 'forge', name: { en: 'Open Packs', zh: '開卡包', th: 'เปิดแพ็ค' }, icon: 'fire', href: '/forge' },
                { id: 'battle', name: { en: 'Battle Arena', zh: '戰鬥場', th: 'สนามรบ' }, icon: 'swords', href: '/battle' },
                { id: 'wallet', name: { en: 'Wallet', zh: '錢包', th: 'กระเป๋า' }, icon: 'wallet', href: '/wallet' },
                { id: 'profile-card', name: { en: 'Profile Card', zh: '個人卡片', th: 'การ์ดโปรไฟล์' }, icon: 'form', href: '/profile-card', isNew: true },
                { id: 'achievements', name: { en: 'Achievements', zh: '成就', th: 'ความสำเร็จ' }, icon: 'trophy', href: '/achievements', isNew: true },
                { id: 'shrine', name: { en: '\ud83d\udd25 Summoning Shrine', zh: '\ud83d\udd25 召喚神殿', th: '\ud83d\udd25 ศาลเรียกวิญญาณ' }, icon: 'fire', href: '/shrine', isNew: true, isHot: true }
            ]
        },
        cards: {
            name: { en: 'Collection', zh: '收藏', th: 'คอลเลกชัน' },
            icon: 'cards-stack',
            color: '#ffd700',
            collapsed: true,
            pages: [
                { id: 'cards', name: { en: 'All Cards', zh: '全部卡牌', th: 'การ์ดทั้งหมด' }, icon: 'cards-stack', href: '/cards' },
                { id: 'collection', name: { en: 'My Cards', zh: '我的卡牌', th: 'การ์ดของฉัน' }, icon: 'inventory', href: '/collection' },
                { id: 'leaderboard', name: { en: 'Leaderboard', zh: '排行榜', th: 'ลีดเดอร์บอร์ด' }, icon: 'trophy', href: '/leaderboard', isNew: true },
                { id: 'deckbuilder', name: { en: 'Deck Builder', zh: '卡組', th: 'สร้างเด็ค' }, icon: 'clipboard', href: '/deckbuilder' },
                { id: 'staking', name: { en: 'Card Staking', zh: '卡牌質押', th: 'เดิมพันการ์ด' }, icon: 'coins', href: '/staking', isNew: true },
                { id: 'fusion', name: { en: 'Card Fusion', zh: '卡牌融合', th: 'หลอมรวมการ์ด' }, icon: 'lightning', href: '/fusion', isNew: true },
                { id: 'collection-stats', name: { en: 'Collection Stats', zh: '收藏统计', th: 'สถิติคอลเลกชัน', ja: 'コレクション統計' }, icon: 'chart', href: '/collection-stats', isNew: true }
            ]
        },
        economy: {
            name: { en: 'Economy', zh: '經濟', th: 'เศรษฐกิจ' },
            icon: 'coins',
            color: '#00d26a',
            collapsed: true,
            pages: [
                { id: 'arcade', name: { en: 'Arcade', zh: '街機', th: 'อาร์เคด' }, icon: 'gaming', href: '/arcade' },
                { id: 'market', name: { en: 'Card Market', zh: '卡牌市場', th: 'ตลาดการ์ด' }, icon: 'trade', href: '/market' },
                { id: 'merch', name: { en: 'Merch Shop', zh: '周邊商店', th: 'ร้านสินค้า' }, icon: 'shopping-bag', href: '/merch' },
                { id: 'claim', name: { en: 'Merch Claim', zh: '周邊兌換', th: 'รับสินค้า' }, icon: 'form', href: '/claim', isHot: true },
                { id: 'exchange', name: { en: 'Exchange', zh: '兌換', th: 'แลกเปลี่ยน' }, icon: 'chart', href: '/exchange', isNew: true },
                { id: 'auction-house', name: { en: 'Auction House', zh: '拍賣場', th: 'ห้องประมูล' }, icon: 'crown', href: '/auction-house', isNew: true, isHot: true },
                { id: 'events', name: { en: 'Events', zh: '活動', th: 'กิจกรรม' }, icon: 'sparkles', href: '/events', isHot: true }
            ]
        },
        business: {
            name: { en: 'Business District', zh: '商業區', th: 'ย่านธุรกิจ' },
            icon: 'shopping-bag',
            color: '#4a90d9',
            collapsed: true,
            pages: [
                { id: 'business', name: { en: 'Business Hub', zh: '商業中心', th: 'ศูนย์ธุรกิจ' }, icon: 'coins', href: '/business', isHot: true },
                { id: 'supermarket', name: { en: 'Supermarket', zh: '超市', th: 'ซูเปอร์' }, icon: 'shopping-bag', href: '/supermarket' },
                { id: 'restaurant', name: { en: 'Restaurant', zh: '餐廳', th: 'ร้านอาหาร' }, icon: 'fire', href: '/restaurant' },
                { id: 'services', name: { en: 'Services', zh: '服務', th: 'บริการ' }, icon: 'scroll', href: '/services' },
                { id: 'my-business', name: { en: 'My Shop', zh: '我的店', th: 'ร้านของฉัน' }, icon: 'inventory', href: '/my-business' }
            ]
        },
        guild: {
            name: { en: 'Guild Life', zh: '公會生活', th: 'ชีวิตกิลด์' },
            icon: 'shield',
            color: '#ffd700',
            collapsed: true,
            pages: [
                { id: 'tournament', name: { en: 'Tournament', zh: '錦標賽', th: 'ทัวร์นาเมนต์' }, icon: 'trophy', href: '/tournament' },
                { id: 'pvp', name: { en: 'PVP Diary', zh: 'PVP日記', th: 'บันทึก PVP' }, icon: 'swords', href: '/pvp' },
                { id: 'regina', name: { en: 'SS Regina', zh: 'Regina號', th: 'เรือ Regina' }, icon: 'anchor', href: '/regina' },
                { id: 'fashion', name: { en: 'Fashion', zh: '時裝', th: 'แฟชั่น' }, icon: 'dress', href: '/fashion' },
                { id: 'memes', name: { en: 'Memes', zh: '迷因', th: 'มีม' }, icon: 'meme', href: '/memes' }
            ]
        },
        government: {
            name: { en: 'The Trilateral Council', zh: '三邊委員會', th: 'สภาไตรภาคี' },
            icon: 'crown',
            color: '#9d4edd',
            collapsed: true,
            desc: { en: '(We see everything)', zh: '(我們看到一切)', th: '(เราเห็นทุกอย่าง)' },
            pages: [
                { id: 'citizenship', name: { en: 'Immigration', zh: '移民局', th: 'ตรวจคนเข้าเมือง' }, icon: 'shield', href: '/citizenship' },
                { id: 'invest', name: { en: 'NWG Securities', zh: 'NWG證券', th: 'หลักทรัพย์ NWG' }, icon: 'chart', href: '/invest' },
                { id: 'buy', name: { en: 'Buy NWG', zh: '購買 NWG', th: 'ซื้อ NWG' }, icon: 'coins', href: '/buy', isHot: true },
                { id: 'markets', name: { en: 'Live Markets', zh: '實時市場', th: 'ตลาดสด' }, icon: 'chart', href: '/markets', isNew: true },
                { id: 'treasury', name: { en: 'Treasury', zh: '財政部', th: 'กระทรวงการคลัง' }, icon: 'coins', href: '/treasury' },
                { id: 'court', name: { en: 'Supreme Court', zh: '最高法院', th: 'ศาลฎีกา' }, icon: 'scroll', href: '/court' },
                { id: 'intelligence', name: { en: 'Intelligence', zh: '情報局', th: 'หน่วยข่าวกรอง' }, icon: 'eye', href: '/intelligence' }
            ]
        },
        abyss: {
            name: { en: 'The Abyss', zh: '深淵', th: 'นรกลึก' },
            icon: 'portal',
            color: '#a855f7',
            collapsed: true,
            desc: { en: '(Once you enter, you cannot leave)', zh: '(一旦進入，無法離開)', th: '(เมื่อเข้าแล้ว ออกไม่ได้)' },
            pages: [
                { id: 'lore', name: { en: 'Lore Archives', zh: '傳說檔案', th: 'คลังตำนาน' }, icon: 'scroll', href: '/lore', isHot: true },
                { id: 'reggina-origin', name: { en: 'RegginA Origin', zh: 'RegginA起源', th: 'กำเนิด RegginA' }, icon: 'fire', href: '/lore/reggina-origin.html', isNew: true },
                { id: 'sacred-log', name: { en: 'Sacred Log', zh: '聖木', th: 'ท่อนไม้ศักดิ์สิทธิ์' }, icon: 'scroll', href: '/lore/sacred-log.html', isNew: true },
                { id: 'whale-wars', name: { en: 'Whale Wars', zh: '鯨魚大戰', th: 'สงครามวาฬ' }, icon: 'coins', href: '/lore/whale-wars.html', isNew: true },
                { id: 'afk-incident', name: { en: 'AFK Incident', zh: 'AFK事件', th: 'เหตุการณ์ AFK' }, icon: 'meme', href: '/lore/afk-incident.html', isNew: true },
                { id: 'conspiracy-lore', name: { en: 'Conspiracy Board', zh: '陰謀板', th: 'บอร์ดสมคบคิด' }, icon: 'eye', href: '/lore/conspiracy-board.html', isNew: true },
                { id: 'therapy', name: { en: 'Guild Therapy', zh: '公會治療', th: 'บำบัดกิลด์' }, icon: 'crystal-ball', href: '/therapy' },
                { id: 'hr', name: { en: 'HR Department', zh: '人資部', th: 'ฝ่ายบุคคล' }, icon: 'form', href: '/hr' },
                { id: 'conspiracy', name: { en: 'Conspiracy Wall', zh: '陰謀牆', th: 'กำแพงสมคบคิด' }, icon: 'eye', href: '/conspiracy' },
                { id: 'cafeteria', name: { en: 'Cafeteria', zh: '食堂', th: 'โรงอาหาร' }, icon: 'fire', href: '/cafeteria' },
                { id: 'lost-found', name: { en: 'Lost & Found', zh: '失物招領', th: 'ของหาย' }, icon: 'inventory', href: '/lost-found' },
                { id: 'parking', name: { en: 'Parking Lot', zh: '停車場', th: 'ที่จอดรถ' }, icon: 'anchor', href: '/parking' },
                { id: 'maintenance', name: { en: 'Maintenance', zh: '維護室', th: 'ห้องซ่อม' }, icon: 'scroll', href: '/maintenance' },
                { id: 'breakroom', name: { en: 'Break Room', zh: '休息室', th: 'ห้องพัก' }, icon: 'meme', href: '/breakroom' },
                { id: 'basement', name: { en: 'The Basement', zh: '地下室', th: 'ห้องใต้ดิน' }, icon: 'skull', href: '/basement' },
                { id: 'zakum', name: { en: 'Zakum Lore', zh: '扎昆傳說', th: 'ตำนานซาคุม' }, icon: 'dragon', href: '/zakum' }
            ]
        },
        tabletop: {
            name: { en: 'Tabletop Realm', zh: '桌遊領域', th: 'อาณาจักรบอร์ดเกม' },
            icon: 'dice',
            color: '#f59e0b',
            collapsed: true,
            desc: { en: '(IRL Adventures)', zh: '(現實冒險)', th: '(ผจญภัยในชีวิตจริง)' },
            pages: [
                { id: 'tavern-tales', name: { en: 'Tavern Tales', zh: '酒館故事', th: 'เรื่องเล่าโรงเตี๊ยม' }, icon: 'theater', href: '/tavern-tales', isHot: true },
                { id: 'tabletop-hub', name: { en: 'Tabletop Hub', zh: '桌遊中心', th: 'ศูนย์กลางบอร์ดเกม' }, icon: 'dice', href: '/tabletop' },
                { id: 'dnd-rulebook', name: { en: 'D&D Rulebook', zh: 'D&D規則書', th: 'กฎ D&D' }, icon: 'book', href: '/tabletop/rulebook', isNew: true },
                { id: 'character-sheets', name: { en: 'Character Sheets', zh: '角色卡', th: 'แผ่นตัวละคร' }, icon: 'form', href: '/tabletop/character-sheets', isNew: true },
                { id: 'campaign-logs', name: { en: 'Campaign Logs', zh: '戰役日誌', th: 'บันทึกแคมเปญ' }, icon: 'scroll', href: '/tabletop/campaigns', isNew: true },
                { id: 'card-to-dnd', name: { en: 'Card→D&D Converter', zh: '卡牌→D&D轉換器', th: 'แปลงการ์ด→D&D' }, icon: 'lightning', href: '/tabletop/converter', isNew: true },
                { id: 'dm-tools', name: { en: 'DM Tools', zh: 'DM工具', th: 'เครื่องมือ DM' }, icon: 'sparkles', href: '/tabletop/dm-tools', isNew: true },
                { id: 'print-play', name: { en: 'Print & Play', zh: '列印遊玩', th: 'พิมพ์และเล่น' }, icon: 'form', href: '/tabletop/print-play', isNew: true }
            ]
        },
        buildlab: {
            name: { en: 'Build Lab', zh: '建設實驗室', th: 'ห้องแล็บสร้าง' },
            icon: 'chart',
            color: '#22c55e',
            collapsed: true,
            desc: { en: '(Innovation Factory)', zh: '(創新工廠)', th: '(โรงงานนวัตกรรม)' },
            pages: [
                { id: 'efficiency', name: { en: 'Efficiency Dashboard', zh: '效率儀表板', th: 'แดชบอร์ดประสิทธิภาพ' }, icon: 'chart', href: '/efficiency', isHot: true },
                { id: 'innovation', name: { en: 'Innovation Lab', zh: '創新實驗室', th: 'ห้องนวัตกรรม' }, icon: 'lightning', href: '/innovation', isNew: true },
                { id: 'quality-metrics', name: { en: 'Quality Metrics', zh: '質量指標', th: 'ตัวชี้วัดคุณภาพ' }, icon: 'trophy', href: '/quality', isNew: true },
                { id: 'learning-log', name: { en: 'Learning Log', zh: '學習日誌', th: 'บันทึกการเรียนรู้' }, icon: 'book', href: '/learning', isNew: true },
                { id: 'card-lab', name: { en: 'Card Lab', zh: '卡片實驗室', th: 'ห้องแล็บการ์ด' }, icon: 'sparkles', href: '/card-lab', isNew: true }
            ]
        },
        resources: {
            name: { en: 'Resources', zh: '資源', th: 'แหล่งข้อมูล' },
            icon: 'scroll',
            color: '#888',
            collapsed: true,
            pages: [
                { id: 'guide', name: { en: 'Arena Guide', zh: '競技場指南', th: 'คู่มือสนาม' }, icon: 'swords', href: '/guide' },
                { id: 'academy', name: { en: 'Academy', zh: '學院', th: 'สถาบัน' }, icon: 'scroll', href: '/academy' },
                { id: 'wyckoff', name: { en: 'Wyckoff Method', zh: '威科夫方法', th: 'วิธีไวคอฟฟ์' }, icon: 'chart', href: '/wyckoff', isNew: true },
                { id: 'vault', name: { en: 'Archive Vault', zh: '檔案庫', th: 'คลังเก็บ' }, icon: 'lock', href: '/vault' },
                { id: 'museum', name: { en: 'Museum', zh: '博物館', th: 'พิพิธภัณฑ์' }, icon: 'scroll', href: '/museum' },
                { id: 'historical-society', name: { en: 'Historical Society', zh: '歷史學會', th: 'สมาคมประวัติศาสตร์' }, icon: 'scroll', href: '/historical-society' },
                { id: 'research', name: { en: 'Research Archives', zh: '研究檔案', th: 'คลังงานวิจัย' }, icon: 'scroll', href: '/research' },
                { id: 'research-library', name: { en: 'Psychology Library', zh: '心理學圖書館', th: 'ห้องสมุดจิตวิทยา' }, icon: 'book', href: '/research-library', isNew: true },
                { id: 'fortune', name: { en: 'Fortune', zh: '占卜', th: 'ดูดวง' }, icon: 'crystal-ball', href: '/fortune' },
                { id: 'updates', name: { en: 'Patch Notes', zh: '更新日誌', th: 'บันทึกแพทช์' }, icon: 'clipboard', href: '/updates' },
                { id: 'apply', name: { en: 'Join Guild', zh: '加入公會', th: 'สมัครกิลด์' }, icon: 'form', href: '/apply' },
                { id: 'about', name: { en: 'About', zh: '關於', th: 'เกี่ยวกับ' }, icon: 'shield', href: '/about' }
            ]
        },
        sisters: {
            name: { en: 'Alliance', zh: '聯盟', th: 'พันธมิตร' },
            icon: 'anchor',
            color: '#7ab87a',
            collapsed: true,
            desc: { en: '(Partner guilds)', zh: '(合作公會)', th: '(กิลด์พาร์ทเนอร์)' },
            pages: [
                { id: 'embassy', name: { en: 'Embassy', zh: '大使館', th: 'สถานทูต' }, icon: 'globe', href: '/embassy', isNew: true },
                { id: 'matchalatte', name: { en: 'MatchaLatte', zh: '抹茶拿鐵', th: 'มัทฉะลาเต้' }, icon: 'trophy', href: '/matchalatte', external: false }
            ]
        }
    },

    // Navigation hierarchy for smart back navigation
    pageHierarchy: {
        // Core pages -> Home
        'forge': '/',
        'battle': '/',
        'wallet': '/',
        'profile-card': '/',
        'achievements': '/',
        // Collection pages -> Cards
        'cards': '/',
        'collection': '/cards',
        'leaderboard': '/cards',
        'deckbuilder': '/collection',
        'staking': '/collection',
        'fusion': '/collection',
        // Economy pages -> Home
        'arcade': '/',
        'market': '/',
        'merch': '/',
        'claim': '/merch',
        'exchange': '/wallet',
        'events': '/',
        'shrine': '/',
        // Business pages -> Business Hub
        'business': '/',
        'supermarket': '/business',
        'restaurant': '/business',
        'services': '/business',
        'my-business': '/business',
        // Guild pages -> Home
        'tournament': '/',
        'pvp': '/',
        'regina': '/',
        'fashion': '/',
        'memes': '/',
        // Abyss pages -> Lore
        'lore': '/',
        'therapy': '/lore',
        'hr': '/lore',
        'conspiracy': '/lore',
        'cafeteria': '/lore',
        'lost-found': '/lore',
        'parking': '/lore',
        'maintenance': '/lore',
        'breakroom': '/lore',
        'basement': '/lore',
        'zakum': '/lore',
        // Resources -> Home
        'guide': '/',
        'academy': '/',
        'vault': '/',
        'museum': '/',
        'research': '/',
        'research-library': '/research',
        'fortune': '/',
        'updates': '/',
        'apply': '/',
        'about': '/',
        // Tabletop -> Tabletop Hub
        'tabletop-hub': '/',
        'dnd-rulebook': '/tabletop',
        'character-sheets': '/tabletop',
        'campaign-logs': '/tabletop',
        'card-to-dnd': '/tabletop',
        'dm-tools': '/tabletop',
        'print-play': '/tabletop',
        // Tabletop -> Tabletop hub or home
        'tavern-tales': '/',
        'tabletop': '/',
        // Build Lab -> Home
        'efficiency': '/',
        'innovation': '/efficiency',
        'quality-metrics': '/efficiency',
        'learning-log': '/efficiency',
        'card-lab': '/efficiency',
        // Alliance
        'embassy': '/',
        'matchalatte': '/embassy'
    },

    // Navigation history tracking
    navHistory: [],
    maxHistorySize: 20,

    // Track page visit
    trackPageVisit(pageId) {
        const entry = { pageId, path: window.location.pathname, time: Date.now() };
        // Don't add duplicate consecutive entries
        const lastEntry = this.navHistory[this.navHistory.length - 1];
        if (lastEntry && lastEntry.path === entry.path) return;
        
        this.navHistory.push(entry);
        if (this.navHistory.length > this.maxHistorySize) {
            this.navHistory.shift();
        }
        // Store in sessionStorage for persistence during session
        try {
            sessionStorage.setItem('nw_nav_history', JSON.stringify(this.navHistory));
        } catch (e) {}
    },

    // Load history from sessionStorage
    loadNavHistory() {
        try {
            const stored = sessionStorage.getItem('nw_nav_history');
            if (stored) {
                this.navHistory = JSON.parse(stored);
            }
        } catch (e) {
            this.navHistory = [];
        }
    },

    // Get smart back destination - ALWAYS returns a valid in-app path
    getBackDestination() {
        const currentPath = window.location.pathname;
        // Normalize path - remove trailing slashes and .html
        const normalizedPath = currentPath.replace(/\.html$/, '').replace(/\/$/, '') || '/';
        const currentPageId = this.currentPage || this.getPageIdFromPath(normalizedPath);
        
        console.log('[NW_NAV] getBackDestination - currentPath:', currentPath, 'pageId:', currentPageId);
        
        // First priority: Check our navigation history for a valid previous page
        if (this.navHistory.length > 1) {
            // Get previous entry that's different from current
            for (let i = this.navHistory.length - 2; i >= 0; i--) {
                const prevPath = this.navHistory[i].path;
                const normalizedPrev = prevPath.replace(/\.html$/, '').replace(/\/$/, '') || '/';
                // Only use if it's a different page
                if (normalizedPrev !== normalizedPath && prevPath !== '') {
                    console.log('[NW_NAV] Using history:', prevPath);
                    return { type: 'history', path: prevPath };
                }
            }
        }
        
        // Second priority: Use hierarchy-based navigation (always reliable)
        const parentPath = this.pageHierarchy[currentPageId];
        if (parentPath && parentPath !== normalizedPath) {
            console.log('[NW_NAV] Using hierarchy:', parentPath);
            return { type: 'navigate', path: parentPath };
        }
        
        // Ultimate fallback: home (always safe) - NEVER return null except at home
        if (normalizedPath !== '/' && normalizedPath !== '' && normalizedPath !== '/index') {
            console.log('[NW_NAV] Fallback to home');
            return { type: 'navigate', path: '/' };
        }
        
        console.log('[NW_NAV] Already at home');
        return null; // Already at home
    },

    // Helper to extract page ID from path
    getPageIdFromPath(path) {
        // Remove leading slash and .html extension
        const cleaned = path.replace(/^\//, '').replace(/\.html$/, '');
        // Handle subpaths like /tabletop/rulebook -> dnd-rulebook
        if (cleaned.startsWith('tabletop/')) {
            const sub = cleaned.split('/')[1];
            if (sub === 'rulebook') return 'dnd-rulebook';
            if (sub === 'character-sheets') return 'character-sheets';
            if (sub === 'campaigns') return 'campaign-logs';
            if (sub === 'converter') return 'card-to-dnd';
            if (sub === 'dm-tools') return 'dm-tools';
            if (sub === 'print-play') return 'print-play';
            return 'tabletop-hub';
        }
        if (cleaned.startsWith('lore/')) {
            return cleaned.replace('/', '-').replace('.html', '');
        }
        return cleaned || 'index';
    },

    // Execute back navigation
    goBack() {
        console.log('[NW_NAV] goBack triggered');
        const destination = this.getBackDestination();
        
        if (!destination) {
            // Already at home, do nothing or show subtle feedback
            console.log('[NW_NAV] No destination, staying at home');
            if (typeof NW_SOUNDS !== 'undefined') NW_SOUNDS.play('error');
            return;
        }
        
        if (typeof NW_SOUNDS !== 'undefined') NW_SOUNDS.play('click');
        
        // Validate destination path before navigating
        const targetPath = destination.path;
        if (!targetPath || targetPath === '' || targetPath === 'about:blank' || targetPath.startsWith('chrome://')) {
            console.warn('[NW_NAV] Invalid destination, going home:', targetPath);
            window.location.href = '/';
            return;
        }
        
        console.log('[NW_NAV] Navigating to:', targetPath);
        
        // ALWAYS navigate directly to avoid black screen issues with browser history
        // Browser history.back() can go to external sites or about:blank
        window.location.href = targetPath;
    },

    // Check if back button should be visible
    shouldShowBackButton() {
        const currentPath = window.location.pathname;
        // Hide on home page
        return currentPath !== '/' && currentPath !== '/index' && currentPath !== '/index.html';
    },

    easterEggs: {
        konamiCode: [],
        konamiSequence: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'],
        init() { document.addEventListener('keydown', (e) => this.checkKonami(e.key), { passive: true }); },
        checkKonami(key) {
            this.konamiCode.push(key);
            if (this.konamiCode.length > 10) this.konamiCode.shift();
            if (this.konamiCode.join(',') === this.konamiSequence.join(',')) this.triggerSecret();
        },
        triggerSecret() {
            const messages = ['KONAMI CODE ACTIVATED!', 'You found a secret!', 'The prophecy speaks of you...', 'Zakum whispers: "Nice try."'];
            alert(messages[Math.floor(Math.random() * messages.length)]);
            this.konamiCode = [];
        }
    },

    languages: { en: { code: 'EN' }, zh: { code: '中文' }, th: { code: 'ไทย' } },
    currentPage: null,
    currentLang: 'en',
    isOpen: false,
    collapsedSections: {},
    initialized: false,
    _raf: null,

    getStoredLang() { return localStorage.getItem('nw_lang') || localStorage.getItem('lang') || 'en'; },
    setStoredLang(lang) { ['nw_lang', 'lang', 'numbahwan_lang', 'preferred_lang'].forEach(k => localStorage.setItem(k, lang)); },
    getCollapsedState() { try { return JSON.parse(localStorage.getItem('nw_nav_collapsed') || '{}'); } catch { return {}; } },
    setCollapsedState(section, collapsed) { this.collapsedSections[section] = collapsed; localStorage.setItem('nw_nav_collapsed', JSON.stringify(this.collapsedSections)); },

    init(pageId) {
        if (this.initialized) return;
        this.currentPage = pageId;
        this.currentLang = this.getStoredLang();
        this.collapsedSections = this.getCollapsedState();
        this.loadNavHistory();
        this.trackPageVisit(pageId);

        // Progressive disclosure: compute tier before rendering nav
        this._playerTier = null; // force fresh compute
        const tier = this.getPlayerTier();
        const storedTier = parseInt(localStorage.getItem('nw_player_tier') || '0');
        if (tier > storedTier) {
            localStorage.setItem('nw_player_tier', String(tier));
            // Show unlock toast if player upgraded (not first visit)
            if (storedTier > 0) {
                setTimeout(() => this._showUnlockToast(tier), 1500);
            }
        }

        this.injectNav();
        this.bindEvents();
        this.easterEggs.init();
        this.initialized = true;

        // Listen for wallet changes to refresh tier dynamically
        if (typeof document !== 'undefined') {
            ['card-pulled', 'game-complete', 'currency-change'].forEach(evt => {
                document.addEventListener(evt, () => {
                    const oldTier = this._playerTier;
                    this.refreshTier();
                    if (this._playerTier > oldTier) {
                        // Re-render nav to show new sections
                        requestAnimationFrame(() => this.injectNav());
                    }
                });
            });
        }
    },

    t(obj) { return typeof obj === 'string' ? obj : (obj[this.currentLang] || obj.en || ''); },

    generateNavHTML() {
        // Use progressive disclosure — only show sections/pages the player has earned
        const visibleSections = this.getVisibleSections();
        const tier = this.getPlayerTier();

        const sectionsHTML = Object.entries(visibleSections).map(([key, section]) => {
            const isCollapsible = section.collapsed !== false;
            const isCollapsed = isCollapsible && (this.collapsedSections[key] ?? section.collapsed);
            const hasActivePage = section.pages.some(p => p.id === this.currentPage);
            const showCollapsed = isCollapsible && isCollapsed && !hasActivePage;
            
            const pagesHTML = section.pages.map(page => {
                const isActive = page.id === this.currentPage;
                return `<a href="${page.href}" class="nw-nav-link ${isActive ? 'active' : ''}">${this.iconSvg(page.icon, 16)}<span class="nw-nav-text">${this.t(page.name)}</span>${page.isHot ? '<span class="nw-hot-badge">HOT</span>' : ''}${page.isNew ? '<span class="nw-new-badge">NEW</span>' : ''}</a>`;
            }).join('');

            const visibleCount = section.pages.length;
            const chevron = isCollapsible ? `<span class="nw-nav-chevron ${showCollapsed ? '' : 'open'}">${this.iconSvg('arrow-right', 12)}</span>` : '';
            return `
                <div class="nw-nav-section ${showCollapsed ? 'collapsed' : ''}" data-section="${key}">
                    <div class="nw-nav-section-header ${isCollapsible ? 'collapsible' : ''}" style="--section-color: ${section.color}" data-section="${key}">
                        ${this.iconSvg(section.icon, 16)}
                        <span>${this.t(section.name)}</span>
                        ${section.desc ? `<span class="nw-nav-desc">${this.t(section.desc)}</span>` : ''}
                        ${isCollapsible ? `<span class="nw-nav-count">${visibleCount}</span>` : ''}
                        ${chevron}
                    </div>
                    <div class="nw-nav-pages ${showCollapsed ? 'collapsed' : ''}">${pagesHTML}</div>
                </div>
            `;
        }).join('');

        // Show tier progress hint at bottom of nav (below tier 5)
        const tierHintHTML = tier < 5 ? `<div class="nw-tier-hint">${this.iconSvg('sparkles', 14)} ${this.t({ en: 'Keep playing to unlock more!', zh: '\u7e7c\u7e8c\u904a\u73a9\u89e3\u9396\u66f4\u591a\uff01', th: '\u0e40\u0e25\u0e48\u0e19\u0e15\u0e48\u0e2d\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21!' })}</div>` : '';

        const langButtons = Object.entries(this.languages).map(([code, lang]) => 
            `<button class="nw-lang-btn ${code === this.currentLang ? 'active' : ''}" data-lang="${code}">${lang.code}</button>`
        ).join('');

        // Quick access buttons — only show what's relevant to tier
        const quickBtns = [
            { href: '/forge', cls: 'fire', icon: 'fire', tier: 0 },
            { href: '/battle', cls: 'battle', icon: 'swords', tier: 0 },
            { href: '/claim', cls: 'claim', icon: 'sparkles', tier: 2 },
            { href: '/tabletop', cls: 'tabletop', icon: 'dice', tier: 4 }
        ].filter(b => tier >= b.tier);
        const quickHTML = quickBtns.map(b => 
            `<a href="${b.href}" class="nw-quick-btn ${b.cls}">${this.iconSvg(b.icon, 20)}</a>`
        ).join('');

        return `
            <div id="nwNavOverlay" class="nw-nav-overlay"></div>
            <nav id="nwNavPanel" class="nw-nav-panel">
                <div class="nw-nav-header">
                    <div class="nw-nav-title">${this.iconSvg('crown', 20)} NumbahWan</div>
                    <button id="nwNavClose" class="nw-nav-close">${this.iconSvg('close', 18)}</button>
                </div>
                <div class="nw-quick-access">${quickHTML}</div>
                <div class="nw-nav-lang">${langButtons}</div>
                <div class="nw-nav-scroll">${sectionsHTML}${tierHintHTML}</div>
                <div class="nw-nav-footer"><div class="nw-nav-version">v9.0 • Progressive</div></div>
            </nav>
            <button id="nwNavToggle" class="nw-nav-toggle">${this.iconSvg('menu', 22)}</button>
            ${this.shouldShowBackButton() ? `<button id="nwNavBack" class="nw-nav-back" title="Back">${this.iconSvg('arrow-right', 22)}</button>` : ''}
            <a href="/" id="nwNavHome" class="nw-nav-home">${this.iconSvg('home', 22)}</a>
        `;
    },

    injectNav() {
        document.querySelectorAll('#nwNavContainer, #nwNavPanel, #nwNavOverlay, #nwNavToggle, #nwNavHome').forEach(el => el.remove());
        document.body.style.overflow = '';
        this.isOpen = false;
        
        const container = document.createElement('div');
        container.id = 'nwNavContainer';
        container.innerHTML = this.generateNavHTML();
        document.body.appendChild(container);
        this.injectStyles();
        this._bindCoreEvents();
    },

    injectStyles() {
        if (document.getElementById('nwNavStyles')) return;
        const style = document.createElement('style');
        style.id = 'nwNavStyles';
        style.textContent = `
/* NW Nav v8.0 - 60FPS BUTTERY SMOOTH */
/* GPU-accelerated animations only, no layout thrashing */

.nw-nav-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.9);
    z-index: 9998;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.15s ease-out, visibility 0.15s ease-out;
    will-change: opacity;
    contain: strict;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
}
.nw-nav-overlay.open { opacity: 1; visibility: visible; }

.nw-nav-panel {
    position: fixed; top: 0; right: 0;
    width: 300px; max-width: 85vw; height: 100vh; height: 100dvh;
    background: linear-gradient(180deg, #0a0808 0%, #1a1212 50%, #0d0a0a 100%);
    z-index: 9999;
    transform: translate3d(100%, 0, 0);
    transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform;
    contain: layout style paint;
    display: flex; flex-direction: column;
    border-left: 2px solid rgba(255,107,0,0.5);
    box-shadow: -5px 0 30px rgba(255,107,0,0.2);
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
}
.nw-nav-panel.open { transform: translate3d(0, 0, 0); }

.nw-nav-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px;
    border-bottom: 2px solid rgba(255,215,0,0.4);
    background: linear-gradient(135deg, rgba(255,107,0,0.15), rgba(255,215,0,0.1), rgba(0,0,0,0.5));
}
.nw-nav-title {
    font-family: 'NumbahWan', 'Orbitron', monospace, sans-serif;
    font-size: 20px; font-weight: 900;
    background: linear-gradient(135deg, #ffd700, #ff6b00);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    display: flex; align-items: center; gap: 8px;
}
.nw-nav-title svg { stroke: #ffd700; }
.nw-nav-close {
    background: rgba(255,107,0,0.1); border: 1px solid rgba(255,107,0,0.3);
    color: #ff6b00; cursor: pointer; padding: 8px; border-radius: 8px;
    transition: transform 0.15s ease-out, color 0.15s, background 0.15s;
    will-change: transform;
}
.nw-nav-close:hover { color: #ffd700; background: rgba(255,215,0,0.2); transform: rotate(90deg); }
.nw-nav-close:active { transform: rotate(90deg) scale(0.9); }

/* Quick Access - GPU accelerated hovers */
.nw-quick-access {
    display: flex; justify-content: space-around;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255,215,0,0.2);
    background: linear-gradient(135deg, rgba(255,107,0,0.1), rgba(168,85,247,0.05), rgba(0,0,0,0.3));
}
.nw-quick-btn {
    width: 54px; height: 54px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 14px;
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s;
    will-change: transform;
    text-decoration: none;
}
.nw-quick-btn:hover { transform: scale(1.12) translateY(-2px); }
.nw-quick-btn:active { transform: scale(0.95); }
.nw-quick-btn.fire { background: linear-gradient(135deg, #ff4500, #ff6b00); color: #fff; box-shadow: 0 4px 20px rgba(255,69,0,0.5); }
.nw-quick-btn.battle { background: linear-gradient(135deg, #a855f7, #9333ea); color: #fff; box-shadow: 0 4px 20px rgba(168,85,247,0.5); }
.nw-quick-btn.claim { background: linear-gradient(135deg, #ffd700, #f59e0b); color: #000; box-shadow: 0 4px 20px rgba(255,215,0,0.5); }
.nw-quick-btn.tabletop { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; box-shadow: 0 4px 20px rgba(245,158,11,0.5); }

/* Language Toggle */
.nw-nav-lang {
    display: flex; justify-content: center; gap: 8px;
    padding: 14px;
    border-bottom: 1px solid rgba(255,215,0,0.15);
    background: rgba(0,0,0,0.2);
}
.nw-lang-btn {
    background: rgba(255,107,0,0.1);
    border: 1px solid rgba(255,107,0,0.3);
    color: rgba(255,255,255,0.6);
    padding: 10px 18px; border-radius: 10px;
    font-size: 16px; font-weight: 600;
    cursor: pointer;
    transition: transform 0.1s, color 0.1s, border-color 0.1s, background 0.1s;
    will-change: transform;
}
.nw-lang-btn:hover { border-color: #ff6b00; color: #ff6b00; transform: translateY(-2px); }
.nw-lang-btn:active { transform: translateY(0) scale(0.97); }
.nw-lang-btn.active {
    background: linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,107,0,0.2));
    border-color: #ffd700; color: #ffd700;
    box-shadow: 0 0 15px rgba(255,215,0,0.3);
}

/* Scroll Area - Hardware accelerated */
.nw-nav-scroll {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 8px 0;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
}
.nw-nav-scroll::-webkit-scrollbar { width: 4px; }
.nw-nav-scroll::-webkit-scrollbar-track { background: transparent; }
.nw-nav-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #ff6b00, #ffd700); border-radius: 2px; }

/* Sections */
.nw-nav-section { margin: 4px 8px; contain: content; }
.nw-nav-section-header {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 16px;
    font-size: 16px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px;
    border-radius: 10px;
    color: var(--section-color);
    transition: background 0.1s, transform 0.1s;
    will-change: transform;
    border: 1px solid transparent;
}
.nw-nav-section-header.collapsible { cursor: pointer; }
.nw-nav-section-header.collapsible:hover { background: rgba(255,107,0,0.1); border-color: rgba(255,107,0,0.3); }
.nw-nav-section-header.collapsible:active { transform: scale(0.98); }

.nw-nav-desc { font-size: 10px; font-weight: 400; opacity: 0.5; text-transform: none; letter-spacing: 0; margin-left: 4px; }
.nw-nav-count {
    font-size: 12px;
    background: linear-gradient(135deg, rgba(255,107,0,0.3), rgba(255,215,0,0.2));
    padding: 2px 8px; border-radius: 10px;
    margin-left: auto; color: #ffd700;
}
.nw-nav-chevron {
    margin-left: auto;
    transition: transform 0.15s ease-out;
    opacity: 0.5;
    will-change: transform;
}
.nw-nav-chevron.open { transform: rotate(90deg); opacity: 1; }

/* Pages - Smooth collapse with transform */
.nw-nav-pages {
    padding: 4px 0 4px 8px;
    overflow: hidden;
    transition: max-height 0.18s ease-out, opacity 0.12s ease-out, padding 0.18s ease-out;
    opacity: 1;
    max-height: 1500px;
}
.nw-nav-pages.collapsed {
    max-height: 0;
    opacity: 0;
    padding-top: 0;
    padding-bottom: 0;
}

/* Navigation Links - GPU accelerated */
.nw-nav-link {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 16px;
    color: rgba(255,255,255,0.7);
    text-decoration: none;
    border-radius: 10px;
    font-size: 16px; font-weight: 500;
    border: 1px solid transparent;
    position: relative;
    transition: transform 0.08s ease-out, color 0.08s, background 0.08s;
    will-change: transform;
    -webkit-tap-highlight-color: transparent;
    transform: translateZ(0);
}
.nw-nav-link:hover {
    background: rgba(255,107,0,0.12);
    color: #fff;
    transform: translate3d(6px, 0, 0);
}
.nw-nav-link:active { transform: translate3d(4px, 0, 0) scale(0.98); }
.nw-nav-link.active {
    background: linear-gradient(90deg, rgba(255,215,0,0.2), rgba(255,107,0,0.1));
    color: #ffd700;
    border-left: 3px solid #ffd700;
}

.nw-nav-icon { flex-shrink: 0; opacity: 0.9; }
.nw-nav-text { flex: 1; }

/* Badges */
.nw-new-badge, .nw-hot-badge {
    font-size: 10px; padding: 4px 7px; border-radius: 5px; font-weight: 700;
    text-transform: uppercase;
}
.nw-new-badge { background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; }
.nw-hot-badge { background: linear-gradient(135deg, #ff4500, #ff6b00); color: #fff; }

/* Footer */
.nw-nav-footer {
    padding: 12px;
    border-top: 1px solid rgba(255,215,0,0.2);
    text-align: center;
}
.nw-nav-version {
    font-size: 10px;
    background: linear-gradient(135deg, #ff6b00, #ffd700);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
}

/* Toggle & Home - FAB Style */
.nw-nav-toggle, .nw-nav-home {
    position: fixed; z-index: 9997;
    width: 56px; height: 56px;
    border: none; border-radius: 50%;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1);
    will-change: transform;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
}
.nw-nav-toggle {
    bottom: 80px; right: 16px;
    background: linear-gradient(135deg, #ff6b00, #ff4500, #ffd700);
    color: #fff;
    box-shadow: 0 4px 20px rgba(255,107,0,0.5);
}
.nw-nav-home {
    bottom: 140px; right: 16px;
    background: rgba(10,10,15,0.98);
    color: #ffd700;
    border: 2px solid rgba(255,215,0,0.4);
    text-decoration: none;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
}
/* Back Button - Prominent orange with arrow */
.nw-nav-back {
    position: fixed; z-index: 9997;
    bottom: 200px; right: 16px;
    width: 56px; height: 56px;
    border: none; border-radius: 50%;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #ff6b00, #f59e0b);
    color: #fff;
    box-shadow: 0 4px 20px rgba(255,107,0,0.5);
    transition: transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s;
    will-change: transform;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
}
.nw-nav-back svg {
    transform: rotate(180deg); /* Point arrow left for 'back' */
}
.nw-nav-back:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 25px rgba(255,107,0,0.7);
}
.nw-nav-back:active {
    transform: scale(0.92);
}

/* Pulse animation for back button on new pages */
@keyframes backButtonPulse {
    0%, 100% { box-shadow: 0 4px 20px rgba(255,107,0,0.5); }
    50% { box-shadow: 0 4px 30px rgba(255,107,0,0.8), 0 0 10px rgba(255,215,0,0.5); }
}
.nw-nav-back.pulse {
    animation: backButtonPulse 2s ease-in-out 3; /* Pulse 3 times when page loads */
}

.nw-nav-toggle:hover, .nw-nav-home:hover { transform: scale(1.08); }
.nw-nav-toggle:active, .nw-nav-home:active { transform: scale(0.92); }
.nw-nav-home:hover { border-color: #ffd700; box-shadow: 0 0 20px rgba(255,215,0,0.5); }

@media (max-width: 480px) {
    .nw-nav-panel { width: 100vw; max-width: 100vw; }
    .nw-nav-toggle, .nw-nav-home, .nw-nav-back { width: 52px; height: 52px; }
    .nw-nav-toggle { bottom: 80px; right: 14px; }
    .nw-nav-home { bottom: 140px; right: 14px; }
    .nw-nav-back { bottom: 200px; right: 14px; }
    .nw-nav-link { padding: 12px 14px; font-size: 15px; }
    .nw-nav-section-header { padding: 12px 14px; font-size: 15px; }
    .nw-lang-btn { padding: 8px 14px; font-size: 14px; }
}

/* Progressive Disclosure — Tier hint */
.nw-tier-hint {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 16px; margin: 8px 12px;
    background: linear-gradient(135deg, rgba(168,85,247,0.15), rgba(255,107,0,0.1));
    border: 1px dashed rgba(168,85,247,0.4);
    border-radius: 10px;
    color: rgba(255,255,255,0.6);
    font-size: 13px;
    font-style: italic;
}
.nw-tier-hint svg { stroke: #a855f7; flex-shrink: 0; }

/* Unlock Toast */
.nw-unlock-toast {
    position: fixed;
    top: -80px; left: 50%;
    transform: translateX(-50%);
    z-index: 10001;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 16px 28px;
    background: linear-gradient(135deg, #1a0a2e, #0d1117);
    border: 2px solid rgba(255,215,0,0.6);
    border-radius: 16px;
    box-shadow: 0 8px 40px rgba(255,215,0,0.3), 0 0 20px rgba(168,85,247,0.3);
    color: #ffd700;
    font-family: 'NumbahWan', 'Orbitron', monospace, sans-serif;
    font-size: 18px; font-weight: 700;
    transition: top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    will-change: top;
    white-space: nowrap;
}
.nw-unlock-toast.show { top: 24px; }
.nw-unlock-toast .nw-unlock-icon svg { stroke: #ffd700; }
.nw-unlock-toast .nw-unlock-sub {
    font-size: 12px; font-weight: 400;
    color: rgba(255,255,255,0.6);
    font-family: inherit;
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
    .nw-nav-overlay,
    .nw-nav-panel,
    .nw-nav-close,
    .nw-quick-btn,
    .nw-lang-btn,
    .nw-nav-section-header,
    .nw-nav-chevron,
    .nw-nav-pages,
    .nw-nav-link,
    .nw-nav-toggle,
    .nw-nav-home,
    .nw-nav-back,
    .nw-unlock-toast {
        transition: none !important;
    }
}
`;
        document.head.appendChild(style);
    },

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        }, { passive: true });
    },

    _bindCoreEvents() {
        const toggle = document.getElementById('nwNavToggle');
        const close = document.getElementById('nwNavClose');
        const overlay = document.getElementById('nwNavOverlay');

        toggle?.addEventListener('click', () => this.open(), { passive: true });
        close?.addEventListener('click', () => this.close(), { passive: true });
        overlay?.addEventListener('click', () => this.close(), { passive: true });

        // Back button - smart navigation
        const back = document.getElementById('nwNavBack');
        if (back) {
            back.addEventListener('click', () => this.goBack(), { passive: true });
            // Add pulse animation on page load
            back.classList.add('pulse');
            setTimeout(() => back.classList.remove('pulse'), 6000);
        }

        // Section collapse - smooth with RAF
        document.querySelectorAll('.nw-nav-section-header.collapsible').forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const section = header.dataset.section;
                const sectionEl = header.closest('.nw-nav-section');
                const pages = sectionEl.querySelector('.nw-nav-pages');
                const chevron = header.querySelector('.nw-nav-chevron');
                
                const isCollapsed = pages.classList.contains('collapsed');
                
                // Use RAF for smooth 60fps
                requestAnimationFrame(() => {
                    pages.classList.toggle('collapsed', !isCollapsed);
                    chevron?.classList.toggle('open', isCollapsed);
                    sectionEl.classList.toggle('collapsed', !isCollapsed);
                    this.setCollapsedState(section, !isCollapsed);
                });
                
                if (typeof NW_SOUNDS !== 'undefined') NW_SOUNDS.play('click');
            }, { passive: true });
        });

        // Language buttons - iOS Safari fix: use both click and touchend
        document.querySelectorAll('.nw-lang-btn').forEach(btn => {
            const handleLangChange = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const lang = btn.dataset.lang;
                if (lang === this.currentLang) return;
                
                this.currentLang = lang;
                this.setStoredLang(lang);
                
                requestAnimationFrame(() => {
                    this.injectNav();
                    ['nw-lang-change', 'languageChanged'].forEach(evtName => {
                        document.dispatchEvent(new CustomEvent(evtName, { detail: { lang } }));
                        if (evtName === 'nw-lang-change') window.dispatchEvent(new CustomEvent(evtName, { detail: { lang } }));
                    });
                    if (typeof NW_I18N !== 'undefined' && NW_I18N.setLang) NW_I18N.setLang(lang);
                });
                
                if (typeof NW_SOUNDS !== 'undefined') NW_SOUNDS.play('click');
            };
            
            // iOS Safari needs explicit touchend handler, not passive
            btn.addEventListener('click', handleLangChange);
            btn.addEventListener('touchend', (e) => {
                e.preventDefault(); // Prevent ghost click on iOS
                handleLangChange(e);
            });
        });
    },

    open() {
        this.isOpen = true;
        requestAnimationFrame(() => {
            document.getElementById('nwNavPanel')?.classList.add('open');
            document.getElementById('nwNavOverlay')?.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
        if (typeof NW_SOUNDS !== 'undefined') NW_SOUNDS.play('click');
    },

    close() {
        this.isOpen = false;
        requestAnimationFrame(() => {
            document.getElementById('nwNavPanel')?.classList.remove('open');
            document.getElementById('nwNavOverlay')?.classList.remove('open');
            document.body.style.overflow = '';
        });
    },

    setLang(lang) {
        if (lang === this.currentLang) return;
        this.currentLang = lang;
        this.setStoredLang(lang);
        requestAnimationFrame(() => {
            this.injectNav();
            ['nw-lang-change', 'languageChanged'].forEach(evtName => {
                document.dispatchEvent(new CustomEvent(evtName, { detail: { lang } }));
            });
        });
    }
};

if (typeof window !== 'undefined') {
    window.NW_NAV = NW_NAV;
    document.addEventListener('DOMContentLoaded', () => {
        NW_NAV.init(document.body.dataset.pageId || 'index');
    });
}
