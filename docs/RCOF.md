# RCOF - Recursive Cognitive Orchestration, grounded for a frozen model

This repo was evaluated against the **Hybrid Recursive Cognitive Orchestration
Framework (RCOF)** proposal - a six-layer design (Base/RAO, Curriculum/LADDER,
Introspection/RISE, Efficiency/GRAM, Meta/Gödel, Knowledge-Federation/ACE) plus
a Safeguards layer. This document records, honestly, **what RCOF can and cannot
do here**, and the three concrete upgrades we built from it.

## The hard constraint that decides everything

The agent operating this repo is a **frozen model**: no trainable weights, no
cross-session memory. **The repo is the only durable substrate.** That single
fact splits every RCOF layer cleanly into two piles:

- **Training-shaped layers are no-ops here.** Anything phrased as "train the
  policy", "GRPO fine-tune on the curriculum", "capability-train the
  introspector", or "learn a latent-space reasoning module" cannot run against a
  frozen model. Building a thing *named* after those and reporting a score would
  be exactly the **score-theater** this stack exists to reject.
- **File-based shadows of those layers are real.** The *durable artifact* each
  layer implies - a routing gate, a decomposition helper, a response protocol, a
  token budget, an audited self-modification log, a versioned playbook - lives on
  disk and survives across sessions. Those are buildable and worth building.

So the honest classification is:

| RCOF layer | Training reading (NO-OP here) | Durable shadow (REAL here) | Status |
|---|---|---|---|
| Base / RAO | end-to-end policy training | route-task delegation gate | **built** (`bin/route-task.cjs`) |
| Curriculum / LADDER | GRPO on a difficulty curriculum | task decomposition helper | buildable (`bin/task-brief.cjs` scaffold) |
| Introspection / RISE | capability-training the critic | RESPONSE-PROTOCOL checklist | **built** (`docs/RESPONSE-PROTOCOL.md`) |
| Efficiency / GRAM | latent-space reasoning module | token-budget accounting | **built** (token-budget tooling) |
| Meta / Gödel | self-rewriting weights | audited self-modifying rule set | **hardened this round** (`bin/optimize-loop.cjs`) |
| Knowledge-Fed. / ACE | federated weight merging | versioned loadable playbook | **built this round** (`bin/playbook.cjs`) |
| Safeguards | - (pure engineering) | bounded recursion + escape valve | **built this round** (`tools/lib/recursion-guard.cjs`) |

**We explicitly did NOT build:** RAO policy training, LADDER GRPO, RISE
capability-training, GRAM latent-space reasoning. Claiming those would be
fabricated confidence with no mechanism behind it.

## The three moves we built

All three inherit the stack's **honesty contract**: every metric is real
evidence or `null`/`insufficient` - never an invented number.

### Move 1 - Recursion safeguards (`tools/lib/recursion-guard.cjs`)

The only *pure-engineering* part of RCOF, and the most important: our recursive
tools (learn-loop, optimize-loop, the every-N-commits re-mine) had **no explicit
ceiling**. A self-correction that never converges, or a re-mine that triggers a
re-mine, would burn tokens/credits silently.

`RecursionGuard` is a tiny synchronous brake you drop into any loop:

- **Depth ceiling** - `enter()` throws a typed `GuardTripped` past `maxDepth`. A
  bound that cannot be silently passed.
- **Escape valve (noise-to-meaning)** - `shouldEscape(progress)` returns `true`
  after `maxStaleSteps` consecutive steps with no change. Spinning without new
  information is a stop condition.
- **Audit trail** - every trip/escape is appended to
  `.mycelium/recursion-audit.jsonl` (best-effort; a failed write never crashes
  the guarded loop). A stuck loop is **loud, not hidden**.

First consumer: `optimize apply` wraps its rule-promotion loop in the guard
(`maxDepth: 8`) - a single pass that wants to rewrite the whole rule set is a red
flag, and the guard caps it cleanly.

### Move 2 - Self-modification audit + rollback (`bin/optimize-loop.cjs`)

The optimizer is the one tool that **rewrites the repo's own standing rules** -
the closest thing here to Gödel-style self-improvement. A self-modifying system
must be **explainable and reversible**. So:

- `optimize apply` now backs up `factory-memory.json` first, promotes rules, and
  records the change to `.mycelium/self-mod-log.jsonl` (append-only).
- `optimize audit` shows the full self-modification history (read-only).
- `optimize rollback` restores the most recent un-reverted apply - and backs up
  the *current* state first, so a rollback is itself reversible. The selection
  logic skips any apply that has already been rolled back.

The ledger is append-only by contract: a rollback is a *new* record, never a
rewrite of history.

### Move 3 - Versioned loadable playbook (`bin/playbook.cjs`)

RCOF's ACE layer proposes a federated, versioned knowledge base agents can load
and contribute to. The honest, frozen-model shadow is: distil what this repo has
**actually proven** into a single self-describing JSON a fresh clone (or sibling
repo) can load.

`distill` gathers standing rules, recorded lessons (mapped to named fields -
description / rootCause / fix / preventionRule - never a raw JSON blob), and
per-task technique evidence (copied verbatim from `technique-log`, **including
its `null` verdicts**). It then:

- hashes the *knowledge* block (`contentHash`) so two exports of identical
  knowledge are byte-stable, and any hand-edit is detectable;
- derives a version from content (`<memVersion>+<shortHash>`), not wall-clock;
- writes `docs/PLAYBOOK.<version>.json` - a committed, reviewable, portable
  artifact (unlike the gitignored runtime `.jsonl` ledgers).

`distill verify <file>` recomputes the checksum and refuses a tampered artifact.
If the repo has proven nothing yet, the playbook says so (`empty: true`) - that
is honest, not a bug.

## Commands

```bash
ai optimize audit         # show self-modification history
ai optimize rollback      # undo the most recent apply (reversible)
ai distill                # print the distilled playbook to stdout
ai distill --write        # write docs/PLAYBOOK.<version>.json
ai distill show           # summarise the most recent written playbook
ai distill verify <file>  # check schema + content checksum
```

## What stays true

None of this gives the frozen model new weights. What it gives is a **durable,
auditable, portable substrate** that gets sharper across sessions - bounded so it
cannot run away, reversible so it cannot corrupt itself, and honest so it never
reports confidence it has not earned.
