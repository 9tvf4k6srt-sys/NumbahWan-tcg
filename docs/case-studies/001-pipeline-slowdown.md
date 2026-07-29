# Case Study 001 — The pipeline that was quietly getting slower

**What the harness caught, with receipts.** Written 2026-07-29. All artifacts
referenced are in the repo and regenerable.

## The signal nobody asked for

On 2026-07-07, `tools/trend-detector.cjs` — an observer that runs after every
commit, unasked — emitted this into `.mycelium/trends.json`:

```json
{
  "id": "pipeline-duration-drift",
  "severity": "medium",
  "summary": "Observer pipeline slowing: 1824ms → 2738ms (+50% over 12 runs)"
}
```

No human noticed the slowdown. No test failed. The dashboard stayed green.
The detector noticed because it fits a slope to the observer-run duration
series and flags statistically significant drift — the exact failure mode
("silent degradation wearing a green dashboard") that the July audit had
called out in the *previous* generation of this system.

## What happened next — the full loop, on real data

1. **Detection** — `trend-detector.cjs` wrote the signal and pushed it to the
   event bus. Cost: ~70ms per observer run.

2. **Persistence check** — `tools/improve-proposer.cjs` (PR #124) tracked the
   signal across observer runs. It fired 3+ times — not a blip.

3. **Proposal, not action** — the proposer generated proposal
   `imp-…` targeting `EFFICIENCY.md`, with evidence (direction, magnitude,
   sample size) and a checklist for the human. **Nothing self-edited.** The
   repo cannot rewrite its own doctrine — per CLAUDE.md's anti-gaming rule,
   an agent that rewrites its own rules can game them. The human reviews
   with `npm run improve:list` and applies the edit.

4. **Measurement meanwhile** — `tools/merge-diff.cjs` (PR #123) recorded the
   merge-window KPIs (leanness, eval score, bundle size, trend count) so the
   next merge can be scored IMPROVED / STEADY / REGRESSED against this one.

## Why this is the whole point

Self-improvement systems usually fail in one of two ways: they never notice
anything, or they notice and "fix" things unaccountably until the rules are
noise. This loop is built to do neither:

- **Falsifiable**: every number above lives in a committed JSON artifact you
  can recompute (`npm run trends`, `npm run merge-diff`, `npm run eval`).
- **Human-gated**: the machine proposes; the human disposes. One proposal
  per merge, max — churn is worse than slow.
- **Public**: the current state of this exact loop renders at `/harness`
  from `public/static/data/harness-report.json`, regenerated at build time.

## Reproduce it yourself

```bash
npm run trends          # the signal, live
npm run improve:list    # pending human-gated proposals
npm run merge-diff      # latest merge verdict vs the previous one
npm run eval            # token-cost proof + doctrine-vs-reality checks
```

## The receipts

| Claim | Where it's proven |
|---|---|
| The slowdown was detected automatically | `.mycelium/trends.json`, signal `pipeline-duration-drift` |
| Detection is cheap and continuous | `tools/observer-runner.cjs` profile timings (~70ms) |
| The system proposes but never self-edits | `tools/improve-proposer.cjs` — no write path to doctrine files |
| Token savings are computed, not claimed | `evals/results/context-cost.json` (−89% across 5 tasks) |
| Doctrine matches reality right now | `node evals/verify-tasks.cjs` — 6/6 checks hold |
