#!/usr/bin/env node
/**
 * NW-GUARDIAN v3.0 — Unified Code Health, Validation & Self-Heal System
 * ══════════════════════════════════════════════════════════════════════
 * 
 * REPLACES 17 SEPARATE SCRIPTS with one unified system:
 *   - sentinel.cjs (v2.5)           → absorbed (10-module scoring)
 *   - nw-selfmod.cjs               → absorbed (recursive self-heal)
 *   - nw-design-guard.cjs          → absorbed (font-size floor, brand, mobile)
 *   - nw-i18n-guard.cjs            → absorbed (i18n parity, orphaned keys)
 *   - nw-deepdive-guardian.cjs     → absorbed (i18n detection, subset)
 *   - design-fix.cjs               → absorbed (font-size fix, media merge)
 *   - add-universal-nav.cjs        → absorbed (inject nav)
 *   - perf-budget.cjs              → absorbed (per-page weight)
 *   - ui-validator.js              → absorbed (CSS overlap)
 *   - mycelium-eval.cjs            → absorbed (scoring now here)
 *   - mycelium-fix.cjs             → absorbed (fix loop now here)
 *   - mycelium-doctor.cjs          → absorbed (health check now here)
 *   - mycelium-engine.cjs          → absorbed (shared core)
 *   - mycelium-upgrade.cjs         → absorbed (auto-harden)
 *   - regression-from-breakages.cjs → absorbed (tests merged)
 *   - regression-upgrade.cjs       → absorbed (tests merged)
 *   - test-new-features.cjs        → absorbed (tests merged)
 * 
 * 10 SCORING MODULES (each scores 0-100, weighted into composite):
 *   1. Architecture   (15%) — file size, complexity, route distribution, duplication
 *   2. Assets         (15%) — image optimization, CSS/JS bloat, format audit
 *   3. i18n           (10%) — translation coverage, hardcoded strings
 *   4. Dead Code      (10%) — unused exports, orphan pages, unreferenced files
 *   5. Security       (15%) — exposed secrets, unsafe patterns, missing headers
 *   6. Performance    (10%) — bundle size, dependency count, page weight budgets
 *   7. API Surface     (8%) — endpoint inventory, error handling, consistency
 *   8. Dependencies    (7%) — unused deps, type/runtime mismatch, audit
 *   9. Accessibility   (5%) — ARIA, alt tags, semantic HTML, contrast hints
 *  10. SEO & Meta      (5%) — meta tags, OG, canonical, structured data
 * 
 * SELF-HEAL ENGINE (from nw-selfmod):
 *   - Recursive validate → heal → re-validate loop
 *   - Auto-injects missing scripts (icons, i18n, nav)
 *   - Auto-injects missing viewport meta
 *   - Convergence detection via issue fingerprinting
 *   - Manifest generation with SHA-256 checksums
 * 
 * DESIGN GUARD (from nw-design-guard):
 *   - Font-size floor (0.75rem minimum)
 *   - Brand cross-contamination checks
 *   - Mobile safety (viewport, overflow, breakpoints)
 * 
 * SYSTEMS:
 *   - TREND TRACKER: Compares scores across builds, detects regressions
 *   - AUTO-FIX ENGINE: Generates executable fix scripts per issue category
 *   - CI/CD GATE: Fail builds on score drop or critical threshold
 * 
 * USAGE:
 *   node sentinel.cjs                        # Full scan with dashboard
 *   node sentinel.cjs --ci                   # CI gate (exit 1 if < 50)
 *   node sentinel.cjs --ci --no-regress      # CI gate + regression block
 *   node sentinel.cjs --json                 # JSON-only output
 *   node sentinel.cjs --module architecture  # Run single module
 *   node sentinel.cjs --fix                  # Show optimization plan
 *   node sentinel.cjs --auto-fix             # Generate fix scripts
 *   node sentinel.cjs --trend                # Show trend history
 *   node sentinel.cjs --heal                 # Run recursive self-heal
 *   node sentinel.cjs --guard                # Run design/i18n guard checks
 *   node sentinel.cjs --manifest             # Write binding manifest
 * 
 * @version 3.0.0
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ════════════════════════════════════════════════════════════════════
// CONFIG & CONSTANTS
// ════════════════════════════════════════════════════════════════════

const VERSION = '3.0.0';
const MAX_TREND_ENTRIES = 50;

const THRESHOLDS = {
  maxFileLines: 500,        // Backend source files
  maxStaticCSSLines: 1500,  // Static CSS (game UI, animations) — legitimately larger
  maxStaticJSLines: 2000,   // Static JS (game engines) — legitimately larger
  maxFunctionLines: 50,
  maxRouteHandlers: 30,
  maxTotalLines: 15000,
  maxComplexity: 15,
  maxDependencies: 20,
  maxBundleKB: 450,         // Realistic for 83-module Hono app with 10 sentinel modules
  maxImageKB: 500,
  maxPageWeightMB: 3,
  maxCSSLines: 500,
  maxJSLines: 500,
  staleFileDays: 30
};

const IGNORE = [
  'node_modules', '.git', 'dist', '.wrangler', '.ai-cache',
  'package-lock.json', 'archive'
];

const BINARY_EXT = new Set([
  '.webp', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico',
  '.mp3', '.wav', '.ogg', '.mp4', '.webm',
  '.woff', '.woff2', '.ttf', '.eot',
  '.zip', '.tar', '.gz', '.pdf'
]);

const MODULE_WEIGHTS = {
  architecture: 0.15,
  assets: 0.15,
  i18n: 0.10,
  deadCode: 0.10,
  security: 0.15,
  performance: 0.10,
  apiSurface: 0.08,
  dependencies: 0.07,
  accessibility: 0.05,
  seoMeta: 0.05
};

function gradeFromScore(s) {
  return s >= 95 ? 'A+' : s >= 90 ? 'A' : s >= 85 ? 'A-' :
         s >= 80 ? 'B+' : s >= 75 ? 'B' : s >= 70 ? 'B-' :
         s >= 60 ? 'C' : s >= 50 ? 'D' : 'F';
}

function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }

// ════════════════════════════════════════════════════════════════════
// FILE SCANNER (shared across all modules)
// ════════════════════════════════════════════════════════════════════

function categorize(relPath) {
  if (relPath.includes('/test') || relPath.includes('.test.') || relPath.includes('.spec.')) return 'test';
  if (relPath.match(/\.(json|yaml|yml|toml|sql)$/)) return 'data';
  if (relPath.match(/\.(ts|tsx|js|jsx)$/) && relPath.startsWith('src/')) return 'source';
  if (relPath.includes('/static/') && relPath.match(/\.(js|css)$/)) return 'static-code';
  if (relPath.match(/\.html$/)) return 'page';
  if (relPath.match(/\.(md|txt|log)$/) || relPath.includes('config')) return 'config';
  return 'asset';
}

function shouldIgnore(relPath, ignoreList) {
  return ignoreList.some(p => p.startsWith('*') ? relPath.endsWith(p.slice(1)) : relPath.includes(p));
}

function scanFiles(rootDir) {
  const files = [];
  const hashes = new Map();

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = path.relative(rootDir, full);
      if (shouldIgnore(rel, IGNORE) || shouldIgnore(e.name, IGNORE)) continue;
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.isFile()) continue;
      try {
        const stat = fs.statSync(full);
        const ext = path.extname(e.name).toLowerCase();
        const cat = categorize(rel);
        const isBin = BINARY_EXT.has(ext);
        let content = '', lines = 0, complexity = 0, functions = 0;
        let exports = 0, imports = 0, routeHandlers = 0, hash = '';

        if (!isBin && stat.size < 500000) {
          content = fs.readFileSync(full, 'utf8');
          lines = content.split('\n').length;
          if (cat === 'source' || cat === 'static-code') {
            const decisions = (content.match(/\b(if|else\s+if|for|while|switch|case|catch|\?\?|&&|\|\|)\b/g) || []).length;
            const fns = (content.match(/\b(function|=>)\b/g) || []).length;
            complexity = Math.max(1, Math.round(decisions / Math.max(1, fns)));
            functions = (content.match(/\bfunction\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(|(?:app|router)\.\s*(?:get|post|put|delete|patch|all)\s*\(/g) || []).length;
            exports = (content.match(/\bexport\b/g) || []).length;
            imports = (content.match(/\bimport\b/g) || []).length;
            routeHandlers = (content.match(/\b(?:app|router)\.\s*(?:get|post|put|delete|patch|all)\s*\(/g) || []).length;
          }
          if ((cat === 'data' || cat === 'source') && lines > 10) {
            hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
            if (!hashes.has(hash)) hashes.set(hash, []);
            hashes.get(hash).push(rel);
          }
        }

        files.push({
          path: rel, full, lines, size: stat.size, ext, category: cat,
          content: (!isBin && stat.size < 500000) ? content : '',
          functions, exports, imports, routeHandlers, complexity,
          stale: (Date.now() - stat.mtimeMs) > THRESHOLDS.staleFileDays * 86400000,
          lastModified: stat.mtimeMs
        });
      } catch { /* skip */ }
    }
  }
  walk(rootDir);

  const duplicates = [];
  for (const [hash, paths] of hashes) {
    if (paths.length > 1) {
      const f = files.find(f => f.path === paths[0]);
      duplicates.push({ hash, files: paths, lines: (f?.lines || 0) * (paths.length - 1), wastedBytes: (f?.size || 0) * (paths.length - 1) });
    }
  }
  return { files, duplicates };
}

// ════════════════════════════════════════════════════════════════════
// MODULE 1: ARCHITECTURE (15%)
// File sizes, complexity, route distribution, duplication
// ════════════════════════════════════════════════════════════════════

function modArchitecture(rootDir, files, duplicates) {
  const issues = [];
  let score = 100;
  let n = 0;

  const source = files.filter(f => f.category === 'source');
  const staticCode = files.filter(f => f.category === 'static-code');
  const totalSrcLines = source.reduce((s, f) => s + f.lines, 0);

  for (const f of [...source, ...staticCode]) {
    // Tiered thresholds: backend source = strict, static CSS/JS = relaxed (game engines are large)
    const isCSS = f.path.endsWith('.css');
    const isJS = f.path.endsWith('.js');
    const isSrc = f.category === 'source';
    const limit = isSrc ? THRESHOLDS.maxFileLines
      : isCSS ? THRESHOLDS.maxStaticCSSLines
      : isJS ? THRESHOLDS.maxStaticJSLines
      : THRESHOLDS.maxFileLines;
    if (f.lines > limit) {
      const sev = f.lines > limit * 2 ? 'critical' : 'warning';
      issues.push({ id: `ARCH-${++n}`, severity: isSrc ? sev : 'warning', category: 'bloat', title: `${f.path}: ${f.lines} lines (limit ${limit})`, file: f.path, metric: f.lines, fix: `Split into ${Math.ceil(f.lines / limit)} files` });
      score -= isSrc ? (sev === 'critical' ? 8 : 3) : 1;
    }
    if (f.complexity > THRESHOLDS.maxComplexity && f.category === 'source') {
      const sev = f.complexity > THRESHOLDS.maxComplexity * 2 ? 'critical' : 'warning';
      issues.push({ id: `ARCH-${++n}`, severity: sev, category: 'complexity', title: `${f.path}: complexity ${f.complexity}/${THRESHOLDS.maxComplexity}`, file: f.path, metric: f.complexity, fix: 'Extract helper functions, reduce nesting' });
      score -= sev === 'critical' ? 8 : 3;
    }
    if (f.routeHandlers > THRESHOLDS.maxRouteHandlers) {
      issues.push({ id: `ARCH-${++n}`, severity: 'warning', category: 'architecture', title: `${f.path}: ${f.routeHandlers} routes (limit ${THRESHOLDS.maxRouteHandlers})`, file: f.path, metric: f.routeHandlers, fix: 'Extract route groups into domain modules' });
      score -= 3;
    }
  }

  for (const dup of duplicates) {
    issues.push({ id: `ARCH-${++n}`, severity: 'warning', category: 'duplication', title: `Duplicates: ${dup.files.join(' = ')}`, metric: dup.wastedBytes, fix: `Keep ${dup.files[0]}, remove others` });
    score -= 2;
  }

  const ratio = totalSrcLines / THRESHOLDS.maxTotalLines;
  if (ratio > 1.0) score -= Math.round((ratio - 1) * 20);
  else if (ratio > 0.8) score -= 3;

  return {
    name: 'architecture', score: clamp(score), issues,
    data: { sourceFiles: source.length, totalLines: totalSrcLines, budget: THRESHOLDS.maxTotalLines, budgetPercent: Math.round(ratio * 100), duplicateGroups: duplicates.length }
  };
}

