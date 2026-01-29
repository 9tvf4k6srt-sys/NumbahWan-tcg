# NumbahWan Guild - AI Assistant Guide

> **FOR AI ASSISTANTS**: This file contains everything you need to understand, debug, restore, and modify this project.

## Quick Restoration Commands

```bash
# 1. If starting fresh, download and extract backup
curl -L "https://www.genspark.ai/api/files/s/mxiiyZG5" -o backup.tar.gz
tar -xzf backup.tar.gz -C /home/user/

# 2. Navigate and install
cd /home/user/webapp
npm install

# 3. Build and start
npm run build
pm2 start ecosystem.config.cjs

# 4. Verify
curl http://localhost:3000/api/debug
```

## Project Structure

```
/home/user/webapp/
├── src/
│   └── index.tsx          # Main Hono backend (routes, APIs)
├── public/                 # All static HTML pages
│   ├── index.html         # Main page
│   ├── wallet.html        # Wallet with 5 currencies
│   ├── forge.html         # Gacha/card pulling
│   ├── market.html        # Trading marketplace
│   ├── tcg.html           # TCG command center
│   ├── cards.html         # 108-card carousel gallery
│   ├── guide.html         # Game guide
│   ├── pvp.html, fashion.html, merch.html, fortune.html,
│   │   arcade.html, memes.html, regina.html, apply.html
│   └── static/
│       ├── data/          # ⭐ DATA FILES (edit these, not code!)
│       │   ├── cards.json      # All 126 cards
│       │   ├── config.json     # Site settings
│       │   ├── navigation.json # Menu structure
│       │   └── pages.json      # Page metadata
│       ├── nw-wallet.js   # Wallet logic
│       ├── nw-cards.js    # Card system library
│       ├── nw-utilities.css, nw-tokens.css, nw-core.css
│       ├── cards/         # Card images (126 files)
│       ├── icons/         # Currency & UI icons
│       ├── images/        # Merch, memes, etc.
│       └── regina/        # Hotel images
├── ecosystem.config.cjs   # PM2 config
├── wrangler.jsonc         # Cloudflare config
├── package.json
└── AI-README.md           # This file
```

## Data-Driven Architecture

### To modify ANYTHING, edit these JSON files (no code changes needed!):

| File | Purpose | Key Fields |
|------|---------|------------|
| `/static/data/cards.json` | All TCG cards | `cards[]`, `rarities{}` |
| `/static/data/config.json` | Site settings | `siteName`, `currencies`, `features` |
| `/static/data/navigation.json` | Menu items | `mainNav[]`, `footerNav[]` |
| `/static/data/pages.json` | Page metadata | `pages[]` with titles, descriptions |

### 🏭 CARD FACTORY - Ultra Fast Card Creation

**Add cards in seconds with auto ID and filename generation!**

#### Method 1: Batch API (FASTEST - No Image)
```bash
curl -X POST "http://localhost:3000/api/admin/cards/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "gmKey": "numbahwan-gm-2026",
    "cards": [
      {"name": "Dragon Lord", "rarity": "legendary", "description": "Fire dragon"},
      {"name": "Storm Mage", "rarity": "epic"},
      {"name": "Iron Knight", "rarity": "rare"}
    ]
  }'
# IDs and filenames auto-generated!
```

#### Method 2: Edit JSON (Simple)
```json
// Edit /public/static/data/cards.json, add to "cards" array:
{ "id": 999, "name": "New Card", "rarity": "epic", "img": "new-card.jpg", "set": "custom" }
```
Then: `npm run build && pm2 restart numbahwan-guild`

#### Method 3: With Image Generation
```
1. Generate image using template from /api/card-factory
2. Save to /public/static/cards/{rarity}-{id}-{slug}.jpg
3. Add card via batch API or JSON
4. npm run build && pm2 restart numbahwan-guild
```

#### Image Prompt Templates (for AI)
| Rarity | Prompt Style |
|--------|--------------|
| mythic | Epic fantasy TCG art, legendary mythic creature, dramatic golden aura, divine power, ultra detailed |
| legendary | Fantasy TCG art, powerful boss creature, dramatic pose, glowing effects |
| epic | Fantasy card art, elite warrior, dynamic action pose, magical effects |
| rare | Fantasy game card, skilled adventurer, subtle magical effects |

#### Get Next Available IDs
```bash
curl "http://localhost:3000/api/admin/cards/next-ids?gmKey=numbahwan-gm-2026"
```

#### Full Card Factory Docs
```bash
curl "http://localhost:3000/api/card-factory"
# Or read: /home/user/webapp/CARD-FACTORY.md
```

### Example: Change site name
```json
// Edit /public/static/data/config.json:
{ "siteName": "New Site Name", ... }
```

## API Endpoints Reference

### Debug & Diagnostics
| Endpoint | Description |
|----------|-------------|
| `GET /api/debug` | Full system diagnostics |
| `GET /api/cards/stats` | Card database stats |
| `GET /api/health` | Simple health check |

