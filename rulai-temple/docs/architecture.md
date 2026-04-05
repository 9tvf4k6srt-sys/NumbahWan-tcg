# Project Architecture

> How this codebase is organized and why.

## Design Philosophy

This repo is structured for **AI-agent efficiency**:

- **Content lives in markdown** (`content/*.md`) — human-readable, easy to diff, cheap to parse
- **A build-time compiler** (`scripts/compile-content.js`) reads the markdown and emits `src/content-data.ts`
- **The Hono server** (`src/index.tsx`) is a thin template that imports compiled data — zero runtime parsing
- **Styles and behavior** are vanilla CSS/JS in `public/static/` — no framework overhead, no build chain complexity

## Directory Map

```
webapp/
├── content/                  # ← EDIT HERE (source of truth for all text/config)
│   ├── site.md               # Global config: meta, nav, fonts, footer
│   ├── hero.md               # Hero section content + assets
│   ├── trailer.md            # Video trailer config + copy
│   ├── history.md            # Timeline content (1949, Legacy, Present)
│   ├── about.md              # About cards (3 cards)
│   ├── abbot.md              # Abbot bio, quote, images
│   ├── services.md           # 4 service cards + notice + CTA
│   ├── gallery.md            # Gallery images + captions
│   ├── vision.md             # Renovation renders + labels
│   └── visit.md              # Address, hours, contact
│
├── docs/                     # ← READ HERE (reference docs for AI agents)
│   ├── architecture.md       # This file — repo structure overview
│   ├── design-system.md      # CSS tokens, component patterns, responsive rules
│   ├── content-format.md     # How to write/edit content markdown files
│   ├── trailer-production.md # Video production history and techniques
│   └── deployment.md         # Build, deploy, and ops runbook
│
├── scripts/
│   └── compile-content.js    # Markdown → TypeScript data compiler
│
├── src/
│   ├── index.tsx              # Hono server — thin HTML template
│   └── content-data.ts        # AUTO-GENERATED — do not edit manually
│
├── public/static/
│   ├── app.js                 # Frontend JS (trilingual, GSAP, video player, nav)
│   ├── styles.css             # All CSS (design tokens, components, responsive)
│   ├── icons.svg              # Custom SVG icon sprite (13 symbols)
│   ├── trailer.mp4            # Drone flythrough video (V4 Incense Veil)
│   ├── favicon.ico
│   └── images/                # WebP images (logo variants, backgrounds, gallery)
│
├── ecosystem.config.cjs       # PM2 config for sandbox dev server
├── wrangler.jsonc             # Cloudflare Pages config
├── vite.config.ts             # Vite build config
├── package.json
├── tsconfig.json
└── .gitignore
```

## Data Flow

```
content/*.md  →  scripts/compile-content.js  →  src/content-data.ts  →  src/index.tsx  →  HTML
```

1. **Edit**: Change text in `content/*.md`
2. **Compile**: Run `npm run content` to regenerate `src/content-data.ts`
3. **Build**: Run `npm run build` (Vite compiles everything)
4. **Deploy**: `npm run deploy` pushes to Cloudflare Pages

## File Size Budget

| File | Lines | Purpose |
|------|-------|---------|
| `src/index.tsx` | ~120 | Thin template — loops over data, emits HTML |
| `src/content-data.ts` | ~300 | Auto-generated content data (DO NOT EDIT) |
| `public/static/app.js` | ~294 | Frontend behavior (video, nav, GSAP, i18n) |
| `public/static/styles.css` | ~241 | All styles |
| `public/static/icons.svg` | ~148 | SVG sprite |

## Key Conventions

1. **Trilingual content** uses `data-zh`, `data-en`, `data-th` HTML attributes
2. **Icons** are SVG symbols in `icons.svg`, referenced via `<use href="/static/icons.svg#ico-name"/>`
3. **Images** are WebP format, served from `/static/images/`
4. **No runtime dependencies** beyond Hono — all frontend is vanilla JS + GSAP CDN
5. **CSS variables** are defined in `:root` — change colors once, apply everywhere
