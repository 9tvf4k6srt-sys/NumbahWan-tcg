#!/usr/bin/env node
/**
 * NW Factory Memory v1.0 — Recursive Learning Engine
 * 
 * The Dark Factory learns from every build cycle. Each page generation,
 * validation pass, and manual fix is recorded as a "lesson". Future builds
 * consult the memory to avoid repeating mistakes and apply proven patterns.
 *
 * Architecture:
 *   ┌──────────────┐     ┌───────────────┐     ┌─────────────┐
 *   │  page-gen    │────▶│ factory-memory │────▶│  memory.db  │
 *   │  scorecard   │────▶│   (this file)  │────▶│  (JSON)     │
 *   │  validator   │────▶│                │◀────│             │
 *   └──────────────┘     └───────────────┘     └─────────────┘
 *
 * Memory structure:
 *   - lessons[]      : individual learnings from each build
 *   - patterns{}     : aggregated rules derived from lessons
 *   - buildHistory[] : record of every factory run with outcomes
 *   - defects[]      : bugs found and how they were fixed
 *   - pageTemplates  : evolved templates that improve over time
 *
 * Usage:
 *   node bin/factory-memory.cjs --record <event-type> <data-json>   # Record a lesson
 *   node bin/factory-memory.cjs --query <topic>                     # Query relevant lessons
 *   node bin/factory-memory.cjs --evolve                            # Derive patterns from lessons
 *   node bin/factory-memory.cjs --report                            # Show learning report
 *   node bin/factory-memory.cjs --checklist <spec.yaml>             # Pre-build checklist from memory
 *   node bin/factory-memory.cjs --reset                             # Clear all memory (dangerous)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MEMORY_PATH = path.join(ROOT, '.mycelium', 'factory-memory.json');
const B = '\x1b[1m', G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', M = '\x1b[35m', X = '\x1b[0m';
const ok = m => console.log(`  ${G}✓${X} ${m}`);
const fail = m => console.log(`  ${R}✗${X} ${m}`);
const info = m => console.log(`  ${C}ℹ${X} ${m}`);
const warn = m => console.log(`  ${Y}⚠${X} ${m}`);

// ── Memory Schema ──
function createEmptyMemory() {
  return {
    version: '1.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    // Individual learnings from build events
    lessons: [],

    // Aggregated rules derived from lessons (auto-evolved)
    patterns: {
      required_checks: [],     // checks that must pass before shipping
      common_defects: [],      // defects seen >= 2 times
      proven_fixes: [],        // fix strategies that worked
      page_gen_rules: [],      // rules for page generation
      i18n_rules: [],          // translation-related rules
      quality_thresholds: {},  // evolved quality gates
    },

    // Every factory run
    buildHistory: [],

    // Defects found and resolved
    defects: [],

    // Template evolution — the factory's "DNA"
    templateDNA: {
      generation: 0,           // increments each time templates evolve
      mutations: [],           // changes applied to templates
      fitness_scores: [],      // how well each generation performed
    },

    // Statistics
    stats: {
      totalBuilds: 0,
      totalLessons: 0,
      totalDefects: 0,
      totalDefectsFixed: 0,
      avgScoreByGeneration: {},
      buildsWithoutDefects: 0,
      currentStreak: 0,        // consecutive clean builds
    },
  };
}

// ── Load / Save ──
function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_PATH)) {
      return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf-8'));
    }
  } catch (e) { /* corrupt file, start fresh */ }
  return createEmptyMemory();
}

function saveMemory(mem) {
  mem.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(MEMORY_PATH), { recursive: true });
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(mem, null, 2));
}

