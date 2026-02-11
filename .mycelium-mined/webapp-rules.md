# Mycelium Mined Rules — webapp
> Generated 2026-02-10T16:09:34.235Z | 81 fix commits analyzed | v2.0

## Quick Stats
| Metric | Value |
|--------|-------|
| Fix commits analyzed | 81 |
| Recurring patterns | 14 |
| Singleton insights | 9 |
| Fix chains detected | 51 |
| Hotspot files | 50 |

## Bug Categories

- **css-layout** █████ 22 (27.2%)
- **null-reference** ███ 13 (16%)
- **other** ███ 12 (14.8%)
- **i18n** ██ 9 (11.1%)
- **load-order** █ 5 (6.2%)
- **mobile-compat** █ 4 (4.9%)
- **test-failure** █ 3 (3.7%)
- **logic-error** █ 3 (3.7%)
- **api-contract** █ 3 (3.7%)
- **error-handling** █ 2 (2.5%)
- **build-config** █ 2 (2.5%)
- **async-timing** █ 2 (2.5%)
- **dom-mutation** █ 1 (1.2%)

## Prevention Rules

> Copy these into your CLAUDE.md, .cursor/rules, or CI checks

### MCL-I18N-MISSING-TRANSLATION
**i18n-missing-translation** — 9 occurrences | medium severity | i18n

> feat(regression): 12 real regression tests targeting actual breakage patterns — caught and fixed digit-starting i18n key bug in index.html. RULE: Ensure all user-visible strings go through the translation system.

Root cause: feat(regression): 12 real regression tests targeting actual breakage patterns — caught and fixed digit-starting i18n key bug in index.html

Example commits:
- `1998cc9` feat(regression): 12 real regression tests targeting actual breakage patterns —  (2026-02-09)
- `98b541b` feat(sentinel): Upgrade to v2.5 — 10-module health platform with trend tracking  (2026-02-07)
- `a3046c0` Fix: use data-i18n-html for HTML content in wyckoff intro (2026-02-05)

---

### MCL-WRONG-CSS-VALUE
**wrong-css-value** — 9 occurrences | low severity | css-layout

> CSS value changes should be tested at multiple screen sizes. Check for inherited properties and specificity conflicts.

