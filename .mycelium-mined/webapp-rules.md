# Mycelium Mined Rules — webapp
> Generated 2026-06-02T11:32:11.378Z | 192 fix commits analyzed | v2.0

## Quick Stats
| Metric | Value |
|--------|-------|
| Fix commits analyzed | 192 |
| Recurring patterns | 12 |
| Singleton insights | 20 |
| Fix chains detected | 152 |
| Hotspot files | 50 |

## Bug Categories

- **css-layout** █████ 46 (24%)
- **logic-error** ███ 30 (15.6%)
- **mobile-compat** ██ 20 (10.4%)
- **null-reference** ██ 16 (8.3%)
- **load-order** █ 14 (7.3%)
- **api-contract** █ 13 (6.8%)
- **other** █ 10 (5.2%)
- **state-management** █ 8 (4.2%)
- **async-timing** █ 7 (3.6%)
- **build-config** █ 6 (3.1%)
- **dom-mutation** █ 6 (3.1%)
- **i18n** █ 6 (3.1%)
- **error-handling** █ 6 (3.1%)
- **performance** █ 3 (1.6%)
- **dependency** █ 1 (0.5%)

## Prevention Rules

> Copy these into your CLAUDE.md, .cursor/rules, or CI checks

### MCL-MISSING-RETURN-STATEMENT
**missing-return-statement** — 8 occurrences | high severity | logic-error

> Functions that compute values must return them. Missing return causes undefined results and silent failures.

Root cause: Added missing return statement — function was returning undefined. Also: Added missing return statement — function was returning undefined; Added missing return statement — function was returning undefined

Example commits:
- `69ea462` fix(cinematic): rewatch button dead on returning visitors (2026-02-14)
- `d68c516` Fix Events page JS variable conflicts with i18n.js (2026-02-05)
- `776a675` Fix: GM mode persistence - call setupModeUI after wallet init, explicit GM check (2026-02-01)

---

### MCL-OVERFLOW-HIDDEN-CLIPS-CHILDREN
**overflow-hidden-clips-children** — 8 occurrences | high severity | css-layout

> Always test badge/tooltip overflow behavior with multiple languages and text lengths; use overflow: visible or clip-path for UI elements that must display content outside their container bounds.

Root cause: CSS overflow: hidden property clipped the badge content, displaying only partial text ('ewBadge' instead of 'NEW!' or 'ใหม่!'), and language changes weren't synchronized because the guide didn't listen to language-change events from the navigation component.

Example commits:
- `1c919aa` fix(battle): Fix mobile hand cards not visible — arena overflow + flex layout (2026-02-08)
- `420f4e6` fix(avatar-studio): Improve mobile touch interactions (2026-02-06)
- `07b672d` Fix guide badge clipping: overflow visible, sync language with nav (2026-02-02)

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

### MCL-WRONG-CSS-VALUE
**wrong-css-value** — 5 occurrences | low severity | css-layout

> CSS value changes should be tested at multiple screen sizes. Check for inherited properties and specificity conflicts.

Root cause: Changed font-size: clamp(24px, 6vw, 36px) → clamp(14px, 4vw, 20px). Also: Changed padding: 8px 14px → 5px 10px; Changed font-size: clamp(24px, 6vw, 36px) → 16px

Example commits:
- `5e4bd80` fix(cinematic): iOS Safari rewatch — overlay invisible, page content bleeds thro (2026-02-14)
- `4e5dd99` fix(ui): Moderate font size increase without overlapping (2026-02-06)
- `3f7fdbb` 🎴 FIX: Pack body = Card size, Seal is EXTRA on top (2026-01-30)

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

### MCL-SCRIPT-ORDER-DEPENDENCY
**script-order-dependency** — 5 occurrences | high severity | load-order

> Scripts that call each other's globals must load in dependency order. Document the dependency chain in a comment.

Root cause: Reordered scripts: 6 removed, 2 added. Also: Added missing return statement — function was returning undefined; Added typeof !== undefined guard — variable was used before definition

Example commits:
- `3affe03` fix(battle): Auto-start game when overlay isn't visible on iOS (2026-02-08)
- `e25565d` fix(battle): Don't block init on Audio.init() - fixes iOS hand empty bug (2026-02-08)
- `a64bf8d` fix(battle): Add mobile debug overlay + cache busting v5.1 (2026-02-08)

---

### MCL-MISSING-RESPONSIVE-BREAKPOINT
**missing-responsive-breakpoint** — 4 occurrences | medium severity | mobile-compat

> Test every UI change at 320px, 768px, and 1024px. Add @media breakpoints for layouts that break at different screen sizes.

Root cause: Added responsive breakpoint — was broken on different screen sizes. Also: Added scroll handling — content was not scrollable or jumping; Added scroll handling — content was not scrollable or jumping