// ── Record a Lesson ──
// event types: 'build', 'defect', 'fix', 'validation', 'scorecard', 'manual-edit', 'pattern'
function recordLesson(mem, type, data) {
  const lesson = {
    id: `L${String(mem.lessons.length + 1).padStart(4, '0')}`,
    type,
    timestamp: new Date().toISOString(),
    data,
    applied: false, // becomes true once this lesson influences a future build
  };
  mem.lessons.push(lesson);
  mem.stats.totalLessons++;

  // Auto-classify into patterns
  classifyLesson(mem, lesson);

  return lesson;
}

// ── Record a Build ──
function recordBuild(mem, buildData) {
  const build = {
    id: `B${String(mem.buildHistory.length + 1).padStart(4, '0')}`,
    timestamp: new Date().toISOString(),
    spec: buildData.spec || null,
    slug: buildData.slug || null,
    generation: mem.templateDNA.generation,
    steps: buildData.steps || [],
    score: buildData.score || null,
    grade: buildData.grade || null,
    defectsFound: buildData.defectsFound || 0,
    defectsFixed: buildData.defectsFixed || 0,
    duration_ms: buildData.duration_ms || 0,
    success: buildData.success || false,
    lessonsApplied: buildData.lessonsApplied || [],
  };
  mem.buildHistory.push(build);
  mem.stats.totalBuilds++;

  // Track streak
  if (build.defectsFound === 0 && build.success) {
    mem.stats.currentStreak++;
    mem.stats.buildsWithoutDefects++;
  } else {
    mem.stats.currentStreak = 0;
  }

  // Track score by generation
  if (build.score !== null) {
    const gen = `gen_${build.generation}`;
    if (!mem.stats.avgScoreByGeneration[gen]) {
      mem.stats.avgScoreByGeneration[gen] = { total: 0, count: 0 };
    }
    mem.stats.avgScoreByGeneration[gen].total += build.score;
    mem.stats.avgScoreByGeneration[gen].count++;
  }

  return build;
}

// ── Record a Defect ──
function recordDefect(mem, defectData) {
  const defect = {
    id: `D${String(mem.defects.length + 1).padStart(4, '0')}`,
    timestamp: new Date().toISOString(),
    category: defectData.category || 'unknown',     // 'i18n', 'layout', 'nav', 'perf', 'a11y', 'logic'
    severity: defectData.severity || 'medium',       // 'critical', 'high', 'medium', 'low'
    page: defectData.page || null,
    description: defectData.description,
    rootCause: defectData.rootCause || null,
    fix: defectData.fix || null,
    fixApplied: defectData.fixApplied || false,
    preventionRule: defectData.preventionRule || null,
    recurrence: 0,
  };
  mem.defects.push(defect);
  mem.stats.totalDefects++;
  if (defect.fixApplied) mem.stats.totalDefectsFixed++;

  // Check for recurrence
  const similar = mem.defects.filter(d =>
    d.id !== defect.id &&
    d.category === defect.category &&
    d.description === defect.description
  );
  if (similar.length > 0) {
    defect.recurrence = similar.length;
    // Auto-promote to pattern if seen 2+ times
    if (defect.recurrence >= 1 && defect.preventionRule) {
      addPattern(mem, 'common_defects', {
        category: defect.category,
        description: defect.description,
        prevention: defect.preventionRule,
        occurrences: defect.recurrence + 1,
      });
    }
  }

  return defect;
}

// ── Add Pattern ──
function addPattern(mem, bucket, pattern) {
  if (!mem.patterns[bucket]) mem.patterns[bucket] = [];
  // Deduplicate by description
  const exists = mem.patterns[bucket].find(p =>
    p.description === pattern.description || p.prevention === pattern.prevention
  );
  if (exists) {
    exists.occurrences = (exists.occurrences || 1) + 1;
    exists.lastSeen = new Date().toISOString();
    return exists;
  }
  pattern.addedAt = new Date().toISOString();
  pattern.lastSeen = new Date().toISOString();
  mem.patterns[bucket].push(pattern);
  return pattern;
}

