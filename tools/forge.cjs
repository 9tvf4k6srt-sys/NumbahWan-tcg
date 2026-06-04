#!/usr/bin/env node
/**
 * tools/forge.cjs — spin up a PINFORGE-grade visual kit for ANY industry, fast.
 * ════════════════════════════════════════════════════════════════════════════
 * The problem this solves (founder, 2026-06):
 *   PINFORGE proves it's possible — people see those images and think a real
 *   photographer shot them, a real person wrote the words. But PINFORGE took
 *   weeks: a hand-built lock (palette / camera / architecture / anchor library)
 *   for ONE world. When you spin up a demo landing page for a random company in
 *   any industry, almost all the time goes into ITERATING to kill AI sheen.
 *
 *   This tool collapses that loop. It front-loads everything PINFORGE learned so
 *   each new world starts at PINFORGE's FINISH line:
 *
 *     forge prompt "<scene>"            one sheen-proof prompt, right first time
 *     forge kit "<company> <industry>"  a whole mini visual-lock: palette +
 *                                       camera + 4-6 ready scene prompts + voice
 *     forge check <image-url> [--prompt] judge the sheen FOR you (calls the
 *                                       vision rubric) + the specific fix to feed
 *                                       back, so pass 2 is targeted not guessed
 *
 * Why it works: the AI look is a PROMPT problem (light from nowhere, perfection,
 * no camera physics). forge bakes the physics in before you spend a generation,
 * and judges the output against a fixed rubric so you skip the slow eyeball step.
 *
 * `prompt` and `kit` are pure/offline/free (assemble from sheen-corpus). `check`
 * emits a rubric for the project's understand_images tool and scores the reply.
 *
 * Wired as `node bin/ai.cjs forge <prompt|kit|check> ...`.
 * Companion doctrine: FORGE-DOCTRINE.md. Detection corpus: tools/sheen-corpus.json.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MYC = path.join(ROOT, '.mycelium');
const KIT_LOG = path.join(MYC, 'forge-kits.json');

const SHEEN = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/sheen-corpus.json'), 'utf8')); }
  catch { return null; }
})();

// ── Camera + flaw vocab, sourced from the corpus (single source of truth) ──
// The sheen-corpus camera/flaw vocab is partly Taiwan/PINFORGE-specific (Iwan
// Baan, 民國/ROC calendar, Taipei haze). forge must stay industry- AND
// place-agnostic, so we filter out any locale-bound phrase. Add to LOCALE_BOUND
// if a new place-specific cue ever leaks into a forged prompt.
const LOCALE_BOUND = /民國|roc|taipei|taiwan|iwan baan|griffith|binet|繁體|台/i;
function placeAgnostic(arr, fallback) {
  const clean = (arr || []).filter(s => !LOCALE_BOUND.test(s));
  return clean.length ? clean : fallback;
}
const CAMERAS = placeAgnostic((SHEEN && SHEEN.good_camera_language), [
  'shot on Leica Q3 35mm Summilux f/1.7',
  'shot on Canon 5D Mark IV with 24-70 f/2.8L II',
  'Fujifilm GFX 100S 63mm f/2.8',
  'Kodak Portra 400 medium format',
]);

// IMPORTANT (founder, 2026-06): natural != messy. For production-level work,
// real spaces are TIDIED, well-decorated, clean — people clean up before a
// shoot. The AI tell is PHYSICS FAILURE (light from nowhere, plastic surfaces,
// impossible symmetry, AI smoothness), NOT cleanliness. So the DEFAULT is a
// clean, intentionally styled space with believable physics; we add at most ONE
// subtle lived-in touch, never a stack of scuffs.

// PHOTOGRAPH authenticity — about the camera/film, not the room. Always on; a
// clean room shot on real gear still has grain, roll-off, real depth of field.
const PHOTO_TRUTH = [
  'fine natural grain', 'slight chromatic aberration on highlight edges',
  'natural highlight roll-off', 'real lens depth of field, gentle background fall-off',
  'subtle vignetting', 'true-to-life color from the light source',
];

// STYLING — the new default. A space a stylist arranged: tidy, considered,
// well-decorated, deliberately composed. This is what reads "production-level".
const STYLING = [
  'tidy and well-styled, every object placed with intent',
  'clean surfaces, considered decor, nothing cluttered',
  'styled like a magazine interior shoot: neat, warm, lived-in but spotless',
  'carefully arranged props, balanced and uncluttered',
  'a clean, well-decorated space that looks cared-for',
];

// LIVED-IN — used SPARINGLY (one subtle touch, optional). Honest small signs of
// real use, NOT grime. Keeps a clean room from looking like a sterile render.
const LIVED_IN = [
  'one book left slightly open on the side table', 'a single coffee cup in use',
  'a chair turned a few degrees as if just used', 'a soft throw not perfectly squared',
  'one plant leaf reaching out of line', 'a hand-written note on the counter',
];

// The full ban list, pulled from every sheen-corpus group (so a forged prompt
// never contains a term our own pre-prompt lint would flag).
function bannedTerms() {
  if (!SHEEN) return ['8k', 'cinematic', 'ultra detailed', 'masterpiece', 'octane', 'unreal engine'];
  const groups = ['cgi_tells', 'ai_signature_tells', 'luxury_tells'];
  const out = [];
  for (const g of groups) for (const e of (SHEEN[g] || [])) if (e.term) out.push(e.term);
  return out;
}

// ── Light-recipe presets — a named source beats "soft lighting" every time. ─
const LIGHT_PRESETS = [
  'late afternoon sun through a west-facing window, ~4500K, long shadows falling to the right',
  'overcast north light from a tall window, ~6000K, soft even shadows, no hot spots',
  'mixed office light: cool overhead fluorescent + one warm 2700K desk lamp, uneven exposure',
  'early-morning side light raking across the surface, ~5200K, one bright edge one soft edge',
  'single practical lamp off-frame left, ~3000K, the rest of the room falling into honest shadow',
];

// ── Industry presets — a tiny knowledge base of grounded, real-place cues.
//    Each maps an industry keyword to: a palette, real-world props/details that
//    only an insider would put in frame, and a couple of scene types. This is
//    the PINFORGE "locality + materials" idea, generalized. Add rows freely. ──
const INDUSTRIES = {
  cafe:        { palette: ['#2B2018 espresso', '#D9C7A3 oat', '#E8E2D4 paper', '#7A8B6F sage'], props: ['steam wand water-spotted', 'a half-wiped chalkboard', 'a chipped mug', 'spent coffee grounds in the knock box', 'a receipt spike'], scenes: ['barista mid-pour at the bar', 'a corner table by the window with a worn book', 'the pastry case, one croissant missing'] },
  dental:      { palette: ['#F4F6F7 clinic white', '#9FB6C0 scrub blue', '#2E3A40 ink', '#C8D4D8 instrument steel'], props: ['a slightly crooked appointment card', 'a paper bib clip', 'sterile pouches in a drawer', 'a model of teeth on the counter', 'fingerprints on the monitor'], scenes: ['reception desk with a real keyboard and a coffee', 'a treatment room from the doorway, chair empty', 'a hygienist washing hands at the sink'] },
  saas:        { palette: ['#1B1E27 ink', '#E7E9EE fog', '#3B5BDB signal blue', '#C0C6D0 steel'], props: ['a laptop with normal browser tabs and a real spreadsheet', 'a half-full water bottle', 'a sticky note on a monitor edge', 'a tangled charging cable', 'a whiteboard with smudged old marker'], scenes: ['two people at a desk looking at one screen', 'an empty standing desk mid-afternoon', 'a wall of sticky notes shot slightly off-center'] },
  restaurant:  { palette: ['#2A1D16 roast', '#E4D5BC linen', '#8C3B2E tomato', '#6B7A4F herb'], props: ['a tea towel over a shoulder', 'a scuffed pass counter', 'a ticket rail with one order up', 'water rings on the steel', 'a knife with an honest patina'], scenes: ['the pass during a quiet moment before service', 'a two-top set but not yet seated', 'the line cook plating, motion blur on the hand'] },
  retail:      { palette: ['#23211E ink', '#EDE7DC paper', '#A8743A tan', '#5C6B70 slate'], props: ['a price gun left on a shelf', 'a folded stack slightly uneven', 'a worn fitting-room curtain', 'a receipt roll', 'a fingerprint on the glass counter'], scenes: ['a shop interior from the door, no customers', 'a folded display table shot at an angle', 'the counter with a real card reader'] },
  fitness:     { palette: ['#1A1C1E ink', '#D7DBDF chalk', '#C2452D effort red', '#3E4A4F steel'], props: ['chalk dust on the floor', 'a water bottle ring on the bench', 'a slightly torn grip pad', 'a clock on the wall reading an odd time', 'sweat on a dumbbell handle'], scenes: ['an empty rack in morning light', 'one person resting between sets, candid', 'the floor from a low angle, weights uneven'] },
  realestate:  { palette: ['#211E1A ink', '#EFE9DD paper', '#94774A oak', '#7C8A86 stone'], props: ['a lockbox on the door', 'a slightly bent business card', 'sunlight hitting real dust in the air', 'a tape measure on the counter', 'a scuff on the hardwood'], scenes: ['an empty room with afternoon light from the left', 'a kitchen shot from the doorway, off-center', 'the front step with the door ajar'] },
  hospitality: { palette: ['#2A241D walnut', '#E9E1D2 limestone', '#B79256 brass', '#5E6B63 eucalyptus'], props: ['fresh-cut stems in a ceramic vase', 'a stack of design books squared on the table', 'a folded throw over the armrest', 'a tray of glassware catching the window light', 'a key card on the polished counter'], scenes: ['the lobby from the entrance, warm afternoon light from tall windows', 'a styled lounge seating group, off-center', 'the reception desk with fresh flowers and morning light'] },
  generic:     { palette: ['#1F1D1A ink', '#ECE6DA paper', '#8B6F3A brass', '#6B7A75 slate'], props: ['a considered detail in the frame', 'real texture on a surface', 'an object placed with intent', 'a real cable run neatly', 'soft daylight across a clean surface'], scenes: ['the main space from the doorway, off-center', 'a working detail shot at an angle', 'a person mid-task, candid, slight motion blur'] },
};

function pickIndustry(brief) {
  const b = (brief || '').toLowerCase();
  const map = {
    cafe: ['cafe', 'coffee', 'roaster', 'espresso', 'barista'],
    dental: ['dental', 'dentist', 'orthodont', 'clinic', 'teeth'],
    saas: ['saas', 'software', 'app', 'startup', 'platform', 'dashboard', 'b2b'],
    restaurant: ['restaurant', 'kitchen', 'bistro', 'eatery', 'diner', 'chef'],
    hospitality: ['hotel', 'hospitality', 'resort', 'lobby', 'suite', 'spa', 'lounge', 'inn'],
    retail: ['retail', 'shop', 'store', 'boutique', 'apparel'],
    fitness: ['fitness', 'gym', 'crossfit', 'studio', 'training', 'yoga'],
    realestate: ['real estate', 'realtor', 'property', 'realty', 'homes', 'listing'],
  };
  for (const [k, words] of Object.entries(map)) if (words.some(w => b.includes(w))) return k;
  return 'generic';
}

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return (h >>> 0); }
// Deterministic pick so the same brief always forges the same kit (reproducible).
function pickN(arr, seed, n) {
  const out = []; const used = new Set();
  for (let i = 0; out.length < n && i < arr.length * 3; i++) {
    const idx = (seed + i * 7) % arr.length;
    if (!used.has(idx)) { used.add(idx); out.push(arr[idx]); }
  }
  return out;
}

// ── The core: assemble ONE sheen-proof prompt from a scene + light + camera. ─
function forgePrompt(scene, ind, seed, opts = {}) {
  // Light: pick from the daylight presets by default; only let the office/desk
  // fluorescent recipe through when the scene actually reads like an office.
  // A daylight scene with fluorescent light from nowhere is exactly the tell.
  const OFFICE_LIGHT = 2; // index of the "mixed office light" preset
  const isOffice = /\boffice\b|\bdesk\b|\bworkstation\b|\bcubicle\b/i.test(scene);
  const lightPool = isOffice
    ? LIGHT_PRESETS
    : LIGHT_PRESETS.filter((_, i) => i !== OFFICE_LIGHT);
  const light = lightPool[seed % lightPool.length];
  const cam = CAMERAS[seed % CAMERAS.length];
  const styling = STYLING[seed % STYLING.length];
  // PHOTO_TRUTH is about the photograph (always on). Two are plenty.
  const photo = pickN(PHOTO_TRUTH, seed, 2);
  // Lived-in is ONE subtle, optional touch — and only when the scene isn't
  // explicitly clinical/sterile. opts.livedIn=false forces a fully clean space.
  const wantLivedIn = opts.livedIn !== false && !/\bclinical\b|\bsterile\b/i.test(scene);
  const lived = wantLivedIn ? LIVED_IN[seed % LIVED_IN.length] : '';
  const prop = ind.props[seed % ind.props.length];
  return [
    `${scene}.`,
    `Styling: ${styling}.`,
    `Light: ${light}.`,
    `Camera: ${cam}; real depth of field.`,
    `Real-world detail in frame: ${prop}.`,
    lived ? `One subtle lived-in touch: ${lived}.` : '',
    `Photograph: ${photo.join('; ')}; surfaces are clean but read as real materials, never plastic or AI-smooth.`,
    `Composition: composed and intentional, slightly off-center — not a dead-centered AI hero shot.`,
    `Shot as a real interior photograph, not a render. Clean and well-decorated, with believable physics.`,
  ].filter(Boolean).join(' ');
}

// ════════════════════════════════════════════════════════════════════════════
// SUBCOMMAND: prompt — one scene in, one sheen-proof prompt out
// ════════════════════════════════════════════════════════════════════════════
function cmdPrompt(brief, jsonOut) {
  const key = pickIndustry(brief);
  const ind = INDUSTRIES[key];
  const seed = hash(brief);
  const scene = brief || ind.scenes[0];
  const prompt = forgePrompt(scene, ind, seed);
  const banned = bannedTerms();
  if (jsonOut) { out({ kind: 'prompt', industry: key, prompt, banned }); return; }
  hr('FORGE PROMPT', `industry: ${key}`);
  println('');
  println('  ' + wrap(prompt, 72).join('\n  '));
  println('');
  println(`  ${dim('Never put these in the prompt:')} ${banned.slice(0, 14).join(', ')} …`);
  println(`  ${dim('Then generate, and:')} node bin/ai.cjs forge check <image-url> --prompt="..."`);
  println('');
}

// ════════════════════════════════════════════════════════════════════════════
// SUBCOMMAND: kit — a whole mini visual-lock for a company (PINFORGE in one shot)
// ════════════════════════════════════════════════════════════════════════════
function cmdKit(brief, jsonOut) {
  const key = pickIndustry(brief);
  const ind = INDUSTRIES[key];
  const seed = hash(brief);
  const scenes = ind.scenes;
  const prompts = scenes.map((s, i) => forgePrompt(s, ind, seed + i * 13));
  // Two extra generic angles so a demo has 4-6 coherent frames.
  const extra = ['a tight still-life of the most-used object on the counter', 'the entrance from outside in honest daylight'];
  for (let i = 0; i < extra.length; i++) prompts.push(forgePrompt(extra[i], ind, seed + (scenes.length + i) * 13));
  const voice = `One person who actually works here, talking like they would to a regular: warm, specific, no buzzwords. Concrete detail over adjective.`;

  const kit = {
    brief, industry: key,
    palette: ind.palette,
    camera_language: CAMERAS[seed % CAMERAS.length],
    light_default: LIGHT_PRESETS[seed % LIGHT_PRESETS.length],
    voice,
    prompts,
    banned: bannedTerms().slice(0, 18),
    ts: Date.now(),
  };
  recordKit(kit);

  if (jsonOut) { out({ kind: 'kit', ...kit }); return; }
  hr('FORGE KIT', `${brief}  ·  industry: ${key}`);
  println('');
  println(`  ${b('PALETTE')}   ${ind.palette.join('   ')}`);
  println(`  ${b('CAMERA')}    ${kit.camera_language}`);
  println(`  ${b('LIGHT')}     ${kit.light_default}`);
  println(`  ${b('VOICE')}     ${voice}`);
  println('');
  println(`  ${b('SCENE PROMPTS')}  (${prompts.length} coherent frames — generate, then forge check each)`);
  prompts.forEach((p, i) => {
    println('');
    println(`  ${cyan((i + 1) + '.')}`);
    println('     ' + wrap(p, 70).join('\n     '));
  });
  println('');
  println(`  ${dim('Never in any prompt:')} ${kit.banned.join(', ')} …`);
  println(`  ${dim('Logged to .mycelium/forge-kits.json. Reproducible: same brief → same kit.')}`);
  println('');
}

function recordKit(kit) {
  try {
    if (!fs.existsSync(MYC)) fs.mkdirSync(MYC, { recursive: true });
    let all = []; try { all = JSON.parse(fs.readFileSync(KIT_LOG, 'utf8')); } catch { /* fresh */ }
    if (!Array.isArray(all)) all = [];
    all.push({ brief: kit.brief, industry: kit.industry, ts: kit.ts, date: new Date().toISOString(), promptCount: kit.prompts.length });
    if (all.length > 100) all = all.slice(-100);
    fs.writeFileSync(KIT_LOG, JSON.stringify(all, null, 2));
  } catch { /* noop */ }
}

