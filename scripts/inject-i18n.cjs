#!/usr/bin/env node
/**
 * Bulk i18n Injection Script
 * Adds data-i18n attributes and generates translation objects for pages
 * Cost-effective: one script handles all pages
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Elements that typically contain translatable text
const TRANSLATABLE_SELECTORS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'span', 'label', 'button', 'a',
    'th', 'td', 'li', 'dt', 'dd',
    'title', 'placeholder', 'alt'
];

// Skip these - dynamic content or code
const SKIP_PATTERNS = [
    /^\s*$/,           // Empty
    /^[\d\s\.\,\-\+\$\%\#\@\!\?\:\;]+$/, // Numbers/symbols only
    /^\{\{.*\}\}$/,    // Template vars
    /^https?:\/\//,    // URLs
    /^[a-zA-Z0-9_\-\.]+\.(js|css|html|png|jpg|svg|webp)$/, // Files
    /^#[a-fA-F0-9]{3,8}$/, // Hex colors
    /^\d+(\.\d+)?(px|em|rem|vh|vw|%)$/, // CSS units
];

function shouldTranslate(text) {
    if (!text || text.length < 2 || text.length > 500) return false;
    text = text.trim();
    for (const pattern of SKIP_PATTERNS) {
        if (pattern.test(text)) return false;
    }
    // Must have at least one letter
    return /[a-zA-Z\u4e00-\u9fff\u0e00-\u0e7f]/.test(text);
}

function generateKey(pageId, text, index) {
    // Create a readable key from text
    let key = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 4)
        .join('_');
    
    if (!key || key.length < 2) {
        key = `text_${index}`;
    }
    
    return `${pageId}.${key}`;
}

function processPage(filename) {
    const filepath = path.join(PUBLIC_DIR, filename);
    const pageId = filename.replace('.html', '').replace(/-/g, '_');
    
    let html = fs.readFileSync(filepath, 'utf8');
    
    // Check if already has translations
    if (/const\s+(translations|TRANSLATIONS|[a-zA-Z]+Translations)\s*=/.test(html)) {
        console.log(`⏭️  ${filename} - already has translations`);
        return null;
    }
    
    // Check if has data-i18n
    const existingKeys = html.match(/data-i18n="([^"]+)"/g);
    if (existingKeys && existingKeys.length > 5) {
        console.log(`⏭️  ${filename} - already has ${existingKeys.length} i18n keys`);
        return null;
    }
    
    const translations = { en: {}, zh: {}, th: {} };
    let keyIndex = 0;
    let modified = html;
    
    // Process common text patterns
    // Match: >Text content< or >Text content</tag>
    const textPattern = />([^<>]{2,200})</g;
    let match;
    const processedTexts = new Set();
    
    while ((match = textPattern.exec(html)) !== null) {
        const fullMatch = match[0];
        const text = match[1].trim();
        
        if (!shouldTranslate(text)) continue;
        if (processedTexts.has(text)) continue;
        processedTexts.add(text);
        
        // Check if this element already has data-i18n
        const beforeMatch = html.substring(Math.max(0, match.index - 200), match.index);
        if (beforeMatch.includes('data-i18n=')) continue;
        
        const key = generateKey(pageId, text, keyIndex++);
        translations.en[key] = text;
        // Placeholder translations - mark for manual review
        translations.zh[key] = `[待翻譯] ${text}`;
        translations.th[key] = `[รอแปล] ${text}`;
    }
    
    if (Object.keys(translations.en).length === 0) {
        console.log(`⏭️  ${filename} - no translatable text found`);
        return null;
    }
    
    console.log(`✅ ${filename} - found ${Object.keys(translations.en).length} translatable strings`);
    
    return {
        filename,
        pageId,
        translations,
        keyCount: Object.keys(translations.en).length
    };
}

function generateTranslationBlock(data) {
    const { translations } = data;
    
    let block = `
    <script>
        const translations = {
            en: {
${Object.entries(translations.en).map(([k, v]) => `                '${k}': '${v.replace(/'/g, "\\'")}'`).join(',\n')}
            },
            zh: {
${Object.entries(translations.zh).map(([k, v]) => `                '${k}': '${v.replace(/'/g, "\\'")}'`).join(',\n')}
            },
            th: {
${Object.entries(translations.th).map(([k, v]) => `                '${k}': '${v.replace(/'/g, "\\'")}'`).join(',\n')}
            }
        };

        function applyTranslations(lang) {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (translations[lang] && translations[lang][key]) {
                    el.textContent = translations[lang][key];
                }
            });
        }

        document.addEventListener('nw-lang-change', (e) => applyTranslations(e.detail.lang));
        document.addEventListener('DOMContentLoaded', () => {
            applyTranslations(localStorage.getItem('nw_lang') || 'en');
        });
    </script>`;
    
    return block;
}

// Main
const targetFiles = process.argv.slice(2);
const files = targetFiles.length > 0 
    ? targetFiles.map(f => f.endsWith('.html') ? f : `${f}.html`)
    : fs.readdirSync(PUBLIC_DIR).filter(f => f.endsWith('.html'));

console.log(`\n🔍 Scanning ${files.length} HTML files for i18n injection...\n`);

const results = [];
for (const file of files) {
    const result = processPage(file);
    if (result) results.push(result);
}

console.log(`\n📊 Summary: ${results.length} pages need i18n injection`);
console.log(`   Total keys: ${results.reduce((sum, r) => sum + r.keyCount, 0)}`);

if (results.length > 0) {
    // Save report
    const report = {
        timestamp: new Date().toISOString(),
        pages: results.map(r => ({
            filename: r.filename,
            keyCount: r.keyCount,
            keys: Object.keys(r.translations.en)
        }))
    };
    
    fs.writeFileSync(
        path.join(__dirname, 'i18n-injection-report.json'),
        JSON.stringify(report, null, 2)
    );
    console.log(`\n📄 Report saved to scripts/i18n-injection-report.json`);
    
    // Generate translation templates
    console.log(`\n📝 Translation templates for manual review:\n`);
    for (const r of results.slice(0, 3)) {
        console.log(`--- ${r.filename} (${r.keyCount} keys) ---`);
        console.log(JSON.stringify(r.translations.en, null, 2).substring(0, 500) + '...\n');
    }
}
