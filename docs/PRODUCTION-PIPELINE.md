# PRODUCTION-PIPELINE.md: the anti-AI-tell production pipeline

How we keep "this was made by AI" out of everything we ship. This file
documents the inspectable chain so the workflow itself can be reviewed and
improved, not just the output.

Companion to [`TASTE.md`](./TASTE.md) (the standard) and
[`BUILD-DOCTRINE.md`](./BUILD-DOCTRINE.md) (the build process). One line to
remember: **precision you feel but can't see.** AI-tell is the opposite of
that, so driving it out is a direct expression of the taste.

Last updated: 2026-06-02

---

## The one command

```bash
node bin/ai.cjs aitell            # staged files (what pre-commit runs)
node bin/ai.cjs aitell --all      # full sweep across the repo
node bin/ai.cjs aitell <file>...  # specific files
node bin/ai.cjs aitell --judge    # add the LLM naturalness pass (costs tokens)
node bin/ai.cjs aitell --json     # machine-readable
```

It inspects every production step it can reach, runs the right detector chain
per medium, and prints one report.

---

## Why this design (the research, 2025)

We did not build this on perplexity and burstiness, the metrics most "AI
detectors" use. They are unreliable as a GATE:

- They false-positive on strong human writing. A clean, confident sentence is
  low-perplexity, so naive detectors flag good prose as machine-written.
- They are biased against non-native writing. Second-language English (and by
  the same logic our 繁中 / 日本語 / ไทย copy) is lower-perplexity by nature, so
  these metrics would punish exactly the multilingual work we ship.
- Many models do not expose token probabilities, so true perplexity cannot even
  be computed for their output.

What actually works, and what we built:

1. **Multi-signal, not single-metric.** The stylometry literature shows a
   combined feature set (F1 0.94) far outperforms any single number. We compute
   a spread of structural signals.
2. **Statistical signals are advisory, never the gate.** They guide; they do not
   block. The block stays on deterministic patterns and the LLM judge.
3. **Self-improving via active learning.** Every reviewer-flagged tell becomes a
   new corpus pattern and a recorded learning, so the system gets smarter and we
   never re-learn the same lesson. This is the mycelium loop already in the repo.

---

## Stage 0 · Upstream prevention (the style contract)

Detection scales with output; prevention scales with the generator. Slop is
born at generation time — the linter gate below is the backstop, not the
primary defense. Two mechanisms push the doctrine *into* the model before a
line is written:

**1 · The style contract** — [`tools/style-contract.json`](../tools/style-contract.json)
is the single source of truth for what NumbahWan work looks like, per medium
(text / code / layout / image). Its governing principle: work passes as
professional human work when it contains *visible evidence of decisions made
under constraints* — specific numbers, named places, opinions with reasons.
Slop is decision-avoidance. The contract forces the decisions upstream.

**2 · Exemplar anchoring** — models imitate examples far better than they obey
prohibitions. Each medium has golden exemplars in [`evals/style-exemplars/`](../evals/style-exemplars/)
— hand-locked files that pass their linter clean (and get re-verified by the
pre-commit gate on every edit, so a stale exemplar is itself a defect).

Both are served to generation calls by
[`tools/generation-contract.cjs`](../tools/generation-contract.cjs):

```bash
npm run contract:text     # style block + golden exemplar + self-critique checklist
npm run contract:code     # same for code
npm run contract:layout   # same for layout
npm run contract:image    # same for image prompts
node tools/generation-contract.cjs --check <file>   # contract-vs-output lint
```

The intended authoring loop for any agent producing user-facing work:

```
  brief → build prompt WITH contract block + exemplar anchor
        → generate
        → self-critique pass (checklist from the same contract)
        → revise → commit → the gate below verifies
```

KPI that proves prevention works: **linter catch-rate on new work trends down
over time** — the gate goes quiet on new commits and becomes a regression net,
like a good test suite. The gate never goes away; even world-class human teams
have editors.

---

## The chain: three stages, cheapest first

Each medium runs up to three stages, in order. Only Stage 1 can fail a commit.

### Stage 1 · Deterministic corpus (free, fast, BLOCKING)

Exact-pattern matches against a curated corpus. The only stage that changes the
exit code. This is where a commit gets blocked.

| Medium | Tool | Corpus / rules |
|---|---|---|
| Text / copy | [`tools/ai-tell-lint.cjs`](tools/ai-tell-lint.cjs) | [`tools/ai-tell-corpus.json`](tools/ai-tell-corpus.json) (en/zh/ja/th, 21 rules) |
| Layout / build | [`tools/ai-layout-lint.cjs`](tools/ai-layout-lint.cjs) | 6 named visual tells (see below) |
| Image prompts | [`tools/ai-sheen-lint.cjs`](tools/ai-sheen-lint.cjs) | [`tools/sheen-corpus.json`](tools/sheen-corpus.json) (render/CGI/luxury-cliché vocab) |

A high-severity match blocks. Per-rule allowlists let real domain vocab through
(a card-game "synergy" is a mechanic, not AI filler). Doctrine files that *quote*
banned phrases to teach them are exempt.

The layout linter reads the BUILD, not the prose. It catches the visual tells
that make a shipped page look AI-assembled even when the words are clean:

