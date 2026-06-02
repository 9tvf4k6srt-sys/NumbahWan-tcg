// Visual AI-tell detection — the rare half of the suite.
//
// Text linters for AI copy exist. A linter for the VISUAL signature of
// machine-assembled UI does not, in any form we could find. These six
// detectors name the layout tells that betray "an AI assembled this page"
// even when every word reads human:
//
//   L1 EMOJI-AS-ICON      emoji standing in for real UI icons in chrome
//   L2 GENERIC-GRADIENT   the default indigo→purple "AI startup" gradient
//   L3 DEFAULT-SHADOW     framework-default drop shadows pasted verbatim
//   L4 OPACITY-ONLY-MOTION animation whose only animated property is opacity
//   L5 COOKIE-CUTTER      many structurally identical sibling blocks
//   L6 DEAD-CENTER        a page that centers almost everything
//
// Each detector is a pure function of HTML (and/or its extracted CSS). They
// take strings, never files, so they run anywhere and are trivially testable.

const { colourEmojiRegex } = require('./text-detect');

const EMOJI_RE = colourEmojiRegex(false);
const EMOJI_RE_G = colourEmojiRegex(true);

// ── shared extraction ─────────────────────────────────────────────────────────
function bodyMarkup(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

function allCss(html) {
  const h = String(html || '');
  const styleBlocks = (h.match(/<style[\s\S]*?<\/style>/gi) || []).join('\n');
  const inline = (h.match(/style\s*=\s*"[^"]*"/gi) || []).join('\n');
  return styleBlocks + '\n' + inline;
}

// ── L1 · emoji-as-icon ────────────────────────────────────────────────────────
function checkEmojiIcon(body) {
  const findings = [];
  const chromeTag = /<(button|a)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m, count = 0;
  const samples = [];
  while ((m = chromeTag.exec(body)) && count < 2000) {
    count++;
    const inner = m[2].replace(/<[^>]+>/g, '');
    if (EMOJI_RE.test(inner)) {
      if (samples.length < 5) samples.push(`<${m[1]}> "${inner.trim().slice(0, 40)}"`);
    }
  }
  let headEmoji = 0;
  const headRe = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let hm;
  while ((hm = headRe.exec(body))) {
    const head = hm[1].replace(/<[^>]+>/g, '').trim();
    if (EMOJI_RE.test(head.slice(0, 6))) headEmoji++;
  }
  const chromeEmoji = samples.length;
  if (chromeEmoji > 0 || headEmoji > 0) {
    findings.push({
      id: 'L1 EMOJI-AS-ICON',
      blocking: true,
      detail: `Emoji used as UI icons in ${chromeEmoji} button/link${chromeEmoji === 1 ? '' : 's'}` +
              (headEmoji ? ` and ${headEmoji} heading${headEmoji === 1 ? '' : 's'}` : '') + '.',
      fix: 'Swap emoji icons for an inline SVG set or an icon font. Emoji-as-icon is the loudest "AI assembled this UI" tell.',
      samples,
    });
  }
  return findings;
}

// ── L2 · generic indigo→purple gradient ────────────────────────────────────────
function checkGenericGradient(css) {
  const lower = String(css || '').toLowerCase();
  const tellHexes = ['#6366f1', '#8b5cf6', '#a855f7', '#7c3aed', '#818cf8', '#c084fc'];
  const gradients = lower.match(/(linear|radial|conic)-gradient\([^)]*\)/g) || [];
  let hits = 0;
  const samples = [];
  for (const g of gradients) {
    const matched = tellHexes.filter(h => g.includes(h));
    if (matched.length >= 2) {
      hits++;
      if (samples.length < 4) samples.push(g.slice(0, 70));
    }
  }
  if (hits === 0) return [];
  return [{
    id: 'L2 GENERIC-GRADIENT',
    blocking: true,
    detail: `${hits} default indigo→purple "AI startup" gradient${hits === 1 ? '' : 's'}.`,
    fix: 'Replace the stock indigo/purple gradient with palette-grounded color. This exact gradient is every model\'s default "make it pop".',
    samples,
  }];
}

// ── L3 · framework-default shadows ──────────────────────────────────────────────
function checkDefaultShadow(css) {
  const lower = String(css || '').toLowerCase().replace(/\s+/g, ' ');
  const tells = [
    '0 1px 3px 0 rgba(0,0,0,0.1)',
    '0 1px 2px 0 rgba(0,0,0,0.05)',
    '0 4px 6px -1px rgba(0,0,0,0.1)',
    '0 10px 15px -3px rgba(0,0,0,0.1)',
    '0 20px 25px -5px rgba(0,0,0,0.1)',
    '0 1px 3px rgba(0,0,0,0.1)',
    '0 2px 4px rgba(0,0,0,0.1)',
  ];
  let hits = 0;
  const samples = [];
  for (const t of tells) {
    const n = lower.split(t).length - 1;
    if (n > 0) { hits += n; if (samples.length < 4) samples.push(t); }
  }
  if (hits < 3) return [];
  return [{
    id: 'L3 DEFAULT-SHADOW',
    blocking: true,
    detail: `Framework-default drop shadow pasted ${hits} times verbatim.`,
    fix: 'Tune shadow to the surface and light direction (color-tinted, layered). The stock rgba(0,0,0,.1) ladder reads as untouched boilerplate.',
    samples,
  }];
}

// ── L4 · opacity-only motion ────────────────────────────────────────────────────
function checkOpacityOnlyMotion(css) {
  const lower = String(css || '').toLowerCase();
  const transitions = lower.match(/transition\s*:\s*[^;{}]+/g) || [];
  let opacityOnly = 0;
  for (const t of transitions) {
    const props = t.replace(/transition\s*:/, '')
      .split(',')
      .map(s => s.trim().split(/\s+/)[0])
      .filter(Boolean)
      .filter(p => p !== 'ease' && p !== 'linear' && p !== 'ease-in-out' && !/^\d/.test(p));
    if (props.length && props.every(p => p === 'opacity')) opacityOnly++;
  }
  const keyframes = lower.match(/@keyframes[^{]+\{[\s\S]*?\}\s*\}/g) || [];
  let opacityKf = 0;
  for (const kf of keyframes) {
    const declared = (kf.match(/[a-z-]+\s*:/g) || []).map(s => s.replace(':', '').trim());
    const meaningful = declared.filter(p => p !== 'opacity');
    if (declared.includes('opacity') && meaningful.length === 0) opacityKf++;
  }
  const total = opacityOnly + opacityKf;
  if (total < 2) return [];
  return [{
    id: 'L4 OPACITY-ONLY-MOTION',
    blocking: false,
    detail: `${total} transition/keyframe animates opacity and nothing else.`,
    fix: 'Decide how the element should move (rise, scale, slide), not just appear. Opacity-only is the motion you reach for when you have not chosen one.',
    samples: [],
  }];
}

// ── L5 · cookie-cutter repeated blocks ──────────────────────────────────────────
function checkCookieCutter(body) {
  const classSigs = {};
  const re = /<(div|article|section|li)\b[^>]*class\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = re.exec(body))) {
    const sig = m[1] + '|' + m[2].trim().split(/\s+/).sort().join(' ');
    classSigs[sig] = (classSigs[sig] || 0) + 1;
  }
  const heavy = Object.entries(classSigs).filter(([, c]) => c >= 8).sort((a, b) => b[1] - a[1]);
  if (heavy.length === 0) return [];
  const [sig, count] = heavy[0];
  return [{
    id: 'L5 COOKIE-CUTTER',
    blocking: false,
    detail: `${count} structurally identical "${sig.split('|')[0]}" blocks share one class signature.`,
    fix: 'If these are hand-authored clones, drive them from data/a template and let real content vary the shape. Identical cards are the AI "features section" tell.',
    samples: [sig.slice(0, 70)],
  }];
}

