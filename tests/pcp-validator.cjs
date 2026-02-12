#!/usr/bin/env node
/**
 * PCP Compliance Validator v1.0
 * 
 * Validates a running server against the Project Context Protocol (PCP) spec v0.1.
 * Tests all four compliance levels (L0-L3) and reports pass/fail with details.
 * 
 * Usage:
 *   node tests/pcp-validator.cjs                     # Test localhost:8788
 *   node tests/pcp-validator.cjs --port 8799         # Custom port
 *   node tests/pcp-validator.cjs --url https://x.dev # Remote server
 *   node tests/pcp-validator.cjs --json              # JSON output
 */

const http = require('http');
const https = require('https');

// ── Config ───────────────────────────────────────────────────────
const args = process.argv.slice(2);
const PORT = args.includes('--port') ? args[args.indexOf('--port') + 1] : (process.env.TEST_PORT || 8799);
const HOST = args.includes('--url') ? args[args.indexOf('--url') + 1] : `http://localhost:${PORT}`;
const JSON_OUTPUT = args.includes('--json');

// ── Colors ───────────────────────────────────────────────────────
const C = JSON_OUTPUT ? { g: '', r: '', y: '', c: '', d: '', b: '', x: '' } : {
  g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', c: '\x1b[36m',
  d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m'
};

// ── State ────────────────────────────────────────────────────────
let total = 0, pass = 0, fail = 0, warn = 0;
const results = [];
const failures = [];

function ok(test, detail) { total++; pass++; results.push({ test, status: 'pass', detail }); if (!JSON_OUTPUT) console.log(`${C.g}  PASS${C.x} ${test}${detail ? C.d + ' — ' + detail + C.x : ''}`); }
function ko(test, detail) { total++; fail++; results.push({ test, status: 'fail', detail }); failures.push(test); if (!JSON_OUTPUT) console.log(`${C.r}  FAIL${C.x} ${test}${detail ? ' — ' + detail : ''}`); }
function wn(test, detail) { total++; warn++; results.push({ test, status: 'warn', detail }); if (!JSON_OUTPUT) console.log(`${C.y}  WARN${C.x} ${test}${detail ? C.d + ' — ' + detail + C.x : ''}`); }
function section(name) { if (!JSON_OUTPUT) console.log(`\n${C.b}${C.c}━━━ ${name} ━━━${C.x}`); }

// ── HTTP helpers ─────────────────────────────────────────────────
function fetch(urlPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, HOST);
    const mod = url.protocol === 'https:' ? https : http;
    const reqOpts = {
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method: opts.method || 'GET',
      headers: { 'Accept': 'application/json', ...(opts.headers || {}) },
      timeout: 5000
    };
    const start = Date.now();
    const req = mod.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const ms = Date.now() - start;
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, json, raw: data, ms, location: res.headers.location });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

// ── Validators ───────────────────────────────────────────────────

async function testDiscovery() {
  section('DISCOVERY — /.well-known/pcp.json');
  try {
    const r = await fetch('/.well-known/pcp.json');
    r.status === 200 ? ok('Discovery returns 200') : ko('Discovery returns 200', `got ${r.status}`);
    if (!r.json) { ko('Discovery returns valid JSON'); return; }
    ok('Discovery returns valid JSON');

    const d = r.json;
    d.pcp_version ? ok('Has pcp_version', d.pcp_version) : ko('Has pcp_version');
    d.project ? ok('Has project name', d.project) : ko('Has project name');
    d.base_url ? ok('Has base_url', d.base_url) : ko('Has base_url');
    d.endpoints ? ok('Has endpoints object') : ko('Has endpoints object');
    d.token_budgets ? ok('Has token_budgets') : wn('Has token_budgets', 'recommended');
    d.capabilities ? ok('Has capabilities') : wn('Has capabilities', 'recommended');

    // Verify required endpoints exist
    if (d.endpoints) {
      const required = ['brief', 'rules'];
      const core = ['context', 'health', 'files'];
      const memory = ['tasks', 'memory', 'status', 'onboard'];
      
      for (const ep of required) {
        d.endpoints[ep] ? ok(`Discovery lists ${ep} endpoint`, d.endpoints[ep]) : ko(`Discovery lists ${ep} endpoint`);
      }
      for (const ep of core) {
        d.endpoints[ep] ? ok(`Discovery lists ${ep} endpoint`, d.endpoints[ep]) : wn(`Discovery lists ${ep} endpoint`, 'Level 1');
      }
      for (const ep of memory) {
        d.endpoints[ep] ? ok(`Discovery lists ${ep} endpoint`, d.endpoints[ep]) : wn(`Discovery lists ${ep} endpoint`, 'Level 2');
      }
    }
  } catch (e) { ko('Discovery endpoint reachable', e.message); }
}

