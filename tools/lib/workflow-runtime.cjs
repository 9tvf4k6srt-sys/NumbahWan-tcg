'use strict';

// Trusted workflow definitions own capabilities. Tool output is data, never a plan.
const { spawn } = require('node:child_process');
const { randomUUID, createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const positiveInt = n => Number.isSafeInteger(n) && n > 0;

function validatePlan(plan, tools) {
  if (!Array.isArray(plan) || !plan.length) throw new Error('Plan must not be empty');
  const ids = new Set();
  for (const step of plan) {
    if (!step || !/^[a-z][a-z0-9-]*$/.test(step.id) || ids.has(step.id)) {
      throw new Error('Invalid or duplicate step id');
    }
    ids.add(step.id);
    if (!Object.hasOwn(tools, step.tool)) throw new Error(`Unknown tool: ${step.tool}`);
    const tool = tools[step.tool];
    if (!['read', 'write'].includes(tool.effect) || !positiveInt(tool.timeoutMs) ||
        !positiveInt(tool.maxAttempts) || tool.maxAttempts > 3 ||
        !Array.isArray(tool.retryExitCodes) ||
        tool.retryExitCodes.some(code => !Number.isInteger(code) || code <= 0) ||
        !Array.isArray(tool.argv) || tool.argv.some(a => typeof a !== 'string' || a.includes('\0'))) {
      throw new Error(`Invalid tool contract: ${step.tool}`);
    }
    if (tool.maxAttempts > 1 && tool.effect !== 'read') {
      throw new Error('Write tools cannot retry: ambiguous side effects require review');
    }
    if (!Array.isArray(step.needs) || new Set(step.needs).size !== step.needs.length ||
        !Array.isArray(step.args) || step.args.some(a => typeof a !== 'string' || a.includes('\0'))) {
      throw new Error(`Invalid step contract: ${step.id}`);
    }
  }
  const remaining = new Map(plan.map(s => [s.id, s]));
  const seen = new Set();
  while (remaining.size) {
    const ready = [...remaining.values()].filter(s => s.needs.every(id => seen.has(id)));
    if (!ready.length) throw new Error('Cycle or missing dependency');
    for (const s of ready) { seen.add(s.id); remaining.delete(s.id); }
  }
}

// The only subprocess boundary. No shell, bounded combined output, deadline and
// cancellation kill the process group on POSIX (not an OS security sandbox).
function executeNode(argv, { cwd, timeoutMs, signal, maxOutputBytes = 1024 * 1024 }) {
  return new Promise(resolve => {
    let reason = null;
    let size = 0;
    const stdout = [], stderr = [];
    if (signal?.aborted) return resolve({ code: null, signal: null, reason: 'cancelled', stdout: '', stderr: '' });
    const child = spawn(process.execPath, argv, {
      cwd, shell: false, detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    function stop(why) {
      if (reason) return;
      reason = why;
      try {
        if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch { /* The child may have exited between the check and the kill. */ }
    }
    function collect(target, chunk) {
      size += chunk.length;
      if (size > maxOutputBytes) stop('output_limit');
      else target.push(chunk);
    }
    child.stdout.on('data', chunk => collect(stdout, chunk));
    child.stderr.on('data', chunk => collect(stderr, chunk));
    const timeout = setTimeout(() => stop('timeout'), timeoutMs);
    const abort = () => stop('cancelled');
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    child.on('error', () => { reason = reason || 'spawn_error'; });
    child.on('close', (code, exitSignal) => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      resolve({ code, signal: exitSignal, reason, stdout: Buffer.concat(stdout).toString(), stderr: Buffer.concat(stderr).toString() });
    });
  });
}

function classify(result) {
  if (!result || typeof result.stdout !== 'string' || typeof result.stderr !== 'string' ||
      !(result.code === null || Number.isInteger(result.code)) ||
      !(result.signal === null || typeof result.signal === 'string') ||
      ![null, 'timeout', 'cancelled', 'output_limit', 'spawn_error'].includes(result.reason)) return 'invalid_result';
  if (result.reason) return result.reason;
  if (result.signal) return 'signal';
  return result.code === 0 ? null : 'exit_code';
}

async function runWorkflow(plan, tools, options = {}) {
  const {
    cwd, execute = executeNode, concurrency = 2, maxCalls = 24,
    deadlineMs = 300000, signal, now = () => performance.now(),
    onEvent = () => {}, runId = randomUUID(),
  } = options;
  validatePlan(plan, tools);
  if (!positiveInt(concurrency) || concurrency > 8 || !positiveInt(maxCalls) || !positiveInt(deadlineMs)) {
    throw new Error('Invalid execution budget');
  }
  // Snapshot trusted input before any async work; later mutations cannot change authority.
  plan = structuredClone(plan);
  tools = Object.fromEntries(Object.entries(tools).map(([id, t]) => [id, { ...t, argv: [...t.argv], retryExitCodes: [...t.retryExitCodes] }]));
  const started = now();
  const states = Object.fromEntries(plan.map(s => [s.id, 'pending']));
  const events = [];
  const observerErrors = [];
  let calls = 0;
  function event(type, data = {}) {
    const e = { version: 1, runId, seq: events.length + 1, elapsedMs: Math.max(0, now() - started), type, ...data };
    events.push(e);
    try { onEvent(structuredClone(e)); } catch { observerErrors.push(e.seq); }
  }
  function transition(step, state, reason) {
    states[step.id] = state;
    event('step_state', { stepId: step.id, state, ...(reason ? { reason } : {}) });
  }
  function budgetReason() {
    if (signal?.aborted) return 'cancelled';
    if (now() - started >= deadlineMs) return 'deadline';
    if (calls >= maxCalls) return 'call_budget';
    return null;
  }
  event('run_started', { planHash: digest(plan), maxCalls, deadlineMs, concurrency });
  async function runStep(step) {
    const tool = tools[step.tool];
    transition(step, 'running');
    for (let attempt = 1; attempt <= tool.maxAttempts; attempt++) {
      const exhausted = budgetReason();
      if (exhausted) { transition(step, 'failed', exhausted); return; }
      calls++;
      event('attempt_started', { stepId: step.id, tool: step.tool, attempt });
      let result, reason;
      try {
        const toolArgs = tool.resolveArgs ? tool.resolveArgs(step) : step.args;
        if (!Array.isArray(toolArgs) || toolArgs.some(a => typeof a !== 'string' || a.includes('\0'))) {
          throw new Error('Invalid resolved arguments');
        }
        result = await execute([...tool.argv, ...toolArgs], {
          cwd, signal, timeoutMs: Math.max(1, Math.min(tool.timeoutMs, Math.ceil(deadlineMs - (now() - started)))),
        });
        reason = classify(result);
        if (!reason && signal?.aborted) reason = 'cancelled';
        if (!reason && now() - started >= deadlineMs) reason = 'deadline';
        if (!reason && tool.accept && tool.accept(result, step) !== true) reason = 'output_contract';
      } catch { reason = 'executor_error'; }
      // Do not persist prompts, arguments, stdout, stderr, or exception messages.
      event('attempt_finished', {
        stepId: step.id, attempt, code: Number.isInteger(result?.code) ? result.code : null,
        reason: reason || null,
      });
      if (!reason) { transition(step, 'succeeded'); return; }
      // Only explicitly classified transient read failures are retryable. No
      // retry after timeout, cancellation, malformed output or uncertain writes.
      if (reason !== 'exit_code' || !tool.retryExitCodes.includes(result.code) || attempt === tool.maxAttempts) {
        transition(step, 'failed', reason); return;
      }
      event('retry_scheduled', { stepId: step.id, attempt: attempt + 1 });
    }
  }
  while (Object.values(states).includes('pending')) {
    for (const s of plan) {
      if (states[s.id] === 'pending' && s.needs.some(id => ['failed', 'blocked'].includes(states[id]))) {
        transition(s, 'blocked', 'dependency_failed');
      }
    }
    const ready = plan.filter(s => states[s.id] === 'pending' && s.needs.every(id => states[id] === 'succeeded'));
    if (!ready.length) continue;
    const exhausted = budgetReason();
    if (exhausted) {
      for (const s of plan.filter(s => states[s.id] === 'pending')) transition(s, 'blocked', exhausted);
      break;
    }
    // Writes are serialized and never overlap reads. Read-only siblings can
    // share a wave; dependencies still establish a happens-before relation.
    const wave = tools[ready[0].tool].effect === 'write'
      ? [ready[0]] : ready.filter(s => tools[s.tool].effect === 'read').slice(0, concurrency);
    await Promise.all(wave.map(runStep));
  }
  const success = Object.values(states).every(s => s === 'succeeded');
  const status = success ? 'awaiting_review' : signal?.aborted ? 'cancelled' : 'failed';
  event('run_finished', { status, calls });
  return { version: 1, runId, status, success, calls, states, events, observerErrors };
}

module.exports = { validatePlan, executeNode, classify, runWorkflow, digest };
