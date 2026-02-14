# CLAUDE.md — Mycelium Session Protocol

## !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
## !! STOP. READ .mycelium-context BEFORE YOU WRITE A SINGLE LINE OF CODE.
## !! YOU SKIPPED THIS LAST SESSION AND WASTED THE USER'S TIME.
## !! RUN: cat .mycelium-context
## !! IF YOU DON'T, THE PRE-COMMIT HOOK WILL BLOCK YOUR COMMIT.
## !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

## ⛔ TOKEN BUDGET & COST OPTIMIZATION — HARD LIMIT 200K (MANDATORY)

**Root cause of past failure**: Session hit 210,007 tokens > 200,000 max during a Write File.
Multiple full-file Tool Results (~7 large code dumps back-to-back) accumulated with no budget
tracking. The conversation context ballooned invisibly. This is a PERMANENT rule.

### The Cost Equation
Every AI interaction has cost = input_tokens + output_tokens. Both count toward the 200K cap
AND toward monetary cost. **Minimize both. Always pick the cheapest operation that achieves
the goal. Quality comes from precision, not volume.**

### Operation Cost Tiers (ALWAYS pick lowest tier that works):

| Tier | Operation | ~Tokens | When to use |
|------|-----------|---------|-------------|
| 1 (free) | `grep -n "pattern" file` | 5-50 | Finding a function, checking if something exists |
| 1 (free) | `wc -l file`, `head -20 file` | 5-20 | Checking file size, reading headers |
| 2 (cheap) | `Read file offset=X limit=100` | 500-1500 | Reading a specific function you located with grep |
| 2 (cheap) | `node mycelium.cjs --premortem X` | 200-500 | Getting area-specific context |
| 3 (medium) | `cat .mycelium-context` | ~5K | Session start only — do NOT re-read mid-session |
| 3 (medium) | `cat CLAUDE.md` | ~3K | Session start only |
| 4 (expensive) | `Read file` (whole, <50KB) | 5K-12K | Only when you need full file understanding |
| 5 (DANGER) | `Read file` (whole, >50KB) | 12K-46K | NEVER do this. Use grep + chunk reads |
| 6 (FATAL) | `Read .mycelium/memory.json` | ~186K | NEVER. Use --query or --status instead |

### Hard Rules (violating = session crash or wasted money):
1. **ALWAYS start at Tier 1**. Grep first, read second, read-whole never.
2. **Max 2 full-file reads per session** for files >20KB. After that, grep-only.
3. **NEVER read .mycelium/memory.json or watch.json** into conversation. Use CLI commands.
4. **Write large files (>200 lines) in ONE Write File call** — don't accumulate code in chat.
5. **After 4+ tool results**, assume 50%+ budget used. Switch to grep-only mode.
6. **For multi-file refactors**: max 2 large files per session. Break work across commits.
7. **Run `node mycelium.cjs --token-check`** before any session that will touch large files.
8. **If a Tool Result returns >3K tokens of content**, summarize it mentally — don't request more.
9. **Prefer `Edit` over `Read+Write`** — editing specific lines costs less than reading entire files.
10. **cat .mycelium-context once at start** — if you need to re-check something, grep it.

### Cost-Saving Patterns:
```bash
# BAD (46K tokens): Read entire mycelium.cjs to find the brief() function
Read file_path=mycelium.cjs

# GOOD (50 tokens): Find the function, then read just that section
grep -n "function brief" mycelium.cjs          # → line 1759
Read file_path=mycelium.cjs offset=1759 limit=80  # → 600 tokens

# BAD (186K tokens — FATAL): Read memory to check constraints
Read file_path=.mycelium/memory.json

# GOOD (300 tokens): Use the CLI
node mycelium.cjs --premortem battle            # → structured summary

# BAD (10K tokens): Read file, modify, write back
Read file_path=sentinel.cjs  # Use grep to find sections
# ... then Write file back           # 10K tokens out = 20K total

# GOOD (200 tokens): Edit specific lines
Edit old_string="const X = 5" new_string="const X = 10"  # 200 tokens total
```

