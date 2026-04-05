# Design System

> Visual language, CSS tokens, component patterns, and responsive rules.

## Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--gold` | `#d4a853` | Primary accent: headings, icons, borders, CTA |
| `--deep-red` | `#8b1a1a` | Secondary: overlays, hover states |
| `--maroon` | `#5c1010` | Tertiary: dark overlays |
| `--dark` | `#1a0a0a` | Background, body |
| `--cream` | `#f5e6c8` | Body text, paragraphs |
| `--burgundy` | `#6b1c2a` | Accent dark |

## Typography

| Element | Font | Weight | Size | Spacing |
|---------|------|--------|------|---------|
| Body | Noto Sans TC | 400 | 16px base | — |
| Thai body | Noto Sans Thai | 400 | 16px base | — |
| Hero title | Noto Sans TC | 900 | 5rem (3rem mobile) | 0.3em |
| Section heading | Noto Sans TC | 700 | 2.8rem (1.8rem mobile) | 0.15em |
| Card title | Noto Sans TC | 700 | 1.3rem | 0.1em |
| Body text | Noto Sans TC | 400 | 0.95rem | — |

## Component Patterns

### Section Layout

Every section follows this structure:

```html
<section id="{id}" class="section {id}-section">
  <div class="section-bg" style="background-image:url('{bg_image}')"></div>
  <div class="section-overlay {dark|default}"></div>
  <div class="container">
    <div class="section-header {light|}">
      <div class="dharma-wheel"><svg.../></div>
      <h2 data-zh="..." data-en="..." data-th="...">...</h2>
      <div class="gold-divider"></div>
    </div>
    <!-- Section content -->
  </div>
</section>
```

- **dark overlay**: `class="section-overlay dark-overlay"` + `class="section-header light"`
- **default overlay**: `class="section-overlay"` + `class="section-header"`

### Card Component

```html
<div class="about-card reveal-{left|up|right}">
  <svg class="ico" viewBox="0 0 64 64"><use href="/static/icons.svg#{icon}"/></svg>
  <h3 data-zh="..." data-en="..." data-th="...">...</h3>
  <p data-zh="..." data-en="..." data-th="...">...</p>
</div>
```

### Trilingual Text Element

Any element with `data-zh`, `data-en`, `data-th` attributes gets its `textContent` swapped by `app.js` when the user changes language.

```html
<span data-zh="中文文字" data-en="English text" data-th="ข้อความไทย">中文文字</span>
```

### Icon Usage

All icons are SVG symbols in `/static/icons.svg`. Reference pattern:

```html
<svg class="ico" viewBox="0 0 64 64"><use href="/static/icons.svg#ico-{name}"/></svg>
```

Available icons: `dharma`, `lamp`, `mala`, `goldbar`, `vajra`, `om`, `fire`, `pray`, `pin`, `clock`, `phone`, `chevron`, `menu`, `incense`, `welcome`

### Icon Sizing Classes

| Class | Size | Usage |
|-------|------|-------|
| `.ico` | 1em (inherits) | Default inline icon |
| `.ico-dharma` | 1em | Dharma wheel in section headers |
| `.dharma-wheel .ico-dharma` | 48px | Large header dharma wheel |
| `.about-card .ico` | 48px | Card icons |
| `.service-icon .ico` | 56px | Service card icons |
| `.timeline-icon .ico` | 40px | Timeline icons |
| `.visit-card .ico` | 36px | Visit card icons |
| `.quote-icon .ico` | 32px | Quote block icon |
| `.scroll-indicator .ico` | 28px | Scroll down chevron |
| `.mobile-toggle .ico` | 22px | Hamburger menu |
| `.ico-inline` | 20px | Inline text icon |

## Animation Classes

| Class | Effect | Trigger |
|-------|--------|---------|
| `reveal-left` | Slide in from left (x: -80) | ScrollTrigger at 85% viewport |
| `reveal-right` | Slide in from right (x: 80) | ScrollTrigger at 85% viewport |
| `reveal-up` | Slide up (y: 60) with stagger | ScrollTrigger at 88% viewport |

## Responsive Breakpoints

| Breakpoint | Changes |
|------------|---------|
| ≤ 900px | Single column grids, fullscreen mobile nav overlay, fixed-bottom language toggle, scroll bg fallback |
| ≤ 480px | Smaller hero text, single column gallery/vision, hidden timeline line |

## Overlay Styles

| Type | Class | Gradient |
|------|-------|----------|
| Default | `.section-overlay` | `135deg, rgba(26,10,10,.75), rgba(92,16,16,.6)` |
| Dark | `.section-overlay.dark-overlay` | `135deg, rgba(26,10,10,.88), rgba(26,10,10,.8)` |
| Hero | `.hero-overlay` | `180deg, rgba(26,10,10,.6) 0%, rgba(92,16,16,.5) 50%, rgba(26,10,10,.8) 100%` |
