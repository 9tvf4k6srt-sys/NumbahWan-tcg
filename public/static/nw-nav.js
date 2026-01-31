/**
 * NumbahWan TCG - Unified Navigation System v2.0
 * Smart space management with collapsible sections
 * Organized by user journey: Play → Collect → Trade → Community → Info
 */

const NW_NAV = {
    // Reorganized page categories - Smart grouping for easy navigation
    sections: {
        play: {
            name: { en: 'Play', zh: '游戏', th: 'เล่น' },
            icon: '⚔️',
            color: '#ff4444',
            pages: [
                { id: 'battle', name: { en: 'Battle', zh: '战斗', th: 'ต่อสู้' }, icon: '⚔️', href: '/battle', desc: { en: 'Fight AI', zh: 'AI对战', th: 'สู้ AI' } },
                { id: 'pvp', name: { en: 'Arena', zh: '竞技场', th: 'สนาม' }, icon: '🏟️', href: '/pvp', desc: { en: 'PvP battles', zh: 'PvP对战', th: 'PvP' } },
                { id: 'arcade', name: { en: 'Arcade', zh: '街机', th: 'อาร์เคด' }, icon: '🕹️', href: '/arcade', desc: { en: 'Mini games', zh: '小游戏', th: 'เกมย่อย' } }
            ]
        },
        collect: {
            name: { en: 'Collect', zh: '收集', th: 'สะสม' },
            icon: '🎴',
            color: '#ff6b00',
            pages: [
                { id: 'forge', name: { en: 'Forge', zh: '锻造', th: 'หลอม' }, icon: '🔥', href: '/forge', desc: { en: 'Open packs', zh: '开卡包', th: 'เปิดแพ็ค' } },
                { id: 'tcg', name: { en: 'Seasons', zh: '赛季', th: 'ซีซั่น' }, icon: '🌟', href: '/tcg', desc: { en: 'S1-S10 cards', zh: 'S1-S10卡牌', th: 'S1-S10' } },
                { id: 'cards', name: { en: 'All Cards', zh: '全部卡牌', th: 'การ์ดทั้งหมด' }, icon: '🎴', href: '/cards', desc: { en: 'Card gallery', zh: '卡牌图鉴', th: 'แกลเลอรี' } },
                { id: 'collection', name: { en: 'My Cards', zh: '我的卡牌', th: 'การ์ดของฉัน' }, icon: '💼', href: '/collection', desc: { en: 'Your collection', zh: '你的收藏', th: 'คอลเลกชัน' } },
                { id: 'deckbuilder', name: { en: 'Decks', zh: '卡组', th: 'เด็ค' }, icon: '🃏', href: '/deckbuilder', desc: { en: 'Build decks', zh: '组建卡组', th: 'สร้างเด็ค' } }
            ]
        },
        trade: {
            name: { en: 'Trade', zh: '交易', th: 'ซื้อขาย' },
            icon: '🛒',
            color: '#44bb44',
            pages: [
                { id: 'market', name: { en: 'Market', zh: '市场', th: 'ตลาด' }, icon: '🛒', href: '/market', desc: { en: 'Buy & sell', zh: '买卖', th: 'ซื้อขาย' } },
                { id: 'merch', name: { en: 'Merch', zh: '周边', th: 'สินค้า' }, icon: '🛍️', href: '/merch', desc: { en: 'Official store', zh: '官方商店', th: 'ร้านค้า' } },
                { id: 'wallet', name: { en: 'Wallet', zh: '钱包', th: 'กระเป๋า' }, icon: '💰', href: '/wallet', desc: { en: 'Your balance', zh: '余额', th: 'ยอดเงิน' } }
            ]
        },
        community: {
            name: { en: 'Community', zh: '社区', th: 'ชุมชน' },
            icon: '🏆',
            color: '#ffd700',
            pages: [
                { id: 'tournament', name: { en: 'Tournament', zh: '锦标赛', th: 'ทัวร์นาเมนต์' }, icon: '🏆', href: '/tournament', desc: { en: 'Events & hype', zh: '赛事活动', th: 'กิจกรรม' }, isNew: true },
                { id: 'index', name: { en: 'Guild Hub', zh: '公会中心', th: 'กิลด์ฮับ' }, icon: '🏠', href: '/', desc: { en: 'Home base', zh: '主页', th: 'หน้าหลัก' } },
                { id: 'regina', name: { en: 'RegginA', zh: 'RegginA', th: 'RegginA' }, icon: '👑', href: '/regina', desc: { en: 'Guild master', zh: '会长', th: 'หัวหน้ากิลด์' } },
                { id: 'memes', name: { en: 'Memes', zh: '表情包', th: 'มีม' }, icon: '😂', href: '/memes', desc: { en: 'Community fun', zh: '社区欢乐', th: 'ความสนุก' } },
                { id: 'fashion', name: { en: 'Fashion', zh: '时装', th: 'แฟชั่น' }, icon: '👗', href: '/fashion', desc: { en: 'Style gallery', zh: '时装展', th: 'แกลเลอรี' } }
            ]
        },
        info: {
            name: { en: 'Info', zh: '信息', th: 'ข้อมูล' },
            icon: '📖',
            color: '#8888ff',
            pages: [
                { id: 'guide', name: { en: 'Guide', zh: '攻略', th: 'คู่มือ' }, icon: '📖', href: '/guide', desc: { en: 'How to play', zh: '新手攻略', th: 'วิธีเล่น' } },
                { id: 'zakum', name: { en: 'Zakum Lore', zh: '扎昆传说', th: 'ตำนานซาคุม' }, icon: '🗿', href: '/zakum', desc: { en: 'Mythology', zh: '神话故事', th: 'ตำนาน' } },
                { id: 'fortune', name: { en: 'Fortune', zh: '占卜', th: 'ดวง' }, icon: '🔮', href: '/fortune', desc: { en: 'Daily luck', zh: '每日运势', th: 'ดวงวันนี้' } },
                { id: 'apply', name: { en: 'Join Us', zh: '加入', th: 'สมัคร' }, icon: '📝', href: '/apply', desc: { en: 'Applications', zh: '申请入会', th: 'สมัครสมาชิก' } }
            ]
        }
    },

    currentPage: null,
    currentLang: 'en',
    isOpen: false,
    collapsedSections: {},

    // Initialize navigation
    init(pageId) {
        this.currentPage = pageId;
        this.currentLang = localStorage.getItem('nw_lang') || 'en';
        this.collapsedSections = JSON.parse(localStorage.getItem('nw_nav_collapsed') || '{}');
        this.injectNav();
        this.bindEvents();
    },

    // Get localized text
    t(obj) {
        if (typeof obj === 'string') return obj;
        return obj[this.currentLang] || obj.en || '';
    },

    // Toggle section collapse
    toggleSection(sectionKey) {
        this.collapsedSections[sectionKey] = !this.collapsedSections[sectionKey];
        localStorage.setItem('nw_nav_collapsed', JSON.stringify(this.collapsedSections));
        this.refresh();
    },

    // Generate navigation HTML
    generateNavHTML() {
        const sectionEntries = Object.entries(this.sections);
        
        return `
        <div class="nw-nav-overlay" id="nwNavOverlay"></div>
        <nav class="nw-nav" id="nwNav">
            <div class="nw-nav-header">
                <a href="/" class="nw-nav-logo">
                    <span class="nw-logo-icon">🔥</span>
                    <span class="nw-logo-text">NumbahWan</span>
                </a>
                <button class="nw-nav-close" id="nwNavClose" aria-label="Close menu">✕</button>
            </div>
            
            <div class="nw-nav-sections">
                ${sectionEntries.map(([key, section]) => {
                    const isCollapsed = this.collapsedSections[key];
                    const hasActivePage = section.pages.some(p => p.id === this.currentPage);
                    const pageCount = section.pages.length;
                    
                    return `
                    <div class="nw-nav-section ${isCollapsed ? 'collapsed' : ''} ${hasActivePage ? 'has-active' : ''}" data-section="${key}">
                        <button class="nw-nav-section-header" data-toggle-section="${key}" style="--section-color: ${section.color}">
                            <div class="nw-nav-section-info">
                                <span class="nw-nav-section-icon">${section.icon}</span>
                                <span class="nw-nav-section-name">${this.t(section.name)}</span>
                                <span class="nw-nav-section-count">${pageCount}</span>
                            </div>
                            <span class="nw-nav-section-arrow">${isCollapsed ? '▶' : '▼'}</span>
                        </button>
                        <div class="nw-nav-links" style="${isCollapsed ? 'display:none' : ''}">
                            ${section.pages.map(page => `
                                <a href="${page.href}" class="nw-nav-link ${this.currentPage === page.id ? 'active' : ''}" data-page="${page.id}">
                                    <span class="nw-nav-link-icon">${page.icon}</span>
                                    <div class="nw-nav-link-text">
                                        <span class="nw-nav-link-name">
                                            ${this.t(page.name)}
                                            ${page.isNew ? '<span class="nw-new-badge">NEW</span>' : ''}
                                        </span>
                                        <span class="nw-nav-link-desc">${this.t(page.desc)}</span>
                                    </div>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `}).join('')}
            </div>
            
            <div class="nw-nav-footer">
                <div class="nw-nav-lang">
                    <button class="nw-lang-btn ${this.currentLang === 'en' ? 'active' : ''}" data-lang="en">EN</button>
                    <button class="nw-lang-btn ${this.currentLang === 'zh' ? 'active' : ''}" data-lang="zh">中文</button>
                    <button class="nw-lang-btn ${this.currentLang === 'th' ? 'active' : ''}" data-lang="th">ไทย</button>
                </div>
                <div class="nw-nav-version">v2.0</div>
            </div>
        </nav>
        
        <button class="nw-nav-toggle" id="nwNavToggle" aria-label="Open menu">
            <span class="nw-nav-toggle-icon">☰</span>
        </button>
        
        <div class="nw-nav-breadcrumb" id="nwBreadcrumb">
            ${this.getBreadcrumb()}
        </div>
        `;
    },

    // Get breadcrumb for current page
    getBreadcrumb() {
        for (const [sectionKey, section] of Object.entries(this.sections)) {
            const page = section.pages.find(p => p.id === this.currentPage);
            if (page) {
                return `
                    <span class="nw-bc-section" style="color: ${section.color}">${section.icon} ${this.t(section.name)}</span>
                    <span class="nw-bc-sep">›</span>
                    <span class="nw-bc-page">${page.icon} ${this.t(page.name)}</span>
                `;
            }
        }
        return '<span class="nw-bc-page">🔥 NumbahWan TCG</span>';
    },

    // Inject navigation into page
    injectNav() {
        // Add CSS
        if (!document.getElementById('nw-nav-styles')) {
            const style = document.createElement('style');
            style.id = 'nw-nav-styles';
            style.textContent = this.getStyles();
            document.head.appendChild(style);
        }

        // Add HTML
        const navContainer = document.createElement('div');
        navContainer.id = 'nw-nav-container';
        navContainer.innerHTML = this.generateNavHTML();
        document.body.appendChild(navContainer);
    },

    // Bind event listeners
    bindEvents() {
        const toggle = document.getElementById('nwNavToggle');
        const close = document.getElementById('nwNavClose');
        const overlay = document.getElementById('nwNavOverlay');

        toggle?.addEventListener('click', () => this.open());
        close?.addEventListener('click', () => this.close());
        overlay?.addEventListener('click', () => this.close());

        // Section collapse toggles
        document.querySelectorAll('[data-toggle-section]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleSection(btn.dataset.toggleSection);
            });
        });

        // Language buttons
        document.querySelectorAll('.nw-lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentLang = btn.dataset.lang;
                localStorage.setItem('nw_lang', this.currentLang);
                this.refresh();
                // Trigger page-specific language update if exists
                if (typeof updateUILanguage === 'function') {
                    updateUILanguage();
                }
                if (typeof window.NW_I18N !== 'undefined') {
                    window.NW_I18N.setLang(this.currentLang);
                }
            });
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });

        // Swipe to close on mobile
        let touchStartX = 0;
        const nav = document.getElementById('nwNav');
        nav?.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });
        nav?.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            if (touchStartX - touchEndX > 50) this.close();
        });
    },

    open() {
        this.isOpen = true;
        document.getElementById('nwNav')?.classList.add('open');
        document.getElementById('nwNavOverlay')?.classList.add('show');
        document.body.style.overflow = 'hidden';
    },

    close() {
        this.isOpen = false;
        document.getElementById('nwNav')?.classList.remove('open');
        document.getElementById('nwNavOverlay')?.classList.remove('show');
        document.body.style.overflow = '';
    },

    refresh() {
        const container = document.getElementById('nw-nav-container');
        if (container) {
            container.innerHTML = this.generateNavHTML();
            this.bindEvents();
        }
    },

    // CSS Styles
    getStyles() {
        return `
        /* NW Nav v2.0 - Smart Space Management */
        .nw-nav-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(8px);
            z-index: 9998;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s;
        }
        .nw-nav-overlay.show {
            opacity: 1;
            visibility: visible;
        }

        .nw-nav {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 300px;
            max-width: 88vw;
            background: linear-gradient(180deg, #141420 0%, #0a0a12 100%);
            border-right: 1px solid rgba(255,107,0,0.2);
            box-shadow: 5px 0 30px rgba(0,0,0,0.5);
            z-index: 9999;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .nw-nav.open {
            transform: translateX(0);
        }

        /* Header */
        .nw-nav-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 16px;
            border-bottom: 1px solid rgba(255,107,0,0.2);
            background: linear-gradient(135deg, rgba(255,107,0,0.15) 0%, rgba(255,107,0,0.05) 100%);
        }
        .nw-nav-logo {
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
        }
        .nw-logo-icon {
            font-size: 24px;
            filter: drop-shadow(0 0 8px rgba(255,107,0,0.8));
        }
        .nw-logo-text {
            font-family: 'Orbitron', sans-serif;
            font-size: 16px;
            font-weight: 900;
            background: linear-gradient(135deg, #ff9d4d, #ff6b00);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .nw-nav-close {
            width: 36px;
            height: 36px;
            border: none;
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.7);
            border-radius: 10px;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .nw-nav-close:hover {
            background: rgba(255,107,0,0.2);
            color: #ff6b00;
        }

        /* Sections Container - Scrollable */
        .nw-nav-sections {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 8px;
            scrollbar-width: thin;
            scrollbar-color: rgba(255,107,0,0.3) transparent;
        }
        .nw-nav-sections::-webkit-scrollbar {
            width: 4px;
        }
        .nw-nav-sections::-webkit-scrollbar-track {
            background: transparent;
        }
        .nw-nav-sections::-webkit-scrollbar-thumb {
            background: rgba(255,107,0,0.3);
            border-radius: 2px;
        }

        /* Section */
        .nw-nav-section {
            margin-bottom: 4px;
            border-radius: 12px;
            overflow: hidden;
            background: rgba(255,255,255,0.02);
            transition: background 0.2s;
        }
        .nw-nav-section.has-active {
            background: rgba(255,107,0,0.05);
        }
        .nw-nav-section-header {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            border: none;
            background: transparent;
            cursor: pointer;
            transition: all 0.2s;
            border-left: 3px solid transparent;
        }
        .nw-nav-section-header:hover {
            background: rgba(255,255,255,0.05);
            border-left-color: var(--section-color);
        }
        .nw-nav-section.has-active .nw-nav-section-header {
            border-left-color: var(--section-color);
        }
        .nw-nav-section-info {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .nw-nav-section-icon {
            font-size: 16px;
        }
        .nw-nav-section-name {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: rgba(255,255,255,0.85);
        }
        .nw-nav-section-count {
            background: rgba(255,255,255,0.1);
            color: rgba(255,255,255,0.5);
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 10px;
        }
        .nw-nav-section-arrow {
            font-size: 10px;
            color: rgba(255,255,255,0.4);
            transition: transform 0.2s;
        }

        /* Links */
        .nw-nav-links {
            padding: 0 4px 8px 4px;
        }
        .nw-nav-link {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 10px 10px 14px;
            border-radius: 10px;
            text-decoration: none;
            color: rgba(255,255,255,0.75);
            transition: all 0.2s;
            margin: 2px 0;
        }
        .nw-nav-link:hover {
            background: rgba(255,107,0,0.12);
            color: #fff;
            transform: translateX(2px);
        }
        .nw-nav-link.active {
            background: linear-gradient(135deg, rgba(255,107,0,0.25), rgba(255,180,0,0.15));
            color: #ff6b00;
            border: 1px solid rgba(255,107,0,0.25);
            box-shadow: 0 2px 8px rgba(255,107,0,0.2);
        }
        .nw-nav-link-icon {
            font-size: 18px;
            width: 24px;
            text-align: center;
            flex-shrink: 0;
        }
        .nw-nav-link-text {
            display: flex;
            flex-direction: column;
            min-width: 0;
        }
        .nw-nav-link-name {
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .nw-nav-link-desc {
            font-size: 10px;
            color: rgba(255,255,255,0.4);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .nw-nav-link.active .nw-nav-link-desc {
            color: rgba(255,107,0,0.7);
        }

        /* NEW Badge */
        .nw-new-badge {
            background: linear-gradient(135deg, #ff4444, #ff6b00);
            color: #fff;
            font-size: 8px;
            font-weight: 900;
            padding: 2px 5px;
            border-radius: 4px;
            text-transform: uppercase;
            animation: newPulse 2s ease-in-out infinite;
            box-shadow: 0 0 8px rgba(255,68,68,0.5);
        }
        @keyframes newPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
        }

        /* Footer */
        .nw-nav-footer {
            padding: 12px 16px;
            border-top: 1px solid rgba(255,255,255,0.08);
            background: rgba(0,0,0,0.2);
        }
        .nw-nav-lang {
            display: flex;
            gap: 6px;
            justify-content: center;
        }
        .nw-lang-btn {
            flex: 1;
            padding: 8px 10px;
            border: 1px solid rgba(255,255,255,0.15);
            background: rgba(255,255,255,0.03);
            color: rgba(255,255,255,0.5);
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .nw-lang-btn:hover {
            border-color: rgba(255,107,0,0.5);
            color: #fff;
            background: rgba(255,107,0,0.1);
        }
        .nw-lang-btn.active {
            background: linear-gradient(135deg, #ff6b00, #ff9d4d);
            border-color: #ff6b00;
            color: #000;
            font-weight: 800;
            box-shadow: 0 2px 8px rgba(255,107,0,0.3);
        }
        .nw-nav-version {
            text-align: center;
            font-size: 9px;
            color: rgba(255,255,255,0.2);
            margin-top: 8px;
        }

        /* Toggle Button */
        .nw-nav-toggle {
            position: fixed;
            top: 12px;
            left: 12px;
            width: 46px;
            height: 46px;
            border: 2px solid rgba(255,107,0,0.4);
            background: rgba(10,10,18,0.95);
            border-radius: 12px;
            z-index: 1000;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .nw-nav-toggle:hover {
            background: rgba(255,107,0,0.15);
            border-color: #ff6b00;
            transform: scale(1.05);
        }
        .nw-nav-toggle:active {
            transform: scale(0.95);
        }
        .nw-nav-toggle-icon {
            font-size: 22px;
            color: #ff6b00;
            text-shadow: 0 0 10px rgba(255,107,0,0.5);
        }

        /* Breadcrumb */
        .nw-nav-breadcrumb {
            position: fixed;
            top: 16px;
            left: 68px;
            right: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: rgba(255,255,255,0.6);
            z-index: 999;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-family: 'Orbitron', sans-serif;
        }
        .nw-bc-section {
            font-weight: 500;
            opacity: 0.7;
        }
        .nw-bc-sep {
            color: rgba(255,255,255,0.25);
        }
        .nw-bc-page {
            color: #ff6b00;
            font-weight: 700;
        }

        /* Mobile Responsive */
        @media (max-width: 480px) {
            .nw-nav {
                width: 100%;
                max-width: 100%;
            }
            .nw-nav-breadcrumb {
                display: none;
            }
            .nw-nav-toggle {
                top: 10px;
                left: 10px;
                width: 42px;
                height: 42px;
            }
        }

        /* Tablet */
        @media (min-width: 481px) and (max-width: 768px) {
            .nw-nav-breadcrumb {
                right: 60px;
            }
        }
        `;
    }
};

// Auto-initialize if page ID is set in data attribute
document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.dataset.pageId || document.querySelector('[data-nw-page]')?.dataset.nwPage;
    if (pageId) {
        NW_NAV.init(pageId);
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NW_NAV;
}
