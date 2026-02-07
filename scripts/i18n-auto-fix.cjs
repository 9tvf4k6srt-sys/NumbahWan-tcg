#!/usr/bin/env node
/**
 * NW-I18N Auto-Fixer v1.0
 * ═══════════════════════════════════════════════════
 * 
 * Scans all HTML pages and automatically:
 * 1. Injects <script src="/static/nw-i18n-core.js"> if missing
 * 2. Finds visible text nodes that lack data-i18n
 * 3. Generates camelCase i18n keys
 * 4. Adds data-i18n attributes to elements
 * 5. Builds & injects NW_I18N.register({ en, zh, th }) block
 * 
 * Chinese/Thai translations use placeholder markers [ZH] / [TH]
 * for human translators to fill in later.
 * 
 * USAGE:
 *   node scripts/i18n-auto-fix.cjs                    # Fix all pages
 *   node scripts/i18n-auto-fix.cjs --dry-run          # Preview changes
 *   node scripts/i18n-auto-fix.cjs --page shrine.html # Fix one page
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SUPPORTED_LANGS = ['en', 'zh', 'th'];

// ═══════════════════════════════════════════════════
// TRANSLATION DICTIONARY (common guild/game terms)
// ═══════════════════════════════════════════════════

const COMMON_TRANSLATIONS = {
  // Navigation & UI
  'Home': { zh: '首页', th: 'หน้าแรก' },
  'Back': { zh: '返回', th: 'กลับ' },
  'Menu': { zh: '菜单', th: 'เมนู' },
  'Close': { zh: '关闭', th: 'ปิด' },
  'Submit': { zh: '提交', th: 'ส่ง' },
  'Cancel': { zh: '取消', th: 'ยกเลิก' },
  'Save': { zh: '保存', th: 'บันทึก' },
  'Delete': { zh: '删除', th: 'ลบ' },
  'Loading': { zh: '加载中', th: 'กำลังโหลด' },
  'Search': { zh: '搜索', th: 'ค้นหา' },
  'Filter': { zh: '筛选', th: 'กรอง' },
  'Sort': { zh: '排序', th: 'เรียงลำดับ' },
  'Settings': { zh: '设置', th: 'ตั้งค่า' },
  'Profile': { zh: '个人资料', th: 'โปรไฟล์' },
  'Logout': { zh: '退出', th: 'ออกจากระบบ' },
  'Login': { zh: '登录', th: 'เข้าสู่ระบบ' },
  // Game terms
  'Cards': { zh: '卡牌', th: 'การ์ด' },
  'Card': { zh: '卡牌', th: 'การ์ด' },
  'Wallet': { zh: '钱包', th: 'กระเป๋า' },
  'Market': { zh: '市场', th: 'ตลาด' },
  'Battle': { zh: '战斗', th: 'ต่อสู้' },
  'Guild': { zh: '公会', th: 'กิลด์' },
  'Auction': { zh: '拍卖', th: 'ประมูล' },
  'Forge': { zh: '锻造', th: 'หลอม' },
  'Shrine': { zh: '神社', th: 'ศาลเจ้า' },
  'Staking': { zh: '质押', th: 'สเตกกิ้ง' },
  'Fusion': { zh: '融合', th: 'ฟิวชั่น' },
  'Collection': { zh: '收藏', th: 'คอลเลกชัน' },
  'Rarity': { zh: '稀有度', th: 'ความหายาก' },
  'Common': { zh: '普通', th: 'ธรรมดา' },
  'Rare': { zh: '稀有', th: 'แรร์' },
  'Epic': { zh: '史诗', th: 'เอพิค' },
  'Legendary': { zh: '传说', th: 'ตำนาน' },
  'Mythic': { zh: '神话', th: 'มิธิค' },
  'Attack': { zh: '攻击', th: 'โจมตี' },
  'Defense': { zh: '防御', th: 'ป้องกัน' },
  'Health': { zh: '生命', th: 'พลังชีวิต' },
  'Level': { zh: '等级', th: 'ระดับ' },
  'Experience': { zh: '经验', th: 'ประสบการณ์' },
  'Inventory': { zh: '背包', th: 'คลัง' },
  'Quest': { zh: '任务', th: 'เควส' },
  'Achievement': { zh: '成就', th: 'ความสำเร็จ' },
  'Leaderboard': { zh: '排行榜', th: 'ลีดเดอร์บอร์ด' },
  'Tournament': { zh: '锦标赛', th: 'ทัวร์นาเมนต์' },
  'Reward': { zh: '奖励', th: 'รางวัล' },
  'Price': { zh: '价格', th: 'ราคา' },
  'Total': { zh: '总计', th: 'รวม' },
  'Balance': { zh: '余额', th: 'ยอดคงเหลือ' },
  'History': { zh: '历史', th: 'ประวัติ' },
  'Status': { zh: '状态', th: 'สถานะ' },
  'Active': { zh: '活跃', th: 'ใช้งาน' },
  'Completed': { zh: '已完成', th: 'เสร็จสิ้น' },
  'Pending': { zh: '待处理', th: 'รอดำเนินการ' },
  // Layout
  'View All': { zh: '查看全部', th: 'ดูทั้งหมด' },
  'Learn More': { zh: '了解更多', th: 'เรียนรู้เพิ่มเติม' },
  'Get Started': { zh: '开始', th: 'เริ่มต้น' },
  'Read More': { zh: '阅读更多', th: 'อ่านเพิ่มเติม' },
  'Show More': { zh: '显示更多', th: 'แสดงเพิ่มเติม' },
  'Show Less': { zh: '收起', th: 'แสดงน้อยลง' },
  'No Results': { zh: '没有结果', th: 'ไม่มีผลลัพธ์' },
};

// ═══════════════════════════════════════════════════
// TEXT EXTRACTION
// ═══════════════════════════════════════════════════

// Elements whose text content is NOT user-facing
const SKIP_TAGS = new Set([
  'script', 'style', 'noscript', 'code', 'pre', 'meta', 'link',
  'input', 'textarea', 'select', 'option', 'svg', 'path'
]);

// Attributes to skip (not visible text)
const SKIP_ATTRS = ['href', 'src', 'class', 'id', 'style', 'data-', 'onclick', 'onload', 'action', 'type', 'name', 'value', 'for'];

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

function textToKey(text, pageId) {
  // Generate camelCase key from English text
  const words = text.trim()
    .replace(/[^\w\s]/g, '')  // remove punctuation
    .split(/\s+/)
    .filter(w => w.length > 0)
    .slice(0, 5);  // max 5 words
  
  if (words.length === 0) return null;
  
  const key = words[0].toLowerCase() +
    words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  
  return key;
}

function lookupTranslation(enText, lang) {
  // Try exact match first
  if (COMMON_TRANSLATIONS[enText]?.[lang]) {
    return COMMON_TRANSLATIONS[enText][lang];
  }
  // Try case-insensitive
  const lower = enText.toLowerCase();
  for (const [key, val] of Object.entries(COMMON_TRANSLATIONS)) {
    if (key.toLowerCase() === lower && val[lang]) return val[lang];
  }
  // Placeholder for translator
  const prefix = lang === 'zh' ? '[ZH]' : '[TH]';
  return `${prefix} ${enText}`;
}

// ═══════════════════════════════════════════════════
// HTML PROCESSING
// ═══════════════════════════════════════════════════

function extractPageId(filename) {
  return filename.replace('.html', '').replace(/-/g, '_');
}

function processPage(filePath, dryRun = false) {
  const filename = path.basename(filePath);
  const pageId = extractPageId(filename);
  
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch { return null; }
  
  // Skip if already has NW_I18N.register
  if (content.includes('NW_I18N.register')) {
    return { page: filename, status: 'already-translated', keysAdded: 0 };
  }
  
  const translations = { en: {}, zh: {}, th: {} };
  let modified = content;
  let keysAdded = 0;
  const usedKeys = new Set();
  
  // Step 1: Find text in elements that should be translated
  // Match opening tag + text content (stop before <)
  const textPattern = /(<(?:h[1-6]|p|span|div|a|button|label|td|th|li|dt|dd|figcaption|strong|em|small|legend|summary|caption)\b[^>]*?>)([^<]+)/g;
  
  let match;
  const replacements = [];
  
  while ((match = textPattern.exec(content)) !== null) {
    const openTag = match[1];  // Full opening tag including >
    const rawText = match[2];
    const text = rawText.trim();
    
    // Skip if already has data-i18n
    if (openTag.includes('data-i18n')) continue;
    
    // Skip if it's code/meta/empty
    if (isCodeOrMeta(text)) continue;
    
    // Must contain at least one English word (capital letter start, 2+ chars)
    if (!/[A-Z][a-z]{1,}/.test(text) && !/^[a-z]{3,}(\s[a-z]+)+$/i.test(text)) continue;
    
    // Skip very short single words that might be abbreviations
    if (text.split(/\s+/).length === 1 && text.length < 4) continue;
    
    // Skip if inside script or style block
    const beforeMatch = content.slice(Math.max(0, match.index - 500), match.index);
    if (/<script\b[^>]*>[^<]*$/i.test(beforeMatch) || /<style\b[^>]*>[^<]*$/i.test(beforeMatch)) continue;
    
    const key = textToKey(text, pageId);
    if (!key || key.length < 2) continue;
    
    // Ensure unique keys
    let uniqueKey = key;
    let suffix = 2;
    while (usedKeys.has(uniqueKey)) {
      uniqueKey = key + suffix++;
    }
    usedKeys.add(uniqueKey);
    
    // Store translations
    translations.en[uniqueKey] = text;
    translations.zh[uniqueKey] = lookupTranslation(text, 'zh');
    translations.th[uniqueKey] = lookupTranslation(text, 'th');
    
    // Queue replacement: inject data-i18n into the opening tag (before the >)
    // Store position for precise replacement
    const tagStart = match.index;
    const tagEnd = tagStart + openTag.length;
    const tagWithAttr = openTag.slice(0, -1) + ` data-i18n="${uniqueKey}">`;
    replacements.push({
      position: tagStart,
      length: openTag.length,
      replacement: tagWithAttr
    });
    
    keysAdded++;
  }
  
  // Step 2: Also check placeholder attributes
  const placeholderPattern = /<(input|textarea)([^>]*?)placeholder="([^"]{4,80})"([^>]*?)>/g;
  while ((match = placeholderPattern.exec(content)) !== null) {
    const fullMatch = match[0];
    const tag = match[1];
    const before = match[2];
    const placeholder = match[3];
    const after = match[4];
    
    if (before.includes('data-i18n-placeholder') || after.includes('data-i18n-placeholder')) continue;
    if (isCodeOrMeta(placeholder)) continue;
    
    const key = textToKey(placeholder, pageId);
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
  
  // Apply replacements (reverse order to preserve positions)
  for (const r of replacements.sort((a, b) => b.position - a.position)) {
    modified = modified.slice(0, r.position) + r.replacement + modified.slice(r.position + r.length);
  }
  
  // Step 3: Inject nw-i18n-core.js if missing
  if (!modified.includes('nw-i18n-core')) {
    const i18nScript = '    <script src="/static/nw-i18n-core.js" defer></script>';
    // Insert before </head>
    if (modified.includes('</head>')) {
      modified = modified.replace('</head>', i18nScript + '\n</head>');
    }
  }
  
  // Step 4: Build and inject NW_I18N.register block
  const varName = pageId.toUpperCase() + '_I18N';
  const registerBlock = buildRegisterBlock(varName, translations, pageId);
  
  // Insert before </body> (inside a script tag)
  if (modified.includes('</body>')) {
    modified = modified.replace('</body>',
      `<script>\n${registerBlock}\n</script>\n</body>`
    );
  }
  
  if (!dryRun) {
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
  lines.push(`// Generated by NW-I18N Auto-Fixer v1.0`);
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

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const pageFilter = args.includes('--page') ? args[args.indexOf('--page') + 1] : null;
  
  console.log(`\nNW-I18N Auto-Fixer v1.0${dryRun ? ' (DRY RUN)' : ''}`);
  console.log('═'.repeat(50));
  
  let htmlFiles;
  if (pageFilter) {
    htmlFiles = [pageFilter];
  } else {
    try {
      htmlFiles = fs.readdirSync(PUBLIC_DIR).filter(f => f.endsWith('.html'));
    } catch (e) {
      console.error('Cannot read public directory:', e.message);
      process.exit(1);
    }
  }
  
  let totalFixed = 0;
  let totalKeys = 0;
  let totalSkipped = 0;
  const results = [];
  
  for (const file of htmlFiles) {
    const filePath = path.join(PUBLIC_DIR, file);
    if (!fs.existsSync(filePath)) continue;
    
    const result = processPage(filePath, dryRun);
    if (!result) continue;
    
    results.push(result);
    
    if (result.status === 'fixed') {
      totalFixed++;
      totalKeys += result.keysAdded;
      console.log(`  ✓ ${result.page} — ${result.keysAdded} keys added`);
    } else if (result.status === 'already-translated') {
      totalSkipped++;
      console.log(`  ○ ${result.page} — already has translations`);
    } else {
      console.log(`  - ${result.page} — ${result.status}`);
    }
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log(`  Pages fixed:    ${totalFixed}`);
  console.log(`  Keys added:     ${totalKeys}`);
  console.log(`  Already done:   ${totalSkipped}`);
  console.log(`  Total scanned:  ${htmlFiles.length}`);
  if (dryRun) console.log('\n  ⚠ DRY RUN — no files were modified');
  console.log('═'.repeat(50) + '\n');
}

if (require.main === module) {
  main();
}

module.exports = { processPage, buildRegisterBlock };
