/**
 * NumbahWan Error Handling System v1.0
 * =====================================
 * Centralized error handling with:
 * - Error codes for debugging
 * - User-friendly messages
 * - Error logging
 * - Recovery suggestions
 */

const NW_ERRORS = {
    VERSION: '1.0.0',
    
    // ========== ERROR CODES ==========
    CODES: {
        // Wallet errors (1xxx)
        INSUFFICIENT_FUNDS: 'E1001',
        WALLET_NOT_READY:   'E1002',
        INVALID_CURRENCY:   'E1003',
        TRANSACTION_FAILED: 'E1004',
        
        // Card errors (2xxx)
        CARD_NOT_FOUND:     'E2001',
        CARDS_NOT_LOADED:   'E2002',
        INVALID_RARITY:     'E2003',
        COLLECTION_FULL:    'E2004',
        
        // Upgrade errors (3xxx)
        UPGRADE_FAILED:     'E3001',
        NOT_ENOUGH_DUPES:   'E3002',
        ALREADY_MAXED:      'E3003',
        BURN_FAILED:        'E3004',
        
        // Battle errors (4xxx)
        BATTLE_INVALID:     'E4001',
        DECK_NOT_READY:     'E4002',
        OPPONENT_ERROR:     'E4003',
        
        // Network errors (5xxx)
        NETWORK_ERROR:      'E5001',
        API_ERROR:          'E5002',
        TIMEOUT:            'E5003',
        
        // Storage errors (6xxx)
        STORAGE_FULL:       'E6001',
        STORAGE_CORRUPT:    'E6002',
        MIGRATION_FAILED:   'E6003',
        
        // General errors (9xxx)
        UNKNOWN:            'E9999',
        INVALID_INPUT:      'E9001',
        NOT_IMPLEMENTED:    'E9002'
    },
    
    // ========== ERROR MESSAGES ==========
    // Multi-language support
    messages: {
        E1001: {
            en: "Not enough currency",
            zh: "貨幣不足",
            th: "สกุลเงินไม่พอ"
        },
        E1002: {
            en: "Wallet is loading...",
            zh: "錢包載入中...",
            th: "กำลังโหลดกระเป๋าเงิน..."
        },
        E1003: {
            en: "Invalid currency type",
            zh: "無效的貨幣類型",
            th: "ประเภทสกุลเงินไม่ถูกต้อง"
        },
        E2001: {
            en: "Card not found",
            zh: "找不到卡牌",
            th: "ไม่พบการ์ด"
        },
        E2002: {
            en: "Card database is loading...",
            zh: "卡牌資料庫載入中...",
            th: "กำลังโหลดฐานข้อมูลการ์ด..."
        },
        E3001: {
            en: "Upgrade failed",
            zh: "升級失敗",
            th: "อัปเกรดล้มเหลว"
        },
        E3002: {
            en: "Need more duplicate cards",
            zh: "需要更多重複卡牌",
            th: "ต้องการการ์ดซ้ำเพิ่ม"
        },
        E3003: {
            en: "Card is already at maximum level",
            zh: "卡牌已達最高等級",
            th: "การ์ดอยู่ที่ระดับสูงสุดแล้ว"
        },
        E5001: {
            en: "Network error - please check your connection",
            zh: "網路錯誤 - 請檢查連線",
            th: "ข้อผิดพลาดเครือข่าย - กรุณาตรวจสอบการเชื่อมต่อ"
        },
        E6001: {
            en: "Storage is full - some data may not save",
            zh: "儲存空間已滿 - 部分資料可能無法保存",
            th: "พื้นที่เก็บข้อมูลเต็ม - ข้อมูลบางส่วนอาจไม่ได้บันทึก"
        },
        E9999: {
            en: "An unexpected error occurred",
            zh: "發生未預期的錯誤",
            th: "เกิดข้อผิดพลาดที่ไม่คาดคิด"
        }
    },
    
    // ========== CURRENT LANGUAGE ==========
    _lang: 'en',
    
    setLang(lang) {
        this._lang = ['en', 'zh', 'th'].includes(lang) ? lang : 'en';
    },
    
    // ========== ERROR LOG ==========
    _log: [],
    _maxLog: 50,
    
    // ========== CORE METHODS ==========
    
    /**
     * Create an error object
     * @param {string} code - Error code from CODES
     * @param {object} details - Additional error details
     * @returns {object} Error object
     */
    create(code, details = {}) {
        const error = {
            code,
            message: this.getMessage(code),
            timestamp: Date.now(),
            details
        };
        
        this._log.push(error);
        if (this._log.length > this._maxLog) {
            this._log.shift();
        }
        
        return error;
    },
    
    /**
     * Get user-friendly message for error code
     * @param {string} code - Error code
     * @returns {string}
     */
    getMessage(code) {
        const msg = this.messages[code];
        if (!msg) return this.messages[this.CODES.UNKNOWN][this._lang];
        return msg[this._lang] || msg.en;
    },
    
    /**
     * Handle an error with optional UI feedback
     * @param {string} code - Error code
     * @param {object} options - Options
     */
    handle(code, options = {}) {
        const {
            showToast = true,
            details = {},
            silent = false
        } = options;
        
        const error = this.create(code, details);
        
        if (!silent) {
            console.error(`[NW_ERROR] ${code}: ${error.message}`, details);
        }
        
        if (showToast && typeof window.showToast === 'function') {
            window.showToast(error.message, 'error');
        }
        
        return error;
    },
    
    /**
     * Wrap a function with error handling
     * @param {Function} fn - Function to wrap
     * @param {string} fallbackCode - Error code if function throws
     * @returns {Function}
     */
    wrap(fn, fallbackCode = this.CODES.UNKNOWN) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (e) {
                this.handle(fallbackCode, {
                    details: { originalError: e.message, stack: e.stack }
                });
                throw e;
            }
        };
    },
    
    /**
     * Get error log
     * @param {number} limit - Max entries to return
     * @returns {array}
     */
    getLog(limit = 10) {
        return this._log.slice(-limit);
    },
    
    /**
     * Clear error log
     */
    clearLog() {
        this._log = [];
    },
    
    /**
     * Check if an object is an NW error
     * @param {*} obj
     * @returns {boolean}
     */
    isError(obj) {
        return obj && typeof obj.code === 'string' && obj.code.startsWith('E');
    }
};

// Auto-init with current language
window.NW_ERRORS = NW_ERRORS;

// Sync language with other modules
window.addEventListener('nw-lang-change', (e) => {
    NW_ERRORS.setLang(e.detail?.lang || 'en');
});

// Try to get current language
document.addEventListener('DOMContentLoaded', () => {
    const lang = localStorage.getItem('nw_lang') || 
                 localStorage.getItem('lang') || 
                 'en';
    NW_ERRORS.setLang(lang);
    console.log('[NW_ERRORS] v' + NW_ERRORS.VERSION + ' Ready');
});
