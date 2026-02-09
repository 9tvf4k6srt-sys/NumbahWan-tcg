/**
 * 🃏NWG Card Bridge UI
 * Staking, Fusion, Trading - All in one
 */

const NWCardBridge = (function() {
  'use strict';

  const API = '/api/card-bridge';
  
  let state = {
    tab: 'collection',
    collection: { cards: [], totalValue: 0, stakedCount: 0, pendingYield: 0 },
    marketplace: { stats: {}, listings: [] },
    selectedCards: [],
    walletAddress: 'demo-wallet-' + Date.now().toString(36)
  };

  // ═══════════════════════════════════════════════════════════════════
  // API CALLS
  // ═══════════════════════════════════════════════════════════════════
  async function api(endpoint, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API + endpoint, opts);
    return res.json();
  }

  async function loadCollection() {
    const data = await api(`/collection/${state.walletAddress}`);
    if (data.success) state.collection = data.collection;
    return data;
  }

  async function loadMarketplace() {
    const data = await api('/marketplace');
    if (data.success) state.marketplace = data;
    return data;
  }

  async function stakeCard(cardId) {
    return api('/stake', 'POST', { cardId, walletAddress: state.walletAddress });
  }

  async function unstakeCard(cardId) {
    return api('/unstake', 'POST', { cardId, walletAddress: state.walletAddress });
  }

  async function claimRewards() {
    return api('/claim-rewards', 'POST', { walletAddress: state.walletAddress });
  }

  async function fuseCards(cardIds, targetRarity) {
    return api('/fuse', 'POST', { cardIds, walletAddress: state.walletAddress, targetRarity });
  }

  async function listCard(cardId, priceNWG) {
    return api('/list', 'POST', { cardId, walletAddress: state.walletAddress, priceNWG });
  }

  async function buyCard(listingId) {
    return api('/buy', 'POST', { listingId, buyerWallet: state.walletAddress });
  }

  // ═══════════════════════════════════════════════════════════════════
  // UI RENDERING
  // ═══════════════════════════════════════════════════════════════════
  function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="card-bridge">
        <!-- Header -->
        <div class="bridge-header">
          <h1>🃏Card Bridge</h1>
          <div class="wallet-info">
            <span class="nwg-balance">${state.collection.totalValue?.toLocaleString() || 0} NWG</span>
            <span class="pending">+${state.collection.pendingYield || 0}/day</span>
          </div>
        </div>

        <!-- Tabs -->
        <div class="bridge-tabs">
          <button class="tab ${state.tab === 'collection' ? 'active' : ''}" data-tab="collection">Collection</button>
          <button class="tab ${state.tab === 'staking' ? 'active' : ''}" data-tab="staking">Staking</button>
          <button class="tab ${state.tab === 'fusion' ? 'active' : ''}" data-tab="fusion">Fusion</button>
          <button class="tab ${state.tab === 'market' ? 'active' : ''}" data-tab="market">Market</button>
        </div>

        <!-- Content -->
        <div class="bridge-content" id="bridgeContent">
          ${renderTab()}
        </div>

        <!-- Toast -->
        <div class="bridge-toast" id="bridgeToast"></div>
      </div>
    `;

    bindEvents(container);
  }

  function renderTab() {
    switch(state.tab) {
      case 'collection': return renderCollection();
      case 'staking': return renderStaking();
      case 'fusion': return renderFusion();
      case 'market': return renderMarket();
      default: return '';
    }
  }

  function renderCollection() {
    const cards = state.collection.cards || [];
    return `
      <div class="collection-stats">
        <div class="stat-box"><span class="num">${cards.length}</span><span class="label">Cards</span></div>
        <div class="stat-box"><span class="num">${state.collection.stakedCount || 0}</span><span class="label">Staked</span></div>
        <div class="stat-box"><span class="num">${state.collection.totalValue?.toLocaleString() || 0}</span><span class="label">NWG Value</span></div>
      </div>
      <div class="card-grid">
        ${cards.length ? cards.map(id => renderCardItem(id)).join('') : '<p class="empty">No cards yet. Claim or buy some!</p>'}
      </div>
    `;
  }

  function renderStaking() {
    return `
      <div class="staking-info">
        <div class="yield-display">
          <div class="yield-big">+${state.collection.pendingYield || 0} NWG</div>
          <div class="yield-label">Pending Rewards</div>
          <button class="claim-btn" id="claimRewardsBtn">Claim All</button>
        </div>
      </div>
      <div class="staking-rates">
        <h4>Yield Rates (per day)</h4>
        <div class="rate-grid">
          <div class="rate common">Common: 1 NWG</div>
          <div class="rate uncommon">Uncommon: 3 NWG</div>
          <div class="rate rare">Rare: 10 NWG</div>
          <div class="rate epic">Epic: 50 NWG</div>
          <div class="rate legendary">Legendary: 200 NWG</div>
          <div class="rate mythic">Mythic: 1,000 NWG</div>
        </div>
      </div>
      <h4>Your Cards</h4>
      <div class="card-grid staking-grid">
        ${(state.collection.cards || []).map(id => renderStakingCard(id)).join('') || '<p class="empty">No cards to stake</p>'}
      </div>
    `;
  }

  function renderFusion() {
    const recipes = [
      { input: '5 Common', output: 'Uncommon', cost: 100, rate: '100%', target: 'uncommon' },
      { input: '5 Uncommon', output: 'Rare', cost: 500, rate: '95%', target: 'rare' },
      { input: '4 Rare', output: 'Epic', cost: 2000, rate: '85%', target: 'epic' },
      { input: '3 Epic', output: 'Legendary', cost: 10000, rate: '70%', target: 'legendary' },
      { input: '2 Legendary', output: 'Mythic', cost: 50000, rate: '50%', target: 'mythic' }
    ];

    return `
      <div class="fusion-recipes">
        <h4>Fusion Recipes</h4>
        ${recipes.map(r => `
          <div class="recipe" data-target="${r.target}">
            <span class="input">${r.input}</span>
            <span class="arrow">→</span>
            <span class="output ${r.target}">${r.output}</span>
            <span class="cost">${r.cost} NWG</span>
            <span class="rate">${r.rate}</span>
          </div>
        `).join('')}
      </div>
      <div class="fusion-area">
        <h4>Select Cards to Fuse</h4>
        <div class="selected-cards" id="selectedFusionCards">
          ${state.selectedCards.map((c,i) => `
            <div class="selected-slot filled" data-idx="${i}">
              <span class="remove-card" data-idx="${i}"></span>
              ${c.id}
            </div>
          `).join('')}
          ${state.selectedCards.length < 5 ? '<div class="selected-slot empty">+ Add</div>' : ''}
        </div>
        <button class="fuse-btn" id="fuseBtn" ${state.selectedCards.length < 2 ? 'disabled' : ''}>
          FUSE CARDS
        </button>
      </div>
      <div class="card-grid fusion-grid">
        ${(state.collection.cards || []).map(id => renderFusionCard(id)).join('') || '<p class="empty">No cards to fuse</p>'}
      </div>
    `;
  }

  function renderMarket() {
    const stats = state.marketplace.stats || {};
    return `
      <div class="market-stats">
        <div class="stat-box"><span class="num">${stats.activeListings || 0}</span><span class="label">Listings</span></div>
        <div class="stat-box"><span class="num">${(stats.totalVolume || 0).toLocaleString()}</span><span class="label">Volume</span></div>
        <div class="stat-box"><span class="num">${stats.totalCards || 0}</span><span class="label">Total Cards</span></div>
      </div>
      <h4>Floor Prices</h4>
      <div class="floor-prices">
        ${Object.entries(stats.floorPrices || {}).map(([rarity, price]) => `
          <div class="floor ${rarity}"><span class="rarity">${rarity}</span><span class="price">${price} NWG</span></div>
        `).join('')}
      </div>
      <h4>Recent Sales</h4>
      <div class="recent-sales">
        ${(state.marketplace.recentSales || []).map(sale => `
          <div class="sale">
            <span class="card-id">${sale.cardId}</span>
            <span class="rarity ${sale.rarity}">${sale.rarity}</span>
            <span class="price">${sale.price} NWG</span>
            <span class="time">${sale.time}</span>
          </div>
        `).join('') || '<p class="empty">No recent sales</p>'}
      </div>
    `;
  }

  function renderCardItem(cardId) {
    return `<div class="card-item" data-id="${cardId}"><div class="card-id">${cardId}</div></div>`;
  }

  function renderStakingCard(cardId) {
    const isStaked = Math.random() > 0.5; // Demo
    return `
      <div class="card-item ${isStaked ? 'staked' : ''}" data-id="${cardId}">
        <div class="card-id">${cardId}</div>
        <button class="stake-toggle" data-id="${cardId}" data-staked="${isStaked}">
          ${isStaked ? 'Unstake' : 'Stake'}
        </button>
      </div>
    `;
  }

  function renderFusionCard(cardId) {
    const isSelected = state.selectedCards.some(c => c.id === cardId);
    return `
      <div class="card-item fusion-card ${isSelected ? 'selected' : ''}" data-id="${cardId}">
        <div class="card-id">${cardId}</div>
        ${!isSelected ? '<button class="select-fusion" data-id="' + cardId + '">+ Select</button>' : '<span class="selected-badge"></span>'}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════
  // EVENT BINDING
  // ═══════════════════════════════════════════════════════════════════
  function bindEvents(container) {
    // Tab switching
    container.querySelectorAll('.tab').forEach(tab => {
      tab.onclick = () => {
        state.tab = tab.dataset.tab;
        render('cardBridgeContainer');
      };
    });

    // Claim rewards
    const claimBtn = document.getElementById('claimRewardsBtn');
    if (claimBtn) {
      claimBtn.onclick = async () => {
        const result = await claimRewards();
        showToast(result.success ? `Claimed ${result.totalClaimed} NWG!` : result.message);
        await loadCollection();
        render('cardBridgeContainer');
      };
    }

    // Stake toggle
    container.querySelectorAll('.stake-toggle').forEach(btn => {
      btn.onclick = async () => {
        const cardId = btn.dataset.id;
        const isStaked = btn.dataset.staked === 'true';
        const result = isStaked ? await unstakeCard(cardId) : await stakeCard(cardId);
        showToast(result.message);
        await loadCollection();
        render('cardBridgeContainer');
      };
    });

    // Fusion card selection
    container.querySelectorAll('.select-fusion').forEach(btn => {
      btn.onclick = () => {
        if (state.selectedCards.length < 5) {
          state.selectedCards.push({ id: btn.dataset.id });
          render('cardBridgeContainer');
        }
      };
    });

    // Remove from fusion
    container.querySelectorAll('.remove-card').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        state.selectedCards.splice(parseInt(btn.dataset.idx), 1);
        render('cardBridgeContainer');
      };
    });

    // Fuse button
    const fuseBtn = document.getElementById('fuseBtn');
    if (fuseBtn) {
      fuseBtn.onclick = async () => {
        if (state.selectedCards.length < 2) return;
        // Determine target rarity based on count
        const targets = { 5: 'uncommon', 4: 'epic', 3: 'legendary', 2: 'mythic' };
        const target = targets[state.selectedCards.length] || 'rare';
        
        const result = await fuseCards(state.selectedCards.map(c => c.id), target);
        showToast(result.message);
        if (result.success) {
          state.selectedCards = [];
          await loadCollection();
        }
        render('cardBridgeContainer');
      };
    }
  }

  function showToast(msg) {
    const toast = document.getElementById('bridgeToast');
    if (toast) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════
  async function init(containerId) {
    await Promise.all([loadCollection(), loadMarketplace()]);
    render(containerId);
  }

  return { init, state, loadCollection, loadMarketplace, showToast };
})();

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cardBridgeContainer')) {
    NWCardBridge.init('cardBridgeContainer');
  }
});
