import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

// Get all HTML files from public directory recursively
function getHtmlFiles(baseDir = 'public', subDir = ''): string[] {
  const results: string[] = []
  const currentDir = subDir ? join(__dirname, baseDir, subDir) : join(__dirname, baseDir)
  try {
    const items = readdirSync(currentDir)
    for (const item of items) {
      const fullPath = join(currentDir, item)
      const relativePath = subDir ? `${subDir}/${item}` : item
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory() && item !== 'static' && item !== '.well-known') {
          // Recurse into subdirectories (skip static and .well-known)
          results.push(...getHtmlFiles(baseDir, relativePath))
        } else if (item.endsWith('.html')) {
          results.push(`/${relativePath}`)
        }
      } catch {
        // Skip items we can't stat
      }
    }
  } catch (e) {
    console.error('Error reading directory:', currentDir, e)
  }
  return results
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
        '/static/*',
        '/lore/*',
        '/museum/*',
        '/vault/*',
        '/research/*'
      ]
    }),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ]
})
