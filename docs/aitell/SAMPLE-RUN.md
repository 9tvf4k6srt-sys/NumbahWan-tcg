# aitell: a live side-by-side

Two HTML pages of roughly equal length, run through `aitell all`. One is written
the way a model defaults; one is handwritten. The transcript below is real
output, copied verbatim from the CLI.

---

## Page A: the machine-built page

```html
<!DOCTYPE html><html><head><style>
.hero { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); }
.card { box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: opacity 0.3s; }
.card2 { box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: opacity 0.2s; }
.card3 { box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
</style></head><body>
<h1>🚀 Welcome to the Platform</h1>
<button>🎯 Get Started</button>
<p>This is a testament to our commitment. Moreover, our platform delivers a
rich tapestry of features. Furthermore, it is worth noting that we delve into a
nuanced approach. Additionally, the system is robust. Consequently, it is
scalable. Therefore, users win.</p>
</body></html>
```

```console
$ npx aitell all ai-page.html
  [text]   ai-page.html · 5 blocking, 2 warning
           ✗ L9 [en] "delve into" (AIT-EN-FILLER)
           ✗ L9 [en] "tapestry of" (AIT-EN-FILLER)
           ✗ L9 [en] "it is worth noting" (AIT-EN-FILLER)
           ⚠ L9 [en] "testament to" (AIT-EN-EXALTATION)
           ⚠ L9 [en] "a rich tapestry" (AIT-EN-EXALTATION)
           ✗ L9 [en] "nuanced" (AIT-EN-HEDGE-VOCAB)
           ✗ L9 [en] "delve" (AIT-EN-HEDGE-VOCAB)
  [layout] ai-page.html · 3 blocking, 1 advisory
           ✗ L1 EMOJI-AS-ICON — Emoji used as UI icons in 1 button/link and 1 heading.
           ✗ L2 GENERIC-GRADIENT — 1 default indigo→purple "AI startup" gradient.
           ✗ L3 DEFAULT-SHADOW — Framework-default drop shadow pasted 3 times verbatim.
           · L4 OPACITY-ONLY-MOTION — 2 transition/keyframe animates opacity and nothing else.
  [prose]  ai-page.html · score 63/100 ⚠ strong machine rhythm
           · Heavy on connectives (moreover/furthermore/therefore): 5 hits.
           · Hedging filler ("it's worth noting", "generally"): 1 hits.

$ echo $?
1
```

Every layer fires. The exit code is `1`, so a CI step or pre-commit hook stops
here.

---

## Page B: the handcrafted page

```html
<!DOCTYPE html><html><head><style>
.hero { background: linear-gradient(120deg, #0a3d2e, #f4c430); }
.card { box-shadow: 0 8px 24px -6px rgba(10,61,46,0.35);
        transition: transform 0.3s, opacity 0.3s; }
</style></head><body>
<h1>The 6:14 to Nowhere</h1>
<svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg>
<p>I almost missed it. The platform smelled of wet iron and cold coffee, and a
busker two pillars down was murdering a song I half-loved. Then the doors hissed
shut on a red scarf, caught like a flag, and the whole carriage laughed before
its owner even noticed.</p>
</body></html>
```

```console
$ npx aitell all human-page.html
  [text]   human-page.html · clean
  [layout] human-page.html · clean
  [prose]  human-page.html · score 0/100 ✓ natural

$ echo $?
0
```

Clean on all three. The gradient uses real palette colour, the icon is an inline
SVG, the shadow is tuned, the motion animates `transform`, and the prose has the
lumpy, specific rhythm of someone actually telling you something.

---

## What the contrast shows

| Layer | Page A (machine) | Page B (handcrafted) |
|---|---|---|
| text | **5 blocking**, 2 warnings | clean |
| layout | **3 blocking** (L1, L2, L3), 1 advisory (L4) | clean |
| prose | **63 / 100** ⚠ strong machine rhythm | **0 / 100** ✓ natural |
| exit code | `1` | `0` |

No model was asked to judge either page. The whole run is regex and string math,
so it finishes in milliseconds and gives the same answer every time.

To reproduce, save the two HTML blocks above and run `npx aitell all <file>`
from inside `packages/aitell`, or `node bin/aitell.js all <file>`.
