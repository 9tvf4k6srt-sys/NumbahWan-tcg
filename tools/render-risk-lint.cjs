#!/usr/bin/env node
/**
 * tools/render-risk-lint.cjs — catch the visual bugs that cause re-see loops
 * ==========================================================================
 * WHY THIS EXISTS (the token math):
 *   Screenshots are impossible in this sandbox (chromium can't launch — missing
 *   system libs, no apt). So every visual bug used to cost a full round-trip:
 *     ship → user notices on their phone → screenshot → I re-fix → ship again.
 *   The guild page took 11 of its last 12 commits this way. The headline alone
 *   came back 3 times (#84→#85→#86); the emblem 5 times (#79→#83).
 *
 *   We can't render, but every one of those bugs has a STATIC fingerprint in the
 *   markup + CSS. This lint reads those fingerprints and fails before shipping,
 *   converting a multi-PR re-see loop into one local catch. Model-agnostic,
 *   deterministic, ~0 tokens to run.
 *
 * WHAT IT CATCHES (each rule = a bug that actually shipped):
 *   RR1  letter-split + collapsible spacing   "ontheroster" (#84, #86)
 *        A headline split into inline-block letter/word spans whose ONLY
 *        word separator is literal whitespace — inline-block drops it, words
 *        fuse. Fix: flex gap, or a fixed-width spacer span.
 *   RR2  nowrap line with no size guard        "ROS / TER" mid-word break (#85)
 *        Actually the inverse: a wrappable headline of letter-spans with no
 *        white-space:nowrap on the phrase → the browser breaks mid-word.
 *        We require letter/word-split phrases to declare nowrap.
 *   RR3  fixed px width that can exceed 375     mobile overflow
 *        An element with width/min-width in px > 360 and no max-width guard.
 *   RR4  huge clamp floor for a long headline   text overflow at 375px
 *        font-size: clamp(>=40px, ...) on an uppercase headline — too big to
 *        fit a multi-word line at the iOS primary viewport.
 *
 * Advisory by default (exit 0, prints risks). Pass --strict to make findings
 * fail (exit 1) — that's what `preship` uses for guild pages.
 *
 * Usage:
 *   node tools/render-risk-lint.cjs <file.html>...    # advisory
 *   node tools/render-risk-lint.cjs --strict <file>   # fail on findings
 *   node tools/render-risk-lint.cjs --all             # all public/**.html
 *   node tools/render-risk-lint.cjs --json <file>
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { colors, readUtf8 } = require('./lib/aitell-common.cjs');

const ROOT = path.resolve(__dirname, '..');
const C = colors(process.stdout);
const MOBILE_W = 375;            // iOS primary viewport (PROJECT rule)
const SAFE_W = 360;              // px widths above this risk overflow on mobile

const argv = process.argv.slice(2);
const STRICT = argv.includes('--strict');
const JSON_OUT = argv.includes('--json');
const ALL = argv.includes('--all');
let files = argv.filter(a => !a.startsWith('--'));

if (ALL) {
  const pub = path.join(ROOT, 'public');
  files = walk(pub).filter(f => f.endsWith('.html'));
}
if (!files.length) {
  process.stdout.write('render-risk: no files given. Use <file.html>, --all, or pipe staged.\n');
  process.exit(0);
}

function walk(dir, out = []) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

/* ── tiny helpers (no jsdom needed; layout-free static checks) ────────── */

// Pull every inline <style> block's text, concatenated.
function inlineCss(html) {
  const out = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out.join('\n');
}