async function testLevel0() {
  section('PCP LEVEL 0 — Required: brief + rules');

  // Brief
  try {
    const r = await fetch('/api/pcp/brief');
    r.status === 200 ? ok('GET /brief returns 200') : ko('GET /brief returns 200', `got ${r.status}`);
    if (!r.json) { ko('/brief returns valid JSON'); return; }
    ok('/brief returns valid JSON');

    const d = r.json;
    // _pcp metadata
    if (d._pcp) {
      ok('Has _pcp metadata wrapper');
      d._pcp.version ? ok('_pcp has version', d._pcp.version) : ko('_pcp has version');
      d._pcp.endpoint ? ok('_pcp has endpoint name', d._pcp.endpoint) : ko('_pcp has endpoint name');
      typeof d._pcp.tokens === 'number' ? ok('_pcp has token count', d._pcp.tokens) : ko('_pcp has token count');
      typeof d._pcp.generated_at === 'number' ? ok('_pcp has generated_at timestamp') : wn('_pcp has generated_at timestamp');
    } else { ko('Has _pcp metadata wrapper'); }

    // Required fields
    d.project?.name ? ok('Brief has project.name', d.project.name) : ko('Brief has project.name');
    d.project?.repo ? ok('Brief has project.repo') : wn('Brief has project.repo', 'recommended');
    d.stack ? ok('Brief has stack info') : wn('Brief has stack info');
    d.health && typeof d.health.score === 'number' ? ok('Brief has health.score', d.health.score) : ko('Brief has health.score');
    d.health?.grade ? ok('Brief has health.grade', d.health.grade) : ko('Brief has health.grade');
    Array.isArray(d.rules) && d.rules.length > 0 ? ok('Brief has rules array', `${d.rules.length} rules`) : ko('Brief has rules array');
    d.entry_points ? ok('Brief has entry_points') : wn('Brief has entry_points', 'recommended');

    // Token budget check
    if (d._pcp?.tokens && d._pcp.tokens <= 500) { ok('Brief fits within 500 tokens', d._pcp.tokens); }
    else if (d._pcp?.tokens) { wn('Brief fits within 500 tokens', `${d._pcp.tokens} tokens (spec says ~500)`); }

    // Response time
    r.ms < 100 ? ok('Brief responds <100ms', `${r.ms}ms`) : wn('Brief responds <100ms', `${r.ms}ms`);
  } catch (e) { ko('GET /brief reachable', e.message); }

  // Rules
  try {
    const r = await fetch('/api/pcp/rules');
    r.status === 200 ? ok('GET /rules returns 200') : ko('GET /rules returns 200', `got ${r.status}`);
    if (!r.json) { ko('/rules returns valid JSON'); return; }
    ok('/rules returns valid JSON');

    const d = r.json;
    d._pcp ? ok('/rules has _pcp metadata') : ko('/rules has _pcp metadata');
    d.categories && typeof d.categories === 'object' ? ok('/rules has categories object') : ko('/rules has categories object');
    d.priority ? ok('/rules has priority note') : wn('/rules has priority note');

    // Validate rule structure
    if (d.categories) {
      const cats = Object.keys(d.categories);
      ok(`/rules has ${cats.length} categories`, cats.join(', '));
      const firstCat = d.categories[cats[0]];
      if (Array.isArray(firstCat) && firstCat[0]) {
        const rule = firstCat[0];
        rule.id ? ok('Rules have id field', rule.id) : ko('Rules have id field');
        rule.rule ? ok('Rules have rule description') : ko('Rules have rule description');
        rule.severity ? ok('Rules have severity', rule.severity) : wn('Rules have severity');
      }
    }
  } catch (e) { ko('GET /rules reachable', e.message); }
}

