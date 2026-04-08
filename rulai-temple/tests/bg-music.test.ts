/**
 * tests/bg-music.test.ts
 * 
 * TDD tests for background music player system.
 * Requirements:
 *   - Audio element with loop, correct source
 *   - Mute/unmute toggle button (speaker icon)
 *   - Volume set to 30% by default (per audio analysis recommendation)
 *   - Persists mute preference in localStorage
 *   - Starts muted (browser autoplay policy), user click unmutes
 *   - Fade-in effect on first unmute
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

describe('Background Music — Audio Element', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = `
      <div id="particles"></div>
      <div id="incense-container"></div>
      <nav id="main-nav"><div class="nav-links"></div></nav>
      <button id="mobile-toggle"></button>
      <div id="music-toggle"></div>
    `
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('should create an audio element with id "bg-music"', () => {
    loadAppScript()
    const audio = document.getElementById('bg-music') as HTMLAudioElement
    expect(audio).not.toBeNull()
    expect(audio.tagName.toLowerCase()).toBe('audio')
  })

  it('should set the audio source to temple-ambient.mp3', () => {
    loadAppScript()
    const audio = document.getElementById('bg-music') as HTMLAudioElement
    expect(audio.src).toContain('temple-ambient.mp3')
  })

  it('should set audio to loop', () => {
    loadAppScript()
    const audio = document.getElementById('bg-music') as HTMLAudioElement
    expect(audio.loop).toBe(true)
  })

  it('should set default volume to 0.3 (30%)', () => {
    loadAppScript()
    const audio = document.getElementById('bg-music') as HTMLAudioElement
    expect(audio.volume).toBeCloseTo(0.3, 1)
  })

  it('should start muted (browser autoplay policy compliance)', () => {
    loadAppScript()
    const audio = document.getElementById('bg-music') as HTMLAudioElement
    expect(audio.muted).toBe(true)
  })
})

describe('Background Music — Toggle Button', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = `
      <div id="particles"></div>
      <div id="incense-container"></div>
      <nav id="main-nav"><div class="nav-links"></div></nav>
      <button id="mobile-toggle"></button>
      <div id="music-toggle"></div>
    `
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('should populate #music-toggle with a clickable button', () => {
    loadAppScript()
    const toggle = document.getElementById('music-toggle')!
    expect(toggle.innerHTML).not.toBe('')
    // Should contain some interactive element or be clickable itself
    expect(toggle.style.cursor || toggle.querySelector('button')).toBeTruthy()
  })

  it('should show muted icon initially (speaker-off state)', () => {
    loadAppScript()
    const toggle = document.getElementById('music-toggle')!
    // Should indicate muted state — contains "off" or muted visual indicator
    expect(toggle.classList.contains('muted') || toggle.getAttribute('data-muted') === 'true').toBe(true)
  })

  it('should toggle muted state when clicked', () => {
    loadAppScript()
    const toggle = document.getElementById('music-toggle')!
    const audio = document.getElementById('bg-music') as HTMLAudioElement
    
    // Initially muted
    expect(audio.muted).toBe(true)
    
    // Click to unmute
    toggle.click()
    expect(audio.muted).toBe(false)
    
    // Click to mute again
    toggle.click()
    expect(audio.muted).toBe(true)
  })

  it('should update visual state after toggle click', () => {
    loadAppScript()
    const toggle = document.getElementById('music-toggle')!
    
    // Click to unmute
    toggle.click()
    expect(toggle.getAttribute('data-muted')).toBe('false')
    
    // Click to mute
    toggle.click()
    expect(toggle.getAttribute('data-muted')).toBe('true')
  })
})

describe('Background Music — localStorage Persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = `
      <div id="particles"></div>
      <div id="incense-container"></div>
      <nav id="main-nav"><div class="nav-links"></div></nav>
      <button id="mobile-toggle"></button>
      <div id="music-toggle"></div>
    `
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('should save mute preference to localStorage when toggled', () => {
    loadAppScript()
    const toggle = document.getElementById('music-toggle')!
    
    toggle.click() // unmute
    expect(localStorage.getItem('temple-music-muted')).toBe('false')
    
    toggle.click() // mute
    expect(localStorage.getItem('temple-music-muted')).toBe('true')
  })

  it('should restore muted=false from localStorage if user previously unmuted', () => {
    localStorage.setItem('temple-music-muted', 'false')
    loadAppScript()
    const audio = document.getElementById('bg-music') as HTMLAudioElement
    // Should try to play unmuted (respecting user's previous choice)
    expect(audio.muted).toBe(false)
  })
})