### File Cost Reference:
| File | Size | ~Tokens | Strategy |
|------|------|---------|----------|
| .mycelium-context | ~20KB | ~5K | cat once at session start |
| CLAUDE.md | ~12KB | ~3K | cat once at session start |
| sentinel.cjs | ~97KB | ~24K | grep only, NEVER read whole |
| mycelium.cjs | ~230KB | ~58K | grep only, NEVER read whole |
| mycelium.cjs | ~175KB | ~44K | grep only, NEVER read whole |
| .mycelium/memory.json | ~745KB | ~186K | --query/--status ONLY |
| .mycelium/watch.json | ~267KB | ~67K | --status ONLY |

## Session Startup Checklist (MANDATORY — do ALL of these FIRST)
```bash
# 1. Read the brain — this has rules, breakages, decisions, fragile files
cat .mycelium-context

# 2. Create session marker (REQUIRED or commits will be blocked)
echo $(date +%s) > .mycelium-session

# 3. Pre-mortem for the area you're about to touch
node mycelium.cjs --premortem <area>
```

If you skip steps 1-2, the pre-commit hook will reject your commit with:
`BLOCKED: No .mycelium-session file. Read CLAUDE.md and run the startup checklist.`

## CRITICAL: Mobile-First iOS Development

## ⛔ VALUE GATE — Read Before Building ANYTHING
Before ANY multi-file change, answer these three questions OUT LOUD:
1. **What metric does this improve?** (eval score, test count, bundle size)
2. **What bug does this fix?** (specific breakage, user-reported issue)
3. **What user-requested feature does this add?**

**If ALL THREE answers are "none" → STOP. Tell the user: "This is cosmetic/structural only — should I skip it?"**

Patterns that trigger this gate:
- Moving/renaming files without behavior change
- "Reorganizing" directory structure
- Metaphor-driven restructuring ("make it more like X")
- Refactors that touch 5+ files but change zero tests
- User asked a QUESTION → answer it, don't auto-build

**History**: AI wasted 30+ edits moving scripts into `.mycelium/` because user asked
"is duplicating mycelium necessary?" — a question, not a request. Zero value added.

## ⛔ HONESTY GATE — No Untested Claims
When asked "can X do Y?" or "does X work for Z?":
1. **VERIFY FIRST** — test it, don't assume
2. **Never undersell to appear cautious** — that's as dishonest as overselling
3. **Never confuse OUR DATA with TOOL CAPABILITIES** — the tool works on any git history

**History**: AI told user mycelium was "useless to other developers" without testing it.
Every component works on any git repo — the scoring is math on commits, not project-specific.

## CRITICAL: Mobile-First iOS Development
- **Primary target**: iOS mobile (iPhone). User tests on iOS Safari.
- **All screenshots**: Use iPhone viewport (375x812 or 390x844) with `is_mobile=True`, touch support.
- **All testing**: Verify on mobile viewport FIRST, desktop second.
- **Overlays**: Dismiss any overlay/modal (onboarding, guide) before taking screenshots.
  - `page.evaluate("document.getElementById('nw-onboarding')?.remove(); document.querySelectorAll('.nw-onboarding-overlay').forEach(e=>e.remove());")`
  - `page.evaluate("localStorage.setItem('nw_onboarding_complete','true');")`
- **CSS**: Always include `-webkit-` prefixes for iOS Safari (background-clip, etc.)
- **No hover-only interactions**: Everything must work with touch.

## Before EVERY Commit (enforced by hook)
The pre-commit hook checks that you recorded at least ONE learning this session.
If you haven't, the commit is **blocked** until you run one of:
```bash
node mycelium.cjs --decide "<area>" "<what>" "<why>"
node mycelium.cjs --constraint "<area>" "<fact>"
node mycelium.cjs --broke "<area>" "<what happened>"
```

This isn't optional. Every session produces knowledge. Record it.

