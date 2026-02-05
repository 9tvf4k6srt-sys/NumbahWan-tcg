# NumbahWan TCG - AI Workflows Master Guide

> **COMPREHENSIVE INTERNAL WORKFLOWS** - All processes I (Claude) follow for this project

---

## Table of Contents

1. [Avatar/Card Art Generation](#1-avatar-card-art-generation)
2. [New Page Creation](#2-new-page-creation)
3. [Card Management](#3-card-management)
4. [i18n (Internationalization)](#4-i18n-internationalization)
5. [Media Asset Pipeline](#5-media-asset-pipeline)
6. [Deployment](#6-deployment)
7. [Debug & Performance](#7-debug--performance)
8. [Lore & Content](#8-lore--content)
9. [Season Management](#9-season-management)
10. [Database Operations](#10-database-operations)

---

## 1. Avatar/Card Art Generation

**Purpose**: Generate pixel-perfect MapleStory-style card art from user avatar screenshots.

**Reference Doc**: `/docs/AI-AVATAR-WORKFLOW.md`

### Files Involved
```
/public/static/data/avatar-components.json  # Component library with promptKeywords
/public/static/ref/                         # Reference images by category
  ├── hats/
  ├── hair/
  ├── eyewear/
  ├── face/
  ├── costumes/
  ├── weapons/
  └── full-avatars/
/public/static/images/cards/                # Final card art output
```

### Workflow Steps
1. **Collect References**: Download user screenshots to `/public/static/ref/full-avatars/`
2. **Extract Components**: Use ImageMagick to crop individual items
3. **Identify Components**: Confirm each piece with user (hat, hair, eyewear, face, costume, weapon)
4. **Build Prompt**: Use `promptKeywords` from component library
5. **Generate**: Use `nano-banana-pro` model with reference images
6. **Verify**: Check each component matches exactly
7. **Save**: Convert to 512x512 webp, save to `/public/static/images/cards/`
8. **Update cards.json**: Add card entry if new

### Key Learnings
- **Shutter shades**: "horizontal slat blinds style" not "sunglasses"
- **Amber Soprano hair**: "ONLY visible on ONE SIDE, LEFT SIDE HAS NO VISIBLE HAIR"
- **Color accuracy**: Specify hex codes like "#FFD700 golden yellow"
- Always include user's screenshot as first reference image

---

## 2. New Page Creation

**Purpose**: Create new HTML pages with proper i18n and navigation.

### Pre-Flight Checklist
```bash
npm run page:check public/[new-page].html
```

### Required Elements
1. **Universal Navigation**: `<script src="/static/nw-nav.js"></script>`
2. **i18n Core**: `<script src="/static/nw-i18n-core.js"></script>`
3. **Translations Object**: `const pageTranslations = { en: {...}, zh: {...}, th: {...} }`
4. **Init Call**: `initI18n(pageTranslations)`
5. **data-i18n attributes**: On all user-facing text
6. **Essential Scripts**: nw-essentials.js, nw-wallet.js (if needed)
7. **Mobile viewport**: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
8. **Favicon**: `<link rel="icon" href="/static/favicon.svg">`

### Template
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NumbahWan TCG | Page Title</title>
    <link rel="icon" href="/static/favicon.svg">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="/static/nw-tokens.css">
    <link rel="stylesheet" href="/static/nw-utilities.css">
</head>
<body>
    <script src="/static/nw-essentials.js"></script>
    <script src="/static/nw-icons-inline.js"></script>
    <script src="/static/nw-nav.js"></script>
    <script src="/static/nw-i18n-core.js"></script>
    
    <!-- Page content with data-i18n attributes -->
    
    <script>
    const pageTranslations = {
        en: { /* ... */ },
        zh: { /* ... */ },
        th: { /* ... */ }
    };
    if (typeof initI18n === 'function') initI18n(pageTranslations);
    </script>
</body>
</html>
```

### After Creation
1. Add to `staticPages` array in `src/index.tsx`
2. Add to navigation in `public/static/nw-nav.js` (if user-facing)
3. Run `npm run build && pm2 restart numbahwan-guild`
4. Run `npm run page:check public/[page].html`

---

## 3. Card Management

**Purpose**: Add, modify, or manage TCG cards.

### Files Involved
```
/public/static/data/cards.json      # Main card database (Season 1)
/public/static/data/cards-v2.json   # Legacy/backup
/public/static/data/cards-s[N].json # Season N cards
/public/static/images/cards/        # Card artwork
/docs/CARD_BIBLE.md                 # Lore and design rules
/docs/AI-HANDOFF.md                 # Quick card reference
```

### Card JSON Structure
```json
{
  "id": 624,
  "name": "Card Name",
  "rarity": "mythic|legendary|epic|rare|uncommon|common",
  "category": "member|moment|gear|vibe|spot",
  "role": "carry|grinder|whale|lurker|simp|troll|fashion_main|...",
  "img": "mythic-card-name.webp",
  "set": "core|origins|fashion|...",
  "description": "Card description text",
  "hasArt": true,
  "addedDate": "2026-02-05"
}
```

### Adding a New Card
1. **Find highest ID**: `grep -o '"id": [0-9]*' cards.json | sort -t: -k2 -n | tail -1`
2. **Generate art**: Follow Avatar/Card Art Workflow
3. **Add entry**: Insert into cards array in cards.json
4. **Update totalCards**: Increment count in cards.json header
5. **Verify**: `npm run cards:verify`

### NPM Commands
```bash
npm run cards:thumbs   # Generate thumbnails
npm run cards:verify   # Verify all cards have art
npm run cards:stats    # Show card statistics
npm run cards:list     # List all cards
```

---

## 4. i18n (Internationalization)

**Purpose**: Maintain 3-language support (EN, ZH, TH) across all pages.

### Files Involved
```
/public/static/nw-i18n-core.js           # Core i18n system
/public/static/nw-nav.js                 # Navigation translations (built-in)
/scripts/audit-i18n.cjs                  # Audit tool
/scripts/inject-i18n.cjs                 # Injection tool
/scripts/generate-i18n-template.cjs      # Template generator
/docs/I18N_AUDIT_REPORT.md               # Audit results
```

### Translation Attributes
- `data-i18n="key"` - Text content
- `data-i18n-html="key"` - HTML content (use for text with `<br>`, `<span>`, etc.)
- `data-i18n-placeholder="key"` - Input placeholders
- `data-i18n-title="key"` - Title attributes

### Workflow for New Content
1. Add `data-i18n="keyName"` to element
2. Add translations to pageTranslations object:
```javascript
const pageTranslations = {
    en: { keyName: "English text" },
    zh: { keyName: "中文文字" },
    th: { keyName: "ข้อความไทย" }
};
```

### Audit All Pages
```bash
node scripts/audit-i18n.cjs
```

### Common Issues
- **Raw HTML showing**: Use `data-i18n-html` instead of `data-i18n`
- **Missing translation**: Check pageTranslations has all 3 languages
- **Not updating**: Ensure `initI18n(pageTranslations)` is called after DOM ready

---

## 5. Media Asset Pipeline

**Purpose**: Download, compress, and manage images/audio/icons.

### Files Involved
```
/scripts/download-media.js    # Download from URLs
/scripts/process-media.sh     # Full pipeline
/scripts/media-utils.sh       # Compression utilities
/scripts/icon-cropper.sh      # Icon extraction
/scripts/smart-icon-crop.cjs  # Smart cropping
```

### NPM Commands
```bash
npm run media:download   # Download from manifest
npm run media:compress   # Compress images to WebP
npm run media:icons      # Compress icons
npm run media:audio      # Compress audio
npm run media:pipeline   # Run full pipeline
```

### Image Standards
- **Cards**: 512x512 WebP, quality 85
- **Thumbnails**: 128x128 WebP
- **Icons**: 64x64 or 128x128 WebP
- **Hero banners**: Max 1920px wide, WebP

### Download Manifest Format
```json
{
  "images": [
    { "url": "https://...", "output": "public/static/images/cards/name.webp" }
  ]
}
```

---

## 6. Deployment

**Purpose**: Deploy to Cloudflare Pages.

### Local Development
```bash
npm run build
pm2 restart numbahwan-guild
# Test at http://localhost:3000
```

### Production Deployment
```bash
# 1. Build
npm run build

# 2. Deploy
npm run deploy

# 3. Verify
curl https://numbahwan-guild.pages.dev
```

### Pre-Deployment Checklist
- [ ] All pages pass `npm run page:checkall`
- [ ] No console errors
- [ ] i18n works in all languages
- [ ] Navigation works on mobile
- [ ] All images load (no 404s)
- [ ] Git committed and pushed

### Rollback
If deployment fails, the previous version remains active on Cloudflare Pages. Check deployment logs in Cloudflare dashboard.

---

## 7. Debug & Performance

**Purpose**: Diagnose and fix issues.

### NPM Commands
```bash
npm run debug          # Analyze issues
npm run debug:fix      # Auto-fix common issues
npm run debug:optimize # Performance optimization
npm run debug:report   # Generate report
npm run debug:security # Security scan
npm run debug:perf     # Performance analysis
```

### Common Issues & Fixes

| Issue | Command/Fix |
|-------|-------------|
| Port 3000 in use | `fuser -k 3000/tcp` |
| Build fails | Check `vite.config.ts`, run `npm install` |
| 404 on page | Add to `staticPages` in `src/index.tsx` |
| Navigation broken | Check `nw-nav.js` loaded before use |
| i18n not working | Ensure `initI18n()` called, check console |
| Images not loading | Check path, ensure in `public/static/` |

### Performance Checklist
- [ ] Images are WebP format
- [ ] No unused CSS/JS
- [ ] Lazy load off-screen images
- [ ] Minimize main bundle size
- [ ] Use CDN for external libraries

---

## 8. Lore & Content

**Purpose**: Maintain story consistency and content quality.

### Files Involved
```
/docs/CARD_BIBLE.md                      # Card lore & design rules
/public/static/data/regina-stories.json  # RegginA story data
/public/static/data/lore-index.json      # Lore page index
/public/lore/*.html                      # Lore pages
```

### Character Reference
- **RegginA**: Guild founder, dark skin, carries guild on her back
- **Zakum**: Boss character, featured on hero banner
- **Guild theme**: MMO humor, gacha culture, internet memes

### Writing Style
- Irreverent, self-aware humor
- Gaming references (MapleStory, gacha, MMO culture)
- Mix of English gaming terms with Chinese/Thai gaming culture
- Card descriptions should be punchy, memeable

### Content Checklist
- [ ] Consistent with established lore
- [ ] Translated to all 3 languages
- [ ] No copyrighted material
- [ ] Humor is inclusive, not offensive

---

## 9. Season Management

**Purpose**: Manage card seasons and releases.

### Files Involved
```
/public/static/data/seasons.json         # Season metadata
/public/static/data/cards-s[N].json      # Season N card data
/scripts/generate-seasons.js             # Season generator
/scripts/season-templates.cjs            # Card templates
```

### Season Structure
```json
{
  "id": "s1",
  "name": "Origins",
  "releaseDate": "2026-01-01",
  "cardCount": 108,
  "theme": "Guild founding & early days"
}
```

### Creating New Season
1. Create `cards-s[N].json` with new cards
2. Add season entry to `seasons.json`
3. Generate card art using Avatar workflow
4. Update card browser to include new season
5. Test pack opening with new cards

---

## 10. Database Operations

**Purpose**: Manage D1 SQLite database (when used).

### NPM Commands
```bash
npm run db:migrate:local  # Apply migrations locally
npm run db:seed           # Seed test data
npm run db:reset          # Reset local database
npm run db:console        # Open database console
```

### Migration Files
```
/migrations/
  ├── 0001_initial_schema.sql
  └── 0002_add_feature.sql
```

### When to Use Database
- User accounts/authentication
- Persistent game state
- Leaderboards
- Trading/marketplace transactions

Currently most data is JSON-based for simplicity.

---

## Quick Reference Commands

### Daily Development
```bash
# Start dev server
npm run build && pm2 restart numbahwan-guild

# Check page compliance
npm run page:check public/[page].html

# Full page audit
npm run page:checkall

# Check i18n coverage
node scripts/audit-i18n.cjs
```

### Before Committing
```bash
# Build test
npm run build

# Lint pages
npm run page:checkall

# Git
git add . && git commit -m "message" && git push origin main
```

### Troubleshooting
```bash
# Kill stuck process
fuser -k 3000/tcp

# Check PM2 status
pm2 list

# View logs
pm2 logs numbahwan-guild --nostream

# Full debug
npm run debug:report
```

---

## Workflow Cheat Sheet

| Task | Workflow |
|------|----------|
| New card art | Avatar Workflow → cards.json → build |
| New page | Template → staticPages → nav → build → page:check |
| Add translation | data-i18n attr → pageTranslations → test all 3 langs |
| Compress images | media:compress or manual ImageMagick |
| Deploy | build → deploy → verify |
| Debug issue | debug:report → identify → fix → build → test |

---

*Last Updated: 2026-02-05*
*Maintainer: Claude AI*
