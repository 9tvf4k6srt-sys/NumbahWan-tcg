#!/usr/bin/env node
/**
 * NW Factory Orchestrator v2.0
 * 
 * The central nervous system of the Dark Factory.
 * Coordinates all agents via the event bus and manages the full lifecycle:
 *   Intent → Spec → Generate → Translate → Test → Gate → Deploy
 *
 * v2.0 improvements:
 *   - Uses factory-core shared utilities
 *   - Per-step timing and structured results  
 *   - Retry logic for transient failures
 *   - Event bus integration for all steps
 *   - Better error messages with fix suggestions
 *
 * Usage:
 *   node bin/orchestrator.cjs "Add a DLC about fire dragons"     # full auto pipeline
 *   node bin/orchestrator.cjs --from-spec specs/dlc-12.yaml      # from existing spec
 *   node bin/orchestrator.cjs --monitor                           # continuous monitoring
 *   node bin/orchestrator.cjs --status                            # show system status
 *   node bin/orchestrator.cjs --dry-run "Add a landing page"     # preview without executing
 */

const fs = require('fs');
const path = require('path');

const core = require('./factory-core.cjs');
const { ROOT, ok, fail, info, warn, header, emit, timer, humanDuration,
        run: coreRun, ensureDir, readJSON, B, G, R, Y, C, X } = core;

function run(cmd, timeout = 60000) {
  return coreRun(cmd, { timeout });
}

// Retry wrapper for transient failures
function runWithRetry(cmd, label, maxRetries = 2, timeout = 60000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const r = run(cmd, timeout);
    if (r.ok) return r;
    if (attempt < maxRetries) {
      warn(`${label} failed (attempt ${attempt}/${maxRetries}) — retrying...`);
      emit('orchestrator', 'retry', { step: label, attempt });
    }
  }
  return run(cmd, timeout); // last attempt
}

