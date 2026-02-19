#!/usr/bin/env node
/**
 * Context Generator — produces .mycelium-context for session startup
 * 
 * This file is the "brain dump" that new AI sessions read first.
 * It's auto-generated from checkpoint, git state, and project health.
 * 
 * Usage: node bin/gen-context.cjs
 * Auto-runs: post-commit hook, factory-runner pipeline
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '.mycelium-context');

function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', timeout: 15000 }).trim();
  } catch { return ''; }
}

function section(title, content) {
  return `## ${title}\n${content}\n`;
}

// ── Gather data ──
const branch = run('git branch --show-current');
const log = run('git log --oneline -5');
const status = run('git status --porcelain');
const ahead = run(`git rev-list --count origin/main..HEAD 2>/dev/null`) || '?';

// Check for active checkpoint
let checkpointSection = '';
const cpFile = path.join(ROOT, '.mycelium', 'factory-checkpoint.json');
const wpFile = path.join(ROOT, '.mycelium', 'checkpoint.json');
try {
  const cp = JSON.parse(fs.readFileSync(cpFile, 'utf-8'));
  if (cp.pending && cp.pending.length > 0) {
    checkpointSection = section('!!RESUME!! — Factory Pipeline In Progress',
      `Task: Factory pipeline\n` +
      `Completed: ${cp.completed?.join(', ') || 'none'}\n` +
      `Pending: ${cp.pending?.join(', ')}\n` +
      `Current step: ${cp.current}\n` +
      `Started: ${cp.startedAt}\n\n` +
      `**DO NOT re-plan. Run: node bin/factory-runner.cjs --resume**`
    );
  }
} catch {}

try {
  const wp = JSON.parse(fs.readFileSync(wpFile, 'utf-8'));
  if (wp.task && wp.pending && wp.pending.length > 0) {
    checkpointSection = section('!!RESUME!! — Work In Progress',
      `Task: ${wp.task}\n` +
      `Completed: ${(wp.completed || []).join(', ') || 'none'}\n` +
      `Pending: ${(wp.pending || []).join(', ')}\n` +
      `Files: ${(wp.files || []).join(', ')}\n` +
      `Context: ${JSON.stringify(wp.context || {})}\n` +
      `Resume hint: ${wp.resumeHint || 'Continue from first pending step'}\n\n` +
      `**DO NOT re-plan. Continue from the first pending step.**`
    );
  }
} catch {}

// i18n health
let i18nHealth = 'unknown';
try {
  const r = run('node scripts/i18n-inject.cjs --check 2>&1 | tail -3');
  i18nHealth = r || 'check failed';
} catch { i18nHealth = 'check unavailable'; }

// Uncommitted changes summary
const changedFiles = status ? status.split('\n').map(l => l.trim()).filter(Boolean) : [];
const changesSummary = changedFiles.length > 0
  ? `${changedFiles.length} files modified:\n${changedFiles.slice(0, 10).map(f => `  ${f}`).join('\n')}${changedFiles.length > 10 ? `\n  ... and ${changedFiles.length - 10} more` : ''}`
  : 'Working tree clean';

// ── Build context ──
const context = [
  '# .mycelium-context — Auto-generated Session Brain',
  `# Generated: ${new Date().toISOString()}`,
  `# Branch: ${branch} | Ahead of main: ${ahead}`,
  '',
  checkpointSection,
  section('Git State',
    `Branch: ${branch}\n` +
    `Ahead of main: ${ahead} commits\n` +
    `${changesSummary}\n\n` +
    `Recent commits:\n${log}`
  ),
  section('i18n Health', i18nHealth),
  section('Anti-Stall Reminders',
    `1. NEVER dump verbose command output — always pipe through | tail -5\n` +
    `2. Use parallel tool calls for independent edits\n` +
    `3. Write large files directly — don't build code in chat\n` +
    `4. Save checkpoint before multi-step tasks\n` +
    `5. Use node bin/mycelium.cjs ship "msg" for deploy — never manual git push`
  ),
  section('Token Budget',
    `DANGER files (never read whole):\n` +
    `  mycelium.cjs     230KB  ~58K tokens\n` +
    `  memory.json       183KB  ~46K tokens\n` +
    `  watch.json        380KB  ~95K tokens\n` +
    `  nwg-the-game.html 457KB  ~115K tokens\n` +
    `  index.html        206KB  ~52K tokens\n\n` +
    `ALWAYS grep first, read specific sections only.`
  ),
  section('Quick Commands',
    `node bin/factory-runner.cjs --status    # pipeline status\n` +
    `node bin/factory-runner.cjs --validate  # check everything\n` +
    `node bin/factory-runner.cjs --heal      # auto-fix issues\n` +
    `node bin/factory-runner.cjs --full "msg" # full pipeline\n` +
    `node bin/mycelium.cjs ship "msg"        # deploy\n` +
    `node bin/agent-brief.cjs --quick        # instant project state`
  ),
].filter(Boolean).join('\n');

fs.writeFileSync(OUT, context);
console.log(`  ✓ .mycelium-context generated (${(context.length / 1024).toFixed(1)}KB)`);
