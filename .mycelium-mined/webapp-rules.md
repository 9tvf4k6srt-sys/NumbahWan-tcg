# Mycelium Mined Rules — webapp
> Generated 2026-07-05T09:05:11.296Z | 75 fix commits analyzed | v2.0

## Quick Stats
| Metric | Value |
|--------|-------|
| Fix commits analyzed | 75 |
| Recurring patterns | 12 |
| Singleton insights | 6 |
| Fix chains detected | 65 |
| Hotspot files | 50 |

## Bug Categories

- **css-layout** ██████ 21 (28%)
- **other** ████ 15 (20%)
- **logic-error** ██ 7 (9.3%)
- **i18n** ██ 6 (8%)
- **null-reference** ██ 6 (8%)
- **build-config** █ 4 (5.3%)
- **mobile-compat** █ 4 (5.3%)
- **test-failure** █ 4 (5.3%)
- **load-order** █ 3 (4%)
- **dom-mutation** █ 2 (2.7%)
- **api-contract** █ 1 (1.3%)
- **async-timing** █ 1 (1.3%)
- **error-handling** █ 1 (1.3%)

## Prevention Rules

> Copy these into your CLAUDE.md, .cursor/rules, or CI checks

### MCL-WRONG-CSS-VALUE
**wrong-css-value** — 13 occurrences | medium severity | css-layout

> CSS value changes should be tested at multiple screen sizes. Check for inherited properties and specificity conflicts.

