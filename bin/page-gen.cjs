#!/usr/bin/env node
/**
 * NW Page Generator v2.0 — Universal Spec-to-Page Engine
 * 
 * Generates ANY page type from a YAML spec:
 *   - dlc-page, lore-page, feature-page, world-page (game content)
 *   - landing-page (marketing / product)
 *   - app-page (application / dashboard)
 *   - docs-page (documentation / reference)
 *
 * Each type has its own HTML template + validation rules.
 * Factory memory records every generation for recursive learning.
 *
 * Usage:
 *   node bin/page-gen.cjs specs/my-spec.yaml              # generate page
 *   node bin/page-gen.cjs specs/my-spec.yaml --dry-run    # preview without writing
 *   node bin/page-gen.cjs --validate specs/my-spec.yaml   # validate spec only
 *   node bin/page-gen.cjs --types                         # list supported types
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Factory Core — shared utilities
const core = require('./factory-core.cjs');
const { ROOT, ok, fail, info, warn, header, emit, timer, SPEC_TYPES, validateSpec: coreValidate, B, G, R, Y, C, X } = core;

// Art Forge integration
let artForge;
try { artForge = require('./art-forge.cjs'); } catch (e) { artForge = null; }

// Factory Memory integration
let memory;
try { memory = require('./factory-memory.cjs'); } catch (e) { memory = null; }

// ── Escape HTML entities ──
function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}
function raw(s) { return s || ''; }

// ── Validate Spec (enhanced with factory-core type registry) ──
function validateSpec(spec) {
  // Use factory-core's universal validator first
  const coreResult = coreValidate(spec);
  const errors = coreResult.errors.map(e => e.msg);
  const warnings = coreResult.warnings.map(w => w.msg);
  const suggestions = coreResult.suggestions.map(s => s.msg);

  // Type-specific additional checks
  if (spec.type === 'dlc-page' && !spec.dlc) errors.push('DLC page requires dlc number');
  if (spec.hero?.stats) {
    spec.hero.stats.forEach((s, i) => {
      if (!s.val) errors.push(`Hero stat ${i}: missing val`);
    });
  }
  if (spec.explore?.features) {
    spec.explore.features.forEach((f, i) => {
      if (!f.key) errors.push(`Feature ${i}: missing key`);
      if (!f.en) errors.push(`Feature ${i}: missing en text`);
    });
  }

  // Landing page checks — cinematic doctrine (references/LANDING-CINEMATIC.md)
  if (spec.type === 'landing-page') {
    const beats = spec.beats || spec.sections;
    if (!beats || !beats.length) errors.push('Landing page requires beats (or legacy sections)');
    if (beats && (beats.length < 2 || beats.length > 5)) {
      warn(`Landing has ${beats.length} beats — cinematic arc wants 3–5 (hero counts as beat 1)`);
    }
    if (!spec.cta) errors.push('Landing page requires a cta — the hook must carry a visible CTA');
    if (spec.hero?.video) {
      const v = spec.hero.video;
      if (!v.poster) errors.push('hero.video requires poster — it is the LCP, reduced-motion, and no-JS fallback');
      if (!v.webm && !v.mp4) errors.push('hero.video requires at least one source (webm and/or mp4)');
      if (v.webm && !v.mp4) warn('hero.video has webm only — add mp4 for Safari/H.264 fallback');
      // Enforce the 4MB hero video budget when the file exists locally
      for (const src of [v.webm, v.mp4]) {
        if (!src) continue;
        const local = path.join(ROOT, 'public', src.replace(/^\//, ''));
        if (fs.existsSync(local)) {
          const mb = fs.statSync(local).size / (1024 * 1024);
          if (mb > 4) errors.push(`hero video ${src} is ${mb.toFixed(1)}MB — budget is 4MB (LANDING-CINEMATIC §5)`);
        }
      }
    }
    if (beats) {
      beats.forEach((b, i) => {
        if (b.media?.src && !b.media.alt && b.media.type !== 'video') {
          warn(`Beat ${i} media has no alt text — a11y gate will flag it`);
        }
      });
    }
  }

  // App page checks  
  if (spec.type === 'app-page') {
    if (!spec.components || !spec.components.length) errors.push('App page requires at least one component');
  }

  // Show warnings and suggestions
  warnings.forEach(w => warn(w));
  suggestions.forEach(s => info(`Suggestion: ${s}`));

  return errors;
}

// ── Generate i18n keys from spec (universal — works for all types) ──
function extractI18nKeys(spec) {
  const keys = {};
  const slug = spec.slug.replace(/-/g, '');
  
  // Universal: title and subtitle
  if (spec.hero?.title || spec.title) keys[`${slug}Title`] = { en: spec.hero?.title || spec.title };
  if (spec.hero?.subtitle) keys[`${slug}Sub`] = { en: spec.hero.subtitle };
  if (spec.hero?.badge) keys[`${slug}Label`] = { en: spec.hero.badge };

  // CTA (landing pages)
  if (spec.cta?.text) keys[`${slug}CTA`] = { en: spec.cta.text };
  if (spec.hero?.kicker) keys[`${slug}Kicker`] = { en: spec.hero.kicker };
  if (spec.type === 'landing-page') {
    keys[`${slug}ScrollCue`] = { en: spec.hero?.scroll_cue || 'Scroll to explore' };
  }

  // Beats (cinematic landing pages)
  if (spec.beats) {
    spec.beats.forEach((b, i) => {
      if (b.title) keys[`${slug}Beat${i}Title`] = { en: b.title };
      if (b.body) keys[`${slug}Beat${i}Body`] = { en: b.body };
      if (b.kicker) keys[`${slug}Beat${i}Kicker`] = { en: b.kicker };
      if (b.media?.cue) keys[`${slug}Beat${i}Cue`] = { en: b.media.cue };
    });
  }
  
  // Hero stats (game pages)
  if (spec.hero?.stats) {
    spec.hero.stats.forEach(s => {
      if (s.i18n_key) keys[s.i18n_key] = { en: s.label };
    });
  }

  // Sections (landing, docs)
  if (spec.sections) {
    spec.sections.forEach((s, i) => {
      const prefix = spec.type === 'docs-page' ? `${slug}Doc${i}` : `${slug}Sec${i}`;
      if (s.title) keys[`${prefix}Title`] = { en: s.title };
      if (s.body) keys[`${prefix}Body`] = { en: s.body };
    });
  }

  // Components (app pages)
  if (spec.components) {
    spec.components.forEach((comp, i) => {
      if (comp.title) keys[`${slug}Comp${i}Title`] = { en: comp.title };
      if (comp.body) keys[`${slug}Comp${i}Body`] = { en: comp.body };
    });
  }

  // Explore section (game pages)
  if (spec.explore) {
    const e = spec.explore;
    if (e.tag) keys[`${slug}ExploreTag`] = { en: e.tag };
    if (e.title) keys[`${slug}ExploreTitle`] = { en: e.title };
    if (e.tagline) keys[`${slug}ExploreTagline`] = { en: e.tagline };
    
    if (e.lore?.paragraphs) {
      e.lore.paragraphs.forEach(p => { if (p.key) keys[p.key] = { en: p.en }; });
    }
    if (e.lore?.heading) keys[`${slug}LoreH3`] = { en: e.lore.heading };
    if (e.features) {
      e.features.forEach(f => {
        keys[f.key] = { en: f.title };
        keys[`${f.key}_p`] = { en: f.en };
      });
    }
    if (e.boss_image?.frame_tag) keys[`ftag_${slug}boss`] = { en: e.boss_image.frame_tag };
    if (e.lore?.side_image?.frame_tag) keys[`ftag_${slug}keyart`] = { en: e.lore.side_image.frame_tag };
  }

  return keys;
}

// ═══════════════════════════════════════════════════════════════
// TYPE-SPECIFIC HTML GENERATORS
// Each type has its own section generator. Add new types here.
// ═══════════════════════════════════════════════════════════════

const TYPE_GENERATORS = {
  'dlc-page': generateGameHTML,
  'lore-page': generateGameHTML,
  'feature-page': generateGameHTML,
  'world-page': generateGameHTML,
  'landing-page': generateLandingHTML,
  'app-page': generateAppHTML,
  'docs-page': generateDocsHTML,
  'game-page': generatePlayableGameHTML,
  'game-page-3d': generatePlayableGameHTML,
};

// ── Landing Page Generator — cinematic (references/LANDING-CINEMATIC.md) ──
// The page is a short film: hero = hook (beat 1), beats = the arc, film layer
// = grain/vignette/grade, fallback ladder = poster / reduced-motion / no-JS.
function generateLandingHTML(spec) {
  const slug = spec.slug.replace(/-/g, '');
  const c = spec.theme?.primary || '#ff6b00';
  const grade = spec.theme?.grade || 'rgba(20,16,40,0.28)';
  const hero = spec.hero || {};

  // ── Hero media: video (with full fallback ladder) > image > none ──
  let heroMedia = '';
  if (hero.video) {
    const v = hero.video;
    const sources = [
      v.webm ? `      <source src="${esc(v.webm)}" type="video/webm">` : '',
      v.mp4 ? `      <source src="${esc(v.mp4)}" type="video/mp4">` : '',
    ].filter(Boolean).join('\n');
    heroMedia = `  <div class="nwl-hero-media">
    <video autoplay muted loop playsinline preload="metadata"
      poster="${esc(v.poster)}" width="1920" height="1080"
      aria-label="${esc(v.aria || hero.title || spec.title)}" data-nwl-hero-video>
${sources}
      <img src="${esc(v.poster)}" alt="${esc(v.aria || hero.title || spec.title)}" width="1920" height="1080">
    </video>
  </div>`;
  } else if (hero.image) {
    heroMedia = `  <div class="nwl-hero-media">
    <img src="${esc(hero.image.src)}" alt="${esc(hero.image.alt || spec.title)}" width="1920" height="1080" fetchpriority="high" decoding="async">
  </div>`;
  }

  let html = `<!-- ==================== LANDING: ${spec.title.toUpperCase()} ==================== -->
<div class="nwl-page" id="${spec.slug}" style="--nwl-accent:${c};--nwl-grade:${grade}">
<section class="nwl-hero">
${heroMedia}
  <div class="nwl-hero-inner">`;
  if (hero.kicker) {
    html += `\n    <div class="nwl-kicker" data-i18n="${slug}Kicker">${esc(hero.kicker)}</div>`;
  }
  html += `
    <h1 class="nwl-title" data-i18n="${slug}Title">${esc(hero.title || spec.title)}</h1>
    <p class="nwl-sub" data-i18n="${slug}Sub">${esc(hero.subtitle || '')}</p>`;
  if (spec.cta) {
    html += `\n    <a href="${esc(spec.cta.href || '#')}" class="nwl-cta" data-i18n="${slug}CTA">${esc(spec.cta.text || 'Get Started')}</a>`;
  }
  html += `
  </div>
  <div class="nwl-scroll-cue" aria-hidden="true" data-i18n="${slug}ScrollCue">${esc(hero.scroll_cue || 'Scroll to explore')}</div>
</section>\n`;

  // ── Beats: the narrative arc (alternating composition = scroll rhythm) ──
  const beats = spec.beats || (spec.sections || []).map(s => ({ title: s.title, body: s.body }));
  beats.forEach((b, i) => {
    const bKey = `${slug}Beat${i}`;
    const flip = i % 2 === 1 ? ' nwl-beat--flip' : '';
    const center = b.layout === 'center' ? ' nwl-beat--center' : '';
    html += `\n<section class="nwl-beat${center || flip}" id="${spec.slug}-beat-${i + 1}">
  <div class="nwl-beat-copy nwl-reveal">
    <div class="nwl-beat-index">${String(i + 2).padStart(2, '0')}${b.kicker ? ` — <span data-i18n="${bKey}Kicker">${esc(b.kicker)}</span>` : ''}</div>
    <h2 data-i18n="${bKey}Title">${esc(b.title || '')}</h2>
    <p data-i18n="${bKey}Body">${esc(b.body || '')}</p>
  </div>`;
    if (b.media) {
      const m = b.media;
      if (m.type === '3d') {
        // Interactive core: lazy canvas, keyboard/ARIA, explicit interaction cue
        html += `
  <div class="nwl-beat-media nwl-reveal">
    <div class="nwl-3d" data-nwl-3d="${esc(m.module || '')}">
      <canvas role="img" aria-label="${esc(m.alt || b.title || 'Interactive 3D scene')}" tabindex="0" width="1200" height="800"></canvas>
      <div class="nwl-3d-cue" data-i18n="${bKey}Cue">${esc(m.cue || 'Drag to explore')}</div>
    </div>
  </div>`;
      } else if (m.type === 'video') {
        html += `
  <div class="nwl-beat-media nwl-reveal">
    <video muted loop playsinline preload="none" loading="lazy" poster="${esc(m.poster || '')}" width="1200" height="675" data-nwl-lazy-video>
      ${m.webm ? `<source data-src="${esc(m.webm)}" type="video/webm">` : ''}${m.mp4 ? `<source data-src="${esc(m.mp4)}" type="video/mp4">` : ''}
    </video>
  </div>`;
      } else if (m.src) {
        html += `
  <div class="nwl-beat-media nwl-reveal">
    <img src="${esc(m.src)}" alt="${esc(m.alt || b.title || '')}" loading="lazy" decoding="async" width="1200" height="675">
  </div>`;
      }
    }
    html += `\n</section>\n`;
  });

  // ── Resolution: arc closes, CTA repeats ──
  if (spec.cta) {
    html += `\n<section class="nwl-beat nwl-beat--center" id="${spec.slug}-resolve">
  <div class="nwl-beat-copy nwl-reveal">
    <h2 data-i18n="${slug}Title">${esc(hero.title || spec.title)}</h2>
    <p style="margin:0 auto var(--nw-space-8,32px)" data-i18n="${slug}Sub">${esc(hero.subtitle || '')}</p>
    <a href="${esc(spec.cta.href || '#')}" class="nwl-cta" data-i18n="${slug}CTA">${esc(spec.cta.text || 'Get Started')}</a>
  </div>
</section>\n`;
  }

  // Film layer (grain + vignette + grade) — fixed, pointer-events none
  html += `\n<div class="nwl-film" aria-hidden="true"></div>\n</div>\n`;
  return html;
}

// ── App Page Generator ──
function generateAppHTML(spec) {
  const slug = spec.slug.replace(/-/g, '');
  const layout = spec.layout || 'single';
  let html = `<!-- ==================== APP: ${spec.title.toUpperCase()} ==================== -->
<div class="app-layout app-layout--${layout}" id="${spec.slug}">
  <header class="app-header">
    <h1 data-i18n="${slug}Title">${esc(spec.title)}</h1>
  </header>
  <main class="app-main">\n`;

  if (spec.components) {
    spec.components.forEach((comp, i) => {
      const cKey = `${slug}Comp${i}`;
      html += `    <div class="app-component app-component--${comp.type || 'card'}" id="${spec.slug}-comp-${i}">
      <h3 data-i18n="${cKey}Title">${esc(comp.title || '')}</h3>
      <div class="app-component-body" data-i18n="${cKey}Body">${esc(comp.body || '')}</div>
    </div>\n`;
    });
  }

  html += `  </main>\n</div>\n`;
  return html;
}

// ── Docs Page Generator ──
function generateDocsHTML(spec) {
  const slug = spec.slug.replace(/-/g, '');
  let html = `<!-- ==================== DOCS: ${spec.title.toUpperCase()} ==================== -->
<article class="docs-page" id="${spec.slug}">
  <h1 class="docs-title" data-i18n="${slug}Title">${esc(spec.title)}</h1>\n`;

  if (spec.sections) {
    spec.sections.forEach((s, i) => {
      const sKey = `${slug}Doc${i}`;
      html += `  <section class="docs-section" id="${spec.slug}-${i}">
    <h2 data-i18n="${sKey}Title">${esc(s.title || '')}</h2>
    <div data-i18n="${sKey}Body">${esc(s.body || '')}</div>`;
      if (s.code) {
        html += `\n    <pre class="docs-code"><code>${esc(s.code)}</code></pre>`;
      }
      html += `\n  </section>\n`;
    });
  }

  html += `</article>\n`;
  return html;
}

// ── Game Page Generator (DLC, Lore, Feature, World) ──
function generateGameHTML(spec) {
  const slug = spec.slug.replace(/-/g, '');
  const c = spec.theme?.primary || '#ff6b00';
  const grad = spec.theme?.gradient || `rgba(255,107,0,.08), rgba(3,3,5,1), rgba(168,85,247,.05)`;
  const dlcNum = spec.dlc || '';

  // ── Banner ──
  let html = `<!-- ==================== DLC ${dlcNum} BANNER: ${spec.title.toUpperCase()} ==================== -->
<div class="dlc-banner" id="${spec.slug}" style="border-color:${c}33;background:linear-gradient(135deg,${grad})">
  <div class="dlc-label" data-i18n="${slug}Label" style="color:${c}">${esc(spec.hero.badge || `DLC ${dlcNum} • ${spec.title}`)}</div>
  <h2 class="dlc-title" data-i18n="${slug}Title" style="color:${c}">${esc(spec.hero.title)}</h2>
  <p data-i18n="${slug}Sub" style="max-width:700px;margin:1rem auto;color:rgba(232,230,227,.8)">${esc(spec.hero.subtitle || '')}</p>`;

  // Stats
  if (spec.hero.stats?.length) {
    html += `\n  <div class="dlc-stats" style="margin-top:1.5rem">`;
    spec.hero.stats.forEach(s => {
      const key = s.i18n_key ? ` data-i18n="${s.i18n_key}"` : '';
      const valStyle = s.val === 'FREE' ? 'color:#ff1dff' : `color:${c}`;
      html += `\n    <div class="dlc-stat"><div class="dlc-stat-val" style="${valStyle}">${esc(s.val)}</div><div class="dlc-stat-label"${key}>${esc(s.label)}</div></div>`;
    });
    html += `\n  </div>`;
  }
  html += `\n</div>\n`;

  // ── Explore Section ──
  if (spec.explore) {
    const e = spec.explore;
    html += `\n<!-- ==================== DLC ${dlcNum}: ${spec.title.toUpperCase()} — EXPLORE ==================== -->
<section class="showcase" id="${spec.slug}-explore">
  <div class="showcase-header">
    <div class="showcase-tag" style="color:${c}" data-i18n="${slug}ExploreTag">${esc(e.tag || '')}</div>
    <h2 class="showcase-title" data-i18n="${slug}ExploreTitle">${esc(e.title || '')}</h2>
    <p class="showcase-tagline" data-i18n="${slug}ExploreTagline">${esc(e.tagline || '')}</p>
  </div>\n`;

    // Boss image
    if (e.boss_image) {
      const bi = e.boss_image;
      html += `\n  <div class="game-frame">
    <div class="frame-tag" data-i18n="ftag_${slug}boss">${esc(bi.frame_tag || '')}</div>
    <div class="frame-engine" style="background:${c}99">DLC ${dlcNum} BOSS</div>
    <img src="${bi.src}" alt="${esc(bi.alt || '')}" loading="lazy" width="1365" height="768" decoding="async">
  </div>\n`;
    }

    // Lore section (dual layout)
    if (e.lore) {
      html += `\n  <div class="dual" style="margin-top:3rem">
    <div class="dual-text">
      <h3 data-i18n="${slug}LoreH3">${esc(e.lore.heading || '')}</h3>`;
      
      if (e.lore.paragraphs) {
        e.lore.paragraphs.forEach(p => {
          html += `\n      <p data-i18n="${p.key}">${esc(p.en)}</p>`;
        });
      }
      html += `\n    </div>`;

      if (e.lore.side_image) {
        const si = e.lore.side_image;
        html += `\n    <div class="game-frame">
      <div class="frame-tag" data-i18n="ftag_${slug}keyart">${esc(si.frame_tag || '')}</div>
      <div class="frame-engine" style="background:${c}99">DLC ${dlcNum}</div>
      <img src="${si.src}" alt="${esc(si.alt || '')}" loading="lazy" width="1365" height="768" decoding="async">
    </div>`;
      }
      html += `\n  </div>\n`;
    }

    // Feature grid
    if (e.features?.length) {
      html += `\n  <div class="feature-grid" style="margin-top:3rem">`;
      e.features.forEach(f => {
        html += `\n    <div class="feature-card" style="border-color:${c}33">
      <div class="feature-icon">${f.icon || '⚡'}</div>
      <h3 data-i18n="${f.key}">${esc(f.title)}</h3>
      <p data-i18n="${f.key}_p">${esc(f.en)}</p>
    </div>`;
      });
      html += `\n  </div>`;
    }

    html += `\n</section>\n`;
  }

  return html;
}

// ── Build PAGE_I18N from i18n keys ──
// Reads the .i18n.json sidecar (if it exists) for zh/th translations,
// otherwise uses extractI18nKeys() en-only data.
function buildPageI18n(spec, i18nJsonPath) {
  const i18nKeys = extractI18nKeys(spec);
  const result = { en: {}, zh: {}, th: {} };

  // Try loading the sidecar .i18n.json which may have zh/th translations
  let sidecar = {};
  if (i18nJsonPath && fs.existsSync(i18nJsonPath)) {
    try { sidecar = JSON.parse(fs.readFileSync(i18nJsonPath, 'utf-8')); } catch (e) { /* ignore */ }
  }

  for (const [key, val] of Object.entries(i18nKeys)) {
    // en always comes from the spec
    // zh/th come from sidecar if available, otherwise empty (English falls through in nw-i18n-core)
    const sc = sidecar[key] || {};
    if (val.en) result.en[key] = val.en;
    if (sc.zh) result.zh[key] = sc.zh;
    if (sc.th) result.th[key] = sc.th;
  }

  return result;
}

