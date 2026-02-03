// ═══════════════════════════════════════════════════════════════════════════════
// NUMBAHWAN TCG - UNIFIED BATTLE ARENA v3.0
// Applying Zeigarnik Effect, Information Gap Theory & Variable Reward Psychology
// Card Value = Collectibility + Story + Rarity (NOT Stats)
// ═══════════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // PSYCHOLOGICAL FRAMEWORK (from curiosity_gap_analysis.pdf)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const PSYCHOLOGY = {
        // Zeigarnik Effect: Incomplete tasks create cognitive tension
        // Application: Progress bars, streaks, collections at 87% complete
        ZEIGARNIK_OPTIMAL_COMPLETION: 0.87, // Show "almost done" at 87%
        
        // Loss Aversion: Pain of losing is 2x pleasure of gaining
        LOSS_AVERSION_MULTIPLIER: 2,
        
        // Variable Ratio Reinforcement: Unpredictable rewards = highest engagement
        // Near-Miss Effect: Almost winning triggers same reward pathways as winning
        NEAR_MISS_FREQUENCY: 0.35, // 35% of losses should feel like "almost won"
        
        // Information Gap: Curiosity peaks when gap is manageable
        // Too small = boring, Too large = overwhelming
        OPTIMAL_MYSTERY_REVEAL: 0.6, // Reveal 60% upfront, tease 40%
        
        // Day 16+ users respond best to limited-time events
        LATE_GAME_DAY_THRESHOLD: 16,
        
        // Pity System: Guarantee rewards after X attempts (prevents frustration)
        SOFT_PITY_THRESHOLD: 50,  // Increased rates start
        HARD_PITY_THRESHOLD: 80,  // Guaranteed reward
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // CARD VALUE PHILOSOPHY - COLLECTIBILITY OVER STATS
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Cards are valuable because:
    // 1. STORY - Each card tells part of NumbahWan lore
    // 2. RARITY - Limited print runs create scarcity
    // 3. ART - Beautiful collectible artwork
    // 4. MEMORY - Captures guild moments/inside jokes
    // 5. NWG VALUE - Each card has locked NWG (real crypto value)
    // 6. COMMUNITY - Trading creates social bonds
    
    // Stats exist but DON'T determine battle outcomes
    // Battle outcomes are based on LUCK + COLLECTION COMPLETION + STREAKS
    
    const CARD_VALUE_SYSTEM = {
        // What makes a card valuable (NOT stats)
        valueFactors: {
            rarity: 0.25,        // 25% - How rare is it?
            lore: 0.20,          // 20% - Story significance
            art: 0.15,           // 15% - Art quality/uniqueness
            memory: 0.15,        // 15% - Guild moment captured
            nwgLocked: 0.15,     // 15% - Crypto value locked
            tradability: 0.10,   // 10% - Market demand
        },
        
        // Rarity tiers (affects NWG value, not battle power)
        rarityTiers: {
            common:    { nwg: 100,    pullRate: 0.4099, printRun: 10000, color: '#9ca3af' },
            uncommon:  { nwg: 250,    pullRate: 0.30,   printRun: 5000,  color: '#22c55e' },
            rare:      { nwg: 500,    pullRate: 0.20,   printRun: 1000,  color: '#3b82f6' },
            epic:      { nwg: 2000,   pullRate: 0.08,   printRun: 250,   color: '#a855f7' },
            legendary: { nwg: 10000,  pullRate: 0.01,   printRun: 50,    color: '#f59e0b' },
            mythic:    { nwg: 50000,  pullRate: 0.0001, printRun: 10,    color: '#ef4444' },
        },
        
        // Collection bonuses (replaces stat-based power)
        collectionBonuses: {
            setComplete: 1.5,      // 50% luck boost for completing a set
            rarityComplete: 1.25, // 25% boost for all of one rarity
            loreComplete: 1.75,   // 75% boost for completing a storyline
            foilVersion: 1.1,     // 10% boost for foil/holographic
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // UNIFIED BATTLE SYSTEM - LUCK-BASED WITH COLLECTION MULTIPLIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    const BATTLE_CONFIG = {
        // Battle modes
        modes: {
            quick: { duration: 3000, cardCount: 3, minBet: 10, maxBet: 1000 },
            standard: { duration: 10000, cardCount: 5, minBet: 100, maxBet: 5000 },
            epic: { duration: 20000, cardCount: 7, minBet: 500, maxBet: 25000 },
            boss: { duration: 30000, cardCount: 10, minBet: 1000, maxBet: 100000 },
        },
        
        // Difficulty payouts (uses loss aversion - risk/reward balance)
        difficulties: {
            easy:   { winChance: 0.70, payout: 1.3, aiLevel: 1 },
            medium: { winChance: 0.50, payout: 2.0, aiLevel: 2 },
            hard:   { winChance: 0.30, payout: 3.5, aiLevel: 3 },
            boss:   { winChance: 0.15, payout: 8.0, aiLevel: 4 },
        },
        
        // Streak system (Zeigarnik Effect - don't break your streak!)
        streaks: {
            bonusPerWin: 0.05,    // +5% per consecutive win
            maxBonus: 0.50,       // Cap at +50% bonus
            streakLossMessage: "💔 Streak lost! You were so close to {next}...",
        },
        
        // Near-miss messages (triggers retry behavior)
        nearMissMessages: [
            "😱 SO CLOSE! Just 2% away from victory!",
            "🔥 Almost had it! Your luck is building...",
            "⚡ Near miss! Next one's yours!",
            "💫 The cards almost aligned! Try again?",
            "🎯 Hair's breadth away! Fortune favors the persistent!",
        ],
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // OPEN LOOPS & CLIFFHANGERS (Information Gap Theory)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const OPEN_LOOPS = {
        // Tease upcoming content (creates cognitive itch)
        teasers: [
            { id: 'mystery_card', text: '??? Card unlocks after 5 more wins...', progress: 0 },
            { id: 'secret_lore', text: 'RegginA\'s secret revealed at 50 battles...', progress: 0 },
            { id: 'boss_unlock', text: 'Zakum Boss Battle: Defeat 10 hard opponents...', progress: 0 },
            { id: 'collection_mystery', text: '3 hidden cards exist. 0/3 discovered...', progress: 0 },
        ],
        
        // Cliffhanger messages after battles
        cliffhangers: [
            "What happens when you collect ALL mythics? Only 3 players have found out...",
            "Did you know RegginA has a secret final form card? No one's pulled it yet...",
            "Rumor: A legendary card drops at exactly midnight. Coincidence?",
            "The next update contains something NOBODY expects. Check back tomorrow...",
            "Your luck score is rising. Something good is about to happen...",
        ],
        
        // Collection gaps (shows what's missing)
        collectionGapMessages: [
            "You're 3 cards away from completing the Origins set!",
            "Only 1 mythic card left to find. Who could it be?",
            "87% of the S2 collection complete. Almost there...",
        ],
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // PITY SYSTEM (Prevents Frustration, Guarantees Rewards)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const PITY_SYSTEM = {
        // Track pulls since last good reward
        pullsSinceRare: 0,
        pullsSinceEpic: 0,
        pullsSinceLegendary: 0,
        
        // Pity thresholds
        thresholds: {
            rare: { soft: 8, hard: 12 },
            epic: { soft: 25, hard: 40 },
            legendary: { soft: 50, hard: 80 },
            mythic: { soft: 150, hard: 200 },
        },
        
        // Calculate boosted rates based on pity
        calculatePityBoost: function(rarity, pullCount) {
            const threshold = this.thresholds[rarity];
            if (!threshold) return 1;
            
            if (pullCount >= threshold.hard) return 100; // Guaranteed
            if (pullCount >= threshold.soft) {
                // Linear increase from soft to hard pity
                const progress = (pullCount - threshold.soft) / (threshold.hard - threshold.soft);
                return 1 + (progress * 10); // Up to 10x boost
            }
            return 1;
        },
        
        // Get pity message (creates anticipation)
        getMessage: function(pullCount) {
            const legendary = this.thresholds.legendary;
            if (pullCount >= legendary.soft) {
                const remaining = legendary.hard - pullCount;
                if (remaining <= 5) return `🔥 LEGENDARY GUARANTEED IN ${remaining} PULLS!`;
                if (remaining <= 15) return `⚡ Pity building... ${remaining} pulls to legendary!`;
                return `✨ Luck increasing... ${remaining} to guaranteed legendary`;
            }
            return null;
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // GAME STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    let gameState = {
        // Player stats
        wallet: null,
        nwgBalance: 0,
        streak: 0,
        totalBattles: 0,
        totalWins: 0,
        
        // Current battle
        mode: 'quick',
        difficulty: 'medium',
        betAmount: 100,
        selectedCards: [],
        
        // Battle phases
        phase: 'setup', // setup -> betting -> battle -> result -> reward
        
        // Psychology tracking
        daysSinceStart: 0,
        lossStreak: 0,
        pityCounter: 0,
        
        // Open loops
        activeLoops: [],
        discoveredSecrets: 0,
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // LUCK CALCULATION (Replaces Stat-Based Combat)
    // ═══════════════════════════════════════════════════════════════════════════
    
    function calculateLuck(playerCards, bonuses = {}) {
        let baseLuck = 50; // 50% base
        
        // Collection bonuses (the real power!)
        if (bonuses.setComplete) baseLuck += 15;
        if (bonuses.rarityComplete) baseLuck += 10;
        if (bonuses.loreComplete) baseLuck += 20;
        
        // Card rarity contributes small luck boost (not stats!)
        const rarityLuck = {
            common: 1, uncommon: 2, rare: 3, epic: 5, legendary: 8, mythic: 15
        };
        
        let cardLuck = 0;
        playerCards.forEach(card => {
            cardLuck += rarityLuck[card.rarity] || 1;
            if (card.foil) cardLuck += 2;
            if (card.staked) cardLuck += 3; // Staked cards give luck!
        });
        
        baseLuck += Math.min(cardLuck, 25); // Cap card luck bonus at 25%
        
        // Streak bonus
        const streakBonus = Math.min(gameState.streak * 5, 25);
        baseLuck += streakBonus;
        
        // Pity boost (if on a loss streak)
        if (gameState.lossStreak >= 3) {
            baseLuck += Math.min(gameState.lossStreak * 3, 15);
        }
        
        return Math.min(baseLuck, 85); // Cap at 85% - always some risk!
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BATTLE RESOLUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function resolveBattle() {
        const difficulty = BATTLE_CONFIG.difficulties[gameState.difficulty];
        const playerLuck = calculateLuck(gameState.selectedCards);
        const adjustedWinChance = (playerLuck / 100) * (difficulty.winChance * 2);
        
        const roll = Math.random();
        const won = roll < adjustedWinChance;
        
        // Calculate if it was a near-miss
        const isNearMiss = !won && roll < (adjustedWinChance + 0.05);
        
        return {
            won,
            isNearMiss,
            playerLuck,
            roll: Math.floor(roll * 100),
            threshold: Math.floor(adjustedWinChance * 100),
            payout: won ? Math.floor(gameState.betAmount * difficulty.payout) : 0,
            loss: won ? 0 : gameState.betAmount,
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UI COMPONENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function createBattleUI() {
        return `
        <div class="unified-battle" id="unifiedBattle">
            <!-- Psychological Progress Bars (Zeigarnik Effect) -->
            <div class="progress-bars">
                <div class="progress-bar" id="collectionProgress">
                    <span class="label">Collection Progress</span>
                    <div class="bar"><div class="fill" style="width: 87%"></div></div>
                    <span class="text">87% - Almost complete!</span>
                </div>
                <div class="progress-bar" id="streakProgress">
                    <span class="label">🔥 Win Streak</span>
                    <div class="bar streak"><div class="fill" style="width: 0%"></div></div>
                    <span class="text" id="streakText">Start your streak!</span>
                </div>
                <div class="progress-bar pity" id="pityProgress">
                    <span class="label">✨ Luck Building</span>
                    <div class="bar pity"><div class="fill" style="width: 0%"></div></div>
                    <span class="text" id="pityText">Pity: 0/80</span>
                </div>
            </div>
            
            <!-- Open Loop Teaser (Information Gap) -->
            <div class="mystery-teaser" id="mysteryTeaser">
                <span class="mystery-icon">❓</span>
                <span class="mystery-text">??? Card unlocks after 5 more wins...</span>
            </div>
            
            <!-- Battle Arena -->
            <div class="battle-arena">
                <div class="player-side">
                    <h3>YOUR DECK</h3>
                    <div class="deck-display" id="playerDeck"></div>
                    <div class="luck-display">
                        <span class="luck-label">Total Luck:</span>
                        <span class="luck-value" id="playerLuck">50%</span>
                    </div>
                </div>
                
                <div class="vs-section">
                    <div class="vs-text">VS</div>
                    <div class="battle-status" id="battleStatus">Select your cards!</div>
                </div>
                
                <div class="opponent-side">
                    <h3 id="opponentName">AI OPPONENT</h3>
                    <div class="deck-display" id="opponentDeck">
                        <div class="mystery-cards">
                            <div class="mystery-card">?</div>
                            <div class="mystery-card">?</div>
                            <div class="mystery-card">?</div>
                        </div>
                    </div>
                    <div class="difficulty-display" id="difficultyDisplay">Medium - 2x Payout</div>
                </div>
            </div>
            
            <!-- Betting Panel -->
            <div class="betting-panel">
                <div class="bet-header">
                    <span class="balance">Balance: <span id="nwgBalance">0</span> NWG</span>
                    <span class="potential-win">Potential Win: <span id="potentialWin">0</span> NWG</span>
                </div>
                
                <div class="bet-controls">
                    <button class="bet-btn minus" onclick="adjustBet(-100)">-100</button>
                    <input type="number" id="betAmount" value="100" min="10" max="10000">
                    <button class="bet-btn plus" onclick="adjustBet(100)">+100</button>
                </div>
                
                <div class="difficulty-selector">
                    <button class="diff-btn easy" data-diff="easy">Easy (1.3x)</button>
                    <button class="diff-btn medium active" data-diff="medium">Medium (2x)</button>
                    <button class="diff-btn hard" data-diff="hard">Hard (3.5x)</button>
                    <button class="diff-btn boss" data-diff="boss">👹 Boss (8x)</button>
                </div>
                
                <button class="battle-btn" id="battleBtn" onclick="startBattle()">
                    ⚔️ BATTLE!
                </button>
            </div>
            
            <!-- Result Overlay -->
            <div class="result-overlay hidden" id="resultOverlay">
                <div class="result-content">
                    <div class="result-title" id="resultTitle">VICTORY!</div>
                    <div class="result-stats" id="resultStats"></div>
                    <div class="result-reward" id="resultReward"></div>
                    <div class="cliffhanger" id="cliffhanger"></div>
                    <button class="continue-btn" onclick="closeResult()">Continue</button>
                </div>
            </div>
        </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BATTLE FLOW
    // ═══════════════════════════════════════════════════════════════════════════
    
    async function startBattle() {
        if (gameState.phase !== 'setup') return;
        if (gameState.selectedCards.length < 3) {
            showToast('Select at least 3 cards!', 'warning');
            return;
        }
        
        const betAmount = parseInt(document.getElementById('betAmount')?.value || 100);
        if (betAmount > gameState.nwgBalance) {
            showToast('Not enough NWG!', 'error');
            return;
        }
        
        gameState.betAmount = betAmount;
        gameState.phase = 'battle';
        
        // Deduct bet
        gameState.nwgBalance -= betAmount;
        updateBalanceDisplay();
        
        // Battle animation
        await showBattleAnimation();
        
        // Resolve
        const result = resolveBattle();
        gameState.totalBattles++;
        
        if (result.won) {
            gameState.totalWins++;
            gameState.streak++;
            gameState.lossStreak = 0;
            gameState.nwgBalance += result.payout;
        } else {
            gameState.lossStreak++;
            gameState.streak = 0;
            gameState.pityCounter++;
        }
        
        // Show result with psychology
        showBattleResult(result);
        
        gameState.phase = 'setup';
    }

    async function showBattleAnimation() {
        const statusEl = document.getElementById('battleStatus');
        const mode = BATTLE_CONFIG.modes[gameState.mode];
        
        // Countdown with suspense
        statusEl.textContent = '3...';
        await delay(800);
        statusEl.textContent = '2...';
        await delay(800);
        statusEl.textContent = '1...';
        await delay(800);
        statusEl.textContent = '⚔️ FIGHT!';
        
        // Simulate battle duration
        await delay(mode.duration);
    }

    function showBattleResult(result) {
        const overlay = document.getElementById('resultOverlay');
        const titleEl = document.getElementById('resultTitle');
        const statsEl = document.getElementById('resultStats');
        const rewardEl = document.getElementById('resultReward');
        const cliffhangerEl = document.getElementById('cliffhanger');
        
        overlay?.classList.remove('hidden');
        
        if (result.won) {
            titleEl.textContent = '🎉 VICTORY!';
            titleEl.className = 'result-title victory';
            statsEl.innerHTML = `
                <div>Your Luck: ${result.playerLuck}%</div>
                <div>Roll: ${result.roll} vs ${result.threshold}</div>
                <div>Streak: 🔥 ${gameState.streak}</div>
            `;
            rewardEl.innerHTML = `
                <div class="reward-amount">+${result.payout} NWG</div>
                <div class="reward-bonus">Streak Bonus: +${Math.min(gameState.streak * 5, 25)}%</div>
            `;
        } else {
            if (result.isNearMiss) {
                // Near-miss psychology!
                titleEl.textContent = '😱 SO CLOSE!';
                const nearMissMsg = BATTLE_CONFIG.nearMissMessages[
                    Math.floor(Math.random() * BATTLE_CONFIG.nearMissMessages.length)
                ];
                statsEl.innerHTML = `
                    <div>${nearMissMsg}</div>
                    <div>Roll: ${result.roll} vs ${result.threshold}</div>
                    <div>You needed just ${result.threshold - result.roll}% more luck!</div>
                `;
            } else {
                titleEl.textContent = '💔 DEFEAT';
                statsEl.innerHTML = `
                    <div>Your Luck: ${result.playerLuck}%</div>
                    <div>Roll: ${result.roll} vs ${result.threshold}</div>
                `;
            }
            titleEl.className = 'result-title defeat';
            rewardEl.innerHTML = `
                <div class="loss-amount">-${result.loss} NWG</div>
                <div class="pity-notice">✨ Pity: ${gameState.pityCounter}/${PITY_SYSTEM.thresholds.legendary.hard}</div>
            `;
        }
        
        // Add cliffhanger (Information Gap)
        const randomCliff = OPEN_LOOPS.cliffhangers[
            Math.floor(Math.random() * OPEN_LOOPS.cliffhangers.length)
        ];
        cliffhangerEl.textContent = randomCliff;
        
        updateBalanceDisplay();
        updateStreakDisplay();
        updatePityDisplay();
    }

    function closeResult() {
        document.getElementById('resultOverlay')?.classList.add('hidden');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UI UPDATES
    // ═══════════════════════════════════════════════════════════════════════════
    
    function updateBalanceDisplay() {
        const el = document.getElementById('nwgBalance');
        if (el) el.textContent = gameState.nwgBalance.toLocaleString();
        
        const potentialEl = document.getElementById('potentialWin');
        if (potentialEl) {
            const diff = BATTLE_CONFIG.difficulties[gameState.difficulty];
            const potential = Math.floor(gameState.betAmount * diff.payout);
            potentialEl.textContent = potential.toLocaleString();
        }
    }

    function updateStreakDisplay() {
        const textEl = document.getElementById('streakText');
        const fillEl = document.querySelector('#streakProgress .fill');
        
        if (textEl) {
            if (gameState.streak === 0) {
                textEl.textContent = 'Start your streak!';
            } else {
                const bonus = Math.min(gameState.streak * 5, 25);
                textEl.textContent = `🔥 ${gameState.streak} wins (+${bonus}% luck)`;
            }
        }
        
        if (fillEl) {
            const width = Math.min((gameState.streak / 5) * 100, 100);
            fillEl.style.width = width + '%';
        }
    }

    function updatePityDisplay() {
        const textEl = document.getElementById('pityText');
        const fillEl = document.querySelector('#pityProgress .fill');
        const threshold = PITY_SYSTEM.thresholds.legendary.hard;
        
        if (textEl) {
            const msg = PITY_SYSTEM.getMessage(gameState.pityCounter);
            textEl.textContent = msg || `Pity: ${gameState.pityCounter}/${threshold}`;
        }
        
        if (fillEl) {
            const width = (gameState.pityCounter / threshold) * 100;
            fillEl.style.width = Math.min(width, 100) + '%';
        }
    }

    function showToast(message, type = 'info') {
        if (typeof NW_UI !== 'undefined' && NW_UI.toast) {
            NW_UI.toast(message, { type });
        } else {
            console.log(`[${type}]`, message);
        }
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CARD SELECTION (No Stats Shown - Just Art & Rarity)
    // ═══════════════════════════════════════════════════════════════════════════
    
    function renderCardForBattle(card) {
        const rarity = CARD_VALUE_SYSTEM.rarityTiers[card.rarity] || CARD_VALUE_SYSTEM.rarityTiers.common;
        return `
        <div class="battle-card ${card.selected ? 'selected' : ''}" 
             data-id="${card.id}" 
             onclick="toggleCardSelection('${card.id}')"
             style="border-color: ${rarity.color}">
            <div class="card-image">
                <img src="/static/images/${card.image}" alt="${card.name}" onerror="this.src='/static/images/placeholder.jpg'">
            </div>
            <div class="card-info">
                <div class="card-name">${card.name}</div>
                <div class="card-rarity" style="color: ${rarity.color}">${card.rarity.toUpperCase()}</div>
                <div class="card-nwg">${rarity.nwg} NWG</div>
            </div>
            ${card.staked ? '<div class="staked-badge">📌 STAKED</div>' : ''}
            ${card.foil ? '<div class="foil-badge">✨ FOIL</div>' : ''}
        </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GLOBAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    window.adjustBet = function(amount) {
        const input = document.getElementById('betAmount');
        if (input) {
            const newValue = Math.max(10, Math.min(10000, parseInt(input.value) + amount));
            input.value = newValue;
            gameState.betAmount = newValue;
            updateBalanceDisplay();
        }
    };

    window.setDifficulty = function(diff) {
        gameState.difficulty = diff;
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.diff === diff);
        });
        updateBalanceDisplay();
    };

    window.toggleCardSelection = function(cardId) {
        const card = gameState.availableCards?.find(c => c.id === cardId);
        if (!card) return;
        
        const idx = gameState.selectedCards.findIndex(c => c.id === cardId);
        if (idx >= 0) {
            gameState.selectedCards.splice(idx, 1);
            card.selected = false;
        } else if (gameState.selectedCards.length < 5) {
            gameState.selectedCards.push(card);
            card.selected = true;
        }
        
        renderPlayerDeck();
        updateLuckDisplay();
    };

    window.startBattle = startBattle;
    window.closeResult = closeResult;

    function updateLuckDisplay() {
        const el = document.getElementById('playerLuck');
        if (el) {
            const luck = calculateLuck(gameState.selectedCards);
            el.textContent = luck + '%';
        }
    }

    function renderPlayerDeck() {
        const container = document.getElementById('playerDeck');
        if (!container) return;
        
        if (!gameState.availableCards || gameState.availableCards.length === 0) {
            container.innerHTML = '<div class="no-cards">No cards available. Get some from the gacha!</div>';
            return;
        }
        
        container.innerHTML = gameState.availableCards.map(renderCardForBattle).join('');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    async function initBattle() {
        // Load wallet
        if (typeof NW_WALLET !== 'undefined') {
            const wallet = await NW_WALLET.init();
            gameState.wallet = wallet;
            gameState.nwgBalance = wallet?.balance || 1000; // Demo balance
        } else {
            gameState.nwgBalance = 1000;
        }
        
        // Load cards
        try {
            const response = await fetch('/api/cards');
            const data = await response.json();
            gameState.availableCards = data.cards?.slice(0, 20) || [];
        } catch (e) {
            console.warn('Failed to load cards, using demo', e);
            gameState.availableCards = [
                { id: '1', name: 'RegginA', rarity: 'mythic', image: '01-reggina-mythic.jpg' },
                { id: '2', name: 'The Sacred Log', rarity: 'legendary', image: 'placeholder.jpg' },
                { id: '3', name: 'Guild Moment', rarity: 'epic', image: 'placeholder.jpg' },
                { id: '4', name: 'Random Member', rarity: 'rare', image: 'placeholder.jpg' },
                { id: '5', name: 'AFK Player', rarity: 'common', image: 'placeholder.jpg' },
            ];
        }
        
        // Render UI
        const container = document.getElementById('battleContainer') || document.body;
        container.innerHTML = createBattleUI();
        
        // Setup event listeners
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => setDifficulty(btn.dataset.diff));
        });
        
        // Initial render
        renderPlayerDeck();
        updateBalanceDisplay();
        updateStreakDisplay();
        updatePityDisplay();
        
        console.log('[Battle Arena v3.0] Initialized with psychology framework');
    }

    // Auto-init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBattle);
    } else {
        initBattle();
    }

    // Export for external use
    window.NW_BATTLE = {
        init: initBattle,
        getState: () => gameState,
        getPsychology: () => PSYCHOLOGY,
        getCardValue: () => CARD_VALUE_SYSTEM,
        calculateLuck,
        resolveBattle,
    };

})();
