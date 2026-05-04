#!/usr/bin/env node
/**
 * check-motto.cjs — sensor #3
 * ─────────────────────────────────────────────────────────────────
 * The motto is the brand. If it drifts in any of the three languages
 * on the surfaces below, we want to know before the commit lands.
 *
 *   node tools/check-motto.cjs           # check
 *   node tools/check-motto.cjs --report  # JSON
 *
 * Loose match: we tolerate em-dash/hyphen swaps, &amp; vs &, and
 * surrounding HTML tags. We do NOT tolerate paraphrasing.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const REPORT = args.includes('--report');

// Canonical motto fragments. Each must appear at least once on each
// listed surface, in each listed language. Update both this file and
// AGENTS.md if you change the motto.
const MOTTO = {
  en: [
    'like our own',                           // shared core
    'wealth',                                  // wealth-side
    'business',                                // business-side
  ],
  zh: [
    '當自己的在顧',
  ],
  ja: [
    '自分のもの',                              // core ja phrase
  ],
};

const SURFACES = [
  { file: 'public/invest.html',                       require: ['en', 'zh'] },
  // Loading screen is brand-only, motto optional.
  // Playbook surfaces inherit motto via header, not required string-match.
];

function loose(html) {
  // Normalise to make match resilient to entity / dash / whitespace drift.
  return html
    .replace(/&amp;/g, '&')
    .replace(/&mdash;|&#8212;|—/g, '-')
    .replace(/&nbsp;|\s+/g, ' ');
}

const violations = [];

for (const s of SURFACES) {
  const abs = path.join(ROOT, s.file);
  if (!fs.existsSync(abs)) {
    violations.push({ file: s.file, error: 'missing-file' });
    continue;
  }
  const raw = fs.readFileSync(abs, 'utf8');
  const norm = loose(raw);
  for (const lang of s.require) {
    for (const frag of MOTTO[lang]) {
      const needle = loose(frag);
      if (!norm.includes(needle)) {
        violations.push({ file: s.file, lang, missing: frag });
      }
    }
  }
}

if (REPORT) {
  console.log(JSON.stringify({ violations }, null, 2));
  process.exit(violations.length ? 1 : 0);
}

if (violations.length === 0) {
  console.log(`  [motto] ${SURFACES.length} surface(s) · all canonical strings present`);
  process.exit(0);
}

console.error('');
console.error('  [motto] BLOCKED — canonical motto missing or paraphrased:');
for (const v of violations) {
  if (v.error) console.error(`    ${v.file}  →  ${v.error}`);
  else console.error(`    ${v.file}  [${v.lang}]  missing: ${v.missing}`);
}
console.error('');
console.error('  If you intentionally changed the motto, update tools/check-motto.cjs::MOTTO');
console.error('  AND AGENTS.md §3 in the same commit.');
console.error('  Bypass: git commit --no-verify');
console.error('');
process.exit(1);
