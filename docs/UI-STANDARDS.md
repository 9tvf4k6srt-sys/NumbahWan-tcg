# NumbahWan UI Standards & Best Practices

## CRITICAL: Read Before Making ANY UI Changes

This document defines **mandatory** UI patterns. Following these prevents:
- Overlapping elements
- Inconsistent button placement
- Z-index conflicts
- User confusion

---

## 1. Screen Layout Zones

```
┌──────────────────────────────────────────────────────────┐
│                    TOP SAFE ZONE (60px)                  │
│  ┌─────────────────────────────────┐    ┌──────────────┐│
│  │     PAGE HEADER (left side)     │    │  [←] [☰]    ││ ← Nav buttons
│  │     Title, badges, etc.         │    │  (top-right) ││   ALWAYS here
│  └─────────────────────────────────┘    └──────────────┘│
├──────────────────────────────────────────────────────────┤
│                                                          │
│                                                          │
│                    CONTENT AREA                          │
│              (starts at top: 70px)                       │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                  BOTTOM SAFE ZONE (80px)                 │
│              For floating action buttons                 │
│                      [FAB] →                      (right)│
└──────────────────────────────────────────────────────────┘
```

### Zone Rules

| Zone | Reserved For | Z-Index |
|------|--------------|---------|
| Top-right (80x60px) | Back + Menu buttons | 500 |
| Top-left | Page title/header | 300 |
| Bottom-right | Floating action button | 300 |
| Full screen | Modals, overlays | 700-800 |

---

## 2. Z-Index Scale (ONLY use these!)

```css
--nw-z-base: 1;        /* Normal content */
--nw-z-dropdown: 100;  /* Dropdowns, tooltips */
--nw-z-sticky: 200;    /* Sticky elements */
--nw-z-fixed: 300;     /* Fixed headers, FABs */
--nw-z-nav: 500;       /* Navigation buttons */
--nw-z-drawer: 600;    /* Side panels */
--nw-z-modal: 700;     /* Modal dialogs */
--nw-z-overlay: 800;   /* Full overlays (pack opening) */
--nw-z-toast: 900;     /* Toast notifications */
--nw-z-loader: 1000;   /* Loading screens */
```

### ❌ NEVER DO THIS:
```css
z-index: 9999;    /* NO! */
z-index: 99999;   /* ABSOLUTELY NOT! */
z-index: 50;      /* Not in the scale */
```

### ✅ ALWAYS DO THIS:
```css
z-index: var(--nw-z-modal);  /* Use CSS variable */
```

---

## 3. Navigation Buttons

### Position: TOP-RIGHT (Always!)
```css
.nw-nav-buttons {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: var(--nw-z-nav);
}
```

### Button Order: [Back] [Menu]
- Back button: Goes to previous page
- Menu button: Opens navigation drawer

### Home Page Exception:
- Hide back button (no previous page)
- Menu button shifts to back button position

---

## 4. Page Headers

### Position: TOP-LEFT
```css
.nw-page-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 80px;  /* Leave space for nav buttons! */
  height: 60px;
  z-index: var(--nw-z-fixed);
}
```

### Header Content:
- Page title (left-aligned)
- Optional: Badge, subtitle
- NEVER put interactive elements that could overlap nav

---

## 5. Content Area

### Start Position
```css
.nw-page {
  padding-top: 70px;  /* Below header + breathing room */
  padding-bottom: 80px;  /* Above bottom safe zone */
}
```

### If Page Has Tabs/Filters at Top:
```css
.page-with-tabs {
  padding-top: 120px;  /* Header (60) + Tabs (50) + gap (10) */
}
```

---

## 6. Modal/Overlay Rules

### Full-Screen Overlays (pack opening, card reveal)
```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: var(--nw-z-overlay);  /* 800 */
}
```

### Modal Dialogs
```css
.modal {
  z-index: var(--nw-z-modal);  /* 700 */
}
```

