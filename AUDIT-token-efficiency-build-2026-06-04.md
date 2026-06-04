# Ultra-audit: token efficiency while building (2026-06-04)

Scope: a self-directed efficiency pass. The brief was: think hard about the
*right questions* to ask for token efficiency in a repo set up like ours, turn
those into a research plan, run the plan on our own history, and then spend the
conclusions on an upgrade that actually moves the needle. This is a follow-on to
`AUDIT-token-efficiency-2026-06-03.md` (which created the render-risk linter,
PR #87). That audit found the blind spot; this one closes the gap it could not
yet cover and makes the fix reflexive.

---

## Phase 1: the questions worth asking

Token cost in an agentic build is not one number. It is:

```
cost = (tokens per turn) x (number of turns)
```

Most "be more efficient" advice attacks the first factor (read fewer files,
shorter context). In a repo like ours that is the wrong target. So the questions
were grouped to find which factor actually dominates here:

1. **Reading cost.** Do our fixes touch many files (expensive context) or few?
2. **The re-fix loop.** How many of our commits are fixes, and do fixes cluster
   into chains (break, fix, re-break, re-fix) on the same surface?
3. **Churn.** What kind of work re-breaks: logic, data, or layout we cannot see?
4. **Tooling.** Do we already have a gate for the dominant failure, and if so,
   why is it still leaking?
5. **Verification.** When a fix ships "green", is it actually verifiable before
   the user sees it, or do we ship blind and wait for a phone screenshot?

The hypothesis going in: the dominant sink is turns, not tokens-per-turn, and
specifically the **visual re-see loop** (we cannot see the rendered page in the
sandbox, so a layout bug ships green, the user catches it on a real phone, and
we re-fix). Each lap of that loop costs a full PR plus an agent turn plus a user
turn, the most expensive unit we have.

---

## Phase 2: the research plan

Cheap, empirical, on our own data. No theory:

1. Count fix vs feature commits across the full history.
2. Pull the mined `fix-chains.csv` (break to fix pairs the auto-miner already
   extracts) and bucket by category.
3. Measure files-per-fix for the dominant category to test the reading-cost
   hypothesis.
4. Walk the render-risk linter timeline against the fix chains to see whether
   the existing gate caught the bugs or leaked them.

---

## Phase 3: what the data says

From the live mined database (`.mycelium-mined/db/fix-chains.csv`,
`categories.csv`) and git history:

- **217 of 700 commits mention fix/bug/repair/broke.** Fixing is a large share
  of all work.
- **Of 97 categorized fix-chains, the top two categories are visual:**

  | category      | fixes | share | top pattern                    |
  |---------------|-------|-------|--------------------------------|
  | css-layout    | 49    | 36.3% | wrong-css-value                |
  | mobile-compat | 6     | 4.4%  | missing-responsive-breakpoint  |

  Combined, **css-layout + mobile-compat = 55 fixes = ~41% of all categorized
  fixes.** That is the visual re-see loop, and it is the single largest bucket by
  a wide margin (next is "other" at 12.6%, then null-reference at 11.1%).

- **css-layout fixes touch ~1.2 files each.** Reading is not the cost. The cost
  is the *number of laps*, because we cannot see the result before shipping.

- **Timeline of the existing gate.** `render-risk-lint.cjs` was created in
  PR #87. The three headline-spacing laps (#84, #85, #86) and the five-round
  emblem cluster (#79 to #83) all happened *before* it existed, which is exactly
  what motivated building it. But **PR #93** ("zoom out the forest backgrounds on
  iOS") happened *after* #87 and still slipped through. Two reasons:
  - **Coverage gap:** #93 was an iOS background/viewport bug
    (`background-attachment: fixed`, `100vh`), a class RR1 to RR4 did not check.
  - **Forgettable:** the gate is advisory and a cold session does not always
    remember to run it before a visual ship.

**Conclusion.** The dominant sink is confirmed: the visual re-see loop is ~41% of
our fixes, it is a turns problem not a tokens-per-turn problem, and the gate we
already built leaks for two specific reasons. So the upgrade is two narrow moves,
one for each leak, not a rewrite.

---

## Phase 4: the upgrade (two moves)

### Move A: RR5, close the iOS coverage gap

Added rule RR5 to `tools/render-risk-lint.cjs`, targeting exactly the #93 bug
class, the visual bugs that render wrong only on the device we cannot see:

- **RR5a:** `background-attachment: fixed` paired with a background image. iOS
  Safari ignores this and renders the background zoomed/misaligned. Only flagged
  when an image is present (a fixed color attachment is harmless, so no noise).
- **RR5b:** `height: 100vh` on a visual/hero container. iOS counts the dynamic
  toolbar inside `vh`, so it overshoots and shifts/zooms the background. Guarded:
  skipped if the rule already uses `100dvh`, `svh`, `min-height`, or `max-height`.

Verified: a synthetic fixture with both traps flags 3 risks; the real, clean
guild page (`public/guild/brightinside/index.html`) flags 0, so no false
positives.

### Move B: make the gate reflexive

Added one `efficiency` field to the session-start brief (`bin/agent-brief.cjs`,
the ~500-token JSON shown at the top of every session). It says, in one line:
before shipping any visual/CSS change, run `node bin/ai.cjs preship`, because the
iOS render bugs we cannot see are the #1 token waste. Cost is roughly 15 tokens
per session; the payoff is removing one full re-see lap (a PR plus two turns).

This pairs a coverage fix (RR5) with a memory fix (the nudge), so the gate both
catches more and is harder to forget.

---

## Why this is itself token-efficient

The whole pass spent its budget on the proven sink, not on speculation. The
research was a handful of `git log` and CSV reads. The upgrade is two small
edits, both verified, both aimed at the 41% bucket. The expected return is
removing future re-see laps, each of which is far more expensive than this audit.

The next agent inherits: run `ai preship` before any visual ship (the brief now
says so), and RR5 will catch the iOS traps that used to bounce back as phone
screenshots.
