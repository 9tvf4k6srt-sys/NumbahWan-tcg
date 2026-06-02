#!/usr/bin/env node
/**
 * tools/page-size-lint.cjs — monolith-page guardrail (advisory)
 * ==========================================================================
 * The single most expensive thing to work on in this repo is a giant HTML
 * page with huge inline <script> and <style> blocks. To change three lines on
 * a 4,000-line page, every tool (human or AI) has to read the whole 4,000
 * lines first. That cost is paid on EVERY edit, forever.
 *
 * This linter does not try to fix the monoliths that already exist — that
 * would be a massive, risky diff for little gain. Its job is narrower and
 * cheaper: stop NEW monoliths from being born, and flag when an existing page
 * grows materially worse than it already was.
 *
 * It is ADVISORY. It never blocks a commit. A note is a nudge, not a gate —
 * mirroring the efficiency ledger, which informs rather than polices.
 *
 * What it measures (per HTML file):
 *   total lines            — overall page weight
 *   inline <script> lines  — JS that should live in /static/<page>.js
 *   inline <style> lines   — CSS that should live in a linked stylesheet
 *
 * Thresholds (tuned to this repo: the largest crafted pages sit ~2,000 lines,
 * so these flag the genuinely heavy outliers, not normal pages):
 *   total      > 1800   note
 *   inlineJS   >  400   note  (extract to /static)
 *   inlineCSS  >  500   note  (extract to a stylesheet)
 *
 * Regression mode (--baseline): compares staged files against their committed
 * version and flags a page that GREW by more than GROWTH_LINES lines in one
 * change. This is the part that earns its keep day to day — it catches a page
 * ballooning before it becomes the next 4,000-line monolith.
 *
 * Usage:
 *   node tools/page-size-lint.cjs <file.html> [...]
 *   node tools/page-size-lint.cjs --all          # every public/ *.html
 *   node tools/page-size-lint.cjs --baseline      # staged files vs committed
 *   node tools/page-size-lint.cjs --json
 *   node tools/page-size-lint.cjs --quiet         # print only if something fires
 *
 * Exit code: always 0. Advisory by design.
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
const BASELINE = args.includes('--baseline');

const LIMITS = {
  total: 1800,
  inlineJS: 400,
  inlineCSS: 500,
  growthLines: 600, // a single change that adds more than this gets a note
};

function rel(f) { return path.relative(ROOT, f) || f; }
function lineCount(s) { return s ? s.split('\n').length : 0; }

// Count lines inside inline <style>…</style> and <script> (no src=) blocks.
// Deliberately simple: we want a cheap signal, not a parser. Over-counting by
// a few lines does not change the advice.
function measure(src) {
  let total = lineCount(src);
  let inlineCSS = 0;
  let inlineJS = 0;

  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = styleRe.exec(src))) inlineCSS += lineCount(m[1]);

  // Only inline scripts (those WITHOUT a src= attribute) carry weight in-file.
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  while ((m = scriptRe.exec(src))) {
    const attrs = m[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    inlineJS += lineCount(m[2]);
  }

  return { total, inlineCSS, inlineJS };
}

function findingsFor(file, cur, prev) {
  const out = [];
  if (cur.total > LIMITS.total) {
    out.push({
      id: 'PS1-MONOLITH', detail: `${cur.total} lines (soft cap ${LIMITS.total})`,
      fix: 'Split into sections or extract inline blocks to /static so future edits read less.',
    });
  }
  if (cur.inlineJS > LIMITS.inlineJS) {
    out.push({
      id: 'PS2-INLINE-JS', detail: `${cur.inlineJS} lines of inline <script> (soft cap ${LIMITS.inlineJS})`,
      fix: `Move page JS to public/static/${path.basename(file, '.html')}.js and load it with <script src>.`,
    });
  }
  if (cur.inlineCSS > LIMITS.inlineCSS) {
    out.push({
      id: 'PS3-INLINE-CSS', detail: `${cur.inlineCSS} lines of inline <style> (soft cap ${LIMITS.inlineCSS})`,
      fix: 'Move shared rules to a linked stylesheet; keep only page-unique tweaks inline.',
    });
  }
  if (prev && cur.total - prev.total > LIMITS.growthLines) {
    out.push({
      id: 'PS4-BALLOONING', detail: `grew +${cur.total - prev.total} lines in one change (${prev.total} -> ${cur.total})`,
      fix: 'Large additions to an already-heavy page compound edit cost. Consider a new partial / module.',
    });
  }
  return out;
}

// Read the committed version of a path (HEAD) for --baseline comparison.
function committedSource(relPath) {
  const r = spawnSync('git', ['show', `HEAD:${relPath}`], { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout : null;
}

function resolveTargets() {
  const explicit = args.filter(a => !a.startsWith('--'));
  if (explicit.length) {
    return explicit.map(f => path.resolve(f)).filter(f => /\.html?$/i.test(f) && fs.existsSync(f));
  }
  if (ALL) {
    // every tracked html under public/ (recursive), not just the top level
    const r = spawnSync('git', ['ls-files', 'public/*.html', 'public/**/*.html'], { cwd: ROOT, encoding: 'utf8' });
    return (r.stdout || '').trim().split('\n').filter(Boolean).map(f => path.resolve(ROOT, f));
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
let noteCount = 0;

for (const t of targets) {
  try {
    const src = fs.readFileSync(t, 'utf8');
    const cur = measure(src);
    let prev = null;
    if (BASELINE) {
      const committed = committedSource(rel(t));
      if (committed) prev = measure(committed);
    }
    const findings = findingsFor(t, cur, prev);
    if (findings.length) {
      results.push({ file: rel(t), metrics: cur, findings });
      noteCount += findings.length;
    }
  } catch (e) {
    console.error(`  [page-size] error on ${rel(t)}: ${e.message}`);
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ scanned: targets.length, noteCount, limits: LIMITS, results }, null, 2));
  process.exit(0);
}

if (QUIET && noteCount === 0) process.exit(0);

console.log('');
console.log(`${C.b}  PAGE SIZE${C.r}  ${C.dim}— monolith guardrail (advisory, never blocks)${C.r}`);
console.log('  ═══════════════════════════════════════════════════════════');

if (results.length === 0) {
  console.log(`  ${C.green}✓ lean${C.r}  ${targets.length} file${targets.length === 1 ? '' : 's'} scanned · nothing over the soft caps`);
} else {
  // heaviest first
  results.sort((a, b) => b.metrics.total - a.metrics.total);
  for (const r of results) {
    console.log(`\n  ${C.b}${r.file}${C.r}  ${C.dim}(${r.metrics.total} lines · ${r.metrics.inlineJS} inline JS · ${r.metrics.inlineCSS} inline CSS)${C.r}`);
    for (const f of r.findings) {
      console.log(`    ${C.yellow}· note${C.r}  ${C.b}${f.id}${C.r}  ${f.detail}`);
      console.log(`           ${C.dim}fix:${C.r} ${f.fix}`);
    }
  }
}

console.log('');
console.log(`  ${targets.length} scanned · ${C.yellow}${noteCount} note${noteCount === 1 ? '' : 's'}${C.r}`);
console.log(`  ${C.dim}Advisory: these never block. The win is not editing existing monoliths,`);
console.log(`  ${C.dim}it is keeping new pages lean so future edits stay cheap.${C.r}`);
console.log('');

process.exit(0);