// ── Generate standalone page (full HTML) ──
function generateFullPage(spec, sectionHTML, i18nJsonPath) {
  const slug = spec.slug;
  const title = spec.title;
  const pageI18n = buildPageI18n(spec, i18nJsonPath);
  // Serialize as a JS object literal with UNQUOTED identifier keys —
  // tests/nw-i18n-guard.cjs parses `en: {` / `key:` shapes; JSON-quoted keys
  // read as orphans and fail the i18n gate (factory memory: orphan STOP note).
  const jsKey = k => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
  const jsObj = obj => '{' + Object.entries(obj).map(([k, v]) =>
    `${jsKey(k)}:${typeof v === 'object' && v !== null ? jsObj(v) : JSON.stringify(v)}`
  ).join(',') + '}';
  const i18nJson = jsObj(pageI18n).replace(/<\//g, '<\\/');
  const isLanding = spec.type === 'landing-page';

  // Landing pages ship the cinematic layer; other types keep the game shell.
  const landingHead = isLanding ? `
    <meta name="description" content="${esc(spec.hero?.subtitle || title)}">
    <link rel="stylesheet" href="/static/nw-landing.css">${spec.hero?.video?.poster ? `
    <link rel="preload" as="image" href="${esc(spec.hero.video.poster)}" fetchpriority="high">` : ''}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js" defer></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js" defer></script>` : '';

  // Motion layer: reduced-motion aware, lazy videos, transform entrances
  // (never opacity-only — aitell L4). Without JS the page is fully readable.
  const landingMotion = isLanding ? `
<script>
/* ── nwl motion layer — auto-generated by page-gen.cjs ── */
window.addEventListener('DOMContentLoaded', function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fallback ladder rung 2: reduced motion → freeze hero video on its poster
  if (reduced) {
    document.querySelectorAll('[data-nwl-hero-video]').forEach(function (v) {
      v.removeAttribute('autoplay'); v.pause();
    });
    return; // no scroll choreography either
  }

  // Lazy below-the-fold videos: attach sources only when near viewport
  if ('IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var v = e.target;
        v.querySelectorAll('source[data-src]').forEach(function (s) {
          s.src = s.dataset.src; s.removeAttribute('data-src');
        });
        v.load(); v.play().catch(function () {});
        vio.unobserve(v);
      });
    }, { rootMargin: '200px' });
    document.querySelectorAll('[data-nwl-lazy-video]').forEach(function (v) { vio.observe(v); });
  }

  // Beat entrances: transform + stagger (arrives, never pops)
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('.nwl-reveal').forEach(function (el) {
      gsap.from(el, {
        y: 48, autoAlpha: 0, duration: 1.0, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none reverse' }
      });
    });
    gsap.from('.nwl-title, .nwl-sub, .nwl-cta', {
      yPercent: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08
    });
  }
});
</script>` : '';

  const preview = isLanding ? '' : `
<!-- Factory preview banner — this is a standalone fragment, not the full game page -->
<div style="position:sticky;top:0;z-index:1000;background:linear-gradient(90deg,rgba(255,107,0,.15),rgba(0,119,204,.15));
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);padding:8px 16px;text-align:center;
  border-bottom:1px solid rgba(255,215,0,.2);font-family:'Rajdhani',sans-serif">
  <span style="color:rgba(255,215,0,.9);font-size:.75rem;font-weight:600;letter-spacing:2px;text-transform:uppercase">
    ⚡ FACTORY PREVIEW — <a href="/world/nwg-the-game.html#${slug}" style="color:#0af;text-decoration:underline">View in full game page →</a>
  </span>
</div>
`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
    <title>${esc(title)} | NumbahWan Guild</title>
    <link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/static/nw-design-system.css">
    <link rel="stylesheet" href="/static/nw-game-common.css">${landingHead}
    <script src="/static/nw-i18n-shim.js"></script>
    <script src="/static/nw-nav.js" defer></script>
    <script src="/static/nw-i18n-core.js" defer></script>
</head>
<body>
<div class="nw-bg"></div>
${preview}
${sectionHTML}

<script>
/* ── PAGE_I18N — auto-generated by page-gen.cjs ── */
(function(){
  const PAGE_I18N = ${i18nJson};
  if (typeof NW_I18N !== 'undefined') NW_I18N.register(PAGE_I18N);
  else if (typeof initI18n === 'function') initI18n(PAGE_I18N);
  else (window.__NW_I18N_QUEUE = window.__NW_I18N_QUEUE || []).push(['register', PAGE_I18N]);
})();
</script>${landingMotion}
</body>
</html>`;
}

// ── Playable Game Page Generator (game-page, game-page-3d) ──
function generatePlayableGameHTML(spec) {
  const slug = spec.slug.replace(/-/g, '');
  const c = spec.theme?.primary || '#ff4444';
  const bg = spec.theme?.background || '#0c0c14';
  const title = spec.title || 'Game';
  const is3d = spec.type === 'game-page-3d';

  let html = `<!-- ==================== GAME: ${title.toUpperCase()} ==================== -->\n`;

  // Art pipeline integration
  if (spec.art && artForge) {
    const manifest = artForge.buildManifest(spec);
    const plan = artForge.planGeneration(manifest, spec.art.outputDir || `./public/games/art/${spec.slug}`);

    html += `<!--\n  ART FORGE v2.0 — Generation Plan\n`;
    html += `  Total assets: ${plan.stats.total}\n`;
    html += `  API calls needed: ${plan.stats.totalApiCalls} (${plan.stats.efficiency}% more efficient than naive)\n`;
    html += `  Individual: ${plan.stats.individual} | Batched: ${plan.stats.batched} (${plan.stats.sheets} sheets)\n`;
    html += `  Categories: ${Object.entries(plan.stats.categories).map(([k,v]) => `${k}:${v}`).join(', ')}\n`;
    html += `-->\n\n`;

    // Generate weapon binding comments
    const weaponEntries = manifest.filter(e => e.category === 'weapon');
    if (weaponEntries.length) {
      html += `<!-- WEAPON BINDINGS:\n`;
      weaponEntries.forEach(w => {
        const binding = artForge.WEAPON_BINDING.getBindingConfig(w.id);
        html += `  ${w.id}: type=${binding.type}, hold=(${binding.holdPoint.x},${binding.holdPoint.y})\n`;
      });
      html += `-->\n\n`;
    }
  }

  // Game container
  html += `<div class="game-container" id="${spec.slug}" style="--accent:${c};--bg:${bg}" data-game-type="${spec.type}">\n`;
  html += `  <canvas id="game-canvas"></canvas>\n`;
  html += `  <div id="game-hud"></div>\n`;
  html += `  <div id="game-ui"></div>\n`;
  html += `</div>\n`;

  // Renderer tier info for 3D games
  if (is3d) {
    const renderer = SPEC_TYPES['game-page-3d']?.renderer;
    if (renderer) {
      html += `<!-- RENDERER CONFIG:\n`;
      html += `  Fallback chain: ${renderer.fallbackChain.join(' → ')}\n`;
      html += `  Post-process: ${renderer.postProcess.join(', ')}\n`;
      Object.entries(renderer.tiers).forEach(([tier, info]) => {
        html += `  ${tier}: ${info.description} (target: ${info.sizeTarget})\n`;
      });
      html += `-->\n`;
    }
  }

  return html;
}

// ── Main ──
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const validateOnly = args.includes('--validate');
const showTypes = args.includes('--types');
const specPath = args.find(a => !a.startsWith('--'));

if (showTypes) {
  header('🏭', 'NW Page Generator v2.0 — Supported Types');
  Object.entries(SPEC_TYPES).forEach(([key, t]) => {
    console.log(`  ${G}${key.padEnd(16)}${X} ${t.description}`);
    console.log(`  ${' '.repeat(16)} Required: ${t.requiredFields.join(', ')}`);
    console.log(`  ${' '.repeat(16)} Output: ${t.outputDir}\n`);
  });
  process.exit(0);
}

if (!specPath) {
  header('🏭', 'NW Page Generator v2.0');
  console.log(`Usage: node bin/page-gen.cjs <spec.yaml> [--dry-run] [--validate] [--types]`);
  console.log(`\nSupported types: ${Object.keys(SPEC_TYPES).join(', ')}`);
  console.log(`\nRun --types for full type documentation`);
  process.exit(0);
}

const clock = timer();
header('🏭', 'NW Page Generator v2.0');
emit('page-gen', 'start', { spec: specPath });

// Load spec
const specFile = path.resolve(ROOT, specPath);
if (!fs.existsSync(specFile)) { fail(`Spec not found: ${specFile}`); process.exit(1); }
const spec = yaml.load(fs.readFileSync(specFile, 'utf-8'));
ok(`Loaded spec: ${spec.slug} (${spec.type})`);

// Validate
const errors = validateSpec(spec);
if (errors.length) {
  errors.forEach(e => fail(e));
  process.exit(1);
}
ok(`Validation passed`);
if (validateOnly) process.exit(0);

// Generate HTML section using type-specific generator
const generator = TYPE_GENERATORS[spec.type] || generateGameHTML;
const sectionHTML = generator(spec);
const i18nKeys = extractI18nKeys(spec);
const keyCount = Object.keys(i18nKeys).length;
ok(`Generated ${sectionHTML.split('\n').length} lines of HTML with ${keyCount} i18n keys`);

// Determine output paths from spec type registry
const typeConfig = SPEC_TYPES[spec.type] || { outputDir: 'public/world' };
const outputDir = typeConfig.outputDir;
const htmlPath = path.join(ROOT, outputDir, `${spec.slug}.html`);
const i18nPath = path.join(ROOT, outputDir, `${spec.slug}.i18n.json`);

if (dryRun) {
  info(`[DRY RUN] Would write HTML to: ${htmlPath}`);
  info(`[DRY RUN] Would write i18n to: ${i18nPath}`);
  info(`[DRY RUN] ${keyCount} i18n keys would be created`);
  console.log(`\n--- HTML Preview (first 30 lines) ---`);
  console.log(sectionHTML.split('\n').slice(0, 30).join('\n'));
  console.log(`\n--- i18n Keys ---`);
  Object.entries(i18nKeys).slice(0, 5).forEach(([k, v]) => {
    console.log(`  ${k}: "${v.en?.substring(0, 60)}${v.en?.length > 60 ? '...' : ''}"`);
  });
  if (keyCount > 5) info(`... and ${keyCount - 5} more keys`);
  process.exit(0);
}

// Write full page HTML (pass i18nPath so it can read existing sidecar translations)
const fullPage = generateFullPage(spec, sectionHTML, i18nPath);
fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
fs.writeFileSync(htmlPath, fullPage);
ok(`HTML written: ${htmlPath} (${(fullPage.length / 1024).toFixed(1)}KB)`);

// ── Memory-driven post-gen checks ──
if (memory) {
  const mem = memory.loadMemory();
  // Verify PAGE_I18N is not empty (lesson from DLC-12 bug)
  const i18nMatch = fullPage.match(/PAGE_I18N\s*=\s*(\{[^;]+\})/);
  if (i18nMatch) {
    try {
      // PAGE_I18N is a JS object literal (unquoted keys for the i18n guard) —
      // evaluate it in isolation rather than JSON.parse
      const parsed = new Function(`return (${i18nMatch[1]})`)();
      const enKeys = Object.keys(parsed.en || {}).length;
      const zhKeys = Object.keys(parsed.zh || {}).length;
      const thKeys = Object.keys(parsed.th || {}).length;
      if (enKeys === 0) {
        fail(`PAGE_I18N.en is empty — memory says this breaks language toggle!`);
        memory.recordLesson(mem, 'defect', {
          category: 'i18n',
          description: 'PAGE_I18N.en empty after generation',
          page: path.relative(ROOT, htmlPath),
          severity: 'critical',
        });
      } else {
        ok(`PAGE_I18N verified: ${enKeys} en, ${zhKeys} zh, ${thKeys} th`);
      }
      if (zhKeys === 0 || thKeys === 0) {
        warn(`Missing translations (zh: ${zhKeys}, th: ${thKeys}) — add to sidecar .i18n.json`);
        memory.recordLesson(mem, 'validation', {
          description: `Incomplete translations for ${spec.slug}`,
          checks: [
            { name: 'zh-translations', pass: zhKeys > 0, msg: `${zhKeys} zh keys` },
            { name: 'th-translations', pass: thKeys > 0, msg: `${thKeys} th keys` },
          ],
        });
      }
    } catch (e) { /* JSON parse fail, ignore */ }
  }
  // Record successful generation
  memory.recordLesson(mem, 'build', {
    description: `Generated ${spec.slug} (${(fullPage.length / 1024).toFixed(1)}KB, ${keyCount} i18n keys)`,
    slug: spec.slug,
    sizeKB: (fullPage.length / 1024).toFixed(1),
    keys: keyCount,
  });
  memory.saveMemory(mem);
}

// Write i18n JSON — merge with existing translations to preserve zh/th
let mergedI18n = i18nKeys;
if (fs.existsSync(i18nPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(i18nPath, 'utf-8'));
    mergedI18n = {};
    for (const [key, val] of Object.entries(i18nKeys)) {
      const ex = existing[key] || {};
      mergedI18n[key] = { en: val.en };
      if (ex.zh) mergedI18n[key].zh = ex.zh;
      if (ex.th) mergedI18n[key].th = ex.th;
    }
  } catch (e) { /* ignore parse errors, write fresh */ }
}
fs.writeFileSync(i18nPath, JSON.stringify(mergedI18n, null, 2));
ok(`i18n JSON written: ${i18nPath} (${keyCount} keys)`);

// Summary
const elapsed = clock.human();
console.log(`\n${G}${B}✓ Page generated successfully${X} (${elapsed})`);
info(`Type: ${spec.type} → ${typeConfig.outputDir}`);
info(`HTML: ${path.relative(ROOT, htmlPath)}`);
info(`i18n: ${path.relative(ROOT, i18nPath)}`);
info(`Keys: ${keyCount} (run i18n:inject to inject translations)`);
info(`Preview: open ${path.relative(ROOT, htmlPath)} in dev server`);
emit('page-gen', 'complete', { slug: spec.slug, type: spec.type, keys: keyCount, elapsed: clock.ms() });
