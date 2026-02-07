#!/usr/bin/env node
/**
 * NW-SENTINEL v1.0 — Automated Code Health & Optimization Engine
 * ══════════════════════════════════════════════════════════════════
 * 
 * WHAT: Scans your codebase, detects bloat, duplicates, complexity,
 * stale files, and architectural violations. Outputs a JSON report
 * that any API, AI, or dashboard can consume.
 * 
 * WHY THIS ARCHITECTURE:
 *   - Runs at BUILD TIME (not runtime) — no fs access needed in Workers
 *   - Generates static JSON → served by any web server
 *   - CLI-first → works in CI/CD pipelines (GitHub Actions, etc.)
 *   - Zero external deps → copy this file into ANY project
 *   - JSON-in/JSON-out → any AI or human can consume results
 * 
 * PORTABLE SDK PATTERN:
 *   1. Copy sentinel.cjs into your project
 *   2. Run: node sentinel.cjs --root ./your-project
 *   3. Get: sentinel-report.json with health score, issues, fix plan
 *   4. Wire into your CI: fail build if health < 50
 * 
 * USAGE:
 *   node sentinel.cjs                        # Scan current project
 *   node sentinel.cjs --root /path/to/proj   # Scan specific project
 *   node sentinel.cjs --ci                   # CI mode (exit 1 if unhealthy)
 *   node sentinel.cjs --json                 # JSON-only output
 *   node sentinel.cjs --fix                  # Show optimization plan
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════

const DEFAULT_THRESHOLDS = {
  maxFileLines: 500,        // single file line limit
  maxFunctionLines: 50,     // function length limit  
  maxRouteHandlers: 30,     // handlers per file
  maxDuplicateRatio: 0.15,  // % duplicate allowed
  maxTotalLines: 15000,     // project source line budget
  maxComplexity: 15,        // cyclomatic complexity cap
  maxDependencies: 20,      // package.json dep count
  staleFileDays: 30         // days before flagged stale
};

const DEFAULT_IGNORE = [
  'node_modules', '.git', 'dist', '.wrangler', '.ai-cache',
  'package-lock.json', 'archive'
];

const BINARY_EXTENSIONS = new Set([
  '.webp', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico',
  '.mp3', '.wav', '.ogg', '.mp4', '.webm',
  '.woff', '.woff2', '.ttf', '.eot',
  '.zip', '.tar', '.gz', '.pdf'
]);

// ════════════════════════════════════════════════════════════════════
// FILE SCANNER
// ════════════════════════════════════════════════════════════════════

function categorizeFile(relPath) {
  if (relPath.includes('/test') || relPath.includes('.test.') || relPath.includes('.spec.')) return 'test';
  if (relPath.match(/\.(json|yaml|yml|toml|sql)$/)) return 'data';
  if (relPath.match(/\.(ts|tsx|js|jsx)$/) && relPath.startsWith('src/')) return 'source';
  if (relPath.includes('/static/') && relPath.match(/\.(js|css)$/)) return 'static-code';
  if (relPath.match(/\.(html)$/)) return 'page';
  if (relPath.match(/\.(md|txt|log)$/) || relPath.includes('config')) return 'config';
  return 'asset';
}

function estimateComplexity(content) {
  const decisions = (content.match(/\b(if|else\s+if|for|while|switch|case|catch|\?\?|&&|\|\|)\b/g) || []).length;
  const functions = (content.match(/\b(function|=>)\b/g) || []).length;
  return Math.max(1, Math.round(decisions / Math.max(1, functions)));
}

function countFunctions(content) {
  return (content.match(/\bfunction\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(|(?:app|router)\.\s*(?:get|post|put|delete|patch|all)\s*\(/g) || []).length;
}

function countRouteHandlers(content) {
  return (content.match(/\b(?:app|router)\.\s*(?:get|post|put|delete|patch|all)\s*\(/g) || []).length;
}

function shouldIgnore(relPath, ignoreList) {
  return ignoreList.some(pattern => {
    if (pattern.startsWith('*')) return relPath.endsWith(pattern.slice(1));
    return relPath.includes(pattern);
  });
}

function scanProject(rootDir, ignoreList) {
  const files = [];
  const hashMap = new Map();
  const now = Date.now();
  const staleMs = DEFAULT_THRESHOLDS.staleFileDays * 24 * 60 * 60 * 1000;

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(rootDir, fullPath);
      
      if (shouldIgnore(relPath, ignoreList) || shouldIgnore(entry.name, ignoreList)) continue;
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          const ext = path.extname(entry.name).toLowerCase();
          const category = categorizeFile(relPath);
          const isBinary = BINARY_EXTENSIONS.has(ext);
          
          let lines = 0, content = '', complexity = 0, functions = 0;
          let exports = 0, imports = 0, routeHandlers = 0, contentHash = '';
          
          if (!isBinary && stat.size < 500000) {
            content = fs.readFileSync(fullPath, 'utf8');
            lines = content.split('\n').length;
            
            if (category === 'source' || category === 'static-code') {
              complexity = estimateComplexity(content);
              functions = countFunctions(content);
              exports = (content.match(/\bexport\b/g) || []).length;
              imports = (content.match(/\bimport\b/g) || []).length;
              routeHandlers = countRouteHandlers(content);
            }
            
            // Hash for duplicate detection
            if ((category === 'data' || category === 'source') && lines > 10) {
              contentHash = crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
              if (!hashMap.has(contentHash)) hashMap.set(contentHash, []);
              hashMap.get(contentHash).push(relPath);
            }
          }
          
          files.push({
            path: relPath,
            lines,
            size: stat.size,
            functions,
            exports,
            imports,
            routeHandlers,
            complexity,
            stale: (now - stat.mtimeMs) > staleMs,
            lastModified: stat.mtimeMs,
            ext,
            category
          });
        } catch { /* skip unreadable */ }
      }
    }
  }
  
  walk(rootDir);
  
  // Build duplicate groups
  const duplicates = [];
  for (const [hash, paths] of hashMap) {
    if (paths.length > 1) {
      const f = files.find(f => f.path === paths[0]);
      duplicates.push({
        hash,
        files: paths,
        lines: (f?.lines || 0) * (paths.length - 1),
        wastedBytes: (f?.size || 0) * (paths.length - 1)
      });
    }
  }
  
  return { files, duplicates };
}

