/**
 * NumbahWan Guild Custom Icon System
 * 
 * Usage:
 * 1. Include this script: <script src="/static/icons/icons.js"></script>
 * 2. Use icons with: <span class="nw-icon" data-icon="crown"></span>
 * 3. Or call: NWIcons.render('crown', { size: 24, class: 'text-orange-400' })
 * 4. Convert emoji: NWIcons.fromEmoji('🔥') returns fire icon HTML
 * 
 * Available Icons:
 * - Navigation: home, arrow-left, arrow-right, arrow-up, arrow-down, chevron-down, menu, close
 * - Gaming: gaming, crown, sword, swords, shield, trophy, star, star-outline, fire, skull, party, confetti, meme, sleep, ghost
 * - Actions: copy, share, upload, download, settings, info, check, check-circle, x-mark, x-circle, warning
 * - UI: chat, heart, heart-outline, upvote, downvote, clipboard, document, search, filter, eye, eye-off, lock, unlock
 * - Category: egg, music, music-off, camera, image, dice, clock, calendar, gift, target, users, user, spicy, thinking, question
 * - Misc: globe, link, external-link, plus, minus, flag, bookmark, bell, ship, anchor
 * - Character: beard, hero, runner, baby, squid, circus, nail, shrug
 * - Face: angry, devil, cool, sloth, laugh, celebration
 * - Form: form, detective, brain, scroll, defense, alert
 */

