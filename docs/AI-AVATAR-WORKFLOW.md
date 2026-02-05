# AI Avatar Art Generation Workflow v2.0

> **INTERNAL AI WORKFLOW** - How I generate pixel-perfect MapleStory card art

---

## Overview

When user requests card art from their MapleStory avatar, I follow this exact process to ensure maximum accuracy.

---

## Step 1: Collect Reference Materials

### Save User Screenshots
```bash
# Download to reference folder
/public/static/ref/full-avatars/[character]-reference-[N].png
```

### Required References (ask user for):
- Full avatar screenshot (in-game)
- Individual item screenshots if available
- Color reference (hero banners, etc.)

---

## Step 2: Identify ALL Components

Ask user to confirm each:

| Slot | Question | Example |
|------|----------|---------|
| Hat | What hat? Or none/transparent? | Golden Bulldog, Transparent |
| Hair | Hair style name? | Amber Soprano |
| Eyewear | Glasses/shades type? | White Shutter Shades |
| Face | Beard, mask, accessory? | Santa Beard |
| Costume | Full outfit name? | Harp Seal Costume |
| Weapon | Weapon class/name? | Paladin Hammer |
| Skin | Skin tone? | Dark brown / Healthy Skin |

---

## Step 3: Check Component Library

**File**: `/public/static/data/avatar-components.json`

Look up each component's `promptKeywords`:

```json
{
  "amber-soprano": {
    "promptKeywords": "extremely long voluminous wavy GOLDEN YELLOW hair, ONLY VISIBLE ON ONE SIDE (right side), LEFT SIDE HAS NO VISIBLE HAIR, bright golden yellow color"
  }
}
```

If component not in library:
1. Add it with accurate description
2. Extract reference image from screenshot
3. Save to appropriate `/public/static/ref/[category]/` folder

---

## Step 4: Build the Prompt

### Template:
```
MapleStory 2D pixel art sprite, chibi character on floating green grassy island platform, bright blue sky with white fluffy clouds.

[SKIN TONE] character wearing:
- [HAT description or "NO HAT (no headwear, hair visible on top)"]
- [HAIR]: [exact promptKeywords from library]
- [EYEWEAR]: [exact promptKeywords]
- [FACE]: [exact promptKeywords]
- [COSTUME]: [exact promptKeywords]
- [WEAPON]: [exact promptKeywords]

Exact MapleStory game pixel art style, clean black outlines, chibi proportions, vibrant saturated colors
```

### Critical Prompt Rules:
1. **Be EXTREMELY specific** - vague = wrong results
2. **Use negatives** - "NOT pale/cream", "LEFT SIDE HAS NO VISIBLE HAIR"
3. **Specify colors** - Use hex codes like "#FFD700 golden yellow"
4. **Describe shape** - "horizontal slat blinds style" not just "sunglasses"

---

## Step 5: Gather Reference Images

**CRITICAL**: Always include these as `image_urls`:

1. **User's screenshot** (PRIMARY - always first)
2. **Individual component images** from `/public/static/ref/`
3. **Color reference** (hero banners, etc.)

```python
image_urls = [
    "user_screenshot.png",           # PRIMARY
    "/static/ref/hair/amber-soprano.webp",
    "/static/ref/eyewear/white-shades.webp",
    # ... etc
]
```

---

## Step 6: Generate

**ALWAYS use**:
- Model: `nano-banana-pro`
- Aspect ratio: `1:1`

```
model: nano-banana-pro
aspect_ratio: 1:1
image_urls: [collected references]
query: [built prompt from Step 4]
```

---

## Step 7: Verify Output

Check EACH component:

| Component | Correct? | If Wrong |
|-----------|----------|----------|
| Hat | ✅/❌ | Regenerate with stronger "NO HAT" |
| Hair | ✅/❌ | Check side, color, volume |
| Eyewear | ✅/❌ | Check shape (slats vs solid) |
| Face | ✅/❌ | Check beard/mask presence |
| Costume | ✅/❌ | Check color, coverage |
| Weapon | ✅/❌ | Check type (hammer vs sword) |
| Skin | ✅/❌ | Check tone matches |
| Style | ✅/❌ | Must be pixel art, not 3D |

If ANY fails → Adjust prompt and regenerate

---

## Step 8: Process & Save

