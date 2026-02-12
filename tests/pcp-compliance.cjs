#!/usr/bin/env node
/**
 * PCP Compliance Checker v1.0
 * 
 * Validates a running server against the Project Context Protocol (PCP) spec v0.1.
 * Tests all four compliance levels:
 *   Level 0: Discovery + brief + rules
 *   Level 1: context + health + files
 *   Level 2: tasks + memory + onboard + status + pulse
 *   Level 3: actions + webhooks + notify + auth
 * 
 * Usage:
 *   node tests/pcp-compliance.cjs                  # Test localhost:8788
 *   node tests/pcp-compliance.cjs http://host:port # Test custom URL
 *   PCP_BASE=http://host:port node tests/pcp-compliance.cjs
 */

const http = require('http');
const https = require('https');

const BASE = process.argv[2] || process.env.PCP_BASE || `http://localhost:${process.env.TEST_PORT || 8788}`;
const COLORS = { pass: '\x1b[32m', fail: '\x1b[31m', warn: '\x1b[33m', dim: '\x1b[90m', bold: '\x1b[1m', reset: '\x1b[0m', cyan: '\x1b[36m' };
const results = { passed: 0, failed: 0, warned: 0, skipped: 0, levels: {} };

function log(icon, msg) { console.log(`  ${icon} ${msg}`); }
function pass(msg) { results.passed++; log(`${COLORS.pass}PASS${COLORS.reset}`, msg); }
function fail(msg) { results.failed++; log(`${COLORS.fail}FAIL${COLORS.reset}`, msg); }
function warn(msg) { results.warned++; log(`${COLORS.warn}WARN${COLORS.reset}`, msg); }
function skip(msg) { results.skipped++; log(`${COLORS.dim}SKIP${COLORS.reset}`, msg); }
function section(title) { console.log(`\n${COLORS.bold}${COLORS.cyan}── ${title} ──${COLORS.reset}`); }

async function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const method = opts.method || 'GET';
    const parsedUrl = new URL(url);
    const reqOpts = {
      hostname: parsedUrl.hostname, port: parsedUrl.port, path: parsedUrl.pathname + parsedUrl.search,
      method, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      timeout: 5000
    };
    const req = mod.request(reqOpts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, json: JSON.parse(body), body }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, json: null, body }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (opts.body) req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    req.end();
  });
}

function hasPcpMeta(json, endpoint) {
  if (!json?._pcp) { fail(`${endpoint}: Missing _pcp metadata wrapper`); return false; }
  if (!json._pcp.version) { fail(`${endpoint}: _pcp.version missing`); return false; }
  if (typeof json._pcp.tokens !== 'number') { fail(`${endpoint}: _pcp.tokens not a number`); return false; }
  if (!json._pcp.endpoint) { warn(`${endpoint}: _pcp.endpoint missing (recommended)`); return true; }
  pass(`${endpoint}: _pcp metadata valid (v${json._pcp.version}, ~${json._pcp.tokens} tokens)`);
  return true;
}

// ═══════════════════════════════════════════════════════════════
// LEVEL 0 — Required: Discovery + brief + rules
// ═══════════════════════════════════════════════════════════════