// ── Auto-classify Lesson ──
function classifyLesson(mem, lesson) {
  const d = lesson.data;
  
  switch (lesson.type) {
    case 'defect':
      if (d.category === 'i18n') {
        addPattern(mem, 'i18n_rules', {
          description: d.description,
          rule: d.preventionRule || `Check for: ${d.description}`,
          source: lesson.id,
        });
      }
      break;

    case 'fix':
      addPattern(mem, 'proven_fixes', {
        description: `Fix for: ${d.defect}`,
        strategy: d.strategy || d.description,
        category: d.category || 'general',
        source: lesson.id,
      });
      break;

    case 'validation':
      if (d.checks) {
        d.checks.filter(c => !c.pass).forEach(c => {
          addPattern(mem, 'required_checks', {
            description: `Ensure ${c.name}: ${c.msg}`,
            category: c.name,
            severity: c.warn ? 'warning' : 'error',
            source: lesson.id,
          });
        });
      }
      break;

    case 'scorecard':
      if (d.score !== undefined) {
        // Track quality thresholds
        const qt = mem.patterns.quality_thresholds;
        if (!qt.minScore || d.score < qt.minScore) qt.minScore = d.score;
        if (!qt.maxScore || d.score > qt.maxScore) qt.maxScore = d.score;
        qt.targetScore = Math.max(qt.targetScore || 90, d.score);
      }
      break;

    case 'manual-edit':
      // Manual edits are gold — they show where automation failed
      addPattern(mem, 'page_gen_rules', {
        description: d.description || 'Manual correction needed',
        what: d.what || 'unknown',
        where: d.where || 'unknown',
        shouldAutomate: true,
        source: lesson.id,
      });
      break;
  }
}

// ── Evolve: Derive new rules from accumulated lessons ──
function evolve(mem) {
  console.log(`\n${B}${M}🧬 Factory Evolution Engine${X}\n`);

  const prevGen = mem.templateDNA.generation;
  const mutations = [];

  // 1. Analyze defect frequency
  const defectsByCategory = {};
  mem.defects.forEach(d => {
    defectsByCategory[d.category] = (defectsByCategory[d.category] || 0) + 1;
  });

  const topDefects = Object.entries(defectsByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topDefects.length > 0) {
    info(`Top defect categories:`);
    topDefects.forEach(([cat, count]) => {
      console.log(`    ${Y}${count}${X} × ${cat}`);
    });

    // Generate prevention rules for frequent defects
    topDefects.forEach(([cat, count]) => {
      if (count >= 2) {
        const rule = `AUTO-GATE: Block builds with ${cat} defects (seen ${count} times)`;
        mutations.push({ type: 'add_gate', category: cat, rule });
        addPattern(mem, 'required_checks', {
          description: rule,
          category: cat,
          severity: 'error',
          autoGenerated: true,
        });
      }
    });
  }

  // 2. Analyze manual edits — these need to become automated
  const manualEdits = mem.lessons.filter(l => l.type === 'manual-edit');
  if (manualEdits.length > 0) {
    info(`${manualEdits.length} manual edits recorded — analyzing for automation:`);
    manualEdits.forEach(l => {
      console.log(`    ${C}→${X} ${l.data.description || 'undocumented edit'}`);
      if (!l.applied) {
        mutations.push({
          type: 'automate_manual_step',
          lesson: l.id,
          description: l.data.description,
        });
        l.applied = true;
      }
    });
  }

  // 3. Score trend analysis
  const scores = mem.buildHistory
    .filter(b => b.score !== null)
    .map(b => ({ gen: b.generation, score: b.score }));

  if (scores.length >= 2) {
    const recent = scores.slice(-3);
    const avgRecent = recent.reduce((s, b) => s + b.score, 0) / recent.length;
    const older = scores.slice(0, -3);
    if (older.length > 0) {
      const avgOlder = older.reduce((s, b) => s + b.score, 0) / older.length;
      const delta = avgRecent - avgOlder;
      if (delta > 0) ok(`Score trend: ${G}+${delta.toFixed(1)}${X} (improving)`);
      else if (delta < 0) warn(`Score trend: ${R}${delta.toFixed(1)}${X} (regressing)`);
      else info(`Score trend: stable`);
    }
  }

  // 4. i18n rules consolidation
  const i18nLessons = mem.lessons.filter(l =>
    l.type === 'defect' && l.data.category === 'i18n'
  );
  if (i18nLessons.length > 0) {
    const consolidated = {
      type: 'consolidate_i18n_rules',
      rules: [
        'PAGE_I18N must contain all 3 languages (en/zh/th)',
        'Sidecar .i18n.json must preserve existing translations on regeneration',
        'Validation must check HTML inline translations, not just sidecar file',
      ],
    };
    mutations.push(consolidated);
    consolidated.rules.forEach(rule => {
      addPattern(mem, 'i18n_rules', {
        description: rule,
        autoGenerated: true,
        generation: prevGen + 1,
      });
    });
  }

  // 5. Bump generation
  if (mutations.length > 0) {
    mem.templateDNA.generation++;
    mem.templateDNA.mutations.push({
      generation: mem.templateDNA.generation,
      timestamp: new Date().toISOString(),
      mutations,
    });

    // Record fitness
    const lastBuild = mem.buildHistory[mem.buildHistory.length - 1];
    mem.templateDNA.fitness_scores.push({
      generation: prevGen,
      score: lastBuild?.score || null,
      defects: mem.defects.filter(d =>
        mem.buildHistory.find(b => b.generation === prevGen)
      ).length,
    });

    ok(`Evolution complete: Gen ${prevGen} → Gen ${mem.templateDNA.generation}`);
    info(`${mutations.length} mutations applied`);
  } else {
    info('No new mutations needed — factory is stable');
  }

  return mutations;
}

