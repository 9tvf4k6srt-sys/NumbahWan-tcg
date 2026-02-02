/**
 * NumbahWan AI Guide v2.0
 * Multi-language floating assistant for site navigation
 * Supports: English, 繁體中文, ภาษาไทย
 */

(function() {
    'use strict';

    // Current language - syncs with site language setting
    let currentLang = localStorage.getItem('numbahwan_lang') || 'en';

    // ==================== TRANSLATIONS ====================
    const i18n = {
        // Page names and descriptions
        pages: {
            home: {
                en: { name: 'Home', desc: 'Guild headquarters - start your journey here' },
                zh: { name: '首頁', desc: '公會總部 - 從這裡開始你的旅程' },
                th: { name: 'หน้าแรก', desc: 'สำนักงานใหญ่กิลด์ - เริ่มต้นการเดินทางที่นี่' }
            },
            academy: {
                en: { name: 'Academy', desc: 'Training grounds & daily schedule' },
                zh: { name: '學院', desc: '訓練場和每日行程' },
                th: { name: 'สถาบัน', desc: 'สนามฝึกและตารางประจำวัน' }
            },
            exchange: {
                en: { name: 'NWX Exchange', desc: 'Parody stock market - trade guild assets!' },
                zh: { name: 'NWX 交易所', desc: '惡搞股市 - 交易公會資產！' },
                th: { name: 'NWX Exchange', desc: 'ตลาดหุ้นล้อเลียน - ซื้อขายสินทรัพย์กิลด์!' }
            },
            museum: {
                en: { name: 'Museum', desc: 'Guild history & legendary artifacts' },
                zh: { name: '博物館', desc: '公會歷史與傳奇文物' },
                th: { name: 'พิพิธภัณฑ์', desc: 'ประวัติกิลด์และสิ่งประดิษฐ์ในตำนาน' }
            },
            vault: {
                en: { name: 'Vault', desc: 'Secure storage for valuable treasures' },
                zh: { name: '金庫', desc: '珍貴寶藏的安全儲存' },
                th: { name: 'ห้องนิรภัย', desc: 'ที่เก็บสมบัติล้ำค่าอย่างปลอดภัย' }
            },
            tcg: {
                en: { name: 'Card Game', desc: 'Collect and battle with guild member cards' },
                zh: { name: '卡牌遊戲', desc: '收集並使用公會成員卡戰鬥' },
                th: { name: 'เกมการ์ด', desc: 'สะสมและต่อสู้ด้วยการ์ดสมาชิกกิลด์' }
            },
            market: {
                en: { name: 'Market', desc: 'Buy & sell cards in the trading market' },
                zh: { name: '市場', desc: '在交易市場買賣卡牌' },
                th: { name: 'ตลาด', desc: 'ซื้อขายการ์ดในตลาดซื้อขาย' }
            },
            forge: {
                en: { name: 'Forge', desc: 'Pull cards with Sacred Logs!' },
                zh: { name: '鍛造', desc: '用神聖原木抽卡！' },
                th: { name: 'โรงตีเหล็ก', desc: 'สุ่มการ์ดด้วย Sacred Logs!' }
            },
            arcade: {
                en: { name: 'Arcade', desc: 'Mini-games to earn currencies' },
                zh: { name: '遊樂場', desc: '小遊戲賺取貨幣' },
                th: { name: 'อาร์เคด', desc: 'มินิเกมเพื่อรับสกุลเงิน' }
            },
            merch: {
                en: { name: 'Merch', desc: 'Guild merchandise store' },
                zh: { name: '商品', desc: '公會周邊商品店' },
                th: { name: 'สินค้า', desc: 'ร้านสินค้ากิลด์' }
            },
            wallet: {
                en: { name: 'Wallet', desc: 'Manage your in-game currencies' },
                zh: { name: '錢包', desc: '管理你的遊戲貨幣' },
                th: { name: 'กระเป๋าเงิน', desc: 'จัดการสกุลเงินในเกมของคุณ' }
            },
            memes: {
                en: { name: 'Memes', desc: 'Guild meme collection' },
                zh: { name: '迷因', desc: '公會迷因收藏' },
                th: { name: 'มีม', desc: 'คอลเลกชันมีมกิลด์' }
            },
            fortune: {
                en: { name: 'Fortune', desc: 'Daily fortune readings' },
                zh: { name: '占卜', desc: '每日運勢預測' },
                th: { name: 'ดวง', desc: 'ดูดวงประจำวัน' }
            },
            apply: {
                en: { name: 'Apply', desc: 'Join the guild - apply here!' },
                zh: { name: '申請', desc: '加入公會 - 在此申請！' },
                th: { name: 'สมัคร', desc: 'เข้าร่วมกิลด์ - สมัครที่นี่!' }
            },
            // === NEW ABSURDIST PAGES ===
            court: {
                en: { name: 'Supreme Court', desc: 'File complaints, deliver verdicts, appeal rulings!' },
                zh: { name: '最高法院', desc: '提交訴狀、宣判、上訴！' },
                th: { name: 'ศาลสูงสุด', desc: 'ยื่นคำร้อง ตัดสิน อุทธรณ์!' }
            },
            therapy: {
                en: { name: 'Guild Therapy', desc: 'AI therapist for your gaming trauma' },
                zh: { name: '公會療程', desc: 'AI治療師幫助你的遊戲創傷' },
                th: { name: 'การบำบัดกิลด์', desc: 'นักบำบัด AI สำหรับบาดแผลทางเกม' }
            },
            hr: {
                en: { name: 'HR Department', desc: 'Apply for absurd positions (100% rejection rate!)' },
                zh: { name: '人力資源部', desc: '申請荒謬職位（100%被拒！）' },
                th: { name: 'ฝ่ายบุคคล', desc: 'สมัครตำแหน่งไร้สาระ (อัตราปฏิเสธ 100%!)' }
            },
            conspiracy: {
                en: { name: 'Conspiracy Board', desc: 'Pin evidence, connect the dots, uncover guild secrets' },
                zh: { name: '陰謀論板', desc: '釘上證據、連接線索、揭露公會秘密' },
                th: { name: 'บอร์ดสมคบคิด', desc: 'ปักหลักฐาน เชื่อมจุด เปิดโปงความลับกิลด์' }
            }
        },

        // UI strings
        ui: {
            en: {
                title: 'NumbahWan Guide',
                online: '● Online - Here to help!',
                placeholder: 'Ask me anything...',
                goTo: 'Go to'
            },
            zh: {
                title: 'NumbahWan 嚮導',
                online: '● 在線 - 隨時為您服務！',
                placeholder: '問我任何問題...',
                goTo: '前往'
            },
            th: {
                title: 'ไกด์ NumbahWan',
                online: '● ออนไลน์ - พร้อมช่วยเหลือ!',
                placeholder: 'ถามอะไรก็ได้...',
                goTo: 'ไปที่'
            }
        },

        // Greetings
        greetings: {
            en: [
                "Hey there, adventurer! 👋",
                "Yo! Need directions? I got you 🗺️",
                "What's up! Looking for something? 🔍",
                "Greetings, traveler! 🎮"
            ],
            zh: [
                "嘿，冒險者！👋",
                "喲！需要指路嗎？交給我 🗺️",
                "嗨！在找什麼嗎？🔍",
                "你好，旅人！🎮"
            ],
            th: [
                "สวัสดี นักผจญภัย! 👋",
                "โย่! ต้องการทิศทางไหม? 🗺️",
                "ว่าไง! หาอะไรอยู่? 🔍",
                "ยินดีต้อนรับ นักเดินทาง! 🎮"
            ]
        },

        // Intro message after greeting
        intro: {
            en: "I know all about this guild site! Ask me anything or tap a suggestion below 👇",
            zh: "我對這個公會網站瞭如指掌！問我任何問題或點擊下方建議 👇",
            th: "ฉันรู้ทุกอย่างเกี่ยวกับเว็บกิลด์นี้! ถามอะไรก็ได้หรือแตะคำแนะนำด้านล่าง 👇"
        },

        // Confused responses
        confused: {
            en: [
                "Hmm, not sure about that one! Try asking about a page 🤔",
                "My brain hurts! Can you rephrase? 😵",
                "That's beyond my programming! Try 'show pages' 🤷"
            ],
            zh: [
                "嗯，不太確定耶！試著問問關於頁面的問題 🤔",
                "我腦袋打結了！能換個說法嗎？😵",
                "這超出我的能力了！試試「顯示頁面」🤷"
            ],
            th: [
                "อืม ไม่แน่ใจเลย! ลองถามเกี่ยวกับหน้าต่างๆ ดู 🤔",
                "สมองฉันมึน! พูดใหม่ได้ไหม? 😵",
                "เกินความสามารถของฉัน! ลอง 'แสดงหน้าทั้งหมด' 🤷"
            ]
        },

        // Jokes
        jokes: {
            en: [
                "Why did the guild master cross the road? To avoid doing dailies! 😂",
                "What's a hacker's favorite snack? Spam! 🥫",
                "How many MapleStory players to change a lightbulb? None - they're all AFK! 💡"
            ],
            zh: [
                "為什麼會長要過馬路？為了逃避每日任務！😂",
                "駭客最愛的零食是什麼？垃圾郵件！🥫",
                "需要多少楓之谷玩家換燈泡？零個——他們都在掛機！💡"
            ],
            th: [
                "ทำไมหัวหน้ากิลด์ถึงข้ามถนน? เพื่อหนีเควสประจำวัน! 😂",
                "แฮกเกอร์ชอบกินอะไร? สแปม! 🥫",
                "ต้องใช้ผู้เล่น MapleStory กี่คนเปลี่ยนหลอดไฟ? ไม่มี - พวกเขา AFK หมด! 💡"
            ]
        },

        // Page tips
        tips: {
            '/': {
                en: ["Welcome to NumbahWan! Try the 📈 Exchange", "Check out the 🏫 Academy", "New here? Visit the 🏛️ Museum"],
                zh: ["歡迎來到NumbahWan！試試 📈 交易所", "看看 🏫 學院", "新手？去 🏛️ 博物館"],
                th: ["ยินดีต้อนรับสู่ NumbahWan! ลอง 📈 Exchange", "ดู 🏫 สถาบัน", "มาใหม่? ไปที่ 🏛️ พิพิธภัณฑ์"]
            },
            '/exchange': {
                en: ["Click headlines - they affect prices!", "Use keyboard: B=Buy, S=Sell"],
                zh: ["點擊新聞標題——會影響價格！", "快捷鍵：B=買入, S=賣出"],
                th: ["คลิกพาดหัวข่าว - มีผลต่อราคา!", "ใช้คีย์บอร์ด: B=ซื้อ, S=ขาย"]
            },
            '/forge': {
                en: ["Use 🪵 Sacred Logs to pull cards!", "1 Log = 1 Pull, 5 Logs = Guaranteed Rare+"],
                zh: ["用 🪵 神聖原木抽卡！", "1原木 = 1抽, 5原木 = 保底稀有+"],
                th: ["ใช้ 🪵 Sacred Logs สุ่มการ์ด!", "1 Log = 1 สุ่ม, 5 Logs = การันตี Rare+"]
            },
            '/arcade': {
                en: ["Play games to win currencies! 💎🪙⚙️🪨", "Path: Diamond → Gold → Iron → Stone → Log → CARDS!"],
                zh: ["玩遊戲贏貨幣！💎🪙⚙️🪨", "路徑：鑽石 → 金幣 → 鐵 → 石頭 → 原木 → 卡牌！"],
                th: ["เล่นเกมรับสกุลเงิน! 💎🪙⚙️🪨", "เส้นทาง: Diamond → Gold → Iron → Stone → Log → CARDS!"]
            },
            '/wallet': {
                en: ["GM Mode: Enter 'numbahwan-gm-2026' for infinite resources!", "Export your wallet for backup"],
                zh: ["GM模式：輸入 'numbahwan-gm-2026' 獲得無限資源！", "導出錢包以備份"],
                th: ["GM Mode: ใส่ 'numbahwan-gm-2026' รับทรัพยากรไม่จำกัด!", "ส่งออกกระเป๋าเงินเพื่อสำรองข้อมูล"]
            },
            '/merch': {
                en: ["All items can be bought with USD or guild currencies!", "Premium items need 🪵 Sacred Logs only"],
                zh: ["所有商品可用美金或公會貨幣購買！", "頂級商品只能用 🪵 神聖原木購買"],
                th: ["สินค้าทั้งหมดซื้อด้วย USD หรือสกุลเงินกิลด์!", "สินค้าพรีเมี่ยมต้องใช้ 🪵 Sacred Logs เท่านั้น"]
            },
            // === NEW ABSURDIST PAGE TIPS ===
            '/court': {
                en: ["File complaints for 5💎, win cases to earn 25🪙!", "Appeal costs 10💎 with only 3% success rate 😈", "10 crime categories including Fashion Crime & Excessive Simping!"],
                zh: ["提交訴狀5💎，勝訴獲得25🪙！", "上訴需10💎，只有3%成功率 😈", "10種罪名包括時尚犯罪和過度舔狗！"],
                th: ["ยื่นคำร้อง 5💎 ชนะคดีได้ 25🪙!", "อุทธรณ์ 10💎 สำเร็จแค่ 3% 😈", "10 หมวดหมู่อาชญากรรมรวมถึง Fashion Crime!"]
            },
            '/therapy': {
                en: ["Complete a session to earn 3💎!", "Get diagnosed with Gacha Pull Depression 🎰", "Dr. NumbahWan is always listening (not really)"],
                zh: ["完成療程獲得3💎！", "被診斷為抽卡憂鬱症 🎰", "NumbahWan醫生隨時傾聽（才怪）"],
                th: ["ทำเซสชันเสร็จรับ 3💎!", "วินิจฉัยว่าเป็น Gacha Pull Depression 🎰", "Dr. NumbahWan ฟังอยู่เสมอ (ไม่จริง)"]
            },
            '/hr': {
                en: ["Apply for Chief Banana Officer! 🍌", "All applications rejected (100% rate!)", "Application costs 5💎, consolation prize: 10🪙"],
                zh: ["申請首席香蕉官！🍌", "所有申請都被拒絕（100%！）", "申請費5💎，安慰獎：10🪙"],
                th: ["สมัคร Chief Banana Officer! 🍌", "ทุกใบสมัครถูกปฏิเสธ (100%!)", "สมัครงาน 5💎 รางวัลปลอบใจ: 10🪙"]
            },
            '/conspiracy': {
                en: ["Drag evidence cards to connect the dots!", "Submit theories for 2💎, truth seekers earn 15🪙", "Investigate The Banana Patch conspiracy 🍌"],
                zh: ["拖動證據卡片連接線索！", "提交理論2💎，揭密者獲得15🪙", "調查香蕉園陰謀 🍌"],
                th: ["ลากการ์ดหลักฐานเชื่อมจุด!", "ส่งทฤษฎี 2💎 นักแสวงหาความจริงได้ 15🪙", "สืบสวน The Banana Patch conspiracy 🍌"]
            }
        },

        // Suggestion chips
        chips: {
            showPages: { en: '📋 Show all pages', zh: '📋 顯示所有頁面', th: '📋 แสดงหน้าทั้งหมด' },
            tips: { en: '💡 Tips', zh: '💡 提示', th: '💡 เคล็ดลับ' },
            joke: { en: '😂 Tell a joke', zh: '😂 講個笑話', th: '😂 เล่าเรื่องตลก' },
            help: { en: '❓ Help', zh: '❓ 幫助', th: '❓ ช่วยเหลือ' },
            langSwitch: { en: '🌐 Language', zh: '🌐 語言', th: '🌐 ภาษา' }
        },

        // Language switch
        langNames: {
            en: { en: 'English', zh: '英文', th: 'อังกฤษ' },
            zh: { en: 'Chinese', zh: '中文', th: 'จีน' },
            th: { en: 'Thai', zh: '泰文', th: 'ไทย' }
        },

        // Help text
        help: {
            en: "I can help you navigate! Try:\n• Ask about any page (Exchange, Forge, etc.)\n• 'show pages' - see all sections\n• 'tips' - get tips for current page\n• 'joke' - I'm hilarious! 😏\n• '🌐 Language' - switch language",
            zh: "我可以幫你導航！試試：\n• 詢問任何頁面（交易所、鍛造等）\n• 「顯示頁面」- 查看所有區域\n• 「提示」- 獲取當前頁面提示\n• 「笑話」- 我超幽默！😏\n• 「🌐 語言」- 切換語言",
            th: "ฉันช่วยนำทางได้! ลอง:\n• ถามเกี่ยวกับหน้าใดก็ได้ (Exchange, Forge ฯลฯ)\n• 'แสดงหน้า' - ดูทุกส่วน\n• 'เคล็ดลับ' - รับเคล็ดลับหน้าปัจจุบัน\n• 'ตลก' - ฉันตลกมาก! 😏\n• '🌐 ภาษา' - เปลี่ยนภาษา"
        }
    };

    // Page paths
    const PAGE_PATHS = {
        home: '/', academy: '/academy', exchange: '/exchange', museum: '/museum',
        vault: '/vault', tcg: '/tcg', market: '/market', forge: '/forge',
        arcade: '/arcade', merch: '/merch', wallet: '/wallet', memes: '/memes',
        fortune: '/fortune', apply: '/apply',
        // New absurdist pages
        court: '/court', therapy: '/therapy', hr: '/hr', conspiracy: '/conspiracy'
    };

    // Page emojis
    const PAGE_EMOJIS = {
        home: '🏠', academy: '🏫', exchange: '📈', museum: '🏛️', vault: '🔐',
        tcg: '🃏', market: '🛒', forge: '⚒️', arcade: '🕹️', merch: '👕',
        wallet: '💰', memes: '😂', fortune: '🔮', apply: '📝',
        // New absurdist pages
        court: '⚖️', therapy: '🛋️', hr: '👔', conspiracy: '📌'
    };

    // ==================== HELPER FUNCTIONS ====================
    function t(key) {
        // Get translation from nested path like "ui.title"
        const keys = key.split('.');
        let result = i18n;
        for (const k of keys) {
            result = result?.[k];
        }
        return result?.[currentLang] || result?.en || key;
    }

    function tRandom(key) {
        const arr = t(key);
        return Array.isArray(arr) ? arr[Math.floor(Math.random() * arr.length)] : arr;
    }

    function getPageInfo(pageKey) {
        const pageData = i18n.pages[pageKey];
        if (!pageData) return null;
        return {
            path: PAGE_PATHS[pageKey],
            emoji: PAGE_EMOJIS[pageKey],
            name: pageData[currentLang]?.name || pageData.en.name,
            desc: pageData[currentLang]?.desc || pageData.en.desc
        };
    }

    // ==================== UI CREATION ====================
    function createChatUI() {
        const style = document.createElement('style');
        style.textContent = `
            #nw-guide-toggle {
                position: fixed;
                bottom: 24px;
                right: 24px;
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
                overflow: hidden;
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

            #nw-guide-chat {
                position: fixed;
                bottom: 100px;
                right: 24px;
                width: 360px;
                max-width: calc(100vw - 48px);
                max-height: 500px;
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
            }
            .nw-guide-send:hover {
                transform: scale(1.05);
            }

            @media (max-width: 480px) {
                #nw-guide-toggle {
                    bottom: 16px;
                    right: 16px;
                    width: 48px;
                    height: 48px;
                }
                #nw-guide-chat {
                    bottom: 80px;
                    right: 16px;
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
        `;
        toggle.setAttribute('aria-label', 'Open AI Guide');
        toggle.title = currentLang === 'zh' ? '需要幫助？點擊聊天！' : currentLang === 'th' ? 'ต้องการความช่วยเหลือ? คลิกแชท!' : 'Need help? Click to chat!';

        // Chat window
        const chat = document.createElement('div');
        chat.id = 'nw-guide-chat';
        updateChatHTML(chat);

        document.body.appendChild(toggle);
        document.body.appendChild(chat);

        return { toggle, chat };
    }

    function updateChatHTML(chat) {
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
            `<div class="nw-guide-chip ${s.isLang ? 'lang-chip' : ''}" data-action="${s.action || ''}" data-value="${s.value || ''}">${s.label}</div>`
        ).join('');
    }

    function showContextualSuggestions() {
        const path = window.location.pathname;
        const suggestions = [
            { label: i18n.chips.showPages[currentLang], value: 'show pages' },
            { label: i18n.chips.tips[currentLang], value: 'tips' },
            { label: i18n.chips.langSwitch[currentLang], action: 'lang', isLang: true }
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
        
        // Update chat UI
        const chat = document.getElementById('nw-guide-chat');
        if (chat) {
            const wasOpen = chat.classList.contains('open');
            const messages = document.getElementById('nw-guide-messages')?.innerHTML || '';
            updateChatHTML(chat);
            if (messages) {
                document.getElementById('nw-guide-messages').innerHTML = messages;
            }
            if (wasOpen) chat.classList.add('open');
            
            // Rebind events
            bindInputEvents();
        }

        // Update toggle tooltip
        const toggle = document.getElementById('nw-guide-toggle');
        if (toggle) {
            toggle.title = currentLang === 'zh' ? '需要幫助？點擊聊天！' : currentLang === 'th' ? 'ต้องการความช่วยเหลือ? คลิกแชท!' : 'Need help? Click to chat!';
        }

        const confirmMsg = {
            en: "Language set to English! 🇬🇧",
            zh: "語言已設定為繁體中文！🇹🇼",
            th: "ตั้งค่าภาษาเป็นภาษาไทยแล้ว! 🇹🇭"
        };
        addMessage(confirmMsg[lang]);
        showContextualSuggestions();

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('nw-lang-changed', { detail: { lang } }));
    }

    function respondWithPage(pageKey) {
        const page = getPageInfo(pageKey);
        if (!page) return;
        
        const goToText = t('ui.goTo');
        addMessage(`${page.emoji} <strong>${page.name}</strong><br>${page.desc}<br><br><a href="${page.path}" class="nw-guide-page-link">${page.emoji} ${goToText} ${page.name}</a>`);
        showContextualSuggestions();
    }

    function respondWithPageList() {
        const featured = ['exchange', 'forge', 'arcade', 'wallet', 'court', 'therapy', 'hr', 'conspiracy'];
        const list = featured.map(key => {
            const p = getPageInfo(key);
            return p ? `<a href="${p.path}" class="nw-guide-page-link">${p.emoji} ${p.name}</a>` : '';
        }).filter(Boolean).join(' ');
        
        const introText = {
            en: "Here are some popular spots:",
            zh: "這裡有一些熱門區域：",
            th: "นี่คือจุดยอดนิยม:"
        };
        addMessage(`${introText[currentLang]}<br><br>${list}`);
        showContextualSuggestions();
    }

    function respondWithTips() {
        const path = window.location.pathname;
        const tips = i18n.tips[path]?.[currentLang] || i18n.tips['/'][currentLang];
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
            // Language detection for Chinese input
            if (/[\u4e00-\u9fff]/.test(input)) {
                // Chinese characters detected
                if (lower.includes('交易') || lower.includes('股票')) return respondWithPage('exchange');
                if (lower.includes('學院') || lower.includes('訓練')) return respondWithPage('academy');
                if (lower.includes('博物') || lower.includes('歷史')) return respondWithPage('museum');
                if (lower.includes('金庫') || lower.includes('寶藏')) return respondWithPage('vault');
                if (lower.includes('卡') || lower.includes('遊戲')) return respondWithPage('tcg');
                if (lower.includes('市場') || lower.includes('買') || lower.includes('賣')) return respondWithPage('market');
                if (lower.includes('鍛造') || lower.includes('抽')) return respondWithPage('forge');
                if (lower.includes('遊樂') || lower.includes('玩')) return respondWithPage('arcade');
                if (lower.includes('商品') || lower.includes('周邊')) return respondWithPage('merch');
                if (lower.includes('錢包') || lower.includes('貨幣')) return respondWithPage('wallet');
                if (lower.includes('頁面') || lower.includes('全部') || lower.includes('顯示')) return respondWithPageList();
                if (lower.includes('提示') || lower.includes('幫助')) return respondWithTips();
                if (lower.includes('笑話') || lower.includes('有趣')) {
                    addMessage(tRandom('jokes'));
                    return showContextualSuggestions();
                }
                if (lower.includes('語言')) return showLanguageOptions();
                // New absurdist pages - Chinese keywords
                if (lower.includes('法院') || lower.includes('訴') || lower.includes('告') || lower.includes('判')) return respondWithPage('court');
                if (lower.includes('療') || lower.includes('心理') || lower.includes('治療')) return respondWithPage('therapy');
                if (lower.includes('人力') || lower.includes('工作') || lower.includes('職位')) return respondWithPage('hr');
                if (lower.includes('陰謀') || lower.includes('秘密') || lower.includes('理論')) return respondWithPage('conspiracy');
            }

            // Thai detection
            if (/[\u0E00-\u0E7F]/.test(input)) {
                if (lower.includes('แลกเปลี่ยน') || lower.includes('หุ้น')) return respondWithPage('exchange');
                if (lower.includes('สถาบัน') || lower.includes('ฝึก')) return respondWithPage('academy');
                if (lower.includes('พิพิธภัณฑ์')) return respondWithPage('museum');
                if (lower.includes('ห้องนิรภัย')) return respondWithPage('vault');
                if (lower.includes('การ์ด') || lower.includes('เกม')) return respondWithPage('tcg');
                if (lower.includes('ตลาด') || lower.includes('ซื้อ') || lower.includes('ขาย')) return respondWithPage('market');
                if (lower.includes('โรงตี') || lower.includes('สุ่ม')) return respondWithPage('forge');
                if (lower.includes('อาร์เคด') || lower.includes('เล่น')) return respondWithPage('arcade');
                if (lower.includes('สินค้า')) return respondWithPage('merch');
                if (lower.includes('กระเป๋า')) return respondWithPage('wallet');
                if (lower.includes('หน้า') || lower.includes('ทั้งหมด') || lower.includes('แสดง')) return respondWithPageList();
                if (lower.includes('เคล็ดลับ') || lower.includes('ช่วย')) return respondWithTips();
                if (lower.includes('ตลก') || lower.includes('ขำ')) {
                    addMessage(tRandom('jokes'));
                    return showContextualSuggestions();
                }
                if (lower.includes('ภาษา')) return showLanguageOptions();
                // New absurdist pages - Thai keywords
                if (lower.includes('ศาล') || lower.includes('ฟ้อง') || lower.includes('ตัดสิน')) return respondWithPage('court');
                if (lower.includes('บำบัด') || lower.includes('จิต') || lower.includes('ปรึกษา')) return respondWithPage('therapy');
                if (lower.includes('บุคคล') || lower.includes('งาน') || lower.includes('สมัคร')) return respondWithPage('hr');
                if (lower.includes('สมคบ') || lower.includes('ความลับ') || lower.includes('ทฤษฎี')) return respondWithPage('conspiracy');
            }

            // English keywords
            if (lower.includes('exchange') || lower.includes('stock') || lower.includes('trade')) {
                respondWithPage('exchange');
            } else if (lower.includes('academy') || lower.includes('train') || lower.includes('schedule')) {
                respondWithPage('academy');
            } else if (lower.includes('museum') || lower.includes('history') || lower.includes('artifact')) {
                respondWithPage('museum');
            } else if (lower.includes('vault') || lower.includes('treasure') || lower.includes('secure')) {
                respondWithPage('vault');
            } else if (lower.includes('card') || lower.includes('tcg') || lower.includes('battle')) {
                respondWithPage('tcg');
            } else if (lower.includes('market') || lower.includes('buy') || lower.includes('sell')) {
                respondWithPage('market');
            } else if (lower.includes('forge') || lower.includes('craft') || lower.includes('pull')) {
                respondWithPage('forge');
            } else if (lower.includes('arcade') || lower.includes('game') || lower.includes('play')) {
                respondWithPage('arcade');
            } else if (lower.includes('merch') || lower.includes('shop') || lower.includes('store')) {
                respondWithPage('merch');
            } else if (lower.includes('wallet') || lower.includes('money') || lower.includes('currency')) {
                respondWithPage('wallet');
            } else if (lower.includes('meme') || lower.includes('funny')) {
                respondWithPage('memes');
            } else if (lower.includes('fortune') || lower.includes('luck')) {
                respondWithPage('fortune');
            } else if (lower.includes('apply') || lower.includes('join')) {
                respondWithPage('apply');
            } else if (lower.includes('home') || lower.includes('main') || lower.includes('start')) {
                respondWithPage('home');
            }
            // New absurdist pages - English keywords
            else if (lower.includes('court') || lower.includes('sue') || lower.includes('complaint') || lower.includes('verdict') || lower.includes('judge')) {
                respondWithPage('court');
            } else if (lower.includes('therapy') || lower.includes('therapist') || lower.includes('mental') || lower.includes('counsel')) {
                respondWithPage('therapy');
            } else if (lower.includes('hr') || lower.includes('job') || lower.includes('hire') || lower.includes('position') || lower.includes('banana officer')) {
                respondWithPage('hr');
            } else if (lower.includes('conspiracy') || lower.includes('theory') || lower.includes('secret') || lower.includes('illuminati') || lower.includes('evidence')) {
                respondWithPage('conspiracy');
            }
            // Commands
            else if (lower.includes('page') || lower.includes('show') || lower.includes('all') || lower.includes('list')) {
                respondWithPageList();
            }
            else if (lower.includes('help') || lower === '?') {
                respondWithHelp();
            }
            else if (lower.includes('joke') || lower.includes('funny') || lower.includes('lol')) {
                addMessage(tRandom('jokes'));
                showContextualSuggestions();
            }
            else if (lower.includes('tip') || lower.includes('hint')) {
                respondWithTips();
            }
            else if (lower.includes('language') || lower.includes('lang') || lower === '🌐') {
                showLanguageOptions();
            }
            else if (lower.match(/^(hi|hey|hello|yo|sup|哈囉|你好|嗨|สวัสดี)/)) {
                addMessage(tRandom('greetings'));
                showContextualSuggestions();
            }
            else {
                addMessage(tRandom('confused'));
                showSuggestions([
                    { label: i18n.chips.showPages[currentLang], value: 'show all pages' },
                    { label: i18n.chips.tips[currentLang], value: 'tips' },
                    { label: i18n.chips.joke[currentLang], value: 'joke' }
                ]);
            }
        }, 300);
    }

    // ==================== EVENT BINDING ====================
    function bindInputEvents() {
        const sendBtn = document.getElementById('nw-guide-send');
        const input = document.getElementById('nw-guide-input');
        
        if (sendBtn) {
            sendBtn.onclick = () => {
                if (input?.value.trim()) {
                    processInput(input.value);
                    input.value = '';
                }
            };
        }
        
        if (input) {
            input.onkeypress = (e) => {
                if (e.key === 'Enter' && input.value.trim()) {
                    processInput(input.value);
                    input.value = '';
                }
            };
        }
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
                if (chatEl) updateChatHTML(chatEl);
            }
        });
    }

    // Start when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
