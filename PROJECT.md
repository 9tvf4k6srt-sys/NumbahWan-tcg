# NumbahWan TCG — Project Knowledge

> **One file. Read this first. Everything you need to start working.**
> Last updated: 2026-02-08

---

## MANDATORY: Memory-Driven Workflow

This project has a learning system (`nw-memory.cjs` + `memory.json`). It only works if you use it. These steps are **not optional**.

### On Session Start (BEFORE writing any code)
```bash
node nw-memory.cjs --query           # Read project intelligence first
```
This shows: recent commits, hotspot files, constraints, past breakages, decisions, debt signals. Read it. It prevents repeat mistakes.

### Before Working on Any Area
```bash
node nw-memory.cjs --premortem battle     # or: forge, i18n, nav, economy, etc.
```
This shows what broke last time, hard constraints, and past decisions for that area. If you skip this, you WILL repeat old bugs.

### After Something Breaks or You Revert
```bash
node nw-memory.cjs --broke "area" "what happened and why"
```
Example: `node nw-memory.cjs --broke "emoji" "Regex cleanup pattern ate HTML attribute spaces — never use quote char in cleanup regex"`

### After Making a Non-Obvious Decision
```bash
node nw-memory.cjs --decide "area" "what you chose" "why you chose it"
```
Example: `node nw-memory.cjs --decide "emoji" "Strip emojis instead of replacing with SVG spans" "4329 lines across 152 files — manual SVG replacement would be 10x the work and bloat HTML"`

### After Discovering a Hard Platform Fact
```bash
node nw-memory.cjs --constraint "area" "the fact"
```
Example: `node nw-memory.cjs --constraint "regex" "Never include quote chars in post-strip cleanup patterns — they eat HTML attribute boundaries"`

### On Commit (automatic)
The pre-commit hook runs `node nw-memory.cjs` automatically. It records the snapshot, detects fix chains, updates hotspots and co-change patterns. You don't need to do anything — just commit normally.

### Why This Matters
Each session starts cold. Without `--query`, you have zero context. Without `--premortem`, you repeat old bugs. Without `--broke` and `--decide`, the next session has zero context too. The loop is:

```
query → premortem → work → broke/decide/constraint → commit → (next session reads it)
```

Break the loop and the system is dead weight.

---

## What This Is

A browser-based trading card game / guild hub for the NumbahWan guild (MapleStory Idle RPG, TW Server). Built on Cloudflare Workers + Hono + Vanilla JS. No frameworks. 114 HTML pages, 57 NW_* JS modules, 10 card seasons, 3 languages (EN / 繁體中文 / ไทย). All state in localStorage. All pages are static HTML served via Hono route.

**GitHub**: https://github.com/9tvf4k6srt-sys/NumbahWan-tcg  
**Stack**: Hono (server) + Vite (build) + Cloudflare Pages (deploy) + Vanilla JS + Tailwind CDN  
**Port**: 3000 via `npx wrangler pages dev`

---

## How To Build & Run

```bash
npm run build                          # Vite SSR build → dist/
npx wrangler pages dev dist \
  --d1=GUILD_DB --local \
  --persist-to=.wrangler/state \
  --ip 0.0.0.0 --port 3000            # Dev server on :3000

# Or the shortcut:
npm run dev                            # Same thing
```

After changing files in `public/` or `src/`, rebuild:
```bash
npm run build
# Then restart dev server (kill old wrangler, start new)
```

---

## File Structure (What Matters)

```
src/
  index.tsx            → Hono app, mounts all route modules
  routes/              → API routes (cards, wallet, market, health, etc.)
  services/            → Business logic
  
public/
  *.html               → 90+ top-level pages
  lore/*.html          → 5 lore deep-dive pages
  museum/*.html        → 10 museum exhibit pages
  research/*.html      → 6 research paper pages
  vault/*.html         → 3 vault floor pages
  tabletop/*.html      → 2 tabletop pages
  static/
    nw-*.js            → 57 JS modules (NW_NAV, NW_WALLET, NW_I18N, etc.)
    nw-*.css           → Page-specific and component CSS
    data/              → JSON (cards, config, seasons, lore, etc.)
    images/cards/      → Card art (WebP)
    images/banners/    → Page banners (WebP)
    icons/             → Currency + UI icons
    sounds/            → Audio files
```

---

## Architecture Essentials

### Adding a New Page
1. Create `public/mypage.html`
2. Add page ID to `staticPages` array in `src/routes/pages.ts`
3. Add to nav in `public/static/nw-nav.js` (sections → pages array)
4. Add to `pageHierarchy` in nw-nav.js (for back button)
5. Include i18n: `<script src="/static/nw-i18n-core.js"></script>` + `NW_I18N.register({en:{}, zh:{}, th:{}})`
6. Build & test

### i18n — How It Works
- **Core**: `nw-i18n-core.js` is the ONLY i18n system. Loaded on every page.
- **Per-page translations**: Each page calls `NW_I18N.register({en:{...}, zh:{...}, th:{...}})` in a `<script>` block
- **DOM binding**: Add `data-i18n="keyName"` to elements. Core auto-applies on load + language change.
- **HTML content**: Use `data-i18n-html="keyName"` when translation contains HTML tags
- **Language storage key**: `nw_lang` in localStorage
- **80 pages** use NW_I18N.register correctly. ~13 pages have legacy inline i18n that should be migrated.