// ════════════════════════════════════════════════════════════════════════════
// SUBCOMMAND: check — judge the sheen FOR you (generic, any industry)
//   Two modes:
//     --rubric            print the instruction string for understand_images
//     (JSON on stdin)     score an understand_images reply → verdict + fix
// ════════════════════════════════════════════════════════════════════════════
const RUBRIC = [
  { id: 'photo_realism',     w: 2.0, q: 'Does this look like a real photograph on real gear, or an AI render? 10 = indistinguishable from professional photography, 1 = obviously AI. NOTE: a clean, tidy, well-decorated space is NOT a tell — real interiors are styled and cleaned before a shoot. Judge physics, not tidiness.' },
  { id: 'no_render_gloss',   w: 1.6, q: 'CGI/render tells — PLASTIC or AI-smooth surfaces, glowing edges, AI shimmer, impossible reflections, gradients that are too perfect? 10 = none (surfaces read as real materials even if clean), 1 = many. Clean is fine; plastic-looking is the tell.' },
  { id: 'light_has_source',  w: 1.6, q: 'Does the light come from ONE believable named source with a direction and color temperature, casting consistent shadows — NOT even glow from everywhere? 10 = clear single source, 1 = light from nowhere.' },
  { id: 'styling_natural',   w: 1.4, q: 'Does the space look like a real, well-styled interior a person arranged and cleaned — tidy, decorated, cared-for, but not eerily flawless? 10 = believable production-level styling (clean yet real), 1 = either a sterile/impossible AI-perfect set OR random grime. Both extremes are wrong; the target is clean and intentional with believable physics.' },
  { id: 'composition',       w: 1.0, q: 'Composed and intentional, slightly off-center like a real interior photographer, or a dead-centered symmetric AI hero shot? 10 = real-photographer framing, 1 = AI default.' },
  { id: 'people_authentic',  w: 1.0, q: 'If people are visible: real varied bodies/ages, candid posture, imperfect grooming — or AI stock-photo people (symmetric faces, perfect skin, hero pose)? 10 = real, 1 = AI stock. If no people, score 10.' },
  { id: 'depth_and_grain',   w: 1.0, q: 'Natural film grain / sensor noise / real depth of field, or the AI smooth-gradient look? 10 = natural grain, 1 = AI smoothness.' },
  { id: 'material_truth',    w: 0.9, q: 'Are materials (wood, metal, fabric, glass) consistent and real-scale, or do they have AI hallmarks (wrong grain scale, plastic look)? 10 = real, 1 = AI.' },
];

