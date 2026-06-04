#!/usr/bin/env node
/**
 * tools/voice-prep.cjs — the PRE-WRITING prompt builder
 * ═════════════════════════════════════════════════════════════════════
 * Every other anti-AI-tell tool in this repo runs AFTER content exists and
 * tells you what's wrong. This one runs BEFORE. You hand it a brief; it
 * emits a voice-locked generation prompt that bakes in the FORGE-DOCTRINE
 * moves so the draft starts with a voice instead of needing one rescued in.
 *
 * It does not call an LLM. It assembles a prompt from the corpus + doctrine
 * so it is free, offline, and deterministic. Paste the output into whatever
 * is doing the actual generation (or into your own head).
 *
 * USAGE:
 *   node tools/voice-prep.cjs words  "<brief>"  [--world=paradox|kintsugi|nw]
 *   node tools/voice-prep.cjs visual "<brief>"  [--world=...]
 *   node tools/voice-prep.cjs audio  "<brief>"  [--world=...]
 *   node tools/voice-prep.cjs --json words "<brief>"
 *
 * Wired as `node bin/ai.cjs voice <medium> "<brief>"`.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const worldArg = (args.find(a => a.startsWith('--world=')) || '').split('=')[1] || '';
const positional = args.filter(a => !a.startsWith('--'));
const medium = (positional[0] || '').toLowerCase();
const brief = positional.slice(1).join(' ').trim();

const NAT = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/naturalness-corpus.json'), 'utf8')); }
  catch { return null; }
})();
const SHEEN = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/sheen-corpus.json'), 'utf8')); }
  catch { return null; }
})();

const WORLDS = {
  paradox: { voice: 'warm, a little rowdy, gamer-guild banter; proud but never solemn', light: 'warm fireside / golden-hour forest glow', tone: 'rough-edged camaraderie' },
  kintsugi: { voice: 'quiet, precise, unhurried; says less and means it', light: 'soft window light, muted gold on dark', tone: 'restraint' },
  nw: { voice: 'sharp, confident, plain-spoken; concrete numbers over adjectives', light: 'clean daylight', tone: 'directness' },
  '': { voice: 'one specific person who has done this thing and has an opinion about it', light: 'a single named source', tone: 'a point of view' },
};
const world = WORLDS[worldArg] || WORLDS[''];

function bannedWordsLine() {
  if (!NAT) return 'see tools/ai-tell-corpus.json';
  const bl = NAT.blacklist_2026 || {};
  const all = [];
  for (const grp of Object.values(bl)) {
    if (grp && typeof grp === 'object') all.push(...Object.keys(grp).filter(k => !k.startsWith('_')));
  }
  return all.slice(0, 28).join(', ');
}

function buildWords() {
  const pt = (NAT && NAT.positive_targets) || {};
  return [
    `BRIEF: ${brief || '(none given)'}`,
    '',
    `VOICE: ${world.voice}.`,
    `RHYTHM: deliberately uneven. ${pt.burstiness || 'Long sentence, then a short punch. Vary it.'}`,
    `SPECIFIC: ${pt.specificity_with_grit || 'At least one concrete insider detail; real numbers, real item names.'}`,
    `STANCE: ${pt.stance || 'Pick a side. State it directly. No both-sides hedge.'}`,
    `OPEN: ${pt.first_10_percent_cut || 'Start in the conflict. Cut the throat-clearing first sentence.'}`,
    `END: ${pt.human_ending || 'A final thought or a call to act. Never a summary.'}`,
    `PUB TEST: ${pt.pub_test || "If you wouldn't say it to a friend over a beer, rewrite it."}`,
    '',
    `FORBIDDEN WORDS/PHRASES (2026): ${bannedWordsLine()}`,
    'Also forbidden: em-dash between lowercase words, "not X but Y" reframes, stacked rule-of-three, "in conclusion".',
    '',
    'CHECK AFTER: node bin/ai.cjs naturalness <file>  then  node bin/ai.cjs aitell <file>',
  ].join('\n');
}

function buildVisual() {
  const cam = (SHEEN && SHEEN.good_camera_language) || ['shot on Leica Q3 35mm', 'Portra 400 grain'];
  const flaws = (SHEEN && SHEEN.good_photographic_language) || ['natural grain', 'slight chromatic aberration', 'asymmetry', 'dust'];
  return [
    `BRIEF: ${brief || '(none given)'}`,
    '',
    'STRUCTURE (direct the physics, not just the subject):',
    '  [subject + action + environment]',
    `  + LIGHT: ${world.light} — name source + direction + color temp + shadow direction`,
    `  + CAMERA: ${cam.slice(0, 3).join(' / ')}`,
    `  + IMPERFECTION (explicit, the model needs permission): ${flaws.slice(0, 5).join(', ')}`,
    `  + ONE mood word (${world.tone}), not a stack of adjectives`,
    '',
    'NEVER: 8k, 4k, cinematic, ultra/hyper/highly-detailed, dramatic/perfect lighting,',
    '  masterpiece, octane, unreal engine, pristine, symmetrical hero composition, halo backlight.',
    '',
    'CHECK BEFORE: node bin/ai.cjs sheen "<this prompt>"',
    'CHECK AFTER: understand_images on the output — did the flaws actually land?',
  ].join('\n');
}

function buildAudio() {
  return [
    `BRIEF: ${brief || '(none given)'}`,
    '',
    `VOICE: ${world.voice}. Matched to the world, never a generic announcer.`,
    'SCRIPT (80% of the result): spoken, not written. Contractions, fragments, one aside.',
    'PROSODY: vary pause length on purpose. Hold a beat before the key word.',
    `EMOTION: one specific feeling (${world.tone}), using the model's expression tags`,
    '  (Gemini: [whispers] [excited] [laughs] [sighs]; ElevenLabs v3 expression tags).',
    'DISFLUENCY: at most one, placed on purpose (a breath, a half-laugh).',
    'PACE: uneven — speed up the throwaway line, slow down the line that matters.',
    '',
    'CHECK AFTER: analyze_media_content — "person talking or sign being read? where is prosody flat?"',
  ].join('\n');
}

const BUILDERS = { words: buildWords, visual: buildVisual, audio: buildAudio };

if (!medium || !BUILDERS[medium]) {
  console.error('usage: node tools/voice-prep.cjs <words|visual|audio> "<brief>" [--world=paradox|kintsugi|nw]');
  process.exit(2);
}

const out = BUILDERS[medium]();
if (JSON_OUT) {
  console.log(JSON.stringify({ medium, world: worldArg || 'generic', brief, prompt: out }, null, 2));
} else {
  console.log('');
  console.log('  VOICE-LOCKED ' + medium.toUpperCase() + ' PROMPT  (FORGE-DOCTRINE.md)');
  console.log('  ═══════════════════════════════════════════════════════════');
  console.log(out.split('\n').map(l => '  ' + l).join('\n'));
  console.log('');
  console.log('  Paste this into your generation step. Be specific, uneven, imperfect.');
  console.log('');
}
process.exit(0);
