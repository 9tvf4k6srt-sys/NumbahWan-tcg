#!/usr/bin/env node
/**
 * Page Weight Profiler v1.0
 * ═══════════════════════════════════════════════════════════════════
 * Resolves real per-page asset costs: HTML + CSS + JS + images.
 * Reads each HTML file, finds all <link>, <script>, <img> tags,
 * sums actual file sizes from disk, and writes a per-page profile.
 *
 * OUTPUT:
 *   .mycelium-mined/page-weights.json
 *   public/static/data/page-weights.json (for dashboard/build)
 *
 * USAGE:
 *   node tools/page-weight-profiler.cjs            # Full scan + write
 *   node tools/page-weight-profiler.cjs --json     # JSON only
 *   node tools/page-weight-profiler.cjs --top 10   # Show heaviest 10
 *   node tools/page-weight-profiler.cjs --budget    # Show pages over budget
 *
 * @version 1.0.0
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const OUTPUT_MINED = path.join(ROOT, '.mycelium-mined', 'page-weights.json');
const OUTPUT_STATIC = path.join(ROOT, 'public', 'static', 'data', 'page-weights.json');

// Budget: warn if a page exceeds this total weight
const BUDGET_KB = 2048; // 2 MB per page

function fileSize(filepath) {
  try { return fs.statSync(filepath).size; } catch { return 0; }
}

function resolveAssetPath(href, htmlDir) {
  // Handle absolute paths (/static/...) and relative paths
  if (href.startsWith('/')) {
    return path.join(PUBLIC, href);
  }
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//') || href.startsWith('data:')) {
    return null; // External or data URI — can't measure
  }
  return path.join(htmlDir, href);
}

function profilePage(htmlPath) {
  const relPath = path.relative(PUBLIC, htmlPath);
  const htmlDir = path.dirname(htmlPath);
  let content;
  try { content = fs.readFileSync(htmlPath, 'utf8'); } catch { return null; }

  const htmlSize = Buffer.byteLength(content, 'utf8');

  const css = [];
  const js = [];
  const images = [];
  const fonts = [];
  let externalCount = 0;

  // CSS: <link rel="stylesheet" href="...">
  for (const m of content.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)) {
    const resolved = resolveAssetPath(m[1], htmlDir);
    if (resolved) {
      const size = fileSize(resolved);
      css.push({ file: path.relative(PUBLIC, resolved), sizeKB: Math.round(size / 1024 * 10) / 10 });
    } else {
      externalCount++;
    }
  }
  // Also href before rel
  for (const m of content.matchAll(/<link[^>]+href=["']([^"']+\.css)["']/gi)) {
    const resolved = resolveAssetPath(m[1], htmlDir);
    if (resolved) {
      const rel = path.relative(PUBLIC, resolved);
      if (!css.find(c => c.file === rel)) {
        const size = fileSize(resolved);
        css.push({ file: rel, sizeKB: Math.round(size / 1024 * 10) / 10 });
      }
    }
  }

  // JS: <script src="...">
  for (const m of content.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    const resolved = resolveAssetPath(m[1], htmlDir);
    if (resolved) {
      const size = fileSize(resolved);
      js.push({ file: path.relative(PUBLIC, resolved), sizeKB: Math.round(size / 1024 * 10) / 10 });
    } else {
      externalCount++;
    }
  }

  // Images: <img src="...">, background-image: url(...)
  for (const m of content.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const resolved = resolveAssetPath(m[1], htmlDir);
    if (resolved) {
      const size = fileSize(resolved);
      images.push({ file: path.relative(PUBLIC, resolved), sizeKB: Math.round(size / 1024 * 10) / 10 });
    } else {
      externalCount++;
    }
  }

  // Inline <style> blocks (rough size)
  let inlineStyleKB = 0;
  for (const m of content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    inlineStyleKB += Buffer.byteLength(m[1], 'utf8') / 1024;
  }

  // Inline <script> blocks (rough size)
  let inlineScriptKB = 0;
  for (const m of content.matchAll(/<script(?![^>]+src)[^>]*>([\s\S]*?)<\/script>/gi)) {
    inlineScriptKB += Buffer.byteLength(m[1], 'utf8') / 1024;
  }

  const totalCSSKB = css.reduce((a, c) => a + c.sizeKB, 0) + inlineStyleKB;
  const totalJSKB = js.reduce((a, c) => a + c.sizeKB, 0) + inlineScriptKB;
  const totalImageKB = images.reduce((a, i) => a + i.sizeKB, 0);
  const htmlKB = Math.round(htmlSize / 1024 * 10) / 10;
  const totalKB = Math.round((htmlKB + totalCSSKB + totalJSKB + totalImageKB) * 10) / 10;

  return {
    page: relPath,
    totalKB,
    htmlKB,
    cssKB: Math.round(totalCSSKB * 10) / 10,
    jsKB: Math.round(totalJSKB * 10) / 10,
    imageKB: Math.round(totalImageKB * 10) / 10,
    inlineStyleKB: Math.round(inlineStyleKB * 10) / 10,
    inlineScriptKB: Math.round(inlineScriptKB * 10) / 10,
    requests: {
      css: css.length,
      js: js.length,
      images: images.length,
      external: externalCount,
      total: css.length + js.length + images.length,
    },
    overBudget: totalKB > BUDGET_KB,
    assets: {
      css: css.sort((a, b) => b.sizeKB - a.sizeKB),
      js: js.sort((a, b) => b.sizeKB - a.sizeKB),
      images: images.sort((a, b) => b.sizeKB - a.sizeKB).slice(0, 10),
    },
  };
}

function scanAll() {
  const pages = [];

  // Scan public/*.html
  for (const f of fs.readdirSync(PUBLIC)) {
    if (!f.endsWith('.html')) continue;
    const profile = profilePage(path.join(PUBLIC, f));
    if (profile) pages.push(profile);
  }

  // Scan subdirectories (lore/, museum/)
  for (const subdir of ['lore', 'museum']) {
    const dir = path.join(PUBLIC, subdir);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.html')) continue;
      const profile = profilePage(path.join(dir, f));
      if (profile) pages.push(profile);
    }
  }

  // Sort by total weight descending
  pages.sort((a, b) => b.totalKB - a.totalKB);

  // Aggregate stats
  const totalWeight = Math.round(pages.reduce((a, p) => a + p.totalKB, 0));
  const avgWeight = pages.length > 0 ? Math.round(totalWeight / pages.length) : 0;
  const overBudget = pages.filter(p => p.overBudget).length;
  const totalRequests = pages.reduce((a, p) => a + p.requests.total, 0);

  // Category breakdown
  const byCategory = { css: 0, js: 0, images: 0, html: 0, inlineStyle: 0, inlineScript: 0 };
  for (const p of pages) {
    byCategory.css += p.cssKB;
    byCategory.js += p.jsKB;
    byCategory.images += p.imageKB;
    byCategory.html += p.htmlKB;
    byCategory.inlineStyle += p.inlineStyleKB;
    byCategory.inlineScript += p.inlineScriptKB;
  }
  for (const k of Object.keys(byCategory)) byCategory[k] = Math.round(byCategory[k]);

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    budgetKB: BUDGET_KB,
    summary: {
      totalPages: pages.length,
      totalWeightKB: totalWeight,
      avgWeightKB: avgWeight,
      heaviestKB: pages.length > 0 ? Math.round(pages[0].totalKB) : 0,
      lightestKB: pages.length > 0 ? Math.round(pages[pages.length - 1].totalKB) : 0,
      overBudget,
      totalRequests,
      avgRequests: pages.length > 0 ? Math.round(totalRequests / pages.length) : 0,
    },
    byCategory,
    pages,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);

const data = scanAll();

// Write outputs
for (const out of [OUTPUT_MINED, OUTPUT_STATIC]) {
  const dir = path.dirname(out);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
}

if (args.includes('--json')) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

const topN = args.includes('--top') ? parseInt(args[args.indexOf('--top') + 1]) || 10 : 15;

if (args.includes('--budget')) {
  const over = data.pages.filter(p => p.overBudget);
  console.log(`\n  PAGES OVER BUDGET (${BUDGET_KB} KB)`);
  console.log('  ═══════════════════════════════════════════════════');
  if (over.length === 0) {
    console.log('  All pages within budget!');
  } else {
    for (const p of over) {
      console.log(`  ${p.page.padEnd(40)} ${Math.round(p.totalKB)} KB  (+${Math.round(p.totalKB - BUDGET_KB)} KB over)`);
    }
  }
  console.log('');
  process.exit(0);
}

// Default: summary + top heaviest
console.log('');
console.log('  PAGE WEIGHT PROFILER');
console.log('  ═══════════════════════════════════════════════════');
console.log(`  Pages: ${data.summary.totalPages}  Total: ${data.summary.totalWeightKB} KB  Avg: ${data.summary.avgWeightKB} KB`);
console.log(`  Heaviest: ${data.summary.heaviestKB} KB  Lightest: ${data.summary.lightestKB} KB`);
console.log(`  Over budget (${BUDGET_KB} KB): ${data.summary.overBudget}`);
console.log(`  Total requests: ${data.summary.totalRequests}  Avg: ${data.summary.avgRequests}/page`);
console.log('');
console.log(`  Top ${topN} heaviest:`);
console.log('  Page                                   Total    HTML     CSS      JS     Img   Reqs');
console.log('  ─────────────────────────────────────  ───────  ─────  ──────  ──────  ──────  ────');
for (const p of data.pages.slice(0, topN)) {
  const name = p.page.padEnd(39);
  const total = `${Math.round(p.totalKB)}`.padStart(5) + 'KB';
  const html = `${Math.round(p.htmlKB)}`.padStart(5);
  const css = `${Math.round(p.cssKB)}`.padStart(6);
  const jsCol = `${Math.round(p.jsKB)}`.padStart(6);
  const img = `${Math.round(p.imageKB)}`.padStart(6);
  const reqs = `${p.requests.total}`.padStart(4);
  console.log(`  ${name}  ${total}  ${html}  ${css}  ${jsCol}  ${img}  ${reqs}`);
}
console.log('  ═══════════════════════════════════════════════════');
console.log('');
