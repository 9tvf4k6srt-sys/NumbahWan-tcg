#!/usr/bin/env node
/**
 * NW Landing Lint v1.1 — the cinematic gate
 *
 * Enforces the measurable half of references/LANDING-CINEMATIC.md and the
 * 3D lifecycle contract from references/LANDING-3D.md on any landing/
 * marketing HTML page. The judgment half (does the arc land?) stays
 * human; this tool blocks the failures that make a page read as amateur:
 *
 *   BLOCKING
 *     V1  hero <video> without poster
 *     V2  hero video file over the 4MB budget (when file is local)
 *     V3  <video autoplay> without muted+playsinline (iOS silently breaks)
 *     V4  autoplaying video but no prefers-reduced-motion handling anywhere
 *     M1  <img>/<video> without width/height or aspect-ratio (CLS)
 *     A1  <canvas> without aria-label/role (3D stage invisible to AT)
 *     A2  audio/sound toggle missing when page autoplays sound
 *     D1  Three.js imported eagerly (blocking <script>, competes with LCP)
 *     D2  hand-rolled WebGL page with no reduced-motion/capability guard
 *     D3  hand-rolled Three.js page with no dispose path (memory leak)
 *
 *   WARN
 *     W1  video with a single source (no webm+mp4 pair)
 *     W2  below-the-fold video without preload="none"/lazy pattern
 *     W3  canvas without a visible interaction cue element
 *     W4  no CTA link/button in the first <section>
 *     W5  more than 5 or fewer than 3 top-level story sections
 *     D4  unconditional requestAnimationFrame loop (render-on-demand rule)
 *     D5  GLB/GLTF referenced without a Draco/meshopt marker nearby
 *     D6  Three.js version not pinned (floating latest breaks silently)
 *
 * Pages using /static/nw-3d.js get D2/D3/D4 for free: the runtime owns
 * the capability ladder, dispose sweep, and demand-driven loop.
 *
 * Usage:
 *   node tools/landing-lint.cjs <page.html> [...more]     # lint specific pages
 *   node tools/landing-lint.cjs --all                     # lint known landing pages
 *   node tools/landing-lint.cjs <page.html> --json        # machine-readable
 *
 * Exit: 1 if any BLOCKING finding, else 0.
 */

const fs = require('fs');
const path = require('path');
const { colors, repoRoot } = require('./lib/aitell-common.cjs');

const ROOT = repoRoot();
const PUBLIC = path.join(ROOT, 'public');
const _c = colors(process.stdout);
const B = _c.b, G = _c.green, R = _c.red, Y = _c.yellow, C = _c.cyan, X = _c.r;

const HERO_VIDEO_BUDGET_MB = 4;

// ── helpers ──
function attrs(tag) {
  const out = {};
  const re = /([a-zA-Z-]+)(?:\s*=\s*"([^"]*)")?/g;
  let m;
  while ((m = re.exec(tag))) out[m[1].toLowerCase()] = m[2] !== undefined ? m[2] : true;
  return out;
}