async function testLevel0() {
  section('PCP LEVEL 0 — Required (discovery + brief + rules)');
  let level0Pass = true;

  // Discovery: /.well-known/pcp.json
  try {
    const r = await fetch(`${BASE}/.well-known/pcp.json`);
    if (r.status !== 200) { fail(`Discovery: status ${r.status} (expected 200)`); level0Pass = false; }
    else if (!r.json) { fail('Discovery: not valid JSON'); level0Pass = false; }
    else {
      const d = r.json;
      if (!d.pcp_version) { fail('Discovery: pcp_version missing'); level0Pass = false; }
      else pass(`Discovery: pcp_version ${d.pcp_version}`);
      if (!d.project) { fail('Discovery: project name missing'); level0Pass = false; }
      else pass(`Discovery: project "${d.project}"`);
      if (!d.base_url) warn('Discovery: base_url missing (recommended)');
      else pass(`Discovery: base_url ${d.base_url}`);
      if (!d.endpoints) { fail('Discovery: endpoints missing'); level0Pass = false; }
      else {
        const required = ['brief', 'rules'];
        required.forEach(ep => {
          if (!d.endpoints[ep]) { fail(`Discovery: endpoints.${ep} missing (required for L0)`); level0Pass = false; }
          else pass(`Discovery: endpoints.${ep} = ${d.endpoints[ep]}`);
        });
      }
      if (d.token_budgets) pass(`Discovery: token_budgets declared (${Object.keys(d.token_budgets).length} endpoints)`);
      else warn('Discovery: token_budgets missing (recommended)');
      if (d.compliance_level != null) pass(`Discovery: compliance_level = ${d.compliance_level}`);
      else warn('Discovery: compliance_level not declared');
    }
  } catch (e) { fail(`Discovery: ${e.message}`); level0Pass = false; }

  // Brief: GET /api/pcp/brief
  try {
    const r = await fetch(`${BASE}/api/pcp/brief`);
    if (r.status !== 200) { fail(`Brief: status ${r.status}`); level0Pass = false; }
    else if (!r.json) { fail('Brief: not valid JSON'); level0Pass = false; }
    else {
      hasPcpMeta(r.json, 'Brief');
      if (!r.json.project?.name) { fail('Brief: project.name missing'); level0Pass = false; }
      else pass(`Brief: project.name = "${r.json.project.name}"`);
      if (!r.json.stack) warn('Brief: stack object missing (recommended)');
      else pass(`Brief: stack present (${r.json.stack.runtime || 'unknown runtime'})`);
      if (!r.json.health) { fail('Brief: health object missing'); level0Pass = false; }
      else {
        if (typeof r.json.health.score !== 'number') fail('Brief: health.score not a number');
        else pass(`Brief: health.score = ${r.json.health.score}`);
        if (!r.json.health.grade) warn('Brief: health.grade missing');
        else pass(`Brief: health.grade = ${r.json.health.grade}`);
      }
      if (!r.json.rules || !Array.isArray(r.json.rules)) warn('Brief: rules array missing (recommended)');
      else pass(`Brief: ${r.json.rules.length} rules`);
      if (!r.json.entry_points) warn('Brief: entry_points missing (recommended)');
      else pass(`Brief: entry_points present`);
      // Token budget check
      if (r.json._pcp?.tokens > 500) warn(`Brief: ${r.json._pcp.tokens} tokens exceeds 500 budget`);
      else if (r.json._pcp?.tokens) pass(`Brief: within 500-token budget (${r.json._pcp.tokens})`);
    }
  } catch (e) { fail(`Brief: ${e.message}`); level0Pass = false; }

  // Rules: GET /api/pcp/rules
  try {
    const r = await fetch(`${BASE}/api/pcp/rules`);
    if (r.status !== 200) { fail(`Rules: status ${r.status}`); level0Pass = false; }
    else if (!r.json) { fail('Rules: not valid JSON'); level0Pass = false; }
    else {
      hasPcpMeta(r.json, 'Rules');
      if (!r.json.categories || typeof r.json.categories !== 'object') { fail('Rules: categories object missing'); level0Pass = false; }
      else {
        const cats = Object.keys(r.json.categories);
        pass(`Rules: ${cats.length} categories (${cats.join(', ')})`);
        let totalRules = 0;
        cats.forEach(cat => {
          const rules = r.json.categories[cat];
          if (!Array.isArray(rules)) { warn(`Rules: categories.${cat} is not an array`); return; }
          rules.forEach(rule => {
            totalRules++;
            if (!rule.id) warn(`Rules: rule in ${cat} missing id`);
            if (!rule.rule && !rule.description) warn(`Rules: ${rule.id || 'unknown'} missing rule text`);
            if (!rule.severity) warn(`Rules: ${rule.id || 'unknown'} missing severity`);
          });
        });
        pass(`Rules: ${totalRules} total rules validated`);
      }
    }
  } catch (e) { fail(`Rules: ${e.message}`); level0Pass = false; }

  results.levels[0] = level0Pass;
  return level0Pass;
}

// ═══════════════════════════════════════════════════════════════
// LEVEL 1 — Core: context + health + files
// ═══════════════════════════════════════════════════════════════

