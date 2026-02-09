/**
 * NumbahWan Premium Icon System v2.0
 * 
 * PROFESSIONAL UNIQUE ICONS - NumbahWan Guild Style
 * 
 * Features:
 * - 32x32 viewBox for crisp detail
 * - Multi-layer gradients
 * - Glow effects
 * - Unique brand identity
 * - Consistent NW color palette
 * 
 * Usage:
 * 1. Include: <script src="/static/nw-icons-inline.js"></script>
 * 2. Use: <span data-nw-icon="target"></span>
 * 3. Or: NWIconsInline.render('crown', { size: 24 })
 */

const NWIconsInline = {
  version: '2.0',
  
  // NumbahWan Brand Colors
  colors: {
    primary: '#ff6b00',      // NW Orange
    secondary: '#00d4ff',    // Cyan
    gold: '#ffd700',         // Gold
    purple: '#a855f7',       // Purple
    green: '#22c55e',        // Green
    red: '#ef4444',          // Red
    blue: '#3b82f6',         // Blue
    dark: '#0a0a0f',         // Dark BG
    light: '#ffffff'         // White
  },

  // Shared gradient definitions (injected once)
  _defsInjected: false,
  
  sharedDefs: `
    <defs>
      <!-- NW Orange Gradient -->
      <linearGradient id="nw-orange" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffaa00"/>
        <stop offset="50%" stop-color="#ff6b00"/>
        <stop offset="100%" stop-color="#cc4400"/>
      </linearGradient>
      <!-- NW Gold Gradient -->
      <linearGradient id="nw-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#ffd700"/>
        <stop offset="100%" stop-color="#b8860b"/>
      </linearGradient>
      <!-- NW Cyan Gradient -->
      <linearGradient id="nw-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#67e8f9"/>
        <stop offset="50%" stop-color="#00d4ff"/>
        <stop offset="100%" stop-color="#0891b2"/>
      </linearGradient>
      <!-- NW Purple Gradient -->
      <linearGradient id="nw-purple" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#c084fc"/>
        <stop offset="50%" stop-color="#a855f7"/>
        <stop offset="100%" stop-color="#7c3aed"/>
      </linearGradient>
      <!-- NW Green Gradient -->
      <linearGradient id="nw-green" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4ade80"/>
        <stop offset="50%" stop-color="#22c55e"/>
        <stop offset="100%" stop-color="#16a34a"/>
      </linearGradient>
      <!-- NW Red Gradient -->
      <linearGradient id="nw-red" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f87171"/>
        <stop offset="50%" stop-color="#ef4444"/>
        <stop offset="100%" stop-color="#b91c1c"/>
      </linearGradient>
      <!-- NW Blue Gradient -->
      <linearGradient id="nw-blue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#60a5fa"/>
        <stop offset="50%" stop-color="#3b82f6"/>
        <stop offset="100%" stop-color="#1d4ed8"/>
      </linearGradient>
      <!-- Shine Gradient -->
      <linearGradient id="nw-shine" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <!-- Glow Filters -->
      <filter id="nw-glow-sm" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="nw-glow-md" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="nw-glow-lg" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <!-- Emboss Filter -->
      <filter id="nw-emboss">
        <feOffset dx="0" dy="1"/>
        <feGaussianBlur stdDeviation="0.5"/>
        <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1"/>
        <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0"/>
        <feBlend in2="SourceGraphic"/>
      </filter>
    </defs>
  `,

  // All premium icons (32x32 viewBox)
  icons: {
    // ═══════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════
    home: `
      <polygon fill="url(#nw-orange)" points="16,2 2,14 6,14 6,28 13,28 13,20 19,20 19,28 26,28 26,14 30,14" filter="url(#nw-glow-sm)"/>
      <polygon fill="url(#nw-gold)" points="16,4 5,13 6,13 6,14 16,5 26,14 26,13 27,13" opacity="0.6"/>
      <rect fill="#ff6b00" x="21" y="6" width="4" height="5" rx="0.5"/>
      <circle fill="#ffd700" cx="16" cy="24" r="2" opacity="0.8"/>
    `,
    'arrow-left': `
      <circle fill="url(#nw-cyan)" cx="16" cy="16" r="13" filter="url(#nw-glow-sm)"/>
      <path fill="#ffffff" d="M18 8L10 16L18 24" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    `,
    'arrow-right': `
      <circle fill="url(#nw-cyan)" cx="16" cy="16" r="13" filter="url(#nw-glow-sm)"/>
      <path fill="#ffffff" d="M14 8L22 16L14 24" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    `,
    close: `
      <circle fill="url(#nw-red)" cx="16" cy="16" r="13" filter="url(#nw-glow-sm)"/>
      <path stroke="#ffffff" stroke-width="3" stroke-linecap="round" d="M10 10L22 22M10 22L22 10"/>
    `,
    menu: `
      <rect fill="url(#nw-orange)" x="4" y="6" width="24" height="4" rx="2" filter="url(#nw-glow-sm)"/>
      <rect fill="url(#nw-orange)" x="4" y="14" width="24" height="4" rx="2"/>
      <rect fill="url(#nw-orange)" x="4" y="22" width="24" height="4" rx="2"/>
      <circle fill="#ffd700" cx="6" cy="8" r="1.5"/>
      <circle fill="#ffd700" cx="6" cy="16" r="1.5"/>
      <circle fill="#ffd700" cx="6" cy="24" r="1.5"/>
    `,
    'chevron-down': `
      <path fill="url(#nw-cyan)" d="M6 10L16 22L26 10" stroke="url(#nw-cyan)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#nw-glow-sm)"/>
    `,

    // ═══════════════════════════════════════════════════════════════
    // GAMING / TCG
    // ═══════════════════════════════════════════════════════════════
    target: `
      <circle fill="none" stroke="url(#nw-red)" stroke-width="3" cx="16" cy="16" r="13" filter="url(#nw-glow-md)"/>
      <circle fill="none" stroke="url(#nw-red)" stroke-width="2" cx="16" cy="16" r="8"/>
      <circle fill="url(#nw-orange)" cx="16" cy="16" r="4" filter="url(#nw-glow-sm)"/>
      <circle fill="#ffffff" cx="16" cy="16" r="1.5"/>
    `,
    crown: `
      <path fill="url(#nw-gold)" d="M4 22L2 8L9 13L16 4L23 13L30 8L28 22H4Z" filter="url(#nw-glow-md)"/>
      <rect fill="url(#nw-orange)" x="4" y="22" width="24" height="5" rx="1"/>
      <circle fill="#ff6b00" cx="8" cy="25" r="1.5"/>
      <circle fill="#ff6b00" cx="16" cy="25" r="1.5"/>
      <circle fill="#ff6b00" cx="24" cy="25" r="1.5"/>
      <circle fill="#ffffff" cx="9" cy="13" r="2" opacity="0.5"/>
      <circle fill="#ffffff" cx="16" cy="7" r="2.5" opacity="0.6"/>
      <circle fill="#ffffff" cx="23" cy="13" r="2" opacity="0.5"/>
    `,
    sword: `
      <path fill="url(#nw-cyan)" d="M22 2L30 10L27 13L24 10L10 24L13 27L10 30L2 22L5 19L8 22L22 8L19 5L22 2Z" filter="url(#nw-glow-sm)"/>
      <path fill="url(#nw-gold)" d="M8 22L10 20L12 22L10 24L8 22Z"/>
      <rect fill="url(#nw-orange)" x="3" y="25" width="6" height="5" rx="1" transform="rotate(-45 6 27.5)"/>
      <circle fill="#ffffff" cx="26" cy="6" r="1.5" opacity="0.7"/>
    `,
    swords: `
      <path fill="url(#nw-red)" d="M8 2L2 8L5 11L8 8L14 14L8 20L5 17L2 20L8 30L11 27L14 30L20 24L26 30L29 27L26 24L30 20L24 14L30 8L27 5L24 8L18 2L15 5L12 2L8 2Z" filter="url(#nw-glow-sm)"/>
      <circle fill="url(#nw-gold)" cx="16" cy="16" r="4"/>
      <circle fill="#ffffff" cx="16" cy="16" r="2"/>
    `,
    shield: `
      <path fill="url(#nw-blue)" d="M16 2L4 7V15C4 22 9 27 16 30C23 27 28 22 28 15V7L16 2Z" filter="url(#nw-glow-md)"/>
      <path fill="url(#nw-cyan)" d="M16 5L7 9V15C7 20 10.5 24.5 16 27C21.5 24.5 25 20 25 15V9L16 5Z"/>
      <path fill="#ffffff" d="M16 10L12 14L16 22L20 14L16 10Z" opacity="0.8"/>
      <circle fill="#ffd700" cx="16" cy="14" r="2"/>
    `,
    trophy: `
      <path fill="url(#nw-gold)" d="M8 4H24V10C24 16 20 20 16 20C12 20 8 16 8 10V4Z" filter="url(#nw-glow-md)"/>
      <path fill="url(#nw-gold)" d="M6 6H8V10C5 10 4 7 6 6ZM24 6H26C28 7 27 10 24 10V6Z"/>
      <rect fill="url(#nw-orange)" x="13" y="20" width="6" height="4"/>
      <path fill="url(#nw-gold)" d="M9 24H23V28C23 29 22 30 21 30H11C10 30 9 29 9 28V24Z"/>
      <path fill="#ffffff" d="M12 7H20V9C20 12 18 14 16 14C14 14 12 12 12 9V7Z" opacity="0.3"/>
      <circle fill="#ff6b00" cx="16" cy="10" r="2"/>
    `,
    fire: `
      <path fill="url(#nw-orange)" d="M16 2C16 2 10 8 10 14C10 17 11.5 19 13 20C11 17 13 14 16 12C19 14 21 17 19 20C20.5 19 22 17 22 14C22 8 16 2 16 2Z" filter="url(#nw-glow-md)"/>
      <path fill="url(#nw-gold)" d="M16 30C11 30 8 26 8 22C8 18 12 14 16 12C20 14 24 18 24 22C24 26 21 30 16 30Z"/>
      <ellipse fill="url(#nw-red)" cx="16" cy="24" rx="4" ry="5"/>
      <ellipse fill="#fef08a" cx="16" cy="25" rx="2" ry="3" opacity="0.8"/>
    `,
    star: `
      <path fill="url(#nw-gold)" d="M16 2L19.5 12H30L22 18.5L25 30L16 23L7 30L10 18.5L2 12H12.5L16 2Z" filter="url(#nw-glow-md)"/>
      <path fill="#ffffff" d="M16 6L18 12H22L18.5 15L20 20L16 17L12 20L13.5 15L10 12H14L16 6Z" opacity="0.4"/>
    `,
    'star-outline': `
      <path fill="none" stroke="url(#nw-gold)" stroke-width="2" d="M16 3L19.5 12H29L22 18L25 29L16 22.5L7 29L10 18L3 12H12.5L16 3Z" filter="url(#nw-glow-sm)"/>
    `,
    skull: `
      <ellipse fill="#ffffff" cx="16" cy="13" rx="11" ry="10" filter="url(#nw-glow-sm)"/>
      <ellipse fill="url(#nw-purple)" cx="11" cy="12" rx="3" ry="3.5"/>
      <ellipse fill="url(#nw-purple)" cx="21" cy="12" rx="3" ry="3.5"/>
      <path fill="#0a0a0f" d="M12 18H20L18 22H14L12 18Z"/>
      <rect fill="#ffffff" x="10" y="23" width="3" height="7" rx="1"/>
      <rect fill="#ffffff" x="15" y="23" width="3" height="7" rx="1"/>
      <rect fill="#ffffff" x="20" y="23" width="3" height="7" rx="1"/>
    `,
    ghost: `
      <path fill="#ffffff" d="M16 2C9 2 4 7 4 14V28L7 25L10 28L13 25L16 28L19 25L22 28L25 25L28 28V14C28 7 23 2 16 2Z" filter="url(#nw-glow-sm)"/>
      <ellipse fill="url(#nw-purple)" cx="11" cy="13" rx="3" ry="4"/>
      <ellipse fill="url(#nw-purple)" cx="21" cy="13" rx="3" ry="4"/>
      <ellipse fill="#ffffff" cx="10" cy="12" rx="1" ry="1.5"/>
      <ellipse fill="#ffffff" cx="20" cy="12" rx="1" ry="1.5"/>
      <ellipse fill="url(#nw-purple)" cx="16" cy="20" rx="3" ry="2" opacity="0.5"/>
    `,
    sleep: `
      <circle fill="url(#nw-gold)" cx="16" cy="16" r="13" filter="url(#nw-glow-sm)"/>
      <path fill="#0a0a0f" d="M8 12C8 12 10 10 12 12" stroke="#0a0a0f" stroke-width="2" stroke-linecap="round"/>
      <path fill="#0a0a0f" d="M20 12C20 12 22 10 24 12" stroke="#0a0a0f" stroke-width="2" stroke-linecap="round"/>
      <ellipse fill="#0a0a0f" cx="16" cy="20" rx="4" ry="2"/>
      <text fill="url(#nw-cyan)" x="24" y="10" font-size="8" font-weight="bold">Z</text>
      <text fill="url(#nw-cyan)" x="27" y="6" font-size="5" font-weight="bold">z</text>
    `,
    sloth: `
      <circle fill="#c4a77d" cx="16" cy="16" r="13" filter="url(#nw-glow-sm)"/>
      <circle fill="#ffffff" cx="11" cy="13" r="4"/>
      <circle fill="#ffffff" cx="21" cy="13" r="4"/>
      <circle fill="#0a0a0f" cx="11" cy="14" r="2"/>
      <circle fill="#0a0a0f" cx="21" cy="14" r="2"/>
      <ellipse fill="#5d4e37" cx="16" cy="21" rx="5" ry="3"/>
      <circle fill="#0a0a0f" cx="16" cy="20" r="1"/>
    `,
    dice: `
      <rect fill="url(#nw-purple)" x="3" y="3" width="26" height="26" rx="5" filter="url(#nw-glow-md)"/>
      <circle fill="#ffffff" cx="10" cy="10" r="2.5"/>
      <circle fill="#ffffff" cx="16" cy="16" r="2.5"/>
      <circle fill="#ffffff" cx="22" cy="22" r="2.5"/>
      <circle fill="#ffffff" cx="10" cy="22" r="2.5"/>
      <circle fill="#ffffff" cx="22" cy="10" r="2.5"/>
    `,
    gaming: `
      <rect fill="url(#nw-purple)" x="2" y="8" width="28" height="16" rx="6" filter="url(#nw-glow-md)"/>
      <circle fill="url(#nw-orange)" cx="9" cy="16" r="4"/>
      <circle fill="#0a0a0f" cx="9" cy="16" r="2"/>
      <circle fill="url(#nw-gold)" cx="22" cy="13" r="2"/>
      <circle fill="url(#nw-gold)" cx="22" cy="19" r="2"/>
      <circle fill="url(#nw-gold)" cx="19" cy="16" r="2"/>
      <circle fill="url(#nw-gold)" cx="25" cy="16" r="2"/>
    `,

    // ═══════════════════════════════════════════════════════════════
    // CARDS / DECK
    // ═══════════════════════════════════════════════════════════════
    scroll: `
      <rect fill="#d4a574" x="6" y="4" width="20" height="24" rx="2"/>
      <ellipse fill="url(#nw-gold)" cx="16" cy="4" rx="10" ry="3"/>
      <ellipse fill="url(#nw-gold)" cx="16" cy="28" rx="10" ry="3"/>
      <path fill="url(#nw-orange)" d="M10 10H22M10 14H20M10 18H18M10 22H16" stroke="url(#nw-orange)" stroke-width="2" stroke-linecap="round"/>
    `,
    cards: `
      <rect fill="url(#nw-blue)" x="2" y="6" width="16" height="22" rx="2" transform="rotate(-8 10 17)" filter="url(#nw-glow-sm)"/>
      <rect fill="url(#nw-gold)" x="7" y="4" width="16" height="22" rx="2"/>
      <rect fill="url(#nw-orange)" x="12" y="2" width="16" height="22" rx="2" transform="rotate(8 20 13)"/>
      <path fill="#ffffff" d="M18 8L20 12L22 8L24 12L22 16L20 12L18 16L16 12L18 8Z" opacity="0.8"/>
    `,
    'cards-stack': `
      <rect fill="url(#nw-blue)" x="1" y="8" width="14" height="18" rx="2" transform="rotate(-6 8 17)" filter="url(#nw-glow-sm)"/>
      <rect fill="url(#nw-gold)" x="6" y="6" width="14" height="18" rx="2"/>
      <rect fill="url(#nw-orange)" x="11" y="4" width="14" height="18" rx="2" transform="rotate(6 18 13)"/>
      <circle fill="#ffffff" cx="18" cy="10" r="2" opacity="0.7"/>
    `,

    // ═══════════════════════════════════════════════════════════════
    // MANA / RESOURCES
    // ═══════════════════════════════════════════════════════════════
    diamond: `
      <path fill="url(#nw-cyan)" d="M16 2L4 12L16 30L28 12L16 2Z" filter="url(#nw-glow-md)"/>
      <path fill="#ffffff" d="M16 2L8 12H24L16 2Z" opacity="0.4"/>
      <path fill="url(#nw-blue)" d="M4 12L16 30L16 12H4Z" opacity="0.3"/>
    `,
    crystal: `
      <path fill="url(#nw-purple)" d="M16 2L8 10L16 30L24 10L16 2Z" filter="url(#nw-glow-md)"/>
      <path fill="#ffffff" d="M16 2L10 10H22L16 2Z" opacity="0.5"/>
      <path fill="#c084fc" d="M16 12L16 30L8 10L16 12Z" opacity="0.3"/>
    `,
    coins: `
      <circle fill="url(#nw-gold)" cx="12" cy="20" r="9" filter="url(#nw-glow-sm)"/>
      <circle fill="url(#nw-gold)" cx="20" cy="12" r="9"/>
      <circle fill="#ffffff" cx="20" cy="12" r="4" opacity="0.3"/>
      <text fill="#b8860b" x="20" y="15" font-size="8" font-weight="bold" text-anchor="middle">$</text>
      <text fill="#b8860b" x="12" y="23" font-size="8" font-weight="bold" text-anchor="middle">$</text>
    `,
    energy: `
      <path fill="url(#nw-gold)" d="M18 2L6 18H14L12 30L26 14H18L20 2H18Z" filter="url(#nw-glow-md)"/>
      <path fill="#ffffff" d="M17 4L8 16H14L13 24L22 15H17L18 4Z" opacity="0.4"/>
    `,
    dragon: `
      <path fill="url(#nw-red)" d="M16 2C12 2 8 6 8 10C8 14 10 16 10 18C6 18 4 22 6 26C8 30 14 30 16 28C18 30 24 30 26 26C28 22 26 18 22 18C22 16 24 14 24 10C24 6 20 2 16 2Z" filter="url(#nw-glow-md)"/>
      <circle fill="url(#nw-gold)" cx="12" cy="10" r="2"/>
      <circle fill="url(#nw-gold)" cx="20" cy="10" r="2"/>
      <circle fill="#0a0a0f" cx="12" cy="10" r="1"/>
      <circle fill="#0a0a0f" cx="20" cy="10" r="1"/>
      <path fill="url(#nw-orange)" d="M14 16L16 20L18 16L16 14Z"/>
    `,
    flag: `
      <rect fill="url(#nw-cyan)" x="6" y="4" width="20" height="14" filter="url(#nw-glow-sm)"/>
      <path fill="url(#nw-orange)" d="M6 4L16 11L6 18V4Z"/>
      <rect fill="#888" x="4" y="4" width="2" height="26" rx="1"/>
      <circle fill="url(#nw-gold)" cx="5" cy="4" r="2"/>
    `,
    'arrow-up': `
      <circle fill="url(#nw-green)" cx="16" cy="16" r="13" filter="url(#nw-glow-sm)"/>
      <path fill="#ffffff" d="M16 8L8 18H12V24H20V18H24L16 8Z"/>
    `,
    bag: `
      <path fill="url(#nw-orange)" d="M6 12H26L24 28H8L6 12Z" filter="url(#nw-glow-sm)"/>
      <path fill="none" stroke="url(#nw-gold)" stroke-width="3" d="M10 12C10 6 12 4 16 4C20 4 22 6 22 12"/>
      <circle fill="url(#nw-gold)" cx="16" cy="18" r="3"/>
    `,
    camera: `
      <rect fill="url(#nw-purple)" x="2" y="8" width="28" height="20" rx="3" filter="url(#nw-glow-sm)"/>
      <circle fill="url(#nw-cyan)" cx="16" cy="18" r="7"/>
      <circle fill="#0a0a0f" cx="16" cy="18" r="4"/>
      <circle fill="url(#nw-cyan)" cx="16" cy="18" r="2"/>
      <rect fill="url(#nw-gold)" x="10" y="4" width="12" height="4" rx="1"/>
    `,
    chart: `
      <rect fill="url(#nw-green)" x="4" y="18" width="5" height="10" rx="1" filter="url(#nw-glow-sm)"/>
      <rect fill="url(#nw-cyan)" x="11" y="12" width="5" height="16" rx="1"/>
      <rect fill="url(#nw-orange)" x="18" y="6" width="5" height="22" rx="1"/>
      <rect fill="url(#nw-gold)" x="25" y="2" width="5" height="26" rx="1"/>
    `,
    collection: `
      <rect fill="url(#nw-blue)" x="2" y="4" width="12" height="12" rx="2" filter="url(#nw-glow-sm)"/>
      <rect fill="url(#nw-orange)" x="18" y="4" width="12" height="12" rx="2"/>
      <rect fill="url(#nw-green)" x="2" y="20" width="12" height="12" rx="2"/>
      <rect fill="url(#nw-purple)" x="18" y="20" width="12" height="12" rx="2"/>
      <circle fill="#ffffff" cx="8" cy="10" r="2" opacity="0.5"/>
      <circle fill="#ffffff" cx="24" cy="10" r="2" opacity="0.5"/>
    `,

    // ═══════════════════════════════════════════════════════════════
    // UI ACTIONS
    // ═══════════════════════════════════════════════════════════════
    check: `
      <path fill="none" stroke="url(#nw-green)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="M6 16L13 24L27 8" filter="url(#nw-glow-md)"/>
    `,
    'check-circle': `
      <circle fill="url(#nw-green)" cx="16" cy="16" r="14" filter="url(#nw-glow-md)"/>
      <path fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M9 16L14 21L24 11"/>
    `,
    'x-mark': `
      <path fill="none" stroke="url(#nw-red)" stroke-width="4" stroke-linecap="round" d="M8 8L24 24M8 24L24 8" filter="url(#nw-glow-sm)"/>
    `,
    info: `
      <circle fill="url(#nw-blue)" cx="16" cy="16" r="14" filter="url(#nw-glow-md)"/>
      <circle fill="#ffffff" cx="16" cy="9" r="2"/>
      <rect fill="#ffffff" x="14" y="13" width="4" height="12" rx="1"/>
    `,
    warning: `
      <path fill="url(#nw-gold)" d="M16 2L2 28H30L16 2Z" filter="url(#nw-glow-md)"/>
      <rect fill="#0a0a0f" x="14" y="10" width="4" height="10" rx="1"/>
      <circle fill="#0a0a0f" cx="16" cy="24" r="2"/>
    `,
    settings: `
      <circle fill="url(#nw-cyan)" cx="16" cy="16" r="5" filter="url(#nw-glow-sm)"/>
      <circle fill="none" stroke="url(#nw-cyan)" stroke-width="3" cx="16" cy="16" r="11"/>
      <circle fill="url(#nw-cyan)" cx="16" cy="3" r="3"/>
      <circle fill="url(#nw-cyan)" cx="16" cy="29" r="3"/>
      <circle fill="url(#nw-cyan)" cx="3" cy="16" r="3"/>
      <circle fill="url(#nw-cyan)" cx="29" cy="16" r="3"/>
      <circle fill="url(#nw-cyan)" cx="6" cy="6" r="2.5"/>
      <circle fill="url(#nw-cyan)" cx="26" cy="6" r="2.5"/>
      <circle fill="url(#nw-cyan)" cx="6" cy="26" r="2.5"/>
      <circle fill="url(#nw-cyan)" cx="26" cy="26" r="2.5"/>
    `,
    search: `
      <circle fill="none" stroke="url(#nw-cyan)" stroke-width="3" cx="13" cy="13" r="9" filter="url(#nw-glow-sm)"/>
      <path stroke="url(#nw-cyan)" stroke-width="4" stroke-linecap="round" d="M20 20L28 28"/>
      <circle fill="url(#nw-cyan)" cx="13" cy="13" r="3" opacity="0.3"/>
    `,
    plus: `
      <circle fill="url(#nw-green)" cx="16" cy="16" r="14" filter="url(#nw-glow-sm)"/>
      <path fill="#ffffff" d="M14 8H18V14H24V18H18V24H14V18H8V14H14V8Z"/>
    `,
    minus: `
      <circle fill="url(#nw-red)" cx="16" cy="16" r="14" filter="url(#nw-glow-sm)"/>
      <rect fill="#ffffff" x="8" y="14" width="16" height="4" rx="1"/>
    `,

    // ═══════════════════════════════════════════════════════════════
    // SOCIAL
    // ═══════════════════════════════════════════════════════════════
    heart: `
      <path fill="url(#nw-red)" d="M16 28C16 28 4 20 4 12C4 7 8 4 12 4C14 4 15.5 5 16 6.5C16.5 5 18 4 20 4C24 4 28 7 28 12C28 20 16 28 16 28Z" filter="url(#nw-glow-md)"/>
      <ellipse fill="#ffffff" cx="11" cy="10" rx="3" ry="2" opacity="0.4" transform="rotate(-30 11 10)"/>
    `,
    'heart-outline': `
      <path fill="none" stroke="url(#nw-red)" stroke-width="2.5" d="M16 27C16 27 5 20 5 12C5 7.5 8.5 5 12 5C14 5 15.5 6 16 7.5C16.5 6 18 5 20 5C23.5 5 27 7.5 27 12C27 20 16 27 16 27Z" filter="url(#nw-glow-sm)"/>
    `,
    share: `
      <circle fill="url(#nw-cyan)" cx="24" cy="6" r="5" filter="url(#nw-glow-sm)"/>
      <circle fill="url(#nw-cyan)" cx="8" cy="16" r="5"/>
      <circle fill="url(#nw-cyan)" cx="24" cy="26" r="5"/>
      <path stroke="url(#nw-cyan)" stroke-width="2" d="M12 14L20 8M12 18L20 24"/>
    `,
    users: `
      <circle fill="url(#nw-blue)" cx="11" cy="9" r="6" filter="url(#nw-glow-sm)"/>
      <path fill="url(#nw-blue)" d="M3 28V24C3 20 6 18 11 18C16 18 19 20 19 24V28H3Z"/>
      <circle fill="url(#nw-cyan)" cx="22" cy="9" r="5"/>
      <path fill="url(#nw-cyan)" d="M22 17C26 17 29 19 29 23V28H20V24C20 21 19.5 19 18 17.5C19 17 20 17 22 17Z"/>
    `,
    user: `
      <circle fill="url(#nw-blue)" cx="16" cy="9" r="7" filter="url(#nw-glow-sm)"/>
      <path fill="url(#nw-blue)" d="M4 30V26C4 21 8 18 16 18C24 18 28 21 28 26V30H4Z"/>
      <circle fill="#ffffff" cx="14" cy="8" r="1.5" opacity="0.4"/>
    `,

    // ═══════════════════════════════════════════════════════════════
    // PARTY / FUN
    // ═══════════════════════════════════════════════════════════════
    party: `
      <path fill="url(#nw-gold)" d="M16 2L6 18H10L7 30L25 14H19L23 2H16Z" filter="url(#nw-glow-md)"/>
      <circle fill="url(#nw-orange)" cx="7" cy="7" r="3"/>
      <circle fill="url(#nw-purple)" cx="26" cy="5" r="3"/>
      <circle fill="url(#nw-green)" cx="27" cy="22" r="3"/>
      <circle fill="url(#nw-cyan)" cx="5" cy="24" r="2"/>
    `,
    confetti: `
      <rect fill="url(#nw-orange)" x="4" y="4" width="5" height="5" rx="1" transform="rotate(15 6 6)"/>
      <rect fill="url(#nw-gold)" x="22" y="3" width="5" height="5" rx="1" transform="rotate(-10 24 5)"/>
      <rect fill="url(#nw-purple)" x="13" y="2" width="5" height="5" rx="1" transform="rotate(25 15 4)"/>
      <rect fill="url(#nw-green)" x="3" y="18" width="5" height="5" rx="1" transform="rotate(-20 5 20)"/>
      <rect fill="url(#nw-blue)" x="21" y="16" width="5" height="5" rx="1" transform="rotate(30 23 18)"/>
      <rect fill="url(#nw-red)" x="10" y="22" width="5" height="5" rx="1" transform="rotate(-15 12 24)"/>
      <circle fill="url(#nw-cyan)" cx="18" cy="12" r="2"/>
      <circle fill="url(#nw-gold)" cx="8" cy="14" r="1.5"/>
    `,
    gift: `
      <rect fill="url(#nw-red)" x="4" y="14" width="24" height="16" rx="3" filter="url(#nw-glow-sm)"/>
      <rect fill="url(#nw-gold)" x="4" y="14" width="24" height="6"/>
      <rect fill="url(#nw-gold)" x="13" y="14" width="6" height="16"/>
      <path fill="url(#nw-orange)" d="M16 14C16 14 10 8 7 8C4 8 4 11 6 13C8 14 16 14 16 14Z"/>
      <path fill="url(#nw-orange)" d="M16 14C16 14 22 8 25 8C28 8 28 11 26 13C24 14 16 14 16 14Z"/>
      <circle fill="#ffffff" cx="16" cy="10" r="2" opacity="0.6"/>
    `,
    sparkles: `
      <path fill="url(#nw-gold)" d="M16 2L18 10L26 12L18 14L16 22L14 14L6 12L14 10L16 2Z" filter="url(#nw-glow-md)"/>
      <path fill="url(#nw-gold)" d="M26 18L27 22L30 23L27 24L26 28L25 24L22 23L25 22L26 18Z"/>
      <path fill="url(#nw-gold)" d="M6 18L7 21L9 22L7 23L6 26L5 23L3 22L5 21L6 18Z"/>
    `,

    // ═══════════════════════════════════════════════════════════════
    // MISC
    // ═══════════════════════════════════════════════════════════════
    bell: `
      <path fill="url(#nw-gold)" d="M16 2C10 2 6 6 6 12V18L3 22V24H29V22L26 18V12C26 6 22 2 16 2Z" filter="url(#nw-glow-sm)"/>
      <ellipse fill="url(#nw-orange)" cx="16" cy="28" rx="4" ry="3"/>
      <circle fill="#ffffff" cx="12" cy="10" r="2" opacity="0.4"/>
    `,
    clock: `
      <circle fill="url(#nw-blue)" cx="16" cy="16" r="14" filter="url(#nw-glow-sm)"/>
      <circle fill="#0a0a0f" cx="16" cy="16" r="11"/>
      <path stroke="url(#nw-cyan)" stroke-width="2.5" stroke-linecap="round" d="M16 8V16L21 19"/>
      <circle fill="url(#nw-cyan)" cx="16" cy="16" r="2"/>
    `,
    eye: `
      <ellipse fill="url(#nw-blue)" cx="16" cy="16" rx="14" ry="10" filter="url(#nw-glow-sm)"/>
      <circle fill="#ffffff" cx="16" cy="16" r="6"/>
      <circle fill="url(#nw-cyan)" cx="16" cy="16" r="4"/>
      <circle fill="#0a0a0f" cx="16" cy="16" r="2"/>
      <circle fill="#ffffff" cx="14" cy="14" r="1" opacity="0.8"/>
    `,
    'eye-off': `
      <ellipse fill="url(#nw-blue)" cx="16" cy="16" rx="14" ry="10" opacity="0.3"/>
      <path stroke="url(#nw-red)" stroke-width="3" stroke-linecap="round" d="M4 4L28 28" filter="url(#nw-glow-sm)"/>
    `,
    lock: `
      <rect fill="url(#nw-orange)" x="6" y="14" width="20" height="16" rx="3" filter="url(#nw-glow-sm)"/>
      <path fill="none" stroke="url(#nw-gold)" stroke-width="3" d="M10 14V10C10 6 12.5 4 16 4C19.5 4 22 6 22 10V14"/>
      <circle fill="url(#nw-gold)" cx="16" cy="22" r="3"/>
      <rect fill="url(#nw-gold)" x="14.5" y="22" width="3" height="5" rx="1"/>
    `,
    unlock: `
      <rect fill="url(#nw-green)" x="6" y="14" width="20" height="16" rx="3" filter="url(#nw-glow-sm)"/>
      <path fill="none" stroke="url(#nw-cyan)" stroke-width="3" d="M10 14V10C10 6 12.5 4 16 4C19.5 4 22 6 22 10"/>
      <circle fill="#ffffff" cx="16" cy="22" r="3"/>
    `,
    wallet: `
      <rect fill="url(#nw-green)" x="2" y="8" width="28" height="20" rx="4" filter="url(#nw-glow-sm)"/>
      <rect fill="#16a34a" x="2" y="14" width="28" height="6"/>
      <circle fill="url(#nw-gold)" cx="24" cy="17" r="4"/>
      <circle fill="#fef08a" cx="24" cy="17" r="2"/>
      <path fill="none" stroke="#ffffff" stroke-width="1.5" d="M6 12H14M6 22H12" opacity="0.5"/>
    `,
    globe: `
      <circle fill="url(#nw-blue)" cx="16" cy="16" r="14" filter="url(#nw-glow-sm)"/>
      <ellipse fill="none" stroke="#ffffff" stroke-width="1.5" cx="16" cy="16" rx="6" ry="14" opacity="0.5"/>
      <path fill="none" stroke="#ffffff" stroke-width="1.5" d="M2 16H30M4 9H28M4 23H28" opacity="0.5"/>
      <circle fill="url(#nw-green)" cx="10" cy="12" r="3" opacity="0.7"/>
      <circle fill="url(#nw-green)" cx="22" cy="18" r="4" opacity="0.7"/>
    `,
    rocket: `
      <path fill="url(#nw-cyan)" d="M16 2C16 2 8 8 8 18L11 22L14 18V24L16 30L18 24V18L21 22L24 18C24 8 16 2 16 2Z" filter="url(#nw-glow-md)"/>
      <circle fill="url(#nw-orange)" cx="16" cy="12" r="4"/>
      <circle fill="#ffd700" cx="16" cy="12" r="2"/>
      <path fill="url(#nw-orange)" d="M10 24L8 28L12 26L10 24Z"/>
      <path fill="url(#nw-orange)" d="M22 24L24 28L20 26L22 24Z"/>
    `,
    chat: `
      <path fill="url(#nw-blue)" d="M4 6H28C29.5 6 30 7 30 8V22C30 23 29.5 24 28 24H10L4 30V24C2.5 24 2 23 2 22V8C2 7 2.5 6 4 6Z" filter="url(#nw-glow-sm)"/>
      <circle fill="#ffffff" cx="10" cy="15" r="2" opacity="0.6"/>
      <circle fill="#ffffff" cx="16" cy="15" r="2" opacity="0.6"/>
      <circle fill="#ffffff" cx="22" cy="15" r="2" opacity="0.6"/>
    `,
    copy: `
      <rect fill="url(#nw-blue)" x="10" y="10" width="18" height="20" rx="3" filter="url(#nw-glow-sm)"/>
      <rect fill="none" stroke="url(#nw-cyan)" stroke-width="2" x="4" y="4" width="16" height="20" rx="3"/>
      <path fill="none" stroke="#ffffff" stroke-width="1.5" d="M14 16H24M14 21H22" opacity="0.5"/>
    `,
    download: `
      <circle fill="url(#nw-green)" cx="16" cy="16" r="14" filter="url(#nw-glow-sm)"/>
      <path fill="#ffffff" d="M16 6V18M16 18L10 12M16 18L22 12" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path fill="#ffffff" d="M8 24H24" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    `,
    upload: `
      <circle fill="url(#nw-cyan)" cx="16" cy="16" r="14" filter="url(#nw-glow-sm)"/>
      <path fill="#ffffff" d="M16 20V8M16 8L10 14M16 8L22 14" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path fill="#ffffff" d="M8 24H24" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    `,
    'external-link': `
      <rect fill="url(#nw-blue)" x="4" y="10" width="18" height="18" rx="3" filter="url(#nw-glow-sm)"/>
      <path fill="none" stroke="url(#nw-cyan)" stroke-width="3" stroke-linecap="round" d="M18 4H28V14M28 4L14 18"/>
    `,
    image: `
      <rect fill="url(#nw-purple)" x="3" y="5" width="26" height="22" rx="3" filter="url(#nw-glow-sm)"/>
      <circle fill="url(#nw-gold)" cx="10" cy="12" r="4"/>
      <path fill="url(#nw-green)" d="M3 22L10 15L15 20L21 12L29 22V24C29 26 27 27 25 27H7C5 27 3 26 3 24V22Z"/>
    `,
    music: `
      <path fill="url(#nw-purple)" d="M12 24V8L28 4V20" filter="url(#nw-glow-sm)"/>
      <circle fill="url(#nw-purple)" cx="8" cy="24" r="5"/>
      <circle fill="url(#nw-purple)" cx="24" cy="20" r="5"/>
      <circle fill="#ffffff" cx="8" cy="24" r="2" opacity="0.5"/>
      <circle fill="#ffffff" cx="24" cy="20" r="2" opacity="0.5"/>
    `,
    document: `
      <path fill="url(#nw-blue)" d="M8 2C6 2 4 4 4 6V26C4 28 6 30 8 30H24C26 30 28 28 28 26V10L20 2H8Z" filter="url(#nw-glow-sm)"/>
      <path fill="url(#nw-cyan)" d="M20 2V10H28L20 2Z"/>
      <path fill="none" stroke="#ffffff" stroke-width="2" d="M10 16H22M10 21H18M10 26H20" opacity="0.5"/>
    `,
    book: `
      <path fill="url(#nw-orange)" d="M4 4H14C15 4 16 5 16 6V28C16 28 15 27 14 27H4V4Z" filter="url(#nw-glow-sm)"/>
      <path fill="url(#nw-gold)" d="M28 4H18C17 4 16 5 16 6V28C16 28 17 27 18 27H28V4Z"/>
      <path fill="none" stroke="#ffffff" stroke-width="1" d="M8 9H12M8 13H11M8 17H12M20 9H24M20 13H23M20 17H24" opacity="0.5"/>
    `,
    anchor: `
      <circle fill="url(#nw-blue)" cx="16" cy="7" r="5" filter="url(#nw-glow-sm)"/>
      <path fill="url(#nw-blue)" d="M14 12H18V28H14V12Z"/>
      <path fill="url(#nw-blue)" d="M8 20H24" stroke="url(#nw-blue)" stroke-width="4"/>
      <path fill="url(#nw-cyan)" d="M4 24C8 28 12 30 16 30C20 30 24 28 28 24" stroke="url(#nw-cyan)" stroke-width="3" stroke-linecap="round" fill="none"/>
    `,
    ship: `
      <path fill="url(#nw-blue)" d="M4 24L2 28H30L28 24H4Z" filter="url(#nw-glow-sm)"/>
      <rect fill="url(#nw-orange)" x="8" y="16" width="16" height="8" rx="1"/>
      <path fill="url(#nw-gold)" d="M16 4L10 16H22L16 4Z"/>
      <rect fill="url(#nw-cyan)" x="15" y="8" width="2" height="8"/>
    `,
    question: `
      <circle fill="url(#nw-purple)" cx="16" cy="16" r="14" filter="url(#nw-glow-md)"/>
      <path fill="#ffffff" d="M12 12C12 9 14 8 16 8C18 8 20 9 20 12C20 14 18 15 16 16V18" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <circle fill="#ffffff" cx="16" cy="24" r="2.5"/>
    `,

    // ═══════════════════════════════════════════════════════════════
    // EMOJI FACES
    // ═══════════════════════════════════════════════════════════════
    laugh: `
      <circle fill="url(#nw-gold)" cx="16" cy="16" r="14" filter="url(#nw-glow-sm)"/>
      <path fill="#0a0a0f" d="M8 11C8 11 10 9 12 11" stroke="#0a0a0f" stroke-width="2" stroke-linecap="round"/>
      <path fill="#0a0a0f" d="M20 11C20 11 22 9 24 11" stroke="#0a0a0f" stroke-width="2" stroke-linecap="round"/>
      <path fill="#0a0a0f" d="M8 18C8 18 11 24 16 24C21 24 24 18 24 18Z"/>
      <path fill="#ffffff" d="M10 19H22C22 22 19 23 16 23C13 23 10 22 10 19Z"/>
    `,
    cool: `
      <circle fill="url(#nw-gold)" cx="16" cy="16" r="14" filter="url(#nw-glow-sm)"/>
      <rect fill="#0a0a0f" x="5" y="11" width="10" height="5" rx="2"/>
      <rect fill="#0a0a0f" x="17" y="11" width="10" height="5" rx="2"/>
      <path fill="#0a0a0f" d="M15 13H17" stroke="#0a0a0f" stroke-width="2"/>
      <path fill="#0a0a0f" d="M10 22Q16 26 22 22" stroke="#0a0a0f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    `,
    thinking: `
      <circle fill="url(#nw-gold)" cx="16" cy="16" r="14" filter="url(#nw-glow-sm)"/>
      <circle fill="#0a0a0f" cx="11" cy="13" r="2.5"/>
      <circle fill="#0a0a0f" cx="21" cy="13" r="2.5"/>
      <path fill="none" stroke="#0a0a0f" stroke-width="2.5" stroke-linecap="round" d="M10 21Q16 19 22 21"/>
      <circle fill="url(#nw-cyan)" cx="26" cy="6" r="4" stroke="#0a0a0f" stroke-width="1.5"/>
      <circle fill="url(#nw-cyan)" cx="28" cy="12" r="2"/>
    `,
    angry: `
      <circle fill="url(#nw-red)" cx="16" cy="16" r="14" filter="url(#nw-glow-sm)"/>
      <path fill="#0a0a0f" d="M7 10L13 13" stroke="#0a0a0f" stroke-width="3" stroke-linecap="round"/>
      <path fill="#0a0a0f" d="M25 10L19 13" stroke="#0a0a0f" stroke-width="3" stroke-linecap="round"/>
      <circle fill="#0a0a0f" cx="11" cy="15" r="2"/>
      <circle fill="#0a0a0f" cx="21" cy="15" r="2"/>
      <path fill="#0a0a0f" d="M10 24C13 21 19 21 22 24" stroke="#0a0a0f" stroke-width="3" stroke-linecap="round" fill="none"/>
    `,
    devil: `
      <circle fill="url(#nw-purple)" cx="16" cy="16" r="14" filter="url(#nw-glow-md)"/>
      <path fill="url(#nw-red)" d="M6 4L9 11L4 10L6 4Z"/>
      <path fill="url(#nw-red)" d="M26 4L23 11L28 10L26 4Z"/>
      <circle fill="#0a0a0f" cx="11" cy="15" r="2.5"/>
      <circle fill="#0a0a0f" cx="21" cy="15" r="2.5"/>
      <path fill="#0a0a0f" d="M10 22C13 25 19 25 22 22" stroke="#0a0a0f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    `,
    celebration: `
      <circle fill="url(#nw-gold)" cx="16" cy="16" r="14" filter="url(#nw-glow-md)"/>
      <path fill="#0a0a0f" d="M9 12C9 12 11 10 13 12" stroke="#0a0a0f" stroke-width="2" stroke-linecap="round"/>
      <path fill="#0a0a0f" d="M19 12C19 12 21 10 23 12" stroke="#0a0a0f" stroke-width="2" stroke-linecap="round"/>
      <path fill="#0a0a0f" d="M8 19C8 19 11 25 16 25C21 25 24 19 24 19Z"/>
      <circle fill="url(#nw-orange)" cx="6" cy="6" r="2"/>
      <circle fill="url(#nw-purple)" cx="26" cy="6" r="2"/>
      <circle fill="url(#nw-green)" cx="4" cy="20" r="1.5"/>
      <circle fill="url(#nw-cyan)" cx="28" cy="20" r="1.5"/>
    `,
    grimace: `
      <circle fill="url(#nw-gold)" cx="16" cy="16" r="14" filter="url(#nw-glow-sm)"/>
      <circle fill="#0a0a0f" cx="10" cy="13" r="2"/>
      <circle fill="#0a0a0f" cx="22" cy="13" r="2"/>
      <rect fill="#ffffff" x="7" y="19" width="18" height="6" rx="1" stroke="#0a0a0f" stroke-width="2"/>
      <path fill="#0a0a0f" d="M9 19V25M12 19V25M15 19V25M18 19V25M21 19V25" stroke="#0a0a0f" stroke-width="1"/>
    `,

    // ═══════════════════════════════════════════════════════════════
    // SPECIAL / CHARACTER
    // ═══════════════════════════════════════════════════════════════
    meme: `
      <rect fill="url(#nw-orange)" x="2" y="6" width="28" height="20" rx="3" filter="url(#nw-glow-sm)"/>
      <text fill="#ffffff" x="16" y="20" text-anchor="middle" font-size="10" font-weight="bold">MEME</text>
    `,
    brain: `
      <ellipse fill="url(#nw-purple)" cx="16" cy="16" rx="13" ry="12" filter="url(#nw-glow-md)"/>
      <path fill="none" stroke="#ffffff" stroke-width="2" d="M10 10Q16 6 22 10M8 16Q16 12 24 16M10 22Q16 18 22 22" opacity="0.5"/>
      <circle fill="#c084fc" cx="12" cy="12" r="3" opacity="0.6"/>
      <circle fill="#c084fc" cx="20" cy="12" r="3" opacity="0.6"/>
      <circle fill="#c084fc" cx="16" cy="18" r="3" opacity="0.6"/>
    `,
    defense: `
      <path fill="url(#nw-blue)" d="M16 2L4 7V15C4 22 9 27 16 30C23 27 28 22 28 15V7L16 2Z" filter="url(#nw-glow-md)"/>
      <path fill="#ffffff" d="M16 6L8 9.5V15C8 20 11.5 24 16 26.5C20.5 24 24 20 24 15V9.5L16 6Z" opacity="0.3"/>
      <path fill="url(#nw-cyan)" d="M16 10L12 16L16 22L20 16L16 10Z"/>
    `,
    'crystal-ball': `
      <circle fill="url(#nw-purple)" cx="16" cy="14" r="12" filter="url(#nw-glow-md)"/>
      <ellipse fill="#1e1b4b" cx="16" cy="28" rx="8" ry="3"/>
      <circle fill="#ffffff" cx="12" cy="10" r="3" opacity="0.4"/>
      <path fill="url(#nw-cyan)" d="M10 18C13 21 19 21 22 18" opacity="0.6"/>
      <circle fill="url(#nw-gold)" cx="16" cy="14" r="2"/>
    `,
    inventory: `
      <rect fill="url(#nw-blue)" x="3" y="3" width="26" height="26" rx="4" filter="url(#nw-glow-sm)"/>
      <rect fill="#0a0a0f" x="6" y="6" width="8" height="8" rx="1"/>
      <rect fill="#0a0a0f" x="18" y="6" width="8" height="8" rx="1"/>
      <rect fill="#0a0a0f" x="6" y="18" width="8" height="8" rx="1"/>
      <rect fill="#0a0a0f" x="18" y="18" width="8" height="8" rx="1"/>
      <circle fill="url(#nw-orange)" cx="10" cy="10" r="2.5"/>
      <circle fill="url(#nw-gold)" cx="22" cy="10" r="2.5"/>
      <circle fill="url(#nw-green)" cx="10" cy="22" r="2.5"/>
      <circle fill="url(#nw-purple)" cx="22" cy="22" r="2.5"/>
    `,
    trade: `
      <path fill="url(#nw-green)" d="M4 10L10 4V8H22V14H10V18L4 12V10Z" filter="url(#nw-glow-sm)"/>
      <path fill="url(#nw-orange)" d="M28 22L22 28V24H10V18H22V14L28 20V22Z"/>
    `,
    clipboard: `
      <rect fill="url(#nw-blue)" x="5" y="4" width="22" height="26" rx="3" filter="url(#nw-glow-sm)"/>
      <rect fill="url(#nw-cyan)" x="10" y="2" width="12" height="6" rx="2"/>
      <path fill="none" stroke="#ffffff" stroke-width="2" d="M10 14H22M10 19H20M10 24H16" opacity="0.5"/>
    `,
    circus: `
      <path fill="url(#nw-red)" d="M16 2L6 14H26L16 2Z" filter="url(#nw-glow-sm)"/>
      <rect fill="url(#nw-gold)" x="6" y="14" width="20" height="14" rx="2"/>
      <path fill="#ffffff" d="M16 2L11 14H21L16 2Z" opacity="0.3"/>
      <circle fill="url(#nw-orange)" cx="10" cy="21" r="3"/>
      <circle fill="url(#nw-orange)" cx="22" cy="21" r="3"/>
      <path fill="url(#nw-purple)" d="M16 14V28" stroke="url(#nw-purple)" stroke-width="3"/>
    `,
    detective: `
      <circle fill="#c4a77d" cx="16" cy="16" r="14" filter="url(#nw-glow-sm)"/>
      <ellipse fill="#5d4e37" cx="16" cy="8" rx="12" ry="5"/>
      <circle fill="#ffffff" cx="11" cy="16" r="4" stroke="#0a0a0f" stroke-width="2"/>
      <circle fill="#ffffff" cx="21" cy="16" r="4" stroke="#0a0a0f" stroke-width="2"/>
      <path fill="#0a0a0f" d="M15 16H17" stroke="#0a0a0f" stroke-width="2"/>
      <ellipse fill="#5d4e37" cx="16" cy="24" rx="4" ry="2"/>
    `,
    egg: `
      <ellipse fill="#ffffff" cx="16" cy="17" rx="11" ry="13" stroke="#e5e7eb" stroke-width="2" filter="url(#nw-glow-sm)"/>
      <ellipse fill="url(#nw-gold)" cx="16" cy="14" rx="6" ry="4" opacity="0.3"/>
      <path fill="url(#nw-orange)" d="M12 16Q16 12 20 16" opacity="0.4"/>
    `,
    form: `
      <rect fill="url(#nw-blue)" x="4" y="2" width="24" height="28" rx="3" filter="url(#nw-glow-sm)"/>
      <rect fill="#ffffff" x="8" y="6" width="16" height="3" rx="1" opacity="0.8"/>
      <rect fill="#ffffff" x="8" y="12" width="12" height="2" rx="0.5" opacity="0.5"/>
      <rect fill="#ffffff" x="8" y="17" width="16" height="2" rx="0.5" opacity="0.5"/>
      <rect fill="#ffffff" x="8" y="22" width="10" height="2" rx="0.5" opacity="0.5"/>
    `,
    dress: `
      <path fill="url(#nw-purple)" d="M16 2L10 12H8L4 28H28L24 12H22L16 2Z" filter="url(#nw-glow-sm)"/>
      <rect fill="url(#nw-gold)" x="12" y="10" width="8" height="4" rx="1"/>
      <circle fill="url(#nw-gold)" cx="16" cy="20" r="3"/>
    `,
    'shopping-bag': `
      <path fill="url(#nw-orange)" d="M8 10L5 14V28C5 29 6 30 7 30H25C26 30 27 29 27 28V14L24 10H8Z" filter="url(#nw-glow-sm)"/>
      <path fill="none" stroke="url(#nw-gold)" stroke-width="3" d="M12 14V8C12 5 13.5 3 16 3C18.5 3 20 5 20 8V14"/>
      <circle fill="url(#nw-gold)" cx="16" cy="22" r="4" opacity="0.6"/>
    `
  },

  /**
   * Render an icon as inline SVG
   */
  render(name, options = {}) {
    const iconPath = this.icons[name];
    if (!iconPath) {
      console.warn(`NWIconsInline: Icon "${name}" not found`);
      return '';
    }
    
    const size = options.size || 24;
    const cls = options.class || '';
    const style = options.style || '';
    
    // Include shared defs in each SVG for standalone use
    return `<svg class="nw-icon ${cls}" width="${size}" height="${size}" viewBox="0 0 32 32" style="${style}" aria-hidden="true">${this.sharedDefs}${iconPath}</svg>`;
  },

  /**
   * Emoji to icon mapping
   */
  emojiMap: {
    '': 'fire', '': 'diamond', '': 'star', '': 'star', '': 'sparkles',
    '': 'crown', '': 'trophy', '': 'swords', '': 'sword', '': 'shield',
    '': 'target', '': 'gaming', '': 'dice', '': 'skull', '': 'ghost',
    '': 'heart', '': 'heart', '': 'heart', '': 'heart',
    '': 'bell', '': 'clock', '': 'clock', '': 'eye', '': 'eye',
    '': 'lock', '': 'unlock', '': 'settings', '': 'settings',
    '': 'gift', '': 'party', '': 'confetti', '': 'party',
    '': 'scroll', '': 'document', '': 'clipboard', '🃏': 'cards',
    '': 'home', '': 'home', '': 'rocket', '': 'rocket',
    '': 'search', '': 'search', '': 'plus', '': 'minus',
    '': 'check-circle', '': 'check', '': 'close', '': 'x-mark',
    '': 'warning', 'ℹ': 'info', '': 'question', '': 'question',
    '': 'user', '': 'users', '': 'chat', '': 'chat',
    '': 'image', '': 'image', '': 'music', '': 'music',
    '': 'download', '': 'upload', '': 'copy', '': 'anchor',
    '': 'globe', '': 'globe', '': 'globe', '': 'globe',
    '': 'cool', '': 'thinking', '': 'laugh', '': 'laugh',
    '': 'devil', '': 'devil', '': 'question', '': 'sparkles',
    '': 'sloth', '': 'sleep', '': 'rocket', '': 'sparkles',
    '': 'meme', '': 'shield', '': 'fire', '': 'fire',
    '': 'anchor', '': 'anchor', '': 'anchor', '': 'ship',
    '': 'book', '': 'book', '': 'brain', '': 'inventory',
    '': 'circus', '': 'crystal-ball', '': 'egg', '': 'dress',
    '': 'shopping-bag', '': 'trade', '': 'wallet', '🃏': 'cards-stack',
    '': 'angry', '': 'grimace', '': 'celebration', '': 'detective',
    '': 'form', '': 'defense'
  },

  /**
   * Convert emoji to icon
   */
  fromEmoji(emoji, size = 24) {
    const iconName = this.emojiMap[emoji];
    if (iconName && this.icons[iconName]) {
      return this.render(iconName, { size });
    }
    return emoji;
  },

  /**
   * Replace all emojis in element
   */
  replaceEmojisInElement(element, size = 24) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    
    textNodes.forEach(node => {
      const text = node.textContent;
      let hasEmoji = false;
      
      for (const emoji of Object.keys(this.emojiMap)) {
        if (text.includes(emoji)) {
          hasEmoji = true;
          break;
        }
      }
      
      if (hasEmoji) {
        const span = document.createElement('span');
        let html = text;
        for (const [emoji, iconName] of Object.entries(this.emojiMap)) {
          if (html.includes(emoji) && this.icons[iconName]) {
            html = html.split(emoji).join(this.render(iconName, { size }));
          }
        }
        span.innerHTML = html;
        node.parentNode.replaceChild(span, node);
      }
    });
  },

  /**
   * Initialize - replace all [data-nw-icon] elements
   */
  init() {
    // Inject CSS
    if (!document.getElementById('nw-icons-styles')) {
      const style = document.createElement('style');
      style.id = 'nw-icons-styles';
      style.textContent = `
        .nw-icon {
          display: inline-block;
          vertical-align: middle;
          flex-shrink: 0;
        }
        .nw-icon-sm { width: 16px; height: 16px; }
        .nw-icon-md { width: 24px; height: 24px; }
        .nw-icon-lg { width: 32px; height: 32px; }
        .nw-icon-xl { width: 48px; height: 48px; }
        
        @keyframes nw-icon-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }
        @keyframes nw-icon-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes nw-icon-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        
        .nw-icon-pulse { animation: nw-icon-pulse 2s ease-in-out infinite; }
        .nw-icon-spin { animation: nw-icon-spin 1s linear infinite; }
        .nw-icon-bounce { animation: nw-icon-bounce 1s ease infinite; }
      `;
      document.head.appendChild(style);
    }

    // Replace data-nw-icon elements
    document.querySelectorAll('[data-nw-icon]').forEach(el => {
      const name = el.getAttribute('data-nw-icon');
      const size = el.getAttribute('data-size') || 24;
      
      if (this.icons[name]) {
        el.innerHTML = this.render(name, { size, class: el.className });
        el.className = '';
      }
    });

    // Auto-replace emojis in .nw-auto-icons elements
    document.querySelectorAll('.nw-auto-icons').forEach(el => {
      this.replaceEmojisInElement(el);
    });

    console.log('%c[NW_ICONS] v2.0 Premium Icons Loaded', 
      'background: linear-gradient(90deg, #ff6b00, #ffd700, #00d4ff); color: #000; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
  },

  /**
   * Get all available icon names
   */
  getAll() {
    return Object.keys(this.icons);
  }
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NWIconsInline.init());
} else {
  NWIconsInline.init();
}

// Export
if (typeof window !== 'undefined') {
  window.NWIconsInline = NWIconsInline;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NWIconsInline;
}
