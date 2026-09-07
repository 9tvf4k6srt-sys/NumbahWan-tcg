'use strict';
// Offline reliability evals, not a model-quality benchmark. Node builtins only.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { runWorkflow, validatePlan, executeNode, classify } = require('../tools/lib/workflow-runtime.cjs');
const { createWorkflow, fullPipeline, validateSpec, scorecardAccept } = require('../bin/orchestrator.cjs');
const ROOT = path.resolve(__dirname, '..');
const step = (id, needs = [], tool = id) => ({ id, needs, tool, args: [] });
const tool = (overrides = {}) => ({ argv: ['-e', ''], effect: 'read', timeoutMs: 1000, maxAttempts: 1, retryExitCodes: [], ...overrides });
const good = (overrides = {}) => ({ code: 0, signal: null, reason: null, stdout: '', stderr: '', ...overrides });
const run = (plan, tools, options = {}) => runWorkflow(plan, tools, { cwd: ROOT, execute: async () => good(), ...options });

for (const [name, plan, tools] of [
  ['empty plan', [], {}],
  ['unknown capability', [step('a')], {}],
  ['prototype capability', [step('a', [], '__proto__')], {}],
  ['duplicate step', [step('a'), step('a')], { a: tool() }],
  ['missing dependency', [step('a', ['missing'])], { a: tool() }],
  ['cycle', [step('a', ['b']), step('b', ['a'])], { a: tool(), b: tool() }],
  ['unsafe write retry', [step('a')], { a: tool({ effect: 'write', maxAttempts: 2 }) }],
  ['unbounded retry', [step('a')], { a: tool({ maxAttempts: 4 }) }],
  ['zero timeout', [step('a')], { a: tool({ timeoutMs: 0 }) }],
  ['NUL argv', [step('a')], { a: tool({ argv: ['bad\0value'] }) }],
]) {
  test(`rejects ${name} before executing anything`, async () => {
    let calls = 0;
    await assert.rejects(run(plan, tools, { execute: async () => { calls++; return good(); } }));
    assert.equal(calls, 0);
  });
}

test('validates an unsorted DAG and executes dependencies first', async () => {
  const r = await run([step('c', ['b']), step('b', ['a']), step('a')], { a: tool(), b: tool(), c: tool() });
  assert.deepEqual(r.events.filter(e => e.type === 'attempt_started').map(e => e.stepId), ['a', 'b', 'c']);
  assert.equal(r.status, 'awaiting_review');
  assert.equal(r.events.filter(e => e.type === 'run_finished').length, 1);
  assert.deepEqual(r.events.map(e => e.seq), r.events.map((_, i) => i + 1));
});

// Exhaustive combinations: no optimistic verdict if any required tool fails.
test('all 16 failure subsets of a four-check fan-out obey dependency and verdict invariants', async () => {
  for (let mask = 0; mask < 16; mask++) {
    const checks = ['a', 'b', 'c', 'd'];
    const plan = [...checks.map(id => step(id)), step('finish', checks)];
    const tools = Object.fromEntries([...checks, 'finish'].map(id => [id, tool({ argv: [id] })]));
    const r = await run(plan, tools, { execute: async ([id]) => good({ code: checks.includes(id) && (mask & (1 << checks.indexOf(id))) ? 1 : 0 }) });
    assert.equal(r.success, mask === 0, `failure mask ${mask}`);
    assert.equal(r.states.finish, mask === 0 ? 'succeeded' : 'blocked');
    assert.equal(r.calls, mask === 0 ? 5 : 4);
  }
});

for (const [name, result] of [
  ['nonzero exit containing PASS', good({ code: 9, stdout: 'PASS all tests green' })],
  ['timeout', good({ reason: 'timeout' })],
  ['signal', good({ code: null, signal: 'SIGKILL' })],
  ['missing result', undefined],
  ['partial result', { code: 0 }],
  ['string exit code', good({ code: '0' })],
  ['missing exit code', good({ code: null })],
]) {
  test(`fails closed on ${name}`, async () => {
    const r = await run([step('a'), step('b', ['a'])], { a: tool(), b: tool() }, { execute: async () => result });
    assert.equal(r.success, false);
    assert.equal(r.states.b, 'blocked');
    assert.equal(r.calls, 1);
  });
}

