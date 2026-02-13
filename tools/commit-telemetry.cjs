#!/usr/bin/env node
/**
 * Commit Telemetry Collector v1.0
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Captures a structured telemetry record on every commit, build,
 * or on-demand run — feeding the mining system time-series data
 * it currently lacks.
 * 
 * DATA COLLECTED PER RECORD:
 *   1. Commit metadata   — hash, type, scope, files changed, lines +/-
 *   2. Build metrics     — bundle size (KB), build time (ms), asset count
 *   3. Sentinel delta    — composite score, per-module scores, new/fixed issues
 *   4. Test results      — which suites ran, pass/fail counts, duration
 *   5. File complexity   — top files by line count, function count
 *   6. Velocity stats    — commits/hour, files/commit, churn rate
 * 
 * STORAGE:
 *   .mycelium/telemetry.json  — append-only time-series (capped at 500 entries)
 *   Rotated entries archived to .mycelium/telemetry-archive.json
 * 
 * USAGE:
 *   node tools/commit-telemetry.cjs                  # Collect for latest commit
 *   node tools/commit-telemetry.cjs --build          # Add build metrics to latest record
 *   node tools/commit-telemetry.cjs --report         # Print summary dashboard
 *   node tools/commit-telemetry.cjs --trend          # Show score/size trend
 *   node tools/commit-telemetry.cjs --json           # Output latest record as JSON
 *   node tools/commit-telemetry.cjs --export         # Export full dataset
 *   node tools/commit-telemetry.cjs --stats          # Aggregate statistics
 * 
 * HOOK INTEGRATION:
 *   Called from .husky/post-commit as Step 7
 *   Called from build script with --build flag
 * 
 * @version 1.0.0
 * Zero dependencies — uses only Node.js built-ins + git CLI.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════

const VERSION = '1.0.0';
const MAX_ENTRIES = 500;
const ARCHIVE_BATCH = 100;  // Move this many to archive when rotating
const ROOT = path.resolve(__dirname, '..');
const TELEMETRY_FILE = path.join(ROOT, '.mycelium', 'telemetry.json');
const ARCHIVE_FILE = path.join(ROOT, '.mycelium', 'telemetry-archive.json');
const SENTINEL_REPORT = path.join(ROOT, 'public', 'static', 'data', 'sentinel-report.json');
const SENTINEL_HISTORY = path.join(ROOT, 'public', 'static', 'data', 'sentinel-history.json');

const COMMIT_TYPES = ['feat', 'fix', 'refactor', 'style', 'docs', 'test', 'build', 'ci', 'chore', 'perf', 'revert'];

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

function run(cmd, fallback = '') {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 15000 }).trim();
  } catch {
    return fallback;
  }
}

function readJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJSON(filepath, data) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function parseConventionalCommit(msg) {
  const match = msg.match(/^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)/);
  if (match) {
    return {
      type: match[1],
      scope: match[2] || null,
      breaking: !!match[3],
      subject: match[4]
    };
  }
  // Fallback: detect type from prefix
  const lower = msg.toLowerCase();
  for (const t of COMMIT_TYPES) {
    if (lower.startsWith(t)) return { type: t, scope: null, breaking: false, subject: msg };
  }
  return { type: 'other', scope: null, breaking: false, subject: msg };
}

function grade(score) {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
}

// ════════════════════════════════════════════════════════════════════
// COLLECTORS
// ════════════════════════════════════════════════════════════════════

function collectCommitData() {
  const hash = run('git rev-parse --short HEAD');
  const fullHash = run('git rev-parse HEAD');
  const msg = run('git log -1 --pretty=format:"%s"');
  const author = run('git log -1 --pretty=format:"%an"');
  const date = run('git log -1 --pretty=format:"%aI"');
  const branch = run('git rev-parse --abbrev-ref HEAD');
  
  // Parse conventional commit
  const parsed = parseConventionalCommit(msg);
  
  // File stats from this commit
  const diffStat = run('git diff --shortstat HEAD~1 HEAD 2>/dev/null', '');
  const filesChanged = parseInt((diffStat.match(/(\d+) files? changed/) || [, '0'])[1]);
  const insertions = parseInt((diffStat.match(/(\d+) insertions?/) || [, '0'])[1]);
  const deletions = parseInt((diffStat.match(/(\d+) deletions?/) || [, '0'])[1]);
  
  // Changed file list with categories
  const changedFiles = run('git diff --name-only HEAD~1 HEAD 2>/dev/null', '')
    .split('\n').filter(Boolean);
  
  // Categorize changed files
  const fileCategories = {};
  for (const f of changedFiles) {
    let cat = 'other';
    if (f.endsWith('.html')) cat = 'html';
    else if (f.endsWith('.css')) cat = 'css';
    else if (f.endsWith('.js') || f.endsWith('.cjs') || f.endsWith('.mjs')) cat = 'javascript';
    else if (f.endsWith('.ts') || f.endsWith('.tsx')) cat = 'typescript';
    else if (f.endsWith('.json')) cat = 'json';
    else if (f.endsWith('.md')) cat = 'docs';
    else if (f.startsWith('.husky/') || f.startsWith('.github/')) cat = 'config';
    else if (f.startsWith('tests/')) cat = 'tests';
    else if (f.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) cat = 'images';
    fileCategories[cat] = (fileCategories[cat] || 0) + 1;
  }
  
  // Commit position in history
  const commitCount = parseInt(run('git rev-list --count HEAD 2>/dev/null', '0'));
  
  // Hour of day (for velocity analysis)
  const hour = new Date(date).getHours();
  const dayOfWeek = new Date(date).getDay();
  
  return {
    hash,
    fullHash,
    message: msg,
    author,
    date,
    branch,
    commitNumber: commitCount,
    parsed,
    diff: {
      filesChanged,
      insertions,
      deletions,
      netLines: insertions - deletions,
      churnRate: filesChanged > 0 ? Math.round((insertions + deletions) / filesChanged) : 0
    },
    changedFiles: changedFiles.slice(0, 50), // Cap at 50 for storage
    fileCategories,
    velocity: {
      hour,
      dayOfWeek
    }
  };
}

function collectSentinelData() {
  // Try to read current sentinel report
  const report = readJSON(SENTINEL_REPORT);
  if (!report) return null;
  
  const summary = report.summary || {};
  const modules = report.modules || {};
  
  // Extract module scores
  const moduleScores = {};
  const moduleIssues = {};
  if (typeof modules === 'object' && !Array.isArray(modules)) {
    for (const [name, data] of Object.entries(modules)) {
      if (data && typeof data === 'object') {
        moduleScores[name] = data.score || 0;
        moduleIssues[name] = Array.isArray(data.issues) ? data.issues.length : 0;
      }
    }
  }
  
  const composite = summary.composite || summary.healthScore || 0;
  const totalIssues = Object.values(moduleIssues).reduce((a, b) => a + b, 0);
  
  // Count issues by severity
  const issueSeverity = { critical: 0, warning: 0, info: 0 };
  if (typeof modules === 'object') {
    for (const mod of Object.values(modules)) {
      if (mod && Array.isArray(mod.issues)) {
        for (const issue of mod.issues) {
          const sev = issue.severity || 'info';
          issueSeverity[sev] = (issueSeverity[sev] || 0) + 1;
        }
      }
    }
  }
  
  return {
    composite,
    grade: grade(composite),
    moduleScores,
    moduleIssues,
    totalIssues,
    issueSeverity,
    version: report.version || '?'
  };
}

function collectBuildMetrics() {
  // Check dist directory
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) return null;
  
  // Worker bundle size
  const workerPath = path.join(distDir, '_worker.js');
  let bundleSizeKB = 0;
  if (fs.existsSync(workerPath)) {
    bundleSizeKB = Math.round(fs.statSync(workerPath).size / 1024);
  }
  
  // Count dist files
  let distFileCount = 0;
  let distSizeMB = 0;
  try {
    const output = run(`find ${distDir} -type f | wc -l`);
    distFileCount = parseInt(output) || 0;
    const sizeOutput = run(`du -sm ${distDir} 2>/dev/null`);
    distSizeMB = parseFloat(sizeOutput) || 0;
  } catch {}
  
  // Check for build timing from vite output (if available in env)
  const buildTime = process.env.BUILD_TIME_MS ? parseInt(process.env.BUILD_TIME_MS) : null;
  
  return {
    bundleSizeKB,
    distFileCount,
    distSizeMB,
    buildTimeMs: buildTime,
    timestamp: Date.now()
  };
}

function collectTestResults() {
  // Check for smoke test report
  const smokeReport = readJSON(path.join(ROOT, '.mycelium', 'smoke-report.json'));
  
  // Check for test output files
  const results = {
    smokeTest: null,
    pcpCompliance: null,
    lastRun: null
  };
  
  if (smokeReport) {
    results.smokeTest = {
      passed: smokeReport.passed || 0,
      failed: smokeReport.failed || 0,
      total: smokeReport.total || 0,
      timestamp: smokeReport.timestamp || null
    };
  }
  
  // Check PCP validator
  const pcpFile = path.join(ROOT, 'tests', 'pcp-validator.cjs');
  if (fs.existsSync(pcpFile)) {
    results.pcpCompliance = { available: true };
  }
  
  results.lastRun = Date.now();
  return results;
}

function collectFileComplexity() {
  // Top source files by line count
  const sourceFiles = [];
  
  const srcDir = path.join(ROOT, 'src');
  if (fs.existsSync(srcDir)) {
    const output = run(`find ${srcDir} -name '*.ts' -o -name '*.tsx' | head -30`);
    for (const f of output.split('\n').filter(Boolean)) {
      try {
        const content = fs.readFileSync(f, 'utf8');
        const lines = content.split('\n').length;
        const functions = (content.match(/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>|(?:async\s+)?\w+\s*\([^)]*\)\s*\{)/g) || []).length;
        const imports = (content.match(/^import\s/gm) || []).length;
        sourceFiles.push({
          file: path.relative(ROOT, f),
          lines,
          functions,
          imports
        });
      } catch {}
    }
  }
  
  // Top public JS files by size
  const publicJSFiles = [];
  const staticDir = path.join(ROOT, 'public', 'static');
  if (fs.existsSync(staticDir)) {
    const output = run(`find ${staticDir} -name '*.js' -type f | head -20`);
    for (const f of output.split('\n').filter(Boolean)) {
      try {
        const stats = fs.statSync(f);
        publicJSFiles.push({
          file: path.relative(ROOT, f),
          sizeKB: Math.round(stats.size / 1024)
        });
      } catch {}
    }
  }
  
  // Sort by lines/size descending, take top 10
  sourceFiles.sort((a, b) => b.lines - a.lines);
  publicJSFiles.sort((a, b) => b.sizeKB - a.sizeKB);
  
  return {
    sourceFiles: sourceFiles.slice(0, 10),
    publicJSFiles: publicJSFiles.slice(0, 10),
    totalSourceLines: sourceFiles.reduce((a, b) => a + b.lines, 0),
    totalPublicJSKB: publicJSFiles.reduce((a, b) => a + b.sizeKB, 0)
  };
}

function collectVelocityStats() {
  // Commits in last 24h
  const last24h = parseInt(run('git rev-list --count --since="24 hours ago" HEAD 2>/dev/null', '0'));
  
  // Commits in last 7 days
  const last7d = parseInt(run('git rev-list --count --since="7 days ago" HEAD 2>/dev/null', '0'));
  
  // Average files per commit (last 10 commits)
  const filesPerCommit = run(
    'git log --oneline --shortstat -10 2>/dev/null | grep "file" | awk \'{sum+=$1; n++} END {print int(sum/n)}\'',
    '0'
  );
  
  // Total commits
  const totalCommits = parseInt(run('git rev-list --count HEAD 2>/dev/null', '0'));
  
  return {
    commitsLast24h: last24h,
    commitsLast7d: last7d,
    avgFilesPerCommit: parseInt(filesPerCommit) || 0,
    totalCommits
  };
}

// ════════════════════════════════════════════════════════════════════
// DELTA COMPUTATION — compare to previous record
// ════════════════════════════════════════════════════════════════════

function computeDelta(current, previous) {
  if (!previous) return null;
  
  const delta = {};
  
  // Sentinel score delta
  if (current.sentinel && previous.sentinel) {
    delta.scoreDelta = current.sentinel.composite - previous.sentinel.composite;
    delta.issuesDelta = current.sentinel.totalIssues - previous.sentinel.totalIssues;
    
    // Per-module deltas
    delta.moduleDeltas = {};
    const currMods = current.sentinel.moduleScores || {};
    const prevMods = previous.sentinel.moduleScores || {};
    for (const mod of Object.keys(currMods)) {
      if (prevMods[mod] !== undefined) {
        const d = currMods[mod] - prevMods[mod];
        if (d !== 0) delta.moduleDeltas[mod] = d;
      }
    }
  }
  
  // Build size delta
  if (current.build && previous.build) {
    delta.bundleDelta = current.build.bundleSizeKB - previous.build.bundleSizeKB;
  }
  
  // Complexity delta
  if (current.complexity && previous.complexity) {
    delta.sourceLinesDelta = current.complexity.totalSourceLines - previous.complexity.totalSourceLines;
  }
  
  return delta;
}

// ════════════════════════════════════════════════════════════════════
// STORAGE — read/write/rotate
// ════════════════════════════════════════════════════════════════════

function loadTelemetry() {
  const data = readJSON(TELEMETRY_FILE);
  if (data && Array.isArray(data.records)) return data;
  return { version: VERSION, records: [], created: new Date().toISOString() };
}

function saveTelemetry(data) {
  data.version = VERSION;
  data.lastUpdated = new Date().toISOString();
  data.recordCount = data.records.length;
  writeJSON(TELEMETRY_FILE, data);
}

function rotateTelemetry(data) {
  if (data.records.length <= MAX_ENTRIES) return data;
  
  // Move oldest ARCHIVE_BATCH records to archive
  const toArchive = data.records.splice(0, ARCHIVE_BATCH);
  
  // Append to archive file
  const archive = readJSON(ARCHIVE_FILE) || { version: VERSION, records: [], created: new Date().toISOString() };
  archive.records.push(...toArchive);
  archive.lastUpdated = new Date().toISOString();
  archive.recordCount = archive.records.length;
  writeJSON(ARCHIVE_FILE, archive);
  
  return data;
}

// ════════════════════════════════════════════════════════════════════
// MAIN COLLECTION
// ════════════════════════════════════════════════════════════════════

function collectRecord(mode = 'commit') {
  const record = {
    id: `tel-${Date.now()}`,
    timestamp: Date.now(),
    date: new Date().toISOString(),
    mode, // 'commit', 'build', 'manual'
    collector: `commit-telemetry@${VERSION}`
  };
  
  // Always collect commit data
  record.commit = collectCommitData();
  
  // Always collect sentinel data (reads last report)
  record.sentinel = collectSentinelData();
  
  // Build metrics only if --build or dist exists recently
  if (mode === 'build' || process.argv.includes('--build')) {
    record.build = collectBuildMetrics();
  }
  
  // Tests — lightweight check
  record.tests = collectTestResults();
  
  // File complexity
  record.complexity = collectFileComplexity();
  
  // Velocity
  record.velocity = collectVelocityStats();
  
  // Load existing data and compute delta
  const telemetry = loadTelemetry();
  const prevRecord = telemetry.records.length > 0 
    ? telemetry.records[telemetry.records.length - 1] 
    : null;
  record.delta = computeDelta(record, prevRecord);
  
  // Append and save
  telemetry.records.push(record);
  const rotated = rotateTelemetry(telemetry);
  saveTelemetry(rotated);
  
  return record;
}

// ════════════════════════════════════════════════════════════════════
// BUILD MODE — update last record with build metrics
// ════════════════════════════════════════════════════════════════════

function updateBuildMetrics() {
  const telemetry = loadTelemetry();
  if (telemetry.records.length === 0) {
    // No record to update, create one
    return collectRecord('build');
  }
  
  const last = telemetry.records[telemetry.records.length - 1];
  last.build = collectBuildMetrics();
  last.mode = last.mode === 'commit' ? 'commit+build' : last.mode;
  
  // Re-collect sentinel (it may have been regenerated during build)
  last.sentinel = collectSentinelData();
  
  // Recompute delta
  const prev = telemetry.records.length > 1 
    ? telemetry.records[telemetry.records.length - 2] 
    : null;
  last.delta = computeDelta(last, prev);
  
  saveTelemetry(telemetry);
  return last;
}

// ════════════════════════════════════════════════════════════════════
// REPORTING
// ════════════════════════════════════════════════════════════════════

function printReport() {
  const telemetry = loadTelemetry();
  const records = telemetry.records;
  
  if (records.length === 0) {
    console.log('No telemetry data yet. Run after a commit or build.');
    return;
  }
  
  const latest = records[records.length - 1];
  const first = records[0];
  
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════════════╗');
  console.log('  ║           COMMIT TELEMETRY DASHBOARD v' + VERSION + '               ║');
  console.log('  ╠══════════════════════════════════════════════════════════════╣');
  console.log(`  ║  Records: ${records.length}/${MAX_ENTRIES}   Span: ${first.date?.slice(0,10) || '?'} → ${latest.date?.slice(0,10) || '?'}`);
  console.log('  ╠══════════════════════════════════════════════════════════════╣');
  
  // Latest commit
  if (latest.commit) {
    const c = latest.commit;
    console.log(`  ║  LATEST: ${c.hash} [${c.parsed?.type || '?'}] ${c.message?.slice(0, 45) || '?'}`);
    console.log(`  ║  Files: ${c.diff?.filesChanged || 0}  +${c.diff?.insertions || 0}/-${c.diff?.deletions || 0}  Churn: ${c.diff?.churnRate || 0}`);
  }
  
  // Health
  if (latest.sentinel) {
    const s = latest.sentinel;
    const delta = latest.delta?.scoreDelta;
    const deltaStr = delta ? ` (${delta > 0 ? '+' : ''}${delta})` : '';
    console.log(`  ║  Health: ${s.composite} ${s.grade}${deltaStr}  Issues: ${s.totalIssues} (${s.issueSeverity?.critical || 0} critical)`);
    
    // Module scores compact
    const mods = Object.entries(s.moduleScores || {})
      .map(([k, v]) => `${k.slice(0, 4)}:${v}`)
      .join(' ');
    console.log(`  ║  Modules: ${mods}`);
  }
  
  // Build
  if (latest.build) {
    const b = latest.build;
    const delta = latest.delta?.bundleDelta;
    const deltaStr = delta ? ` (${delta > 0 ? '+' : ''}${delta} KB)` : '';
    console.log(`  ║  Bundle: ${b.bundleSizeKB} KB${deltaStr}  Dist: ${b.distFileCount} files`);
  }
  
  // Velocity
  if (latest.velocity) {
    const v = latest.velocity;
    console.log(`  ║  Velocity: ${v.commitsLast24h}/24h  ${v.commitsLast7d}/7d  avg ${v.avgFilesPerCommit} files/commit`);
  }
  
  // Trend (last 5)
  console.log('  ╠══════════════════════════════════════════════════════════════╣');
  console.log('  ║  RECENT TREND (last 5):');
  const last5 = records.slice(-5);
  for (const r of last5) {
    const hash = r.commit?.hash || '?';
    const score = r.sentinel?.composite || '?';
    const type = r.commit?.parsed?.type || '?';
    const files = r.commit?.diff?.filesChanged || 0;
    const delta = r.delta?.scoreDelta;
    const arrow = delta > 0 ? '+' : delta < 0 ? '' : '=';
    console.log(`  ║   ${hash} [${type}] score:${score}${delta ? ` ${arrow}${delta}` : ''} files:${files}`);
  }
  
  // Aggregates
  console.log('  ╠══════════════════════════════════════════════════════════════╣');
  const commitTypes = {};
  let totalFiles = 0, totalInsertions = 0, totalDeletions = 0;
  for (const r of records) {
    const t = r.commit?.parsed?.type || 'other';
    commitTypes[t] = (commitTypes[t] || 0) + 1;
    totalFiles += r.commit?.diff?.filesChanged || 0;
    totalInsertions += r.commit?.diff?.insertions || 0;
    totalDeletions += r.commit?.diff?.deletions || 0;
  }
  
  const typesStr = Object.entries(commitTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, v]) => `${k}:${v}`)
    .join(' ');
  console.log(`  ║  AGGREGATES (${records.length} records):`);
  console.log(`  ║  Types: ${typesStr}`);
  console.log(`  ║  Total: ${totalFiles} files  +${totalInsertions}/-${totalDeletions}`);
  
  // Score range
  const scores = records.map(r => r.sentinel?.composite).filter(s => s != null);
  if (scores.length > 1) {
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    console.log(`  ║  Health: min=${min} avg=${avg} max=${max}`);
  }
  
  console.log('  ╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

function printTrend() {
  const telemetry = loadTelemetry();
  const records = telemetry.records;
  
  if (records.length < 2) {
    console.log('Need at least 2 records for trend. Current: ' + records.length);
    return;
  }
  
  console.log('');
  console.log('  TELEMETRY TREND');
  console.log('  ═══════════════════════════════════════════════════');
  console.log('  Hash     Type     Score  Delta  Bundle  Files  +/-');
  console.log('  ───────  ───────  ─────  ─────  ──────  ─────  ──────');
  
  for (const r of records.slice(-20)) {
    const hash = (r.commit?.hash || '?').padEnd(7);
    const type = (r.commit?.parsed?.type || '?').padEnd(7);
    const score = String(r.sentinel?.composite || '?').padStart(5);
    const delta = r.delta?.scoreDelta;
    const deltaStr = (delta != null ? `${delta > 0 ? '+' : ''}${delta}` : '-').padStart(5);
    const bundle = r.build ? `${r.build.bundleSizeKB}KB`.padStart(6) : '     -';
    const files = String(r.commit?.diff?.filesChanged || 0).padStart(5);
    const net = r.commit?.diff?.netLines;
    const netStr = (net != null ? `${net > 0 ? '+' : ''}${net}` : '-').padStart(6);
    
    console.log(`  ${hash}  ${type}  ${score}  ${deltaStr}  ${bundle}  ${files}  ${netStr}`);
  }
  
  console.log('  ═══════════════════════════════════════════════════');
  console.log('');
}

function printStats() {
  const telemetry = loadTelemetry();
  const records = telemetry.records;
  
  if (records.length === 0) {
    console.log('No data.');
    return;
  }
  
  // Commit type distribution
  const types = {};
  const hourDist = new Array(24).fill(0);
  const dayDist = new Array(7).fill(0);
  const scopes = {};
  let fixCount = 0, featCount = 0;
  let totalChurn = 0;
  
  for (const r of records) {
    const t = r.commit?.parsed?.type || 'other';
    types[t] = (types[t] || 0) + 1;
    if (t === 'fix') fixCount++;
    if (t === 'feat') featCount++;
    
    const scope = r.commit?.parsed?.scope;
    if (scope) scopes[scope] = (scopes[scope] || 0) + 1;
    
    const h = r.commit?.velocity?.hour;
    if (h != null) hourDist[h]++;
    const d = r.commit?.velocity?.dayOfWeek;
    if (d != null) dayDist[d]++;
    
    totalChurn += r.commit?.diff?.churnRate || 0;
  }
  
  console.log('');
  console.log('  TELEMETRY STATS');
  console.log('  ═══════════════════════════════════════════════════');
  console.log(`  Records: ${records.length}  Fix ratio: ${records.length > 0 ? Math.round(fixCount / records.length * 100) : 0}%`);
  console.log(`  Avg churn/file: ${records.length > 0 ? Math.round(totalChurn / records.length) : 0} lines`);
  console.log('');
  
  // Type breakdown
  console.log('  Type Distribution:');
  const sortedTypes = Object.entries(types).sort((a, b) => b[1] - a[1]);
  for (const [t, c] of sortedTypes) {
    const bar = '█'.repeat(Math.min(c, 40));
    console.log(`    ${t.padEnd(10)} ${String(c).padStart(3)} ${bar}`);
  }
  
  // Top scopes
  if (Object.keys(scopes).length > 0) {
    console.log('');
    console.log('  Top Scopes:');
    const sortedScopes = Object.entries(scopes).sort((a, b) => b[1] - a[1]).slice(0, 10);
    for (const [s, c] of sortedScopes) {
      console.log(`    ${s.padEnd(15)} ${c}`);
    }
  }
  
  // Peak hours
  const peakHour = hourDist.indexOf(Math.max(...hourDist));
  console.log('');
  console.log(`  Peak commit hour: ${peakHour}:00 (${hourDist[peakHour]} commits)`);
  
  // Score volatility
  const scores = records.map(r => r.sentinel?.composite).filter(s => s != null);
  if (scores.length > 1) {
    let volatility = 0;
    for (let i = 1; i < scores.length; i++) {
      volatility += Math.abs(scores[i] - scores[i - 1]);
    }
    volatility = Math.round(volatility / (scores.length - 1) * 10) / 10;
    console.log(`  Score volatility: ${volatility} (avg change per commit)`);
  }
  
  console.log('  ═══════════════════════════════════════════════════');
  console.log('');
}

function printJSON() {
  const telemetry = loadTelemetry();
  const latest = telemetry.records[telemetry.records.length - 1];
  if (latest) {
    console.log(JSON.stringify(latest, null, 2));
  } else {
    console.log('{}');
  }
}

function printExport() {
  const telemetry = loadTelemetry();
  console.log(JSON.stringify(telemetry, null, 2));
}

// ════════════════════════════════════════════════════════════════════
// CLI
// ════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  Commit Telemetry Collector v${VERSION}
  
  USAGE:
    node tools/commit-telemetry.cjs             Collect for latest commit
    node tools/commit-telemetry.cjs --build     Update latest record with build metrics
    node tools/commit-telemetry.cjs --report    Print summary dashboard
    node tools/commit-telemetry.cjs --trend     Show score/size trend table
    node tools/commit-telemetry.cjs --stats     Aggregate statistics
    node tools/commit-telemetry.cjs --json      Output latest record as JSON
    node tools/commit-telemetry.cjs --export    Export full dataset as JSON
  `);
  process.exit(0);
}

if (args.includes('--report')) {
  printReport();
} else if (args.includes('--trend')) {
  printTrend();
} else if (args.includes('--stats')) {
  printStats();
} else if (args.includes('--json')) {
  printJSON();
} else if (args.includes('--export')) {
  printExport();
} else if (args.includes('--build')) {
  const record = updateBuildMetrics();
  if (!args.includes('--silent')) {
    const score = record.sentinel?.composite || '?';
    const bundle = record.build?.bundleSizeKB || '?';
    const delta = record.delta?.scoreDelta;
    const deltaStr = delta ? ` (${delta > 0 ? '+' : ''}${delta})` : '';
    console.log(`  [telemetry] Build recorded — score: ${score}${deltaStr}, bundle: ${bundle} KB`);
  }
} else {
  // Default: collect for latest commit
  const record = collectRecord(args.includes('--manual') ? 'manual' : 'commit');
  if (!args.includes('--silent')) {
    const hash = record.commit?.hash || '?';
    const type = record.commit?.parsed?.type || '?';
    const score = record.sentinel?.composite || '?';
    const files = record.commit?.diff?.filesChanged || 0;
    const delta = record.delta?.scoreDelta;
    const deltaStr = delta ? ` (${delta > 0 ? '+' : ''}${delta})` : '';
    console.log(`  [telemetry] ${hash} [${type}] — score: ${score}${deltaStr}, files: ${files}`);
  }
}
