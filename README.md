<div align="center">

# NumbahWan

### A factory that builds web pages from YAML specs — and gets smarter every time it runs.

[![Dark Factory](https://img.shields.io/badge/Dark_Factory-Gen_2-ff6b6b?style=for-the-badge)]()
[![Memory](https://img.shields.io/badge/Factory_Memory-7_Lessons-a855f7?style=for-the-badge)]()
[![Pages](https://img.shields.io/badge/Pages-139_(1_Factory_Built)-6c5ce7?style=for-the-badge)]()
[![Scorecard](https://img.shields.io/badge/Scorecard-93%2F100_Avg-00b894?style=for-the-badge)]()
[![PCP v0.1](https://img.shields.io/badge/PCP_v0.1-Level_3_(Grade_A)-00d4ff?style=for-the-badge)](https://numbahwan.pages.dev/.well-known/pcp.json)
[![TypeScript](https://img.shields.io/badge/TSC-0_Errors-3178C6?style=for-the-badge)]()

**[Live Site](https://numbahwan.pages.dev)** · **[Factory Dashboard](https://numbahwan.pages.dev/dev/factory-dashboard)** · **[PCP Spec](PCP-SPEC.md)** · **[Learning Audit](LEARNING-SYSTEMS-AUDIT.md)**

</div>

---

## The Core Idea

We're building a factory that turns YAML specifications into production web pages — complete with trilingual translations, quality scoring, and deploy gates. The factory remembers every mistake it makes and every fix a human applies. Each build cycle feeds the next one. The goal: every page the factory produces should be better than the last.

This is not a static tool. It's a **recursive learning system** that evolves.

```
Build 1: Factory produces a page. Translation toggle doesn't work. Human fixes it.
         Factory records: "PAGE_I18N was empty — lesson L0001"

Build 2: Factory checks memory before generating. Sees L0001.
         Verifies PAGE_I18N is non-empty after generation.
         Warns if zh/th translations are missing.

Build 3: Factory runs evolution engine. Promotes L0001 to a permanent gate.
         All future builds are blocked if PAGE_I18N validation fails.
         The bug can never ship again.
```

That's the pattern. **Defects become lessons. Lessons become patterns. Patterns become gates. Gates become permanent.**

---

## Dark Factory — The Star

> *Checkpoint 1 — 2026-02-19 — Template Generation 2*

The Dark Factory is 12 tools that chain together to produce web pages from YAML specs. It validates, translates, scores, gates, and ships — and it learns from every step.

### Architecture

```
┌──────────────┐     ┌────────────────┐     ┌─────────────────┐
│  YAML Spec   │────▶│  Page Generator │────▶│  HTML + i18n    │
│  (91 lines)  │     │  (page-gen)     │     │  (14.4 KB)      │
└──────────────┘     └───────┬────────┘     └────────┬────────┘
                             │                       │
                     ┌───────▼────────┐     ┌────────▼────────┐
                     │ Factory Memory │◀───▶│   Validator     │
                     │ (lessons, DNA) │     │   + Scorecard   │
                     └───────┬────────┘     └────────┬────────┘
                             │                       │
                     ┌───────▼────────┐     ┌────────▼────────┐
                     │  Evolution     │     │  Deploy Gate    │
                     │  Engine        │     │  (5 checks)     │
                     └────────────────┘     └─────────────────┘
```

### The 12 Tools

| # | Tool | What It Does | Status |
|---|------|-------------|--------|
| 1 | `factory-runner.cjs` | Chains pipeline steps with checkpoints, resume, and memory integration | Working |
| 2 | `page-gen.cjs` | Reads YAML spec, outputs HTML + i18n JSON, verifies translations post-gen | Working |
| 3 | **`factory-memory.cjs`** | **Recursive learning engine — records, classifies, evolves, gates** | **Working** |
| 4 | `quality-scorecard.cjs` | Scores every HTML page on size, i18n, nav, meta, a11y | Working |
| 5 | `deploy-gate.cjs` | 5 pre-deploy checks: i18n, smoke, TypeScript, bundle, sentinel | Working |
| 6 | `mcp-server.cjs` | Exposes 27 tools as JSON-RPC endpoints for AI agents | Working |
| 7 | `orchestrator.cjs` | Full pipeline: intent > generate > translate > inject > scorecard > gate | Working |
| 8 | `agent-loop.cjs` | Scans for issues, plans fixes, optionally auto-executes | Working |
| 9 | `intent-parser.cjs` | Natural language to YAML spec (dictionary-based, no LLM) | Partial |
| 10 | `agent-brief.cjs` | Quick project state for agent onboarding | Working |
| 11 | `gen-context.cjs` | Generates session context for resumption | Working |
| 12 | `mycelium.cjs` | Atomic deploy: commit > test > auth > push > PR | Working |

### What It Produced (So Far)

One page. DLC 12: *The Abyssal Temple*.

```
Input:   specs/dlc-12-abyssal-temple.yaml    91 lines of YAML
Output:  public/world/dlc-12-abyssal-temple.html   14.4 KB, 21 i18n keys
         EN, ZH (Traditional Chinese), TH (Thai) — all inlined
         DLC-12 section injected into main game page
         Nav link added, hero stats updated to "12 FREE DLCs"
         Scorecard: 105/100 (A) — bonus for .i18n.json best practice
```

The other 138 pages were built by hand across 57 pull requests.

**That ratio — 1 factory-built page out of 139 — is the starting point, not the end state.** The factory exists to flip it.

---

## Recursive Learning Engine

> `bin/factory-memory.cjs` — the factory's brain

This is the piece that makes the Dark Factory different from a static code generator. The memory engine records everything and uses it to improve future builds.

### How It Works

```
┌─────────────┐
│   LESSONS   │  Every defect, fix, manual edit, and build outcome
│   (7 total) │  is recorded with category, severity, root cause, and fix
└──────┬──────┘
       │ auto-classify
       ▼
┌─────────────┐
│  PATTERNS   │  Lessons aggregate into rules:
│             │  • i18n_rules: "PAGE_I18N must contain en/zh/th"
│             │  • required_checks: "Block builds with i18n defects"
│             │  • page_gen_rules: "Fragment pages need preview banner"
└──────┬──────┘
       │ evolve
       ▼
┌─────────────┐
│ TEMPLATE    │  Each evolution increments the generation counter
│ DNA         │  Gen 0: no rules, first build
│ Gen 2      │  Gen 1: i18n gate added, fragment banner added
│             │  Gen 2: consolidated i18n rules, defect prevention
└──────┬──────┘
       │ pre-build checklist
       ▼
┌─────────────┐
│ NEXT BUILD  │  Before every pipeline run, memory generates
│ IS BETTER   │  a checklist from all accumulated knowledge
└─────────────┘
```

### Memory Contents (Live)

```
$ npm run factory:memory

  🧠 Dark Factory — Learning Report

  Builds: 2   Lessons: 7   Defects: 3 (3 fixed)
  Template Gen: 2   Clean Streak: 1

  Patterns: required_checks: 1, page_gen_rules: 1, i18n_rules: 1

  Score by Generation:
    gen_0: 105.0/100 █████████████████████  (1 builds)

  Recent Defects:
    D0001 [i18n] PAGE_I18N inline translations empty    — FIXED
    D0002 [i18n] Sidecar lost zh/th on regeneration     — FIXED
    D0003 [layout] REWATCH button blocks nav tabs       — FIXED

  Template Mutations:
    Gen 1: 3 changes
      → add_gate: Block builds with i18n defects (seen 2×)
      → automate: Fragment pages need preview banner
      → consolidate: i18n inline + sidecar rules
    Gen 2: 2 changes
      → add_gate: i18n defect prevention strengthened
      → consolidate: i18n rules merged
```

### The Learning Loop In Practice

Here's what actually happened during the DLC-12 build:

| Step | What Happened | What Memory Recorded |
|------|--------------|---------------------|
| 1. Generate | `page-gen` produced HTML with empty `PAGE_I18N` | — |
| 2. Validate | Validation passed (only checked sidecar, not inline) | — |
| 3. Ship | Page shipped. Language toggle silently did nothing. | — |
| 4. User reports | "Translations don't work, how did we pass phase 1?" | — |
| 5. Root cause | `extractI18nKeys()` only generates EN; `PAGE_I18N` hardcoded empty | Lesson L0001: critical i18n defect |
| 6. Fix | Added `buildPageI18n()` to read sidecar and inline translations | Lesson L0002: fix strategy recorded |
| 7. Second bug | Regenerating page overwrote sidecar with EN-only data | Lesson L0003: sidecar overwrite defect |
| 8. Fix | Added merge logic to preserve zh/th in sidecar | Defect D0002 marked FIXED |
| 9. Evolve | `npm run factory:learn` analyzed all lessons | Gen 0 → Gen 1: i18n gate added |
| 10. Next build | Pre-build checklist shows: "Verify PAGE_I18N non-empty" | Memory consulted before generation |

**Step 10 is the payoff.** The next DLC page generated will automatically verify its translations before shipping. The bug that slipped through on DLC-12 is now a permanent gate.

### Commands

```bash
# Show full learning report
npm run factory:memory

# Run evolution engine (derive new rules from lessons)
npm run factory:learn

# Pre-build checklist from memory
npm run factory:memory:checklist

# Seed memory from build history (first run)
npm run factory:memory:seed

# Query memory for specific topics
node bin/factory-memory.cjs --query i18n
node bin/factory-memory.cjs --query layout
node bin/factory-memory.cjs --query translation
```

---

## The Full Pipeline

Here's what `npm run factory:validate` actually does now:

```
$ npm run factory:validate

  🏭 NW Factory Runner v1.0

  📋 Pre-Build Checklist (from Memory)

  ● AUTO-GATE: Block builds with i18n defects (seen 2 times)     (pattern)
  ● page-gen.cjs emitted empty PAGE_I18N objects                  (i18n)
  ● Fragment pages need preview banner linking to parent page      (page-gen)

  3 checks from 7 lessons across 2 builds
  Template generation: 2
  Clean build streak: 1

  ℹ [1/1] Validate (i18n + sentinel)...
  ✓ i18n check passed
  ✓ Sentinel guard passed
  ✓ Step "validate" complete

  ✓ Pipeline complete — 1 steps

  ℹ Build recorded in factory memory (3 total builds)
```

**Every pipeline run** now:
1. Consults memory → shows checklist
2. Runs the requested steps
3. Records the results back into memory

The factory is always watching, always learning.

### Full Command Reference

```bash
# ── Factory Pipeline ──
npm run factory:validate              # Validate (i18n + sentinel)
npm run factory:full                  # Full pipeline: validate → translate → inject → test → scorecard → ship
npm run factory:heal                  # Auto-fix detected issues
npm run factory:resume                # Resume interrupted pipeline
npm run factory:status                # Show pipeline status

# ── Page Generation ──
npm run factory:gen specs/my-dlc.yaml # Generate page from YAML spec
npm run factory:gen:dry specs/x.yaml  # Dry run (preview without writing)

# ── Quality ──
npm run factory:scorecard             # Score all 139 pages
npm run factory:scorecard:fail        # Show only failing pages
npm run factory:gate                  # 5 pre-deploy checks

# ── Learning ──
npm run factory:memory                # Show learning report
npm run factory:learn                 # Evolve + show report
npm run factory:memory:checklist      # Pre-build checklist from memory
npm run factory:memory:seed           # Seed from build history
npm run factory:memory:evolve         # Run evolution engine

# ── AI Agent Integration ──
npm run mcp:list                      # 27 MCP tools available
npm run agent:diagnose                # Scan for issues
npm run agent:loop                    # Auto-fix cycle
```

---

## What Doesn't Work Yet (Honest)

The factory is real and runs, but it has clear limitations. We document them because the learning engine can only improve what it can measure:

| Gap | Current State | What Fixes It |
|-----|--------------|---------------|
| Intent parser | Produces rough scaffold, needs manual YAML editing | LLM integration or richer grammar |
| Translation | 700-word dictionary; DLC-12 zh/th were handwritten | Real translation API or LLM pass |
| Auto-injection | Manual line targeting to splice into parent page | DOM-aware injection with anchor detection |
| Agent reasoning | Can run npm scripts but can't modify code | Code-aware agent loop with AST editing |
| Dashboard | Static HTML with hardcoded fallbacks | Live API backend from MCP server |
| Coverage | 1 of 139 pages factory-produced (0.7%) | Build more specs, run more builds |
| Validation gap | Fixed: now checks inline PAGE_I18N, not just sidecar | Memory gate prevents regression |

Every item on this list is a future lesson. When we fix them, the memory engine will record the fix strategy and prevent the same class of problem from recurring.

---

## The Three Supporting Systems

The Dark Factory is the star, but it stands on three supporting systems that were built first:

### 1. Project Context Protocol (PCP)

> *MCP connects tools to models. A2A connects agents to agents. PCP connects projects to agents.*

An open standard for exposing structured project context to AI agents via HTTP. Solves the cold-start problem: when an AI agent starts on a new codebase, PCP gives it instant understanding.

```bash
curl https://yourproject.dev/.well-known/pcp.json     # Discover PCP support
curl https://yourproject.dev/api/pcp/brief             # 209 tokens — instant understanding
```

| Level | What It Gives | Tokens |
|-------|--------------|--------|
| L0 — Discovery | "What is this project?" | ~500 |
| L1 — Core | Architecture map, health scores, file tree | ~3K |
| L2 — Memory | Cross-session learnings, task queue | ~6K |
| L3 — Actions | Trigger builds, GitHub tasks, webhooks | ~6K |

125/125 compliance checks pass. Brief responds in 5ms. **Full spec: [PCP-SPEC.md](PCP-SPEC.md)**

### 2. Mycelium — Self-Healing Codebase

Five scripts, zero dependencies, drop into any git repo. Reads your commit history, finds what keeps breaking, and builds defenses automatically.

```bash
cp mycelium*.cjs your-project/
cd your-project && node mycelium.cjs --init
```

| What It Found | What It Did |
|--------------|-------------|
| `cards.html` broke 10 times from same pattern | Generated i18n key validation test |
| `battle.html` + `nw-battle-engine.js` co-change 28x | Added coupling enforcement in pre-commit |
| 3 files had 30% repeat-break rate | Generated targeted regression tests |

54 unit tests + pre-commit guards. Score: 60/100 (honest — 3 files still repeat).

### 3. Cinematic Trailer Pipeline

Produces a 2:45 trailer with 12 keyframe scenes, 8 characters, and a 4-level verification loop for AI-generated images:

| Level | Checks | Example |
|-------|--------|---------|
| L1 — Silhouette | Shape at thumbnail size | Wing type, hair volume |
| L2 — Color | Hex within 15% tolerance | Hair #CC0000, skin #6B4226 |
| L3 — Detail | Accessories, weapons | Glasses, headband, hammer |
| L4 — Consistency | Style across scenes | UE5 realistic, not anime |

12/12 scenes verified. 39 iterations. 8/8 characters locked. **Review: [`pipeline/keyframes/review.html`](pipeline/keyframes/review.html)**

---

## The Game (Context)

The factory exists to build pages for NumbahWan — a trading card game with 590 cards, 10 seasons, 12 DLC campaigns, and 139 pages. The game has a real-time battle engine, card forge, wallet, Oracle advisor, guild mechanics, and trilingual support (EN/ZH/TH).

But the game is the *product*. The factory is the *innovation*. We built the game by hand for 57 PRs. Now we're building the tools to never hand-build another page again.

<details>
<summary><b>Card seasons and guild roster</b></summary>

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

| Character | Role | Archetype |
|-----------|------|-----------|
| RegginA | Guild Master | Holy Paladin / Hammer Warrior |
| Natehouoho | Leader | Dual-Blade Rogue / Shadow Assassin |
| RegginO | Vice Master | Enchantress / Support Mage |
| Panthera | Top Contributor | Seraphim / Divine Templar |
| Sweetiez | Guild Member | Enchantress / Mystic Mage |
| Santaboy | Festive Warrior | Holiday Warrior / Divine Angel |
| CIA | Companion | Tactical French Bulldog |
| Harpseal Zakum RegginA | Raid Boss | Ancient Seal God |

</details>

---

## Technical Stack

```
Frontend:     139 HTML pages, vanilla JS (no framework), 62 shared modules
Backend:      Hono + TypeScript on Cloudflare Workers
Database:     Cloudflare D1 (SQLite) + KV for memory/caching
Hosting:      Cloudflare Pages + Workers
Factory:      12 Node.js tools in bin/, YAML specs in specs/
Memory:       .mycelium/factory-memory.json (lessons, patterns, DNA)
Testing:      125 PCP tests + 94 Vitest + 54 Mycelium regression tests
CI/CD:        GitHub Actions → Cloudflare deploy
```

Zero framework dependencies. No React, no Vue. Every page is independently deployable under 400KB.

---

## Project Structure

```
├── bin/                                 # Dark Factory — 12 pipeline tools
│   ├── factory-memory.cjs               #   Recursive learning engine (THE BRAIN)
│   ├── factory-runner.cjs               #   Pipeline orchestrator with memory integration
│   ├── page-gen.cjs                     #   YAML spec → HTML + i18n (with post-gen verification)
│   ├── quality-scorecard.cjs            #   Per-page health scoring
│   ├── deploy-gate.cjs                  #   5 pre-deploy checks
│   ├── mcp-server.cjs                   #   27 MCP tools for AI agents
│   ├── orchestrator.cjs                 #   Full pipeline chain
│   ├── agent-loop.cjs                   #   Issue scanner + auto-fix
│   ├── intent-parser.cjs                #   Natural language → YAML
│   ├── agent-brief.cjs                  #   Project state for agents
│   ├── gen-context.cjs                  #   Session context generator
│   └── mycelium.cjs                     #   Atomic deploy (commit → push → PR)
├── specs/                               # YAML page specifications
│   └── dlc-12-abyssal-temple.yaml       #   91-line spec → 14.4 KB page
├── .mycelium/
│   ├── factory-memory.json              #   Learning engine data (lessons, patterns, DNA)
│   ├── memory.json                      #   Mycelium codebase memory
│   ├── factory-logs/                    #   Pipeline step logs
│   └── events.jsonl                     #   Event bus
├── public/
│   ├── world/
│   │   ├── nwg-the-game.html            #   Main game page (all DLCs)
│   │   ├── dlc-12-abyssal-temple.html   #   Factory-produced DLC page (14.4 KB)
│   │   └── dlc-12-abyssal-temple.i18n.json  # Trilingual translations
│   ├── dev/factory-dashboard.html       #   Factory dashboard
│   └── ... (137 more hand-built pages)
├── PCP-SPEC.md                          # Project Context Protocol (505 lines)
├── LEARNING-SYSTEMS-AUDIT.md            # Full audit of all 6+ learning systems
├── mycelium*.cjs                        # Self-healing codebase (5 scripts, zero deps)
├── sentinel.cjs                         # Health scanner (10 modules)
├── pipeline/                            # Cinematic trailer (12 scenes, 8 characters)
└── scripts/                             # 29 build, audit, and content tools
```

---

## Running Locally

```bash
git clone https://github.com/9tvf4k6srt-sys/NumbahWan-tcg.git
cd NumbahWan-tcg
npm install

# Run the factory
npm run factory:validate                # Validate everything
npm run factory:memory                  # See learning report
npm run factory:learn                   # Run evolution engine
npm run factory:scorecard               # Score all 139 pages
npm run factory:gen specs/dlc-12-abyssal-temple.yaml  # Regenerate DLC-12

# Run the game
npm run build
npx wrangler pages dev dist --port 3000

# Validate
node tests/pcp-validator.cjs           # 125 PCP compliance checks
node mycelium-eval.cjs                 # 9 KPIs + cryptographic proof
node sentinel.cjs                      # 10-module health scan
```

---

## Where This Is Going

The factory produced 1 page. The next milestone is 10. Then 50. The learning engine ensures each one is better than the last:

| Checkpoint | Target | Status |
|-----------|--------|--------|
| **CP1** | Pipeline works, first page produced, memory seeded | **Done** (2026-02-19) |
| CP2 | Real translation API, auto-injection, second page | Next |
| CP3 | 10 factory pages, intent parser works without manual editing | Planned |
| CP4 | 50+ factory pages, dashboard live with API, agent can modify code | Vision |

Every build, every defect, every manual fix — they all feed back into the memory. The factory doesn't just build pages. It builds a better version of itself.

---

## Design Decisions

**Why recursive learning instead of just a code generator?**
Because code generators make the same mistakes forever. A learning system turns every failure into a permanent defense. After 100 builds, the factory will have 100+ lessons, dozens of patterns, and gates that catch entire categories of bugs before they ship.

**Why vanilla JS, no framework?**
Each page is self-contained. No build step means no build failures. No framework version conflicts. Every page loads independently under 400KB. When a page breaks, the blast radius is one file.

**Why zero external dependencies for Mycelium/PCP/Sentinel?**
Copy the files into any project. No `npm install`, no version conflicts, no supply chain risk.

**Why does Mycelium score itself at 60/100?**
Because 3 files still break repeatedly. The score improves when they stop breaking, not when the formula changes. Honest metrics are how systems learn.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

Good starting points:
- Write a YAML spec for a new DLC page and run `npm run factory:gen` on it
- Run `npm run factory:learn` after a build and see what the evolution engine produces
- Run `node mycelium.cjs --init` on your own project and share what it finds
- Open an [issue](../../issues) if a breakage pattern isn't caught

---

<div align="center">

**NumbahWan** — a factory that learns

Every defect becomes a lesson. Every lesson becomes a pattern. Every pattern becomes a gate.

**[Live Site](https://numbahwan.pages.dev)** · **[Factory Dashboard](https://numbahwan.pages.dev/dev/factory-dashboard)** · **[PCP Spec](PCP-SPEC.md)** · **[Learning Audit](LEARNING-SYSTEMS-AUDIT.md)**

*Built by the NumbahWan Guild. MIT License.*

</div>
