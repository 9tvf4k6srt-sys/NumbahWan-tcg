# NumbahWan TCG

> "We are not just a guild, but FAMILY"

A browser-based trading card game featuring gacha mechanics, deck building, and battles. Built for the NumbahWan guild (MapleStory Idle RPG - TW Server).

## Quick Start

```bash
# Install
npm install

# Build & Run
npm run build
pm2 start ecosystem.config.cjs

# Open
http://localhost:3000
```

## Links

| Resource | URL |
|----------|-----|
| **Sandbox** | https://3000-i8pqrv0s1id0a05f7rae2-583b4d74.sandbox.novita.ai |
| **GitHub** | https://github.com/9tvf4k6srt-sys/NumbahWan-tcg |
| **Production** | Pending deployment |

## Features

### Core Game
- **Gacha System** - Pack opening with multi-tier pity
- **110+ Cards** - 6 rarities across multiple seasons
- **Card Upgrade System** - Star levels (1-5★), duplicates increase stats
- **Card Burning** - Convert duplicates to Sacred Logs currency
- **Battle System** - AI card battles with star-boosted stats
- **Deck Builder** - Custom deck construction
- **Wallet** - Currency & inventory management
- **Market** - Card trading between players

### Guild Features
- **Academy** - Parry Hotter School of Coding Wizardry
- **Guild Vault** - B13 underground vault with legendary misprint card
- **Wyckoff Method** - Trading education with interactive price cycles
- **Research Archives** - Academic publications division
- **Historical Society** - Guild heritage archives

### Sister Guilds
- **MatchaLatte** (Aquila-22) - Living Guild HQ pixel exploration site

## i18n Status

**Trilingual support: EN / 繁體中文 / ไทย**

| Metric | Count |
|--------|-------|
| Total HTML pages | 61 |
| Pages with i18n | 29 |
| Unique translation keys | 1,196 |
| Pages missing translations | 0 ✅ |

### i18n Architecture
- Each page has inline `translations` object with `en`, `zh`, `th` keys
- Language stored in `localStorage` as `nw_lang`
- NW_NAV dispatches `nw-lang-change` event on language switch
- Pages listen and call `applyTranslations(lang)`

### Audit Tool
```bash
node scripts/audit-i18n.cjs  # Scan all pages for translation coverage
```

## Tech Stack

- **Backend**: Hono + Cloudflare Pages
- **Frontend**: Vanilla JS + Tailwind CDN
- **Build**: Vite
- **Deploy**: Cloudflare Workers
- **Process Manager**: PM2

## Project Structure

```
webapp/
├── src/index.tsx         # API routes + static page routing
├── public/               # HTML pages & static assets
│   ├── *.html            # 61 page files
│   └── static/           # JS, CSS, images, data
│       ├── nw-nav.js     # Unified navigation with i18n
│       ├── nw-wallet.js  # Currency & inventory
│       ├── nw-sounds.js  # Audio system
│       └── nw-config.js  # Global configuration
├── scripts/              # Build & audit tools
│   ├── audit-i18n.cjs    # Translation coverage scanner
│   └── inject-i18n.cjs   # Bulk translation injection
├── docs/                 # Archived documentation
├── .ai-context.md        # AI ASSISTANT: READ THIS FILE
└── README.md             # This file
```

## Navigation Structure

```
Core           - Home, Open Packs, Battle, Wallet
Collection     - All Cards, My Cards, Deck Builder
Economy        - Arcade, Card Market, Merch Shop, Exchange
Business       - Business Hub, Supermarket, Restaurant, Services, My Shop
Guild Life     - Tournament, PVP Diary, SS Regina, Fashion, Memes
Government     - Immigration, Securities, Buy NWG, Markets, Treasury, Court, Intelligence
Absurd Wing    - Therapy, HR, Conspiracy, Cafeteria, Lost & Found, Parking, Maintenance, Break Room, Basement, Zakum Lore
Resources      - Game Guide, Academy, Wyckoff Method, Vault, Museum, Historical Society, Research, Fortune, Patch Notes, Join Guild, About
Sister Guilds  - MatchaLatte (Aquila-22)
```

## Development Learnings

### Mobile-First Design
- Use `100dvh` instead of `100vh` for proper mobile viewport
- Floor indicators at bottom center for thumb reach
- Reduce animations/particles on mobile for performance
- Hide verbose descriptions, show only icons + short titles
- Test scroll-snap on iOS (overflow issues)

### i18n Best Practices
- Store translations inline per page (not centralized) for simplicity
- Use `data-i18n` attributes for static text
- Listen to `nw-lang-change` event for reactive updates
- Always include English fallback
- Run audit script before deploy to catch missing keys

### Performance
- Fewer stars/particles on mobile (25 vs 40+)
- Lazy load heavy components
- Use CSS animations over JS where possible
- Image-loaded class pattern for hero backgrounds

### Sister Guild Integration
- Add new nav section in `nw-nav.js` sections object
- Create landing page in parent guild with links
- Standalone site on separate port for independence
- Share branding elements (pixel art, color schemes)

## Commands

```bash
npm run build              # Build for production
npm run dev                # Development mode (Vite)
npm run dev:sandbox        # Development with wrangler pages dev
pm2 start ecosystem.config.cjs  # Start server
pm2 restart all            # Restart server
pm2 logs --nostream        # Check logs
node scripts/audit-i18n.cjs    # Run i18n audit
```

## For AI Assistants

**Read `.ai-context.md` first!** It contains:
- Complete API reference
- Module dependency graph
- Global object documentation
- Common patterns & fixes
- Development workflow

## GM Mode (Testing)

```javascript
// In browser console
NW_WALLET.activateGM("numbahwan-gm-2026")
```

---

*Made with love by the NumbahWan family*
