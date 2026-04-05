# 如來寺 Rulai Temple — Website

> Trilingual (zh/en/th) Tibetan Buddhist temple website — Douliu, Yunlin, Taiwan

## Quick Start

```bash
npm install            # Install dependencies
npm run content        # Compile content markdown → TypeScript
npm run build          # Build for production
npm run dev            # Local dev server (Vite HMR)
npm run deploy         # Build + deploy to Cloudflare Pages
```

## Architecture: AI-Optimized Markdown-Driven Content

This repo is structured so **any AI agent can understand and edit it cheaply**:

```
content/*.md  →  scripts/compile-content.js  →  src/content-data.ts  →  src/index.tsx  →  HTML
     ↑                                              (auto-generated)        (thin template)
 EDIT HERE
```

- **To change text/content**: edit `content/*.md`, run `npm run content`
- **To change styling**: edit `public/static/styles.css`
- **To change behavior**: edit `public/static/app.js`
- **To change structure**: edit `src/index.tsx` (template) or `scripts/compile-content.js` (parser)

## Directory Map

```
webapp/
├── content/                  ← SOURCE OF TRUTH for all text/config
│   ├── site.md               # Global: meta, nav, fonts, footer
│   ├── hero.md               # Hero section
│   ├── trailer.md            # Video trailer
│   ├── history.md            # Timeline (1949, Legacy, Present)
│   ├── about.md              # About cards (3)
│   ├── abbot.md              # Abbot bio + quote
│   ├── services.md           # Service cards (4) + notice + CTA
│   ├── gallery.md            # Photo gallery (5 images)
│   ├── vision.md             # Renovation renders (6 images)
│   └── visit.md              # Address, hours, contact
│
├── docs/                     ← REFERENCE for AI agents
│   ├── architecture.md       # Repo structure overview
│   ├── design-system.md      # CSS tokens, components, responsive
│   ├── content-format.md     # How to write content markdown
│   ├── trailer-production.md # Video production techniques
│   └── deployment.md         # Build & deploy runbook
│
├── scripts/
│   └── compile-content.js    # Markdown → TypeScript compiler
│
├── src/
│   ├── index.tsx              # Hono server — thin HTML template
│   └── content-data.ts        # AUTO-GENERATED (do not edit)
│
├── public/static/
│   ├── app.js                 # Frontend JS (i18n, video, GSAP, nav)
│   ├── styles.css             # All CSS
│   ├── icons.svg              # 15 custom SVG symbols
│   ├── trailer.mp4            # 32s drone flythrough (V4 Incense Veil)
│   ├── favicon.ico
│   └── images/                # WebP assets
│       ├── logo*.webp         # Logo variants (3)
│       ├── bg_*.webp          # Section backgrounds (6)
│       ├── abbot[1-5].webp    # Abbot gallery (5)
│       └── reno_*.webp        # Renovation renders (6)
│
├── ecosystem.config.cjs       # PM2 sandbox config
├── wrangler.jsonc             # Cloudflare Pages config
├── vite.config.ts             # Vite build
├── package.json
├── tsconfig.json
└── .gitignore
```

## Current Features

- Trilingual support (Chinese, English, Thai) with real-time switching
- GSAP scroll-triggered animations (parallax, reveals, rotations)
- Cinematic 32s drone flythrough trailer with invisible-cut transitions
- Custom SVG icon system (no external icon dependencies)
- Responsive design (desktop, tablet, mobile)
- Loading screen with mandala animation
- Floating incense particle effects
- Fullscreen mobile nav overlay

## Sections

| Section | Content File | Route |
|---------|-------------|-------|
| Hero | `content/hero.md` | `/#hero` |
| Trailer | `content/trailer.md` | `/#trailer` |
| History | `content/history.md` | `/#history` |
| About | `content/about.md` | `/#about` |
| Abbot | `content/abbot.md` | `/#abbot` |
| Services | `content/services.md` | `/#services` |
| Gallery | `content/gallery.md` | `/#gallery` |
| Vision | `content/vision.md` | `/#vision` |
| Visit | `content/visit.md` | `/#visit` |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Hono on Cloudflare Workers |
| Build | Vite |
| Deploy | Cloudflare Pages |
| CSS | Vanilla CSS (custom properties) |
| JS | Vanilla JS + GSAP (CDN) |
| Content | Markdown → TypeScript compiler |

## Deployment

| Environment | Status |
|------------|--------|
| Cloudflare Pages | Configured (`wrangler.jsonc`) |
| Sandbox | PM2 on port 3000 (`ecosystem.config.cjs`) |

## Token Efficiency

This repo is designed to minimize AI token costs:

1. **Content is separated** — an agent only needs to read `content/about.md` to change the About section, not the entire 10K `index.tsx`
2. **Docs are standalone** — `docs/design-system.md` explains all CSS conventions without reading `styles.css`
3. **Auto-generated code is labeled** — `content-data.ts` header says "DO NOT EDIT", saving agents from analyzing it
4. **Flat structure** — no nested frameworks, no monorepo complexity, no abstract layers
5. **Markdown tables** — structured data that parses cheaply vs. JSON or YAML
