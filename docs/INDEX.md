# NumbahWan Repository Index

> **For AI models**: Read this file first. It costs ~400 tokens and maps the entire 2,316-file repository.
> Then read only the area-specific `.context.md` you need (~200-500 tokens each).

## Quick Stats

| Metric | Value |
|--------|-------|
| Total files | 2,316 |
| HTML pages | 147 (136,946 lines) |
| TypeScript backend | 65 files (16,072 lines) |
| JS frontend modules | 81 files |
| CSS stylesheets | 18 files |
| JSON data files | 32 + 501 research papers |
| Images | 1,018 (webp/png/jpg/svg) |
| Audio | 31 mp3 |
| Video | 3 mp4 |
| Markdown docs | 39 files |
| Build scripts | 72 (bin/ + tools/ + scripts/) |
| Rust game engine | 43 .rs files |
| SQL migrations | 6 files (907 lines) |

## Directory Map

```
NumbahWan-tcg/
├── src/                    # Hono backend (TypeScript)
│   ├── index.tsx           # Entry point — route registration, middleware
│   ├── routes/             # 31 route files — API endpoints
│   ├── services/           # 14 service files — business logic
│   ├── utils/              # 3 utility modules (cache, i18n, lazyload)
│   ├── __tests__/          # 9 test files (Vitest)
│   ├── types.ts            # Shared type definitions
│   ├── errors.ts           # Error handling
│   ├── logger.ts           # Logging utility
│   └── validation.ts       # Input validation
├── public/                 # Static site — 147 HTML pages + assets
│   ├── *.html              # Top-level pages (119 files)
│   ├── lore/               # 5 lore deep-dive pages
│   ├── museum/             # 10 exhibit pages
│   ├── research/           # 6 research paper pages
│   ├── games/              # 7 game pages (deadrift, voidbloom, etc.)
│   ├── vault/              # 3 vault floor pages
│   ├── world/              # 3 world/game pages
│   ├── tabletop/           # 2 D&D pages
│   ├── dev/                # 2 dev dashboards
│   └── static/             # All static assets (see below)
├── public/static/          # Frontend assets
│   ├── *.js                # 81 JS modules (nw-*.js pattern)
│   ├── *.css               # 18 stylesheets
│   ├── helpers/            # 8 shared JS helpers (nw-core, nw-ui, etc.)
│   ├── data/               # 32 JSON data files (cards, roster, config)
│   ├── research-data/      # 501 research paper JSONs
│   ├── images/             # Card art, about, banners, battles, etc.
│   ├── game/               # 200+ game concept art images
│   ├── s2/                 # Season 2 card images + thumbs
│   ├── agents/             # 6 AI agent avatars
│   ├── coins/              # 7 coin images
│   ├── icons/              # App icons + investment SVGs
│   ├── audio/              # 21 battle sound effects
│   ├── sounds/gacha/       # 10 gacha sound effects
│   ├── video/              # 3 cinematic videos
│   ├── fonts/              # 4 font files (NumbahWan, Inter, Orbitron)
│   ├── suites/             # 6 hotel suite images
│   └── tabletop/           # 5 tabletop images
├── docs/                   # Documentation (markdown)
│   ├── INDEX.md            # ← YOU ARE HERE
│   ├── PAGES-MAP.md        # All 147 pages with titles and line counts
│   ├── API-ROUTES.md       # All backend API endpoints
│   ├── DATA-MODELS.md      # All 32 JSON data schemas
│   ├── ARCHITECTURE.md     # System architecture overview
│   ├── AI-README.md        # AI workflow documentation
│   ├── CARD_BIBLE.md       # Card system complete reference
│   ├── UI-STANDARDS.md     # Design system and UI patterns
│   └── ... (22 docs total)
├── bin/                    # CLI tools (18 .cjs files, 7,115 lines)
├── tools/                  # Dev tools (19 files, 8,267 lines)
├── scripts/                # Build scripts (21 files, 6,401 lines)
├── tests/                  # Integration tests (7 .cjs files, 4,303 lines)
├── migrations/             # D1 database schemas (6 .sql files)
├── pipeline/               # Trailer/cinematic pipeline
├── nwge-engine/            # Rust game engine (11 crates)
├── nwge-web/               # Game engine web frontend
├── nwge/                   # JS game engine core
├── templates/              # Page generation templates
├── references/             # Reference images
├── specs/                  # Engine brainstorm specs
├── memory/                 # AI session memory
├── .mycelium/              # Mycelium learning system state
├── .mycelium-mined/        # Mined patterns and intelligence
├── .github/                # Issue templates, PR template
└── .husky/                 # Git hooks (pre-commit, post-commit, post-merge)
```

## Key Context Files (read order for AI sessions)

1. **`CLAUDE.md`** (465 lines) — Session protocol, anti-stall rules, mandatory checklist
2. **`.nw-context`** — Auto-generated health report, rules, patterns, learnings
3. **`docs/INDEX.md`** — This file (repo map)
4. **`docs/ARCHITECTURE.md`** — System architecture
5. **Area-specific `.context.md`** — Per-directory context (see below)

## Area Context Files

| File | Purpose | Tokens |
|------|---------|--------|
| `src/.context.md` | Backend routes, services, types | ~300 |
| `public/.context.md` | All 147 pages, static assets | ~400 |
| `docs/.context.md` | Documentation index | ~200 |
| `bin/.context.md` | CLI tools overview | ~200 |
| `tools/.context.md` | Dev tools overview | ~200 |
| `scripts/.context.md` | Build scripts overview | ~200 |
| `pipeline/.context.md` | Cinematic pipeline | ~150 |
| `nwge-engine/.context.md` | Rust game engine | ~200 |
| `migrations/.context.md` | Database schema | ~200 |
| `tests/.context.md` | Test suites | ~150 |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Hono (TypeScript) on Cloudflare Workers |
| Frontend | Vanilla JS, no framework |
| Styling | Tailwind (CDN) + custom CSS |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2, KV |
| AI | OpenAI API (Oracle, Cipher, NPC Chat) |
| Game Engine | Rust (nwge-engine) + JS (nwge-web) |
| CI/CD | Wrangler deploy to Cloudflare Pages |
| Quality | Mycelium (auto-learning), Sentinel (health scoring) |
| i18n | 3 languages (EN, ZH, TH) |

## Deployment

- **Production**: https://numbahwan.pages.dev
- **GitHub**: https://github.com/9tvf4k6srt-sys/NumbahWan-tcg
- **Build**: `npm run build` → Vite SSR → `dist/_worker.js`
- **Deploy**: `npm run deploy` → Wrangler Pages
