# Detecting machine-made web pages without an LLM

A technical deep dive into `aitell`: how it tells a page a model assembled
from a page a person built, using nothing but regex and string math.

---

## The problem

By 2026 the question is rarely "did a model write this?" It usually did, in
part. The useful question is "does it still *read and look* machine-made?" Those
are different failures, and they hide in different places:

- **Words.** Stock phrases a model reaches for, the kind this linter ships
  patterns for:

  ```text
  delve · tapestry of · testament to · it is worth noting · nuanced
  ```

- **Rhythm.** Even when the words are fine, the *shape* gives it away:
  sentences of near-identical length, paragraphs that all weigh the same,
  connective pile-ups (*moreover, furthermore, consequently*).
- **Pixels.** And even when every word reads human, the *UI* can still shout
  that it was assembled by a model: emoji used as icons, the same indigo→purple
  gradient, framework shadows pasted verbatim.

Most "AI detectors" only look at the first, and most ship the text to another
model to do it. `aitell` looks at all three, and does it offline. The third,
the **visual** layer, is the part we could not find anywhere else.

---

## Why not just ask an LLM?

Three reasons, in order of how much they bite:

1. **Determinism.** A linter that lives in a pre-commit hook and a CI gate has
   to give the same answer every time. An LLM does not. "Sometimes red,
   sometimes green, same input" describes a coin flip, not a gate.
2. **Cost and latency.** Linting a 1,000-page site should take the time it
   takes to read the files, not 1,000 round-trips and a token bill.
3. **Explainability.** When the gate blocks you, it should point at the exact
   line and name the exact tell, not say "this feels ~73% AI." Every finding
   `aitell` emits carries a rule id, a line number, the matched text, and a fix.

The trade-off is real: regex and heuristics cannot catch a tell they were never
taught. So the design is honest about its lane. It is a **fast, deterministic
first pass**, and the suite it came from keeps an *optional* LLM stage for the
judgement calls. The package itself is the part that has to be instant.

---

## Layer 1: the phrase blocklist (`lintText`)

The simplest layer, and the one everyone expects. A corpus of 167 patterns
across English, 中文, 日本語, and ไทย, each tagged with a severity:

```json
{
  "id": "AIT-EN-FILLER",
  "lang": "en",
  "severity": "high",
  "note": "Empty connective filler; cut it.",
  "patterns": ["\\bdelve into\\b", "\\btapestry of\\b", "\\bit is worth noting\\b"]
}
```

`lintText` flattens the corpus, strips HTML and block comments (a tell inside
`<!-- ... -->` is a dev note, not user copy), then runs each pattern with the
global flag and records every hit with its line number and a 140-char snippet.

The only subtlety worth naming is **comment stripping is opt-out, not baked
in**. A caller scanning raw source (rather than rendered copy) can pass
`{ stripComments: false }` and see the tells inside comments too.

This layer is table stakes. The next two are where it gets interesting.

---

## Layer 2: the visual signature (`lintLayout`)

This is the rare half. The premise: a model assembling a page leaves a
**visual** fingerprint as distinctive as its prose. Six detectors, named L1–L6,
each a pure function of the HTML string (and its extracted CSS).

### L1 · emoji-as-icon, and the one genuinely hard call

The loudest tell is emoji standing in for real UI icons: `🚀` in a button, `🎯`
in a heading. The detector scans `<button>`/`<a>` inner text and the first few
characters of every heading.

But there is a trap. Plenty of *legitimate* UI uses single glyphs as icons: a
`✓` for done, a `→` for next, a `★` for a rating. Those are monochrome
typographic dingbats, not the "AI grabbed an emoji" tell. Flag them and you
punish good design; ignore the whole range and you miss the real signal.

The distinction is in Unicode itself. A glyph is a **colour emoji** if either:

- it sits in the high / astral plane `U+1F000`–`U+1FAFF` (where the actual
  emoji live), **or**
- it is a BMP symbol in a pictographic range *and carries the emoji variation
  selector* `VS16` (`U+FE0F`), which is the codepoint whose entire job is to
  say "render the previous glyph in colour."

```js
const EMOJI_HIGH = '\\u{1F000}-\\u{1FAFF}';
const EMOJI_BMP  = '\\u2600-\\u27BF\\u2190-\\u21FF\\u2B00-\\u2BFF\\u2300-\\u23FF';
const COLOUR_EMOJI_SOURCE = `[${EMOJI_HIGH}]|[${EMOJI_BMP}]\\uFE0F`;
```

So `🚀` matches (high plane), `❗️` matches (`U+2757` + `U+FE0F`), and a bare
`✓` (`U+2713`, no VS16) is correctly left alone:

```js
hasColourEmoji('🚀');        // true
hasColourEmoji('\u2757\uFE0F'); // true  — ❗️ forced to colour
hasColourEmoji('\u2713');    // false — ✓ monochrome dingbat
```

#### A known, documented gap

