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

*Only add entries that save 5+ minutes on reuse*
