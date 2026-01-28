# NumbahWan Guild Website

> "We are not just a guild, but FAMILY"

## Project Overview
- **Name**: NumbahWan Guild
- **Game**: MapleStory Idle RPG (TW Server)
- **Tech Stack**: Hono.js + Cloudflare Pages + TailwindCSS + GSAP + NW Visual Library
- **Last Updated**: January 28, 2026

## Live URLs
- **Sandbox**: https://3000-i8pqrv0s1id0a05f7rae2-583b4d74.sandbox.novita.ai
- **Production**: Not yet deployed (run `npm run deploy`)

---

## ✅ Completed Features

### Core Pages
| Page | Path | Description |
|------|------|-------------|
| Main | `/` | Hero, roster, CP race, gallery, about, nav menu |
| 💰 Wallet | `/wallet` | Currency vault, daily login, card staking, marketplace |
| 🔥 Mythic Forge | `/forge` | Gacha system with multi-tier pity |
| 🏪 FREE MARKET | `/market` | Trade cards with live chat! |
| 🃏 TCG Hub | `/tcg` | Card collection viewer |
| PvP Diary | `/pvp` | RegginA's arena battles, GM1 flex |
| Fashion | `/fashion` | 12 Disasters costume showcase |
| Merch | `/merch` | Guild merchandise store |
| Fortune | `/fortune` | Daily fortune teller |
| Apply | `/apply` | Recruitment form |
| Memes | `/memes` | Guild memes gallery |
| Regina | `/regina` | Regina hotel parody |
| Arcade | `/arcade` | Mini-games to earn currency |

### 💰 Wallet System
- **5 Currencies**: Diamond, Gold, Iron, Black Jade, Sacred Logs
- **Physical Credit Card UI** - Premium animated design
- **Daily Login Streak** - 7-day rewards with free Sacred Log on day 7
- **Card Staking** - Earn passive income from staked cards
- **Free Market Integration** - Buy/sell cards from wallet
- **Transaction Logging** - Full history
- **Export/Import** - Backup your wallet
- **GM Mode** - For testing with infinite resources

### 🏪 FREE MARKET (NEW!)
- **Live Trading** - Buy/sell cards with guild mates
- **Live Chat** - Real-time chat with online users
- **Rarity Filters** - Filter by Mythic/Legendary/Epic/Rare
- **Price Sorting** - Sort by newest, price, rarity
- **Online Counter** - See who's online
- **Deal Badges** - Highlights good deals
- **Purchase Animations** - Satisfying success overlays
- **API Endpoints**:
  - `GET /api/market/listings` - View all listings
  - `POST /api/market/buy` - Purchase cards
  - `POST /api/market/list` - Create listings
  - `GET /api/market/chat` - Get chat messages
  - `POST /api/market/chat` - Send messages
  - `POST /api/market/heartbeat` - Track online users

### 🔥 Mythic Forge (Gacha)
- **Multi-tier Pity System**:
  - Mythic: Soft pity at 150, hard pity at 200 (0.01% base rate)
  - Legendary: Soft pity at 50, hard pity at 80 (1% base rate)
  - Epic: Soft pity at 15, hard pity at 25 (8% base rate)
- **40+ Cards** across 6 rarities
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
│   ├── forge.html          # Gacha system
│   ├── market.html         # FREE MARKET with Live Chat
│   ├── tcg.html            # Card collection
│   ├── *.html              # Other pages
│   └── static/
│       ├── nw-wallet.js    # Wallet core logic
│       ├── nw-*.css/js     # NW Visual Library
│       ├── cards/          # 40+ card images
│       └── icons/          # Currency & app icons
├── migrations/             # D1 database schema
├── seed.sql                # Test data
├── package.json
├── wrangler.jsonc
└── ecosystem.config.cjs    # PM2 config
```

---

## Quick Commands

```bash
npm install              # Install deps
npm run build            # Build
pm2 start ecosystem.config.cjs  # Start dev
pm2 restart numbahwan-guild     # Restart
npm run deploy           # Deploy to Cloudflare
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

---

*Made with ❤️ by NumbahWan family*
