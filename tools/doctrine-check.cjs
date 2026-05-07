#!/usr/bin/env node
/* tools/doctrine-check.cjs — verify the doctrine directory is healthy.
 *
 * Checks:
 *   - all required files exist and are non-empty
 *   - none are stale (review timestamp < 30 days old, or default fail-soft if no stamp)
 *   - LESSONS.jsonl is valid JSONL (every line parses)
 *   - CLAUDE.md at repo root points at /doctrine
 *
 * CLI:
 *   node tools/doctrine-check.cjs            # human-readable
 *   node tools/doctrine-check.cjs --strict   # exit 1 on stale or missing
 *   node tools/doctrine-check.cjs --json     # JSON for sensors
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOC = path.join(ROOT, 'doctrine');

const REQUIRED = [
  'README.md',
  'VOICE.md',
  'REJECTIONS.md',
  'PATTERNS.md',
  'LESSONS.jsonl',
  'CHECKLISTS/before-build.md',
  'CHECKLISTS/before-commit.md',
  'CHECKLISTS/before-pr.md',
  'MEDIA/IMAGE.md',
  'MEDIA/INFOGRAPHIC.md',
  'MEDIA/AUDIO.md',
  'MEDIA/VIDEO.md'
];

const STALE_DAYS = 30;
const STRICT = process.argv.includes('--strict');
const JSONOUT = process.argv.includes('--json');

function daysSince(d) { return Math.floor((Date.now() - d.getTime()) / 86400000); }

function findReviewStamp(content) {
  const m = content.match(/Last reviewed:\s*(\d{4}-\d{2}-\d{2})/i);
  if (!m) return null;
  return new Date(m[1]);
}

function checkFile(rel) {
  const full = path.join(DOC, rel);
  if (!fs.existsSync(full)) return { rel, ok:false, why:'missing' };
  const stat = fs.statSync(full);
  if (stat.size < 64) return { rel, ok:false, why:'empty/too-small' };
  const content = fs.readFileSync(full, 'utf8');
  const stamp = findReviewStamp(content);
  const age = stamp ? daysSince(stamp) : null;
  if (rel === 'LESSONS.jsonl') {
    let bad = 0, total = 0;
    for (const line of content.split('\n').filter(Boolean)) {
      total++;
      try { JSON.parse(line); } catch { bad++; }
    }
    return { rel, ok: bad === 0, total, bad, why: bad ? `${bad}/${total} invalid JSON lines` : null };
  }
  return {
    rel,
    ok: stamp ? age <= STALE_DAYS : true,
    bytes: stat.size,
    last_reviewed: stamp ? stamp.toISOString().slice(0,10) : null,
    age_days: age,
    why: stamp && age > STALE_DAYS ? `stale by ${age - STALE_DAYS} days` : null
  };
}

function checkClaudeMd() {
  const f = path.join(ROOT, 'CLAUDE.md');
  if (!fs.existsSync(f)) return { rel:'CLAUDE.md (root)', ok:false, why:'missing' };
  const c = fs.readFileSync(f, 'utf8');
  if (!/\/doctrine/.test(c)) return { rel:'CLAUDE.md (root)', ok:false, why:'does not point at /doctrine' };
  return { rel:'CLAUDE.md (root)', ok:true, bytes:c.length };
}

function main() {
  const results = REQUIRED.map(checkFile);
  results.push(checkClaudeMd());
  const failed = results.filter(r => !r.ok);

  if (JSONOUT) {
    console.log(JSON.stringify({ ok: failed.length === 0, results }, null, 2));
    process.exit(failed.length === 0 ? 0 : (STRICT ? 1 : 0));
  }

  for (const r of results) {
    const tag = r.ok ? 'OK ' : 'FAIL';
    const detail = r.ok
      ? (r.last_reviewed ? `(reviewed ${r.last_reviewed}, ${r.age_days}d)` : (r.total ? `(${r.total} lessons)` : `(${r.bytes||0}B)`))
      : `← ${r.why}`;
    console.log(`  [doctrine] ${tag}  ${r.rel.padEnd(38)}  ${detail}`);
  }
  if (failed.length === 0) {
    console.log(`  [doctrine] ${results.length} file(s) checked · all green`);
    process.exit(0);
  }
  console.log(`  [doctrine] ${failed.length} issue(s)`);
  process.exit(STRICT ? 1 : 0);
}
main();