Root cause: Changed height: 120px → 100%. Also: Changed background: linear-gradient(180deg,#ffcc70 0%,#ff9500 30%,#ff6b00 60%,#cc4400 100%) → radial-gradient(ellipse at 20% 20%,rgba(255,107,0,.2) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(255,157,77,.15) 0%,transparent 50%); Changed height: 100

Example commits:
- `6cb468d` fix(guild): music toggle was hidden behind the langbar — move to top-left (#102) (2026-06-04)
- `e713c39` fix(guild): rebuild join headline with real word spans + flex gaps (#86) (2026-06-03)
- `d7fbdad` fix(guild): keep ROSTER whole on mobile + mobile-first headline sizing (#85) (2026-06-03)

---

### MCL-MISSING-RETURN-STATEMENT
**missing-return-statement** — 6 occurrences | high severity | logic-error

> Functions that compute values must return them. Missing return causes undefined results and silent failures.

Root cause: Added missing return statement — function was returning undefined. Also: Added missing return statement — function was returning undefined

Example commits:
- `844a02a` refactor(cli): fix ANSI-leak bug + consolidate duplicated plumbing onto the shar (2026-06-19)
- `55149f7` fix(learning): rewire the self-improvement stack — live signals, trends→rules, a (2026-06-04)
- `a51a9be` fix(guild): remove dark island inside P + handle fused-island case in tooling (# (2026-06-03)

---

### MCL-I18N-MISSING-TRANSLATION
**i18n-missing-translation** — 6 occurrences | medium severity | i18n

> feat(regression): 12 real regression tests targeting actual breakage patterns — caught and fixed digit-starting i18n key bug in index.html. RULE: Ensure all user-visible strings go through the translation system.

Root cause: feat(regression): 12 real regression tests targeting actual breakage patterns — caught and fixed digit-starting i18n key bug in index.html

Example commits:
- `4e6d427` fix: nuke buy-toast entirely — direct redirect to /buy.html, no popup (2026-02-11)
- `f71797d` fix(cleanup): remove Qing/卿 personalization, emoji animations, streak/achievemen (2026-02-11)
- `1998cc9` feat(regression): 12 real regression tests targeting actual breakage patterns —  (2026-02-09)

---

### MCL-OVERFLOW-HIDDEN-CLIPS-CHILDREN
**overflow-hidden-clips-children** — 5 occurrences | high severity | css-layout

> overflow:hidden on a parent silently clips children that extend beyond bounds. Check all child elements before adding it.

Root cause: Added overflow:hidden — may clip child elements. Also: Changed cards: fill width with 4px gaps, minimum 64px */
--board-card-width: clamp(64px, calc((100vw - 40px) / 5), 80px) → compact to leave room for hand */
--board-card-width: clamp(56px, calc((100vw - 40px) / 5), 72px); Changed board-card-heig

Example commits:
- `8ed2bf0` fix(guild): zoom out the forest backgrounds on iOS + use ALL ambience art (#93) (2026-06-04)
- `90ee99e` fix(invest): merch-card mobile overlap — title/body no longer hidden behind phot (2026-05-01)
- `46cec26` fix(battle): Mobile hand cards visibility + fix Illegal return statement (2026-02-08)

---

### MCL-TEST-ISSUE
**test-issue** — 4 occurrences | high severity | test-failure

> make mycelium work on any repo — fix --init crash, strip NumbahWan refs, fix watch.cjs syntax errors, rename .nw-* to .mycelium-*, tested end-to-end o. RULE: Review carefully before committing.

Root cause: make mycelium work on any repo — fix --init crash, strip NumbahWan refs, fix watch.cjs syntax errors, rename .nw-* to .mycelium-*, tested end-to-end on fresh repo

Example commits:
- `0f389e8` fix: Scene 09 v9 — DARK skin for RegginA/RegginO + accurate R.M.S. Regina (2026-02-16)
- `f965e84` fix(portable): make mycelium work on any repo — fix --init crash, strip NumbahWa (2026-02-09)
- `847fe08` fix(honesty): record underselling breakage + add HONESTY GATE to CLAUDE.md — nev (2026-02-09)

---

### MCL-CSS-LAYOUT-ISSUE
**css-layout-issue** — 3 occurrences | medium severity | css-layout

> repair the silent heal loop — eval bridge, blame guard, recency-aware health. RULE: Test layout at 320px, 768px, 1024px after CSS changes.

Root cause: repair the silent heal loop — eval bridge, blame guard, recency-aware health

Example commits:
- `b8fb2d8` fix(learning): repair the silent heal loop — eval bridge, blame guard, recency-a (2026-06-10)
- `0e2c4f5` fix(invest/liveops): proportional ship speeds calibrated to photo geometry (2026-05-02)
- `5c306d2` fix(invest): remove ambient audio system + all corner watermark badges (2026-05-01)

---

### MCL-MISSING-RESPONSIVE-BREAKPOINT
**missing-responsive-breakpoint** — 3 occurrences | medium severity | mobile-compat

> Test every UI change at 320px, 768px, and 1024px. Add @media breakpoints for layouts that break at different screen sizes.

Root cause: Stats grid was overlapping on small screens due to fixed px positions

Example commits:
- `d6ae78e` feat(system): AGENT-CONTEXT.md + full audit fixes (2026-02-11)
- `f07a577` fix(rebrand): add kintsugi.html landing page + update memory to v2 KINTSUGI bran (2026-02-11)
- `e231b1a` Fix iOS mobile overlap on Profile Card (2026-02-04)

---

### MCL-MISSING-PRECONDITION-CHECK
**missing-precondition-check** — 3 occurrences | medium severity | null-reference

> Validate prerequisites before executing logic. Check that DOM elements exist, APIs are loaded, and data is present before using them.

Root cause: selfHeal gated at 10 commits, but squash workflow compresses 4-5→1,

Example commits:
- `40f1d81` fix(showcase): NaN scores, mobile charts 2x, fonts doubled, README rewrite for M (2026-02-09)
- `dd67dac` fix(automation): make learning system fully automatic — no manual heal/eval need (2026-02-09)
- `76de3af` fix(battle): Move deck building + hand dealing to START button click (2026-02-08)

---

### MCL-SCRIPT-ORDER-DEPENDENCY
**script-order-dependency** — 3 occurrences | high severity | load-order

> Scripts that call each other's globals must load in dependency order. Document the dependency chain in a comment.

Root cause: showed overlay never appears on iOS mobile — user goes straight to

Example commits:
- `3affe03` fix(battle): Auto-start game when overlay isn't visible on iOS (2026-02-08)
- `e25565d` fix(battle): Don't block init on Audio.init() - fixes iOS hand empty bug (2026-02-08)
- `a64bf8d` fix(battle): Add mobile debug overlay + cache busting v5.1 (2026-02-08)

---

### MCL-BUILD-CONFIG-ISSUE
**build-config-issue** — 2 occurrences | high severity | build-config

> make TSC-0-errors claim true (142 → 0) + add reproducible credibility audit. RULE: Verify build output matches expected file structure.

Root cause: make TSC-0-errors claim true (142 → 0) + add reproducible credibility audit

Example commits:
- `437379d` fix(build): make TSC-0-errors claim true (142 → 0) + add reproducible credibilit (2026-06-17)
- `b4c72a9` feat(pipeline): trailer production pipeline + iOS Safari cinematic fix (2026-02-14)

---

### MCL-WRONG-ASSET-PATH
**wrong-asset-path** — 2 occurrences | low severity | build-config

> Use path constants or import for assets. Hardcoded paths break when files move or builds change output directories.

Root cause: Changed resource path

Example commits:
- `c880eb9` revert(guild): switch page music back to the original anime OST (v1) (#105) (2026-06-04)
- `101f657` FIX: Optimized currency icons + market page fixes (2026-02-04)

---

### MCL-MISSING-NULL-GUARD
**missing-null-guard** — 2 occurrences | medium severity | null-reference

> Always use optional chaining (?.) when accessing properties on objects that may be undefined, especially DOM queries and API responses.

Root cause: Added 1 optional chaining operator(s) — null reference fix. Also: Added && guard — was executing without prerequisite check; Modified conditional logic

Example commits:
- `ec3364d` fix(cards): Fix language toggle not working (2026-02-06)
- `fcb8525` Fix merch.html: null element error crashing product grid render (2026-02-04)

---

## One-Time Insights

> These happened once but had high-confidence diff analysis

- **missing-touch-support** (mobile-compat): Added touch event handling — broken on mobile. Also: Changed pointer-events: none}
@keyframes loscan{0%,100%{top:8% → no
  → Desktop-only event handlers (click, hover) don't work on mobile. Always test touch interactions and add touch/pointer ev
- **innerhtml-destroys-handlers** (dom-mutation): Replaced innerHTML with textContent — XSS or handler-destruction fix. Also: Added missing return statement — function wa
  → innerHTML = ... destroys all event handlers on child elements. Use textContent for text-only updates, or insertAdjacentH
- **use-before-define** (null-reference): Added typeof !== undefined guard — variable was used before definition. Also: Added missing return statement — function 
  → Use typeof check before accessing globals that may not be loaded yet. This often indicates a load-order dependency.
- **inverted-boolean-logic** (logic-error): Tapping Rewatch showed a blank black screen on mobile because:
  → Double-check boolean conditions after writing them. Inverted logic is the most common and hardest-to-spot bug.
- **wrong-timing-value** (async-timing): Changed timeout: 3500ms → 1200ms
  → Hardcoded timeout values break on slow devices. Prefer requestAnimationFrame, MutationObserver, or event-based triggers 
- **unhandled-exception** (error-handling): Wrapped code in try-catch — was crashing on error
  → Wrap external calls (DOM, fetch, JSON.parse, localStorage) in try-catch. Unhandled exceptions crash the entire function.

## Hotspot Files (High Bug Density)

| File | Changes | Fixes | Fix Rate |
|------|---------|-------|----------|
| 🟡 public/static/data/sentinel-report.json | 46 | 10 | 22% |
| 🟡 public/static/data/sentinel-history.json | 45 | 10 | 22% |
| 🟢 public/invest.html | 39 | 5 | 13% |
| 🟢 package.json | 37 | 3 | 8% |
| 🟡 .mycelium/memory.json | 31 | 9 | 29% |
| 🟢 public/static/data/showcase-live.json | 29 | 4 | 14% |
| 🟢 public/static/nw-nav.js | 26 | 1 | 4% |
| 🟢 .gitignore | 23 | 2 | 9% |
| 🟢 public/merch.html | 21 | 3 | 14% |
| 🟡 CLAUDE.md | 20 | 6 | 30% |
| 🟢 bin/ai.cjs | 20 | 2 | 10% |
| 🟢 public/battle.html | 20 | 3 | 15% |
| 🟡 public/cards.html | 19 | 5 | 26% |
| 🟡 README.md | 18 | 6 | 33% |
| 🟡 public/guild/brightinside/index.html | 18 | 7 | 39% |
| 🟢 public/index.html | 18 | 3 | 17% |
| 🟢 public/wyckoff.html | 18 | 1 | 6% |
| 🟢 public/embassy.html | 16 | 1 | 6% |
| 🟢 public/events.html | 16 | 2 | 13% |
| 🟢 public/wallet.html | 16 | 1 | 6% |

## Coupling Map (Files That Break Together)

- public/static/data/sentinel-history.json <-> public/static/data/sentinel-report.json — 23x co-changed
- pipeline/keyframes/keyframe-manifest.json <-> pipeline/keyframes/review.html — 10x co-changed
- .mycelium/eval.json <-> .mycelium/memory.json — 10x co-changed
- memory.json <-> public/static/data/sentinel-history.json — 10x co-changed
- memory.json <-> public/static/data/sentinel-report.json — 10x co-changed
- public/static/data/sentinel-history.json <-> public/static/data/showcase-live.json — 8x co-changed
- .mycelium/eval-history.json <-> .mycelium/eval.json — 8x co-changed
- .mycelium/eval-history.json <-> .mycelium/memory.json — 8x co-changed
- bin/ai.cjs <-> package.json — 7x co-changed
- EFFICIENCY.md <-> bin/ai.cjs — 7x co-changed
- public/guild/brightinside/assets/paradox-emblem.webp <-> public/guild/brightinside/assets/paradox-lockup.webp — 7x co-changed
- public/static/data/sentinel-report.json <-> public/static/data/showcase-live.json — 7x co-changed
- .mycelium/eval.json <-> public/static/data/showcase-live.json — 7x co-changed
- .mycelium/memory.json <-> public/static/data/showcase-live.json — 7x co-changed
- public/static/data/showcase-live.json <-> scripts/generate-showcase-data.cjs — 7x co-changed
