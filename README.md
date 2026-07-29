# NumbahWan TCG

A trading card game web app — and, for six months, the live testbed of a
self-improving codebase experiment.

**The experiment graduated.** The self-healing machinery that grew inside this
repo was audited, found self-referential, and rebuilt from first principles as
a standalone library:

→ **[mycelium](https://github.com/9tvf4k6srt-sys/mycelium)** — an eval-harness-first
agent memory loop, where every self-improvement claim is measured against
external ground truth.

## What this repo is

- **The game.** A TypeScript/Vite web TCG (engine in `nwge-engine/`, web in
  `nwge-web/`, Cloudflare Workers deploy via `wrangler.jsonc`).
- **The testbed.** From 2026-01 to 2026-07 this repo carried "Mycelium": an
  evolving set of self-recursive loops — commit watching, breakage memory,
  auto-fix, health scoring, token budgeting — plus a public audit trail.

## What six months of audits found (the short version)

| Date | Audit | Headline finding |
|---|---|---|
| 2026-02-19 | Learning systems inventory | 7 recursive loops, but disconnected — no unified event bus |
| 2026-06-03 | Token efficiency | The "re-see loop" was the dominant token sink; fixed with a static eye |
| 2026-07-05 | Recursive learning stack | **"Silent non-execution wearing a green dashboard"** — heartbeats impersonated real runs, stale data scored 100, the engine was dormant while the dashboard read 88/B |

The July verdict was the turning point: a self-improvement loop that cannot
verify itself against external ground truth becomes decoration. That sentence
is the founding thesis of the redesign.

The full audits are archived, with context, in the new repo:
[`mycelium/docs/audits/`](https://github.com/9tvf4k6srt-sys/mycelium/tree/main/docs/audits)

## Status

The game is still developed here, and this repo still **dogfoods the harness
daily** — the root `mycelium.cjs` / `sentinel.cjs` / observers run on every
commit as the live test instance. What graduated to the standalone
**[mycelium](https://github.com/9tvf4k6srt-sys/mycelium)** library is the
*experiment's learnings*, rebuilt from first principles — not these files.

Confused about what's live vs. historical? That's the one question
**[ARCHITECTURE.md](./ARCHITECTURE.md)** exists to answer: every file and
directory classified LIVE / GENERATED / LEGACY, with the wiring diagram.
Historical audits and orphaned scripts now live in [`legacy/`](./legacy/)
— preserved, never run.

## The harness, with receipts

This repo still dogfoods the current-generation agent harness — and now
proves it works instead of claiming it:

- **`/harness`** — a live dashboard rendered from real `.mycelium/` state:
  per-merge IMPROVED / STEADY / REGRESSED verdicts, eval and leanness
  trends, pending human-gated improvement proposals.
- **`evals/`** — the golden eval suite. `node evals/context-cost.cjs`
  *computes* the harness's token savings from real doc files (−89% across
  5 standard tasks at last receipt); `node evals/verify-tasks.cjs` checks
  that the doctrine docs still match reality (13 mechanical checks);
  `node evals/outcome-eval.cjs` is the **output-side** proof — it asks a
  live model repo-memory questions with vs without the memory briefing and
  grades the answers mechanically (no LLM judge). It refuses to write a
  receipt if the API call fails, so it can never record a misleading result.
- **`docs/case-studies/`** — the loop working on real data, starting with
  [001: the pipeline that was quietly getting slower](./docs/case-studies/001-pipeline-slowdown.md).
- **`AGENTS.md`** — the router any AI agent reads first: read ~3K tokens
  for the task at hand, not ~30K of doctrine.

Reproduce any number on the dashboard: `npm run eval` ·
`npm run merge-diff` · `npm run improve:list` · `npm run trends`.

## Stack

TypeScript · Vite · Vitest · Biome · Cloudflare Workers · Backstop (visual
regression) · Lighthouse budgets
