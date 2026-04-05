/**
 * src/index.tsx — Thin template engine for Rulai Temple website
 * 
 * All content comes from content-data.ts (compiled from content/*.md)
 * This file only handles HTML structure and data binding.
 * 
 * Edit content: content/*.md → npm run content → npm run build
 * Edit styles:  public/static/styles.css
 * Edit behavior: public/static/app.js
 */

import { Hono } from 'hono'
import { siteData } from './content-data'

const app = new Hono()
const d = siteData

// Helper: trilingual data-attributes
const t = (obj: { zh: string; en: string; th: string }) =>
  `data-zh="${esc(obj.zh)}" data-en="${esc(obj.en)}" data-th="${esc(obj.th)}"`

// Helper: escape HTML attributes
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Helper: icon SVG
const ico = (id: string, cls = 'ico') =>
  `<svg class="${cls}" viewBox="0 0 64 64"><use href="/static/icons.svg#${id}"/></svg>`

// Helper: section header
const sectionHeader = (heading: { zh: string; en: string; th: string }, light = false) => `
  <div class="section-header${light ? ' light' : ''}">
    <div class="dharma-wheel">${ico('ico-dharma', 'ico-dharma')}</div>
    <h2 ${t(heading)}>${heading.zh}</h2>
    <div class="gold-divider"></div>
  </div>`

// Helper: overlay class
const overlayClass = (type: string) =>
  type === 'dark' ? 'section-overlay dark-overlay' : 'section-overlay'

app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${d.site.meta.title_zh}</title>
<meta name="description" content="${d.site.meta.description_zh}">
<link rel="icon" type="image/x-icon" href="${d.site.meta.favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&family=Noto+Sans+Thai:wght@300;400;700&family=Noto+Sans+Devanagari:wght@300;400;700&display=swap" rel="stylesheet">
<link href="/static/styles.css" rel="stylesheet">
</head>
<body>

<!-- LOADER -->
<div id="loader">
  <div class="loader-mandala"></div>
  <div class="loader-text" ${t(d.hero.content.loader_text)}>${d.hero.content.loader_text.zh}</div>
</div>

<!-- LANGUAGE TOGGLE -->
<nav id="lang-nav">
${d.site.langs.map((l: any) => `  <button class="lang-btn${l.code === 'zh' ? ' active' : ''}" data-lang="${l.code}">${l.label}</button>`).join('\n')}
</nav>

<!-- NAVIGATION -->
<nav id="main-nav">
  <div class="nav-logo"><img src="${d.hero.logo.nav_logo}" alt="如來寺" class="nav-logo-img"> <span ${t(d.hero.content.nav_title)}>${d.hero.content.nav_title.zh}</span></div>
  <div class="nav-links">
${d.site.nav.map((n: any) => `    <a href="#${n.id}" ${t(n)}>${n.zh}</a>`).join('\n')}
  </div>
  <button id="mobile-toggle" class="mobile-toggle">${ico('ico-menu')}</button>
</nav>

<!-- HERO -->
<section id="hero" class="section hero-section">
  <div class="hero-bg" style="background-image:url('${d.hero.logo.background}')"></div>
  <div class="hero-overlay"></div>
  <div class="hero-particles" id="particles"></div>
  <div class="hero-content">
    <div class="hero-logo"><img src="${d.hero.logo.hero_logo}" alt="如來寺" class="hero-logo-img"></div>
    <h1 class="hero-title" ${t(d.hero.content.title)}>${d.hero.content.title.zh}</h1>
    <p class="hero-sub" ${t(d.hero.content.subtitle)}>${d.hero.content.subtitle.zh}</p>
    <div class="hero-mantra" ${t(d.hero.content.mantra)}>${d.hero.content.mantra.zh}</div>
    <a href="#about" class="hero-cta" ${t(d.hero.content.cta)}>${d.hero.content.cta.zh}</a>
  </div>
  <div class="scroll-indicator">${ico('ico-chevron')}</div>
</section>

