# Landing Cinematic

The playbook for landing pages that read as a short film, not a template.
Child of `TASTE.md` (what good is) and sibling of `references/MOTION-CRAFT.md`
(how things move) and `references/LANDING-3D.md` (when and how a page earns a
WebGL canvas). This file governs the *structure and production discipline*
of a landing page: narrative beats, hero media, performance budgets, and the
fallback ladder. The enforcement half lives in `tools/landing-lint.cjs`.

Last updated: 2026-07-06

---

## The one rule

**Treat the page as a short film with 3–5 beats.** Everything else in this
file exists to protect that: the beats are the content, the hero is the hook,
performance is the projector, and fallbacks are the second screening for
people whose projector is smaller.

---

## 1. Narrative structure — beats, not sections

A landing page is not a stack of `<section>`s. It is a sequence of **beats**
that follow an arc (ours is usually *assembly → explosion → reassembly*, or
more generally *chaos → precision → mastery*).

- **3–5 beats.** Fewer reads as a brochure; more reads as a scroll marathon.
- Each beat has one job: one idea, one visual, one line of copy that mirrors
  the visual. Copy and visual tell the same story or the beat is cut.
- The first beat (hero) must land its hook in **3–5 seconds**: visual impact
  first, copy legible immediately, CTA visible *while* the hero media plays —
  never below the fold, never waiting for an animation to finish.
- The last beat resolves the arc and repeats the CTA. Supporting beats deepen
  the story; they never repeat the hero's claim in different words.
- Visual language is continuous across beats: same palette progression, same
  lighting direction, same easing personality (see MOTION-CRAFT §2). A beat
  that looks like it came from a different page *is* from a different page.

In the spec (`landing-page` type), this is the `beats:` array. The generator
enforces the 3–5 count as a warning and renders the arc with alternating
composition so the scroll has rhythm.

## 2. Hero media — video for the hook, 3D for the core

- **Hero video ≤ 4 MB.** Hard budget, enforced by `landing-lint`. WebM
  primary + H.264 MP4 fallback, both listed as `<source>` children.
- `autoplay muted playsinline loop` + a **poster** image. The poster is not
  optional: it is the LCP candidate, the reduced-motion fallback, and the
  low-bandwidth experience all at once. Poster ships as WebP (repo rule,
  BUILD-DOCTRINE §1.2).
- Explicit `width`/`height` (or `aspect-ratio`) on every media element — CLS
  is a budget, not a suggestion.
- Hero media gets `preload="metadata"`, everything below the fold gets
  `loading="lazy"` / `preload="none"`.
- Interactive 3D (`<canvas>`) is the memorable core, not the hook. It loads
  lazily after first paint, carries `role="img"` + `aria-label`, an on-screen
  interaction cue ("Scroll to explore the transformation"), and keyboard
  access to whatever the pointer can do. The full 3D doctrine (the three
  patterns, the lifecycle contract, the device ladder) lives in
  `references/LANDING-3D.md`; the runtime that enforces it is
  `/static/nw-3d.js`, and `landing-lint` D-rules gate the failures.
- Text content inside video must also exist as on-screen text or a
  `<track kind="captions">`. No information lives only in pixels.

## 3. The fallback ladder (every rung mandatory)

```
full experience      video hero + lazy 3D + scroll choreography
prefers-reduced-motion  poster image, no autoplay, no scroll scrubbing
low GPU / data-saver    poster or pre-rendered short video, no canvas
no JS                   poster + copy + CTA still deliver the pitch
```

For pages with a 3D beat, `nw-3d.js` walks the middle rungs automatically:
its capability check (reduced motion, Save-Data, WebGL, device memory) runs
before the Three.js library ever downloads, so a failed rung costs zero
bytes. See LANDING-3D §6 for the per-device scene ladder.

- `@media (prefers-reduced-motion: reduce)` must exist in CSS **and** the
  JS motion layer must check `matchMedia('(prefers-reduced-motion: reduce)')`
  before registering scroll animation.
- The no-JS rung is free if the hero markup is honest: real `<img>`/poster,
  real text, real link CTA. Never render the pitch with JS.

## 4. The film layer — post, not polygons

The "shot on film" feel comes from post-processing, not asset weight:
subtle grain, vignette, a color-grade tint, and weighted easing. All four are
CSS/canvas-cheap and live in `nw-landing.css` as the `.nw-film` layer.

- Grain: an SVG-noise overlay at 2–4% opacity, `mix-blend-mode: overlay`.
- Vignette: radial-gradient overlay, never darker than 35% at the corners.
- Grade: one tint per page, applied as a low-opacity overlay — pick it from
  the brand world and never mix worlds (TASTE.md coherence rule).
- Easing: heavy things settle (`expo.out`), scrub with `scrub: 1` not
  `scrub: true` (MOTION-CRAFT §3). Opacity-only fades remain banned
  (aitell L4).

Sound is a differentiator but always opt-in: page loads muted, the toggle is
visible, state persists in `localStorage`, and nothing essential is
audio-only.

## 5. Performance budgets (enforced)

| Asset | Budget | Enforced by |
|---|---|---|
| Hero video | ≤ 4 MB | `tools/landing-lint.cjs` (blocking) |
| Page HTML | ≤ 200 KB | `bin/quality-scorecard.cjs` |
| Total page weight | ≤ 2 MB | `tools/build-budget.cjs` |
| 3D assets | Draco/meshopt compressed, lazy | `landing-lint` (D5 warn) |
| 3D lifecycle | guard, lazy import, dispose | `landing-lint` (D1–D3 block) |
| Images | WebP, lazy below fold | scorecard + BUILD-DOCTRINE |

Core Web Vitals targets: LCP ≤ 2.5 s (the poster, not the video), CLS < 0.1
(explicit dimensions), INP < 200 ms (no scroll-jacking on input).

## 6. Ship checklist

Run before any landing page merges:

```bash
node tools/landing-lint.cjs public/<page>.html   # cinematic gate (blocking)
node bin/quality-scorecard.cjs <page>            # ≥ 90 (A)
npx aitell all public/<page>.html                # no machine tells
npm run test:i18n                                # translations intact
```

Then the judgment half, from TASTE.md's six questions — a gate can't measure
whether the arc lands, whether the beat copy mirrors the visuals, or whether
the page feels *made* rather than assembled. Review on a real phone, with
bandwidth throttled, before calling it done.
