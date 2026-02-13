/**
 * ============================================================================
 *   P O S T - B U I L D — The Routing Manifest
 *   ~~~ Cloudflare Pages _routes.json Generator ~~~
 * ============================================================================
 *
 *   "Iron rusts from disuse; water loses its purity from stagnation...
 *    even so does inaction sap the vigor of the mind."
 *                                      — Leonardo da Vinci
 *
 *   After vite build compiles the worker (_worker.js), this script
 *   writes _routes.json into dist/ — the manifest that tells Cloudflare
 *   which requests should pass through the worker and which should be
 *   served directly from the asset store.
 *
 *   The Logic:
 *     include: ["/*"]     — By default, everything passes through the worker.
 *     exclude: [...]      — EXCEPT these paths, which are served as raw files.
 *
 *   Think of it as the castle's gatehouse ledger:
 *     "Let all travelers through — UNLESS they're heading to the
 *      static wing, the lore archives, the museum, or the world atlas.
 *      Those doors open directly."
 *
 *   Cloudflare has a 100-rule limit. We use wildcards, never enumerate
 *   individual HTML files. Efficiency is elegance.
 *
 * ============================================================================
 */

const fs = require('fs')
const path = require('path')

// ── The Routing Manifest ──────────────────────────────────────────
//
//   include: Everything passes through the worker by default.
//
//   exclude: These sovereign territories bypass the worker entirely.
//   They are served directly from Cloudflare's edge CDN — no cold
//   starts, no compute cost, pure speed.
//
const manifest = {
  version: 1,

  // The default: all paths enter through the worker gates
  include: ['/*'],

  // The exceptions: paths that bypass the worker entirely
  exclude: [
    // Asset directories — the castle's treasure rooms
    '/static/*',
    '/lore/*',
    '/museum/*',
    '/vault/*',
    '/research/*',
    '/tabletop/*',

    // World atlas pages — served as sovereign HTML
    '/world/img/*',
    '/world/*.html',

    // Web standards & infrastructure
    '/.well-known/*',
    '/_headers',

    // Root-level files — the castle's public notices
    '/favicon.ico',
    '/favicon.svg',
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
    '/llms-full.txt',
  ],
}

// ── Write to dist/ ────────────────────────────────────────────────
const distDir = path.join(__dirname, 'dist')

if (fs.existsSync(distDir)) {
  const outputPath = path.join(distDir, '_routes.json')
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2))

  const { include, exclude } = manifest
  console.log(
    `_routes.json created — ${include.length} include, ${exclude.length} exclude rules`
  )
} else {
  console.warn('dist/ not found — skipping _routes.json generation')
}
