#!/usr/bin/env node
/**
 * mycelium-why — full intelligence report on any file
 *
 * Usage: node mycelium-why.cjs <filepath>
 *        mycelium why public/battle.html
 *
 * Like `git blame` but for institutional knowledge:
 *   • How many times did this file break? What were the failure modes?
 *   • Which files are coupled to it? (change one → must change the other)
 *   • What constraints apply? (iOS, i18n, Cloudflare, etc.)
 *   • What lessons were learned from past fixes?
 *   • What's the danger score and what triggers it?
 *   • Actionable advice: what to check before editing this file
 *
 * Reads from: .mycelium/memory.json + .mycelium/watch.json
 * Zero dependencies. One file.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Colors ──────────────────────────────────────────────────────────
const B = '\x1b[1m', G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m';
const D = '\x1b[2m', C = '\x1b[36m', M = '\x1b[35m', X = '\x1b[0m';

// ─── Helpers ─────────────────────────────────────────────────────────
function findGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8', timeout: 5000 }).trim();
  } catch { return process.cwd(); }
}

function parseJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

function shell(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch { return ''; }
}

// ─── Area classifier (matches mycelium.cjs logic) ───────────────────
function classifyArea(filepath) {
  const f = filepath.toLowerCase();
  if (f.includes('battle') || f.includes('pvp') || f.includes('arena')) return 'battle';
  if (f.includes('card') || f.includes('forge') || f.includes('deck')) return 'cards';
  if (f.includes('i18n') || f.includes('lang') || f.includes('translation')) return 'i18n';
  if (f.includes('market') || f.includes('shop') || f.includes('merch') || f.includes('staking')) return 'market';
  if (f.includes('nav') || f.includes('menu') || f.includes('sidebar')) return 'navigation';
  if (f.includes('wallet') || f.includes('premium') || f.includes('payment')) return 'wallet';
  if (f.includes('memory') || f.includes('mycelium') || f.includes('watch') || f.includes('eval')) return 'memory';
  if (f.includes('index') || f.includes('home')) return 'homepage';
  if (f.includes('profile') || f.includes('citizen') || f.includes('embassy')) return 'profile';
  if (f.includes('guide') || f.includes('academy') || f.includes('tutorial')) return 'guide';
  return 'general';
}

// ─── Data loaders ────────────────────────────────────────────────────
function loadData(root) {
  const memFile = path.join(root, '.mycelium', 'memory.json');
  const watchFile = path.join(root, '.mycelium', 'watch.json');
  return {
    memory: parseJSON(memFile) || { breakages: [], learnings: [], constraints: {}, decisions: [], patterns: {} },
    watch: parseJSON(watchFile) || { commits: [], breakages: [], couplings: [], hotspots: {}, risks: {} },
  };
}

// ─── Intelligence gathering ──────────────────────────────────────────

function findBreakages(data, filepath) {
  const basename = path.basename(filepath);
  const results = [];

  // From memory.json breakages
  for (const b of (data.memory.breakages || [])) {
    if (b.what && (b.what.includes(basename) || b.what.includes(filepath))) {
      results.push({ source: 'memory', ...b });
    }
  }

  // From watch.json breakages
  for (const b of (data.watch.breakages || [])) {
    const files = b.files || [];
    if (files.some(f => f.includes(basename) || f === filepath)) {
      results.push({ source: 'watch', ...b });
    }
  }

  return results;
}

function findCouplings(data, filepath) {
  const basename = path.basename(filepath);
  const results = [];

  // From watch.json couplings (object: "fileA<->fileB": count)
  const couplings = data.watch.couplings || {};
  if (typeof couplings === 'object' && !Array.isArray(couplings)) {
    for (const [key, count] of Object.entries(couplings)) {
      if (key.includes(basename)) {
        const parts = key.split('<->');
        const partner = parts.find(p => !p.includes(basename)) || parts[1] || '';
        if (partner) results.push({ partner: partner.trim(), count: typeof count === 'number' ? count : 0 });
      }
    }
  } else if (Array.isArray(couplings)) {
    for (const c of couplings) {
      const pair = c.pair || c.files || [];
      if (pair.some(f => f.includes(basename))) {
        const partner = pair.find(f => !f.includes(basename)) || pair[1];
        results.push({ partner, count: c.count || c.times || 0 });
      }
    }
  }

  // From memory.json patterns (co-change)
  const patterns = data.memory.patterns || {};
  for (const [key, value] of Object.entries(patterns)) {
    if (key.includes(basename)) {
      const parts = key.split(' <-> ');
      const partner = parts.find(p => !p.includes(basename)) || parts[1];
      if (partner) {
        // Don't duplicate if already in watch couplings
        if (!results.some(r => r.partner && r.partner.includes(path.basename(partner)))) {
          results.push({ partner, count: typeof value === 'number' ? value : (value.count || 0) });
        }
      }
    }
  }

  return results.sort((a, b) => b.count - a.count);
}

function findConstraints(data, filepath) {
  const area = classifyArea(filepath);
  const constraints = data.memory.constraints || {};
  const results = [];

  // Direct area constraints
  if (constraints[area] && Array.isArray(constraints[area])) {
    for (const c of constraints[area]) {
      results.push({ area, text: typeof c === 'string' ? c : (c.text || c.fact || JSON.stringify(c)) });
    }
  }

  // Also check 'general' and 'ios' constraints as they apply everywhere
  for (const generalArea of ['ios', 'cloudflare', 'general']) {
    if (generalArea !== area && constraints[generalArea] && Array.isArray(constraints[generalArea])) {
      for (const c of constraints[generalArea]) {
        const text = typeof c === 'string' ? c : (c.text || c.fact || JSON.stringify(c));
        // Only include if relevant to this file type
        if (filepath.endsWith('.html') && (generalArea === 'ios' || text.toLowerCase().includes('mobile'))) {
          results.push({ area: generalArea, text });
        }
      }
    }
  }

  return results;
}

function findLessons(data, filepath) {
  const basename = path.basename(filepath);
  const area = classifyArea(filepath);
  const results = [];

  // From memory.json learnings
  for (const l of (data.memory.learnings || [])) {
    const lArea = l.area || '';
    const lText = l.lesson || l.what || '';
    // Match by area or by file mention
    if (lArea === area || lText.includes(basename) || lText.includes(filepath)) {
      results.push({ source: 'learning', date: l.date, text: lText, area: lArea });
    }
  }

  // From watch.json breakage lessons
  for (const b of (data.watch.breakages || [])) {
    const files = b.files || [];
    if (files.some(f => f.includes(basename))) {
      if (b.lesson) {
        results.push({ source: 'breakage-fix', date: b.date, text: b.lesson, area: b.area || area });
      }
    }
  }

  return results;
}

function findRiskInfo(data, filepath) {
  const basename = path.basename(filepath);
  const risks = data.watch.risks || {};
  const hotspots = data.watch.hotspots || {};

  // Find in risks (can be array or object)
  let riskEntry = null;
  if (Array.isArray(risks)) {
    riskEntry = risks.find(r => (r.file || '').includes(basename));
  } else {
    for (const [key, val] of Object.entries(risks)) {
      if (key.includes(basename)) {
        riskEntry = typeof val === 'object' ? { file: key, ...val } : { file: key, danger: val };
        break;
      }
    }
  }

  // Find in hotspots
  let hotspotEntry = null;
  if (typeof hotspots === 'object' && !Array.isArray(hotspots)) {
    for (const [key, val] of Object.entries(hotspots)) {
      if (key.includes(basename)) {
        hotspotEntry = typeof val === 'object' ? { file: key, ...val } : { file: key, changes: val };
        break;
      }
    }
  }

  return { risk: riskEntry, hotspot: hotspotEntry };
}

function getGitStats(filepath, root) {
  const commitCount = shell(`cd "${root}" && git log --oneline -- "${filepath}" 2>/dev/null | wc -l`).trim();
  const lastCommit = shell(`cd "${root}" && git log -1 --pretty=format:"%h %s" -- "${filepath}" 2>/dev/null`);
  const firstCommit = shell(`cd "${root}" && git log --reverse --pretty=format:"%h %ad" --date=short -- "${filepath}" 2>/dev/null | head -1`);
  const authors = shell(`cd "${root}" && git log --pretty=format:"%an" -- "${filepath}" 2>/dev/null | sort -u`);
  return {
    commits: parseInt(commitCount) || 0,
    lastCommit: lastCommit || 'unknown',
    firstSeen: firstCommit || 'unknown',
    authors: authors ? authors.split('\n').filter(Boolean) : [],
  };
}

// ─── Danger bar visualization ────────────────────────────────────────
function dangerBar(score, max) {
  max = max || 50;
  const pct = Math.min(score / max, 1);
  const width = 20;
  const filled = Math.round(pct * width);
  const color = pct > 0.6 ? R : pct > 0.3 ? Y : G;
  return `${color}${'█'.repeat(filled)}${D}${'░'.repeat(width - filled)}${X} ${score.toFixed(1)}`;
}

// ─── Report generator ────────────────────────────────────────────────
function why(filepath, args) {
  const json = args.includes('--json');
  const root = findGitRoot();

  // Normalize filepath
  const absPath = path.isAbsolute(filepath) ? filepath : path.resolve(root, filepath);
  const relPath = path.relative(root, absPath);

  // Check file exists
  const fileExists = fs.existsSync(absPath);

  console.log(`\n  ${B}🍄 mycelium why${X} ${C}${relPath}${X}`);
  console.log(`  ${'─'.repeat(50)}\n`);

  if (!fileExists) {
    console.log(`  ${Y}!${X} File not found on disk (may be deleted — checking history)\n`);
  }

  // Load data
  const data = loadData(root);

  // ── Git stats ──────────────────────────────────────────────────
  const git = getGitStats(relPath, root);
  console.log(`  ${B}Git History${X}`);
  console.log(`  Commits:    ${B}${git.commits}${X}`);
  console.log(`  Last:       ${D}${git.lastCommit}${X}`);
  console.log(`  First seen: ${D}${git.firstSeen}${X}`);
  if (git.authors.length > 0) {
    console.log(`  Authors:    ${git.authors.join(', ')}`);
  }
  console.log();

  // ── Risk & Hotspot ────────────────────────────────────────────
  const { risk, hotspot } = findRiskInfo(data, relPath);
  if (risk || hotspot) {
    console.log(`  ${B}Risk Profile${X}`);
    if (risk) {
      const danger = risk.danger || risk.score || 0;
      console.log(`  Danger:     ${dangerBar(danger)}`);
      if (risk.breakages !== undefined) console.log(`  Breakages:  ${risk.breakages}x`);
      if (risk.fixes !== undefined) console.log(`  Fixes:      ${risk.fixes}x`);
    }
    if (hotspot) {
      const changes = hotspot.changes || hotspot.count || 0;
      console.log(`  Churn:      ${B}${changes}${X} changes ${D}(hotspot)${X}`);
    }
    console.log();
  }

  // ── Breakages ─────────────────────────────────────────────────
  const breakages = findBreakages(data, relPath);
  if (breakages.length > 0) {
    console.log(`  ${B}${R}Breakage History${X} ${D}(${breakages.length} incidents)${X}`);
    const seen = new Set();
    for (const b of breakages) {
      const key = b.what || b.pattern || b.lesson || '';
      if (seen.has(key)) continue;
      seen.add(key);
      const date = b.date ? `${D}${b.date}${X} ` : '';
      const area = b.area ? `${Y}[${b.area}]${X} ` : '';
      const desc = b.what || b.pattern || b.lesson || 'unknown breakage';
      console.log(`  ${R}✗${X} ${date}${area}${desc}`);
      if (b.lesson && b.lesson !== desc) {
        console.log(`    ${G}→ Fix:${X} ${b.lesson}`);
      }
    }
    console.log();
  } else {
    console.log(`  ${G}No breakages recorded for this file.${X}\n`);
  }

  // ── Couplings ─────────────────────────────────────────────────
  const couplings = findCouplings(data, relPath);
  if (couplings.length > 0) {
    console.log(`  ${B}${M}Coupled Files${X} ${D}(change together or break together)${X}`);
    for (const c of couplings.slice(0, 8)) {
      const strength = c.count >= 10 ? `${R}${B}` : c.count >= 5 ? `${Y}` : `${D}`;
      console.log(`  ${strength}${c.count}x${X} ↔ ${c.partner}`);
    }
    if (couplings.length > 8) {
      console.log(`  ${D}...and ${couplings.length - 8} more${X}`);
    }
    console.log();
  }

  // ── Constraints ───────────────────────────────────────────────
  const constraints = findConstraints(data, relPath);
  if (constraints.length > 0) {
    console.log(`  ${B}${Y}Constraints${X} ${D}(hard truths — violate at your peril)${X}`);
    for (const c of constraints) {
      console.log(`  ${Y}!${X} ${D}[${c.area}]${X} ${c.text}`);
    }
    console.log();
  }

  // ── Lessons ───────────────────────────────────────────────────
  const lessons = findLessons(data, relPath);
  if (lessons.length > 0) {
    console.log(`  ${B}${G}Lessons Learned${X} ${D}(${lessons.length} from past fixes)${X}`);
    const seen = new Set();
    for (const l of lessons.slice(0, 12)) {
      if (seen.has(l.text)) continue;
      seen.add(l.text);
      const date = l.date ? `${D}${l.date}${X} ` : '';
      // Truncate long lessons
      const text = l.text.length > 120 ? l.text.slice(0, 117) + '...' : l.text;
      console.log(`  ${G}→${X} ${date}${text}`);
    }
    if (lessons.length > 12) {
      console.log(`  ${D}...and ${lessons.length - 12} more lessons${X}`);
    }
    console.log();
  }

  // ── Advice ────────────────────────────────────────────────────
  console.log(`  ${B}${C}Before You Edit This File${X}`);
  const advice = [];

  if (breakages.length >= 5) {
    advice.push(`${R}HIGH RISK${X} — this file broke ${breakages.length}x. Write a test BEFORE changing it.`);
  } else if (breakages.length >= 2) {
    advice.push(`${Y}MEDIUM RISK${X} — broke ${breakages.length}x. Check the lessons above first.`);
  }

  if (couplings.length > 0) {
    const top = couplings.slice(0, 3).map(c => path.basename(c.partner));
    advice.push(`Co-change with: ${B}${top.join(', ')}${X} — if you edit this, edit those too.`);
  }

  if (constraints.length > 0) {
    advice.push(`${constraints.length} constraint(s) apply — read the ${Y}Constraints${X} section above.`);
  }

  // Failure-mode-specific advice
  const failureModes = {};
  for (const b of breakages) {
    const mode = classifyFailureMode(b);
    failureModes[mode] = (failureModes[mode] || 0) + 1;
  }
  if (failureModes.i18n) advice.push(`${Y}i18n${X}: broke ${failureModes.i18n}x on translations — verify all 3 locales (EN/ZH/TH).`);
  if (failureModes.mobile) advice.push(`${Y}mobile${X}: broke ${failureModes.mobile}x on mobile — test at 320px width + iOS Safari.`);
  if (failureModes.layout) advice.push(`${Y}layout${X}: broke ${failureModes.layout}x on layout — check overflow, z-index, clipping.`);

  if (advice.length === 0) {
    advice.push(`${G}Low risk.${X} No known failure patterns for this file.`);
  }

  for (const a of advice) {
    console.log(`  • ${a}`);
  }
  console.log();

  // ── JSON output ────────────────────────────────────────────────
  if (json) {
    const output = {
      file: relPath,
      exists: fileExists,
      git,
      risk: risk || null,
      hotspot: hotspot || null,
      breakages: breakages.length,
      couplings: couplings.map(c => ({ partner: c.partner, count: c.count })),
      constraints: constraints.map(c => ({ area: c.area, text: c.text })),
      lessons: lessons.length,
      failureModes,
      advice: advice.map(a => a.replace(/\x1b\[[0-9;]*m/g, '')),
    };
    console.log(JSON.stringify(output, null, 2));
  }
}

function classifyFailureMode(breakage) {
  const text = `${breakage.what || ''} ${breakage.lesson || ''} ${breakage.pattern || ''}`.toLowerCase();
  if (text.includes('i18n') || text.includes('translation') || text.includes('locale') || text.includes('lang')) return 'i18n';
  if (text.includes('mobile') || text.includes('ios') || text.includes('touch') || text.includes('320px') || text.includes('responsive')) return 'mobile';
  if (text.includes('layout') || text.includes('overflow') || text.includes('z-index') || text.includes('css') || text.includes('clip')) return 'layout';
  if (text.includes('runtime') || text.includes('error') || text.includes('null') || text.includes('undefined') || text.includes('crash')) return 'runtime';
  return 'other';
}

// ─── CLI Entry ───────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const filepath = args.find(a => !a.startsWith('-'));

  if (!filepath) {
    console.log(`\n  ${B}🍄 mycelium why${X} — file intelligence report`);
    console.log(`\n  Usage: mycelium why <filepath>`);
    console.log(`         mycelium why public/battle.html`);
    console.log(`         mycelium why src/index.tsx --json`);
    console.log(`\n  Shows: breakages, couplings, constraints, lessons, risk score,`);
    console.log(`         and actionable advice for any file in your project.\n`);
    process.exit(1);
  }

  why(filepath, args);
}

module.exports = { why };
