# Landing 3D

The playbook for interactive 3D on landing pages. Child of `TASTE.md` (what
good is), sibling of `references/MOTION-CRAFT.md` (how things move) and
`references/LANDING-CINEMATIC.md` (page structure and budgets). This file
governs the WebGL layer: when a page earns a `<canvas>`, which of three
patterns it uses, and the lifecycle contract that keeps it fast, accessible,
and leak-free. The runtime half lives in `public/static/nw-3d.js`; the
enforcement half lives in `tools/landing-lint.cjs` (D-rules).

Last updated: 2026-07-06

---

## The one rule

**One strong idea, executed with restraint.** A single hero object that
responds to scroll beats a busy composition every time. The 3D layer is the
memorable core of the page, never the pitch. Copy, CTA, and navigation must
work with the canvas deleted. If removing the 3D breaks the page, the page
is broken.

---

## 1. When a page earns 3D

3D costs bytes, battery, and build time. It has to pay rent:

- The page's subject has a physical form worth exploring (a product, a
  machine, a world, an emblem).
- Scroll can drive a transformation that words alone cannot sell.
- The team can afford the profiling pass. No profiling, no canvas.

If the honest answer is "it would look cool", use a pre-rendered video
instead. LANDING-CINEMATIC §2 already covers that path, and video is
cheaper on every axis: weight, mobile, accessibility, maintenance.

## 2. The three patterns

Every 3D landing page we ship is one of these. Pick one. Mixing two on the
same page fails the restraint rule.

### Pattern 1: scroll-scrubbed hero object

One primary object (or a small scene) inside a pinned hero. Scroll drives
camera depth or object rotation through a scrubbed GSAP timeline. Headline
and CTA overlay in HTML and animate in parallel (SplitText lines per
MOTION-CRAFT §5). The pointer adds a subtle tilt or reveal on desktop.

- The object is the hook's depth, never the hook itself. The poster and
  copy carry the first 3 seconds; the canvas fades in after first paint.
- Camera moves on the Z axis or the object rotates. One motion verb, held
  for the whole scrub. Two verbs read as indecision.
- Pointer interaction stays within MOTION-CRAFT §4 limits: subtle, desktop
  only, spring back on leave.

### Pattern 2: sequenced narrative scenes

A long scroll container divided into the page's beats (3 to 5, per
LANDING-CINEMATIC §1). One master scrubbed timeline drives camera moves,
lighting changes, and scene swaps in lockstep with the copy. The
environment transforms as each beat's text reveals its theme.

- One master timeline, one ScrollTrigger with `scrub: 1`. Per-beat labels
  on the timeline keep DOM and 3D on the same playhead. Never run parallel
  scene timelines that can drift apart.
- Scene swaps happen at beat boundaries, hidden inside a camera move or a
  lighting dip. A visible pop between scenes breaks the film.
- This is the expensive pattern. Budget it like a hero video times three
  and profile every beat on a mid-range phone before adding the next.

### Pattern 3: scroll-revealed shader elements

HTML sections synced to Three.js planes. ScrollTrigger drives shader
uniforms (a reveal sweep, a distortion that settles, a grade that shifts).
The 3D layer is an effect over real content, so the fallback is free: the
plain HTML underneath.

- Uniforms are the only thing scroll touches. Geometry stays static.
- The effect resolves to a legible state. A distortion that never settles
  is decoration, and decoration gets cut (TASTE.md).
- Cheapest pattern by far. When in doubt between patterns, start here.

## 3. The stack

Vanilla pages, no build step, same philosophy as MOTION-CRAFT. Three.js
loads as an ES module over CDN, pinned, and only after the page has
painted:

```js
// inside nw-3d.js, after first paint, only on capable devices
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js');
```

- **Pin the version.** Three.js breaks APIs between minor releases.
  Upgrades are deliberate, tested moves, never a floating `latest`.
- Addons (GLTFLoader, DRACOLoader, EffectComposer) import from the same
  pinned `three@0.166.1/examples/jsm/` path.
- Scroll and DOM motion stay on the GSAP + Lenis stack from MOTION-CRAFT.
  The 3D layer subscribes to scroll progress; it never owns the scroll.
- WebGL is the target. WebGPU is a progressive upgrade to revisit once
  support is boring; until then every shader is GLSL and every renderer is
  `WebGLRenderer`.

### Assets

- Models ship as **GLB with Draco or meshopt compression**. An
  uncompressed `.gltf` with sidecar files never reaches `public/`.
- **Bake the lighting** into textures wherever the scene allows. Baked
  scenes need one ambient plus at most one directional light. Real-time
  shadows are off by default and enabled per object with a reason.
- Textures: power-of-two sizes, 1024px max on anything that is not the
  hero object, WebP or KTX2 sources.
- Budget: total 3D payload (library + model + textures) counts inside the
  2 MB page budget from LANDING-CINEMATIC §5. The library alone is about
  170 KB gzipped, so the scene gets what remains.

## 4. The lifecycle contract

This is the part that separates a page that ships from a page that leaks.
`nw-3d.js` implements it; every hand-rolled scene must match it.

```
capability check ──▶ lazy init ──▶ render on demand ──▶ pause off-screen ──▶ dispose
```

1. **Capability check first.** Before any import: reduced motion, Save-Data,
   WebGL support, and device memory. Any rung fails, the canvas stays
   inert and the poster/HTML fallback carries the beat. This extends the
   LANDING-CINEMATIC §3 ladder down into the canvas.
