/**
 * NumbahWan TCG - Unified Navigation System v3.0
 * Simplified navigation - fewer pages, clearer structure
 */

const NW_NAV = {
    // Simplified navigation - only pages that exist
    sections: {
        play: {
            name: { en: 'Play', zh: '遊戲', th: 'เล่น' },
            icon: '⚔️',
            color: '#ff4444',
            pages: [
                { id: 'battle', name: { en: 'Battle', zh: '戰鬥', th: 'ต่อสู้' }, icon: '⚔️', href: '/battle' },
                { id: 'pvp', name: { en: 'Arena', zh: '競技場', th: 'สนาม' }, icon: '🏟️', href: '/pvp' },
                { id: 'arcade', name: { en: 'Arcade', zh: '街機', th: 'อาร์เคด' }, icon: '🕹️', href: '/arcade' }
            ]
        },
        collect: {
            name: { en: 'Cards', zh: '卡牌', th: 'การ์ด' },
            icon: '🎴',
            color: '#ff6b00',
            pages: [
                { id: 'forge', name: { en: 'Open Packs', zh: '開卡包', th: 'เปิดแพ็ค' }, icon: '🔥', href: '/forge' },
                { id: 'cards', name: { en: 'All Cards', zh: '全部卡牌', th: 'การ์ดทั้งหมด' }, icon: '🎴', href: '/cards' },
                { id: 'collection', name: { en: 'My Cards', zh: '我的卡牌', th: 'การ์ดของฉัน' }, icon: '💼', href: '/collection' },
                { id: 'deckbuilder', name: { en: 'Decks', zh: '卡組', th: 'เด็ค' }, icon: '🃏', href: '/deckbuilder' }
            ]
        },
        shop: {
            name: { en: 'Shop', zh: '商店', th: 'ร้านค้า' },
            icon: '🛒',
            color: '#44bb44',
            pages: [
                { id: 'market', name: { en: 'Market', zh: '市場', th: 'ตลาด' }, icon: '🛒', href: '/market' },
                { id: 'merch', name: { en: 'Merch', zh: '周邊', th: 'สินค้า' }, icon: '🛍️', href: '/merch' },
                { id: 'wallet', name: { en: 'Wallet', zh: '錢包', th: 'กระเป๋า' }, icon: '💰', href: '/wallet' }
            ]
        },
        guild: {
            name: { en: 'Guild', zh: '公會', th: 'กิลด์' },
            icon: '🏰',
            color: '#ffd700',
            pages: [
                { id: 'index', name: { en: 'Home', zh: '首頁', th: 'หน้าหลัก' }, icon: '🏠', href: '/' },
                { id: 'tournament', name: { en: 'Tournament', zh: '錦標賽', th: 'ทัวร์นาเมนต์' }, icon: '🏆', href: '/tournament', isNew: true },
                { id: 'regina', name: { en: 'RegginA', zh: 'RegginA', th: 'RegginA' }, icon: '👑', href: '/regina' },
                { id: 'fashion', name: { en: 'Fashion', zh: '時裝', th: 'แฟชั่น' }, icon: '👗', href: '/fashion' },
                { id: 'memes', name: { en: 'Memes', zh: '迷因', th: 'มีม' }, icon: '😂', href: '/memes' }
            ]
        },
        more: {
            name: { en: 'More', zh: '更多', th: 'เพิ่มเติม' },
            icon: '📖',
            color: '#8888ff',
            pages: [
                { id: 'guide', name: { en: 'Guide', zh: '攻略', th: 'คู่มือ' }, icon: '📖', href: '/guide' },
                { id: 'zakum', name: { en: 'Zakum Lore', zh: '扎昆傳說', th: 'ตำนานซาคุม' }, icon: '🗿', href: '/zakum' },
                { id: 'fortune', name: { en: 'Fortune', zh: '占卜', th: 'ดวง' }, icon: '🔮', href: '/fortune' },
                { id: 'apply', name: { en: 'Join Us', zh: '加入', th: 'สมัคร' }, icon: '📝', href: '/apply' }
            ]
        }
    },

    // Languages
    languages: {
        en: { code: 'EN', flag: '🇬🇧' },
        zh: { code: '中文', flag: '🇹🇼' },
        th: { code: 'ไทย', flag: '🇹🇭' }
    },

    // State
    currentPage: null,
    currentLang: 'en',
    isOpen: false,

    getStoredLang() {
        return localStorage.getItem('lang') || localStorage.getItem('nw_lang') || 'en';
    },

    setStoredLang(lang) {
        localStorage.setItem('lang', lang);
        localStorage.setItem('nw_lang', lang);
    },

    init(pageId) {
        this.currentPage = pageId;
        this.currentLang = this.getStoredLang();
        this.injectNav();
        this.bindEvents();
    },

    t(obj) {
        if (typeof obj === 'string') return obj;
        return obj[this.currentLang] || obj.en || '';
    },

    generateNavHTML() {
        const sectionsHTML = Object.entries(this.sections).map(([key, section]) => {
            const pagesHTML = section.pages.map(page => {
                const isActive = page.id === this.currentPage;
                const newBadge = page.isNew ? '<span class="nw-new-badge">NEW</span>' : '';
                return `
                    <a href="${page.href}" class="nw-nav-link ${isActive ? 'active' : ''}">
                        <span class="nw-nav-icon">${page.icon}</span>
                        <span class="nw-nav-text">${this.t(page.name)}</span>
                        ${newBadge}
                    </a>
                `;
            }).join('');

            return `
                <div class="nw-nav-section">
                    <div class="nw-nav-section-header" style="color: ${section.color}">
                        <span>${section.icon} ${this.t(section.name)}</span>
                    </div>
                    <div class="nw-nav-pages">${pagesHTML}</div>
                </div>
            `;
        }).join('');

        const langButtons = Object.entries(this.languages).map(([code, lang]) => `
            <button class="nw-lang-btn ${code === this.currentLang ? 'active' : ''}" data-lang="${code}">
                ${lang.flag} ${lang.code}
            </button>
        `).join('');

        return `
            <div id="nwNavOverlay" class="nw-nav-overlay"></div>
            <nav id="nwNavPanel" class="nw-nav-panel">
                <div class="nw-nav-header">
                    <div class="nw-nav-title">☰ Menu</div>
                    <button id="nwNavClose" class="nw-nav-close">✕</button>
                </div>
                <div class="nw-nav-sections">${sectionsHTML}</div>
                <div class="nw-nav-lang">
                    ${langButtons}
                </div>
            </nav>
        `;
    },

    injectNav() {
        // Add styles
        if (!document.getElementById('nw-nav-styles')) {
            const style = document.createElement('style');
            style.id = 'nw-nav-styles';
            style.textContent = `
                /* Nav button container - horizontal row at top-RIGHT to avoid blocking headers */
                .nw-nav-buttons {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    z-index: 9998;
                    display: flex;
                    gap: 6px;
                    align-items: center;
                }
                /* Back button - compact */
                .nw-back-btn {
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 8px;
                    background: rgba(20, 20, 30, 0.85);
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.4);
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(255,107,0,0.3);
                }
                .nw-back-btn:hover {
                    transform: scale(1.08);
                    background: rgba(255,107,0,0.3);
                    border-color: #ff6b00;
                }
                .nw-back-btn.hidden {
                    display: none;
                }
                /* Menu toggle - compact, next to back */
                .nw-nav-toggle {
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #ff6b00, #ff9500);
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    box-shadow: 0 2px 10px rgba(255,107,0,0.4);
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .nw-nav-toggle:hover {
                    transform: scale(1.08);
                    box-shadow: 0 4px 15px rgba(255,107,0,0.5);
                }
                .nw-nav-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.6);
                    z-index: 9998;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }
                .nw-nav-overlay.open {
                    opacity: 1;
                    visibility: visible;
                }
                .nw-nav-panel {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 280px;
                    max-width: 85vw;
                    height: 100vh;
                    background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%);
                    z-index: 9999;
                    transform: translateX(-100%);
                    transition: transform 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    border-right: 1px solid rgba(255,107,0,0.3);
                }
                .nw-nav-panel.open {
                    transform: translateX(0);
                }
                .nw-nav-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    border-bottom: 1px solid rgba(255,107,0,0.2);
                    background: rgba(255,107,0,0.1);
                }
                .nw-nav-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #ff6b00;
                }
                .nw-nav-close {
                    width: 32px;
                    height: 32px;
                    border: none;
                    border-radius: 8px;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .nw-nav-close:hover {
                    background: rgba(255,107,0,0.3);
                }
                .nw-nav-sections {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }
                .nw-nav-section {
                    margin-bottom: 8px;
                }
                .nw-nav-section-header {
                    font-size: 12px;
                    font-weight: bold;
                    text-transform: uppercase;
                    padding: 8px 12px;
                    letter-spacing: 1px;
                }
                .nw-nav-pages {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .nw-nav-link {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    color: #ccc;
                    text-decoration: none;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                    font-size: 14px;
                }
                .nw-nav-link:hover {
                    background: rgba(255,107,0,0.15);
                    color: white;
                }
                .nw-nav-link.active {
                    background: rgba(255,107,0,0.25);
                    color: #ff6b00;
                    font-weight: bold;
                }
                .nw-nav-icon {
                    font-size: 16px;
                    width: 24px;
                    text-align: center;
                }
                .nw-new-badge {
                    font-size: 9px;
                    background: #ff4444;
                    color: white;
                    padding: 2px 5px;
                    border-radius: 4px;
                    margin-left: auto;
                    font-weight: bold;
                }
                .nw-nav-lang {
                    display: flex;
                    gap: 4px;
                    padding: 12px;
                    border-top: 1px solid rgba(255,107,0,0.2);
                    justify-content: center;
                }
                .nw-lang-btn {
                    flex: 1;
                    padding: 8px;
                    border: 1px solid rgba(255,107,0,0.3);
                    border-radius: 6px;
                    background: transparent;
                    color: #888;
                    font-size: 11px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .nw-lang-btn:hover {
                    background: rgba(255,107,0,0.1);
                    color: white;
                }
                .nw-lang-btn.active {
                    background: rgba(255,107,0,0.2);
                    color: #ff6b00;
                    border-color: #ff6b00;
                }
            `;
            document.head.appendChild(style);
        }

        // Add button container with back + menu buttons (horizontal row)
        if (!document.getElementById('nwNavButtons')) {
            const isHome = this.currentPage === 'index' || window.location.pathname === '/' || window.location.pathname === '/index.html';
            
            const btnContainer = document.createElement('div');
            btnContainer.id = 'nwNavButtons';
            btnContainer.className = 'nw-nav-buttons';
            
            // Back button (hidden on home)
            const backBtn = document.createElement('button');
            backBtn.id = 'nwBackBtn';
            backBtn.className = 'nw-back-btn';
            if (isHome) backBtn.classList.add('hidden');
            backBtn.innerHTML = '←';
            backBtn.setAttribute('aria-label', 'Go back');
            backBtn.addEventListener('click', () => this.goBack());
            
            // Menu toggle button
            const toggle = document.createElement('button');
            toggle.id = 'nwNavToggle';
            toggle.className = 'nw-nav-toggle';
            toggle.innerHTML = '☰';
            toggle.setAttribute('aria-label', 'Open navigation menu');
            
            btnContainer.appendChild(backBtn);
            btnContainer.appendChild(toggle);
            document.body.appendChild(btnContainer);
        }

        // Add nav container
        let container = document.getElementById('nw-nav-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'nw-nav-container';
            document.body.appendChild(container);
        }
        container.innerHTML = this.generateNavHTML();
    },

    bindEvents() {
        const toggle = document.getElementById('nwNavToggle');
        const close = document.getElementById('nwNavClose');
        const overlay = document.getElementById('nwNavOverlay');
        const panel = document.getElementById('nwNavPanel');

        if (toggle) toggle.addEventListener('click', () => this.open());
        if (close) close.addEventListener('click', () => this.close());
        if (overlay) overlay.addEventListener('click', () => this.close());

        // Language buttons
        document.querySelectorAll('.nw-lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                this.currentLang = lang;
                this.setStoredLang(lang);
                this.refresh();
                
                // Trigger global language change event
                window.dispatchEvent(new CustomEvent('nw-lang-change', { detail: { lang } }));
                
                // Try to update page content if i18n exists
                if (typeof NW_I18N !== 'undefined' && NW_I18N.setLang) {
                    NW_I18N.setLang(lang);
                }
            });
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
    },

    open() {
        this.isOpen = true;
        document.getElementById('nwNavOverlay')?.classList.add('open');
        document.getElementById('nwNavPanel')?.classList.add('open');
    },

    close() {
        this.isOpen = false;
        document.getElementById('nwNavOverlay')?.classList.remove('open');
        document.getElementById('nwNavPanel')?.classList.remove('open');
    },

    refresh() {
        const container = document.getElementById('nw-nav-container');
        if (container) {
            container.innerHTML = this.generateNavHTML();
            this.bindEvents();
        }
    },

    // Smart back navigation
    goBack() {
        // If there's browser history, use it
        if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
            window.history.back();
        } else {
            // Otherwise go to sensible parent page based on current page
            const parentMap = {
                // Play section -> Home
                'battle': '/',
                'pvp': '/',
                'arcade': '/',
                // Cards section -> Cards gallery or Home
                'forge': '/cards',
                'cards': '/',
                'collection': '/cards',
                'deckbuilder': '/cards',
                // Shop section -> Home
                'market': '/',
                'merch': '/',
                'wallet': '/',
                // Guild section -> Home
                'tournament': '/',
                'regina': '/',
                'fashion': '/',
                'memes': '/',
                // Info section -> Home
                'guide': '/',
                'zakum': '/',
                'fortune': '/',
                'apply': '/'
            };
            const dest = parentMap[this.currentPage] || '/';
            window.location.href = dest;
        }
    }
};

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.dataset.pageId || document.body.dataset.nwPage || 'index';
    NW_NAV.init(pageId);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NW_NAV;
}