function rubric(prompt) {
  const head = [
    'You are a forensic image analyst. Decide whether this image reads as a real photograph or an AI generation. Be strict: the goal is that a viewer believes a professional photographer shot it.',
    prompt ? `\nPrompt that produced it:\n"""\n${prompt.slice(0, 500)}\n"""` : '',
    '\nScore EACH rubric item 1-10 with a one-sentence reason citing specific visual evidence.',
    'Return STRICT JSON only, no prose outside it:',
    '{ "scores": { "<id>": { "score": <int>, "reason": "<short>" }, ... },',
    '  "ai_tells_observed": ["..."], "biggest_fix": "<the single most impactful change to make it read real>",',
    '  "verdict_summary": "<one sentence>" }',
    '\nRUBRIC ITEMS:',
  ].filter(Boolean).join('\n');
  return head + '\n' + RUBRIC.map(r => `- ${r.id}: ${r.q}`).join('\n') + '\n\nReturn ONLY the JSON.';
}

function scoreResponse(raw) {
  const tryParse = s => { try { return JSON.parse(s); } catch { return null; } };
  let j = tryParse(raw); if (!j) { const m = raw.match(/\{[\s\S]*\}/); if (m) j = tryParse(m[0]); }
  if (!j || !j.scores) return { ok: false, composite: 0, pass: false, reason: 'could not parse JSON', raw: raw.slice(0, 400) };
  let ws = 0, ss = 0; const breakdown = {}; const low = [];
  for (const r of RUBRIC) {
    const e = j.scores[r.id];
    if (!e || typeof e.score !== 'number') { breakdown[r.id] = { score: null }; continue; }
    const s = Math.max(1, Math.min(10, e.score));
    breakdown[r.id] = { score: s, reason: e.reason || '' };
    ss += s * r.w; ws += r.w; if (s <= 4) low.push({ id: r.id, score: s, reason: e.reason || '' });
  }
  const composite = ws ? Math.round((ss / ws) * 10) : 0;
  const pass = composite >= 75 && low.length === 0;
  return { ok: true, composite, pass, breakdown, low, aiTells: j.ai_tells_observed || [], biggestFix: j.biggest_fix || '', summary: j.verdict_summary || '' };
}