## The Protocol
```
1. cat .mycelium-context              ← read the brain (includes CHECKPOINT if any)
2. echo $(date +%s) > .mycelium-session  ← mark session started
3. IF .mycelium-context has !!RESUME!! section ← RESUME that work, do NOT re-plan
4. premortem for your area      ← check what broke before
5. --checkpoint '{...}'         ← save STRUCTURED task state (survives compaction)
6. work                         ← build the thing
7. record learnings             ← --decide, --constraint, or --broke
8. git commit                   ← hooks handle the rest
9. --wip-done                   ← clear WIP after task complete
10. node bin/mycelium.cjs ship "msg" ← DEPLOY: auth→test→sync→push→PR→merge
     ↑                                                    │
     └──── .mycelium-context auto-refreshed on every commit ───┘
```

## CRITICAL: Deployment — ALWAYS use `mycelium ship`
**NEVER** manually run `git push` + `gh pr create` + `gh pr merge` separately.
Two bugs recurred 3+ times before this was fixed:
1. **Auth token expires** → `git push` fails with "Invalid username or token"
2. **Workflow stops after PR creation** → PR never gets merged

The fix is `mycelium ship` which does all 9 steps atomically:
```bash
node bin/mycelium.cjs ship "feat: my change description"
```
Steps: [1] auto-commit → [2] validate (eval+tests) → [3] refresh auth → [4] sync remote → [5] squash → [6] push → [7] PR → [8] merge → [9] sync local

## CRITICAL: Chat Compaction Survival
Chat platforms compress history, which **destroys in-flight task state** (todo lists, progress).
**Past failure**: After compaction, AI read .mycelium-context (which had no WIP), then started
randomly reading files and doing unrelated work instead of resuming the interrupted task.

### Checkpoint System (PREFERRED — structured, rich)
For any task with 2+ steps, save a **checkpoint** BEFORE starting work:
```bash
# Save structured checkpoint (JSON with task, steps, pending items, file refs):
node mycelium.cjs --checkpoint '{"task":"market fixes","steps":["stone->wood","lazy-load audit","NPC reseed","smoke+PR"],"completed":["stone->wood in market.html"],"pending":["audit other pages","NPC reseed test","smoke+PR"],"files":["public/market.html","public/static/nw-wallet.js","src/routes/market-trading.ts"],"context":{"pr":"#41","build":"395.91KB","commit":"c34cdbb"},"resumeHint":"Continue from first pending step. Do NOT re-read files already completed."}'

# Read current checkpoint:
node mycelium.cjs --checkpoint

# Update checkpoint as steps complete (overwrite with new state):
node mycelium.cjs --checkpoint '{"task":"market fixes","steps":[...],"completed":["step1","step2"],"pending":["step3"],...}'

# Task complete — clear checkpoint + WIP:
node mycelium.cjs --wip-done
```

### WIP System (FALLBACK — simple text)
For quick single-step tasks:
```bash
node mycelium.cjs --wip "upgrading battle arena v8 — step 1: refactor CSS"
node mycelium.cjs --wip-append "step 2: JS rewrite done, testing remaining"
node mycelium.cjs --wip-done
```

### MANDATORY RULES:
1. **BEFORE starting any multi-step task** → save a --checkpoint
2. **AFTER completing each step** → update the checkpoint with new completed/pending
3. **After compaction** → .mycelium-context shows `# !!RESUME!!` section → follow it exactly
4. **NEVER start reading random files after compaction** → read checkpoint first, resume from pending
5. If .mycelium-context has `!!RESUME!!` section → do NOT re-plan, continue from pending steps

