# EFFICIENCY: build lean without losing quality

Read this once per session. It is short on purpose: reading it must cost less
than the waste it prevents. Tokens are the budget. Quality is not negotiable;
the goal is the same result for fewer tokens, every session, forever.

The rule of thumb: **read less to know more, write once, verify once.**

---

## The five levers (ranked by how much they save)

1. **Never read a big file whole.** `grep -n "<anchor>"` first, then `Read` with
   `offset`/`limit` around the hit. The heavy files here:
   `public/invest.html` (4000+ lines), `CLAUDE.md`, `AGENT-CONTEXT.md`,
   `mycelium.cjs` (huge), `sentinel.cjs`, the `tools/*-miner.cjs` files.
   One full read of invest.html can cost more than the whole edit.

2. **Batch independent lookups in one turn.** Multiple `grep`/`Read`/`ls` calls
   with no dependency between them go in a single message, not one per turn.
   Each turn has fixed overhead.

3. **Verify once.** If `node -c` passed clean this session, do not run it again
   "to be safe". Re-running the same check is pure spend. Trust the green.

4. **Target your search.** `grep -n` with a precise pattern and a path beats a
   wide `grep -r` over the repo. Use `include` / a directory. Read the 5 lines
   you need, not the 200 around them.

5. **Spend output tokens like money.** Commit bodies, PR descriptions, and
   explanations cost too. Be complete but tight. No restating the diff in prose.

