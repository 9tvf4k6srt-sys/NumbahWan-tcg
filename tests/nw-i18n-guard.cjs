#!/usr/bin/env node
/**
 * NW i18n Guard v2.0 — Unified Catch + Fix
 * ==========================================
 * Single tool that replaces 5 separate scripts:
 *   - scripts/audit-i18n.cjs        (deleted — report only)
 *   - scripts/generate-i18n-template.cjs (deleted — template only)
 *   - scripts/i18n-audit.cjs        (deleted — weak fix)
 *   - scripts/inject-i18n.cjs       (deleted — report only)
 *   - tests/nw-i18n-audit.cjs       (merged here)
 *   + scripts/i18n-auto-fix.cjs     (merged here)
 *
 * What it catches:
 *   1. Orphaned data-i18n keys (HTML attr but no translation registered)
 *   2. Fake translations (zh/th identical to English copy-paste)
 *   3. Hardcoded English in JS (.textContent = 'English text')
 *   4. Multiple i18n systems on same page (risk of gaps)
 *   5. Missing language coverage (en exists but zh/th missing)
 *
 * What it fixes (--fix):
 *   1. Injects <script src="/static/nw-i18n-core.js"> if missing
 *   2. Adds data-i18n attributes to un-tagged visible text
 *   3. Generates NW_I18N.register() blocks with zh/th from dictionary
 *   4. Replaces fake translations with real ones from COMMON_TRANSLATIONS
 *   5. Marks remaining untranslated strings with [ZH]/[TH] for human review
 *
 * Usage:
 *   node tests/nw-i18n-guard.cjs                     # Audit all pages
 *   node tests/nw-i18n-guard.cjs index.html           # Single page
 *   node tests/nw-i18n-guard.cjs --verbose            # Show passes
 *   node tests/nw-i18n-guard.cjs --fix                # Auto-fix all pages
 *   node tests/nw-i18n-guard.cjs --fix --dry-run      # Preview fixes
 *   node tests/nw-i18n-guard.cjs --fix index.html     # Fix single page
 *   node tests/nw-i18n-guard.cjs --fix-report         # Show fix suggestions
 *
 * Exit code:
 *   0 = all checks pass (warnings allowed)
 *   1 = failures found
 */

const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const VERBOSE = process.argv.includes('--verbose');
const FIX_MODE = process.argv.includes('--fix');
const DRY_RUN = process.argv.includes('--dry-run');
const FIX_REPORT = process.argv.includes('--fix-report');
const SUPPORTED_LANGS = ['en', 'zh', 'th'];

// Strings OK to leave untranslated (brand names, proper nouns, codes)
const UNTRANSLATABLE = new Set([
    'NumbahWan', 'RegginA', 'RegginO', 'NWG', 'NW', 'KINTSUGI',
    'MapleStory', 'Zakum', 'GM', 'MVP', 'PvP', 'PvE', 'D&D', 'DM',
    'CP', 'HP', 'ATK', 'DEF', 'DPS', 'XP', 'Lv.', 'Contrib',
    'OK', 'Loading...', 'v1', 'v2', 'v3', 'v9.1',
    'Natehouoho', 'Yuluner', 'NightShade', 'MatchaLatte', 'Aquila-22',
    'Parry Hotter', 'Mei-Lin Chen', 'Kevin Park', 'Sarah Williams',
    'Marcus Lee', 'Yuki Tanaka', 'Tom Zhang', 'Bitcoin', 'NumbahWan TCG',
    'Claude', 'Gemini', 'Perplexity', 'Palantir', 'Broadcom', 'Regina',
    'Prof. PixelCouture', 'Curator Morrison', 'Shadower', 'Dark Knight',
]);

