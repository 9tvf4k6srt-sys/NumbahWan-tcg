#!/usr/bin/env node
/**
 * Factory Core v1.0 — Shared Utilities for ALL Factory Tools
 * 
 * Every factory tool imports this instead of re-defining colors, run(), etc.
 * Single source of truth for:
 *   - Console colors & logging (ok, fail, warn, info, debug, header)
 *   - Command execution (run, runQuiet, runTimed, runParallel)
 *   - Event emission (emit to event-bus)
 *   - Structured JSON output (for piping between tools)
 *   - Timing helpers (timer, humanDuration)
 *   - File helpers (readJSON, writeJSON, ensureDir)
 *   - Spec type registry (what the factory can build)
 *
 * Usage:
 *   const core = require('./factory-core.cjs');
 *   core.ok('Build complete');
 *   const r = core.run('npx vite build');
 *   core.emit('build_complete', { duration: r.duration_ms });
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MYCELIUM_DIR = path.join(ROOT, '.mycelium');
const EVENTS_FILE = path.join(MYCELIUM_DIR, 'events.jsonl');
const LOG_DIR = path.join(MYCELIUM_DIR, 'factory-logs');

// ═══════════════════════════════════════════════════════════════
// 1. CONSOLE COLORS & LOGGING
// ═══════════════════════════════════════════════════════════════
const B = '\x1b[1m';
const G = '\x1b[32m';
const R = '\x1b[31m';
const Y = '\x1b[33m';
const C = '\x1b[36m';
const M = '\x1b[35m';
const D = '\x1b[2m';
const X = '\x1b[0m';

const ok    = m => console.log(`  ${G}\u2713${X} ${m}`);
const fail  = m => console.log(`  ${R}\u2717${X} ${m}`);
const warn  = m => console.log(`  ${Y}\u26a0${X} ${m}`);
const info  = m => console.log(`  ${C}\u2139${X} ${m}`);
const debug = m => { if (process.env.FACTORY_DEBUG) console.log(`  ${D}[debug] ${m}${X}`); };
const header = (icon, title) => console.log(`\n${B}${icon} ${title}${X}\n`);
const divider = () => console.log(`  ${'─'.repeat(50)}`);
const table = (rows) => {
  if (!rows.length) return;
  const maxKey = Math.max(...rows.map(r => r[0].length));
  rows.forEach(([k, v]) => console.log(`  ${C}${k.padEnd(maxKey)}${X}  ${v}`));
};

// ═══════════════════════════════════════════════════════════════
// 2. COMMAND EXECUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Run a shell command synchronously. Returns { ok, stdout, stderr, code, duration_ms }
 */
