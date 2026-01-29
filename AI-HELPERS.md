# 🤖 NumbahWan Auto-Helper System

> Automatically creates and manages helper scripts based on detected pain points

## Quick Start

```bash
# Detect issues
./scripts/auto-helper.sh detect

# Fix all issues automatically
./scripts/auto-helper.sh fix all

# Quick rebuild
./scripts/auto-helper.sh quick rebuild
```

## Commands

| Command | Description |
|---------|-------------|
| `detect` | Scan for common issues |
| `fix <issue>` | Auto-fix issues (thumbnails, paths, build, all) |
| `list` | List all saved helpers |
| `add <name>` | Add new helper interactively |
| `pain "desc"` | Record a pain point for future automation |
| `quick <cmd>` | Quick commands (rebuild, thumb, verify, stats, port) |

## Saved Helpers

### 1. Thumbnail Generator
- **Problem**: Manual ImageMagick commands needed for each new card image
- **Solution**: Auto-generate WebP thumbnails from PNG/JPG
- **Usage**: `./scripts/card-manager.sh thumbs`

### 2. Card Data Sync
- **Problem**: Card data was hardcoded in multiple files
- **Solution**: Single source: `cards-v2.json` → `NW_CARDS.js` → all pages
- **Usage**: All pages auto-load from cards-v2.json

### 3. Image Path Resolver
- **Problem**: Image paths scattered across multiple folders
- **Solution**: Consolidated to `/static/images/cards/` + `/thumbs/`
- **Paths**:
  - Full resolution: `/static/images/cards/`
  - Thumbnails: `/static/images/cards/thumbs/`

## Auto-Detection Checks

The system automatically checks for:

1. ✅ **Missing thumbnails** - Compares full images vs WebP thumbnails
2. ✅ **Old image paths** - Finds `/static/cards/` references that should be `/static/images/cards/`
3. ✅ **Hardcoded card data** - Detects `const CARDS = [` in HTML files
4. ✅ **cards-v2.json validity** - Ensures master data file exists and is valid

## Recording Pain Points

When you encounter a recurring problem:

```bash
./scripts/auto-helper.sh pain "Description of the problem"
```

This records the issue in `helpers.json` for future automation.

## Files

| File | Purpose |
|------|---------|
| `scripts/auto-helper.sh` | Main helper automation script |
| `scripts/helpers.json` | Stored helpers and pain points |
| `scripts/card-manager.sh` | Card-specific operations |
| `scripts/generated/` | Auto-generated helper scripts |

## Integration with Development

### Before Starting Work
```bash
./scripts/auto-helper.sh detect
```

### After Adding New Cards
```bash
./scripts/auto-helper.sh fix thumbnails
./scripts/auto-helper.sh quick rebuild
```

### When Something Breaks
```bash
./scripts/auto-helper.sh fix all
```

---

*This system learns from our mistakes and automates the fixes!*
