#!/usr/bin/env node
/**
 * check-assets.cjs — sensor #2
 * ─────────────────────────────────────────────────────────────────
 * Two budgets:
 *   A. Single-asset cap: any image/font referenced by PINFORGE pages
 *      must be ≤ 500 KB (raw bytes).
 *   B. Page-weight regression: each PINFORGE HTML page may grow by
 *      at most 10 % vs. the snapshot in .pinforge-weight.json.
 *
 * The snapshot file lives at repo root and updates itself when you
 * intentionally cross the threshold and re-baseline:
 *   node tools/check-assets.cjs --baseline   # accept current sizes
 *
 *   node tools/check-assets.cjs              # check (default)
 *   node tools/check-assets.cjs --baseline   # rewrite snapshot
 *   node tools/check-assets.cjs --report     # JSON
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const BASELINE = args.includes('--baseline');
const REPORT = args.includes('--report');

const SINGLE_ASSET_MAX = 500 * 1024;       // 500 KB
const PAGE_REGRESSION_PCT = 10;            // +10 %
const SNAPSHOT = path.join(ROOT, '.pinforge-weight.json');

const PAGES = [
  'public/invest.html',
  'public/loading.html',
  'public/playbooks/dumpling-shop-tw.html',
];

// Discover the asset paths each PINFORGE page references (rough but enough
// — we check src/href ending in image/font extensions).
const ASSET_EXT = /\.(webp|jpg|jpeg|png|svg|gif|woff2?|ttf|otf|mp4|webm)(?:\?.*)?$/i;

function pageAssets(html) {
  const set = new Set();
  const re = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let p = m[1];
    if (!ASSET_EXT.test(p)) continue;
    if (/^https?:|^\/\//.test(p)) continue;        // external — skip
    p = p.replace(/[?#].*$/, '');
    if (p.startsWith('/')) p = p.slice(1);          // /static/.. → static/..
    if (p.startsWith('./')) p = p.slice(2);
    set.add(p);
  }
  return [...set];
}

function fileSize(rel) {
  const abs = path.join(ROOT, 'public', rel);
  try { return fs.statSync(abs).size; } catch { return null; }
}

const oversized = [];
const missing = [];
const pageSizes = {};
const allAssets = new Set();

for (const rel of PAGES) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const html = fs.readFileSync(abs, 'utf8');
  pageSizes[rel] = fs.statSync(abs).size;
  for (const a of pageAssets(html)) allAssets.add(a);
}

for (const a of allAssets) {
  const size = fileSize(a);
  if (size === null) { missing.push(a); continue; }
  if (size > SINGLE_ASSET_MAX) {
    oversized.push({ asset: a, size, kb: Math.round(size / 1024) });
  }
}

// Page-weight regression
let snapshot = {};
if (fs.existsSync(SNAPSHOT)) {
  try { snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')); } catch {}
}
const regressed = [];
for (const [page, size] of Object.entries(pageSizes)) {
  const prev = snapshot[page];
  if (typeof prev !== 'number') continue;
  const pct = ((size - prev) / prev) * 100;
  if (pct > PAGE_REGRESSION_PCT) {
    regressed.push({ page, prev, now: size, pct: +pct.toFixed(1) });
  }
}

if (BASELINE) {
  fs.writeFileSync(SNAPSHOT, JSON.stringify(pageSizes, null, 2) + '\n');
  console.log(`  [assets] re-baselined ${Object.keys(pageSizes).length} pages → ${path.basename(SNAPSHOT)}`);
  process.exit(0);
}

if (REPORT) {
  console.log(JSON.stringify({ pageSizes, oversized, regressed, missing }, null, 2));
  process.exit(oversized.length || regressed.length ? 1 : 0);
}

const fail = oversized.length > 0 || regressed.length > 0;
if (!fail) {
  // Write a fresh snapshot if none exists (first run).
  if (!fs.existsSync(SNAPSHOT)) {
    fs.writeFileSync(SNAPSHOT, JSON.stringify(pageSizes, null, 2) + '\n');
  }
  console.log(`  [assets] ${PAGES.length} pages · ${allAssets.size} assets · 0 over budget`);
  if (missing.length) console.log(`  [assets] note: ${missing.length} referenced asset(s) missing on disk (advisory)`);
  process.exit(0);
}

console.error('');
console.error('  [assets] BLOCKED — budget exceeded:');
if (oversized.length) {
  console.error(`    Oversized (>${SINGLE_ASSET_MAX/1024} KB):`);
  for (const o of oversized.slice(0, 10)) {
    console.error(`      ${o.asset}  →  ${o.kb} KB`);
  }
}
if (regressed.length) {
  console.error(`    Page weight regression (>${PAGE_REGRESSION_PCT} %):`);
  for (const r of regressed) {
    console.error(`      ${r.page}  ${r.prev} → ${r.now} (+${r.pct} %)`);
  }
  console.error('    If intentional: node tools/check-assets.cjs --baseline');
}
console.error('  Bypass: git commit --no-verify');
console.error('');
process.exit(1);
