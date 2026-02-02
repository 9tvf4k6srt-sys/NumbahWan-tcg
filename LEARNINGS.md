# NumbahWan Continuous Learning System

> Every build teaches us something. Document it here.

---

## How to Use This File

1. **After completing a feature**: Add what you learned
2. **After fixing a bug**: Document the root cause
3. **After user feedback**: Note the improvement
4. **Before starting work**: Read recent learnings

---

## Code Patterns (GOOD ✅)

### 1. Single Source of Truth
```
✅ DO: Central config in one file (nw-config.js)
✅ DO: Currency display from NW_CURRENCY
✅ DO: Patch notes from NW_CONFIG.patches
❌ DON'T: Hardcode values across multiple files
```

### 2. Consistent Icon/Currency Display
```javascript
// ✅ GOOD - Use NW_CURRENCY
NW_CURRENCY.format('diamond', 100)
NW_CURRENCY.badge('wood', 5, { style: 'fancy' })

// ❌ BAD - Emojis scattered everywhere
'💎 100 diamonds'
```

### 3. Translation Pattern
```javascript
// ✅ GOOD - Object with all languages
title: { en: 'Hello', zh: '你好', th: 'สวัสดี' }
NW_CONFIG.t(title, 'zh') // Returns '你好'

// ❌ BAD - Separate variables
const titleEn = 'Hello';
const titleZh = '你好';
```

### 4. Event-Driven Communication
```javascript
// ✅ GOOD - Emit events for cross-module communication
window.dispatchEvent(new CustomEvent('nw-card-upgraded', { detail: { cardId } }));

// ❌ BAD - Direct function calls across modules
OtherModule.someInternalFunction();
```

### 5. Defensive Coding
```javascript
// ✅ GOOD - Always check if module exists
if (typeof NW_WALLET !== 'undefined') {
    NW_WALLET.init();
}

// ❌ BAD - Assume module is loaded
NW_WALLET.init(); // Crashes if not loaded
```

---

## Code Patterns (AVOID ❌)

### 1. Z-Index Chaos
```css
/* ❌ BAD */
z-index: 9999;
z-index: 999999;

/* ✅ GOOD - Use scale */
z-index: var(--nw-z-modal); /* 700 */
```

### 2. Inline Styles for Recurring Elements
```html
<!-- ❌ BAD -->
<span style="color: #00d4ff; font-weight: bold;">💎 100</span>

<!-- ✅ GOOD -->
<script>document.write(NW_CURRENCY.format('diamond', 100))</script>
```

### 3. Duplicate Data
```javascript
// ❌ BAD - Same data in multiple places
// wallet.html: const DAILY_REWARDS = [...]
// nw-wallet.js: const DAILY_REWARDS = [...]

// ✅ GOOD - Single source
// nw-config.js: economy.dailyRewards: [...]
```

---

## Bug Patterns & Fixes

### Issue: "ui.title" showing instead of translation
**Root Cause**: Translation function looking for wrong path structure
**Fix**: Check both `obj.en.key` and `obj.key.en` patterns
**Lesson**: Always test i18n with all 3 languages

### Issue: Button click not responding
**Root Cause**: Missing onclick handler or wrong function scope
**Fix**: Ensure function is global or properly bound
**Lesson**: Always add console.log at start of click handlers during dev

### Issue: Currency emoji looks different across devices
**Root Cause**: Emoji rendering varies by OS/browser
**Fix**: Use SVG icons (NW_CURRENCY system)
**Lesson**: Never rely on emoji for critical UI

### Issue: Toast not showing
**Root Cause**: No toast container in HTML
**Fix**: Add `<div id="toast-container">` and showToast function
**Lesson**: Check if container exists before showing dynamic content

### Issue: Daily reward claim no feedback
**Root Cause**: No visual/audio feedback on action
**Fix**: Add toast, button state change, shake animation
**Lesson**: Every user action needs visible feedback

---

## Performance Learnings

