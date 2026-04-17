# AI_PLAYBOOK.md — Build Fast. Build Right. One Read.

> **If you are an AI agent working on this repo, read ONLY this file first.**
> It replaces: `docs/AI-*.md` (7 files), `PROJECT.md`, and most of `README.md`.
> Those files are kept for archival — they all point back here now.
> Companion files (short, focused): `AGENT-CONTEXT.md` (brand rules) and `CLAUDE.md` (session protocol).

**Last refactored**: 2026-04-17 · **Audit**: [`AUDIT-2026-04.md`](./AUDIT-2026-04.md)

---

## 1. The 30-Second Brief

| | |
|---|---|
| **Project** | NumbahWan TCG — Trading Card Game + Guild Warfare |
| **Parent** | NumbahWan Group (**two brands** under one repo — see §3) |
| **Stack** | Hono (TS) on Cloudflare Pages + static HTML/CSS/JS in `public/` |
| **Dev server** | `node serve.cjs` → port 3000 (simple static) · `npm run dev` (Vite + Hono) |
| **Deploy** | `node bin/mycelium.cjs ship "msg"` — atomic auth→test→sync→push→PR→merge |
| **Target device** | iPhone Safari, 375×812 viewport — **mobile-first, always** |
| **Languages** | NW pages: EN/ZH/TH · KINTSUGI pages: EN/ZH/JP |

**First three commands every session:**
```bash
echo $(date +%s) > .mycelium-session          # 1. mark session (required for commits)
node bin/ai.cjs brief                          # 2. current state in ~500 tokens
node bin/ai.cjs premortem <area>               # 3. what broke last time in this area
```

Replace `<area>` with one of: `battle forge i18n nav economy collection wallet cards tabletop emoji dom ios modules font memory workflow oracle sentinel lore`.

---

## 2. The One CLI — `bin/ai.cjs`

All tools are now reachable from a single entry point. No more hunting through 135 npm scripts.

```bash
node bin/ai.cjs                    # help
node bin/ai.cjs brief              # 500-token project snapshot
node bin/ai.cjs context            # 5K-token deep context
node bin/ai.cjs rules              # hard constraints (things that WILL break the build)
node bin/ai.cjs premortem <area>   # what broke here before + active constraints
node bin/ai.cjs health             # sentinel health score
node bin/ai.cjs guard              # design + i18n + include validation (pre-commit)
node bin/ai.cjs learn <file>       # show the repo's canonical example for <pattern>
node bin/ai.cjs ship "msg"         # deploy: auth→test→sync→squash→push→PR→merge
node bin/ai.cjs memory             # mycelium memory operations
```

Every subcommand routes to the underlying tool (`mycelium.cjs`, `sentinel.cjs`, `bin/agent-brief.cjs`) but presents a unified help surface.

---

## 3. Two Brands — Never Cross-Contaminate (L014)

The **#1 way AI agents break this repo** is mixing the two brand aesthetics.

| | **NumbahWan (NW)** | **KINTSUGI** |
|---|---|---|
| **Identity** | TCG + guild warfare, MMORPG vibe | Premium gold/token fintech, Japanese wabi-sabi |
| **Primary color** | Ember `#ff6b00` | Gold `#c9a84c` |
| **Background** | `#0a0a0f` | `#06060c` |
| **Display font** | `NumbahWan`, `Orbitron` | `Cormorant Garamond`, `Noto Serif TC` |
| **Langs** | EN / 繁中 / TH | EN / 繁中 / JP |
| **i18n key** | `nw_lang` | `kintsugi_lang` or `kin_lang` |
| **Nav** | `public/static/nw-nav.js` (universal hamburger) | Inline per-page |
| **Canonical example** | [`public/world/nwg-the-game.html`](./public/world/nwg-the-game.html) | [`public/kintsugi.html`](./public/kintsugi.html) |

### Which brand am I editing?
1. Look at the page's `<head>` — which CSS does it include (`nw-tokens.css` = NW, inline gold vars = KINTSUGI)?
2. Check font: `NumbahWan` = NW, `Cormorant` = KINTSUGI.
3. Ambiguous pages (`wallet.html`, `buy.html`): check which nav system loads.

### Hard rules
- **NEVER** put ember `#ff6b00` or `NumbahWan` font on a KINTSUGI page.
- **NEVER** put KINTSUGI gold `#c9a84c` or `Cormorant Garamond` on an NW page.
- Both share: `Inter` (body), `Orbitron` (accent), dark bg, mobile overflow rules.

---

## 4. Canonical Examples — Learn by Copying

