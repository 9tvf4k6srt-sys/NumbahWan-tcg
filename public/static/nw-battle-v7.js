// ═══════════════════════════════════════════════════════════════════════
// NUMBAHWAN TCG — BATTLE ARENA v7.1 (Bigger Cards + SVG Icons + Tap-to-Zoom)
// Marvel Snap-inspired card-first UI, SVG icons (no emojis), tap-to-zoom
// Research: 60px+ touch targets, readable fonts, no overlap, lazy images
// ═══════════════════════════════════════════════════════════════════════

(function() {
'use strict';

// ═══ CONFIG ═══
const CFG = {
    MAX_HP: 30, MAX_BOARD: 5, MAX_HAND: 7, START_HAND: 4,
    MAX_ENERGY: 10, DECK_SIZE: 15,
    BOSS: { hp: 45, extraCards: 3, bonusAtk: 3, bonusHp: 5 }
};

// ═══ ANNOUNCER LINES ═══
const ANN = {
    battleStart: ['3... 2... 1... NUMBAHWAN!','CARDS ON THE TABLE!','Welcome to the Age of Alimony!'],
    critHit: ['CRITICAL HIT!','EMOTIONAL DAMAGE!','THE DISRESPECT!','That crit was personal.'],
    dodge: ['DODGED! Matrix style!','MISS! Skill issue.','Dodged like rent day.'],
    shield: ['BLOCKED! Not today.','Shield absorbed it!','DENIED.'],
    lifesteal: ['LIFESTEAL! Draining!','Healing off your tears.','Self-care combat.'],
    selfDestruct: ['SELF DESTRUCT!','IF I GO DOWN, YOU COME WITH ME!','RAGE QUIT KABOOM!'],
    stealth: ['Vanished into shadows...','Now you see me... nope.'],
    heal: ['Healing up! Guild mom energy.','HP restored!','Take your potion.'],
    buff: ['BUFFED! POWERED UP!','+2/+2 investment!','TEAM BUFF!'],
    debuff: ['DEBUFFED! Feeling weak!','Nerfed mid-game.','Balance patch applied.'],
    taunt: ['TAUNT! Come at me!','AGGRO PULLED.','Must attack the tank.'],
    synergy: ['SYNERGY ACTIVATED!','THE COMBO!','WOMBO COMBO!'],
    setBonus: ['SET BONUS ONLINE!','Collection pays off!','SET COMPLETE!'],
    goFace: ['FACE DAMAGE!','Going face!','SMORC!'],
    victory: ['VICTORY! NUMBAHWAN!','GG EZ. (It was not easy.)','GUILD STANDS SUPREME!'],
    defeat: ['Defeat... but we\'ll be back.','Pain. Suffering.','REMATCH!'],
    turnStart: ['Your move.','Time to cook.','Make it count.'],
    rushPlay: ['RUSH! Attacks immediately!','No waiting!'],
    lowHP: ['HP CRITICAL!','ONE HIT FROM DEATH!','CLUTCH TIME!']
};
function announce(cat) { const a=ANN[cat]; return a?a[Math.floor(Math.random()*a.length)]:''; }

// ═══ GAME STATE ═══
let CARDS = [];
let difficulty = 'casual';
let selectedAttacker = null;
const G = {
    playerHP: CFG.MAX_HP, enemyHP: CFG.MAX_HP,
    energy: 1, maxEnergy: 1, turn: 1, isPlayerTurn: true,
    playerHand: [], enemyHand: [],
    playerBoard: [null,null,null,null,null],
    enemyBoard: [null,null,null,null,null],
    playerDeck: [], enemyDeck: [],
    playerSynergies: [], enemySynergies: [],
    playerSetBonuses: [], enemySetBonuses: [],
    selectedCard: null, isAnimating: false,
    comboCount: 0,
    stats: { damageDealt:0, damageTaken:0, damageHealed:0, cardsPlayed:0,
             critsLanded:0, dodgesTriggered:0, shieldsBlocked:0, abilitiesFired:0,
             synergiesActivated:0, faceDamage:0, maxCombo:0 }
};

// ═══ UTILITY ═══
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
function shuffle(arr) { for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }
function getImg(card) { return `/static/images/cards/thumbs/${card.img||'placeholder.webp'}`; }
function getAbilityIcons(abilities, size) {
    if (!abilities?.length) return '';
    size = size || 12;
    if (typeof NW_ICONS !== 'undefined') {
        return abilities.map(a => NW_ICONS.ability(a, size)).filter(Boolean).join('');
    }
    const map = typeof NW_ABILITIES !== 'undefined' ? NW_ABILITIES : {};
    return abilities.map(a => map[a]?.icon||'').filter(Boolean).join('');
}

// ═══ INIT BOARD CARD — All 12 abilities tracked ═══
function initBoardCard(card) {
    const gs = card.gameStats;
    const ab = gs.abilities || [];
    return {
        id: card.id, name: card.name, img: card.img, rarity: card.rarity,
        role: card.role, set: card.set, category: card.category,
        baseAtk: gs.atk, baseHp: gs.hp, currentAtk: gs.atk, currentHp: gs.hp, maxHp: gs.hp,
        baseCrit: gs.crit||0, baseDodge: gs.dodge||0,
        abilities: ab,
        // All 12 abilities
        hasRush: ab.includes('RUSH'), hasTaunt: ab.includes('TAUNT'),
        hasShield: ab.includes('SHIELD'), hasStealth: ab.includes('STEALTH'),
        hasLifesteal: ab.includes('LIFESTEAL'), hasSelfDestruct: ab.includes('SELF_DESTRUCT'),
        hasBuff: ab.includes('BUFF'), hasDebuff: ab.includes('DEBUFF'),
        hasHeal: ab.includes('HEAL'), hasDodge: ab.includes('DODGE'),
        hasCritBoost: ab.includes('CRIT_BOOST'), hasDodgeBoost: ab.includes('DODGE_BOOST'),
        stealthTurns: ab.includes('STEALTH') ? 2 : 0,
        debuffTurnsLeft: 0,
        canAttackThisTurn: ab.includes('RUSH'),
        hasAttacked: false,
        synergyAtkBonus: 0, synergyHpBonus: 0, synergyCritBonus: 0, synergyDodgeBonus: 0,
        autoHealPct: 0, _chaosRoll: false, _isPlayer: false
    };
}

// ═══ EFFECTIVE STATS ═══
function getEffAtk(c) { return Math.max(1, c.currentAtk + c.synergyAtkBonus); }
function getEffCrit(c) { return (c.baseCrit*100) + (c.hasCritBoost?15:0) + (c.synergyCritBonus*100); }
function getEffDodge(c) { return (c.baseDodge*100) + (c.hasDodge?25:0) + (c.synergyDodgeBonus*100); }

// ═══ DECK BUILDING ═══
function createDeck(forPlayer) {
    if (!CARDS.length) return [];
    const valid = CARDS.filter(c => c.gameStats && c.gameStats.cost !== undefined);
    if (!valid.length) return [];
    const size = difficulty === 'boss' && !forPlayer ? CFG.DECK_SIZE + CFG.BOSS.extraCards : CFG.DECK_SIZE;
    const deck = [];
    for (let i = 0; i < size; i++) deck.push(valid[Math.floor(Math.random() * valid.length)]);
    return shuffle(deck);
}

// ═══ SYNERGY COMPUTATION — All 9 set bonuses + 15+ role synergies ═══
function computeSynergies(board, isPlayer) {
    const cards = board.filter(c => c);
    const synergies = []; const setBonuses = [];
    // Set bonuses
    if (typeof NW_SET_BONUSES !== 'undefined') {
        const setCounts = {};
        cards.forEach(c => { setCounts[c.set] = (setCounts[c.set]||0)+1; });
        for (const [setName, setDef] of Object.entries(NW_SET_BONUSES)) {
            for (const bonus of setDef.bonuses) {
                if ((setCounts[setName]||0) >= bonus.count) {
                    setBonuses.push({ set:setName, name:setDef.name, desc:bonus.desc, effect:bonus.effect, count:bonus.count });
                }
            }
        }
    }
    // Role synergies
    if (typeof NW_ROLE_SYNERGIES !== 'undefined') {
        const roleCounts = {};
        cards.forEach(c => { roleCounts[c.role] = (roleCounts[c.role]||0)+1; });
        for (const [key, syn] of Object.entries(NW_ROLE_SYNERGIES)) {
            let met = false;
            if (syn.requires.role && syn.requires.count) {
                met = (roleCounts[syn.requires.role]||0) >= syn.requires.count;
            } else if (syn.requires.roles && syn.requires.minEach) {
                met = syn.requires.roles.every(r => (roleCounts[r]||0) >= syn.requires.minEach);
            }
            if (met) synergies.push({ key, name:syn.name, desc:syn.desc, effect:syn.effect, flavor:syn.flavorText });
        }
    }
    return { synergies, setBonuses };
}

function applyBonuses(board, synergies, setBonuses, isPlayer) {
    const cards = board.filter(c => c);
    cards.forEach(c => { c.synergyAtkBonus=0; c.synergyHpBonus=0; c.synergyCritBonus=0; c.synergyDodgeBonus=0; c.autoHealPct=0; c._chaosRoll=false; });
    for (const sb of setBonuses) {
        const e = sb.effect;
        cards.forEach(c => {
            if (e.teamAtkBonus) c.synergyAtkBonus += Math.ceil(c.baseAtk * e.teamAtkBonus);
            if (e.teamHpBonus) { const bonus = Math.ceil(c.baseHp * e.teamHpBonus); c.synergyHpBonus += bonus; c.maxHp = c.baseHp + c.synergyHpBonus; c.currentHp = Math.min(c.currentHp + bonus, c.maxHp); }
            if (e.teamCritBonus) c.synergyCritBonus += e.teamCritBonus;
            if (e.teamDodgeBonus) c.synergyDodgeBonus += e.teamDodgeBonus;
            if (e.tauntGainsShield && c.hasTaunt) c.hasShield = true;
            if (e.setGainsShield && c.set === sb.set) c.hasShield = true;
            if (e.setGainsRush && c.set === sb.set) { c.hasRush = true; c.canAttackThisTurn = true; }
            if (e.reactGamble) c._chaosRoll = true;
            if (e.teamHpPenalty) { const pen = Math.ceil(c.baseHp * e.teamHpPenalty); c.currentHp = Math.max(1, c.currentHp - pen); c.maxHp = Math.max(1, c.maxHp - pen); }
        });
    }
    for (const syn of synergies) {
        const e = syn.effect;
        cards.forEach(c => {
            if (e.roleAtkBonus && c.role === syn.key?.split('_')[0]) c.synergyAtkBonus += Math.ceil(c.baseAtk * e.roleAtkBonus);
            if (e.roleHpBonus) { const b = Math.ceil(c.baseHp * e.roleHpBonus); c.maxHp += b; c.currentHp = Math.min(c.currentHp + b, c.maxHp); }
            if (e.roleDodgeBonus) c.synergyDodgeBonus += e.roleDodgeBonus;
            if (e.roleAllStatsBonus) { c.synergyAtkBonus += Math.ceil(c.baseAtk * e.roleAllStatsBonus); const b = Math.ceil(c.baseHp * e.roleAllStatsBonus); c.maxHp += b; c.currentHp = Math.min(c.currentHp + b, c.maxHp); }
            if (e.teamCritBonus) c.synergyCritBonus += e.teamCritBonus;
            if (e.teamAutoHeal) c.autoHealPct += e.teamAutoHeal;
            if (e.roleAutoHeal) c.autoHealPct += e.roleAutoHeal;
        });
    }
}

// ═══ FLOATING EFFECTS ═══
function showFloat(el, text, cls) {
    if (!el) return;
    const f = document.createElement('div');
    f.className = `float-damage ${cls}`;
    f.textContent = text;
    el.style.position = 'relative';
    el.appendChild(f);
    setTimeout(() => f.remove(), 1000);
}
function screenShake() { const a = $('arena'); a.classList.add('shaking'); setTimeout(() => a.classList.remove('shaking'), 300); }
function screenFlash(color) { const f = document.createElement('div'); f.className = 'screen-flash'; f.style.background = color; document.body.appendChild(f); setTimeout(() => f.remove(), 300); }
function showAnnounce(text) {
    const el = $('announcer'); el.textContent = text;
    el.classList.remove('hidden'); el.classList.add('show');
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.classList.add('hidden'), 300); }, 1500);
}

