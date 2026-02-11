#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// LLM ENRICHMENT — Enrich mined patterns with AI analysis
// Usage: OPENAI_API_KEY=sk-xxx node scripts/enrich-patterns.cjs
//    or: node scripts/enrich-patterns.cjs --dry-run  (cost estimate only)
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const enrichedPath = path.join(__dirname, '..', '.mycelium-mined', 'webapp-enriched.json');

// Check what needs enrichment
if (!fs.existsSync(enrichedPath)) {
  console.log('❌ No enriched data found. Run: node tools/mycelium-miner.cjs extract . && node tools/mycelium-miner.cjs enrich .');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
const fixCommits = data.fixCommits || [];
const needsLLM = fixCommits.filter(fc => {
  const conf = fc.enrichment?.confidence || 0;
  return conf < 0.5;
});

const totalTokensEst = needsLLM.reduce((sum, fc) => {
  const diffLen = (fc.diff || '').length;
  return sum + Math.min(diffLen / 4, 2000) + 500; // prompt + response estimate
}, 0);

const costEst = (totalTokensEst / 1000000) * 0.15; // GPT-4o-mini: $0.15/M input

console.log('\n═══ LLM ENRICHMENT COST ESTIMATE ═══\n');
console.log(`  Total fix commits:       ${fixCommits.length}`);
console.log(`  Already high-confidence: ${fixCommits.length - needsLLM.length}`);
console.log(`  Need LLM analysis:       ${needsLLM.length}`);
console.log(`  Estimated tokens:        ~${Math.round(totalTokensEst).toLocaleString()}`);
console.log(`  Estimated cost:          ~$${costEst.toFixed(3)} (GPT-4o-mini)`);
console.log(`  Model:                   gpt-4o-mini`);
console.log('');

if (DRY_RUN) {
  console.log('  --dry-run: No changes made.\n');
  console.log('  To run enrichment:');
  console.log('    OPENAI_API_KEY=sk-xxx node tools/mycelium-miner.cjs enrich .\n');
  process.exit(0);
}

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.log('  ❌ OPENAI_API_KEY not set.\n');
  console.log('  Options:');
  console.log('    1. export OPENAI_API_KEY=sk-xxx');
  console.log('    2. Create .env file with OPENAI_API_KEY=sk-xxx');
  console.log('    3. Use --dry-run to see cost estimate\n');
  
  // Check for .env file
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/OPENAI_API_KEY=(.+)/);
    if (match) {
      console.log('  Found .env file with OPENAI_API_KEY — loading...');
      process.env.OPENAI_API_KEY = match[1].trim();
    }
  }
  
  if (!process.env.OPENAI_API_KEY) {
    process.exit(1);
  }
}

// Run enrichment
console.log('  🚀 Running LLM enrichment...\n');
const { execSync } = require('child_process');
try {
  execSync('node tools/mycelium-miner.cjs enrich .', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env }
  });
  console.log('\n  ✅ Enrichment complete! Run aggregate to update patterns:');
  console.log('    node tools/mycelium-miner.cjs aggregate .\n');
} catch (err) {
  console.error('Enrichment failed:', err.message);
  process.exit(1);
}
