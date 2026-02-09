/**
 * NW i18n Guardian v1.0
 * AUTOMATIC Internationalization Detection & Validation System
 * 
 * This runs AUTOMATICALLY on every page load:
 * 1. Detects missing translations
 * 2. Validates language switching works
 * 3. Reports untranslated text in console
 * 4. Monitors language toggle button functionality
 * 
 * For developers: Check console for [I18N_GUARDIAN] messages
 */

const NW_I18N_GUARDIAN = {
    version: '1.0.0',
    enabled: true,
    
    // Supported languages
    LANGS: ['en', 'zh', 'th'],
    LANG_NAMES: { en: 'English', zh: '中文', th: 'ไทย' },
    
    // Elements that should have translations
    translatableSelectors: [
        '[data-i18n]',
        '[data-i18n-html]',
        '[data-i18n-placeholder]',
        '[data-i18n-title]',
        '.hint',
        '.filters button',
        '.nav-btn.view',
        'h1', 'h2', 'h3',
        'button:not(.nw-lang-btn):not(.nav-btn)',
        'label',
        '.badge'
    ],
    
    // Issues found
    issues: [],
    warnings: [],
    
    // Initialize
    init() {
        if (!this.enabled) return;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // Wait a bit for all systems to initialize
                setTimeout(() => this.run(), 1200);
            });
        } else {
            // Wait for all other scripts to init
            setTimeout(() => this.run(), 1200);
        }
        
        // Monitor language changes
        this.monitorLanguageChanges();
    },
    
    // Main run function
    run() {
        this.issues = [];
        this.warnings = [];
        
        const currentLang = this.getCurrentLang();
        
        console.log(`%c[I18N_GUARDIAN] v${this.version} - Checking i18n support...`, 'color: #00d4ff; font-weight: bold');
        console.log(`%c  Current language: ${currentLang} (${this.LANG_NAMES[currentLang]})`, 'color: #888');
        
        // Check 1: Language toggle exists and works
        this.checkLanguageToggle();
        
        // Check 2: Missing data-i18n attributes
        this.checkMissingI18nAttributes();
        
        // Check 3: Untranslated content (text that looks like English when lang != en)
        this.checkUntranslatedContent();
        
        // Check 4: NW_I18N system is loaded
        this.checkI18nSystem();
        
        // Report results
        this.reportResults();
        
        return {
            issues: this.issues,
            warnings: this.warnings,
            lang: currentLang
        };
    },
    
    // Get current language
    getCurrentLang() {
        // Check multiple sources
        if (typeof NW_I18N !== 'undefined' && NW_I18N.lang) {
            return NW_I18N.lang;
        }
        if (typeof NW_NAV !== 'undefined' && NW_NAV.currentLang) {
            return NW_NAV.currentLang;
        }
        return localStorage.getItem('nw_lang') || 'en';
    },
    
    // Check 1: Language toggle buttons exist and are functional
    checkLanguageToggle() {
        // Check for nav language buttons
        const langBtns = document.querySelectorAll('.nw-lang-btn');
        const oldLangBtns = document.querySelectorAll('.lang button');
        
        const hasNavLang = langBtns.length > 0;
        const hasOldLang = oldLangBtns.length > 0;
        
        if (!hasNavLang && !hasOldLang) {
            this.issues.push({
                type: 'no_lang_toggle',
                severity: 'high',
                message: 'No language toggle buttons found on page',
                suggestion: 'Add NW_NAV menu or language toggle buttons'
            });
            return;
        }
        
        // Check if all 3 languages are available
        const btns = hasNavLang ? langBtns : oldLangBtns;
        const availableLangs = Array.from(btns).map(btn => btn.dataset.lang || btn.dataset.l).filter(Boolean);
        
        this.LANGS.forEach(lang => {
            if (!availableLangs.includes(lang)) {
                this.warnings.push({
                    type: 'missing_lang_option',
                    severity: 'medium',
                    message: `Language option missing: ${lang} (${this.LANG_NAMES[lang]})`,
                    suggestion: `Add button with data-lang="${lang}"`
                });
            }
        });
        
        // Check if active state is correct
        const currentLang = this.getCurrentLang();
        const activeBtn = document.querySelector('.nw-lang-btn.active') || document.querySelector('.lang button.on');
        
        if (activeBtn) {
            const activeLang = activeBtn.dataset.lang || activeBtn.dataset.l;
            if (activeLang !== currentLang) {
                this.warnings.push({
                    type: 'lang_state_mismatch',
                    severity: 'medium',
                    message: `Language button state mismatch: Button shows ${activeLang}, system is ${currentLang}`,
                    suggestion: 'Language state may not be synced'
                });
            }
        }
    },
    
    // Check 2: Elements that should have data-i18n but don't
    checkMissingI18nAttributes() {
        // Find static text that might need translation
        const textNodes = [];
        
        // Check specific elements that usually need translation
        const checkElements = [
            { sel: 'h1, h2, h3', name: 'Headings' },
            { sel: '.hint', name: 'Hints' },
            { sel: '.filters button', name: 'Filter buttons' },
            { sel: 'label', name: 'Form labels' }
        ];
        
        checkElements.forEach(({ sel, name }) => {
            document.querySelectorAll(sel).forEach(el => {
                const text = el.textContent?.trim();
                if (text && text.length > 2 && !el.hasAttribute('data-i18n') && !el.hasAttribute('data-i18n-html')) {
                    // Check if it's hardcoded English
                    if (this.looksLikeEnglish(text) && this.getCurrentLang() !== 'en') {
                        this.warnings.push({
                            type: 'missing_i18n_attr',
                            severity: 'low',
                            element: el,
                            message: `${name}: "${text.substring(0, 30)}..." might need data-i18n`,
                            suggestion: `Add data-i18n attribute for translation`
                        });
                    }
                }
            });
        });
    },
    
    // Check 3: Content that appears untranslated
    checkUntranslatedContent() {
        const currentLang = this.getCurrentLang();
        if (currentLang === 'en') return; // Can't check if already English
        
        // Elements with data-i18n that still show English
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = el.textContent?.trim();
            
            // If text is the same as the key, translation failed
            if (text === key) {
                this.issues.push({
                    type: 'translation_missing',
                    severity: 'high',
                    element: el,
                    key: key,
                    message: `Missing translation for key: "${key}"`,
                    suggestion: `Add ${currentLang} translation for "${key}"`
                });
            }
            // If text looks like English but lang isn't English
            else if (this.looksLikeEnglish(text) && text.length > 3) {
                this.warnings.push({
                    type: 'possible_untranslated',
                    severity: 'medium',
                    element: el,
                    key: key,
                    text: text,
                    message: `Possible untranslated text: "${text.substring(0, 30)}..."`,
                    suggestion: `Verify ${currentLang} translation exists`
                });
            }
        });
    },
    
    // Check 4: i18n system is properly loaded
    checkI18nSystem() {
        // Check NW_I18N
        if (typeof NW_I18N === 'undefined') {
            this.issues.push({
                type: 'i18n_not_loaded',
                severity: 'high',
                message: 'NW_I18N core not loaded',
                suggestion: 'Add <script src="/static/nw-i18n-core.js"></script>'
            });
        } else if (!NW_I18N.ready) {
            this.warnings.push({
                type: 'i18n_not_ready',
                severity: 'medium',
                message: 'NW_I18N loaded but not initialized',
                suggestion: 'Call NW_I18N.init() or wait for DOMContentLoaded'
            });
        }
        
        // Check NW_NAV
        if (typeof NW_NAV === 'undefined') {
            this.warnings.push({
                type: 'nav_not_loaded',
                severity: 'low',
                message: 'NW_NAV not loaded (language toggle may not work)',
                suggestion: 'Add <script src="/static/nw-nav.js"></script>'
            });
        }
    },
    
    // Helper: Check if text looks like English
    looksLikeEnglish(text) {
        if (!text || text.length < 3) return false;
        
        // Common English words
        const englishPatterns = [
            /^[A-Z][a-z]+$/, // Capitalized word
            /\b(the|and|for|with|this|that|from|have|are|was|were|been|being)\b/i,
            /\b(view|save|load|edit|delete|submit|cancel|close|open|back|next)\b/i,
            /^[A-Za-z\s]+$/ // Only Latin letters and spaces
        ];
        
        return englishPatterns.some(pattern => pattern.test(text));
    },
    
    // Monitor language changes
    monitorLanguageChanges() {
        // Listen for language change events
        ['nw-lang-change', 'languageChanged'].forEach(evtName => {
            document.addEventListener(evtName, (e) => {
                const newLang = e.detail?.lang;
                console.log(`%c[I18N_GUARDIAN] Language changed to: ${newLang}`, 'color: #00d4ff');
                
                // Re-run checks after language change
                setTimeout(() => this.run(), 500);
            });
        });
        
        // Monitor for localStorage changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'nw_lang' && e.newValue) {
                console.log(`%c[I18N_GUARDIAN] Language storage changed to: ${e.newValue}`, 'color: #00d4ff');
            }
        });
    },
    
    // Report results to console
    reportResults() {
        const hasIssues = this.issues.length > 0;
        const hasWarnings = this.warnings.length > 0;
        
        if (!hasIssues && !hasWarnings) {
            console.log('%c[I18N_GUARDIAN] No i18n issues detected!', 'color: #00ff00; font-weight: bold');
            return;
        }
        
        // Report issues
        if (hasIssues) {
            console.group('%c[I18N_GUARDIAN] ISSUES FOUND', 'background: #ff0000; color: white; padding: 2px 8px;');
            this.issues.forEach((issue, i) => {
                console.warn(`#${i + 1}: ${issue.message}`);
                if (issue.suggestion) {
                    console.log(`   ${issue.suggestion}`);
                }
                if (issue.element) {
                    console.log('   Element:', issue.element);
                }
            });
            console.groupEnd();
        }
        
        // Report warnings
        if (hasWarnings) {
            console.group('%c[I18N_GUARDIAN] Warnings', 'color: #ff6b00; font-weight: bold');
            this.warnings.forEach((warning, i) => {
                console.log(`${warning.message}`);
                if (warning.suggestion) {
                    console.log(`   ${warning.suggestion}`);
                }
            });
            console.groupEnd();
        }
        
        // Summary
        console.log(`%c[I18N_GUARDIAN] Summary: ${this.issues.length} issues, ${this.warnings.length} warnings`, 
            hasIssues ? 'color: #ff0000' : 'color: #ff6b00');
    },
    
    // Manual commands
    check() {
        return this.run();
    },
    
    status() {
        return {
            version: this.version,
            currentLang: this.getCurrentLang(),
            issues: this.issues.length,
            warnings: this.warnings.length,
            i18nLoaded: typeof NW_I18N !== 'undefined',
            navLoaded: typeof NW_NAV !== 'undefined'
        };
    },
    
    // Test language switching
    testSwitch(lang) {
        console.log(`%c[I18N_GUARDIAN] Testing switch to: ${lang}`, 'color: #00d4ff');
        
        const before = this.getCurrentLang();
        
        // Try to switch
        if (typeof NW_I18N !== 'undefined') {
            NW_I18N.setLang(lang);
        } else if (typeof NW_NAV !== 'undefined') {
            NW_NAV.setLang(lang);
        } else {
            console.error('[I18N_GUARDIAN] No i18n system available to switch');
            return false;
        }
        
        // Verify switch worked
        setTimeout(() => {
            const after = this.getCurrentLang();
            if (after === lang) {
                console.log(`%c[I18N_GUARDIAN] Switch successful: ${before} → ${after}`, 'color: #00ff00');
            } else {
                console.error(`[I18N_GUARDIAN] Switch failed: expected ${lang}, got ${after}`);
            }
            
            // Re-run checks
            this.run();
        }, 300);
        
        return true;
    },
    
    // Test all languages
    testAll() {
        console.log('%c[I18N_GUARDIAN] Testing all language switches...', 'color: #00d4ff; font-weight: bold');
        
        let delay = 0;
        this.LANGS.forEach(lang => {
            setTimeout(() => this.testSwitch(lang), delay);
            delay += 1500;
        });
    },
    
    // Find all untranslated text on page
    findUntranslated() {
        const untranslated = [];
        
        // Walk all text nodes
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent?.trim();
            if (text && text.length > 3 && this.looksLikeEnglish(text)) {
                const parent = node.parentElement;
                if (parent && !parent.hasAttribute('data-i18n') && 
                    !parent.closest('[data-i18n]') &&
                    !parent.closest('script') &&
                    !parent.closest('style')) {
                    untranslated.push({
                        text: text.substring(0, 50),
                        element: parent.tagName.toLowerCase(),
                        class: parent.className
                    });
                }
            }
        }
        
        console.table(untranslated.slice(0, 20));
        return untranslated;
    }
};

// AUTO-INITIALIZE
NW_I18N_GUARDIAN.init();

// Expose to window
if (typeof window !== 'undefined') {
    window.NW_I18N_GUARDIAN = NW_I18N_GUARDIAN;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NW_I18N_GUARDIAN;
}
