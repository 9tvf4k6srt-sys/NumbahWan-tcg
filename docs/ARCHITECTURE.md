# Architecture

## System Overview

NumbahWan is a browser-based TCG deployed on Cloudflare's edge network. The architecture prioritizes zero-dependency portability, page-level isolation, and AI-agent interoperability.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                              │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Pages (CDN)  │  │   Workers    │  │         KV Store         │  │
│  │  92 HTML     │  │  Hono + TS   │  │  PCP memory, sessions,   │  │
│  │  62 JS mods  │  │  30 routes   │  │  agent learnings, cache  │  │
│  │  Card data   │  │  PCP API     │  └──────────────────────────┘  │
│  └──────┬───────┘  └──────┬───────┘             │                  │
│         │                 │          ┌──────────┴───────────┐      │
│         │                 ├──────────│    D1 (SQLite)       │      │
│         │                 │          │  Guild data, market,  │      │
│         │                 │          │  player inventory     │      │
│         └────────┬────────┘          └──────────────────────┘      │
└──────────────────┼──────────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │   AI Agent Layer    │
        │                     │
        │  PCP discovery      │
        │  /.well-known/pcp   │
        │  /api/pcp/brief     │
        │  /api/pcp/onboard   │
        │  /api/pcp/memory    │
        └─────────────────────┘
```

## Frontend Architecture

### Design Principle: Page-Level Isolation

Each of the 92 pages is a self-contained HTML file with inline critical CSS and deferred shared module loading. There is no SPA router, no virtual DOM, no build-time bundling.

This is deliberate:
- **Blast radius**: When `cards.html` breaks, nothing else breaks. The failure is isolated to one file.
- **Deployability**: Any single page can be updated independently without rebuilding the project.
- **AI-friendliness**: An AI agent can read, understand, and modify one file without needing context about the entire application.
- **Performance**: No JavaScript framework overhead. First meaningful paint under 200ms on mobile.

### Shared Modules

62 JavaScript modules provide reusable functionality without coupling:

| Module | Responsibility |
|--------|---------------|
| `nw-cards.js` | Card data loading, season management, lazy loading |
| `nw-card-renderer.js` | Card rendering, frame styles, rarity effects |
| `nw-battle-engine.js` | Real-time battle simulation, damage calculation, ability resolution |
| `nw-i18n.js` | Runtime internationalization (EN, ZH, TH) with key validation |
| `nw-nav.js` | Navigation, routing, page transitions |
| `nw-game-juice.js` | Animations, particle effects, haptic feedback |
| `nw-tokens.css` | Design tokens — colors, spacing, typography as CSS custom properties |

### Card Data Pipeline

```
583 cards across 10 season JSON files
    ↓
nw-cards.js (lazy-loads per season on demand)
    ↓
nw-card-renderer.js (renders card frames, applies rarity effects)
    ↓