// ════════════════════════════════════════════════════════════════════
// MODULE 2: ASSETS (15%)
// Image optimization, CSS/JS bloat, format audit
// ════════════════════════════════════════════════════════════════════

function modAssets(rootDir, files) {
  const issues = [];
  let score = 100;
  let n = 0;

  const images = files.filter(f => ['.webp', '.png', '.jpg', '.jpeg', '.gif'].includes(f.ext));
  const css = files.filter(f => f.ext === '.css' && f.category === 'static-code');
  const js = files.filter(f => f.ext === '.js' && f.category === 'static-code');

  let oversizedImages = 0, totalImageBytes = 0, nonWebpImages = 0;
  const maxImgBytes = THRESHOLDS.maxImageKB * 1024;

  for (const img of images) {
    totalImageBytes += img.size;
    if (img.size > maxImgBytes) {
      oversizedImages++;
      if (oversizedImages <= 10) {
        issues.push({ id: `ASSET-${++n}`, severity: img.size > maxImgBytes * 4 ? 'critical' : 'warning', category: 'image-size', title: `${img.path}: ${Math.round(img.size / 1024)}KB (limit ${THRESHOLDS.maxImageKB}KB)`, file: img.path, metric: img.size, fix: `Compress to <${THRESHOLDS.maxImageKB}KB or use lower resolution` });
      }
    }
    if (['.png', '.jpg', '.jpeg', '.gif'].includes(img.ext)) {
      nonWebpImages++;
    }
  }
  if (oversizedImages > 10) {
    issues.push({ id: `ASSET-${++n}`, severity: 'warning', category: 'image-size', title: `${oversizedImages - 10} more oversized images (not listed)`, metric: oversizedImages - 10, fix: 'Run batch image optimization' });
  }
  if (nonWebpImages > 0) {
    issues.push({ id: `ASSET-${++n}`, severity: 'info', category: 'image-format', title: `${nonWebpImages} images not in WebP format`, metric: nonWebpImages, fix: 'Convert PNG/JPG to WebP for ~30% smaller files' });
  }

  score -= Math.min(40, oversizedImages * 0.6);
  score -= Math.min(10, nonWebpImages * 0.3);

  let oversizedCSS = 0;
  for (const c of css) {
    if (c.lines > THRESHOLDS.maxCSSLines) {
      oversizedCSS++;
      if (oversizedCSS <= 5) {
        issues.push({ id: `ASSET-${++n}`, severity: 'warning', category: 'css-bloat', title: `${c.path}: ${c.lines} lines (limit ${THRESHOLDS.maxCSSLines})`, file: c.path, metric: c.lines, fix: 'Split by component/page or purge unused rules' });
      }
    }
  }
  score -= Math.min(15, oversizedCSS * 2);

  let oversizedJS = 0;
  for (const j of js) {
    if (j.lines > THRESHOLDS.maxJSLines) {
      oversizedJS++;
      if (oversizedJS <= 5) {
        issues.push({ id: `ASSET-${++n}`, severity: 'warning', category: 'js-bloat', title: `${j.path}: ${j.lines} lines (limit ${THRESHOLDS.maxJSLines})`, file: j.path, metric: j.lines, fix: 'Split into lazy-loaded modules' });
      }
    }
  }
  score -= Math.min(15, oversizedJS * 2);

  return {
    name: 'assets', score: clamp(score), issues,
    data: {
      images: { total: images.length, oversized: oversizedImages, nonWebp: nonWebpImages, totalMB: Math.round(totalImageBytes / 1048576 * 10) / 10 },
      css: { files: css.length, totalLines: css.reduce((s, f) => s + f.lines, 0), oversized: oversizedCSS },
      js: { files: js.length, totalLines: js.reduce((s, f) => s + f.lines, 0), oversized: oversizedJS }
    }
  };
}

// ════════════════════════════════════════════════════════════════════
// MODULE 3: i18n COVERAGE (10%)
// Checks: [ZH]/[TH] placeholders, missing keys per language, dual systems, hardcoded strings
// ════════════════════════════════════════════════════════════════════