// ═══ COMBAT LOG ═══
function addLog(msg, type = '') {
    const log = $('combatLog'); const e = document.createElement('div');
    e.className = `log-entry ${type}`; e.innerHTML = msg; log.appendChild(e);
    if (log.children.length > 5) log.removeChild(log.firstChild);
    setTimeout(() => { if (e.parentNode) e.remove(); }, 3500);
}

// ═══ RENDER ═══
function renderAll() { renderHP(); renderEnergy(); renderTurn(); renderBoards(); renderHand(); renderSynergies(); updateAttackBtn(); }

function renderHP() {
    const maxP = CFG.MAX_HP, maxE = difficulty === 'boss' ? CFG.BOSS.hp : CFG.MAX_HP;
    const pPct = Math.max(0, G.playerHP / maxP * 100), ePct = Math.max(0, G.enemyHP / maxE * 100);
    $('playerHpBar').style.width = pPct + '%';
    $('enemyHpBar').style.width = ePct + '%';
    $('playerHpText').textContent = `${Math.max(0, G.playerHP)}/${maxP}`;
    $('enemyHpText').textContent = `${Math.max(0, G.enemyHP)}/${maxE}`;
    document.querySelector('.your-zone')?.classList.toggle('hp-low', G.playerHP <= 8);
}

function renderEnergy() { $('energyText').textContent = `${G.energy}/${G.maxEnergy}`; }
function renderTurn() {
    $('turnBadge').textContent = `TURN ${G.turn}`;
    $('turnBadge').style.color = G.isPlayerTurn ? '#ffd700' : '#ff5252';
}

