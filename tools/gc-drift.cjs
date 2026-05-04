#!/usr/bin/env node
/**
 * gc-drift.cjs — drift garbage collector (Tier 3).
 * ─────────────────────────────────────────────────────────────────
 * NEVER auto-prunes. Default mode is dry-run report only.
 * --prune actually deletes (asks per item unless --yes).
 *
 *   node tools/gc-drift.cjs                # report (default)
 *   node tools/gc-drift.cjs --prune        # delete (interactive)
 *   node tools/gc-drift.cjs --prune --yes  # delete (no prompts)
 *   node tools/gc-drift.cjs --report       # JSON
 *
 * Reports four classes of drift:
 *   1. dead routes      — routes in tools/anchor-preview.cjs whose
 *                         target file no longer exists
 *   2. orphan assets    — files in public/static/images/invest/
 *                         referenced by zero PINFORGE pages
 *   3. stale done tasks — tasks/<id>.json status=done, updated > 30d
 *   4. ai-tell allowlist — entries in tools/ai-tell-corpus.json with
 *                         no current usage anywhere in public/
 */
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const PRUNE = args.includes('--prune');
const YES = args.includes('--yes');
const REPORT = args.includes('--report');

// Pages that legitimately reference invest assets. We scan all of them so
// we don't false-flag assets pulled in via dynamic JS paths or carousels.
const PINFORGE_PAGES = [
  'public/invest.html',
  'public/playbooks/dumpling-shop-tw.html',
  'public/office-gallery.html',
];

// Additional haystacks: any file under these dirs is also scanned for
// asset references (catches dynamic paths assembled in JS / JSON).
const EXTRA_HAYSTACK_DIRS = [
  'public',           // every HTML
  'public/static',    // any JS / JSON / CSS
];

const ASSET_DIR = 'public/static/images/invest';

function readSafe(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

// ─── 1. Dead routes ────────────────────────────────────────────────
function findDeadRoutes() {
  const src = readSafe(path.join(ROOT, 'tools/anchor-preview.cjs'));
  const dead = [];
  // crude scan: lines like  path.join(ROOT, 'public/<file>')
  const re = /path\.join\(ROOT,\s*['"]([^'"]+\.html)['"]\)/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(src)) !== null) {
    const rel = m[1];
    if (seen.has(rel)) continue;
    seen.add(rel);
    if (!fs.existsSync(path.join(ROOT, rel))) dead.push(rel);
  }
  return dead;
}

// ─── 2. Orphan assets ──────────────────────────────────────────────
function findOrphanAssets() {
  const dir = path.join(ROOT, ASSET_DIR);
  if (!fs.existsSync(dir)) return [];
  const files = [];
  function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else files.push(path.relative(path.join(ROOT, 'public'), p));
    }
  }
  walk(dir);

  // Build a wide haystack: PINFORGE pages + every text file under public/
  // and public/static (HTML / JS / JSON / CSS). Catches dynamic paths and
  // carousel assets that PINFORGE_PAGES alone would miss.
  const stacks = PINFORGE_PAGES.map(p => readSafe(path.join(ROOT, p)));
  const TEXT_EXT = /\.(html?|js|mjs|cjs|json|css|md|txt)$/i;
  function readDirText(rel) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    for (const name of fs.readdirSync(abs)) {
      const p = path.join(rel, name);
      const st = fs.statSync(path.join(ROOT, p));
      if (st.isDirectory()) readDirText(p);
      else if (TEXT_EXT.test(name)) stacks.push(readSafe(path.join(ROOT, p)));
    }
  }
  for (const d of EXTRA_HAYSTACK_DIRS) readDirText(d);
  const haystack = stacks.join('\n');

  return files.filter(rel => {
    const basename = path.basename(rel);
    return !haystack.includes(basename);
  });
}

// ─── 3. Stale done tasks ───────────────────────────────────────────
function findStaleDoneTasks() {
  const dir = path.join(ROOT, 'tasks');
  if (!fs.existsSync(dir)) return [];
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  const stale = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.startsWith('T-') || !name.endsWith('.json')) continue;
    let t;
    try { t = JSON.parse(readSafe(path.join(dir, name))); } catch { continue; }
    if (t.status !== 'done') continue;
    const ts = Date.parse(t.updated || t.created || 0);
    if (!isNaN(ts) && ts < cutoff) stale.push({ id: t.id, file: `tasks/${name}`, age_days: Math.round((Date.now() - ts) / 86400000) });
  }
  return stale;
}

