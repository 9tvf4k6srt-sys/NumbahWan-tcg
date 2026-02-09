#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// NW-FIXER — The Third Brain: Fix → Verify → Confirm
// ═══════════════════════════════════════════════════════════════════════════
//
// Architecture: Three separate roles working in sync
//
//   ┌─────────┐     ┌───────────┐     ┌─────────┐
//   │ LEARNER │ ──> │ EVALUATOR │ ──> │  FIXER  │
//   │         │     │           │     │         │
//   │ gitwise │     │ runEval() │     │ nw-fixer│
//   │ nw-mem  │     │ runNwEval │     │         │
//   │ --learn │     │           │     │ fix()   │
//   │ snapshot│     │ scores{}  │     │ verify()│
//   └─────────┘     └───────────┘     │ report()│
//        │               │            └────┬────┘
//        │               │                 │
//   post-commit     produces eval     reads both evals
//   post-merge      data for fixer    applies fixes
//                                     re-evals to verify
//                                     loops until stable
//
// The Fixer is SEPARATE so it can:
//   1. Read both systems' eval data without being embedded in either
//   2. Apply cross-system fixes (sync constraints ↔ risks)
//   3. Verify its own work with a re-eval loop
//   4. Be called independently or from hooks
//
// Usage:
//   node nw-fixer.cjs              Run fix cycle (fix → verify → report)
//   node nw-fixer.cjs --status     Show current state without fixing
//   node nw-fixer.cjs --force      Force fix even if scores are OK
//   node nw-fixer.cjs --dry-run    Show what would be fixed without doing it
//
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Constants ──────────────────────────────────────────────────────
const ROOT = __dirname;
const NW_MEM_PATH = path.join(ROOT, 'memory.json');
const GW_MEM_PATH = path.join(ROOT, '.gitwise', 'memory.json');
const FIXER_LOG_PATH = path.join(ROOT, '.nw-fixer-log.json');

const MAX_FIX_LOOPS = 3;       // Max fix→verify cycles before giving up
const MIN_IMPROVEMENT = 2;     // Min score improvement to count as "fixed"
const SCORE_OK_THRESHOLD = 70; // Above this = no fixing needed

// ─── Helpers ────────────────────────────────────────────────────────

function loadJson(filepath) {
  try { return JSON.parse(fs.readFileSync(filepath, 'utf8')); }
  catch { return null; }
}

function saveJson(filepath, data) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function run(cmd) {
  try { return execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 30000 }).toString().trim(); }
  catch { return ''; }
}

function log(msg) { console.log(`  [fixer] ${msg}`); }
function dim(msg) { console.error(`  \x1b[2m[fixer] ${msg}\x1b[0m`); }

function loadFixerLog() {
  return loadJson(FIXER_LOG_PATH) || { runs: [], totalFixes: 0, totalVerified: 0 };
}

function saveFixerLog(flog) {
  // Keep last 30 runs
  if (flog.runs.length > 30) flog.runs = flog.runs.slice(-30);
  saveJson(FIXER_LOG_PATH, flog);
}

// ─── Phase 1: EVALUATE — unified scoring via nw-eval.cjs ───────────────

function evaluate() {
  // Primary: use nw-eval.cjs as single source of truth
  try {
    run('node nw-eval.cjs 2>/dev/null');
    const evalResult = loadJson(path.join(ROOT, '.nw-eval-result.json'));
    if (evalResult && evalResult.overall !== undefined) {
      return {
        unified: true,
        overall: evalResult.overall,
        grade: evalResult.grade,
        metrics: evalResult.metrics,
        data: evalResult.data,
        // Legacy compatibility: expose as nw/gw for fix() function
        nw: { overallScore: evalResult.overall, scores: evalResult.metrics, source: 'nw-eval' },
        gw: { overallScore: evalResult.overall, scores: evalResult.metrics, source: 'nw-eval' }
      };
    }
  } catch { /* fallback below */ }

  // Fallback: read from individual systems (legacy)
  let nwResult = null;
  let gwResult = null;

  try {
    const nwOut = run('node nw-memory.cjs --eval-json 2>/dev/null');
    if (nwOut) nwResult = JSON.parse(nwOut);
  } catch { /* fallback: read from memory */ }

  if (!nwResult) {
    const nwMem = loadJson(NW_MEM_PATH);
    if (nwMem) {
      nwResult = computeNwEval(nwMem);
    }
  }

  try {
    const gwOut = run('node gitwise.cjs --eval-json 2>/dev/null');
    if (gwOut) gwResult = JSON.parse(gwOut);
  } catch { /* fallback: read from memory */ }

  if (!gwResult) {
    const gwMem = loadJson(GW_MEM_PATH);
    if (gwMem) {
      gwResult = computeGwEval(gwMem);
    }
  }

  return { unified: false, nw: nwResult, gw: gwResult };
}