// ════════════════════════════════════════════════════════════════════
// i18n COVERAGE SCANNER
// ════════════════════════════════════════════════════════════════════

function scanI18nCoverage(rootDir) {
  const publicDir = path.join(rootDir, 'public');
  const results = { pages: [], summary: {} };
  const SUPPORTED_LANGS = ['en', 'zh', 'th'];
  
  // Patterns that indicate hardcoded English text (not i18n-ized)
  // Match text content between > and < that has 2+ English words
  const HARDCODED_PATTERN = />\s*([A-Z][a-zA-Z]+(?: [a-zA-Z]+){1,}[^<]{0,80})\s*</g;
  
  // Strings to ignore (framework artifacts, not user-facing)
  const IGNORE_STRINGS = new Set([
    'NW_I18N', 'data-i18n', 'text/javascript', 'text/css',
    'Content-Type', 'application/json', 'UTF-8', 'viewport'
  ]);
  
  // Check if text looks like code/markup rather than user-facing content
  function isCodeFragment(text) {
    if (text.length < 4 || text.length > 200) return true;
    if (/[{}()\[\];=<>]/.test(text)) return true;
    if (/^(var|let|const|function|if|else|return|import|export|class|new|true|false)\b/.test(text)) return true;
    if (/^(https?:\/\/|mailto:|\/)/.test(text)) return true;
    if (/\.(js|css|html|json|ts|tsx|svg|png|jpg|webp)$/.test(text)) return true;
    if (/^[A-Z_]+$/.test(text.replace(/\s/g, ''))) return true; // ALL_CAPS_CONSTANTS
    if (IGNORE_STRINGS.has(text.trim())) return true;
    return false;
  }
  
  let htmlFiles;
  try {
    htmlFiles = fs.readdirSync(publicDir)
      .filter(f => f.endsWith('.html'))
      .map(f => ({ name: f, full: path.join(publicDir, f) }));
  } catch { return results; }
  
  let totalPages = 0;
  let pagesWithI18n = 0;
  let pagesWithRegister = 0;
  let totalKeys = 0;
  let totalKeysWithTranslations = 0;
  let totalHardcodedStrings = 0;
  
  for (const file of htmlFiles) {
    let content;
    try { content = fs.readFileSync(file.full, 'utf8'); } catch { continue; }
    totalPages++;
    
    const hasI18nScript = content.includes('nw-i18n-core');
    const hasRegister = content.includes('NW_I18N.register');
    
    if (hasI18nScript) pagesWithI18n++;
    if (hasRegister) pagesWithRegister++;
    
    // Count data-i18n keys
    const i18nKeyMatches = content.match(/data-i18n=["']([^"']+)["']/g) || [];
    const keyCount = i18nKeyMatches.length;
    totalKeys += keyCount;
    
    // Check which languages have translations registered
    const registeredLangs = [];
    for (const lang of SUPPORTED_LANGS) {
      // Look for lang key in register block: en: {, zh: {, th: {
      if (new RegExp(`${lang}\\s*:\\s*\\{`).test(content)) {
        registeredLangs.push(lang);
      }
    }
    if (registeredLangs.length >= SUPPORTED_LANGS.length) {
      totalKeysWithTranslations += keyCount;
    }
    
    // Detect hardcoded English strings in visible text
    const hardcoded = [];
    let match;
    const hardcodedRegex = />([^<]{4,120})</g;
    while ((match = hardcodedRegex.exec(content)) !== null) {
      const text = match[1].trim();
      // Must contain at least 2 English words, not inside script/style
      if (/^[A-Z][a-z]+(?: [a-zA-Z]+)+/.test(text) && !isCodeFragment(text)) {
        // Check if this element has data-i18n
        const before = content.slice(Math.max(0, match.index - 200), match.index);
        if (!before.includes('data-i18n')) {
          hardcoded.push(text.slice(0, 80));
        }
      }
    }
    totalHardcodedStrings += hardcoded.length;
    
    // Determine page status
    let status;
    if (hasRegister && registeredLangs.length >= SUPPORTED_LANGS.length) {
      status = 'translated';
    } else if (hasI18nScript && keyCount > 0 && registeredLangs.length > 0) {
      status = 'partial';
    } else if (hasI18nScript && keyCount > 0) {
      status = 'keys-only';
    } else if (keyCount > 0) {
      status = 'keys-no-script';
    } else {
      status = 'none';
    }
    
    results.pages.push({
      page: file.name,
      status,
      hasI18nScript,
      hasRegister,
      keyCount,
      registeredLangs,
      hardcodedStrings: hardcoded.length,
      sampleHardcoded: hardcoded.slice(0, 5)
    });
  }
  
  // Sort: worst first (most hardcoded + least translated)
  results.pages.sort((a, b) => {
    const scoreA = (a.status === 'translated' ? 0 : a.status === 'partial' ? 1 : 2) * 1000 + b.hardcodedStrings;
    const scoreB = (b.status === 'translated' ? 0 : b.status === 'partial' ? 1 : 2) * 1000 + a.hardcodedStrings;
    return scoreB - scoreA;
  });
  
  const coveragePercent = totalPages > 0 ? Math.round((pagesWithRegister / totalPages) * 100) : 0;
  
  results.summary = {
    totalPages,
    pagesWithI18nScript: pagesWithI18n,
    pagesWithRegister,
    coveragePercent,
    supportedLanguages: SUPPORTED_LANGS,
    totalI18nKeys: totalKeys,
    keysWithAllTranslations: totalKeysWithTranslations,
    totalHardcodedStrings,
    grade: coveragePercent >= 90 ? 'A' : coveragePercent >= 70 ? 'B' : coveragePercent >= 50 ? 'C' : coveragePercent >= 30 ? 'D' : 'F',
    status: coveragePercent >= 80 ? 'good' : coveragePercent >= 50 ? 'needs-work' : 'poor'
  };
  
  return results;
}

