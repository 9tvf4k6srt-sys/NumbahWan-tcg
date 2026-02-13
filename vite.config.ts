/**
 * ============================================================================
 *   V I T E   C O N F I G U R A T I O N
 *   ~~~ NumbahWan Guild — The Architect's Blueprint ~~~
 * ============================================================================
 *
 *   "Simplicity is the ultimate sophistication."
 *                                      — Leonardo da Vinci
 *
 *   This configuration governs the build pipeline for Castle NumbahWan's
 *   digital presence. Like the castle itself — seven stories of stone and
 *   enchanted masonry — this file balances structural rigidity with the
 *   fluidity of modern web architecture.
 *
 *   Architecture:
 *     Hono (server) + Cloudflare Pages (deploy) + Vite (build)
 *     Static pages live in /public as sovereign HTML documents.
 *     The worker (_worker.js) handles API routes and dynamic responses.
 *     Static assets bypass the worker entirely — served directly.
 *
 *   The Three Principles:
 *     1. Sovereignty  — HTML pages are self-contained, never bundled
 *     2. Permeability — Any host, any proxy, any tunnel may reach us
 *     3. Separation   — Static assets and worker routes never collide
 *
 * ============================================================================
 */

import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

// ── Page Discovery ─────────────────────────────────────────────────
//
//   The castle has many doors. This function walks the /public directory
//   like a cartographer mapping rooms, collecting every .html page so
//   the build knows which paths belong to static pages (not the worker).
//
//   Skips: /static (assets), /.well-known (web standards)
//
function discoverPages(baseDir = 'public', subDir = ''): string[] {
  const pages: string[] = []
  const currentDir = subDir ? join(__dirname, baseDir, subDir) : join(__dirname, baseDir)

  try {
    for (const item of readdirSync(currentDir)) {
      const fullPath = join(currentDir, item)
      const relativePath = subDir ? `${subDir}/${item}` : item

      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory() && item !== 'static' && item !== '.well-known') {
          pages.push(...discoverPages(baseDir, relativePath))
        } else if (item.endsWith('.html')) {
          pages.push(`/${relativePath}`)
        }
      } catch {
        // Some doors are locked. We move on.
      }
    }
  } catch (e) {
    console.error('Page discovery failed for:', currentDir, e)
  }

  return pages
}

// ── The Static Kingdoms ────────────────────────────────────────────
//
//   These paths are sovereign territories — they bypass the worker
//   entirely and are served as raw files by Cloudflare's edge CDN.
//   Like the castle's outer walls, they stand independent.
//
const STATIC_REALMS = [
  '/favicon.svg',
  '/manifest.json',
  '/static/*',
  '/lore/*',
  '/museum/*',
  '/vault/*',
  '/research/*',
  '/world/*',
] as const

// ============================================================================
//   E X P O R T — The Master Blueprint
// ============================================================================

export default defineConfig({

  // ── Server: The Open Gates ──────────────────────────────────────
  //
  //   "The gates of Castle NumbahWan are an engineering marvel."
  //
  //   allowedHosts: true
  //     Any host header is welcome — sandbox proxies, Cloudflare tunnels,
  //     ngrok, dev containers. The castle does not check your papers.
  //
  //   cors: true
  //     Cross-origin requests flow freely, like the moat water
  //     enchanted with bioluminescent algae.
  //
  //   headers:
  //     CORS and COEP/CORP headers ensure images load through any proxy.
  //     This was the fix for the Great 403 Incident — Vite's host check
  //     was rejecting sandbox proxy requests to /static/* assets.
  //
  server: {
    allowedHosts: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },

  // ── Plugins: The Twin Engines ───────────────────────────────────
  plugins: [

    // Build Plugin — The Stonemason
    //   Compiles the Hono server into _worker.js for Cloudflare Pages.
    //   excludeRoutes tells the worker: "These paths are not yours."
    build({
      outputDir: 'dist',
      excludeRoutes: [
        ...discoverPages(),
        ...STATIC_REALMS,
      ],
    }),

    // Dev Server Plugin — The Alchemist
    //   In development, this bridges Vite's dev server with the Hono
    //   application, using the Cloudflare adapter for local emulation.
    devServer({
      adapter,
      entry: 'src/index.tsx',
    }),
  ],
})
