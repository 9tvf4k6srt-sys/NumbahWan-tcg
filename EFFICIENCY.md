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
- Find the anchor (`grep -n`) before opening any file > ~400 lines.
- Plan the edits, then make them. Avoid read → edit → re-read → edit churn on the
  same file; `MultiEdit` batches changes to one file in one pass.
- Reuse what exists. Before writing a helper, `grep` for it. The shared lib
  `tools/lib/aitell-common.cjs` already holds colors / strip / cjk / json / git.

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
