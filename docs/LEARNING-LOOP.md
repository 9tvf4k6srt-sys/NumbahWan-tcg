# The Learning Loop + Context Firewall

> Two failure modes kill AI-assisted building: the agent **loses context** after
> reading the whole repo, and **AI-tells ship anyway** because the detector
> isn't in the loop. This is the fix for both — and it's what makes the repo
> *get better as you build* instead of catching the same mistakes forever.

```bash
node bin/ai.cjs task "fix nav overflow on mobile"   # context firewall (read this, not the repo)
node bin/ai.cjs preship <files>                      # gates auto-capture failures into memory
node bin/ai.cjs loop status                          # repeat-rate + permanent gates
node bin/ai.cjs loop recurring                        # your real weak spots
```

---

## 1 · The flywheel (defect → lesson → gate)

The repo already had all the parts: gates that catch problems (`aitell`,
`layout`, `render`, `tsc`, `vitest`) and `factory-memory.cjs` that can record
defects, detect recurrence, and evolve frequent ones into permanent rules. What
was missing was the **wire** between them — a failed gate just printed an error
and threw the knowledge away.

`bin/learn-loop.cjs` is that wire:

1. **Capture** — when `preship` fails, each failing gate becomes a structured
   defect in `factory-memory.json`, tagged with a category and a prevention rule.
2. **Detect recurrence** — if the same defect (category + description) was seen
   before, it's flagged as a REPEAT.
3. **Auto-gate** — a repeat is promoted to a permanent `required_checks` rule, so
   the **second** time something tries to escape, it's blocked, not re-fixed.

```
gate catches it ─▶ learn-loop captures it ─▶ recurs? ─▶ promote to permanent gate
       ▲                                                          │
       └──────────────── now it can't escape again ◀─────────────┘
```

This runs automatically inside `preship` (skip with `--no-learn`, e.g. in CI):

```
preship: 1 gate(s) failed — fix before shipping.
↳ 1 failure(s) captured to the learning loop (repeats become permanent gates).
```

### The honest number

`loop status` reports **repeat-rate** — the share of logged defects that came
back anyway — computed from *real* defect recurrence, not a self-report. A
genuinely learning system drives this toward 0. The Session Scorecard reads the
same number and labels its source `(real defects)`:

```
4 · Learning   77/100 recent avg   since first: ↑ +4   repeat-rate:0% (real defects)
```

That trend, dropping over weeks, is the actual proof that the stack compounds.

---

## 2 · The context firewall (`task`)

The other failure mode: to "understand the repo", an agent reads thousands of
tokens of files, fills its context window, then loses the thread mid-task.

`bin/task-brief.cjs` inverts this. Given the task you're about to do, it returns
— in a few hundred tokens — only what you need to hold:

| Section | What it gives you | Source |
|---|---|---|
| **1 · Gates you must satisfy** | the permanent rules for this area | `factory-memory` `required_checks`, scoped by keyword |
| **2 · What broke here before** | past defects + their fixes | `factory-memory` `defects` |
| **3 · Files memory points at** | the handful of files that matter | recorded pages/lessons (no tree walk) |
| **4 · Suggested token budget** | a budget to declare for the slice | heuristic by area |

```
$ node bin/ai.cjs task "fix nav overflow on mobile header"

  Task Brief  fix nav overflow on mobile header
  areas: layout
  1 · Gates you must satisfy
     ⚑ layout  AUTO-GATE: no emoji-as-icon, no stock gradient, no default shadow
  2 · What broke here before
     D0003 REWATCH button blocks DLC navigation tabs on mobile
        fix: Repositioned to top-left below sticky nav, reduced z-index
  3 · Files memory points at
     world/nwg-the-game.html
  4 · Suggested token budget  12,000 tok
  (this brief ≈ 163 tokens — vs. thousands to read the repo)
```

It does **no deep traversal and reads no whole files** — it trusts what memory
already knows. The brief must cost less than the context it saves; that's the
whole design constraint.

### The intended session shape

```bash
node bin/ai.cjs task "<task>"                 # 1. get the firewall brief (~200 tok)
node bin/ai.cjs budget declare "<task>" --budget=<suggested>   # 2. open a token contract
#    ...build, grepping only the files the brief named...
node bin/ai.cjs preship <files>               # 3. gate it — failures auto-feed the loop
node bin/ai.cjs budget close                  # 4. close the budget (feeds the scorecard)
```

Each step makes the next session cheaper and smarter: the loop learns what to
gate, the firewall learns what context to hand over, the scorecard proves the
trend. That is the recursively-improving stack.

---

## Portability

`learn-loop.cjs` and `task-brief.cjs` depend only on `factory-memory.cjs` and
the shared `aitell-common.cjs` — no project-specific paths. They're part of the
portable engine: drop them on any repo that has a `factory-memory.json` and the
loop works. The per-project knowledge lives in the memory file; the engine is
generic.
