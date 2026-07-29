# POSITIONING — where this harness sits in the agent-memory field

*Written 2026-07-29, after a deliberate landscape scan. Updated when the field
moves. This doc exists so the project is honest about what it is — and isn't.*

## The convergence (acknowledged, not hidden)

The core thesis — *models are stateless, repos are stateful, so the repo should
remember* — is **not novel**. In 2026 it is convergent evolution across the
field:

| Who | What they shipped | Overlap with us |
|---|---|---|
| **Letta** (ex-MemGPT) | **Context Repositories** — git-backed, versioned agent memory; `/memfs` | Very close: git as the memory substrate |
| **Mem0** | Memory backbone for coding agents; "remember your codebase" | Persistent repo memory, SaaS |
| **Zep / Graphiti** | Bi-temporal context graphs, enterprise memory | Temporal, scored retrieval |
| **Cognee** | Persistent codebase memory guide | Same problem statement |
| **cass-memory, ai-memory** | Indie cross-agent session memory | Same idea, smaller |
| **arXiv "Online Repository Memory"** (Mar 2026) | Learn repo "organicity" from history | Academic version of the same bet |

Read correctly: this is **validation, not a threat.** Multiple funded and
academic teams landed on the same idea. We're standing in a real wave, not a
fake one.

## What is NOT convergent — the actual differentiators

Nobody we found combines all three of these. Each is a deliberate position:

1. **Enforcement, not just recall.** Most memory systems *retrieve* context.
   Ours also *acts*: mined breakage patterns become pre-commit guards
   (`MCL-*`), doctrine claims become failing checks (`evals/verify-tasks`),
   trends become merge verdicts. Memory coupled to **consequence** is the
   underexplored corner. (Proof it works: the guard flagged real anti-patterns
   in a frontier model's own code during the 2026-07-29 clarity pass.)

2. **Receipts, not claims.** Every capability is paired with a computable,
   regenerable receipt: `evals/results/context-cost.json` (−89% context),
   `evals/results/outcome-eval.json` (does memory actually help — see below),
   merge-diff verdicts. Smarter models make confident claims too; we measure.

3. **Zero-dependency bedrock.** The memory *is the repo* — append-only JSON,
   git-diffable, no vector DB, no service, no API key. Mem0/Zep/Letta can't
   occupy this niche because their business is a service. Ours runs with
   nothing running.

## What we adopt from Letta (steal the best, say so)

Read the field, take what's better than ours. Adopted from Context Repositories:

- [ ] **Progressive disclosure** — a memory filetree whose *names* are
      navigational signals, with per-file frontmatter descriptions (their
      `SKILL.md`-style frontmatter). Our `.mycelium/` is currently opaque blobs.
- [ ] **A `system/` pin** — an explicit set of memory files *always* loaded,
      vs. the long tail loaded on demand. We have no pinning concept today.
- [ ] **Memory as named operations** — they ship `init` / `reflect` /
      `defragment` as first-class skills. We have ad-hoc observers; naming the
      lifecycle makes it teachable and scriptable.
- [ ] **Git worktrees for concurrent memory writes** (future) — lets memory
      subagents write in parallel and merge. Only matters once we have
      concurrent writers; noted so we don't paint ourselves into a
      single-writer corner.

Adoption status is tracked here; each gets its own PR when implemented.

## The honesty section (so we don't fool ourselves)

- Our retrieval is **naive** (no semantic scoring, no decay, no bi-temporal
  graph). Mem0/Zep beat us on retrieval quality today.
- Single-JSON memory has **real scale limits**: merge conflicts, single-writer
  assumption, unvalidated learning quality.
- We have **never benchmarked** whether the memory *helps*. That is exactly
  what `evals/outcome-eval.cjs` (added alongside this doc) is for — proof in
  our environment, with a receipt, instead of a claim.

## Verdict

Keep building the bedrock — as the repo's memory (Game A) and as craft proof
(Game B). Do not chase the funded SaaS memory market head-on (Game C) unless
we harden retrieval and prove the niche. The instrument that tells us, layer
by layer, when any of this stops paying for itself is the outcome eval — the
repo measuring its own usefulness.
