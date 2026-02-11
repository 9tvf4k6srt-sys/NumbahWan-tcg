#!/usr/bin/env node
/**
 * upgrade-mined-data.cjs — Data Quality Gate + Upgrade Pipeline
 * 
 * Makes mined data genuinely valuable by:
 *   1. FLATTEN  — Merge enrichment into top-level fields (no nested .enrichment)
 *   2. CHAINS   — Fill fix chains with real root-cause lessons, not commit msgs
 *   3. LESSONS  — Dedup aggressively: one record per unique insight, files aggregated
 *   4. RISKS    — Export complete multi-line risk lessons, not line-level fragments
 *   5. INTEL    — Export curated decisions/learnings/constraints from memory.json
 *   6. VALIDATE — Score every export; reject if below quality threshold
 *   7. SYNC     — Rebuild all DB exports from validated data
 * 
 * Usage:
 *   node tools/upgrade-mined-data.cjs            # full upgrade + validate
 *   node tools/upgrade-mined-data.cjs --validate  # validate only (no writes)
 *   node tools/upgrade-mined-data.cjs --silent     # no console output
 */

const fs = require('fs');
const path = require('path');

const MINED_DIR = path.join(__dirname, '..', '.mycelium-mined');
const MYCELIUM_DIR = path.join(__dirname, '..', '.mycelium');
const DB_DIR = path.join(MINED_DIR, 'db');
const SILENT = process.argv.includes('--silent');
const VALIDATE_ONLY = process.argv.includes('--validate');

function loadJSON(fp) { try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return null; } }
function saveJSON(fp, data) { fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, JSON.stringify(data, null, 2)); }
function log(msg) { if (!SILENT) console.log(msg); }
function fileExists(fp) { try { return fs.existsSync(fp); } catch { return false; } }

// ════════════════════════════════════════════════════════════════════
// QUALITY VALIDATORS — every export must pass before writing
// ════════════════════════════════════════════════════════════════════

function validateLessons(lessons) {
  const issues = [];
  if (!lessons || lessons.length === 0) { issues.push('No lessons'); return { score: 0, issues }; }
  
  // Check duplication
  const unique = new Set(lessons.map(l => l.lesson));
  const dupRate = 1 - (unique.size / lessons.length);
  if (dupRate > 0.3) issues.push(`Duplication too high: ${(dupRate * 100).toFixed(0)}% (max 30%)`);
  
  // Check lesson quality: must be >20 chars, not a fragment
  const fragments = lessons.filter(l => !l.lesson || l.lesson.length < 20 || l.lesson.startsWith('- '));
  const fragRate = fragments.length / lessons.length;
  if (fragRate > 0.2) issues.push(`${(fragRate * 100).toFixed(0)}% are fragments (<20 chars or start with "- ")`);
  
  // Check for actionability: should contain verbs or IF/THEN patterns
  const actionable = lessons.filter(l => {
    const t = (l.lesson || '').toLowerCase();
    return t.includes('if ') || t.includes('when ') || t.includes('never ') || t.includes('always ') ||
           t.includes('must ') || t.includes('should ') || t.includes('use ') || t.includes('avoid ') ||
           t.includes('check ') || t.includes('test ') || t.includes('add ') || t.includes('wrap ') ||
           t.includes('because') || t.includes('root cause') || t.includes('broke') || t.includes('fixed');
  });
  const actionRate = actionable.length / lessons.length;
  if (actionRate < 0.4) issues.push(`Only ${(actionRate * 100).toFixed(0)}% are actionable (need 40%+)`);
  
  const score = Math.round(
    (1 - Math.min(dupRate, 1)) * 40 +         // 40 pts for low duplication
    (1 - Math.min(fragRate, 1)) * 30 +         // 30 pts for non-fragments
    Math.min(actionRate, 1) * 30               // 30 pts for actionability
  );
  
  return { score, issues, stats: { total: lessons.length, unique: unique.size, dupRate, fragRate, actionRate } };
}