function run(cmd, opts = {}) {
  const timeout = opts.timeout || 120000;
  const start = Date.now();
  try {
    const stdout = execSync(cmd, {
      cwd: opts.cwd || ROOT,
      encoding: 'utf-8',
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return { ok: true, stdout, stderr: '', code: 0, duration_ms: Date.now() - start };
  } catch (e) {
    return {
      ok: false,
      stdout: (e.stdout || '').trim(),
      stderr: (e.stderr || '').trim(),
      code: e.status || 1,
      duration_ms: Date.now() - start,
    };
  }
}

/**
 * Run a command, log output to factory-logs/<label>.log, show only tail on failure
 */
function runQuiet(cmd, label, opts = {}) {
  ensureDir(LOG_DIR);
  const logFile = path.join(LOG_DIR, `${label}.log`);
  const result = run(cmd, opts);
  const logContent = `CMD: ${cmd}\nEXIT: ${result.code}\nDURATION: ${result.duration_ms}ms\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`;
  fs.writeFileSync(logFile, logContent);
  debug(`${label}: ${result.ok ? 'OK' : 'FAIL'} (${result.duration_ms}ms)`);
  if (!result.ok) {
    fail(`${label} failed (exit ${result.code}, ${humanDuration(result.duration_ms)}) \u2014 see .mycelium/factory-logs/${label}.log`);
    const lines = (result.stderr || result.stdout || '').trim().split('\n');
    const tail = lines.slice(-3).join('\n');
    if (tail) console.log(`    ${R}${tail}${X}`);
  }
  return result;
}

/**
 * Run a command with timing display
 */
function runTimed(cmd, label, opts = {}) {
  const start = Date.now();
  info(`${label}...`);
  const result = runQuiet(cmd, label.replace(/[^a-z0-9_-]/gi, '-').toLowerCase(), opts);
  const elapsed = humanDuration(Date.now() - start);
  if (result.ok) ok(`${label} \u2014 ${elapsed}`);
  return result;
}

/**
 * Run multiple commands in parallel (where safe)
 */
function runParallel(tasks) {
  // Note: execSync is blocking, so we simulate parallel by running sequentially
  // but timing each independently. True parallelism would need child_process.spawn.
  const results = [];
  for (const t of tasks) {
    const r = runQuiet(t.cmd, t.label);
    results.push({ label: t.label, ...r });
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════
// 3. EVENT BUS INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Emit an event to the unified event bus
 */
function emit(system, event, data = {}, severity = 'info') {
  const record = {
    ts: Date.now(),
    date: new Date().toISOString(),
    system,
    event,
    severity,
    data,
  };
  try {
    ensureDir(MYCELIUM_DIR);
    fs.appendFileSync(EVENTS_FILE, JSON.stringify(record) + '\n');
    debug(`Event emitted: ${system}.${event}`);
  } catch (e) {
    debug(`Event emission failed: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. TIMING HELPERS
// ═══════════════════════════════════════════════════════════════

function timer() {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
    human: () => humanDuration(Date.now() - start),
    ms: () => Date.now() - start,
  };
}

function humanDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m${Math.round((ms % 60000) / 1000)}s`;
}

// ═══════════════════════════════════════════════════════════════
// 5. FILE HELPERS
// ═══════════════════════════════════════════════════════════════

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
  catch { return null; }
}

function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function fileExists(fp) {
  return fs.existsSync(fp);
}

function fileSizeKB(fp) {
  try { return Math.round(fs.statSync(fp).size / 1024); } catch { return 0; }
}

// ═══════════════════════════════════════════════════════════════
// 6. STRUCTURED OUTPUT
// ═══════════════════════════════════════════════════════════════

/**
 * Create a structured result object for machine-readable pipeline output
 */
function createResult(stepName, opts = {}) {
  const start = Date.now();
  return {
    step: stepName,
    status: 'pending',
    startedAt: new Date().toISOString(),
    duration_ms: 0,
    details: {},
    errors: [],
    warnings: [],

    pass(msg, details = {}) {
      this.status = 'pass';
      this.duration_ms = Date.now() - start;
      this.details = { message: msg, ...details };
      ok(`${stepName}: ${msg} (${humanDuration(this.duration_ms)})`);
      return this;
    },

    error(msg, details = {}) {
      this.status = 'fail';
      this.duration_ms = Date.now() - start;
      this.errors.push(msg);
      this.details = { message: msg, ...details };
      fail(`${stepName}: ${msg}`);
      return this;
    },

    warning(msg) {
      this.warnings.push(msg);
      warn(`${stepName}: ${msg}`);
      return this;
    },

    toJSON() {
      return {
        step: this.step,
        status: this.status,
        duration_ms: this.duration_ms,
        details: this.details,
        errors: this.errors,
        warnings: this.warnings,
      };
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// 7. SPEC TYPE REGISTRY — What the factory can build
// ═══════════════════════════════════════════════════════════════

const SPEC_TYPES = {
  'dlc-page': {
    name: 'DLC Page',
    description: 'Game DLC / expansion content page with hero, boss, lore, features',
    requiredFields: ['type', 'slug', 'title', 'theme', 'hero'],
    optionalFields: ['dlc', 'explore', 'i18n'],
    outputDir: 'public/world',
    template: 'dlc',
    i18nDefault: true,
  },
  'lore-page': {
    name: 'Lore Page',
    description: 'Story / lore / backstory page with narrative sections',
    requiredFields: ['type', 'slug', 'title', 'theme', 'hero'],
    optionalFields: ['explore', 'chapters', 'i18n'],
    outputDir: 'public/lore',
    template: 'lore',
    i18nDefault: true,
  },
  'landing-page': {
    name: 'Landing Page',
    description: 'Marketing / product landing page with CTA sections',
    requiredFields: ['type', 'slug', 'title', 'theme', 'hero', 'sections'],
    optionalFields: ['cta', 'testimonials', 'pricing', 'i18n'],
    outputDir: 'public',
    template: 'landing',
    i18nDefault: false,
  },
  'app-page': {
    name: 'App Page',
    description: 'Application / dashboard page with functional components',
    requiredFields: ['type', 'slug', 'title', 'layout', 'components'],
    optionalFields: ['api', 'auth', 'theme', 'i18n'],
    outputDir: 'public/app',
    template: 'app',
    i18nDefault: false,
  },
  'docs-page': {
    name: 'Documentation Page',
    description: 'Documentation / reference page with code examples',
    requiredFields: ['type', 'slug', 'title', 'sections'],
    optionalFields: ['sidebar', 'search', 'versions', 'i18n'],
    outputDir: 'public/docs',
    template: 'docs',
    i18nDefault: false,
  },
  'feature-page': {
    name: 'Feature Page',
    description: 'Feature showcase page with demos and specifications',
    requiredFields: ['type', 'slug', 'title', 'theme', 'hero'],
    optionalFields: ['demo', 'specs', 'i18n'],
    outputDir: 'public/features',
    template: 'feature',
    i18nDefault: true,
  },
  'world-page': {
    name: 'World / Zone Page',
    description: 'Game world / zone / area page with environment details',
    requiredFields: ['type', 'slug', 'title', 'theme', 'hero'],
    optionalFields: ['explore', 'map', 'encounters', 'i18n'],
    outputDir: 'public/world',
    template: 'world',
    i18nDefault: true,
  },
};

/**
 * Validate a spec against its type schema
 */
function validateSpec(spec) {
  const errors = [];
  const warnings = [];
  const suggestions = [];

  if (!spec.type) {
    errors.push({ field: 'type', msg: 'Missing "type" field', fix: `Add type: dlc-page (options: ${Object.keys(SPEC_TYPES).join(', ')})` });
    return { valid: false, errors, warnings, suggestions };
  }

  const typeConfig = SPEC_TYPES[spec.type];
  if (!typeConfig) {
    errors.push({
      field: 'type',
      msg: `Unknown spec type: ${spec.type}`,
      fix: `Valid types: ${Object.keys(SPEC_TYPES).join(', ')}`,
    });
    return { valid: false, errors, warnings, suggestions };
  }

  // Check required fields
  for (const field of typeConfig.requiredFields) {
    if (!spec[field]) {
      errors.push({
        field,
        msg: `Missing required field: ${field}`,
        fix: `Add "${field}:" to your spec YAML`,
      });
    }
  }

  // Check slug format
  if (spec.slug && !/^[a-z0-9-]+$/.test(spec.slug)) {
    errors.push({ field: 'slug', msg: 'Slug must be lowercase alphanumeric with hyphens', fix: `Change to: ${spec.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` });
  }

  // Check title length
  if (spec.title && spec.title.length > 80) {
    warnings.push({ field: 'title', msg: `Title too long (${spec.title.length} chars)`, fix: 'Keep title under 80 characters' });
  }

  // Suggest i18n
  if (typeConfig.i18nDefault && !spec.i18n) {
    suggestions.push({ field: 'i18n', msg: 'This page type supports i18n', fix: 'Add i18n: auto' });
  }

  // Theme validation
  if (spec.theme && spec.theme.primary) {
    if (!/^#[0-9a-fA-F]{6}$/.test(spec.theme.primary)) {
      errors.push({ field: 'theme.primary', msg: 'Invalid hex color', fix: 'Use format: #ff6b00' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    type: typeConfig,
  };
}

// ═══════════════════════════════════════════════════════════════
// 8. EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Paths
  ROOT,
  MYCELIUM_DIR,
  EVENTS_FILE,
  LOG_DIR,

  // Colors
  B, G, R, Y, C, M, D, X,

  // Logging
  ok, fail, warn, info, debug, header, divider, table,

  // Execution
  run, runQuiet, runTimed, runParallel,

  // Events
  emit,

  // Timing
  timer, humanDuration,

  // Files
  ensureDir, readJSON, writeJSON, fileExists, fileSizeKB,

  // Structured output
  createResult,

  // Spec types
  SPEC_TYPES, validateSpec,
};
