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
// Fire-and-forget: run a node script without exiting or surfacing output/errors.
// Used to keep the learning systems alive at session start without ever blocking.
function runQuiet(script, args = []) {
  try { spawnSync('node', [script, ...args], { stdio: 'ignore', cwd: ROOT, timeout: 8000 }); }
  catch { /* never block the caller */ }
}
// Like runNode but does NOT exit the process — returns the status so callers can
// chain several gates and aggregate the result (used by `preship`).
function runStep(script, args) {
  const r = spawnSync('node', [script, ...args], { stdio: 'inherit', cwd: ROOT });
  return r.status || 0;
}
// Same as runStep but for a Python gate.
function runPyStep(script, args) {
  const r = spawnSync('python3', [script, ...args], { stdio: 'inherit', cwd: ROOT });
  return r.status || 0;
}
function exists(p) { try { fs.accessSync(path.join(ROOT, p)); return true; } catch { return false; } }
function println(...a) { process.stdout.write(a.join(' ') + '\n'); }

// ─── Commands ──────────────────────────────────────────────────────────
const COMMANDS = {

  // ── onboarding / context ──────────────────────────────────────────
  brief: {
    desc: 'Project snapshot (~500 tokens, JSON) — run at session start',
    run: () => {
      // Session-start heartbeat: revive any learning systems that went silent
      // across chat windows. Silent + best-effort, never blocks the brief.
      runQuiet('tools/heartbeat.cjs', ['--silent']);
      runNode('bin/agent-brief.cjs', ['--quick']);
    },
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
  scorecard: {
    desc: 'Session Scorecard — efficiency, waste, catch-rate & learning trend (proof you are improving)',
    run: () => runNode('bin/session-scorecard.cjs', REST),
  },
  budget: {
    desc: 'Active token budget — declare/check/spend/status/close a per-task token contract',
    run: () => runNode('bin/token-budget.cjs', REST),
  },
  loop: {
    desc: 'Learning loop — capture/recurring/status; turns repeated escapes into permanent gates',
    run: () => runNode('bin/learn-loop.cjs', REST),
  },
  task: {
    desc: 'Context firewall — task-scoped brief (gates + past defects + files) so you skip reading the whole repo',
    usage: 'task "<what you are about to do>"',
    run: () => runNode('bin/task-brief.cjs', REST),
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

  // ── PRODUCE natural content (FORGE-DOCTRINE.md) ───────────────────
  forge: {
    desc: 'Spin up a PINFORGE-grade visual kit for ANY industry, fast: sheen-proof prompts + a whole locked kit + judge the sheen FOR you',
    usage: 'forge prompt "<scene>" | forge kit "<company> <industry>" | forge check <url> [--prompt=...] | forge doctrine',
    run: () => {
      // `forge doctrine` (or no args) prints the doctrine; everything else is the generator.
      if (REST[0] === 'doctrine' || REST.length === 0) {
        if (exists('FORGE-DOCTRINE.md')) {
          println(`${C.cyan}FORGE-DOCTRINE.md${C.r} → ${path.join(ROOT, 'FORGE-DOCTRINE.md')}`);
          println(`${C.b}Make it: specific, uneven, believable.${C.r}`);
          println(`${C.dim}Natural != messy: production spaces are tidy + well-styled. The tell is physics failure (light from nowhere, plastic/AI-smooth surfaces), not cleanliness.${C.r}`);
          println(`${C.dim}Generator: forge kit "<company> <industry>"  → start at PINFORGE's finish line.${C.r}`);
          println(`${C.dim}Judge output: forge check <url> --prompt="..."  → the one fix to feed back.${C.r}`);
          if (REST.length === 0) { println(''); runNode('tools/forge.cjs', []); }
        } else { println(`${C.red}FORGE-DOCTRINE.md missing${C.r}`); process.exit(1); }
        return;
      }
      runNode('tools/forge.cjs', REST);
    },
  },
  voice: {
    desc: 'Build a voice-locked generation prompt BEFORE you write/render/record (production-side, free, offline)',
    usage: 'voice <words|visual|audio> "<brief>" [--world=paradox|kintsugi|nw] [--json]',
    run: () => runNode('tools/voice-prep.cjs', REST),
  },

  // ── anti-AI-tell pipeline ─────────────────────────────────────────
  aitell: {
    desc: 'Inspect every production step for AI-tell (deterministic block + stylometry + LLM judge)',
    usage: 'aitell [--all|<file>...] [--judge] [--json]',
    run: () => runNode('tools/aitell-pipeline.cjs', REST),
  },
  naturalness: {
    desc: 'Score prose for human voice (burstiness/stance as positive targets, advisory; LLM read of naturalness)',
    usage: 'naturalness <file>... [--min=70] [--json]',
    run: () => runNode('tools/ai-naturalness.cjs', REST),
  },
  sheen: {
    desc: 'Check an image PROMPT for AI-sheen vocab before you generate (8k/cinematic/perfect summon the AI look)',
    usage: 'sheen "<prompt>" | sheen <file>',
    run: () => runNode('tools/ai-sheen-lint.cjs', REST),
  },
  layout: {
    desc: 'Lint the BUILD for visual AI-tell (emoji-as-icon, stock gradients, default shadows)',
    usage: 'layout [--all|<file.html>...] [--json]',
    run: () => runNode('tools/ai-layout-lint.cjs', REST),
  },
  pagesize: {
    desc: 'Monolith guardrail: flag oversized pages + heavy inline JS/CSS (advisory). Keeps future edits cheap.',
    usage: 'pagesize [--all|--baseline|<file.html>...] [--json]',
    run: () => runNode('tools/page-size-lint.cjs', REST),
  },
  assets: {
    desc: 'Transparency artifact gate: flag opaque corners + enclosed dark holes in logo/emblem assets',
    usage: 'assets [<asset.webp|png>...]   (no args = scan guild assets dir)',
    run: () => run('python3', ['tools/asset-alpha-lint.py', ...REST]),
  },
  render: {
    desc: 'Render-risk lint: catch visual bugs statically (word-fuse, mid-word break, mobile overflow, oversized headline) since screenshots are impossible here',
    usage: 'render [--strict|--all|<file.html>...] [--json]',
    run: () => runNode('tools/render-risk-lint.cjs', REST),
  },
  taste: {
    desc: 'Print the taste constitution path + one-line spine (read TASTE.md)',
    run: () => {
      if (exists('TASTE.md')) {
        println(`${C.cyan}TASTE.md${C.r} → ${path.join(ROOT, 'TASTE.md')}`);
        println(`${C.b}Precision you feel but can't see.${C.r}`);
        println(`${C.dim}Feeling: multi-billion-dollar production value as craft, not bling.${C.r}`);
        println(`${C.dim}North star: blockbuster + keynote. Enemies: hollow polish, cheap-looking.${C.r}`);
        println(`${C.dim}cat TASTE.md  ·  then the medium playbook it links to${C.r}`);
      } else { println(`${C.red}TASTE.md missing${C.r}`); process.exit(1); }
    },
  },
  efficiency: {
    desc: 'Build lean: log a slice cost-proxy or show the leanness trend (read EFFICIENCY.md)',
    usage: 'efficiency log "<task>" [--reads=N --calls=N] | efficiency trend',
    run: () => runNode('tools/efficiency-ledger.cjs', REST),
  },
  collab: {
    desc: 'The human+AI operating contract, runnable: first-principles, discernment, delegation boundary, reflection (read COLLAB-PROTOCOL.md)',
    usage: 'collab <fp|discern|boundary|reflect|audit> [args...]',
    run: () => runNode('tools/collab.cjs', REST),
  },
  pulse: {
    desc: 'Heartbeat: keep the learning systems alive across chat windows (revives silent systems). Run at session start; auto-runs in `brief`.',
    usage: 'pulse [--check|--silent|--json]',
    run: () => runNode('tools/heartbeat.cjs', REST),
  },
  sysaudit: {
    desc: 'One-shot health of the self-improvement stack: heartbeat liveness, hooks, trend signals, learning derivation, efficiency series, mining quality.',
    usage: 'sysaudit',
    run: () => {
      println(`\n${C.b}SELF-IMPROVEMENT STACK AUDIT${C.r}`);
      println('═'.repeat(58));
      println(`\n${C.b}1 · Heartbeat (systems alive across sessions)${C.r}`);
      runStep('tools/heartbeat.cjs', ['--check']);
      println(`\n${C.b}2 · Git hooks (post-commit fires the loop)${C.r}`);
      runStep('tools/install-hooks.cjs', ['--check']);
      println(`\n${C.b}3 · Trend detector (early-warning, live signal)${C.r}`);
      runStep('tools/trend-detector.cjs', []);
      println(`\n${C.b}4 · Learning loop (trends → enforceable rules)${C.r}`);
      runStep('tools/learning-loop.cjs', []);
      println(`\n${C.b}5 · Efficiency series (token / leanness over time)${C.r}`);
      runStep('tools/efficiency-ledger.cjs', ['trend', '--n=8']);
      println(`\n${C.b}6 · Mining quality${C.r}`);
      try {
        const q = JSON.parse(fs.readFileSync(path.join(ROOT, '.mycelium-mined/quality-report.json'), 'utf8'));
        println(`  overall ${q.overall}/100 (${q.grade}) — ` +
          Object.entries(q.results).map(([k, r]) => `${k}:${r.score}`).join(' · '));
      } catch { println(`  ${C.yellow}quality-report.json not found${C.r}`); }
      println('');
    },
  },
  datavalue: {
    desc: 'What the mined dataset is worth to data buyers: records, buyer-type coverage, $/record efficiency, fragment rate. Run after a build to see if mining produced sellable value.',
    usage: 'datavalue',
    run: () => {
      // Refresh the validator (cheap, reads the DB exports) and read its JSON.
      let v = null;
      try {
        const out = require('child_process').execFileSync('node',
          ['tools/validate-mined-data.cjs', '--json'], { cwd: ROOT, encoding: 'utf8' });
        v = JSON.parse(out);
      } catch { /* fall through */ }
      const s = v && v.summary ? v.summary : null;
      println(`\n${C.b}DATA VALUE — what the mine is worth to buyers${C.r}`);
      println('═'.repeat(58));
      if (!s) { println(`  ${C.yellow}no validation summary — run a build/commit first${C.r}\n`); return; }
      const buyers = s.buyerCoverage || {};
      const covered = Object.values(buyers).filter(Boolean).length;
      const buyerLine = Object.entries(buyers)
        .map(([k, ok]) => `${ok ? C.green + '✓' : C.red + '✗'}${C.r} ${k}`).join('   ');
      // Fragment rate on the highest-volume sold record type (lessons).
      let frag = null, lessons = 0;
      try {
        const lines = fs.readFileSync(path.join(ROOT, '.mycelium-mined/db/lessons.jsonl'), 'utf8')
          .trim().split('\n').filter(Boolean);
        lessons = lines.length;
        const isFrag = (t) => {
          t = String(t || '').trim(); if (t.length < 25) return true;
          const last = t.split(/\s+/).pop() || '';
          const mid = /[a-z][A-Z]/.test(last) || /[a-zA-Z]\($/.test(last) || /\.[a-zA-Z]+$/.test(last);
          return mid && !/[.!?)\]]$/.test(t);
        };
        const f = lines.reduce((n, l) => { try { return n + (isFrag(JSON.parse(l).lesson) ? 1 : 0); } catch { return n; } }, 0);
        frag = lessons ? Math.round((f / lessons) * 100) : 0;
      } catch { /* no lessons file */ }
      println(`  ${C.b}saleable records${C.r}   ${s.totalRecords}   ${C.dim}across ${s.dataProducts} products · ${s.totalSizeKB}KB${C.r}`);
      println(`  ${C.b}efficiency${C.r}         ${s.bytesPerRecord} bytes/record   ${C.dim}(lean = denser value)${C.r}`);
      println(`  ${C.b}buyer coverage${C.r}     ${covered}/4`);
      println(`     ${buyerLine}`);
      println(`  ${C.b}formats${C.r}            ${Object.entries(s.formats || {}).filter(([, n]) => n > 0).map(([k, n]) => `${k}:${n}`).join(' · ')}`);
      if (frag != null) {
        const fc = frag <= 5 ? C.green : frag <= 20 ? C.yellow : C.red;
        println(`  ${C.b}lesson quality${C.r}     ${fc}${100 - frag}% complete${C.r}   ${C.dim}(${frag}% fragments, ${lessons} lessons)${C.r}`);
      }
      println(`\n  ${C.dim}buyers: aiTools=rule engines · engineering=dashboards · cicd=gates · research=ML training${C.r}`);
      println('');
    },
  },
  hooks: {
    desc: 'Activate the tracked git hooks (.husky) so post-commit fires the heartbeat — even without Husky installed. Idempotent.',
    usage: 'hooks [--check]',
    run: () => runNode('tools/install-hooks.cjs', REST),
  },
  preship: {
    desc: 'Run the full pre-ship gate in one call: ai-tell + visual layout + page-size + render-risk + asset alpha (staged or files)',
    usage: 'preship [<file>...]   (no args = staged files, same scope as pre-commit)',
    run: () => {
      const files = REST.length ? REST : [];
      const steps = [
        ['ai-tell copy',     'tools/ai-tell-lint.cjs',  files],
        ['visual layout',    'tools/ai-layout-lint.cjs', files],
        ['page-size baseline','tools/page-size-lint.cjs', files.length ? files : ['--baseline']],
      ];
      let failed = 0;
      const failedGates = [];
      for (const [label, script, args] of steps) {
        println(`\n${C.b}── ${label} ──${C.r}`);
        const status = runStep(script, args);
        if (status !== 0) { failed++; failedGates.push(label); println(`${C.red}✗ ${label} failed (exit ${status})${C.r}`); }
      }
      // Render-risk gate: static catch for the visual bugs that cause re-see
      // loops (word-fuse, mid-word break, mobile overflow, oversized headline).
      // Screenshots are impossible in this sandbox, so this is our pre-ship eye.
      // Strict (blocks) when actual HTML files are in scope.
      const htmlFiles = files.filter(f => f.endsWith('.html'));
      if (htmlFiles.length) {
        println(`\n${C.b}── render risk ──${C.r}`);
        const status = runStep('tools/render-risk-lint.cjs', ['--strict', ...htmlFiles]);
        if (status !== 0) { failed++; failedGates.push('render risk'); println(`${C.red}✗ render risk failed (exit ${status})${C.r}`); }
      }
      // Asset transparency gate: only when a guild page (which embeds the emblem) is in scope.
      const touchesGuild = files.some(f => f.includes('guild/'));
      if (!files.length || touchesGuild) {
        println(`\n${C.b}── asset alpha ──${C.r}`);
        const status = runPyStep('tools/asset-alpha-lint.py',
          ['public/guild/brightinside/assets/paradox-emblem.webp',
           'public/guild/brightinside/assets/paradox-lockup.webp']);
        if (status !== 0) { failed++; failedGates.push('asset alpha'); println(`${C.red}✗ asset alpha failed (exit ${status})${C.r}`); }
      }
      println('');
      if (failed) {
        // Close the learning loop: every gate that caught something becomes a
        // logged defect. The SECOND time the same thing slips, learn-loop
        // auto-promotes it to a permanent gate. This is what makes the repo get
        // better as you build instead of catching the same tells forever.
        // Skipped with --no-learn (e.g. in CI where memory shouldn't mutate).
        if (!REST.includes('--no-learn')) {
          for (const g of failedGates) {
            runStep('bin/learn-loop.cjs', ['capture', g.split(' ')[0], `${g} gate flagged something pre-ship`, '--severity=high']);
          }
          println(`${C.dim}↳ ${failedGates.length} failure(s) captured to the learning loop (repeats become permanent gates).${C.r}`);
        }
        println(`${C.red}preship: ${failed} gate(s) failed — fix before shipping.${C.r}`);
        process.exit(1);
      }
      println(`${C.cyan}preship: all gates clean — ready to ship.${C.r}`);
      process.exit(0);
    },
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
    'Onboarding':   ['brief', 'context', 'rules', 'health', 'task', 'scorecard', 'budget', 'playbook', 'taste', 'efficiency', 'collab', 'pulse', 'hooks'],
    'Produce':      ['forge', 'voice', 'naturalness', 'sheen'],
    'Memory':       ['premortem', 'whyfile', 'memory', 'loop'],
    'Guardian':     ['guard', 'heal', 'aitell', 'layout', 'pagesize', 'assets', 'render', 'preship'],
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