async function testLevel1() {
  section('PCP LEVEL 1 — Core: context + health + files');

  // Context
  try {
    const r = await fetch('/api/pcp/context');
    r.status === 200 ? ok('GET /context returns 200') : ko('GET /context returns 200', `got ${r.status}`);
    if (!r.json) { ko('/context returns valid JSON'); return; }

    const d = r.json;
    d._pcp ? ok('/context has _pcp metadata') : ko('/context has _pcp metadata');
    d.identity?.name ? ok('/context has identity.name', d.identity.name) : ko('/context has identity.name');
    d.identity?.repo ? ok('/context has identity.repo') : wn('/context has identity.repo');
    d.stack ? ok('/context has stack') : wn('/context has stack');
    d.architecture ? ok('/context has architecture') : wn('/context has architecture');
    d.health && typeof d.health.score === 'number' ? ok('/context has health.score') : wn('/context has health.score');
    d.conventions ? ok('/context has conventions') : wn('/context has conventions');
    d.owner ? ok('/context has owner preferences') : wn('/context has owner preferences');
  } catch (e) { ko('GET /context reachable', e.message); }

  // Health
  try {
    const r = await fetch('/api/pcp/health');
    r.status === 200 ? ok('GET /health returns 200') : ko('GET /health returns 200', `got ${r.status}`);
    if (!r.json) return;

    const d = r.json;
    d._pcp ? ok('/health has _pcp metadata') : ko('/health has _pcp metadata');
    typeof d.score === 'number' ? ok('/health has numeric score', d.score) : ko('/health has numeric score');
    d.grade ? ok('/health has grade', d.grade) : ko('/health has grade');
    d.modules && typeof d.modules === 'object' ? ok('/health has modules object', `${Object.keys(d.modules).length} modules`) : ko('/health has modules object');
    d.actions ? ok('/health has actions (commands to fix)') : wn('/health has actions');

    // Validate module structure
    if (d.modules) {
      const first = Object.values(d.modules)[0];
      if (first) {
        typeof first.score === 'number' ? ok('Module has score') : ko('Module has score');
        first.grade ? ok('Module has grade') : ko('Module has grade');
        typeof first.issues === 'number' ? ok('Module has issue count') : wn('Module has issue count');
      }
    }
  } catch (e) { ko('GET /health reachable', e.message); }

  // Files
  try {
    const r = await fetch('/api/pcp/files');
    r.status === 200 ? ok('GET /files returns 200') : ko('GET /files returns 200', `got ${r.status}`);
    if (!r.json) return;

    const d = r.json;
    d._pcp ? ok('/files has _pcp metadata') : ko('/files has _pcp metadata');
    d.structure && typeof d.structure === 'object' ? ok('/files has structure object', `${Object.keys(d.structure).length} entries`) : ko('/files has structure object');
    d.stats ? ok('/files has stats') : wn('/files has stats');
  } catch (e) { ko('GET /files reachable', e.message); }
}

