# Image Optimization Report

## Current State
| Folder | Size | Issue |
|--------|------|-------|
| cards/ | 29MB | Large card-art.webp files (1.8-2MB each) |
| tournament/ | 28MB | Hero images too large (1.6-2.2MB each) |
| seasons/ | 13MB | Coming-soon images (1.7-1.8MB each) |
| **Total** | **79MB** | Should be <20MB |

## Largest Files (>1.5MB each)
- tournament/venue-overhead.webp (2.2MB)
- tournament/crowd-cheering.webp (2.0MB)
- cards/s8/card-art.webp (2.0MB)
- 20+ files between 1.5-2MB

## Recommendations

### 1. Resize Large Images
```bash
# Tournament/hero images: max 1200px width
# Current: likely 3000-4000px
for f in public/static/images/tournament/*.webp; do
  cwebp -resize 1200 0 -q 80 "$f" -o "$f"
done
```

### 2. Create Responsive Variants
```
images/
├── cards/
│   ├── full/      # Original (lazy load)
│   ├── medium/    # 600px (default)
│   └── thumbs/    # 150px (grid view) ✓ Already exists
```

### 3. Use `<picture>` with srcset
```html
<picture>
  <source srcset="card-thumb.webp" media="(max-width: 400px)">
  <source srcset="card-medium.webp" media="(max-width: 800px)">
  <img src="card-full.webp" loading="lazy" alt="Card">
</picture>
```

### 4. Target Sizes
| Type | Max Width | Quality | Target Size |
|------|-----------|---------|-------------|
| Card thumbs | 150px | 75 | <20KB |
| Card medium | 400px | 80 | <50KB |
| Card full | 800px | 85 | <150KB |
| Hero/banner | 1200px | 80 | <200KB |
| Tournament | 1000px | 75 | <150KB |

### 5. Quick Win Script
```bash
# Compress all WebP to 80% quality
find public/static/images -name "*.webp" -size +500k -exec \
  cwebp -q 75 {} -o {} \;
```

## Impact
- Current: 79MB
- After optimization: ~15-20MB
- Load time improvement: 4x faster on mobile
