/* @deprecated - Orphaned global. Export not used by any page. Candidate for removal. */
/**
 * NumbahWan Storage System v1.0
 * =============================
 * Centralized localStorage management with:
 * - Standardized key naming
 * - Type-safe getters/setters
 * - Automatic JSON serialization
 * - Versioned data migration
 * - Backup/restore functionality
 * 
 * All localStorage access should go through this module.
 */

const NW_STORAGE = {
    VERSION: '1.0.0',
    
    // ========== STANDARDIZED KEYS ==========
    KEYS: {
        // User & Identity
        USER:             'nw_user_v1',
        DEVICE_UUID:      'nw_device_uuid',
        GM_MODE:          'nw_gm_mode',
        
        // Wallet & Currency
        WALLET:           'nw_wallet_v2',
        WALLET_BACKUP:    'nw_wallet_backup',
        WALLET_LOG:       'nw_wallet_log',
        
        // Game State
        CARD_UPGRADES:    'nw_card_upgrades',
        ACHIEVEMENTS:     'nw_achievements',
        DAILY_REWARDS:    'nw_daily_rewards',
        FORGE_STATE:      'nw_forge_state',
        DECKS:            'nw_decks',
        COLLECTION:       'nw_collection',
        
        // Settings
        LANG:             'nw_lang',
        SOUND_SETTINGS:   'nw_sound_settings',
        NAV_COLLAPSED:    'nw_nav_collapsed',
        
        // Cache
        CARDS_CACHE:      'nw_cards_cache',
        CARDS_VERSION:    'nw_cards_version',
        
        // Analytics
        PAGE_HISTORY:     'nw_page_history',
        ECONOMY_STATS:    'nw_economy_stats'
    },
    
    // ========== CORE METHODS ==========
    
    /**
     * Get a value from localStorage
     * @param {string} key - Storage key (use KEYS constant)
     * @param {*} defaultValue - Default if not found
     * @returns {*}
     */
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            
            // Try to parse as JSON
            try {
                return JSON.parse(value);
            } catch {
                return value; // Return as string if not JSON
            }
        } catch (e) {
            console.error('[NW_STORAGE] Get error:', key, e);
            return defaultValue;
        }
    },
    
    /**
     * Set a value in localStorage
     * @param {string} key - Storage key
     * @param {*} value - Value to store (will be JSON stringified if object)
     * @returns {boolean} Success
     */
    set(key, value) {
        try {
            const toStore = typeof value === 'object' ? JSON.stringify(value) : String(value);
            localStorage.setItem(key, toStore);
            return true;
        } catch (e) {
            console.error('[NW_STORAGE] Set error:', key, e);
            // Storage might be full
            if (e.name === 'QuotaExceededError') {
                this._handleQuotaExceeded();
            }
            return false;
        }
    },
    
    /**
     * Remove a value from localStorage
     * @param {string} key - Storage key
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('[NW_STORAGE] Remove error:', key, e);
        }
    },
    
    /**
     * Check if a key exists
     * @param {string} key - Storage key
     * @returns {boolean}
     */
    has(key) {
        return localStorage.getItem(key) !== null;
    },
    
    // ========== TYPED HELPERS ==========
    
    /**
     * Get a string value
     */
    getString(key, defaultValue = '') {
        const value = localStorage.getItem(key);
        return value !== null ? value : defaultValue;
    },
    
    /**
     * Get a number value
     */
    getNumber(key, defaultValue = 0) {
        const value = localStorage.getItem(key);
        if (value === null) return defaultValue;
        const num = parseFloat(value);
        return isNaN(num) ? defaultValue : num;
    },
    
    /**
     * Get a boolean value
     */
    getBoolean(key, defaultValue = false) {
        const value = localStorage.getItem(key);
        if (value === null) return defaultValue;
        return value === 'true' || value === '1';
    },
    
    /**
     * Get an object (JSON parsed)
     */
    getObject(key, defaultValue = {}) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            return JSON.parse(value);
        } catch {
            return defaultValue;
        }
    },
    
    /**
     * Get an array (JSON parsed)
     */
    getArray(key, defaultValue = []) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            const arr = JSON.parse(value);
            return Array.isArray(arr) ? arr : defaultValue;
        } catch {
            return defaultValue;
        }
    },
    
    // ========== BACKUP & RESTORE ==========
    
    /**
     * Create a backup of all NW data
     * @returns {object} Backup data
     */
    createBackup() {
        const backup = {
            version: this.VERSION,
            timestamp: Date.now(),
            data: {}
        };
        
        Object.values(this.KEYS).forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                backup.data[key] = value;
            }
        });
        
        return backup;
    },
    
    /**
     * Restore from a backup
     * @param {object} backup - Backup data from createBackup()
     * @param {boolean} merge - Merge with existing data (default: replace)
     */
    restoreBackup(backup, merge = false) {
        if (!backup?.data) {
            console.error('[NW_STORAGE] Invalid backup format');
            return false;
        }
        
        try {
            Object.entries(backup.data).forEach(([key, value]) => {
                if (!merge || !this.has(key)) {
                    localStorage.setItem(key, value);
                }
            });
            
            console.log('[NW_STORAGE] Backup restored from', new Date(backup.timestamp));
            return true;
        } catch (e) {
            console.error('[NW_STORAGE] Restore error:', e);
            return false;
        }
    },
    
    /**
     * Export all data as downloadable JSON
     */
    exportToFile() {
        const backup = this.createBackup();
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `numbahwan-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    },
    
    // ========== UTILITIES ==========
    
    /**
     * Get storage usage statistics
     */
    getStats() {
        let totalSize = 0;
        let nwSize = 0;
        const keys = { nw: 0, other: 0 };
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            const size = (key.length + value.length) * 2; // UTF-16
            
            totalSize += size;
            if (key.startsWith('nw_')) {
                nwSize += size;
                keys.nw++;
            } else {
                keys.other++;
            }
        }
        
        return {
            totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            nwSize,
            nwSizeKB: (nwSize / 1024).toFixed(2),
            keys,
            estimatedMax: '5MB'
        };
    },
    
    /**
     * Clear all NW data (dangerous!)
     */
    clearAll(confirm = false) {
        if (!confirm) {
            console.warn('[NW_STORAGE] Call clearAll(true) to confirm deletion');
            return false;
        }
        
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log('[NW_STORAGE] All NW data cleared');
        return true;
    },
    
    /**
     * Handle storage quota exceeded
     * @private
     */
    _handleQuotaExceeded() {
        console.warn('[NW_STORAGE] Storage quota exceeded! Clearing cache...');
        
        // Clear cache keys first
        this.remove(this.KEYS.CARDS_CACHE);
        this.remove(this.KEYS.PAGE_HISTORY);
        
        // Notify user
        if (typeof window.showToast === 'function') {
            window.showToast('Storage full - cache cleared', 'warning');
        }
    },
    
    /**
     * Migrate old key names to new standard
     */
    migrateKeys() {
        const migrations = [
            // Old key -> New key
            ['lang', this.KEYS.LANG],
            ['nw_lang', this.KEYS.LANG],
            ['nw_collection', this.KEYS.COLLECTION],
            ['nw_deck_1', this.KEYS.DECKS]
        ];
        
        migrations.forEach(([oldKey, newKey]) => {
            if (this.has(oldKey) && !this.has(newKey)) {
                const value = localStorage.getItem(oldKey);
                localStorage.setItem(newKey, value);
                console.log(`[NW_STORAGE] Migrated ${oldKey} -> ${newKey}`);
            }
        });
    }
};

// Auto-init and migrate
window.NW_STORAGE = NW_STORAGE;
document.addEventListener('DOMContentLoaded', () => {
    NW_STORAGE.migrateKeys();
    console.log('[NW_STORAGE] v' + NW_STORAGE.VERSION + ' Ready');
});