When you need to build something new, **find the closest existing example in the repo and match its pattern**. Don't invent shape. The gold standards are:

### 4.1 Standalone site / Hono app → `rulai-temple/`
**When to use**: Building a new standalone site or subproject.
**Why it's canonical**: TDD from day one (57 tests GREEN), content-driven architecture (markdown → data → HTML), trilingual ZH/EN/TH, iOS-compatible video, GSAP animations, mobile nav.

```
rulai-temple/
├── content/           # markdown source of truth (hero.md, history.md, ...)
├── src/
│   ├── index.tsx      # thin Hono template — binds content-data to HTML
│   └── content-data.ts # compiled from content/*.md (single build step)
├── public/
│   ├── static/
│   │   ├── styles.css
│   │   ├── app.js      # language switch, particles, nav
│   │   └── icons.svg   # single-file sprite
├── tests/              # vitest + jsdom + @testing-library
│   ├── setup.ts
│   ├── hono-routes.test.ts      # structure tests
│   ├── trilingual.test.ts       # language switching
│   ├── mantra-particles.test.ts # animated content
│   ├── navigation.test.ts       # mobile nav + a11y
│   └── bg-music.test.ts         # audio behavior
├── vitest.config.ts
└── wrangler.jsonc
```

**Key discipline**: Every new behavior gets a RED test before GREEN code. Copy [`rulai-temple/tests/trilingual.test.ts`](./rulai-temple/tests/trilingual.test.ts) as your template for DOM tests.

### 4.2 Multi-language page → `public/world/nwg-the-game.html`
**When to use**: Adding a new content-heavy NW page with EN/ZH/TH.
**Pattern**: `<script>` block at bottom with `const PAGE_I18N = {en:{...}, zh:{...}, th:{...}}` → `NW_I18N.register(PAGE_I18N)`. All user-visible strings have `data-i18n="key"`.

### 4.3 Shared JS module → `public/static/nw-i18n-core.js`
**When to use**: Building a new cross-page utility (like `NW_*` modules).
**Why it's canonical**: Header comment explains purpose + usage + storage keys + load order. Queue-based shim pattern handles script load races. No globals beyond `NW_I18N`.

```js
/**
 * NW_* v<version> — <one-line purpose>
 * ============================================
 * HOW IT WORKS: 1-sentence summary.
 *
 * FOR NEW PAGES — just include in <head>:
 *   <script src="/static/nw-<name>.js" defer></script>
 *
 * STORAGE KEY: 'nw_<key>' (if any)
 */
(function () {
  'use strict';
  // implementation
})();
```

### 4.4 Test file → `rulai-temple/tests/hono-routes.test.ts`
**When to use**: Writing any new test.
**Pattern**: `describe` per feature, `it` per behavior, setup in `beforeEach`, cleanup in `afterEach`. One expectation per `it` when possible.

### 4.5 Git hook → `.husky/pre-commit`
**When to use**: Adding any automation that must run before a commit.
**Why it's canonical**: TypeScript gate at the top fails fast; auto-guards with mycelium; compacts memory; warns but only blocks on hard gates. Respects `core.hooksPath=.husky` (never use `.git/hooks/`).

### 4.6 API route → `src/routes/pages.ts`
**When to use**: Serving HTML or JSON from a new route.
**Pattern**: Hono handler, `ASSETS.fetch()` in prod, `fs.readFileSync` fallback in dev, clean URLs (`/page` AND `/page.html` both work).

---

## 5. The Memory & Guardian Systems (the short version)

We have **three layers of memory**, each with a narrow job:

```
HOT  = your conversation context (200K token cap)
WARM = .mycelium/memory.json (~186K — NEVER read directly; use CLI)
COLD = git history + .nw-context (auto-compacted summary of WARM)
```

### `mycelium.cjs` — the learning system
Stores **constraints** (facts), **decisions** (choices), **breakages** (what broke + lesson).
After every commit it auto-snapshots, scores the change, and updates `.nw-context`.

**Your duty**: Record at least ONE learning per session or the pre-commit hook blocks you.

```bash
# Record (one of these per session minimum):
node bin/ai.cjs memory decide "<area>" "<what>" "<why>"
node bin/ai.cjs memory constraint "<area>" "<hard fact>"
node bin/ai.cjs memory broke "<area>" "<what happened + lesson>"
```

### `sentinel.cjs` — the guardian
Health score (0-100), design guard, i18n guard, include checks, self-heal.

```bash
node bin/ai.cjs health             # dashboard
node bin/ai.cjs guard              # block commit if design/i18n breaks
node sentinel.cjs --heal           # auto-fix known issues
node sentinel.cjs --ci             # CI mode (exit codes)
```

