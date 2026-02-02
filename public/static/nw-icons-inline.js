/**
 * NumbahWan Inline Icon System v1.0
 * 
 * RELIABLE inline SVG icons - no external sprite loading issues
 * 
 * Usage:
 * 1. Include: <script src="/static/nw-icons-inline.js"></script>
 * 2. Use: <span data-nw-icon="target"></span>
 * 3. Auto-initializes on DOMContentLoaded
 */

const NWIconsInline = {
  // All icons as inline SVG strings (24x24 viewBox)
  icons: {
    // Navigation
    home: '<path fill="currentColor" d="M3 12L5 10V19C5 19.5 5.5 20 6 20H9V14H15V20H18C18.5 20 19 19.5 19 19V10L21 12L12 3L3 12Z"/><rect fill="currentColor" x="16" y="5" width="2" height="4"/>',
    'arrow-left': '<path fill="currentColor" d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'arrow-right': '<path fill="currentColor" d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    close: '<path fill="currentColor" d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    menu: '<path fill="currentColor" d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    
    // Gaming/TCG
    target: '<circle fill="none" stroke="currentColor" stroke-width="2" cx="12" cy="12" r="9"/><circle fill="none" stroke="currentColor" stroke-width="2" cx="12" cy="12" r="5"/><circle fill="#ff6b00" cx="12" cy="12" r="2"/>',
    crown: '<path fill="#ffd700" d="M4 17L2 7L7 10L12 4L17 10L22 7L20 17H4Z"/><rect fill="#ff6b00" x="4" y="17" width="16" height="3" rx="1"/>',
    sword: '<path fill="#94a3b8" d="M14.5 3L20 8.5L18.5 10L17 8.5L8.5 17L10 18.5L8.5 20L3 14.5L4.5 13L6 14.5L14.5 6L13 4.5L14.5 3Z"/><path fill="#ff6b00" d="M3 21L6 18L5.5 17.5L3 20V21Z"/><path fill="#ffd700" d="M7 17L8.5 15.5L9.5 16.5L8 18L7 17Z"/>',
    swords: '<path fill="#ef4444" d="M6 2L3 5L9 11L6 14L4 12L2 14L5 17L7 15L9 17L12 14L7 9L10 6L15 11L12 14L14 16L17 13L20 16L22 14L19 11L22 8L16 2L13 5L10 2L6 2Z"/><path fill="#ffd700" d="M9 15L7 17L9 19L11 21L13 19L11 17L9 15Z"/>',
    shield: '<path fill="#3b82f6" d="M12 2L4 5V11C4 16 7 20 12 22C17 20 20 16 20 11V5L12 2Z"/><path fill="#fff" d="M12 4L6 6.5V11C6 15 8.5 18.5 12 20C15.5 18.5 18 15 18 11V6.5L12 4Z" opacity="0.3"/>',
    trophy: '<path fill="#ffd700" d="M6 2H18V6C18 10 15 13 12 13C9 13 6 10 6 6V2Z"/><path fill="#ffd700" d="M4 4H6V7C4 7 3 5 4 4ZM18 4H20C21 5 20 7 18 7V4Z"/><rect fill="#ff6b00" x="10" y="13" width="4" height="4"/><path fill="#ffd700" d="M7 17H17V19C17 20 16 21 15 21H9C8 21 7 20 7 19V17Z"/>',
    fire: '<path fill="#ff6b00" d="M12 2C12 2 8 6 8 10C8 12 9 13.5 10 14C9 12 10 10 12 9C14 10 15 12 14 14C15 13.5 16 12 16 10C16 6 12 2 12 2Z"/><path fill="#ffd700" d="M12 22C9 22 7 19 7 16C7 13 10 11 12 9C14 11 17 13 17 16C17 19 15 22 12 22Z"/>',
    star: '<path fill="#ffd700" d="M12 2L14.5 9H22L16 13.5L18 21L12 17L6 21L8 13.5L2 9H9.5L12 2Z"/>',
    'star-outline': '<path fill="none" stroke="currentColor" stroke-width="2" d="M12 2L14.5 9H22L16 13.5L18 21L12 17L6 21L8 13.5L2 9H9.5L12 2Z"/>',
    skull: '<circle fill="#fff" cx="12" cy="10" r="8"/><circle fill="#0a0a0f" cx="9" cy="9" r="2"/><circle fill="#0a0a0f" cx="15" cy="9" r="2"/><path fill="#0a0a0f" d="M10 14H14L13 16H11L10 14Z"/><rect fill="#fff" x="9" y="18" width="2" height="4"/><rect fill="#fff" x="13" y="18" width="2" height="4"/>',
    ghost: '<path fill="#fff" d="M12 2C7 2 3 6 3 11V21C3 21.5 3.5 22 4 21.5L6 19L8 21.5C8.5 22 9.5 22 10 21.5L12 19L14 21.5C14.5 22 15.5 22 16 21.5L18 19L20 21.5C20.5 22 21 21.5 21 21V11C21 6 17 2 12 2Z"/><circle fill="#0a0a0f" cx="9" cy="10" r="2"/><circle fill="#0a0a0f" cx="15" cy="10" r="2"/><ellipse fill="#0a0a0f" cx="12" cy="15" rx="2" ry="1"/>',
    sleep: '<circle fill="#ffd700" cx="12" cy="12" r="10"/><path fill="#000" d="M7 10C7 10 8 8 10 10M14 10C14 10 15 8 17 10"/><path fill="#000" d="M8 15C10 17 14 17 16 15" stroke="#000" stroke-width="1.5" fill="none"/><text fill="#3b82f6" x="16" y="8" font-size="6" font-weight="bold">Z</text><text fill="#3b82f6" x="19" y="5" font-size="4" font-weight="bold">z</text>',
    sloth: '<circle fill="#c4a77d" cx="12" cy="12" r="10"/><circle fill="#fff" cx="9" cy="10" r="3"/><circle fill="#fff" cx="15" cy="10" r="3"/><circle fill="#0a0a0f" cx="9" cy="11" r="1"/><circle fill="#0a0a0f" cx="15" cy="11" r="1"/><ellipse fill="#5d4e37" cx="12" cy="15" rx="3" ry="2"/>',
    
    // Cards/Deck
    scroll: '<path fill="currentColor" d="M5 4C4 4 3 5 3 6V18C3 20 4.5 21 6 21H18C19.5 21 21 20 21 18V6C21 5 20 4 19 4H5Z"/><path fill="#ffd700" d="M6 3C4.5 3 3 4 3 6C3 8 4.5 9 6 9H18C19.5 9 21 8 21 6C21 4 19.5 3 18 3H6Z"/><path fill="#ff6b00" d="M7 12H17M7 15H15M7 18H12" stroke="#ff6b00" stroke-width="1.5" stroke-linecap="round"/>',
    
    // Mana/Resources
    diamond: '<path fill="#3b82f6" d="M12 2L4 9L12 22L20 9L12 2Z"/><path fill="#fff" d="M12 2L8 9H16L12 2Z" opacity="0.3"/>',
    crystal: '<path fill="#a855f7" d="M12 2L6 8L12 22L18 8L12 2Z"/><path fill="#fff" d="M12 2L8 8H16L12 2Z" opacity="0.4"/>',
    
    // UI Actions
    check: '<path fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M5 12L10 17L20 7"/>',
    'check-circle': '<circle fill="#22c55e" cx="12" cy="12" r="10"/><path fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 12L10 15L17 8"/>',
    'x-mark': '<path fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" d="M6 6L18 18M6 18L18 6"/>',
    info: '<circle fill="#3b82f6" cx="12" cy="12" r="10"/><path fill="#fff" d="M12 7V8M12 11V17" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
    warning: '<path fill="#f59e0b" d="M12 2L2 20H22L12 2Z"/><path fill="#000" d="M12 8V14M12 16V18" stroke="#000" stroke-width="2" stroke-linecap="round"/>',
    settings: '<circle fill="none" stroke="currentColor" stroke-width="2" cx="12" cy="12" r="3"/><path fill="none" stroke="currentColor" stroke-width="2" d="M12 1V4M12 20V23M23 12H20M4 12H1M20 4L18 6M6 18L4 20M4 4L6 6M18 18L20 20"/>',
    search: '<circle fill="none" stroke="currentColor" stroke-width="2" cx="10" cy="10" r="7"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M15 15L21 21"/>',
    
    // Social
    heart: '<path fill="#ef4444" d="M12 21C12 21 3 14 3 8.5C3 5 6 3 8.5 3C10 3 11.5 4 12 5C12.5 4 14 3 15.5 3C18 3 21 5 21 8.5C21 14 12 21 12 21Z"/>',
    'heart-outline': '<path fill="none" stroke="currentColor" stroke-width="2" d="M12 21C12 21 3 14 3 8.5C3 5 6 3 8.5 3C10 3 11.5 4 12 5C12.5 4 14 3 15.5 3C18 3 21 5 21 8.5C21 14 12 21 12 21Z"/>',
    share: '<circle fill="currentColor" cx="18" cy="5" r="3"/><circle fill="currentColor" cx="6" cy="12" r="3"/><circle fill="currentColor" cx="18" cy="19" r="3"/><path fill="none" stroke="currentColor" stroke-width="2" d="M8.5 10.5L15.5 6.5M8.5 13.5L15.5 17.5"/>',
    users: '<circle fill="currentColor" cx="9" cy="7" r="4"/><path fill="currentColor" d="M3 21V18C3 15.5 6 14 9 14C12 14 15 15.5 15 18V21H3Z"/><circle fill="currentColor" cx="17" cy="7" r="3"/><path fill="currentColor" d="M17 14C19 14 21 15.5 21 18V21H16V18C16 16.5 15.5 15 14.5 14C15.3 14 16.1 14 17 14Z"/>',
    user: '<circle fill="currentColor" cx="12" cy="7" r="4"/><path fill="currentColor" d="M4 21V18C4 15.5 7 14 12 14C17 14 20 15.5 20 18V21H4Z"/>',
    
    // Party/Fun
    party: '<path fill="#ffd700" d="M12 2L4 14H8L6 22L18 10H13L16 2H12Z"/><circle fill="#ff6b00" cx="6" cy="6" r="2"/><circle fill="#a855f7" cx="18" cy="4" r="2"/><circle fill="#22c55e" cx="19" cy="16" r="2"/>',
    confetti: '<rect fill="#ff6b00" x="3" y="3" width="3" height="3" transform="rotate(15 4 4)"/><rect fill="#ffd700" x="18" y="2" width="3" height="3" transform="rotate(-10 19 3)"/><rect fill="#a855f7" x="10" y="1" width="3" height="3" transform="rotate(25 11 2)"/><rect fill="#22c55e" x="2" y="14" width="3" height="3" transform="rotate(-20 3 15)"/><rect fill="#3b82f6" x="17" y="12" width="3" height="3" transform="rotate(30 18 13)"/><rect fill="#ec4899" x="8" y="18" width="3" height="3" transform="rotate(-15 9 19)"/>',
    gift: '<rect fill="#ff6b00" x="3" y="10" width="18" height="12" rx="2"/><rect fill="#ffd700" x="3" y="10" width="18" height="4"/><rect fill="#ffd700" x="10" y="10" width="4" height="12"/><path fill="#ff6b00" d="M12 10C12 10 8 6 6 6C4 6 4 8 5 9C6 10 12 10 12 10Z"/><path fill="#ff6b00" d="M12 10C12 10 16 6 18 6C20 6 20 8 19 9C18 10 12 10 12 10Z"/>',
    
    // Misc
    bell: '<path fill="currentColor" d="M12 2C8 2 5 5 5 9V14L3 16V17H21V16L19 14V9C19 5 16 2 12 2Z"/><path fill="currentColor" d="M9 18C9 20 10.5 21 12 21C13.5 21 15 20 15 18H9Z"/>',
    clock: '<circle fill="none" stroke="currentColor" stroke-width="2" cx="12" cy="12" r="10"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 6V12L16 14"/>',
    eye: '<path fill="currentColor" d="M12 4C5 4 1 12 1 12C1 12 5 20 12 20C19 20 23 12 23 12C23 12 19 4 12 4Z"/><circle fill="#fff" cx="12" cy="12" r="4"/><circle fill="currentColor" cx="12" cy="12" r="2"/>',
    'eye-off': '<path fill="currentColor" d="M12 4C5 4 1 12 1 12C1 12 5 20 12 20C19 20 23 12 23 12C23 12 19 4 12 4Z" opacity="0.3"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M3 3L21 21"/>',
    lock: '<rect fill="currentColor" x="5" y="10" width="14" height="12" rx="2"/><path fill="none" stroke="currentColor" stroke-width="2" d="M8 10V7C8 4.5 9.5 3 12 3C14.5 3 16 4.5 16 7V10"/><circle fill="#ffd700" cx="12" cy="15" r="2"/>',
    unlock: '<rect fill="currentColor" x="5" y="10" width="14" height="12" rx="2"/><path fill="none" stroke="currentColor" stroke-width="2" d="M8 10V7C8 4.5 9.5 3 12 3C14.5 3 16 4.5 16 7"/><circle fill="#22c55e" cx="12" cy="15" r="2"/>',
    
    // Gaming specific
    dice: '<rect fill="currentColor" x="3" y="3" width="18" height="18" rx="3"/><circle fill="#fff" cx="8" cy="8" r="1.5"/><circle fill="#fff" cx="12" cy="12" r="1.5"/><circle fill="#fff" cx="16" cy="16" r="1.5"/><circle fill="#fff" cx="8" cy="16" r="1.5"/><circle fill="#fff" cx="16" cy="8" r="1.5"/>',
    gaming: '<rect fill="currentColor" x="2" y="6" width="20" height="12" rx="4"/><circle fill="#ff6b00" cx="7" cy="12" r="3"/><circle fill="#ffd700" cx="17" cy="10" r="1.5"/><circle fill="#ffd700" cx="17" cy="14" r="1.5"/><circle fill="#ffd700" cx="15" cy="12" r="1.5"/><circle fill="#ffd700" cx="19" cy="12" r="1.5"/>',
    
    // Emoji faces
    laugh: '<circle fill="#ffd700" cx="12" cy="12" r="10"/><path fill="#000" d="M7 9C7 8 8 7 9 8C10 7 11 8 11 9M13 9C13 8 14 7 15 8C16 7 17 8 17 9"/><path fill="#000" d="M6 13C6 13 8 18 12 18C16 18 18 13 18 13Z"/>',
    cool: '<circle fill="#ffd700" cx="12" cy="12" r="10"/><rect fill="#000" x="5" y="8" width="6" height="3" rx="1"/><rect fill="#000" x="13" y="8" width="6" height="3" rx="1"/><path fill="#000" d="M8 16Q12 19 16 16" stroke="#000" stroke-width="1.5" fill="none"/>',
    thinking: '<circle fill="#ffd700" cx="12" cy="12" r="10"/><circle fill="#000" cx="9" cy="10" r="1.5"/><circle fill="#000" cx="15" cy="10" r="1.5"/><path fill="none" stroke="#000" stroke-width="1.5" d="M9 15C10 14 14 14 15 15"/><circle fill="#ffd700" cx="18" cy="6" r="2" stroke="#000" stroke-width="1"/>',
    
    // Defense for guide
    defense: '<path fill="#3b82f6" d="M12 2L4 5V11C4 16 7 20 12 22C17 20 20 16 20 11V5L12 2Z"/><path fill="#fff" d="M12 6L8 8V11C8 14 9.5 16.5 12 18C14.5 16.5 16 14 16 11V8L12 6Z"/>',
    
    // Meme
    meme: '<rect fill="#ffd700" x="2" y="4" width="20" height="16" rx="2"/><text fill="#000" x="12" y="14" text-anchor="middle" font-size="8" font-weight="bold">MEME</text>',
    
    // External link
    'external-link': '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M10 4H4V20H20V14M14 4H20V10M20 4L10 14"/>',
    
    // Copy
    copy: '<rect fill="none" stroke="currentColor" stroke-width="2" x="8" y="8" width="12" height="14" rx="2"/><path fill="none" stroke="currentColor" stroke-width="2" d="M16 8V6C16 4.9 15.1 4 14 4H6C4.9 4 4 4.9 4 6V16C4 17.1 4.9 18 6 18H8"/>',
    
    // Download
    download: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 3V15M12 15L7 10M12 15L17 10M4 21H20"/>',
    
    // Upload  
    upload: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 15V3M12 3L7 8M12 3L17 8M4 21H20"/>',
    
    // Plus/Minus
    plus: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5V19M5 12H19"/>',
    minus: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M5 12H19"/>',
    
    // Wallet & Shopping (for FAB)
    wallet: '<rect fill="#22c55e" x="2" y="6" width="20" height="14" rx="2"/><path fill="#16a34a" d="M2 10H22V14H2V10Z"/><circle fill="#ffd700" cx="17" cy="12" r="2"/><path fill="none" stroke="#fff" stroke-width="1" d="M5 9H10M5 15H8" opacity="0.5"/>',
    'cards-stack': '<rect fill="#3b82f6" x="1" y="6" width="14" height="16" rx="2" transform="rotate(-5 8 14)"/><rect fill="#ffd700" x="5" y="4" width="14" height="16" rx="2" transform="rotate(0 12 12)"/><rect fill="#ff6b00" x="9" y="2" width="14" height="16" rx="2" transform="rotate(5 16 10)"/><path fill="#fff" d="M14 6L16 10L18 6L20 10L18 14L16 10L14 14L12 10L14 6Z" opacity="0.6"/>',
    inventory: '<rect fill="currentColor" x="3" y="3" width="18" height="18" rx="2"/><path fill="#fff" d="M7 7H11V11H7V7ZM13 7H17V11H13V7ZM7 13H11V17H7V13ZM13 13H17V17H13V13Z" opacity="0.3"/><circle fill="#ff6b00" cx="9" cy="9" r="1.5"/><circle fill="#ffd700" cx="15" cy="9" r="1.5"/><circle fill="#22c55e" cx="9" cy="15" r="1.5"/><circle fill="#3b82f6" cx="15" cy="15" r="1.5"/>',
    'shopping-bag': '<path fill="currentColor" d="M6 6L4 9V20C4 21 5 22 6 22H18C19 22 20 21 20 20V9L18 6H6Z"/><path fill="none" stroke="#fff" stroke-width="2" d="M9 10V6C9 4 10 2 12 2C14 2 15 4 15 6V10" opacity="0.5"/>',
    trade: '<path fill="#22c55e" d="M4 8L8 4V7H16V11H8V14L4 10V8Z"/><path fill="#ff6b00" d="M20 16L16 20V17H8V13H16V10L20 14V16Z"/>',
    clipboard: '<rect fill="currentColor" x="5" y="3" width="14" height="18" rx="2"/><rect fill="#fff" x="8" y="1" width="8" height="4" rx="1"/><path fill="none" stroke="#fff" stroke-width="1.5" d="M8 10H16M8 14H14M8 18H12" opacity="0.5"/>',
    'crystal-ball': '<circle fill="#a855f7" cx="12" cy="11" r="8"/><ellipse fill="#6b21a8" cx="12" cy="20" rx="6" ry="2"/><circle fill="#fff" cx="9" cy="8" r="2" opacity="0.4"/><path fill="#c084fc" d="M8 14C10 16 14 16 16 14" opacity="0.5"/>',
    
    // Chat
    chat: '<path fill="currentColor" d="M4 4H20C21 4 22 5 22 6V16C22 17 21 18 20 18H8L4 22V18H4C3 18 2 17 2 16V6C2 5 3 4 4 4Z"/>',
    
    // Globe
    globe: '<circle fill="none" stroke="currentColor" stroke-width="2" cx="12" cy="12" r="10"/><ellipse fill="none" stroke="currentColor" stroke-width="2" cx="12" cy="12" rx="4" ry="10"/><path fill="none" stroke="currentColor" stroke-width="2" d="M2 12H22"/>',
    
    // Rocket
    rocket: '<path fill="currentColor" d="M12 2C12 2 6 6 6 14L8 16L10 14V18L12 22L14 18V14L16 16L18 14C18 6 12 2 12 2Z"/><circle fill="#ff6b00" cx="12" cy="10" r="2"/>',

    // Sparkles
    sparkles: '<path fill="#ffd700" d="M12 2L13 8L19 9L13 10L12 16L11 10L5 9L11 8L12 2Z"/><path fill="#ffd700" d="M19 14L19.5 17L22 17.5L19.5 18L19 21L18.5 18L16 17.5L18.5 17L19 14Z"/><path fill="#ffd700" d="M5 14L5.5 16L7 16.5L5.5 17L5 19L4.5 17L3 16.5L4.5 16L5 14Z"/>',
    
    // Image
    image: '<rect fill="none" stroke="currentColor" stroke-width="2" x="3" y="3" width="18" height="18" rx="2"/><circle fill="currentColor" cx="8" cy="8" r="2"/><path fill="currentColor" d="M21 15L16 10L11 15L8 12L3 17V19C3 20 4 21 5 21H19C20 21 21 20 21 19V15Z"/>',
    cards: '<rect fill="#3b82f6" x="2" y="4" width="12" height="16" rx="2"/><rect fill="#ffd700" x="6" y="2" width="12" height="16" rx="2"/><rect fill="#ff6b00" x="10" y="0" width="12" height="16" rx="2"/><path fill="#fff" d="M14 4L16 8L18 4L20 8L18 12L16 8L14 12L12 8L14 4Z" opacity="0.8"/>',
    gallery: '<rect fill="#a855f7" x="1" y="5" width="9" height="7" rx="1"/><rect fill="#3b82f6" x="1" y="14" width="9" height="7" rx="1"/><rect fill="#ff6b00" x="12" y="3" width="11" height="18" rx="2"/><circle fill="#ffd700" cx="17" cy="9" r="2"/><path fill="#22c55e" d="M12 15L15 12L18 15L20 13L23 16V19C23 20 22 21 21 21H13C12 21 12 20 12 19V15Z"/>',
    
    // Music
    music: '<path fill="currentColor" d="M9 18V6L21 3V15"/><circle fill="currentColor" cx="6" cy="18" r="3"/><circle fill="currentColor" cx="18" cy="15" r="3"/>',
    
    // Document
    document: '<path fill="currentColor" d="M6 2C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2H6Z"/><path fill="#fff" d="M14 2V8H20L14 2Z" opacity="0.3"/><path fill="none" stroke="#fff" stroke-width="1.5" d="M8 12H16M8 16H14"/>',
    
    // Anchor
    anchor: '<circle fill="none" stroke="currentColor" stroke-width="2" cx="12" cy="5" r="3"/><path fill="none" stroke="currentColor" stroke-width="2" d="M12 8V21M5 12H12M12 12H19M5 18C7 20 10 21 12 21C14 21 17 20 19 18"/>',
    
    // Ship
    ship: '<path fill="currentColor" d="M4 18L2 21H22L20 18H4Z"/><path fill="currentColor" d="M6 18V12H18V18H6Z"/><path fill="currentColor" d="M12 4L8 12H16L12 4Z"/>',
    
    // Book/Guide
    book: '<path fill="currentColor" d="M4 19V5C4 3.9 4.9 3 6 3H18C19.1 3 20 3.9 20 5V19C20 20.1 19.1 21 18 21H6C4.9 21 4 20.1 4 19Z"/><path fill="#fff" d="M12 3V21" stroke="#fff" stroke-width="2"/><path fill="none" stroke="#fff" stroke-width="1" d="M7 7H10M7 10H10M7 13H10"/>',
    
    // Question
    question: '<circle fill="#3b82f6" cx="12" cy="12" r="10"/><path fill="#fff" d="M12 17V17.5M12 14C12 14 14 13 14 11C14 9 13 8 12 8C11 8 10 9 10 10" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
    
    // Additional icons for HTML pages
    angry: '<circle fill="#ef4444" cx="12" cy="12" r="10"/><path fill="#000" d="M7 8L10 10M14 10L17 8"/><circle fill="#000" cx="9" cy="11" r="1.5"/><circle fill="#000" cx="15" cy="11" r="1.5"/><path fill="#000" d="M8 17C10 15 14 15 16 17" stroke="#000" stroke-width="2"/>',
    brain: '<path fill="#ec4899" d="M12 2C8 2 5 5 5 9C4 9 3 10 3 12C3 14 4 15 5 15C5 19 8 22 12 22C16 22 19 19 19 15C20 15 21 14 21 12C21 10 20 9 19 9C19 5 16 2 12 2Z"/><path fill="#fff" d="M8 8C9 7 11 7 12 8C13 7 15 7 16 8M8 12H16M10 16H14" stroke="#fff" stroke-width="1.5" opacity="0.5"/>',
    celebration: '<path fill="#ffd700" d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z"/><circle fill="#ff6b00" cx="5" cy="5" r="2"/><circle fill="#a855f7" cx="19" cy="5" r="2"/><circle fill="#22c55e" cx="5" cy="19" r="2"/><circle fill="#3b82f6" cx="19" cy="19" r="2"/>',
    'chevron-down': '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 9L12 15L18 9"/>',
    circus: '<path fill="#a855f7" d="M12 2L4 10H20L12 2Z"/><rect fill="#ff6b00" x="4" y="10" width="16" height="10" rx="2"/><circle fill="#ffd700" cx="8" cy="15" r="2"/><circle fill="#ffd700" cx="16" cy="15" r="2"/><path fill="#fff" d="M12 10V20" stroke="#fff" stroke-width="2"/>',
    detective: '<circle fill="#c4a77d" cx="12" cy="12" r="10"/><ellipse fill="#5d4e37" cx="12" cy="6" rx="8" ry="4"/><circle fill="#fff" cx="9" cy="12" r="3" stroke="#000" stroke-width="2"/><circle fill="#fff" cx="15" cy="12" r="3" stroke="#000" stroke-width="2"/><path fill="#000" d="M11 12H13"/>',
    devil: '<circle fill="#a855f7" cx="12" cy="12" r="10"/><path fill="#ff6b00" d="M6 4L8 8L4 8L6 4ZM18 4L20 8L16 8L18 4Z"/><circle fill="#000" cx="9" cy="11" r="1.5"/><circle fill="#000" cx="15" cy="11" r="1.5"/><path fill="#000" d="M8 16C10 18 14 18 16 16" stroke="#000" stroke-width="1.5"/>',
    dress: '<path fill="#ec4899" d="M12 2L8 8H6L4 20H20L18 8H16L12 2Z"/><path fill="#fff" d="M10 8H14V10H10V8Z"/><circle fill="#ffd700" cx="12" cy="14" r="2"/>',
    egg: '<ellipse fill="#fff" cx="12" cy="13" rx="8" ry="10" stroke="#e5e7eb" stroke-width="2"/><path fill="#ffd700" d="M8 12C9 10 11 10 12 12C13 10 15 10 16 12" opacity="0.5"/>',
    form: '<rect fill="currentColor" x="4" y="2" width="16" height="20" rx="2"/><path fill="#fff" d="M8 6H16M8 10H14M8 14H16M8 18H12" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',
    grimace: '<circle fill="#ffd700" cx="12" cy="12" r="10"/><circle fill="#000" cx="8" cy="10" r="1.5"/><circle fill="#000" cx="16" cy="10" r="1.5"/><rect fill="#fff" x="6" y="14" width="12" height="4" rx="1" stroke="#000" stroke-width="1"/><path fill="#000" d="M8 14V18M10 14V18M12 14V18M14 14V18M16 14V18" stroke="#000" stroke-width="0.5"/>'
  },

  /**
   * Render an icon as inline SVG
   * @param {string} name - Icon name
   * @param {object} options - {size, class, style, color}
   * @returns {string} SVG HTML string
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
    const color = options.color || 'currentColor';
    
    return `<svg class="nw-icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" style="${style}" aria-hidden="true">${iconPath}</svg>`;
  },

  /**
   * Emoji to icon mapping
   */
  emojiMap: {
    '🔥': 'fire', '◆': 'diamond', '⭐': 'star', '🌟': 'star', '✨': 'sparkles',
    '👑': 'crown', '🏆': 'trophy', '⚔️': 'swords', '🗡️': 'sword', '🛡️': 'shield',
    '🎯': 'target', '🎮': 'gaming', '🎲': 'dice', '💀': 'skull', '👻': 'ghost',
    '❤️': 'heart', '💖': 'heart', '🧡': 'heart', '💛': 'heart',
    '🔔': 'bell', '⏰': 'clock', '🕐': 'clock', '👁️': 'eye', '👀': 'eye',
    '🔒': 'lock', '🔓': 'unlock', '⬡': 'settings', '🔧': 'settings',
    '🎁': 'gift', '🎉': 'party', '🎊': 'confetti', '🥳': 'party',
    '📜': 'scroll', '📄': 'document', '📋': 'document', '🃏': 'scroll',
    '🏠': 'home', '🏡': 'home', '🚀': 'rocket', '✈️': 'rocket',
    '🔍': 'search', '🔎': 'search', '➕': 'plus', '➖': 'minus',
    '✅': 'check', '✓': 'check', '❌': 'close', '✖️': 'close',
    '⚠️': 'warning', 'ℹ️': 'info', '❓': 'question', '❔': 'question',
    '👤': 'user', '👥': 'users', '💬': 'chat', '🗨️': 'chat',
    '📷': 'image', '🖼️': 'image', '🎵': 'music', '🎶': 'music',
    '📥': 'download', '📤': 'upload', '📎': 'copy', '🔗': 'anchor',
    '🌐': 'globe', '🌍': 'globe', '🌎': 'globe', '🌏': 'globe',
    '😎': 'cool', '🤔': 'thinking', '😂': 'laugh', '🤣': 'laugh',
    '😈': 'skull', '👿': 'skull', '🤷': 'question', '💅': 'sparkles',
    '🦥': 'sloth', '😴': 'sleep', '🏃': 'rocket', '💡': 'sparkles',
    '🎭': 'meme', '🏰': 'shield', '⚡': 'fire', '💥': 'fire',
    '🐙': 'anchor', '🦑': 'anchor', '⚓': 'anchor', '🚢': 'ship',
    '📖': 'book', '📚': 'book'
  },

  /**
   * Replace emoji with SVG icon
   */
  fromEmoji(emoji, size = 20) {
    const iconName = this.emojiMap[emoji];
    if (iconName && this.icons[iconName]) {
      return this.render(iconName, { size });
    }
    return emoji; // Return original if no mapping
  },

  /**
   * Initialize - replace all [data-nw-icon] elements with inline SVGs
   * Also auto-replace emojis in elements with class "nw-auto-icons"
   * And convert external sprite references to inline SVGs
   */
  init() {
    // Replace data-nw-icon elements
    document.querySelectorAll('[data-nw-icon]').forEach(el => {
      const name = el.getAttribute('data-nw-icon');
      const size = el.getAttribute('data-size') || 24;
      const color = el.getAttribute('data-color') || 'currentColor';
      
      if (this.icons[name]) {
        el.innerHTML = this.render(name, { size, color, class: el.className });
        el.className = ''; // Clear class as it's now on the SVG
      }
    });

    // Auto-replace emojis in .nw-auto-icons elements
    document.querySelectorAll('.nw-auto-icons').forEach(el => {
      this.replaceEmojisInElement(el);
    });
    
    // NOTE: Auto sprite conversion disabled - causes layout issues
    // Use data-nw-icon="name" instead for reliable inline icons
  },

  /**
   * Replace all emojis in an element's text with SVG icons
   */
  replaceEmojisInElement(element, size = 20) {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{200D}]/gu;
    
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
  }
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NWIconsInline.init());
} else {
  NWIconsInline.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NWIconsInline;
}
