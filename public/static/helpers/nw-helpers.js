/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NW_HELPERS - Master Loader for NumbahWan Guild Helper Library
 * ═══════════════════════════════════════════════════════════════════════════
 * Version: 2.0.0
 * 
 * This is the master loader that combines all NW helpers into a unified system.
 * 
 * USAGE:
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * 1. FULL LOAD (recommended for most pages):
 *    <script src="/static/helpers/nw-helpers.js"></script>
 *    
 * 2. SELECTIVE LOAD (for performance-critical pages):
 *    <script src="/static/helpers/nw-core.js"></script>
 *    <script src="/static/helpers/nw-ui.js"></script>
 *    
 * 3. ASYNC LOAD:
 *    <script>
 *      NW.load(['core', 'ui', 'anim']).then(() => {
 *        console.log('Helpers loaded!');
 *      });
 *    </script>
 * 
 * AVAILABLE HELPERS:
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * NW_CORE   - Base utilities (DOM, events, storage, formatting)
 * NW_UI     - UI components (toasts, modals, loading, tabs)
 * NW_API    - HTTP client (fetch wrapper, caching, interceptors)
 * NW_FORMS  - Form handling (validation, serialization, masks)
 * NW_STATE  - State management (reactive, persistent, slices)
 * NW_ANIM   - Animations (CSS classes, JS engine, spring physics)
 * NW_AUDIO  - Audio system (SFX, music, spatial audio)
 * NW_GUILD  - Guild-specific (cards, gacha, currency, achievements)
 * 
 * QUICK REFERENCE:
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * // DOM
 * const el = NW_CORE.$('#myElement');
 * const items = NW_CORE.$$('.items');
 * const div = NW_CORE.create('div', { className: 'card', text: 'Hello' });
 * 
 * // Events
 * NW_CORE.delegate(document, 'click', '.btn', (e) => console.log('clicked'));
 * const debouncedFn = NW_CORE.debounce(fn, 300);
 * 
 * // Storage
 * NW_CORE.storage.set('key', value, 3600000); // 1 hour expiry
 * const data = NW_CORE.storage.get('key', defaultValue);
 * 
 * // Formatting
 * NW_CORE.formatNumber(1234567); // "1,234,567"
 * NW_CORE.formatCompact(1500000); // "1.5M"
 * NW_CORE.timeAgo(new Date('2024-01-01')); // "3 months ago"
 * 
 * // Toasts
 * NW_UI.success('Saved!');
 * NW_UI.error('Something went wrong');
 * NW_UI.toast('Custom message', 'info', 5000);
 * 
 * // Modals
 * const result = await NW_UI.confirm('Are you sure?');
 * const name = await NW_UI.prompt('Enter your name');
 * await NW_UI.alert('Important message');
 * 
 * // Loading
 * NW_UI.showLoading('Processing...');
 * NW_UI.hideLoading();
 * 
 * // API
 * const data = await NW_API.get('/api/cards');
 * await NW_API.post('/api/cards', { name: 'New Card' });
 * const endpoint = NW_API.createEndpoint('/api/users');
 * 
 * // Forms
 * const formData = NW_FORMS.serialize('#myForm');
 * const { valid, errors } = NW_FORMS.validate('#myForm', schema);
 * NW_FORMS.mask('#phone', '(###) ###-####');
 * 
 * // State
 * NW_STATE.set('user.name', 'John');
 * NW_STATE.subscribe('user', (newVal) => console.log(newVal));
 * const slice = NW_STATE.createSlice('cart', { items: [] }, reducers);
 * 
 * // Animation
 * await NW_ANIM.animate('#box', { opacity: '1', transform: 'translateY(0)' });
 * NW_ANIM.stagger('.cards', 'nw-fadeInUp', { delay: 100 });
 * NW_ANIM.countTo('#counter', 1000, { duration: 2000 });
 * 
 * // Audio
 * await NW_AUDIO.load('click', '/sounds/click.mp3');
 * NW_AUDIO.play('click');
 * NW_AUDIO.presets.success();
 * 
 * // Guild
 * NW_GUILD.formatCurrency(1500); // "⚡1,500"
 * NW_GUILD.getRarity('mythic'); // { name, color, gradient, ... }
 * const cost = NW_GUILD.getPullCost(10); // 1440
 */