function renderHand() {
    const container = $('playerHand');
    const dotsContainer = $('handDots');
    container.innerHTML = '';
    dotsContainer.innerHTML = '';

    G.playerHand.forEach((card, i) => {
        if (!card || !card.gameStats) return;
        const gs = card.gameStats;
        const canPlay = gs.cost <= G.energy && G.isPlayerTurn && !G.isAnimating;
        const el = document.createElement('div');
        el.className = `hand-card ${card.rarity || ''} ${canPlay ? '' : 'unplayable'} ${G.selectedCard === i ? 'selected' : ''}`;

        // Role display
        const roleDisplay = card.role ? card.role.replace(/_/g, ' ') : '';

        el.innerHTML = `
            <img class="hc-art" src="${getImg(card)}" alt="${card.name}" loading="lazy" onerror="this.src='/static/images/cards/placeholder.webp'">
            <div class="hc-cost">${gs.cost}</div>
            <div class="hc-abilities">${getAbilityIcons(gs.abilities)}</div>
            <div class="hc-info">
                <div class="hc-name">${card.name}</div>
                <div class="hc-role">${roleDisplay}</div>
                <div class="hc-stats">
                    <div>
                        <span class="hc-stat hc-stat-atk">${gs.atk}</span>
                        <span class="hc-stat-label">ATK</span>
                    </div>
                    <div>
                        <span class="hc-stat hc-stat-hp">${gs.hp}</span>
                        <span class="hc-stat-label">HP</span>
                    </div>
                </div>
            </div>`;

        // TAP to select card
        el.addEventListener('click', () => {
            if (!canPlay) { showCardModal(card); return; }
            if (G.selectedCard === i) { G.selectedCard = null; renderHand(); clearSlotHighlights(); return; }
            G.selectedCard = i;
            renderHand();
            highlightEmptySlots();
        });

        // Long press for details
        let pressTimer;
        el.addEventListener('touchstart', () => { pressTimer = setTimeout(() => showCardModal(card), 500); }, { passive: true });
        el.addEventListener('touchend', () => clearTimeout(pressTimer), { passive: true });
        el.addEventListener('touchmove', () => clearTimeout(pressTimer), { passive: true });

        container.appendChild(el);

        // Dot for pagination
        const dot = document.createElement('div');
        dot.className = `hand-dot ${G.selectedCard === i ? 'active' : ''}`;
        dotsContainer.appendChild(dot);
    });

    $('handCount').textContent = `${G.playerHand.length} / ${CFG.MAX_HAND}`;
}

function highlightEmptySlots() {
    document.querySelectorAll('#playerBoard .player-slot').forEach(s => {
        if (!G.playerBoard[+s.dataset.slot]) s.classList.add('highlight');
        else s.classList.remove('highlight');
    });
}
function clearSlotHighlights() {
    document.querySelectorAll('.player-slot.highlight').forEach(s => s.classList.remove('highlight'));
}

// SVG stat icons (inline, no emoji)
const SVG_ATK = '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M15.5 2.1L22 8.6 19.9 10.7 18 8.8 11 15.8 13 17.8 10.9 19.9 4.4 13.4 6.5 11.3 8.4 13.2 15.4 6.2 13.4 4.2z"/></svg>';
const SVG_HP = '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
const SVG_SWORDS_SM = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.5 3.5L21 10l-2 2-2-2-5 5 2 2-2 2-6.5-6.5L2 15l2-2 2 2 5-5-2-2 2-2z"/></svg>';
const SVG_EXPLOSION_SM = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2l2.5 5 5.5.8-4 3.9.9 5.3-4.9-2.6-4.9 2.6.9-5.3-4-3.9 5.5-.8L12 2z"/></svg>';

function renderBoardCard(card, isEnemy) {
    if (!card) return '';
    const icons = getAbilityIcons(card.abilities, 12);
    return `<div class="board-card ${card.rarity || ''} ${card.hasTaunt ? 'has-taunt' : ''} ${card.stealthTurns > 0 ? 'has-stealth' : ''} ${card.hasShield ? 'has-shield' : ''} ${!isEnemy && card.canAttackThisTurn && !card.hasAttacked && G.isPlayerTurn ? 'can-attack' : ''}" data-name="${card.name}">
        <div class="bc-name">${card.name}</div>
        <img class="bc-art" src="${getImg(card)}" onerror="this.src='/static/images/cards/placeholder.webp'" loading="lazy" decoding="async">
        <div class="bc-icons">${icons}</div>
        ${card.hasTaunt ? '<div class="bc-taunt-tag">TAUNT</div>' : ''}
        <div class="bc-stats">
            <span class="bc-stat bc-atk">${getEffAtk(card)}${SVG_ATK}</span>
            <span class="bc-stat bc-hp">${card.currentHp}${SVG_HP}</span>
        </div>
    </div>`;
}

function renderBoards() {
    // Player board
    document.querySelectorAll('#playerBoard .board-slot').forEach((slot, i) => {
        const card = G.playerBoard[i];
        if (card) {
            slot.innerHTML = renderBoardCard(card, false);
            slot.classList.remove('highlight');
            // Tap to select attacker; long-press to zoom
            let pressTimer;
            const bc = slot.querySelector('.board-card');
            if (bc) {
                bc.addEventListener('click', () => {
                    if (G.isAnimating || !G.isPlayerTurn) return;
                    if (card.canAttackThisTurn && !card.hasAttacked) {
                        selectedAttacker = selectedAttacker === i ? null : i;
                        renderBoards(); updateAttackBtn();
                    } else {
                        showCardZoom(card);
                    }
                });
                bc.addEventListener('touchstart', () => { pressTimer = setTimeout(() => showCardZoom(card), 400); }, { passive: true });
                bc.addEventListener('touchend', () => clearTimeout(pressTimer), { passive: true });
                bc.addEventListener('touchmove', () => clearTimeout(pressTimer), { passive: true });
            }
            if (selectedAttacker === i) slot.querySelector('.board-card')?.classList.add('selected-attacker');
        } else {
            slot.innerHTML = '';
            slot.addEventListener('click', () => { if (G.selectedCard !== null && !G.playerBoard[i]) playCard(i); });
        }
    });
    // Enemy board
    document.querySelectorAll('#enemyBoard .board-slot').forEach((slot, i) => {
        const card = G.enemyBoard[i];
        if (card) {
            slot.innerHTML = renderBoardCard(card, true);
            if (selectedAttacker !== null) {
                slot.querySelector('.board-card')?.classList.add('target-highlight');
                slot.querySelector('.board-card')?.addEventListener('click', () => attackTarget(i));
            } else {
                // Tap to zoom enemy card
                const ebc = slot.querySelector('.board-card');
                if (ebc) {
                    ebc.addEventListener('click', () => showCardZoom(card));
                }
            }
        } else {
            slot.innerHTML = '';
            if (selectedAttacker !== null) slot.addEventListener('click', () => attackFace());
        }
    });
}

function renderSynergies() {
    const bar = $('synergyTicker'); bar.innerHTML = '';
    G.playerSynergies.forEach(s => { const t = document.createElement('span'); t.className = 'syn-pill role-syn'; t.textContent = s.name; bar.appendChild(t); });
    G.playerSetBonuses.forEach(s => { const t = document.createElement('span'); t.className = 'syn-pill set-syn'; t.textContent = s.name; bar.appendChild(t); });
}

