# MEDIA · IMAGE — generation rules

Generated images carry the most AI sheen of any medium we ship. A passable photo can be flagged in 2 seconds by a reader who's seen 10,000 AI images, which is everyone now. Ship nothing without running this checklist.

---

## Three image classes (different rules)

1. **Editorial product / portrait** — must read as photographed, not rendered. Highest scrutiny.
2. **Infographic / diagram** — see `INFOGRAPHIC.md`. Different rules (intentional flatness, brand palette).
3. **Background / texture** — lowest scrutiny. Can be more abstract. Still must avoid the obvious tells.

---

## Forbidden image tells (instant reject)

- **Symmetric faces.** Real human faces are asymmetric. AI defaults to bilateral symmetry.
- **Plastic skin.** No pore detail, no oil, no shine. AI smooths.
- **Six-finger hands** / merged fingers / extra knuckles. Look at every hand pixel.
- **Background warping.** Straight lines that bend, text-like shapes that aren't text, parallel lines diverging without perspective reason.
- **Eye highlights too perfect.** Both eyes mirror-symmetric specular = render tell.
- **Fabric repeating texture.** AI texture-synth produces tiled-feeling weaves.
- **Lighting from impossible angles.** Both eyes lit equally with no shadow side. Real photos have a key light.
- **"Vibrant" colors.** Saturation slider at 110%. Real photos are duller than people remember.
- **Aspirational stock-photo composition.** Centered subject, smiling, three-quarter view, arms-crossed CEO pose.

---

## Generation prompt rules (when using `image_generation` tool)

### Always include in the prompt

- **Camera + lens specifics.** "Shot on Hasselblad 80mm f/2.8" / "35mm film grain" / "natural window light from camera-left at 4pm".
- **Imperfection markers.** "slight hair stray", "shirt collar slightly bent", "uneven lighting", "shadow falling on left jawline".
- **Material + age.** "walnut desk, scratched", "linen suit, lived-in", "brass fitting, oxidized" — never "premium" / "luxury".
- **Specific time of day.** Avoid "golden hour" cliché. Try "Tuesday afternoon, overcast" / "10am, slight backlight".
- **Cultural specificity** when subject is human. "Taipei", "Brooklyn", "Osaka". AI defaults to a beige international face otherwise.

### Never include in the prompt

- "beautiful", "stunning", "breathtaking", "vibrant", "high quality", "ultra realistic", "8K", "masterpiece", "hyperdetailed". These bias toward the AI-stock aesthetic.
- "professional", "luxury", "premium", "elegant" without a concrete material. These produce flat marketing imagery.
- "centered composition" — bias toward asymmetric framing (rule of thirds at minimum).

### Palette anchors for PINFORGE

When the image is for PINFORGE surfaces (`/invest`, `/desk`, `/playbooks`):
- Dark linen, walnut, oxblood, brass, paper-cream
- Chiaroscuro lighting (key light + strong shadow side)
- Editorial photography register, not commercial / advertising

Reference `doctrine/PATTERNS.md` P-201 for hex anchors. Image tones must feel like they belong on `--paper:#EFE7D6` background.

---

## Post-generation pass (mandatory before shipping)

This is the 60–80% manual editing the zero-trace doctrine demands. AI output is the draft, never the ship.

### 1. Strip metadata
```bash
exiftool -all= -overwrite_original public/static/images/<file>.{jpg,png,webp}
```
Strips EXIF, GPS, software tags, generator markers. Failing this leaks "Stable Diffusion / Midjourney" in image metadata.

### 2. Add controlled imperfection
- Grain: 20–30% film grain overlay (not the "add noise" filter — actual grain pattern).
- Slight rotation: ±0.3° to ±0.7°. Breaks the AI dead-perfect horizon.
- Asymmetric crop: never center the subject perfectly.
- Healing brush 3–5 spots: remove the most AI-perfect highlights, leave the imperfect ones.

### 3. Composite with one real element
Layer in something real where possible: a real coffee ring scan, a real paper texture, a real signature scribble. One real element shifts the whole image's reading.

### 4. Format
- Ship `WebP`. PNG only when alpha is non-negotiable. JPG never (no alpha, larger).
- Per-image budget: 200 KB target, 500 KB hard ceiling. `tools/check-assets.cjs` enforces 2 MB per page.

### 5. Filename convention
```
public/static/images/<surface>/<short-descriptor>-<YYYYMMDD>.webp
```
Not `output.webp`, not `image-final-final-v3.webp`.

---

## Reject this image checklist

Before adding `<img>` to any HTML file, ask:

1. Could a sharp-eyed friend tell this was AI in 5 seconds?
2. Are hands visible? Are they correct?
3. Is the subject smiling in the AI-default way? (cheeks high, both eye corners equally crinkled, perfect teeth)
4. Is text in the image legible and meaningful?
5. Does the lighting cast believable shadows?
6. Is the background simpler than typical AI maximalism?

If yes / yes / no / yes / yes / yes — ship. Otherwise, regenerate or hand-finish.

---

## When to skip generation entirely

The `image_search` tool finds Creative Commons images. For real-world subjects (cities, products that exist, public people, historical events) — search first, generate only when nothing real fits. Search photos already have the imperfections we're trying to add back into AI output.

**Domain caution:** if `image_search` returns sparse results, the topic likely needs commercial-licensed photography (Getty, Shutterstock). Do NOT scrape those. Generate instead and run the post-processing pass.

---

## Tools matrix

| Use case | Tool / model | Notes |
|---|---|---|
| Editorial portrait | `nano-banana-pro` or `gpt-image-2` | Highest fidelity, best face/hands |
| Product still life | `nano-banana-2` | Good with materials and light |
| Background texture | `fal-ai/z-image/turbo` | Cheap, fast iteration |
| Photo restoration / upscale | `fal-ai/recraft-clarity-upscale` | After hand-edit |
| Watermark / text removal | `fal-ai/image-editing/text-removal` | Cleaning real photos |
| Background removal | `fal-bria-rmbg` | When extracting subject |

---

## Confessions / known weaknesses

- We cannot fully strip the AI sheen on faces yet. Editorial portraits should use real photography or stylized illustration when possible. Photoreal AI faces remain detectable.
- Generated text inside images is unreliable at all sizes. Add text in HTML/SVG over the image, not in the prompt.
- Hands at full size are still risky on some models. Crop, blur, or pose hands holding objects to mask the issue.
