#!/usr/bin/env node
/**
 * NW UI Validator v1.0
 * Automatic CSS/Layout Overlap Detection for Build Time
 * 
 * Scans HTML files for potential UI overlap issues by analyzing CSS rules.
 * Run: node scripts/ui-validator.js [file.html]
 * Or:  npm run ui:validate
 */

import fs from 'fs';
import path from 'path';

const COLORS = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(color, ...args) {
    console.log(color, ...args, COLORS.reset);
}

// Common UI element patterns and their expected positions
const UI_ZONES = {
    top: { minTop: 0, maxTop: 200 },
    bottom: { minBottom: 0, maxBottom: 250 },
    left: { minLeft: 0, maxLeft: 100 },
    right: { minRight: 0, maxRight: 100 }
};

// Known fixed elements and their expected zones
const KNOWN_ELEMENTS = {
    '.hdr': { zone: 'top', priority: 10 },
    '.season-selector': { zone: 'top', priority: 9 },
    '.name-banner': { zone: 'top', priority: 8 },
    '.nav-wrap': { zone: 'bottom', priority: 8 },
    '.filters': { zone: 'bottom', priority: 7 },
    '.ctr': { zone: 'bottom', priority: 4 },
    '.hint': { zone: 'bottom', priority: 3 },
    '.modal': { zone: 'overlay', priority: 10 },
    '.nw-nav-toggle': { zone: 'corner', priority: 6 },
    '.nw-nav-home': { zone: 'corner', priority: 6 }
};

// Parse CSS value to number (handles px, %, etc)
function parseValue(val) {
    if (!val || val === 'auto') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
}

