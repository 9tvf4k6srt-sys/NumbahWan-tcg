# Motion Craft

The standard for how things move and feel on every page we ship. Companion to `PINFORGE-VISUAL-LOCK.md` (which governs still imagery), `BUILD-DOCTRINE.md` (which governs build process), and `references/LANDING-3D.md` (which governs the WebGL layer that rides on this scroll system). This file governs motion, interaction feel, and the difference between a page that looks finished and one that feels alive.

Last updated: 2026-06-01

---

## Why this exists

Our pages reach for premium and land at "work in progress." The gap is almost never the colors or the copy. It is motion. A static layout with a few CSS fades reads as a template. A layout where every element enters with intent, responds to the cursor, and reacts to scroll position reads as a product someone obsessed over.

`invest.html` is the current evidence: strong palette, real photography direction, zero GSAP, four reveal-on-scroll observers, and CSS transitions. That is the floor. This file is how we reach the ceiling.

---

## The stack we use

Vanilla pages, no build step, served from `public/`. Motion comes from GSAP over CDN. The whole library is free now, including ScrollTrigger, Flip, SplitText, ScrollSmoother, and the rest.

Load order in `<head>` (defer everything, pin versions):

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/Flip.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/SplitText.min.js" defer></script>
```

For smooth scroll use Lenis (lighter, more reliable on iOS than ScrollSmoother):

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" defer></script>
```

Lenis is not on cdnjs at this path; use jsdelivr or unpkg. The UMD build exposes the global as `Lenis`, so `window.Lenis` is the guard to check.

Register plugins once, after load:

```js
gsap.registerPlugin(ScrollTrigger, Flip, SplitText);
```

---

## The seven things that separate amateur from world-class

### 1. Nothing pops in. Everything arrives.
Opacity-only fades are the giveaway of a template. Real entrances combine position, a touch of scale, and a stagger. Elements should look like they were placed by a hand, slightly late, slightly soft.

```js
gsap.from('.hero-line', {
  yPercent: 120, opacity: 0, duration: 1.1,
  ease: 'expo.out', stagger: 0.08
});
```

The `stagger` is what sells it. A row of items entering at the same instant looks scripted. The same row entering 80ms apart looks choreographed.

### 2. The easing carries the personality.
`ease: 'power2.out'` is the default and it is forgettable. Pick easing that matches the brand voice. Heavy, expensive things settle with `expo.out` or `power4.out`. Playful things use `back.out(1.6)` for a tiny overshoot. Mechanical things use `steps()`. For a wealth firm, motion should feel weighted and unhurried, never bouncy.

Build a custom ease once per brand and reuse it:

```js
CustomEase.create('pinforge', 'M0,0 C0.16,1 0.3,1 1,1'); // slow settle
```

### 3. Scroll is a timeline, not a trigger.
Reveal-on-scroll (fire once when in view) is table stakes. The next level is *scrubbing*: tying an animation's progress directly to scroll position so the user scrubs it like a video. Parallax depth, a number counting up, a line drawing itself, a panel pinning while content scrolls past.

```js
gsap.to('.ledger-rule', {
  scaleX: 1, transformOrigin: 'left',
  scrollTrigger: { trigger: '.ledger', start: 'top 70%', end: 'bottom 60%', scrub: 1 }
});
```

`scrub: 1` (a one-second catch-up) feels more expensive than `scrub: true` (instant). The slight lag reads as weight.

#### Scroll back and forth: replay and unwind

Every GSAP tween runs backward as cleanly as forward, so reversible motion is free once you choose the right trigger mode. There are two distinct feels, and they answer two different questions.

**Welded to the wheel (`scrub`).** The scroll position *is* the playhead. Scroll down, it plays forward; scroll up, it runs in reverse, at exactly the speed of your wheel. Use this when the motion *is* the content: a progress bar, a counter, a line drawing itself, a pinned panel sliding sideways. The unwind is automatic because progress is a function of scroll, not of time.

```js
gsap.to('#bar', {
  scaleX: 1, transformOrigin: 'left', ease: 'none',
  scrollTrigger: { trigger: '#sec', start: 'top 80%', end: 'bottom 60%', scrub: 1 }
});
```

**Replay on re-entry (`toggleActions`).** The tween plays at its own speed, but a four-slot trigger decides what happens at each boundary. The slots map to `onEnter | onLeave | onEnterBack | onLeaveBack`. The phrase to remember is `'play reverse play reverse'`: it plays in when you arrive, reverses out when you leave downward, plays again when you scroll back up into it, and reverses out when you leave upward. Scroll past a section and come back, and it greets you again instead of sitting there already-done.

```js
gsap.from('.card', {
  y: 40, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08,
  scrollTrigger: {
    trigger: '.cards', start: 'top 70%', end: 'bottom 30%',
    toggleActions: 'play reverse play reverse'
  }
});
```

