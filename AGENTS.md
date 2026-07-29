# AGENTS.md — read this first, then read only what your task needs

Any AI agent, any platform: this is the front door. It tells you the 5 things
that are always true, then routes you to the **one or two docs your task
actually needs** — because reading all the doctrine costs ~30K tokens and most
tasks need ~3K. Token efficiency starts with *not reading*.

> Claude Code users: `CLAUDE.md` holds the session protocol (STOP checklist,
> anti-stall, token budget). It complements this file; it does not replace it.

## Always true (memorize these, they fit in your head)

1. **Mobile-first.** Target device is iPhone Safari, 375×812. Every page.
2. **Two brands, never cross-contaminate.** NumbahWan TCG and NumbahWan Group
   (KINTSUGI). Different design systems, different language sets. Never mix.
3. **Query the repo, don't read a doc that restates it.** If a fact is in
   `git log`, `ls`, a lint run, or `node bin/ai.cjs`, ask the repo. Docs hold
   *why*; the repo holds *what*.
4. **Verify before "done."** One command: `npm run test` (or the gate your task
   touches). No untested claims.
5. **Advisory systems never block.** The learning machinery
   (`.mycelium/`, observers, gates) informs; `git` always proceeds.

## First commands (every session, ~30 seconds)

```bash
echo $(date +%s) > .mycelium-session   # mark session (required for commits)
node bin/ai.cjs hooks                  # activate git hooks (idempotent)
node bin/ai.cjs brief                  # current state, ~500 tokens
node bin/ai.cjs premortem <area>       # what broke last time here
```

## Read by task — pull on demand, never push on arrival

| You are about to… | Read (in order) | Skip |
|---|---|---|
| **Anything** | `AI_PLAYBOOK.md` §0–§3 (the 30-second brief + rules) | everything else until needed |
| **Touch copy or visuals a human will see** | + `TASTE.md`, then the *one* medium playbook it links | other playbooks |
| **Edit an existing page** | + `node bin/ai.cjs whyfile <path>` | full doc reads |
| **Onboard / architecture / brand systems** | `AGENT-CONTEXT.md` | playbooks |
| **Build / ship / deploy** | `AI_PLAYBOOK.md` §7–§8, then `node bin/mycelium.cjs ship "msg"` | doctrine |
| **Generate content (words/visual/audio)** | `FORGE-DOCTRINE.md` | — |
| **Worry about token cost** | `EFFICIENCY.md` (once) | — |
| **High-stakes, ambiguous, or irreversible work** | `COLLAB-PROTOCOL.md` + run `node bin/ai.cjs collab` | for a typo |
| **Build or wire agent tooling** | `PCP-SPEC.md`, `BUILD-DOCTRINE.md` | — |
| **Resume a known project** | that project's state file (e.g. `PROJECT_STATE.md`) | re-deriving |

## The map (so you don't have to guess)

| | |
|---|---|
| **Disoriented?** | `ARCHITECTURE.md` — every file/dir classified LIVE / GENERATED / LEGACY, with the wiring diagram. Read it when you don't know what something is. |
| **Game engine** | `nwge-engine/` (TypeScript) |
| **Game web** | `nwge-web/` |
| **Static pages** | `public/` |
| **Agent CLI** | `bin/ai.cjs` — everything routes through here |
| **Learning state** | `.mycelium/` (append-only JSON; never hand-edit) |
| **Observers/hooks** | `tools/observer-runner.cjs` (one registry, all profiles — add observers here only) |
| **Ship** | `node bin/mycelium.cjs ship "msg"` — atomic test→sync→push→PR→merge |
| **Never touch** | `legacy/` (fossils — nothing references them, reading them teaches outdated rules) |
| **Never hand-edit** | `.mycelium/`, `.mycelium-mined/`, `dist/`, `public/static/data/` (generated) |

## How this repo improves itself (and how to feed it)

Sensors run on every commit/merge via husky hooks → observers write to
`.mycelium/` → `tools/trend-detector.cjs` spots trajectories →
`tools/merge-diff.cjs` (run: `npm run merge-diff`) gives a per-merge
**IMPROVED / STEADY / REGRESSED** verdict vs the previous merge. When a trend
repeats, propose one doctrine edit in your PR — human approves, the repo gets
smarter. One improvement per merge, max.

**Failure intake:** when a `fix:` commit repairs a REAL breakage, record the
lesson as an outcome-eval task in the same commit so reality keeps authoring
the eval: `node tools/add-failure-task.cjs --id fr-<slug> --q "..." --require
"..." --source "what broke"`. Reality-written tasks can't be taught-to. A
commit-msg hook reminds you (advisory — judgment stays human).

## Hard rules (violate = rollback)

- Never commit secrets. Never `git push --force` to `main`.
- Never hand-edit files under `.mycelium/` — write through the tools.
- If you didn't run the verification command, don't say it's done.

---
*Canonical detail lives in the linked docs. This file is the index, not the
encyclopedia — if a section here disagrees with a doc, the doc wins for its
own domain and you should flag the drift in your PR.*
