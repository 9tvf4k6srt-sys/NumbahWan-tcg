#!/usr/bin/env node
/**
 * NW Factory Runner v2.0
 * 
 * Autonomous task executor for the Dark Factory pipeline.
 * Chains build steps without human intervention.
 * 
 * Usage:
 *   node bin/factory-runner.cjs <spec.yaml>          # Run full pipeline from spec
 *   node bin/factory-runner.cjs --validate            # Validate all pages
 *   node bin/factory-runner.cjs --status              # Show pipeline status
 *   node bin/factory-runner.cjs --heal                # Auto-fix detected issues
 *   node bin/factory-runner.cjs --pipeline <steps>    # Run specific steps
 *   node bin/factory-runner.cjs --full [msg]          # Full pipeline with commit
 *   node bin/factory-runner.cjs --dry-run <spec>      # Preview what would happen
 *   node bin/factory-runner.cjs --json                # Machine-readable JSON output
 *
 * Design: ATOMIC steps, checkpoint resume, structured logging, event-bus wired
 */

const fs = require('fs');
const path = require('path');

// Factory Core — shared utilities
const core = require('./factory-core.cjs');
const { ROOT, ok, fail, info, warn, header, emit, timer, humanDuration,
        run: coreRun, runQuiet: coreRunQuiet, ensureDir, readJSON, writeJSON,
        B, G, R, Y, C, X, createResult } = core;

// Factory Memory integration
let memory;
try { memory = require('./factory-memory.cjs'); } catch (e) { memory = null; }

const CHECKPOINT_FILE = path.join(ROOT, '.mycelium', 'factory-checkpoint.json');
const LOG_DIR = path.join(ROOT, '.mycelium', 'factory-logs');

// ── Helpers (delegate to factory-core) ──
function run(cmd, opts = {}) {
  return coreRun(cmd, opts);
}

function runQuiet(cmd, label, opts = {}) {
  return coreRunQuiet(cmd, label, opts);
}

// ── Checkpoint (uses factory-core file helpers) ──
function loadCheckpoint() { return readJSON(CHECKPOINT_FILE); }

function saveCheckpoint(data) {
  writeJSON(CHECKPOINT_FILE, data);
}

function clearCheckpoint() {
  try { fs.unlinkSync(CHECKPOINT_FILE); } catch {}
}

