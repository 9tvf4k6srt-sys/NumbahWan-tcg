#!/usr/bin/env node
/**
 * Mycelium Miner v2.0 — Extract breakage patterns from any git repo
 * ==================================================================
 * 
 * The pipeline:
 *   1. EXTRACT  — Walk git log, find fix/revert/bug commits, get diffs
 *   2. ENRICH   — Deep diff analysis + optional LLM for structured root-cause extraction
 *   3. AGGREGATE — Semantic clustering, dedup, frequency ranking → canonical patterns
 *   4. RULES    — Generate actionable "don't do this" prevention rules
 * 
 * Usage:
 *   node mycelium-miner.cjs pipeline <repo-path-or-url> [--limit 500]
 *   node mycelium-miner.cjs extract <repo-path-or-url> [--limit 500]
 *   node mycelium-miner.cjs enrich <extracted.json> [--model gpt-4o-mini]
 *   node mycelium-miner.cjs aggregate <enriched.json> [--min-frequency 2]
 * 
 * Output: .mycelium-mined/ directory with JSON files per stage
 */

'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIG
// ============================================================================

const CONFIG = {
  fixPatterns: [
    /^fix(\(|:|\s)/i,
    /^bug(\(|:|\s)/i,
    /^hotfix(\(|:|\s)/i,
    /^patch(\(|:|\s)/i,
    /^revert(\(|:|\s)/i,
    /\bfix(es|ed)?\b/i,
    /\bbug\b/i,
    /\brevert\b/i,
    /\bregression\b/i,
    /\bbroken\b/i,
    /\bcrash(es|ed|ing)?\b/i,
  ],
  
  ignorePatterns: [
    /^merge\b/i,
    /^bump\b/i,
    /^chore\b/i,
    /\bdependabot\b/i,
    /\brenovate\b/i,
    /\brelease\b/i,
    /^docs?(\(|:|\s)/i,
    /^style(\(|:|\s)/i,
    /^ci(\(|:|\s)/i,
  ],
  
  maxDiffSize: 20000,
  fixChainWindowHours: 72,
  coChangeMinCount: 3,
  hotspotMinChanges: 5,
  llmMaxTokens: 500,
  llmTemperature: 0.1,
  outputDir: '.mycelium-mined',
};

// ============================================================================
// UTILITIES
// ============================================================================

function run(cmd, cwd) {
  try {
    return execSync(cmd, { 
      encoding: 'utf8', 
      maxBuffer: 50 * 1024 * 1024,
      cwd: cwd || process.cwd(),
      timeout: 30000 
    }).trim();
  } catch (e) { return ''; }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJSON(filepath, data) {
  ensureDir(path.dirname(filepath));
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`  → Wrote ${filepath} (${(fs.statSync(filepath).size / 1024).toFixed(1)}KB)`);
}

function readJSON(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function classifyTechnology(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fp = filePath.toLowerCase();
  if (fp.includes('.jsx') || fp.includes('.tsx')) return 'react';
  if (ext === '.vue') return 'vue';
  if (fp.includes('.component.ts')) return 'angular';
  if (ext === '.svelte') return 'svelte';
  if (ext === '.css' || ext === '.scss' || ext === '.less') return 'css';
  if (ext === '.ts') return 'typescript';
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'javascript';
  if (ext === '.py') return 'python';
  if (ext === '.go') return 'go';
  if (ext === '.rs') return 'rust';
  if (ext === '.java') return 'java';
  if (ext === '.html') return 'html';
  if (fp.includes('test') || fp.includes('spec')) return 'test';
  if (fp.includes('.json') || fp.includes('.yaml') || fp.includes('.toml')) return 'config';
  if (fp.includes('docker') || fp.includes('.yml')) return 'infra';
  return 'other';
}

function classifyArea(filePath) {
  const fp = filePath.toLowerCase();
  if (fp.includes('auth')) return 'auth';
  if (fp.includes('api') || fp.includes('route') || fp.includes('endpoint')) return 'api';
  if (fp.includes('component') || fp.includes('ui') || fp.includes('widget')) return 'ui';
  if (fp.includes('.css') || fp.includes('.scss')) return 'styling';
  if (fp.includes('test') || fp.includes('spec')) return 'testing';
  if (fp.includes('i18n') || fp.includes('locale') || fp.includes('lang')) return 'i18n';
  if (fp.includes('model') || fp.includes('schema') || fp.includes('migration')) return 'database';
  if (fp.includes('config') || fp.includes('env')) return 'config';
  if (fp.includes('build') || fp.includes('webpack') || fp.includes('vite')) return 'build';
  if (fp.includes('hook') || fp.includes('middleware')) return 'middleware';
  if (fp.includes('util') || fp.includes('helper') || fp.includes('lib')) return 'utility';
  return 'general';
}

function countTop(arr) {
  const counts = {};
  arr.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}

// ============================================================================
// DEEP DIFF ANALYSIS ENGINE — The core intelligence (no LLM needed)
// ============================================================================

/**
 * Analyzes a unified diff to extract structured change semantics.
 * Returns an object with: what changed, what was removed, what was added,
 * and classified "change atoms" that can be clustered later.
 */
function analyzeDiffDeep(diffText) {
  if (!diffText) return { atoms: [], removedLines: [], addedLines: [], hunks: [] };
  
  const atoms = [];
  const removedLines = [];
  const addedLines = [];
  const hunks = [];
  
  let currentFile = '';
  let hunkRemoved = [];
  let hunkAdded = [];
  
  function flushHunk() {
    if (hunkRemoved.length === 0 && hunkAdded.length === 0) return;
    
    const hunk = {
      file: currentFile,
      removed: [...hunkRemoved],
      added: [...hunkAdded],
      atoms: [],
    };
    
    // Analyze the hunk as a unit (removed → added = transformation)
    const removedText = hunkRemoved.join('\n');
    const addedText = hunkAdded.join('\n');
    
    // --- Detect specific transformation patterns ---
    
    // 1. Script loading order changes
    if (removedText.match(/defer\b/) && !addedText.match(/defer\b/)) {
      hunk.atoms.push({ type: 'removed-defer', detail: 'Removed defer attribute from script tag', severity: 'high' });
    }
    if (!removedText.match(/defer\b/) && addedText.match(/defer\b/)) {
      hunk.atoms.push({ type: 'added-defer', detail: 'Added defer to script, may break load-order dependencies', severity: 'high' });
    }
    if (removedText.match(/async\b/) && !addedText.match(/async\b/)) {
      hunk.atoms.push({ type: 'removed-async-attr', detail: 'Removed async from script tag', severity: 'medium' });
    }
    
    // 2. Script/link reordering (line positions changed)
    const removedScripts = removedText.match(/<script[^>]*src=["']([^"']+)["']/g) || [];
    const addedScripts = addedText.match(/<script[^>]*src=["']([^"']+)["']/g) || [];
    if (removedScripts.length > 0 && addedScripts.length > 0) {
      hunk.atoms.push({ type: 'script-reorder', detail: `Reordered scripts: ${removedScripts.length} removed, ${addedScripts.length} added`, severity: 'high' });
    }
    
    // 3. CSS property changes
    const cssRemovedProps = [...removedText.matchAll(/(\w[\w-]*):\s*([^;]+);/g)].map(m => ({ prop: m[1], val: m[2].trim() }));
    const cssAddedProps = [...addedText.matchAll(/(\w[\w-]*):\s*([^;]+);/g)].map(m => ({ prop: m[1], val: m[2].trim() }));
    for (const added of cssAddedProps) {
      const removed = cssRemovedProps.find(r => r.prop === added.prop && r.val !== added.val);
      if (removed) {
        hunk.atoms.push({ 
          type: 'css-value-change', 
          detail: `Changed ${added.prop}: ${removed.val} → ${added.val}`,
          severity: ['z-index', 'position', 'overflow', 'display'].includes(added.prop) ? 'medium' : 'low'
        });
      }
    }
    
    // 4. overflow: hidden additions/removals
    if (!removedText.includes('overflow') && addedText.match(/overflow\s*:\s*hidden/)) {
      hunk.atoms.push({ type: 'added-overflow-hidden', detail: 'Added overflow:hidden — may clip child elements', severity: 'high' });
    }
    if (removedText.match(/overflow\s*:\s*hidden/) && !addedText.includes('overflow:hidden') && !addedText.includes('overflow: hidden')) {
      hunk.atoms.push({ type: 'removed-overflow-hidden', detail: 'Removed overflow:hidden to fix clipping', severity: 'medium' });
    }
    
    // 5. Null/undefined guard additions
    if (!removedText.match(/\?\./g) && addedText.match(/\?\./g)) {
      const count = (addedText.match(/\?\./g) || []).length;
      hunk.atoms.push({ type: 'added-optional-chaining', detail: `Added ${count} optional chaining operator(s) — null reference fix`, severity: 'medium' });
    }
    if (!removedText.match(/!= ?null|!== ?null|!== ?undefined/) && addedText.match(/!= ?null|!== ?null|!== ?undefined/)) {
      hunk.atoms.push({ type: 'added-null-check', detail: 'Added null/undefined check — was crashing on missing value', severity: 'medium' });
    }
    if (addedText.match(/typeof\s+\w+\s*!==?\s*['"]undefined['"]/) && !removedText.match(/typeof\s+\w+\s*!==?\s*['"]undefined['"]/)) {
      hunk.atoms.push({ type: 'added-typeof-guard', detail: 'Added typeof !== undefined guard — variable was used before definition', severity: 'high' });
    }
    
    // 6. innerHTML vs textContent fixes
    if (removedText.includes('innerHTML') && addedText.includes('textContent')) {
      hunk.atoms.push({ type: 'innerhtml-to-textcontent', detail: 'Replaced innerHTML with textContent — XSS or handler-destruction fix', severity: 'high' });
    }
    if (removedText.includes('innerHTML') && addedText.includes('insertAdjacentHTML')) {
      hunk.atoms.push({ type: 'innerhtml-to-insertadjacent', detail: 'Replaced innerHTML with insertAdjacentHTML — preserving existing DOM handlers', severity: 'high' });
    }
    
    // 7. Event listener fixes
    if (addedText.match(/removeEventListener/) && !removedText.match(/removeEventListener/)) {
      hunk.atoms.push({ type: 'added-event-cleanup', detail: 'Added removeEventListener — was leaking event handlers', severity: 'medium' });
    }
    if (removedText.match(/addEventListener/) && addedText.match(/addEventListener/) && addedText.match(/\{[^}]*once:\s*true/)) {
      hunk.atoms.push({ type: 'added-once-listener', detail: 'Changed to once:true listener — was firing multiple times', severity: 'medium' });
    }
    
    // 8. Async/await changes
    if (!removedText.match(/await\s/) && addedText.match(/await\s/)) {
      hunk.atoms.push({ type: 'added-await', detail: 'Added missing await — was ignoring promise result', severity: 'high' });
    }
    if (removedText.match(/await\s/) && !addedText.match(/await\s/)) {
      hunk.atoms.push({ type: 'removed-await', detail: 'Removed unnecessary await — was blocking execution', severity: 'medium' });
    }
    
    // 9. Error handling additions
    if (!removedText.match(/try\s*\{/) && addedText.match(/try\s*\{/)) {
      hunk.atoms.push({ type: 'added-try-catch', detail: 'Wrapped code in try-catch — was crashing on error', severity: 'medium' });
    }
    if (!removedText.match(/\.catch\(/) && addedText.match(/\.catch\(/)) {
      hunk.atoms.push({ type: 'added-promise-catch', detail: 'Added .catch() — unhandled promise rejection', severity: 'medium' });
    }
    
    // 10. Timeout/timing changes  
    const removedTimeouts = [...removedText.matchAll(/setTimeout[^,]*,\s*(\d+)/g)].map(m => parseInt(m[1]));
    const addedTimeouts = [...addedText.matchAll(/setTimeout[^,]*,\s*(\d+)/g)].map(m => parseInt(m[1]));
    if (removedTimeouts.length > 0 && addedTimeouts.length > 0) {
      hunk.atoms.push({ type: 'changed-timeout', detail: `Changed timeout: ${removedTimeouts[0]}ms → ${addedTimeouts[0]}ms`, severity: 'medium' });
    }
    if (addedTimeouts.length > 0 && removedTimeouts.length === 0) {
      hunk.atoms.push({ type: 'added-timeout', detail: `Added setTimeout(${addedTimeouts[0]}ms) — timing/race condition fix`, severity: 'medium' });
    }
    
    // 11. DOM selector changes
    const removedSelectors = [...removedText.matchAll(/querySelector(?:All)?\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);
    const addedSelectors = [...addedText.matchAll(/querySelector(?:All)?\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);
    if (removedSelectors.length > 0 && addedSelectors.length > 0 && removedSelectors[0] !== addedSelectors[0]) {
      hunk.atoms.push({ type: 'changed-selector', detail: `Changed DOM selector: "${removedSelectors[0]}" → "${addedSelectors[0]}"`, severity: 'low' });
    }
    
    // 12. Import/require changes
    const removedImports = [...removedText.matchAll(/(?:import\s.*from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g)].map(m => m[1] || m[2]);
    const addedImports = [...addedText.matchAll(/(?:import\s.*from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g)].map(m => m[1] || m[2]);
    if (removedImports.length > 0 && addedImports.length > 0) {
      hunk.atoms.push({ type: 'changed-import', detail: `Changed import: ${removedImports[0]} → ${addedImports[0]}`, severity: 'medium' });
    }
    
    // 13. Condition/logic changes
    if (removedText.match(/===?\s*/) && addedText.match(/===?\s*/) && removedText.match(/if\s*\(/) && addedText.match(/if\s*\(/)) {
      hunk.atoms.push({ type: 'changed-condition', detail: 'Modified conditional logic', severity: 'medium' });
    }
    if (!removedText.match(/&&\s*/) && addedText.match(/&&\s*/)) {
      hunk.atoms.push({ type: 'added-guard-clause', detail: 'Added && guard — was executing without prerequisite check', severity: 'medium' });
    }
    
    // 14. Array/object method safety
    if (addedText.match(/\|\|\s*\[\s*\]/) && !removedText.match(/\|\|\s*\[\s*\]/)) {
      hunk.atoms.push({ type: 'added-array-fallback', detail: 'Added || [] fallback — was calling array method on undefined', severity: 'medium' });
    }
    if (addedText.match(/\|\|\s*\{\s*\}/) && !removedText.match(/\|\|\s*\{\s*\}/)) {
      hunk.atoms.push({ type: 'added-object-fallback', detail: 'Added || {} fallback — was accessing property on undefined', severity: 'medium' });
    }
    if (addedText.match(/\|\|\s*['"]/) && !removedText.match(/\|\|\s*['"]/)) {
      hunk.atoms.push({ type: 'added-string-fallback', detail: 'Added string fallback — was showing undefined/null in UI', severity: 'low' });
    }
    
    // 15. Media query / responsive fixes
    if (addedText.match(/@media/) && !removedText.match(/@media/)) {
      hunk.atoms.push({ type: 'added-media-query', detail: 'Added responsive breakpoint — was broken on different screen sizes', severity: 'medium' });
    }
    
    // 16. Z-index wars
    const removedZ = [...removedText.matchAll(/z-index:\s*(\d+)/g)].map(m => parseInt(m[1]));
    const addedZ = [...addedText.matchAll(/z-index:\s*(\d+)/g)].map(m => parseInt(m[1]));
    if (removedZ.length > 0 && addedZ.length > 0 && removedZ[0] !== addedZ[0]) {
      hunk.atoms.push({ type: 'z-index-change', detail: `z-index: ${removedZ[0]} → ${addedZ[0]} — stacking context collision`, severity: 'medium' });
    }
    
    // 17. display/visibility changes
    if (removedText.match(/display:\s*none/) && addedText.match(/display:\s*(flex|grid|block|inline)/)) {
      hunk.atoms.push({ type: 'unhide-element', detail: 'Changed display:none to visible — element was incorrectly hidden', severity: 'low' });
    }
    if (!removedText.match(/display:\s*none/) && addedText.match(/display:\s*none/)) {
      hunk.atoms.push({ type: 'hide-element', detail: 'Added display:none — element was incorrectly visible', severity: 'low' });
    }
    
    // 18. String/template literal fixes
    if (removedText.match(/\+\s*['"]/) && addedText.match(/`[^`]*\$\{/)) {
      hunk.atoms.push({ type: 'concat-to-template', detail: 'Switched from string concat to template literal — concatenation bug', severity: 'low' });
    }
    
    // 19. Return value fixes
    if (!removedText.match(/return\s/) && addedText.match(/return\s/)) {
      hunk.atoms.push({ type: 'added-return', detail: 'Added missing return statement — function was returning undefined', severity: 'high' });
    }
    
    // 20. Boolean logic inversions
    if (removedText.match(/=\s*true/) && addedText.match(/=\s*false/) || 
        removedText.match(/=\s*false/) && addedText.match(/=\s*true/)) {
      hunk.atoms.push({ type: 'boolean-flip', detail: 'Inverted boolean value — logic was backwards', severity: 'medium' });
    }
    
    // 21. Image/asset path fixes
    if ((removedText.includes('src=') || removedText.includes('url(')) && (addedText.includes('src=') || addedText.includes('url('))) {
      const removedUrls = [...removedText.matchAll(/(?:src|href|url\()=?\s*["']?([^"'\s)]+)/g)].map(m => m[1]);
      const addedUrls = [...addedText.matchAll(/(?:src|href|url\()=?\s*["']?([^"'\s)]+)/g)].map(m => m[1]);
      if (removedUrls.length > 0 && addedUrls.length > 0 && removedUrls[0] !== addedUrls[0]) {
        hunk.atoms.push({ type: 'changed-asset-path', detail: `Changed resource path`, severity: 'low' });
      }
    }
    
    // 22. Object-fit changes (image cropping)
    if (removedText.match(/object-fit:\s*cover/) && addedText.match(/object-fit:\s*contain/)) {
      hunk.atoms.push({ type: 'cover-to-contain', detail: 'Changed object-fit: cover → contain — image was being cropped', severity: 'medium' });
    }
    
    // 23. Scroll behavior
    if (addedText.match(/scroll-behavior|scrollIntoView|overflow-y:\s*auto/) && !removedText.match(/scroll-behavior|scrollIntoView/)) {
      hunk.atoms.push({ type: 'added-scroll-behavior', detail: 'Added scroll handling — content was not scrollable or jumping', severity: 'medium' });
    }
    
    // 24. Touch/mobile event fixes
    if (addedText.match(/touch-action|touchstart|touchend|pointer-events/) && !removedText.match(/touch-action|touchstart|touchend/)) {
      hunk.atoms.push({ type: 'added-touch-handling', detail: 'Added touch event handling — broken on mobile', severity: 'medium' });
    }
    
    // 25. localStorage/sessionStorage safety
    if (addedText.match(/try\s*\{[^}]*localStorage|JSON\.parse\([^)]*\|\|/) && !removedText.match(/try\s*\{[^}]*localStorage/)) {
      hunk.atoms.push({ type: 'storage-safety', detail: 'Added storage access safety — was crashing on parse error or missing key', severity: 'medium' });
    }
    
    atoms.push(...hunk.atoms);
    hunks.push(hunk);
    hunkRemoved = [];
    hunkAdded = [];
  }
  
  for (const line of diffText.split('\n')) {
    if (line.startsWith('diff --git')) {
      flushHunk();
      currentFile = line.replace('diff --git a/', '').split(' b/')[0] || '';
    } else if (line.startsWith('@@')) {
      flushHunk();
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      const content = line.slice(1).trim();
      if (content.length >= 3 && content.length <= 500) {
        hunkRemoved.push(content);
        removedLines.push(content);
      }
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      const content = line.slice(1).trim();
      if (content.length >= 3 && content.length <= 500) {
        hunkAdded.push(content);
        addedLines.push(content);
      }
    }
  }
  flushHunk();
  
  return { atoms, removedLines: removedLines.slice(0, 50), addedLines: addedLines.slice(0, 50), hunks };
}

// ============================================================================
// ROOT CAUSE EXTRACTOR — Produces human-readable "what broke and why"
// ============================================================================

/**
 * Given a commit message, body, and deep diff analysis, produce:
 * - rootCause: one sentence explaining what broke
 * - category: classified bug type
 * - pattern: generalizable anti-pattern name (3-5 words)
 * - prevention: actionable rule to prevent recurrence
 * - severity: low/medium/high/critical
 */
function extractRootCause(fc, diffAnalysis) {
  const msg = fc.msg || '';
  const body = fc.body || '';
  const allText = (msg + ' ' + body).toLowerCase();
  const atoms = diffAnalysis.atoms || [];
  
  // ── Priority 1: Extract explicit root cause from commit body ──
  let explicitRootCause = '';
  if (body) {
    const rootCausePatterns = [
      /(?:root cause|PROBLEM|ISSUE|BUG|CAUSE|REASON|because|caused by|the problem was|issue was|was caused|broke because)[:\s]+(.+)/i,
      /(?:was|were)\s+(?:using|calling|setting|passing|loading|missing|broken|incorrectly|not)\s+(.+)/i,
    ];
    for (const pattern of rootCausePatterns) {
      const match = body.match(pattern);
      if (match && match[1]?.trim().length > 10 && !match[1].toLowerCase().startsWith('co-authored')) {
        explicitRootCause = match[1].trim().slice(0, 200);
        break;
      }
    }
  }
  
  // ── Priority 2: Synthesize root cause from diff atoms ──
  let synthesizedRootCause = '';
  let category = 'other';
  let patternName = '';
  let prevention = '';
  let severity = 'medium';
  
  // Sort atoms by severity (high first)
  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedAtoms = [...atoms].sort((a, b) => (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3));
  
  if (sortedAtoms.length > 0) {
    const primary = sortedAtoms[0];
    synthesizedRootCause = primary.detail;
    severity = primary.severity;
    
    // Map atom types to categories and pattern names
    const atomMapping = {
      'removed-defer':           { cat: 'load-order', pat: 'defer-before-dependency', prev: 'Never use defer on scripts that other scripts depend on at load time. If script B calls script A\'s globals, A must load synchronously before B.' },
      'added-defer':             { cat: 'load-order', pat: 'unnecessary-defer', prev: 'Don\'t add defer to scripts that register globals needed by inline code. defer delays execution past DOMContentLoaded.' },
      'removed-async-attr':      { cat: 'load-order', pat: 'async-breaks-order', prev: 'async scripts load out of order. Use defer (ordered) or remove async if execution order matters.' },
      'script-reorder':          { cat: 'load-order', pat: 'script-order-dependency', prev: 'Scripts that call each other\'s globals must load in dependency order. Document the dependency chain in a comment.' },
      'added-overflow-hidden':   { cat: 'css-layout', pat: 'overflow-hidden-clips-children', prev: 'overflow:hidden on a parent silently clips children that extend beyond bounds. Check all child elements before adding it.' },
      'removed-overflow-hidden': { cat: 'css-layout', pat: 'overflow-hidden-clips-children', prev: 'overflow:hidden on a parent silently clips children. Use overflow:visible or overflow:auto to allow content to extend.' },
      'z-index-change':          { cat: 'css-layout', pat: 'z-index-stacking-collision', prev: 'Establish a z-index scale (e.g., content:1, dropdown:100, modal:1000, toast:10000). Never use arbitrary z-index values.' },
      'cover-to-contain':        { cat: 'css-layout', pat: 'object-fit-crops-content', prev: 'object-fit:cover crops images to fill container. Use contain if the full image must be visible (e.g., card art, logos).' },
      'added-optional-chaining': { cat: 'null-reference', pat: 'missing-null-guard', prev: 'Always use optional chaining (?.) when accessing properties on objects that may be undefined, especially DOM queries and API responses.' },
      'added-null-check':        { cat: 'null-reference', pat: 'missing-null-guard', prev: 'Check for null/undefined before accessing properties. Common sources: DOM queries returning null, missing API fields, uninitialized state.' },
      'added-typeof-guard':      { cat: 'null-reference', pat: 'use-before-define', prev: 'Use typeof check before accessing globals that may not be loaded yet. This often indicates a load-order dependency.' },
      'innerhtml-to-textcontent': { cat: 'dom-mutation', pat: 'innerhtml-destroys-handlers', prev: 'innerHTML = ... destroys all event handlers on child elements. Use textContent for text-only updates, or insertAdjacentHTML/replaceWith to preserve siblings.' },
      'innerhtml-to-insertadjacent': { cat: 'dom-mutation', pat: 'innerhtml-destroys-handlers', prev: 'innerHTML destroys event handlers and state on child elements. Use insertAdjacentHTML, createElement, or a templating library instead.' },
      'added-event-cleanup':     { cat: 'dom-mutation', pat: 'event-listener-leak', prev: 'Always pair addEventListener with removeEventListener. Use AbortController or { once: true } to prevent listener accumulation.' },
      'added-once-listener':     { cat: 'dom-mutation', pat: 'duplicate-event-handler', prev: 'Event handlers added in loops or repeated calls accumulate. Use { once: true }, named functions with removeEventListener, or AbortController.' },
      'added-await':             { cat: 'async-timing', pat: 'missing-await', prev: 'Every async function call that returns data you use must be awaited. Missing await causes race conditions where code uses stale/undefined values.' },
      'removed-await':           { cat: 'async-timing', pat: 'unnecessary-await', prev: 'Don\'t await synchronous operations or fire-and-forget calls. Unnecessary await blocks the event loop.' },
      'added-try-catch':         { cat: 'error-handling', pat: 'unhandled-exception', prev: 'Wrap external calls (DOM, fetch, JSON.parse, localStorage) in try-catch. Unhandled exceptions crash the entire function.' },
      'added-promise-catch':     { cat: 'error-handling', pat: 'unhandled-promise-rejection', prev: 'Every .then() chain needs a .catch(). Unhandled rejections crash in strict mode and silently fail otherwise.' },
      'changed-timeout':         { cat: 'async-timing', pat: 'wrong-timing-value', prev: 'Hardcoded timeout values break on slow devices. Prefer requestAnimationFrame, MutationObserver, or event-based triggers over setTimeout.' },
      'added-timeout':           { cat: 'async-timing', pat: 'race-condition-needs-delay', prev: 'If you need setTimeout to fix a bug, you have a race condition. Find the root cause (missing callback, wrong event, load order) instead of papering over it with delays.' },
      'changed-selector':        { cat: 'dom-mutation', pat: 'stale-dom-selector', prev: 'DOM selectors break when HTML structure changes. Use data-testid or data-* attributes for JS-targeted elements instead of CSS class/tag selectors.' },
      'changed-import':          { cat: 'dependency', pat: 'wrong-import-path', prev: 'Use path aliases (@/components) instead of relative paths (../../). Relative paths break when files move.' },
      'added-guard-clause':      { cat: 'null-reference', pat: 'missing-precondition-check', prev: 'Validate prerequisites before executing logic. Check that DOM elements exist, APIs are loaded, and data is present before using them.' },
      'added-array-fallback':    { cat: 'null-reference', pat: 'array-method-on-undefined', prev: 'Always provide a fallback (|| []) before calling .map/.filter/.forEach on values that might be undefined.' },
      'added-object-fallback':   { cat: 'null-reference', pat: 'property-access-on-undefined', prev: 'Always provide a fallback (|| {}) before accessing properties on objects that might be undefined.' },
      'added-string-fallback':   { cat: 'null-reference', pat: 'undefined-in-ui-text', prev: 'Always provide string fallbacks for user-visible text. Undefined/null values display as literal "undefined" or "null" in the UI.' },
      'added-media-query':       { cat: 'mobile-compat', pat: 'missing-responsive-breakpoint', prev: 'Test every UI change at 320px, 768px, and 1024px. Add @media breakpoints for layouts that break at different screen sizes.' },
      'added-touch-handling':    { cat: 'mobile-compat', pat: 'missing-touch-support', prev: 'Desktop-only event handlers (click, hover) don\'t work on mobile. Always test touch interactions and add touch/pointer event handlers.' },
      'unhide-element':          { cat: 'css-layout', pat: 'incorrect-display-none', prev: 'display:none removes elements from layout entirely. Use visibility:hidden or opacity:0 if the element\'s space should be preserved.' },
      'hide-element':            { cat: 'css-layout', pat: 'missing-display-none', prev: 'Elements visible when they shouldn\'t be — check initial state and conditional rendering logic.' },
      'added-return':            { cat: 'logic-error', pat: 'missing-return-statement', prev: 'Functions that compute values must return them. Missing return causes undefined results and silent failures.' },
      'boolean-flip':            { cat: 'logic-error', pat: 'inverted-boolean-logic', prev: 'Double-check boolean conditions after writing them. Inverted logic is the most common and hardest-to-spot bug.' },
      'changed-asset-path':      { cat: 'build-config', pat: 'wrong-asset-path', prev: 'Use path constants or import for assets. Hardcoded paths break when files move or builds change output directories.' },
      'concat-to-template':      { cat: 'logic-error', pat: 'string-concatenation-bug', prev: 'Use template literals instead of string concatenation. Concatenation bugs (missing spaces, wrong order) are harder to spot.' },
      'added-scroll-behavior':   { cat: 'css-layout', pat: 'missing-scroll-handling', prev: 'Long content needs scroll containers. Check overflow behavior when content grows beyond initial viewport.' },
      'storage-safety':          { cat: 'error-handling', pat: 'unsafe-storage-access', prev: 'Wrap localStorage/sessionStorage in try-catch. JSON.parse throws on corrupt data. Storage may be disabled in private browsing.' },
      'css-value-change':        { cat: 'css-layout', pat: 'wrong-css-value', prev: 'CSS value changes should be tested at multiple screen sizes. Check for inherited properties and specificity conflicts.' },
      'changed-condition':       { cat: 'logic-error', pat: 'wrong-conditional-logic', prev: 'Changed conditional logic — verify all branches are correct and edge cases are handled.' },
    };
    
    const mapping = atomMapping[primary.type];
    if (mapping) {
      category = mapping.cat;
      patternName = mapping.pat;
      prevention = mapping.prev;
    }
    
    // If multiple atoms, enrich the root cause
    if (sortedAtoms.length > 1) {
      const others = sortedAtoms.slice(1, 3).map(a => a.detail).join('; ');
      synthesizedRootCause += `. Also: ${others}`;
    }
  }
  
  // ── Priority 3: Fallback to commit message analysis ──
  if (!synthesizedRootCause && !explicitRootCause) {
    // Parse the commit message for clues
    const msgClean = msg.replace(/^(?:fix|bug|hotfix|patch|revert)\s*\([^)]*\)\s*:?\s*/i, '')
                       .replace(/^(?:fix|bug|hotfix|patch|revert)\s*:?\s*/i, '').trim();
    synthesizedRootCause = msgClean;
    
    // Try to categorize from message keywords
    if (allText.includes('i18n') || allText.includes('translat') || allText.includes('locale') || allText.includes('language')) { category = 'i18n'; patternName = 'i18n-missing-translation'; }
    else if (allText.includes('mobile') || allText.includes('responsive') || allText.includes('viewport') || allText.includes('touch')) { category = 'mobile-compat'; patternName = 'mobile-compat-issue'; }
    else if (allText.includes('overlap') || allText.includes('z-index') || allText.includes('overflow') || allText.includes('layout')) { category = 'css-layout'; patternName = 'css-layout-issue'; }
    else if (allText.includes('null') || allText.includes('undefined') || allText.includes('cannot read')) { category = 'null-reference'; patternName = 'null-reference-error'; }
    else if (allText.includes('timing') || allText.includes('race') || allText.includes('async') || allText.includes('order')) { category = 'async-timing'; patternName = 'timing-issue'; }
    else if (allText.includes('api') || allText.includes('endpoint') || allText.includes('fetch') || allText.includes('request')) { category = 'api-contract'; patternName = 'api-contract-issue'; }
    else if (allText.includes('build') || allText.includes('config') || allText.includes('env')) { category = 'build-config'; patternName = 'build-config-issue'; }
    else if (allText.includes('test') || allText.includes('spec') || allText.includes('assert')) { category = 'test-failure'; patternName = 'test-issue'; }
    else if (allText.includes('style') || allText.includes('css') || allText.includes('ui')) { category = 'css-layout'; patternName = 'style-issue'; }
    else if (allText.includes('dom') || allText.includes('element') || allText.includes('render')) { category = 'dom-mutation'; patternName = 'dom-issue'; }
  }
  
  // Final assembly
  const rootCause = explicitRootCause || synthesizedRootCause || msg;
  if (!patternName) patternName = derivePatternFromMessage(msg);
  if (!prevention) prevention = `Review ${category} patterns when modifying ${(fc.technologies || []).join('/')} code.`;
  
  // Adjust severity based on file count and category
  if (fc.fileCount > 8) severity = 'critical';
  else if (fc.fileCount > 4 && severity !== 'high') severity = 'high';
  if (['load-order', 'async-timing'].includes(category) && severity === 'low') severity = 'medium';
  
  return {
    rootCause: rootCause.slice(0, 300),
    category,
    technology: fc.technologies?.[0] || 'unknown',
    pattern: patternName,
    prevention: prevention.slice(0, 500),
    severity,
    confidence: atoms.length > 0 ? Math.min(0.9, 0.5 + atoms.length * 0.1) : (explicitRootCause ? 0.6 : 0.3),
    atoms: sortedAtoms.slice(0, 5).map(a => ({ type: a.type, detail: a.detail })),
  };
}

function derivePatternFromMessage(msg) {
  const cleaned = msg
    .replace(/^(?:fix|bug|hotfix|patch|revert)\s*\([^)]*\)\s*:?\s*/i, '')
    .replace(/^(?:fix|bug|hotfix|patch|revert)\s*:?\s*/i, '')
    .trim().toLowerCase();
  
  // Extract 3-5 meaningful words
  const words = cleaned.split(/[\s,;:]+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'was', 'not', 'with', 'from', 'that', 'this', 'has', 'had'].includes(w))
    .slice(0, 4);
  
  return words.length > 0 ? words.join('-').replace(/[^a-z0-9-]/g, '').slice(0, 40) : 'unknown-fix';
}

// ============================================================================
// STAGE 1: EXTRACT — Walk git log, find fix commits, build raw dataset
// ============================================================================

function extract(repoPath, limit = 500) {
  console.log(`\n═══ STAGE 1: EXTRACT ═══`);
  console.log(`  Repo: ${repoPath}`);
  
  let workDir = repoPath;
  let cloned = false;
  
  if (repoPath.startsWith('http') || repoPath.startsWith('git@')) {
    const repoName = repoPath.split('/').pop().replace('.git', '');
    workDir = path.join(CONFIG.outputDir, '_repos', repoName);
    if (!fs.existsSync(workDir)) {
      console.log(`  Cloning ${repoPath}...`);
      ensureDir(path.dirname(workDir));
      run(`git clone --no-checkout --filter=blob:none "${repoPath}" "${workDir}"`);
      cloned = true;
    } else {
      console.log(`  Using cached clone at ${workDir}`);
    }
  }
  
  const repoName = run('basename $(git rev-parse --show-toplevel)', workDir) || path.basename(workDir);
  const totalCommits = parseInt(run('git rev-list --count HEAD', workDir) || '0');
  const firstDate = run('git log --reverse --format="%ai" | head -1', workDir).slice(0, 10);
  const lastDate = run('git log -1 --format="%ai"', workDir).slice(0, 10);
  
  console.log(`  Repository: ${repoName}`);
  console.log(`  Total commits: ${totalCommits}, scanning last ${limit}`);
  console.log(`  Date range: ${firstDate} → ${lastDate}\n`);
  
  const logRaw = run(`git log --format="%H|%ai|%an|%s" -n ${limit} --no-merges`, workDir);
  if (!logRaw) { console.log('  ERROR: No git log output'); return null; }
  
  const allCommits = logRaw.split('\n').filter(Boolean).map(line => {
    const [hash, date, author, ...msgParts] = line.split('|');
    return { hash, date: date?.slice(0, 10), author, msg: msgParts.join('|') };
  });
  
  console.log(`  Parsed ${allCommits.length} commits`);
  
  const fixCommits = [];
  const allFileChanges = {};
  const commitFiles = {};
  
  for (const commit of allCommits) {
    const isIgnored = CONFIG.ignorePatterns.some(p => p.test(commit.msg));
    if (isIgnored) continue;
    
    const isFix = CONFIG.fixPatterns.some(p => p.test(commit.msg));
    
    const filesRaw = run(`git diff-tree --no-commit-id --name-status -r ${commit.hash}`, workDir);
    const files = filesRaw.split('\n').filter(Boolean).map(line => {
      const [status, ...pathParts] = line.split('\t');
      return { status, path: pathParts.join('\t') };
    }).filter(f => f.path);
    
    commit.files = files;
    commit.fileCount = files.length;
    commitFiles[commit.hash] = files.map(f => f.path);
    
    for (const f of files) {
      allFileChanges[f.path] = (allFileChanges[f.path] || 0) + 1;
    }
    
    if (isFix && files.length > 0 && files.length <= 25) {
      let diff = '';
      try {
        diff = run(`git show ${commit.hash} --no-commit-id --diff-filter=M -p --unified=3`, workDir);
        if (diff.length > CONFIG.maxDiffSize) {
          diff = diff.slice(0, CONFIG.maxDiffSize) + '\n... [truncated]';
        }
      } catch {}
      
      const body = run(`git log -1 "--pretty=format:%b" ${commit.hash}`, workDir);
      
      const technologies = [...new Set(files.map(f => classifyTechnology(f.path)))].filter(t => t !== 'other');
      const areas = [...new Set(files.map(f => classifyArea(f.path)))].filter(a => a !== 'general');
      
      fixCommits.push({
        hash: commit.hash,
        date: commit.date,
        author: commit.author,
        msg: commit.msg,
        body: body?.slice(0, 1000) || '',
        files: files.map(f => f.path),
        fileCount: files.length,
        technologies,
        areas,
        diff: diff.slice(0, 8000),
      });
    }
  }
  
  console.log(`  Found ${fixCommits.length} fix commits (${(fixCommits.length / allCommits.length * 100).toFixed(1)}% fix ratio)`);
  
  // Fix chains
  const fixChains = [];
  for (let i = 1; i < allCommits.length; i++) {
    const curr = allCommits[i];
    const prev = allCommits[i - 1];
    if (!curr.files?.length || !prev.files?.length) continue;
    const isFix = CONFIG.fixPatterns.some(p => p.test(curr.msg));
    if (!isFix) continue;
    const currFiles = new Set(curr.files.map(f => f.path));
    const prevFiles = new Set(prev.files.map(f => f.path));
    const overlap = [...currFiles].filter(f => prevFiles.has(f));
    if (overlap.length > 0) {
      const hoursBetween = (new Date(prev.date) - new Date(curr.date)) / (1000 * 60 * 60);
      if (Math.abs(hoursBetween) <= CONFIG.fixChainWindowHours) {
        fixChains.push({
          breakCommit: prev.hash,
          breakMsg: prev.msg,
          fixCommit: curr.hash,
          fixMsg: curr.msg,
          overlappingFiles: overlap,
          hoursToFix: Math.abs(hoursBetween),
        });
      }
    }
  }
  console.log(`  Detected ${fixChains.length} fix chains`);
  
  // Co-changes
  const coChanges = {};
  for (const commit of allCommits) {
    if (!commit.files || commit.files.length < 2 || commit.files.length > 15) continue;
    const paths = commit.files.map(f => f.path).sort();
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const key = `${paths[i]} <-> ${paths[j]}`;
        coChanges[key] = (coChanges[key] || 0) + 1;
      }
    }
  }
  const significantCoChanges = Object.entries(coChanges)
    .filter(([_, count]) => count >= CONFIG.coChangeMinCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([pair, count]) => ({ pair, count }));
  console.log(`  Found ${significantCoChanges.length} significant co-change pairs`);
  
  // Hotspots — filter out deleted/nonexistent files
  const hotspots = Object.entries(allFileChanges)
    .filter(([file, count]) => {
      if (count < CONFIG.hotspotMinChanges) return false;
      // Filter out files that no longer exist (deleted, renamed, archived)
      try { return fs.existsSync(path.resolve(workDir, file)); } catch { return true; }
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([file, changes]) => {
      const fixCount = fixCommits.filter(fc => fc.files.includes(file)).length;
      const affectedPatterns = fixCommits
        .filter(fc => fc.files.includes(file))
        .map(fc => fc.msg?.replace(/^(?:fix|bug|hotfix)\s*\([^)]*\)\s*:?\s*/i, '').slice(0, 60));
      return { file, changes, fixCount, fixRatio: +(fixCount / changes).toFixed(3), topIssues: [...new Set(affectedPatterns)].slice(0, 3) };
    });
  console.log(`  Found ${hotspots.length} hotspot files`);
  
  const result = {
    meta: { repo: repoName, repoPath, totalCommits, analyzedCommits: allCommits.length, dateRange: { first: firstDate, last: lastDate }, extractedAt: new Date().toISOString(), version: '2.0' },
    fixCommits,
    fixChains,
    coChanges: significantCoChanges,
    hotspots,
    summary: {
      totalFixCommits: fixCommits.length,
      fixRatio: +(fixCommits.length / allCommits.length).toFixed(3),
      totalFixChains: fixChains.length,
      topTechnologies: countTop(fixCommits.flatMap(fc => fc.technologies)),
      topAreas: countTop(fixCommits.flatMap(fc => fc.areas)),
    },
  };
  
  const outPath = path.join(CONFIG.outputDir, `${repoName}-extracted.json`);
  writeJSON(outPath, result);
  return result;
}

// ============================================================================
// STAGE 2: ENRICH — Deep diff analysis + optional LLM
// ============================================================================

async function enrich(extractedPath, options = {}) {
  console.log(`\n═══ STAGE 2: ENRICH ═══`);
  
  const data = readJSON(extractedPath);
  console.log(`  Loaded ${data.fixCommits.length} fix commits from ${data.meta.repo}`);
  
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = options.model || 'gpt-4o-mini';
  const useLLM = !!apiKey;
  
  if (!useLLM) {
    console.log('  No OPENAI_API_KEY — using deep diff analysis (local, no LLM)');
  } else {
    console.log(`  LLM available: ${model} — will use for ambiguous cases`);
  }
  
  const enriched = [];
  let llmCount = 0, localCount = 0, deepCount = 0;
  
  for (let i = 0; i < data.fixCommits.length; i++) {
    const fc = data.fixCommits[i];
    
    // Deep diff analysis (always run)
    const diffAnalysis = analyzeDiffDeep(fc.diff);
    const localResult = extractRootCause(fc, diffAnalysis);
    
    let enrichment = localResult;
    let enrichedBy = 'deep-diff';
    
    if (diffAnalysis.atoms.length > 0) {
      deepCount++;
    }
    
    // Use LLM only if local analysis is low-confidence AND LLM is available
    if (useLLM && localResult.confidence < 0.5 && fc.diff) {
      try {
        const llmResult = await callLLM(apiKey, baseUrl, model, buildEnrichmentPrompt(fc));
        if (llmResult && llmResult.rootCause && llmResult.rootCause.length > 10) {
          enrichment = { ...llmResult, atoms: localResult.atoms };
          enrichedBy = 'llm';
          llmCount++;
        }
      } catch (e) {
        // Fall through to local result
      }
    }
    
    if (enrichedBy !== 'llm') localCount++;
    
    enriched.push({
      hash: fc.hash,
      date: fc.date,
      author: fc.author,
      msg: fc.msg,
      body: fc.body,
      files: fc.files,
      fileCount: fc.fileCount,
      technologies: fc.technologies,
      areas: fc.areas,
      // Flatten enrichment to top-level for queryability
      rootCause: enrichment.rootCause || null,
      category: enrichment.category || null,
      severity: enrichment.severity || null,
      pattern: enrichment.pattern || null,
      prevention: enrichment.prevention || null,
      technology: enrichment.technology || fc.technologies?.[0] || null,
      confidence: enrichment.confidence || 0,
      atoms: (enrichment.atoms || []).slice(0, 5),
      enrichedBy,
    });
    
    if ((i + 1) % 10 === 0 || i === data.fixCommits.length - 1) {
      process.stdout.write(`  [${i + 1}/${data.fixCommits.length}] deep-diff: ${deepCount}, llm: ${llmCount}, msg-only: ${localCount - deepCount}\r`);
    }
  }
  
  console.log(`\n  Enrichment complete: ${deepCount} deep-diff, ${llmCount} LLM, ${localCount - deepCount} message-only`);
  
  const result = {
    ...data,
    fixCommits: enriched,
    enrichmentMeta: {
      model: useLLM ? model : 'deep-diff-v2',
      enrichedAt: new Date().toISOString(),
      totalEnriched: enriched.length,
      deepDiffEnriched: deepCount,
      llmEnriched: llmCount,
      messageOnlyEnriched: localCount - deepCount,
    },
  };
  
  const outPath = extractedPath.replace('-extracted.json', '-enriched.json');
  writeJSON(outPath, result);
  return result;
}

function buildEnrichmentPrompt(fc) {
  return `Analyze this bug-fix commit and extract a structured breakage record.

COMMIT: ${fc.msg}
${fc.body ? `BODY: ${fc.body.slice(0, 300)}` : ''}
FILES: ${fc.files.slice(0, 8).join(', ')}
TECHNOLOGIES: ${(fc.technologies || []).join(', ')}

DIFF (excerpt):
${(fc.diff || '').slice(0, 2000)}

Return ONLY valid JSON:
{
  "rootCause": "One sentence: what exactly broke and why",
  "category": "One of: load-order, async-timing, dom-mutation, css-layout, state-management, null-reference, api-contract, mobile-compat, build-config, race-condition, error-handling, i18n, dependency, test-failure, logic-error, performance, other",
  "technology": "Primary technology (react, vue, css, node, typescript, javascript, python, etc)",
  "pattern": "3-5 word anti-pattern name like: defer-before-dependency, innerHTML-destroys-handlers, overflow-hidden-clips-children",
  "prevention": "One actionable sentence: what rule prevents this bug class",
  "severity": "low, medium, high, critical",
  "confidence": 0.0 to 1.0
}`;
}

async function callLLM(apiKey, baseUrl, model, prompt) {
  const url = `${baseUrl}/chat/completions`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You analyze bug-fix commits and extract generalizable breakage patterns. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: CONFIG.llmMaxTokens,
      temperature: CONFIG.llmTemperature,
    }),
  });
  if (!resp.ok) throw new Error(`LLM API ${resp.status}`);
  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) return null;
  const cleaned = content.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

// ============================================================================
// STAGE 3: AGGREGATE — Semantic clustering → canonical patterns → rules
// ============================================================================

function aggregate(enrichedPath, options = {}) {
  console.log(`\n═══ STAGE 3: AGGREGATE ═══`);
  
  const data = readJSON(enrichedPath);
  const commits = data.fixCommits || [];
  const minFrequency = options.minFrequency || 2;
  
  console.log(`  Loaded ${commits.length} enriched fix commits`);
  
  // ── Group by pattern name (primary clustering key) ──
  const patternGroups = {};
  
  for (const fc of commits) {
    // Support both flattened (v3) and nested (v2) enrichment
    const e = fc.rootCause ? fc : (fc.enrichment || {});
    const patternKey = normalizePattern(e.pattern || 'unknown-fix');
    
    if (!patternGroups[patternKey]) {
      patternGroups[patternKey] = {
        pattern: patternKey,
        commits: [],
        categories: {},
        technologies: {},
        rootCauses: [],
        preventions: [],
        severities: {},
        atoms: [],
      };
    }
    
    const group = patternGroups[patternKey];
    group.commits.push({ hash: fc.hash, msg: fc.msg, date: fc.date, repo: data.meta?.repo });
    
    const cat = e.category || 'other';
    group.categories[cat] = (group.categories[cat] || 0) + 1;
    
    const tech = e.technology || 'unknown';
    group.technologies[tech] = (group.technologies[tech] || 0) + 1;
    
    if (e.rootCause && e.rootCause.length > 10 && !e.rootCause.toLowerCase().startsWith('co-authored')) {
      group.rootCauses.push(e.rootCause);
    }
    if (e.prevention && e.prevention.length > 15) {
      group.preventions.push(e.prevention);
    }
    
    const sev = e.severity || 'medium';
    group.severities[sev] = (group.severities[sev] || 0) + 1;
    
    if (e.atoms) group.atoms.push(...e.atoms);
  }
  
  // ── Merge similar patterns (fuzzy dedup) ──
  const mergedGroups = mergeSimilarPatterns(Object.values(patternGroups));
  
  // ── Build canonical patterns (only those meeting frequency threshold) ──
  const canonicalPatterns = mergedGroups
    .filter(g => g.commits.length >= minFrequency)
    .sort((a, b) => b.commits.length - a.commits.length)
    .map(group => {
      const primaryCategory = topKey(group.categories);
      const primaryTechnology = topKey(group.technologies);
      const primarySeverity = topKey(group.severities);
      
      // Select best root cause (most specific, not a commit message)
      const bestRootCause = selectBestText(group.rootCauses);
      
      // Select best prevention rule
      const bestPrevention = selectBestText(group.preventions);
      
      // Generate the actionable rule
      const rule = generateActionableRule(group, bestRootCause, bestPrevention, primaryCategory, primaryTechnology);
      
      // Collect affected files from example commits
      const affectedFiles = [...new Set(
        group.commits.flatMap(c => {
          const commit = commits.find(fc => fc.hash === c.hash);
          return (commit?.files || []).filter(f => !f.includes('.mycelium') && !f.includes('memory.json'));
        })
      )].slice(0, 20);

      return {
        id: `MCL-${group.pattern.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 30)}`,
        pattern: group.pattern,
        frequency: group.commits.length,
        category: primaryCategory,
        technology: primaryTechnology,
        severity: primarySeverity,
        rootCause: bestRootCause,
        prevention: bestPrevention,
        rule,
        affectedFiles,
        exampleCommits: group.commits.slice(0, 5),
        allCategories: group.categories,
        allTechnologies: group.technologies,
        atomTypes: [...new Set(group.atoms.map(a => a.type))],
      };
    });
  
  console.log(`  Generated ${canonicalPatterns.length} canonical patterns (min frequency: ${minFrequency})`);
  
  // ── Also generate "singleton" insights (frequency 1 but high-confidence) ──
  const singletonInsights = mergedGroups
    .filter(g => g.commits.length < minFrequency && g.atoms.length > 0)
    .sort((a, b) => b.atoms.length - a.atoms.length)
    .slice(0, 20)
    .map(group => {
      const bestRootCause = selectBestText(group.rootCauses);
      const bestPrevention = selectBestText(group.preventions);
      return {
        pattern: group.pattern,
        rootCause: bestRootCause,
        prevention: bestPrevention,
        category: topKey(group.categories),
        commit: group.commits[0],
      };
    });
  
  // ── Category breakdown ──
  const categoryBreakdown = {};
  for (const fc of commits) {
    const cat = fc.category || fc.enrichment?.category || 'other';
    if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { count: 0, patterns: {} };
    categoryBreakdown[cat].count++;
    const pat = fc.pattern || fc.enrichment?.pattern || 'unknown';
    categoryBreakdown[cat].patterns[pat] = (categoryBreakdown[cat].patterns[pat] || 0) + 1;
  }
  for (const cat of Object.values(categoryBreakdown)) {
    cat.percentage = +((cat.count / commits.length) * 100).toFixed(1);
  }
  
  // ── Output ──
  const result = {
    meta: { ...data.meta, aggregatedAt: new Date().toISOString(), minFrequency, version: '2.0' },
    summary: {
      totalFixCommits: commits.length,
      uniquePatterns: canonicalPatterns.length,
      totalRules: canonicalPatterns.length,
      singletonInsights: singletonInsights.length,
      categoryBreakdown,
    },
    patterns: canonicalPatterns,
    singletonInsights,
    hotspots: data.hotspots,
    coChanges: data.coChanges,
    fixChains: data.fixChains,
  };
  
  const outPath = enrichedPath.replace('-enriched.json', '-patterns.json');
  writeJSON(outPath, result);
  
  // Write human-readable rules
  const rulesPath = enrichedPath.replace('-enriched.json', '-rules.md');
  writeRulesMarkdown(rulesPath, result);
  
  // Write machine-readable pre-commit rules
  const precommitPath = enrichedPath.replace('-enriched.json', '-precommit-rules.json');
  writePrecommitRules(precommitPath, result);
  
  // Print summary
  console.log(`\n  ═══ TOP BREAKAGE PATTERNS ═══`);
  for (const p of canonicalPatterns.slice(0, 10)) {
    console.log(`  [${p.frequency}x] ${p.pattern} (${p.category}/${p.technology})`);
    console.log(`       ${p.rule.slice(0, 120)}`);
  }
  
  if (singletonInsights.length > 0) {
    console.log(`\n  ═══ NOTABLE SINGLETON INSIGHTS ═══`);
    for (const s of singletonInsights.slice(0, 5)) {
      console.log(`  [1x] ${s.pattern}: ${s.rootCause.slice(0, 100)}`);
    }
  }
  
  return result;
}

function normalizePattern(name) {
  return (name || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function topKey(obj) {
  const entries = Object.entries(obj || {});
  if (entries.length === 0) return 'unknown';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function selectBestText(texts) {
  if (!texts || texts.length === 0) return '';
  // Prefer longer, more specific texts that aren't just commit message fragments
  return texts
    .filter(t => t && t.length > 10 && !t.startsWith('Co-authored'))
    .sort((a, b) => {
      // Score by: length (capped), specificity (has technical terms), actionability
      const scoreA = Math.min(a.length, 200) + (a.includes('because') ? 10 : 0) + (a.match(/\b(null|undefined|defer|async|overflow|z-index|import|selector)\b/i) ? 15 : 0);
      const scoreB = Math.min(b.length, 200) + (b.includes('because') ? 10 : 0) + (b.match(/\b(null|undefined|defer|async|overflow|z-index|import|selector)\b/i) ? 15 : 0);
      return scoreB - scoreA;
    })[0] || texts[0] || '';
}

/**
 * Merge pattern groups that are semantically similar.
 * E.g., "missing-null-guard" and "null-reference-error" should merge.
 */
function mergeSimilarPatterns(groups) {
  // Build merge map based on known synonyms
  const synonyms = {
    'missing-null-guard': ['null-reference-error', 'null-guard', 'undefined-check', 'optional-chaining'],
    'use-before-define': ['load-order-dependency', 'undefined-variable'],
    'defer-before-dependency': ['script-defer-issue', 'defer-breaks-loading'],
    'overflow-hidden-clips-children': ['overflow-clips', 'overflow-hidden-bug'],
    'innerhtml-destroys-handlers': ['innerhtml-bug', 'dom-handler-loss'],
    'missing-await': ['async-await-bug', 'promise-not-awaited'],
    'z-index-stacking-collision': ['z-index-war', 'z-index-issue', 'stacking-context'],
    'css-layout-issue': ['style-issue', 'layout-bug'],
    'mobile-compat-issue': ['responsive-bug', 'mobile-bug'],
  };
  
  // Build reverse map
  const mergeTarget = {};
  for (const [canonical, syns] of Object.entries(synonyms)) {
    mergeTarget[canonical] = canonical;
    for (const s of syns) mergeTarget[s] = canonical;
  }
  
  // Merge
  const merged = {};
  for (const group of groups) {
    const target = mergeTarget[group.pattern] || group.pattern;
    
    if (!merged[target]) {
      merged[target] = { ...group, pattern: target };
    } else {
      const m = merged[target];
      m.commits.push(...group.commits);
      for (const [k, v] of Object.entries(group.categories)) m.categories[k] = (m.categories[k] || 0) + v;
      for (const [k, v] of Object.entries(group.technologies)) m.technologies[k] = (m.technologies[k] || 0) + v;
      for (const [k, v] of Object.entries(group.severities)) m.severities[k] = (m.severities[k] || 0) + v;
      m.rootCauses.push(...group.rootCauses);
      m.preventions.push(...group.preventions);
      m.atoms.push(...group.atoms);
    }
  }
  
  return Object.values(merged);
}

/**
 * Generate an actionable "don't do this" rule.
 * The rule should be copy-pasteable into a CLAUDE.md or .cursor/rules file.
 */
function generateActionableRule(group, rootCause, prevention, category, technology) {
  // Priority 1: Use the prevention if it's specific
  if (prevention && prevention.length > 30 && !prevention.includes('unknown') && !prevention.startsWith('Review ') && !prevention.startsWith('Avoid ')) {
    return prevention;
  }
  
  // Priority 2: Generate from root cause
  if (rootCause && rootCause.length > 20) {
    const actionVerbs = {
      'load-order': 'Ensure scripts load in dependency order.',
      'async-timing': 'Await all async calls that produce values you use.',
      'dom-mutation': 'Preserve event handlers when updating DOM.',
      'css-layout': 'Test layout at 320px, 768px, 1024px after CSS changes.',
      'null-reference': 'Guard against null/undefined before property access.',
      'state-management': 'Verify state updates propagate to all consumers.',
      'api-contract': 'Validate API response shape before accessing fields.',
      'mobile-compat': 'Test on mobile Safari and Chrome after UI changes.',
      'build-config': 'Verify build output matches expected file structure.',
      'error-handling': 'Wrap external calls in try-catch with meaningful fallbacks.',
      'i18n': 'Ensure all user-visible strings go through the translation system.',
      'logic-error': 'Add unit tests for edge cases in conditional logic.',
      'dependency': 'Pin dependency versions and test after upgrades.',
    };
    
    const actionSuffix = actionVerbs[category] || 'Review carefully before committing.';
    return `${rootCause.slice(0, 150)}. RULE: ${actionSuffix}`;
  }
  
  // Priority 3: Generic but category-specific
  const genericRules = {
    'load-order': 'Scripts that depend on each other must load in order. Never use defer/async on scripts that register globals needed by other scripts.',
    'async-timing': 'Missing await causes race conditions. Every async call that returns data you need must be awaited.',
    'dom-mutation': 'innerHTML destroys child event handlers. Use textContent, insertAdjacentHTML, or createElement instead.',
    'css-layout': 'CSS changes break at different viewport sizes. Always test at 320px (mobile), 768px (tablet), and 1024px (desktop).',
    'null-reference': 'Always check for null/undefined before accessing properties. Use optional chaining (?.) and nullish coalescing (??).',
    'error-handling': 'External calls (fetch, DOM queries, JSON.parse, storage) can fail. Always wrap in try-catch.',
    'mobile-compat': 'Desktop interactions (hover, right-click) don\'t exist on mobile. Test touch interactions separately.',
    'i18n': 'User-visible strings must go through the translation system. Hardcoded strings break when users switch languages.',
  };
  
  return genericRules[category] || `Pattern "${group.pattern}" has caused ${group.commits.length} breakages. Review ${category}/${technology} code carefully.`;
}

// ============================================================================
// OUTPUT GENERATORS
// ============================================================================

function writeRulesMarkdown(filepath, data) {
  const patterns = data.patterns || [];
  const singletons = data.singletonInsights || [];
  
  let md = `# Mycelium Mined Rules — ${data.meta.repo}\n`;
  md += `> Generated ${data.meta.aggregatedAt} | ${data.summary.totalFixCommits} fix commits analyzed | v2.0\n\n`;
  
  md += `## Quick Stats\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Fix commits analyzed | ${data.summary.totalFixCommits} |\n`;
  md += `| Recurring patterns | ${data.summary.uniquePatterns} |\n`;
  md += `| Singleton insights | ${data.summary.singletonInsights} |\n`;
  md += `| Fix chains detected | ${data.fixChains?.length || 0} |\n`;
  md += `| Hotspot files | ${data.hotspots?.length || 0} |\n\n`;
  
  // Category breakdown
  md += `## Bug Categories\n\n`;
  const sortedCats = Object.entries(data.summary.categoryBreakdown || {}).sort((a, b) => b[1].count - a[1].count);
  for (const [cat, info] of sortedCats) {
    const bar = '█'.repeat(Math.max(1, Math.round(info.percentage / 5)));
    md += `- **${cat}** ${bar} ${info.count} (${info.percentage}%)\n`;
  }
  
  // Prevention rules — the core value
  md += `\n## Prevention Rules\n\n`;
  md += `> Copy these into your CLAUDE.md, .cursor/rules, or CI checks\n\n`;
  
  for (const p of patterns) {
    md += `### ${p.id}\n`;
    md += `**${p.pattern}** — ${p.frequency} occurrences | ${p.severity} severity | ${p.category}\n\n`;
    md += `> ${p.rule}\n\n`;
    if (p.rootCause && p.rootCause !== p.rule) {
      md += `Root cause: ${p.rootCause}\n\n`;
    }
    md += `Example commits:\n`;
    for (const c of p.exampleCommits.slice(0, 3)) {
      md += `- \`${c.hash.slice(0, 7)}\` ${c.msg.slice(0, 80)} (${c.date})\n`;
    }
    md += `\n---\n\n`;
  }
  
  // Singleton insights
  if (singletons.length > 0) {
    md += `## One-Time Insights\n\n`;
    md += `> These happened once but had high-confidence diff analysis\n\n`;
    for (const s of singletons) {
      md += `- **${s.pattern}** (${s.category}): ${s.rootCause.slice(0, 120)}\n`;
      if (s.prevention) md += `  → ${s.prevention.slice(0, 120)}\n`;
    }
    md += `\n`;
  }
  
  // Hotspots
  md += `## Hotspot Files (High Bug Density)\n\n`;
  md += `| File | Changes | Fixes | Fix Rate |\n|------|---------|-------|----------|\n`;
  for (const h of (data.hotspots || []).filter(h => h.fixRatio > 0).slice(0, 20)) {
    const emoji = h.fixRatio >= 0.4 ? '🔴' : h.fixRatio >= 0.2 ? '🟡' : '🟢';
    md += `| ${emoji} ${h.file} | ${h.changes} | ${h.fixCount} | ${(h.fixRatio * 100).toFixed(0)}% |\n`;
  }
  
  // Co-changes
  md += `\n## Coupling Map (Files That Break Together)\n\n`;
  for (const c of (data.coChanges || []).slice(0, 15)) {
    md += `- ${c.pair} — ${c.count}x co-changed\n`;
  }
  
  ensureDir(path.dirname(filepath));
  fs.writeFileSync(filepath, md);
  console.log(`  → Wrote ${filepath}`);
}

/**
 * Write machine-readable pre-commit rules that can be consumed by:
 * - Mycelium pre-commit hook
 * - Custom CI checks
 * - IDE plugins
 */
function writePrecommitRules(filepath, data) {
  const rules = (data.patterns || []).map(p => ({
    id: p.id,
    pattern: p.pattern,
    category: p.category,
    severity: p.severity,
    frequency: p.frequency,
    rule: p.rule,
    // Which files/patterns trigger this rule
    triggers: {
      filePatterns: extractFilePatternsFromCommits(p.exampleCommits),
      diffPatterns: p.atomTypes || [],
      keywords: extractKeywords(p.pattern, p.rootCause),
    },
  }));
  
  const output = {
    version: '2.0',
    generatedAt: new Date().toISOString(),
    repo: data.meta.repo,
    totalRules: rules.length,
    rules,
    // Hotspot files — warn when these are modified
    hotspotWarnings: (data.hotspots || [])
      .filter(h => h.fixRatio >= 0.3)
      .map(h => ({
        file: h.file,
        fixRate: h.fixRatio,
        message: `⚠ ${h.file} has a ${(h.fixRatio * 100).toFixed(0)}% fix rate (${h.fixCount}/${h.changes} changes are fixes). Extra review recommended.`,
      })),
    // Coupling warnings — warn when one file changes without its pair
    couplingWarnings: (data.coChanges || [])
      .filter(c => c.count >= 5)
      .map(c => {
        const [fileA, fileB] = c.pair.split(' <-> ');
        return {
          fileA, fileB, coChangeCount: c.count,
          message: `${fileA} and ${fileB} change together ${c.count}x. If you modify one, check the other.`,
        };
      }),
  };
  
  ensureDir(path.dirname(filepath));
  fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
  console.log(`  → Wrote ${filepath} (pre-commit rules)`);
}

function extractFilePatternsFromCommits(commits) {
  const exts = {};
  for (const c of commits || []) {
    // We don't have files on example commits, so derive from patterns
  }
  return [];
}

function extractKeywords(pattern, rootCause) {
  const text = (pattern + ' ' + (rootCause || '')).toLowerCase();
  const keywords = [];
  if (text.includes('defer')) keywords.push('defer');
  if (text.includes('async') || text.includes('await')) keywords.push('async', 'await');
  if (text.includes('innerhtml')) keywords.push('innerHTML');
  if (text.includes('null') || text.includes('undefined')) keywords.push('null', 'undefined');
  if (text.includes('overflow')) keywords.push('overflow');
  if (text.includes('z-index')) keywords.push('z-index');
  if (text.includes('import') || text.includes('require')) keywords.push('import', 'require');
  if (text.includes('event')) keywords.push('addEventListener', 'removeEventListener');
  if (text.includes('timeout') || text.includes('timer')) keywords.push('setTimeout', 'setInterval');
  if (text.includes('i18n') || text.includes('translat')) keywords.push('i18n', 'translate');
  if (text.includes('mobile') || text.includes('touch')) keywords.push('touch', 'mobile');
  return [...new Set(keywords)];
}

// ============================================================================
// FULL PIPELINE
// ============================================================================

async function pipeline(repoPath, options = {}) {
  console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
  console.log(`║  MYCELIUM MINER v2.0 — "Git history → Don't-do-this knowledge" ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);
  
  const start = Date.now();
  
  const extracted = extract(repoPath, options.limit || 500);
  if (!extracted) { console.error('Extraction failed'); process.exit(1); }
  
  const extractedPath = path.join(CONFIG.outputDir, `${extracted.meta.repo}-extracted.json`);
  const enriched = await enrich(extractedPath, options);
  
  const enrichedPath = path.join(CONFIG.outputDir, `${extracted.meta.repo}-enriched.json`);
  const aggregated = aggregate(enrichedPath, options);
  
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  
  console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
  console.log(`║  PIPELINE COMPLETE — ${elapsed}s`);
  console.log(`╠══════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Fix commits:       ${String(aggregated.summary.totalFixCommits).padEnd(42)}║`);
  console.log(`║  Recurring patterns: ${String(aggregated.summary.uniquePatterns).padEnd(41)}║`);
  console.log(`║  Singleton insights: ${String(aggregated.summary.singletonInsights).padEnd(41)}║`);
  console.log(`║  Pre-commit rules:   ${String(aggregated.summary.totalRules).padEnd(41)}║`);
  console.log(`╠══════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Outputs:                                                       ║`);
  console.log(`║    ${CONFIG.outputDir}/${extracted.meta.repo}-patterns.json`.padEnd(65) + `║`);
  console.log(`║    ${CONFIG.outputDir}/${extracted.meta.repo}-rules.md`.padEnd(65) + `║`);
  console.log(`║    ${CONFIG.outputDir}/${extracted.meta.repo}-precommit-rules.json`.padEnd(65) + `║`);
  console.log(`╚══════════════════════════════════════════════════════════════════╝`);
  
  return aggregated;
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const target = args[1];
  
  const options = {};
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--limit' && args[i+1]) { options.limit = parseInt(args[i+1]); i++; }
    if (args[i] === '--model' && args[i+1]) { options.model = args[i+1]; i++; }
    if (args[i] === '--min-frequency' && args[i+1]) { options.minFrequency = parseInt(args[i+1]); i++; }
  }
  
  switch (command) {
    case 'extract':
      if (!target) { console.error('Usage: mycelium-miner extract <repo-path-or-url>'); process.exit(1); }
      extract(target, options.limit || 500);
      break;
    case 'enrich':
      if (!target) { console.error('Usage: mycelium-miner enrich <extracted.json>'); process.exit(1); }
      await enrich(target, options);
      break;
    case 'aggregate':
      if (!target) { console.error('Usage: mycelium-miner aggregate <enriched.json>'); process.exit(1); }
      aggregate(target, options);
      break;
    case 'pipeline':
      if (!target) { console.error('Usage: mycelium-miner pipeline <repo-path-or-url>'); process.exit(1); }
      await pipeline(target, options);
      break;
    default:
      console.log(`
Mycelium Miner v2.0 — Turn git history into "don't do this" knowledge

Usage:
  node mycelium-miner.cjs pipeline <repo-path-or-url> [--limit 500]
  node mycelium-miner.cjs extract <repo-path-or-url> [--limit 500]
  node mycelium-miner.cjs enrich <extracted.json> [--model gpt-4o-mini]
  node mycelium-miner.cjs aggregate <enriched.json> [--min-frequency 2]

Examples:
  # Mine your own project
  node mycelium-miner.cjs pipeline .

  # Mine a popular open-source repo
  node mycelium-miner.cjs pipeline https://github.com/vitejs/vite --limit 500

  # Step by step for large repos
  node mycelium-miner.cjs extract https://github.com/vercel/next.js --limit 1000
  node mycelium-miner.cjs enrich .mycelium-mined/next.js-extracted.json --model gpt-4o-mini
  node mycelium-miner.cjs aggregate .mycelium-mined/next.js-enriched.json --min-frequency 3

Output formats:
  *-patterns.json        — Full pattern database (machine-readable)
  *-rules.md             — Human-readable prevention rules (paste into CLAUDE.md)
  *-precommit-rules.json — Pre-commit hook rules (triggers, hotspots, coupling)
      `);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
