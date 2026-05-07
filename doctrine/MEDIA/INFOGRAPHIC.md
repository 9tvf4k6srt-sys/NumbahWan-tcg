# MEDIA · INFOGRAPHIC — diagram and chart rules

Infographics fail differently than photos. The tell isn't symmetry or six fingers — it's **default-template aesthetic**, **stock-icon library look**, and **chart-junk** (decorative gradients, 3D bars, pie slices labeled with arrows). PINFORGE infographics must read as drawn for this report, not pulled from a Canva template.

---

## What our infographics look like (anchor)

The desk pages set the standard. Look at:
- `/desk` six-box screen — flat, mono-labeled, brass-accented
- `/desk/scan` method grid — high/low values outlined in brass, the rest neutral
- `/desk/<ticker>` PT compute hint — formula + breakdown in monospace

The visual vocabulary: paper background, ink lines, brass accents, monospace labels, no shadows, no gradients, no rounded-everything.

---

## Forbidden infographic tells (instant reject)

- **3D bar charts.** Always.
- **Pie chart with > 4 slices.** Bar chart instead.
- **Gradient fills on data marks.** Flat color or pattern only.
- **Drop shadows on chart elements.** None.
- **Cute mascot icons.** No icons-as-decoration. Icons earn their place by labeling something specific.
- **"Funnel" diagrams.** They fake causality.
- **Arrows curving with multiple bezier points.** Straight or single-bend only.
- **Color-coded legends with > 5 colors.** Cap at 5; otherwise the chart has too much.
- **"In this slide we will see…" framing text.** Show the thing.
- **Stock-icon library aesthetic.** Flaticon / Iconfinder / Noun Project default = AI-adjacent template tell.

---

## Mandatory elements

1. **Source line.** Every infographic gets `Source: <publisher> · <date>` in monospace, 10–11px, ink-3 color, bottom-right or below caption.
2. **Datestamp.** When was this generated? Visible on the chart, not in metadata.
3. **Analyst signature.** If the chart was constructed by CL or HW, glyph (P-003) bottom-right.
4. **Units.** Every axis labeled with units. NT$B, %, weeks, etc.
5. **N=.** Sample size or universe size visible. "N=5 tickers" not implied.

---

## Build approach (HTML/SVG over AI generation)

For data-driven infographics, **do not generate as raster image**. Build in HTML + inline SVG, themed with the PINFORGE palette (`P-201`). Three reasons:

1. Crisp at any zoom. Mobile + retina + zoom-in all clean.
2. Live data. SVG can be JSON-driven; the chart updates when ledger updates.
3. Lint-able. Text inside SVG is searchable, translatable, accessible.

### When AI generation is acceptable for infographic

- Conceptual diagrams (not data-bearing). E.g. a process flow with named boxes and arrows. Even then: generate the layout, hand-redraw in SVG before shipping.
- Hero-banner background patterns. Abstract grids, blueprint textures. Treat as background image, run IMAGE.md post-processing pass.

### When AI generation is forbidden

- Anything with numbers in it. AI cannot reliably render numbers in raster output. Period.
- Charts. SVG/Canvas only.
- Tables. HTML only.
- Anything with the analyst signature glyph. The signature must be authentic.

---

## SVG construction rules

```html
<svg viewBox="0 0 600 360" role="img" aria-labelledby="ch-title ch-desc"
     style="font-family:var(--mono);font-size:11px;color:var(--ink-2)">
  <title id="ch-title">[chart title]</title>
  <desc id="ch-desc">[plain-language description for screen readers]</desc>
  <!-- gridlines: 1px stroke, ink-3 color, 30% opacity -->
  <!-- bars / lines: brass-2 fill, no shadow, no gradient -->
  <!-- labels: mono, ink-2 -->
  <!-- source line bottom-right: mono, ink-3, 9.5px -->
</svg>
```

Stroke widths: 1px gridlines, 1.5px axes, 2px data lines. Thicker = chart-junk.

---

## Color usage

From `P-201` palette:
- Primary data series: `--brass-2` (#A2864A)
- Secondary: `--ink-2` (#3D352D)
- Highlight / "good" state: `--green` (#3c7846)
- Highlight / "bad" state: `--seal` (#7B2A1E)
- Gridlines and rules: `--rule` (rgba(26,22,18,.14))
- Axis labels: `--ink-3` (#6B5E4F)

Never introduce a chart color outside this palette.

---

## Typography

- Numbers: `var(--mono)` JetBrains Mono
- Axis labels: `var(--mono)` 11px
- Chart title: `var(--display)` 16–18px, weight 600
- Caption / source line: `var(--mono)` 9.5–10px, ink-3
- Legend entries: `var(--mono)` 11px

No serif body font inside charts. No sans-serif (we don't have one in our system).

---

## Reject checklist

Before shipping any infographic:

1. Could a Bloomberg analyst look at this without wincing?
2. Is every data mark labeled with its value or trivially readable from axis?
3. Is the source visible without hovering / clicking?
4. Does it work in grayscale? (Test: print preview)
5. Does it work at 320px width? (Mobile)
6. Does removing every decorative element leave the chart intact?

If no on any: rework.

---

## Anti-patterns named

| Anti-pattern | Why killed |
|---|---|
| Stock-icon "ecosystem" diagrams | reads as deck filler |
| Concentric circles labeled "transparency / quality / trust" | values posters |
| World maps with floating data dots | always misleads |
| Sankey diagrams with > 6 flows | unreadable |
| Word clouds | always |

---

## When the operator asks for a chart

Default response: build it as inline SVG in the relevant page. Put the data in `public/data/<surface>/<name>.json`. Make the chart fetch and render. Then it's lintable, datestampable, updatable.

Raster export only on explicit request and only for outside-the-repo distribution (PDF, social).

---

## Tools

| Use case | Tool |
|---|---|
| Inline SVG charts | hand-coded, JSON-driven |
| Quick scaffolding | none — copy from existing charts in repo |
| Logo / mark assets | hand-drawn or `image_generation` for ideation only, then redrawn in SVG |
| Process flow concepts | `image_generation` for layout, then redraw |
| Photoreal raster for infographic backdrops | not allowed unless explicitly approved |