// ── Pipeline Steps ──
const STEPS = {
  validate: {
    label: 'Validate (i18n + sentinel)',
    run: () => {
      const results = [];
      
      // i18n injection check
      const i18n = runQuiet('node scripts/i18n-inject.cjs --check 2>&1', 'validate-i18n');
      if (i18n.ok) {
        const match = i18n.stdout.match(/(\d+) HTML keys.*?(\d+) JSON keys.*?(\d+) orphan/);
        if (match) ok(`i18n: ${match[1]} HTML keys, ${match[2]} JSON keys, ${match[3]} orphans`);
        else ok('i18n check passed');
        results.push({ step: 'i18n', pass: true });
      } else {
        results.push({ step: 'i18n', pass: false });
      }

      // Sentinel guard (if available)
      const sentinel = runQuiet('node sentinel.cjs --guard 2>&1 | tail -10', 'validate-sentinel');
      if (sentinel.ok) {
        ok('Sentinel guard passed');
        results.push({ step: 'sentinel', pass: true });
      } else {
        warn('Sentinel guard had warnings');
        results.push({ step: 'sentinel', pass: false, warning: true });
      }

      return results.every(r => r.pass || r.warning);
    }
  },

  translate: {
    label: 'Auto-translate missing keys',
    run: () => {
      const r = runQuiet('node scripts/i18n-translate.cjs 2>&1', 'translate');
      if (r.ok) {
        const match = r.stdout.match(/(\d+) translations? added/i);
        if (match) ok(`Added ${match[1]} translations`);
        else ok('Translation pass complete');
      }
      return r.ok;
    }
  },

  inject: {
    label: 'Inject PAGE_I18N into HTML',
    run: () => {
      const r = runQuiet('node scripts/i18n-inject.cjs 2>&1', 'inject');
      if (r.ok) {
        const match = r.stdout.match(/Injected (\d+) zh.*?(\d+) th/);
        if (match) ok(`Injected ${match[1]} zh + ${match[2]} th translations`);
        else ok('i18n injection complete');
      }
      return r.ok;
    }
  },

  test: {
    label: 'Run tests (smoke + i18n guard)',
    run: () => {
      const smoke = runQuiet('node tests/run-tests.cjs 2>&1', 'test-smoke');
      const i18n = runQuiet('node tests/nw-i18n-guard.cjs 2>&1', 'test-i18n');
      
      if (smoke.ok) ok('Smoke tests passed');
      else warn('Smoke tests had failures — check .mycelium/factory-logs/test-smoke.log');

      if (i18n.ok) ok('i18n guard passed');
      else warn('i18n guard had issues — check .mycelium/factory-logs/test-i18n.log');

      return smoke.ok; // i18n warnings don't block
    }
  },

  build: {
    label: 'Vite build',
    run: () => {
      const r = runQuiet('npx vite build 2>&1', 'build');
      if (r.ok) {
        // Extract bundle size from output
        const sizeMatch = r.stdout.match(/dist\/.*?(\d+\.\d+ [km]?B)/i);
        ok(`Build complete${sizeMatch ? ` — ${sizeMatch[1]}` : ''}`);
      }
      return r.ok;
    }
  },

  scorecard: {
    label: 'Quality scorecard',
    run: () => {
      const r = runQuiet('node bin/quality-scorecard.cjs 2>&1', 'scorecard');
      if (r.ok) {
        const match = r.stdout.match(/(\d+) pages.*?avg (\d+)\/100.*?(\d+) A-grade.*?(\d+) failing/);
        if (match) ok(`Scorecard: ${match[1]} pages, avg ${match[2]}/100, ${match[3]} A-grade, ${match[4]} failing`);
        else ok('Scorecard complete');
      }
      return r.ok;
    }
  },

  agent: {
    label: 'Agent auto-fix cycle',
    run: () => {
      const r = runQuiet('node bin/agent-loop.cjs 2>&1', 'agent-cycle');
      if (r.ok) ok('Agent cycle complete');
      return true; // agent issues are non-blocking
    }
  },

  ship: {
    label: 'Ship (commit + push + PR)',
    run: (opts = {}) => {
      const msg = opts.commitMsg || 'chore: factory pipeline auto-ship';
      const r = runQuiet(`node bin/mycelium.cjs ship "${msg}" 2>&1`, 'ship');
      if (r.ok) {
        const prMatch = r.stdout.match(/(https:\/\/github\.com\/[^\s]+\/pull\/\d+)/);
        if (prMatch) ok(`Shipped! PR: ${prMatch[1]}`);
        else ok('Ship complete');
      }
      return r.ok;
    }
  }
};

