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
| **Production** | Not yet deployed |

## Features

- **Gacha System** - Pack opening with multi-tier pity
- **110+ Cards** - 6 rarities across multiple seasons
- **Battle System** - AI card battles
- **Deck Builder** - Custom deck construction
- **Wallet** - Currency & inventory management
- **Market** - Card trading between players
- **Trilingual** - EN / 中文 / ไทย
- **Academy** - Parry Hotter School of Coding Wizardry
- **Guild Vault** - B13 underground vault with legendary misprint card

## Tech Stack

- **Backend**: Hono + Cloudflare Pages
- **Frontend**: Vanilla JS + Tailwind CDN
- **Build**: Vite
- **Deploy**: Cloudflare Workers

## Project Structure

```
webapp/
├── src/index.tsx      # API routes
├── public/            # HTML pages & static assets
│   ├── *.html         # Page files
│   └── static/        # JS, CSS, images, data
├── docs/              # Archived documentation
├── .ai-context.md     # AI ASSISTANT: READ THIS FILE
└── README.md          # This file
```

## For AI Assistants

**Read `.ai-context.md` first!** It contains:
- Complete API reference
- Module dependency graph
- Global object documentation
- Common patterns & fixes
- Development workflow

## Commands

```bash
npm run build          # Build for production
npm run dev            # Development mode
npm run deploy         # Deploy to Cloudflare
pm2 restart numbahwan-guild  # Restart server
```

## GM Mode (Testing)

```javascript
// In browser console
NW_WALLET.activateGM("numbahwan-gm-2026")
```

---

*Made with love by the NumbahWan family*
