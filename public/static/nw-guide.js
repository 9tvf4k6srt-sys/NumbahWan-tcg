/**
 * NumbahWan AI Guide v3.0
 * Multi-language floating assistant for site navigation
 * NOW AUTO-READS FROM NW_CONFIG - Single Source of Truth!
 * Supports: English, 繁體中文, ภาษาไทย
 */

(function() {
    'use strict';

    // Current language - syncs with site language setting (check multiple keys for compatibility)
    let currentLang = localStorage.getItem('lang') || localStorage.getItem('nw_lang') || localStorage.getItem('numbahwan_lang') || 'en';

    // ==================== UI TRANSLATIONS (Guide-specific) ====================
    const guideI18n = {
        ui: {
            en: {
                title: 'NumbahWan Guide',
                online: '● Online - Here to help!',
                placeholder: 'Ask me anything...',
                goTo: 'Go to',
                newBadge: 'NEW!'
            },
            zh: {
                title: 'NumbahWan 嚮導',
                online: '● 在線 - 隨時為您服務！',
                placeholder: '問我任何問題...',
                goTo: '前往',
                newBadge: '新功能！'
            },
            th: {
                title: 'ไกด์ NumbahWan',
                online: '● ออนไลน์ - พร้อมช่วยเหลือ!',
                placeholder: 'ถามอะไรก็ได้...',
                goTo: 'ไปที่',
                newBadge: 'ใหม่!'
            }
        },
        greetings: {
            en: ["Hey there, adventurer! 👋", "Yo! Need directions? I got you 🗺️", "What's up! Looking for something? 🔍", "Greetings, traveler! 🎮"],
            zh: ["嘿，冒險者！👋", "喲！需要指路嗎？交給我 🗺️", "嗨！在找什麼嗎？🔍", "你好，旅人！🎮"],
            th: ["สวัสดี นักผจญภัย! 👋", "โย่! ต้องการทิศทางไหม? 🗺️", "ว่าไง! หาอะไรอยู่? 🔍", "ยินดีต้อนรับ นักเดินทาง! 🎮"]
        },
        intro: {
            en: "I know all about this guild site! Ask me anything or tap a suggestion below 👇",
            zh: "我對這個公會網站瞭如指掌！問我任何問題或點擊下方建議 👇",
            th: "ฉันรู้ทุกอย่างเกี่ยวกับเว็บกิลด์นี้! ถามอะไรก็ได้หรือแตะคำแนะนำด้านล่าง 👇"
        },
        confused: {
            en: ["Hmm, not sure about that one! Try asking about a page 🤔", "My brain hurts! Can you rephrase? 😵", "That's beyond my programming! Try 'show pages' 🤷"],
            zh: ["嗯，不太確定耶！試著問問關於頁面的問題 🤔", "我腦袋打結了！能換個說法嗎？😵", "這超出我的能力了！試試「顯示頁面」🤷"],
            th: ["อืม ไม่แน่ใจเลย! ลองถามเกี่ยวกับหน้าต่างๆ ดู 🤔", "สมองฉันมึน! พูดใหม่ได้ไหม? 😵", "เกินความสามารถของฉัน! ลอง 'แสดงหน้าทั้งหมด' 🤷"]
        },
        jokes: {
            en: [
                "Why did the guild master cross the road? To avoid doing dailies! 😂",
                "What's a hacker's favorite snack? Spam! 🥫",
                "How many MapleStory players to change a lightbulb? None - they're all AFK! 💡",
                "Why did HR reject the banana? It didn't have enough appeal! 🍌",
                "What did the therapist say to the gacha player? 'Let's talk about your pull issues.' 🎰"
            ],
            zh: [
                "為什麼會長要過馬路？為了逃避每日任務！😂",
                "駭客最愛的零食是什麼？垃圾郵件！🥫",
                "需要多少楓之谷玩家換燈泡？零個——他們都在掛機！💡",
                "為什麼人資拒絕香蕉？它不夠有吸引力！🍌",
                "治療師對抽卡玩家說什麼？「讓我們談談你的抽卡問題。」🎰"
            ],
            th: [
                "ทำไมหัวหน้ากิลด์ถึงข้ามถนน? เพื่อหนีเควสประจำวัน! 😂",
                "แฮกเกอร์ชอบกินอะไร? สแปม! 🥫",
                "ต้องใช้ผู้เล่น MapleStory กี่คนเปลี่ยนหลอดไฟ? ไม่มี - พวกเขา AFK หมด! 💡",
                "ทำไม HR ถึงปฏิเสธกล้วย? มันไม่มีเสน่ห์พอ! 🍌",
                "นักบำบัดพูดอะไรกับผู้เล่นกาชา? 'มาคุยเรื่องปัญหาการสุ่มของคุณ' 🎰"
            ]
        },
        chips: {
            showPages: { en: '📋 Show all pages', zh: '📋 顯示所有頁面', th: '📋 แสดงหน้าทั้งหมด' },
            tips: { en: '💡 Tips', zh: '💡 提示', th: '💡 เคล็ดลับ' },
            joke: { en: '😂 Tell a joke', zh: '😂 講個笑話', th: '😂 เล่าเรื่องตลก' },
            help: { en: '❓ Help', zh: '❓ 幫助', th: '❓ ช่วยเหลือ' },
            langSwitch: { en: '🌐 Language', zh: '🌐 語言', th: '🌐 ภาษา' },
            newFeatures: { en: '🆕 New Features', zh: '🆕 新功能', th: '🆕 ฟีเจอร์ใหม่' }
        },
        langNames: {
            en: { en: 'English', zh: '英文', th: 'อังกฤษ' },
            zh: { en: 'Chinese', zh: '中文', th: 'จีน' },
            th: { en: 'Thai', zh: '泰文', th: 'ไทย' }
        },
        help: {
            en: "I can help you navigate! Try:\n• Ask about any page (Exchange, Court, Therapy, etc.)\n• 'show pages' - see all sections\n• 'new features' - see latest updates\n• 'tips' - get tips for current page\n• 'joke' - I'm hilarious! 😏\n• '🌐 Language' - switch language",
            zh: "我可以幫你導航！試試：\n• 詢問任何頁面（交易所、法院、療程等）\n• 「顯示頁面」- 查看所有區域\n• 「新功能」- 查看最新更新\n• 「提示」- 獲取當前頁面提示\n• 「笑話」- 我超幽默！😏\n• 「🌐 語言」- 切換語言",
            th: "ฉันช่วยนำทางได้! ลอง:\n• ถามเกี่ยวกับหน้าใดก็ได้ (Exchange, Court, Therapy ฯลฯ)\n• 'แสดงหน้า' - ดูทุกส่วน\n• 'ฟีเจอร์ใหม่' - ดูอัปเดตล่าสุด\n• 'เคล็ดลับ' - รับเคล็ดลับหน้าปัจจุบัน\n• 'ตลก' - ฉันตลกมาก! 😏\n• '🌐 ภาษา' - เปลี่ยนภาษา"
        },
        // Fallback page tips (when NW_CONFIG not available)
        fallbackTips: {
            '/': {
                en: ["Welcome to NumbahWan! Try the 📈 Exchange", "Check out the 🏫 Academy", "New here? Visit the 🏛️ Museum"],
                zh: ["歡迎來到NumbahWan！試試 📈 交易所", "看看 🏫 學院", "新手？去 🏛️ 博物館"],
                th: ["ยินดีต้อนรับสู่ NumbahWan! ลอง 📈 Exchange", "ดู 🏫 สถาบัน", "มาใหม่? ไปที่ 🏛️ พิพิธภัณฑ์"]
            }
        }
    };

    // ==================== FALLBACK PAGE DATA ====================
    // Used when NW_CONFIG is not loaded
    const fallbackPages = {
        home: { path: '/', emoji: '🏠', name: { en: 'Home', zh: '首頁', th: 'หน้าแรก' }, desc: { en: 'Guild headquarters', zh: '公會總部', th: 'สำนักงานใหญ่กิลด์' }, category: 'core' },
        forge: { path: '/forge', emoji: '🎰', name: { en: 'Card Forge', zh: '卡牌鍛造', th: 'โรงหลอมการ์ด' }, desc: { en: 'Open packs and collect cards', zh: '開包收集卡牌', th: 'เปิดแพ็คสะสมการ์ด' }, category: 'core' },
        battle: { path: '/battle', emoji: '⚔️', name: { en: 'Battle', zh: '戰鬥', th: 'ต่อสู้' }, desc: { en: 'Card battles and PvP', zh: '卡牌對戰', th: 'การต่อสู้การ์ด' }, category: 'game' },
        collection: { path: '/collection', emoji: '📚', name: { en: 'Collection', zh: '收藏', th: 'คอลเลกชัน' }, desc: { en: 'View your cards and achievements', zh: '查看卡牌和成就', th: 'ดูการ์ดและความสำเร็จ' }, category: 'core' },
        wallet: { path: '/wallet', emoji: '👛', name: { en: 'Wallet', zh: '錢包', th: 'กระเป๋าเงิน' }, desc: { en: 'Manage currencies and account', zh: '管理貨幣和帳戶', th: 'จัดการสกุลเงินและบัญชี' }, category: 'core' },
        market: { path: '/market', emoji: '🏪', name: { en: 'Card Market', zh: '卡牌市場', th: 'ตลาดการ์ด' }, desc: { en: 'Trade cards with others', zh: '與他人交易卡牌', th: 'ซื้อขายการ์ดกับผู้อื่น' }, category: 'economy' },
        arcade: { path: '/arcade', emoji: '🕹️', name: { en: 'Arcade', zh: '遊戲廳', th: 'อาร์เคด' }, desc: { en: 'Mini-games to earn currency', zh: '小遊戲賺取貨幣', th: 'มินิเกมหาเงิน' }, category: 'game' },
        exchange: { path: '/exchange', emoji: '📈', name: { en: 'Exchange', zh: '交易所', th: 'ตลาดแลกเปลี่ยน' }, desc: { en: 'Trade currencies', zh: '交易貨幣', th: 'แลกเปลี่ยนสกุลเงิน' }, category: 'economy' },
        merch: { path: '/merch', emoji: '🛍️', name: { en: 'Merch Shop', zh: '周邊商店', th: 'ร้านค้า' }, desc: { en: 'Guild merchandise', zh: '公會周邊', th: 'สินค้ากิลด์' }, category: 'economy' },
        court: { path: '/court', emoji: '⚖️', name: { en: 'Guild Court', zh: '公會法院', th: 'ศาลกิลด์' }, desc: { en: 'Sue your guildmates!', zh: '告你的隊友！', th: 'ฟ้องเพื่อนกิลด์!' }, category: 'absurdist' },
        therapy: { path: '/therapy', emoji: '🛋️', name: { en: 'Guild Therapy', zh: '公會療程', th: 'การบำบัดกิลด์' }, desc: { en: 'AI therapist for gaming trauma', zh: 'AI治療師處理遊戲創傷', th: 'นักบำบัด AI สำหรับบาดแผลเกม' }, category: 'absurdist' },
        hr: { path: '/hr', emoji: '📋', name: { en: 'HR Department', zh: '人事部', th: 'ฝ่ายบุคคล' }, desc: { en: 'Apply for guild jobs', zh: '申請公會職位', th: 'สมัครงานกิลด์' }, category: 'absurdist' },
        conspiracy: { path: '/conspiracy', emoji: '👁️', name: { en: 'Conspiracy Board', zh: '陰謀板', th: 'บอร์ดสมคบคิด' }, desc: { en: 'Connect the dots...', zh: '連接線索...', th: 'เชื่อมจุด...' }, category: 'absurdist' },
        academy: { path: '/academy', emoji: '🏫', name: { en: 'Academy', zh: '學院', th: 'สถาบัน' }, desc: { en: 'Learn coding wizardry', zh: '學習程式魔法', th: 'เรียนเวทมนตร์โค้ด' }, category: 'meta' },
        museum: { path: '/museum', emoji: '🏛️', name: { en: 'Museum', zh: '博物館', th: 'พิพิธภัณฑ์' }, desc: { en: 'Guild history and artifacts', zh: '公會歷史和文物', th: 'ประวัติและสิ่งประดิษฐ์กิลด์' }, category: 'meta' },
        vault: { path: '/vault', emoji: '🔒', name: { en: 'Archive Vault', zh: '檔案庫', th: 'ห้องนิรภัย' }, desc: { en: 'Secret archives', zh: '秘密檔案', th: 'เอกสารลับ' }, category: 'meta' },
        about: { path: '/about', emoji: '📜', name: { en: 'About', zh: '關於', th: 'เกี่ยวกับ' }, desc: { en: 'About NumbahWan', zh: '關於NumbahWan', th: 'เกี่ยวกับ NumbahWan' }, category: 'meta' },
        fortune: { path: '/fortune', emoji: '🔮', name: { en: 'Fortune Teller', zh: '算命師', th: 'หมอดู' }, desc: { en: 'Daily fortunes', zh: '每日運勢', th: 'ดวงรายวัน' }, category: 'fun' },
        deckbuilder: { path: '/deckbuilder', emoji: '🃏', name: { en: 'Deck Builder', zh: '牌組構築', th: 'สร้างสำรับ' }, desc: { en: 'Build your decks', zh: '構築你的牌組', th: 'สร้างสำรับของคุณ' }, category: 'game' },
        updates: { path: '/updates', emoji: '📋', name: { en: 'Patch Notes', zh: '更新日誌', th: 'บันทึกแพทช์' }, desc: { en: 'Latest updates', zh: '最新更新', th: 'อัปเดตล่าสุด' }, category: 'meta' }
    };

    // ==================== HELPER FUNCTIONS ====================
    function t(key) {
        const keys = key.split('.');
        let result = guideI18n;
        for (const k of keys) {
            result = result?.[k];
        }
        // Handle both structures: ui.title.en and ui.en.title
        if (result?.[currentLang]) {
            return result[currentLang];
        }
        // If result is an object with language keys inside (like ui.en.title)
        if (keys.length === 2 && guideI18n[keys[0]]?.[currentLang]?.[keys[1]]) {
            return guideI18n[keys[0]][currentLang][keys[1]];
        }
        if (keys.length === 2 && guideI18n[keys[0]]?.en?.[keys[1]]) {
            return guideI18n[keys[0]].en[keys[1]];
        }
        return result?.en || key;
    }

    function tRandom(key) {
        const arr = t(key);
        return Array.isArray(arr) ? arr[Math.floor(Math.random() * arr.length)] : arr;
    }

    // Get page info from NW_CONFIG (with fallback)
    function getPageInfo(pageKey) {
        // Try NW_CONFIG first (Single Source of Truth)
        if (window.NW_CONFIG?.getPage) {
            const page = NW_CONFIG.getPage(pageKey);
            if (page) return page;
        }
        // Fallback to built-in data
        const fb = fallbackPages[pageKey];
        if (fb) {
            return {
                ...fb,
                name: fb.name[currentLang] || fb.name.en,
                desc: fb.desc[currentLang] || fb.desc.en
            };
        }
        return null;
    }

    // Get all pages from NW_CONFIG
    function getAllPages(category = null) {
        if (window.NW_CONFIG?.getAllPages) {
            return NW_CONFIG.getAllPages(category);
        }
        // Fallback to built-in data
        const pages = Object.entries(fallbackPages).map(([key, page]) => ({
            key,
            ...page,
            name: page.name[currentLang] || page.name.en,
            desc: page.desc[currentLang] || page.desc.en
        }));
        if (category) {
            return pages.filter(p => p.category === category);
        }
        return pages;
    }

    // Get tips for current page
    function getPageTips(path) {
        // Try NW_CONFIG first
        if (window.NW_CONFIG) {
            const pages = Object.values(NW_CONFIG.pages);
            const page = pages.find(p => p.path === path);
            if (page?.tips) {
                const tips = NW_CONFIG.t(page.tips, currentLang);
                if (Array.isArray(tips) && tips.length > 0) return tips;
            }
        }
        // Fallback
        return guideI18n.fallbackTips[path]?.[currentLang] || guideI18n.fallbackTips['/'][currentLang];
    }

    // Match user input to a page
    function findPageByInput(input) {
        const lower = input.toLowerCase();
        
        // Try NW_CONFIG first
        if (window.NW_CONFIG?.pages) {
            for (const [key, page] of Object.entries(NW_CONFIG.pages)) {
                const keywords = page.keywords?.[currentLang] || page.keywords?.en || [];
                for (const kw of keywords) {
                    if (lower.includes(kw.toLowerCase())) return key;
                }
                const name = NW_CONFIG.t ? NW_CONFIG.t(page.name, currentLang) : (page.name[currentLang] || page.name.en);
                if (lower.includes(name.toLowerCase())) return key;
            }
        }
        
        // Fallback to built-in pages
        for (const [key, page] of Object.entries(fallbackPages)) {
            const name = page.name[currentLang] || page.name.en;
            if (lower.includes(name.toLowerCase()) || lower.includes(key.toLowerCase())) {
                return key;
            }
        }
        return null;
    }

    // ==================== UI CREATION ====================
    function createChatUI() {
        const style = document.createElement('style');
        style.textContent = `
            #nw-guide-toggle {
                position: fixed;
                bottom: 50px;
                left: 24px;
                width: 52px;
                height: 52px;
                border-radius: 14px;
                background: linear-gradient(145deg, #1a1a2e 0%, #0f0f1a 100%);
                border: 1px solid rgba(255, 107, 0, 0.25);
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                overflow: visible;
            }
            #nw-guide-toggle:hover {
                transform: translateY(-2px);
                border-color: rgba(255, 107, 0, 0.5);
                box-shadow: 0 6px 28px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 107, 0, 0.1);
            }
            #nw-guide-toggle.open {
                border-color: rgba(255, 107, 0, 0.6);
                background: linear-gradient(145deg, #1f1f35 0%, #12121f 100%);
            }
            #nw-guide-toggle svg {
                width: 24px;
                height: 24px;
                transition: all 0.2s ease;
            }
            #nw-guide-toggle:hover svg { transform: scale(1.08); }
            #nw-guide-toggle.open svg.nw-icon-chat { display: none; }
            #nw-guide-toggle.open svg.nw-icon-close { display: block; }
            #nw-guide-toggle svg.nw-icon-close { display: none; }
            .nw-guide-new-badge {
                position: absolute;
                top: -4px;
                left: -4px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                font-size: 9px;
                padding: 2px 5px;
                border-radius: 8px;
                font-weight: 700;
                animation: nw-pulse 2s infinite;
            }
            @keyframes nw-pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            #nw-guide-chat {
                position: fixed;
                bottom: 120px;
                left: 24px;
                width: 380px;
                max-width: calc(100vw - 48px);
                max-height: 520px;
                background: #0d1117;
                border: 1px solid #21262d;
                border-radius: 16px;
                box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
                z-index: 99998;
                display: none;
                flex-direction: column;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            #nw-guide-chat.open {
                display: flex;
                animation: nw-slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            @keyframes nw-slide-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .nw-guide-header {
                padding: 16px;
                background: linear-gradient(135deg, #1a1f26 0%, #0d1117 100%);
                border-bottom: 1px solid #21262d;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .nw-guide-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(135deg, #ff6b00, #ff9500);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .nw-guide-info h3 {
                color: #fff;
                font-size: 14px;
                font-weight: 600;
                margin: 0;
            }
            .nw-guide-info span {
                color: #00ff88;
                font-size: 11px;
            }
            .nw-guide-version {
                margin-left: auto;
                font-size: 10px;
                color: #6e7681;
                background: rgba(255,255,255,0.05);
                padding: 2px 8px;
                border-radius: 10px;
            }

            .nw-guide-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                min-height: 150px;
                max-height: 280px;
            }
            .nw-guide-msg {
                max-width: 85%;
                padding: 10px 14px;
                border-radius: 16px;
                font-size: 13px;
                line-height: 1.5;
                animation: nw-msg-in 0.2s ease;
            }
            @keyframes nw-msg-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            .nw-guide-msg.bot {
                background: #1a1f26;
                color: #e6edf3;
                border-bottom-left-radius: 4px;
                align-self: flex-start;
            }
            .nw-guide-msg.user {
                background: linear-gradient(135deg, #ff6b00, #ff9500);
                color: #fff;
                border-bottom-right-radius: 4px;
                align-self: flex-end;
            }
            .nw-guide-msg a {
                color: #ff9500;
                text-decoration: none;
                font-weight: 600;
            }
            .nw-guide-msg a:hover {
                text-decoration: underline;
            }

            .nw-guide-page-link {
                display: inline-block;
                margin-top: 8px;
                padding: 6px 12px;
                background: rgba(255, 107, 0, 0.15);
                border: 1px solid rgba(255, 107, 0, 0.3);
                border-radius: 8px;
                color: #ff9500 !important;
                font-size: 12px;
                transition: all 0.2s;
            }
            .nw-guide-page-link:hover {
                background: rgba(255, 107, 0, 0.25);
                text-decoration: none !important;
            }
            .nw-guide-page-link.new::after {
                content: 'NEW';
                margin-left: 6px;
                background: #ef4444;
                color: white;
                font-size: 9px;
                padding: 1px 4px;
                border-radius: 4px;
            }

            .nw-guide-suggestions {
                padding: 12px 16px;
                border-top: 1px solid #21262d;
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .nw-guide-chip {
                padding: 6px 12px;
                background: #21262d;
                border: 1px solid #30363d;
                border-radius: 16px;
                color: #8b949e;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
            }
            .nw-guide-chip:hover {
                background: #30363d;
                color: #fff;
                border-color: #ff6b00;
            }
            .nw-guide-chip.lang-chip {
                background: rgba(255, 107, 0, 0.1);
                border-color: rgba(255, 107, 0, 0.3);
                color: #ff9500;
            }
            .nw-guide-chip.new-chip {
                background: rgba(0, 255, 136, 0.1);
                border-color: rgba(0, 255, 136, 0.3);
                color: #00ff88;
            }

            .nw-guide-input-area {
                padding: 12px 16px;
                border-top: 1px solid #21262d;
                display: flex;
                gap: 8px;
            }
            .nw-guide-input {
                flex: 1;
                padding: 10px 14px;
                background: #161b22;
                border: 1px solid #30363d;
                border-radius: 10px;
                color: #fff;
                font-size: 13px;
                outline: none;
            }
            .nw-guide-input:focus {
                border-color: #ff6b00;
            }
            .nw-guide-input::placeholder {
                color: #484f58;
            }
            .nw-guide-send {
                padding: 10px 14px;
                background: linear-gradient(135deg, #ff6b00, #ff9500);
                border: none;
                border-radius: 10px;
                color: #fff;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
                user-select: none;
                min-width: 44px;
                min-height: 44px;
            }
            .nw-guide-send:hover, .nw-guide-send:active {
                transform: scale(1.05);
                background: linear-gradient(135deg, #ff8533, #ffaa33);
            }

            @media (max-width: 480px) {
                #nw-guide-toggle {
                    bottom: 50px;
                    left: 16px;
                    width: 48px;
                    height: 48px;
                }
                #nw-guide-chat {
                    bottom: 110px;
                    left: 16px;
                    max-width: calc(100vw - 32px);
                }
            }
        `;
        document.head.appendChild(style);

        // Toggle button
        const toggle = document.createElement('button');
        toggle.id = 'nw-guide-toggle';
        toggle.innerHTML = `
            <svg class="nw-icon-chat" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.03 2 11c0 2.39 1.02 4.56 2.67 6.13L3 21l4.38-1.82C8.83 19.7 10.38 20 12 20c5.52 0 10-4.03 10-9s-4.48-9-10-9z" fill="url(#cg)"/>
                <circle cx="8" cy="11" r="1.25" fill="#fff"/>
                <circle cx="12" cy="11" r="1.25" fill="#fff"/>
                <circle cx="16" cy="11" r="1.25" fill="#fff"/>
                <defs><linearGradient id="cg" x1="2" y1="2" x2="22" y2="21"><stop stop-color="#ff6b00"/><stop offset="1" stop-color="#ff9500"/></linearGradient></defs>
            </svg>
            <svg class="nw-icon-close" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#ff6b00" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            <span class="nw-guide-new-badge">${t('ui.newBadge')}</span>
        `;
        toggle.setAttribute('aria-label', 'Open AI Guide');

        // Chat window
        const chat = document.createElement('div');
        chat.id = 'nw-guide-chat';
        updateChatHTML(chat);

        document.body.appendChild(toggle);
        document.body.appendChild(chat);

        return { toggle, chat };
    }

    function updateChatHTML(chat) {
        const version = window.NW_CONFIG?.version || '3.0.0';
        chat.innerHTML = `
            <div class="nw-guide-header">
                <div class="nw-guide-avatar">
                    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                        <circle cx="12" cy="12" r="10" fill="url(#ag)"/>
                        <circle cx="8" cy="11" r="1" fill="#fff"/>
                        <circle cx="12" cy="11" r="1" fill="#fff"/>
                        <circle cx="16" cy="11" r="1" fill="#fff"/>
                        <defs><linearGradient id="ag" x1="2" y1="2" x2="22" y2="22"><stop stop-color="#ff6b00"/><stop offset="1" stop-color="#ff9500"/></linearGradient></defs>
                    </svg>
                </div>
                <div class="nw-guide-info">
                    <h3>${t('ui.title')}</h3>
                    <span>${t('ui.online')}</span>
                </div>
                <span class="nw-guide-version">v${version}</span>
            </div>
            <div class="nw-guide-messages" id="nw-guide-messages"></div>
            <div class="nw-guide-suggestions" id="nw-guide-suggestions"></div>
            <div class="nw-guide-input-area">
                <input type="text" class="nw-guide-input" id="nw-guide-input" placeholder="${t('ui.placeholder')}" autocomplete="off">
                <button class="nw-guide-send" id="nw-guide-send">➤</button>
            </div>
        `;
    }

    // ==================== CHAT FUNCTIONS ====================
    function addMessage(text, isBot = true) {
        const container = document.getElementById('nw-guide-messages');
        if (!container) return;
        const msg = document.createElement('div');
        msg.className = `nw-guide-msg ${isBot ? 'bot' : 'user'}`;
        msg.innerHTML = text;
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
        
        if (typeof NW_SOUNDS !== 'undefined') {
            NW_SOUNDS.play('click');
        }
    }

    function showSuggestions(suggestions) {
        const container = document.getElementById('nw-guide-suggestions');
        if (!container) return;
        container.innerHTML = suggestions.map(s => 
            `<div class="nw-guide-chip ${s.isLang ? 'lang-chip' : ''} ${s.isNew ? 'new-chip' : ''}" data-action="${s.action || ''}" data-value="${s.value || ''}">${s.label}</div>`
        ).join('');
    }

    function showContextualSuggestions() {
        const suggestions = [
            { label: guideI18n.chips.showPages[currentLang], value: 'show pages' },
            { label: guideI18n.chips.newFeatures[currentLang], value: 'new features', isNew: true },
            { label: guideI18n.chips.tips[currentLang], value: 'tips' },
            { label: guideI18n.chips.langSwitch[currentLang], action: 'lang', isLang: true }
        ];
        showSuggestions(suggestions);
    }

    function showLanguageOptions() {
        const suggestions = [
            { label: '🇬🇧 English', action: 'setlang', value: 'en', isLang: true },
            { label: '🇹🇼 繁體中文', action: 'setlang', value: 'zh', isLang: true },
            { label: '🇹🇭 ภาษาไทย', action: 'setlang', value: 'th', isLang: true }
        ];
        const langMsg = {
            en: "Choose your language:",
            zh: "選擇你的語言：",
            th: "เลือกภาษาของคุณ:"
        };
        addMessage(langMsg[currentLang]);
        showSuggestions(suggestions);
    }

    function setLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('numbahwan_lang', lang);
        
        const chat = document.getElementById('nw-guide-chat');
        if (chat) {
            const wasOpen = chat.classList.contains('open');
            const messages = document.getElementById('nw-guide-messages')?.innerHTML || '';
            updateChatHTML(chat);
            if (messages) {
                document.getElementById('nw-guide-messages').innerHTML = messages;
            }
            if (wasOpen) chat.classList.add('open');
            bindInputEvents();
        }

        const confirmMsg = {
            en: "Language set to English! 🇬🇧",
            zh: "語言已設定為繁體中文！🇹🇼",
            th: "ตั้งค่าภาษาเป็นภาษาไทยแล้ว! 🇹🇭"
        };
        addMessage(confirmMsg[lang]);
        showContextualSuggestions();

        window.dispatchEvent(new CustomEvent('nw-lang-changed', { detail: { lang } }));
    }

    function respondWithPage(pageKey) {
        const page = getPageInfo(pageKey);
        if (!page) {
            addMessage(tRandom('confused'));
            return;
        }
        
        const goToText = t('ui.goTo');
        const isNew = page.category === 'absurdist';
        const newClass = isNew ? ' new' : '';
        
        addMessage(`${page.emoji} <strong>${page.name}</strong><br>${page.desc}<br><br><a href="${page.path}" class="nw-guide-page-link${newClass}">${page.emoji} ${goToText} ${page.name}</a>`);
        showContextualSuggestions();
    }

    function respondWithPageList() {
        const allPages = getAllPages();
        if (allPages.length === 0) {
            addMessage("Loading pages... try again in a moment!");
            return;
        }
        
        // Group by category
        const categories = {
            core: { emoji: '🏠', name: { en: 'Core', zh: '核心', th: 'หลัก' } },
            economy: { emoji: '💰', name: { en: 'Economy', zh: '經濟', th: 'เศรษฐกิจ' } },
            game: { emoji: '🎮', name: { en: 'Games', zh: '遊戲', th: 'เกม' } },
            fun: { emoji: '🎉', name: { en: 'Fun', zh: '趣味', th: 'สนุก' } },
            absurdist: { emoji: '🤪', name: { en: 'NEW! Absurdist', zh: '新！荒誕', th: 'ใหม่! ไร้สาระ' } },
            meta: { emoji: '📋', name: { en: 'Info', zh: '資訊', th: 'ข้อมูล' } }
        };
        
        // Featured pages
        const featured = ['exchange', 'forge', 'arcade', 'court', 'therapy', 'hr', 'conspiracy'];
        const list = featured
            .map(key => {
                const p = getPageInfo(key);
                if (!p) return '';
                const isNew = p.category === 'absurdist';
                return `<a href="${p.path}" class="nw-guide-page-link${isNew ? ' new' : ''}">${p.emoji} ${p.name}</a>`;
            })
            .filter(Boolean)
            .join(' ');
        
        const introText = {
            en: "Here are the featured spots:",
            zh: "這裡是精選區域：",
            th: "นี่คือจุดแนะนำ:"
        };
        addMessage(`${introText[currentLang]}<br><br>${list}<br><br><a href="/updates" class="nw-guide-page-link">📋 ${currentLang === 'zh' ? '完整更新日誌' : currentLang === 'th' ? 'บันทึกแพทช์ทั้งหมด' : 'Full Patch Notes'}</a>`);
        showContextualSuggestions();
    }

    function respondWithNewFeatures() {
        // Try NW_CONFIG first
        if (window.NW_CONFIG?.getLatestPatch) {
            const patch = NW_CONFIG.getLatestPatch();
            const title = NW_CONFIG.t(patch.title, currentLang);
            const newItems = patch.changes.filter(c => c.category === 'new');
            
            let msg = `🆕 <strong>${title}</strong> (v${patch.version})<br><br>`;
            newItems.forEach(item => {
                const itemTitle = NW_CONFIG.t(item.title, currentLang);
                msg += `${item.icon} <strong>${itemTitle}</strong>`;
                if (item.path) msg += ` <a href="${item.path}" class="nw-guide-page-link new">${item.path}</a>`;
                msg += `<br>`;
            });
            msg += `<br><a href="/updates" class="nw-guide-page-link">📋 ${currentLang === 'zh' ? '完整更新日誌' : currentLang === 'th' ? 'บันทึกแพทช์ทั้งหมด' : 'Full Patch Notes'}</a>`;
            addMessage(msg);
        } else {
            // Fallback: show absurdist pages as "new features"
            const newFeatures = {
                en: '🆕 <strong>Latest Features</strong><br><br>⚖️ <strong>Guild Court</strong> - Sue your guildmates! <a href="/court" class="nw-guide-page-link new">/court</a><br>🛋️ <strong>Guild Therapy</strong> - AI therapist <a href="/therapy" class="nw-guide-page-link new">/therapy</a><br>📋 <strong>HR Department</strong> - Apply for jobs <a href="/hr" class="nw-guide-page-link new">/hr</a><br>👁️ <strong>Conspiracy Board</strong> - Connect the dots <a href="/conspiracy" class="nw-guide-page-link new">/conspiracy</a><br>⭐ <strong>Card Upgrades</strong> - Star levels & burn system <a href="/collection" class="nw-guide-page-link new">/collection</a>',
                zh: '🆕 <strong>最新功能</strong><br><br>⚖️ <strong>公會法院</strong> - 告你的隊友！ <a href="/court" class="nw-guide-page-link new">/court</a><br>🛋️ <strong>公會療程</strong> - AI治療師 <a href="/therapy" class="nw-guide-page-link new">/therapy</a><br>📋 <strong>人事部</strong> - 申請職位 <a href="/hr" class="nw-guide-page-link new">/hr</a><br>👁️ <strong>陰謀板</strong> - 連接線索 <a href="/conspiracy" class="nw-guide-page-link new">/conspiracy</a><br>⭐ <strong>卡牌升級</strong> - 星級和燃燒系統 <a href="/collection" class="nw-guide-page-link new">/collection</a>',
                th: '🆕 <strong>ฟีเจอร์ใหม่</strong><br><br>⚖️ <strong>ศาลกิลด์</strong> - ฟ้องเพื่อนกิลด์! <a href="/court" class="nw-guide-page-link new">/court</a><br>🛋️ <strong>การบำบัดกิลด์</strong> - นักบำบัด AI <a href="/therapy" class="nw-guide-page-link new">/therapy</a><br>📋 <strong>ฝ่ายบุคคล</strong> - สมัครงาน <a href="/hr" class="nw-guide-page-link new">/hr</a><br>👁️ <strong>บอร์ดสมคบคิด</strong> - เชื่อมจุด <a href="/conspiracy" class="nw-guide-page-link new">/conspiracy</a><br>⭐ <strong>อัปเกรดการ์ด</strong> - ระบบดาวและเบิร์น <a href="/collection" class="nw-guide-page-link new">/collection</a>'
            };
            addMessage(newFeatures[currentLang] || newFeatures.en);
        }
        showContextualSuggestions();
    }

    function respondWithTips() {
        const path = window.location.pathname;
        const tips = getPageTips(path);
        const tip = tips[Math.floor(Math.random() * tips.length)];
        addMessage(`💡 ${tip}`);
        showContextualSuggestions();
    }

    function respondWithHelp() {
        addMessage(t('help').replace(/\n/g, '<br>'));
        showContextualSuggestions();
    }

    // ==================== INPUT PROCESSING ====================
    function processInput(input) {
        const lower = input.toLowerCase().trim();
        
        addMessage(input, false);

        setTimeout(() => {
            // Try to match a page from NW_CONFIG
            const pageKey = findPageByInput(input);
            if (pageKey) {
                respondWithPage(pageKey);
                return;
            }
            
            // Commands
            if (lower.includes('page') || lower.includes('show') || lower.includes('all') || lower.includes('list') ||
                lower.includes('頁面') || lower.includes('全部') || lower.includes('顯示') ||
                lower.includes('หน้า') || lower.includes('ทั้งหมด') || lower.includes('แสดง')) {
                respondWithPageList();
            }
            else if (lower.includes('new') || lower.includes('update') || lower.includes('patch') || lower.includes('feature') ||
                     lower.includes('新') || lower.includes('更新') ||
                     lower.includes('ใหม่') || lower.includes('อัปเดต')) {
                respondWithNewFeatures();
            }
            else if (lower.includes('help') || lower === '?' ||
                     lower.includes('幫助') || lower.includes('ช่วย')) {
                respondWithHelp();
            }
            else if (lower.includes('joke') || lower.includes('funny') || lower.includes('lol') ||
                     lower.includes('笑話') || lower.includes('有趣') ||
                     lower.includes('ตลก') || lower.includes('ขำ')) {
                addMessage(tRandom('jokes'));
                showContextualSuggestions();
            }
            else if (lower.includes('tip') || lower.includes('hint') ||
                     lower.includes('提示') || lower.includes('เคล็ดลับ')) {
                respondWithTips();
            }
            else if (lower.includes('language') || lower.includes('lang') || lower === '🌐' ||
                     lower.includes('語言') || lower.includes('ภาษา')) {
                showLanguageOptions();
            }
            else if (lower.match(/^(hi|hey|hello|yo|sup|哈囉|你好|嗨|สวัสดี)/)) {
                addMessage(tRandom('greetings'));
                showContextualSuggestions();
            }
            else {
                addMessage(tRandom('confused'));
                showSuggestions([
                    { label: guideI18n.chips.showPages[currentLang], value: 'show all pages' },
                    { label: guideI18n.chips.newFeatures[currentLang], value: 'new features', isNew: true },
                    { label: guideI18n.chips.joke[currentLang], value: 'joke' }
                ]);
            }
        }, 300);
    }

    // ==================== EVENT BINDING ====================
    function bindInputEvents() {
        const sendBtn = document.getElementById('nw-guide-send');
        const input = document.getElementById('nw-guide-input');
        
        if (!sendBtn || !input) {
            console.warn('[NW_GUIDE] Could not find send button or input');
            return;
        }
        
        // Remove old listeners by cloning
        const newSendBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
        
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        // Send function
        function sendMessage() {
            const inputEl = document.getElementById('nw-guide-input');
            const msg = inputEl?.value?.trim();
            if (msg) {
                console.log('[NW_GUIDE] Sending:', msg);
                processInput(msg);
                inputEl.value = '';
            }
        }
        
        // Bind to fresh elements
        const freshBtn = document.getElementById('nw-guide-send');
        const freshInput = document.getElementById('nw-guide-input');
        
        if (freshBtn) {
            // Use both click and touchend for mobile compatibility
            freshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                sendMessage();
            });
            freshBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                sendMessage();
            });
        }
        
        if (freshInput) {
            freshInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                }
            });
            // Also handle keydown for mobile keyboards
            freshInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
        
        console.log('[NW_GUIDE] Events bound successfully');
    }

    // ==================== INITIALIZATION ====================
    function init() {
        const { toggle, chat } = createChatUI();
        let isOpen = false;

        toggle.addEventListener('click', () => {
            isOpen = !isOpen;
            chat.classList.toggle('open', isOpen);
            toggle.classList.toggle('open', isOpen);
            
            if (isOpen && document.getElementById('nw-guide-messages').children.length === 0) {
                setTimeout(() => {
                    addMessage(tRandom('greetings'));
                    setTimeout(() => {
                        addMessage(t('intro'));
                        showContextualSuggestions();
                    }, 500);
                }, 200);
            }
            
            if (typeof NW_SOUNDS !== 'undefined') NW_SOUNDS.play('click');
        });

        bindInputEvents();

        // Chip clicks
        document.getElementById('nw-guide-suggestions').addEventListener('click', (e) => {
            const chip = e.target.closest('.nw-guide-chip');
            if (!chip) return;
            
            const action = chip.dataset.action;
            const value = chip.dataset.value;
            
            if (action === 'lang') {
                showLanguageOptions();
            } else if (action === 'setlang') {
                setLanguage(value);
            } else if (value) {
                processInput(value);
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (isOpen && !chat.contains(e.target) && !toggle.contains(e.target)) {
                isOpen = false;
                chat.classList.remove('open');
                toggle.classList.remove('open');
            }
        });

        // Listen for language changes from other components
        window.addEventListener('storage', (e) => {
            if (e.key === 'numbahwan_lang' && e.newValue !== currentLang) {
                currentLang = e.newValue || 'en';
                const chatEl = document.getElementById('nw-guide-chat');
                if (chatEl) {
                    updateChatHTML(chatEl);
                    bindInputEvents(); // Re-bind after HTML update
                }
            }
        });

        // Listen for config updates
        window.addEventListener('nw-config-update', () => {
            console.log('[NW_GUIDE] Config updated, refreshing data...');
        });
    }

    // Start when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Listen for language changes from NW_NAV
    window.addEventListener('nw-lang-change', (e) => {
        const newLang = e.detail?.lang;
        if (newLang && newLang !== currentLang) {
            currentLang = newLang;
            // Update the badge text
            const badge = document.querySelector('.nw-guide-new-badge');
            if (badge) {
                badge.textContent = t('ui.newBadge');
            }
            // Update chat if open
            const chat = document.getElementById('nw-guide-chat');
            if (chat) {
                updateChatHTML(chat);
                bindInputEvents(); // Re-bind after HTML update
            }
            console.log('[NW_GUIDE] Language updated to:', newLang);
        }
    });

    console.log('%c[NW_GUIDE] v3.3 - Fixed mobile touch events for send button!', 
        'background: #1a1a2e; color: #ff6b00; font-size: 12px; padding: 4px 8px; border-radius: 4px;');
})();
