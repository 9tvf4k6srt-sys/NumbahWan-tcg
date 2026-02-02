/* NW_USER - Unified Identity System v1.0
   Wraps: Citizen + Wallet + Business
   Usage: await NW_USER.init() then access NW_USER.wallet, NW_USER.business etc.
*/

const NW_USER = {
    // State
    id: null,
    initialized: false,
    isGM: false,
    
    // Sub-systems (lazy loaded)
    _wallet: null,
    _business: null,
    _citizen: null,
    
    // Storage keys
    KEYS: {
        DEVICE: 'nw_device_uuid',
        WALLET: 'nw_wallet_v2',
        CITIZEN: 'nw_citizen',
        GM: 'nw_gm_mode'
    },
    
    // ===== INIT =====
    async init() {
        if (this.initialized) return this;
        
        // 1. Get or create identity
        this.id = await this._resolveIdentity();
        
        // 2. Load wallet (use existing NW_WALLET if available)
        if (typeof NW_WALLET !== 'undefined') {
            await NW_WALLET.init();
            this._wallet = NW_WALLET.wallet;
            this.isGM = NW_WALLET.isGM;
        } else {
            this._wallet = this._loadLocal(this.KEYS.WALLET) || this._createDefaultWallet();
        }
        
        // 3. Load citizen profile
        this._citizen = this._loadLocal(this.KEYS.CITIZEN) || this._createDefaultCitizen();
        
        // 4. Load business (if exists)
        this._business = this._loadLocal(`nw_business_${this.id}`) || null;
        
        this.initialized = true;
        console.log('[NW_USER] Initialized:', this.id);
        
        return this;
    },
    
    // ===== IDENTITY =====
    async _resolveIdentity() {
        // Priority: device_uuid > wallet.guestId > generate new
        let id = localStorage.getItem(this.KEYS.DEVICE);
        
        if (!id) {
            const wallet = this._loadLocal(this.KEYS.WALLET);
            id = wallet?.guestId;
        }
        
        if (!id) {
            id = await this._generateId();
            localStorage.setItem(this.KEYS.DEVICE, id);
        }
        
        return id;
    },
    
    async _generateId() {
        // Simple but unique: timestamp + random
        const ts = Date.now().toString(36);
        const rand = Math.random().toString(36).substring(2, 8);
        const hash = await this._quickHash(`${ts}${rand}${navigator.userAgent}`);
        return `NW-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`.toUpperCase();
    },
    
    async _quickHash(str) {
        const buf = new TextEncoder().encode(str);
        const hash = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    // ===== WALLET ACCESS =====
    get wallet() {
        return {
            // Balances
            diamond: this._getCurrency('diamond'),
            gold: this._getCurrency('gold'),
            iron: this._getCurrency('iron'),
            stone: this._getCurrency('stone'),
            wood: this._getCurrency('wood'),
            
            // Methods
            get: (c) => this._getCurrency(c),
            spend: (c, amt, reason) => this._spendCurrency(c, amt, reason),
            earn: (c, amt, reason) => this._earnCurrency(c, amt, reason),
            
            // Stats
            stats: this._wallet?.stats || {}
        };
    },
    
    _getCurrency(type) {
        if (this.isGM) return 999999;
        return this._wallet?.currencies?.[type] || 0;
    },
    
    _spendCurrency(type, amount, reason = 'PURCHASE') {
        if (this.isGM) return true;
        
        const current = this._getCurrency(type);
        if (current < amount) return false;
        
        this._wallet.currencies[type] -= amount;
        this._wallet.stats.totalSpent[type] = (this._wallet.stats.totalSpent[type] || 0) + amount;
        this._saveWallet();
        
        this._dispatch('nw-currency-change', { type, amount: -amount, reason, balance: this._wallet.currencies[type] });
        return true;
    },
    
    _earnCurrency(type, amount, reason = 'REWARD') {
        this._wallet.currencies[type] = (this._wallet.currencies[type] || 0) + amount;
        this._wallet.stats.totalEarned[type] = (this._wallet.stats.totalEarned[type] || 0) + amount;
        this._saveWallet();
        
        this._dispatch('nw-currency-change', { type, amount, reason, balance: this._wallet.currencies[type] });
        return true;
    },
    
    _saveWallet() {
        this._wallet.lastActivity = Date.now();
        localStorage.setItem(this.KEYS.WALLET, JSON.stringify(this._wallet));
        
        // Sync with NW_WALLET if available
        if (typeof NW_WALLET !== 'undefined') {
            NW_WALLET.wallet = this._wallet;
            NW_WALLET.saveWallet();
        }
    },
    
    // ===== CITIZEN ACCESS =====
    get citizen() {
        return {
            id: this.id,
            name: this._citizen?.name || 'Guest',
            avatar: this._citizen?.avatar || null,
            trustScore: this._citizen?.trustScore || 50,
            clearance: this._citizen?.clearance || 1,
            joinedAt: this._citizen?.joinedAt || Date.now(),
            
            setName: (n) => this._setCitizenProp('name', n),
            setAvatar: (a) => this._setCitizenProp('avatar', a)
        };
    },
    
    _setCitizenProp(key, value) {
        this._citizen[key] = value;
        this._citizen.updatedAt = Date.now();
        localStorage.setItem(this.KEYS.CITIZEN, JSON.stringify(this._citizen));
        this._dispatch('nw-citizen-update', { key, value });
    },
    
    // ===== BUSINESS ACCESS =====
    get business() {
        if (!this._business) return null;
        
        return {
            name: this._business.name,
            type: this._business.type,
            emoji: this._business.emoji,
            products: this._business.products || [],
            orders: this._business.orders || [],
            status: this._business.status || 'active',
            
            save: () => this._saveBusiness(),
            addProduct: (p) => this._addProduct(p),
            updateProduct: (id, data) => this._updateProduct(id, data)
        };
    },
    
    hasBusiness() {
        return this._business !== null;
    },
    
    createBusiness(name, type, emoji = '🏪') {
        this._business = {
            name,
            type,
            emoji,
            ownerId: this.id,
            products: [],
            orders: [],
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this._saveBusiness();
        this._dispatch('nw-business-created', this._business);
        return this.business;
    },
    
    _saveBusiness() {
        if (!this._business) return;
        this._business.updatedAt = Date.now();
        localStorage.setItem(`nw_business_${this.id}`, JSON.stringify(this._business));
    },
    
    _addProduct(product) {
        if (!this._business) return null;
        product.id = `p-${Date.now()}`;
        product.createdAt = Date.now();
        this._business.products.push(product);
        this._saveBusiness();
        return product;
    },
    
    _updateProduct(id, data) {
        if (!this._business) return false;
        const idx = this._business.products.findIndex(p => p.id === id);
        if (idx === -1) return false;
        this._business.products[idx] = { ...this._business.products[idx], ...data, updatedAt: Date.now() };
        this._saveBusiness();
        return true;
    },
    
    // ===== COLLECTION (Cards) =====
    get collection() {
        return this._wallet?.collection || [];
    },
    
    addCard(cardId) {
        if (!this._wallet.collection) this._wallet.collection = [];
        this._wallet.collection.push({ id: cardId, obtainedAt: Date.now() });
        this._saveWallet();
        this._dispatch('nw-card-obtained', { cardId });
    },
    
    hasCard(cardId) {
        return this.collection.some(c => c.id === cardId);
    },
    
    getCardCount(cardId) {
        return this.collection.filter(c => c.id === cardId).length;
    },
    
    // ===== GM MODE =====
    activateGM(code) {
        if (code !== 'numbahwan-gm-2026') return false;
        localStorage.setItem(this.KEYS.GM, 'true');
        this.isGM = true;
        if (typeof NW_WALLET !== 'undefined') NW_WALLET.isGM = true;
        this._dispatch('nw-gm-activated');
        console.log('%c[NW_USER] GM MODE ACTIVE', 'background:#ffd700;color:#000;font-size:16px;font-weight:bold;padding:5px;');
        return true;
    },
    
    deactivateGM() {
        localStorage.removeItem(this.KEYS.GM);
        this.isGM = false;
        if (typeof NW_WALLET !== 'undefined') NW_WALLET.isGM = false;
        this._dispatch('nw-gm-deactivated');
    },
    
    // ===== HELPERS =====
    _loadLocal(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch { return null; }
    },
    
    _dispatch(event, detail = {}) {
        window.dispatchEvent(new CustomEvent(event, { detail }));
    },
    
    _createDefaultWallet() {
        return {
            guestId: this.id,
            currencies: { diamond: 50, gold: 25, iron: 10, stone: 5, wood: 0 },
            stats: {
                totalEarned: { diamond: 50, gold: 25, iron: 10, stone: 5, wood: 0 },
                totalSpent: { diamond: 0, gold: 0, iron: 0, stone: 0, wood: 0 }
            },
            collection: [],
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
    },
    
    _createDefaultCitizen() {
        return {
            id: this.id,
            name: 'Guest',
            avatar: null,
            trustScore: 50,
            clearance: 1,
            joinedAt: Date.now(),
            updatedAt: Date.now()
        };
    },
    
    // ===== EXPORT/DEBUG =====
    toJSON() {
        return {
            id: this.id,
            isGM: this.isGM,
            citizen: this._citizen,
            wallet: { currencies: this._wallet?.currencies, stats: this._wallet?.stats },
            business: this._business ? { name: this._business.name, products: this._business.products.length } : null,
            collection: this.collection.length
        };
    },
    
    debug() {
        console.table(this.toJSON());
    }
};

// Auto-expose globally
window.NW_USER = NW_USER;
