#!/usr/bin/env node
/**
 * upgrade-mined-data.cjs — Data Product Quality Upgrade
 * 
 * Fixes 5 critical gaps to make mined data sale-ready:
 *   GAP 1: Merge extracted+enriched into single unified file
 *   GAP 2: Fill fix chains with primary file, lesson, category
 *   GAP 3: Sync DB exports 
 *   GAP 4: Export watch.json risk intelligence into mined data
 *   GAP 5: Export memory.json decisions/reflections/learnings into mined data
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MINED_DIR = path.join(__dirname, '..', '.mycelium-mined');
const MYCELIUM_DIR = path.join(__dirname, '..', '.mycelium');
const DB_DIR = path.join(MINED_DIR, 'db');

function loadJSON(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return null; }
}
function saveJSON(fp, data) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
}

const stats = { gap1: 0, gap2: 0, gap3: 0, gap4: 0, gap5: 0 };

// ─── GAP 1: Merge extracted + enriched into unified file ─────────────
console.log('\n═══ GAP 1: Merging extracted + enriched → unified ═══');

const ext = loadJSON(path.join(MINED_DIR, 'webapp-extracted.json'));
const enr = loadJSON(path.join(MINED_DIR, 'webapp-enriched.json'));

if (ext && enr) {
  // Build hash→enrichment lookup
  const enrichMap = {};
  for (const c of (enr.fixCommits || [])) {
    if (c.hash && c.enrichment) enrichMap[c.hash] = c.enrichment;
  }
  
  // Merge enrichment INTO extracted commits
  for (const c of (ext.fixCommits || [])) {
    const e = enrichMap[c.hash];
    if (e) {
      c.rootCause = e.rootCause || null;
      c.category = e.category || null;
      c.prevention = e.prevention || null;
      c.severity = e.severity || null;
      c.technology = e.technology || null;
      c.atomType = e.atomType || null;
      stats.gap1++;
    }
  }
  
  // Add enrichment metadata
  ext.meta = ext.meta || {};
  ext.meta.enrichedAt = enr.enrichmentMeta?.enrichedAt || new Date().toISOString();
  ext.meta.enrichmentModel = enr.enrichmentMeta?.model || 'deep-diff-v2';
  ext.meta.totalEnriched = stats.gap1;
  ext.meta.upgradedAt = new Date().toISOString();
  ext.meta.version = '3.0-unified';
  
  console.log(`  Merged ${stats.gap1}/${ext.fixCommits.length} commits with enrichment data`);
  
  // Save unified and backup enriched
  saveJSON(path.join(MINED_DIR, 'webapp-extracted.json'), ext);
  console.log('  ✓ webapp-extracted.json now contains enrichment fields inline');
}

// ─── GAP 2: Fill fix chains ─────────────────────────────────────────
console.log('\n═══ GAP 2: Filling fix chains with primary file + lesson + category ═══');

const chains = ext?.fixChains || [];
const commitLookup = {};
for (const c of (ext?.fixCommits || [])) {
  commitLookup[c.hash] = c;
}

for (const chain of chains) {
  // Derive primary file: most common non-config file in overlappingFiles
  const overlap = chain.overlappingFiles || [];
  const configNoise = ['.gitignore', 'package.json', 'package-lock.json', '.husky/', 
                       'mycelium.cjs', 'mycelium-watch.cjs', 'bin/', '.mycelium/'];
  const meaningful = overlap.filter(f => !configNoise.some(n => f.includes(n)));
  
  if (meaningful.length > 0) {
    // Pick the most specific file (deepest path = most targeted)
    meaningful.sort((a, b) => b.split('/').length - a.split('/').length);
    chain.primaryFile = meaningful[0];
    chain.affectedFiles = meaningful.slice(0, 5);
  } else if (overlap.length > 0) {
    chain.primaryFile = overlap[0];
    chain.affectedFiles = overlap.slice(0, 5);
  }
  
  // Derive lesson from fix commit message + enrichment
  const fixCommit = commitLookup[chain.fixCommit];
  if (fixCommit) {
    chain.lesson = fixCommit.rootCause || fixCommit.message || chain.fixMsg;
    chain.category = fixCommit.category || 'unknown';
    chain.severity = fixCommit.severity || 'medium';
    chain.prevention = fixCommit.prevention || null;
  } else {
    // Fallback: extract lesson from fixMsg
    chain.lesson = chain.fixMsg || null;
    chain.category = 'unknown';
    chain.severity = 'medium';
  }
  
  // Find related commits: other fix commits touching the same primary file
  if (chain.primaryFile) {
    const related = (ext?.fixCommits || []).filter(c => {
      if (c.hash === chain.breakCommit || c.hash === chain.fixCommit) return false;
      return (c.files || []).some(f => f === chain.primaryFile);
    }).map(c => ({ hash: (c.hash || '').substring(0, 12), message: c.message, category: c.category }));
    if (related.length > 0) {
      chain.relatedFixCommits = related.slice(0, 5);
    }
  }
  
  chain.commitCount = 2 + (chain.relatedFixCommits || []).length;
  
  if (chain.primaryFile) stats.gap2++;
}

ext.fixChains = chains;
saveJSON(path.join(MINED_DIR, 'webapp-extracted.json'), ext);
console.log(`  Filled ${stats.gap2}/${chains.length} chains with primary file + lesson + category`);

// ─── GAP 3: Sync DB exports ─────────────────────────────────────────
console.log('\n═══ GAP 3: Syncing DB exports ═══');

// Rebuild fix-commits.jsonl from unified extracted data
const fixLines = (ext.fixCommits || []).map(c => JSON.stringify({
  hash: c.hash,
  date: c.date,
  message: c.message,
  files: c.files,
  fileCount: (c.files || []).length,
  rootCause: c.rootCause || null,
  category: c.category || null,
  severity: c.severity || null,
  prevention: c.prevention || null,
  technology: c.technology || null,
  isFix: true
}));
fs.writeFileSync(path.join(DB_DIR, 'fix-commits.jsonl'), fixLines.join('\n') + '\n');
stats.gap3 += fixLines.length;

// Rebuild fix-chains.csv
const chainCsvLines = ['breakCommit,fixCommit,primaryFile,category,severity,lesson,hoursToFix,commitCount,affectedFileCount'];
for (const ch of chains) {
  const esc = s => `"${(s || '').replace(/"/g, '""').substring(0, 200)}"`;
  chainCsvLines.push([
    ch.breakCommit?.substring(0, 12),
    ch.fixCommit?.substring(0, 12),
    esc(ch.primaryFile),
    ch.category || 'unknown',
    ch.severity || 'medium',
    esc(ch.lesson),
    ch.hoursToFix ?? '',
    ch.commitCount || 2,
    (ch.affectedFiles || []).length
  ].join(','));
}
fs.writeFileSync(path.join(DB_DIR, 'fix-chains.csv'), chainCsvLines.join('\n') + '\n');

// Rebuild patterns-api.json with enriched data
const pat = loadJSON(path.join(MINED_DIR, 'webapp-patterns.json'));
if (pat) {
  const apiData = {
    version: '3.0-unified',
    schema: 'mycelium-patterns-v3',
    generatedAt: new Date().toISOString(),
    repo: pat.meta || {},
    summary: pat.summary || {},
    patterns: pat.patterns || [],
    insights: pat.singletonInsights || [],
    hotspots: (ext.hotspots || []).slice(0, 30),
    coupling: (ext.coChanges || []).slice(0, 50)
  };
  saveJSON(path.join(DB_DIR, 'patterns-api.json'), apiData);
}

console.log(`  Synced ${stats.gap3} fix commits to DB + rebuilt fix-chains.csv + patterns-api.json`);

// ─── GAP 4: Export watch.json risk intelligence ──────────────────────
console.log('\n═══ GAP 4: Exporting watch.json risk intelligence ═══');

const watch = loadJSON(path.join(MYCELIUM_DIR, 'watch.json'));
if (watch) {
  const risks = watch.risks || {};
  
  // Build risk intelligence export
  const riskExport = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    source: 'watch.json',
    summary: {
      totalFiles: Object.keys(risks).length,
      totalLessons: 0,
      totalConstraints: 0,
      highRiskFiles: 0,
      escalatedFiles: 0,
      volatileFiles: 0
    },
    // High-value: files with 5+ breaks, sorted by break count
    highRiskFiles: [],
    // All file risk profiles
    riskProfiles: [],
    // Coupling intelligence
    couplings: Object.entries(watch.couplings || {}).map(([pair, data]) => ({
      files: pair.split('|'),
      frequency: typeof data === 'number' ? data : data?.count || 0
    })).sort((a, b) => b.frequency - a.frequency).slice(0, 100),
    // Breakage patterns from watch
    breakagePatterns: (watch.breakages || []).map(b => ({
      pattern: b.pattern || b.msg,
      files: b.files?.slice(0, 10),
      date: b.date,
      lesson: b.lesson || null
    }))
  };
  
  for (const [file, risk] of Object.entries(risks)) {
    const lessons = risk.lessons || [];
    const constraints = risk.constraints || [];
    const profile = {
      file,
      breakCount: risk.breakCount || 0,
      lastBreak: risk.lastBreak || null,
      lessons: lessons.map(l => typeof l === 'string' ? l : l?.text || String(l)),
      constraints: constraints.map(c => typeof c === 'string' ? c : c?.text || String(c)),
      escalated: !!risk.escalated,
      volatile: !!risk.volatile,
      escalatedReason: risk.escalatedReason || null,
      volatileReason: risk.volatileReason || null
    };
    
    riskExport.summary.totalLessons += lessons.length;
    riskExport.summary.totalConstraints += constraints.length;
    if (profile.breakCount >= 5) {
      riskExport.summary.highRiskFiles++;
      riskExport.highRiskFiles.push(profile);
    }
    if (profile.escalated) riskExport.summary.escalatedFiles++;
    if (profile.volatile) riskExport.summary.volatileFiles++;
    
    riskExport.riskProfiles.push(profile);
    stats.gap4++;
  }
  
  // Sort high-risk by break count
  riskExport.highRiskFiles.sort((a, b) => b.breakCount - a.breakCount);
  
  saveJSON(path.join(MINED_DIR, 'webapp-risk-intelligence.json'), riskExport);
  
  // Also export as CSV for DB
  const riskCsvLines = ['file,breakCount,lessonCount,constraintCount,escalated,volatile,lastBreak'];
  for (const p of riskExport.riskProfiles) {
    const esc = s => `"${(s || '').replace(/"/g, '""')}"`;
    riskCsvLines.push([
      esc(p.file), p.breakCount, p.lessons.length, p.constraints.length,
      p.escalated ? 1 : 0, p.volatile ? 1 : 0, p.lastBreak || ''
    ].join(','));
  }
  fs.writeFileSync(path.join(DB_DIR, 'risk-profiles.csv'), riskCsvLines.join('\n') + '\n');
  
  // Export lessons as separate JSONL (premium data)
  const lessonLines = [];
  for (const [file, risk] of Object.entries(risks)) {
    for (const lesson of (risk.lessons || [])) {
      const text = typeof lesson === 'string' ? lesson : lesson?.text || String(lesson);
      if (text && text.length > 5) {
        lessonLines.push(JSON.stringify({
          file,
          breakCount: risk.breakCount || 0,
          lesson: text.substring(0, 300),
          escalated: !!risk.escalated
        }));
      }
    }
  }
  fs.writeFileSync(path.join(DB_DIR, 'lessons.jsonl'), lessonLines.join('\n') + '\n');
  
  console.log(`  Exported ${stats.gap4} risk profiles, ${riskExport.summary.totalLessons} lessons, ${riskExport.summary.totalConstraints} constraints`);
  console.log(`  → webapp-risk-intelligence.json (${(JSON.stringify(riskExport).length / 1024).toFixed(0)} KB)`);
  console.log(`  → db/risk-profiles.csv + db/lessons.jsonl`);
}

// ─── GAP 5: Export memory.json decisions/reflections/learnings ───────
console.log('\n═══ GAP 5: Exporting memory.json developer intelligence ═══');

const memory = loadJSON(path.join(MYCELIUM_DIR, 'memory.json'));
if (memory) {
  const devIntel = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    source: 'memory.json',
    summary: {
      learnings: (memory.learnings || []).length,
      decisions: (memory.decisions || []).length,
      constraints: Object.values(memory.constraints || {}).reduce((s, v) => s + v.length, 0),
      constraintAreas: Object.keys(memory.constraints || {}).length,
      reflections: (memory.reflections || []).length,
      breakages: (memory.breakages || []).length,
      snapshots: (memory.snapshots || []).length
    },
    
    // Developer learnings (what was learned from each failure)
    learnings: (memory.learnings || []).map(l => ({
      area: l.area,
      lesson: l.lesson,
      date: l.date || l.ts,
      timestamp: l.ts
    })),
    
    // Architectural decisions (what was decided and why)
    decisions: (memory.decisions || []).map(d => ({
      area: d.area,
      what: d.decision || d.what || null,
      why: d.why,
      date: d.date || d.ts,
      timestamp: d.ts
    })),
    
    // Constraints per area (rules that must be followed)
    constraints: Object.entries(memory.constraints || {}).map(([area, rules]) => ({
      area,
      rules: rules.map(r => typeof r === 'string' ? r : r?.fact || String(r))
    })),
    
    // Reflections (meta-learnings about the development process)
    reflections: (memory.reflections || []).map(r => ({
      type: r.type,
      lesson: r.lesson,
      area: r.area,
      date: r.date || r.ts
    })),
    
    // Breakage records
    breakages: (memory.breakages || []).map(b => ({
      area: b.area,
      what: b.what,
      date: b.date || b.ts,
      commit: b.commit
    })),
    
    // Bundle size trend (shows project growth over time)
    bundleTrend: (memory.patterns?.bundleTrend || []).slice(-50)
  };
  
  stats.gap5 = devIntel.summary.learnings + devIntel.summary.decisions + 
               devIntel.summary.constraints + devIntel.summary.reflections;
  
  saveJSON(path.join(MINED_DIR, 'webapp-dev-intelligence.json'), devIntel);
  
  // Export decisions as CSV
  const decCsvLines = ['area,what,why,date'];
  for (const d of devIntel.decisions) {
    const esc = s => `"${(s || '').replace(/"/g, '""').substring(0, 200)}"`;
    decCsvLines.push([esc(d.area), esc(d.what || ''), esc(d.why), d.date || ''].join(','));
  }
  fs.writeFileSync(path.join(DB_DIR, 'decisions.csv'), decCsvLines.join('\n') + '\n');
  
  // Export learnings as CSV  
  const learnCsvLines = ['area,lesson,date'];
  for (const l of devIntel.learnings) {
    const esc = s => `"${(s || '').replace(/"/g, '""').substring(0, 200)}"`;
    learnCsvLines.push([esc(l.area), esc(l.lesson), l.date || ''].join(','));
  }
  fs.writeFileSync(path.join(DB_DIR, 'learnings.csv'), learnCsvLines.join('\n') + '\n');
  
  console.log(`  Exported ${stats.gap5} intelligence items`);
  console.log(`  → webapp-dev-intelligence.json (${(JSON.stringify(devIntel).length / 1024).toFixed(0)} KB)`);
  console.log(`  → db/decisions.csv + db/learnings.csv`);
}

// ─── FINAL REPORT ────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(70));
console.log('DATA PRODUCT UPGRADE COMPLETE');
console.log('═'.repeat(70));
console.log(`  GAP 1 — Unified commits:     ${stats.gap1} enrichments merged inline`);
console.log(`  GAP 2 — Filled fix chains:    ${stats.gap2}/${chains.length} chains with file+lesson+category`);
console.log(`  GAP 3 — Synced DB:            ${stats.gap3} fix commits + rebuilt CSVs`);
console.log(`  GAP 4 — Risk intelligence:    ${stats.gap4} risk profiles exported`);
console.log(`  GAP 5 — Dev intelligence:     ${stats.gap5} items exported`);

// File sizes
console.log('\nFILE INVENTORY:');
const files = [
  'webapp-extracted.json',       // unified
  'webapp-enriched.json',        // backup (can delete)
  'webapp-patterns.json',
  'webapp-precommit-rules.json',
  'webapp-risk-intelligence.json', // NEW
  'webapp-dev-intelligence.json',  // NEW
];
let totalSize = 0;
for (const f of files) {
  const fp = path.join(MINED_DIR, f);
  if (fs.existsSync(fp)) {
    const size = fs.statSync(fp).size;
    totalSize += size;
    console.log(`  ${f.padEnd(35)} ${(size/1024).toFixed(0).padStart(6)} KB`);
  }
}
// DB files
const dbFiles = fs.readdirSync(DB_DIR);
for (const f of dbFiles) {
  const fp = path.join(DB_DIR, f);
  const size = fs.statSync(fp).size;
  totalSize += size;
  console.log(`  db/${f.padEnd(32)} ${(size/1024).toFixed(0).padStart(6)} KB`);
}
console.log(`  ${'─'.repeat(42)} ${'─'.repeat(8)}`);
console.log(`  ${'TOTAL'.padEnd(35)} ${(totalSize/1024).toFixed(0).padStart(6)} KB`);