test('throws from adapters fail the step without leaking error text', async () => {
  const r = await run([step('a')], { a: tool() }, { execute: async () => { throw new Error('SECRET_API_KEY'); } });
  assert.equal(r.states.a, 'failed');
  assert.equal(JSON.stringify(r).includes('SECRET_API_KEY'), false);
});

test('output contracts must return boolean true, not a truthy explanation', async () => {
  for (const accept of [() => false, () => 'PASS', () => { throw new Error('bad JSON'); }]) {
    const r = await run([step('a')], { a: tool({ accept }) });
    assert.equal(r.success, false);
  }
});

test('read-only transient retry has exactly the declared attempt count', async () => {
  let calls = 0;
  const r = await run([step('a')], { a: tool({ maxAttempts: 3, retryExitCodes: [75] }) }, {
    execute: async () => good({ code: ++calls === 3 ? 0 : 75 }),
  });
  assert.equal(r.success, true);
  assert.equal(calls, 3);
  assert.equal(r.events.filter(e => e.type === 'retry_scheduled').length, 2);
});

test('exhausted retry does not make an extra last attempt', async () => {
  const r = await run([step('a')], { a: tool({ maxAttempts: 2, retryExitCodes: [75] }) }, { execute: async () => good({ code: 75 }) });
  assert.equal(r.calls, 2);
  assert.equal(r.success, false);
});

test('permanent failures and timeouts never retry', async () => {
  for (const result of [good({ code: 1 }), good({ code: 75, reason: 'timeout' })]) {
    const r = await run([step('a')], { a: tool({ maxAttempts: 3, retryExitCodes: [75] }) }, { execute: async () => result });
    assert.equal(r.calls, 1);
  }
});

test('global call budget also limits parallel checks and retries', async () => {
  const r = await run([step('a'), step('b')], { a: tool({ maxAttempts: 3, retryExitCodes: [75] }), b: tool() }, {
    maxCalls: 1, execute: async () => good({ code: 75 }),
  });
  assert.equal(r.calls, 1);
  assert.equal(r.success, false);
});

test('expired deadline starts zero subprocesses', async () => {
  let tick = 0;
  const r = await run([step('a')], { a: tool() }, { deadlineMs: 1, now: () => tick++ });
  assert.equal(r.calls, 0);
  assert.equal(r.states.a, 'blocked');
});

test('completion after deadline cannot become a success', async () => {
  let time = 0;
  const r = await run([step('a')], { a: tool() }, { deadlineMs: 10, now: () => time, execute: async () => { time = 20; return good(); } });
  assert.equal(r.success, false);
});

test('cancellation stops pending work before it starts', async () => {
  const controller = new AbortController();
  controller.abort();
  const r = await run([step('a')], { a: tool() }, { signal: controller.signal });
  assert.equal(r.calls, 0);
  assert.equal(r.status, 'cancelled');
});

test('sibling readers overlap, concurrency is bounded, writers never overlap', async () => {
  let active = 0, peak = 0, writer = false;
  const plan = [step('write'), step('a', ['write']), step('b', ['write']), step('c', ['write']), step('finish', ['a', 'b', 'c'])];
  const tools = Object.fromEntries(plan.map(s => [s.id, tool({ argv: [s.id], effect: ['write', 'finish'].includes(s.id) ? 'write' : 'read' })]));
  const r = await run(plan, tools, { concurrency: 2, execute: async ([id]) => {
    const writes = tools[id].effect === 'write';
    assert.equal(writer, false);
    if (writes) { assert.equal(active, 0); writer = true; }
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setImmediate(resolve));
    active--; if (writes) writer = false;
    return good();
  } });
  assert.equal(r.success, true);
  assert.equal(peak, 2);
});

test('invalid global budgets are rejected', async () => {
  for (const options of [{ maxCalls: 0 }, { concurrency: 9 }, { concurrency: Infinity }, { deadlineMs: -1 }]) {
    await assert.rejects(run([step('a')], { a: tool() }, options), /budget/);
  }
});

test('plan mutation during execution cannot grant extra capabilities', async () => {
  const plan = [step('a'), step('b', ['a'])];
  const tools = { a: tool({ argv: ['original-a'] }), b: tool({ argv: ['original-b'] }) };
  const called = [];
  await run(plan, tools, { execute: async argv => {
    called.push(argv[0]); tools.b.argv[0] = 'MALICIOUS'; plan[1].args.push('INJECTED');
    return good();
  } });
  assert.deepEqual(called, ['original-a', 'original-b']);
});

