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
BrightInside guild landing page for **Ragnarok: The New World** (Gravity MMORPG, Rune-Midgard
setting). Single page at `public/guild/brightinside/index.html`. Currently framed as on a
**Test Server**.

## Permanent rules (constraints, not state)
- **No AI-tell phrases** in page copy. Enforced by `tools/ai-tell-lint.cjs` (pre-commit hook).
  Run: `node tools/ai-tell-lint.cjs --file=<path>`. Guild page is NOT exempt; must pass clean.
  Banned tokens are listed in `tools/ai-tell-corpus.json` (filler vocab, em-dash between
  lowercase words, "not X but Y", rhetorical lists-of-three). Read that file for the exact set.
- **Mobile-first iOS**, iPhone 375px is the primary viewport.
- **Trilingual TH/JA/EN**: every visible string needs a `data-i18n` key present in all 3 langs.
- **Git workflow**: commit → fetch origin main → squash via `git reset --soft origin/main` →
  `setup_github_environment` → `git push -f` → PR → merge → share PR URL.
- **Images**: generated art only (licensing). Pipeline: nano-banana-pro → fal-bria-rmbg →
  PIL trim/resize/webp q82-88 method 6.

## Decisions + rationale (the part git can't tell you)
- Guild HAS an emblem now. This **reverses** an earlier "no emblem" choice, so don't undo it.
- Emblem concept = "default": lantern flame breaking through cracked dark stone, gold+violet.
- Member portraits: user **dislikes the old ones**, so reveal art must be **NEW**, never reuse
  the deleted regginam/md3mon originals. Members shown as shadows first (cliffhanger).
- Pay-to-reveal = a **joke** paywall (fake decline toast → reveal). No real payment. Keep it funny.
- "Dark inside" transformation is shown two ways: banner that lights up on scroll-past-middle,
  and the dark-to-bright origin story.
- Tone: playful/funny over corporate.

## Lore (drives copy, not in any file)
- Guild came "out of the dark inside"; placed 4th in Ragnarok Origin under MiniDemon.
- Regginam: rainbow mage who insists he's a Swordsman, giant unused blade.
- MD3mon / MiniDemon / Panthera: panther-demon champion who led the 4th-place climb.

## Open gotchas (rediscovering these costs real time)
- **No screenshots possible**: Playwright chromium missing `libnspr4.so`, no apt access.
  Verify via `PlaywrightConsoleCapture` (works), curl status, lint, programmatic i18n checks.
- `.github/workflows/` exists locally but **can't be pushed** (App token lacks workflow perm).
  Always keep it out of staging.
- `image_urls_nowatermark` URLs 403 on curl; download via `DownloadFileWrapper` with public
  `image_urls` short URLs instead.
