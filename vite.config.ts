import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'
import { readdirSync } from 'fs'
import { join } from 'path'

// Get all HTML files from public directory
function getHtmlFiles() {
  try {
    const files = readdirSync(join(__dirname, 'public'))
    return files.filter(f => f.endsWith('.html')).map(f => `/${f}`)
  } catch {
    return []
  }
}

export default defineConfig({
  plugins: [
    build({
      outputDir: 'dist',
      // Exclude all HTML files and static assets from worker routing
      excludeRoutes: [
        ...getHtmlFiles(),
        '/favicon.svg',
        '/manifest.json',
        '/static/*'
      ]
    }),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ]
})
