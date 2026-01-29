# NumbahWan Guild Website

> "We are not just a guild, but FAMILY"

## Project Overview
- **Name**: NumbahWan Guild
- **Game**: MapleStory Idle RPG (TW Server)
- **Tech Stack**: Hono.js + Cloudflare Pages + TailwindCSS + GSAP + NW Visual Library
- **Last Updated**: January 29, 2026 (v2.4)

## Live URLs
- **Sandbox**: https://3000-i8pqrv0s1id0a05f7rae2-583b4d74.sandbox.novita.ai
- **Production**: Not yet deployed (run `npm run deploy`)

---

## 🃏 Card System Architecture (v2.4)

### Single Source of Truth
All card data flows from **ONE** master file:

```
cards-v2.json (108 cards)
       ↓
   NW_CARDS.js (loader)
       ↓
┌──────┴──────┐
│             │
cards.html  forge.html  tcg.html  (consumers)
```

### Data Files
| File | Path | Purpose |
|------|------|---------|
| `cards-v2.json` | `/static/data/cards-v2.json` | Master card database (108 cards) |
| `NW_CARDS.js` | `/static/nw-cards.js` | Card data loader module |
| `CARD-SYSTEM.md` | `/CARD-SYSTEM.md` | Quick reference for AI |
| `AI-HANDOFF.md` | `/AI-HANDOFF.md` | Detailed handoff document |

### Image Assets
| Type | Path | Size | Format |
|------|------|------|--------|
| **Thumbnails** | `/static/images/cards/thumbs/` | 2.6 MB | WebP 320x448 |
| **Full Resolution** | `/static/images/cards/` | 141 MB | PNG/JPG |

### Card Manager CLI
```bash
# View stats
./scripts/card-manager.sh stats

# Verify all cards have images
./scripts/card-manager.sh verify

# Generate missing thumbnails
./scripts/card-manager.sh thumbs

# List cards by rarity
./scripts/card-manager.sh list

# Add new card image with auto-thumbnail
./scripts/card-manager.sh add mycard.png
```

### npm Scripts for Cards
```bash
npm run cards:stats    # Show card stats
npm run cards:verify   # Check for missing images
npm run cards:thumbs   # Generate thumbnails
```

### Adding a New Card
1. Edit `public/static/data/cards-v2.json`
2. Add image to `public/static/images/cards/`
3. Run `./scripts/card-manager.sh thumbs`
4. Run `npm run build`
5. All pages auto-update!

---

## ✅ Completed Features

### Core Pages
| Page | Path | Description |
|------|------|-------------|
| Main | `/` | Hero, roster, CP race, gallery, about, nav menu |
| 💰 Wallet | `/wallet` | Currency vault, daily login, card staking, marketplace |
| 🔥 Mythic Forge | `/forge` | Gacha system with multi-tier pity |
| 🏪 FREE MARKET | `/market` | Trade cards with live chat! |
| 🃏 Card Gallery | `/cards` | **108 cards** carousel with 3D tilt modal |
| 🎴 TCG Hub | `/tcg` | Card collection overview & stats |
| PvP Diary | `/pvp` | RegginA's arena battles, GM1 flex |
| Fashion | `/fashion` | 12 Disasters costume showcase |
| Merch | `/merch` | Guild merchandise store |
| Fortune | `/fortune` | Daily fortune teller |
| Apply | `/apply` | Recruitment form |
| Memes | `/memes` | Guild memes gallery |
| Regina | `/regina` | Regina hotel parody |
| Arcade | `/arcade` | Mini-games to earn currency |

### 🃏 Card Gallery (v2.4)
- **108 Cards** loaded from single JSON source
- **6 Rarity Tiers**: Mythic, Legendary, Epic, Rare, Uncommon, Common
- **Compressed Thumbnails**: 98% size reduction (141MB → 2.6MB WebP)
- **3D Tilt Modal**: Full resolution on card view
- **Rarity Filters**: Filter by any rarity
- **Swipe Navigation**: Touch-friendly carousel
- **Trilingual**: EN/中文/ไทย

### 💰 Wallet System
- **5 Currencies**: Diamond, Gold, Iron, Black Jade, Sacred Logs
- **Physical Credit Card UI** - Premium animated design
- **Daily Login Streak** - 7-day rewards with free Sacred Log on day 7
- **Card Staking** - Earn passive income from staked cards
- **Free Market Integration** - Buy/sell cards from wallet
- **Transaction Logging** - Full history
- **Export/Import** - Backup your wallet
- **GM Mode** - For testing with infinite resources