Pick by intent. If you want a "did I miss something? let me scroll back" reward, use `toggleActions`. If you want the user to feel they are operating a machine with the wheel, use `scrub`. The common mistake is `once: true` everywhere, which fires the reveal one time and leaves a dead section on the way back up. We are moving away from `once: true` for any reveal a user is likely to scroll past twice.

A live, commented gallery of all five patterns (scrub bar, replay cards, pinned horizontal, draw/undraw line, reversible counter with parallax) lives at `public/dev/motion-lab.html`. Scroll it down, then back up, to feel each one. The code for every demo sits in a comment directly above it.

### 4. The page responds to the cursor before it is clicked.
Hover states that only change color are dead. A premium surface tilts toward the cursor, a magnetic button leans into the pointer, a card lifts and casts a deeper shadow. Keep it subtle. 6 to 10 pixels of movement, never more.

```js
card.addEventListener('pointermove', e => {
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  gsap.to(card, { rotateY: x * 6, rotateX: -y * 6, duration: 0.4, ease: 'power2.out' });
});
card.addEventListener('pointerleave', () =>
  gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'power3.out' }));
```

These are pointer events, so they cost nothing on touch devices where they never fire. On desktop they make the page feel responsive to a human.

### 5. Type is an actor.
Headlines should not just appear. Split them by character or word and bring them in with a stagger and a clip mask, so each line wipes up from behind an invisible edge. SplitText does the splitting; an `overflow:hidden` wrapper does the mask.

```js
const split = new SplitText('.headline', { type: 'lines', linesClass: 'line' });
gsap.set('.line', { yPercent: 120 });
gsap.to('.line', { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.1 });
```
```css
.headline { overflow: hidden; }
.line { display: block; }
```

### 6. Layout changes are animated, not swapped.
When a filter reorders cards, a tab switches a panel, or an item moves between two states, do not hard-cut. Record the position before, change the DOM, then let Flip animate the difference. This single technique is what makes interfaces feel engineered rather than assembled.

```js
const state = Flip.getState('.grid-item');
grid.classList.toggle('filtered');           // DOM rearranges instantly
Flip.from(state, { duration: 0.7, ease: 'power3.inOut', stagger: 0.03 });
```

### 7. The first three seconds are the whole impression.
A page gets judged before the user reads a word. Spend the most motion budget on the opening sequence: an orchestrated timeline where the background settles, the headline wipes in, the nav fades down, and the hero image scales from 1.06 to 1.0 over a slow beat. One `gsap.timeline()` controls the entire overture so the timing is deliberate, not the sum of separate animations racing each other.

```js
const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
intro.from('.hero-img', { scale: 1.06, duration: 1.6 })
     .from('.line',     { yPercent: 120, stagger: 0.1, duration: 1 }, '-=1.2')
     .from('.nav',      { y: -20, opacity: 0, duration: 0.8 }, '-=0.8')
     .from('.hero-cta', { opacity: 0, y: 16, duration: 0.7 }, '-=0.5');
```

---

## Non-negotiable constraints

**iOS first.** Every motion choice is tested at 375px on Safari before desktop. `touchend` and `click` both fire, so guard taps with a flag. Never autoplay audio. Use `transform` and `opacity` only for anything that animates on scroll; animating `top`, `left`, `width`, or `height` thrashes layout and stutters on a phone.

The trap that makes scroll-linked motion silently dead on iPhone: Safari's address bar hides and shows as you scroll, which resizes the viewport and shifts every `start`/`end` you measured, so triggers fire at the wrong place or never. The fix every scroll-driven page needs:

```js
ScrollTrigger.normalizeScroll(true);            // hand scrolling to ScrollTrigger
ScrollTrigger.config({ ignoreMobileResize: true });
// every scrubbed tween:
scrollTrigger: { /* … */ scrub: 1, invalidateOnRefresh: true }
// recompute after chrome + fonts settle:
window.addEventListener('load', () => ScrollTrigger.refresh());
setTimeout(() => ScrollTrigger.refresh(), 600);
```

On touch, keep native scrolling (`smoothTouch: false`) so the phone stays buttery, but understand the consequence: Lenis only emits its `scroll` event for scrolls it controls, so on a phone its `lenis.on('scroll', ST.update)` never fires and every scrubbed effect freezes. Feed ScrollTrigger off the native stream instead. And do not `pin` a wide horizontal track inside a 375px viewport: a pinned section that is wider than the phone reads as a stuck, frozen screen. Gate pinning behind `matchMedia('(pointer:fine)')` plus a width check, and let the panels scroll normally on mobile.

```js
const isTouch = matchMedia('(pointer:coarse)').matches
  || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (window.Lenis && !isTouch) {
  const lenis = new Lenis({ duration: 1.0, smoothWheel: true, smoothTouch: false });
  lenis.on('scroll', () => ScrollTrigger.update());     // desktop owns the wheel
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
} else {                                                  // phones / tablets
  addEventListener('scroll', () => ScrollTrigger.update(), { passive: true });
  gsap.ticker.add(() => ScrollTrigger.update());          // safety net per frame
  gsap.ticker.lagSmoothing(0);
}
```