function updateAttackBtn() {
    const btn = $('attackBtn');
    if (!G.isPlayerTurn || G.isAnimating) { btn.disabled = true; btn.querySelector('.btn-text').textContent = 'ATTACK'; btn.classList.remove('face-mode'); return; }
    const hasAttacker = G.playerBoard.some(c => c && c.canAttackThisTurn && !c.hasAttacked && c.stealthTurns <= 0);
    if (!hasAttacker) { btn.disabled = true; btn.querySelector('.btn-text').textContent = 'ATTACK'; btn.classList.remove('face-mode'); return; }
    const hasTaunt = G.enemyBoard.some(c => c && c.hasTaunt && c.stealthTurns <= 0);
    const hasEnemyCards = G.enemyBoard.some(c => c);
    if (!hasEnemyCards || (!hasTaunt && selectedAttacker !== null)) {
        btn.disabled = false; btn.querySelector('.btn-text').textContent = 'GO FACE'; btn.querySelector('.btn-icon').innerHTML = SVG_EXPLOSION_SM; btn.classList.add('face-mode');
    } else {
        btn.disabled = false; btn.querySelector('.btn-text').textContent = 'ATTACK'; btn.querySelector('.btn-icon').innerHTML = SVG_SWORDS_SM; btn.classList.remove('face-mode');
    }
}

// ═══ PLAY CARD ═══
async function playCard(slotIdx) {
    if (G.selectedCard === null || G.playerBoard[slotIdx] || G.isAnimating) return;
    const card = G.playerHand[G.selectedCard];
    if (!card || card.gameStats.cost > G.energy) return;
    G.isAnimating = true;
    G.energy -= card.gameStats.cost;
    const bc = initBoardCard(card); bc._isPlayer = true;
    G.playerBoard[slotIdx] = bc;
    G.playerHand.splice(G.selectedCard, 1);
    G.selectedCard = null; G.stats.cardsPlayed++;
    clearSlotHighlights();
    renderHand(); renderEnergy(); renderBoards();
    const slot = document.querySelector(`#playerBoard .board-slot[data-slot="${slotIdx}"]`);
    const cardEl = slot?.querySelector('.board-card');
    if (cardEl) { cardEl.classList.add('slamming'); screenShake(); }
    await sleep(400);
    if (cardEl) cardEl.classList.remove('slamming');
    await handleBattlecry(bc, false, slotIdx);
    const { synergies, setBonuses } = computeSynergies(G.playerBoard, true);
    const newSyn = synergies.filter(s => !G.playerSynergies.find(ps => ps.key === s.key));
    const newSet = setBonuses.filter(s => !G.playerSetBonuses.find(ps => ps.set === s.set && ps.desc === s.desc));
    for (const syn of newSyn) { showAnnounce(announce('synergy')); addLog(`${syn.name}: ${syn.desc}`, 'ability'); G.stats.synergiesActivated++; await sleep(800); }
    for (const sb of newSet) { addLog(`${sb.name}: ${sb.desc}`, 'ability'); G.stats.synergiesActivated++; }
    G.playerSynergies = synergies; G.playerSetBonuses = setBonuses;
    applyBonuses(G.playerBoard, synergies, setBonuses, true);
    addLog(`You summon ${bc.name}!`, 'summon');
    if (bc.hasRush) addLog(`${announce('rushPlay')}`, 'ability');
    renderAll();
    G.isAnimating = false;
}

// ═══ BATTLECRY ═══
async function handleBattlecry(card, isEnemy, slotIdx) {
    const board = isEnemy ? G.enemyBoard : G.playerBoard;
    const allies = board.filter((c, i) => c && i !== slotIdx);
    if (card.hasBuff && allies.length > 0) {
        const t = allies[Math.floor(Math.random() * allies.length)];
        t.currentAtk += 2; t.currentHp += 2; t.maxHp += 2;
        addLog(`${card.name} buffs ${t.name} +2/+2!`, 'ability'); G.stats.abilitiesFired++;
        const idx = board.indexOf(t);
        const boardId = isEnemy ? 'enemyBoard' : 'playerBoard';
        const el = document.querySelector(`#${boardId} .board-slot[data-slot="${idx}"] .board-card`);
        if (el) { el.classList.add('buffed'); showFloat(el, '+2/+2', 'heal-dmg'); }
    }
    if (card.hasTaunt) { addLog(`${card.name}: ${announce('taunt')}`, 'ability'); G.stats.abilitiesFired++; }
    if (card.stealthTurns > 0) { addLog(`${card.name}: ${announce('stealth')}`, 'ability'); G.stats.abilitiesFired++; }
    if (card.hasDebuff) {
        const eBoard = isEnemy ? G.playerBoard : G.enemyBoard;
        eBoard.filter(c => c).forEach(e => { e.currentAtk = Math.max(1, e.currentAtk - Math.max(1, Math.ceil(e.currentAtk * 0.15))); });
        addLog(`${card.name}: ${announce('debuff')}`, 'ability'); G.stats.abilitiesFired++;
    }
    renderBoards();
}

// ═══ ATTACK FACE ═══
async function attackFace() {
    if (!G.isPlayerTurn || G.isAnimating) return;
    let atkIdx = selectedAttacker;
    if (atkIdx === null) atkIdx = G.playerBoard.findIndex(c => c && c.canAttackThisTurn && !c.hasAttacked && c.stealthTurns <= 0);
    if (atkIdx === -1 || !G.playerBoard[atkIdx]) return;
    const hasTaunt = G.enemyBoard.some(c => c && c.hasTaunt && c.stealthTurns <= 0);
    if (hasTaunt) { addLog('Must attack TAUNT card first!', 'ability'); return; }
    G.isAnimating = true;
    const attacker = G.playerBoard[atkIdx];
    let dmg = getEffAtk(attacker);
    let isCrit = Math.random() * 100 < getEffCrit(attacker);
    if (isCrit) { dmg = Math.ceil(dmg * (attacker.hasCritBoost ? 2.0 : 1.5)); G.stats.critsLanded++; }
    const aSlot = document.querySelector(`#playerBoard .board-slot[data-slot="${atkIdx}"]`);
    const aCard = aSlot?.querySelector('.board-card');
    if (aCard) aCard.classList.add('attacking');
    await sleep(250);
    G.enemyHP -= dmg; G.stats.damageDealt += dmg; G.stats.faceDamage += dmg;
    G.comboCount++; G.stats.maxCombo = Math.max(G.stats.maxCombo, G.comboCount);
    screenShake(); screenFlash(isCrit ? 'rgba(255,215,0,0.3)' : 'rgba(255,68,68,0.2)');
    addLog(`${attacker.name} deals ${dmg}${isCrit ? ' CRIT' : ''} to ENEMY! ${announce('goFace')}`, isCrit ? 'crit' : 'damage');
    if (attacker.hasLifesteal && dmg > 0) {
        const h = Math.ceil(dmg * 0.30);
        attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + h);
        G.stats.damageHealed += h;
        if (aCard) showFloat(aCard, `+${h}`, 'heal-dmg');
    }
    await sleep(300);
    if (aCard) aCard.classList.remove('attacking');
    attacker.hasAttacked = true; selectedAttacker = null;
    renderAll(); G.isAnimating = false;
    checkGameOver();
}

