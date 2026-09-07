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

## Factory workflow control plane

The factory is a **bounded local DAG executor**, not a distributed agent platform.
`bin/orchestrator.cjs` builds the trusted graph and tool registry;
`tools/lib/workflow-runtime.cjs` validates and executes it. Both are LIVE.
`tests/orchestration.test.cjs` is the offline regression suite, enforced by the
existing `bin/ship-gate.cjs` PR gate. `.mycelium/workflow-runs/` is GENERATED.

### Why this change exists

The earlier orchestrator interpolated intent/spec data into shell commands,
retried writes, ignored some child failures, and continued after a failed gate.
Those are control-plane bugs, not prompting problems. The replacement uses
argv-based subprocesses and structured outcomes. It does not use the older
`bin/deploy-gate.cjs` as an authority: its shell pipelines and historical-budget
fallbacks need a separate audit before that standalone command is trusted.

### Execution contract

```text
parse intent (optional, pattern/template parser)
  -> generate -> translate -> inject
                                |-> scorecard --json --|
                                |-> i18n --check ------|
                                |-> tests -------------|-> update context -> awaiting_review
                                |-> tsc --noEmit ------|
```

- Each step declares an ID, capability name, dependencies, and string arguments.
  Unknown tools, duplicate IDs, cycles and missing dependencies are rejected
  before any subprocess runs. The plan is snapshotted before async execution.
- States: `pending -> running -> succeeded | failed`; dependents of failed or
  blocked steps become `blocked`. Independent verification branches may finish
  collecting evidence. Every completed run emits one terminal event.
- The scheduler runs at most two read-only checks per wave in the factory.
  Writes run alone and never overlap readers. This is **per run**, not a
  cross-process worktree lock. Tools are trusted to honor their effect labels.
- Factory budgets: 12 total calls, five minutes total, two minutes per tool,
  1 MiB combined output per subprocess. The child timeout is clamped to the
  remaining run deadline. A subprocess over its output budget is killed.
- Runtime retries require a read-only tool and explicit transient exit codes,
  with at most three attempts. Timeouts, cancellation and ambiguous writes
  never retry. **Current factory tools each have one attempt**; no remote
  backoff policy is implied by the runtime's local retry mechanism.
- Success requires exit code zero, no signal or execution error, and any
  registered output contract returning exactly `true`. Scorecard output is
  parsed as JSON; existing 85-average / 70-per-page thresholds are unchanged.
  TypeScript is a required direct check, not a permissive legacy gate.
- Local generation requires `--execute`. There is no merge, publish or deploy
  tool in the registry. `awaiting_review` is a terminal result, **not an
  approval token**. A person must inspect the diff and use the separate ship
  process; this runtime provides no authenticated approval service.

### Trust boundaries and failure semantics

| Boundary | Defense | Limit |
|---|---|---|
| Intent / spec path -> process | `spawn(process.execPath, argv, {shell:false})`; realpath-constrained YAML paths | Reviewed repository tools and YAML contents remain trusted; path checks do not sandbox generator output |
| Tool output -> control | Exit/signal/error validation; parser artifact validation; JSON scorecard contract | A buggy checker can still give a wrong verdict; subprocess success alone does not prove content quality |
| Parallel execution -> local files | Writes isolated from reads within a run | Independent processes can still race; use one writer per disposable worktree |
| Cancellation / deadline -> children | Kill the POSIX process group and block dependents | Not an OS sandbox; detached escapees and Windows descendant termination need stronger isolation |
| Events -> execution | Sequence numbers, run ID, structured states; observer exceptions recorded separately | An advisory observer failing does not convert successful work into a task failure |
| Evidence -> stored receipt | No raw prompts, argv, stdout, stderr or exception messages; mode 0600 exclusive-create local files | No signing, crash durability, encryption, retention policy, or tamper-proof audit store |

A completed CLI execution writes a versioned JSON receipt. A process crash may
leave **no receipt** and partially written files. We intentionally do not
resume or replay mutating steps: a crash after a write but before acknowledgement
has an ambiguous outcome. Recovery is manual inspection of the worktree, not
an exactly-once claim. The plan hash identifies the serialized plan, not the
source revision, tool implementation or artifact contents. Treat it as a
correlation aid, not reproducibility or integrity proof.

The registry is an **in-process authority boundary**, not a security boundary
against malicious repository code. Children inherit the local account's
filesystem/network permissions and environment. Do not give untrusted code or
specs credentials. The older MCP server, agent loop, hooks and deploy CLIs are
not retroactively constrained by this runtime.

### What the tests establish

`node --test tests/orchestration.test.cjs` uses Node builtins and has no provider
or server dependency. It checks failure propagation across all 16 subsets of a
four-check fan-out, scheduler concurrency and write exclusion, malformed
results, exact retry limits, global budgets, observer isolation, spec symlink
escapes, and literal shell metacharacters. Separate tests launch real child
processes for timeout, cancellation, output bounds and nonzero exits.

These are deterministic regression assertions, not statistical evidence of
model intelligence. `evals/outcome-eval.cjs` is a separate model-answer eval.
No model-quality delta, token savings from this runtime, latency speedup,
production availability, or distributed scale is claimed by these tests.

### Extension criteria, not a feature wishlist

1. **Model-driven planning:** require a task set showing benefit over this
   deterministic baseline. Validate proposed plans against a trusted schema;
   never accept model-authored tools or permission changes.
2. **Durable execution:** only after a restart requirement exists. Introduce
   transactional state plus idempotency keys or compensating actions for each
   side effect; replaying an event log alone is not enough.
3. **Untrusted multi-tenant execution:** OS/container isolation, credential
   scoping and network policy are prerequisites, not optional hardening.
4. **Model upgrades:** freeze a held-out task set, run repeated paired trials,
   report pass rate with uncertainty and actual usage/cost, and compare with a
   single-agent baseline. Keep regression and capability evals separate.

The emphasis on outcome evidence follows
[Anthropic's January 2026 agent-evaluation guidance (engineering index)](https://www.anthropic.com/engineering);
the choice of a fixed workflow over unnecessary autonomy follows
[Building effective agents](https://www.anthropic.com/engineering/building-effective-agents).
These are design references, not endorsements of this implementation.

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
