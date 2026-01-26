/**
 * NumbahWan i18n Client Library
 * Based on AI Training Guide: Single Source of Truth pattern
 * 
 * Usage: Include this script, then call:
 * - setLanguage('en' | 'zh' | 'th')
 * - t('key') to get translation
 * 
 * Auto-updates all elements with data-i18n attribute
 */
(function(window) {
  'use strict';
  
  // State
  let translations = null;
  let currentLang = localStorage.getItem('lang') || 'en';
  let isLoaded = false;
  
  // Language metadata
  const langFlags = { en: '🇬🇧', zh: '🇹🇼', th: '🇹🇭' };
  const langCodes = { en: 'EN', zh: '中文', th: 'ไทย' };
  
  // Load translations from API (with caching)
  async function loadTranslations() {
    if (translations) return translations;
    
    try {
      const res = await fetch('/api/i18n');
      if (!res.ok) throw new Error('Failed to load translations');
      translations = await res.json();
      isLoaded = true;
      return translations;
    } catch (e) {
      console.error('[NW-i18n] Error loading translations:', e);
      return null;
    }
  }
  
  // Get translation by key
  function t(key, lang = currentLang) {
    if (!translations) return key;
    return translations[lang]?.[key] || translations.en?.[key] || key;
  }
  
  // Get photo translation
  function tPhoto(photoId, field, lang = currentLang) {
    if (!translations?.photoTranslations) return '';
    const photo = translations.photoTranslations[String(photoId)];
    return photo?.[field]?.[lang] || photo?.[field]?.en || '';
  }
  
  // Update all translatable elements
  function updateUI(lang) {
    if (!translations) return;
    
    // Update data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = t(key, lang);
      if (text !== key) el.textContent = text;
    });
    
    // Update data-i18n-photo elements
    document.querySelectorAll('[data-i18n-photo]').forEach(el => {
      const photoId = el.getAttribute('data-i18n-photo');
      const field = el.getAttribute('data-i18n-field');
      const text = tPhoto(photoId, field, lang);
      if (text) el.textContent = text;
    });
    
    // Update language switcher UI
    const flagEl = document.getElementById('current-lang-flag');
    const codeEl = document.getElementById('current-lang-code');
    if (flagEl) flagEl.textContent = langFlags[lang];
    if (codeEl) codeEl.textContent = langCodes[lang];
    
    // Dispatch event for custom handlers
    window.dispatchEvent(new CustomEvent('nw-lang-change', { detail: { lang } }));
  }
  
  // Set language
  async function setLanguage(lang) {
    if (!['en', 'zh', 'th'].includes(lang)) return;
    
    currentLang = lang;
    localStorage.setItem('lang', lang);
    
    await loadTranslations();
    updateUI(lang);
    
    // Close language menu if exists
    const menu = document.getElementById('lang-menu');
    if (menu) menu.classList.add('hidden');
    
    // Notify HP bar if exists
    if (window.updateHPBarLang) window.updateHPBarLang();
  }
  
  // Toggle language menu
  function toggleLangMenu() {
    const menu = document.getElementById('lang-menu');
    if (menu) menu.classList.toggle('hidden');
  }
  
  // Initialize on DOM ready
  async function init() {
    await loadTranslations();
    updateUI(currentLang);
    
    // Close menu on outside click
    document.addEventListener('click', (e) => {
      const switcher = document.getElementById('lang-switcher');
      const menu = document.getElementById('lang-menu');
      if (switcher && menu && !switcher.contains(e.target)) {
        menu.classList.add('hidden');
      }
    });
  }
  
  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Export to window
  window.NWi18n = {
    t,
    tPhoto,
    setLanguage,
    toggleLangMenu,
    getLang: () => currentLang,
    isLoaded: () => isLoaded,
    langFlags,
    langCodes
  };
  
  // Backward compatibility
  window.setLanguage = setLanguage;
  window.toggleLangMenu = toggleLangMenu;
  
})(window);
