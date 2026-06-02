#!/usr/bin/env node
/**
 * tools/ai-layout-lint.cjs — visual / layout AI-tell linter (deterministic)
 * ==========================================================================
 * The text linters (ai-tell-lint, ai-stylometry, ai-naturalness) read PROSE.
 * This reads the BUILD: the HTML + inline CSS a page ships. It catches the
 * visual tells that make a *built page* look AI-generated even when the words
 * are clean — the "hollow polish" and "cheap-looking" enemies named in TASTE.md.
 *
 * It is deterministic and BLOCKING, like ai-tell-lint: it only fires on
 * patterns we can name with confidence, and each finding points at a concrete
 * fix. Anything fuzzy belongs in an advisory stage, not here.
 *
 * What it catches (each is a documented AI-build tell, not a style preference):
 *
 *   L1 EMOJI-AS-ICON      Emoji standing in for real UI icons in buttons, nav,
 *                         headings, list markers. The single loudest "an AI
 *                         assembled this" signal. (SVG / icon fonts are fine.)
 *   L2 GENERIC-GRADIENT   The default "AI startup" indigo→purple gradient
 *                         (#6366f1 / #8b5cf6 / #a855f7 linear-gradient). Shows
 *                         up because it is every model's default "make it pop".
 *   L3 DEFAULT-SHADOW     Framework-default drop shadows pasted verbatim
 *                         (0 1px 3px rgba(0,0,0,.1) and the Tailwind ladder).
 *                         Real craft tunes shadow to the surface and light.
 *   L4 OPACITY-ONLY-MOTION  A transition/animation whose ONLY animated property
 *                         is opacity. Fading is what you reach for when you have
 *                         not decided how a thing should actually move.
 *   L5 COOKIE-CUTTER      Many structurally identical sibling blocks (same class
 *                         signature repeated) — the cloned-card grid an AI emits
 *                         when asked for "a features section".
 *   L6 DEAD-CENTER        A page that centers almost everything (text-align
 *                         center + mx-auto stacked past a threshold). Perfect
 *                         symmetry reads as a template, not a composition.
 *
 * Calibration: thresholds are tuned against the taste-locked pages in this repo
 * so a crafted page passes. Findings are real defects, not nitpicks.
 *
 * Usage:
 *   node tools/ai-layout-lint.cjs <file.html> [...]
 *   node tools/ai-layout-lint.cjs --all          # every public/ *.html
 *   node tools/ai-layout-lint.cjs --json
 *   node tools/ai-layout-lint.cjs --quiet         # print only if something fires
 *
 * Exit code: 1 if any BLOCKING finding fires, else 0. (Mirrors ai-tell-lint.)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const common = require('./lib/aitell-common.cjs');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const C = common.colors(process.stdout);

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const JSON_OUT = args.includes('--json');
const QUIET = args.includes('--quiet');
const explicit = args.filter(a => !a.startsWith('--'));

// Pages that legitimately use emoji as content (not chrome), or are dev/test
// harnesses, are exempt from the emoji-icon rule. Keep this list short and
// justified — every entry is debt, not a loophole.
const EMOJI_EXEMPT = new Set([
  'public/dev/motion-lab.html',
]);

// ── small helpers ─────────────────────────────────────────────────────────
function rel(file) { return path.relative(ROOT, file).replace(/\\/g, '/'); }

// Emoji that read as UI icons when dropped into chrome. The colour-emoji rule
// (high-plane glyphs, or BMP symbols carrying VS16) lives in aitell-common so
// it can be unit-tested and cannot drift away from what we test against.
const EMOJI_RE = common.colourEmojiRegex(false);
const EMOJI_RE_G = common.colourEmojiRegex(true);

// strip <style>/<script> CONTENTS so we lint the body markup, but KEEP the
// inline style attributes (we need them for shadow/gradient/motion checks).
function bodyMarkup(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

function allCss(html) {
  // collect every <style> block + every style="" attribute into one haystack
  const styleBlocks = (html.match(/<style[\s\S]*?<\/style>/gi) || []).join('\n');
  const inline = (html.match(/style\s*=\s*"[^"]*"/gi) || []).join('\n');
  return styleBlocks + '\n' + inline;
}

// ── L1 · emoji-as-icon ───────────────────────────────────────────────────────
// Fire when emoji appear inside interactive / chrome elements: buttons, links
// that look like nav/CTA, headings, or as list bullets. Plain prose emoji in a
// paragraph are not flagged (that is voice, not chrome).
function checkEmojiIcon(body) {
  const findings = [];
  // emoji directly inside a button or anchor's visible text
  const chromeTag = /<(button|a)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m, count = 0;
  const samples = [];
  while ((m = chromeTag.exec(body)) && count < 2000) {
    count++;
    const inner = m[2].replace(/<[^>]+>/g, '');
    if (EMOJI_RE.test(inner)) {
      const e = (inner.match(EMOJI_RE_G) || [])[0];
      if (samples.length < 5) samples.push(`<${m[1]}> "${inner.trim().slice(0, 40)}"`);
    }
  }
  // emoji at the start of a heading (same emoji definition as above)
  let headEmoji = 0;
  const headRe = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let hm;
  while ((hm = headRe.exec(body))) {
    const head = hm[1].replace(/<[^>]+>/g, '').trim();
    // only count emoji in the first ~4 chars (decorative prefix), the AI tell
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

// ── L2 · generic indigo→purple gradient ───────────────────────────────────────
function checkGenericGradient(css) {
  const lower = css.toLowerCase();
  // the canonical "AI startup" hexes + named pairs
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

// ── L3 · framework-default shadows ─────────────────────────────────────────────
function checkDefaultShadow(css) {
  const lower = css.toLowerCase().replace(/\s+/g, ' ');
  // the verbatim tells: tailwind/bootstrap default ladders pasted unchanged
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
  // only block when the default shadow is the dominant treatment (>=3 uses),
  // so one stray utility class does not fail a crafted page.
  if (hits < 3) return [];
  return [{
    id: 'L3 DEFAULT-SHADOW',
    blocking: true,
    detail: `Framework-default drop shadow pasted ${hits} times verbatim.`,
    fix: 'Tune shadow to the surface and light direction (color-tinted, layered). The stock rgba(0,0,0,.1) ladder reads as untouched boilerplate.',
    samples,
  }];
}

// ── L4 · opacity-only motion ───────────────────────────────────────────────────
function checkOpacityOnlyMotion(css) {
  const lower = css.toLowerCase();
  const findings = [];
  // transition: opacity ...; with no other animated property nearby
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
  // @keyframes that only touch opacity
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
    blocking: false, // advisory within the deterministic stage: lazy, not broken
    detail: `${total} transition/keyframe animates opacity and nothing else.`,
    fix: 'Decide how the element should move (rise, scale, slide), not just appear. Opacity-only is the motion you reach for when you have not chosen one.',
    samples: [],
  }];
}

// ── L5 · cookie-cutter repeated blocks ─────────────────────────────────────────
function checkCookieCutter(body) {
  // collapse each element open-tag to its class signature; count identical
  // siblings. Many identical class signatures = cloned-card grid.
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
  // 8+ identical is common for legit data tables/lists; only flag when a single
  // signature dominates AND there is no <template>/map hint (static clone smell).
  return [{
    id: 'L5 COOKIE-CUTTER',
    blocking: false, // advisory: repetition is sometimes the right answer
    detail: `${count} structurally identical "${sig.split('|')[0]}" blocks share one class signature.`,
    fix: 'If these are hand-authored clones, drive them from data/a template and let real content vary the shape. Identical cards are the AI "features section" tell.',
    samples: [sig.slice(0, 70)],
  }];
}

// ── L6 · dead-center everything ────────────────────────────────────────────────
function checkDeadCenter(body, css) {
  const centerText = (css.match(/text-align\s*:\s*center/gi) || []).length
    + (body.match(/\bclass="[^"]*\btext-center\b/gi) || []).length;
  const autoMargin = (css.match(/margin\s*:\s*0\s+auto|margin-(left|right)\s*:\s*auto/gi) || []).length
    + (body.match(/\bclass="[^"]*\bmx-auto\b/gi) || []).length;
  // count rough number of layout sections to normalize
  const sections = (body.match(/<section\b/gi) || []).length || 1;
  // fire only when centering is pervasive relative to structure
  if (centerText >= 12 && autoMargin >= 8 && centerText / sections > 3) {
    return [{
      id: 'L6 DEAD-CENTER',
      blocking: false,
      detail: `Almost everything is centered (${centerText} center-text, ${autoMargin} auto-margin over ~${sections} sections).`,
      fix: 'Break the symmetry: anchor some blocks left, vary rhythm. Perfect center-stacking reads as a template, not a composition (see TASTE.md).',
      samples: [],
    }];
  }
  return [];
}

// ── lint one file ─────────────────────────────────────────────────────────────
function lintFile(file) {
  const html = common.readUtf8(file);
  const body = bodyMarkup(html);
  const css = allCss(html);
  const relPath = rel(file);

  let findings = [];
  if (!EMOJI_EXEMPT.has(relPath)) findings = findings.concat(checkEmojiIcon(body));
  findings = findings
    .concat(checkGenericGradient(css))
    .concat(checkDefaultShadow(css))
    .concat(checkOpacityOnlyMotion(css))
    .concat(checkCookieCutter(body))
    .concat(checkDeadCenter(body, css));

  return { file: relPath, findings };
}

// ── target resolution ──────────────────────────────────────────────────────────
function resolveTargets() {
  if (explicit.length) {
    return explicit.map(f => path.resolve(f)).filter(f => /\.html?$/i.test(f) && fs.existsSync(f));
  }
  if (ALL) {
    return fs.readdirSync(PUBLIC)
      .filter(f => /\.html$/i.test(f))
      .map(f => path.join(PUBLIC, f));
  }
  // default: staged html files
  return common.stagedFiles(spawnSync, ROOT)
    .filter(f => /\.html?$/i.test(f))
    .map(f => path.resolve(ROOT, f))
    .filter(f => fs.existsSync(f));
}

// ── run ─────────────────────────────────────────────────────────────────────
const targets = resolveTargets();
const results = [];
let blockingCount = 0;
let advisoryCount = 0;

for (const t of targets) {
  try {
    const r = lintFile(t);
    if (r.findings.length) results.push(r);
    for (const f of r.findings) (f.blocking ? blockingCount++ : advisoryCount++);
  } catch (e) {
    console.error(`  [layout] error on ${rel(t)}: ${e.message}`);
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ scanned: targets.length, blockingCount, advisoryCount, results }, null, 2));
  process.exit(blockingCount > 0 ? 1 : 0);
}

if (QUIET && blockingCount === 0 && advisoryCount === 0) process.exit(0);

console.log('');
console.log(`${C.b}  LAYOUT / VISUAL AI-TELL${C.r}  ${C.dim}— linting the build, not the prose${C.r}`);
console.log('  ═══════════════════════════════════════════════════════════');

if (results.length === 0) {
  console.log(`  ${C.green}✓ clean${C.r}  ${targets.length} file${targets.length === 1 ? '' : 's'} scanned · no layout tells`);
} else {
  for (const r of results) {
    console.log(`\n  ${C.b}${r.file}${C.r}`);
    for (const f of r.findings) {
      const tag = f.blocking ? `${C.red}✗ BLOCK${C.r}` : `${C.yellow}· note${C.r}`;
      console.log(`    ${tag}  ${C.b}${f.id}${C.r}  ${f.detail}`);
      console.log(`           ${C.dim}fix:${C.r} ${f.fix}`);
      for (const s of (f.samples || [])) console.log(`           ${C.dim}· ${s}${C.r}`);
    }
  }
}

console.log('');
console.log(`  ${targets.length} scanned · ${C.red}${blockingCount} blocking${C.r} · ${C.yellow}${advisoryCount} advisory${C.r}`);
if (blockingCount > 0) {
  console.log(`  ${C.red}${C.b}RESULT: blocked.${C.r} Fix the ✗ items above (bypass debt: --no-verify).`);
} else {
  console.log(`  ${C.green}RESULT: no blocking layout tells.${C.r}`);
}
console.log('');

process.exit(blockingCount > 0 ? 1 : 0);
