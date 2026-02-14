/**
 * NW_I18N v3.0 — Universal Trilingual System
 * ============================================
 * ONE file. Works everywhere. No timing bugs.
 *
 * HOW IT WORKS:
 * 1. This script is loaded with `defer` in <head>.
 * 2. Inline page scripts define translations and call NW_I18N.register() / .registerPage().
 *    If NW_I18N hasn't loaded yet, the call is automatically queued.
 * 3. On DOMContentLoaded, this script:
 *    a) Drains any queued registrations
 *    b) Snapshots original English DOM for every [data-i18n] element
 *    c) Applies the stored language preference
 * 4. When the user clicks a language button in NW_NAV:
 *    NW_NAV calls NW_I18N.apply(lang) → updates DOM + fires onChange callbacks.
 *
 * FOR NEW PAGES — just include in <head>:
 *   <script src="/static/nw-i18n-core.js" defer></script>
 * Then anywhere in your page:
 *   <script>
 *     NW_I18N.register({ zh: { heroTitle: '中文標題' }, th: { heroTitle: 'ชื่อเรื่อง' } });
 *   </script>
 * And mark elements:
 *   <h1 data-i18n="heroTitle">English Title</h1>
 *
 * STORAGE KEY: 'nw_lang' (synced to 'lang' for legacy compat)
 */

/* ── NOTE: nw-i18n-shim.js (non-deferred) installs a queue-based shim ──
 * so that inline scripts can call NW_I18N.register() before this file loads.
 * This deferred script replaces the shim with the real implementation.    */

