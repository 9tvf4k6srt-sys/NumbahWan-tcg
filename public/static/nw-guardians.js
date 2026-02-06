/**
 * NW Guardians Loader v1.0
 * Unified loader for all automatic detection systems
 * 
 * Include this ONE file to get ALL guardians:
 * - UI Guardian (overlap detection)
 * - i18n Guardian (translation detection)
 * 
 * Usage: <script src="/static/nw-guardians.js"></script>
 * 
 * Console commands:
 *   NW_GUARDIANS.status()     - Show status of all guardians
 *   NW_GUARDIANS.checkAll()   - Run all checks manually
 *   NW_GUARDIANS.help()       - Show available commands
 */

const NW_GUARDIANS = {
    version: '1.0.0',
    
    // Status of all guardians
    status() {
        console.log('%c[NW_GUARDIANS] System Status', 'background: linear-gradient(90deg, #ff6b00, #ffd700); color: #000; padding: 4px 12px; font-weight: bold; border-radius: 4px;');
        
        const status = {
            'UI Guardian': {
                loaded: typeof NW_UI_GUARDIAN !== 'undefined',
                version: typeof NW_UI_GUARDIAN !== 'undefined' ? NW_UI_GUARDIAN.version : 'N/A',
                command: 'NW_UI_GUARDIAN.check()'
            },
            'i18n Guardian': {
                loaded: typeof NW_I18N_GUARDIAN !== 'undefined',
                version: typeof NW_I18N_GUARDIAN !== 'undefined' ? NW_I18N_GUARDIAN.version : 'N/A',
                command: 'NW_I18N_GUARDIAN.check()'
            },
            'i18n Core': {
                loaded: typeof NW_I18N !== 'undefined',
                version: '2.0',
                command: 'NW_I18N.status()'
            },
            'Nav Menu': {
                loaded: typeof NW_NAV !== 'undefined',
                version: '8.1',
                command: 'NW_NAV.status()'
            }
        };
        
        console.table(status);
        return status;
    },
    
    // Run all checks
    checkAll() {
        console.log('%c[NW_GUARDIANS] Running all checks...', 'color: #00d4ff; font-weight: bold');
        
        const results = {};
        
        if (typeof NW_UI_GUARDIAN !== 'undefined') {
            console.log('\n--- UI Guardian ---');
            results.ui = NW_UI_GUARDIAN.check();
        }
        
        if (typeof NW_I18N_GUARDIAN !== 'undefined') {
            console.log('\n--- i18n Guardian ---');
            results.i18n = NW_I18N_GUARDIAN.check();
        }
        
        return results;
    },
    
    // Help
    help() {
        console.log('%c[NW_GUARDIANS] Available Commands', 'background: #1a1a2e; color: #ffd700; padding: 4px 12px; font-weight: bold;');
        
        const commands = `
╔═══════════════════════════════════════════════════════════════╗
║  NW GUARDIANS - Automatic Detection Systems                    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  MAIN COMMANDS:                                                ║
║    NW_GUARDIANS.status()      - Show all guardian status       ║
║    NW_GUARDIANS.checkAll()    - Run all checks                 ║
║                                                                ║
║  UI GUARDIAN (overlap detection):                              ║
║    NW_UI_GUARDIAN.check()     - Check for overlaps             ║
║    NW_UI_GUARDIAN.fix()       - Auto-fix overlaps              ║
║    NW_UI_GUARDIAN.debug(true) - Highlight overlaps in red      ║
║                                                                ║
║  i18n GUARDIAN (translation detection):                        ║
║    NW_I18N_GUARDIAN.check()        - Check translations        ║
║    NW_I18N_GUARDIAN.testSwitch(lang) - Test language switch    ║
║    NW_I18N_GUARDIAN.testAll()      - Test all 3 languages      ║
║    NW_I18N_GUARDIAN.findUntranslated() - Find missing i18n     ║
║                                                                ║
║  i18n CORE:                                                    ║
║    NW_I18N.setLang('zh')      - Switch to Chinese              ║
║    NW_I18N.setLang('th')      - Switch to Thai                 ║
║    NW_I18N.setLang('en')      - Switch to English              ║
║    NW_I18N.t('key')           - Get translation                ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝
        `;
        
        console.log(commands);
    },
    
    // Quick language test
    testLang(lang) {
        if (typeof NW_I18N !== 'undefined') {
            NW_I18N.setLang(lang);
            console.log(`%c[NW_GUARDIANS] Switched to: ${lang}`, 'color: #00ff00');
        } else {
            console.error('[NW_GUARDIANS] NW_I18N not loaded');
        }
    }
};

// Expose globally
if (typeof window !== 'undefined') {
    window.NW_GUARDIANS = NW_GUARDIANS;
}

// Auto-show help on first load in development
if (typeof window !== 'undefined' && window.location.hostname.includes('sandbox')) {
    setTimeout(() => {
        console.log('%c[NW_GUARDIANS] Development mode - type NW_GUARDIANS.help() for commands', 'color: #888');
    }, 1500);
}

console.log('%c[NW_GUARDIANS] v1.0 Loaded - Type NW_GUARDIANS.help() for commands', 'color: #ffd700; font-weight: bold');