// ── Pre-Build Checklist ──
// Generates a checklist from memory before starting a new build
function generateChecklist(mem, specPath) {
  console.log(`\n${B}📋 Pre-Build Checklist (from Memory)${X}\n`);

  const checks = [];

  // 1. Required checks from patterns
  mem.patterns.required_checks.forEach(p => {
    checks.push({ source: 'pattern', severity: p.severity || 'error', check: p.description });
  });

  // 2. i18n rules
  mem.patterns.i18n_rules.forEach(r => {
    checks.push({ source: 'i18n', severity: 'error', check: r.description || r.rule });
  });

  // 3. Common defect prevention
  mem.patterns.common_defects.forEach(d => {
    checks.push({ source: 'defect-prevention', severity: 'warning', check: d.prevention || d.description });
  });

  // 4. Page-gen rules
  mem.patterns.page_gen_rules.forEach(r => {
    checks.push({ source: 'page-gen', severity: 'info', check: r.description });
  });

  // Deduplicate
  const seen = new Set();
  const unique = checks.filter(c => {
    const key = c.check;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0) {
    info('No prior lessons — this is the first build');
    info('Memory will start accumulating after this run');
    return unique;
  }

  unique.forEach((c, i) => {
    const icon = c.severity === 'error' ? R + '●' : c.severity === 'warning' ? Y + '●' : C + '●';
    console.log(`  ${icon}${X} ${c.check}  ${C}(${c.source})${X}`);
  });

  console.log(`\n  ${B}${unique.length} checks from ${mem.stats.totalLessons} lessons across ${mem.stats.totalBuilds} builds${X}`);
  info(`Template generation: ${mem.templateDNA.generation}`);
  info(`Clean build streak: ${mem.stats.currentStreak}`);

  return unique;
}

// ── Query ──
function queryMemory(mem, topic) {
  console.log(`\n${B}🔍 Memory Query: "${topic}"${X}\n`);

  const topicLower = topic.toLowerCase();
  const results = [];

  // Search lessons
  mem.lessons.forEach(l => {
    const text = JSON.stringify(l.data).toLowerCase();
    if (text.includes(topicLower)) {
      results.push({ type: 'lesson', id: l.id, data: l });
    }
  });

  // Search defects
  mem.defects.forEach(d => {
    const text = `${d.description} ${d.rootCause} ${d.fix} ${d.category}`.toLowerCase();
    if (text.includes(topicLower)) {
      results.push({ type: 'defect', id: d.id, data: d });
    }
  });

  // Search patterns
  Object.entries(mem.patterns).forEach(([bucket, items]) => {
    if (Array.isArray(items)) {
      items.forEach(p => {
        const text = JSON.stringify(p).toLowerCase();
        if (text.includes(topicLower)) {
          results.push({ type: `pattern:${bucket}`, data: p });
        }
      });
    }
  });

  if (results.length === 0) {
    info('No results found');
    return results;
  }

  ok(`Found ${results.length} results:`);
  results.slice(0, 10).forEach(r => {
    const label = r.id || r.type;
    const desc = r.data.description || r.data.data?.description || JSON.stringify(r.data).substring(0, 80);
    console.log(`  ${C}[${r.type}]${X} ${label}: ${desc}`);
  });
  if (results.length > 10) info(`... and ${results.length - 10} more`);

  return results;
}

// ── Report ──
function showReport(mem) {
  console.log(`\n${B}${M}🧠 Dark Factory — Learning Report${X}\n`);

  // Stats
  console.log(`  ${B}Builds${X}: ${mem.stats.totalBuilds}   ${B}Lessons${X}: ${mem.stats.totalLessons}   ${B}Defects${X}: ${mem.stats.totalDefects} (${mem.stats.totalDefectsFixed} fixed)`);
  console.log(`  ${B}Template Gen${X}: ${mem.templateDNA.generation}   ${B}Clean Streak${X}: ${mem.stats.currentStreak}\n`);

  // Pattern summary
  const patternCounts = Object.entries(mem.patterns)
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => `${k}: ${v.length}`);
  if (patternCounts.length > 0) {
    console.log(`  ${B}Patterns${X}: ${patternCounts.join(', ')}\n`);
  }

  // Score evolution
  const genScores = mem.stats.avgScoreByGeneration;
  if (Object.keys(genScores).length > 0) {
    console.log(`  ${B}Score by Generation${X}:`);
    Object.entries(genScores).forEach(([gen, data]) => {
      const avg = (data.total / data.count).toFixed(1);
      const bar = '█'.repeat(Math.round(avg / 5));
      console.log(`    ${gen}: ${avg}/100 ${G}${bar}${X}  (${data.count} builds)`);
    });
    console.log('');
  }

  // Recent defects
  const recentDefects = mem.defects.slice(-5);
  if (recentDefects.length > 0) {
    console.log(`  ${B}Recent Defects${X}:`);
    recentDefects.forEach(d => {
      const fixed = d.fixApplied ? `${G}FIXED${X}` : `${R}OPEN${X}`;
      console.log(`    ${d.id} [${d.category}] ${d.description} — ${fixed}`);
    });
    console.log('');
  }

  // Template DNA
  if (mem.templateDNA.mutations.length > 0) {
    console.log(`  ${B}Template Mutations${X}:`);
    mem.templateDNA.mutations.slice(-3).forEach(m => {
      console.log(`    Gen ${m.generation}: ${m.mutations.length} changes (${m.timestamp.split('T')[0]})`);
      m.mutations.slice(0, 3).forEach(mut => {
        console.log(`      → ${mut.type}: ${mut.description || mut.rule || 'n/a'}`);
      });
    });
  }
}

