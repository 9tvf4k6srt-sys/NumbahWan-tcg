#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// PERF-BUDGET — Per-page weight, script, and image tracking
// ═══════════════════════════════════════════════════════════════════════════
//
// Scans all 119 HTML pages under public/ and reports:
//   - Total page size (HTML + inline CSS + inline JS)
//   - External script count and total estimated weight
//   - Image count and missing lazy-loading
//   - Inline style block size
//   - Budget violations (configurable thresholds)
//
// Usage:
//   node scripts/perf-budget.cjs              Run full audit
//   node scripts/perf-budget.cjs --summary    Just totals
//   node scripts/perf-budget.cjs --json       JSON output
//   node scripts/perf-budget.cjs --fail       Exit 1 on violations
//
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');

// ─── Budgets (per page) ────────────────────────────────────────────
const BUDGETS = {
  htmlSize:      150 * 1024,   // 150 KB max HTML file size
  inlineCSS:      50 * 1024,   // 50 KB max inline <style> content
  inlineJS:       30 * 1024,   // 30 KB max inline <script> content
  externalScripts:    15,      // Max external <script src="..."> tags
  images:             50,      // Max <img> tags per page
  missingLazy:         5,      // Max images without loading="lazy" (excluding above-fold)
  missingAlt:          0,      // Zero tolerance for missing alt text
  missingViewport:     0,      // Must have viewport meta
};

