// Stylometry — score how much a passage reads like machine prose, with no LLM
// call and no word being "banned". It measures rhythm and shape: even sentence
// lengths, paragraph sameness, repeated 3-grams, connective + hedge density,
// list rigidity, and repeated openings. The output is a 0–100 machine-rhythm
// score (higher = more machine-like) plus the reasons behind it.
//
// The signal lives in the STRUCTURE, so the same scorer works on prose whose
// individual phrases all look innocent.

const { stripMarkupAndCode, isCJK } = require('./text-detect');

// English scaffolding vocabulary. These are signals, not bans.
const CONNECTIVES = [
  'moreover', 'furthermore', 'additionally', 'consequently', 'therefore',
  'thus', 'hence', 'nevertheless', 'nonetheless', 'subsequently',
  'in addition', 'as a result', 'in conclusion', 'overall', 'ultimately',
];
const HEDGES = [
  "it's worth noting", 'it is worth noting', 'it is important to note',
  "it's important to", 'generally', 'typically', 'often', 'in many cases',
  'arguably', 'to some extent', 'broadly speaking', 'in general',
  'plays a crucial role', 'plays a key role', 'a wide range of',
  'when it comes to', 'in the realm of', 'in the world of',
];

function sentencesEN(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.split(/\s+/).length >= 3);
}

function paragraphs(text) {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 40);
}

function bullets(raw) {
  return String(raw || '').split('\n')
    .map(l => l.trim())
    .filter(l => /^([-*+]|\d+[.)])\s+/.test(l))
    .map(l => l.replace(/^([-*+]|\d+[.)])\s+/, ''));
}

// Coefficient of variation → uniformity signal. Low CV (even lengths) is the
// AI tell, so signal = 1 - clamp(CV / target).
function uniformitySignal(lengths, targetCV) {
  if (lengths.length < 4) return null;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (mean === 0) return null;
  const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
  const cv = Math.sqrt(variance) / mean;
  const sig = 1 - Math.min(cv / targetCV, 1);
  return Math.max(0, Math.min(1, sig));
}

