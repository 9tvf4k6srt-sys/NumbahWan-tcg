# ARCHITECTURE.md — the map of what is LIVE, what is LEGACY, and why

Read this when you're disoriented. `AGENTS.md` tells you how to behave;
**this file tells you what everything is.** It exists to answer one question
fast: *"is the thing I'm looking at load-bearing, or a fossil?"*

The rule of this map: it lists only what you **cannot discover by running
`ls` or `git log`** — status, wiring, and why. If a fact here ever conflicts
with the code, the code is right and this file is wrong (open a PR).

---

## The three layers (learn these, the repo makes sense)

| Layer | Meaning | Where |
|---|---|---|
| **LIVE** | Wired into hooks/build/CI. Changes affect every session. | root scripts, `bin/`, `tools/`, `.husky/` |
| **LEGACY** | Preserved for history. **Nothing references it.** Safe to read, never to run. | `legacy/` |
| **GENERATED** | Machine-written state. Never hand-edit. | `.mycelium/`, `.mycelium-mined/`, `dist/`, `public/static/data/` |

If you're an agent: **work only in LIVE.** Reading LEGACY costs tokens and
teaches you rules that no longer apply.

---

## Root layout — what each thing is

### The game (the product this repo ships)

| Path | What | Status |
|---|---|---|
| `public/` | Static pages (HTML/CSS/JS), assets, `/harness` dashboard | LIVE |
| `src/` | Hono server (TS) | LIVE |
| `nwge-engine/` | Game engine (TypeScript) | LIVE |
| `nwge-web/` | Game web client | LIVE |
| `wrangler.jsonc`, `vite.config.ts` | Deploy/build config | LIVE |
| `seed.sql`, `migrations/` | D1 database | LIVE |

### The harness (the agent-infrastructure layer — the other star)

| Path | What | Status |
|---|---|---|
| `AGENTS.md` | Front door for any AI agent — read first | LIVE |
| `CLAUDE.md` | Claude-specific session protocol | LIVE |
| `AI_PLAYBOOK.md` | Canonical build playbook (owner of most how-to facts) | LIVE |
| `AGENT-CONTEXT.md` | Onboarding, design systems, architecture detail | LIVE |
| `TASTE.md`, `FORGE-DOCTRINE.md`, `BUILD-DOCTRINE.md`, `COLLAB-PROTOCOL.md`, `EFFICIENCY.md`, `PCP-SPEC.md` | Domain doctrines (one owner per fact) | LIVE |
| `PROJECT.md`, `PROJECT_STATE.md` | Project knowledge / current-state file | LIVE |
| `bin/ai.cjs` | The one agent CLI — everything routes through it | LIVE |
| `bin/` (rest) | MCP server, ship gate, brief, scorers, factory | LIVE |
| `tools/` | Observers, linters, telemetry, evals helpers (54 scripts) | LIVE |
| `evals/` | Golden eval suite — computes the harness's own receipts | LIVE |
| `mycelium.cjs` (root) | Learning system core — wired into hooks + ship | LIVE (see note) |
| `sentinel.cjs` (root) | Guardian/health — wired into prebuild + build | LIVE (see note) |
| `mycelium-watch.cjs`, `mycelium-fix.cjs`, `mycelium-eval.cjs` | mycelium satellites called by hooks | LIVE |
| `.husky/` + `tools/observer-runner.cjs` | The single wiring point: hooks → observer profiles | LIVE |
| `.github/workflows/`, `ci/` | CI gates | LIVE |