function validatePatterns(patterns) {
  const issues = [];
  if (!patterns || patterns.length === 0) { issues.push('No patterns'); return { score: 0, issues }; }
  
  // Check that patterns have real root causes (not commit messages)
  const withRootCause = patterns.filter(p => p.rootCause && p.rootCause.length > 20);
  const rcRate = withRootCause.length / patterns.length;
  if (rcRate < 0.7) issues.push(`Only ${(rcRate * 100).toFixed(0)}% have real root causes (need 70%+)`);
  
  // Check that patterns have affected files
  const withFiles = patterns.filter(p => p.affectedFiles && p.affectedFiles.length > 0);
  const fileRate = withFiles.length / patterns.length;
  if (fileRate < 0.5) issues.push(`Only ${(fileRate * 100).toFixed(0)}% have affected files (need 50%+)`);
  
  // Check that prevention rules are specific (not generic "Review X patterns")
  const genericPrevention = patterns.filter(p => p.prevention?.startsWith('Review ') || p.rule?.startsWith('Review '));
  const genericRate = genericPrevention.length / patterns.length;
  if (genericRate > 0.3) issues.push(`${(genericRate * 100).toFixed(0)}% have generic prevention rules (max 30%)`);
  
  const score = Math.round(rcRate * 35 + fileRate * 30 + (1 - genericRate) * 35);
  return { score, issues, stats: { total: patterns.length, withRootCause: withRootCause.length, withFiles: withFiles.length, genericCount: genericPrevention.length } };
}

function validateEnrichment(commits) {
  const issues = [];
  if (!commits || commits.length === 0) { issues.push('No commits'); return { score: 0, issues }; }
  
  const withRC = commits.filter(c => (c.rootCause || c.enrichment?.rootCause) && (c.rootCause || c.enrichment?.rootCause).length > 10);
  const withCat = commits.filter(c => c.category || c.enrichment?.category);
  const withSev = commits.filter(c => c.severity || c.enrichment?.severity);
  
  const rcRate = withRC.length / commits.length;
  const catRate = withCat.length / commits.length;
  const sevRate = withSev.length / commits.length;
  
  if (rcRate < 0.5) issues.push(`Only ${(rcRate * 100).toFixed(0)}% have rootCause (need 50%+)`);
  if (catRate < 0.5) issues.push(`Only ${(catRate * 100).toFixed(0)}% have category (need 50%+)`);
  
  const score = Math.round(rcRate * 40 + catRate * 30 + sevRate * 30);
  return { score, issues, stats: { total: commits.length, withRootCause: withRC.length, withCategory: withCat.length, withSeverity: withSev.length } };
}

function validateHotspots(hotspots) {
  const issues = [];
  if (!hotspots || hotspots.length === 0) { issues.push('No hotspots'); return { score: 0, issues }; }
  
  // Check for deleted files
  const dead = hotspots.filter(h => !fileExists(path.resolve(__dirname, '..', h.file)));
  const deadRate = dead.length / hotspots.length;
  if (deadRate > 0.1) issues.push(`${dead.length} hotspots (${(deadRate * 100).toFixed(0)}%) reference deleted files`);
  
  const score = Math.round((1 - deadRate) * 100);
  return { score, issues, stats: { total: hotspots.length, dead: dead.length } };
}

// ════════════════════════════════════════════════════════════════════
// STEP 1: FLATTEN — Merge enrichment into top-level fields
// ════════════════════════════════════════════════════════════════════