// ════════════════════════════════════════════════════════════════════
// ISSUE DETECTION
// ════════════════════════════════════════════════════════════════════

function detectIssues(files, duplicates, thresholds) {
  const issues = [];
  let n = 0;
  
  // Per-file issues
  for (const f of files) {
    if (f.category === 'asset' || f.category === 'config') continue;
    
    // BLOAT: File too long
    // Source files are CRITICAL (backend, routes, services)
    // Static files are WARNINGS (frontend JS/CSS — less urgent)
    if (f.lines > thresholds.maxFileLines && (f.category === 'source' || f.category === 'static-code')) {
      const isSource = f.category === 'source';
      const rawSeverity = f.lines > thresholds.maxFileLines * 2 ? 'critical' : 'warning';
      // Static files cap at 'warning' severity — they're presentation, not architecture
      const severity = isSource ? rawSeverity : 'warning';
      issues.push({
        id: `SEN-${++n}`,
        severity,
        category: 'bloat',
        title: `${f.path} has ${f.lines} lines (limit: ${thresholds.maxFileLines})`,
        description: `Large files are hard to debug and slow for AI to process. Split into ${Math.ceil(f.lines / thresholds.maxFileLines)} modules.`,
        file: f.path,
        metric: f.lines,
        threshold: thresholds.maxFileLines,
        fix: {
          type: f.lines > 2000 ? 'refactor' : 'manual',
          action: `Split into ${Math.ceil(f.lines / thresholds.maxFileLines)} files by domain/concern`,
          effort: f.lines > 2000 ? 'large' : 'medium',
          linesRecoverable: 0
        }
      });
    }
    
    // COMPLEXITY
    if (f.complexity > thresholds.maxComplexity && f.category === 'source') {
      issues.push({
        id: `SEN-${++n}`,
        severity: f.complexity > thresholds.maxComplexity * 2 ? 'critical' : 'warning',
        category: 'complexity',
        title: `High complexity: ${f.path} (${f.complexity}/${thresholds.maxComplexity})`,
        description: 'Extract helper functions, use early returns, reduce nesting depth.',
        file: f.path,
        metric: f.complexity,
        threshold: thresholds.maxComplexity,
        fix: { type: 'refactor', action: 'Extract complex logic into named helpers', effort: 'medium', linesRecoverable: 0 }
      });
    }
    
    // TOO MANY ROUTES IN ONE FILE
    if (f.routeHandlers > thresholds.maxRouteHandlers) {
      issues.push({
        id: `SEN-${++n}`,
        severity: 'warning',
        category: 'architecture',
        title: `${f.routeHandlers} route handlers in ${f.path} (limit: ${thresholds.maxRouteHandlers})`,
        description: 'Group routes by domain and extract to separate modules.',
        file: f.path,
        metric: f.routeHandlers,
        threshold: thresholds.maxRouteHandlers,
        fix: { type: 'refactor', action: 'Extract route groups into src/routes/<domain>.ts', effort: 'medium', linesRecoverable: 0 }
      });
    }
  }
  
  // Duplicate files
  for (const dup of duplicates) {
    issues.push({
      id: `SEN-${++n}`,
      severity: 'warning',
      category: 'duplication',
      title: `Duplicate files: ${dup.files.join(' = ')}`,
      description: `${dup.files.length} identical files, ${dup.lines} wasted lines, ${Math.round(dup.wastedBytes / 1024)}KB wasted`,
      metric: dup.wastedBytes,
      fix: {
        type: 'auto',
        action: `Keep ${dup.files[0]}, remove: ${dup.files.slice(1).join(', ')}`,
        effort: 'trivial',
        linesRecoverable: dup.lines,
        command: dup.files.slice(1).map(f => `rm "${f}"`).join(' && ')
      }
    });
  }
  
  return issues;
}

