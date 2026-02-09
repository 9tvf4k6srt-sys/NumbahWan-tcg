// ═══════════════════════════════════════════════════════════════════════
// NW-BATTLE-COACH: First-Battle Guided Tutorial
// Hearthstone-style "learn by doing" — contextual hints at the right moment
// Research: Just-in-time tooltips, one concept at a time, highlight + darken
// Never shows after first battle. Skippable. No reading required.
// ═══════════════════════════════════════════════════════════════════════

(function() {
'use strict';

const STORAGE_KEY = 'nw_battle_coach_done';
const COACH_VERSION = 1;

// Already completed tutorial?
function isDone() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && parseInt(v) >= COACH_VERSION;
  } catch { return false; }
}
function markDone() {
  try { localStorage.setItem(STORAGE_KEY, String(COACH_VERSION)); } catch {}
}

if (isDone()) return; // Silent exit — veteran player

// ═══ STATE ═══
let currentStep = 0;
let coachActive = false;
let overlay = null;
let bubble = null;
let skipBtn = null;
let waitingFor = null; // what interaction we're waiting for

// ═══ TUTORIAL STEPS ═══
// Each step: when to show, what to highlight, what to say, what to wait for
const STEPS = [
  // Step 0: On start screen — explain what Casual means
  {
    id: 'pick-difficulty',
    trigger: 'startScreen',
    target: '[data-diff="casual"]',
    text: 'Tap CASUAL for your first battle. Easy AI, no stress.',
    arrow: 'down',
    waitFor: 'startClick', // wait for START BATTLE click
    delay: 300
  },
  // Step 1: After countdown, cards appear — explain the hand
  {
    id: 'your-hand',
    trigger: 'afterStart',
    target: '#handArea',
    text: 'These are your CARDS. Each has ATK (damage) and HP (health).',
    arrow: 'up',
    waitFor: 'acknowledge',
    delay: 1000
  },
  // Step 2: Explain cost/energy
  {
    id: 'energy',
    trigger: 'afterAck',
    target: '#energyPill',
    text: 'This is your ENERGY. Cards cost energy to play. You get more each turn.',
    arrow: 'down',
    waitFor: 'acknowledge',
    delay: 200
  },
  // Step 3: Play a card — highlight the cheapest playable card
  {
    id: 'play-card',
    trigger: 'afterAck',
    target: '.hand-card:not(.unplayable)',
    text: 'TAP a glowing card to select it.',
    arrow: 'up',
    waitFor: 'cardSelected',
    delay: 200
  },
  // Step 4: Place it on the board
  {
    id: 'place-card',
    trigger: 'cardSelected',
    target: '#playerBoard .board-slot.highlight',
    text: 'Now TAP an empty slot to place your card on the battlefield.',
    arrow: 'down',
    waitFor: 'cardPlaced',
    delay: 200
  },
  // Step 5: End turn (first turn usually can't attack)
  {
    id: 'end-turn',
    trigger: 'cardPlaced',
    target: '#endTurnBtn',
    text: 'Cards can\'t attack the turn they\'re played (unless they have RUSH). Tap END TURN.',
    arrow: 'up',
    waitFor: 'turnEnded',
    delay: 800
  },
  // Step 6: Enemy plays — just watch
  {
    id: 'enemy-plays',
    trigger: 'enemyTurnDone',
    target: '#enemyBoard',
    text: 'The enemy played cards too. Now it\'s your turn again!',
    arrow: 'down',
    waitFor: 'acknowledge',
    delay: 500
  },
  // Step 7: Select attacker
  {
    id: 'select-attacker',
    trigger: 'afterAck',
    target: '#playerBoard .board-card.can-attack',
    text: 'Your card can now ATTACK! Tap it to select it as attacker.',
    arrow: 'down',
    waitFor: 'attackerSelected',
    delay: 200
  },
  // Step 8: Choose target
  {
    id: 'choose-target',
    trigger: 'attackerSelected',
    target: '#enemyBoard .board-card, #attackBtn',
    text: 'Tap an ENEMY card to attack it, or tap GO FACE to hit the enemy directly!',
    arrow: 'down',
    waitFor: 'attackDone',
    delay: 200
  },
  // Step 9: You got it!
  {
    id: 'you-got-it',
    trigger: 'afterAttack',
    target: null,
    text: 'You\'ve got the basics! Play cards, attack, reduce enemy HP to 0. GO WIN!',
    arrow: null,
    waitFor: 'acknowledge',
    delay: 300
  }
];

