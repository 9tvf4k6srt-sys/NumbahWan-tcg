#!/usr/bin/env node
/**
 * MYCELIUM ENGINE v1.0 — Shared Intelligence Core
 * =================================================
 *
 * The single source of truth for diff analysis, pattern detection,
 * root-cause extraction, semantic clustering, and classification.
 *
 * Used by:
 *   - mycelium-watch.cjs  (live, incremental learning inside a repo)
 *   - mycelium-miner.cjs  (batch scan of any repo, external or local)
 *   - mycelium-export.cjs (export layer: CSV, SQL, API JSON, dashboard)
 *   - mycelium-fix.cjs    (fix loop: evaluate, diagnose, fix, verify)
 *   - mycelium.cjs        (memory, snapshots, query, premortem)
 *
 * Zero dependencies. One file. Require and use:
 *   const engine = require('./mycelium-engine.cjs');
 *   const { atoms } = engine.analyzeDiffDeep(diffText);
 *   const rootCause = engine.extractRootCause(commit, diffAnalysis);
 */

'use strict';

const path = require('path');

// ============================================================================
// CONFIG — shared constants used across all consumers
// ============================================================================

const FIX_PATTERNS = [
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
];

const IGNORE_PATTERNS = [
  /^merge\b/i,
  /^bump\b/i,
  /^chore\b/i,
  /\bdependabot\b/i,
  /\brenovate\b/i,
  /\brelease\b/i,
  /^docs?(\(|:|\s)/i,
  /^style(\(|:|\s)/i,
  /^ci(\(|:|\s)/i,
];

const FALSE_POSITIVE_FIX_PATTERNS = [
  /\btypo\b/, /\bspelling\b/, /\bwhitespace\b/, /\bformat\b/,
  /\breadme\b/, /\bdocs?\b/, /\bcomment\b/, /\bversion bump\b/,
  /\bchangelog\b/, /\blint\b/, /\bprettier\b/, /\beslint\b/,
  /\brename\b/, /\bcleanup\b/, /\bclean up\b/, /\bnit\b/,
  /\bchore\b/, /\bmerge\b/,
];

// ============================================================================
// CLASSIFICATION — file → technology, file → area
// ============================================================================

/**
 * Classify a file path into a technology category.
 * Used by miner/export for grouping patterns by tech stack.
 */
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

/**
 * Classify a file path into a domain area (generic, works for any project).
 * For project-specific areas, use config.json overrides in the consumer.
 */
function classifyAreaGeneric(filePath) {
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

// ============================================================================
// FIX DETECTION — is this commit a real fix?
// ============================================================================

/**
 * Detect if a commit message indicates a REAL fix (not a typo/doc/version fix).
 * Returns { isFix: boolean, area?: string, hint?: string }
 */
function detectFix(msg) {
  const lower = (msg || '').toLowerCase();

  // Filter out non-real fixes
  if (FALSE_POSITIVE_FIX_PATTERNS.some(p => p.test(lower))) {
    return { isFix: false };
  }

  // Conventional commit: fix(...): ...
  const conventional = lower.match(/^fix\(?([^)]*)\)?[:\s]/);
  if (conventional) {
    return { isFix: true, area: conventional[1] || '', hint: msg };
  }

  // Common fix patterns
  if (FIX_PATTERNS.some(p => p.test(lower))) {
    return { isFix: true, area: '', hint: msg };
  }

  return { isFix: false };
}

/**
 * Check if a commit message matches ignore patterns (merge, bump, chore, etc.)
 */
function isIgnoredCommit(msg) {
  return IGNORE_PATTERNS.some(p => p.test(msg || ''));
}

// ============================================================================
// DEEP DIFF ANALYSIS ENGINE — The 25 detectors (the core intelligence)
// ============================================================================

/**
 * Analyzes a unified diff to extract structured change semantics.
 * Returns { atoms[], removedLines[], addedLines[], hunks[] }
 *
 * Each atom has: { type, detail, severity }
 * This is the single most valuable function in the system.
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

    const removedText = hunkRemoved.join('\n');
    const addedText = hunkAdded.join('\n');

    // --- 25 transformation pattern detectors ---

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

    // 2. Script/link reordering
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
          detail: `Changed ${added.prop}: ${removed.val} \u2192 ${added.val}`,
          severity: ['z-index', 'position', 'overflow', 'display'].includes(added.prop) ? 'medium' : 'low'
        });
      }
    }

    // 4. overflow: hidden additions/removals
    if (!removedText.includes('overflow') && addedText.match(/overflow\s*:\s*hidden/)) {
      hunk.atoms.push({ type: 'added-overflow-hidden', detail: 'Added overflow:hidden \u2014 may clip child elements', severity: 'high' });
    }
    if (removedText.match(/overflow\s*:\s*hidden/) && !addedText.includes('overflow:hidden') && !addedText.includes('overflow: hidden')) {
      hunk.atoms.push({ type: 'removed-overflow-hidden', detail: 'Removed overflow:hidden to fix clipping', severity: 'medium' });
    }

    // 5. Null/undefined guard additions
    if (!removedText.match(/\?\./g) && addedText.match(/\?\./g)) {
      const count = (addedText.match(/\?\./g) || []).length;
      hunk.atoms.push({ type: 'added-optional-chaining', detail: `Added ${count} optional chaining operator(s) \u2014 null reference fix`, severity: 'medium' });
    }
    if (!removedText.match(/!= ?null|!== ?null|!== ?undefined/) && addedText.match(/!= ?null|!== ?null|!== ?undefined/)) {
      hunk.atoms.push({ type: 'added-null-check', detail: 'Added null/undefined check \u2014 was crashing on missing value', severity: 'medium' });
    }
    if (addedText.match(/typeof\s+\w+\s*!==?\s*['"]undefined['"]/) && !removedText.match(/typeof\s+\w+\s*!==?\s*['"]undefined['"]/)) {
      hunk.atoms.push({ type: 'added-typeof-guard', detail: 'Added typeof !== undefined guard \u2014 variable was used before definition', severity: 'high' });
    }

    // 6. innerHTML vs textContent fixes
    if (removedText.includes('innerHTML') && addedText.includes('textContent')) {
      hunk.atoms.push({ type: 'innerhtml-to-textcontent', detail: 'Replaced innerHTML with textContent \u2014 XSS or handler-destruction fix', severity: 'high' });
    }
    if (removedText.includes('innerHTML') && addedText.includes('insertAdjacentHTML')) {
      hunk.atoms.push({ type: 'innerhtml-to-insertadjacent', detail: 'Replaced innerHTML with insertAdjacentHTML \u2014 preserving existing DOM handlers', severity: 'high' });
    }

    // 7. Event listener fixes
    if (addedText.match(/removeEventListener/) && !removedText.match(/removeEventListener/)) {
      hunk.atoms.push({ type: 'added-event-cleanup', detail: 'Added removeEventListener \u2014 was leaking event handlers', severity: 'medium' });
    }
    if (removedText.match(/addEventListener/) && addedText.match(/addEventListener/) && addedText.match(/\{[^}]*once:\s*true/)) {
      hunk.atoms.push({ type: 'added-once-listener', detail: 'Changed to once:true listener \u2014 was firing multiple times', severity: 'medium' });
    }

    // 8. Async/await changes
    if (!removedText.match(/await\s/) && addedText.match(/await\s/)) {
      hunk.atoms.push({ type: 'added-await', detail: 'Added missing await \u2014 was ignoring promise result', severity: 'high' });
    }
    if (removedText.match(/await\s/) && !addedText.match(/await\s/)) {
      hunk.atoms.push({ type: 'removed-await', detail: 'Removed unnecessary await \u2014 was blocking execution', severity: 'medium' });
    }

    // 9. Error handling additions
    if (!removedText.match(/try\s*\{/) && addedText.match(/try\s*\{/)) {
      hunk.atoms.push({ type: 'added-try-catch', detail: 'Wrapped code in try-catch \u2014 was crashing on error', severity: 'medium' });
    }
    if (!removedText.match(/\.catch\(/) && addedText.match(/\.catch\(/)) {
      hunk.atoms.push({ type: 'added-promise-catch', detail: 'Added .catch() \u2014 unhandled promise rejection', severity: 'medium' });
    }

    // 10. Timeout/timing changes
    const removedTimeouts = [...removedText.matchAll(/setTimeout[^,]*,\s*(\d+)/g)].map(m => parseInt(m[1]));
    const addedTimeouts = [...addedText.matchAll(/setTimeout[^,]*,\s*(\d+)/g)].map(m => parseInt(m[1]));
    if (removedTimeouts.length > 0 && addedTimeouts.length > 0) {
      hunk.atoms.push({ type: 'changed-timeout', detail: `Changed timeout: ${removedTimeouts[0]}ms \u2192 ${addedTimeouts[0]}ms`, severity: 'medium' });
    }
    if (addedTimeouts.length > 0 && removedTimeouts.length === 0) {
      hunk.atoms.push({ type: 'added-timeout', detail: `Added setTimeout(${addedTimeouts[0]}ms) \u2014 timing/race condition fix`, severity: 'medium' });
    }

    // 11. DOM selector changes
    const removedSelectors = [...removedText.matchAll(/querySelector(?:All)?\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);
    const addedSelectors = [...addedText.matchAll(/querySelector(?:All)?\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);
    if (removedSelectors.length > 0 && addedSelectors.length > 0 && removedSelectors[0] !== addedSelectors[0]) {
      hunk.atoms.push({ type: 'changed-selector', detail: `Changed DOM selector: "${removedSelectors[0]}" \u2192 "${addedSelectors[0]}"`, severity: 'low' });
    }

    // 12. Import/require changes
    const removedImports = [...removedText.matchAll(/(?:import\s.*from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g)].map(m => m[1] || m[2]);
    const addedImports = [...addedText.matchAll(/(?:import\s.*from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g)].map(m => m[1] || m[2]);
    if (removedImports.length > 0 && addedImports.length > 0) {
      hunk.atoms.push({ type: 'changed-import', detail: `Changed import: ${removedImports[0]} \u2192 ${addedImports[0]}`, severity: 'medium' });
    }

    // 13. Condition/logic changes
    if (removedText.match(/===?\s*/) && addedText.match(/===?\s*/) && removedText.match(/if\s*\(/) && addedText.match(/if\s*\(/)) {
      hunk.atoms.push({ type: 'changed-condition', detail: 'Modified conditional logic', severity: 'medium' });
    }
    if (!removedText.match(/&&\s*/) && addedText.match(/&&\s*/)) {
      hunk.atoms.push({ type: 'added-guard-clause', detail: 'Added && guard \u2014 was executing without prerequisite check', severity: 'medium' });
    }

    // 14. Array/object method safety
    if (addedText.match(/\|\|\s*\[\s*\]/) && !removedText.match(/\|\|\s*\[\s*\]/)) {
      hunk.atoms.push({ type: 'added-array-fallback', detail: 'Added || [] fallback \u2014 was calling array method on undefined', severity: 'medium' });
    }
    if (addedText.match(/\|\|\s*\{\s*\}/) && !removedText.match(/\|\|\s*\{\s*\}/)) {
      hunk.atoms.push({ type: 'added-object-fallback', detail: 'Added || {} fallback \u2014 was accessing property on undefined', severity: 'medium' });
    }
    if (addedText.match(/\|\|\s*['"]/) && !removedText.match(/\|\|\s*['"]/)) {
      hunk.atoms.push({ type: 'added-string-fallback', detail: 'Added string fallback \u2014 was showing undefined/null in UI', severity: 'low' });
    }

    // 15. Media query / responsive fixes
    if (addedText.match(/@media/) && !removedText.match(/@media/)) {
      hunk.atoms.push({ type: 'added-media-query', detail: 'Added responsive breakpoint \u2014 was broken on different screen sizes', severity: 'medium' });
    }

    // 16. Z-index wars
    const removedZ = [...removedText.matchAll(/z-index:\s*(\d+)/g)].map(m => parseInt(m[1]));
    const addedZ = [...addedText.matchAll(/z-index:\s*(\d+)/g)].map(m => parseInt(m[1]));
    if (removedZ.length > 0 && addedZ.length > 0 && removedZ[0] !== addedZ[0]) {
      hunk.atoms.push({ type: 'z-index-change', detail: `z-index: ${removedZ[0]} \u2192 ${addedZ[0]} \u2014 stacking context collision`, severity: 'medium' });
    }

    // 17. display/visibility changes
    if (removedText.match(/display:\s*none/) && addedText.match(/display:\s*(flex|grid|block|inline)/)) {
      hunk.atoms.push({ type: 'unhide-element', detail: 'Changed display:none to visible \u2014 element was incorrectly hidden', severity: 'low' });
    }
    if (!removedText.match(/display:\s*none/) && addedText.match(/display:\s*none/)) {
      hunk.atoms.push({ type: 'hide-element', detail: 'Added display:none \u2014 element was incorrectly visible', severity: 'low' });
    }

    // 18. String/template literal fixes
    if (removedText.match(/\+\s*['"]/) && addedText.match(/`[^`]*\$\{/)) {
      hunk.atoms.push({ type: 'concat-to-template', detail: 'Switched from string concat to template literal \u2014 concatenation bug', severity: 'low' });
    }

    // 19. Return value fixes
    if (!removedText.match(/return\s/) && addedText.match(/return\s/)) {
      hunk.atoms.push({ type: 'added-return', detail: 'Added missing return statement \u2014 function was returning undefined', severity: 'high' });
    }

    // 20. Boolean logic inversions
    if (removedText.match(/=\s*true/) && addedText.match(/=\s*false/) ||
        removedText.match(/=\s*false/) && addedText.match(/=\s*true/)) {
      hunk.atoms.push({ type: 'boolean-flip', detail: 'Inverted boolean value \u2014 logic was backwards', severity: 'medium' });
    }

    // 21. Image/asset path fixes
    if ((removedText.includes('src=') || removedText.includes('url(')) && (addedText.includes('src=') || addedText.includes('url('))) {
      const removedUrls = [...removedText.matchAll(/(?:src|href|url\()=?\s*["']?([^"'\s)]+)/g)].map(m => m[1]);
      const addedUrls = [...addedText.matchAll(/(?:src|href|url\()=?\s*["']?([^"'\s)]+)/g)].map(m => m[1]);
      if (removedUrls.length > 0 && addedUrls.length > 0 && removedUrls[0] !== addedUrls[0]) {
        hunk.atoms.push({ type: 'changed-asset-path', detail: 'Changed resource path', severity: 'low' });
      }
    }

    // 22. Object-fit changes
    if (removedText.match(/object-fit:\s*cover/) && addedText.match(/object-fit:\s*contain/)) {
      hunk.atoms.push({ type: 'cover-to-contain', detail: 'Changed object-fit: cover \u2192 contain \u2014 image was being cropped', severity: 'medium' });
    }

    // 23. Scroll behavior
    if (addedText.match(/scroll-behavior|scrollIntoView|overflow-y:\s*auto/) && !removedText.match(/scroll-behavior|scrollIntoView/)) {
      hunk.atoms.push({ type: 'added-scroll-behavior', detail: 'Added scroll handling \u2014 content was not scrollable or jumping', severity: 'medium' });
    }

    // 24. Touch/mobile event fixes
    if (addedText.match(/touch-action|touchstart|touchend|pointer-events/) && !removedText.match(/touch-action|touchstart|touchend/)) {
      hunk.atoms.push({ type: 'added-touch-handling', detail: 'Added touch event handling \u2014 broken on mobile', severity: 'medium' });
    }

    // 25. localStorage/sessionStorage safety
    if (addedText.match(/try\s*\{[^}]*localStorage|JSON\.parse\([^)]*\|\|/) && !removedText.match(/try\s*\{[^}]*localStorage/)) {
      hunk.atoms.push({ type: 'storage-safety', detail: 'Added storage access safety \u2014 was crashing on parse error or missing key', severity: 'medium' });
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
// ATOM → CATEGORY/PATTERN/PREVENTION MAPPING
// ============================================================================

const ATOM_MAPPING = {
  'removed-defer':           { cat: 'load-order', pat: 'defer-before-dependency', prev: "Never use defer on scripts that other scripts depend on at load time. If script B calls script A's globals, A must load synchronously before B." },
  'added-defer':             { cat: 'load-order', pat: 'unnecessary-defer', prev: "Don't add defer to scripts that register globals needed by inline code. defer delays execution past DOMContentLoaded." },
  'removed-async-attr':      { cat: 'load-order', pat: 'async-breaks-order', prev: 'async scripts load out of order. Use defer (ordered) or remove async if execution order matters.' },
  'script-reorder':          { cat: 'load-order', pat: 'script-order-dependency', prev: "Scripts that call each other's globals must load in dependency order. Document the dependency chain in a comment." },
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
  'removed-await':           { cat: 'async-timing', pat: 'unnecessary-await', prev: "Don't await synchronous operations or fire-and-forget calls. Unnecessary await blocks the event loop." },
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
  'added-touch-handling':    { cat: 'mobile-compat', pat: 'missing-touch-support', prev: "Desktop-only event handlers (click, hover) don't work on mobile. Always test touch interactions and add touch/pointer event handlers." },
  'unhide-element':          { cat: 'css-layout', pat: 'incorrect-display-none', prev: "display:none removes elements from layout entirely. Use visibility:hidden or opacity:0 if the element's space should be preserved." },
  'hide-element':            { cat: 'css-layout', pat: 'missing-display-none', prev: "Elements visible when they shouldn't be \u2014 check initial state and conditional rendering logic." },
  'added-return':            { cat: 'logic-error', pat: 'missing-return-statement', prev: 'Functions that compute values must return them. Missing return causes undefined results and silent failures.' },
  'boolean-flip':            { cat: 'logic-error', pat: 'inverted-boolean-logic', prev: 'Double-check boolean conditions after writing them. Inverted logic is the most common and hardest-to-spot bug.' },
  'changed-asset-path':      { cat: 'build-config', pat: 'wrong-asset-path', prev: 'Use path constants or import for assets. Hardcoded paths break when files move or builds change output directories.' },
  'concat-to-template':      { cat: 'logic-error', pat: 'string-concatenation-bug', prev: 'Use template literals instead of string concatenation. Concatenation bugs (missing spaces, wrong order) are harder to spot.' },
  'added-scroll-behavior':   { cat: 'css-layout', pat: 'missing-scroll-handling', prev: 'Long content needs scroll containers. Check overflow behavior when content grows beyond initial viewport.' },
  'storage-safety':          { cat: 'error-handling', pat: 'unsafe-storage-access', prev: 'Wrap localStorage/sessionStorage in try-catch. JSON.parse throws on corrupt data. Storage may be disabled in private browsing.' },
  'css-value-change':        { cat: 'css-layout', pat: 'wrong-css-value', prev: 'CSS value changes should be tested at multiple screen sizes. Check for inherited properties and specificity conflicts.' },
  'changed-condition':       { cat: 'logic-error', pat: 'wrong-conditional-logic', prev: 'Changed conditional logic \u2014 verify all branches are correct and edge cases are handled.' },
};

// ============================================================================
// ROOT CAUSE EXTRACTION
// ============================================================================

/**
 * Extract structured root cause from a fix commit + diff analysis.
 * Returns { rootCause, category, technology, pattern, prevention, severity, confidence, atoms[] }
 *
 * @param {Object} fc - Fix commit with { msg, body?, files?, technologies?, fileCount? }
 * @param {Object} diffAnalysis - Result of analyzeDiffDeep()
 */
function extractRootCause(fc, diffAnalysis) {
  const msg = fc.msg || '';
  const body = fc.body || '';
  const allText = (msg + ' ' + body).toLowerCase();
  const atoms = diffAnalysis.atoms || [];

  // Priority 1: Extract explicit root cause from commit body
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

  // Priority 2: Synthesize root cause from diff atoms
  let synthesizedRootCause = '';
  let category = 'other';
  let patternName = '';
  let prevention = '';
  let severity = 'medium';

  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedAtoms = [...atoms].sort((a, b) => (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3));

  if (sortedAtoms.length > 0) {
    const primary = sortedAtoms[0];
    synthesizedRootCause = primary.detail;
    severity = primary.severity;

    const mapping = ATOM_MAPPING[primary.type];
    if (mapping) {
      category = mapping.cat;
      patternName = mapping.pat;
      prevention = mapping.prev;
    }

    if (sortedAtoms.length > 1) {
      const others = sortedAtoms.slice(1, 3).map(a => a.detail).join('; ');
      synthesizedRootCause += `. Also: ${others}`;
    }
  }

  // Priority 3: Fallback to commit message analysis
  if (!synthesizedRootCause && !explicitRootCause) {
    const msgClean = msg.replace(/^(?:fix|bug|hotfix|patch|revert)\s*\([^)]*\)\s*:?\s*/i, '')
                       .replace(/^(?:fix|bug|hotfix|patch|revert)\s*:?\s*/i, '').trim();
    synthesizedRootCause = msgClean;

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

  const rootCause = explicitRootCause || synthesizedRootCause || msg;
  if (!patternName) patternName = derivePatternFromMessage(msg);
  if (!prevention) prevention = `Review ${category} patterns when modifying ${(fc.technologies || []).join('/')} code.`;

  if ((fc.fileCount || 0) > 8) severity = 'critical';
  else if ((fc.fileCount || 0) > 4 && severity !== 'high') severity = 'high';
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

// ============================================================================
// PATTERN UTILITIES — normalization, dedup, clustering, rule generation
// ============================================================================

function derivePatternFromMessage(msg) {
  const cleaned = (msg || '')
    .replace(/^(?:fix|bug|hotfix|patch|revert)\s*\([^)]*\)\s*:?\s*/i, '')
    .replace(/^(?:fix|bug|hotfix|patch|revert)\s*:?\s*/i, '')
    .trim().toLowerCase();

  const words = cleaned.split(/[\s,;:]+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'was', 'not', 'with', 'from', 'that', 'this', 'has', 'had'].includes(w))
    .slice(0, 4);

  return words.length > 0 ? words.join('-').replace(/[^a-z0-9-]/g, '').slice(0, 40) : 'unknown-fix';
}

function normalizePattern(name) {
  return (name || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Merge pattern groups that are semantically similar.
 * E.g., "missing-null-guard" and "null-reference-error" should merge.
 */
function mergeSimilarPatterns(groups) {
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

  const mergeTarget = {};
  for (const [canonical, syns] of Object.entries(synonyms)) {
    mergeTarget[canonical] = canonical;
    for (const s of syns) mergeTarget[s] = canonical;
  }

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

function selectBestText(texts) {
  if (!texts || texts.length === 0) return '';
  return texts
    .filter(t => t && t.length > 10 && !t.startsWith('Co-authored'))
    .sort((a, b) => {
      const scoreA = Math.min(a.length, 200) + (a.includes('because') ? 10 : 0) + (a.match(/\b(null|undefined|defer|async|overflow|z-index|import|selector)\b/i) ? 15 : 0);
      const scoreB = Math.min(b.length, 200) + (b.includes('because') ? 10 : 0) + (b.match(/\b(null|undefined|defer|async|overflow|z-index|import|selector)\b/i) ? 15 : 0);
      return scoreB - scoreA;
    })[0] || texts[0] || '';
}

function topKey(obj) {
  const entries = Object.entries(obj || {});
  if (entries.length === 0) return 'unknown';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function countTop(arr) {
  const counts = {};
  arr.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}

/**
 * Generate an actionable "don't do this" rule.
 * Copy-pasteable into CLAUDE.md, .cursor/rules, or CI checks.
 */
function generateActionableRule(group, rootCause, prevention, category, technology) {
  if (prevention && prevention.length > 30 && !prevention.includes('unknown') && !prevention.startsWith('Review ') && !prevention.startsWith('Avoid ')) {
    return prevention;
  }

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

  const genericRules = {
    'load-order': 'Scripts that depend on each other must load in order. Never use defer/async on scripts that register globals needed by other scripts.',
    'async-timing': 'Missing await causes race conditions. Every async call that returns data you need must be awaited.',
    'dom-mutation': 'innerHTML destroys child event handlers. Use textContent, insertAdjacentHTML, or createElement instead.',
    'css-layout': 'CSS changes break at different viewport sizes. Always test at 320px (mobile), 768px (tablet), and 1024px (desktop).',
    'null-reference': 'Always check for null/undefined before accessing properties. Use optional chaining (?.) and nullish coalescing (??).',
    'error-handling': 'External calls (fetch, DOM queries, JSON.parse, storage) can fail. Always wrap in try-catch.',
    'mobile-compat': "Desktop interactions (hover, right-click) don't exist on mobile. Test touch interactions separately.",
    'i18n': 'User-visible strings must go through the translation system. Hardcoded strings break when users switch languages.',
  };

  return genericRules[category] || `Pattern "${group.pattern}" has caused ${group.commits.length} breakages. Review ${category}/${technology} code carefully.`;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Config constants
  FIX_PATTERNS,
  IGNORE_PATTERNS,
  FALSE_POSITIVE_FIX_PATTERNS,
  ATOM_MAPPING,

  // Classification
  classifyTechnology,
  classifyAreaGeneric,

  // Fix detection
  detectFix,
  isIgnoredCommit,

  // Deep diff analysis (the core intelligence — 25 detectors)
  analyzeDiffDeep,

  // Root cause extraction
  extractRootCause,

  // Pattern utilities
  derivePatternFromMessage,
  normalizePattern,
  mergeSimilarPatterns,
  selectBestText,
  topKey,
  countTop,
  generateActionableRule,
};