Root cause: Changed height: 120px → 100%. Also: Changed background: linear-gradient(180deg,#ffcc70 0%,#ff9500 30%,#ff6b00 60%,#cc4400 100%) → radial-gradient(ellipse at 20% 20%,rgba(255,107,0,.2) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(255,157,77,.15) 0%,transparent 50%); Changed height: 100

Example commits:
- `652f3af` fix(ship): sync-back handles stash + CLAUDE.md documents ship as mandatory deplo (2026-02-09)
- `5111c6a` fix(ui): Move card counter to LEFT side - no more overlap (2026-02-06)
- `406af4d` fix(ui): Larger filter buttons and fix card counter overlap (2026-02-06)

---

### MCL-OVERFLOW-HIDDEN-CLIPS-CHILDREN
**overflow-hidden-clips-children** — 6 occurrences | high severity | css-layout

> overflow:hidden on a parent silently clips children that extend beyond bounds. Check all child elements before adding it.

Root cause: Added overflow:hidden — may clip child elements. Also: Changed cards: fill width with 4px gaps, minimum 64px */
--board-card-width: clamp(64px, calc((100vw - 40px) / 5), 80px) → compact to leave room for hand */
--board-card-width: clamp(56px, calc((100vw - 40px) / 5), 72px); Changed board-card-heig

Example commits:
- `46cec26` fix(battle): Mobile hand cards visibility + fix Illegal return statement (2026-02-08)
- `1c919aa` fix(battle): Fix mobile hand cards not visible — arena overflow + flex layout (2026-02-08)
- `420f4e6` fix(avatar-studio): Improve mobile touch interactions (2026-02-06)

---

### MCL-MISSING-NULL-GUARD
**missing-null-guard** — 6 occurrences | medium severity | null-reference

> Check for null/undefined before accessing properties. Common sources: DOM queries returning null, missing API fields, uninitialized state.

Root cause: Added 1 optional chaining operator(s) — null reference fix. Also: Added && guard — was executing without prerequisite check; Modified conditional logic

Example commits:
- `ec3364d` fix(cards): Fix language toggle not working (2026-02-06)
- `fcb8525` Fix merch.html: null element error crashing product grid render (2026-02-04)
- `019988e` fix: Use unified nw-nav i18n system for Wyckoff page (2026-02-03)

---

### MCL-MISSING-PRECONDITION-CHECK
**missing-precondition-check** — 5 occurrences | medium severity | null-reference

> Validate prerequisites before executing logic. Check that DOM elements exist, APIs are loaded, and data is present before using them.

Root cause: selfHeal gated at 10 commits, but squash workflow compresses 4-5→1,

Example commits:
- `40f1d81` fix(showcase): NaN scores, mobile charts 2x, fonts doubled, README rewrite for M (2026-02-09)
- `dd67dac` fix(automation): make learning system fully automatic — no manual heal/eval need (2026-02-09)
- `76de3af` fix(battle): Move deck building + hand dealing to START button click (2026-02-08)

---

### MCL-SCRIPT-ORDER-DEPENDENCY
**script-order-dependency** — 4 occurrences | high severity | load-order

> Scripts that call each other's globals must load in dependency order. Document the dependency chain in a comment.

Root cause: showed overlay never appears on iOS mobile — user goes straight to

Example commits:
- `3affe03` fix(battle): Auto-start game when overlay isn't visible on iOS (2026-02-08)
- `e25565d` fix(battle): Don't block init on Audio.init() - fixes iOS hand empty bug (2026-02-08)
- `a64bf8d` fix(battle): Add mobile debug overlay + cache busting v5.1 (2026-02-08)

---

### MCL-TEST-ISSUE
**test-issue** — 3 occurrences | critical severity | test-failure

> make mycelium work on any repo — fix --init crash, strip NumbahWan refs, fix watch.cjs syntax errors, rename .nw-* to .mycelium-*, tested end-to-end o. RULE: Review carefully before committing.

Root cause: make mycelium work on any repo — fix --init crash, strip NumbahWan refs, fix watch.cjs syntax errors, rename .nw-* to .mycelium-*, tested end-to-end on fresh repo

Example commits:
- `f965e84` fix(portable): make mycelium work on any repo — fix --init crash, strip NumbahWa (2026-02-09)
- `847fe08` fix(honesty): record underselling breakage + add HONESTY GATE to CLAUDE.md — nev (2026-02-09)
- `adf49f1` fix(showcase): strip fake impact metrics (hours/money/pts saved) — replace with  (2026-02-09)

---

### MCL-MISSING-RESPONSIVE-BREAKPOINT
**missing-responsive-breakpoint** — 3 occurrences | medium severity | mobile-compat

> Test every UI change at 320px, 768px, and 1024px. Add @media breakpoints for layouts that break at different screen sizes.

Root cause: Added responsive breakpoint — was broken on different screen sizes. Also: Added scroll handling — content was not scrollable or jumping; Added scroll handling — content was not scrollable or jumping

Example commits:
- `e231b1a` Fix iOS mobile overlap on Profile Card (2026-02-04)
- `d8f5715` Fix UX: Remove blocking back buttons, add NW_NAV integration, improve scroll beh (2026-02-02)
- `0efeaa3` Fix mobile layout - horizontal scroll watchlist, proper sizing (2026-02-01)

---

### MCL-API-CONTRACT-ISSUE
**api-contract-issue** — 3 occurrences | medium severity | api-contract

> images: Download and convert to local webp files. RULE: Validate API response shape before accessing fields.

Root cause: images: Download and convert to local webp files

Example commits:
- `397c332` fix: Update cards.json to use .webp extensions (2026-02-03)
- `dfa41bc` fix: Make live ticker actually tick every 2 seconds (2026-02-03)
- `7ab8500` Fix images: Download and convert to local webp files (2026-02-01)

---

### MCL-CSS-LAYOUT-ISSUE
**css-layout-issue** — 3 occurrences | medium severity | css-layout

> JS errors: add missing helper scripts and resolve currentLang redeclaration. RULE: Test layout at 320px, 768px, 1024px after CSS changes.

Root cause: JS errors: add missing helper scripts and resolve currentLang redeclaration

Example commits:
- `fad1a83` Fix: Regina (one g) in nav as guild ship (2026-02-02)
- `cc75d63` Fix JS errors: add missing helper scripts and resolve currentLang redeclaration (2026-02-02)
- `b59c97f` Fix: setupDevModeUI error, add GM mode event listeners for UI updates (2026-02-01)

---

### MCL-UNHANDLED-EXCEPTION
**unhandled-exception** — 2 occurrences | medium severity | error-handling

> Wrap external calls (DOM, fetch, JSON.parse, localStorage) in try-catch. Unhandled exceptions crash the entire function.

Root cause: Wrapped code in try-catch — was crashing on error. Also: Added storage access safety — was crashing on parse error or missing key; Wrapped code in try-catch — was crashing on error

Example commits:
- `d9865b5` feat(self-heal): auto-eval + auto-fix learning system on every snapshot (#10) (2026-02-09)
- `7db8899` fix: iOS language toggle on markets page - improved touch handling (2026-02-03)

---

### MCL-MISSING-RETURN-STATEMENT
**missing-return-statement** — 2 occurrences | high severity | logic-error

> Functions that compute values must return them. Missing return causes undefined results and silent failures.

Root cause: Added missing return statement — function was returning undefined

Example commits:
- `d68c516` Fix Events page JS variable conflicts with i18n.js (2026-02-05)
- `776a675` Fix: GM mode persistence - call setupModeUI after wallet init, explicit GM check (2026-02-01)

---

### MCL-USE-BEFORE-DEFINE
**use-before-define** — 2 occurrences | high severity | null-reference

> Use typeof check before accessing globals that may not be loaded yet. This often indicates a load-order dependency.

Root cause: Added typeof !== undefined guard — variable was used before definition. Also: Added missing return statement — function was returning undefined; Added || [] fallback — was calling array method on undefined

Example commits:
- `ea47b53` FIX: Wallet ID loading + currency display (2026-02-04)
- `d349fac` Fix FAB visibility on museum/vault pages and add inline icons to all nw-ux.js pa (2026-02-01)

---

### MCL-OBJECT-FIT-CROPS-CONTENT
**object-fit-crops-content** — 2 occurrences | high severity | css-layout

> object-fit:cover crops images to fill container. Use contain if the full image must be visible (e.g., card art, logos).

Root cause: Changed object-fit: cover → contain — image was being cropped. Also: Changed width: calc(100% - 16px) → calc(100% - 12px); Changed height: 180px → 200px

Example commits:
- `f2d6cea` fix: Show FULL card art - no cropping sword/feet (2026-02-03)
- `d48306d` fix: Show full card art without cropping (2026-02-03)

---

## One-Time Insights

> These happened once but had high-confidence diff analysis

- **innerhtml-destroys-handlers** (dom-mutation): Replaced innerHTML with textContent — XSS or handler-destruction fix. Also: Added missing return statement — function wa
  → innerHTML = ... destroys all event handlers on child elements. Use textContent for text-only updates, or insertAdjacentH
- **missing-scroll-handling** (css-layout): Added scroll handling — content was not scrollable or jumping. Also: Changed z-index: 0 → -1; Added touch event handling
  → Long content needs scroll containers. Check overflow behavior when content grows beyond initial viewport.
- **incorrect-display-none** (css-layout): Changed display:none to visible — element was incorrectly hidden. Also: Changed height: 120px → 100%; Changed background
  → display:none removes elements from layout entirely. Use visibility:hidden or opacity:0 if the element's space should be 
- **missing-await** (async-timing): Added missing await — was ignoring promise result. Also: Added missing return statement — function was returning undefin
  → Every async function call that returns data you use must be awaited. Missing await causes race conditions where code use
- **defer-before-dependency** (load-order): logging added
  → Never use defer on scripts that other scripts depend on at load time. If script B calls script A's globals, A must load 
- **missing-touch-support** (mobile-compat): Added touch event handling — broken on mobile. Also: Modified conditional logic; Added touch event handling — broken on 
  → Desktop-only event handlers (click, hover) don't work on mobile. Always test touch interactions and add touch/pointer ev
- **race-condition-needs-delay** (async-timing): Added setTimeout(500ms) — timing/race condition fix. Also: Added setTimeout(300ms) — timing/race condition fix; Added st
  → If you need setTimeout to fix a bug, you have a race condition. Find the root cause (missing callback, wrong event, load
- **wrong-asset-path** (build-config): Changed resource path
  → Use path constants or import for assets. Hardcoded paths break when files move or builds change output directories.
- **wrong-conditional-logic** (logic-error): Modified conditional logic
  → Changed conditional logic — verify all branches are correct and edge cases are handled.

## Hotspot Files (High Bug Density)

| File | Changes | Fixes | Fix Rate |
|------|---------|-------|----------|
| 🟡 .ai-files-auto.txt | 68 | 20 | 29% |
| 🟢 src/index.tsx | 52 | 2 | 4% |
| 🟢 public/static/nw-nav.js | 44 | 8 | 18% |
| 🟡 public/static/data/sentinel-report.json | 33 | 9 | 27% |
| 🟢 public/wallet.html | 32 | 6 | 19% |
| 🟡 public/static/data/sentinel-history.json | 31 | 9 | 29% |
| 🟡 public/battle.html | 29 | 8 | 28% |
| 🟢 public/forge.html | 26 | 5 | 19% |
| 🟡 public/index.html | 25 | 7 | 28% |
| 🟢 memory.json | 21 | 3 | 14% |
| 🟡 public/cards.html | 21 | 8 | 38% |
| 🟢 public/merch.html | 21 | 3 | 14% |
| 🟡 public/markets.html | 20 | 4 | 20% |
| 🟡 public/static/data/showcase-live.json | 19 | 4 | 21% |
| 🟢 public/collection.html | 18 | 1 | 6% |
| 🟢 public/wyckoff.html | 18 | 3 | 17% |
| 🟡 public/static/nw-guide.js | 18 | 5 | 28% |
| 🟢 public/academy.html | 17 | 2 | 12% |
| 🟢 .ai-context.md | 16 | 2 | 13% |
| 🟢 public/market.html | 14 | 1 | 7% |

## Coupling Map (Files That Break Together)

- public/static/data/sentinel-history.json <-> public/static/data/sentinel-report.json — 22x co-changed
- public/static/nw-nav.js <-> src/index.tsx — 15x co-changed
- .ai-files-auto.txt <-> src/index.tsx — 15x co-changed
- .mycelium/eval.json <-> .mycelium/memory.json — 10x co-changed
- memory.json <-> public/static/data/sentinel-history.json — 10x co-changed
- memory.json <-> public/static/data/sentinel-report.json — 10x co-changed
- public/arcade.html <-> public/forge.html — 9x co-changed
- .ai-files-auto.txt <-> public/static/nw-nav.js — 9x co-changed
- .mycelium/eval-history.json <-> .mycelium/eval.json — 8x co-changed
- .mycelium/eval-history.json <-> .mycelium/memory.json — 8x co-changed
- public/arcade.html <-> public/wallet.html — 8x co-changed
- public/static/data/sentinel-history.json <-> public/static/data/showcase-live.json — 7x co-changed
- .mycelium/eval.json <-> public/static/data/showcase-live.json — 7x co-changed
- .mycelium/memory.json <-> public/static/data/showcase-live.json — 7x co-changed
- public/static/data/showcase-live.json <-> scripts/generate-showcase-data.cjs — 7x co-changed
