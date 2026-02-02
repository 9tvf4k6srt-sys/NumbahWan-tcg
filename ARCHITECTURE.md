# NumbahWan TCG - System Architecture

> **For Senior Engineers & Interviewers**: This document explains the architecture decisions, module system, and how to extend the codebase.

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Module Architecture](#module-architecture)
3. [Data Flow](#data-flow)
4. [State Management](#state-management)
5. [API Design](#api-design)
6. [File Structure](#file-structure)
7. [Extension Guide](#extension-guide)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ forge   │ │ battle  │ │ wallet  │ │ market  │ │  ...    │  HTML Pages   │
│  │ .html   │ │ .html   │ │ .html   │ │ .html   │ │ (+60)   │               │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘               │
└───────┼──────────┼──────────┼──────────┼──────────┼─────────────────────────┘
        │          │          │          │          │
┌───────┴──────────┴──────────┴──────────┴──────────┴─────────────────────────┐
│                           MODULE LAYER                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     NW_BOOT (Initialization)                          │   │
│  │  Loads modules in correct order, handles dependencies                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  NW_CONFIG  │ │  NW_WALLET  │ │   NW_USER   │ │  NW_CARDS   │  Core     │
│  │  (Config)   │ │  (Currency) │ │  (Identity) │ │  (Card DB)  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  NW_FORGE   │ │  NW_BATTLE  │ │  NW_ARCADE  │ │ NW_UPGRADE  │  Game     │
│  │  (Gacha)    │ │  (Combat)   │ │  (Mini)     │ │  (Stars)    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   NW_NAV    │ │  NW_GUIDE   │ │  NW_SOUNDS  │ │   NW_FX     │  UI/UX    │
│  │  (Nav Bar)  │ │  (AI Chat)  │ │  (Audio)    │ │  (Effects)  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
└──────────────────────────────────────────────────────────────────────────────┘
        │
┌───────┴──────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       localStorage                                     │  │
│  │  nw_wallet_v2    nw_user_v1    nw_card_upgrades    nw_achievements   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       JSON Data Files                                  │  │
│  │  /static/data/cards-v2.json    /static/data/seasons.json              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
        │
┌───────┴──────────────────────────────────────────────────────────────────────┐
│                           API LAYER (Hono)                                   │
│  /api/health    /api/cards    /api/wallet    /api/market    /api/debug      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Architecture

### Module Dependency Graph

```
                    ┌──────────────┐
                    │  NW_CONFIG   │  ← Central configuration
                    │  (no deps)   │
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  NW_SOUNDS   │  │  NW_CARDS    │  │  NW_ECONOMY  │
  │  (no deps)   │  │  (no deps)   │  │  (no deps)   │
  └──────────────┘  └──────┬───────┘  └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  NW_WALLET   │  ← Currency & Collection
                    │  deps: none  │
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │   NW_USER    │  │  NW_UPGRADE  │  │   NW_NAV     │
  │ deps: WALLET │  │ deps: WALLET │  │ deps: SOUNDS │
  └──────────────┘  └──────────────┘  └──────────────┘
         │
         ▼
  ┌──────────────┐
  │  NW_FORGE    │
  │ deps: WALLET │
  │       USER   │
  │       CARDS  │
  └──────────────┘
```

### Module Categories

| Category | Modules | Purpose |
|----------|---------|---------|
| **Core** | NW_CONFIG, NW_WALLET, NW_USER, NW_CARDS | Essential game state |
| **Game** | NW_FORGE, NW_BATTLE, NW_ARCADE, NW_UPGRADE | Game mechanics |
| **UI/UX** | NW_NAV, NW_GUIDE, NW_FX, NW_SOUNDS, NW_JUICE | User experience |
| **Helpers** | NW_CORE, NW_ANIM, NW_AUDIO, NW_UI | Shared utilities |

---

## Data Flow

### Card Pull Flow (Gacha System)
```
User clicks "Pull" → NW_FORGE.pull()
       │
       ▼
┌─────────────────────────────────┐
│ 1. Check currency (NW_WALLET)   │
│ 2. Spend currency               │
│ 3. Calculate rarity (pity)      │
│ 4. Select random card           │
│ 5. Add to collection            │
│ 6. Update stats                 │
│ 7. Trigger animation (NW_FX)    │
│ 8. Play sound (NW_SOUNDS)       │
└─────────────────────────────────┘
       │
       ▼
Dispatch 'nw-card-pulled' event
       │
       ▼
Other modules react (achievements, UI updates)
```

### State Synchronization
```
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT-DRIVEN ARCHITECTURE                     │
│                                                                  │
│  ┌──────────┐    'nw-wallet-ready'    ┌──────────┐              │
│  │ NW_WALLET│ ─────────────────────▶  │ NW_FORGE │              │
│  └──────────┘                         └──────────┘              │
│                                                                  │
│  ┌──────────┐    'nw-currency-change' ┌──────────┐              │
│  │ NW_WALLET│ ─────────────────────▶  │   UI     │              │
│  └──────────┘                         └──────────┘              │
│                                                                  │
│  ┌──────────┐    'nw-card-upgraded'   ┌──────────┐              │
│  │NW_UPGRADE│ ─────────────────────▶  │COLLECTION│              │
│  └──────────┘                         └──────────┘              │
│                                                                  │
│  ┌──────────┐    'nw-lang-change'     ┌──────────┐              │
│  │  NW_NAV  │ ─────────────────────▶  │ ALL UIs  │              │
│  └──────────┘                         └──────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Management

### localStorage Keys (Standardized)
```javascript
// Namespace: nw_ prefix for all keys
const STORAGE_KEYS = {
  // User Data
  USER:           'nw_user_v1',        // Unified user profile
  DEVICE:         'nw_device_uuid',    // Device fingerprint
  
  // Wallet & Currency
  WALLET:         'nw_wallet_v2',      // Currency & collection
  WALLET_BACKUP:  'nw_wallet_backup',  // Auto-backup
  WALLET_LOG:     'nw_wallet_log',     // Transaction history
  
  // Game State
  CARD_UPGRADES:  'nw_card_upgrades',  // Star levels
  ACHIEVEMENTS:   'nw_achievements',    // Achievement progress
  DAILY_REWARDS:  'nw_daily_rewards',  // Daily login
  
  // Settings
  LANG:           'nw_lang',           // Language preference
  SOUND:          'nw_sound_settings', // Audio settings
  GM_MODE:        'nw_gm_mode',        // Developer mode
  
  // Cache
  CARDS_CACHE:    'nw_cards_cache',    // Card data cache
  CARDS_VERSION:  'nw_cards_version',  // Cache version
};
```

### State Consistency Rules
1. **Single Writer**: Each key has ONE module that writes to it
2. **Event Dispatch**: Changes trigger events for other modules
3. **Backup Strategy**: Critical data has auto-backup
4. **Version Migration**: Data includes version for future migrations

---

## API Design

### RESTful Endpoints
```
GET  /api/health              → { status, timestamp }
GET  /api/cards               → { cards: [...] }
GET  /api/cards/:id           → { card: {...} }
POST /api/cards/pull          → { card: {...}, newBalance: {...} }
GET  /api/wallet/:deviceUUID  → { wallet: {...} }
POST /api/wallet/transaction  → { success, newBalance }
GET  /api/market/listings     → { listings: [...] }
POST /api/market/buy          → { success, listing }
```

### Error Handling Pattern
```javascript
// All API responses follow this structure
{
  success: boolean,
  data?: any,
  error?: {
    code: string,      // 'INSUFFICIENT_FUNDS', 'NOT_FOUND', etc.
    message: string,   // Human-readable message
    details?: any      // Debug info (dev mode only)
  }
}
```

---

## File Structure

```
webapp/
├── src/
│   ├── index.tsx              # Hono API routes
│   └── data/                  # Server-side JSON
│       ├── roster.json
│       └── translations.json
│
├── public/
│   ├── *.html                 # 66 HTML pages
│   └── static/
│       ├── nw-boot.js         # ★ NEW: Module loader
│       ├── nw-config.js       # Central configuration
│       ├── nw-wallet.js       # Currency system
│       ├── nw-user.js         # Identity system
│       ├── nw-cards.js        # Card database
│       ├── nw-forge-engine.js # Gacha system
│       ├── nw-battle-engine.js# Combat system
│       ├── nw-arcade-engine.js# Mini-games
│       ├── nw-card-upgrade.js # Star system
│       ├── nw-nav.js          # Navigation
│       ├── nw-guide.js        # AI assistant
│       ├── nw-sounds.js       # Audio
│       ├── nw-game-juice.js   # Effects
│       ├── nw-premium-fx.js   # Premium effects
│       ├── nw-economy.js      # Economy rules
│       ├── nw-balancer.js     # Auto-balance
│       ├── helpers/           # Shared utilities
│       │   ├── nw-core.js
│       │   ├── nw-anim.js
│       │   ├── nw-audio.js
│       │   └── nw-ui.js
│       ├── data/              # Static JSON
│       │   ├── cards-v2.json
│       │   └── seasons.json
│       ├── images/            # Assets
│       └── icons/             # SVG icons
│
├── docs/
│   ├── UI-STANDARDS.md        # UI guidelines
│   └── API-REFERENCE.md       # API docs
│
├── ARCHITECTURE.md            # This file
├── .ai-context.md             # AI assistant context
└── README.md                  # Quick start
```

---

## Extension Guide

### Adding a New Module

1. **Create the module file**:
```javascript
// public/static/nw-mymodule.js
const NW_MYMODULE = {
    VERSION: '1.0.0',
    STORAGE_KEY: 'nw_mymodule',
    
    // Dependencies check
    _checkDeps() {
        if (typeof NW_WALLET === 'undefined') {
            console.warn('[NW_MYMODULE] Waiting for NW_WALLET...');
            return false;
        }
        return true;
    },
    
    init() {
        if (!this._checkDeps()) {
            window.addEventListener('nw-wallet-ready', () => this.init());
            return;
        }
        console.log('[NW_MYMODULE] v' + this.VERSION + ' Initialized');
    },
    
    // Public API
    doSomething() {
        // Implementation
    }
};

window.NW_MYMODULE = NW_MYMODULE;
document.addEventListener('DOMContentLoaded', () => NW_MYMODULE.init());
```

2. **Register in NW_BOOT** (when implemented)
3. **Add to relevant HTML pages**
4. **Document in this file**

### Adding a New Page

1. Create `public/mypage.html`
2. Include required scripts (use standard template)
3. Initialize with `NW_NAV.init('mypage')`
4. Add translations to i18n
5. Add to NW_CONFIG pages

### Adding New Currency/Resource

1. Add to `NW_ECONOMY.currencies`
2. Update `NW_WALLET` with getter/setter
3. Update `NW_CONFIG` economy section
4. Add UI in relevant pages

---

## Performance Considerations

### Lazy Loading
- Heavy modules (NW_FORGE, NW_BATTLE) loaded only on relevant pages
- Card images use lazy loading with intersection observer
- Sounds preloaded on first user interaction

### Caching Strategy
- Card data cached in localStorage with version check
- Images cached via service worker (future)
- API responses cached for 5 minutes (configurable)

### Bundle Size
- No framework overhead (vanilla JS)
- CSS via Tailwind CDN (lazy loaded)
- Icons as inline SVG (no icon font)
- Total JS: ~80KB gzipped

---

## Security Notes

### Client-Side Limitations
- All client-side data can be manipulated
- GM mode is for development only
- Server validates all purchases (when implemented)

### Input Validation
- All user inputs sanitized
- No `eval()` or `innerHTML` with user data
- CORS properly configured

---

## Future Roadmap

1. **Server-Side Validation**: Move currency/purchase validation to API
2. **D1 Database**: Replace JSON files with Cloudflare D1
3. **Real-Time Features**: WebSocket for live battles/chat
4. **Service Worker**: Offline support
5. **Analytics**: Event tracking for gameplay data

---

*Last updated: 2026-02-02 | Version: 2.1.0*
