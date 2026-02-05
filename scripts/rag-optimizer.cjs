#!/usr/bin/env node
/**
 * NumbahWan TCG - RAG Context Optimizer
 * 
 * Automatically generates optimized context files to reduce AI token costs.
 * Run this after significant project changes to update the context cache.
 * 
 * Usage:
 *   node scripts/rag-optimizer.cjs              # Full optimization
 *   node scripts/rag-optimizer.cjs --quick      # Quick update (metadata only)
 *   node scripts/rag-optimizer.cjs --stats      # Show current stats
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, '.ai-cache');

// ============================================================
// Configuration
// ============================================================

const CONFIG = {
  // Files to always include in context (small, critical)
  criticalFiles: [
    '.ai-context.md',
    'public/static/data/physical-origins-set.json',
  ],
  
  // Files to summarize (large, frequently needed)
  summarizeFiles: [
    { path: 'public/static/data/cards-v2.json', type: 'cards' },
    { path: 'public/static/nw-config.js', type: 'config' },
    { path: 'src/index.tsx', type: 'api' },
  ],
  
  // Directories to index (for file lookup)
  indexDirs: [
    'public/static',
    'public/static/data',
    'src',
    'docs',
    'scripts',
    'migrations',
  ],
  
  // File patterns to ignore
  ignorePatterns: [
    'node_modules',
    '.git',
    'dist',
    '*.log',
    '*.map',
    'package-lock.json',
  ],
};

// ============================================================
// Utilities
// ============================================================

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function estimateTokens(text) {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

function shouldIgnore(filePath) {
  return CONFIG.ignorePatterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

// ============================================================
// Summarizers
// ============================================================

function summarizeCards(content) {
  try {
    const data = JSON.parse(content);
    const cards = data.cards || [];
    
    const byRarity = {};
    cards.forEach(card => {
      const r = card.rarity || 'unknown';
      if (!byRarity[r]) byRarity[r] = [];
      byRarity[r].push({ id: card.id, name: card.name, hasArt: !!card.img });
    });
    
    return {
      version: data.version,
      totalCards: cards.length,
      lastUpdated: data.lastUpdated,
      byRarity: Object.entries(byRarity).map(([rarity, cards]) => ({
        rarity,
        count: cards.length,
        withArt: cards.filter(c => c.hasArt).length,
        sample: cards.slice(0, 3).map(c => c.name),
      })),
    };
  } catch (e) {
    return { error: e.message };
  }
}

function summarizeConfig(content) {
  const exports = [];
  const versionMatch = content.match(/VERSION:\s*['"]([^'"]+)['"]/);
  const currencyMatch = content.match(/CURRENCIES:\s*\{([^}]+)\}/);
  
  if (versionMatch) exports.push({ key: 'VERSION', value: versionMatch[1] });
  
  // Extract key constants
  const patterns = [
    /const\s+(\w+)\s*=/g,
    /(\w+):\s*{/g,
  ];
  
  return {
    version: versionMatch ? versionMatch[1] : 'unknown',
    hasCurrencies: !!currencyMatch,
    estimatedExports: exports.length,
  };
}

function summarizeAPI(content) {
  const endpoints = [];
  const routePattern = /app\.(get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]/gi;
  
  let match;
  while ((match = routePattern.exec(content)) !== null) {
    endpoints.push({ method: match[1].toUpperCase(), path: match[2] });
  }
  
  return {
    totalEndpoints: endpoints.length,
    endpoints: endpoints.slice(0, 20), // Limit to first 20
    hasMore: endpoints.length > 20,
  };
}

function summarizeFile(filePath, type) {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) return null;
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const originalTokens = estimateTokens(content);
  
  let summary;
  switch (type) {
    case 'cards':
      summary = summarizeCards(content);
      break;
    case 'config':
      summary = summarizeConfig(content);
      break;
    case 'api':
      summary = summarizeAPI(content);
      break;
    default:
      summary = { lines: content.split('\n').length };
  }
  
  const summaryText = JSON.stringify(summary, null, 2);
  const summaryTokens = estimateTokens(summaryText);
  
  return {
    file: filePath,
    type,
    originalSize: getFileSize(fullPath),
    originalTokens,
    summaryTokens,
    savings: Math.round((1 - summaryTokens / originalTokens) * 100),
    summary,
  };
}

// ============================================================
// Index Generator
// ============================================================

function generateFileIndex() {
  const index = {};
  
  CONFIG.indexDirs.forEach(dir => {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) return;
    
    index[dir] = [];
    
    try {
      const files = fs.readdirSync(fullDir);
      files.forEach(file => {
        const filePath = path.join(fullDir, file);
        if (shouldIgnore(filePath)) return;
        
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          index[dir].push({
            name: file,
            size: formatBytes(stat.size),
            modified: stat.mtime.toISOString().split('T')[0],
          });
        }
      });
    } catch (e) {
      index[dir] = [{ error: e.message }];
    }
  });
  
  return index;
}

// ============================================================
// Main Optimization
// ============================================================

function runOptimization(options = {}) {
  console.log('\n🔄 NumbahWan RAG Optimizer\n');
  
  // Create cache directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const results = {
    timestamp: new Date().toISOString(),
    summaries: [],
    fileIndex: null,
    stats: {
      totalOriginalTokens: 0,
      totalOptimizedTokens: 0,
    },
  };
  
  // Generate summaries
  console.log('📝 Generating summaries...');
  CONFIG.summarizeFiles.forEach(({ path: filePath, type }) => {
    const summary = summarizeFile(filePath, type);
    if (summary) {
      results.summaries.push(summary);
      results.stats.totalOriginalTokens += summary.originalTokens;
      results.stats.totalOptimizedTokens += summary.summaryTokens;
      console.log(`   ✓ ${filePath}: ${summary.savings}% smaller`);
    }
  });
  
  // Generate file index
  if (!options.quick) {
    console.log('\n📁 Building file index...');
    results.fileIndex = generateFileIndex();
    
    let totalFiles = 0;
    Object.values(results.fileIndex).forEach(files => {
      totalFiles += files.length;
    });
    console.log(`   ✓ Indexed ${totalFiles} files across ${Object.keys(results.fileIndex).length} directories`);
  }
  
  // Calculate savings
  const savingsPercent = Math.round(
    (1 - results.stats.totalOptimizedTokens / results.stats.totalOriginalTokens) * 100
  );
  
  // Write cache files
  const summariesPath = path.join(OUTPUT_DIR, 'summaries.json');
  fs.writeFileSync(summariesPath, JSON.stringify(results.summaries, null, 2));
  
  if (results.fileIndex) {
    const indexPath = path.join(OUTPUT_DIR, 'file-index.json');
    fs.writeFileSync(indexPath, JSON.stringify(results.fileIndex, null, 2));
  }
  
  // Write combined context
  const contextPath = path.join(OUTPUT_DIR, 'optimized-context.json');
  fs.writeFileSync(contextPath, JSON.stringify(results, null, 2));
  
  // Print stats
  console.log('\n' + '═'.repeat(50));
  console.log('📊 OPTIMIZATION RESULTS');
  console.log('═'.repeat(50));
  console.log(`   Original tokens:  ${results.stats.totalOriginalTokens.toLocaleString()}`);
  console.log(`   Optimized tokens: ${results.stats.totalOptimizedTokens.toLocaleString()}`);
  console.log(`   Token savings:    ${savingsPercent}%`);
  console.log(`   Cache location:   ${OUTPUT_DIR}`);
  console.log('═'.repeat(50));
  
  // Cost estimation (assuming $0.01 per 1K tokens)
  const costSavings = ((results.stats.totalOriginalTokens - results.stats.totalOptimizedTokens) / 1000) * 0.01;
  console.log(`\n💰 Estimated cost savings per query: $${costSavings.toFixed(4)}`);
  console.log(`   (Based on ~$0.01/1K tokens)\n`);
  
  return results;
}

function showStats() {
  const contextPath = path.join(OUTPUT_DIR, 'optimized-context.json');
  
  if (!fs.existsSync(contextPath)) {
    console.log('❌ No optimization cache found. Run without --stats first.');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
  
  console.log('\n📊 Current RAG Optimization Stats\n');
  console.log(`Last updated: ${data.timestamp}`);
  console.log(`Summaries: ${data.summaries.length} files`);
  
  if (data.fileIndex) {
    let totalFiles = 0;
    Object.values(data.fileIndex).forEach(files => {
      totalFiles += files.length;
    });
    console.log(`File index: ${totalFiles} files`);
  }
  
  console.log(`\nOriginal tokens:  ${data.stats.totalOriginalTokens.toLocaleString()}`);
  console.log(`Optimized tokens: ${data.stats.totalOptimizedTokens.toLocaleString()}`);
  
  const savings = Math.round(
    (1 - data.stats.totalOptimizedTokens / data.stats.totalOriginalTokens) * 100
  );
  console.log(`Savings: ${savings}%\n`);
}

// ============================================================
// CLI
// ============================================================

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
NumbahWan RAG Optimizer - Reduce AI token costs

Usage:
  node rag-optimizer.cjs           Full optimization
  node rag-optimizer.cjs --quick   Quick update (summaries only)
  node rag-optimizer.cjs --stats   Show current stats
  node rag-optimizer.cjs --help    Show this help

Output:
  .ai-cache/summaries.json         File summaries
  .ai-cache/file-index.json        Directory index
  .ai-cache/optimized-context.json Combined context
`);
} else if (args.includes('--stats')) {
  showStats();
} else {
  runOptimization({ quick: args.includes('--quick') });
}