function densitySignal(text, phrases, per100Words) {
  const words = (text.toLowerCase().match(/\b[\w']+\b/g) || []).length;
  if (words < 40) return null;
  const lower = text.toLowerCase();
  let hits = 0;
  for (const p of phrases) {
    const re = new RegExp('\\b' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
    hits += (lower.match(re) || []).length;
  }
  const rate = (hits / words) * 100;
  return { rate, hits, signal: Math.min(rate / per100Words, 1) };
}

function ngramRepetition(text) {
  const words = (text.toLowerCase().match(/\b[\w']+\b/g) || []);
  if (words.length < 60) return null;
  const grams = {};
  for (let i = 0; i < words.length - 2; i++) {
    const g = words[i] + ' ' + words[i + 1] + ' ' + words[i + 2];
    grams[g] = (grams[g] || 0) + 1;
  }
  const repeated = Object.entries(grams).filter(([, c]) => c >= 3);
  const repeatedTokens = repeated.reduce((a, [, c]) => a + c, 0);
  const signal = Math.min((repeatedTokens / (words.length / 3)) * 4, 1);
  const top = repeated.sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g, c]) => `"${g}" ×${c}`);
  return { signal, top };
}

function openingRepetition(units) {
  if (units.length < 5) return null;
  const firsts = units.map(u => (u.toLowerCase().match(/\b[\w']+\b/) || [''])[0]).filter(Boolean);
  const counts = {};
  for (const f of firsts) counts[f] = (counts[f] || 0) + 1;
  const maxRep = Math.max(...Object.values(counts));
  const signal = Math.min((maxRep - 1) / (firsts.length * 0.5), 1);
  const worst = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { signal: Math.max(0, signal), word: worst[0], count: worst[1] };
}

/**
 * analyzeStylometry — score one passage of prose / markup.
 *
 * @param {string} raw  HTML, Markdown, or plain prose
 * @returns {{score: number|null, signals: Array, reasons: string[], lang: 'en'|'cjk'}}
 *          score is 0–100 machine-rhythm (higher = more machine-like), or null
 *          when there is not enough prose to judge.
 */
function analyzeStylometry(raw) {
  const clean = stripMarkupAndCode(raw);
  const cjk = isCJK(clean);
  const signals = [];
  const reasons = [];

  if (!cjk) {
    const sents = sentencesEN(clean);
    const lens = sents.map(s => s.split(/\s+/).length);
    const u = uniformitySignal(lens, 0.6);
    if (u !== null) {
      signals.push({ name: 'sentence-uniformity', value: u, weight: 1.4 });
      if (u > 0.6) reasons.push('Sentences are unusually even in length (machine rhythm).');
    }
  } else {
    const sents = clean.split(/[。！？]/).map(s => s.trim()).filter(s => s.length > 6);
    const lens = sents.map(s => s.length);
    const u = uniformitySignal(lens, 0.5);
    if (u !== null) {
      signals.push({ name: 'sentence-uniformity', value: u, weight: 1.4 });
      if (u > 0.65) reasons.push('句子長度過於均勻，讀起來像機器節奏。');
    }
  }

  const paras = paragraphs(clean);
  const pl = paras.map(p => p.length);
  const pu = uniformitySignal(pl, 0.5);
  if (pu !== null) {
    signals.push({ name: 'paragraph-sameness', value: pu, weight: 1.0 });
    if (pu > 0.65) reasons.push('Paragraphs cluster to one length; vary the shape.');
  }

  const ng = ngramRepetition(clean);
  if (ng) {
    signals.push({ name: 'phrase-repetition', value: ng.signal, weight: 1.2 });
    if (ng.signal > 0.4 && ng.top.length) reasons.push(`Repeated scaffolding phrases: ${ng.top.join(', ')}.`);
  }

  if (!cjk) {
    const conn = densitySignal(clean, CONNECTIVES, 1.2);
    if (conn) {
      signals.push({ name: 'connective-density', value: conn.signal, weight: 1.0 });
      if (conn.signal > 0.5) reasons.push(`Heavy on connectives (moreover/furthermore/therefore): ${conn.hits} hits.`);
    }
    const hedge = densitySignal(clean, HEDGES, 0.8);
    if (hedge) {
      signals.push({ name: 'hedge-density', value: hedge.signal, weight: 1.1 });
      if (hedge.signal > 0.5) reasons.push(`Hedging filler ("it's worth noting", "generally"): ${hedge.hits} hits.`);
    }
  }

  const bs = bullets(raw);
  if (bs.length >= 5) {
    const blens = bs.map(b => b.split(/\s+/).length);
    const bu = uniformitySignal(blens, 0.5);
    if (bu !== null) {
      signals.push({ name: 'list-rigidity', value: bu, weight: 0.8 });
      if (bu > 0.7) reasons.push('Every bullet is the same shape/length; let the list breathe.');
    }
    const orep = openingRepetition(bs);
    if (orep && orep.signal > 0.4) {
      signals.push({ name: 'opening-repetition', value: orep.signal, weight: 0.8 });
      reasons.push(`Bullets keep starting with "${orep.word}" (×${orep.count}).`);
    }
  }

  if (signals.length === 0) {
    return { score: null, signals: [], reasons: ['Not enough prose to score.'], lang: cjk ? 'cjk' : 'en' };
  }

  const wsum = signals.reduce((a, s) => a + s.weight, 0);
  const composite = signals.reduce((a, s) => a + s.value * s.weight, 0) / wsum;
  const score = Math.round(composite * 100);

  return { score, signals, reasons, lang: cjk ? 'cjk' : 'en' };
}

// Label a machine-rhythm score.
function band(score) {
  if (score === null) return { label: 'n/a', tag: '·' };
  if (score >= 60) return { label: 'strong machine rhythm', tag: '⚠' };
  if (score >= 40) return { label: 'some machine rhythm', tag: '⚠' };
  if (score >= 22) return { label: 'mostly natural', tag: '·' };
  return { label: 'natural', tag: '✓' };
}

module.exports = {
  CONNECTIVES,
  HEDGES,
  analyzeStylometry,
  band,
  // exposed for testing / advanced use
  uniformitySignal,
  ngramRepetition,
  openingRepetition,
};
