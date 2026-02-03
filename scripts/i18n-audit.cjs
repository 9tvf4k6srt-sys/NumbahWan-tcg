#!/usr/bin/env node
/**
 * NWG i18n Audit & Auto-Translate Script
 * 
 * Usage:
 *   node scripts/i18n-audit.js           # Audit all pages
 *   node scripts/i18n-audit.js --fix     # Add i18n to missing pages
 *   node scripts/i18n-audit.js --report  # Generate detailed report
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../public');
const I18N_JSON = path.join(PUBLIC_DIR, 'static/i18n.json');

// Core translations that should exist
const CORE_KEYS = [
  'home', 'about', 'back', 'loading', 'error', 'success', 
  'submit', 'cancel', 'close', 'yes', 'no'
];

// Languages we support
const LANGUAGES = ['en', 'zh', 'th'];

// Pages that don't need i18n (utility/demo pages)
const SKIP_PAGES = [
  'battle-legacy.html',
  'menu-demo.html'
];

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getHtmlFiles() {
  return fs.readdirSync(PUBLIC_DIR)
    .filter(f => f.endsWith('.html'))
    .filter(f => !SKIP_PAGES.includes(f));
}

function checkI18nInFile(filename) {
  const filepath = path.join(PUBLIC_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  
  return {
    filename,
    hasI18nScript: content.includes('i18n.js'),
    hasDataI18n: content.includes('data-i18n'),
    hasInitI18n: content.includes('initI18n'),
    hasLangSwitcher: content.includes('lang-switcher') || content.includes('toggleLangMenu'),
    hardcodedStrings: extractHardcodedStrings(content),
    size: content.length
  };
}

function extractHardcodedStrings(content) {
  // Find potentially translatable strings (button text, headings, etc.)
  const patterns = [
    /<h1[^>]*>([^<]+)<\/h1>/gi,
    /<h2[^>]*>([^<]+)<\/h2>/gi,
    /<h3[^>]*>([^<]+)<\/h3>/gi,
    /<button[^>]*>([^<]+)<\/button>/gi,
    /<a[^>]*>([^<]+)<\/a>/gi,
    /placeholder="([^"]+)"/gi,
    /title="([^"]+)"/gi
  ];
  
  const strings = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const text = match[1].trim();
      // Filter out non-translatable content
      if (text && 
          text.length > 2 && 
          text.length < 100 &&
          !/^[\d\s\.\,\-\+\=\:\;\!\?\@\#\$\%\^\&\*\(\)]+$/.test(text) &&
          !text.startsWith('http') &&
          !text.startsWith('/') &&
          !text.includes('{{') &&
          !text.includes('data-') &&
          !/^[a-f0-9\-]{36}$/i.test(text)) { // UUID
        strings.push(text);
      }
    }
  }
  
  return [...new Set(strings)].slice(0, 20); // Unique, max 20
}

function auditAll() {
  const files = getHtmlFiles();
  const results = {
    total: files.length,
    withI18n: [],
    withoutI18n: [],
    partial: []
  };
  
  for (const file of files) {
    const check = checkI18nInFile(file);
    
    if (check.hasI18nScript && check.hasDataI18n && check.hasInitI18n) {
      results.withI18n.push(check);
    } else if (check.hasI18nScript || check.hasDataI18n) {
      results.partial.push(check);
    } else {
      results.withoutI18n.push(check);
    }
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// I18N TEMPLATE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function generateI18nTemplate(pageName) {
  // Convert filename to key (battle.html -> battle)
  const key = pageName.replace('.html', '').replace(/-/g, '_');
  const titleKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
  
  return {
    pageKey: key,
    translations: {
      en: {
        pageTitle: titleKey,
        pageSubtitle: `Welcome to ${titleKey}`,
        back: 'Back'
      },
      zh: {
        pageTitle: titleKey, // Will need manual translation
        pageSubtitle: `歡迎來到 ${titleKey}`,
        back: '返回'
      },
      th: {
        pageTitle: titleKey, // Will need manual translation
        pageSubtitle: `ยินดีต้อนรับสู่ ${titleKey}`,
        back: 'กลับ'
      }
    }
  };
}

function generateI18nScriptBlock(pageKey, translations) {
  return `
<!-- i18n Script -->
<script src="/static/i18n.js"></script>
<script>
  // Page-specific translations
  const ${pageKey}Translations = ${JSON.stringify(translations, null, 2)};
  
  // Initialize i18n
  document.addEventListener('DOMContentLoaded', () => {
    initI18n(${pageKey}Translations);
  });
</script>
`;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-FIX FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function addI18nToPage(filename) {
  const filepath = path.join(PUBLIC_DIR, filename);
  let content = fs.readFileSync(filepath, 'utf-8');
  
  // Skip if already has i18n
  if (content.includes('i18n.js') && content.includes('initI18n')) {
    return { status: 'skipped', reason: 'already has i18n' };
  }
  
  const template = generateI18nTemplate(filename);
  const scriptBlock = generateI18nScriptBlock(template.pageKey, template.translations);
  
  // Insert before </body>
  if (content.includes('</body>')) {
    content = content.replace('</body>', `${scriptBlock}\n</body>`);
    fs.writeFileSync(filepath, content);
    return { status: 'added', pageKey: template.pageKey };
  }
  
  return { status: 'failed', reason: 'no </body> tag found' };
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

function generateReport(results) {
  const report = [];
  
  report.push('# NWG i18n Audit Report');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('');
  
  report.push('## Summary');
  report.push(`- Total pages: ${results.total}`);
  report.push(`- With i18n: ${results.withI18n.length} (${Math.round(results.withI18n.length/results.total*100)}%)`);
  report.push(`- Without i18n: ${results.withoutI18n.length}`);
  report.push(`- Partial i18n: ${results.partial.length}`);
  report.push('');
  
  report.push('## Pages WITHOUT i18n');
  for (const page of results.withoutI18n) {
    report.push(`- [ ] ${page.filename}`);
    if (page.hardcodedStrings.length > 0) {
      report.push(`  - Hardcoded strings found: ${page.hardcodedStrings.slice(0, 5).join(', ')}`);
    }
  }
  report.push('');
  
  report.push('## Pages with PARTIAL i18n');
  for (const page of results.partial) {
    report.push(`- [ ] ${page.filename}`);
    report.push(`  - Has script: ${page.hasI18nScript ? '✓' : '✗'}`);
    report.push(`  - Has data-i18n: ${page.hasDataI18n ? '✓' : '✗'}`);
    report.push(`  - Has initI18n: ${page.hasInitI18n ? '✓' : '✗'}`);
  }
  report.push('');
  
  report.push('## Pages with FULL i18n');
  for (const page of results.withI18n) {
    report.push(`- [x] ${page.filename}`);
  }
  
  return report.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const results = auditAll();

if (args.includes('--fix')) {
  console.log('🔧 Adding i18n to missing pages...\n');
  
  for (const page of results.withoutI18n) {
    const result = addI18nToPage(page.filename);
    console.log(`${result.status === 'added' ? '✅' : '⏭️'} ${page.filename}: ${result.status}`);
  }
  
  console.log('\n✨ Done! Please review the added translations and update zh/th manually.');
  
} else if (args.includes('--report')) {
  const report = generateReport(results);
  const reportPath = path.join(__dirname, '../docs/I18N_AUDIT_REPORT.md');
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Report saved to: ${reportPath}`);
  console.log(report);
  
} else {
  // Default: show summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('          NWG i18n AUDIT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📊 Total pages: ${results.total}`);
  console.log(`✅ With i18n: ${results.withI18n.length} (${Math.round(results.withI18n.length/results.total*100)}%)`);
  console.log(`❌ Without i18n: ${results.withoutI18n.length}`);
  console.log(`⚠️  Partial i18n: ${results.partial.length}`);
  console.log('');
  console.log('Pages needing i18n:');
  results.withoutI18n.forEach(p => console.log(`  - ${p.filename}`));
  console.log('');
  console.log('Run with --fix to auto-add i18n scaffolding');
  console.log('Run with --report to generate detailed report');
}
