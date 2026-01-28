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
- **Free Market** - Buy/sell cards with other players
- **Transaction Logging** - Full history
- **Export/Import** - Backup your wallet
- **GM Mode** - For testing with infinite resources

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
├── src/index.tsx           # Main Hono app (API routes only)
├── public/
│   ├── index.html          # Main page
│   ├── wallet.html         # Wallet system
│   ├── forge.html          # Gacha system
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

*Made with ❤️ by NumbahWan family*
