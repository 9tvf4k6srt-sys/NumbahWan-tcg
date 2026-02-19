/**
 * Cache Utility - Multi-Tier Caching Strategy
 * Based on AI Training Guide: Chapter 7 - Caching and Memory Management
 *
 * Implements:
 * - Cache-Control headers for CDN/browser caching
 * - ETag support for conditional requests
 * - Stale-while-revalidate for better UX
 */

import type { Context, Next } from 'hono'

// Cache duration constants (in seconds)
export const CACHE_DURATIONS = {
  STATIC_ASSETS: 31536000, // 1 year for versioned assets
  IMAGES: 2592000, // 30 days for images
  HTML_PAGES: 3600, // 1 hour for HTML (can revalidate)
  API_DATA: 300, // 5 minutes for API responses
  REALTIME: 0, // No cache for real-time data
}

/**
 * Cache middleware for static assets
 * Implements: CDN caching + browser caching + stale-while-revalidate
 */
export function cacheStatic(maxAge: number = CACHE_DURATIONS.STATIC_ASSETS) {
  return async (c: Context, next: Next) => {
    await next()

    // Only cache successful responses
    if (c.res.status === 200) {
      c.res.headers.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=86400`)
      c.res.headers.set('Vary', 'Accept-Encoding')
    }
  }
}

/**
 * Cache middleware for API responses
 * Short TTL with stale-while-revalidate for fast updates
 */
export function cacheAPI(maxAge: number = CACHE_DURATIONS.API_DATA) {
  return async (c: Context, next: Next) => {
    await next()

    if (c.res.status === 200) {
      c.res.headers.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`)
    }
  }
}

/**
 * No-cache middleware for real-time endpoints
 */
export function noCache() {
  return async (c: Context, next: Next) => {
    await next()
    c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    c.res.headers.set('Pragma', 'no-cache')
  }
}

/**
 * Generate ETag for content
 * Used for conditional requests (If-None-Match)
 */
export function generateETag(content: string): string {
  // Simple hash for ETag
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `"${Math.abs(hash).toString(16)}"`
}