async function testLevel1() {
  section('PCP LEVEL 1 — Core (context + health + files)');
  let level1Pass = true;

  // Context
  try {
    const r = await fetch(`${BASE}/api/pcp/context`);
    if (r.status !== 200) { fail(`Context: status ${r.status}`); level1Pass = false; }
    else {
      hasPcpMeta(r.json, 'Context');
      if (!r.json.identity) { fail('Context: identity object missing'); level1Pass = false; }
      else pass(`Context: identity present (${r.json.identity.name || 'unnamed'})`);
      if (!r.json.stack) warn('Context: stack missing');
      else pass(`Context: stack present`);
      if (!r.json.architecture) warn('Context: architecture missing');
      else pass(`Context: architecture present`);
      if (!r.json.health) warn('Context: health missing');
      else pass(`Context: health present (${r.json.health.score}/${r.json.health.grade})`);
      if (r.json._pcp?.tokens > 4000) warn(`Context: ${r.json._pcp.tokens} tokens exceeds 4000 budget`);
      else if (r.json._pcp?.tokens) pass(`Context: within 4000-token budget (${r.json._pcp.tokens})`);
    }
  } catch (e) { fail(`Context: ${e.message}`); level1Pass = false; }

  // Health
  try {
    const r = await fetch(`${BASE}/api/pcp/health`);
    if (r.status !== 200) { fail(`Health: status ${r.status}`); level1Pass = false; }
    else {
      hasPcpMeta(r.json, 'Health');
      if (typeof r.json.score !== 'number') { fail('Health: score not a number'); level1Pass = false; }
      else pass(`Health: score = ${r.json.score}`);
      if (!r.json.grade) warn('Health: grade missing');
      else pass(`Health: grade = ${r.json.grade}`);
      if (!r.json.modules || typeof r.json.modules !== 'object') warn('Health: modules missing');
      else {
        const mods = Object.keys(r.json.modules);
        pass(`Health: ${mods.length} modules`);
        mods.forEach(m => {
          const mod = r.json.modules[m];
          if (typeof mod.score !== 'number') warn(`Health: ${m}.score not a number`);
          if (mod.top_issues && !Array.isArray(mod.top_issues)) warn(`Health: ${m}.top_issues not an array`);
        });
      }
      if (r.json.actions) pass(`Health: actions object present`);
      else warn('Health: actions missing (recommended)');
    }
  } catch (e) { fail(`Health: ${e.message}`); level1Pass = false; }

  // Files
  try {
    const r = await fetch(`${BASE}/api/pcp/files`);
    if (r.status !== 200) { fail(`Files: status ${r.status}`); level1Pass = false; }
    else {
      hasPcpMeta(r.json, 'Files');
      if (!r.json.structure || typeof r.json.structure !== 'object') { fail('Files: structure missing'); level1Pass = false; }
      else {
        const entries = Object.keys(r.json.structure);
        pass(`Files: ${entries.length} file entries`);
        entries.forEach(path => {
          const f = r.json.structure[path];
          if (!f.description) warn(`Files: ${path} missing description`);
        });
      }
      if (r.json.stats) pass(`Files: stats present (${r.json.stats.total_files || '?'} files)`);
      else warn('Files: stats missing (recommended)');
    }
  } catch (e) { fail(`Files: ${e.message}`); level1Pass = false; }

  results.levels[1] = level1Pass;
  return level1Pass;
}

// ═══════════════════════════════════════════════════════════════
// LEVEL 2 — Memory: tasks, memory, onboard, status, pulse
// ═══════════════════════════════════════════════════════════════

