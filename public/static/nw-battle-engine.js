// ═══════════════════════════════════════════════════════════════════════════
// NUMBAHWAN TCG — BATTLE ARENA v5.0
// The Funnest Card Game on the Internet — Full Abilities, Synergies, Comedy
// ═══════════════════════════════════════════════════════════════════════════

// Difficulty selection (called from HTML buttons)
window.selectDifficulty = function(diff) {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector(`[data-diff="${diff}"]`)?.classList.add('selected');
    window._selectedDifficulty = diff;
    const names = { casual: ['Sleepy Bot','AFK Andy','Tutorial Tim'], ranked: ['Try-Hard Tina','Meta Knight','Synergy Sam'], boss: ['RegginA, The Eternal Flame','The Mythic Overlord','Guild Destroyer'] };
    const avatars = { casual:'🤖', ranked:'🏆', boss:'💀' };
    const subs = { casual:'Plays random cards, vibes only', ranked:'Uses synergies, targets smart', boss:'Mythic cards, boss HP, no mercy' };
    const n = names[diff] || names.casual;
    document.getElementById('enemyAvatar').textContent = avatars[diff] || '🤖';
    document.getElementById('enemyName').textContent = n[Math.floor(Math.random()*n.length)];
    document.getElementById('enemySubtitle').textContent = subs[diff] || '';
};

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════
    // NW HELPER INTEGRATION
    // ═══════════════════════════════════════════════════════════════════
    const NW_AUDIO_MAP = {
        cardSlam:'slam', attack:'attack', hit:'attack', crit:'crit',
        death:'death', select:'select', turnEnd:'turnEnd', victory:'victory',
        defeat:'defeat', countdown:'tick', fight:'fightStart', energy:'energy', draw:'draw'
    };
    function playSound(type) {
        if (typeof NW_AUDIO !== 'undefined' && NW_AUDIO.play) { NW_AUDIO.play(NW_AUDIO_MAP[type]||type); return; }
        if (Audio.play) Audio.play(type);
    }
    function showToast(msg, type='info') {
        if (typeof NW_UI !== 'undefined' && NW_UI.toast) { NW_UI.toast(msg, {type}); return; }
        console.log(`[${type}]`, msg);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONFIG
    // ═══════════════════════════════════════════════════════════════════
    const CONFIG = {
        MAX_GUILD_HP: 30, MAX_BOARD: 5, MAX_HAND: 7, STARTING_HAND: 4,
        MAX_ENERGY: 10, DECK_SIZE: 15,
        CARD_SLAM_DURATION: 500, ATTACK_DURATION: 600, HIT_DURATION: 400,
        DEATH_DURATION: 800, ABILITY_DURATION: 600, SYNERGY_BANNER_DURATION: 2000,
        MASTER_VOLUME: 0.7
    };

    const BOSS_CONFIG = { hp: 45, extraCards: 3, bonusAtk: 3, bonusHp: 5 };

    // ═══════════════════════════════════════════════════════════════════
    // COMEDY ANNOUNCER
    // ═══════════════════════════════════════════════════════════════════
    const ANNOUNCER = {
        battleStart: [
            '3... 2... 1... NUMBAHWAN!', 'Welcome to the Age of Alimony!',
            'May the best guild win. (It\'s us.)', 'CARDS ON THE TABLE. EGOS ON THE LINE.',
            'Divorced Dads: Age of Alimony — ROUND 1!', 'Your cards vs their cards. Somebody\'s getting custody.',
        ],
        critHit: [
            'CRITICAL HIT! That\'s gonna leave a mark!', 'OUCH. Someone call the healer.',
            'THE DISRESPECT! Absolute carry diff.', 'NUMBAHWAN DAMAGE RIGHT THERE!',
            'EMOTIONAL DAMAGE!', 'That crit was personal.',
        ],
        dodge: [
            'DODGED! Matrix style!', 'Can\'t hit what you can\'t see!',
            'AFK and still dodging. Legend.', 'That card has better reflexes than my guild attendance.',
            'MISS! Skill issue.', 'Dodged like rent day.',
        ],
        shield: [
            'BLOCKED! Not today, buddy.', 'Shield absorbed it all! Skill issue.',
            'The wall holds! Try harder.', 'DENIED. Read the ability text.',
        ],
        lifesteal: [
            'LIFESTEAL! Draining the opposition!', 'Vampiric energy. Love to see it.',
            'Healing off your tears.', 'That\'s called self-care in combat.',
        ],
        selfDestruct: [
            'SELF DESTRUCT! Taking everyone down!', 'IF I\'M GOING DOWN, YOU\'RE COMING WITH ME!',
            '"This game is trash" *explodes*', 'RAGE QUIT: THE CARD. KABOOM!',
            'The ultimate spite play!',
        ],
        stealth: [
            'Vanished into the shadows...', 'Gone. Like my guild members during boss fights.',
            'Now you see me... actually no, you don\'t.',
        ],
        heal: [
            'Healing up! Guild mom energy.', 'Band-aid applied. We go again.',
            'HP restored! Did you eat? Did you pot?', 'Guild parent says take your potion.',
        ],
        buff: [
            'BUFFED! The team is POWERED UP!', '+2/+2! That\'s called investment.',
            'Rising tide lifts all boats. Or cards.', 'TEAM BUFF! We\'re all gonna make it.',
        ],
        debuff: [
            'DEBUFFED! Enemy team feeling weak!', 'Your ATK got nerfed. Patch notes: skill issue.',
            'Weakness applied. Should\'ve stretched.', 'NERF\'D. Balance patch applied mid-game.',
        ],
        taunt: [
            'TAUNT active! Come at me, bro!', 'All eyes on the tank. As intended.',
            'You MUST attack the tank. Guild rules.', 'AGGRO PULLED. Try getting past this.',
        ],
        synergy: [
            'SYNERGY ACTIVATED! This changes EVERYTHING!', 'THE COMBO! Did you read the card text?!',
            'WOMBO COMBO! That\'s called deckbuilding!', 'Synergy online! The meta is evolving!',
        ],
        setBonus: [
            'SET BONUS ONLINE! The collection pays off!', 'Thematic power UNLOCKED!',
            'Running a REAL deck. Not just goodstuff.', 'SET COMPLETE! Now we\'re cooking!',
        ],
        playerCardDeath: [
            'We lost one! Fight harder!', 'Card down! But the guild lives on!',
            'They will be remembered. At the next guild meeting.',
        ],
        enemyCardDeath: [
            'DESTROYED! Get that outta here!', 'Enemy card eliminated! NEXT!',
            'And STAY down!', 'That card just got uninstalled.',
        ],
        lowHP: [
            'HP CRITICAL! This is do or die!', 'ONE HIT FROM DEATH! My palms are sweating!',
            'CLUTCH TIME! Channel your inner RegginA!',
        ],
        victory: [
            'VICTORY! NUMBAHWAN! NUMBAHWAN! NUMBAHWAN!', 'WE DID IT! Guild Mom would be proud!',
            'GG EZ. (It was not easy.)', 'THE GUILD STANDS SUPREME!',
        ],
        defeat: [
            'Defeat... but we\'ll be back.', 'That\'s rough. Queue up again?',
            'We lost the battle, not the war. REMATCH!', 'Pain. Suffering. Mostly pain.',
        ],
        turnStart: [
            'Your move, strategist.', 'Cards ready. Board waiting. Make it count.',
            'Energy refilled! Time to cook.', 'New turn, new opportunities!',
        ],
        comeback: ['THE COMEBACK IS REAL!', 'FROM THE BRINK! NEVER GIVE UP!', 'DOWN BUT NOT OUT!'],
        rushPlay: ['RUSH! Attacking IMMEDIATELY!', 'No summoning sickness! CHARGE!', 'RUSH card goes NOW!'],
        goFace: [
            'GOING FACE! ALL IN!', 'FACE IS THE PLACE!', 'SMOrc! ME GO FACE!',
            'Who needs to trade when you can GO FACE?!', 'The only valid target is the enemy guild!',
        ],
        combo: [
            'COMBO x${n}! UNSTOPPABLE!', '${n} HIT COMBO! They can\'t recover!',
            'COMBO CITY! Population: ${n} hits!',
        ],
        bossEntry: [
            'A BOSS APPROACHES! May the guild have mercy on your soul.',
            'BOSS FIGHT! This is the real endgame.',
            'The ground shakes... a MYTHIC BOSS enters the arena!',
        ],
    };
    function announce(cat, vars) {
        const lines = ANNOUNCER[cat];
        if (!lines || !lines.length) return '';
        let line = lines[Math.floor(Math.random() * lines.length)];
        if (vars) Object.entries(vars).forEach(([k,v]) => { line = line.replace('${'+k+'}', v); });
        return line;
    }

    // ═══════════════════════════════════════════════════════════════════
    // GAME STATE
    // ═══════════════════════════════════════════════════════════════════
    const gameState = {
        playerHP: CONFIG.MAX_GUILD_HP, enemyHP: CONFIG.MAX_GUILD_HP,
        energy: 1, maxEnergy: 1, turn: 1, isPlayerTurn: true,
        playerHand: [], playerBoard: [null,null,null,null,null],
        enemyHand: [], enemyBoard: [null,null,null,null,null],
        playerDeck: [], enemyDeck: [],
        playerSynergies: [], enemySynergies: [],
        playerSetBonuses: [], enemySetBonuses: [],
        selectedCard: null, isAnimating: false,
        difficulty: 'casual', comboCount: 0,
        stats: {
            cardsPlayed:0, damageDealt:0, damageHealed:0, cardsKilled:0,
            critsLanded:0, dodgesTriggered:0, shieldsBlocked:0, abilitiesFired:0,
            synergiesActivated:0, turnCount:0, comebackTriggered:false,
            faceDamage:0, maxCombo:0,
        },
    };
    let CARDS = [];

    // ═══════════════════════════════════════════════════════════════════
    // PERSISTENCE — XP, Wins, Streaks
    // ═══════════════════════════════════════════════════════════════════
    function getProfile() {
        try { return JSON.parse(localStorage.getItem('nw_battle_profile') || 'null') || { xp:0, level:1, wins:0, losses:0, streak:0, bestStreak:0, totalBattles:0 }; }
        catch(e) { return { xp:0, level:1, wins:0, losses:0, streak:0, bestStreak:0, totalBattles:0 }; }
    }
    function saveProfile(p) { try { localStorage.setItem('nw_battle_profile', JSON.stringify(p)); } catch(e){} }
    function xpForLevel(lvl) { return 80 + (lvl * 20); }

    // ═══════════════════════════════════════════════════════════════════
    // AUDIO
    // ═══════════════════════════════════════════════════════════════════
    const Audio = {
        ctx:null, buffers:{}, volume:0.8, muted:false,
        files: {
            cardSlam:'/static/audio/card-slam-heavy.mp3', attack:'/static/audio/attack-slash.mp3',
            hit:'/static/audio/attack-slash.mp3', crit:'/static/audio/critical-hit.mp3',
            death:'/static/audio/card-death.mp3', select:'/static/audio/ui-select.mp3',
            turnEnd:'/static/audio/turn-end.mp3', victory:'/static/audio/victory.mp3',
            defeat:'/static/audio/defeat.mp3', countdown:'/static/audio/countdown-tick.mp3',
            fight:'/static/audio/fight-start.mp3', energy:'/static/audio/energy-gain.mp3',
            draw:'/static/audio/card-draw.mp3',
        },
        async init() {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                await Promise.all(Object.entries(this.files).map(async ([name, path]) => {
                    try { const r = await fetch(path); this.buffers[name] = await this.ctx.decodeAudioData(await r.arrayBuffer()); }
                    catch(e) { console.warn('[AUDIO] Failed:', name); }
                }));
            } catch(e) { console.warn('[AUDIO] No Web Audio'); }
        },
        play(type) {
            if (this.muted || !this.ctx) return;
            const buf = this.buffers[type]; if (!buf) return;
            try {
                if (this.ctx.state === 'suspended') this.ctx.resume();
                const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
                src.buffer = buf; g.gain.value = this.volume;
                src.connect(g); g.connect(this.ctx.destination); src.start(0);
            } catch(e){}
        },
        toggle() { this.muted = !this.muted; return !this.muted; }
    };

    // ═══════════════════════════════════════════════════════════════════
    // VISUAL EFFECTS
    // ═══════════════════════════════════════════════════════════════════
    const Effects = {
        screenShake(intensity='normal') {
            const c = document.getElementById('arenaContainer');
            c.classList.remove('shaking','shaking-heavy'); void c.offsetWidth;
            c.classList.add(intensity === 'heavy' ? 'shaking-heavy' : 'shaking');
            setTimeout(() => c.classList.remove('shaking','shaking-heavy'), 500);
        },
        screenFlash(color='#fff') {
            const f = document.getElementById('screenFlash');
            f.style.background = color; f.classList.remove('active'); void f.offsetWidth;
            f.classList.add('active'); setTimeout(() => f.classList.remove('active'), 300);
        },
        impactRing(x, y, color='#ffd700') {
            const r = document.createElement('div'); r.className = 'impact-ring';
            r.style.cssText = `left:${x}px;top:${y}px;width:50px;height:50px;border-color:${color}`;
            document.body.appendChild(r); setTimeout(() => r.remove(), 500);
        },
        showDamage(el, val, isCrit=false, isHeal=false) {
            const rect = el.getBoundingClientRect(), d = document.createElement('div');
            d.className = `damage-number${isCrit?' crit':''}${isHeal?' heal':''}`;
            d.textContent = isHeal ? `+${val}` : `-${val}`;
            d.style.left = rect.left + rect.width/2 + (Math.random()-0.5)*30 + 'px';
            d.style.top = rect.top + rect.height/3 + 'px';
            document.body.appendChild(d); setTimeout(() => d.remove(), 1200);
        },
        showMiss(el) {
            const rect = el.getBoundingClientRect(), m = document.createElement('div');
            m.className = 'damage-number miss'; m.textContent = 'DODGE!';
            m.style.left = rect.left + rect.width/2 + 'px'; m.style.top = rect.top + rect.height/3 + 'px';
            document.body.appendChild(m); setTimeout(() => m.remove(), 1200);
        },
        showAbilityText(el, text, color='#00ffff') {
            const rect = el.getBoundingClientRect(), e = document.createElement('div');
            e.className = 'damage-number ability-pop'; e.textContent = text;
            e.style.cssText = `left:${rect.left+rect.width/2}px;top:${rect.top-10}px;color:${color};font-size:14px;font-weight:800;text-shadow:0 0 10px ${color}`;
            document.body.appendChild(e); setTimeout(() => e.remove(), 1500);
        },
        showSynergyBanner(text, flavor) {
            const b = document.createElement('div'); b.className = 'synergy-banner';
            b.innerHTML = `<div class="synergy-title">${text}</div><div class="synergy-flavor">${flavor||''}</div>`;
            b.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);z-index:99999;padding:20px 40px;background:linear-gradient(135deg,rgba(255,215,0,0.95),rgba(255,107,0,0.9));color:#000;font-family:'Orbitron',sans-serif;text-align:center;border-radius:16px;box-shadow:0 0 60px rgba(255,215,0,0.8);animation:synergyPop 2s ease forwards;pointer-events:none;`;
            document.body.appendChild(b); setTimeout(() => b.remove(), CONFIG.SYNERGY_BANNER_DURATION);
        },
        showCombo(n) {
            const c = document.getElementById('comboCounter');
            if (!c) return;
            c.textContent = `${n}x COMBO!`; c.classList.remove('show'); void c.offsetWidth;
            c.classList.add('show'); setTimeout(() => c.classList.remove('show'), 1500);
        },
        createParticles() {
            const c = document.getElementById('arenaParticles'); if (!c) return;
            for (let i = 0; i < 30; i++) {
                const p = document.createElement('div'); p.className = 'particle';
                p.style.left = Math.random()*100+'%'; p.style.animationDelay = Math.random()*20+'s';
                p.style.animationDuration = (15+Math.random()*10)+'s';
                const colors = ['#ffd700','#ff6b00','#a855f7','#00ffff'];
                p.style.background = colors[Math.floor(Math.random()*colors.length)];
                p.style.width = (2+Math.random()*4)+'px'; p.style.height = p.style.width;
                c.appendChild(p);
            }
        }
    };

    // Inject extra CSS
    if (!document.getElementById('nw-battle-extra-css')) {
        const s = document.createElement('style'); s.id = 'nw-battle-extra-css';
        s.textContent = `
            @keyframes synergyPop { 0%{transform:translate(-50%,-50%) scale(0);opacity:0} 15%{transform:translate(-50%,-50%) scale(1.15);opacity:1} 25%{transform:translate(-50%,-50%) scale(1)} 80%{transform:translate(-50%,-50%) scale(1);opacity:1} 100%{transform:translate(-50%,-50%) scale(0.8);opacity:0} }
            .synergy-banner .synergy-title{font-size:clamp(16px,4vw,24px);font-weight:900;letter-spacing:2px}
            .synergy-banner .synergy-flavor{font-size:clamp(10px,2.5vw,14px);margin-top:8px;font-style:italic;opacity:0.8;font-family:'Inter',sans-serif}
            .ability-pop{font-size:14px!important} .status-icon{display:inline-block;font-size:12px;margin:1px;filter:drop-shadow(0 0 4px currentColor)}
            .board-card .status-row{position:absolute;bottom:28px;left:0;right:0;display:flex;justify-content:center;gap:2px;pointer-events:none;z-index:5}
            .board-card.stealthed{opacity:0.5;filter:blur(0.5px)} .board-card.taunting{box-shadow:0 0 12px rgba(255,215,0,0.5)!important}
            .stat-box.buffed{color:#22c55e!important;text-shadow:0 0 6px rgba(34,197,94,0.5)} .stat-box.damaged{color:#ef4444!important}
        `;
        document.head.appendChild(s);
    }

    // ═══════════════════════════════════════════════════════════════════
    // BOARD CARD INIT — All 12 Abilities Wired
    // ═══════════════════════════════════════════════════════════════════
    function initBoardCard(card) {
        const abilities = card.gameStats?.abilities || [];
        const bc = {
            ...card,
            instanceId: Date.now() + Math.random(),
            currentAtk: card.gameStats.atk,
            currentHp: card.gameStats.hp,
            maxHp: card.gameStats.hp,
            baseCrit: card.gameStats.crit || 0,
            baseDodge: card.gameStats.dodge || 0,
            canAttackThisTurn: abilities.includes('RUSH'),
            hasAttacked: false,
            hasShield: abilities.includes('SHIELD'),
            hasTaunt: abilities.includes('TAUNT'),
            hasLifesteal: abilities.includes('LIFESTEAL'),
            hasSelfDestruct: abilities.includes('SELF_DESTRUCT'),
            hasHeal: abilities.includes('HEAL'),
            hasBuff: abilities.includes('BUFF'),
            hasDebuff: abilities.includes('DEBUFF'),
            hasStealth: abilities.includes('STEALTH'),
            hasDodgeBoost: abilities.includes('DODGE_BOOST'),
            hasCritBoost: abilities.includes('CRIT_BOOST'),
            stealthTurns: abilities.includes('STEALTH') ? 1 : 0,
            debuffTurnsLeft: abilities.includes('DEBUFF') ? 2 : 0,
            critBonus: abilities.includes('CRIT_BOOST') ? 15 : 0,
            dodgeBonus: abilities.includes('DODGE_BOOST') ? 10 : 0,
            synergyAtkBonus:0, synergyHpBonus:0, synergyCritBonus:0, synergyDodgeBonus:0,
            autoHealPct:0, reviveOnce:false, reviveUsed:false,
        };
        // Boss difficulty: buff enemy cards
        if (gameState.difficulty === 'boss' && !bc._isPlayer) {
            bc.currentAtk += BOSS_CONFIG.bonusAtk;
            bc.currentHp += BOSS_CONFIG.bonusHp;
            bc.maxHp += BOSS_CONFIG.bonusHp;
        }
        return bc;
    }

    // ═══════════════════════════════════════════════════════════════════
    // SET BONUS & SYNERGY ENGINE
    // ═══════════════════════════════════════════════════════════════════
    function computeBoardSynergies(board, isPlayer) {
        const activeSynergies = [], activeSetBonuses = [];
        const cards = board.filter(c => c !== null);
        if (!cards.length) return { synergies:[], setBonuses:[] };

        const setCounts = {};
        cards.forEach(c => { const s = c.set || c.category || 'core'; setCounts[s] = (setCounts[s]||0)+1; });

        if (typeof NW_SET_BONUSES !== 'undefined') {
            for (const [setName, setDef] of Object.entries(NW_SET_BONUSES)) {
                const count = setCounts[setName] || 0;
                for (const bonus of setDef.bonuses) {
                    if (count >= bonus.count) activeSetBonuses.push({ set:setName, name:setDef.name, desc:bonus.desc, effect:bonus.effect });
                }
            }
        }

        const roleCounts = {}, cardIds = new Set();
        cards.forEach(c => { if (c.role) roleCounts[c.role] = (roleCounts[c.role]||0)+1; cardIds.add(c.id); });

        if (typeof NW_ROLE_SYNERGIES !== 'undefined') {
            for (const [key, syn] of Object.entries(NW_ROLE_SYNERGIES)) {
                let active = false;
                if (syn.requires.role && roleCounts[syn.requires.role] >= syn.requires.count) active = true;
                if (syn.requires.roles) active = syn.requires.roles.every(r => roleCounts[r] >= (syn.requires.minEach||1));
                if (syn.requires.cards) active = syn.requires.cards.every(id => cardIds.has(id));
                if (active) activeSynergies.push({ key, name:syn.name, desc:syn.desc, flavor:syn.flavorText, effect:syn.effect });
            }
        }
        return { synergies:activeSynergies, setBonuses:activeSetBonuses };
    }

    function applyBoardBonuses(board, synergies, setBonuses, isPlayer) {
        const cards = board.filter(c => c !== null);
        cards.forEach(c => { c.synergyAtkBonus=0; c.synergyHpBonus=0; c.synergyCritBonus=0; c.synergyDodgeBonus=0; c.autoHealPct=0; });

        for (const sb of setBonuses) {
            const fx = sb.effect;
            if (fx.teamAtkBonus && !fx.reactGamble && !fx.sovereignGamble && !fx.fullSetConditional) cards.forEach(c => c.synergyAtkBonus += Math.ceil(c.currentAtk * fx.teamAtkBonus));
            if (fx.teamHpBonus) cards.forEach(c => c.synergyHpBonus += Math.ceil(c.maxHp * fx.teamHpBonus));
            if (fx.teamCritBonus) cards.forEach(c => c.synergyCritBonus += fx.teamCritBonus * 100);
            if (fx.teamDodgeBonus) cards.forEach(c => c.synergyDodgeBonus += fx.teamDodgeBonus * 100);
            if (fx.firstDeathRevive) cards.forEach(c => c.reviveOnce = true);
            if (fx.tauntGainsShield) cards.filter(c => c.hasTaunt).forEach(c => c.hasShield = true);
            if (fx.setGainsRush) cards.filter(c => (c.set||c.category||'core') === sb.set).forEach(c => c.canAttackThisTurn = true);
            if (fx.setGainsShield) cards.filter(c => (c.set||c.category||'core') === sb.set).forEach(c => c.hasShield = true);
            if (fx.teamHpPenalty) cards.forEach(c => c.synergyHpBonus -= Math.ceil(c.maxHp * fx.teamHpPenalty));
            if (fx.teamAtkPenalty) cards.forEach(c => c.synergyAtkBonus -= Math.ceil(c.currentAtk * fx.teamAtkPenalty));
            if (fx.reactGamble) {
                if (Math.random() < 0.50) { cards.forEach(c => c.synergyCritBonus += 5); addLog(`${isPlayer?'Your':'Enemy'} "React Harder" PROCS! +5% Crit!`, 'ability'); }
                else addLog(`${isPlayer?'Your':'Enemy'} "React Harder" fizzles... Chat disappointed.`, 'ability');
            }
            if (fx.sovereignGamble) {
                if (Math.random() < 0.70) { cards.forEach(c => { c.synergyAtkBonus += Math.ceil(c.currentAtk*fx.gambleBonus); c.synergyHpBonus += Math.ceil(c.maxHp*fx.gambleBonus); }); addLog(`Bald Sovereign's Plea SUCCEEDS! +15% all stats!`, 'ability'); }
                else { cards.forEach(c => c.synergyAtkBonus -= Math.ceil(c.currentAtk*(fx.gamblePenalty||0.10))); addLog(`Chat trolled the Sovereign! -10% ATK!`, 'damage'); }
            }
        }

        for (const syn of synergies) {
            const fx = syn.effect;
            if (fx.roleAtkBonus) { const targets = syn.key==='carry_duo' ? cards.filter(c=>c.role==='carry') : cards; targets.forEach(c => c.synergyAtkBonus += Math.ceil(c.currentAtk*fx.roleAtkBonus)); }
            if (fx.roleHpBonus) cards.forEach(c => c.synergyHpBonus += Math.ceil(c.maxHp*fx.roleHpBonus));
            if (fx.roleDodgeBonus) cards.forEach(c => c.synergyDodgeBonus += fx.roleDodgeBonus*100);
            if (fx.roleAllStatsBonus) cards.forEach(c => { c.synergyAtkBonus += Math.ceil(c.currentAtk*fx.roleAllStatsBonus); c.synergyHpBonus += Math.ceil(c.maxHp*fx.roleAllStatsBonus); });
            if (fx.roleAutoHeal || fx.teamAutoHeal || fx.afkAutoHeal) cards.forEach(c => c.autoHealPct += (fx.roleAutoHeal||fx.teamAutoHeal||fx.afkAutoHeal||0));
            if (fx.teamCritBonus) cards.forEach(c => c.synergyCritBonus += fx.teamCritBonus*100);
            if (fx.carryAtkBonus) cards.filter(c=>c.role==='carry').forEach(c => c.synergyAtkBonus += Math.ceil(c.currentAtk*fx.carryAtkBonus));
            if (fx.leechHpBonus) cards.filter(c=>c.role==='leech').forEach(c => c.synergyHpBonus += Math.ceil(c.maxHp*fx.leechHpBonus));
            if (fx.parentHpBonus) cards.filter(c=>c.role==='guild_parent').forEach(c => c.synergyHpBonus += Math.ceil(c.maxHp*fx.parentHpBonus));
            if (fx.randomEnemyAtkDebuff) {
                const enemyBoard = isPlayer ? gameState.enemyBoard : gameState.playerBoard;
                const enemies = enemyBoard.filter(c=>c);
                if (enemies.length) { const t = enemies[Math.floor(Math.random()*enemies.length)]; t.currentAtk = Math.max(1, Math.ceil(t.currentAtk*(1-fx.randomEnemyAtkDebuff))); }
            }
            if (fx.deathFuryBonus) cards.filter(c=>c.role==='rage_quitter').forEach(c => c._deathFury = fx.deathFuryBonus);
            if (fx.chaosRoll) cards.forEach(c => c._chaosRoll = true);
        }

        // Dodge boost team-wide
        cards.filter(c => c.hasDodgeBoost).forEach(() => cards.forEach(a => a.synergyDodgeBonus += 10));
        // Taunt HP bonus
        cards.filter(c => c.hasTaunt).forEach(c => c.synergyHpBonus += Math.ceil(c.maxHp*0.20));
        // Apply HP bonuses
        cards.forEach(c => { if (c.synergyHpBonus > 0 && c.maxHp === c.currentHp) { c.maxHp += c.synergyHpBonus; c.currentHp += c.synergyHpBonus; } });
    }

    function getEffectiveAtk(card) { return Math.max(1, card.currentAtk + (card.synergyAtkBonus||0)); }
    function getEffectiveCrit(card) { return (card.baseCrit||0) + (card.critBonus||0) + (card.synergyCritBonus||0); }
    function getEffectiveDodge(card) { return (card.baseDodge||0) + (card.dodgeBonus||0) + (card.synergyDodgeBonus||0); }

    // ═══════════════════════════════════════════════════════════════════
    // SYNERGY DISPLAY (shows active synergies below boards)
    // ═══════════════════════════════════════════════════════════════════
    function renderSynergyDisplay() {
        const pEl = document.getElementById('playerSynergyDisplay');
        const eEl = document.getElementById('enemySynergyDisplay');
        if (pEl) {
            const tags = [...gameState.playerSetBonuses.map(s=>`<span class="synergy-tag">${s.name}</span>`), ...gameState.playerSynergies.map(s=>`<span class="synergy-tag">${s.name}</span>`)];
            pEl.innerHTML = tags.join('');
        }
        if (eEl) {
            const tags = [...gameState.enemySetBonuses.map(s=>`<span class="synergy-tag enemy">${s.name}</span>`), ...gameState.enemySynergies.map(s=>`<span class="synergy-tag enemy">${s.name}</span>`)];
            eEl.innerHTML = tags.join('');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════════
    function renderHP() {
        const maxHP = gameState.difficulty === 'boss' ? BOSS_CONFIG.hp : CONFIG.MAX_GUILD_HP;
        const pPct = Math.max(0, gameState.playerHP / CONFIG.MAX_GUILD_HP * 100);
        const ePct = Math.max(0, gameState.enemyHP / maxHP * 100);
        document.getElementById('playerHpFill').style.width = pPct+'%';
        document.getElementById('enemyHpFill').style.width = ePct+'%';
        document.getElementById('playerHpValue').textContent = Math.max(0, gameState.playerHP);
        document.getElementById('enemyHpValue').textContent = Math.max(0, gameState.enemyHP);
        ['playerHpFill','playerHpValue'].forEach(id => { const e=document.getElementById(id); e.classList.toggle('low',pPct<=30); e.classList.toggle('mid',pPct>30&&pPct<=60); });
        ['enemyHpFill','enemyHpValue'].forEach(id => { const e=document.getElementById(id); e.classList.toggle('low',ePct<=30); e.classList.toggle('mid',ePct>30&&ePct<=60); });
        if (pPct <= 20 && pPct > 0) addLog(announce('lowHP'), 'ability');
    }

    function renderEnergy() {
        const c = document.getElementById('energyCrystals'); c.innerHTML = '';
        for (let i = 0; i < gameState.maxEnergy; i++) {
            const cr = document.createElement('div');
            cr.className = 'energy-crystal' + (i >= gameState.energy ? ' spent' : '');
            c.appendChild(cr);
        }
    }

    function renderTurnIndicator() {
        const i = document.getElementById('turnIndicator');
        i.textContent = gameState.isPlayerTurn ? 'YOUR TURN' : 'ENEMY TURN';
        i.className = 'turn-indicator ' + (gameState.isPlayerTurn ? 'your-turn' : 'enemy-turn');
    }

    function renderHand() {
        const container = document.getElementById('playerHand'); if (!container) return; container.innerHTML = '';
        console.log('[renderHand] cards:', gameState.playerHand.length);
        gameState.playerHand.forEach((card, idx) => {
            if (!card || !card.gameStats) { console.warn('[renderHand] skip card', idx, card); return; }
            const canPlay = card.gameStats.cost <= gameState.energy && gameState.isPlayerTurn;
            const el = document.createElement('div');
            el.className = `hand-card ${card.rarity||''}${canPlay?'':' unplayable'}${gameState.selectedCard===idx?' selected':''}`;
            el.dataset.idx = idx;
            const abilities = card.gameStats?.abilities || [];
            const icons = abilities.map(a => { const d = typeof NW_ABILITIES!=='undefined'?NW_ABILITIES[a]:null; return d?d.icon:''; }).filter(Boolean).join('');
            el.innerHTML = `<img class="hand-card-art" src="/static/images/cards/thumbs/${card.img||'placeholder.webp'}" onerror="this.onerror=null;this.src='/static/images/cards/placeholder.webp'" alt="${card.name}" draggable="false"><div class="hand-card-stats"><span class="hand-stat atk">⚔${card.gameStats.atk}</span><span class="hand-stat hp">❤${card.gameStats.hp}</span></div><div class="cost-badge">${card.gameStats.cost}</div>${icons?`<div style="position:absolute;bottom:2px;left:0;right:0;text-align:center;font-size:10px;pointer-events:none">${icons}</div>`:''}`;
            let tStart=0, tPos={x:0,y:0}, moved=false;
            el.addEventListener('touchstart', e => { tStart=Date.now(); tPos={x:e.touches[0].clientX,y:e.touches[0].clientY}; moved=false; if(canPlay) DragDrop.start(el,card,idx,e); }, {passive:false});
            el.addEventListener('touchmove', e => { if(!moved&&canPlay){const dx=Math.abs(e.touches[0].clientX-tPos.x),dy=Math.abs(e.touches[0].clientY-tPos.y);if(dx>10||dy>10)moved=true;} }, {passive:true});
            el.addEventListener('touchend', e => { if(Date.now()-tStart<150&&!moved&&!DragDrop.isDragging){e.preventDefault();showCardDetailModal(card,idx,'hand');} });
            el.addEventListener('click', () => { if(!DragDrop.isDragging&&!isMobileOrTablet()&&canPlay) selectHandCard(idx); });
            el.addEventListener('mousedown', e => { if(e.button===0&&canPlay) DragDrop.start(el,card,idx,e); });
            el.addEventListener('mouseenter', e => { if(!DragDrop.isDragging&&!isMobileOrTablet()) showTooltip(card,e); });
            el.addEventListener('mouseleave', hideTooltip);
            container.appendChild(el);
        });
        document.getElementById('handCount').textContent = `${gameState.playerHand.length}/${CONFIG.MAX_HAND}`;
    }

    function renderBoards() {
        document.getElementById('playerBoard').querySelectorAll('.board-slot').forEach((slot, idx) => renderBoardSlot(slot, gameState.playerBoard[idx], idx, false));
        document.getElementById('enemyBoard').querySelectorAll('.board-slot').forEach((slot, idx) => renderBoardSlot(slot, gameState.enemyBoard[idx], idx, true));
        updateFaceAttackZone();
    }

    function renderBoardSlot(slot, card, idx, isEnemy) {
        slot.classList.toggle('has-card', !!card);
        if (card) {
            const icons = [];
            if (card.hasShield) icons.push('<span class="status-icon" title="Shield">🔰</span>');
            if (card.hasTaunt) icons.push('<span class="status-icon" title="Taunt">🛡️</span>');
            if (card.stealthTurns > 0) icons.push('<span class="status-icon" title="Stealth">👻</span>');
            if (card.hasLifesteal) icons.push('<span class="status-icon" title="Lifesteal">🩸</span>');
            if (card.hasSelfDestruct) icons.push('<span class="status-icon" title="Self Destruct">💥</span>');
            if (card.hasHeal) icons.push('<span class="status-icon" title="Heal">💚</span>');
            if (card.hasDebuff && card.debuffTurnsLeft > 0) icons.push('<span class="status-icon" title="Debuff">☠️</span>');
            if (card.hasCritBoost) icons.push('<span class="status-icon" title="Crit Boost">🎯</span>');
            if (card.reviveOnce && !card.reviveUsed) icons.push('<span class="status-icon" title="Plot Armor">✨</span>');
            const eAtk = getEffectiveAtk(card);
            slot.innerHTML = `<div class="board-card ${card.rarity}${card.stealthTurns>0?' stealthed':''}${card.hasTaunt?' taunting':''}" data-instance="${card.instanceId}"><div class="board-card-inner"><img class="board-card-art" src="/static/images/cards/thumbs/${card.img||'placeholder.webp'}" onerror="this.onerror=null;this.src='/static/images/cards/placeholder.webp'" alt="${card.name}" ${card.stealthTurns>0?'style="opacity:0.4;filter:blur(1px)"':''}><div class="board-card-stats"><div class="stat-box stat-atk${card.synergyAtkBonus>0?' buffed':''}">⚔${eAtk}</div><div class="stat-box stat-hp${card.currentHp<card.maxHp?' damaged':''}">❤${card.currentHp}</div></div></div>${icons.length?`<div class="status-row">${icons.join('')}</div>`:''}</div>`;
            const cardEl = slot.querySelector('.board-card');
            cardEl.onmouseenter = e => showTooltip(card, e);
            cardEl.onmouseleave = hideTooltip;
            if (isEnemy) {
                slot.onclick = e => { if(isMobileOrTablet()){e.preventDefault();showCardDetailModal(card,idx,'board-enemy');} else attackTarget(idx); };
            } else {
                cardEl.onclick = e => { if(isMobileOrTablet()){e.preventDefault();e.stopPropagation();showCardDetailModal(card,idx,'board-player');} };
            }
        } else {
            slot.innerHTML = '';
            slot.onclick = isEnemy ? null : () => playCardToSlot(idx);
        }
    }

    function updateFaceAttackZone() {
        const zone = document.getElementById('faceAttackZone');
        if (!zone) return;
        const hasAttacker = gameState.playerBoard.some(c => c && c.canAttackThisTurn && !c.hasAttacked && c.stealthTurns <= 0);
        const enemyHasTaunt = gameState.enemyBoard.some(c => c && c.hasTaunt && c.stealthTurns <= 0);
        const canGoFace = hasAttacker && !enemyHasTaunt && gameState.isPlayerTurn && !gameState.isAnimating;
        zone.classList.toggle('active', canGoFace);
    }

    // ═══════════════════════════════════════════════════════════════════
    // TOOLTIP & CARD DETAIL MODAL
    // ═══════════════════════════════════════════════════════════════════
    const isMobileOrTablet = () => window.innerWidth <= 768 || 'ontouchstart' in window;
    let modalCard = null, modalCardIndex = null, modalCardSource = null;

    function showTooltip(card, event) {
        const t = document.getElementById('cardTooltip');
        document.getElementById('tooltipName').textContent = card.name;
        const re = document.getElementById('tooltipRarity'); re.textContent = (card.rarity||'common').toUpperCase(); re.className = 'tooltip-rarity '+(card.rarity||'common');
        document.getElementById('tooltipAtk').textContent = card.currentAtk != null ? getEffectiveAtk(card) : card.gameStats.atk;
        document.getElementById('tooltipHp').textContent = card.currentHp ?? card.gameStats.hp;
        document.getElementById('tooltipCost').textContent = card.gameStats.cost;
        const ae = document.getElementById('tooltipAbilities');
        const ab = card.gameStats?.abilities || card.abilities || [];
        ae.innerHTML = ab.length ? ab.map(a => { const d = typeof NW_ABILITIES!=='undefined'?NW_ABILITIES[a]:null; return `<span class="tooltip-ability">${d?d.icon+' ':''}${a}${d?': '+d.desc:''}</span>`; }).join('') : '<em style="opacity:0.5">No abilities</em>';
        const rect = event.target.getBoundingClientRect();
        let left = rect.right+10, top = rect.top;
        if (left+280 > window.innerWidth) left = rect.left-290;
        if (top+200 > window.innerHeight) top = window.innerHeight-210;
        t.style.left = left+'px'; t.style.top = top+'px'; t.classList.add('show');
    }
    function hideTooltip() { document.getElementById('cardTooltip').classList.remove('show'); }

    function showCardDetailModal(card, index, source) {
        modalCard=card; modalCardIndex=index; modalCardSource=source;
        const modal = document.getElementById('cardDetailModal');
        const img = document.getElementById('cardDetailImg');
        const imgC = document.getElementById('cardDetailImage');
        const imgFile = card.img?.replace(/\.(png|jpg)$/i, '.webp') || 'placeholder.webp';
        img.src = `/static/images/cards/${imgFile}`; img.onerror = () => { img.src = '/static/images/cards/placeholder.webp'; };
        imgC.className = 'card-detail-image '+(card.rarity||'common');
        document.getElementById('cardDetailName').textContent = card.name;
        const rEl = document.getElementById('cardDetailRarity'); rEl.textContent = (card.rarity||'common').toUpperCase(); rEl.className = 'card-detail-rarity '+(card.rarity||'common');
        document.getElementById('cardDetailAtk').textContent = card.currentAtk != null ? getEffectiveAtk(card) : card.gameStats?.atk ?? '?';
        document.getElementById('cardDetailHp').textContent = card.currentHp ?? card.gameStats?.hp ?? '?';
        document.getElementById('cardDetailCost').textContent = card.gameStats?.cost ?? '?';
        const abEl = document.getElementById('cardDetailAbilities');
        const ab = card.gameStats?.abilities || [];
        abEl.innerHTML = ab.length ? ab.map(a => { const d=typeof NW_ABILITIES!=='undefined'?NW_ABILITIES[a]:null; return `<span class="card-detail-ability">${d?d.icon+' ':''}${a}</span>`; }).join('') : '<span style="opacity:0.5;font-style:italic">No special abilities</span>';
        const actEl = document.getElementById('cardDetailActions'), selBtn = document.getElementById('cardDetailSelect');
        if (source === 'hand') {
            actEl.style.display = 'flex';
            const canPlay = card.gameStats?.cost <= gameState.energy && gameState.isPlayerTurn && !gameState.isAnimating;
            selBtn.disabled = !canPlay;
            selBtn.textContent = canPlay ? '✨ SELECT TO PLAY' : (card.gameStats?.cost > gameState.energy ? '◆ NOT ENOUGH ENERGY' : '⏳ NOT YOUR TURN');
        } else if (source === 'board-player') {
            actEl.style.display = 'flex';
            const canAtk = card.canAttackThisTurn && !card.hasAttacked && gameState.isPlayerTurn && !gameState.isAnimating && card.stealthTurns <= 0;
            selBtn.disabled = !canAtk;
            selBtn.textContent = canAtk ? '⚔️ READY TO ATTACK' : (card.hasAttacked ? '😴 ALREADY ATTACKED' : card.stealthTurns > 0 ? '👻 IN STEALTH' : '⏳ CANNOT ATTACK YET');
        } else { actEl.style.display = 'none'; }
        modal.classList.add('show'); Audio.play('select'); document.body.style.overflow = 'hidden';
    }
    function hideCardDetailModal() {
        const m = document.getElementById('cardDetailModal'); m.classList.remove('show','compact-mode');
        modalCard=null; modalCardIndex=null; modalCardSource=null;
        const a=document.getElementById('cardDetailActions'),s=document.getElementById('cardDetailSlots'),h=document.getElementById('cardDetailHint');
        if(a)a.style.display='flex'; if(s)s.style.display='none'; if(h)h.textContent='Tap outside or close button to dismiss';
        document.body.style.overflow='';
    }
    function initCardDetailModal() {
        const m=document.getElementById('cardDetailModal'),cl=document.getElementById('cardDetailClose'),ca=document.getElementById('cardDetailCancel'),sel=document.getElementById('cardDetailSelect'),bk=document.getElementById('cardDetailBack');
        cl.addEventListener('click',e=>{e.stopPropagation();hideCardDetailModal();});
        ca.addEventListener('click',e=>{e.stopPropagation();hideCardDetailModal();});
        m.addEventListener('click',e=>{if(e.target===m)hideCardDetailModal();});
        sel.addEventListener('click',e=>{e.stopPropagation();if(modalCardSource==='hand'&&modalCardIndex!==null)showSlotSelection();});
        bk.addEventListener('click',e=>{e.stopPropagation();hideSlotSelection();});
        document.addEventListener('keydown',e=>{if(e.key==='Escape'&&m.classList.contains('show'))hideCardDetailModal();});
    }
    function showSlotSelection() {
        const m=document.getElementById('cardDetailModal'); m.classList.add('compact-mode');
        if(modalCard){
            const f=modalCard.img?.replace(/\.(png|jpg)$/i,'.webp')||'placeholder.webp';
            const ci=document.getElementById('cardDetailImgCompact'),cic=document.getElementById('cardDetailImageCompact');
            ci.src=`/static/images/cards/${f}`; ci.onerror=()=>{ci.src='/static/images/cards/placeholder.webp';};
            cic.className='card-detail-image '+(modalCard.rarity||'common');
            document.getElementById('cardDetailNameCompact').textContent=modalCard.name;
            document.getElementById('compactAtk').textContent=modalCard.gameStats?.atk||'?';
            document.getElementById('compactHp').textContent=modalCard.gameStats?.hp||'?';
            document.getElementById('compactCost').textContent=modalCard.gameStats?.cost||'?';
        }
        const sb=document.getElementById('slotButtons'); sb.innerHTML='';
        for(let i=0;i<CONFIG.MAX_BOARD;i++){
            const occ=gameState.playerBoard[i]!==null, btn=document.createElement('button');
            btn.className=`slot-btn ${occ?'occupied':''}`; btn.textContent=occ?'✗':(i+1); btn.disabled=occ;
            if(!occ) btn.onclick=e=>{e.stopPropagation();playCardToSlotFromModal(i);}; sb.appendChild(btn);
        }
        document.getElementById('cardDetailActions').style.display='none';
        document.getElementById('cardDetailSlots').style.display='block';
        document.getElementById('cardDetailHint').textContent='Tap a slot above!'; Audio.play('select');
    }
    function hideSlotSelection() {
        document.getElementById('cardDetailModal').classList.remove('compact-mode');
        document.getElementById('cardDetailActions').style.display='flex';
        document.getElementById('cardDetailSlots').style.display='none';
    }
    async function playCardToSlotFromModal(slotIdx) {
        if(modalCardIndex===null||gameState.playerBoard[slotIdx]||gameState.isAnimating) return;
        const card=gameState.playerHand[modalCardIndex]; if(!card||card.gameStats.cost>gameState.energy) return;
        hideCardDetailModal(); await sleep(100);
        gameState.selectedCard=modalCardIndex; await playCardToSlot(slotIdx);
    }

    // ═══════════════════════════════════════════════════════════════════
    // GAME LOGIC — ALL ABILITIES WIRED
    // ═══════════════════════════════════════════════════════════════════
    function selectHandCard(idx) {
        const card = gameState.playerHand[idx];
        if (!card || card.gameStats.cost > gameState.energy || !gameState.isPlayerTurn || gameState.isAnimating) return;
        gameState.selectedCard = gameState.selectedCard === idx ? null : idx;
        Audio.play('select'); renderHand();
    }

    async function playCardToSlot(slotIdx) {
        if (gameState.selectedCard === null || gameState.playerBoard[slotIdx] || gameState.isAnimating) return;
        const card = gameState.playerHand[gameState.selectedCard];
        if (card.gameStats.cost > gameState.energy) return;
        gameState.isAnimating = true;
        gameState.energy -= card.gameStats.cost;
        const boardCard = initBoardCard(card); boardCard._isPlayer = true;
        gameState.playerBoard[slotIdx] = boardCard;
        gameState.playerHand.splice(gameState.selectedCard, 1);
        gameState.selectedCard = null; gameState.stats.cardsPlayed++;
        renderHand(); renderEnergy(); renderBoards();

        const slot = document.querySelector(`#playerBoard .board-slot[data-slot="${slotIdx}"]`);
        const cardEl = slot?.querySelector('.board-card');
        if (cardEl) { cardEl.classList.add('slamming'); Audio.play('cardSlam'); Effects.screenShake('normal');
            const r=slot.getBoundingClientRect(); Effects.impactRing(r.left+r.width/2,r.top+r.height/2);
            await sleep(CONFIG.CARD_SLAM_DURATION); cardEl.classList.remove('slamming'); }

        await handleBattlecry(boardCard, false, slotIdx);
        const {synergies, setBonuses} = computeBoardSynergies(gameState.playerBoard, true);
        const newSyn = synergies.filter(s => !gameState.playerSynergies.find(ps => ps.key===s.key));
        const newSet = setBonuses.filter(s => !gameState.playerSetBonuses.find(ps => ps.set===s.set && ps.desc===s.desc));
        for (const syn of newSyn) { Effects.showSynergyBanner(syn.name, syn.flavor); addLog(`<span style="color:#ffd700">${announce('synergy')}</span> ${syn.name}: ${syn.desc}`, 'ability'); gameState.stats.synergiesActivated++; await sleep(800); }
        for (const sb of newSet) { addLog(`<span style="color:#ff6b00">${announce('setBonus')}</span> ${sb.name}: ${sb.desc}`, 'ability'); gameState.stats.synergiesActivated++; }
        gameState.playerSynergies = synergies; gameState.playerSetBonuses = setBonuses;
        applyBoardBonuses(gameState.playerBoard, synergies, setBonuses, true);
        addLog(`You summon <span style="color:var(--gold)">${boardCard.name}</span>!`, 'summon');
        if (boardCard.canAttackThisTurn && (card.gameStats?.abilities||[]).includes('RUSH')) addLog(`⚡ ${announce('rushPlay')}`, 'ability');
        renderBoards(); renderSynergyDisplay(); updateAttackButton(); gameState.isAnimating = false;
    }

    async function handleBattlecry(card, isEnemy, slotIdx) {
        const board = isEnemy ? gameState.enemyBoard : gameState.playerBoard;
        const allies = board.filter((c,i) => c && i !== slotIdx);
        const boardId = isEnemy ? 'enemyBoard' : 'playerBoard';

        if (card.hasBuff && allies.length > 0) {
            const t = allies[Math.floor(Math.random()*allies.length)];
            t.currentAtk += 2; t.currentHp += 2; t.maxHp += 2;
            addLog(`${card.name} buffs ${t.name} +2/+2! ${announce('buff')}`, 'ability');
            gameState.stats.abilitiesFired++;
            const ts = board.indexOf(t); const el = document.querySelector(`#${boardId} .board-slot[data-slot="${ts}"] .board-card`);
            if (el) Effects.showAbilityText(el, '+2/+2', '#22c55e');
        }
        if (card.hasTaunt) { addLog(`${card.name}: ${announce('taunt')}`, 'ability'); gameState.stats.abilitiesFired++; }
        if (card.stealthTurns > 0) { addLog(`${card.name}: ${announce('stealth')}`, 'ability'); gameState.stats.abilitiesFired++; }
        if (card.hasDebuff) {
            const eBoard = isEnemy ? gameState.playerBoard : gameState.enemyBoard;
            eBoard.filter(c=>c).forEach(e => { e.currentAtk = Math.max(1, e.currentAtk - Math.max(1, Math.ceil(e.currentAtk*0.15))); });
            addLog(`${card.name}: ${announce('debuff')}`, 'ability'); gameState.stats.abilitiesFired++;
        }
        renderBoards();
    }

    // FACE ATTACK — go face when no taunt
    async function attackFace() {
        if (!gameState.isPlayerTurn || gameState.isAnimating) return;
        const attackerIdx = gameState.playerBoard.findIndex(c => c && c.canAttackThisTurn && !c.hasAttacked && c.stealthTurns <= 0);
        if (attackerIdx === -1) return;
        const hasTaunt = gameState.enemyBoard.some(c => c && c.hasTaunt && c.stealthTurns <= 0);
        if (hasTaunt) { addLog('Must attack TAUNT card first!', 'ability'); return; }
        gameState.isAnimating = true;
        const attacker = gameState.playerBoard[attackerIdx];
        let damage = getEffectiveAtk(attacker);
        let isCrit = Math.random()*100 < getEffectiveCrit(attacker);
        if (isCrit) { damage = Math.ceil(damage * (attacker.hasCritBoost ? 2.0 : 1.5)); gameState.stats.critsLanded++; }

        const aSlot = document.querySelector(`#playerBoard .board-slot[data-slot="${attackerIdx}"]`);
        const aCard = aSlot?.querySelector('.board-card');
        if (aCard) { aCard.classList.add('attacking'); Audio.play('attack'); }
        await sleep(CONFIG.ATTACK_DURATION * 0.4);

        gameState.enemyHP -= damage; gameState.stats.damageDealt += damage; gameState.stats.faceDamage += damage;
        gameState.comboCount++; gameState.stats.maxCombo = Math.max(gameState.stats.maxCombo, gameState.comboCount);
        if (gameState.comboCount >= 2) Effects.showCombo(gameState.comboCount);
        Audio.play(isCrit ? 'crit' : 'hit');
        Effects.screenShake('heavy'); Effects.screenFlash(isCrit ? '#ffd700' : '#ff4444');
        addLog(`${attacker.name} deals ${damage}${isCrit?' CRIT':''} to ENEMY GUILD! ${announce('goFace')}`, isCrit?'crit':'damage');

        if (attacker.hasLifesteal && damage > 0) {
            const h = Math.ceil(damage * 0.30);
            attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + h);
            gameState.stats.damageHealed += h;
            if (aCard) Effects.showDamage(aCard, h, false, true);
        }

        renderHP();
        await sleep(200);
        if (aCard) aCard.classList.remove('attacking');
        attacker.hasAttacked = true;
        renderBoards(); updateAttackButton();
        gameState.isAnimating = false;
        checkGameOver();
    }

    async function attackTarget(targetIdx) {
        if (!gameState.isPlayerTurn || gameState.isAnimating) return;
        const attackerIdx = gameState.playerBoard.findIndex(c => c && c.canAttackThisTurn && !c.hasAttacked && c.stealthTurns <= 0);
        if (attackerIdx === -1) return;
        const attacker = gameState.playerBoard[attackerIdx];
        const target = gameState.enemyBoard[targetIdx];
        const hasTaunt = gameState.enemyBoard.some(c => c && c.hasTaunt && c.stealthTurns <= 0);
        if (hasTaunt && (!target || !target.hasTaunt)) { addLog('Must attack TAUNT card first!', 'ability'); return; }
        if (target && target.stealthTurns > 0) { addLog(`${target.name} is in STEALTH!`, 'ability'); return; }
        if (!target) { await attackFace(); return; } // Empty slot = go face

        gameState.isAnimating = true;
        let damage = getEffectiveAtk(attacker);
        let isCrit = Math.random()*100 < getEffectiveCrit(attacker);
        if (isCrit) { damage = Math.ceil(damage * (attacker.hasCritBoost ? 2.0 : 1.5)); gameState.stats.critsLanded++; }

        const aSlot = document.querySelector(`#playerBoard .board-slot[data-slot="${attackerIdx}"]`);
        const aCard = aSlot?.querySelector('.board-card');
        if (aCard) { aCard.classList.add('attacking'); Audio.play('attack'); }
        await sleep(CONFIG.ATTACK_DURATION * 0.4);

        const tSlot = document.querySelector(`#enemyBoard .board-slot[data-slot="${targetIdx}"]`);
        const tCard = tSlot?.querySelector('.board-card');
        const dodgeChance = getEffectiveDodge(target);
        if (Math.random()*100 < dodgeChance) {
            if (tCard) Effects.showMiss(tCard);
            addLog(`${target.name}: ${announce('dodge')}`, 'ability'); gameState.stats.dodgesTriggered++;
            gameState.comboCount = 0;
        } else if (target.hasShield) {
            target.hasShield = false;
            if (tCard) Effects.showAbilityText(tCard, 'BLOCKED!', '#3b82f6');
            addLog(`${target.name}: ${announce('shield')}`, 'ability'); gameState.stats.shieldsBlocked++; gameState.stats.abilitiesFired++;
            gameState.comboCount = 0;
        } else {
            target.currentHp -= damage; gameState.stats.damageDealt += damage;
            gameState.comboCount++; gameState.stats.maxCombo = Math.max(gameState.stats.maxCombo, gameState.comboCount);
            if (gameState.comboCount >= 2) Effects.showCombo(gameState.comboCount);
            Audio.play(isCrit ? 'crit' : 'hit');
            Effects.screenShake(isCrit ? 'heavy' : 'normal');
            if (isCrit) { Effects.screenFlash('#ffd700'); addLog(`${attacker.name}: ${announce('critHit')}`, 'crit'); }
            if (tCard) { tCard.classList.add('hit'); Effects.showDamage(tCard, damage, isCrit);
                const r=tSlot.getBoundingClientRect(); Effects.impactRing(r.left+r.width/2,r.top+r.height/2, isCrit?'#ffd700':'#ff4444'); }
            addLog(`${attacker.name} deals ${damage}${isCrit?' CRIT':''} to ${target.name}!`, isCrit?'crit':'damage');
            if (attacker.hasLifesteal && damage > 0) {
                const h = Math.ceil(damage*0.30); attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp+h);
                gameState.stats.damageHealed += h; gameState.stats.abilitiesFired++;
                if (aCard) Effects.showDamage(aCard, h, false, true);
                addLog(`${attacker.name}: ${announce('lifesteal')} +${h} HP`, 'ability');
            }
            await sleep(CONFIG.HIT_DURATION);
            if (tCard) tCard.classList.remove('hit');
            if (target.currentHp <= 0) await handleDeath(target, targetIdx, true, attacker);
        }
        await sleep(200);
        if (aCard) aCard.classList.remove('attacking');
        attacker.hasAttacked = true;
        renderBoards(); updateAttackButton(); gameState.isAnimating = false;
    }

    async function handleDeath(card, slot, isOnEnemyBoard, killer) {
        Audio.play('death'); Effects.screenShake('normal');
        const boardEl = document.getElementById(isOnEnemyBoard ? 'enemyBoard' : 'playerBoard');
        const slotEl = boardEl.querySelector(`[data-slot="${slot}"]`);
        const cardEl = slotEl?.querySelector('.board-card');
        if (cardEl) { cardEl.classList.add('dying'); await sleep(CONFIG.DEATH_DURATION); }

        // SELF DESTRUCT
        if (card.hasSelfDestruct) {
            const aoeDmg = Math.ceil(getEffectiveAtk(card)*1.50);
            const kBoard = isOnEnemyBoard ? gameState.playerBoard : gameState.enemyBoard;
            const bName = isOnEnemyBoard ? 'playerBoard' : 'enemyBoard';
            kBoard.forEach((c,i) => { if(c){ c.currentHp -= aoeDmg; const el=document.querySelector(`#${bName} .board-slot[data-slot="${i}"] .board-card`); if(el)Effects.showDamage(el,aoeDmg); } });
            Effects.screenShake('heavy'); Effects.screenFlash('#ff4444');
            addLog(`💥 ${card.name}: ${announce('selfDestruct')} ${aoeDmg} AOE!`, 'damage'); gameState.stats.abilitiesFired++;
            const clean = isOnEnemyBoard ? gameState.playerBoard : gameState.enemyBoard;
            for(let i=0;i<clean.length;i++) if(clean[i]&&clean[i].currentHp<=0){ addLog(`${clean[i].name} destroyed by explosion!`,'damage'); clean[i]=null; gameState.stats.cardsKilled++; }
        }

        // DEATH FURY (Rage Quit Chain Reaction)
        if (card._deathFury && card.role === 'rage_quitter') {
            const board = isOnEnemyBoard ? gameState.enemyBoard : gameState.playerBoard;
            board.filter(c => c && c.role === 'rage_quitter' && c !== card).forEach(c => {
                const bonus = Math.ceil(c.currentAtk * card._deathFury);
                c.currentAtk += bonus;
                addLog(`💢 ${c.name} RAGES! +${bonus} ATK from ${card.name}'s death!`, 'ability');
            });
        }

        // REVIVE (Plot Armor)
        if (card.reviveOnce && !card.reviveUsed) {
            card.reviveUsed = true; card.currentHp = Math.ceil(card.maxHp * 0.30);
            addLog(`✨ ${card.name} revives with PLOT ARMOR! ${card.currentHp} HP!`, 'ability'); gameState.stats.abilitiesFired++;
            renderBoards(); return;
        }

        const board = isOnEnemyBoard ? gameState.enemyBoard : gameState.playerBoard;
        board[slot] = null; gameState.stats.cardsKilled++;
        addLog(`${card.name} is destroyed! ${announce(isOnEnemyBoard ? 'enemyCardDeath' : 'playerCardDeath')}`, 'damage');
        renderBoards();
    }

    function updateAttackButton() {
        const can = gameState.playerBoard.some(c => c && c.canAttackThisTurn && !c.hasAttacked && c.stealthTurns <= 0);
        document.getElementById('attackBtn').disabled = !can || !gameState.isPlayerTurn;
        updateFaceAttackZone();
    }

    // ═══════════════════════════════════════════════════════════════════
    // TURN MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    async function endTurn() {
        if (!gameState.isPlayerTurn || gameState.isAnimating) return;
        Audio.play('turnEnd'); gameState.isPlayerTurn = false; gameState.comboCount = 0;
        renderTurnIndicator();
        await processChaosRoll(gameState.playerBoard, true);
        await processEndOfTurnAbilities(gameState.playerBoard, 'playerBoard');
        await sleep(500);
        await enemyTurn();
        startNewTurn();
    }

    async function processChaosRoll(board, isPlayer) {
        const chaosCards = board.filter(c => c && c._chaosRoll);
        if (!chaosCards.length) return;
        const lucky = Math.random() < 0.5;
        const cards = board.filter(c => c);
        if (lucky) {
            cards.forEach(c => c.synergyAtkBonus += Math.ceil(c.currentAtk * 0.20));
            addLog(`🎲 CHAT DECIDES: +20% ATK! Chat is feeling generous!`, 'ability');
        } else {
            cards.forEach(c => c.synergyAtkBonus -= Math.ceil(c.currentAtk * 0.15));
            addLog(`🎲 CHAT DECIDES: -15% ATK! Chat chose chaos. KEKW`, 'damage');
        }
    }

    async function processEndOfTurnAbilities(board, boardId) {
        for (let i = 0; i < board.length; i++) {
            const card = board[i]; if (!card || card.currentHp <= 0) continue;
            if (card.hasHeal) {
                const allies = board.filter(c => c && c.currentHp > 0 && c.currentHp < c.maxHp);
                if (allies.length) {
                    const lowest = allies.sort((a,b) => a.currentHp - b.currentHp)[0];
                    const h = Math.ceil(card.maxHp * 0.25);
                    lowest.currentHp = Math.min(lowest.maxHp, lowest.currentHp + h);
                    gameState.stats.damageHealed += h; gameState.stats.abilitiesFired++;
                    const ts = board.indexOf(lowest); const el = document.querySelector(`#${boardId} .board-slot[data-slot="${ts}"] .board-card`);
                    if (el) Effects.showDamage(el, h, false, true);
                    addLog(`${card.name} heals ${lowest.name} for ${h}! ${announce('heal')}`, 'ability');
                }
            }
            if (card.autoHealPct > 0 && card.currentHp < card.maxHp) {
                const h = Math.ceil(card.maxHp * card.autoHealPct);
                card.currentHp = Math.min(card.maxHp, card.currentHp + h); gameState.stats.damageHealed += h;
            }
            if (card.stealthTurns > 0) card.stealthTurns--;
            if (card.debuffTurnsLeft > 0) card.debuffTurnsLeft--;
        }
        renderBoards();
    }

    // ═══════════════════════════════════════════════════════════════════
    // ENEMY AI — 3 Difficulty Tiers
    // ═══════════════════════════════════════════════════════════════════
    async function enemyTurn() {
        addLog('--- ENEMY TURN ---', '');
        if (gameState.enemyDeck.length > 0 && gameState.enemyHand.length < CONFIG.MAX_HAND) {
            gameState.enemyHand.push(gameState.enemyDeck.pop());
            // Boss draws extra
            if (gameState.difficulty === 'boss' && gameState.enemyDeck.length > 0 && gameState.enemyHand.length < CONFIG.MAX_HAND) gameState.enemyHand.push(gameState.enemyDeck.pop());
        }
        const enemyEnergy = Math.min(gameState.turn, CONFIG.MAX_ENERGY);
        let spent = 0;

        // Sort hand by AI difficulty
        let playableHand = [...gameState.enemyHand].map((c,i) => ({card:c, origIdx:i})).filter(x => x.card.gameStats.cost <= enemyEnergy);

        if (gameState.difficulty === 'casual') {
            // Random order — casual plays whatever
            for (let i = playableHand.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [playableHand[i],playableHand[j]] = [playableHand[j],playableHand[i]]; }
        } else {
            // Ranked + Boss: prioritize abilities, then cost descending
            playableHand.sort((a,b) => {
                const aA = (a.card.gameStats?.abilities||[]).length, bA = (b.card.gameStats?.abilities||[]).length;
                if (aA !== bA) return bA - aA;
                // Prioritize taunt if player has high ATK cards
                const aT = (a.card.gameStats?.abilities||[]).includes('TAUNT') ? 1 : 0;
                const bT = (b.card.gameStats?.abilities||[]).includes('TAUNT') ? 1 : 0;
                if (aT !== bT) return bT - aT;
                return b.card.gameStats.cost - a.card.gameStats.cost;
            });
        }

        for (const {card} of playableHand) {
            if (card.gameStats.cost > enemyEnergy - spent) continue;
            const emptySlot = gameState.enemyBoard.findIndex(s => s === null);
            if (emptySlot === -1) break;
            spent += card.gameStats.cost;
            const boardCard = initBoardCard(card);
            gameState.enemyBoard[emptySlot] = boardCard;
            const hIdx = gameState.enemyHand.indexOf(card);
            if (hIdx !== -1) gameState.enemyHand.splice(hIdx, 1);
            renderBoards();
            const slot = document.querySelector(`#enemyBoard .board-slot[data-slot="${emptySlot}"]`);
            const cEl = slot?.querySelector('.board-card');
            if (cEl) { cEl.classList.add('slamming'); Audio.play('cardSlam'); Effects.screenShake('normal'); }
            addLog(`Enemy summons ${boardCard.name}!`, 'summon');
            await handleBattlecry(boardCard, true, emptySlot);
            await sleep(600);
            if (cEl) cEl.classList.remove('slamming');
        }

        // Recalc enemy synergies
        const {synergies, setBonuses} = computeBoardSynergies(gameState.enemyBoard, false);
        const newSyn = synergies.filter(s => !gameState.enemySynergies.find(es => es.key===s.key));
        for (const syn of newSyn) addLog(`Enemy activates <span style="color:#ef4444">${syn.name}</span>: ${syn.desc}`, 'ability');
        gameState.enemySynergies = synergies; gameState.enemySetBonuses = setBonuses;
        applyBoardBonuses(gameState.enemyBoard, synergies, setBonuses, false);
        renderSynergyDisplay();
        await sleep(300);

        // Enemy attacks
        for (let i = 0; i < gameState.enemyBoard.length; i++) {
            const attacker = gameState.enemyBoard[i];
            if (!attacker || !attacker.canAttackThisTurn || attacker.hasAttacked || attacker.stealthTurns > 0) continue;
            const playerCards = gameState.playerBoard.filter(c => c && c.stealthTurns <= 0);
            const tauntCards = playerCards.filter(c => c.hasTaunt);
            let targetIdx = -1;

            if (tauntCards.length > 0) {
                targetIdx = gameState.playerBoard.findIndex(c => c && c.hasTaunt && c.stealthTurns <= 0);
            } else if (playerCards.length > 0) {
                if (gameState.difficulty === 'casual') {
                    // Random target
                    const valid = []; gameState.playerBoard.forEach((c,idx) => { if(c && c.stealthTurns<=0) valid.push(idx); });
                    targetIdx = valid.length ? valid[Math.floor(Math.random()*valid.length)] : -1;
                } else {
                    // Smart: kill lowest HP (secure kills)
                    let lowest = Infinity, lIdx = -1;
                    gameState.playerBoard.forEach((c,idx) => { if(c && c.stealthTurns<=0 && c.currentHp < lowest){ lowest=c.currentHp; lIdx=idx; } });
                    targetIdx = lIdx;
                    // Boss: sometimes go face if lethal
                    if (gameState.difficulty === 'boss') {
                        const dmg = getEffectiveAtk(attacker);
                        if (gameState.playerHP <= dmg) targetIdx = -1; // Go face for lethal!
                    }
                }
            }
            await enemyAttack(i, targetIdx);
            attacker.hasAttacked = true;
        }

        await processChaosRoll(gameState.enemyBoard, false);
        await processEndOfTurnAbilities(gameState.enemyBoard, 'enemyBoard');
    }

    async function enemyAttack(attackerIdx, targetIdx) {
        const attacker = gameState.enemyBoard[attackerIdx];
        const target = targetIdx >= 0 ? gameState.playerBoard[targetIdx] : null;
        let damage = getEffectiveAtk(attacker);
        let isCrit = Math.random()*100 < getEffectiveCrit(attacker);
        if (isCrit) { damage = Math.ceil(damage * (attacker.hasCritBoost ? 2.0 : 1.5)); }

        const aSlot = document.querySelector(`#enemyBoard .board-slot[data-slot="${attackerIdx}"]`);
        const aCard = aSlot?.querySelector('.board-card');
        if (aCard) { aCard.classList.add('attacking'); Audio.play('attack'); }
        await sleep(CONFIG.ATTACK_DURATION * 0.4);

        if (target) {
            const dodgeChance = getEffectiveDodge(target);
            if (Math.random()*100 < dodgeChance) {
                const tSlot = document.querySelector(`#playerBoard .board-slot[data-slot="${targetIdx}"]`);
                const tCard = tSlot?.querySelector('.board-card');
                if (tCard) Effects.showMiss(tCard);
                addLog(`${target.name} dodges ${attacker.name}'s attack!`, 'ability'); gameState.stats.dodgesTriggered++;
            } else if (target.hasShield) {
                target.hasShield = false;
                addLog(`${target.name}'s SHIELD blocks the hit!`, 'ability'); gameState.stats.shieldsBlocked++;
            } else {
                target.currentHp -= damage;
                const tSlot = document.querySelector(`#playerBoard .board-slot[data-slot="${targetIdx}"]`);
                const tCard = tSlot?.querySelector('.board-card');
                Audio.play(isCrit ? 'crit' : 'hit'); Effects.screenShake(isCrit ? 'heavy' : 'normal');
                if (tCard) { tCard.classList.add('hit'); Effects.showDamage(tCard, damage, isCrit); }
                addLog(`${attacker.name} deals ${damage}${isCrit?' CRIT':''} to ${target.name}!`, isCrit?'crit':'damage');
                if (attacker.hasLifesteal && damage > 0) { const h=Math.ceil(damage*0.30); attacker.currentHp=Math.min(attacker.maxHp,attacker.currentHp+h); }
                await sleep(CONFIG.HIT_DURATION);
                if (tCard) tCard.classList.remove('hit');
                if (target.currentHp <= 0) await handleDeath(target, targetIdx, false, attacker);
            }
        } else {
            // Go face
            gameState.playerHP -= damage;
            Audio.play(isCrit ? 'crit' : 'hit'); Effects.screenShake('heavy'); Effects.screenFlash('#ff4444');
            const hpBar = document.getElementById('playerHpBar');
            hpBar.classList.add('damaged'); setTimeout(() => hpBar.classList.remove('damaged'), 300);
            addLog(`${attacker.name} deals ${damage}${isCrit?' CRIT':''} to YOUR GUILD!`, isCrit?'crit':'damage');
            renderHP(); checkGameOver();
        }
        await sleep(200);
        if (aCard) aCard.classList.remove('attacking');
        renderBoards();
    }

    function startNewTurn() {
        gameState.turn++; gameState.stats.turnCount++;
        gameState.maxEnergy = Math.min(gameState.turn, CONFIG.MAX_ENERGY);
        gameState.energy = gameState.maxEnergy;
        gameState.isPlayerTurn = true; gameState.comboCount = 0;
        gameState.playerBoard.forEach(c => { if(c){c.canAttackThisTurn=true;c.hasAttacked=false;} });
        gameState.enemyBoard.forEach(c => { if(c){c.canAttackThisTurn=true;c.hasAttacked=false;} });
        if (gameState.playerDeck.length > 0 && gameState.playerHand.length < CONFIG.MAX_HAND) { gameState.playerHand.push(gameState.playerDeck.pop()); Audio.play('draw'); }
        if (gameState.playerHP <= 10 && gameState.enemyHP > 15 && !gameState.stats.comebackTriggered) { addLog(`🔥 ${announce('comeback')}`, 'ability'); gameState.stats.comebackTriggered = true; }
        addLog(`--- TURN ${gameState.turn} --- ${announce('turnStart')}`, '');
        renderAll();
    }

    function checkGameOver() {
        if (gameState.playerHP <= 0) { Audio.play('defeat'); showRewardsScreen(false); }
        else if (gameState.enemyHP <= 0) { Audio.play('victory'); showRewardsScreen(true); }
    }

    // ═══════════════════════════════════════════════════════════════════
    // REWARDS SCREEN (v5.0)
    // ═══════════════════════════════════════════════════════════════════
    function showRewardsScreen(victory) {
        const profile = getProfile();
        const s = gameState.stats;
        const diffMult = { casual:1, ranked:2, boss:5 }[gameState.difficulty] || 1;
        const baseXP = { casual:10, ranked:25, boss:50 }[gameState.difficulty] || 10;
        const baseLogs = Math.max(5, Math.floor(s.damageDealt / 10));

        // Calculate rewards
        let xpEarned = victory ? baseXP : Math.floor(baseXP * 0.3);
        let logsEarned = victory ? baseLogs * diffMult : Math.floor(baseLogs * 0.2);
        const bonuses = [];

        // Bonus XP for style
        if (s.critsLanded >= 3) { xpEarned += 5; bonuses.push('Crit Master +5 XP'); }
        if (s.maxCombo >= 3) { xpEarned += 5; bonuses.push(`${s.maxCombo}x Combo +5 XP`); }
        if (s.synergiesActivated >= 2) { xpEarned += 5; bonuses.push('Synergy Savant +5 XP'); }
        if (s.comebackTriggered && victory) { xpEarned += 10; bonuses.push('Comeback King +10 XP'); }
        if (s.turnCount <= 6 && victory) { xpEarned += 10; bonuses.push('Speed Run +10 XP'); }

        // Update profile
        profile.totalBattles++;
        if (victory) { profile.wins++; profile.streak++; profile.bestStreak = Math.max(profile.bestStreak, profile.streak); }
        else { profile.losses++; profile.streak = 0; }
        profile.xp += xpEarned;
        const neededXP = xpForLevel(profile.level);
        if (profile.xp >= neededXP) { profile.level++; profile.xp -= neededXP; bonuses.push(`🎉 LEVEL UP! Now Level ${profile.level}`); }
        saveProfile(profile);

        // Render
        const overlay = document.getElementById('rewardsOverlay');
        const title = document.getElementById('rewardsTitle');
        title.textContent = victory ? 'VICTORY!' : 'DEFEAT';
        title.className = 'rewards-title ' + (victory ? 'victory' : 'defeat');
        document.getElementById('rewardsQuip').textContent = announce(victory ? 'victory' : 'defeat');

        const streak = document.getElementById('streakBadge');
        if (profile.streak >= 2) { streak.style.display = 'inline-flex'; document.getElementById('streakCount').textContent = profile.streak; }
        else streak.style.display = 'none';

        const grid = document.getElementById('rewardsGrid');
        grid.innerHTML = `
            <div class="reward-card"><div class="reward-icon">⚡</div><div class="reward-value">+${xpEarned}</div><div class="reward-label">XP Earned</div></div>
            <div class="reward-card"><div class="reward-icon">🪵</div><div class="reward-value">+${logsEarned}</div><div class="reward-label">Logs Earned</div></div>
            <div class="reward-card"><div class="reward-icon">⚔️</div><div class="reward-value">${s.turnCount}</div><div class="reward-label">Turns</div></div>
            <div class="reward-card"><div class="reward-icon">💥</div><div class="reward-value">${s.damageDealt}</div><div class="reward-label">Damage Dealt</div></div>
            <div class="reward-card"><div class="reward-icon">🎯</div><div class="reward-value">${s.critsLanded}</div><div class="reward-label">Crits</div></div>
            <div class="reward-card"><div class="reward-icon">🤝</div><div class="reward-value">${s.synergiesActivated}</div><div class="reward-label">Synergies</div></div>
        `;
        if (bonuses.length) grid.innerHTML += `<div class="reward-card" style="grid-column:span 2;border-color:var(--gold)"><div class="reward-icon">🏆</div><div class="reward-value" style="font-size:12px">${bonuses.join(' • ')}</div><div class="reward-label">Bonuses</div></div>`;

        const xpPct = Math.min(100, (profile.xp / xpForLevel(profile.level)) * 100);
        document.getElementById('xpBarFill').style.width = xpPct + '%';
        document.getElementById('xpBarText').textContent = `Level ${profile.level} — ${profile.xp}/${xpForLevel(profile.level)} XP`;

        // Give logs to wallet
        try { if (typeof NW_WALLET !== 'undefined' && NW_WALLET.earn) NW_WALLET.earn('wood', logsEarned, 'Battle reward'); } catch(e){}

        overlay.classList.add('show');
    }

    // ═══════════════════════════════════════════════════════════════════
    // BATTLE LOG
    // ═══════════════════════════════════════════════════════════════════
    function addLog(message, type='') {
        const log = document.getElementById('battleLog');
        const entry = document.createElement('div'); entry.className = 'log-entry ' + type;
        entry.innerHTML = message; log.insertBefore(entry, log.firstChild);
        while (log.children.length > 50) log.removeChild(log.lastChild);
    }

    // ═══════════════════════════════════════════════════════════════════
    // DRAG AND DROP
    // ═══════════════════════════════════════════════════════════════════
    const DragDrop = {
        isDragging:false, dragCard:null, dragCardIndex:null, dragGhost:null, currentPos:{x:0,y:0}, hoveredSlot:null,
        start(cardEl, card, index, e) {
            if (!gameState.isPlayerTurn || gameState.isAnimating || card.gameStats.cost > gameState.energy) return;
            e.preventDefault();
            const touch = e.touches ? e.touches[0] : e;
            this.isDragging=true; this.dragCard=card; this.dragCardIndex=index;
            this.currentPos={x:touch.clientX,y:touch.clientY};
            cardEl.style.opacity='0.3'; cardEl.style.transform='scale(0.9)';
            this.createGhost(card, touch.clientX, touch.clientY);
            try{Audio.play('select');}catch(err){}
            document.addEventListener('mousemove',this.moveHandler);
            document.addEventListener('mouseup',this.endHandler);
            document.addEventListener('touchmove',this.moveHandler,{passive:false});
            document.addEventListener('touchend',this.endHandler);
            document.addEventListener('touchcancel',this.endHandler);
        },
        createGhost(card, x, y) {
            const g=document.createElement('div'); g.id='dragGhost';
            g.style.cssText=`position:fixed;z-index:99999;width:100px;height:140px;border-radius:10px;overflow:hidden;pointer-events:none;border:3px solid #ffd700;box-shadow:0 20px 50px rgba(0,0,0,0.8),0 0 30px rgba(255,215,0,0.6);transform:scale(1.1) rotate(-3deg);background:#1a1a2e;`;
            const img=document.createElement('img'); img.src='/static/images/cards/thumbs/'+(card.img||'placeholder.webp');
            img.onerror=()=>{img.src='/static/images/cards/placeholder.webp';}; img.style.cssText='width:100%;height:100%;object-fit:cover;';
            g.appendChild(img);
            const cost=document.createElement('div'); cost.textContent=card.gameStats.cost;
            cost.style.cssText=`position:absolute;top:-8px;left:-8px;width:28px;height:28px;background:linear-gradient(135deg,#00ffff,#3b82f6);border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Orbitron',sans-serif;font-size:14px;font-weight:bold;color:white;`;
            g.appendChild(cost); document.body.appendChild(g); this.dragGhost=g; this.updateGhostPosition(x,y);
        },
        updateGhostPosition(x,y) { if(this.dragGhost){this.dragGhost.style.left=(x-50)+'px';this.dragGhost.style.top=(y-90)+'px';} },
        moveHandler: function(e) { DragDrop.move(e); },
        move(e) {
            if(!this.isDragging)return; e.preventDefault();
            const touch=e.touches?e.touches[0]:e; this.currentPos={x:touch.clientX,y:touch.clientY};
            this.updateGhostPosition(touch.clientX,touch.clientY); this.checkSlotHover(touch.clientX,touch.clientY);
        },
        checkSlotHover(x,y) {
            document.querySelectorAll('.board-slot').forEach(s=>s.classList.remove('drag-hover','drag-invalid'));
            this.hoveredSlot=null;
            document.getElementById('playerBoard').querySelectorAll('.board-slot').forEach((slot,idx)=>{
                const r=slot.getBoundingClientRect();
                if(x>=r.left-10&&x<=r.right+10&&y>=r.top-10&&y<=r.bottom+10){
                    if(gameState.playerBoard[idx])slot.classList.add('drag-invalid');
                    else{slot.classList.add('drag-hover');this.hoveredSlot={slot,idx};}
                }
            });
        },
        findClosestSlot() {
            const pb=document.getElementById('playerBoard'),br=pb.getBoundingClientRect();
            if(this.currentPos.y>br.bottom+150||this.currentPos.y<br.top-50)return null;
            let closest=null,dist=150;
            pb.querySelectorAll('.board-slot').forEach((slot,idx)=>{
                if(gameState.playerBoard[idx])return;
                const r=slot.getBoundingClientRect(),d=Math.hypot(this.currentPos.x-(r.left+r.width/2),this.currentPos.y-(r.top+r.height/2));
                if(d<dist){dist=d;closest={slot,idx};}
            }); return closest;
        },
        endHandler: function(e) { DragDrop.end(e); },
        async end(e) {
            if(!this.isDragging)return;
            document.removeEventListener('mousemove',this.moveHandler);
            document.removeEventListener('mouseup',this.endHandler);
            document.removeEventListener('touchmove',this.moveHandler);
            document.removeEventListener('touchend',this.endHandler);
            document.removeEventListener('touchcancel',this.endHandler);
            document.querySelectorAll('.board-slot').forEach(s=>s.classList.remove('drag-hover','drag-invalid'));
            let target=this.hoveredSlot||this.findClosestSlot();
            if(this.dragGhost){this.dragGhost.remove();this.dragGhost=null;}
            if(target&&this.dragCard&&this.dragCardIndex!==null){
                gameState.selectedCard=this.dragCardIndex; await playCardToSlot(target.idx);
                setTimeout(()=>{const nc=target.slot.querySelector('.board-card');if(nc){nc.classList.add('snapping');setTimeout(()=>nc.classList.remove('snapping'),400);}},50);
            } else { renderHand(); try{Audio.play('select');}catch(err){} }
            this.isDragging=false;this.dragCard=null;this.dragCardIndex=null;this.hoveredSlot=null;
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════════════
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    function renderAll() { renderHP(); renderEnergy(); renderTurnIndicator(); renderHand(); renderBoards(); renderSynergyDisplay(); updateAttackButton(); }

    function createDeck(usePlayerDeck=false) {
        if (!CARDS.length) return [];
        const deck = [];
        if (usePlayerDeck) {
            try {
                const saved = JSON.parse(localStorage.getItem('nw_decks') || '[]');
                if (saved.length > 0) {
                    const last = saved[saved.length-1];
                    last.cards.forEach(c => { const card = CARDS.find(ac => ac.id === c.id); if (card && card.gameStats) for (let i=0;i<c.count;i++) deck.push({...card}); });
                    if (deck.length >= 10) { for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];} return deck; }
                }
            } catch(e) {}
        }
        const valid = CARDS.filter(c => c && c.gameStats && c.gameStats.cost !== undefined);
        if (!valid.length) { CARDS.slice(0,CONFIG.DECK_SIZE).forEach(c => deck.push({...c, gameStats:c.gameStats||{atk:3,hp:5,cost:2,crit:5,dodge:5,abilities:[]}})); return deck; }

        const deckSize = gameState.difficulty === 'boss' ? CONFIG.DECK_SIZE + BOSS_CONFIG.extraCards : CONFIG.DECK_SIZE;
        for (let i = 0; i < deckSize; i++) deck.push({...valid[Math.floor(Math.random()*valid.length)]});
        for (let i=deck.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]]; }
        return deck;
    }

    // ═══════════════════════════════════════════════════════════════════
    // START GAME — With countdown animation
    // ═══════════════════════════════════════════════════════════════════
    function startGame() {
        console.log('[Battle Arena v5.0] Starting game...');
        console.log(`[Battle Arena v5.0] Hand: ${gameState.playerHand.length} cards, Deck: ${gameState.playerDeck.length} cards`);
        
        // Safety: if hand is somehow empty, deal now
        if (gameState.playerHand.length === 0 && CARDS.length > 0) {
            console.warn('[Battle Arena v5.0] SAFETY: Hand was empty, dealing now!');
            if (!gameState.playerDeck.length) gameState.playerDeck = createDeck(true);
            if (!gameState.playerDeck.length) {
                for (let i = 0; i < CONFIG.DECK_SIZE && i < CARDS.length; i++) gameState.playerDeck.push({...CARDS[i]});
            }
            if (!gameState.enemyDeck.length) gameState.enemyDeck = createDeck(false);
            if (!gameState.enemyDeck.length) {
                for (let i = 0; i < CONFIG.DECK_SIZE && i < CARDS.length; i++) gameState.enemyDeck.push({...CARDS[i]});
            }
            for (let i = 0; i < CONFIG.STARTING_HAND; i++) {
                if (gameState.playerDeck.length) gameState.playerHand.push(gameState.playerDeck.pop());
                if (gameState.enemyDeck.length) gameState.enemyHand.push(gameState.enemyDeck.pop());
            }
        }
        
        try { Effects.createParticles(); } catch(e) {}
        const diffNames = { casual:'Casual Bot', ranked:'Ranked Rival', boss:'MYTHIC BOSS' };
        const eName = document.getElementById('enemyHpName');
        if (eName) eName.textContent = diffNames[gameState.difficulty] || 'AI GUILD';
        if (gameState.difficulty === 'boss') addLog(`💀 ${announce('bossEntry')}`, 'ability');
        renderAll();
        // Ensure hand is visible on mobile by scrolling to bottom
        setTimeout(() => {
            const ac = document.querySelector('.arena-container');
            if (ac && ac.scrollHeight > ac.clientHeight) ac.scrollTop = ac.scrollHeight;
        }, 100);
        document.getElementById('endTurnBtn').onclick = endTurn;
        document.getElementById('attackBtn').onclick = () => {
            const tIdx = gameState.enemyBoard.findIndex(c => c);
            if (tIdx !== -1) attackTarget(tIdx); else attackFace();
        };
        // Face attack zone click
        const faz = document.getElementById('faceAttackZone');
        if (faz) faz.onclick = () => attackFace();
        // Enemy HP bar click = go face
        const ehb = document.getElementById('enemyHpBar');
        if (ehb) ehb.onclick = () => attackFace();

        addLog(`⚔️ ${announce('battleStart')}`, 'ability');
        addLog(`Your deck: ${gameState.playerDeck.length + gameState.playerHand.length} cards | Difficulty: ${gameState.difficulty.toUpperCase()}`, '');
    }

    async function startCountdown() {
        const cd = document.getElementById('startCountdown');
        const ft = document.getElementById('fightText');
        cd.style.display = 'block';
        for (let i = 3; i >= 1; i--) {
            cd.textContent = i; cd.classList.remove('pulse'); void cd.offsetWidth; cd.classList.add('pulse');
            Audio.play('countdown'); await sleep(800);
        }
        cd.style.display = 'none'; ft.style.display = 'block';
        ft.classList.add('show'); Audio.play('fight'); await sleep(1000);
        ft.style.display = 'none';
        document.getElementById('startOverlay').classList.add('hidden');
        startGame();
    }

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    function showError(msg) {
        console.error(msg);
        let d = document.getElementById('debugError');
        if (!d) { d=document.createElement('div'); d.id='debugError'; d.style.cssText='position:fixed;top:10px;left:10px;right:10px;background:red;color:white;padding:10px;z-index:99999;font-size:12px;border-radius:8px;max-height:200px;overflow:auto;'; document.body.appendChild(d); }
        d.innerHTML += msg + '<br>';
    }

    async function init() {
        try {
            console.log('[Battle Arena v5.0] Init...');
            console.log('[Battle Arena v5.0] NW_ABILITIES:', typeof NW_ABILITIES !== 'undefined');
            console.log('[Battle Arena v5.0] NW_SET_BONUSES:', typeof NW_SET_BONUSES !== 'undefined');
            console.log('[Battle Arena v5.0] NW_ROLE_SYNERGIES:', typeof NW_ROLE_SYNERGIES !== 'undefined');

            // Load cards — robust with multiple fallbacks
            try {
                if (typeof NW_CARDS !== 'undefined') { await NW_CARDS.init(); CARDS = NW_CARDS.getAll().filter(c => c.gameStats); }
                if (!CARDS.length) { const res = await fetch('/static/data/cards-v2.json'); const data = await res.json(); CARDS = (data.cards || []).filter(c => c.gameStats); }
            } catch(e) {
                console.warn('[Battle Arena v5.0] Primary load failed:', e.message);
                try { const res = await fetch('/static/data/cards-v2.json'); const data = await res.json(); CARDS = (data.cards || []).filter(c => c.gameStats); }
                catch(e2) { showError('Cards failed: ' + e2.message); }
            }
            console.log(`[Battle Arena v5.0] ${CARDS.length} cards loaded`);
            if (!CARDS.length) { showError('No cards loaded! Check network.'); return; }

            initCardDetailModal();
            await Audio.init();

            // Wire start button — deck building + dealing happens HERE on click, not early
            const startBtn = document.getElementById('startBtn');
            if (startBtn) {
                startBtn.onclick = async () => {
                    startBtn.disabled = true;
                    startBtn.textContent = '⏳ LOADING...';
                    
                    // Set difficulty
                    gameState.difficulty = window._selectedDifficulty || 'casual';
                    if (gameState.difficulty === 'boss') gameState.enemyHP = BOSS_CONFIG.hp;
                    
                    // Build decks fresh NOW (not in init)
                    gameState.playerDeck = createDeck(true);
                    gameState.enemyDeck = createDeck(false);
                    if (!gameState.playerDeck.length) {
                        for (let i = 0; i < CONFIG.DECK_SIZE && i < CARDS.length; i++) gameState.playerDeck.push({...CARDS[i]});
                    }
                    if (!gameState.enemyDeck.length) {
                        for (let i = 0; i < CONFIG.DECK_SIZE && i < CARDS.length; i++) gameState.enemyDeck.push({...CARDS[i]});
                    }
                    
                    // Deal starting hands fresh NOW
                    gameState.playerHand = [];
                    gameState.enemyHand = [];
                    for (let i = 0; i < CONFIG.STARTING_HAND; i++) {
                        if (gameState.playerDeck.length) gameState.playerHand.push(gameState.playerDeck.pop());
                        if (gameState.enemyDeck.length) gameState.enemyHand.push(gameState.enemyDeck.pop());
                    }
                    
                    console.log(`[Battle Arena v5.0] Decks built: player=${gameState.playerDeck.length}, enemy=${gameState.enemyDeck.length}`);
                    console.log(`[Battle Arena v5.0] Hands dealt: player=${gameState.playerHand.length}, enemy=${gameState.enemyHand.length}`);
                    
                    await startCountdown();
                };
            }

            // Show profile level on start screen
            const profile = getProfile();
            const subtitle = document.querySelector('.start-guild.player .guild-subtitle');
            if (subtitle) subtitle.textContent = `Level ${profile.level} | ${profile.wins}W ${profile.losses}L`;

            console.log('[Battle Arena v5.0] Ready! Waiting for START button.');
        } catch(error) {
            showError('Init failed: ' + error.message + ' at ' + error.stack);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
