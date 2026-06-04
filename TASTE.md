# TASTE.md: The NumbahWan Group Taste Constitution

> The one file that defines what *good* means here, for **everything** we make:
> software, apps, landing pages, images, video, and physical objects we have not
> built yet (3D-printed product, packaging, anything).
>
> Style changes per brand and per medium. **Taste does not.** This file is the
> taste. The medium playbooks below tell you how it becomes concrete in CSS, in
> a render, in a print.
>
> If you are an AI working in this repo: read this before you make anything that
> a human will look at. Then read the playbook for your medium.

Last updated: 2026-06-02

---

## The one line

**Precision you feel but can't see.**

Everything in this file is a way of unpacking that sentence.

---

## The feeling we are paying for

Every product should feel like it had **an unlimited budget and a director who
obsessed over every frame.** Multi-billion-dollar production value.

The budget shows up as **craft, atmosphere, and execution**, never as bling.
Expensive because it is genuinely well-made, not because it is gold-plated.

There is a real difference between *luxury* and *production value*:

- **Luxury** announces money. Gold, marble, big serif, "premium" stamped on it.
- **Production value** spends money where you can't point at it: the timing, the
  atmosphere, the detail that took ten hours and that you only notice because
  something would feel wrong if it were missing.

We want production value. The second a thing looks like it is *trying* to seem
expensive, it has failed.

---

## The north star: blockbuster + keynote

Two reference points, held at the same time:

- **Blockbuster** (Inception, a Stephen King adaptation done right): alive,
  atmospheric, immersive. Things breathe. The world feels real enough to fall
  into. Money is on screen as *atmosphere*, not as decoration.
- **Keynote** (an Apple-event-level product reveal): clean, confident, every
  element intentional. Nothing moves, exists, or takes up space without a
  reason.

The magic is **both at once.** Immersive *and* disciplined. A page that breathes
but never wastes a motion. An object that feels alive in the hand but has no
detail that isn't earning its place.

Lose either side and you fall off:
- All blockbuster, no keynote → busy, over-produced, motion for its own sake.
- All keynote, no blockbuster → cold, sterile, forgettable.

---

## The three references, as working principles

These are the films/shows the founder named. Each one is a rule in disguise.

### 1. King: grounded specificity

Stephen King's worlds work because the ordinary is *specific*. The exact small
town, the exact brand of cigarette, the real-feeling person. The dread lands
because the ground is solid first.

**The rule:** concrete over abstract. Real numbers, real materials, real
details. "500 beds" not "state-of-the-art." A real photograph, not a render of
a vibe. Build the believable mundane first; the wow comes after.

### 2. Inception: engineered precision

Inception rewards attention. Every detail is load-bearing, the internal logic
holds, nothing is random, and the payoff snaps shut. It is precision-engineered
and you can feel the engineering even when you can't see it.

**The rule:** nothing wasted. Every element has a job. Layouts have internal
logic. Motion has timing that is *exactly* right (the 80ms stagger, the weighted
ease). When you take something away and it gets worse, it was load-bearing, so
keep it. When you take it away and nothing changes, it was decoration, so cut it.

### 3. South Park: smarter than it looks

South Park looks crude on purpose and is razor-sharp underneath. The simplicity
is a *choice*, the timing is flawless, and it is far more intelligent than the
surface lets on.

**The rule, applies to BOTH the visuals and the idea:**
- *Visuals:* the surface can be clean and simple, but it should reward
  attention. Hidden depth, a clever detail, a layer that reveals itself on the
  second look. Simple on top, deep underneath.
- *Substance:* there is always a real idea under the surface. We never ship
  style with nothing behind it.

---

## The two enemies (we reject from opposite sides)

The target is a narrow band. We fail in two directions, and both are banned.

### Enemy 1: Hollow polish
Slick surface, no idea underneath. The award-show website that is all cursor
gimmicks and parallax and says nothing. The "luxury" brand that is all gold
gradient and zero substance. **Style with no idea behind it.**

### Enemy 2: Cheap-looking
Placeholder, amateur, low-budget tells. The things that make a product read as
unfinished or unloved:
- Emoji used as icons
- Placeholder / lorem text shipped to production
- Default / amateur gradients, default shadows, default everything
- Flat opacity-only fades as the entire "motion layer"
- Copy that sounds machine-written (see `tools/ai-tell-corpus.json`)

The target sits between them: **expensive-feeling because it is actually
well-made.**

---

## The meta-rule: coherence

