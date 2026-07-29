#!/usr/bin/env node
/**
 * evals/linter-eval.cjs — grade the anti-slop linters against golden fixtures.
 * ─────────────────────────────────────────────────────────────────────────────
 * The harness grades model OUTPUT with evals/outcome-eval.cjs; this grades the
 * harness's own DETECTORS. Same discipline: hand-authored fixtures with a known
 * correct verdict (evals/linter-fixtures/manifest.json), mechanical grading
 * (no LLM judge), receipts so a re-run after a rule change is auditable.
 *
 * Three fixture shapes (see manifest.json):
 *   positive    — planted slop; every expected rule must fire.      → recall
 *   negative    — clean content; NO rule may fire.                  → precision
 *   adversarial — looks like a violation but is legitimate (documented
 *                 silence, prose emoji, one-tell-hex gradient).     → precision
 *
 * A fixture PASSES when every expected rule fired AND no unexpected rule did.
 * Unexpected-rule hits on positive fixtures are reported as extra hits (they
 * fail the fixture — a rule firing on a targeted file without being listed is
 * either a false positive or an unstated expectation; both deserve eyes).
 *
 * Verdicts per layer: DETECTOR-HEALTHY (all fixtures pass),
 * RECALL-GAP (missed planted slop), PRECISION-GAP (fired on clean/adversarial),
 * or both. Overall: worst layer wins.
 *
 * Usage:
 *   node evals/linter-eval.cjs            # human report
 *   node evals/linter-eval.cjs --json     # machine-readable
 *   node evals/linter-eval.cjs --write    # + append receipt to evals/results/linter-eval-history.jsonl
 *   node evals/linter-eval.cjs --strict   # exit 1 unless every fixture passes
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'evals', 'linter-fixtures', 'manifest.json');
const HISTORY_FILE = path.join(ROOT, 'evals', 'results', 'linter-eval-history.jsonl');
const RESULTS_FILE = path.join(ROOT, 'evals', 'results', 'linter-eval.json');

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const WRITE = args.includes('--write');
const STRICT = args.includes('--strict');

function runTool(script, toolArgs) {
  const r = spawnSync('node', [path.join(ROOT, 'tools', script), ...toolArgs], {
    cwd: ROOT, encoding: 'utf8', timeout: 60000,
  });
  try { return JSON.parse(r.stdout); } catch { return null; }
}

// ── per-layer runners: return a Map of relFile → Set of fired rule ids ──────
function runText(files) {
  const fired = new Map(files.map((f) => [f, new Set()]));
  for (const f of files) {
    // --force: fixtures are path-exempt from sweeps (planted slop by design);
    // the eval must bypass that exemption to grade them.
    const out = runTool('ai-tell-lint.cjs', ['--file=' + f, '--json', '--force']);
    if (!out) continue;
    for (const v of out.violations || []) fired.get(f).add(v.ruleId);
  }
  return fired;
}

function runLayout(files) {
  const out = runTool('ai-layout-lint.cjs', [...files, '--json']);
  const fired = new Map(files.map((f) => [f, new Set()]));
  for (const r of (out && out.results) || []) {
    // layout linter reports absolute paths; normalize to repo-relative
    const rel = path.relative(ROOT, r.file || '').replace(/\\/g, '/');
    if (!fired.has(rel)) continue;
    for (const f2 of r.findings || []) fired.get(rel).add(f2.id);
  }
  return fired;
}

function runCode(files) {
  const out = runTool('code-slop-lint.cjs', [...files, '--json']);
  const fired = new Map(files.map((f) => [f, new Set()]));
  for (const f2 of (out && out.findings) || []) {
    if (fired.has(f2.file)) fired.get(f2.file).add(f2.rule);
  }
  return fired;
}

const LAYERS = {
  text: { runner: runText, tool: 'ai-tell-lint.cjs' },
  layout: { runner: runLayout, tool: 'ai-layout-lint.cjs' },
  code: { runner: runCode, tool: 'code-slop-lint.cjs' },
};

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const layers = {};

  for (const [layer, fixtures] of Object.entries(manifest.layers)) {
    const files = fixtures.map((f) => f.file);
    for (const f of files) {
      if (!fs.existsSync(path.join(ROOT, f))) {
        console.error(`linter-eval: fixture missing: ${f}`);
        process.exit(2); // corpus corruption — never grade a partial corpus
      }
    }
    const fired = LAYERS[layer].runner(files);

    const results = fixtures.map((fx) => {
      const got = fired.get(fx.file) || new Set();
      const missed = fx.expect.filter((id) => !got.has(id));
      const extra = [...got].filter((id) => !fx.expect.includes(id));
      return {
        file: fx.file, shape: fx.shape, expect: fx.expect,
        fired: [...got], missed, extra,
        pass: missed.length === 0 && extra.length === 0,
      };
    });

    const byShape = (s) => results.filter((r) => r.shape === s);
    const tp = results.reduce((n, r) => n + r.expect.filter((id) => r.fired.includes(id)).length, 0);
    const fn = results.reduce((n, r) => n + r.missed.length, 0);
    const fp = results.reduce((n, r) => n + r.extra.length, 0);
    layers[layer] = {
      tool: LAYERS[layer].tool,
      fixtures: results.length,
      passed: results.filter((r) => r.pass).length,
      recall: tp + fn ? +(tp / (tp + fn)).toFixed(3) : 1,
      precision: tp + fp ? +(tp / (tp + fp)).toFixed(3) : 1,
      positivesPassed: `${byShape('positive').filter((r) => r.pass).length}/${byShape('positive').length}`,
      controlsClean: `${byShape('negative').concat(byShape('adversarial')).filter((r) => r.pass).length}/${byShape('negative').length + byShape('adversarial').length}`,
      results,
    };
  }

  const overall = Object.entries(layers).map(([layer, l]) => ({
    layer,
    verdict: l.passed === l.fixtures ? 'DETECTOR-HEALTHY'
      : l.recall < 1 && l.precision < 1 ? 'RECALL+PRECISION-GAP'
      : l.recall < 1 ? 'RECALL-GAP' : 'PRECISION-GAP',
  }));
  const allPass = overall.every((o) => o.verdict === 'DETECTOR-HEALTHY');

  const receipt = {
    ts: new Date().toISOString(),
    manifestVersion: manifest.version,
    overall: allPass ? 'DETECTORS-HEALTHY' : 'GAPS-FOUND',
    layers: Object.fromEntries(Object.entries(layers).map(([k, l]) => [k, {
      passed: `${l.passed}/${l.fixtures}`, recall: l.recall, precision: l.precision,
      positivesPassed: l.positivesPassed, controlsClean: l.controlsClean,
    }])),
    detail: layers,
  };

  if (JSON_OUT) { console.log(JSON.stringify(receipt, null, 2)); }
  else {
    console.log('');
    console.log('  LINTER EVAL — grading the detectors against golden fixtures');
    console.log('  ═══════════════════════════════════════════════════════════');
    for (const [layer, l] of Object.entries(layers)) {
      const o = overall.find((x) => x.layer === layer);
      console.log(`\n  ${layer.toUpperCase()} (${l.tool}) — ${o.verdict}`);
      console.log(`    fixtures: ${l.passed}/${l.fixtures} pass · recall ${l.recall} · precision ${l.precision}`);
      console.log(`    planted caught: ${l.positivesPassed} · clean/adversarial clean: ${l.controlsClean}`);
      for (const r of l.results.filter((x) => !x.pass)) {
        const name = r.file.split('/').pop();
        if (r.missed.length) console.log(`    ✗ MISS   ${name} [${r.shape}] — expected not fired: ${r.missed.join(', ')}`);
        if (r.extra.length) console.log(`    ✗ EXTRA  ${name} [${r.shape}] — unexpected fired: ${r.extra.join(', ')}`);
      }
    }
    console.log(`\n  OVERALL: ${receipt.overall}`);
    console.log('');
  }

  if (WRITE) {
    fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(receipt, null, 2));
    fs.appendFileSync(HISTORY_FILE, JSON.stringify({
      ts: receipt.ts, manifestVersion: receipt.manifestVersion, overall: receipt.overall,
      layers: receipt.layers,
    }) + '\n');
    if (!JSON_OUT) console.log(`  receipt → evals/results/linter-eval.json · history → linter-eval-history.jsonl`);
  }

  process.exit(STRICT && !allPass ? 1 : 0);
}

main();