/* ── REAL IMPLEMENTATION ─────────────────────────────────────────────── */
(function() {
  'use strict';

  // ====================================================================
  // CONFIG
  // ====================================================================
  var STORAGE_KEY   = 'nw_lang';
  var LEGACY_KEYS   = ['lang', 'nw_lang', 'preferred_lang'];
  var DEFAULT_LANG  = 'en';
  var SUPPORTED     = ['en', 'zh', 'th'];

  // ====================================================================
  // SHARED CORE TRANSLATIONS
  // ====================================================================
  var CORE = {
    en: {
      home:"Home",back:"Back",menu:"Menu",close:"Close",
      submit:"Submit",cancel:"Cancel",save:"Save","delete":"Delete",
      confirm:"Confirm",loading:"Loading...",error:"Error",success:"Success",
      yes:"Yes",no:"No",ok:"OK",retry:"Retry",
      now:"Now",today:"Today",yesterday:"Yesterday",
      hoursAgo:"hours ago",minutesAgo:"minutes ago",justNow:"Just now",
      langEn:"English",langZh:"中文",langTh:"ไทย"
    },
    zh: {
      home:"首頁",back:"返回",menu:"選單",close:"關閉",
      submit:"提交",cancel:"取消",save:"儲存","delete":"刪除",
      confirm:"確認",loading:"載入中...",error:"錯誤",success:"成功",
      yes:"是",no:"否",ok:"確定",retry:"重試",
      now:"現在",today:"今天",yesterday:"昨天",
      hoursAgo:"小時前",minutesAgo:"分鐘前",justNow:"剛剛",
      langEn:"English",langZh:"中文",langTh:"ไทย"
    },
    th: {
      home:"หน้าแรก",back:"กลับ",menu:"เมนู",close:"ปิด",
      submit:"ส่ง",cancel:"ยกเลิก",save:"บันทึก","delete":"ลบ",
      confirm:"ยืนยัน",loading:"กำลังโหลด...",error:"ข้อผิดพลาด",success:"สำเร็จ",
      yes:"ใช่",no:"ไม่",ok:"ตกลง",retry:"ลองอีกครั้ง",
      now:"ตอนนี้",today:"วันนี้",yesterday:"เมื่อวาน",
      hoursAgo:"ชั่วโมงที่แล้ว",minutesAgo:"นาทีที่แล้ว",justNow:"เมื่อกี้",
      langEn:"English",langZh:"中文",langTh:"ไทย"
    }
  };

  // ====================================================================
  // STATE
  // ====================================================================
  var _lang          = DEFAULT_LANG;
  var _pageTr        = { en:{}, zh:{}, th:{} };
  var _callbacks     = [];
  var _ready         = false;
  var _originals     = new Map();   // el → original innerHTML/textContent
  var _captured      = false;

  // ====================================================================
  // HELPERS
  // ====================================================================
  function _supported(l) { return SUPPORTED.indexOf(l) !== -1; }

  function _storedLang() {
    try {
      var l = localStorage.getItem(STORAGE_KEY);
      if (l && _supported(l)) return l;
      for (var i = 0; i < LEGACY_KEYS.length; i++) {
        var v = localStorage.getItem(LEGACY_KEYS[i]);
        if (v && _supported(v)) return v;
      }
    } catch(e) {}
    return DEFAULT_LANG;
  }

  function _storeLang(l) {
    try {
      localStorage.setItem(STORAGE_KEY, l);
      localStorage.setItem('lang', l);  // legacy compat
    } catch(e) {}
  }

  function _merged() {
    var base = CORE[_lang] || CORE.en;
    var page = _pageTr[_lang] || {};
    var out = {};
    var k;
    for (k in base) out[k] = base[k];
    for (k in page) out[k] = page[k];
    return out;
  }

  function _resolve(obj, path) {
    if (!path) return undefined;
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  // ====================================================================
  // DOM — capture + apply
  // ====================================================================

  /** Capture original English text/html for every [data-i18n] element */
  function _capture() {
    if (_captured) return;
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      if (!_originals.has(el)) {
        _originals.set(el, {
          html: el.innerHTML,
          text: el.textContent
        });
      }
    });
    _captured = true;
  }

  /** Apply current language to all [data-i18n*] elements */
  function _applyDOM() {
    // Capture originals on first run (before any overwrite)
    if (!_captured) _capture();

    var tr = _merged();

    // [data-i18n] → text or html content
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      // Snapshot any NEW elements added after first capture
      if (!_originals.has(el)) {
        _originals.set(el, { html: el.innerHTML, text: el.textContent });
      }
      var key = el.getAttribute('data-i18n');
      var val = _resolve(tr, key);
      if (val) {
        // If translation contains HTML tags, use innerHTML; otherwise textContent (faster)
        if (/<[a-z][\s\S]*>/i.test(val)) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      } else {
        // No translation → restore original English
        var orig = _originals.get(el);
        if (orig) el.innerHTML = orig.html;
      }
    });

    // [data-i18n-html] → always innerHTML
    document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-html');
      var val = _resolve(tr, key);
      if (val) el.innerHTML = val;
    });

    // [data-i18n-placeholder]
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var val = _resolve(tr, key);
      if (val) el.placeholder = val;
    });

    // [data-i18n-title]
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-title');
      var val = _resolve(tr, key);
      if (val) el.title = val;
    });

    // Update <html lang>
    document.documentElement.lang = _lang;

    // Update font for CJK / Thai
    if (_lang === 'zh') {
      document.body.style.fontFamily = "'Noto Sans TC','Inter',sans-serif";
    } else if (_lang === 'th') {
      document.body.style.fontFamily = "'Noto Sans Thai','Inter',sans-serif";
    } else {
      document.body.style.fontFamily = "";  // reset to page default
    }
  }

  // ====================================================================
  // CALLBACKS + EVENTS
  // ====================================================================
  function _fireCallbacks() {
    for (var i = 0; i < _callbacks.length; i++) {
      try { _callbacks[i](_lang); } catch(e) { console.error('[NW_I18N] callback error:', e); }
    }
    // Dispatch DOM events for legacy listeners
    var detail = { detail: { lang: _lang } };
    ['nw-lang-change','languageChanged'].forEach(function(name) {
      try {
        document.dispatchEvent(new CustomEvent(name, detail));
        window.dispatchEvent(new CustomEvent(name, detail));
      } catch(e) {}
    });
  }

  // ====================================================================
  // PUBLIC API (real)
  // ====================================================================
  var NW_I18N = {
    /** Register page translations. Call from ANY script, any time.
     *  @param {Object} translations  { en:{...}, zh:{...}, th:{...} }  */
    register: function(translations) {
      if (!translations) return this;
      _pageTr = {
        en: Object.assign({}, _pageTr.en, translations.en || {}),
        zh: Object.assign({}, _pageTr.zh, translations.zh || {}),
        th: Object.assign({}, _pageTr.th, translations.th || {})
      };
      if (_ready) _applyDOM();
      return this;
    },

    /** Alias with pageId for debugging */
    registerPage: function(pageId, translations) {
      return this.register(translations);
    },

    /** Change language */
    setLang: function(lang) {
      if (!_supported(lang)) lang = DEFAULT_LANG;
      if (lang === _lang && _ready) return this;
      _lang = lang;
      _storeLang(lang);
      if (_ready) {
        _applyDOM();
        _fireCallbacks();
      }
      return this;
    },

    /** Compatibility alias — NW_NAV calls NW_I18N.apply(lang) */
    apply: function(lang) {
      return this.setLang(lang || _lang);
    },

    /** Re-apply translations (after dynamic content load) */
    refresh: function() {
      if (_ready) _applyDOM();
      return this;
    },

    /** Get a single translation */
    t: function(key, fallback) {
      var val = _resolve(_merged(), key);
      return val !== undefined ? val : (fallback !== undefined ? fallback : key);
    },

    getLang: function() { return _lang; },
    get lang() { return _lang; },
    get ready() { return _ready; },

    /** Subscribe to language changes */
    onChange: function(cb) {
      if (typeof cb === 'function') _callbacks.push(cb);
      return this;
    },

    /** Get all merged translations for current lang */
    getAll: function() { return _merged(); },

    init: function() { _doInit(); return this; }
  };

  // ====================================================================
  // QUEUE DRAIN — process anything the shim collected
  // ====================================================================
  function _drainQueue() {
    var q = window.__NW_I18N_QUEUE;
    if (!Array.isArray(q) || q.length === 0) return;
    for (var i = 0; i < q.length; i++) {
      var entry = q[i];
      if (entry.m && typeof NW_I18N[entry.m] === 'function') {
        NW_I18N[entry.m].apply(NW_I18N, entry.a || []);
      }
    }
    window.__NW_I18N_QUEUE = [];
  }

  // ====================================================================
  // INIT
  // ====================================================================
  function _doInit() {
    if (_ready) return;

    // 1. Detect stored language
    _lang = _storedLang();
    _storeLang(_lang);

    // 2. Drain queued calls from inline scripts
    _drainQueue();

    // 3. Snapshot English originals + apply
    _applyDOM();

    // 4. Listen for cross-tab sync
    window.addEventListener('storage', function(e) {
      if (e.key === STORAGE_KEY && e.newValue && e.newValue !== _lang) {
        NW_I18N.setLang(e.newValue);
      }
    });

    _ready = true;
    console.log('[NW_I18N] v3.0 ready — lang: ' + _lang);
  }

  // ====================================================================
  // REPLACE SHIM WITH REAL OBJECT
  // ====================================================================
  window.NW_I18N = NW_I18N;

  // Auto-init on DOMContentLoaded (deferred scripts run before this fires)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doInit);
  } else {
    _doInit();
  }

  // ====================================================================
  // BACKWARD COMPAT ALIASES
  // ====================================================================
  if (!window.initI18n)        window.initI18n        = function(t)   { return NW_I18N.register(t); };
  if (!window.setLanguage)     window.setLanguage     = function(l)   { return NW_I18N.setLang(l); };
  if (!window.getTranslation)  window.getTranslation  = function(k,f) { return NW_I18N.t(k,f); };
  if (!window.getCurrentLang)  window.getCurrentLang  = function()    { return NW_I18N.lang; };

})();