function cmdCheck(args, jsonOut) {
  const wantRubric = args.includes('--rubric');
  const prompt = (args.find(a => a.startsWith('--prompt=')) || '').split('=').slice(1).join('=') || '';
  const url = args.find(a => !a.startsWith('--')) || '';
  if (wantRubric || !process.stdin.isTTY === false) { /* fallthrough */ }
  if (wantRubric) { process.stdout.write(rubric(prompt) + '\n'); return; }

  // If there's stdin (an understand_images reply piped in), score it.
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { /* none */ }
  if (raw.trim()) {
    const v = scoreResponse(raw);
    if (jsonOut) { out(v); process.exitCode = v.pass ? 0 : 1; return; }
    // The vision model sometimes replies in prose instead of JSON. Don't crash —
    // surface the reply and tell the caller to re-ask for strict JSON.
    if (!v.ok) {
      hr('FORGE CHECK', red('could not parse a structured verdict'));
      println('');
      println('  The image judge replied in prose, not JSON. Two options:');
      println('  1. Re-call understand_images with the --rubric instruction (it asks for STRICT JSON).');
      println('  2. Read the prose verdict yourself:');
      println('');
      println('  ' + dim(v.raw || raw.slice(0, 400)));
      println('');
      process.exitCode = 1;
      return;
    }
    const flag = v.pass ? green('✓ PASS') : red('✗ FIX');
    hr('FORGE CHECK', `${flag}  ${v.composite}/100`);
    if (v.summary) println('  ' + v.summary);
    println('');
    for (const r of RUBRIC) {
      const bd = v.breakdown[r.id]; if (!bd || bd.score == null) continue;
      const t = bd.score >= 8 ? green('✓') : bd.score >= 5 ? dim('·') : red('✗');
      println(`  ${t} ${r.id.padEnd(18)} ${String(bd.score).padStart(2)}/10  ${(bd.reason || '').slice(0, 60)}`);
    }
    if (v.biggestFix) { println(''); println(`  ${b('BIGGEST FIX → ')}${v.biggestFix}`); }
    if (v.aiTells.length) { println(''); println('  AI tells: ' + v.aiTells.slice(0, 6).join('; ')); }
    println('');
    process.exitCode = v.pass ? 0 : 1;
    return;
  }

  // No stdin, no --rubric: explain the flow (this is what the agent runs).
  hr('FORGE CHECK', url ? `image: ${url}` : 'judge an image for AI sheen');
  println('');
  println('  This judges the sheen FOR you. The flow (agent runs it):');
  println('');
  println('  1. Get the rubric instruction:');
  println(`       node bin/ai.cjs forge check --rubric --prompt="<your gen prompt>"`);
  println('  2. Call understand_images( image_urls=[<url>], instruction=<that rubric> )');
  println('  3. Pipe the reply back to score it + get the single biggest fix:');
  println(`       echo '<understand_images JSON>' | node bin/ai.cjs forge check ${url || '<url>'} --prompt="..."`);
  println('');
  println(`  ${dim('Pass = composite ≥ 75 and no item ≤ 4. Fail returns the one fix to feed back, so pass 2 is targeted.')}`);
  println('');
}