The taste is constant; the *world* is not. NumbahWan and KINTSUGI are different
worlds. A landing page and a 3D-printed object are different media. The skill is
to **fully inhabit one world and never leak.**

- South Park stays South Park. Inception stays Inception. They don't borrow each
  other's surface.
- Ember orange never touches a KINTSUGI page. KINTSUGI gold never touches an NW
  page. (This is the **#1 documented way an AI breaks this repo**; see
  `AGENT-CONTEXT.md` L014.)
- A physical object and a webpage can share *taste* without sharing *style*.

Coherence is itself the highest expression of taste here: the discipline to
commit completely to the world you're in.

---

## How to apply this to ANY medium

This file is pitched above CSS on purpose, so it survives into media we haven't
built. To apply it, ask the same questions regardless of what you're making:

1. **Is it grounded?** (King). Real details, real materials, concrete over
   abstract. Would a real expert in this domain find it believable?
2. **Is anything wasted?** (Inception). Remove each element in your head. If the
   thing doesn't get worse, cut it. Every survivor must be load-bearing.
3. **Does it reward a second look?** (South Park). Clean surface, hidden depth,
   a real idea underneath. Not crude *and* not empty.
4. **Does it feel made, or assembled?** Production value lives in the parts you
   can't point at: timing, atmosphere, the last 10%.
5. **Does it fully belong to its world?** (coherence). No leaks, no defaults, no
   borrowed surface from another brand or medium.
6. **Which enemy is it closer to right now**, hollow polish or cheap-looking,
   and fix toward the middle.

If you can answer all six well, it has taste. If you can't, it doesn't yet,
whether it's a button, a hero section, or a printed object.

---

## Enforcement: a bar always, a block for the unforgivable

Taste is **aspirational by default**. Every product reaches for the whole
constitution above, and most of it is judgment a gate can't measure.

A small set of failures are bad enough to **hard-block a commit**, because they
are the cheap-looking / off-coherence tells we never knowingly ship:

- Machine-sounding copy → blocked by `tools/ai-tell-lint.cjs` (pre-commit)
- Brand-aesthetic leak (ember on KINTSUGI, gold on NW) → blocked by design guard
- Placeholder / lorem text in a production page
- Emoji standing in for an icon in a shipped UI

Everything else is the bar: reach for it, review against it, and when a reviewer
flags a new failure, **add it to the relevant playbook or corpus so the bar gets
smarter.** The standard rises; we don't re-learn the same lesson twice.

---

## Medium playbooks: how the constitution becomes concrete

`TASTE.md` says *what good is*. These say *how to do it in a specific medium.*
When you build, read the one for your medium **after** this file.

| Medium | Playbook | Governs |
|---|---|---|
| **Producing natural content (all media)** | [`FORGE-DOCTRINE.md`](FORGE-DOCTRINE.md) + `node bin/ai.cjs forge` | The production half (corpus files are detection). `forge kit "<company> <industry>"` spins up a PINFORGE-grade visual kit for ANY industry, fast; `forge check <url>` judges the sheen FOR you + the one fix. Specific, uneven, imperfect. |
| Motion / interaction | [`references/MOTION-CRAFT.md`](references/MOTION-CRAFT.md) | How things move and feel; GSAP/Lenis stack; iOS; reversible scroll |
| Still imagery (PINFORGE) | [`references/PINFORGE-VISUAL-LOCK.md`](references/PINFORGE-VISUAL-LOCK.md) | The hand-built lock for ONE world (Taipei). For a NEW world, `forge` generalizes its method (camera physics + imperfection) so you start at PINFORGE's finish line. |
| Geographic/render truth | [`references/AI-TELLS-GEOGRAPHY.md`](references/AI-TELLS-GEOGRAPHY.md) | Location/altitude/architecture tells to negate |
| Copy / language | [`tools/ai-tell-corpus.json`](tools/ai-tell-corpus.json) + [`BUILD-DOCTRINE.md`](BUILD-DOCTRINE.md) §4 | Words that sound machine-written, in EN/ZH/JA/TH |
| Build process | [`BUILD-DOCTRINE.md`](BUILD-DOCTRINE.md) | How we ship; friction we've already solved |
| Brand systems | [`AGENT-CONTEXT.md`](AGENT-CONTEXT.md) | NW vs KINTSUGI tokens, fonts, the no-leak rule |
| Physical / 3D print | _(to be written when we build the first object)_ | Material honesty, tolerances, finish (same six questions) |

When a new medium appears (a 3D-printed product, packaging, a game trailer),
write its playbook as a child of this file. The constitution does not change. The
playbook translates it.