function localAssetSizeMB(src) {
  if (!src || /^(https?:)?\/\//.test(src) || src.startsWith('data:')) return null;
  const p = path.join(PUBLIC, src.replace(/^\//, ''));
  if (!fs.existsSync(p)) return null;
  return fs.statSync(p).size / (1024 * 1024);
}

// ── lint one page ──
function lintPage(pagePath) {
  const content = fs.readFileSync(pagePath, 'utf-8');
  const rel = path.relative(ROOT, pagePath);
  const findings = []; // { rule, level: 'block'|'warn', msg }
  const block = (rule, msg) => findings.push({ rule, level: 'block', msg });
  const warn = (rule, msg) => findings.push({ rule, level: 'warn', msg });

  // Locate hero region: everything before the second <section (or first 40% of file)
  const secIdx = [...content.matchAll(/<section[\s>]/g)].map(m => m.index);
  const heroEnd = secIdx.length > 1 ? secIdx[1] : Math.floor(content.length * 0.4);
  const heroRegion = content.slice(0, heroEnd);

  const hasReducedMotionCSS = /prefers-reduced-motion/.test(content);
  // linked stylesheets may carry the media query — check known local CSS
  let reducedInLinkedCSS = false;
  for (const m of content.matchAll(/<link[^>]+href="(\/static\/[^"]+\.css)"/g)) {
    const p = path.join(PUBLIC, m[1].replace(/^\//, ''));
    if (fs.existsSync(p) && /prefers-reduced-motion/.test(fs.readFileSync(p, 'utf-8'))) {
      reducedInLinkedCSS = true;
      break;
    }
  }
  const hasReducedMotion = hasReducedMotionCSS || reducedInLinkedCSS;

  // ── videos ──
  const videoTags = [...content.matchAll(/<video\b[^>]*>/gi)];
  videoTags.forEach((m, i) => {
    const a = attrs(m[0]);
    const inHero = m.index < heroEnd;
    const label = inHero ? `hero video` : `video #${i + 1}`;

    if (a.autoplay !== undefined && a.autoplay !== false) {
      if (a.muted === undefined) block('V3', `${label}: autoplay without muted — iOS will refuse to play`);
      if (a.playsinline === undefined) block('V3', `${label}: autoplay without playsinline — iOS goes fullscreen`);
      if (!hasReducedMotion) block('V4', `${label}: autoplays but page has no prefers-reduced-motion handling`);
    }

    if (inHero && a.autoplay !== undefined && !a.poster) {
      block('V1', `${label}: no poster — poster is the LCP + reduced-motion + no-JS fallback`);
    }

    // sources within the video block
    const closeIdx = content.indexOf('</video>', m.index);
    const inner = closeIdx > -1 ? content.slice(m.index, closeIdx) : m[0];
    const sources = [...inner.matchAll(/<source[^>]+(?:src|data-src)="([^"]+)"[^>]*>/gi)];
    const types = [...inner.matchAll(/type="video\/(\w+)"/gi)].map(x => x[1]);
    const srcList = [a.src, ...sources.map(s => s[1])].filter(Boolean);

    if (srcList.length === 1 || (types.length && !(types.includes('webm') && types.includes('mp4')))) {
      warn('W1', `${label}: single codec — ship WebM primary + H.264 MP4 fallback`);
    }

    if (inHero) {
      for (const src of srcList) {
        const mb = localAssetSizeMB(src);
        if (mb !== null && mb > HERO_VIDEO_BUDGET_MB) {
          block('V2', `${label}: ${src} is ${mb.toFixed(1)}MB — budget ${HERO_VIDEO_BUDGET_MB}MB`);
        }
      }
    } else if (a.preload === undefined || (a.preload !== 'none' && a.preload !== 'metadata')) {
      warn('W2', `${label}: below the fold without preload="none" — wastes bandwidth`);
    }

    if ((a.width === undefined || a.height === undefined) && !/aspect-ratio/.test(m[0])) {
      block('M1', `${label}: missing width/height — layout shift (CLS)`);
    }
  });

  // ── images: dimensions (CLS) — hero region only blocks, rest warns ──
  const imgTags = [...content.matchAll(/<img\b[^>]*>/gi)];
  let imgsNoDim = 0, heroImgsNoDim = 0;
  imgTags.forEach(m => {
    const a = attrs(m[0]);
    if ((a.width === undefined || a.height === undefined) && !/aspect-ratio/.test(m[0])) {
      imgsNoDim++;
      if (m.index < heroEnd) heroImgsNoDim++;
    }
  });
  if (heroImgsNoDim > 0) block('M1', `${heroImgsNoDim} hero image(s) missing width/height — LCP-region CLS`);
  else if (imgsNoDim > 0) warn('M1', `${imgsNoDim} image(s) missing width/height below the fold`);

  // ── canvas (3D stage) accessibility ──
  const canvasTags = [...content.matchAll(/<canvas\b[^>]*>/gi)];
  canvasTags.forEach((m, i) => {
    const a = attrs(m[0]);
    if (!a['aria-label'] && !a.role) {
      block('A1', `canvas #${i + 1}: no aria-label/role — 3D stage invisible to assistive tech`);
    }
    // visible interaction cue near the canvas (within 600 chars)
    const near = content.slice(m.index, m.index + 600);
    if (!/(cue|drag|scroll|explore|interact)/i.test(near)) {
      warn('W3', `canvas #${i + 1}: no visible interaction cue nearby (e.g. "Drag to explore")`);
    }
  });

  // ── 3D lifecycle (LANDING-3D doctrine) ──
  const usesNw3d = content.includes('nw-3d.js');
  const threeRefs = [...content.matchAll(/['"](https?:\/\/[^'"]*\/three(?:@|\/|\.min\.js|\.module\.js)[^'"]*)['"]/gi)];
  const mentionsThree = threeRefs.length > 0 || /\bTHREE\.\w+|WebGLRenderer/.test(content);

  // D1: Three.js in a blocking <script src> in <head> competes with LCP
  for (const s of content.matchAll(/<script\b[^>]*src="[^"]*three[^"]*"[^>]*>/gi)) {
    const a = attrs(s[0]);
    if (a.defer === undefined && a.async === undefined && a.type !== 'module') {
      block('D1', 'Three.js loaded as a blocking script — import lazily after load (LANDING-3D §4.2)');
    }
  }

  if (mentionsThree && !usesNw3d) {
    // Hand-rolled scene: it must reimplement the lifecycle contract itself.
    if (!/prefers-reduced-motion/.test(content) || !/(getContext\(\s*['"]webgl|NW3D\.capable|capable\s*\()/.test(content)) {
      block('D2', 'hand-rolled 3D without a reduced-motion + WebGL capability guard — the ladder (LANDING-3D §6) is mandatory');
    }
    if (!/dispose\s*\(/.test(content)) {
      block('D3', 'hand-rolled Three.js with no dispose() path — GPU memory leaks (LANDING-3D §4.5)');
    }
    if (/requestAnimationFrame\s*\(/.test(content) && !/(needsRender|invalidate|renderRequested|dirty)/i.test(content)) {
      warn('D4', 'unconditional rAF render loop — render on demand and pause off-screen (LANDING-3D §4.3)');
    }
  }

  // D5: models must ship compressed
  const modelRefs = [...content.matchAll(/['"]([^'"]+\.(?:glb|gltf))['"]/gi)];
  if (modelRefs.length && !/draco|meshopt|ktx2/i.test(content)) {
    warn('D5', `${modelRefs.length} GLB/GLTF reference(s) with no Draco/meshopt marker — compress models (LANDING-3D §3)`);
  }

  // D6: pin the Three.js version
  for (const r of threeRefs) {
    if (!/three@\d+\.\d+\.\d+/.test(r[1])) {
      warn('D6', `Three.js CDN URL not version-pinned: ${r[1]}`);
    }
  }

  // ── audio autoplay needs a visible toggle ──
  const audioAutoplay = /<audio\b[^>]*autoplay/i.test(content) ||
    /<video\b(?![^>]*muted)[^>]*autoplay/i.test(content);
  if (audioAutoplay && !/(sound|mute|volume)/i.test(content.replace(/<video[^>]*>/gi, ''))) {
    block('A2', 'audio autoplays but no visible sound/mute toggle found');
  }

  // ── CTA in the hook ──
  const firstSection = secIdx.length ? content.slice(secIdx[0], secIdx[1] || heroEnd + 2000) : heroRegion;
  if (!/<(a|button)\b[^>]*(cta|btn|button)/i.test(firstSection) && !/class="[^"]*cta/i.test(firstSection)) {
    warn('W4', 'no CTA link/button detected in the hero — the hook must carry the CTA');
  }

  // ── beat count ──
  if (secIdx.length && (secIdx.length < 3 || secIdx.length > 6)) {
    warn('W5', `${secIdx.length} top-level sections — cinematic arc wants 3–5 beats (+resolution)`);
  }

  return { page: rel, findings };
}

// ── main ──
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const allMode = args.includes('--all');
let targets = args.filter(a => !a.startsWith('--'));

if (allMode) {
  // Landing pages = pages using the cinematic layer, plus any page passed explicitly
  const found = [];
  function walk(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) { if (!['static', 'node_modules'].includes(f.name)) walk(full); }
      else if (f.name.endsWith('.html')) {
        const c = fs.readFileSync(full, 'utf-8');
        // Landing pages: cinematic layer markers, or any page carrying a 3D stage
        if (c.includes('nw-landing.css') || c.includes('nwl-hero') || c.includes('landing-hero')
          || c.includes('data-nwl-3d') || c.includes('nw-3d.js')) found.push(full);
      }
    }
  }
  walk(PUBLIC);
  targets = found;
}

if (!targets.length) {
  console.log('Usage: node tools/landing-lint.cjs <page.html> [--all] [--json]');
  process.exit(0);
}

const results = targets.map(t => {
  const p = path.isAbsolute(t) ? t : path.resolve(ROOT, t);
  if (!fs.existsSync(p)) return { page: t, findings: [{ rule: 'IO', level: 'block', msg: 'file not found' }] };
  return lintPage(p);
});

const totalBlocks = results.reduce((n, r) => n + r.findings.filter(f => f.level === 'block').length, 0);
const totalWarns = results.reduce((n, r) => n + r.findings.filter(f => f.level === 'warn').length, 0);

if (jsonMode) {
  console.log(JSON.stringify({ pages: results, blocks: totalBlocks, warns: totalWarns }, null, 2));
} else {
  console.log(`\n${B}🎬 NW Landing Lint v1.1${X} — cinematic gate (${results.length} page${results.length > 1 ? 's' : ''})\n`);
  results.forEach(r => {
    const blocks = r.findings.filter(f => f.level === 'block');
    const warns = r.findings.filter(f => f.level === 'warn');
    const icon = blocks.length ? `${R}✗${X}` : warns.length ? `${Y}⚠${X}` : `${G}✓${X}`;
    console.log(`  ${icon} ${B}${r.page}${X}  (${blocks.length} blocking, ${warns.length} warnings)`);
    blocks.forEach(f => console.log(`      ${R}✗ ${f.rule}${X} ${f.msg}`));
    warns.forEach(f => console.log(`      ${Y}⚠ ${f.rule}${X} ${f.msg}`));
  });
  console.log(`\n  ${B}Result${X}: ${totalBlocks ? `${R}${totalBlocks} blocking finding(s)${X}` : `${G}clean${X}`}, ${totalWarns} warning(s)`);
  console.log(`  Doctrine: references/LANDING-CINEMATIC.md + references/LANDING-3D.md\n`);
}

process.exit(totalBlocks ? 1 : 0);
