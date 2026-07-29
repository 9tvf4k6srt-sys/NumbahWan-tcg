#!/usr/bin/env node
/**
 * tools/aitell-pipeline.cjs — the anti-AI-tell production pipeline orchestrator
 * ============================================================================
 * One command that inspects every production step for "this was made by AI"
 * tells, runs the right detector chain per medium, and prints a single report.
 *
 * Design (grounded in TASTE.md + 2025 detection research):
 *
 *   Each medium has up to three STAGES, run in order, cheapest first:
 *
 *   Stage 1 · DETERMINISTIC (free, fast, HARD-BLOCK)
 *       Corpus pattern matches. The only stage that can fail a commit.
 *       text   → ai-tell-lint.cjs   (ai-tell-corpus.json, en/zh/ja/th)
 *       image  → ai-sheen-lint.cjs  (sheen-corpus.json, prompt vocab)
 *
 *   Stage 2 · STATISTICAL (free, fast, ADVISORY)
 *       Multi-signal stylometry. Never blocks (perplexity/burstiness-style
 *       metrics false-positive on strong + non-native writing — see research
 *       note in ai-stylometry.cjs). Reports a 0..100 machine-rhythm score.
 *       text   → ai-stylometry.cjs
 *
 *   Stage 3 · JUDGE (LLM, costs tokens, ADVISORY by default)
 *       An LLM scores naturalness 0..100 and proposes a same-voice rewrite.
 *       Opt-in with --judge (skipped in pre-commit to keep commits fast/free).
 *       text   → ai-naturalness.cjs
 *
 *   CODE MEDIUM (ADVISORY, never blocks)
 *       code   → code-slop-lint.cjs — the prose linter guards user-facing
 *                copy; this guards the CODE ITSELF (narrative comments,
 *                swallowed exceptions, as-any casts). Advisory-only: code
 *                slop has too many legitimate uses to hard-block.
 *
 * Routing: a file is TEXT if .html/.md/.txt; CODE if .cjs/.js/.mjs/.ts/.tsx;
 * an IMAGE-PROMPT file if its path matches an image-prompt convention
 * (--images flag forces sheen on a file).
 *
 * Usage:
 *   node tools/aitell-pipeline.cjs                 # staged files (pre-commit mode)
 *   node tools/aitell-pipeline.cjs --all           # full sweep
 *   node tools/aitell-pipeline.cjs <file> ...      # specific files
 *   node tools/aitell-pipeline.cjs --judge         # + Stage 3 LLM judge
 *   node tools/aitell-pipeline.cjs --json          # machine-readable
 *   node tools/aitell-pipeline.cjs --quiet         # only print if something fires
 *
 * Exit code: 1 ONLY if Stage 1 (deterministic) blocks. Stages 2 & 3 never
 * change the exit code. This keeps the gate honest and the advice non-coercive.
 */

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const common = require('./lib/aitell-common.cjs');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const ALL = args.includes('--all');
const JSON_OUT = args.includes('--json');
const JUDGE = args.includes('--judge');
const QUIET = args.includes('--quiet');
const IMAGES = args.includes('--images');
const explicitFiles = args.filter(a => !a.startsWith('--'));

const C = common.colors(process.stdout);

function tool(p) { return path.join(__dirname, p); }
function has(p) { return fs.existsSync(tool(p)); }

