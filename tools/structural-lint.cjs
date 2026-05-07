#!/usr/bin/env node
/* tools/structural-lint.cjs — shape-of-the-writing checks.
 *
 * Catches AI shape that word-level lints miss:
 *   - 3+ CTAs in a hero block
 *   - hero sub-paragraph > 30 words
 *   - paragraph-length variance too tight (3+ paragraphs within ±15% wc)
 *   - body/header word-count ratio < 8.0
 *   - bullet lists where every bullet starts with same verb
 *   - paragraphs starting with "Furthermore," "Moreover," "Additionally,"
 *   - 3+ adjectives stacked on a noun (heuristic)
 *
 * Mode: advisory through 2026-06-06, then blocking.
 *
 * CLI:
 *   node tools/structural-lint.cjs              # all
 *   node tools/structural-lint.cjs <file>       # single
 *   node tools/structural-lint.cjs --staged
 *   node tools/structural-lint.cjs --strict
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
  /\.bak$/, /-backup-/, /\/card-audit\.html$/, /\/trailer\/review\.html$/
];

function inScope(p) {
  if (!/\.(html|md)$/i.test(p)) return false;
  if (!/^public\//.test(p) && !/^doctrine\//.test(p)) return false;
  return !EXCLUDES.some(re => re.test(p));
}

function listAll(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) listAll(f, out);
    else out.push(path.relative(ROOT, f));
  }
  return out;
}

function getStaged() {
  try {
    return execSync('git diff --cached --name-only --diff-filter=ACMR', { cwd: ROOT })
      .toString().trim().split('\n').filter(Boolean);
  } catch { return []; }
}

function wordCount(s) {
  const latin = (s.match(/[A-Za-z][A-Za-z'\-]*/g) || []).length;
  const cjk = (s.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) || []).length;
  return latin + cjk;
}

// Skip lint inside the rules-listing files themselves (they quote bad phrases on purpose)
function isDoctrineRulesFile(rel) {
  return /^doctrine\/(REJECTIONS\.md|VOICE\.md|PATTERNS\.md|MEDIA\/)/.test(rel);
}