```bash
# Download generated image
# Convert to 512x512 WebP
convert input.png -resize 512x512 -quality 85 output.webp

# Save to cards folder
mv output.webp /public/static/images/cards/[rarity]-[name].webp

# Clean up temp files
rm *-temp.png *-v[0-9].png
```

---

## Step 9: Update Card Data

Add to `/public/static/data/cards.json`:

```json
{
  "id": 624,
  "name": "RegginA - Harp Seal Soprano",
  "rarity": "mythic",
  "category": "member",
  "role": "fashion_main",
  "img": "mythic-reggina-soprano.webp",
  "set": "fashion",
  "description": "Card description here",
  "hasArt": true,
  "addedDate": "2026-02-05"
}
```

---

## Component Library Reference

### Current Registered Components

**Hair:**
| ID | Name | Key Prompt Details |
|----|------|-------------------|
| amber-soprano | Amber Soprano Hair | ONLY visible ONE SIDE (right), LEFT SIDE NO HAIR, golden yellow #FFD700 |

**Eyewear:**
| ID | Name | Key Prompt Details |
|----|------|-------------------|
| white-shutter-shades | White Shutter Shades | Horizontal slat blinds style, white frame, NOT solid lenses |

**Face:**
| ID | Name | Key Prompt Details |
|----|------|-------------------|
| santa-beard | Santa Beard | White fluffy beard, covers chin/mouth |

**Costumes:**
| ID | Name | Key Prompt Details |
|----|------|-------------------|
| harp-seal | Harp Seal Costume | Full body white seal onesie, puffy white overall |

**Weapons:**
| ID | Name | Key Prompt Details |
|----|------|-------------------|
| paladin-hammer | Paladin Hammer | Large ornate golden hammer, detailed engravings |

**Hats:**
| ID | Name | Key Prompt Details |
|----|------|-------------------|
| golden-bulldog | Golden Bulldog | Small golden dog on head |
| transparent-hat | Transparent/None | NO HAT, hair visible on top |

---

## Troubleshooting Guide

### Problem: Hair on both sides (should be one side only)
**Solution**: Add explicit negatives
```
ONLY VISIBLE ON ONE SIDE (right side), hair flows down ONLY on the right, LEFT SIDE HAS NO VISIBLE HAIR
```

### Problem: Wrong eyewear shape (solid instead of slats)
**Solution**: Describe the structure
```
horizontal slat blinds style sunglasses, white plastic frame with horizontal bars/slats across the lenses like venetian blinds, NOT solid lenses
```

### Problem: Hair color too pale/cream
**Solution**: Specify exact color
```
bright golden yellow color (like #FFD700), NOT pale, NOT cream, vibrant saturated amber gold
```

### Problem: Hat appears when should be none
**Solution**: Triple emphasis
```
NO HAT (no headwear at all, nothing on top of head, hair fully visible on top of head)
```

### Problem: Wrong weapon type
**Solution**: Specify class AND appearance
```
PALADIN HAMMER (large ornate golden hammer with detailed engravings, two-handed weapon, NOT a sword, NOT a staff)
```

### Problem: Art style wrong (3D instead of pixel)
**Solution**: Reinforce style
```
Exact MapleStory game pixel art style, clean black outlines, 2D sprite, chibi proportions, NOT 3D, NOT realistic
```

---

## Adding New Components

When user shows a new item:

### 1. Extract from screenshot
```bash
convert screenshot.png -crop WxH+X+Y +repage -resize 128x128 component.webp
```

### 2. Add to avatar-components.json
```json
{
  "new-item-id": {
    "id": "new-item-id",
    "name": "New Item Name",
    "image": "/static/ref/category/new-item.webp",
    "description": "Detailed visual description",
    "promptKeywords": "exact keywords that produce accurate results"
  }
}
```

### 3. Test with generation
Generate a test image using only that component to verify promptKeywords work.

---

## Quick Checklist

Before generating:
- [ ] User screenshot saved to ref folder
- [ ] All components identified and confirmed
- [ ] Each component has promptKeywords
- [ ] Reference images gathered
- [ ] Prompt built with specifics and negatives

After generating:
- [ ] All components match reference
- [ ] Colors accurate
- [ ] Style is pixel art
- [ ] Converted to 512x512 WebP
- [ ] cards.json updated
- [ ] Temp files cleaned up

---

*Version 2.0 - Updated 2026-02-05*
*Key learnings: One-sided hair, shutter shades, color specificity*
