#!/usr/bin/env node
/**
 * Generate i18n translation template for a specific page
 * 
 * Usage: node scripts/generate-i18n-template.cjs <page-name>
 * Example: node scripts/generate-i18n-template.cjs guide
 */

const fs = require('fs');
const path = require('path');

const pageName = process.argv[2];

if (!pageName) {
    console.log('Usage: node scripts/generate-i18n-template.cjs <page-name>');
    console.log('Example: node scripts/generate-i18n-template.cjs guide');
    process.exit(1);
}

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const filePath = path.join(PUBLIC_DIR, `${pageName}.html`);

if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const html = fs.readFileSync(filePath, 'utf8');

// Extract all data-i18n keys and their default text
const keysWithDefaults = [];
const regex = /data-i18n="([^"]+)"[^>]*>([^<]*)/g;
let match;

while ((match = regex.exec(html)) !== null) {
    const key = match[1];
    const defaultText = match[2].trim().substring(0, 100);
    keysWithDefaults.push({ key, defaultText });
}

// Remove duplicates
const uniqueKeys = [...new Map(keysWithDefaults.map(item => [item.key, item])).values()];

// Generate the template
const constantName = pageName.toUpperCase().replace(/-/g, '_') + '_I18N';

let template = `
// ========================================
// ${pageName.toUpperCase()} TRANSLATIONS
// Add this to public/${pageName}.html before </body>
// ========================================
const ${constantName} = {
    en: {
`;

uniqueKeys.forEach(({ key, defaultText }) => {
    const comment = defaultText ? ` // ${defaultText}` : '';
    template += `        '${key}': '${defaultText.replace(/'/g, "\\'")}',${comment.length > 60 ? '' : comment}\n`;
});

template += `    },
    zh: {
`;

uniqueKeys.forEach(({ key }) => {
    template += `        '${key}': '', // TODO: Add Chinese translation\n`;
});

template += `    },
    th: {
`;

uniqueKeys.forEach(({ key }) => {
    template += `        '${key}': '', // TODO: Add Thai translation\n`;
});

template += `    }
};

// Apply translations
function apply${pageName.charAt(0).toUpperCase() + pageName.slice(1).replace(/-./g, x => x[1].toUpperCase())}I18n() {
    const lang = localStorage.getItem('lang') || localStorage.getItem('nw_lang') || 'en';
    const t = ${constantName}[lang] || ${constantName}.en;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key]) {
            el.innerHTML = t[key];
        }
    });
}

// Listen for language changes
window.addEventListener('nw-lang-change', (e) => {
    apply${pageName.charAt(0).toUpperCase() + pageName.slice(1).replace(/-./g, x => x[1].toUpperCase())}I18n();
});

// Apply on load
document.addEventListener('DOMContentLoaded', apply${pageName.charAt(0).toUpperCase() + pageName.slice(1).replace(/-./g, x => x[1].toUpperCase())}I18n);
`;

console.log('// ===========================================');
console.log(`// i18n TEMPLATE FOR: ${pageName}.html`);
console.log(`// Total keys: ${uniqueKeys.length}`);
console.log('// ===========================================');
console.log(template);

// Save to file
const outputPath = path.join(__dirname, `i18n-template-${pageName}.js`);
fs.writeFileSync(outputPath, template);
console.log(`\n📄 Template saved to: ${outputPath}`);
