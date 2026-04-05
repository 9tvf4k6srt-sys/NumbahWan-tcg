# Deployment & Operations

> Build, deploy, and development server runbook.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Hono (Cloudflare Workers) |
| Build | Vite |
| Deploy | Cloudflare Pages |
| CSS | Vanilla CSS (no preprocessor) |
| JS | Vanilla JS + GSAP (CDN) |
| Icons | Custom SVG sprite |
| Dev Server | wrangler pages dev (via PM2) |

## Quick Commands

| Command | Purpose |
|---------|---------|
| `npm run content` | Compile content markdown → TypeScript data |
| `npm run build` | Vite build → `dist/` |
| `npm run dev` | Vite dev server (HMR) |
| `npm run deploy` | Build + deploy to Cloudflare Pages |
| `npm run dev:sandbox` | wrangler pages dev (for sandbox) |

## Sandbox Development

```bash
# 1. Compile content (after editing content/*.md)
cd /home/user/webapp && npm run content

# 2. Build
cd /home/user/webapp && npm run build

# 3. Start dev server
cd /home/user/webapp && pm2 start ecosystem.config.cjs

# 4. Test
curl http://localhost:3000

# 5. Get public URL
# Use GetServiceUrl tool on port 3000
```

## Cloudflare Pages Deployment

```bash
# 1. Setup Cloudflare API key (use setup_cloudflare_api_key tool)
# 2. Build
npm run build
# 3. Deploy
npx wrangler pages deploy dist --project-name <cloudflare_project_name>
```

## Project Config

- **wrangler.jsonc**: Cloudflare Workers config (compatibility date, flags)
- **vite.config.ts**: Vite build with @hono/vite-build/cloudflare-pages
- **ecosystem.config.cjs**: PM2 config for sandbox dev (port 3000)
- **tsconfig.json**: TypeScript with Hono JSX support

## Static Assets

All static files live in `public/static/` and are served at `/static/*`:

| Path | Content |
|------|---------|
| `/static/app.js` | Frontend JavaScript |
| `/static/styles.css` | All CSS |
| `/static/icons.svg` | SVG icon sprite |
| `/static/trailer.mp4` | Drone flythrough video |
| `/static/favicon.ico` | Favicon |
| `/static/images/*.webp` | All images (logo, backgrounds, gallery) |

## Image Inventory

| File | Size | Usage |
|------|------|-------|
| logo.webp | 58 KB | Full logo (1024x1024) |
| logo_med.webp | 7.5 KB | Hero logo |
| logo_nav.webp | 1 KB | Navbar logo |
| bg_hero.webp | — | Hero background |
| bg_temple.webp | — | Video poster, gallery bg |
| bg_history.webp | — | History section bg |
| bg_mandala.webp | — | Abbot & Vision section bg |
| bg_altar.webp | — | Services section bg |
| reno_*.webp | — | 6 renovation renders |
| abbot[1-5].webp | — | 5 abbot gallery photos |