async function testLevel2() {
  section('PCP LEVEL 2 — Memory: tasks, memory, onboard, status, pulse');

  // Tasks GET
  try {
    const r = await fetch('/api/pcp/tasks');
    r.status === 200 ? ok('GET /tasks returns 200') : ko('GET /tasks returns 200', `got ${r.status}`);
    if (!r.json) return;

    const d = r.json;
    d._pcp ? ok('/tasks has _pcp metadata') : ko('/tasks has _pcp metadata');
    d.summary ? ok('/tasks has summary') : ko('/tasks has summary');
    if (d.summary) {
      typeof d.summary.pending === 'number' ? ok('/tasks summary has pending count') : ko('/tasks summary has pending count');
    }
    Array.isArray(d.pending) ? ok('/tasks has pending array') : ko('/tasks has pending array');
    Array.isArray(d.suggestions) ? ok('/tasks has suggestions array') : wn('/tasks has suggestions');
  } catch (e) { ko('GET /tasks reachable', e.message); }

  // Tasks POST (write requires KV, test graceful degradation)
  try {
    const r = await fetch('/api/pcp/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'add', desc: 'PCP validator test task', priority: 'low', source: 'pcp-validator' } });
    if (r.status === 200) { ok('POST /tasks succeeds (KV available)'); }
    else if (r.status === 503) { ok('POST /tasks gracefully degrades without KV', '503 — expected without binding'); }
    else { wn('POST /tasks returns unexpected status', `${r.status}`); }
  } catch (e) { wn('POST /tasks reachable', e.message); }

  // Memory GET
  try {
    const r = await fetch('/api/pcp/memory');
    r.status === 200 ? ok('GET /memory returns 200') : ko('GET /memory returns 200', `got ${r.status}`);
    if (!r.json) return;

    const d = r.json;
    d._pcp ? ok('/memory has _pcp metadata') : ko('/memory has _pcp metadata');
    d.stats ? ok('/memory has stats') : ko('/memory has stats');
    Array.isArray(d.learnings) ? ok('/memory has learnings array') : ko('/memory has learnings array');
    Array.isArray(d.decisions) ? ok('/memory has decisions array') : ko('/memory has decisions array');
    Array.isArray(d.blockers) ? ok('/memory has blockers array') : ko('/memory has blockers array');
  } catch (e) { ko('GET /memory reachable', e.message); }

  // Onboard POST
  try {
    const r = await fetch('/api/pcp/onboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { agent: 'pcp-validator', goals: ['validate PCP compliance'] } });
    r.status === 200 ? ok('POST /onboard returns 200') : ko('POST /onboard returns 200', `got ${r.status}`);
    if (!r.json) return;

    const d = r.json;
    d._pcp ? ok('/onboard has _pcp metadata') : ko('/onboard has _pcp metadata');
    d.session?.id ? ok('/onboard creates session', d.session.id) : ko('/onboard creates session');
    d.project ? ok('/onboard includes project info') : ko('/onboard includes project info');
    d.rules ? ok('/onboard includes rules') : wn('/onboard includes rules');
    d.tools ? ok('/onboard includes tools') : wn('/onboard includes tools');
    d.endpoints ? ok('/onboard includes endpoints') : wn('/onboard includes endpoints');
    d.welcome ? ok('/onboard has welcome message') : wn('/onboard has welcome message');
  } catch (e) { ko('POST /onboard reachable', e.message); }

  // Status
  try {
    const r = await fetch('/api/pcp/status');
    r.status === 200 ? ok('GET /status returns 200') : ko('GET /status returns 200', `got ${r.status}`);
    if (!r.json) return;

    const d = r.json;
    d._pcp ? ok('/status has _pcp metadata') : ko('/status has _pcp metadata');
    d.agent ? ok('/status has agent name', d.agent) : ko('/status has agent name');
    d.version ? ok('/status has version', d.version) : ko('/status has version');
    d.pcp_version ? ok('/status has pcp_version', d.pcp_version) : ko('/status has pcp_version');
    typeof d.pcp_level === 'number' ? ok('/status declares pcp_level', `Level ${d.pcp_level}`) : wn('/status declares pcp_level');
    d.status ? ok('/status has status field', d.status) : ko('/status has status field');
    d.health ? ok('/status has health') : ko('/status has health');
  } catch (e) { ko('GET /status reachable', e.message); }

  // Pulse
  try {
    const r = await fetch('/api/pcp/pulse');
    r.status === 200 ? ok('GET /pulse returns 200') : ko('GET /pulse returns 200', `got ${r.status}`);
    if (!r.json) return;

    const d = r.json;
    d.status ? ok('/pulse has status', d.status) : ko('/pulse has status');
    typeof d.score === 'number' ? ok('/pulse has score', d.score) : ko('/pulse has score');
    typeof d.ts === 'number' ? ok('/pulse has timestamp') : wn('/pulse has timestamp');
    // Pulse should be tiny
    const size = r.raw.length;
    size < 200 ? ok('/pulse response is <200 bytes', `${size}B`) : wn('/pulse response is <200 bytes', `${size}B`);
    r.ms < 50 ? ok('/pulse responds <50ms', `${r.ms}ms`) : wn('/pulse responds <50ms', `${r.ms}ms`);
  } catch (e) { ko('GET /pulse reachable', e.message); }

  // Log
  try {
    const r = await fetch('/api/pcp/log?limit=10');
    r.status === 200 ? ok('GET /log returns 200') : ko('GET /log returns 200', `got ${r.status}`);
    if (r.json) {
      r.json._pcp ? ok('/log has _pcp metadata') : ko('/log has _pcp metadata');
      Array.isArray(r.json.entries) ? ok('/log has entries array') : ko('/log has entries array');
      typeof r.json.total === 'number' ? ok('/log has total count') : wn('/log has total count');
    }
  } catch (e) { ko('GET /log reachable', e.message); }

  // Alerts
  try {
    const r = await fetch('/api/pcp/alerts');
    r.status === 200 ? ok('GET /alerts returns 200') : ko('GET /alerts returns 200', `got ${r.status}`);
    if (r.json) {
      r.json._pcp ? ok('/alerts has _pcp metadata') : ko('/alerts has _pcp metadata');
      Array.isArray(r.json.unacknowledged) ? ok('/alerts has unacknowledged array') : ko('/alerts has unacknowledged array');
    }
  } catch (e) { ko('GET /alerts reachable', e.message); }
}

async function testLevel3() {
  section('PCP LEVEL 3 — Actions: commands, webhooks, notify');

  // Actions (no command = list)
  try {
    const r = await fetch('/api/pcp/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: {} });
    r.status === 200 ? ok('POST /actions (no cmd) returns 200') : ko('POST /actions (no cmd) returns 200', `got ${r.status}`);
    if (!r.json) return;

    const d = r.json;
    Array.isArray(d.available) ? ok('/actions lists available commands', `${d.available.length} commands`) : ko('/actions lists available commands');
    if (d.available?.[0]) {
      const cmd = d.available[0];
      cmd.name ? ok('Command has name', cmd.name) : ko('Command has name');
      cmd.description ? ok('Command has description') : ko('Command has description');
      cmd.command ? ok('Command has shell command') : ko('Command has shell command');
    }
  } catch (e) { ko('POST /actions reachable', e.message); }

  // Actions (unknown command)
  try {
    const r = await fetch('/api/pcp/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { command: 'nonexistent.cmd' } });
    r.status === 400 ? ok('Unknown command returns 400') : wn('Unknown command returns 400', `got ${r.status}`);
  } catch (e) { wn('Unknown command test', e.message); }

  // Webhooks
  try {
    const r = await fetch('/api/pcp/webhooks/github', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'push' }, body: { ref: 'refs/heads/test', commits: [], pusher: { name: 'pcp-validator' } } });
    r.status === 200 ? ok('POST /webhooks/github processes push event') : wn('POST /webhooks/github', `got ${r.status}`);
  } catch (e) { wn('POST /webhooks/github', e.message); }

  // Notify
  try {
    const r = await fetch('/api/pcp/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { channel: 'internal', message: 'PCP validator test', level: 'info' } });
    r.status === 200 ? ok('POST /notify returns 200') : wn('POST /notify', `got ${r.status}`);
  } catch (e) { wn('POST /notify', e.message); }

  // Diff
  try {
    const r = await fetch('/api/pcp/diff');
    r.status === 200 ? ok('GET /diff returns 200') : wn('GET /diff', `got ${r.status}`);
    if (r.json?._pcp) ok('/diff has _pcp metadata');
  } catch (e) { wn('GET /diff', e.message); }
}

async function testBackwardCompat() {
  section('BACKWARD COMPATIBILITY — /api/agent/* legacy routes');

  const legacyEndpoints = [
    { path: '/api/agent/brief', method: 'GET', name: 'Legacy brief' },
    { path: '/api/agent/context', method: 'GET', name: 'Legacy context' },
    { path: '/api/agent/health', method: 'GET', name: 'Legacy health' },
    { path: '/api/agent/rules', method: 'GET', name: 'Legacy rules' },
    { path: '/api/agent/memory', method: 'GET', name: 'Legacy memory' },
    { path: '/api/agent/status', method: 'GET', name: 'Legacy status' },
    { path: '/api/agent/pulse', method: 'GET', name: 'Legacy pulse' },
  ];

  for (const ep of legacyEndpoints) {
    try {
      const r = await fetch(ep.path);
      if (r.status === 200) { ok(`${ep.name} (${ep.path}) returns 200`); }
      else if (r.status === 301 || r.status === 302) { ok(`${ep.name} (${ep.path}) redirects`, `${r.status} -> ${r.location}`); }
      else { ko(`${ep.name} (${ep.path})`, `got ${r.status}`); }
    } catch (e) { ko(`${ep.name} reachable`, e.message); }
  }
}

async function testTokenBudgets() {
  section('TOKEN BUDGET VERIFICATION');

  const endpoints = [
    { path: '/api/pcp/brief', maxTokens: 500, name: 'Brief' },
    { path: '/api/pcp/pulse', maxTokens: 100, name: 'Pulse' },
  ];

  for (const ep of endpoints) {
    try {
      const r = await fetch(ep.path);
      if (!r.json) continue;
      const actualTokens = r.json._pcp?.tokens || Math.ceil(r.raw.length / 4);
      if (actualTokens <= ep.maxTokens) {
        ok(`${ep.name} within token budget`, `${actualTokens}/${ep.maxTokens}`);
      } else {
        wn(`${ep.name} exceeds token budget`, `${actualTokens}/${ep.maxTokens}`);
      }
    } catch {}
  }
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  if (!JSON_OUTPUT) {
    console.log(`\n${C.b}${C.c}╔══════════════════════════════════════════════════╗${C.x}`);
    console.log(`${C.b}${C.c}║     PCP Compliance Validator v1.0                ║${C.x}`);
    console.log(`${C.b}${C.c}║     Project Context Protocol Spec v0.1           ║${C.x}`);
    console.log(`${C.b}${C.c}╚══════════════════════════════════════════════════╝${C.x}`);
    console.log(`${C.d}  Target: ${HOST}${C.x}\n`);
  }

  // Connectivity check
  try {
    await fetch('/api/pcp/pulse');
  } catch {
    if (!JSON_OUTPUT) console.log(`${C.r}ERROR: Cannot reach ${HOST}/api/pcp/pulse. Is the server running?${C.x}`);
    process.exit(1);
  }

  await testDiscovery();
  await testLevel0();
  await testLevel1();
  await testLevel2();
  await testLevel3();
  await testBackwardCompat();
  await testTokenBudgets();

  // Determine compliance level
  let level = -1;
  const l0Fails = results.filter(r => r.status === 'fail' && (r.test.includes('/brief') || r.test.includes('/rules') || r.test.includes('Discovery')));
  const l1Fails = results.filter(r => r.status === 'fail' && (r.test.includes('/context') || r.test.includes('/health') || r.test.includes('/files')));
  const l2Fails = results.filter(r => r.status === 'fail' && (r.test.includes('/tasks') || r.test.includes('/memory') || r.test.includes('/onboard') || r.test.includes('/status') || r.test.includes('/pulse')));
  const l3Fails = results.filter(r => r.status === 'fail' && (r.test.includes('/actions') || r.test.includes('/webhooks') || r.test.includes('/notify')));

  if (l0Fails.length === 0) level = 0;
  if (level === 0 && l1Fails.length === 0) level = 1;
  if (level === 1 && l2Fails.length === 0) level = 2;
  if (level === 2 && l3Fails.length === 0) level = 3;

  const levelLabel = level >= 0 ? `Level ${level}` : 'Non-compliant';
  const gradeMap = { 3: 'A', 2: 'B', 1: 'C', 0: 'D', '-1': 'F' };
  const grade = gradeMap[level] || 'F';

  if (JSON_OUTPUT) {
    console.log(JSON.stringify({
      pcp_version: '0.1', target: HOST,
      compliance_level: level, grade,
      summary: { total, pass, fail, warn },
      results, failures
    }, null, 2));
  } else {
    console.log(`\n${C.b}${C.c}━━━ RESULTS ━━━${C.x}`);
    console.log(`  Total:  ${total}`);
    console.log(`  ${C.g}Pass:   ${pass}${C.x}`);
    console.log(`  ${C.r}Fail:   ${fail}${C.x}`);
    console.log(`  ${C.y}Warn:   ${warn}${C.x}`);
    console.log(`\n  ${C.b}PCP Compliance Level: ${levelLabel}${C.x}`);
    console.log(`  ${C.b}Grade: ${grade}${C.x}`);
    if (failures.length > 0) {
      console.log(`\n  ${C.r}Failures:${C.x}`);
      failures.forEach(f => console.log(`    ${C.r}• ${f}${C.x}`));
    }
    console.log('');
  }

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
