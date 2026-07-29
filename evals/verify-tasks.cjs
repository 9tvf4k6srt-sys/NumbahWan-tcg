#!/usr/bin/env node
/**
 * evals/verify-tasks.cjs — runs the golden verify-task registry.
 * ─────────────────────────────────────────────────────────────────
 * Each task in evals/tasks/registry.json pairs a doctrine claim ("the
 * harness says X works this way") with a mechanical check against the
 * actual repo. This is the harness holding ITSELF accountable: if a
 * doctrine file promises a command, file, or rule, this runner proves
 * it still exists. Drift between docs and reality fails loudly here
 * instead of confusing the next agent that trusts the docs.
 *
 * Check types (extend CHECKS to add more — every consumer picks it up):
 *   exists   — all listed paths exist on disk
 *   grep     — file contains the pattern (regex)
 *   no_grep  — file must NOT contain the pattern (proves retired things stay retired)
 *
 * Usage:
 *   node evals/verify-tasks.cjs           # human-readable
 *   node evals/verify-tasks.cjs --json    # machine-readable
 *   node evals/verify-tasks.cjs --strict  # exit 1 if any task fails (CI)
 *
 * Default exit code is 0 (advisory). --strict is for CI wiring.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'evals', 'tasks', 'registry.json');

const CHECKS = {
  exists(check) {
    const missing = check.paths.filter((p) => !fs.existsSync(path.join(ROOT, p)));
    return missing.length
      ? { ok: false, detail: `missing: ${missing.join(', ')}` }
      : { ok: true, detail: `${check.paths.length} paths present` };
  },
  grep(check) {
    let text;
    try {
      text = fs.readFileSync(path.join(ROOT, check.file), 'utf8');
    } catch (_) {
      return { ok: false, detail: `${check.file} not readable` };
    }
    const re = new RegExp(check.pattern);
    return re.test(text)
      ? { ok: true, detail: `/${check.pattern}/ found in ${check.file}` }
      : { ok: false, detail: `/${check.pattern}/ NOT in ${check.file}` };
  },
  no_grep(check) {
    let text;
    try {
      text = fs.readFileSync(path.join(ROOT, check.file), 'utf8');
    } catch (_) {
      return { ok: false, detail: `${check.file} not readable` };
    }
    const re = new RegExp(check.pattern, 'm');
    return re.test(text)
      ? { ok: false, detail: `/${check.pattern}/ PRESENT in ${check.file} (retired pattern resurfaced)` }
      : { ok: true, detail: `/${check.pattern}/ absent from ${check.file}` };
  },
};

function main() {
  const args = process.argv.slice(2);
  const JSON_OUT = args.includes('--json');
  const STRICT = args.includes('--strict');

  const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  const results = registry.tasks.map((t) => {
    const fn = CHECKS[t.check.type];
    const r = fn ? fn(t.check) : { ok: false, detail: `unknown check type: ${t.check.type}` };
    return { id: t.id, doctrine: t.doctrine, ...r };
  });

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ passed, failed, total: results.length, results }, null, 1) + '\n');
    process.exit(STRICT && failed ? 1 : 0);
  }

  process.stdout.write('\ngolden eval — verify-tasks (doctrine vs reality)\n');
  process.stdout.write('─'.repeat(64) + '\n');
  for (const r of results) {
    process.stdout.write(`  ${r.ok ? '✓' : '✗'} ${r.id}\n    ${r.detail}\n`);
  }
  process.stdout.write('─'.repeat(64) + '\n');
  process.stdout.write(`  ${passed}/${results.length} doctrine checks hold${failed ? ` — ${failed} FAILED (drift detected)` : ''}\n\n`);

  process.exit(STRICT && failed ? 1 : 0);
}

main();
