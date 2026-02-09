/**
 * NW Achievements System
 * Unlockable badges with celebration animations
 */

const NW_ACHIEVEMENTS = {
    version: '1.0.0',
    
    // All possible achievements
    definitions: {
        // Collection
        'first_card': { icon: '🃏', name: { en: 'First Pull', zh: '首抽', th: 'การ์ดแรก' }, desc: { en: 'Open your first pack', zh: '開啟第一個卡包', th: 'เปิดแพ็คแรก' }, secret: false },
        'collector_10': { icon: '', name: { en: 'Collector', zh: '收藏家', th: 'นักสะสม' }, desc: { en: 'Own 10 unique cards', zh: '擁有10張不同卡片', th: 'มีการ์ด 10 ใบ' }, secret: false },
        'collector_50': { icon: '', name: { en: 'Curator', zh: '策展人', th: 'ภัณฑารักษ์' }, desc: { en: 'Own 50 unique cards', zh: '擁有50張不同卡片', th: 'มีการ์ด 50 ใบ' }, secret: false },
        'collector_100': { icon: '', name: { en: 'Completionist', zh: '完美主義者', th: 'นักสะสมครบ' }, desc: { en: 'Own 100 unique cards', zh: '擁有100張不同卡片', th: 'มีการ์ด 100 ใบ' }, secret: false },
        
        // Rarity
        'rare_first': { icon: '', name: { en: 'Rare Find', zh: '稀有發現', th: 'พบของหายาก' }, desc: { en: 'Pull your first rare', zh: '抽到第一張稀有', th: 'ได้การ์ดแรร์' }, secret: false },
        'epic_first': { icon: '', name: { en: 'Epic Moment', zh: '史詩時刻', th: 'ช่วงเวลาอิพิค' }, desc: { en: 'Pull your first epic', zh: '抽到第一張史詩', th: 'ได้การ์ดอีพิค' }, secret: false },
        'legendary_first': { icon: '', name: { en: 'Golden Touch', zh: '黃金之觸', th: 'สัมผัสทอง' }, desc: { en: 'Pull your first legendary', zh: '抽到第一張傳說', th: 'ได้การ์ดเลเจนด์' }, secret: false },
        'mythic_first': { icon: '', name: { en: 'Myth Becomes Real', zh: '神話成真', th: 'ตำนานเป็นจริง' }, desc: { en: 'Pull a mythic card', zh: '抽到神話卡', th: 'ได้การ์ดมิธิค' }, secret: false },
        
        // Battle
        'first_win': { icon: '', name: { en: 'Victor', zh: '勝利者', th: 'ผู้ชนะ' }, desc: { en: 'Win your first battle', zh: '贏得第一場戰鬥', th: 'ชนะครั้งแรก' }, secret: false },
        'wins_10': { icon: '', name: { en: 'Warrior', zh: '戰士', th: 'นักรบ' }, desc: { en: 'Win 10 battles', zh: '贏得10場戰鬥', th: 'ชนะ 10 ครั้ง' }, secret: false },
        'wins_50': { icon: '', name: { en: 'Champion', zh: '冠軍', th: 'แชมป์' }, desc: { en: 'Win 50 battles', zh: '贏得50場戰鬥', th: 'ชนะ 50 ครั้ง' }, secret: false },
        'wins_100': { icon: '', name: { en: 'Legend', zh: '傳奇', th: 'ตำนาน' }, desc: { en: 'Win 100 battles', zh: '贏得100場戰鬥', th: 'ชนะ 100 ครั้ง' }, secret: false },
        'streak_5': { icon: '', name: { en: 'On Fire', zh: '火熱連勝', th: 'ไฟลุก' }, desc: { en: '5 win streak', zh: '5連勝', th: 'ชนะติดต่อ 5' }, secret: false },
        'streak_10': { icon: '', name: { en: 'Unstoppable', zh: '勢不可擋', th: 'หยุดไม่ได้' }, desc: { en: '10 win streak', zh: '10連勝', th: 'ชนะติดต่อ 10' }, secret: false },
        
        // Economy
        'nwg_1000': { icon: '', name: { en: 'Saver', zh: '儲蓄者', th: 'นักออม' }, desc: { en: 'Accumulate 1,000 NWG', zh: '累積1,000 NWG', th: 'สะสม 1,000 NWG' }, secret: false },
        'nwg_10000': { icon: '', name: { en: 'Rich', zh: '富有', th: 'รวย' }, desc: { en: 'Accumulate 10,000 NWG', zh: '累積10,000 NWG', th: 'สะสม 10,000 NWG' }, secret: false },
        'nwg_100000': { icon: '', name: { en: 'Whale', zh: '鯨魚', th: 'ปลาวาฬ' }, desc: { en: 'Accumulate 100,000 NWG', zh: '累積100,000 NWG', th: 'สะสม 100,000 NWG' }, secret: false },
        
        // Engagement
        'login_7': { icon: '', name: { en: 'Dedicated', zh: '忠誠', th: 'ทุ่มเท' }, desc: { en: '7-day login streak', zh: '7天連續登入', th: 'ล็อกอิน 7 วัน' }, secret: false },
        'login_30': { icon: '', name: { en: 'Committed', zh: '堅定', th: 'มุ่งมั่น' }, desc: { en: '30-day login streak', zh: '30天連續登入', th: 'ล็อกอิน 30 วัน' }, secret: false },
        'embassy_visit': { icon: '', name: { en: 'Diplomat', zh: '外交官', th: 'นักการทูต' }, desc: { en: 'Claim embassy reward', zh: '領取大使館獎勵', th: 'รับรางวัลสถานทูต' }, secret: false },
        
        // Upgrades
        'first_upgrade': { icon: '', name: { en: 'Upgrader', zh: '升級者', th: 'นักอัพเกรด' }, desc: { en: 'Upgrade your first card', zh: '升級第一張卡', th: 'อัพเกรดการ์ดแรก' }, secret: false },
        'max_star': { icon: '', name: { en: 'Perfectionist', zh: '完美主義', th: 'สมบูรณ์แบบ' }, desc: { en: 'Max out a card (5)', zh: '滿星卡片(5)', th: 'การ์ด 5' }, secret: false },
        'first_burn': { icon: '', name: { en: 'Sacrifice', zh: '獻祭', th: 'สังเวย' }, desc: { en: 'Burn a card for logs', zh: '燒卡換原木', th: 'เผาการ์ดเอา logs' }, secret: false },
        
        // Secret / Easter eggs
        'lucky_47': { icon: '', name: { en: 'Lucky 47', zh: '幸運47', th: 'โชคดี 47' }, desc: { en: '???', zh: '???', th: '???' }, secret: true },
        'regina_fan': { icon: '', name: { en: 'RegginA Stan', zh: 'RegginA粉', th: 'แฟน RegginA' }, desc: { en: 'Own all RegginA cards', zh: '擁有所有RegginA卡', th: 'มีการ์ด RegginA ทั้งหมด' }, secret: true },
        'night_owl': { icon: '', name: { en: 'Night Owl', zh: '夜貓子', th: 'นกฮูก' }, desc: { en: 'Play at 3 AM', zh: '凌晨3點玩', th: 'เล่นตอนตี 3' }, secret: true },
        'og_member': { icon: '', name: { en: 'OG', zh: '元老', th: 'OG' }, desc: { en: 'Joined before Season 2', zh: '第二季前加入', th: 'เข้าร่วมก่อน Season 2' }, secret: true },
    },
    
    // Get unlocked achievements from storage
    getUnlocked() {
        return JSON.parse(localStorage.getItem('nw_achievements') || '[]');
    },
    
    // Check if achievement is unlocked
    isUnlocked(id) {
        return this.getUnlocked().includes(id);
    },
    
    // Unlock an achievement
    unlock(id) {
        if (this.isUnlocked(id)) return false;
        
        const def = this.definitions[id];
        if (!def) return false;
        
        const unlocked = this.getUnlocked();
        unlocked.push(id);
        localStorage.setItem('nw_achievements', JSON.stringify(unlocked));
        
        // Dispatch event for UI
        window.dispatchEvent(new CustomEvent('nw-achievement-unlocked', { 
            detail: { id, ...def } 
        }));
        
        // Show celebration
        this.celebrate(id, def);
        
        console.log(`Achievement unlocked: ${def.name.en}`);
        return true;
    },
    
    // Celebration animation
    celebrate(id, def) {
        const lang = localStorage.getItem('nw_lang') || 'en';
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'achievement-celebration';
        overlay.innerHTML = `
            <style>
                #achievement-celebration {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.85);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100000;
                    animation: achFadeIn 0.3s ease;
                }
                @keyframes achFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .ach-card {
                    background: linear-gradient(145deg, #1a1a2e, #0d0d15);
                    border: 2px solid #ffd700;
                    border-radius: 24px;
                    padding: 40px;
                    text-align: center;
                    max-width: 360px;
                    animation: achPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 0 60px rgba(255,215,0,0.3);
                }
                @keyframes achPop {
                    0% { transform: scale(0.5); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .ach-icon {
                    font-size: 80px;
                    margin-bottom: 20px;
                    animation: achBounce 0.6s ease infinite alternate;
                }
                @keyframes achBounce {
                    from { transform: translateY(0); }
                    to { transform: translateY(-10px); }
                }
                .ach-label {
                    font-size: 12px;
                    color: #ffd700;
                    letter-spacing: 4px;
                    margin-bottom: 8px;
                }
                .ach-name {
                    font-family: 'NumbahWan', 'Orbitron', sans-serif;
                    font-size: 28px;
                    color: #fff;
                    margin-bottom: 12px;
                }
                .ach-desc {
                    font-size: 14px;
                    color: rgba(255,255,255,0.7);
                    margin-bottom: 24px;
                }
                .ach-btn {
                    background: linear-gradient(135deg, #ffd700, #ff9500);
                    color: #000;
                    border: none;
                    padding: 14px 40px;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                .ach-btn:hover {
                    transform: scale(1.05);
                }
                .particles {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    overflow: hidden;
                }
                .particle {
                    position: absolute;
                    font-size: 24px;
                    animation: particleFall 2s ease-out forwards;
                }
                @keyframes particleFall {
                    0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
            </style>
            <div class="particles" id="achParticles"></div>
            <div class="ach-card">
                <div class="ach-label">ACHIEVEMENT UNLOCKED</div>
                <div class="ach-icon">${def.icon}</div>
                <div class="ach-name">${def.name[lang] || def.name.en}</div>
                <div class="ach-desc">${def.secret ? '???' : (def.desc[lang] || def.desc.en)}</div>
                <button class="ach-btn" onclick="document.getElementById('achievement-celebration').remove()">
                    AWESOME!
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Particle effects
        const particles = document.getElementById('achParticles');
        const emojis = ['', '', '', '', '', def.icon];
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 0.5 + 's';
            particles.appendChild(p);
        }
        
        // Play sound if available
        if (typeof NW_SOUNDS !== 'undefined') {
            NW_SOUNDS.play('achievement');
        }
        
        // Auto-close after 5s
        setTimeout(() => {
            overlay.style.animation = 'achFadeIn 0.3s ease reverse';
            setTimeout(() => overlay.remove(), 300);
        }, 5000);
    },
    
    // Check all achievements based on current state
    checkAll() {
        if (typeof NW_WALLET === 'undefined') return;
        
        const wallet = NW_WALLET.wallet;
        if (!wallet) return;
        
        const cards = wallet.collection?.length || 0;
        const nwg = NW_WALLET.getBalance('nwg') || 0;
        const battleStats = JSON.parse(localStorage.getItem('nw_battle_stats') || '{}');
        const wins = battleStats.wins || 0;
        const streak = battleStats.currentStreak || 0;
        const bestStreak = battleStats.bestStreak || 0;
        const dailyState = NW_WALLET.getDailyLoginState?.() || {};
        
        // Collection
        if (cards >= 1) this.unlock('first_card');
        if (cards >= 10) this.unlock('collector_10');
        if (cards >= 50) this.unlock('collector_50');
        if (cards >= 100) this.unlock('collector_100');
        
        // Battle
        if (wins >= 1) this.unlock('first_win');
        if (wins >= 10) this.unlock('wins_10');
        if (wins >= 50) this.unlock('wins_50');
        if (wins >= 100) this.unlock('wins_100');
        if (bestStreak >= 5) this.unlock('streak_5');
        if (bestStreak >= 10) this.unlock('streak_10');
        
        // Economy
        if (nwg >= 1000) this.unlock('nwg_1000');
        if (nwg >= 10000) this.unlock('nwg_10000');
        if (nwg >= 100000) this.unlock('nwg_100000');
        
        // Login
        if (dailyState.currentStreak >= 7) this.unlock('login_7');
        if (dailyState.currentStreak >= 30) this.unlock('login_30');
        
        // Night owl (secret)
        const hour = new Date().getHours();
        if (hour >= 2 && hour <= 4) this.unlock('night_owl');
        
        // Lucky 47 (secret)
        if (nwg === 47 || cards === 47 || wins === 47) this.unlock('lucky_47');
    },
    
    // Get achievement progress for display
    getProgress() {
        const unlocked = this.getUnlocked();
        const total = Object.keys(this.definitions).length;
        const visible = Object.entries(this.definitions).filter(([_, d]) => !d.secret).length;
        const unlockedVisible = unlocked.filter(id => !this.definitions[id]?.secret).length;
        const unlockedSecret = unlocked.filter(id => this.definitions[id]?.secret).length;
        
        return {
            unlocked: unlocked.length,
            total,
            visible,
            unlockedVisible,
            unlockedSecret,
            percent: Math.round((unlocked.length / total) * 100)
        };
    },
    
    // Get all achievements for display
    getAll() {
        const unlocked = this.getUnlocked();
        const lang = localStorage.getItem('nw_lang') || 'en';
        
        return Object.entries(this.definitions).map(([id, def]) => ({
            id,
            ...def,
            name: def.name[lang] || def.name.en,
            desc: def.desc[lang] || def.desc.en,
            unlocked: unlocked.includes(id)
        }));
    }
};

// Auto-check on wallet ready
window.addEventListener('nw-wallet-ready', () => {
    setTimeout(() => NW_ACHIEVEMENTS.checkAll(), 1000);
});

// Export
if (typeof window !== 'undefined') {
    window.NW_ACHIEVEMENTS = NW_ACHIEVEMENTS;
}

console.log('[NW_ACHIEVEMENTS] Loaded v' + NW_ACHIEVEMENTS.version);
