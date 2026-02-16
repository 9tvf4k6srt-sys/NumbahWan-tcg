<div align="center">

# NumbahWan

**A fantasy TCG built with AI-first architecture — 583 cards, 92 pages, 7 DLCs, a cinematic trailer pipeline, and the tooling that proves it works.**

[![PCP v0.1](https://img.shields.io/badge/PCP_v0.1-Level_3_(Grade_A)-00d4ff?style=for-the-badge)](https://numbahwan.pages.dev/.well-known/pcp.json)
[![Tests](https://img.shields.io/badge/Tests-125%2F125-00b894?style=for-the-badge)]()
[![Cards](https://img.shields.io/badge/Cards-583-e17055?style=for-the-badge)]()
[![Pages](https://img.shields.io/badge/Pages-92-6c5ce7?style=for-the-badge)]()
[![Deps](https://img.shields.io/badge/Ext_Dependencies-0-e8e0d8?style=for-the-badge)]()

**[Play the Game](https://numbahwan.pages.dev)** · **[Agent Dashboard](https://numbahwan.pages.dev/agent)** · **[PCP Spec](PCP-SPEC.md)** · **[Trailer Pipeline](#cinematic-trailer-pipeline)**

</div>

---

## What This Is

NumbahWan is a full-scale trading card game — 10 seasons of cards, a real-time battle engine, a card forge, wallet system, Oracle advisor, guild mechanics, and 7 DLC story campaigns — built almost entirely through AI-assisted development.

But the game isn't the interesting part. The infrastructure is.

We built three systems to solve problems we kept hitting during AI-assisted development. Each one is open, portable, and zero-dependency:

| System | Problem It Solves | Status |
|--------|-------------------|--------|
| **[Project Context Protocol](#project-context-protocol)** | AI agents waste 50K tokens re-reading READMEs | 17 endpoints, 125/125 tests, Level 3 Grade A |
| **[Mycelium](#mycelium--self-healing-codebase)** | Same files keep breaking the same way | 5 scripts, 84 regression tests, 75/100 eval score |
| **[Cinematic Trailer Pipeline](#cinematic-trailer-pipeline)** | AI-generated assets need verification loops | 11 scenes, 31 iterations, 7 characters, 4-level checklist |

All three are production systems running in this repo. None of them require external dependencies.

---

## Project Context Protocol (PCP)

> *MCP connects tools to models. A2A connects agents to agents. PCP connects projects to agents.*

PCP is an open standard for exposing structured project context to AI agents via HTTP. It solves the cold-start problem: when an AI agent starts working on a codebase it's never seen, it has no understanding of the architecture, no awareness of design rules, and no memory of previous sessions.

```bash
# An agent onboards to your project in one HTTP call:
curl https://yourproject.dev/.well-known/pcp.json     # Discover PCP support
curl https://yourproject.dev/api/pcp/brief             # 209 tokens — instant project understanding
curl -X POST https://yourproject.dev/api/pcp/onboard \ # Full session bootstrap
  -d '{"agent":"claude","goals":["fix i18n"]}'         # ~6K tokens — rules, tasks, memory, tools
```

### How It Works

Every endpoint is token-budget-aware. The response header tells the agent exactly how many tokens it just consumed, so it can decide whether to go deeper or stop.

| Level | What It Gives an Agent | Token Cost |
|-------|----------------------|------------|
| **L0** — Discovery | "What is this project and what can't I break?" | ~500 |
| **L1** — Core | Full architecture map, health scores, file tree | ~3K |
| **L2** — Memory | Cross-session learnings, task queue, session bootstrap | ~6K |
| **L3** — Actions | Trigger builds, GitHub auto-tasks, alert webhooks | ~6K |

This implementation passes all 125 compliance checks at Level 3. Brief responds in 5ms with 209 tokens. Pulse (heartbeat) is 68 bytes. Memory is KV-backed and persists across AI sessions.

**Full spec: [PCP-SPEC.md](PCP-SPEC.md)** — 505 lines, self-contained, zero dependency on this repo.

---

## Mycelium — Self-Healing Codebase

Five scripts. Zero dependencies. Drop into any git repo.

Mycelium reads your commit history, finds what keeps breaking, and builds defenses automatically. Every bug you fix teaches it. Every pattern it detects becomes an enforced constraint.

```bash
# Add to any project — 30 seconds, zero npm install
cp mycelium*.cjs your-project/
cd your-project && node mycelium.cjs --init
```

### The Five Components

```
Every commit triggers:
  Watcher → Learner → Evaluator → Fixer

Pre-commit hook:
  Watcher → Guard → BLOCK if pattern violation detected
```

| Script | Role | What It Does |
|--------|------|-------------|
| `mycelium.cjs` | Learner | Snapshots every commit, tracks constraints, detects file couplings |
| `mycelium-watch.cjs` | Watcher | Scores file risk, maps breakage patterns, warns before you repeat mistakes |
| `mycelium-eval.cjs` | Evaluator | 9 KPIs, SHA-256 cryptographic proof, 28 self-checks including 4 anti-gaming |
| `mycelium-fix.cjs` | Fixer | Diagnoses friction → prescribes → executes → verifies improvement |
| `mycelium-upgrade.cjs` | Upgrader | Reads breakage history → auto-generates regression tests + guard rules |

### Real Numbers

These come from `mycelium-eval.cjs` running against this repo. You can verify them yourself.

| What It Found | What It Did |
|--------------|-------------|
| `cards.html` broke **10 times** from the same pattern | Generated i18n key validation test — caught 24 invalid keys on first run |
| `battle.html` + `nw-battle-engine.js` always co-change (28x) | Added coupling enforcement in pre-commit |
| 3 files had 30% repeat-break rate | Classified failure modes, generated targeted regression tests |
| 50 breakages across project lifetime | Each became a lesson, constraint, or test — 84 regression tests now run on every commit |

<details>
<summary><b>Evaluation scorecard — 75/100 (B)</b></summary>

```
Mycelium-Eval v4.0

  Overall: 75/100 (B) [proof: 6bc6c35005d35e8c]

  Scorecard:
    Fix Rate Trend         50/100 (15%)  Real bug fix rate: 15%→16%
    Repeat Prevention      35/100 (15%)  3/10 files still repeat (30%)
    Constraint Coverage   100/100 (15%)  7/7 breakage areas covered
    Lesson Quality        100/100 (15%)  50/50 lessons are specific
    Fix Chain Speed        40/100 (10%)  3 chains, avg length 4.0
    Knowledge Density     100/100 (10%)  141/141 risky files documented
    Warning Coverage       90/100 (10%)  63% warning, 82% coupling
    Bundle Health         100/100  (5%)  390KB under 400KB target
    Fixer Effectiveness    90/100  (5%)  17 fixes, 13 hardened

  Verification: 28/28 self-checks passed (4 anti-gaming checks included)
```

The score is 75, not 95 — because Mycelium is honest. Repeat Prevention is 35/100 because 3 files still repeat. The only way to improve that number is to actually stop those files from breaking.

</details>

---

## Cinematic Trailer Pipeline

The trailer pipeline is where three concerns converge: AI asset generation, recursive verification, and structured iteration management. It produces a 2:45 cinematic trailer with 11 keyframe scenes, 7 playable characters, and 4 narrative acts.

### Architecture

```
pipeline/
├── characters/
│   └── character-bible.json          # Single source of truth for all 7 character visual specs
│                                     # — hex colors, prompt keywords, negative prompts, verification checklists
├── keyframes/
│   ├── keyframe-manifest.json        # Scene registry — versions, source URLs, verification notes, revision log
│   ├── review.html                   # Interactive review dashboard — approve/flag per scene, export feedback JSON
│   └── scene-{01..11}-*.png          # Generated keyframe images (31 total iterations across 11 scenes)
├── ref-sheets/
│   └── {character}-ue5-refsheet-*.png # UE5 photorealistic reference sheets per character (versioned)
├── verification/
│   └── verification-report.json      # 4-level automated checklist results per scene per version
└── verify.cjs                        # Verification runner — checks images against character bible specs
```

### The Verification Loop

Every generated image passes through a 4-level checklist before it's accepted:

| Level | What It Checks | Example |
|-------|---------------|---------|
| **L1 — Silhouette** | Recognizable shape at thumbnail size | Wing type matches, hair volume correct |
| **L2 — Color** | Hex values within 15% tolerance | Hair #CC0000, skin #D4A574, wings #1A237E |
| **L3 — Detail** | Facial features, accessories, weapon type | Glasses present, headband shape correct, hammer ornate |
| **L4 — Consistency** | Art style, lighting, proportions across scenes | UE5 realistic (not anime), consistent scale |

When a check fails, the system logs the specific deviation, adjusts the prompt (adding negatives or emphasizing missed features), regenerates, and compares against the previous best. Maximum 3 iterations per check level before escalating to manual review.

### What The Pipeline Learned

The character bible contains `CRITICAL_NOTE` fields — permanent annotations born from repeated failures:

```json
{
  "headwear": {
    "CRITICAL_NOTE": "This headband has TWO LARGE sharp matte-black leaf/petal-shaped prongs
     rising upward from the headband. NOT horns, NOT antlers, NOT crown, NOT cat ears.
     Reference: reggina-ue5-refsheet-v5.png"
  }
}
```

These notes exist because the headband was rendered wrong 5+ times across different iterations before being corrected. Each failure became a more specific prompt constraint. The pipeline documents every correction in the revision log — not to hide mistakes, but to prevent recurrence.

### Current State

| Metric | Value |
|--------|-------|
| Scenes | 11/11 verified |
| Characters | 7/7 accounted for |
| Trailer duration | 2:45 (4 acts) |
| Total iterations | 31 across all scenes |
| Critical issues | 5 logged, 5 resolved |
| Pipeline version | v6.0 |

**Review dashboard**: [`pipeline/keyframes/review.html`](pipeline/keyframes/review.html)

---

## The Game

NumbahWan TCG is a browser-based fantasy trading card game with 583 cards across 10 seasons, each with unique mechanics:

| Season | Theme | Cards |
|--------|-------|-------|
| S1: Origins | Foundation set | 110 |
| S2: Hounds of War | Military strategy | 57 |
| S3: Cyber Siege | Tech warfare | 68 |
| S4: Realm of Shadows | Dark magic | 68 |
| S5: Tournament of Champions | Competitive | 67 |
| S6: Whale Wars | Economic | 68 |
| S7: Rage Quit Rebellion | Chaos | 68 |
| S8: Legends Reborn | Legacy | 28 |
| S9: Multiverse Mayhem | Dimensional | 25 |
| S10: Final Dawn | Conclusion | 24 |

The game has a real-time battle engine, card forging system, player wallet, guild mechanics, an Oracle advisor (with Buddhist, Taoist, Biblical, and Quranic wisdom), internationalization across 3 languages (EN, ZH, TH), and 7 DLC campaigns that expand the world from castle life to sky islands to the philosophical depths of Samsara.

### The Guild

Seven characters, each with a fully spec'd visual identity locked in the [character bible](pipeline/characters/character-bible.json):

| Character | Role | Archetype |
|-----------|------|-----------|
| **RegginA** | Guild Master | Holy Paladin / Hammer Warrior |
| **Natehouoho** | Leader | Dual-Blade Rogue / Shadow Assassin |
| **RegginO** | Vice Master | Enchantress / Support Mage |
| **Panthera** | Top Contributor | Seraphim / Divine Templar |
| **Sweetiez** | Guild Member | Enchantress / Mystic Mage |
| **Santaboy** | Festive Warrior | Holiday Warrior / Divine Angel |
| **CIA** | Companion | Tactical French Bulldog |

---

## Technical Stack

```
Frontend:     92 HTML pages, vanilla JS (no framework), 62 shared modules
Backend:      Hono + TypeScript on Cloudflare Workers
Database:     Cloudflare D1 (SQLite) + KV for memory/caching
Hosting:      Cloudflare Pages + Workers
Testing:      125 PCP compliance tests + 84 Mycelium regression tests
CI/CD:        GitHub Actions → Cloudflare deploy
Health:       sentinel.cjs (10-module codebase scanner, standalone)
AI Pipeline:  Character bible → keyframe generation → 4-level verification → dashboard review
```

Zero external runtime dependencies. No React, no Vue, no Tailwind, no Webpack. The entire frontend is vanilla HTML/CSS/JS with shared modules. This is intentional — it keeps bundle sizes small (390KB under 400KB target), eliminates build complexity, and makes every page independently deployable.

---

## Project Structure

```
├── PCP-SPEC.md                      # Project Context Protocol specification (505 lines)
├── src/
│   └── routes/agent.ts              # PCP reference implementation (17 endpoints)
├── public/
│   ├── .well-known/pcp.json         # PCP discovery manifest
│   ├── agent.html                   # Agent command center dashboard
│   ├── index.html                   # Game landing page
│   ├── battle.html                  # Battle engine
│   ├── cards.html                   # Card browser (10 seasons)
│   ├── forge.html                   # Card forging
│   ├── wallet.html                  # Inventory
│   ├── showcase.html                # Mycelium metrics + honest story
│   └── static/                      # JS modules, CSS, card data, images
├── pipeline/
│   ├── characters/character-bible.json  # Visual DNA for all 7 characters
│   ├── keyframes/                   # 11 scene keyframes + manifest + review dashboard
│   ├── ref-sheets/                  # UE5 character reference sheets (versioned)
│   └── verification/                # 4-level verification reports
├── mycelium.cjs                     # The Learner
├── mycelium-watch.cjs               # The Watcher
├── mycelium-eval.cjs                # The Evaluator (SHA-256 proof)
├── mycelium-fix.cjs                 # The Fixer
├── mycelium-upgrade.cjs             # The Upgrader
├── sentinel.cjs                     # Health scanner (standalone, zero-dep)
├── tests/
│   ├── pcp-validator.cjs            # 125-check PCP compliance validator
│   ├── pcp-compliance.cjs           # 68-check core compliance
│   └── run-tests.cjs               # Full test suite
├── scripts/                         # 29 build, audit, and content tools
├── tools/                           # Mycelium mining, telemetry, dependency graphing
└── docs/                            # Architecture, workflows, specs
```

---

## Running Locally

```bash
git clone https://github.com/9tvf4k6srt-sys/NumbahWan-tcg.git
cd NumbahWan-tcg
npm install
npm run build
npx wrangler pages dev dist --port 3000
```

### Validate

```bash
# PCP compliance (125 checks)
node tests/pcp-validator.cjs

# Mycelium evaluation (9 KPIs + cryptographic proof)
node mycelium-eval.cjs

# Sentinel health scan (10 modules)
node sentinel.cjs

# Full test suite
node tests/run-tests.cjs
```

### Mycelium Quick Start (any repo)

```bash
cp mycelium*.cjs your-project/
cd your-project
node mycelium.cjs --init          # Reads git history, installs hooks
node mycelium-eval.cjs            # See your score
node mycelium-fix.cjs --force     # Auto-fix the weakest areas
node mycelium-upgrade.cjs --apply # Generate tests from breakage history
```

---

## Design Decisions

**Why vanilla JS instead of React/Vue?**
Each of the 92 pages is self-contained. No build step means no build failures. No framework version conflicts. Every page loads independently under 400KB. When a page breaks, the blast radius is one file.

**Why zero external dependencies?**
Mycelium, sentinel, and PCP run on Node.js and nothing else. Copy the files into any project. No `npm install`, no version conflicts, no supply chain risk.

**Why 4-level verification for AI-generated images?**
Because AI image generation is non-deterministic. A prompt that produces correct output once will produce wrong output the next time. The checklist catches regressions that visual review misses — a hex color drifting 20% doesn't look wrong to a human reviewer but breaks character consistency across scenes.

**Why does Mycelium score itself honestly?**
Because inflated scores hide real problems. Repeat Prevention is 35/100 because 3 files still break repeatedly. That number only improves when those files actually stop breaking — not when the scoring formula changes.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

Good starting points:
- Run `node mycelium.cjs --init` on your own project and share what it finds
- Run `node sentinel.cjs` on any JS project
- Open an [issue](../../issues) if a breakage pattern isn't caught
- Add an Oracle wisdom (see CONTRIBUTING.md for the 5-part format)

---

<div align="center">

**NumbahWan** — AI-native game infrastructure

**[Play](https://numbahwan.pages.dev)** · **[PCP Spec](PCP-SPEC.md)** · **[Agent Dashboard](https://numbahwan.pages.dev/agent)** · **[Mycelium Showcase](https://numbahwan.pages.dev/showcase)**

*Built by the NumbahWan Guild. MIT License.*

</div>
