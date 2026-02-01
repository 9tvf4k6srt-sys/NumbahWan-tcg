# NumbahWan TCG - Project Architecture

## Quick Reference for Development

### Core Files
| File | Purpose | Size |
|------|---------|------|
| `public/cards.html` | Card carousel (all 10 seasons) | 98KB |
| `public/index.html` | Main landing page | 188KB |
| `public/battle.html` | Battle system | 175KB |
| `public/forge.html` | Card forging | 209KB |
| `public/wallet.html` | Wallet/inventory | 247KB |

### Data Files (`public/static/data/`)
| File | Content | Cards |
|------|---------|-------|
| `seasons.json` | Season metadata (all 10) | - |
| `cards-v2.json` | Season 1: Origins | 110 |
| `cards-s2.json` | Season 2: Hounds of War | 57 |
| `cards-s3.json` | Season 3: Cyber Siege | 68 |
| `cards-s4.json` | Season 4: Realm of Shadows | 68 |
| `cards-s5.json` | Season 5: Tournament of Champions | 67 |
| `cards-s6.json` | Season 6: Whale Wars | 68 |
| `cards-s7.json` | Season 7: Rage Quit Rebellion | 68 |
| `cards-s8.json` | Season 8: Legends Reborn | 28 |
| `cards-s9.json` | Season 9: Multiverse Mayhem | 25 |
| `cards-s10.json` | Season 10: Final Dawn | 24 |
| **TOTAL** | | **583 cards** |

### Image Assets (`public/static/images/cards/`)
| Directory | Content |
|-----------|---------|
| `thumbs/` | S1 thumbnails (optimized) |
| `s3/` - `s10/` | Season preview art + thumbs |
| `s3/thumbs/` etc | Optimized thumbnails (~50KB) |

### JavaScript Modules (`public/static/`)
| File | Purpose |
|------|---------|
| `nw-cards.js` | Card data loading |
| `nw-card-renderer.js` | Card rendering |
| `nw-nav.js` | Navigation system |
| `nw-game-juice.js` | Animations/effects |
| `nw-i18n.js` | Internationalization |

### CSS (`public/static/`)
| File | Purpose |
|------|---------|
| `nw-tokens.css` | Design tokens/variables |
| `nw-utilities.css` | Utility classes |
| `nw-card-frames.css` | Card frame styles |
| `nw-core.css` | Core styles |

### Season System
- **S1-S2**: Live with real card art
- **S3-S10**: Coming Soon (browsable with placeholders)
- Each season has unique:
  - Theme color
  - Icon emoji
  - Animated placeholder style
  - Card mechanics

### Key Constants (in cards.html)
```javascript
SEASON_FILES = { 1-10: paths to JSON }
SEASON_ICONS = { 3-10: emoji icons }
SEASON_CARD_THUMBS = { 3-10: thumbnail paths }
SEASON_CARD_FULL = { 3-10: full image paths }
SEASON_I18N = { 1-10: translations }
```

### Build & Deploy
```bash
npm run build          # Build for production
pm2 restart all        # Restart dev server
npm run deploy:prod    # Deploy to Cloudflare
```

### Languages Supported
- English (en)
- Chinese (zh)
- Thai (th)

---
Last updated: 2026-01-31
