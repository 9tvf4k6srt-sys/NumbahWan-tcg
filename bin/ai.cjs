#!/usr/bin/env node
/**
 * bin/ai.cjs — Unified CLI for AI agents working on NumbahWan TCG
 * ================================================================
 * ONE entry point. Routes to the right underlying tool.
 *
 * Why this exists: the repo has 100+ npm scripts and 40+ mycelium/sentinel
 * flags. An AI arriving fresh needs a single surface that's self-documenting.
 *
 * Usage: node bin/ai.cjs <command> [args]
 *        node bin/ai.cjs           (shows help)
 *
 * Commands map 1:1 to underlying tools — no wrapping magic, just routing.
 * If you need an exotic flag, the underlying CLIs still work directly.
 *
 * Canonical reference: AI_PLAYBOOK.md
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const ARGS = process.argv.slice(2);
const CMD  = ARGS[0];
const REST = ARGS.slice(1);

// ─── Colors (skip if not TTY) ──────────────────────────────────────────
const C = process.stdout.isTTY ? {
  r: '\x1b[0m', b: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', mag: '\x1b[35m',
} : Object.fromEntries(['r','b','dim','cyan','green','yellow','red','mag'].map(k => [k, '']));

// ─── Helpers ───────────────────────────────────────────────────────────
function run(bin, args, opts = {}) {
  const r = spawnSync(bin, args, { stdio: 'inherit', cwd: ROOT, ...opts });
  process.exit(r.status || 0);
}
function runNode(script, args) { return run('node', [script, ...args]); }
function exists(p) { try { fs.accessSync(path.join(ROOT, p)); return true; } catch { return false; } }
function println(...a) { process.stdout.write(a.join(' ') + '\n'); }

// ─── Commands ──────────────────────────────────────────────────────────
const COMMANDS = {

  // ── onboarding / context ──────────────────────────────────────────
  brief: {
    desc: 'Project snapshot (~500 tokens, JSON) — run at session start',
    run: () => runNode('bin/agent-brief.cjs', ['--quick']),
  },
  context: {
    desc: 'Deep context (~5K tokens) — structured state for agents',
    run: () => runNode('bin/agent-brief.cjs', ['--onboard']),
  },
  rules: {
    desc: 'Hard constraints — things that WILL break the build',
    run: () => runNode('bin/agent-brief.cjs', ['--rules']),
  },
  health: {
    desc: 'Project health score (sentinel dashboard)',
    run: () => runNode('bin/agent-brief.cjs', ['--health']),
  },
  playbook: {
    desc: 'Print path to AI_PLAYBOOK.md — read this file first',
    run: () => {
      const p = path.join(ROOT, 'AI_PLAYBOOK.md');
      if (exists('AI_PLAYBOOK.md')) {
        println(`${C.cyan}AI_PLAYBOOK.md${C.r} → ${p}`);
        println(`${C.dim}cat AI_PLAYBOOK.md${C.r}`);
      } else {
        println(`${C.red}AI_PLAYBOOK.md missing${C.r}`);
        process.exit(1);
      }
    },
  },

  // ── memory / learning (mycelium) ─────────────────────────────────
  premortem: {
    desc: 'What broke last time in <area> (battle, i18n, nav, economy, ...)',
    usage: 'premortem <area>',
    run: () => {
      if (!REST[0]) return errUsage('premortem', 'premortem <area>');
      runNode('mycelium.cjs', ['--premortem', REST[0]]);
    },
  },
  whyfile: {
    desc: 'Why is <file> the way it is? (past breakages + decisions)',
    usage: 'whyfile <path>',
    run: () => {
      if (!REST[0]) return errUsage('whyfile', 'whyfile <path>');
      runNode('mycelium.cjs', ['--whyfile', REST[0]]);
    },
  },
  memory: {
    desc: 'Memory operations: decide/constraint/broke/query/checkpoint/wip',
    usage: 'memory <decide|constraint|broke|learned|query|status|checkpoint|wip|wip-done> [args...]',
    run: () => {
      const sub = REST[0];
      const subArgs = REST.slice(1);
      if (!sub) {
        println(`${C.b}Memory operations${C.r}`);
        println(`  ${C.cyan}query${C.r}                          Full project intel dump`);
        println(`  ${C.cyan}status${C.r}                         Current session state`);
        println(`  ${C.cyan}decide "<area>" "<what>" "<why>"${C.r}   Record a choice`);
        println(`  ${C.cyan}constraint "<area>" "<fact>"${C.r}       Record a hard rule`);
        println(`  ${C.cyan}broke "<area>" "<what happened>"${C.r}   Record a breakage`);
        println(`  ${C.cyan}learned "<area>" "<lesson>"${C.r}        Record a fix-learning`);
        println(`  ${C.cyan}checkpoint '<json>'${C.r}               Save multi-step task state`);
        println(`  ${C.cyan}wip "<text>"${C.r}                      Quick single-step WIP`);
        println(`  ${C.cyan}wip-done${C.r}                          Clear checkpoint + WIP`);
        return;
      }
      // All memory subcommands map to mycelium.cjs --flag
      const FLAG = { decide:'--decide', constraint:'--constraint', broke:'--broke',
        learned:'--learned', query:'--query', status:'--status',
        checkpoint:'--checkpoint', wip:'--wip', 'wip-done':'--wip-done',
        'wip-append':'--wip-append', postfix:'--postfix' };
      const flag = FLAG[sub];
      if (!flag) {
        println(`${C.red}Unknown memory subcommand: ${sub}${C.r}`);
        println(`Try: ${Object.keys(FLAG).join(' | ')}`);
        process.exit(1);
      }
      runNode('mycelium.cjs', [flag, ...subArgs]);
    },
  },

  // ── guardian (sentinel) ──────────────────────────────────────────
  guard: {
    desc: 'Design + i18n + include validation (same as pre-commit check)',
    run: () => runNode('sentinel.cjs', ['--guard']),
  },
  heal: {
    desc: 'Auto-fix known issues (sentinel self-heal)',
    run: () => runNode('sentinel.cjs', ['--heal']),
  },

  // ── deploy ────────────────────────────────────────────────────────
  ship: {
    desc: 'Atomic deploy: auth → test → sync → squash → push → PR → merge',
    usage: 'ship "feat(area): message"',
    run: () => {
      if (!REST[0]) return errUsage('ship', 'ship "feat(area): your message"');
      runNode('bin/mycelium.cjs', ['ship', ...REST]);
    },
  },

  // ── discovery / learning from repo ────────────────────────────────
  examples: {
    desc: 'List canonical examples to copy when building new things',
    run: () => {
      println(`${C.b}Canonical examples in this repo${C.r} (copy these patterns)\n`);
      const ex = [
        ['Standalone Hono site w/ TDD', 'rulai-temple/', 'TDD from day 1, trilingual, content-driven'],
        ['Multi-language page',          'public/world/nwg-the-game.html', 'data-i18n + NW_I18N.register({en,zh,th})'],
        ['Shared JS module',             'public/static/nw-i18n-core.js',  'IIFE, queue-based shim, header docs'],
        ['DOM test',                     'rulai-temple/tests/trilingual.test.ts', 'vitest + jsdom, RED→GREEN'],
        ['Hono routes test',             'rulai-temple/tests/hono-routes.test.ts', 'structure + asset tests'],
        ['Git hook',                     '.husky/pre-commit', 'TS gate + mycelium auto-guard'],
        ['API route',                    'src/routes/pages.ts', 'ASSETS.fetch + fs fallback'],
        ['NW page template',             'public/guild-siege.html', 'ember #ff6b00, NumbahWan font'],
        ['KINTSUGI page template',       'public/kintsugi.html', 'gold #c9a84c, Cormorant Garamond'],
      ];
      const maxName = Math.max(...ex.map(e => e[0].length));
      const maxPath = Math.max(...ex.map(e => e[1].length));
      for (const [name, p, why] of ex) {
        const ok = exists(p.replace(/\/$/, ''));
        const mark = ok ? `${C.green}✓${C.r}` : `${C.red}✗${C.r}`;
        println(`  ${mark} ${C.cyan}${name.padEnd(maxName)}${C.r}  ${p.padEnd(maxPath)}  ${C.dim}${why}${C.r}`);
      }
      println(`\n${C.dim}Full playbook: AI_PLAYBOOK.md · Run:${C.r} node bin/ai.cjs playbook`);
    },
  },
  learn: {
    desc: 'Show the canonical repo example for <pattern>',
    usage: 'learn <page|module|test|hook|route|site>',
    run: () => {
      const topic = REST[0];
      const MAP = {
        page:   { path: 'public/world/nwg-the-game.html', why: 'content-heavy trilingual NW page' },
        module: { path: 'public/static/nw-i18n-core.js',  why: 'shared JS module (IIFE + queue shim)' },
        test:   { path: 'rulai-temple/tests/trilingual.test.ts', why: 'DOM test w/ vitest + jsdom' },
        hook:   { path: '.husky/pre-commit', why: 'git hook with TS gate + mycelium guards' },
        route:  { path: 'src/routes/pages.ts', why: 'Hono route w/ ASSETS + fs fallback' },
        site:   { path: 'rulai-temple/', why: 'standalone site w/ TDD + trilingual' },
        nw:     { path: 'public/guild-siege.html', why: 'NW brand page template' },
        kintsugi: { path: 'public/kintsugi.html', why: 'KINTSUGI brand page template' },
      };
      if (!topic || !MAP[topic]) {
        println(`${C.b}Canonical examples by topic:${C.r}`);
        for (const [k, v] of Object.entries(MAP))
          println(`  ${C.cyan}${k.padEnd(9)}${C.r} ${v.path.padEnd(40)} ${C.dim}${v.why}${C.r}`);
        println(`\n${C.dim}Usage: node bin/ai.cjs learn <topic>${C.r}`);
        return;
      }
      const { path: p, why } = MAP[topic];
      println(`${C.b}Canonical ${topic}:${C.r} ${C.cyan}${p}${C.r}`);
      println(`${C.dim}Why:${C.r} ${why}\n`);
      // Show file if it's small, else head
      const full = path.join(ROOT, p);
      if (!exists(p.replace(/\/$/, ''))) {
        println(`${C.red}File not found: ${p}${C.r}`);
        process.exit(1);
      }
      if (p.endsWith('/')) {
        run('ls', ['-la', full]);
      } else {
        const stat = fs.statSync(full);
        if (stat.size > 8000) {
          println(`${C.dim}(file is ${(stat.size/1024).toFixed(1)}KB — showing first 60 lines)${C.r}`);
          run('head', ['-60', full]);
        } else {
          run('cat', [full]);
        }
      }
    },
  },

  // ── dev / test ────────────────────────────────────────────────────
  dev: {
    desc: 'Start dev server (port 3000, static, 0.0.0.0)',
    run: () => run('node', ['serve.cjs']),
  },
  test: {
    desc: 'Run full test suite',
    run: () => run('npm', ['test']),
  },

  // ── audit / refactor info ────────────────────────────────────────
  audit: {
    desc: 'Show the last refactor audit (AUDIT-*.md)',
    run: () => {
      const audits = fs.readdirSync(ROOT).filter(f => /^AUDIT-.*\.md$/.test(f)).sort();
      if (!audits.length) { println(`${C.yellow}No AUDIT-*.md found${C.r}`); return; }
      const latest = audits[audits.length - 1];
      println(`${C.b}Latest audit:${C.r} ${C.cyan}${latest}${C.r}\n`);
      run('cat', [path.join(ROOT, latest)]);
    },
  },
};

// ─── Help ──────────────────────────────────────────────────────────────
function help() {
  println(`${C.b}${C.mag}bin/ai.cjs${C.r} — unified CLI for NumbahWan TCG AI agents`);
  println(`${C.dim}Read AI_PLAYBOOK.md first. Everything routes through here.${C.r}\n`);

  const groups = {
    'Onboarding':   ['brief', 'context', 'rules', 'health', 'playbook'],
    'Memory':       ['premortem', 'whyfile', 'memory'],
    'Guardian':     ['guard', 'heal'],
    'Deploy':       ['ship'],
    'Learn from repo': ['examples', 'learn'],
    'Dev':          ['dev', 'test', 'audit'],
  };

  for (const [group, cmds] of Object.entries(groups)) {
    println(`${C.yellow}${group}${C.r}`);
    for (const c of cmds) {
      const def = COMMANDS[c];
      if (!def) continue;
      const usage = def.usage || c;
      println(`  ${C.cyan}${usage.padEnd(38)}${C.r} ${def.desc}`);
    }
    println('');
  }

  println(`${C.dim}Examples:${C.r}`);
  println(`  node bin/ai.cjs brief`);
  println(`  node bin/ai.cjs premortem battle`);
  println(`  node bin/ai.cjs learn test`);
  println(`  node bin/ai.cjs memory decide "nav" "lazy-load panel" "mobile FPS"`);
  println(`  node bin/ai.cjs ship "feat(forge): new rune system"`);
  println('');
  println(`${C.dim}For flags not listed here, underlying CLIs still work:${C.r}`);
  println(`  ${C.dim}node mycelium.cjs --<flag>    # 42 flags${C.r}`);
  println(`  ${C.dim}node sentinel.cjs --<flag>    # 11 flags${C.r}`);
}

function errUsage(cmd, usage) {
  println(`${C.red}Usage: node bin/ai.cjs ${usage}${C.r}`);
  process.exit(1);
}

// ─── Main ──────────────────────────────────────────────────────────────
if (!CMD || CMD === 'help' || CMD === '--help' || CMD === '-h') {
  help();
  process.exit(0);
}

if (!COMMANDS[CMD]) {
  println(`${C.red}Unknown command: ${CMD}${C.r}\n`);
  help();
  process.exit(1);
}

COMMANDS[CMD].run();
