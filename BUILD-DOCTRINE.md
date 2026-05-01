# BUILD DOCTRINE

A short, opinionated record of how we build at NumbahWan / PINFORGE so the
next session doesn't repeat the same friction. This is not a style guide for
copy — that lives in `tools/ai-tell-corpus.json`. This is the build process.

Last updated: 2026-05-01

---

## 1. Friction we kept hitting (and the fix)

### 1.1 LLM-tell phrases shipped to production
**Symptom:** "state-of-the-art", "delve into", "卷軸", "巻物", "ブランド・イン・ザ・ワイルド" landing
in user-facing copy, then getting flagged by the user in review.

**Root cause:** No automated check between authoring and commit. Copy was
authored once and never re-read.

**Fix:** `tools/ai-tell-lint.cjs` + `tools/ai-tell-corpus.json`. Wired into
`.husky/pre-commit` (staged files only) and `npm run lint:ai-tell` (full
sweep). Per-rule allowlists let domain vocab through (e.g. "synergy" on
`battle.html` / `guild-siege.html` is a card-game mechanic, not LLM filler).

**Exit criteria for a copy change:** `npm run lint:ai-tell` returns 0.

### 1.2 14 MB of unused PNG sitting on disk
**Symptom:** `public/` was 166 MB. Trailer keyframes existed as PNG only
(22.3 MB across 15 files). Two emblem PNGs (3.7 MB combined) were superseded
by WebP versions but never deleted.

**Root cause:** No automated check on the cost of new image assets, and no
sweep policy when an asset gets re-encoded.

**Fix:**
- `tools/page-weight-profiler.cjs` already existed; now run pre-build via
  the `build` script.
- `tools/build-budget.cjs` enforces a 2 MB per-page budget.
- One-time cleanup: removed `public/index.html.bak-pre-3d-overhaul`,
  `public/invest.html.before-pinforge.bak`, the `public/static/game/veil/`
  duplicate of `public/static/game/the-veil/`, and 17 PNGs that had WebP
  counterparts.
- Trailer keyframes converted PNG → WebP (94% size reduction); references
  in `public/trailer/review.html` updated.
- Result: `public/` 166 MB → 136 MB (–30 MB, ≈18%).

**Rule for new images:** ship WebP. PNG only when transparency or alpha is
required and WebP can't satisfy it.

### 1.3 MultiEdit failures from indentation drift
**Symptom:** MultiEdit hunks failed mid-batch when one of N edits had a
trailing whitespace mismatch, blocking the entire batch.

**Root cause:** Hand-typed `old_string` for HTML with deep indentation is
fragile. Any earlier edit that shifted column positions invalidated later
hunks.

**Fix (process):**
- For multi-occurrence string swaps, use `Edit` with `replace_all: true`
  (or shell `sed -i`) rather than MultiEdit.
- For trilingual sweeps, prefer the smallest unique span (the inner text)
  not the whole `<span>` element.
- When MultiEdit fails mid-batch, stop and re-`Read` the file before
  resuming — the file state has already drifted from the planning snapshot.

### 1.4 Voting-card alignment off by a hair
**Symptom:** AI council vote cards on stock pages didn't sit on the same
baseline. User flagged it as "looks very unprofessional".

**Root cause:** Cards were `auto`-height with mixed-length copy. No
`align-items: stretch` on the grid container.

**Fix:** Set `align-items: stretch` on the vote-card row, and a min-height
on the model name pill so model names of different lengths still align.

**Lesson:** Editorial layouts need explicit baseline alignment. Don't rely
on grid defaults when card copy is variable-length.

### 1.5 "Newest models" risk
**Symptom:** User wants the model lineup to feel current and self-updating
("seems like will change as models upgrade") without breaking on a model
name typo.

**Fix (architecture):**
- Model lineup lives in a single source of truth (a JSON config or i18n
  block) rather than hard-coded into HTML.
- Each model entry carries a `tested_at` date — visible in the UI as small
  caption text — so the page shows we vet upgrades before publishing.