// Extract CSS rules from style content
function extractCSSRules(cssContent) {
    const rules = {};
    
    // Remove comments
    cssContent = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Match CSS rules (simplified parser)
    const ruleRegex = /([.#][\w-]+(?:\s*,\s*[.#][\w-]+)*)\s*\{([^}]+)\}/g;
    let match;
    
    while ((match = ruleRegex.exec(cssContent)) !== null) {
        const selectors = match[1].split(',').map(s => s.trim());
        const declarations = match[2];
        
        selectors.forEach(sel => {
            if (!rules[sel]) rules[sel] = {};
            
            // Parse each declaration
            const declRegex = /([\w-]+)\s*:\s*([^;]+)/g;
            let declMatch;
            while ((declMatch = declRegex.exec(declarations)) !== null) {
                rules[sel][declMatch[1].trim()] = declMatch[2].trim();
            }
        });
    }
    
    return rules;
}

// Check for potential overlap between two elements
function checkOverlap(sel1, rules1, sel2, rules2) {
    const issues = [];
    
    // Both must be fixed or absolute
    const pos1 = rules1.position;
    const pos2 = rules2.position;
    
    if ((pos1 !== 'fixed' && pos1 !== 'absolute') || 
        (pos2 !== 'fixed' && pos2 !== 'absolute')) {
        return issues;
    }
    
    // Get positions
    const top1 = parseValue(rules1.top);
    const bottom1 = parseValue(rules1.bottom);
    const left1 = parseValue(rules1.left);
    const right1 = parseValue(rules1.right);
    
    const top2 = parseValue(rules2.top);
    const bottom2 = parseValue(rules2.bottom);
    const left2 = parseValue(rules2.left);
    const right2 = parseValue(rules2.right);
    
    // Check vertical overlap risk
    // Both have bottom values close together
    if (bottom1 !== null && bottom2 !== null) {
        const diff = Math.abs(bottom1 - bottom2);
        if (diff < 60) {
            // Check if horizontally centered (both would overlap)
            const centered1 = rules1.left === '50%' || rules1.transform?.includes('translateX(-50%)');
            const centered2 = rules2.left === '50%' || rules2.transform?.includes('translateX(-50%)');
            
            if (centered1 && centered2) {
                issues.push({
                    type: 'vertical_overlap',
                    severity: 'high',
                    message: `${sel1} (bottom: ${bottom1}px) and ${sel2} (bottom: ${bottom2}px) are both centered and may overlap vertically`,
                    suggestion: `Increase gap between bottom values to at least 60px`
                });
            }
        }
    }
    
    // Both have top values close together
    if (top1 !== null && top2 !== null) {
        const diff = Math.abs(top1 - top2);
        if (diff < 40) {
            const centered1 = rules1.left === '50%' || rules1.transform?.includes('translateX(-50%)');
            const centered2 = rules2.left === '50%' || rules2.transform?.includes('translateX(-50%)');
            
            if (centered1 && centered2) {
                issues.push({
                    type: 'vertical_overlap',
                    severity: 'medium',
                    message: `${sel1} (top: ${top1}px) and ${sel2} (top: ${top2}px) may overlap at top`,
                    suggestion: `Ensure sufficient gap between top-positioned elements`
                });
            }
        }
    }
    
    return issues;
}

// Analyze font sizes for readability
function checkFontSizes(rules) {
    const issues = [];
    
    Object.entries(rules).forEach(([sel, props]) => {
        const fontSize = props['font-size'];
        if (fontSize) {
            const size = parseValue(fontSize);
            if (size !== null && size < 12) {
                issues.push({
                    type: 'small_font',
                    severity: 'warning',
                    selector: sel,
                    message: `${sel} has font-size: ${fontSize} which may be too small for mobile`,
                    suggestion: `Consider increasing to at least 14px for better readability`
                });
            }
        }
    });
    
    return issues;
}

// Check for potential z-index conflicts
function checkZIndex(rules) {
    const issues = [];
    const zIndexMap = {};
    
    Object.entries(rules).forEach(([sel, props]) => {
        if (props['z-index'] && (props.position === 'fixed' || props.position === 'absolute')) {
            const z = parseInt(props['z-index']);
            if (!zIndexMap[z]) zIndexMap[z] = [];
            zIndexMap[z].push(sel);
        }
    });
    
    // Check for z-index collisions
    Object.entries(zIndexMap).forEach(([z, selectors]) => {
        if (selectors.length > 1) {
            issues.push({
                type: 'z_index_collision',
                severity: 'info',
                message: `Multiple elements have z-index: ${z}: ${selectors.join(', ')}`,
                suggestion: `Review if these elements should stack differently`
            });
        }
    });
    
    return issues;
}

// Main validation function
function validateFile(filePath) {
    log(COLORS.cyan, `\n${'═'.repeat(60)}`);
    log(COLORS.bold + COLORS.cyan, `📋 UI VALIDATOR - ${path.basename(filePath)}`);
    log(COLORS.cyan, `${'═'.repeat(60)}`);
    
    if (!fs.existsSync(filePath)) {
        log(COLORS.red, `❌ File not found: ${filePath}`);
        return { errors: 1, warnings: 0 };
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract all CSS from <style> tags
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let allCSS = '';
    let match;
    while ((match = styleRegex.exec(content)) !== null) {
        allCSS += match[1] + '\n';
    }
    
    const rules = extractCSSRules(allCSS);
    const allIssues = [];
    
    // Check known fixed elements for overlap
    const knownSelectors = Object.keys(KNOWN_ELEMENTS).filter(sel => rules[sel]);
    
    log(COLORS.blue, `\n🔍 Analyzing ${Object.keys(rules).length} CSS rules...`);
    log(COLORS.blue, `   Found ${knownSelectors.length} known UI elements`);
    
    // Check pairs for overlap
    for (let i = 0; i < knownSelectors.length; i++) {
        for (let j = i + 1; j < knownSelectors.length; j++) {
            const sel1 = knownSelectors[i];
            const sel2 = knownSelectors[j];
            const overlaps = checkOverlap(sel1, rules[sel1], sel2, rules[sel2]);
            allIssues.push(...overlaps);
        }
    }
    
    // Check font sizes
    allIssues.push(...checkFontSizes(rules));
    
    // Check z-index
    allIssues.push(...checkZIndex(rules));
    
    // Report results
    const errors = allIssues.filter(i => i.severity === 'high').length;
    const warnings = allIssues.filter(i => i.severity === 'medium' || i.severity === 'warning').length;
    const info = allIssues.filter(i => i.severity === 'info').length;
    
    if (allIssues.length === 0) {
        log(COLORS.green, `\n✅ No issues detected!`);
    } else {
        log(COLORS.yellow, `\n⚠️  Found ${allIssues.length} potential issues:\n`);
        
        allIssues.forEach((issue, idx) => {
            const icon = issue.severity === 'high' ? '🔴' : 
                         issue.severity === 'medium' ? '🟠' : 
                         issue.severity === 'warning' ? '🟡' : '🔵';
            
            log(COLORS.yellow, `${icon} #${idx + 1}: ${issue.message}`);
            if (issue.suggestion) {
                log(COLORS.cyan, `   💡 ${issue.suggestion}`);
            }
            console.log('');
        });
    }
    
    // Summary
    log(COLORS.cyan, `${'─'.repeat(60)}`);
    log(COLORS.bold, `SUMMARY: ${errors} errors, ${warnings} warnings, ${info} info`);
    
    if (errors > 0) {
        log(COLORS.red, `❌ Validation FAILED - Please fix high-severity issues`);
    } else if (warnings > 0) {
        log(COLORS.yellow, `⚠️  Validation passed with warnings`);
    } else {
        log(COLORS.green, `✅ Validation PASSED`);
    }
    
    return { errors, warnings, info, issues: allIssues };
}

// Validate all HTML files in public/
function validateAll() {
    const publicDir = path.join(process.cwd(), 'public');
    
    if (!fs.existsSync(publicDir)) {
        log(COLORS.red, `❌ public/ directory not found`);
        process.exit(1);
    }
    
    const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));
    let totalErrors = 0;
    let totalWarnings = 0;
    
    htmlFiles.forEach(file => {
        const result = validateFile(path.join(publicDir, file));
        totalErrors += result.errors;
        totalWarnings += result.warnings;
    });
    
    log(COLORS.cyan, `\n${'═'.repeat(60)}`);
    log(COLORS.bold, `TOTAL: ${htmlFiles.length} files, ${totalErrors} errors, ${totalWarnings} warnings`);
    log(COLORS.cyan, `${'═'.repeat(60)}\n`);
    
    return totalErrors === 0;
}

// CLI entry point
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--all') {
    const success = validateAll();
    process.exit(success ? 0 : 1);
} else {
    const result = validateFile(args[0]);
    process.exit(result.errors === 0 ? 0 : 1);
}