HTML canvas or DOM nodes (depending on context: browse, battle, forge)
```

Each card has: id, name, rarity, season, attack, defense, ability, lore text, art URL, and localized strings for 3 languages.

## Backend Architecture

### Hono on Cloudflare Workers

30 TypeScript route handlers running at the edge. Key routes:

| Route Group | Endpoints | Purpose |
|------------|-----------|---------|
| `/api/pcp/*` | 17 | Project Context Protocol — agent interop |
| `/api/agent/*` | 17 | Legacy PCP aliases (backward compatible) |
| `/api/guild/*` | 4 | Guild data, roster, stats |
| `/api/market/*` | 3 | Card marketplace, pricing |
| `/api/oracle/*` | 2 | Oracle wisdom engine |

### Data Layer

| Store | Technology | Contents |
|-------|-----------|----------|
| D1 | SQLite at edge | Guild roster, market listings, player inventories, card ownership |
| KV | Key-value at edge | PCP memory (agent learnings, session state), cached responses, rate limits |
| Static | Pages CDN | Card JSON, images, HTML pages |

## AI-Agent Interoperability (PCP)

The Project Context Protocol implementation in `src/routes/agent.ts` (488 lines) exposes 17 endpoints at 4 compliance levels.

### Request Flow

```
Agent                         NumbahWan
  │                               │
  ├─ GET /.well-known/pcp.json ──→│  Discovery: endpoints, capabilities, token budgets
  │←── 200 JSON ──────────────────┤
  │                               │
  ├─ GET /api/pcp/brief ─────────→│  209 tokens: stack, status, constraints
  │←── 200 JSON ──────────────────┤
  │                               │
  ├─ POST /api/pcp/onboard ──────→│  ~6K tokens: rules, tasks, memory, tools
  │    {agent, goals[]}           │
  │←── 200 JSON ──────────────────┤
  │                               │
  ├─ POST /api/pcp/memory ───────→│  Store learnings for next session
  │    {key, value, context}      │
  │←── 200 JSON ──────────────────┤
```

Every response includes `_pcp.tokens` — the approximate token cost of the response body — so agents can budget their context window.

## Health & Quality Systems

### Sentinel (`sentinel.cjs`)

A standalone, zero-dependency codebase health scanner. Scores 10 modules:

| Module | What It Checks |
|--------|---------------|
| Architecture | File organization, separation of concerns, dead code |
| Assets | Image optimization, format selection, lazy loading |
| i18n | Translation completeness, key consistency, missing strings |
| Dead Code | Unused files, duplicate content (md5 comparison) |
| Security | Dependency audit, input validation, CSP headers |
| Performance | Bundle size, render-blocking resources, image dimensions |
| API Surface | Endpoint documentation, error handling, rate limiting |
| Dependencies | Version currency, known vulnerabilities |
| Accessibility | ARIA labels, semantic HTML, color contrast |
| SEO | Meta tags, Open Graph, structured data |

### Mycelium

See [README.md](../README.md#mycelium--self-healing-codebase) for the full breakdown. Key architectural decision: Mycelium stores all state in `.mycelium/memory.json` — a single JSON file that represents the entire learning history. This makes it trivially portable and diffable in git.

## Build & Deploy

```bash
npm run build              # Vite build → dist/
npm run deploy:prod        # Cloudflare Pages deploy
node sentinel.cjs          # Health check
node mycelium-eval.cjs     # Learning system evaluation
node tests/run-tests.cjs   # Full test suite
```

### Deployment Pipeline

```
git push origin main
    ↓
GitHub Actions
    ↓
Vite build (static assets → dist/)
    ↓
Cloudflare Pages deploy
    ↓
Workers routes live at edge
    ↓
D1 + KV available to Workers
```

## Languages

| Language | Coverage | Code |
|----------|----------|------|
| English | Full | `en` |
| Traditional Chinese | Full | `zh` |
| Thai | Full | `th` |

Every user-facing string uses `data-i18n` attributes and `NW_I18N.register()` for runtime translation. The `nw-i18n-guard.cjs` test validates that all keys resolve in all 3 languages.

---

Last updated: 2026-02-16


---

# Appendix: Working Reference (moved from CLAUDE.md 2026-07-02)

> Operational detail an AI session needs when touching these areas.
> The high-level system overview is above; this is the hands-on layer.


### Stack
- **Backend**: Hono (TypeScript) on Cloudflare Pages (Workers runtime)
- **Frontend**: 94 static HTML pages in `public/`, each with inline JS
- **Routing**: `src/routes/pages.ts` — Hono routes serve HTML files (ASSETS in prod, fs.readFileSync in dev)
- **Dev server**: `serve.cjs` (Node.js static server with clean URL support, port 3000)
- **Build**: Vite + @hono/vite-build + @hono/vite-dev-server
- **Deploy**: `wrangler pages deploy dist/` (Cloudflare Pages)
- **DB**: Cloudflare D1 (GUILD_DB binding), KV (MARKET_CACHE binding)

### Key Files (DO NOT break these)
| File | Purpose | Size |
|------|---------|------|
| `public/static/nw-nav.js` | Universal nav (hamburger menu, lang toggle, progressive disclosure) | 1283 lines |
| `public/static/nw-i18n-core.js` | i18n system (register translations, apply to DOM, event-driven) | 387 lines |
| `public/static/nw-wallet.js` | Wallet/economy (NWG currency, daily rewards, achievements) | 2119 lines |
| `src/index.tsx` | Hono app entry — mounts all API routes + security headers | ~200 lines |
| `src/routes/pages.ts` | Clean URL routing — serves `public/*.html` for `/<page>` URLs | ~140 lines |
| `serve.cjs` | Dev static server — clean URLs, MIME types, port 3000 | ~65 lines |

### i18n System — HOW IT WORKS
1. **nw-i18n-core.js** is the single source of truth for language state
   - Storage key: `nw_lang` (also syncs to legacy keys: `lang`, `preferred_lang`)
   - Supported languages: `en`, `zh`, `th`
   - Auto-initializes on DOMContentLoaded
   - Applies translations to `[data-i18n]`, `[data-i18n-html]`, `[data-i18n-placeholder]`, `[data-i18n-title]`
2. **Pages register translations** via `NW_I18N.register({ en: {...}, zh: {...}, th: {...} })`
   - Backward-compatible alias: `initI18n(translations)` → calls `NW_I18N.register()`
3. **Nav dispatches these events on language change**:
   - `nw-lang-change` (on both `document` and `window`) ← THIS IS THE CORRECT EVENT NAME
   - `languageChanged` (on `document`) ← legacy
4. **nw-i18n-core.js listens** for `nw-lang-change` and `languageChanged` → calls `setLang()` → `_applyTranslations()`
5. **Pages listen** for `nw-lang-change` on `window` for custom rendering updates

### ⚠️ KNOWN PAST BUG: Event Name Mismatch
Some pages had `nw-language-change` (wrong) instead of `nw-lang-change` (correct).
The nav dispatches `nw-lang-change`. If a page listens for `nw-language-change`, it won't react.
FIXED in Feb 2026. If you see `nw-language-change` in any page, it's a bug — change to `nw-lang-change`.

### ⚠️ KNOWN PAST BUG: injectNav() Destroys Open Menu
`NW_NAV.injectNav()` removes ALL nav DOM elements and recreates them. If called while the nav
panel is open (e.g., during language switch), the menu disappears because the new panel lacks
the `.open` class. FIXED: language change now updates button states in-place without calling
`injectNav()`.

### Nav System — Progressive Disclosure
- `NW_NAV` in `nw-nav.js` manages all navigation
- Tier system (0-5): sections unlock based on play stats (pullsMade, gamesPlayed, collection size)
- All pages always accessible by direct URL (only nav visibility changes)
- URL `?tier=5` forces showing everything (for testing)
- Language buttons (`.nw-lang-btn`) are inside the nav panel
- Page-level `.lang-btn` buttons are dead code from old system — nav handles all language switching now

### Clean URL Routing
- Production (Cloudflare): `c.env.ASSETS.fetch()` serves HTML
- Dev (serve.cjs): reads `public/<page>.html` from disk for `/<page>` requests
- Vite dev server: `src/routes/pages.ts` uses `fs.readFileSync` fallback when no ASSETS binding
- ALL 94 pages accessible as both `/<page>` and `/<page>.html`

### NWG Economy (reference)
- $1 USD = 100 NWG (fixed)
- Total supply: 1,000,000,000 NWG (burns reduce supply)
- 1 NWG = 10 Gold; converting 100 NWG → Gold costs 2 NWG fee (100 NWG → 980 Gold)
- Signup: 100 NWG; Daily login: up to 70 NWG/day (7-day streak); Referral: 100 NWG
- Staking: 30% of supply in rewards pool, 10% early unstaking penalty

### Dev Server Quick Start
```bash
# Start dev server (simple static, recommended for sandbox)
cd /home/user/webapp && node serve.cjs &
# Access at http://localhost:3000/markets, /treasury, /buy, etc.

# OR: Start Vite dev server (with HMR, API routes)
cd /home/user/webapp && npx vite --port 3000 --host 0.0.0.0
# Note: Vite needs node_modules installed (npm install)

# Test all routes
for p in markets treasury buy restaurant services; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/$p) /$p"
done
```

### 🧠 User Preferences & Workflow (auto-learned, session-persistent)
**Updated**: 2026-02-14

#### Design Preferences
- **Quality bar**: "AAA-looking" — not flat/minimal. Game-icons.net level detail but more premium
- **SVG icons**: Must be "full-on beautiful drawings using SVG", intricate, detailed, comparable to professional game UI
- **Style**: Fantasy RPG, golden gradients, glow effects, premium feel
- **Acceptable**: AI-generated WebP backgrounds behind feature cards
- **Unacceptable**: Simple/flat emoji-style SVGs, minimalist line icons

#### Communication Preferences
- **Proactive links**: Always share live URLs without being asked
- **Batch review > drip-feed**: Show everything at once (dashboard), not one screenshot at a time
- **Decision style**: "Let me see it first, then I'll tell you what to fix"
- **Efficiency-first**: Minimize back-and-forth messages; build tools to reduce friction
- **Self-improving**: Compound knowledge across sessions; auto-detect and fix workflow friction

#### Workflow Preferences
- **Review Dashboard**: `/dev/icon-review.html` — all icons at large scale with approve/flag buttons
- **Screenshot Helper**: `dev-screenshot.cjs` — quick section screenshots (`node dev-screenshot.cjs [section]`)
- **Batch feedback**: User flags icons on dashboard → pastes feedback → AI fixes all at once
- **Auto-commit**: Background watcher for change batching

#### Friction Points Identified (keep reducing these)
1. ~~Screenshot round-tripping~~ → SOLVED: Review Dashboard
2. ~~"Give me the link"~~ → SOLVED: Proactive URL sharing
3. ~~Section-by-section review~~ → SOLVED: All-in-one dashboard
4. ~~No old vs new comparison~~ → SOLVED: Before/after on dashboard
5. Icon quality iteration loop → PARTIALLY SOLVED: Large 96px previews help, but SVG detail level needs upgrading

### GitHub Workflow
- Branch: `genspark_ai_developer`
- PR: #42 (feat(nwg): What is NWG? intro + economy + fixes)
- Repo: https://github.com/9tvf4k6srt-sys/NumbahWan-tcg
- Always: `setup_github_environment` before push (token refresh)
