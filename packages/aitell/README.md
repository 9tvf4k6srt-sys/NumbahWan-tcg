# aitell

**Detect the fingerprints of machine-generated web content — without calling an LLM.**

Most "AI detectors" score plain text and ship it to a model. `aitell` does
something different and, as far as we can tell, rarer: it names the *structural*
and *visual* tells that betray "a model assembled this," and it does it offline,
deterministically, in milliseconds.

Three independent layers, each a pure function of a string:

| Layer | What it catches | LLM? |
|---|---|---|
| **`lintText`** | AI-tell phrases (`delve`, `tapestry of`, `testament to`, …) across English, 中文, 日本語, ไทย | no |
| **`lintLayout`** | the *visual* signature of machine-assembled UI — six named tells, L1–L6 | no |
| **`analyzeStylometry`** | machine *rhythm* in prose: even sentences, connective pile-ups, repeated openings | no |

The layout layer is the unusual one. Text linters for AI copy exist. A linter
for how machine-built **UI** looks — emoji used as icons, the default
indigo→purple gradient, framework shadows pasted verbatim — does not, in any
form we could find.

## Install

```bash
npm install aitell
```

## Quick start

```js
const aitell = require('aitell');

// 1. Phrase blocklist
const text = aitell.lintText('Let us delve into a rich tapestry of features.', aitell.defaultCorpus);
console.log(text.blocked);            // 2
console.log(text.violations[0].match); // "delve into"

// 2. Visual tells
const html = '<button>🚀 Launch</button><style>.h{background:linear-gradient(#6366f1,#8b5cf6)}</style>';
const layout = aitell.lintLayout(html);
console.log(layout.findings.map(f => f.id));
// [ 'L1 EMOJI-AS-ICON', 'L2 GENERIC-GRADIENT' ]

// 3. Machine rhythm (0–100, higher = more machine-like)
const prose = aitell.analyzeStylometry(longParagraph);
console.log(prose.score, prose.reasons);
```

## CLI

```bash
npx aitell all   public/index.html        # run every layer
npx aitell text  *.md --json              # phrase blocklist, machine-readable
npx aitell layout dist/*.html             # visual tells only
npx aitell prose README.md                # stylometry score
```

Exit code is `1` when any **blocking** issue is found (a high-severity phrase or
a blocking layout finding) and `0` otherwise, so it drops straight into a
pre-commit hook or CI step.

## The six visual tells (L1–L6)

| ID | Tell | Blocking | Why it reads as machine-made |
|---|---|---|---|
| **L1** | `EMOJI-AS-ICON` | yes | Emoji standing in for real icons in buttons, nav, headings. The loudest "assembled, not designed" signal. |
| **L2** | `GENERIC-GRADIENT` | yes | The default `#6366f1`→`#8b5cf6` indigo/purple gradient every model reaches for to "make it pop." |
| **L3** | `DEFAULT-SHADOW` | yes | Framework-default `rgba(0,0,0,.1)` shadow ladders pasted verbatim, never tuned to the surface. |
| **L4** | `OPACITY-ONLY-MOTION` | advisory | Animation whose only animated property is `opacity` — the motion you reach for when you have not chosen one. |
| **L5** | `COOKIE-CUTTER` | advisory | Many structurally identical sibling blocks: the cloned "features section." |
| **L6** | `DEAD-CENTER` | advisory | A page that centers almost everything. Perfect symmetry reads as a template, not a composition. |

### The colour-emoji distinction

L1 hinges on one subtle call: telling a **colour emoji** (the tell) from a
**monochrome typographic dingbat** (legitimate). A glyph counts as a colour
emoji only if it sits in the high/astral plane (`U+1F000`–`U+1FAFF`) **or** is a
BMP symbol carrying the emoji variation selector `VS16` (`U+FE0F`). A bare `✓`,
`→`, or `★` used as real typography is left alone.

```js
aitell.hasColourEmoji('🚀');        // true  — colour emoji
aitell.hasColourEmoji('\u2713');    // false — monochrome ✓ dingbat
aitell.colourEmojis('Close ✕ 🎉');  // [ '🎉' ]
```

## Stylometry, in one paragraph

`analyzeStylometry` never bans a word. It measures *shape*: coefficient of
variation across sentence and paragraph lengths (machines write evenly),
repeated 3-grams (scaffolding reuse), connective and hedge density
(`moreover`, `it's worth noting`), list rigidity, and repeated bullet openings.
Each signal is weighted into a single 0–100 score. Because the signal lives in
the structure, the same scorer flags prose whose individual phrases all look
innocent. English and CJK are scored on their own rhythm rules.

## API

### `lintText(text, corpus, opts?) → { violations, blocked, warned }`
- `corpus` — `{ rules: [{ id, lang, severity, note, patterns: [regex...] }] }`. Ship your own or use `aitell.defaultCorpus` (167 patterns, 4 languages).
- `opts.stripComments` — strip HTML + block comments before scanning (default `true`).
- each violation: `{ line, ruleId, severity, lang, match, note, snippet }`.

### `lintLayout(html, opts?) → { findings, blocking, advisory }`
- `opts.emoji` — include the L1 emoji-as-icon detector (default `true`).
- each finding: `{ id, blocking, detail, fix, samples }`.
- individual detectors are exported too: `checkEmojiIcon`, `checkGenericGradient`, `checkDefaultShadow`, `checkOpacityOnlyMotion`, `checkCookieCutter`, `checkDeadCenter`.

### `analyzeStylometry(raw) → { score, signals, reasons, lang }`
- `score` is `0`–`100` (or `null` when there is too little prose). `band(score)` returns a human label.

### Primitives
`hasColourEmoji`, `colourEmojis`, `colourEmojiRegex`, `stripMarkupAndCode`, `isCJK`, `flattenCorpus`.

## Why offline matters

Every check is regex and string math, so a 1,000-page site lints in the time it
takes to read the files. There is no token cost, no network dependency, and no
non-determinism — the same input always yields the same findings. That is what
lets it live in a pre-commit hook and a CI gate without slowing anyone down.

## License

MIT.
