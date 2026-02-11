#!/usr/bin/env node
/**
 * validate-mined-data.cjs — Comprehensive AI-Value Validation for Mined Data
 * ============================================================================
 * 
 * Ensures every piece of mined data is genuinely valuable for AI applications.
 * This is the QUALITY GATE: no data ships unless it passes all checks.
 * 
 * Checks:
 *   1. UNIQUENESS  — No duplicate records anywhere
 *   2. COMPLETENESS — Every record has all required fields, properly filled
 *   3. ACTIONABILITY — Lessons teach something; patterns prevent something
 *   4. FRESHNESS   — No references to deleted files or stale commits
 *   5. CONSISTENCY — Cross-reference validation between exports
 *   6. AI-READINESS — Data is structured for machine consumption
 * 
 * Usage:
 *   node tools/validate-mined-data.cjs              # full validation report
 *   node tools/validate-mined-data.cjs --fix        # auto-fix what's fixable
 *   node tools/validate-mined-data.cjs --strict     # fail on any warning
 *   node tools/validate-mined-data.cjs --json       # output as JSON
 */

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MINED_DIR = path.join(ROOT, '.mycelium-mined');
const DB_DIR = path.join(MINED_DIR, 'db');
const FIX_MODE = process.argv.includes('--fix');
const STRICT = process.argv.includes('--strict');
const JSON_OUT = process.argv.includes('--json');

function loadJSON(fp) { try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return null; } }
function saveJSON(fp, data) { fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, JSON.stringify(data, null, 2)); }
function fileExists(fp) { try { return fs.existsSync(fp); } catch { return false; } }

const results = {
  timestamp: new Date().toISOString(),
  checks: [],
  fixes: [],
  score: 0,
  grade: 'F',
  summary: {},
};

function check(name, pass, detail, fixable = false) {
  results.checks.push({ name, pass, detail, fixable });
  if (!JSON_OUT && !pass) {
    const prefix = fixable ? '  [FIXABLE]' : '  [FAIL]';
    process.stderr.write(`${prefix} ${name}: ${detail}\n`);
  }
}

function fix(name, detail) {
  results.fixes.push({ name, detail });
  if (!JSON_OUT) process.stderr.write(`  [FIXED] ${name}: ${detail}\n`);
}

// ════════════════════════════════════════════════════════════════════
// CHECK 1: ENRICHMENT QUALITY
// ════════════════════════════════════════════════════════════════════

function checkEnrichment() {
  if (!JSON_OUT) process.stderr.write('\n── Enrichment Quality ──\n');
  
  const data = loadJSON(path.join(MINED_DIR, 'webapp-enriched.json'));
  if (!data) { check('enrichment.exists', false, 'webapp-enriched.json missing'); return 0; }
  
  const commits = data.fixCommits || [];
  check('enrichment.exists', true, `${commits.length} fix commits`);
  
  // No nested .enrichment fields (should be flattened)
  const nested = commits.filter(c => c.enrichment);
  check('enrichment.flattened', nested.length === 0, 
    nested.length === 0 ? 'All enrichment flattened to top-level' : `${nested.length} commits still have nested .enrichment`,
    true);
  
  if (FIX_MODE && nested.length > 0) {
    for (const fc of nested) {
      fc.rootCause = fc.enrichment.rootCause || fc.rootCause || null;
      fc.category = fc.enrichment.category || fc.category || null;
      fc.severity = fc.enrichment.severity || fc.severity || null;
      fc.pattern = fc.enrichment.pattern || fc.pattern || null;
      fc.prevention = fc.enrichment.prevention || fc.prevention || null;
      delete fc.enrichment;
    }
    saveJSON(path.join(MINED_DIR, 'webapp-enriched.json'), data);
    fix('enrichment.flattened', `Flattened ${nested.length} commits`);
  }
  
  // Root cause coverage
  const withRC = commits.filter(c => c.rootCause && c.rootCause.length > 10);
  const rcRate = commits.length > 0 ? withRC.length / commits.length : 0;
  check('enrichment.rootCause', rcRate >= 0.5, 
    `${withRC.length}/${commits.length} (${(rcRate * 100).toFixed(0)}%) have rootCause (need 50%+)`);
  
  // Category coverage
  const withCat = commits.filter(c => c.category);
  const catRate = commits.length > 0 ? withCat.length / commits.length : 0;
  check('enrichment.category', catRate >= 0.5,
    `${withCat.length}/${commits.length} (${(catRate * 100).toFixed(0)}%) have category`);
  
  // Severity coverage
  const withSev = commits.filter(c => c.severity);
  const sevRate = commits.length > 0 ? withSev.length / commits.length : 0;
  check('enrichment.severity', sevRate >= 0.5,
    `${withSev.length}/${commits.length} (${(sevRate * 100).toFixed(0)}%) have severity`);
  
  // No empty rootCauses (anti-filler check)
  const emptyRC = commits.filter(c => c.rootCause !== null && c.rootCause !== undefined && c.rootCause.length < 10);
  check('enrichment.noFiller', emptyRC.length === 0,
    emptyRC.length === 0 ? 'No filler rootCauses' : `${emptyRC.length} rootCauses are too short (<10 chars)`, true);
  
  if (FIX_MODE && emptyRC.length > 0) {
    for (const fc of emptyRC) {
      fc.rootCause = null; // Better to have null than useless filler
    }
    saveJSON(path.join(MINED_DIR, 'webapp-enriched.json'), data);
    fix('enrichment.noFiller', `Nullified ${emptyRC.length} filler rootCauses`);
  }
  
  return Math.round(rcRate * 35 + catRate * 35 + sevRate * 30);
}

