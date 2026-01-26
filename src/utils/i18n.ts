/**
 * Internationalization (i18n) Utility
 * Based on AI Training Guide: Single Source of Truth pattern
 * 
 * Features:
 * - Centralized translations in JSON
 * - Type-safe translation keys
 * - Lazy loading support
 * - Fallback to English
 */

import translations from '../data/translations.json'

export type Language = 'en' | 'zh' | 'th'
export type TranslationKey = keyof typeof translations.en

// Type-safe translation getter
export function t(lang: Language, key: TranslationKey): string {
  return translations[lang]?.[key] || translations.en[key] || key
}

// Get all translations for a language
export function getTranslations(lang: Language): Record<string, string> {
  return translations[lang] || translations.en
}

// Get photo translations
export function getPhotoTranslation(photoId: string | number, field: 'title' | 'description', lang: Language): string {
  const photo = translations.photoTranslations[String(photoId) as keyof typeof translations.photoTranslations]
  if (photo && photo[field]) {
    return photo[field][lang] || photo[field].en
  }
  return ''
}

// Language metadata
export const langFlags = translations.langFlags
export const langCodes = translations.langCodes

// Client-side i18n script (to inject into HTML pages)
export const clientI18nScript = `
<script>
// i18n Client Script - Single Source of Truth
(function() {
  const TRANSLATIONS_URL = '/api/i18n';
  let translations = null;
  let currentLang = localStorage.getItem('lang') || 'en';
  
  const langFlags = ${JSON.stringify(translations.langFlags)};
  const langCodes = ${JSON.stringify(translations.langCodes)};
  
  // Load translations
  async function loadTranslations() {
    if (translations) return translations;
    try {
      const res = await fetch(TRANSLATIONS_URL);
      translations = await res.json();
      return translations;
    } catch (e) {
      console.error('Failed to load translations:', e);
      return null;
    }
  }
  
  // Update all translatable elements
  function updateUI(lang) {
    if (!translations) return;
    
    // Update data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[lang]?.[key]) {
        el.textContent = translations[lang][key];
      }
    });
    
    // Update photo translations
    document.querySelectorAll('[data-i18n-photo]').forEach(el => {
      const photoId = el.getAttribute('data-i18n-photo');
      const field = el.getAttribute('data-i18n-field');
      const photoT = translations.photoTranslations?.[photoId];
      if (photoT?.[field]?.[lang]) {
        el.textContent = photoT[field][lang];
      }
    });
    
    // Update language switcher UI
    const flagEl = document.getElementById('current-lang-flag');
    const codeEl = document.getElementById('current-lang-code');
    if (flagEl) flagEl.textContent = langFlags[lang];
    if (codeEl) codeEl.textContent = langCodes[lang];
  }
  
  // Set language
  window.setLanguage = async function(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    await loadTranslations();
    updateUI(lang);
    document.getElementById('lang-menu')?.classList.add('hidden');
    
    // Notify HP bar if exists
    if (window.updateHPBarLang) window.updateHPBarLang();
  };
  
  // Toggle language menu
  window.toggleLangMenu = function() {
    document.getElementById('lang-menu')?.classList.toggle('hidden');
  };
  
  // Initialize on load
  document.addEventListener('DOMContentLoaded', async () => {
    await loadTranslations();
    updateUI(currentLang);
  });
  
  // Close menu on outside click
  document.addEventListener('click', (e) => {
    const switcher = document.getElementById('lang-switcher');
    if (switcher && !switcher.contains(e.target)) {
      document.getElementById('lang-menu')?.classList.add('hidden');
    }
  });
})();
</script>
`
