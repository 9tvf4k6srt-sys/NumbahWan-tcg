/**
 * tests/trilingual.test.ts
 * 
 * TDD tests for the trilingual system (ZH/EN/TH).
 * setLang() should switch all [data-zh/en/th] elements' textContent.
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

describe('Trilingual Language System', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="particles"></div>
      <div id="incense-container"></div>
      <nav id="main-nav">
        <div class="nav-links"></div>
      </nav>
      <button id="mobile-toggle"></button>
      <button class="lang-btn active" data-lang="zh">中文</button>
      <button class="lang-btn" data-lang="en">EN</button>
      <button class="lang-btn" data-lang="th">TH</button>
      <h1 data-zh="如來寺" data-en="Rulai Temple" data-th="วัดรู่ไหล">如來寺</h1>
      <p data-zh="歡迎" data-en="Welcome" data-th="ยินดีต้อนรับ">歡迎</p>
    `
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('should default to Chinese (zh)', () => {
    loadAppScript()
    expect(document.querySelector('h1')!.textContent).toBe('如來寺')
    expect(document.querySelector('.lang-btn.active')!.getAttribute('data-lang')).toBe('zh')
  })

  it('should switch all text to English when setLang("en") is called', () => {
    loadAppScript()
    ;(window as any).setLang('en')
    expect(document.querySelector('h1')!.textContent).toBe('Rulai Temple')
    expect(document.querySelector('p')!.textContent).toBe('Welcome')
  })

  it('should switch all text to Thai when setLang("th") is called', () => {
    loadAppScript()
    ;(window as any).setLang('th')
    expect(document.querySelector('h1')!.textContent).toBe('วัดรู่ไหล')
    expect(document.querySelector('p')!.textContent).toBe('ยินดีต้อนรับ')
  })

  it('should update active class on language buttons', () => {
    loadAppScript()
    ;(window as any).setLang('en')
    const btns = document.querySelectorAll('.lang-btn')
    btns.forEach(b => {
      if (b.getAttribute('data-lang') === 'en') {
        expect(b.classList.contains('active')).toBe(true)
      } else {
        expect(b.classList.contains('active')).toBe(false)
      }
    })
  })

  it('should switch font-family to Thai font when language is Thai', () => {
    loadAppScript()
    ;(window as any).setLang('th')
    expect(document.body.style.fontFamily).toContain('Noto Sans Thai')
  })

  it('should revert font-family when switching back to Chinese', () => {
    loadAppScript()
    ;(window as any).setLang('th')
    ;(window as any).setLang('zh')
    expect(document.body.style.fontFamily).toContain('Noto Sans TC')
    expect(document.body.style.fontFamily).not.toContain('Noto Sans Thai')
  })

  it('should switch language when lang button is clicked', () => {
    loadAppScript()
    const enBtn = document.querySelector('.lang-btn[data-lang="en"]') as HTMLElement
    enBtn.click()
    expect(document.querySelector('h1')!.textContent).toBe('Rulai Temple')
  })
})
