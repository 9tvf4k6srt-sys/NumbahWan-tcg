#!/usr/bin/env node
/**
 * NW Agent Loop v1.0 — Autonomous Watch → Reason → Act
 * 
 * Monitors the project for changes and automatically:
 *   1. WATCH: Detects file changes, test failures, build issues
 *   2. REASON: Determines what action to take
 *   3. ACT: Executes fixes using factory tools
 *   4. LEARN: Records what happened for future sessions
 *
 * Usage:
 *   node bin/agent-loop.cjs              # run one cycle (detect + fix)
 *   node bin/agent-loop.cjs --watch      # continuous watch mode (check every 30s)
 *   node bin/agent-loop.cjs --diagnose   # diagnose issues without fixing
 *   node bin/agent-loop.cjs --dry-run    # show what would be done
 *
 * Integration:
 *   - Called by factory-runner as a pipeline step
 *   - Called by post-commit hook for continuous improvement
 *   - Called by MCP server as agent.cycle tool
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOG = path.join(ROOT, '.mycelium', 'agent-log.jsonl');
const B = '\x1b[1m', G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', X = '\x1b[0m';
const ok = m => console.log(`  ${G}✓${X} ${m}`);
const fail = m => console.log(`  ${R}✗${X} ${m}`);
const info = m => console.log(`  ${C}ℹ${X} ${m}`);
const warn = m => console.log(`  ${Y}⚠${X} ${m}`);

function run(cmd, timeout = 30000) {
  try {
    return { ok: true, out: execSync(cmd, { cwd: ROOT, encoding: 'utf-8', timeout, maxBuffer: 5*1024*1024 }).trim() };
  } catch (e) {
    return { ok: false, out: (e.stdout || '').trim(), err: (e.stderr || '').trim(), code: e.status };
  }
}

function logAction(action) {
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), ...action }) + '\n');
}

// ── WATCH: Detect issues ──
function detect() {
  const issues = [];

  // 1. Uncommitted changes
  const git = run('git status --porcelain');
  if (git.ok) {
    const files = git.out.split('\n').filter(Boolean);
    if (files.length > 0) {
      issues.push({ type: 'uncommitted', severity: 'info', count: files.length, files: files.slice(0, 5) });
    }
  }

  // 2. i18n coverage gaps
  const i18n = run('node scripts/i18n-inject.cjs --check 2>&1');
  if (i18n.ok) {
    const missing = i18n.out.match(/(\d+) missing/);
    if (missing && parseInt(missing[1]) > 0) {
      issues.push({ type: 'i18n-missing', severity: 'warn', count: parseInt(missing[1]) });
    }
    const orphans = i18n.out.match(/(\d+) orphan/);
    if (orphans && parseInt(orphans[1]) > 0) {
      issues.push({ type: 'i18n-orphans', severity: 'info', count: parseInt(orphans[1]) });
    }
  }

  // 3. Test failures (quick smoke)
  const smoke = run('node tests/run-tests.cjs 2>&1', 60000);
  if (!smoke.ok) {
    const failMatch = smoke.out.match(/(\d+) failed/i);
    issues.push({ type: 'test-failure', severity: 'error', count: failMatch ? parseInt(failMatch[1]) : 1 });
  }

  // 4. Sentinel guard
  const guard = run('node sentinel.cjs --guard 2>&1 | tail -5');
  if (!guard.ok || (guard.out && guard.out.includes('FAIL'))) {
    issues.push({ type: 'sentinel-warn', severity: 'warn', detail: guard.out?.split('\n').slice(-2).join('; ') });
  }

  // 5. Build check (fast — just typecheck)
  const ts = run('npx tsc --noEmit 2>&1 | tail -3', 30000);
  if (!ts.ok) {
    const errCount = ts.out.match(/(\d+) error/);
    issues.push({ type: 'ts-errors', severity: 'error', count: errCount ? parseInt(errCount[1]) : 1 });
  }

  return issues;
}

// ── REASON: Determine actions ──
function reason(issues) {
  const actions = [];

  for (const issue of issues) {
    switch (issue.type) {
      case 'i18n-missing':
        actions.push({
          name: 'Fix missing translations',
          tool: 'i18n.translate + i18n.inject',
          commands: ['node scripts/i18n-translate.cjs', 'node scripts/i18n-inject.cjs'],
          priority: 2,
          auto: true,
        });
        break;

      case 'test-failure':
        actions.push({
          name: 'Investigate test failures',
          tool: 'test.smoke',
          commands: ['node tests/run-tests.cjs 2>&1 | tail -20'],
          priority: 1,
          auto: false, // needs human review
        });
        break;

      case 'ts-errors':
        actions.push({
          name: 'Fix TypeScript errors',
          tool: 'typecheck',
          commands: ['npx tsc --noEmit 2>&1 | head -20'],
          priority: 1,
          auto: false,
        });
        break;

      case 'sentinel-warn':
        actions.push({
          name: 'Auto-heal sentinel warnings',
          tool: 'guardian.heal',
          commands: ['node sentinel.cjs --heal 2>&1 | tail -10'],
          priority: 3,
          auto: true,
        });
        break;

      case 'uncommitted':
        if (issue.count > 10) {
          actions.push({
            name: 'Stage and commit changes',
            tool: 'git',
            commands: [],
            priority: 4,
            auto: false,
          });
        }
        break;
    }
  }

  // Sort by priority (lower = more urgent)
  actions.sort((a, b) => a.priority - b.priority);
  return actions;
}

// ── ACT: Execute fixes ──
function act(actions, dryRun = false) {
  let fixed = 0;
  for (const action of actions) {
    if (!action.auto) {
      warn(`${action.name} — needs human review`);
      continue;
    }

    if (dryRun) {
      info(`[DRY] Would run: ${action.name}`);
      continue;
    }

    info(`Running: ${action.name}`);
    let success = true;
    for (const cmd of action.commands) {
      const r = run(cmd, 60000);
      if (!r.ok) {
        fail(`  ${cmd.split(' ').slice(0, 3).join(' ')}... failed`);
        success = false;
      }
    }
    if (success) {
      ok(`${action.name} — done`);
      fixed++;
      logAction({ action: action.name, tool: action.tool, result: 'success' });
    } else {
      logAction({ action: action.name, tool: action.tool, result: 'failed' });
    }
  }
  return fixed;
}

// ── CYCLE: One full detect → reason → act loop ──
function cycle(opts = {}) {
  console.log(`\n${B}🤖 NW Agent Loop v1.0${X}\n`);

  // WATCH
  info('Scanning for issues...');
  const issues = detect();

  if (issues.length === 0) {
    ok('No issues detected — project is healthy');
    return { issues: 0, actions: 0, fixed: 0 };
  }

  // Report issues
  console.log(`\n  ${B}Issues Found: ${issues.length}${X}`);
  issues.forEach(i => {
    const icon = i.severity === 'error' ? R+'✗' : i.severity === 'warn' ? Y+'⚠' : C+'ℹ';
    const count = i.count ? ` (${i.count})` : '';
    console.log(`    ${icon}${X} ${i.type}${count}${i.detail ? ': ' + i.detail : ''}`);
  });

  // REASON
  const actions = reason(issues);
  if (actions.length === 0) {
    info('No actionable fixes available');
    return { issues: issues.length, actions: 0, fixed: 0 };
  }

  console.log(`\n  ${B}Planned Actions: ${actions.length}${X}`);
  actions.forEach(a => {
    const autoLabel = a.auto ? G+'auto'+X : Y+'manual'+X;
    console.log(`    [${autoLabel}] ${a.name}`);
  });

  // ACT
  if (opts.diagnoseOnly) {
    info('Diagnose mode — no actions taken');
    return { issues: issues.length, actions: actions.length, fixed: 0 };
  }

  console.log('');
  const fixed = act(actions, opts.dryRun);

  // Summary
  const autoActions = actions.filter(a => a.auto).length;
  const manualActions = actions.filter(a => !a.auto).length;
  console.log(`\n  ${B}Summary${X}: ${issues.length} issues, ${fixed}/${autoActions} auto-fixed, ${manualActions} need human review`);
  
  return { issues: issues.length, actions: actions.length, fixed };
}

// ── Watch mode ──
function watchMode() {
  console.log(`${B}🤖 Agent Watch Mode${X} — checking every 60s (Ctrl+C to stop)\n`);
  
  const runCycle = () => {
    const result = cycle({ dryRun: false });
    if (result.fixed > 0) {
      info(`Fixed ${result.fixed} issues — regenerating context...`);
      run('node bin/gen-context.cjs');
    }
  };

  runCycle(); // immediate first run
  setInterval(runCycle, 60000);
}

// ── CLI ──
const args = process.argv.slice(2);

if (args.includes('--watch')) {
  watchMode();
} else if (args.includes('--diagnose')) {
  cycle({ diagnoseOnly: true });
} else if (args.includes('--dry-run')) {
  cycle({ dryRun: true });
} else {
  cycle();
}
