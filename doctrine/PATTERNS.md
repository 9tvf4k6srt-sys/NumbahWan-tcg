# PATTERNS — Named building blocks

A library of patterns we've shipped that work. Each pattern has: name, when-to-use, when-NOT-to-use, code anchor (where it lives in the repo), and a real example. AI agents: when a task matches a pattern, use the named pattern, do not reinvent it.

This file is the answer to "stop rebuilding the same CSS from memory each session."

---

## Visual / layout patterns

### P-001 · Brass-left-border row

**When:** any list of receipts, signed entries, audit-trail rows.
**When NOT:** plain navigation lists, footer links.
**Anchor:** `public/invest.html` `.row` class · `public/desk/index.html` `.cdp li`
**CSS:**
```css
.row { padding:14px 18px; border-left:3px solid var(--brass-2);
  background:var(--paper-3); margin:0 0 8px; }
```
**Why it works:** brass left bar reads as "stamped / signed". Cheap visual = high trust.

### P-002 · Pulse-dot kicker

**When:** any panel that updates (live counts, last-receipt dates, rotation counters).
**When NOT:** static marketing copy, contact info, about pages.
**Anchor:** `public/invest.html` rotation panel.
**Markup:**
```html
<div class="kicker">
  <span class="dot"></span>
  47 rotations since inception · last receipt 2026-05-06 by CL
</div>
```
**CSS:**
```css
.dot { width:6px; height:6px; border-radius:50%; background:var(--seal);
  box-shadow:0 0 0 0 rgba(123,42,30,.7); animation:pulse 2.4s ease-out infinite;
  display:inline-block; margin-right:8px; vertical-align:middle; }
@keyframes pulse {
  0%   { box-shadow:0 0 0 0 rgba(123,42,30,.55); }
  70%  { box-shadow:0 0 0 10px rgba(123,42,30,0); }
  100% { box-shadow:0 0 0 0 rgba(123,42,30,0); }
}
```
**Why it works:** live-ops feel beats marketing. Operators can tell the difference.

### P-003 · Analyst signature glyph

**When:** any timestamped action, decision, receipt confirmation.
**When NOT:** anonymous content, marketing.
**Format:** monospace caps initials (CL, HW) in italic display font, brass color, with dated suffix.
**Markup:**
```html
<span class="sig">— <em>CL</em> · 2026-05-06</span>
```
**Anchor:** `public/desk/ticker.html` verification log rendering.

### P-004 · Receipts-not-promises proof block

**When:** anywhere a claim needs evidence — testimonials, track records, "trust us".
**When NOT:** Don't use this for forward-looking statements; that's lying.
**Structure:** title strip + 3–7 dated rows, each with source link, signed by analyst initials, monospace timestamps.
**Anchor:** `public/desk/index.html` `.cdp` (contract-delta panel).

### P-005 · Fair-value band tinting (Box D)

**When:** displaying a price-vs-fair-value verdict.
**When NOT:** displaying a forecast.
**Color states:**
- `fv-watch` (default brass tint) — analyst must confirm vs live price
- `buy` (green left-border) — price ≤ 0.85× ceiling
- `wait` (seal-red left-border) — price > ceiling

**Anchor:** `public/desk/scan.html` `.card.buy` / `.card.watch` / `.card.wait`.

### P-006 · 6-box screen grid

**When:** any binary multi-criteria scan.
**When NOT:** continuous scoring (use a chart instead).
**Structure:** 6 cells, each with letter (A–F), label (EN + 繁中), star count, note.
**Anchor:** `public/desk/ticker.html` `#boxes`.

---

## Type / typography patterns

### P-101 · Display + mono pairing

`var(--display)` (Cormorant Garamond) for prose, `var(--mono)` (JetBrains Mono) for labels, dates, tickers, counts, status badges.

**Rule:** never mix mono and display in the same text run. Mono is for labels and metadata only.

### P-102 · Trilingual span toggle

```html
<span data-lang="en">English copy</span>
<span data-lang="zh" style="font-family:var(--zh-display)">繁中文案</span>
<span data-lang="ja">日本語コピー</span>
```
JS toggles by setting `document.documentElement.lang`. CSS does the show/hide.

**Rule:** every user-facing string gets all three. No exceptions in shipped pages.

### P-103 · Status-badge inline

```html
<span class="vb confirmed">CONFIRMED</span>
<span class="vb draft">DRAFT</span>
```
Mono, 9–10px, uppercase, .18em letter-spacing, padded 2/5px. Confirmed = green tint. Draft = brass tint. Failed = seal tint.

---

## Color / palette patterns

### P-201 · Paper-and-ink editorial palette

CSS variable convention used across all PINFORGE surfaces:
```css
:root {
  --paper:#EFE7D6;  --paper-2:#E4D9C2; --paper-3:#F7F1E3;
  --ink:#1A1612;    --ink-2:#3D352D;   --ink-3:#6B5E4F;
  --brass:#8B6F3A;  --brass-2:#A2864A; --brass-3:#C9A867;
  --seal:#7B2A1E;   --seal-soft:#9C3A2A;
  --green:#3c7846;  --green-soft:#5e9968;  /* for BUY/confirmed */
  --rule:rgba(26,22,18,.14);
}
```
**Rule:** never introduce a hex color outside this palette without adding it as a variable here first.

