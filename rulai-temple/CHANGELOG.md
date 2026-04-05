# Changelog

All notable changes to the Rulai Temple website.

## [Unreleased] — Markdown Refactoring

- **Refactored**: Entire content system moved to `content/*.md` markdown files
- **Added**: Build-time content compiler (`scripts/compile-content.js`)
- **Added**: `docs/` directory with architecture, design system, content format, trailer production, and deployment guides
- **Refactored**: `src/index.tsx` from 341-line hardcoded template → thin data-driven template importing from auto-generated `src/content-data.ts`
- **Removed**: Unused `public/static/style.css`
- **Updated**: `package.json` with `npm run content` script and `npm run build` auto-compiles content first

## V4 Trailer — Incense Veil (fc66b78)

- **Fixed**: Transitions no longer cause speed changes ("time warp" from V3)
- **Technique**: 8-frame zoom-blur + warm color shift at each cut, simulating drone passing through incense smoke
- **Spec**: 31.75s, 6.7 MB, constant 24 fps throughout

## V3 Trailer — Speed Ramp (d47be41)

- Speed-ramp 8x + boxblur 40 at cut points
- **Problem**: Drone unnaturally accelerates

## V2 Trailer — AI Bridge Clips (9892bff)

- AI-generated 4s bridge clips between segments using first-last-frame-to-video model
- Fixed logo endcard (removed broken ffmpeg drawtext, used actual logo image)
- **Problem**: Frames freeze at junctions

## V1 Trailer — Cross Dissolve (b39c48c)

- 4-segment frame-matched continuous drone shot (32s)
- Cross-dissolve transitions
- **Problem**: Visible ghost/double-image

## Initial Trailer (c2b6413)

- 3-segment drone flythrough with cross-dissolves
- Tibetan Buddhist ambient soundtrack
- Blob fetch for Range-less servers

## Mobile UX (7ad73b4)

- Fullscreen overlay nav with animated transitions
- Close-on-tap, body scroll lock, iOS fixes
- Active nav highlighting on scroll
- Centered language toggle at bottom on mobile

## Custom Icons (b4de59d)

- Replaced all FontAwesome icons with custom Tibetan Buddhist SVG sprite
- 15 symbols: dharma, lamp, mala, goldbar, vajra, om, fire, pray, pin, clock, phone, chevron, menu, incense, welcome
- Removed FontAwesome CDN dependency

## Professional Logo (e078566)

- Dharma wheel + lotus + endless knots on solid maroon (#2D0A0A)
- Three variants: full (1024px), medium, nav-size

## Content Additions (40f534c, 2030a92)

- Temple history timeline (1949 founding by 王居士, dual cultivation legacy, present day)
- Services section (化解事情, 點燈祈福, 加持法物, 冤親債主解怨金條)
- Renovation vision gallery (6 Tibetan Buddhist renders)

## Initial Release (1b64449)

- Trilingual support (Chinese, English, Thai)
- GSAP scroll-triggered animations
- Hero section with mandala loader
- About section with info cards
- Abbot profile with Diamond Sutra quote
- Gallery section
- Visit info section
- Floating incense particle effects
