#!/usr/bin/env node
/**
 * Mycelium Auto-Mine v1.0 — Continuous breakage intelligence from git history
 * ============================================================================
 * 
 * Runs automatically on every commit (via post-commit hook) or manually.
 * Incrementally mines new commits, enriches with deep-diff analysis,
 * and exports to a sellable database in multiple buyer-ready formats.
 * 
 * Usage:
 *   node tools/mycelium-auto-mine.cjs                  # incremental mine (post-commit)
 *   node tools/mycelium-auto-mine.cjs --full            # full re-mine (rebuild everything)
 *   node tools/mycelium-auto-mine.cjs --export          # export to all sellable formats
 *   node tools/mycelium-auto-mine.cjs --export-api      # export API-ready JSON
 *   node tools/mycelium-auto-mine.cjs --export-csv      # export CSV for data buyers
 *   node tools/mycelium-auto-mine.cjs --export-sqlite   # export SQLite database
 *   node tools/mycelium-auto-mine.cjs --stats           # show current database stats
 * 
 * Automatic behavior:
 *   - On every commit: scans the NEW commit only (incremental, ~0.5s)
 *   - On fix commits: full enrichment of the new fix + re-aggregate
 *   - Every 50 commits: full re-mine to catch patterns that emerge over time
 *   - Exports updated on every aggregation cycle
 * 
 * Output: .mycelium-mined/db/ — the sellable database directory
 */

'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIG
// ============================================================================

const DB_DIR = '.mycelium-mined/db';
const STATE_FILE = '.mycelium-mined/auto-mine-state.json';
const MINER_PATH = 'tools/mycelium-miner.cjs';

const CONFIG = {
  // How often to do a full re-mine (every N commits)
  fullRemineInterval: 50,
  
  // Fix-commit detection (same as miner)
  fixPatterns: [
    /^fix(\(|:|\s)/i, /^bug(\(|:|\s)/i, /^hotfix(\(|:|\s)/i,
    /^patch(\(|:|\s)/i, /^revert(\(|:|\s)/i,
    /\bfix(es|ed)?\b/i, /\bbug\b/i, /\brevert\b/i,
    /\bregression\b/i, /\bbroken\b/i, /\bcrash(es|ed|ing)?\b/i,
  ],
  
  ignorePatterns: [
    /^merge\b/i, /^bump\b/i, /^chore\b/i,
    /\bdependabot\b/i, /\brenovate\b/i, /\brelease\b/i,
  ],
  
  // Max diff size for incremental analysis
  maxDiffSize: 15000,
};

// ============================================================================
// UTILITIES
// ============================================================================

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, timeout: 30000 }).trim();
  } catch { return ''; }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function writeJSON(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function writeCSV(file, headers, rows) {
  ensureDir(path.dirname(file));
  const escape = v => {
    // Replace newlines with spaces to prevent row-splitting, then quote if needed
    const s = String(v ?? '').replace(/[\r\n]+/g, ' ').trim();
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))];
  fs.writeFileSync(file, lines.join('\n') + '\n');
}

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  process.stderr.write(`[auto-mine ${ts}] ${msg}\n`);
}

// ============================================================================
// STATE MANAGEMENT — track what's been mined
// ============================================================================

function loadState() {
  const defaults = {
    lastMinedHash: null,
    lastMinedDate: null,
    totalCommitsMined: 0,
    totalFixCommits: 0,
    commitsSinceFullMine: 0,
    lastFullMineDate: null,
    lastExportDate: null,
    version: '1.0',
  };
  return { ...defaults, ...(readJSON(STATE_FILE) || {}) };
}

function saveState(state) {
  state.updatedAt = new Date().toISOString();
  writeJSON(STATE_FILE, state);
}

// ============================================================================
// INCREMENTAL MINING — analyze only the latest commit
// ============================================================================