// Does a class (or any of a list) get `display:flex` + a `gap` in the CSS?
function ruleHas(css, selector, propRe) {
  // crude but effective: find the selector's block, test the prop inside it.
  const re = new RegExp(escapeRe(selector) + '\\s*\\{([^}]*)\\}', 'g');
  let m;
  while ((m = re.exec(css))) { if (propRe.test(m[1])) return true; }
  return false;
}
function ruleBlock(css, selector) {
  const re = new RegExp(escapeRe(selector) + '\\s*\\{([^}]*)\\}', 'g');
  const blocks = [];
  let m;
  while ((m = re.exec(css))) blocks.push(m[1]);
  return blocks.join('\n');
}
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Does an element carrying `cls` hold a line of MORE THAN ONE word?
// We capture the opening tag with that class and a slice of its inner HTML, then
// decide if the visible content is multi-word.
function elementHasMultiWordLine(html, cls) {
  const re = new RegExp('<([a-z0-9]+)[^>]*class="[^"]*\\b' + escapeRe(cls) + '\\b[^"]*"[^>]*>([\\s\\S]{0,400}?)</\\1>', 'gi');
  let m;
  while ((m = re.exec(html))) {
    const inner = m[2];
    // 2+ explicit word spans (.jw) inside => multi-word line.
    const wordSpans = (inner.match(/class="jw"/g) || []).length;
    if (wordSpans >= 2) return true;
    // A child phrase-line span whose own text contains a space.
    if (/class="[^"]*titleline[^"]*"[^>]*>[^<]*\s[^<]*</.test(inner)) return true;
    // Direct visible text (strip tags) with a space => multi-word.
    const text = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    // data-words on a SINGLE token (no inner space) is one logical word — skip.
    const isSingleSplitToken = /data-words/.test(m[0]) && !/\s/.test(
      (inner.match(/data-words[^>]*>([^<]*)</) || [, ''])[1].trim());
    if (!isSingleSplitToken && /\s/.test(text)) return true;
  }
  return false;
}

/* ── the rules ────────────────────────────────────────────────────────── */