// ════════════════════════════════════════════════════════════════════
// HEALTH SCORE — "Credit Score" for your codebase
// ════════════════════════════════════════════════════════════════════

function calculateHealth(issues, totalSourceLines, thresholds) {
  // TWO-TIER SCORING: Source architecture (70%) + Static presentation (30%)
  // Source = backend, routes, services — what interviewers actually judge
  // Static = frontend CSS/JS — presentation layer, less architectural weight
  let sourceScore = 100;
  let staticScore = 100;
  
  const sourceIssues = issues.filter(i => i.file && i.file.startsWith('src/'));
  const staticIssues = issues.filter(i => i.file && !i.file.startsWith('src/'));
  const globalIssues = issues.filter(i => !i.file);
  
  // Source: full penalty per issue
  for (const issue of [...sourceIssues, ...globalIssues]) {
    switch (issue.severity) {
      case 'critical': sourceScore -= 15; break;
      case 'warning': sourceScore -= 5; break;
      case 'info': sourceScore -= 2; break;
    }
  }
  
  // Static: lighter penalty per issue (capped at -60 so one huge CSS doesn't kill it)
  let staticPenalty = 0;
  for (const issue of staticIssues) {
    switch (issue.severity) {
      case 'critical': staticPenalty += 3; break;
      case 'warning': staticPenalty += 1.5; break;
    }
  }
  staticScore -= Math.min(60, staticPenalty);
  
  // Bloat budget penalty applies to source score
  const ratio = totalSourceLines / thresholds.maxTotalLines;
  if (ratio > 1.0) sourceScore -= Math.round((ratio - 1) * 30);
  else if (ratio > 0.8) sourceScore -= 5;
  
  sourceScore = Math.max(0, Math.min(100, sourceScore));
  staticScore = Math.max(0, Math.min(100, staticScore));
  
  // Weighted composite: 70% source architecture + 30% static presentation
  const score = Math.round(sourceScore * 0.70 + staticScore * 0.30);
  
  const grade = score >= 95 ? 'A+' : score >= 90 ? 'A' : score >= 85 ? 'A-' :
                score >= 80 ? 'B+' : score >= 75 ? 'B' : score >= 70 ? 'B-' :
                score >= 60 ? 'C' : score >= 50 ? 'D' : 'F';
  
  return { score, grade, sourceScore, staticScore };
}