### Module Loading
Every page loads these (via `<script>` tags in HTML):
- `nw-i18n-core.js` — Language system
- `nw-nav.js` — Navigation + back button + language toggle
- `nw-wallet.js` — Currency + collection + daily rewards
- `nw-sounds.js` — Audio system
- `nw-guide.js` — AI chat assistant (88KB, loaded on 29 pages)

Page-specific modules (loaded only where needed):
- `nw-forge-engine.js` — Gacha/card pulling
- `nw-battle.js` / `nw-battle-2026.js` — Battle systems
- `nw-arcade-engine.js` — Mini-games
- `nw-card-upgrade.js` — Star levels

### Events (Cross-Module Communication)
```
nw-wallet-ready     → Wallet initialized
nw-currency-change  → Balance changed
nw-card-pulled      → New card acquired
nw-lang-change      → Language switched
nw-card-upgraded    → Card starred up
```

### Currencies
| ID | Name | Symbol | Color | Use |
|----|------|--------|-------|-----|
| nwg | NumbahWan Gold | ◆ | #00d4ff | Premium, governance |
| gold | Gold | ● | #ffd700 | Standard, upgrades |
| sacred-log | Sacred Log | ⧫ | #c97f3d | Ultra rare, gacha fuel |

### Cards
- 10 seasons: `cards.json` (S1), `cards-s2.json` through `cards-s10.json`
- Card fields: `id, name, rarity, set, img, atk, hp, ability, synergy`
- Rarities: Common, Uncommon, Rare, Epic, Legendary, Mythic
- Star system: 1★→5★, requires 1/2/4/8/16 copies
- Physical cards: 50-card "Origins" set, QR codes, claim at `/claim`

---

## Code Conventions

```javascript
// Global modules use NW_ prefix
const NW_WALLET = { ... };

// Pages identify themselves
<body data-page-id="forge">

// i18n: all 3 languages required
NW_I18N.register({
  en: { title: 'Forge' },
  zh: { title: '鍛造' },
  th: { title: 'หลอม' }
});

// Currency operations
NW_WALLET.earn('gold', 100, 'source_name');
NW_WALLET.spend('sacred-log', 1, 'forge_pull');

// Navigation
<body data-page-id="mypage">
// Back button auto-configured via pageHierarchy in nw-nav.js
```

---

## Known Issues & Gotchas

### Bugs You'll Hit
| Issue | Cause | Fix |
|-------|-------|-----|
| iOS touch fires twice | touchend + click both fire | Use flag: `if(handling) return; handling=true; setTimeout(()=>handling=false, 300)` |
| Language toggle doesn't update dynamic content | NW_I18N uses textContent, strips HTML | Use `data-i18n-html` for HTML content, or re-render in `NW_I18N.onChange()` callback |
| Back button goes to black screen | `history.back()` unreliable in SPA-like setup | Always use direct `window.location.href = '/page'` navigation |
| nw-guide.js events lost after lang change | innerHTML replaces DOM, handlers gone | Re-bind events in language change callback |
| Conspiracy board translations need innerHTML | Content has `<strong>`, `<br>` tags | Fixed: uses `NW_I18N.onChange()` + `setTimeout(0)` to re-apply with innerHTML after core applies textContent |

### Things That Look Broken But Aren't
- **GM mode** (`numbahwan-gm-2026`): Gives infinite currency. It's intentional for testing.
- **Sentinel score fluctuates**: It's a static analyzer counting line lengths. Score doesn't reflect real quality.
- **Some pages have no interactivity**: Lore, museum exhibits, research papers — they're intentionally read-only content.

### Actual Technical Debt
- 13 pages still use inline i18n instead of NW_I18N.register
- `nw-guide.js` is 88KB loaded on 29 pages — should be lazy-loaded or made lighter
- `wood` vs `sacred-log` naming inconsistency in some old code
- Some NW_ECONOMY / NW_CURRENCY overlap (two modules describing same currencies)
- Bundle size: 381KB (`dist/_worker.js`) — auto-learn dead code removed, still above 350KB target

---

## Git Workflow

```bash
git checkout genspark_ai_developer
# Make changes
git add -A && git commit -m "type(scope): description"
git push origin genspark_ai_developer
# Create/update PR → main
```

Branch: `genspark_ai_developer` → PR to `main`

---

## Session Log

> Append one line per session. Never rewrite old entries. This is how the system actually learns.