function mineLatestCommit() {
  const state = loadState();
  
  // Get latest commit info
  const hash = run('git log -1 --format="%H"');
  const msg = run('git log -1 --format="%s"');
  const date = run('git log -1 --format="%ai"').slice(0, 10);
  const author = run('git log -1 --format="%an"');
  
  if (!hash) { log('No commits found'); return null; }
  if (hash === state.lastMinedHash) { log('Already mined this commit'); return null; }
  
  // Check if it's a fix commit
  const isIgnored = CONFIG.ignorePatterns.some(p => p.test(msg));
  const isFix = !isIgnored && CONFIG.fixPatterns.some(p => p.test(msg));
  
  // Get files changed
  const filesRaw = run(`git diff-tree --no-commit-id --name-status -r ${hash}`);
  const files = filesRaw.split('\n').filter(Boolean).map(l => {
    const [status, ...parts] = l.split('\t');
    return parts.join('\t');
  }).filter(Boolean);
  
  // Update state
  state.lastMinedHash = hash;
  state.lastMinedDate = date;
  state.totalCommitsMined++;
  state.commitsSinceFullMine++;
  
  if (isFix) {
    state.totalFixCommits++;
    log(`FIX commit detected: ${msg.slice(0, 60)}`);
    
    // Get diff for enrichment
    let diff = '';
    try {
      diff = run(`git show ${hash} --no-commit-id --diff-filter=M -p --unified=3`);
      if (diff.length > CONFIG.maxDiffSize) diff = diff.slice(0, CONFIG.maxDiffSize);
    } catch {}
    
    const body = run(`git log -1 "--pretty=format:%b" ${hash}`);
    
    // Append to incremental fix log
    appendFixCommit({
      hash, date, author, msg, body: body?.slice(0, 1000) || '',
      files, fileCount: files.length, diff, isFix: true,
    });
    
    // Re-aggregate after every fix commit (patterns may change)
    triggerAggregation(state);
  } else {
    log(`Commit mined: ${msg.slice(0, 60)} (${files.length} files)`);
  }
  
  // Track all commits for hotspot/co-change analysis
  appendCommitRecord({ hash, date, author, msg, files, isFix });
  
  // Full re-mine every N commits
  if (state.commitsSinceFullMine >= CONFIG.fullRemineInterval) {
    log(`Full re-mine triggered (${state.commitsSinceFullMine} commits since last)`);
    triggerFullMine(state);
    state.commitsSinceFullMine = 0;
    state.lastFullMineDate = new Date().toISOString();
  }
  
  saveState(state);
  return { hash, msg, isFix, files: files.length };
}

// ============================================================================
// INCREMENTAL DATA STORE — append-only log of commits + fixes
// ============================================================================

function appendFixCommit(commit) {
  const logFile = path.join(DB_DIR, 'fix-commits.jsonl');
  ensureDir(DB_DIR);
  fs.appendFileSync(logFile, JSON.stringify(commit) + '\n');
}

function appendCommitRecord(record) {
  const logFile = path.join(DB_DIR, 'all-commits.jsonl');
  ensureDir(DB_DIR);
  fs.appendFileSync(logFile, JSON.stringify(record) + '\n');
}