## Quick Reference
| When | Do |
|------|-----|
| Session start | `cat .mycelium-context` then `echo $(date +%s) > .mycelium-session` |
| Before modifying an area | `node mycelium.cjs --premortem <area>` |
| Before modifying a specific file | `node mycelium.cjs --whyfile <path>` |
| After fixing a bug | `node mycelium.cjs --postfix` then `--learned` |
| Something broke | `node mycelium.cjs --broke "area" "what"` |
| Learned something from fixing | `node mycelium.cjs --learned "area" "lesson"` |
| Made a non-obvious choice | `node mycelium.cjs --decide "area" "what" "why"` |
| Found a platform gotcha | `node mycelium.cjs --constraint "area" "fact"` |
| See which files belong to an area | `node mycelium.cjs --areamap` |
| Full history dump | `node mycelium.cjs --query` |
| Health check | `node mycelium.cjs --health` |
| Deep pattern analysis | `node mycelium.cjs --reflect` |
| Starting a task (survives compaction) | `node mycelium.cjs --checkpoint '{"task":"...","pending":["..."]}'` |
| Simple WIP (text only) | `node mycelium.cjs --wip "what I'm doing"` |
| Task progressed | Update checkpoint with new completed/pending, or `--wip-append` |
| Task finished | `node mycelium.cjs --wip-done` |
| Auto-guard before editing files | `node mycelium.cjs --guard <file1> <file2>` |
| Auto-guard (reads staged files) | `node mycelium.cjs --guard` (also runs in pre-commit hook) |
| Generate regression tests from breakages | `node mycelium.cjs --gen-tests` |
| Export learnings to shared library | `node mycelium.cjs --export-shared` |
| Import learnings from shared library | `node mycelium.cjs --import-shared` |
| View shared library | `node mycelium.cjs --shared` |
| Project health dashboard | `node sentinel.cjs` |
| Self-heal issues | `node sentinel.cjs --heal` |
| Design + i18n guard | `node sentinel.cjs --guard` |
| **Evaluate learning system** | `npx mycelium eval` (9 KPIs, cryptographic proof) |
| **Token budget check** | `node mycelium.cjs --token-check` (file sizes vs 200K limit) |
| **Cost plan for files** | `node mycelium.cjs --cost-plan file1 file2` (cheapest approach) |
| **Diagnose root causes** | `npx mycelium diagnose` (friction → files → causes) |
| **Auto-fix** | `npx mycelium fix --force` (diagnose → prescribe → execute → verify) |
| **System status** | `npx mycelium status` (scores, pending prescriptions) |

## Self-Improving Codebase (Mycelium)

The Mycelium system auto-evaluates and auto-fixes itself:
- **Every 10 commits/snapshots**: silently runs eval, detects weak scores, takes corrective action
- **Learner (mycelium.cjs)**: auto-creates constraints from breakage lessons, enriches constraints with watcher deep lessons, promotes breakages to learnings, triggers deep reflection, marks fix-chain hotspots
- **Guardian (sentinel.cjs)**: unified validation, scoring, self-heal, design guard, manifest, CI gate
- **Memory (mycelium.cjs)**: project learning, breakage tracking, context delivery
- **No human intervention needed**: the system improves itself after every learning event

### EVAL ANTI-GAMING RULES (MANDATORY)
**NEVER** modify eval scoring thresholds, add bonus systems, or create secondary signals.
- Each metric score = ONE raw number → frozen threshold lookup → score
- No "bonus", "credit", "nudge", "momentum", or "active prevention" systems
- The ONLY way to improve a score is to improve actual raw data (fewer bugs, fewer repeat files, shorter fix chains)
- Verify checks AG-1 through AG-4 will FAIL if scoring rules are tampered with
- Scoring rules hash is frozen: any threshold change breaks verification
- If `--verify` fails, the scoring has been gamed — revert immediately

## Two Learning Subsystems (both active)

### Mycelium Watch (passive — zero config, zero commands)
The watcher monitors every commit and warns before you repeat a mistake. You don't run it.
- **Post-commit hook**: auto-learns breakages, file couplings, risk patterns
- **Pre-commit hook**: auto-warns if staged files have broken before or are missing coupled files
- **Dashboard**: `node sentinel.cjs` (health scores, issues, trend)
- **Quick context**: `node bin/agent-brief.cjs --quick` (instant project state)
- **Validate**: `node sentinel.cjs --guard` (design + i18n + include checks)

### Mycelium Core (active — discipline-based power tool)
The learner stores constraints, decisions, breakages, and learnings you explicitly record.
Both subsystems share intelligence: the learner uses the watcher's deep lesson extraction (commit body + diff analysis)
for auto-reflect, postfix, and breakage recording.