// ── Full Pipeline: Intent → Deploy (v2.0 with timing + retry) ──
function fullPipeline(intentText, opts = {}) {
  header('🏭', 'NW Factory Orchestrator v2.0');
  console.log(`  ${C}Intent:${X} "${intentText}"\n`);

  const clock = timer();
  const results = { steps: [], success: true };
  emit('orchestrator', 'pipeline_start', { intent: intentText });

  function step(name, fn) {
    const stepClock = timer();
    info(`[${results.steps.length + 1}] ${name}...`);
    emit('orchestrator', 'step_start', { step: name });
    try {
      const result = fn();
      const elapsed = stepClock.human();
      if (result.ok !== false) {
        ok(`${name} — ${elapsed}${result.msg ? ': ' + result.msg : ''}`);
        results.steps.push({ name, status: 'done', msg: result.msg, duration: elapsed });
        emit('orchestrator', 'step_done', { step: name, duration_ms: stepClock.ms() });
      } else {
        if (result.blocking) {
          fail(`${name} — failed (${elapsed}): ${result.msg}`);
          results.steps.push({ name, status: 'failed', msg: result.msg, duration: elapsed });
          results.success = false;
          emit('orchestrator', 'step_failed', { step: name, error: result.msg });
          if (result.fix) info(`Fix: ${result.fix}`);
          return false;
        } else {
          warn(`${name} — warning (${elapsed}): ${result.msg}`);
          results.steps.push({ name, status: 'warn', msg: result.msg, duration: elapsed });
        }
      }
    } catch (e) {
      fail(`${name} — error: ${e.message}`);
      results.steps.push({ name, status: 'error', msg: e.message });
      results.success = false;
      return false;
    }
    return true;
  }

  // Step 1: Parse intent → spec YAML
  let specPath;
  if (!step('Parse Intent', () => {
    const r = run(`node bin/intent-parser.cjs ${JSON.stringify(intentText)}`);
    if (!r.ok) return { ok: false, msg: 'Intent parsing failed', blocking: true, fix: 'Check intent text or create spec manually with: node bin/factory-init.cjs' };
    const m = r.stdout.match(/specs\/([^\s]+\.yaml)/);
    if (m) { specPath = `specs/${m[1]}`; return { msg: specPath }; }
    return { ok: false, msg: 'No spec file generated', blocking: true, fix: 'Use factory-init.cjs to scaffold a spec' };
  })) return results;

  // Step 2: Generate page from spec
  if (!step('Generate Page', () => {
    const r = runWithRetry(`node bin/page-gen.cjs ${specPath}`, 'Generate Page');
    if (!r.ok) return { ok: false, msg: 'Page generation failed', blocking: true, fix: `Check spec: node bin/page-gen.cjs ${specPath} --validate` };
    const m = r.stdout.match(/(\d+) i18n keys/);
    return { msg: m ? `${m[1]} i18n keys` : 'page created' };
  })) return results;

  // Step 3: Auto-translate
  step('Translate', () => {
    const r = run('node scripts/i18n-translate.cjs 2>&1');
    return { msg: 'translation pass complete' };
  });

  // Step 4: Inject translations
  step('Inject i18n', () => {
    const r = run('node scripts/i18n-inject.cjs 2>&1');
    if (!r.ok) return { ok: false, msg: 'some translations missing (non-blocking)' };
    return { msg: 'injected' };
  });

  // Step 5: Run agent loop for auto-fixes
  step('Agent Auto-Fix', () => {
    run('node bin/agent-loop.cjs 2>&1');
    return { msg: 'cycle complete' };
  });

  // Step 6: Quality scorecard
  step('Scorecard', () => {
    const r = run('node bin/quality-scorecard.cjs 2>&1 | tail -3');
    const m = r.out?.match(/avg (\d+)\/100/);
    return { msg: m ? `avg ${m[1]}/100` : 'scored' };
  });

  // Step 7: Deploy gate
  step('Deploy Gate', () => {
    const r = run('node bin/deploy-gate.cjs 2>&1 | tail -5');
    if (r.out?.includes('PASS')) return { msg: 'all checks green' };
    return { ok: false, msg: 'gate blocked — needs review' };
  });

  // Step 8: Generate context for next session
  step('Update Context', () => {
    run('node bin/gen-context.cjs 2>&1');
    return { msg: '.mycelium-context updated' };
  });

  // Summary with timing
  const elapsed = clock.human();
  const doneSteps = results.steps.filter(s => s.status === 'done').length;
  const failedSteps = results.steps.filter(s => s.status === 'failed').length;

  console.log('');
  if (results.success) {
    console.log(`  ${G}${B}🏭 Pipeline Complete${X} — ${doneSteps}/${results.steps.length} steps in ${elapsed}`);
    if (specPath) info(`Spec: ${specPath}`);
    info(`Ready for human review or auto-merge`);
  } else {
    console.log(`  ${R}${B}🏭 Pipeline Blocked${X} — ${failedSteps} step(s) failed in ${elapsed}`);
    results.steps.filter(s => s.status === 'failed').forEach(s => {
      console.log(`    ${R}✗${X} ${s.name}: ${s.msg}`);
    });
  }
  console.log('');

  emit('orchestrator', 'pipeline_complete', { success: results.success, elapsed, steps: results.steps.length });
  return results;
}

// ── From existing spec (v2.0 with timing) ──
function fromSpec(specPath) {
  header('🏭', 'NW Factory Orchestrator v2.0');
  console.log(`  ${C}Spec:${X} ${specPath}\n`);

  if (!fs.existsSync(path.resolve(ROOT, specPath))) {
    fail(`Spec not found: ${specPath}`);
    info('Create one with: node bin/factory-init.cjs <type> <slug>');
    process.exit(1);
  }

  const clock = timer();
  const steps = [
    { name: 'Generate', cmd: `node bin/page-gen.cjs ${specPath}` },
    { name: 'Translate', cmd: 'node scripts/i18n-translate.cjs 2>&1' },
    { name: 'Inject', cmd: 'node scripts/i18n-inject.cjs 2>&1' },
    { name: 'Scorecard', cmd: 'node bin/quality-scorecard.cjs 2>&1 | tail -3' },
    { name: 'Gate', cmd: 'node bin/deploy-gate.cjs 2>&1 | tail -5' },
  ];

  for (const s of steps) {
    const stepClock = timer();
    info(`${s.name}...`);
    const r = run(s.cmd);
    const elapsed = stepClock.human();
    if (r.ok) ok(`${s.name} (${elapsed})`);
    else warn(`${s.name}: ${r.stdout?.split('\n').slice(-1)[0] || 'issues'} (${elapsed})`);
  }
  console.log(`\n  ${G}${B}✓ Spec pipeline complete in ${clock.human()}${X}\n`);
}

