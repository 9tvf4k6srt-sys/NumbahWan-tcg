# AI Avatar Art Generation Workflow

## Purpose
This is an **internal AI workflow** for generating accurate MapleStory avatar card art. When the user requests card art, I (Claude) follow this process to ensure maximum accuracy.

---

## Step 1: Collect Reference Materials

When user provides avatar screenshots:

1. **Download ALL reference images** to `/public/static/ref/full-avatars/`
2. **Extract individual components** using ImageMagick crop
3. **Save to component folders**: `/public/static/ref/{hats,hair,eyewear,face,costumes,weapons}/`

---

## Step 2: Identify Components from Screenshot

Ask user to confirm or identify:
- [ ] **Hat**: What hat? Or transparent/none?
- [ ] **Hair**: Hair style name?
- [ ] **Eyewear**: Sunglasses/glasses type?
- [ ] **Face Accessory**: Beard, mask, etc.?
- [ ] **Costume**: Full outfit name?
- [ ] **Weapon**: What weapon class/name?
- [ ] **Skin**: Skin tone?

---

## Step 3: Build Prompt from Components

### Template:
```
MapleStory 2D pixel art sprite, chibi character on floating green grassy island platform, bright blue sky with clouds.

[SKIN TONE] character wearing:
- [HAT or "NO HAT (no headwear, hair visible on top)"]
- [HAIR]: [detailed description from component library]
- [EYEWEAR]: [detailed description]
- [FACE]: [detailed description]
- [COSTUME]: [detailed description]
- [WEAPON]: [detailed description]

Exact MapleStory game aesthetic, clean pixel art, 2D side-view chibi sprite, vibrant saturated colors
```

### Component Library Reference
Location: `/public/static/data/avatar-components.json`

Each component has:
- `promptKeywords`: Exact words to use in prompt
- `image`: Reference image path for image_urls input

---

## Step 4: Gather Reference Images for Generation

**CRITICAL**: Always include these as `image_urls` in generation:

1. **User's original screenshot** (primary reference)
2. **Extracted component images** from `/public/static/ref/`
3. **Full avatar reference** if available

Example:
```python
image_urls = [
    "user_screenshot.png",           # Primary reference
    "/static/ref/eyewear/white-shades.webp",
    "/static/ref/costumes/harp-seal.webp",
    "/static/ref/hair/amber-soprano.webp",
    # ... other components
]
```

---

## Step 5: Generate with nano-banana-pro

**ALWAYS use `nano-banana-pro` model** - it's currently the best for this task.

```
model: nano-banana-pro
aspect_ratio: 1:1
image_urls: [collected references]
query: [built prompt from Step 3]
```

---

## Step 6: Verify Output

After generation, check:
- [ ] Hat correct (or absent if none)?
- [ ] Hair style matches?
- [ ] Eyewear shape/color correct?
- [ ] Face accessory present?
- [ ] Costume matches?
- [ ] Weapon type correct?
- [ ] Skin tone correct?
- [ ] MapleStory pixel art style?

If ANY fails → **regenerate with adjusted prompt**

---

## Step 7: Process and Save

```bash
# Download generated image
# Convert to webp, resize to 512x512
convert input.png -resize 512x512 -quality 85 output.webp

# Save to cards folder
mv output.webp /public/static/images/cards/[card-name].webp

# Update cards.json with new card entry
```

---

## Current Component Library

### Registered Components (as of 2026-02-05):

**Hats:**
- `golden-bulldog` - Golden Bulldog pet hat
- `transparent-hat` - No hat (shows hair)
- `santa-hat` - Christmas santa hat

**Hair:**
- `amber-soprano` - Long wavy golden blonde hair

**Eyewear:**
- `white-shades` - Rectangular white frame sunglasses, dark lenses

**Face:**
- `santa-beard` - White fluffy santa beard

**Costumes:**
- `harp-seal` - White seal onesie/overall

**Weapons:**
- `paladin-hammer` - Golden paladin hammer

---

## Adding New Components

When user shows new items:

1. **Extract from screenshot**:
```bash
convert screenshot.png -crop WxH+X+Y +repage -resize 128x128 component.webp
```

2. **Add to avatar-components.json**:
```json
{
  "id": "new-item",
  "name": "New Item Name",
  "image": "/static/ref/category/new-item.webp",
  "promptKeywords": "exact description for AI prompt"
}
```

---

## Troubleshooting

### Problem: Eyewear shape wrong
**Solution**: Be MORE specific about frame shape
- "rectangular white plastic frame" not just "white sunglasses"
- Include "thick frame" or "thin frame"

### Problem: Hat appears when should be none
**Solution**: Explicitly state "NO HAT (no headwear at all, hair visible on top of head)"

### Problem: Wrong weapon type
**Solution**: Specify weapon class AND appearance
- "paladin hammer" not "weapon"
- "large ornate golden hammer" for details

### Problem: Costume not matching
**Solution**: Describe the FULL costume
- "full body white seal onesie covering entire body"
- Not just "seal costume"

---

## Quick Reference Card

```
ALWAYS:
✅ Use nano-banana-pro model
✅ Include user's screenshot as first image_url
✅ Include extracted component images
✅ Use promptKeywords from component library
✅ Explicitly state NO HAT if none
✅ Verify ALL components after generation

NEVER:
❌ Guess component details
❌ Skip reference images
❌ Use vague descriptions
❌ Forget to verify output
```
