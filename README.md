# NumbahWan

> 116 pages. 62 JS modules. 30 API routes. 3 languages. Zero frameworks. One guild.

A browser-based world built entirely with vanilla JS, Hono, and Cloudflare Workers. What started as a trading card game for a MapleStory guild grew into something we didn't plan: a full interactive experience with its own economy, lore, courtroom, conspiracy board, therapy office, underground vault, and a life-advice oracle that quotes the Buddha and the Quran in the same sentence.

No React. No Vue. No Next. Just HTML files and a lot of stubbornness.

**[Live Site](https://numbahwan.pages.dev)** · **[The Oracle](https://numbahwan.pages.dev/oracle)** · **[Showcase (all 116 pages)](/showcase)**

---

## What's Inside

This repo contains a few things that might be useful to people outside our guild. We built them to solve our own problems, but they work standalone.

### `sentinel.cjs` — Zero-Dependency Codebase Health Scanner

A 1,700-line Node.js script that scores your entire codebase across 10 modules and gives you a letter grade. No install. No config. Just run it.

```bash
node sentinel.cjs
```

```
Composite Score:  72/100 (B-)
Trend:            =0 (stable)  | Build #50

Module Breakdown (10 modules):
    71 B-  architecture   (15%)  10 issues
    54 D   assets         (15%)  22 issues
    46 F   i18n           (10%)  2 issues
   100 A+  deadCode       (10%)
    92 A   security       (15%)  1 issues
    60 C   performance    (10%)  4 issues
    61 C   apiSurface     ( 8%)  3 issues
    80 B+  dependencies   ( 7%)  2 issues
    82 B+  accessibility  ( 5%)  4 issues
    82 B+  seoMeta        ( 5%)  5 issues

Issues: 2 critical · 37 warnings · 14 info
Auto-Fix Engine: 9 fixes available (5 automated, 4 manual)
```

What it checks: file bloat, cyclomatic complexity, dead code, security patterns, missing alt tags, SEO meta, API surface analysis, dependency audit, asset optimization, i18n coverage. It tracks history across builds so you can see trends. It suggests specific fixes. It has an auto-fix mode.

One file. No dependencies. Works on any JS/TS project.

---

### `nw-memory.cjs` — AI Session Memory That Survives Context Resets

If you work with AI assistants (Claude, GPT, Copilot), you know the problem: every session starts from zero. The AI forgets what broke last time, which files change together, and why you made a decision.

This is a 960-line script that fixes that. It records snapshots on every commit (via git hooks), tracks hotspot files, detects coupled changes, logs fix chains, and stores decisions and breakages in plain JSON.

```bash
node nw-memory.cjs --query           # What does the AI need to know right now?
node nw-memory.cjs --premortem battle # What broke last time in this area?
node nw-memory.cjs --broke "i18n" "innerHTML replaced DOM, lost event handlers"
node nw-memory.cjs --decide "battle" "Coach in separate file" "Battle v7 has 5 fix chains"
node nw-memory.cjs --constraint "ios" "touchend + click both fire, use 300ms timeout"
```

Output of `--query`:

```
Total snapshots: 99 | First: 2026-02-05 | Latest: 2026-02-09
Bundle: 536KB | Pages: 116 | JS Modules: 62

Hotspot Files (most frequently changed):
  37x  public/battle.html
  34x  src/index.tsx
  29x  public/static/nw-battle-v7.js

Coupled Files (change together):
  28x  public/battle.html <-> public/static/battle-v7.css
  28x  public/battle.html <-> public/static/nw-battle-v7.js

Recent Fix Chains (commit → immediate fix = fragility):
  fix(battle): Auto-start game when overlay isn't visible on iOS
  fix(emoji): Regex cleanup pattern ate HTML attribute spaces

Known Constraints:
  [ios] touchend + click both fire — use handling flag with 300ms timeout
  [cloudflare] Workers have 10ms CPU limit — no heavy computation
  [i18n] data-i18n uses textContent — use data-i18n-html for content with tags
```

The idea is simple: the AI reads `--query` at session start, runs `--premortem` before touching a sensitive area, and logs `--broke`/`--decide` when things happen. The git hooks record the rest automatically. Next session, all of that context is there.

It's not magic. It's a JSON file and a CLI. But it's the difference between an AI that repeats your mistakes and one that doesn't.

---

### The Oracle — Multilingual Wisdom from 4 Traditions

`/oracle` is a life-advice page that synthesizes Buddhist sutras, Tao Te Ching, Bible, and Quran into a single response. It's designed to be respectful of all four traditions while being genuinely funny and actually helpful.

```
POST /api/oracle/ask
{ "question": "my heart is broken", "language": "zh" }
```

Response (translated, 5-part format):

> **I hear you.** Heartbreak isn't just an emotion — your entire nervous system is screaming that something you relied on has disappeared.
>
> **The Ancient Consensus:**
> - Buddhism (Impermanence): Nothing is permanent — not the relationship, not this pain.
> - Taoism (Water): Water doesn't fight rocks. It flows around them. Then it wears them down.
> - Bible (Ecclesiastes 3:1): There is a season for everything. This is the season of letting go.
> - Quran (94:5-6): With every hardship comes ease. Repeated twice — that's not a typo, that's emphasis.
>
> **The Funny Truth:** Your ex's new relationship will also have that awkward "where should we eat" fight within 3 months. You're not missing much.
>
> **Do This Today:** Write three things about yourself that have nothing to do with them. Tape it to your mirror.
>
> *The Oracle's Seal: This heartbreak proves you're capable of deep feeling. That's not a bug — it's a feature.*

- 20 wisdom entries across 15 life topics, all hand-written in the 5-part format
- Full translations in English, Traditional Chinese (繁體中文), and Thai (ภาษาไทย) — 60 localized wisdoms total
- Keyword matching in all 3 languages (CJK tag matching with score boost)
- LLM enhancement when API key is available, graceful fallback to curated pool when it's not
- Self-hosted fonts, zero external dependencies, 17ms TTFB

---

### i18n Without a Framework

The entire site is trilingual (EN / 繁體中文 / ไทย) using a pattern that's small enough to explain in one paragraph:

Each page has a `translations` object with keys for `en`, `zh`, `th`. HTML elements get a `data-i18n="keyName"` attribute. A 200-line core script (`nw-i18n-core.js`) reads the current language from `localStorage`, applies translations via `textContent`, and listens for a `nw-lang-change` CustomEvent from the nav. That's the whole system.

```html
<h1 data-i18n="title">Welcome</h1>

<script>
NW_I18N.register('myPage', {
  en: { title: 'Welcome' },
  zh: { title: '歡迎' },
  th: { title: 'ยินดีต้อนรับ' }
});
</script>
```

No build step. No extraction pipeline. No ICU message format. Just data attributes and a `CustomEvent`. It covers 116 pages and 3,700+ translation keys.

Is it "correct" by i18n standards? Probably not. Does it work? Yes. Has it broken? Also yes (see `nw-memory.cjs --query` for the stories).

---

## The Actual Game

If you're here for the game and not the tools:

### Trading Card Game
- **125+ cards** across 9 seasons and 6 rarity tiers
- Gacha pack opening with multi-tier pity system
- Card upgrades (1-5 stars), burning duplicates for Sacred Logs currency
- Deck builder, card market, auction house
- AI battle system with stat-boosted combat

### Guild World (the weird part)
We kept building pages because it was fun. At some point it stopped being a card game and became... this:

| Zone | What It Is |
|------|-----------|
| Conspiracy Board | A cork-board with red string connecting guild events |
| Confessional | Anonymous confession booth with AI-generated penance |
| Therapy Office | Guild therapy sessions (satirical) |
| Underground Vault | 13 floors deep, decontamination chamber, legendary misprint card |
| Museum | 10 exhibits of "priceless" pixel artifacts |
| Research Archives | 6 mock-academic papers on in-game economics |
| Cafeteria | Guild cafeteria with a full menu |
| Court | Guild court system for disputes |
| The Oracle | Life advice from 4 sacred traditions (this one's real) |
| Cipher | Encrypted message system |
| Wyckoff Academy | Trading education with real market psychology |
| Parking Lot | Yes, there's a parking lot |

Each page is its own self-contained HTML file with its own CSS and JS. No shared component library. No state management. They're just pages, and they work.

---

## Project Structure

```
NumbahWan/
├── sentinel.cjs              # Codebase health scanner (standalone)
├── nw-memory.cjs             # AI session memory system (standalone)
├── memory.json               # Memory data (auto-generated)
├── src/
│   ├── index.tsx              # Hono app entry point
│   └── routes/                # 30 API route modules
│       ├── oracle.ts          # The Oracle wisdom engine
│       ├── card-engine.ts     # Gacha + pack opening logic
│       ├── wallet-economy.ts  # Currency system
│       ├── confessional.ts    # Anonymous confessions
│       ├── sentinel.ts        # Health report API
│       └── ...
├── public/
│   ├── *.html                 # 116 page files
│   ├── oracle.html            # The Oracle UI
│   ├── lore/                  # 5 lore stories
│   ├── museum/                # 10 museum exhibits
│   ├── research/              # 6 research papers
│   └── static/
│       ├── nw-*.js            # 62 JS modules
│       ├── nw-i18n-core.js    # i18n system
│       ├── nw-nav.js          # Navigation + language switcher
│       ├── images/cards/      # 125 card images
│       ├── fonts/             # Self-hosted fonts (NumbahWan, Inter, Orbitron)
│       └── data/              # 25 JSON data files
└── scripts/                   # 29 build/audit tools
    ├── audit-i18n.cjs         # i18n coverage scanner
    ├── generate-nw-font.py    # Custom pixel font generator
    └── update-roster.cjs      # Guild roster updater
```

## Quick Start

```bash
npm install
npm run build
npm run preview    # or: npx wrangler pages dev dist --port 3000
```

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Cloudflare Workers | Free tier, global edge, 0ms cold start |
| Framework | Hono | 14KB router, runs everywhere |
| Frontend | Vanilla JS | 116 pages, no build step for HTML |
| Build | Vite | SSR bundle for Workers |
| Database | Cloudflare D1 (SQLite) | Free, zero config |
| Fonts | Self-hosted | No external dependencies |
| i18n | Custom (200 lines) | `data-i18n` attributes + `CustomEvent` |
| Process | PM2 (dev) | Local development convenience |

## Scripts

```bash
node sentinel.cjs                    # Run codebase health check
node nw-memory.cjs --query           # Read AI project memory
npm run sentinel                     # Same as above, via npm
npm run build                        # Production build
npm run test                         # Run all tests
node scripts/audit-i18n.cjs          # i18n translation coverage
```

## Numbers

| Metric | Count |
|--------|-------|
| HTML pages | 116 |
| JS modules | 62 |
| API routes | 30 |
| Card images | 125 |
| Translation keys | 3,700+ |
| Languages | 3 (EN, 繁體中文, ไทย) |
| Museum exhibits | 10 |
| Research papers | 6 |
| Lore stories | 5 |
| Oracle wisdoms | 60 (20 x 3 languages) |
| Build scripts | 29 |
| Commits | 530+ |
| External dependencies at runtime | 0 |

## Context

Built for the NumbahWan guild from MapleStory Idle RPG (TW Server). The guild motto is *"We are not just a guild, but FAMILY"* and we meant it — this started as a weekend project to give guild members something fun, and it kept going.

If you find something useful in here, take it. That's what it's for.

---

*Made with love by the NumbahWan family*
