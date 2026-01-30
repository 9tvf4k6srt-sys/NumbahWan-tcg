/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NW_BATTLE - Battle System Engine
 * ═══════════════════════════════════════════════════════════════════════════
 * Version: 1.0.0
 * 
 * Complete battle system for NumbahWan TCG:
 * - Turn-based card combat
 * - Board management (3 slots per player)
 * - HP/Energy system
 * - Card abilities & battlecries
 * - AI opponent logic
 * - Battle animations coordination
 * - Event-driven architecture
 * 
 * USAGE:
 * ─────────────────────────────────────────────────────────────────────────────
 * // Initialize battle
 * const battle = NW_BATTLE.create({
 *     playerDeck: myCards,
 *     enemyDeck: aiCards,
 *     onStateChange: renderUI
 * });
 * 
 * // Play cards
 * battle.playCard(cardIndex, slotIndex);
 * battle.attack(attackerSlot, targetSlot);
 * battle.endTurn();
 * 
 * // Events
 * battle.on('damage', ({ target, amount }) => showDamage());
 * battle.on('death', ({ card, slot }) => animateDeath());
 * battle.on('victory', () => showRewards());
 */

const NW_BATTLE = (function() {
    'use strict';

    const VERSION = '1.0.0';

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    const DEFAULT_CONFIG = {
        // Board setup
        boardSlots: 3,
        handSize: 5,
        maxHandSize: 7,
        
        // HP/Energy
        startingHP: 30,
        startingEnergy: 1,
        maxEnergy: 10,
        energyPerTurn: 1,
        
        // Timing (ms)
        turnDelay: 500,
        attackDelay: 300,
        deathDelay: 400,
        aiThinkTime: 800,
        
        // Draw
        cardsPerTurn: 1,
        startingCards: 3,
        
        // Damage
        directDamageOnEmptyBoard: 2
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // BATTLE INSTANCE FACTORY
    // ═══════════════════════════════════════════════════════════════════════════

    function create(options = {}) {
        const config = { ...DEFAULT_CONFIG, ...options.config };
        const listeners = new Map();
        
        // ═══════════════════════════════════════════════════════════════════════
        // BATTLE STATE
        // ═══════════════════════════════════════════════════════════════════════

        const state = {
            // Game status
            phase: 'setup', // setup, playing, playerTurn, enemyTurn, gameOver
            turn: 0,
            isPlayerTurn: true,
            winner: null,
            
            // Player
            player: {
                hp: config.startingHP,
                maxHP: config.startingHP,
                energy: config.startingEnergy,
                maxEnergy: config.startingEnergy,
                deck: [],
                hand: [],
                board: Array(config.boardSlots).fill(null),
                graveyard: []
            },
            
            // Enemy
            enemy: {
                hp: config.startingHP,
                maxHP: config.startingHP,
                energy: config.startingEnergy,
                maxEnergy: config.startingEnergy,
                deck: [],
                hand: [],
                board: Array(config.boardSlots).fill(null),
                graveyard: []
            },
            
            // Selection
            selectedCard: null,
            selectedSlot: null,
            validTargets: [],
            
            // Log
            battleLog: []
        };

        // ═══════════════════════════════════════════════════════════════════════
        // EVENT SYSTEM
        // ═══════════════════════════════════════════════════════════════════════

        function on(event, callback) {
            if (!listeners.has(event)) {
                listeners.set(event, new Set());
            }
            listeners.get(event).add(callback);
            return () => listeners.get(event)?.delete(callback);
        }

        function off(event, callback) {
            listeners.get(event)?.delete(callback);
        }

        function emit(event, data) {
            listeners.get(event)?.forEach(cb => {
                try { cb(data, state); } catch (e) { console.error(`[NW_BATTLE] Event error:`, e); }
            });
            
            // Always emit state change
            if (event !== 'stateChange') {
                listeners.get('stateChange')?.forEach(cb => {
                    try { cb(state, event); } catch (e) {}
                });
            }
            
            // Call options callback
            options.onStateChange?.(state, event);
        }

        function log(message, type = 'info') {
            const entry = { message, type, turn: state.turn, timestamp: Date.now() };
            state.battleLog.push(entry);
            emit('log', entry);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // DECK MANAGEMENT
        // ═══════════════════════════════════════════════════════════════════════

        function shuffle(array) {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        function createBattleCard(card, owner) {
            return {
                ...card,
                id: `${owner}_${card.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                originalId: card.id,
                owner,
                currentAtk: card.gameStats?.atk || card.atk || 1,
                currentHP: card.gameStats?.hp || card.hp || 1,
                maxHP: card.gameStats?.hp || card.hp || 1,
                cost: card.gameStats?.cost || card.cost || 1,
                canAttack: false,
                hasAttacked: false,
                buffs: [],
                debuffs: []
            };
        }

        function setupDecks(playerCards, enemyCards) {
            // Create battle-ready cards
            state.player.deck = shuffle(playerCards.map(c => createBattleCard(c, 'player')));
            state.enemy.deck = shuffle(enemyCards.map(c => createBattleCard(c, 'enemy')));
            
            // Draw starting hands
            for (let i = 0; i < config.startingCards; i++) {
                drawCard('player');
                drawCard('enemy');
            }
            
            emit('setup', { player: state.player, enemy: state.enemy });
        }

        function drawCard(who) {
            const actor = state[who];
            if (actor.deck.length === 0) {
                // Fatigue damage when deck is empty
                actor.hp -= 1;
                log(`${who === 'player' ? 'You' : 'Enemy'} takes 1 fatigue damage!`, 'damage');
                emit('fatigue', { who, damage: 1 });
                return null;
            }
            
            if (actor.hand.length >= config.maxHandSize) {
                const burned = actor.deck.shift();
                log(`Card burned: ${burned.name}`, 'warning');
                emit('burn', { who, card: burned });
                return null;
            }
            
            const card = actor.deck.shift();
            actor.hand.push(card);
            emit('draw', { who, card });
            return card;
        }

        // ═══════════════════════════════════════════════════════════════════════
        // TURN MANAGEMENT
        // ═══════════════════════════════════════════════════════════════════════

        function startBattle() {
            state.phase = 'playing';
            state.turn = 1;
            state.isPlayerTurn = true;
            
            log('Battle begins!', 'system');
            emit('battleStart', {});
            
            startTurn('player');
        }

        function startTurn(who) {
            const actor = state[who];
            state.phase = who === 'player' ? 'playerTurn' : 'enemyTurn';
            state.isPlayerTurn = who === 'player';
            
            // Increase max energy (up to cap)
            if (actor.maxEnergy < config.maxEnergy) {
                actor.maxEnergy++;
            }
            
            // Refill energy
            actor.energy = actor.maxEnergy;
            
            // Draw card
            drawCard(who);
            
            // Refresh board cards (can attack)
            actor.board.forEach(card => {
                if (card) {
                    card.canAttack = true;
                    card.hasAttacked = false;
                }
            });
            
            // Clear selection
            state.selectedCard = null;
            state.selectedSlot = null;
            state.validTargets = [];
            
            log(`${who === 'player' ? 'Your' : "Enemy's"} turn ${state.turn}`, 'turn');
            emit('turnStart', { who, turn: state.turn });
            
            // AI turn
            if (who === 'enemy') {
                setTimeout(() => executeAITurn(), config.aiThinkTime);
            }
        }

        function endTurn() {
            if (!state.isPlayerTurn || state.phase === 'gameOver') return;
            
            emit('turnEnd', { who: 'player' });
            
            // Check for game over
            if (checkGameOver()) return;
            
            // Start enemy turn
            setTimeout(() => startTurn('enemy'), config.turnDelay);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // CARD ACTIONS
        // ═══════════════════════════════════════════════════════════════════════

        function canPlayCard(cardIndex) {
            if (!state.isPlayerTurn) return false;
            const card = state.player.hand[cardIndex];
            if (!card) return false;
            if (card.cost > state.player.energy) return false;
            if (state.player.board.every(s => s !== null)) return false;
            return true;
        }

        function playCard(cardIndex, slotIndex) {
            if (!canPlayCard(cardIndex)) {
                emit('error', { type: 'cannotPlay', cardIndex });
                return false;
            }
            
            const actor = state.player;
            if (actor.board[slotIndex] !== null) {
                emit('error', { type: 'slotOccupied', slotIndex });
                return false;
            }
            
            // Remove from hand, place on board
            const card = actor.hand.splice(cardIndex, 1)[0];
            actor.energy -= card.cost;
            actor.board[slotIndex] = card;
            
            // Cannot attack immediately (summoning sickness)
            card.canAttack = false;
            
            log(`Played ${card.name} (${card.currentAtk}/${card.currentHP})`, 'play');
            emit('play', { card, slot: slotIndex, who: 'player' });
            
            // Trigger battlecry
            handleBattlecry(card, slotIndex, 'player');
            
            return true;
        }

        function canAttack(attackerSlot) {
            if (!state.isPlayerTurn) return false;
            const card = state.player.board[attackerSlot];
            if (!card) return false;
            if (!card.canAttack || card.hasAttacked) return false;
            return true;
        }

        function getValidTargets(attackerSlot) {
            if (!canAttack(attackerSlot)) return [];
            
            const targets = [];
            
            // Enemy board cards
            state.enemy.board.forEach((card, idx) => {
                if (card) {
                    targets.push({ type: 'card', slot: idx, card });
                }
            });
            
            // If no enemy cards, can attack face
            if (targets.length === 0) {
                targets.push({ type: 'face' });
            }
            
            return targets;
        }

        async function attack(attackerSlot, targetSlot) {
            if (!canAttack(attackerSlot)) {
                emit('error', { type: 'cannotAttack', attackerSlot });
                return false;
            }
            
            const attacker = state.player.board[attackerSlot];
            attacker.hasAttacked = true;
            attacker.canAttack = false;
            
            // Attack face
            if (targetSlot === 'face') {
                const damage = attacker.currentAtk;
                state.enemy.hp -= damage;
                
                log(`${attacker.name} attacks enemy for ${damage}!`, 'attack');
                emit('attack', { attacker, attackerSlot, target: 'face', damage });
                emit('damage', { target: 'enemyFace', amount: damage });
                
                await sleep(config.attackDelay);
                checkGameOver();
                return true;
            }
            
            // Attack card
            const defender = state.enemy.board[targetSlot];
            if (!defender) {
                emit('error', { type: 'invalidTarget', targetSlot });
                return false;
            }
            
            // Combat damage
            const attackDamage = attacker.currentAtk;
            const counterDamage = defender.currentAtk;
            
            defender.currentHP -= attackDamage;
            attacker.currentHP -= counterDamage;
            
            log(`${attacker.name} attacks ${defender.name}!`, 'attack');
            emit('attack', { attacker, attackerSlot, defender, targetSlot });
            emit('damage', { target: defender, amount: attackDamage, slot: targetSlot, isEnemy: true });
            emit('damage', { target: attacker, amount: counterDamage, slot: attackerSlot, isEnemy: false });
            
            await sleep(config.attackDelay);
            
            // Check deaths
            if (defender.currentHP <= 0) {
                await handleDeath(defender, targetSlot, 'enemy');
            }
            if (attacker.currentHP <= 0) {
                await handleDeath(attacker, attackerSlot, 'player');
            }
            
            checkGameOver();
            return true;
        }

        async function handleDeath(card, slot, owner) {
            const actor = state[owner];
            actor.board[slot] = null;
            actor.graveyard.push(card);
            
            log(`${card.name} was destroyed!`, 'death');
            emit('death', { card, slot, owner });
            
            // Trigger deathrattle
            if (card.ability === 'deathrattle' || card.deathrattle) {
                handleDeathrattle(card, slot, owner);
            }
            
            await sleep(config.deathDelay);
        }

        function handleBattlecry(card, slot, owner) {
            const ability = card.ability || card.battlecry;
            if (!ability) return;
            
            switch (ability) {
                case 'damage_all':
                    // Deal 1 damage to all enemies
                    const enemy = owner === 'player' ? state.enemy : state.player;
                    enemy.board.forEach((c, idx) => {
                        if (c) {
                            c.currentHP -= 1;
                            emit('damage', { target: c, amount: 1, slot: idx, isEnemy: owner === 'player' });
                        }
                    });
                    log(`${card.name} deals 1 damage to all enemies!`, 'ability');
                    break;
                    
                case 'heal':
                    // Heal player for 3
                    const actor = state[owner];
                    const healAmount = Math.min(3, actor.maxHP - actor.hp);
                    actor.hp += healAmount;
                    emit('heal', { target: owner, amount: healAmount });
                    log(`${card.name} heals for ${healAmount}!`, 'ability');
                    break;
                    
                case 'draw':
                    drawCard(owner);
                    log(`${card.name} draws a card!`, 'ability');
                    break;
                    
                case 'buff_adjacent':
                    // Buff adjacent cards +1/+1
                    const board = state[owner].board;
                    [-1, 1].forEach(offset => {
                        const adjacent = board[slot + offset];
                        if (adjacent) {
                            adjacent.currentAtk += 1;
                            adjacent.currentHP += 1;
                            adjacent.maxHP += 1;
                            emit('buff', { target: adjacent, slot: slot + offset, atk: 1, hp: 1 });
                        }
                    });
                    log(`${card.name} buffs adjacent cards!`, 'ability');
                    break;
            }
            
            emit('battlecry', { card, slot, owner, ability });
        }

        function handleDeathrattle(card, slot, owner) {
            // Similar to battlecry but on death
            emit('deathrattle', { card, slot, owner });
        }

        // ═══════════════════════════════════════════════════════════════════════
        // AI LOGIC
        // ═══════════════════════════════════════════════════════════════════════

        async function executeAITurn() {
            if (state.phase === 'gameOver') return;
            
            // Simple AI: Play cards, then attack
            
            // 1. Play cards from hand (greedy - play what we can)
            for (let attempts = 0; attempts < 5; attempts++) {
                const playableCards = state.enemy.hand
                    .map((card, idx) => ({ card, idx }))
                    .filter(({ card }) => card.cost <= state.enemy.energy)
                    .sort((a, b) => b.card.cost - a.card.cost); // Prefer expensive cards
                
                if (playableCards.length === 0) break;
                
                const emptySlots = state.enemy.board
                    .map((s, idx) => s === null ? idx : -1)
                    .filter(idx => idx >= 0);
                
                if (emptySlots.length === 0) break;
                
                const { card, idx } = playableCards[0];
                const targetSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
                
                // Play card
                state.enemy.hand.splice(idx, 1);
                state.enemy.energy -= card.cost;
                state.enemy.board[targetSlot] = card;
                card.canAttack = false;
                
                log(`Enemy plays ${card.name}`, 'play');
                emit('play', { card, slot: targetSlot, who: 'enemy' });
                
                handleBattlecry(card, targetSlot, 'enemy');
                
                await sleep(config.turnDelay);
            }
            
            // 2. Attack with board cards
            for (let slot = 0; slot < config.boardSlots; slot++) {
                const card = state.enemy.board[slot];
                if (!card || !card.canAttack || card.hasAttacked) continue;
                
                card.hasAttacked = true;
                card.canAttack = false;
                
                // Find target (prioritize killing cards, then face)
                let targetSlot = 'face';
                let targetCard = null;
                
                // Check if we can kill any player card
                for (let i = 0; i < config.boardSlots; i++) {
                    const playerCard = state.player.board[i];
                    if (playerCard && playerCard.currentHP <= card.currentAtk) {
                        targetSlot = i;
                        targetCard = playerCard;
                        break;
                    }
                }
                
                // If no killable target, attack highest threat or face
                if (targetSlot === 'face') {
                    const playerCards = state.player.board
                        .map((c, idx) => c ? { card: c, idx } : null)
                        .filter(x => x)
                        .sort((a, b) => b.card.currentAtk - a.card.currentAtk);
                    
                    if (playerCards.length > 0) {
                        targetSlot = playerCards[0].idx;
                        targetCard = playerCards[0].card;
                    }
                }
                
                // Execute attack
                if (targetSlot === 'face') {
                    state.player.hp -= card.currentAtk;
                    log(`${card.name} attacks you for ${card.currentAtk}!`, 'attack');
                    emit('attack', { attacker: card, attackerSlot: slot, target: 'face', damage: card.currentAtk });
                    emit('damage', { target: 'playerFace', amount: card.currentAtk });
                } else {
                    const attackDamage = card.currentAtk;
                    const counterDamage = targetCard.currentAtk;
                    
                    targetCard.currentHP -= attackDamage;
                    card.currentHP -= counterDamage;
                    
                    log(`${card.name} attacks ${targetCard.name}!`, 'attack');
                    emit('attack', { attacker: card, attackerSlot: slot, defender: targetCard, targetSlot });
                    emit('damage', { target: targetCard, amount: attackDamage, slot: targetSlot, isEnemy: false });
                    emit('damage', { target: card, amount: counterDamage, slot, isEnemy: true });
                    
                    // Check deaths
                    if (targetCard.currentHP <= 0) {
                        await handleDeath(targetCard, targetSlot, 'player');
                    }
                    if (card.currentHP <= 0) {
                        await handleDeath(card, slot, 'enemy');
                    }
                }
                
                await sleep(config.attackDelay);
                
                if (checkGameOver()) return;
            }
            
            // End enemy turn
            emit('turnEnd', { who: 'enemy' });
            state.turn++;
            
            setTimeout(() => startTurn('player'), config.turnDelay);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // GAME STATE
        // ═══════════════════════════════════════════════════════════════════════

        function checkGameOver() {
            if (state.player.hp <= 0) {
                state.phase = 'gameOver';
                state.winner = 'enemy';
                log('You have been defeated!', 'defeat');
                emit('gameOver', { winner: 'enemy', turns: state.turn });
                return true;
            }
            
            if (state.enemy.hp <= 0) {
                state.phase = 'gameOver';
                state.winner = 'player';
                log('Victory!', 'victory');
                emit('gameOver', { winner: 'player', turns: state.turn });
                return true;
            }
            
            return false;
        }

        function getState() {
            return { ...state };
        }

        function selectCard(cardIndex) {
            if (!state.isPlayerTurn) return;
            state.selectedCard = cardIndex;
            state.validTargets = [];
            emit('select', { type: 'card', index: cardIndex });
        }

        function selectSlot(slotIndex) {
            state.selectedSlot = slotIndex;
            state.validTargets = getValidTargets(slotIndex);
            emit('select', { type: 'slot', index: slotIndex, validTargets: state.validTargets });
        }

        function clearSelection() {
            state.selectedCard = null;
            state.selectedSlot = null;
            state.validTargets = [];
            emit('select', { type: 'clear' });
        }

        // ═══════════════════════════════════════════════════════════════════════
        // UTILITY
        // ═══════════════════════════════════════════════════════════════════════

        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // ═══════════════════════════════════════════════════════════════════════
        // INITIALIZATION
        // ═══════════════════════════════════════════════════════════════════════

        // Setup decks if provided
        if (options.playerDeck && options.enemyDeck) {
            setupDecks(options.playerDeck, options.enemyDeck);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // PUBLIC API
        // ═══════════════════════════════════════════════════════════════════════

        return {
            // State
            getState,
            get state() { return state; },
            
            // Setup
            setupDecks,
            startBattle,
            
            // Actions
            playCard,
            attack,
            endTurn,
            drawCard,
            
            // Selection
            selectCard,
            selectSlot,
            clearSelection,
            canPlayCard,
            canAttack,
            getValidTargets,
            
            // Events
            on,
            off,
            
            // Utility
            log
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATIC UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════

    function generateAIDeck(cards, deckSize = 10) {
        // Simple AI deck: random selection weighted by rarity
        const shuffled = [...cards].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, deckSize);
    }

    function calculateBattleRewards(result, turns) {
        const base = result === 'victory' ? 50 : 10;
        const speedBonus = result === 'victory' ? Math.max(0, 20 - turns) * 2 : 0;
        return {
            logs: base + speedBonus,
            exp: result === 'victory' ? 100 : 25
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE API
    // ═══════════════════════════════════════════════════════════════════════════

    console.log(`[NW_BATTLE] v${VERSION} loaded`);

    return {
        VERSION,
        DEFAULT_CONFIG,
        
        // Factory
        create,
        
        // Utilities
        generateAIDeck,
        calculateBattleRewards
    };
})();

window.NW_BATTLE = NW_BATTLE;
