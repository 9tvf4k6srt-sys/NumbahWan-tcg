// ═══════════════════════════════════════════════════════════════════════
// NUMBAHWAN TCG — CARDS PAGE (extracted from cards.html inline script)
// 10-season card browser with carousel, filters, modals, i18n
// Extracted to reduce cards.html fragility (10x broken, danger 85)
// ═══════════════════════════════════════════════════════════════════════

(function() {
'use strict';

// ===========================================================================
// 10-SEASON CARD DATA SYSTEM
// ===========================================================================
let DATA = []; // Current season's cards
let currentSeason = 1;
let SEASONS_DATA = null; // Loaded from seasons.json

// Season file mapping - ALL 10 SEASONS ARE NOW BROWSABLE!
const SEASON_FILES = {
    1: '/static/data/cards-v2.json',
    2: '/static/data/cards-s2.json',
    3: '/static/data/cards-s3.json',
    4: '/static/data/cards-s4.json',
    5: '/static/data/cards-s5.json',
    6: '/static/data/cards-s6.json',
    7: '/static/data/cards-s7.json',
    8: '/static/data/cards-s8.json',
    9: '/static/data/cards-s9.json',
    10: '/static/data/cards-s10.json'
};

const IMAGE_BASE_PATH = '/static/images/cards/thumbs/';
const IMAGE_FULL_PATH = '/static/images/cards/';

// Placeholder images by rarity (for seasons without real art)
const PLACEHOLDER_BY_RARITY = {
    mythic: '01-reggina-mythic.webp',
    legendary: '02-harlay-legendary.webp',
    epic: '09-late-night-grind-epic.webp',
    rare: '20-guild-tryouts-rare.webp',
    uncommon: '40-casual-member-uncommon.webp',
    common: '60-server-lag-common.webp'
};

// Load seasons metadata
async function loadSeasonsData() {
    try {
        const res = await fetch('/static/data/seasons.json?v=' + Date.now());
        SEASONS_DATA = await res.json();
        console.log(`[Seasons] Loaded ${SEASONS_DATA.seasons.length} seasons`);
        buildSeasonSelector();
        return SEASONS_DATA;
    } catch (e) {
        console.error('Failed to load seasons:', e);
        return null;
    }
}

// Build the season selector UI
function buildSeasonSelector() {
    const scroll = document.getElementById('seasonScroll');
    if (!scroll || !SEASONS_DATA) return;
    
    // Get local i18n season data for names
    const localSeasons = SEASON_I18N;
    
    scroll.innerHTML = SEASONS_DATA.seasons.map(s => {
        // ALL seasons are now browsable - no more "coming-soon" class
        const isCurrent = s.id === currentSeason;
        const classes = ['season-btn'];
        if (isCurrent) classes.push('active');
        // Season 3+ shows preview badge instead of locked state
        if (s.id >= 3) classes.push('preview');
        
        // Get localized name from local i18n data
        const localData = localSeasons[s.id];
        const name = localData?.name?.[lang] || s.name;
        const displayName = name.length > 8 ? name.substring(0,7) + '…' : name;
        
        return `
            <button class="${classes.join(' ')}" data-season="${s.id}" style="--season-color: ${s.color}">
                <span class="season-num">S${s.id}</span>
                <span class="season-icon">${localData?.icon || s.icon}</span>
                <span class="season-name" data-season-id="${s.id}">${displayName}</span>
            </button>
        `;
    }).join('');
    
    // Bind click events
    scroll.querySelectorAll('.season-btn').forEach(btn => {
        btn.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: true });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const season = parseInt(btn.dataset.season);
            switchSeason(season);
        }, { capture: true });
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const season = parseInt(btn.dataset.season);
            switchSeason(season);
        });
    });
    
    // Scroll to active season
    setTimeout(() => {
        const activeBtn = scroll.querySelector('.season-btn.active');
        if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
}

// Show Coming Soon overlay for a season
function showComingSoon(seasonId) {
    const season = SEASONS_DATA?.seasons.find(s => s.id === seasonId);
    if (!season) return;
    
    // Get local i18n data for this season
    const localData = SEASON_I18N[seasonId];
    
    const overlay = document.getElementById('comingSoonOverlay');
    // Localized "SEASON X" label
    const seasonLabel = lang === 'zh' ? `第 ${season.id} 赛季` : (lang === 'th' ? `ซีซั่น ${season.id}` : `SEASON ${season.id}`);
    document.getElementById('csSeasonNum').textContent = seasonLabel;
    document.getElementById('csIcon').textContent = localData?.icon || season.icon;
    
    // Localized name and subtitle
    const name = localData?.name?.[lang] || season.name;
    const subtitle = localData?.subtitle?.[lang] || season.subtitle;
    const teaser = localData?.teaser?.[lang] || season.teaser;
    
    document.getElementById('csTitle').textContent = name;
    document.getElementById('csTitle').style.background = season.bgGradient;
    document.getElementById('csTitle').style.webkitBackgroundClip = 'text';
    document.getElementById('csTitle').style.webkitTextFillColor = 'transparent';
    document.getElementById('csSubtitle').textContent = subtitle;
    document.getElementById('csTeaser').textContent = teaser ? `"${teaser}"` : '';
    
    // Mythics - use local i18n data if available, otherwise fallback to JSON
    const mythics = localData?.mythics || season.mythics || [];
    const mythicsEl = document.getElementById('csMythics');
    mythicsEl.innerHTML = mythics.map(m => `
        <div class="cs-mythic">
            <span class="cs-mythic-icon"></span>
            <span class="cs-mythic-name">${m}</span>
        </div>
    `).join('');
    
    // Mechanics - use local i18n data if available
    const mechanics = localData?.mechanics || season.mechanics || [];
    const mechEl = document.getElementById('csMechanics');
    mechEl.innerHTML = mechanics.map(m => `
        <span class="cs-mechanic">${m}</span>
    `).join('');
    
    // Release date with i18n
    const release = new Date(season.releaseDate);
    const monthsI18n = {
        en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        zh: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
        th: ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    };
    const months = monthsI18n[lang] || monthsI18n.en;
    const comingText = lang === 'zh' ? '发布于' : (lang === 'th' ? 'เปิดตัว' : 'Coming');
    document.getElementById('csRelease').textContent = `${comingText} ${months[release.getMonth()]} ${release.getFullYear()}`;
    
    // Lore
    const loreEl = document.getElementById('csLore');
    loreEl.textContent = season.lore || '';
    loreEl.style.borderColor = season.color;
    
    overlay.classList.add('show');
    
    // Hide carousel elements
    document.getElementById('carousel').style.display = 'none';
    document.getElementById('nameBanner').style.display = 'none';
    document.querySelector('.filters').style.display = 'none';
    document.querySelector('.nav-wrap').style.display = 'none';
    document.getElementById('hint').style.display = 'none';
    document.querySelector('.ctr').style.display = 'none';
}

// Hide Coming Soon overlay
function hideComingSoon() {
    document.getElementById('comingSoonOverlay').classList.remove('show');
    document.getElementById('carousel').style.display = '';
    document.getElementById('nameBanner').style.display = '';
    document.querySelector('.filters').style.display = '';
    document.querySelector('.nav-wrap').style.display = '';
    document.getElementById('hint').style.display = '';
    document.querySelector('.ctr').style.display = '';
}

// Image path bases for different seasons
const S2_IMAGE_PATH = '/static/s2/';
const S2_THUMB_PATH = '/static/s2/thumbs/'; // Compressed thumbnails for fast loading

// Season 3-10 card art paths - thumbnails for carousel, full for modal
const SEASON_CARD_THUMBS = {
    3: '/static/images/cards/s3/thumbs/card-art.webp',
    4: '/static/images/cards/s4/thumbs/card-art.webp',
    5: '/static/images/cards/s5/thumbs/card-art.webp',
    6: '/static/images/cards/s6/thumbs/card-art.webp',
    7: '/static/images/cards/s7/thumbs/card-art.webp',
    8: '/static/images/cards/s8/thumbs/card-art.webp',
    9: '/static/images/cards/s9/thumbs/card-art.webp',
    10: '/static/images/cards/s10/thumbs/card-art.webp'
};
const SEASON_CARD_FULL = {
    3: '/static/images/cards/s3/card-art.webp',
    4: '/static/images/cards/s4/card-art.webp',
    5: '/static/images/cards/s5/card-art.webp',
    6: '/static/images/cards/s6/card-art.webp',
    7: '/static/images/cards/s7/card-art.webp',
    8: '/static/images/cards/s8/card-art.webp',
    9: '/static/images/cards/s9/card-art.webp',
    10: '/static/images/cards/s10/card-art.webp'
};

// Convert image filename to WebP thumbnail
function getThumbUrl(img, rarity = 'common', season = 1) {
    if (!img) return IMAGE_BASE_PATH + 'placeholder.webp';
    
    // Season 2 images - use compressed thumbnails for fast carousel loading
    if (img.startsWith('s2/')) {
        const filename = img.replace('s2/', '');
        return S2_THUMB_PATH + filename;
    }
    
    // Season 3-10 images - use optimized thumbnails for fast carousel loading
    const seasonMatch = img.match(/^s(\d+)\//);
    if (seasonMatch) {
        const seasonNum = parseInt(seasonMatch[1]);
        if (SEASON_CARD_THUMBS[seasonNum]) {
            return SEASON_CARD_THUMBS[seasonNum];
        }
    }
    
    return IMAGE_BASE_PATH + img.replace(/\.(png|jpg|jpeg)$/i, '.webp');
}
// Get full resolution image URL
function getFullUrl(img, rarity = 'common', season = 1) {
    if (!img) return IMAGE_FULL_PATH + 'placeholder.webp';
    
    // Season 2 images - use full resolution from /static/s2/
    if (img.startsWith('s2/')) {
        const filename = img.replace('s2/', '');
        return S2_IMAGE_PATH + filename;
    }
    
    // Season 3-10 images - use full resolution for modal view
    const seasonMatch = img.match(/^s(\d+)\//);
    if (seasonMatch) {
        const seasonNum = parseInt(seasonMatch[1]);
        if (SEASON_CARD_FULL[seasonNum]) {
            return SEASON_CARD_FULL[seasonNum];
        }
    }
    
    return IMAGE_FULL_PATH + img;
}

// Store raw card data for language switching
let RAW_CARDS_DATA = [];

// Load cards from JSON for specific season
async function loadCardsData(season = 1) {
    try {
        const file = SEASON_FILES[season] || SEASON_FILES[1];
        const response = await fetch(file + '?v=' + Date.now());
        const data = await response.json();
        
        // Store raw data for language switching
        RAW_CARDS_DATA = data.cards;
        
        DATA = data.cards.map(c => ({
            id: c.id,
            nameRaw: c.name, // Store raw name object for i18n
            name: typeof c.name === 'object' ? (c.name[lang] || c.name.en || c.name) : c.name,
            type: c.category || 'member',
            rarity: c.rarity,
            cost: c.gameStats?.cost || getRarityCost(c.rarity),
            stats: formatStats(c.gameStats) || getRarityStats(c.rarity, c.role),
            descRaw: c.description, // Store raw desc for i18n
            desc: typeof c.description === 'object' ? (c.description[lang] || c.description.en || '') : (c.description || ''),
            img: c.img,
            role: c.role,
            category: c.category,
            abilities: c.abilities || [],
            special: c.special,
            season: season,
            hasArt: c.hasArt !== false // Season 2 cards have hasArt flag
        }));
        console.log(`[Season ${season}] Loaded ${DATA.length} cards from ${file}`);
        return DATA;
    } catch (error) {
        console.error('Failed to load cards:', error);
        return [];
    }
}

// Format game stats for display
function formatStats(stats) {
    if (!stats) return null;
    return `ATK ${stats.atk || 0} | HP ${stats.hp || 0} | SPD ${stats.spd || 0}`;
}

// Switch to a different season
async function switchSeason(season) {
    // Update button states first
    document.querySelectorAll('.season-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.season) === season);
    });
    
    // Scroll to active button
    const activeBtn = document.querySelector(`.season-btn[data-season="${season}"]`);
    if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    
    // ALL seasons now have browsable cards!
    const seasonData = SEASONS_DATA?.seasons.find(s => s.id === season);
    
    // Hide Coming Soon overlay (all seasons are now browsable)
    hideComingSoon();
    
    if (season === currentSeason) return;
    
    // Update UI - show loading state
    document.querySelectorAll('.season-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.season) === season);
    });
    
    currentSeason = season;
    
    // Load new season data
    await loadCardsData(season);
    
    // Reset filter to 'all' and update cards array from new DATA
    filter = 'all';
    document.querySelectorAll('.filters button').forEach(b => b.classList.toggle('on', b.dataset.f === 'all'));
    
    // CRITICAL: Update the cards array from newly loaded DATA
    cards = [...DATA];
    
    // Reset position and re-render carousel with new cards
    pos = 0;
    vel = 0;
    render();
    updateNameBanner();
    console.log(`[Season ${season}] Switched! Now showing ${cards.length} cards`);
}

// Generate stats based on rarity
function getRarityCost(rarity) {
    const costs = { mythic: 10, legendary: 8, epic: 6, rare: 4, uncommon: 3, common: 2 };
    return costs[rarity] || 3;
}
function getRarityStats(rarity, role) {
    const baseStats = {
        mythic: 'ATK 12 | DEF 10 | SPECIAL',
        legendary: 'ATK 9 | DEF 8',
        epic: 'ATK 7 | DEF 6',
        rare: 'ATK 5 | DEF 5',
        uncommon: 'ATK 4 | DEF 4',
        common: 'ATK 3 | DEF 3'
    };
    return baseStats[rarity] || 'ATK 3 | DEF 3';
}

const i18n = {
    en: { type:'Type', rarity:'Rarity', cost:'Mana', stats:'Stats', hint:'Swipe to browse • Tap VIEW for details',
          member:'Member', moment:'Moment', gear:'Gear', vibe:'Vibe', spot:'Spot',
          mythic:'MYTHIC', legendary:'LEGENDARY', epic:'EPIC', rare:'RARE', uncommon:'UNCOMMON', common:'COMMON', 
          all:'ALL', view:'VIEW', guide:'Guide', comingSoon:'COMING SOON', cards:'cards', release:'Release' },
    zh: { type:'类型', rarity:'稀有度', cost:'法力', stats:'属性', hint:'滑动浏览 • 点击查看查看详情',
          member:'成员', moment:'时刻', gear:'装备', vibe:'氛围', spot:'地点',
          mythic:'神话', legendary:'传说', epic:'史诗', rare:'稀有', uncommon:'罕见', common:'普通', 
          all:'全部', view:'查看', guide:'攻略', comingSoon:'即将推出', cards:'张卡牌', release:'发布日期' },
    th: { type:'ประเภท', rarity:'ความหายาก', cost:'มานา', stats:'สถิติ', hint:'ปัดเพื่อเลือก • แตะดูรายละเอียด',
          member:'สมาชิก', moment:'ช่วงเวลา', gear:'อุปกรณ์', vibe:'บรรยากาศ', spot:'สถานที่',
          mythic:'ตำนาน', legendary:'ระดับตำนาน', epic:'มหากาพย์', rare:'หายาก', uncommon:'ไม่ธรรมดา', common:'ธรรมดา', 
          all:'ทั้งหมด', view:'ดู', guide:'คู่มือ', comingSoon:'เร็วๆ นี้', cards:'การ์ด', release:'วันวางจำหน่าย' },
    ja: { type:'タイプ', rarity:'レア度', cost:'マナ', stats:'ステータス', hint:'スワイプで閲覧 • タップで詳細を表示',
          member:'メンバー', moment:'モーメント', gear:'ギア', vibe:'バイブ', spot:'スポット',
          mythic:'神話', legendary:'伝説', epic:'エピック', rare:'レア', uncommon:'アンコモン', common:'コモン',
          all:'すべて', view:'表示', guide:'ガイド', comingSoon:'近日公開', cards:'カード', release:'リリース日' }
};

// Season i18n data with translations for all 10 seasons (separate from loaded SEASONS_DATA)
const SEASON_I18N = {
    1: { icon:'', name:{en:'Origins',zh:'起源',th:'ต้นกำเนิด'}, subtitle:{en:'The Birth of NumbahWan',zh:'NumbahWan的诞生',th:'กำเนิดของ NumbahWan'}, color:'#ff6b00', active:true },
    2: { icon:'', name:{en:'Hounds',zh:'猎犬',th:'หมาล่า'}, subtitle:{en:"Harlay's Pack Rises",zh:'哈雷的狗群崛起',th:'ฝูงสุนัขของฮาร์เลย์'}, color:'#8b4513', active:true },
    3: { icon:'', name:{en:'Cyber Siege',zh:'赛博围城',th:'ไซเบอร์ซีจ'}, subtitle:{en:'The Digital Uprising',zh:'数字起义',th:'การลุกฮือดิจิทัล'}, color:'#00ffff', teaser:{en:'Jack in. Fight back.',zh:'接入。反击。',th:'เข้าสู่ระบบ ต่อสู้กลับ'}, mythics:['MegaByte','RegginA.EXE'], mechanics:['HACK','FIREWALL','OVERCLOCK'] },
    4: { icon:'', name:{en:'Shadows',zh:'暗影领域',th:'อาณาจักรเงา'}, subtitle:{en:"The Lurker's Domain",zh:'潜伏者的领域',th:'อาณาจักรของผู้ซุ่ม'}, color:'#4a0080', teaser:{en:'What lurks in the shadows?',zh:'暗影中潜伏着什么？',th:'มีอะไรซ่อนในเงามืด?'}, mythics:['Lurker Supreme','Void Emperor'], mechanics:['LURK','SHADOW','VOID'] },
    5: { icon:'', name:{en:'Champions',zh:'冠军之战',th:'แชมเปี้ยนส์'}, subtitle:{en:'The Grand Arena',zh:'大竞技场',th:'สนามใหญ่'}, color:'#ffd700', teaser:{en:'Glory awaits the worthy.',zh:'荣耀等待着强者。',th:'เกียรติยศรอคอยผู้คู่ควร'}, mythics:['World Champion RegginA','The Final Boss'], mechanics:['COMBO','TOURNAMENT','MVP'] },
    6: { icon:'', name:{en:'Whale Wars',zh:'鲸鱼战争',th:'สงครามวาฬ'}, subtitle:{en:'Money Talks',zh:'金钱至上',th:'เงินคือพลัง'}, color:'#00d4aa', teaser:{en:'How much is victory worth?',zh:'胜利值多少钱？',th:'ชัยชนะมีค่าเท่าไหร่?'}, mythics:['Mega Whale Supreme','Golden RegginA'], mechanics:['PREMIUM','WHALE','P2W'] },
    7: { icon:'', name:{en:'Rage Quit',zh:'愤怒退出',th:'เลิกเล่น'}, subtitle:{en:'The Toxic Uprising',zh:'毒性起义',th:'การลุกฮือพิษ'}, color:'#ff0040', teaser:{en:"They're back. And angry.",zh:'他们回来了。而且很愤怒。',th:'พวกเขากลับมา และโกรธมาก'}, mythics:['Rage Incarnate','The Uninstaller'], mechanics:['RAGE','TILT','GRIEF'] },
    8: { icon:'', name:{en:'Reborn',zh:'传奇重生',th:'เกิดใหม่'}, subtitle:{en:'Heroes Return',zh:'英雄归来',th:'ฮีโร่กลับมา'}, color:'#ff69b4', teaser:{en:'Remember the legends.',zh:'记住传奇。',th:'จดจำตำนาน'}, mythics:['RegginA Ascended','Harlay Eternal'], mechanics:['LEGACY','ASCEND','NOSTALGIA'] },
    9: { icon:'', name:{en:'Multiverse',zh:'多元宇宙',th:'มัลติเวิร์ส'}, subtitle:{en:'Infinite Possibilities',zh:'无限可能',th:'ความเป็นไปได้ไม่สิ้นสุด'}, color:'#9400d3', teaser:{en:'Infinite guilds. One destiny.',zh:'无限公会。一个命运。',th:'กิลด์ไม่สิ้นสุด หนึ่งชะตา'}, mythics:['Multiverse RegginA','Reality Breaker'], mechanics:['PORTAL','ALTERNATE','PARADOX'] },
    10:{ icon:'', name:{en:'Final Dawn',zh:'最终黎明',th:'รุ่งอรุณสุดท้าย'}, subtitle:{en:'The Last Stand',zh:'最后的抵抗',th:'การยืนหยัดครั้งสุดท้าย'}, color:'#ff4500', teaser:{en:'This is not the end.',zh:'这不是结局。',th:'นี่ไม่ใช่จุดจบ'}, mythics:['RegginA Immortal','God of Server'], mechanics:['FINAL','ETERNAL','APOCALYPSE'] }
};

// Card name translations (mapped to actual card IDs from cards-v2.json)
const cardNames = {
    zh: {
        // Mythic (1, 101-107)
        1:"蕾吉娜·永恒之焰", 101:"蕾吉娜·练习生", 102:"蕾吉娜·不死锁链", 103:"蕾吉娜·炼狱战神",
        104:"蕾吉娜·天空霸主", 105:"蕾吉娜·圣骑士", 106:"战犬·哈雷", 107:"神圣之木",
        // Legendary (201-212)
        201:"雷吉诺·暗影指挥", 202:"燃尽·永恒肝帝", 203:"鲸福·无限预算", 204:"老兵·首日玩家",
        205:"织网者·戏剧纺织", 206:"挂机露娜·月下摸鱼", 207:"查德威克·绝对C位", 208:"麻吉·专业舔狗",
        209:"404·幽灵成员", 210:"凯伦·公会大妈", 211:"大写锁定·暴怒退游", 212:"大脑·理论家",
        // Epic (301-312)
        301:"灰盔·倦怠坦克", 302:"泽菲拉·翻盘女王", 303:"狐狐·毒舌大师", 304:"胖胖·不可撼动",
        305:"闪光·时尚灾难", 306:"狙击·抢人头王", 307:"嘟囔·麦克风静音", 308:"嗨皮·啦啦队长",
        309:"服务器崩溃", 310:"忍者抢装", 311:"深夜突袭", 312:"高级摸鱼",
        // Rare (401-412)
        401:"小新·萌新玩家", 402:"咕咕·鸽子王", 403:"独狼·单刷侠", 404:"氪金·课金战士",
        405:"补丁·修复专家", 406:"怀旧·老版本党", 407:"复读机·表情包王", 408:"时区·熬夜党",
        409:"每日签到", 410:"任务完成", 411:"背包已满", 412:"技能冷却",
        // Uncommon (501-518)
        501:"充电线", 502:"网络延迟", 503:"每日奖励", 504:"维护公告", 505:"挂机点",
        506:"自动战斗", 507:"一星差评", 508:"五星好评", 509:"Bug报告", 510:"更新日志",
        511:"新手礼包", 512:"老玩家回归", 513:"活动预告", 514:"限时商店", 515:"公会聊天",
        516:"好友申请", 517:"组队邀请", 518:"世界频道",
        // Common (601-623)
        601:"金币", 602:"经验值", 603:"体力", 604:"钻石", 605:"碎片",
        606:"材料", 607:"装备", 608:"技能书", 609:"强化石", 610:"抽卡券",
        611:"普通宝箱", 612:"银色宝箱", 613:"金色宝箱", 614:"彩虹宝箱", 615:"月卡",
        616:"小氪礼包", 617:"大氪礼包", 618:"巨氪礼包", 619:"限定皮肤", 620:"头像框",
        621:"称号", 622:"表情包", 623:"聊天气泡"
    },
    th: {
        // Mythic
        1:"เรจจิน่า เปลวไฟนิรันดร์", 101:"เรจจิน่า นักฝึกหัด", 102:"เรจจิน่า โซ่อมตะ", 103:"เรจจิน่า จอมสงครามนรก",
        104:"เรจจิน่า ราชาแห่งฟ้า", 105:"เรจจิน่า พาลาดินศักดิ์สิทธิ์", 106:"ฮาร์เลย์ สุนัขสงคราม", 107:"ท่อนไม้ศักดิ์สิทธิ์",
        // Legendary
        201:"เรจจิโน ผู้บัญชาเงา", 202:"เบิร์นเอาท์ นักเล่นตลอดกาล", 203:"เวลฟอร์ด งบไม่จำกัด", 204:"เวเทอรัน ผู้เล่นวันแรก",
        205:"เว็บวีฟเวอร์ จิ้งจอกดราม่า", 206:"ลูน่า AFK นักเอาหน้าพระจันทร์", 207:"แชดวิค แครี่สุดยอด", 208:"โมจิ ซิมป์ผู้ภักดี",
        209:"404 สมาชิกผี", 210:"คาเรน แม่กิลด์", 211:"CAPS_LOCK ออกด้วยโมโห", 212:"บิ๊กเบรน นักทฤษฎี",
        // Epic
        301:"กริมเฮล์ม แท้งค์หมดไฟ", 302:"เซฟิร่า ราชินีคัมแบ็ค", 303:"เฟนเนโกะ ปรมาจารย์ประชด", 304:"ชงค์ ไม่ขยับ",
        305:"กลิมเมอร์ หายนะแฟชั่น", 306:"สไนป์ ขโมยคิล", 307:"มัมเบิ้ลส์ ปิดไมค์", 308:"ไฮป์ เชียร์ลีดเดอร์",
        309:"เซิร์ฟเวอร์ล่ม", 310:"นินจาขโมยของ", 311:"เรดดึก", 312:"AFK ระดับสูง",
        // Rare
        401:"นู๊บบี้ มือใหม่", 402:"โนโชว์ เลื่อนนัด", 403:"หมาป่าเดียวดาย", 404:"วาฬจ่ายเงิน",
        405:"แพทช์ ผู้แก้บั๊ก", 406:"ถวิลหา เวอร์ชั่นเก่า", 407:"ก๊อปปี้ สติ๊กเกอร์สแปม", 408:"ไทม์โซน นักเล่นดึก",
        409:"เข้าสู่ระบบรายวัน", 410:"ภารกิจสำเร็จ", 411:"กระเป๋าเต็ม", 412:"คูลดาวน์สกิล",
        // Uncommon
        501:"สายชาร์จ", 502:"แลคเน็ต", 503:"รางวัลรายวัน", 504:"ประกาศปิดปรับปรุง", 505:"จุด AFK",
        506:"ออโต้แบทเทิล", 507:"รีวิว 1 ดาว", 508:"รีวิว 5 ดาว", 509:"รายงานบั๊ก", 510:"บันทึกอัพเดท",
        511:"แพ็คมือใหม่", 512:"ผู้เล่นเก่ากลับมา", 513:"ประกาศอีเวนต์", 514:"ร้านค้าจำกัดเวลา", 515:"แชทกิลด์",
        516:"คำขอเป็นเพื่อน", 517:"ชวนเข้าปาร์ตี้", 518:"แชทโลก",
        // Common
        601:"เหรียญทอง", 602:"ค่าประสบการณ์", 603:"พลังงาน", 604:"เพชร", 605:"เศษ",
        606:"วัสดุ", 607:"อุปกรณ์", 608:"หนังสือสกิล", 609:"หินเสริม", 610:"ตั๋วสุ่ม",
        611:"กล่องธรรมดา", 612:"กล่องเงิน", 613:"กล่องทอง", 614:"กล่องสายรุ้ง", 615:"บัตรรายเดือน",
        616:"แพ็คเล็ก", 617:"แพ็คใหญ่", 618:"แพ็คยักษ์", 619:"สกินจำกัด", 620:"กรอบโปรไฟล์",
        621:"ยศ", 622:"สติ๊กเกอร์", 623:"กรอบแชท"
    }
};

// Card description translations
const cardDescs = {
    zh: {
        1:"公会会长。所有盟友获得+2攻击力和燃烧光环，持续3回合。",
        2:"副会长。出场时抽2张牌。盟友获得+1速度。",
        3:"先制攻击。对受伤敌人造成双倍伤害。",
        4:"法术消耗减少1点。攻击前保持潜行。",
        5:"复活阵亡盟友，恢复50%生命值。",
        6:"造成6点伤害。若目标生命值<3，直接消灭。",
        7:"为盟友恢复3点生命值。",
        8:"对所有敌人造成4点伤害。",
        9:"此回合后额外获得一个回合。",
        10:"放逐一个敌人2回合。",
        11:"眩晕敌人1回合。抽1张牌。",
        12:"格挡盟友所受的下一次攻击。",
        13:"冻结所有敌人1回合。",
        14:"从牌组中随机召唤一个随从。",
        15:"造成2点伤害。",
        16:"死亡时生成两个史莱姆幼崽。",
        17:"远程攻击。不受反击伤害。",
        18:"潜行。潜行时攻击+2伤害。",
        19:"嘲讽。相邻盟友+1攻击力。",
        20:"使随机盟友+1/+1。",
        21:"冻结被攻击的敌人。",
        22:"嘲讽。圣盾。每回合治疗2点。",
        23:"亡语：相邻盟友+1防御力。",
        24:"飞行。召唤时造成2点伤害。",
        25:"嘲讽。法术免疫。冻结免疫。",
        26:"每有一个其他野兽+1攻击力。",
        27:"飞行。对所有敌人造成3点伤害。",
        28:"嘲讽。每回合为盟友治疗1点。",
        29:"飞行。重生一次，剩余2点生命值。",
        30:"吸血。敌人死亡时+1/+1。",
        31:"每施放一个法术+1攻击力。",
        32:"冲锋。点燃目标。",
        33:"对随从造成双倍伤害。",
        34:"点燃敌人，造成2点伤害。",
        35:"每回合格挡一次4+伤害的攻击。",
        36:"基础武器。",
        37:"火焰免疫。受到伤害-1。",
        38:"盟友+1攻击力。额外抽一张牌。",
        39:"基础护甲。",
        40:"法术+1伤害，消耗-1。",
        41:"所有随从+2攻击力。双方抽2张牌。",
        42:"抽3张牌，弃1张。下回合+2法力值。",
        43:"抛硬币：正面抽2张，反面抽1张。",
        44:"召唤8/8首领。击败可得5张牌。",
        45:"为所有盟友治疗2点生命值。",
        46:"所有盟友+2/+2，持续3回合。",
        47:"随从消耗减少1点。每回合治疗1点。",
        48:"每回合额外抽1张牌。随从拥有潜行。",
        49:"神圣形态。所有盟友获得圣盾。对所有敌人造成5点伤害。",
        50:"抽3张牌。本局法术消耗减少2点。"
    },
    th: {
        1:"หัวหน้ากิลด์ พันธมิตรทั้งหมดได้รับ +2 โจมตี และออร่าเผาผลาญ 3 เทิร์น",
        2:"รองหัวหน้า จั่วการ์ด 2 ใบเมื่อลงสนาม พันธมิตรได้รับ +1 ความเร็ว",
        3:"โจมตีก่อน สร้างความเสียหายสองเท่าต่อศัตรูที่บาดเจ็บ",
        4:"เวทมนตร์ลดค่าใช้จ่าย 1 ซ่อนตัวจนกว่าจะโจมตี",
        5:"ชุบชีวิตพันธมิตรที่ล้มด้วย HP 50%",
        6:"สร้างความเสียหาย 6 ทำลายถ้าเป้าหมายมี HP <3",
        7:"ฟื้นฟู HP 3 ให้พันธมิตร",
        8:"สร้างความเสียหาย 4 ต่อศัตรูทั้งหมด",
        9:"ได้รับเทิร์นเพิ่มหลังเทิร์นนี้",
        10:"เนรเทศศัตรู 2 เทิร์น",
        11:"ทำให้ศัตรูสตัน 1 เทิร์น จั่ว 1 ใบ",
        12:"บล็อกการโจมตีถัดไปต่อพันธมิตร",
        13:"แช่แข็งศัตรูทั้งหมด 1 เทิร์น",
        14:"เรียกมินเนียนสุ่มจากสำรับ",
        15:"สร้างความเสียหาย 2",
        16:"เมื่อตาย สร้างสไลม์ลูก 2 ตัว",
        17:"ระยะไกล ไม่โดนตอบโต้",
        18:"ซ่อนตัว +2 ความเสียหายจากซ่อนตัว",
        19:"ยั่วยุ พันธมิตรข้างๆ +1 โจมตี",
        20:"ให้พันธมิตรสุ่ม +1/+1",
        21:"แช่แข็งศัตรูที่ถูกโจมตี",
        22:"ยั่วยุ โล่ศักดิ์สิทธิ์ รักษา 2/เทิร์น",
        23:"เมื่อตาย: พันธมิตรข้างๆ +1 ป้องกัน",
        24:"บิน สร้างความเสียหาย 2 เมื่อเรียก",
        25:"ยั่วยุ ต้านเวท ต้านแช่แข็ง",
        26:"+1 โจมตีต่อสัตว์ตัวอื่น",
        27:"บิน สร้างความเสียหาย 3 ต่อศัตรูทั้งหมด",
        28:"ยั่วยุ รักษาพันธมิตร 1/เทิร์น",
        29:"บิน คืนชีพครั้งเดียวด้วย HP 2",
        30:"ดูดเลือด +1/+1 เมื่อศัตรูตาย",
        31:"+1 โจมตีต่อเวทที่ใช้",
        32:"พุ่งชน เผาเป้าหมาย",
        33:"ความเสียหายสองเท่าต่อมินเนียน",
        34:"เผาศัตรู สร้างความเสียหาย 2",
        35:"บล็อกการโจมตี 4+ ความเสียหาย/เทิร์น",
        36:"อาวุธพื้นฐาน",
        37:"ต้านไฟ ลดความเสียหาย 1",
        38:"พันธมิตร +1 โจมตี จั่วการ์ดเพิ่ม",
        39:"เกราะพื้นฐาน",
        40:"เวท +1 ความเสียหาย ลดค่าใช้จ่าย 1",
        41:"มินเนียนทั้งหมด +2 โจมตี ทั้งสองฝ่ายจั่ว 2",
        42:"จั่ว 3 ทิ้ง 1 +2 มานาเทิร์นหน้า",
        43:"โยนเหรียญ: หัวจั่ว 2 ก้อยจั่ว 1",
        44:"เรียกบอส 8/8 เอาชนะได้ 5 การ์ด",
        45:"รักษาพันธมิตรทั้งหมด 2 HP",
        46:"พันธมิตรทั้งหมด +2/+2 เป็นเวลา 3 เทิร์น",
        47:"มินเนียนลดค่า 1 รักษา 1/เทิร์น",
        48:"จั่ว +1 การ์ด/เทิร์น มินเนียนมีซ่อนตัว",
        49:"ร่างศักดิ์สิทธิ์ พันธมิตรทุกคนได้โล่ศักดิ์สิทธิ์ สร้างความเสียหาย 5 ต่อทั้งหมด",
        50:"จั่ว 3 เวทลดค่า 2 ตลอดเกม"
    }
};

// ========== STATE ==========
let lang = localStorage.getItem('nw_lang') || 'en';
let cards = [...DATA];
let pos = 0;        // position in card-units  
let vel = 0;        // velocity in cards-per-frame
let dragging = false;
let dragStartX = 0;
let dragStartPos = 0;

// Velocity tracking (simple and reliable)
let lastX = 0;
let lastTime = 0;
let dragVelocity = 0;  // instantaneous velocity during drag

const CARD_GAP = 85;
const FRICTION = 0.85;    // Quick deceleration
const SNAP_ZONE = 99;     // ALWAYS snapping (magnetic feel)
const SNAP_PULL = 0.2;    // Gentle magnetic pull to nearest card

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const carousel = $('#carousel');
const debug = $('#debug');

function mod(n, m) { return ((n % m) + m) % m; }

// ========== RENDER ==========
let didDrag = false;
let totalDragDist = 0;

// Season icons for animated placeholders
const SEASON_ICONS = {
    3: '', 4: '', 5: '', 6: '', 7: '', 8: '', 9: '', 10: ''
};

function render() {
    carousel.innerHTML = '';
    cards.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = `card ${c.rarity}`;
        const season = c.season || currentSeason;
        
        // Determine if this card should show real art or animated placeholder
        // Season 1-2: use real art or S2 placeholder system
        // Season 3-10: first card (index 0) shows art, others show animated placeholder
        const isSeasonPreview = season >= 3 && season <= 10;
        const isFirstCard = i === 0;
        const showAnimatedPlaceholder = isSeasonPreview && !isFirstCard;
        
        // Season 2 cards check hasArt flag from JSON
        const hasRealArt = c.hasArt !== false;
        
        let cardContent;
        if (showAnimatedPlaceholder) {
            // Animated "Coming Soon" placeholder for non-first cards in S3-S10
            const icon = SEASON_ICONS[season] || '';
            // Show FULL name - no truncation
            cardContent = `
                <div class="coming-soon-card s${season}">
                    <div class="cs-icon">${icon}</div>
                    <div class="cs-text" data-i18n="comingSoon">Coming Soon</div>
                    <div class="cs-name">${c.name}</div>
                </div>
                <div class="card-frame"></div>
                <div class="card-name-bar">
                    <div class="card-name-text">${c.name}</div>
                    <div class="card-rarity-label">${c.rarity}</div>
                </div>
            `;
        } else {
            // Real art with name bar (unified style matching print template)
            // Show FULL name - no truncation, CSS handles wrapping
            cardContent = `
                <img class="card-art" src="${getThumbUrl(c.img, c.rarity)}" alt="${c.name}" loading="lazy" onerror="this.onerror=null; this.src='/static/images/cards/thumbs/placeholder.webp';">
                <div class="card-frame"></div>
                <div class="card-name-bar">
                    <div class="card-name-text">${c.name}</div>
                    <div class="card-rarity-label">${c.rarity}</div>
                </div>
                <div class="holo"></div>
                <div class="shine"></div>
            `;
        }
        
        el.innerHTML = cardContent;
        el.dataset.cardId = c.id;
        el.dataset.season = season;
        el.dataset.isAnimated = showAnimatedPlaceholder ? '1' : '0';
        carousel.appendChild(el);
    });
    $('#tot').textContent = cards.length;
    console.log(`[Render] Rendered ${cards.length} cards for Season ${currentSeason} (first card has art, others animated)`);
}