async function testLevel2() {
  section('PCP LEVEL 2 — Memory (tasks + memory + onboard + status + pulse)');
  let level2Pass = true;

  // Tasks (GET)
  try {
    const r = await fetch(`${BASE}/api/pcp/tasks`);
    if (r.status !== 200) { fail(`Tasks GET: status ${r.status}`); level2Pass = false; }
    else {
      hasPcpMeta(r.json, 'Tasks');
      if (!r.json.summary) { fail('Tasks: summary missing'); level2Pass = false; }
      else pass(`Tasks: summary present (pending: ${r.json.summary.pending})`);
      if (!Array.isArray(r.json.pending)) warn('Tasks: pending not an array');
      if (!('in_progress' in r.json)) warn('Tasks: in_progress field missing');
      else pass('Tasks: in_progress field present');
    }
  } catch (e) { fail(`Tasks: ${e.message}`); level2Pass = false; }

  // Memory (GET)
  try {
    const r = await fetch(`${BASE}/api/pcp/memory`);
    if (r.status !== 200) { fail(`Memory GET: status ${r.status}`); level2Pass = false; }
    else {
      hasPcpMeta(r.json, 'Memory');
      if (!r.json.stats) { fail('Memory: stats missing'); level2Pass = false; }
      else {
        pass(`Memory: stats present`);
        if (!('total_learnings' in r.json.stats)) warn('Memory: stats.total_learnings missing');
        if (!('total_decisions' in r.json.stats)) warn('Memory: stats.total_decisions missing');
      }
      if (!Array.isArray(r.json.learnings)) warn('Memory: learnings not an array');
      if (!Array.isArray(r.json.decisions)) warn('Memory: decisions not an array');
    }
  } catch (e) { fail(`Memory: ${e.message}`); level2Pass = false; }

  // Onboard (POST)
  try {
    const r = await fetch(`${BASE}/api/pcp/onboard`, { method: 'POST', body: { agent: 'pcp-checker', goals: ['validate PCP compliance'] } });
    if (r.status !== 200) { fail(`Onboard: status ${r.status}`); level2Pass = false; }
    else {
      hasPcpMeta(r.json, 'Onboard');
      if (!r.json.session?.id) { fail('Onboard: session.id missing'); level2Pass = false; }
      else pass(`Onboard: session ${r.json.session.id}`);
      if (!r.json.project) warn('Onboard: project missing');
      else pass(`Onboard: project present`);
      if (!r.json.rules) warn('Onboard: rules missing');
      else pass(`Onboard: ${Array.isArray(r.json.rules) ? r.json.rules.length : 0} rules`);
      if (!r.json.tools) warn('Onboard: tools missing');
      else pass(`Onboard: tools present`);
      if (!r.json.endpoints) warn('Onboard: endpoints missing');
      else pass(`Onboard: endpoints present`);
      if (r.json._pcp?.tokens > 8000) warn(`Onboard: ${r.json._pcp.tokens} tokens exceeds 8000 budget`);
      else if (r.json._pcp?.tokens) pass(`Onboard: within 8000-token budget (${r.json._pcp.tokens})`);
    }
  } catch (e) { fail(`Onboard: ${e.message}`); level2Pass = false; }

  // Status
  try {
    const r = await fetch(`${BASE}/api/pcp/status`);
    if (r.status !== 200) { fail(`Status: status ${r.status}`); level2Pass = false; }
    else {
      hasPcpMeta(r.json, 'Status');
      if (!r.json.agent) warn('Status: agent name missing');
      else pass(`Status: agent = ${r.json.agent}`);
      if (!r.json.version) warn('Status: version missing');
      else pass(`Status: version = ${r.json.version}`);
      if (!r.json.health) { fail('Status: health missing'); level2Pass = false; }
      else pass(`Status: health ${r.json.health.score}/${r.json.health.grade}`);
      if (!r.json.status) warn('Status: status field missing');
      else pass(`Status: status = ${r.json.status}`);
      if (r.json.pcp_version) pass(`Status: pcp_version = ${r.json.pcp_version}`);
      if (r.json.pcp_level != null) pass(`Status: pcp_level = ${r.json.pcp_level}`);
    }
  } catch (e) { fail(`Status: ${e.message}`); level2Pass = false; }

  // Pulse
  try {
    const r = await fetch(`${BASE}/api/pcp/pulse`);
    if (r.status !== 200) { fail(`Pulse: status ${r.status}`); level2Pass = false; }
    else {
      if (!r.json) { fail('Pulse: not valid JSON'); level2Pass = false; }
      else {
        if (!r.json.status) { fail('Pulse: status field missing'); level2Pass = false; }
        else pass(`Pulse: status = ${r.json.status}`);
        if (typeof r.json.score !== 'number') warn('Pulse: score not a number');
        else pass(`Pulse: score = ${r.json.score}`);
        const bytes = r.body.length;
        if (bytes > 200) warn(`Pulse: ${bytes} bytes exceeds 200-byte target`);
        else pass(`Pulse: ${bytes} bytes (under 200-byte target)`);
      }
    }
  } catch (e) { fail(`Pulse: ${e.message}`); level2Pass = false; }

  results.levels[2] = level2Pass;
  return level2Pass;
}