function analyze(file) {
  const html = readUtf8(file);
  const css = inlineCss(html);
  const findings = [];
  const add = (rule, msg, fix) => findings.push({ rule, msg, fix });

  /* RR1 / RR2 — letter/word-split headlines.
     Heuristic: an element that splits its text into many inline-block child
     spans (class "w"/"jw" or a JS splitter via [data-words]) is a "split
     headline". For those we need EITHER (a) a real flex gap between words,
     OR (b) an explicit fixed-width spacer rule, OR (c) it's a single word. */
  const splitClasses = ['.w', '.jw'];
  const usesDataWords = /data-words/.test(html);

  // Find phrase-line containers that hold split spans.
  // We look at any element whose CSS uses display:inline-block on .w/.jw AND
  // the markup has multiple such spans inside one line container.
  const splitSpanCount = (html.match(/class="(?:w|jw)(?:\s|")/g) || []).length;
  const hasSplit = usesDataWords || splitSpanCount > 0;

  if (hasSplit) {
    // Is there a flex gap on the HEADLINE LINE container specifically? (scoped —
    // other flex+gap rules elsewhere on the page must not satisfy this).
    const lineBlock = ruleBlock(css, '.join__titleline');
    const hasFlexGap =
      (/display:\s*flex/.test(lineBlock) && /gap:/.test(lineBlock)) ||
      /gap:/.test(lineBlock);
    // Is there an explicit spacer-width rule for collapsed spaces?
    const hasSpacerWidth = /\.w--space\s*\{[^}]*width:/.test(css) ||
      /--space[^}]*width:/.test(css);
    // Does ANY multi-word phrase get fed to the splitter? Detect a data-words
    // / split span whose text contains a space (multi-word in one element).
    const multiWordSplit =
      /<span[^>]*data-words[^>]*>[^<]*\s[^<]*<\/span>/.test(html);

    if (multiWordSplit && !hasFlexGap && !hasSpacerWidth) {
      add('RR1',
        'A multi-word phrase is fed to the letter-splitter but nothing preserves the space between words (inline-block drops whitespace). Words will fuse, e.g. "on the roster" -> "ontheroster".',
        'Use a flex row with gap on the line container, OR split into per-word spans, OR emit a fixed-width .w--space spacer for each space.');
    }

    // RR2: split spans that CAN wrap (no nowrap on the line) risk mid-word break.
    const lineHasNowrap =
      /white-space:\s*nowrap/.test(ruleBlock(css, '.join__titleline')) ||
      /flex-wrap:\s*nowrap/.test(ruleBlock(css, '.join__titleline'));
    const lineUsesSplit = /class="join__titleline[^"]*"[\s\S]*?class="(?:w|jw)/.test(html);
    if (lineUsesSplit && !lineHasNowrap) {
      add('RR2',
        'A split-span headline line has no white-space/flex-wrap: nowrap. The browser can break BETWEEN letter spans, splitting a word mid-way (e.g. "ROS / TER") at narrow viewports.',
        'Add white-space: nowrap (inline) or flex-wrap: nowrap (flex) to the phrase-line container.');
    }
  }

  /* RR3 — fixed px widths that can overflow the 375px mobile viewport.
     Flag width/min-width >= SAFE_W in px when no max-width:100%/Nvw guard is
     present in the same rule. Skip media-query blocks gated at >= 720px. */
  // Strip min-width:720px+ media blocks so desktop-only rules don't false-flag.
  const mobileCss = css.replace(/@media[^{]*min-width:\s*(\d+)px[^{]*\{[\s\S]*?\n\s*\}/g,
    (block, w) => (Number(w) >= 600 ? '' : block));
  // Iterate CSS rule-by-rule so we judge each declaration in its own block.
  const ruleRe = /([^{}]+)\{([^}]*)\}/g;
  let rm;
  const seenWidths = new Set();
  while ((rm = ruleRe.exec(mobileCss))) {
    const block = rm[2];
    // A fixed `width:`/`min-width:` (NOT max-width, NOT width:100%/auto/min()/vw/%).
    const wDecl = /(?:^|;)\s*(?:min-)?width:\s*(\d{3,})px/i.exec(block);
    if (!wDecl) continue;
    const px = Number(wDecl[1]);
    if (px < SAFE_W) continue;
    // Decorative / off-flow elements can intentionally exceed the viewport
    // (absolute-positioned glows, transforms, fixed overlays). They don't push
    // the layout, so they're not an overflow risk for content.
    const offFlow = /position:\s*(?:absolute|fixed)/.test(block) ||
                    /transform:\s*translate/.test(block) ||
                    /pointer-events:\s*none/.test(block);
    if (offFlow) continue;
    const guarded = /max-width:\s*(?:100%|100vw|\d+vw)/.test(block) ||
                    /width:\s*min\(/.test(block);
    if (guarded) continue;
    const key = px + '|' + rm[1].trim().slice(0, 40);
    if (seenWidths.has(key)) continue;
    seenWidths.add(key);
    add('RR3',
      `Fixed width ${px}px (selector "${rm[1].trim().slice(0, 40)}") exceeds the ${MOBILE_W}px mobile viewport with no max-width:100% guard. Risks horizontal overflow on iOS.`,
      'Add max-width: 100% (or use min(100%, Npx) / a vw unit) so it shrinks on mobile.');
  }

  /* RR4 — oversized headline clamp floor.
     An uppercase display headline with a clamp() whose FLOOR is large enough
     that a multi-word line won't fit at 375px. Floor >= 40px is the risk band
     for a 3-4 word condensed headline within the ~339px content box. */
  // Scoped per rule: flag a big clamp floor ONLY when the selector that owns it
  // is applied to an element that carries a multi-word line. A single-word logo
  // (PARADOX split into PARA/D/OX) can never overflow-wrap, so it is skipped.
  let rr4;
  const clampRuleRe = /([^{}]+)\{([^}]*font-size:\s*clamp\(\s*(\d+(?:\.\d+)?)px[^}]*)\}/g;
  while ((rr4 = clampRuleRe.exec(css))) {
    const selector = rr4[1].trim();
    const block = rr4[2];
    const floor = Number(rr4[3]);
    if (floor < 40) continue;
    if (!/text-transform:\s*uppercase/.test(block)) continue;
    // class names in the selector (e.g. ".hero__title.reveal-words" -> hero__title, reveal-words)
    const classes = (selector.match(/\.([A-Za-z0-9_-]+)/g) || []).map(s => s.slice(1));
    const ownsMultiWord = classes.some(cls => elementHasMultiWordLine(html, cls));
    if (ownsMultiWord) {
      add('RR4',
        `Uppercase headline "${selector}" has clamp floor ${floor}px — likely too large for its multi-word line to fit the ~339px content box at ${MOBILE_W}px (mobile-first). Risks wrap/overflow.`,
        'Lower the clamp floor (a 3-4 word condensed headline fits ~26-32px on 375px), or guarantee one word per line.');
    }
  }

  /* RR5 — iOS background / viewport-unit traps.
     The visual bug class that slips past RR1-RR4 and bounces back as a phone
     screenshot (empirically: the #93 "zoom out the forest backgrounds on iOS"
     lap). iOS Safari does NOT honor `background-attachment: fixed`, and `100vh`
     includes the dynamic toolbar so it overshoots — both make a hero/background
     render wrong ONLY on the device we cannot see. Catch them statically. */
  // RR5a: background-attachment: fixed — broken on iOS Safari (renders zoomed /
  // jumps). Only flag when paired with a background image (the case that breaks
  // visibly); a fixed color attachment is harmless.
  const bgFixedRe = /([^{}]+)\{([^}]*background-attachment:\s*fixed[^}]*)\}/g;
  let rr5;
  while ((rr5 = bgFixedRe.exec(css))) {
    const block = rr5[2];
    if (!/background(?:-image)?:\s*[^;]*url\(/.test(block) && !/background:\s*[^;]*(?:gradient|url)/.test(block)) continue;
    add('RR5',
      `"${rr5[1].trim().slice(0, 40)}" uses background-attachment: fixed with an image — iOS Safari ignores this and renders the background zoomed/misaligned. This is invisible on desktop and only shows on the phone.`,
      'Drop background-attachment: fixed for image backgrounds; use background-size: cover on a normally-scrolling element, or a fixed-position layer behind the content.');
  }
  // RR5b: full-viewport height via 100vh on a hero/background container — iOS
  // counts the address bar in vh, so it overshoots and pushes/zooms content.
  const vhRe = /([^{}]+)\{([^}]*height:\s*100vh[^}]*)\}/g;
  while ((rr5 = vhRe.exec(css))) {
    const sel = rr5[1].trim();
    const block = rr5[2];
    // Only flag containers that carry a background or are heroes (the visible
    // case). A guarded dvh/min-height fallback or max-height is fine.
    const isVisual = /background/.test(block) || /\b(hero|cover|backdrop|forest|banner|splash)\b/i.test(sel);
    const guarded = /100dvh|min-height|max-height|svh/.test(block);
    if (!isVisual || guarded) continue;
    add('RR5',
      `"${sel.slice(0, 40)}" sets height: 100vh on a visual/hero container — on iOS, 100vh includes the toolbar, so it overshoots the screen and shifts/zooms the background. Desktop looks fine; the phone does not.`,
      'Use 100dvh (dynamic viewport) with a 100vh fallback, or min-height instead of a hard 100vh.');
  }

  return findings;
}

