/**
 * NumbahWan TCG - Unified Navigation System v5.0
 * Collapsible sections, less clutter, more chaos
 * Uses ONLY custom NW icons - NO EMOJIS!
 */

const NW_NAV = {
    // Icon helper
    iconSvg(iconId, size = 18) {
        return `<svg class="nw-nav-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
            <use href="/static/icons/nw-icons.svg#${iconId}"></use>
        </svg>`;
    },

    // Streamlined navigation - grouped by user intent
    sections: {
        core: {
            name: { en: 'Core', zh: '核心', th: 'หลัก' },
            icon: 'fire',
            color: '#ff6b00',
            collapsed: false, // Always visible
            pages: [
                { id: 'index', name: { en: 'Home', zh: '首頁', th: 'หน้าหลัก' }, icon: 'home', href: '/' },
                { id: 'forge', name: { en: 'Open Packs', zh: '開卡包', th: 'เปิดแพ็ค' }, icon: 'fire', href: '/forge' },
                { id: 'battle', name: { en: 'Battle', zh: '戰鬥', th: 'ต่อสู้' }, icon: 'swords', href: '/battle' },
                { id: 'wallet', name: { en: 'Wallet', zh: '錢包', th: 'กระเป๋า' }, icon: 'wallet', href: '/wallet' }
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
                { id: 'deckbuilder', name: { en: 'Deck Builder', zh: '卡組', th: 'สร้างเด็ค' }, icon: 'clipboard', href: '/deckbuilder' }
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
                { id: 'exchange', name: { en: 'Exchange', zh: '兌換', th: 'แลกเปลี่ยน' }, icon: 'chart', href: '/exchange', isNew: true }
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
            name: { en: 'Government', zh: '政府機關', th: 'รัฐบาล' },
            icon: 'crown',
            color: '#9d4edd',
            collapsed: true,
            desc: { en: '(Yes, we have a government)', zh: '(是的，我們有政府)', th: '(ใช่ เรามีรัฐบาล)' },
            pages: [
                { id: 'citizenship', name: { en: 'Immigration', zh: '移民局', th: 'ตรวจคนเข้าเมือง' }, icon: 'shield', href: '/citizenship' },
                { id: 'invest', name: { en: 'NWG Securities', zh: 'NWG證券', th: 'หลักทรัพย์ NWG' }, icon: 'chart', href: '/invest', isHot: true },
                { id: 'treasury', name: { en: 'Treasury', zh: '財政部', th: 'กระทรวงการคลัง' }, icon: 'coins', href: '/treasury' },
                { id: 'court', name: { en: 'Supreme Court', zh: '最高法院', th: 'ศาลฎีกา' }, icon: 'scroll', href: '/court' },
                { id: 'intelligence', name: { en: 'Intelligence', zh: '情報局', th: 'หน่วยข่าวกรอง' }, icon: 'eye', href: '/intelligence' }
            ]
        },
        absurd: {
            name: { en: 'Absurd Wing', zh: '荒誕區', th: 'ปีกไร้สาระ' },
            icon: 'skull',
            color: '#ff66ff',
            collapsed: true,
            desc: { en: '(Enter at own risk)', zh: '(後果自負)', th: '(เข้าเสี่ยงเอง)' },
            pages: [
                { id: 'therapy', name: { en: 'Guild Therapy', zh: '公會治療', th: 'บำบัดกิลด์' }, icon: 'crystal-ball', href: '/therapy' },
                { id: 'hr', name: { en: 'HR Department', zh: '人資部', th: 'ฝ่ายบุคคล' }, icon: 'form', href: '/hr' },
                { id: 'conspiracy', name: { en: 'Conspiracy Board', zh: '陰謀論板', th: 'บอร์ดสมคบคิด' }, icon: 'eye', href: '/conspiracy' },
                { id: 'zakum', name: { en: 'Zakum Lore', zh: '扎昆傳說', th: 'ตำนานซาคุม' }, icon: 'skull', href: '/zakum' }
            ]
        },
        resources: {
            name: { en: 'Resources', zh: '資源', th: 'แหล่งข้อมูล' },
            icon: 'scroll',
            color: '#888',
            collapsed: true,
            pages: [
                { id: 'guide', name: { en: 'Guide', zh: '攻略', th: 'คู่มือ' }, icon: 'scroll', href: '/guide' },
                { id: 'academy', name: { en: 'Academy', zh: '學院', th: 'สถาบัน' }, icon: 'scroll', href: '/academy' },
                { id: 'vault', name: { en: 'Archive Vault', zh: '檔案庫', th: 'คลังเก็บ' }, icon: 'lock', href: '/vault' },
                { id: 'museum', name: { en: 'Museum', zh: '博物館', th: 'พิพิธภัณฑ์' }, icon: 'crown', href: '/museum' },
                { id: 'fortune', name: { en: 'Fortune', zh: '占卜', th: 'ดูดวง' }, icon: 'crystal-ball', href: '/fortune' },
                { id: 'apply', name: { en: 'Join Guild', zh: '加入公會', th: 'สมัครกิลด์' }, icon: 'form', href: '/apply' },
                { id: 'about', name: { en: 'About', zh: '關於', th: 'เกี่ยวกับ' }, icon: 'shield', href: '/about' }
            ]
        }
    },

    // Easter eggs - triggered by Konami code or click patterns
    easterEggs: {
        konamiCode: [],
        konamiSequence: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'],
        clickCount: 0,
        lastClickTime: 0,
        
        init() {
            document.addEventListener('keydown', (e) => this.checkKonami(e.key));
        },
        
        checkKonami(key) {
            this.konamiCode.push(key);
            if (this.konamiCode.length > 10) this.konamiCode.shift();
            if (this.konamiCode.join(',') === this.konamiSequence.join(',')) {
                this.triggerSecret('konami');
            }
        },
        
        triggerSecret(type) {
            const messages = [
                '🎮 KONAMI CODE ACTIVATED! +9999 Sacred Logs... just kidding.',
                '👀 You found a secret! Your reward: knowing this exists.',
                '🔮 The ancient prophecy speaks of one who would find this...',
                '💀 Zakum whispers: "Nice try, mortal."',
                '🎰 You won the secret lottery! Prize: nothing!',
                '🦆 A wild rubber duck appears! It does nothing.',
            ];
            const msg = messages[Math.floor(Math.random() * messages.length)];
            if (typeof NW_SOUNDS !== 'undefined') NW_SOUNDS.play('legendary');
            alert(msg);
            console.log('%c🎮 SECRET FOUND: ' + type, 'color: #ff00ff; font-size: 20px;');
        }
    },

    languages: {
        en: { code: 'EN', icon: 'globe' },
        zh: { code: '中文', icon: 'globe' },
        th: { code: 'ไทย', icon: 'globe' }
    },

    currentPage: null,
    currentLang: 'en',
    isOpen: false,
    collapsedSections: {},
    initialized: false,

    getStoredLang() {
        return localStorage.getItem('lang') || localStorage.getItem('nw_lang') || 'en';
    },

    setStoredLang(lang) {
        localStorage.setItem('lang', lang);
        localStorage.setItem('nw_lang', lang);
    },

    getCollapsedState() {
        try {
            const saved = localStorage.getItem('nw_nav_collapsed');
            return saved ? JSON.parse(saved) : {};
        } catch (e) { return {}; }
    },

    setCollapsedState(section, collapsed) {
        this.collapsedSections[section] = collapsed;
        localStorage.setItem('nw_nav_collapsed', JSON.stringify(this.collapsedSections));
    },

    init(pageId) {
        if (this.initialized) return;
        this.currentPage = pageId;
        this.currentLang = this.getStoredLang();
        this.collapsedSections = this.getCollapsedState();
        this.injectNav();
        this.bindEvents();
        this.easterEggs.init();
        this.initialized = true;
        console.log('[NW_NAV] v5.0 Ready - Collapsible sections enabled');
    },

    t(obj) {
        if (typeof obj === 'string') return obj;
        return obj[this.currentLang] || obj.en || '';
    },

    generateNavHTML() {
        const sectionsHTML = Object.entries(this.sections).map(([key, section]) => {
            const isCollapsible = section.collapsed !== false;
            const isCollapsed = isCollapsible && (this.collapsedSections[key] ?? section.collapsed);
            const hasActivePage = section.pages.some(p => p.id === this.currentPage);
            
            // Auto-expand section with active page
            const showCollapsed = isCollapsible && isCollapsed && !hasActivePage;
            
            const pagesHTML = section.pages.map(page => {
                const isActive = page.id === this.currentPage;
                const hotBadge = page.isHot ? '<span class="nw-hot-badge">HOT</span>' : '';
                const newBadge = page.isNew ? '<span class="nw-new-badge">NEW</span>' : '';
                return `
                    <a href="${page.href}" class="nw-nav-link ${isActive ? 'active' : ''}">
                        ${this.iconSvg(page.icon, 16)}
                        <span class="nw-nav-text">${this.t(page.name)}</span>
                        ${hotBadge}${newBadge}
                    </a>
                `;
            }).join('');

            const chevron = isCollapsible ? `<span class="nw-nav-chevron ${showCollapsed ? '' : 'open'}">${this.iconSvg('arrow-right', 12)}</span>` : '';
            const desc = section.desc ? `<span class="nw-nav-desc">${this.t(section.desc)}</span>` : '';
            const countBadge = isCollapsible ? `<span class="nw-nav-count">${section.pages.length}</span>` : '';

            return `
                <div class="nw-nav-section ${showCollapsed ? 'collapsed' : ''}" data-section="${key}">
                    <div class="nw-nav-section-header ${isCollapsible ? 'collapsible' : ''}" style="color: ${section.color}" data-section="${key}">
                        ${this.iconSvg(section.icon, 16)}
                        <span>${this.t(section.name)}</span>
                        ${desc}
                        ${countBadge}
                        ${chevron}
                    </div>
                    <div class="nw-nav-pages" style="${showCollapsed ? 'display:none;' : ''}">${pagesHTML}</div>
                </div>
            `;
        }).join('');

        const langButtons = Object.entries(this.languages).map(([code, lang]) => `
            <button class="nw-lang-btn ${code === this.currentLang ? 'active' : ''}" data-lang="${code}">${lang.code}</button>
        `).join('');

        // Quick access bar at top
        const quickAccess = `
            <div class="nw-quick-access">
                <a href="/forge" class="nw-quick-btn" title="Open Packs">${this.iconSvg('fire', 20)}</a>
                <a href="/battle" class="nw-quick-btn" title="Battle">${this.iconSvg('swords', 20)}</a>
                <a href="/wallet" class="nw-quick-btn" title="Wallet">${this.iconSvg('wallet', 20)}</a>
                <a href="/market" class="nw-quick-btn" title="Market">${this.iconSvg('trade', 20)}</a>
            </div>
        `;

        return `
            <div id="nwNavOverlay" class="nw-nav-overlay"></div>
            <nav id="nwNavPanel" class="nw-nav-panel">
                <div class="nw-nav-header">
                    <div class="nw-nav-title">${this.iconSvg('menu', 20)} NumbahWan</div>
                    <button id="nwNavClose" class="nw-nav-close">${this.iconSvg('close', 18)}</button>
                </div>
                ${quickAccess}
                <div class="nw-nav-lang">${langButtons}</div>
                <div class="nw-nav-scroll">
                    ${sectionsHTML}
                </div>
                <div class="nw-nav-footer">
                    <div class="nw-nav-version">v5.0 • Made with chaos</div>
                </div>
            </nav>
            <button id="nwNavToggle" class="nw-nav-toggle">${this.iconSvg('menu', 22)}</button>
            <a href="/" id="nwNavHome" class="nw-nav-home">${this.iconSvg('home', 22)}</a>
        `;
    },

    injectNav() {
        // Remove existing nav
        document.querySelectorAll('#nwNavPanel, #nwNavOverlay, #nwNavToggle, #nwNavHome').forEach(el => el.remove());
        
        const container = document.createElement('div');
        container.id = 'nwNavContainer';
        container.innerHTML = this.generateNavHTML();
        document.body.appendChild(container);
        this.injectStyles();
    },

    injectStyles() {
        if (document.getElementById('nwNavStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'nwNavStyles';
        style.textContent = `
            /* NW Nav v5.0 - Collapsible Chaos Edition */
            .nw-nav-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9998; opacity: 0; visibility: hidden; transition: all 0.3s; backdrop-filter: blur(4px); }
            .nw-nav-overlay.open { opacity: 1; visibility: visible; }
            
            .nw-nav-panel { position: fixed; top: 0; right: -320px; width: 300px; max-width: 85vw; height: 100vh; background: linear-gradient(180deg, #0d0d15 0%, #12121e 100%); z-index: 9999; transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; border-left: 1px solid rgba(255,215,0,0.2); box-shadow: -5px 0 30px rgba(0,0,0,0.5); }
            .nw-nav-panel.open { right: 0; }
            
            .nw-nav-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid rgba(255,215,0,0.2); background: rgba(0,0,0,0.3); }
            .nw-nav-title { font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 700; color: #ffd700; display: flex; align-items: center; gap: 8px; }
            .nw-nav-close { background: none; border: none; color: #888; cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.2s; }
            .nw-nav-close:hover { color: #fff; background: rgba(255,255,255,0.1); }
            
            /* Quick Access Bar */
            .nw-quick-access { display: flex; justify-content: space-around; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(255,107,0,0.05); }
            .nw-quick-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border-radius: 12px; color: #ffd700; transition: all 0.2s; }
            .nw-quick-btn:hover { background: rgba(255,215,0,0.2); transform: scale(1.1); }
            
            .nw-nav-lang { display: flex; justify-content: center; gap: 8px; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }
            .nw-lang-btn { background: rgba(255,255,255,0.05); border: 1px solid transparent; color: #888; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s; }
            .nw-lang-btn:hover { border-color: rgba(255,215,0,0.3); color: #fff; }
            .nw-lang-btn.active { background: rgba(255,215,0,0.2); border-color: #ffd700; color: #ffd700; }
            
            .nw-nav-scroll { flex: 1; overflow-y: auto; padding: 8px 0; }
            .nw-nav-scroll::-webkit-scrollbar { width: 4px; }
            .nw-nav-scroll::-webkit-scrollbar-track { background: transparent; }
            .nw-nav-scroll::-webkit-scrollbar-thumb { background: rgba(255,215,0,0.3); border-radius: 2px; }
            
            .nw-nav-section { margin: 4px 8px; }
            .nw-nav-section-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 8px; transition: all 0.2s; }
            .nw-nav-section-header.collapsible { cursor: pointer; }
            .nw-nav-section-header.collapsible:hover { background: rgba(255,255,255,0.05); }
            
            .nw-nav-desc { font-size: 9px; font-weight: 400; opacity: 0.5; text-transform: none; letter-spacing: 0; margin-left: 4px; }
            .nw-nav-count { font-size: 10px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 10px; margin-left: auto; opacity: 0.6; }
            .nw-nav-chevron { margin-left: auto; transition: transform 0.2s; opacity: 0.5; }
            .nw-nav-chevron.open { transform: rotate(90deg); }
            
            .nw-nav-pages { padding: 4px 0 4px 8px; }
            .nw-nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 12px; color: rgba(255,255,255,0.7); text-decoration: none; border-radius: 8px; transition: all 0.2s; font-size: 13px; }
            .nw-nav-link:hover { background: rgba(255,255,255,0.08); color: #fff; transform: translateX(4px); }
            .nw-nav-link.active { background: rgba(255,215,0,0.15); color: #ffd700; border-left: 3px solid #ffd700; }
            
            .nw-nav-icon { flex-shrink: 0; opacity: 0.8; }
            .nw-nav-text { flex: 1; }
            
            .nw-new-badge, .nw-hot-badge { font-size: 9px; padding: 2px 5px; border-radius: 4px; font-weight: 600; }
            .nw-new-badge { background: #00d26a; color: #000; }
            .nw-hot-badge { background: #ff4444; color: #fff; animation: hotPulse 1s infinite; }
            @keyframes hotPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
            
            .nw-nav-footer { padding: 12px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center; }
            .nw-nav-version { font-size: 10px; color: rgba(255,255,255,0.3); }
            
            /* Toggle & Home buttons */
            .nw-nav-toggle, .nw-nav-home { position: fixed; top: 12px; z-index: 9997; width: 44px; height: 44px; border-radius: 12px; border: 1px solid rgba(255,215,0,0.3); background: rgba(12,12,20,0.95); color: #ffd700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; backdrop-filter: blur(8px); }
            .nw-nav-toggle { right: 12px; }
            .nw-nav-home { right: 64px; }
            .nw-nav-toggle:hover, .nw-nav-home:hover { background: rgba(255,215,0,0.2); transform: scale(1.05); }
            
            /* Mobile adjustments */
            @media (max-width: 480px) {
                .nw-nav-panel { width: 100vw; max-width: 100vw; right: -100vw; }
                .nw-nav-toggle, .nw-nav-home { top: 8px; width: 40px; height: 40px; }
                .nw-nav-toggle { right: 8px; }
                .nw-nav-home { right: 56px; }
            }
        `;
        document.head.appendChild(style);
    },

    bindEvents() {
        const toggle = document.getElementById('nwNavToggle');
        const close = document.getElementById('nwNavClose');
        const overlay = document.getElementById('nwNavOverlay');
        const panel = document.getElementById('nwNavPanel');

        toggle?.addEventListener('click', () => this.open());
        close?.addEventListener('click', () => this.close());
        overlay?.addEventListener('click', () => this.close());

        // Section collapse toggle
        document.querySelectorAll('.nw-nav-section-header.collapsible').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.dataset.section;
                const sectionEl = header.closest('.nw-nav-section');
                const pages = sectionEl.querySelector('.nw-nav-pages');
                const chevron = header.querySelector('.nw-nav-chevron');
                
                const isCollapsed = pages.style.display === 'none';
                pages.style.display = isCollapsed ? 'block' : 'none';
                chevron?.classList.toggle('open', isCollapsed);
                sectionEl.classList.toggle('collapsed', !isCollapsed);
                this.setCollapsedState(section, !isCollapsed);
                
                if (typeof NW_SOUNDS !== 'undefined') NW_SOUNDS.play('click');
            });
        });

        // Language buttons
        document.querySelectorAll('.nw-lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                this.currentLang = lang;
                this.setStoredLang(lang);
                this.injectNav();
                this.bindEvents();
                document.dispatchEvent(new CustomEvent('nw-lang-change', { detail: { lang } }));
                if (typeof NW_SOUNDS !== 'undefined') NW_SOUNDS.play('click');
            });
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
    },

    open() {
        this.isOpen = true;
        document.getElementById('nwNavPanel')?.classList.add('open');
        document.getElementById('nwNavOverlay')?.classList.add('open');
        document.body.style.overflow = 'hidden';
        if (typeof NW_SOUNDS !== 'undefined') NW_SOUNDS.play('click');
    },

    close() {
        this.isOpen = false;
        document.getElementById('nwNavPanel')?.classList.remove('open');
        document.getElementById('nwNavOverlay')?.classList.remove('open');
        document.body.style.overflow = '';
    },

    setLang(lang) {
        this.currentLang = lang;
        this.setStoredLang(lang);
        this.injectNav();
        this.bindEvents();
    }
};

// Auto-init
if (typeof window !== 'undefined') {
    window.NW_NAV = NW_NAV;
    document.addEventListener('DOMContentLoaded', () => {
        const pageId = document.body.dataset.pageId || 'index';
        NW_NAV.init(pageId);
    });
}
