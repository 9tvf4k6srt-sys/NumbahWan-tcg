<div align="center">

# Mycelium : For self-improving codebases

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

## Mycelium — Codebase Immune System

**The world's first self-improving codebase.** Four scripts that learn from every commit, remember every breakage, diagnose root causes, prescribe fixes, and prove improvement with cryptographic evidence.

> Like biological mycelium — the underground fungal network that connects trees, shares nutrients, and strengthens the entire forest — this system connects your files, shares constraints, and strengthens your codebase with every commit.

```bash
# Unified CLI
npx mycelium help          # See all commands
npx mycelium eval          # 9 KPIs with cryptographic proof
npx mycelium diagnose      # Root-cause analysis → files → failure modes
npx mycelium fix           # Auto-diagnose → prescribe → execute → verify
npx mycelium status        # Current state + pending prescriptions
npx mycelium health        # Project health summary
npx mycelium version       # Component status + data sizes
```

### The Four Components

| Script | Role | What It Does |
|--------|------|-------------|
| `mycelium.cjs` | **The Learner** | Snapshots every commit, tracks hotspots, detects couplings, stores constraints in `.mycelium/memory.json` |
| `mycelium-watch.cjs` | **The Watcher** | Analyzes commits, scores risk, identifies repeat offenders, maps file relationships in `.mycelium/watch.json` |
| `mycelium-eval.cjs` | **The Evaluator** | Single source of truth: 9 weighted KPIs, honest before/after split, SHA-256 cryptographic proof, 25 self-checks |
| `mycelium-fix.cjs` | **The Fixer** | Diagnoses friction, prescribes 6 fix types, executes automatically, verifies improvement |

### How It Works

```
Every commit triggers:
  watch --learn → snapshot → eval → diagnose → fix (if needed)

Pre-commit hook:
  watch --warn → guard constraints → BLOCK if violated

Pipeline: Learner → Evaluator → Fixer (continuous loop)
```

<details>
<summary><b>See the evaluation scorecard</b> — 9 KPIs, weighted scoring, cryptographic proof</summary>

```
Mycelium-Eval v2.0 — Foolproof Learning System Evaluation

  Overall: 69/100 (C) [proof: 60a5319cca03a01f]

  Scorecard:
    ████████░░ Fix Rate Trend       50/100 (15%) real bug fix rate flat
    █░░░░░░░░░ Repeat Prevention    10/100 (15%) majority repeat 53%
    ██████████ Constraint Coverage  100/100 (15%) 6/6 areas covered
    ██████████ Lesson Quality       100/100 (15%) 50/50 lessons specific
    ██░░░░░░░░ Fix Chain Speed       20/100 (10%) chains growing 0→4
    ██████████ Knowledge Density    100/100 (10%) 141/141 files
    █████████░ Warning Coverage      90/100 (10%) 63% warning rate
    ██████████ Bundle Health        100/100  (5%) 390KB < 400KB
    ████████░░ Fixer Effectiveness   80/100  (5%) 8 fixes, guard enforced

  Verification: 25/25 self-checks passed
  Proof: SHA-256 hash 60a5319cca03a01f — re-run to verify
```

</details>

<details>
<summary><b>See the diagnosis engine</b> — root causes mapped to specific files</summary>

```
Friction Analysis — Root-Cause Diagnosis

  Fix Rate Trend: 50/100 (weight 15%)
    Root causes: 5 files (cards.html 10x, markets.html 7x, battle.html 7x...)
    Prescription: PREVENT_NEW_BUGS → add guards to top 5 offenders
    Expected: +15-30 points

  Repeat Prevention: 10/100 (weight 15%)
    Root causes: 16/30 files repeat (53%)
    Prescriptions:
      STRENGTHEN_CONSTRAINTS → 7 files (+27 preventive rules)
      ADD_CONSTRAINTS → 8 files (+24 constraints from lessons)
      ENFORCE_CO_CHANGES → 3 coupled pairs (battle↔engine, markets↔index)
    Expected: +14 points

  Fix Chain Speed: 20/100 (weight 10%)
    Root causes: 3 chains (4-fix UI chain, 2-fix coupling chain, 6-fix mobile chain)
    Prescriptions:
      PRE_MORTEM_FOR_CHAIN_FILES → require pre-mortem before editing
      ROOT_CAUSE_FIRST → every fix must include root-cause note
    Expected: +8 points

  Summary: 3 friction points, 6 prescriptions, +30 pts potential
```

</details>

<details>
<summary><b>See the memory system</b> — project intelligence across sessions</summary>

```bash
npx mycelium health        # Project health score with trend analysis
npx mycelium query         # What does the AI need to know right now?
```

```
Project Health: 85/100 (B)
Snapshots: 134 | Window: last 20 | Bundle: 390KB | Pages: 119

Bonuses: 9/17 commits proven stable (+15) | Avg commit quality 73/100 (+5)
Issues:  17 fix chains this week

Data: 150 commits analyzed | 50 breakages tracked | 37 learnings |
      64 constraints | 141 risky files with lessons | 8 coupling pairs
```

</details>

---

### `sentinel.cjs` — Zero-Dependency Codebase Health Scanner

> One file. No dependencies. Works on any JS/TS project.

```bash
curl -O https://raw.githubusercontent.com/9tvf4k6srt-sys/NumbahWan-tcg/main/sentinel.cjs
node sentinel.cjs
```

<details>
<summary><b>See output</b> — 10 modules scored, letter grade, auto-fix suggestions</summary>

```
NW-SENTINEL v2.5 — Codebase Health Report
  Composite Score:  72/100 (B-)
  10 modules: architecture, assets, i18n, deadCode, security,
              performance, apiSurface, dependencies, accessibility, seoMeta
  Auto-Fix Engine: 9 fixes available (5 auto, 4 manual)
```

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
curl -O https://raw.githubusercontent.com/9tvf4k6srt-sys/NumbahWan-tcg/main/sentinel.cjs
node sentinel.cjs

# Mycelium — codebase immune system (add to any project)
curl -O https://raw.githubusercontent.com/9tvf4k6srt-sys/NumbahWan-tcg/main/mycelium.cjs
node mycelium.cjs --health
```

## Project Structure

```
NumbahWan/
├── bin/mycelium.cjs          # Unified CLI entry point
├── mycelium.cjs              # The Learner — memory, snapshots, constraints
├── mycelium-watch.cjs        # The Watcher — commits, risks, couplings
├── mycelium-eval.cjs         # The Evaluator — 9 KPIs, cryptographic proof
├── mycelium-fix.cjs          # The Fixer — diagnose → prescribe → execute → verify
├── sentinel.cjs              # Codebase health scanner (standalone)
├── .mycelium/                # All Mycelium data
│   ├── memory.json           # Learner state (snapshots, breakages, constraints)
│   ├── watch.json            # Watcher state (commits, risks, couplings)
│   ├── eval.json             # Latest evaluation result
│   ├── eval-history.json     # Score history over time
│   ├── fix-log.json          # Fixer run history
│   └── config.json           # System configuration
├── src/
│   ├── index.tsx              # Hono app entry point
│   └── routes/                # 30 API route modules
├── public/
│   ├── *.html                 # 116 page files
│   └── static/
│       ├── nw-*.js            # 62 JS modules
│       └── images/cards/      # 125 card images
└── scripts/                   # Build/audit tools
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
