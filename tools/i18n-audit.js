#!/usr/bin/env node
/**
 * NumbahWan i18n Audit Tool v1.0
 * ═══════════════════════════════════════════════════════════════════
 * Comprehensive audit of ALL pages for i18n coverage.
 *
 * Detects:
 *   1. data-i18n keys in HTML that lack ZH or TH translations
 *   2. data-i18n-html / data-i18n-placeholder / data-i18n-title keys
 *   3. Translation objects defined via any naming convention
 *      (PAGE_I18N, HOMEPAGE_I18N, ACADEMY_I18N, i18n, NW_I18N.register)
 *   4. Keys covered by CORE_TRANSLATIONS in nw-i18n-core.js
 *   5. Pages with data-i18n that have NO translation object at all
 *
 * Usage:
 *   node tools/i18n-audit.js            # Full audit, summary
 *   node tools/i18n-audit.js --verbose  # Show every missing key
 *   node tools/i18n-audit.js --json     # Machine-readable JSON output
 *   node tools/i18n-audit.js --fix-report # Output fix suggestions
 *   node tools/i18n-audit.js <file>     # Audit a single file
 *
 * Run: node tools/i18n-audit.js
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const PUBLIC_DIR = 'public';
const CORE_I18N_PATH = 'public/static/nw-i18n-core.js';
const SUPPORTED_LANGS = ['zh', 'th'];   // English is the base, audit ZH and TH

// ═══════════════════════════════════════════════════════════════════
// CLI FLAGS
// ═══════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const jsonOutput = args.includes('--json');
const fixReport = args.includes('--fix-report');
const singleFile = args.find(a => !a.startsWith('-') && a.endsWith('.html'));

// ═══════════════════════════════════════════════════════════════════
// CORE TRANSLATION KEYS
// ═══════════════════════════════════════════════════════════════════

function extractCoreKeys() {
  const src = readFileSync(CORE_I18N_PATH, 'utf8');
  // Extract keys from en: { ... } block inside CORE_TRANSLATIONS
  const enBlock = src.match(/CORE_TRANSLATIONS\s*=\s*\{[\s\S]*?en\s*:\s*\{([^}]+)\}/);
  if (!enBlock) return new Set();
  const keys = [...enBlock[1].matchAll(/(\w+)\s*:/g)].map(m => m[1]);
  return new Set(keys);
}

// ═══════════════════════════════════════════════════════════════════
// EXTRACT data-i18n KEYS FROM HTML
// ═══════════════════════════════════════════════════════════════════

const I18N_ATTR_RE = /data-i18n(?:-html|-placeholder|-title)?="([^"]+)"/g;

function extractI18nKeys(html) {
  const keys = new Set();
  let m;
  const re = new RegExp(I18N_ATTR_RE.source, 'g');
  while ((m = re.exec(html)) !== null) {
    keys.add(m[1]);
  }
  return keys;
}

// ═══════════════════════════════════════════════════════════════════
// EXTRACT TRANSLATION KEYS FROM JS BLOCKS
// ═══════════════════════════════════════════════════════════════════

/**
 * Extracts the set of keys for a given language from ALL translation
 * objects found in the HTML file's <script> blocks.
 *
 * Handles patterns:
 *  - const PAGE_I18N = { zh: { key: ... }, ... }
 *  - const HOMEPAGE_I18N = { zh: { key: ... }, ... }
 *  - const i18n = { zh: { key: ... }, ... }
 *  - NW_I18N.register({ zh: { key: ... }, ... })
 *  - NW_I18N.registerPage('id', { zh: { key: ... }, ... })
 */
