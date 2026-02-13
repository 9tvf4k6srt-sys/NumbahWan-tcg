/**
 * NW Page Builder v1.0 — DLC-Speed Content Generator
 *
 * Instead of writing 500+ lines of HTML per section, define content
 * as structured JSON and let the builder generate optimized HTML.
 *
 * Usage:
 *   NW_PAGE.section({ type:'showcase', id:'world', ... })
 *   NW_PAGE.section({ type:'dual', ... })
 *   NW_PAGE.section({ type:'dlc-banner', ... })
 *   NW_PAGE.section({ type:'boss-phase', ... })
 *   NW_PAGE.render('#content')  // Renders all sections into target
 *
 * Benefits:
 *   - Automatic i18n data-i18n attributes
 *   - Automatic image optimization (width/height/decoding/loading)
 *   - Automatic feature grid layout
 *   - Consistent class names and structure
 *   - 5-10x less code to write per section
 */
(function(){
  'use strict';

  const _sections = [];
  let _imgIndex = 0;

  // ── Helpers ─────────────────────────────────────────────
  function esc(s){ return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; }
  function raw(s){ return s || ''; } // Allow HTML in descriptions

  function imgTag(src, alt, opts = {}){
    _imgIndex++;
    const load = _imgIndex <= 2 ? 'eager' : 'lazy';
    const fp = _imgIndex <= 2 ? ' fetchpriority="high"' : '';
    return `<img src="${esc(src)}" alt="${esc(alt)}" loading="${load}"${fp} width="1024" height="572" decoding="async">`;
  }

  function gameFrame(img, opts = {}){
    const tags = [];
    if (opts.tag) tags.push(`<div class="frame-tag"${opts.tagI18n ? ' data-i18n="'+esc(opts.tagI18n)+'"' : ''}>${esc(opts.tag)}</div>`);
    if (opts.engine) tags.push(`<div class="frame-engine">${esc(opts.engine)}</div>`);
    if (opts.dlcBadge) tags.push(`<div class="frame-dlc">${esc(opts.dlcBadge)}</div>`);
    return `<div class="game-frame">${tags.join('')}${imgTag(img.src, img.alt)}</div>`;
  }

  function featureCard(f){
    const cls = f.dlc ? ' dlc-card' : '';
    return `<div class="feature-card${cls}">
      <div class="feature-icon">${raw(f.icon)}</div>
      <h3${f.titleI18n ? ' data-i18n="'+esc(f.titleI18n)+'"' : ''}>${esc(f.title)}</h3>
      <p${f.descI18n ? ' data-i18n="'+esc(f.descI18n)+'"' : ''}>${raw(f.desc)}</p>
    </div>`;
  }

  // ── Section Builders ───────────────────────────────────

  function buildShowcase(s){
    let html = `<section class="showcase" id="${esc(s.id)}">
  <div class="showcase-header">
    <div class="showcase-tag"${s.tagI18n ? ' data-i18n="'+esc(s.tagI18n)+'"' : ''}>${esc(s.tag)}</div>
    <h2 class="showcase-title"${s.titleI18n ? ' data-i18n="'+esc(s.titleI18n)+'"' : ''}>${esc(s.title)}</h2>
    <p class="showcase-tagline"${s.taglineI18n ? ' data-i18n="'+esc(s.taglineI18n)+'"' : ''}>${esc(s.tagline)}</p>
  </div>`;

    // Render content blocks
    if (s.blocks) {
      s.blocks.forEach(b => {
        html += '\n  ' + buildBlock(b);
      });
    }

    // Feature grid
    if (s.features && s.features.length) {
      html += '\n  <div class="feature-grid">';
      s.features.forEach(f => { html += '\n    ' + featureCard(f); });
      html += '\n  </div>';
    }

    html += '\n</section>';
    return html;
  }

  function buildBlock(b){
    switch(b.type){
      case 'image':
        return gameFrame(b.img, b);

      case 'dual':
      case 'dual-reverse':
        const rev = b.type === 'dual-reverse' ? ' reverse' : '';
        const textHtml = buildTextBlock(b.text);
        const frameHtml = gameFrame(b.img, b);
        return `<div class="dual${rev}" style="margin-top:${b.mt || '2'}rem">
    ${b.type === 'dual-reverse' ? frameHtml + '\n    ' + textHtml : textHtml + '\n    ' + frameHtml}
  </div>`;

      case 'gallery':
        let g = '<div class="gallery-grid">';
        b.items.forEach(item => {
          g += '\n    ' + gameFrame(item.img, item);
        });
        g += '\n  </div>';
        return g;

      case 'text':
        return buildTextBlock(b);

      default:
        return '';
    }
  }

  function buildTextBlock(t){
    let html = '<div class="dual-text">';
    if (t.heading) html += `\n      <h3${t.headingI18n ? ' data-i18n="'+esc(t.headingI18n)+'"' : ''}>${esc(t.heading)}</h3>`;
    if (t.paragraphs) {
      t.paragraphs.forEach(p => {
        if (typeof p === 'string') {
          html += `\n      <p>${raw(p)}</p>`;
        } else {
          const cls = p.class ? ` class="${esc(p.class)}"` : '';
          const i18n = p.i18n ? ` data-i18n="${esc(p.i18n)}"` : '';
          html += `\n      <p${cls}${i18n}>${raw(p.text)}</p>`;
        }
      });
    }
    html += '\n    </div>';
    return html;
  }

  function buildDlcBanner(s){
    let html = `<section class="dlc-banner" id="${esc(s.id)}">
  <div class="dlc-label"${s.labelI18n ? ' data-i18n="'+esc(s.labelI18n)+'"' : ''}>${esc(s.label)}</div>
  <h2${s.titleI18n ? ' data-i18n="'+esc(s.titleI18n)+'"' : ''}>${esc(s.title)}</h2>
  <p${s.subI18n ? ' data-i18n="'+esc(s.subI18n)+'"' : ''}>${esc(s.sub)}</p>`;

    if (s.stats) {
      html += '\n  <div class="dlc-stats">';
      s.stats.forEach(st => {
        html += `\n    <div class="dlc-stat"><div class="dlc-stat-val">${esc(st.val)}</div><div class="dlc-stat-label">${esc(st.label)}</div></div>`;
      });
      html += '\n  </div>';
    }
    html += '\n</section>';
    return html;
  }

  function buildBossPhase(s){
    let html = `<div class="boss-phase">
  <h4><span class="phase-tag">${esc(s.phase)}</span> ${esc(s.title)}</h4>
  <p>${raw(s.desc)}</p>
</div>`;
    return html;
  }

  // ── Public API ─────────────────────────────────────────
  const NW_PAGE = {
    /** Add a section to the build queue */
    section(config){
      _sections.push(config);
      return this;
    },

    /** Add multiple sections at once */
    sections(arr){
      arr.forEach(s => _sections.push(s));
      return this;
    },

    /** Render all queued sections into a DOM target */
    render(selector){
      const target = document.querySelector(selector);
      if (!target) { console.warn('[NW_PAGE] Target not found:', selector); return; }
      _imgIndex = 0;
      const html = _sections.map(s => {
        switch(s.type){
          case 'showcase': return buildShowcase(s);
          case 'dlc-banner': return buildDlcBanner(s);
          case 'boss-phase': return buildBossPhase(s);
          default: return buildShowcase(s);
        }
      }).join('\n\n');
      target.innerHTML = html;
      return html;
    },

    /** Generate HTML string without rendering */
    toHTML(){
      _imgIndex = 0;
      return _sections.map(s => {
        switch(s.type){
          case 'showcase': return buildShowcase(s);
          case 'dlc-banner': return buildDlcBanner(s);
          case 'boss-phase': return buildBossPhase(s);
          default: return buildShowcase(s);
        }
      }).join('\n\n');
    },

    /** Reset the section queue */
    reset(){ _sections.length = 0; _imgIndex = 0; return this; },

    /** Get section count */
    get count(){ return _sections.length; },

    version: '1.0'
  };

  window.NW_PAGE = NW_PAGE;
  if (typeof module !== 'undefined') module.exports = NW_PAGE;
  console.log('[NW_PAGE] Page Builder v' + NW_PAGE.version + ' loaded');
})();
