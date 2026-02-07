/**
 * NW_DEEPDIVE_GUARDIAN v1.0
 * ============================================================================
 * Automated i18n issue detection system for NumbahWan TCG
 * 
 * FEATURES:
 * - Scans all HTML files for i18n issues
 * - Detects missing translations
 * - Finds hardcoded text that should be translated
 * - Validates data-i18n attribute usage
 * - Checks translation completeness across EN/ZH/TH
 * - Generates actionable reports
 * 
 * USAGE:
 *   node scripts/nw-deepdive-guardian.cjs [--fix] [--watch]
 * 
 * OPTIONS:
 *   --fix    Attempt to auto-fix simple issues
 *   --watch  Watch for file changes and re-scan
 *   --json   Output results as JSON
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    publicDir: path.join(__dirname, '../public'),
    staticDir: path.join(__dirname, '../public/static'),
    srcDir: path.join(__dirname, '../src'),
    
    // Supported languages
    languages: ['en', 'zh', 'th'],
    
    // Patterns to detect hardcoded text
    hardcodedPatterns: [
        // Common English phrases that should be translated
        />\s*(Click here|Learn more|Read more|Back|Close|Submit|Cancel|Loading|Error)\s*</gi,
        />\s*(Home|About|Contact|Members|Gallery|Shop|Cart|Profile)\s*</gi,
        />\s*(Sign in|Sign out|Login|Logout|Register|Subscribe)\s*</gi,
        
        // Warning/Error messages
        />\s*(Warning|Error|Success|Info|Notice|Alert)[:\s]/gi,
        
        // Dates and times (excluding those in data attributes)
        />\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*</gi,
        />\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*</gi,
    ],
    
    // Elements to check for i18n
    elementsToCheck: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'span', 'div', 'a', 'button', 'label',
        'th', 'td', 'li', 'dt', 'dd'
    ],
    
    // Attributes that might contain translatable text
    translatableAttributes: [
        'title', 'alt', 'placeholder', 'aria-label'
    ],
    
    // Files to ignore
    ignorePatterns: [
        /node_modules/,
        /\.min\./,
        /vendor/,
        /dist/,
        /\.json$/
    ]
};

// Issue types
const ISSUE_TYPES = {
    MISSING_I18N_ATTRIBUTE: 'missing-i18n-attr',
    HARDCODED_TEXT: 'hardcoded-text',
    MISSING_TRANSLATION: 'missing-translation',
    INCONSISTENT_KEYS: 'inconsistent-keys',
    EMPTY_TRANSLATION: 'empty-translation',
    ATTRIBUTE_NOT_TRANSLATED: 'attribute-not-translated'
};

// ANSI colors for console output
const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

class DeepDiveGuardian {
    constructor() {
        this.issues = [];
        this.scannedFiles = 0;
        this.translationKeys = new Map(); // key -> { file, languages }
    }
    
    // Main scan function
    async scan() {
        console.log(`${COLORS.cyan}${COLORS.bold}`);
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║           NW_DEEPDIVE_GUARDIAN v1.0                           ║');
        console.log('║           Automated i18n Issue Detection                      ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log(COLORS.reset);
        
        const startTime = Date.now();
        
        // Scan HTML files
        await this.scanDirectory(CONFIG.publicDir, '.html');
        
        // Scan JS files for translation definitions
        await this.scanDirectory(CONFIG.staticDir, '.js');
        
        // Check translation completeness
        this.checkTranslationCompleteness();
        
        const duration = Date.now() - startTime;
        
        this.generateReport(duration);
        
        return this.issues;
    }
    
    // Scan a directory recursively
    async scanDirectory(dir, extension) {
        if (!fs.existsSync(dir)) return;
        
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                await this.scanDirectory(filePath, extension);
            } else if (file.endsWith(extension)) {
                // Check ignore patterns
                const shouldIgnore = CONFIG.ignorePatterns.some(pattern => pattern.test(filePath));
                if (!shouldIgnore) {
                    await this.scanFile(filePath);
                }
            }
        }
    }
    
    // Scan a single file
    async scanFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(CONFIG.publicDir, filePath);
        
        this.scannedFiles++;
        
        if (filePath.endsWith('.html')) {
            this.scanHtmlFile(content, relativePath);
        } else if (filePath.endsWith('.js')) {
            this.scanJsFile(content, relativePath);
        }
    }
    
    // Scan HTML file for i18n issues
    scanHtmlFile(content, filePath) {
        const lines = content.split('\n');
        
        lines.forEach((line, lineNum) => {
            // Check for elements with text but no data-i18n
            this.checkMissingI18nAttribute(line, lineNum + 1, filePath);
            
            // Check for hardcoded text patterns
            this.checkHardcodedText(line, lineNum + 1, filePath);
            
            // Check for translatable attributes without i18n
            this.checkTranslatableAttributes(line, lineNum + 1, filePath);
            
            // Extract data-i18n keys
            this.extractI18nKeys(line, filePath);
        });
    }
    
    // Scan JS file for translation definitions
    scanJsFile(content, filePath) {
        // Look for translation objects
        const translationObjectRegex = /(?:translations|uiTranslations|i18n)\s*[=:]\s*\{/gi;
        
        if (translationObjectRegex.test(content)) {
            this.extractTranslationDefinitions(content, filePath);
        }
    }
    
    // Check for missing data-i18n attributes
    checkMissingI18nAttribute(line, lineNum, filePath) {
        // Skip lines that already have data-i18n
        if (line.includes('data-i18n')) return;
        
        // Skip script tags, style tags, comments
        if (/<script|<style|<!--|-->/i.test(line)) return;
        
        // Check for elements with visible text content
        CONFIG.elementsToCheck.forEach(tag => {
            const regex = new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`, 'gi');
            let match;
            
            while ((match = regex.exec(line)) !== null) {
                const textContent = match[1].trim();
                
                // Skip if mostly whitespace, numbers, or symbols
                if (textContent.length < 2) return;
                if (/^[\d\s\.,\-:\/\$\%\#\@]+$/.test(textContent)) return;
                
                // Skip if it looks like code or a variable
                if (/^\{|\}$|^\$\{/.test(textContent)) return;
                
                // Check if it contains actual words
                if (/[a-zA-Z\u4e00-\u9fff\u0e00-\u0e7f]{2,}/.test(textContent)) {
                    this.addIssue({
                        type: ISSUE_TYPES.MISSING_I18N_ATTRIBUTE,
                        file: filePath,
                        line: lineNum,
                        element: tag,
                        text: textContent.substring(0, 50),
                        severity: 'warning',
                        suggestion: `Add data-i18n attribute to <${tag}> element`
                    });
                }
            }
        });
    }
    
    // Check for hardcoded text patterns
    checkHardcodedText(line, lineNum, filePath) {
        CONFIG.hardcodedPatterns.forEach(pattern => {
            if (pattern.test(line) && !line.includes('data-i18n')) {
                const match = line.match(pattern);
                if (match) {
                    this.addIssue({
                        type: ISSUE_TYPES.HARDCODED_TEXT,
                        file: filePath,
                        line: lineNum,
                        text: match[0].substring(0, 50),
                        severity: 'warning',
                        suggestion: 'Consider using data-i18n for translatable text'
                    });
                }
            }
        });
    }
    
    // Check for translatable attributes
    checkTranslatableAttributes(line, lineNum, filePath) {
        CONFIG.translatableAttributes.forEach(attr => {
            const regex = new RegExp(`${attr}="([^"]+)"`, 'gi');
            let match;
            
            while ((match = regex.exec(line)) !== null) {
                const value = match[1];
                
                // Skip if it's a URL, path, or technical value
                if (/^(\/|http|#|\{|data:|javascript:)/i.test(value)) continue;
                
                // Check if it contains translatable text
                if (/[a-zA-Z\u4e00-\u9fff\u0e00-\u0e7f]{3,}/.test(value)) {
                    // Check if there's a corresponding data-i18n-* attribute
                    const i18nAttr = `data-i18n-${attr}`;
                    if (!line.includes(i18nAttr)) {
                        this.addIssue({
                            type: ISSUE_TYPES.ATTRIBUTE_NOT_TRANSLATED,
                            file: filePath,
                            line: lineNum,
                            attribute: attr,
                            value: value.substring(0, 30),
                            severity: 'info',
                            suggestion: `Consider adding ${i18nAttr} attribute`
                        });
                    }
                }
            }
        });
    }
    
    // Extract data-i18n keys from HTML
    extractI18nKeys(line, filePath) {
        const regex = /data-i18n(?:-\w+)?="([^"]+)"/g;
        let match;
        
        while ((match = regex.exec(line)) !== null) {
            const key = match[1];
            
            if (!this.translationKeys.has(key)) {
                this.translationKeys.set(key, { files: new Set(), languages: new Set() });
            }
            
            this.translationKeys.get(key).files.add(filePath);
        }
    }
    
    // Extract translation definitions from JS
    extractTranslationDefinitions(content, filePath) {
        // Find language blocks (en:, zh:, th:)
        CONFIG.languages.forEach(lang => {
            const langBlockRegex = new RegExp(`${lang}\\s*:\\s*\\{([^}]+(?:\\{[^}]*\\}[^}]*)*)\\}`, 'gi');
            let langMatch;
            
            while ((langMatch = langBlockRegex.exec(content)) !== null) {
                const langBlock = langMatch[1];
                
                // Extract keys from the language block
                const keyRegex = /(\w+)\s*:/g;
                let keyMatch;
                
                while ((keyMatch = keyRegex.exec(langBlock)) !== null) {
                    const key = keyMatch[1];
                    
                    if (!this.translationKeys.has(key)) {
                        this.translationKeys.set(key, { files: new Set(), languages: new Set() });
                    }
                    
                    this.translationKeys.get(key).languages.add(lang);
                    this.translationKeys.get(key).files.add(filePath);
                }
            }
        });
    }
    
    // Check translation completeness
    checkTranslationCompleteness() {
        this.translationKeys.forEach((data, key) => {
            const missingLangs = CONFIG.languages.filter(lang => !data.languages.has(lang));
            
            if (missingLangs.length > 0 && data.languages.size > 0) {
                this.addIssue({
                    type: ISSUE_TYPES.MISSING_TRANSLATION,
                    key: key,
                    files: Array.from(data.files),
                    presentLanguages: Array.from(data.languages),
                    missingLanguages: missingLangs,
                    severity: 'error',
                    suggestion: `Add translations for: ${missingLangs.join(', ')}`
                });
            }
        });
    }
    
    // Add an issue to the list
    addIssue(issue) {
        // Avoid duplicates
        const isDuplicate = this.issues.some(existing => 
            existing.type === issue.type &&
            existing.file === issue.file &&
            existing.line === issue.line &&
            existing.text === issue.text
        );
        
        if (!isDuplicate) {
            this.issues.push(issue);
        }
    }
    
    // Generate the final report
    generateReport(duration) {
        console.log('\n' + COLORS.bold + '📊 SCAN RESULTS' + COLORS.reset);
        console.log('═'.repeat(60));
        
        // Summary stats
        console.log(`\n${COLORS.cyan}Files scanned:${COLORS.reset} ${this.scannedFiles}`);
        console.log(`${COLORS.cyan}Translation keys found:${COLORS.reset} ${this.translationKeys.size}`);
        console.log(`${COLORS.cyan}Scan duration:${COLORS.reset} ${duration}ms`);
        
        // Count issues by type
        const issueCounts = {};
        this.issues.forEach(issue => {
            issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
        });
        
        // Issue summary
        console.log(`\n${COLORS.bold}Issues Found: ${this.issues.length}${COLORS.reset}`);
        
        if (this.issues.length === 0) {
            console.log(`\n${COLORS.green}✓ No issues detected! Your i18n is looking good.${COLORS.reset}`);
            return;
        }
        
        Object.entries(issueCounts).forEach(([type, count]) => {
            const color = type.includes('error') ? COLORS.red : 
                         type.includes('warning') ? COLORS.yellow : COLORS.blue;
            console.log(`  ${color}● ${type}:${COLORS.reset} ${count}`);
        });
        
        // Group issues by file
        const issuesByFile = {};
        this.issues.forEach(issue => {
            const file = issue.file || 'Unknown';
            if (!issuesByFile[file]) issuesByFile[file] = [];
            issuesByFile[file].push(issue);
        });
        
        // Detailed issues
        console.log(`\n${COLORS.bold}Detailed Issues:${COLORS.reset}`);
        console.log('─'.repeat(60));
        
        Object.entries(issuesByFile).forEach(([file, issues]) => {
            console.log(`\n${COLORS.cyan}📄 ${file}${COLORS.reset}`);
            
            issues.forEach(issue => {
                const severityColor = issue.severity === 'error' ? COLORS.red :
                                     issue.severity === 'warning' ? COLORS.yellow : COLORS.blue;
                
                let message = `  ${severityColor}[${issue.type}]${COLORS.reset}`;
                
                if (issue.line) message += ` Line ${issue.line}:`;
                if (issue.text) message += ` "${issue.text}"`;
                if (issue.key) message += ` Key: "${issue.key}"`;
                if (issue.missingLanguages) message += ` Missing: ${issue.missingLanguages.join(', ')}`;
                
                console.log(message);
                
                if (issue.suggestion) {
                    console.log(`    ${COLORS.green}💡 ${issue.suggestion}${COLORS.reset}`);
                }
            });
        });
        
        // Save report to file
        this.saveReport();
    }
    
    // Save report to JSON file
    saveReport() {
        const report = {
            timestamp: new Date().toISOString(),
            scannedFiles: this.scannedFiles,
            translationKeysCount: this.translationKeys.size,
            issuesCount: this.issues.length,
            issuesByType: {},
            issues: this.issues,
            translationKeys: Object.fromEntries(
                Array.from(this.translationKeys.entries()).map(([key, data]) => [
                    key,
                    {
                        files: Array.from(data.files),
                        languages: Array.from(data.languages)
                    }
                ])
            )
        };
        
        // Count by type
        this.issues.forEach(issue => {
            report.issuesByType[issue.type] = (report.issuesByType[issue.type] || 0) + 1;
        });
        
        const reportPath = path.join(__dirname, 'i18n-guardian-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`\n${COLORS.green}📝 Full report saved to: ${reportPath}${COLORS.reset}`);
    }
}

// Run the guardian
const guardian = new DeepDiveGuardian();
guardian.scan().then(issues => {
    // Exit with error code if there are high-severity issues
    const hasErrors = issues.some(i => i.severity === 'error');
    process.exit(hasErrors ? 1 : 0);
}).catch(err => {
    console.error('Guardian error:', err);
    process.exit(1);
});