| What | Watcher does automatically | Learner adds on top |
|------|--------------------------|----------------------|
| Learn from fixes | Reads commit body + diff | Stores in constraints/learnings |
| Warn before mistakes | Pre-commit: "broke 7x, danger 31.9" | --guard: area constraints + coupled files |
| Risk tracking | Danger score per file | Area-level breakage history |
| Lessons | 98% specific from diffs | Human-curated + auto-extracted |
| Workflow | Invisible | Session protocol + WIP persistence |

## Areas
battle, forge, i18n, nav, economy, collection, wallet, cards, tabletop, emoji, dom, ios, modules, font, memory, workflow, oracle, sentinel, lore, discoverability, absurd, exchange

## =====================================================
## NumbahWan TCG — Project Architecture & Context
## =====================================================
## This section preserves context across conversations.
## If you're a new AI session: READ THIS FIRST.

### Stack
- **Backend**: Hono (TypeScript) on Cloudflare Pages (Workers runtime)
- **Frontend**: 94 static HTML pages in `public/`, each with inline JS
- **Routing**: `src/routes/pages.ts` — Hono routes serve HTML files (ASSETS in prod, fs.readFileSync in dev)
- **Dev server**: `serve.cjs` (Node.js static server with clean URL support, port 3000)
- **Build**: Vite + @hono/vite-build + @hono/vite-dev-server
- **Deploy**: `wrangler pages deploy dist/` (Cloudflare Pages)
- **DB**: Cloudflare D1 (GUILD_DB binding), KV (MARKET_CACHE binding)

### Key Files (DO NOT break these)
| File | Purpose | Size |
|------|---------|------|
| `public/static/nw-nav.js` | Universal nav (hamburger menu, lang toggle, progressive disclosure) | 1283 lines |
| `public/static/nw-i18n-core.js` | i18n system (register translations, apply to DOM, event-driven) | 387 lines |
| `public/static/nw-wallet.js` | Wallet/economy (NWG currency, daily rewards, achievements) | 2119 lines |
| `src/index.tsx` | Hono app entry — mounts all API routes + security headers | ~200 lines |
| `src/routes/pages.ts` | Clean URL routing — serves `public/*.html` for `/<page>` URLs | ~140 lines |
| `serve.cjs` | Dev static server — clean URLs, MIME types, port 3000 | ~65 lines |

### i18n System — HOW IT WORKS
1. **nw-i18n-core.js** is the single source of truth for language state
   - Storage key: `nw_lang` (also syncs to legacy keys: `lang`, `preferred_lang`)
   - Supported languages: `en`, `zh`, `th`
   - Auto-initializes on DOMContentLoaded
   - Applies translations to `[data-i18n]`, `[data-i18n-html]`, `[data-i18n-placeholder]`, `[data-i18n-title]`
2. **Pages register translations** via `NW_I18N.register({ en: {...}, zh: {...}, th: {...} })`
   - Backward-compatible alias: `initI18n(translations)` → calls `NW_I18N.register()`
3. **Nav dispatches these events on language change**:
   - `nw-lang-change` (on both `document` and `window`) ← THIS IS THE CORRECT EVENT NAME
   - `languageChanged` (on `document`) ← legacy
4. **nw-i18n-core.js listens** for `nw-lang-change` and `languageChanged` → calls `setLang()` → `_applyTranslations()`
5. **Pages listen** for `nw-lang-change` on `window` for custom rendering updates

### ⚠️ KNOWN PAST BUG: Event Name Mismatch
Some pages had `nw-language-change` (wrong) instead of `nw-lang-change` (correct).
The nav dispatches `nw-lang-change`. If a page listens for `nw-language-change`, it won't react.
FIXED in Feb 2026. If you see `nw-language-change` in any page, it's a bug — change to `nw-lang-change`.

### ⚠️ KNOWN PAST BUG: injectNav() Destroys Open Menu
`NW_NAV.injectNav()` removes ALL nav DOM elements and recreates them. If called while the nav
panel is open (e.g., during language switch), the menu disappears because the new panel lacks
the `.open` class. FIXED: language change now updates button states in-place without calling
`injectNav()`.

