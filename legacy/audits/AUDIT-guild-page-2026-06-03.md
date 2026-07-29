# AUDIT — PARADOX guild page build (2026-06-03)

Ultra-audit of pain points across the multi-round build of
`public/guild/brightinside/index.html` and its emblem, with an executed
improvement plan. Written so the next agent inherits the fixes, not the pain.

---

## The pattern that cost the most: emblem transparency artifacts

The SAME bug surfaced three times and was caught by the **user**, not our tools:

1. Round 1 — gray patch inside the P counter.
2. Round 2 — still a gray/dark patch (regenerated, same class of defect).
3. Round 3 — dark triangular fill in the counter **plus** a stray "D" letter.

### Root cause
`fal-bria-rmbg` only strips background **connected to the image border**. The
inner counter of a letter (P/D/O/A loop) and other enclosed pockets are NOT
border-connected, so they keep their original dark fill. AI generators also
randomly drop dark fills into those counters no matter how the prompt is worded.
Our gates (`ai-tell`, `ai-layout`, `page-size`) read markup/text — **none of
them look at rendered pixels**, so the artifact shipped every time.

### Cost
Per round: 1 generate + 1 rmbg + 1 download + 1 re-upload + 1+ vision verify +
full git ship cycle — repeated 3x, each time after the user manually circled the
defect. That is the single largest avoidable spend of the whole build.

---

## Improvement plan (EXECUTED this session)

1. **`tools/emblem-clean.py`** — deterministic post-rmbg cleaner. Flood-finds dark,
   fully-enclosed opaque blobs and punches them to transparent, preserving
   border-connected linework. Then trims/squares/resizes/webp. One command turns a
   raw rmbg logo into a shippable transparent asset. *Replaces the "hope the prompt
   fixes it" loop.*

2. **`tools/asset-alpha-lint.py`** — pixel-level gate. Flags (a) non-transparent
   corners and (b) flat enclosed counter-fills, while ALLOWING one organic dark
   cavity (a demon mouth) via a fill-ratio + hole-count heuristic. Proven: FAILS the
   old dirty emblem (5 fills), PASSES the cleaned emblem and lockup.

3. **Wired into the gate**: `node bin/ai.cjs assets <file>` and auto-run inside
   `node bin/ai.cjs preship` whenever a `guild/` page is in scope. The system now
   catches this class of bug before a human ever sees it.

4. **PROJECT_STATE.md** updated: the image pipeline now mandates emblem-clean and the
   asset gate; explains the bria border-only limitation so nobody repeats it.

---

## Other pain points + standing fixes

- **Re-upload round-trips.** `understand_images` rejected webp uploaded as
  octet-stream. Fix (now habit): always `UploadFileWrapper ... content_type: image/webp`
  the first time.
- **Over-verification.** Ran vision + PIL + corner sampling on every step. Fix: PIL/lint
  is the cheap objective proof; reserve one `understand_images` pass for the final look.
- **Lockup drift.** The lockup baked in a stale emblem and re-shipped the artifact. Fix:
  always rebuild the lockup FROM the cleaned emblem, and the asset gate lints the lockup too.
- **No screenshots** (chromium missing libnspr4.so). Standing workaround: console-capture +
  curl + lints + programmatic checks. (Documented in PROJECT_STATE open gotchas.)

## Follow-up (round 4): embedded dark island

A 4th round surfaced a subtler variant: a dark patch inside the P bowl that was
**fused to the demon body by a thin dark bridge**. The connected-component pass
saw it as one giant low-fill blob (≈15% of the image) and let it through; the
lint's "one organic cavity" allowance also passed it. Fix:
- `emblem-clean.py` gained a SECOND pass `clear_embedded_islands()` — it finds dark
  pixels ringed by bright/transparent (a dark island inside the light letter) and
  floods them out, contained by the bright letter wall even when a bridge exists.
- `asset-alpha-lint.py` gained an embedded-island detector (ring test) so the gate
  fails a dark patch sitting inside a letter regardless of whether it's a clean blob.
- Proven: lint FAILS a synthetic in-letter patch, cleaner removes it, lint then PASSES.

## Net effect
The recurring, user-caught visual bug (in all its variants: enclosed counter-fill,
flat block, AND island-fused-to-body) is now (a) auto-fixable in one command and
(b) auto-caught by `preship`. Future logo work should cost one pass, not four.
