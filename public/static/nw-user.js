/**
 * NW_USER - Unified Identity System v2.0
 * =====================================
 * ONE ID TO RULE THEM ALL
 * 
 * Combines: Identity + Wallet + Collection + Business
 * Includes: Privacy layers, transfer system, profile visibility
 * 
 * Usage:
 *   await NW_USER.init()
 *   NW_USER.wallet.spend('wood', 10)
 *   NW_USER.profile.setDisplayName('CardMaster99')
 */

const NW_USER = {
    VERSION: '2.0.0',
    
    // ===== STATE =====
    id: null,
    initialized: false,
    isGM: false,
    
    // ===== STORAGE KEYS =====
    KEYS: {
        USER: 'nw_user_v2',
        DEVICE: 'nw_device_uuid',
        LEGACY_WALLET: 'nw_wallet_v2',
        LEGACY_CITIZEN: 'nw_citizen',
        GM: 'nw_gm_mode',
        TRANSFER_HISTORY: 'nw_transfer_history'
    },
    
    // ===== DATA STRUCTURE =====
    _data: null,
    
    // Default data template
    _template() {
        const now = Date.now();
        return {
            // === IDENTITY (Core) ===
            id: null,                    // NW-XXXX-XXXX-XXXX format
            createdAt: now,
            lastActivity: now,
            version: 2,
            
            // === PROFILE (Public/Toggleable) ===
            profile: {
                displayName: 'Guest',
                avatar: null,
                title: null,              // "Card Master", "Whale", etc.
                bio: '',
                
                // Privacy toggles - what others can see
                visibility: {
                    showCollection: true,
                    showStats: true,
                    showAchievements: true,
                    showBalance: false,   // Currency hidden by default
                    showBusiness: true,
                    showActivity: true
                }
            },
            
            // === IDENTITY/CITIZENSHIP (Semi-Public) ===
            identity: {
                citizenshipTier: 'guest', // guest, bronze, silver, gold, platinum, mythic
                trustScore: 50,           // 0-100
                clearanceLevel: 1,        // 1-10
                joinedAt: now,
                verifiedAt: null,
                
                // Device binding
                deviceUUID: null,
                deviceSignature: null,
                
                // Flags
                isVerified: false,
                isBanned: false,
                banReason: null
            },
            
            // === WALLET (Private) ===
            wallet: {
                currencies: {
                    diamond: 50,
                    gold: 25,
                    iron: 10,
                    stone: 5,
                    wood: 0
                },
                
                stats: {
                    totalEarned: { diamond: 50, gold: 25, iron: 10, stone: 5, wood: 0 },
                    totalSpent: { diamond: 0, gold: 0, iron: 0, stone: 0, wood: 0 },
                    gamesPlayed: 0,
                    gamesWon: 0,
                    exchangesMade: 0,
                    purchasesMade: 0
                },
                
                transactionLog: [],       // Last 100 transactions
                lastClaim: null           // Daily reward tracking
            },
            
            // === COLLECTION (Semi-Public) ===
            collection: {
                cards: [],                // Array of { id, obtainedAt, source }
                pullStats: {
                    totalPulls: 0,
                    mythicsPulled: 0,
                    legendariesPulled: 0,
                    epicsPulled: 0,
                    lastPull: null
                },
                pity: {
                    counter: 0,
                    softPity: 75,
                    hardPity: 100
                }
            },
            
            // === ACHIEVEMENTS (Public) ===
            achievements: {
                unlocked: [],             // Array of achievement IDs
                progress: {},             // { achievementId: currentProgress }
                points: 0
            },
            
            // === BUSINESS (Private/Toggleable) ===
            business: null,               // null = no business, or { name, type, products, etc. }
            
            // === DAILY/STREAK (Private) ===
            daily: {
                streak: 0,
                lastClaim: null,
                totalClaims: 0
            },
            
            // === SECURITY ===
            security: {
                checksum: null,
                transferHistory: [],
                lastVerified: null
            }
        };
    },
    
    // ===== INITIALIZATION =====
    async init() {
        if (this.initialized) return this;
        
        console.log('[NW_USER] v2.0 Initializing...');
        
        // 1. Try to load existing v2 data
        let data = this._loadLocal(this.KEYS.USER);
        
        // 2. If no v2, migrate from legacy systems
        if (!data) {
            console.log('[NW_USER] No v2 data found, checking legacy...');
            data = await this._migrateLegacy();
        }
        
        // 3. If still nothing, create fresh
        if (!data) {
            console.log('[NW_USER] Creating new user...');
            data = this._template();
            data.id = await this._generateId();
            data.identity.deviceUUID = data.id;
        }
        
        // 4. Store in memory
        this._data = data;
        this.id = data.id;
        
        // 5. Check GM mode
        this.isGM = localStorage.getItem(this.KEYS.GM) === 'true';
        
        // 6. Save (ensures latest format)
        this._save();
        
        // 7. Dispatch ready event
        this._dispatch('nw-user-ready', { id: this.id, isGM: this.isGM });
        
        // 8. Sync with legacy NW_WALLET if it exists (backwards compatibility)
        this._syncWithLegacyWallet();
        
        this.initialized = true;
        console.log('[NW_USER] Ready:', this.id);
        
        return this;
    },
    
    // ===== LEGACY MIGRATION =====
    async _migrateLegacy() {
        console.log('[NW_USER] Migrating legacy data...');
        
        const legacyWallet = this._loadLocal(this.KEYS.LEGACY_WALLET);
        const legacyCitizen = this._loadLocal(this.KEYS.LEGACY_CITIZEN);
        const deviceUUID = localStorage.getItem(this.KEYS.DEVICE);
        
        if (!legacyWallet && !legacyCitizen && !deviceUUID) {
            return null; // No legacy data
        }
        
        // Create new data structure
        const data = this._template();
        
        // Set ID from legacy sources
        data.id = deviceUUID || legacyWallet?.guestId || await this._generateId();
        
        // Migrate wallet
        if (legacyWallet) {
            data.wallet.currencies = legacyWallet.currencies || data.wallet.currencies;
            data.wallet.stats = { ...data.wallet.stats, ...legacyWallet.stats };
            data.wallet.transactionLog = legacyWallet.transactionLog || [];
            data.wallet.lastClaim = legacyWallet.lastClaim;
            
            // Migrate collection
            if (legacyWallet.collection) {
                data.collection.cards = legacyWallet.collection.map(c => 
                    typeof c === 'string' ? { id: c, obtainedAt: Date.now(), source: 'legacy' } : c
                );
            }
            
            // Migrate forge/pity
            if (legacyWallet.forge) {
                data.collection.pity.counter = legacyWallet.forge.pityCounter || 0;
                data.collection.pullStats.totalPulls = legacyWallet.forge.totalPulls || 0;
            }
            
            // Migrate pull stats
            if (legacyWallet.stats) {
                data.collection.pullStats.mythicsPulled = legacyWallet.stats.mythicsPulled || 0;
                data.collection.pullStats.legendariesPulled = legacyWallet.stats.legendariesPulled || 0;
            }
            
            // Migrate transfer history
            if (legacyWallet.transferHistory) {
                data.security.transferHistory = legacyWallet.transferHistory;
            }
            
            data.createdAt = legacyWallet.createdAt || data.createdAt;
        }
        
        // Migrate citizen
        if (legacyCitizen) {
            data.profile.displayName = legacyCitizen.name || 'Guest';
            data.profile.avatar = legacyCitizen.avatar;
            data.identity.trustScore = legacyCitizen.trustScore || 50;
            data.identity.clearanceLevel = legacyCitizen.clearance || 1;
            data.identity.joinedAt = legacyCitizen.joinedAt || data.createdAt;
        }
        
        // Migrate business
        const legacyBusiness = this._loadLocal(`nw_business_${data.id}`);
        if (legacyBusiness) {
            data.business = legacyBusiness;
        }
        
        // Migrate achievements
        const legacyAchievements = this._loadLocal('nw_achievements');
        if (legacyAchievements) {
            data.achievements = { ...data.achievements, ...legacyAchievements };
        }
        
        // Migrate daily
        const legacyDaily = this._loadLocal('nw_daily');
        if (legacyDaily) {
            data.daily = { ...data.daily, ...legacyDaily };
        }
        
        console.log('[NW_USER] Migration complete! ID:', data.id);
        return data;
    },
    
    // ===== PROFILE ACCESS =====
    get profile() {
        const self = this;
        return {
            get displayName() { return self._data.profile.displayName; },
            get avatar() { return self._data.profile.avatar; },
            get title() { return self._data.profile.title; },
            get bio() { return self._data.profile.bio; },
            get visibility() { return { ...self._data.profile.visibility }; },
            
            setDisplayName(name) {
                if (!name || name.length > 20) return false;
                self._data.profile.displayName = name.trim();
                self._save();
                self._dispatch('nw-profile-update', { field: 'displayName', value: name });
                return true;
            },
            
            setAvatar(url) {
                self._data.profile.avatar = url;
                self._save();
                self._dispatch('nw-profile-update', { field: 'avatar', value: url });
                return true;
            },
            
            setTitle(title) {
                self._data.profile.title = title;
                self._save();
                return true;
            },
            
            setBio(bio) {
                if (bio && bio.length > 200) return false;
                self._data.profile.bio = bio;
                self._save();
                return true;
            },
            
            // Privacy toggles
            setVisibility(key, value) {
                if (!(key in self._data.profile.visibility)) return false;
                self._data.profile.visibility[key] = !!value;
                self._save();
                self._dispatch('nw-visibility-change', { key, value: !!value });
                return true;
            },
            
            toggleVisibility(key) {
                return this.setVisibility(key, !self._data.profile.visibility[key]);
            }
        };
    },
    
    // ===== IDENTITY ACCESS =====
    get identity() {
        const self = this;
        return {
            get tier() { return self._data.identity.citizenshipTier; },
            get trustScore() { return self._data.identity.trustScore; },
            get clearance() { return self._data.identity.clearanceLevel; },
            get joinedAt() { return self._data.identity.joinedAt; },
            get isVerified() { return self._data.identity.isVerified; },
            get deviceUUID() { return self._data.identity.deviceUUID; },
            
            // Upgrade citizenship tier
            upgradeTier(newTier) {
                const tiers = ['guest', 'bronze', 'silver', 'gold', 'platinum', 'mythic'];
                const currentIdx = tiers.indexOf(self._data.identity.citizenshipTier);
                const newIdx = tiers.indexOf(newTier);
                if (newIdx <= currentIdx) return false;
                
                self._data.identity.citizenshipTier = newTier;
                self._save();
                self._dispatch('nw-tier-upgrade', { oldTier: tiers[currentIdx], newTier });
                return true;
            },
            
            // Adjust trust score
            adjustTrust(delta, reason = '') {
                self._data.identity.trustScore = Math.max(0, Math.min(100, 
                    self._data.identity.trustScore + delta));
                self._save();
                self._dispatch('nw-trust-change', { delta, newScore: self._data.identity.trustScore, reason });
                return self._data.identity.trustScore;
            }
        };
    },
    
    // ===== WALLET ACCESS =====
    get wallet() {
        const self = this;
        return {
            // Currency getters
            get diamond() { return self._getCurrency('diamond'); },
            get gold() { return self._getCurrency('gold'); },
            get iron() { return self._getCurrency('iron'); },
            get stone() { return self._getCurrency('stone'); },
            get wood() { return self._getCurrency('wood'); },
            
            // Get any currency
            get(type) { return self._getCurrency(type); },
            
            // Get all balances
            getAll() {
                if (self.isGM) {
                    return { diamond: 999999, gold: 999999, iron: 999999, stone: 999999, wood: 999999 };
                }
                return { ...self._data.wallet.currencies };
            },
            
            // Spend currency
            spend(type, amount, reason = 'PURCHASE') {
                return self._spendCurrency(type, amount, reason);
            },
            
            // Earn currency
            earn(type, amount, reason = 'REWARD') {
                return self._earnCurrency(type, amount, reason);
            },
            
            // Check if can afford
            canAfford(type, amount) {
                return self.isGM || self._getCurrency(type) >= amount;
            },
            
            // Stats
            get stats() { return { ...self._data.wallet.stats }; },
            
            // Transaction log (last 100)
            get transactions() { return [...self._data.wallet.transactionLog]; }
        };
    },
    
    _getCurrency(type) {
        if (this.isGM) return 999999;
        return this._data?.wallet?.currencies?.[type] || 0;
    },
    
    _spendCurrency(type, amount, reason) {
        if (this.isGM) {
            this._logTransaction(type, -amount, reason, 'GM_SPEND');
            return true;
        }
        
        const current = this._getCurrency(type);
        if (current < amount) return false;
        
        this._data.wallet.currencies[type] -= amount;
        this._data.wallet.stats.totalSpent[type] = (this._data.wallet.stats.totalSpent[type] || 0) + amount;
        
        this._logTransaction(type, -amount, reason, 'SPEND');
        this._save();
        this._dispatch('nw-currency-change', { type, amount: -amount, reason, balance: this._data.wallet.currencies[type] });
        
        return true;
    },
    
    _earnCurrency(type, amount, reason) {
        this._data.wallet.currencies[type] = (this._data.wallet.currencies[type] || 0) + amount;
        this._data.wallet.stats.totalEarned[type] = (this._data.wallet.stats.totalEarned[type] || 0) + amount;
        
        this._logTransaction(type, amount, reason, 'EARN');
        this._save();
        this._dispatch('nw-currency-change', { type, amount, reason, balance: this._data.wallet.currencies[type] });
        
        return true;
    },
    
    _logTransaction(type, amount, reason, action) {
        const tx = {
            id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            type,
            amount,
            reason,
            action,
            timestamp: Date.now(),
            balance: this._data.wallet.currencies[type]
        };
        
        this._data.wallet.transactionLog.unshift(tx);
        
        // Keep only last 100
        if (this._data.wallet.transactionLog.length > 100) {
            this._data.wallet.transactionLog = this._data.wallet.transactionLog.slice(0, 100);
        }
    },
    
    // ===== COLLECTION ACCESS =====
    get collection() {
        const self = this;
        return {
            get cards() { return [...self._data.collection.cards]; },
            get count() { return self._data.collection.cards.length; },
            get uniqueCount() { return new Set(self._data.collection.cards.map(c => c.id)).size; },
            get pullStats() { return { ...self._data.collection.pullStats }; },
            get pity() { return { ...self._data.collection.pity }; },
            
            hasCard(cardId) {
                return self._data.collection.cards.some(c => c.id === cardId);
            },
            
            getCardCount(cardId) {
                return self._data.collection.cards.filter(c => c.id === cardId).length;
            },
            
            addCard(cardId, source = 'pull') {
                self._data.collection.cards.push({
                    id: cardId,
                    obtainedAt: Date.now(),
                    source
                });
                self._save();
                self._dispatch('nw-card-obtained', { cardId, source });
                return true;
            },
            
            recordPull(rarity) {
                self._data.collection.pullStats.totalPulls++;
                self._data.collection.pullStats.lastPull = Date.now();
                
                if (rarity === 'mythic') {
                    self._data.collection.pullStats.mythicsPulled++;
                    self._data.collection.pity.counter = 0; // Reset pity on mythic
                } else if (rarity === 'legendary') {
                    self._data.collection.pullStats.legendariesPulled++;
                } else if (rarity === 'epic') {
                    self._data.collection.pullStats.epicsPulled++;
                }
                
                // Increment pity (unless we just got mythic)
                if (rarity !== 'mythic') {
                    self._data.collection.pity.counter++;
                }
                
                self._save();
            },
            
            getPityBonus() {
                const pity = self._data.collection.pity;
                if (pity.counter >= pity.hardPity) return 1.0; // Guaranteed
                if (pity.counter >= pity.softPity) {
                    // Linear increase from soft to hard pity
                    const progress = (pity.counter - pity.softPity) / (pity.hardPity - pity.softPity);
                    return progress * 0.5; // Up to 50% bonus
                }
                return 0;
            }
        };
    },
    
    // ===== ACHIEVEMENTS ACCESS =====
    get achievements() {
        const self = this;
        return {
            get unlocked() { return [...self._data.achievements.unlocked]; },
            get points() { return self._data.achievements.points; },
            get progress() { return { ...self._data.achievements.progress }; },
            
            hasAchievement(id) {
                return self._data.achievements.unlocked.includes(id);
            },
            
            unlock(id, points = 0) {
                if (this.hasAchievement(id)) return false;
                self._data.achievements.unlocked.push(id);
                self._data.achievements.points += points;
                self._save();
                self._dispatch('nw-achievement-unlock', { id, points, totalPoints: self._data.achievements.points });
                return true;
            },
            
            setProgress(id, value) {
                self._data.achievements.progress[id] = value;
                self._save();
            },
            
            incrementProgress(id, delta = 1) {
                self._data.achievements.progress[id] = (self._data.achievements.progress[id] || 0) + delta;
                self._save();
                return self._data.achievements.progress[id];
            }
        };
    },
    
    // ===== BUSINESS ACCESS =====
    get business() {
        if (!this._data.business) return null;
        
        const self = this;
        return {
            get name() { return self._data.business.name; },
            get type() { return self._data.business.type; },
            get emoji() { return self._data.business.emoji; },
            get products() { return [...(self._data.business.products || [])]; },
            get orders() { return [...(self._data.business.orders || [])]; },
            get status() { return self._data.business.status; },
            get stats() { return { ...self._data.business.stats }; },
            
            addProduct(product) {
                product.id = `p-${Date.now()}`;
                product.createdAt = Date.now();
                self._data.business.products.push(product);
                self._save();
                return product;
            },
            
            updateProduct(id, updates) {
                const idx = self._data.business.products.findIndex(p => p.id === id);
                if (idx === -1) return false;
                self._data.business.products[idx] = { ...self._data.business.products[idx], ...updates, updatedAt: Date.now() };
                self._save();
                return true;
            },
            
            removeProduct(id) {
                const idx = self._data.business.products.findIndex(p => p.id === id);
                if (idx === -1) return false;
                self._data.business.products.splice(idx, 1);
                self._save();
                return true;
            },
            
            recordSale(productId, amount, currency) {
                self._data.business.stats = self._data.business.stats || { totalSales: 0, totalRevenue: {} };
                self._data.business.stats.totalSales++;
                self._data.business.stats.totalRevenue[currency] = (self._data.business.stats.totalRevenue[currency] || 0) + amount;
                self._save();
            }
        };
    },
    
    hasBusiness() {
        return this._data?.business !== null;
    },
    
    createBusiness(name, type, emoji = '🏪') {
        if (this.hasBusiness()) return null; // Already has one
        
        this._data.business = {
            name,
            type,
            emoji,
            ownerId: this.id,
            products: [],
            orders: [],
            status: 'active',
            stats: { totalSales: 0, totalRevenue: {} },
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        this._save();
        this._dispatch('nw-business-created', this._data.business);
        return this.business;
    },
    
    // ===== DAILY REWARDS =====
    get daily() {
        const self = this;
        return {
            get streak() { return self._data.daily.streak; },
            get lastClaim() { return self._data.daily.lastClaim; },
            get totalClaims() { return self._data.daily.totalClaims; },
            
            canClaim() {
                const last = self._data.daily.lastClaim;
                if (!last) return true;
                
                const lastDate = new Date(last).setHours(0, 0, 0, 0);
                const today = new Date().setHours(0, 0, 0, 0);
                
                return today > lastDate;
            },
            
            claim() {
                if (!this.canClaim()) return null;
                
                const last = self._data.daily.lastClaim;
                const lastDate = last ? new Date(last).setHours(0, 0, 0, 0) : 0;
                const yesterday = new Date().setHours(0, 0, 0, 0) - 86400000;
                
                // Check if streak continues or resets
                if (lastDate === yesterday) {
                    self._data.daily.streak++;
                } else if (lastDate < yesterday) {
                    self._data.daily.streak = 1; // Reset
                }
                
                self._data.daily.lastClaim = Date.now();
                self._data.daily.totalClaims++;
                self._save();
                
                // Calculate reward based on streak
                const reward = this.calculateReward();
                
                self._dispatch('nw-daily-claimed', { streak: self._data.daily.streak, reward });
                
                return reward;
            },
            
            calculateReward() {
                const streak = self._data.daily.streak;
                return {
                    diamond: 5 + Math.min(streak, 7) * 2,  // 5-19 diamonds based on streak
                    gold: 10 + Math.min(streak, 7) * 5,    // 10-45 gold
                    streak
                };
            }
        };
    },
    
    // ===== TRANSFER SYSTEM =====
    generateTransferCode() {
        if (!this._data) return null;
        
        const transferData = {
            data: { ...this._data },
            transferId: 'NW2-' + this._generateShortId(),
            createdAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            sourceDevice: navigator.userAgent.substring(0, 50),
            version: this.VERSION
        };
        
        // Calculate checksum
        const checkData = JSON.stringify(transferData.data);
        transferData.checksum = this._simpleHash(checkData);
        
        // Encode
        const encoded = 'NWU2:' + btoa(unescape(encodeURIComponent(JSON.stringify(transferData))));
        
        this._dispatch('nw-transfer-generated', { transferId: transferData.transferId });
        
        return {
            code: encoded,
            transferId: transferData.transferId,
            expiresAt: new Date(transferData.expiresAt).toISOString(),
            userId: this.id,
            stats: {
                currencies: this._data.wallet.currencies,
                cards: this._data.collection.cards.length,
                achievements: this._data.achievements.unlocked.length,
                hasBusiness: !!this._data.business
            }
        };
    },
    
    async importFromTransferCode(code) {
        try {
            // Validate format
            if (!code.startsWith('NWU2:')) {
                // Try legacy format
                if (code.startsWith('NWTX2:')) {
                    return this._importLegacyTransfer(code);
                }
                return { success: false, error: 'Invalid transfer code format' };
            }
            
            // Decode
            const encoded = code.substring(5);
            const transferData = JSON.parse(decodeURIComponent(escape(atob(encoded))));
            
            // Check expiry
            if (Date.now() > transferData.expiresAt) {
                return { success: false, error: 'Transfer code expired. Generate a new one.' };
            }
            
            // Verify checksum
            const checkData = JSON.stringify(transferData.data);
            if (transferData.checksum !== this._simpleHash(checkData)) {
                return { success: false, error: 'Transfer code corrupted or tampered' };
            }
            
            // Backup current data
            if (this._data) {
                localStorage.setItem(this.KEYS.USER + '_backup_' + Date.now(), JSON.stringify(this._data));
            }
            
            // Import
            const oldId = this.id;
            this._data = transferData.data;
            this._data.lastActivity = Date.now();
            this._data.security.transferHistory.push({
                transferId: transferData.transferId,
                fromDevice: transferData.sourceDevice,
                toDevice: navigator.userAgent.substring(0, 50),
                transferredAt: Date.now()
            });
            
            this.id = this._data.id;
            
            // Update device UUID
            localStorage.setItem(this.KEYS.DEVICE, this.id);
            
            // Save
            this._save();
            
            // Sync with legacy systems for backwards compatibility
            this._syncToLegacySystems();
            
            this._dispatch('nw-account-transferred', { 
                transferId: transferData.transferId,
                fromId: oldId,
                toId: this.id
            });
            
            console.log('%c✅ ACCOUNT TRANSFERRED SUCCESSFULLY!', 'color: #00ff00; font-size: 16px;');
            console.log('%c   Your ID: ' + this.id, 'color: #00ffff;');
            
            return {
                success: true,
                userId: this.id,
                stats: {
                    currencies: this._data.wallet.currencies,
                    cards: this._data.collection.cards.length,
                    achievements: this._data.achievements.unlocked.length
                }
            };
            
        } catch (e) {
            console.error('[NW_USER] Transfer import failed:', e);
            return { success: false, error: 'Failed to import: ' + e.message };
        }
    },
    
    async _importLegacyTransfer(code) {
        // Handle old NWTX2 format from NW_WALLET
        if (typeof NW_WALLET !== 'undefined') {
            const result = await NW_WALLET.importFromTransferCode(code);
            if (result.success) {
                // Re-init to pick up migrated data
                this.initialized = false;
                this._data = null;
                await this.init();
            }
            return result;
        }
        return { success: false, error: 'Legacy transfer not supported' };
    },
    
    // ===== GM MODE =====
    activateGM(code) {
        if (code !== 'numbahwan-gm-2026') return false;
        localStorage.setItem(this.KEYS.GM, 'true');
        this.isGM = true;
        
        // Sync with legacy wallet
        if (typeof NW_WALLET !== 'undefined') {
            NW_WALLET.isGM = true;
        }
        
        this._dispatch('nw-gm-activated');
        console.log('%c🎮 GM MODE ACTIVATED', 'background: linear-gradient(90deg, #ffd700, #ff6b00); color: #000; font-size: 20px; font-weight: bold; padding: 10px 20px; border-radius: 5px;');
        console.log('%c   All currencies are now INFINITE (999,999)', 'color: #ffd700;');
        return true;
    },
    
    deactivateGM() {
        localStorage.removeItem(this.KEYS.GM);
        this.isGM = false;
        
        if (typeof NW_WALLET !== 'undefined') {
            NW_WALLET.isGM = false;
        }
        
        this._dispatch('nw-gm-deactivated');
        console.log('[NW_USER] GM Mode deactivated');
    },
    
    // ===== PUBLIC PROFILE (What others see) =====
    getPublicProfile() {
        const v = this._data.profile.visibility;
        
        return {
            id: this.id,
            displayName: this._data.profile.displayName,
            avatar: this._data.profile.avatar,
            title: this._data.profile.title,
            bio: this._data.profile.bio,
            citizenshipTier: this._data.identity.citizenshipTier,
            joinedAt: this._data.identity.joinedAt,
            
            // Conditional based on visibility
            collection: v.showCollection ? {
                count: this._data.collection.cards.length,
                uniqueCount: new Set(this._data.collection.cards.map(c => c.id)).size
            } : null,
            
            stats: v.showStats ? {
                gamesPlayed: this._data.wallet.stats.gamesPlayed,
                gamesWon: this._data.wallet.stats.gamesWon,
                pullsMade: this._data.collection.pullStats.totalPulls
            } : null,
            
            achievements: v.showAchievements ? {
                count: this._data.achievements.unlocked.length,
                points: this._data.achievements.points
            } : null,
            
            balance: v.showBalance ? this._data.wallet.currencies : null,
            
            business: v.showBusiness && this._data.business ? {
                name: this._data.business.name,
                type: this._data.business.type,
                emoji: this._data.business.emoji
            } : null
        };
    },
    
    // ===== UTILITY METHODS =====
    _save() {
        this._data.lastActivity = Date.now();
        this._data.security.checksum = this._simpleHash(JSON.stringify({
            id: this._data.id,
            currencies: this._data.wallet.currencies,
            cards: this._data.collection.cards.length
        }));
        
        localStorage.setItem(this.KEYS.USER, JSON.stringify(this._data));
        localStorage.setItem(this.KEYS.DEVICE, this.id);
    },
    
    _loadLocal(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch { return null; }
    },
    
    _dispatch(event, detail = {}) {
        window.dispatchEvent(new CustomEvent(event, { detail }));
    },
    
    async _generateId() {
        const ts = Date.now().toString(36);
        const rand = Math.random().toString(36).substring(2, 8);
        const hash = await this._sha256(`${ts}${rand}${navigator.userAgent}`);
        return `NW-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`.toUpperCase();
    },
    
    _generateShortId() {
        return Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    },
    
    async _sha256(str) {
        const buf = new TextEncoder().encode(str);
        const hash = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    },
    
    // Sync with legacy NW_WALLET for backwards compatibility
    _syncWithLegacyWallet() {
        if (typeof NW_WALLET !== 'undefined' && NW_WALLET.wallet) {
            // Copy from legacy if our data is newer
            const legacyActivity = NW_WALLET.wallet.lastActivity || 0;
            const ourActivity = this._data.lastActivity || 0;
            
            if (legacyActivity > ourActivity) {
                // Legacy is newer, copy from it
                this._data.wallet.currencies = { ...NW_WALLET.wallet.currencies };
                this._save();
            }
            
            // Set up sync
            NW_WALLET.isGM = this.isGM;
        }
    },
    
    _syncToLegacySystems() {
        // Sync to NW_WALLET format for backwards compatibility
        const legacyWallet = {
            guestId: this.id,
            walletId: this.id,
            currencies: this._data.wallet.currencies,
            stats: this._data.wallet.stats,
            collection: this._data.collection.cards.map(c => c.id),
            forge: {
                pityCounter: this._data.collection.pity.counter,
                totalPulls: this._data.collection.pullStats.totalPulls
            },
            createdAt: this._data.createdAt,
            lastActivity: Date.now(),
            version: 2
        };
        localStorage.setItem(this.KEYS.LEGACY_WALLET, JSON.stringify(legacyWallet));
        
        // Sync to NW_CITIZEN format
        const legacyCitizen = {
            id: this.id,
            name: this._data.profile.displayName,
            avatar: this._data.profile.avatar,
            trustScore: this._data.identity.trustScore,
            clearance: this._data.identity.clearanceLevel,
            joinedAt: this._data.identity.joinedAt
        };
        localStorage.setItem(this.KEYS.LEGACY_CITIZEN, JSON.stringify(legacyCitizen));
        
        // Sync business if exists
        if (this._data.business) {
            localStorage.setItem(`nw_business_${this.id}`, JSON.stringify(this._data.business));
        }
    },
    
    // ===== DEBUG =====
    debug() {
        console.log('=== NW_USER v2.0 DEBUG ===');
        console.log('ID:', this.id);
        console.log('GM Mode:', this.isGM);
        console.log('Profile:', this._data.profile);
        console.log('Identity:', this._data.identity);
        console.log('Wallet:', this._data.wallet.currencies);
        console.log('Collection:', this._data.collection.cards.length, 'cards');
        console.log('Achievements:', this._data.achievements.unlocked.length, 'unlocked');
        console.log('Business:', this._data.business ? this._data.business.name : 'None');
        console.log('Daily Streak:', this._data.daily.streak);
        console.log('========================');
        return this._data;
    },
    
    // Export for API/display
    toJSON() {
        return {
            id: this.id,
            version: this.VERSION,
            isGM: this.isGM,
            profile: this._data.profile,
            identity: {
                tier: this._data.identity.citizenshipTier,
                trustScore: this._data.identity.trustScore
            },
            wallet: {
                currencies: this.isGM ? { diamond: 999999, gold: 999999, iron: 999999, stone: 999999, wood: 999999 } : this._data.wallet.currencies
            },
            collection: {
                count: this._data.collection.cards.length,
                uniqueCount: new Set(this._data.collection.cards.map(c => c.id)).size,
                pullStats: this._data.collection.pullStats
            },
            achievements: {
                count: this._data.achievements.unlocked.length,
                points: this._data.achievements.points
            },
            business: this._data.business ? { name: this._data.business.name } : null,
            daily: this._data.daily
        };
    }
};

// Auto-expose globally
window.NW_USER = NW_USER;

// Auto-init on DOM ready (optional - pages can also call NW_USER.init() manually)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NW_USER.init());
} else {
    NW_USER.init();
}

console.log('[NW_USER] v2.0 Module loaded');
