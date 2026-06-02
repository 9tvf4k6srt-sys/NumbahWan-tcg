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

---

## Start-of-task checklist (cheap, saves the most)

- `node bin/ai.cjs memory query` once for project intel instead of re-reading docs.
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
