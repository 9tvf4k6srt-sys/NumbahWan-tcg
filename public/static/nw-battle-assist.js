// ═══════════════════════════════════════════════════════════════════════
// NW-BATTLE-ASSIST v3: Smart Glow + Auto-Target + One-Tap Turn
// Three layers that reduce cognitive load for new/casual players:
//   1. SMART GLOW — highlights best card to play (gold pulse) +
//      attack-phase board glow on all ready attackers + ATK badge
//   2. AUTO-TARGET — marks best attack target with "HIT" tag
//   3. ONE-TAP TURN — one button does a full optimal turn
// Reads game state via window.NW_BATTLE API. Battle engine untouched.
// Skips ALL visuals and blocks auto-play when #coachOverlay is present.
// ═══════════════════════════════════════════════════════════════════════

(function() {
'use strict';

// ═══ WAIT FOR BATTLE API ═══
function waitForAPI(cb, retries) {
  retries = retries || 50;
  if (window.NW_BATTLE) { cb(); return; }
  if (retries <= 0) { console.warn('[ASSIST] NW_BATTLE API not found after 10s'); return; }
  setTimeout(() => waitForAPI(cb, retries - 1), 200);
}

const B = () => window.NW_BATTLE;

// Don't show recommendations while coach tutorial is running
function coachActive() {
  return !!document.getElementById('coachOverlay');
}

// Smart sleep that waits for animation to finish
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitIdle(maxMs) {
  maxMs = maxMs || 5000;
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const api = B();
    if (!api) return;
    const s = api.getState();
    if (!s.isAnimating) return;
    await sleep(100);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SCORING ENGINE — shared by all 3 systems
// ═══════════════════════════════════════════════════════════════════════

// Score a hand card for "how good is it to play right now"
function scoreHandCard(card, state) {
  if (!card || !card.gameStats) return -999;
  const gs = card.gameStats;
  if (gs.cost > state.energy) return -999;

  let score = 0;
  const atk = gs.atk || 0;
  const hp = gs.hp || 0;
  const cost = gs.cost || 1;
  const abilities = gs.abilities || [];

  // Base: stat efficiency (ATK + HP per mana)
  score += (atk + hp) / Math.max(1, cost) * 10;

  // Ability bonuses
  if (abilities.includes('RUSH'))           score += 20; // immediate board impact
  if (abilities.includes('TAUNT'))          score += 15; // board control
  if (abilities.includes('LIFESTEAL'))      score += 12;
  if (abilities.includes('SHIELD'))         score += 10;
  if (abilities.includes('DEBUFF'))         score += 10;
  if (abilities.includes('BUFF'))           score += 8;
  if (abilities.includes('CRIT_BOOST'))     score += 7;
  if (abilities.includes('HEAL'))           score += 6;
  if (abilities.includes('DODGE'))          score += 6;
  if (abilities.includes('STEALTH'))        score += 5;
  if (abilities.includes('DODGE_BOOST'))    score += 5;
  if (abilities.includes('SELF_DESTRUCT'))  score += 4;

  // ═══ Contextual scoring ═══
  const enemyBoard = state.enemyBoard.filter(c => c);
  const playerBoard = state.playerBoard.filter(c => c);
  const emptySlots = state.playerBoard.filter(c => !c).length;

  // Board full? Can't play.
  if (emptySlots === 0) return -999;

  // If enemy has big board, TAUNT/DEBUFF more valuable
  if (enemyBoard.length >= 3) {
    if (abilities.includes('TAUNT')) score += 10;
    if (abilities.includes('DEBUFF')) score += 8;
  }

  // Empty board? RUSH is king (immediate attacker)
  if (playerBoard.length === 0 && abilities.includes('RUSH')) score += 15;

  // Low HP: prioritize survival
  if (state.playerHP <= 10) {
    if (abilities.includes('HEAL')) score += 15;
    if (abilities.includes('TAUNT')) score += 12;
    if (abilities.includes('LIFESTEAL')) score += 10;
  }

  // Enemy low HP: RUSH for lethal
  if (state.enemyHP <= 10 && abilities.includes('RUSH')) score += 25;

  // Mana efficiency: prefer exact spend
  if (gs.cost === state.energy) score += 5;

  // Higher-cost cards generally better if we can afford them
  score += cost * 2;

  // Synergy: same set/role on board
  if (card.set && playerBoard.some(c => c.set === card.set)) score += 8;
  if (card.role && playerBoard.some(c => c.role === card.role)) score += 5;

  return score;
}

// Score an attack target
function scoreAttackTarget(attacker, target, state) {
  if (!attacker || !target) return -999;
  const api = B();
  const atkDmg = api.getEffAtk(attacker);
  let score = 0;

  // Stealth = can't attack
  if (target.stealthTurns > 0) return -999;

  // Taunt = must attack (game rule)
  if (target.hasTaunt) score += 100;

  // Can we kill it?
  if (target.currentHp <= atkDmg) {
    score += 50;
    score += (target.currentAtk || 0) * 3; // kill high-threat first
    if (target.hasLifesteal) score += 15;
    if (target.hasBuff) score += 10;
    if (target.hasHeal) score += 12;
  } else {
    score += atkDmg * 2;
    score += (target.currentAtk || 0); // weaken strong attackers
  }

  // Shield absorbs damage — less valuable target
  if (target.hasShield) score -= 20;

  return score;
}

// Should we go face?
function scoreFaceDamage(attacker, state) {
  const api = B();
  const dmg = api.getEffAtk(attacker);
  let score = 0;

  // Lethal? Always face.
  if (state.enemyHP <= dmg) return 200;

  score += dmg * 3;

  const enemyCards = state.enemyBoard.filter(c => c);
  if (enemyCards.length === 0) score += 30;
  if (state.enemyHP <= 15) score += 15;
  if (state.playerHP <= 10) score -= 20; // trade instead, protect HP
  if (enemyCards.some(c => c.currentAtk >= 5)) score -= 15;

  return score;
}

// Best empty slot (center-first for aesthetics)
function bestEmptySlot(board) {
  const order = [2, 1, 3, 0, 4];
  for (const i of order) { if (!board[i]) return i; }
  return -1;
}

// ═══ ATTACKER SCORING (new: who should attack first) ═══
function scoreAttacker(card, state) {
  if (!card || !card.canAttackThisTurn || card.hasAttacked || card.stealthTurns > 0) return -999;
  const api = B();
  const dmg = api.getEffAtk(card);
  let score = dmg * 5;

  // High crit = high value attack
  score += api.getEffCrit(card) * 0.5;

  // Lifesteal = prefer attacking with this to heal
  if (card.hasLifesteal) score += 10;

  // If can kill an enemy, boost
  const enemies = state.enemyBoard.filter(c => c && c.stealthTurns <= 0);
  if (enemies.some(e => e.currentHp <= dmg)) score += 20;

  // Lethal check
  if (state.enemyHP <= dmg) score += 100;

  return score;
}

// ═══════════════════════════════════════════════════════════════════════
// 1. SMART GLOW — Highlight best playable card + best attacker
// ═══════════════════════════════════════════════════════════════════════

function updateSmartGlow() {
  if (coachActive()) return;
  const api = B();
  if (!api) return;
  const state = api.getState();

  // Clean old tags
  document.querySelectorAll('.assist-best').forEach(el => el.remove());
  document.querySelectorAll('.assist-recommended').forEach(el => el.classList.remove('assist-recommended'));
  document.querySelectorAll('.assist-atk-best').forEach(el => el.remove());
  document.querySelectorAll('.assist-atk-recommended').forEach(el => el.classList.remove('assist-atk-recommended'));
  document.querySelectorAll('.assist-atk-ready').forEach(el => el.classList.remove('assist-atk-ready'));

  if (!state.isPlayerTurn || state.isAnimating) return;

  // ── Hand card glow ──
  if (state.selectedCard === null) {
    const scored = state.playerHand.map((card, idx) => ({
      card, idx, score: scoreHandCard(card, state)
    })).filter(s => s.score > -900);

    if (scored.length > 0) {
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      const handCards = document.querySelectorAll('#playerHand .hand-card');
      if (best.idx < handCards.length) {
        const el = handCards[best.idx];
        if (!el.classList.contains('unplayable')) {
          el.classList.add('assist-recommended');
          const tag = document.createElement('div');
          tag.className = 'assist-best';
          tag.textContent = 'BEST';
          el.appendChild(tag);
        }
      }
    }
  }

  // ── Board attacker glow (attack-phase glow) ──
  // Phase glow: ALL ready attackers get a subtle pulsing border.
  // Best attacker gets the prominent glow + ATK damage badge.
  document.querySelectorAll('.assist-atk-ready').forEach(el => el.classList.remove('assist-atk-ready'));

  if (state.selectedAttacker === null && state.selectedCard === null) {
    const attackers = [];
    state.playerBoard.forEach((c, i) => {
      if (c && c.canAttackThisTurn && !c.hasAttacked && c.stealthTurns <= 0) {
        attackers.push({ card: c, idx: i, score: scoreAttacker(c, state) });
        // Attack-phase glow on every ready attacker
        const readyEl = document.querySelector(`#playerBoard .board-slot[data-slot="${i}"] .board-card`);
        if (readyEl) readyEl.classList.add('assist-atk-ready');
      }
    });

    if (attackers.length > 0) {
      attackers.sort((a, b) => b.score - a.score);
      const best = attackers[0];
      const api = B();
      const slot = document.querySelector(`#playerBoard .board-slot[data-slot="${best.idx}"] .board-card`);
      if (slot) {
        slot.classList.add('assist-atk-recommended');
        const tag = document.createElement('div');
        tag.className = 'assist-atk-best';
        // Show actual ATK value so player knows the damage
        const atkVal = api ? api.getEffAtk(best.card) : '';
        tag.innerHTML = `<span class="assist-atk-icon">${SVG_SWORD_MINI}</span>${atkVal}`;
        slot.appendChild(tag);
      }
    }
  }
}

function startSmartGlow() {
  const handArea = document.getElementById('playerHand');
  const playerBoard = document.getElementById('playerBoard');

  if (handArea) {
    const obs = new MutationObserver(() => setTimeout(updateSmartGlow, 60));
    obs.observe(handArea, { childList: true, subtree: true });
  }
  if (playerBoard) {
    const obs = new MutationObserver(() => setTimeout(updateSmartGlow, 60));
    obs.observe(playerBoard, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  // Fallback polling
  setInterval(() => { if (B()) updateSmartGlow(); }, 2000);
}

// ═══════════════════════════════════════════════════════════════════════
// 2. AUTO-TARGET — Highlight best target when attacker is selected
// ═══════════════════════════════════════════════════════════════════════

function highlightBestTarget(state) {
  document.querySelectorAll('.assist-target-best').forEach(el => el.classList.remove('assist-target-best'));
  document.querySelectorAll('.assist-face-best').forEach(el => el.classList.remove('assist-face-best'));

  if (coachActive()) return;
  const api = B();
  if (!api || state.selectedAttacker === null) return;

  const attacker = state.playerBoard[state.selectedAttacker];
  if (!attacker) return;

  const enemyCards = state.enemyBoard
    .map((c, i) => c ? { card: c, idx: i } : null)
    .filter(Boolean);

  const hasTaunt = enemyCards.some(e => e.card.hasTaunt && e.card.stealthTurns <= 0);

  let bestIdx = -1;
  let bestScore = -Infinity;

  for (const enemy of enemyCards) {
    if (hasTaunt && !enemy.card.hasTaunt) continue;
    if (enemy.card.stealthTurns > 0) continue;
    const s = scoreAttackTarget(attacker, enemy.card, state);
    if (s > bestScore) { bestScore = s; bestIdx = enemy.idx; }
  }

  // Check face
  let faceIsBest = false;
  if (!hasTaunt) {
    const faceScore = scoreFaceDamage(attacker, state);
    if (faceScore > bestScore) { faceIsBest = true; }
  }

  if (faceIsBest) {
    // Highlight the ATTACK/GO FACE button
    const atkBtn = document.getElementById('attackBtn');
    if (atkBtn) atkBtn.classList.add('assist-face-best');
  } else if (bestIdx >= 0) {
    const slot = document.querySelector(`#enemyBoard .board-slot[data-slot="${bestIdx}"] .board-card`);
    if (slot) slot.classList.add('assist-target-best');
  }
}

function enhanceAttackButton() {
  const playerBoard = document.getElementById('playerBoard');
  const enemyBoard = document.getElementById('enemyBoard');

  const update = () => {
    const api = B();
    if (!api) return;
    const state = api.getState();
    if (!state.isPlayerTurn || state.isAnimating) return;
    if (state.selectedAttacker !== null) highlightBestTarget(state);
  };

  if (playerBoard) {
    new MutationObserver(() => setTimeout(update, 60))
      .observe(playerBoard, { childList: true, subtree: true, attributes: true });
  }
  if (enemyBoard) {
    new MutationObserver(() => setTimeout(update, 60))
      .observe(enemyBoard, { childList: true, subtree: true, attributes: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 3. AUTO PLAY — One-tap optimal turn
// ═══════════════════════════════════════════════════════════════════════

let autoPlaying = false;

function createAutoPlayButton() {
  const actionBar = document.getElementById('actionBar');
  if (!actionBar) return;

  const btn = document.createElement('button');
  btn.className = 'action-btn auto-btn';
  btn.id = 'autoPlayBtn';
  btn.setAttribute('aria-label', 'Auto play this turn');
  btn.innerHTML = `
    <span class="btn-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg></span>
    <span class="btn-text">AUTO</span>
  `;

  // Insert before END TURN
  const endBtn = document.getElementById('endTurnBtn');
  if (endBtn) actionBar.insertBefore(btn, endBtn);
  else actionBar.appendChild(btn);

  btn.addEventListener('click', executeAutoTurn);

  // Disable during enemy turn, animations, or coach tutorial
  setInterval(() => {
    const api = B();
    if (!api) return;
    const s = api.getState();
    btn.disabled = !s.isPlayerTurn || s.isAnimating || autoPlaying || coachActive();
  }, 300);
}

async function executeAutoTurn() {
  if (coachActive()) return; // Gap 4: never auto-play during tutorial
  const api = B();
  if (!api || autoPlaying) return;
  const state = api.getState();
  if (!state.isPlayerTurn || state.isAnimating) return;

  autoPlaying = true;
  const btn = document.getElementById('autoPlayBtn');
  if (btn) {
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'THINKING...';
  }

  try {
    // Phase 1: Play cards (best first, until out of energy or board full)
    await autoPlayCards();

    // Phase 2: Attack with all available minions
    await autoAttack();

    // Phase 3: End turn
    await waitIdle(3000);
    await sleep(300);
    const finalState = api.getState();
    if (finalState.playerHP > 0 && finalState.enemyHP > 0 && finalState.isPlayerTurn) {
      api.endTurn();
    }
  } catch (e) {
    console.warn('[ASSIST] Auto-play error:', e);
  }

  autoPlaying = false;
  if (btn) {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'AUTO';
  }
}

async function autoPlayCards() {
  const api = B();
  let safety = 10;

  while (safety-- > 0) {
    if (coachActive()) break; // respect coach overlay
    await waitIdle(3000);
    const state = api.getState();
    if (!state.isPlayerTurn) break;
    if (state.playerHP <= 0 || state.enemyHP <= 0) break;

    const scored = state.playerHand.map((card, idx) => ({
      card, idx, score: scoreHandCard(card, state)
    })).filter(s => s.score > -900);

    if (scored.length === 0) break;
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    const slotIdx = bestEmptySlot(state.playerBoard);
    if (slotIdx === -1) break;

    // Select card
    api.selectCard(best.idx);
    await sleep(150);
    // Play to slot
    api.playToSlot(slotIdx);
    // Wait for slam animation + battlecry + synergy checks
    await sleep(600);
    await waitIdle(3000);
  }
}

async function autoAttack() {
  const api = B();
  let safety = 10;

  while (safety-- > 0) {
    if (coachActive()) break; // respect coach overlay
    await waitIdle(3000);
    const state = api.getState();
    if (!state.isPlayerTurn) break;
    if (state.playerHP <= 0 || state.enemyHP <= 0) break;

    // Find best attacker
    const attackers = [];
    state.playerBoard.forEach((c, i) => {
      if (c && c.canAttackThisTurn && !c.hasAttacked && c.stealthTurns <= 0) {
        attackers.push({ card: c, idx: i, score: scoreAttacker(c, state) });
      }
    });
    if (attackers.length === 0) break;
    attackers.sort((a, b) => b.score - a.score);
    const bestAtk = attackers[0];

    // Find best target for this attacker
    const enemyCards = state.enemyBoard
      .map((c, i) => c ? { card: c, idx: i } : null)
      .filter(Boolean);

    const hasTaunt = enemyCards.some(e => e.card.hasTaunt && e.card.stealthTurns <= 0);

    let bestTarget = null;
    let bestScore = -Infinity;

    for (const enemy of enemyCards) {
      if (hasTaunt && !enemy.card.hasTaunt) continue;
      if (enemy.card.stealthTurns > 0) continue;
      const s = scoreAttackTarget(bestAtk.card, enemy.card, state);
      if (s > bestScore) { bestScore = s; bestTarget = { type: 'minion', idx: enemy.idx }; }
    }

    if (!hasTaunt) {
      const faceScore = scoreFaceDamage(bestAtk.card, state);
      if (faceScore > bestScore) bestTarget = { type: 'face' };
    }

    if (!bestTarget) break;

    // Execute
    api.selectAttacker(bestAtk.idx);
    await sleep(150);

    if (bestTarget.type === 'face') {
      api.attackFace();
    } else {
      api.attackTarget(bestTarget.idx);
    }

    // Wait for attack animation + death handling
    await sleep(500);
    await waitIdle(3000);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════

// Inline mini sword icon for ATK badge
const SVG_SWORD_MINI = '<svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" style="vertical-align:-1px;margin-right:1px"><path d="M15.5 2.1L22 8.6 19.9 10.7 18 8.8 11 15.8 13 17.8 10.9 19.9 4.4 13.4 6.5 11.3 8.4 13.2 15.4 6.2 13.4 4.2z"/></svg>';

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* ═══ SMART GLOW: Best hand card ═══ */
    .hand-card.assist-recommended {
      box-shadow: 0 0 18px rgba(255, 215, 0, 0.5), 0 0 6px rgba(255, 215, 0, 0.3) !important;
      border-color: var(--gold, #ffd700) !important;
    }
    .assist-best {
      position: absolute;
      top: 6px;
      right: 6px;
      background: linear-gradient(135deg, #ffd700, #ffaa00);
      color: #000;
      font-size: 9px;
      font-weight: 900;
      padding: 2px 7px;
      border-radius: 6px;
      letter-spacing: 0.5px;
      z-index: 10;
      animation: assistPulse 2s ease-in-out infinite;
      font-family: 'Inter', system-ui, sans-serif;
      pointer-events: none;
    }
    @keyframes assistPulse {
      0%, 100% { opacity: 0.85; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.08); }
    }

    /* ═══ ATTACK-PHASE GLOW: All ready attackers ═══ */
    .board-card.assist-atk-ready {
      box-shadow: 0 0 10px rgba(76, 175, 80, 0.35), 0 0 3px rgba(76, 175, 80, 0.2) !important;
      animation: assistAtkReady 2.5s ease-in-out infinite;
    }
    @keyframes assistAtkReady {
      0%, 100% { box-shadow: 0 0 8px rgba(76, 175, 80, 0.25); }
      50% { box-shadow: 0 0 16px rgba(76, 175, 80, 0.5), 0 0 4px rgba(76, 175, 80, 0.25); }
    }

    /* ═══ SMART GLOW: Best board attacker (strongest glow + badge) ═══ */
    .board-card.assist-atk-recommended {
      box-shadow: 0 0 18px rgba(76, 175, 80, 0.7), 0 0 6px rgba(76, 175, 80, 0.4) !important;
      animation: assistAtkBest 1.8s ease-in-out infinite;
    }
    @keyframes assistAtkBest {
      0%, 100% { box-shadow: 0 0 14px rgba(76, 175, 80, 0.6), 0 0 4px rgba(76, 175, 80, 0.3); }
      50% { box-shadow: 0 0 24px rgba(76, 175, 80, 0.8), 0 0 8px rgba(76, 175, 80, 0.4); }
    }
    .assist-atk-best {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #4caf50, #2e7d32);
      color: #fff;
      font-size: 9px;
      font-weight: 900;
      padding: 2px 7px;
      border-radius: 5px;
      letter-spacing: 0.3px;
      z-index: 10;
      font-family: 'Inter', system-ui, sans-serif;
      animation: assistPulse 2s ease-in-out infinite;
      pointer-events: none;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 1px;
    }
    .assist-atk-icon { display: inline-flex; align-items: center; }

    /* ═══ AUTO-TARGET: Best enemy target ═══ */
    .board-card.assist-target-best {
      box-shadow: 0 0 14px rgba(255, 82, 82, 0.6), 0 0 4px rgba(255, 82, 82, 0.3) !important;
    }
    .board-card.assist-target-best::before {
      content: 'HIT';
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #ff5252, #ff1744);
      color: #fff;
      font-size: 8px;
      font-weight: 900;
      padding: 1px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      z-index: 10;
      font-family: 'Inter', system-ui, sans-serif;
      animation: assistPulse 2s ease-in-out infinite;
    }

    /* ═══ AUTO-TARGET: Face is best ═══ */
    .action-btn.assist-face-best {
      box-shadow: 0 0 18px rgba(255, 152, 0, 0.6), 0 0 6px rgba(255, 152, 0, 0.3) !important;
      border: 2px solid var(--orange, #ff9800) !important;
    }

    /* ═══ ONE-TAP TURN button ═══ */
    .auto-btn {
      background: linear-gradient(135deg, #1a1a3a, #2a2a5a) !important;
      border: 2px solid rgba(0, 229, 255, 0.4) !important;
      color: var(--cyan, #00e5ff) !important;
      order: -1;
    }
    .auto-btn:hover, .auto-btn:active {
      border-color: var(--cyan, #00e5ff) !important;
      box-shadow: 0 0 14px rgba(0, 229, 255, 0.3);
    }
    .auto-btn:disabled {
      opacity: 0.4;
      pointer-events: none;
    }
    .auto-btn .btn-icon svg {
      fill: var(--cyan, #00e5ff);
    }
    .auto-btn .btn-text {
      color: var(--cyan, #00e5ff);
    }
  `;
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════

function init() {
  injectStyles();
  startSmartGlow();
  enhanceAttackButton();
  createAutoPlayButton();
  console.log('[ASSIST v3] Battle assist loaded: Smart Glow + Auto-Target + One-Tap Turn');
}

waitForAPI(() => {
  // Wait for battle to finish init, then start
  setTimeout(init, 400);
});

})();