<!-- VIDEO TRAILER -->
<section id="trailer" class="section trailer-section">
  <div class="trailer-bg"></div>
  <div class="trailer-overlay"></div>
  <div class="container trailer-container">
    ${sectionHeader(d.trailer.content.heading, true)}
    <div class="trailer-wrapper reveal-up">
      <div class="trailer-video-wrap" id="trailer-wrap">
        <video id="temple-trailer" preload="none" playsinline muted poster="${d.trailer.config.poster}">
        </video>
        <button class="trailer-play-btn" id="play-btn" aria-label="Play trailer">
          <svg viewBox="0 0 80 80" class="play-icon">
            <circle cx="40" cy="40" r="38" fill="none" stroke="currentColor" stroke-width="2.5"/>
            <polygon points="32,24 32,56 58,40" fill="currentColor"/>
          </svg>
          <span ${t(d.trailer.content.play_btn)}>${d.trailer.content.play_btn.zh}</span>
        </button>
      </div>
      <p class="trailer-caption" ${t(d.trailer.content.caption)}>${d.trailer.content.caption.zh}</p>
    </div>
  </div>
</section>

<!-- HISTORY / ORIGIN -->
<section id="history" class="section history-section">
  <div class="section-bg" style="background-image:url('${d.history.config.background}')"></div>
  <div class="${overlayClass(d.history.config.overlay)}"></div>
  <div class="container">
    ${sectionHeader(d.history.heading.heading, d.history.config.overlay === 'dark')}
    <div class="history-timeline">
      <div class="timeline-line"></div>
${d.history.items.map((item: any) => {
  const yearZh = item.year || item.year_zh || '';
  const yearDisplay = yearZh;
  return `      <div class="timeline-item ${item.animation}">
        <div class="timeline-year">${yearDisplay}</div>
        <div class="timeline-content">
          <div class="timeline-icon">${ico(item.icon)}</div>
          <h3 ${t(item.title)}>${item.title.zh}</h3>
          <p ${t(item.body)}>${item.body.zh}</p>
        </div>
      </div>`;
}).join('\n')}
    </div>
  </div>
</section>

<!-- ABOUT -->
<section id="about" class="section about-section">
  <div class="section-bg" style="background-image:url('${d.about.config.background}')"></div>
  <div class="${overlayClass(d.about.config.overlay)}"></div>
  <div class="container">
    ${sectionHeader(d.about.heading.heading, d.about.config.overlay === 'dark')}
    <div class="about-grid">
${d.about.cards.map((card: any) => `      <div class="about-card ${card.animation}">
        ${ico(card.icon)}
        <h3 ${t(card.title)}>${card.title.zh}</h3>
        <p ${t(card.body)}>${card.body.zh}</p>
      </div>`).join('\n')}
    </div>
  </div>
</section>

<!-- ABBOT -->
<section id="abbot" class="section abbot-section">
  <div class="section-bg" style="background-image:url('${d.abbot.config.background}')"></div>
  <div class="${overlayClass(d.abbot.config.overlay)}"></div>
  <div class="container">
    ${sectionHeader(d.abbot.heading.heading, d.abbot.config.overlay === 'dark')}
    <div class="abbot-showcase">
      <div class="abbot-image-wrap reveal-left">
        <img src="${d.abbot.config.main_image}" alt="住持上師" class="abbot-main-img" loading="lazy">
        <div class="abbot-glow"></div>
      </div>
      <div class="abbot-info reveal-right">
        <h3 ${t(d.abbot.content.role)}>${d.abbot.content.role.zh}</h3>
        <p ${t(d.abbot.content.bio)}>${d.abbot.content.bio.zh}</p>
        <div class="abbot-quote">
          <span class="quote-icon">${ico('ico-mala')}</span>
          <blockquote ${t(d.abbot.content.quote)}>${d.abbot.content.quote.zh}</blockquote>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- SERVICES -->
