#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════
// DEPENDENCY GRAPH MAPPER v1.0
// ═══════════════════════════════════════════════════════════════════
//
// Builds the full import/dependency graph for the codebase:
//   - HTML → JS (script src tags)
//   - HTML → CSS (link href tags)
//   - HTML → data (fetch/XHR to JSON)
//   - JS → JS (window.NW_* global references)
//   - JS → globals (what each JS file exports to window)
//   - Hono API routes (src/*.ts imports)
//
// Output: .mycelium-mined/dependency-graph.json
//
// Why this matters:
//   "If I change nw-battle-engine.js, which 14 pages break?"
//   This graph answers that question — and feeds it to the miner.
//
// Usage:
//   node tools/dependency-graph.cjs              # full build
//   node tools/dependency-graph.cjs --stats      # summary stats
//   node tools/dependency-graph.cjs --impact <file>  # impact analysis
//   node tools/dependency-graph.cjs --silent     # no output
//   node tools/dependency-graph.cjs --json       # JSON output
// ═══════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const STATIC = path.join(PUBLIC, 'static');
const SRC = path.join(ROOT, 'src');
const OUTPUT = path.join(ROOT, '.mycelium-mined', 'dependency-graph.json');
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB safety limit

// ─── Helpers ──────────────────────────────────────────────────────

function readSafe(fp) {
  try {
    const stat = fs.statSync(fp);
    if (stat.size > MAX_FILE_SIZE) return '';
    return fs.readFileSync(fp, 'utf8');
  } catch { return ''; }
}