(function() {
    'use strict';

    const VERSION = '2.0.0';
    const BASE_PATH = '/static/helpers/';
    
    const HELPERS = {
        core: 'nw-core.js',
        ui: 'nw-ui.js',
        api: 'nw-api.js',
        forms: 'nw-forms.js',
        state: 'nw-state.js',
        anim: 'nw-anim.js',
        audio: 'nw-audio.js',
        guild: 'nw-guild.js'
    };

    const loadedScripts = new Set();
    const loadPromises = new Map();

    // ═══════════════════════════════════════════════════════════════════════════
    // DYNAMIC LOADER
    // ═══════════════════════════════════════════════════════════════════════════

    function loadScript(name) {
        const src = BASE_PATH + (HELPERS[name] || name);
        
        if (loadedScripts.has(src)) {
            return Promise.resolve();
        }
        
        if (loadPromises.has(src)) {
            return loadPromises.get(src);
        }

        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            script.onload = () => {
                loadedScripts.add(src);
                resolve();
            };
            
            script.onerror = () => {
                loadPromises.delete(src);
                reject(new Error(`Failed to load: ${src}`));
            };

            document.head.appendChild(script);
        });

        loadPromises.set(src, promise);
        return promise;
    }

    async function load(helpers = []) {
        // If no helpers specified, load all core ones
        if (helpers.length === 0) {
            helpers = ['core', 'ui', 'api', 'forms', 'state', 'anim', 'guild'];
        }

        await Promise.all(helpers.map(h => loadScript(h)));
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INLINE LOADING (when script is directly included)
    // ═══════════════════════════════════════════════════════════════════════════

    function loadAllInline() {
        // Load all helpers synchronously for inline include
        const helpers = ['core', 'ui', 'api', 'forms', 'state', 'anim', 'audio', 'guild'];
        
        helpers.forEach(name => {
            const src = BASE_PATH + HELPERS[name];
            if (!loadedScripts.has(src)) {
                const script = document.createElement('script');
                script.src = src;
                script.async = false; // Ensure order
                document.head.appendChild(script);
                loadedScripts.add(src);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GLOBAL NW NAMESPACE
    // ═══════════════════════════════════════════════════════════════════════════

    window.NW = {
        VERSION,
        load,
        loadScript,
        
        // Lazy accessors
        get CORE() { return window.NW_CORE; },
        get UI() { return window.NW_UI; },
        get API() { return window.NW_API; },
        get FORMS() { return window.NW_FORMS; },
        get STATE() { return window.NW_STATE; },
        get ANIM() { return window.NW_ANIM; },
        get AUDIO() { return window.NW_AUDIO; },
        get GUILD() { return window.NW_GUILD; },
        
        // Quick access to common functions
        $(selector) { return window.NW_CORE?.$?.(selector); },
        $$(selector) { return window.NW_CORE?.$$?.(selector); },
        toast(...args) { return window.NW_UI?.toast?.(...args); },
        success(...args) { return window.NW_UI?.success?.(...args); },
        error(...args) { return window.NW_UI?.error?.(...args); },
        confirm(...args) { return window.NW_UI?.confirm?.(...args); },
        alert(...args) { return window.NW_UI?.alert?.(...args); },
        loading: {
            show: (...args) => window.NW_UI?.showLoading?.(...args),
            hide: () => window.NW_UI?.hideLoading?.()
        },
        
        // Helper status
        isLoaded(name) {
            const globalName = `NW_${name.toUpperCase()}`;
            return typeof window[globalName] !== 'undefined';
        },
        
        getLoadedHelpers() {
            return Object.keys(HELPERS).filter(name => this.isLoaded(name));
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTO-LOAD ON INCLUDE
    // ═══════════════════════════════════════════════════════════════════════════

    // Check if this script should auto-load all helpers
    const currentScript = document.currentScript;
    const autoLoad = currentScript?.dataset?.autoload !== 'false';

    if (autoLoad) {
        // Load all helpers when this script is included
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadAllInline);
        } else {
            loadAllInline();
        }
    }

    console.log(`[NW_HELPERS] v${VERSION} - Master loader initialized`);
    console.log('[NW_HELPERS] Available: NW.CORE, NW.UI, NW.API, NW.FORMS, NW.STATE, NW.ANIM, NW.AUDIO, NW.GUILD');

})();
