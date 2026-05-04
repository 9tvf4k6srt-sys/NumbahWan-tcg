#!/usr/bin/env node
/**
 * self-review.cjs — Tier 3 sensor: review the STAGED diff before commit.
 * ─────────────────────────────────────────────────────────────────
 * Five rules, each blocking on fail. --no-verify is the escape hatch.
 *
 *   R1  i18n parity      · new <section> on /invest must include en+zh+ja
 *   R2  asset-on-disk    · new src/href must point at a file that exists
 *   R3  route-allowlist  · new internal href must be a known route
 *   R4  hero brevity     · new hero copy block ≤ 30 words
 *   R5  motto guard      · any change to public/invest.html must pass
 *                          tools/check-motto.cjs
 *
 *   node tools/self-review.cjs            # check staged diff (default)
 *   node tools/self-review.cjs --report   # JSON
 *   node tools/self-review.cjs --diff <patch-file>
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const REPORT = args.includes('--report');
const DIFF_FILE = (() => {
  const i = args.indexOf('--diff');
  return i >= 0 ? args[i + 1] : null;
})();

function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', { cwd: ROOT, encoding: 'utf8' });
    return out.split('\n').map(s => s.trim()).filter(Boolean);
  } catch { return []; }
}

function getStagedDiff(file) {
  try {
    return execSync(`git diff --cached -U0 -- "${file}"`, { cwd: ROOT, encoding: 'utf8' });
  } catch { return ''; }
}

// Parse unified diff → array of added lines (just the '+' content, sans hunks).
function addedLines(diff) {
  const out = [];
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ') || line.startsWith('--- ')) continue;
    if (line.startsWith('+')) out.push(line.slice(1));
  }
  return out;
}

// ALLOWED_ROUTES mirror — kept loose, the dedicated check-routes.cjs is authoritative.
const ALLOWED_ROUTES = new Set([
  '/', '/index.html',
  '/invest', '/invest.html',
  '/stock', '/stock/', '/stock/index.html',
  '/playbooks', '/playbooks/',
  '/anchors', '/lock', '/branch-sg', '/tells', '/sources',
]);
function routeAllowed(p) {
  if (ALLOWED_ROUTES.has(p)) return true;
  if (p.length > 1 && p.endsWith('/') && ALLOWED_ROUTES.has(p.slice(0, -1))) return true;
  if (/^\/playbooks\/[a-z0-9-]+\/?$/i.test(p)) {
    const slug = p.match(/^\/playbooks\/([a-z0-9-]+)/i)[1];
    return fs.existsSync(path.join(ROOT, 'public/playbooks', slug + '.html'));
  }
  if (/^\/static\//.test(p)) return true;
  if (/\.html$/i.test(p)) {
    return fs.existsSync(path.join(ROOT, 'public', p.replace(/^\//, '')));
  }
  return false;
}

const violations = [];

function flag(rule, file, msg) {
  violations.push({ rule, file, msg });
}

const staged = getStagedFiles();

// ─── R5 first: any change to /invest must pass check-motto ─────────
const touchedInvest = staged.includes('public/invest.html');
if (touchedInvest) {
  const r = spawnSync('node', ['tools/check-motto.cjs'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    flag('R5-motto', 'public/invest.html',
         'check-motto failed — canonical motto strings drifted (run: node tools/check-motto.cjs)');
  }
}

// ─── Per-file rules ────────────────────────────────────────────────
for (const file of staged) {
  if (!/\.html$/i.test(file)) continue;
  const diff = getStagedDiff(file);
  if (!diff) continue;
  const added = addedLines(diff).join('\n');
  if (!added.trim()) continue;

  // R1 · i18n parity on new <section>s of /invest
  if (file === 'public/invest.html') {
    const sectionAdds = (diff.match(/^\+[^\n]*<section\b[^>]*>/gm) || []);
    if (sectionAdds.length) {
      const langs = ['en', 'zh', 'ja'].filter(l => new RegExp(`data-lang=["']${l}["']`).test(added));
      const missing = ['en', 'zh', 'ja'].filter(l => !langs.includes(l));
      if (missing.length) {
        flag('R1-i18n', file,
             `new <section> on /invest missing data-lang="${missing.join('|')}" — i18n parity required`);
      }
    }
  }

  // R2 · asset references must exist on disk
  const assetRe = /(?:src|href)\s*=\s*["']([^"'#?]+)["']/gi;
  let m;
  while ((m = assetRe.exec(added)) !== null) {
    let p = m[1];
    if (/^https?:|^\/\/|^mailto:|^tel:|^#|^javascript:/i.test(p)) continue;
    if (!/\.(webp|jpg|jpeg|png|svg|gif|woff2?|ttf|otf|mp4|webm)(?:[?#].*)?$/i.test(p)) continue;
    p = p.replace(/[?#].*$/, '');
    const rel = p.startsWith('/') ? p.slice(1) : p.replace(/^\.\//, '');
    const abs = rel.startsWith('public/') ? path.join(ROOT, rel) : path.join(ROOT, 'public', rel);
    if (!fs.existsSync(abs)) {
      flag('R2-asset', file, `references missing asset: ${m[1]}`);
    }
  }

  // R3 · internal links must be allowlisted routes
  const linkRe = /href\s*=\s*["'](\/[^"'#?]*)(?:[?#][^"']*)?["']/gi;
  while ((m = linkRe.exec(added)) !== null) {
    const href = m[1];
    if (href.startsWith('//')) continue;
    if (/\.(webp|jpg|jpeg|png|svg|gif|woff2?|ttf|otf|mp4|webm|css|js|json|txt|md|pdf)(?:[?#].*)?$/i.test(href)) continue;
    if (!routeAllowed(href)) {
      flag('R3-route', file, `unknown internal route in new copy: ${href}`);
    }
  }

  // R4 · hero brevity — only if the new text sits inside a hero context
  // We approximate: any added <p>/<h1>/<h2>/<span> inside a chunk that the
  // diff context shows as containing class="hero" or id="hero". Simple
  // heuristic: scan each diff hunk, if hunk contains hero AND a new copy
  // block has >30 words, flag it.
  const hunks = diff.split(/\n(?=@@ )/);
  for (const hunk of hunks) {
    if (!/(class\s*=\s*["'][^"']*\bhero\b|id\s*=\s*["']hero)/i.test(hunk)) continue;
    const adds = hunk.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
    for (const line of adds) {
      const text = line.slice(1)
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z#0-9]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!text) continue;
      // Skip CJK-heavy lines (word count via spaces is meaningless there);
      // Latin-only count.
      if (/[\u3400-\u9fff\u3040-\u30ff]/.test(text)) continue;
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length > 30) {
        flag('R4-brevity', file, `new hero copy block is ${words.length} words (cap 30): "${text.slice(0, 80)}…"`);
      }
    }
  }
}

if (REPORT) {
  console.log(JSON.stringify({ stagedCount: staged.length, violations }, null, 2));
  process.exit(violations.length ? 1 : 0);
}

if (violations.length === 0) {
  if (staged.length) console.log(`  [self-review] ${staged.length} staged file(s) · 0 issues`);
  else console.log('  [self-review] no staged changes · skipped');
  process.exit(0);
}

console.error('');
console.error(`  [self-review] BLOCKED — ${violations.length} issue(s):`);
for (const v of violations) {
  console.error(`    ${v.rule}  ${v.file}`);
  console.error(`      ${v.msg}`);
}
console.error('');
console.error('  Rules: R1 i18n parity · R2 asset-on-disk · R3 route allowlist');
console.error('         R4 hero brevity (≤30 words) · R5 motto unchanged');
console.error('  Bypass: git commit --no-verify');
console.error('');
process.exit(1);