// ════════════════════════════════════════════════════════════════════
// CHECK 2: PATTERNS QUALITY
// ════════════════════════════════════════════════════════════════════

function checkPatterns() {
  if (!JSON_OUT) process.stderr.write('\n── Pattern Quality ──\n');
  
  const data = loadJSON(path.join(MINED_DIR, 'webapp-patterns.json'));
  if (!data) { check('patterns.exists', false, 'webapp-patterns.json missing'); return 0; }
  
  const patterns = data.patterns || [];
  check('patterns.exists', patterns.length > 0, `${patterns.length} canonical patterns`);
  
  // All patterns have IDs
  const withId = patterns.filter(p => p.id);
  check('patterns.hasId', withId.length === patterns.length,
    `${withId.length}/${patterns.length} have IDs`);
  
  // All patterns have rootCause
  const withRC = patterns.filter(p => p.rootCause && p.rootCause.length > 20);
  check('patterns.rootCause', withRC.length >= patterns.length * 0.7,
    `${withRC.length}/${patterns.length} have real rootCauses (need 70%+)`);
  
  // All patterns have affectedFiles
  const withFiles = patterns.filter(p => p.affectedFiles && p.affectedFiles.length > 0);
  check('patterns.affectedFiles', withFiles.length >= patterns.length * 0.5,
    `${withFiles.length}/${patterns.length} have affectedFiles (need 50%+)`);
  
  // No generic prevention rules
  const generic = patterns.filter(p => p.prevention?.startsWith('Review ') || p.rule?.startsWith('Review '));
  check('patterns.specificRules', generic.length <= patterns.length * 0.3,
    generic.length <= patterns.length * 0.3 ? 'Rules are specific' : `${generic.length} have generic "Review..." rules`);
  
  // Severity distribution (not all same)
  const sevCounts = {};
  patterns.forEach(p => { sevCounts[p.severity] = (sevCounts[p.severity] || 0) + 1; });
  const sevTypes = Object.keys(sevCounts).length;
  check('patterns.severityVariety', sevTypes >= 2,
    `${sevTypes} severity levels used (need 2+): ${JSON.stringify(sevCounts)}`);
  
  // Hotspots: no dead files
  const hotspots = data.hotspots || [];
  const deadHotspots = hotspots.filter(h => !fileExists(path.resolve(ROOT, h.file)));
  check('patterns.noDeadHotspots', deadHotspots.length <= hotspots.length * 0.1,
    deadHotspots.length === 0 ? 'No dead hotspot files' : `${deadHotspots.length} hotspots reference deleted files`, true);
  
  if (FIX_MODE && deadHotspots.length > 0) {
    data.hotspots = hotspots.filter(h => fileExists(path.resolve(ROOT, h.file)));
    saveJSON(path.join(MINED_DIR, 'webapp-patterns.json'), data);
    fix('patterns.noDeadHotspots', `Removed ${deadHotspots.length} dead hotspot entries`);
  }
  
  const rcRate = patterns.length > 0 ? withRC.length / patterns.length : 0;
  const fileRate = patterns.length > 0 ? withFiles.length / patterns.length : 0;
  const genRate = patterns.length > 0 ? generic.length / patterns.length : 0;
  return Math.round(rcRate * 35 + fileRate * 30 + (1 - genRate) * 35);
}