### Card System
| Endpoint | Description |
|----------|-------------|
| `GET /api/cards` | All cards (`?rarity=&set=&q=&limit=&offset=`) |
| `GET /api/cards/:id` | Single card |
| `GET /api/cards/stats` | Statistics |
| `GET /api/cards/rarity/:rarity` | Cards by rarity |
| `POST /api/cards/pull` | Gacha pull |

### Admin (GM Key: `numbahwan-gm-2026`)
| Endpoint | Description |
|----------|-------------|
| `POST /api/admin/cards` | Add single card |
| `POST /api/admin/cards/batch` | **⚡ Add multiple cards at once** |
| `GET /api/admin/cards/next-ids` | Get next available IDs per rarity |
| `PUT /api/admin/cards/:id` | Update card |
| `DELETE /api/admin/cards/:id` | Delete card |
| `GET /api/admin/cards/export` | Export database |
| `GET /api/card-factory` | **🏭 Card creation helper for AI** |

### Market
| Endpoint | Description |
|----------|-------------|
| `GET /api/market/listings` | Active listings |
| `POST /api/market/buy` | Purchase |
| `POST /api/market/list` | Create listing |
| `GET /api/market/chat` | Chat messages |
| `POST /api/market/chat` | Send message |

## Common Tasks

### Start/Restart Server
```bash
cd /home/user/webapp
npm run build
pm2 restart numbahwan-guild
# Or if not running:
pm2 start ecosystem.config.cjs
```

### Check Logs
```bash
pm2 logs numbahwan-guild --nostream
```

### Test All Pages
```bash
for p in / /wallet /forge /tcg /market /cards /guide; do
  echo "$p: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$p)"
done
```

### Get Public URL
```bash
# The sandbox URL format is:
# https://3000-{sandbox_id}.sandbox.novita.ai
```

### Full Rebuild
```bash
cd /home/user/webapp
rm -rf dist node_modules
npm install
npm run build
pm2 restart numbahwan-guild
```

## Troubleshooting

### Page returns 404
1. Check if HTML file exists: `ls public/*.html`
2. Check if route is in `staticPages` array in `src/index.tsx`
3. Rebuild: `npm run build && pm2 restart numbahwan-guild`

### API returns error
1. Check logs: `pm2 logs --nostream`
2. Test endpoint: `curl -v http://localhost:3000/api/endpoint`
3. Check `src/index.tsx` for route definition

### Cards not showing
1. Verify cards.json: `curl http://localhost:3000/static/data/cards.json | jq '.cards | length'`
2. Check browser console for JS errors
3. Verify nw-cards.js is loaded in page's `<head>`

### Wallet not working
1. Clear localStorage: Browser console → `localStorage.clear()`
2. Check nw-wallet.js is loaded
3. Verify wallet APIs: `curl http://localhost:3000/api/wallet/collection`

## Key Files to Know

### Backend (src/index.tsx)
- All API routes defined here
- `staticPages` array controls which pages are served
- Market, Card, and Debug APIs

### Frontend Libraries
- `nw-wallet.js`: Wallet state, currencies, collection
- `nw-cards.js`: Card loading, caching, gacha system
- `nw-utilities.css`: Common styles, language toggle
- `nw-tokens.css`: Design tokens (colors, spacing)

### Configuration
- `ecosystem.config.cjs`: PM2 process manager config
- `wrangler.jsonc`: Cloudflare deployment config
- `package.json`: Dependencies and scripts

## Backup Links

| Date | Description | URL |
|------|-------------|-----|
| 2026-01-28 | Infinite Scaling v2 | https://www.genspark.ai/api/files/s/mxiiyZG5 |
| 2026-01-28 | Full with images | https://www.genspark.ai/api/files/s/2jJYW3SB |
| 2026-01-28 | Earlier backup | https://www.genspark.ai/api/files/s/SvgQra9k |

## GM Mode Commands (Browser Console)

```javascript
// Activate GM mode (infinite resources)
NW_WALLET.activateGM("numbahwan-gm-2026")

// Deactivate GM mode
NW_WALLET.deactivateGM()

// Add card to collection
NW_WALLET.addToCollection(1) // Card ID 1

// Get wallet info
NW_WALLET.getWalletInfo()

// Clear wallet (reset)
localStorage.clear(); location.reload()
```

## Language Support

All pages support 3 languages:
- English (en) - default
- Traditional Chinese (zh) - 繁體中文  
- Thai (th) - ไทย

Toggle is in the header of each page (flag icon).

---

## 🤖 AI Quick Reference

When user says → AI does:

| User Request | AI Action |
|--------------|-----------|
| "Add card X" | Use batch API, rebuild |
| "Add card X with image" | Generate image (nano-banana-pro, 3:4), save to /public/static/cards/, batch API, rebuild |
| "Add 10 new cards" | Batch API with all 10, rebuild once |
| "What's the next ID?" | `curl /api/admin/cards/next-ids?gmKey=numbahwan-gm-2026` |
| "Show card stats" | `curl /api/cards/stats` |
| "Debug the system" | `curl /api/debug` |
| "Restore from backup" | Download tar, extract, npm install, build, pm2 start |

---

**Last Updated**: 2026-01-29
**Version**: 2.1.0 (Card Factory)
**Total Pages**: 15
**Total Cards**: 127