### Nav System — Progressive Disclosure
- `NW_NAV` in `nw-nav.js` manages all navigation
- Tier system (0-5): sections unlock based on play stats (pullsMade, gamesPlayed, collection size)
- All pages always accessible by direct URL (only nav visibility changes)
- URL `?tier=5` forces showing everything (for testing)
- Language buttons (`.nw-lang-btn`) are inside the nav panel
- Page-level `.lang-btn` buttons are dead code from old system — nav handles all language switching now

### Clean URL Routing
- Production (Cloudflare): `c.env.ASSETS.fetch()` serves HTML
- Dev (serve.cjs): reads `public/<page>.html` from disk for `/<page>` requests
- Vite dev server: `src/routes/pages.ts` uses `fs.readFileSync` fallback when no ASSETS binding
- ALL 94 pages accessible as both `/<page>` and `/<page>.html`

### NWG Economy (reference)
- $1 USD = 100 NWG (fixed)
- Total supply: 1,000,000,000 NWG (burns reduce supply)
- 1 NWG = 10 Gold; converting 100 NWG → Gold costs 2 NWG fee (100 NWG → 980 Gold)
- Signup: 100 NWG; Daily login: up to 70 NWG/day (7-day streak); Referral: 100 NWG
- Staking: 30% of supply in rewards pool, 10% early unstaking penalty

### Dev Server Quick Start
```bash
# Start dev server (simple static, recommended for sandbox)
cd /home/user/webapp && node serve.cjs &
# Access at http://localhost:3000/markets, /treasury, /buy, etc.

# OR: Start Vite dev server (with HMR, API routes)
cd /home/user/webapp && npx vite --port 3000 --host 0.0.0.0
# Note: Vite needs node_modules installed (npm install)

# Test all routes
for p in markets treasury buy restaurant services; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/$p) /$p"
done
```

### 🧠 User Preferences & Workflow (auto-learned, session-persistent)
**Updated**: 2026-02-14

#### Design Preferences
- **Quality bar**: "AAA-looking" — not flat/minimal. Game-icons.net level detail but more premium
- **SVG icons**: Must be "full-on beautiful drawings using SVG", intricate, detailed, comparable to professional game UI
- **Style**: Fantasy RPG, golden gradients, glow effects, premium feel
- **Acceptable**: AI-generated WebP backgrounds behind feature cards
- **Unacceptable**: Simple/flat emoji-style SVGs, minimalist line icons

#### Communication Preferences
- **Proactive links**: Always share live URLs without being asked
- **Batch review > drip-feed**: Show everything at once (dashboard), not one screenshot at a time
- **Decision style**: "Let me see it first, then I'll tell you what to fix"
- **Efficiency-first**: Minimize back-and-forth messages; build tools to reduce friction
- **Self-improving**: Compound knowledge across sessions; auto-detect and fix workflow friction

#### Workflow Preferences
- **Review Dashboard**: `/dev/icon-review.html` — all icons at large scale with approve/flag buttons
- **Screenshot Helper**: `dev-screenshot.cjs` — quick section screenshots (`node dev-screenshot.cjs [section]`)
- **Batch feedback**: User flags icons on dashboard → pastes feedback → AI fixes all at once
- **Auto-commit**: Background watcher for change batching

#### Friction Points Identified (keep reducing these)
1. ~~Screenshot round-tripping~~ → SOLVED: Review Dashboard
2. ~~"Give me the link"~~ → SOLVED: Proactive URL sharing
3. ~~Section-by-section review~~ → SOLVED: All-in-one dashboard
4. ~~No old vs new comparison~~ → SOLVED: Before/after on dashboard
5. Icon quality iteration loop → PARTIALLY SOLVED: Large 96px previews help, but SVG detail level needs upgrading

### GitHub Workflow
- Branch: `genspark_ai_developer`
- PR: #42 (feat(nwg): What is NWG? intro + economy + fixes)
- Repo: https://github.com/9tvf4k6srt-sys/NumbahWan-tcg
- Always: `setup_github_environment` before push (token refresh)