### 1. Lazy Load Heavy Modules
```javascript
// Load 3D engine only when needed
if (needsAnimation) {
    const script = document.createElement('script');
    script.src = '/static/nw-3d-engine.js';
    document.head.appendChild(script);
}
```

### 2. Debounce Frequent Events
```javascript
let timeout;
input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(search, 300);
});
```

### 3. Use CSS Transitions, Not JS
```css
/* ✅ Smooth and performant */
.card { transition: transform 0.3s ease; }
.card:hover { transform: scale(1.05); }
```

---

## UX Learnings

### 1. Always Show Loading State
```javascript
button.disabled = true;
button.textContent = 'Processing...';
// ... do work ...
button.disabled = false;
button.textContent = 'Done!';
```

### 2. Confirm Destructive Actions
```javascript
if (!confirm('Burn this card for 50 logs?')) return;
```

### 3. Provide Undo When Possible
```javascript
showToast('Card burned! <button onclick="undoBurn()">Undo</button>', 5000);
```

### 4. Mobile-First Touch Targets
```css
button {
    min-height: 44px; /* Apple guideline */
    min-width: 44px;
}
```

### 5. Feedback Hierarchy
1. **Immediate**: Button state change, sound
2. **Quick**: Toast notification (1-3 seconds)
3. **Detailed**: Modal for complex results

---

## Architecture Learnings

### Module Load Order
```
1. nw-config.js    - Central config (no dependencies)
2. nw-currency.js  - Currency display (no dependencies)
3. nw-wallet.js    - Wallet (needs config)
4. nw-user.js      - User (needs wallet)
5. nw-cards.js     - Cards (needs config)
6. nw-nav.js       - Navigation (needs config, wallet)
7. [Page-specific] - Game engines, etc.
```

### State Management
```
localStorage keys:
- numbahwan_lang     → Current language
- nw_wallet          → Wallet data
- nw_user            → User identity
- nw_collection      → Card collection
- nw_gm_mode         → GM mode flag
- nw_daily_*         → Daily state
```

### Event Names Convention
```
nw-wallet-ready      → Wallet initialized
nw-lang-change       → Language changed
nw-card-upgraded     → Card star increased
nw-card-burned       → Card converted to logs
nw-achievement-*     → Achievement events
nw-config-update     → Config changed
```

---

## Testing Checklist

Before shipping any feature:

- [ ] Works in English
- [ ] Works in Chinese (中文)
- [ ] Works in Thai (ไทย)
- [ ] Works on mobile (touch)
- [ ] Works without NW_CONFIG loaded
- [ ] Works without NW_WALLET loaded
- [ ] Has loading state
- [ ] Has error state
- [ ] Has success feedback
- [ ] No console errors
- [ ] Committed to git

---

## Communication Shortcuts

See `SHORTHAND.md` for quick commands:
- `forge broken` → Debug forge page
- `fix guide wrong text` → Fix translation
- `rebuild test it` → Build + URL

---

## Recent Learnings (Add New Here)

### 2026-02-02: Currency System
**Issue**: Emojis (💎🪙) look different across devices
**Solution**: Created NW_CURRENCY with SVG icons
**Files**: nw-currency.js
**Lesson**: Use vector graphics for consistent cross-platform display

### 2026-02-02: Card Upgrade Integration
**Issue**: NW_UPGRADE couldn't find cards from NW_WALLET
**Solution**: Check both NW_USER and NW_WALLET for card counts
**Files**: nw-card-upgrade.js, collection.html
**Lesson**: Multiple modules may store same data - unify or sync

### 2026-02-02: Guide Translation
**Issue**: Guide showing "ui.title" literal text
**Solution**: Fixed t() function to check multiple path structures
**Files**: nw-guide.js
**Lesson**: Test i18n thoroughly with console.log

