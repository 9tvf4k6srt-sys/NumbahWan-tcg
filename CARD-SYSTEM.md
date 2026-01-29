# NumbahWan Card System - Quick Reference

## 🎯 Single Source of Truth

```
cards-v2.json  →  NW_CARDS.init()  →  All Pages
     │                  │
     │                  ├── /cards (carousel)
     │                  ├── /forge (gacha)
     │                  ├── /tcg (hub)
     │                  └── /wallet (collection)
     │
     └── Card data: id, name, rarity, category, role, img, description
```

## 📁 File Locations

| Type | Path | Notes |
|------|------|-------|
| **Card Data** | `/public/static/data/cards-v2.json` | THE source of truth |
| **Full Images** | `/public/static/images/cards/*.png/jpg` | ~141MB total |
| **Thumbnails** | `/public/static/images/cards/thumbs/*.webp` | ~2.6MB total |
| **Card Loader** | `/public/static/nw-cards.js` | NW_CARDS API |

## 🛠️ Management Commands

```bash
# Using npm scripts
npm run cards:stats    # Show storage & counts
npm run cards:verify   # Check for missing images
npm run cards:thumbs   # Generate thumbnails
npm run cards:list     # List all cards

# Or directly
./scripts/card-manager.sh stats
./scripts/card-manager.sh verify
./scripts/card-manager.sh thumbs
./scripts/card-manager.sh add ~/new-card.png legendary-newboss
```

## ➕ Adding a New Card

### Step 1: Add Image
```bash
./scripts/card-manager.sh add /path/to/image.png rarity-cardname
# Example: ./scripts/card-manager.sh add ~/download/boss.png legendary-firelord
```

### Step 2: Add to cards-v2.json
```json
{
  "id": 999,
  "name": "Firelord, The Infernal",
  "rarity": "legendary",
  "category": "member",
  "role": "carry",
  "img": "legendary-firelord.png",
  "description": "Lord of fire and destruction",
  "hasArt": true
}
```

### Step 3: Verify & Build
```bash
npm run cards:verify  # Check everything is linked
npm run build         # Rebuild app
```

## 🖼️ Image Naming Convention

```
{rarity}-{slug}.png

Examples:
  mythic-sacred-log.png
  legendary-bigbrain.png
  epic-grimhelm.png
  rare-newbie.png
  uncommon-hopeful-applicant.png
  common-cracked-phone.png
```

## 📊 Current Stats

- **Total Cards**: 108
- **Mythic**: 8
- **Legendary**: 12
- **Epic**: 18
- **Rare**: 22
- **Uncommon**: 25
- **Common**: 23

## ⚠️ Common Issues

### Images not showing?
1. Check image path in JSON matches actual filename
2. Run `npm run cards:verify`
3. Check thumbnails exist: `ls public/static/images/cards/thumbs/`

### Gacha not pulling new cards?
1. Cards must be in cards-v2.json
2. Forge loads from NW_CARDS on page load
3. Hard refresh (Ctrl+Shift+R) to clear cache

### Carousel broken?
1. Uses thumbnails at `/thumbs/*.webp`
2. Run `npm run cards:thumbs` to regenerate
3. Modal uses full resolution from parent folder

## 🔗 Key Code References

| Feature | File | Function |
|---------|------|----------|
| Card Loader | `nw-cards.js` | `NW_CARDS.init()` |
| Carousel | `cards.html` | `loadCardsData()` |
| Gacha | `forge.html` | `loadGachaCards()` |
| Thumb URL | `cards.html` | `getThumbUrl(img)` |
| Full URL | `cards.html` | `getFullUrl(img)` |
