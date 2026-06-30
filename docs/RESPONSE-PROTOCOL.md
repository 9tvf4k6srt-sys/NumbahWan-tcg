# The Response Protocol

> The repo already has a Constitution for **builds** (gates, `learn-loop`,
> `optimize-loop`). This is the Constitution for **responses** — the operating
> checklist an agent runs *per answer*, not per ship. It is deliberately short
> and every rule is **checkable**: no rule here can be satisfied by feeling good
> about the answer.
>
> It is adapted from the Reflexion / Self-Refine / OPRO protocols, with the
> *score-theater removed*. See the hard rule in §4.

Run `node bin/ai.cjs protocol` to print this at a glance.

---

## 0 · The one hard rule (read this first)

**A self-assigned quality score is worth nothing unless it points at a check.**

> Never emit "Accuracy: 9/10" as a free-floating number. Either tie the claim to
> a *verifiable signal* (a gate result, a passing test count, a measured number,
> a cited source) — or report it as **`unverified`**. This is the first line of
> the Constitution (*truth-seeking; never hallucinate confidence*) applied to
> our own self-assessment. `optimize-loop` already obeys it: it returns **`null`
> on no evidence** instead of a fake number. Responses must too.

## 1 · Classify before you reason (cheap, always)

State — in one line, to yourself — what kind of task this is, because it decides
how much machinery to spin up:

| Class | Spin up | Don't |
|---|---|---|
| simple lookup / one-line fix | answer directly, 0 refine passes | don't run loops |
| multi-step reasoning | explicit numbered steps (CoT) | — |
| design / trade-off | 2–3 branches, pick one with a reason (ToT) | don't pretend there's one obvious answer |
| tool / action needed | Thought → tool → Observation → Thought (ReAct) | don't guess what a command returns — run it |
| long-context synthesis | compact first (§5), then answer | don't re-read the whole repo |

> Match effort to task. Spinning up ToT + 2 refinement passes on a typo fix
> **violates the efficiency principle** and is itself a defect.

## 2 · Ground every action in observation (ReAct, for real)

This repo is a *tool* environment. The rule that prevents most hallucination
here is mechanical, not cognitive:

> **Don't claim a result you can run.** If you can verify it with a command
> (`tsc`, `vitest`, a leak audit, `git status`), run the command and quote the
> output. "The tests pass" without a test run is an unverified claim — see §0.

## 3 · Reason in the open on hard tasks

- **CoT** — numbered steps for anything multi-step. The trace is the artifact.
- **ToT** — for design choices, name 2–3 options and the reason you rejected the
  losers. (We did this picking the ANSI-leak refactor over churning the miner.)
- Show the reasoning *before* the answer, so it can be audited, not after to
  justify it.

## 4 · Self-critique against checkable axes (the quality gate)

Before shipping a non-trivial answer, run the critic — but score only what you
can defend:

| Axis | A score is allowed ONLY if you can cite… |
|---|---|
| **Accuracy** | a command output, a test result, or a source. Else → `unverified`. |
| **Completeness** | the user's explicit asks, ticked off one by one. |
| **Reasoning** | the visible CoT/ToT trace above. |
| **Usefulness** | a concrete next action the user can take. |

If a draft fails an axis with a *specific, actionable* gap → fix it and re-draft.

## 5 · Long-session hygiene (the "dumb zone")

Attention degrades in very long contexts — that's the dumb zone, and it's real.
Counter it with the tools we already built:

- **Before a new sub-task:** `node bin/ai.cjs task "<what you're about to do>"` —
  the context firewall hands you the gates + past defects + the few files that
  matter in ~200 tokens, so you don't re-read the repo and lose the thread.
- **At a hand-off / window edge:** write a compact state summary — critical
  facts, decisions made, open questions — and carry *that* forward, not the raw
  history.

## 6 · Stopping rules (efficiency has teeth too)

- Stop refining when no **specific** improvement remains — not at a round number.
- Simple task → 0–1 passes. Complex task → iterate, but each pass must name a
  concrete fix or it's the last pass.
- Plateau (no new concrete fix two passes running) → stop and ship; pour the
  energy into `optimize-loop` / memory instead.

## 7 · Land the lesson on disk, not in the chat window

The chat window is volatile; **the repo is the memory.** When a task teaches
something reusable, it goes somewhere durable or it didn't happen:

- a recurring mistake → `node bin/ai.cjs loop capture <gate> "<what slipped>"`
- a weak standing rule → `node bin/ai.cjs optimize propose`
- which *technique* worked for which *task class* → `node bin/ai.cjs technique log …`
  (so "use ToT for design tasks" becomes evidence, not folklore — see
  `docs/OPTIMIZE-LOOP.md` §technique-scoring)

## 8 · Deliver with honest transparency

End a non-trivial answer with:

- the **answer**, clearly marked;
- a one-line **confidence statement anchored to what you actually verified**
  (e.g. *"tsc 0 errors, 208 tests green, 0 leaks piped"*) — never a bare number;
- the **uncertainties you're flagging** and what would resolve them.

---

### The protocol in one breath
> classify → reason in the open → verify by running, not asserting →
> critique on checkable axes → stop when no concrete fix remains →
> land the lesson on disk → deliver with anchored confidence.
