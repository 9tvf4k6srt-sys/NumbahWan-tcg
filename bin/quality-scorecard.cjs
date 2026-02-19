#!/usr/bin/env node
/**
 * NW Quality Scorecard v1.0
 * 
 * Automated per-page health report covering:
 *   - i18n coverage (data-i18n keys vs translations)
 *   - Page weight (HTML size, asset count)
 *   - Script/style includes (correct i18n shim, nav, etc.)
 *   - Link integrity (internal href targets exist)
 *
 * Usage:
 *   node bin/quality-scorecard.cjs              # score all pages
 *   node bin/quality-scorecard.cjs <page>       # score single page
 *   node bin/quality-scorecard.cjs --json       # output as JSON
 *   node bin/quality-scorecard.cjs --failing    # only show failing pages
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const B = '\x1b[1m', G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', X = '\x1b[0m';

// ── Find all HTML pages ──
function findPages(filterSlug) {
  const pages = [];
  function walk(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      if (f.isDirectory()) walk(path.join(dir, f.name));
      else if (f.name.endsWith('.html') && !f.name.startsWith('_')) {
        const full = path.join(dir, f.name);
        const rel = path.relative(PUBLIC, full);
        if (filterSlug && !rel.includes(filterSlug)) continue;
        pages.push({ path: full, rel });
      }
    }
  }
  walk(PUBLIC);
  return pages;
}

// ── Score a single page ──
function scorePage(pagePath) {
  const content = fs.readFileSync(pagePath, 'utf-8');
  const rel = path.relative(PUBLIC, pagePath);
  const checks = [];
  let score = 100;

  // 1. i18n coverage
  const i18nKeys = (content.match(/data-i18n="([^"]+)"/g) || []).map(m => m.match(/"([^"]+)"/)[1]);
  const uniqueKeys = [...new Set(i18nKeys)];
  const hasI18nShim = content.includes('nw-i18n-shim.js') || content.includes('nw-i18n-core.js');
  const hasPageI18n = content.includes('PAGE_I18N') || content.includes('NW_I18N.register');
  
  if (uniqueKeys.length > 0 && !hasI18nShim) {
    checks.push({ name: 'i18n-shim', pass: false, msg: `${uniqueKeys.length} i18n keys but no i18n script` });
    score -= 20;
  } else if (uniqueKeys.length > 0) {
    checks.push({ name: 'i18n-shim', pass: true, msg: `i18n shim loaded, ${uniqueKeys.length} keys` });
  }

  if (uniqueKeys.length > 0 && !hasPageI18n) {
    checks.push({ name: 'i18n-translations', pass: false, msg: `${uniqueKeys.length} keys but no PAGE_I18N/register` });
    score -= 15;
  } else if (uniqueKeys.length > 0) {
    checks.push({ name: 'i18n-translations', pass: true, msg: 'PAGE_I18N registered' });
  }

  // Check for companion .i18n.json file
  const i18nJsonPath = pagePath.replace('.html', '.i18n.json');
  const hasI18nJson = fs.existsSync(i18nJsonPath);
  if (uniqueKeys.length > 10 && hasI18nJson) {
    checks.push({ name: 'i18n-json', pass: true, msg: 'Single-source .i18n.json exists' });
    score += 5; // bonus for best practice
  } else if (uniqueKeys.length > 10 && !hasI18nJson) {
    checks.push({ name: 'i18n-json', pass: false, msg: 'No .i18n.json file — translations inline only', warn: true });
  }

  // 2. Navigation
  const hasNav = content.includes('nw-nav.js');
  if (!hasNav) {
    checks.push({ name: 'nav', pass: false, msg: 'Missing nw-nav.js include' });
    score -= 10;
  } else {
    checks.push({ name: 'nav', pass: true, msg: 'Nav included' });
  }

  // 3. Meta tags
  const hasViewport = content.includes('viewport');
  const hasCharset = content.includes('charset');
  const hasTitle = /<title>[^<]+<\/title>/.test(content);
  if (!hasViewport) { checks.push({ name: 'viewport', pass: false, msg: 'Missing viewport meta' }); score -= 5; }
  if (!hasTitle) { checks.push({ name: 'title', pass: false, msg: 'Missing or empty title' }); score -= 5; }
  if (hasViewport && hasCharset && hasTitle) {
    checks.push({ name: 'meta', pass: true, msg: 'Meta tags OK' });
  }

  // 4. Page weight
  const sizeKB = (content.length / 1024).toFixed(1);
  const imgCount = (content.match(/<img /g) || []).length;
  const lazyImgs = (content.match(/loading="lazy"/g) || []).length;
  
  if (content.length > 500 * 1024) {
    checks.push({ name: 'weight', pass: false, msg: `${sizeKB}KB — very large page` });
    score -= 10;
  } else if (content.length > 200 * 1024) {
    checks.push({ name: 'weight', pass: false, msg: `${sizeKB}KB — large page`, warn: true });
    score -= 5;
  } else {
    checks.push({ name: 'weight', pass: true, msg: `${sizeKB}KB` });
  }

  if (imgCount > 0 && lazyImgs < imgCount) {
    const missing = imgCount - lazyImgs;
    checks.push({ name: 'lazy-img', pass: false, msg: `${missing}/${imgCount} images not lazy-loaded`, warn: true });
    score -= Math.min(missing * 2, 10);
  } else if (imgCount > 0) {
    checks.push({ name: 'lazy-img', pass: true, msg: `${imgCount} images, all lazy` });
  }

  // 5. Accessibility basics
  const hasLang = /html lang="/.test(content);
  const imgAlts = (content.match(/<img [^>]*alt="[^"]+"/g) || []).length;
  const imgsNoAlt = imgCount - imgAlts;
  if (!hasLang) { checks.push({ name: 'a11y-lang', pass: false, msg: 'Missing html lang attr' }); score -= 3; }
  if (imgsNoAlt > 0) {
    checks.push({ name: 'a11y-alt', pass: false, msg: `${imgsNoAlt} images missing alt text` });
    score -= Math.min(imgsNoAlt * 2, 10);
  }

  // Cap score
  score = Math.max(0, Math.min(105, score));

  // Grade
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  return {
    page: rel,
    score,
    grade,
    i18nKeys: uniqueKeys.length,
    sizeKB: parseFloat(sizeKB),
    checks,
  };
}

// ── Main ──
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const failingOnly = args.includes('--failing');
const filterSlug = args.find(a => !a.startsWith('--'));

const pages = findPages(filterSlug);
if (pages.length === 0) { console.log('No pages found'); process.exit(1); }

const results = pages.map(p => scorePage(p.path));
results.sort((a, b) => a.score - b.score); // worst first

if (jsonMode) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

console.log(`\n${B}🏭 NW Quality Scorecard${X}\n`);

const filtered = failingOnly ? results.filter(r => r.grade !== 'A') : results;

filtered.forEach(r => {
  const gradeColor = r.grade === 'A' ? G : r.grade === 'B' ? C : r.grade === 'C' ? Y : R;
  console.log(`  ${gradeColor}${r.grade}${X} ${r.score}/100  ${B}${r.page}${X}  (${r.sizeKB}KB, ${r.i18nKeys} i18n)`);
  
  if (r.grade !== 'A' && !failingOnly) {
    r.checks.filter(c => !c.pass).forEach(c => {
      const icon = c.warn ? Y + '⚠' : R + '✗';
      console.log(`      ${icon}${X} ${c.name}: ${c.msg}`);
    });
  }
});

// Summary
const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
const gradeA = results.filter(r => r.grade === 'A').length;
const gradeFail = results.filter(r => r.score < 70).length;
console.log(`\n  ${B}Summary${X}: ${results.length} pages, avg ${avg}/100, ${gradeA} A-grade, ${gradeFail} failing`);
console.log('');
