/**
 * NumbahWan Card Renderer v2.0
 * Premium Fantasy TCG Card Rendering System
 * 
 * Features:
 * - Ornate frames with corner decorations
 * - Gem-style stat displays (ATK/DEF)
 * - Embossed name banners
 * - Rarity-specific icons and effects
 * - Flip reveal animations
 */

window.NW_CARD_RENDERER = (function() {
  
  // Stats by rarity
  const RARITY_STATS = {
    mythic: { atk: [10, 15], def: [8, 12], abilities: ['DIVINE', 'LIFESTEAL', 'IMMORTAL', 'BURN', 'FREEZE'] },
    legendary: { atk: [8, 12], def: [6, 10], abilities: ['BURN', 'CURSE', 'DRAIN', 'POISON', 'FREEZE'] },
    epic: { atk: [6, 10], def: [4, 8], abilities: ['SHIELD', 'PIERCE', 'REGEN', 'STUN'] },
    rare: { atk: [4, 7], def: [3, 6], abilities: ['BLOCK', 'COUNTER', 'DODGE'] },
    uncommon: { atk: [3, 5], def: [2, 4], abilities: ['GUARD'] },
    common: { atk: [1, 3], def: [1, 3], abilities: [] }
  };
  
  // Rarity icons
  const RARITY_ICONS = {
    mythic: '☀', // Sun/Divine
    legendary: '♔', // Crown
    epic: '✧', // Star
    rare: '◆', // Diamond
    uncommon: '❧', // Leaf
    common: '●' // Circle
  };
  
  // Random number in range
  function randRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  // Generate stats for card
  function generateStats(card) {
    if (card.atk !== undefined && card.def !== undefined) {
      return { atk: card.atk, def: card.def, ability: card.ability || null };
    }
    
    const config = RARITY_STATS[card.rarity] || RARITY_STATS.common;
    const atk = randRange(config.atk[0], config.atk[1]);
    const def = randRange(config.def[0], config.def[1]);
    const ability = config.abilities.length > 0 
      ? config.abilities[Math.floor(Math.random() * config.abilities.length)]
      : null;
    
    return { atk, def, ability };
  }
  
  // Get image path
  function getImagePath(card) {
    if (!card.img) return '/static/images/card-placeholder.jpg';
    if (card.img.startsWith('http') || card.img.startsWith('/')) return card.img;
    return `/static/cards/${card.img}`;
  }
  
  // Parse title from name (e.g., "RegginA, The Eternal Flame" -> { name: "RegginA", title: "The Eternal Flame" })
  function parseName(fullName) {
    const separators = [', ', ' - ', ': '];
    for (const sep of separators) {
      if (fullName.includes(sep)) {
        const [name, title] = fullName.split(sep);
        return { name, title };
      }
    }
    return { name: fullName, title: null };
  }
  
  /**
   * Render a card element
   * @param {Object} card - Card data
   * @param {Object} options - Render options
   * @returns {HTMLElement}
   */
  function renderCard(card, options = {}) {
    const { 
      size = 'md', 
      showStats = true, 
      showAbility = true,
      onClick = null,
      cost = null 
    } = options;
    
    const rarity = card.rarity || 'common';
    const sizeClass = size === 'md' ? '' : `nw-card-${size}`;
    const stats = showStats ? generateStats(card) : null;
    const { name, title } = parseName(card.name);
    const icon = RARITY_ICONS[rarity] || '●';
    
    const cardEl = document.createElement('div');
    cardEl.className = `nw-card ${sizeClass}`.trim();
    cardEl.dataset.rarity = rarity;
    cardEl.dataset.cardId = card.id;
    
    // Build card HTML
    let html = `
      <!-- Card Art -->
      <img class="nw-card-art" src="${getImagePath(card)}" alt="${card.name}" loading="lazy" 
           onerror="this.src='/static/images/card-placeholder.jpg'">
      
      <!-- Corner Ornaments -->
      <div class="nw-card-corner top-left"></div>
      <div class="nw-card-corner top-right"></div>
      <div class="nw-card-corner bottom-left"></div>
      <div class="nw-card-corner bottom-right"></div>
    `;
    
    // Rarity-specific decorations
    if (rarity === 'mythic') {
      html += `<div class="nw-card-divine">☀</div>`;
    } else if (rarity === 'legendary') {
      html += `<div class="nw-card-crown">♔</div>`;
    }
    
    // Cost gem (if provided)
    if (cost !== null) {
      html += `<div class="nw-card-cost">${cost}</div>`;
    }
    
    // Ability tag
    if (showAbility && stats && stats.ability) {
      html += `<div class="nw-card-ability">${stats.ability}</div>`;
    }
    
    // Name banner
    html += `
      <div class="nw-card-banner">
        <div class="nw-card-name">${name}</div>
        ${title ? `<div class="nw-card-title">${title}</div>` : ''}
      </div>
    `;
    
    // Stats gems
    if (showStats && stats) {
      html += `
        <div class="nw-card-stats-container">
          <div class="nw-card-stat atk">
            <span class="nw-card-stat-value">${stats.atk}</span>
            <span class="nw-card-stat-label">ATK</span>
          </div>
          <div class="nw-card-stat def">
            <span class="nw-card-stat-value">${stats.def}</span>
            <span class="nw-card-stat-label">DEF</span>
          </div>
        </div>
      `;
    }
    
    // Rarity badge
    html += `<div class="nw-card-rarity">${rarity.toUpperCase()}</div>`;
    
    cardEl.innerHTML = html;
    
    // Click handler
    if (onClick) {
      cardEl.style.cursor = 'pointer';
      cardEl.addEventListener('click', () => onClick(card, cardEl));
    }
    
    return cardEl;
  }
  
  /**
   * Render into container
   */
  function render(card, container, options = {}) {
    const el = renderCard(card, options);
    const target = typeof container === 'string' ? document.querySelector(container) : container;
    if (target) target.appendChild(el);
    return el;
  }
  
  /**
   * Render multiple cards
   */
  function renderMany(cards, container, options = {}) {
    const target = typeof container === 'string' ? document.querySelector(container) : container;
    if (!target) return [];
    
    const fragment = document.createDocumentFragment();
    const elements = cards.map(card => {
      const el = renderCard(card, options);
      fragment.appendChild(el);
      return el;
    });
    
    target.appendChild(fragment);
    return elements;
  }
  
  /**
   * Render by ID (fetch from API)
   */
  async function renderById(cardId, container, options = {}) {
    try {
      const res = await fetch(`/api/cards/${cardId}`);
      const data = await res.json();
      if (data.success && data.card) {
        return render(data.card, container, options);
      }
    } catch (e) {
      console.error('Failed to render card:', e);
    }
    return null;
  }
  
  /**
   * Render by rarity
   */
  async function renderByRarity(rarity, container, options = {}) {
    try {
      const res = await fetch(`/api/cards/rarity/${rarity}`);
      const data = await res.json();
      if (data.success && data.cards) {
        return renderMany(data.cards, container, options);
      }
    } catch (e) {
      console.error('Failed to render cards:', e);
    }
    return [];
  }
  
  /**
   * Create flip reveal animation
   */
  function createFlipReveal(card, container, options = {}) {
    const { delay = 500, onReveal = null } = options;
    const target = typeof container === 'string' ? document.querySelector(container) : container;
    if (!target) return null;
    
    const rarity = card.rarity || 'common';
    
    const flipContainer = document.createElement('div');
    flipContainer.className = 'nw-card-flip-container';
    flipContainer.style.cssText = `
      perspective: 1200px;
      width: var(--card-width, 260px);
      height: var(--card-height, 380px);
    `;
    
    const flipper = document.createElement('div');
    flipper.className = 'nw-card-flipper';
    flipper.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      transform-style: preserve-3d;
    `;
    
    // Card back
    const back = document.createElement('div');
    back.className = 'nw-card-back';
    back.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      border-radius: 16px;
      background: linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 50%, #1a1a2e 100%);
      border: 4px solid #3b3b5c;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    `;
    back.innerHTML = `
      <div style="text-align: center;">
        <div style="font-family: 'Orbitron', sans-serif; font-size: 60px; font-weight: 900;
                    background: linear-gradient(135deg, #ff6b00, #ffd700);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;">N</div>
        <div style="font-family: 'Orbitron', sans-serif; font-size: 12px; color: #888; 
                    letter-spacing: 3px; margin-top: 10px;">NUMBAHWAN</div>
      </div>
    `;
    
    // Card front
    const front = document.createElement('div');
    front.className = 'nw-card-front';
    front.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      transform: rotateY(180deg);
    `;
    const cardEl = renderCard(card, options);
    front.appendChild(cardEl);
    
    flipper.appendChild(back);
    flipper.appendChild(front);
    flipContainer.appendChild(flipper);
    target.appendChild(flipContainer);
    
    // Flip after delay
    setTimeout(() => {
      flipper.style.transform = 'rotateY(180deg)';
      
      // Add reveal effects based on rarity
      setTimeout(() => {
        if (['mythic', 'legendary', 'epic'].includes(rarity)) {
          cardEl.style.animation = 'none';
          void cardEl.offsetWidth; // Trigger reflow
          cardEl.style.animation = '';
        }
        if (onReveal) onReveal(card, cardEl);
      }, 400);
    }, delay);
    
    return flipContainer;
  }
  
  /**
   * Generate HTML string
   */
  function toHTML(card, options = {}) {
    const temp = document.createElement('div');
    temp.appendChild(renderCard(card, options));
    return temp.innerHTML;
  }
  
  /**
   * Generate HTML for multiple cards
   */
  function toHTMLMany(cards, options = {}) {
    return cards.map(c => toHTML(c, options)).join('');
  }
  
  // Public API
  return {
    render,
    renderMany,
    renderById,
    renderByRarity,
    renderCard,
    createFlipReveal,
    toHTML,
    toHTMLMany,
    generateStats,
    RARITY_STATS,
    RARITY_ICONS
  };
  
})();

// Alias
if (typeof window.NW_CARDS === 'undefined') window.NW_CARDS = {};
Object.assign(window.NW_CARDS, window.NW_CARD_RENDERER);
