<div align="center">

# NumbahWan TCG

### AI-native project infrastructure: self-healing code + the protocol that teaches AI your codebase

[![PCP](https://img.shields.io/badge/PCP_v0.1-Level_3_(Grade_A)-00d4ff?style=for-the-badge)](https://numbahwan.pages.dev/.well-known/pcp.json)
[![PCP Tests](https://img.shields.io/badge/PCP_Tests-125%2F125_passing-00b894?style=for-the-badge)]()
[![Mycelium](https://img.shields.io/badge/Mycelium-75%2F100_(B)-6c5ce7?style=for-the-badge)](https://numbahwan.pages.dev/showcase)
[![Deps](https://img.shields.io/badge/Dependencies-0-e8e0d8?style=for-the-badge)]()

**Two open standards. Zero dependencies. One repo.**

**[PCP Spec](PCP-SPEC.md)** | **[Agent Dashboard](https://numbahwan.pages.dev/agent)** | **[Live Showcase](https://numbahwan.pages.dev/showcase)** | **[Discovery](https://numbahwan.pages.dev/.well-known/pcp.json)**

</div>

---

## Project Context Protocol (PCP) v0.1 — Reference Implementation

**PCP is a new open standard for exposing structured project context to AI agents via HTTP.**

MCP (Anthropic) connects tools to models. A2A (Google) connects agents to agents. **PCP connects projects to agents.** It fills a gap no existing protocol addresses: *how does an AI agent instantly understand a codebase it's never seen before?*

```bash
# Any AI agent can onboard to your project in one HTTP call:
curl https://yourproject.dev/.well-known/pcp.json     # Discover PCP support
curl https://yourproject.dev/api/pcp/brief             # 209 tokens — instant understanding
curl -X POST https://yourproject.dev/api/pcp/onboard \ # Full session bootstrap
  -d '{"agent":"claude","goals":["fix i18n"]}'         # 6K tokens — rules, tasks, memory, tools
```

### Why PCP Exists

When an AI agent starts working on a codebase, it faces a cold-start problem:
- **No project understanding** — doesn't know the stack, conventions, or architecture
- **No design rules** — will break things the team already learned not to break
- **No health awareness** — can't prioritize what needs fixing
- **No memory continuity** — learnings from the last AI session are lost
- **Token waste** — dumping an entire README burns 50K+ tokens for context deliverable in 209

### PCP vs Everything Else

| Standard | Connects | PCP relationship |
|----------|----------|------------------|
| **MCP** (Anthropic) | Tools to Models | Complementary. MCP provides tool access; PCP provides project context. |
| **A2A** (Google) | Agent to Agent | Complementary. A2A coordinates agents; PCP gives them project understanding. |
| **agents.json** | Discovery | Complementary. agents.json discovers agents; PCP discovers project state. |
| **llms.txt** | Website to LLM | Similar intent but static markdown. PCP is dynamic JSON with token budgets. |

### Compliance Levels

| Level | Endpoints | Token Cost | What It Gives an Agent |
|-------|-----------|------------|----------------------|
| **L0** (required) | `/.well-known/pcp.json` + `/brief` + `/rules` | ~500 | "What is this project and what can't I break?" |
| **L1** (core) | + `/context` + `/health` + `/files` | ~3K | Full architecture, health scores, file map |
| **L2** (memory) | + `/tasks` + `/memory` + `/onboard` + `/status` + `/pulse` | ~6K | Cross-session memory, task queue, session bootstrap |
| **L3** (actions) | + `/actions` + `/webhooks` + `/notify` | ~6K | Trigger commands, GitHub auto-tasks, alert channels |

### This Implementation: 125/125 Tests, Level 3, Grade A

```bash
# Run the compliance validator yourself
node tests/pcp-validator.cjs
# 125 tests | 125 PASS | 0 FAIL | 0 WARN
# PCP Compliance Level: Level 3
# Grade: A
```

Key metrics from this reference implementation:
- **Brief**: 209 tokens, 5ms response — an agent understands the project in one call
- **Pulse**: 68 bytes, 5ms — lightest possible heartbeat for dashboard auto-refresh
- **17 endpoints** at `/api/pcp/*` with full `/api/agent/*` backward compatibility
- **KV-backed memory** — learnings, decisions, blockers persist across AI sessions
- **Token-budget metadata** — every response declares its cost so agents can budget

Full spec: **[PCP-SPEC.md](PCP-SPEC.md)** (505 lines, self-contained, no dependencies on this repo)

---

## Mycelium — Your Codebase Learns From Its Own Mistakes

**Five scripts. Zero dependencies. Drop into any git repo.** It reads your commit history, finds what keeps breaking, and builds defenses automatically.

### The Problem

You fix a bug. Two weeks later, the same file breaks the same way. Your team has 50 "lessons learned" docs that nobody reads. Your pre-commit hooks check formatting, not whether you're about to repeat a mistake from 3 months ago.

## The Solution

```bash
# Add to any project — takes 30 seconds, zero npm install
cp mycelium*.cjs your-project/
cd your-project && node mycelium.cjs --init

# It reads your entire git history and immediately knows:
# - Which files break the most (and why)
# - Which files always change together
# - What patterns cause the most fix chains
# - What your pre-commit hook should actually be checking
```

**After init, every commit makes it smarter.** Every bug you fix teaches it. Every pattern it detects gets enforced.

---

## What Makes It Different

| Feature | Mycelium | ESLint / Prettier | SonarQube | Custom Scripts |
|---------|----------|-------------------|-----------|----------------|
| Learns from YOUR history | ✅ reads git log | ❌ generic rules | ❌ generic rules | ❌ manual rules |
| Knows which files break together | ✅ coupling detection | ❌ | ❌ | ❌ |
| Blocks repeated mistakes | ✅ constraint enforcement | ❌ | ⚠️ some | ❌ |
| Auto-generates tests from breakages | ✅ mycelium-upgrade | ❌ | ❌ | ❌ |
| Cryptographic proof of scores | ✅ SHA-256 hash-locked | ❌ | ❌ | ❌ |
| Zero dependencies | ✅ just Node.js | ❌ plugins | ❌ Java/Docker | ⚠️ depends |
| Works on any repo | ✅ reads git | ⚠️ config needed | ⚠️ config needed | ❌ custom per project |

---

## The Five Brains

```
Every commit triggers:
  Watcher --learn → Learner --snapshot → Evaluator --score → Fixer --heal

Pre-commit hook:
  Watcher --warn → Guard --enforce → BLOCK if pattern violation detected

On demand:
  Upgrader --apply → read breakages → generate tests + harden files + strengthen guards
```

| Script | Role | One-liner |
|--------|------|-----------|
| `mycelium.cjs` | **The Learner** | Snapshots every commit, tracks constraints, detects couplings |
| `mycelium-watch.cjs` | **The Watcher** | Scores file risk, maps breakage patterns, warns before you repeat |
| `mycelium-eval.cjs` | **The Evaluator** | 9 KPIs, SHA-256 proof, 28 self-checks including 4 anti-gaming |
| `mycelium-fix.cjs` | **The Fixer** | Diagnoses friction → prescribes → executes → verifies improvement |
| `mycelium-upgrade.cjs` | **The Upgrader** | Reads breakage history → auto-generates regression tests + guards |

---

## Quick Start

```bash
# 1. Copy the scripts (that's literally the install)
cp mycelium.cjs mycelium-watch.cjs mycelium-eval.cjs mycelium-fix.cjs mycelium-upgrade.cjs your-project/
cd your-project

# 2. Initialize (reads your git history, installs hooks, creates memory)
node mycelium.cjs --init

# 3. See what it learned about your codebase
node mycelium.cjs --status       # health score, risk areas, hottest files
node mycelium-eval.cjs           # 9 KPIs with cryptographic proof
node mycelium-watch.cjs --status # riskiest files, couplings, patterns

# 4. Auto-fix the weakest areas
node mycelium-fix.cjs --force    # diagnose → prescribe → execute
node mycelium-upgrade.cjs --apply # generate tests from breakage history

# 5. Ship (atomic: commit → test → sync → PR → merge)
node bin/mycelium.cjs ship "your commit message"
```

---

## Real Results (not hypothetical)

Mycelium was built and tested on a [92-page vanilla JS project](https://numbahwan.pages.dev) with 150+ commits. Every number below comes from `mycelium-eval.cjs` and can be verified by running it yourself.

**[→ Live showcase with metrics + honest Mycelium story](https://numbahwan.pages.dev/showcase)** · **[→ Browse all 92 pages](https://numbahwan.pages.dev/showcase#gallery)** · **[→ Source](public/showcase.html)**

| What It Found | What It Did |
|--------------|-------------|
| `cards.html` broke **10 times** from the same pattern | Auto-generated i18n key validation test — caught 24 invalid keys on first run |
| `battle.html` + `nw-battle-engine.js` always change together (28x) | Added coupling enforcement — pre-commit warns if you change one without the other |
| 3 files kept breaking after fix (30% repeat rate) | Classified failure modes (i18n, mobile, layout) and generated targeted regression tests |
| `nw-battle-engine-old.js` was an exact duplicate (identical md5) | Detected by sentinel, deleted 97KB of dead weight |
| 50 total breakages across the project lifetime | Each one became a lesson, constraint, or test — **84 regression tests** now run on every commit |

<details>
<summary><b>See the full evaluation scorecard</b></summary>

```
Mycelium-Eval v4.0 — Foolproof Learning System Evaluation

  Overall: 75/100 (B) [proof: 6bc6c35005d35e8c]
  Data: 150 commits | 50 breakages | 49 learnings | 75 constraints

  Scorecard:
    █████░░░░░   50  Fix Rate Trend       (15%)  Real bug fix rate: 15%→16%
    ████░░░░░░   35  Repeat Prevention    (15%)  3/10 files still repeat (30%)
    ██████████  100  Constraint Coverage  (15%)  7/7 breakage areas covered
    ██████████  100  Lesson Quality       (15%)  50/50 lessons are specific
    ████░░░░░░   40  Fix Chain Speed      (10%)  3 chains, avg length 4.0
    ██████████  100  Knowledge Density    (10%)  141/141 risky files documented
    █████████░   90  Warning Coverage     (10%)  63% warning, 82% coupling
    ██████████  100  Bundle Health         (5%)  390KB under 400KB target
    █████████░   90  Fixer Effectiveness   (5%)  17 fixes, 13 hardened, guard enforced

  Verification: 28/28 self-checks passed (4 anti-gaming checks included)
  Sliding Window: real bug rate improved 13% (earliest 40 vs latest 40 commits)
```

The score is **75, not 95** — because Mycelium is honest. Repeat Prevention is 35/100 because 3 files still repeat. The only way to improve is to actually stop those files from breaking.

</details>

<details>
<summary><b>See the diagnosis engine output</b></summary>

```
mycelium-fix — Friction Analysis Engine

  ▸ Fix Rate Trend: 50/100 (weight 15%)
    Root Causes:
      ! cards.html — fixed 6x after learning system installed
      ! nw-battle-engine.js — fixed 5x after learning system installed
      ! battle.html — fixed 4x after learning system installed
    Prescription: PREVENT_NEW_BUGS → add guards to top 5 offenders
    Expected: +15-30 points

  ▸ Repeat Prevention: 35/100 (weight 15%)
    Root Causes:
      ✗ cards.html — broke 10x, dominant failure: ui/layout (4x)
      ✗ markets.html — broke 7x, dominant failure: i18n (3x)
      ✗ battle.html — broke 7x, dominant failure: ios (2x)
    Prescriptions:
      STRENGTHEN_CONSTRAINTS → preventive rules for 7 repeat files
      ENFORCE_CO_CHANGES → make coupling violations blocking
    Expected: +20-40 points

  Summary: 3 friction points, 5 prescriptions, +24 pts potential
```

</details>

<details>
<summary><b>See the upgrade tool output</b></summary>

```
mycelium-upgrade — The Immune Booster

  Analysis:
    Breakages analyzed:  50
    Repeat offenders:    15
    File couplings:      8 (≥5x co-changed)
    Constraint areas:    20

  Top repeat offenders:
    10x  public/cards.html       [i18n:2, mobile:1, layout:1]
     7x  public/markets.html     [i18n:3, mobile:2]
     7x  public/battle.html      [layout:1, mobile:2]

  [1] Harden HTML files with data-testid markers
    ✓ Applied 3 files

  [2] Generate targeted regression tests
    Tests generated: 52 (i18n:20, mobile:9, layout:3, structure:11, runtime:9)
    ✓ Written to tests/regression-upgrade.cjs

  [3] Strengthen pre-commit guard
    Coupling checks: 7 | File-specific checks: 5
    ✓ Written to .husky/pre-commit
```

</details>

---

## Also Included: `sentinel.cjs`

> Zero-dependency codebase health scanner. One file. Works on any JS/TS project.

```bash
# Try it on your project right now
curl -O https://raw.githubusercontent.com/9tvf4k6srt-sys/NumbahWan-tcg/main/sentinel.cjs
node sentinel.cjs
```

Scores 10 modules: architecture, assets, i18n, dead code, security, performance, API surface, dependencies, accessibility, SEO meta. Includes auto-fix commands.

---

## Why "Mycelium"?

In nature, [mycelium](https://en.wikipedia.org/wiki/Mycelium) is the underground fungal network that connects trees in a forest. When one tree is attacked, the network warns the others. When one tree has excess nutrients, the network shares them.

This system does the same thing for your codebase. When one file breaks, every connected file learns. When you fix a bug, the pattern becomes a constraint that prevents recurrence.

---

## Project Structure

```
├── PCP-SPEC.md                  # Project Context Protocol specification
├── src/routes/agent.ts          # PCP reference implementation (488 lines)
├── public/agent.html            # Agent command center dashboard
├── public/.well-known/pcp.json  # PCP discovery manifest
├── tests/pcp-validator.cjs      # 125-check compliance validator
├── tests/pcp-compliance.cjs     # 68-check core compliance validator
├── bin/agent-brief.cjs          # CLI agent brief (7 modes)
├── mycelium.cjs                 # The Learner
├── sentinel.cjs                 # Health scanner (standalone)
├── bin/mycelium.cjs             # Unified CLI
├── .mycelium/                   # All runtime data
│   ├── memory.json              # Learner state (snapshots, constraints, breakages)
│   ├── watch.json               # Watcher state (commits, risks, couplings)
│   └── config.json              # Configuration
└── tests/
    ├── run-tests.cjs            # Full test suite
    ├── smoke-test.cjs           # HTTP smoke tests
    └── nw-i18n-guard.cjs        # i18n validation
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). If you find something useful — take it. MIT license.

Good first contributions:
- Run `node mycelium.cjs --init` on your own project and share what it finds
- Run `node sentinel.cjs` on any JS project and open a PR with improvements
- Add an [issue](../../issues) if a breakage pattern isn't caught

---

<div align="center">

**NumbahWan TCG** — AI-native project infrastructure

**[PCP Spec](PCP-SPEC.md)** | **[Agent Dashboard](https://numbahwan.pages.dev/agent)** | **[Live Showcase](https://numbahwan.pages.dev/showcase)** | **[Get Started](#quick-start)** | **[How It Works](#the-five-brains)**

*PCP is an open specification. MCP connects tools. A2A connects agents. PCP connects projects.*

</div>
