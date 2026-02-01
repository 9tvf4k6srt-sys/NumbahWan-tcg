# 🤖 NumbahWan Auto-Helper & Debugger System

> Automatically creates helpers, debugs issues, and optimizes your project

## Quick Start

```bash
# Full project analysis
npm run debug

# Auto-fix all issues
npm run debug:fix

# Optimize everything
npm run debug:optimize

# Generate health report
npm run debug:report
```

## 🔧 Auto-Debugger (NEW!)

The **NW-Debugger** is an intelligent system that analyzes and optimizes your entire project.

### Analysis Categories

| Category | What It Checks |
|----------|----------------|
| **Structure** | Directory layout, orphan files, required folders |
| **Data** | JSON validity, duplicate data, consolidation opportunities |
| **Assets** | Image count, thumbnails, large files, optimization |
| **Code** | Debug statements, hardcoded values, TODO/FIXME, patterns |
| **Performance** | Bundle size, lazy loading, render-blocking resources |
| **Security** | Exposed secrets, .gitignore, sensitive files |

### Commands

```bash
# Full analysis (all categories)
./scripts/nw-debugger.sh analyze

# Auto-fix all detected issues
./scripts/nw-debugger.sh fix

# Optimize images, code, and data
./scripts/nw-debugger.sh optimize

# Generate markdown health report
./scripts/nw-debugger.sh report

# Individual checks
./scripts/nw-debugger.sh structure
./scripts/nw-debugger.sh data
./scripts/nw-debugger.sh assets
./scripts/nw-debugger.sh code
./scripts/nw-debugger.sh perf
./scripts/nw-debugger.sh security
```

### NPM Shortcuts

```bash
npm run debug           # Full analysis
npm run debug:fix       # Auto-fix all
npm run debug:optimize  # Optimize everything
npm run debug:report    # Health report
npm run debug:security  # Security check
npm run debug:perf      # Performance check
```

### What Auto-Fix Does

1. **Thumbnails** - Generates missing WebP thumbnails
2. **Image Paths** - Updates old `/static/cards/` → `/static/images/cards/`
3. **Git Config** - Ensures `.gitignore` has required entries
4. **JSON Validation** - Validates all JSON files
5. **Rebuild** - Runs `npm run build` to compile changes

---

## 🛠️ Auto-Helper System

The original helper system for recording and reusing solutions.

### Commands

| Command | Description |
|---------|-------------|
| `detect` | Scan for common issues |
| `fix <issue>` | Auto-fix issues (thumbnails, paths, build, all) |
| `list` | List all saved helpers |
| `add <name>` | Add new helper interactively |
| `pain "desc"` | Record a pain point for future automation |
| `quick <cmd>` | Quick commands (rebuild, thumb, verify, stats, port) |

### NPM Shortcuts

```bash
npm run helper          # Show help
npm run helper:detect   # Scan for issues
npm run helper:fix      # Fix all issues
npm run helper:rebuild  # Quick rebuild
```

---

## 📋 Saved Helpers

### 1. Thumbnail Generator
- **Problem**: Manual ImageMagick commands needed for each new card image
- **Solution**: Auto-generate WebP thumbnails from PNG/JPG
- **Usage**: `./scripts/card-manager.sh thumbs` or `npm run cards:thumbs`

### 2. Card Data Sync
- **Problem**: Card data was hardcoded in multiple files
- **Solution**: Single source: `cards-v2.json` → `NW_CARDS.js` → all pages
- **Usage**: All pages auto-load from cards-v2.json

### 3. Image Path Resolver
- **Problem**: Image paths scattered across multiple folders
- **Solution**: Consolidated to `/static/images/cards/` + `/thumbs/`

---

## 🔄 Recommended Workflow

### Before Starting Work
```bash
npm run debug          # Check project health
```

### After Making Changes
```bash
npm run debug:fix      # Fix any issues
npm run build          # Rebuild
pm2 restart numbahwan-guild
```

### After Adding New Cards
```bash
npm run cards:thumbs   # Generate thumbnails
npm run debug:fix      # Ensure everything is correct
```

### When Something Breaks
```bash
npm run debug          # Diagnose the issue
npm run debug:fix      # Auto-fix
npm run debug:report   # Get detailed report
```

### Recording Problems for Future
```bash
./scripts/auto-helper.sh pain "Description of recurring problem"
```

---

## 📁 Files

| File | Purpose |
|------|---------|
| `scripts/nw-debugger.sh` | Main debugger/optimizer |
| `scripts/auto-helper.sh` | Helper automation script |
| `scripts/helpers.json` | Stored helpers and pain points |
| `scripts/optimizations.json` | Optimization rules and history |
| `scripts/card-manager.sh` | Card-specific operations |
| `scripts/reports/` | Generated health reports |

---

## 📊 Health Report Example

```
# NumbahWan Project Health Report
Generated: 2026-01-29 11:30:00

## Summary

| Category | Issues | Status |
|----------|--------|--------|
| Structure | 0 | ✅ |
| Data | 0 | ✅ |
| Assets | 0 | ✅ |
| Code | 0 | ✅ |
| Performance | 2 | ⚠️ |
| Security | 0 | ✅ |

**Total Issues: 2**
```

---

*This system learns from mistakes and automates the fixes!*
