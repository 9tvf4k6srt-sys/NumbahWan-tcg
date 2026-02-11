// ═══════════════════════════════════════════════════════════════════════
// NW-BATTLE-JUICE v1.0 — The Dopamine Engine
// "I don't even want to learn the game" → "I can't stop watching"
//
// Research: Balatro (escalating numbers + sound cascades),
//           Marvel Snap (speed + snap moments), Slay the Spire (combos),
//           Slot machines (near-miss, variable-ratio reinforcement)
//
// ARCHITECTURE: Pure observer pattern — watches NW_BATTLE state via
// MutationObserver + polling. NEVER touches nw-battle-v7.js internals.
//
// LAYERS:
//   1. MOMENT AMPLIFIER — dramatizes every event with Balatro-style cascades
//   2. AUTO-BATTLE SPECTACLE — makes auto-play exciting to watch
//   3. MOMENTUM ENGINE — combo multiplier that affects rewards
//   4. POST-BATTLE HOOK — battle → reward cascade → "one more?" loop
//   5. BATTLE SPEED — 1x/2x/3x speed control
// ═══════════════════════════════════════════════════════════════════════

(function() {
'use strict';

// ═══ WAIT FOR DEPENDENCIES ═══
function waitForBattle(cb, retries) {
  retries = retries || 80;
  if (window.NW_BATTLE) { cb(); return; }
  if (retries <= 0) { console.warn('[JUICE] NW_BATTLE not found'); return; }
  setTimeout(() => waitForBattle(cb, retries - 1), 150);
}

// ═══ CONFIG ═══
const CFG = {
  // Speed multiplier options
  speeds: [1, 2, 3],
  defaultSpeed: 1,

  // Momentum thresholds (Balatro-style escalating hype)
  momentumTiers: [
    { kills: 0,  label: '',              mult: 1.0, color: '#888' },
    { kills: 1,  label: 'NICE',          mult: 1.1, color: '#4caf50' },
    { kills: 2,  label: 'GREAT',         mult: 1.25, color: '#ffd700' },
    { kills: 3,  label: 'AMAZING',       mult: 1.5, color: '#ff9800' },
    { kills: 4,  label: 'UNSTOPPABLE',   mult: 1.75, color: '#ff5252' },
    { kills: 5,  label: 'NUMBAHWAN!!',   mult: 2.0, color: '#ff00ff' }
  ],

  // Near-miss HP thresholds
  nearMissHP: 5,   // "ENEMY AT 3 HP!" when ≤ this
  clutchHP: 3,     // Player low HP clutch narratives

  // Auto-battle commentary interval (ms at 1x)
  commentaryInterval: 2000,

  // Post-battle reward cascade timing (ms)
  rewardCascadeDelay: 200,

  // Battle streak persistence key
  streakKey: 'nw_battle_streak',
  bestStreakKey: 'nw_battle_best_streak'
};

// ═══ STATE ═══
const S = {
  speed: CFG.defaultSpeed,
  momentum: 0,         // Kill combo counter this battle
  peakMomentum: 0,     // Highest momentum hit
  killsThisTurn: 0,    // Kills in current turn
  turnNumber: 0,
  lastPlayerHP: 0,    // set from actual game state on game start
  lastEnemyHP: 0,
  gameActive: false,
  autoWatching: false,  // Are we in auto-battle spectator mode?
  battleStreak: 0,      // Consecutive wins
  nearMissShown: false,
  clutchShown: false,
  initialized: false,

  // Balatro-style score display
  totalDamageThisBattle: 0,
  biggestHit: 0
};

// ═══ SOUND HELPERS ═══
function playSound(name, vol) {
  try {
    if (typeof NW_SOUNDS !== 'undefined') NW_SOUNDS.play(name, { volume: vol || 1 });
    else if (typeof NW_JUICE !== 'undefined') NW_JUICE.sound.play(name, vol || 1);
  } catch(e) {}
}

function playRisingTone(step) {
  // Simulate Balatro's rising chip-count sound by pitch-shifting
  try {
    if (typeof NW_SOUNDS !== 'undefined') {
      NW_SOUNDS.play('click', { rate: 1 + (step * 0.15), volume: 0.6 });
    }
  } catch(e) {}
}

// ═══ HAPTIC ═══
function haptic(pattern) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch(e) {}
}

// ═══ DOM HELPERS ═══
const $ = id => document.getElementById(id);

function createEl(tag, cls, html) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
}

// ═══════════════════════════════════════════════════════════════════════
// LAYER 1: MOMENT AMPLIFIER
// Watches for state changes and adds Balatro-style event celebrations
// ═══════════════════════════════════════════════════════════════════════