### 🏪 FREE MARKET
- **Live Trading** - Buy/sell cards with guild mates
- **Live Chat** - Real-time chat with online users
- **Rarity Filters** - Filter by Mythic/Legendary/Epic/Rare
- **Price Sorting** - Sort by newest, price, rarity
- **Online Counter** - See who's online
- **Deal Badges** - Highlights good deals
- **Purchase Animations** - Satisfying success overlays

### 🔥 Mythic Forge (Gacha)
- **Multi-tier Pity System**:
  - Mythic: Soft pity at 150, hard pity at 200 (0.01% base rate)
  - Legendary: Soft pity at 50, hard pity at 80 (1% base rate)
  - Epic: Soft pity at 15, hard pity at 25 (8% base rate)
- **108 Cards** across 6 rarities (synced from cards-v2.json)
- **Card reveal animations** with screen shake effects
- **Trilingual** - EN/中文/ไทย

### Visual Features
- **NW Visual Library** - Custom effects: glow, tilt, reveal, confetti, particles
- **Trilingual** - EN/中文/ไทย toggle on all pages
- **Local BGM** - Kerning City MP3 (main page only, 1.4MB)
- **Instant Loader** - Fast loading screen with aurora animation
- **Click Juice** - Satisfying click feedback effects
- **Custom Cursor** - N emblem cursor

---

## File Structure

```
webapp/
├── src/index.tsx           # Main Hono app (API routes + Market APIs)
├── public/
│   ├── index.html          # Main page
│   ├── wallet.html         # Wallet system
│   ├── forge.html          # Gacha system (uses NW_CARDS)
│   ├── cards.html          # Card Gallery (uses NW_CARDS)
│   ├── market.html         # FREE MARKET with Live Chat
│   ├── tcg.html            # Card collection hub
│   ├── *.html              # Other pages
│   └── static/
│       ├── data/
│       │   └── cards-v2.json   # ⭐ MASTER CARD DATA (108 cards)
│       ├── images/
│       │   └── cards/
│       │       ├── *.png/jpg   # Full resolution (141 MB)
│       │       └── thumbs/     # WebP thumbnails (2.6 MB)
│       ├── nw-cards.js         # Card data loader
│       ├── nw-wallet.js        # Wallet core logic
│       └── nw-*.css/js         # NW Visual Library
├── scripts/
│   └── card-manager.sh     # Card management CLI
├── migrations/             # D1 database schema
├── seed.sql                # Test data
├── CARD-SYSTEM.md          # Card system quick reference
├── AI-HANDOFF.md           # AI handoff document
├── package.json
├── wrangler.jsonc
└── ecosystem.config.cjs    # PM2 config
```

---

## Quick Commands

```bash
# Development
npm install              # Install deps
npm run build            # Build
pm2 start ecosystem.config.cjs  # Start dev
pm2 restart numbahwan-guild     # Restart
npm run deploy           # Deploy to Cloudflare

# Card Management
npm run cards:stats      # View card statistics
npm run cards:verify     # Check for missing images
npm run cards:thumbs     # Generate thumbnails
./scripts/card-manager.sh add image.png  # Add new card image
```

---

## GM Mode

Activate GM mode for infinite resources:
1. Visit `/wallet`
2. Open browser console
3. Run: `NW_WALLET.activateGM("numbahwan-gm-2026")`

---

## API Reference

### Guild Data APIs
- `GET /api/roster` - Guild member roster
- `GET /api/photos` - Guild gallery photos
- `GET /api/i18n` - Translations (EN/ZH/TH)
- `GET /api/performance` - CP tracking data

### D1 Database APIs
- `GET /api/db/members` - All members (D1 or JSON fallback)
- `GET /api/db/members/:name` - Single member
- `POST /api/db/members` - Add member
- `PUT /api/db/members/:name` - Update member

### Market APIs
- `GET /api/market/listings` - All card listings
- `POST /api/market/buy` - Purchase a listing
- `POST /api/market/list` - Create new listing
- `GET /api/market/chat` - Chat messages (with ?since=timestamp)
- `POST /api/market/chat` - Send chat message
- `POST /api/market/heartbeat` - Register online presence

### Card Data API
- `GET /static/data/cards-v2.json` - Master card database

---

## Recent Changes (v2.4)

| Version | Changes |
|---------|---------|
| v2.4 | Unified card system - single source of truth |
| v2.3 | Added WebP thumbnails (98% size reduction) |
| v2.2 | Fixed card gallery to load 108 cards dynamically |
| v2.1 | Updated all card image paths to consolidated location |
| v2.0 | Generated 96+ card artworks |

---

*Made with ❤️ by NumbahWan family*