function walkDir(dir, ext, results = []) {
  try {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walkDir(full, ext, results);
        } else if (ext.some(e => item.endsWith(e))) {
          results.push(full);
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return results;
}

function relPath(fp) {
  return path.relative(ROOT, fp);
}

function staticRelPath(fp) {
  // Normalize to how it appears in HTML: /static/nw-boot.js
  const rel = path.relative(PUBLIC, fp);
  return '/' + rel.replace(/\\/g, '/');
}

// ─── Phase 1: Scan HTML pages for dependencies ──────────────────

function scanHTML(htmlPath) {
  const content = readSafe(htmlPath);
  if (!content) return null;

  const rel = relPath(htmlPath);
  const page = {
    file: rel,
    scripts: [],
    styles: [],
    dataFiles: [],
    inlineGlobals: [],   // NW_* references in inline <script> blocks
    inlineScriptCount: 0,
    totalDeps: 0
  };

  // Extract <script src="..."> tags
  const scriptRe = /<script[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = scriptRe.exec(content)) !== null) {
    let src = m[1].trim();
    // Normalize: remove leading ./ and ensure leading /
    if (src.startsWith('./')) src = src.slice(1);
    if (!src.startsWith('/') && !src.startsWith('http')) src = '/' + src;
    // Skip external CDN scripts
    if (src.startsWith('http')) continue;
    page.scripts.push(src);
  }

  // Extract <link rel="stylesheet" href="..."> tags
  const cssRe = /<link[^>]*\bhref\s*=\s*["']([^"']+\.css[^"']*)["'][^>]*/gi;
  while ((m = cssRe.exec(content)) !== null) {
    let href = m[1].trim();
    if (href.startsWith('./')) href = href.slice(1);
    if (!href.startsWith('/') && !href.startsWith('http')) href = '/' + href;
    if (href.startsWith('http')) continue;
    page.styles.push(href);
  }

  // Extract data file references (fetch, XHR, src attributes to JSON)
  const dataRe = /(?:fetch|XMLHttpRequest|src\s*[:=])\s*['"`]([^'"`]*\.json[^'"`]*)['"`]/gi;
  while ((m = dataRe.exec(content)) !== null) {
    let dp = m[1].trim();
    if (dp.startsWith('./')) dp = dp.slice(1);
    if (!dp.startsWith('/') && !dp.startsWith('http')) dp = '/' + dp;
    if (!dp.startsWith('http')) page.dataFiles.push(dp);
  }
  // Also check for data paths in inline JS
  const dataPathRe = /['"`](\/static\/data\/[^'"`]+\.json)['"`]/g;
  while ((m = dataPathRe.exec(content)) !== null) {
    if (!page.dataFiles.includes(m[1])) page.dataFiles.push(m[1]);
  }

  // Count inline <script> blocks (no src)
  const inlineRe = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = inlineRe.exec(content)) !== null) {
    page.inlineScriptCount++;
    // Extract NW_* global references from inline code
    const globals = m[1].match(/\bNW_[A-Z][A-Z0-9_]*/g);
    if (globals) {
      for (const g of globals) {
        if (!page.inlineGlobals.includes(g)) page.inlineGlobals.push(g);
      }
    }
  }

  page.totalDeps = page.scripts.length + page.styles.length + page.dataFiles.length;
  return page;
}

// ─── Phase 2: Scan JS files for global exports and imports ──────

function scanJS(jsPath) {
  const content = readSafe(jsPath);
  if (!content) return null;

  const rel = relPath(jsPath);
  const staticPath = staticRelPath(jsPath);

  const jsFile = {
    file: rel,
    staticPath: staticPath,
    lines: content.split('\n').length,
    bytes: Buffer.byteLength(content),
    exports: [],     // globals this file defines (window.NW_* = ...)
    imports: [],     // globals this file reads (NW_*.something)
    domQueries: 0,   // document.querySelector/getElementById count
    fetchCalls: 0,   // fetch/XHR calls
    eventListeners: 0
  };

  // What this JS file EXPORTS to the global namespace
  // Patterns: window.NW_FOO = ..., const NW_FOO = ..., var NW_FOO = ...
  let m;
  const exportRe = /(?:window\.)?(NW_[A-Z][A-Z0-9_]*)\s*=\s*(?:\{|class|\(|function|new|window\.|document\.|true|false|null|['"`\d[])/g;
  while ((m = exportRe.exec(content)) !== null) {
    const name = m[1];
    if (!jsFile.exports.includes(name)) jsFile.exports.push(name);
  }
  // Also check: window.NW_X = { ... } (assignment without keyword)
  const windowExportRe = /window\.(NW_[A-Z][A-Z0-9_]*)\s*=/g;
  while ((m = windowExportRe.exec(content)) !== null) {
    if (!jsFile.exports.includes(m[1])) jsFile.exports.push(m[1]);
  }

  // What this JS file IMPORTS (reads) from global namespace
  // Any NW_* reference that's not an export
  const allRefs = content.match(/\bNW_[A-Z][A-Z0-9_]*/g) || [];
  const uniqueRefs = [...new Set(allRefs)];
  jsFile.imports = uniqueRefs.filter(r => !jsFile.exports.includes(r));

  // Complexity signals
  jsFile.domQueries = (content.match(/document\.(querySelector|getElementById|getElementsBy)/g) || []).length;
  jsFile.fetchCalls = (content.match(/\bfetch\s*\(/g) || []).length;
  jsFile.eventListeners = (content.match(/addEventListener\s*\(/g) || []).length;

  return jsFile;
}

// ─── Phase 3: Scan CSS files ────────────────────────────────────

function scanCSS(cssPath) {
  const content = readSafe(cssPath);
  if (!content) return null;

  return {
    file: relPath(cssPath),
    staticPath: staticRelPath(cssPath),
    lines: content.split('\n').length,
    bytes: Buffer.byteLength(content),
    imports: (content.match(/@import\s+[^;]+/g) || []).map(i => i.replace(/@import\s+/, '').replace(/['";]/g, '').trim()),
    selectors: (content.match(/[^{}]+(?=\s*\{)/g) || []).length,
    variables: (content.match(/--[\w-]+\s*:/g) || []).length,
    mediaQueries: (content.match(/@media\s/g) || []).length
  };
}

// ─── Phase 4: Scan Hono API routes (src/) ──────────────────────

function scanSrcRoutes() {
  const routes = [];
  const srcFiles = walkDir(SRC, ['.ts', '.tsx']);

  for (const fp of srcFiles) {
    const content = readSafe(fp);
    if (!content) continue;

    const rel = relPath(fp);
    const imports = [];
    const routeDefs = [];
    let m;

    // ES imports
    const importRe = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    while ((m = importRe.exec(content)) !== null) {
      imports.push(m[1]);
    }

    // Route definitions: app.get('/path', ...) or .get('/path', ...)
    const routeRe = /\.(get|post|put|delete|patch|all)\s*\(\s*['"]([^'"]+)['"]/g;
    while ((m = routeRe.exec(content)) !== null) {
      routeDefs.push({ method: m[1].toUpperCase(), path: m[2] });
    }

    if (imports.length || routeDefs.length) {
      routes.push({ file: rel, imports, routes: routeDefs });
    }
  }
  return routes;
}

// ─── Phase 5: Build the full graph ─────────────────────────────

function buildGraph() {
  const graph = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    pages: [],        // HTML → deps
    jsFiles: [],      // JS → exports/imports
    cssFiles: [],     // CSS metadata
    apiRoutes: [],    // Hono routes
    globalMap: {},    // NW_FOO → { definedIn, usedBy[] }
    reverseGraph: {}, // file → { dependents: pages/files that use it }
    cascadeRisk: [],  // sorted: which files break the most pages if changed
    stats: {}
  };

  // Scan all HTML files
  const htmlFiles = [
    ...walkDir(PUBLIC, ['.html']),
  ];
  for (const fp of htmlFiles) {
    const page = scanHTML(fp);
    if (page) graph.pages.push(page);
  }

  // Scan all JS files
  const jsFiles = walkDir(STATIC, ['.js']);
  for (const fp of jsFiles) {
    const js = scanJS(fp);
    if (js) graph.jsFiles.push(js);
  }

  // Scan all CSS files
  const cssFiles = walkDir(STATIC, ['.css']);
  for (const fp of cssFiles) {
    const css = scanCSS(fp);
    if (css) graph.cssFiles.push(css);
  }

  // Scan API routes
  graph.apiRoutes = scanSrcRoutes();

  // ─── Build global namespace map ────────────────────────────────
  // Map each NW_* global to the JS file that defines it
  for (const js of graph.jsFiles) {
    for (const exp of js.exports) {
      if (!graph.globalMap[exp]) {
        graph.globalMap[exp] = { definedIn: js.staticPath, usedBy: [] };
      }
    }
  }

  // Track which files USE each global
  for (const js of graph.jsFiles) {
    for (const imp of js.imports) {
      if (graph.globalMap[imp]) {
        graph.globalMap[imp].usedBy.push(js.staticPath);
      }
    }
  }
  // Also track HTML inline usage
  for (const page of graph.pages) {
    for (const g of page.inlineGlobals) {
      if (graph.globalMap[g]) {
        graph.globalMap[g].usedBy.push(page.file);
      }
    }
  }

  // ─── Build reverse dependency graph ────────────────────────────
  // For each file, which pages/files depend on it?
  for (const page of graph.pages) {
    for (const script of page.scripts) {
      if (!graph.reverseGraph[script]) graph.reverseGraph[script] = { dependents: [], type: 'js' };
      graph.reverseGraph[script].dependents.push(page.file);
    }
    for (const style of page.styles) {
      if (!graph.reverseGraph[style]) graph.reverseGraph[style] = { dependents: [], type: 'css' };
      graph.reverseGraph[style].dependents.push(page.file);
    }
    for (const df of page.dataFiles) {
      if (!graph.reverseGraph[df]) graph.reverseGraph[df] = { dependents: [], type: 'data' };
      graph.reverseGraph[df].dependents.push(page.file);
    }
  }

  // ─── Also add JS→JS dependency chains to reverse graph ────────
  // If file A imports NW_FOO which is defined in file B, then A depends on B
  for (const js of graph.jsFiles) {
    for (const imp of js.imports) {
      const provider = graph.globalMap[imp];
      if (provider && provider.definedIn !== js.staticPath) {
        const key = provider.definedIn;
        if (!graph.reverseGraph[key]) graph.reverseGraph[key] = { dependents: [], type: 'js' };
        if (!graph.reverseGraph[key].dependents.includes(js.staticPath)) {
          graph.reverseGraph[key].dependents.push(js.staticPath);
        }
      }
    }
  }

  // ─── Compute cascade risk ─────────────────────────────────────
  // For each file in the reverse graph, count TOTAL pages that would break
  // (including transitive dependencies)
  const cascadeCache = {};

  function computeCascade(file, visited = new Set()) {
    if (cascadeCache[file]) return cascadeCache[file];
    if (visited.has(file)) return new Set(); // cycle protection
    visited.add(file);

    const pages = new Set();
    const entry = graph.reverseGraph[file];
    if (!entry) return pages;

    for (const dep of entry.dependents) {
      // If dependent is a page (HTML), add it directly
      if (dep.endsWith('.html')) {
        pages.add(dep);
      } else {
        // It's a JS/CSS file — check what depends on IT
        const transitive = computeCascade(dep, new Set(visited));
        for (const p of transitive) pages.add(p);
      }
    }

    cascadeCache[file] = pages;
    return pages;
  }

  for (const file of Object.keys(graph.reverseGraph)) {
    const affectedPages = computeCascade(file);
    graph.cascadeRisk.push({
      file,
      directDependents: graph.reverseGraph[file].dependents.length,
      cascadePages: affectedPages.size,
      affectedPages: [...affectedPages].sort(),
      type: graph.reverseGraph[file].type
    });
  }

  // Sort by cascade risk (most dangerous first)
  graph.cascadeRisk.sort((a, b) => b.cascadePages - a.cascadePages || b.directDependents - a.directDependents);

  // ─── Compute stats ─────────────────────────────────────────────
  const totalScripts = new Set(graph.pages.flatMap(p => p.scripts));
  const totalStyles = new Set(graph.pages.flatMap(p => p.styles));
  const totalData = new Set(graph.pages.flatMap(p => p.dataFiles));
  const totalGlobals = Object.keys(graph.globalMap);
  const orphanedGlobals = totalGlobals.filter(g => graph.globalMap[g].usedBy.length === 0);
  const highCascade = graph.cascadeRisk.filter(c => c.cascadePages >= 10);

  graph.stats = {
    totalPages: graph.pages.length,
    totalJSFiles: graph.jsFiles.length,
    totalCSSFiles: graph.cssFiles.length,
    totalAPIRoutes: graph.apiRoutes.reduce((sum, r) => sum + r.routes.length, 0),
    uniqueScriptDeps: totalScripts.size,
    uniqueStyleDeps: totalStyles.size,
    uniqueDataDeps: totalData.size,
    totalGlobals: totalGlobals.length,
    orphanedGlobals: orphanedGlobals.length,
    graphEdges: Object.values(graph.reverseGraph).reduce((sum, e) => sum + e.dependents.length, 0),
    highCascadeFiles: highCascade.length,
    maxCascade: graph.cascadeRisk[0]?.cascadePages || 0,
    maxCascadeFile: graph.cascadeRisk[0]?.file || 'none',
    avgDepsPerPage: graph.pages.length ? Math.round(graph.pages.reduce((s, p) => s + p.totalDeps, 0) / graph.pages.length * 10) / 10 : 0,
    avgScriptsPerPage: graph.pages.length ? Math.round(graph.pages.reduce((s, p) => s + p.scripts.length, 0) / graph.pages.length * 10) / 10 : 0,
  };

  return graph;
}

// ─── Impact analysis ────────────────────────────────────────────

function analyzeImpact(graph, targetFile) {
  // Normalize the target file path
  let normalized = targetFile;
  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  if (!normalized.startsWith('/static/') && !normalized.includes('/')) {
    normalized = '/static/' + normalized;
  }

  // Check reverse graph
  const entry = graph.reverseGraph[normalized];
  const cascade = graph.cascadeRisk.find(c => c.file === normalized);

  // Check if it's a page
  const page = graph.pages.find(p => p.file === targetFile || p.file.endsWith(targetFile));

  // Check if it's a JS file with globals
  const jsFile = graph.jsFiles.find(j => j.staticPath === normalized || j.file === targetFile);

  return {
    file: targetFile,
    normalized,
    isPage: !!page,
    isScript: !!jsFile,
    directDependents: entry?.dependents || [],
    cascadePages: cascade?.cascadePages || 0,
    affectedPages: cascade?.affectedPages || [],
    exports: jsFile?.exports || [],
    imports: jsFile?.imports || [],
    // If it's a page, what does it depend on?
    pageDeps: page ? { scripts: page.scripts, styles: page.styles, data: page.dataFiles, globals: page.inlineGlobals } : null,
    // Cross-reference with risk data
    riskContext: {
      type: entry?.type || (page ? 'html' : 'unknown'),
    }
  };
}

// ─── Output ─────────────────────────────────────────────────────

function saveGraph(graph) {
  const dir = path.dirname(OUTPUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(graph, null, 2));
}

function printStats(graph) {
  const s = graph.stats;
  console.log(`\n  [dep-graph] Dependency Graph — ${s.totalPages} pages, ${s.totalJSFiles} JS, ${s.totalCSSFiles} CSS`);
  console.log(`  [dep-graph] ${s.uniqueScriptDeps} unique scripts, ${s.uniqueStyleDeps} styles, ${s.uniqueDataDeps} data files`);
  console.log(`  [dep-graph] ${s.totalGlobals} NW_* globals (${s.orphanedGlobals} orphaned)`);
  console.log(`  [dep-graph] ${s.graphEdges} dependency edges, avg ${s.avgDepsPerPage} deps/page (${s.avgScriptsPerPage} scripts)`);
  console.log(`  [dep-graph] ${s.highCascadeFiles} high-cascade files (10+ pages affected)`);
  console.log(`  [dep-graph] Max cascade: ${s.maxCascadeFile} → ${s.maxCascade} pages`);

  // Top 10 cascade risks
  console.log(`\n  Top 10 cascade risks:`);
  for (const c of graph.cascadeRisk.slice(0, 10)) {
    console.log(`    ${c.file} → ${c.cascadePages} pages (${c.directDependents} direct)`);
  }

  // Orphaned globals
  if (s.orphanedGlobals > 0) {
    const orphans = Object.entries(graph.globalMap)
      .filter(([_, v]) => v.usedBy.length === 0)
      .map(([k, v]) => `${k} (${v.definedIn})`)
      .slice(0, 10);
    console.log(`\n  Orphaned globals (defined but never imported):`);
    for (const o of orphans) console.log(`    ${o}`);
  }

  // Most-connected pages
  const sortedPages = [...graph.pages].sort((a, b) => b.totalDeps - a.totalDeps);
  console.log(`\n  Heaviest pages (most deps):`);
  for (const p of sortedPages.slice(0, 5)) {
    console.log(`    ${p.file}: ${p.totalDeps} deps (${p.scripts.length} JS, ${p.styles.length} CSS, ${p.dataFiles.length} data, ${p.inlineGlobals.length} globals)`);
  }
}

function printImpact(impact) {
  console.log(`\n  [dep-graph] Impact analysis for: ${impact.file}`);
  console.log(`  [dep-graph] Type: ${impact.isPage ? 'HTML page' : impact.isScript ? 'JS script' : 'other'}`);

  if (impact.cascadePages > 0) {
    console.log(`  [dep-graph] CASCADE: changing this file affects ${impact.cascadePages} pages`);
    for (const p of impact.affectedPages.slice(0, 20)) {
      console.log(`    → ${p}`);
    }
  }

  if (impact.exports.length) {
    console.log(`  [dep-graph] Exports: ${impact.exports.join(', ')}`);
  }
  if (impact.imports.length) {
    console.log(`  [dep-graph] Imports: ${impact.imports.join(', ')}`);
  }

  if (impact.pageDeps) {
    console.log(`  [dep-graph] Page depends on:`);
    console.log(`    Scripts: ${impact.pageDeps.scripts.length} — ${impact.pageDeps.scripts.slice(0, 5).join(', ')}`);
    console.log(`    Styles: ${impact.pageDeps.styles.length}`);
    console.log(`    Data: ${impact.pageDeps.data.length}`);
    console.log(`    Globals: ${impact.pageDeps.globals.join(', ') || 'none'}`);
  }

  console.log(`  [dep-graph] Direct dependents: ${impact.directDependents.length}`);
  for (const d of impact.directDependents.slice(0, 10)) {
    console.log(`    ← ${d}`);
  }
}

// ─── CLI ────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const silent = args.includes('--silent');
  const jsonMode = args.includes('--json');
  const statsMode = args.includes('--stats');
  const impactIdx = args.indexOf('--impact');
  const impactTarget = impactIdx >= 0 ? args[impactIdx + 1] : null;

  // Build the graph
  const graph = buildGraph();
  saveGraph(graph);

  if (jsonMode) {
    console.log(JSON.stringify(graph.stats));
    return;
  }

  if (impactTarget) {
    const impact = analyzeImpact(graph, impactTarget);
    if (jsonMode) {
      console.log(JSON.stringify(impact, null, 2));
    } else {
      printImpact(impact);
    }
    return;
  }

  if (statsMode) {
    printStats(graph);
    return;
  }

  if (!silent) {
    const s = graph.stats;
    console.log(`  [dep-graph] Built — ${s.totalPages} pages, ${s.graphEdges} edges, max cascade ${s.maxCascade} (${s.maxCascadeFile})`);
  }
}

main();