// ── tiny output helpers (no deps) ──────────────────────────────────────────
const TTY = process.stdout.isTTY;
const c = (n) => TTY ? `\x1b[${n}m` : '';
const b = s => c(1) + s + c(0), dim = s => c(2) + s + c(0), cyan = s => c(36) + s + c(0);
const green = s => c(32) + s + c(0), red = s => c(31) + s + c(0);
function println(...a) { process.stdout.write(a.join(' ') + '\n'); }
function hr(title, sub) { println(''); println('  ' + b(title) + (sub ? '  ' + dim('· ' + sub) : '')); println('  ' + '═'.repeat(60)); }
function out(obj) { process.stdout.write(JSON.stringify(obj, null, 2) + '\n'); }
function wrap(s, n) { const w = s.split(' '); const lines = []; let cur = ''; for (const x of w) { if ((cur + ' ' + x).trim().length > n) { lines.push(cur.trim()); cur = x; } else cur += ' ' + x; } if (cur.trim()) lines.push(cur.trim()); return lines; }

// ── CLI ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const argv = process.argv.slice(2);
  const jsonOut = argv.includes('--json');
  const sub = (argv[0] || '').toLowerCase();
  const rest = argv.slice(1).filter(a => a !== '--json');
  const brief = rest.filter(a => !a.startsWith('--')).join(' ').trim();

  if (sub === 'prompt') return cmdPrompt(brief, jsonOut);
  if (sub === 'kit')    return cmdKit(brief, jsonOut);
  if (sub === 'check')  return cmdCheck(rest, jsonOut);

  println('');
  println('  ' + b('forge') + ' — spin up a PINFORGE-grade visual kit for any industry, fast');
  println('  ' + '═'.repeat(60));
  println('  forge prompt "<scene>"             one sheen-proof prompt, right first try');
  println('  forge kit "<company> <industry>"   palette + camera + 4-6 scene prompts + voice');
  println('  forge check <url> [--prompt=...]    judge the sheen FOR you + the one fix');
  println('  forge check --rubric [--prompt=...] print the vision rubric instruction');
  println('');
  println('  ' + dim('Doctrine: FORGE-DOCTRINE.md. Bans sourced from tools/sheen-corpus.json.'));
  println('');
  process.exit(argv.length ? 1 : 0);
}

module.exports = { forgePrompt, rubric, scoreResponse, pickIndustry, INDUSTRIES, RUBRIC };