// Lightweight eval computation (reads memory directly when CLI not available)
function computeNwEval(mem) {
  const totalConstraints = Object.values(mem.constraints || {}).flat().length;
  const totalBreakages = (mem.breakages || []).length;
  const totalLearnings = (mem.learnings || []).length;
  const totalSnapshots = (mem.snapshots || []).length;
  if (totalSnapshots < 5) return null;

  // Simplified scoring — the real eval is in nw-memory.cjs
  // This is a fallback when CLI isn't available
  const areaBreakages = {};
  for (const b of (mem.breakages || [])) {
    const a = (b.area || 'unknown').toLowerCase();
    areaBreakages[a] = (areaBreakages[a] || 0) + 1;
  }
  const areasWithBreakages = Object.keys(areaBreakages);
  const areasWithConstraints = Object.keys(mem.constraints || {}).filter(a =>
    (mem.constraints[a] || []).length > 0);
  const coveredAreas = areasWithBreakages.filter(a => areasWithConstraints.includes(a));
  const uncoveredAreas = areasWithBreakages.filter(a => !areasWithConstraints.includes(a));
  const constraintCoverage = areasWithBreakages.length > 0
    ? Math.round((coveredAreas.length / areasWithBreakages.length) * 100) : 50;

  const learningsPerBreakage = totalBreakages > 0 ? totalLearnings / totalBreakages : 0;
  const learningCapture = learningsPerBreakage >= 1 ? 100 : learningsPerBreakage > 0.5 ? 60 : 20;

  const overallScore = Math.round((constraintCoverage * 0.4 + learningCapture * 0.3 + 50 * 0.3));

  return {
    overallScore,
    scores: { constraintCoverage, learningCapture, constraintEffectiveness: 50 },
    uncoveredAreas,
    areaBreakages,
    upgrades: [],
    source: 'fixer-computed'
  };
}

function computeGwEval(mem) {
  if (!mem || (mem.commits || []).length < 10) return null;

  const filesWithRisk = Object.keys(mem.risks || {}).length;
  const filesWithLessons = Object.values(mem.risks || {}).filter(r => (r.lessons || []).length > 0).length;
  const lessonDensity = filesWithRisk > 0 ? Math.round((filesWithLessons / filesWithRisk) * 100) : 0;

  const repeatOffenders = Object.entries(mem.risks || {})
    .filter(([, r]) => r.breakCount >= 3)
    .map(([f, r]) => ({ file: f, breaks: r.breakCount, lessons: (r.lessons || []).length, hasDeepAnalysis: !!(r.deepAnalysis && r.deepAnalysis.length > 0) }));

  const overallScore = Math.round(lessonDensity * 0.3 + (repeatOffenders.length === 0 ? 80 : 30) * 0.4 + 50 * 0.3);

  return {
    overallScore,
    scores: { knowledgeDensity: lessonDensity, repeatBreakage: repeatOffenders.length === 0 ? 100 : 20 },
    repeatOffenders,
    source: 'fixer-computed'
  };
}

// ─── Phase 2: FIX — apply corrective actions to both systems ────────

