#!/usr/bin/env node
/**
 * NumbahWan TCG - RAG Context Optimizer v2.0
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
    // Card data - all seasons
    { path: 'public/static/data/cards-v2.json', type: 'cards', label: 'Season 1' },
    { path: 'public/static/data/cards-s2.json', type: 'cards', label: 'Season 2' },
    { path: 'public/static/data/cards-s3.json', type: 'cards', label: 'Season 3' },
    { path: 'public/static/data/cards-s4.json', type: 'cards', label: 'Season 4' },
    { path: 'public/static/data/cards-s5.json', type: 'cards', label: 'Season 5' },
    { path: 'public/static/data/cards-s6.json', type: 'cards', label: 'Season 6' },
    { path: 'public/static/data/cards-s7.json', type: 'cards', label: 'Season 7' },
    { path: 'public/static/data/cards-s8.json', type: 'cards', label: 'Season 8' },
    { path: 'public/static/data/cards-s9.json', type: 'cards', label: 'Season 9' },
    { path: 'public/static/data/cards-s10.json', type: 'cards', label: 'Season 10' },
    // Core files
    { path: 'public/static/nw-config.js', type: 'config' },
    { path: 'src/index.tsx', type: 'api' },
    // Translations
    { path: 'src/data/translations.json', type: 'translations' },
    // Seasons config
    { path: 'public/static/data/seasons.json', type: 'seasons' },
    // Key modules
    { path: 'public/static/nw-wallet.js', type: 'module' },
    { path: 'public/static/nw-economy.js', type: 'module' },
    { path: 'public/static/nw-forge-engine.js', type: 'module' },
    { path: 'public/static/nw-currency.js', type: 'module' },
  ],
  
  // Directories to index (for file lookup)
  indexDirs: [
    'public/static',
    'public/static/data',
    'public/static/images/cards',
    'src',
    'src/data',
    'docs',
    'scripts',
    'migrations',
    'public',
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

function summarizeCards(content, label = '') {
  try {
    const data = JSON.parse(content);
    const cards = data.cards || [];
    
    const byRarity = {};
    const byCategory = {};
    
    cards.forEach(card => {
      // By rarity
      const r = card.rarity || 'unknown';
      if (!byRarity[r]) byRarity[r] = { count: 0, withArt: 0, ids: [] };
      byRarity[r].count++;
      if (card.img) byRarity[r].withArt++;
      if (byRarity[r].ids.length < 3) byRarity[r].ids.push(card.id);
      
      // By category
      const c = card.category || 'unknown';
      if (!byCategory[c]) byCategory[c] = 0;
      byCategory[c]++;
    });
    
    return {
      label,
      version: data.version,
      totalCards: cards.length,
      lastUpdated: data.lastUpdated,
      byRarity: Object.entries(byRarity).map(([rarity, info]) => ({
        rarity,
        count: info.count,
        withArt: info.withArt,
        sampleIds: info.ids,
      })),
      byCategory,
      artCoverage: `${cards.filter(c => c.img).length}/${cards.length}`,
    };
  } catch (e) {
    return { error: e.message };
  }
}

function summarizeConfig(content) {
  const versionMatch = content.match(/VERSION:\s*['"]([^'"]+)['"]/);
  const moduleName = content.match(/window\.(NW_\w+)\s*=/);
  
  // Extract exported functions/objects
  const exports = [];
  const funcPattern = /(\w+)\s*[=:]\s*(?:function|async function|\([^)]*\)\s*=>)/g;
  let match;
  while ((match = funcPattern.exec(content)) !== null) {
    if (exports.length < 15) exports.push(match[1]);
  }
  
  return {
    module: moduleName ? moduleName[1] : 'unknown',
    version: versionMatch ? versionMatch[1] : null,
    exports: exports,
    lines: content.split('\n').length,
  };
}

function summarizeAPI(content) {
  const endpoints = [];
  const routePattern = /app\.(get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]/gi;
  
  let match;
  while ((match = routePattern.exec(content)) !== null) {
    endpoints.push({ method: match[1].toUpperCase(), path: match[2] });
  }
  
  // Group by prefix
  const byPrefix = {};
  endpoints.forEach(ep => {
    const prefix = ep.path.split('/').slice(0, 3).join('/');
    if (!byPrefix[prefix]) byPrefix[prefix] = [];
    byPrefix[prefix].push(ep.method);
  });
  
  return {
    totalEndpoints: endpoints.length,
    byPrefix: Object.entries(byPrefix).map(([prefix, methods]) => ({
      prefix,
      methods: [...new Set(methods)],
      count: methods.length,
    })),
    sample: endpoints.slice(0, 10),
  };
}

function summarizeTranslations(content) {
  try {
    const data = JSON.parse(content);
    const languages = Object.keys(data);
    
    const stats = {};
    languages.forEach(lang => {
      const keys = Object.keys(data[lang] || {});
      stats[lang] = {
        totalKeys: keys.length,
        sampleKeys: keys.slice(0, 5),
      };
    });
    
    // Find missing translations
    const allKeys = new Set();
    languages.forEach(lang => {
      Object.keys(data[lang] || {}).forEach(k => allKeys.add(k));
    });
    
    const coverage = {};
    languages.forEach(lang => {
      const langKeys = Object.keys(data[lang] || {});
      coverage[lang] = `${langKeys.length}/${allKeys.size}`;
    });
    
    return {
      languages,
      totalUniqueKeys: allKeys.size,
      coverage,
      stats,
    };
  } catch (e) {
    return { error: e.message };
  }
}

function summarizeSeasons(content) {
  try {
    const data = JSON.parse(content);
    const seasons = data.seasons || [];
    
    return {
      version: data.version,
      currentSeason: data.currentSeason,
      totalSeasons: seasons.length,
      seasons: seasons.map(s => ({
        id: s.id,
        name: s.name,
        cardCount: s.cardCount,
        status: s.status,
        pullable: s.pullable,
      })),
    };
  } catch (e) {
    return { error: e.message };
  }
}

function summarizeModule(content) {
  const moduleName = content.match(/window\.(NW_\w+)\s*=/);
  const versionMatch = content.match(/version:\s*['"]([^'"]+)['"]/i);
  
  // Extract public methods
  const methods = [];
  const methodPattern = /(\w+)\s*:\s*(?:function|async function|\([^)]*\)\s*=>)/g;
  let match;
  while ((match = methodPattern.exec(content)) !== null) {
    if (methods.length < 20 && !match[1].startsWith('_')) {
      methods.push(match[1]);
    }
  }
  
  // Extract event listeners
  const events = [];
  const eventPattern = /['"]nw-([^'"]+)['"]/g;
  while ((match = eventPattern.exec(content)) !== null) {
    if (!events.includes(match[1])) events.push(match[1]);
  }
  
  return {
    module: moduleName ? moduleName[1] : 'unknown',
    version: versionMatch ? versionMatch[1] : null,
    publicMethods: methods,
    events: events.slice(0, 10),
    lines: content.split('\n').length,
    size: formatBytes(content.length),
  };
}

function summarizeFile(filePath, type, label = '') {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) return null;
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const originalTokens = estimateTokens(content);
  
  let summary;
  switch (type) {
    case 'cards':
      summary = summarizeCards(content, label);
      break;
    case 'config':
      summary = summarizeConfig(content);
      break;
    case 'api':
      summary = summarizeAPI(content);
      break;
    case 'translations':
      summary = summarizeTranslations(content);
      break;
    case 'seasons':
      summary = summarizeSeasons(content);
      break;
    case 'module':
      summary = summarizeModule(content);
      break;
    default:
      summary = { lines: content.split('\n').length };
  }
  
  const summaryText = JSON.stringify(summary, null, 2);
  const summaryTokens = estimateTokens(summaryText);
  
  return {
    file: filePath,
    type,
    label,
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
      
      // Sort by name
      index[dir].sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      index[dir] = [{ error: e.message }];
    }
  });
  
  return index;
}

// ============================================================
// HTML Pages Scanner
// ============================================================

function scanHTMLPages() {
  const pagesDir = path.join(ROOT, 'public');
  const pages = [];
  
  try {
    const files = fs.readdirSync(pagesDir);
    files.forEach(file => {
      if (!file.endsWith('.html')) return;
      
      const filePath = path.join(pagesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract title
      const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
      
      // Check for key features
      const features = [];
      if (content.includes('nw-wallet')) features.push('wallet');
      if (content.includes('nw-forge')) features.push('gacha');
      if (content.includes('nw-battle')) features.push('battle');
      if (content.includes('data-i18n')) features.push('i18n');
      if (content.includes('nw-nav')) features.push('nav');
      
      pages.push({
        file,
        title: titleMatch ? titleMatch[1].replace('NumbahWan TCG | ', '') : file,
        features,
        size: formatBytes(content.length),
      });
    });
  } catch (e) {
    return [{ error: e.message }];
  }
  
  return pages;
}

// ============================================================
// Main Optimization
// ============================================================

function runOptimization(options = {}) {
  console.log('\n🔄 NumbahWan RAG Optimizer v2.0\n');
  
  // Create cache directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const results = {
    timestamp: new Date().toISOString(),
    version: '2.0',
    summaries: [],
    fileIndex: null,
    pages: null,
    stats: {
      totalOriginalTokens: 0,
      totalOptimizedTokens: 0,
      filesProcessed: 0,
    },
  };
  
  // Generate summaries
  console.log('📝 Generating summaries...');
  CONFIG.summarizeFiles.forEach(({ path: filePath, type, label }) => {
    const summary = summarizeFile(filePath, type, label);
    if (summary) {
      results.summaries.push(summary);
      results.stats.totalOriginalTokens += summary.originalTokens;
      results.stats.totalOptimizedTokens += summary.summaryTokens;
      results.stats.filesProcessed++;
      const displayName = label || path.basename(filePath);
      console.log(`   ✓ ${displayName}: ${summary.savings}% smaller (${summary.originalTokens} → ${summary.summaryTokens} tokens)`);
    }
  });
  
  // Generate file index
  if (!options.quick) {
    console.log('\n📁 Building file index...');
    results.fileIndex = generateFileIndex();
    
    let totalFiles = 0;
    Object.values(results.fileIndex).forEach(files => {
      totalFiles += Array.isArray(files) ? files.length : 0;
    });
    console.log(`   ✓ Indexed ${totalFiles} files across ${Object.keys(results.fileIndex).length} directories`);
    
    // Scan HTML pages
    console.log('\n📄 Scanning HTML pages...');
    results.pages = scanHTMLPages();
    console.log(`   ✓ Found ${results.pages.length} pages`);
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
  
  if (results.pages) {
    const pagesPath = path.join(OUTPUT_DIR, 'pages.json');
    fs.writeFileSync(pagesPath, JSON.stringify(results.pages, null, 2));
  }
  
  // Write combined context
  const contextPath = path.join(OUTPUT_DIR, 'optimized-context.json');
  fs.writeFileSync(contextPath, JSON.stringify(results, null, 2));
  
  // Generate quick-reference markdown
  generateQuickReference(results);
  
  // Print stats
  console.log('\n' + '═'.repeat(60));
  console.log('📊 OPTIMIZATION RESULTS');
  console.log('═'.repeat(60));
  console.log(`   Files processed:  ${results.stats.filesProcessed}`);
  console.log(`   Original tokens:  ${results.stats.totalOriginalTokens.toLocaleString()}`);
  console.log(`   Optimized tokens: ${results.stats.totalOptimizedTokens.toLocaleString()}`);
  console.log(`   Token savings:    ${savingsPercent}%`);
  console.log(`   Cache location:   ${OUTPUT_DIR}`);
  console.log('═'.repeat(60));
  
  // Cost estimation (assuming $0.01 per 1K tokens for input)
  const costSavings = ((results.stats.totalOriginalTokens - results.stats.totalOptimizedTokens) / 1000) * 0.01;
  console.log(`\n💰 Estimated cost savings per query: $${costSavings.toFixed(4)}`);
  console.log(`   (Based on ~$0.01/1K input tokens)\n`);
  
  return results;
}

function generateQuickReference(results) {
  const refPath = path.join(OUTPUT_DIR, 'quick-reference.md');
  
  let md = `# NumbahWan TCG - Quick Reference (Auto-Generated)
> Generated: ${results.timestamp}

## Card Data Summary

| Season | Cards | Art Coverage | Mythics | Legendaries |
|--------|-------|--------------|---------|-------------|
`;

  results.summaries
    .filter(s => s.type === 'cards')
    .forEach(s => {
      const mythic = s.summary.byRarity?.find(r => r.rarity === 'mythic');
      const legendary = s.summary.byRarity?.find(r => r.rarity === 'legendary');
      md += `| ${s.label || s.file} | ${s.summary.totalCards} | ${s.summary.artCoverage} | ${mythic?.count || 0} | ${legendary?.count || 0} |\n`;
    });

  md += `
## API Endpoints

`;

  const apiSummary = results.summaries.find(s => s.type === 'api');
  if (apiSummary?.summary.byPrefix) {
    apiSummary.summary.byPrefix.forEach(p => {
      md += `- \`${p.prefix}\` (${p.methods.join(', ')}) - ${p.count} endpoints\n`;
    });
  }

  md += `
## Module Quick Reference

| Module | Methods | Events |
|--------|---------|--------|
`;

  results.summaries
    .filter(s => s.type === 'module')
    .forEach(s => {
      const methods = s.summary.publicMethods?.slice(0, 5).join(', ') || '-';
      const events = s.summary.events?.slice(0, 3).join(', ') || '-';
      md += `| ${s.summary.module} | ${methods}... | ${events} |\n`;
    });

  fs.writeFileSync(refPath, md);
}

function showStats() {
  const contextPath = path.join(OUTPUT_DIR, 'optimized-context.json');
  
  if (!fs.existsSync(contextPath)) {
    console.log('❌ No optimization cache found. Run without --stats first.');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
  
  console.log('\n📊 Current RAG Optimization Stats\n');
  console.log(`Version: ${data.version || '1.0'}`);
  console.log(`Last updated: ${data.timestamp}`);
  console.log(`Files summarized: ${data.summaries.length}`);
  
  if (data.fileIndex) {
    let totalFiles = 0;
    Object.values(data.fileIndex).forEach(files => {
      totalFiles += Array.isArray(files) ? files.length : 0;
    });
    console.log(`Files indexed: ${totalFiles}`);
  }
  
  if (data.pages) {
    console.log(`HTML pages: ${data.pages.length}`);
  }
  
  console.log(`\nOriginal tokens:  ${data.stats.totalOriginalTokens.toLocaleString()}`);
  console.log(`Optimized tokens: ${data.stats.totalOptimizedTokens.toLocaleString()}`);
  
  const savings = Math.round(
    (1 - data.stats.totalOptimizedTokens / data.stats.totalOriginalTokens) * 100
  );
  console.log(`Savings: ${savings}%\n`);
  
  // Show breakdown by type
  console.log('By file type:');
  const byType = {};
  data.summaries.forEach(s => {
    if (!byType[s.type]) byType[s.type] = { count: 0, saved: 0 };
    byType[s.type].count++;
    byType[s.type].saved += s.originalTokens - s.summaryTokens;
  });
  
  Object.entries(byType).forEach(([type, info]) => {
    console.log(`  ${type}: ${info.count} files, ${info.saved.toLocaleString()} tokens saved`);
  });
  console.log('');
}

// ============================================================
// CLI
// ============================================================

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
NumbahWan RAG Optimizer v2.0 - Reduce AI token costs

Usage:
  node rag-optimizer.cjs           Full optimization
  node rag-optimizer.cjs --quick   Quick update (summaries only)
  node rag-optimizer.cjs --stats   Show current stats
  node rag-optimizer.cjs --help    Show this help

Output:
  .ai-cache/summaries.json         File summaries
  .ai-cache/file-index.json        Directory index
  .ai-cache/pages.json             HTML pages summary
  .ai-cache/quick-reference.md     Markdown quick reference
  .ai-cache/optimized-context.json Combined context

Summarizes:
  - All card data (seasons 1-10)
  - API endpoints
  - Translations (EN/中文/ไทย)
  - Core modules (wallet, economy, forge, currency)
  - HTML pages
`);
} else if (args.includes('--stats')) {
  showStats();
} else {
  runOptimization({ quick: args.includes('--quick') });
}
