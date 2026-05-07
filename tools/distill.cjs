#!/usr/bin/env node
/* tools/distill.cjs — propose doctrine updates from accumulated lessons.
 *
 * Reads /doctrine/LESSONS.jsonl, groups recent lessons by tag/category,
 * surfaces patterns that recur 2+ times, and proposes which doctrine
 * file should be updated. Operator approves the patch, doctrine sharpens.
 *
 * Run after every 20 new lessons (or manually anytime).
 *
 * CLI:
 *   node tools/distill.cjs                # human-readable proposal
 *   node tools/distill.cjs --since N      # only consider last N lessons
 *   node tools/distill.cjs --json         # JSON output
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'doctrine', 'LESSONS.jsonl');

const TARGET_MAP = {
  structural: 'doctrine/REJECTIONS.md (STRUCTURAL section) + doctrine/PATTERNS.md (anti-pattern)',
  copy:       'doctrine/VOICE.md + doctrine/REJECTIONS.md (word table)',
  build:      'doctrine/PATTERNS.md (P-### build pattern)',
  data:       'doctrine/PATTERNS.md + relevant MEDIA file if applicable',
  discipline: 'doctrine/REJECTIONS.md (doctrine rejections list)',
  framing:    'doctrine/VOICE.md (positioning section)',
  ux:         'doctrine/PATTERNS.md (anti-pattern A-###)'
};

function readAll() {
  if (!fs.existsSync(FILE)) return [];
  return fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

function getFlag(name) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return null;
  return process.argv[i + 1];
}

function distill(rows) {
  // Group by tag
  const byTag = {};
  for (const r of rows) {
    if (!r.tag) continue;
    if (!byTag[r.tag]) byTag[r.tag] = [];
    byTag[r.tag].push(r);
  }
  // Group by category
  const byCat = {};
  for (const r of rows) {
    const c = r.category || 'uncat';
    if (!byCat[c]) byCat[c] = [];
    byCat[c].push(r);
  }
  // Recurring tags (>=2)
  const recurring = Object.entries(byTag).filter(([_, v]) => v.length >= 2)
    .sort((a,b) => b[1].length - a[1].length);
  // Most common categories
  const cats = Object.entries(byCat).sort((a,b) => b[1].length - a[1].length);
  // Unpromoted lessons (promoted_to contains "pending")
  const unpromoted = rows.filter(r => /pending/i.test(r.promoted_to || ''));
  // Lessons by severity
  const high = rows.filter(r => r.severity === 'high');

  return { byTag, byCat, recurring, cats, unpromoted, high, total: rows.length };
}

function main() {
  const all = readAll();
  if (all.length === 0) {
    console.log('  [distill] no lessons yet — append via tools/lesson-log.cjs');
    process.exit(0);
  }
  const since = parseInt(getFlag('since'), 10);
  const rows = (!isNaN(since) && since > 0) ? all.slice(-since) : all;
  const d = distill(rows);

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(d, null, 2));
    process.exit(0);
  }

  console.log(`  [distill] analyzing ${rows.length} lesson(s) of ${all.length} total`);
  console.log('');
  console.log('  ── Recurring tags (≥2 occurrences) ──');
  if (d.recurring.length === 0) {
    console.log('    none — no candidate for promotion yet');
  } else {
    for (const [tag, lessons] of d.recurring) {
      const cats = [...new Set(lessons.map(l => l.category))].join(', ');
      console.log(`    ${tag}  ×${lessons.length}  [${cats}]`);
      for (const l of lessons.slice(0, 2)) {
        console.log(`      - ${l.id} ${l.date}: ${(l.what_happened || '').slice(0, 70)}`);
      }
      const target = TARGET_MAP[lessons[0].category] || 'doctrine/REJECTIONS.md';
      console.log(`      → propose: promote into ${target}`);
    }
  }
  console.log('');
  console.log('  ── Categories ranked ──');
  for (const [cat, ls] of d.cats) {
    console.log(`    ${cat.padEnd(12)} ×${ls.length}`);
  }
  console.log('');
  console.log(`  ── Unpromoted lessons (${d.unpromoted.length}) ──`);
  for (const l of d.unpromoted.slice(0, 5)) {
    console.log(`    ${l.id}  [${l.severity}/${l.category}]  ${l.tag}`);
  }
  if (d.unpromoted.length > 5) console.log(`    … and ${d.unpromoted.length - 5} more`);
  console.log('');
  console.log(`  ── High-severity lessons (${d.high.length}) ──`);
  for (const l of d.high.slice(-5)) {
    console.log(`    ${l.id}  ${l.date}  ${l.tag}  → ${l.fix && l.fix.slice(0, 60)}`);
  }
  console.log('');
  console.log('  next: review the recurring tags above. For each, decide:');
  console.log('   1) promote into the suggested doctrine file (edit + commit)');
  console.log('   2) update each promoted lesson\'s "promoted_to" field via direct JSONL edit');
  console.log('   3) if 20+ lessons accumulate without promotion, doctrine is drifting');
}

main();
