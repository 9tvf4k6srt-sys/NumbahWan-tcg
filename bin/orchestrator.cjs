#!/usr/bin/env node
'use strict';

/**
 * Factory workflow: plan -> generate -> verify -> HUMAN REVIEW.
 * Deterministic orchestration, not an autonomous LLM planner. No deployment tool.
 * Default is plan-only; --execute explicitly authorizes local generation.
 * See ARCHITECTURE.md for the trust boundary and known limitations.
 */
const fs = require('node:fs');
const path = require('node:path');
const { runWorkflow, executeNode, digest } = require('../tools/lib/workflow-runtime.cjs');
const ROOT = path.resolve(__dirname, '..');

function validateSpec(specPath, root = ROOT) {
  if (typeof specPath !== 'string' || !specPath || specPath.includes('\0')) throw new Error('A spec path is required');
  const resolved = fs.realpathSync(path.resolve(root, specPath));
  const relative = path.relative(path.join(fs.realpathSync(root), 'specs'), resolved);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) ||
      !/\.ya?ml$/i.test(relative) || !fs.statSync(resolved).isFile()) {
    throw new Error('Spec must be a regular YAML file inside specs/ (including symlink target)');
  }
  return path.relative(root, resolved);
}

function scorecardAccept(result) {
  // Frozen existing gate thresholds: average >=85 and no page below 70.
  // Missing / malformed measurements are not passes; stdout prose is not authority.
  const rows = JSON.parse(result.stdout);
  return Array.isArray(rows) && rows.length > 0 &&
    rows.every(r => Number.isFinite(r.score) && r.score >= 70 && r.score <= 100) &&
    Math.round(rows.reduce((sum, r) => sum + r.score, 0) / rows.length) >= 85;
}

function createWorkflow({ intent, specPath, root = ROOT } = {}) {
  if ((typeof intent === 'string') === (typeof specPath === 'string')) {
    throw new Error('Supply exactly one intent or specPath');
  }
  if (intent !== undefined && (!intent.trim() || intent.length > 8000 || intent.startsWith('-') || intent.includes('\0'))) {
    throw new Error('Intent must contain 1–8000 characters and must not start with a flag');
  }
  let spec = specPath === undefined ? undefined : validateSpec(specPath, root);
  const tool = (script, effect, argv = [], accept) => ({
    argv: [script, ...argv], effect, timeoutMs: 120000,
    maxAttempts: 1, retryExitCodes: [], ...(accept ? { accept } : {}),
  });
  const tools = {
    parse: tool('bin/intent-parser.cjs', 'write', [], result => {
      const matches = [...result.stdout.matchAll(/Spec written: (specs\/[^\r\n]+\.yaml)/g)];
      if (matches.length !== 1) return false;
      spec = validateSpec(matches[0][1], root);
      return true;
    }),
    generate: {
      ...tool('bin/page-gen.cjs', 'write'),
      // A trusted adapter resolves a validated artifact, not a model-authored command.
      resolveArgs: () => [validateSpec(spec, root)],
    },
    translate: tool('scripts/i18n-translate.cjs', 'write'),
    inject: tool('scripts/i18n-inject.cjs', 'write'),
    scorecard: tool('bin/quality-scorecard.cjs', 'read', ['--json'], scorecardAccept),
    i18n: tool('scripts/i18n-inject.cjs', 'read', ['--check']),
    tests: tool('tests/run-tests.cjs', 'read'),
    types: tool('node_modules/typescript/bin/tsc', 'read', ['--noEmit']),
    context: tool('bin/gen-context.cjs', 'write'),
  };
  const step = (id, needs = [], args = []) => ({ id, tool: id, needs, args });
  const plan = [
    ...(intent !== undefined ? [step('parse', [], [intent])] : []),
    step('generate', intent !== undefined ? ['parse'] : []),
    step('translate', ['generate']),
    step('inject', ['translate']),
    step('scorecard', ['inject']), step('i18n', ['inject']),
    step('tests', ['inject']), step('types', ['inject']),
    step('context', ['scorecard', 'i18n', 'tests', 'types']),
  ];
  return { plan, tools };
}

function describeWorkflow(workflow) {
  return {
    version: 1, status: 'planned', executed: false,
    steps: workflow.plan.map(s => ({
      id: s.id, tool: s.tool, needs: s.needs,
      effect: workflow.tools[s.tool].effect, timeoutMs: workflow.tools[s.tool].timeoutMs,
    })),
    terminal: 'awaiting_review',
    note: 'No tools run. --execute authorizes local writes, not deployment or merge.',
  };
}