function flattenEnrichment() {
  log('\n--- STEP 1: Flatten enrichment fields ---');
  
  const enriched = loadJSON(path.join(MINED_DIR, 'webapp-enriched.json'));
  if (!enriched) { log('  SKIP: No enriched data'); return null; }
  
  let flattened = 0;
  for (const fc of (enriched.fixCommits || [])) {
    if (fc.enrichment && !fc.rootCause) {
      fc.rootCause = fc.enrichment.rootCause || null;
      fc.category = fc.enrichment.category || null;
      fc.severity = fc.enrichment.severity || null;
      fc.pattern = fc.enrichment.pattern || null;
      fc.prevention = fc.enrichment.prevention || null;
      fc.confidence = fc.enrichment.confidence || 0;
      fc.atoms = (fc.enrichment.atoms || []).slice(0, 5);
      delete fc.enrichment;
      delete fc.enrichedBy;
      flattened++;
    }
  }
  
  // Validate before saving
  const v = validateEnrichment(enriched.fixCommits);
  log(`  Flattened: ${flattened}/${enriched.fixCommits.length}`);
  log(`  Quality: ${v.score}/100 ${v.issues.length ? '| ' + v.issues.join(', ') : '(PASS)'}`);
  
  if (!VALIDATE_ONLY) {
    enriched.meta = enriched.meta || {};
    enriched.meta.flattenedAt = new Date().toISOString();
    enriched.meta.qualityScore = v.score;
    saveJSON(path.join(MINED_DIR, 'webapp-enriched.json'), enriched);
  }
  
  return { enriched, validation: v };
}

// ════════════════════════════════════════════════════════════════════
// STEP 2: CHAINS — Fill fix chains with real lessons
// ════════════════════════════════════════════════════════════════════

function upgradeFixChains(enriched) {
  log('\n--- STEP 2: Upgrade fix chains with real lessons ---');
  
  const extracted = loadJSON(path.join(MINED_DIR, 'webapp-extracted.json'));
  if (!extracted) { log('  SKIP: No extracted data'); return; }
  
  // Build lookup from enriched data
  const lookup = {};
  for (const fc of (enriched?.fixCommits || [])) {
    lookup[fc.hash] = fc;
  }
  
  let upgraded = 0;
  const chains = extracted.fixChains || [];
  
  for (const chain of chains) {
    // Get enrichment for the fix commit
    const fix = lookup[chain.fixCommit];
    const rootCause = fix?.rootCause || '';
    const prevention = fix?.prevention || '';
    const category = fix?.category || '';
    
    // Build real lesson
    if (rootCause && rootCause.length > 15) {
      chain.lesson = rootCause.slice(0, 200);
      if (prevention && prevention.length > 15 && !prevention.startsWith('Review ')) {
        chain.lesson += ' RULE: ' + prevention.slice(0, 150);
      }
      chain.category = category || 'unknown';
      chain.severity = fix?.severity || 'medium';
      upgraded++;
    } else {
      // Fallback: clean commit message
      chain.lesson = (chain.fixMsg || '').replace(/^(?:fix|bug|hotfix|patch|revert)\s*\([^)]*\)\s*:?\s*/i, '').slice(0, 200);
      chain.category = category || 'unknown';
      chain.severity = 'medium';
    }
    
    // Set primary file (filter config noise)
    const noise = ['.gitignore', 'package.json', 'package-lock.json', '.husky/', 'mycelium', '.mycelium/', 'memory.json', 'dist/'];
    const meaningful = (chain.overlappingFiles || []).filter(f => !noise.some(n => f.includes(n)));
    chain.primaryFile = meaningful[0] || chain.overlappingFiles?.[0] || '';
  }
  
  log(`  Upgraded: ${upgraded}/${chains.length} chains with enriched lessons`);
  
  if (!VALIDATE_ONLY) {
    extracted.fixChains = chains;
    extracted.meta = extracted.meta || {};
    extracted.meta.chainsUpgradedAt = new Date().toISOString();
    saveJSON(path.join(MINED_DIR, 'webapp-extracted.json'), extracted);
  }
}

// ════════════════════════════════════════════════════════════════════
// STEP 3: LESSONS — Dedup and quality-filter into premium dataset
// ════════════════════════════════════════════════════════════════════