<section id="services" class="section services-section">
  <div class="section-bg" style="background-image:url('${d.services.config.background}')"></div>
  <div class="${overlayClass(d.services.config.overlay)}"></div>
  <div class="container">
    ${sectionHeader(d.services.heading.heading, d.services.config.overlay === 'dark')}
    <div class="services-notice reveal-up">
      <p ${t(d.services.notice.notice)}>${d.services.notice.notice.zh}</p>
    </div>
    <div class="services-grid">
${d.services.services.map((svc: any) => `      <div class="service-card${svc.featured === 'true' ? ' featured' : ''} reveal-up">
        <div class="service-icon">${ico(svc.icon)}</div>
        <h4 ${t(svc.title)}>${svc.title.zh}</h4>
        <p ${t(svc.body)}>${svc.body.zh}</p>
      </div>`).join('\n')}
    </div>
    <div class="services-cta reveal-up">
      <p ${t(d.services.cta.cta)}>${ico('ico-welcome', 'ico ico-inline')} ${d.services.cta.cta.zh}</p>
    </div>
  </div>
</section>

<!-- GALLERY -->
<section id="gallery" class="section gallery-section">
  <div class="section-bg" style="background-image:url('${d.gallery.config.background}')"></div>
  <div class="${overlayClass(d.gallery.config.overlay)}"></div>
  <div class="container">
    ${sectionHeader(d.gallery.heading.heading, d.gallery.config.overlay === 'dark')}
    <div class="gallery-grid">
${d.gallery.images.map((img: any) => `      <div class="gallery-item reveal-up"><img src="${img.src}" alt="${esc(img.alt)}" loading="lazy"><div class="gallery-caption" data-zh="${esc(img.zh)}" data-en="${esc(img.en)}" data-th="${esc(img.th)}">${img.zh}</div></div>`).join('\n')}
    </div>
  </div>
</section>

<!-- VISION / RENOVATION -->
<section id="vision" class="section vision-section">
  <div class="section-bg" style="background-image:url('${d.vision.config.background}')"></div>
  <div class="${overlayClass(d.vision.config.overlay)}"></div>
  <div class="container">
    ${sectionHeader(d.vision.heading.heading, d.vision.config.overlay === 'dark')}
    <p class="vision-intro reveal-up" ${t(d.vision.intro.intro)}>${d.vision.intro.intro.zh}</p>
    <div class="vision-grid">
${d.vision.renders.map((r: any) => `      <div class="vision-item${r.large ? ' large' : ''} reveal-up">
        <img src="${r.src}" alt="${esc(r.alt)}" loading="lazy">
        <div class="vision-label" data-zh="${esc(r.zh)}" data-en="${esc(r.en)}" data-th="${esc(r.th)}">${r.zh}</div>
      </div>`).join('\n')}
    </div>
  </div>
</section>

<!-- VISIT -->
<section id="visit" class="section visit-section">
  <div class="section-bg" style="background-image:url('${d.visit.config.background}')"></div>
  <div class="${overlayClass(d.visit.config.overlay)}"></div>
  <div class="container">
    ${sectionHeader(d.visit.heading.heading, d.visit.config.overlay === 'dark')}
    <div class="visit-grid">
${d.visit.cards.map((card: any) => `      <div class="visit-card ${card.animation}">
        ${ico(card.icon)}
        <h4 ${t(card.title)}>${card.title.zh}</h4>
        <p ${t(card.body)}>${card.body.zh}</p>
      </div>`).join('\n')}
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer id="footer">
  <div class="footer-mantras">${d.site.meta.mantra} &nbsp;&middot;&nbsp; ${d.site.meta.mantra} &nbsp;&middot;&nbsp; ${d.site.meta.mantra} &nbsp;&middot;&nbsp; ${d.site.meta.mantra}</div>
  <div class="footer-content">
    <p ${t(d.site.footer.copyright)}>${d.site.footer.copyright.zh}</p>
  </div>
</footer>

<!-- FLOATING INCENSE -->
<div id="incense-container"></div>

${d.site.scripts.map((s: any) => `<script src="${s.url}"></script>`).join('\n')}
<script src="/static/app.js"></script>
</body>
</html>`)
})

export default app