// ── L6 · dead-center everything ─────────────────────────────────────────────────
function checkDeadCenter(body, css) {
  const b = String(body || '');
  const c = String(css || '');
  const centerText = (c.match(/text-align\s*:\s*center/gi) || []).length
    + (b.match(/\bclass="[^"]*\btext-center\b/gi) || []).length;
  const autoMargin = (c.match(/margin\s*:\s*0\s+auto|margin-(left|right)\s*:\s*auto/gi) || []).length
    + (b.match(/\bclass="[^"]*\bmx-auto\b/gi) || []).length;
  const sections = (b.match(/<section\b/gi) || []).length || 1;
  if (centerText >= 12 && autoMargin >= 8 && centerText / sections > 3) {
    return [{
      id: 'L6 DEAD-CENTER',
      blocking: false,
      detail: `Almost everything is centered (${centerText} center-text, ${autoMargin} auto-margin over ~${sections} sections).`,
      fix: 'Break the symmetry: anchor some blocks left, vary rhythm. Perfect center-stacking reads as a template, not a composition.',
      samples: [],
    }];
  }
  return [];
}

/**
 * lintLayout — run all six visual detectors over one HTML document.
 *
 * @param {string} html
 * @param {object} [opts]
 * @param {boolean} [opts.emoji=true]  include the L1 emoji-as-icon detector
 * @returns {{findings: Array, blocking: number, advisory: number}}
 */
function lintLayout(html, opts = {}) {
  const body = bodyMarkup(html);
  const css = allCss(html);

  let findings = [];
  if (opts.emoji !== false) findings = findings.concat(checkEmojiIcon(body));
  findings = findings
    .concat(checkGenericGradient(css))
    .concat(checkDefaultShadow(css))
    .concat(checkOpacityOnlyMotion(css))
    .concat(checkCookieCutter(body))
    .concat(checkDeadCenter(body, css));

  return {
    findings,
    blocking: findings.filter(f => f.blocking).length,
    advisory: findings.filter(f => !f.blocking).length,
  };
}

module.exports = {
  bodyMarkup,
  allCss,
  checkEmojiIcon,
  checkGenericGradient,
  checkDefaultShadow,
  checkOpacityOnlyMotion,
  checkCookieCutter,
  checkDeadCenter,
  lintLayout,
};
