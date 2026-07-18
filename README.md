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

The game is still developed here. The self-healing machinery
(`mycelium.cjs`, `sentinel.cjs`, doctrine docs) is preserved in git history
for the record, but is superseded by the standalone library and is no longer
the headline of this repo.

## Stack

TypeScript · Vite · Vitest · Biome · Cloudflare Workers · Backstop (visual
regression) · Lighthouse budgets