// ═══ ATTACK TARGET ═══
async function attackTarget(targetIdx) {
    if (!G.isPlayerTurn || G.isAnimating) return;
    let atkIdx = selectedAttacker;
    if (atkIdx === null) atkIdx = G.playerBoard.findIndex(c => c && c.canAttackThisTurn && !c.hasAttacked && c.stealthTurns <= 0);
    if (atkIdx === -1) return;
    const attacker = G.playerBoard[atkIdx];
    const target = G.enemyBoard[targetIdx];
    if (!target) { await attackFace(); return; }
    const hasTaunt = G.enemyBoard.some(c => c && c.hasTaunt && c.stealthTurns <= 0);
    if (hasTaunt && !target.hasTaunt) { addLog('Must attack TAUNT card first!', 'ability'); return; }
    if (target.stealthTurns > 0) { addLog(`${target.name} is in STEALTH!`, 'ability'); return; }
    G.isAnimating = true;
    let dmg = getEffAtk(attacker);
    let isCrit = Math.random() * 100 < getEffCrit(attacker);
    if (isCrit) { dmg = Math.ceil(dmg * (attacker.hasCritBoost ? 2.0 : 1.5)); G.stats.critsLanded++; }
    const aSlot = document.querySelector(`#playerBoard .board-slot[data-slot="${atkIdx}"]`);
    const aCard = aSlot?.querySelector('.board-card');
    if (aCard) aCard.classList.add('attacking');
    await sleep(250);
    const tSlot = document.querySelector(`#enemyBoard .board-slot[data-slot="${targetIdx}"]`);
    const tCard = tSlot?.querySelector('.board-card');
    const dodgeChance = getEffDodge(target);
    if (Math.random() * 100 < dodgeChance) {
        if (tCard) showFloat(tCard, 'DODGE!', 'miss-dmg');
        addLog(`${target.name}: ${announce('dodge')}`, 'ability'); G.stats.dodgesTriggered++;
        G.comboCount = 0;
    } else if (target.hasShield) {
        target.hasShield = false;
        if (tCard) showFloat(tCard, 'BLOCKED!', 'miss-dmg');
        addLog(`${target.name}: ${announce('shield')}`, 'ability'); G.stats.shieldsBlocked++; G.stats.abilitiesFired++;
        G.comboCount = 0;
    } else {
        target.currentHp -= dmg; G.stats.damageDealt += dmg;
        G.comboCount++; G.stats.maxCombo = Math.max(G.stats.maxCombo, G.comboCount);
        screenShake();
        if (isCrit) { screenFlash('rgba(255,215,0,0.3)'); addLog(`${attacker.name}: ${announce('critHit')}`, 'crit'); }
        if (tCard) { tCard.classList.add('hit'); showFloat(tCard, `-${dmg}${isCrit ? ' CRIT' : ''}`, isCrit ? 'crit-dmg' : 'dmg'); }
        addLog(`${attacker.name} deals ${dmg}${isCrit ? ' CRIT' : ''} to ${target.name}!`, isCrit ? 'crit' : 'damage');
        if (attacker.hasLifesteal && dmg > 0) {
            const h = Math.ceil(dmg * 0.30); attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + h);
            G.stats.damageHealed += h; G.stats.abilitiesFired++;
            if (aCard) showFloat(aCard, `+${h}`, 'heal-dmg');
        }
        await sleep(300);
        if (tCard) tCard.classList.remove('hit');
        if (target.currentHp <= 0) await handleDeath(target, targetIdx, true, attacker);
    }
    await sleep(200);
    if (aCard) aCard.classList.remove('attacking');
    attacker.hasAttacked = true; selectedAttacker = null;
    renderAll(); G.isAnimating = false;
    checkGameOver();
}

// ═══ DEATH HANDLING ═══
async function handleDeath(card, slot, isOnEnemyBoard, killer) {
    const board = isOnEnemyBoard ? G.enemyBoard : G.playerBoard;
    const boardId = isOnEnemyBoard ? 'enemyBoard' : 'playerBoard';
    const slotEl = document.querySelector(`#${boardId} .board-slot[data-slot="${slot}"]`);
    const cardEl = slotEl?.querySelector('.board-card');
    if (cardEl) { cardEl.classList.add('dying'); await sleep(600); }
    // Self destruct AOE
    if (card.hasSelfDestruct) {
        const oppBoard = isOnEnemyBoard ? G.playerBoard : G.enemyBoard;
        const aoeDmg = Math.ceil(card.currentAtk * 1.50);
        oppBoard.filter(c => c).forEach(c => { c.currentHp -= aoeDmg; });
        addLog(`${card.name}: ${announce('selfDestruct')} ${aoeDmg} to all!`, 'damage');
        screenShake(); screenFlash('rgba(255,140,0,0.3)');
        G.stats.abilitiesFired++;
        for (let i = 0; i < oppBoard.length; i++) {
            if (oppBoard[i] && oppBoard[i].currentHp <= 0) {
                await handleDeath(oppBoard[i], i, !isOnEnemyBoard, card);
            }
        }
    }
    board[slot] = null;
    addLog(`${card.name} is destroyed!`, isOnEnemyBoard ? 'damage' : '');
    renderBoards();
}

// ═══ END TURN ═══
async function endTurn() {
    if (!G.isPlayerTurn || G.isAnimating) return;
    G.isPlayerTurn = false; G.comboCount = 0; selectedAttacker = null;
    renderTurn(); updateAttackBtn();
    await processEndTurn(G.playerBoard, 'playerBoard');
    await sleep(400);
    await enemyTurn();
    startNewTurn();
}

async function processEndTurn(board, boardId) {
    for (let i = 0; i < board.length; i++) {
        const card = board[i]; if (!card || card.currentHp <= 0) continue;
        // HEAL ability
        if (card.hasHeal) {
            const allies = board.filter(c => c && c.currentHp > 0 && c.currentHp < c.maxHp);
            if (allies.length) {
                const low = allies.sort((a, b) => a.currentHp - b.currentHp)[0];
                const h = Math.ceil(card.maxHp * 0.25);
                low.currentHp = Math.min(low.maxHp, low.currentHp + h);
                G.stats.damageHealed += h; G.stats.abilitiesFired++;
                addLog(`${card.name} heals ${low.name} for ${h}!`, 'heal');
            }
        }
        // Auto heal from synergies
        if (card.autoHealPct > 0 && card.currentHp < card.maxHp) {
            const h = Math.ceil(card.maxHp * card.autoHealPct);
            card.currentHp = Math.min(card.maxHp, card.currentHp + h); G.stats.damageHealed += h;
        }
        // Stealth countdown
        if (card.stealthTurns > 0) card.stealthTurns--;
        // Debuff countdown
        if (card.debuffTurnsLeft > 0) card.debuffTurnsLeft--;
    }
    // Chaos roll (Shrine set)
    const chaosCards = board.filter(c => c && c._chaosRoll);
    if (chaosCards.length) {
        const lucky = Math.random() < 0.5;
        const cards = board.filter(c => c);
        if (lucky) { cards.forEach(c => c.synergyAtkBonus += Math.ceil(c.currentAtk * 0.20)); addLog('CHAT DECIDES: +20% ATK!', 'ability'); }
        else { cards.forEach(c => c.synergyAtkBonus -= Math.ceil(c.currentAtk * 0.15)); addLog('CHAT DECIDES: -15% ATK! KEKW', 'damage'); }
    }
    renderBoards();
}