// ════════════════════════════════════════════════════════════════════
// OPTIMIZATION PLAN
// ════════════════════════════════════════════════════════════════════

function buildOptimizationPlan(issues, files) {
  const steps = [];
  let priority = 0;
  
  // 1. Remove duplicates (easiest)
  const dups = issues.filter(i => i.category === 'duplication');
  for (const d of dups) {
    steps.push({
      priority: ++priority,
      action: d.fix.action,
      impact: `Saves ${d.fix.linesRecoverable} lines`,
      effort: 'trivial',
      command: d.fix.command,
      linesRecoverable: d.fix.linesRecoverable
    });
  }
  
  // 2. Split large files
  const bloated = issues.filter(i => i.category === 'bloat').sort((a, b) => b.metric - a.metric);
  for (const b of bloated) {
    steps.push({
      priority: ++priority,
      action: b.fix.action,
      impact: `Reduces ${b.file} from ${b.metric} to ~${Math.round(b.metric / Math.ceil(b.metric / 500))} lines per module`,
      effort: b.fix.effort,
      linesRecoverable: 0
    });
  }
  
  // 3. Extract routes
  const archIssues = issues.filter(i => i.category === 'architecture');
  for (const a of archIssues) {
    steps.push({
      priority: ++priority,
      action: a.fix.action,
      impact: 'Improves testability, debuggability, and AI comprehension',
      effort: 'medium',
      linesRecoverable: 0
    });
  }
  
  return {
    steps,
    totalRecoverable: steps.reduce((s, st) => s + st.linesRecoverable, 0),
    topPriority: steps[0]?.action || 'No optimizations needed'
  };
}

// ════════════════════════════════════════════════════════════════════
// MAIN: Run full analysis
// ════════════════════════════════════════════════════════════════════

