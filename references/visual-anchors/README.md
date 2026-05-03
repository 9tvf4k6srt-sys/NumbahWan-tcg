# Visual Anchors — Real Photographs Only

**Purpose**: Ground every PINFORGE image/video generation in real photographs of real places. AI models echo what you feed them. Feed them stock-luxury renders → you get stock-luxury sheen. Feed them real Tuesday-afternoon photographs → you get something that passes as real.

## Hard rules

1. **No AI-generated images, ever.** Not as anchors, not as references, not "just for composition." AI references compound sheen.
2. **No AI-upscaled or AI-retouched images.** Topaz Sharpen AI, Adobe Generative Fill, etc. → reject.
3. **Provenance required.** Every file has a `.meta.json` sidecar in `_meta/` with photographer, publication, URL, license, capture date.
4. **Real-camera EXIF preferred.** Save originals with EXIF intact when possible — those lens/aperture/ISO numbers feed back into prompts.
5. **License-aware.** Creative Commons, editorial fair-use for private reference, or personally licensed only. We do not republish.

## Directory layout

```
visual-anchors/
  taipei-real/        Real Taipei high-floor office interiors (geographic truth)
  designer-real/      Real built work by Van Duysen / Dirand / Vervoordt / Pawson / Chipperfield
  materials/          Real close-ups: lime plaster, brass patina, walnut grain, travertine
  imperfection/       Real cluttered desks, worn chairs, used objects (the anti-sheen library)
  _meta/              .meta.json sidecars, one per anchor file
```

## Categories and what to look for

### A. taipei-real/ — Geographic ground truth
- Cathay Financial HQ, Fubon Financial Center, CTBC private banking floors
- Taipei 101 Tower mid-to-high-floor tenant interiors
- Real co-working tours and broadcast documentary frame grabs
- Goal: capture how Taipei light, signage (繁體), plug sockets, and skyline actually appear in real photographs

### B. designer-real/ — Built work, not concept renders
- **Vincent Van Duysen**: Graanmarkt 13 Antwerp, his own studio, DRDH-published interiors
- **Joseph Dirand**: Balmain HQ Paris, Dirand studio, AD France shoots
- **Axel Vervoordt**: Kanaal HQ Antwerp, photographs by Frédéric Vercruysse
- **John Pawson**: Pawson studio London, Design Museum office floor
- **David Chipperfield**: own offices in Berlin and London, Domus shoots

### C. materials/ — Texture truth
Close-up real photos that ground the model's understanding of material:
- Lime plaster trowel marks (construction / Bauwerk Colour catalog)
- Oxidized brass with verdigris (architectural hardware shoots)
- Walnut grain (real lumber, not CGI wood)
- Honed travertine (quarry photography)
- Rain on glass at Taipei street level (documentary photographers)

### D. imperfection/ — The anti-sheen library
The single most important folder. Real photographs of real used spaces:
- Cluttered analyst desks (Bloomberg, Reuters newsroom photography)
- Worn task chairs (Herman Miller secondhand listings often have honest photos)
- Coffee rings, cable mess, scuffed shoes, rolled sleeves
- Real Taipei street-level details (scooters, plug sockets, 統一 / 7-11 product placement)

## Workflow

1. **Source** a real photograph (URL or local file)
2. **Ingest** via `node tools/anchor-ingest.cjs --url <URL> --category <taipei-real|designer-real|materials|imperfection> --notes "<context>"`
3. **Verify** runs automatically: AI-detection heuristics, EXIF read, dimensions check
4. **Sidecar** written to `_meta/<filename>.meta.json` with provenance + verification result
5. **Registry** updated in `SOURCES.md` (one row per anchor)
6. **Use** by passing path to `image_urls` in `image_generation` so the model echoes real texture, not invented luxury

## Anchor count targets (first batch)

| Category | Min | Goal |
|---|---|---|
| taipei-real | 6 | 12 |
| designer-real | 8 | 16 |
| materials | 6 | 10 |
| imperfection | 4 | 8 |
| **Total** | **24** | **46** |

## Forbidden sources

- Pinterest dumps with no traceable origin
- Stock photography sites known to host AI-generated content (post-2023 unverified)
- Influencer Instagram reels (over-graded, often AI-touched)
- Real estate listing photos (always retouched; sometimes AI-staged)
- Any image where reverse search returns no original publisher

## Verification gates

`tools/anchor-verify.cjs` checks:
1. EXIF presence and plausibility (real cameras leave traces)
2. JPEG quantization tables (AI-generated PNGs converted to JPEG show telltale patterns)
3. File size vs dimensions ratio (AI images are often suspiciously compressed)
4. Color histogram (AI tends toward smooth Gaussian; real photos have ragged tails)
5. Manual flag fields in sidecar (`ai_suspect`, `provenance_verified`)

Anchors failing any automated gate require manual review before commit.