### 2026-02-02: Currency Icon Unification
**Issue**: Currency emojis (💎🪙⚙️🪨🪵) render inconsistently across devices
**Solution**: Global replacement with Unicode symbols: ◆ ● ⬡ ▣ ⧫
**Pattern**: 
- Diamond: ◆ (U+25C6) - #00d4ff
- Gold: ● (U+25CF) - #ffd700  
- Iron: ⬡ (U+2B21) - #94a3b8
- Stone: ▣ (U+25A3) - #00ff88
- Wood: ⧫ (U+29EB) - #c97f3d
**Files Changed**: 20+ HTML files, 8+ JS modules
**Best Practice**: Always use NW_CURRENCY.format() for currency display
**Lesson**: Establish icon standards EARLY - retrofitting is painful

### 2026-02-02: Batch File Editing
**Issue**: Editing currency icons one-by-one was slow
**Solution**: Used sed for batch replacement across files
**Command**: `sed -i 's/💎/◆/g; s/🪙/●/g;' file.js`
**Lesson**: For large-scale text replacements, sed is faster than manual edits

### 2026-02-02: Sacred Log Icon Redesign
**Issue**: Old sacred log icon (webp) didn't match the reference photo (glowing runes on dark wood)
**Solution**: Created new SVG with animated golden runes, cosmic aura, and sparkle effects
**Features**: 
- Dark wood gradient (#4D2E0B)
- Glowing golden runes with pulse animation
- Cosmic aura with radial gradient
- Golden sparkles floating effect
- Tree ring detail on end caps
**Files Changed**: sacred-log.svg, arcade.html, forge.html, nw-wallet.js, nw-economy.js
**Cleanup**: Deleted old webp/png variants (64/128/256 sizes)
**Lesson**: SVG icons > raster images for scalability and animation

### 2026-02-02: Floating UI Element Collision
**Issue**: AI Guide chat FAB on bottom-right was blocking currency bar
**Solution**: Moved FAB to bottom-LEFT side (left: 24px, bottom: 50px)
**Files**: nw-guide.js
**Lesson**: Plan z-index and positioning for all fixed elements early
**Pattern**: 
```
Bottom area layout:
- Currency bar: bottom: 0, z-index: 9998, full width
- Chat FAB: bottom: 50px, LEFT side, z-index: 99999
- Chat panel: bottom: 120px, LEFT side
```

### 2026-02-02: GM Mode ID Display
**Issue**: Wallet showed "👑 GM" but hid actual user ID when in GM mode
**Root Cause**: updateUI() replaced ID entirely with GM badge
**Solution**: Show both badge AND ID: `👑 GM • NW-XXXXXXXXXXXX`
**Files**: wallet.html
**Pattern**:
```javascript
// ✅ GOOD - Show both status and identity
guestEl.innerHTML = '👑 <span style="color:#ffd700">GM</span> • ' + userId;

// ❌ BAD - Hide identity when showing status
guestEl.textContent = '👑 GM';
```
**Lesson**: Never hide identifying information when showing status badges

### 2026-02-02: Profile Section GM Awareness
**Issue**: Profile settings showed "Loading..." for ID even after GM activation
**Solution**: loadProfileSettings() now checks isGM and updates all fields accordingly
**Fields updated in GM mode**:
- User ID: Shows "👑 GM: NW-XXXX"
- Citizenship: Shows "GM" instead of "GUEST"
- Trust Score: Shows "∞" instead of "50/100"
**Lesson**: All UI update functions must be aware of GM mode state

---

## UI Position Standards

### Fixed Element Positioning
```
z-index scale:
- Background effects: 0-10
- Page content: 10-100
- Sticky headers: 100-200
- Dropdowns/tooltips: 200-500
- Modals: 500-700
- Currency bar: 9998
- Chat FAB: 99999
- Critical alerts: 100000

Bottom positioning:
- Currency bar: bottom: 0 (full width)
- Chat FAB: bottom: 50px, left: 24px
- Toast: bottom: 100px, centered
```

---

*Update this file after every significant change!*