// ═══════════════════════════════════════════════════════════════
// LEVEL 3 — Actions: commands, webhooks, notifications
// ═══════════════════════════════════════════════════════════════

async function testLevel3() {
  section('PCP LEVEL 3 — Actions (commands + webhooks + notify)');
  let level3Pass = true;

  // Actions (POST — list commands)
  try {
    const r = await fetch(`${BASE}/api/pcp/actions`, { method: 'POST', body: {} });
    if (r.status !== 200) { fail(`Actions (list): status ${r.status}`); level3Pass = false; }
    else {
      if (!r.json.available || !Array.isArray(r.json.available)) { fail('Actions: available array missing'); level3Pass = false; }
      else {
        pass(`Actions: ${r.json.available.length} commands available`);
        r.json.available.forEach(cmd => {
          if (!cmd.name) warn(`Actions: command missing name`);
          if (!cmd.description && !cmd.desc) warn(`Actions: ${cmd.name} missing description`);
          if (!cmd.command && !cmd.run) warn(`Actions: ${cmd.name} missing command/run string`);
        });
      }
    }
  } catch (e) { fail(`Actions: ${e.message}`); level3Pass = false; }

  // Actions (POST — unknown command)
  try {
    const r = await fetch(`${BASE}/api/pcp/actions`, { method: 'POST', body: { command: '__nonexistent_test_cmd__' } });
    if (r.status === 400) pass('Actions (unknown cmd): returns 400');
    else warn(`Actions (unknown cmd): expected 400, got ${r.status}`);
  } catch (e) { warn(`Actions (unknown cmd): ${e.message}`); }

  // Actions (POST — known command)
  try {
    const r = await fetch(`${BASE}/api/pcp/actions`, { method: 'POST', body: { command: 'health.check' } });
    if (r.status !== 200) { fail(`Actions (health.check): status ${r.status}`); level3Pass = false; }
    else {
      if (r.json.ok !== true) warn('Actions (health.check): ok !== true');
      else pass('Actions (health.check): ok = true');
    }
  } catch (e) { fail(`Actions (health.check): ${e.message}`); level3Pass = false; }

  // Webhooks/GitHub (POST — simulated push event)
  try {
    const r = await fetch(`${BASE}/api/pcp/webhooks/github`, {
      method: 'POST',
      headers: { 'x-github-event': 'push', 'Content-Type': 'application/json' },
      body: { ref: 'refs/heads/test', commits: [{ message: 'PCP compliance test' }], pusher: { name: 'pcp-checker' } }
    });
    if (r.status === 200) pass(`Webhooks: push event accepted (${r.status})`);
    else if (r.status === 401 || r.status === 403) pass(`Webhooks: auth required (${r.status}) — good security`);
    else { warn(`Webhooks: unexpected status ${r.status}`); }
  } catch (e) { warn(`Webhooks: ${e.message}`); }

  // Notify (POST)
  try {
    const r = await fetch(`${BASE}/api/pcp/notify`, {
      method: 'POST',
      body: { channel: 'internal', message: 'PCP compliance test notification', level: 'info' }
    });
    if (r.status === 200) pass(`Notify: accepted (${r.status})`);
    else if (r.status === 401 || r.status === 403) pass(`Notify: auth required — good security`);
    else if (r.status === 503) warn('Notify: KV not available (expected in dev)');
    else warn(`Notify: unexpected status ${r.status}`);
  } catch (e) { warn(`Notify: ${e.message}`); }

  // Auth check (WARN if no auth on write endpoints)
  try {
    const r = await fetch(`${BASE}/api/pcp/tasks`, { method: 'POST', body: { action: 'add', desc: 'test', priority: 'low' } });
    if (r.status === 200) warn('Auth: POST /tasks accepted without auth (L3 recommends auth on write endpoints)');
    else if (r.status === 401 || r.status === 403) pass('Auth: write endpoints require auth');
    else if (r.status === 503) pass('Auth: KV not available (expected in dev) — no data leak');
    else pass(`Auth: POST /tasks returned ${r.status}`);
  } catch (e) { warn(`Auth: ${e.message}`); }

  results.levels[3] = level3Pass;
  return level3Pass;
}