2. **Lazy init.** Three.js imports after `load` (or when the stage nears
   the viewport, whichever comes last). The hero's LCP is the poster;
   nothing 3D may compete with it.
3. **Render on demand.** No unconditional `requestAnimationFrame` loop.
   Render when scroll progress changes, when the pointer moves over the
   stage, or when a tween is mid-flight. A static frame costs zero.
4. **Pause off-screen.** An IntersectionObserver stops all rendering when
   the stage leaves the viewport and resumes it on return.
5. **Dispose on teardown.** Traverse the scene: `geometry.dispose()`,
   every material and texture disposed, `renderer.dispose()`, the WebGL
   context released, ScrollTriggers killed, listeners removed. Memory
   leaks from skipped cleanup are the most common failure in scroll sites,
   and they are invisible until a user keeps the tab open.

## 5. The scroll bridge

One progress value drives everything. DOM reveals, camera position, and
shader uniforms all read from the same scrubbed ScrollTrigger, so they can
never drift:

```js
gsap.timeline({
  scrollTrigger: { trigger: '#stage', start: 'top top', end: '+=300%',
    pin: true, scrub: 1, invalidateOnRefresh: true },
  onUpdate() { stage.setProgress(this.progress()); }  // 3D reads, never listens to scroll
});
```

- `scrub: 1`, never `scrub: true` (MOTION-CRAFT §3: the catch-up lag reads
  as weight).
- The 3D side exposes one `setProgress(p)` and maps p to camera position,
  rotation, or uniforms internally. Scroll logic never lives inside the
  scene module.
- All iOS constraints from MOTION-CRAFT apply unchanged: Lenis on desktop,
  native scroll feed on touch, `ignoreMobileResize`, refresh after load.
  Never `normalizeScroll(true)` alongside Lenis.

## 6. The device ladder

```
desktop, fine pointer   full scene + pointer interaction + postFX
capable phone           simplified scene: fewer segments, no postFX, no shadows
reduced motion          poster image, canvas never initializes
Save-Data / no WebGL    poster image, canvas never initializes
no JS                   poster + copy + CTA still deliver the pitch
```

- Mobile gets a *designed* simplification, decided during storyboarding,
  never a desktop scene running at 11fps. If the simplified scene is not
  worth building, mobile gets the poster or a short pre-rendered video and
  that is a respectable answer.
- Test the real ladder: a mid-range phone with throttled CPU, not a narrow
  desktop window. MOTION-CRAFT's device-verification rule applies.

## 7. Accessibility (non-negotiable)

- The canvas carries `role="img"`, a real `aria-label` describing what it
  shows, and `tabindex="0"` when it responds to the pointer.
- A visible interaction cue sits on the stage ("Drag to explore",
  "Scroll to reassemble"). Users should never have to guess that a canvas
  is alive.
- Keyboard access mirrors pointer access: whatever drag does, arrow keys
  do too.
- Any information conveyed inside the render also exists as on-screen
  text. Pixels are presentation, never the record.

## 8. Don'ts

- **No high-poly overload.** Budget draw calls and polys during
  storyboarding. Excess lights, unoptimized particles, and real-time
  physics are how a page ends up hot in the hand and janky on scroll.
- **Never gate core content, navigation, or the CTA behind 3D.** The
  conversion path works with WebGL off.
- **No skipped cleanup.** A scene without a dispose path does not merge.
  `landing-lint` warns on scene modules missing `dispose`.
- **No copying effects without profiling.** A shader lifted from a demo
  gets a Performance-panel pass on a throttled device before it ships.
- **No autoplaying heavy animation for reduced-motion users.** The
  capability check runs before the library ever downloads.
- **No second render loop.** One renderer, one demand-driven loop per
  page. A hidden always-on rAF is a battery bug.
- **No scroll hijack from the canvas.** `touch-action: pan-y` on the
  canvas, and pinned sections follow the MOTION-CRAFT mobile pinning
  rules.

## 9. How we build (the process)

1. **Storyboard first**, same as MOTION-CRAFT: one paragraph per beat
   describing what the 3D does, what the copy says, and what the fallback
   shows. No code before the choreography is in words.
2. **Build the fallback first.** Poster, copy, CTA, working page. The
   canvas is an enhancement layered on top, which makes rung 4 of the
   ladder free.
3. **Wire the scroll bridge with a placeholder cube** before touching real
   assets. Timing and feel get right on cheap geometry.
4. **Swap in the compressed GLB**, then profile: Chrome Performance with
   4x CPU throttle, draw-call count, memory graph over a full
   scroll-down-scroll-up pass.
5. **Record the scene in the page header comment** (module used, pattern
   number, budgets hit), same convention as MOTION-CRAFT §process.
6. Run the gates: `landing-lint` (D-rules), scorecard, aitell, i18n.

## 10. Live reference

`public/dev/3d-lab.html` holds a working, commented demo of each pattern
built on `nw-3d.js`: the scrubbed hero object, a three-beat narrative
scrub, and a shader reveal. The code for every demo sits in a comment
directly above it, same convention as `public/dev/motion-lab.html`.

Spec integration: a beat in a `landing-page` spec declares
`media: { type: 3d, module: /static/<scene>.js, alt, cue }` and the
generator emits the stage markup plus the `nw-3d.js` runtime, which lazy
loads the scene module when the device qualifies. Scene modules export
`createScene(ctx)` and return `{ setProgress, dispose }`. See the header
of `public/static/nw-3d.js` for the full contract.
