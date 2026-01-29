/**
 * NumbahWan Card Renderer v1.0
 * Renders cards with CSS frames - no image generation needed
 * 
 * Usage:
 *   // Single card
 *   NW_CARDS.render(card, container, { size: 'md' })
 *   
 *   // Multiple cards
 *   NW_CARDS.renderMany(cards, container, { size: 'sm' })
 *   
 *   // From card ID
 *   NW_CARDS.renderById(105, container)
 */

window.NW_CARD_RENDERER = (function() {
  
  // Default stats by rarity (if not provided)
  const DEFAULT_STATS = {
    mythic: { atk: [10, 15], def: [8, 12], abilities: ['DIVINE', 'LIFESTEAL', 'BURN'] },
    legendary: { atk: [8, 12], def: [6, 10], abilities: ['BURN', 'CURSE', 'DRAIN'] },
    epic: { atk: [6, 10], def: [4, 8], abilities: ['SHIELD', 'PIERCE'] },
    rare: { atk: [4, 7], def: [3, 6], abilities: ['BLOCK'] },
    uncommon: { atk: [3, 5], def: [2, 4], abilities: [] },
    common: { atk: [1, 3], def: [1, 3], abilities: [] }
  };
  
  // Generate random stat within range
  function randomStat(range) {
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  }
  
  // Generate stats string
  function generateStats(card) {
    if (card.stats) return card.stats;
    
    const defaults = DEFAULT_STATS[card.rarity] || DEFAULT_STATS.common;
    const atk = randomStat(defaults.atk);
    const def = randomStat(defaults.def);
    const ability = defaults.abilities.length > 0 
      ? defaults.abilities[Math.floor(Math.random() * defaults.abilities.length)]
      : null;
    
    return ability ? `ATK ${atk} | DEF ${def} | ${ability}` : `ATK ${atk} | DEF ${def}`;
  }
  
  // Get image path
  function getImagePath(card) {
    if (!card.img) return '/static/cards/placeholder.jpg';
    if (card.img.startsWith('http') || card.img.startsWith('/')) return card.img;
    return `/static/cards/${card.img}`;
  }
  
  /**
   * Render a single card
   * @param {Object} card - Card data { id, name, rarity, img, stats?, description? }
   * @param {Object} options - { size: 'sm'|'md'|'lg'|'xl', showStats: true, onClick: fn }
   * @returns {HTMLElement} Card element
   */
  function renderCard(card, options = {}) {
    const { size = 'md', showStats = true, onClick = null } = options;
    
    const sizeClass = size === 'md' ? '' : `nw-card-${size}`;
    
    const cardEl = document.createElement('div');
    cardEl.className = `nw-card ${sizeClass}`.trim();
    cardEl.dataset.rarity = card.rarity || 'common';
    cardEl.dataset.cardId = card.id;
    
    const stats = showStats ? generateStats(card) : '';
    
    cardEl.innerHTML = `
      <img class="nw-card-art" src="${getImagePath(card)}" alt="${card.name}" loading="lazy" onerror="this.src='/static/cards/placeholder.jpg'">
      <div class="nw-card-info">
        <div class="nw-card-name">${card.name}</div>
        ${stats ? `<div class="nw-card-stats">${stats}</div>` : ''}
      </div>
      <div class="nw-card-rarity">${(card.rarity || 'common').toUpperCase()}</div>
    `;
    
    if (onClick) {
      cardEl.addEventListener('click', () => onClick(card, cardEl));
    }
    
    return cardEl;
  }
  
  /**
   * Render card into a container
   */
  function render(card, container, options = {}) {
    const el = renderCard(card, options);
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    if (container) {
      container.appendChild(el);
    }
    return el;
  }
  
  /**
   * Render multiple cards
   */
  function renderMany(cards, container, options = {}) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    if (!container) return [];
    
    const fragment = document.createDocumentFragment();
    const elements = cards.map(card => {
      const el = renderCard(card, options);
      fragment.appendChild(el);
      return el;
    });
    
    container.appendChild(fragment);
    return elements;
  }
  
  /**
   * Render card by ID (fetches from API)
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
   * Render cards by rarity
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
   * Create a card flip reveal animation
   */
  function createFlipReveal(card, container, options = {}) {
    const { delay = 0, onReveal = null } = options;
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    const flipContainer = document.createElement('div');
    flipContainer.className = 'nw-card-flip-container';
    
    const flipper = document.createElement('div');
    flipper.className = 'nw-card-flipper';
    
    // Card back
    const back = document.createElement('div');
    back.className = 'nw-card-back';
    
    // Card front
    const front = document.createElement('div');
    front.className = 'nw-card-front';
    const cardEl = renderCard(card, options);
    front.appendChild(cardEl);
    
    flipper.appendChild(back);
    flipper.appendChild(front);
    flipContainer.appendChild(flipper);
    container.appendChild(flipContainer);
    
    // Flip after delay
    setTimeout(() => {
      flipContainer.classList.add('flipped');
      if (onReveal) onReveal(card, cardEl);
    }, delay);
    
    return flipContainer;
  }
  
  /**
   * Generate HTML string for a card (useful for innerHTML)
   */
  function toHTML(card, options = {}) {
    const { size = 'md', showStats = true } = options;
    const sizeClass = size === 'md' ? '' : `nw-card-${size}`;
    const stats = showStats ? generateStats(card) : '';
    
    return `
      <div class="nw-card ${sizeClass}" data-rarity="${card.rarity || 'common'}" data-card-id="${card.id}">
        <img class="nw-card-art" src="${getImagePath(card)}" alt="${card.name}" loading="lazy">
        <div class="nw-card-info">
          <div class="nw-card-name">${card.name}</div>
          ${stats ? `<div class="nw-card-stats">${stats}</div>` : ''}
        </div>
        <div class="nw-card-rarity">${(card.rarity || 'common').toUpperCase()}</div>
      </div>
    `;
  }
  
  /**
   * Generate HTML for multiple cards
   */
  function toHTMLMany(cards, options = {}) {
    return cards.map(card => toHTML(card, options)).join('');
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
    DEFAULT_STATS
  };
  
})();

// Alias for convenience
window.NW_CARDS = window.NW_CARDS || {};
Object.assign(window.NW_CARDS, window.NW_CARD_RENDERER);