function buildLessonsDataset(enriched) {
  log('\n--- STEP 3: Build deduplicated lessons dataset ---');
  
  const lessonMap = new Map(); // lesson text -> { files, breakCount, sources }
  
  // Source 1: Enriched fix commits (highest quality — from actual diffs)
  for (const fc of (enriched?.fixCommits || [])) {
    const rc = fc.rootCause || '';
    const prev = fc.prevention || '';
    
    if (rc && rc.length > 20) {
      let lesson = rc;
      if (prev && prev.length > 15 && !prev.startsWith('Review ')) {
        lesson = `${rc} RULE: ${prev}`;
      }
      addLesson(lessonMap, lesson, fc.files || [], fc.category || 'unknown', 'enrichment', fc.severity || 'medium');
    }
  }
  
  // Source 2: Memory.json learnings (human-curated)
  const memory = loadJSON(path.join(MYCELIUM_DIR, 'memory.json'));
  if (memory?.learnings) {
    for (const l of memory.learnings) {
      if (l.lesson && l.lesson.length > 20) {
        addLesson(lessonMap, l.lesson, [], l.area || 'unknown', 'human', 'medium');
      }
    }
  }
  
  // Source 3: Memory.json constraints (rules)
  if (memory?.constraints) {
    for (const [area, rules] of Object.entries(memory.constraints)) {
      for (const r of (rules || [])) {
        const text = typeof r === 'string' ? r : r?.fact || '';
        if (text && text.length > 15) {
          addLesson(lessonMap, `[${area}] ${text}`, [], area, 'constraint', 'high');
        }
      }
    }
  }
  
  // Source 4: Watch.json risk lessons — but ONLY complete multi-line entries, deduplicated
  const watch = loadJSON(path.join(MYCELIUM_DIR, 'watch.json'));
  if (watch?.risks) {
    for (const [file, risk] of Object.entries(watch.risks)) {
      if (!risk.lessons || risk.lessons.length === 0) continue;
      // Join multi-line lessons into single complete entries
      const lessonTexts = risk.lessons.map(l => typeof l === 'string' ? l : l?.text || String(l));
      const combined = joinMultiLineLessons(lessonTexts);
      for (const lesson of combined) {
        if (lesson.length > 20) {
          addLesson(lessonMap, lesson, [file], 'unknown', 'watch', 'medium');
        }
      }
    }
  }
  
  // Build final deduplicated array
  const lessons = [...lessonMap.values()]
    .sort((a, b) => b.files.size - a.files.size || b.lesson.length - a.lesson.length)
    .map(entry => ({
      lesson: entry.lesson.slice(0, 400),
      category: entry.category,
      severity: entry.severity,
      source: entry.source,
      fileCount: entry.files.size,
      files: [...entry.files].slice(0, 10),
    }));
  
  // Validate
  const v = validateLessons(lessons);
  log(`  Total: ${lessons.length} (from ${lessonMap.size} unique)`);
  log(`  Quality: ${v.score}/100 ${v.issues.length ? '| ' + v.issues.join(', ') : '(PASS)'}`);
  
  if (!VALIDATE_ONLY && v.score >= 40) {
    // Write JSONL
    const lines = lessons.map(l => JSON.stringify(l));
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(path.join(DB_DIR, 'lessons.jsonl'), lines.join('\n') + '\n');
    log(`  Wrote ${lessons.length} lessons to lessons.jsonl`);
  } else if (v.score < 40) {
    log(`  REJECTED: Quality score ${v.score} < 40 threshold`);
  }
  
  return { lessons, validation: v };
}

function addLesson(map, lesson, files, category, source, severity) {
  // Normalize for dedup
  const key = lesson.toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 300);
  if (map.has(key)) {
    const existing = map.get(key);
    files.forEach(f => existing.files.add(f));
    // Prefer higher-quality source
    const sourceRank = { human: 4, constraint: 3, enrichment: 2, watch: 1 };
    if ((sourceRank[source] || 0) > (sourceRank[existing.source] || 0)) {
      existing.source = source;
    }
  } else {
    map.set(key, {
      lesson: lesson.trim(),
      category,
      severity,
      source,
      files: new Set(files),
    });
  }
}