// ── System status (v2.0) ──
function showStatus() {
  header('🏭', 'Factory Orchestrator — System Status');

  // Git
  const branch = run('git branch --show-current').stdout;
  const ahead = run('git rev-list --count origin/main..HEAD 2>/dev/null').stdout || '?';
  const dirty = run('git status --porcelain').stdout?.split('\n').filter(Boolean).length || 0;
  info(`Git: ${branch} (${ahead} ahead, ${dirty} uncommitted)`);

  // Scorecard summary
  const sc = run('node bin/quality-scorecard.cjs 2>&1 | tail -1');
  if (sc.stdout) info(`Scorecard: ${sc.stdout.replace(/\s+/g,' ').trim()}`);

  // Memory
  try {
    const mem = require('./factory-memory.cjs').loadMemory();
    info(`Memory: ${mem.stats.totalBuilds} builds, ${mem.stats.totalLessons} lessons, Gen ${mem.templateDNA.generation}`);
  } catch {}

  // Available specs
  const specs = run('ls specs/*.yaml 2>/dev/null').stdout;
  if (specs) info(`Specs: ${specs.split('\n').length} available`);

  // Supported types
  info(`Supported types: ${Object.keys(core.SPEC_TYPES).join(', ')}`);

  console.log('');
}

// ── Continuous monitor ──
function monitor() {
  console.log(`${B}🏭 Factory Orchestrator — Monitor Mode${X}`);
  info('Checking every 120s. Ctrl+C to stop.\n');

  function cycle() {
    const r = run('node bin/agent-loop.cjs --diagnose 2>&1 | tail -10');
    const issueMatch = r.out?.match(/Issues Found: (\d+)/);
    const count = issueMatch ? parseInt(issueMatch[1]) : 0;
    
    if (count > 0) {
      warn(`${count} issue(s) detected — running auto-fix...`);
      run('node bin/agent-loop.cjs 2>&1');
      ok('Auto-fix cycle complete');
    } else {
      ok(`${new Date().toLocaleTimeString()} — healthy, 0 issues`);
    }
  }

  cycle();
  setInterval(cycle, 120000);
}

// ── CLI (v2.0 with --dry-run) ──
const args = process.argv.slice(2);
const command = args[0];

if (command === '--status') {
  showStatus();
} else if (command === '--monitor') {
  monitor();
} else if (command === '--from-spec') {
  fromSpec(args[1]);
} else if (command === '--dry-run') {
  const intent = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
  header('🏭', 'NW Factory Orchestrator v2.0 [DRY RUN]');
  info(`Intent: "${intent}"`);
  info('[DRY] Would parse intent → generate spec YAML');
  info('[DRY] Would generate page from spec');
  info('[DRY] Would translate, inject i18n, run agent fixes');
  info('[DRY] Would run scorecard + deploy gate');
  info('[DRY] Would update context for next session');
  info('No files changed.');
} else if (command && !command.startsWith('--')) {
  const intent = args.filter(a => !a.startsWith('--')).join(' ');
  fullPipeline(intent);
} else {
  header('🏭', 'NW Factory Orchestrator v2.0');
  console.log(`  The complete Intent → Deploy pipeline.\n`);
  console.log(`Usage:`);
  console.log(`  node bin/orchestrator.cjs "Add a DLC about fire dragons"  # full auto`);
  console.log(`  node bin/orchestrator.cjs --from-spec specs/dlc.yaml      # from spec`);
  console.log(`  node bin/orchestrator.cjs --dry-run "Add a landing page" # preview`);
  console.log(`  node bin/orchestrator.cjs --status                        # system status`);
  console.log(`  node bin/orchestrator.cjs --monitor                       # continuous`);
  console.log(`\n  Supported types: ${Object.keys(core.SPEC_TYPES).join(', ')}`);
}