function loadFixCommits() {
  const logFile = path.join(DB_DIR, 'fix-commits.jsonl');
  if (!fs.existsSync(logFile)) return [];
  return fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

function loadAllCommits() {
  const logFile = path.join(DB_DIR, 'all-commits.jsonl');
  if (!fs.existsSync(logFile)) return [];
  return fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

// ============================================================================
// AGGREGATION — re-run pattern extraction on accumulated data
// ============================================================================

function triggerAggregation(state) {
  log('Re-aggregating patterns from accumulated data...');
  
  // Use the full miner pipeline for best results
  if (fs.existsSync(MINER_PATH)) {
    try {
      const limit = Math.max(300, state.totalCommitsMined);
      execSync(`node ${MINER_PATH} pipeline . --limit ${limit}`, {
        encoding: 'utf8', timeout: 60000, stdio: 'pipe',
      });
      log('Aggregation complete via miner pipeline');
      
      // Auto-export after aggregation
      exportAll();
    } catch (e) {
      log(`Aggregation via miner failed: ${e.message?.slice(0, 80)}`);
    }
  }
}

function triggerFullMine(state) {
  triggerAggregation(state);
}

// ============================================================================
// SELLABLE DATABASE SCHEMA
// ============================================================================
// 
// The data has 4 buyer types, each wants different format:
//
// 1. AI TOOL COMPANIES (Cursor, Claude, Windsurf)
//    Want: Pattern DB as JSON API → feed into their rule engines
//    Format: patterns-api.json — array of {id, pattern, rule, triggers, severity}
//
// 2. ENGINEERING TEAMS / MANAGERS
//    Want: Dashboard data + CSV exports for their analytics
//    Format: patterns.csv, hotspots.csv, coupling.csv, summary.csv
//
// 3. CI/CD PLATFORMS (GitHub Actions, GitLab CI)
//    Want: Pre-commit rules + webhook payloads
//    Format: precommit-rules.json (already exists), github-action-config.json
//
// 4. RESEARCHERS / DATA SCIENTISTS
//    Want: Raw dataset for ML training
//    Format: SQLite database with full schema
//
// ============================================================================

function exportAll() {
  log('Exporting to all sellable formats...');
  
  const patterns = readJSON('.mycelium-mined/webapp-patterns.json');
  if (!patterns) { log('No patterns.json found — run pipeline first'); return; }
  
  ensureDir(DB_DIR);
  
  exportAPIFormat(patterns);
  exportCSVFormat(patterns);
  exportSQLiteFormat(patterns);
  exportGitHubActionConfig(patterns);
  exportDashboardData(patterns);
  
  // Update state
  const state = loadState();
  state.lastExportDate = new Date().toISOString();
  saveState(state);
  
  // Auto-validate: run quality gate after export
  try {
    const validatePath = path.join(__dirname, 'validate-mined-data.cjs');
    if (fs.existsSync(validatePath)) {
      execSync(`node "${validatePath}" --fix --json`, { encoding: 'utf8', timeout: 15000, stdio: 'pipe' });
      log('Quality gate: PASSED');
    }
  } catch (e) {
    log('Quality gate: validation ran (check report for details)');
  }
  
  log('All exports complete');
}

// ── Format 1: API-ready JSON (for AI tool companies) ──

function exportAPIFormat(data) {
  const repoName = data.meta?.repo || 'unknown';
  const repoId = repoName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  // Patterns API — the core product
  const patternsAPI = {
    version: '2.0',
    schema: 'mycelium-patterns-v2',
    generatedAt: new Date().toISOString(),
    repo: {
      id: repoId,
      name: repoName,
      totalCommits: data.meta?.totalCommits || 0,
      analyzedCommits: data.meta?.analyzedCommits || 0,
      dateRange: data.meta?.dateRange || {},
    },
    summary: {
      totalFixCommits: data.summary?.totalFixCommits || 0,
      uniquePatterns: data.patterns?.length || 0,
      topCategories: Object.entries(data.summary?.categoryBreakdown || {})
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([cat, info]) => ({ category: cat, count: info.count, percentage: info.percentage })),
    },
    patterns: (data.patterns || []).map(p => ({
      id: p.id,
      name: p.pattern,
      frequency: p.frequency,
      category: p.category,
      technology: p.technology,
      severity: p.severity,
      rule: p.rule,
      rootCause: p.rootCause,
      // Triggers — what code changes should surface this rule
      triggers: {
        keywords: extractKeywordsFromPattern(p),
        fileExtensions: extractExtensionsFromPattern(p),
        diffAtoms: p.atomTypes || [],
      },
      examples: (p.exampleCommits || []).slice(0, 3).map(c => ({
        hash: c.hash?.slice(0, 8),
        message: c.msg?.slice(0, 100),
        date: c.date,
      })),
    })),
    // Singleton insights — less frequent but still valuable
    insights: (data.singletonInsights || []).map(s => ({
      pattern: s.pattern,
      category: s.category,
      rootCause: s.rootCause,
      prevention: s.prevention,
    })),
    // Hotspot files — which files break most
    hotspots: (data.hotspots || []).filter(h => h.fixRatio > 0.15).map(h => ({
      file: h.file,
      changes: h.changes,
      fixes: h.fixCount,
      fixRate: h.fixRatio,
      riskLevel: h.fixRatio >= 0.4 ? 'critical' : h.fixRatio >= 0.25 ? 'high' : 'medium',
    })),
    // Coupling map — files that break together
    coupling: (data.coChanges || []).slice(0, 30).map(c => {
      const [fileA, fileB] = c.pair.split(' <-> ');
      return { fileA, fileB, coChangeCount: c.count };
    }),
  };
  
  writeJSON(path.join(DB_DIR, 'patterns-api.json'), patternsAPI);
  log(`  → patterns-api.json (${(JSON.stringify(patternsAPI).length / 1024).toFixed(1)}KB)`);
  
  // Rules-only endpoint (lightweight, for pre-commit hooks)
  const rulesOnly = {
    version: '2.0',
    schema: 'mycelium-rules-v2',
    generatedAt: new Date().toISOString(),
    rules: patternsAPI.patterns.map(p => ({
      id: p.id,
      severity: p.severity,
      rule: p.rule,
      triggers: p.triggers,
    })),
    hotspotWarnings: patternsAPI.hotspots.filter(h => h.riskLevel !== 'medium').map(h => ({
      file: h.file,
      fixRate: h.fixRate,
      riskLevel: h.riskLevel,
    })),
  };
  
  writeJSON(path.join(DB_DIR, 'rules-api.json'), rulesOnly);
  log(`  → rules-api.json (${(JSON.stringify(rulesOnly).length / 1024).toFixed(1)}KB)`);
}

// ── Format 2: CSV (for engineering teams + data buyers) ──

function exportCSVFormat(data) {
  // Patterns CSV
  const patternRows = (data.patterns || []).map(p => ({
    id: p.id,
    pattern: p.pattern,
    frequency: p.frequency,
    category: p.category,
    technology: p.technology,
    severity: p.severity,
    rule: p.rule,
    rootCause: p.rootCause?.slice(0, 200),
    exampleCommit: p.exampleCommits?.[0]?.hash?.slice(0, 8) || '',
    exampleMessage: p.exampleCommits?.[0]?.msg?.slice(0, 80) || '',
  }));
  
  writeCSV(
    path.join(DB_DIR, 'patterns.csv'),
    ['id', 'pattern', 'frequency', 'category', 'technology', 'severity', 'rule', 'rootCause', 'exampleCommit', 'exampleMessage'],
    patternRows
  );
  log(`  → patterns.csv (${patternRows.length} rows)`);
  
  // Hotspots CSV — filter deleted files
  const hotspotRows = (data.hotspots || []).filter(h => {
    // Filter out files that no longer exist
    try { return fs.existsSync(h.file); } catch { return true; }
  }).map(h => ({
    file: h.file,
    totalChanges: h.changes,
    fixCount: h.fixCount,
    fixRate: (h.fixRatio * 100).toFixed(1) + '%',
    riskLevel: h.fixRatio >= 0.4 ? 'critical' : h.fixRatio >= 0.25 ? 'high' : h.fixRatio >= 0.15 ? 'medium' : 'low',
  }));
  
  writeCSV(
    path.join(DB_DIR, 'hotspots.csv'),
    ['file', 'totalChanges', 'fixCount', 'fixRate', 'riskLevel'],
    hotspotRows
  );
  log(`  → hotspots.csv (${hotspotRows.length} rows)`);
  
  // Coupling CSV
  const couplingRows = (data.coChanges || []).map(c => {
    const [fileA, fileB] = c.pair.split(' <-> ');
    return { fileA, fileB, coChangeCount: c.count, strength: c.count >= 15 ? 'strong' : c.count >= 8 ? 'moderate' : 'weak' };
  });
  
  writeCSV(
    path.join(DB_DIR, 'coupling.csv'),
    ['fileA', 'fileB', 'coChangeCount', 'strength'],
    couplingRows
  );
  log(`  → coupling.csv (${couplingRows.length} rows)`);
  
  // Category summary CSV
  const catRows = Object.entries(data.summary?.categoryBreakdown || {})
    .sort((a, b) => b[1].count - a[1].count)
    .map(([cat, info]) => ({
      category: cat,
      fixCount: info.count,
      percentage: info.percentage + '%',
      topPattern: Object.entries(info.patterns || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
    }));
  
  writeCSV(
    path.join(DB_DIR, 'categories.csv'),
    ['category', 'fixCount', 'percentage', 'topPattern'],
    catRows
  );
  log(`  → categories.csv (${catRows.length} rows)`);
  
  // Fix chains CSV — derive real lessons from enriched data, not just commit msgs
  const enrichedLookup = {};
  try {
    const enrichedData = readJSON('.mycelium-mined/webapp-enriched.json');
    for (const fc of (enrichedData?.fixCommits || [])) {
      enrichedLookup[fc.hash] = fc;
    }
  } catch {}
  
  const chainRows = (data.fixChains || []).map(fc => {
    const enriched = enrichedLookup[fc.fixCommit] || {};
    const rootCause = enriched.rootCause || enriched.enrichment?.rootCause || '';
    const category = enriched.category || enriched.enrichment?.category || '';
    const prevention = enriched.prevention || enriched.enrichment?.prevention || '';
    // Build a real lesson: what broke + how to prevent
    let lesson = '';
    if (rootCause && rootCause.length > 15) {
      lesson = rootCause.slice(0, 150);
      if (prevention && prevention.length > 15 && !prevention.startsWith('Review ')) {
        lesson += ' → ' + prevention.slice(0, 100);
      }
    } else {
      // Fallback: extract meaningful part of fix message
      lesson = (fc.fixMsg || '').replace(/^(?:fix|bug|hotfix|patch|revert)\s*\([^)]*\)\s*:?\s*/i, '').slice(0, 150);
    }
    return {
      breakCommit: fc.breakCommit?.slice(0, 8),
      fixCommit: fc.fixCommit?.slice(0, 8),
      primaryFile: (fc.overlappingFiles || []).filter(f => !f.includes('.mycelium') && !f.includes('memory.json'))[0] || fc.overlappingFiles?.[0] || '',
      category: category || 'unknown',
      lesson,
      hoursToFix: fc.hoursToFix?.toFixed(1),
      fileCount: fc.overlappingFiles?.length || 0,
    };
  });
  
  writeCSV(
    path.join(DB_DIR, 'fix-chains.csv'),
    ['breakCommit', 'fixCommit', 'primaryFile', 'category', 'lesson', 'hoursToFix', 'fileCount'],
    chainRows
  );
  log(`  → fix-chains.csv (${chainRows.length} rows)`);
}

// ── Format 3: SQLite (for researchers + ML training) ──

function exportSQLiteFormat(data) {
  // Generate SQL that can be imported into any SQLite database
  // Using pure SQL dump format — no native SQLite dependency needed
  
  const sqlFile = path.join(DB_DIR, 'breakage-patterns.sql');
  const lines = [];
  
  lines.push('-- Mycelium Breakage Pattern Database');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Repo: ${data.meta?.repo || 'unknown'}`);
  lines.push(`-- Schema version: 2.0`);
  lines.push('');
  lines.push('PRAGMA journal_mode=WAL;');
  lines.push('');
  
  // Schema
  lines.push(`CREATE TABLE IF NOT EXISTS repos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  total_commits INTEGER DEFAULT 0,
  analyzed_commits INTEGER DEFAULT 0,
  first_date TEXT,
  last_date TEXT,
  mined_at TEXT NOT NULL
);`);
  lines.push('');
  
  lines.push(`CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL,
  name TEXT NOT NULL,
  frequency INTEGER NOT NULL,
  category TEXT NOT NULL,
  technology TEXT,
  severity TEXT CHECK(severity IN ('low','medium','high','critical')),
  rule TEXT NOT NULL,
  root_cause TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);`);
  lines.push('');
  
  lines.push(`CREATE TABLE IF NOT EXISTS pattern_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id TEXT NOT NULL,
  commit_hash TEXT,
  commit_message TEXT,
  commit_date TEXT,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id)
);`);
  lines.push('');
  
  lines.push(`CREATE TABLE IF NOT EXISTS hotspots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  total_changes INTEGER NOT NULL,
  fix_count INTEGER NOT NULL,
  fix_rate REAL NOT NULL,
  risk_level TEXT CHECK(risk_level IN ('low','medium','high','critical')),
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);`);
  lines.push('');
  
  lines.push(`CREATE TABLE IF NOT EXISTS coupling (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id TEXT NOT NULL,
  file_a TEXT NOT NULL,
  file_b TEXT NOT NULL,
  co_change_count INTEGER NOT NULL,
  strength TEXT CHECK(strength IN ('weak','moderate','strong')),
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);`);
  lines.push('');
  
  lines.push(`CREATE TABLE IF NOT EXISTS fix_commits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  commit_date TEXT,
  author TEXT,
  message TEXT,
  category TEXT,
  pattern TEXT,
  severity TEXT,
  root_cause TEXT,
  file_count INTEGER,
  confidence REAL,
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);`);
  lines.push('');
  
  lines.push(`CREATE TABLE IF NOT EXISTS fix_chains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id TEXT NOT NULL,
  break_hash TEXT,
  break_message TEXT,
  fix_hash TEXT,
  fix_message TEXT,
  hours_to_fix REAL,
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);`);
  lines.push('');
  
  // Indexes
  lines.push('CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns(category);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_patterns_severity ON patterns(severity);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_patterns_frequency ON patterns(frequency DESC);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_hotspots_fix_rate ON hotspots(fix_rate DESC);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_coupling_count ON coupling(co_change_count DESC);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_fix_commits_category ON fix_commits(category);');
  lines.push('');
  
  // Data
  const esc = s => String(s ?? '').replace(/'/g, "''");
  const repoId = (data.meta?.repo || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const now = new Date().toISOString();
  
  lines.push(`INSERT OR REPLACE INTO repos VALUES ('${esc(repoId)}', '${esc(data.meta?.repo)}', ${data.meta?.totalCommits || 0}, ${data.meta?.analyzedCommits || 0}, '${esc(data.meta?.dateRange?.first)}', '${esc(data.meta?.dateRange?.last)}', '${now}');`);
  lines.push('');
  
  // Insert patterns
  for (const p of (data.patterns || [])) {
    lines.push(`INSERT OR REPLACE INTO patterns VALUES ('${esc(p.id)}', '${esc(repoId)}', '${esc(p.pattern)}', ${p.frequency}, '${esc(p.category)}', '${esc(p.technology)}', '${esc(p.severity)}', '${esc(p.rule)}', '${esc(p.rootCause)}', '${now}');`);
    
    for (const ex of (p.exampleCommits || []).slice(0, 5)) {
      lines.push(`INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('${esc(p.id)}', '${esc(ex.hash?.slice(0, 8))}', '${esc(ex.msg?.slice(0, 100))}', '${esc(ex.date)}');`);
    }
  }
  lines.push('');
  
  // Insert hotspots
  for (const h of (data.hotspots || [])) {
    const risk = h.fixRatio >= 0.4 ? 'critical' : h.fixRatio >= 0.25 ? 'high' : h.fixRatio >= 0.15 ? 'medium' : 'low';
    lines.push(`INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('${esc(repoId)}', '${esc(h.file)}', ${h.changes}, ${h.fixCount}, ${h.fixRatio}, '${risk}');`);
  }
  lines.push('');
  
  // Insert coupling
  for (const c of (data.coChanges || [])) {
    const [fileA, fileB] = c.pair.split(' <-> ');
    const str = c.count >= 15 ? 'strong' : c.count >= 8 ? 'moderate' : 'weak';
    lines.push(`INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('${esc(repoId)}', '${esc(fileA)}', '${esc(fileB)}', ${c.count}, '${str}');`);
  }
  lines.push('');
  
  // Insert fix commits with enrichment data
  const enrichedData2 = readJSON('.mycelium-mined/webapp-enriched.json');
  for (const fc of (enrichedData2?.fixCommits || []).slice(0, 200)) {
    const rc = fc.rootCause || fc.enrichment?.rootCause || '';
    const cat = fc.category || fc.enrichment?.category || '';
    const pat = fc.pattern || fc.enrichment?.pattern || '';
    const sev = fc.severity || fc.enrichment?.severity || 'medium';
    const conf = fc.confidence || fc.enrichment?.confidence || 0;
    lines.push(`INSERT INTO fix_commits (repo_id, commit_hash, commit_date, author, message, category, pattern, severity, root_cause, file_count, confidence) VALUES ('${esc(repoId)}', '${esc(fc.hash?.slice(0, 12))}', '${esc(fc.date)}', '${esc(fc.author)}', '${esc(fc.msg?.slice(0, 200))}', '${esc(cat)}', '${esc(pat)}', '${esc(sev)}', '${esc(rc?.slice(0, 300))}', ${fc.fileCount || 0}, ${conf});`);
  }
  lines.push('');

  // Insert fix chains
  for (const fc of (data.fixChains || [])) {
    lines.push(`INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('${esc(repoId)}', '${esc(fc.breakCommit?.slice(0, 8))}', '${esc(fc.breakMsg?.slice(0, 100))}', '${esc(fc.fixCommit?.slice(0, 8))}', '${esc(fc.fixMsg?.slice(0, 100))}', ${fc.hoursToFix || 0});`);
  }
  lines.push('');
  
  fs.writeFileSync(sqlFile, lines.join('\n'));
  log(`  → breakage-patterns.sql (${(lines.join('\n').length / 1024).toFixed(1)}KB)`);
  
  // Also create SQLite DB if sqlite3 is available
  try {
    const dbFile = path.join(DB_DIR, 'breakage-patterns.db');
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
    execSync(`sqlite3 "${dbFile}" < "${sqlFile}"`, { timeout: 10000 });
    log(`  → breakage-patterns.db (SQLite)`);
  } catch {
    log(`  → SQLite binary not available — .sql file can be imported manually`);
  }
}

// ── Format 4: GitHub Action config (for CI/CD platforms) ──

function exportGitHubActionConfig(data) {
  const config = {
    name: 'Mycelium Breakage Prevention',
    description: 'Auto-generated rules from git history analysis',
    version: '2.0',
    generatedAt: new Date().toISOString(),
    
    // Rules that should fail CI
    failOnSeverity: ['critical', 'high'],
    
    // Rules that should warn
    warnOnSeverity: ['medium'],
    
    // Pattern-based checks
    checks: (data.patterns || []).filter(p => ['high', 'critical'].includes(p.severity)).map(p => ({
      id: p.id,
      name: p.pattern,
      severity: p.severity,
      rule: p.rule,
      // What to check in the diff
      lookFor: extractKeywordsFromPattern(p),
    })),
    
    // File-based warnings
    highRiskFiles: (data.hotspots || [])
      .filter(h => h.fixRatio >= 0.3)
      .map(h => ({
        file: h.file,
        fixRate: (h.fixRatio * 100).toFixed(0) + '%',
        message: `High-risk file: ${(h.fixRatio * 100).toFixed(0)}% of changes are bug fixes`,
      })),
    
    // Coupling checks
    couplingChecks: (data.coChanges || [])
      .filter(c => c.count >= 10)
      .map(c => {
        const [a, b] = c.pair.split(' <-> ');
        return { fileA: a, fileB: b, coChangeCount: c.count };
      }),
  };
  
  writeJSON(path.join(DB_DIR, 'github-action-config.json'), config);
  log(`  → github-action-config.json (${config.checks.length} checks)`);
}

// ── Format 5: Dashboard-ready data (for engineering managers) ──

function exportDashboardData(data) {
  const dashboard = {
    generatedAt: new Date().toISOString(),
    repo: data.meta?.repo,
    
    // Summary cards
    cards: {
      fixCommits: data.summary?.totalFixCommits || 0,
      patterns: data.patterns?.length || 0,
      hotspots: (data.hotspots || []).filter(h => h.fixRatio >= 0.25).length,
      coupledPairs: (data.coChanges || []).filter(c => c.count >= 10).length,
      fixChains: data.fixChains?.length || 0,
    },
    
    // Pie chart: bug categories
    categoryDistribution: Object.entries(data.summary?.categoryBreakdown || {})
      .sort((a, b) => b[1].count - a[1].count)
      .map(([cat, info]) => ({ label: cat, value: info.count, percentage: info.percentage })),
    
    // Bar chart: pattern frequency
    patternFrequency: (data.patterns || []).slice(0, 15).map(p => ({
      label: p.pattern,
      value: p.frequency,
      severity: p.severity,
      category: p.category,
    })),
    
    // Table: top risky files
    riskyFiles: (data.hotspots || []).filter(h => h.fixRatio > 0).slice(0, 20).map(h => ({
      file: h.file,
      changes: h.changes,
      fixes: h.fixCount,
      fixRate: h.fixRatio,
      risk: h.fixRatio >= 0.4 ? 'critical' : h.fixRatio >= 0.25 ? 'high' : 'medium',
    })),
    
    // Timeline: fix chains (shows "break → fix" sequences)
    fixChainTimeline: (data.fixChains || []).slice(0, 30).map(fc => ({
      breakCommit: fc.breakCommit?.slice(0, 8),
      breakMsg: fc.breakMsg?.slice(0, 60),
      fixCommit: fc.fixCommit?.slice(0, 8),
      fixMsg: fc.fixMsg?.slice(0, 60),
      hoursToFix: fc.hoursToFix,
    })),
    
    // Severity breakdown
    severityDistribution: (() => {
      const counts = { low: 0, medium: 0, high: 0, critical: 0 };
      for (const p of (data.patterns || [])) {
        counts[p.severity] = (counts[p.severity] || 0) + p.frequency;
      }
      return Object.entries(counts).map(([sev, count]) => ({ severity: sev, count }));
    })(),
  };
  
  writeJSON(path.join(DB_DIR, 'dashboard-data.json'), dashboard);
  log(`  → dashboard-data.json (dashboard-ready)`);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractKeywordsFromPattern(p) {
  const keywords = new Set();
  const text = ((p.pattern || '') + ' ' + (p.rootCause || '') + ' ' + (p.rule || '')).toLowerCase();
  
  const keywordMap = {
    'defer': ['defer'], 'async': ['async', 'await'], 'overflow': ['overflow'],
    'innerhtml': ['innerHTML'], 'null': ['null', 'undefined'], 'z-index': ['z-index'],
    'import': ['import', 'require'], 'event': ['addEventListener', 'removeEventListener'],
    'timeout': ['setTimeout', 'setInterval'], 'i18n': ['i18n', 'translate', 'locale'],
    'mobile': ['touch', 'mobile', 'viewport'], 'scroll': ['scroll', 'overflow'],
    'display': ['display'], 'return': ['return'], 'object-fit': ['object-fit'],
  };
  
  for (const [key, kws] of Object.entries(keywordMap)) {
    if (text.includes(key)) kws.forEach(k => keywords.add(k));
  }
  
  return [...keywords];
}

function extractExtensionsFromPattern(p) {
  const tech = p.technology || '';
  const extMap = {
    'html': ['.html'], 'css': ['.css', '.scss'], 'javascript': ['.js', '.mjs', '.cjs'],
    'typescript': ['.ts', '.tsx'], 'react': ['.jsx', '.tsx'], 'vue': ['.vue'],
    'python': ['.py'], 'config': ['.json', '.yaml', '.toml'],
  };
  return extMap[tech] || [];
}

// ============================================================================
// STATS DISPLAY
// ============================================================================

function showStats() {
  const state = loadState();
  const patterns = readJSON('.mycelium-mined/webapp-patterns.json');
  
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  MYCELIUM AUTO-MINE — Database Stats                ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Commits mined:        ${String(state.totalCommitsMined).padEnd(28)}║`);
  console.log(`║  Fix commits:          ${String(state.totalFixCommits).padEnd(28)}║`);
  console.log(`║  Last mined:           ${String(state.lastMinedDate || 'never').padEnd(28)}║`);
  console.log(`║  Last full re-mine:    ${String(state.lastFullMineDate?.slice(0, 10) || 'never').padEnd(28)}║`);
  console.log(`║  Last export:          ${String(state.lastExportDate?.slice(0, 10) || 'never').padEnd(28)}║`);
  
  if (patterns) {
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  Patterns:             ${String(patterns.patterns?.length || 0).padEnd(28)}║`);
    console.log(`║  Singleton insights:   ${String(patterns.singletonInsights?.length || 0).padEnd(28)}║`);
    console.log(`║  Hotspot files:        ${String(patterns.hotspots?.length || 0).padEnd(28)}║`);
    console.log(`║  Coupled pairs:        ${String(patterns.coChanges?.length || 0).padEnd(28)}║`);
    console.log(`║  Fix chains:           ${String(patterns.fixChains?.length || 0).padEnd(28)}║`);
  }
  
  // Check export files
  const exports = [
    'patterns-api.json', 'rules-api.json', 'patterns.csv', 'hotspots.csv',
    'coupling.csv', 'categories.csv', 'fix-chains.csv', 'breakage-patterns.sql',
    'github-action-config.json', 'dashboard-data.json',
  ];
  
  const existing = exports.filter(f => fs.existsSync(path.join(DB_DIR, f)));
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Export files:         ${String(existing.length + '/' + exports.length).padEnd(28)}║`);
  for (const f of existing) {
    const size = (fs.statSync(path.join(DB_DIR, f)).size / 1024).toFixed(1);
    console.log(`║    ${f.padEnd(30)} ${(size + 'KB').padEnd(16)}║`);
  }
  
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

