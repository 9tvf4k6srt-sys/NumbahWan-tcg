#!/usr/bin/env node
/* tools/burstiness-lint.cjs — sentence-length variance check.
 *
 * Detects flatlined AI cadence. Within any 6-sentence window,
 * stdev of word counts must be ≥ 5.0. Lower = monotone AI rhythm.
 *
 * Mode: advisory through 2026-06-06, then blocking.
 *
 * Scope: same as ai-tell-corpus.json — public/ HTML + MD, with
 * per-file exclusions for legacy/research/backup.
 *
 * CLI:
 *   node tools/burstiness-lint.cjs              # all in scope
 *   node tools/burstiness-lint.cjs <file>       # single file
 *   node tools/burstiness-lint.cjs --staged     # only staged files (pre-commit)
 *   node tools/burstiness-lint.cjs --strict     # blocking exit code regardless of date
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const HARD_FAIL_AFTER = new Date('2026-06-06');
const TODAY = new Date();
const STRICT = process.argv.includes('--strict') || TODAY > HARD_FAIL_AFTER;

const EXCLUDES = [
  /\/research\//, /\/research-md\//, /-legacy\.html$/, /-old\.html$/,
  /\.bak$/, /-backup-/, /\/card-audit\.html$/, /\/trailer\/review\.html$/,
  // Doctrine files quote rule lists by design — table-shaped writing isn't AI cadence.
  /^doctrine\/(REJECTIONS|VOICE|PATTERNS|README)\.md$/,
  /^doctrine\/CHECKLISTS\//,
  /^doctrine\/MEDIA\//,
  /^doctrine\/LESSONS\.jsonl$/,
  /^CLAUDE\.md$/
];

function inScope(p) {
  if (!/\.(html|md)$/i.test(p)) return false;
  if (!/^public\//.test(p) && !/^doctrine\//.test(p)) return false;
  return !EXCLUDES.some(re => re.test(p));
}

function listAllFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listAllFiles(full, out);
    else out.push(path.relative(ROOT, full));
  }
  return out;
}

function getStaged() {
  try {
    return execSync('git diff --cached --name-only --diff-filter=ACMR', { cwd: ROOT })
      .toString().trim().split('\n').filter(Boolean);
  } catch { return []; }
}

// strip HTML, scripts, styles, code blocks — leave prose only
function extractProse(content) {
  let s = content;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/`[^`]+`/g, ' ');
  // Replace tags with space
  s = s.replace(/<[^>]+>/g, ' ');
  // Decode common entities
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  // Markdown headings + list markers stripped
  s = s.replace(/^#+\s+/gm, '').replace(/^[-*+]\s+/gm, '').replace(/^>\s*/gm, '');
  return s;
}

function splitSentences(prose) {
  // Split on sentence-final punctuation in EN/ZH/JA. Keep delimiters out.
  // Avoid splitting on numeric decimals (NT$2.16B) by requiring a space or end after the punct.
  const parts = prose.split(/(?<=[.!?。!?])(?=\s)|(?<=[。!?])/u);
  return parts.map(p => p.trim()).filter(p => p.length > 4);
}

function wordCount(s) {
  // Latin words
  const latinWords = (s.match(/[A-Za-z][A-Za-z'\-]*/g) || []).length;
  // CJK characters count as words (each glyph carries word-equivalent weight in cadence)
  const cjkChars = (s.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) || []).length;
  return latinWords + cjkChars;
}

function stdev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a,b) => a+b, 0) / arr.length;
  const v = arr.reduce((a,b) => a + (b - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(v);
}

function checkFile(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  const src = fs.readFileSync(full, 'utf8');
  const prose = extractProse(src);
  const sentences = splitSentences(prose);
  if (sentences.length < 6) return { rel, sentences: sentences.length, skip: true };

  const counts = sentences.map(wordCount);
  const flags = [];
  for (let i = 0; i + 6 <= counts.length; i++) {
    const win = counts.slice(i, i + 6);
    const sd = stdev(win);
    if (sd < 5.0) {
      flags.push({ start: i, window: win, stdev: +sd.toFixed(2), preview: sentences[i].slice(0, 80) });
    }
  }
  return { rel, sentences: sentences.length, flags };
}

function main() {
  const argv = process.argv.slice(2).filter(a => !a.startsWith('--'));
  let files;
  if (process.argv.includes('--staged')) {
    files = getStaged().filter(inScope);
    if (!files.length) { console.log('  [burstiness] no staged in-scope files'); process.exit(0); }
  } else if (argv.length) {
    files = argv.filter(inScope);
  } else {
    const all = [];
    if (fs.existsSync(path.join(ROOT, 'public'))) listAllFiles(path.join(ROOT, 'public'), all);
    if (fs.existsSync(path.join(ROOT, 'doctrine'))) listAllFiles(path.join(ROOT, 'doctrine'), all);
    files = all.filter(inScope);
  }

  let totalFlagged = 0;
  let filesFlagged = 0;
  for (const f of files) {
    const r = checkFile(f);
    if (!r || r.skip) continue;
    if (r.flags && r.flags.length) {
      filesFlagged++;
      totalFlagged += r.flags.length;
      console.log(`  ${r.rel}  ·  ${r.flags.length} window(s) below stdev 5.0`);
      for (const fl of r.flags.slice(0, 3)) {
        console.log(`    - sent#${fl.start}–${fl.start+5}  stdev=${fl.stdev}  words=[${fl.window.join(',')}]`);
        console.log(`      "${fl.preview}…"`);
      }
    }
  }

  const mode = STRICT ? 'BLOCKING' : 'advisory (until 2026-06-06)';
  if (totalFlagged === 0) {
    console.log(`  [burstiness] ${files.length} file(s) scanned · 0 flat windows · ${mode}`);
    process.exit(0);
  }
  console.log(`  [burstiness] ${filesFlagged} file(s) flagged · ${totalFlagged} flat window(s) · ${mode}`);
  console.log(`  fix: insert one short sentence (<8 words) or one long sentence (>25 words) in each flagged window.`);
  process.exit(STRICT ? 1 : 0);
}
main();
