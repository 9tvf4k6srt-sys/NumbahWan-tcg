#!/usr/bin/env node
/* tools/lesson-log.cjs — append a lesson to /doctrine/LESSONS.jsonl
 *
 * One-line lesson capture after pushback or rework. Keeps the loop
 * tight: every push that involved rework should produce one entry.
 *
 * CLI (interactive):
 *   node tools/lesson-log.cjs
 *
 * CLI (flag form, scriptable):
 *   node tools/lesson-log.cjs \
 *     --severity high|medium|low \
 *     --category structural|copy|build|data|discipline|framing|ux \
 *     --tag <short-tag> \
 *     --what "what happened in one sentence" \
 *     --cause "root cause" \
 *     --fix "the fix or rule" \
 *     --by CL|HW \
 *     --push <push-id>
 *
 * Sub-commands:
 *   node tools/lesson-log.cjs --list [N]      # show last N (default 10)
 *   node tools/lesson-log.cjs --count
 *   node tools/lesson-log.cjs --validate      # parse all lines, report issues
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'doctrine', 'LESSONS.jsonl');

function readAll() {
  if (!fs.existsSync(FILE)) return [];
  return fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch { return { _malformed: true, raw: l }; }
  });
}

function nextId(rows) {
  let max = 0;
  for (const r of rows) {
    const m = (r.id || '').match(/L-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'L-' + String(max + 1).padStart(3, '0');
}

function getFlag(name) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return null;
  return process.argv[i + 1];
}

function appendLesson(obj) {
  fs.appendFileSync(FILE, JSON.stringify(obj) + '\n');
}

function listLast(n = 10) {
  const rows = readAll();
  const recent = rows.slice(-n);
  for (const r of recent) {
    if (r._malformed) { console.log('  [malformed]', r.raw.slice(0,100)); continue; }
    console.log(`  ${r.id || '?'}  ${r.date || '?'}  [${r.severity || '?'}/${r.category || '?'}]  ${r.tag || '?'}`);
    if (r.what_happened) console.log(`     what: ${r.what_happened}`);
    if (r.fix) console.log(`     fix:  ${r.fix}`);
  }
  console.log(`  [lesson-log] ${rows.length} total · showing last ${recent.length}`);
}

function validate() {
  const rows = readAll();
  const bad = rows.filter(r => r._malformed);
  const missingFields = rows.filter(r => !r._malformed && (!r.id || !r.date || !r.what_happened || !r.fix));
  console.log(`  [lesson-log] ${rows.length} entries · ${bad.length} malformed · ${missingFields.length} missing required fields`);
  if (bad.length) console.log('  malformed lines:'), bad.slice(0,3).forEach(b => console.log('    ', b.raw.slice(0,80)));
  if (missingFields.length) console.log('  missing-field ids:', missingFields.slice(0,5).map(r => r.id || '?').join(', '));
  process.exit(bad.length || missingFields.length ? 1 : 0);
}

async function interactive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(r => rl.question(q, ans => r(ans.trim())));
  console.log('  [lesson-log] interactive — record a pushback / rework lesson');
  console.log('  press enter to skip a field; required: tag, what, fix');
  const severity = (await ask('  severity (high/medium/low) [medium]: ')) || 'medium';
  const category = (await ask('  category (structural/copy/build/data/discipline/framing/ux) [copy]: ')) || 'copy';
  const tag = await ask('  tag (short kebab) *: ');
  const what = await ask('  what happened (one sentence) *: ');
  const cause = await ask('  root cause: ');
  const fix = await ask('  fix / rule *: ');
  const by = (await ask('  by (CL/HW) [CL]: ')) || 'CL';
  const push = (await ask('  push id [unspecified]: ')) || 'unspecified';
  rl.close();
  if (!tag || !what || !fix) {
    console.log('  [lesson-log] missing required fields — aborted, nothing written');
    process.exit(1);
  }
  const rows = readAll();
  const obj = {
    id: nextId(rows),
    date: new Date().toISOString().slice(0,10),
    push,
    severity,
    category,
    tag,
    what_happened: what,
    root_cause: cause || null,
    fix,
    promoted_to: '(pending — run distill.cjs after 20 lessons)',
    operator: 'user',
    by
  };
  appendLesson(obj);
  console.log(`  [lesson-log] wrote ${obj.id}`);
}

function fromFlags() {
  const tag = getFlag('tag');
  const what = getFlag('what');
  const fix = getFlag('fix');
  if (!tag || !what || !fix) {
    console.log('  [lesson-log] usage: --tag X --what "..." --fix "..." [--severity --category --cause --by --push]');
    process.exit(2);
  }
  const rows = readAll();
  const obj = {
    id: nextId(rows),
    date: new Date().toISOString().slice(0,10),
    push: getFlag('push') || 'unspecified',
    severity: getFlag('severity') || 'medium',
    category: getFlag('category') || 'copy',
    tag,
    what_happened: what,
    root_cause: getFlag('cause') || null,
    fix,
    promoted_to: '(pending — run distill.cjs after 20 lessons)',
    operator: 'user',
    by: getFlag('by') || 'CL'
  };
  appendLesson(obj);
  console.log(`  [lesson-log] wrote ${obj.id}`);
}

if (process.argv.includes('--list')) {
  const i = process.argv.indexOf('--list');
  const n = parseInt(process.argv[i+1], 10);
  listLast(isNaN(n) ? 10 : n);
} else if (process.argv.includes('--count')) {
  console.log('  [lesson-log] total:', readAll().length);
} else if (process.argv.includes('--validate')) {
  validate();
} else if (process.argv.includes('--tag')) {
  fromFlags();
} else {
  interactive();
}
