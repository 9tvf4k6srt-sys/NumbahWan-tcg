// Colour-emoji detection — the single rarest piece of the suite.
// The job is to tell a COLOUR emoji (the "an AI assembled this" tell) apart
// from a monochrome typographic dingbat (legitimate). A glyph is a colour
// emoji if either:
//   (a) it sits in the high / astral plane U+1F000–U+1FAFF, or
//   (b) it is a BMP symbol in a known pictographic range AND carries the
//       emoji variation selector VS16 (U+FE0F), which forces colour rendering.
// A bare dingbat in those BMP ranges with no VS16 is left alone.
const EMOJI_HIGH = '\\u{1F000}-\\u{1FAFF}';
const EMOJI_BMP = '\\u2600-\\u27BF\\u2190-\\u21FF\\u2B00-\\u2BFF\\u2300-\\u23FF';
const COLOUR_EMOJI_SOURCE = `[${EMOJI_HIGH}]|[${EMOJI_BMP}]\\uFE0F`;

function colourEmojiRegex(global) {
  return new RegExp(COLOUR_EMOJI_SOURCE, global ? 'gu' : 'u');
}

function hasColourEmoji(s) {
  return colourEmojiRegex(false).test(String(s || ''));
}

function colourEmojis(s) {
  return String(s || '').match(colourEmojiRegex(true)) || [];
}

// Score PROSE only. Strip, in order: <style>/<script>/<svg> blocks and their
// CONTENTS (inline CSS/JS reads as machine rhythm and poisons the signal),
// HTML comments, fenced + inline code, remaining tags, entity refs, markdown
// link syntax, table rows, leftover CSS-ish braces, markdown punctuation.
function stripMarkupAndCode(text) {
  return String(text || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/[#>*_~]/g, ' ');
}

// >20% CJK chars → treat as a CJK block, so English-only stylometry signals
// are not misapplied to 繁中 / 日本語.
function isCJK(s) {
  if (!s) return false;
  const str = String(s);
  const cjk = (str.match(/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
  return cjk > str.length * 0.2;
}

function stripHtmlComments(text) {
  return String(text || '').replace(/<!--[\s\S]*?-->/g, ' ');
}

function stripBlockComments(text) {
  return String(text || '').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

function lineNumberOf(text, charIndex) {
  let line = 1;
  for (let i = 0; i < charIndex; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function snippetAround(text, start, len) {
  const a = Math.max(0, start - 24);
  const b = Math.min(text.length, start + len + 24);
  return text.slice(a, b).replace(/\s+/g, ' ').trim().slice(0, 140);
}

// Flatten a corpus { rules: [{ id, lang, severity, note, patterns: [...] }] }
// into a single iterable list of { id, lang, severity, note, pattern }.
function flattenCorpus(corpus) {
  const flat = [];
  for (const rule of (corpus && corpus.rules) || []) {
    for (const p of rule.patterns || []) {
      flat.push({
        id: rule.id,
        lang: rule.lang,
        severity: rule.severity,
        note: rule.note,
        pattern: p,
      });
    }
  }
  return flat;
}

/**
 * lintText — the deterministic regex blocklist stage.
 *
 * @param {string} text            raw HTML / Markdown / prose
 * @param {object} corpus          { rules: [...] } (see flattenCorpus)
 * @param {object} [opts]
 * @param {boolean} [opts.stripComments=true]  strip HTML + block comments first
 * @returns {{violations: Array, blocked: number, warned: number}}
 */
function lintText(text, corpus, opts = {}) {
  const stripComments = opts.stripComments !== false;
  const rules = flattenCorpus(corpus);

  let scanned = String(text || '');
  if (stripComments) {
    scanned = stripBlockComments(stripHtmlComments(scanned));
  }

  const violations = [];
  for (const rule of rules) {
    let re;
    try {
      re = new RegExp(rule.pattern, 'gi');
    } catch {
      continue; // bad regex in corpus — skip silently
    }
    let m;
    while ((m = re.exec(scanned)) !== null) {
      violations.push({
        line: lineNumberOf(scanned, m.index),
        ruleId: rule.id,
        severity: rule.severity,
        lang: rule.lang,
        match: m[0],
        note: rule.note,
        snippet: snippetAround(scanned, m.index, m[0].length),
      });
      if (re.lastIndex === m.index) re.lastIndex++;
    }
  }

  return {
    violations,
    blocked: violations.filter(v => v.severity === 'high').length,
    warned: violations.filter(v => v.severity === 'medium').length,
  };
}

module.exports = {
  COLOUR_EMOJI_SOURCE,
  colourEmojiRegex,
  hasColourEmoji,
  colourEmojis,
  stripMarkupAndCode,
  isCJK,
  stripHtmlComments,
  stripBlockComments,
  flattenCorpus,
  lintText,
};
