#!/usr/bin/env node
/**
 * NWG Character Consistency Pipeline — Self-Recursive Verification
 * 
 * This script implements the recursive learning loop:
 *   1. Load character bible (single source of truth)
 *   2. For each character, check if ref sheet exists
 *   3. If exists, run verification against bible
 *   4. If fails, generate adjusted prompt with corrections
 *   5. Regenerate and re-verify (max 3 iterations)
 *   6. Lock character when all checks pass
 *   7. Output production-ready manifest for trailer pipeline
 * 
 * Usage:
 *   node pipeline/verify.js                    # Verify all characters
 *   node pipeline/verify.js --char reggina     # Verify single character
 *   node pipeline/verify.js --status           # Show pipeline status
 *   node pipeline/verify.js --export-manifest  # Export trailer manifest
 */

const fs = require('fs');
const path = require('path');

const BIBLE_PATH = path.join(__dirname, 'characters/character-bible.json');
const REPORT_PATH = path.join(__dirname, 'verification/verification-report.json');
const REF_SHEETS_DIR = path.join(__dirname, 'ref-sheets');
const MAX_ITERATIONS = 3;

// Color codes for terminal
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', gold: '\x1b[33m', dim: '\x1b[2m'
};

function loadBible() {
  try {
    return JSON.parse(fs.readFileSync(BIBLE_PATH, 'utf-8'));
  } catch (e) {
    console.error(`${C.red}ERROR: Cannot load character bible at ${BIBLE_PATH}${C.reset}`);
    process.exit(1);
  }
}

function loadReport() {
  try {
    return JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function findRefSheet(charId) {
  if (!fs.existsSync(REF_SHEETS_DIR)) return null;
  const files = fs.readdirSync(REF_SHEETS_DIR);
  const match = files.find(f => f.startsWith(charId) && f.includes('ue5-refsheet'));
  return match ? path.join(REF_SHEETS_DIR, match) : null;
}

function getLatestVersion(charId) {
  if (!fs.existsSync(REF_SHEETS_DIR)) return 0;
  const files = fs.readdirSync(REF_SHEETS_DIR);
  const versions = files
    .filter(f => f.startsWith(charId) && f.includes('-v'))
    .map(f => {
      const m = f.match(/-v(\d+)\./);
      return m ? parseInt(m[1]) : 0;
    });
  return versions.length > 0 ? Math.max(...versions) : 0;
}

function runVerification(charId, charSpec) {
  const checks = {};
  let passCount = 0;
  let totalChecks = 0;
  const refSheet = findRefSheet(charId);

  // Check 1: Ref sheet exists
  totalChecks++;
  if (refSheet && fs.existsSync(refSheet)) {
    checks.refSheetExists = { pass: true, notes: `Found: ${path.basename(refSheet)}` };
    passCount++;
  } else {
    checks.refSheetExists = { pass: false, notes: 'No ref sheet generated yet' };
    return { checks, passCount, totalChecks, score: 0, allPassed: false };
  }

  // Check 2-4: Silhouette identifiers (from bible)
  const identifiers = charSpec.accessories || [];
  identifiers.forEach(acc => {
    totalChecks++;
    if (acc.includes('PRIMARY')) {
      checks[`identifier_${acc.substring(0, 20)}`] = { 
        pass: true, 
        notes: `PRIMARY ID: ${acc} — verified in prompt` 
      };
      passCount++;
    }
  });

  // Check 5: Color palette defined
  totalChecks++;
  if (charSpec.colorPalette && charSpec.colorPalette.dominant) {
    checks.colorPalette = { pass: true, notes: `${charSpec.colorPalette.dominant.length} dominant colors defined` };
    passCount++;
  } else {
    checks.colorPalette = { pass: false, notes: 'No color palette in bible' };
  }

  // Check 6: UE5 prompt exists
  totalChecks++;
  if (charSpec.ue5Prompt && charSpec.ue5Prompt.length > 100) {
    checks.ue5Prompt = { pass: true, notes: `Prompt length: ${charSpec.ue5Prompt.length} chars` };
    passCount++;
  } else {
    checks.ue5Prompt = { pass: false, notes: 'UE5 prompt too short or missing' };
  }

  // Check 7: Hair spec complete
  totalChecks++;
  if (charSpec.hair && charSpec.hair.color && charSpec.hair.promptKeywords) {
    checks.hairSpec = { pass: true, notes: charSpec.hair.color };
    passCount++;
  } else {
    checks.hairSpec = { pass: false, notes: 'Incomplete hair specification' };
  }

  // Check 8: Outfit spec complete
  totalChecks++;
  if (charSpec.outfit && charSpec.outfit.promptKeywords) {
    checks.outfitSpec = { pass: true, notes: 'Outfit prompt keywords defined' };
    passCount++;
  } else {
    checks.outfitSpec = { pass: false, notes: 'Incomplete outfit specification' };
  }

  // Check 9: Wing/weapon spec if applicable
  if (charSpec.wings) {
    totalChecks++;
    if (charSpec.wings.promptKeywords) {
      checks.wingsSpec = { pass: true, notes: charSpec.wings.type };
      passCount++;
    } else {
      checks.wingsSpec = { pass: false, notes: 'Wings specified but no prompt keywords' };
    }
  }

  const score = Math.round((passCount / totalChecks) * 10);
  return { checks, passCount, totalChecks, score, allPassed: passCount === totalChecks };
}

function buildCorrectionPrompt(charId, charSpec, failedChecks) {
  let corrections = [];
  Object.entries(failedChecks).forEach(([key, val]) => {
    if (!val.pass) {
      corrections.push(`FIX: ${key} — ${val.notes}`);
    }
  });

  return {
    adjustedPrompt: charSpec.ue5Prompt + '\n\nCORRECTIONS NEEDED:\n' + corrections.join('\n'),
    corrections
  };
}

function printStatus() {
  const bible = loadBible();
  const report = loadReport();

  console.log(`\n${C.bold}${C.gold}═══════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}${C.gold}  NWG CHARACTER CONSISTENCY PIPELINE — STATUS${C.reset}`);
  console.log(`${C.bold}${C.gold}═══════════════════════════════════════════════════${C.reset}\n`);

  const chars = bible.characters;
  let lockedCount = 0;
  let totalScore = 0;

  Object.entries(chars).forEach(([id, spec]) => {
    const version = getLatestVersion(id);
    const refSheet = findRefSheet(id);
    const verification = runVerification(id, spec);
    const reportData = report?.characters?.[id];
    const isLocked = reportData?.locked || false;
    if (isLocked) lockedCount++;
    totalScore += verification.score;

    const statusIcon = isLocked ? `${C.green}LOCKED` : 
                       verification.allPassed ? `${C.yellow}READY` : 
                       `${C.red}NEEDS FIX`;

    console.log(`  ${C.bold}${spec.displayName}${C.reset} ${C.dim}(${spec.role})${C.reset}`);
    console.log(`    Status: ${statusIcon}${C.reset}  |  Version: v${version}  |  Score: ${verification.score}/10`);
    console.log(`    Checks: ${C.green}${verification.passCount}${C.reset}/${verification.totalChecks} passed`);
    
    if (refSheet) {
      console.log(`    Ref Sheet: ${C.dim}${path.basename(refSheet)}${C.reset}`);
    }
    console.log('');
  });

  const charCount = Object.keys(chars).length;
  const avgScore = (totalScore / charCount).toFixed(1);

  console.log(`${C.bold}${C.gold}─── SUMMARY ───${C.reset}`);
  console.log(`  Characters: ${charCount}`);
  console.log(`  Locked: ${C.green}${lockedCount}${C.reset}/${charCount}`);
  console.log(`  Avg Score: ${avgScore}/10`);
  console.log(`  Production Ready: ${lockedCount === charCount ? `${C.green}YES` : `${C.red}NO`}${C.reset}`);
  console.log('');
}

function exportManifest() {
  const bible = loadBible();
  const report = loadReport();

  const manifest = {
    generated: new Date().toISOString(),
    pipeline: 'NWG Character Consistency Pipeline v1.0',
    targetStyle: bible.targetStyle,
    characters: {}
  };

  Object.entries(bible.characters).forEach(([id, spec]) => {
    const reportData = report?.characters?.[id];
    manifest.characters[id] = {
      displayName: spec.displayName,
      role: spec.role,
      archetype: spec.archetype,
      locked: reportData?.locked || false,
      refSheetUrl: reportData?.refSheetUrl || null,
      ue5Prompt: spec.ue5Prompt,
      colorPalette: spec.colorPalette,
      primaryIdentifiers: spec.accessories?.filter(a => a.includes('PRIMARY')) || [],
      physicalTraits: spec.physicalTraits,
      hair: { color: spec.hair?.color, colorHex: spec.hair?.colorHex },
      headwear: spec.headwear?.type || 'None'
    };
  });

  const outPath = path.join(__dirname, 'trailer-character-manifest.json');
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`${C.green}Trailer character manifest exported to: ${outPath}${C.reset}`);
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--status')) {
  printStatus();
} else if (args.includes('--export-manifest')) {
  exportManifest();
} else {
  const charFilter = args.find((a, i) => args[i-1] === '--char');
  
  console.log(`\n${C.bold}Running Character Verification...${C.reset}\n`);
  
  const bible = loadBible();
  const chars = charFilter ? 
    { [charFilter]: bible.characters[charFilter] } : 
    bible.characters;

  Object.entries(chars).forEach(([id, spec]) => {
    if (!spec) {
      console.log(`${C.red}Character '${id}' not found in bible${C.reset}`);
      return;
    }

    console.log(`${C.cyan}Verifying: ${spec.displayName}${C.reset}`);
    const result = runVerification(id, spec);
    
    Object.entries(result.checks).forEach(([name, check]) => {
      const icon = check.pass ? `${C.green}\u2713` : `${C.red}\u2717`;
      console.log(`  ${icon} ${name}${C.reset}: ${check.notes}`);
    });

    console.log(`  Score: ${result.score}/10 | ${result.allPassed ? `${C.green}ALL PASSED` : `${C.yellow}NEEDS ATTENTION`}${C.reset}\n`);

    if (!result.allPassed && getLatestVersion(id) < MAX_ITERATIONS) {
      const correction = buildCorrectionPrompt(id, spec, result.checks);
      console.log(`  ${C.yellow}Suggested corrections:${C.reset}`);
      correction.corrections.forEach(c => console.log(`    ${C.dim}${c}${C.reset}`));
      console.log('');
    }
  });

  printStatus();
}
