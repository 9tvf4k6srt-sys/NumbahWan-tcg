#!/usr/bin/env node
/**
 * AI Naturalness Scorer
 * ═══════════════════════════════════════════════════════════════════
 * The second stage of the AI-tell gate. The regex linter
 * (ai-tell-lint.cjs) catches the tells we have already written down.
 * This reads the actual prose with a model and rates how human it
 * sounds, in whatever language it is written. It catches the tells no
 * regex can name: translation-ese rhythm, hedging cadence, the smell
 * of a sentence that was assembled rather than said.
 *
 * It does NOT replace the regex gate. The regex gate runs on every
 * commit (fast, free, offline). This runs on demand, in CI, or when an
 * author wants a deeper read, because it costs an API call.
 *
 * Model: gpt-5.1 via the Genspark LLM proxy.
 *   key  : process.env.GSK_API_KEY   (gsk-…)
 *   base : process.env.OPENAI_BASE_URL  (…/api/llm_proxy/v1)
 *
 * USAGE:
 *   node tools/ai-naturalness.cjs public/invest.html
 *   node tools/ai-naturalness.cjs public/invest.html --json
 *   node tools/ai-naturalness.cjs public/a.html public/b.html --min=70
 *
 * EXIT:
 *   0  every scored block >= --min (default 70)
 *   1  at least one block scored below --min, or a hard API/parse error
 *
 * Output per block: {lang, score 0-100, verdict, tells[], rewrite}.
 * A score >= 80 reads as written by a fluent native. 70-79 passes but
 * has a seam. Below 70 reads as machine-translated or AI-drafted.
 *
 * @version 1.0.0
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..');

// ── args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const MIN_ARG = args.find(a => a.startsWith('--min='));
const MIN = MIN_ARG ? Number(MIN_ARG.split('=')[1]) : 70;
const files = args.filter(a => !a.startsWith('--'));

const API_KEY = process.env.GSK_API_KEY || process.env.OPENAI_API_KEY || '';
const BASE = (process.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1').replace(/\/$/, '');
const MODEL = process.env.AI_NATURALNESS_MODEL || 'gpt-5.1';

// ── prose extraction ──────────────────────────────────────────────
// We score what a reader sees, not the markup. Strip scripts, styles,
// tags, HTML comments, then split into substantial text blocks.
function extractProse(raw, rel) {
  let t = raw;
  if (/\.(html?|md)$/.test(rel)) {
    t = t.replace(/<!--[\s\S]*?-->/g, ' ');
    t = t.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    t = t.replace(/<style[\s\S]*?<\/style>/gi, ' ');
    t = t.replace(/<[^>]+>/g, '\n');          // tags become breaks
    t = t.replace(/&[a-z]+;/gi, ' ');         // entities
    if (/\.md$/.test(rel)) {
      t = t.replace(/```[\s\S]*?```/g, ' ');  // fenced code
      t = t.replace(/`[^`]*`/g, ' ');         // inline code
      t = t.replace(/^[#>\-*|].*$/gm, ' ');   // headings/lists/tables/quotes scaffolding
    }
  }
  // Collapse whitespace, split on blank lines / sentence-ish breaks.
  const lines = t.split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  // Keep blocks that are real prose: at least 24 chars and contain a
  // space (CJK/Thai count chars, so also keep >=12 CJK/Thai chars).
  const blocks = [];
  for (const line of lines) {
    const cjkThai = (line.match(/[\u4e00-\u9fff\u3040-\u30ff\u0e00-\u0e7f]/g) || []).length;
    const wordy = line.includes(' ') && line.length >= 24;
    if (wordy || cjkThai >= 12) blocks.push(line);
  }
  // De-dupe and cap total volume so a single file stays one cheap call.
  const seen = new Set();
  const out = [];
  for (const b of blocks) {
    if (seen.has(b)) continue;
    seen.add(b);
    out.push(b);
    if (out.length >= 60) break;
  }
  return out;
}

// ── prompt ────────────────────────────────────────────────────────
const SYSTEM = [
  'You are a bilingual copy editor who can tell, in any language, whether a sentence was written by a fluent native or assembled by a machine / AI / literal translation.',
  'You judge ONLY naturalness and human voice. You do NOT judge whether the marketing claim is true, on-brand, or well-formatted.',
  'House style being enforced (treat violations as strong tells, in every language including translations):',
  '  - no em-dashes in prose',
  '  - no "delve", "nuanced", "intricate", "multifaceted", "underpin"',
  '  - no "not X, it is Y" / "not just X but Y" reframes; state Y directly',
  '  - no stacked rule-of-three lists used for rhythm',
  '  - no hedging throat-clearing ("it is worth noting", "needless to say", "in a world where")',
  'Score each block 0-100 for how natural it reads to a native speaker of its language:',
  '  90-100 indistinguishable from a sharp human writer',
  '  80-89  fluent, a tiny seam',
  '  70-79  passable but you can feel the draft',
  '  below 70 reads as machine-translated or AI-drafted',
  'For any block under 80, name the specific tell and give one rewrite in the SAME language that a native would actually say.',
  'Return STRICT JSON only, no prose outside the JSON.'
].join('\n');

function buildUserPayload(blocks) {
  return JSON.stringify({
    instruction: 'Score every block. Detect each block\'s language yourself (en, zh, ja, th, or other) and judge it by that language\'s native standard.',
    schema: {
      results: [{
        i: 'index of the block (number)',
        lang: 'detected language code',
        score: 'integer 0-100',
        tell: 'the specific unnatural pattern, empty string if score>=80',
        rewrite: 'a natural rewrite in the same language, empty string if score>=80'
      }]
    },
    blocks: blocks.map((b, i) => ({ i, text: b }))
  });
}

// ── LLM call ──────────────────────────────────────────────────────
function callLLM(blocks) {
  return new Promise((resolve, reject) => {
    if (!API_KEY) return reject(new Error('no GSK_API_KEY / OPENAI_API_KEY in env'));
    const body = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: buildUserPayload(blocks) }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 4000
    });
    const u = new URL(BASE + '/chat/completions');
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error('HTTP ' + res.statusCode + ': ' + data.slice(0, 300)));
        }
        try {
          const j = JSON.parse(data);
          const content = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
          if (!content) return reject(new Error('no content in LLM response'));
          resolve(JSON.parse(content));
        } catch (e) {
          reject(new Error('parse failed: ' + e.message));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(90000, () => req.destroy(new Error('LLM timeout')));
    req.write(body);
    req.end();
  });
}

// ── run ───────────────────────────────────────────────────────────
async function scoreFile(rel) {
  const abs = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return { file: rel, error: 'not found', blocks: [] };
  const raw = fs.readFileSync(abs, 'utf8');
  const blocks = extractProse(raw, path.relative(ROOT, abs));
  if (blocks.length === 0) return { file: rel, error: 'no prose', blocks: [] };
  const res = await callLLM(blocks);
  const results = (res && res.results) || [];
  const enriched = results.map(r => ({
    lang: r.lang || '?',
    score: typeof r.score === 'number' ? r.score : 0,
    tell: r.tell || '',
    rewrite: r.rewrite || '',
    text: blocks[r.i] || ''
  }));
  return { file: rel, blocks: enriched };
}

function summarize(fileResult) {
  const scored = fileResult.blocks.filter(b => typeof b.score === 'number');
  if (scored.length === 0) return { avg: null, min: null, failing: [] };
  const avg = Math.round(scored.reduce((a, b) => a + b.score, 0) / scored.length);
  const min = Math.min(...scored.map(b => b.score));
  const failing = scored.filter(b => b.score < MIN).sort((a, b) => a.score - b.score);
  return { avg, min, failing };
}

(async () => {
  if (files.length === 0) {
    console.error('usage: node tools/ai-naturalness.cjs <file...> [--json] [--min=70]');
    process.exit(2);
  }
  const all = [];
  let worstUnderMin = false;
  for (const f of files) {
    try {
      const r = await scoreFile(f);
      const s = summarize(r);
      all.push({ ...r, summary: s });
      if (s.min !== null && s.min < MIN) worstUnderMin = true;
    } catch (e) {
      all.push({ file: f, error: e.message, blocks: [], summary: { avg: null, min: null, failing: [] } });
      worstUnderMin = true;
    }
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ min: MIN, model: MODEL, files: all }, null, 2));
  } else {
    console.log('');
    console.log('  AI NATURALNESS REPORT  (model: ' + MODEL + ', pass >= ' + MIN + ')');
    console.log('  ═══════════════════════════════════════════════════════════');
    for (const r of all) {
      if (r.error) { console.log('  ' + r.file + '  ✗ ' + r.error); continue; }
      const s = r.summary;
      const flag = s.min !== null && s.min < MIN ? '✗' : '✓';
      console.log('  ' + flag + ' ' + r.file + '   avg ' + s.avg + '  min ' + s.min + '  (' + r.blocks.length + ' blocks)');
      for (const b of s.failing.slice(0, 8)) {
        console.log('      [' + b.lang + ' ' + b.score + '] ' + b.text.slice(0, 70));
        if (b.tell) console.log('         tell   : ' + b.tell);
        if (b.rewrite) console.log('         rewrite: ' + b.rewrite.slice(0, 90));
      }
      console.log('');
    }
  }
  process.exit(worstUnderMin ? 1 : 0);
})();