const Moments = {
  // Big floating announcement with scaling animation
  announce(text, color, size, duration) {
    color = color || '#ffd700';
    size = size || '1.8rem';
    duration = duration || 2000;

    const el = createEl('div', 'bj-announce');
    el.textContent = text;
    el.style.cssText = `
      color: ${color}; font-size: ${size};
      text-shadow: 0 0 30px ${color}80, 0 2px 8px rgba(0,0,0,0.9);
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, duration);
  },

  // Balatro-style cascading number counter
  scorePopup(value, label, color, x, y) {
    const el = createEl('div', 'bj-score-pop');
    el.innerHTML = `
      <div class="bj-score-value" style="color:${color || '#ffd700'}">${value}</div>
      <div class="bj-score-label">${label || ''}</div>
    `;
    el.style.left = (x || (window.innerWidth / 2)) + 'px';
    el.style.top = (y || (window.innerHeight * 0.35)) + 'px';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => el.remove(), 1200);
  },

  // Near-miss drama: "ENEMY AT 2 HP!"
  nearMiss(hp, who) {
    if (who === 'enemy' && !S.nearMissShown && hp > 0 && hp <= CFG.nearMissHP) {
      S.nearMissShown = true;
      this.announce(`ENEMY AT ${hp} HP!`, '#ff5252', '2.2rem', 1800);
      playSound('critical');
      haptic([30, 40, 50]);
    }
    if (who === 'player' && !S.clutchShown && hp > 0 && hp <= CFG.clutchHP) {
      S.clutchShown = true;
      this.announce('CLUTCH MODE!', '#ff00ff', '2rem', 2000);
      playSound('critical');
      haptic([20, 30, 20, 30, 50]);
    }
  },

  // Kill celebration with momentum
  onKill(cardName) {
    S.momentum++;
    S.killsThisTurn++;
    S.peakMomentum = Math.max(S.peakMomentum, S.momentum);

    const tier = CFG.momentumTiers.reduce((best, t) =>
      S.momentum >= t.kills ? t : best, CFG.momentumTiers[0]);

    if (tier.label) {
      this.announce(tier.label, tier.color, '2.4rem', 1500);
      playRisingTone(S.momentum);
      haptic(S.momentum >= 4 ? [20, 30, 20, 30, 40] : [15, 25]);
    }

    // Multi-kill bonus
    if (S.killsThisTurn >= 2) {
      setTimeout(() => {
        this.announce(`${S.killsThisTurn}x MULTI-KILL!`, '#ff00ff', '1.6rem', 1200);
      }, 500);
    }
  },

  // Crit celebration
  onCrit(damage) {
    if (damage > S.biggestHit) {
      S.biggestHit = damage;
      if (damage >= 8) {
        setTimeout(() => {
          this.scorePopup(damage, 'NEW RECORD HIT', '#ffd700');
        }, 300);
      }
    }
  },

  // Turn start with energy
  onTurnStart(turn, energy) {
    S.killsThisTurn = 0;
    S.turnNumber = turn;

    // Rising energy hype at high turns
    if (turn >= 5 && turn <= 10) {
      const el = $('energyPill');
      if (el) {
        el.classList.add('bj-energy-surge');
        setTimeout(() => el.classList.remove('bj-energy-surge'), 800);
      }
    }
  },

  // Synergy activation fanfare
  onSynergy(name) {
    this.announce(`SYNERGY: ${name}`, '#00e5ff', '1.4rem', 1500);
    playSound('legendary');
    haptic([10, 20, 10]);
  }
};

// ═══════════════════════════════════════════════════════════════════════
// LAYER 2: AUTO-BATTLE SPECTACLE
// Makes auto-play exciting to WATCH — commentary + speed + anticipation
// ═══════════════════════════════════════════════════════════════════════

const AutoSpectacle = {
  commentaryLines: {
    turnStart: [
      'Turn {turn} — energy at {energy}!',
      'Here we go... Turn {turn}!',
      'Energy: {energy}. Let\'s cook.'
    ],
    cardPlayed: [
      '{card} enters the battlefield!',
      '{card} is in! Let\'s see what it does.',
      'Deploying {card}!'
    ],
    attack: [
      '{card} swings for {dmg}!',
      '{card} goes in! {dmg} damage!',
      'BANG! {dmg} from {card}!'
    ],
    critAttack: [
      'CRITICAL! {card} DEMOLISHES for {dmg}!',
      '{card} CRITS! {dmg} DAMAGE!',
      'THE DISRESPECT! {dmg} CRIT!'
    ],
    kill: [
      '{target} is DOWN! Momentum building...',
      'ELIMINATED! {target} off the board!',
      'Bye bye {target}!'
    ],
    faceDmg: [
      'FACE DAMAGE! Enemy takes {dmg}!',
      'GOING FACE! {dmg} to the dome!',
      'SMORC! {dmg} to enemy HP!'
    ],
    clutchBlock: [
      'SHIELD SAVES THE DAY!',
      'DODGE! That was close!',
      'BLOCKED! Still standing!'
    ],
    lowHP: [
      'Things are getting SPICY!',
      'Down to the wire...',
      'ONE WRONG MOVE...'
    ],
    winning: [
      'We\'re ahead! Keep pushing!',
      'The momentum is OURS!',
      'Enemy is crumbling!'
    ],
    losing: [
      'We need a play!',
      'Time for a comeback!',
      'Not over yet...'
    ]
  },

  // Show live commentary in a ticker
  showCommentary(category, vars) {
    const lines = this.commentaryLines[category];
    if (!lines) return;

    let text = lines[Math.floor(Math.random() * lines.length)];
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }

    const ticker = $('bjCommentary');
    if (!ticker) return;

    ticker.textContent = text;
    ticker.classList.remove('show');
    requestAnimationFrame(() => {
      ticker.classList.add('show');
    });

    clearTimeout(this._fadeTimer);
    this._fadeTimer = setTimeout(() => {
      ticker.classList.remove('show');
    }, 2500 / S.speed);
  },

  _fadeTimer: null
};

// ═══════════════════════════════════════════════════════════════════════
// LAYER 3: MOMENTUM ENGINE
// Kill combo → multiplier → bigger rewards (Balatro-style numbers go up)
// ═══════════════════════════════════════════════════════════════════════

const Momentum = {
  getMomentumTier() {
    return CFG.momentumTiers.reduce((best, t) =>
      S.momentum >= t.kills ? t : best, CFG.momentumTiers[0]);
  },

  getMultiplier() {
    return this.getMomentumTier().mult;
  },

  // Update the live momentum display
  updateDisplay() {
    const bar = $('bjMomentumBar');
    if (!bar) return;

    const tier = this.getMomentumTier();
    const nextIdx = CFG.momentumTiers.findIndex(t => t.kills > S.momentum);
    const next = nextIdx >= 0 ? CFG.momentumTiers[nextIdx] : null;

    const fillPct = next
      ? ((S.momentum - (tier.kills)) / (next.kills - tier.kills)) * 100
      : 100;

    bar.querySelector('.bj-mom-fill').style.width = Math.min(100, fillPct) + '%';
    bar.querySelector('.bj-mom-fill').style.background = tier.color;
    bar.querySelector('.bj-mom-label').textContent = tier.label || '';
    bar.querySelector('.bj-mom-label').style.color = tier.color;

    const multEl = bar.querySelector('.bj-mom-mult');
    if (tier.mult > 1) {
      multEl.textContent = `x${tier.mult}`;
      multEl.style.color = tier.color;
      multEl.classList.add('show');
    } else {
      multEl.classList.remove('show');
    }

    // Combo counter
    const counter = bar.querySelector('.bj-mom-count');
    counter.textContent = S.momentum > 0 ? S.momentum : '';
  },

  // Reset on player damage taken (momentum breaks on getting hit)
  breakCombo() {
    if (S.momentum > 0) {
      S.momentum = Math.max(0, S.momentum - 1); // Lose 1, not all
      this.updateDisplay();
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════
// LAYER 4: POST-BATTLE HOOK
// Victory → Reward cascade (Balatro chip count) → "One more?" CTA
// ═══════════════════════════════════════════════════════════════════════

const PostBattle = {
  showRewardCascade(won, stats) {
    const overlay = $('gameOver');
    if (!overlay) return;

    // Calculate streak
    const stored = parseInt(localStorage.getItem(CFG.streakKey) || '0');
    if (won) {
      S.battleStreak = stored + 1;
    } else {
      S.battleStreak = 0;
    }
    localStorage.setItem(CFG.streakKey, S.battleStreak.toString());

    // Best streak
    const bestStored = parseInt(localStorage.getItem(CFG.bestStreakKey) || '0');
    if (S.battleStreak > bestStored) {
      localStorage.setItem(CFG.bestStreakKey, S.battleStreak.toString());
    }

    const mult = Momentum.getMultiplier();
    const tier = Momentum.getMomentumTier();

    // Inject our enhanced stats panel
    const statsEl = $('gameOverStats');
    if (!statsEl) return;

    // Build cascading reward items — only show stats that have actual values
    // Use NW_I18N.t() for translated labels if available
    const t = (key, fallback) => (typeof NW_I18N !== 'undefined' && NW_I18N.t) ? NW_I18N.t(key, fallback) : fallback;
    const items = [];

    if (won) {
      if (stats.damageDealt > 0) items.push({ label: t('damageDealt', 'DAMAGE DEALT'), value: stats.damageDealt, color: '#ff5252' });
      if (S.biggestHit > 0) items.push({ label: t('biggestHit', 'BIGGEST HIT'), value: S.biggestHit, color: '#ffd700' });
      if (stats.faceDamage > 0) items.push({ label: t('faceDamage', 'FACE DAMAGE'), value: stats.faceDamage, color: '#ff9800' });
      if (stats.cardsPlayed > 0) items.push({ label: t('cardsPlayed', 'CARDS PLAYED'), value: stats.cardsPlayed, color: '#42a5f5' });
      if (stats.critsLanded > 0) items.push({ label: t('crits', 'CRITS'), value: stats.critsLanded, color: '#e040fb' });
      if (stats.abilitiesFired > 0) items.push({ label: t('abilities', 'ABILITIES'), value: stats.abilitiesFired, color: '#00e5ff' });
      if (stats.synergiesActivated > 0) items.push({ label: t('synergies', 'SYNERGIES'), value: stats.synergiesActivated, color: '#76ff03' });
      if (S.peakMomentum > 0) items.push({ label: t('peakCombo', 'PEAK COMBO'), value: S.peakMomentum, color: tier.color });
      items.push({ label: t('turns', 'TURNS'), value: stats.turn || S.turnNumber, color: '#ccc' });
      if (S.peakMomentum >= 3) {
        items.push({ label: t('momentumBonus', 'MOMENTUM BONUS'), value: `x${mult}`, color: '#ff00ff', isText: true });
      }
      if (S.battleStreak >= 2) {
        items.push({ label: t('winStreak', 'WIN STREAK'), value: S.battleStreak, color: '#ff9800' });
      }
    } else {
      if (stats.damageDealt > 0) items.push({ label: t('damageDealt', 'DAMAGE DEALT'), value: stats.damageDealt, color: '#ff5252' });
      items.push({ label: t('survived', 'SURVIVED'), value: `${stats.turn || S.turnNumber} ${t('turns', 'TURNS')}`, color: '#888', isText: true });
      if (S.biggestHit > 0) items.push({ label: t('biggestHit', 'BIGGEST HIT'), value: S.biggestHit, color: '#ffd700' });
      if (stats.cardsPlayed > 0) items.push({ label: t('cardsPlayed', 'CARDS PLAYED'), value: stats.cardsPlayed, color: '#42a5f5' });
      if (stats.critsLanded > 0) items.push({ label: t('crits', 'CRITS'), value: stats.critsLanded, color: '#e040fb' });
    }

    // Cascade animation — each item appears one by one with sound
    let cascadeHTML = '<div class="bj-cascade">';
    items.forEach((item, i) => {
      cascadeHTML += `
        <div class="bj-cascade-item" style="animation-delay: ${i * CFG.rewardCascadeDelay}ms">
          <span class="bj-cascade-label">${item.label}</span>
          <span class="bj-cascade-value" style="color:${item.color}">${item.value}</span>
        </div>`;
    });
    cascadeHTML += '</div>';

    // "One more?" CTA
    const oneMoreHTML = won ? `
      <div class="bj-one-more" style="animation-delay: ${items.length * CFG.rewardCascadeDelay + 400}ms">
        <div class="bj-one-more-text">
          ${S.battleStreak >= 3 ? `${S.battleStreak} ${t('streakKeepAlive', 'WIN STREAK! Keep it alive?')}` : t('momentumYours', 'The momentum is yours!')}
        </div>
      </div>` : `
      <div class="bj-one-more" style="animation-delay: ${items.length * CFG.rewardCascadeDelay + 400}ms">
        <div class="bj-one-more-text">
          ${S.biggestHit >= 6 ? t('yourBiggestHit', 'Your biggest hit was') + ' ' + S.biggestHit + ' — ' + t('biggestHitTease', 'imagine with better cards!') : t('tryAgain', 'Try again? The enemy got lucky.')}
        </div>
      </div>`;

    // REPLACE v7's basic stat lines with the enhanced cascade,
    // but PRESERVE any reward HTML (NW_WALLET gold/wood/streak).
    // Also preserve hidden stat labels so history.js parseStatsFromDOM still works
    // if it hasn't fired yet (it reads "Damage Dealt: 122" etc via regex).
    const rewardEl = statsEl.querySelector('.battle-rewards');
    const rewardHTML = rewardEl ? rewardEl.outerHTML : '';

    // Hidden stats for history.js backward compat (same labels as v7 endGame)
    const hiddenStats = `<div style="position:absolute;width:1px;height:1px;overflow:hidden;opacity:0" aria-hidden="true">
      Damage Dealt: ${stats.damageDealt} Face Damage: ${stats.faceDamage} Cards Played: ${stats.cardsPlayed} Crits: ${stats.critsLanded} Abilities: ${stats.abilitiesFired || 0} Synergies: ${stats.synergiesActivated} Max Combo: ${stats.maxCombo} Turns: ${stats.turn}
    </div>`;

    statsEl.innerHTML = hiddenStats + rewardHTML + cascadeHTML + oneMoreHTML;

    // Play cascade sounds
    items.forEach((item, i) => {
      setTimeout(() => {
        playRisingTone(i);
        haptic([8]);
      }, i * CFG.rewardCascadeDelay);
    });

    // Victory confetti
    if (won) {
      setTimeout(() => {
        if (typeof NW_JUICE !== 'undefined') {
          NW_JUICE.particles.confetti(window.innerWidth / 2, window.innerHeight * 0.3, 40);
        }
        playSound('victory');
        haptic([10, 50, 10, 50, 20]);
      }, items.length * CFG.rewardCascadeDelay);
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════
// LAYER 5: BATTLE SPEED CONTROL
// 1x / 2x / 3x toggle — speeds up sleeps in auto-battle
// ═══════════════════════════════════════════════════════════════════════

const SpeedControl = {
  inject() {
    const actionBar = $('actionBar');
    if (!actionBar) return;

    const btn = createEl('button', 'action-btn speed-btn', `
      <span class="btn-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20.38 8.57l-1.23 1.85a8 8 0 01-.22 7.58H5.07A8 8 0 0115.58 6.85l1.85-1.23A10 10 0 003 12.5C3 18.02 7.48 22.5 13 22.5c3.58 0 6.72-1.89 8.48-4.72a10.08 10.08 0 00-1.1-9.21z"/><path d="M10.59 15.41a2 2 0 010-2.83l5.66-5.66 1.41 1.41-5.66 5.66a2 2 0 01-2.83 0l-.58.42z"/></svg></span>
      <span class="btn-text" id="speedLabel">${S.speed}x</span>
    `);
    btn.id = 'speedBtn';
    btn.setAttribute('aria-label', 'Change battle speed');

    // Insert as first button
    actionBar.insertBefore(btn, actionBar.firstChild);

    btn.addEventListener('click', () => {
      const idx = CFG.speeds.indexOf(S.speed);
      S.speed = CFG.speeds[(idx + 1) % CFG.speeds.length];
      $('speedLabel').textContent = S.speed + 'x';
      btn.classList.toggle('speed-fast', S.speed >= 2);
      btn.classList.toggle('speed-turbo', S.speed >= 3);

      // Flash feedback
      Moments.announce(S.speed + 'x SPEED', S.speed >= 3 ? '#ff5252' : '#00e5ff', '1.6rem', 800);
      playSound('click');
      haptic([10]);
    });
  },

  // Monkey-patch the global sleep to respect speed
  patchSleep() {
    // NW_BATTLE internal sleep is in the IIFE — we can't patch it directly.
    // Instead, we patch CSS animation durations via a class on #arena.
    const arena = $('arena');
    if (!arena) return;

    // Watch for speed changes
    const update = () => {
      arena.classList.remove('bj-speed-1x', 'bj-speed-2x', 'bj-speed-3x');
      arena.classList.add(`bj-speed-${S.speed}x`);
    };

    update();
    // Re-check periodically
    setInterval(update, 500);
  }
};

// ═══════════════════════════════════════════════════════════════════════
// STATE OBSERVER — Watches game state changes
// ═══════════════════════════════════════════════════════════════════════

const Observer = {
  prevState: null,
  pollInterval: null,

  start() {
    // Poll game state for changes
    this.pollInterval = setInterval(() => this.check(), 200);

    // Watch for game over overlay
    const gameOver = $('gameOver');
    if (gameOver) {
      const obs = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.attributeName === 'class') {
            if (!gameOver.classList.contains('hidden')) {
              this.onGameOver();
            }
          }
        }
      });
      obs.observe(gameOver, { attributes: true, attributeFilter: ['class'] });
    }

    // Watch combat log for events
    const log = $('combatLog');
    if (log) {
      new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) this.onLogEntry(node);
          }
        }
      }).observe(log, { childList: true });
    }
  },

  check() {
    const api = window.NW_BATTLE;
    if (!api) return;

    const state = api.getState();
    const prev = this.prevState;

    if (!prev) {
      this.prevState = { ...state };
      return;
    }

    // Detect game start — init lastHP from actual state (not hardcoded)
    const startScreen = $('startScreen');
    if (!S.gameActive && state.turn >= 1 && state.playerHand.length > 0 && startScreen && startScreen.classList.contains('hidden')) {
      S.gameActive = true;
      S.momentum = 0;
      S.peakMomentum = 0;
      S.biggestHit = 0;
      S.totalDamageThisBattle = 0;
      S.nearMissShown = false;
      S.clutchShown = false;
      S.lastPlayerHP = state.playerHP;
      S.lastEnemyHP = state.enemyHP;
    }

    // Detect turn change
    if (state.turn !== prev.turn && state.isPlayerTurn) {
      Moments.onTurnStart(state.turn, state.energy);
      if (S.autoWatching) {
        AutoSpectacle.showCommentary('turnStart', { turn: state.turn, energy: state.energy });
      }
    }

    // Detect HP changes (enemy took damage) — track biggest single hit
    if (state.enemyHP < prev.enemyHP) {
      const dmg = prev.enemyHP - state.enemyHP;
      S.totalDamageThisBattle += dmg;
      if (dmg > S.biggestHit) S.biggestHit = dmg;
      Moments.nearMiss(state.enemyHP, 'enemy');

      // Auto-play narration for face/card damage
      if (S.autoWatching && Math.random() < 0.6) {
        if (dmg >= 6) {
          AutoSpectacle.showCommentary('critAttack', { card: 'Our card', dmg: dmg });
        } else {
          AutoSpectacle.showCommentary('faceDmg', { dmg: dmg });
        }
      }
    }

    // Detect player took damage (momentum break)
    if (state.playerHP < prev.playerHP) {
      Momentum.breakCombo();
      Moments.nearMiss(state.playerHP, 'player');

      if (S.autoWatching && state.playerHP <= 10) {
        AutoSpectacle.showCommentary('lowHP');
      }
    }

    // Detect board changes (card killed)
    const prevEnemyCount = prev.enemyBoard.filter(c => c).length;
    const currEnemyCount = state.enemyBoard.filter(c => c).length;
    if (currEnemyCount < prevEnemyCount && S.gameActive) {
      // Find which card died
      const killed = prev.enemyBoard.find((c, i) => c && !state.enemyBoard[i]);
      Moments.onKill(killed?.name || 'enemy card');
      Momentum.updateDisplay();

      if (S.autoWatching) {
        AutoSpectacle.showCommentary('kill', { target: killed?.name || 'a card' });
      }
    }

    // Detect auto-play state (check global flag set by assist.js)
    const wasAuto = S.autoWatching;
    S.autoWatching = !!window._nwAutoPlaying;

    // Situation commentary (periodic) — higher chance during auto-play
    if (S.autoWatching && state.isPlayerTurn && state.playerHP > 0 && state.enemyHP > 0) {
      if (state.playerHP > state.enemyHP + 5) {
        if (Math.random() < 0.2) AutoSpectacle.showCommentary('winning');
      } else if (state.enemyHP > state.playerHP + 5) {
        if (Math.random() < 0.2) AutoSpectacle.showCommentary('losing');
      }
    }

    this.prevState = { ...state, playerBoard: [...state.playerBoard], enemyBoard: [...state.enemyBoard] };
  },

  onLogEntry(node) {
    const text = node.textContent || '';

    // Detect crits
    if (text.includes('CRIT') && node.classList.contains('crit')) {
      const match = text.match(/(\d+)/);
      if (match) Moments.onCrit(parseInt(match[1]));
    }

    // Detect face damage for commentary
    if (S.autoWatching) {
      if (text.includes('to ENEMY!') || text.includes('to YOU!')) {
        const match = text.match(/(\d+)/);
        const dmg = match ? match[1] : '?';
        const isPlayerAttack = text.includes('to ENEMY!');

        if (isPlayerAttack && text.includes('CRIT')) {
          AutoSpectacle.showCommentary('critAttack', { card: 'Our card', dmg });
        } else if (isPlayerAttack) {
          if (Math.random() < 0.4) AutoSpectacle.showCommentary('attack', { card: 'Card', dmg });
        }
      }

      if (text.includes('DODGE') || text.includes('BLOCKED') || text.includes('Shield')) {
        AutoSpectacle.showCommentary('clutchBlock');
      }
    }

    // Detect synergy
    if (text.includes('SYNERGY') || node.classList.contains('ability')) {
      if (text.includes(':')) {
        const name = text.split(':')[0].replace('Enemy: ', '').trim();
        if (name && !text.includes('Enemy') && name.length < 30) {
          Moments.onSynergy(name);
        }
      }
    }
  },

  onGameOver() {
    const api = window.NW_BATTLE;
    if (!api) return;
    const state = api.getState();
    const won = state.enemyHP <= 0;

    S.gameActive = false;
    S.autoWatching = false;
    window._nwAutoPlaying = false;

    // Use API stats if available (more reliable than DOM parsing),
    // fall back to DOM for backward compat.
    // Wait for v7 endGame() to render first, then REPLACE with enhanced cascade.
    setTimeout(() => {
      const apiStats = state.stats || {};
      const statsEl = $('gameOverStats');

      // DOM fallback parser (same labels as v7.js endGame output)
      const text = statsEl ? statsEl.textContent : '';
      const num = (label) => {
        const m = text.match(new RegExp(label + ':\\s*(\\d+)'));
        return m ? parseInt(m[1], 10) : 0;
      };

      const stats = {
        damageDealt: apiStats.damageDealt || num('Damage Dealt') || S.totalDamageThisBattle,
        cardsPlayed: apiStats.cardsPlayed || num('Cards Played'),
        critsLanded: apiStats.critsLanded || num('Crits'),
        abilitiesFired: apiStats.abilitiesFired || num('Abilities'),
        synergiesActivated: apiStats.synergiesActivated || num('Synergies'),
        maxCombo: apiStats.maxCombo || num('Max Combo'),
        faceDamage: apiStats.faceDamage || num('Face Damage'),
        turn: state.turn || num('Turns') || S.turnNumber
      };

      PostBattle.showRewardCascade(won, stats);
    }, 300);
  }
};

// ═══════════════════════════════════════════════════════════════════════
// UI INJECTION — All CSS + DOM elements
// ═══════════════════════════════════════════════════════════════════════

function injectUI() {
  // Commentary ticker
  const ticker = createEl('div', 'bj-commentary', '');
  ticker.id = 'bjCommentary';
  document.body.appendChild(ticker);

  // Momentum bar
  const momBar = createEl('div', 'bj-momentum-bar', `
    <div class="bj-mom-track">
      <div class="bj-mom-fill"></div>
    </div>
    <span class="bj-mom-count"></span>
    <span class="bj-mom-label"></span>
    <span class="bj-mom-mult"></span>
  `);
  momBar.id = 'bjMomentumBar';

  // Insert momentum bar above hand area
  const handArea = $('handArea');
  if (handArea && handArea.parentNode) {
    handArea.parentNode.insertBefore(momBar, handArea);
  }
}

function injectStyles() {
  const style = document.createElement('style');
  style.id = 'bj-styles';
  style.textContent = `
    /* ═══ SPEED CLASSES ═══ */
    #arena.bj-speed-2x .board-card.slamming { animation-duration: 0.2s !important; }
    #arena.bj-speed-2x .board-card.attacking { animation-duration: 0.22s !important; }
    #arena.bj-speed-2x .board-card.hit { animation-duration: 0.15s !important; }
    #arena.bj-speed-2x .board-card.dying { animation-duration: 0.3s !important; }
    #arena.bj-speed-2x .log-entry { animation-duration: 1.8s !important; }

    #arena.bj-speed-3x .board-card.slamming { animation-duration: 0.12s !important; }
    #arena.bj-speed-3x .board-card.attacking { animation-duration: 0.14s !important; }
    #arena.bj-speed-3x .board-card.hit { animation-duration: 0.1s !important; }
    #arena.bj-speed-3x .board-card.dying { animation-duration: 0.18s !important; }
    #arena.bj-speed-3x .log-entry { animation-duration: 1s !important; }
    #arena.bj-speed-3x .announcer { transition-duration: 0.15s !important; }

    /* ═══ SPEED BUTTON ═══ */
    .speed-btn {
      background: linear-gradient(135deg, #1a1a3a, #2a2a5a) !important;
      border: 2px solid rgba(0, 229, 255, 0.3) !important;
      color: #00e5ff !important;
      flex: 0 0 auto !important;
      width: 70px !important;
      min-width: 70px !important;
    }
    .speed-btn .btn-text { color: #00e5ff !important; font-size: 13px !important; }
    .speed-btn.speed-fast {
      border-color: rgba(255, 215, 0, 0.4) !important;
    }
    .speed-btn.speed-fast .btn-text { color: #ffd700 !important; }
    .speed-btn.speed-turbo {
      border-color: rgba(255, 82, 82, 0.5) !important;
      animation: bjTurboPulse 1s ease infinite;
    }
    .speed-btn.speed-turbo .btn-text { color: #ff5252 !important; }
    @keyframes bjTurboPulse {
      0%, 100% { box-shadow: 0 0 8px rgba(255, 82, 82, 0.2); }
      50% { box-shadow: 0 0 16px rgba(255, 82, 82, 0.4); }
    }

    /* ═══ ANNOUNCE ═══ */
    .bj-announce {
      position: fixed;
      top: 40%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.3);
      z-index: 10001;
      font-family: 'NumbahWan', 'Orbitron', monospace;
      font-weight: 900;
      pointer-events: none;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      white-space: nowrap;
      letter-spacing: -0.5px;
    }
    .bj-announce.show {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }

    /* ═══ SCORE POPUP (Balatro-style) ═══ */
    .bj-score-pop {
      position: fixed;
      z-index: 10000;
      text-align: center;
      pointer-events: none;
      animation: bjScorePop 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .bj-score-value {
      font-family: 'NumbahWan', 'Orbitron', monospace;
      font-size: 2.5rem;
      font-weight: 900;
      text-shadow: 0 0 20px currentColor;
    }
    .bj-score-label {
      font-family: 'Inter', sans-serif;
      font-size: 0.7rem;
      font-weight: 700;
      color: #aaa;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    @keyframes bjScorePop {
      0% { transform: translate(-50%, 0) scale(0.5); opacity: 0; }
      30% { transform: translate(-50%, -20px) scale(1.2); opacity: 1; }
      100% { transform: translate(-50%, -60px) scale(1); opacity: 0; }
    }

    /* ═══ COMMENTARY TICKER ═══ */
    .bj-commentary {
      position: fixed;
      top: 50px;
      left: 50%;
      transform: translateX(-50%) translateY(-10px);
      z-index: 9998;
      font-family: 'Inter', sans-serif;
      font-size: 0.82rem;
      font-weight: 700;
      color: #ccc;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      padding: 6px 16px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      pointer-events: none;
      opacity: 0;
      transition: all 0.3s ease;
      white-space: nowrap;
      max-width: 90vw;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .bj-commentary.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* ═══ MOMENTUM BAR ═══ */
    .bj-momentum-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 2px 12px;
      flex-shrink: 0;
      min-height: 16px;
    }
    .bj-mom-track {
      flex: 1;
      height: 4px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 2px;
      overflow: hidden;
    }
    .bj-mom-fill {
      height: 100%;
      width: 0%;
      border-radius: 2px;
      transition: width 0.4s ease, background 0.3s ease;
      background: #4caf50;
    }
    .bj-mom-count {
      font-family: 'NumbahWan', 'Orbitron', monospace;
      font-size: 11px;
      font-weight: 900;
      color: #ffd700;
      min-width: 14px;
      text-align: center;
    }
    .bj-mom-label {
      font-family: 'NumbahWan', 'Orbitron', monospace;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.5px;
      transition: color 0.3s;
    }
    .bj-mom-mult {
      font-family: 'NumbahWan', 'Orbitron', monospace;
      font-size: 12px;
      font-weight: 900;
      opacity: 0;
      transform: scale(0.5);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .bj-mom-mult.show {
      opacity: 1;
      transform: scale(1);
    }

    /* ═══ ENERGY SURGE ═══ */
    .bj-energy-surge {
      animation: bjEnergySurge 0.6s ease !important;
    }
    @keyframes bjEnergySurge {
      0% { transform: scale(1); }
      40% { transform: scale(1.2); box-shadow: 0 0 12px rgba(0, 229, 255, 0.5); }
      100% { transform: scale(1); }
    }

    /* ═══ POST-BATTLE CASCADE ═══ */
    .bj-cascade {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .bj-cascade-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      opacity: 0;
      transform: translateX(-20px);
      animation: bjCascadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    @keyframes bjCascadeIn {
      to { opacity: 1; transform: translateX(0); }
    }
    .bj-cascade-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .bj-cascade-value {
      font-family: 'NumbahWan', 'Orbitron', monospace;
      font-size: 1.1rem;
      font-weight: 900;
    }

    /* ═══ "ONE MORE?" CTA ═══ */
    .bj-one-more {
      margin-top: 12px;
      opacity: 0;
      animation: bjCascadeIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .bj-one-more-text {
      font-size: 0.85rem;
      font-weight: 700;
      color: #ffd700;
      text-align: center;
      padding: 8px;
      background: rgba(255, 215, 0, 0.08);
      border: 1px solid rgba(255, 215, 0, 0.15);
      border-radius: 10px;
    }

    /* ═══ MOBILE ═══ */
    @media (max-width: 480px) {
      .bj-announce { font-size: 1.4rem !important; }
      .bj-commentary { font-size: 0.75rem; }
      .bj-score-value { font-size: 2rem; }
    }

    /* ═══ REDUCED MOTION ═══ */
    @media (prefers-reduced-motion: reduce) {
      .bj-announce,
      .bj-score-pop,
      .bj-cascade-item,
      .bj-one-more { animation: none !important; opacity: 1 !important; transform: none !important; }
    }
  `;
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════

function init() {
  if (S.initialized) return;
  S.initialized = true;

  injectStyles();
  injectUI();
  SpeedControl.inject();
  SpeedControl.patchSleep();
  Observer.start();

  // Load streak
  S.battleStreak = parseInt(localStorage.getItem(CFG.streakKey) || '0');

  console.log('[BATTLE-JUICE v1.0] Dopamine Engine loaded. Layers: Moments + AutoSpectacle + Momentum + PostBattle + Speed');
}

waitForBattle(() => {
  // Wait a frame for battle to fully render
  setTimeout(init, 300);
});

// Export for other modules
window.NW_BATTLE_JUICE = {
  getSpeed: () => S.speed,
  getMomentum: () => S.momentum,
  getStreak: () => S.battleStreak,
  getMomentumMultiplier: () => Momentum.getMultiplier()
};

})();