// ── Pipeline Runner (v2.0 — timing, events, JSON output, dry-run) ──
function runPipeline(stepNames, opts = {}) {
  const jsonMode = opts.json || false;
  const dryRunMode = opts.dryRun || false;
  
  if (!jsonMode) header('🏭', 'NW Factory Runner v2.0');
  const buildClock = timer();
  const buildDefects = [];
  const stepResults = [];

  // ── Pre-build: consult memory ──
  let mem;
  if (memory) {
    mem = memory.loadMemory();
    if (mem.lessons.length === 0) memory.seedFromHistory(mem);
    if (!jsonMode && !dryRunMode) memory.generateChecklist(mem, opts.specFile || null);
  }
  
  emit('factory-runner', 'pipeline_start', { steps: stepNames, dryRun: dryRunMode });
  
  // Ensure log dir exists
  ensureDir(LOG_DIR);

  // Check for existing checkpoint (resume support)
  const checkpoint = loadCheckpoint();
  let startFrom = 0;
  if (checkpoint && checkpoint.pipeline) {
    const completedSteps = checkpoint.completed || [];
    info(`Resuming from checkpoint — ${completedSteps.length}/${stepNames.length} steps done`);
    startFrom = completedSteps.length;
  }

  for (let i = startFrom; i < stepNames.length; i++) {
    const name = stepNames[i];
    const step = STEPS[name];
    if (!step) { fail(`Unknown step: ${name}`); return jsonMode ? { success: false, steps: stepResults } : false; }

    const stepClock = timer();
    
    if (dryRunMode) {
      info(`[DRY] Would run: [${i + 1}/${stepNames.length}] ${step.label}`);
      stepResults.push({ step: name, status: 'dry-run', duration_ms: 0 });
      continue;
    }

    info(`[${i + 1}/${stepNames.length}] ${step.label}...`);
    
    // Save checkpoint before each step
    saveCheckpoint({
      pipeline: stepNames,
      current: name,
      completed: stepNames.slice(0, i),
      pending: stepNames.slice(i),
      startedAt: checkpoint?.startedAt || new Date().toISOString(),
      lastStep: new Date().toISOString(),
    });

    const passed = step.run(opts);
    const elapsed = stepClock.ms();
    stepResults.push({ step: name, status: passed ? 'pass' : 'fail', duration_ms: elapsed });
    emit('factory-runner', `step_${passed ? 'pass' : 'fail'}`, { step: name, duration_ms: elapsed });
    
    if (!passed && !opts.force) {
      fail(`Pipeline stopped at step "${name}" (${humanDuration(elapsed)})`);
      info(`Fix the issue, then: node bin/factory-runner.cjs --resume`);
      return jsonMode ? { success: false, steps: stepResults, stoppedAt: name } : false;
    }
    if (passed) ok(`Step "${name}" complete (${humanDuration(elapsed)})`);
    else warn(`Step "${name}" had issues (--force mode, continuing)`);
  }

  clearCheckpoint();
  const totalElapsed = buildClock.ms();
  
  if (!jsonMode && !dryRunMode) {
    console.log(`\n  ${G}${B}✓ Pipeline complete — ${stepNames.length} steps in ${humanDuration(totalElapsed)}${X}\n`);
  }

  // ── Post-build: record results in memory ──
  if (memory && mem && !dryRunMode) {
    memory.recordBuild(mem, {
      spec: opts.specFile || null,
      slug: opts.slug || null,
      steps: stepNames,
      score: null,
      defectsFound: buildDefects.length,
      defectsFixed: buildDefects.filter(d => d.fixApplied).length,
      duration_ms: totalElapsed,
      success: true,
    });
    memory.recordLesson(mem, 'build', {
      pipeline: stepNames.join(' → '),
      duration_ms: totalElapsed,
      success: true,
      defects: buildDefects.length,
    });
    memory.saveMemory(mem);
    info(`Build recorded in factory memory (${mem.stats.totalBuilds} total builds)`);
  }
  
  emit('factory-runner', 'pipeline_complete', { 
    success: true, steps: stepNames.length, duration_ms: totalElapsed 
  });

  if (jsonMode) {
    const result = { success: true, steps: stepResults, duration_ms: totalElapsed, totalSteps: stepNames.length };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  return true;
}

// ── Status (enhanced with timing) ──
function showStatus() {
  header('🏭', 'Factory Status v2.0');
  
  const checkpoint = loadCheckpoint();
  if (checkpoint) {
    info(`Active pipeline: ${checkpoint.pipeline?.join(' → ')}`);
    ok(`Completed: ${checkpoint.completed?.join(', ') || 'none'}`);
    warn(`Pending: ${checkpoint.pending?.join(', ') || 'none'}`);
    info(`Started: ${checkpoint.startedAt}`);
  } else {
    info('No active pipeline');
  }

  // Quick health checks
  const i18n = run('node scripts/i18n-inject.cjs --check 2>&1');
  if (i18n.ok) {
    const match = i18n.stdout.match(/(\d+) HTML keys.*?All translations complete/);
    if (match) ok(`i18n: ${match[1]} keys, all complete`);
  }

  const git = run('git status --porcelain 2>&1');
  const changes = (git.stdout || '').trim().split('\n').filter(Boolean).length;
  if (changes > 0) warn(`${changes} uncommitted changes`);
  else ok('Working tree clean');
  
  // Memory stats
  if (memory) {
    const mem = memory.loadMemory();
    info(`Memory: ${mem.stats.totalBuilds} builds, ${mem.stats.totalLessons} lessons, Gen ${mem.templateDNA.generation}, streak ${mem.stats.currentStreak}`);
  }
}

// ── Heal ──
function autoHeal() {
  console.log(`\n${B}🏭 Factory Auto-Heal${X}\n`);
  
  // Step 1: Fix i18n
  info('Checking i18n...');
  const i18nCheck = run('node scripts/i18n-inject.cjs --check 2>&1');
  if (i18nCheck.stdout?.includes('missing')) {
    info('Running i18n inject...');
    run('node scripts/i18n-inject.cjs 2>&1');
    ok('i18n injected');
  } else {
    ok('i18n already complete');
  }

  // Step 2: Fix translations  
  info('Checking translations...');
  run('node scripts/i18n-translate.cjs 2>&1');
  ok('Translation pass complete');

  // Step 3: Run guardian heal
  info('Running guardian heal...');
  const heal = runQuiet('node sentinel.cjs --heal 2>&1 | tail -5', 'heal');
  if (heal.ok) ok('Guardian heal complete');

  console.log(`\n  ${G}${B}✓ Auto-heal complete${X}\n`);
}

// ── CLI ──
const args = process.argv.slice(2);
const command = args[0];
const jsonMode = args.includes('--json');
const dryRunMode = args.includes('--dry-run');

switch (command) {
  case '--status':
    showStatus();
    break;

  case '--heal':
    autoHeal();
    break;

  case '--resume': {
    const checkpoint = loadCheckpoint();
    if (!checkpoint) { info('Nothing to resume'); break; }
    runPipeline(checkpoint.pipeline, { force: args.includes('--force'), json: jsonMode });
    break;
  }

  case '--validate':
    runPipeline(['validate'], { json: jsonMode, dryRun: dryRunMode });
    break;

  case '--pipeline': {
    const steps = args.slice(1).filter(a => !a.startsWith('--'));
    if (steps.length === 0) {
      console.log('Usage: factory-runner --pipeline validate translate inject test build ship');
      break;
    }
    runPipeline(steps, { force: args.includes('--force'), json: jsonMode, dryRun: dryRunMode });
    break;
  }

  case '--full':
    runPipeline(['validate', 'translate', 'inject', 'test', 'scorecard', 'ship'], {
      commitMsg: args.find(a => !a.startsWith('--') && a !== '--full') || 'feat: factory pipeline auto-build',
      force: args.includes('--force'),
      json: jsonMode,
      dryRun: dryRunMode,
    });
    break;

  case '--dry-run': {
    const specOrStep = args[1];
    if (specOrStep && specOrStep.endsWith('.yaml')) {
      info(`[DRY RUN] Would generate from spec: ${specOrStep}`);
      info(`[DRY RUN] Then run: translate → inject → scorecard`);
      runPipeline(['translate', 'inject', 'scorecard'], { dryRun: true, json: jsonMode });
    } else {
      runPipeline(['validate', 'translate', 'inject', 'test', 'scorecard', 'ship'], { dryRun: true, json: jsonMode });
    }
    break;
  }

  case '--learn':
    if (memory) {
      const m = memory.loadMemory();
      if (m.lessons.length === 0) memory.seedFromHistory(m);
      memory.evolve(m);
      memory.saveMemory(m);
      memory.showReport(m);
    } else {
      fail('Factory memory module not available');
    }
    break;

  case '--gen': {
    // Spec-driven generation: gen page → translate → inject → scorecard
    const specFile = args[1];
    if (!specFile) { fail('Usage: factory-runner --gen <spec.yaml>'); break; }
    info(`Generating from spec: ${specFile}`);
    const genResult = runQuiet(`node bin/page-gen.cjs "${specFile}" 2>&1`, 'gen-page');
    if (!genResult.ok) { fail('Page generation failed'); break; }
    ok('Page generated');
    runPipeline(['translate', 'inject', 'scorecard'], { force: true });
    break;
  }

  default:
    if (command && !command.startsWith('--')) {
      // Assume it's a spec file
      info(`Generating from spec: ${command}`);
      const genResult = runQuiet(`node bin/page-gen.cjs "${command}" 2>&1`, 'gen-page');
      if (!genResult.ok) { fail('Page generation failed'); break; }
      ok('Page generated');
      runPipeline(['translate', 'inject', 'scorecard'], { force: true });
    } else {
      console.log(`
${B}🏭 NW Factory Runner v2.0${X}

Commands:
  --status              Show pipeline status + memory stats
  --validate            Run validation only
  --heal                Auto-fix detected issues
  --pipeline <steps>    Run specific steps (validate translate inject test build ship)
  --full [msg]          Run full pipeline with optional commit message
  --resume              Resume interrupted pipeline
  --dry-run [spec]      Preview what would happen without executing
  --json                Machine-readable JSON output
  --force               Continue past failures
  --learn               Run evolution engine

Supported page types: ${Object.keys(require('./factory-core.cjs').SPEC_TYPES).join(', ')}
`);
    }
}
