/* =====================================================
   NUMBAHWAN SECURE WALLET SYSTEM v1.0
   - Unique guest ID binding (fingerprint + UUID)
   - Comprehensive transaction logging
   - Anti-cheat mechanisms
   - Portable wallet across all pages
   ===================================================== */

const NW_WALLET = {
    // Storage keys
    WALLET_KEY: 'nw_wallet_v2',
    BACKUP_KEY: 'nw_wallet_backup',
    LOG_KEY: 'nw_transaction_log',
    GM_KEY: 'nw_gm_mode',
    
    // GM Configuration - Add Guest IDs here to grant GM privileges
    // GMs get infinite resources for testing
    GM_WHITELIST: [
        // Format: 'NW-XXXXXXXXXXXX'
        // Add your Guest ID here after visiting /wallet to see it
    ],
    
    // GM mode can also be activated by localStorage flag (for current session testing)
    // Set localStorage.setItem('nw_gm_mode', 'true') to enable
    
    // Infinite resources for GM mode
    GM_INFINITE_AMOUNT: 999999,
    
    // Wallet state
    wallet: null,
    initialized: false,
    isGM: false,
    
    // ===== INITIALIZATION =====
    async init() {
        if (this.initialized) return this.wallet;
        
        // Try to load existing wallet
        let wallet = this.loadWallet();
        
        if (!wallet) {
            // Create new wallet with unique ID
            wallet = await this.createWallet();
        } else {
            // Verify wallet integrity
            if (!this.verifyWallet(wallet)) {
                console.warn('[NW_WALLET] Integrity check failed, attempting recovery...');
                wallet = this.recoverWallet() || await this.createWallet();
            }
        }
        
        this.wallet = wallet;
        this.initialized = true;
        this.saveWallet();
        
        // Check GM status
        this.checkGMStatus();
        
        // Log session start
        this.log('SESSION_START', { userAgent: navigator.userAgent, isGM: this.isGM });
        
        return wallet;
    },
    
    // ===== GM MODE SYSTEM =====
    checkGMStatus() {
        if (!this.wallet) {
            this.isGM = false;
            return false;
        }
        
        // Check if Guest ID is in whitelist
        const inWhitelist = this.GM_WHITELIST.includes(this.wallet.guestId);
        
        // Check localStorage flag (for easy testing)
        const localFlag = localStorage.getItem(this.GM_KEY) === 'true';
        
        // Check URL parameter (for quick activation)
        const urlParams = new URLSearchParams(window.location.search);
        const urlFlag = urlParams.get('gm') === 'true';
        
        this.isGM = inWhitelist || localFlag || urlFlag;
        
        if (this.isGM) {
            console.log('%c[NW_WALLET] 👑 GM MODE ACTIVE - Infinite Resources Enabled!', 
                'background: linear-gradient(90deg, #ffd700, #ff6b00); color: black; font-size: 16px; font-weight: bold; padding: 10px;');
            this.log('GM_MODE_ACTIVATED', { guestId: this.wallet.guestId, method: inWhitelist ? 'whitelist' : localFlag ? 'localStorage' : 'url' });
        }
        
        return this.isGM;
    },
    
    // Activate GM mode for current session
    activateGM(secretCode = null) {
        // Secret code activation (optional extra security)
        const ACTIVATION_CODE = 'numbahwan-gm-2026';
        
        if (secretCode && secretCode !== ACTIVATION_CODE) {
            console.log('[NW_WALLET] Invalid GM activation code');
            return false;
        }
        
        localStorage.setItem(this.GM_KEY, 'true');
        this.isGM = true;
        
        console.log('%c[NW_WALLET] 👑 GM MODE ACTIVATED!', 
            'background: linear-gradient(90deg, #ffd700, #ff6b00); color: black; font-size: 20px; font-weight: bold; padding: 15px;');
        
        this.log('GM_MODE_ACTIVATED_MANUAL', { guestId: this.wallet?.guestId });
        
        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('nw-gm-activated'));
        
        return true;
    },
    
    // Deactivate GM mode
    deactivateGM() {
        localStorage.removeItem(this.GM_KEY);
        this.isGM = false;
        console.log('[NW_WALLET] GM mode deactivated');
        this.log('GM_MODE_DEACTIVATED', {});
        window.dispatchEvent(new CustomEvent('nw-gm-deactivated'));
        return true;
    },
    
    // Add Guest ID to permanent GM whitelist (call from console)
    addToGMWhitelist(guestId) {
        if (!guestId) {
            guestId = this.wallet?.guestId;
        }
        if (!guestId) {
            console.log('[NW_WALLET] No Guest ID provided');
            return;
        }
        
        console.log('%c[NW_WALLET] To permanently add this Guest as GM:', 'color: #ffd700; font-weight: bold;');
        console.log('%cAdd this to GM_WHITELIST in nw-wallet.js:', 'color: #ccc;');
        console.log(`%c"${guestId}"`, 'color: #00ff00; font-size: 14px; font-family: monospace;');
        console.log('%cOr activate for this session: NW_WALLET.activateGM("numbahwan-gm-2026")', 'color: #ccc;');
        
        return guestId;
    },
    
    // ===== WALLET CREATION =====
    async createWallet() {
        const guestId = await this.generateGuestId();
        const now = Date.now();
        
        const wallet = {
            // Unique identifiers
            guestId: guestId,
            walletId: this.generateUUID(),
            
            // Creation metadata
            createdAt: now,
            lastActivity: now,
            
            // Currencies
            currencies: {
                diamond: 500,  // Starting bonus
                gold: 100,
                iron: 50,
                stone: 25,
                wood: 0        // Logs - must be earned!
            },
            
            // Stats
            stats: {
                totalEarned: { diamond: 500, gold: 100, iron: 50, stone: 25, wood: 0 },
                totalSpent: { diamond: 0, gold: 0, iron: 0, stone: 0, wood: 0 },
                gamesPlayed: 0,
                gamesWon: 0,
                pullsMade: 0,
                mythicsPulled: 0,
                legendariesPulled: 0,
                exchangesMade: 0,
                purchasesMade: 0
            },
            
            // Collection
            collection: [],
            
            // Forge state (pity system)
            forge: {
                pityCounter: 0,
                totalPulls: 0,
                lastPull: null
            },
            
            // Security
            checksum: null,
            version: 2
        };
        
        wallet.checksum = this.calculateChecksum(wallet);
        
        this.log('WALLET_CREATED', { guestId, walletId: wallet.walletId });
        
        return wallet;
    },
    
    // ===== GUEST ID GENERATION =====
    async generateGuestId() {
        // Combine multiple fingerprinting techniques
        const components = [];
        
        // 1. Canvas fingerprint
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 200;
            canvas.height = 50;
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('NumbahWan 🎮', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Guest Wallet', 4, 35);
            components.push(canvas.toDataURL());
        } catch (e) {
            components.push('canvas-error');
        }
        
        // 2. WebGL fingerprint
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
                    components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
                }
            }
        } catch (e) {
            components.push('webgl-error');
        }
        
        // 3. Screen info
        components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
        components.push(screen.pixelDepth);
        components.push(window.devicePixelRatio);
        
        // 4. Timezone
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
        components.push(new Date().getTimezoneOffset());
        
        // 5. Language
        components.push(navigator.language);
        components.push(navigator.languages?.join(',') || '');
        
        // 6. Platform
        components.push(navigator.platform);
        components.push(navigator.hardwareConcurrency || 0);
        components.push(navigator.maxTouchPoints || 0);
        
        // 7. Random UUID component (ensures uniqueness even with same fingerprint)
        components.push(this.generateUUID());
        
        // Hash all components
        const fingerprint = components.join('|||');
        const hash = await this.sha256(fingerprint);
        
        // Create readable guest ID
        return 'NW-' + hash.substring(0, 12).toUpperCase();
    },
    
    // ===== CRYPTOGRAPHIC FUNCTIONS =====
    async sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    calculateChecksum(wallet) {
        // Create checksum from critical wallet data
        const data = JSON.stringify({
            guestId: wallet.guestId,
            walletId: wallet.walletId,
            currencies: wallet.currencies,
            stats: wallet.stats,
            createdAt: wallet.createdAt
        });
        
        // Simple hash for integrity check
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'CHK-' + Math.abs(hash).toString(16).toUpperCase();
    },
    
    // ===== WALLET STORAGE =====
    loadWallet() {
        try {
            const data = localStorage.getItem(this.WALLET_KEY);
            if (!data) return null;
            return JSON.parse(data);
        } catch (e) {
            console.error('[NW_WALLET] Load failed:', e);
            return null;
        }
    },
    
    saveWallet() {
        if (!this.wallet) return false;
        
        try {
            // Update metadata
            this.wallet.lastActivity = Date.now();
            this.wallet.checksum = this.calculateChecksum(this.wallet);
            
            // Save primary
            localStorage.setItem(this.WALLET_KEY, JSON.stringify(this.wallet));
            
            // Save backup
            localStorage.setItem(this.BACKUP_KEY, JSON.stringify(this.wallet));
            
            return true;
        } catch (e) {
            console.error('[NW_WALLET] Save failed:', e);
            return false;
        }
    },
    
    verifyWallet(wallet) {
        if (!wallet || !wallet.guestId || !wallet.walletId) return false;
        if (!wallet.currencies || !wallet.stats) return false;
        
        // Verify checksum
        const expectedChecksum = this.calculateChecksum(wallet);
        if (wallet.checksum !== expectedChecksum) {
            console.warn('[NW_WALLET] Checksum mismatch!');
            // Don't fail on checksum - just log it
            this.log('CHECKSUM_MISMATCH', { expected: expectedChecksum, found: wallet.checksum });
        }
        
        // Verify no negative currencies
        for (const [currency, amount] of Object.entries(wallet.currencies)) {
            if (amount < 0) {
                console.error('[NW_WALLET] Negative currency detected:', currency);
                return false;
            }
        }
        
        return true;
    },
    
    recoverWallet() {
        try {
            const backup = localStorage.getItem(this.BACKUP_KEY);
            if (backup) {
                const wallet = JSON.parse(backup);
                if (this.verifyWallet(wallet)) {
                    this.log('WALLET_RECOVERED', { source: 'backup' });
                    return wallet;
                }
            }
        } catch (e) {
            console.error('[NW_WALLET] Recovery failed:', e);
        }
        return null;
    },
    
    // ===== TRANSACTION LOGGING =====
    log(action, details = {}) {
        const entry = {
            timestamp: Date.now(),
            action: action,
            guestId: this.wallet?.guestId || 'UNKNOWN',
            details: details,
            balances: this.wallet?.currencies ? { ...this.wallet.currencies } : null
        };
        
        try {
            const logs = JSON.parse(localStorage.getItem(this.LOG_KEY) || '[]');
            logs.push(entry);
            
            // Keep last 500 entries
            if (logs.length > 500) {
                logs.splice(0, logs.length - 500);
            }
            
            localStorage.setItem(this.LOG_KEY, JSON.stringify(logs));
        } catch (e) {
            console.error('[NW_WALLET] Log failed:', e);
        }
        
        // Console log for debugging
        console.log(`[NW_WALLET] ${action}:`, details);
    },
    
    getLogs(limit = 50) {
        try {
            const logs = JSON.parse(localStorage.getItem(this.LOG_KEY) || '[]');
            return logs.slice(-limit).reverse();
        } catch (e) {
            return [];
        }
    },
    
    // ===== CURRENCY OPERATIONS =====
    getBalance(currency) {
        if (!this.wallet) return 0;
        
        // GM mode: infinite resources
        if (this.isGM) {
            return this.GM_INFINITE_AMOUNT;
        }
        
        return this.wallet.currencies[currency] || 0;
    },
    
    getAllBalances() {
        if (!this.wallet) return {};
        
        // GM mode: infinite resources
        if (this.isGM) {
            return {
                diamond: this.GM_INFINITE_AMOUNT,
                gold: this.GM_INFINITE_AMOUNT,
                iron: this.GM_INFINITE_AMOUNT,
                stone: this.GM_INFINITE_AMOUNT,
                wood: this.GM_INFINITE_AMOUNT
            };
        }
        
        return { ...this.wallet.currencies };
    },
    
    earn(currency, amount, source = 'UNKNOWN') {
        if (!this.wallet || amount <= 0) return false;
        
        // GM mode: no-op (already infinite)
        if (this.isGM) {
            this.log('EARN_GM', { currency, amount, source, note: 'GM mode - infinite resources' });
            return true;
        }
        
        this.wallet.currencies[currency] = (this.wallet.currencies[currency] || 0) + amount;
        this.wallet.stats.totalEarned[currency] = (this.wallet.stats.totalEarned[currency] || 0) + amount;
        
        this.log('EARN', { currency, amount, source, newBalance: this.wallet.currencies[currency] });
        this.saveWallet();
        
        return true;
    },
    
    spend(currency, amount, purpose = 'UNKNOWN') {
        if (!this.wallet || amount <= 0) return false;
        
        // GM mode: always succeeds without deducting
        if (this.isGM) {
            this.log('SPEND_GM', { currency, amount, purpose, note: 'GM mode - infinite resources' });
            return true;
        }
        
        if (this.wallet.currencies[currency] < amount) {
            this.log('SPEND_FAILED', { currency, amount, purpose, balance: this.wallet.currencies[currency] });
            return false;
        }
        
        this.wallet.currencies[currency] -= amount;
        this.wallet.stats.totalSpent[currency] = (this.wallet.stats.totalSpent[currency] || 0) + amount;
        
        this.log('SPEND', { currency, amount, purpose, newBalance: this.wallet.currencies[currency] });
        this.saveWallet();
        
        return true;
    },
    
    exchange(fromCurrency, toCurrency, fromAmount, toAmount) {
        if (!this.wallet) return false;
        
        if (this.wallet.currencies[fromCurrency] < fromAmount) {
            this.log('EXCHANGE_FAILED', { fromCurrency, toCurrency, fromAmount, toAmount, reason: 'insufficient_funds' });
            return false;
        }
        
        this.wallet.currencies[fromCurrency] -= fromAmount;
        this.wallet.currencies[toCurrency] = (this.wallet.currencies[toCurrency] || 0) + toAmount;
        this.wallet.stats.exchangesMade++;
        
        this.log('EXCHANGE', { fromCurrency, toCurrency, fromAmount, toAmount });
        this.saveWallet();
        
        return true;
    },
    
    // ===== COLLECTION & CARD PROGRESSION =====
    // Collection format: { cardId: { count: N, level: L, xp: X } }
    
    addToCollection(cardId, rarity = 'common') {
        if (!this.wallet) return false;
        
        // Migrate old array format if needed
        if (Array.isArray(this.wallet.collection)) {
            const oldCollection = this.wallet.collection;
            this.wallet.collection = {};
            oldCollection.forEach(id => {
                this.wallet.collection[id] = { count: 1, level: 1, xp: 0 };
            });
        }
        
        // XP per duplicate based on rarity
        const XP_TABLE = { common: 10, uncommon: 20, rare: 50, epic: 100, legendary: 250, mythic: 500 };
        const xpGain = XP_TABLE[rarity] || 10;
        
        if (!this.wallet.collection[cardId]) {
            // First time getting this card
            this.wallet.collection[cardId] = { count: 1, level: 1, xp: 0 };
            this.log('COLLECTION_ADD', { cardId, first: true });
        } else {
            // Duplicate! Add XP and increase count
            const card = this.wallet.collection[cardId];
            card.count++;
            card.xp += xpGain;
            
            // Level up system: 100 XP per level
            const XP_PER_LEVEL = 100;
            const newLevel = Math.floor(card.xp / XP_PER_LEVEL) + 1;
            const leveledUp = newLevel > card.level;
            card.level = Math.min(newLevel, 10); // Max level 10
            
            this.log('COLLECTION_DUPLICATE', { cardId, count: card.count, xp: card.xp, level: card.level, leveledUp });
        }
        
        this.saveWallet();
        return this.wallet.collection[cardId];
    },
    
    hasCard(cardId) {
        if (Array.isArray(this.wallet?.collection)) {
            return this.wallet.collection.includes(cardId);
        }
        return !!this.wallet?.collection?.[cardId];
    },
    
    getCardData(cardId) {
        if (!this.wallet?.collection) return null;
        if (Array.isArray(this.wallet.collection)) {
            return this.wallet.collection.includes(cardId) ? { count: 1, level: 1, xp: 0 } : null;
        }
        return this.wallet.collection[cardId] || null;
    },
    
    getCollection() {
        if (!this.wallet?.collection) return [];
        // Return array of card IDs for backwards compatibility
        if (Array.isArray(this.wallet.collection)) {
            return this.wallet.collection;
        }
        return Object.keys(this.wallet.collection).map(Number);
    },
    
    getFullCollection() {
        // Return full collection with levels and XP
        if (!this.wallet?.collection) return {};
        if (Array.isArray(this.wallet.collection)) {
            const obj = {};
            this.wallet.collection.forEach(id => { obj[id] = { count: 1, level: 1, xp: 0 }; });
            return obj;
        }
        return this.wallet.collection;
    },
    
    updateForge(pityCounter, totalPulls) {
        if (!this.wallet) return;
        
        this.wallet.forge.pityCounter = pityCounter;
        this.wallet.forge.totalPulls = totalPulls;
        this.wallet.forge.lastPull = Date.now();
        this.saveWallet();
    },
    
    getForgeState() {
        return this.wallet?.forge || { pityCounter: 0, totalPulls: 0, lastPull: null };
    },
    
    // ===== STATS =====
    recordGame(won, currency = null, amount = 0) {
        if (!this.wallet) return;
        
        this.wallet.stats.gamesPlayed++;
        if (won) this.wallet.stats.gamesWon++;
        
        this.log('GAME_RESULT', { won, currency, amount });
        this.saveWallet();
    },
    
    recordPull(rarity) {
        if (!this.wallet) return;
        
        this.wallet.stats.pullsMade++;
        if (rarity === 'mythic') this.wallet.stats.mythicsPulled++;
        if (rarity === 'legendary') this.wallet.stats.legendariesPulled++;
        
        this.log('CARD_PULL', { rarity });
        this.saveWallet();
    },
    
    recordPurchase(itemId, currency, amount) {
        if (!this.wallet) return;
        
        this.wallet.stats.purchasesMade++;
        this.log('PURCHASE', { itemId, currency, amount });
        this.saveWallet();
    },
    
    getStats() {
        return this.wallet?.stats || {};
    },
    
    // ===== WALLET INFO =====
    getWalletId() {
        return this.wallet?.walletId || null;
    },
    
    getGuestId() {
        return this.wallet?.guestId || null;
    },
    
    getWalletInfo() {
        if (!this.wallet) return null;
        
        return {
            guestId: this.wallet.guestId,
            walletId: this.wallet.walletId,
            createdAt: this.wallet.createdAt,
            lastActivity: this.wallet.lastActivity,
            currencies: this.isGM ? this.getAllBalances() : { ...this.wallet.currencies },
            stats: { ...this.wallet.stats },
            collectionCount: this.wallet.collection.length,
            isGM: this.isGM
        };
    },
    
    // Check if GM mode is active
    isGMMode() {
        return this.isGM;
    },
    
    // ===== EXPORT/IMPORT (for backup) =====
    exportWallet() {
        if (!this.wallet) return null;
        
        const exportData = {
            ...this.wallet,
            exportedAt: Date.now(),
            exportVersion: 1
        };
        
        this.log('WALLET_EXPORTED', {});
        return btoa(JSON.stringify(exportData));
    },
    
    importWallet(encodedData) {
        try {
            const data = JSON.parse(atob(encodedData));
            
            if (!this.verifyWallet(data)) {
                return { success: false, error: 'Invalid wallet data' };
            }
            
            // Verify guest ID matches (anti-cheat)
            if (this.wallet && this.wallet.guestId !== data.guestId) {
                this.log('IMPORT_REJECTED', { reason: 'guest_id_mismatch' });
                return { success: false, error: 'This wallet belongs to a different guest' };
            }
            
            this.wallet = data;
            this.wallet.lastActivity = Date.now();
            this.saveWallet();
            
            this.log('WALLET_IMPORTED', {});
            return { success: true };
        } catch (e) {
            return { success: false, error: 'Invalid export data' };
        }
    }
};

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => {
    NW_WALLET.init().then(wallet => {
        console.log('[NW_WALLET] Initialized:', wallet.guestId);
        
        // Show GM status prominently
        if (NW_WALLET.isGM) {
            console.log('%c╔════════════════════════════════════════════╗', 'color: #ffd700;');
            console.log('%c║     👑 GAME MASTER MODE ACTIVE 👑          ║', 'color: #ffd700; font-weight: bold;');
            console.log('%c║   All currencies are INFINITE (999,999)    ║', 'color: #00ff00;');
            console.log('%c║   Guest ID: ' + wallet.guestId.padEnd(28) + '   ║', 'color: #00ffff;');
            console.log('%c╚════════════════════════════════════════════╝', 'color: #ffd700;');
        }
        
        // Dispatch event for other scripts
        window.dispatchEvent(new CustomEvent('nw-wallet-ready', { 
            detail: { 
                wallet, 
                isGM: NW_WALLET.isGM 
            } 
        }));
    });
});