### Close Buttons on Modals
- Position: Top-right OF THE MODAL (not screen)
- Size: 36x36px minimum (touch-friendly)

---

## 7. Floating Action Buttons (FAB)

### Position: BOTTOM-RIGHT
```css
.nw-fab {
  position: fixed;
  bottom: 24px;
  right: 16px;
  z-index: var(--nw-z-fixed);
}
```

### When to Use:
- Primary action (Pull cards, Start battle)
- Always visible regardless of scroll

### When NOT to Use:
- Multiple actions (use bottom bar instead)
- Non-primary actions

---

## 8. Touch Targets

### Minimum Sizes
| Element | Min Size | Recommended |
|---------|----------|-------------|
| Buttons | 36x36px | 44x44px |
| Nav buttons | 36x36px | 36x36px |
| Links | 44px height | 48px height |
| Form inputs | 44px height | 48px height |

### Spacing Between Touch Targets
- Minimum: 8px gap
- Recommended: 12px gap

---

## 9. Standard Page Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Page Title | NumbahWan TCG</title>
  
  <!-- Design System FIRST -->
  <link rel="stylesheet" href="/static/nw-design-system.css">
  
  <!-- Then Tailwind -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Core JS -->
  <script src="/static/nw-essentials.js"></script>
  <script src="/static/nw-wallet.js"></script>
  <script src="/static/nw-nav.js"></script>
</head>
<body data-page-id="page-name">

  <!-- Page Header (optional) -->
  <header class="nw-page-header">
    <h1 class="nw-page-title">Page Title</h1>
  </header>

  <!-- Main Content -->
  <main class="nw-page">
    <div class="nw-container">
      <!-- Your content here -->
    </div>
  </main>

  <!-- Floating Action Button (optional) -->
  <button class="nw-fab">🎴</button>

</body>
</html>
```

---

## 10. Common Mistakes & Fixes

### ❌ Problem: Nav overlaps page header
```css
/* BAD */
.my-header { top: 0; left: 0; right: 0; }
```
```css
/* GOOD */
.my-header { top: 0; left: 0; right: 80px; }  /* Leave nav space */
```

### ❌ Problem: Content hidden behind header
```css
/* BAD */
.content { margin-top: 20px; }
```
```css
/* GOOD */
.content { padding-top: var(--nw-content-top); }  /* 70px */
```

### ❌ Problem: Modal appears behind other elements
```css
/* BAD */
.my-modal { z-index: 100; }
```
```css
/* GOOD */
.my-modal { z-index: var(--nw-z-modal); }  /* 700 */
```

### ❌ Problem: Buttons too small on mobile
```css
/* BAD */
.btn { padding: 4px 8px; }
```
```css
/* GOOD */
.btn { padding: 12px 20px; min-height: 44px; }
```

---

## 11. Responsive Breakpoints

```css
/* Mobile first */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Mobile Adjustments:
- Reduce padding: 16px → 12px
- Stack horizontal elements vertically
- Larger touch targets
- Hide non-essential elements

---

## 12. Animation Guidelines

### Duration
| Type | Duration |
|------|----------|
| Micro (hover, press) | 150ms |
| Normal (transitions) | 250ms |
| Complex (modals) | 400ms |

### Easing
```css
--nw-ease-out: cubic-bezier(0.33, 1, 0.68, 1);
--nw-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--nw-ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Performance
- Use `transform` and `opacity` for animations
- Avoid animating `width`, `height`, `top`, `left`
- Use `will-change` sparingly

---

## Checklist Before Submitting UI Changes

- [ ] Used CSS variables from design system (no magic numbers)
- [ ] Z-index from approved scale only
- [ ] Nav buttons not obstructed
- [ ] Content starts at 70px from top
- [ ] Touch targets minimum 36x36px
- [ ] Tested on mobile viewport (375px width)
- [ ] No horizontal scroll on mobile
- [ ] Modals have close button in top-right