// ═══ ENEMY AI ═══
async function enemyTurn() {
    addLog('--- ENEMY TURN ---', '');
    if (G.enemyDeck.length > 0 && G.enemyHand.length < CFG.MAX_HAND) G.enemyHand.push(G.enemyDeck.pop());
    if (difficulty === 'boss' && G.enemyDeck.length > 0 && G.enemyHand.length < CFG.MAX_HAND) G.enemyHand.push(G.enemyDeck.pop());
    const eEnergy = Math.min(G.turn, CFG.MAX_ENERGY);
    let spent = 0;
    let playable = G.enemyHand.map((c, i) => ({ card: c, idx: i })).filter(x => x.card.gameStats.cost <= eEnergy);
    if (difficulty === 'casual') { shuffle(playable); }
    else {
        playable.sort((a, b) => {
            const aA = (a.card.gameStats.abilities || []).length, bA = (b.card.gameStats.abilities || []).length;
            if (aA !== bA) return bA - aA;
            return b.card.gameStats.cost - a.card.gameStats.cost;
        });
    }
    for (const { card } of playable) {
        if (card.gameStats.cost > eEnergy - spent) continue;
        const slot = G.enemyBoard.findIndex(s => s === null);
        if (slot === -1) break;
        spent += card.gameStats.cost;
        const bc = initBoardCard(card);
        if (difficulty === 'boss') { bc.currentAtk += CFG.BOSS.bonusAtk; bc.currentHp += CFG.BOSS.bonusHp; bc.maxHp += CFG.BOSS.bonusHp; }
        G.enemyBoard[slot] = bc;
        const hIdx = G.enemyHand.indexOf(card);
        if (hIdx !== -1) G.enemyHand.splice(hIdx, 1);
        renderBoards();
        const slotEl = document.querySelector(`#enemyBoard .board-slot[data-slot="${slot}"]`);
        const cEl = slotEl?.querySelector('.board-card');
        if (cEl) { cEl.classList.add('slamming'); screenShake(); }
        addLog(`Enemy summons ${bc.name}!`, 'summon');
        await handleBattlecry(bc, true, slot);
        await sleep(500);
        if (cEl) cEl.classList.remove('slamming');
    }
    const { synergies, setBonuses } = computeSynergies(G.enemyBoard, false);
    const newSyn = synergies.filter(s => !G.enemySynergies.find(es => es.key === s.key));
    for (const syn of newSyn) addLog(`Enemy: ${syn.name}`, 'ability');
    G.enemySynergies = synergies; G.enemySetBonuses = setBonuses;
    applyBonuses(G.enemyBoard, synergies, setBonuses, false);
    await sleep(300);
    // Enemy attacks
    for (let i = 0; i < G.enemyBoard.length; i++) {
        const attacker = G.enemyBoard[i];
        if (!attacker || !attacker.canAttackThisTurn || attacker.hasAttacked || attacker.stealthTurns > 0) continue;
        const playerCards = G.playerBoard.filter(c => c && c.stealthTurns <= 0);
        const tauntCards = playerCards.filter(c => c.hasTaunt);
        let targetIdx = -1;
        if (tauntCards.length > 0) {
            targetIdx = G.playerBoard.findIndex(c => c && c.hasTaunt && c.stealthTurns <= 0);
        } else if (playerCards.length > 0 && (difficulty === 'ranked' || difficulty === 'boss')) {
            let minHp = Infinity;
            G.playerBoard.forEach((c, j) => { if (c && c.stealthTurns <= 0 && c.currentHp < minHp) { minHp = c.currentHp; targetIdx = j; } });
        } else if (playerCards.length > 0) {
            const indices = []; G.playerBoard.forEach((c, j) => { if (c && c.stealthTurns <= 0) indices.push(j); });
            if (indices.length) targetIdx = indices[Math.floor(Math.random() * indices.length)];
        }
        await enemyAttack(i, targetIdx);
        if (G.playerHP <= 0) break;
    }
    await processEndTurn(G.enemyBoard, 'enemyBoard');
    renderAll();
}

async function enemyAttack(atkIdx, targetIdx) {
    const attacker = G.enemyBoard[atkIdx];
    if (!attacker) return;
    let dmg = getEffAtk(attacker);
    let isCrit = Math.random() * 100 < getEffCrit(attacker);
    if (isCrit) dmg = Math.ceil(dmg * (attacker.hasCritBoost ? 2.0 : 1.5));
    const aSlot = document.querySelector(`#enemyBoard .board-slot[data-slot="${atkIdx}"]`);
    const aCard = aSlot?.querySelector('.board-card');
    if (aCard) aCard.classList.add('attacking');
    await sleep(250);
    if (targetIdx === -1 || !G.playerBoard[targetIdx]) {
        G.playerHP -= dmg; G.stats.damageTaken += dmg;
        screenShake(); screenFlash('rgba(255,68,68,0.2)');
        addLog(`${attacker.name} deals ${dmg}${isCrit ? ' CRIT' : ''} to YOU!`, isCrit ? 'crit' : 'damage');
        if (G.playerHP <= 8) showAnnounce(announce('lowHP'));
    } else {
        const target = G.playerBoard[targetIdx];
        const tSlot = document.querySelector(`#playerBoard .board-slot[data-slot="${targetIdx}"]`);
        const tCard = tSlot?.querySelector('.board-card');
        const dodge = getEffDodge(target);
        if (Math.random() * 100 < dodge) {
            if (tCard) showFloat(tCard, 'DODGE!', 'miss-dmg');
            addLog(`${target.name} dodged!`, 'ability');
        } else if (target.hasShield) {
            target.hasShield = false;
            if (tCard) showFloat(tCard, 'BLOCKED!', 'miss-dmg');
            addLog(`${target.name}: Shield blocked!`, 'ability');
        } else {
            target.currentHp -= dmg;
            if (tCard) { tCard.classList.add('hit'); showFloat(tCard, `-${dmg}${isCrit ? ' CRIT' : ''}`, isCrit ? 'crit-dmg' : 'dmg'); }
            addLog(`${attacker.name} deals ${dmg}${isCrit ? ' CRIT' : ''} to ${target.name}!`, isCrit ? 'crit' : 'damage');
            if (attacker.hasLifesteal && dmg > 0) { const h = Math.ceil(dmg * 0.30); attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + h); }
            await sleep(300);
            if (tCard) tCard.classList.remove('hit');
            if (target.currentHp <= 0) await handleDeath(target, targetIdx, false, attacker);
        }
    }
    await sleep(200);
    if (aCard) aCard.classList.remove('attacking');
    attacker.hasAttacked = true;
    renderHP(); renderBoards();
    checkGameOver();
}

