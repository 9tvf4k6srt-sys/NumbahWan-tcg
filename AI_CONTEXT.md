# NumbahWan TCG - AI Context File
> **READ THIS FIRST** - Single source of truth for the entire project

## Quick Reference

### Project Path
```
/home/user/webapp/
```

### Start/Restart Server
```bash
cd /home/user/webapp && npm run build && pm2 restart numbahwan-guild --silent
```

### Test URL
```
https://3000-i8pqrv0s1id0a05f7rae2-583b4d74.sandbox.novita.ai
```

---

## Project Overview

**NumbahWan TCG** - A browser-based trading card game with gacha mechanics, deck building, and battles.

| Aspect | Details |
|--------|---------|
| Stack | Hono + Vite + Cloudflare Pages |
| Frontend | Vanilla JS + Tailwind CDN |
| Data | JSON files (no database yet) |
| Storage | localStorage for user data |
| Deploy | Cloudflare Pages via Wrangler |

---

## File Structure (What Goes Where)

```
/home/user/webapp/
├── public/                    # ALL HTML PAGES HERE
│   ├── index.html            # Guild hub homepage
│   ├── cards.html            # Card carousel browser (seasons)
│   ├── forge.html            # Gacha pack opening
│   ├── battle.html           # AI battle gameplay
│   ├── collection.html       # User's card collection
│   ├── deckbuilder.html      # Deck building
│   ├── pvp.html              # Arena/PvP logs
│   ├── guide.html            # How to play
│   ├── arcade.html           # Mini games
│   ├── fortune.html          # Daily fortune
│   ├── market.html           # Shop/trading
│   ├── regina.html           # Guild master lore
│   └── static/               # ALL STATIC ASSETS
│       ├── data/             # JSON data files
│       │   ├── cards-v2.json    # Season 1 cards (108)
│       │   ├── cards-s2.json    # Season 2 cards (108)
│       │   └── seasons.json     # Season metadata
│       ├── images/cards/     # Card artwork
│       │   └── thumbs/       # WebP thumbnails
│       ├── audio/            # Sound effects
│       ├── icons/            # SVG icons
│       └── [JS FILES]        # See below
├── src/
│   └── index.tsx             # Hono API routes
└── dist/                     # Build output (don't edit)
```

---

## Core JS Libraries (Load Order Matters!)

### 1. Foundation (load first)
| File | Purpose |
|------|---------|
| `nw-essentials.js` | Base utilities, polyfills |
| `nw-wallet.js` | User wallet, balances, GM mode |
| `nw-cards.js` | Card data loader (NW_CARDS) |

### 2. UI & Effects
| File | Purpose |
|------|---------|
| `nw-nav.js` | Unified hamburger navigation |
| `nw-game-juice.js` | NW_JUICE, NW_ANIM, NW_UI, NW_AUDIO |
| `nw-card-renderer.js` | Card rendering utilities |
| `nw-3d-engine.js` | 3D card effects |

### 3. Helpers (in /helpers/)
| File | Purpose |
|------|---------|
| `nw-core.js` | Core utilities |
| `nw-ui.js` | UI components |
| `nw-anim.js` | Animations |
| `nw-audio.js` | Audio system |
| `nw-state.js` | State management |
| `nw-battle.js` | Battle logic |

---

## Key Global Objects

```javascript
// Card System
NW_CARDS.init()           // Load cards
NW_CARDS.getAll()         // Get all cards array
NW_CARDS.getByRarity(r)   // Filter by rarity

// Wallet System  
NW_WALLET.getBalance(currency)  // 'wood', 'gold', 'gems'
NW_WALLET.spend(currency, amt)
NW_WALLET.earn(currency, amt)
NW_WALLET.isGM()          // Check GM mode
NW_WALLET.getCollection() // User's owned cards

// UI/Effects
NW_JUICE.haptic(type)     // Vibration feedback
NW_ANIM.pop(el)           // Pop animation
NW_UI.toast(msg)          // Show toast
NW_AUDIO.play(sound)      // Play sound
```

---

## Card Data Structure

```javascript
// In cards-v2.json / cards-s2.json
{
  "id": "s1-001",
  "name": "RegginA, The Eternal Flame",
  "rarity": "mythic",  // mythic|legendary|epic|rare|uncommon|common
  "category": "member", // member|moment|gear|vibe|spot
  "role": "Guild Master",
  "img": "01-reggina-mythic.webp",  // or "s2/filename.webp" for S2
  "description": "...",
  "gameStats": {
    "cost": 10,
    "atk": 12,
    "hp": 100,
    "spd": 8
  },
  "abilities": ["LEADERSHIP", "FLAME_AURA"]
}
```

---

## Season System