function draw() {
    const n = cards.length;
    const cardEls = $$('.card');
    
    cardEls.forEach((el, i) => {
        let d = i - pos;
        while (d > n/2) d -= n;
        while (d < -n/2) d += n;
        
        const x = d * CARD_GAP;
        const ad = Math.abs(d);
        const z = -ad * 50;
        const ry = d * -5;
        const sc = Math.max(0.55, 1 - ad * 0.09);
        const op = Math.max(0.15, 1 - ad * 0.13);
        
        el.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${ry}deg) scale(${sc})`;
        el.style.opacity = op;
        el.style.zIndex = Math.round(50 - ad * 10);
        el.classList.toggle('active', ad < 0.4);
    });
    
    const idx = mod(Math.round(pos), n);
    $('#cur').textContent = idx + 1;
    
    const card = cards[idx];
    const glow = $('#glow');
    if (card) {
        glow.className = 'glow ' + card.rarity + (Math.abs(vel) < 0.05 ? ' on' : '');
        
        // Update the BIG NAME BANNER
        const banner = $('#nameBanner');
        const bannerRarity = $('#nameBannerRarity');
        const bannerName = $('#nameBannerName');
        
        // Get translated name - card.name is already resolved to current language
        // For S1 cards, also check legacy cardNames table for better translations
        let displayName = card.name;
        if (lang !== 'en' && cardNames[lang] && cardNames[lang][card.id]) {
            displayName = cardNames[lang][card.id];
        } else if (card.nameRaw && typeof card.nameRaw === 'object') {
            displayName = card.nameRaw[lang] || card.nameRaw.en || card.name;
        }
        
        bannerName.textContent = displayName;
        bannerRarity.textContent = i18n[lang][card.rarity] || card.rarity.toUpperCase();
        bannerRarity.className = 'name-banner-rarity ' + card.rarity;
        banner.className = 'name-banner ' + card.rarity;
    }
    
    debug.innerHTML = `vel: <b>${vel.toFixed(3)}</b><br>pos: ${pos.toFixed(2)}`;
}

// ========== PHYSICS ==========
function tick() {
    try {
        if (!dragging) {
            // Apply velocity
            pos += vel;
            vel *= 0.9;  // Friction
            
            // Snap to nearest card
            const target = Math.round(pos);
            const diff = target - pos;
            pos += diff * 0.3;  // Magnetic pull
            
            // Stop when close enough
            if (Math.abs(diff) < 0.01 && Math.abs(vel) < 0.01) {
                pos = target;
                vel = 0;
            }
        }
    } catch(e) {
        console.error('Physics error:', e);
    }
    
    draw();
    requestAnimationFrame(tick);
}

// ========== INPUT ==========
function getX(e) { return e.touches ? e.touches[0].clientX : e.clientX; }

function onDown(e) {
    // Don't capture if touching UI elements (season selector, header, filters, nav)
    const target = e.target;
    if (target.closest('.season-selector') || 
        target.closest('.hdr') || 
        target.closest('.filters') ||
        target.closest('.nav-wrap') ||
        target.closest('.coming-soon-overlay')) {
        return; // Let the UI element handle it
    }
    
    dragging = true;
    didDrag = false;
    totalDragDist = 0;
    const x = getX(e);
    dragStartX = x;
    dragStartPos = pos;
    lastX = x;
    lastTime = performance.now();
    dragVelocity = 0;
    vel = 0;  // INSTANT STOP - touch to stop momentum
}

function onMove(e) {
    if (!dragging) return;
    
    const x = getX(e);
    const now = performance.now();
    
    // Move position 1:1 with drag (swap direction if needed)
    pos = dragStartPos - (x - dragStartX) / CARD_GAP;
    
    // Track total drag distance
    totalDragDist += Math.abs(x - lastX);
    if (totalDragDist > 15) {
        didDrag = true;
    }
    
    // Track velocity continuously during drag
    const dt = now - lastTime;
    if (dt > 5) {  // at least 5ms between samples
        const dx = x - lastX;
        const instantVel = dx / dt;  // pixels per ms
        
        // Smooth the velocity (30% old, 70% new)
        dragVelocity = dragVelocity * 0.3 + instantVel * 0.7;
        
        lastX = x;
        lastTime = now;
    }
}

function onUp() {
    if (!dragging) return;
    dragging = false;
    
    // Simple: just continue at the same speed you were dragging
    // dragVelocity is pixels/ms, convert to cards/frame
    // At 60fps, 1 frame = 16.67ms
    // So velocity in cards/frame = (pixels/ms * 16.67) / CARD_GAP
    // Reduced by half for less sensitivity
    vel = -(dragVelocity * 16.67 / CARD_GAP) * 0.5;
    
    // Clamp to reasonable max (1.5 cards per frame - easier to control)
    const MAX_VEL = 1.5;
    if (vel > MAX_VEL) vel = MAX_VEL;
    if (vel < -MAX_VEL) vel = -MAX_VEL;
}

// ========== KEYBOARD - single card steps ==========
document.addEventListener('keydown', e => {
    if ($('#modal').classList.contains('on')) return;
    
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        // Animate to previous card (no momentum, just smooth move)
        animateToCard(Math.round(pos) - 1);
        e.preventDefault();
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        // Animate to next card
        animateToCard(Math.round(pos) + 1);
        e.preventDefault();
    }
    if (e.key === 'Escape') closeModal();
});

// Smooth animation to specific card (for arrow keys)
let animating = false;
function animateToCard(targetIdx) {
    if (animating) return;
    animating = true;
    vel = 0; // kill any momentum
    
    const startPos = pos;
    const startTime = performance.now();
    const duration = 250; // ms
    
    function step(now) {
        const t = Math.min(1, (now - startTime) / duration);
        // Ease out cubic
        const ease = 1 - Math.pow(1 - t, 3);
        pos = startPos + (targetIdx - startPos) * ease;
        
        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            pos = targetIdx;
            animating = false;
        }
    }
    requestAnimationFrame(step);
}

// ========== WHEEL - adds momentum ==========
carousel.addEventListener('wheel', e => {
    e.preventDefault();
    vel += e.deltaY * 0.015;  // stronger wheel response
    const MAX_VEL = 8;
    if (vel > MAX_VEL) vel = MAX_VEL;
    if (vel < -MAX_VEL) vel = -MAX_VEL;
}, { passive: false });

// ========== SETUP ==========
function setup() {
    carousel.addEventListener('touchstart', onDown, { passive: true });
    carousel.addEventListener('touchmove', onMove, { passive: true });
    carousel.addEventListener('touchend', onUp);
    carousel.addEventListener('touchcancel', onUp);
    
    carousel.addEventListener('mousedown', e => { e.preventDefault(); onDown(e); });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    
    $$('.filters button').forEach(btn => {
        btn.onclick = () => {
            $$('.filters button').forEach(b => b.classList.remove('on'));
            btn.classList.add('on');
            cards = btn.dataset.f === 'all' ? [...DATA] : DATA.filter(c => c.rarity === btn.dataset.f);
            pos = 0; vel = 0;
            render();
        };
    });
    
    // Listen for NW_NAV language changes
    ['nw-lang-change', 'languageChanged'].forEach(evtName => {
        document.addEventListener(evtName, (e) => {
            const newLang = e.detail?.lang;
            if (newLang && newLang !== lang) {
                lang = newLang;
                localStorage.setItem('nw_lang', lang);
                updateUILanguage();
                render(); // Re-render cards with new language
                console.log(`[Cards] Language changed to: ${lang}`);
            }
        });
    });
    
    $('#close').onclick = closeModal;
    $('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
    
    // Navigation buttons
    $('#btnLeft').onclick = () => animateToCard(Math.round(pos) - 1);
    $('#btnRight').onclick = () => animateToCard(Math.round(pos) + 1);
    $('#btnView').onclick = openCenteredCard;
    
    setupModal3D();
}

function openModal(i) {
    const c = cards[i];
    const season = c.season || currentSeason;
    const isComingSoon = season >= 3 && season <= 10;
    
    // Get translated name
    let name = c.name;
    if (lang !== 'en' && cardNames[lang] && cardNames[lang][c.id]) {
        name = cardNames[lang][c.id];
    } else if (c.nameRaw && typeof c.nameRaw === 'object') {
        name = c.nameRaw[lang] || c.nameRaw.en || c.name;
    }
    
    if (isComingSoon) {
        // Show Coming Soon modal for S3-S10
        $('#modalRegular').style.display = 'none';
        $('#modalComingSoon').style.display = 'flex';
        
        const seasonData = SEASONS_DATA?.seasons.find(s => s.id === season);
        const seasonLabel = lang === 'zh' ? `第${season}赛季` : (lang === 'th' ? `ซีซั่น ${season}` : `SEASON ${season}`);
        const icon = SEASON_ICONS[season] || '';
        
        $('#mcsSeasonBadge').textContent = seasonLabel;
        $('#mcsIcon').textContent = icon;
        $('#mcsTitle').textContent = name;
        $('#mcsRarity').textContent = (i18n[lang][c.rarity] || c.rarity).toUpperCase();
        $('#mcsRarity').className = `mcs-rarity ${c.rarity}`;
        
        // Coming Soon message
        const comingText = lang === 'zh' ? '即将推出' : (lang === 'th' ? 'เร็วๆ นี้' : 'COMING SOON');
        $('.mcs-coming').textContent = comingText;
        
        // Description
        const seasonName = SEASON_I18N[season]?.name?.[lang] || seasonData?.name || `Season ${season}`;
        const descText = lang === 'zh' 
            ? `此卡牌将在${seasonName}上线时推出！`
            : (lang === 'th' 
                ? `การ์ดนี้จะพร้อมใช้งานเมื่อ ${seasonName} เปิดตัว!`
                : `This card will be available when ${seasonName} launches!`);
        $('#mcsDesc').textContent = descText;
        
        // Stats (show ? for mystery)
        $('#mcsAtk').textContent = '?';
        $('#mcsHp').textContent = '?';
        $('#mcsCost').textContent = c.cost || '?';
        
        // Abilities
        const abilitiesEl = $('#mcsAbilities');
        if (c.abilities && c.abilities.length > 0) {
            abilitiesEl.innerHTML = c.abilities.map(a => `<span class="mcs-ability">${a}</span>`).join('');
        } else {
            abilitiesEl.innerHTML = '<span class="mcs-ability">???</span>';
        }
        
        // Set card background color based on season
        const seasonColor = seasonData?.color || '#ff6b00';
        $('.mcs-card').style.borderColor = seasonColor + '40';
        $('.mcs-season-badge').style.background = seasonColor + '30';
        $('.mcs-season-badge').style.color = seasonColor;
        
    } else {
        // Show regular modal for S1-S2
        $('#modalRegular').style.display = '';
        $('#modalComingSoon').style.display = 'none';
        
        $('#mimg').src = getFullUrl(c.img, c.rarity);
        $('#mtitle').textContent = name;
        $('#mtype').textContent = i18n[lang][c.type] || c.type;
        
        const rarityText = i18n[lang][c.rarity] || c.rarity.toUpperCase();
        $('#mrarity').textContent = rarityText;
        $('#mrarity').className = `badge ${c.rarity}`;
        
        $('#mcost').textContent = c.cost;
        $('#mstats').textContent = c.stats || '-';
        $('#srow').style.display = c.stats ? 'flex' : 'none';
        
        // Get translated description
        let desc = c.desc;
        if (lang !== 'en' && cardDescs[lang] && cardDescs[lang][c.id]) {
            desc = cardDescs[lang][c.id];
        } else if (c.descRaw && typeof c.descRaw === 'object') {
            desc = c.descRaw[lang] || c.descRaw.en || c.desc;
        }
        $('#mdesc').textContent = desc;
    }
    
    $('#modal').classList.add('on');
}

function closeModal() { $('#modal').classList.remove('on'); }

// Simple tilt effect - no complex 3D that crashes
function setupModal3D() {
    const mc = $('#mc');
    const wrap = $('.modal-card-wrap');
    
    // Mouse hover tilt only (simple, doesn't crash)
    wrap.addEventListener('mousemove', e => {
        const rect = wrap.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mc.style.transform = `rotateY(${x * 20}deg) rotateX(${-y * 20}deg)`;
    });
    wrap.addEventListener('mouseleave', () => {
        mc.style.transform = '';
    });
}

// Prevent context menu on long press
document.addEventListener('contextmenu', e => e.preventDefault());

// View button opens modal for centered card
function openCenteredCard() {
    const idx = mod(Math.round(pos), cards.length);
    openModal(idx);
}

// Update all UI text based on current language
function updateUILanguage() {
    // Sync lang with NW_NAV or NW_I18N if available
    if (typeof NW_I18N !== 'undefined' && NW_I18N.lang) {
        lang = NW_I18N.lang;
    } else if (typeof NW_NAV !== 'undefined' && NW_NAV.currentLang) {
        lang = NW_NAV.currentLang;
    } else {
        lang = localStorage.getItem('nw_lang') || 'en';
    }
    
    console.log(`[Cards] Updating UI for language: ${lang}`);
    
    $('#hint').textContent = i18n[lang].hint;
    $('#ltType').textContent = i18n[lang].type;
    $('#ltRarity').textContent = i18n[lang].rarity;
    $('#ltCost').textContent = i18n[lang].cost;
    $('#ltStats').textContent = i18n[lang].stats;
    $('#viewText').textContent = i18n[lang].view;
    const guideLink = $('#guideLink');
    if (guideLink) guideLink.textContent = i18n[lang].guide;
    
    // Update filter buttons
    $('#fAll').textContent = i18n[lang].all;
    $('#fMythic').textContent = i18n[lang].mythic;
    $('#fLegendary').textContent = i18n[lang].legendary;
    $('#fEpic').textContent = i18n[lang].epic;
    $('#fRare').textContent = i18n[lang].rare;
    $('#fUncommon').textContent = i18n[lang].uncommon;
    $('#fCommon').textContent = i18n[lang].common;
    
    // Update season selector with localized names
    document.querySelectorAll('.season-name[data-season-id]').forEach(el => {
        const sid = parseInt(el.dataset.seasonId);
        const localData = SEASON_I18N[sid];
        if (localData) {
            const name = localData.name?.[lang] || localData.name?.en || '';
            el.textContent = name.length > 8 ? name.substring(0,7) + '…' : name;
        }
    });
    
    // Re-translate card names and descriptions using stored raw data
    cards.forEach(c => {
        if (c.nameRaw && typeof c.nameRaw === 'object') {
            c.name = c.nameRaw[lang] || c.nameRaw.en || c.name;
        }
        if (c.descRaw && typeof c.descRaw === 'object') {
            c.desc = c.descRaw[lang] || c.descRaw.en || c.desc;
        }
    });
    
    // Update Coming Soon overlay if visible
    if (document.getElementById('comingSoonOverlay')?.classList.contains('show')) {
        showComingSoon(currentSeason);
    }
    
    // Update the name banner with current card's translated name
    draw();
}

// Initialize - Load seasons first, then cards
async function init() {
    // Load seasons metadata
    await loadSeasonsData();
    
    // Load Season 1 cards
    await loadCardsData(1);
    cards = [...DATA];
    
    // Render and setup
    render();
    setup();
    tick();
    updateUILanguage();
    
    console.log('[Init] Ready! 10 seasons loaded');
}

init();

})();