> **Note on `mycelium.cjs` / `sentinel.cjs`:** the README's "graduated"
> statement refers to the *experiment* — the learnings were rebuilt as the
> standalone [mycelium library](https://github.com/9tvf4k6srt-sys/mycelium).
> These root files **still run here** as the dogfood instance (hooks call
> them daily). They are not fossils. Don't delete them; don't confuse them
> with the library.

### Working dirs you'll see but shouldn't hand-edit

| Path | What | Status |
|---|---|---|
| `.mycelium/` | Append-only learning state (memory, telemetry, trends, verdicts) | GENERATED |
| `.mycelium-mined/` | Mined pattern/rule DB + reports | GENERATED |
| `.mycelium-context` | Auto-compacted summary of memory.json | GENERATED |
| `.metadata-stripped.json` | Image-tooling manifest | GENERATED |
| `dist/` | Build output | GENERATED |
| `public/static/data/` | Build-time JSON feeds (sentinel, harness report) | GENERATED |
| `backstop_data/` | Visual-regression baselines | GENERATED |

### The archive (nothing live points here)

| Path | What | Status |
|---|---|---|
| `legacy/audits/` | 8 frozen audit reports (2026-02→07) + 2 historical plans | LEGACY |
| `legacy/scripts/` | 8 orphaned scripts: zero live references (see legacy/README.md) | LEGACY |
| `docs/` | Guides, handoffs, data models, production pipeline, credibility | LIVE reference |
| `references/` | Craft playbooks (motion, visual lock, landing) | LIVE reference |
| `specs/` | Specs under development | LIVE |

> **Naming split:** `ARCHITECTURE.md` (this file, root) = the LIVE/GENERATED/LEGACY
> **status map**. `docs/SYSTEM-ARCHITECTURE.md` = the deep *system* reference
> (stack, routing, data flow). They are not the same doc — don't merge them.

---

## Retired workflows (history, never run)

| What | Where it fossilized | What replaced it |
|---|---|---|
| PM2 sandbox dev server | `legacy/scripts/ecosystem.config.cjs` (+ 7 scripts in `legacy/scripts/`) | `npm run dev` (Vite, port 5173) |
| 8 audit reports (2026-02→07) | `legacy/audits/` | The living harness (`.mycelium/` + `evals/`) |
| Screenshot helper | `legacy/scripts/dev-screenshot.cjs` | Backstop (`npm run backstop`) |

If a doc ever tells you to `pm2 start`, `pm2 restart`, or run a script that now
lives under `legacy/`, that instruction is stale — the live equivalent is
`npm run dev` / `npm run build` / `npm run deploy`.

---

## The wiring, in one diagram

```
git commit/merge
   └─ .husky/pre-commit, post-commit, post-merge
        └─ tools/observer-runner.cjs  ← THE single registry (add observers here only)
             ├─ mycelium.cjs / mycelium-watch.cjs / mycelium-fix.cjs  (learn + snapshot)
             ├─ sentinel.cjs                                          (guard + health)
             ├─ tools/commit-telemetry, efficiency-ledger, trend-detector  (sensors)
             ├─ tools/merge-diff.cjs          (per-merge verdict, post-merge)
             └─ tools/improve-proposer.cjs    (human-gated doctrine proposals)

npm run build
   └─ sentinel → public/static/data/sentinel-report.json
   └─ evals/context-cost.cjs --write          (regenerate the token receipt)
   └─ tools/harness-report.cjs --quiet        (regenerate the dashboard feed)
   └─ vite build

Agent session
   └─ AGENTS.md (router) → one canonical doc per task → bin/ai.cjs (CLI)
```

---

## Invariants (break these and you've broken the repo's contract)

1. **Filenames of the doctrine docs are load-bearing** — `bin/ai.cjs` and
   `bin/agent-brief.cjs` check their existence. Rename = update those too.
2. **Observers are added in exactly one place**: `tools/observer-runner.cjs`
   REGISTRY. Never wire a new hook directly.
3. **Nothing in `legacy/` may gain a live reference.** If you need code from
   there, extract it into a LIVE path with a header saying where it came from.
4. **GENERATED dirs are never hand-edited.** Write through the owning tool.
5. **`legacy/` is append-only.** Fossils go in; they don't come back out.

*This map is verified by `node evals/verify-tasks.cjs` — if the repo drifts
from it, the golden eval fails loudly.*