const NWIcons = {
  // Icon sprite URL
  spriteUrl: '/static/icons/nw-icons.svg',
  
  // Default settings
  defaults: {
    size: 20,
    class: '',
    style: ''
  },

  /**
   * Comprehensive Emoji to Icon mapping
   * Maps Unicode emoji to NumbahWan custom icon names
   */
  emojiMap: {
    // Fire/Hot
    '🔥': 'fire',
    '💥': 'fire',
    '⚡': 'fire',
    
    // Crown/Royal/Leader
    '👑': 'crown',
    '🏆': 'trophy',
    '⭐': 'star',
    '🌟': 'star',
    '✨': 'star',
    
    // Combat/Gaming
    '⚔️': 'swords',
    '🗡️': 'sword',
    '🛡️': 'shield',
    '🎮': 'gaming',
    '🕹️': 'gaming',
    '💀': 'skull',
    '☠️': 'skull',
    '🎯': 'target',
    '🏹': 'target',
    
    // Sleep/AFK
    '😴': 'sleep',
    '💤': 'sleep',
    '🌙': 'sleep',
    
    // Party/Celebration
    '🎉': 'party',
    '🎊': 'confetti',
    '🥳': 'party',
    
    // Chat/Communication
    '💬': 'chat',
    '🗣️': 'chat',
    '📢': 'chat',
    '💭': 'thinking',
    
    // Share/Social
    '📤': 'share',
    '📲': 'share',
    '🔗': 'link',
    
    // Heart/Love
    '❤️': 'heart',
    '💖': 'heart',
    '💕': 'heart',
    '💗': 'heart',
    '💅': 'heart',  // nail care = fabulous
    
    // Camera/Photo
    '📸': 'camera',
    '📷': 'camera',
    '🖼️': 'image',
    
    // Music
    '🎵': 'music',
    '🎶': 'music',
    '🎤': 'music',
    
    // Settings/Tools
    '⚙️': 'settings',
    '🔧': 'settings',
    '🛠️': 'settings',
    
    // Info/Help
    '❓': 'question',
    '❔': 'question',
    '🤔': 'thinking',
    '💡': 'info',
    'ℹ️': 'info',
    
    // Warning/Alert
    '⚠️': 'warning',
    '🚨': 'warning',
    '🔔': 'bell',
    
    // Navigation
    '🏠': 'home',
    '🏡': 'home',
    '⬆️': 'upvote',
    '⬇️': 'downvote',
    '➡️': 'arrow-right',
    '⬅️': 'arrow-left',
    '🔙': 'arrow-left',
    
    // Time/Calendar
    '⏰': 'clock',
    '🕐': 'clock',
    '📅': 'calendar',
    '📆': 'calendar',
    
    // Gift/Special
    '🎁': 'gift',
    '🎀': 'gift',
    '🥚': 'egg',
    '🪺': 'egg',
    
    // Meme/Fun
    '😂': 'laugh',
    '🤣': 'laugh',
    '😆': 'laugh',
    '😈': 'devil',
    '👹': 'devil',
    '🌶️': 'spicy',
    '😤': 'angry',
    '😎': 'cool',
    '🦥': 'sloth',
    '🎊': 'celebration',
    
    // Ship/Travel
    '🚢': 'ship',
    '⛵': 'ship',
    '⚓': 'anchor',
    '🌍': 'globe',
    '🌎': 'globe',
    '🌏': 'globe',
    
    // Users/People
    '👤': 'user',
    '👥': 'users',
    '👨‍👩‍👧‍👦': 'users',
    '🧔': 'beard',
    '🦸': 'hero',
    '🏃': 'runner',
    '👶': 'baby',
    '🦑': 'squid',
    '🎪': 'circus',
    '🤷': 'shrug',
    '🦊': 'ghost',  // sneaky
    '👻': 'ghost',
    
    // Check/Status
    '✅': 'check-circle',
    '✓': 'check',
    '☑️': 'check',
    '❌': 'x-circle',
    '✖️': 'x-mark',
    '🚫': 'x-circle',
    
    // Random/Dice
    '🎲': 'dice',
    '🔮': 'dice',
    '🔍': 'detective',
    '🧠': 'brain',
    '📜': 'scroll',
    '📋': 'form',
    
    // Documents
    '📜': 'document',
    '📄': 'document',
    '📝': 'clipboard',
    '📋': 'clipboard',
    
    // Lock/Security
    '🔒': 'lock',
    '🔓': 'unlock',
    '🔑': 'unlock',
    
    // Eye/View
    '👁️': 'eye',
    '👀': 'eye',
    
    // Bookmark/Save
    '📌': 'bookmark',
    '🔖': 'bookmark',
    '💾': 'download',
    
    // Plus/Minus
    '➕': 'plus',
    '➖': 'minus',
    
    // Flag
    '🚩': 'flag',
    '🏳️': 'flag',
    '🏴': 'flag',
    
    // Defense/Battle
    '⛊': 'defense',
    
    // Alert/Warning
    '⚠️': 'alert',
    '❗': 'alert'
  },

  /**
   * Icon color mapping for styling
   */
  iconColors: {
    fire: '#ff6b00',
    crown: '#ffd700',
    skull: '#a855f7',
    sleep: '#8b5cf6',
    hero: '#3b82f6',
    camera: '#ec4899',
    runner: '#22c55e',
    ghost: '#6b7280',
    swords: '#ef4444',
    meme: '#f97316',
    heart: '#ef4444',
    star: '#fbbf24',
    trophy: '#ffd700',
    angry: '#ef4444',
    devil: '#a855f7',
    cool: '#fbbf24',
    sloth: '#9ca3af',
    laugh: '#fbbf24',
    celebration: '#ec4899',
    detective: '#3b82f6',
    brain: '#ec4899',
    scroll: '#d4a574',
    form: '#6b7280',
    defense: '#3b82f6',
    alert: '#fbbf24',
    check: '#22c55e',
    'check-circle': '#22c55e',
    'x-circle': '#ef4444',
    'x-mark': '#ef4444',
    party: '#ec4899',
    confetti: '#fbbf24',
    upvote: '#22c55e',
    downvote: '#ef4444',
    thinking: '#8b5cf6',
    chat: '#3b82f6',
    music: '#ec4899',
    eye: '#6b7280',
    shrug: '#9ca3af',
    nail: '#ec4899',
    dice: '#8b5cf6',
    question: '#6b7280',
    warning: '#fbbf24',
    gaming: '#f97316',
    shield: '#3b82f6',
    sword: '#ef4444',
    baby: '#fbbf24',
    squid: '#ec4899',
    circus: '#a855f7',
    beard: '#92400e'
  },

  /**
   * Render an icon as SVG HTML
   * @param {string} name - Icon name
   * @param {Object} options - { size, class, style }
   * @returns {string} - SVG HTML string
   */
  render(name, options = {}) {
    const opts = { ...this.defaults, ...options };
    const sizeAttr = opts.size ? `width="${opts.size}" height="${opts.size}"` : '';
    const classAttr = opts.class ? `class="nw-icon ${opts.class}"` : 'class="nw-icon"';
    
    // Apply color from iconColors if useColor is true or no custom style
    let styleAttr = '';
    if (opts.style) {
      styleAttr = `style="${opts.style}"`;
    } else if (opts.colored && this.iconColors[name]) {
      styleAttr = `style="color:${this.iconColors[name]}"`;
    }
    
    return `<svg ${classAttr} ${sizeAttr} ${styleAttr} aria-hidden="true"><use href="${this.spriteUrl}#${name}"></use></svg>`;
  },

  /**
   * Render icon with automatic color from iconColors mapping
   */
  renderColored(name, options = {}) {
    return this.render(name, { ...options, colored: true });
  },

  /**
   * Convert emoji to custom icon HTML
   * @param {string} emoji - Emoji character(s)
   * @param {Object} options - { size, class, style }
   * @returns {string} - SVG HTML string or original emoji if no mapping
   */
  fromEmoji(emoji, options = {}) {
    // Handle multi-emoji strings
    if (emoji && emoji.length > 2) {
      // Try to match multi-char emojis first, then individual
      for (const [em, icon] of Object.entries(this.emojiMap)) {
        if (emoji.includes(em)) {
          return this.render(icon, options);
        }
      }
    }
    
    const iconName = this.emojiMap[emoji];
    if (iconName) {
      return this.render(iconName, options);
    }
    // Return empty span to maintain layout but not show emoji
    return `<span class="nw-icon-placeholder" style="width:${options.size || 20}px;height:${options.size || 20}px;display:inline-block;"></span>`;
  },

  /**
   * Replace all emojis in a string with custom icons
   * @param {string} text - Text containing emojis
   * @param {Object} options - { size, class, style }
   * @returns {string} - Text with emojis replaced by SVG icons
   */
  replaceEmojis(text, options = {}) {
    if (!text) return text;
    
    let result = text;
    for (const [emoji, iconName] of Object.entries(this.emojiMap)) {
      if (result.includes(emoji)) {
        result = result.split(emoji).join(this.render(iconName, options));
      }
    }
    return result;
  },

  /**
   * Get icon name from emoji
   * @param {string} emoji - Emoji character
   * @returns {string|null} - Icon name or null
   */
  getIconFromEmoji(emoji) {
    return this.emojiMap[emoji] || null;
  },

  /**
   * Create an icon element
   * @param {string} name - Icon name
   * @param {Object} options - { size, class, style }
   * @returns {SVGElement} - SVG DOM element
   */
  create(name, options = {}) {
    const opts = { ...this.defaults, ...options };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('nw-icon');
    if (opts.class) {
      opts.class.split(' ').forEach(c => c && svg.classList.add(c));
    }
    if (opts.size) {
      svg.setAttribute('width', opts.size);
      svg.setAttribute('height', opts.size);
    }
    if (opts.style) {
      svg.setAttribute('style', opts.style);
    }
    svg.setAttribute('aria-hidden', 'true');
    
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `${this.spriteUrl}#${name}`);
    svg.appendChild(use);
    
    return svg;
  },

  /**
   * Initialize - convert all data-icon attributes to actual icons
   */
  init() {
    document.querySelectorAll('[data-icon]').forEach(el => {
      const name = el.getAttribute('data-icon');
      const size = el.getAttribute('data-icon-size') || this.defaults.size;
      const iconClass = el.getAttribute('data-icon-class') || '';
      
      const svg = this.create(name, { 
        size, 
        class: iconClass 
      });
      
      // Preserve existing classes
      el.classList.forEach(c => {
        if (c !== 'nw-icon-placeholder') {
          svg.classList.add(c);
        }
      });
      
      el.replaceWith(svg);
    });
  },

  /**
   * Icon catalog - for reference and validation
   */
  catalog: {
    navigation: ['home', 'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down', 'chevron-down', 'menu', 'close'],
    gaming: ['gaming', 'crown', 'sword', 'swords', 'shield', 'trophy', 'star', 'star-outline', 'fire', 'skull', 'party', 'confetti', 'meme', 'sleep', 'ghost'],
    actions: ['copy', 'share', 'upload', 'download', 'settings', 'info', 'check', 'check-circle', 'x-mark', 'x-circle', 'warning'],
    ui: ['chat', 'heart', 'heart-outline', 'upvote', 'downvote', 'clipboard', 'document', 'search', 'filter', 'eye', 'eye-off', 'lock', 'unlock'],
    category: ['egg', 'music', 'music-off', 'camera', 'image', 'dice', 'clock', 'calendar', 'gift', 'target', 'users', 'user', 'spicy', 'thinking', 'question'],
    character: ['beard', 'hero', 'runner', 'baby', 'squid', 'circus', 'shrug', 'nail'],
    face: ['angry', 'devil', 'cool', 'sloth', 'laugh', 'grimace', 'eye-roll'],
    form: ['form', 'detective', 'brain', 'scroll', 'defense', 'alert', 'celebration'],
    misc: ['globe', 'link', 'external-link', 'plus', 'minus', 'flag', 'bookmark', 'bell', 'ship', 'anchor', 'sparkles', 'clown', 'meditation']
  },

  /**
   * Get all available icon names
   * @returns {string[]} - Array of icon names
   */
  getAllIcons() {
    return Object.values(this.catalog).flat();
  }
};

// CSS for icons
const iconStyles = document.createElement('style');
iconStyles.textContent = `
  .nw-icon {
    display: inline-block;
    vertical-align: middle;
    fill: currentColor;
    flex-shrink: 0;
  }
  
  .nw-icon-sm { width: 16px; height: 16px; }
  .nw-icon-md { width: 20px; height: 20px; }
  .nw-icon-lg { width: 24px; height: 24px; }
  .nw-icon-xl { width: 32px; height: 32px; }
  .nw-icon-2xl { width: 48px; height: 48px; }
  
  .nw-icon-placeholder {
    display: inline-block;
    vertical-align: middle;
  }
  
  /* Animation classes */
  .nw-icon-spin {
    animation: nw-spin 1s linear infinite;
  }
  
  .nw-icon-pulse {
    animation: nw-pulse 2s ease-in-out infinite;
  }
  
  .nw-icon-bounce {
    animation: nw-bounce 1s ease infinite;
  }
  
  @keyframes nw-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes nw-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }
  
  @keyframes nw-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
`;
document.head.appendChild(iconStyles);

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NWIcons.init());
} else {
  NWIcons.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NWIcons;
}
