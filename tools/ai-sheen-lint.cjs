#!/usr/bin/env node
/**
 * AI-Sheen Lint — pre-prompt gate for image generation.
 * ─────────────────────────────────────────────────────────────────
 * Scans an image-generation prompt for AI-tells BEFORE we burn
 * credits. Blocks high-severity terms (CGI/render/8k/posh), warns
 * on medium tells (ultra-realistic/cinematic/luxury), and requires
 * at least one Taiwan cue + one specific camera/lens reference.
 *
 * Reused by:
 *   tools/observer-runner.cjs (registry: prompt-lint observer)
 *   pre-image-generation gate (call before image_generation tool)
 *   npm run sheen:lint -- "your prompt here"
 *   require('./tools/ai-sheen-lint').check(prompt) → { ok, issues, suggestions }
 *
 * Pure function, side-effect-free except for optional event-bus emit.
 * Returns structured findings; caller decides to block or warn.
 *
 * Adding a new banned term: edit tools/sheen-corpus.json. Every
 * consumer picks it up — no code change needed.
 */

'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const CORPUS_FILE = path.join(__dirname, 'sheen-corpus.json')
const EVENTS_FILE = path.join(ROOT, '.mycelium', 'events.jsonl')

function loadCorpus() {
  try { return JSON.parse(fs.readFileSync(CORPUS_FILE, 'utf8')) }
  catch (err) { return null }
}

/* ─── Term matching — case-insensitive whole-phrase ───────── */
function findTerms(prompt, terms) {
  const lower = prompt.toLowerCase()
  const hits = []
  for (const t of terms) {
    if (!t.term) continue
    const needle = t.term.toLowerCase()
    /* Skip checklist meta-entries — handled separately */
    if (needle === 'must include taiwan cue') continue
    /* Word-boundary match for short terms; substring for multi-word */
    let found = false
    if (needle.includes(' ')) {
      found = lower.includes(needle)
    } else {
      const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      found = re.test(prompt)
    }
    if (found) hits.push({ ...t })
  }
  return hits
}

/* ─── Taiwan cue detector — at least one is required ──────── */
function hasTaiwanCue(prompt) {
  const lower = prompt.toLowerCase()
  const cues = [
    'taipei 101', 'yangmingshan', 'xinyi district', 'songshan',
    'taipei', 'taiwan', 'kaohsiung', 'taichung', 'keelung',
    '繁體', '台北', '台灣', '高雄', '台中', '基隆',
    '聯合報', '中國時報', '自由時報', '蘋果日報',
    'cathay', 'fubon', 'chunghwa', 'acer', 'asus', 'htc',
    'roc calendar', '民國',
    'taiwanese tea', 'oolong', 'pearl milk tea', '珍珠奶茶',
    'taipei plug', 'type a/b socket',
    'scooter', 'motorcycle helmet on coat hook',
    'taipei skyline', 'humid taipei',
  ]
  const matches = cues.filter((c) => lower.includes(c.toLowerCase()))
  return { found: matches.length > 0, matches }
}

/* ─── Camera/lens specificity — at least one is required ─── */
function hasCameraSpec(prompt) {
  const lower = prompt.toLowerCase()
  const specs = [
    'phase one', 'leica q3', 'leica m', 'hasselblad', 'fujifilm gfx',
    'canon 5d', 'canon r5', 'sony a7r', 'sony a1', 'nikon z',
    'kodak portra', 'kodak ektar', 'fuji pro 400h', 'cinestill',
    'iso 400', 'iso 800', 'iso 1600', 'iso 3200',
    '35mm summilux', '50mm summicron', '24-70 f/2.8',
    'phase one iq', 'medium format film', 'large format',
  ]
  const matches = specs.filter((s) => lower.includes(s))
  return { found: matches.length > 0, matches }
}

