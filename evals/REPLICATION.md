# Replicating the outcome eval

The outcome eval is the receipt that the harness *changes agent behavior*, not
just that it emits plausible-sounding text. This document is the checklist for
an outsider — or a future model generation — to reproduce it from a cold clone.

## What you need

1. Node.js 18+ (the eval is zero-dependency: `https`, `fs`, `path` only).
2. One live LLM credential. The eval tries, in order, and falls through on
   HTTP 401:
   - `OPENAI_API_KEY` (with optional `OPENAI_BASE_URL`, default `https://api.openai.com/v1`)
   - `GSK_API_KEY`
   - `GSK_TOKEN`

   Any OpenAI-compatible chat-completions endpoint works; point
   `OPENAI_BASE_URL` at it. A key that only 401s is skipped automatically —
   you do not need to unset stale keys.

## Run it

```bash
git clone https://github.com/9tvf4k6srt-sys/NumbahWan-tcg.git
cd NumbahWan-tcg

# Inspect everything first — no network calls:
node evals/outcome-eval.cjs --dry-run

# Full suite (default: gpt-5-nano, gpt-5-mini, gpt-5 × 3 runs, writes receipt + history):
npm run eval:outcome

# Cheaper smoke (2 cheap models × 1 run):
node evals/outcome-eval.cjs --write --models gpt-5-nano,gpt-5-mini --runs 1
```

A full default run is 28 tasks × 2 arms × 3 runs × 3 models = 504 calls and
takes a few minutes. Token spend is small (~220 max completion tokens/call).

## Expected shape of the result

Do **not** expect identical numbers — models drift. Expect the same *shape*:

| Kind | Naive arm | Memory arm | What it proves |
|---|---|---|---|
| `fact` | low pass rate | markedly higher | memory supplies repo-specific facts the model can't know |
| `control` | high pass rate | **equal** | the briefing isn't a distraction that tanks baseline competence |
| `adversarial` | mostly honest | **no less honest** | memory doesn't inflate confidence on things it doesn't cover |
| `poison` | n/a (unpoisoned) | resists injected lie ≥ 3/4 | memory doesn't get dragged into error by planted wrong claims |

The overall verdict is `MEMORY-HELPS` only when fact Δ > 0 **and** all three
no-harm conditions hold. If you get `MEMORY-HELPS-BUT-HARMS` or worse, that is
a real finding — file an issue with `evals/results/outcome-eval.json`.

## What you should be suspicious of (and how to check)

- **"The builder taught to the test."** Partly true by construction — 22 of
  the tasks are hand-written by the same person who built the briefing. The
  countermeasure: 6 tasks in `evals/tasks/authored.json` were written by an
  LLM that saw only `ARCHITECTURE.md` + `AI_PLAYBOOK.md`, never the briefing
  assembly or the built-in corpus. Re-author them yourself with
  `node evals/outcome-eval.cjs --author` and compare.
- **"The grading is vibes."** No LLM judge anywhere. Every verdict is
  substring matching (`require` must appear, `forbid` must not). The full
  transcript of every answer + its grade is in the receipt — audit by hand.
- **"It only works because of local state I can't see."** The briefing's one
  gitignored input (`.mycelium-context`) falls back to the committed snapshot
  `evals/fixtures/mycelium-context.snapshot.txt` on a fresh clone. Everything
  else the briefing reads (`ARCHITECTURE.md`, `AI_PLAYBOOK.md`,
  `.mycelium-mined/db/patterns-api.json`) is tracked in git.
- **"Errors get silently averaged away."** They don't. If any API call
  errors, the run is declared VOID, no receipt is written, and the process
  exits 1. A partial comparison would mislead, so there isn't one.
- **"The anti-slop linters themselves are unproven."** They're graded too.
  `npm run eval:linter` runs all three linter layers (text / layout / code)
  against hand-authored golden fixtures (`evals/linter-fixtures/manifest.json`)
  with known correct verdicts: planted slop must fire (recall), clean and
  adversarial content must not (precision). Its first run caught a genuinely
  inert corpus pattern (`AIT-EN-CHALLENGE-FORMULA` — `,\b` can never match
  when a space follows the comma) and a route-doc false positive in the code
  linter; both are fixed and regression-tested by the fixtures.

## The trend, not the snapshot

Every `--write` run appends one line to `evals/results/outcome-history.jsonl`.
A single MEMORY-HELPS snapshot is weak evidence; a flat or rising line of
fact-Δ across model generations is the actual claim. If you're evaluating a
new model, run with `--models <new-model>` and compare the appended line
against history.
