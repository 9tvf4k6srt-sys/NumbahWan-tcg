# NumbahWan Guild Website

> "We are not just a guild, but FAMILY"

## Project Overview
- **Name**: NumbahWan Guild
- **Game**: MapleStory Idle RPG (TW Server)
- **Tech Stack**: Hono.js + Cloudflare Pages + TailwindCSS + GSAP + NW Visual Library
- **Last Updated**: January 26, 2026

## Live URLs
- **Sandbox**: https://3000-ibmhvh5a5ur1fl5egj0r0-b9b802c4.sandbox.novita.ai
- **Production**: Not yet deployed (run `npm run deploy`)

---

## ✅ Completed Features

### Core Pages
| Page | Path | Description |
|------|------|-------------|
| Main | `/` | Hero, roster, CP race, gallery, about |
| PvP Diary | `/pvp.html` | RegginA's arena battles, GM1 flex |
| Fashion | `/fashion.html` | 12 Disasters costume showcase |
| Merch | `/merch.html` | Guild merchandise store |
| Fortune | `/fortune.html` | Daily fortune teller |
| Apply | `/apply` | Recruitment form |
| Memes | `/memes` | Guild memes gallery |
| Regina | `/regina.html` | Regina hotel parody |

### Visual Features
- **NW Visual Library** - Custom effects: glow, tilt, reveal, confetti, particles
- **Trilingual** - EN/中文/ไทย toggle on all pages
- **Local BGM** - Kerning City MP3 (main page only, 1.4MB)
- **Instant Loader** - Fast loading screen with aurora animation
- **Click Juice** - Satisfying click feedback effects
- **Custom Cursor** - N emblem cursor

### Data Features
- **Member Roster** - 12 members with custom avatars
- **CP Race Leaderboard** - With % gain tracking vs previous update
- **PvP Battle Log** - Full i18n, attack/defense records

---

## Member Roster (Updated 2026-01-26)

| Name | Level | CP | Role |
|------|-------|-----|------|
| RegginA | 77 | 2B 867M | Master |
| Yuluner晴 | 76 | 2B 328M | Member |
| Natehouoho | 74 | 1B 197M | Member |
| RegginO | 74 | 960M 2K | Vice Master |
| 騎鳥回家 | 71 | 593M 939K | Member |
| 紈稀税著 | 72 | 562M 108K | 領導 |
| 阿光Yo | 67 | 180M 315K | Member |
| TW#VWQG7R9C03 | 65 | 99M 969K | Member |
| 碼農小孫 | 62 | 31M 4K | Member |
| 泰拳寒玉 | 52 | 15M 329K | Member |
| 小亨寶寶 | 54 | 13M 174K | Member |
| 葉陽 | 46 | 2,572,190 | Member |

---

## PvP Arena Status (Day 4)
- **Rank**: Grandmaster 1 (#136)
- **Score**: 1931
- **CP**: 2B 480M
- **Latest**: 3W-3L (+104 LP net)

---

## File Structure

```
webapp/
├── src/index.tsx           # Main Hono app
├── public/
│   ├── static/
│   │   ├── nw-core.css     # NW Visual Library CSS
│   │   ├── nw-effects.js   # NW Visual Library JS
│   │   ├── bgm.js          # Background music controller
│   │   ├── click-juice.js  # Click effects
│   │   ├── kerning-bgm.mp3 # Local BGM file
│   │   ├── avatar-*.jpg    # Member avatars (12)
│   │   ├── guild-fun-*.jpg # Gallery photos (6)
│   │   └── icons/          # Custom SVG icons
│   ├── pvp.html
│   ├── fashion.html
│   ├── merch.html
│   ├── fortune.html
│   ├── apply.html
│   ├── memes.html
│   └── regina.html
├── package.json
├── wrangler.jsonc
├── vite.config.ts
└── ecosystem.config.cjs
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

## ❌ Not Yet Done
- [ ] Deploy to Cloudflare Pages (production)
- [ ] Push to GitHub
- [ ] Real-time stats API
- [ ] Photo upload feature

---

*Made with ❤️ by NumbahWan family*