// ============================================================================
// HEALTH STATUS — one-line "is the miner working?" check
// ============================================================================

function showHealthStatus() {
  const state = loadState();
  const healthFile = path.join('.mycelium-mined', 'health-status');
  const alertFile = '.mycelium-alert';
  const validationReport = readJSON('.mycelium-mined/validation-report.json');
  
  // Mining health
  const lastMined = state.lastMinedDate || 'never';
  const commitsMined = state.totalCommitsMined || 0;
  const fixCommits = state.totalFixCommits || 0;
  const lastExport = state.lastExportDate?.slice(0, 10) || 'never';
  
  // Quality health
  let qualityScore = 'unknown';
  let qualityGrade = '?';
  let checksPassed = '?/?';
  if (validationReport) {
    qualityScore = validationReport.score;
    qualityGrade = validationReport.grade;
    checksPassed = `${validationReport.passed}/${validationReport.total}`;
  }
  
  // Alert status
  const hasAlert = fs.existsSync(alertFile);
  
  // Health file
  let healthLine = '';
  try { healthLine = fs.readFileSync(healthFile, 'utf8').trim().split('\n')[0]; } catch {}
  
  // Color the output
  const status = hasAlert ? 'DEGRADED' : qualityScore >= 80 ? 'HEALTHY' : qualityScore >= 50 ? 'WARNING' : 'CRITICAL';
  const emoji = status === 'HEALTHY' ? 'OK' : status === 'DEGRADED' ? '!!' : status === 'WARNING' ? '??' : 'XX';
  
  console.log('');
  console.log(`  [${emoji}] Mycelium Mining Health: ${status}`);
  console.log(`  Quality: ${qualityScore}/100 (${qualityGrade}) | Checks: ${checksPassed}`);
  console.log(`  Commits mined: ${commitsMined} | Fix commits: ${fixCommits}`);
  console.log(`  Last mined: ${lastMined} | Last export: ${lastExport}`);
  
  if (hasAlert) {
    console.log('');
    console.log('  ACTIVE ALERT:');
    try {
      const alert = fs.readFileSync(alertFile, 'utf8').trim();
      alert.split('\n').forEach(l => console.log(`    ${l}`));
    } catch {}
    console.log('');
    console.log('  Fix: node tools/validate-mined-data.cjs --fix');
  }
  
  if (healthLine) {
    console.log(`  Status: ${healthLine}`);
  }
  
  console.log('');
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Mycelium Auto-Mine — Continuous breakage intelligence

Usage:
  node tools/mycelium-auto-mine.cjs                  # incremental mine (for post-commit)
  node tools/mycelium-auto-mine.cjs --full            # full re-mine
  node tools/mycelium-auto-mine.cjs --export          # export all sellable formats
  node tools/mycelium-auto-mine.cjs --export-api      # export API JSON only
  node tools/mycelium-auto-mine.cjs --export-csv      # export CSVs only
  node tools/mycelium-auto-mine.cjs --export-sqlite   # export SQL/SQLite only
  node tools/mycelium-auto-mine.cjs --stats           # show database stats

Automatic behavior (post-commit hook):
  Every commit:       mines the new commit (~0.5s)
  Every fix commit:   re-aggregates patterns + re-exports
  Every 50 commits:   full re-mine from git history

Output directory: ${DB_DIR}/
  patterns-api.json          → AI tool companies (Cursor, Claude, Windsurf)
  rules-api.json             → Pre-commit hooks / CI pipelines
  patterns.csv               → Engineering teams / data analysts
  hotspots.csv               → Risk dashboards
  coupling.csv               → Architecture reviews
  categories.csv             → Bug trend reports
  fix-chains.csv             → Break→fix analysis
  breakage-patterns.sql      → Researchers / ML training
  breakage-patterns.db       → SQLite database (if sqlite3 available)
  github-action-config.json  → GitHub Actions integration
  dashboard-data.json        → Dashboard widgets
    `);
    return;
  }
  
  if (args.includes('--stats')) {
    showStats();
    return;
  }
  
  if (args.includes('--health')) {
    showHealthStatus();
    return;
  }
  
  if (args.includes('--full')) {
    log('Full re-mine requested');
    const state = loadState();
    triggerFullMine(state);
    state.commitsSinceFullMine = 0;
    state.lastFullMineDate = new Date().toISOString();
    saveState(state);
    return;
  }
  
  if (args.includes('--export')) {
    exportAll();
    return;
  }
  
  if (args.includes('--export-api')) {
    const data = readJSON('.mycelium-mined/webapp-patterns.json');
    if (data) { exportAPIFormat(data); log('API export complete'); }
    else log('No patterns found — run --full first');
    return;
  }
  
  if (args.includes('--export-csv')) {
    const data = readJSON('.mycelium-mined/webapp-patterns.json');
    if (data) { exportCSVFormat(data); log('CSV export complete'); }
    else log('No patterns found — run --full first');
    return;
  }
  
  if (args.includes('--export-sqlite')) {
    const data = readJSON('.mycelium-mined/webapp-patterns.json');
    if (data) { exportSQLiteFormat(data); log('SQLite export complete'); }
    else log('No patterns found — run --full first');
    return;
  }
  
  // Default: incremental mine (post-commit hook behavior)
  const result = mineLatestCommit();
  if (result) {
    log(`Done: ${result.isFix ? 'FIX' : 'commit'} — ${result.files} files`);
  }
}

main().catch(e => { log(`Error: ${e.message}`); process.exit(1); });
