/**
 * NumbahWan D&D Engine v1.0 - "The Eternal Campaign"
 * Ultimate Hybrid Spectator Experience
 * 
 * Features:
 * - AI Dungeon Master with dramatic narration
 * - Real D&D dice mechanics
 * - Card → D&D stat conversion
 * - Live combat system
 * - Viewer voting on decisions
 * - NWG betting on outcomes
 * - Tip/donation events
 * - MVP leaderboard & card progression
 */

const NW_DND = {
    version: '1.0.0',
    
    // ═══════════════════════════════════════════════════════════════════
    // CARD → D&D STAT CONVERSION
    // ═══════════════════════════════════════════════════════════════════
    
    rarityStats: {
        mythic:    { baseHP: 120, baseAC: 18, baseDamage: '3d10+8', level: 15, profBonus: 5 },
        legendary: { baseHP: 85,  baseAC: 16, baseDamage: '2d10+5', level: 10, profBonus: 4 },
        epic:      { baseHP: 55,  baseAC: 14, baseDamage: '2d8+3',  level: 7,  profBonus: 3 },
        rare:      { baseHP: 35,  baseAC: 13, baseDamage: '1d10+2', level: 5,  profBonus: 3 },
        uncommon:  { baseHP: 22,  baseAC: 12, baseDamage: '1d8+1',  level: 3,  profBonus: 2 },
        common:    { baseHP: 14,  baseAC: 11, baseDamage: '1d6',    level: 1,  profBonus: 2 }
    },
    
    // Role → D&D Class mapping with special abilities
    roleClasses: {
        carry:         { class: 'Champion',     stat: 'STR', ability: 'Second Wind', abilityDesc: 'Recover 2d10+level HP once per encounter' },
        grinder:       { class: 'Barbarian',    stat: 'CON', ability: 'Relentless',  abilityDesc: 'Cannot be reduced below 1 HP once per encounter' },
        whale:         { class: 'Paladin',      stat: 'CHA', ability: 'Divine Smite', abilityDesc: 'Add 3d8 radiant damage to next hit' },
        lurker:        { class: 'Rogue',        stat: 'DEX', ability: 'Sneak Attack', abilityDesc: 'Deal double damage when enemy is distracted' },
        simp:          { class: 'Bard',         stat: 'CHA', ability: 'Inspiration',  abilityDesc: 'Grant ally +1d10 to their next roll' },
        troll:         { class: 'Warlock',      stat: 'CHA', ability: 'Vicious Mockery', abilityDesc: 'Enemy has disadvantage on next attack' },
        leech:         { class: 'Necromancer',  stat: 'INT', ability: 'Life Drain',   abilityDesc: 'Steal HP equal to damage dealt' },
        guild_parent:  { class: 'Cleric',       stat: 'WIS', ability: 'Mass Heal',    abilityDesc: 'Heal entire party for 3d8 HP' },
        rage_quitter:  { class: 'Berserker',    stat: 'STR', ability: 'Rage Mode',    abilityDesc: 'Double damage but take 50% more damage' },
        afk_king:      { class: 'Monk',         stat: 'WIS', ability: 'Meditation',   abilityDesc: 'Become untargetable for 1 round' },
        theory_crafter:{ class: 'Wizard',       stat: 'INT', ability: 'Analyze',      abilityDesc: 'Reveal enemy weakness, +5 to hit' },
        fashion_main:  { class: 'Sorcerer',     stat: 'CHA', ability: 'Dazzle',       abilityDesc: 'Blind enemy for 1 round' }
    },
    
    // Convert card to D&D character
    cardToCharacter(card) {
        const rarityBase = this.rarityStats[card.rarity] || this.rarityStats.common;
        const roleInfo = this.roleClasses[card.role] || this.roleClasses.carry;
        
        // Generate stats based on role
        const stats = this.generateStats(roleInfo.stat);
        
        return {
            id: card.id,
            name: card.name,
            cardData: card,
            class: roleInfo.class,
            level: rarityBase.level,
            
            // Combat stats
            maxHP: rarityBase.baseHP + Math.floor(stats.CON / 2),
            currentHP: rarityBase.baseHP + Math.floor(stats.CON / 2),
            ac: rarityBase.baseAC + Math.floor((stats.DEX - 10) / 2),
            damage: rarityBase.baseDamage,
            profBonus: rarityBase.profBonus,
            
            // Ability scores
            stats: stats,
            primaryStat: roleInfo.stat,
            
            // Special ability
            ability: roleInfo.ability,
            abilityDesc: roleInfo.abilityDesc,
            abilityUsed: false,
            
            // Progression
            xp: 0,
            kills: 0,
            damageDealt: 0,
            healingDone: 0,
            
            // Status
            conditions: [],
            isAlive: true,
            initiative: 0
        };
    },
    
    // Generate D&D stats (prioritize the role's primary stat)
    generateStats(primaryStat) {
        const base = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
        
        // Roll 4d6 drop lowest for each stat
        Object.keys(base).forEach(stat => {
            const rolls = [this.d(6), this.d(6), this.d(6), this.d(6)].sort((a,b) => b-a);
            base[stat] = rolls[0] + rolls[1] + rolls[2];
        });
        
        // Ensure primary stat is at least 16
        if (base[primaryStat] < 16) {
            base[primaryStat] = 16 + this.d(4);
        }
        
        return base;
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // DICE SYSTEM
    // ═══════════════════════════════════════════════════════════════════
    
    d(sides) {
        return Math.floor(Math.random() * sides) + 1;
    },
    
    d20() { return this.d(20); },
    d12() { return this.d(12); },
    d10() { return this.d(10); },
    d8()  { return this.d(8); },
    d6()  { return this.d(6); },
    d4()  { return this.d(4); },
    
    // Roll with advantage/disadvantage
    d20Adv(advantage = false, disadvantage = false) {
        const roll1 = this.d20();
        const roll2 = this.d20();
        
        if (advantage && !disadvantage) return { result: Math.max(roll1, roll2), rolls: [roll1, roll2], type: 'advantage' };
        if (disadvantage && !advantage) return { result: Math.min(roll1, roll2), rolls: [roll1, roll2], type: 'disadvantage' };
        return { result: roll1, rolls: [roll1], type: 'normal' };
    },
    
    // Parse dice notation like "2d8+3"
    rollDice(notation) {
        const match = notation.match(/(\d+)d(\d+)([+-]\d+)?/);
        if (!match) return { total: 0, rolls: [], notation };
        
        const count = parseInt(match[1]);
        const sides = parseInt(match[2]);
        const modifier = match[3] ? parseInt(match[3]) : 0;
        
        const rolls = [];
        for (let i = 0; i < count; i++) {
            rolls.push(this.d(sides));
        }
        
        return {
            total: rolls.reduce((a, b) => a + b, 0) + modifier,
            rolls: rolls,
            modifier: modifier,
            notation: notation
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // ENCOUNTER SYSTEM
    // ═══════════════════════════════════════════════════════════════════
    
    encounterTypes: [
        { type: 'combat', weight: 50, name: 'Combat Encounter' },
        { type: 'boss', weight: 10, name: 'Boss Battle' },
        { type: 'trap', weight: 15, name: 'Deadly Trap' },
        { type: 'puzzle', weight: 10, name: 'Ancient Puzzle' },
        { type: 'social', weight: 10, name: 'Social Encounter' },
        { type: 'treasure', weight: 5, name: 'Treasure Room' }
    ],
    
    enemies: {
        minions: [
            { name: 'Goblin Scout', hp: 12, ac: 12, damage: '1d6+1', xp: 25 },
            { name: 'Skeleton Warrior', hp: 18, ac: 13, damage: '1d8+2', xp: 50 },
            { name: 'Orc Grunt', hp: 25, ac: 13, damage: '1d10+3', xp: 75 },
            { name: 'Dark Cultist', hp: 20, ac: 11, damage: '2d6', xp: 65 },
            { name: 'Giant Spider', hp: 28, ac: 14, damage: '1d8+2', xp: 100 },
            { name: 'Harpy Screamer', hp: 22, ac: 12, damage: '1d6+2', xp: 80 }
        ],
        elites: [
            { name: 'Ogre Crusher', hp: 65, ac: 14, damage: '2d10+4', xp: 200 },
            { name: 'Wraith Lord', hp: 55, ac: 15, damage: '2d8+3', xp: 250 },
            { name: 'Troll Berserker', hp: 80, ac: 13, damage: '2d12+5', xp: 300, regen: 5 },
            { name: 'Mind Flayer Spawn', hp: 45, ac: 16, damage: '3d6+4', xp: 350 },
            { name: 'Shadow Dragon Wyrmling', hp: 70, ac: 17, damage: '3d8+3', xp: 400 }
        ],
        bosses: [
            { name: 'Zakum, The Corrupted', hp: 250, ac: 18, damage: '4d10+8', xp: 2000, phases: 3 },
            { name: 'The Whale King', hp: 300, ac: 16, damage: '3d12+10', xp: 2500, phases: 2 },
            { name: 'AFK Demon', hp: 200, ac: 20, damage: '2d20+5', xp: 1800, phases: 2 },
            { name: 'Drama Hydra', hp: 280, ac: 15, damage: '3d10+6', xp: 2200, heads: 5 },
            { name: 'The Eternal Grind', hp: 350, ac: 14, damage: '2d10+4', xp: 3000, phases: 4 }
        ]
    },
    
    locations: [
        { name: 'The Dungeon of Eternal Grind', theme: 'undead', desc: 'Endless corridors of repetitive mobs and respawning chests.' },
        { name: 'Whale\'s Treasury', theme: 'gold', desc: 'Mountains of premium currency and limited-time offers.' },
        { name: 'The AFK Void', theme: 'shadow', desc: 'A realm where time stands still and nothing happens... until it does.' },
        { name: 'Drama Cave', theme: 'fire', desc: 'The walls are literally made of hot takes and subtweets.' },
        { name: 'Zakum\'s Lair', theme: 'corrupted', desc: 'The legendary raid zone. Many enter. Few return with sanity.' },
        { name: 'The Sacred Log Sanctuary', theme: 'holy', desc: 'Where the guild\'s power flows. Protected by RegginA herself.' },
        { name: 'Rage Quit Valley', theme: 'chaos', desc: 'Littered with abandoned keyboards and shattered dreams.' },
        { name: 'The Simp Temple', theme: 'pink', desc: 'Shrines to every waifu. Donations expected.' }
    ],
    
    // ═══════════════════════════════════════════════════════════════════
    // NARRATIVE GENERATOR (AI DM)
    // ═══════════════════════════════════════════════════════════════════
    
    narrativeTemplates: {
        combat: {
            start: [
                "🗡️ COMBAT INITIATED! {enemies} emerge from the shadows!",
                "⚔️ AMBUSH! The party is surrounded by {enemies}!",
                "🔥 BATTLE STATIONS! {enemies} block the path forward!",
                "💀 DANGER! {enemies} have been waiting for this moment!"
            ],
            attack: [
                "{attacker} lunges at {target} with deadly intent!",
                "{attacker} unleashes a devastating strike toward {target}!",
                "With a battle cry, {attacker} charges {target}!",
                "{attacker} focuses their energy and attacks {target}!"
            ],
            hit: [
                "💥 CRITICAL CONNECTION! {damage} damage!",
                "🎯 DIRECT HIT! {target} takes {damage} damage!",
                "✨ SOLID STRIKE! {damage} damage dealt!",
                "⚡ IMPACT! {target} reels from {damage} damage!"
            ],
            miss: [
                "😤 MISS! {target} dodges at the last second!",
                "🌪️ WHIFF! The attack goes wide!",
                "🛡️ BLOCKED! {target}'s defense holds!",
                "💨 EVADED! {target} is too quick!"
            ],
            crit: [
                "🌟 NATURAL 20! CRITICAL HIT!!!",
                "💎 PERFECT STRIKE! MAXIMUM DAMAGE!",
                "🔥 DEVASTATING BLOW! THE CROWD GOES WILD!",
                "⭐ LEGENDARY CRIT! THIS IS WHAT WE'RE HERE FOR!"
            ],
            ability: [
                "✨ {character} activates {ability}!",
                "🌟 SPECIAL MOVE! {character} uses {ability}!",
                "💫 {ability} ACTIVATED! {character} shows their true power!"
            ],
            victory: [
                "🎉 VICTORY! The party stands triumphant!",
                "🏆 FLAWLESS! All enemies have been defeated!",
                "⚔️ CONQUEST! The battlefield belongs to NumbahWan!",
                "🎊 LEGENDARY WIN! The guild's power is unmatched!"
            ],
            defeat: [
                "💀 PARTY WIPE! The heroes have fallen...",
                "😱 TOTAL DEFEAT! Time to regroup...",
                "☠️ DARKNESS CLAIMS THE PARTY! But they'll be back...",
                "💔 DEFEAT! The respawn timer begins..."
            ]
        },
        exploration: {
            enter: [
                "🚪 The party enters {location}...",
                "🗺️ Before them lies {location}...",
                "⛏️ Descending into {location}...",
                "🏰 The gates of {location} creak open..."
            ],
            discovery: [
                "👁️ {character} spots something unusual!",
                "✨ A glimmer catches {character}'s eye!",
                "🔍 {character}'s keen senses detect a hidden passage!",
                "📜 Ancient runes reveal themselves to {character}!"
            ]
        },
        commentary: {
            hype: [
                "WHAT A PLAY! The chat is going absolutely WILD!",
                "DID YOU SEE THAT?! This is why we watch!",
                "THE COMEBACK IS REAL! Never count out NumbahWan!",
                "ABSOLUTE CINEMA! Peak gaming right here!",
                "I CAN'T BELIEVE MY EYES! LEGENDARY MOMENT!"
            ],
            tension: [
                "It's all coming down to this...",
                "One wrong move and it's over...",
                "The tension is PALPABLE right now...",
                "This could go either way, folks...",
                "Hold your breath, chat..."
            ],
            funny: [
                "...did they really just do that? 😂",
                "Classic guild moment right there",
                "The prophecy is fulfilled once again",
                "And THAT'S why we love this guild",
                "You can't script this stuff, folks"
            ]
        }
    },
    
    // Get random template
    getTemplate(category, type) {
        const templates = this.narrativeTemplates[category]?.[type];
        if (!templates) return '';
        return templates[Math.floor(Math.random() * templates.length)];
    },
    
    // Fill template with data
    fillTemplate(template, data) {
        let result = template;
        Object.keys(data).forEach(key => {
            result = result.replace(new RegExp(`{${key}}`, 'g'), data[key]);
        });
        return result;
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // GAME STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    state: {
        party: [],
        currentLocation: null,
        currentEncounter: null,
        turn: 0,
        round: 0,
        phase: 'idle', // idle, exploration, combat, voting, resolution
        combatLog: [],
        narrativeLog: [],
        viewers: 0,
        
        // Voting system
        activeVote: null,
        votes: {},
        voteTimer: null,
        
        // Betting system
        activeBets: [],
        bettingPool: 0,
        
        // Leaderboard
        mvpStats: {},
        
        // Campaign progress
        encountersCompleted: 0,
        totalXPEarned: 0,
        bossesDefeated: 0,
        
        // Tips/Events
        pendingEvents: []
    },
    
    // Initialize game state
    init(cards) {
        this.state.party = [];
        this.state.combatLog = [];
        this.state.narrativeLog = [];
        this.state.phase = 'idle';
        
        // Convert cards to characters
        if (cards && cards.length > 0) {
            // Select 4-5 random cards for the party
            const shuffled = [...cards].sort(() => Math.random() - 0.5);
            const partySize = 4 + Math.floor(Math.random() * 2); // 4-5 members
            
            for (let i = 0; i < Math.min(partySize, shuffled.length); i++) {
                const character = this.cardToCharacter(shuffled[i]);
                this.state.party.push(character);
            }
        }
        
        // Select starting location
        this.state.currentLocation = this.locations[Math.floor(Math.random() * this.locations.length)];
        
        this.addNarrative('system', `🎮 THE ETERNAL CAMPAIGN BEGINS!`);
        this.addNarrative('dm', this.fillTemplate(this.getTemplate('exploration', 'enter'), { location: this.state.currentLocation.name }));
        
        return this.state;
    },
    
    // Add to narrative log
    addNarrative(type, message) {
        const entry = {
            id: Date.now() + Math.random(),
            type: type, // dm, combat, system, vote, bet, tip
            message: message,
            timestamp: new Date().toISOString()
        };
        this.state.narrativeLog.push(entry);
        
        // Keep log manageable
        if (this.state.narrativeLog.length > 100) {
            this.state.narrativeLog.shift();
        }
        
        // Dispatch event for UI updates
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nw-dnd-narrative', { detail: entry }));
        }
        
        return entry;
    },
    
    // Add to combat log
    addCombatLog(action) {
        const entry = {
            id: Date.now() + Math.random(),
            ...action,
            timestamp: new Date().toISOString()
        };
        this.state.combatLog.push(entry);
        
        if (this.state.combatLog.length > 50) {
            this.state.combatLog.shift();
        }
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nw-dnd-combat', { detail: entry }));
        }
        
        return entry;
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // COMBAT SYSTEM
    // ═══════════════════════════════════════════════════════════════════
    
    startCombat(enemyType = 'random') {
        this.state.phase = 'combat';
        this.state.round = 0;
        
        // Generate enemies
        let enemies = [];
        if (enemyType === 'boss') {
            const boss = { ...this.enemies.bosses[Math.floor(Math.random() * this.enemies.bosses.length)] };
            boss.currentHP = boss.hp;
            boss.id = 'boss_' + Date.now();
            enemies.push(boss);
        } else {
            // Mix of minions and maybe an elite
            const minionCount = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < minionCount; i++) {
                const minion = { ...this.enemies.minions[Math.floor(Math.random() * this.enemies.minions.length)] };
                minion.currentHP = minion.hp;
                minion.id = 'minion_' + Date.now() + '_' + i;
                enemies.push(minion);
            }
            
            // 30% chance for an elite
            if (Math.random() < 0.3) {
                const elite = { ...this.enemies.elites[Math.floor(Math.random() * this.enemies.elites.length)] };
                elite.currentHP = elite.hp;
                elite.id = 'elite_' + Date.now();
                enemies.push(elite);
            }
        }
        
        this.state.currentEncounter = {
            type: 'combat',
            enemies: enemies,
            startTime: Date.now()
        };
        
        // Roll initiative
        this.rollInitiative();
        
        // Announce combat
        const enemyNames = enemies.map(e => e.name).join(', ');
        this.addNarrative('dm', this.fillTemplate(this.getTemplate('combat', 'start'), { enemies: enemyNames }));
        this.addNarrative('system', `⚔️ Roll Initiative! Combat begins!`);
        
        // Enable betting
        this.openBetting();
        
        return this.state.currentEncounter;
    },
    
    rollInitiative() {
        // Party initiative
        this.state.party.forEach(char => {
            const dexMod = Math.floor((char.stats.DEX - 10) / 2);
            char.initiative = this.d20() + dexMod;
        });
        
        // Enemy initiative
        if (this.state.currentEncounter?.enemies) {
            this.state.currentEncounter.enemies.forEach(enemy => {
                enemy.initiative = this.d20() + 2; // Enemies get +2 base
            });
        }
    },
    
    // Get turn order
    getTurnOrder() {
        const all = [
            ...this.state.party.filter(c => c.isAlive).map(c => ({ ...c, isParty: true })),
            ...(this.state.currentEncounter?.enemies?.filter(e => e.currentHP > 0) || []).map(e => ({ ...e, isParty: false }))
        ];
        return all.sort((a, b) => b.initiative - a.initiative);
    },
    
    // Process one combat turn
    processCombatTurn() {
        if (this.state.phase !== 'combat') return null;
        
        const turnOrder = this.getTurnOrder();
        if (turnOrder.length === 0) return null;
        
        this.state.turn++;
        const currentTurnIndex = (this.state.turn - 1) % turnOrder.length;
        
        // New round?
        if (currentTurnIndex === 0) {
            this.state.round++;
            this.addNarrative('system', `\n═══ ROUND ${this.state.round} ═══`);
        }
        
        const actor = turnOrder[currentTurnIndex];
        
        if (actor.isParty) {
            return this.processPartyTurn(actor);
        } else {
            return this.processEnemyTurn(actor);
        }
    },
    
    // Party member turn
    processPartyTurn(character) {
        // Find target (lowest HP enemy)
        const enemies = this.state.currentEncounter?.enemies?.filter(e => e.currentHP > 0) || [];
        if (enemies.length === 0) {
            return this.endCombat(true);
        }
        
        const target = enemies.reduce((a, b) => a.currentHP < b.currentHP ? a : b);
        
        // Should use ability? (20% chance if not used)
        if (!character.abilityUsed && Math.random() < 0.2) {
            return this.useAbility(character, target, enemies);
        }
        
        // Attack!
        return this.attack(character, target);
    },
    
    // Enemy turn
    processEnemyTurn(enemy) {
        const partyAlive = this.state.party.filter(c => c.isAlive);
        if (partyAlive.length === 0) {
            return this.endCombat(false);
        }
        
        // Target random party member (or lowest HP for bosses)
        let target;
        if (enemy.phases) { // Boss
            target = partyAlive.reduce((a, b) => a.currentHP < b.currentHP ? a : b);
        } else {
            target = partyAlive[Math.floor(Math.random() * partyAlive.length)];
        }
        
        return this.attack(enemy, target, false);
    },
    
    // Attack action
    attack(attacker, target, isParty = true) {
        const result = {
            attacker: attacker.name,
            target: target.name,
            isParty: isParty
        };
        
        // Announce attack
        this.addNarrative('dm', this.fillTemplate(this.getTemplate('combat', 'attack'), {
            attacker: attacker.name,
            target: target.name
        }));
        
        // Roll to hit
        const attackRoll = this.d20Adv();
        const attackBonus = isParty ? (attacker.profBonus + Math.floor((attacker.stats[attacker.primaryStat] - 10) / 2)) : 4;
        const totalAttack = attackRoll.result + attackBonus;
        
        result.attackRoll = attackRoll.result;
        result.totalAttack = totalAttack;
        result.targetAC = target.ac || target.AC || 12;
        
        // Check for crit
        if (attackRoll.result === 20) {
            result.isCrit = true;
            this.addNarrative('dm', this.getTemplate('combat', 'crit'));
        }
        
        // Check hit
        if (attackRoll.result === 1) {
            result.isHit = false;
            result.isCritMiss = true;
            this.addNarrative('dm', `💀 NATURAL 1! Critical miss! ${attacker.name} stumbles!`);
        } else if (totalAttack >= result.targetAC || result.isCrit) {
            result.isHit = true;
            
            // Roll damage
            const damageRoll = this.rollDice(attacker.damage);
            let totalDamage = damageRoll.total;
            
            // Double damage on crit
            if (result.isCrit) {
                totalDamage *= 2;
            }
            
            result.damage = totalDamage;
            result.damageRolls = damageRoll.rolls;
            
            // Apply damage
            if (isParty) {
                target.currentHP = Math.max(0, target.currentHP - totalDamage);
                attacker.damageDealt = (attacker.damageDealt || 0) + totalDamage;
            } else {
                target.currentHP = Math.max(0, target.currentHP - totalDamage);
            }
            
            this.addNarrative('dm', this.fillTemplate(this.getTemplate('combat', 'hit'), {
                target: target.name,
                damage: totalDamage
            }));
            
            // Check for kill
            if (target.currentHP <= 0) {
                if (isParty) {
                    attacker.kills = (attacker.kills || 0) + 1;
                    attacker.xp = (attacker.xp || 0) + (target.xp || 50);
                    this.addNarrative('dm', `☠️ ${target.name} has been SLAIN by ${attacker.name}!`);
                } else {
                    target.isAlive = false;
                    this.addNarrative('dm', `💀 ${target.name} falls! ${attacker.name} claims another victim!`);
                }
            }
            
            // Commentary
            if (Math.random() < 0.3) {
                this.addNarrative('commentary', this.getTemplate('commentary', 'hype'));
            }
            
        } else {
            result.isHit = false;
            this.addNarrative('dm', this.fillTemplate(this.getTemplate('combat', 'miss'), {
                target: target.name
            }));
        }
        
        this.addCombatLog(result);
        
        // Check combat end conditions
        const enemiesAlive = this.state.currentEncounter?.enemies?.filter(e => e.currentHP > 0) || [];
        const partyAlive = this.state.party.filter(c => c.isAlive);
        
        if (enemiesAlive.length === 0) {
            return this.endCombat(true);
        }
        if (partyAlive.length === 0) {
            return this.endCombat(false);
        }
        
        return result;
    },
    
    // Use special ability
    useAbility(character, target, enemies) {
        character.abilityUsed = true;
        
        this.addNarrative('dm', this.fillTemplate(this.getTemplate('combat', 'ability'), {
            character: character.name,
            ability: character.ability
        }));
        
        const result = {
            type: 'ability',
            character: character.name,
            ability: character.ability
        };
        
        // Apply ability effect based on class
        switch (character.ability) {
            case 'Second Wind':
                const heal = this.rollDice(`2d10+${character.level}`).total;
                character.currentHP = Math.min(character.maxHP, character.currentHP + heal);
                character.healingDone = (character.healingDone || 0) + heal;
                this.addNarrative('dm', `💚 ${character.name} recovers ${heal} HP! Now at ${character.currentHP}/${character.maxHP}`);
                result.heal = heal;
                break;
                
            case 'Divine Smite':
                const smiteDamage = this.rollDice('3d8').total;
                target.currentHP = Math.max(0, target.currentHP - smiteDamage);
                character.damageDealt = (character.damageDealt || 0) + smiteDamage;
                this.addNarrative('dm', `✨ DIVINE SMITE! ${smiteDamage} radiant damage to ${target.name}!`);
                result.damage = smiteDamage;
                break;
                
            case 'Sneak Attack':
                const sneakDamage = this.rollDice(character.damage).total * 2;
                target.currentHP = Math.max(0, target.currentHP - sneakDamage);
                character.damageDealt = (character.damageDealt || 0) + sneakDamage;
                this.addNarrative('dm', `🗡️ SNEAK ATTACK! ${sneakDamage} damage from the shadows!`);
                result.damage = sneakDamage;
                break;
                
            case 'Mass Heal':
                const massHeal = this.rollDice('3d8').total;
                this.state.party.forEach(p => {
                    if (p.isAlive) {
                        p.currentHP = Math.min(p.maxHP, p.currentHP + massHeal);
                    }
                });
                character.healingDone = (character.healingDone || 0) + (massHeal * this.state.party.filter(p => p.isAlive).length);
                this.addNarrative('dm', `💖 MASS HEAL! The entire party recovers ${massHeal} HP!`);
                result.heal = massHeal;
                break;
                
            case 'Rage Mode':
                character.conditions.push({ name: 'Raging', duration: 3 });
                this.addNarrative('dm', `🔥 ${character.name} ENTERS RAGE MODE! Double damage, but vulnerable!`);
                break;
                
            case 'Vicious Mockery':
                this.addNarrative('dm', `😂 ${character.name} roasts ${target.name}! Disadvantage on next attack!`);
                target.disadvantage = true;
                break;
                
            default:
                // Generic ability
                const genericDamage = this.rollDice('2d6').total + character.level;
                target.currentHP = Math.max(0, target.currentHP - genericDamage);
                character.damageDealt = (character.damageDealt || 0) + genericDamage;
                this.addNarrative('dm', `⚡ ${character.ability}! ${genericDamage} damage!`);
                result.damage = genericDamage;
        }
        
        this.addCombatLog(result);
        
        // Check for kill
        if (target.currentHP <= 0) {
            character.kills = (character.kills || 0) + 1;
            character.xp = (character.xp || 0) + (target.xp || 50);
            this.addNarrative('dm', `☠️ ${target.name} is DESTROYED!`);
        }
        
        return result;
    },
    
    // End combat
    endCombat(victory) {
        this.state.phase = 'resolution';
        
        if (victory) {
            // Calculate total XP
            const totalXP = this.state.currentEncounter.enemies.reduce((sum, e) => sum + (e.xp || 50), 0);
            const xpPerMember = Math.floor(totalXP / this.state.party.filter(p => p.isAlive).length);
            
            // Distribute XP
            this.state.party.forEach(p => {
                if (p.isAlive) {
                    p.xp = (p.xp || 0) + xpPerMember;
                }
            });
            
            this.state.encountersCompleted++;
            this.state.totalXPEarned += totalXP;
            
            // Boss?
            if (this.state.currentEncounter.enemies.some(e => e.phases)) {
                this.state.bossesDefeated++;
                this.addNarrative('dm', `🏆 BOSS DEFEATED! ${totalXP} XP earned!`);
            }
            
            this.addNarrative('dm', this.getTemplate('combat', 'victory'));
            this.addNarrative('system', `💰 Party earns ${xpPerMember} XP each!`);
            
            // Commentary
            this.addNarrative('commentary', this.getTemplate('commentary', 'hype'));
            
            // Resolve bets (party win)
            this.resolveBets('party');
            
        } else {
            this.addNarrative('dm', this.getTemplate('combat', 'defeat'));
            this.addNarrative('system', `💀 The party will respawn shortly...`);
            
            // Revive party with half HP
            this.state.party.forEach(p => {
                p.isAlive = true;
                p.currentHP = Math.floor(p.maxHP / 2);
                p.abilityUsed = false;
                p.conditions = [];
            });
            
            // Resolve bets (enemy win)
            this.resolveBets('enemies');
        }
        
        // Update MVP stats
        this.updateMVPStats();
        
        this.state.currentEncounter = null;
        this.state.phase = 'idle';
        
        return { victory, phase: 'idle' };
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // VOTING SYSTEM
    // ═══════════════════════════════════════════════════════════════════
    
    voteOptions: {
        path: [
            { id: 'left', label: '🚪 Take the left passage (Unknown danger)', weight: 1 },
            { id: 'right', label: '🚪 Take the right passage (Ominous glow)', weight: 1 },
            { id: 'forward', label: '⬆️ Continue forward (Sounds of battle)', weight: 1 },
            { id: 'back', label: '🔙 Turn back (Coward\'s way)', weight: 0.5 }
        ],
        action: [
            { id: 'attack', label: '⚔️ Attack aggressively!', weight: 1.2 },
            { id: 'defend', label: '🛡️ Defensive formation', weight: 1 },
            { id: 'sneak', label: '🥷 Attempt stealth approach', weight: 0.8 },
            { id: 'negotiate', label: '🗣️ Try to negotiate', weight: 0.5 }
        ],
        treasure: [
            { id: 'open', label: '📦 Open the chest (Could be trapped)', weight: 1 },
            { id: 'check', label: '🔍 Check for traps first', weight: 1.2 },
            { id: 'leave', label: '🚶 Leave it alone', weight: 0.3 }
        ]
    },
    
    startVote(category, duration = 30000) {
        const options = this.voteOptions[category];
        if (!options) return null;
        
        this.state.activeVote = {
            category: category,
            options: options,
            startTime: Date.now(),
            duration: duration,
            votes: {}
        };
        
        this.state.phase = 'voting';
        
        this.addNarrative('vote', `\n🗳️ VOTE NOW! You have ${duration/1000} seconds!`);
        options.forEach((opt, i) => {
            this.addNarrative('vote', `   ${i + 1}. ${opt.label}`);
        });
        
        // Auto-resolve after duration
        this.state.voteTimer = setTimeout(() => {
            this.resolveVote();
        }, duration);
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nw-dnd-vote-start', { detail: this.state.activeVote }));
        }
        
        return this.state.activeVote;
    },
    
    castVote(optionId, odtion, voter = 'anonymous') {
        if (!this.state.activeVote) return false;
        
        // One vote per viewer
        if (this.state.activeVote.votes[voter]) {
            return false; // Already voted
        }
        
        this.state.activeVote.votes[voter] = optionId;
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nw-dnd-vote-cast', { 
                detail: { voter, optionId, totalVotes: Object.keys(this.state.activeVote.votes).length }
            }));
        }
        
        return true;
    },
    
    resolveVote() {
        if (!this.state.activeVote) return null;
        
        clearTimeout(this.state.voteTimer);
        
        // Count votes
        const voteCounts = {};
        this.state.activeVote.options.forEach(opt => {
            voteCounts[opt.id] = 0;
        });
        
        Object.values(this.state.activeVote.votes).forEach(optionId => {
            if (voteCounts[optionId] !== undefined) {
                voteCounts[optionId]++;
            }
        });
        
        // Find winner (weighted by option weight if tie)
        let winner = null;
        let maxVotes = -1;
        
        this.state.activeVote.options.forEach(opt => {
            const weightedVotes = voteCounts[opt.id] * opt.weight;
            if (weightedVotes > maxVotes || (weightedVotes === maxVotes && Math.random() < 0.5)) {
                maxVotes = weightedVotes;
                winner = opt;
            }
        });
        
        // If no votes, pick random
        if (Object.keys(this.state.activeVote.votes).length === 0) {
            winner = this.state.activeVote.options[Math.floor(Math.random() * this.state.activeVote.options.length)];
            this.addNarrative('vote', `🤷 No votes cast! The DM decides: ${winner.label}`);
        } else {
            this.addNarrative('vote', `🗳️ THE PEOPLE HAVE SPOKEN! Winner: ${winner.label}`);
        }
        
        const result = {
            winner: winner,
            votes: voteCounts,
            totalVoters: Object.keys(this.state.activeVote.votes).length
        };
        
        this.state.activeVote = null;
        this.state.phase = 'idle';
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nw-dnd-vote-end', { detail: result }));
        }
        
        return result;
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // BETTING SYSTEM
    // ═══════════════════════════════════════════════════════════════════
    
    openBetting(duration = 15000) {
        this.state.activeBets = [];
        this.state.bettingPool = 0;
        
        this.addNarrative('bet', `\n💰 BETTING IS OPEN! ${duration/1000} seconds to place your bets!`);
        this.addNarrative('bet', `   🟢 Bet on PARTY to win`);
        this.addNarrative('bet', `   🔴 Bet on ENEMIES to win`);
        
        // Auto-close betting after duration
        setTimeout(() => {
            this.closeBetting();
        }, duration);
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nw-dnd-betting-open', { detail: { duration } }));
        }
    },
    
    placeBet(userId, amount, side) { // side: 'party' or 'enemies'
        if (this.state.phase !== 'combat') return { success: false, error: 'Betting closed' };
        if (amount <= 0) return { success: false, error: 'Invalid amount' };
        
        // Check if user already bet
        const existingBet = this.state.activeBets.find(b => b.userId === userId);
        if (existingBet) {
            return { success: false, error: 'Already placed a bet' };
        }
        
        this.state.activeBets.push({
            userId,
            amount,
            side,
            timestamp: Date.now()
        });
        
        this.state.bettingPool += amount;
        
        this.addNarrative('bet', `💵 ${userId} bets ${amount} NWG on ${side.toUpperCase()}!`);
        
        return { success: true, pool: this.state.bettingPool };
    },
    
    closeBetting() {
        this.addNarrative('bet', `🔒 BETTING CLOSED! Total pool: ${this.state.bettingPool} NWG`);
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nw-dnd-betting-closed', { 
                detail: { pool: this.state.bettingPool, bets: this.state.activeBets.length }
            }));
        }
    },
    
    resolveBets(winner) { // 'party' or 'enemies'
        if (this.state.activeBets.length === 0) return;
        
        const winners = this.state.activeBets.filter(b => b.side === winner);
        const losers = this.state.activeBets.filter(b => b.side !== winner);
        
        const loserPool = losers.reduce((sum, b) => sum + b.amount, 0);
        const winnerPool = winners.reduce((sum, b) => sum + b.amount, 0);
        
        if (winners.length === 0) {
            this.addNarrative('bet', `😱 NO ONE BET ON ${winner.toUpperCase()}! House wins ${this.state.bettingPool} NWG!`);
            return;
        }
        
        // Calculate payouts (proportional to bet amount)
        const payouts = [];
        winners.forEach(bet => {
            const share = bet.amount / winnerPool;
            const winnings = Math.floor(bet.amount + (loserPool * share));
            payouts.push({ userId: bet.userId, bet: bet.amount, winnings: winnings });
        });
        
        this.addNarrative('bet', `\n🎰 BET RESULTS (${winner.toUpperCase()} WINS!):`);
        payouts.forEach(p => {
            this.addNarrative('bet', `   💰 ${p.userId}: +${p.winnings} NWG (${p.winnings - p.bet} profit)`);
        });
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nw-dnd-betting-resolved', { 
                detail: { winner, payouts, pool: this.state.bettingPool }
            }));
        }
        
        this.state.activeBets = [];
        this.state.bettingPool = 0;
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // TIP/DONATION EVENTS
    // ═══════════════════════════════════════════════════════════════════
    
    tipEvents: [
        { minAmount: 10, event: 'heal', desc: 'A mysterious benefactor heals the party!' },
        { minAmount: 25, event: 'buff', desc: 'Divine blessing! Party gains +2 to all rolls!' },
        { minAmount: 50, event: 'smite', desc: 'Lightning from the heavens! Enemy takes massive damage!' },
        { minAmount: 100, event: 'revive', desc: 'Miraculous resurrection! A fallen hero returns!' },
        { minAmount: 200, event: 'legendary', desc: 'A LEGENDARY item appears!' },
        { minAmount: 500, event: 'boss', desc: 'THE TIPPER SUMMONS A BONUS BOSS!' }
    ],
    
    processTip(userId, amount) {
        // Find the highest tier event for this amount
        const eligibleEvents = this.tipEvents.filter(e => amount >= e.minAmount);
        if (eligibleEvents.length === 0) {
            this.addNarrative('tip', `💵 ${userId} tips ${amount} NWG! Thank you!`);
            return;
        }
        
        const event = eligibleEvents[eligibleEvents.length - 1]; // Highest tier
        
        this.addNarrative('tip', `\n🎁 ${userId} TIPS ${amount} NWG!`);
        this.addNarrative('tip', `✨ ${event.desc}`);
        
        // Apply event effect
        switch (event.event) {
            case 'heal':
                this.state.party.forEach(p => {
                    if (p.isAlive) {
                        p.currentHP = Math.min(p.maxHP, p.currentHP + 20);
                    }
                });
                break;
            case 'buff':
                this.state.party.forEach(p => {
                    p.conditions.push({ name: 'Blessed', duration: 3, bonus: 2 });
                });
                break;
            case 'smite':
                if (this.state.currentEncounter?.enemies) {
                    const target = this.state.currentEncounter.enemies.find(e => e.currentHP > 0);
                    if (target) {
                        const damage = this.rollDice('6d10').total;
                        target.currentHP = Math.max(0, target.currentHP - damage);
                        this.addNarrative('dm', `⚡ DIVINE SMITE! ${target.name} takes ${damage} damage!`);
                    }
                }
                break;
            case 'revive':
                const fallen = this.state.party.find(p => !p.isAlive);
                if (fallen) {
                    fallen.isAlive = true;
                    fallen.currentHP = Math.floor(fallen.maxHP / 2);
                    this.addNarrative('dm', `✨ ${fallen.name} RISES FROM THE DEAD!`);
                }
                break;
            case 'boss':
                this.addNarrative('system', `\n⚠️ A BONUS BOSS APPROACHES!`);
                this.state.pendingEvents.push({ type: 'boss', source: userId });
                break;
        }
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nw-dnd-tip', { 
                detail: { userId, amount, event: event.event }
            }));
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // MVP LEADERBOARD
    // ═══════════════════════════════════════════════════════════════════
    
    updateMVPStats() {
        this.state.party.forEach(char => {
            if (!this.state.mvpStats[char.id]) {
                this.state.mvpStats[char.id] = {
                    name: char.name,
                    cardId: char.cardData.id,
                    totalKills: 0,
                    totalDamage: 0,
                    totalHealing: 0,
                    totalXP: 0,
                    encountersParticipated: 0,
                    mvpWins: 0
                };
            }
            
            const stats = this.state.mvpStats[char.id];
            stats.totalKills += char.kills || 0;
            stats.totalDamage += char.damageDealt || 0;
            stats.totalHealing += char.healingDone || 0;
            stats.totalXP += char.xp || 0;
            stats.encountersParticipated++;
        });
        
        // Determine MVP of the encounter
        const mvp = this.state.party.reduce((best, char) => {
            const score = (char.kills || 0) * 100 + (char.damageDealt || 0) + (char.healingDone || 0) * 1.5;
            const bestScore = (best.kills || 0) * 100 + (best.damageDealt || 0) + (best.healingDone || 0) * 1.5;
            return score > bestScore ? char : best;
        }, this.state.party[0]);
        
        if (mvp && this.state.mvpStats[mvp.id]) {
            this.state.mvpStats[mvp.id].mvpWins++;
            this.addNarrative('system', `🏆 MVP: ${mvp.name}! (${mvp.kills || 0} kills, ${mvp.damageDealt || 0} damage)`);
        }
        
        // Reset encounter stats
        this.state.party.forEach(char => {
            char.kills = 0;
            char.damageDealt = 0;
            char.healingDone = 0;
            char.abilityUsed = false;
        });
    },
    
    getMVPLeaderboard() {
        return Object.values(this.state.mvpStats)
            .sort((a, b) => b.mvpWins - a.mvpWins || b.totalDamage - a.totalDamage)
            .slice(0, 10);
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // AUTO-PLAY LOOP (For continuous spectator experience)
    // ═══════════════════════════════════════════════════════════════════
    
    autoPlayInterval: null,
    autoPlaySpeed: 3000, // ms between actions
    
    startAutoPlay(speed = 3000) {
        this.autoPlaySpeed = speed;
        
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
        }
        
        this.autoPlayInterval = setInterval(() => {
            this.autoPlayTick();
        }, this.autoPlaySpeed);
        
        this.addNarrative('system', `🎮 AUTO-PLAY STARTED! Action every ${speed/1000}s`);
        
        // Start first encounter if idle
        if (this.state.phase === 'idle') {
            this.autoPlayTick();
        }
    },
    
    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
        this.addNarrative('system', `⏸️ AUTO-PLAY PAUSED`);
    },
    
    autoPlayTick() {
        switch (this.state.phase) {
            case 'idle':
                // Decide what to do next
                const roll = Math.random();
                if (roll < 0.7) {
                    // Start combat
                    const isBoss = Math.random() < 0.15;
                    this.startCombat(isBoss ? 'boss' : 'random');
                } else if (roll < 0.85) {
                    // Start a vote
                    const voteType = ['path', 'action', 'treasure'][Math.floor(Math.random() * 3)];
                    this.startVote(voteType, 20000);
                } else {
                    // Exploration narrative
                    this.addNarrative('dm', this.fillTemplate(this.getTemplate('exploration', 'discovery'), {
                        character: this.state.party[Math.floor(Math.random() * this.state.party.length)].name
                    }));
                    
                    // Maybe change location
                    if (Math.random() < 0.3) {
                        this.state.currentLocation = this.locations[Math.floor(Math.random() * this.locations.length)];
                        this.addNarrative('dm', this.fillTemplate(this.getTemplate('exploration', 'enter'), {
                            location: this.state.currentLocation.name
                        }));
                    }
                }
                break;
                
            case 'combat':
                this.processCombatTurn();
                break;
                
            case 'voting':
                // Just wait for vote to resolve
                break;
                
            case 'resolution':
                // Transition back to idle
                this.state.phase = 'idle';
                break;
        }
        
        // Process pending events
        if (this.state.pendingEvents.length > 0 && this.state.phase === 'idle') {
            const event = this.state.pendingEvents.shift();
            if (event.type === 'boss') {
                this.addNarrative('dm', `\n⚠️ ${event.source}'s BONUS BOSS APPEARS!`);
                this.startCombat('boss');
            }
        }
    },
    
    // Get current game state for UI
    getGameState() {
        return {
            phase: this.state.phase,
            party: this.state.party,
            location: this.state.currentLocation,
            encounter: this.state.currentEncounter,
            turn: this.state.turn,
            round: this.state.round,
            narrativeLog: this.state.narrativeLog.slice(-20),
            combatLog: this.state.combatLog.slice(-10),
            activeVote: this.state.activeVote,
            bettingPool: this.state.bettingPool,
            activeBets: this.state.activeBets.length,
            mvpLeaderboard: this.getMVPLeaderboard(),
            stats: {
                encountersCompleted: this.state.encountersCompleted,
                bossesDefeated: this.state.bossesDefeated,
                totalXP: this.state.totalXPEarned
            }
        };
    }
};

// Export for browser and Node
if (typeof window !== 'undefined') {
    window.NW_DND = NW_DND;
}
if (typeof module !== 'undefined') {
    module.exports = NW_DND;
}
