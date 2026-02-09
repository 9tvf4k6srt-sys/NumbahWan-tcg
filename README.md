<div align="center">

# NumbahWan

### 116 pages. 62 JS modules. 30 API routes. 3 languages. Zero frameworks.

A browser-based world built entirely with **vanilla JS**, **Hono**, and **Cloudflare Workers**.<br>
No React. No Vue. No Next. Just HTML files and a lot of stubbornness.

[![Live Site](https://img.shields.io/badge/Live-numbahwan.pages.dev-ff9500?style=for-the-badge&logo=cloudflare&logoColor=white)](https://numbahwan.pages.dev)
[![The Oracle](https://img.shields.io/badge/Try-The%20Oracle-ffd700?style=for-the-badge&logo=sparkles&logoColor=black)](https://numbahwan.pages.dev/oracle)
[![Showcase](https://img.shields.io/badge/Browse-All%20116%20Pages-333?style=for-the-badge)](https://numbahwan.pages.dev/showcase)

<br>

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Pages](https://img.shields.io/badge/HTML%20pages-116-ff6b00)](https://numbahwan.pages.dev/showcase)
[![JS Modules](https://img.shields.io/badge/JS%20modules-62-ffd700)](https://numbahwan.pages.dev/showcase)
[![API Routes](https://img.shields.io/badge/API%20routes-30-00d4ff)]()
[![i18n](https://img.shields.io/badge/languages-EN%20%7C%20繁中%20%7C%20ไทย-28a745)]()
[![Zero Frameworks](https://img.shields.io/badge/frameworks-zero-e8e0d8)]()

</div>

---

## Standalone Tools

This repo contains two standalone tools that work on **any** project. No install, no config — just download and run.

### `sentinel.cjs` — Zero-Dependency Codebase Health Scanner

> One file. No dependencies. Works on any JS/TS project.

```bash
# Try it on your own project right now:
curl -O https://raw.githubusercontent.com/9tvf4k6srt-sys/NumbahWan-tcg/main/sentinel.cjs
node sentinel.cjs
```

<details>
<summary><b>See output</b> — 10 modules scored, letter grade, auto-fix suggestions</summary>

```
┌─────────────────────────────────────────────────────────┐
│  NW-SENTINEL v2.5 — Codebase Health Report              │
├─────────────────────────────────────────────────────────┤
│  Composite Score:  72/100 (B-)                          │
│  Trend:            =0 (stable)  | Build #50             │
├─────────────────────────────────────────────────────────┤
│  Module Breakdown (10 modules):                         │
│      71 B-  architecture   (15%)  10 issues             │
│      54 D   assets         (15%)  22 issues             │
│      46 F   i18n           (10%)  2 issues              │
│     100 A+  deadCode       (10%)                        │
│      92 A   security       (15%)  1 issues              │
│      60 C   performance    (10%)  4 issues              │
│      61 C   apiSurface     ( 8%)  3 issues              │
│      80 B+  dependencies   ( 7%)  2 issues              │
│      82 B+  accessibility  ( 5%)  4 issues              │
│      82 B+  seoMeta        ( 5%)  5 issues              │
├─────────────────────────────────────────────────────────┤
│  Issues: 2 critical · 37 warnings · 14 info            │
│  Auto-Fix Engine: 9 fixes available (5 auto, 4 manual) │
└─────────────────────────────────────────────────────────┘
```

What it checks: file bloat, cyclomatic complexity, dead code, security patterns, missing alt tags, SEO meta, API surface analysis, dependency audit, asset optimization, i18n coverage. Tracks history across builds. Suggests specific fixes. Has an auto-fix mode.

</details>

---

### `nw-memory.cjs` — AI Session Memory That Survives Context Resets

> If you use Claude, GPT, or Copilot — every session starts from zero. This fixes that.

A 960-line script that records snapshots on every commit (via git hooks), tracks hotspot files, detects coupled changes, logs fix chains, and stores decisions in plain JSON.

```bash
# Add to any project:
curl -O https://raw.githubusercontent.com/9tvf4k6srt-sys/NumbahWan-tcg/main/nw-memory.cjs
node nw-memory.cjs --query
```

<details>
<summary><b>See all commands</b> — session memory, premortem checks, project intelligence</summary>

```bash
node nw-memory.cjs --query           # What does the AI need to know right now?
node nw-memory.cjs --health          # Project health score with trend analysis
node nw-memory.cjs --reflect         # Deep analysis: decision/breakage correlation
node nw-memory.cjs --premortem battle # What broke last time in this area?
node nw-memory.cjs --broke "i18n" "innerHTML replaced DOM, lost event handlers"
node nw-memory.cjs --decide "battle" "Coach in separate file" "5 fix chains"
node nw-memory.cjs --constraint "ios" "touchend + click both fire"
```

```
Project Health: 90/100 (A)
Snapshots: 101 | Window: last 20 | Bundle: 536KB | Pages: 117

Bonuses: 12/17 commits proven stable (+15) | Avg commit quality 72/100 (+5)
Issues:  Bundle 536KB > 400KB target | 15 fix chains this week

Learnings:
  battle: 5 decisions but 5 breakages — decisions alone don't prevent bugs
  i18n: 3 decisions, 3 breakages — recurring innerHTML/DOM conflicts
  guide: 1 breakage, 0 decisions — unprotected area, document before editing
  velocity: sprint days avg 77/100 vs normal 68/100
  score-trend: commit quality declining (77 → 69, Δ-8)
```

How it works: git hooks auto-snapshot on every commit. `--query` gives the AI everything it needs. `--premortem` warns about fragile areas. `--reflect` correlates decisions with breakages to find systemic patterns. It's a JSON file and a CLI — but it's the difference between an AI that repeats your mistakes and one that doesn't.

</details>

---

## The Oracle — Multilingual Wisdom from 4 Traditions

`/oracle` is a life-advice page that synthesizes **Buddhist sutras**, **Tao Te Ching**, **Bible**, and **Quran** into a single response — respectful of all four traditions, genuinely funny, and actually helpful.

```
POST /api/oracle/ask
{ "question": "my heart is broken", "language": "zh" }
```

> **I hear you.** Heartbreak isn't just an emotion — your entire nervous system is screaming that something you relied on has disappeared.
>
> **The Ancient Consensus:**
> - **Buddhism** (Impermanence): Nothing is permanent — not the relationship, not this pain.
> - **Taoism** (Water): Water doesn't fight rocks. It flows around them.
> - **Bible** (Ecclesiastes 3:1): There is a season for everything. This is the season of letting go.
> - **Quran** (94:5-6): With every hardship comes ease. Repeated twice — that's not a typo, that's emphasis.
>
> **The Funny Truth:** Your ex's new relationship will also have that awkward "where should we eat" fight within 3 months.
>
> **Do This Today:** Write three things about yourself that have nothing to do with them. Tape it to your mirror.
>
> *The Oracle's Seal: This heartbreak proves you're capable of deep feeling. That's not a bug — it's a feature.*

- 60 hand-written wisdoms (20 per language) across 15 life topics
- Full translations in English, Traditional Chinese (繁體中文), and Thai (ภาษาไทย)
- CJK-aware keyword matching with score boosting
- LLM enhancement when available, graceful fallback to curated pool
- Self-hosted fonts, zero external dependencies, 17ms TTFB

**[Try it live →](https://numbahwan.pages.dev/oracle)**

---

## i18n Without a Framework

The entire site is trilingual (EN / 繁體中文 / ไทย) using a pattern so simple it fits in one paragraph:

Each page has a `translations` object. HTML elements get `data-i18n="keyName"`. A 200-line core script reads the language from `localStorage`, applies translations, and listens for a `CustomEvent`. That's it.

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

No build step. No extraction pipeline. No ICU message format. Just data attributes and a `CustomEvent`. Covers 116 pages and 3,700+ translation keys.

---

## The Guild World

What started as a trading card game became... this:

<table>
<tr><td>🃏</td><td><b>Trading Card Game</b></td><td>125+ cards, gacha system, deck builder, AI battle arena, auction house</td></tr>
<tr><td>📜</td><td><b>Museum</b></td><td>10 exhibits of "priceless" pixel artifacts with mock-academic descriptions</td></tr>
<tr><td>🔒</td><td><b>Underground Vault</b></td><td>13 floors, 195m deep, decontamination chamber, legendary misprint card</td></tr>
<tr><td>🔬</td><td><b>Research Archives</b></td><td>6 peer-reviewed papers on fictional economics</td></tr>
<tr><td>📊</td><td><b>NWX Exchange</b></td><td>Bloomberg Terminal parody with real volatility simulation (12 fake assets)</td></tr>
<tr><td>🔮</td><td><b>The Oracle</b></td><td>Life advice from 4 sacred traditions — the one that's actually real</td></tr>
<tr><td>🏛️</td><td><b>Court System</b></td><td>Guild justice for disputes (satirical)</td></tr>
<tr><td>🕵️</td><td><b>Conspiracy Board</b></td><td>Cork board with red string connecting guild events</td></tr>
<tr><td>🧘</td><td><b>Therapy Office</b></td><td>Guild therapy sessions</td></tr>
<tr><td>🅿️</td><td><b>Parking Lot</b></td><td>Yes, there's a parking lot</td></tr>
</table>

Each page is self-contained HTML with its own CSS and JS. No shared component library. No state management. They're just pages, and they work.

**[Browse all 116 pages →](https://numbahwan.pages.dev/showcase)**

---

## Quick Start

```bash
git clone https://github.com/9tvf4k6srt-sys/NumbahWan-tcg.git
cd NumbahWan-tcg
npm install
npm run build
npm run preview    # → localhost:3000
```

### Use the standalone tools (no clone needed):

```bash
# Health scanner — works on ANY JS/TS project
npx -y https://raw.githubusercontent.com/9tvf4k6srt-sys/NumbahWan-tcg/main/sentinel.cjs
# or:
curl -O https://raw.githubusercontent.com/9tvf4k6srt-sys/NumbahWan-tcg/main/sentinel.cjs
node sentinel.cjs

# AI session memory — add to any project
curl -O https://raw.githubusercontent.com/9tvf4k6srt-sys/NumbahWan-tcg/main/nw-memory.cjs
node nw-memory.cjs --query
```

## Project Structure

```
NumbahWan/
├── sentinel.cjs              # Codebase health scanner (standalone)
├── nw-memory.cjs             # AI session memory system (standalone)
├── src/
│   ├── index.tsx              # Hono app entry point
│   └── routes/                # 30 API route modules
│       ├── oracle.ts          # The Oracle wisdom engine
│       ├── card-engine.ts     # Gacha + pack opening
│       ├── wallet-economy.ts  # Currency system
│       └── ...
├── public/
│   ├── *.html                 # 116 page files
│   ├── oracle.html            # The Oracle UI
│   ├── museum/                # 10 museum exhibits
│   ├── research/              # 6 research papers
│   └── static/
│       ├── nw-*.js            # 62 JS modules
│       ├── nw-i18n-core.js    # i18n engine (200 lines)
│       ├── images/cards/      # 125 card images
│       └── fonts/             # Self-hosted (NumbahWan, Inter, Orbitron)
└── scripts/                   # 29 build/audit tools
```

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Cloudflare Workers | Free tier, global edge, 0ms cold start |
| Router | Hono (14KB) | Runs everywhere |
| Frontend | Vanilla JS | 116 pages, no build step for HTML |
| Build | Vite | SSR bundle for Workers |
| Database | Cloudflare D1 | SQLite, free, zero config |
| Fonts | Self-hosted | Zero external dependencies |
| i18n | Custom (200 lines) | `data-i18n` + `CustomEvent` |

## Numbers

| Metric | Count |
|--------|-------|
| HTML pages | 116 |
| JS modules | 62 |
| API routes | 30 |
| Card images | 125 |
| Translation keys | 3,700+ |
| Languages | 3 (EN, 繁體中文, ไทย) |
| Oracle wisdoms | 60 (20 x 3 languages) |
| Museum exhibits | 10 |
| Research papers | 6 |
| Build scripts | 29 |
| Commits | 530+ |
| Runtime dependencies | 0 |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started. The project uses git hooks for memory tracking — the contributing guide explains the setup.

Good first issues:
- Add a new Oracle wisdom (follow the [5-part format](#the-oracle--multilingual-wisdom-from-4-traditions))
- Add a new page to the guild world
- Improve i18n coverage for an existing page
- Run `node sentinel.cjs` and fix a reported issue

## Context

Built for the NumbahWan guild from MapleStory Idle RPG (TW Server). The guild motto is *"We are not just a guild, but FAMILY"* — this started as a weekend project to give guild members something fun, and it kept going.

If you find something useful in here — sentinel, the memory system, the i18n pattern, the Oracle format — take it. That's what it's for.

---

<div align="center">

**Made with love by the NumbahWan family** · [Live Site](https://numbahwan.pages.dev) · [The Oracle](https://numbahwan.pages.dev/oracle) · [Showcase](https://numbahwan.pages.dev/showcase)

</div>
