# NumbahWan TCG - Project Specification

## Vision
A browser-based trading card game featuring guild culture, gacha mechanics, and strategic battles. Built for Cloudflare Pages deployment.

## Target Users
- Mobile-first (iPhone, Android)
- Multi-language (EN, 中文, ไทย)
- Casual gamers who enjoy collecting and battling

---

## Core Features

### 1. Card System
- **216 cards** across 2 seasons (108 each)
- **6 rarities:** Mythic, Legendary, Epic, Rare, Uncommon, Common
- **5 categories:** Member, Moment, Gear, Vibe, Spot
- **Game stats:** Cost, ATK, HP, SPD
- **Abilities:** Special powers per card

### 2. Gacha/Forge
- Pull cards using Sacred Logs currency
- Multi-tier pity system (soft + hard pity)
- Pack animations and reveals
- Season-specific pull pools

### 3. Collection
- View owned cards
- Track completion percentage
- Card leveling via duplicates (XP system)
- Wishlist feature

### 4. Deck Building
- Min/max deck size constraints
- Save/load multiple decks
- Share decks via codes
- Cost curve visualization

### 5. Battle System
- Turn-based combat vs AI
- 5-slot board per player
- Attack, defend, abilities
- Win/lose conditions
- Deck integration

### 6. Seasons
| # | Name | Theme | Status |
|---|------|-------|--------|
| 1 | Origins | Guild founding | Active |
| 2 | Hounds of War | Dog pack | Active (placeholder art) |
| 3 | Cyber Siege | Digital invasion | Coming Soon |

---

## Technical Architecture

### Frontend
- Vanilla JavaScript (no framework)
- Tailwind CSS via CDN
- Web Audio API for sounds
- localStorage for persistence
- Touch-optimized for mobile

### Backend
- Hono framework on Cloudflare Workers
- Static file serving
- JSON data files (no database)
- Future: D1 for user accounts

### Build
- Vite for bundling
- Wrangler for Cloudflare deployment
- PM2 for local dev server

---

## Data Persistence

### localStorage Keys
```
nw_wallet_v2      - Wallet data
nw_collection     - Owned cards {cardId: count}
nw_decks          - Saved decks array
nw_forge_state    - Pity counters, pull history
nw_lang           - Language preference
nw_gm_mode        - GM mode flag
```

### Future (Cloudflare D1)
- User accounts
- Leaderboards
- Trading marketplace
- Guild systems

---

## API Routes (src/index.tsx)

```
GET  /              → index.html
GET  /cards         → cards.html
GET  /forge         → forge.html
GET  /battle        → battle.html
GET  /collection    → collection.html
GET  /deckbuilder   → deckbuilder.html
GET  /pvp           → pvp.html
GET  /guide         → guide.html
GET  /static/*      → Static assets
```

---

## UI/UX Principles

1. **Mobile-first** - All interactions work on touch
2. **Juice everywhere** - Animations, sounds, haptics
3. **Clear feedback** - Toast messages, visual states
4. **Easy navigation** - Hamburger menu accessible everywhere
5. **Language support** - EN/中文/ไทย toggleable

---

## Quality Standards

### Performance
- First paint < 1s
- Card images as WebP thumbnails
- Lazy loading for images
- Minimal JS bundle

### Accessibility
- Touch targets ≥ 44px
- Color contrast compliance
- Screen reader considerations

### Code
- Modular JS files
- Consistent naming (NW_ prefix)
- Comments for complex logic
- Error handling with fallbacks

---

## Deployment

### Development
```bash
npm run build
pm2 start ecosystem.config.cjs
# Access at localhost:3000
```

### Production
```bash
npm run build
npx wrangler pages deploy dist --project-name numbahwan-tcg
# Access at numbahwan-tcg.pages.dev
```

---

## Future Roadmap

### Phase 1 (Current)
- [x] Card browser with seasons
- [x] Gacha system
- [x] Basic battle
- [x] Collection tracking
- [x] Deck builder

### Phase 2
- [ ] Real Season 2 artwork
- [ ] PvP matchmaking
- [ ] User accounts (D1)
- [ ] Daily rewards

### Phase 3
- [ ] Trading marketplace
- [ ] Guild system
- [ ] Tournaments
- [ ] Season 3 cards

---

*Spec Version: 1.0 | Last Updated: 2026-01-31*