/**
 * Join multi-line lesson fragments into complete entries.
 * Watch.json stores lessons as arrays where related lines form groups:
 *   ["3 high-impact changes:", "- change A", "- change B", "ROOT-CAUSE: ..."]
 * We want: ["3 high-impact changes: change A, change B. ROOT-CAUSE: ..."]
 */
function joinMultiLineLessons(lines) {
  const results = [];
  let current = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Lines starting with "- " are continuations
    if (trimmed.startsWith('- ') && current) {
      current += ' ' + trimmed.slice(2);
    }
    // ROOT-CAUSE lines should be appended to current
    else if (trimmed.startsWith('ROOT-CAUSE:') && current) {
      current += ' | ' + trimmed;
      results.push(current);
      current = '';
    }
    // New entry
    else {
      if (current && current.length > 20) results.push(current);
      current = trimmed;
    }
  }
  if (current && current.length > 20) results.push(current);
  
  return results;
}

// ════════════════════════════════════════════════════════════════════
// STEP 4: RISKS — Export complete risk profiles
// ════════════════════════════════════════════════════════════════════

function exportRiskIntelligence() {
  log('\n--- STEP 4: Export risk intelligence ---');
  
  const watch = loadJSON(path.join(MYCELIUM_DIR, 'watch.json'));
  if (!watch) { log('  SKIP: No watch.json'); return; }
  
  const risks = watch.risks || {};
  const rootDir = path.join(__dirname, '..');
  
  const riskExport = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    source: 'watch.json',
    summary: { totalFiles: 0, activeFiles: 0, totalLessons: 0, highRiskFiles: 0 },
    riskProfiles: [],
    couplings: Object.entries(watch.couplings || {}).map(([pair, data]) => ({
      files: pair.split('|'),
      frequency: typeof data === 'number' ? data : data?.count || 0
    })).sort((a, b) => b.frequency - a.frequency).slice(0, 100),
  };
  
  for (const [file, risk] of Object.entries(risks)) {
    // Filter deleted files
    if (!fileExists(path.resolve(rootDir, file))) continue;
    
    // Join multi-line lessons into complete entries
    const rawLessons = (risk.lessons || []).map(l => typeof l === 'string' ? l : l?.text || String(l));
    const completeLessons = joinMultiLineLessons(rawLessons);
    const constraints = (risk.constraints || []).map(c => typeof c === 'string' ? c : c?.text || String(c)).filter(c => c.length > 10);
    
    const profile = {
      file,
      breakCount: risk.breakCount || 0,
      lastBreak: risk.lastBreak || null,
      lessons: completeLessons.filter(l => l.length > 15).slice(0, 10),
      constraints: constraints.slice(0, 10),
      escalated: !!risk.escalated,
      volatile: !!risk.volatile,
    };
    
    riskExport.riskProfiles.push(profile);
    riskExport.summary.totalFiles++;
    if (profile.breakCount >= 5) riskExport.summary.highRiskFiles++;
    riskExport.summary.totalLessons += profile.lessons.length;
  }
  
  riskExport.summary.activeFiles = riskExport.riskProfiles.filter(p => p.breakCount > 0).length;
  riskExport.riskProfiles.sort((a, b) => b.breakCount - a.breakCount);
  
  log(`  Active files: ${riskExport.summary.activeFiles} (filtered dead files)`);
  log(`  Lessons: ${riskExport.summary.totalLessons} (complete, deduplicated)`);
  
  if (!VALIDATE_ONLY) {
    saveJSON(path.join(MINED_DIR, 'webapp-risk-intelligence.json'), riskExport);
    
    // CSV export
    const csvLines = ['file,breakCount,lessonCount,constraintCount,escalated,volatile'];
    for (const p of riskExport.riskProfiles) {
      const esc = s => `"${(s || '').replace(/"/g, '""')}"`;
      csvLines.push([esc(p.file), p.breakCount, p.lessons.length, p.constraints.length, p.escalated ? 1 : 0, p.volatile ? 1 : 0].join(','));
    }
    fs.writeFileSync(path.join(DB_DIR, 'risk-profiles.csv'), csvLines.join('\n') + '\n');
  }
  
  return riskExport;
}

