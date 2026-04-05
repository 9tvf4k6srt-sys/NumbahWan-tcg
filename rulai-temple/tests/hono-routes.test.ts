/**
 * tests/hono-routes.test.ts
 * 
 * TDD tests for the Hono server-side routes.
 * Tests HTML output structure, meta tags, trilingual data attributes, sections.
 */
import { describe, it, expect } from 'vitest'
import app from '../src/index'

describe('Hono Route: GET /', () => {
  it('should return 200 OK', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
  })

  it('should return HTML content', async () => {
    const res = await app.request('/')
    expect(res.headers.get('content-type')).toContain('text/html')
  })

  it('should contain the site title 如來寺', async () => {
    const res = await app.request('/')
    const html = await res.text()
    expect(html).toContain('如來寺')
  })

  it('should include Noto Sans Devanagari font for Sanskrit rendering', async () => {
    const res = await app.request('/')
    const html = await res.text()
    expect(html).toContain('Noto+Sans+Devanagari')
  })

  it('should contain the hero particles container', async () => {
    const res = await app.request('/')
    const html = await res.text()
    expect(html).toContain('id="particles"')
  })

  it('should contain the incense container', async () => {
    const res = await app.request('/')
    const html = await res.text()
    expect(html).toContain('id="incense-container"')
  })

  it('should include all major sections', async () => {
    const res = await app.request('/')
    const html = await res.text()
    const requiredSections = ['hero', 'trailer', 'history', 'about', 'abbot', 'services', 'gallery', 'vision', 'visit']
    requiredSections.forEach(id => {
      expect(html).toContain(`id="${id}"`)
    })
  })

  it('should include trilingual data attributes (data-zh, data-en, data-th)', async () => {
    const res = await app.request('/')
    const html = await res.text()
    expect(html).toContain('data-zh=')
    expect(html).toContain('data-en=')
    expect(html).toContain('data-th=')
  })

  it('should include language toggle buttons for zh, en, th', async () => {
    const res = await app.request('/')
    const html = await res.text()
    expect(html).toContain('data-lang="zh"')
    expect(html).toContain('data-lang="en"')
    expect(html).toContain('data-lang="th"')
  })

  it('should include the loader element', async () => {
    const res = await app.request('/')
    const html = await res.text()
    expect(html).toContain('id="loader"')
  })

  it('should include the main navigation', async () => {
    const res = await app.request('/')
    const html = await res.text()
    expect(html).toContain('id="main-nav"')
  })

  it('should include app.js script reference', async () => {
    const res = await app.request('/')
    const html = await res.text()
    expect(html).toContain('/static/app.js')
  })

  it('should include styles.css stylesheet reference', async () => {
    const res = await app.request('/')
    const html = await res.text()
    expect(html).toContain('/static/styles.css')
  })

  it('should include the footer with mantras', async () => {
    const res = await app.request('/')
    const html = await res.text()
    expect(html).toContain('footer-mantras')
  })
})
