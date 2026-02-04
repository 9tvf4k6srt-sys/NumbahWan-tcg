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
            
            // Currencies - 3-Tier System (v2.0)
            // NWG (premium) → Gold (earned) → Sacred Log (prestige)
            currencies: {
                nwg: 50,       // Starting NWG - try a few pulls
                gold: 100,     // Starting Gold - play some games
                wood: 0        // Sacred Logs - MUST BE EARNED!
            },
            
            // Stats
            stats: {
                totalEarned: { nwg: 50, gold: 100, wood: 0 },
                totalSpent: { nwg: 0, gold: 0, wood: 0 },
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
    // Now uses NW_IDENTITY for unified, ultra-secure device fingerprinting
    async generateGuestId() {
        // Check if NW_IDENTITY is available (7-layer anti-spoof system)
        if (typeof NW_IDENTITY !== 'undefined') {
            try {
                console.log('[NW_WALLET] Using NW_IDENTITY for secure fingerprinting...');
                
                // Get or initialize identity
                let identity = NW_IDENTITY.fingerprint;
                if (!identity) {
                    identity = await NW_IDENTITY.collectFingerprint();
                }
                
                if (identity && identity.deviceUUID) {
                    // Store identity reference for later verification
                    this.identityData = {
                        deviceUUID: identity.deviceUUID,
                        trustScore: identity.trustScore,
                        signals: identity.signals,
                        spoofCheck: identity.spoofCheck
                    };
                    
                    console.log('[NW_WALLET] Identity linked:', identity.deviceUUID, 'Trust:', identity.trustScore + '%');
                    
                    // Return the unified device UUID
                    return identity.deviceUUID;
                }
            } catch (e) {
                console.warn('[NW_WALLET] NW_IDENTITY failed, falling back to legacy:', e);
            }
        }
        
        // Legacy fallback (if NW_IDENTITY not loaded)
        console.log('[NW_WALLET] Using legacy fingerprinting (NW_IDENTITY not available)');
        return await this.generateLegacyGuestId();
    },
    
    // Legacy fingerprinting (kept for backwards compatibility)
    async generateLegacyGuestId() {
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
        
        // Create readable guest ID (legacy format)
        return 'NW-' + hash.substring(0, 12).toUpperCase();
    },
    
    // Get identity trust score (for security checks)
    getTrustScore() {
        return this.identityData?.trustScore || 0;
    },
    
    // Check if identity is verified (trust score > 50%)
    isIdentityVerified() {
        return this.getTrustScore() >= 50;
    },
    
    // Get full identity data
    getIdentityData() {
        return this.identityData || null;
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
        
        // GM mode: infinite resources (3-tier system)
        if (this.isGM) {
            return {
                nwg: this.GM_INFINITE_AMOUNT,
                diamond: this.GM_INFINITE_AMOUNT,  // Legacy alias
                gold: this.GM_INFINITE_AMOUNT,
                wood: this.GM_INFINITE_AMOUNT
            };
        }
        
        // Return balances with backward compatibility
        const balances = { ...this.wallet.currencies };
        // Add legacy 'diamond' alias for 'nwg'
        if (balances.nwg !== undefined) {
            balances.diamond = balances.nwg;
        }
        return balances;
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
    
    // ===== DAILY LOGIN REWARD SYSTEM =====
    // Creates addictive progression: login → earn → spend → want more → login again
    
    DAILY_REWARDS_KEY: 'nw_daily_login',
    
    // Escalating rewards - 3-Tier System (NWG → Gold → Sacred Log)
    // HARD RULE #7: No iron, stone, or diamond - use nwg, gold, wood ONLY
    DAILY_REWARDS: [
        // Day 1-3: Start small with Gold
        { day: 1, rewards: { gold: 20 }, label: '🌱 Welcome Back!' },
        { day: 2, rewards: { gold: 40, nwg: 2 }, label: '📈 Growing!' },
        { day: 3, rewards: { gold: 60, nwg: 5 }, label: '✨ Shining!' },
        // Day 4-6: Building momentum with more NWG
        { day: 4, rewards: { gold: 80, nwg: 10 }, label: '🔥 On Fire!' },
        { day: 5, rewards: { gold: 100, nwg: 15 }, label: '⚡ Unstoppable!' },
        { day: 6, rewards: { gold: 125, nwg: 20 }, label: '💫 Almost There!' },
        // Day 7: THE BIG REWARD - Sacred Log!
        { day: 7, rewards: { gold: 200, nwg: 50, wood: 1 }, label: '🪵 SACRED LOG!', icon: 'wood' }
    ],
    
    // Get daily login state
    getDailyLoginState() {
        try {
            const data = localStorage.getItem(this.DAILY_REWARDS_KEY);
            if (!data) return this.createDailyLoginState();
            
            const state = JSON.parse(data);
            // Check if streak is broken
            const lastClaimDate = new Date(state.lastClaimDate);
            const today = new Date();
            const daysDiff = Math.floor((today.setHours(0,0,0,0) - lastClaimDate.setHours(0,0,0,0)) / (1000*60*60*24));
            
            // Streak broken if more than 1 day passed
            if (daysDiff > 1 && state.lastClaimDate) {
                state.currentStreak = 0;
                state.streakBroken = true;
                this.saveDailyLoginState(state);
            }
            
            return state;
        } catch (e) {
            return this.createDailyLoginState();
        }
    },
    
    createDailyLoginState() {
        const state = {
            currentStreak: 0,
            longestStreak: 0,
            totalDaysLoggedIn: 0,
            lastClaimDate: null,
            todayClaimed: false,
            weeklyResets: 0,
            firstLoginDate: Date.now(),
            streakBroken: false
        };
        this.saveDailyLoginState(state);
        return state;
    },
    
    saveDailyLoginState(state) {
        localStorage.setItem(this.DAILY_REWARDS_KEY, JSON.stringify(state));
    },
    
    // Check if today's reward can be claimed
    canClaimDailyReward() {
        const state = this.getDailyLoginState();
        if (!state.lastClaimDate) return true; // First time!
        
        const lastClaim = new Date(state.lastClaimDate);
        const today = new Date();
        
        // Reset hours to compare dates only
        lastClaim.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        return today > lastClaim;
    },
    
    // Claim daily reward - THE DOPAMINE HIT!
    claimDailyReward() {
        if (!this.wallet || !this.canClaimDailyReward()) {
            return { success: false, reason: 'already_claimed' };
        }
        
        const state = this.getDailyLoginState();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check if continuing streak or broken
        let newStreak = 1;
        if (state.lastClaimDate) {
            const lastClaim = new Date(state.lastClaimDate);
            lastClaim.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((today - lastClaim) / (1000*60*60*24));
            
            if (daysDiff === 1) {
                // Consecutive day! Continue streak
                newStreak = (state.currentStreak % 7) + 1;
            } else {
                // Streak broken, start over
                newStreak = 1;
                state.weeklyResets++;
            }
        }
        
        // Get today's reward based on streak day
        const rewardData = this.DAILY_REWARDS[newStreak - 1];
        const rewards = rewardData.rewards;
        
        // Give the rewards!
        const earnedRewards = {};
        for (const [currency, amount] of Object.entries(rewards)) {
            this.earn(currency, amount, `DAILY_LOGIN_DAY_${newStreak}`);
            earnedRewards[currency] = amount;
        }
        
        // Update state
        state.currentStreak = newStreak;
        state.totalDaysLoggedIn++;
        state.lastClaimDate = Date.now();
        state.todayClaimed = true;
        state.streakBroken = false;
        if (newStreak > state.longestStreak) {
            state.longestStreak = newStreak;
        }
        
        this.saveDailyLoginState(state);
        
        // Log the claim
        this.log('DAILY_REWARD_CLAIMED', {
            day: newStreak,
            rewards: earnedRewards,
            totalDays: state.totalDaysLoggedIn,
            longestStreak: state.longestStreak
        });
        
        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('nw-daily-claimed', {
            detail: {
                day: newStreak,
                rewards: earnedRewards,
                label: rewardData.label,
                nextDay: newStreak === 7 ? 1 : newStreak + 1,
                isDay7: newStreak === 7
            }
        }));
        
        return {
            success: true,
            day: newStreak,
            rewards: earnedRewards,
            label: rewardData.label,
            totalDays: state.totalDaysLoggedIn,
            isDay7: newStreak === 7,
            sacredLogEarned: newStreak === 7
        };
    },
    
    // Get time until next daily reward
    getTimeUntilNextDaily() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const diff = tomorrow - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        return { hours, minutes, seconds, total: diff };
    },
    
    // ===== ACHIEVEMENT SYSTEM =====
    // Achievements drive engagement and give meaningful rewards
    
    ACHIEVEMENTS_KEY: 'nw_achievements',
    
    // HARD RULE #7: 3-Tier Currency Only (nwg, gold, wood)
    ACHIEVEMENTS: {
        // Login Achievements
        first_login: { id: 'first_login', name: 'Welcome!', desc: 'Log in for the first time', icon: '🎉', reward: { nwg: 10 }, category: 'login' },
        streak_3: { id: 'streak_3', name: 'Dedicated', desc: 'Reach a 3-day login streak', icon: '🔥', reward: { nwg: 15, gold: 25 }, category: 'login' },
        streak_7: { id: 'streak_7', name: 'Committed', desc: 'Complete a 7-day streak', icon: '🌟', reward: { nwg: 50, wood: 1 }, category: 'login' },
        streak_30: { id: 'streak_30', name: 'Legend', desc: 'Log in 30 total days', icon: '👑', reward: { nwg: 100, wood: 3 }, category: 'login' },
        
        // Collection Achievements
        first_card: { id: 'first_card', name: 'Collector', desc: 'Get your first card', icon: '🃏', reward: { gold: 50 }, category: 'collection' },
        cards_10: { id: 'cards_10', name: 'Card Hoarder', desc: 'Collect 10 unique cards', icon: '📦', reward: { nwg: 20, gold: 50 }, category: 'collection' },
        cards_50: { id: 'cards_50', name: 'Deck Master', desc: 'Collect 50 unique cards', icon: '🎴', reward: { nwg: 75, wood: 1 }, category: 'collection' },
        first_mythic: { id: 'first_mythic', name: 'Mythic Hunter', desc: 'Pull your first Mythic', icon: '💎', reward: { wood: 2, nwg: 100 }, category: 'collection' },
        first_legendary: { id: 'first_legendary', name: 'Lucky Star', desc: 'Pull your first Legendary', icon: '⭐', reward: { nwg: 50 }, category: 'collection' },
        
        // Spending Achievements
        first_pull: { id: 'first_pull', name: 'First Pull', desc: 'Make your first forge pull', icon: '🔮', reward: { gold: 50 }, category: 'spending' },
        pulls_10: { id: 'pulls_10', name: 'Fortune Seeker', desc: 'Make 10 forge pulls', icon: '🎰', reward: { nwg: 15 }, category: 'spending' },
        pulls_50: { id: 'pulls_50', name: 'High Roller', desc: 'Make 50 forge pulls', icon: '🎲', reward: { nwg: 50, wood: 1 }, category: 'spending' },
        first_purchase: { id: 'first_purchase', name: 'Supporter', desc: 'Make your first merch purchase', icon: '🛒', reward: { nwg: 25 }, category: 'spending' },
        
        // Exchange Achievements
        first_exchange: { id: 'first_exchange', name: 'Trader', desc: 'Complete your first exchange', icon: '💱', reward: { gold: 20 }, category: 'economy' },
        exchanges_10: { id: 'exchanges_10', name: 'Money Moves', desc: 'Complete 10 exchanges', icon: '📊', reward: { nwg: 20 }, category: 'economy' },
        rich_nwg: { id: 'rich_nwg', name: 'NWG Whale', desc: 'Own 500+ NWG at once', icon: '◆', reward: { wood: 1 }, category: 'economy' },
        rich_wood: { id: 'rich_wood', name: 'Lumberjack', desc: 'Own 5+ Sacred Logs at once', icon: '🪵', reward: { nwg: 100 }, category: 'economy' },
        
        // Gaming Achievements
        first_game: { id: 'first_game', name: 'Gamer', desc: 'Play your first arcade game', icon: '🎮', reward: { gold: 25 }, category: 'gaming' },
        games_10: { id: 'games_10', name: 'Arcade Regular', desc: 'Play 10 arcade games', icon: '👾', reward: { nwg: 15 }, category: 'gaming' },
        games_won_10: { id: 'games_won_10', name: 'Winner', desc: 'Win 10 arcade games', icon: '🏆', reward: { nwg: 30, gold: 50 }, category: 'gaming' },
        
        // Special Achievements
        easter_egg: { id: 'easter_egg', name: 'Explorer', desc: 'Find a hidden Easter egg', icon: '🥚', reward: { nwg: 50 }, category: 'special' },
        gm_mode: { id: 'gm_mode', name: 'Power User', desc: 'Activate GM mode', icon: '👑', reward: {}, category: 'special', hidden: true }
    },
    
    getAchievementState() {
        try {
            return JSON.parse(localStorage.getItem(this.ACHIEVEMENTS_KEY) || '{}');
        } catch (e) {
            return {};
        }
    },
    
    saveAchievementState(state) {
        localStorage.setItem(this.ACHIEVEMENTS_KEY, JSON.stringify(state));
    },
    
    // Unlock an achievement
    unlockAchievement(achievementId) {
        const achievement = this.ACHIEVEMENTS[achievementId];
        if (!achievement) return null;
        
        const state = this.getAchievementState();
        if (state[achievementId]) return null; // Already unlocked
        
        // Mark as unlocked
        state[achievementId] = {
            unlockedAt: Date.now(),
            claimed: false
        };
        this.saveAchievementState(state);
        
        // Give rewards automatically
        const rewards = achievement.reward || {};
        for (const [currency, amount] of Object.entries(rewards)) {
            if (amount > 0) {
                this.earn(currency, amount, `ACHIEVEMENT:${achievementId}`);
            }
        }
        state[achievementId].claimed = true;
        this.saveAchievementState(state);
        
        this.log('ACHIEVEMENT_UNLOCKED', { id: achievementId, name: achievement.name, rewards });
        
        // Dispatch event for UI
        window.dispatchEvent(new CustomEvent('nw-achievement-unlocked', {
            detail: { achievement, rewards }
        }));
        
        return { achievement, rewards };
    },
    
    // Check achievement progress and auto-unlock
    checkAchievements() {
        if (!this.wallet) return;
        
        const state = this.getAchievementState();
        const dailyState = this.getDailyLoginState();
        const stats = this.wallet.stats || {};
        const collection = this.getCollection();
        const balances = this.wallet.currencies || {};
        
        // Login achievements
        if (!state.first_login) this.unlockAchievement('first_login');
        if (dailyState.currentStreak >= 3 && !state.streak_3) this.unlockAchievement('streak_3');
        if (dailyState.currentStreak >= 7 && !state.streak_7) this.unlockAchievement('streak_7');
        if (dailyState.totalDaysLoggedIn >= 30 && !state.streak_30) this.unlockAchievement('streak_30');
        
        // Collection achievements
        if (collection.length >= 1 && !state.first_card) this.unlockAchievement('first_card');
        if (collection.length >= 10 && !state.cards_10) this.unlockAchievement('cards_10');
        if (collection.length >= 50 && !state.cards_50) this.unlockAchievement('cards_50');
        if (stats.mythicsPulled >= 1 && !state.first_mythic) this.unlockAchievement('first_mythic');
        if (stats.legendariesPulled >= 1 && !state.first_legendary) this.unlockAchievement('first_legendary');
        
        // Spending achievements
        if (stats.pullsMade >= 1 && !state.first_pull) this.unlockAchievement('first_pull');
        if (stats.pullsMade >= 10 && !state.pulls_10) this.unlockAchievement('pulls_10');
        if (stats.pullsMade >= 50 && !state.pulls_50) this.unlockAchievement('pulls_50');
        if (stats.purchasesMade >= 1 && !state.first_purchase) this.unlockAchievement('first_purchase');
        
        // Exchange achievements
        if (stats.exchangesMade >= 1 && !state.first_exchange) this.unlockAchievement('first_exchange');
        if (stats.exchangesMade >= 10 && !state.exchanges_10) this.unlockAchievement('exchanges_10');
        
        // Economy achievements
        if (balances.nwg >= 500 && !state.rich_nwg) this.unlockAchievement('rich_nwg');
        if (balances.wood >= 5 && !state.rich_wood) this.unlockAchievement('rich_wood');
        
        // Gaming achievements
        if (stats.gamesPlayed >= 1 && !state.first_game) this.unlockAchievement('first_game');
        if (stats.gamesPlayed >= 10 && !state.games_10) this.unlockAchievement('games_10');
        if (stats.gamesWon >= 10 && !state.games_won_10) this.unlockAchievement('games_won_10');
        
        // GM mode achievement
        if (this.isGM && !state.gm_mode) this.unlockAchievement('gm_mode');
    },
    
    // Get all achievements with their status
    getAllAchievements() {
        const state = this.getAchievementState();
        return Object.values(this.ACHIEVEMENTS).map(ach => ({
            ...ach,
            unlocked: !!state[ach.id],
            unlockedAt: state[ach.id]?.unlockedAt,
            claimed: state[ach.id]?.claimed
        }));
    },
    
    // Get unlocked achievements count
    getAchievementProgress() {
        const state = this.getAchievementState();
        const total = Object.keys(this.ACHIEVEMENTS).length;
        const unlocked = Object.keys(state).length;
        return { unlocked, total, percentage: Math.round((unlocked / total) * 100) };
    },
    
    // ===== STATS =====
    recordGame(won, currency = null, amount = 0) {
        if (!this.wallet) return;
        
        this.wallet.stats.gamesPlayed++;
        if (won) this.wallet.stats.gamesWon++;
        
        this.log('GAME_RESULT', { won, currency, amount });
        this.saveWallet();
        
        // Check gaming achievements
        this.checkAchievements();
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
    },
    
    // ===== ACCOUNT TRANSFER SYSTEM =====
    // Generate a transfer code (valid for 24 hours)
    generateTransferCode() {
        if (!this.wallet) return null;
        
        const transferData = {
            wallet: { ...this.wallet },
            transferId: 'TXF-' + this.generateUUID().substring(0, 8).toUpperCase(),
            createdAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            sourceDevice: navigator.userAgent.substring(0, 50),
            version: 2
        };
        
        // Sign with simple checksum for integrity
        const dataStr = JSON.stringify(transferData.wallet);
        transferData.checksum = this.simpleHash(dataStr);
        
        this.log('TRANSFER_CODE_GENERATED', { transferId: transferData.transferId });
        
        // Encode with compression marker
        const encoded = 'NWTX2:' + btoa(unescape(encodeURIComponent(JSON.stringify(transferData))));
        return {
            code: encoded,
            transferId: transferData.transferId,
            expiresAt: new Date(transferData.expiresAt).toISOString(),
            guestId: this.wallet.guestId
        };
    },
    
    // Import wallet from transfer code (ALLOWS different device)
    async importFromTransferCode(code) {
        try {
            // Validate format
            if (!code.startsWith('NWTX2:')) {
                return { success: false, error: 'Invalid transfer code format' };
            }
            
            // Decode
            const encoded = code.substring(6);
            const transferData = JSON.parse(decodeURIComponent(escape(atob(encoded))));
            
            // Check expiry
            if (Date.now() > transferData.expiresAt) {
                return { success: false, error: 'Transfer code expired. Generate a new one.' };
            }
            
            // Verify checksum
            const dataStr = JSON.stringify(transferData.wallet);
            if (transferData.checksum !== this.simpleHash(dataStr)) {
                return { success: false, error: 'Transfer code corrupted or tampered' };
            }
            
            // Verify wallet data structure
            if (!this.verifyWallet(transferData.wallet)) {
                return { success: false, error: 'Invalid wallet data in transfer' };
            }
            
            // Store old wallet info for logging
            const oldGuestId = this.wallet?.guestId;
            const newGuestId = transferData.wallet.guestId;
            
            // ===== PERFORM TRANSFER =====
            // 1. Back up current wallet (if exists)
            if (this.wallet) {
                localStorage.setItem(STORAGE.WALLET_KEY + '_backup_' + Date.now(), 
                    JSON.stringify(this.wallet));
            }
            
            // 2. Import the transferred wallet
            this.wallet = transferData.wallet;
            this.wallet.lastActivity = Date.now();
            this.wallet.transferHistory = this.wallet.transferHistory || [];
            this.wallet.transferHistory.push({
                transferId: transferData.transferId,
                fromDevice: transferData.sourceDevice,
                toDevice: navigator.userAgent.substring(0, 50),
                transferredAt: Date.now()
            });
            
            // 3. Update localStorage with new guest ID as key
            localStorage.setItem('nw_device_uuid', newGuestId);
            this.saveWallet();
            
            // 4. Log the transfer
            this.log('ACCOUNT_TRANSFERRED', {
                transferId: transferData.transferId,
                fromGuestId: oldGuestId,
                toGuestId: newGuestId
            });
            
            console.log('%c✅ ACCOUNT TRANSFERRED SUCCESSFULLY!', 'color: #00ff00; font-size: 16px;');
            console.log('%c   Your ID: ' + newGuestId, 'color: #00ffff;');
            console.log('%c   All currency, cards, and progress restored!', 'color: #ffd700;');
            
            return { 
                success: true, 
                guestId: newGuestId,
                message: 'Account transferred! Refresh the page to see your data.'
            };
            
        } catch (e) {
            console.error('[NW_WALLET] Transfer import error:', e);
            return { success: false, error: 'Failed to process transfer code: ' + e.message };
        }
    },
    
    // Simple hash for checksum (not cryptographic, just integrity)
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'H' + Math.abs(hash).toString(36).toUpperCase();
    },
    
    // Get transaction log
    getTransactionLog() {
        try {
            const log = localStorage.getItem(STORAGE.LOG_KEY);
            return log ? JSON.parse(log) : [];
        } catch (e) {
            return [];
        }
    },
    
    // Get pull history
    getPullHistory() {
        const log = this.getTransactionLog();
        return log.filter(entry => entry.action === 'CARD_PULL');
    },
    
    // Get currency transaction history
    getCurrencyHistory(currency = null) {
        const log = this.getTransactionLog();
        return log.filter(entry => {
            if (entry.action !== 'CURRENCY_SPENT' && entry.action !== 'CURRENCY_EARNED') return false;
            if (currency && entry.data?.currency !== currency) return false;
            return true;
        });
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
        
        // Check achievements on every load
        setTimeout(() => NW_WALLET.checkAchievements(), 500);
        
        // Show daily login prompt if available
        if (NW_WALLET.canClaimDailyReward()) {
            const dailyState = NW_WALLET.getDailyLoginState();
            const nextDay = (dailyState.currentStreak % 7) + 1;
            console.log('%c🎁 Daily Reward Available! Day ' + nextDay + '/7', 
                'color: #00ff88; font-weight: bold; font-size: 14px;');
            console.log('%c   Claim at /wallet or call: NW_WALLET.claimDailyReward()', 'color: #888;');
        }
        
        // Process pending embassy rewards (claimed from partner sites)
        const pendingRewards = JSON.parse(localStorage.getItem('nw_embassy_pending') || '[]');
        if (pendingRewards.length > 0) {
            console.log('%c🏛️ Processing Embassy Rewards...', 'color: #ffd700; font-weight: bold;');
            let totalNwg = 0, totalWood = 0;
            pendingRewards.forEach(reward => {
                NW_WALLET.addCurrency('nwg', reward.rewards.nwg || 0, `Embassy: ${reward.partnerName}`);
                NW_WALLET.addCurrency('wood', reward.rewards.wood || 0, `Embassy: ${reward.partnerName}`);
                totalNwg += reward.rewards.nwg || 0;
                totalWood += reward.rewards.wood || 0;
                console.log(`  ✓ ${reward.partnerName}: +${reward.rewards.nwg} NWG, +${reward.rewards.wood} Wood`);
            });
            localStorage.removeItem('nw_embassy_pending');
            console.log(`%c🎉 Total Embassy Rewards: +${totalNwg} NWG, +${totalWood} Wood`, 'color: #00ff88;');
            
            // Dispatch embassy reward event for UI notifications
            window.dispatchEvent(new CustomEvent('nw-embassy-rewards-processed', {
                detail: { nwg: totalNwg, wood: totalWood, count: pendingRewards.length }
            }));
        }
        
        // Dispatch event for other scripts
        window.dispatchEvent(new CustomEvent('nw-wallet-ready', { 
            detail: { 
                wallet, 
                isGM: NW_WALLET.isGM,
                canClaimDaily: NW_WALLET.canClaimDailyReward(),
                dailyState: NW_WALLET.getDailyLoginState(),
                achievementProgress: NW_WALLET.getAchievementProgress()
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
// FLOATING BALANCE WIDGET - 3-Tier Currency System
// HARD RULE #7: NWG → Gold → Sacred Log ONLY
// =====================================================
(function() {
    // Inject CSS - 3-tier slim bottom bar
    var style = document.createElement('style');
    style.textContent = '.nw-bottom-bar{position:fixed;bottom:0;left:0;right:0;z-index:9998;font-family:Orbitron,Inter,sans-serif;background:linear-gradient(180deg,rgba(15,15,25,0.98),rgba(10,10,18,0.99));border-top:1px solid rgba(255,215,0,0.3);padding:6px 0;display:flex;justify-content:center;align-items:center;gap:20px;box-shadow:0 -2px 15px rgba(0,0,0,0.4)}.nw-bottom-bar .nw-item{display:flex;align-items:center;gap:4px}.nw-bottom-bar .nw-ico{width:16px;height:16px;object-fit:contain}.nw-bottom-bar .nw-val{font-size:13px;font-weight:700}.nw-bottom-bar .nw-val.nwg{color:#00d4ff}.nw-bottom-bar .nw-val.gold{color:#ffd700}.nw-bottom-bar .nw-val.wood{color:#00ff88}.nw-bottom-bar-active{padding-bottom:36px}';
    document.head.appendChild(style);
    
    // Create widget HTML - 3-tier currencies only
    function createWidget() {
        var bar = document.createElement('div');
        bar.className = 'nw-bottom-bar';
        bar.id = 'nwBottomBar';
        // 3-Tier System: NWG (premium) → Gold (earned) → Sacred Log (prestige)
        bar.innerHTML = '<div class="nw-item"><span style="font-size:14px">◆</span><span class="nw-val nwg" id="nwfNwg">0</span></div>' +
            '<div class="nw-item"><span style="font-size:14px">●</span><span class="nw-val gold" id="nwfGold">0</span></div>' +
            '<div class="nw-item"><span style="font-size:14px">⧫</span><span class="nw-val wood" id="nwfWood">0</span></div>';
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
        
        var nwg = document.getElementById('nwfNwg');
        var g = document.getElementById('nwfGold');
        var w = document.getElementById('nwfWood');
        if (nwg) nwg.textContent = fmt(info.currencies.nwg || 0);
        if (g) g.textContent = fmt(info.currencies.gold || 0);
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