function extractTranslationKeys(html, lang) {
  const keys = new Set();

  // Extract all <script> content
  const scriptBlocks = [];
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let sm;
  while ((sm = scriptRe.exec(html)) !== null) {
    scriptBlocks.push(sm[1]);
  }
  const scriptContent = scriptBlocks.join('\n');

  // Strategy: Find each `lang: {` block start, then extract ALL key patterns
  // from that point until we hit the next sibling lang block or parent close.
  // 
  // The challenge: multilingual strings (Chinese/Thai) contain characters that
  // break naive string-skipping parsers. Instead, we use a regex-based approach:
  // scan for 'key': or key: patterns that look like translation keys.
  
  const langStartRe = new RegExp(`['"]?${lang}['"]?\\s*:\\s*\\{`, 'g');
  let lm;
  while ((lm = langStartRe.exec(scriptContent)) !== null) {
    const blockStart = lm.index + lm[0].length;
    
    // Find the end of this lang block by looking for the next sibling lang block
    // or the closing of the parent object. We look for patterns like:
    //   }, th: {    (next lang)
    //   },\n  th:   (next lang on new line)
    //   }};         (end of PAGE_I18N)
    //   })          (end of NW_I18N.register call)
    // We scan from blockStart to find a } at depth 0
    
    let depth = 1; // we're inside the first {
    let blockEnd = scriptContent.length;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    
    for (let i = blockStart; i < scriptContent.length; i++) {
      const ch = scriptContent[i];
      const prev = i > 0 ? scriptContent[i - 1] : '';
      
      if (inSingleQuote) {
        if (ch === "'" && prev !== '\\') inSingleQuote = false;
        continue;
      }
      if (inDoubleQuote) {
        if (ch === '"' && prev !== '\\') inDoubleQuote = false;
        continue;
      }
      
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { blockEnd = i; break; }
      }
      // Detect string boundaries using context
      else if (ch === "'") {
        // Check if this is a string start (after : , { [) vs an apostrophe in text
        let j = i - 1;
        while (j >= blockStart && /\s/.test(scriptContent[j])) j--;
        const prevNonWS = j >= blockStart ? scriptContent[j] : '';
        if (':,[{'.includes(prevNonWS)) {
          inSingleQuote = true;
        }
      }
      else if (ch === '"') {
        let j = i - 1;
        while (j >= blockStart && /\s/.test(scriptContent[j])) j--;
        const prevNonWS = j >= blockStart ? scriptContent[j] : '';
        if (':,[{'.includes(prevNonWS)) {
          inDoubleQuote = true;
        }
      }
    }
    
    const blockContent = scriptContent.substring(blockStart, blockEnd);
    
    // Now extract keys from this block. Keys appear as:
    //   'keyName': 'value'  or  keyName: 'value'  or  "keyName": "value"
    // We match the pattern: word boundary, key name, colon, then a quote
    const keyRe = /['"]?(\w+)['"]?\s*:\s*['"]/g;
    let km;
    while ((km = keyRe.exec(blockContent)) !== null) {
      keys.add(km[1]);
    }
  }

  return keys;
}

// ═══════════════════════════════════════════════════════════════════
// DETECT TRANSLATION APPROACH
// ═══════════════════════════════════════════════════════════════════

