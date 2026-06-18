# Session Scorecard

> The repo's whole thesis is *"build with this and you get better results for
> fewer tokens, and it compounds."* A thesis you can't measure is marketing.
> The Session Scorecard is the measurement.

```bash
npm run scorecard            # human report
npm run scorecard:json       # machine-readable
node bin/ai.cjs scorecard --window=20
```

It reads **only data the factory already writes during normal use** — no new
instrumentation, no manual logging — and turns it into four numbers plus one
honest composite.

---

## The four signals

| # | Signal | Question it answers | Source |
|---|--------|---------------------|--------|
| 1 | **Efficiency** | Is my work getting leaner (fewer reads/files/churn per slice)? | `.mycelium/efficiency.json` (the slice ledger) |
| 2 | **Waste** | How many recent slices show avoidable spend — re-reads, sprawl, churn thrash? | same ledger, scored against the doctrine in `EFFICIENCY.md` |
| 3 | **Catch-rate** | What share of defects were caught **before** ship vs. escaping to the user? | `.mycelium/events.jsonl` + `factory-memory.json` |
| 4 | **Learning** | Does the memory engine actually pay off over time? | `.mycelium/eval-history.json` |

### The composite — "magnification index" (0–100)
One north-star number, weighted toward the two things the thesis actually
promises: **efficiency (35%) + low waste (20%) + catch-rate (30%) + learning
(15%)**. If there is no real data, it returns `null` — never a flattering
fake 100. That honesty rule is pinned by a test.

---

## Why this is the keystone

Every other "skill-magnifying" feature becomes *provable* once the scorecard
exists:

- A token-budget enforcer is only credible if you can show waste-rate dropping.
- "Lessons become gates" is only credible if catch-rate climbs.
- "It compounds" is only credible if the efficiency trend moves across sessions.

The scorecard is the chart a senior engineer trusts instead of a README badge.

---

## Getting a real trend on a fresh checkout

The slice ledger only logs going forward (post-commit hook), so a new clone
shows a single data point. Backfill genuine slices from real git history:

```bash
npm run scorecard:backfill          # walks the last 40 real commits
node scripts/backfill-efficiency-ledger.cjs --n=80 --dry-run
```

The backfill measures each commit's **actual churn** and scores it with the
**same** leanness heuristic the live ledger uses. It invents nothing and
de-duplicates by commit hash, so it is safe to re-run.

> Note: a churn-only backfill can't know how many files an agent *read* to make
> each commit, so historical slices score generously. The efficiency trend
> sharpens as real instrumented sessions (which record reads/calls) accumulate.

---

## Reading the output

```
  Session Scorecard — proof of compounding improvement

  85/100  █████████████████░░░  magnification index

  1 · Efficiency   100/100   trend → 0
  2 · Waste        3 of 20 slices flagged · re-reads:0 sprawl:2 churn:2
  3 · Catch-rate   70%   pre-ship:7  escaped:3
  4 · Learning     77/100 recent avg   since first: ↑ +4   repeat-rate:0
```

- **Efficiency trend** compares the newer half of the window to the older half.
  Positive = you're getting leaner.
- **Waste** names the three avoidable sinks the repo's doctrine warns about.
- **Catch-rate** is the money metric: bugs stopped before the user ever sees
  them. Re-fixing a shipped bug costs a full round-trip; catching it pre-ship is
  near-free.
- **Learning** tracks whether the memory engine's score is climbing — i.e.
  whether the lessons are actually paying off.

Re-run after a few work slices to watch the trend move. That movement *is* the
proof.