function fix(evalData, dryRun) {
  const actions = [];
  const nw = evalData.nw;
  const gw = evalData.gw;

  const nwMem = loadJson(NW_MEM_PATH);
  const gwMem = loadJson(GW_MEM_PATH);

  if (!nwMem && !gwMem) {
    log('No data found for either system — nothing to fix');
    return actions;
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 1: Cross-system constraint sync (NW-Memory → gitwise)
  // NW-Memory tracks constraints by area, gitwise by file.
  // Bridge: map area keywords to file paths.
  // ──────────────────────────────────────────────────────────────────
  if (nwMem && gwMem) {
    const constraints = nwMem.constraints || {};
    let synced = 0;
    for (const [area, areaConstraints] of Object.entries(constraints)) {
      if (!areaConstraints || areaConstraints.length === 0) continue;
      const areaLower = area.toLowerCase();
      const matchingFiles = Object.keys(gwMem.risks || {}).filter(f =>
        f.toLowerCase().includes(areaLower) ||
        f.toLowerCase().includes(areaLower.replace(/s$/, ''))
      );
      for (const f of matchingFiles) {
        if (!gwMem.risks[f].constraints) gwMem.risks[f].constraints = [];
        for (const c of areaConstraints) {
          if (!gwMem.risks[f].constraints.includes(c.fact) && gwMem.risks[f].constraints.length < 10) {
            if (!dryRun) gwMem.risks[f].constraints.push(c.fact);
            synced++;
          }
        }
      }
    }
    if (synced > 0) actions.push({ type: 'cross-sync', desc: `synced ${synced} NW-Memory constraints → gitwise`, system: 'both' });
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 2: Reverse sync — gitwise deep lessons → NW-Memory constraints
  // When gitwise has deep root-cause analysis, promote to NW-Memory constraint
  // ──────────────────────────────────────────────────────────────────
  if (gwMem && nwMem) {
    let promoted = 0;
    for (const [file, risk] of Object.entries(gwMem.risks || {})) {
      if (!risk.deepAnalysis || risk.deepAnalysis.length === 0) continue;
      // Determine the NW-Memory area from the file path
      const area = classifyFileToArea(file);
      if (!nwMem.constraints[area]) nwMem.constraints[area] = [];
      for (const da of risk.deepAnalysis) {
        const fact = `[auto-fixer] ${file} root-cause themes: [${da.themes.join(', ')}] — ${risk.breakCount}x broken`;
        const exists = nwMem.constraints[area].some(c => c.fact === fact);
        if (!exists && nwMem.constraints[area].length < 15) {
          if (!dryRun) {
            nwMem.constraints[area].push({
              fact, ts: Date.now(),
              date: new Date().toISOString().split('T')[0],
              autoGenerated: true,
              source: 'nw-fixer: gitwise deep analysis promoted to constraint'
            });
          }
          promoted++;
        }
      }
    }
    if (promoted > 0) actions.push({ type: 'reverse-sync', desc: `promoted ${promoted} gitwise deep analyses → NW-Memory constraints`, system: 'both' });
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 3: Auto-constrain uncovered areas
  // If NW-Memory eval shows uncovered areas, create constraints from lessons
  // ──────────────────────────────────────────────────────────────────
  if (nw && nw.uncoveredAreas && nw.uncoveredAreas.length > 0 && nwMem) {
    let created = 0;
    for (const area of nw.uncoveredAreas) {
      const areaBreaks = (nwMem.breakages || []).filter(b => (b.area || '').toLowerCase() === area);
      const lessons = areaBreaks.map(b => b.what || b.deepLesson || '').filter(l => l.length > 10);
      if (lessons.length > 0 && !nwMem.constraints[area]) {
        if (!dryRun) {
          nwMem.constraints[area] = [{
            fact: lessons[lessons.length - 1],
            ts: Date.now(), date: new Date().toISOString().split('T')[0],
            autoGenerated: true, source: 'nw-fixer: uncovered area auto-constrained'
          }];
        }
        created++;
        actions.push({ type: 'auto-constrain', desc: `created constraint for uncovered area [${area}]`, system: 'nw-memory' });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 4: Deep root-cause for repeat offenders (gitwise)
  // Extract recurring themes from breakage lessons using word frequency
  // ──────────────────────────────────────────────────────────────────
  if (gwMem) {
    const offenders = Object.entries(gwMem.risks || {})
      .filter(([, r]) => r.breakCount >= 2 && (!r.deepAnalysis || r.deepAnalysis.length === 0))
      .sort((a, b) => b[1].breakCount - a[1].breakCount)
      .slice(0, 15);

    let analyzed = 0;
    for (const [file, risk] of offenders) {
      const fileBreakages = (gwMem.breakages || []).filter(b => (b.files || []).includes(file));
      if (fileBreakages.length < 2) continue;

      const allLessons = fileBreakages.map(b => (b.lesson || b.pattern || '').toLowerCase());
      const wordFreq = {};
      const skip = new Set(['the', 'and', 'for', 'was', 'not', 'that', 'with', 'this', 'from', 'but', 'are', 'fix', 'add', 'bug']);
      for (const lesson of allLessons) {
        const tokens = lesson.match(/[a-z]{3,}/g) || [];
        for (const t of tokens) { if (!skip.has(t)) wordFreq[t] = (wordFreq[t] || 0) + 1; }
      }

      const recurringThemes = Object.entries(wordFreq)
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);

      if (recurringThemes.length > 0) {
        if (!dryRun) {
          if (!risk.deepAnalysis) risk.deepAnalysis = [];
          risk.deepAnalysis.push({
            date: new Date().toISOString().split('T')[0],
            themes: recurringThemes,
            breakCount: risk.breakCount,
            source: 'nw-fixer: deep root-cause analysis'
          });
          // Promote to lesson
          const rootCause = `ROOT-CAUSE: themes=[${recurringThemes.join(',')}] across ${fileBreakages.length} breakages`;
          if (!risk.lessons) risk.lessons = [];
          if (!risk.lessons.includes(rootCause) && risk.lessons.length < 10) {
            risk.lessons.push(rootCause);
          }
        }
        analyzed++;
      }
    }
    if (analyzed > 0) actions.push({ type: 'deep-analysis', desc: `deep root-cause on ${analyzed} repeat offenders`, system: 'gitwise' });
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 5: Escalate high-risk files (gitwise)
  // Mark files with 3+ breaks as escalated for louder warnings
  // ──────────────────────────────────────────────────────────────────
  if (gwMem) {
    let escalated = 0;
    for (const [file, risk] of Object.entries(gwMem.risks || {})) {
      if (risk.breakCount >= 3 && !risk.escalated) {
        if (!dryRun) {
          risk.escalated = true;
          risk.escalatedAt = new Date().toISOString().slice(0, 10);
          risk.escalatedReason = `[nw-fixer] broke ${risk.breakCount}x — auto-escalated`;
        }
        escalated++;
      }
    }
    if (escalated > 0) actions.push({ type: 'escalate', desc: `escalated ${escalated} files (3+ breaks)`, system: 'gitwise' });
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 6: Backfill empty lessons (gitwise)
  // For files with risk but no lessons, pull from breakage data
  // ──────────────────────────────────────────────────────────────────
  if (gwMem) {
    let backfilled = 0;
    for (const [file, risk] of Object.entries(gwMem.risks || {})) {
      if ((!risk.lessons || risk.lessons.length === 0) && risk.breakCount >= 1) {
        const relevantBreakage = (gwMem.breakages || []).find(b =>
          (b.files || []).includes(file) && b.lesson && b.lesson.length > 15
        );
        if (relevantBreakage && !dryRun) {
          if (!risk.lessons) risk.lessons = [];
          risk.lessons.push(relevantBreakage.lesson);
          backfilled++;
        }
      }
    }
    if (backfilled > 0) actions.push({ type: 'backfill', desc: `backfilled lessons for ${backfilled} files`, system: 'gitwise' });
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 7: Auto-create learnings from unlearned breakages (NW-Memory)
  // ──────────────────────────────────────────────────────────────────
  if (nwMem) {
    let created = 0;
    for (const b of (nwMem.breakages || [])) {
      const area = (b.area || 'unknown').toLowerCase();
      const lesson = b.deepLesson || b.what || '';
      if (lesson.length > 15) {
        if (!nwMem.learnings) nwMem.learnings = [];
        const exists = nwMem.learnings.some(l => l.area === area && l.lesson === lesson);
        if (!exists) {
          if (!dryRun) {
            nwMem.learnings.push({
              ts: Date.now(), date: new Date().toISOString().split('T')[0],
              area, lesson, autoGenerated: true,
              source: 'nw-fixer: breakage promoted to learning'
            });
          }
          created++;
        }
      }
    }
    if (created > 0) actions.push({ type: 'auto-learn', desc: `promoted ${created} breakages → learnings`, system: 'nw-memory' });
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 8: Lower coupling threshold if accuracy is low (gitwise)
  // ──────────────────────────────────────────────────────────────────
  if (gw && gwMem && gw.scores && gw.scores.couplingAccuracy < 50) {
    const current = gwMem.stats?.couplingThreshold || 5;
    if (current > 3) {
      if (!dryRun) {
        if (!gwMem.stats) gwMem.stats = {};
        gwMem.stats.couplingThreshold = 3;
      }
      actions.push({ type: 'coupling', desc: `coupling threshold ${current} → 3`, system: 'gitwise' });
    }
  }

  // ── Save both systems after all fixes ──
  if (!dryRun) {
    if (nwMem) saveJson(NW_MEM_PATH, nwMem);
    if (gwMem) saveJson(GW_MEM_PATH, gwMem);
  }

  return actions;
}

// ─── Phase 3: VERIFY — re-evaluate to confirm fixes worked ─────────

function verify(beforeScores) {
  const afterEval = evaluate();

  const result = {
    nwBefore: beforeScores.nw?.overallScore || 0,
    nwAfter: afterEval.nw?.overallScore || 0,
    gwBefore: beforeScores.gw?.overallScore || 0,
    gwAfter: afterEval.gw?.overallScore || 0,
    improved: false,
    stable: false
  };

  const nwDelta = result.nwAfter - result.nwBefore;
  const gwDelta = result.gwAfter - result.gwBefore;
  const combinedBefore = Math.round((result.nwBefore + result.gwBefore) / 2);
  const combinedAfter = Math.round((result.nwAfter + result.gwAfter) / 2);

  result.combinedBefore = combinedBefore;
  result.combinedAfter = combinedAfter;
  result.combinedDelta = combinedAfter - combinedBefore;
  result.improved = result.combinedDelta >= MIN_IMPROVEMENT;
  result.stable = result.combinedDelta >= 0; // at least didn't get worse

  result.details = {
    nw: { before: result.nwBefore, after: result.nwAfter, delta: nwDelta },
    gw: { before: result.gwBefore, after: result.gwAfter, delta: gwDelta },
    combined: { before: combinedBefore, after: combinedAfter, delta: result.combinedDelta }
  };

  return { eval: afterEval, verification: result };
}

// ─── Classify file path to NW-Memory area ───────────────────────────

function classifyFileToArea(filePath) {
  const fp = filePath.toLowerCase();
  if (fp.includes('battle')) return 'battle';
  if (fp.includes('card') || fp.includes('cards')) return 'cards';
  if (fp.includes('market') || fp.includes('wallet') || fp.includes('merch')) return 'economy';
  if (fp.includes('i18n') || fp.includes('lang')) return 'i18n';
  if (fp.includes('nav')) return 'nav';
  if (fp.includes('guide')) return 'guide';
  if (fp.includes('ios') || fp.includes('safari')) return 'ios';
  if (fp.includes('wyckoff') || fp.includes('oracle')) return 'oracle';
  if (fp.includes('lore') || fp.includes('conspiracy')) return 'lore';
  if (fp.includes('tabletop')) return 'tabletop';
  if (fp.includes('emoji')) return 'emoji';
  return 'general';
}

// ─── Main Run: Fix → Verify → Report ────────────────────────────────

function run_cycle(opts) {
  const { force, dryRun, silent } = opts || {};

  if (!silent) {
    console.log('');
    console.log('  \x1b[1mnw-fixer\x1b[0m — fix → verify → confirm');
    console.log('  ' + '─'.repeat(55));
  }

  // Phase 1: Evaluate
  const beforeEval = evaluate();
  const combinedBefore = beforeEval.unified ? beforeEval.overall : Math.round(((beforeEval.nw?.overallScore || 0) + (beforeEval.gw?.overallScore || 0)) / 2);

  if (!silent) {
    if (beforeEval.unified) {
      log(`before: unified ${combinedBefore}/100 (${beforeEval.grade}) — via nw-eval.cjs`);
    } else {
      const nwS = beforeEval.nw?.overallScore || 0;
      const gwS = beforeEval.gw?.overallScore || 0;
      log(`before: NW-Memory ${nwS}/100 | gitwise ${gwS}/100 | combined ${combinedBefore}/100`);
    }
  }

  // Check if fixing is needed
  if (!force && combinedBefore >= SCORE_OK_THRESHOLD) {
    if (!silent) log(`scores OK (>=${SCORE_OK_THRESHOLD}) — no fixing needed`);
    return { status: 'ok', score: combinedBefore, actions: [], loops: 0 };
  }

  // Phase 2+3: Fix → Verify loop
  let totalActions = [];
  let loops = 0;
  let lastVerification = null;

  for (let i = 0; i < MAX_FIX_LOOPS; i++) {
    loops++;
    if (!silent) log(`loop ${loops}/${MAX_FIX_LOOPS}: applying fixes...`);

    // Fix
    const currentEval = i === 0 ? beforeEval : evaluate();
    const actions = fix(currentEval, dryRun);
    totalActions.push(...actions);

    if (actions.length === 0) {
      if (!silent) log('no more actions to take — stopping');
      break;
    }

    if (!silent) {
      for (const a of actions) {
        dim(`  → [${a.system}] ${a.desc}`);
      }
    }

    if (dryRun) {
      if (!silent) log('dry-run mode — not verifying');
      break;
    }

    // Verify
    const { verification } = verify(beforeEval);
    lastVerification = verification;

    if (!silent) {
      const arrow = verification.combinedDelta > 0 ? '\x1b[32m↑\x1b[0m' : verification.combinedDelta < 0 ? '\x1b[31m↓\x1b[0m' : '→';
      log(`verify: ${verification.combinedBefore} ${arrow} ${verification.combinedAfter} (${verification.combinedDelta >= 0 ? '+' : ''}${verification.combinedDelta})`);
    }

    // If improved or no more room, stop
    if (verification.improved || verification.combinedAfter >= SCORE_OK_THRESHOLD) {
      if (!silent) log('scores improved — fix cycle complete');
      break;
    }

    // If not improved and already looped, don't waste cycles
    if (!verification.stable) {
      if (!silent) log('scores dropped — reverting would be ideal but stopping to avoid damage');
      break;
    }
  }

  // Report
  const afterEval = evaluate();
  const combinedAfter = Math.round(((afterEval.nw?.overallScore || 0) + (afterEval.gw?.overallScore || 0)) / 2);

  const result = {
    status: totalActions.length > 0 ? 'fixed' : 'no-op',
    before: combinedBefore,
    after: combinedAfter,
    delta: combinedAfter - combinedBefore,
    actions: totalActions,
    loops,
    verification: lastVerification,
    timestamp: new Date().toISOString()
  };

  // Log the run
  const flog = loadFixerLog();
  flog.runs.push({
    date: new Date().toISOString().split('T')[0],
    before: combinedBefore,
    after: combinedAfter,
    delta: result.delta,
    actions: totalActions.length,
    loops,
    actionSummary: totalActions.map(a => a.desc).slice(0, 5)
  });
  flog.totalFixes += totalActions.length;
  if (lastVerification?.improved) flog.totalVerified++;
  saveFixerLog(flog);

  if (!silent) {
    console.log('');
    const grade = combinedAfter >= 75 ? '\x1b[32mB+\x1b[0m' : combinedAfter >= 60 ? '\x1b[33mC\x1b[0m' : '\x1b[31mD\x1b[0m';
    log(`result: ${combinedBefore} → ${combinedAfter} (${result.delta >= 0 ? '+' : ''}${result.delta}) | grade: ${grade} | ${totalActions.length} actions in ${loops} loop(s)`);
    console.log('');
  }

  return result;
}

// ─── Status: show current state ─────────────────────────────────────

function status() {
  console.log('');
  console.log('  \x1b[1mnw-fixer status\x1b[0m');
  console.log('  ' + '─'.repeat(55));

  const evalData = evaluate();
  let combined, gradeStr;
  if (evalData.unified) {
    combined = evalData.overall;
    gradeStr = evalData.grade;
    log(`unified:   ${combined}/100 (${gradeStr}) — via nw-eval.cjs`);
  } else {
    const nwScore = evalData.nw?.overallScore || 0;
    const gwScore = evalData.gw?.overallScore || 0;
    combined = Math.round((nwScore + gwScore) / 2);
    gradeStr = combined >= 75 ? 'B' : combined >= 60 ? 'C' : 'D';
    log(`NW-Memory: ${nwScore}/100 (legacy)`);
    log(`gitwise:   ${gwScore}/100 (legacy)`);
    log(`combined:  ${combined}/100`);
  }
  log(`threshold: ${SCORE_OK_THRESHOLD} (auto-fix triggers below this)`);
  log(`needs fix: ${combined < SCORE_OK_THRESHOLD ? 'YES' : 'NO'}`);

  const flog = loadFixerLog();
  if (flog.runs.length > 0) {
    const last = flog.runs[flog.runs.length - 1];
    log(`last run:  ${last.date} | ${last.before}→${last.after} | ${last.actions} actions`);
    log(`total:     ${flog.totalFixes} fixes applied, ${flog.totalVerified} verified`);
  }

  // Show what would be fixed
  const actions = fix(evalData, true);
  if (actions.length > 0) {
    console.log('');
    log(`pending fixes (${actions.length}):`);
    for (const a of actions) {
      dim(`  → [${a.system}] ${a.desc}`);
    }
  }

  console.log('');
}

// ─── CLI ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const arg = args[0] || '';

if (arg === '--status' || arg === 'status') {
  status();
} else if (arg === '--dry-run' || arg === 'dry-run') {
  run_cycle({ dryRun: true });
} else if (arg === '--force' || arg === 'force') {
  run_cycle({ force: true });
} else if (arg === '--silent') {
  run_cycle({ silent: true });
} else if (arg === '--json') {
  // Machine-readable output for hooks
  const result = run_cycle({ silent: true });
  console.log(JSON.stringify(result));
} else {
  run_cycle({});
}