test('observer failures are visible but cannot rewrite control-plane state', async () => {
  const r = await run([step('a')], { a: tool() }, { onEvent: e => { e.type = 'forged'; throw new Error('observer down'); } });
  assert.equal(r.success, true);
  assert.equal(r.observerErrors.length, r.events.length);
  assert.equal(r.events.some(e => e.type === 'forged'), false);
});

test('arbitrary executor reason strings cannot leak into receipts', async () => {
  const r = await run([step('a')], { a: tool() }, { execute: async () => good({ reason: 'SECRET_EXCEPTION_TEXT' }) });
  assert.equal(r.success, false);
  assert.equal(JSON.stringify(r).includes('SECRET_EXCEPTION_TEXT'), false);
});

test('receipts contain neither raw arguments nor raw tool output', async () => {
  const s = step('a'); s.args = ['SECRET_PROMPT'];
  const r = await run([s], { a: tool() }, { execute: async () => good({ stdout: 'SECRET_STDOUT', stderr: 'SECRET_STDERR' }) });
  assert.equal(/SECRET_/.test(JSON.stringify(r)), false);
});

test('real subprocesses preserve nonzero exit status without shell pipes', async () => {
  const r = await executeNode(['-e', 'console.log("PASS");process.exit(17)'], { cwd: ROOT, timeoutMs: 2000 });
  assert.equal(r.code, 17);
  assert.equal(classify(r), 'exit_code');
});

test('shell metacharacters remain literal subprocess arguments', async () => {
  const text = '$(echo INJECTED) `echo INJECTED` ; echo INJECTED | cat "quote"';
  const r = await executeNode(['-e', 'process.stdout.write(process.argv[1])', '--', text], { cwd: ROOT, timeoutMs: 2000 });
  assert.equal(r.stdout, text);
  assert.equal(r.code, 0);
});

test('real hung child is terminated at its deadline', async () => {
  const r = await executeNode(['-e', 'setInterval(()=>{},1000)'], { cwd: ROOT, timeoutMs: 50 });
  assert.equal(r.reason, 'timeout');
  assert.notEqual(r.code, 0);
});

test('real active child is cancelled', async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50);
  try {
    const r = await executeNode(['-e', 'setInterval(()=>{},1000)'], { cwd: ROOT, timeoutMs: 2000, signal: controller.signal });
    assert.equal(r.reason, 'cancelled');
  } finally { clearTimeout(timer); }
});

test('runaway output is bounded and fails closed', async () => {
  const r = await executeNode(['-e', 'process.stdout.write("x".repeat(100000))'], { cwd: ROOT, timeoutMs: 2000, maxOutputBytes: 32 });
  assert.equal(r.reason, 'output_limit');
  assert.ok(Buffer.byteLength(r.stdout + r.stderr) <= 32);
});