function runSentinel(rootDir, options = {}) {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
  const ignoreList = options.ignore || DEFAULT_IGNORE;
  
  // 1. Scan
  const { files, duplicates } = scanProject(rootDir, ignoreList);
  
  // 2. Compute metrics
  const sourceFiles = files.filter(f => f.category === 'source');
  const staticCodeFiles = files.filter(f => f.category === 'static-code');
  const pageFiles = files.filter(f => f.category === 'page');
  const dataFiles = files.filter(f => f.category === 'data');
  const testFiles = files.filter(f => f.category === 'test');
  
  const totalSourceLines = sourceFiles.reduce((s, f) => s + f.lines, 0);
  const totalStaticLines = staticCodeFiles.reduce((s, f) => s + f.lines, 0);
  const totalPageLines = pageFiles.reduce((s, f) => s + f.lines, 0);
  const totalRouteHandlers = sourceFiles.reduce((s, f) => s + f.routeHandlers, 0);
  
  // Dependencies
  let depCount = 0;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    depCount = Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length;
  } catch {}
  
  const largest = [...sourceFiles, ...staticCodeFiles].sort((a, b) => b.lines - a.lines)[0] || { path: 'none', lines: 0 };
  
  // 3. Detect issues
  const issues = detectIssues(files, duplicates, thresholds);
  
  // 3b. i18n coverage scan
  const i18nResults = scanI18nCoverage(rootDir);
  
  // 4. Score
  const { score, grade, sourceScore, staticScore } = calculateHealth(issues, totalSourceLines, thresholds);
  
  // 5. Optimization plan
  const plan = buildOptimizationPlan(issues, files);
  
  // 6. Build report
  const critical = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const suggestions = issues.filter(i => i.severity === 'info').length;
  
  const bloatPercent = Math.round(totalSourceLines / thresholds.maxTotalLines * 100);
  
  const recommendation = score >= 90 
    ? 'Codebase is healthy. Keep monitoring for drift.'
    : score >= 75 
    ? `Address ${critical} critical issue(s). Focus on splitting large files.`
    : score >= 50 
    ? `Cleanup needed: ${critical} critical, ${warnings} warnings. Start with ${largest.path}.`
    : `Urgent: health is poor. Remove dead code and split monoliths first.`;
  
  const report = {
    engine: 'nw-sentinel',
    version: '1.1.0',
    timestamp: Date.now(),
    project: rootDir,
    
    summary: {
      healthScore: score,
      grade,
      sourceScore,
      staticScore,
      scoring: '70% source architecture + 30% static presentation',
      critical,
      warnings,
      suggestions,
      trend: 'stable',
      recommendation,
      bloatBudget: {
        used: totalSourceLines,
        limit: thresholds.maxTotalLines,
        percent: bloatPercent,
        status: bloatPercent > 100 ? 'OVER_BUDGET' : bloatPercent > 80 ? 'WARNING' : 'OK'
      }
    },
    
    metrics: {
      source: { files: sourceFiles.length, lines: totalSourceLines },
      staticCode: { files: staticCodeFiles.length, lines: totalStaticLines },
      pages: { files: pageFiles.length, lines: totalPageLines },
      data: { files: dataFiles.length },
      tests: { files: testFiles.length },
      totalFiles: files.length,
      averageSourceFileSize: Math.round(totalSourceLines / Math.max(1, sourceFiles.length)),
      largestFile: { path: largest.path, lines: largest.lines },
      routeHandlers: totalRouteHandlers,
      dependencies: depCount,
      duplicateGroups: duplicates.length
    },
    
    issues: issues.map(i => ({
      id: i.id,
      severity: i.severity,
      category: i.category,
      title: i.title,
      file: i.file || null,
      metric: i.metric,
      threshold: i.threshold,
      fix: i.fix
    })),
    
    i18n: {
      summary: i18nResults.summary,
      pages: i18nResults.pages
    },
    
    plan: plan,
    
    topFiles: [...sourceFiles, ...staticCodeFiles]
      .sort((a, b) => b.lines - a.lines)
      .slice(0, 15)
      .map(f => ({
        path: f.path,
        lines: f.lines,
        complexity: f.complexity,
        functions: f.functions,
        routeHandlers: f.routeHandlers,
        category: f.category,
        stale: f.stale
      })),
    
    config: { thresholds, ignore: ignoreList }
  };
  
  return report;
}

// ════════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ════════════════════════════════════════════════════════════════════

