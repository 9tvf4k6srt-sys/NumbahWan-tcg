#!/usr/bin/env node
/**
 * translate-i18n-placeholders.cjs
 * ============================================
 * Replaces literal [ZH] / [TH] placeholder strings in page i18n blocks
 * with real Traditional Chinese (zh-Hant) and Thai translations via the
 * configured OpenAI-compatible LLM proxy.
 *
 * The repo's i18n guard scaffolds zh/th blocks by copying the English
 * value prefixed with "[ZH] " / "[TH] " — meaning users who switch
 * language see English text with a bracket tag. Sentinel flags this as a
 * critical i18n defect (624 strings across 9 pages, i18n score 17/100).
 *
 * USAGE:
 *   node scripts/translate-i18n-placeholders.cjs            # translate all known files
 *   node scripts/translate-i18n-placeholders.cjs --dry      # parse + report, no LLM, no write
 *   node scripts/translate-i18n-placeholders.cjs public/x.html [...]   # specific files
 *
 * SAFE: only touches lines whose string value begins with the placeholder
 * tag. English values and structure are left byte-for-byte identical.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');

const DRY = process.argv.includes('--dry');
const fileArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'));

const DEFAULT_FILES = [
  'public/what-is-nwg.html',
  'public/showcase.html',
  'public/dashboard.html',
  'public/tools.html',
  'public/ai-assets.html',
  'public/qinqin.html',
  'public/kintsugi.html',
  'public/coin-shop.html',
  'public/coin-test.html',
];

const FILES = (fileArgs.length ? fileArgs : DEFAULT_FILES).map((f) =>
  path.resolve(process.cwd(), f)
);

const LANG_META = {
  ZH: { name: 'Traditional Chinese (zh-Hant, as used in Taiwan)', code: 'zh' },
  TH: { name: 'Thai (th)', code: 'th' },
  JP: { name: 'Japanese (ja)', code: 'jp' },
};

// ── LLM client ──────────────────────────────────────────────────────────
function makeClient() {
  const OpenAI = require('openai');
  const configPath = path.join(os.homedir(), '.genspark_llm.yaml');
  let config = null;
  if (fs.existsSync(configPath)) {
    config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  }
  // The yaml key can be an unexpanded ${ENV_VAR} placeholder — in that case
  // the real value lives in the environment. Prefer env when yaml is a token.
  const isPlaceholder = (v) => !v || /^\$\{.*\}$/.test(String(v).trim());
  const yamlKey = config?.openai?.api_key;
  const yamlUrl = config?.openai?.base_url;
  // GSK_API_KEY is the valid LLM-proxy token (gsk-…); OPENAI_API_KEY / GENSPARK_TOKEN
  // can be an unrelated 32-char session token that the proxy rejects with 401.
  const apiKey = isPlaceholder(yamlKey)
    ? process.env.GSK_API_KEY || process.env.OPENAI_API_KEY
    : yamlKey;
  const baseURL = isPlaceholder(yamlUrl)
    ? process.env.OPENAI_BASE_URL || process.env.GSK_BASE_URL
    : yamlUrl;
  return new OpenAI({ apiKey, baseURL });
}

// ── Placeholder line detection ──────────────────────────────────────────
// Matches:  someKey: '[ZH] English text here',   (single or double quoted)
// Captures: indent, key, quote char, tag, payload (the English, escaped JS string), trailing
const PLACEHOLDER_RE =
  /^(\s*)([A-Za-z0-9_$]+):\s*(['"])\[(ZH|TH|JP)\]\s?([\s\S]*?)\3(\s*,?\s*)$/;

function unescapeJs(str, quote) {
  // Turn the literal JS source (between quotes) into a real string value.
  // Only need to handle the escapes that appear in these files: \' \" \\ \n
  let out = str
    .replace(/\\\\/g, '\u0000')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\u0000/g, '\\');
  return out;
}

function escapeJs(value, quote) {
  let out = value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
  if (quote === "'") out = out.replace(/'/g, "\\'");
  else out = out.replace(/"/g, '\\"');
  return out;
}

// ── Translation (batched JSON) ──────────────────────────────────────────
async function translateBatch(client, texts, tag) {
  const meta = LANG_META[tag];
  const numbered = texts.map((t, i) => ({ id: i, text: t }));
  const sys =
    `You are a professional game/finance UI localizer. Translate the given UI strings ` +
    `from English into ${meta.name}. Preserve meaning, tone, and any punctuation/symbols ` +
    `(%, $, →, numbers, emoji) exactly. Do NOT translate brand names: NumbahWan, NWG, NW, ` +
    `KINTSUGI, PINFORGE. Keep them in Latin script. Do not add quotes or commentary. ` +
    `Return ONLY a JSON object {"translations":[{"id":<int>,"text":"<translated>"}...]} ` +
    `covering every id you receive, in the same order.`;
  const user = JSON.stringify({ target: meta.name, strings: numbered });

  const completion = await client.chat.completions.create({
    model: 'gpt-5.1',
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    max_completion_tokens: 8000,
  });

  const raw = completion.choices[0].message.content;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    // Truncated JSON (output cap hit). If we have >1 string, split and recurse.
    if (texts.length > 1) {
      const mid = Math.ceil(texts.length / 2);
      const a = await translateBatch(client, texts.slice(0, mid), tag);
      const b = await translateBatch(client, texts.slice(mid), tag);
      return a.concat(b);
    }
    throw new Error(`LLM returned non-JSON for ${tag}: ${raw.slice(0, 200)}`);
  }
  const arr = parsed.translations || parsed.result || [];
  const map = new Map();
  for (const item of arr) {
    if (item && typeof item.id === 'number') map.set(item.id, item.text);
  }
  return texts.map((_, i) => map.get(i));
}

// ── Per-file processing ─────────────────────────────────────────────────
async function processFile(client, filePath) {
  const rel = path.relative(process.cwd(), filePath);
  if (!fs.existsSync(filePath)) {
    console.log(`  skip (missing): ${rel}`);
    return { file: rel, total: 0, fixed: 0 };
  }
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  // Collect placeholder hits
  const hits = []; // { lineIdx, indent, key, quote, tag, english, trailing }
  lines.forEach((line, idx) => {
    const m = line.match(PLACEHOLDER_RE);
    if (m) {
      const [, indent, key, quote, tag, payload, trailing] = m;
      hits.push({
        lineIdx: idx,
        indent,
        key,
        quote,
        tag,
        english: unescapeJs(payload, quote),
        trailing,
      });
    }
  });

  if (hits.length === 0) {
    console.log(`  clean: ${rel} (0 placeholders)`);
    return { file: rel, total: 0, fixed: 0 };
  }

  // Group unique english strings per tag for batched translation
  const byTag = {};
  for (const h of hits) {
    byTag[h.tag] = byTag[h.tag] || new Map();
    if (!byTag[h.tag].has(h.english)) byTag[h.tag].set(h.english, null);
  }

  console.log(
    `  ${rel}: ${hits.length} placeholders ` +
      Object.entries(byTag)
        .map(([t, m]) => `${t}=${m.size}uniq`)
        .join(' ')
  );

  if (DRY) return { file: rel, total: hits.length, fixed: 0 };

  // Translate each tag's unique strings (chunked to keep payloads sane)
  for (const tag of Object.keys(byTag)) {
    const uniqueTexts = [...byTag[tag].keys()];
    const CHUNK = 12; // small chunks keep each JSON response well under token cap
    for (let i = 0; i < uniqueTexts.length; i += CHUNK) {
      const slice = uniqueTexts.slice(i, i + CHUNK);
      const out = await translateBatch(client, slice, tag);
      slice.forEach((src, j) => {
        const t = out[j];
        if (t && typeof t === 'string' && t.trim()) {
          byTag[tag].set(src, t);
        }
      });
      process.stdout.write(
        `    ${tag} ${Math.min(i + CHUNK, uniqueTexts.length)}/${uniqueTexts.length}\r`
      );
    }
    process.stdout.write('\n');
  }

  // Rewrite lines
  let fixed = 0;
  for (const h of hits) {
    const translated = byTag[h.tag].get(h.english);
    if (!translated) continue; // leave placeholder if translation failed
    const escaped = escapeJs(translated, h.quote);
    lines[h.lineIdx] =
      `${h.indent}${h.key}: ${h.quote}${escaped}${h.quote}${h.trailing}`;
    fixed++;
  }

  fs.writeFileSync(filePath, lines.join('\n'));
  console.log(`    → translated ${fixed}/${hits.length} in ${rel}`);
  return { file: rel, total: hits.length, fixed };
}

(async () => {
  console.log(`\n🌐 i18n Placeholder Translator${DRY ? ' (DRY RUN)' : ''}\n`);
  const client = DRY ? null : makeClient();
  const results = [];
  for (const f of FILES) {
    results.push(await processFile(client, f));
  }
  const totalPh = results.reduce((s, r) => s + r.total, 0);
  const totalFixed = results.reduce((s, r) => s + r.fixed, 0);
  console.log(
    `\nDone. ${totalFixed}/${totalPh} placeholders translated across ${results.length} files.\n`
  );
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