function detectTranslationApproach(html) {
  if (/NW_I18N\.register\s*\(/.test(html)) return 'NW_I18N.register()';
  if (/NW_I18N\.registerPage\s*\(/.test(html)) return 'NW_I18N.registerPage()';
  if (/PAGE_I18N\s*=\s*\{/.test(html)) return 'PAGE_I18N object';
  if (/HOMEPAGE_I18N\s*=\s*\{/.test(html)) return 'HOMEPAGE_I18N object';
  if (/ACADEMY_I18N\s*=\s*\{/.test(html)) return 'ACADEMY_I18N object';
  if (/const\s+i18n\s*=\s*\{/.test(html)) return 'inline i18n object';
  if (/initI18n\s*\(/.test(html)) return 'initI18n() legacy';
  if (/data-i18n/.test(html)) return 'core-only (no page translations)';
  return 'none';
}

// ═══════════════════════════════════════════════════════════════════
// SCAN FILES
// ═══════════════════════════════════════════════════════════════════

function findHtmlFiles(dir) {
  const results = [];
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        // Skip hidden, node_modules, dist, static/templates
        if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
          walk(full);
        }
      } else if (entry.endsWith('.html') && !full.includes('static/templates')) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results.sort();
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT ONE FILE
// ═══════════════════════════════════════════════════════════════════

function auditFile(filePath, coreKeys) {
  const html = readFileSync(filePath, 'utf8');
  const relPath = relative('.', filePath);

  // 1) Extract all data-i18n keys from the HTML
  const i18nKeys = extractI18nKeys(html);
  if (i18nKeys.size === 0) {
    return { file: relPath, totalKeys: 0, approach: 'none', skipped: true };
  }

  // 2) Detect translation approach
  const approach = detectTranslationApproach(html);

  // 3) For each supported language, find which keys have translations
  const langResults = {};
  for (const lang of SUPPORTED_LANGS) {
    const pageKeys = extractTranslationKeys(html, lang);
    // Keys that are covered = in CORE or in page translations
    const missing = [];
    for (const key of i18nKeys) {
      if (!coreKeys.has(key) && !pageKeys.has(key)) {
        missing.push(key);
      }
    }
    langResults[lang] = {
      pageKeys: pageKeys.size,
      covered: i18nKeys.size - missing.length,
      missing: missing.sort(),
      missingCount: missing.length
    };
  }

  return {
    file: relPath,
    totalKeys: i18nKeys.size,
    approach,
    skipped: false,
    langs: langResults
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

function main() {
  const coreKeys = extractCoreKeys();

  // Determine which files to audit
  let files;
  if (singleFile) {
    files = [singleFile];
  } else {
    files = findHtmlFiles(PUBLIC_DIR);
  }

  const results = [];
  let totalIssues = 0;
  let filesWithIssues = 0;
  let filesAudited = 0;
  let filesSkipped = 0;

  for (const f of files) {
    const result = auditFile(f, coreKeys);
    results.push(result);

    if (result.skipped) {
      filesSkipped++;
      continue;
    }

    filesAudited++;
    let hasIssue = false;
    for (const lang of SUPPORTED_LANGS) {
      const mc = result.langs[lang].missingCount;
      totalIssues += mc;
      if (mc > 0) hasIssue = true;
    }
    if (hasIssue) filesWithIssues++;
  }

  // ─────────────────────────────────────────────────────────────────
  // OUTPUT
  // ─────────────────────────────────────────────────────────────────

  if (jsonOutput) {
    const output = {
      summary: {
        filesScanned: files.length,
        filesAudited,
        filesSkipped,
        filesWithIssues,
        totalMissingTranslations: totalIssues,
        coreKeysCount: coreKeys.size
      },
      results: results.filter(r => !r.skipped)
    };
    console.log(JSON.stringify(output, null, 2));
    return totalIssues;
  }

  // Pretty output
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           NumbahWan i18n Audit Tool v1.0                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log(`  Core keys (nw-i18n-core.js):  ${coreKeys.size}`);
  console.log(`  Files scanned:                ${files.length}`);
  console.log(`  Files with data-i18n:         ${filesAudited}`);
  console.log(`  Files skipped (no i18n):      ${filesSkipped}`);
  console.log('');

  // Group results
  const perfect = results.filter(r => !r.skipped && SUPPORTED_LANGS.every(l => r.langs[l].missingCount === 0));
  const issues = results.filter(r => !r.skipped && SUPPORTED_LANGS.some(l => r.langs[l].missingCount > 0));

  // ── Files with issues ──
  if (issues.length > 0) {
    console.log('  ┌─────────────────────────────────────────────────────────┐');
    console.log('  │  FILES WITH MISSING TRANSLATIONS                       │');
    console.log('  └─────────────────────────────────────────────────────────┘\n');

    for (const r of issues) {
      const zhMissing = r.langs.zh.missingCount;
      const thMissing = r.langs.th.missingCount;
      const zhIcon = zhMissing > 0 ? '\x1b[31m✗\x1b[0m' : '\x1b[32m✓\x1b[0m';
      const thIcon = thMissing > 0 ? '\x1b[31m✗\x1b[0m' : '\x1b[32m✓\x1b[0m';

      console.log(`  ${r.file}  (${r.totalKeys} keys, ${r.approach})`);
      console.log(`    ZH ${zhIcon} ${r.langs.zh.covered}/${r.totalKeys} covered` + (zhMissing > 0 ? `  \x1b[31m${zhMissing} missing\x1b[0m` : ''));
      console.log(`    TH ${thIcon} ${r.langs.th.covered}/${r.totalKeys} covered` + (thMissing > 0 ? `  \x1b[31m${thMissing} missing\x1b[0m` : ''));

      if (verbose || fixReport) {
        for (const lang of SUPPORTED_LANGS) {
          if (r.langs[lang].missingCount > 0) {
            console.log(`    Missing ${lang.toUpperCase()}: ${r.langs[lang].missing.join(', ')}`);
          }
        }
      }
      console.log('');
    }
  }

  // ── Perfect files ──
  if (perfect.length > 0 && verbose) {
    console.log('  ┌─────────────────────────────────────────────────────────┐');
    console.log('  │  FULLY TRANSLATED                                      │');
    console.log('  └─────────────────────────────────────────────────────────┘\n');

    for (const r of perfect) {
      console.log(`  \x1b[32m✓\x1b[0m ${r.file}  (${r.totalKeys} keys, ${r.approach})`);
    }
    console.log('');
  }

  // ── Summary ──
  console.log('  ═══════════════════════════════════════════════════════════');
  if (totalIssues === 0) {
    console.log('  \x1b[32m✓ ALL PAGES FULLY TRANSLATED — 0 missing keys\x1b[0m');
  } else {
    console.log(`  \x1b[31m✗ ${totalIssues} missing translations across ${filesWithIssues} file(s)\x1b[0m`);
  }
  console.log(`  ${perfect.length} perfect / ${issues.length} need work / ${filesSkipped} no-i18n`);
  console.log('  ═══════════════════════════════════════════════════════════\n');

  return totalIssues;
}

const exitCode = main();
process.exit(exitCode > 0 ? 1 : 0);