// ── Seed initial lessons from known history ──
function seedFromHistory(mem) {
  if (mem.lessons.length > 0) {
    info('Memory already seeded, skipping');
    return;
  }

  console.log(`\n${B}🌱 Seeding factory memory from build history...${X}\n`);

  // Lesson 1: PAGE_I18N empty objects bug
  recordLesson(mem, 'defect', {
    category: 'i18n',
    description: 'page-gen.cjs emitted empty PAGE_I18N objects ({en:{},zh:{},th:{}})',
    rootCause: 'extractI18nKeys() only generates en values; generateFullPage() hardcoded empty objects',
    fix: 'Added buildPageI18n() that reads .i18n.json sidecar and inlines all translations',
    preventionRule: 'After page-gen, verify PAGE_I18N contains non-empty en/zh/th objects',
    severity: 'critical',
  });

  // Lesson 2: Sidecar overwrite
  recordLesson(mem, 'defect', {
    category: 'i18n',
    description: 'Regenerating page overwrote sidecar .i18n.json with en-only data',
    rootCause: 'extractI18nKeys() only produces en; write step replaced full file',
    fix: 'Added merge logic to preserve existing zh/th translations in sidecar',
    preventionRule: 'Never overwrite .i18n.json — always merge with existing translations',
    severity: 'critical',
  });

  // Lesson 3: Validation gap
  recordLesson(mem, 'defect', {
    category: 'validation',
    description: 'Validation checked sidecar keys but not HTML PAGE_I18N inline content',
    rootCause: 'i18n-inject.cjs --check only reads .i18n.json, not the HTML script block',
    fix: 'Scorecard now also checks for PAGE_I18N registration in HTML',
    preventionRule: 'Validation must check both sidecar AND inline PAGE_I18N',
    severity: 'high',
  });

  // Lesson 4: REWATCH button overlap
  recordLesson(mem, 'defect', {
    category: 'layout',
    description: 'REWATCH button (fixed, top-right, z-index 9990) overlapped sticky nav DLC tabs',
    rootCause: 'Both elements compete for top-right screen area; REWATCH z-index >> nav z-index',
    fix: 'Moved REWATCH to top-left below sticky nav (top: 50px, left: 12px, z-index: 99)',
    preventionRule: 'Fixed-position UI elements must not overlap sticky nav (top: 0) or FAB buttons (bottom-right)',
    severity: 'high',
  });

  // Lesson 5: Standalone fragment vs full page
  recordLesson(mem, 'manual-edit', {
    category: 'ux',
    description: 'Users mistook standalone DLC fragment page for the final product (only shows DLC content, no nav)',
    what: 'Fragment page lacks site navigation, header, other DLC sections',
    where: 'public/world/dlc-12-abyssal-temple.html',
    shouldAutomate: true,
    preventionRule: 'Fragment pages should include a banner linking to the full parent page',
  });

  // Record DLC-12 build
  recordBuild(mem, {
    spec: 'specs/dlc-12-abyssal-temple.yaml',
    slug: 'dlc-12-abyssal-temple',
    steps: ['page-gen', 'i18n-fix', 'validation', 'scorecard'],
    score: 105,
    grade: 'A',
    defectsFound: 3,
    defectsFixed: 3,
    duration_ms: 0, // retrospective
    success: true,
    lessonsApplied: [],
  });

  // Record defects with fixes
  recordDefect(mem, {
    category: 'i18n',
    severity: 'critical',
    page: 'world/dlc-12-abyssal-temple.html',
    description: 'PAGE_I18N inline translations empty — language toggle had no effect',
    rootCause: 'page-gen.cjs hardcoded empty objects instead of reading sidecar',
    fix: 'Added buildPageI18n() function to read and inline sidecar translations',
    fixApplied: true,
    preventionRule: 'After generation, grep PAGE_I18N in HTML and verify non-empty en/zh/th',
  });

  recordDefect(mem, {
    category: 'i18n',
    severity: 'critical',
    page: 'world/dlc-12-abyssal-temple.i18n.json',
    description: 'Sidecar lost zh/th translations on page regeneration',
    rootCause: 'Write step replaced file with en-only data from extractI18nKeys()',
    fix: 'Merge existing sidecar translations before writing',
    fixApplied: true,
    preventionRule: 'Always read-then-merge sidecar files, never blindly overwrite',
  });

  recordDefect(mem, {
    category: 'layout',
    severity: 'high',
    page: 'world/nwg-the-game.html',
    description: 'REWATCH button blocks DLC navigation tabs on mobile',
    rootCause: 'Fixed position top-right with z-index 9990 overlaps sticky nav',
    fix: 'Repositioned to top-left below sticky nav, reduced z-index',
    fixApplied: true,
    preventionRule: 'No fixed-position element should occupy top-right area (reserved for sticky nav tabs)',
  });

  // Run initial evolution
  evolve(mem);

  ok(`Seeded ${mem.lessons.length} lessons, ${mem.defects.length} defects, ${mem.buildHistory.length} builds`);
  saveMemory(mem);
}

