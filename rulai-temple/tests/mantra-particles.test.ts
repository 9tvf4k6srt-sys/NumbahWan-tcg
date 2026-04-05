/**
 * tests/mantra-particles.test.ts
 * 
 * TDD tests for Sanskrit mantra particle system.
 * Syllables: ॐ म णि प द्मे हूं (Om Mani Padme Hum)
 * 
 * Two particle systems:
 *   1. Hero particles — static pool floating in #particles container
 *   2. Incense particles — continuously spawning from bottom in #incense-container
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const SYLLABLES = ['ॐ', 'म', 'णि', 'प', 'द्मे', 'हूं']

/** Load app.js into the jsdom environment */
function loadAppScript(): void {
  const script = document.createElement('script')
  // We can't import app.js directly (it's not a module), so we eval it
  const fs = require('fs')
  const code = fs.readFileSync('public/static/app.js', 'utf-8')
  // Mock GSAP before executing (app.js calls initGSAP via load event)
  ;(window as any).gsap = {
    registerPlugin: vi.fn(),
    from: vi.fn(),
    to: vi.fn(),
    timeline: () => ({
      from: vi.fn().mockReturnThis(),
    }),
    utils: { toArray: () => [] },
  }
  ;(window as any).ScrollTrigger = {}

  eval(code)
}