/* ─── Public check() ─────────────────────────────────────── */
function check(prompt, opts = {}) {
  const corpus = loadCorpus()
  if (!corpus) {
    return { ok: true, issues: [], warnings: [{ message: 'sheen-corpus.json missing — running unlinted' }], suggestions: [] }
  }

  const allTerms = [
    ...(corpus.cgi_tells || []),
    ...(corpus.ai_signature_tells || []),
    ...(corpus.luxury_tells || []),
  ]
  const hits = findTerms(prompt, allTerms)
  const high = hits.filter((h) => h.severity === 'high')
  const medium = hits.filter((h) => h.severity === 'medium')
  const low = hits.filter((h) => h.severity === 'low')

  const taiwan = hasTaiwanCue(prompt)
  const camera = hasCameraSpec(prompt)

  const issues = []
  for (const h of high) {
    issues.push({
      severity: 'high',
      kind: 'banned-term',
      term: h.term,
      why: h.why,
      suggest: h.replace ? `replace with: "${h.replace}"` : `remove: "${h.term}"`,
    })
  }
  if (!taiwan.found && !opts.skipTaiwan) {
    issues.push({
      severity: 'high',
      kind: 'missing-taiwan-cue',
      why: 'without a Taiwan-specific cue the scene reads as generic Singapore/Dubai/anywhere',
      suggest: 'add ONE of: Taipei 101 visible through window, 繁體中文 signage, Cathay/Fubon brand, scooter/helmet, ROC calendar date, oolong tea set, humid Taipei haze, Taipei plug socket',
    })
  }
  if (!camera.found && !opts.skipCamera) {
    issues.push({
      severity: 'high',
      kind: 'missing-camera-spec',
      why: 'without a real camera + lens, the model defaults to AI-render aesthetics',
      suggest: 'add ONE of: "shot on Phase One IQ4 80mm", "Leica Q3 35mm Summilux f/1.7", "Hasselblad X2D 55mm", "Kodak Portra 400 medium format"',
    })
  }

  const warnings = []
  for (const m of [...medium, ...low]) {
    warnings.push({
      severity: m.severity,
      kind: 'soft-tell',
      term: m.term,
      why: m.why,
      suggest: m.replace ? `replace with: "${m.replace}"` : `consider removing: "${m.term}"`,
    })
  }

  /* Brevity check — image prompts > 800 chars usually wander into AI tropes */
  if (prompt.length > 1200) {
    warnings.push({
      severity: 'medium',
      kind: 'prompt-too-long',
      why: `prompt is ${prompt.length} chars; long prompts drift into vague AI tropes`,
      suggest: 'cut to ≤800 chars. Keep: subject, camera/lens, location cue, lighting, palette, 2 imperfections.',
    })
  }

  /* Imperfection check — every prompt should request at least one
     "honest defect" so the image looks taken, not made. */
  const imperfectionCues = [
    'fingerprint', 'dust', 'scuff', 'coffee ring', 'crooked', 'uneven',
    'imperfect', 'lived-in', 'humid haze', 'over-exposed', 'motion blur',
    'film grain', 'iso 800', 'iso 1600', 'cable management', 'wear',
    'patina', 'water stain',
  ]
  const hasImperfection = imperfectionCues.some((c) => prompt.toLowerCase().includes(c))
  if (!hasImperfection && !opts.skipImperfection) {
    warnings.push({
      severity: 'medium',
      kind: 'missing-imperfection',
      why: 'no honest defect requested — image will look "made", not "taken"',
      suggest: 'add ONE of: fingerprint on glass, coffee ring on walnut, slightly crooked name tag, dust on windowsill, ISO 800 push grain, slight motion blur on background figures',
    })
  }

  const ok = issues.length === 0
  const summary = {
    ok,
    promptChars: prompt.length,
    issues,
    warnings,
    taiwan,
    camera,
    counts: { high: issues.length, medium: medium.length, low: low.length },
  }

  /* Optional event-bus emission */
  if (opts.emit) {
    try {
      if (!fs.existsSync(path.dirname(EVENTS_FILE))) fs.mkdirSync(path.dirname(EVENTS_FILE), { recursive: true })
      fs.appendFileSync(EVENTS_FILE, JSON.stringify({
        ts: Date.now(), date: new Date().toISOString(),
        system: 'ai-sheen-lint', event: ok ? 'prompt_clean' : 'prompt_rejected',
        severity: ok ? 'info' : 'warn',
        data: { issues: issues.length, warnings: warnings.length, promptChars: prompt.length },
      }) + '\n')
    } catch { /* never block on telemetry */ }
  }

  return summary
}

/* ─── Pretty printer ─────────────────────────────────────── */
function pretty(result) {
  const lines = []
  lines.push('')
  lines.push(`  AI-Sheen Lint  ${result.ok ? '✓ OK' : '✗ BLOCKED'}  ${result.promptChars} chars`)
  lines.push(`  ${'─'.repeat(60)}`)
  if (result.issues.length === 0 && result.warnings.length === 0) {
    lines.push('  No issues. Prompt cleared for generation.')
  }
  for (const i of result.issues) {
    lines.push(`  ✗ [${i.severity}] ${i.kind}${i.term ? ` — "${i.term}"` : ''}`)
    lines.push(`     ${i.why}`)
    if (i.suggest) lines.push(`     → ${i.suggest}`)
  }
  for (const w of result.warnings) {
    lines.push(`  ! [${w.severity}] ${w.kind}${w.term ? ` — "${w.term}"` : ''}`)
    if (w.why) lines.push(`     ${w.why}`)
    if (w.suggest) lines.push(`     → ${w.suggest}`)
  }
  lines.push('')
  lines.push(`  Taiwan cue : ${result.taiwan.found ? '✓ ' + result.taiwan.matches.slice(0, 3).join(', ') : '✗ none found'}`)
  lines.push(`  Camera spec: ${result.camera.found ? '✓ ' + result.camera.matches.slice(0, 2).join(', ') : '✗ none found'}`)
  lines.push('')
  return lines.join('\n')
}

/* ─── CLI ─────────────────────────────────────────────────── */
if (require.main === module) {
  const argv = process.argv.slice(2)
  const wantJSON = argv.includes('--json')
  const skipTaiwan = argv.includes('--skip-taiwan')
  const skipCamera = argv.includes('--skip-camera')
  const skipImperfection = argv.includes('--skip-imperfection')
  const emit = !argv.includes('--no-emit')

  /* Read prompt: either inline arg or stdin */
  let prompt = argv.filter((a) => !a.startsWith('--')).join(' ')
  if (!prompt) {
    try { prompt = fs.readFileSync(0, 'utf8').trim() } catch { /* no stdin */ }
  }
  if (!prompt) {
    process.stderr.write('Usage: ai-sheen-lint.cjs "prompt text" OR pipe via stdin\n')
    process.exit(2)
  }

  const result = check(prompt, { skipTaiwan, skipCamera, skipImperfection, emit })
  if (wantJSON) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  } else {
    process.stdout.write(pretty(result))
  }
  process.exit(result.ok ? 0 : 1)
}

module.exports = { check, pretty, hasTaiwanCue, hasCameraSpec, findTerms }
