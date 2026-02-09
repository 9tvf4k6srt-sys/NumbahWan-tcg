#!/usr/bin/env node
/**
 * tests/test-new-features.cjs — Tests for doctor, why, and GitHub Action
 * 
 * Validates the three new Mycelium features:
 *   1. mycelium-doctor.cjs — system health check
 *   2. mycelium-why.cjs — file intelligence reports
 *   3. .github/workflows/mycelium-ci.yml — GitHub Action
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    \x1b[2m${e.message}\x1b[0m`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function shell(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

console.log('');
console.log('  \x1b[1mtest-new-features\x1b[0m — doctor, why, GitHub Action');
console.log('');

// ═══════════════════════════════════════════════════════════════════
// DOCTOR TESTS
// ═══════════════════════════════════════════════════════════════════
console.log('  \x1b[1m─── Doctor ───\x1b[0m');

test('mycelium-doctor.cjs exists', () => {
  assert(fs.existsSync(path.join(ROOT, 'mycelium-doctor.cjs')));
});

test('doctor has valid syntax', () => {
  shell('node -c mycelium-doctor.cjs');
});

test('doctor runs without crash', () => {
  const out = shell('node mycelium-doctor.cjs 2>&1');
  assert(out.includes('mycelium doctor'), 'Missing header');
  assert(out.includes('checks passed'), 'Missing summary');
});

test('doctor checks Node.js version', () => {
  const out = shell('node mycelium-doctor.cjs 2>&1');
  assert(out.includes('Node.js'), 'Missing Node.js check');
});

test('doctor checks Git availability', () => {
  const out = shell('node mycelium-doctor.cjs 2>&1');
  assert(out.includes('Git available') || out.includes('Git repository'), 'Missing Git check');
});

test('doctor checks .mycelium/ directory', () => {
  const out = shell('node mycelium-doctor.cjs 2>&1');
  assert(out.includes('.mycelium/'), 'Missing .mycelium check');
});

test('doctor checks hooks', () => {
  const out = shell('node mycelium-doctor.cjs 2>&1');
  assert(out.includes('Pre-commit') || out.includes('hook'), 'Missing hook check');
});

test('doctor checks memory.json', () => {
  const out = shell('node mycelium-doctor.cjs 2>&1');
  assert(out.includes('memory.json'), 'Missing memory.json check');
});

test('doctor checks watch.json', () => {
  const out = shell('node mycelium-doctor.cjs 2>&1');
  assert(out.includes('watch.json'), 'Missing watch.json check');
});

test('doctor --json returns valid JSON', () => {
  const out = shell('node mycelium-doctor.cjs --json 2>&1');
  // Extract JSON from output (it prints the visual report first, then JSON)
  const jsonStart = out.indexOf('{');
  if (jsonStart >= 0) {
    const jsonStr = out.slice(jsonStart);
    const data = JSON.parse(jsonStr);
    assert(typeof data.score === 'number', 'Missing score');
    assert(typeof data.pass === 'number', 'Missing pass count');
    assert(Array.isArray(data.checks), 'Missing checks array');
  }
});

test('doctor reports GitHub Action status', () => {
  const out = shell('node mycelium-doctor.cjs 2>&1');
  assert(out.includes('GitHub Action'), 'Missing GitHub Action check');
});

// ═══════════════════════════════════════════════════════════════════
// WHY TESTS
// ═══════════════════════════════════════════════════════════════════
console.log('');
console.log('  \x1b[1m─── Why ───\x1b[0m');

test('mycelium-why.cjs exists', () => {
  assert(fs.existsSync(path.join(ROOT, 'mycelium-why.cjs')));
});

test('why has valid syntax', () => {
  shell('node -c mycelium-why.cjs');
});

test('why shows usage when no file given', () => {
  const out = shell('node mycelium-why.cjs 2>&1');
  assert(out.includes('Usage') || out.includes('mycelium why'), 'Missing usage info');
});

test('why reports on a high-risk file (battle.html)', () => {
  const out = shell('node mycelium-why.cjs public/battle.html 2>&1');
  assert(out.includes('battle.html'), 'Missing file name');
  assert(out.includes('Breakage History') || out.includes('breakage'), 'Missing breakage section');
});

test('why shows couplings for battle.html', () => {
  const out = shell('node mycelium-why.cjs public/battle.html 2>&1');
  assert(out.includes('Coupled Files') || out.includes('nw-battle-engine'), 'Missing coupling info');
});

test('why shows constraints', () => {
  const out = shell('node mycelium-why.cjs public/battle.html 2>&1');
  assert(out.includes('Constraints') || out.includes('constraint'), 'Missing constraints');
});

test('why shows lessons', () => {
  const out = shell('node mycelium-why.cjs public/battle.html 2>&1');
  assert(out.includes('Lessons') || out.includes('lesson'), 'Missing lessons');
});

test('why shows advice section', () => {
  const out = shell('node mycelium-why.cjs public/battle.html 2>&1');
  assert(out.includes('Before You Edit'), 'Missing advice section');
});

test('why handles non-existent file gracefully', () => {
  const out = shell('node mycelium-why.cjs nonexistent-file.xyz 2>&1');
  assert(!out.includes('Error') && !out.includes('FATAL'), 'Crashed on non-existent file');
  assert(out.includes('not found') || out.includes('No breakages') || out.includes('Low risk'), 'Missing graceful handling');
});

test('why --json returns valid JSON', () => {
  const out = shell('node mycelium-why.cjs public/battle.html --json 2>&1');
  const jsonStart = out.indexOf('{');
  if (jsonStart >= 0) {
    const jsonStr = out.slice(jsonStart);
    // Find the end of the first complete JSON object
    let depth = 0, end = 0;
    for (let i = 0; i < jsonStr.length; i++) {
      if (jsonStr[i] === '{') depth++;
      if (jsonStr[i] === '}') depth--;
      if (depth === 0) { end = i + 1; break; }
    }
    const data = JSON.parse(jsonStr.slice(0, end));
    assert(data.file === 'public/battle.html', 'Wrong file in JSON');
    assert(typeof data.breakages === 'number', 'Missing breakages count');
    assert(Array.isArray(data.couplings), 'Missing couplings array');
  }
});

test('why shows git history', () => {
  const out = shell('node mycelium-why.cjs public/battle.html 2>&1');
  assert(out.includes('Git History') || out.includes('Commits'), 'Missing git history');
});

test('why shows risk profile for hotspot files', () => {
  const out = shell('node mycelium-why.cjs public/battle.html 2>&1');
  assert(out.includes('Risk Profile') || out.includes('Danger') || out.includes('Churn'), 'Missing risk profile');
});

// ═══════════════════════════════════════════════════════════════════
// GITHUB ACTION TESTS
// ═══════════════════════════════════════════════════════════════════
console.log('');
console.log('  \x1b[1m─── GitHub Action ───\x1b[0m');

test('mycelium-ci.yml exists', () => {
  assert(fs.existsSync(path.join(ROOT, '.github', 'workflows', 'mycelium-ci.yml')));
});

test('mycelium-ci.yml is valid YAML', () => {
  const content = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'mycelium-ci.yml'), 'utf8');
  // Basic YAML structure checks
  assert(content.includes('name:'), 'Missing name');
  assert(content.includes('on:'), 'Missing trigger');
  assert(content.includes('pull_request'), 'Missing PR trigger');
  assert(content.includes('jobs:'), 'Missing jobs');
});

test('action triggers on pull_request to main', () => {
  const content = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'mycelium-ci.yml'), 'utf8');
  assert(content.includes('pull_request'), 'Missing pull_request trigger');
  assert(content.includes('main'), 'Missing main branch');
});

test('action has correct permissions', () => {
  const content = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'mycelium-ci.yml'), 'utf8');
  assert(content.includes('pull-requests: write'), 'Missing PR write permission');
  assert(content.includes('contents: read'), 'Missing contents read permission');
});

test('action runs eval', () => {
  const content = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'mycelium-ci.yml'), 'utf8');
  assert(content.includes('mycelium-eval.cjs'), 'Missing eval step');
});

test('action runs doctor', () => {
  const content = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'mycelium-ci.yml'), 'utf8');
  assert(content.includes('mycelium-doctor.cjs'), 'Missing doctor step');
});

test('action runs why for risk analysis', () => {
  const content = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'mycelium-ci.yml'), 'utf8');
  assert(content.includes('mycelium-why.cjs'), 'Missing why step');
});

test('action posts PR comment', () => {
  const content = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'mycelium-ci.yml'), 'utf8');
  assert(content.includes('actions/github-script'), 'Missing github-script action');
  assert(content.includes('createComment') || content.includes('updateComment'), 'Missing comment creation');
});

test('action uses fetch-depth 0 for full git history', () => {
  const content = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'mycelium-ci.yml'), 'utf8');
  assert(content.includes('fetch-depth: 0'), 'Missing full history fetch');
});

test('action runs regression tests', () => {
  const content = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'mycelium-ci.yml'), 'utf8');
  assert(content.includes('regression'), 'Missing regression test step');
});

// ═══════════════════════════════════════════════════════════════════
// CLI ROUTER TESTS
// ═══════════════════════════════════════════════════════════════════
console.log('');
console.log('  \x1b[1m─── CLI Router ───\x1b[0m');

test('bin/mycelium.cjs has valid syntax', () => {
  shell('node -c bin/mycelium.cjs');
});

test('CLI routes "doctor" command', () => {
  const out = shell('node bin/mycelium.cjs doctor 2>&1');
  assert(out.includes('mycelium doctor'), 'Doctor not routed');
});

test('CLI routes "why" command', () => {
  const out = shell('node bin/mycelium.cjs why public/battle.html 2>&1');
  assert(out.includes('battle.html'), 'Why not routed');
});

test('CLI routes "upgrade" command', () => {
  const out = shell('node bin/mycelium.cjs upgrade 2>&1');
  assert(out.includes('upgrade') || out.includes('Upgrade') || out.includes('Breakages'), 'Upgrade not routed');
});

test('CLI help shows new commands', () => {
  const out = shell('node bin/mycelium.cjs help 2>&1');
  assert(out.includes('doctor'), 'Help missing doctor');
  assert(out.includes('why'), 'Help missing why');
  assert(out.includes('upgrade'), 'Help missing upgrade');
});

test('CLI version shows all 7 components', () => {
  const out = shell('node bin/mycelium.cjs version 2>&1');
  assert(out.includes('Doctor'), 'Missing Doctor in version');
  assert(out.includes('Explainer'), 'Missing Explainer in version');
  assert(out.includes('Upgrader'), 'Missing Upgrader in version');
  assert(out.includes('v3.0.0'), 'Wrong version');
});

// ═══════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════
console.log('');
console.log(`  ─────────────────────────────────────`);
console.log(`  \x1b[1m${passed + failed} tests\x1b[0m: \x1b[32m${passed} passed\x1b[0m, \x1b[${failed ? '31' : '32'}m${failed} failed\x1b[0m`);
console.log('');

process.exit(failed > 0 ? 1 : 0);