test('spec confinement rejects traversal and symlink escapes', () => {
  const dir = fs.mkdtempSync(path.join(ROOT, '.workflow-test-'));
  try {
    fs.mkdirSync(path.join(dir, 'specs'));
    fs.writeFileSync(path.join(dir, 'specs', 'valid.yaml'), 'title: example');
    fs.writeFileSync(path.join(dir, 'outside.yaml'), 'title: outside');
    fs.symlinkSync('../outside.yaml', path.join(dir, 'specs', 'escape.yaml'));
    assert.equal(validateSpec('specs/valid.yaml', dir), 'specs/valid.yaml');
    assert.throws(() => validateSpec('specs/../outside.yaml', dir), /inside specs/);
    assert.throws(() => validateSpec('specs/escape.yaml', dir), /inside specs/);
    assert.throws(() => validateSpec(undefined, dir), /required/);
    assert.throws(() => validateSpec('specs/missing.yaml', dir));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('factory plans are non-mutating by default and contain no deploy or auto-fix capability', async () => {
  let calls = 0;
  const r = await fullPipeline('Add a DLC about fire dragons', { executor: async () => { calls++; return good(); } });
  assert.equal(r.executed, false);
  assert.equal(calls, 0);
  assert.equal(r.terminal, 'awaiting_review');
  assert.equal(r.steps.some(s => /deploy|merge|auto-fix/.test(s.tool)), false);
  const { plan, tools } = createWorkflow({ intent: 'Add fire dragons' });
  validatePlan(plan, tools);
  assert.equal(tools.types.argv[0], 'node_modules/typescript/bin/tsc');
  assert.deepEqual(plan.find(s => s.id === 'context').needs, ['scorecard', 'i18n', 'tests', 'types']);
});

test('factory passes malicious-looking intent as data, not shell source', async () => {
  const intent = 'Add dragons $(touch never-execute) ; echo PASS';
  let argv;
  const r = await fullPipeline(intent, { execute: true, executor: async a => { argv = a; return good({ code: 1 }); } });
  assert.deepEqual(argv, ['bin/intent-parser.cjs', intent]);
  assert.equal(r.success, false);
  assert.equal(r.calls, 1);
});

test('missing parser artifact blocks generation even with exit zero', async () => {
  const r = await fullPipeline('Add dragons', { execute: true, executor: async () => good({ stdout: 'PASS' }) });
  assert.equal(r.success, false);
  assert.equal(r.calls, 1);
  assert.equal(r.states.generate, 'blocked');
});

test('full factory succeeds only when every real adapter contract succeeds', async () => {
  const dir = fs.mkdtempSync(path.join(ROOT, '.workflow-test-'));
  try {
    fs.mkdirSync(path.join(dir, 'specs'));
    fs.writeFileSync(path.join(dir, 'specs', 'valid.yaml'), 'title: example');
    const stages = ['parse', 'generate', 'translate', 'inject', 'scorecard', 'i18n', 'tests', 'types', 'context'];
    const scripts = {
      'bin/intent-parser.cjs': 'parse', 'bin/page-gen.cjs': 'generate',
      'scripts/i18n-translate.cjs': 'translate', 'scripts/i18n-inject.cjs': 'inject',
      'bin/quality-scorecard.cjs': 'scorecard', 'tests/run-tests.cjs': 'tests',
      'node_modules/typescript/bin/tsc': 'types', 'bin/gen-context.cjs': 'context',
    };
    for (const failing of [null, ...stages]) {
      const seen = [];
      const r = await fullPipeline('Add dragons', { root: dir, execute: true, executor: async argv => {
        const id = argv.includes('--check') ? 'i18n' : scripts[argv[0]];
        assert.ok(id, `unregistered script ${argv[0]}`);
        seen.push(id);
        if (id === 'generate') assert.equal(argv[1], 'specs/valid.yaml');
        if (id === failing) return good({ code: 3, stdout: 'PASS' });
        return good({ stdout: id === 'parse' ? 'Spec written: specs/valid.yaml' : id === 'scorecard' ? '[{"score":85}]' : '' });
      } });
      assert.equal(r.success, failing === null, `failing stage: ${failing}`);
      if (failing) {
        assert.equal(r.states[failing], 'failed');
        if (failing !== 'context') assert.equal(seen.includes('context'), false);
      } else {
        assert.equal(r.calls, 9);
        assert.equal(r.status, 'awaiting_review');
      }
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('scorecard threshold is unchanged and missing measurements cannot pass', () => {
  const result = rows => good({ stdout: JSON.stringify(rows) });
  assert.equal(scorecardAccept(result([{ score: 85 }])), true);
  assert.equal(scorecardAccept(result([{ score: 84 }])), false);
  assert.equal(scorecardAccept(result([{ score: 100 }, { score: 69 }])), false);
  assert.equal(scorecardAccept(result([])), false);
  assert.equal(scorecardAccept(result([{ score: '100' }])), false);
  assert.throws(() => scorecardAccept(good({ stdout: 'PASS' })));
});

test('factory import has no CLI side effects', () => {
  const stdout = execFileSync(process.execPath, ['-e', 'require("./bin/orchestrator.cjs")'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(stdout, '');
});

test('CLI demo exercises real subprocesses and returns a parseable receipt', () => {
  const r = JSON.parse(execFileSync(process.execPath, ['bin/orchestrator.cjs', '--demo', '--json'], { cwd: ROOT, encoding: 'utf8' }));
  assert.equal(r.status, 'awaiting_review');
  assert.equal(r.calls, 3);
  assert.equal(r.mode, 'synthetic-subprocess-demo');
});

test('CLI rejects conflicting modes and missing spec with nonzero exit', () => {
  for (const args of [['--execute', '--dry-run', 'Add dragons'], ['--from-spec'], ['--unknown']]) {
    const r = spawnSync(process.execPath, ['bin/orchestrator.cjs', ...args], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.equal(JSON.parse(r.stderr).status, 'failed');
  }
});
