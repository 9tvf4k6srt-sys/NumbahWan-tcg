# NumbahWan Improvement Log

> Only log scripts/patterns that save significant time on reuse. No fluff.

---

## Quick Reference Commands

### Batch Text Replacement
```bash
# Replace multiple strings across files in one command
sed -i 's/OLD1/NEW1/g; s/OLD2/NEW2/g; s/OLD3/NEW3/g' file.js

# Example: Currency emoji replacement
sed -i 's/💎/◆/g; s/🪙/●/g; s/⚙️/⬡/g; s/🪨/▣/g; s/🪵/⧫/g' public/static/*.js
```

### Find All References
```bash
# Find pattern in specific file types
grep -rn "PATTERN" public/*.html public/static/*.js

# Find with context
grep -B2 -A2 "PATTERN" file.js
```

### Service Restart (Standard)
```bash
fuser -k 3000/tcp 2>/dev/null || true && pm2 delete all 2>/dev/null || true && npm run build && pm2 start ecosystem.config.cjs
```

---

## Reusable SVG Icon Template

When creating new currency/item icons with glow + animation:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <!-- Outer Glow Filter -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feFlood flood-color="#FFD700" flood-opacity="0.8"/>
      <feComposite in2="blur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    
    <!-- Gradient -->
    <linearGradient id="mainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#COLOR_LIGHT"/>
      <stop offset="100%" stop-color="#COLOR_DARK"/>
    </linearGradient>
    
    <!-- Animated Shimmer -->
    <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0">
        <animate attributeName="offset" values="-0.5;1.5" dur="2s" repeatCount="indefinite"/>
      </stop>
      <stop offset="50%" stop-color="#fff" stop-opacity="0.4">
        <animate attributeName="offset" values="0;2" dur="2s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#fff" stop-opacity="0">
        <animate attributeName="offset" values="0.5;2.5" dur="2s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
  </defs>
  
  <!-- Main Shape with Glow -->
  <g filter="url(#glow)">
    <!-- YOUR SHAPE HERE -->
  </g>
  
  <!-- Shimmer Overlay -->
  <rect x="0" y="0" width="64" height="64" fill="url(#shimmer)" opacity="0.3"/>
  
  <!-- Sparkles -->
  <circle cx="16" cy="16" r="2" fill="#FFD700">
    <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite"/>
  </circle>
</svg>
```

---

## UI Patterns

### Fixed Bottom Element (No Collision)
```css
/* Currency bar - full width bottom */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9998;
}

/* FAB - left side, above bar */
.fab {
  position: fixed;
  bottom: 50px;
  left: 24px;
  z-index: 99999;
}

/* Panel - above FAB */
.panel {
  position: fixed;
  bottom: 120px;
  left: 24px;
  z-index: 99998;
}
```

### GM Mode Aware Display
```javascript
function updateDisplay() {
  const isGM = NW_USER.isGM;
  const userId = NW_USER.id || 'Unknown';
  
  // Always show ID, add badge if GM
  element.innerHTML = isGM 
    ? '👑 <span style="color:#ffd700">GM</span> • ' + userId 
    : userId;
  
  // Infinite display for GM
  balanceEl.textContent = isGM ? '∞' : formatNum(balance);
}
```

---

## File Cleanup Pattern

When replacing asset with new version:
```bash
# 1. Backup old
cp file.svg file-old.svg

# 2. Replace with new
cp file-v2.svg file.svg