// ═══ DOM SETUP ═══
function createCoachUI() {
  // Dark overlay with cutout
  overlay = document.createElement('div');
  overlay.id = 'coachOverlay';
  overlay.innerHTML = `
    <style>
      #coachOverlay {
        position: fixed; inset: 0; z-index: 9998;
        pointer-events: none;
        transition: opacity 0.3s;
      }
      #coachOverlay.active { pointer-events: auto; }
      #coachOverlay .coach-dim {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.65);
        transition: opacity 0.3s;
      }
      #coachBubble {
        position: fixed; z-index: 9999;
        background: linear-gradient(135deg, #1a1a3a, #222255);
        border: 2px solid var(--gold, #ffd700);
        border-radius: 16px;
        padding: 16px 20px;
        max-width: 300px;
        color: #f5f5f5;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 15px;
        line-height: 1.5;
        font-weight: 600;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(255,215,0,0.15);
        transform: translateY(0);
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        opacity: 0;
        pointer-events: auto;
      }
      #coachBubble.show { opacity: 1; }
      #coachBubble .coach-text { margin-bottom: 10px; }
      #coachBubble .coach-tap {
        font-size: 11px;
        color: var(--gold, #ffd700);
        opacity: 0.8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      #coachBubble .coach-arrow {
        position: absolute;
        width: 0; height: 0;
        border: 10px solid transparent;
      }
      #coachBubble .coach-arrow.arrow-down {
        bottom: -20px; left: 50%; transform: translateX(-50%);
        border-top-color: var(--gold, #ffd700);
      }
      #coachBubble .coach-arrow.arrow-up {
        top: -20px; left: 50%; transform: translateX(-50%);
        border-bottom-color: var(--gold, #ffd700);
      }
      #coachSkip {
        position: fixed; top: 12px; right: 12px; z-index: 10000;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: #b0b0c0;
        font-size: 12px; font-weight: 600;
        padding: 6px 14px;
        border-radius: 20px;
        cursor: pointer;
        pointer-events: auto;
        transition: all 0.2s;
        font-family: 'Inter', system-ui, sans-serif;
      }
      #coachSkip:hover, #coachSkip:active {
        background: rgba(255,82,82,0.2);
        border-color: rgba(255,82,82,0.4);
        color: #ff5252;
      }
      /* Highlight ring for target elements */
      .coach-highlight {
        position: relative;
        z-index: 9999 !important;
        pointer-events: auto !important;
      }
      .coach-highlight::after {
        content: '';
        position: absolute;
        inset: -4px;
        border: 2px solid var(--gold, #ffd700);
        border-radius: 12px;
        animation: coachPulse 1.5s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes coachPulse {
        0%, 100% { box-shadow: 0 0 8px rgba(255,215,0,0.3); }
        50% { box-shadow: 0 0 20px rgba(255,215,0,0.6); }
      }
      /* Step counter */
      #coachBubble .coach-step {
        font-size: 10px;
        color: #707088;
        margin-top: 6px;
      }
    </style>
    <div class="coach-dim"></div>
  `;
  document.body.appendChild(overlay);

  bubble = document.createElement('div');
  bubble.id = 'coachBubble';
  document.body.appendChild(bubble);

  skipBtn = document.createElement('button');
  skipBtn.id = 'coachSkip';
  skipBtn.textContent = 'SKIP TUTORIAL';
  skipBtn.addEventListener('click', () => endCoach(true));
  document.body.appendChild(skipBtn);
}

