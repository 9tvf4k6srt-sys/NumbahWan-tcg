/**
 * NumbahWan TCG - Unified Navigation System v8.1
 * 60FPS BUTTERY SMOOTH EDITION - Mobile Optimized
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
                { id: 'achievements', name: { en: 'Achievements', zh: '成就', th: 'ความสำเร็จ' }, icon: 'trophy', href: '/achievements', isNew: true }
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
                { id: 'deckbuilder', name: { en: 'Deck Builder', zh: '卡組', th: 'สร้างเด็ค' }, icon: 'clipboard', href: '/deckbuilder' },
                { id: 'staking', name: { en: 'Card Staking', zh: '卡牌質押', th: 'เดิมพันการ์ด' }, icon: 'coins', href: '/staking', isNew: true },
                { id: 'fusion', name: { en: 'Card Fusion', zh: '卡牌融合', th: 'หลอมรวมการ์ด' }, icon: 'lightning', href: '/fusion', isNew: true }
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
                { id: 'tabletop-hub', name: { en: 'Tabletop Hub', zh: '桌遊中心', th: 'ศูนย์กลางบอร์ดเกม' }, icon: 'dice', href: '/tabletop', isHot: true },
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
            const messages = ['🎮 KONAMI CODE ACTIVATED!', '👀 You found a secret!', '🔮 The prophecy speaks of you...', '💀 Zakum whispers: "Nice try."'];
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
        this.injectNav();
        this.bindEvents();
        this.easterEggs.init();
        this.initialized = true;
    },

    t(obj) { return typeof obj === 'string' ? obj : (obj[this.currentLang] || obj.en || ''); },

    generateNavHTML() {
        const sectionsHTML = Object.entries(this.sections).map(([key, section]) => {
            const isCollapsible = section.collapsed !== false;
            const isCollapsed = isCollapsible && (this.collapsedSections[key] ?? section.collapsed);
            const hasActivePage = section.pages.some(p => p.id === this.currentPage);
            const showCollapsed = isCollapsible && isCollapsed && !hasActivePage;
            
            const pagesHTML = section.pages.map(page => {
                const isActive = page.id === this.currentPage;
                return `<a href="${page.href}" class="nw-nav-link ${isActive ? 'active' : ''}">${this.iconSvg(page.icon, 16)}<span class="nw-nav-text">${this.t(page.name)}</span>${page.isHot ? '<span class="nw-hot-badge">HOT</span>' : ''}${page.isNew ? '<span class="nw-new-badge">NEW</span>' : ''}</a>`;
            }).join('');

            const chevron = isCollapsible ? `<span class="nw-nav-chevron ${showCollapsed ? '' : 'open'}">${this.iconSvg('arrow-right', 12)}</span>` : '';
            return `
                <div class="nw-nav-section ${showCollapsed ? 'collapsed' : ''}" data-section="${key}">
                    <div class="nw-nav-section-header ${isCollapsible ? 'collapsible' : ''}" style="--section-color: ${section.color}" data-section="${key}">
                        ${this.iconSvg(section.icon, 16)}
                        <span>${this.t(section.name)}</span>
                        ${section.desc ? `<span class="nw-nav-desc">${this.t(section.desc)}</span>` : ''}
                        ${isCollapsible ? `<span class="nw-nav-count">${section.pages.length}</span>` : ''}
                        ${chevron}
                    </div>
                    <div class="nw-nav-pages ${showCollapsed ? 'collapsed' : ''}">${pagesHTML}</div>
                </div>
            `;
        }).join('');

        const langButtons = Object.entries(this.languages).map(([code, lang]) => 
            `<button class="nw-lang-btn ${code === this.currentLang ? 'active' : ''}" data-lang="${code}">${lang.code}</button>`
        ).join('');

        return `
            <div id="nwNavOverlay" class="nw-nav-overlay"></div>
            <nav id="nwNavPanel" class="nw-nav-panel">
                <div class="nw-nav-header">
                    <div class="nw-nav-title">${this.iconSvg('crown', 20)} NumbahWan</div>
                    <button id="nwNavClose" class="nw-nav-close">${this.iconSvg('close', 18)}</button>
                </div>
                <div class="nw-quick-access">
                    <a href="/forge" class="nw-quick-btn fire">${this.iconSvg('fire', 20)}</a>
                    <a href="/battle" class="nw-quick-btn battle">${this.iconSvg('swords', 20)}</a>
                    <a href="/claim" class="nw-quick-btn claim">${this.iconSvg('sparkles', 20)}</a>
                    <a href="/tabletop" class="nw-quick-btn tabletop">${this.iconSvg('dice', 20)}</a>
                </div>
                <div class="nw-nav-lang">${langButtons}</div>
                <div class="nw-nav-scroll">${sectionsHTML}</div>
                <div class="nw-nav-footer"><div class="nw-nav-version">v8.0 • 60fps Edition</div></div>
            </nav>
            <button id="nwNavToggle" class="nw-nav-toggle">${this.iconSvg('menu', 22)}</button>
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
    font-family: 'Orbitron', monospace, sans-serif;
    font-size: 18px; font-weight: 900;
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
    width: 50px; height: 50px;
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
    padding: 8px 16px; border-radius: 8px;
    font-size: 13px; font-weight: 600;
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
    display: flex; align-items: center; gap: 8px;
    padding: 12px 14px;
    font-size: 14px; font-weight: 700;
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

.nw-nav-desc { font-size: 9px; font-weight: 400; opacity: 0.5; text-transform: none; letter-spacing: 0; margin-left: 4px; }
.nw-nav-count {
    font-size: 10px;
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
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px;
    color: rgba(255,255,255,0.7);
    text-decoration: none;
    border-radius: 10px;
    font-size: 14px; font-weight: 500;
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
    font-size: 9px; padding: 3px 6px; border-radius: 4px; font-weight: 700;
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
    width: 52px; height: 52px;
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
.nw-nav-toggle:hover, .nw-nav-home:hover { transform: scale(1.08); }
.nw-nav-toggle:active, .nw-nav-home:active { transform: scale(0.92); }
.nw-nav-home:hover { border-color: #ffd700; box-shadow: 0 0 20px rgba(255,215,0,0.5); }

@media (max-width: 480px) {
    .nw-nav-panel { width: 100vw; max-width: 100vw; }
    .nw-nav-toggle, .nw-nav-home { width: 48px; height: 48px; }
    .nw-nav-toggle { bottom: 75px; right: 12px; }
    .nw-nav-home { bottom: 130px; right: 12px; }
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
    .nw-nav-home {
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

        // Language buttons
        document.querySelectorAll('.nw-lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
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
            }, { passive: true });
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