### 2026-02-08 — Cleanup & Learning System
- Audited 11 overlapping "learning" systems (sentinel, auto-learn, auto-helper, debugger, etc.) — none actually learn, total ~374KB dead weight
- Removed: ARCHITECTURE.md, CHANGELOG.md, IMPROVEMENT-LOG.md, NW-CHEATSHEET.md, PROJECT-SNAPSHOT.md, SENTINEL-UPGRADE-PLAN.md, STRATEGIC-LEARNINGS.md, VALUE-ECOSYSTEM-STRATEGY.md, .ai-context.md, .ai-files-auto.txt
- Removed: auto-learn TypeScript services/routes (dead code in bundle), auto-helper.sh, dev-helpers.sh, nw-debugger.sh, page-checklist.sh, helpers.json, optimizations.json, rag-optimizer.cjs, .ai-cache/
- Created this file (PROJECT.md) as single source of truth
- Kept: sentinel.cjs (build tool, useful for audits even if scores are theater), i18n-auto-fix.cjs (useful when it works), ui-validator.js (useful for batch checks)

### 2026-02-08 — Conspiracy i18n Fix
- conspiracy.html: removed broken auto-generated CONSPIRACY_I18N block, unified to CONSPIRACY_TRANSLATIONS via NW_I18N.register, added NW_I18N.onChange() to re-render board on language switch
- lore/conspiracy-board.html: added ~60 missing zh/th translation keys, fixed innerHTML vs textContent conflict with setTimeout(0) trick
- Both pages verified working in all 3 languages

### 2026-02-07 — Battle Arena v7.0
- Complete rewrite: mobile-first, tap-to-play, accessibility-focused
- 117 cards, 12 abilities, 9 set bonuses, 15+ synergies
- Files: nw-battle-v6.js, battle-v6.css (renamed to v7 internally)
- Old battle backed up: battle-old.html, battle-old.css, nw-battle-engine-old.js

### 2026-02-07 — Sentinel Score Optimization
- Score went 54(D) → 67(C) → 75(B) through: image compression (100MB saved), script deferring, lazy loading, security headers
- Created SENTINEL-UPGRADE-PLAN.md (20KB) — useful analysis but the plan itself is scope creep

### 2026-02-06 — Avatar Studio + AI Guide Enhancement
- MapleStory avatar upload → AI art in 8 poses
- Smart AI Guide tracks viewing history
- Full i18n for avatar studio

### Earlier — Foundation
- 10 card seasons, 583 total cards across all seasons
- 70+ pages built (economy, guild, lore, arcade, battle, social)
- Embassy cross-guild system with MatchaLatte sister guild
- Physical card system with QR codes (50-card Origins set)
- Daily rewards, achievements, GM mode, wallet system
- 2026-02-08: Progressive Disclosure Nav v9.0 — reduced Day 1 nav from 80 pages to 6; tier system (0-5) based on wallet stats; unlock toast; existing players auto-detect; all pages still accessible by direct URL; recorded nav constraints and decisions in NW-MEMORY
- 2026-02-08: D&D 5e tabletop stats generator — 117 cards, 12 roles→D&D classes, shrine penalty 90%, 60 star abilities, Sacred Log currency sink
- 2026-02-08: NW-MEMORY system — 3-layer compounding memory (auto-snapshots, decisions, pre-mortem); pre-commit hook; seeded 16 constraints + 8 breakages + 5 decisions; archived 17 legacy files (-374KB dead weight)
- 2026-02-08: Sitewide emoji strip — 5695 emojis removed across 151 files using scripts/strip-emojis.py v5; NW_ICONS SVG system (37 icons: 12 ability + 25 UI) for battle/forge UI; Battle Arena v7.1 (bigger cards, tap-to-zoom, spring-damper physics, Perlin shake)
- 2026-02-08: NW-MEMORY v2 — added --compact (prunes dead files from hotspots/coChanges, deduplicates snapshots, caps at 200/300); auto-compact in pre-commit hook at 200KB; noise filter for archive/dist/memory.json paths; memory.json 975KB→135KB (-86%); recorded emoji regex breakage + 6 decisions + 2 constraints
- 2026-02-08: i18n fix — stripped 3792 [ZH]/[TH] placeholder prefixes across 69 pages; deleted 1.5MB dead i18n JSON reports; rewrote sentinel i18n module (83/B+ lie → 15/F truth); merged dual i18n systems in breakroom.html
- 2026-02-08: Workflow fix — moved NW-MEMORY snapshot from pre-commit to post-commit hook (pre-commit captured previous commit hash, not the new one); pre-commit now only auto-compacts + stages memory.json; post-commit captures real commit hash; .husky/ hooks are the source of truth (core.hooksPath=.husky); tested full cycle — snapshot hash matches HEAD
- 2026-02-08: Battle Coach — Hearthstone-style first-battle tutorial (nw-battle-coach.js); 10 contextual just-in-time steps; MutationObserver-driven (does not touch battle code); highlights target + darkens rest; auto-advances on correct action; localStorage flag prevents re-show; SKIP TUTORIAL always visible; research: Hearthstone scripted tutorial, Marvel Snap FTUE, ACM CHI 2022 just-in-time reminders
- 2026-02-08: Battle Assist v2 — Smart Glow (BEST tag on best hand card, ATK tag on best board attacker), Auto-Target (HIT tag on best enemy target, face glow when face is best), Auto-Play (AUTO button: plays cards + attacks + ends turn automatically); nw-battle-assist.js is separate from battle engine; reads via NW_BATTLE API; skips visuals during coach tutorial; scoring: stat efficiency + ability bonuses + board context + synergy + lethal check
