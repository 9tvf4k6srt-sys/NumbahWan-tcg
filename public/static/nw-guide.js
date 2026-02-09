/**
 * NumbahWan AI Guide v6.0 - ACTION EDITION!
 * Multi-language floating assistant with LLM integration + ACTIONS!
 * 
 * LEARNING FEATURES:
 * - Real AI chat using LLM API
 * - Streaming responses (typing effect)
 * - Conversation memory
 * - ACTION SYSTEM: AI can navigate, show balances, claim rewards!
 * - Fallback to rule-based when AI unavailable
 * 
 * ACTIONS SUPPORTED:
 * - navigate: Go to any page
 * - showBalance: Display wallet popup
 * - claimDaily: Claim daily login reward
 * - openForge: Open card forge
 * - showCards: Show card collection
 * - playSound: Play sound effects
 * - showToast: Show notifications
 * - copyText: Copy to clipboard
 * 
 * Supports: English, 繁體中文, ภาษาไทย
 */

(function() {
    'use strict';

    // Current language - syncs with site language setting
    let currentLang = localStorage.getItem('lang') || localStorage.getItem('nw_lang') || 'en';
    
    // ==================== AI MODE CONFIGURATION ====================
    // Toggle between AI mode and rule-based mode
    let aiEnabled = true; // Set to false to disable AI
    let conversationHistory = []; // Store conversation for context
    const MAX_CONVERSATION_HISTORY = 10; // Keep last 10 messages
    let isAiAvailable = null; // null = unknown, true/false = checked
    
    // ==================== ACTION EXECUTOR ====================
    // Execute actions returned by the AI
    // This is where the magic happens - AI responses can DO things!
    
    const ActionExecutor = {
        // Execute a single action
        execute(action) {
            console.log('[NW_GUIDE] Executing action:', action);
            
            switch (action.type) {
                case 'navigate':
                    return this.navigate(action.target);
                case 'showBalance':
                    return this.showBalance();
                case 'claimDaily':
                    return this.claimDaily();
                case 'openForge':
                    return this.openForge();
                case 'showCards':
                    return this.showCards();
                case 'playSound':
                    return this.playSound(action.target || 'click');
                case 'showToast':
                    return this.showToast(action.data?.message, action.data?.type);
                case 'toggleTheme':
                    return this.toggleTheme();
                case 'copyText':
                    return this.copyText(action.data?.text);
                case 'shareDiscord':
                    return this.shareDiscord(action.data);
                default:
                    console.warn('[NW_GUIDE] Unknown action type:', action.type);
                    return false;
            }
        },
        
        // Execute multiple actions with delay between them
        async executeAll(actions) {
            if (!actions || actions.length === 0) return;
            
            for (let i = 0; i < actions.length; i++) {
                const action = actions[i];
                const success = await this.execute(action);
                
                // Small delay between actions for better UX
                if (i < actions.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        },
        
        // Navigate to a page
        navigate(target) {
            if (!target) return false;
            
            // Validate target is a valid path
            if (!target.startsWith('/')) {
                target = '/' + target;
            }
            
            // Use soft navigation if available, otherwise hard navigation
            if (window.NW_NAV?.navigate) {
                window.NW_NAV.navigate(target);
            } else {
                window.location.href = target;
            }
            
            console.log('[NW_GUIDE] Navigating to:', target);
            return true;
        },
        
        // Show wallet/balance popup
        showBalance() {
            // Try to trigger wallet popup
            if (window.NW_WALLET?.showPopup) {
                window.NW_WALLET.showPopup();
                return true;
            }
            
            // Fallback: navigate to wallet page
            if (window.NW_NAV?.navigate) {
                window.NW_NAV.navigate('/wallet');
            } else {
                window.location.href = '/wallet';
            }
            return true;
        },
        
        // Claim daily login reward
        claimDaily() {
            // Try to trigger daily claim
            if (window.NW_WALLET?.claimDaily) {
                window.NW_WALLET.claimDaily();
                return true;
            }
            
            // Dispatch event for other systems to handle
            window.dispatchEvent(new CustomEvent('nw-claim-daily'));
            
            // Show a toast if claim system not available
            this.showToast('Opening daily rewards...', 'info');
            
            // Navigate to wallet where daily claim usually lives
            setTimeout(() => {
                this.navigate('/wallet');
            }, 500);
            
            return true;
        },
        
        // Open card forge
        openForge() {
            // Try to open forge modal
            if (window.NW_FORGE?.open) {
                window.NW_FORGE.open();
                return true;
            }
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('nw-open-forge'));
            
            // Navigate to forge page
            this.navigate('/forge');
            return true;
        },
        
        // Show card collection
        showCards() {
            // Try to open collection modal
            if (window.NW_CARDS?.showCollection) {
                window.NW_CARDS.showCollection();
                return true;
            }
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('nw-show-cards'));
            
            // Navigate to collection page
            this.navigate('/collection');
            return true;
        },
        
        // Play a sound effect
        playSound(soundName) {
            if (typeof NW_SOUNDS !== 'undefined' && NW_SOUNDS.play) {
                NW_SOUNDS.play(soundName);
                return true;
            }
            
            // Fallback: try to play from common audio elements
            const audio = document.querySelector(`audio[data-sound="${soundName}"]`);
            if (audio) {
                audio.play().catch(() => {});
                return true;
            }
            
            return false;
        },
        
        // Show a toast notification
        showToast(message, type = 'info') {
            if (!message) return false;
            
            // Try global toast system
            if (window.NW_TOAST?.show) {
                window.NW_TOAST.show(message, type);
                return true;
            }
            
            // Create a simple toast
            const toast = document.createElement('div');
            toast.className = 'nw-guide-toast';
            toast.setAttribute('data-type', type);
            toast.innerHTML = `
                <span class="toast-icon">${type === 'success' ? '' : type === 'error' ? '' : type === 'warning' ? '' : 'ℹ'}</span>
                <span class="toast-message">${message}</span>
            `;
            
            // Add toast styles if not present
            if (!document.getElementById('nw-toast-styles')) {
                const style = document.createElement('style');
                style.id = 'nw-toast-styles';
                style.textContent = `
                    .nw-guide-toast {
                        position: fixed;
                        bottom: 180px;
                        left: 24px;
                        background: #1a1f26;
                        border: 1px solid #30363d;
                        border-radius: 12px;
                        padding: 12px 20px;
                        color: #fff;
                        font-size: 14px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        z-index: 99999;
                        animation: nw-toast-in 0.3s ease, nw-toast-out 0.3s ease 2.7s forwards;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    }
                    .nw-guide-toast[data-type="success"] { border-color: #22c55e; }
                    .nw-guide-toast[data-type="error"] { border-color: #ef4444; }
                    .nw-guide-toast[data-type="warning"] { border-color: #f59e0b; }
                    .nw-guide-toast[data-type="info"] { border-color: #3b82f6; }
                    @keyframes nw-toast-in {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes nw-toast-out {
                        from { opacity: 1; transform: translateY(0); }
                        to { opacity: 0; transform: translateY(-20px); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(toast);
            
            // Remove after 3 seconds
            setTimeout(() => toast.remove(), 3000);
            
            return true;
        },
        
        // Toggle dark/light theme
        toggleTheme() {
            if (window.NW_THEME?.toggle) {
                window.NW_THEME.toggle();
                return true;
            }
            
            // Fallback: toggle data-theme attribute
            const html = document.documentElement;
            const current = html.getAttribute('data-theme');
            html.setAttribute('data-theme', current === 'light' ? 'dark' : 'light');
            return true;
        },
        
        // Copy text to clipboard
        async copyText(text) {
            if (!text) return false;
            
            try {
                await navigator.clipboard.writeText(text);
                this.showToast('Copied to clipboard! ', 'success');
                return true;
            } catch (e) {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.showToast('Copied to clipboard! ', 'success');
                return true;
            }
        },
        
        // Share to Discord
        shareDiscord(data) {
            if (window.NW_DISCORD?.share) {
                window.NW_DISCORD.share(data);
                return true;
            }
            
            // Open Discord in new tab with pre-filled message
            const message = data?.message || 'Check out NumbahWan Guild!';
            const url = data?.url || window.location.href;
            window.open(`https://discord.com/channels/@me?content=${encodeURIComponent(message + ' ' + url)}`, '_blank');
            return true;
        }
    };
    
    // Parse actions from AI response text
    function parseActionsFromText(text) {
        const actions = [];
        const actionRegex = /<<<ACTION:(\{[^>]+\})>>>/g;
        let match;
        
        while ((match = actionRegex.exec(text)) !== null) {
            try {
                const actionData = JSON.parse(match[1]);
                if (actionData.type) {
                    actions.push(actionData);
                }
            } catch (e) {
                console.error('[NW_GUIDE] Failed to parse action:', match[1], e);
            }
        }
        
        return actions;
    }
    
    // Remove action tags from text for display
    function cleanActionTags(text) {
        return text.replace(/<<<ACTION:\{[^>]+\}>>>/g, '').trim();
    }
    
    // Check if AI is available on load
    async function checkAiAvailability() {
        try {
            const response = await fetch('/api/guide/health');
            const data = await response.json();
            isAiAvailable = data.status === 'ready';
            console.log('[NW_GUIDE] AI status:', isAiAvailable ? 'READY' : 'FALLBACK MODE');
        } catch (e) {
            isAiAvailable = false;
            console.log('[NW_GUIDE] AI not available, using fallback');
        }
    }

    // ==================== VIEWING HISTORY SYSTEM ====================
    const HISTORY_KEY = 'nw_guide_history';
    const MAX_HISTORY = 50;
    
    function getViewingHistory() {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        } catch {
            return [];
        }
    }
    
    function saveViewingHistory(history) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
    }
    
    function trackPageView(path) {
        const history = getViewingHistory();
        history.push({
            path,
            timestamp: Date.now(),
            lang: currentLang
        });
        saveViewingHistory(history);
    }
    
    function getPageViewCounts() {
        const history = getViewingHistory();
        const counts = {};
        history.forEach(item => {
            counts[item.path] = (counts[item.path] || 0) + 1;
        });
        return counts;
    }
    
    function getRecentPages(limit = 5) {
        const history = getViewingHistory();
        const seen = new Set();
        const recent = [];
        for (let i = history.length - 1; i >= 0 && recent.length < limit; i--) {
            if (!seen.has(history[i].path)) {
                seen.add(history[i].path);
                recent.push(history[i].path);
            }
        }
        return recent;
    }

    // ==================== UI TRANSLATIONS ====================
    const guideI18n = {
        ui: {
            en: {
                title: 'NumbahWan Guide',
                online: 'Online - Here to help!',
                placeholder: 'Ask me anything...',
                goTo: 'Go to',
                newBadge: 'NEW!',
                learnMore: 'Learn More',
                basedOnHistory: 'Based on your history:',
                youMightLike: 'You might like:',
                popularPages: 'Popular pages:'
            },
            zh: {
                title: 'NumbahWan 嚮導',
                online: '在線 - 隨時為您服務！',
                placeholder: '問我任何問題...',
                goTo: '前往',
                newBadge: '新功能！',
                learnMore: '了解更多',
                basedOnHistory: '根據你的瀏覽記錄：',
                youMightLike: '你可能會喜歡：',
                popularPages: '熱門頁面：'
            },
            th: {
                title: 'ไกด์ NumbahWan',
                online: 'ออนไลน์ - พร้อมช่วยเหลือ!',
                placeholder: 'ถามอะไรก็ได้...',
                goTo: 'ไปที่',
                newBadge: 'ใหม่!',
                learnMore: 'เรียนรู้เพิ่มเติม',
                basedOnHistory: 'ตามประวัติการดูของคุณ:',
                youMightLike: 'คุณอาจชอบ:',
                popularPages: 'หน้ายอดนิยม:'
            }
        },
        greetings: {
            en: ["Hey there, adventurer! ", "Yo! Need directions? I got you ", "What's up! Looking for something? ", "Greetings, traveler! "],
            zh: ["嘿，冒險者！", "喲！需要指路嗎？交給我 ", "嗨！在找什麼嗎？", "你好，旅人！"],
            th: ["สวัสดี นักผจญภัย! ", "โย่! ต้องการทิศทางไหม? ", "ว่าไง! หาอะไรอยู่? ", "ยินดีต้อนรับ นักเดินทาง! "]
        },
        intro: {
            en: "I know all about this guild site! Ask me anything or tap a suggestion below ",
            zh: "我對這個公會網站瞭如指掌！問我任何問題或點擊下方建議 ",
            th: "ฉันรู้ทุกอย่างเกี่ยวกับเว็บกิลด์นี้! ถามอะไรก็ได้หรือแตะคำแนะนำด้านล่าง "
        },
        confused: {
            en: ["Hmm, not sure about that one! Try asking about a page ", "My brain hurts! Can you rephrase? ", "That's beyond my programming! Try 'show pages' "],
            zh: ["嗯，不太確定耶！試著問問關於頁面的問題 ", "我腦袋打結了！能換個說法嗎？", "這超出我的能力了！試試「顯示頁面」"],
            th: ["อืม ไม่แน่ใจเลย! ลองถามเกี่ยวกับหน้าต่างๆ ดู ", "สมองฉันมึน! พูดใหม่ได้ไหม? ", "เกินความสามารถของฉัน! ลอง 'แสดงหน้าทั้งหมด' "]
        },
        jokes: {
            en: [
                "Why did the guild master cross the road? To avoid doing dailies! ",
                "What's a hacker's favorite snack? Spam! ",
                "How many MapleStory players to change a lightbulb? None - they're all AFK! ",
                "Why did HR reject the banana? It didn't have enough appeal! ",
                "What did the therapist say to the gacha player? 'Let's talk about your pull issues.' "
            ],
            zh: [
                "為什麼會長要過馬路？為了逃避每日任務！",
                "駭客最愛的零食是什麼？垃圾郵件！",
                "需要多少楓之谷玩家換燈泡？零個——他們都在掛機！",
                "為什麼人資拒絕香蕉？它不夠有吸引力！",
                "治療師對抽卡玩家說什麼？「讓我們談談你的抽卡問題。」"
            ],
            th: [
                "ทำไมหัวหน้ากิลด์ถึงข้ามถนน? เพื่อหนีเควสประจำวัน! ",
                "แฮกเกอร์ชอบกินอะไร? สแปม! ",
                "ต้องใช้ผู้เล่น MapleStory กี่คนเปลี่ยนหลอดไฟ? ไม่มี - พวกเขา AFK หมด! ",
                "ทำไม HR ถึงปฏิเสธกล้วย? มันไม่มีเสน่ห์พอ! ",
                "นักบำบัดพูดอะไรกับผู้เล่นกาชา? 'มาคุยเรื่องปัญหาการสุ่มของคุณ' "
            ]
        },
        chips: {
            showPages: { en: 'Show all pages', zh: '顯示所有頁面', th: 'แสดงหน้าทั้งหมด' },
            tips: { en: 'Tips', zh: '提示', th: 'เคล็ดลับ' },
            joke: { en: 'Tell a joke', zh: '講個笑話', th: 'เล่าเรื่องตลก' },
            help: { en: 'Help', zh: '幫助', th: 'ช่วยเหลือ' },
            langSwitch: { en: 'Language', zh: '語言', th: 'ภาษา' },
            newFeatures: { en: '🆕 New Features', zh: '🆕 新功能', th: '🆕 ฟีเจอร์ใหม่' },
            recommend: { en: 'Recommend', zh: '推薦', th: 'แนะนำ' }
        },
        langNames: {
            en: { en: 'English', zh: '英文', th: 'อังกฤษ' },
            zh: { en: 'Chinese', zh: '中文', th: 'จีน' },
            th: { en: 'Thai', zh: '泰文', th: 'ไทย' }
        },
        help: {
            en: "I can help you navigate! Try:\n• Ask about any page (Avatar Studio, Court, Therapy, etc.)\n• 'show pages' - see all sections\n• 'new features' - see latest updates\n• 'tips' - get tips for current page\n• 'recommend' - get personalized suggestions\n• 'joke' - I'm hilarious! \n• 'Language' - switch language",
            zh: "我可以幫你導航！試試：\n• 詢問任何頁面（頭像工作室、法院、療程等）\n• 「顯示頁面」- 查看所有區域\n• 「新功能」- 查看最新更新\n• 「提示」- 獲取當前頁面提示\n• 「推薦」- 獲取個性化建議\n• 「笑話」- 我超幽默！\n• 「語言」- 切換語言",
            th: "ฉันช่วยนำทางได้! ลอง:\n• ถามเกี่ยวกับหน้าใดก็ได้ (Avatar Studio, Court, Therapy ฯลฯ)\n• 'แสดงหน้า' - ดูทุกส่วน\n• 'ฟีเจอร์ใหม่' - ดูอัปเดตล่าสุด\n• 'เคล็ดลับ' - รับเคล็ดลับหน้าปัจจุบัน\n• 'แนะนำ' - รับคำแนะนำส่วนตัว\n• 'ตลก' - ฉันตลกมาก! \n• 'ภาษา' - เปลี่ยนภาษา"
        },
        // Comprehensive fallback tips for each page
        fallbackTips: {
            '/': {
                en: ["Welcome to NumbahWan! Check out the new Avatar Studio ", "Try the Exchange for parody stocks", "New here? Visit the Museum for guild history"],
                zh: ["歡迎來到NumbahWan！看看新的頭像工作室 ", "試試 交易所玩惡搞股票", "新手？去 博物館了解公會歷史"],
                th: ["ยินดีต้อนรับสู่ NumbahWan! ดู Avatar Studio ใหม่ ", "ลอง Exchange สำหรับหุ้นล้อเลียน", "มาใหม่? ไปที่ พิพิธภัณฑ์ดูประวัติกิลด์"]
            },
            '/avatar-studio': {
                en: ["Upload a clear, full-body MapleStory screenshot for best results! ", "8 poses available: Hero, Cute, Cool, Victory, Magic, Action, AFK, Party ", "Center your character and use bright backgrounds ", "Download HD PNG or share directly to Discord! "],
                zh: ["上傳清晰的全身楓之谷截圖效果最佳！", "8種姿勢：英雄、可愛、酷炫、勝利、魔法、動作、AFK、派對 ", "將角色置中並使用明亮背景 ", "下載高清PNG或直接分享到Discord！"],
                th: ["อัปโหลดภาพหน้าจอ MapleStory เต็มตัวที่ชัดเจนเพื่อผลลัพธ์ที่ดีที่สุด! ", "8 โพส: ฮีโร่ น่ารัก เท่ ชนะ เวทมนตร์ แอ็คชั่น AFK ปาร์ตี้ ", "วางตัวละครไว้ตรงกลางและใช้พื้นหลังสว่าง ", "ดาวน์โหลด HD PNG หรือแชร์ไป Discord โดยตรง! "]
            },
            '/forge': {
                en: ["Use Sacred Logs ⧫ to pull cards!", "Multi-pull (10x) gives better value ", "Check your pity counter for guaranteed rares!"],
                zh: ["使用神聖原木 ⧫ 抽卡！", "十連抽更划算 ", "查看保底計數器獲得保底稀有卡！"],
                th: ["ใช้ Sacred Logs ⧫ สุ่มการ์ด!", "สุ่ม 10 ครั้ง คุ้มกว่า ", "ดูตัวนับ pity สำหรับการันตีหายาก!"]
            },
            '/court': {
                en: ["File complaints for 5, win to earn 25! ", "Appeal costs 10with only 3% success rate ", "10 crime categories from Loot Theft to AFK Abuse!"],
                zh: ["提交訴狀5，勝訴獲25！", "上訴需10，只有3%成功率 ", "10種罪名從偷寶到掛機濫用！"],
                th: ["ยื่นคำร้อง 5ชนะได้ 25! ", "อุทธรณ์ 10สำเร็จแค่ 3% ", "10 หมวดอาชญากรรมจากขโมยของถึงใช้ AFK ในทางที่ผิด!"]
            },
            '/therapy': {
                en: ["Complete a therapy session to earn 3! ", "Get diagnosed with Gacha Pull Depression ", "Dr. NumbahWan accepts all gaming traumas!"],
                zh: ["完成療程獲3！", "被診斷為抽卡憂鬱症 ", "NumbahWan醫生接受所有遊戲創傷！"],
                th: ["ทำเซสชันเสร็จรับ 3! ", "วินิจฉัยว่าเป็น Gacha Pull Depression ", "Dr. NumbahWan รับบาดแผลเกมทุกชนิด!"]
            },
            '/hr': {
                en: ["Apply for Chief Banana Officer! ", "Application costs 5, consolation prize: 10", "100% rejection rate guaranteed! "],
                zh: ["申請首席香蕉官！", "申請費5，安慰獎：10", "100%拒絕率保證！"],
                th: ["สมัคร Chief Banana Officer! ", "ค่าสมัคร 5รางวัลปลอบใจ: 10", "รับประกันอัตราปฏิเสธ 100%! "]
            },
            '/conspiracy': {
                en: ["Drag evidence to connect the dots! ", "Submit theories for 2, earn 15for truth!", "Is the banana patch a lie? "],
                zh: ["拖動證據連接線索！", "提交理論2，揭密獲15！", "香蕉園是謊言嗎？"],
                th: ["ลากหลักฐานเชื่อมจุด! ", "ส่งทฤษฎี 2ได้ 15หาความจริง!", "สวนกล้วยเป็นเรื่องโกหกหรือเปล่า? "]
            },
            '/arcade': {
                en: ["Play mini-games to earn currencies! ", "Try the slot machine for big wins! ", "Daily bonus available for regular players!"],
                zh: ["玩小遊戲賺貨幣！", "試試老虎機贏大獎！", "每日獎勵給常玩玩家！"],
                th: ["เล่นมินิเกมหาสกุลเงิน! ", "ลองสล็อตแมชชีนลุ้นรางวัลใหญ่! ", "โบนัสรายวันสำหรับผู้เล่นประจำ!"]
            },
            '/wallet': {
                en: ["Manage all your currencies here! ", "Claim daily login rewards for free loot!", "7-day streak gives Sacred Log on day 7! ⧫"],
                zh: ["在這裡管理所有貨幣！", "領取每日登入獎勵免費拿寶！", "7天連續登入第7天送神聖原木！⧫"],
                th: ["จัดการสกุลเงินทั้งหมดที่นี่! ", "รับรางวัลล็อกอินรายวันฟรี!", "ล็อกอิน 7 วันติดได้ Sacred Log วันที่ 7! ⧫"]
            },
            '/exchange': {
                en: ["Trade parody stocks of guild members! ", "Buy low, sell high for profits!", "Market trends change daily!"],
                zh: ["交易公會成員的惡搞股票！", "低買高賣賺差價！", "市場趨勢每日變化！"],
                th: ["ซื้อขายหุ้นล้อเลียนของสมาชิกกิลด์! ", "ซื้อถูกขายแพงทำกำไร!", "แนวโน้มตลาดเปลี่ยนทุกวัน!"]
            },
            '/confessional': {
                en: ["Submit anonymous guild confessions! ", "Vote on the juiciest secrets ", "Everything is anonymous... maybe "],
                zh: ["提交匿名公會告解！", "為最勁爆的秘密投票 ", "一切都是匿名的...也許 "],
                th: ["ส่งคำสารภาพกิลด์แบบไม่ระบุตัวตน! ", "โหวตความลับที่น่าสนใจที่สุด ", "ทุกอย่างไม่ระบุตัวตน... อาจจะ "]
            },
            '/collection': {
                en: ["View all your collected cards! ", "Star upgrades: use duplicates for +15%/30%/50%/75% stats! ", "Burn unwanted cards for Sacred Logs! "],
                zh: ["查看所有收集的卡牌！", "星級升級：用重複卡牌獲得 +15%/30%/50%/75% 屬性！", "燃燒不要的卡換神聖原木！"],
                th: ["ดูการ์ดที่สะสมทั้งหมด! ", "อัพเกรดดาว: ใช้การ์ดซ้ำเพิ่ม +15%/30%/50%/75% สถานะ! ", "เผาการ์ดที่ไม่ต้องการรับ Sacred Logs! "]
            }
        }
    };

    // ==================== FALLBACK PAGE DATA ====================
    const fallbackPages = {
        home: { path: '/', emoji: '', name: { en: 'Home', zh: '首頁', th: 'หน้าแรก' }, desc: { en: 'Guild headquarters', zh: '公會總部', th: 'สำนักงานใหญ่กิลด์' }, category: 'core' },
        avatarStudio: { path: '/avatar-studio', emoji: '', name: { en: 'Avatar Studio', zh: '頭像工作室', th: 'สตูดิโออวาตาร์' }, desc: { en: 'Generate AI maple avatars', zh: '生成AI楓之谷頭像', th: 'สร้างอวาตาร์เมเปิ้ล AI' }, category: 'creative' },
        forge: { path: '/forge', emoji: '', name: { en: 'Card Forge', zh: '卡牌鍛造', th: 'โรงหลอมการ์ด' }, desc: { en: 'Open packs and collect cards', zh: '開包收集卡牌', th: 'เปิดแพ็คสะสมการ์ด' }, category: 'core' },
        battle: { path: '/battle', emoji: '', name: { en: 'Battle', zh: '戰鬥', th: 'ต่อสู้' }, desc: { en: 'Card battles and PvP', zh: '卡牌對戰', th: 'การต่อสู้การ์ด' }, category: 'game' },
        collection: { path: '/collection', emoji: '', name: { en: 'Collection', zh: '收藏', th: 'คอลเลกชัน' }, desc: { en: 'View your cards', zh: '查看卡牌', th: 'ดูการ์ด' }, category: 'core' },
        wallet: { path: '/wallet', emoji: '', name: { en: 'Wallet', zh: '錢包', th: 'กระเป๋าเงิน' }, desc: { en: 'Manage currencies', zh: '管理貨幣', th: 'จัดการสกุลเงิน' }, category: 'core' },
        market: { path: '/market', emoji: '', name: { en: 'Card Market', zh: '卡牌市場', th: 'ตลาดการ์ด' }, desc: { en: 'Trade cards', zh: '交易卡牌', th: 'ซื้อขายการ์ด' }, category: 'economy' },
        arcade: { path: '/arcade', emoji: '', name: { en: 'Arcade', zh: '遊戲廳', th: 'อาร์เคด' }, desc: { en: 'Mini-games', zh: '小遊戲', th: 'มินิเกม' }, category: 'game' },
        exchange: { path: '/exchange', emoji: '', name: { en: 'Exchange', zh: '交易所', th: 'ตลาดแลกเปลี่ยน' }, desc: { en: 'Trade currencies', zh: '交易貨幣', th: 'แลกเปลี่ยนสกุลเงิน' }, category: 'economy' },
        merch: { path: '/merch', emoji: '', name: { en: 'Merch Shop', zh: '周邊商店', th: 'ร้านค้า' }, desc: { en: 'Guild merchandise', zh: '公會周邊', th: 'สินค้ากิลด์' }, category: 'economy' },
        court: { path: '/court', emoji: '', name: { en: 'Guild Court', zh: '公會法院', th: 'ศาลกิลด์' }, desc: { en: 'Sue your guildmates!', zh: '告你的隊友！', th: 'ฟ้องเพื่อนกิลด์!' }, category: 'absurdist' },
        therapy: { path: '/therapy', emoji: '', name: { en: 'Guild Therapy', zh: '公會療程', th: 'การบำบัดกิลด์' }, desc: { en: 'AI therapist', zh: 'AI治療師', th: 'นักบำบัด AI' }, category: 'absurdist' },
        hr: { path: '/hr', emoji: '', name: { en: 'HR Department', zh: '人事部', th: 'ฝ่ายบุคคล' }, desc: { en: 'Apply for jobs', zh: '申請職位', th: 'สมัครงาน' }, category: 'absurdist' },
        conspiracy: { path: '/conspiracy', emoji: '', name: { en: 'Conspiracy Board', zh: '陰謀板', th: 'บอร์ดสมคบคิด' }, desc: { en: 'Connect the dots', zh: '連接線索', th: 'เชื่อมจุด' }, category: 'absurdist' },
        confessional: { path: '/confessional', emoji: '', name: { en: 'Confessional', zh: '告解室', th: 'ห้องสารภาพ' }, desc: { en: 'Anonymous confessions', zh: '匿名告解', th: 'คำสารภาพนิรนาม' }, category: 'fun' },
        academy: { path: '/academy', emoji: '', name: { en: 'Academy', zh: '學院', th: 'สถาบัน' }, desc: { en: 'Training grounds', zh: '訓練場', th: 'สนามฝึก' }, category: 'meta' },
        museum: { path: '/museum', emoji: '', name: { en: 'Museum', zh: '博物館', th: 'พิพิธภัณฑ์' }, desc: { en: 'Guild history', zh: '公會歷史', th: 'ประวัติกิลด์' }, category: 'meta' },
        fortune: { path: '/fortune', emoji: '', name: { en: 'Fortune Teller', zh: '算命師', th: 'หมอดู' }, desc: { en: 'Daily fortunes', zh: '每日運勢', th: 'ดวงรายวัน' }, category: 'fun' },
        updates: { path: '/updates', emoji: '', name: { en: 'Patch Notes', zh: '更新日誌', th: 'บันทึกแพทช์' }, desc: { en: 'Latest updates', zh: '最新更新', th: 'อัปเดตล่าสุด' }, category: 'meta' }
    };

    // ==================== HELPER FUNCTIONS ====================
    function t(key) {
        const keys = key.split('.');
        let result = guideI18n;
        for (const k of keys) {
            result = result?.[k];
        }
        if (result?.[currentLang]) {
            return result[currentLang];
        }
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

    function getPageInfo(pageKey) {
        if (window.NW_CONFIG?.getPage) {
            const page = NW_CONFIG.getPage(pageKey);
            if (page) return page;
        }
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

    function getAllPages(category = null) {
        if (window.NW_CONFIG?.getAllPages) {
            return NW_CONFIG.getAllPages(category);
        }
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

    function getPageTips(path) {
        // Try NW_CONFIG first
        if (window.NW_CONFIG) {
            const pages = Object.values(NW_CONFIG.pages || {});
            const page = pages.find(p => p.path === path);
            if (page?.tips) {
                const tips = NW_CONFIG.t ? NW_CONFIG.t(page.tips, currentLang) : (page.tips[currentLang] || page.tips.en);
                if (Array.isArray(tips) && tips.length > 0) return tips;
            }
        }
        // Fallback to built-in comprehensive tips
        return guideI18n.fallbackTips[path]?.[currentLang] || guideI18n.fallbackTips['/'][currentLang];
    }

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

    // ==================== SMART RECOMMENDATIONS ====================
    function getSmartRecommendations() {
        const history = getViewingHistory();
        const viewCounts = getPageViewCounts();
        const currentPath = window.location.pathname;
        
        // Category-based recommendations
        const categoryMap = {
            core: ['forge', 'wallet', 'collection', 'battle'],
            economy: ['exchange', 'market', 'merch', 'arcade'],
            absurdist: ['court', 'therapy', 'hr', 'conspiracy'],
            fun: ['fortune', 'memes', 'confessional'],
            creative: ['avatarStudio'],
            meta: ['academy', 'museum', 'updates']
        };
        
        // Find user's preferred categories based on history
        const categoryScores = {};
        history.forEach(item => {
            const pageKey = Object.keys(fallbackPages).find(k => fallbackPages[k].path === item.path);
            if (pageKey) {
                const category = fallbackPages[pageKey]?.category;
                if (category) {
                    categoryScores[category] = (categoryScores[category] || 0) + 1;
                }
            }
        });
        
        // Get top categories
        const sortedCategories = Object.entries(categoryScores)
            .sort((a, b) => b[1] - a[1])
            .map(([cat]) => cat);
        
        // Generate recommendations
        const recommendations = [];
        const addedPaths = new Set([currentPath]);
        
        // First: recommend from favorite categories
        for (const cat of sortedCategories) {
            const pagesInCat = categoryMap[cat] || [];
            for (const pageKey of pagesInCat) {
                const page = getPageInfo(pageKey);
                if (page && !addedPaths.has(page.path)) {
                    recommendations.push(page);
                    addedPaths.add(page.path);
                    if (recommendations.length >= 3) break;
                }
            }
            if (recommendations.length >= 3) break;
        }
        
        // Add new features if not seen recently
        const newFeatures = ['avatarStudio', 'court', 'therapy', 'hr', 'conspiracy'];
        for (const feat of newFeatures) {
            if (recommendations.length >= 5) break;
            const page = getPageInfo(feat);
            if (page && !addedPaths.has(page.path) && !viewCounts[page.path]) {
                recommendations.push(page);
                addedPaths.add(page.path);
            }
        }
        
        return recommendations;
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
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
                user-select: none;
            }
            #nw-guide-toggle:hover, #nw-guide-toggle:active {
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
                margin-right: 6px;
                padding: 6px 12px;
                background: rgba(255, 107, 0, 0.15);
                border: 1px solid rgba(255, 107, 0, 0.3);
                border-radius: 8px;
                color: #ff9500 !important;
                font-size: 12px;
                transition: all 0.2s;
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
            }
            .nw-guide-page-link:hover, .nw-guide-page-link:active {
                background: rgba(255, 107, 0, 0.25);
                text-decoration: none !important;
                transform: scale(0.98);
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
                padding: 8px 14px;
                background: #21262d;
                border: 1px solid #30363d;
                border-radius: 16px;
                color: #8b949e;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.15s ease;
                white-space: nowrap;
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
                user-select: none;
                min-height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .nw-guide-chip:hover, .nw-guide-chip:active {
                background: #30363d;
                color: #fff;
                border-color: #ff6b00;
                transform: scale(0.97);
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
            .nw-guide-chip.recommend-chip {
                background: rgba(99, 102, 241, 0.1);
                border-color: rgba(99, 102, 241, 0.3);
                color: #818cf8;
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
                transition: all 0.15s ease;
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
                user-select: none;
                min-width: 48px;
                min-height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .nw-guide-send:hover, .nw-guide-send:active {
                transform: scale(0.97);
                background: linear-gradient(135deg, #ff8533, #ffaa33);
            }
            
            /* Typing indicator animation */
            .typing-indicator {
                display: flex;
                gap: 4px;
                padding: 12px 16px;
            }
            .typing-indicator .dot {
                width: 8px;
                height: 8px;
                background: #ff9500;
                border-radius: 50%;
                animation: typing-bounce 1.4s infinite ease-in-out;
            }
            .typing-indicator .dot:nth-child(1) { animation-delay: 0s; }
            .typing-indicator .dot:nth-child(2) { animation-delay: 0.2s; }
            .typing-indicator .dot:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typing-bounce {
                0%, 60%, 100% { transform: translateY(0); }
                30% { transform: translateY(-8px); }
            }
            
            /* Streaming cursor */
            .typing-cursor {
                animation: cursor-blink 1s infinite;
            }
            @keyframes cursor-blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
            }
            
            /* AI badge */
            .nw-guide-msg.streaming {
                min-height: 20px;
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
                .nw-guide-chip {
                    padding: 10px 16px;
                    min-height: 40px;
                    font-size: 13px;
                }
                .nw-guide-send {
                    min-width: 52px;
                    min-height: 48px;
                }
            }
        `;
        document.head.appendChild(style);

        // Toggle button
        const toggle = document.createElement('button');
        toggle.id = 'nw-guide-toggle';
        toggle.setAttribute('data-testid', 'guide-toggle');
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
        chat.setAttribute('data-testid', 'guide-chat');
        chat.setAttribute('role', 'complementary');
        chat.setAttribute('aria-label', 'AI Guide chat');
        updateChatHTML(chat);

        document.body.appendChild(toggle);
        document.body.appendChild(chat);

        return { toggle, chat };
    }

    function updateChatHTML(chat) {
        const version = window.NW_CONFIG?.version || '4.0.0';
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
                <button class="nw-guide-send" id="nw-guide-send"></button>
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
            `<div class="nw-guide-chip ${s.isLang ? 'lang-chip' : ''} ${s.isNew ? 'new-chip' : ''} ${s.isRecommend ? 'recommend-chip' : ''}" data-action="${s.action || ''}" data-value="${s.value || ''}">${s.label}</div>`
        ).join('');
        
        // Bind touch events for mobile
        container.querySelectorAll('.nw-guide-chip').forEach(chip => {
            chip.addEventListener('touchend', handleChipTouch, { passive: false });
        });
    }
    
    function handleChipTouch(e) {
        e.preventDefault();
        e.stopPropagation();
        const chip = e.target.closest('.nw-guide-chip');
        if (!chip) return;
        
        const action = chip.dataset.action;
        const value = chip.dataset.value;
        
        console.log('[NW_GUIDE] Chip touched:', { action, value });
        
        if (action === 'lang') {
            showLanguageOptions();
        } else if (action === 'setlang') {
            setLanguage(value);
        } else if (value) {
            processInput(value);
        }
    }

    function showContextualSuggestions() {
        const suggestions = [
            { label: guideI18n.chips.showPages[currentLang], value: 'show pages' },
            { label: guideI18n.chips.newFeatures[currentLang], value: 'new features', isNew: true },
            { label: guideI18n.chips.tips[currentLang], value: 'tips' },
            { label: guideI18n.chips.recommend[currentLang], value: 'recommend', isRecommend: true },
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
        localStorage.setItem('nw_lang', lang);
        localStorage.setItem('lang', lang);
        
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

        window.dispatchEvent(new CustomEvent('nw-lang-change', { detail: { lang } }));
        window.dispatchEvent(new CustomEvent('nw-lang-changed', { detail: { lang } }));
    }

    function respondWithPage(pageKey) {
        const page = getPageInfo(pageKey);
        if (!page) {
            addMessage(tRandom('confused'));
            return;
        }
        
        const goToText = t('ui.goTo');
        const learnMoreText = t('ui.learnMore');
        const isNew = page.category === 'absurdist' || page.category === 'creative';
        const newClass = isNew ? ' new' : '';
        
        // Get tips for the page
        const tips = getPageTips(page.path);
        const tipText = tips && tips.length > 0 ? `<br><br><em>${tips[0]}</em>` : '';
        
        addMessage(`${page.emoji} <strong>${page.name}</strong><br>${page.desc}${tipText}<br><br><a href="${page.path}" class="nw-guide-page-link${newClass}">${page.emoji} ${goToText} ${page.name}</a>`);
        
        // Show related suggestions
        const relatedSuggestions = [
            { label: `${learnMoreText}`, value: `tips ${page.path}` },
            { label: guideI18n.chips.showPages[currentLang], value: 'show pages' },
            { label: guideI18n.chips.recommend[currentLang], value: 'recommend', isRecommend: true }
        ];
        showSuggestions(relatedSuggestions);
    }

    function respondWithPageList() {
        const allPages = getAllPages();
        if (allPages.length === 0) {
            addMessage("Loading pages... try again in a moment!");
            return;
        }
        
        // Featured pages including Avatar Studio
        const featured = ['avatarStudio', 'exchange', 'forge', 'arcade', 'court', 'therapy', 'hr', 'conspiracy'];
        const list = featured
            .map(key => {
                const p = getPageInfo(key);
                if (!p) return '';
                const isNew = p.category === 'absurdist' || p.category === 'creative';
                return `<a href="${p.path}" class="nw-guide-page-link${isNew ? ' new' : ''}">${p.emoji} ${p.name}</a>`;
            })
            .filter(Boolean)
            .join(' ');
        
        const introText = {
            en: "Here are the featured spots:",
            zh: "這裡是精選區域：",
            th: "นี่คือจุดแนะนำ:"
        };
        addMessage(`${introText[currentLang]}<br><br>${list}<br><br><a href="/updates" class="nw-guide-page-link">${currentLang === 'zh' ? '完整更新日誌' : currentLang === 'th' ? 'บันทึกแพทช์ทั้งหมด' : 'Full Patch Notes'}</a>`);
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
            msg += `<br><a href="/updates" class="nw-guide-page-link">${currentLang === 'zh' ? '完整更新日誌' : currentLang === 'th' ? 'บันทึกแพทช์ทั้งหมด' : 'Full Patch Notes'}</a>`;
            addMessage(msg);
        } else {
            // Fallback: show new features
            const newFeatures = {
                en: '🆕 <strong>Latest Features</strong><br><br><strong>Avatar Studio</strong> - Generate AI maple avatars! <a href="/avatar-studio" class="nw-guide-page-link new">/avatar-studio</a><br><strong>Guild Court</strong> - Sue your guildmates! <a href="/court" class="nw-guide-page-link new">/court</a><br><strong>Guild Therapy</strong> - AI therapist <a href="/therapy" class="nw-guide-page-link new">/therapy</a><br><strong>HR Department</strong> - Apply for jobs <a href="/hr" class="nw-guide-page-link new">/hr</a><br><strong>Conspiracy Board</strong> - Connect the dots <a href="/conspiracy" class="nw-guide-page-link new">/conspiracy</a>',
                zh: '🆕 <strong>最新功能</strong><br><br><strong>頭像工作室</strong> - 生成AI楓之谷頭像！ <a href="/avatar-studio" class="nw-guide-page-link new">/avatar-studio</a><br><strong>公會法院</strong> - 告你的隊友！ <a href="/court" class="nw-guide-page-link new">/court</a><br><strong>公會療程</strong> - AI治療師 <a href="/therapy" class="nw-guide-page-link new">/therapy</a><br><strong>人事部</strong> - 申請職位 <a href="/hr" class="nw-guide-page-link new">/hr</a><br><strong>陰謀板</strong> - 連接線索 <a href="/conspiracy" class="nw-guide-page-link new">/conspiracy</a>',
                th: '🆕 <strong>ฟีเจอร์ใหม่</strong><br><br><strong>Avatar Studio</strong> - สร้างอวาตาร์เมเปิ้ล AI! <a href="/avatar-studio" class="nw-guide-page-link new">/avatar-studio</a><br><strong>ศาลกิลด์</strong> - ฟ้องเพื่อนกิลด์! <a href="/court" class="nw-guide-page-link new">/court</a><br><strong>การบำบัดกิลด์</strong> - นักบำบัด AI <a href="/therapy" class="nw-guide-page-link new">/therapy</a><br><strong>ฝ่ายบุคคล</strong> - สมัครงาน <a href="/hr" class="nw-guide-page-link new">/hr</a><br><strong>บอร์ดสมคบคิด</strong> - เชื่อมจุด <a href="/conspiracy" class="nw-guide-page-link new">/conspiracy</a>'
            };
            addMessage(newFeatures[currentLang] || newFeatures.en);
        }
        showContextualSuggestions();
    }

    function respondWithTips(specificPath = null) {
        const path = specificPath || window.location.pathname;
        const tips = getPageTips(path);
        
        // Show all tips for the page
        let msg = `<strong>${currentLang === 'zh' ? '提示' : currentLang === 'th' ? 'เคล็ดลับ' : 'Tips'}</strong> for this page:<br><br>`;
        tips.forEach((tip, i) => {
            msg += `${i + 1}. ${tip}<br>`;
        });
        
        addMessage(msg);
        showContextualSuggestions();
    }

    function respondWithRecommendations() {
        const recommendations = getSmartRecommendations();
        const headerText = {
            en: "Based on your interests:",
            zh: "根據你的興趣：",
            th: "ตามความสนใจของคุณ:"
        };
        
        if (recommendations.length === 0) {
            // No history, show popular pages
            const popularText = {
                en: "Try these popular pages:",
                zh: "試試這些熱門頁面：",
                th: "ลองหน้ายอดนิยมเหล่านี้:"
            };
            const popular = ['avatarStudio', 'forge', 'court', 'arcade'];
            const list = popular
                .map(key => {
                    const p = getPageInfo(key);
                    if (!p) return '';
                    return `<a href="${p.path}" class="nw-guide-page-link">${p.emoji} ${p.name}</a>`;
                })
                .filter(Boolean)
                .join(' ');
            addMessage(`${popularText[currentLang]}<br><br>${list}`);
        } else {
            const list = recommendations
                .map(p => {
                    const isNew = p.category === 'absurdist' || p.category === 'creative';
                    return `<a href="${p.path}" class="nw-guide-page-link${isNew ? ' new' : ''}">${p.emoji} ${p.name}</a>`;
                })
                .join(' ');
            addMessage(`${headerText[currentLang]}<br><br>${list}`);
        }
        
        showContextualSuggestions();
    }

    function respondWithHelp() {
        addMessage(t('help').replace(/\n/g, '<br>'));
        showContextualSuggestions();
    }

    // ==================== INPUT PROCESSING ====================
    function processInput(input) {
        const lower = input.toLowerCase().trim();
        
        // Don't echo if it's a chip action
        if (!lower.startsWith('tips ')) {
            addMessage(input, false);
        }

        setTimeout(() => {
            // Check for specific tips request
            if (lower.startsWith('tips ') || lower.startsWith('提示 ') || lower.startsWith('เคล็ดลับ ')) {
                const pathMatch = lower.match(/tips\s+(\S+)/i) || lower.match(/提示\s+(\S+)/) || lower.match(/เคล็ดลับ\s+(\S+)/);
                if (pathMatch) {
                    respondWithTips(pathMatch[1]);
                    return;
                }
            }
            
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
            else if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('for me') ||
                     lower.includes('推薦') || lower.includes('建議') ||
                     lower.includes('แนะนำ') || lower.includes('สำหรับฉัน')) {
                respondWithRecommendations();
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
            else if (lower === 'tips' || lower.includes('tip') || lower.includes('hint') || lower.includes('learn more') ||
                     lower.includes('提示') || lower.includes('了解更多') ||
                     lower.includes('เคล็ดลับ') || lower.includes('เรียนรู้เพิ่มเติม')) {
                respondWithTips();
            }
            else if (lower.includes('language') || lower.includes('lang') || lower === '' ||
                     lower.includes('語言') || lower.includes('ภาษา')) {
                showLanguageOptions();
            }
            else if (lower.match(/^(hi|hey|hello|yo|sup|哈囉|你好|嗨|สวัสดี)/)) {
                addMessage(tRandom('greetings'));
                showContextualSuggestions();
            }
            else {
                // ============================================
                // REAL AI INTEGRATION!
                // If we can't match a command, ask the AI
                // ============================================
                if (aiEnabled && isAiAvailable) {
                    askAI(input);
                } else {
                    // Fallback to rule-based confused response
                    addMessage(tRandom('confused'));
                    showSuggestions([
                        { label: guideI18n.chips.showPages[currentLang], value: 'show all pages' },
                        { label: guideI18n.chips.newFeatures[currentLang], value: 'new features', isNew: true },
                        { label: guideI18n.chips.recommend[currentLang], value: 'recommend', isRecommend: true }
                    ]);
                }
            }
        }, 300);
    }
    
    // ==================== AI CHAT FUNCTION ====================
    // This is where the magic happens!
    // We send the user's message to our AI API and stream the response
    
    async function askAI(message) {
        // Show typing indicator
        const typingId = showTypingIndicator();
        
        try {
            // Prepare context from viewing history
            const recentPages = getRecentPages(3);
            const userContext = {
                viewingHistory: recentPages
            };
            
            // Get currencies from localStorage if available
            try {
                const walletData = JSON.parse(localStorage.getItem('nw_wallet') || '{}');
                if (walletData.currencies) {
                    userContext.currencies = walletData.currencies;
                }
            } catch (e) {}
            
            // Try streaming first for better UX
            const response = await fetch('/api/guide/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    conversationHistory: conversationHistory.slice(-MAX_CONVERSATION_HISTORY),
                    language: currentLang,
                    currentPage: window.location.pathname,
                    userContext
                })
            });
            
            // Remove typing indicator
            removeTypingIndicator(typingId);
            
            if (!response.ok) {
                throw new Error('AI request failed');
            }
            
            // Handle streaming response
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No reader available');
            }
            
            const decoder = new TextDecoder();
            let fullMessage = '';
            let messageElement = null;
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
                
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.done) {
                            // Streaming complete
                            break;
                        }
                        
                        if (data.content) {
                            fullMessage += data.content;
                            
                            // Create or update message element
                            if (!messageElement) {
                                messageElement = createStreamingMessage();
                            }
                            
                            // Clean action tags from display but keep them for parsing
                            const cleanedMessage = cleanActionTags(fullMessage);
                            
                            // Update with markdown-like formatting (without action tags)
                            messageElement.innerHTML = formatAIResponse(cleanedMessage);
                            
                            // Scroll to bottom
                            const container = document.getElementById('nw-guide-messages');
                            if (container) container.scrollTop = container.scrollHeight;
                        }
                        
                        // PHASE 4: Handle actions sent directly from backend
                        if (data.actions && Array.isArray(data.actions) && data.actions.length > 0) {
                            console.log('[NW_GUIDE] Actions received from backend:', data.actions);
                            // Small delay so user can read the message first
                            setTimeout(() => {
                                ActionExecutor.executeAll(data.actions);
                            }, 800);
                        }
                        
                        if (data.error) {
                            console.error('[NW_GUIDE] AI Error:', data.error);
                        }
                    } catch (e) {
                        // Skip malformed JSON
                    }
                }
            }
            
            // Parse and execute any actions from the response
            const actions = parseActionsFromText(fullMessage);
            if (actions.length > 0) {
                console.log('[NW_GUIDE] Found actions in response:', actions);
                // Delay action execution slightly so user can read the message
                setTimeout(() => {
                    ActionExecutor.executeAll(actions);
                }, 800);
            }
            
            // Save to conversation history (cleaned version)
            conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: cleanActionTags(fullMessage) }
            );
            
            // Trim history if too long
            if (conversationHistory.length > MAX_CONVERSATION_HISTORY * 2) {
                conversationHistory = conversationHistory.slice(-MAX_CONVERSATION_HISTORY * 2);
            }
            
            // Show follow-up suggestions
            showContextualSuggestions();
            
        } catch (error) {
            console.error('[NW_GUIDE] AI Error:', error);
            removeTypingIndicator(typingId);
            
            // Fallback to rule-based response
            addMessage(tRandom('confused'));
            showSuggestions([
                { label: guideI18n.chips.showPages[currentLang], value: 'show all pages' },
                { label: guideI18n.chips.newFeatures[currentLang], value: 'new features', isNew: true },
                { label: guideI18n.chips.recommend[currentLang], value: 'recommend', isRecommend: true }
            ]);
        }
    }
    
    // Create a message element for streaming
    function createStreamingMessage() {
        const container = document.getElementById('nw-guide-messages');
        if (!container) return null;
        
        const msg = document.createElement('div');
        msg.className = 'nw-guide-msg bot streaming';
        msg.innerHTML = '<span class="typing-cursor">|</span>';
        container.appendChild(msg);
        return msg;
    }
    
    // Show typing indicator
    function showTypingIndicator() {
        const container = document.getElementById('nw-guide-messages');
        if (!container) return null;
        
        const id = 'typing-' + Date.now();
        const indicator = document.createElement('div');
        indicator.id = id;
        indicator.className = 'nw-guide-msg bot typing-indicator';
        indicator.innerHTML = `
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        `;
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
        return id;
    }
    
    // Remove typing indicator
    function removeTypingIndicator(id) {
        if (!id) return;
        const indicator = document.getElementById(id);
        if (indicator) indicator.remove();
    }
    
    // Format AI response with markdown-like formatting
    function formatAIResponse(text) {
        return text
            // Bold: **text** or __text__
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/__([^_]+)__/g, '<strong>$1</strong>')
            // Italic: *text* or _text_
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/_([^_]+)_/g, '<em>$1</em>')
            // Links: [text](url) - make them clickable
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="nw-guide-page-link">$1</a>')
            // Page paths: /path - make them clickable
            .replace(/(?<!href=")(\/[a-z-]+)(?![a-z-])/gi, '<a href="$1" class="nw-guide-page-link">$1</a>')
            // Line breaks
            .replace(/\n/g, '<br>');
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
            // Click for desktop
            freshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                sendMessage();
            });
            // Touch for mobile - use touchend with passive: false
            freshBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                sendMessage();
            }, { passive: false });
        }
        
        if (freshInput) {
            freshInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                }
            });
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
        // Track current page view
        trackPageView(window.location.pathname);
        
        const { toggle, chat } = createChatUI();
        let isOpen = false;

        // Toggle click for desktop
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggleChat();
        });
        
        // Toggle touch for mobile
        toggle.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleChat();
        }, { passive: false });
        
        function toggleChat() {
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
        }

        bindInputEvents();

        // Chip clicks - use event delegation on the suggestions container
        const suggestionsContainer = document.getElementById('nw-guide-suggestions');
        if (suggestionsContainer) {
            // Click for desktop
            suggestionsContainer.addEventListener('click', (e) => {
                handleChipClick(e);
            });
            // Touch for mobile
            suggestionsContainer.addEventListener('touchend', (e) => {
                e.preventDefault();
                handleChipClick(e);
            }, { passive: false });
        }
        
        function handleChipClick(e) {
            const chip = e.target.closest('.nw-guide-chip');
            if (!chip) return;
            
            const action = chip.dataset.action;
            const value = chip.dataset.value;
            
            console.log('[NW_GUIDE] Chip activated:', { action, value });
            
            if (action === 'lang') {
                showLanguageOptions();
            } else if (action === 'setlang') {
                setLanguage(value);
            } else if (value) {
                processInput(value);
            }
        }

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
            if ((e.key === 'nw_lang' || e.key === 'lang') && e.newValue !== currentLang) {
                currentLang = e.newValue || 'en';
                const chatEl = document.getElementById('nw-guide-chat');
                if (chatEl) {
                    updateChatHTML(chatEl);
                    bindInputEvents();
                }
            }
        });

        // Listen for config updates
        window.addEventListener('nw-config-update', () => {
            console.log('[NW_GUIDE] Config updated, refreshing data...');
        });
        
        // Track page views on navigation
        window.addEventListener('popstate', () => {
            trackPageView(window.location.pathname);
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
                bindInputEvents();
            }
            console.log('[NW_GUIDE] Language updated to:', newLang);
        }
    });

    console.log('%c[NW_GUIDE] v6.0 - ACTION EDITION! AI can navigate, claim rewards, and more!', 
        'background: #1a1a2e; color: #ff6b00; font-size: 12px; padding: 4px 8px; border-radius: 4px;');
    
    // Expose ActionExecutor globally for debugging
    window.NW_GUIDE_ACTIONS = ActionExecutor;
    
    // Check AI availability on load
    checkAiAvailability();
})();
