# CLAUDE.md — Mycelium Session Protocol

**Mission**: NumbahWan TCG is a hand-crafted static web game (cards, battles,
economy) built by a recursive learning pipeline: YAML in, production page out,
lessons permanent. Priorities: iteration speed > cost > perfection; verify,
never assume; taste is law (`TASTE.md`).

## ⛔ STOP — run the startup checklist BEFORE writing any code
```bash
cat .mycelium-context                          # the brain: rules, breakages, costs, RESUME state
echo $(date +%s) > .mycelium-session           # session marker (commits blocked without it)
node bin/task-brief.cjs "<your task>"          # CONTEXT FIREWALL: task-scoped gates/defects/files
```
Skipping steps 1-2 → pre-commit hook blocks your commit.
`task-brief` replaces broad reading: it returns ONLY the gates, past defects,
relevant files, and token budget for THIS task. Prefer it over `--premortem <area>`
(use premortem only when task-brief finds nothing).
For non-trivial tasks, let the router pick the path: `node bin/route-task.cjs "<task>"`
(fast-path vs full-reasoning + budget — don't spend deep-reasoning tokens on lookups).

## ⛔ ANTI-STALL — never make the user hit "Continue"
Known failure modes and the ONLY acceptable patterns:
1. **Large files**: `Write` tool directly — never build code in chat then write.
2. **Multi-file edits**: batch/parallel tool calls; ONE narration per batch, at the end.
3. **Verbose commands**: always pipe — `| tail -5`, `| head -20`, or `> /tmp/x && tail -5 /tmp/x`.
4. **Multi-step tasks**: checkpoint FIRST (`--checkpoint '{"task":..,"pending":[..]}'`),
   update after each step. After compaction: read checkpoint, resume — do NOT re-plan.
5. **Deploy**: ALWAYS `node bin/mycelium.cjs ship "msg"` — handles auth refresh atomically.
6. **Never echo large JSON** — `jq '.key'` or `wc -l`, not dumps.

## ⛔ TOKEN BUDGET — hard limit 200K, both directions cost money
**Always pick the cheapest operation that works. Precision, not volume.**
1. **Grep first, read second, read-whole never** (for files >20KB).
   `grep -n "pattern" file` → `Read offset=N limit=80`. Max 2 full reads of >20KB files/session.
2. **File costs are AUTO-GENERATED** in `.mycelium-context` `# COSTS` section
   (live: `node mycelium.cjs --token-check`). T3 = grep only. T4 = CLI only, NEVER read.
   NEVER read `.mycelium/memory.json` or `watch.json` — use `--query`/`--status`.
3. **Prefer Edit over Read+Write.** Write >200-line files in ONE call.
4. **After 4+ big tool results**, assume 50% budget used → grep-only mode.
5. Cost plan for specific files: `node mycelium.cjs --cost-plan f1 f2`.
Full rationale + levers: `EFFICIENCY.md`. Active per-task budgets: `docs/TOKEN-BUDGET.md`.

## ⛔ VALUE GATE — before building ANYTHING multi-file
Answer out loud: 1) What metric improves? 2) What bug is fixed? 3) What user-requested feature?
**All three "none" → STOP, tell the user "this is cosmetic — skip it?"**
Triggers: file moves/renames, "reorganizing", metaphor-driven restructure, 5+ file refactors
changing zero tests, user asked a QUESTION (answer it, don't auto-build).
History: 30+ wasted edits from treating a question as a build request.

## ⛔ HONESTY GATE — no untested claims
1. Verify FIRST — test it, don't assume. 2. Never undersell to appear cautious.
3. Never confuse OUR DATA with TOOL CAPABILITIES.
Every "done"/"passing" claim must cite the check that proves it, else say "unverified".

## ⛔ EVAL ANTI-GAMING
NEVER modify eval thresholds, add bonus/credit/nudge systems, or secondary signals.
One raw number → frozen threshold → score. Improve raw data, not scoring.
`--verify` fails = scoring was gamed = revert immediately.

## ⛔ VERIFY BEFORE "DONE" — one command
```bash
npm run ship          # bin/ship-gate.cjs: syntax + landing-lint + aitell + scorecard + i18n, changed-file aware
```
Runs in ~1s, judges only YOUR diff (incl. uncommitted + untracked). Exit 1 = fix
before claiming done. Same runner CI uses (`ci/pr-gate.yml`), same verdict.
Variants: `ship:all` (repo-wide) · `ship:smoke` (needs server :8788) · `ship:install-ci`.
This does NOT replace the HONESTY GATE: features still need a functional test
(mobile viewport first), ship-gate proves quality floors only.

## CRITICAL: Mobile-First iOS
- Primary target: iPhone Safari. Screenshots at 375x812/390x844, `is_mobile=True`, touch.
- Test mobile viewport FIRST. Dismiss overlays before screenshots
  (`document.getElementById('nw-onboarding')?.remove()`; set `nw_onboarding_complete`).
- `-webkit-` prefixes required; no hover-only interactions.

## 🎨 TASTE — before building anything a human will see
Read `TASTE.md` (one line: **precision you feel but can't see**). Banned: hollow polish, cheap-looking.

## The Protocol (per session)
```
1. startup checklist (top of this file)     6. work
2. task-brief for your task                 7. record learnings (--decide/--constraint/--broke)
3. IF !!RESUME!! in context → resume it     8. git commit (hooks handle the rest)
4. --checkpoint before multi-step work      9. --wip-done when task complete
5. route-task for path/budget              10. node bin/mycelium.cjs ship "msg"  ← deploy
```
Pre-commit hook requires ≥1 recorded learning per session — not optional.

## Compaction Survival
- Multi-step task → save `--checkpoint '{"task":..,"steps":[..],"completed":[..],"pending":[..],"files":[..],"resumeHint":".."}'` BEFORE starting; update each step.
- Quick task → `--wip "text"` / `--wip-append` / `--wip-done`.
- After compaction: `.mycelium-context` shows `# !!RESUME!!` → follow it exactly, never re-plan.

## Quick Reference (the ones you'll actually use)
| When | Do |
|------|-----|
| Session start | startup checklist (top of file) |
| Before a task | `node bin/task-brief.cjs "<task>"` · `node bin/route-task.cjs "<task>"` |
| Before touching an area (fallback) | `node mycelium.cjs --premortem <area>` |
| Why is this file the way it is | `node mycelium.cjs --whyfile <path>` |
| Something broke / learned / decided | `--broke` / `--learned` / `--constraint` / `--decide` |
| Multi-step state | `--checkpoint '{...}'` · `--wip-done` |
| Token costs (live) | `--token-check` · `--cost-plan f1 f2` |
| Health / status / history | `--health` · `--status` · `--query` |
| Guard staged files | `--guard` (also runs in pre-commit) |
| Quality gates (before "done") | `npm run ship` · `ship:all` · `ship:smoke` |
| Project dashboard / self-heal | `node sentinel.cjs` · `node sentinel.cjs --heal` |
| Eval learning system | `npx mycelium eval` · `npx mycelium status` · `npx mycelium fix --force` |
| Deploy | `node bin/mycelium.cjs ship "msg"` |
Full CLI surface: `node mycelium.cjs --help` · `node bin/ai.cjs`

## Style & architecture rules
- **Follow existing patterns; do not invent new ones without discussion.**
  Preserve architecture unless explicitly asked to refactor (see VALUE GATE).
- Vanilla static pages, no build step for public/: `.cjs` tools with zero npm
  deps where possible; pinned CDN versions (see `references/LANDING-3D.md` §3).
- New failure class found in review → add it to the relevant corpus/playbook,
  not to this file. The bar gets smarter; CLAUDE.md stays short.

## Do / Do NOT
- DO deploy only via `node bin/mycelium.cjs ship "msg"` (atomic auth refresh).
- DO commit workflow YAML to `ci/` only; bot tokens CANNOT push
  `.github/workflows/` (rejected by GitHub) — human installs via `ship:install-ci`.
- Do NOT run recursive ops on `/mnt/aidrive` (remote, very slow) — tar first.
- Do NOT read `.mycelium/memory.json` / `watch.json` (T4 files) — CLI only.
- Do NOT `git push -f` to main. Force-push only `genspark_ai_developer` after rebase.

## Learning Systems (the short version)
This file has NO manual "lab notes" section by design: session learnings go
through the Learner (`--decide/--constraint/--broke/--learned`), which feeds
premortem/guard/task-brief automatically. A hand-edited log here would rot.
- **Watcher** (passive): post-commit auto-learns breakages/couplings; pre-commit warns on risky staged files. Zero commands.
- **Learner** (active): stores what YOU record (`--decide/--constraint/--broke/--learned`); powers premortem/guard/task-brief.
- Every 10 commits the system self-evaluates and self-corrects. Deep dive: `docs/LEARNING-LOOP.md`, `AI_PLAYBOOK.md` §5.

## Areas
battle, forge, i18n, nav, economy, collection, wallet, cards, tabletop, emoji, dom, ios,
modules, font, memory, workflow, oracle, sentinel, lore, discoverability, absurd, exchange

## Project Architecture
Moved to **`docs/ARCHITECTURE.md`** (system overview + working reference: stack, key files,
i18n internals, routing, dev commands). Read it ONLY when your task touches those areas —
`task-brief` will point you at the relevant parts.