### Token budget — the hard rule
200K tokens per session (input + output). The three expensive mistakes:
| Don't | Do instead |
|---|---|
| `Read file_path=mycelium.cjs` (~58K tokens) | `grep -n "function X" mycelium.cjs` (~20) → `Read offset=N limit=60` |
| `Read file_path=.mycelium/memory.json` (~186K — **FATAL**) | `node bin/ai.cjs memory query` |
| Echo a large JSON in chat | `node bin/ai.cjs ... > /tmp/out && head -20 /tmp/out` |

---

## 6. The Non-Negotiable Rules (violate = rollback)

### 6.1 VALUE GATE
Before any multi-file change, answer OUT LOUD:
1. What **metric** does this improve? (tests, bundle size, health score)
2. What **bug** does this fix? (reproducible breakage)
3. What **user-requested feature** does this add?

**If all three are "none" → STOP. Ask: "this is cosmetic only — should I skip it?"**
The AI has burned 30+ edits in the past on metaphor-driven refactors with zero improvement. Don't be that AI.

### 6.2 HONESTY GATE
When asked "can X do Y?" → **test it first**. Never claim a tool doesn't work without proof. Underselling is as dishonest as overselling.

### 6.3 ANTI-STALL (saves tokens, avoids "Continue" prompts)
1. **Batch edits** — issue parallel tool calls; one narration at the end, not between each
2. **Use `Write` tool for new files >100 lines** — don't echo code in chat then write it
3. **Pipe verbose output** — `| tail -5` or `| head -20` on anything that might spew
4. **Checkpoint multi-step work** — `node mycelium.cjs --checkpoint '{"task":"...","pending":["..."]}'`

### 6.4 EVAL ANTI-GAMING
Never add bonus/credit/nudge systems to mycelium eval scoring. Each metric = ONE raw number → frozen threshold → score. The ONLY way to improve a score is to improve actual data. Verify checks AG-1 through AG-4 fail if rules are tampered with.

### 6.5 BRAND WALL
See §3. Never mix NW and KINTSUGI design tokens/fonts.

### 6.6 MOBILE FIRST
- Viewport meta: `width=device-width, initial-scale=1.0, user-scalable=no`
- Triple-layer overflow: `html,body { overflow-x:hidden; max-width:100vw } * { max-width:100vw } img { max-width:100%; height:auto }`
- Single `@media (max-width:768px)` block per stylesheet — never two, last one wins
- Bump `9-13px` fonts to `11-15px` on mobile; **never** touch headings, stat values, ticker prices

### 6.7 iOS GOTCHAS (burned us multiple times)
- `touchend` + `click` both fire → use handling flag with 300ms timeout
- `Audio.play()` blocked until first user gesture → never autoplay
- `history.back()` unreliable in SPA-like setup → use `window.location.href`
- CSS: always include `-webkit-` prefixes for `background-clip`, etc.

---

## 7. The Workflow — Every Session

```
┌────────────────────────────────────────────────────────────────┐
│ 1. echo $(date +%s) > .mycelium-session                        │
│ 2. node bin/ai.cjs brief                    # 500 tokens       │
│ 3. node bin/ai.cjs premortem <area>         # area-specific    │
│ 4. [If multi-step] mycelium --checkpoint '{...}'               │
│ 5. WORK — grep before read, parallel tool calls, Write for     │
│           large files, pipe verbose output                     │
│ 6. Record at least 1 learning:                                 │
│    node bin/ai.cjs memory <decide|constraint|broke> ...        │
│ 7. node bin/ai.cjs ship "feat(area): <descriptive message>"    │
│    ← handles auth + test + sync + squash + push + PR + merge   │
└────────────────────────────────────────────────────────────────┘
```

**Why `ship` not manual git**: Two recurring failures we stopped retrying:
1. GitHub auth token expires mid-session → `git push` fails
2. Workflow stalls after PR creation → PR never merges

`ship` does all 9 steps atomically. If any step fails, it tells you exactly which.

---

## 8. Where Things Live (the map)

