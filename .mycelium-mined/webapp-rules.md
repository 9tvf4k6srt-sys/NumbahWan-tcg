# Mycelium Mined Rules — webapp
> Generated 2026-02-12T11:27:34.492Z | 142 fix commits analyzed | v2.0

## Quick Stats
| Metric | Value |
|--------|-------|
| Fix commits analyzed | 142 |
| Recurring patterns | 20 |
| Singleton insights | 6 |
| Fix chains detected | 105 |
| Hotspot files | 50 |

## Bug Categories

- **css-layout** ███████ 49 (34.5%)
- **other** ███ 19 (13.4%)
- **null-reference** ██ 15 (10.6%)
- **i18n** ██ 11 (7.7%)
- **mobile-compat** █ 8 (5.6%)
- **load-order** █ 8 (5.6%)
- **logic-error** █ 7 (4.9%)
- **async-timing** █ 6 (4.2%)
- **error-handling** █ 5 (3.5%)
- **test-failure** █ 4 (2.8%)
- **build-config** █ 4 (2.8%)
- **api-contract** █ 4 (2.8%)
- **dom-mutation** █ 2 (1.4%)

## Prevention Rules

> Copy these into your CLAUDE.md, .cursor/rules, or CI checks

### MCL-WRONG-CSS-VALUE
**wrong-css-value** — 25 occurrences | low severity | css-layout

> CSS value changes should be tested at multiple screen sizes. Check for inherited properties and specificity conflicts.