// ═══ NEW TURN ═══
function startNewTurn() {
    G.turn++;
    G.maxEnergy = Math.min(G.turn, CFG.MAX_ENERGY);
    G.energy = G.maxEnergy;
    G.isPlayerTurn = true;
    if (G.playerDeck.length > 0 && G.playerHand.length < CFG.MAX_HAND) G.playerHand.push(G.playerDeck.pop());
    G.playerBoard.forEach(c => { if (c) { c.hasAttacked = false; c.canAttackThisTurn = true; } });
    G.enemyBoard.forEach(c => { if (c) { c.hasAttacked = false; c.canAttackThisTurn = true; } });
    G.comboCount = 0; selectedAttacker = null;
    addLog(announce('turnStart'), '');
    renderAll();
    checkGameOver();
}

// ═══ GAME OVER ═══
function checkGameOver() {
    if (G.playerHP <= 0) endGame(false);
    else if (G.enemyHP <= 0) endGame(true);
}
function endGame(won) {
    const el = $('gameOver'); el.classList.remove('hidden');
    const title = $('gameOverTitle');
    title.textContent = won ? 'VICTORY!' : 'DEFEAT';
    title.className = 'overlay-title ' + (won ? 'victory' : 'defeat');
    showAnnounce(announce(won ? 'victory' : 'defeat'));
    
    // ===== BATTLE REWARDS via NW_WALLET =====
    let rewardHTML = '';
    let reward = { gold: 0, wood: 0, streak: 0 };
    try {
        if (typeof NW_WALLET !== 'undefined' && NW_WALLET.recordBattle) {
            reward = NW_WALLET.recordBattle(won);
            const parts = [];
            if (reward.gold > 0) parts.push(`<span style="color:#ffd700">+${reward.gold} Gold</span>`);
            if (reward.wood > 0) parts.push(`<span style="color:#00ff88">+${reward.wood} Sacred Log!</span>`);
            if (won && reward.streak >= 3) parts.push(`<span style="color:#ff6b00">${reward.streak} Win Streak!</span>`);
            if (parts.length > 0) {
                rewardHTML = `<div class="battle-rewards" style="margin-top:12px;padding:10px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:10px;text-align:center">
                    <div style="font-size:11px;opacity:0.7;margin-bottom:4px">REWARDS</div>
                    <div style="font-size:16px;font-weight:700;display:flex;gap:12px;justify-content:center">${parts.join('')}</div>
                </div>`;
            }
        }
    } catch (e) { console.warn('[BATTLE] Reward error:', e); }
    
    $('gameOverStats').innerHTML = `
        <div>Damage Dealt: <strong>${G.stats.damageDealt}</strong></div>
        <div>Face Damage: <strong>${G.stats.faceDamage}</strong></div>
        <div>Cards Played: <strong>${G.stats.cardsPlayed}</strong></div>
        <div>Crits: <strong>${G.stats.critsLanded}</strong></div>
        <div>Abilities: <strong>${G.stats.abilitiesFired}</strong></div>
        <div>Synergies: <strong>${G.stats.synergiesActivated}</strong></div>
        <div>Max Combo: <strong>${G.stats.maxCombo}</strong></div>
        <div>Turns: <strong>${G.turn}</strong></div>
        ${rewardHTML}`;
    try {
        const p = JSON.parse(localStorage.getItem('nw_profile') || '{}');
        if (won) p.wins = (p.wins || 0) + 1; else p.losses = (p.losses || 0) + 1;
        localStorage.setItem('nw_profile', JSON.stringify(p));
    } catch (e) {}
}

// ═══ CARD MODALS ═══
function showCardModal(card) {
    const gs = card.gameStats;
    const ab = gs.abilities || [];
    const abMap = typeof NW_ABILITIES !== 'undefined' ? NW_ABILITIES : {};
    $('cardModalContent').innerHTML = `
        <img class="modal-art" src="${getImg(card)}" onerror="this.src='/static/images/cards/placeholder.webp'">
        <div class="modal-name">${card.name}</div>
        <div class="modal-desc">${card.description || ''}</div>
        <div class="modal-stats-row">
            <div class="modal-stat"><div class="modal-stat-val" style="color:#42a5f5">${gs.cost}</div><div class="modal-stat-label">Cost</div></div>
            <div class="modal-stat"><div class="modal-stat-val" style="color:#ef5350">${gs.atk}</div><div class="modal-stat-label">ATK</div></div>
            <div class="modal-stat"><div class="modal-stat-val" style="color:#66bb6a">${gs.hp}</div><div class="modal-stat-label">HP</div></div>
        </div>
        <div class="modal-abilities">${ab.map(a => { const ic = typeof NW_ICONS !== 'undefined' ? NW_ICONS.ability(a, 14) : ''; return `<span class="modal-ability">${ic} ${a}: ${abMap[a]?.desc || ''}</span>`; }).join('')}</div>`;
    $('cardModal').classList.remove('hidden');
}
function showBoardCardModal(card) {
    const ab = card.abilities || [];
    const abMap = typeof NW_ABILITIES !== 'undefined' ? NW_ABILITIES : {};
    $('cardModalContent').innerHTML = `
        <img class="modal-art" src="${getImg(card)}" onerror="this.src='/static/images/cards/placeholder.webp'">
        <div class="modal-name">${card.name}</div>
        <div class="modal-stats-row">
            <div class="modal-stat"><div class="modal-stat-val" style="color:#ef5350">${getEffAtk(card)}</div><div class="modal-stat-label">ATK</div></div>
            <div class="modal-stat"><div class="modal-stat-val" style="color:#66bb6a">${card.currentHp}/${card.maxHp}</div><div class="modal-stat-label">HP</div></div>
        </div>
        <div class="modal-abilities">${ab.map(a => { const ic = typeof NW_ICONS !== 'undefined' ? NW_ICONS.ability(a, 14) : ''; return `<span class="modal-ability">${ic} ${a}: ${abMap[a]?.desc || ''}</span>`; }).join('')}</div>`;
    $('cardModal').classList.remove('hidden');
}
window.closeCardModal = function(e) { if (e.target.id === 'cardModal') $('cardModal').classList.add('hidden'); };

// ═══ DIFFICULTY ═══
window.selectDiff = function(diff) {
    document.querySelectorAll('.diff-card').forEach(b => b.classList.remove('selected'));
    document.querySelector(`[data-diff="${diff}"]`)?.classList.add('selected');
    difficulty = diff;
    const names = { casual: ['Sleepy Bot', 'AFK Andy'], ranked: ['Try-Hard Tina', 'Meta Knight'], boss: ['RegginA, The Eternal Flame', 'Guild Destroyer'] };
    const avatarSVGs = {
        casual: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="5" y="8" width="14" height="12" rx="3"/><circle cx="9" cy="13" r="1.5"/><circle cx="15" cy="13" r="1.5"/><rect x="10" y="16" width="4" height="2" rx="1"/><line x1="12" y1="2" x2="12" y2="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="2" r="1.5"/></svg>',
        ranked: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z"/></svg>',
        boss: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10c0 2.76 1.34 5.2 3.4 6.72L7 21h3l.5-2h3l.5 2h3l-.4-4.28C18.66 15.2 20 12.76 20 10c0-4.42-3.58-8-8-8zm-2.5 10a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>'
    };
    $('enemyAvatar').innerHTML = avatarSVGs[diff] || avatarSVGs.casual;
    $('enemyName').textContent = (names[diff] || names.casual)[Math.floor(Math.random() * (names[diff] || names.casual).length)];
};

