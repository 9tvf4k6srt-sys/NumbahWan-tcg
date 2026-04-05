# AI Agent Onboarding — Consolidated Guide

> **Purpose**: Single entry point for any AI agent working on this repo.
> Replaces 7 previous AI docs (2,660 lines) with one focused reference.
>
> **Read order**: `CLAUDE.md` (session protocol) → this file → `docs/INDEX.md` (repo map)

---

## 1. Two Brands, One Repo

This repo serves **two distinct brands** under the NumbahWan Group umbrella.
**Never merge their aesthetics.**

### Brand A: NumbahWan (NW) — Guild / TCG / Game
| Key | Value |
|-----|-------|
| Design | Golden Age MMORPG (EverQuest/RO/Lineage) |
| Color | Ember orange `#ff6b00`, bg `#0a0a0f` |
| Font | Cinzel + Inter |
| Currency | $NWG (NumbahWan Gold) |
| Pages | 119 HTML pages |

### Brand B: Rulai Temple (如來寺) — Buddhist Temple
| Key | Value |
|-----|-------|
| Design | Sacred Tibetan Buddhist |
| Color | Gold `#d4a853`, maroon `#5c1a2a` |
| Font | Noto Serif TC + Sarabun |
| Languages | ZH (primary), EN, TH |
| Entry | via Hono `src/index.tsx` |

---

## 2. Stack & Architecture

| Layer | Tech |
|-------|------|
| Backend | Hono on Cloudflare Workers |
| Frontend | Vanilla JS, Tailwind CDN |
| Database | Cloudflare D1 (SQLite) |
| Build | Vite → `dist/_worker.js` |
| Deploy | `npm run deploy` → Cloudflare Pages |
| Quality | Mycelium (learning system), Sentinel (health scoring) |
| i18n | EN, ZH, TH — all required |

## 3. Quick Commands

```bash
# Build & start
npm run build && pm2 restart rulai-temple --silent

# Deploy
npm run deploy

# Health check
node sentinel.cjs --health

# Memory query
node mycelium.cjs --query

# Run tests
npx vitest && node tests/run-tests.cjs
```

## 4. Critical Rules

**From .nw-context (enforced by pre-commit hooks):**

- All 3 languages required in every i18n call
- Cloudflare Workers: 10ms CPU limit, no fs/path
- D1 is SQLite: no ALTER COLUMN, 1MB response limit
- Battle must always give rewards (even loss = 10 Gold)
- Cards.html is thin shell — all JS in nw-cards-page.js
- nw-battle-coach.js loads AFTER nw-battle-v7.js
- iOS: touchend + click both fire — use handling flag
- Always `--ip 0.0.0.0` for sandbox dev servers
- `setup_github_environment` BEFORE any git push
- VALUE GATE: before multi-file changes, ask "What metric improves?"

## 5. Common Tasks

### Add a new page
```bash
node bin/page-gen.cjs --name my-page --title "My Page"
```

### Add a new card
Edit `public/static/data/cards-v2.json`, add image to `public/static/images/cards/`

### Edit temple content
Edit `content/*.md` → `npm run content` → `npm run build`

### Translate text
All HTML elements need: `data-i18n="key"` + entries in `nw-i18n-core.js`

### Run pre-flight checks
```bash
node sentinel.cjs --ci
```

## 6. Fragile Files (change with extra care)

| File | Changes | Breakages | Reason |
|------|---------|-----------|--------|
| public/cards.html | 33x | 10x | Complex card rendering |
| public/battle.html | 43x | 7x | Battle system DOM |
| public/static/nw-battle-engine.js | — | 5x | Init order sensitive |
| public/events.html | — | 4x | i18n conflicts |
| src/index.tsx | 36x | — | Route registration hub |

## 7. Previous AI Docs (archived)

The following docs existed separately and are now consolidated here:
- `docs/AI-README.md` — Project overview for AI assistants
- `docs/AI-HANDOFF.md` — Card data mappings
- `docs/AI-HELPERS.md` — Auto-helper system
- `docs/AI-WORKFLOWS.md` — Internal workflows
- `docs/AI_CONTEXT.md` — Quick reference (had stale sandbox URLs)
- `docs/AI-AVATAR-WORKFLOW.md` — Avatar art generation workflow
- `AGENT-CONTEXT.md` — Agent onboarding (two-brand info preserved above)

These files remain in the repo for historical reference but this file is the canonical source.

## 8. Repo Navigation

See `docs/INDEX.md` for the complete repo map including:
- Directory structure and file counts
- Area-specific `.context.md` files
- All 147 pages mapped
- All API routes documented
- All data models described
