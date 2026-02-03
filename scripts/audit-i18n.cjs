#!/usr/bin/env node
/**
 * NWG i18n Audit Script
 * Scans all HTML files for data-i18n keys and reports missing translations
 * 
 * Usage: node scripts/audit-i18n.js
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const RESULTS = {
    totalKeys: new Set(),
    keysByPage: {},
    pagesWithI18n: [],
    pagesWithoutTranslations: [],
    duplicateKeys: {},
    keyCategories: {}
};

// Extract all data-i18n keys from HTML content
function extractKeys(html, filename) {
    const keys = [];
    const regex = /data-i18n="([^"]+)"/g;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
        keys.push(match[1]);
        RESULTS.totalKeys.add(match[1]);
    }
    
    return keys;
}

// Check if page has inline translations
function hasInlineTranslations(html) {
    return html.includes('const translations = {') || 
           html.includes('const translations={') ||
           html.includes('translations = {') ||
           html.includes('_I18N = {') ||  // e.g., ACADEMY_I18N, PVP_I18N
           html.includes('I18N = {') ||
           html.includes('const i18n = {') ||  // lowercase i18n (e.g., guide.html)
           html.includes('const i18n={') ||
           html.includes('Translations = {') ||  // e.g., basementTranslations
           html.includes('Translations={') ||
           html.includes('const TRANSLATIONS = {') ||  // UPPERCASE TRANSLATIONS (e.g., my-business.html)
           html.includes('const TRANSLATIONS={') ||
           html.match(/const \w+_I18N\s*=\s*\{/) ||  // Any *_I18N pattern
           html.match(/const \w+Translations\s*=\s*\{/);  // Any *Translations pattern
}

// Categorize keys by prefix
function categorizeKeys() {
    RESULTS.totalKeys.forEach(key => {
        const prefix = key.split('.')[0];
        if (!RESULTS.keyCategories[prefix]) {
            RESULTS.keyCategories[prefix] = [];
        }
        RESULTS.keyCategories[prefix].push(key);
    });
}

// Find duplicate keys across pages
function findDuplicates() {
    const keyPages = {};
    
    Object.entries(RESULTS.keysByPage).forEach(([page, keys]) => {
        keys.forEach(key => {
            if (!keyPages[key]) keyPages[key] = [];
            keyPages[key].push(page);
        });
    });
    
    Object.entries(keyPages).forEach(([key, pages]) => {
        if (pages.length > 1) {
            RESULTS.duplicateKeys[key] = pages;
        }
    });
}

// Main audit function
function audit() {
    console.log('🔍 NWG i18n Audit\n');
    console.log('='.repeat(60));
    
    const htmlFiles = fs.readdirSync(PUBLIC_DIR)
        .filter(f => f.endsWith('.html'));
    
    htmlFiles.forEach(file => {
        const filepath = path.join(PUBLIC_DIR, file);
        const html = fs.readFileSync(filepath, 'utf8');
        const keys = extractKeys(html, file);
        
        if (keys.length > 0) {
            RESULTS.pagesWithI18n.push(file);
            RESULTS.keysByPage[file] = keys;
            
            if (!hasInlineTranslations(html)) {
                RESULTS.pagesWithoutTranslations.push(file);
            }
        }
    });
    
    categorizeKeys();
    findDuplicates();
    
    // Print results
    console.log('\n📊 SUMMARY\n');
    console.log(`Total HTML files: ${htmlFiles.length}`);
    console.log(`Pages with i18n: ${RESULTS.pagesWithI18n.length}`);
    console.log(`Unique i18n keys: ${RESULTS.totalKeys.size}`);
    console.log(`Pages missing translations: ${RESULTS.pagesWithoutTranslations.length}`);
    console.log(`Shared keys (used in 2+ pages): ${Object.keys(RESULTS.duplicateKeys).length}`);
    
    console.log('\n📁 PAGES BY KEY COUNT\n');
    const sortedPages = Object.entries(RESULTS.keysByPage)
        .sort((a, b) => b[1].length - a[1].length);
    
    sortedPages.forEach(([page, keys]) => {
        const hasTranslations = !RESULTS.pagesWithoutTranslations.includes(page);
        const status = hasTranslations ? '✅' : '❌';
        console.log(`${status} ${page.padEnd(35)} ${keys.length} keys`);
    });
    
    console.log('\n🏷️ KEY CATEGORIES\n');
    const sortedCategories = Object.entries(RESULTS.keyCategories)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 20);
    
    sortedCategories.forEach(([prefix, keys]) => {
        console.log(`${prefix.padEnd(20)} ${keys.length} keys`);
    });
    
    console.log('\n⚠️ PAGES NEEDING TRANSLATIONS\n');
    if (RESULTS.pagesWithoutTranslations.length === 0) {
        console.log('All pages have inline translations! 🎉');
    } else {
        RESULTS.pagesWithoutTranslations.forEach(page => {
            const keyCount = RESULTS.keysByPage[page].length;
            console.log(`❌ ${page} (${keyCount} keys need translation)`);
        });
    }
    
    console.log('\n🔗 MOST SHARED KEYS (candidates for common.js)\n');
    const sharedKeys = Object.entries(RESULTS.duplicateKeys)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 15);
    
    sharedKeys.forEach(([key, pages]) => {
        console.log(`"${key}" used in ${pages.length} pages`);
    });
    
    // Generate JSON report
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalFiles: htmlFiles.length,
            pagesWithI18n: RESULTS.pagesWithI18n.length,
            uniqueKeys: RESULTS.totalKeys.size,
            pagesMissingTranslations: RESULTS.pagesWithoutTranslations.length
        },
        pagesWithoutTranslations: RESULTS.pagesWithoutTranslations,
        keyCategories: Object.fromEntries(
            Object.entries(RESULTS.keyCategories).map(([k, v]) => [k, v.length])
        ),
        allKeys: Array.from(RESULTS.totalKeys).sort()
    };
    
    const reportPath = path.join(__dirname, 'i18n-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
    return report;
}

// Run audit
audit();
