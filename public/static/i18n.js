/**
 * NumbahWan Guild - Internationalization (i18n) Module
 * Supports: English (en), Traditional Chinese (zh), Thai (th)
 * 
 * Usage:
 * 1. Include this script in your HTML: <script src="/static/i18n.js"></script>
 * 2. Add data-i18n="keyName" to elements that need translation
 * 3. Add data-i18n-placeholder="keyName" for input placeholders
 * 4. Call initI18n(pageTranslations) with page-specific translations
 */

// Core translations shared across all pages
const coreTranslations = {
  en: {
    // Navigation
    home: "Home",
    about: "About",
    roster: "Roster",
    cpRace: "CP Race",
    progress: "Progress",
    guildFun: "Guild Fun",
    memes: "Memes",
    apply: "Apply",
    joinUs: "Join Us",
    
    // Common
    backToHome: "Back to Home",
    submit: "Submit",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    
    // Footer
    madeWith: "Made with ❤️ by the family",
    server: "Server: TW",
    
    // Guild info
    guildName: "NumbahWan",
    tagline: "MapleStory Idle RPG Guild",
    motto: "We are not just a guild, but",
    family: "FAMILY",
  },
  zh: {
    // Navigation
    home: "首頁",
    about: "關於",
    roster: "成員",
    cpRace: "戰力榜",
    progress: "進度",
    guildFun: "公會趣事",
    memes: "迷因",
    apply: "申請",
    joinUs: "加入我們",
    
    // Common
    backToHome: "返回首頁",
    submit: "提交",
    loading: "載入中...",
    error: "錯誤",
    success: "成功",
    
    // Footer
    madeWith: "家人們用 ❤️ 製作",
    server: "伺服器：台灣",
    
    // Guild info
    guildName: "NumbahWan",
    tagline: "楓之谷放置RPG公會",
    motto: "我們不只是公會，更是",
    family: "家人",
  },
  th: {
    // Navigation
    home: "หน้าแรก",
    about: "เกี่ยวกับ",
    roster: "สมาชิก",
    cpRace: "อันดับ CP",
    progress: "ความคืบหน้า",
    guildFun: "กิลด์สนุกๆ",
    memes: "มีม",
    apply: "สมัคร",
    joinUs: "เข้าร่วม",
    
    // Common
    backToHome: "กลับหน้าแรก",
    submit: "ส่ง",
    loading: "กำลังโหลด...",
    error: "ข้อผิดพลาด",
    success: "สำเร็จ",
    
    // Footer
    madeWith: "สร้างด้วย ❤️ โดยครอบครัว",
    server: "เซิร์ฟเวอร์: TW",
    
    // Guild info
    guildName: "NumbahWan",
    tagline: "กิลด์ MapleStory Idle RPG",
    motto: "เราไม่ได้เป็นแค่กิลด์ แต่เป็น",
    family: "ครอบครัว",
  }
};

// Language metadata
const langMeta = {
  en: { flag: "🇬🇧", name: "English", code: "EN" },
  zh: { flag: "🇹🇼", name: "繁體中文", code: "中文" },
  th: { flag: "🇹🇭", name: "ไทย", code: "ไทย" }
};

// Current language state - sync with NW_NAV
let currentLang = localStorage.getItem('nw_lang') || localStorage.getItem('lang') || 'en';
let pageTranslations = {};

/**
 * Initialize i18n with page-specific translations
 * @param {Object} translations - Page-specific translation object
 */
function initI18n(translations = {}) {
  pageTranslations = translations;
  
  // Merge core translations with page translations
  const merged = {
    en: { ...coreTranslations.en, ...(translations.en || {}) },
    zh: { ...coreTranslations.zh, ...(translations.zh || {}) },
    th: { ...coreTranslations.th, ...(translations.th || {}) }
  };
  
  pageTranslations = merged;
  
  // Apply current language
  setLanguage(currentLang);
  
  // Setup language switcher if exists
  setupLanguageSwitcher();
}

/**
 * Set the current language and update all translations
 * @param {string} lang - Language code (en, zh, th)
 */
function setLanguage(lang) {
  if (!pageTranslations[lang]) {
    console.warn(`Language '${lang}' not found, falling back to 'en'`);
    lang = 'en';
  }
  
  currentLang = lang;
  localStorage.setItem('lang', lang);
  localStorage.setItem('nw_lang', lang); // Sync with NW_NAV
  
  // Update HTML lang attribute
  document.documentElement.lang = lang;
  
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = getTranslation(key);
    if (translation) {
      el.textContent = translation;
    }
  });
  
  // Update all elements with data-i18n-html attribute (for HTML content)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const translation = getTranslation(key);
    if (translation) {
      el.innerHTML = translation;
    }
  });
  
  // Update all placeholders with data-i18n-placeholder attribute
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translation = getTranslation(key);
    if (translation) {
      el.placeholder = translation;
    }
  });
  
  // Update all titles with data-i18n-title attribute
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const translation = getTranslation(key);
    if (translation) {
      el.title = translation;
    }
  });
  
  // Update language switcher display
  updateLanguageSwitcherDisplay();
  
  // Close language menu if open
  const langMenu = document.getElementById('lang-menu');
  if (langMenu) {
    langMenu.classList.add('hidden');
  }
  
  // Dispatch custom event for any additional handling
  document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