// ── Integration API ──
// These functions are meant to be required() by other factory tools
module.exports = {
  loadMemory,
  saveMemory,
  recordLesson,
  recordBuild,
  recordDefect,
  addPattern,
  evolve,
  generateChecklist,
  queryMemory,
  showReport,
  seedFromHistory,
  MEMORY_PATH,
};

// ── CLI ──
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const mem = loadMemory();

  switch (command) {
    case '--seed':
      seedFromHistory(mem);
      break;

    case '--record': {
      const type = args[1];
      const dataStr = args.slice(2).join(' ');
      if (!type || !dataStr) {
        fail('Usage: factory-memory --record <type> <json-data>');
        process.exit(1);
      }
      try {
        const data = JSON.parse(dataStr);
        const lesson = recordLesson(mem, type, data);
        ok(`Recorded lesson ${lesson.id}: ${type}`);
        saveMemory(mem);
      } catch (e) {
        fail(`Invalid JSON data: ${e.message}`);
        process.exit(1);
      }
      break;
    }

    case '--defect': {
      const dataStr = args.slice(1).join(' ');
      try {
        const data = JSON.parse(dataStr);
        const defect = recordDefect(mem, data);
        ok(`Recorded defect ${defect.id}: ${data.description}`);
        saveMemory(mem);
      } catch (e) {
        fail(`Invalid JSON data: ${e.message}`);
        process.exit(1);
      }
      break;
    }

    case '--query': {
      const topic = args.slice(1).join(' ');
      if (!topic) { fail('Usage: factory-memory --query <topic>'); process.exit(1); }
      queryMemory(mem, topic);
      break;
    }

    case '--evolve':
      evolve(mem);
      saveMemory(mem);
      break;

    case '--report':
      showReport(mem);
      break;

    case '--checklist': {
      const specPath = args[1];
      generateChecklist(mem, specPath);
      break;
    }

    case '--reset':
      if (args[1] === '--confirm') {
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(createEmptyMemory(), null, 2));
        ok('Memory reset');
      } else {
        warn('This will erase all factory memory. Use --reset --confirm to proceed.');
      }
      break;

    case '--json':
      console.log(JSON.stringify(mem, null, 2));
      break;

    default:
      console.log(`
${B}${M}🧠 Dark Factory — Memory Engine v1.0${X}

Commands:
  --seed              Seed initial lessons from known build history
  --record <t> <json> Record a lesson (type: build/defect/fix/validation/scorecard/manual-edit)
  --defect <json>     Record a defect with fix info
  --query <topic>     Search memory for relevant lessons
  --evolve            Derive patterns from accumulated lessons
  --report            Show full learning report
  --checklist [spec]  Pre-build checklist from memory
  --json              Dump raw memory as JSON
  --reset --confirm   Clear all memory (dangerous!)

${C}The factory learns from every build. Each defect becomes a prevention rule.
Each manual edit becomes an automation target. Each pattern becomes a gate.${X}
`);
  }
}