// Patterns that should NOT be flagged as fake translations
const UNTRANSLATABLE_PATTERNS = [
    /^Lv\.\d/,           // Level indicators like Lv.78
    /^@\s/,              // Social handles like @ Google DeepMind
    /^©\s/,              // Copyright lines
    /^Exhibit\s\d/,      // Museum exhibits
    /^\d{3}:/,           // Numbered items like 001: Zakum Helmet
    /^[A-Z]{2,5}\s*[\/\d]/, // Codes like NWG/Day
    /Placeholder$/i,     // Placeholder strings
    /^Palantir\s\d/,     // Stock allocations
    /^Broadcom\s\d/,     // Stock allocations
    /^Tier\s\d/,         // Tier labels
    /^Step\s\d/,         // Step indicators
    /^Season\s\d/,       // Season labels
    /[\u4e00-\u9fff]/,   // Already contains Chinese
    /[\u0e00-\u0e7f]/,   // Already contains Thai
    /\\\\$/,              // Truncated string (escaped quote cut-off)
    /^["']|["']$/,       // Starts or ends with quote (parsing artifact)
    /^,\s/,              // Starts with comma (code fragment)
    /^\w+:\s*$/,         // Just a key label (code fragment)
];

// English text pattern: 2+ words starting with capital
const ENGLISH_TEXT_PATTERN = /^[A-Z][a-z]+(\s[A-Za-z]+){1,}/;

// ══════════════════════════════════════════════════════════════════
//  TRANSLATION DICTIONARY (common guild/game/UI terms)
// ══════════════════════════════════════════════════════════════════

const COMMON_TRANSLATIONS = {
  // ── Navigation & UI ──
  'Home': { zh: '首頁', th: 'หน้าแรก' },
  'Back': { zh: '返回', th: 'กลับ' },
  'Menu': { zh: '選單', th: 'เมนู' },
  'Close': { zh: '關閉', th: 'ปิด' },
  'Submit': { zh: '提交', th: 'ส่ง' },
  'Cancel': { zh: '取消', th: 'ยกเลิก' },
  'Save': { zh: '儲存', th: 'บันทึก' },
  'Delete': { zh: '刪除', th: 'ลบ' },
  'Loading': { zh: '載入中', th: 'กำลังโหลด' },
  'Search': { zh: '搜尋', th: 'ค้นหา' },
  'Filter': { zh: '篩選', th: 'กรอง' },
  'Sort': { zh: '排序', th: 'เรียงลำดับ' },
  'Settings': { zh: '設定', th: 'ตั้งค่า' },
  'Profile': { zh: '個人資料', th: 'โปรไฟล์' },
  'Logout': { zh: '登出', th: 'ออกจากระบบ' },
  'Login': { zh: '登入', th: 'เข้าสู่ระบบ' },
  'Yes': { zh: '是', th: 'ใช่' },
  'No': { zh: '否', th: 'ไม่' },
  'Confirm': { zh: '確認', th: 'ยืนยัน' },
  'Edit': { zh: '編輯', th: 'แก้ไข' },
  'Details': { zh: '詳情', th: 'รายละเอียด' },
  'More': { zh: '更多', th: 'เพิ่มเติม' },
  'Share': { zh: '分享', th: 'แชร์' },
  'Copy': { zh: '複製', th: 'คัดลอก' },
  'Paste': { zh: '貼上', th: 'วาง' },
  'Refresh': { zh: '重新整理', th: 'รีเฟรช' },
  'Retry': { zh: '重試', th: 'ลองอีกครั้ง' },
  'Next': { zh: '下一步', th: 'ถัดไป' },
  'Previous': { zh: '上一步', th: 'ก่อนหน้า' },
  'Start': { zh: '開始', th: 'เริ่ม' },
  'Stop': { zh: '停止', th: 'หยุด' },
  'Reset': { zh: '重設', th: 'รีเซ็ต' },
  'Apply': { zh: '套用', th: 'นำไปใช้' },
  // ── Game Terms ──
  'Cards': { zh: '卡牌', th: 'การ์ด' },
  'Card': { zh: '卡牌', th: 'การ์ด' },
  'Wallet': { zh: '錢包', th: 'กระเป๋า' },
  'Market': { zh: '市場', th: 'ตลาด' },
  'Battle': { zh: '戰鬥', th: 'ต่อสู้' },
  'Guild': { zh: '公會', th: 'กิลด์' },
  'Auction': { zh: '拍賣', th: 'ประมูล' },
  'Forge': { zh: '鍛造', th: 'หลอม' },
  'Shrine': { zh: '神社', th: 'ศาลเจ้า' },
  'Staking': { zh: '質押', th: 'สเตกกิ้ง' },
  'Fusion': { zh: '融合', th: 'ฟิวชั่น' },
  'Collection': { zh: '收藏', th: 'คอลเลกชัน' },
  'Rarity': { zh: '稀有度', th: 'ความหายาก' },
  'Common': { zh: '普通', th: 'ธรรมดา' },
  'Rare': { zh: '稀有', th: 'แรร์' },
  'Epic': { zh: '史詩', th: 'เอพิค' },
  'Legendary': { zh: '傳說', th: 'ตำนาน' },
  'Mythic': { zh: '神話', th: 'มิธิค' },
  'Attack': { zh: '攻擊', th: 'โจมตี' },
  'Defense': { zh: '防禦', th: 'ป้องกัน' },
  'Health': { zh: '生命', th: 'พลังชีวิต' },
  'Level': { zh: '等級', th: 'ระดับ' },
  'Experience': { zh: '經驗', th: 'ประสบการณ์' },
  'Inventory': { zh: '背包', th: 'คลัง' },
  'Quest': { zh: '任務', th: 'เควส' },
  'Achievement': { zh: '成就', th: 'ความสำเร็จ' },
  'Leaderboard': { zh: '排行榜', th: 'ลีดเดอร์บอร์ด' },
  'Tournament': { zh: '錦標賽', th: 'ทัวร์นาเมนต์' },
  'Reward': { zh: '獎勵', th: 'รางวัล' },
  'Price': { zh: '價格', th: 'ราคา' },
  'Total': { zh: '總計', th: 'รวม' },
  'Balance': { zh: '餘額', th: 'ยอดคงเหลือ' },
  'History': { zh: '歷史', th: 'ประวัติ' },
  'Status': { zh: '狀態', th: 'สถานะ' },
  'Active': { zh: '啟用', th: 'ใช้งาน' },
  'Completed': { zh: '已完成', th: 'เสร็จสิ้น' },
  'Pending': { zh: '待處理', th: 'รอดำเนินการ' },
  'Power': { zh: '力量', th: 'พลัง' },
  'Rank': { zh: '排名', th: 'อันดับ' },
  'Score': { zh: '分數', th: 'คะแนน' },
  'Season': { zh: '賽季', th: 'ซีซั่น' },
  'Round': { zh: '回合', th: 'รอบ' },
  'Win': { zh: '勝利', th: 'ชนะ' },
  'Lose': { zh: '失敗', th: 'แพ้' },
  'Draw': { zh: '平局', th: 'เสมอ' },
  'Damage': { zh: '傷害', th: 'ความเสียหาย' },
  'Heal': { zh: '治療', th: 'รักษา' },
  'Shield': { zh: '護盾', th: 'โล่' },
  'Buff': { zh: '增益', th: 'เพิ่มพลัง' },
  'Debuff': { zh: '減益', th: 'ลดพลัง' },
  'Cooldown': { zh: '冷卻', th: 'คูลดาวน์' },
  'Mana': { zh: '魔力', th: 'มานา' },
  'Skill': { zh: '技能', th: 'สกิล' },
  'Ability': { zh: '能力', th: 'ความสามารถ' },
  'Equip': { zh: '裝備', th: 'สวมใส่' },
  'Craft': { zh: '製作', th: 'คราฟต์' },
  'Upgrade': { zh: '升級', th: 'อัพเกรด' },
  'Unlock': { zh: '解鎖', th: 'ปลดล็อก' },
  'Locked': { zh: '已鎖定', th: 'ล็อค' },
  'Claim': { zh: '領取', th: 'รับ' },
  'Open': { zh: '開啟', th: 'เปิด' },
  'Pack': { zh: '卡包', th: 'แพ็ค' },
  'Deck': { zh: '牌組', th: 'เด็ค' },
  'Hand': { zh: '手牌', th: 'มือ' },
  'Board': { zh: '場地', th: 'บอร์ด' },
  'Player': { zh: '玩家', th: 'ผู้เล่น' },
  'Opponent': { zh: '對手', th: 'คู่ต่อสู้' },
  'Turn': { zh: '回合', th: 'เทิร์น' },
  'Phase': { zh: '階段', th: 'เฟส' },
  'Ready': { zh: '準備', th: 'พร้อม' },
  'Waiting': { zh: '等待中', th: 'กำลังรอ' },
  // ── Layout / Common phrases ──
  'View All': { zh: '查看全部', th: 'ดูทั้งหมด' },
  'Learn More': { zh: '了解更多', th: 'เรียนรู้เพิ่มเติม' },
  'Get Started': { zh: '開始使用', th: 'เริ่มต้น' },
  'Read More': { zh: '閱讀更多', th: 'อ่านเพิ่มเติม' },
  'Show More': { zh: '顯示更多', th: 'แสดงเพิ่มเติม' },
  'Show Less': { zh: '收起', th: 'แสดงน้อยลง' },
  'No Results': { zh: '沒有結果', th: 'ไม่มีผลลัพธ์' },
  'Coming Soon': { zh: '即將推出', th: 'เร็วๆ นี้' },
  'Select All': { zh: '全選', th: 'เลือกทั้งหมด' },
  'Clear All': { zh: '清除全部', th: 'ล้างทั้งหมด' },
  'No Data': { zh: '無資料', th: 'ไม่มีข้อมูล' },
  'Error': { zh: '錯誤', th: 'ข้อผิดพลาด' },
  'Success': { zh: '成功', th: 'สำเร็จ' },
  'Warning': { zh: '警告', th: 'คำเตือน' },
  'Info': { zh: '資訊', th: 'ข้อมูล' },
  'Unavailable': { zh: '不可用', th: 'ไม่พร้อมใช้งาน' },
  'Offline': { zh: '離線', th: 'ออฟไลน์' },
  'Online': { zh: '在線', th: 'ออนไลน์' },
  // ── Guild-specific ──
  'Guild Master': { zh: '會長', th: 'หัวหน้ากิลด์' },
  'Vice Master': { zh: '副會長', th: 'รองหัวหน้า' },
  'Guild Member': { zh: '公會成員', th: 'สมาชิกกิลด์' },
  'Officer': { zh: '幹部', th: 'เจ้าหน้าที่' },
  'Recruit': { zh: '新成員', th: 'สมาชิกใหม่' },
  'Siege': { zh: '攻城戰', th: 'สงครามปิดล้อม' },
  'Alliance': { zh: '聯盟', th: 'พันธมิตร' },
  'Contribution': { zh: '貢獻', th: 'ผลงาน' },
  'Donation': { zh: '捐獻', th: 'บริจาค' },
  'Treasury': { zh: '金庫', th: 'คลัง' },
  'War': { zh: '戰爭', th: 'สงคราม' },
  'Defense Tower': { zh: '防禦塔', th: 'หอป้องกัน' },
  'Stronghold': { zh: '據點', th: 'ป้อมปราการ' },
  'Territory': { zh: '領地', th: 'ดินแดน' },
  'Karma': { zh: '業力', th: 'กรรม' },
  // ── Business / Economy ──
  'Buy': { zh: '購買', th: 'ซื้อ' },
  'Sell': { zh: '出售', th: 'ขาย' },
  'Trade': { zh: '交易', th: 'เทรด' },
  'Offer': { zh: '出價', th: 'เสนอ' },
  'Bid': { zh: '競標', th: 'ประมูล' },
  'List': { zh: '上架', th: 'ลงรายการ' },
  'Delist': { zh: '下架', th: 'ถอนรายการ' },
  'Invest': { zh: '投資', th: 'ลงทุน' },
  'Withdraw': { zh: '提領', th: 'ถอน' },
  'Deposit': { zh: '存入', th: 'ฝาก' },
  'Transfer': { zh: '轉帳', th: 'โอน' },
  'Fee': { zh: '手續費', th: 'ค่าธรรมเนียม' },
  'Tax': { zh: '稅', th: 'ภาษี' },
  'Revenue': { zh: '營收', th: 'รายได้' },
  'Profit': { zh: '利潤', th: 'กำไร' },
  'Loss': { zh: '虧損', th: 'ขาดทุน' },
};

// ── Load supplement dictionary (JSON file with 870+ entries) ──
let SUPPLEMENT_DICT = {};
try {
    const supPath = path.resolve(__dirname, '..', 'data', 'i18n-supplement.json');
    if (fs.existsSync(supPath)) {
        SUPPLEMENT_DICT = JSON.parse(fs.readFileSync(supPath, 'utf8'));
    }
} catch (e) { /* ignore */ }

// ── Output ──────────────────────────────────────────────────────
const C = {
    pass: '\x1b[32m', fail: '\x1b[31m', warn: '\x1b[33m',
    info: '\x1b[36m', dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m'
};

let totalChecks = 0, passed = 0, failed = 0, warnings = 0;
let fixedPages = 0, fixedKeys = 0;
const allFailures = [];
const allWarnings = [];
const fixSuggestions = [];

function pass(page, msg) { totalChecks++; passed++; if (VERBOSE) console.log(`${C.pass}  \u2713 [${page}] ${msg}${C.reset}`); }
function fail(page, msg) { totalChecks++; failed++; console.log(`${C.fail}  \u2717 [${page}] ${msg}${C.reset}`); allFailures.push(`${page}: ${msg}`); }
function warn(page, msg) { totalChecks++; warnings++; console.log(`${C.warn}  \u26A0 [${page}] ${msg}${C.reset}`); allWarnings.push(`${page}: ${msg}`); }
function section(name) { console.log(`\n${C.bold}${C.info}\u2501\u2501\u2501 ${name} \u2501\u2501\u2501${C.reset}`); }

// ══════════════════════════════════════════════════════════════════
//  EXTRACTION HELPERS (from nw-i18n-audit.cjs — detection side)
// ══════════════════════════════════════════════════════════════════

function extractDataI18nKeys(html) {
    const keys = new Set();
    const re = /data-i18n=["']([^"']+)["']/g;
    let m;
    while ((m = re.exec(html)) !== null) keys.add(m[1]);
    return keys;
}

function extractAllTranslationSystems(html) {
    const systems = {};

    // NW_I18N.register(VARNAME)
    const registerMatches = html.matchAll(/NW_I18N\.register\((\w+)\)/g);
    for (const rm of registerMatches) {
        const varName = rm[1];
        const varMatch = html.match(new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\{([\\s\\S]*?)\\};`));
        if (varMatch) {
            const parsed = extractLangKeys(varMatch[1]);
            if (parsed) systems[`NW_I18N(${varName})`] = parsed;
        }
    }

    // NW_I18N.register({ ... }) inline
    const inlineRegister = html.match(/NW_I18N\.register\(\{([\s\S]*?)\}\s*\)\s*;/);
    if (inlineRegister) {
        const parsed = extractLangKeys(inlineRegister[1]);
        if (parsed) systems['NW_I18N(inline)'] = parsed;
    }

    // const translations = {...}  OR  const i18n = {...}
    const translationsMatch = html.match(/const\s+translations\s*=\s*(\{[\s\S]*?\})\s*;/);
    if (translationsMatch) {
        try {
            const obj = JSON.parse(translationsMatch[1]);
            const result = {};
            for (const lang of SUPPORTED_LANGS) {
                if (obj[lang]) result[lang] = new Set(Object.keys(obj[lang]));
            }
            if (Object.keys(result).length > 0) systems['legacy(translations)'] = result;
        } catch (e) {
            const parsed = extractLangKeys(translationsMatch[1]);
            if (parsed) systems['legacy(translations)'] = parsed;
        }
    }

    // const i18n = { en: {...}, zh: {...}, th: {...} }
    const i18nMatch = html.match(/const\s+i18n\s*=\s*\{([\s\S]*?)\}\s*;/);
    if (i18nMatch) {
        const parsed = extractLangKeys(i18nMatch[1]);
        if (parsed) systems['legacy(i18n)'] = parsed;
    }

    // const *Translations = { en: {...}, zh: {...}, th: {...} }
    // Matches: pageTranslations, basementTranslations, buyTranslations, etc.
    const transVarPattern = /const\s+(\w+Translations)\s*=\s*\{([\s\S]*?)\}\s*;/g;
    let transMatch;
    while ((transMatch = transVarPattern.exec(html)) !== null) {
        const varName = transMatch[1];
        if (systems[`legacy(${varName})`]) continue; // avoid dupes
        const parsed = extractLangKeys(transMatch[2]);
        if (parsed) systems[`legacy(${varName})`] = parsed;
    }

    // const pageTranslations = {...} — also match with "page" prefix
    const pageTransMatch = html.match(/const\s+pageTranslations\s*=\s*\{([\s\S]*?)\}\s*;/);
    if (pageTransMatch && !systems['legacy(pageTranslations)']) {
        const parsed = extractLangKeys(pageTransMatch[1]);
        if (parsed) systems['legacy(pageTranslations)'] = parsed;
    }

    // const *_I18N = { en: {...}, zh: {...}, th: {...} } — used directly without NW_I18N.register
    const i18nVarPattern = /const\s+(\w+_I18N)\s*=\s*\{([\s\S]*?)\}\s*;/g;
    let i18nVarMatch;
    while ((i18nVarMatch = i18nVarPattern.exec(html)) !== null) {
        const varName = i18nVarMatch[1];
        const sysKey = `direct(${varName})`;
        // Skip if already captured via NW_I18N.register
        if (systems[`NW_I18N(${varName})`]) continue;
        if (systems[sysKey]) continue;
        const parsed = extractLangKeys(i18nVarMatch[2]);
        if (parsed) systems[sysKey] = parsed;
    }

    return systems;
}

function extractLangKeys(block) {
    const langs = {};
    const langPattern = /\b(en|zh|th|jp|ja)\s*:\s*\{/g;
    let m;
    const starts = [];
    while ((m = langPattern.exec(block)) !== null) {
        starts.push({ lang: m[1], start: m.index + m[0].length });
    }

    for (const { lang, start } of starts) {
        let depth = 1, pos = start;
        while (depth > 0 && pos < block.length) {
            if (block[pos] === '{') depth++;
            else if (block[pos] === '}') depth--;
            else if (block[pos] === "'" || block[pos] === '"' || block[pos] === '`') {
                const q = block[pos]; pos++;
                while (pos < block.length && block[pos] !== q) {
                    if (block[pos] === '\\') pos++;
                    pos++;
                }
            }
            pos++;
        }
        const body = block.substring(start, pos - 1);
        const keys = new Set();
        const stripped = body.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""');
        const keyRe = /\b([a-zA-Z][a-zA-Z0-9_]*)\s*:/g;
        let km;
        while ((km = keyRe.exec(stripped)) !== null) keys.add(km[1]);
        langs[lang] = keys;
    }

    return Object.keys(langs).length > 0 ? langs : null;
}