```
webapp/
├── AI_PLAYBOOK.md       ← THIS FILE (canonical entry for AI)
├── AGENT-CONTEXT.md     ← brand details (short)
├── CLAUDE.md            ← session protocol (mandatory pre-commit ritual)
├── AUDIT-2026-04.md     ← what was refactored in this pass
│
├── bin/
│   ├── ai.cjs           ← ⭐ unified CLI — start here
│   ├── mycelium.cjs     ← ship command + CLI wrapper
│   ├── agent-brief.cjs  ← machine-readable briefs (JSON)
│   ├── page-gen.cjs     ← auto-generate new NW pages from template
│   └── factory-*.cjs    ← page factory + quality gates
│
├── mycelium.cjs         ← memory/learning engine (grep — never read whole)
├── sentinel.cjs         ← guardian/health engine (grep — never read whole)
├── serve.cjs            ← dev static server (port 3000)
│
├── rulai-temple/        ← ⭐ canonical standalone site (TDD, trilingual)
├── public/world/        ← content-heavy NW pages
├── public/static/
│   ├── nw-nav.js        ← ⭐ canonical NW universal nav
│   ├── nw-i18n-core.js  ← ⭐ canonical shared module pattern
│   ├── nw-wallet.js     ← economy/currency
│   └── nw-*.css/.js     ← design tokens + utilities
│
├── src/
│   ├── index.tsx        ← Hono app entry
│   └── routes/          ← Hono route handlers
│
├── tests/               ← project-wide test runners
├── docs/                ← detailed reference docs (most deprecated in favor of this file)
├── .mycelium/           ← memory, events, eval history (DON'T READ directly)
├── .mycelium-mined/     ← auto-mined intelligence (blame, weights, risk)
└── .husky/              ← git hooks — commits are gated here
```

---

## 9. Quick Answers (FAQ for an AI)

**Q: I want to add a new page.**
1. Read the closest existing example in `public/` (match brand — §3)
2. Use `node bin/page-gen.cjs` if it's an NW world page
3. Add translations to `NW_I18N.register({ en, zh, th })` — all 3 languages required
4. Test at 375px viewport first

**Q: I want to add a test.**
1. Open [`rulai-temple/tests/trilingual.test.ts`](./rulai-temple/tests/trilingual.test.ts) as template
2. RED first (failing test), then GREEN (implementation)
3. `npm run test:unit` (vitest) or `npm test` (full suite)

**Q: I want to deploy.**
```bash
node bin/ai.cjs ship "feat(area): what I did"
```
Do not run `git push` manually. Do not run `gh pr create` manually.

**Q: Sentinel says health dropped.**
```bash
node bin/ai.cjs health              # see which module tanked
node sentinel.cjs --heal            # auto-fix if possible
```

**Q: I need to know what broke before touching a file.**
```bash
node bin/ai.cjs whyfile <path>
```

**Q: I made a choice the next AI should know about.**
```bash
node bin/ai.cjs memory decide "<area>" "<choice>" "<reasoning>"
```

**Q: I'm out of tokens reading a big file.**
```bash
wc -l <file>                        # is it huge?
grep -n "pattern" <file>            # find the line number
Read <file> offset=N limit=80       # read just that chunk
```

**Q: How do I know if my change will break something?**
```bash
node bin/ai.cjs guard               # design + i18n + include validation
node sentinel.cjs                   # full health check
```

---

## 10. Session-End Checklist

Before you stop:
- [ ] At least one `mycelium memory <decide|constraint|broke>` recorded
- [ ] `node bin/ai.cjs ship "msg"` succeeded (or you have a clear reason why not)
- [ ] PR URL shared with the user
- [ ] `.mycelium/checkpoint.json` cleared (`mycelium --wip-done`) if task is complete, or updated with `pending` steps if not

---

## 11. What Changed in This Refactor (2026-04-17)

See [`AUDIT-2026-04.md`](./AUDIT-2026-04.md) for the full before/after. Highlights:

- **New**: `AI_PLAYBOOK.md` (this file) — replaces 7 scattered docs with one canonical entry
- **New**: `bin/ai.cjs` — unified CLI wrapping mycelium/sentinel/agent-brief
- **New**: `--help` added to `mycelium.cjs` and `sentinel.cjs` (discoverability)
- **New**: Canonical examples explicitly marked (rulai-temple, nw-i18n-core.js, etc.)
- **Deprecated** (kept for history, now point here): `docs/AI-README.md`, `docs/AI-ONBOARDING.md`, `docs/AI-HANDOFF.md`, `docs/AI-HELPERS.md`, `docs/AI-WORKFLOWS.md`, `docs/AI_CONTEXT.md`

No behavior changes to mycelium/sentinel/factory — just clarity, discoverability, and a single entry point. VALUE GATE passed: metric = "AI onboarding time from ~10min reading 10+ files to ~2min reading one file + one CLI help".

---

*AI_PLAYBOOK v1.0 · NumbahWan TCG · 2026-04-17*
*If something in this file is wrong, fix it here and `node bin/ai.cjs ship "docs: fix playbook"`.*
