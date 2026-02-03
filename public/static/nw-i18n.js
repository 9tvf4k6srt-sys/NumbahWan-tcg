/**
 * NW_I18N v1.0 - Centralized Translation System for NumbahWan Guild
 * 
 * Features:
 * - Centralized translation management
 * - Automatic fallback to English
 * - Integration with nw-nav.js language toggle
 * - Page-specific translation loading
 * - Missing key detection and logging
 * 
 * Usage:
 * 1. Include this script: <script src="/static/nw-i18n.js"></script>
 * 2. Add data-page-id to body: <body data-page-id="academy">
 * 3. Add data-i18n to elements: <h1 data-i18n="hero.title">Default Text</h1>
 * 4. Translations auto-apply on page load and language change
 */

const NW_I18N = (() => {
    // ===========================================
    // COMMON TRANSLATIONS (used across all pages)
    // ===========================================
    const common = {
        en: {
            // Navigation
            'nav.home': 'Home',
            'nav.academy': 'Academy',
            'nav.tcg': 'TCG',
            'nav.cards': 'Cards',
            'nav.battle': 'Battle',
            'nav.market': 'Market',
            'nav.guild': 'Guild',
            'nav.about': 'About',
            'nav.apply': 'Apply',
            'nav.guide': 'Guide',
            'nav.wyckoff': 'Wyckoff Academy',
            
            // Common buttons
            'btn.submit': 'Submit',
            'btn.cancel': 'Cancel',
            'btn.save': 'Save',
            'btn.close': 'Close',
            'btn.back': 'Back',
            'btn.next': 'Next',
            'btn.learnMore': 'Learn More',
            'btn.viewAll': 'View All',
            'btn.applyNow': 'Apply Now',
            'btn.getStarted': 'Get Started',
            
            // Common labels
            'label.loading': 'Loading...',
            'label.error': 'Error',
            'label.success': 'Success',
            'label.warning': 'Warning',
            'label.comingSoon': 'Coming Soon',
            
            // Footer
            'footer.disclaimer': 'Educational purposes only. Not financial advice.',
            'footer.copyright': '© 2024-2026 NumbahWan Guild. All rights reserved.',
            'footer.privacy': 'Privacy Policy',
            'footer.terms': 'Terms of Service',
            
            // Time
            'time.morning': 'Morning',
            'time.afternoon': 'Afternoon', 
            'time.evening': 'Evening',
            'time.minutes': 'minutes',
            'time.hours': 'hours',
            'time.days': 'days',
            
            // Status
            'status.active': 'Active',
            'status.inactive': 'Inactive',
            'status.pending': 'Pending',
            'status.completed': 'Completed',
            'status.online': 'Online',
            'status.offline': 'Offline'
        },
        zh: {
            // Navigation
            'nav.home': '首頁',
            'nav.academy': '學院',
            'nav.tcg': 'TCG',
            'nav.cards': '卡牌',
            'nav.battle': '對戰',
            'nav.market': '市場',
            'nav.guild': '公會',
            'nav.about': '關於',
            'nav.apply': '申請',
            'nav.guide': '指南',
            'nav.wyckoff': '威科夫學院',
            
            // Common buttons
            'btn.submit': '提交',
            'btn.cancel': '取消',
            'btn.save': '儲存',
            'btn.close': '關閉',
            'btn.back': '返回',
            'btn.next': '下一步',
            'btn.learnMore': '了解更多',
            'btn.viewAll': '查看全部',
            'btn.applyNow': '立即申請',
            'btn.getStarted': '開始',
            
            // Common labels
            'label.loading': '載入中...',
            'label.error': '錯誤',
            'label.success': '成功',
            'label.warning': '警告',
            'label.comingSoon': '即將推出',
            
            // Footer
            'footer.disclaimer': '僅供教育目的。非投資建議。',
            'footer.copyright': '© 2024-2026 NumbahWan 公會。保留所有權利。',
            'footer.privacy': '隱私政策',
            'footer.terms': '服務條款',
            
            // Time
            'time.morning': '早上',
            'time.afternoon': '下午',
            'time.evening': '晚上',
            'time.minutes': '分鐘',
            'time.hours': '小時',
            'time.days': '天',
            
            // Status
            'status.active': '活躍',
            'status.inactive': '停用',
            'status.pending': '待處理',
            'status.completed': '已完成',
            'status.online': '在線',
            'status.offline': '離線'
        },
        th: {
            // Navigation
            'nav.home': 'หน้าแรก',
            'nav.academy': 'สถาบัน',
            'nav.tcg': 'TCG',
            'nav.cards': 'การ์ด',
            'nav.battle': 'ต่อสู้',
            'nav.market': 'ตลาด',
            'nav.guild': 'กิลด์',
            'nav.about': 'เกี่ยวกับ',
            'nav.apply': 'สมัคร',
            'nav.guide': 'คู่มือ',
            'nav.wyckoff': 'สถาบันไวคอฟฟ์',
            
            // Common buttons
            'btn.submit': 'ส่ง',
            'btn.cancel': 'ยกเลิก',
            'btn.save': 'บันทึก',
            'btn.close': 'ปิด',
            'btn.back': 'กลับ',
            'btn.next': 'ถัดไป',
            'btn.learnMore': 'เรียนรู้เพิ่มเติม',
            'btn.viewAll': 'ดูทั้งหมด',
            'btn.applyNow': 'สมัครเลย',
            'btn.getStarted': 'เริ่มต้น',
            
            // Common labels
            'label.loading': 'กำลังโหลด...',
            'label.error': 'ข้อผิดพลาด',
            'label.success': 'สำเร็จ',
            'label.warning': 'คำเตือน',
            'label.comingSoon': 'เร็วๆ นี้',
            
            // Footer
            'footer.disclaimer': 'เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำทางการเงิน',
            'footer.copyright': '© 2024-2026 NumbahWan Guild สงวนลิขสิทธิ์',
            'footer.privacy': 'นโยบายความเป็นส่วนตัว',
            'footer.terms': 'ข้อกำหนดการใช้งาน',
            
            // Time
            'time.morning': 'เช้า',
            'time.afternoon': 'บ่าย',
            'time.evening': 'เย็น',
            'time.minutes': 'นาที',
            'time.hours': 'ชั่วโมง',
            'time.days': 'วัน',
            
            // Status
            'status.active': 'ใช้งาน',
            'status.inactive': 'ไม่ใช้งาน',
            'status.pending': 'รอดำเนินการ',
            'status.completed': 'เสร็จสิ้น',
            'status.online': 'ออนไลน์',
            'status.offline': 'ออฟไลน์'
        }
    };

    // ===========================================
    // PAGE-SPECIFIC TRANSLATIONS
    // Organized by page ID (data-page-id attribute)
    // ===========================================
    const pages = {};
    
    // State
    let currentLang = 'en';
    let debugMode = false;
    let missingKeys = new Set();
    
    // ===========================================
    // CORE FUNCTIONS
    // ===========================================
    
    /**
     * Get stored language preference
     */
    function getStoredLang() {
        return localStorage.getItem('lang') || localStorage.getItem('nw_lang') || 'en';
    }
    
    /**
     * Set language preference
     */
    function setLang(lang) {
        currentLang = lang;
        localStorage.setItem('lang', lang);
        localStorage.setItem('nw_lang', lang);
        document.body.dataset.lang = lang;
        
        // Update font family based on language
        if (lang === 'zh') {
            document.body.style.fontFamily = "'Noto Sans TC', 'Inter', sans-serif";
        } else if (lang === 'th') {
            document.body.style.fontFamily = "'Noto Sans Thai', 'Inter', sans-serif";
        } else {
            document.body.style.fontFamily = "'Inter', sans-serif";
        }
    }
    
    /**
     * Get translation for a key
     */
    function t(key, lang = currentLang) {
        const pageId = document.body.dataset.pageId;
        
        // Try page-specific first
        if (pageId && pages[pageId]?.[lang]?.[key]) {
            return pages[pageId][lang][key];
        }
        if (pageId && pages[pageId]?.en?.[key]) {
            return pages[pageId].en[key]; // Fallback to English
        }
        
        // Try common translations
        if (common[lang]?.[key]) {
            return common[lang][key];
        }
        if (common.en?.[key]) {
            return common.en[key]; // Fallback to English
        }
        
        // Key not found
        if (debugMode && !missingKeys.has(key)) {
            missingKeys.add(key);
            console.warn(`[NW_I18N] Missing translation: "${key}" for page "${pageId || 'unknown'}"`);
        }
        
        return null;
    }
    
    /**
     * Apply translations to all elements with data-i18n attribute
     */
    function apply(lang = currentLang) {
        setLang(lang);
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            const translation = t(key, lang);
            
            if (translation) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.placeholder) {
                        el.placeholder = translation;
                    }
                } else {
                    el.innerHTML = translation;
                }
            }
        });
        
        // Also apply to data-i18n-placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            const translation = t(key, lang);
            if (translation) {
                el.placeholder = translation;
            }
        });
        
        // Apply to data-i18n-title (for tooltips)
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.dataset.i18nTitle;
            const translation = t(key, lang);
            if (translation) {
                el.title = translation;
            }
        });
        
        if (debugMode) {
            console.log(`[NW_I18N] Applied ${lang} translations. Missing keys: ${missingKeys.size}`);
        }
    }
    
    /**
     * Register page-specific translations
     */
    function registerPage(pageId, translations) {
        pages[pageId] = translations;
        if (debugMode) {
            console.log(`[NW_I18N] Registered translations for page: ${pageId}`);
        }
    }
    
    /**
     * Enable debug mode to log missing translations
     */
    function enableDebug() {
        debugMode = true;
        console.log('[NW_I18N] Debug mode enabled');
    }
    
    /**
     * Get list of missing translation keys
     */
    function getMissingKeys() {
        return Array.from(missingKeys);
    }
    
    /**
     * Audit all data-i18n elements and return missing keys
     */
    function audit(lang = 'zh') {
        const missing = [];
        const pageId = document.body.dataset.pageId;
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            const translation = t(key, lang);
            if (!translation) {
                missing.push({
                    key,
                    element: el.tagName,
                    defaultText: el.textContent.trim().substring(0, 50)
                });
            }
        });
        
        console.table(missing);
        console.log(`[NW_I18N] Audit for "${lang}" on page "${pageId}": ${missing.length} missing keys`);
        return missing;
    }
    
    // ===========================================
    // INITIALIZATION
    // ===========================================
    
    function init() {
        // Get initial language
        currentLang = getStoredLang();
        setLang(currentLang);
        
        // Listen for language changes from nw-nav.js
        window.addEventListener('nw-lang-change', (e) => {
            const lang = e.detail?.lang || 'en';
            apply(lang);
        });
        
        // Also listen on document (some pages dispatch there)
        document.addEventListener('nw-lang-change', (e) => {
            const lang = e.detail?.lang || 'en';
            apply(lang);
        });
        
        // Apply initial translations after a short delay
        // (to allow page-specific translations to register)
        setTimeout(() => {
            apply(currentLang);
        }, 50);
        
        console.log('[NW_I18N] v1.0 initialized');
    }
    
    // Auto-init on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ===========================================
    // PUBLIC API
    // ===========================================
    return {
        t,              // Get translation: NW_I18N.t('key')
        apply,          // Apply all translations: NW_I18N.apply('zh')
        setLang,        // Set language: NW_I18N.setLang('th')
        getLang: () => currentLang,
        registerPage,   // Register page translations: NW_I18N.registerPage('academy', {...})
        enableDebug,    // Enable debug logging: NW_I18N.enableDebug()
        getMissingKeys, // Get missing keys: NW_I18N.getMissingKeys()
        audit,          // Audit page: NW_I18N.audit('zh')
        common,         // Access common translations
        pages           // Access page translations
    };
})();

// Expose globally
window.NW_I18N = NW_I18N;