Writing the tests for this surfaced a real edge: a bare `U+2B50` (`⭐`) with no
VS16 is **not** caught. It is a colour-emoji-by-default in practice but, written
without the selector, it falls outside the matched ranges. Rather than widen the
net and risk false positives on legitimate star glyphs, the gap is left in place
and **pinned by a test** so any future change to it is a deliberate decision:

```js
it('known gap: bare U+2B50 without VS16 is not flagged', () => {
  expect(hasColourEmoji('Star \u2B50')).toBe(false);
});
```

That test is the whole philosophy in miniature: a detector you can reason about,
with its boundaries written down, beats a magic score you cannot.

### L2 · generic gradient

Every model's default "make it pop" is the same indigo→purple gradient. L2
matches `linear/radial/conic-gradient(...)` declarations and flags any that
contain **two or more** of the canonical tell hexes (`#6366f1`, `#8b5cf6`,
`#a855f7`, and so on). Two, not one: a single `#6366f1` somewhere in a
stylesheet is fine; two of them inside one gradient is the stock recipe.

### L3 · framework-default shadow

Tailwind/Bootstrap ship shadow ladders like `0 1px 3px rgba(0,0,0,0.1)`. Used
once, fine. Pasted verbatim across a page with no tuning to surface or light
direction, it reads as untouched boilerplate. L3 counts verbatim occurrences and
only fires at **three or more**, so one stray utility class never fails a
crafted page.

### L4–L6 · the advisory tells

These are softer signals, so they warn rather than block:

- **L4 opacity-only motion**: a `transition`/`@keyframes` whose *only* animated
  property is `opacity`. Fading in is the motion you reach for when you have not
  decided how the thing should actually move.
- **L5 cookie-cutter**: eight or more sibling elements sharing one exact class
  signature, the cloned "features section."
- **L6 dead-center**: a page where centering is pervasive *relative to its
  structure* (normalised by section count), the template look.

The blocking/advisory split is deliberate. L1–L3 are near-certain tells; L4–L6
are smells that are sometimes the right answer, so they inform without stopping
the build.

---

## Layer 3: machine rhythm (`analyzeStylometry`)

The subtlest layer. It scores *how* the prose is shaped, not which words it
uses, so it catches text whose every phrase looks innocent.

It strips markup and code, decides the language (>20% CJK characters routes to
CJK rules), and computes weighted signals:

| Signal | Weight | What it measures |
|---|---|---|
| sentence uniformity | 1.4 | coefficient of variation of sentence lengths; machines write *evenly* |
| paragraph sameness | 1.0 | CV of paragraph lengths |
| phrase repetition | 1.2 | repeated 3-grams (scaffolding reuse) |
| connective density | 1.0 | *moreover / furthermore / therefore* per 100 words |
| hedge density | 1.1 | *it's worth noting / generally / arguably* |
| list rigidity | 0.8 | bullets all the same length |
| opening repetition | 0.8 | bullets/sentences starting with the same word |

The core trick is the **uniformity signal**: human writing has lumpy sentence
lengths (high CV); machine writing is suspiciously even (low CV). So the signal
is `1 − clamp(CV / target)`, so the *more even* the text, the *higher* it scores.

```js
function uniformitySignal(lengths, targetCV) {
  if (lengths.length < 4) return null;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(1, 1 - Math.min(cv / targetCV, 1)));
}
```

The signals are weighted into a single 0–100 score. Crucially, every reason is
reported, so the output reads like a critique, not a verdict:

> score 63/100 ⚠ strong machine rhythm
> · Heavy on connectives (moreover/furthermore/therefore): 5 hits.

---

## It works: a side-by-side

Two pages, same length, run through `aitell all`. One was written the way a
model defaults; one was handwritten. (Full transcript:
[`SAMPLE-RUN.md`](./SAMPLE-RUN.md).)

| Layer | Machine-built page | Handcrafted page |
|---|---|---|
| text | **5 blocking**, 2 warnings | clean |
| layout | **3 blocking**, 1 advisory (L1+L2+L3) | clean |
| prose | **63/100** ⚠ strong machine rhythm | **0/100** ✓ natural |
| exit code | `1` | `0` |

No model was asked. The whole run takes milliseconds.

---

## What it deliberately is not

- **Not a plagiarism or provenance tool.** It does not claim to prove a human
  *or* a model authored anything. It flags the *signature*, which is a craft
  signal, not a courtroom one.
- **Not exhaustive.** Heuristics miss tells they were not taught. New ones get
  added to the corpus and the detector set over time.
- **Not a substitute for taste.** A clean `aitell` run means "no known tells,"
  not "good." It removes the obvious machine smell so the human judgement that
  remains is about the work, not the boilerplate.

That honesty *is* the design. A fast, explainable, deterministic first pass that
names what it found, points at the line, and gets out of the way.

---

*Source: [`packages/aitell`](../../packages/aitell). Architecture:
[`ARCHITECTURE.md`](./ARCHITECTURE.md). Live transcript:
[`SAMPLE-RUN.md`](./SAMPLE-RUN.md).*
