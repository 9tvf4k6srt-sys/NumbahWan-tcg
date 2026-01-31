/**
 * NumbahWan TCG - Unified Navigation System
 * A cohesive navigation that connects all TCG features
 */

const NW_NAV = {
    // Page categories for organized navigation
    sections: {
        play: {
            name: { en: 'Play', zh: '游戏', th: 'เล่น' },
            icon: '⚔️',
            pages: [
                { id: 'battle', name: { en: 'Battle', zh: '战斗', th: 'ต่อสู้' }, icon: '⚔️', href: '/battle', desc: 'Fight AI opponents' },
                { id: 'pvp', name: { en: 'Arena', zh: '竞技场', th: 'สนาม' }, icon: '🏟️', href: '/pvp', desc: 'PvP battle logs' },
                { id: 'arcade', name: { en: 'Arcade', zh: '街机', th: 'อาร์เคด' }, icon: '🕹️', href: '/arcade', desc: 'Mini games' },
                { id: 'fortune', name: { en: 'Fortune', zh: '占卜', th: 'ดวง' }, icon: '🔮', href: '/fortune', desc: 'Daily fortune' }
            ]
        },
        collect: {
            name: { en: 'Collect', zh: '收集', th: 'สะสม' },
            icon: '🎴',
            pages: [
                { id: 'forge', name: { en: 'Forge', zh: '锻造', th: 'หลอม' }, icon: '🔥', href: '/forge', desc: 'Open card packs' },
                { id: 'cards', name: { en: 'Cards', zh: '卡牌', th: 'การ์ด' }, icon: '🎴', href: '/cards', desc: 'Browse all cards' },
                { id: 'collection', name: { en: 'Collection', zh: '收藏', th: 'คอลเลกชัน' }, icon: '📚', href: '/collection', desc: 'Your cards' },
                { id: 'deckbuilder', name: { en: 'Decks', zh: '卡组', th: 'เด็ค' }, icon: '🃏', href: '/deckbuilder', desc: 'Build decks' }
            ]
        },
        guild: {
            name: { en: 'Guild', zh: '公会', th: 'กิลด์' },
            icon: '🏰',
            pages: [
                { id: 'index', name: { en: 'Hub', zh: '中心', th: 'ฮับ' }, icon: '🏠', href: '/', desc: 'Guild home' },
                { id: 'regina', name: { en: 'RegginA', zh: 'RegginA', th: 'RegginA' }, icon: '👑', href: '/regina', desc: 'Guild master' },
                { id: 'zakum', name: { en: 'Zakum Lore', zh: '扎昆传说', th: 'ตำนานซาคุม' }, icon: '🗿', href: '/zakum', desc: 'Ancient mythology' },
                { id: 'guide', name: { en: 'Guide', zh: '攻略', th: 'คู่มือ' }, icon: '📖', href: '/guide', desc: 'How to play' },
                { id: 'market', name: { en: 'Market', zh: '市场', th: 'ตลาด' }, icon: '🛒', href: '/market', desc: 'Trade & shop' }
            ]
        }
    },

    currentPage: null,
    currentLang: 'en',
    isOpen: false,

    // Initialize navigation
    init(pageId) {
        this.currentPage = pageId;
        this.currentLang = localStorage.getItem('nw_lang') || 'en';
        this.injectNav();
        this.bindEvents();
    },

    // Get localized text
    t(obj) {
        if (typeof obj === 'string') return obj;
        return obj[this.currentLang] || obj.en || '';
    },

    // Generate navigation HTML
    generateNavHTML() {
        return `
        <div class="nw-nav-overlay" id="nwNavOverlay"></div>
        <nav class="nw-nav" id="nwNav">
            <div class="nw-nav-header">
                <a href="/" class="nw-nav-logo">🔥 NumbahWan</a>
                <button class="nw-nav-close" id="nwNavClose">✕</button>
            </div>
            <div class="nw-nav-sections">
                ${Object.entries(this.sections).map(([key, section]) => `
                    <div class="nw-nav-section">
                        <div class="nw-nav-section-title">
                            <span class="nw-nav-section-icon">${section.icon}</span>
                            ${this.t(section.name)}
                        </div>
                        <div class="nw-nav-links">
                            ${section.pages.map(page => `
                                <a href="${page.href}" class="nw-nav-link ${this.currentPage === page.id ? 'active' : ''}" data-page="${page.id}">
                                    <span class="nw-nav-link-icon">${page.icon}</span>
                                    <div class="nw-nav-link-text">
                                        <span class="nw-nav-link-name">${this.t(page.name)}</span>
                                        <span class="nw-nav-link-desc">${page.desc}</span>
                                    </div>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="nw-nav-footer">
                <div class="nw-nav-lang">
                    <button class="nw-lang-btn ${this.currentLang === 'en' ? 'active' : ''}" data-lang="en">EN</button>
                    <button class="nw-lang-btn ${this.currentLang === 'zh' ? 'active' : ''}" data-lang="zh">中文</button>
                    <button class="nw-lang-btn ${this.currentLang === 'th' ? 'active' : ''}" data-lang="th">ไทย</button>
                </div>
            </div>
        </nav>
        <button class="nw-nav-toggle" id="nwNavToggle">
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
                    <span class="nw-bc-section">${section.icon} ${this.t(section.name)}</span>
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
        const nav = document.getElementById('nwNav');

        toggle?.addEventListener('click', () => this.open());
        close?.addEventListener('click', () => this.close());
        overlay?.addEventListener('click', () => this.close());

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
            });
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
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
        /* NW Nav - Unified Navigation */
        .nw-nav-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(4px);
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
            width: 280px;
            max-width: 85vw;
            background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%);
            border-right: 1px solid rgba(255,107,0,0.3);
            z-index: 9999;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .nw-nav.open {
            transform: translateX(0);
        }

        .nw-nav-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,107,0,0.1);
        }
        .nw-nav-logo {
            font-family: 'Orbitron', sans-serif;
            font-size: 18px;
            font-weight: 900;
            color: #ff6b00;
            text-decoration: none;
        }
        .nw-nav-close {
            width: 32px;
            height: 32px;
            border: none;
            background: rgba(255,255,255,0.1);
            color: #fff;
            border-radius: 8px;
            font-size: 18px;
            cursor: pointer;
        }

        .nw-nav-sections {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }

        .nw-nav-section {
            margin-bottom: 16px;
        }
        .nw-nav-section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: rgba(255,255,255,0.5);
        }
        .nw-nav-section-icon {
            font-size: 14px;
        }

        .nw-nav-links {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .nw-nav-link {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            border-radius: 10px;
            text-decoration: none;
            color: rgba(255,255,255,0.8);
            transition: all 0.2s;
        }
        .nw-nav-link:hover {
            background: rgba(255,107,0,0.15);
            color: #fff;
        }
        .nw-nav-link.active {
            background: linear-gradient(135deg, rgba(255,107,0,0.3), rgba(255,215,0,0.15));
            color: #ff6b00;
            border: 1px solid rgba(255,107,0,0.3);
        }
        .nw-nav-link-icon {
            font-size: 20px;
            width: 28px;
            text-align: center;
        }
        .nw-nav-link-text {
            display: flex;
            flex-direction: column;
        }
        .nw-nav-link-name {
            font-size: 14px;
            font-weight: 600;
        }
        .nw-nav-link-desc {
            font-size: 11px;
            color: rgba(255,255,255,0.4);
        }

        .nw-nav-footer {
            padding: 12px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .nw-nav-lang {
            display: flex;
            gap: 6px;
            justify-content: center;
        }
        .nw-lang-btn {
            padding: 6px 12px;
            border: 1px solid rgba(255,255,255,0.2);
            background: transparent;
            color: rgba(255,255,255,0.6);
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .nw-lang-btn:hover {
            border-color: #ff6b00;
            color: #fff;
        }
        .nw-lang-btn.active {
            background: #ff6b00;
            border-color: #ff6b00;
            color: #000;
            font-weight: 700;
        }

        /* Toggle Button */
        .nw-nav-toggle {
            position: fixed;
            top: 12px;
            left: 12px;
            width: 44px;
            height: 44px;
            border: 2px solid rgba(255,107,0,0.5);
            background: rgba(10,10,15,0.95);
            border-radius: 12px;
            z-index: 1000;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .nw-nav-toggle:hover {
            background: rgba(255,107,0,0.2);
            border-color: #ff6b00;
        }
        .nw-nav-toggle-icon {
            font-size: 22px;
            color: #ff6b00;
        }

        /* Breadcrumb */
        .nw-nav-breadcrumb {
            position: fixed;
            top: 14px;
            left: 64px;
            right: 80px;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: rgba(255,255,255,0.6);
            z-index: 999;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .nw-bc-section {
            color: rgba(255,255,255,0.4);
        }
        .nw-bc-sep {
            color: rgba(255,255,255,0.3);
        }
        .nw-bc-page {
            color: #ff6b00;
            font-weight: 600;
        }

        /* Responsive */
        @media (max-width: 480px) {
            .nw-nav-breadcrumb {
                display: none;
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