// ─── Parse a single HTML file ──────────────────────────────────────
function auditPage(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const fileName = path.relative(PUBLIC, filePath);
  const htmlSize = Buffer.byteLength(html, 'utf8');

  // Inline CSS: sum all <style>...</style> blocks
  const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  const inlineCSSSize = styleBlocks.reduce((sum, block) => {
    const inner = block.replace(/<style[^>]*>/i, '').replace(/<\/style>/i, '');
    return sum + Buffer.byteLength(inner, 'utf8');
  }, 0);

  // Inline JS: sum all <script> without src
  const allScripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  let inlineJSSize = 0;
  let externalScripts = 0;
  const scriptSrcs = [];

  for (const tag of allScripts) {
    const srcMatch = tag.match(/src\s*=\s*["']([^"']+)["']/i);
    if (srcMatch) {
      externalScripts++;
      scriptSrcs.push(srcMatch[1]);
    } else {
      const inner = tag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      inlineJSSize += Buffer.byteLength(inner, 'utf8');
    }
  }

  // Images
  const imgTags = html.match(/<img\s[^>]*>/gi) || [];
  const images = imgTags.length;
  let missingLazy = 0;
  let missingAlt = 0;

  for (const img of imgTags) {
    // Skip above-fold heuristic: first 3 images don't need lazy
    const idx = imgTags.indexOf(img);
    if (idx >= 3 && !/loading\s*=\s*["']lazy["']/i.test(img)) {
      missingLazy++;
    }
    if (!/alt\s*=/i.test(img)) {
      missingAlt++;
    }
  }

  // Viewport meta
  const hasViewport = /<meta[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(html);

  // Check violations
  const violations = [];
  if (htmlSize > BUDGETS.htmlSize) violations.push(`HTML ${(htmlSize / 1024).toFixed(0)}KB > ${(BUDGETS.htmlSize / 1024).toFixed(0)}KB`);
  if (inlineCSSSize > BUDGETS.inlineCSS) violations.push(`CSS ${(inlineCSSSize / 1024).toFixed(0)}KB > ${(BUDGETS.inlineCSS / 1024).toFixed(0)}KB`);
  if (inlineJSSize > BUDGETS.inlineJS) violations.push(`JS ${(inlineJSSize / 1024).toFixed(0)}KB > ${(BUDGETS.inlineJS / 1024).toFixed(0)}KB`);
  if (externalScripts > BUDGETS.externalScripts) violations.push(`${externalScripts} scripts > ${BUDGETS.externalScripts}`);
  if (images > BUDGETS.images) violations.push(`${images} imgs > ${BUDGETS.images}`);
  if (missingLazy > BUDGETS.missingLazy) violations.push(`${missingLazy} missing lazy > ${BUDGETS.missingLazy}`);
  if (missingAlt > BUDGETS.missingAlt) violations.push(`${missingAlt} missing alt`);
  if (!hasViewport) violations.push('No viewport meta');

  return {
    page: fileName,
    htmlSize,
    inlineCSSSize,
    inlineJSSize,
    externalScripts,
    scriptSrcs,
    images,
    missingLazy,
    missingAlt,
    hasViewport,
    violations,
  };
}

// ─── Main ──────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const summaryOnly = args.includes('--summary');
  const jsonOutput = args.includes('--json');
  const failOnViolation = args.includes('--fail');

  // Find all HTML pages
  const pages = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) pages.push(full);
    }
  }
  walk(PUBLIC);
  pages.sort();

  const results = pages.map(auditPage);
  const violators = results.filter(r => r.violations.length > 0);

  // Totals
  const totalHTML = results.reduce((s, r) => s + r.htmlSize, 0);
  const totalCSS = results.reduce((s, r) => s + r.inlineCSSSize, 0);
  const totalJS = results.reduce((s, r) => s + r.inlineJSSize, 0);
  const totalImages = results.reduce((s, r) => s + r.images, 0);
  const totalScripts = results.reduce((s, r) => s + r.externalScripts, 0);
  const totalMissingLazy = results.reduce((s, r) => s + r.missingLazy, 0);
  const totalMissingAlt = results.reduce((s, r) => s + r.missingAlt, 0);
  const noViewport = results.filter(r => !r.hasViewport).length;

  if (jsonOutput) {
    console.log(JSON.stringify({
      pages: results.length,
      totalHTML, totalCSS, totalJS, totalImages, totalScripts,
      totalMissingLazy, totalMissingAlt, noViewport,
      violators: violators.map(v => ({ page: v.page, violations: v.violations })),
      budgets: BUDGETS,
    }, null, 2));
    if (failOnViolation && violators.length > 0) process.exit(1);
    return;
  }

  console.log('');
  console.log('  PERF BUDGET AUDIT');
  console.log('  ' + '='.repeat(55));
  console.log(`  Pages scanned:    ${results.length}`);
  console.log(`  Total HTML:       ${(totalHTML / 1024).toFixed(0)} KB`);
  console.log(`  Total inline CSS: ${(totalCSS / 1024).toFixed(0)} KB`);
  console.log(`  Total inline JS:  ${(totalJS / 1024).toFixed(0)} KB`);
  console.log(`  External scripts: ${totalScripts} across all pages`);
  console.log(`  Images:           ${totalImages} total`);
  console.log(`  Missing lazy:     ${totalMissingLazy}`);
  console.log(`  Missing alt:      ${totalMissingAlt}`);
  console.log(`  No viewport:      ${noViewport}`);
  console.log('');

  if (!summaryOnly && violators.length > 0) {
    console.log(`  VIOLATIONS (${violators.length} pages):`);
    console.log('  ' + '-'.repeat(55));
    for (const v of violators) {
      console.log(`  ${v.page}`);
      for (const issue of v.violations) {
        console.log(`    - ${issue}`);
      }
    }
    console.log('');
  }

  // Top 5 heaviest pages
  const heaviest = [...results].sort((a, b) => b.htmlSize - a.htmlSize).slice(0, 5);
  console.log('  TOP 5 HEAVIEST PAGES:');
  console.log('  ' + '-'.repeat(55));
  for (const h of heaviest) {
    const vFlag = h.violations.length > 0 ? ' [!]' : '';
    console.log(`  ${(h.htmlSize / 1024).toFixed(0).padStart(5)} KB  ${h.page}${vFlag}`);
  }
  console.log('');

  // Most scripts
  const mostScripts = [...results].sort((a, b) => b.externalScripts - a.externalScripts).slice(0, 5);
  console.log('  TOP 5 MOST SCRIPTS:');
  console.log('  ' + '-'.repeat(55));
  for (const m of mostScripts) {
    console.log(`  ${String(m.externalScripts).padStart(5)} scripts  ${m.page}`);
  }
  console.log('');

  if (violators.length === 0) {
    console.log('  ALL PAGES WITHIN BUDGET');
  } else {
    console.log(`  ${violators.length}/${results.length} pages have violations`);
  }
  console.log('');

  if (failOnViolation && violators.length > 0) process.exit(1);
}

main();