function runTool(script, toolArgs) {
  const r = spawnSync('node', [tool(script), ...toolArgs], { cwd: ROOT, encoding: 'utf8' });
  return { status: r.status || 0, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function stagedFiles() {
  return common.stagedFiles(spawnSync, ROOT);
}

// ── classify a path into a medium ──────────────────────────────────────────
function mediumOf(file) {
  if (IMAGES) return 'image';
  if (/\.(html|md|txt)$/i.test(file)) return 'text';
  if (/\.(cjs|js|mjs|ts|tsx)$/i.test(file)) return 'code';
  // image-prompt convention files (json prompt manifests live under prompts/)
  if (/prompt|sheen/i.test(file) && /\.json$/i.test(file)) return 'image';
  return null;
}

const tryParseJSON = common.tryParseJSON;

// extract the stylometry score line(s) for the human report
function summarizeStylometry(stdout, jsonMode) {
  if (jsonMode) return tryParseJSON(stdout);
  return stdout;
}

// ── main pipeline ───────────────────────────────────────────────────────────
function main() {
  let textFiles = [];
  let imageFiles = [];
  let codeFiles = [];

  if (explicitFiles.length) {
    for (const f of explicitFiles) {
      const m = mediumOf(f);
      if (m === 'text') textFiles.push(f);
      else if (m === 'image') imageFiles.push(f);
      else if (m === 'code') codeFiles.push(f);
    }
  } else if (ALL) {
    // ai-tell-lint --all and ai-sheen-lint already know their own corpora.
    textFiles = ['--all'];
    imageFiles = ['--all'];
    codeFiles = ['--all'];
  } else {
    const staged = stagedFiles();
    for (const f of staged) {
      const m = mediumOf(f);
      if (m === 'text') textFiles.push(f);
      else if (m === 'image') imageFiles.push(f);
      else if (m === 'code') codeFiles.push(f);
    }
  }

  const report = { blocked: false, stages: {} };

  // ════════════════ TEXT MEDIUM ════════════════
  const textTargets = textFiles.includes('--all') ? ['--all'] : textFiles;
  if (textTargets.length) {
    // Stage 1 — deterministic (BLOCKING)
    if (has('ai-tell-lint.cjs')) {
      const s1 = runTool('ai-tell-lint.cjs', textTargets.includes('--all') ? ['--all'] : textTargets);
      report.stages.text_deterministic = { status: s1.status, out: s1.stdout };
      if (s1.status !== 0) report.blocked = true;
    }
    // Stage 1b — layout / visual tells (BLOCKING) — HTML only.
    // Lints the BUILD (emoji-as-icon, stock gradients, default shadows) the way
    // ai-tell-lint lints the prose. Only runs on .html targets.
    if (has('ai-layout-lint.cjs')) {
      const htmlTargets = textTargets.includes('--all')
        ? ['--all']
        : textTargets.filter(f => /\.html?$/i.test(f));
      if (htmlTargets.length) {
        const sL = runTool('ai-layout-lint.cjs', htmlTargets);
        report.stages.text_layout = { status: sL.status, out: sL.stdout };
        if (sL.status !== 0) report.blocked = true;
      }
    }
    // Stage 2 — stylometry (ADVISORY) — only on concrete files, not --all sweep
    if (has('ai-stylometry.cjs') && !textTargets.includes('--all')) {
      const s2 = runTool('ai-stylometry.cjs', textTargets);
      report.stages.text_stylometry = { status: 0, out: s2.stdout };
    }
    // Stage 3 — LLM judge (ADVISORY, opt-in)
    if (JUDGE && has('ai-naturalness.cjs') && !textTargets.includes('--all')) {
      const s3 = runTool('ai-naturalness.cjs', textTargets);
      report.stages.text_judge = { status: 0, out: s3.stdout };
    }
  }

  // ════════════════ IMAGE MEDIUM ════════════════
  const imageTargets = imageFiles.includes('--all') ? ['--all'] : imageFiles;
  if (imageTargets.length && has('ai-sheen-lint.cjs')) {
    const args1 = imageTargets.includes('--all') ? [] : imageTargets;
    const si = runTool('ai-sheen-lint.cjs', args1);
    report.stages.image_deterministic = { status: si.status, out: si.stdout };
    if (si.status !== 0) report.blocked = true;
  }

  // ════════════════ CODE MEDIUM (ADVISORY) ════════════════
  // Agent residue in code: narrative comments, swallowed exceptions, as-any
  // casts. Never blocks — the report is a review prompt, not a gate.
  const codeTargets = codeFiles.includes('--all') ? ['--all'] : codeFiles;
  if (codeTargets.length && has('code-slop-lint.cjs')) {
    const sc = runTool('code-slop-lint.cjs', codeTargets);
    report.stages.code_slop = { status: 0, out: sc.stdout };
  }

  return report;
}

const report = main();

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.blocked ? 1 : 0);
}

// ── human report ────────────────────────────────────────────────────────────
const fired = Object.keys(report.stages).length > 0;
if (QUIET && !report.blocked && !fired) process.exit(0);

console.log('');
console.log(`${C.b}  ANTI-AI-TELL PIPELINE${C.r}  ${C.dim}— inspecting every production step${C.r}`);
console.log('  ═══════════════════════════════════════════════════════════');

const STAGE_LABEL = {
  text_deterministic:  '① TEXT · deterministic corpus   (BLOCKING)',
  text_layout:         '① TEXT · layout / visual tells  (BLOCKING)',
  text_stylometry:     '② TEXT · stylometry signals     (advisory)',
  text_judge:          '③ TEXT · LLM naturalness judge  (advisory)',
  image_deterministic: '① IMAGE · sheen corpus          (BLOCKING)',
  code_slop:           '② CODE · agent-residue lint      (advisory)',
};

// stages whose status can block a commit (used only for the ✓/✗ marker)
const BLOCKING_STAGES = new Set(['text_deterministic', 'text_layout', 'image_deterministic']);

if (!Object.keys(report.stages).length) {
  console.log('  nothing to inspect (no text/image/code targets in scope)');
} else {
  for (const [key, st] of Object.entries(report.stages)) {
    const blocking = BLOCKING_STAGES.has(key);
    const mark = blocking
      ? (st.status === 0 ? `${C.green}✓ clean${C.r}` : `${C.red}✗ BLOCKED${C.r}`)
      : `${C.cyan}advisory${C.r}`;
    console.log(`\n  ${C.b}${STAGE_LABEL[key] || key}${C.r}  ${mark}`);
    const body = (st.out || '').split('\n').filter(l => l.trim()).map(l => '    ' + l.trimEnd());
    if (body.length) console.log(body.join('\n'));
  }
}

console.log('');
if (report.blocked) {
  console.log(`  ${C.red}${C.b}RESULT: blocked by a deterministic stage.${C.r} Fix the ✗ items above.`);
  console.log(`  ${C.dim}Bypass (only for pre-existing debt): git commit --no-verify${C.r}`);
} else {
  console.log(`  ${C.green}RESULT: no deterministic blocks.${C.r} Review any advisory notes above.`);
  if (!JUDGE) console.log(`  ${C.dim}Add --judge for the LLM naturalness pass (costs tokens).${C.r}`);
}
console.log('');

process.exit(report.blocked ? 1 : 0);
