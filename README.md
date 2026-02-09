<div align="center">

# Mycelium

### Self-improving codebase immune system

**Four scripts. Zero dependencies. Drop into any repo.**<br>
Learns from every commit, warns before repeating mistakes, auto-fixes with cryptographic proof.

[![Mycelium Score](https://img.shields.io/badge/Mycelium_Score-75%2F100_(B)-6c5ce7?style=for-the-badge)](https://numbahwan.pages.dev/showcase)
[![Tests](https://img.shields.io/badge/Regression_Tests-33_passing-00b894?style=for-the-badge)]()
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-e8e0d8?style=for-the-badge)]()

</div>

---

## What Is Mycelium?

Like biological mycelium — the underground fungal network that connects trees and strengthens the entire forest — this system connects your files, shares constraints, and strengthens your codebase with every commit.

```bash
# Add to any project in 30 seconds
cp mycelium.cjs mycelium-watch.cjs mycelium-eval.cjs mycelium-fix.cjs your-project/
cd your-project && node mycelium.cjs --init
# Done. It learns from your git history immediately.
```

### The Four Components

| Script | Role | What It Does |
|--------|------|-------------|
| `mycelium.cjs` | **The Learner** | Snapshots every commit, tracks hotspots, detects couplings, stores constraints |
| `mycelium-watch.cjs` | **The Watcher** | Analyzes git history, scores file risk, warns before repeating mistakes |
| `mycelium-eval.cjs` | **The Evaluator** | 9 weighted KPIs, honest before/after split, SHA-256 cryptographic proof, 28 self-checks |
| `mycelium-fix.cjs` | **The Fixer** | Diagnoses friction, prescribes 6 fix types, executes automatically, verifies improvement |

### How It Works

```
Every commit triggers:
  watch --learn -> snapshot -> eval -> diagnose -> fix (if needed)

Pre-commit hook:
  watch --warn -> guard constraints -> BLOCK if violated

Pipeline: Learner -> Evaluator -> Fixer (continuous loop)
```

### Quick Start

```bash
# Install (zero dependencies, just copy files)
node mycelium.cjs --init

# See what it learned
node mycelium.cjs --status
node mycelium.cjs --onboard

# Evaluate your codebase learning health
node mycelium-eval.cjs

# Auto-fix weak areas
node mycelium-fix.cjs --force
```

### CLI Reference

```bash
# Unified CLI
npx mycelium help          # See all commands
npx mycelium eval          # 9 KPIs with cryptographic proof
npx mycelium diagnose      # Root-cause analysis -> files -> failure modes
npx mycelium fix           # Auto-diagnose -> prescribe -> execute -> verify
npx mycelium status        # Current state + pending prescriptions
npx mycelium ship "msg"    # Atomic deploy: commit -> test -> sync -> PR -> merge
```

<details>
<summary><b>See the evaluation scorecard</b> -- 9 KPIs, weighted scoring, cryptographic proof</summary>

```
Mycelium-Eval v4.0 -- Foolproof Learning System Evaluation

  Overall: 75/100 (B) [proof: cb90524fba81ccd4]

  Scorecard:
    --------- Fix Rate Trend       50/100 (15%) real bug fix rate flat
    -------   Repeat Prevention    35/100 (15%) 3/10 files repeat (30%)
    ---------- Constraint Coverage  100/100 (15%) 7/7 areas covered
    ---------- Lesson Quality       100/100 (15%) 50/50 lessons specific
    ------    Fix Chain Speed       40/100 (10%) 3 chains avg length 4.0
    ---------- Knowledge Density    100/100 (10%) 141/141 files
    ---------  Warning Coverage      90/100 (10%) 63% warning rate
    ---------- Bundle Health        100/100  (5%) 390KB < 400KB
    ---------  Fixer Effectiveness   90/100  (5%) 17 fixes, 13 hardened

  Verification: 28/28 self-checks passed (including 4 anti-gaming)
  Proof: SHA-256 hash cb90524fba81ccd4 -- re-run to verify
```

</details>

<details>
<summary><b>See the diagnosis engine</b> -- root causes mapped to specific files</summary>

```
Friction Analysis -- Root-Cause Diagnosis

  Fix Rate Trend: 50/100 (weight 15%)
    Root causes: 5 files (cards.html 10x, markets.html 7x, battle.html 7x...)
    Prescription: PREVENT_NEW_BUGS -> add guards to top 5 offenders
    Expected: +15-30 points

  Repeat Prevention: 35/100 (weight 15%)
    Root causes: 3/10 files repeat (30%)
    Prescriptions:
      STRENGTHEN_CONSTRAINTS -> files (+preventive rules)
      ADD_CONSTRAINTS -> files (+constraints from lessons)
    Expected: +10 points

  Fix Chain Speed: 40/100 (weight 10%)
    Root causes: 3 chains (avg length 4.0)
    Prescriptions:
      PRE_MORTEM_FOR_CHAIN_FILES -> require pre-mortem before editing
      ROOT_CAUSE_FIRST -> every fix must include root-cause note
    Expected: +6 points
```

</details>

---

## Proving Ground: NumbahWan TCG

Mycelium was built and battle-tested on **NumbahWan** — a 116-page browser-based guild world built with vanilla JS, Hono, and Cloudflare Workers.

This project is the live proving ground where Mycelium learned from 150+ commits, tracked 50 breakages, and accumulated 49 learnings. Every metric on the [showcase page](https://numbahwan.pages.dev/showcase) is real and independently verifiable.

<details>
<summary><b>About NumbahWan</b> -- the project that feeds Mycelium</summary>

### 116 pages. 62 JS modules. 30 API routes. 3 languages. Zero frameworks.

A browser-based world built entirely with **vanilla JS**, **Hono**, and **Cloudflare Workers**.
No React. No Vue. No Next. Just HTML files.

| Feature | Description |
|---------|-------------|
| Trading Card Game | 125+ cards, gacha system, deck builder, AI battle arena |
| The Oracle | Life advice from Buddhist, Taoist, Biblical, and Quranic traditions |
| NWX Exchange | Bloomberg Terminal parody with real volatility simulation |
| i18n System | 3,700+ translation keys across EN, Traditional Chinese, Thai |
| Museum & Vault | 10 exhibits, 13 underground floors, legendary misprint card |

**[Live Site](https://numbahwan.pages.dev)** | **[The Oracle](https://numbahwan.pages.dev/oracle)** | **[Showcase](https://numbahwan.pages.dev/showcase)**

Built for the NumbahWan guild from MapleStory Idle RPG (TW Server).

</details>

---

## `sentinel.cjs` -- Zero-Dependency Codebase Health Scanner

> One file. No dependencies. Works on any JS/TS project.

```bash
curl -O https://raw.githubusercontent.com/9tvf4k6srt-sys/NumbahWan-tcg/main/sentinel.cjs
node sentinel.cjs
```

Scores 10 modules (architecture, assets, i18n, deadCode, security, performance, apiSurface, dependencies, accessibility, seoMeta) with letter grade and auto-fix suggestions.

---

## Project Structure

```
mycelium/
├── bin/mycelium.cjs          # Unified CLI entry point
├── mycelium.cjs              # The Learner
├── mycelium-watch.cjs        # The Watcher
├── mycelium-eval.cjs         # The Evaluator
├── mycelium-fix.cjs          # The Fixer
├── sentinel.cjs              # Codebase health scanner (standalone)
├── .mycelium/                # All Mycelium data
│   ├── memory.json           # Learner state
│   ├── watch.json            # Watcher state
│   ├── eval.json             # Latest evaluation
│   ├── eval-history.json     # Score history
│   ├── fix-log.json          # Fixer run history
│   └── config.json           # Configuration
├── src/                      # NumbahWan app source
├── public/                   # 116 HTML pages
└── tests/                    # 33 regression tests
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The project uses git hooks for memory tracking.

If you find something useful — Mycelium, sentinel, the i18n pattern, the Oracle — take it. That's what it's for.

---

<div align="center">

**Mycelium** — the codebase immune system · [Live Showcase](https://numbahwan.pages.dev/showcase) · [GitHub](https://github.com/9tvf4k6srt-sys/NumbahWan-tcg)

</div>