function checkHeroCTAs(html, flags) {
  // Find first <header> or <hero> / class="hero" block, count CTAs
  const heroMatch = html.match(/<header[\s\S]*?<\/header>|<section[^>]*class=["'][^"']*hero[^"']*["'][\s\S]*?<\/section>/i);
  if (!heroMatch) return;
  const block = heroMatch[0];
  // CTA = <a> with class containing 'cta' or 'btn', or <button> primary
  const ctas = (block.match(/<a[^>]*class=["'][^"']*(?:cta|btn|button)[^"']*["']/gi) || []).length
             + (block.match(/<button[^>]*>/gi) || []).length;
  if (ctas >= 3) {
    flags.push({ rule:'hero-ctas', detail:`${ctas} CTAs in hero (max 2)`, severity:'high' });
  }
}

function checkHeroSubLength(html, flags) {
  // First <p> inside header / hero
  const heroMatch = html.match(/<header[\s\S]*?<\/header>|<section[^>]*class=["'][^"']*hero[^"']*["'][\s\S]*?<\/section>/i);
  if (!heroMatch) return;
  const psub = heroMatch[0].match(/<p[^>]*>([\s\S]*?)<\/p>/);
  if (!psub) return;
  const text = psub[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wc = wordCount(text);
  if (wc > 30) {
    flags.push({ rule:'hero-sub-length', detail:`hero sub paragraph is ${wc} words (max 30)`, preview: text.slice(0,90), severity:'medium' });
  }
}

function checkParagraphVariance(html, flags) {
  // Pull all <p> word counts (HTML); for MD use double-newline blocks
  const ps = (html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [])
    .map(p => wordCount(p.replace(/<[^>]+>/g,' ')));
  if (ps.length < 5) return;
  // For each rolling block of 5 paragraphs, count near-equal pairs
  for (let i = 0; i + 5 <= ps.length; i++) {
    const win = ps.slice(i, i + 5);
    let nearEqualCount = 0;
    for (let a = 0; a < win.length; a++) {
      for (let b = a + 1; b < win.length; b++) {
        if (win[a] >= 8 && win[b] >= 8) {
          const ratio = Math.abs(win[a] - win[b]) / Math.max(win[a], win[b]);
          if (ratio <= 0.15) nearEqualCount++;
        }
      }
    }
    if (nearEqualCount >= 3) {
      flags.push({ rule:'paragraph-variance', detail:`paragraphs ${i}–${i+4} have ${nearEqualCount} near-equal pairs (wc=[${win.join(',')}])`, severity:'low' });
      break;
    }
  }
}

function checkHeaderRatio(html, flags) {
  if (/<!--\s*doctrine:skip header-ratio\s*-->/i.test(html)) return;
  const headers = (html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi) || [])
    .map(h => wordCount(h.replace(/<[^>]+>/g,' ')))
    .reduce((a,b)=>a+b, 0);
  const body = (html.match(/<p[^>]*>([\s\S]*?)<\/p>|<li[^>]*>([\s\S]*?)<\/li>/gi) || [])
    .map(p => wordCount(p.replace(/<[^>]+>/g,' ')))
    .reduce((a,b)=>a+b, 0);
  if (headers >= 30 && body / Math.max(headers,1) < 8.0) {
    flags.push({ rule:'header-ratio', detail:`body/header ratio = ${(body/Math.max(headers,1)).toFixed(2)} (min 8.0)`, severity:'low' });
  }
}

function checkBulletStartVerb(html, flags) {
  const lis = (html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [])
    .map(li => li.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
  if (lis.length < 4) return;
  // Find runs of ≥4 consecutive bullets where first word is the same
  let runStart = 0;
  for (let i = 1; i <= lis.length; i++) {
    const prevWord = (lis[runStart].split(/\s+/)[0] || '').toLowerCase();
    const curWord  = i < lis.length ? (lis[i].split(/\s+/)[0] || '').toLowerCase() : null;
    if (curWord === prevWord && curWord && curWord.length > 2) continue;
    if (i - runStart >= 4 && prevWord) {
      flags.push({ rule:'bullet-same-verb', detail:`${i-runStart} bullets start with "${prevWord}"`, severity:'low' });
    }
    runStart = i;
  }
}

function checkConnectiveOpeners(html, flags) {
  // Paragraphs starting with banned connectives
  const ps = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const banned = /^\s*(furthermore|moreover|additionally|in conclusion|to summarize|to sum up)\b/i;
  let hits = 0;
  for (const p of ps) {
    const txt = p.replace(/<[^>]+>/g,' ').trim();
    if (banned.test(txt)) hits++;
  }
  if (hits) flags.push({ rule:'connective-openers', detail:`${hits} paragraph(s) start with banned connective`, severity:'medium' });
}

function checkAdjectiveStack(html, flags) {
  // 3+ adjectives separated by commas before a noun — rough heuristic in EN
  const text = html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ');
  const re = /\b(\w+),\s*(\w+),\s*(\w+)\s+(solution|product|service|platform|experience|approach|technology)\b/gi;
  let m, count = 0, samples = [];
  while ((m = re.exec(text)) !== null) {
    count++;
    if (samples.length < 2) samples.push(m[0]);
  }
  if (count) flags.push({ rule:'adjective-stack', detail:`${count} stacked-adjective phrases`, sample:samples.join(' | '), severity:'low' });
}

function checkFile(rel) {
  if (isDoctrineRulesFile(rel)) return null;
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  const src = fs.readFileSync(full, 'utf8');
  const flags = [];
  const isHTML = /\.html$/i.test(rel);
  if (isHTML) {
    checkHeroCTAs(src, flags);
    checkHeroSubLength(src, flags);
    checkParagraphVariance(src, flags);
    checkHeaderRatio(src, flags);
    checkBulletStartVerb(src, flags);
    checkConnectiveOpeners(src, flags);
    checkAdjectiveStack(src, flags);
  } else {
    // Markdown: check connective openers + adjective stack only
    checkConnectiveOpeners(src.replace(/\n\n+/g, '</p><p>'), flags);
    checkAdjectiveStack(src, flags);
  }
  return { rel, flags };
}

function main() {
  const argv = process.argv.slice(2).filter(a => !a.startsWith('--'));
  let files;
  if (process.argv.includes('--staged')) {
    files = getStaged().filter(inScope);
    if (!files.length) { console.log('  [structural] no staged in-scope files'); process.exit(0); }
  } else if (argv.length) {
    files = argv.filter(inScope);
  } else {
    const all = [];
    if (fs.existsSync(path.join(ROOT,'public'))) listAll(path.join(ROOT,'public'), all);
    if (fs.existsSync(path.join(ROOT,'doctrine'))) listAll(path.join(ROOT,'doctrine'), all);
    files = all.filter(inScope);
  }

  let total = 0, hits = 0;
  for (const f of files) {
    const r = checkFile(f); if (!r) continue;
    if (r.flags.length) {
      hits++; total += r.flags.length;
      console.log(`  ${r.rel}  ·  ${r.flags.length} flag(s)`);
      for (const fl of r.flags.slice(0, 4)) {
        console.log(`    - [${fl.severity}] ${fl.rule}: ${fl.detail}`);
        if (fl.preview) console.log(`      "${fl.preview}"`);
        if (fl.sample)  console.log(`      e.g. ${fl.sample}`);
      }
    }
  }

  const mode = STRICT ? 'BLOCKING' : 'advisory (until 2026-06-06)';
  if (total === 0) {
    console.log(`  [structural] ${files.length} file(s) scanned · 0 flags · ${mode}`);
    process.exit(0);
  }
  console.log(`  [structural] ${hits} file(s) flagged · ${total} total · ${mode}`);
  console.log(`  fix: see /doctrine/REJECTIONS.md "STRUCTURAL rejections" section`);
  process.exit(STRICT ? 1 : 0);
}
main();
