#!/usr/bin/env node
'use strict';
// aitell CLI — run the text, layout, and stylometry detectors over files.
//
//   aitell text   <files...>   regex AI-tell phrase blocklist
//   aitell layout <files...>   six visual detectors (L1–L6)
//   aitell prose  <files...>   machine-rhythm stylometry score
//   aitell all    <files...>   run every layer
//
//   --json   machine-readable output
//
// Exit code is 1 when any blocking issue is found (high-severity phrase or a
// blocking layout finding), 0 otherwise — so it drops straight into CI.

const fs = require('fs');
const path = require('path');
const aitell = require('../src/index.js');

const argv = process.argv.slice(2);
const cmd = argv[0];
const json = argv.includes('--json');
const files = argv.slice(1).filter(a => !a.startsWith('--'));

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

function die(msg, code) {
  console.error(msg);
  process.exit(code == null ? 2 : code);
}

if (!cmd || ['-h', '--help', 'help'].includes(cmd)) {
  console.log(`aitell — detect the fingerprints of machine-generated web content

Usage:
  aitell text   <files...> [--json]   regex AI-tell phrase blocklist
  aitell layout <files...> [--json]   six visual detectors (L1-L6)
  aitell prose  <files...> [--json]   machine-rhythm stylometry score
  aitell all    <files...> [--json]   run every layer

Exit code 1 when any blocking issue is found, else 0.`);
  process.exit(0);
}

if (!['text', 'layout', 'prose', 'all'].includes(cmd)) {
  die(`aitell: unknown command "${cmd}". Try: aitell help`, 2);
}
if (files.length === 0) {
  die('aitell: no files given', 2);
}

let blocking = 0;
const out = { command: cmd, files: [] };

for (const file of files) {
  const src = read(file);
  if (src == null) {
    console.error(`aitell: cannot read ${file}`);
    continue;
  }
  const rel = path.relative(process.cwd(), file) || file;
  const entry = { file: rel };

  if (cmd === 'text' || cmd === 'all') {
    const r = aitell.lintText(src, aitell.defaultCorpus);
    entry.text = r;
    blocking += r.blocked;
    if (!json) {
      if (r.violations.length === 0) {
        console.log(`  [text]   ${rel} · clean`);
      } else {
        console.log(`  [text]   ${rel} · ${r.blocked} blocking, ${r.warned} warning`);
        for (const v of r.violations) {
          const tag = v.severity === 'high' ? '✗' : v.severity === 'medium' ? '⚠' : '·';
          console.log(`           ${tag} L${v.line} [${v.lang}] "${v.match}" (${v.ruleId})`);
        }
      }
    }
  }

  if (cmd === 'layout' || cmd === 'all') {
    const r = aitell.lintLayout(src);
    entry.layout = r;
    blocking += r.blocking;
    if (!json) {
      if (r.findings.length === 0) {
        console.log(`  [layout] ${rel} · clean`);
      } else {
        console.log(`  [layout] ${rel} · ${r.blocking} blocking, ${r.advisory} advisory`);
        for (const f of r.findings) {
          console.log(`           ${f.blocking ? '✗' : '·'} ${f.id} — ${f.detail}`);
        }
      }
    }
  }

  if (cmd === 'prose' || cmd === 'all') {
    const r = aitell.analyzeStylometry(src);
    entry.prose = r;
    if (!json) {
      const b = aitell.band(r.score);
      console.log(`  [prose]  ${rel} · score ${r.score == null ? 'n/a' : r.score}/100 ${b.tag} ${b.label}`);
      for (const reason of r.reasons) console.log(`           · ${reason}`);
    }
  }

  out.files.push(entry);
}

if (json) {
  out.blocking = blocking;
  console.log(JSON.stringify(out, null, 2));
}

process.exit(blocking > 0 ? 1 : 0);