| ID | Tell | Blocks? |
|---|---|---|
| L1 | Emoji-as-icon in buttons / links / headings (colour emoji, not dingbats like ✕ ✓) | yes |
| L2 | The default indigo→purple "AI startup" gradient (#6366f1 / #8b5cf6 / #a855f7) | yes |
| L3 | Framework-default drop shadow pasted verbatim, ≥3 times (rgba(0,0,0,.1) ladder) | yes |
| L4 | Motion that animates opacity and nothing else | note |
| L5 | Many structurally identical sibling blocks (cloned-card grid) | note |
| L6 | A page that centers almost everything (template symmetry) | note |

Calibrated against the taste-locked pages so a crafted page passes. The shared
prose/markup helpers live in [`tools/lib/aitell-common.cjs`](tools/lib/aitell-common.cjs).

### Stage 2 · Stylometry signals (free, fast, ADVISORY)

[`tools/ai-stylometry.cjs`](tools/ai-stylometry.cjs) scores prose 0..100 for
machine rhythm and lists the reasons. It never blocks. Signals (language-aware,
so English-only signals do not fire on CJK text):

1. Sentence-length uniformity (AI evens out sentence length)
2. Paragraph-shape sameness (paragraphs cluster to one length)
3. N-gram / phrase repetition (re-used scaffolding phrases)
4. Connective density (moreover / furthermore / therefore)
5. Hedge density ("it's worth noting", "generally", "plays a crucial role")
6. List-parallelism rigidity (every bullet the same shape)
7. Opening-word repetition (sentences/bullets that all start the same way)

Bands: `≥60` strong machine rhythm · `40-59` some · `22-39` mostly natural ·
`<22` natural. Treat a high score as a prompt to add specificity and vary the
rhythm, not as a failure.

### Stage 3 · LLM naturalness judge (costs tokens, ADVISORY, opt-in)

[`tools/ai-naturalness.cjs`](tools/ai-naturalness.cjs) sends prose to an LLM that
scores naturalness per language and returns a SAME-VOICE rewrite. Opt in with
`--judge`. Skipped in pre-commit so commits stay fast and free.

### Code medium · agent-residue lint (free, fast, ADVISORY)

The prose linter guards user-facing copy; [`tools/code-slop-lint.cjs`](tools/code-slop-lint.cjs)
guards the CODE ITSELF. AI coding agents leave a recognizable residue humans
rarely write (architecture adapted from scanaislop/aislop research, 2026-07):

| ID | Tell |
|---|---|
| CS1 | Narrative comment — an imperative-verb comment that restates the line below it ("// increment the counter") |
| CS2 | Swallowed exception — catch with an empty body or a log-only body (returns, rethrows, stderr, and documented silence are deliberate and pass) |
| CS3 | As-any cast / type-silence — `as any`, or a leading `@ts-ignore` / `@ts-nocheck` / `@ts-expect-error` directive |

Advisory-only — always exits 0. Code slop has too many legitimate uses
(narrowing a third-party type, an intentional no-op catch) to hard-block; the
report is a review prompt, not a gate. Wired into `aitell-pipeline.cjs` as the
code medium alongside text and image (`npm run aitell:code` / `aitell:code:all`).

---

## How it wires into the workflow

```
  AUTHOR ──▶ PRE-COMMIT ──────────────▶ COMMIT ──▶ WEEKLY SWEEP
              │                                      │
              ├─ ai-tell-lint (Stage 1, BLOCK)       ├─ npm run aitell:all
              └─ [stylometry advisory, non-block]    └─ npm run aitell:judge
```

- **Pre-commit** runs Stage 1 on staged files. A high-severity tell blocks the
  commit until fixed (bypass only for pre-existing debt: `--no-verify`).
- **Weekly**, run the full sweep (`npm run aitell:all`) and the judge pass on any
  page whose copy changed.

---

## Reducing AI-tell at the source (not just detecting it)

Detection is the floor. The real win is authoring so the tell never appears.
The research and our own corpus agree on what works, and what does not:

**Works:**
- **Concrete specifics over abstraction.** Real numbers, real names, real detail
  (King's grounded specificity from `TASTE.md`). "500 beds", not
  "state-of-the-art facilities."
- **Vary the rhythm on purpose.** Short sentence. Then a longer one that earns
  its length. A fragment. Uniform cadence is the loudest tell.
- **One real voice.** Write the way you'd brief a colleague over coffee. Opinion,
  a specific verb, a thing only a person who was there would say.
- **Translate the thought, not the words.** For 繁中 / 日本語 / ไทย, if a phrase
  reads like it was rendered from English, rewrite it from scratch.

**Does not work (banned):**
- Synonym-swapping to "beat a detector." It degrades quality and leaves the
  rhythm intact, which is the actual tell.
- Sprinkling connectives (moreover/furthermore) to sound formal. That IS the
  tell.

---

## When a reviewer flags a new tell (the self-improving loop)

The linters get smarter; we do not re-learn the same lesson.

1. Add the pattern to the right corpus:
   - copy → [`tools/ai-tell-corpus.json`](tools/ai-tell-corpus.json)
   - image prompt → [`tools/sheen-corpus.json`](tools/sheen-corpus.json)
   - a structural rhythm → a new signal in `tools/ai-stylometry.cjs`
2. Record the learning so it survives sessions:
   ```bash
   node bin/ai.cjs memory constraint "ai-tell" "<the new tell and why it reads as machine-made>"
   ```
3. Re-run `npm run aitell:all` to confirm the new rule is clean across the repo.

---

## Roadmap (gaps still open)

The pipeline covers text, layout, and image prompts today. Same architecture
extends to:

- **Motion** (machine-feeling easing, no stagger, linear everything). Governed by
  [`references/MOTION-CRAFT.md`](references/MOTION-CRAFT.md); a checker can read
  the page for the tells the doctrine already names. The layout linter's L4 note
  (opacity-only motion) is a down payment on this.
- **Audio / video** (flat TTS cadence, default transitions). Future medium
  playbook + detector.

Each new medium gets a Stage 1 corpus and (where useful) a Stage 2 signal, plugged
into the same `aitell` orchestrator. The constitution in `TASTE.md` does not
change; the pipeline grows under it.
