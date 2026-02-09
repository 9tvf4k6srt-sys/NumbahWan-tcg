# CLAUDE.md — AI Session Protocol

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
node nw-memory.cjs --premortem <area>
```

If you skip steps 1-2, the pre-commit hook will reject your commit with:
`BLOCKED: No .nw-session file. Read CLAUDE.md and run the startup checklist.`

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
node nw-memory.cjs --decide "<area>" "<what>" "<why>"
node nw-memory.cjs --constraint "<area>" "<fact>"
node nw-memory.cjs --broke "<area>" "<what happened>"
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
     ↑                                                    │
     └──── .nw-context auto-refreshed on every commit ───┘
```

## CRITICAL: Chat Compaction Survival
Chat platforms compress history, which **destroys in-flight task state** (todo lists, progress).
The fix: write your current task to disk with `--wip` BEFORE starting work.
After compaction, `.nw-context` will show the WIP section and you can RESUME instead of re-planning.
```bash
# Starting a multi-step task:
node nw-memory.cjs --wip "upgrading battle arena v8 — step 1: refactor CSS"

# Progressed further:
node nw-memory.cjs --wip-append "step 2: JS rewrite done, testing remaining"

# Task complete:
node nw-memory.cjs --wip-done
```

## Quick Reference
| When | Do |
|------|-----|
| Session start | `cat .nw-context` then `echo $(date +%s) > .nw-session` |
| Before modifying an area | `node nw-memory.cjs --premortem <area>` |
| Before modifying a specific file | `node nw-memory.cjs --whyfile <path>` |
| After fixing a bug | `node nw-memory.cjs --postfix` then `--learned` |
| Something broke | `node nw-memory.cjs --broke "area" "what"` |
| Learned something from fixing | `node nw-memory.cjs --learned "area" "lesson"` |
| Made a non-obvious choice | `node nw-memory.cjs --decide "area" "what" "why"` |
| Found a platform gotcha | `node nw-memory.cjs --constraint "area" "fact"` |
| See which files belong to an area | `node nw-memory.cjs --areamap` |
| Full history dump | `node nw-memory.cjs --query` |
| Health check | `node nw-memory.cjs --health` |
| Deep pattern analysis | `node nw-memory.cjs --reflect` |
| Starting a task (survives compaction) | `node nw-memory.cjs --wip "what I'm doing"` |
| Task progressed | `node nw-memory.cjs --wip-append "next step done"` |
| Task finished | `node nw-memory.cjs --wip-done` |
| Auto-guard before editing files | `node nw-memory.cjs --guard <file1> <file2>` |
| Auto-guard (reads staged files) | `node nw-memory.cjs --guard` (also runs in pre-commit hook) |
| Generate regression tests from breakages | `node nw-memory.cjs --gen-tests` |
| Export learnings to shared library | `node nw-memory.cjs --export-shared` |
| Import learnings from shared library | `node nw-memory.cjs --import-shared` |
| View shared library | `node nw-memory.cjs --shared` |
| gitwise dashboard (danger scores, risks) | `node gitwise.cjs --status` |
| gitwise warn on staged files | `node gitwise.cjs --warn` |
| gitwise reinstall (rescan history) | `node gitwise.cjs --install` |
| **Evaluate learning system** | `node nw-memory.cjs --eval` (combined NW-Memory + gitwise) |
| **Evaluate gitwise only** | `node gitwise.cjs --eval` (7 metrics, A→F grade) |
| **Self-heal NW-Memory** | `node nw-memory.cjs --heal` (force eval + auto-fix weak scores) |
| **Self-heal gitwise** | `node gitwise.cjs --heal` (force eval + auto-fix weak scores) |

## Self-Healing Learning System

Both NW-Memory and gitwise auto-evaluate and auto-fix themselves:
- **Every 10 commits/snapshots**: silently runs eval, detects weak scores, takes corrective action
- **NW-Memory self-heal actions**: auto-creates constraints from breakage lessons, enriches constraints with gitwise deep lessons, promotes breakages to learnings, triggers deep reflection, marks fix-chain hotspots
- **gitwise self-heal actions**: escalates repeat offenders, lowers coupling threshold, re-extracts weak lessons, tags volatile files in active fix-chains, backfills missing risk entries
- **Manual trigger**: `--heal` on either tool forces immediate eval + fix cycle
- **No human intervention needed**: the system improves itself after every learning event

## Two Learning Systems (both active)

### gitwise (passive — zero config, zero commands)
gitwise watches every commit and warns before you repeat a mistake. You don't run it.
- **Post-commit hook**: auto-learns breakages, file couplings, risk patterns
- **Pre-commit hook**: auto-warns if staged files have broken before or are missing coupled files
- **Dashboard**: `node gitwise.cjs --status` (danger scores, riskiest files, couplings)
- **Manual warn**: `node gitwise.cjs --warn` (test what warnings staged files would get)
- **Install on any repo**: `node gitwise.cjs --install` (scans history, sets up hooks)

### NW-Memory (active — discipline-based power tool)
NW-Memory stores constraints, decisions, breakages, and learnings you explicitly record.
Both tools share intelligence: NW-Memory uses gitwise's deep lesson extraction (commit body + diff analysis)
for auto-reflect, postfix, and breakage recording.

| What | gitwise does automatically | NW-Memory adds on top |
|------|--------------------------|----------------------|
| Learn from fixes | Reads commit body + diff | Stores in constraints/learnings |
| Warn before mistakes | Pre-commit: "broke 7x, danger 31.9" | --guard: area constraints + coupled files |
| Risk tracking | Danger score per file | Area-level breakage history |
| Lessons | 98% specific from diffs | Human-curated + auto-extracted |
| Workflow | Invisible | Session protocol + WIP persistence |

## Areas
battle, forge, i18n, nav, economy, collection, wallet, cards, tabletop, emoji, dom, ios, modules, font, memory, workflow, oracle, sentinel, lore, discoverability, absurd, exchange