/* ── run ──────────────────────────────────────────────────────────────── */

const report = [];
let total = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const findings = analyze(f);
  total += findings.length;
  report.push({ file: path.relative(ROOT, f), findings });
}

if (JSON_OUT) {
  process.stdout.write(JSON.stringify({ strict: STRICT, total, files: report }, null, 2) + '\n');
  process.exit(STRICT && total ? 1 : 0);
}

process.stdout.write(`\n  ${C.b}RENDER RISK${C.r}  — static catch for the bugs that cause re-see loops\n`);
process.stdout.write(`  ${'='.repeat(60)}\n`);
for (const { file, findings } of report) {
  if (!findings.length) {
    process.stdout.write(`  ${C.green}✓${C.r} ${file}\n`);
    continue;
  }
  process.stdout.write(`  ${STRICT ? C.red + '✗' : C.yellow + '!'}${C.r} ${file}\n`);
  for (const { rule, msg, fix } of findings) {
    process.stdout.write(`      ${C.yellow}${rule}${C.r}  ${msg}\n`);
    process.stdout.write(`           ${C.dim}fix: ${fix}${C.r}\n`);
  }
}
process.stdout.write(`\n  ${report.length} scanned · ${total} risk${total === 1 ? '' : 's'}\n`);
if (!STRICT) {
  process.stdout.write(`  ${C.dim}Advisory. These never block unless run with --strict (preship does for guild pages).${C.r}\n`);
}
process.exit(STRICT && total ? 1 : 0);