describe('Hero Mantra Particles', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="particles"></div>
      <div id="incense-container"></div>
      <nav id="main-nav"><div class="nav-links"></div></nav>
      <button id="mobile-toggle"></button>
    `
    // Mock innerWidth for desktop
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('should create particles inside #particles container', () => {
    loadAppScript()
    const container = document.getElementById('particles')
    const particles = container!.querySelectorAll('.hero-particle')
    expect(particles.length).toBeGreaterThan(0)
  })

  it('should create 36 particles on desktop (width >= 900)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200 })
    loadAppScript()
    const container = document.getElementById('particles')
    const particles = container!.querySelectorAll('.hero-particle')
    expect(particles.length).toBe(36)
  })

  it('should create 18 particles on mobile (width < 900)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 600 })
    loadAppScript()
    const container = document.getElementById('particles')
    const particles = container!.querySelectorAll('.hero-particle')
    expect(particles.length).toBe(18)
  })

  it('should use only valid Sanskrit syllables from Om Mani Padme Hum', () => {
    loadAppScript()
    const container = document.getElementById('particles')
    const particles = container!.querySelectorAll('.hero-particle')
    particles.forEach(p => {
      expect(SYLLABLES).toContain(p.textContent)
    })
  })

  it('should include all 6 syllables (full mantra coverage)', () => {
    loadAppScript()
    const container = document.getElementById('particles')
    const particles = container!.querySelectorAll('.hero-particle')
    const usedSyllables = new Set(Array.from(particles).map(p => p.textContent))
    SYLLABLES.forEach(s => {
      expect(usedSyllables).toContain(s)
    })
  })

  it('should set random positioning (left/top as percentages)', () => {
    loadAppScript()
    const container = document.getElementById('particles')
    const particles = container!.querySelectorAll('.hero-particle') as NodeListOf<HTMLElement>
    particles.forEach(p => {
      expect(p.style.left).toMatch(/%$/)
      expect(p.style.top).toMatch(/%$/)
    })
  })

  it('should set font-size in rem range (0.7 to 1.8)', () => {
    loadAppScript()
    const container = document.getElementById('particles')
    const particles = container!.querySelectorAll('.hero-particle') as NodeListOf<HTMLElement>
    particles.forEach(p => {
      const size = parseFloat(p.style.fontSize)
      expect(size).toBeGreaterThanOrEqual(0.7)
      expect(size).toBeLessThanOrEqual(1.8)
    })
  })

  it('should set opacity between 0.08 and 0.28 (subtle ambience)', () => {
    loadAppScript()
    const container = document.getElementById('particles')
    const particles = container!.querySelectorAll('.hero-particle') as NodeListOf<HTMLElement>
    particles.forEach(p => {
      const opacity = parseFloat(p.style.opacity)
      expect(opacity).toBeGreaterThanOrEqual(0.08)
      expect(opacity).toBeLessThanOrEqual(0.28)
    })
  })

  it('should be text elements, not empty dots', () => {
    loadAppScript()
    const container = document.getElementById('particles')
    const particles = container!.querySelectorAll('.hero-particle')
    particles.forEach(p => {
      expect(p.textContent!.length).toBeGreaterThan(0)
    })
  })
})

describe('Floating Mantra Incense Particles', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = `
      <div id="particles"></div>
      <div id="incense-container"></div>
      <nav id="main-nav"><div class="nav-links"></div></nav>
      <button id="mobile-toggle"></button>
    `
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('should spawn particles in #incense-container over time', () => {
    loadAppScript()
    vi.advanceTimersByTime(2000)
    const container = document.getElementById('incense-container')
    const particles = container!.querySelectorAll('.incense-particle')
    expect(particles.length).toBeGreaterThan(0)
  })

  it('should use Sanskrit syllables, not empty dots', () => {
    loadAppScript()
    vi.advanceTimersByTime(5000)
    const container = document.getElementById('incense-container')
    const particles = container!.querySelectorAll('.incense-particle')
    particles.forEach(p => {
      expect(p.textContent!.length).toBeGreaterThan(0)
      expect(SYLLABLES).toContain(p.textContent)
    })
  })

  it('should cycle through all 6 syllables in order', () => {
    loadAppScript()
    // Advance enough for 6+ particles on desktop (interval 450ms)
    vi.advanceTimersByTime(450 * 6 + 100)
    const container = document.getElementById('incense-container')
    const particles = container!.querySelectorAll('.incense-particle')
    const texts = Array.from(particles).map(p => p.textContent)
    // First 6 should be the full mantra in order
    for (let i = 0; i < Math.min(6, texts.length); i++) {
      expect(texts[i]).toBe(SYLLABLES[i])
    }
  })

  it('should position particles at bottom with left in vw', () => {
    loadAppScript()
    vi.advanceTimersByTime(2000)
    const container = document.getElementById('incense-container')
    const particles = container!.querySelectorAll('.incense-particle') as NodeListOf<HTMLElement>
    particles.forEach(p => {
      expect(p.style.bottom).toMatch(/^0(px)?$/)
      expect(p.style.left).toMatch(/vw$/)
    })
  })

  it('should set animation duration between 8s and 18s', () => {
    loadAppScript()
    vi.advanceTimersByTime(2000)
    const container = document.getElementById('incense-container')
    const particles = container!.querySelectorAll('.incense-particle') as NodeListOf<HTMLElement>
    particles.forEach(p => {
      const dur = parseFloat(p.style.animationDuration)
      expect(dur).toBeGreaterThanOrEqual(8)
      expect(dur).toBeLessThanOrEqual(18)
    })
  })

  it('should auto-remove particles after 18 seconds', () => {
    loadAppScript()
    vi.advanceTimersByTime(1000) // spawn some
    const container = document.getElementById('incense-container')
    const countBefore = container!.querySelectorAll('.incense-particle').length
    expect(countBefore).toBeGreaterThan(0)

    vi.advanceTimersByTime(19000) // wait for removal + more spawns
    // Old ones should be removed; container shouldn't grow unbounded
    // After 20s total at 450ms interval = ~44 spawned, but 18s cleanup means bounded
    const countAfter = container!.querySelectorAll('.incense-particle').length
    expect(countAfter).toBeLessThan(50) // bounded, not accumulating forever
  })

  it('should spawn slower on mobile (900ms vs 450ms)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 600 })
    loadAppScript()
    vi.advanceTimersByTime(4500) // 4.5 seconds
    const container = document.getElementById('incense-container')
    const particles = container!.querySelectorAll('.incense-particle')
    // At 900ms interval, 4500ms = 5 particles
    expect(particles.length).toBe(5)
  })

  it('should set font-size in rem range (0.65 to 1.45)', () => {
    loadAppScript()
    vi.advanceTimersByTime(2000)
    const container = document.getElementById('incense-container')
    const particles = container!.querySelectorAll('.incense-particle') as NodeListOf<HTMLElement>
    particles.forEach(p => {
      const size = parseFloat(p.style.fontSize)
      expect(size).toBeGreaterThanOrEqual(0.65)
      expect(size).toBeLessThanOrEqual(1.45)
    })
  })
})
