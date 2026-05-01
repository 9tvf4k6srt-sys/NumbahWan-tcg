#!/usr/bin/env node
/**
 * AI-Tell Lint v1.1
 * ═══════════════════════════════════════════════════════════════════
 * Scans HTML/MD/JS files for phrases that mark copy as AI-generated.
 * Reads tools/ai-tell-corpus.json (rules[].patterns[] per language).
 *
 * Severity:
 *   high   → exit 1 (blocks commit / CI)
 *   medium → exit 0 with stderr warnings
 *   low    → info only
 *
 * USAGE:
 *   node tools/ai-tell-lint.cjs                    # check staged files
 *   node tools/ai-tell-lint.cjs --all              # every public/*.html, *.md
 *   node tools/ai-tell-lint.cjs --file=public/x.html
 *   node tools/ai-tell-lint.cjs --json
 *   node tools/ai-tell-lint.cjs --report
 *   node tools/ai-tell-lint.cjs --verbose
 *
 * Exemptions:
 *   - HTML comments are skipped.
 *   - JS block comments are skipped.
 *   - Files in EXEMPT_FILES are skipped (the corpus + this linter + doctrine docs).
 *
 * Wired into: .husky/pre-commit (after nw-lint.cjs).
 *
 * @version 1.1.0
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CORPUS_PATH = path.join(__dirname, 'ai-tell-corpus.json');

// Files we never lint (the corpus, the linter itself, AI playbooks that
// document the very phrases we're banning, and historical audits).
const EXEMPT_FILES = new Set([
  'tools/ai-tell-corpus.json',
  'tools/ai-tell-lint.cjs',
  'BUILD-DOCTRINE.md',
  'AGENT-CONTEXT.md',
  'AI_PLAYBOOK.md',
  'CLAUDE.md',
  'AUDIT-2026-04.md',
  'LEARNING-SYSTEMS-AUDIT.md',
  'PCP-SPEC.md',
  'PROJECT.md',
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'SENTINEL-UPGRADE-PLAN.md',
]);

// args
const args = process.argv.slice(2);
const CHECK_ALL = args.includes('--all');
const FILE_ARG = args.find(a => a.startsWith('--file='));
const JSON_OUT = args.includes('--json');
const REPORT_OUT = args.includes('--report');
const VERBOSE = args.includes('--verbose');

function loadCorpus() {
  if (!fs.existsSync(CORPUS_PATH)) {
    console.error('  [ai-tell] corpus missing: tools/ai-tell-corpus.json');
    process.exit(0);
  }
  const data = JSON.parse(fs.readFileSync(CORPUS_PATH, 'utf8'));
  // Flatten rules[].patterns[] into a single iterable list.
  const flat = [];
  for (const rule of data.rules || []) {
    for (const p of rule.patterns || []) {
      flat.push({
        id: rule.id,
        lang: rule.lang,
        severity: rule.severity,
        note: rule.note,
        pattern: p,
      });
    }
  }
  return { meta: data, flat, perRule: (data.scope && data.scope.perRule) || {} };
}

// Tiny glob-prefix matcher: '/foo/**' matches anything under /foo/.
function globMatch(rel, glob) {
  if (!glob) return false;
  if (glob === rel) return true;
  if (glob.endsWith('/**')) return rel.startsWith(glob.slice(0, -3));
  if (glob.endsWith('/*')) {
    const base = glob.slice(0, -2);
    return rel.startsWith(base + '/') && !rel.slice(base.length + 1).includes('/');
  }
  // Wildcard support for things like 'public/*-old.html'
  if (glob.includes('*')) {
    const re = new RegExp('^' + glob.split('*').map(s => s.replace(/[.+^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
    return re.test(rel);
  }
  return false;
}

function isPerRuleExempt(perRule, ruleId, pattern, rel) {
  // Look up by "RULE-ID:needle" where needle is matched as a substring of the
  // raw regex source. This lets the corpus key 'AIT-EN-FILLER:synergy' match
  // the flat-list pattern '\bsynergy\b'.
  for (const [key, cfg] of Object.entries(perRule)) {
    if (!cfg || !Array.isArray(cfg.exclude)) continue;
    const sep = key.indexOf(':');
    if (sep < 0) continue;
    const keyRule = key.slice(0, sep);
    const needle = key.slice(sep + 1);
    if (keyRule !== ruleId) continue;
    if (!pattern.includes(needle)) continue;
    if (cfg.exclude.some(g => globMatch(rel, g))) return true;
  }
  return false;
}

function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', { cwd: ROOT, encoding: 'utf8' });
    return out.trim().split('\n').filter(Boolean);
  } catch { return []; }
}

// Paths we never lint with --all (auto-generated corpora, legacy / archived
// pages, dev fixtures). These are *prefix* matches against the relative path.
const EXEMPT_PREFIXES = [
  'public/static/research-md/',  // auto-generated research corpus
  'public/research-md/',
  'public/card-audit.html',      // dev audit fixture (lists every card phrase)
  'public/battle-legacy.html',   // legacy page kept for archive
  'public/battle-old.html',      // legacy page kept for archive
  'docs/archive/',
  'public/trailer/review.html',  // internal review tool, not user copy
];

function isExemptPath(rel) {
  if (EXEMPT_FILES.has(rel)) return true;
  for (const p of EXEMPT_PREFIXES) {
    if (rel === p || rel.startsWith(p)) return true;
  }
  if (rel.startsWith('docs/archive/')) return true;
  if (rel.startsWith('.mycelium')) return true;
  if (rel.startsWith('node_modules/')) return true;
  if (rel.startsWith('dist/')) return true;
  if (/\.bak(\.|$)/.test(rel)) return true;
  return false;
}

function getAllScannableFiles() {
  try {
    const out = execSync(
      `find public -type f \\( -name '*.html' -o -name '*.md' \\) | grep -v node_modules | grep -v dist | grep -v '\\.bak'`,
      { cwd: ROOT, encoding: 'utf8' }
    );
    return out.trim().split('\n').filter(Boolean).filter(f => !isExemptPath(f));
  } catch { return []; }
}

function stripHtmlComments(text) { return text.replace(/<!--[\s\S]*?-->/g, ' '); }
function stripJsBlockComments(text) { return text.replace(/\/\*[\s\S]*?\*\//g, ' '); }
// Strip CSS comments inside <style> blocks (and any /* ... */ inside HTML).
// LLM-tell phrases inside CSS comments are dev-only annotations, not user copy.
function stripCssBlockComments(text) { return text.replace(/\/\*[\s\S]*?\*\//g, ' '); }

function lineNumberOf(text, charIndex) {
  let line = 1;
  for (let i = 0; i < charIndex; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function snippetAround(text, start, len) {
  const a = Math.max(0, start - 24);
  const b = Math.min(text.length, start + len + 24);
  return text.slice(a, b).replace(/\s+/g, ' ').trim().slice(0, 140);
}

function scanFile(filePath, rules, perRule) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
  const rel = path.relative(ROOT, abs);

  if (isExemptPath(rel)) return null;

  let raw;
  try { raw = fs.readFileSync(abs, 'utf8'); } catch { return null; }
  if (raw.length > 1.5e6) return null;
  if (raw.indexOf('\u0000') !== -1) return null;

  let scanned = stripHtmlComments(raw);
  // For HTML/MD/CSS/JS, strip /* ... */ block comments too (CSS comments inside
  // <style> blocks and JS block comments are dev-only annotations).
  if (/\.(html?|md|css|c?js|mjs)$/.test(rel)) scanned = stripCssBlockComments(scanned);

  const violations = [];
  for (const rule of rules) {
    if (perRule && isPerRuleExempt(perRule, rule.id, rule.pattern, rel)) continue;
    let re;
    try { re = new RegExp(rule.pattern, 'gi'); }
    catch { continue; } // bad regex in corpus — skip silently
    let m;
    while ((m = re.exec(scanned)) !== null) {
      const ln = lineNumberOf(scanned, m.index);
      violations.push({
        file: rel,
        line: ln,
        ruleId: rule.id,
        severity: rule.severity,
        lang: rule.lang,
        match: m[0],
        note: rule.note,
        snippet: snippetAround(scanned, m.index, m[0].length),
      });
      if (re.lastIndex === m.index) re.lastIndex++;
    }
  }
  return { file: rel, violations };
}

function run() {
  const { flat: rules, perRule } = loadCorpus();
  let files;
  if (FILE_ARG) files = [FILE_ARG.split('=')[1]];
  else if (CHECK_ALL) files = getAllScannableFiles();
  else files = getStagedFiles().filter(f => /\.(html|md)$/.test(f));

  if (files.length === 0) {
    if (!JSON_OUT) console.log('  [ai-tell] no files to scan');
    return { violations: [], blocked: 0, warned: 0, scanned: 0 };
  }

  const all = [];
  for (const f of files) {
    const r = scanFile(f, rules, perRule);
    if (r) all.push(...r.violations);
  }
  const blocked = all.filter(v => v.severity === 'high').length;
  const warned = all.filter(v => v.severity === 'medium').length;
  return { violations: all, blocked, warned, scanned: files.length };
}

function printHuman(result) {
  const { violations, blocked, warned, scanned } = result;
  if (violations.length === 0) {
    console.log(`  [ai-tell] ${scanned} files scanned · 0 issues · clean`);
    return;
  }
  const byFile = {};
  for (const v of violations) (byFile[v.file] ||= []).push(v);
  console.log('');
  console.log('  AI-TELL LINT REPORT');
  console.log('  ═══════════════════════════════════════════════════════════');
  console.log(`  scanned: ${scanned} files   blocking: ${blocked}   warnings: ${warned}`);
  console.log('');
  for (const [file, vs] of Object.entries(byFile)) {
    console.log(`  ${file}`);
    for (const v of vs) {
      const tag = v.severity === 'high' ? '✗ BLOCK' : v.severity === 'medium' ? '⚠ WARN ' : '· INFO ';
      console.log(`    ${tag} L${v.line}  [${v.lang}]  "${v.match}"  (${v.ruleId})`);
      if (VERBOSE) {
        console.log(`            note: ${v.note || ''}`);
        console.log(`            ctx : …${v.snippet}…`);
      }
    }
    console.log('');
  }
  if (blocked > 0) {
    console.log(`  ${blocked} blocking issue(s). Bypass with: git commit --no-verify`);
    console.log('');
  }
}

function printReport(result) {
  const { violations, blocked, warned, scanned } = result;
  const md = [];
  md.push(`# AI-Tell Lint Report`);
  md.push('');
  md.push(`- **Scanned:** ${scanned} files`);
  md.push(`- **Blocking (high):** ${blocked}`);
  md.push(`- **Warnings (medium):** ${warned}`);
  md.push(`- **Generated:** ${new Date().toISOString()}`);
  md.push('');
  if (violations.length === 0) { md.push('Clean. No AI-tell phrases detected.'); console.log(md.join('\n')); return; }
  const byFile = {};
  for (const v of violations) (byFile[v.file] ||= []).push(v);
  for (const [file, vs] of Object.entries(byFile)) {
    md.push(`## \`${file}\``);
    md.push('');
    md.push(`| Line | Sev | Lang | Rule | Match | Note |`);
    md.push(`|---|---|---|---|---|---|`);
    for (const v of vs) {
      md.push(`| ${v.line} | ${v.severity} | ${v.lang} | ${v.ruleId} | \`${v.match.replace(/\|/g, '\\|')}\` | ${(v.note || '').replace(/\|/g, '\\|')} |`);
    }
    md.push('');
  }
  console.log(md.join('\n'));
}

const result = run();
if (JSON_OUT) console.log(JSON.stringify(result, null, 2));
else if (REPORT_OUT) printReport(result);
else printHuman(result);

process.exit(result.blocked > 0 ? 1 : 0);