function main() {
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf('--root');
  const rootDir = rootIdx >= 0 ? args[rootIdx + 1] : process.cwd();
  const isCI = args.includes('--ci');
  const isJSON = args.includes('--json');
  const showFix = args.includes('--fix');
  const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;
  
  const report = runSentinel(rootDir);
  
  // Always write report JSON for API consumption
  const reportPath = outputFile || path.join(rootDir, 'public', 'static', 'data', 'sentinel-report.json');
  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  } catch (e) {
    console.error(`[SENTINEL] Could not write report: ${e.message}`);
  }
  
  if (isJSON) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    // Pretty console output
    const C = {
      reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
      red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
      blue: '\x1b[36m', white: '\x1b[37m'
    };
    
    console.log(`\n${C.bold}${C.blue}╔══════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.bold}${C.blue}║  NW-SENTINEL v1.0 — Code Health Report                  ║${C.reset}`);
    console.log(`${C.bold}${C.blue}╚══════════════════════════════════════════════════════════╝${C.reset}\n`);
    
    const scoreColor = report.summary.healthScore >= 80 ? C.green : report.summary.healthScore >= 50 ? C.yellow : C.red;
    console.log(`  ${C.bold}Health Score:${C.reset}  ${scoreColor}${report.summary.healthScore}/100 (${report.summary.grade})${C.reset}`);
    console.log(`  ${C.bold}Source Lines:${C.reset}  ${report.metrics.source.lines} / ${report.config.thresholds.maxTotalLines} budget (${report.summary.bloatBudget.percent}%)`);
    console.log(`  ${C.bold}Source Files:${C.reset}  ${report.metrics.source.files}`);
    console.log(`  ${C.bold}Static JS/CSS:${C.reset} ${report.metrics.staticCode.files} files, ${report.metrics.staticCode.lines} lines`);
    console.log(`  ${C.bold}HTML Pages:${C.reset}    ${report.metrics.pages.files} files, ${report.metrics.pages.lines} lines`);
    console.log(`  ${C.bold}Route Handlers:${C.reset}${report.metrics.routeHandlers}`);
    console.log(`  ${C.bold}Dependencies:${C.reset}  ${report.metrics.dependencies}`);
    console.log(`  ${C.bold}Largest File:${C.reset}  ${report.metrics.largestFile.path} (${report.metrics.largestFile.lines} lines)`);
    console.log(`  ${C.bold}Duplicates:${C.reset}    ${report.metrics.duplicateGroups} groups`);
    
    if (report.issues.length > 0) {
      console.log(`\n  ${C.bold}Issues (${report.issues.length}):${C.reset}`);
      for (const issue of report.issues) {
        const icon = issue.severity === 'critical' ? `${C.red}✗` : issue.severity === 'warning' ? `${C.yellow}⚠` : `${C.dim}ℹ`;
        console.log(`    ${icon} [${issue.category}] ${issue.title}${C.reset}`);
        if (issue.fix) console.log(`      ${C.dim}Fix: ${issue.fix.action}${C.reset}`);
      }
    } else {
      console.log(`\n  ${C.green}✓ No issues detected${C.reset}`);
    }
    
    if (showFix && report.plan.steps.length > 0) {
      console.log(`\n  ${C.bold}${C.blue}Optimization Plan:${C.reset}`);
      for (const step of report.plan.steps) {
        console.log(`    ${C.bold}${step.priority}.${C.reset} ${step.action}`);
        console.log(`       ${C.dim}Impact: ${step.impact} | Effort: ${step.effort}${C.reset}`);
        if (step.command) console.log(`       ${C.dim}Command: ${step.command}${C.reset}`);
      }
    }
    
    console.log(`\n  ${C.bold}Recommendation:${C.reset} ${report.summary.recommendation}`);
    console.log(`  ${C.dim}Report saved to: ${reportPath}${C.reset}\n`);
  }
  
  // CI mode: exit non-zero if unhealthy
  if (isCI && report.summary.healthScore < 50) {
    console.error(`\n[SENTINEL] CI GATE FAILED: Health ${report.summary.healthScore} < 50`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for programmatic use
module.exports = { runSentinel, scanProject, detectIssues, calculateHealth, buildOptimizationPlan, scanI18nCoverage };
