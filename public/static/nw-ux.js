/**
 * NumbahWan UX Enhancement System v1.0
 * Super intuitive user experience improvements
 * 
 * Features:
 * - Quick Action Bar (FAB) - floating bottom bar
 * - First-time User Onboarding
 * - Contextual Tooltips
 * - Smart Breadcrumbs
 * - Keyboard Shortcuts
 * - Progress Indicators
 */

const NW_UX = {
    version: '1.0.0',
    
    // =========================================
    // CONFIGURATION
    // =========================================
    config: {
        storageKey: 'nw_ux_state',
        onboardingKey: 'nw_onboarding_complete',
        fabEnabled: true,
        tooltipsEnabled: true,
        shortcutsEnabled: true,
        breadcrumbsEnabled: true
    },

    // Page metadata for smart navigation
    pages: {
        'index': { title: 'Home', icon: 'home', section: 'guild', order: 1 },
        'forge': { title: 'Open Packs', icon: 'fire', section: 'cards', order: 2, action: 'Pull Cards' },
        'collection': { title: 'My Cards', icon: 'inventory', section: 'cards', order: 3 },
        'deckbuilder': { title: 'Decks', icon: 'clipboard', section: 'cards', order: 4 },
        'battle': { title: 'Battle', icon: 'swords', section: 'play', order: 5 },
        'cards': { title: 'All Cards', icon: 'cards-stack', section: 'cards', order: 6 },
        'wallet': { title: 'Wallet', icon: 'wallet', section: 'shop', order: 7 },
        'market': { title: 'Market', icon: 'trade', section: 'shop', order: 8 },
        'arcade': { title: 'Arcade', icon: 'gaming', section: 'play', order: 9 },
        'guide': { title: 'Guide', icon: 'scroll', section: 'more', order: 10 }
    },

    // Quick actions for FAB
    quickActions: [
        { id: 'pull', icon: 'fire', label: 'Pull', href: '/forge', color: '#ff6b00', pulse: true },
        { id: 'battle', icon: 'swords', label: 'Battle', href: '/battle', color: '#ff4444' },
        { id: 'cards', icon: 'cards-stack', label: 'Cards', href: '/collection', color: '#ffd700' },
        { id: 'wallet', icon: 'wallet', label: 'Wallet', href: '/wallet', color: '#22c55e' }
    ],

    // Keyboard shortcuts
    shortcuts: {
        'g h': { action: () => location.href = '/', desc: 'Go Home' },
        'g p': { action: () => location.href = '/forge', desc: 'Go Pull Cards' },
        'g b': { action: () => location.href = '/battle', desc: 'Go Battle' },
        'g c': { action: () => location.href = '/collection', desc: 'Go Collection' },
        'g w': { action: () => location.href = '/wallet', desc: 'Go Wallet' },
        '?': { action: () => NW_UX.showShortcutsHelp(), desc: 'Show Shortcuts' },
        'Escape': { action: () => NW_UX.closeAllModals(), desc: 'Close Modals' }
    },

    // =========================================
    // INITIALIZATION
    // =========================================
    init(pageId) {
        this.currentPage = pageId || this.detectPage();
        this.lang = localStorage.getItem('lang') || 'en';
        
        // Inject styles
        this.injectStyles();
        
        // Initialize components
        if (this.config.fabEnabled) this.initFAB();
        if (this.config.tooltipsEnabled) this.initTooltips();
        if (this.config.shortcutsEnabled) this.initKeyboardShortcuts();
        if (this.config.breadcrumbsEnabled) this.initBreadcrumbs();
        
        // Check for first-time user
        if (!this.isOnboardingComplete()) {
            setTimeout(() => this.showOnboarding(), 1500);
        }
        
        // Track page visit
        this.trackPageVisit(this.currentPage);
        
        console.log(`🎯 NW_UX v${this.version} initialized on page: ${this.currentPage}`);
    },

    detectPage() {
        const path = location.pathname.replace(/^\/|\.html$/g, '') || 'index';
        return path;
    },

    // =========================================
    // FLOATING ACTION BAR (FAB)
    // =========================================
    initFAB() {
        // Don't show FAB on certain pages
        const hideFabOn = ['battle', 'forge'];
        if (hideFabOn.includes(this.currentPage)) return;

        const fab = document.createElement('div');
        fab.id = 'nw-fab';
        fab.className = 'nw-fab';
        fab.innerHTML = this.generateFABHTML();
        document.body.appendChild(fab);

        // Bind events
        this.bindFABEvents();
        
        // Hide on scroll down, show on scroll up
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;
            const fabEl = document.getElementById('nw-fab');
            if (!fabEl) return;
            
            if (currentScroll > lastScroll && currentScroll > 100) {
                fabEl.classList.add('hidden');
            } else {
                fabEl.classList.remove('hidden');
            }
            lastScroll = currentScroll;
        }, { passive: true });
    },

    generateFABHTML() {
        const actions = this.quickActions.map(action => {
            const isActive = this.currentPage === action.id || 
                           (action.href === '/' + this.currentPage);
            const pulseClass = action.pulse ? 'nw-fab-pulse' : '';
            
            return `
                <a href="${action.href}" 
                   class="nw-fab-item ${isActive ? 'active' : ''} ${pulseClass}"
                   style="--fab-color: ${action.color}"
                   data-tooltip="${action.label}">
                    <svg class="nw-fab-icon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <use href="/static/icons/nw-icons.svg#${action.icon}"></use>
                    </svg>
                    <span class="nw-fab-label">${action.label}</span>
                </a>
            `;
        }).join('');

        return `
            <div class="nw-fab-container">
                ${actions}
            </div>
        `;
    },

    bindFABEvents() {
        // Touch feedback
        document.querySelectorAll('.nw-fab-item').forEach(item => {
            item.addEventListener('touchstart', () => item.classList.add('pressed'), { passive: true });
            item.addEventListener('touchend', () => item.classList.remove('pressed'), { passive: true });
        });
    },

    // =========================================
    // ONBOARDING SYSTEM
    // =========================================
    isOnboardingComplete() {
        return localStorage.getItem(this.config.onboardingKey) === 'true';
    },

    showOnboarding() {
        const steps = [
            {
                title: { en: 'Welcome to NumbahWan TCG!', zh: '歡迎來到 NumbahWan TCG！', th: 'ยินดีต้อนรับสู่ NumbahWan TCG!' },
                desc: { en: 'Your guild trading card adventure begins here.', zh: '你的公會卡牌冒險從這裡開始。', th: 'การผจญภัยการ์ดของกิลด์คุณเริ่มต้นที่นี่' },
                icon: 'cards-stack',
                action: null
            },
            {
                title: { en: '🔥 Pull Cards', zh: '🔥 抽卡', th: '🔥 สุ่มการ์ด' },
                desc: { en: 'Open packs to collect 110+ unique guild member cards!', zh: '開卡包收集 110+ 張獨特的公會成員卡！', th: 'เปิดแพ็คเพื่อสะสมการ์ดสมาชิกกิลด์ 110+ ใบ!' },
                icon: 'fire',
                action: { label: { en: 'Try Now', zh: '試試看', th: 'ลองเลย' }, href: '/forge' }
            },
            {
                title: { en: '⚔️ Battle', zh: '⚔️ 戰鬥', th: '⚔️ ต่อสู้' },
                desc: { en: 'Build decks and battle AI opponents to earn rewards!', zh: '組建卡組，與AI對戰賺取獎勵！', th: 'สร้างเด็คและต่อสู้กับ AI เพื่อรับรางวัล!' },
                icon: 'swords',
                action: { label: { en: 'Learn More', zh: '了解更多', th: 'เรียนรู้เพิ่มเติม' }, href: '/guide' }
            },
            {
                title: { en: '💰 Earn & Spend', zh: '💰 賺取和消費', th: '💰 หาและใช้จ่าย' },
                desc: { en: 'Collect coins, sacred logs, and gems. Manage your wallet!', zh: '收集金幣、神聖原木和寶石。管理你的錢包！', th: 'สะสมเหรียญ ซาเครดล็อก และเจม จัดการกระเป๋าของคุณ!' },
                icon: 'wallet',
                action: { label: { en: 'Open Wallet', zh: '打開錢包', th: 'เปิดกระเป๋า' }, href: '/wallet' }
            }
        ];

        const modal = document.createElement('div');
        modal.id = 'nw-onboarding';
        modal.className = 'nw-onboarding-overlay';
        modal.innerHTML = this.generateOnboardingHTML(steps);
        document.body.appendChild(modal);

        // Bind events
        this.currentStep = 0;
        this.onboardingSteps = steps;
        this.bindOnboardingEvents();

        // Animate in
        requestAnimationFrame(() => modal.classList.add('visible'));
    },

    generateOnboardingHTML(steps) {
        const step = steps[0];
        const t = (obj) => obj[this.lang] || obj.en;

        return `
            <div class="nw-onboarding-modal">
                <div class="nw-onboarding-progress">
                    ${steps.map((_, i) => `<div class="nw-onboarding-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}
                </div>
                
                <div class="nw-onboarding-content" id="onboardingContent">
                    <div class="nw-onboarding-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                            <use href="/static/icons/nw-icons.svg#${step.icon}"></use>
                        </svg>
                    </div>
                    <h2 class="nw-onboarding-title">${t(step.title)}</h2>
                    <p class="nw-onboarding-desc">${t(step.desc)}</p>
                </div>
                
                <div class="nw-onboarding-actions">
                    <button class="nw-onboarding-skip" id="onboardingSkip">
                        ${this.lang === 'zh' ? '跳過' : this.lang === 'th' ? 'ข้าม' : 'Skip'}
                    </button>
                    <button class="nw-onboarding-next" id="onboardingNext">
                        ${this.lang === 'zh' ? '下一步' : this.lang === 'th' ? 'ถัดไป' : 'Next'} →
                    </button>
                </div>
            </div>
        `;
    },

    bindOnboardingEvents() {
        const skipBtn = document.getElementById('onboardingSkip');
        const nextBtn = document.getElementById('onboardingNext');
        
        skipBtn?.addEventListener('click', () => this.completeOnboarding());
        nextBtn?.addEventListener('click', () => this.nextOnboardingStep());
    },

    nextOnboardingStep() {
        this.currentStep++;
        
        if (this.currentStep >= this.onboardingSteps.length) {
            this.completeOnboarding();
            return;
        }

        const step = this.onboardingSteps[this.currentStep];
        const t = (obj) => obj[this.lang] || obj.en;
        const content = document.getElementById('onboardingContent');
        const dots = document.querySelectorAll('.nw-onboarding-dot');
        const nextBtn = document.getElementById('onboardingNext');

        // Update dots
        dots.forEach((dot, i) => dot.classList.toggle('active', i === this.currentStep));

        // Animate content change
        content.style.opacity = '0';
        content.style.transform = 'translateX(20px)';
        
        setTimeout(() => {
            // Check if step has action
            let actionHTML = '';
            if (step.action) {
                actionHTML = `
                    <a href="${step.action.href}" class="nw-onboarding-action-btn">
                        ${t(step.action.label)}
                    </a>
                `;
            }

            content.innerHTML = `
                <div class="nw-onboarding-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                        <use href="/static/icons/nw-icons.svg#${step.icon}"></use>
                    </svg>
                </div>
                <h2 class="nw-onboarding-title">${t(step.title)}</h2>
                <p class="nw-onboarding-desc">${t(step.desc)}</p>
                ${actionHTML}
            `;
            
            content.style.opacity = '1';
            content.style.transform = 'translateX(0)';
        }, 200);

        // Update button text on last step
        if (this.currentStep === this.onboardingSteps.length - 1) {
            nextBtn.textContent = this.lang === 'zh' ? '開始遊戲！' : 
                                  this.lang === 'th' ? 'เริ่มเล่น!' : 'Start Playing!';
        }
    },

    completeOnboarding() {
        localStorage.setItem(this.config.onboardingKey, 'true');
        const modal = document.getElementById('nw-onboarding');
        if (modal) {
            modal.classList.remove('visible');
            setTimeout(() => modal.remove(), 300);
        }
    },

    // Reset onboarding (for testing)
    resetOnboarding() {
        localStorage.removeItem(this.config.onboardingKey);
        location.reload();
    },

    // =========================================
    // CONTEXTUAL TOOLTIPS
    // =========================================
    initTooltips() {
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.id = 'nw-tooltip';
        tooltip.className = 'nw-tooltip';
        document.body.appendChild(tooltip);

        // Bind to elements with data-tooltip
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.showTooltip(target, target.dataset.tooltip);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.hideTooltip();
            }
        });

        // Add tooltips to common elements
        this.addDefaultTooltips();
    },

    addDefaultTooltips() {
        // Add tooltips to nav items without them
        document.querySelectorAll('.nw-nav-link:not([data-tooltip])').forEach(el => {
            const text = el.querySelector('.nw-nav-text')?.textContent;
            if (text) el.dataset.tooltip = text;
        });
    },

    showTooltip(target, text) {
        const tooltip = document.getElementById('nw-tooltip');
        if (!tooltip) return;

        tooltip.textContent = text;
        tooltip.classList.add('visible');

        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        // Position above element by default
        let top = rect.top - tooltipRect.height - 8;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

        // Keep within viewport
        if (top < 8) top = rect.bottom + 8;
        if (left < 8) left = 8;
        if (left + tooltipRect.width > window.innerWidth - 8) {
            left = window.innerWidth - tooltipRect.width - 8;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    },

    hideTooltip() {
        const tooltip = document.getElementById('nw-tooltip');
        if (tooltip) tooltip.classList.remove('visible');
    },

    // =========================================
    // BREADCRUMBS / JOURNEY TRACKER
    // =========================================
    initBreadcrumbs() {
        // Only show on inner pages
        if (this.currentPage === 'index') return;

        const pageInfo = this.pages[this.currentPage];
        if (!pageInfo) return;

        const breadcrumb = document.createElement('div');
        breadcrumb.id = 'nw-breadcrumb';
        breadcrumb.className = 'nw-breadcrumb';
        breadcrumb.innerHTML = `
            <a href="/" class="nw-breadcrumb-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <use href="/static/icons/nw-icons.svg#home"></use>
                </svg>
                <span>Home</span>
            </a>
            <span class="nw-breadcrumb-sep">›</span>
            <span class="nw-breadcrumb-item current">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <use href="/static/icons/nw-icons.svg#${pageInfo.icon}"></use>
                </svg>
                <span>${pageInfo.title}</span>
            </span>
        `;

        // Insert after nav buttons or at top
        const header = document.querySelector('header, .header, [class*="header"]');
        if (header) {
            header.insertAdjacentElement('afterend', breadcrumb);
        } else {
            document.body.insertAdjacentElement('afterbegin', breadcrumb);
        }
    },

    // =========================================
    // KEYBOARD SHORTCUTS
    // =========================================
    initKeyboardShortcuts() {
        let keys = [];
        let timeout;

        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            const key = e.key;
            keys.push(key);
            
            clearTimeout(timeout);
            timeout = setTimeout(() => keys = [], 500);

            const combo = keys.join(' ');
            
            // Check for single key shortcuts first
            if (this.shortcuts[key]) {
                e.preventDefault();
                this.shortcuts[key].action();
                keys = [];
                return;
            }

            // Check for combo shortcuts
            if (this.shortcuts[combo]) {
                e.preventDefault();
                this.shortcuts[combo].action();
                keys = [];
            }
        });
    },

    showShortcutsHelp() {
        const shortcuts = Object.entries(this.shortcuts).map(([key, val]) => `
            <div class="nw-shortcut-item">
                <kbd>${key}</kbd>
                <span>${val.desc}</span>
            </div>
        `).join('');

        const modal = document.createElement('div');
        modal.id = 'nw-shortcuts-modal';
        modal.className = 'nw-modal-overlay';
        modal.innerHTML = `
            <div class="nw-modal">
                <div class="nw-modal-header">
                    <h3>⌨️ Keyboard Shortcuts</h3>
                    <button class="nw-modal-close" onclick="NW_UX.closeAllModals()">×</button>
                </div>
                <div class="nw-modal-body">
                    <div class="nw-shortcuts-grid">${shortcuts}</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('visible'));
    },

    closeAllModals() {
        document.querySelectorAll('.nw-modal-overlay, .nw-onboarding-overlay').forEach(el => {
            el.classList.remove('visible');
            setTimeout(() => el.remove(), 300);
        });
    },

    // =========================================
    // PAGE VISIT TRACKING
    // =========================================
    trackPageVisit(pageId) {
        const history = JSON.parse(localStorage.getItem('nw_page_history') || '[]');
        const visit = { page: pageId, time: Date.now() };
        
        // Keep last 20 visits
        history.push(visit);
        if (history.length > 20) history.shift();
        
        localStorage.setItem('nw_page_history', JSON.stringify(history));
    },

    getRecentPages() {
        const history = JSON.parse(localStorage.getItem('nw_page_history') || '[]');
        // Get unique pages, most recent first
        const seen = new Set();
        return history.reverse().filter(v => {
            if (seen.has(v.page)) return false;
            seen.add(v.page);
            return true;
        }).slice(0, 5);
    },

    // =========================================
    // SMART SUGGESTIONS
    // =========================================
    getSuggestedAction() {
        // Check user state and suggest next action
        const wallet = typeof NW_WALLET !== 'undefined' ? NW_WALLET.get() : null;
        const collection = JSON.parse(localStorage.getItem('nw_collection') || '[]');
        
        if (!wallet || wallet.coins < 100) {
            return { action: 'battle', reason: 'Earn coins through battles!' };
        }
        
        if (collection.length < 10) {
            return { action: 'forge', reason: 'Build your collection!' };
        }
        
        if (collection.length >= 10 && !localStorage.getItem('nw_deck_1')) {
            return { action: 'deckbuilder', reason: 'Create your first deck!' };
        }
        
        return { action: 'battle', reason: 'Keep battling to earn rewards!' };
    },

    // =========================================
    // STYLES
    // =========================================
    injectStyles() {
        if (document.getElementById('nw-ux-styles')) return;

        const style = document.createElement('style');
        style.id = 'nw-ux-styles';
        style.textContent = `
            /* ==========================================
             * NW_UX STYLES - Intuitive UX Components
             * ========================================== */
            
            /* ----- FLOATING ACTION BAR ----- */
            .nw-fab {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 400;
                padding: 8px 16px;
                padding-bottom: max(8px, env(safe-area-inset-bottom));
                background: linear-gradient(to top, rgba(10,10,15,0.98) 0%, rgba(10,10,15,0.9) 100%);
                border-top: 1px solid rgba(255,107,0,0.2);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                transition: transform 0.3s ease, opacity 0.3s ease;
            }
            .nw-fab.hidden {
                transform: translateY(100%);
                opacity: 0;
            }
            .nw-fab-container {
                display: flex;
                justify-content: space-around;
                align-items: center;
                max-width: 400px;
                margin: 0 auto;
            }
            .nw-fab-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                padding: 8px 16px;
                border-radius: 12px;
                text-decoration: none;
                color: rgba(255,255,255,0.7);
                transition: all 0.2s ease;
                position: relative;
            }
            .nw-fab-item:hover, .nw-fab-item.active {
                color: var(--fab-color, #ff6b00);
                background: rgba(255,107,0,0.1);
            }
            .nw-fab-item.active::after {
                content: '';
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 20px;
                height: 3px;
                background: var(--fab-color, #ff6b00);
                border-radius: 0 0 3px 3px;
            }
            .nw-fab-item.pressed {
                transform: scale(0.95);
            }
            .nw-fab-icon {
                width: 22px;
                height: 22px;
            }
            .nw-fab-label {
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .nw-fab-pulse::before {
                content: '';
                position: absolute;
                top: 4px;
                right: 12px;
                width: 8px;
                height: 8px;
                background: #ff6b00;
                border-radius: 50%;
                animation: fabPulse 2s infinite;
            }
            @keyframes fabPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.2); }
            }

            /* ----- ONBOARDING MODAL ----- */
            .nw-onboarding-overlay {
                position: fixed;
                inset: 0;
                z-index: 10000;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            .nw-onboarding-overlay.visible {
                opacity: 1;
                visibility: visible;
            }
            .nw-onboarding-modal {
                background: linear-gradient(145deg, #1a1a2e, #0f0f1a);
                border: 1px solid rgba(255,107,0,0.3);
                border-radius: 20px;
                padding: 32px;
                max-width: 380px;
                width: 100%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(255,107,0,0.1);
            }
            .nw-onboarding-progress {
                display: flex;
                gap: 8px;
                justify-content: center;
                margin-bottom: 24px;
            }
            .nw-onboarding-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: rgba(255,255,255,0.2);
                transition: all 0.3s ease;
            }
            .nw-onboarding-dot.active {
                background: #ff6b00;
                box-shadow: 0 0 10px rgba(255,107,0,0.5);
            }
            .nw-onboarding-content {
                transition: all 0.2s ease;
            }
            .nw-onboarding-icon {
                color: #ff6b00;
                margin-bottom: 16px;
            }
            .nw-onboarding-icon svg {
                filter: drop-shadow(0 0 20px rgba(255,107,0,0.5));
            }
            .nw-onboarding-title {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 12px;
                background: linear-gradient(135deg, #fff, #ff6b00);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .nw-onboarding-desc {
                color: rgba(255,255,255,0.7);
                line-height: 1.6;
                margin-bottom: 24px;
            }
            .nw-onboarding-action-btn {
                display: inline-block;
                padding: 10px 24px;
                background: linear-gradient(135deg, #ff6b00, #ff9500);
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 600;
                margin-bottom: 16px;
                transition: all 0.2s ease;
            }
            .nw-onboarding-action-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 20px rgba(255,107,0,0.4);
            }
            .nw-onboarding-actions {
                display: flex;
                gap: 12px;
                justify-content: center;
            }
            .nw-onboarding-skip {
                padding: 12px 24px;
                background: transparent;
                border: 1px solid rgba(255,255,255,0.2);
                color: rgba(255,255,255,0.6);
                border-radius: 10px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            .nw-onboarding-skip:hover {
                border-color: rgba(255,255,255,0.4);
                color: white;
            }
            .nw-onboarding-next {
                padding: 12px 32px;
                background: linear-gradient(135deg, #ff6b00, #ff9500);
                border: none;
                color: white;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s ease;
            }
            .nw-onboarding-next:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 20px rgba(255,107,0,0.4);
            }

            /* ----- TOOLTIPS ----- */
            .nw-tooltip {
                position: fixed;
                z-index: 10001;
                padding: 8px 12px;
                background: rgba(20,20,30,0.95);
                border: 1px solid rgba(255,107,0,0.3);
                border-radius: 8px;
                color: white;
                font-size: 12px;
                font-weight: 500;
                pointer-events: none;
                opacity: 0;
                transform: translateY(4px);
                transition: all 0.15s ease;
                white-space: nowrap;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            .nw-tooltip.visible {
                opacity: 1;
                transform: translateY(0);
            }

            /* ----- BREADCRUMBS ----- */
            .nw-breadcrumb {
                position: fixed;
                top: 56px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 300;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background: rgba(20,20,30,0.8);
                backdrop-filter: blur(8px);
                border-radius: 20px;
                border: 1px solid rgba(255,107,0,0.2);
                font-size: 12px;
            }
            .nw-breadcrumb-item {
                display: flex;
                align-items: center;
                gap: 6px;
                color: rgba(255,255,255,0.6);
                text-decoration: none;
                transition: color 0.2s ease;
            }
            .nw-breadcrumb-item:hover {
                color: #ff6b00;
            }
            .nw-breadcrumb-item.current {
                color: #ff6b00;
                font-weight: 600;
            }
            .nw-breadcrumb-sep {
                color: rgba(255,255,255,0.3);
            }

            /* ----- MODAL (Generic) ----- */
            .nw-modal-overlay {
                position: fixed;
                inset: 0;
                z-index: 10000;
                background: rgba(0,0,0,0.8);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s ease;
            }
            .nw-modal-overlay.visible {
                opacity: 1;
                visibility: visible;
            }
            .nw-modal {
                background: linear-gradient(145deg, #1a1a2e, #0f0f1a);
                border: 1px solid rgba(255,107,0,0.3);
                border-radius: 16px;
                max-width: 500px;
                width: 100%;
                overflow: hidden;
            }
            .nw-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid rgba(255,107,0,0.2);
            }
            .nw-modal-header h3 {
                margin: 0;
                font-size: 1.1rem;
            }
            .nw-modal-close {
                background: none;
                border: none;
                color: rgba(255,255,255,0.6);
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            .nw-modal-close:hover {
                color: #ff6b00;
            }
            .nw-modal-body {
                padding: 20px;
            }

            /* ----- SHORTCUTS GRID ----- */
            .nw-shortcuts-grid {
                display: grid;
                gap: 12px;
            }
            .nw-shortcut-item {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .nw-shortcut-item kbd {
                background: rgba(255,107,0,0.2);
                border: 1px solid rgba(255,107,0,0.3);
                border-radius: 6px;
                padding: 4px 10px;
                font-family: monospace;
                font-size: 12px;
                min-width: 50px;
                text-align: center;
            }
            .nw-shortcut-item span {
                color: rgba(255,255,255,0.7);
            }

            /* ----- RESPONSIVE ----- */
            @media (max-width: 480px) {
                .nw-fab-item {
                    padding: 8px 12px;
                }
                .nw-fab-label {
                    font-size: 9px;
                }
                .nw-breadcrumb {
                    font-size: 11px;
                    padding: 6px 12px;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const pageId = document.body.dataset.pageId || 
                       document.body.getAttribute('data-page-id') ||
                       NW_UX.detectPage();
        NW_UX.init(pageId);
    });
} else {
    const pageId = document.body.dataset.pageId || 
                   document.body.getAttribute('data-page-id') ||
                   NW_UX.detectPage();
    NW_UX.init(pageId);
}

// Expose globally
window.NW_UX = NW_UX;

console.log('📱 NW_UX module loaded');
