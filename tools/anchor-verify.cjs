#!/usr/bin/env node
'use strict';

/**
 * anchor-verify.cjs
 *
 * Re-runs verification heuristics against every anchor in references/visual-anchors/
 * and prints a report. Exit code non-zero if any anchor lacks a sidecar or is
 * flagged AI-suspect without manual-review acknowledgement.
 *
 * Usage:
 *   node tools/anchor-verify.cjs [--strict] [--json]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ANCHORS_DIR = path.join(ROOT, 'references', 'visual-anchors');
const META_DIR = path.join(ANCHORS_DIR, '_meta');
const CATEGORIES = ['taipei-real', 'designer-real', 'materials', 'imperfection'];

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = true;
  }
  return out;
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && /\.(jpe?g|png|webp|avif)$/i.test(entry.name)) {
      yield path.join(dir, entry.name);
    }
  }
}

function loadSidecar(filename) {
  const p = path.join(META_DIR, `${filename}.meta.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return null;
  }
}

function main() {
  const args = parseArgs(process.argv);
  const report = { categories: {}, totals: { ok: 0, missing_sidecar: 0, suspect: 0, suspect_acknowledged: 0 } };

  for (const cat of CATEGORIES) {
    const dir = path.join(ANCHORS_DIR, cat);
    const items = [];
    for (const file of walk(dir)) {
      const filename = path.basename(file);
      const meta = loadSidecar(filename);
      const entry = { file: filename, ok: false, reasons: [] };
      if (!meta) {
        entry.reasons.push('missing-sidecar');
        report.totals.missing_sidecar++;
      } else {
        if (!meta.source || !meta.source.photographer && !meta.source.url) {
          entry.reasons.push('no-provenance');
        }
        if (meta.verification && meta.verification.suspect) {
          if (meta.needsManualReview) {
            report.totals.suspect_acknowledged++;
            entry.reasons.push(`suspect-acknowledged:${meta.verification.flags.join(',')}`);
          } else {
            report.totals.suspect++;
            entry.reasons.push(`suspect:${meta.verification.flags.join(',')}`);
          }
        }
        if (entry.reasons.length === 0) {
          entry.ok = true;
          report.totals.ok++;
        }
      }
      items.push(entry);
    }
    report.categories[cat] = items;
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const [cat, items] of Object.entries(report.categories)) {
      console.log(`\n[${cat}] ${items.length} file(s)`);
      for (const it of items) {
        const tag = it.ok ? '✓' : '⚠';
        console.log(`  ${tag} ${it.file}${it.reasons.length ? ' — ' + it.reasons.join('; ') : ''}`);
      }
    }
    console.log('\n--- totals ---');
    console.log(`ok:                    ${report.totals.ok}`);
    console.log(`missing sidecar:       ${report.totals.missing_sidecar}`);
    console.log(`suspect (unreviewed):  ${report.totals.suspect}`);
    console.log(`suspect acknowledged:  ${report.totals.suspect_acknowledged}`);
  }

  if (args.strict && (report.totals.missing_sidecar > 0 || report.totals.suspect > 0)) {
    process.exit(2);
  }
}

main();
