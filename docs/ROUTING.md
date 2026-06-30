# Complexity-Aware Routing

> Not every task deserves the same machinery. A one-line lookup answered with a
> full tree-of-thoughts plan burns tokens and time for nothing; a sprawling
> design decision answered off the cuff loses success. The trainer cheat sheet's
> highest-leverage idea — *"simple tasks → fast path; complex → full reasoning"* —
> is a **router**: classify the task, score its complexity from measurable
> signals, then pick the cheapest path that still earns the answer.

```bash
node bin/ai.cjs route "fix nav overflow on mobile header"     # human view
node bin/ai.cjs route "deploy the worker" --json              # machine view
```

The router doesn't do the work. It tells you **which gear to be in** before you
start, and hands you a plan that references tools you already own (`ai task`,
`ai budget`, `ai preship`, `ai technique`).

---

## 1 · It reuses the parts we already had

Nothing here is a new vocabulary to drift out of sync. The router is glue:

| input | comes from | what it knows |
|---|---|---|
| task categories | `task-brief.cjs` `categoriesFor()` | i18n / layout / render / perf / … |
| which technique works | `technique-log.cjs` `score()` | evidence per task-class |
| the cost | `token-budget.cjs` | the token budget for the slice |

`route-task` is the only piece that ties them together.

---

## 2 · The five task classes

`classify()` maps the task language to one of the same five classes the
technique log uses — so the evidence lines up:

`lookup · reasoning · design · action · synthesis`

**Deliberation beats an incidental imperative.** A task that asks us to *decide*
(`refactor the build pipeline and decide whether to split the worker`) routes to
**design**, not **action**, even though the word "build" is in the sentence.
Misrouting a design decision onto the cheap fast path is the exact failure mode
complexity-aware routing exists to prevent, so the deliberation verbs
(`design / refactor / decide / whether / should we / choose`) are checked first.

---

## 3 · Complexity is scored, not guessed

`complexity()` returns a `0..100` score and **every point carries a reason** — no
hidden model call, no vibes. The signals:

| signal | points | why |
|---|---|---|
| long description (>25 words) | +15 | scope |
| medium description (>12 words) | +8 | scope |
| multi-step / `and …` clauses | +7…+15 | more steps, more to get wrong |
| open-ended wording (`explore`, `best way`, `improve`) | +15 | ambiguity costs reasoning |
| design decision (`decide`, `whether`, `choose`, `trade-off`) | +12 | a real choice, not a mechanical edit |
| visual/CSS change | +20 | the repo's **#1 token sink** (the re-see loop) |
| i18n surface | +8 | multi-locale blast radius |
| breadth markers (`all / every / across`) | +12 | wide blast radius |
| narrow lookup (`what is x`, <12 words) | −10 | keep trivial questions cheap |

Run with `--json` to see the exact `complexitySignals[]` for any task — the score
is always auditable.

---

## 4 · The path + budget decision

| complexity | path | base budget | meaning |
|---|---|---|---|
| `< 20` | **fast** | 5,000 | answer directly; don't over-think a one-liner |
| `20–44` | **standard** | 9,000 | declare a budget, reason where it pays |
| `>= 45` | **full-reasoning** | 14,000 | name 2–3 options on design calls; reason in the open |

Visual work (layout/render) adds **+3,000** to whatever the base is — it earns the
extra because it's where tokens leak hardest.

---

## 5 · The honesty brake (the part that makes it trustworthy)

The technique pick is **evidence-first**: if the technique log has enough data for
the task class (`n >= MIN_EVIDENCE`), the router recommends the proven technique
and shows its real success rate. Otherwise it recommends a sane **default** for
the class and labels it exactly that — `default (no evidence yet)`. It never
dresses a heuristic up as evidence.

There is one subtle trap the router is **specifically guarded against**:

> When the fast path downgrades an expensive technique (e.g. `tot → cot` because
> a one-line task can't justify a tree search), the downgraded technique has **no
> evidence of its own**. Showing it next to the original technique's success rate
> would be a lie. So on a downgrade the source becomes `default-downgraded` and
> `techniqueEvidence` is set to **`null`**.

This invariant is pinned by `tests/unit/route-task.test.mjs` so it can't silently
regress.

```text
=== short design task (fast path → downgrade, honest label) ===
  path        fast
  technique   cot   downgraded for fast path (evidenced pick was too heavy)
=== full design task (keeps tot + its evidence) ===
  path        standard
  technique   tot   evidence (1 clean over 3)
```

---

## 6 · Close the loop

The plan the router prints always ends with the line that feeds the evidence back
in:

```bash
ai technique log <task-class> <technique> <clean|rework|fail>
```

That's what turns the default picks into evidenced ones over time. The router gets
*better* the more you log — which is the whole point of the Dark Factory.

---

### See also
- `docs/RESPONSE-PROTOCOL.md` — the per-answer checklist the router slots into
- `docs/OPTIMIZE-LOOP.md` — how standing rules get sharpened by real recurrence
- `bin/task-brief.cjs` — the context firewall (now emits a Role+Format+Constraints scaffold too)
