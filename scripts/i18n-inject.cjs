#!/usr/bin/env node
/**
 * NW i18n Injector v1.0 — Single Source of Truth
 * ================================================
 * Reads  *.i18n.json  files and injects PAGE_I18N into the matching HTML.
 *
 * HOW IT WORKS:
 *   1. For each HTML file that has a sibling .i18n.json, read both.
 *   2. Validate that every data-i18n key in the HTML has en/zh/th.
 *   3. Build a compact PAGE_I18N object and replace the one in the HTML.
 *
 * USAGE:
 *   node scripts/i18n-inject.cjs                    # All pages
 *   node scripts/i18n-inject.cjs nwg-the-game       # Single page
 *   node scripts/i18n-inject.cjs --check             # Validate only (no write)
 *   node scripts/i18n-inject.cjs --verbose            # Show details
 *
 * THE SINGLE FILE YOU EDIT:
 *   public/world/nwg-the-game.i18n.json
 *   Format: { "keyName": { "en": "English", "zh": "中文", "th": "ไทย" }, ... }
 *
 * ADDING NEW CONTENT:
 *   1. Add HTML element: <h2 data-i18n="myNewKey">English Text</h2>
 *   2. Add to .i18n.json:  "myNewKey": { "en": "English Text", "zh": "中文翻譯", "th": "คำแปลภาษาไทย" }
 *   3. Run:  node scripts/i18n-inject.cjs
 *   Done! All three languages handled in one place.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const CHECK_ONLY = process.argv.includes('--check');
const VERBOSE = process.argv.includes('--verbose');
const SINGLE_PAGE = process.argv.find(a => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]);

// ══════════════════════════════════════════════════════════════════
//  FIND ALL i18n JSON FILES
// ══════════════════════════════════════════════════════════════════
function findI18nFiles(dir) {
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...findI18nFiles(full));
    } else if (item.name.endsWith('.i18n.json')) {
      results.push(full);
    }
  }
  return results;
}

// ══════════════════════════════════════════════════════════════════
//  PROCESS A SINGLE PAGE
// ══════════════════════════════════════════════════════════════════
function processPage(jsonPath) {
  const htmlPath = jsonPath.replace('.i18n.json', '.html');
  const pageName = path.basename(jsonPath, '.i18n.json');

  if (!fs.existsSync(htmlPath)) {
    console.error(`  [SKIP] No HTML found for ${pageName}`);
    return { ok: false, errors: [`No HTML file: ${htmlPath}`] };
  }

  const i18nData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Parse HTML to find all data-i18n keys
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const htmlKeys = new Set();
  doc.querySelectorAll('[data-i18n]').forEach(el => {
    htmlKeys.add(el.getAttribute('data-i18n'));
  });

  const errors = [];
  const warnings = [];

  // ── Validation ──
  // 1. Check: every HTML key must exist in JSON
  for (const key of htmlKeys) {
    if (!i18nData[key]) {
      errors.push(`MISSING in .i18n.json: "${key}" (used in HTML but no translation entry)`);
    } else {
      if (!i18nData[key].zh) errors.push(`MISSING zh for "${key}"`);
      if (!i18nData[key].th) errors.push(`MISSING th for "${key}"`);
    }
  }

  // 2. Check: JSON keys not in HTML (orphans — warn only)
  for (const key of Object.keys(i18nData)) {
    if (!htmlKeys.has(key)) {
      warnings.push(`ORPHAN: "${key}" in .i18n.json but not used in HTML`);
    }
  }

  if (VERBOSE || errors.length > 0) {
    console.log(`\n  ${pageName}: ${htmlKeys.size} HTML keys, ${Object.keys(i18nData).length} JSON keys`);
    if (errors.length > 0) {
      console.log(`  ❌ ${errors.length} errors:`);
      errors.forEach(e => console.log(`     ${e}`));
    }
    if (VERBOSE && warnings.length > 0) {
      console.log(`  ⚠️  ${warnings.length} orphan keys (in JSON but not HTML)`);
    }
  }

  if (errors.length > 0 || CHECK_ONLY) {
    return { ok: errors.length === 0, errors, warnings };
  }

  // ── Build PAGE_I18N ──
  // en:{} stays empty (English comes from HTML),
  // zh and th get all translations
  const zhObj = {};
  const thObj = {};
  for (const [key, val] of Object.entries(i18nData)) {
    if (val.zh) zhObj[key] = val.zh;
    if (val.th) thObj[key] = val.th;
  }

  // Compact single-line JSON (matches existing format)
  const pageI18n = `const PAGE_I18N=${JSON.stringify({ en: {}, zh: zhObj, th: thObj })}`;

  // Replace in HTML
  const pattern = /const\s+PAGE_I18N\s*=\s*\{[\s\S]*?\}/;
  if (!pattern.test(html)) {
    errors.push('Could not find PAGE_I18N block in HTML');
    return { ok: false, errors, warnings };
  }

  const newHtml = html.replace(/const\s+PAGE_I18N\s*=\s*\{[^\n]*\}/, pageI18n);

  fs.writeFileSync(htmlPath, newHtml);
  console.log(`  ✅ ${pageName}: injected ${Object.keys(zhObj).length} zh + ${Object.keys(thObj).length} th translations`);

  return { ok: true, errors: [], warnings };
}

// ══════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════
function main() {
  console.log(`\n🌐 NW i18n Injector${CHECK_ONLY ? ' [CHECK ONLY]' : ''}`);
  console.log('─'.repeat(50));

  let jsonFiles = findI18nFiles(PUBLIC_DIR);

  if (SINGLE_PAGE) {
    jsonFiles = jsonFiles.filter(f => path.basename(f).includes(SINGLE_PAGE));
    if (jsonFiles.length === 0) {
      console.error(`No .i18n.json file found matching "${SINGLE_PAGE}"`);
      process.exit(1);
    }
  }

  if (jsonFiles.length === 0) {
    console.log('No .i18n.json files found in public/');
    return;
  }

  console.log(`Found ${jsonFiles.length} i18n file(s)\n`);

  let totalErrors = 0;
  for (const f of jsonFiles) {
    const result = processPage(f);
    totalErrors += result.errors.length;
  }

  console.log('\n' + '─'.repeat(50));
  if (totalErrors > 0) {
    console.log(`❌ ${totalErrors} error(s) found. Fix the .i18n.json file(s) and re-run.`);
    process.exit(1);
  } else {
    console.log(`✅ All translations complete.${CHECK_ONLY ? ' (check only — no files modified)' : ''}`);
  }
}

main();