// ═══ INIT ═══
async function init() {
    console.log('[Battle v7.0] Init...');
    try {
        if (typeof NW_CARDS !== 'undefined') {
            await NW_CARDS.init();
            CARDS = (NW_CARDS.getAll() || []).filter(c => c.gameStats);
        }
    } catch (e) { console.warn('NW_CARDS failed, fallback'); }
    if (!CARDS.length) {
        try {
            const res = await fetch('/static/data/cards-v2.json');
            const data = await res.json();
            CARDS = (data.cards || []).filter(c => c.gameStats);
        } catch (e) { console.error('Cards load failed', e); }
    }
    console.log(`[Battle v7.0] ${CARDS.length} cards loaded`);
    if (!CARDS.length) { alert('No cards loaded!'); return; }

    $('startBtn').addEventListener('click', async () => {
        $('startBtn').disabled = true;
        $('startBtn').textContent = 'LOADING...';
        if (difficulty === 'boss') G.enemyHP = CFG.BOSS.hp;
        G.playerDeck = createDeck(true);
        G.enemyDeck = createDeck(false);
        if (!G.playerDeck.length) G.playerDeck = shuffle(CARDS.slice(0, CFG.DECK_SIZE));
        if (!G.enemyDeck.length) G.enemyDeck = shuffle(CARDS.slice(0, CFG.DECK_SIZE));
        G.playerHand = []; G.enemyHand = [];
        for (let i = 0; i < CFG.START_HAND; i++) {
            if (G.playerDeck.length) G.playerHand.push(G.playerDeck.pop());
            if (G.enemyDeck.length) G.enemyHand.push(G.enemyDeck.pop());
        }
        $('startScreen').classList.add('hidden');
        showAnnounce('3'); await sleep(600);
        showAnnounce('2'); await sleep(600);
        showAnnounce('1'); await sleep(600);
        showAnnounce(announce('battleStart')); await sleep(800);
        renderAll();
        addLog(announce('battleStart'), '');
    });

    $('endTurnBtn').addEventListener('click', () => endTurn());
    $('attackBtn').addEventListener('click', () => {
        if (selectedAttacker !== null) {
            const hasEnemy = G.enemyBoard.some(c => c);
            const hasTaunt = G.enemyBoard.some(c => c && c.hasTaunt && c.stealthTurns <= 0);
            if (!hasEnemy || !hasTaunt) attackFace();
        } else {
            const idx = G.playerBoard.findIndex(c => c && c.canAttackThisTurn && !c.hasAttacked && c.stealthTurns <= 0);
            if (idx !== -1) { selectedAttacker = idx; attackFace(); }
        }
    });

    console.log('[Battle v7.1] Ready!');
}

// ═══ TAP-TO-ZOOM: Marvel Snap-style card preview ═══
function showCardZoom(card) {
    const zoom = $('cardZoom');
    const content = $('cardZoomContent');
    if (!zoom || !content) return;
    const ab = card.abilities || [];
    const abMap = typeof NW_ABILITIES !== 'undefined' ? NW_ABILITIES : {};
    const abilityHTML = ab.map(a => {
        const iconSvg = typeof NW_ICONS !== 'undefined' ? NW_ICONS.ability(a, 14) : (abMap[a]?.icon || '');
        return `<span class="cz-ability">${iconSvg} ${a}: ${abMap[a]?.desc || ''}</span>`;
    }).join('');
    content.innerHTML = `
        <img class="cz-art" src="${getImg(card)}" onerror="this.src='/static/images/cards/placeholder.webp'" decoding="async">
        <div class="cz-body">
            <div class="cz-name">${card.name}</div>
            <div class="cz-role">${(card.role || '').replace(/_/g, ' ')}</div>
            <div class="cz-stats">
                <div class="cz-stat"><div class="cz-stat-val" style="color:#ef5350">${getEffAtk(card)}</div><div class="cz-stat-label">ATK</div></div>
                <div class="cz-stat"><div class="cz-stat-val" style="color:#66bb6a">${card.currentHp}/${card.maxHp}</div><div class="cz-stat-label">HP</div></div>
                ${card.baseCrit > 0 ? `<div class="cz-stat"><div class="cz-stat-val" style="color:#ffd700">${getEffCrit(card)}%</div><div class="cz-stat-label">CRIT</div></div>` : ''}
                ${card.baseDodge > 0 || card.hasDodge ? `<div class="cz-stat"><div class="cz-stat-val" style="color:#00e5ff">${getEffDodge(card)}%</div><div class="cz-stat-label">DODGE</div></div>` : ''}
            </div>
            <div class="cz-abilities">${abilityHTML}</div>
            <div class="cz-hint">Tap anywhere to close</div>
        </div>`;
    zoom.classList.remove('hidden');
}
window.closeCardZoom = function(e) {
    if (e.target.id === 'cardZoom' || e.target.closest('.card-zoom')) {
        $('cardZoom').classList.add('hidden');
    }
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

// ═══ MINIMAL API for assist systems (coach, smart-glow, auto-play) ═══
// Read-only state + action triggers. Battle logic stays in this IIFE.
window.NW_BATTLE = {
  getState: () => ({
    playerHP: G.playerHP, enemyHP: G.enemyHP,
    energy: G.energy, maxEnergy: G.maxEnergy,
    turn: G.turn, isPlayerTurn: G.isPlayerTurn,
    isAnimating: G.isAnimating,
    playerHand: G.playerHand,
    playerBoard: G.playerBoard,
    enemyBoard: G.enemyBoard,
    selectedCard: G.selectedCard,
    selectedAttacker: selectedAttacker,
    difficulty: difficulty
  }),
  getEffAtk, getEffCrit, getEffDodge,
  // Actions — same as clicking the UI elements
  selectCard: (idx) => {
    if (idx < 0 || idx >= G.playerHand.length) return;
    const card = G.playerHand[idx];
    if (!card || !card.gameStats || card.gameStats.cost > G.energy || !G.isPlayerTurn || G.isAnimating) return;
    G.selectedCard = idx;
    renderHand(); highlightEmptySlots();
  },
  playToSlot: (slotIdx) => { if (G.selectedCard !== null) playCard(slotIdx); },
  selectAttacker: (idx) => {
    const c = G.playerBoard[idx];
    if (c && c.canAttackThisTurn && !c.hasAttacked && c.stealthTurns <= 0) {
      selectedAttacker = idx; renderBoards(); updateAttackBtn();
    }
  },
  attackTarget: (idx) => attackTarget(idx),
  attackFace: () => attackFace(),
  endTurn: () => endTurn()
};

})();