/**
 * Get translation for a key
 * @param {string} key - Translation key (supports dot notation: "section.key")
 * @returns {string|null} - Translated string or null
 */
function getTranslation(key) {
  if (!key) return null;
  
  // Support dot notation for nested keys
  const keys = key.split('.');
  let value = pageTranslations[currentLang];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return null;
    }
  }
  
  return typeof value === 'string' ? value : null;
}

/**
 * Get current language code
 * @returns {string} - Current language code
 */
function getCurrentLang() {
  return currentLang;
}

/**
 * Setup language switcher UI
 */
function setupLanguageSwitcher() {
  const switcher = document.getElementById('lang-switcher');
  if (!switcher) return;
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!switcher.contains(e.target)) {
      const menu = document.getElementById('lang-menu');
      if (menu) menu.classList.add('hidden');
    }
  });
}

/**
 * Toggle language menu visibility
 */
function toggleLangMenu() {
  const menu = document.getElementById('lang-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

/**
 * Update language switcher display
 */
function updateLanguageSwitcherDisplay() {
  const flagEl = document.getElementById('current-lang-flag');
  const codeEl = document.getElementById('current-lang-code');
  
  if (flagEl) flagEl.textContent = langMeta[currentLang].flag;
  if (codeEl) codeEl.textContent = langMeta[currentLang].code;
}

/**
 * Generate language switcher HTML
 * @returns {string} - HTML string for language switcher
 */
function generateLangSwitcherHTML() {
  return `
    <div class="relative" id="lang-switcher">
      <button onclick="toggleLangMenu()" class="px-3 py-1.5 rounded-full text-sm flex items-center gap-2 hover:bg-orange-500/20 transition-all border border-orange-500/30">
        <span id="current-lang-flag">${langMeta[currentLang].flag}</span>
        <span id="current-lang-code" class="hidden sm:inline">${langMeta[currentLang].code}</span>
        <svg class="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      <div id="lang-menu" class="hidden absolute right-0 top-full mt-2 glass-card rounded-lg overflow-hidden min-w-[140px] z-50 border border-orange-500/30">
        <button onclick="setLanguage('en')" class="w-full px-4 py-2.5 text-left hover:bg-orange-500/20 flex items-center gap-3 text-sm transition-colors">
          <span>🇬🇧</span> English
        </button>
        <button onclick="setLanguage('zh')" class="w-full px-4 py-2.5 text-left hover:bg-orange-500/20 flex items-center gap-3 text-sm transition-colors">
          <span>🇹🇼</span> 繁體中文
        </button>
        <button onclick="setLanguage('th')" class="w-full px-4 py-2.5 text-left hover:bg-orange-500/20 flex items-center gap-3 text-sm transition-colors">
          <span>🇹🇭</span> ไทย
        </button>
      </div>
    </div>
  `;
}

/**
 * Generate standard navigation HTML with i18n support
 * @param {Object} options - Navigation options
 * @returns {string} - HTML string for navigation
 */
function generateNavHTML(options = {}) {
  const { showApply = true, currentPage = '' } = options;
  
  return `
    <nav class="fixed top-0 left-0 right-0 z-50 glass-card mx-4 mt-4 rounded-full">
      <div class="container mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2">
          <span class="text-2xl">🎮</span>
          <span class="pixel-font text-xs text-orange-400">NumbahWan</span>
        </a>
        <div class="flex items-center gap-3">
          <a href="/" class="text-sm hover:text-orange-400 transition-colors ${currentPage === 'home' ? 'text-orange-400' : ''}" data-i18n="home">Home</a>
          <a href="/memes" class="text-sm hover:text-orange-400 transition-colors ${currentPage === 'memes' ? 'text-orange-400' : ''}" data-i18n="memes">Memes</a>
          ${generateLangSwitcherHTML()}
          ${showApply ? `<a href="/apply" class="px-4 py-2 bg-orange-500 rounded-full text-sm font-bold hover:bg-orange-400 transition-colors" data-i18n="joinUs">Join Us</a>` : ''}
        </div>
      </div>
    </nav>
  `;
}

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initI18n, setLanguage, getTranslation, getCurrentLang, generateNavHTML, generateLangSwitcherHTML };
}
