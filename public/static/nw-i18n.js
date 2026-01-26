/**
 * NW i18n - Central Translation System
 * Auto-loads translations from /static/i18n.json
 * Usage: Add data-i18n="section.key" to elements
 */

(function() {
  'use strict';

  const NWi18n = {
    translations: {},
    currentLang: localStorage.getItem('lang') || 'en',
    loaded: false,

    async load() {
      try {
        const res = await fetch('/static/i18n.json');
        this.translations = await res.json();
        this.loaded = true;
        this.apply();
        console.log('🌐 NW i18n loaded');
      } catch (e) {
        console.warn('i18n load failed, using inline translations');
      }
    },

    // Get translation by key (supports "section.key" format)
    t(key, lang = this.currentLang) {
      const parts = key.split('.');
      let value = this.translations;
      
      for (const part of parts) {
        if (value && value[part]) {
          value = value[part];
        } else {
          return key; // Return key if not found
        }
      }
      
      // If final value is an object with lang keys
      if (value && typeof value === 'object' && value[lang]) {
        return value[lang];
      }
      
      return key;
    },

    // Apply translations to all elements with data-i18n
    apply(lang = this.currentLang) {
      this.currentLang = lang;
      localStorage.setItem('lang', lang);

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = this.t(key, lang);
        if (translation !== key) {
          el.textContent = translation;
        }
      });

      // Update lang buttons if exist
      document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
      });

      // Dispatch event for custom handlers
      window.dispatchEvent(new CustomEvent('nw-lang-change', { detail: { lang } }));
    },

    // Set language
    setLang(lang) {
      this.apply(lang);
    },

    // Get current language
    getLang() {
      return this.currentLang;
    },

    // Add translations dynamically (for page-specific)
    extend(newTranslations) {
      this.translations = this.deepMerge(this.translations, newTranslations);
    },

    deepMerge(target, source) {
      const result = { ...target };
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
      return result;
    }
  };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NWi18n.load());
  } else {
    NWi18n.load();
  }

  // Expose globally
  window.NWi18n = NWi18n;

  // Helper function for easy access
  window.t = (key, lang) => NWi18n.t(key, lang);
})();