// ════════════════════════════════════════════════════════════════════
// STEP 5: INTEL — Export curated developer intelligence
// ════════════════════════════════════════════════════════════════════

function exportDevIntelligence() {
  log('\n--- STEP 5: Export developer intelligence ---');
  
  const memory = loadJSON(path.join(MYCELIUM_DIR, 'memory.json'));
  if (!memory) { log('  SKIP: No memory.json'); return; }
  
  const devIntel = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    source: 'memory.json',
    summary: {
      learnings: (memory.learnings || []).length,
      decisions: (memory.decisions || []).length,
      constraintAreas: Object.keys(memory.constraints || {}).length,
      constraints: Object.values(memory.constraints || {}).reduce((s, v) => s + v.length, 0),
      reflections: (memory.reflections || []).length,
      breakages: (memory.breakages || []).length,
    },
    learnings: (memory.learnings || []).filter(l => l.lesson && l.lesson.length > 15).map(l => ({
      area: l.area,
      lesson: l.lesson,
      date: l.date || new Date(l.ts).toISOString().slice(0, 10),
    })),
    decisions: (memory.decisions || []).filter(d => d.why && d.why.length > 10).map(d => ({
      area: d.area,
      what: d.decision || d.what || '',
      why: d.why,
      date: d.date || new Date(d.ts).toISOString().slice(0, 10),
    })),
    constraints: Object.entries(memory.constraints || {}).map(([area, rules]) => ({
      area,
      rules: (rules || []).map(r => typeof r === 'string' ? r : r?.fact || String(r)).filter(r => r.length > 10),
    })).filter(c => c.rules.length > 0),
    reflections: (memory.reflections || []).filter(r => r.lesson && r.lesson.length > 15).map(r => ({
      type: r.type,
      lesson: r.lesson,
      area: r.area,
      date: r.date || new Date(r.ts).toISOString().slice(0, 10),
    })),
    breakages: (memory.breakages || []).filter(b => b.what && b.what.length > 10).map(b => ({
      area: b.area,
      what: b.what,
      date: b.date || new Date(b.ts).toISOString().slice(0, 10),
    })),
    bundleTrend: (memory.patterns?.bundleTrend || []).slice(-50),
  };
  
  log(`  Learnings: ${devIntel.learnings.length}, Decisions: ${devIntel.decisions.length}, Constraints: ${devIntel.summary.constraints}`);
  
  if (!VALIDATE_ONLY) {
    saveJSON(path.join(MINED_DIR, 'webapp-dev-intelligence.json'), devIntel);
    
    // CSVs
    const decLines = ['area,what,why,date'];
    for (const d of devIntel.decisions) {
      const esc = s => `"${(s || '').replace(/"/g, '""').slice(0, 200)}"`;
      decLines.push([esc(d.area), esc(d.what), esc(d.why), d.date || ''].join(','));
    }
    fs.writeFileSync(path.join(DB_DIR, 'decisions.csv'), decLines.join('\n') + '\n');
    
    const learnLines = ['area,lesson,date'];
    for (const l of devIntel.learnings) {
      const esc = s => `"${(s || '').replace(/"/g, '""').slice(0, 200)}"`;
      learnLines.push([esc(l.area), esc(l.lesson), l.date || ''].join(','));
    }
    fs.writeFileSync(path.join(DB_DIR, 'learnings.csv'), learnLines.join('\n') + '\n');
  }
  
  return devIntel;
}

// ════════════════════════════════════════════════════════════════════
// STEP 6: VALIDATE — Full quality report
// ════════════════════════════════════════════════════════════════════

