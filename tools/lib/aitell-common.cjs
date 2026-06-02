#!/usr/bin/env node
/**
 * tools/lib/aitell-common.cjs — shared helpers for the anti-AI-tell tools
 * =======================================================================
 * One home for the small utilities that every detector in the pipeline needs,
 * so we stop copy-pasting them. Pure functions, no side effects, no process
 * exit. Each detector keeps its own scoring logic; this only holds the plumbing
 * they all share: terminal colors, prose extraction, language sniffing, and a
 * couple of safe parse/read wrappers.
 *
 * Consumed by:
 *   tools/ai-stylometry.cjs      (stripMarkupAndCode + isCJK)
 *   tools/ai-layout-lint.cjs     (colors + readUtf8 + stagedFiles)
 *   tools/aitell-pipeline.cjs    (colors + tryParseJSON + stagedFiles)
 *
 * Note: ai-naturalness.cjs keeps its OWN prose extractor on purpose — it splits
 * markup into prose *blocks* (tags become line breaks) for the LLM, which is a
 * different shape than the flatten-to-one-string strip the statistical tools use.
 */

'use strict';

const fs = require('fs');

// ── terminal color palette (no-ops when not a TTY) ─────────────────────────
const COLOR_KEYS = ['r', 'b', 'dim', 'cyan', 'green', 'yellow', 'red', 'mag'];
function colors(stream) {
  const tty = stream && stream.isTTY;
  if (!tty) return Object.fromEntries(COLOR_KEYS.map(k => [k, '']));
  return {
    r: '\x1b[0m', b: '\x1b[1m', dim: '\x1b[2m',
    cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
    red: '\x1b[31m', mag: '\x1b[35m',
  };
}

// ── safe wrappers ───────────────────────────────────────────────────────────
function tryParseJSON(s) { try { return JSON.parse(s); } catch { return null; } }
function readUtf8(file) { return fs.readFileSync(file, 'utf8'); }

// ── prose extraction ─────────────────────────────────────────────────────────
// Score PROSE only. Strip, in order: <style>/<script>/<svg> blocks and their
// CONTENTS (inline CSS/JS reads as "machine rhythm" and poisons the signal),
// HTML comments, fenced + inline code, remaining tags, markdown link syntax,
// table rows, leftover CSS-ish braces, and markdown punctuation. This is the
// shape the stylometry stage relies on; keep it byte-stable.
function stripMarkupAndCode(text) {
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/[#>*_~]/g, ' ');
}

// ── language sniffing ─────────────────────────────────────────────────────────
// >20% CJK chars → treat as a CJK block (so we don't apply English-only signals
// to 繁中 / 日本語). Thai is treated separately by callers that care.
function isCJK(s) {
  if (!s) return false;
  const cjk = (s.match(/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
  return cjk > s.length * 0.2;
}

// ── git plumbing shared by the linters ────────────────────────────────────────
function stagedFiles(spawnSync, cwd) {
  const r = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { cwd, encoding: 'utf8' });
  return (r.stdout || '').split('\n').map(s => s.trim()).filter(Boolean);
}

module.exports = {
  COLOR_KEYS,
  colors,
  tryParseJSON,
  readUtf8,
  stripMarkupAndCode,
  isCJK,
  stagedFiles,
};