Root cause: Changed height: 120px → 100%. Also: Changed background: linear-gradient(180deg,#ffcc70 0%,#ff9500 30%,#ff6b00 60%,#cc4400 100%) → radial-gradient(ellipse at 20% 20%,rgba(255,107,0,.2) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(255,157,77,.15) 0%,transparent 50%); Changed height: 100

Example commits:
- `652f3af` fix(ship): sync-back handles stash + CLAUDE.md documents ship as mandatory deplo (2026-02-09)
- `5111c6a` fix(ui): Move card counter to LEFT side - no more overlap (2026-02-06)
- `406af4d` fix(ui): Larger filter buttons and fix card counter overlap (2026-02-06)

---

### MCL-OVERFLOW-HIDDEN-CLIPS-CHILDREN
**overflow-hidden-clips-children** — 12 occurrences | high severity | css-layout

> overflow:hidden on a parent silently clips children that extend beyond bounds. Check all child elements before adding it.

Root cause: Added overflow:hidden — may clip child elements. Also: Changed cards: fill width with 4px gaps, minimum 64px */
--board-card-width: clamp(64px, calc((100vw - 40px) / 5), 80px) → compact to leave room for hand */
--board-card-width: clamp(56px, calc((100vw - 40px) / 5), 72px); Changed board-card-heig

Example commits:
- `46cec26` fix(battle): Mobile hand cards visibility + fix Illegal return statement (2026-02-08)
- `1c919aa` fix(battle): Fix mobile hand cards not visible — arena overflow + flex layout (2026-02-08)
- `420f4e6` fix(avatar-studio): Improve mobile touch interactions (2026-02-06)

---

### MCL-I18N-MISSING-TRANSLATION
**i18n-missing-translation** — 11 occurrences | medium severity | i18n

> feat(regression): 12 real regression tests targeting actual breakage patterns — caught and fixed digit-starting i18n key bug in index.html. RULE: Ensure all user-visible strings go through the translation system.

Root cause: feat(regression): 12 real regression tests targeting actual breakage patterns — caught and fixed digit-starting i18n key bug in index.html

Example commits:
- `4e6d427` fix: nuke buy-toast entirely — direct redirect to /buy.html, no popup (2026-02-11)
- `f71797d` fix(cleanup): remove Qing/卿 personalization, emoji animations, streak/achievemen (2026-02-11)
- `1998cc9` feat(regression): 12 real regression tests targeting actual breakage patterns —  (2026-02-09)

---

### MCL-MISSING-RESPONSIVE-BREAKPOINT
**missing-responsive-breakpoint** — 6 occurrences | medium severity | mobile-compat

> Test every UI change at 320px, 768px, and 1024px. Add @media breakpoints for layouts that break at different screen sizes.

Root cause: Added responsive breakpoint — was broken on different screen sizes. Also: Changed width: min(320px, 80vw) → min(340px, 85vw); Changed height: calc(min(320px, 80vw) * 1.4) → calc(min(340px, 85vw) * 1.4)

Example commits:
- `d6ae78e` feat(system): AGENT-CONTEXT.md + full audit fixes (2026-02-11)
- `f07a577` fix(rebrand): add kintsugi.html landing page + update memory to v2 KINTSUGI bran (2026-02-11)
- `e231b1a` Fix iOS mobile overlap on Profile Card (2026-02-04)

---

### MCL-MISSING-PRECONDITION-CHECK
**missing-precondition-check** — 6 occurrences | medium severity | null-reference

> Validate prerequisites before executing logic. Check that DOM elements exist, APIs are loaded, and data is present before using them.

Root cause: selfHeal gated at 10 commits, but squash workflow compresses 4-5→1,

Example commits:
- `40f1d81` fix(showcase): NaN scores, mobile charts 2x, fonts doubled, README rewrite for M (2026-02-09)
- `dd67dac` fix(automation): make learning system fully automatic — no manual heal/eval need (2026-02-09)
- `76de3af` fix(battle): Move deck building + hand dealing to START button click (2026-02-08)

---

### MCL-SCRIPT-ORDER-DEPENDENCY
**script-order-dependency** — 6 occurrences | high severity | load-order

> Scripts that call each other's globals must load in dependency order. Document the dependency chain in a comment.

Root cause: Reordered scripts: 6 removed, 2 added. Also: Added missing return statement — function was returning undefined; Added typeof !== undefined guard — variable was used before definition

Example commits:
- `3affe03` fix(battle): Auto-start game when overlay isn't visible on iOS (2026-02-08)
- `e25565d` fix(battle): Don't block init on Audio.init() - fixes iOS hand empty bug (2026-02-08)
- `a64bf8d` fix(battle): Add mobile debug overlay + cache busting v5.1 (2026-02-08)

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

### MCL-CSS-LAYOUT-ISSUE
**css-layout-issue** — 6 occurrences | medium severity | css-layout

> JS errors: add missing helper scripts and resolve currentLang redeclaration. RULE: Test layout at 320px, 768px, 1024px after CSS changes.

Root cause: JS errors: add missing helper scripts and resolve currentLang redeclaration

Example commits:
- `fad1a83` Fix: Regina (one g) in nav as guild ship (2026-02-02)
- `cc75d63` Fix JS errors: add missing helper scripts and resolve currentLang redeclaration (2026-02-02)
- `b59c97f` Fix: setupDevModeUI error, add GM mode event listeners for UI updates (2026-02-01)

---

### MCL-UNHANDLED-EXCEPTION
**unhandled-exception** — 5 occurrences | medium severity | error-handling

> Wrap external calls (DOM, fetch, JSON.parse, localStorage) in try-catch. Unhandled exceptions crash the entire function.

Root cause: Wrapped code in try-catch — was crashing on error. Also: Added storage access safety — was crashing on parse error or missing key; Wrapped code in try-catch — was crashing on error

Example commits:
- `d9865b5` feat(self-heal): auto-eval + auto-fix learning system on every snapshot (#10) (2026-02-09)
- `7db8899` fix: iOS language toggle on markets page - improved touch handling (2026-02-03)
- `0180614` 🔊 FIX: Audio for mobile iOS (2026-01-30)

---

### MCL-MISSING-RETURN-STATEMENT
**missing-return-statement** — 5 occurrences | high severity | logic-error

> Functions that compute values must return them. Missing return causes undefined results and silent failures.

Root cause: Added missing return statement — function was returning undefined. Also: Added missing return statement — function was returning undefined; Added missing return statement — function was returning undefined

Example commits:
- `d68c516` Fix Events page JS variable conflicts with i18n.js (2026-02-05)
- `776a675` Fix: GM mode persistence - call setupModeUI after wallet init, explicit GM check (2026-02-01)
- `4fed8b8` 🎴 FIX: Cards now show with REAL images (2026-01-30)

---

### MCL-TEST-ISSUE
**test-issue** — 4 occurrences | medium severity | test-failure

> make mycelium work on any repo — fix --init crash, strip NumbahWan refs, fix watch.cjs syntax errors, rename .nw-* to .mycelium-*, tested end-to-end o. RULE: Review carefully before committing.

Root cause: make mycelium work on any repo — fix --init crash, strip NumbahWan refs, fix watch.cjs syntax errors, rename .nw-* to .mycelium-*, tested end-to-end on fresh repo

Example commits:
- `f965e84` fix(portable): make mycelium work on any repo — fix --init crash, strip NumbahWa (2026-02-09)
- `847fe08` fix(honesty): record underselling breakage + add HONESTY GATE to CLAUDE.md — nev (2026-02-09)
- `adf49f1` fix(showcase): strip fake impact metrics (hours/money/pts saved) — replace with  (2026-02-09)

---

### MCL-API-CONTRACT-ISSUE
**api-contract-issue** — 4 occurrences | medium severity | api-contract

> card carousel to use cards-v2.json and correct image path. RULE: Validate API response shape before accessing fields.

Root cause: card carousel to use cards-v2.json and correct image path

Example commits:
- `397c332` fix: Update cards.json to use .webp extensions (2026-02-03)
- `dfa41bc` fix: Make live ticker actually tick every 2 seconds (2026-02-03)
- `7ab8500` Fix images: Download and convert to local webp files (2026-02-01)

---

### MCL-WRONG-ASSET-PATH
**wrong-asset-path** — 3 occurrences | low severity | build-config

> Use path constants or import for assets. Hardcoded paths break when files move or builds change output directories.

Root cause: Changed resource path. Also: Changed resource path; Changed resource path

Example commits:
- `101f657` FIX: Optimized currency icons + market page fixes (2026-02-04)
- `b46c0f1` fix: Convert all Zakum images to local WebP files (2026-01-31)
- `795e51b` Revert "Add splash screen: instant branded screen before loading (0 dependencies (2026-01-27)

---

### MCL-USE-BEFORE-DEFINE
**use-before-define** — 3 occurrences | high severity | null-reference

> Use typeof check before accessing globals that may not be loaded yet. This often indicates a load-order dependency.

Root cause: Added typeof !== undefined guard — variable was used before definition. Also: Added missing return statement — function was returning undefined; Added || [] fallback — was calling array method on undefined

Example commits:
- `ea47b53` FIX: Wallet ID loading + currency display (2026-02-04)
- `d349fac` Fix FAB visibility on museum/vault pages and add inline icons to all nw-ux.js pa (2026-02-01)
- `b4a4905` 🍎 FIX: iOS audio unlock - init on first touch (2026-01-30)

---

### MCL-OBJECT-FIT-CROPS-CONTENT
**object-fit-crops-content** — 3 occurrences | medium severity | css-layout

> object-fit:cover crops images to fill container. Use contain if the full image must be visible (e.g., card art, logos).

Root cause: Changed object-fit: cover → contain — image was being cropped. Also: Changed width: calc(100% - 16px) → calc(100% - 12px); Changed height: 180px → 200px

Example commits:
- `f2d6cea` fix: Show FULL card art - no cropping sword/feet (2026-02-03)
- `d48306d` fix: Show full card art without cropping (2026-02-03)
- `2fb6494` Fix: Show full image (object-fit: contain), add lightbox for full-screen view on (2026-01-27)

---

### MCL-MISSING-AWAIT
**missing-await** — 3 occurrences | high severity | async-timing

> Every async function call that returns data you use must be awaited. Missing await causes race conditions where code uses stale/undefined values.

Root cause: Added missing await — was ignoring promise result. Also: Added missing return statement — function was returning undefined; Added 2 optional chaining operator(s) — null reference fix

Example commits:
- `cd3cc0f` Fix llms.txt routing - add explicit route with correct content-type (2026-02-01)
- `cade89c` 🎴 FIX: Load all 108 cards from NW_CARDS (2026-01-30)
- `7c3c48b` Fix card loading - await NW_CARDS.init() before getAll() (2026-01-30)

---

### MCL-INNERHTML-DESTROYS-HANDLERS
**innerhtml-destroys-handlers** — 2 occurrences | high severity | dom-mutation

> innerHTML = ... destroys all event handlers on child elements. Use textContent for text-only updates, or insertAdjacentHTML/replaceWith to preserve siblings.

Root cause: Replaced innerHTML with textContent — XSS or handler-destruction fix. Also: Added missing return statement — function was returning undefined; Changed font-size: 14px">◆</span><span class="nw-val nwg" id="nwfNwg">0</span></div>' +
'<div class="nw-item"><span style="font-size:14px">●</span><span clas

Example commits:
- `8c0ab14` UX: Fix currency display and icon centering (2026-02-04)
- `dd10415` 🎴 SIMPLIFIED: Remove orange bar, add text label, fix tear animation (2026-01-30)

---

### MCL-DEFER-BEFORE-DEPENDENCY
**defer-before-dependency** — 2 occurrences | high severity | load-order

> Never use defer on scripts that other scripts depend on at load time. If script B calls script A's globals, A must load synchronously before B.

Root cause: Removed defer attribute from script tag. Also: Removed overflow:hidden to fix clipping

Example commits:
- `c7444a4` fix: 🖼️ Consolidate battle pages + cache-bust images (2026-02-03)
- `4e38faf` Fix: Serve main page from public/index.html instead of inline HTML (2026-01-28)

---

### MCL-MISSING-TOUCH-SUPPORT
**missing-touch-support** — 2 occurrences | medium severity | mobile-compat

> Desktop-only event handlers (click, hover) don't work on mobile. Always test touch interactions and add touch/pointer event handlers.

Root cause: Added touch event handling — broken on mobile. Also: Modified conditional logic; Added touch event handling — broken on mobile

Example commits:
- `16f314d` fix: Mobile touch events for AI Guide send button (2026-02-03)
- `a176bd1` 🎴 FIX: Season switching now works + unified nav system (2026-01-31)

---

### MCL-RACE-CONDITION-NEEDS-DELAY
**race-condition-needs-delay** — 2 occurrences | medium severity | async-timing

> If you need setTimeout to fix a bug, you have a race condition. Find the root cause (missing callback, wrong event, load order) instead of papering over it with delays.

Root cause: Added setTimeout(500ms) — timing/race condition fix. Also: Added setTimeout(300ms) — timing/race condition fix; Added string fallback — was showing undefined/null in UI

Example commits:
- `4fe42b0` Fix: Daily reward claim feedback - toast, disabled state, shake animation (2026-02-02)
- `6bf2e0c` 🔧 FIX: Card reveal animation - rename variable conflict + safety net (2026-01-30)

---

## One-Time Insights

> These happened once but had high-confidence diff analysis

- **missing-scroll-handling** (css-layout): Added scroll handling — content was not scrollable or jumping. Also: Changed z-index: 0 → -1; Added touch event handling
  → Long content needs scroll containers. Check overflow behavior when content grows beyond initial viewport.
- **incorrect-display-none** (css-layout): Changed display:none to visible — element was incorrectly hidden. Also: Changed height: 120px → 100%; Changed background
  → display:none removes elements from layout entirely. Use visibility:hidden or opacity:0 if the element's space should be 
- **missing-display-none** (css-layout): Added display:none — element was incorrectly visible. Also: Changed resource path; Added string fallback — was showing u
  → Elements visible when they shouldn't be — check initial state and conditional rendering logic.
- **wrong-timing-value** (async-timing): Changed timeout: 3500ms → 1200ms
  → Hardcoded timeout values break on slow devices. Prefer requestAnimationFrame, MutationObserver, or event-based triggers 
- **wrong-conditional-logic** (logic-error): Modified conditional logic
  → Changed conditional logic — verify all branches are correct and edge cases are handled.
- **string-concatenation-bug** (logic-error): Switched from string concat to template literal — concatenation bug
  → Use template literals instead of string concatenation. Concatenation bugs (missing spaces, wrong order) are harder to sp

## Hotspot Files (High Bug Density)

| File | Changes | Fixes | Fix Rate |
|------|---------|-------|----------|
| 🟢 src/index.tsx | 94 | 15 | 16% |
| 🟡 public/forge.html | 92 | 30 | 33% |
| 🟡 public/battle.html | 60 | 19 | 32% |
| 🟢 public/static/nw-nav.js | 54 | 10 | 19% |
| 🟢 public/index.html | 41 | 7 | 17% |
| 🟢 public/wallet.html | 40 | 7 | 18% |
| 🟡 public/cards.html | 39 | 12 | 31% |
| 🟡 public/static/data/sentinel-report.json | 37 | 9 | 24% |
| 🟡 public/static/data/sentinel-history.json | 35 | 9 | 26% |
| 🟢 public/merch.html | 26 | 3 | 12% |
| 🟢 public/collection.html | 24 | 3 | 13% |
| 🟢 public/static/data/showcase-live.json | 22 | 4 | 18% |
| 🟢 public/markets.html | 22 | 4 | 18% |
| 🟢 package.json | 21 | 1 | 5% |
| 🟢 public/wyckoff.html | 21 | 3 | 14% |
| 🟢 public/guide.html | 21 | 1 | 5% |
| 🟢 public/market.html | 20 | 1 | 5% |
| 🟢 public/pvp.html | 19 | 3 | 16% |
| 🟢 public/academy.html | 19 | 2 | 11% |
| 🟢 public/regina.html | 18 | 2 | 11% |

## Coupling Map (Files That Break Together)

- public/static/data/sentinel-history.json <-> public/static/data/sentinel-report.json — 22x co-changed
- .ai-files-auto.txt <-> src/index.tsx — 17x co-changed
- public/static/nw-nav.js <-> src/index.tsx — 15x co-changed
- public/battle.html <-> public/forge.html — 12x co-changed
- .ai-files-auto.txt <-> public/static/nw-nav.js — 11x co-changed
- .mycelium/eval.json <-> .mycelium/memory.json — 10x co-changed
- memory.json <-> public/static/data/sentinel-history.json — 10x co-changed
- memory.json <-> public/static/data/sentinel-report.json — 10x co-changed
- .ai-files-auto.txt <-> public/forge.html — 10x co-changed
- .ai-files-auto.txt <-> public/battle.html — 10x co-changed
- public/arcade.html <-> public/wallet.html — 10x co-changed
- public/arcade.html <-> public/forge.html — 9x co-changed
- public/battle.html <-> public/collection.html — 9x co-changed
- .mycelium/eval-history.json <-> .mycelium/eval.json — 8x co-changed
- .mycelium/eval-history.json <-> .mycelium/memory.json — 8x co-changed