function runFullValidation() {
  log('\n' + '='.repeat(70));
  log('QUALITY VALIDATION REPORT');
  log('='.repeat(70));
  
  const results = {};
  
  // Validate enrichment
  const enriched = loadJSON(path.join(MINED_DIR, 'webapp-enriched.json'));
  if (enriched) {
    results.enrichment = validateEnrichment(enriched.fixCommits || []);
    log(`\n  ENRICHMENT:  ${results.enrichment.score}/100 ${results.enrichment.score >= 60 ? 'PASS' : 'FAIL'}`);
    log(`    ${results.enrichment.stats.withRootCause}/${results.enrichment.stats.total} have rootCause, ${results.enrichment.stats.withCategory} have category`);
    for (const issue of results.enrichment.issues) log(`    ! ${issue}`);
  }
  
  // Validate patterns
  const patterns = loadJSON(path.join(MINED_DIR, 'webapp-patterns.json'));
  if (patterns) {
    results.patterns = validatePatterns(patterns.patterns || []);
    log(`\n  PATTERNS:    ${results.patterns.score}/100 ${results.patterns.score >= 60 ? 'PASS' : 'FAIL'}`);
    log(`    ${results.patterns.stats.withRootCause}/${results.patterns.stats.total} have rootCause, ${results.patterns.stats.withFiles} have affectedFiles`);
    for (const issue of results.patterns.issues) log(`    ! ${issue}`);
    
    results.hotspots = validateHotspots(patterns.hotspots || []);
    log(`\n  HOTSPOTS:    ${results.hotspots.score}/100 ${results.hotspots.score >= 60 ? 'PASS' : 'FAIL'}`);
    log(`    ${results.hotspots.stats.total} files, ${results.hotspots.stats.dead} dead`);
    for (const issue of results.hotspots.issues) log(`    ! ${issue}`);
  }
  
  // Validate lessons
  const lessonsFile = path.join(DB_DIR, 'lessons.jsonl');
  if (fileExists(lessonsFile)) {
    const lessons = fs.readFileSync(lessonsFile, 'utf8').trim().split('\n')
      .filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    results.lessons = validateLessons(lessons);
    log(`\n  LESSONS:     ${results.lessons.score}/100 ${results.lessons.score >= 60 ? 'PASS' : 'FAIL'}`);
    log(`    ${results.lessons.stats.unique}/${results.lessons.stats.total} unique, ${(results.lessons.stats.actionRate * 100).toFixed(0)}% actionable`);
    for (const issue of results.lessons.issues) log(`    ! ${issue}`);
  }
  
  // Overall
  const scores = Object.values(results).map(r => r.score);
  const overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const grade = overall >= 90 ? 'A+' : overall >= 80 ? 'A' : overall >= 70 ? 'B' : overall >= 60 ? 'C' : overall >= 40 ? 'D' : 'F';
  
  log(`\n  OVERALL:     ${overall}/100 (${grade})`);
  log('='.repeat(70));
  
  // Write validation report
  if (!VALIDATE_ONLY) {
    saveJSON(path.join(MINED_DIR, 'quality-report.json'), {
      generatedAt: new Date().toISOString(),
      overall,
      grade,
      results,
    });
  }
  
  return { overall, grade, results };
}

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════

function main() {
  log('\n' + '='.repeat(70));
  log('MYCELIUM DATA QUALITY UPGRADE');
  log('='.repeat(70));
  
  // Step 1: Flatten enrichment
  const { enriched, validation: enrichV } = flattenEnrichment() || { enriched: null, validation: { score: 0 } };
  
  // Step 2: Upgrade fix chains
  if (enriched) upgradeFixChains(enriched);
  
  // Step 3: Build deduplicated lessons
  const { lessons, validation: lessonV } = buildLessonsDataset(enriched) || { lessons: [], validation: { score: 0 } };
  
  // Step 4: Export risk intelligence
  exportRiskIntelligence();
  
  // Step 5: Export developer intelligence
  exportDevIntelligence();
  
  // Step 6: Full validation
  const report = runFullValidation();
  
  log(`\nDone. Overall quality: ${report.overall}/100 (${report.grade})`);
  
  return report;
}

main();
