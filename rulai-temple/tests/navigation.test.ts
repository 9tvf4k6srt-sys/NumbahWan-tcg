/**
 * tests/navigation.test.ts
 * 
 * TDD tests for mobile navigation (hamburger menu) and scroll behavior.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

function loadAppScript(): void {
  const fs = require('fs')
  const code = fs.readFileSync('public/static/app.js', 'utf-8')
  ;(window as any).gsap = {
    registerPlugin: vi.fn(), from: vi.fn(), to: vi.fn(),
    timeline: () => ({ from: vi.fn().mockReturnThis() }),
    utils: { toArray: () => [] },
  }
  ;(window as any).ScrollTrigger = {}
  eval(code)
}

describe('Mobile Navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="particles"></div>
      <div id="incense-container"></div>
      <nav id="main-nav">
        <div class="nav-links">
          <a href="#hero">Home</a>
          <a href="#about">About</a>
          <a href="#services">Services</a>
        </div>
      </nav>
      <button id="mobile-toggle" aria-expanded="false"></button>
      <section id="hero" class="section" style="height:500px"></section>
      <section id="about" class="section" style="height:500px"></section>
      <section id="services" class="section" style="height:500px"></section>
    `
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('should open menu when mobile toggle is clicked', () => {
    loadAppScript()
    const toggle = document.getElementById('mobile-toggle')!
    toggle.click()
    expect(document.querySelector('.nav-links')!.classList.contains('open')).toBe(true)
    expect(document.body.classList.contains('menu-open')).toBe(true)
  })

  it('should close menu when toggle is clicked again', () => {
    loadAppScript()
    const toggle = document.getElementById('mobile-toggle')!
    toggle.click() // open
    toggle.click() // close
    expect(document.querySelector('.nav-links')!.classList.contains('open')).toBe(false)
    expect(document.body.classList.contains('menu-open')).toBe(false)
  })

  it('should close menu when a nav link is clicked', () => {
    loadAppScript()
    const toggle = document.getElementById('mobile-toggle')!
    toggle.click() // open
    const link = document.querySelector('.nav-links a') as HTMLElement
    link.click()
    expect(document.querySelector('.nav-links')!.classList.contains('open')).toBe(false)
  })

  it('should close menu on Escape key', () => {
    loadAppScript()
    const toggle = document.getElementById('mobile-toggle')!
    toggle.click() // open
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(document.querySelector('.nav-links')!.classList.contains('open')).toBe(false)
  })

  it('should set aria-expanded to true when menu opens', () => {
    loadAppScript()
    const toggle = document.getElementById('mobile-toggle')!
    toggle.click()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('should set aria-expanded to false when menu closes', () => {
    loadAppScript()
    const toggle = document.getElementById('mobile-toggle')!
    toggle.click() // open
    toggle.click() // close
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('Nav Scroll Behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="particles"></div>
      <div id="incense-container"></div>
      <nav id="main-nav">
        <div class="nav-links">
          <a href="#hero">Home</a>
          <a href="#about">About</a>
        </div>
      </nav>
      <button id="mobile-toggle"></button>
      <section id="hero" class="section"></section>
      <section id="about" class="section"></section>
    `
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('should add scrolled class to nav when scrollY > 80', () => {
    loadAppScript()
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true })
    window.dispatchEvent(new Event('scroll'))
    expect(document.getElementById('main-nav')!.classList.contains('scrolled')).toBe(true)
  })

  it('should not have scrolled class when scrollY <= 80', () => {
    loadAppScript()
    Object.defineProperty(window, 'scrollY', { value: 50, writable: true })
    window.dispatchEvent(new Event('scroll'))
    expect(document.getElementById('main-nav')!.classList.contains('scrolled')).toBe(false)
  })
})
