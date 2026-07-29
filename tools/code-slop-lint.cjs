#!/usr/bin/env node
/**
 * tools/code-slop-lint.cjs — catch the slop AI coding agents leave in code.
 * ─────────────────────────────────────────────────────────────────────────
 * Architecture adapted from scanaislop/aislop (research 2026-07): the prose
 * linter (ai-tell-lint) guards user-facing copy; this guards the CODE ITSELF.
 * AI agents leave a recognizable residue in code that humans rarely write:
 *
 *   CS1  narrative comment    — a comment that restates the line below it
 *                               ("// increment the counter" / "// return the
 *                               result"). Self-explanatory code doesn't need
 *                               a narrator; these rot the moment code changes.
 *   CS2  swallowed exception  — catch block that is empty, or only logs and
 *                               continues, hiding failure from the caller.
 *   CS3  as-any cast          — `as any` / `@ts-ignore` / `@ts-nocheck` pasted
 *                               to silence the type system instead of fixing it.
 *
 * ADVISORY ONLY — always exits 0. Code slop has too many legitimate uses
 * (narrowing a third-party type, an intentional no-op catch) to hard-block;
 * the report is a review prompt, not a gate. Wired into aitell-pipeline as
 * the code medium alongside text/image.
 *
 * Usage:
 *   node tools/code-slop-lint.cjs               # staged .js/.cjs/.ts files
 *   node tools/code-slop-lint.cjs --all         # tracked code files (bounded)
 *   node tools/code-slop-lint.cjs <file> ...    # specific files
 *   node tools/code-slop-lint.cjs --json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const ALL = args.includes('--all');
const JSON_OUT = args.includes('--json');
const files = args.filter((a) => !a.startsWith('--'));

// Never lint fossils, generated state, dependencies, or third-party bundles.
const EXEMPT_PREFIX = ['legacy/', 'node_modules/', 'dist/', '.mycelium', 'public/static/lib/', 'public/static/js/vendor/'];
const MAX_FILE_BYTES = 1.5e6;
const MAX_ALL_FILES = 400;

function stagedCodeFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', { cwd: ROOT, encoding: 'utf8' });
    return out.trim().split('\n').filter(Boolean).filter((f) => /\.(cjs|js|mjs|ts|tsx)$/.test(f));
  } catch { return []; }
}

function allCodeFiles() {
  try {
    const out = execSync(
      'git ls-files "*.cjs" "*.js" "*.mjs" "*.ts" "*.tsx"',
      { cwd: ROOT, encoding: 'utf8' }
    );
    return out.trim().split('\n').filter(Boolean)
      .filter((f) => !EXEMPT_PREFIX.some((p) => f.startsWith(p)))
      .slice(0, MAX_ALL_FILES);
  } catch { return []; }
}

// Words that signal a comment is a SECTION header or doc, not narration.
// Leading HTTP method + path (// GET /api/...) is a route doc — a deliberate
// convention, not agent narration (caught by evals/linter-eval cd-adversarial).
const DOC_COMMENT = /^\s*\/?\*|TODO|FIXME|NOTE|HACK|XXX|@|eslint|ts-|why:|because|refactor|^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\//i;
// A comment narrates when it is an imperative verb phrase with no doc markers.
const NARRATIVE_VERB = /^(?:add|adds|adding|get|gets|getting|set|sets|setting|return|returns|returning|create|creates|creating|update|updates|updating|check|checks|checking|handle|handles|handling|loop|loops|iterate|iterates|fetch|fetches|build|builds|call|calls|initialize|initializes|init|define|defines|declare|declares|compute|computes|calculate|calculates|store|stores|save|saves|load|loads|render|renders|parse|parses|validate|validates|convert|converts|remove|removes|delete|deletes|send|sends|read|reads|write|writes|open|opens|close|closes|start|starts|stop|stops|run|runs|make|makes|ensure|ensures|increment|decrement|assign|assigns|declare|mount|mounts)\b/i;

function isBlankCode(line) { return /^[\s{}();,\]]*$/.test(line); }

function scanFile(rel) {
  const abs = path.join(ROOT, rel);
  let src;
  try { src = fs.readFileSync(abs, 'utf8'); } catch { return null; }
  if (src.length > MAX_FILE_BYTES || src.indexOf('\0') !== -1) return null; // skip huge / binary files
  const lines = src.split('\n');
  const findings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── CS1: narrative comment — single-line comment directly above a code
    //    line, phrased as an imperative restatement, no doc markers.
    const cm = line.match(/^\s*\/\/\s*(.+)$/);
    if (cm && !DOC_COMMENT.test(cm[1]) && NARRATIVE_VERB.test(cm[1])) {
      // next non-blank line must be actual code (not another comment)
      let j = i + 1;
      while (j < lines.length && isBlankCode(lines[j])) j++;
      const next = (lines[j] || '').trim();
      if (next && !next.startsWith('//') && !next.startsWith('/*') && next.length > 3) {
        findings.push({ rule: 'CS1-NARRATIVE-COMMENT', line: i + 1, match: cm[1].slice(0, 70), note: 'comment restates the code below it — delete it or say WHY, not what' });
      }
    }

    // ── CS2: swallowed exception — catch with an empty body or log-only body.
    //    A catch that returns/rethrows/exits, writes stderr, or carries a
    //    comment explaining WHY is deliberate — only flag true silence.
    //    `.catch(` promise handlers are explicit handling; skip them.
    const catchM = line.match(/(?<![.\w])catch\s*\([^)]*\)\s*\{/);
    if (catchM) {
      // collect full body text across lines, starting INSIDE the opening brace
      let depth = 0; let started = false; const parts = [];
      const startCol = line.indexOf('{', line.indexOf(catchM[0]));
      for (let k = i; k < Math.min(lines.length, i + 15); k++) {
        const seg = k === i ? lines[k].slice(startCol) : lines[k];
        for (const ch of seg) {
          if (ch === '{') { depth++; started = true; continue; }
          if (ch === '}') { depth--; if (started && depth <= 0) break; continue; }
          if (started) parts.push(ch);
        }
        if (started && depth <= 0) break;
        parts.push('\n');
      }
      const body = parts.join('').replace(/\s+/g, ' ').trim();
      const handled = /\b(return|throw|process\.exit|break|continue|reject|resolve)\b/.test(body)
        || /\/\*|\/\/|stderr/.test(body); // comment = documented silence
      const onlyLog = /^(console\.(log|warn|error|info|debug)\s*\([^;]*\)\s*;?\s*)*$/.test(body);
      if (started && body === '') {
        findings.push({ rule: 'CS2-SWALLOWED-EXCEPTION', line: i + 1, match: line.trim().slice(0, 60), note: 'empty catch — failure disappears; rethrow, handle, or comment WHY silence is correct' });
      } else if (started && !handled && onlyLog) {
        findings.push({ rule: 'CS2-SWALLOWED-EXCEPTION', line: i + 1, match: line.trim().slice(0, 60), note: 'catch only logs — caller never learns it failed; rethrow or degrade deliberately' });
      }
    }

    // ── CS3: as-any cast / type-silence directives. A @ts-* directive is a
    //    comment line that LEADS with the directive (it applies to the next
    //    line); prose merely mentioning "@ts-ignore" (docs like this header)
    //    does not count. `as any` only counts in real code — skip comment lines.
    const inComment = /^\s*(\/\/|\*|\/\*)/.test(line);
    const anyMatch = line.match(/\bas any\b/);
    const tsDirective = line.match(/^\s*(?:\/\/|\/\*|\*)\s*@ts-(?:ignore|nocheck|expect-error)\b/);
    if ((anyMatch && !inComment) || tsDirective) {
      findings.push({ rule: 'CS3-AS-ANY-CAST', line: i + 1, match: anyMatch ? anyMatch[0] : tsDirective[0], note: 'type system silenced instead of satisfied — narrow the type or declare the boundary' });
    }
  }
  return { file: rel, findings };
}

function main() {
  let targets;
  if (files.length) targets = files;
  else if (ALL) targets = allCodeFiles();
  else targets = stagedCodeFiles().filter((f) => !EXEMPT_PREFIX.some((p) => f.startsWith(p)));

  if (!targets.length) {
    if (!JSON_OUT) console.log('  [code-slop] no code files to scan');
    console.log(JSON_OUT ? JSON.stringify({ scanned: 0, findings: [] }) : '');
    return;
  }

  const all = [];
  let scanned = 0;
  for (const f of targets) {
    const r = scanFile(f);
    if (r) { scanned++; all.push(...r.findings.map((x) => ({ file: f, ...x }))); }
  }

  if (JSON_OUT) { console.log(JSON.stringify({ scanned, findings: all }, null, 2)); return; }

  const byFile = {};
  for (const x of all) (byFile[x.file] ||= []).push(x);
  console.log('');
  console.log('  CODE-SLOP LINT (advisory — never blocks)');
  console.log('  ═══════════════════════════════════════════════════════════');
  const cs1 = all.filter((x) => x.rule === 'CS1-NARRATIVE-COMMENT').length;
  const cs2 = all.filter((x) => x.rule === 'CS2-SWALLOWED-EXCEPTION').length;
  const cs3 = all.filter((x) => x.rule === 'CS3-AS-ANY-CAST').length;
  console.log(`  scanned: ${scanned} files · narrative comments: ${cs1} · swallowed exceptions: ${cs2} · as-any casts: ${cs3}`);
  console.log('');
  for (const [f, xs] of Object.entries(byFile)) {
    console.log(`  ${f}`);
    for (const x of xs) {
      console.log(`    ⚠ L${x.line}  [${x.rule}]  "${x.match}"`);
      console.log(`      ${x.note}`);
    }
    console.log('');
  }
  if (!all.length) console.log('  clean — no agent residue found in scanned code.');
  console.log('');
}

main();
process.exit(0); // advisory, always
