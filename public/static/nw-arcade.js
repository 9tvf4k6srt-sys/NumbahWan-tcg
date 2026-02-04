/* NW_ARCADE - Mini-Games Engine v1.0
   Handles: Game registration, scoring, rewards, leaderboards
*/

const NW_ARCADE = {
    // Registered games
    games: {},
    
    // Current session
    session: null,
    
    // Reward config - 3-Tier Currency (HARD RULE #7: nwg, gold, wood only)
    REWARDS: {
        win: { nwg: 5, gold: 20 },
        lose: { gold: 5 },
        highScore: { nwg: 10, gold: 50 },
        perfect: { nwg: 25, gold: 100 }
    },
    
    // Leaderboard
    leaderboards: {},
    
    // ===== GAME REGISTRATION =====
    registerGame(id, config) {
        this.games[id] = {
            id,
            name: config.name || id,
            description: config.description || '',
            cost: config.cost || { nwg: 5 },
            maxScore: config.maxScore || 100,
            rewardMultiplier: config.rewardMultiplier || 1,
            onStart: config.onStart || (() => {}),
            onEnd: config.onEnd || (() => {}),
            ...config
        };
        console.log(`[NW_ARCADE] Registered: ${id}`);
    },
    
    // ===== SESSION MANAGEMENT =====
    async startGame(gameId) {
        const game = this.games[gameId];
        if (!game) return { success: false, error: 'Game not found' };
        
        // Check/spend cost
        if (typeof NW_USER !== 'undefined') {
            for (const [currency, amount] of Object.entries(game.cost)) {
                if (!NW_USER.wallet.spend(currency, amount, `ARCADE_${gameId}`)) {
                    return { success: false, error: `Not enough ${currency}` };
                }
            }
        }
        
        this.session = {
            gameId,
            startTime: Date.now(),
            score: 0,
            moves: 0,
            state: 'playing'
        };
        
        game.onStart(this.session);
        this._emit('gameStart', { gameId, session: this.session });
        
        return { success: true, session: this.session };
    },
    
    updateScore(points) {
        if (!this.session || this.session.state !== 'playing') return;
        this.session.score += points;
        this.session.moves++;
        this._emit('scoreUpdate', { score: this.session.score });
    },
    
    setScore(score) {
        if (!this.session || this.session.state !== 'playing') return;
        this.session.score = score;
        this._emit('scoreUpdate', { score: this.session.score });
    },
    
    async endGame(won = false) {
        if (!this.session) return { success: false };
        
        const game = this.games[this.session.gameId];
        this.session.state = 'ended';
        this.session.endTime = Date.now();
        this.session.duration = this.session.endTime - this.session.startTime;
        this.session.won = won;
        
        // Calculate rewards
        const rewards = this._calculateRewards(won, game);
        this.session.rewards = rewards;
        
        // Award rewards
        if (typeof NW_USER !== 'undefined') {
            for (const [currency, amount] of Object.entries(rewards)) {
                NW_USER.wallet.earn(currency, amount, `ARCADE_WIN_${this.session.gameId}`);
            }
        }
        
        // Update leaderboard
        this._updateLeaderboard(this.session.gameId, this.session.score);
        
        // Callback
        game.onEnd(this.session);
        this._emit('gameEnd', { session: this.session, rewards });
        
        const result = { ...this.session };
        this.session = null;
        
        return { success: true, result };
    },
    
    _calculateRewards(won, game) {
        const base = won ? { ...this.REWARDS.win } : { ...this.REWARDS.lose };
        const multiplier = game.rewardMultiplier || 1;
        
        // Apply multiplier
        for (const key in base) {
            base[key] = Math.floor(base[key] * multiplier);
        }
        
        // Check for high score bonus
        const leaderboard = this.leaderboards[game.id] || [];
        if (leaderboard.length === 0 || this.session.score > leaderboard[0].score) {
            // New high score!
            for (const [k, v] of Object.entries(this.REWARDS.highScore)) {
                base[k] = (base[k] || 0) + v;
            }
        }
        
        // Perfect score bonus
        if (this.session.score >= game.maxScore) {
            for (const [k, v] of Object.entries(this.REWARDS.perfect)) {
                base[k] = (base[k] || 0) + v;
            }
        }
        
        return base;
    },
    
    // ===== LEADERBOARD =====
    _updateLeaderboard(gameId, score) {
        if (!this.leaderboards[gameId]) this.leaderboards[gameId] = [];
        
        const userId = typeof NW_USER !== 'undefined' ? NW_USER.id : 'guest';
        const entry = {
            score,
            playerId: userId,
            time: Date.now()
        };
        
        this.leaderboards[gameId].push(entry);
        this.leaderboards[gameId].sort((a, b) => b.score - a.score);
        this.leaderboards[gameId] = this.leaderboards[gameId].slice(0, 100);
        
        // Save
        this._saveLeaderboards();
    },
    
    getLeaderboard(gameId, limit = 10) {
        return (this.leaderboards[gameId] || []).slice(0, limit);
    },
    
    getHighScore(gameId) {
        const lb = this.leaderboards[gameId];
        return lb && lb.length > 0 ? lb[0].score : 0;
    },
    
    // ===== PERSISTENCE =====
    _saveLeaderboards() {
        try {
            localStorage.setItem('nw_arcade_leaderboards', JSON.stringify(this.leaderboards));
        } catch (e) {}
    },
    
    _loadLeaderboards() {
        try {
            const saved = localStorage.getItem('nw_arcade_leaderboards');
            if (saved) this.leaderboards = JSON.parse(saved);
        } catch (e) {}
    },
    
    // ===== EVENTS =====
    _callbacks: {},
    
    on(event, callback) {
        if (!this._callbacks[event]) this._callbacks[event] = [];
        this._callbacks[event].push(callback);
    },
    
    _emit(event, data) {
        (this._callbacks[event] || []).forEach(cb => cb(data));
    },
    
    // ===== INIT =====
    init() {
        this._loadLeaderboards();
        console.log('[NW_ARCADE] Initialized');
        return this;
    }
};

// Auto-init
NW_ARCADE.init();
window.NW_ARCADE = NW_ARCADE;
