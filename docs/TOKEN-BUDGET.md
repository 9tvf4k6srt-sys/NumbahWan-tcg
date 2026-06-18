# Token Budget — the active enforcer

> `EFFICIENCY.md` tells you *how* to build lean. The Session Scorecard tells you
> *whether* you did, after the fact. The token budget is the missing middle: a
> contract you feel **mid-task**, before you spend the tokens — not a doc you
> read once and forget.

The repo already had **passive** token tooling (`mycelium --token-check` shows
what you've spent). This is the **active** half: a per-task budget you declare
up front, check every read against, and close with a recorded waste signal.

```bash
node bin/ai.cjs budget declare "fix nav overflow" --budget=8000
node bin/ai.cjs budget check public/invest.html mycelium.cjs   # before reading
node bin/ai.cjs budget status
node bin/ai.cjs budget close                                   # logs a waste signal
```

npm shortcuts:

```bash
npm run token -- declare "task" --budget=8000
npm run token:status
npm run token:close
```

Add `--json` to any command for machine-readable output.

---

## The lifecycle

| Step | Command | What it does |
|------|---------|--------------|
| 1 · Declare | `budget declare "<task>" --budget=N` | Opens a contract (default 10,000 tok). Writes `.mycelium/token-budget.json`. |
| 2 · Check | `budget check <files...>` | Estimates the **read plan** vs. remaining budget. **Exits 1** if the plan blows the budget, so a hook can block it. Flags big files as GREP-ONLY and gives the cheaper pattern. |
| 3 · Spend | `budget spend <files...>` | Records actual reads against the budget (a hook/wrapper can call this after a Read). |
| 4 · Status | `budget status` | Spent vs. declared, with a verdict and a warning at 70% / 100%. |
| 5 · Close | `budget close` | Finalises the task and **appends a waste record** to `.mycelium/budget-waste.jsonl`. |

---

## It agrees with the doctrine by construction

The estimator reuses the exact constants from the platform doctrine
(`CHARS_PER_TOKEN = 4`, `MAX_SINGLE_FILE_READ_TOKENS = 15000`), so its numbers
line up with mycelium's `--token-check`. The cost tiers map straight to the
advice in `EFFICIENCY.md`:

| Tier | Tokens | Verdict |
|------|--------|---------|
| 1 · cheap | ≤ 3,000 | safe to read whole |
| 2 · medium | ≤ 15,000 | read whole **or** grep + chunk |
| 3 · expensive | ≤ 50,000 | **GREP ONLY** — never read whole |
| 4 · FATAL | > 50,000 | use the CLI (`--query`/`--status`), never read |

Tier-3+ files are **excluded** from the read-whole plan cost — the tool assumes
you'll grep them, and tells you the exact `grep -n "<anchor>"` + offset/limit
pattern to use instead.

---

## How it closes the loop with the Session Scorecard

A budget you blow is the strongest waste signal there is: you *declared* an
intent and overshot it. On `close`, the enforcer appends a record to
`.mycelium/budget-waste.jsonl`:

```json
{"date":"2026-06-17","task":"fix nav overflow","budget":8000,"spent":9200,"overBudget":true,"wastedTokens":1200,"reads":4}
```

The Session Scorecard reads that log and folds the **budget-overrun rate** into
its Waste metric (50/50 with slice-level waste). So:

- declare budgets and stay under → waste sub-score stays high → magnification index holds
- blow budgets → the index drops, with the over-budget tokens named in the report

That makes "super token efficiency" a number you can watch move across
sessions, not a claim. See `docs/SESSION-SCORECARD.md`.

---

## Using `check` as a guard

Because `check` exits non-zero when a read plan would blow the budget, you can
wire it into a pre-read hook or a script:

```bash
node bin/ai.cjs budget check "$@" || {
  echo "Read plan over budget — grep the big files first." >&2
  exit 1
}
```

The point isn't bureaucracy. It's that the cheapest moment to avoid a wasteful
read is *before* you make it.