// ════════════════════════════════════════════════════════════════════
// CHECK 3: LESSONS QUALITY (the premium dataset)
// ════════════════════════════════════════════════════════════════════

function checkLessons() {
  if (!JSON_OUT) process.stderr.write('\n── Lessons Quality ──\n');
  
  const lessonsFile = path.join(DB_DIR, 'lessons.jsonl');
  if (!fileExists(lessonsFile)) { check('lessons.exists', false, 'lessons.jsonl missing'); return 0; }
  
  const lines = fs.readFileSync(lessonsFile, 'utf8').trim().split('\n').filter(Boolean);
  const lessons = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  
  check('lessons.exists', lessons.length > 0, `${lessons.length} lessons`);
  
  // Uniqueness
  const texts = lessons.map(l => l.lesson);
  const unique = new Set(texts);
  const dupRate = 1 - (unique.size / lessons.length);
  check('lessons.unique', dupRate < 0.05,
    dupRate < 0.05 ? `${unique.size}/${lessons.length} unique (${(dupRate * 100).toFixed(1)}% dup)` : 
    `${(dupRate * 100).toFixed(1)}% duplication (max 5%)`, true);
  
  if (FIX_MODE && dupRate >= 0.05) {
    const seen = new Set();
    const deduped = lessons.filter(l => {
      const key = l.lesson.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const newLines = deduped.map(l => JSON.stringify(l));
    fs.writeFileSync(lessonsFile, newLines.join('\n') + '\n');
    fix('lessons.unique', `Deduped ${lessons.length} → ${deduped.length}`);
  }
  
  // No fragments (lines starting with "- " or <20 chars)
  const fragments = lessons.filter(l => !l.lesson || l.lesson.length < 20 || l.lesson.startsWith('- '));
  const fragRate = lessons.length > 0 ? fragments.length / lessons.length : 0;
  check('lessons.noFragments', fragRate < 0.2,
    fragRate < 0.2 ? `${(fragRate * 100).toFixed(0)}% fragments (max 20%)` : `${(fragRate * 100).toFixed(0)}% are fragments`, true);
  
  if (FIX_MODE && fragRate >= 0.2) {
    const filtered = lessons.filter(l => l.lesson && l.lesson.length >= 20 && !l.lesson.startsWith('- '));
    const newLines = filtered.map(l => JSON.stringify(l));
    fs.writeFileSync(lessonsFile, newLines.join('\n') + '\n');
    fix('lessons.noFragments', `Removed ${lessons.length - filtered.length} fragments`);
  }
  
  // Actionability — lessons should contain action verbs or causal language
  const actionVerbs = /\b(if|when|never|always|must|should|use|avoid|check|test|add|wrap|because|root.?cause|broke|fixed|ensure|validate|prevent|guard|verify)\b/i;
  const actionable = lessons.filter(l => actionVerbs.test(l.lesson));
  const actionRate = lessons.length > 0 ? actionable.length / lessons.length : 0;
  check('lessons.actionable', actionRate >= 0.3,
    `${(actionRate * 100).toFixed(0)}% actionable (need 30%+)`);
  
  // Source diversity — not all from one source
  const sources = {};
  lessons.forEach(l => { sources[l.source] = (sources[l.source] || 0) + 1; });
  check('lessons.sourceDiversity', Object.keys(sources).length >= 2,
    `Sources: ${JSON.stringify(sources)}`);
  
  // All lessons have category
  const withCat = lessons.filter(l => l.category && l.category !== 'unknown');
  const catRate = lessons.length > 0 ? withCat.length / lessons.length : 0;
  check('lessons.categorized', catRate >= 0.3,
    `${(catRate * 100).toFixed(0)}% categorized (need 30%+)`);
  
  // Average lesson length (valuable lessons are substantive)
  const avgLen = lessons.reduce((s, l) => s + (l.lesson?.length || 0), 0) / Math.max(lessons.length, 1);
  check('lessons.substantive', avgLen >= 40,
    `Average length: ${avgLen.toFixed(0)} chars (need 40+)`);
  
  return Math.round(
    (1 - Math.min(dupRate, 1)) * 25 +
    (1 - Math.min(fragRate, 1)) * 20 +
    Math.min(actionRate, 1) * 20 +
    (Object.keys(sources).length >= 3 ? 15 : Object.keys(sources).length >= 2 ? 10 : 0) +
    Math.min(catRate, 1) * 10 +
    Math.min(avgLen / 80, 1) * 10
  );
}

// ════════════════════════════════════════════════════════════════════
// CHECK 4: EXPORT CONSISTENCY (cross-reference validation)
// ════════════════════════════════════════════════════════════════════

function checkExportConsistency() {
  if (!JSON_OUT) process.stderr.write('\n── Export Consistency ──\n');
  
  let score = 100;
  
  // All expected export files exist
  const expectedFiles = [
    'patterns-api.json', 'rules-api.json', 'patterns.csv', 'hotspots.csv',
    'coupling.csv', 'categories.csv', 'fix-chains.csv', 'breakage-patterns.sql',
    'github-action-config.json', 'dashboard-data.json', 'lessons.jsonl',
    'risk-profiles.csv', 'decisions.csv', 'learnings.csv',
  ];
  
  const missing = expectedFiles.filter(f => !fileExists(path.join(DB_DIR, f)));
  check('exports.complete', missing.length === 0,
    missing.length === 0 ? `All ${expectedFiles.length} export files present` : `Missing: ${missing.join(', ')}`);
  if (missing.length > 0) score -= missing.length * 5;
  
  // patterns-api.json matches patterns.csv row count
  const api = loadJSON(path.join(DB_DIR, 'patterns-api.json'));
  if (api) {
    const csvFile = path.join(DB_DIR, 'patterns.csv');
    if (fileExists(csvFile)) {
      const csvRows = fs.readFileSync(csvFile, 'utf8').trim().split('\n').length - 1;
      const apiCount = (api.patterns || []).length;
      check('exports.patternsSync', csvRows === apiCount,
        csvRows === apiCount ? `patterns-api.json (${apiCount}) matches patterns.csv (${csvRows})` :
        `patterns-api.json (${apiCount}) != patterns.csv (${csvRows})`);
      if (csvRows !== apiCount) score -= 10;
    }
  }
  
  // dashboard-data.json has valid structure
  const dashboard = loadJSON(path.join(DB_DIR, 'dashboard-data.json'));
  if (dashboard) {
    const hasCards = dashboard.cards && typeof dashboard.cards.fixCommits === 'number';
    const hasCats = Array.isArray(dashboard.categoryDistribution);
    const hasPatterns = Array.isArray(dashboard.patternFrequency);
    check('exports.dashboardValid', hasCards && hasCats && hasPatterns,
      hasCards && hasCats && hasPatterns ? 'Dashboard data structure valid' : 'Dashboard missing required fields');
    if (!hasCards || !hasCats || !hasPatterns) score -= 10;
  }
  
  // SQL file is valid (can be parsed)
  const sqlFile = path.join(DB_DIR, 'breakage-patterns.sql');
  if (fileExists(sqlFile)) {
    const sql = fs.readFileSync(sqlFile, 'utf8');
    const hasSchema = sql.includes('CREATE TABLE') && sql.includes('INSERT');
    const hasIndexes = sql.includes('CREATE INDEX');
    check('exports.sqlValid', hasSchema && hasIndexes,
      hasSchema && hasIndexes ? 'SQL schema + data + indexes present' : 'SQL file incomplete');
    if (!hasSchema || !hasIndexes) score -= 10;
  }
  
  // GitHub Action config has checks
  const ghConfig = loadJSON(path.join(DB_DIR, 'github-action-config.json'));
  if (ghConfig) {
    check('exports.ghActionValid', (ghConfig.checks || []).length > 0,
      `${(ghConfig.checks || []).length} CI checks defined`);
  }
  
  return Math.max(0, score);
}

// ════════════════════════════════════════════════════════════════════
// CHECK 5: AI-READINESS (structured for machine consumption)
// ════════════════════════════════════════════════════════════════════

function checkAIReadiness() {
  if (!JSON_OUT) process.stderr.write('\n── AI-Readiness ──\n');
  
  let score = 0;
  
  // patterns-api.json has proper schema version
  const api = loadJSON(path.join(DB_DIR, 'patterns-api.json'));
  if (api) {
    check('ai.schemaVersion', !!api.version && !!api.schema,
      api.schema ? `Schema: ${api.schema} v${api.version}` : 'Missing schema version');
    if (api.version && api.schema) score += 15;
    
    // Patterns have triggers (for AI tool integration)
    const withTriggers = (api.patterns || []).filter(p => p.triggers && (p.triggers.keywords?.length > 0 || p.triggers.diffAtoms?.length > 0));
    const trigRate = api.patterns?.length > 0 ? withTriggers.length / api.patterns.length : 0;
    check('ai.hasTriggers', trigRate >= 0.5,
      `${(trigRate * 100).toFixed(0)}% patterns have triggers (need 50%+)`);
    score += Math.round(trigRate * 20);
    
    // Patterns have examples (for training data)
    const withExamples = (api.patterns || []).filter(p => p.examples && p.examples.length > 0);
    const exRate = api.patterns?.length > 0 ? withExamples.length / api.patterns.length : 0;
    check('ai.hasExamples', exRate >= 0.5,
      `${(exRate * 100).toFixed(0)}% patterns have examples (need 50%+)`);
    score += Math.round(exRate * 15);
    
    // Hotspots have risk levels
    const withRisk = (api.hotspots || []).filter(h => h.riskLevel);
    check('ai.hotspotRiskLevels', withRisk.length === (api.hotspots || []).length,
      `${withRisk.length}/${(api.hotspots || []).length} hotspots have risk levels`);
    if (withRisk.length === (api.hotspots || []).length && api.hotspots?.length > 0) score += 10;
  }
  
  // rules-api.json is lightweight (for pre-commit integration)
  const rules = loadJSON(path.join(DB_DIR, 'rules-api.json'));
  if (rules) {
    const sizeKB = JSON.stringify(rules).length / 1024;
    check('ai.rulesLightweight', sizeKB < 20,
      `rules-api.json is ${sizeKB.toFixed(1)}KB (need <20KB for fast loading)`);
    if (sizeKB < 20) score += 10;
  }
  
  // JSONL format for lessons (ML-friendly)
  const lessonsFile = path.join(DB_DIR, 'lessons.jsonl');
  if (fileExists(lessonsFile)) {
    const lines = fs.readFileSync(lessonsFile, 'utf8').trim().split('\n').filter(Boolean);
    const validJSON = lines.filter(l => { try { JSON.parse(l); return true; } catch { return false; } });
    check('ai.lessonsValidJSONL', validJSON.length === lines.length,
      `${validJSON.length}/${lines.length} lines are valid JSONL`);
    if (validJSON.length === lines.length) score += 15;
    
    // Each lesson record has required fields
    const parsed = validJSON.map(l => JSON.parse(l));
    const complete = parsed.filter(l => l.lesson && l.category && l.source && l.severity);
    const completeRate = parsed.length > 0 ? complete.length / parsed.length : 0;
    check('ai.lessonsComplete', completeRate >= 0.8,
      `${(completeRate * 100).toFixed(0)}% lessons have all required fields (need 80%+)`);
    score += Math.round(completeRate * 15);
  }
  
  return Math.min(100, score);
}

// ════════════════════════════════════════════════════════════════════
// CHECK 6: DATA FRESHNESS
// ════════════════════════════════════════════════════════════════════

function checkFreshness() {
  if (!JSON_OUT) process.stderr.write('\n── Data Freshness ──\n');
  
  let score = 100;
  
  // Check mined state
  const state = loadJSON(path.join(MINED_DIR, 'auto-mine-state.json'));
  if (state) {
    const lastMined = state.lastMinedDate ? new Date(state.lastMinedDate) : null;
    const daysSince = lastMined ? Math.floor((Date.now() - lastMined.getTime()) / 86400000) : 999;
    check('freshness.recentMine', daysSince < 7,
      daysSince < 7 ? `Last mined ${daysSince} days ago` : `Last mined ${daysSince} days ago (stale!)`);
    if (daysSince >= 7) score -= 20;
    
    check('freshness.totalMined', state.totalCommitsMined > 0,
      `${state.totalCommitsMined} commits mined total`);
  } else {
    check('freshness.state', false, 'No mining state file');
    score -= 30;
  }
  
  // Check quality report
  const qr = loadJSON(path.join(MINED_DIR, 'quality-report.json'));
  if (qr) {
    const reportAge = qr.generatedAt ? Math.floor((Date.now() - new Date(qr.generatedAt).getTime()) / 3600000) : 999;
    check('freshness.qualityReport', reportAge < 48,
      reportAge < 48 ? `Quality report ${reportAge}h old` : `Quality report ${reportAge}h old (stale!)`);
    if (reportAge >= 48) score -= 10;
  }
  
  // Check enriched data timestamp
  const enriched = loadJSON(path.join(MINED_DIR, 'webapp-enriched.json'));
  if (enriched?.meta?.flattenedAt) {
    const age = Math.floor((Date.now() - new Date(enriched.meta.flattenedAt).getTime()) / 3600000);
    check('freshness.enrichment', age < 48,
      `Enrichment ${age}h old`);
    if (age >= 48) score -= 10;
  }
  
  return Math.max(0, score);
}

// ════════════════════════════════════════════════════════════════════
// CHECK 7: DATA SIZE & VALUE METRICS
// ════════════════════════════════════════════════════════════════════

function checkValueMetrics() {
  if (!JSON_OUT) process.stderr.write('\n── Value Metrics ──\n');
  
  let score = 0;
  
  // Total data products
  const dbFiles = fileExists(DB_DIR) ? fs.readdirSync(DB_DIR).filter(f => !f.startsWith('.')) : [];
  check('value.dataProducts', dbFiles.length >= 10,
    `${dbFiles.length} data products in DB (need 10+)`);
  if (dbFiles.length >= 10) score += 15;
  
  // Total DB size
  let totalKB = 0;
  for (const f of dbFiles) {
    try { totalKB += fs.statSync(path.join(DB_DIR, f)).size / 1024; } catch {}
  }
  check('value.totalSize', totalKB >= 50,
    `Total DB size: ${totalKB.toFixed(0)}KB`);
  if (totalKB >= 50) score += 10;
  
  // Unique saleable records
  let totalRecords = 0;
  
  // Count patterns
  const patterns = loadJSON(path.join(DB_DIR, 'patterns-api.json'));
  if (patterns) totalRecords += (patterns.patterns || []).length + (patterns.insights || []).length + (patterns.hotspots || []).length;
  
  // Count lessons
  const lessonsFile = path.join(DB_DIR, 'lessons.jsonl');
  if (fileExists(lessonsFile)) {
    totalRecords += fs.readFileSync(lessonsFile, 'utf8').trim().split('\n').filter(Boolean).length;
  }
  
  // Count risk profiles
  const riskFile = path.join(DB_DIR, 'risk-profiles.csv');
  if (fileExists(riskFile)) {
    totalRecords += fs.readFileSync(riskFile, 'utf8').trim().split('\n').length - 1;
  }
  
  // Count fix chains
  const chainsFile = path.join(DB_DIR, 'fix-chains.csv');
  if (fileExists(chainsFile)) {
    totalRecords += fs.readFileSync(chainsFile, 'utf8').trim().split('\n').length - 1;
  }
  
  check('value.totalRecords', totalRecords >= 100,
    `${totalRecords} total saleable records`);
  if (totalRecords >= 500) score += 25;
  else if (totalRecords >= 100) score += 15;
  
  // Bytes per unique record (efficiency metric)
  const bytesPerRecord = totalRecords > 0 ? (totalKB * 1024 / totalRecords) : 0;
  check('value.efficiency', bytesPerRecord < 10000 && bytesPerRecord > 0,
    `${bytesPerRecord.toFixed(0)} bytes/record`);
  if (bytesPerRecord > 0 && bytesPerRecord < 10000) score += 10;
  
  // Multiple export formats (diversified value)
  const formats = {
    json: dbFiles.filter(f => f.endsWith('.json')).length,
    csv: dbFiles.filter(f => f.endsWith('.csv')).length,
    sql: dbFiles.filter(f => f.endsWith('.sql')).length,
    jsonl: dbFiles.filter(f => f.endsWith('.jsonl')).length,
  };
  const formatCount = Object.values(formats).filter(v => v > 0).length;
  check('value.formatDiversity', formatCount >= 3,
    `${formatCount} export formats: ${JSON.stringify(formats)}`);
  if (formatCount >= 3) score += 15;
  
  // Buyer-type coverage
  const buyerCoverage = {
    aiTools: fileExists(path.join(DB_DIR, 'patterns-api.json')) && fileExists(path.join(DB_DIR, 'rules-api.json')),
    engineering: fileExists(path.join(DB_DIR, 'dashboard-data.json')) && fileExists(path.join(DB_DIR, 'hotspots.csv')),
    cicd: fileExists(path.join(DB_DIR, 'github-action-config.json')),
    research: fileExists(path.join(DB_DIR, 'breakage-patterns.sql')) && fileExists(path.join(DB_DIR, 'lessons.jsonl')),
  };
  const coveredBuyers = Object.values(buyerCoverage).filter(Boolean).length;
  check('value.buyerCoverage', coveredBuyers >= 3,
    `${coveredBuyers}/4 buyer types covered: ${JSON.stringify(buyerCoverage)}`);
  if (coveredBuyers >= 3) score += 25;
  
  results.summary = {
    dataProducts: dbFiles.length,
    totalSizeKB: Math.round(totalKB),
    totalRecords,
    bytesPerRecord: Math.round(bytesPerRecord),
    formats,
    buyerCoverage,
  };
  
  return Math.min(100, score);
}

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════

function main() {
  if (!JSON_OUT) {
    process.stderr.write('\n' + '═'.repeat(70) + '\n');
    process.stderr.write('  MYCELIUM DATA VALIDATION — AI-Value Quality Gate\n');
    process.stderr.write('═'.repeat(70) + '\n');
  }
  
  const scores = {
    enrichment: checkEnrichment(),
    patterns: checkPatterns(),
    lessons: checkLessons(),
    exports: checkExportConsistency(),
    aiReadiness: checkAIReadiness(),
    freshness: checkFreshness(),
    value: checkValueMetrics(),
  };
  
  // Weighted overall
  const weights = { enrichment: 20, patterns: 20, lessons: 20, exports: 10, aiReadiness: 15, freshness: 5, value: 10 };
  let weightedTotal = 0;
  let weightSum = 0;
  for (const [key, score] of Object.entries(scores)) {
    weightedTotal += score * (weights[key] || 10);
    weightSum += weights[key] || 10;
  }
  
  const overall = Math.round(weightedTotal / weightSum);
  const grade = overall >= 95 ? 'A+' : overall >= 90 ? 'A' : overall >= 80 ? 'B+' : overall >= 70 ? 'B' : overall >= 60 ? 'C' : overall >= 40 ? 'D' : 'F';
  
  const passed = results.checks.filter(c => c.pass).length;
  const total = results.checks.length;
  const failed = results.checks.filter(c => !c.pass);
  
  results.score = overall;
  results.grade = grade;
  results.scores = scores;
  results.passed = passed;
  results.total = total;
  
  if (JSON_OUT) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    process.stderr.write('\n' + '═'.repeat(70) + '\n');
    process.stderr.write('  RESULTS\n');
    process.stderr.write('═'.repeat(70) + '\n\n');
    
    for (const [key, score] of Object.entries(scores)) {
      const bar = '█'.repeat(Math.round(score / 5)) + '░'.repeat(20 - Math.round(score / 5));
      process.stderr.write(`  ${key.padEnd(14)} ${bar} ${score}/100\n`);
    }
    
    process.stderr.write(`\n  OVERALL: ${overall}/100 (${grade})\n`);
    process.stderr.write(`  CHECKS: ${passed}/${total} passed\n`);
    
    if (results.fixes.length > 0) {
      process.stderr.write(`  FIXES: ${results.fixes.length} auto-applied\n`);
    }
    
    if (failed.length > 0 && failed.length <= 5) {
      process.stderr.write('\n  Failed checks:\n');
      for (const f of failed) {
        process.stderr.write(`    - ${f.name}: ${f.detail}\n`);
      }
    }
    
    process.stderr.write('\n  Summary:\n');
    if (results.summary.totalRecords) {
      process.stderr.write(`    ${results.summary.dataProducts} data products | ${results.summary.totalSizeKB}KB total | ${results.summary.totalRecords} records\n`);
      process.stderr.write(`    ${results.summary.bytesPerRecord} bytes/record | ${Object.values(results.summary.buyerCoverage).filter(Boolean).length}/4 buyer types\n`);
    }
    
    process.stderr.write('═'.repeat(70) + '\n\n');
  }
  
  // Save validation report
  saveJSON(path.join(MINED_DIR, 'validation-report.json'), results);
  
  // ── ALERT SYSTEM: write .mycelium-mined/health-status for quick checks ──
  const healthFile = path.join(MINED_DIR, 'health-status');
  const alertFile = path.join(ROOT, '.mycelium-alert');
  const now = new Date().toISOString();
  
  if (overall >= 80) {
    // Healthy — write green status, remove any alert
    fs.writeFileSync(healthFile, `OK ${overall}/100 (${grade}) | ${passed}/${total} checks | ${now}\n`);
    try { fs.unlinkSync(alertFile); } catch {}
  } else if (overall >= 50) {
    // Degraded — write warning status + alert file
    const warnMsg = `WARN ${overall}/100 (${grade}) | ${total - passed} checks failed | ${now}\nFailed: ${failed.map(f => f.name).join(', ')}\nRun: node tools/validate-mined-data.cjs`;
    fs.writeFileSync(healthFile, warnMsg + '\n');
    fs.writeFileSync(alertFile, warnMsg + '\n');
    // Print to stderr so post-commit hook CAN surface it
    process.stderr.write(`\n  [MYCELIUM ALERT] Data quality degraded: ${overall}/100 (${grade})\n`);
    process.stderr.write(`  Failed: ${failed.map(f => f.name).join(', ')}\n\n`);
  } else {
    // Critical — loud alert
    const critMsg = `CRITICAL ${overall}/100 (${grade}) | ${total - passed} checks failed | ${now}\nFailed: ${failed.map(f => f.name).join(', ')}\nRun: node tools/validate-mined-data.cjs --fix`;
    fs.writeFileSync(healthFile, critMsg + '\n');
    fs.writeFileSync(alertFile, critMsg + '\n');
    process.stderr.write(`\n  [MYCELIUM CRITICAL] Data quality below threshold: ${overall}/100\n`);
    process.stderr.write(`  Failed: ${failed.map(f => f.name).join(', ')}\n`);
    process.stderr.write(`  Run: node tools/validate-mined-data.cjs --fix\n\n`);
  }
  
  // Exit code
  if (STRICT && failed.length > 0) process.exit(1);
  if (overall < 40) process.exit(1);
}

main();