Example commits:
- `d6ae78e` feat(system): AGENT-CONTEXT.md + full audit fixes (2026-02-11)
- `f07a577` fix(rebrand): add kintsugi.html landing page + update memory to v2 KINTSUGI bran (2026-02-11)
- `e231b1a` Fix iOS mobile overlap on Profile Card (2026-02-04)

---

### MCL-MISSING-NULL-GUARD
**missing-null-guard** — 4 occurrences | medium severity | null-reference

> Check for null/undefined before accessing properties. Common sources: DOM queries returning null, missing API fields, uninitialized state.

Root cause: Added 1 optional chaining operator(s) — null reference fix. Also: Added && guard — was executing without prerequisite check; Modified conditional logic

Example commits:
- `ec3364d` fix(cards): Fix language toggle not working (2026-02-06)
- `fcb8525` Fix merch.html: null element error crashing product grid render (2026-02-04)
- `019988e` fix: Use unified nw-nav i18n system for Wyckoff page (2026-02-03)

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

### MCL-USE-BEFORE-DEFINE
**use-before-define** — 2 occurrences | high severity | null-reference

> Use typeof check before accessing globals that may not be loaded yet. This often indicates a load-order dependency.

Root cause: Added typeof !== undefined guard — variable was used before definition. Also: Added missing return statement — function was returning undefined; Added || [] fallback — was calling array method on undefined

Example commits:
- `ea47b53` FIX: Wallet ID loading + currency display (2026-02-04)
- `d349fac` Fix FAB visibility on museum/vault pages and add inline icons to all nw-ux.js pa (2026-02-01)

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

