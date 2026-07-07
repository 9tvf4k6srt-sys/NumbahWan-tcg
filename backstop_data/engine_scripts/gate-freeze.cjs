/**
 * gate-freeze.cjs: Backstop onReady script that makes motion-heavy pages
 * capture deterministically. Runs in the Playwright page context AFTER load,
 * BEFORE screenshot.
 *
 * What it freezes and why:
 *  1. prefers-reduced-motion emulation: the repo's own doctrine ladder
 *     (MOTION-CRAFT, LANDING-3D) makes pages render an honest static state
 *     under reduced motion, so we lean on infrastructure that already exists.
 *  2. GSAP global timeline + ScrollTriggers: paused and forced to progress 1
 *     (settled end state), covering pages that gate motion on JS not media query.
 *  3. CSS animations/transitions: killed via injected style.
 *  4. Videos: paused at frame 0; autoplay heroes otherwise never match.
 *  5. Onboarding overlay: dismissed (same trick the QA protocol in CLAUDE.md uses).
 *  6. Scroll: pinned to top; Lenis stopped if present.
 */
module.exports = async (page, scenario) => {
  // 1. reduced-motion BEFORE any further JS runs its checks again
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.evaluate(() => {
    // 5. overlays that block the fold
    document.getElementById('nw-onboarding')?.remove();
    try { localStorage.setItem('nw_onboarding_complete', '1'); } catch { /* private mode */ }

    // 3. kill CSS motion; blank canvases (rAF particle/WebGL surfaces are
    //    nondeterministic per frame AND per runner GPU: the layout box still
    //    participates in the diff, so size/overlap breakage is caught, only
    //    the unstable pixels inside are excluded)
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-play-state: paused !important;
        animation-delay: 0s !important;
        transition: none !important;
        caret-color: transparent !important;
      }
      html { scroll-behavior: auto !important; }
      canvas { visibility: hidden !important; }
    `;
    document.head.appendChild(style);

    // stop rAF loops so nothing keeps mutating the DOM after freeze
    window.requestAnimationFrame = () => 0;

    // 2. settle GSAP-driven motion at its end state
    const g = window.gsap;
    if (g) {
      try {
        g.globalTimeline.pause();
        const ST = window.ScrollTrigger;
        if (ST && ST.getAll) {
          for (const t of ST.getAll()) {
            try { t.animation && t.animation.progress(1).pause(); } catch { /* per-trigger */ }
          }
        }
        g.globalTimeline.progress(1);
      } catch { /* pages without timelines */ }
    }

    // 6. stop smooth scroll and pin to top
    try { window.__nwLenis && window.__nwLenis.stop && window.__nwLenis.stop(); } catch { /* no lenis */ }
    window.scrollTo(0, 0);

    // 4. freeze media
    for (const v of document.querySelectorAll('video')) {
      try { v.pause(); v.currentTime = 0; } catch { /* cross-origin */ }
    }
  });

  // 7. wait for every image the viewport can see to finish DECODING, not
  //    just loading: half-painted card art was the last flake source.
  await page.evaluate(async () => {
    const imgs = [...document.images].filter((i) => {
      const r = i.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight && i.src;
    });
    await Promise.all(imgs.map((i) =>
      (i.complete ? i.decode() : new Promise((res) => {
        i.onload = () => i.decode().then(res, res);
        i.onerror = res;
      })).catch(() => {})
    ));
  }).catch(() => {});

  // let the frozen state paint
  await new Promise((r) => setTimeout(r, 400));
};
