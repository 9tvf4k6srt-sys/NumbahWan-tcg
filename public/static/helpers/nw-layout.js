/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NW_LAYOUT - Shared Layout & Components System
 * ═══════════════════════════════════════════════════════════════════════════
 * Version: 1.0.0
 * 
 * Provides consistent UI components across all pages:
 * - Header/Navigation
 * - Footer
 * - Loading screens
 * - Toast container
 * - Modal container
 * - Helper auto-loading
 * 
 * USAGE:
 * ─────────────────────────────────────────────────────────────────────────────
 * // Auto-init (just include the script):
 * <script src="/static/helpers/nw-layout.js"></script>
 * 
 * // Or manual control:
 * NW_LAYOUT.init({ header: true, footer: true });
 * NW_LAYOUT.setActivePage('forge');
 */

const NW_LAYOUT = (function() {
    'use strict';

    const VERSION = '1.0.0';
    
    // Current page detection
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop().replace('.html', '') || 'index';

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    const CONFIG = {
        siteName: 'NumbahWan Guild',
        logo: '/static/icons/logo-original.png',
        logoAlt: '/static/favicon.svg',
        
        // Navigation items
        nav: [
            { id: 'index', label: 'Home', icon: '🏠', href: '/' },
            { id: 'forge', label: 'Forge', icon: '🔥', href: '/forge', highlight: true },
            { id: 'battle', label: 'Battle', icon: '⚔️', href: '/battle' },
            { id: 'deckbuilder', label: 'Decks', icon: '🃏', href: '/deckbuilder' },
            { id: 'market', label: 'Market', icon: '🏪', href: '/market' },
            { id: 'arcade', label: 'Arcade', icon: '🎮', href: '/arcade' },
            { id: 'wallet', label: 'Wallet', icon: '👛', href: '/wallet' }
        ],
        
        // Secondary nav
        secondaryNav: [
            { id: 'pvp', label: 'PvP', href: '/pvp' },
            { id: 'guide', label: 'Guide', href: '/guide' },
            { id: 'cards', label: 'Cards', href: '/cards' }
        ],
        
        // Social links
        social: [
            { name: 'Discord', icon: '💬', href: 'https://discord.gg/numbahwan' },
            { name: 'Twitter', icon: '🐦', href: 'https://twitter.com/numbahwan' }
        ]
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // STYLES
    // ═══════════════════════════════════════════════════════════════════════════

    const STYLES = `
        /* NW Layout System */
        .nw-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: linear-gradient(180deg, rgba(10,10,15,0.98) 0%, rgba(10,10,15,0.95) 100%);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255,107,0,0.2);
            z-index: 9999;
            display: flex;
            align-items: center;
            padding: 0 16px;
            gap: 16px;
        }

        .nw-header-logo {
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
            color: #fff;
            font-weight: 700;
            font-size: 16px;
        }

        .nw-header-logo img {
            width: 36px;
            height: 36px;
            border-radius: 8px;
        }

        .nw-header-logo span {
            background: linear-gradient(135deg, #ffd700, #ff6b00);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: none;
        }

        @media (min-width: 768px) {
            .nw-header-logo span { display: block; }
        }

        .nw-nav {
            display: flex;
            gap: 4px;
            flex: 1;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        .nw-nav::-webkit-scrollbar { display: none; }

        .nw-nav-item {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            border-radius: 8px;
            text-decoration: none;
            color: rgba(255,255,255,0.7);
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            transition: all 0.2s;
        }

        .nw-nav-item:hover {
            background: rgba(255,107,0,0.15);
            color: #fff;
        }

        .nw-nav-item.active {
            background: rgba(255,107,0,0.25);
            color: #ff6b00;
        }

        .nw-nav-item.highlight {
            background: linear-gradient(135deg, #ff6b00, #ff9500);
            color: #fff;
            box-shadow: 0 2px 10px rgba(255,107,0,0.3);
        }

        .nw-nav-item.highlight:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(255,107,0,0.4);
        }

        .nw-nav-icon {
            font-size: 16px;
        }

        .nw-nav-label {
            display: none;
        }

        @media (min-width: 640px) {
            .nw-nav-label { display: block; }
        }

        .nw-header-wallet {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            font-size: 13px;
            color: #ffd700;
            font-weight: 600;
        }

        .nw-header-wallet-icon {
            font-size: 14px;
        }

        /* Body padding for fixed header */
        body.nw-has-header {
            padding-top: 70px;
        }

        /* Footer */
        .nw-footer {
            background: linear-gradient(180deg, rgba(10,10,15,0.95) 0%, rgba(5,5,10,1) 100%);
            border-top: 1px solid rgba(255,107,0,0.2);
            padding: 40px 20px 20px;
            margin-top: 60px;
        }

        .nw-footer-content {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 30px;
        }

        .nw-footer-section h4 {
            color: #ff6b00;
            font-size: 14px;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .nw-footer-links {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .nw-footer-links a {
            color: rgba(255,255,255,0.6);
            text-decoration: none;
            font-size: 13px;
            display: block;
            padding: 6px 0;
            transition: color 0.2s;
        }

        .nw-footer-links a:hover {
            color: #ff6b00;
        }

        .nw-footer-bottom {
            max-width: 1200px;
            margin: 30px auto 0;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
            font-size: 12px;
            color: rgba(255,255,255,0.4);
        }

        .nw-footer-social {
            display: flex;
            gap: 15px;
        }

        .nw-footer-social a {
            color: rgba(255,255,255,0.6);
            text-decoration: none;
            transition: color 0.2s;
        }

        .nw-footer-social a:hover {
            color: #ff6b00;
        }

        /* Mobile nav toggle */
        .nw-mobile-toggle {
            display: none;
            padding: 8px;
            background: none;
            border: none;
            color: #fff;
            font-size: 20px;
            cursor: pointer;
        }

        @media (max-width: 480px) {
            .nw-nav {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                top: auto;
                background: rgba(10,10,15,0.98);
                border-top: 1px solid rgba(255,107,0,0.2);
                padding: 8px;
                justify-content: space-around;
                gap: 0;
            }
            
            .nw-nav-item {
                flex-direction: column;
                padding: 8px 6px;
                font-size: 10px;
            }
            
            .nw-nav-label {
                display: block;
            }
            
            body.nw-has-header {
                padding-bottom: 70px;
            }
        }

        /* Quick loading overlay */
        .nw-page-loading {
            position: fixed;
            inset: 0;
            background: rgba(10,10,15,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99998;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s;
        }

        .nw-page-loading.active {
            opacity: 1;
            visibility: visible;
        }

        .nw-page-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,107,0,0.2);
            border-top-color: #ff6b00;
            border-radius: 50%;
            animation: nwSpin 0.8s linear infinite;
        }

        @keyframes nwSpin {
            to { transform: rotate(360deg); }
        }
    `;

    // ═══════════════════════════════════════════════════════════════════════════
    // HEADER COMPONENT
    // ═══════════════════════════════════════════════════════════════════════════

    function createHeader() {
        const header = document.createElement('header');
        header.className = 'nw-header';
        header.id = 'nw-header';

        // Logo
        const logo = document.createElement('a');
        logo.className = 'nw-header-logo';
        logo.href = '/';
        logo.innerHTML = `
            <img src="${CONFIG.logo}" alt="NumbahWan" onerror="this.src='${CONFIG.logoAlt}'">
            <span>NumbahWan</span>
        `;

        // Navigation
        const nav = document.createElement('nav');
        nav.className = 'nw-nav';
        
        CONFIG.nav.forEach(item => {
            const link = document.createElement('a');
            link.className = 'nw-nav-item';
            link.href = item.href;
            
            if (item.id === currentPage || (item.id === 'index' && currentPage === '')) {
                link.classList.add('active');
            }
            if (item.highlight && item.id !== currentPage) {
                link.classList.add('highlight');
            }
            
            link.innerHTML = `
                <span class="nw-nav-icon">${item.icon}</span>
                <span class="nw-nav-label">${item.label}</span>
            `;
            nav.appendChild(link);
        });

        // Wallet display
        const wallet = document.createElement('div');
        wallet.className = 'nw-header-wallet';
        wallet.id = 'nw-header-wallet';
        wallet.innerHTML = `
            <span class="nw-header-wallet-icon">🪵</span>
            <span id="nw-header-logs">0</span>
        `;

        header.appendChild(logo);
        header.appendChild(nav);
        header.appendChild(wallet);

        return header;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FOOTER COMPONENT
    // ═══════════════════════════════════════════════════════════════════════════

    function createFooter() {
        const footer = document.createElement('footer');
        footer.className = 'nw-footer';
        footer.id = 'nw-footer';

        footer.innerHTML = `
            <div class="nw-footer-content">
                <div class="nw-footer-section">
                    <h4>Play</h4>
                    <ul class="nw-footer-links">
                        <li><a href="/forge">🔥 Mythic Forge</a></li>
                        <li><a href="/battle">⚔️ Battle Arena</a></li>
                        <li><a href="/deckbuilder">🃏 Deck Builder</a></li>
                        <li><a href="/arcade">🎮 Arcade Games</a></li>
                    </ul>
                </div>
                <div class="nw-footer-section">
                    <h4>Trade</h4>
                    <ul class="nw-footer-links">
                        <li><a href="/market">🏪 Marketplace</a></li>
                        <li><a href="/wallet">👛 My Wallet</a></li>
                        <li><a href="/cards">📚 Card Collection</a></li>
                    </ul>
                </div>
                <div class="nw-footer-section">
                    <h4>Community</h4>
                    <ul class="nw-footer-links">
                        <li><a href="/pvp">🏆 PvP Rankings</a></li>
                        <li><a href="/guide">📖 Game Guide</a></li>
                        <li><a href="https://discord.gg/numbahwan" target="_blank">💬 Discord</a></li>
                    </ul>
                </div>
            </div>
            <div class="nw-footer-bottom">
                <div>© 2024 NumbahWan Guild. All rights reserved.</div>
                <div class="nw-footer-social">
                    <a href="https://discord.gg/numbahwan" target="_blank">Discord</a>
                    <a href="https://twitter.com/numbahwan" target="_blank">Twitter</a>
                </div>
            </div>
        `;

        return footer;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STYLES INJECTION
    // ═══════════════════════════════════════════════════════════════════════════

    function injectStyles() {
        if (document.getElementById('nw-layout-styles')) return;

        const style = document.createElement('style');
        style.id = 'nw-layout-styles';
        style.textContent = STYLES;
        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER LOADER
    // ═══════════════════════════════════════════════════════════════════════════

    const loadedHelpers = new Set();

    async function loadHelper(name) {
        if (loadedHelpers.has(name)) return;
        
        const src = `/static/helpers/nw-${name}.js`;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                loadedHelpers.add(name);
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async function loadAllHelpers() {
        const helpers = ['core', 'ui', 'anim', 'audio', 'state', 'guild'];
        
        for (const helper of helpers) {
            try {
                await loadHelper(helper);
            } catch (e) {
                console.warn(`[NW_LAYOUT] Failed to load ${helper}:`, e);
            }
        }
        
        console.log('[NW_LAYOUT] All helpers loaded');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // WALLET SYNC
    // ═══════════════════════════════════════════════════════════════════════════

    function updateWalletDisplay() {
        const logsEl = document.getElementById('nw-header-logs');
        if (!logsEl) return;

        let logs = 0;
        
        // Try different sources
        if (typeof NW_FORGE !== 'undefined') {
            logs = NW_FORGE.getLogs();
        } else if (typeof NW_WALLET !== 'undefined') {
            logs = NW_WALLET.getLogs?.() || 0;
        } else {
            // Try localStorage
            try {
                const saved = localStorage.getItem('nw_wallet');
                if (saved) {
                    const data = JSON.parse(saved);
                    logs = data.logs || 0;
                }
            } catch (e) {}
        }

        logsEl.textContent = logs.toLocaleString();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PAGE LOADING
    // ═══════════════════════════════════════════════════════════════════════════

    let loadingEl = null;

    function showPageLoading() {
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.className = 'nw-page-loading';
            loadingEl.innerHTML = '<div class="nw-page-spinner"></div>';
            document.body.appendChild(loadingEl);
        }
        loadingEl.classList.add('active');
    }

    function hidePageLoading() {
        loadingEl?.classList.remove('active');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    function init(options = {}) {
        const {
            header = true,
            footer = true,
            autoLoadHelpers = true,
            syncWallet = true
        } = options;

        // Inject styles
        injectStyles();

        // Add header
        if (header) {
            const headerEl = createHeader();
            document.body.insertBefore(headerEl, document.body.firstChild);
            document.body.classList.add('nw-has-header');
        }

        // Add footer
        if (footer) {
            const footerEl = createFooter();
            document.body.appendChild(footerEl);
        }

        // Load helpers
        if (autoLoadHelpers) {
            loadAllHelpers();
        }

        // Sync wallet display
        if (syncWallet) {
            updateWalletDisplay();
            setInterval(updateWalletDisplay, 2000);
        }

        console.log(`[NW_LAYOUT] v${VERSION} initialized for page: ${currentPage}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NAVIGATION HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    function setActivePage(pageId) {
        document.querySelectorAll('.nw-nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.href.includes(pageId)) {
                item.classList.add('active');
            }
        });
    }

    function navigateTo(href, showLoading = true) {
        if (showLoading) showPageLoading();
        window.location.href = href;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════

    return {
        VERSION,
        CONFIG,
        
        // Initialization
        init,
        
        // Components
        createHeader,
        createFooter,
        
        // Helpers
        loadHelper,
        loadAllHelpers,
        
        // Navigation
        setActivePage,
        navigateTo,
        currentPage,
        
        // Loading
        showPageLoading,
        hidePageLoading,
        
        // Wallet
        updateWalletDisplay
    };
})();

window.NW_LAYOUT = NW_LAYOUT;

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-INIT ON INCLUDE
// ═══════════════════════════════════════════════════════════════════════════
// Add data-auto-init="false" to disable auto-initialization
// <script src="/static/helpers/nw-layout.js" data-auto-init="false"></script>

(function() {
    const script = document.currentScript;
    const autoInit = script?.dataset?.autoInit !== 'false';
    
    if (autoInit) {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => NW_LAYOUT.init());
        } else {
            NW_LAYOUT.init();
        }
    }
})();