---

## Content / copy patterns

### P-301 · "The X. The Y." closing pattern

Two short declarative sentences ending a section. Examples:
- "The names rotate. The discipline doesn't."
- "Receipts, not promises. Every change is dated and signed."
- "Five names. Six tests."

**Use:** section closers, hero punchlines.
**Don't:** overuse — once per page max.

### P-302 · Operational close

End sections with a concrete next action, not motivation.
- "Open ledger →"
- "先約 30 分鐘,坐下來聊"
- "Reply 1, 2, or 3."

See VOICE.md "How we close" for the rule.

### P-303 · Caveat block

When the answer has limits, list them as numbered limits, not soft hedges.
**Anchor:** `public/desk/scan.html` `.notice`.

### P-304 · Three-options decision close

When ending a build response and asking for next direction:
1️⃣ Option A (~time estimate)
2️⃣ Option B (~time estimate)
3️⃣ Option C (~time estimate)

Reply with `1`, `2`, or `3`.

**Why:** operator pattern. Three options + numbered selector = fastest-resolution closing.

---

## Build / engineering patterns

### P-401 · Dev-server route allowlist

Server: `tools/anchor-preview.cjs` on port 8765. Hard-coded route allowlist. New routes (e.g. `/desk/scan`) require an explicit branch added to the route handler. This is NOT Cloudflare Pages routing.

### P-402 · Sensor trio

Every push runs:
- `node tools/check-routes.cjs` (4 files / 0 dead links target)
- `node tools/check-assets.cjs` (page weight budget)
- `node tools/check-motto.cjs` (canonical strings present)

Fail = don't push.

### P-403 · Append-only ledger

Per-ticker JSON in `public/data/desk/<ticker>.json`. Mutations append to `verification_log[]`, never overwrite. Receipts have `verify_status: draft|confirmed`, dated, with source URL. Counts only count `confirmed`.

**Why:** audit-trail discipline. The shape itself enforces honesty.

### P-404 · Smoke-test echo in response

Format the operator expects in every push response:
```
/desk            200 · 30 037 B
/desk/scan       200 · 25 310 B
sensors: routes 4/0 dead · assets 2 pages/33 assets/0 over budget · motto pass
```
HTTP code · payload size · grep counts for new strings (≥N) and stale strings (=0).

### P-405 · Squash before final PR

Per-push commits during work are fine. Before merging to main, squash with non-interactive reset:
```bash
git reset --soft HEAD~N && git commit -m "comprehensive message"
```

### P-406 · Live-link triple at end of push

```
- Live page: https://...
- PR: https://...
- Commit: <sha>
```
Memory rule (`always_provide_build_links.md`): non-negotiable.

### P-407 · Five-method valuation

For any "what's it worth" question on a security:
1. PE multiple (ledger inputs)
2. EV/EBITDA (peer-derived)
3. 5-yr DCF (WACC 10%, terminal g 3%, layer-aware growth)
4. Peer-group median PE
5. Historical 5-yr median PE

Weighted average + spread = conviction signal. **Anchor:** `tools/valuation.cjs`. **Output:** `public/data/desk/scan.json`.

### P-408 · Contract receipt verification CLI

For any receipt-flipping workflow:
```bash
node tools/verify.cjs <ticker>                     # status board
node tools/verify.cjs <ticker> <receipt-id> --by CL --note "..."
node tools/verify.cjs <ticker> pt:<key> --by HW
node tools/verify.cjs <ticker> --unverify <id>
```
Operator-flipped only. No auto-confirm from scrapes.

---

## Anti-patterns (named, so we can refuse them by name)

### A-001 · "Two roads" co-headline
Killed Push 6. Co-headlining two products dilutes both. **One product per landing.** Other products become quiet doors near footer.

### A-002 · Splash overlay / loading screen on real pages
Killed Push 5. Real pages render content immediately. Loading screens are a phone-app pattern, not editorial.

### A-003 · Posture-before-product
"We sit on your side" before "this is what we do." Kill the warm-up. Lead with product.

### A-004 · 80-word hero sub-paragraph
Hero subs ≤ 30 words. Always.

### A-005 · 3+ CTAs in hero
2 max. Third option means the page hasn't decided what it is.

### A-006 · "newest models" without datestamp
Any "latest / newest / current" claim that's hard-coded gets a visible datestamp or rotates from a dated source. Otherwise it ages into a lie.

---

**When you ship a new pattern that worked,** add it here with a P-### number, anchor it to the file where it lives, and write the example. When you ship something that *didn't* work, add it as A-### in the anti-patterns list with a one-line "what it is, why we killed it."

**Last reviewed:** 2026-05-06