// Console helpers for GM activation
console.log('%c[NW_WALLET] GM Commands:', 'color: #888; font-style: italic;');
console.log('%c  NW_WALLET.activateGM("numbahwan-gm-2026") - Activate GM mode', 'color: #666;');
console.log('%c  NW_WALLET.deactivateGM() - Deactivate GM mode', 'color: #666;');
console.log('%c  NW_WALLET.addToGMWhitelist() - Show your Guest ID for permanent GM', 'color: #666;');

// =====================================================
// FLOATING BALANCE WIDGET - Slim bottom bar
// Only shows on pages without their own balance display
// =====================================================
(function() {
    // Inject CSS - slim bottom bar, full width, minimal height
    var style = document.createElement('style');
    style.textContent = '.nw-bottom-bar{position:fixed;bottom:0;left:0;right:0;z-index:9998;font-family:Orbitron,Inter,sans-serif;background:linear-gradient(180deg,rgba(15,15,25,0.98),rgba(10,10,18,0.99));border-top:1px solid rgba(255,215,0,0.3);padding:6px 0;display:flex;justify-content:center;align-items:center;gap:16px;box-shadow:0 -2px 15px rgba(0,0,0,0.4)}.nw-bottom-bar .nw-item{display:flex;align-items:center;gap:4px}.nw-bottom-bar .nw-ico{width:16px;height:16px;object-fit:contain}.nw-bottom-bar .nw-val{font-size:13px;font-weight:700}.nw-bottom-bar .nw-val.diamond{color:#00ffff}.nw-bottom-bar .nw-val.gold{color:#ffd700}.nw-bottom-bar .nw-val.iron{color:#94a3b8}.nw-bottom-bar .nw-val.stone{color:#00ff88}.nw-bottom-bar .nw-val.wood{color:#c97f3d}.nw-bottom-bar-active{padding-bottom:36px}';
    document.head.appendChild(style);
    
    // Create widget HTML - slim bottom bar (shows on ALL pages)
    function createWidget() {
        
        var bar = document.createElement('div');
        bar.className = 'nw-bottom-bar';
        bar.id = 'nwBottomBar';
        bar.innerHTML = '<div class="nw-item"><img src="/static/icons/diamond.svg" class="nw-ico"><span class="nw-val diamond" id="nwfDiamond">0</span></div>' +
            '<div class="nw-item"><img src="/static/icons/gold.svg" class="nw-ico"><span class="nw-val gold" id="nwfGold">0</span></div>' +
            '<div class="nw-item"><img src="/static/icons/iron.svg" class="nw-ico"><span class="nw-val iron" id="nwfIron">0</span></div>' +
            '<div class="nw-item"><img src="/static/icons/black-jade.svg" class="nw-ico"><span class="nw-val stone" id="nwfStone">0</span></div>' +
            '<div class="nw-item"><img src="/static/icons/sacred-log.svg" class="nw-ico"><span class="nw-val wood" id="nwfWood">0</span></div>';
        document.body.appendChild(bar);
        document.body.classList.add('nw-bottom-bar-active');
        
        // Update balances immediately
        updateFloatBalances();
    }
    
    function updateFloatBalances() {
        if (!NW_WALLET.initialized) return;
        var info = NW_WALLET.getWalletInfo();
        if (!info || !info.currencies) return;
        
        function fmt(n) {
            if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
            if (n >= 1000) return (n/1000).toFixed(1)+'K';
            return n;
        }
        
        var d = document.getElementById('nwfDiamond');
        var g = document.getElementById('nwfGold');
        var i = document.getElementById('nwfIron');
        var s = document.getElementById('nwfStone');
        var w = document.getElementById('nwfWood');
        if (d) d.textContent = fmt(info.currencies.diamond || 0);
        if (g) g.textContent = fmt(info.currencies.gold || 0);
        if (i) i.textContent = fmt(info.currencies.iron || 0);
        if (s) s.textContent = fmt(info.currencies.stone || 0);
        if (w) w.textContent = fmt(info.currencies.wood || 0);
    }
    
    // Expose update function globally
    window.updateFloatBalances = updateFloatBalances;
    
    // Init on wallet ready
    window.addEventListener('nw-wallet-ready', function() {
        createWidget();
        // Update every 2 seconds for live sync
        setInterval(updateFloatBalances, 2000);
    });
    
    // Also update on visibility change (when switching tabs)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) updateFloatBalances();
    });
})();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NW_WALLET;
}