// ─── 4. Stale ai-tell allowlist entries ────────────────────────────
function findStaleAllowlists() {
  const corpusP = path.join(ROOT, 'tools/ai-tell-corpus.json');
  if (!fs.existsSync(corpusP)) return [];
  let corpus;
  try { corpus = JSON.parse(readSafe(corpusP)); } catch { return []; }
  const allowlists = [];
  // Build haystack of ALL public/*.html so we don't false-flag domain words
  // that legitimately live on game pages.
  const allFiles = [];
  function walk(rel) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    for (const n of fs.readdirSync(abs)) {
      const p = path.join(rel, n);
      const st = fs.statSync(path.join(ROOT, p));
      if (st.isDirectory()) walk(p);
      else if (p.endsWith('.html')) allFiles.push(p);
    }
  }
  walk('public');
  const haystack = allFiles.map(f => readSafe(path.join(ROOT, f))).join('\n');

  const rules = corpus.rules || [];
  for (const r of rules) {
    if (!r.allowlist || !Array.isArray(r.allowlist)) continue;
    for (const term of r.allowlist) {
      // skip very short or regex-y entries
      if (typeof term !== 'string' || term.length < 4) continue;
      if (!haystack.includes(term)) {
        allowlists.push({ rule: r.id || r.name || '?', term });
      }
    }
  }
  return allowlists;
}

// ─── Report ────────────────────────────────────────────────────────
const drift = {
  deadRoutes:     findDeadRoutes(),
  orphanAssets:   findOrphanAssets(),
  staleDoneTasks: findStaleDoneTasks(),
  staleAllowlist: findStaleAllowlists(),
};

if (REPORT) {
  console.log(JSON.stringify(drift, null, 2));
  process.exit(0);
}

const total =
  drift.deadRoutes.length +
  drift.orphanAssets.length +
  drift.staleDoneTasks.length +
  drift.staleAllowlist.length;

function printSection(title, items, fmt) {
  console.log(`\n  ${title} (${items.length})`);
  if (!items.length) { console.log('    none'); return; }
  for (const it of items.slice(0, 20)) console.log('    ' + fmt(it));
  if (items.length > 20) console.log(`    … and ${items.length - 20} more`);
}

console.log(`\n  gc-drift report  ·  ${new Date().toISOString().slice(0, 19)}Z`);
console.log(`  ─────────────────────────────────────────────`);
printSection('Dead routes (file gone)',     drift.deadRoutes,     x => x);
printSection('Orphan assets (no refs)',     drift.orphanAssets,   x => x);
printSection('Stale done tasks (>30d)',     drift.staleDoneTasks, x => `${x.id}  age=${x.age_days}d  ${x.file}`);
printSection('Stale ai-tell allowlist',     drift.staleAllowlist, x => `[${x.rule}]  ${x.term}`);

console.log(`\n  total drift items: ${total}`);
if (!PRUNE) {
  console.log('  (dry-run · use --prune to delete · --prune --yes to skip prompts)\n');
  process.exit(0);
}

// ─── Prune (interactive unless --yes) ──────────────────────────────
if (total === 0) {
  console.log('  nothing to prune.\n');
  process.exit(0);
}

async function confirm(prompt) {
  if (YES) return true;
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt + ' [y/N] ', ans => {
      rl.close();
      resolve(/^y(es)?$/i.test(ans.trim()));
    });
  });
}

(async () => {
  let removed = 0;

  // 3. Stale done tasks → safe to delete
  for (const t of drift.staleDoneTasks) {
    if (await confirm(`  delete ${t.file} (age ${t.age_days}d)?`)) {
      fs.unlinkSync(path.join(ROOT, t.file));
      removed++;
    }
  }
  // 2. Orphan assets → safe to delete (we can re-add if needed)
  for (const a of drift.orphanAssets) {
    if (await confirm(`  delete public/${a}?`)) {
      fs.unlinkSync(path.join(ROOT, 'public', a));
      removed++;
    }
  }
  // 1. Dead routes → not deleted automatically; print fix instruction
  if (drift.deadRoutes.length) {
    console.log('\n  dead routes are NOT auto-pruned. Edit tools/anchor-preview.cjs to remove:');
    for (const r of drift.deadRoutes) console.log('    ' + r);
  }
  // 4. Stale allowlists → not deleted automatically; print fix instruction
  if (drift.staleAllowlist.length) {
    console.log('\n  stale allowlist entries are NOT auto-pruned. Edit tools/ai-tell-corpus.json:');
    for (const e of drift.staleAllowlist) console.log(`    [${e.rule}]  ${e.term}`);
  }

  console.log(`\n  pruned ${removed} item(s).\n`);
})();
