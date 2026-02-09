/**
 * NumbahWan Boot Loader v1.0
 * ==========================
 * Manages module initialization order and dependencies.
 * Ensures modules load in the correct sequence.
 * 
 * Usage:
 *   <script src="/static/nw-boot.js"></script>
 *   <script>NW_BOOT.require(['wallet', 'forge'], () => { ... })</script>
 */

const NW_BOOT = {
    VERSION: '1.0.0',
    
    // Module registry with dependencies
    modules: {
        // Core (no dependencies)
        config:   { global: 'NW_CONFIG',   file: '/static/nw-config.js',   deps: [], loaded: false },
        sounds:   { global: 'NW_SOUNDS',   file: '/static/nw-sounds.js',   deps: [], loaded: false },
        cards:    { global: 'NW_CARDS',    file: '/static/nw-cards.js',    deps: [], loaded: false },
        economy:  { global: 'NW_ECONOMY',  file: '/static/nw-economy.js',  deps: [], loaded: false },
        
        // Core with deps
        wallet:   { global: 'NW_WALLET',   file: '/static/nw-wallet.js',   deps: [], loaded: false },
        user:     { global: 'NW_USER',     file: '/static/nw-user.js',     deps: ['wallet'], loaded: false },
        upgrade:  { global: 'NW_UPGRADE',  file: '/static/nw-card-upgrade.js', deps: ['wallet'], loaded: false },
        
        // Game modules
        forge:    { global: 'NW_FORGE',    file: '/static/nw-forge-engine.js', deps: ['wallet', 'cards'], loaded: false },
        battle:   { global: 'NW_BATTLE',   file: '/static/nw-battle-engine.js', deps: ['wallet', 'cards'], loaded: false },
        arcade:   { global: 'NW_ARCADE',   file: '/static/nw-arcade-engine.js', deps: ['wallet'], loaded: false },
        
        // UI modules
        nav:      { global: 'NW_NAV',      file: '/static/nw-nav.js',      deps: ['sounds'], loaded: false },
        guide:    { global: 'NW_GUIDE',    file: '/static/nw-guide.js',    deps: ['sounds'], loaded: false },
        juice:    { global: 'NW_JUICE',    file: '/static/nw-game-juice.js', deps: [], loaded: false },
        fx:       { global: 'NW_FX',       file: '/static/nw-premium-fx.js', deps: [], loaded: false }
    },
    
    // Initialization state
    _initialized: false,
    _loadQueue: [],
    _callbacks: {},
    
    /**
     * Initialize the boot loader
     */
    init() {
        if (this._initialized) return;
        this._initialized = true;
        
        // Check for already loaded modules
        Object.entries(this.modules).forEach(([name, mod]) => {
            if (window[mod.global]) {
                mod.loaded = true;
            }
        });
        
        // Process any waiting callbacks
        this._processCallbacks();
        
        console.log('[NW_BOOT] v' + this.VERSION + ' Ready');
    },
    
    /**
     * Require modules and execute callback when ready
     * @param {string[]} moduleNames - Array of module names
     * @param {Function} callback - Function to call when all modules ready
     */
    require(moduleNames, callback) {
        const pending = [];
        
        moduleNames.forEach(name => {
            const mod = this.modules[name];
            if (!mod) {
                console.warn(`[NW_BOOT] Unknown module: ${name}`);
                return;
            }
            
            if (!mod.loaded && !window[mod.global]) {
                pending.push(name);
            }
        });
        
        if (pending.length === 0) {
            // All modules ready
            callback();
        } else {
            // Wait for modules
            const key = pending.sort().join(',');
            if (!this._callbacks[key]) {
                this._callbacks[key] = [];
            }
            this._callbacks[key].push({ modules: moduleNames, callback });
            
            // Load missing modules
            pending.forEach(name => this._loadModule(name));
        }
    },
    
    /**
     * Check if a module is loaded
     * @param {string} name - Module name
     * @returns {boolean}
     */
    isLoaded(name) {
        const mod = this.modules[name];
        return mod ? (mod.loaded || !!window[mod.global]) : false;
    },
    
    /**
     * Get module instance
     * @param {string} name - Module name
     * @returns {object|null}
     */
    get(name) {
        const mod = this.modules[name];
        return mod ? window[mod.global] : null;
    },
    
    /**
     * Load a module dynamically
     * @private
     */
    _loadModule(name) {
        const mod = this.modules[name];
        if (!mod || mod.loaded || mod._loading) return;
        
        // Load dependencies first
        mod.deps.forEach(dep => this._loadModule(dep));
        
        mod._loading = true;
        
        const script = document.createElement('script');
        script.src = mod.file;
        script.onload = () => {
            mod.loaded = true;
            mod._loading = false;
            console.log(`[NW_BOOT] Loaded: ${name}`);
            this._processCallbacks();
        };
        script.onerror = () => {
            mod._loading = false;
            console.error(`[NW_BOOT] Failed to load: ${name}`);
        };
        document.head.appendChild(script);
    },
    
    /**
     * Process waiting callbacks
     * @private
     */
    _processCallbacks() {
        Object.entries(this._callbacks).forEach(([key, callbacks]) => {
            const modules = key.split(',');
            const allLoaded = modules.every(name => this.isLoaded(name));
            
            if (allLoaded) {
                callbacks.forEach(({ callback }) => {
                    try {
                        callback();
                    } catch (e) {
                        console.error('[NW_BOOT] Callback error:', e);
                    }
                });
                delete this._callbacks[key];
            }
        });
    },
    
    /**
     * Mark a module as loaded (called by modules themselves)
     * @param {string} name - Module name
     */
    register(name) {
        const mod = this.modules[name];
        if (mod) {
            mod.loaded = true;
            this._processCallbacks();
        }
    },
    
    /**
     * Get system status
     * @returns {object}
     */
    status() {
        const status = {
            version: this.VERSION,
            initialized: this._initialized,
            modules: {}
        };
        
        Object.entries(this.modules).forEach(([name, mod]) => {
            status.modules[name] = {
                loaded: mod.loaded || !!window[mod.global],
                deps: mod.deps
            };
        });
        
        return status;
    },
    
    /**
     * Debug: Print module status to console
     */
    debug() {
        const status = this.status();
        console.table(Object.entries(status.modules).map(([name, info]) => ({
            Module: name,
            Loaded: info.loaded ? '' : '',
            Dependencies: info.deps.join(', ') || 'none'
        })));
    }
};

// Auto-init
window.NW_BOOT = NW_BOOT;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NW_BOOT.init());
} else {
    NW_BOOT.init();
}

// Listen for module ready events
window.addEventListener('nw-wallet-ready', () => NW_BOOT.register('wallet'));
window.addEventListener('nw-user-ready', () => NW_BOOT.register('user'));
window.addEventListener('nw-forge-ready', () => NW_BOOT.register('forge'));
window.addEventListener('nw-battle-ready', () => NW_BOOT.register('battle'));