// ═══ POSITIONING ═══
function positionBubble(targetEl, arrowDir) {
  if (!bubble) return;
  
  if (!targetEl) {
    // Center screen
    bubble.style.left = '50%';
    bubble.style.top = '50%';
    bubble.style.transform = 'translate(-50%, -50%)';
    bubble.innerHTML = bubble.innerHTML; // reflow
    return;
  }

  const rect = targetEl.getBoundingClientRect();
  const bw = 300; // max-width
  const bh = bubble.offsetHeight || 100;
  const pad = 16;

  let left, top;

  if (arrowDir === 'up') {
    // Bubble below target
    top = rect.bottom + 14;
    left = rect.left + rect.width / 2 - bw / 2;
  } else if (arrowDir === 'down') {
    // Bubble above target
    top = rect.top - bh - 14;
    left = rect.left + rect.width / 2 - bw / 2;
  } else {
    // Default: below
    top = rect.bottom + 14;
    left = rect.left + rect.width / 2 - bw / 2;
  }

  // Clamp to viewport
  left = Math.max(pad, Math.min(left, window.innerWidth - bw - pad));
  top = Math.max(pad, Math.min(top, window.innerHeight - bh - pad));

  bubble.style.left = left + 'px';
  bubble.style.top = top + 'px';
  bubble.style.transform = 'none';
}

// ═══ SHOW STEP ═══
function showStep(stepIdx) {
  if (stepIdx >= STEPS.length) { endCoach(false); return; }
  const step = STEPS[stepIdx];
  currentStep = stepIdx;
  
  // Clear previous highlights
  document.querySelectorAll('.coach-highlight').forEach(el => el.classList.remove('coach-highlight'));

  // Find target
  let targetEl = null;
  if (step.target) {
    targetEl = document.querySelector(step.target);
    // If target not found yet, retry after a short delay
    if (!targetEl && step.target) {
      setTimeout(() => {
        targetEl = document.querySelector(step.target);
        if (targetEl) {
          targetEl.classList.add('coach-highlight');
          positionBubble(targetEl, step.arrow);
        }
      }, 500);
    } else if (targetEl) {
      targetEl.classList.add('coach-highlight');
    }
  }

  // Build bubble content
  const arrowHTML = step.arrow ? `<div class="coach-arrow arrow-${step.arrow}"></div>` : '';
  const tapHint = step.waitFor === 'acknowledge' ? 'TAP HERE TO CONTINUE' : '';
  const totalSteps = STEPS.length;
  
  bubble.innerHTML = `
    <div class="coach-text">${step.text}</div>
    ${tapHint ? `<div class="coach-tap">${tapHint}</div>` : ''}
    <div class="coach-step">${stepIdx + 1} / ${totalSteps}</div>
    ${arrowHTML}
  `;

  // Position
  positionBubble(targetEl, step.arrow);

  // Show
  overlay.classList.add('active');
  requestAnimationFrame(() => { bubble.classList.add('show'); });

  // Set up interaction handler
  waitingFor = step.waitFor;
  
  if (step.waitFor === 'acknowledge') {
    // Tap bubble to proceed
    bubble.addEventListener('click', onAcknowledge, { once: true });
    // Also allow tap on dim background
    overlay.querySelector('.coach-dim')?.addEventListener('click', onAcknowledge, { once: true });
  }
  // Other waitFor types are handled by game event hooks
}

function onAcknowledge() {
  if (waitingFor !== 'acknowledge') return;
  waitingFor = null;
  nextStep();
}

function nextStep() {
  bubble.classList.remove('show');
  document.querySelectorAll('.coach-highlight').forEach(el => el.classList.remove('coach-highlight'));
  
  const nextIdx = currentStep + 1;
  const nextS = STEPS[nextIdx];
  if (!nextS) { endCoach(false); return; }
  
  const delay = nextS.delay || 300;
  setTimeout(() => showStep(nextIdx), delay);
}

function endCoach(skipped) {
  coachActive = false;
  markDone();
  if (overlay) overlay.remove();
  if (bubble) bubble.remove();
  if (skipBtn) skipBtn.remove();
  document.querySelectorAll('.coach-highlight').forEach(el => el.classList.remove('coach-highlight'));
  if (skipped) {
    console.log('[COACH] Tutorial skipped');
  } else {
    console.log('[COACH] Tutorial complete!');
  }
}

