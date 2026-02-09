/**
 * NumbahWan Central Configuration v1.0
 * SINGLE SOURCE OF TRUTH - All game data flows from here
 * 
 * When you update this file:
 * 1. All pages auto-refresh their data
 * 2. Economy auto-balances based on rules
 * 3. Patch notes auto-generate
 * 4. AI Guide auto-updates
 */

const NW_CONFIG = {
    // ═══════════════════════════════════════════════════════════════
    // VERSION & META
    // ═══════════════════════════════════════════════════════════════
    version: '2.2.0',
    lastUpdate: '2026-02-06',
    environment: 'production',
    
    // ═══════════════════════════════════════════════════════════════
    // PATCH HISTORY - Auto-feeds to /updates page
    // ═══════════════════════════════════════════════════════════════
    patches: [
        {
            version: '2.2.0',
            date: '2026-02-06',
            title: { 
                en: 'Avatar Studio & AI Guide Enhancement', 
                zh: '頭像工作室和AI指南增強', 
                th: 'สตูดิโออวาตาร์และการปรับปรุงไกด์ AI' 
            },
            type: 'major',
            changes: [
                {
                    category: 'new',
                    title: { en: 'MapleStory Avatar Studio', zh: 'MapleStory頭像工作室', th: 'สตูดิโออวาตาร์ MapleStory' },
                    desc: { 
                        en: 'Upload your MapleStory screenshot and generate AI-powered avatar art in 8 different poses!',
                        zh: '上傳你的楓之谷截圖，以8種不同姿勢生成AI頭像藝術！',
                        th: 'อัปโหลดภาพหน้าจอ MapleStory ของคุณและสร้างอวาตาร์ AI ใน 8 โพสที่แตกต่างกัน!'
                    },
                    icon: '',
                    path: '/avatar-studio'
                },
                {
                    category: 'new',
                    title: { en: 'Smart AI Guide', zh: '智能AI指南', th: 'ไกด์ AI อัจฉริยะ' },
                    desc: { 
                        en: 'Chatbot now tracks your viewing history and suggests features based on your interests!',
                        zh: '聊天機器人現在追蹤你的瀏覽歷史，並根據你的興趣推薦功能！',
                        th: 'แชทบอทตอนนี้ติดตามประวัติการดูของคุณและแนะนำฟีเจอร์ตามความสนใจ!'
                    },
                    icon: ''
                },
                {
                    category: 'feature',
                    title: { en: 'Full i18n for Avatar Studio', zh: '頭像工作室完整i18n', th: 'i18n เต็มรูปแบบสำหรับสตูดิโออวาตาร์' },
                    desc: { 
                        en: 'Avatar Studio supports English, Traditional Chinese, and Thai!',
                        zh: '頭像工作室支援英文、繁體中文和泰文！',
                        th: 'สตูดิโออวาตาร์รองรับภาษาอังกฤษ จีนตัวเต็ม และไทย!'
                    },
                    icon: ''
                },
                {
                    category: 'fix',
                    title: { en: 'Mobile Tips Button Fix', zh: '手機提示按鈕修復', th: 'แก้ไขปุ่มเคล็ดลับบนมือถือ' },
                    desc: { 
                        en: 'Fixed "Learn More" tips buttons not responding on mobile devices',
                        zh: '修復「了解更多」提示按鈕在手機上無反應的問題',
                        th: 'แก้ไขปุ่ม "เรียนรู้เพิ่มเติม" ที่ไม่ตอบสนองบนอุปกรณ์มือถือ'
                    },
                    icon: ''
                }
            ]
        },
        {
            version: '2.1.1',
            date: '2026-02-02',
            title: { 
                en: 'Card Upgrade System', 
                zh: '卡片升級系統', 
                th: 'ระบบอัพเกรดการ์ด' 
            },
            type: 'minor',
            changes: [
                {
                    category: 'new',
                    title: { en: 'Star Upgrades (1-5)', zh: '星級升級 (1-5)', th: 'อัพเกรดดาว (1-5)' },
                    desc: { 
                        en: 'Use duplicate cards to upgrade star level. Higher stars = better stats (+15%/30%/50%/75%)',
                        zh: '使用重複卡片升級星級。星級越高 = 屬性越強 (+15%/30%/50%/75%)',
                        th: 'ใช้การ์ดซ้ำเพื่ออัพเกรดระดับดาว ดาวสูงขึ้น = สถานะดีขึ้น (+15%/30%/50%/75%)'
                    },
                    icon: '',
                    path: '/collection'
                },
                {
                    category: 'new',
                    title: { en: 'Card Burning', zh: '卡片燃燒', th: 'เผาการ์ด' },
                    desc: { 
                        en: 'Burn unwanted cards for Sacred Logs. Higher rarity & stars = more logs!',
                        zh: '燃燒不需要的卡片換取神聖原木。稀有度和星級越高 = 原木越多！',
                        th: 'เผาการ์ดที่ไม่ต้องการเพื่อรับ Sacred Logs ความหายากและดาวสูงขึ้น = ท่อนไม้มากขึ้น!'
                    },
                    icon: '',
                    path: '/collection'
                },
                {
                    category: 'feature',
                    title: { en: 'Architecture Overhaul', zh: '架構大改', th: 'ปรับปรุงสถาปัตยกรรม' },
                    desc: { 
                        en: 'New boot loader, unified storage system, centralized error handling',
                        zh: '新引導加載器、統一存儲系統、集中錯誤處理',
                        th: 'บูตโหลดเดอร์ใหม่ ระบบจัดเก็บรวม การจัดการข้อผิดพลาดส่วนกลาง'
                    },
                    icon: ''
                },
                {
                    category: 'fix',
                    title: { en: 'Guide Translation Fix', zh: '指南翻譯修復', th: 'แก้ไขการแปลไกด์' },
                    desc: { 
                        en: 'Fixed AI Guide showing "ui.title" instead of translated text',
                        zh: '修復AI指南顯示 "ui.title" 而不是翻譯文字',
                        th: 'แก้ไข AI Guide แสดง "ui.title" แทนข้อความแปล'
                    },
                    icon: ''
                },
                {
                    category: 'fix',
                    title: { en: 'Daily Claim Feedback', zh: '每日領取反饋', th: 'ฟีดแบ็กรับรายวัน' },
                    desc: { 
                        en: 'Added toast notifications and disabled state for already claimed rewards',
                        zh: '添加了吐司通知和已領取獎勵的禁用狀態',
                        th: 'เพิ่มการแจ้งเตือนและสถานะปิดสำหรับรางวัลที่รับแล้ว'
                    },
                    icon: ''
                }
            ]
        },
        {
            version: '2.1.0',
            date: '2026-02-02',
            title: { 
                en: 'The Absurdist Update', 
                zh: '荒誕大更新', 
                th: 'อัปเดตความไร้สาระ' 
            },
            type: 'major',
            changes: [
                {
                    category: 'new',
                    title: { en: 'Guild Supreme Court', zh: '公會最高法院', th: 'ศาลสูงสุดกิลด์' },
                    desc: { 
                        en: 'Sue your guildmates! 10 crime categories, email verdicts, 3% appeal success rate',
                        zh: '告你的隊友！10種罪名、郵件判決書、3%上訴成功率',
                        th: 'ฟ้องเพื่อนกิลด์! 10 หมวดหมู่อาชญากรรม อีเมลคำตัดสิน อัตราอุทธรณ์สำเร็จ 3%'
                    },
                    icon: '',
                    path: '/court'
                },
                {
                    category: 'new',
                    title: { en: 'Guild Therapy', zh: '公會療程', th: 'การบำบัดกิลด์' },
                    desc: { 
                        en: 'AI therapist Dr. NumbahWan diagnoses your gaming trauma',
                        zh: 'AI治療師NumbahWan醫生診斷你的遊戲創傷',
                        th: 'นักบำบัด AI Dr. NumbahWan วินิจฉัยบาดแผลทางเกมของคุณ'
                    },
                    icon: '',
                    path: '/therapy'
                },
                {
                    category: 'new',
                    title: { en: 'HR Department', zh: '人力資源部', th: 'ฝ่ายบุคคล' },
                    desc: { 
                        en: '8 absurd job positions, 100% rejection rate guaranteed!',
                        zh: '8個荒謬職位，100%拒絕率保證！',
                        th: '8 ตำแหน่งงานไร้สาระ รับประกันอัตราปฏิเสธ 100%!'
                    },
                    icon: '',
                    path: '/hr'
                },
                {
                    category: 'new',
                    title: { en: 'Conspiracy Board', zh: '陰謀論板', th: 'บอร์ดสมคบคิด' },
                    desc: { 
                        en: 'Cork board evidence system, connect the dots, uncover guild secrets',
                        zh: '軟木板證據系統，連接線索，揭露公會秘密',
                        th: 'ระบบหลักฐานกระดานคอร์ก เชื่อมจุด เปิดโปงความลับกิลด์'
                    },
                    icon: '',
                    path: '/conspiracy'
                },
                {
                    category: 'feature',
                    title: { en: 'Auto-Update System', zh: '自動更新系統', th: 'ระบบอัปเดตอัตโนมัติ' },
                    desc: { 
                        en: 'Central config now propagates changes across entire site',
                        zh: '中央配置現在可在整個網站傳播更新',
                        th: 'การกำหนดค่าส่วนกลางตอนนี้เผยแพร่การเปลี่ยนแปลงทั่วทั้งเว็บไซต์'
                    },
                    icon: ''
                },
                {
                    category: 'balance',
                    title: { en: 'Economy Auto-Balancer', zh: '經濟自動平衡器', th: 'ตัวปรับสมดุลเศรษฐกิจอัตโนมัติ' },
                    desc: { 
                        en: 'System now monitors and auto-adjusts pricing to prevent inflation',
                        zh: '系統現在監控並自動調整定價以防止通貨膨脹',
                        th: 'ระบบตอนนี้ตรวจสอบและปรับราคาอัตโนมัติเพื่อป้องกันเงินเฟ้อ'
                    },
                    icon: ''
                }
            ]
        },
        {
            version: '2.0.0',
            date: '2026-01-28',
            title: { 
                en: 'The Economy Update', 
                zh: '經濟大更新', 
                th: 'อัปเดตเศรษฐกิจ' 
            },
            type: 'major',
            changes: [
                {
                    category: 'new',
                    title: { en: 'Unified Wallet System', zh: '統一錢包系統', th: 'ระบบกระเป๋าเงินรวม' },
                    desc: { en: 'One wallet across all pages', zh: '所有頁面共用錢包', th: 'กระเป๋าเงินเดียวทุกหน้า' },
                    icon: ''
                },
                {
                    category: 'new',
                    title: { en: 'Daily Login Rewards', zh: '每日登入獎勵', th: 'รางวัลล็อกอินรายวัน' },
                    desc: { en: '7-day reward cycle with Sacred Log on Day 7', zh: '7天獎勵週期，第7天送神聖原木', th: 'รอบรางวัล 7 วัน มี Sacred Log วันที่ 7' },
                    icon: ''
                },
                {
                    category: 'new',
                    title: { en: 'Achievement System', zh: '成就系統', th: 'ระบบความสำเร็จ' },
                    desc: { en: '50+ achievements to unlock', zh: '50+個成就等你解鎖', th: '50+ ความสำเร็จให้ปลดล็อก' },
                    icon: ''
                },
                {
                    category: 'feature',
                    title: { en: 'GM Testing Mode', zh: 'GM測試模式', th: 'โหมดทดสอบ GM' },
                    desc: { en: 'Infinite resources for testing', zh: '無限資源供測試', th: 'ทรัพยากรไม่จำกัดสำหรับการทดสอบ' },
                    icon: ''
                }
            ]
        },
        {
            version: '1.5.0',
            date: '2026-01-20',
            title: { 
                en: 'The Content Expansion', 
                zh: '內容擴展', 
                th: 'การขยายเนื้อหา' 
            },
            type: 'minor',
            changes: [
                {
                    category: 'new',
                    title: { en: 'AI Chat Guide', zh: 'AI聊天嚮導', th: 'ไกด์แชท AI' },
                    desc: { en: 'Floating assistant on all pages', zh: '所有頁面的浮動助手', th: 'ผู้ช่วยลอยตัวในทุกหน้า' },
                    icon: ''
                },
                {
                    category: 'new',
                    title: { en: 'Sound Effects', zh: '音效系統', th: 'ระบบเสียง' },
                    desc: { en: 'Immersive audio feedback', zh: '沉浸式音效回饋', th: 'เสียงตอบรับแบบดื่มด่ำ' },
                    icon: ''
                },
                {
                    category: 'feature',
                    title: { en: 'i18n Support', zh: '多語言支援', th: 'รองรับหลายภาษา' },
                    desc: { en: 'EN/ZH/TH across all pages', zh: '所有頁面支援英/中/泰', th: 'EN/ZH/TH ทุกหน้า' },
                    icon: ''
                }
            ]
        },
        {
            version: '1.0.0',
            date: '2026-01-15',
            title: { 
                en: 'Launch Day', 
                zh: '正式上線', 
                th: 'วันเปิดตัว' 
            },
            type: 'major',
            changes: [
                {
                    category: 'new',
                    title: { en: 'NumbahWan Guild Website', zh: 'NumbahWan公會網站', th: 'เว็บไซต์กิลด์ NumbahWan' },
                    desc: { en: 'The beginning of something beautiful', zh: '美好的開始', th: 'จุดเริ่มต้นของสิ่งที่สวยงาม' },
                    icon: ''
                }
            ]
        }
    ],

    // ═══════════════════════════════════════════════════════════════
    // PAGES REGISTRY - All site pages for AI Guide & navigation
    // ═══════════════════════════════════════════════════════════════
    pages: {
        // Core pages
        home: { path: '/', emoji: '', category: 'core',
            name: { en: 'Home', zh: '首頁', th: 'หน้าแรก' },
            desc: { en: 'Guild headquarters', zh: '公會總部', th: 'สำนักงานใหญ่กิลด์' },
            keywords: { en: ['home', 'main', 'start'], zh: ['首頁', '主頁'], th: ['หน้าแรก', 'บ้าน'] }
        },
        academy: { path: '/academy', emoji: '', category: 'core',
            name: { en: 'Academy', zh: '學院', th: 'สถาบัน' },
            desc: { en: 'Training grounds & schedule', zh: '訓練場和行程', th: 'สนามฝึกและตาราง' },
            keywords: { en: ['academy', 'train', 'schedule'], zh: ['學院', '訓練'], th: ['สถาบัน', 'ฝึก'] }
        },
        exchange: { path: '/exchange', emoji: '', category: 'economy',
            name: { en: 'NWX Exchange', zh: 'NWX交易所', th: 'NWX Exchange' },
            desc: { en: 'Parody stock market', zh: '惡搞股市', th: 'ตลาดหุ้นล้อเลียน' },
            keywords: { en: ['exchange', 'stock', 'trade'], zh: ['交易', '股票'], th: ['แลกเปลี่ยน', 'หุ้น'] }
        },
        museum: { path: '/museum', emoji: '', category: 'core',
            name: { en: 'Museum', zh: '博物館', th: 'พิพิธภัณฑ์' },
            desc: { en: 'Guild history & artifacts', zh: '公會歷史與文物', th: 'ประวัติและสิ่งประดิษฐ์' },
            keywords: { en: ['museum', 'history', 'artifact'], zh: ['博物館', '歷史'], th: ['พิพิธภัณฑ์'] }
        },
        vault: { path: '/vault', emoji: '', category: 'core',
            name: { en: 'Vault', zh: '金庫', th: 'ห้องนิรภัย' },
            desc: { en: 'Treasure storage', zh: '寶藏儲存', th: 'เก็บสมบัติ' },
            keywords: { en: ['vault', 'treasure', 'secure'], zh: ['金庫', '寶藏'], th: ['ห้องนิรภัย'] }
        },
        tcg: { path: '/tcg', emoji: '🃏', category: 'game',
            name: { en: 'Card Game', zh: '卡牌遊戲', th: 'เกมการ์ด' },
            desc: { en: 'Collect & battle cards', zh: '收集並戰鬥卡牌', th: 'สะสมและต่อสู้การ์ด' },
            keywords: { en: ['card', 'tcg', 'battle'], zh: ['卡', '遊戲'], th: ['การ์ด', 'เกม'] }
        },
        market: { path: '/market', emoji: '', category: 'economy',
            name: { en: 'Market', zh: '市場', th: 'ตลาด' },
            desc: { en: 'Buy & sell cards', zh: '買賣卡牌', th: 'ซื้อขายการ์ด' },
            keywords: { en: ['market', 'buy', 'sell'], zh: ['市場', '買', '賣'], th: ['ตลาด', 'ซื้อ', 'ขาย'] }
        },
        forge: { path: '/forge', emoji: '', category: 'game',
            name: { en: 'Forge', zh: '鍛造', th: 'โรงตีเหล็ก' },
            desc: { en: 'Pull cards with Sacred Logs', zh: '用神聖原木抽卡', th: 'สุ่มการ์ดด้วย Sacred Logs' },
            keywords: { en: ['forge', 'craft', 'pull'], zh: ['鍛造', '抽'], th: ['โรงตี', 'สุ่ม'] }
        },
        arcade: { path: '/arcade', emoji: '', category: 'game',
            name: { en: 'Arcade', zh: '遊樂場', th: 'อาร์เคด' },
            desc: { en: 'Mini-games for currencies', zh: '小遊戲賺貨幣', th: 'มินิเกมรับสกุลเงิน' },
            keywords: { en: ['arcade', 'game', 'play'], zh: ['遊樂', '玩'], th: ['อาร์เคด', 'เล่น'] }
        },
        merch: { path: '/merch', emoji: '', category: 'economy',
            name: { en: 'Merch', zh: '商品', th: 'สินค้า' },
            desc: { en: 'Guild merchandise', zh: '公會周邊', th: 'สินค้ากิลด์' },
            keywords: { en: ['merch', 'shop', 'store'], zh: ['商品', '周邊'], th: ['สินค้า'] }
        },
        wallet: { path: '/wallet', emoji: '', category: 'economy',
            name: { en: 'Wallet', zh: '錢包', th: 'กระเป๋าเงิน' },
            desc: { en: 'Manage currencies', zh: '管理貨幣', th: 'จัดการสกุลเงิน' },
            keywords: { en: ['wallet', 'money', 'currency'], zh: ['錢包', '貨幣'], th: ['กระเป๋า'] }
        },
        memes: { path: '/memes', emoji: '', category: 'fun',
            name: { en: 'Memes', zh: '迷因', th: 'มีม' },
            desc: { en: 'Guild meme collection', zh: '公會迷因', th: 'คอลเลกชันมีม' },
            keywords: { en: ['meme', 'funny'], zh: ['迷因'], th: ['มีม'] }
        },
        fortune: { path: '/fortune', emoji: '', category: 'fun',
            name: { en: 'Fortune', zh: '占卜', th: 'ดวง' },
            desc: { en: 'Daily fortune readings', zh: '每日運勢', th: 'ดูดวงประจำวัน' },
            keywords: { en: ['fortune', 'luck'], zh: ['占卜', '運勢'], th: ['ดวง'] }
        },
        apply: { path: '/apply', emoji: '', category: 'core',
            name: { en: 'Apply', zh: '申請', th: 'สมัคร' },
            desc: { en: 'Join the guild', zh: '加入公會', th: 'เข้าร่วมกิลด์' },
            keywords: { en: ['apply', 'join'], zh: ['申請', '加入'], th: ['สมัคร'] }
        },
        // Absurdist pages
        court: { path: '/court', emoji: '', category: 'absurdist',
            name: { en: 'Supreme Court', zh: '最高法院', th: 'ศาลสูงสุด' },
            desc: { en: 'File complaints, deliver verdicts', zh: '提交訴狀、宣判', th: 'ยื่นคำร้อง ตัดสิน' },
            keywords: { en: ['court', 'sue', 'complaint', 'verdict', 'judge'], zh: ['法院', '訴', '告', '判'], th: ['ศาล', 'ฟ้อง', 'ตัดสิน'] },
            tips: {
                en: ['File complaints for 5, win to earn 25!', 'Appeal costs 10with 3% success rate '],
                zh: ['提交訴狀5，勝訴獲25！', '上訴需10，只有3%成功率 '],
                th: ['ยื่นคำร้อง 5ชนะได้ 25!', 'อุทธรณ์ 10สำเร็จแค่ 3% ']
            }
        },
        therapy: { path: '/therapy', emoji: '', category: 'absurdist',
            name: { en: 'Guild Therapy', zh: '公會療程', th: 'การบำบัดกิลด์' },
            desc: { en: 'AI therapist for gaming trauma', zh: 'AI治療師幫助遊戲創傷', th: 'นักบำบัด AI สำหรับบาดแผลเกม' },
            keywords: { en: ['therapy', 'therapist', 'mental', 'counsel'], zh: ['療', '心理', '治療'], th: ['บำบัด', 'จิต', 'ปรึกษา'] },
            tips: {
                en: ['Complete session to earn 3!', 'Get diagnosed with Gacha Pull Depression '],
                zh: ['完成療程獲3！', '被診斷為抽卡憂鬱症 '],
                th: ['ทำเซสชันเสร็จรับ 3!', 'วินิจฉัยว่าเป็น Gacha Pull Depression ']
            }
        },
        hr: { path: '/hr', emoji: '', category: 'absurdist',
            name: { en: 'HR Department', zh: '人力資源部', th: 'ฝ่ายบุคคล' },
            desc: { en: 'Absurd positions, 100% rejection', zh: '荒謬職位，100%被拒', th: 'ตำแหน่งไร้สาระ ปฏิเสธ 100%' },
            keywords: { en: ['hr', 'job', 'hire', 'position', 'banana officer'], zh: ['人力', '工作', '職位'], th: ['บุคคล', 'งาน', 'สมัคร'] },
            tips: {
                en: ['Apply for Chief Banana Officer! ', 'Application 5, consolation: 10'],
                zh: ['申請首席香蕉官！', '申請費5，安慰獎：10'],
                th: ['สมัคร Chief Banana Officer! ', 'สมัคร 5ปลอบใจ: 10']
            }
        },
        conspiracy: { path: '/conspiracy', emoji: '', category: 'absurdist',
            name: { en: 'Conspiracy Board', zh: '陰謀論板', th: 'บอร์ดสมคบคิด' },
            desc: { en: 'Connect dots, uncover secrets', zh: '連接線索、揭露秘密', th: 'เชื่อมจุด เปิดโปงความลับ' },
            keywords: { en: ['conspiracy', 'theory', 'secret', 'illuminati', 'evidence'], zh: ['陰謀', '秘密', '理論'], th: ['สมคบ', 'ความลับ', 'ทฤษฎี'] },
            tips: {
                en: ['Drag evidence to connect dots!', 'Submit theories 2, truth seekers earn 15'],
                zh: ['拖動證據連接線索！', '提交理論2，揭密者獲15'],
                th: ['ลากหลักฐานเชื่อมจุด!', 'ส่งทฤษฎี 2นักแสวงหาความจริงได้ 15']
            }
        },
        updates: { path: '/updates', emoji: '', category: 'meta',
            name: { en: 'Patch Notes', zh: '更新日誌', th: 'บันทึกแพทช์' },
            desc: { en: 'Version history & changes', zh: '版本歷史和更改', th: 'ประวัติเวอร์ชันและการเปลี่ยนแปลง' },
            keywords: { en: ['updates', 'patch', 'notes', 'changelog'], zh: ['更新', '日誌', '版本'], th: ['อัปเดต', 'แพทช์', 'บันทึก'] }
        },
        about: { path: '/about', emoji: '', category: 'meta',
            name: { en: 'About Us', zh: '關於我們', th: 'เกี่ยวกับเรา' },
            desc: { en: 'Meet the team & guild lore', zh: '認識團隊和公會傳說', th: 'พบทีมและตำนานกิลด์' },
            keywords: { en: ['about', 'team', 'lore', 'story'], zh: ['關於', '團隊', '故事'], th: ['เกี่ยวกับ', 'ทีม', 'เรื่องราว'] }
        },
        // Avatar & Creative Tools
        avatarStudio: { path: '/avatar-studio', emoji: '', category: 'creative',
            name: { en: 'Avatar Studio', zh: '頭像工作室', th: 'สตูดิโออวาตาร์' },
            desc: { en: 'Generate AI maple avatars from your screenshots', zh: '從截圖生成AI楓之谷頭像', th: 'สร้างอวาตาร์เมเปิ้ลจากภาพหน้าจอของคุณ' },
            keywords: { en: ['avatar', 'studio', 'photo', 'generate', 'ai', 'pose', 'screenshot'], zh: ['頭像', '工作室', '照片', '生成'], th: ['อวาตาร์', 'สตูดิโอ', 'รูป', 'สร้าง'] },
            tips: {
                en: ['Upload a clear MapleStory screenshot!', '8 poses: Hero, Cute, Cool, Victory, Magic, Action, AFK, Party', 'Best results: full-body, centered, bright background', 'Download HD PNG or share to Discord!'],
                zh: ['上傳清晰的楓之谷截圖！', '8種姿勢：英雄、可愛、酷炫、勝利、魔法、動作、AFK、派對', '最佳效果：全身、居中、明亮背景', '下載高清PNG或分享到Discord！'],
                th: ['อัปโหลดภาพหน้าจอ MapleStory ที่ชัดเจน!', '8 โพส: ฮีโร่, น่ารัก, คูล, ชนะ, เวทมนตร์, แอคชั่น, AFK, ปาร์ตี้', 'ผลลัพธ์ดีที่สุด: เต็มตัว ตรงกลาง พื้นหลังสว่าง', 'ดาวน์โหลด HD PNG หรือแชร์ไป Discord!']
            }
        },
        confessional: { path: '/confessional', emoji: '', category: 'fun',
            name: { en: 'Confessional', zh: '告解室', th: 'ห้องสารภาพ' },
            desc: { en: 'Anonymous guild confessions', zh: '匿名公會告解', th: 'คำสารภาพกิลด์แบบไม่ระบุตัวตน' },
            keywords: { en: ['confess', 'confession', 'anonymous', 'secret'], zh: ['告解', '匿名', '秘密'], th: ['สารภาพ', 'ไม่ระบุตัวตน', 'ความลับ'] },
            tips: {
                en: ['Submit anonymous confessions!', 'Vote on the juiciest guild secrets ', 'All confessions are anonymous... or are they? '],
                zh: ['提交匿名告解！', '為最勁爆的公會秘密投票 ', '所有告解都是匿名的...還是？'],
                th: ['ส่งคำสารภาพแบบไม่ระบุตัวตน!', 'โหวตความลับกิลด์ที่น่าสนใจที่สุด ', 'คำสารภาพทั้งหมดไม่ระบุตัวตน... หรือเปล่า? ']
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ECONOMY SETTINGS - Central pricing that auto-propagates
    // ═══════════════════════════════════════════════════════════════
    economy: {
        // Currency starting amounts
        startingBalance: {
            diamond: 500,
            gold: 100,
            iron: 50,
            stone: 25,
            wood: 0
        },
        
        // Daily login rewards (7-day cycle)
        dailyRewards: [
            { day: 1, stone: 10, gold: 5 },
            { day: 2, stone: 15, gold: 8, iron: 2 },
            { day: 3, stone: 20, gold: 12, iron: 5, diamond: 1 },
            { day: 4, stone: 30, gold: 20, iron: 8, diamond: 3 },
            { day: 5, stone: 40, gold: 30, iron: 12, diamond: 5 },
            { day: 6, stone: 50, gold: 40, iron: 15, diamond: 8 },
            { day: 7, stone: 100, gold: 75, iron: 25, diamond: 15, wood: 1 }
        ],
        
        // Page costs - SINGLE SOURCE OF TRUTH
        costs: {
            // Court
            courtFileSuit: { diamond: 5 },
            courtAppeal: { diamond: 10 },
            courtWinReward: { gold: 25 },
            courtAppealSuccessRate: 0.03,
            
            // Therapy
            therapySession: { diamond: 0 },
            therapyReward: { diamond: 3 },
            
            // HR
            hrApplication: { diamond: 5 },
            hrConsolation: { gold: 10 },
            hrRejectionRate: 1.0,
            
            // Conspiracy
            conspiracyTheory: { diamond: 2 },
            conspiracyReward: { gold: 15 },
            
            // Forge
            forgeSinglePull: { diamond: 10 },
            forgeMultiPull: { diamond: 90 },
            forgeGuaranteedRare: { diamond: 50 },
            
            // Market
            marketListingFee: { gold: 10 },
            marketSalesTax: 0.05,
            
            // Fortune
            fortuneReading: { gold: 5 },
            
            // First visit bonus
            firstVisitBonus: { diamond: 10 }
        },
        
        // Exchange rates
        exchangeRates: {
            diamondToGold: 10,
            goldToIron: 2,
            ironToStone: 2,
            stoneToGold: 0.05,
            stoneToIron: 0.04
        },
        
        // Balance thresholds for auto-balancer
        balanceRules: {
            maxInflationRate: 0.15,
            minCurrencyValue: 0.5,
            maxDailyEarnings: {
                diamond: 50,
                gold: 500,
                iron: 200,
                stone: 1000
            },
            rebalanceThreshold: 0.20
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // TEAM / ABOUT DATA
    // ═══════════════════════════════════════════════════════════════
    team: [
        {
            id: 'reggina',
            name: 'Reggina',
            role: { en: 'Guild Master', zh: '會長', th: 'หัวหน้ากิลด์' },
            title: { en: 'The Banana Overlord', zh: '香蕉霸主', th: 'จ้าวกล้วย' },
            avatar: '/static/avatar-reggina-master-masked-warrior.webp',
            quote: { 
                en: '"If you\'re not first, you\'re NumbahTwo."', 
                zh: '"如果你不是第一，你就是第二。"', 
                th: '"ถ้าคุณไม่ใช่ที่หนึ่ง คุณก็คือที่สอง"' 
            },
            funFacts: {
                en: ['Has never lost a 1v1 (claims)', 'Eats bananas during boss fights', 'Created the guild while AFK'],
                zh: ['從未輸過1v1（自稱）', '打BOSS時吃香蕉', 'AFK時創建了公會'],
                th: ['ไม่เคยแพ้ 1v1 (อ้าง)', 'กินกล้วยตอนตีบอส', 'สร้างกิลด์ตอน AFK']
            }
        },
        {
            id: 'reggino',
            name: 'Reggino',
            role: { en: 'Vice Master', zh: '副會長', th: 'รองหัวหน้า' },
            title: { en: 'The Pink Menace', zh: '粉紅威脅', th: 'ภัยสีชมพู' },
            avatar: '/static/avatar-reggino-vicemaster-pinkhair.webp',
            quote: { 
                en: '"I\'m not angry, I\'m just disappointed... aggressively."', 
                zh: '"我不是生氣，我只是...激進地失望。"', 
                th: '"ฉันไม่โกรธ แค่ผิดหวัง...อย่างรุนแรง"' 
            }
        },
        {
            id: 'dr-numbahwan',
            name: 'Dr. NumbahWan',
            role: { en: 'Guild Therapist', zh: '公會治療師', th: 'นักบำบัดกิลด์' },
            title: { en: 'AI with Questionable Credentials', zh: '資歷可疑的AI', th: 'AI ที่มีคุณสมบัติน่าสงสัย' },
            avatar: '/static/images/about/dr-numbahwan.webp',
            quote: { 
                en: '"Your gacha trauma is valid. That\'ll be 3 diamonds."', 
                zh: '"你的抽卡創傷是合理的。收費3鑽石。"', 
                th: '"บาดแผลจากกาชาของคุณถูกต้อง จ่าย 3 เพชร"' 
            }
        },
        {
            id: 'judge-banana',
            name: 'Judge Banana',
            role: { en: 'Chief Justice', zh: '首席法官', th: 'หัวหน้าผู้พิพากษา' },
            title: { en: 'The Slippery Verdict', zh: '滑溜的判決', th: 'คำตัดสินที่ลื่น' },
            avatar: '/static/images/about/judge-banana.webp',
            quote: { 
                en: '"Order in the court! ...Actually, chaos is more fun."', 
                zh: '"法庭秩序！...其實混亂更好玩。"', 
                th: '"ความสงบในศาล! ...จริงๆ ความวุ่นวายสนุกกว่า"' 
            }
        },
        {
            id: 'hr-karen',
            name: 'HR Karen',
            role: { en: 'HR Director', zh: '人力資源總監', th: 'ผู้อำนวยการฝ่ายบุคคล' },
            title: { en: 'Professional Dream Crusher', zh: '專業夢想粉碎機', th: 'นักบดขยี้ความฝันมืออาชีพ' },
            avatar: '/static/images/about/hr-karen.webp',
            quote: { 
                en: '"We\'ll keep your resume on file. In the trash."', 
                zh: '"我們會保留你的履歷。在垃圾桶裡。"', 
                th: '"เราจะเก็บเรซูเม่ของคุณไว้ ในถังขยะ"' 
            }
        },
        {
            id: 'agent-tinfoil',
            name: 'Agent Tinfoil',
            role: { en: 'Chief Conspiracy Officer', zh: '首席陰謀官', th: 'หัวหน้าเจ้าหน้าที่สมคบคิด' },
            title: { en: 'They Know What He Knows', zh: '他們知道他知道什麼', th: 'พวกเขารู้ในสิ่งที่เขารู้' },
            avatar: '/static/images/about/agent-tinfoil.webp',
            quote: { 
                en: '"The banana patch is a lie. WAKE UP SHEEPLE!"', 
                zh: '"香蕉園是謊言。醒醒吧，愚民！"', 
                th: '"สวนกล้วยเป็นเรื่องโกหก ตื่นได้แล้ว!"' 
            }
        }
    ],

    // ═══════════════════════════════════════════════════════════════
    // GUILD LORE
    // ═══════════════════════════════════════════════════════════════
    lore: {
        foundingDate: '2023-07-15',
        origin: {
            en: 'Founded in the mystical realm of MapleStory, NumbahWan emerged from the ashes of a failed Zakum raid at 3AM. Legend says the guild master was eating a banana when inspiration struck.',
            zh: '創立於楓之谷的神秘領域，NumbahWan從凌晨3點失敗的乙乙隊攻中浴火重生。傳說會長在吃香蕉時靈感乍現。',
            th: 'ก่อตั้งในดินแดนลึกลับของ MapleStory NumbahWan เกิดจากซากของการเรด Zakum ที่ล้มเหลวตอนตี 3 ตำนานเล่าว่าหัวหน้ากิลด์กำลังกินกล้วยตอนที่ได้แรงบันดาลใจ'
        },
        motto: {
            en: 'If you ain\'t first, you\'re NumbahTwo',
            zh: '不是第一，就是第二',
            th: 'ถ้าไม่ใช่ที่หนึ่ง ก็คือที่สอง'
        },
        sacredItems: [
            {
                name: { en: 'The Sacred Log', zh: '神聖原木', th: 'ท่อนไม้ศักดิ์สิทธิ์' },
                desc: { 
                    en: 'A mystical piece of wood that grants the power to summon legendary cards. Its origins are unknown, but it smells faintly of banana.',
                    zh: '一塊神秘的木頭，賦予召喚傳說卡牌的力量。來源不明，但隱約有香蕉味。',
                    th: 'ไม้ลึกลับที่ให้พลังเรียกการ์ดตำนาน ไม่ทราบที่มา แต่มีกลิ่นกล้วยจางๆ'
                },
                emoji: '⧫'
            },
            {
                name: { en: 'The Golden Banana', zh: '黃金香蕉', th: 'กล้วยทอง' },
                desc: { 
                    en: 'Awarded to the guild member with the most dedications. Currently missing. Reward for return: 1000 diamonds.',
                    zh: '頒發給最有奉獻精神的公會成員。目前失蹤。歸還獎勵：1000鑽石。',
                    th: 'มอบให้สมาชิกกิลด์ที่ทุ่มเทที่สุด ปัจจุบันหายไป รางวัลคืน: 1000 เพชร'
                },
                emoji: ''
            }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════
    
    // Get localized text
    t(obj, lang = null) {
        const l = lang || this.getCurrentLang();
        return obj?.[l] || obj?.en || obj || '';
    },
    
    // Get current language
    getCurrentLang() {
        return localStorage.getItem('nw_lang') || 'en';
    },
    
    // Get page info
    getPage(key) {
        const page = this.pages[key];
        if (!page) return null;
        const lang = this.getCurrentLang();
        return {
            ...page,
            name: this.t(page.name, lang),
            desc: this.t(page.desc, lang),
            keywords: page.keywords?.[lang] || page.keywords?.en || [],
            tips: page.tips?.[lang] || page.tips?.en || []
        };
    },
    
    // Get all pages
    getAllPages(category = null) {
        return Object.entries(this.pages)
            .filter(([_, p]) => !category || p.category === category)
            .map(([key, _]) => ({ key, ...this.getPage(key) }));
    },
    
    // Get cost
    getCost(key) {
        return this.economy.costs[key] || {};
    },
    
    // Get latest patch
    getLatestPatch() {
        return this.patches[0];
    },
    
    // Get all patches
    getAllPatches() {
        return this.patches;
    },
    
    // Check if economy needs rebalancing
    checkBalance(playerStats) {
        const rules = this.economy.balanceRules;
        const warnings = [];
        
        // Check daily earnings against max
        for (const [currency, max] of Object.entries(rules.maxDailyEarnings)) {
            if (playerStats?.dailyEarnings?.[currency] > max) {
                warnings.push({
                    type: 'over_earning',
                    currency,
                    current: playerStats.dailyEarnings[currency],
                    max,
                    suggestion: `Reduce ${currency} earn rate by ${Math.round((playerStats.dailyEarnings[currency] / max - 1) * 100)}%`
                });
            }
        }
        
        return warnings;
    },
    
    // Fire update event
    notifyUpdate(type, data) {
        window.dispatchEvent(new CustomEvent('nw-config-update', { 
            detail: { type, data, version: this.version, timestamp: Date.now() } 
        }));
    }
};

// Make globally available
window.NW_CONFIG = NW_CONFIG;

// Auto-notify on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        NW_CONFIG.notifyUpdate('init', { version: NW_CONFIG.version });
    });
}

console.log(`%c[NW_CONFIG] v${NW_CONFIG.version} loaded - Single Source of Truth`, 
    'background: #1a1a2e; color: #00ff88; font-size: 12px; padding: 4px 8px; border-radius: 4px;');
