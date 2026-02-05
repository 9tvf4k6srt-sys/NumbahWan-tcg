/**
 * NumbahWan i18n Core - SINGLE SOURCE OF TRUTH
 * =============================================
 * 
 * This is the ONLY file that should handle language state.
 * All pages MUST include this file and use NW_I18N.
 * 
 * USAGE:
 * 1. Include in HTML: <script src="/static/nw-i18n-core.js"></script>
 * 2. Register page translations: NW_I18N.register({ en: {...}, zh: {...}, th: {...} })
 * 3. Get translation: NW_I18N.t('keyName') or NW_I18N.t('keyName', 'fallback')
 * 4. Language changes are AUTOMATIC - no event listeners needed!
 * 
 * STORAGE KEY: 'nw_lang' (unified)
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  const STORAGE_KEY = 'nw_lang';  // THE ONLY KEY - everything syncs to this
  const LEGACY_KEYS = ['lang', 'nw_lang', 'preferred_lang'];  // Keys to migrate from
  const DEFAULT_LANG = 'en';
  const SUPPORTED_LANGS = ['en', 'zh', 'th'];

  // ============================================================================
  // CORE TRANSLATIONS (shared across all pages)
  // ============================================================================
  
  const CORE_TRANSLATIONS = {
    en: {
      // Navigation
      home: "Home", back: "Back", menu: "Menu", close: "Close",
      // Actions
      submit: "Submit", cancel: "Cancel", save: "Save", delete: "Delete",
      confirm: "Confirm", loading: "Loading...", error: "Error", success: "Success",
      // Common
      yes: "Yes", no: "No", ok: "OK", retry: "Retry",
      // Time
      now: "Now", today: "Today", yesterday: "Yesterday",
      hoursAgo: "hours ago", minutesAgo: "minutes ago", justNow: "Just now",
      // Language names
      langEn: "English", langZh: "中文", langTh: "ไทย"
    },
    zh: {
      home: "首頁", back: "返回", menu: "選單", close: "關閉",
      submit: "提交", cancel: "取消", save: "儲存", delete: "刪除",
      confirm: "確認", loading: "載入中...", error: "錯誤", success: "成功",
      yes: "是", no: "否", ok: "確定", retry: "重試",
      now: "現在", today: "今天", yesterday: "昨天",
      hoursAgo: "小時前", minutesAgo: "分鐘前", justNow: "剛剛",
      langEn: "English", langZh: "中文", langTh: "ไทย"
    },
    th: {
      home: "หน้าแรก", back: "กลับ", menu: "เมนู", close: "ปิด",
      submit: "ส่ง", cancel: "ยกเลิก", save: "บันทึก", delete: "ลบ",
      confirm: "ยืนยัน", loading: "กำลังโหลด...", error: "ข้อผิดพลาด", success: "สำเร็จ",
      yes: "ใช่", no: "ไม่", ok: "ตกลง", retry: "ลองอีกครั้ง",
      now: "ตอนนี้", today: "วันนี้", yesterday: "เมื่อวาน",
      hoursAgo: "ชั่วโมงที่แล้ว", minutesAgo: "นาทีที่แล้ว", justNow: "เมื่อกี้",
      langEn: "English", langZh: "中文", langTh: "ไทย"
    }
  };

  // ============================================================================
  // STATE
  // ============================================================================
  
  let _currentLang = DEFAULT_LANG;
  let _pageTranslations = { en: {}, zh: {}, th: {} };
  let _initialized = false;
  let _onChangeCallbacks = [];

  // ============================================================================
  // PRIVATE FUNCTIONS
  // ============================================================================
  
  /**
   * Migrate from legacy storage keys to unified key
   */
  function _migrateLegacyKeys() {
    let foundLang = localStorage.getItem(STORAGE_KEY);
    
    if (!foundLang) {
      for (const key of LEGACY_KEYS) {
        const value = localStorage.getItem(key);
        if (value && SUPPORTED_LANGS.includes(value)) {
          foundLang = value;
          break;
        }
      }
    }
    
    // Set unified key
    if (foundLang && SUPPORTED_LANGS.includes(foundLang)) {
      _currentLang = foundLang;
    }
    
    // Sync all keys to ensure consistency
    _syncAllKeys(_currentLang);
  }

  /**
   * Sync language to all storage keys (for backward compatibility)
   */
  function _syncAllKeys(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
    // Also set legacy keys so old code doesn't break
    for (const key of LEGACY_KEYS) {
      localStorage.setItem(key, lang);
    }
  }

  /**
   * Apply translations to DOM elements
   */
  function _applyTranslations() {
    const translations = _getMergedTranslations();
    
    // data-i18n for text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = _getNestedValue(translations, key);
      if (translation) {
        el.textContent = translation;
      }
    });

    // data-i18n-html for HTML content
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const translation = _getNestedValue(translations, key);
      if (translation) {
        el.innerHTML = translation;
      }
    });

    // data-i18n-placeholder for input placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translation = _getNestedValue(translations, key);
      if (translation) {
        el.placeholder = translation;
      }
    });

    // data-i18n-title for title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const translation = _getNestedValue(translations, key);
      if (translation) {
        el.title = translation;
      }
    });

    // Update html lang attribute
    document.documentElement.lang = _currentLang;
    
    console.log(`[NW_I18N] Applied translations for: ${_currentLang}`);
  }

  /**
   * Get merged translations (core + page)
   */
  function _getMergedTranslations() {
    return {
      ...CORE_TRANSLATIONS[_currentLang] || CORE_TRANSLATIONS.en,
      ..._pageTranslations[_currentLang] || {}
    };
  }

  /**
   * Get nested value from object using dot notation
   */
  function _getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  /**
   * Setup automatic language change listener from NW_NAV
   */
  function _setupNavListener() {
    // Listen for NW_NAV language changes
    document.addEventListener('nw-lang-change', (e) => {
      const lang = e.detail?.lang;
      if (lang && lang !== _currentLang) {
        NW_I18N.setLang(lang);
      }
    });

    // Also listen for legacy event name
    document.addEventListener('languageChanged', (e) => {
      const lang = e.detail?.lang;
      if (lang && lang !== _currentLang) {
        NW_I18N.setLang(lang);
      }
    });

    // Listen for storage changes from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue && e.newValue !== _currentLang) {
        NW_I18N.setLang(e.newValue);
      }
    });
  }

  /**
   * Auto-initialize when DOM is ready
   */
  function _autoInit() {
    if (_initialized) return;
    
    _migrateLegacyKeys();
    _setupNavListener();
    _applyTranslations();
    _initialized = true;
    
    console.log(`[NW_I18N] v2.0 Initialized - Current language: ${_currentLang}`);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  const NW_I18N = {
    /**
     * Get current language
     */
    get lang() {
      return _currentLang;
    },

    /**
     * Register page-specific translations
     * @param {Object} translations - { en: {...}, zh: {...}, th: {...} }
     */
    register(translations = {}) {
      _pageTranslations = {
        en: { ..._pageTranslations.en, ...(translations.en || {}) },
        zh: { ..._pageTranslations.zh, ...(translations.zh || {}) },
        th: { ..._pageTranslations.th, ...(translations.th || {}) }
      };
      
      // Re-apply if already initialized
      if (_initialized) {
        _applyTranslations();
      }
      
      return this;
    },

    /**
     * Set language
     * @param {string} lang - Language code (en, zh, th)
     */
    setLang(lang) {
      if (!SUPPORTED_LANGS.includes(lang)) {
        console.warn(`[NW_I18N] Unsupported language: ${lang}, using ${DEFAULT_LANG}`);
        lang = DEFAULT_LANG;
      }
      
      if (lang === _currentLang) return this;
      
      _currentLang = lang;
      _syncAllKeys(lang);
      _applyTranslations();
      
      // Notify callbacks
      _onChangeCallbacks.forEach(cb => {
        try { cb(lang); } catch (e) { console.error('[NW_I18N] Callback error:', e); }
      });
      
      return this;
    },

    /**
     * Get translation by key
     * @param {string} key - Translation key (supports dot notation: 'section.key')
     * @param {string} fallback - Fallback if key not found
     */
    t(key, fallback = null) {
      const translations = _getMergedTranslations();
      const value = _getNestedValue(translations, key);
      return value !== undefined ? value : (fallback !== null ? fallback : key);
    },

    /**
     * Register callback for language changes
     * @param {Function} callback - Called with new language code
     */
    onChange(callback) {
      if (typeof callback === 'function') {
        _onChangeCallbacks.push(callback);
      }
      return this;
    },

    /**
     * Force re-apply translations (useful after dynamic content load)
     */
    refresh() {
      _applyTranslations();
      return this;
    },

    /**
     * Get all translations for current language
     */
    getAll() {
      return _getMergedTranslations();
    },

    /**
     * Check if initialized
     */
    get ready() {
      return _initialized;
    },

    /**
     * Manual init (usually not needed - auto-inits on DOMContentLoaded)
     */
    init() {
      _autoInit();
      return this;
    }
  };

  // ============================================================================
  // AUTO-INITIALIZATION
  // ============================================================================
  
  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoInit);
  } else {
    // DOM already loaded
    _autoInit();
  }

  // Expose globally
  window.NW_I18N = NW_I18N;

  // Also expose as module if needed
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NW_I18N;
  }

  console.log('[NW_I18N] v2.0 Core loaded');
})();
