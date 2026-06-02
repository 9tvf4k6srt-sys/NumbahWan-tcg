#!/usr/bin/env node
/**
 * tools/ai-stylometry.cjs — multi-signal stylometry for AI-tell detection
 * =======================================================================
 * The ADVISORY layer of the anti-AI-tell pipeline. It never blocks a commit.
 *
 * Why advisory only (research, 2025):
 *   Perplexity and burstiness are unreliable as a GATE. They false-positive on
 *   strong human writing (low-perplexity classics) and systematically bias
 *   against non-native / ESL writing — which would punish our 繁中 / 日本語 / ไทย
 *   copy. Many models (Gemini, Claude) don't expose token probabilities anyway.
 *   So we compute a *spread* of structural signals and report them as a
 *   confidence score with reasons, not a pass/fail gate. The hard block stays
 *   on deterministic corpus patterns (ai-tell-lint) + the LLM judge.
 *
 * What it measures (multi-signal beats single-metric — F1 0.94 vs perplexity
 * alone in the stylometry literature):
 *   1. Sentence-length uniformity   — AI tends toward even sentence lengths.
 *   2. Paragraph-shape sameness     — AI paragraphs cluster to one length.
 *   3. N-gram / phrase repetition   — AI re-uses scaffolding phrases.
 *   4. Connective density           — "moreover / furthermore / additionally".
 *   5. Hedge density                — "it's worth noting / generally / often".
 *   6. List-parallelism rigidity    — every bullet the same grammatical shape.
 *   7. Opening-word repetition       — sentences/bullets starting the same way.
 *
 * Each signal returns 0..1 (1 = strong AI-tell). The composite is a weighted
 * mean, reported as a 0..100 "machine-rhythm" score. Higher = more AI-like.
 *
 * Usage:
 *   node tools/ai-stylometry.cjs <file> [<file2> ...]
 *   node tools/ai-stylometry.cjs <file> --json
 *   node tools/ai-stylometry.cjs --text "raw text to score"
 *
 * Exit code is ALWAYS 0 (advisory). The orchestrator decides what to do with
 * the score. Language is auto-detected per block (en / cjk) so we don't apply
 * English-only signals to Chinese / Japanese text.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { stripMarkupAndCode, isCJK } = require('./lib/aitell-common.cjs');

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const TEXT_FLAG = args.find(a => a.startsWith('--text'));
const files = args.filter(a => !a.startsWith('--'));

// ── English scaffolding vocab (these are signals, not bans) ───────────────
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

// ── helpers ───────────────────────────────────────────────────────────────
// stripMarkupAndCode + isCJK now live in ./lib/aitell-common.cjs (shared with
// ai-naturalness + ai-layout-lint) so the prose-extraction rules stay in sync.

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
  return raw.split('\n')
    .map(l => l.trim())
    .filter(l => /^([-*+]|\d+[.)])\s+/.test(l))
    .map(l => l.replace(/^([-*+]|\d+[.)])\s+/, ''));
}

// coefficient of variation → uniformity signal.
// Low CV (even lengths) is the AI tell, so signal = 1 - clamp(CV/target).
function uniformitySignal(lengths, targetCV) {
  if (lengths.length < 4) return null; // not enough to judge
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

// repeated 3-grams across the document (scaffolding reuse)
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

// do many sentences/bullets start with the same word?
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

// ── score a single text blob ───────────────────────────────────────────────
function scoreText(raw) {
  const clean = stripMarkupAndCode(raw);
  const cjk = isCJK(clean);
  const signals = [];
  const reasons = [];

  // 1. sentence-length uniformity
  if (!cjk) {
    const sents = sentencesEN(clean);
    const lens = sents.map(s => s.split(/\s+/).length);
    const u = uniformitySignal(lens, 0.6); // human prose CV ~0.6+
    if (u !== null) {
      signals.push({ name: 'sentence-uniformity', value: u, weight: 1.4 });
      if (u > 0.6) reasons.push(`Sentences are unusually even in length (machine rhythm).`);
    }
  } else {
    // CJK: measure by character count per sentence (split on 。！？)
    const sents = clean.split(/[。！？]/).map(s => s.trim()).filter(s => s.length > 6);
    const lens = sents.map(s => s.length);
    const u = uniformitySignal(lens, 0.5);
    if (u !== null) {
      signals.push({ name: 'sentence-uniformity', value: u, weight: 1.4 });
      if (u > 0.65) reasons.push(`句子長度過於均勻，讀起來像機器節奏。`);
    }
  }

  // 2. paragraph-shape sameness
  const paras = paragraphs(clean);
  const pl = paras.map(p => p.length);
  const pu = uniformitySignal(pl, 0.5);
  if (pu !== null) {
    signals.push({ name: 'paragraph-sameness', value: pu, weight: 1.0 });
    if (pu > 0.65) reasons.push(`Paragraphs cluster to one length; vary the shape.`);
  }

  // 3. n-gram repetition
  const ng = ngramRepetition(clean);
  if (ng) {
    signals.push({ name: 'phrase-repetition', value: ng.signal, weight: 1.2 });
    if (ng.signal > 0.4 && ng.top.length) reasons.push(`Repeated scaffolding phrases: ${ng.top.join(', ')}.`);
  }

  // 4 & 5. connective + hedge density (EN only — these are English tells)
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

  // 6 & 7. list parallelism + opening repetition
  const bs = bullets(raw);
  if (bs.length >= 5) {
    const blens = bs.map(b => b.split(/\s+/).length);
    const bu = uniformitySignal(blens, 0.5);
    if (bu !== null) {
      signals.push({ name: 'list-rigidity', value: bu, weight: 0.8 });
      if (bu > 0.7) reasons.push(`Every bullet is the same shape/length; let the list breathe.`);
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

// ── band label ──────────────────────────────────────────────────────────────
function band(score) {
  if (score === null) return { label: 'n/a', tag: '·' };
  if (score >= 60) return { label: 'strong machine rhythm', tag: '⚠' };
  if (score >= 40) return { label: 'some machine rhythm', tag: '⚠' };
  if (score >= 22) return { label: 'mostly natural', tag: '·' };
  return { label: 'natural', tag: '✓' };
}

// ── main ──────────────────────────────────────────────────────────────────
function scoreFile(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return { file, ...scoreText(raw) };
}

const results = [];
if (TEXT_FLAG) {
  const idx = args.indexOf(TEXT_FLAG);
  const text = args[idx + 1] || TEXT_FLAG.split('=')[1] || '';
  results.push({ file: '<text>', ...scoreText(text) });
} else {
  for (const f of files) {
    const abs = path.resolve(f);
    if (!fs.existsSync(abs)) { console.error(`  [stylometry] missing: ${f}`); continue; }
    try { results.push(scoreFile(abs)); }
    catch (e) { console.error(`  [stylometry] error on ${f}: ${e.message}`); }
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ results }, null, 2));
} else {
  console.log('');
  console.log('  STYLOMETRY (advisory — never blocks; statistical signals only)');
  console.log('  ═══════════════════════════════════════════════════════════');
  if (results.length === 0) console.log('  no files scored');
  for (const r of results) {
    const b = band(r.score);
    const scoreStr = r.score === null ? ' n/a' : String(r.score).padStart(3);
    console.log(`  ${b.tag} ${scoreStr}/100  ${b.label}   ${r.file}  [${r.lang}]`);
    for (const reason of r.reasons) console.log(`         · ${reason}`);
  }
  console.log('');
  console.log('  Higher = more machine-like rhythm. This is guidance, not a gate.');
  console.log('  The hard block lives in ai-tell-lint (deterministic patterns).');
  console.log('');
}

// Advisory tool: always exit 0.
process.exit(0);