**Honor reduced motion.** Wrap the heavy choreography so it degrades to instant for users who ask for it. This is an accessibility requirement, not an option.

```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  gsap.globalTimeline.timeScale(100); // collapse everything to near-instant
} else {
  buildIntro();
}
```

**Performance budget.** A page should hold 60fps while scrolling on a mid-range phone. Promote animated layers with `will-change: transform` only while they animate, then remove it. Kill ScrollTriggers that are off-screen on long pages. Never run more than a handful of scrubbing triggers at once.

Two mistakes caused real lag on PINFORGE and are now banned:

1. **One trigger per element on a long page.** A 22-section page where every heading, paragraph, and tile got its own ScrollTrigger meant 200+ triggers updating on scroll. Use `ScrollTrigger.batch()` so a single observer reveals a whole group, and cap how many children you animate per section (4 on mobile, 8 on desktop). Reach for batch the moment a reveal pattern repeats across many sections.

2. **`ScrollTrigger.normalizeScroll(true)` together with Lenis.** They both want to own the scroll stream and fight each other, which stutters. Pick one. We use Lenis for smoothing and leave normalizeScroll off; `ScrollTrigger.config({ ignoreMobileResize: true, fastScrollEnd: true })` plus a `refresh()` on load and after a short settle covers the iOS address-bar problem without it. Only use `normalizeScroll` on a page that has no Lenis.

3. **Trusting `lenis.on('scroll', ST.update)` on touch.** With `smoothTouch: false`, the phone scrolls natively and Lenis never emits that event, so ScrollTrigger goes stale and every scrubbed effect (a travelling logo, a progress bar, a counter) freezes on iPhone even though it works perfectly on desktop. Detect touch (`pointer:coarse` / `ontouchstart` / `maxTouchPoints`, never width alone, or a landscape phone slips through) and on touch feed `ScrollTrigger.update()` from the native `scroll` event plus the GSAP ticker. Verify scrub effects on a real touch viewport, not just a narrow desktop window.

A travelling overlay (like a logo that flies down the page) must be **one** scrubbed tween driving a state object, never a stack of per-dock triggers, and it should be desktop/fine-pointer only: on a phone a fixed moving layer competes with the small viewport and costs frames for little payoff.

**Restraint reads as luxury.** The instinct when learning GSAP is to animate everything. The opposite is correct. Choose three or four moments per page that earn motion: the overture, one scroll-scrubbed reveal, one Flip interaction, one cursor response. Everything else stays still so those moments land. A page where everything moves feels cheap. A page where the right things move feels expensive.

---

## How we work now (the process change)

Visual quality stopped being an accident the moment we wrote down imagery rules in the visual lock. Motion gets the same treatment.

1. **Storyboard the motion before coding.** One paragraph per page section: what enters, how, in what order, what responds to scroll, what responds to the cursor. No code until the choreography is described in words.
2. **Build the overture first.** The opening timeline is the highest-leverage work. Get it right before touching the rest of the page.
3. **Reference, do not invent.** Before building a section, find a site that does that interaction well (Awwwards, Codrops, the GSAP showcase) and name what specifically makes it feel good. Match the principle, not the pixels.
4. **Record the motion in the page header.** Same as the shared-module convention: a comment block at the top of the page's script naming the timeline structure and the easing used, so the next session continues the voice instead of restarting it.
5. **Verify on device.** Screenshot and, where possible, capture the page at 375px. A scroll animation that reads well in a static screenshot can still stutter on a phone; the build is not done until it has run on the target viewport.

---

## The copy that rides on top

Motion and words ship together. All authored copy passes `npm run lint:ai-tell` (exit 0) before commit. The house bans, enforced by `tools/ai-tell-corpus.json`:

- No em-dashes in prose. Rewrite with a colon, a comma, two sentences, or parentheses.
- No "delve", "nuanced", "intricate", "multifaceted", "underpin".
- No "not X, it's Y" reframes. State Y and stop.
- Avoid stacked rule-of-three lists. Vary to two items or four, or change sentence length.

Write the way a sharp person talks. Short subject, real verb, concrete noun. Cut the windup. Say the thing.

The gate has two stages. The regex pass (`node tools/ai-tell-lint.cjs`) runs on every commit: fast, offline, catches the tells already in the corpus across English, Chinese, Japanese, and Thai. The deep pass (`node tools/ai-tell-lint.cjs --naturalness`) reads the prose with a model and scores how human it sounds in its own language, catching the seams no regex can name. Run the deep pass before shipping any page with translated copy. A block scoring under 80 has a draft smell; the report hands you a rewrite in the same language.
