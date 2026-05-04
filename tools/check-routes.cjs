#!/usr/bin/env node
/**
 * check-routes.cjs — sensor #1
 * ─────────────────────────────────────────────────────────────────
 * Verifies every internal anchor on PINFORGE surfaces resolves to a
 * route the dev server actually serves. Fails closed.
 *
 *   node tools/check-routes.cjs            # scan PINFORGE surfaces (default)
 *   node tools/check-routes.cjs --all      # scan every public/*.html
 *   node tools/check-routes.cjs --report   # JSON output
 *
 * Pre-commit wires this in. Bypass with `git commit --no-verify`.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const SCAN_ALL = args.includes('--all');
const REPORT = args.includes('--report');

// Routes the dev server (tools/anchor-preview.cjs) responds to with 200.
// Update both files when adding a new route.
const ALLOWED_ROUTES = new Set([
  '/', '/index.html',
  '/invest', '/invest.html',
  '/stock', '/stock/', '/stock/index.html',
  '/playbooks', '/playbooks/',
  '/anchors', '/lock', '/branch-sg', '/tells', '/sources',
]);

// /playbooks/<slug> resolves if the file exists.
function isPlaybookRoute(p) {
  const m = p.match(/^\/playbooks\/([a-z0-9-]+)\/?$/i);
  if (!m) return false;
  const slug = m[1];
  return fs.existsSync(path.join(ROOT, 'public/playbooks', slug + '.html'));
}

// Scope: PINFORGE-relevant pages only (the rest of the repo is TCG).
const DEFAULT_FILES = [
  'public/invest.html',
  'public/loading.html',
  'public/playbooks/dumpling-shop-tw.html',
  'public/office-gallery.html',
];

function listAll() {
  const out = [];
  function walk(rel) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    for (const name of fs.readdirSync(abs)) {
      const p = path.join(rel, name);
      const stat = fs.statSync(path.join(ROOT, p));
      if (stat.isDirectory()) walk(p);
      else if (p.endsWith('.html')) out.push(p);
    }
  }
  walk('public');
  return out;
}

function extractInternalLinks(html) {
  const links = [];
  const re = /href\s*=\s*["']([^"'#?]+)(?:[?#][^"']*)?["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    // Internal only: starts with / and not //, no http(s):
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    if (/^\/static\//.test(href)) continue; // static assets ok
    links.push(href);
  }
  return links;
}

function isAllowed(p) {
  if (ALLOWED_ROUTES.has(p)) return true;
  // strip trailing slash for fuzzy match
  if (p.length > 1 && p.endsWith('/') && ALLOWED_ROUTES.has(p.slice(0, -1))) return true;
  if (isPlaybookRoute(p)) return true;
  // a real file under public/ (e.g. /about.html) → allowed (dev server falls
  // through to static), but only if it's a .html or a known static page.
  if (/\.html$/i.test(p)) {
    const f = path.join(ROOT, 'public', p.replace(/^\//, ''));
    if (fs.existsSync(f)) return true;
  }
  return false;
}

const files = SCAN_ALL ? listAll() : DEFAULT_FILES;
const violations = [];

for (const rel of files) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const html = fs.readFileSync(abs, 'utf8');
  const links = extractInternalLinks(html);
  for (const href of links) {
    if (!isAllowed(href)) {
      violations.push({ file: rel, href });
    }
  }
}

if (REPORT) {
  console.log(JSON.stringify({ scanned: files.length, violations }, null, 2));
  process.exit(violations.length ? 1 : 0);
}

if (violations.length === 0) {
  console.log(`  [routes] ${files.length} files scanned · 0 dead links`);
  process.exit(0);
}

console.error('');
console.error(`  [routes] BLOCKED — ${violations.length} dead internal link(s):`);
for (const v of violations.slice(0, 20)) {
  console.error(`    ${v.file}  →  ${v.href}`);
}
if (violations.length > 20) console.error(`    … and ${violations.length - 20} more`);
console.error('');
console.error('  Fix: register the route in tools/anchor-preview.cjs');
console.error('       AND tools/check-routes.cjs::ALLOWED_ROUTES');
console.error('  Bypass: git commit --no-verify');
console.error('');
process.exit(1);