function modI18n(rootDir, files) {
  const issues = [];
  let score = 100;
  let n = 0;
  const LANGS = ['en', 'zh', 'th'];

  const publicDir = path.join(rootDir, 'public');
  const pages = [];
  let totalPages = 0, withScript = 0, withRegister = 0;
  let totalKeys = 0, keysTranslated = 0, hardcoded = 0;
  let totalPlaceholders = 0, totalDualSystems = 0, totalMissingKeys = 0;

  // Recursively find HTML files in public/
  function findHtml(dir, prefix) {
    let results = [];
    try {
      for (const f of fs.readdirSync(dir)) {
        const fp = path.join(dir, f);
        const rel = prefix ? prefix + '/' + f : f;
        if (fs.statSync(fp).isDirectory() && !IGNORE.includes(f)) {
          results = results.concat(findHtml(fp, rel));
        } else if (f.endsWith('.html')) {
          results.push({ abs: fp, rel });
        }
      }
    } catch {}
    return results;
  }

  const htmlFiles = findHtml(publicDir, '');

  for (const { abs: filePath, rel: fname } of htmlFiles) {
    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }
    totalPages++;
    const hasScript = content.includes('nw-i18n-core');
    const hasReg = content.includes('NW_I18N.register');
    if (hasScript) withScript++;
    if (hasReg) withRegister++;

    // Count data-i18n keys
    const i18nMatches = content.match(/data-i18n(?:-html)?=["']([^"']+)["']/g) || [];
    const keys = i18nMatches.length;
    const keyNames = i18nMatches.map(m => m.replace(/data-i18n(?:-html)?=["']/, '').replace(/["']$/, ''));
    totalKeys += keys;

    // CHECK 1: [ZH]/[TH] placeholder markers — these are untranslated
    const zhPlaceholders = (content.match(/\[ZH\]/g) || []).length;
    const thPlaceholders = (content.match(/\[TH\]/g) || []).length;
    const placeholders = zhPlaceholders + thPlaceholders;
    totalPlaceholders += placeholders;

    // CHECK 2: Dual i18n systems (multiple translation objects/functions)
    const i18nSystems = [];
    if (hasReg) i18nSystems.push('NW_I18N.register');
    if (content.includes('applyTranslations')) i18nSystems.push('applyTranslations');
    const constI18nMatches = content.match(/const\s+\w+(?:_I18N|Translations|_TRANSLATIONS)\s*=/gi) || [];
    for (const cm of constI18nMatches) i18nSystems.push(cm.trim().replace(/\s*=\s*$/, ''));
    const dualSystem = i18nSystems.length > 2; // register + 1 const is fine; more is conflict
    if (dualSystem) totalDualSystems++;

    // CHECK 3: Missing translation keys — extract keys from each lang block
    let missingKeys = 0;
    if (hasReg) {
      // Count keys per language block (rough but catches major gaps)
      const langKeyCounts = {};
      for (const lang of LANGS) {
        const rx = new RegExp(`['"]${lang}['"]\\s*:\\s*\\{([^}]*(?:\\{[^}]*\\}[^}]*)*)\\}`, 'g');
        let lm;
        let maxKeys = 0;
        while ((lm = rx.exec(content)) !== null) {
          const block = lm[1];
          const kc = (block.match(/['"][^'"]+['"]\s*:/g) || []).length;
          maxKeys += kc;
        }
        langKeyCounts[lang] = maxKeys;
      }
      const enKeys = langKeyCounts.en || 0;
      const zhKeys = langKeyCounts.zh || 0;
      const thKeys = langKeyCounts.th || 0;
      if (enKeys > 0) {
        missingKeys = Math.max(0, enKeys - zhKeys) + Math.max(0, enKeys - thKeys);
      }
    }
    totalMissingKeys += missingKeys;

    // Count keys as translated only if no placeholders and no major gaps
    if (hasReg && placeholders === 0 && missingKeys < 3) keysTranslated += keys;

    // Hardcoded string detection (text without data-i18n)
    let hc = 0;
    const rx = />([^<]{4,120})</g;
    let m;
    while ((m = rx.exec(content)) !== null) {
      const t = m[1].trim();
      if (/^[A-Z][a-z]+(?: [a-zA-Z]+)+/.test(t) && !/[{}();\[\]=<>]/.test(t) && t.length < 200) {
        const before = content.slice(Math.max(0, m.index - 200), m.index);
        if (!before.includes('data-i18n')) hc++;
      }
    }
    hardcoded += hc;

    const status = placeholders > 0 ? 'has-placeholders' :
                   dualSystem ? 'dual-system' :
                   hasReg && missingKeys === 0 ? 'translated' :
                   hasReg && missingKeys > 0 ? 'partial' :
                   hasScript && keys > 0 ? 'keys-only' : 'none';

    pages.push({ page: fname, status, hasScript, hasRegister: hasReg, keys, langs: LANGS.filter(l => new RegExp(`['"]${l}['"]\\s*:`).test(content)), hardcoded: hc, placeholders, dualSystem, missingKeys });
  }

  // Scoring: start at coverage%, then penalize real problems
  const coveragePct = totalPages > 0 ? Math.round(withRegister / totalPages * 100) : 0;
  score = coveragePct;

  // Heavy penalties for real broken translations
  if (totalPlaceholders > 0) score -= Math.min(30, Math.round(totalPlaceholders / 50));
  if (totalDualSystems > 0) score -= Math.min(15, totalDualSystems * 2);
  if (totalMissingKeys > 20) score -= Math.min(15, Math.round(totalMissingKeys / 10));
  if (hardcoded > 50) score -= Math.min(10, Math.round((hardcoded - 50) / 20));

  // Issue reporting: group by category for actionable output
  if (totalPlaceholders > 0) {
    const placeholderPages = pages.filter(p => p.placeholders > 0).sort((a, b) => b.placeholders - a.placeholders);
    issues.push({ id: `I18N-${++n}`, severity: 'critical', category: 'i18n',
      title: `${totalPlaceholders} [ZH]/[TH] placeholder strings across ${placeholderPages.length} pages — users see untranslated text`,
      metric: totalPlaceholders,
      fix: `Top offenders: ${placeholderPages.slice(0, 5).map(p => p.page + '(' + p.placeholders + ')').join(', ')}`
    });
  }

  if (totalDualSystems > 0) {
    const dualPages = pages.filter(p => p.dualSystem);
    issues.push({ id: `I18N-${++n}`, severity: 'warning', category: 'i18n',
      title: `${totalDualSystems} pages have conflicting i18n systems — translations fight each other`,
      metric: totalDualSystems,
      fix: `Merge into single NW_I18N.register(): ${dualPages.slice(0, 5).map(p => p.page).join(', ')}`
    });
  }

  const untranslated = pages.filter(p => p.status !== 'translated');
  if (untranslated.length > 0) {
    issues.push({ id: `I18N-${++n}`, severity: 'warning', category: 'i18n',
      title: `${untranslated.length}/${totalPages} pages not fully translated`,
      metric: untranslated.length
    });
  }

  return {
    name: 'i18n', score: clamp(score), issues,
    data: {
      summary: { totalPages, withScript, withRegister, coveragePct, totalKeys, keysTranslated, hardcoded, placeholders: totalPlaceholders, dualSystems: totalDualSystems, missingKeys: totalMissingKeys, grade: gradeFromScore(clamp(score)) },
      pages: pages.sort((a, b) => (b.placeholders + b.missingKeys) - (a.placeholders + a.missingKeys))
    }
  };
}

// ════════════════════════════════════════════════════════════════════
// MODULE 4: DEAD CODE (10%)
// Unused exports, orphan pages, unreferenced files
// ════════════════════════════════════════════════════════════════════

function modDeadCode(rootDir, files) {
  const issues = [];
  let score = 100;
  let n = 0;

  const source = files.filter(f => f.category === 'source');
  const pages = files.filter(f => f.category === 'page');

  const services = source.filter(f => f.path.includes('services/'));

  const unusedFiles = [];
  for (const svc of services) {
    const basename = path.basename(svc.path, '.ts');
    const importPattern = new RegExp(`from\\s+['"]\\.*/.*${basename.replace(/-/g, '[-/]')}`, 'g');
    const isImported = source.some(f => f.path !== svc.path && importPattern.test(f.content));
    if (!isImported && svc.exports > 0) {
      unusedFiles.push(svc.path);
      if (unusedFiles.length <= 10) {
        issues.push({ id: `DEAD-${++n}`, severity: 'info', category: 'unused-module', title: `${svc.path}: ${svc.exports} exports, 0 imports found`, file: svc.path, metric: svc.lines, fix: 'Verify usage; remove if truly dead code' });
      }
    }
  }

  const orphanPages = [];
  for (const page of pages) {
    const pageName = path.basename(page.path, '.html');
    if (pageName === 'index') continue;
    const isReferenced = files.some(f => {
      if (f.path === page.path) return false;
      if (!f.content) return false;
      return f.content.includes(pageName + '.html') || f.content.includes(`'/${pageName}'`) || f.content.includes(`"/${pageName}"`);
    });
    if (!isReferenced) {
      orphanPages.push(page.path);
    }
  }
  if (orphanPages.length > 0 && orphanPages.length <= 10) {
    orphanPages.forEach(p => {
      issues.push({ id: `DEAD-${++n}`, severity: 'info', category: 'orphan-page', title: `${p}: no references found`, file: p, fix: 'Add to navigation or remove if unused' });
    });
  } else if (orphanPages.length > 10) {
    issues.push({ id: `DEAD-${++n}`, severity: 'info', category: 'orphan-page', title: `${orphanPages.length} potentially orphaned HTML pages`, metric: orphanPages.length, fix: 'Audit page inventory; link or remove unused pages' });
  }

  const tinyFiles = source.filter(f => f.lines > 0 && f.lines < 5 && f.exports === 0);
  if (tinyFiles.length > 0) {
    issues.push({ id: `DEAD-${++n}`, severity: 'info', category: 'tiny-file', title: `${tinyFiles.length} source files under 5 lines with no exports`, metric: tinyFiles.length, fix: 'Merge into parent module or remove' });
  }

  score -= Math.min(20, unusedFiles.length * 2);
  score -= Math.min(15, orphanPages.length * 0.5);
  score -= Math.min(5, tinyFiles.length * 1);

  return {
    name: 'deadCode', score: clamp(score), issues,
    data: { unusedModules: unusedFiles, orphanPages, tinyFiles: tinyFiles.map(f => f.path) }
  };
}

// ════════════════════════════════════════════════════════════════════
// MODULE 5: SECURITY (15%)
// Exposed secrets, unsafe patterns, missing headers
// ════════════════════════════════════════════════════════════════════

function modSecurity(rootDir, files) {
  const issues = [];
  let score = 100;
  let n = 0;

  // Only scan source code, config, and static JS/CSS — NOT HTML pages (lore text causes false positives)
  const scannable = files.filter(f => f.content && (f.category === 'source' || f.category === 'static-code' || f.category === 'config'));

  // 1. Exposed secrets
  const secretPatterns = [
    { rx: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9_-]{20,}['"]/gi, label: 'API key' },
    { rx: /(?:secret|token|password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi, label: 'Secret/Token' },
    { rx: /sk[-_][a-zA-Z0-9]{20,}/g, label: 'Stripe-like secret key' },
    { rx: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g, label: 'Private key' },
    { rx: /ghp_[A-Za-z0-9]{36}/g, label: 'GitHub token' },
    { rx: /AWS[A-Z0-9]{16,}/g, label: 'AWS key' },
    { rx: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, label: 'JWT token' },
  ];

  let secretCount = 0;
  for (const f of scannable) {
    if (f.path.includes('.env') || f.path.includes('wrangler')) continue;
    for (const pat of secretPatterns) {
      const matches = f.content.match(pat.rx) || [];
      for (const m of matches) {
        if (/your[_-]?|example|placeholder|xxx|test|TODO|CHANGEME|mock|fake|sample|lol|lore|wifi|secret-box|dive-card/i.test(m)) continue;
        // Skip CSS class names and HTML attributes
        if (/class=|className|\.|#|{|}/i.test(m)) continue;
        if (/process\.env|c\.env|env\./i.test(f.content.slice(Math.max(0, f.content.indexOf(m) - 50), f.content.indexOf(m)))) continue;
        secretCount++;
        if (secretCount <= 5) {
          issues.push({ id: `SEC-${++n}`, severity: 'critical', category: 'exposed-secret', title: `Potential ${pat.label} in ${f.path}`, file: f.path, fix: 'Move to environment variables' });
        }
      }
    }
  }

  // 2. Unsafe patterns (expanded)
  let unsafeCount = 0;
  const unsafePatterns = [
    { rx: /eval\s*\(/g, label: 'eval() usage', sev: 'critical' },
    { rx: /innerHTML\s*=/g, label: 'innerHTML assignment (XSS risk)', sev: 'warning' },
    { rx: /document\.write\s*\(/g, label: 'document.write()', sev: 'warning' },
    { rx: /new\s+Function\s*\(/g, label: 'new Function() (code injection)', sev: 'critical' },
    { rx: /\.outerHTML\s*=/g, label: 'outerHTML assignment', sev: 'warning' },
  ];
  for (const f of scannable) {
    if (f.category !== 'source') continue;
    for (const pat of unsafePatterns) {
      const count = (f.content.match(pat.rx) || []).length;
      if (count > 0) {
        unsafeCount += count;
        if (unsafeCount <= 5) {
          issues.push({ id: `SEC-${++n}`, severity: pat.sev || 'warning', category: 'unsafe-pattern', title: `${pat.label} in ${f.path} (${count}x)`, file: f.path, metric: count, fix: 'Use safe alternatives (textContent, DOM API)' });
        }
      }
    }
  }

  // 3. Missing security headers
  const routeFiles = files.filter(f => f.path.includes('routes/') && f.category === 'source');
  const allRouteContent = routeFiles.map(f => f.content).join('\n');
  const hasCSP = /content-security-policy/i.test(allRouteContent);
  const hasCORS = /access-control|cors/i.test(allRouteContent);
  const hasHSTS = /strict-transport-security/i.test(allRouteContent);
  const hasXFrame = /x-frame-options/i.test(allRouteContent);
  const hasXContent = /x-content-type-options/i.test(allRouteContent);
  
  const missingHeaders = [];
  if (!hasCSP) missingHeaders.push('Content-Security-Policy');
  if (!hasHSTS) missingHeaders.push('Strict-Transport-Security');
  if (!hasXFrame) missingHeaders.push('X-Frame-Options');
  if (!hasXContent) missingHeaders.push('X-Content-Type-Options');
  
  if (missingHeaders.length > 0) {
    issues.push({ id: `SEC-${++n}`, severity: 'info', category: 'missing-header', title: `Missing security headers: ${missingHeaders.join(', ')}`, fix: 'Add security headers middleware to Hono app' });
    score -= missingHeaders.length * 2;
  }

  // 4. SQL injection risk (unparameterized queries)
  let sqlRisk = 0;
  for (const f of scannable) {
    if (f.category !== 'source') continue;
    // Detect template literals in SQL-like patterns
    const sqlConcat = (f.content.match(/\.(?:prepare|exec|run)\s*\(\s*`[^`]*\$\{/g) || []);
    for (const match of sqlConcat) {
      // Check if .bind() follows (safe parameterized pattern)
      const matchIdx = f.content.indexOf(match);
      const after = f.content.slice(matchIdx, matchIdx + 500);
      if (/\.bind\s*\(/.test(after)) continue; // Safe: uses .bind()
      if (/\.join\s*\(\s*['"],\s?['"]\)/.test(match)) continue; // Safe: column whitelist join
      sqlRisk++;
      if (sqlRisk <= 3) {
        issues.push({ id: `SEC-${++n}`, severity: 'warning', category: 'sql-injection', title: `Potential SQL injection in ${f.path} (template literal in query without .bind())`, file: f.path, metric: 1, fix: 'Use parameterized queries with .bind()' });
      }
    }
  }

  score -= secretCount * 15;
  score -= Math.min(15, unsafeCount * 3);
  score -= Math.min(10, sqlRisk * 5);

  return {
    name: 'security', score: clamp(score), issues,
    data: { exposedSecrets: secretCount, unsafePatterns: unsafeCount, sqlInjectionRisks: sqlRisk, headers: { hasCSP, hasCORS, hasHSTS, hasXFrame, hasXContent }, missingHeaders }
  };
}

// ════════════════════════════════════════════════════════════════════
// MODULE 6: PERFORMANCE (10%)
// Bundle size, dependency count, page weight budgets
// ════════════════════════════════════════════════════════════════════

function modPerformance(rootDir, files) {
  const issues = [];
  let score = 100;
  let n = 0;

  // 1. Bundle size
  let bundleKB = 0;
  try {
    const workerPath = path.join(rootDir, 'dist', '_worker.js');
    const stat = fs.statSync(workerPath);
    bundleKB = Math.round(stat.size / 1024);
  } catch { /* no bundle yet */ }

  if (bundleKB > THRESHOLDS.maxBundleKB) {
    issues.push({ id: `PERF-${++n}`, severity: 'warning', category: 'bundle-size', title: `Bundle: ${bundleKB}KB (limit ${THRESHOLDS.maxBundleKB}KB)`, metric: bundleKB, fix: 'Tree-shake unused code, lazy-load routes' });
    score -= Math.min(20, Math.round((bundleKB - THRESHOLDS.maxBundleKB) / 50) * 5);
  }

  // 2. Dependency count
  let deps = 0, devDeps = 0;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    deps = Object.keys(pkg.dependencies || {}).length;
    devDeps = Object.keys(pkg.devDependencies || {}).length;
  } catch {}

  if (deps + devDeps > THRESHOLDS.maxDependencies) {
    issues.push({ id: `PERF-${++n}`, severity: 'info', category: 'dependencies', title: `${deps + devDeps} dependencies (limit ${THRESHOLDS.maxDependencies})`, metric: deps + devDeps, fix: 'Audit with npm ls; remove unused packages' });
    score -= 5;
  }

  // 3. Page weight estimates
  const pages = files.filter(f => f.category === 'page');
  const heavyPages = [];
  const totalPublicMB = Math.round(files.filter(f => f.path.startsWith('public/')).reduce((s, f) => s + f.size, 0) / 1048576);

  for (const page of pages) {
    if (!page.content) continue;
    const imgRefs = (page.content.match(/\.webp|\.png|\.jpg/g) || []).length;
    const scriptRefs = (page.content.match(/<script\s/g) || []).length;
    const cssRefs = (page.content.match(/<link[^>]+\.css/g) || []).length;
    const estWeightMB = imgRefs * 0.3 + scriptRefs * 0.05 + cssRefs * 0.02;
    if (estWeightMB > THRESHOLDS.maxPageWeightMB) {
      heavyPages.push({ page: page.path, imgRefs, scriptRefs, cssRefs, estMB: Math.round(estWeightMB * 10) / 10 });
    }
  }
  if (heavyPages.length > 0) {
    issues.push({ id: `PERF-${++n}`, severity: 'info', category: 'page-weight', title: `${heavyPages.length} pages exceed ${THRESHOLDS.maxPageWeightMB}MB estimated weight`, metric: heavyPages.length, fix: 'Lazy-load images, use loading="lazy" attribute' });
    score -= Math.min(10, heavyPages.length * 2);
  }

  // 4. Missing lazy loading
  const pagesWithoutLazy = pages.filter(p => p.content && p.content.includes('<img') && !p.content.includes('loading="lazy"'));
  if (pagesWithoutLazy.length > 5) {
    issues.push({ id: `PERF-${++n}`, severity: 'info', category: 'lazy-load', title: `${pagesWithoutLazy.length} pages have images without loading="lazy"`, metric: pagesWithoutLazy.length, fix: 'Add loading="lazy" to below-fold images' });
    score -= Math.min(10, pagesWithoutLazy.length);
  }

  // 5. Render-blocking resources
  let renderBlocking = 0;
  for (const page of pages) {
    if (!page.content) continue;
    // Scripts in <head> without async/defer
    const headMatch = page.content.match(/<head[\s\S]*?<\/head>/i);
    if (headMatch) {
      const headScripts = (headMatch[0].match(/<script\s+src=/g) || []).length;
      const asyncDefer = (headMatch[0].match(/<script\s+(?:async|defer)/g) || []).length;
      renderBlocking += Math.max(0, headScripts - asyncDefer);
    }
  }
  if (renderBlocking > 5) {
    issues.push({ id: `PERF-${++n}`, severity: 'info', category: 'render-blocking', title: `${renderBlocking} render-blocking scripts in <head> across pages`, metric: renderBlocking, fix: 'Add async or defer attribute to non-critical scripts' });
    score -= Math.min(10, renderBlocking);
  }

  return {
    name: 'performance', score: clamp(score), issues,
    data: { bundleKB, deps, devDeps, totalPublicMB, heavyPages: heavyPages.slice(0, 10), pagesWithoutLazy: pagesWithoutLazy.length, renderBlocking }
  };
}

// ════════════════════════════════════════════════════════════════════
// MODULE 7: API SURFACE (8%)
// Endpoint inventory, error handling, consistency
// ════════════════════════════════════════════════════════════════════

function modApiSurface(rootDir, files) {
  const issues = [];
  let score = 100;
  let n = 0;

  const routeFiles = files.filter(f => f.path.includes('routes/') && f.category === 'source');
  
  // Build endpoint inventory
  const endpoints = [];
  const methodCounts = { get: 0, post: 0, put: 0, delete: 0, patch: 0, all: 0 };
  
  for (const rf of routeFiles) {
    const rx = /\b(?:app|router)\.\s*(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let m;
    while ((m = rx.exec(rf.content)) !== null) {
      const method = m[1].toUpperCase();
      const routePath = m[2];
      methodCounts[m[1]] = (methodCounts[m[1]] || 0) + 1;
      endpoints.push({ method, path: routePath, file: rf.path });
    }
  }

  // 1. Check for error handling coverage
  let routesWithTryCatch = 0;
  let routesWithJsonError = 0;
  for (const rf of routeFiles) {
    if (/try\s*\{/.test(rf.content)) routesWithTryCatch++;
    if (/jsonError|json\(\s*\{[^}]*error/i.test(rf.content)) routesWithJsonError++;
  }
  
  const errorCoveragePct = routeFiles.length > 0 ? Math.round(routesWithJsonError / routeFiles.length * 100) : 100;
  if (errorCoveragePct < 80) {
    issues.push({ id: `API-${++n}`, severity: 'warning', category: 'error-handling', title: `Only ${errorCoveragePct}% of route files have error responses`, metric: errorCoveragePct, fix: 'Add jsonError() or error JSON responses to all route handlers' });
    score -= Math.round((80 - errorCoveragePct) / 5);
  }

  // 2. Check for input validation
  let routesWithValidation = 0;
  for (const rf of routeFiles) {
    if (/typeof\s|\.trim\(\)|\.length|!.*\w+\s*\|\||required/i.test(rf.content)) routesWithValidation++;
  }
  const validationPct = routeFiles.length > 0 ? Math.round(routesWithValidation / routeFiles.length * 100) : 100;
  if (validationPct < 60) {
    issues.push({ id: `API-${++n}`, severity: 'info', category: 'validation', title: `Only ${validationPct}% of route files have input validation`, metric: validationPct, fix: 'Add input validation to POST/PUT handlers' });
    score -= 5;
  }

  // 3. Check for consistent response format
  let inconsistentRoutes = 0;
  for (const rf of routeFiles) {
    const hasJson = /c\.json\(/.test(rf.content);
    const hasText = /c\.text\(/.test(rf.content);
    const hasHtml = /c\.html\(/.test(rf.content);
    const formats = [hasJson, hasText, hasHtml].filter(Boolean).length;
    if (formats > 1 && rf.path !== 'src/routes/pages.ts') {
      inconsistentRoutes++;
    }
  }
  if (inconsistentRoutes > 3) {
    issues.push({ id: `API-${++n}`, severity: 'info', category: 'consistency', title: `${inconsistentRoutes} route files mix response formats (json/text/html)`, metric: inconsistentRoutes, fix: 'Standardize on JSON for API routes' });
    score -= 3;
  }

  // 4. Duplicate endpoint paths (only flag true duplicates - same full path in same mount scope)
  // Routes like /stats, /history are expected across different route modules mounted at different prefixes
  const pathMap = new Map();
  for (const ep of endpoints) {
    const key = `${ep.method} ${ep.path}`;
    if (!pathMap.has(key)) pathMap.set(key, []);
    pathMap.get(key).push(ep.file);
  }
  let duplicateEndpoints = 0;
  // Common short routes expected across different modules (mounted under different prefixes)
  // Routes that are legitimately defined in multiple modules (each mounted at different API prefix)
  // e.g. GET /listings in auction.ts (/api/auction/listings) vs market.ts (/api/market/listings)
  const commonSubRoutes = new Set([
    '/', '/stats', '/history', '/search', '/list', '/active', '/leaderboard',
    '/listings', '/health', '/status', '/config', '/info',
    '/:id', '/:name', '/:slug',
    '/create', '/update', '/delete', '/export', '/import',
    '/batch', '/bulk', '/sync', '/verify', '/validate',
    '/recent', '/popular', '/featured', '/random', '/count'
  ]);
  for (const [key, routeFileList] of pathMap) {
    if (routeFileList.length > 1) {
      const routePath = key.split(' ')[1];
      // Skip common sub-routes that are expected in different modules
      if (commonSubRoutes.has(routePath)) continue;
      duplicateEndpoints++;
      if (duplicateEndpoints <= 3) {
        issues.push({ id: `API-${++n}`, severity: 'warning', category: 'duplicate-route', title: `${key} defined in multiple files: ${routeFileList.join(', ')}`, fix: 'Consolidate into single route handler' });
      }
    }
  }
  score -= duplicateEndpoints * 3;

  // 5. Rate limiting coverage (for POST endpoints)
  const postRoutes = routeFiles.filter(f => /router\.\s*post\s*\(/i.test(f.content));
  const rateLimited = postRoutes.filter(f => /rate|throttle|limit/i.test(f.content));
  if (postRoutes.length > 0 && rateLimited.length < postRoutes.length / 2) {
    issues.push({ id: `API-${++n}`, severity: 'info', category: 'rate-limiting', title: `${rateLimited.length}/${postRoutes.length} POST route files have rate limiting`, metric: rateLimited.length, fix: 'Add rate limiting to mutation endpoints' });
    score -= 5;
  }

  return {
    name: 'apiSurface', score: clamp(score), issues,
    data: {
      totalEndpoints: endpoints.length,
      methods: methodCounts,
      routeFiles: routeFiles.length,
      errorCoveragePct,
      validationPct,
      duplicateEndpoints,
      rateLimitedRoutes: rateLimited ? rateLimited.length : 0,
      endpoints: endpoints.slice(0, 50)
    }
  };
}

// ════════════════════════════════════════════════════════════════════
// MODULE 8: DEPENDENCIES (7%)
// Unused deps, type/runtime mismatch, audit
// ════════════════════════════════════════════════════════════════════

function modDependencies(rootDir, files) {
  const issues = [];
  let score = 100;
  let n = 0;

  let pkg = {};
  try { pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')); } catch {}

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const depNames = Object.keys(allDeps);
  const prodDeps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});

  // Gather all source content for import checking
  const sourceContent = files
    .filter(f => f.category === 'source' || f.category === 'config' || f.category === 'static-code')
    .map(f => f.content)
    .join('\n');

  // 1. Unused dependencies (not imported anywhere)
  const unusedDeps = [];
  for (const dep of depNames) {
    const depName = dep.startsWith('@') ? dep : dep.split('/')[0];
    // Check both import statements and require() calls
    const isUsed = sourceContent.includes(`'${depName}'`) || 
                   sourceContent.includes(`"${depName}"`) ||
                   sourceContent.includes(`from '${depName}`) ||
                   sourceContent.includes(`from "${depName}`) ||
                   sourceContent.includes(`require('${depName}`) ||
                   sourceContent.includes(`require("${depName}`);
    // Also check configs (vite.config, etc.)
    const configFiles = files.filter(f => f.path.includes('config') || f.path.includes('vite'));
    const inConfig = configFiles.some(f => f.content && (f.content.includes(depName)));
    
    if (!isUsed && !inConfig) {
      unusedDeps.push(dep);
    }
  }

  if (unusedDeps.length > 0) {
    issues.push({ id: `DEP-${++n}`, severity: 'warning', category: 'unused-dep', title: `${unusedDeps.length} potentially unused dependencies: ${unusedDeps.slice(0, 5).join(', ')}${unusedDeps.length > 5 ? '...' : ''}`, metric: unusedDeps.length, fix: `npm uninstall ${unusedDeps.join(' ')}` });
    score -= Math.min(20, unusedDeps.length * 4);
  }

  // 2. @types packages in production dependencies (should be devDeps)
  const typesInProd = prodDeps.filter(d => d.startsWith('@types/'));
  if (typesInProd.length > 0) {
    issues.push({ id: `DEP-${++n}`, severity: 'warning', category: 'dep-misplace', title: `${typesInProd.length} @types packages in dependencies (should be devDependencies): ${typesInProd.join(', ')}`, metric: typesInProd.length, fix: `npm install --save-dev ${typesInProd.join(' ')} && npm uninstall ${typesInProd.join(' ')}` });
    score -= typesInProd.length * 5;
  }

  // 3. Pinned vs range versions
  let pinnedCount = 0, rangeCount = 0;
  for (const [, version] of Object.entries(allDeps)) {
    if (typeof version !== 'string') continue;
    if (version.startsWith('^') || version.startsWith('~')) rangeCount++;
    else if (/^\d/.test(version)) pinnedCount++;
  }
  
  // Having all ranges is fine for apps; note but don't penalize heavily
  if (pinnedCount === 0 && depNames.length > 5) {
    issues.push({ id: `DEP-${++n}`, severity: 'info', category: 'dep-versions', title: 'All dependencies use semver ranges; consider pinning critical deps', fix: 'Pin versions for production stability (remove ^ or ~)' });
  }

  // 4. Check for lock file
  const hasLockFile = files.some(f => f.path === 'package-lock.json' || f.path === 'yarn.lock' || f.path === 'pnpm-lock.yaml');
  // Lock file is typically in ignore list, so check filesystem directly
  let lockExists = false;
  try { lockExists = fs.existsSync(path.join(rootDir, 'package-lock.json')) || fs.existsSync(path.join(rootDir, 'yarn.lock')); } catch {}
  
  if (!lockExists) {
    issues.push({ id: `DEP-${++n}`, severity: 'warning', category: 'no-lockfile', title: 'No package lock file found', fix: 'Run npm install to generate package-lock.json' });
    score -= 10;
  }

  return {
    name: 'dependencies', score: clamp(score), issues,
    data: {
      total: depNames.length,
      production: prodDeps.length,
      dev: devDeps.length,
      unused: unusedDeps,
      typesInProd: typesInProd,
      pinned: pinnedCount,
      ranged: rangeCount,
      hasLockFile: lockExists
    }
  };
}

// ════════════════════════════════════════════════════════════════════
// MODULE 9: ACCESSIBILITY (5%)
// ARIA, alt tags, semantic HTML, form labels
// ════════════════════════════════════════════════════════════════════

function modAccessibility(rootDir, files) {
  const issues = [];
  let score = 100;
  let n = 0;

  const pages = files.filter(f => f.category === 'page' && f.content);
  const totalPages = pages.length;
  if (totalPages === 0) return { name: 'accessibility', score: 100, issues: [], data: {} };

  let pagesWithH1 = 0, pagesWithMain = 0, pagesWithNav = 0;
  let pagesWithAria = 0, pagesWithSkipLink = 0;
  let imgTotal = 0, imgWithAlt = 0, imgWithoutAlt = 0;
  let formsTotal = 0, formsWithLabels = 0;
  let tabindexIssues = 0;
  const pageDetails = [];

  for (const page of pages) {
    const c = page.content;
    const hasH1 = /<h1[\s>]/i.test(c);
    const hasMain = /<main[\s>]/i.test(c);
    const hasNav = /<nav[\s>]/i.test(c);
    const hasAria = /aria-/i.test(c);
    const hasSkipLink = /skip.*nav|skip.*content|skiplink/i.test(c);
    const hasLang = /<html[^>]*lang=/i.test(c);

    if (hasH1) pagesWithH1++;
    if (hasMain) pagesWithMain++;
    if (hasNav) pagesWithNav++;
    if (hasAria) pagesWithAria++;
    if (hasSkipLink) pagesWithSkipLink++;

    // Image alt text
    const imgs = c.match(/<img\s[^>]*>/gi) || [];
    let pageImgNoAlt = 0;
    for (const img of imgs) {
      imgTotal++;
      if (/alt\s*=\s*["']/.test(img)) {
        imgWithAlt++;
        // Check for empty alt (decorative is OK, but flag if many)
        if (/alt\s*=\s*["']\s*["']/.test(img)) { /* decorative - ok */ }
      } else {
        imgWithoutAlt++;
        pageImgNoAlt++;
      }
    }

    // Form labels
    const formInputs = (c.match(/<input\s/gi) || []).length + (c.match(/<textarea\s/gi) || []).length + (c.match(/<select\s/gi) || []).length;
    const labelTags = (c.match(/<label[\s>]/gi) || []).length;
    const ariaLabels = (c.match(/aria-label/gi) || []).length;
    formsTotal += formInputs;
    formsWithLabels += Math.min(formInputs, labelTags + ariaLabels);

    // Negative tabindex (traps keyboard users)
    const negTabindex = (c.match(/tabindex\s*=\s*["']-\d+["']/g) || []).length;
    tabindexIssues += negTabindex;

    const pageName = path.basename(page.path, '.html');
    let pageIssues = 0;
    if (!hasH1) pageIssues++;
    if (!hasMain) pageIssues++;
    if (!hasLang) pageIssues++;
    if (pageImgNoAlt > 0) pageIssues += pageImgNoAlt;

    pageDetails.push({ page: page.path, hasH1, hasMain, hasNav, hasAria, hasLang, hasSkipLink, imgWithoutAlt: pageImgNoAlt, issues: pageIssues });
  }

  // Scoring
  const h1Pct = Math.round(pagesWithH1 / totalPages * 100);
  const mainPct = Math.round(pagesWithMain / totalPages * 100);
  const altPct = imgTotal > 0 ? Math.round(imgWithAlt / imgTotal * 100) : 100;
  const ariaPct = Math.round(pagesWithAria / totalPages * 100);

  // Deductions
  if (h1Pct < 80) {
    issues.push({ id: `A11Y-${++n}`, severity: 'warning', category: 'semantic-html', title: `Only ${h1Pct}% of pages have <h1> (${pagesWithH1}/${totalPages})`, metric: pagesWithH1, fix: 'Add <h1> heading to each page for screen readers and SEO' });
    score -= Math.round((80 - h1Pct) / 10);
  }
  if (mainPct < 50) {
    issues.push({ id: `A11Y-${++n}`, severity: 'info', category: 'semantic-html', title: `Only ${mainPct}% of pages use <main> landmark (${pagesWithMain}/${totalPages})`, metric: pagesWithMain, fix: 'Wrap primary content in <main> for accessibility' });
    score -= Math.round((50 - mainPct) / 10);
  }
  if (imgWithoutAlt > 0) {
    const sev = imgWithoutAlt > 10 ? 'warning' : 'info';
    issues.push({ id: `A11Y-${++n}`, severity: sev, category: 'alt-text', title: `${imgWithoutAlt} images missing alt attribute (${altPct}% have alt)`, metric: imgWithoutAlt, fix: 'Add alt="description" to all <img> tags' });
    score -= Math.min(20, imgWithoutAlt * 1.5);
  }
  if (ariaPct < 20) {
    issues.push({ id: `A11Y-${++n}`, severity: 'info', category: 'aria', title: `Only ${ariaPct}% of pages use ARIA attributes`, metric: pagesWithAria, fix: 'Add aria-label, aria-describedby to interactive elements' });
    score -= 5;
  }
  if (tabindexIssues > 5) {
    issues.push({ id: `A11Y-${++n}`, severity: 'warning', category: 'keyboard', title: `${tabindexIssues} negative tabindex values (keyboard trap risk)`, metric: tabindexIssues, fix: 'Remove negative tabindex or use tabindex="0"' });
    score -= Math.min(10, tabindexIssues);
  }
  if (formsTotal > 0) {
    const labelPct = Math.round(formsWithLabels / formsTotal * 100);
    if (labelPct < 70) {
      issues.push({ id: `A11Y-${++n}`, severity: 'warning', category: 'form-labels', title: `${labelPct}% of form inputs have labels (${formsWithLabels}/${formsTotal})`, metric: formsWithLabels, fix: 'Add <label> or aria-label to all form inputs' });
      score -= Math.round((70 - labelPct) / 5);
    }
  }

  return {
    name: 'accessibility', score: clamp(score), issues,
    data: {
      summary: { totalPages, h1Pct, mainPct, altPct, ariaPct },
      images: { total: imgTotal, withAlt: imgWithAlt, withoutAlt: imgWithoutAlt },
      landmarks: { withMain: pagesWithMain, withNav: pagesWithNav, withSkipLink: pagesWithSkipLink },
      forms: { inputs: formsTotal, labeled: formsWithLabels },
      worstPages: pageDetails.sort((a, b) => b.issues - a.issues).slice(0, 10)
    }
  };
}

// ════════════════════════════════════════════════════════════════════
// MODULE 10: SEO & META (5%)
// Meta tags, Open Graph, canonical, structured data
// ════════════════════════════════════════════════════════════════════

function modSeoMeta(rootDir, files) {
  const issues = [];
  let score = 100;
  let n = 0;

  const pages = files.filter(f => f.category === 'page' && f.content);
  const totalPages = pages.length;
  if (totalPages === 0) return { name: 'seoMeta', score: 100, issues: [], data: {} };

  let withTitle = 0, withDescription = 0, withViewport = 0;
  let withOgTitle = 0, withOgDescription = 0, withOgImage = 0;
  let withCanonical = 0, withFavicon = 0, withCharset = 0;
  let withRobots = 0, withStructuredData = 0;
  const pageDetails = [];

  for (const page of pages) {
    const c = page.content;
    const headMatch = c.match(/<head[\s\S]*?<\/head>/i);
    const head = headMatch ? headMatch[0] : '';

    const hasTitle = /<title[^>]*>[^<]+<\/title>/i.test(head);
    const hasDescription = /meta\s+name=["']description["']/i.test(head);
    const hasViewport = /meta\s+name=["']viewport["']/i.test(head);
    const hasOgTitle = /property=["']og:title["']/i.test(head);
    const hasOgDesc = /property=["']og:description["']/i.test(head);
    const hasOgImage = /property=["']og:image["']/i.test(head);
    const hasCanonical = /rel=["']canonical["']/i.test(head);
    const hasFavicon = /rel=["'](?:icon|shortcut icon)["']/i.test(head);
    const hasCharset = /charset/i.test(head);
    const hasRobots = /meta\s+name=["']robots["']/i.test(head);
    const hasStructured = /application\/ld\+json|itemtype/i.test(c);

    if (hasTitle) withTitle++;
    if (hasDescription) withDescription++;
    if (hasViewport) withViewport++;
    if (hasOgTitle) withOgTitle++;
    if (hasOgDesc) withOgDescription++;
    if (hasOgImage) withOgImage++;
    if (hasCanonical) withCanonical++;
    if (hasFavicon) withFavicon++;
    if (hasCharset) withCharset++;
    if (hasRobots) withRobots++;
    if (hasStructured) withStructuredData++;

    const metaScore = [hasTitle, hasDescription, hasViewport, hasOgTitle, hasCharset, hasFavicon].filter(Boolean).length;
    pageDetails.push({ page: page.path, title: hasTitle, description: hasDescription, viewport: hasViewport, og: hasOgTitle && hasOgDesc, canonical: hasCanonical, favicon: hasFavicon, score: metaScore });
  }

  // Calculate percentages
  const titlePct = Math.round(withTitle / totalPages * 100);
  const descPct = Math.round(withDescription / totalPages * 100);
  const viewportPct = Math.round(withViewport / totalPages * 100);
  const ogPct = Math.round(withOgTitle / totalPages * 100);
  const canonicalPct = Math.round(withCanonical / totalPages * 100);
  const faviconPct = Math.round(withFavicon / totalPages * 100);

  // Critical: title and viewport
  if (titlePct < 90) {
    issues.push({ id: `SEO-${++n}`, severity: 'warning', category: 'meta-title', title: `${titlePct}% of pages have <title> (${withTitle}/${totalPages})`, metric: withTitle, fix: 'Add unique <title> to every page' });
    score -= Math.round((90 - titlePct) / 5);
  }
  if (viewportPct < 95) {
    issues.push({ id: `SEO-${++n}`, severity: 'warning', category: 'meta-viewport', title: `${viewportPct}% of pages have viewport meta (${withViewport}/${totalPages})`, metric: withViewport, fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">' });
    score -= Math.round((95 - viewportPct) / 5);
  }

  // Important: description and OG
  if (descPct < 50) {
    issues.push({ id: `SEO-${++n}`, severity: 'info', category: 'meta-description', title: `${descPct}% of pages have meta description (${withDescription}/${totalPages})`, metric: withDescription, fix: 'Add <meta name="description" content="..."> for SEO' });
    score -= Math.round((50 - descPct) / 10);
  }
  if (ogPct < 30) {
    issues.push({ id: `SEO-${++n}`, severity: 'info', category: 'og-tags', title: `${ogPct}% of pages have Open Graph tags (${withOgTitle}/${totalPages})`, metric: withOgTitle, fix: 'Add og:title, og:description, og:image for social sharing' });
    score -= 5;
  }
  if (canonicalPct < 20) {
    issues.push({ id: `SEO-${++n}`, severity: 'info', category: 'canonical', title: `${canonicalPct}% of pages have canonical URL`, metric: withCanonical, fix: 'Add <link rel="canonical" href="..."> to prevent duplicate content' });
    score -= 3;
  }

  // Check for sitemap
  const hasSitemap = files.some(f => f.path.includes('sitemap'));
  if (!hasSitemap) {
    issues.push({ id: `SEO-${++n}`, severity: 'info', category: 'sitemap', title: 'No sitemap.xml found', fix: 'Generate sitemap.xml for search engine crawling' });
    score -= 3;
  }

  // Check for robots.txt
  const hasRobotsTxt = files.some(f => f.path === 'public/robots.txt');
  if (!hasRobotsTxt) {
    issues.push({ id: `SEO-${++n}`, severity: 'info', category: 'robots-txt', title: 'No robots.txt found', fix: 'Add public/robots.txt to guide search engines' });
    score -= 2;
  }

  return {
    name: 'seoMeta', score: clamp(score), issues,
    data: {
      summary: { totalPages, titlePct, descPct, viewportPct, ogPct, canonicalPct, faviconPct },
      counts: { withTitle, withDescription, withViewport, withOgTitle, withOgDescription, withOgImage, withCanonical, withFavicon, withCharset, withStructuredData },
      hasSitemap, hasRobotsTxt,
      worstPages: pageDetails.sort((a, b) => a.score - b.score).slice(0, 10)
    }
  };
}

// ════════════════════════════════════════════════════════════════════
// TREND TRACKER
// Compare scores across builds, detect regressions
// ════════════════════════════════════════════════════════════════════

function loadTrendHistory(rootDir) {
  const historyPath = path.join(rootDir, 'public', 'static', 'data', 'sentinel-history.json');
  try {
    return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  } catch {
    return { entries: [], created: Date.now() };
  }
}

function saveTrendHistory(rootDir, history) {
  const historyPath = path.join(rootDir, 'public', 'static', 'data', 'sentinel-history.json');
  try {
    fs.mkdirSync(path.dirname(historyPath), { recursive: true });
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  } catch (e) { console.error(`[SENTINEL] Trend history write failed: ${e.message}`); }
}

function updateTrend(rootDir, report) {
  const history = loadTrendHistory(rootDir);
  
  const entry = {
    timestamp: report.timestamp,
    version: report.version,
    composite: report.summary.healthScore,
    grade: report.summary.grade,
    modules: {},
    issues: { critical: report.summary.critical, warnings: report.summary.warnings, info: report.summary.suggestions },
    metrics: { bundleKB: report.modules.performance?.data?.bundleKB || 0, totalEndpoints: report.modules.apiSurface?.data?.totalEndpoints || 0, totalPages: report.modules.i18n?.data?.summary?.totalPages || 0 }
  };

  for (const [name, mod] of Object.entries(report.modules)) {
    entry.modules[name] = mod.score;
  }

  history.entries.push(entry);
  
  // Keep only last MAX_TREND_ENTRIES
  if (history.entries.length > MAX_TREND_ENTRIES) {
    history.entries = history.entries.slice(-MAX_TREND_ENTRIES);
  }

  // Calculate trends
  const prev = history.entries.length >= 2 ? history.entries[history.entries.length - 2] : null;
  const trend = {
    direction: prev ? (entry.composite > prev.composite ? 'improving' : entry.composite < prev.composite ? 'regressing' : 'stable') : 'baseline',
    delta: prev ? entry.composite - prev.composite : 0,
    streakDirection: 'stable',
    streakLength: 0,
    moduleChanges: {}
  };

  // Calculate streak
  if (history.entries.length >= 2) {
    let streakDir = null, streak = 0;
    for (let i = history.entries.length - 1; i >= 1; i--) {
      const cur = history.entries[i].composite;
      const prv = history.entries[i - 1].composite;
      const dir = cur > prv ? 'improving' : cur < prv ? 'regressing' : 'stable';
      if (streakDir === null) streakDir = dir;
      if (dir === streakDir && dir !== 'stable') streak++;
      else break;
    }
    trend.streakDirection = streakDir || 'stable';
    trend.streakLength = streak;
  }

  // Module-level changes
  if (prev) {
    for (const [name, score] of Object.entries(entry.modules)) {
      const prevScore = prev.modules[name];
      if (prevScore !== undefined) {
        const delta = score - prevScore;
        if (delta !== 0) {
          trend.moduleChanges[name] = { from: prevScore, to: score, delta };
        }
      }
    }
  }

  // Best/worst ever
  const scores = history.entries.map(e => e.composite);
  trend.allTimeBest = Math.max(...scores);
  trend.allTimeWorst = Math.min(...scores);
  trend.totalBuilds = history.entries.length;

  history.trend = trend;
  saveTrendHistory(rootDir, history);

  return { history, trend };
}

// ════════════════════════════════════════════════════════════════════
// AUTO-FIX ENGINE
// Generate executable fix scripts per issue category
// ════════════════════════════════════════════════════════════════════

function generateAutoFixes(report) {
  const fixes = [];
  const allIssues = report.issues || [];

  // Group issues by category for batch fixes
  const byCategory = {};
  for (const iss of allIssues) {
    if (!byCategory[iss.category]) byCategory[iss.category] = [];
    byCategory[iss.category].push(iss);
  }

  // Image optimization batch fix
  if (byCategory['image-size']) {
    const oversized = byCategory['image-size'].filter(i => i.file);
    if (oversized.length > 0) {
      fixes.push({
        id: 'FIX-IMG-BATCH',
        category: 'image-size',
        title: `Optimize ${oversized.length} oversized images`,
        impact: `Estimated savings: ${Math.round(oversized.reduce((s, i) => s + (i.metric || 0), 0) / 1024 / 1024)}MB`,
        commands: [
          '# Install image optimization tools',
          'npm install -g sharp-cli',
          '# Batch optimize (resize to max 1920px width, 80% quality)',
          ...oversized.slice(0, 5).map(i => `npx sharp -i "${i.file}" -o "${i.file}" --resize 1920 --quality 80`),
          oversized.length > 5 ? `# ... and ${oversized.length - 5} more` : ''
        ].filter(Boolean),
        automated: true
      });
    }
  }

  // Non-WebP conversion fix
  if (byCategory['image-format']) {
    fixes.push({
      id: 'FIX-WEBP',
      category: 'image-format',
      title: 'Convert non-WebP images to WebP',
      impact: 'Estimated 25-35% file size reduction',
      commands: [
        '# Find and convert PNG/JPG to WebP',
        'find public -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" | while read f; do',
        '  cwebp -q 80 "$f" -o "${f%.*}.webp" && rm "$f"',
        'done',
        '# Update HTML references',
        'find public -name "*.html" -exec sed -i "s/\\.png/.webp/g; s/\\.jpg/.webp/g; s/\\.jpeg/.webp/g" {} +'
      ],
      automated: true
    });
  }

  // i18n batch fix
  if (byCategory['i18n']) {
    fixes.push({
      id: 'FIX-I18N',
      category: 'i18n',
      title: 'Auto-fix untranslated pages',
      impact: 'Boost i18n coverage toward 100%',
      commands: [
        'node scripts/i18n-auto-fix.cjs --dry-run  # Preview changes',
        'node scripts/i18n-auto-fix.cjs             # Apply fixes'
      ],
      automated: true
    });
  }

  // Unused deps fix
  if (byCategory['unused-dep']) {
    const depIssue = byCategory['unused-dep'][0];
    if (depIssue) {
      fixes.push({
        id: 'FIX-DEPS',
        category: 'unused-dep',
        title: 'Remove unused dependencies',
        impact: 'Reduce install time and bundle size',
        commands: [depIssue.fix || 'npm prune'],
        automated: true
      });
    }
  }

  // @types in prod fix
  if (byCategory['dep-misplace']) {
    const typeIssue = byCategory['dep-misplace'][0];
    if (typeIssue) {
      fixes.push({
        id: 'FIX-TYPES-PROD',
        category: 'dep-misplace',
        title: 'Move @types to devDependencies',
        impact: 'Correct dependency classification',
        commands: [typeIssue.fix || '# Move @types packages to devDependencies'],
        automated: true
      });
    }
  }

  // CSS/JS splitting fix
  if (byCategory['css-bloat'] || byCategory['js-bloat']) {
    const bloaty = [...(byCategory['css-bloat'] || []), ...(byCategory['js-bloat'] || [])];
    if (bloaty.length > 0) {
      fixes.push({
        id: 'FIX-SPLIT',
        category: 'bloat',
        title: `Split ${bloaty.length} oversized CSS/JS files`,
        impact: 'Better caching, faster page loads',
        commands: bloaty.slice(0, 5).map(i => `# ${i.title} -> ${i.fix}`),
        automated: false
      });
    }
  }

  // Alt text fix
  if (byCategory['alt-text']) {
    fixes.push({
      id: 'FIX-ALT',
      category: 'accessibility',
      title: 'Add missing alt attributes to images',
      impact: 'Improve accessibility and SEO',
      commands: [
        '# Find images without alt text',
        'grep -rn "<img " public/*.html | grep -v "alt="',
        '# Add descriptive alt text to each image'
      ],
      automated: false
    });
  }

  // Lazy loading fix
  if (byCategory['lazy-load']) {
    fixes.push({
      id: 'FIX-LAZY',
      category: 'performance',
      title: 'Add lazy loading to images',
      impact: 'Faster initial page load, less bandwidth',
      commands: [
        '# Add loading="lazy" to all below-fold images',
        'find public -name "*.html" -exec sed -i \'s/<img /<img loading="lazy" /g\' {} +',
        '# Review: first image on each page should NOT be lazy (LCP)'
      ],
      automated: true
    });
  }

  // SEO meta tags fix
  if (byCategory['meta-description'] || byCategory['og-tags']) {
    fixes.push({
      id: 'FIX-SEO',
      category: 'seo',
      title: 'Add missing meta and OG tags',
      impact: 'Better search ranking and social sharing',
      commands: [
        '# Script to add meta tags to pages missing them',
        '# Add: <meta name="description" content="Page description">',
        '# Add: <meta property="og:title" content="Page Title">',
        '# Add: <meta property="og:description" content="Description">',
        '# Add: <meta property="og:image" content="/static/images/og-default.webp">'
      ],
      automated: false
    });
  }

  // Security headers fix
  if (byCategory['missing-header']) {
    fixes.push({
      id: 'FIX-HEADERS',
      category: 'security',
      title: 'Add missing security headers',
      impact: 'Protect against XSS, clickjacking, MIME sniffing',
      commands: [
        '// Add to src/index.tsx after app creation:',
        'app.use("*", async (c, next) => {',
        '  await next();',
        '  c.header("X-Content-Type-Options", "nosniff");',
        '  c.header("X-Frame-Options", "DENY");',
        '  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");',
        '});'
      ],
      automated: false
    });
  }

  return {
    totalFixes: fixes.length,
    automatedFixes: fixes.filter(f => f.automated).length,
    manualFixes: fixes.filter(f => !f.automated).length,
    fixes
  };
}

// ════════════════════════════════════════════════════════════════════
// SELF-HEAL ENGINE (absorbed from nw-selfmod.cjs)
// Recursive validate → heal → re-validate until convergence
// ════════════════════════════════════════════════════════════════════

const HEAL_EXEMPT_FROM_NAV = new Set([
  'card-audit', 'admin-physical', 'battle-old', 'battle-simple', 'battle-legacy'
]);

function selfHealScan(rootDir) {
  const publicDir = path.join(rootDir, 'public');
  const staticDir = path.join(publicDir, 'static');
  const healIssues = [];

  function scanHtmlDir(dir) {
    try {
      return fs.readdirSync(dir)
        .filter(f => f.endsWith('.html'))
        .map(f => path.join(dir, f));
    } catch { return []; }
  }

  const htmlFiles = [
    ...scanHtmlDir(publicDir),
    ...scanHtmlDir(path.join(publicDir, 'museum')),
    ...scanHtmlDir(path.join(publicDir, 'vault'))
  ];

  // Load known icons
  let knownIcons = null;
  const iconsPath = path.join(staticDir, 'nw-icons-inline.js');
  if (fs.existsSync(iconsPath)) {
    knownIcons = new Set();
    const iconContent = fs.readFileSync(iconsPath, 'utf8');
    const keysRe = /^\s+'?([a-z][a-z0-9-]*)'?\s*:/gm;
    let km;
    while ((km = keysRe.exec(iconContent)) !== null) {
      if (!['version', 'colors', 'sharedDefs', '_defsInjected', 'emojiMap'].includes(km[1])) {
        knownIcons.add(km[1]);
      }
    }
  }

  for (const filePath of htmlFiles) {
    const pageName = path.basename(filePath, '.html');
    let html;
    try { html = fs.readFileSync(filePath, 'utf8'); } catch { continue; }

    if (!HEAL_EXEMPT_FROM_NAV.has(pageName)) {
      // Missing nw-icons-inline.js
      const usesIcons = html.includes('data-nw-icon') || html.includes('nw-ux.js');
      if (usesIcons && !html.includes('nw-icons-inline.js')) {
        healIssues.push({ id: `heal-icons-${pageName}`, severity: 'error', file: pageName, rule: 'include-icons', message: `${pageName}: missing nw-icons-inline.js`, healable: true, healAction: 'inject-icons-js', filePath });
      }

      // Missing nw-i18n-core.js
      const usesI18n = html.includes('data-i18n') || html.includes('NW_I18N');
      if (usesI18n && !html.includes('nw-i18n-core.js')) {
        healIssues.push({ id: `heal-i18n-${pageName}`, severity: 'error', file: pageName, rule: 'include-i18n', message: `${pageName}: missing nw-i18n-core.js`, healable: true, healAction: 'inject-i18n-js', filePath });
      }

      // Missing nw-nav.js
      if (!html.includes('nw-nav.js')) {
        healIssues.push({ id: `heal-nav-${pageName}`, severity: 'warning', file: pageName, rule: 'include-nav', message: `${pageName}: missing nw-nav.js`, healable: true, healAction: 'inject-nav-js', filePath });
      }
    }

    // Missing viewport
    if (!html.includes('viewport') || !html.includes('width=device-width')) {
      healIssues.push({ id: `heal-viewport-${pageName}`, severity: 'error', file: pageName, rule: 'viewport-meta', message: `${pageName}: missing viewport meta`, healable: true, healAction: 'inject-viewport', filePath });
    }

    // Font-size floor (from design-guard)
    const fontMatches = html.matchAll(/font-size\s*:\s*(\.?\d*\.?\d+)rem/g);
    for (const fm of fontMatches) {
      if (parseFloat(fm[1]) < 0.75) {
        healIssues.push({ id: `heal-font-${pageName}`, severity: 'warning', file: pageName, rule: 'font-size-floor', message: `${pageName}: font-size ${fm[1]}rem below 0.75rem floor`, healable: true, healAction: 'fix-font-size', filePath });
        break; // One issue per page
      }
    }

    // Broken internal links
    const hrefRe = /href="(\/[^"#?]+)"/g;
    let lm;
    while ((lm = hrefRe.exec(html)) !== null) {
      const ref = lm[1];
      if (ref.startsWith('/api/') || ref.startsWith('/static/') || ref.startsWith('/favicon') || ref.startsWith('/manifest')) continue;
      const htmlFile = path.join(publicDir, ref.endsWith('.html') ? ref.slice(1) : ref.slice(1) + '.html');
      if (!fs.existsSync(htmlFile)) {
        healIssues.push({ id: `heal-link-${pageName}-${ref}`, severity: 'warning', file: pageName, rule: 'link-resolves', message: `${pageName}: href="${ref}" does not resolve`, healable: false });
      }
    }

    // Unknown icon references
    if (knownIcons) {
      const iconRe = /data-nw-icon="([^"]+)"/g;
      let im;
      const unknownIcons = new Set();
      while ((im = iconRe.exec(html)) !== null) {
        if (!knownIcons.has(im[1])) unknownIcons.add(im[1]);
      }
      if (unknownIcons.size > 0) {
        healIssues.push({ id: `heal-icon-unknown-${pageName}`, severity: 'error', file: pageName, rule: 'icon-exists', message: `${pageName}: unknown icons: ${[...unknownIcons].join(', ')}`, healable: false });
      }
    }

    // i18n structural check
    if (html.includes('data-i18n=') && !html.includes('NW_I18N.register') && !html.includes('const translations') && !html.includes('const i18n =')) {
      healIssues.push({ id: `heal-i18n-struct-${pageName}`, severity: 'warning', file: pageName, rule: 'i18n-has-register', message: `${pageName}: has data-i18n but no register block`, healable: false });
    }

    // Script load order
    const iconsPos = html.indexOf('nw-icons-inline.js');
    const uxPos = html.indexOf('nw-ux.js');
    if (iconsPos > -1 && uxPos > -1 && iconsPos > uxPos) {
      healIssues.push({ id: `heal-order-${pageName}`, severity: 'warning', file: pageName, rule: 'script-order', message: `${pageName}: nw-icons-inline.js should load before nw-ux.js`, healable: false });
    }

    // Duplicate <body> or </html>
    if ((html.match(/<body[\s>]/g) || []).length > 1) {
      healIssues.push({ id: `heal-dupbody-${pageName}`, severity: 'error', file: pageName, rule: 'single-body', message: `${pageName}: multiple <body> tags`, healable: false });
    }
  }

  // Orphaned assets
  const allRefs = new Set();
  for (const fp of htmlFiles) {
    try {
      const html = fs.readFileSync(fp, 'utf8');
      const srcRe = /(?:src|href)="(\/static\/[^"]+)"/g;
      let m;
      while ((m = srcRe.exec(html)) !== null) allRefs.add(m[1]);
    } catch {}
  }
  if (fs.existsSync(staticDir)) {
    for (const jsFile of fs.readdirSync(staticDir).filter(f => f.startsWith('nw-') && f.endsWith('.js'))) {
      if (!allRefs.has('/static/' + jsFile)) {
        healIssues.push({ id: `heal-orphan-${jsFile}`, severity: 'info', file: jsFile, rule: 'no-orphan-assets', message: `${jsFile}: not referenced by any HTML page`, healable: false });
      }
    }
  }

  return healIssues;
}

function applyHeals(healIssues) {
  let fixed = 0;
  for (const issue of healIssues) {
    if (!issue.healable || issue.healed) continue;
    try {
      switch (issue.healAction) {
        case 'inject-icons-js':
          fixed += _injectScript(issue.filePath, '/static/nw-icons-inline.js');
          issue.healed = true;
          break;
        case 'inject-i18n-js':
          fixed += _injectScript(issue.filePath, '/static/nw-i18n-core.js');
          issue.healed = true;
          break;
        case 'inject-nav-js':
          fixed += _injectScript(issue.filePath, '/static/nw-nav.js');
          issue.healed = true;
          break;
        case 'inject-viewport':
          fixed += _injectViewport(issue.filePath);
          issue.healed = true;
          break;
        case 'fix-font-size': {
          let html = fs.readFileSync(issue.filePath, 'utf8');
          const before = html;
          html = html.replace(/font-size\s*:\s*(\.?\d*\.?\d+)rem/g, (match, val) => {
            return parseFloat(val) < 0.75 ? match.replace(`${val}rem`, '0.75rem') : match;
          });
          if (html !== before) { fs.writeFileSync(issue.filePath, html); fixed++; issue.healed = true; }
          break;
        }
      }
    } catch { /* skip failed heals */ }
  }
  return fixed;
}

function _injectScript(filePath, scriptPath) {
  let html = fs.readFileSync(filePath, 'utf8');
  if (html.includes(scriptPath)) return 0;
  const tag = `    <script defer src="${scriptPath}"></script>`;
  if (html.includes('</head>')) {
    html = html.replace('</head>', tag + '\n</head>');
    fs.writeFileSync(filePath, html, 'utf8');
    return 1;
  }
  return 0;
}

function _injectViewport(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  if (html.includes('viewport')) return 0;
  const meta = '    <meta name="viewport" content="width=device-width, initial-scale=1.0">';
  if (html.includes('<head>')) {
    html = html.replace('<head>', '<head>\n' + meta);
    fs.writeFileSync(filePath, html, 'utf8');
    return 1;
  }
  return 0;
}

function runSelfHeal(rootDir, maxDepth = 5) {
  const results = { iterations: [], totalHealed: 0, converged: false, remaining: 0 };
  let prevFingerprint = '';

  for (let depth = 0; depth < maxDepth; depth++) {
    const issues = selfHealScan(rootDir);
    const unhealed = issues.filter(i => !i.healed);
    const fingerprint = crypto.createHash('md5')
      .update(unhealed.map(i => i.id).sort().join('|'))
      .digest('hex');

    results.iterations.push({ depth, total: unhealed.length, errors: unhealed.filter(i => i.severity === 'error').length });

    if (unhealed.length === 0) { results.converged = true; break; }

    const healable = unhealed.filter(i => i.healable);
    if (healable.length === 0) { results.remaining = unhealed.length; break; }
    if (fingerprint === prevFingerprint) { results.remaining = unhealed.length; break; }
    prevFingerprint = fingerprint;

    const healed = applyHeals(issues);
    results.totalHealed += healed;
    if (healed === 0) { results.remaining = unhealed.length; break; }
  }

  if (!results.converged) {
    const finalIssues = selfHealScan(rootDir);
    results.remaining = finalIssues.filter(i => !i.healed).length;
    results.issues = finalIssues.filter(i => !i.healed);
  }

  return results;
}

function generateManifest(rootDir) {
  const publicDir = path.join(rootDir, 'public');
  const staticDir = path.join(publicDir, 'static');
  const manifest = { version: VERSION, generated: new Date().toISOString(), files: {}, contracts: [] };

  function scanDir(dir, ext) {
    try { return fs.readdirSync(dir).filter(f => f.endsWith(ext)).map(f => path.join(dir, f)); }
    catch { return []; }
  }

  const htmlFiles = [...scanDir(publicDir, '.html'), ...scanDir(path.join(publicDir, 'museum'), '.html'), ...scanDir(path.join(publicDir, 'vault'), '.html')];
  const jsFiles = scanDir(staticDir, '.js');
  const cssFiles = scanDir(staticDir, '.css');

  for (const f of [...htmlFiles, ...jsFiles, ...cssFiles]) {
    try {
      const content = fs.readFileSync(f);
      const rel = path.relative(rootDir, f);
      manifest.files[rel] = {
        sha256: crypto.createHash('sha256').update(content).digest('hex').slice(0, 16),
        size: content.length,
        modified: fs.statSync(f).mtime.toISOString()
      };
    } catch {}
  }

  for (const fp of htmlFiles) {
    const pageName = path.basename(fp, '.html');
    try {
      const html = fs.readFileSync(fp, 'utf8');
      const deps = [];
      const srcRe = /src="(\/static\/[^"]+\.js)"/g;
      let m;
      while ((m = srcRe.exec(html)) !== null) deps.push(m[1]);
      const hrefRe = /href="(\/static\/[^"]+\.css)"/g;
      while ((m = hrefRe.exec(html)) !== null) deps.push(m[1]);
      if (deps.length > 0) manifest.contracts.push({ page: pageName, depends: deps });
    } catch {}
  }

  const manifestPath = path.join(rootDir, 'data', 'selfmod-manifest.json');
  try {
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  } catch {}

  return manifest;
}

// ════════════════════════════════════════════════════════════════════
// COMPOSITE SCORING & REPORT BUILDER
// ════════════════════════════════════════════════════════════════════

function runSentinel(rootDir, options = {}) {
  const { files, duplicates } = scanFiles(rootDir);

  // Run all 10 modules
  const modules = [
    modArchitecture(rootDir, files, duplicates),
    modAssets(rootDir, files),
    modI18n(rootDir, files),
    modDeadCode(rootDir, files),
    modSecurity(rootDir, files),
    modPerformance(rootDir, files),
    modApiSurface(rootDir, files),
    modDependencies(rootDir, files),
    modAccessibility(rootDir, files),
    modSeoMeta(rootDir, files)
  ];

  // Composite score (weighted)
  const composite = Math.round(
    modules.reduce((sum, m) => sum + m.score * (MODULE_WEIGHTS[m.name] || 0), 0)
  );

  // Aggregate issues
  const allIssues = modules.flatMap(m => m.issues);
  const critical = allIssues.filter(i => i.severity === 'critical').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const infos = allIssues.filter(i => i.severity === 'info').length;

  // Build optimization plan
  const plan = [];
  let pri = 0;
  for (const iss of allIssues.filter(i => i.severity === 'critical')) {
    plan.push({ priority: ++pri, action: iss.fix || iss.title, impact: 'critical', module: iss.category, id: iss.id });
  }
  for (const iss of allIssues.filter(i => i.severity === 'warning').slice(0, 15)) {
    plan.push({ priority: ++pri, action: iss.fix || iss.title, impact: 'warning', module: iss.category, id: iss.id });
  }

  const source = files.filter(f => f.category === 'source');
  const staticCode = files.filter(f => f.category === 'static-code');
  const largest = [...source, ...staticCode].sort((a, b) => b.lines - a.lines)[0] || { path: 'none', lines: 0 };

  const report = {
    engine: 'nw-guardian',
    version: VERSION,
    timestamp: Date.now(),
    project: rootDir,

    summary: {
      healthScore: composite,
      grade: gradeFromScore(composite),
      critical, warnings, suggestions: infos,
      totalIssues: allIssues.length,
      moduleCount: modules.length,
      moduleScores: Object.fromEntries(modules.map(m => [m.name, { score: m.score, grade: gradeFromScore(m.score), weight: MODULE_WEIGHTS[m.name], issues: m.issues.length }])),
      scoring: Object.entries(MODULE_WEIGHTS).map(([k, v]) => `${k} ${v * 100}%`).join(' + '),
      recommendation: composite >= 90 ? 'Excellent health. Monitor for drift.'
        : composite >= 75 ? `Good health. Address ${critical} critical, ${warnings} warnings.`
        : composite >= 50 ? `Needs work. ${critical} critical, ${warnings} warnings. Start with worst module.`
        : `Poor health. Urgent cleanup needed.`
    },

    modules: Object.fromEntries(modules.map(m => [m.name, { score: m.score, grade: gradeFromScore(m.score), issues: m.issues, data: m.data }])),

    metrics: {
      source: { files: source.length, lines: source.reduce((s, f) => s + f.lines, 0) },
      staticCode: { files: staticCode.length, lines: staticCode.reduce((s, f) => s + f.lines, 0) },
      pages: { files: files.filter(f => f.category === 'page').length },
      totalFiles: files.length,
      largestFile: { path: largest.path, lines: largest.lines },
      routeHandlers: source.reduce((s, f) => s + f.routeHandlers, 0)
    },

    issues: allIssues,
    plan: { steps: plan, topPriority: plan[0]?.action || 'No critical actions needed' },

    // Backward compat
    i18n: modules.find(m => m.name === 'i18n')?.data || {},

    topFiles: [...source, ...staticCode].sort((a, b) => b.lines - a.lines).slice(0, 15).map(f => ({
      path: f.path, lines: f.lines, complexity: f.complexity, functions: f.functions, routeHandlers: f.routeHandlers, category: f.category
    })),

    config: { thresholds: THRESHOLDS, weights: MODULE_WEIGHTS }
  };

  // Auto-fix engine
  report.autoFixes = generateAutoFixes(report);

  // Trend tracking
  const { trend } = updateTrend(rootDir, report);
  report.trend = trend;

  return report;
}

// ════════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ════════════════════════════════════════════════════════════════════

function main() {
  const args = process.argv.slice(2);
  const rootDir = args.includes('--root') ? args[args.indexOf('--root') + 1] : process.cwd();
  const isCI = args.includes('--ci');
  const isJSON = args.includes('--json');
  const noRegress = args.includes('--no-regress');
  const showTrend = args.includes('--trend');
  const showAutoFix = args.includes('--auto-fix');
  const doHeal = args.includes('--heal');
  const doGuard = args.includes('--guard');
  const doManifest = args.includes('--manifest');
  const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;
  const singleModule = args.includes('--module') ? args[args.indexOf('--module') + 1] : null;

  const C = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', magenta: '\x1b[35m', blue: '\x1b[34m' };

  // ── HEAL MODE (replaces nw-selfmod.cjs) ──
  if (doHeal) {
    if (!isJSON) {
      console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════╗${C.reset}`);
      console.log(`${C.bold}${C.cyan}║  NW-GUARDIAN v${VERSION} — Recursive Self-Heal               ║${C.reset}`);
      console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════╝${C.reset}\n`);
    }

    const healResult = runSelfHeal(rootDir);
    const manifest = generateManifest(rootDir);

    if (isJSON) {
      console.log(JSON.stringify({ engine: 'nw-guardian', version: VERSION, mode: 'heal', ...healResult, manifest: { files: Object.keys(manifest.files).length, contracts: manifest.contracts.length } }, null, 2));
    } else {
      console.log(`  ${C.bold}Self-Heal Results:${C.reset}`);
      console.log(`    Iterations:  ${healResult.iterations.length}`);
      console.log(`    Healed:      ${C.magenta}${healResult.totalHealed}${C.reset}`);
      console.log(`    Converged:   ${healResult.converged ? C.green + 'YES' : C.red + 'NO'}${C.reset}`);
      console.log(`    Remaining:   ${healResult.remaining}`);
      if (healResult.issues && healResult.issues.length > 0) {
        console.log(`\n  ${C.bold}Remaining Issues:${C.reset}`);
        const byRule = {};
        for (const i of healResult.issues) {
          if (!byRule[i.rule]) byRule[i.rule] = [];
          byRule[i.rule].push(i);
        }
        for (const [rule, items] of Object.entries(byRule)) {
          const color = items[0].severity === 'error' ? C.red : items[0].severity === 'warning' ? C.yellow : C.dim;
          console.log(`    ${color}[${rule}] ${items.length} issue(s)${C.reset}`);
          items.slice(0, 3).forEach(i => console.log(`      ${color}• ${i.message}${C.reset}`));
          if (items.length > 3) console.log(`      ${C.dim}... +${items.length - 3} more${C.reset}`);
        }
      }
      console.log(`\n  ${C.dim}Manifest: ${Object.keys(manifest.files).length} files, ${manifest.contracts.length} contracts${C.reset}\n`);
    }
    return;
  }

  // ── GUARD MODE (replaces nw-design-guard.cjs) ──
  if (doGuard) {
    const guardIssues = selfHealScan(rootDir);
    if (isJSON) {
      console.log(JSON.stringify({ engine: 'nw-guardian', version: VERSION, mode: 'guard', issues: guardIssues }, null, 2));
    } else {
      console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════╗${C.reset}`);
      console.log(`${C.bold}${C.cyan}║  NW-GUARDIAN v${VERSION} — Design & Include Guard           ║${C.reset}`);
      console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════╝${C.reset}\n`);
      const errors = guardIssues.filter(i => i.severity === 'error');
      const warnings = guardIssues.filter(i => i.severity === 'warning');
      const infos = guardIssues.filter(i => i.severity === 'info');
      console.log(`  ${C.bold}Guard Results:${C.reset} ${C.red}${errors.length} errors${C.reset} · ${C.yellow}${warnings.length} warnings${C.reset} · ${C.dim}${infos.length} info${C.reset}`);
      if (errors.length > 0) {
        console.log(`\n  ${C.red}Errors:${C.reset}`);
        errors.forEach(i => console.log(`    ${C.red}✗${C.reset} ${i.message}`));
      }
      if (warnings.length > 0) {
        console.log(`\n  ${C.yellow}Warnings:${C.reset}`);
        warnings.slice(0, 15).forEach(i => console.log(`    ${C.yellow}⚠${C.reset} ${i.message}`));
        if (warnings.length > 15) console.log(`    ${C.dim}... +${warnings.length - 15} more${C.reset}`);
      }
      console.log('');
    }
    process.exit(guardIssues.filter(i => i.severity === 'error').length > 0 ? 1 : 0);
    return;
  }

  // ── MANIFEST MODE ──
  if (doManifest) {
    const manifest = generateManifest(rootDir);
    if (isJSON) {
      console.log(JSON.stringify(manifest, null, 2));
    } else {
      console.log(`  Manifest written: ${Object.keys(manifest.files).length} files, ${manifest.contracts.length} contracts`);
    }
    return;
  }

  // ── FULL SCAN MODE (original sentinel behavior) ──
  const report = runSentinel(rootDir, { singleModule });

  // Write report
  const reportPath = outputFile || path.join(rootDir, 'public', 'static', 'data', 'sentinel-report.json');
  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  } catch (e) { console.error(`[SENTINEL] Write failed: ${e.message}`); }

  if (isJSON) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const C = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', magenta: '\x1b[35m', blue: '\x1b[34m' };
    const sc = (s) => s >= 80 ? C.green : s >= 50 ? C.yellow : C.red;

    console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.bold}${C.cyan}║  NW-GUARDIAN v${VERSION} — Unified Health Report (10 Modules)     ║${C.reset}`);
    console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════════════╝${C.reset}\n`);

    console.log(`  ${C.bold}Composite Score:${C.reset}  ${sc(report.summary.healthScore)}${report.summary.healthScore}/100 (${report.summary.grade})${C.reset}`);
    
    // Trend indicator
    if (report.trend) {
      const t = report.trend;
      const arrow = t.direction === 'improving' ? `${C.green}+${t.delta}` : t.direction === 'regressing' ? `${C.red}${t.delta}` : `${C.dim}=0`;
      console.log(`  ${C.bold}Trend:${C.reset}            ${arrow}${C.reset} (${t.direction}) ${t.streakLength > 1 ? `| ${t.streakLength}-build streak` : ''} | Build #${t.totalBuilds}`);
      if (t.allTimeBest !== undefined) {
        console.log(`  ${C.bold}All-Time:${C.reset}         Best: ${C.green}${t.allTimeBest}${C.reset} | Worst: ${C.red}${t.allTimeWorst}${C.reset}`);
      }
    }

    console.log(`\n  ${C.bold}Module Breakdown (10 modules):${C.reset}`);
    for (const [name, mod] of Object.entries(report.summary.moduleScores)) {
      const pct = Math.round((MODULE_WEIGHTS[name] || 0) * 100) + '%';
      const bar = '█'.repeat(Math.round(mod.score / 5)) + '░'.repeat(20 - Math.round(mod.score / 5));
      const trendDelta = report.trend?.moduleChanges?.[name];
      const trendStr = trendDelta ? (trendDelta.delta > 0 ? ` ${C.green}+${trendDelta.delta}${C.reset}` : ` ${C.red}${trendDelta.delta}${C.reset}`) : '';
      console.log(`    ${sc(mod.score)}${bar}${C.reset}  ${mod.score.toString().padStart(3)} ${mod.grade.padEnd(3)} ${name.padEnd(14)} (${pct.padStart(3)}) ${mod.issues > 0 ? C.dim + `${mod.issues} issues` + C.reset : ''}${trendStr}`);
    }

    console.log(`\n  ${C.bold}Issues:${C.reset} ${C.red}${report.summary.critical} critical${C.reset} · ${C.yellow}${report.summary.warnings} warnings${C.reset} · ${C.dim}${report.summary.suggestions} info${C.reset}`);

    if (report.summary.critical > 0) {
      console.log(`\n  ${C.bold}${C.red}Critical Issues:${C.reset}`);
      report.issues.filter(i => i.severity === 'critical').forEach(i => {
        console.log(`    ${C.red}X${C.reset} [${i.category}] ${i.title}`);
        if (i.fix) console.log(`      ${C.dim}Fix: ${i.fix}${C.reset}`);
      });
    }

    // Auto-fix summary
    if (report.autoFixes) {
      console.log(`\n  ${C.bold}${C.magenta}Auto-Fix Engine:${C.reset} ${report.autoFixes.totalFixes} fixes available (${report.autoFixes.automatedFixes} automated, ${report.autoFixes.manualFixes} manual)`);
      if (showAutoFix) {
        for (const fix of report.autoFixes.fixes) {
          console.log(`\n    ${C.bold}[${fix.id}]${C.reset} ${fix.title} ${fix.automated ? C.green + '(auto)' : C.yellow + '(manual)'}${C.reset}`);
          console.log(`    ${C.dim}Impact: ${fix.impact}${C.reset}`);
          for (const cmd of fix.commands) {
            console.log(`    ${C.cyan}  ${cmd}${C.reset}`);
          }
        }
      } else {
        console.log(`  ${C.dim}Run with --auto-fix to see fix commands${C.reset}`);
      }
    }

    // Trend history
    if (showTrend && report.trend) {
      const history = loadTrendHistory(rootDir);
      console.log(`\n  ${C.bold}${C.blue}Trend History (last ${Math.min(10, history.entries.length)} builds):${C.reset}`);
      for (const entry of history.entries.slice(-10)) {
        const d = new Date(entry.timestamp).toISOString().slice(0, 16);
        console.log(`    ${d}  ${sc(entry.composite)}${entry.composite}${C.reset} ${entry.grade}`);
      }
    }

    console.log(`\n  ${C.bold}Recommendation:${C.reset} ${report.summary.recommendation}`);
    console.log(`  ${C.dim}Report: ${reportPath}${C.reset}\n`);
  }

  // CI gates
  if (isCI) {
    if (report.summary.healthScore < 50) {
      console.error(`\n[SENTINEL] CI GATE FAILED: Health ${report.summary.healthScore} < 50`);
      process.exit(1);
    }
    if (noRegress && report.trend && report.trend.direction === 'regressing' && report.trend.delta < -5) {
      console.error(`\n[SENTINEL] REGRESSION GATE FAILED: Score dropped by ${Math.abs(report.trend.delta)} points`);
      process.exit(1);
    }
  }
}

if (require.main === module) main();
module.exports = { runSentinel, runSelfHeal, selfHealScan, applyHeals, generateManifest, scanFiles, modArchitecture, modAssets, modI18n, modDeadCode, modSecurity, modPerformance, modApiSurface, modDependencies, modAccessibility, modSeoMeta, generateAutoFixes, loadTrendHistory };
