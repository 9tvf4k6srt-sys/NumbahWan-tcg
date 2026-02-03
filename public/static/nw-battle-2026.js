/**
 * 🎰 NWG BATTLE ARENA 2026
 * Quick Auto-Battles + NWG Betting + Social Features
 * Optimized for short attention spans & mobile-first
 */

const NWBattle2026 = (function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════════════════════
  const CONFIG = {
    BATTLE_DURATION: 3000,      // 3 seconds visual battle
    DECK_SIZE: 3,               // Pick 3 cards
    MIN_BET: 10,                // Minimum NWG bet
    MAX_BET: 10000,             // Maximum NWG bet
    STAKING_BOOST: 0.20,        // 20% power boost for staked cards
    SYNERGY_BOOST: 0.15,        // 15% for same-set cards
    
    // Difficulty payouts & win rates
    DIFFICULTIES: {
      easy:   { payout: 1.5, winRate: 0.70, name: 'Easy', emoji: '🟢' },
      medium: { payout: 2.0, winRate: 0.50, name: 'Medium', emoji: '🟡' },
      hard:   { payout: 3.0, winRate: 0.30, name: 'Hard', emoji: '🔴' },
      boss:   { payout: 10.0, winRate: 0.10, name: 'BOSS', emoji: '💀' }
    },
    
    // Power by rarity
    RARITY_POWER: {
      common: 10, uncommon: 25, rare: 50, epic: 100, legendary: 200, mythic: 500
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════
  let state = {
    userDeck: [],
    enemyDeck: [],
    betAmount: 100,
    difficulty: 'medium',
    isBattling: false,
    battleResult: null,
    userCollection: [],
    stakedCards: [],
    battleHistory: [],
    stats: { wins: 0, losses: 0, totalWon: 0, totalLost: 0 }
  };

  // ═══════════════════════════════════════════════════════════════════
  // POWER CALCULATION
  // ═══════════════════════════════════════════════════════════════════
  function calculateCardPower(card, isStaked = false, deckCards = []) {
    let power = CONFIG.RARITY_POWER[card.rarity] || 10;
    
    // Staking boost
    if (isStaked) power *= (1 + CONFIG.STAKING_BOOST);
    
    // Synergy boost (same set)
    const sameSetCount = deckCards.filter(c => c.set === card.set && c.id !== card.id).length;
    if (sameSetCount > 0) power *= (1 + CONFIG.SYNERGY_BOOST * sameSetCount);
    
    // Add some randomness (±10%)
    power *= (0.9 + Math.random() * 0.2);
    
    return Math.round(power);
  }

  function calculateDeckPower(deck, stakedIds = []) {
    return deck.reduce((total, card) => {
      const isStaked = stakedIds.includes(card.id);
      return total + calculateCardPower(card, isStaked, deck);
    }, 0);
  }

  // ═══════════════════════════════════════════════════════════════════
  // AI OPPONENT GENERATION
  // ═══════════════════════════════════════════════════════════════════
  function generateAIDeck(difficulty, userPower) {
    const diff = CONFIG.DIFFICULTIES[difficulty];
    // AI power scales to create target win rate
    const targetPower = userPower * (1 / diff.winRate - 0.5);
    
    // Generate 3 random cards
    const rarities = Object.keys(CONFIG.RARITY_POWER);
    const deck = [];
    
    for (let i = 0; i < CONFIG.DECK_SIZE; i++) {
      // Weight towards appropriate power level
      const rarity = rarities[Math.floor(Math.random() * rarities.length)];
      deck.push({
        id: `ai_${Date.now()}_${i}`,
        name: getAICardName(rarity),
        rarity,
        img: `ai-${rarity}.webp`,
        set: 'ai'
      });
    }
    
    return deck;
  }

  function getAICardName(rarity) {
    const names = {
      common: ['Bot Grunt', 'Data Minion', 'Code Crawler'],
      uncommon: ['Circuit Knight', 'Binary Scout', 'Pixel Guard'],
      rare: ['Neural Warrior', 'Cyber Samurai', 'Logic Blade'],
      epic: ['Quantum Striker', 'AI Commander', 'Digital Dragon'],
      legendary: ['Master Algorithm', 'Prime Sentinel', 'Core Guardian'],
      mythic: ['Omega Protocol', 'Singularity', 'The Architect']
    };
    const pool = names[rarity] || names.common;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ═══════════════════════════════════════════════════════════════════
  // BATTLE LOGIC
  // ═══════════════════════════════════════════════════════════════════
  async function startBattle(userDeck, betAmount, difficulty) {
    if (state.isBattling) return { error: 'Battle in progress' };
    if (userDeck.length !== CONFIG.DECK_SIZE) return { error: `Need ${CONFIG.DECK_SIZE} cards` };
    if (betAmount < CONFIG.MIN_BET || betAmount > CONFIG.MAX_BET) return { error: 'Invalid bet' };

    state.isBattling = true;
    state.userDeck = userDeck;
    state.betAmount = betAmount;
    state.difficulty = difficulty;

    // Calculate powers
    const userPower = calculateDeckPower(userDeck, state.stakedCards.map(c => c.id));
    const aiDeck = generateAIDeck(difficulty, userPower);
    const aiPower = calculateDeckPower(aiDeck);
    state.enemyDeck = aiDeck;

    // Determine winner (power + luck)
    const diff = CONFIG.DIFFICULTIES[difficulty];
    const powerRatio = userPower / (userPower + aiPower);
    const luckFactor = Math.random();
    const userWins = (powerRatio * 0.7 + luckFactor * 0.3) > 0.5;

    // Calculate winnings
    const winnings = userWins ? Math.round(betAmount * diff.payout) : 0;
    const netResult = userWins ? winnings - betAmount : -betAmount;

    // Update stats
    if (userWins) {
      state.stats.wins++;
      state.stats.totalWon += winnings;
    } else {
      state.stats.losses++;
      state.stats.totalLost += betAmount;
    }

    // Record history
    state.battleHistory.unshift({
      id: Date.now(),
      userDeck: userDeck.map(c => c.name),
      aiDeck: aiDeck.map(c => c.name),
      userPower, aiPower,
      bet: betAmount,
      difficulty,
      won: userWins,
      winnings: netResult,
      timestamp: new Date().toISOString()
    });
    if (state.battleHistory.length > 50) state.battleHistory.pop();

    state.battleResult = {
      won: userWins,
      userPower,
      aiPower,
      userDeck,
      aiDeck,
      bet: betAmount,
      winnings: netResult,
      payout: diff.payout
    };

    state.isBattling = false;
    return state.battleResult;
  }

  // ═══════════════════════════════════════════════════════════════════
  // UI RENDERING
  // ═══════════════════════════════════════════════════════════════════
  function renderBattleUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="battle-2026">
        <!-- Header -->
        <div class="battle-header">
          <h1>⚔️ NWG BATTLE ARENA</h1>
          <div class="battle-stats">
            <span class="stat win">🏆 ${state.stats.wins}</span>
            <span class="stat lose">💀 ${state.stats.losses}</span>
            <span class="stat nwg">💰 ${(state.stats.totalWon - state.stats.totalLost).toLocaleString()} NWG</span>
          </div>
        </div>

        <!-- Deck Selection -->
        <div class="deck-section">
          <h3>📦 YOUR DECK (Pick 3)</h3>
          <div class="deck-slots" id="userDeckSlots">
            ${[0,1,2].map(i => `
              <div class="deck-slot ${state.userDeck[i] ? 'filled' : ''}" data-slot="${i}">
                ${state.userDeck[i] ? renderMiniCard(state.userDeck[i]) : '<span class="empty">+</span>'}
              </div>
            `).join('')}
          </div>
          <div class="deck-power">Power: <strong id="userPowerDisplay">0</strong></div>
        </div>

        <!-- Difficulty Selection -->
        <div class="difficulty-section">
          <h3>🎯 DIFFICULTY</h3>
          <div class="difficulty-buttons">
            ${Object.entries(CONFIG.DIFFICULTIES).map(([key, d]) => `
              <button class="diff-btn ${state.difficulty === key ? 'active' : ''}" data-diff="${key}">
                ${d.emoji} ${d.name}<br><small>${d.payout}x</small>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Betting Section -->
        <div class="bet-section">
          <h3>💰 YOUR BET</h3>
          <div class="bet-controls">
            <button class="bet-btn" data-bet="min">MIN</button>
            <button class="bet-btn" data-bet="half">½</button>
            <input type="number" id="betInput" value="${state.betAmount}" min="${CONFIG.MIN_BET}" max="${CONFIG.MAX_BET}">
            <button class="bet-btn" data-bet="double">2x</button>
            <button class="bet-btn" data-bet="max">MAX</button>
          </div>
          <div class="potential-win">
            Potential Win: <strong id="potentialWin">0</strong> NWG
          </div>
        </div>

        <!-- Battle Button -->
        <button class="battle-btn" id="startBattleBtn" ${state.userDeck.length < 3 ? 'disabled' : ''}>
          ⚔️ START BATTLE
        </button>

        <!-- Card Picker Modal -->
        <div class="card-picker-modal" id="cardPickerModal" style="display:none;">
          <div class="picker-content">
            <h3>Select a Card</h3>
            <div class="picker-grid" id="pickerGrid"></div>
            <button class="close-picker" id="closePickerBtn">✕ Close</button>
          </div>
        </div>

        <!-- Battle Animation Overlay -->
        <div class="battle-overlay" id="battleOverlay" style="display:none;">
          <div class="battle-arena-anim">
            <div class="team user-team" id="userTeamAnim"></div>
            <div class="vs-flash">⚔️</div>
            <div class="team enemy-team" id="enemyTeamAnim"></div>
          </div>
          <div class="battle-result" id="battleResultDisplay"></div>
        </div>
      </div>
    `;

    bindBattleEvents(container);
    updatePowerDisplay();
    updatePotentialWin();
  }

  function renderMiniCard(card) {
    const isStaked = state.stakedCards.some(s => s.id === card.id);
    return `
      <div class="mini-card ${card.rarity} ${isStaked ? 'staked' : ''}">
        <img src="/static/images/cards/thumbs/${card.img || 'placeholder.webp'}" 
             onerror="this.src='/static/images/cards/placeholder.webp'" alt="${card.name}">
        <div class="mini-name">${card.name.substring(0,12)}</div>
        <div class="mini-power">${calculateCardPower(card, isStaked, state.userDeck)}</div>
        ${isStaked ? '<div class="staked-badge">🔒</div>' : ''}
      </div>
    `;
  }

  function bindBattleEvents(container) {
    // Deck slot clicks
    container.querySelectorAll('.deck-slot').forEach(slot => {
      slot.onclick = () => openCardPicker(parseInt(slot.dataset.slot));
    });

    // Difficulty buttons
    container.querySelectorAll('.diff-btn').forEach(btn => {
      btn.onclick = () => {
        state.difficulty = btn.dataset.diff;
        container.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updatePotentialWin();
      };
    });

    // Bet controls
    container.querySelectorAll('.bet-btn').forEach(btn => {
      btn.onclick = () => {
        const input = document.getElementById('betInput');
        const current = parseInt(input.value) || CONFIG.MIN_BET;
        switch(btn.dataset.bet) {
          case 'min': input.value = CONFIG.MIN_BET; break;
          case 'half': input.value = Math.max(CONFIG.MIN_BET, Math.floor(current / 2)); break;
          case 'double': input.value = Math.min(CONFIG.MAX_BET, current * 2); break;
          case 'max': input.value = CONFIG.MAX_BET; break;
        }
        state.betAmount = parseInt(input.value);
        updatePotentialWin();
      };
    });

    document.getElementById('betInput').oninput = (e) => {
      state.betAmount = Math.max(CONFIG.MIN_BET, Math.min(CONFIG.MAX_BET, parseInt(e.target.value) || CONFIG.MIN_BET));
      updatePotentialWin();
    };

    // Battle button
    document.getElementById('startBattleBtn').onclick = () => executeBattle();

    // Close picker
    document.getElementById('closePickerBtn').onclick = () => {
      document.getElementById('cardPickerModal').style.display = 'none';
    };
  }

  function openCardPicker(slotIndex) {
    const modal = document.getElementById('cardPickerModal');
    const grid = document.getElementById('pickerGrid');
    
    // Get available cards (not already in deck)
    const usedIds = state.userDeck.map(c => c?.id).filter(Boolean);
    const available = state.userCollection.filter(c => !usedIds.includes(c.id));

    grid.innerHTML = available.length ? available.map(card => `
      <div class="picker-card ${card.rarity}" data-card-id="${card.id}">
        <img src="/static/images/cards/thumbs/${card.img || 'placeholder.webp'}" 
             onerror="this.src='/static/images/cards/placeholder.webp'" alt="${card.name}">
        <div class="picker-name">${card.name}</div>
        <div class="picker-power">${calculateCardPower(card, state.stakedCards.some(s => s.id === card.id), [])}</div>
      </div>
    `).join('') : '<p>No cards available. Get some cards first!</p>';

    grid.querySelectorAll('.picker-card').forEach(el => {
      el.onclick = () => {
        const card = state.userCollection.find(c => c.id == el.dataset.cardId);
        if (card) {
          state.userDeck[slotIndex] = card;
          modal.style.display = 'none';
          renderBattleUI('battleContainer');
        }
      };
    });

    modal.style.display = 'flex';
  }

  function updatePowerDisplay() {
    const el = document.getElementById('userPowerDisplay');
    if (el) {
      const power = calculateDeckPower(state.userDeck.filter(Boolean), state.stakedCards.map(c => c.id));
      el.textContent = power;
    }
  }

  function updatePotentialWin() {
    const el = document.getElementById('potentialWin');
    if (el) {
      const diff = CONFIG.DIFFICULTIES[state.difficulty];
      el.textContent = Math.round(state.betAmount * diff.payout).toLocaleString();
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // BATTLE ANIMATION
  // ═══════════════════════════════════════════════════════════════════
  async function executeBattle() {
    if (state.userDeck.filter(Boolean).length < CONFIG.DECK_SIZE) {
      alert('Select 3 cards first!');
      return;
    }

    const overlay = document.getElementById('battleOverlay');
    const userTeam = document.getElementById('userTeamAnim');
    const enemyTeam = document.getElementById('enemyTeamAnim');
    const resultDisplay = document.getElementById('battleResultDisplay');

    // Start battle
    const result = await startBattle(state.userDeck.filter(Boolean), state.betAmount, state.difficulty);
    if (result.error) {
      alert(result.error);
      return;
    }

    // Show overlay
    overlay.style.display = 'flex';
    resultDisplay.innerHTML = '';

    // Render teams
    userTeam.innerHTML = result.userDeck.map(c => `
      <div class="battle-card ${c.rarity}">
        <img src="/static/images/cards/thumbs/${c.img || 'placeholder.webp'}" onerror="this.src='/static/images/cards/placeholder.webp'">
      </div>
    `).join('');

    enemyTeam.innerHTML = result.aiDeck.map(c => `
      <div class="battle-card ${c.rarity}">
        <img src="/static/images/cards/thumbs/${c.img || 'placeholder.webp'}" onerror="this.src='/static/images/cards/placeholder.webp'">
      </div>
    `).join('');

    // Animate clash
    overlay.classList.add('fighting');
    
    // Play sound if available
    if (window.NW_AUDIO?.play) NW_AUDIO.play('fightStart');

    await sleep(CONFIG.BATTLE_DURATION);

    // Show result
    overlay.classList.remove('fighting');
    overlay.classList.add('result');

    const winClass = result.won ? 'victory' : 'defeat';
    resultDisplay.innerHTML = `
      <div class="result-box ${winClass}">
        <div class="result-title">${result.won ? '🏆 VICTORY!' : '💀 DEFEAT'}</div>
        <div class="result-powers">
          <span>Your Power: ${result.userPower}</span>
          <span>vs</span>
          <span>Enemy Power: ${result.aiPower}</span>
        </div>
        <div class="result-nwg ${result.won ? 'won' : 'lost'}">
          ${result.won ? '+' : ''}${result.winnings.toLocaleString()} NWG
        </div>
        <button class="close-result-btn" onclick="NWBattle2026.closeResult()">Continue</button>
      </div>
    `;

    // Play result sound
    if (window.NW_AUDIO?.play) NW_AUDIO.play(result.won ? 'victory' : 'defeat');
  }

  function closeResult() {
    const overlay = document.getElementById('battleOverlay');
    overlay.style.display = 'none';
    overlay.classList.remove('fighting', 'result');
    state.userDeck = [];
    renderBattleUI('battleContainer');
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ═══════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════
  async function loadUserCards() {
    try {
      // Try to get from wallet
      if (window.NW_WALLET?.getCollection) {
        state.userCollection = await NW_WALLET.getCollection();
      } else {
        // Fallback: load from cards.json
        const res = await fetch('/api/cards');
        const data = await res.json();
        state.userCollection = data.cards?.slice(0, 20) || []; // Demo: first 20 cards
      }
      
      // Load staked cards
      try {
        const stakeRes = await fetch('/api/card-bridge/collection/demo-wallet');
        const stakeData = await stakeRes.json();
        if (stakeData.collection?.cards) {
          state.stakedCards = state.userCollection.filter(c => 
            stakeData.collection.cards.includes(c.id?.toString())
          );
        }
      } catch(e) { /* No staked cards */ }
      
    } catch(e) {
      console.warn('Failed to load cards:', e);
      state.userCollection = [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════
  return {
    CONFIG,
    state,
    init: async (containerId) => {
      await loadUserCards();
      renderBattleUI(containerId);
    },
    startBattle,
    closeResult,
    getStats: () => state.stats,
    getHistory: () => state.battleHistory,
    setCollection: (cards) => { state.userCollection = cards; },
    setStakedCards: (cards) => { state.stakedCards = cards; }
  };
})();

// Auto-init if container exists
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('battleContainer')) {
    NWBattle2026.init('battleContainer');
  }
});