| Season | File | Theme | Cards | Status |
|--------|------|-------|-------|--------|
| 1 | cards-v2.json | Origins (Guild founding) | 108 | Active |
| 2 | cards-s2.json | Hounds of War (Dogs) | 108 | Active (placeholder art) |
| 3 | - | Cyber Siege | - | Coming Soon |

**Season 2 Dog Leaders:** Harlay (Alpha), Bork, Snoot, Chompers, Patches, Zoom, Tank, Whiskers, Shadow, Floof, Fang, Puddles, Rex

**Season 2 Mechanics:** PACK, HOWL, LOYALTY, FETCH, GUARD

---

## Gacha/Forge System

### Rates
| Rarity | Base Rate | Soft Pity | Hard Pity |
|--------|-----------|-----------|-----------|
| Mythic | 0.01% | 150 | 200 |
| Legendary | 1.0% | 50 | 80 |
| Epic | 8.0% | 15 | 25 |
| Rare | 20.0% | - | - |
| Uncommon | 30.0% | - | - |
| Common | 40.99% | - | - |

### Currency
- **Sacred Logs (wood)** - Pull currency
- **Gold** - Shop currency
- **Gems** - Premium currency

---

## Navigation Structure

```
☰ Menu (nw-nav.js)
├── ⚔️ PLAY
│   ├── Battle (/battle)
│   ├── Arena (/pvp)
│   ├── Arcade (/arcade)
│   └── Fortune (/fortune)
├── 🎴 COLLECT
│   ├── Forge (/forge)
│   ├── Cards (/cards)
│   ├── Collection (/collection)
│   └── Decks (/deckbuilder)
└── 🏰 GUILD
    ├── Hub (/)
    ├── RegginA (/regina)
    ├── Guide (/guide)
    └── Market (/market)
```

---

## Common Patterns

### Adding Nav to a Page
```html
<script src="/static/nw-nav.js"></script>
<style>.nw-nav-toggle { top: 10px; left: 10px; z-index: 200; }</style>
</head>
<body data-page-id="PAGE_ID_HERE">
```

### Loading Cards
```javascript
await NW_CARDS.init();
const cards = NW_CARDS.getAll();
```

### Wallet Check
```javascript
if (typeof NW_WALLET !== 'undefined' && NW_WALLET.isReady()) {
    const balance = NW_WALLET.getBalance('wood');
}
```

### Season-Aware Image Loading
```javascript
// Season 2 images use s2/ prefix but don't exist yet
// getThumbUrl() handles fallback to S1 placeholder
const url = getThumbUrl(card.img, card.rarity);
```

---

## Known Issues / TODOs

### Active Issues
- [ ] Season 2 card images need real artwork (currently placeholder)
- [ ] GitHub push needs `setup_github_environment` first

### Completed Recently
- [x] Season switching in cards.html
- [x] iPhone touch events for season tabs
- [x] Unified navigation system
- [x] Card progression (duplicates = XP)

---

## Commands Cheatsheet

```bash
# Build & restart
cd /home/user/webapp && npm run build && pm2 restart numbahwan-guild --silent

# Check logs
pm2 logs numbahwan-guild --nostream

# Kill port if stuck
fuser -k 3000/tcp 2>/dev/null || true

# Git commit
cd /home/user/webapp && git add -A && git commit -m "message"

# GitHub (run setup first!)
# Call setup_github_environment tool, then:
git push origin main
```

---

## CSS Tokens (in nw-tokens.css)

```css
--nw-orange: #ff6b00;
--nw-gold: #ffd700;
--nw-purple: #a855f7;
--nw-blue: #3b82f6;
--nw-green: #22c55e;
--nw-red: #ef4444;
--nw-dark: #0a0a0f;

--nw-mythic: #ff6b00;
--nw-legendary: #fbbf24;
--nw-epic: #a855f7;
--nw-rare: #3b82f6;
--nw-uncommon: #22c55e;
--nw-common: #71717a;
```

---

## Page-Specific Notes

### cards.html (Card Browser)
- Season tabs: Origins / Hounds / Soon
- `switchSeason(n)` loads new data and re-renders
- `cards` array must be updated from `DATA` after load
- Touch events: `onDown()` ignores UI elements

### forge.html (Gacha)
- Set selector for pulling from different seasons
- Pity system tracked in `forgeState`
- GM mode gives infinite currency

### battle.html (Combat)
- Loads deck from localStorage or creates random
- `Audio` object handles all sounds
- `gameState` tracks HP, board, hand, deck

---

## Anti-Fumble Checklist

Before editing any file:
1. ✅ Check this context for the right file location
2. ✅ Use `grep` to find exact function/variable names
3. ✅ Read 50+ lines around the target code
4. ✅ Check if function exists before calling it
5. ✅ After edit: build → restart → test

---

*Last updated: 2026-01-31*
*Cards: 216 total (108 S1 + 108 S2)*
*Pages: 24 HTML files*