- **animation-cadence-mismatch-with-data-source** (performance): Animation timing constants were unrealistic for live operational data display, causing UI ticker rotations to update fas
  → Validate animation intervals against real-world data source refresh rates and document the physical constraint (e.g., sa
- **fixed-overlay-eats-touch-events** (mobile-compat): Fixed overlay with pointer-events:auto captured all touch events before reaching interactive buttons below it, making sk
  → Set pointer-events:none on fixed overlays and use invisible tap-target layers above content to intercept only necessary 
- **greedy-flex-overflow-mobile** (mobile-compat): Board rows used flex:1 (greedy) causing hand cards to be pushed below viewport on mobile devices, making them invisible 
  → Use fixed flex basis (flex:0 0 auto) for constrained containers on mobile, and test viewport overflow with actual device
- **centered-element-overlap-collision** (css-layout): Card counter positioned at center with translateX(-50%) overlapped centered filter buttons on all screen sizes, requirin
  → Use CSS grid or flexbox with explicit layout zones (left/center/right) instead of absolute centering with transform to p
- **fixed-position-overlap-insufficient-spacing** (css-layout): Card counter and filter buttons overlapped due to insufficient vertical spacing; counter positioned at bottom: 160px whi
  → Maintain a spacing buffer between fixed-position elements and document their z-index hierarchy; use CSS custom propertie
- **missing-animation-keyframes** (logic-error): Loading screen animations were removed, causing static visual feedback during page load instead of animated indicators t
  → Maintain a test checklist for visual feedback elements and verify all keyframe animations are present in production buil
- **hide-with-display-none-instead-of-remove** (css-layout): Removing rarity gem styling with `display: none !important` while keeping HTML elements in DOM causes unnecessary DOM bl
  → Remove unused HTML elements and CSS rules entirely rather than hiding them with display:none; audit DOM for dead code du
- **object-fit-crops-content** (css-layout): Card images were using object-fit: cover which cropped
  → object-fit:cover crops images to fill container. Use contain if the full image must be visible (e.g., card art, logos).
- **object-fit-cover-crops-content** (css-layout): Card art images were being cropped with object-fit: cover, hiding portions of the full artwork that should be visible in
  → Use object-fit: contain for images that must display completely, and reserve object-fit: cover only when intentional cro
- **unresponsive-grid-layout** (mobile-compat): Mobile viewport layout was cramped with 5-column grid causing poor UX; fixed by reducing to 2-column responsive grid wit
  → Test all layouts at mobile breakpoints (320px, 375px, 768px) before deployment and enforce minimum tap target size of 44
- **missing-touch-handlers-ios-scroll-blocking** (mobile-compat): Mobile touch events were not properly handled due to missing touchend event listeners, overflow constraints prevented sc
  → Always add touchend event listeners alongside click handlers for mobile, use overflow-y: auto with -webkit-overflow-scro
- **fixed-position-overlap-undetected** (css-layout): Fixed Floating Action Button (FAB) positioning that was blocking the currency bar by moving it from right to left side a
  → Test fixed-position UI elements against all page regions during development to detect unintended overlaps with other fix
- **sync-script-before-deferred-deps** (load-order): Wallet page script dependency loaded without defer attribute before other deferred scripts, causing potential race condi
  → Always use defer attribute on all script tags or ensure synchronous scripts have no dependencies on deferred scripts and
- **fixed-height-clips-scrollable-content** (mobile-compat): Mobile layout used fixed max-height constraints on watchlist panel causing horizontal scroll content to be clipped and i
  → Use overflow-x: auto with flex layout and remove max-height constraints on containers that need horizontal scrolling on 
- **animation-removal-reduces-ux** (performance): Removing CSS animations from loader elements reduced visual feedback during page load, potentially causing perceived per
  → Measure actual FPS impact with animations enabled before removing visual feedback; consider animation-timing-function op
- **undefined-function-call-after-refactor** (null-reference): Function name mismatch: battle.html called setupStartButton() which no longer exists, should call initStartScreen() inst
  → Use IDE refactoring tools to rename functions across all files, or add compile-time checks to catch undefined function r
- **external-url-dependency-fragility** (api-contract): External image URLs from genspark.ai became unreliable, causing broken image displays and dependency on third-party serv
  → Always self-host critical assets and avoid external CDN/API dependencies for content delivery; use local static files fo
- **missing-state-sync-on-tab-switch** (state-management): Season 2 cards array was not updated when switching seasons, causing cards to fail to render for the new season tab
  → Implement state synchronization tests that verify data arrays update when UI tabs/filters change, and validate all depen
- **audio-context-suspend-on-ios** (mobile-compat): iOS audio context requires initialization during a user gesture, but the previous implementation only called initForgeAu
  → Always resume AudioContext during user interaction handlers on mobile platforms, and verify context state before attempt
- **visual-design-refactor-without-fallback** (css-layout): CSS styling for pack visual design was completely replaced with image-based approach, removing gradient backgrounds and 
  → Maintain backward-compatible CSS fallbacks when replacing visual designs, and verify all dependent selectors and animati

## Hotspot Files (High Bug Density)

| File | Changes | Fixes | Fix Rate |
|------|---------|-------|----------|
| 🟡 src/index.tsx | 160 | 39 | 24% |
| 🟡 public/forge.html | 93 | 30 | 32% |
| 🟡 public/battle.html | 61 | 19 | 31% |
| 🟢 public/static/nw-nav.js | 59 | 10 | 17% |
| 🟢 public/invest.html | 44 | 5 | 11% |
| 🟡 public/static/data/sentinel-report.json | 44 | 9 | 21% |
| 🟡 public/static/data/sentinel-history.json | 43 | 9 | 21% |
| 🟢 public/index.html | 43 | 7 | 16% |
| 🟢 public/wallet.html | 41 | 7 | 17% |
| 🟡 public/cards.html | 40 | 12 | 30% |
| 🟢 public/merch.html | 38 | 4 | 11% |
| 🟢 public/pvp.html | 35 | 3 | 9% |
| 🟢 package.json | 32 | 1 | 3% |
| 🟢 public/regina.html | 32 | 3 | 9% |
| 🟢 public/static/data/showcase-live.json | 28 | 4 | 14% |
| 🟢 public/fashion.html | 27 | 2 | 7% |
| 🟢 public/fortune.html | 27 | 2 | 7% |
| 🟢 public/collection.html | 25 | 3 | 12% |
| 🟡 README.md | 23 | 5 | 22% |
| 🟢 public/markets.html | 23 | 4 | 17% |

## Coupling Map (Files That Break Together)

- public/static/data/sentinel-history.json <-> public/static/data/sentinel-report.json — 23x co-changed
- .ai-files-auto.txt <-> src/index.tsx — 17x co-changed
- public/static/nw-nav.js <-> src/index.tsx — 15x co-changed
- public/battle.html <-> public/forge.html — 12x co-changed
- .ai-files-auto.txt <-> public/static/nw-nav.js — 11x co-changed
- pipeline/keyframes/keyframe-manifest.json <-> pipeline/keyframes/review.html — 10x co-changed
- .mycelium/eval.json <-> .mycelium/memory.json — 10x co-changed
- memory.json <-> public/static/data/sentinel-history.json — 10x co-changed
- memory.json <-> public/static/data/sentinel-report.json — 10x co-changed
- .ai-files-auto.txt <-> public/forge.html — 10x co-changed
- public/fashion.html <-> public/merch.html — 10x co-changed
- .ai-files-auto.txt <-> public/battle.html — 10x co-changed
- public/arcade.html <-> public/wallet.html — 10x co-changed
- public/fortune.html <-> public/merch.html — 10x co-changed
- public/pvp.html <-> src/index.tsx — 10x co-changed
