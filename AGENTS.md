# AGENTS.md — PINFORGE Wealth · Build Harness

> First file every agent reads. ≤100 lines on purpose. If a rule conflicts with
> something deeper in the repo, this file wins for the **invest / playbooks /
> consulting** surface. The rest of the repo (cards, battle, arcade) is
> NumbahWan TCG and follows its own conventions.

## 1 · Run it

```sh
./init.sh                       # restart dev server, smoke /invest /loading /playbooks
PORT=8765 node tools/anchor-preview.cjs   # manual: dev server on 8765
```

Public URL pattern (sandbox): `https://8765-<sandbox-id>.sandbox.novita.ai/<path>`
Always paste the live link AND the commit hash after a push. Non-negotiable.

## 2 · Routes (allowlist lives in `tools/anchor-preview.cjs`)

`/` `/invest` `/stock` `/stock/?t=…` `/playbooks` `/playbooks/<slug>`
`/anchors` `/lock` `/branch-sg` `/tells` `/sources`

When you add a route, edit `tools/anchor-preview.cjs` AND register it in
`tools/check-routes.cjs::ALLOWED_ROUTES`. The route sensor fails closed.

## 3 · Voice (the motto)

Canonical motto strings — edits must update `tools/check-motto.cjs::MOTTO`:

- EN: `We treat your wealth — and your business — like our own.`
- 繁中: `你的錢、你的店,我們當自己的在顧。`
- 日本語: `お客様の資産も事業も、自分のものとして守ります。`

We are a Taipei boutique advisor speaking plainly. Imitate: senior PM at the
desk. Avoid: Bloomberg / HSBC / hedge-fund register, UN-translator literal
renderings. **TW street register, never AI-translator phrasing.** Long copy
already gritty (拽那招、擺著不動、卷宗) — fix the SHORT labels and CTAs, that
is where AI-tells leak. Three languages always: EN / 繁中 / 日本語. Japanese
stays formal-direct, Chinese stays colloquial Taipei.

Forbidden short copy: "預約 30 分鐘第一次聊聊", "都在你手上".
Prefer: "先約 30 分鐘,坐下來聊", "股票你自己抓著".

## 4 · Audit before code

When the user asks for clarity / improvement, do an **honest audit first, no
code**. Numbered diagnosis (Problem 1/2/3), proposed rewrite verbatim, A/B/C
choices, single-recommendation with reasoning. Then wait for yes/no.

One product per landing — no co-headlines. Other products are quiet doors
near the footer. Products are framed as **process, not output** (the names
rotate, the discipline doesn't).

## 5 · Workflow per push

1. Edit. Keep diffs focused.
2. Smoke-test pattern (always show in the response):
   `HTTP <code> · <bytes> B · grep N for new strings · grep 0 for stale strings`
3. `git add -A && git commit -m "<scope>: <what>"`
4. `git fetch origin main && git rebase origin/main` — resolve toward remote.
5. Squash: `git reset --soft <base> && git commit -m "<comprehensive>"`
6. `git push -f origin genspark_ai_developer`
7. Open / update PR. Paste **live link · PR link · commit hash** to the user.

## 6 · Anti-patterns (auto-rejected by review)

- 3+ CTAs in a hero (cap is 2)
- Hero sub-paras over ~30 words
- Co-headlining two products
- Leading with posture before product
- Shipping without smoke test + asset weight check
- AI-tell phrases (delve / tapestry / pivotal / furthermore / state-of-the-art /
  paradigm / synergy outside game pages / em-dash flooding / 賦能 / 巻物 /
  vibrant / robust / leverage / craft / navigate when generic)

## 7 · Zero-trace doctrine (every page we touch)

AI is a draft tool. 60–80 % of final output is hand-edited. Mix sentence
lengths (never 3 same-length in a row). Active voice. Real specifics
(NT$ figures, vendor names, Taipei district names). Strip metadata before
shipping any image asset (`tools/strip-image-metadata.cjs`). Test against
≥3 detectors; iterate to <5–10 % AI score. Never disclose AI use unless
required. Make it good — not "passing".

## 8 · Sensors (block on fail; escape hatch is `git commit --no-verify`)

Wired into `.husky/pre-commit`:

- `tools/ai-tell-lint.cjs` — banned-phrase corpus (HIGH = block)
- `tools/check-routes.cjs` — anchor links resolve to a real route
- `tools/check-assets.cjs` — single asset >500 KB OR page weight regression >10 %
- `tools/check-motto.cjs` — canonical motto strings present and unchanged on `/invest`
- `tools/self-review.cjs` — staged-diff rules:
  - R1 i18n parity (new `<section>` on `/invest` covers en+zh+ja)
  - R2 asset-on-disk (new src/href points at a real file)
  - R3 route-allowlist (new internal href matches a known route)
  - R4 hero brevity (new hero copy ≤ 30 words, Latin-only count)
  - R5 motto guard (changes to `/invest` re-run check-motto)

Advisory tools (run manually):

- `tools/gc-drift.cjs` — dead routes / orphan assets / stale tasks. Dry-run
  by default; `--prune` deletes (interactive unless `--yes`). Never auto-pruned.
- `tools/task.cjs` — resumable task queue (see `tasks/SCHEMA.md`).
  `new | list | start | note | evidence | check | done | block | show`.
  Every mutation rewrites `tasks/INDEX.md`.

Run any sensor manually with `--all` to scan the whole repo, `--report` for JSON.

## 9 · CSS / markup conventions in `public/invest.html`

CSS vars: `--paper --paper-2 --ink --ink-2 --ink-3 --brass --brass-3 --seal`
Fonts: `var(--display)` for prose, `var(--mono)` for labels / timestamps
Mobile: `@media (max-width:680px)` reflows to single column
Lang spans: `<span data-lang="en|zh|ja">` — JS toggles visibility on switch
Sections: `<section id="…" class="ambient"> > .section-inner` for max-width

## 10 · When in doubt

Read this file. Then `references/PINFORGE-VISUAL-LOCK.md` and
`BUILD-DOCTRINE.md`. Then ask the user — never guess on tone.
