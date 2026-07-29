#!/usr/bin/env node
/**
 * tools/generation-contract.cjs — inject the style contract INTO generation.
 * ─────────────────────────────────────────────────────────────────────────
 * The linters catch slop AFTER it's written (gate). This tool moves the same
 * doctrine UPSTREAM: every generation call in the harness should be built from
 * a contract prompt block + an exemplar anchor, so the model produces
 * decision-evidence work the first time and the gate has nothing to catch.
 *
 * Single source of truth: tools/style-contract.json. The negative-pattern
 * enforcement stays in the linter corpora (referenced, never duplicated here).
 *
 * Modes:
 *   node tools/generation-contract.cjs --medium=text          # prompt block for a generation call
 *   node tools/generation-contract.cjs --medium=text --critique   # + self-critique checklist (revision pass)
 *   node tools/generation-contract.cjs --medium=text --exemplar   # + golden exemplar content (few-shot anchor)
 *   node tools/generation-contract.cjs --medium=code --exemplar --json
 *   node tools/generation-contract.cjs --check <file>         # contract-vs-output lint (uses mediumOf)
 *   node tools/generation-contract.cjs --list                 # mediums + exemplars available
 *
 * Exit 0 always in prompt modes; --check exits like the underlying linters
 * (blocks only on deterministic high-severity hits).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CONTRACT = path.join(ROOT, 'tools', 'style-contract.json');

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const CRITIQUE = args.includes('--critique');
const EXEMPLAR = args.includes('--exemplar');
const LIST = args.includes('--list');
const MEDIUM_ARG = args.find((a) => a.startsWith('--medium='));
const CHECK_ARG = args.find((a) => a.startsWith('--check'));
const MEDIUM = MEDIUM_ARG ? MEDIUM_ARG.split('=')[1] : null;

function loadContract() {
  try { return JSON.parse(fs.readFileSync(CONTRACT, 'utf8')); }
  catch (e) { console.error('style-contract.json unreadable: ' + e.message); process.exit(2); }
}

function readExemplars(contract, medium) {
  const files = (contract.exemplars && contract.exemplars[medium]) || [];
  const out = [];
  for (const f of files) {
    const abs = path.join(ROOT, f);
    if (fs.existsSync(abs)) {
      const src = fs.readFileSync(abs, 'utf8');
      out.push({ file: f, content: src.length > 4000 ? src.slice(0, 4000) + '\n…[truncated]' : src });
    }
  }
  return out;
}

function buildPromptBlock(contract, medium) {
  const m = contract.mediums[medium];
  if (!m) return null;
  const v = contract.voice;
  const lines = [];
  lines.push('STYLE CONTRACT — NumbahWan production work. Violating this block is a defect, not a style choice.');
  lines.push('');
  lines.push('PRINCIPLE: ' + contract.principle);
  lines.push('');
  lines.push('VOICE: ' + v.summary);
  lines.push('DO:');
  for (const d of v.do) lines.push('  - ' + d);
  lines.push('');
  lines.push('MUST INCLUDE (' + medium + '):');
  for (const x of m.mustInclude) lines.push('  - ' + x);
  lines.push('');
  lines.push('NEVER DO (' + medium + '):');
  for (const x of m.neverDo) lines.push('  - ' + x);
  return lines.join('\n');
}

function buildCritique(contract, medium) {
  const m = contract.mediums[medium];
  if (!m) return null;
  const lines = [];
  lines.push('SELF-CRITIQUE — run on YOUR OWN DRAFT before returning it. For each item: find the worst offender in your draft and fix it. If your draft already passes an item, move on. Do not narrate this pass; return only the revised work.');
  lines.push('');
  m.selfCritique.forEach((q, i) => lines.push(`  ${i + 1}. ${q}`));
  return lines.join('\n');
}

function mediumOfFile(f) {
  if (/\.(html)$/i.test(f)) return 'layout';
  if (/\.(md|txt)$/i.test(f)) return 'text';
  if (/\.(cjs|js|mjs|ts|tsx)$/i.test(f)) return 'code';
  return null;
}

function runCheck(file, jsonOut) {
  const medium = mediumOfFile(file);
  if (!medium) {
    console.error('no medium mapping for ' + file + ' (expected .md/.txt/.html/.cjs/.js/.mjs/.ts/.tsx)');
    process.exit(2);
  }
  const tool = { text: 'ai-tell-lint.cjs', layout: 'ai-layout-lint.cjs', code: 'code-slop-lint.cjs' }[medium];
  const toolArgs = medium === 'text'
    ? ['--file=' + file, ...(jsonOut ? ['--json'] : [])]
    : [file, ...(jsonOut ? ['--json'] : [])];
  const r = spawnSync('node', [path.join(ROOT, 'tools', tool), ...toolArgs], { cwd: ROOT, encoding: 'utf8' });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  process.exit(r.status || 0);
}

function main() {
  const contract = loadContract();

  if (LIST) {
    const mediums = Object.keys(contract.mediums);
    if (JSON_OUT) { console.log(JSON.stringify({ version: contract.version, mediums, exemplars: contract.exemplars }, null, 2)); return; }
    console.log('style-contract v' + contract.version);
    for (const m of mediums) {
      const ex = readExemplars(contract, m);
      console.log(`  ${m}: ${contract.mediums[m].mustInclude.length} must-include · ${contract.mediums[m].neverDo.length} never-do · ${ex.length} exemplar(s) present`);
    }
    return;
  }

  if (CHECK_ARG) {
    const file = CHECK_ARG.includes('=') ? CHECK_ARG.split('=')[1] : args[args.indexOf('--check') + 1];
    if (!file) { console.error('--check needs a file'); process.exit(2); }
    runCheck(file, JSON_OUT);
    return;
  }

  if (!MEDIUM || !contract.mediums[MEDIUM]) {
    console.error('usage: --medium=' + Object.keys(contract.mediums).join('|') + ' [--critique] [--exemplar] [--json]  ·  --check <file>  ·  --list');
    process.exit(2);
  }

  const block = buildPromptBlock(contract, MEDIUM);
  const critique = CRITIQUE ? buildCritique(contract, MEDIUM) : null;
  const exemplars = EXEMPLAR ? readExemplars(contract, MEDIUM) : [];

  if (JSON_OUT) {
    console.log(JSON.stringify({ medium: MEDIUM, version: contract.version, promptBlock: block, critique, exemplars }, null, 2));
    return;
  }

  console.log(block);
  if (exemplars.length) {
    console.log('');
    console.log('GOLDEN EXEMPLAR — match this rhythm and specificity. Do not copy its facts; copy its decisions.');
    for (const ex of exemplars) {
      console.log('');
      console.log('── ' + ex.file + ' ──');
      console.log(ex.content);
    }
  }
  if (critique) { console.log(''); console.log(critique); }
}

main();
