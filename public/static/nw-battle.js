/* NW_BATTLE - Card Battle Engine v1.0
   Core battle logic for turn-based card combat
   Handles: Damage calc, abilities, AI, turn management
*/

const NW_BATTLE = {
    // Config
    MAX_BOARD_SIZE: 5,
    MAX_HAND_SIZE: 7,
    STARTING_HP: 100,
    STARTING_ENERGY: 3,
    MAX_ENERGY: 10,
    
    // State
    state: null,
    initialized: false,
    
    // Callbacks
    _callbacks: {},
    
    // ===== INIT =====
    init(playerDeck, enemyDeck) {
        this.state = {
            turn: 1,
            phase: 'player', // player | enemy | end
            
            player: {
                hp: this.STARTING_HP,
                maxHp: this.STARTING_HP,
                energy: this.STARTING_ENERGY,
                maxEnergy: this.STARTING_ENERGY,
                deck: [...playerDeck],
                hand: [],
                board: [null, null, null, null, null],
                graveyard: []
            },
            
            enemy: {
                hp: this.STARTING_HP,
                maxHp: this.STARTING_HP,
                energy: this.STARTING_ENERGY,
                maxEnergy: this.STARTING_ENERGY,
                deck: [...enemyDeck],
                hand: [],
                board: [null, null, null, null, null],
                graveyard: []
            },
            
            log: []
        };
        
        // Shuffle decks
        this._shuffle(this.state.player.deck);
        this._shuffle(this.state.enemy.deck);
        
        // Draw starting hands
        this.drawCards('player', 4);
        this.drawCards('enemy', 4);
        
        this.initialized = true;
        this._emit('init', this.state);
        return this;
    },
    
    // ===== CARD ACTIONS =====
    playCard(side, handIdx, boardIdx) {
        const actor = this.state[side];
        const card = actor.hand[handIdx];
        
        if (!card) return { success: false, error: 'No card at index' };
        if (actor.board[boardIdx] !== null) return { success: false, error: 'Slot occupied' };
        if (card.gameStats?.cost > actor.energy) return { success: false, error: 'Not enough energy' };
        
        // Pay cost
        actor.energy -= card.gameStats?.cost || 0;
        
        // Move to board
        actor.hand.splice(handIdx, 1);
        actor.board[boardIdx] = {
            ...card,
            currentHp: card.gameStats?.hp || 10,
            canAttack: false, // Summoning sickness
            effects: []
        };
        
        this._log(`${side} played ${card.name} to slot ${boardIdx + 1}`);
        this._emit('cardPlayed', { side, card, slot: boardIdx });
        
        return { success: true, card };
    },
    
    attack(side, attackerIdx, defenderIdx) {
        const attacker = this.state[side];
        const defender = this.state[side === 'player' ? 'enemy' : 'player'];
        
        const attackerCard = attacker.board[attackerIdx];
        if (!attackerCard) return { success: false, error: 'No attacker' };
        if (!attackerCard.canAttack) return { success: false, error: 'Cannot attack this turn' };
        
        const defenderCard = defender.board[defenderIdx];
        const atk = attackerCard.gameStats?.atk || 5;
        
        let result;
        
        if (defenderCard) {
            // Attack card
            defenderCard.currentHp -= atk;
            attackerCard.currentHp -= defenderCard.gameStats?.atk || 3;
            
            result = { type: 'card', damage: atk, counterDamage: defenderCard.gameStats?.atk || 3 };
            this._log(`${attackerCard.name} attacks ${defenderCard.name} for ${atk} damage`);
            
            // Check deaths
            if (defenderCard.currentHp <= 0) {
                defender.graveyard.push(defenderCard);
                defender.board[defenderIdx] = null;
                this._emit('cardDied', { side: side === 'player' ? 'enemy' : 'player', card: defenderCard });
            }
            if (attackerCard.currentHp <= 0) {
                attacker.graveyard.push(attackerCard);
                attacker.board[attackerIdx] = null;
                this._emit('cardDied', { side, card: attackerCard });
            }
        } else {
            // Direct attack to HP
            defender.hp -= atk;
            result = { type: 'direct', damage: atk };
            this._log(`${attackerCard.name} deals ${atk} direct damage!`);
            this._emit('directDamage', { side: side === 'player' ? 'enemy' : 'player', damage: atk });
        }
        
        attackerCard.canAttack = false;
        this._emit('attack', { side, attackerIdx, defenderIdx, result });
        
        // Check win condition
        this._checkWinCondition();
        
        return { success: true, result };
    },
    
    // ===== TURN MANAGEMENT =====
    endTurn() {
        const currentSide = this.state.phase;
        
        // Enable attacks for other side's cards
        const nextSide = currentSide === 'player' ? 'enemy' : 'player';
        this.state[nextSide].board.forEach(card => {
            if (card) card.canAttack = true;
        });
        
        // Increase energy
        if (this.state[nextSide].maxEnergy < this.MAX_ENERGY) {
            this.state[nextSide].maxEnergy++;
        }
        this.state[nextSide].energy = this.state[nextSide].maxEnergy;
        
        // Draw card
        this.drawCards(nextSide, 1);
        
        // Switch phase
        this.state.phase = nextSide;
        if (nextSide === 'player') this.state.turn++;
        
        this._log(`Turn ${this.state.turn} - ${nextSide}'s turn`);
        this._emit('turnEnd', { side: currentSide, nextSide });
        
        return { success: true, nextSide };
    },
    
    // ===== ENEMY AI =====
    async runEnemyTurn(delay = 1000) {
        if (this.state.phase !== 'enemy') return;
        
        const enemy = this.state.enemy;
        
        // Simple AI: Play highest cost affordable card
        await this._delay(delay);
        
        for (let i = 0; i < enemy.hand.length; i++) {
            const card = enemy.hand[i];
            if ((card.gameStats?.cost || 0) <= enemy.energy) {
                const emptySlot = enemy.board.findIndex(s => s === null);
                if (emptySlot !== -1) {
                    this.playCard('enemy', i, emptySlot);
                    await this._delay(delay / 2);
                    i--; // Re-check hand
                }
            }
        }
        
        // Attack with all available cards
        await this._delay(delay);
        
        for (let i = 0; i < enemy.board.length; i++) {
            const card = enemy.board[i];
            if (card && card.canAttack) {
                // Priority: Kill low HP cards > Direct damage
                const playerBoard = this.state.player.board;
                let targetIdx = playerBoard.findIndex(c => c && c.currentHp <= (card.gameStats?.atk || 5));
                
                if (targetIdx === -1) {
                    // Attack any card or go direct
                    targetIdx = playerBoard.findIndex(c => c !== null);
                    if (targetIdx === -1) targetIdx = 0; // Direct attack (empty slot)
                }
                
                this.attack('enemy', i, targetIdx);
                await this._delay(delay / 2);
            }
        }
        
        // End turn
        await this._delay(delay);
        this.endTurn();
    },
    
    // ===== HELPERS =====
    drawCards(side, count) {
        const actor = this.state[side];
        for (let i = 0; i < count; i++) {
            if (actor.deck.length > 0 && actor.hand.length < this.MAX_HAND_SIZE) {
                const card = actor.deck.pop();
                actor.hand.push(card);
                this._emit('cardDrawn', { side, card });
            }
        }
    },
    
    _shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },
    
    _checkWinCondition() {
        if (this.state.player.hp <= 0) {
            this.state.phase = 'end';
            this._emit('gameEnd', { winner: 'enemy' });
        } else if (this.state.enemy.hp <= 0) {
            this.state.phase = 'end';
            this._emit('gameEnd', { winner: 'player' });
        }
    },
    
    _log(msg) {
        this.state.log.push({ time: Date.now(), msg });
    },
    
    _delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    },
    
    // ===== EVENTS =====
    on(event, callback) {
        if (!this._callbacks[event]) this._callbacks[event] = [];
        this._callbacks[event].push(callback);
    },
    
    off(event, callback) {
        if (!this._callbacks[event]) return;
        this._callbacks[event] = this._callbacks[event].filter(cb => cb !== callback);
    },
    
    _emit(event, data) {
        (this._callbacks[event] || []).forEach(cb => cb(data));
    },
    
    // ===== GETTERS =====
    getState() { return this.state; },
    isPlayerTurn() { return this.state?.phase === 'player'; },
    isGameOver() { return this.state?.phase === 'end'; }
};

window.NW_BATTLE = NW_BATTLE;