6. **Kill the re-see loop (the biggest hidden cost for visual work).**
   Screenshots are impossible here (chromium can't launch). So a visual bug
   that ships is the most expensive thing that happens: the user notices it on
   their phone, sends a screenshot, you re-fix, you re-ship. The guild headline
   alone cost 3 full PR round-trips this way (#84→#85→#86); the emblem cost 5.
   Each round-trip is a whole PR + your context + the user's turn. Before
   shipping ANY visual change, run the static eye:
   ```bash
   node bin/ai.cjs render <file.html>     # advisory
   node bin/ai.cjs render --strict <file> # what preship enforces for HTML
   ```
   It catches the bug classes that actually recurred: words fusing
   (`ontheroster`), mid-word breaks (`ROS / TER`), fixed widths past 375px, and
   oversized headline clamps. `preship` runs it `--strict` on any HTML in scope.

---

## Start-of-task checklist (cheap, saves the most)

- `node bin/ai.cjs task "<what you're about to do>"` FIRST — the context
  firewall hands you the gates, past defects, and the few files that matter in
  ~200 tokens, so you don't read the whole repo and lose the thread
  (see `docs/LEARNING-LOOP.md`).
- `node bin/ai.cjs memory query` once for project intel instead of re-reading docs.
- `node bin/ai.cjs budget declare "<task>" --budget=8000` to open a token
  contract, then `budget check <files>` *before* each read — it blocks plans
  that would blow the budget and hands you the cheaper grep pattern
  (see `docs/TOKEN-BUDGET.md`).
- `node bin/ai.cjs scorecard` to see your efficiency/waste/catch-rate trend —
  the one number that proves whether you're actually getting leaner over time
  (see `docs/SESSION-SCORECARD.md`).
- `node bin/ai.cjs optimize status` periodically — it scores the standing rules
  by real defect recurrence and flags the **weak** ones (rules that exist but
  still let defects through); `optimize propose` hands you sharper replacements
  (see `docs/OPTIMIZE-LOOP.md`). This is how the rule set gets better, not just
  bigger.
- Find the anchor (`grep -n`) before opening any file > ~400 lines.
- Plan the edits, then make them. Avoid read → edit → re-read → edit churn on the
  same file; `MultiEdit` batches changes to one file in one pass.
- Reuse what exists. Before writing a helper, `grep` for it. The shared lib
  `tools/lib/aitell-common.cjs` already holds colors / strip / cjk / json / git.

---

## The handoff contract (cross-agent / cross-session)

Every hand-off — to another agent, to a new session, or across a compaction —
is a **distilled packet**, never a reasoning trace. The receiving agent does
not re-derive the work; it accepts the packet and runs the next action.

```bash
node bin/ai.cjs memory handoff '{"task":"...","done":["..."],"next":"...","confidence":"high","verify":"npm run eval"}'
```

The packet is size-capped (~350 tokens) and **requires `next`** — the single
next action *is* the packet. Five fields, nothing else:

- **task** — what this is (one line)
- **done** — accepted decisions only (≤5), the *what*, not the argument
- **next** — the one action to run. If you can't name it, you're not distilled yet
- **confidence** — high / medium / low. Low = tell the receiver to verify first
- **verify** — the one command that proves "done" claims (Honesty Gate)

Keep the *why* only if it's still load-bearing — otherwise it lives in
`memory decide`, not in the packet. The packet surfaces at the top of
`.mycelium-context` (`!!HANDOFF!!`). Replaying history into a fresh context is
the failure mode this exists to kill: a 10-turn argument becomes ~350 tokens of
decisions, and the receiver starts at *doing*, not at *re-reading*.

## Mid-session diagnostic (run at breakpoints, every ~8–12 turns)

Ask these six before the next call. Any "no" → intervene *now*, not at the end:

1. Is this still the same atomic task? (If it drifted → handoff → fresh context)
2. Am I carrying only the final accepted artifact forward?
3. Have I minimized file payloads to the lightest useful form (grep/section, not whole file)?
4. What fraction of recent turns was reused history vs new signal?
5. Would a cheaper model handle this sub-step?
6. Is my context the lightest useful representation of the state I actually need?

## Smallest capable model + escalate (the model-tier rule)

`route-task` now names a **tier** for every task: `cheap` / `mid` / `capable`.
Run the smallest tier whose failure cost exceeds its price. Escalation is a
*feature, not a failure*: a cheap attempt that produces a clean error is the
cheapest possible proof the task needed the bigger mind.

- **fast → cheap** — lookups, one-liners, boilerplate, syntax checks
- **standard → mid** — normal edits with a clear pattern
- **full-reasoning → capable** — architecture, ambiguity, irreversible calls
- **escalate on**: 2 failed attempts · empty/degenerate output · gate still red
  after one fix. Never escalate a fast task past `capable` — that IS the ceiling.

## Signal-first ordering

Put the highest-signal information first in every artifact the next agent reads
(handoff, checkpoint, brief, PR). Decisions before context, the `next` action
before the `done` list, the blocker before the narrative. An agent that reads
the first 200 tokens should already know what to do — the rest is evidence, not
prerequisites. This is why `!!HANDOFF!!` renders above `!!RESUME!!` in
`.mycelium-context`.

## Anti-patterns that quietly burn credits

- Reading a file you already read this session because you forgot a detail.
  (Note the line numbers the first time.)
- `ls -la` on `node_modules`, `.git`, or `/mnt/aidrive` (slow + huge output).
- Re-running a full `--all` sweep when you only touched one file.
- Long "let me explain my plan" prose when a 2-line plan + the action is enough.
- Generating images/audio/video without confirming. Those cost far more than text.
- Editing a monolith page to change three lines. The whole file gets read first.
  See below.

---

## Verifying visual work without a screenshot (stop rediscovering this)

You cannot screenshot in this sandbox — chromium is missing system libs and
there is no apt. Do not spend turns trying to make it work. The verification
ladder that actually exists, cheapest first:

1. `node bin/ai.cjs render --strict <file>` — static catch for the recurring
   visual bug classes (word-fuse, mid-word break, mobile overflow, big headline).
2. `node bin/ai.cjs preship <file>` — render-risk + layout + copy + asset gates
   in one call. If it's green, ship.
3. `PlaywrightConsoleCapture` (the tool) — this DOES work; use it to confirm
   zero JS console errors after a change. It is not a screenshot, but it proves
   the page loads and the JS runs.
4. For transparent art: `node bin/ai.cjs assets <file>` + PIL alpha/corner
   checks (see PROJECT_STATE.md image pipeline).
5. `understand_images` on the generated/processed asset itself (not the page).

The point: trust the gates, not your eyes. A green `preship` is the eye.

## The monolith tax (the repo's biggest structural cost)

The single most expensive thing to work on here is a giant HTML page with big
inline `<script>` and `<style>` blocks. `invest.html` is ~4,300 lines;
`index.html` carries ~1,200 lines of inline JS. To change three lines on one of
these, the whole file is read first, and that cost is paid on every edit.

Guardrail (advisory, never blocks):

```bash
node bin/ai.cjs pagesize --all        # which pages are over the soft caps
node bin/ai.cjs pagesize --baseline   # did a staged change balloon a page?
```

The pre-commit hook runs `--baseline --quiet`, so a page ballooning in one
change gets a nudge before it becomes the next monolith.

When you DO touch a flagged page for real work, extract its inline JS to
`public/static/<page>.js` while you are there. Pay the cost once, on a page that
already has your attention, and every future edit there is cheap. Do not do a
mass extraction up front, because that diff costs more than it saves.

Note on design tokens: a tempting "shared `:root` tokens" refactor is NOT safe
here. 79 token names (`--gold`, `--bg`, `--accent`, ...) carry *conflicting*
values across pages. `--gold` is `#ffd700` on some pages and `#d4af37` on
others. Forcing one shared file would silently recolour dozens of pages. Per-page
palettes are intentional; leave them.

---

## The ledger (how this improves over time)

After a slice, record what it cost in observable terms (tokens are not visible
to the agent, so we proxy with what drives them):

```bash
node bin/ai.cjs efficiency log "<task>"     # snapshots files/lines/reads for the slice
node bin/ai.cjs efficiency trend            # are we getting leaner over time?
```

When a slice runs expensive, record the lesson so the next AI inherits it:

```bash
node bin/ai.cjs memory constraint "efficiency" "<the cheaper move next time>"
```

The constraint survives across any model. That is what makes this timeless:
the harness does not depend on which AI is driving, only on the repo remembering.