// ═══ GAME EVENT HOOKS ═══
// We observe DOM changes and game state to know when steps complete

function hookGameEvents() {
  // Watch for START BATTLE click
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    const origClick = startBtn.onclick;
    startBtn.addEventListener('click', () => {
      if (waitingFor === 'startClick') {
        waitingFor = null;
        bubble.classList.remove('show');
        overlay.classList.remove('active');
        // Wait for countdown + cards to appear
        setTimeout(() => {
          if (currentStep === 0) nextStep();
        }, 3500); // 3 second countdown + buffer
      }
    });
  }

  // Watch for card selection in hand
  const handArea = document.getElementById('playerHand');
  if (handArea) {
    const observer = new MutationObserver(() => {
      if (waitingFor === 'cardSelected') {
        const selected = handArea.querySelector('.hand-card.selected');
        if (selected) {
          waitingFor = null;
          nextStep();
        }
      }
      if (waitingFor === 'cardPlaced') {
        // Card was placed when board has a card and hand lost one
        const boardCards = document.querySelectorAll('#playerBoard .board-card');
        if (boardCards.length > 0) {
          waitingFor = null;
          nextStep();
        }
      }
    });
    observer.observe(handArea, { childList: true, subtree: true, attributes: true });
  }

  // Watch for board changes
  const playerBoard = document.getElementById('playerBoard');
  if (playerBoard) {
    const observer = new MutationObserver(() => {
      if (waitingFor === 'cardPlaced') {
        const boardCards = playerBoard.querySelectorAll('.board-card');
        if (boardCards.length > 0) {
          waitingFor = null;
          nextStep();
        }
      }
      if (waitingFor === 'attackerSelected') {
        const selected = playerBoard.querySelector('.selected-attacker');
        if (selected) {
          waitingFor = null;
          nextStep();
        }
      }
    });
    observer.observe(playerBoard, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  // Watch for turn end
  const endTurnBtn = document.getElementById('endTurnBtn');
  if (endTurnBtn) {
    endTurnBtn.addEventListener('click', () => {
      if (waitingFor === 'turnEnded') {
        waitingFor = null;
        bubble.classList.remove('show');
        overlay.classList.remove('active');
        // Wait for enemy turn to complete
        setTimeout(() => {
          nextStep(); // enemy-plays step
        }, 3000);
      }
    });
  }

  // Watch for attack completion (enemy HP change or board change)
  const enemyBoard = document.getElementById('enemyBoard');
  if (enemyBoard) {
    const observer = new MutationObserver(() => {
      if (waitingFor === 'attackDone') {
        // Attack happened — proceed
        waitingFor = null;
        setTimeout(() => nextStep(), 800);
      }
    });
    observer.observe(enemyBoard, { childList: true, subtree: true });
  }
  
  // Also watch HP text for face damage
  const enemyHpText = document.getElementById('enemyHpText');
  if (enemyHpText) {
    const hpObserver = new MutationObserver(() => {
      if (waitingFor === 'attackDone') {
        waitingFor = null;
        setTimeout(() => nextStep(), 800);
      }
    });
    hpObserver.observe(enemyHpText, { childList: true, characterData: true, subtree: true });
  }

  // Watch for attack button (GO FACE)
  const attackBtn = document.getElementById('attackBtn');
  if (attackBtn) {
    attackBtn.addEventListener('click', () => {
      if (waitingFor === 'attackDone') {
        waitingFor = null;
        setTimeout(() => nextStep(), 800);
      }
    });
  }
}

// ═══ INIT ═══
function initCoach() {
  // Only run on first battle
  if (isDone()) return;
  
  createCoachUI();
  coachActive = true;
  hookGameEvents();
  
  // Start with step 0 after a short delay
  setTimeout(() => showStep(0), 600);
  
  console.log('[COACH] First-battle tutorial active. Tap SKIP TUTORIAL to dismiss.');
}

// Wait for DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCoach);
} else {
  // Small delay to let battle.js init first
  setTimeout(initCoach, 200);
}

})();
