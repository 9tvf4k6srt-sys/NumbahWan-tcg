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
1. cat .nw-context              ← read the brain
2. echo $(date +%s) > .nw-session  ← mark session started
3. premortem for your area      ← check what broke before
4. work                         ← build the thing
5. record learnings             ← --decide, --constraint, or --broke
6. git commit                   ← hooks handle the rest
     ↑                                                    │
     └──── .nw-context auto-refreshed on every commit ───┘
```

## Quick Reference
| When | Do |
|------|-----|
| Session start | `cat .nw-context` then `echo $(date +%s) > .nw-session` |
| Before modifying an area | `node nw-memory.cjs --premortem <area>` |
| Something broke | `node nw-memory.cjs --broke "area" "what"` |
| Made a non-obvious choice | `node nw-memory.cjs --decide "area" "what" "why"` |
| Found a platform gotcha | `node nw-memory.cjs --constraint "area" "fact"` |
| Full history dump | `node nw-memory.cjs --query` |
| Health check | `node nw-memory.cjs --health` |

## Areas
battle, forge, i18n, nav, economy, collection, wallet, cards, tabletop, emoji, dom, ios, modules, font, memory, workflow
