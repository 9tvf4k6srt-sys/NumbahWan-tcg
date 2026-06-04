# PROJECT_STATE

> Discoverable from [`AI_PLAYBOOK.md`](./AI_PLAYBOOK.md) §0 (the read-budget ladder).
> Read this when resuming a tracked project instead of reconstructing context from scratch.
> This is the **template pattern** for any resumable build: one short file, durable why only.

Durable, non-derivable context only. **Do NOT put here anything `git log`, `ls`, or a lint
run can tell you.** No asset lists, no file sizes, no per-file ledgers, no finished-task
checklists. Those are re-derived on demand. This file holds *why* and *rules*, not *what*.

Prune resolved items. If this file grows past ~60 lines, it's rotting, so cut it.

---

## Project
**PARADOX** competitive guild landing page for **Ragnarok: The New World** (Gravity MMORPG,
Rune-Midgard setting). Single page at `public/guild/brightinside/index.html` (path kept;
brand is PARADOX). Recruitment-funnel page: Hero (centered emblem + wordmark) → Proof →
Creed → Roster → Hall → Lounge → Join. **No "BrightInside" anywhere** (retired Jun 2026).

## Permanent rules (constraints, not state)
- **No AI-tell phrases** in page copy. Enforced by `tools/ai-tell-lint.cjs` (pre-commit hook).
  Run: `node tools/ai-tell-lint.cjs --file=<path>`. Guild page is NOT exempt; must pass clean.
  Banned tokens are listed in `tools/ai-tell-corpus.json` (filler vocab, em-dash between
  lowercase words, "not X but Y", rhetorical lists-of-three, + 2026 blacklist: beacon/realm/
  symphony, "aims to", hook-transitions). Read that file for the exact set.
- **Produce natural content, don't just pass the gate.** The corpus DETECTS tells; copy that
  passes can still read AI (the guild copy scored 8/100 "natural" yet felt AI). The fix is the
  PRODUCTION doctrine: **`FORGE-DOCTRINE.md`** (specific, uneven, imperfect — across words/visual/
  audio). Before writing/rendering/recording, build a voice-locked prompt: `node bin/ai.cjs voice
  <words|visual|audio> "<brief>" --world=paradox`. Visual: direct the physics (name the light,
  camera formula, explicit imperfection), never "8k/cinematic/perfect" (summons the AI look).
- **Mobile-first iOS**, iPhone 375px is the primary viewport.
- **Trilingual TH/JA/EN**: every visible string needs a `data-i18n` key present in all 3 langs.
- **Git workflow**: commit → fetch origin main → squash via `git reset --soft origin/main` →
  `setup_github_environment` → `git push -f` → PR → merge → share PR URL.
- **Images**: generated art only (licensing). Pipeline: nano-banana-pro → fal-bria-rmbg →
  **`tools/emblem-clean.py`** (punches enclosed dark holes / counter-fills to transparent,
  then trim/square/resize/webp). NEVER paste a raw rmbg logo straight into a page. bria only
  removes border-connected background, so letter counters (P/D/O loops) keep a dark fill.
  Asset gate: **`node bin/ai.cjs assets <file>`** (also auto-runs inside `preship` for guild
  pages). It flags opaque corners + flat enclosed counter-fills, but ALLOWS one organic dark
  cavity (a demon mouth). When the gate fires: re-run emblem-clean on the source, rebuild any
  lockup from the cleaned emblem, re-lint.

## Decisions + rationale (the part git can't tell you)
- Emblem = **MiniDemon demon-P** (the letter P forged into a horned demon: snarl + curling
  tail), off-white + ember-red accents. An **Ohm/Omega (Ω) monogram is carved into the P
  counter** as an intentional negative-space seal (the bowl kept rendering an irregular
  white shape, so we turned it into a deliberate glyph). `assets/paradox-emblem.webp`
  (transparent) + `paradox-lockup.webp` (emblem over PARADOX wordmark). Because the Ω is a
  deliberate dark interior glyph, both assets are in `asset-alpha-lint.py` GLYPH_ALLOW
  (skip embedded-island, tolerate the one monogram badge). Don't revert to old orb.
- Brand = **one paradox, two truths**: "Ruthless on the boss. Family in the hall." Visual
  spine: **forest-green base + ONE ember-red accent (`--ember #e0566a`, kept EXACT for emblem
  branding)**; condensed display fonts (Barlow Condensed headings, Rajdhani tech labels).
- **Ambient art = BRIGHT painterly Ragnarok/Zenonia OPEN-WORLD FOREST, trees + nature, NO
  characters** (guild leader: "chill nature forest open-world vibes", "see through page").
  Jun 2026 v2 overhaul shifted from the dark-dusk v1 to a **lush daylight** look and
  repaletted `:root` from near-black+ember (esports) → **forest-green base** while keeping
  `--ember` exact. **6 ambience layers, one per section** (use ALL the art we generated):
  hero = `forest-hero.webp`, page-wide `body::before` = `forest-canopy.webp`, creed/welcome =
  `ambient-grove.webp`, origin `.origin__panel::before` = `forest-meadow.webp`, hall =
  `forest-golden.webp`, closing `.join` = `hero-forest.webp`. **"See through page" =
  translucent dark-green glass panels** (`--panel`/`--panel-solid`/`--glass` + `backdrop-filter`).
  **iOS ZOOM RULE (learned):** `background-size: cover` over-zooms wide (1.79) art on a tall
  375px viewport — it fills the SHORT side and crops to a center slice. Fix: page-wide canopy
  uses `background-size: 130% auto` + top anchor (`50% 6%`); section bgs use `cover` with a
  high `background-position` (`50% 18-35%`) + a `--night` background-color fallback so any
  uncovered area is dark forest, not white. Parallax JS scales kept LOW (hero 1.04, hall 1.06)
  so scroll doesn't re-zoom. Only `guildhall.webp` + `hero-prontera.webp` remain orphaned.
  Generated art only (licensing).
- Member portraits: user **dislikes the old ones**, so reveal art stays **NEW** (current
  reg-/md- shadow+reveal webp). Members shown as shadows first (cliffhanger). KEEP Regginam + MD3mon.
- Pay-to-reveal = a **joke** paywall (fake decline toast → reveal). No real payment. Keep it funny.
- Tone: competitive + warm. Recruitment-driven, but playful (not corporate).
- Scroll motion is a feature: IO reveals, per-letter headline, ember scan-line on h2s,
  count-up proof stats, scroll-scrub hero ring, banner light-wipe, parallax, ambient ember canvas.

## Lore (drives copy, not in any file)
- PARADOX placed **4th in Ragnarok Origin** under **MiniDemon** (= Poj = MD3mon = Panthera,
  panther-demon champion who led the climb). The 4th-place rank is the core social proof.
- Regginam: rainbow mage who insists he's a Swordsman, giant unused blade.
- The name PARADOX = two opposite truths held at once (ruthless competitor / warm family).

## Open gotchas (rediscovering these costs real time)
- **No screenshots possible**: Playwright chromium missing `libnspr4.so`, no apt access.
  Verify via `PlaywrightConsoleCapture` (works), curl status, lint, programmatic i18n checks.
- `.github/workflows/` exists locally but **can't be pushed** (App token lacks workflow perm).
  Always keep it out of staging.
- `image_urls_nowatermark` URLs 403 on curl; download via `DownloadFileWrapper` with public
  `image_urls` short URLs instead.