async function fullPipeline(intent, opts = {}) {
  return executeWorkflow(createWorkflow({ intent, root: opts.root }), opts);
}
async function fromSpec(specPath, opts = {}) {
  return executeWorkflow(createWorkflow({ specPath, root: opts.root }), opts);
}
async function executeWorkflow(workflow, opts) {
  if (opts.execute !== true) return describeWorkflow(workflow);
  return runWorkflow(workflow.plan, workflow.tools, {
    cwd: opts.root || ROOT, deadlineMs: 300000, maxCalls: 12, concurrency: 2,
    signal: opts.signal, onEvent: opts.onEvent,
    ...(opts.executor ? { execute: opts.executor } : {}),
  });
}

function persistReceipt(result) {
  const dir = path.join(ROOT, '.mycelium', 'workflow-runs');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${result.runId}.json`);
  // IDs come from randomUUID(), never from the CLI. Exclusive create preserves
  // prior receipts. This local artifact is not signed or tamper-proof.
  fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return path.relative(ROOT, file);
}

async function main(args = process.argv.slice(2)) {
  const json = args.includes('--json');
  const report = value => console.log(json ? JSON.stringify(value, null, 2) :
    `${value.status}: ${value.note || value.runId}${value.receipt ? `\nReceipt: ${value.receipt}` : ''}`);
  if (args.includes('--status')) {
    report({ status: 'idle', note: 'Inspect .mycelium/workflow-runs/ for individual run receipts; no cached health score is treated as execution evidence.' });
    return 0;
  }
  if (args.includes('--monitor')) {
    throw new Error('Unattended repair has been removed from the factory. Use agent:diagnose for advisory diagnostics; inspect findings before acting.');
  }
  if (args.includes('--help') || !args.length) {
    console.log('Factory workflow (plan-only by default)\n' +
      '  node bin/orchestrator.cjs "Add a DLC about fire dragons" [--execute] [--json]\n' +
      '  node bin/orchestrator.cjs --from-spec specs/example.yaml [--execute] [--json]\n' +
      '  node bin/orchestrator.cjs --demo [--json]\n' +
      'No automatic fixes, deployment, or merge. --dry-run explicitly selects plan-only.');
    return 0;
  }
  if (args.includes('--execute') && args.includes('--dry-run')) throw new Error('Choose --execute or --dry-run, not both');
  const known = new Set(['--json', '--execute', '--dry-run', '--demo', '--from-spec']);
  for (const arg of args) if (arg.startsWith('--') && !known.has(arg)) throw new Error(`Unknown option: ${arg}`);
  if (args.includes('--demo')) {
    const result = await demo();
    report(result);
    return result.success ? 0 : 1;
  }
  const positional = args.filter(a => !known.has(a));
  if (args.includes('--from-spec') && positional.length !== 1) throw new Error('--from-spec requires exactly one path');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    const options = { execute: args.includes('--execute'), signal: controller.signal };
    const result = args.includes('--from-spec')
      ? await fromSpec(positional[0], options) : await fullPipeline(positional.join(' '), options);
    if (result.executed === false) { report(result); return 0; }
    result.receipt = persistReceipt(result);
    report(result);
    return result.success ? 0 : 1;
  } finally {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  }
}

async function demo() {
  // Real Node subprocesses, synthetic work: exercises scheduling without API
  // keys, repository writes, or a paid/model-quality claim.
  const tools = Object.fromEntries(['draft', 'check-a', 'check-b'].map(id => [id, {
    argv: ['-e', 'process.stdout.write("fixture-ok")'],
    effect: 'read', timeoutMs: 2000, maxAttempts: 1, retryExitCodes: [],
    accept: result => result.stdout === 'fixture-ok',
  }]));
  const plan = [
    { id: 'draft', tool: 'draft', needs: [], args: [] },
    { id: 'check-a', tool: 'check-a', needs: ['draft'], args: [] },
    { id: 'check-b', tool: 'check-b', needs: ['draft'], args: [] },
  ];
  return { ...(await runWorkflow(plan, tools, { cwd: ROOT, execute: executeNode })),
    mode: 'synthetic-subprocess-demo', planHash: digest(plan),
    note: 'Real subprocesses; synthetic tasks. No model calls, files written, or deployment.' };
}

if (require.main === module) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(JSON.stringify({ status: 'failed', error: error.message }));
    process.exitCode = 1;
  });
}
module.exports = { validateSpec, scorecardAccept, createWorkflow, describeWorkflow, fullPipeline, fromSpec, demo, main };
