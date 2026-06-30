# The Evaluator-Optimizer Loop

> The learning loop stops you making the **same** mistake twice (a repeat becomes
> a permanent gate). But that never asks the next question: *are the rules we
> already have any good?* A rule can exist and defects can **still keep escaping
> in its category** — that means the instruction is weak, not missing. This loop
> optimises the **instructions themselves** against real performance, the way
> OPRO optimises a prompt against a score. It's what makes the rule set get
> *better*, not just *bigger*.

```bash
node bin/ai.cjs optimize status      # one honest line: proven / weak / unproven
node bin/ai.cjs optimize evaluate    # score every standing rule by real recurrence
node bin/ai.cjs optimize propose     # candidate sharper rules for the weak spots (read-only)
node bin/ai.cjs optimize apply       # promote the winners into required_checks (backs up first)
```

---

## 1 · The signal is real (not a self-reported score)

The optimizer never invents a quality number. Its only signal is **defect
recurrence per category**, drawn from the actual `defects[]` history in
`factory-memory.json`:

- group every logged defect by its `category`
- count how many were a **repeat** of an earlier defect in that same category
- `repeatRate = repeats / total` for the category — or **`null`** when there is
  no evidence to judge by (honest by default).

A category that keeps recurring is a category whose standing rule isn't working.

## 2 · Evaluate — score the standing rules

`optimize evaluate` reads every `required_checks` entry, finds the category it
belongs to (it **trusts the entry's own `category` field** first, then falls
back to classifying the rule text with the same vocabulary `learn-loop` uses),
and assigns a verdict:

| Verdict | Meaning |
|---|---|
| **proven** | the rule's category has defects but **none recurred** since — it's holding |
| **weak** | defects **still recur** in this rule's category — the instruction is too soft |
| **unproven** | no defects in this category yet — can't judge it (shown, never punished) |

```
[proven] i18n   repeat-rate 0 over 2
         AUTO-GATE: Block builds with i18n defects (seen 2 times)
```

## 3 · Propose — OPRO-style candidates for the weak spots

`optimize propose` targets two kinds of category:

- **weak** — a rule exists but defects keep recurring → sharpen it
- **uncovered** — defects exist in a category with **no** covering rule → add one

For each target it generates several candidate rules from a category playbook
and **ranks them by specificity** — a concrete command in backticks, a
measurable bar (`0 flags`, `< 60`, `320px`), an imperative verb, and a tie to
"before ship" all score higher; vague/long rules score lower. The most specific
candidate is the **winner**. It's **read-only** — it shows the diff, changes
nothing.

```
▸ layout (has defects but no rule)
  winner  Run `ai layout --strict`; reject emoji-as-icon, the default
          indigo→purple gradient, and the default box-shadow before ship.
  alt     Every section must differ from the template default in spacing OR
          type scale OR colour; no untouched scaffold ships.
```

## 4 · Apply — promote the winner (never silent)

`optimize apply` writes the winning candidates into `required_checks` via
`factory-memory.addPattern`, so from then on they're part of every build's
standing rule set. It is deliberately conservative:

- **backs up `factory-memory.json` first** (`*.bak-<timestamp>`) — never mutates
  silently;
- stamps each new rule with its `category` and a unique
  `prevention: optimizer:<category>` key, so it can't false-merge into an
  unrelated check;
- is the only sub-command that writes — `status` / `evaluate` / `propose` are
  all read-only.

## 5 · Where it plugs into the workflow

- **`ai preship`** — on a *clean* ship it prints a one-line, read-only nudge if
  any standing rule is still **weak** (`run \`ai optimize propose\``). It never
  mutates memory mid-build.
- **`learn-loop`** feeds it — every captured defect becomes evidence the
  optimizer scores rules against. The two loops compose:
  *learn-loop adds rules; optimize-loop makes them sharp.*

```
defect  ─capture→  learn-loop  ─recur→  permanent gate
                                  │
                                  ▼
                    optimize-loop  ─evaluate→ weak?  ─propose→ sharper rule ─apply→ required_checks
```

## 6 · The honest read

`optimize status` is the one number to watch:

```
optimize: 6 rules — 4 proven, 1 weak, 1 unproven · overall repeat-rate 0.08
```

Over weeks, **weak → 0** and **overall repeat-rate → 0** is the proof the rule
set is converging on instructions that actually prevent the defects, instead of
accumulating rules that read well but don't bite.

---

### Commands

| Command | Writes? | What it does |
|---|---|---|
| `ai optimize status` | no | proven / weak / unproven counts + overall repeat-rate |
| `ai optimize evaluate` | no | per-rule verdict with the evidence behind it |
| `ai optimize propose` | no | ranked candidate rules for weak/uncovered categories |
| `ai optimize apply` | **yes** | promote winners into `required_checks` (backs up first) |

All commands accept `--json` for scripting/CI.

---

## technique-scoring — which reasoning approach actually works

`optimize-loop` sharpens the *rules*. Its sibling `bin/technique-log.cjs`
applies the same honest-evidence idea to *how you reason* — the meta-learning
step of the response protocol (`docs/RESPONSE-PROTOCOL.md`). Instead of "ToT
felt better for design," log it and let the numbers decide:

```bash
ai technique log design tot clean    # a design task done with ToT shipped clean
ai technique log reasoning cot rework
ai technique score                   # success-rate per task-class × technique
```

- **task-class:** `lookup | reasoning | design | action | synthesis`
- **technique:** `direct | cot | tot | react | self-consistency`
- **outcome:** `clean` (shipped, no rework) | `rework` | `fail`

`score` reports the clean-rate for each `class × technique` cell — but only once
a cell has **≥ 3 observations** (`MIN_EVIDENCE`). Below that it prints
`insufficient (n=…, need 3)` rather than a fake "100% off one data point" — the
exact same honesty rule the evaluator uses (`null` until there's evidence). Over
time, `best so far:` per task-class becomes an **evidence-backed** default for
which technique to reach for — folklore turned into data.

Storage is append-only at `.mycelium/technique-log.jsonl` (gitignored, like the
other runtime ledgers). Accepts `--json`.
