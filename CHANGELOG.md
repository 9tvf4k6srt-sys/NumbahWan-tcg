# NumbahWan TCG Changelog

> All notable changes to this project are documented here.
> For full patch notes with translations, see `/updates` page.

---

## [2.1.1] - 2026-02-02

### Added
- **Card Upgrade System v1.0** (`nw-card-upgrade.js`)
  - Star levels: 1★ (base) → 2★ → 3★ → 4★ → 5★ (max)
  - Duplicate requirements: 1, 2, 4, 8, 16 total copies
  - Stat boosts: +15%/+30%/+50%/+75% ATK/HP per star
  - Burn cards for Sacred Logs by rarity × star

- **Architecture Overhaul**
  - `ARCHITECTURE.md` - Full system documentation
  - `nw-boot.js` - Module initialization system
  - `nw-storage.js` - Unified localStorage wrapper
  - `nw-errors.js` - Centralized error handling
  - `templates/page-template.html` - Standard page boilerplate

### Fixed
- Guide title showing `ui.title` instead of translated text
- Guide suggestions not responding to clicks
- Daily reward claim showing no feedback when already claimed
- Collection page not reading cards from NW_WALLET

### Changed
- Guide now works without NW_CONFIG (fallback data)
- Daily claim button shows disabled state with timer

---

## [2.1.0] - 2026-02-02 - The Absurdist Update

### Added
- Guild Supreme Court (`/court`) - Sue your guildmates!
- Guild Therapy (`/therapy`) - AI diagnoses gaming trauma
- HR Department (`/hr`) - 100% rejection rate guaranteed
- Conspiracy Board (`/conspiracy`) - Cork board evidence system
- Economy Auto-Balancer - Monitors and adjusts pricing

---

## [2.0.0] - 2026-01-28 - The Economy Update

### Added
- Unified Wallet System - One wallet across all pages
- Daily Login Rewards - 7-day cycle with Sacred Log on Day 7
- Achievement System - 50+ achievements
- GM Testing Mode - Infinite resources for testing

---

## [1.5.0] - 2026-01-20 - The Content Expansion

### Added
- AI Chat Guide - Floating assistant on all pages
- Card browser seasons 2-10
- Trilingual support (EN/中文/ไทย)

---

## Quick Reference

### Key Files Modified Recently
| File | Last Change |
|------|-------------|
| `public/static/nw-card-upgrade.js` | Card upgrade system |
| `public/static/nw-guide.js` | Fixed translations & fallback |
| `public/collection.html` | Upgrade modal UI |
| `public/wallet.html` | Daily claim feedback |
| `public/static/nw-config.js` | Patch notes data |

### Pending Work
- [ ] Implement card rental/staking for 5★ cards
- [ ] Seasonal rebalancing system
- [ ] Fusion system (combine 2 Legendary → unique 5★)
- [ ] Card retirement (vintage badge, tradable only)
- [ ] Cross-player trading

---

*Auto-generated from git commits and NW_CONFIG patches*
