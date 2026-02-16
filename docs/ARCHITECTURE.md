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
