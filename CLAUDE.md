# CLAUDE.md — Mycelium Session Protocol

## !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
## !! STOP. READ .nw-context BEFORE YOU WRITE A SINGLE LINE OF CODE.
## !! YOU SKIPPED THIS LAST SESSION AND WASTED THE USER'S TIME.
## !! RUN: cat .nw-context
## !! IF YOU DON'T, THE PRE-COMMIT HOOK WILL BLOCK YOUR COMMIT.
## !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

## Session Startup Checklist (MANDATORY — do ALL of these FIRST)
```bash
# 1. Read the brain — this has rules, breakages, decisions, fragile files
cat .nw-context

# 2. Create session marker (REQUIRED or commits will be blocked)
echo $(date +%s) > .nw-session

# 3. Pre-mortem for the area you're about to touch
node mycelium.cjs --premortem <area>
```

If you skip steps 1-2, the pre-commit hook will reject your commit with:
`BLOCKED: No .nw-session file. Read CLAUDE.md and run the startup checklist.`

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
1. cat .nw-context              ← read the brain (includes WIP if any)
2. echo $(date +%s) > .nw-session  ← mark session started
3. IF .nw-context has WIP section ← RESUME that work, do NOT re-plan
4. premortem for your area      ← check what broke before
5. --wip "what I'm doing now"   ← save task state to disk (survives compaction)
6. work                         ← build the thing
7. record learnings             ← --decide, --constraint, or --broke
8. git commit                   ← hooks handle the rest
9. --wip-done                   ← clear WIP after task complete
10. node bin/mycelium.cjs ship "msg" ← DEPLOY: auth→test→sync→push→PR→merge
     ↑                                                    │
     └──── .nw-context auto-refreshed on every commit ───┘
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
The fix: write your current task to disk with `--wip` BEFORE starting work.
After compaction, `.nw-context` will show the WIP section and you can RESUME instead of re-planning.
```bash
# Starting a multi-step task:
node mycelium.cjs --wip "upgrading battle arena v8 — step 1: refactor CSS"

# Progressed further:
node mycelium.cjs --wip-append "step 2: JS rewrite done, testing remaining"

# Task complete:
node mycelium.cjs --wip-done
```

## Quick Reference
| When | Do |
|------|-----|
| Session start | `cat .nw-context` then `echo $(date +%s) > .nw-session` |
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
| Starting a task (survives compaction) | `node mycelium.cjs --wip "what I'm doing"` |
| Task progressed | `node mycelium.cjs --wip-append "next step done"` |
| Task finished | `node mycelium.cjs --wip-done` |
| Auto-guard before editing files | `node mycelium.cjs --guard <file1> <file2>` |
| Auto-guard (reads staged files) | `node mycelium.cjs --guard` (also runs in pre-commit hook) |
| Generate regression tests from breakages | `node mycelium.cjs --gen-tests` |
| Export learnings to shared library | `node mycelium.cjs --export-shared` |
| Import learnings from shared library | `node mycelium.cjs --import-shared` |
| View shared library | `node mycelium.cjs --shared` |
| Watcher dashboard (danger scores, risks) | `node mycelium-watch.cjs --status` |
| Watcher warn on staged files | `node mycelium-watch.cjs --warn` |
| Watcher reinstall (rescan history) | `node mycelium-watch.cjs --install` |
| **Evaluate learning system** | `npx mycelium eval` (9 KPIs, cryptographic proof) |
| **Diagnose root causes** | `npx mycelium diagnose` (friction → files → causes) |
| **Auto-fix** | `npx mycelium fix --force` (diagnose → prescribe → execute → verify) |
| **System status** | `npx mycelium status` (scores, pending prescriptions) |

## Self-Improving Codebase (Mycelium)

The Mycelium system auto-evaluates and auto-fixes itself:
- **Every 10 commits/snapshots**: silently runs eval, detects weak scores, takes corrective action
- **Learner (mycelium.cjs)**: auto-creates constraints from breakage lessons, enriches constraints with watcher deep lessons, promotes breakages to learnings, triggers deep reflection, marks fix-chain hotspots
- **Watcher (mycelium-watch.cjs)**: escalates repeat offenders, lowers coupling threshold, re-extracts weak lessons, tags volatile files in active fix-chains, backfills missing risk entries
- **Evaluator (mycelium-eval.cjs)**: 9 KPIs, cryptographic SHA-256 proof, 28 self-checks (including 4 anti-gaming), hash-locked scoring rules
- **Fixer (mycelium-fix.cjs)**: diagnoses root causes, prescribes 6 fix types, executes automatically, verifies improvement
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
- **Dashboard**: `node mycelium-watch.cjs --status` (danger scores, riskiest files, couplings)
- **Manual warn**: `node mycelium-watch.cjs --warn` (test what warnings staged files would get)
- **Install on any repo**: `node mycelium-watch.cjs --install` (scans history, sets up hooks)

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
