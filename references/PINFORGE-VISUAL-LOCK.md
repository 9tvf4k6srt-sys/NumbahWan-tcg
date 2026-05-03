# PINFORGE Visual Lock

This file is the canonical visual spec for every PINFORGE-bound image and video frame. Every generation must cite it. Every reviewer must verify against it.

---

## Doctrine — read before generating

1. **Real-photo anchors required.** No generation without 1–3 anchors from `references/visual-anchors/` passed as `image_urls`. AI references compound sheen.
2. **Short, physical prompts beat luxury-keyword stacking.** What's in frame, what light, what camera, what mood word. Cut every adjective that isn't a measurable noun.
3. **Multi-pass production.** 4 variants from 2–3 different models. Human cut. Edit-mode regenerate the chosen frame to add controlled flaws. Hand-finish in Capture One / Affinity.
4. **60–80 % manual rule.** AI is for the draft only. The final frame must show the human pass: dodge/burn one zone, paint out one cliché object, color-grade one channel.
5. **Detector loop is non-negotiable.** Nothing ships without passing `tools/anchor-verify.cjs` plus the planned sheen-verify gate.

---

## Locked palette

| Token | Hex | Use |
|---|---|---|
| paper | #EFE7D6 | base, hero |
| paper-2 | #E4D9C2 | aged vellum |
| paper-3 | #F7F1E3 | card surface |
| ink | #1A1612 | sumi black-brown, primary text |
| ink-2 | #3D352D | body text |
| ink-3 | #6B5E4F | secondary |
| brass | #8B6F3A | oxidized antique brass — primary accent |
| brass-2 | #A2864A | brass highlight |
| brass-3 | #4A3820 | brass shadow |
| seal | #9B2C2C | imperial cinnabar — single accent |
| jade | #5C8275 | data positive |
| bord | #6B2B2B | data negative |

## Locked architecture

- Taipei floor-through, mid-to-high tower (32–48 F realistic range)
- 3.6 m ceiling, full-height steel-mullion windows
- Honed travertine floor, low Tibetan kilim runner
- Walnut-and-oxidized-brass communal table (4.2 m)
- Raw lime-plaster back wall (real trowel marks visible)
- Cast-brass PINFORGE emblem inset into plaster (matte, not polished)

## Locked camera language

- Phase One IQ4 medium-format aesthetic, OR Leica Q3 35 mm
- f/4–f/5.6, ISO 200, natural side light + 2700 K tungsten practicals
- Portra 400 film grain, mild — added in code post-gen, not via prompt
- Slight chromatic aberration on window edges
- Asymmetric composition slightly off-center
- Real lens vignetting, real dust motes in light beams
- Single hand-applied imperfection per frame: cable, coffee ring, rolled sleeve

## Forbidden — banned visual signals

- "Ultra detailed", "hyper detailed", "8k", "cinematic", "dramatic lighting"
- Polished/pristine surfaces; mirror-finish brass; spotless desks
- Symmetrical hero composition centered on a fireplace or window
- Halo backlight behind a single object
- Olive tree + brass lamp + leather chair + vinyl record stack-up (luxury cliché)
- CGI shine, render gloss, neon glow, glass-of-water with ripple
- Generic "luxury office" tropes the model defaults to

## Anchor library (initial batch)

Listed in `references/visual-anchors/SOURCES.md` with full provenance.

| Category | Count | Source |
|---|---|---|
| designer-real | 10 | Frederik Vercruysse — Vervoordt for Wallpaper W*212 (Nov 2016) |
| materials | 2 | Wikimedia Commons CC-BY-SA — lime plaster + Pompeii wall |
| taipei-real | 0 | _pending — geographic ground truth_ |
| imperfection | 0 | _pending — anti-sheen library_ |

Designer DNA represented in current batch: Vervoordt (wabi-sabi luxury, patinated walls, raw linen, weathered oak, antique objects). Pending: Van Duysen, Dirand, Pawson when verified portfolio sources surface.

## Generation workflow (every frame)

1. Pick scene type from PINFORGE office set (establishing, desk, war-room, council, tea, debate, library, still-life, sunset, portrait).
2. Select 1–3 anchors from `references/visual-anchors/` that match the desired light, materials, mood.
3. Write a short, physical prompt (max 120 words). Cite this lock file by name.
4. Run `image_generation` with anchors as `image_urls`. Pick 2 different models, 2 variants each.
5. Human cut: pick the frame with the most genuine imperfection.
6. Edit-mode regenerate to add one flaw (cable, coffee ring, motion blur on a hand).
7. Post-process via code: strip EXIF, add Portra 400 grain, micro-rotate crop 0.3–0.7°.
8. Hand-finish in Capture One: dodge/burn one zone, paint out one cliché, grade one channel.
9. Run sheen-verify gate. Score must be ≥ 75 to ship.
10. Log to `.nw-sheen-history.json` with the gate result.

## Companion file — geography & altitude tells

`references/AI-TELLS-GEOGRAPHY.md` — running list of altitude/location/architecture defaults the model gets wrong. Every Taipei-bound prompt must scan this file and explicitly negate the relevant TELL-IDs (e.g. `Avoid: scooter traffic streaks, steel-mullion windows, oversized brand plaque — TELL-TPE-001/002/003`).

The corpus grows every time we catch a new tell. First entries cover scooter visibility from high floors, curtain-wall vs steel-mullion windows, oversized brand plaques, the olive-tree-leather-chair cliché stack-up, and generic "Asian skyline" silhouettes.

## Cite-this-file rule

Any prompt sent to a generation tool for a PINFORGE-bound image MUST include the line:

> `Visual lock: references/PINFORGE-VISUAL-LOCK.md + AI-TELLS-GEOGRAPHY.md — paper #EFE7D6, sumi #1A1612, oxidized brass #8B6F3A, cinnabar #9B2C2C; Taipei tower real-camera language; no luxury-keyword stacking; negate applicable TELL-IDs.`

This forces the operator to acknowledge the lock and gives the reviewer a single artifact to check against.