function extractTranslationValues(html) {
    const systems = {};

    const registerMatches = html.matchAll(/NW_I18N\.register\((\w+)\)/g);
    for (const rm of registerMatches) {
        const varName = rm[1];
        const varMatch = html.match(new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\{([\\s\\S]*?)\\};`));
        if (varMatch) {
            const parsed = extractLangValues(varMatch[1]);
            if (parsed) systems[varName] = parsed;
        }
    }

    const inlineReg = html.match(/NW_I18N\.register\(\{([\s\S]*?)\}\s*\)\s*;/);
    if (inlineReg) {
        const parsed = extractLangValues(inlineReg[1]);
        if (parsed) systems['inline'] = parsed;
    }

    // const i18n = { en: {...}, zh: {...}, th: {...} }
    const i18nMatch = html.match(/const\s+i18n\s*=\s*\{([\s\S]*?)\}\s*;/);
    if (i18nMatch) {
        const parsed = extractLangValues(i18nMatch[1]);
        if (parsed) systems['i18n'] = parsed;
    }

    // const *Translations = { en: {...}, zh: {...}, th: {...} }
    const transVarPattern = /const\s+(\w+Translations)\s*=\s*\{([\s\S]*?)\}\s*;/g;
    let transMatch;
    while ((transMatch = transVarPattern.exec(html)) !== null) {
        const varName = transMatch[1];
        if (systems[varName]) continue;
        const parsed = extractLangValues(transMatch[2]);
        if (parsed) systems[varName] = parsed;
    }

    // const *_I18N = { en: {...}, zh: {...}, th: {...} } — used directly
    const i18nValPattern = /const\s+(\w+_I18N)\s*=\s*\{([\s\S]*?)\}\s*;/g;
    let i18nValMatch;
    while ((i18nValMatch = i18nValPattern.exec(html)) !== null) {
        const varName = i18nValMatch[1];
        if (systems[varName]) continue;
        const parsed = extractLangValues(i18nValMatch[2]);
        if (parsed) systems[varName] = parsed;
    }

    return systems;
}

function extractLangValues(block) {
    const langs = {};
    const langPattern = /\b(en|zh|th)\s*:\s*\{/g;
    let m;
    const starts = [];
    while ((m = langPattern.exec(block)) !== null) {
        starts.push({ lang: m[1], start: m.index + m[0].length });
    }

    for (const { lang, start } of starts) {
        let depth = 1, pos = start;
        while (depth > 0 && pos < block.length) {
            if (block[pos] === '{') depth++;
            else if (block[pos] === '}') depth--;
            else if (block[pos] === "'" || block[pos] === '"' || block[pos] === '`') {
                const q = block[pos]; pos++;
                while (pos < block.length && block[pos] !== q) {
                    if (block[pos] === '\\') pos++;
                    pos++;
                }
            }
            pos++;
        }
        const body = block.substring(start, pos - 1);
        const kv = {};
        const kvRe = /\b([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*(['"`])((?:(?!\2)[^\\]|\\.)*)\2/g;
        let kvm;
        while ((kvm = kvRe.exec(body)) !== null) {
            kv[kvm[1]] = kvm[3];
        }
        langs[lang] = kv;
    }

    return Object.keys(langs).length > 0 ? langs : null;
}

function findHardcodedEnglish(html) {
    const issues = [];
    const patterns = [
        /\.textContent\s*=\s*(['"`])([^'"`\n]{5,})\1/g,
        /\.textContent\s*=\s*[^;]*?['"`]([A-Z][a-z]+(?:\s[A-Za-z]+)+)['"`]/g,
        /\.innerHTML\s*=\s*(['"`])([^'"`\n]{10,})\1/g,
    ];

    for (const pattern of patterns) {
        let m;
        while ((m = pattern.exec(html)) !== null) {
            const text = m[2] || m[1];
            if (text.includes('${') || text.includes('<') || text.includes('{') || text.includes('//')) continue;
            if (text.startsWith('.') || text.startsWith('#') || text.includes('()')) continue;
            if (UNTRANSLATABLE.has(text.trim())) continue;
            if (ENGLISH_TEXT_PATTERN.test(text.trim())) {
                const lineNum = html.substring(0, m.index).split('\n').length;
                issues.push({ text: text.trim().substring(0, 60), line: lineNum });
            }
        }
    }
    return issues;
}

// ══════════════════════════════════════════════════════════════════
//  AUTO-FIX ENGINE (from i18n-auto-fix.cjs)
// ══════════════════════════════════════════════════════════════════

function isCodeOrMeta(text) {
    if (!text || text.length < 3 || text.length > 200) return true;
    if (/[{}();\[\]=<>]/.test(text)) return true;
    if (/^(var|let|const|function|if|else|return|import|export|class|new|typeof|undefined|null|true|false)\b/.test(text)) return true;
    if (/^(https?:\/\/|mailto:|tel:|javascript:|#|\/static|\.\/|\.\.\/|\/)/.test(text)) return true;
    if (/\.(js|css|html|json|ts|tsx|svg|png|jpg|webp|woff|gif|ico)(\s|$|")/.test(text)) return true;
    if (/^[A-Z_]{2,}$/.test(text.replace(/\s/g, ''))) return true;
    if (/^\d+(\.\d+)?(%|px|em|rem|vh|vw|s|ms)?$/.test(text.trim())) return true;
    if (/^[#\.]?[a-z][a-z0-9-]*$/.test(text.trim())) return true;
    return false;
}

function textToKey(text) {
    const words = text.trim()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 0)
        .slice(0, 5);

    if (words.length === 0) return null;

    const key = words[0].toLowerCase() +
        words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');

    return key;
}

function lookupTranslation(enText, lang) {
    // Exact match
    if (COMMON_TRANSLATIONS[enText]?.[lang]) return COMMON_TRANSLATIONS[enText][lang];
    // Case-insensitive
    const lower = enText.toLowerCase();
    for (const [key, val] of Object.entries(COMMON_TRANSLATIONS)) {
        if (key.toLowerCase() === lower && val[lang]) return val[lang];
    }
    // Placeholder for human translator
    const prefix = lang === 'zh' ? '[ZH]' : '[TH]';
    return `${prefix} ${enText}`;
}

function fixPage(filePath) {
    const filename = path.basename(filePath);
    const pageId = filename.replace('.html', '').replace(/-/g, '_');

    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch { return null; }

    // Skip if already has NW_I18N.register
    if (content.includes('NW_I18N.register')) {
        return { page: filename, status: 'already-translated', keysAdded: 0 };
    }

    // Skip if already has any translation system
    if (/const\s+i18n\s*=\s*\{[\s\S]*?\ben\s*:\s*\{/.test(content) ||
        /const\s+\w+Translations\s*=\s*\{[\s\S]*?\ben\s*:\s*\{/.test(content) ||
        /const\s+translations\s*=\s*\{[\s\S]*?\ben\s*:\s*\{/.test(content) ||
        /const\s+\w+_I18N\s*=\s*\{[\s\S]*?\ben\s*:\s*\{/.test(content)) {
        return { page: filename, status: 'already-translated', keysAdded: 0 };
    }

    const translations = { en: {}, zh: {}, th: {} };
    let modified = content;
    let keysAdded = 0;
    const usedKeys = new Set();

    // Find text in elements that should be translated
    const textPattern = /(<(?:h[1-6]|p|span|div|a|button|label|td|th|li|dt|dd|figcaption|strong|em|small|legend|summary|caption)\b[^>]*?>)([^<]+)/g;

    let match;
    const replacements = [];

    while ((match = textPattern.exec(content)) !== null) {
        const openTag = match[1];
        const rawText = match[2];
        const text = rawText.trim();

        if (openTag.includes('data-i18n')) continue;
        if (isCodeOrMeta(text)) continue;
        if (!/[A-Z][a-z]{1,}/.test(text) && !/^[a-z]{3,}(\s[a-z]+)+$/i.test(text)) continue;
        if (text.split(/\s+/).length === 1 && text.length < 4) continue;

        // Skip if inside script or style
        const beforeMatch = content.slice(Math.max(0, match.index - 500), match.index);
        if (/<script\b[^>]*>[^<]*$/i.test(beforeMatch) || /<style\b[^>]*>[^<]*$/i.test(beforeMatch)) continue;

        const key = textToKey(text);
        if (!key || key.length < 2) continue;

        let uniqueKey = key;
        let suffix = 2;
        while (usedKeys.has(uniqueKey)) uniqueKey = key + suffix++;
        usedKeys.add(uniqueKey);

        translations.en[uniqueKey] = text;
        translations.zh[uniqueKey] = lookupTranslation(text, 'zh');
        translations.th[uniqueKey] = lookupTranslation(text, 'th');

        replacements.push({
            position: match.index,
            length: openTag.length,
            replacement: openTag.slice(0, -1) + ` data-i18n="${uniqueKey}">`
        });

        keysAdded++;
    }

    // Also check placeholder attributes
    const placeholderPattern = /<(input|textarea)([^>]*?)placeholder="([^"]{4,80})"([^>]*?)>/g;
    while ((match = placeholderPattern.exec(content)) !== null) {
        const before = match[2];
        const placeholder = match[3];
        const after = match[4];

        if (before.includes('data-i18n-placeholder') || after.includes('data-i18n-placeholder')) continue;
        if (isCodeOrMeta(placeholder)) continue;

        const key = textToKey(placeholder);
        if (!key) continue;

        let uniqueKey = key + 'Placeholder';
        while (usedKeys.has(uniqueKey)) uniqueKey += '2';
        usedKeys.add(uniqueKey);

        translations.en[uniqueKey] = placeholder;
        translations.zh[uniqueKey] = lookupTranslation(placeholder, 'zh');
        translations.th[uniqueKey] = lookupTranslation(placeholder, 'th');

        keysAdded++;
    }

    if (keysAdded === 0) {
        return { page: filename, status: 'no-strings-found', keysAdded: 0 };
    }

    // Apply replacements (reverse order)
    for (const r of replacements.sort((a, b) => b.position - a.position)) {
        modified = modified.slice(0, r.position) + r.replacement + modified.slice(r.position + r.length);
    }

    // Inject nw-i18n-core.js if missing
    if (!modified.includes('nw-i18n-core')) {
        const i18nScript = '    <script src="/static/nw-i18n-core.js" defer></script>';
        if (modified.includes('</head>')) {
            modified = modified.replace('</head>', i18nScript + '\n</head>');
        }
    }

    // Build & inject NW_I18N.register block
    const varName = pageId.toUpperCase() + '_I18N';
    const registerBlock = buildRegisterBlock(varName, translations, pageId);

    if (modified.includes('</body>')) {
        modified = modified.replace('</body>',
            `<script>\n${registerBlock}\n</script>\n</body>`
        );
    }

    if (!DRY_RUN) {
        fs.writeFileSync(filePath, modified, 'utf8');
    }

    return {
        page: filename,
        status: 'fixed',
        keysAdded,
        sampleKeys: Object.keys(translations.en).slice(0, 5)
    };
}

function buildRegisterBlock(varName, translations, pageId) {
    const lines = [];
    lines.push(`// Auto-generated i18n translations for ${pageId}`);
    lines.push(`// Generated by NW i18n Guard v2.0`);
    lines.push(`// Strings marked [ZH] or [TH] need human translation`);
    lines.push(`const ${varName} = {`);

    for (const lang of SUPPORTED_LANGS) {
        lines.push(`  ${lang}: {`);
        const entries = Object.entries(translations[lang]);
        for (let i = 0; i < entries.length; i++) {
            const [key, val] = entries[i];
            const escaped = String(val).replace(/'/g, "\\'");
            const comma = i < entries.length - 1 ? ',' : '';
            lines.push(`    ${key}: '${escaped}'${comma}`);
        }
        lines.push(`  }${lang !== 'th' ? ',' : ''}`);
    }

    lines.push('};');
    lines.push(`if (typeof NW_I18N !== 'undefined') NW_I18N.register(${varName});`);

    return lines.join('\n');
}

// ══════════════════════════════════════════════════════════════════
//  FIX: Replace fake translations in existing register blocks
// ══════════════════════════════════════════════════════════════════

function fixFakeTranslations(filePath) {
    const filename = path.basename(filePath);
    const pageName = filename.replace('.html', '');
    let content = fs.readFileSync(filePath, 'utf8');
    let fixCount = 0;

    const valuesSystems = extractTranslationValues(content);

    for (const [sysName, langValues] of Object.entries(valuesSystems)) {
        const enValues = langValues.en || {};

        for (const targetLang of ['zh', 'th']) {
            const targetValues = langValues[targetLang] || {};

            for (const [key, enVal] of Object.entries(enValues)) {
                const targetVal = targetValues[key];
                if (!targetVal) continue;
                if (UNTRANSLATABLE.has(enVal.trim())) continue;
                if (enVal.length <= 3) continue;
                if (/^\d+$/.test(enVal)) continue;
                if (UNTRANSLATABLE_PATTERNS.some(p => p.test(enVal))) continue;

                // If zh/th is identical to en, try to replace with dictionary
                if (targetVal === enVal && ENGLISH_TEXT_PATTERN.test(enVal)) {
                    const realTranslation = lookupDictionary(enVal.trim(), targetLang);
                    if (realTranslation && realTranslation !== enVal) {
                        // Replace in file: find `key: 'enVal'` in the target lang block
                        // This is tricky — we use a targeted regex
                        const escapedVal = enVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const pattern = new RegExp(
                            `(${key}\\s*:\\s*['"])${escapedVal}(['"])`,
                            'g'
                        );

                        // Only replace occurrences AFTER the first en block
                        // Simple heuristic: replace all, dictionary values won't match en
                        const newContent = content.replace(pattern, `$1${realTranslation}$2`);
                        if (newContent !== content) {
                            content = newContent;
                            fixCount++;
                        }
                    }
                }
            }
        }
    }

    if (fixCount > 0 && !DRY_RUN) {
        fs.writeFileSync(filePath, content, 'utf8');
    }

    return fixCount;
}

function lookupDictionary(enText, lang) {
    // 1. Exact match in inline dict
    if (COMMON_TRANSLATIONS[enText]?.[lang]) return COMMON_TRANSLATIONS[enText][lang];
    // 2. Exact match in supplement JSON
    if (SUPPLEMENT_DICT[enText]?.[lang]) return SUPPLEMENT_DICT[enText][lang];
    // 3. Case-insensitive inline dict
    const lower = enText.toLowerCase();
    for (const [key, val] of Object.entries(COMMON_TRANSLATIONS)) {
        if (key.toLowerCase() === lower && val[lang]) return val[lang];
    }
    // 4. Case-insensitive supplement
    for (const [key, val] of Object.entries(SUPPLEMENT_DICT)) {
        if (key.toLowerCase() === lower && val[lang]) return val[lang];
    }
    return null; // No match — don't replace with placeholder
}

// ══════════════════════════════════════════════════════════════════
//  FIX: Remove duplicate auto-fixer junk blocks
// ══════════════════════════════════════════════════════════════════

function removeDuplicateAutoFixerBlocks(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Only process if the file has the OLD auto-fixer v1.0 marker specifically
    if (!content.includes('Generated by NW-I18N Auto-Fixer v1.0')) {
        return 0;
    }

    // Find the auto-fixer block
    const autoFixerPos = content.indexOf('Generated by NW-I18N Auto-Fixer v1.0');
    if (autoFixerPos < 0) return 0;

    // Check if there's a DIFFERENT i18n system BEFORE the auto-fixer block
    const beforeBlock = content.substring(0, autoFixerPos);
    const hasRealI18nBefore =
        /const\s+i18n\s*=\s*\{[\s\S]*?\ben\s*:\s*\{/.test(beforeBlock) ||
        /const\s+\w+Translations\s*=\s*\{[\s\S]*?\ben\s*:\s*\{/.test(beforeBlock);

    // Also check: does the auto-fixer block itself have real translations?
    // Extract the block and check if zh values differ from en
    const blockMatch = content.substring(autoFixerPos - 200).match(
        /<script>\s*\n\/\/ Auto-generated i18n translations[\s\S]*?Generated by NW-I18N Auto-Fixer v1\.0[\s\S]*?<\/script>/
    );

    if (!blockMatch) return 0;

    // If there's another real i18n system AND the auto-fixer block has fake translations, remove it
    if (hasRealI18nBefore) {
        const junkPattern = /<script>\s*\n\/\/ Auto-generated i18n translations[\s\S]*?Generated by NW-I18N Auto-Fixer v1\.0[\s\S]*?<\/script>\s*\n?/;
        const newContent = content.replace(junkPattern, '');

        if (newContent !== content) {
            if (!DRY_RUN) {
                fs.writeFileSync(filePath, newContent, 'utf8');
            }
            return 1;
        }
    }

    // If the auto-fixer block is the ONLY i18n and has the _I18N var, check for
    // a duplicate _I18N variable declaration (same name appears twice)
    const varNameMatch = blockMatch[0].match(/const\s+(\w+_I18N)\s*=/);
    if (varNameMatch) {
        const varName = varNameMatch[1];
        const re = new RegExp(`const\\s+${varName}\\s*=`, 'g');
        const matches = content.match(re);
        if (matches && matches.length > 1) {
            // Duplicate — remove the auto-fixer one (it's the junk copy)
            const junkPattern = /<script>\s*\n\/\/ Auto-generated i18n translations[\s\S]*?Generated by NW-I18N Auto-Fixer v1\.0[\s\S]*?<\/script>\s*\n?/;
            const newContent = content.replace(junkPattern, '');
            if (newContent !== content) {
                if (!DRY_RUN) {
                    fs.writeFileSync(filePath, newContent, 'utf8');
                }
                return 1;
            }
        }
    }

    return 0;
}

// ══════════════════════════════════════════════════════════════════
//  PER-PAGE AUDIT (detection side)
// ══════════════════════════════════════════════════════════════════

function auditPage(filePath) {
    const pageName = path.basename(filePath, '.html');
    const html = fs.readFileSync(filePath, 'utf8');

    section(`${pageName}.html`);

    // 1. Check data-i18n keys vs translation registrations
    const dataI18nKeys = extractDataI18nKeys(html);
    const translationSystems = extractAllTranslationSystems(html);
    const systemNames = Object.keys(translationSystems);

    if (dataI18nKeys.size === 0) {
        warn(pageName, `No data-i18n attributes found \u2014 page may be fully JS-rendered or missing i18n`);
    } else {
        const allKeys = {};
        for (const lang of SUPPORTED_LANGS) {
            allKeys[lang] = new Set();
            for (const sys of Object.values(translationSystems)) {
                if (sys[lang]) {
                    for (const k of sys[lang]) allKeys[lang].add(k);
                }
            }
        }

        // Orphaned keys
        const orphanedKeys = [];
        for (const key of dataI18nKeys) {
            let found = false;
            for (const lang of SUPPORTED_LANGS) {
                if (allKeys[lang]?.has(key)) { found = true; break; }
            }
            if (!found) orphanedKeys.push(key);
        }

        if (orphanedKeys.length > 0) {
            fail(pageName, `${orphanedKeys.length} orphaned data-i18n keys: ${orphanedKeys.slice(0, 8).join(', ')}${orphanedKeys.length > 8 ? '...' : ''}`);
            if (FIX_REPORT) fixSuggestions.push({ page: pageName, type: 'orphaned_keys', keys: orphanedKeys });
        } else {
            pass(pageName, `All ${dataI18nKeys.size} data-i18n keys found in translation blocks`);
        }

        // Per-language coverage
        for (const lang of SUPPORTED_LANGS) {
            const missing = [];
            for (const key of dataI18nKeys) {
                if (!allKeys[lang]?.has(key)) missing.push(key);
            }
            if (missing.length > 0 && missing.length !== orphanedKeys.length) {
                const langSpecific = missing.filter(k => !orphanedKeys.includes(k));
                if (langSpecific.length > 0) {
                    fail(pageName, `${lang}: ${langSpecific.length} keys missing: ${langSpecific.slice(0, 5).join(', ')}${langSpecific.length > 5 ? '...' : ''}`);
                }
            } else if (allKeys[lang]?.size > 0) {
                pass(pageName, `${lang}: ${allKeys[lang].size} keys registered`);
            }
        }
    }

    // 2. Fake translations
    const valuesSystems = extractTranslationValues(html);
    for (const [sysName, langValues] of Object.entries(valuesSystems)) {
        const enValues = langValues.en || {};
        for (const targetLang of ['zh', 'th']) {
            const targetValues = langValues[targetLang] || {};
            let fakeCount = 0;
            const fakeExamples = [];

            for (const [key, enVal] of Object.entries(enValues)) {
                const targetVal = targetValues[key];
                if (!targetVal) continue;
                if (UNTRANSLATABLE.has(enVal.trim())) continue;
                if (enVal.length <= 3) continue;
                if (/^\d+$/.test(enVal)) continue;
                if (UNTRANSLATABLE_PATTERNS.some(p => p.test(enVal))) continue;
                if (targetVal === enVal && ENGLISH_TEXT_PATTERN.test(enVal)) {
                    fakeCount++;
                    if (fakeExamples.length < 5) fakeExamples.push(key);
                }
            }

            if (fakeCount > 0) {
                fail(pageName, `${sysName} ${targetLang}: ${fakeCount} fake translations: ${fakeExamples.join(', ')}${fakeCount > 5 ? '...' : ''}`);
                if (FIX_REPORT) fixSuggestions.push({ page: pageName, type: 'fake_translations', system: sysName, lang: targetLang, count: fakeCount, examples: fakeExamples });
            } else if (Object.keys(targetValues).length > 0) {
                pass(pageName, `${sysName} ${targetLang}: translations appear genuine (${Object.keys(targetValues).length} keys)`);
            }
        }
    }

    // 3. Hardcoded English in JS
    const hardcoded = findHardcodedEnglish(html);
    if (hardcoded.length > 0) {
        const examples = hardcoded.slice(0, 5).map(h => `L${h.line}: "${h.text}"`);
        warn(pageName, `${hardcoded.length} potential hardcoded English in JS: ${examples.join('; ')}${hardcoded.length > 5 ? '...' : ''}`);
        if (FIX_REPORT) fixSuggestions.push({ page: pageName, type: 'hardcoded_english', items: hardcoded });
    } else {
        pass(pageName, 'No obvious hardcoded English in JS');
    }

    // 4. Multiple i18n systems
    if (systemNames.length > 1) {
        warn(pageName, `Multiple i18n systems detected: ${systemNames.join(', ')}`);
    } else if (systemNames.length === 1) {
        pass(pageName, `Single i18n system: ${systemNames[0]}`);
    }
}

// ══════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════

console.log(`\n${C.bold}\u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E${C.reset}`);
console.log(`${C.bold}\u2502  NW i18n Guard v2.0 \u2014 Catch + Fix              \u2502${C.reset}`);
console.log(`${C.bold}\u2502  Replaces 5 scripts \u2192 1 unified tool           \u2502${C.reset}`);
console.log(`${C.bold}\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F${C.reset}\n`);

// Determine files
const targetFile = process.argv.find(a => a.endsWith('.html'));
let files = [];

if (targetFile) {
    const fullPath = path.join(PUBLIC_DIR, targetFile);
    if (fs.existsSync(fullPath)) {
        files = [fullPath];
    } else {
        console.error(`File not found: ${fullPath}`);
        process.exit(1);
    }
} else {
    files = fs.readdirSync(PUBLIC_DIR)
        .filter(f => f.endsWith('.html'))
        .map(f => path.join(PUBLIC_DIR, f))
        .sort();
}

if (FIX_MODE) {
    console.log(`${C.info}MODE: AUTO-FIX${DRY_RUN ? ' (DRY RUN)' : ''}${C.reset}`);
    console.log(`Fixing ${files.length} file(s)...\n`);

    // Phase 1: Fix pages without any i18n (inject register blocks)
    section('Phase 1: Inject i18n into un-translated pages');
    for (const file of files) {
        const result = fixPage(file);
        if (!result) continue;

        if (result.status === 'fixed') {
            fixedPages++;
            fixedKeys += result.keysAdded;
            console.log(`  ${C.pass}\u2713 ${result.page} \u2014 ${result.keysAdded} keys added${DRY_RUN ? ' (dry-run)' : ''}${C.reset}`);
        } else if (result.status === 'already-translated') {
            if (VERBOSE) console.log(`  ${C.dim}\u25CB ${result.page} \u2014 already has translations${C.reset}`);
        } else {
            if (VERBOSE) console.log(`  ${C.dim}- ${result.page} \u2014 ${result.status}${C.reset}`);
        }
    }

    // Phase 2: Fix fake translations in existing register blocks
    section('Phase 2: Replace fake translations with real ones');
    let fakesFixed = 0;
    for (const file of files) {
        const count = fixFakeTranslations(file);
        if (count > 0) {
            fakesFixed += count;
            console.log(`  ${C.pass}\u2713 ${path.basename(file)} \u2014 ${count} fake translations replaced${DRY_RUN ? ' (dry-run)' : ''}${C.reset}`);
        }
    }

    // Phase 3: Remove duplicate auto-fixer junk blocks
    // Pages that already have real i18n (const i18n, *Translations, inline _I18N)
    // sometimes got a second junk block from the old NW-I18N Auto-Fixer v1.0
    section('Phase 3: Remove duplicate auto-fixer junk blocks');
    let junkRemoved = 0;
    for (const file of files) {
        const count = removeDuplicateAutoFixerBlocks(file);
        if (count > 0) {
            junkRemoved += count;
            console.log(`  ${C.pass}\u2713 ${path.basename(file)} \u2014 removed duplicate auto-fixer block${DRY_RUN ? ' (dry-run)' : ''}${C.reset}`);
        }
    }

    // Summary
    console.log(`\n${C.bold}\u2550`.repeat(50) + C.reset);
    console.log(`  Pages fixed:         ${fixedPages}`);
    console.log(`  Keys added:          ${fixedKeys}`);
    console.log(`  Fakes replaced:      ${fakesFixed}`);
    console.log(`  Junk blocks removed: ${junkRemoved}`);
    console.log(`  Total scanned:       ${files.length}`);
    if (DRY_RUN) console.log(`\n  ${C.warn}\u26A0 DRY RUN \u2014 no files were modified${C.reset}`);
    console.log(`${C.bold}\u2550`.repeat(50) + C.reset);

} else {
    // AUDIT MODE
    console.log(`${C.info}MODE: AUDIT${C.reset}`);
    console.log(`Auditing ${files.length} file(s)...\n`);

    for (const file of files) {
        auditPage(file);
    }
}

// ── Summary ─────────────────────────────────────────────────────
if (!FIX_MODE || VERBOSE) {
    console.log(`\n${C.bold}\u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E${C.reset}`);
    console.log(`${C.bold}\u2502                 AUDIT SUMMARY                  \u2502${C.reset}`);
    console.log(`${C.bold}\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F${C.reset}`);
    console.log(`  Total checks:  ${totalChecks}`);
    console.log(`  ${C.pass}Passed:  ${passed}${C.reset}`);
    console.log(`  ${C.warn}Warnings:  ${warnings}${C.reset}`);
    console.log(`  ${C.fail}Failures:  ${failed}${C.reset}`);

    if (allFailures.length > 0) {
        console.log(`\n${C.fail}${C.bold}FAILURES:${C.reset}`);
        allFailures.forEach(f => console.log(`  ${C.fail}\u2022 ${f}${C.reset}`));
    }

    if (FIX_REPORT && fixSuggestions.length > 0) {
        console.log(`\n${C.info}${C.bold}FIX SUGGESTIONS:${C.reset}`);
        for (const fix of fixSuggestions) {
            if (fix.type === 'orphaned_keys') {
                console.log(`\n  ${fix.page}: Add these keys to translation blocks:`);
                fix.keys.forEach(k => console.log(`    ${k}: '...'`));
            } else if (fix.type === 'fake_translations') {
                console.log(`\n  ${fix.page} (${fix.system} ${fix.lang}): ${fix.count} keys need real translations`);
                fix.examples.forEach(k => console.log(`    ${k}`));
            } else if (fix.type === 'hardcoded_english') {
                console.log(`\n  ${fix.page}: Wrap these in t() or data-i18n:`);
                fix.items.slice(0, 10).forEach(h => console.log(`    Line ${h.line}: "${h.text}"`));
            }
        }
    }

    const status = failed > 0 ? 'FAILED' : 'PASSED';
    const statusColor = failed > 0 ? C.fail : C.pass;
    console.log(`\n${statusColor}${C.bold}i18n Guard ${status}${failed > 0 ? ` with ${failed} failure(s)` : ''}${warnings > 0 ? ` and ${warnings} warning(s)` : ''}${C.reset}\n`);
}

process.exit(failed > 0 ? 1 : 0);