# 3. Update all references
sed -i 's/file-64.webp/file.svg/g' public/*.html public/static/*.js

# 4. Verify no old refs remain
grep -rn "file.*webp\|file-64\|file-128" public/

# 5. Delete old files
rm -f file-old.svg file-64.webp file-128.webp file-256.webp file-256.png
```

---

## Currency System Reference

| Currency | Symbol | Unicode | Color | CSS Class |
|----------|--------|---------|-------|-----------|
| Diamond | ◆ | U+25C6 | #00d4ff | .diamond |
| Gold | ● | U+25CF | #ffd700 | .gold |
| Iron | ⬡ | U+2B21 | #94a3b8 | .iron |
| Stone | ▣ | U+25A3 | #00ff88 | .stone |
| Wood | ⧫ | U+29EB | #c97f3d | .wood |

**Always use**: `NW_CURRENCY.format('diamond', 100)` instead of hardcoding.

---

## DOM Update + Event Rebinding Pattern

**Problem**: When innerHTML replaces DOM elements, event handlers are lost.

```javascript
// ❌ BAD - Events lost after HTML update
function onLanguageChange(lang) {
    updateHTML(container);  // Replaces DOM, events gone!
}

// ✅ GOOD - Always rebind after DOM replacement
function onLanguageChange(lang) {
    updateHTML(container);
    bindEvents();  // Re-attach handlers to new elements
}
```

**Real example from nw-guide.js:**
```javascript
window.addEventListener('nw-lang-change', (e) => {
    currentLang = e.detail.lang;
    const chat = document.getElementById('nw-guide-chat');
    if (chat) {
        updateChatHTML(chat);      // Replaces input/button elements
        bindInputEvents();          // Re-bind onclick/onkeypress
    }
});
```

---

## Module Init Check Pattern

```javascript
// Wait for module with retry
function waitForModule(moduleName, callback, maxRetries = 10) {
  let retries = 0;
  const check = () => {
    if (window[moduleName]?.initialized) {
      callback();
    } else if (retries++ < maxRetries) {
      setTimeout(check, 200);
    }
  };
  check();
}

// Usage
waitForModule('NW_USER', () => {
  updateUI();
  loadSettings();
});
```

---

---

## Session: Feb 4, 2025 - Icon System & UI Cleanup

### Premium Icon System v2.0

**Key changes:**
- Deleted old sprite file: `/static/icons/nw-icons.svg` and `/static/icons/icons.js`
- All icons now use `NWIconsInline` (inline SVG system in `nw-icons-inline.js`)
- 85 premium icons with gradients, glows, and NW brand colors

**Icon usage pattern:**
```html
<!-- Use data-nw-icon attribute -->
<span data-nw-icon="crown" style="width:24px;height:24px;display:inline-flex"></span>

<!-- Or via JavaScript -->
NWIconsInline.render('fire', { size: 32 })
```

### GM-Exclusive Crown Policy

**Crown icon is GM-ONLY.** Reserved for:
- RegginA (Grandmaster) profile/achievements
- GM mode indicators
- The Trilateral Council (government section)
- GM-related news/announcements

**Replacements made:**
| Original | New | Context |
|----------|-----|---------|
| 👑 Master Collector | 🏆 | collection.html |
| 👑 OG Member | ⭐ | nwg-shop.html |
| 👑 Mythic Owner | ✨ | profile-card.html |
| 👑 District icon | 🏛️ | realestate.html |
| 👑 Premium property | 💎 | realestate.html |

### Batch Cleanup Script

**Remove redundant UI elements (back buttons, language toggles):**
```python
import os, re

# Patterns for cleanup
back_btn = re.compile(r'<a[^>]*class="[^"]*back-btn[^"]*"[^>]*>.*?</a>\s*\n?', re.DOTALL)
lang_toggle = re.compile(r'<div[^>]*class="[^"]*lang-toggle[^"]*"[^>]*>.*?</div>\s*\n?', re.DOTALL)
back_css = re.compile(r'\.back-btn\s*\{[^}]+\}\s*\n?')

for f in glob.glob('public/*.html'):
    content = open(f).read()
    content = back_btn.sub('', content)
    content = lang_toggle.sub('', content)
    content = back_css.sub('', content)
    open(f, 'w').write(content)
```

### Icon Migration Script

**Convert SVG sprite references to inline icon system:**
```python
import re

sprite_pattern = re.compile(
    r'<svg([^>]*?)>\s*<use\s+href="/static/icons/nw-icons\.svg#([^"]+)"[^>]*>\s*</use>\s*</svg>',
    re.DOTALL
)

def convert(match):
    attrs, icon = match.group(1), match.group(2)
    size = re.search(r'width="(\d+)"', attrs)
    size = size.group(1) if size else '24'
    return f'<span class="nw-icon" style="width:{size}px;height:{size}px;display:inline-flex" data-nw-icon="{icon}"></span>'

content = sprite_pattern.sub(convert, content)
```

### Files Cleaned Today

- **28 HTML files**: Removed back buttons (37) and language toggles (52)
- **10 HTML files**: Converted 124 SVG sprite refs to inline icons
- **Deleted old icons**: `stone.svg`, `wood.svg`, `iron.svg`, `diamond.svg`, `gold.svg`, `black-jade.svg`, `nw-icons.svg`, `icons.js`
- **Kept**: `sacred-log.svg`, favicons, app icons, `logo-original.png`

### Currency Icon System

Currency icons are separate from general icons. Use `NW_CURRENCY` module:
```javascript
// Correct
NW_CURRENCY.icon('nwg', { size: 24 })
NW_CURRENCY.format('gold', 1000)

// Icons: NWG (hexagonal crystal), Gold (coin), Sacred Log (wood with rune)
```

---

*Only add entries that save 5+ minutes on reuse*
