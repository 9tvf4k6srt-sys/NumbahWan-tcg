#!/usr/bin/env node
/**
 * NW MCP Tool Server v1.0
 * 
 * Exposes the project's npm scripts as MCP (Model Context Protocol) tools
 * so any AI agent (Claude, Cursor, Copilot) can call them programmatically.
 *
 * Protocol: JSON-RPC 2.0 over stdin/stdout (MCP standard)
 *
 * Usage:
 *   node bin/mcp-server.cjs              # start MCP server (stdin/stdout)
 *   node bin/mcp-server.cjs --list       # list available tools
 *   node bin/mcp-server.cjs --call <tool> [args]  # call a tool directly (for testing)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const B = '\x1b[1m', G = '\x1b[32m', R = '\x1b[31m', X = '\x1b[0m';

// ── Tool Registry ──
const TOOLS = {
  // === Build & Deploy ===
  'factory.status': {
    description: 'Show factory pipeline status — active pipelines, i18n health, git state',
    command: 'node bin/factory-runner.cjs --status',
    category: 'build',
  },
  'factory.validate': {
    description: 'Validate all pages: i18n coverage, sentinel guard, link integrity',
    command: 'node bin/factory-runner.cjs --validate',
    category: 'build',
  },
  'factory.heal': {
    description: 'Auto-fix detected issues: missing translations, sentinel warnings',
    command: 'node bin/factory-runner.cjs --heal',
    category: 'build',
  },
  'factory.full': {
    description: 'Run full pipeline: validate → translate → inject → test → build → ship',
    command: 'node bin/factory-runner.cjs --full',
    params: { commitMsg: { type: 'string', description: 'Commit message', required: false } },
    buildCommand: (p) => `node bin/factory-runner.cjs --full "${(p.commitMsg || 'auto-ship').replace(/"/g, '\\"')}"`,
    category: 'build',
  },

  // === Page Generation ===
  'gen.page': {
    description: 'Generate ANY page from a YAML spec → HTML + i18n JSON (supports dlc, landing, app, docs, lore, feature, world)',
    command: 'node bin/page-gen.cjs',
    params: { spec: { type: 'string', description: 'Path to spec YAML file', required: true } },
    buildCommand: (p) => `node bin/page-gen.cjs "${p.spec}"`,
    category: 'generate',
  },
  'gen.page.dryrun': {
    description: 'Preview page generation without writing files',
    command: 'node bin/page-gen.cjs --dry-run',
    params: { spec: { type: 'string', description: 'Path to spec YAML file', required: true } },
    buildCommand: (p) => `node bin/page-gen.cjs "${p.spec}" --dry-run`,
    category: 'generate',
  },
  'gen.types': {
    description: 'List all supported page types the factory can build',
    command: 'node bin/page-gen.cjs --types',
    category: 'generate',
  },
  'gen.init': {
    description: 'Scaffold a new YAML spec from template (type + slug)',
    command: 'node bin/factory-init.cjs',
    params: {
      type: { type: 'string', description: 'Page type (dlc-page, landing-page, app-page, docs-page, etc.)', required: true },
      slug: { type: 'string', description: 'URL slug for the page', required: true },
      title: { type: 'string', description: 'Page title', required: false },
    },
    buildCommand: (p) => `node bin/factory-init.cjs ${p.type} ${p.slug} ${p.title ? '"' + p.title + '"' : ''}`,
    category: 'generate',
  },

  // === Diagnostics ===
  'factory.doctor': {
    description: 'Full pipeline health diagnosis — checks all tools, deps, data, specs, memory',
    command: 'node bin/factory-doctor.cjs --quick',
    category: 'diagnostics',
  },
  'factory.doctor.full': {
    description: 'Deep pipeline diagnosis including slow checks (sentinel, tests)',
    command: 'node bin/factory-doctor.cjs',
    category: 'diagnostics',
  },
  'factory.doctor.json': {
    description: 'Machine-readable pipeline diagnosis (JSON output)',
    command: 'node bin/factory-doctor.cjs --json',
    category: 'diagnostics',
  },

  // === Memory & Learning ===
  'memory.report': {
    description: 'Show factory learning report — builds, lessons, defects, patterns, generations',
    command: 'node bin/factory-memory.cjs --report',
    category: 'memory',
  },
  'memory.query': {
    description: 'Search factory memory for lessons on a topic',
    command: 'node bin/factory-memory.cjs --query',
    params: { topic: { type: 'string', description: 'Topic to search for (e.g., i18n, layout, perf)', required: true } },
    buildCommand: (p) => `node bin/factory-memory.cjs --query "${p.topic}"`,
    category: 'memory',
  },
  'memory.evolve': {
    description: 'Evolve factory templates — derive new rules from accumulated lessons',
    command: 'node bin/factory-memory.cjs --evolve',
    category: 'memory',
  },
  'memory.checklist': {
    description: 'Pre-build checklist generated from past lessons and defects',
    command: 'node bin/factory-memory.cjs --checklist',
    category: 'memory',
  },

  // === i18n ===
  'i18n.inject': {
    description: 'Inject PAGE_I18N translations from .i18n.json files into HTML',
    command: 'node scripts/i18n-inject.cjs',
    category: 'i18n',
  },
  'i18n.check': {
    description: 'Check i18n coverage: HTML keys vs JSON keys, missing translations',
    command: 'node scripts/i18n-inject.cjs --check',
    category: 'i18n',
  },
  'i18n.translate': {
    description: 'Auto-translate missing zh/th entries using dictionary',
    command: 'node scripts/i18n-translate.cjs',
    category: 'i18n',
  },
  'i18n.guard': {
    description: 'Run i18n guard tests on all pages',
    command: 'node tests/nw-i18n-guard.cjs',
    category: 'i18n',
  },

  // === Testing ===
  'test.smoke': {
    description: 'Run smoke tests on all pages — checks rendering, links, assets',
    command: 'node tests/run-tests.cjs',
    category: 'test',
  },
  'test.unit': {
    description: 'Run unit tests with Vitest',
    command: 'npx vitest run',
    category: 'test',
  },

  // === Quality ===
  'guardian.status': {
    description: 'Run sentinel guardian — health scores, issues, trend',
    command: 'node sentinel.cjs 2>&1 | tail -20',
    category: 'quality',
  },
  'guardian.heal': {
    description: 'Auto-heal issues found by sentinel',
    command: 'node sentinel.cjs --heal 2>&1 | tail -10',
    category: 'quality',
  },
  'guardian.guard': {
    description: 'Run design + i18n guard checks',
    command: 'node sentinel.cjs --guard 2>&1 | tail -10',
    category: 'quality',
  },
  'scorecard': {
    description: 'Run quality scorecard on all pages — i18n, perf, accessibility',
    command: 'node bin/quality-scorecard.cjs',
    category: 'quality',
  },

  // === Mycelium ===
  'mycelium.brief': {
    description: 'Get quick project state summary for agent context',
    command: 'node bin/agent-brief.cjs --quick',
    category: 'mycelium',
  },
  'mycelium.premortem': {
    description: 'Get risk analysis for a specific area before modifying it',
    command: 'node mycelium.cjs --premortem',
    params: { area: { type: 'string', description: 'Area name (battle, i18n, nav, etc.)', required: true } },
    buildCommand: (p) => `node mycelium.cjs --premortem ${p.area}`,
    category: 'mycelium',
  },
  'mycelium.ship': {
    description: 'Atomic deploy: commit → test → auth → push → PR → merge',
    command: 'node bin/mycelium.cjs ship',
    params: { message: { type: 'string', description: 'Commit message', required: false } },
    buildCommand: (p) => `node bin/mycelium.cjs ship "${(p.message || 'auto-ship').replace(/"/g, '\\"')}"`,
    category: 'mycelium',
  },

  // === Context ===
  'context.gen': {
    description: 'Regenerate .mycelium-context for session startup',
    command: 'node bin/gen-context.cjs',
    category: 'context',
  },
  'context.read': {
    description: 'Read current .mycelium-context (session brain dump)',
    command: 'cat .mycelium-context 2>/dev/null || echo "No context file"',
    category: 'context',
  },

  // === Git ===
  'git.status': {
    description: 'Git status — modified files, branch, ahead/behind',
    command: 'echo "Branch: $(git branch --show-current)" && echo "Ahead: $(git rev-list --count origin/main..HEAD 2>/dev/null || echo ?)" && git status --short | head -20',
    category: 'git',
  },
  'git.log': {
    description: 'Recent git log (last 10 commits)',
    command: 'git log --oneline -10',
    category: 'git',
  },
};

// ── Execute a tool ──
function executeTool(name, params = {}) {
  const tool = TOOLS[name];
  if (!tool) return { error: `Unknown tool: ${name}` };

  const cmd = tool.buildCommand ? tool.buildCommand(params) : tool.command;
  try {
    const stdout = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 120000,
      maxBuffer: 5 * 1024 * 1024,
    });
    return { result: stdout.trim() };
  } catch (e) {
    return {
      error: `Command failed (exit ${e.status})`,
      stdout: (e.stdout || '').trim().split('\n').slice(-10).join('\n'),
      stderr: (e.stderr || '').trim().split('\n').slice(-5).join('\n'),
    };
  }
}

// ── MCP JSON-RPC handler ──
function handleRequest(req) {
  switch (req.method) {
    case 'initialize':
      return {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'nw-factory', version: '1.0.0' },
      };

    case 'tools/list':
      return {
        tools: Object.entries(TOOLS).map(([name, t]) => ({
          name,
          description: t.description,
          inputSchema: {
            type: 'object',
            properties: t.params ? Object.fromEntries(
              Object.entries(t.params).map(([k, v]) => [k, { type: v.type, description: v.description }])
            ) : {},
            required: t.params ? Object.entries(t.params).filter(([, v]) => v.required).map(([k]) => k) : [],
          },
        })),
      };

    case 'tools/call': {
      const { name, arguments: params } = req.params;
      return { content: [{ type: 'text', text: JSON.stringify(executeTool(name, params)) }] };
    }

    default:
      return { error: { code: -32601, message: `Method not found: ${req.method}` } };
  }
}

// ── CLI mode ──
const cliArgs = process.argv.slice(2);

if (cliArgs.includes('--list')) {
  console.log(`\n${B}🏭 NW MCP Tool Server — Available Tools${X}\n`);
  const byCategory = {};
  Object.entries(TOOLS).forEach(([name, t]) => {
    (byCategory[t.category] = byCategory[t.category] || []).push({ name, ...t });
  });
  Object.entries(byCategory).forEach(([cat, tools]) => {
    console.log(`  ${B}${cat.toUpperCase()}${X}`);
    tools.forEach(t => console.log(`    ${G}${t.name}${X}  ${t.description}`));
    console.log('');
  });
  process.exit(0);
}

if (cliArgs.includes('--call')) {
  const idx = cliArgs.indexOf('--call');
  const toolName = cliArgs[idx + 1];
  if (!toolName) { console.log('Usage: --call <tool> [--param value]'); process.exit(1); }
  
  // Parse params from remaining args
  const params = {};
  for (let i = idx + 2; i < cliArgs.length; i += 2) {
    if (cliArgs[i].startsWith('--')) {
      params[cliArgs[i].replace('--', '')] = cliArgs[i + 1];
    }
  }
  
  const result = executeTool(toolName, params);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.error ? 1 : 0);
}

// ── MCP stdio mode (default) ──
if (!process.stdin.isTTY || cliArgs.length === 0) {
  // If stdin is a TTY and no args, show help
  if (process.stdin.isTTY) {
    console.log(`\n${B}🏭 NW MCP Tool Server v1.0${X}\n`);
    console.log(`Usage:`);
    console.log(`  node bin/mcp-server.cjs --list           # list tools`);
    console.log(`  node bin/mcp-server.cjs --call <tool>    # call a tool`);
    console.log(`  node bin/mcp-server.cjs                  # start MCP server (stdin/stdout)`);
    console.log(`\nTo use with Claude/Cursor, add to MCP config:`);
    console.log(`  { "command": "node", "args": ["${path.join(ROOT, 'bin/mcp-server.cjs')}"] }`);
    process.exit(0);
  }

  // MCP stdio mode
  const rl = readline.createInterface({ input: process.stdin });
  rl.on('line', (line) => {
    try {
      const req = JSON.parse(line);
      const result = handleRequest(req);
      const response = { jsonrpc: '2.0', id: req.id };
      if (result.error?.code) response.error = result.error;
      else response.result = result;
      process.stdout.write(JSON.stringify(response) + '\n');
    } catch (e) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0', id: null,
        error: { code: -32700, message: 'Parse error' },
      }) + '\n');
    }
  });
}