// ═══════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY
// ═══════════════════════════════════════════════════════════════

async function testLegacy() {
  section('LEGACY COMPATIBILITY (/api/agent/* aliases)');

  const legacyEndpoints = [
    { method: 'GET', path: '/api/agent/brief', name: 'brief' },
    { method: 'GET', path: '/api/agent/context', name: 'context' },
    { method: 'GET', path: '/api/agent/health', name: 'health' },
    { method: 'GET', path: '/api/agent/rules', name: 'rules' },
    { method: 'GET', path: '/api/agent/files', name: 'files' },
    { method: 'GET', path: '/api/agent/memory', name: 'memory' },
    { method: 'GET', path: '/api/agent/status', name: 'status' },
    { method: 'GET', path: '/api/agent/pulse', name: 'pulse' },
  ];

  for (const ep of legacyEndpoints) {
    try {
      const r = await fetch(`${BASE}${ep.path}`);
      if (r.status === 200) pass(`Legacy ${ep.name}: ${ep.path} → 200`);
      else if (r.status === 301 || r.status === 302) pass(`Legacy ${ep.name}: ${ep.path} → redirect (${r.status})`);
      else fail(`Legacy ${ep.name}: ${ep.path} → ${r.status}`);
    } catch (e) { fail(`Legacy ${ep.name}: ${e.message}`); }
  }
}

// ═══════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log(`${COLORS.bold}╔═══════════════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.bold}║  PCP Compliance Checker v1.0 — Spec v0.1         ║${COLORS.reset}`);
  console.log(`${COLORS.bold}╚═══════════════════════════════════════════════════╝${COLORS.reset}`);
  console.log(`${COLORS.dim}Target: ${BASE}${COLORS.reset}\n`);

  await testLevel0();
  await testLevel1();
  await testLevel2();
  await testLevel3();
  await testLegacy();

  // Summary
  section('COMPLIANCE REPORT');
  const maxLevel = Object.entries(results.levels).filter(([, v]) => v).map(([k]) => parseInt(k)).sort((a, b) => b - a)[0] ?? -1;
  console.log(`\n  ${COLORS.bold}Results:${COLORS.reset}`);
  console.log(`    ${COLORS.pass}${results.passed} passed${COLORS.reset}`);
  if (results.failed) console.log(`    ${COLORS.fail}${results.failed} failed${COLORS.reset}`);
  if (results.warned) console.log(`    ${COLORS.warn}${results.warned} warnings${COLORS.reset}`);
  if (results.skipped) console.log(`    ${COLORS.dim}${results.skipped} skipped${COLORS.reset}`);

  console.log(`\n  ${COLORS.bold}Compliance Levels:${COLORS.reset}`);
  for (let i = 0; i <= 3; i++) {
    const status = results.levels[i] === true ? `${COLORS.pass}PASS` : results.levels[i] === false ? `${COLORS.fail}FAIL` : `${COLORS.dim}NOT TESTED`;
    console.log(`    Level ${i}: ${status}${COLORS.reset}`);
  }

  const grade = maxLevel >= 3 ? 'A' : maxLevel >= 2 ? 'B' : maxLevel >= 1 ? 'C' : maxLevel >= 0 ? 'D' : 'F';
  const gradeColor = grade === 'A' ? COLORS.pass : grade === 'B' || grade === 'C' ? COLORS.warn : COLORS.fail;
  console.log(`\n  ${COLORS.bold}PCP Compliance Level: ${maxLevel >= 0 ? maxLevel : 'NONE'}${COLORS.reset}`);
  console.log(`  ${COLORS.bold}Grade: ${gradeColor}${grade}${COLORS.reset}`);
  console.log(`  ${COLORS.bold}Total: ${results.passed + results.failed + results.warned} checks${COLORS.reset}\n`);

  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