- Internal "harness" notes file (not user-facing) records the test prompts
  used to qualify each model rev.

---

## 2. Repo layout (light)

```
public/                  user-facing static site (target: ≤ 140 MB)
  static/                images, audio, data
  trailer/               keyframes (WebP only) + review tool
  world/, museum/, …     content pages
src/                     Vite / React TypeScript app
tools/                   build, lint, mining, telemetry (CommonJS)
  ai-tell-lint.cjs       AI-copy linter (this doc, §1.1)
  ai-tell-corpus.json    banned phrases + per-rule allowlists
  page-weight-profiler.cjs  per-page byte budget
  build-budget.cjs       CI gate on total page weight
scripts/                 generators, i18n inject, card management
.husky/pre-commit        gates: tsc → mycelium → nw-lint → ai-tell-lint
.mycelium*/              learning-system memory & patterns (auto-managed)
```

Files we **don't** lint (auto-generated or legacy archive):
- `public/static/research-md/**` — auto-generated academic-paper corpus
- `public/research/**` — long-form research, hand-curated, separate review
- `public/*-legacy.html`, `public/*-old.html` — frozen history
- `public/card-audit.html` — dev fixture listing every card phrase
- `public/trailer/review.html` — internal review tool, not public copy

---

## 3. Continuous improvement system (the loop)

```
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │  AUTHOR      │───▶│  PRE-COMMIT  │───▶│  POST-COMMIT │
  │              │    │  (.husky)    │    │  (telemetry) │
  └──────────────┘    └──────────────┘    └──────────────┘
                             │                   │
                             ▼                   ▼
                      block on:            mine:
                      - tsc errors         - commit pace
                      - mycelium guard     - test outcomes
                      - nw-lint            - blame map
                      - ai-tell-lint  ◀── new
```

### 3.1 What runs locally on every commit
1. **tsc** — types must be clean if `.ts`/`.tsx` is staged.
2. **mycelium-watch** — pattern warnings (couplings learned from history).
3. **mycelium guard** — protocol enforcement.
4. **nw-lint** — 20 mined rules from `.mycelium-mined/db/rules-api.json`.
5. **ai-tell-lint** *(new)* — banned-phrase scan with per-rule allowlists.

### 3.2 What runs on `npm run build`
1. **i18n-inject** — auto-injects missing `data-i18n` attributes.
2. **sentinel** — health snapshot.
3. **showcase-data generator**.
4. **page-weight-profiler** — flags pages > 2 MB.
5. **vite build** + `post-build.cjs`.
6. **commit-telemetry** — silent record of build outcome.

### 3.3 What we should run weekly (not yet automated)
- `npm run lint:ai-tell` — full sweep (currently 145 files, 0 issues).
- `npm run mine:weights:budget` — list pages over budget.
- `npm run mine:graph:impact` — find files with disproportionate blast radius.
- `du -sh public/` — image-debt check.

When any of these regress, capture the offending pattern as a new
ai-tell-corpus rule, mycelium-watch warning, or nw-lint mined rule. The
linters get smarter; we don't.

---

## 4. Copy doctrine (one paragraph)

Write the way you'd brief a colleague over coffee. Short sentences. Concrete
nouns. Numbers, not adjectives ("500 beds" not "state-of-the-art"). Trade
verbs over abstract nouns ("we run the models" not "model orchestration").
For 繁中 and 日本語: translate the *thought*, not the words. If a phrase
sounds like it was rendered from English, rewrite it. The corpus
(`tools/ai-tell-corpus.json`) lists the patterns we've already caught;
add to it whenever a reviewer flags a new one.

---

## 5. Ship checklist (5 items, do in order)

1. `npm run lint:ai-tell` → 0 issues
2. `du -sh public/` → ≤ 140 MB (otherwise sweep before commit)
3. `npm run typecheck` → 0 errors
4. `git add -A && git commit -m "<conventional>: <one-line summary>"`
5. `git fetch origin main && git rebase origin/main && git push -f`

Then create / update the PR with a one-paragraph "what changed" + a live URL
the user can open on iOS.
