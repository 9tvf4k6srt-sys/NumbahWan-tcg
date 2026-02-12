#!/usr/bin/env node
/**
 * NW Design Guard — Automated Quality Checks
 * ============================================
 * Catches design system violations BEFORE they ship.
 *
 * Checks:
 *   1. i18n key parity — all languages have the same keys
 *   2. Font-size floor — no font below 0.75rem (12px)
 *   3. Brand cross-contamination — NW pages don't use KINTSUGI styles, vice versa
 *   4. NW system includes — guild pages load required NW scripts/CSS
 *   5. Mobile safety — viewport meta, overflow protection, single breakpoint
 *   6. data-i18n coverage — HTML text nodes have i18n attributes
 *
 * Usage:
 *   node tests/nw-design-guard.cjs                    # All HTML in public/
 *   node tests/nw-design-guard.cjs guild-siege.html   # Single file
 *   node tests/nw-design-guard.cjs --verbose          # Show passing checks too
 *
 * Zero dependencies. Reads files from disk — no server needed.
 */

const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const VERBOSE = process.argv.includes('--verbose');

// Brand classification
const NW_PAGES = ['guild-siege']; // Expand as guild pages grow
const KINTSUGI_PAGES = ['kintsugi', 'coin-shop', 'ai-assets'];
// Pages not in either list are "neutral" — fewer brand checks

// NW required includes for guild pages
const NW_REQUIRED_CSS = ['nw-tokens.css', 'nw-core.css'];
const NW_REQUIRED_JS = ['nw-i18n-core.js', 'nw-nav.js'];
const NW_FONTS = ['NumbahWan', 'Orbitron', 'Inter'];

// KINTSUGI signatures that should NOT appear on NW pages
const KINTSUGI_SIGNATURES = ['Cormorant', 'Cinzel', '#c9a84c', 'kintsugi_lang', 'kin_lang'];
// NW signatures that should NOT appear on KINTSUGI pages
const NW_ONLY_SIGNATURES = ['NumbahWan-Regular', '#ff6b00'];

// Font-size floor (rem)
const MIN_FONT_REM = 0.75;

// ── Output ──────────────────────────────────────────────────────
const C = {
    pass: '\x1b[32m', fail: '\x1b[31m', warn: '\x1b[33m',
    info: '\x1b[36m', dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m'
};

let totalChecks = 0;
let passed = 0;
let failed = 0;
let warnings = 0;
const failures = [];
const warns = [];

function pass(msg) { totalChecks++; passed++; if (VERBOSE) console.log(`${C.pass}  ✓ ${msg}${C.reset}`); }
function fail(msg) { totalChecks++; failed++; console.log(`${C.fail}  ✗ ${msg}${C.reset}`); failures.push(msg); }
function warn(msg) { totalChecks++; warnings++; console.log(`${C.warn}  ⚠ ${msg}${C.reset}`); warns.push(msg); }
function section(name) { console.log(`\n${C.bold}${C.info}━━━ ${name} ━━━${C.reset}`); }

// ── Helpers ─────────────────────────────────────────────────────
function getPageName(filePath) {
    return path.basename(filePath, '.html');
}

function getBrand(pageName) {
    if (NW_PAGES.includes(pageName)) return 'NW';
    if (KINTSUGI_PAGES.includes(pageName)) return 'KINTSUGI';
    return 'neutral';
}

function extractI18nKeys(html) {
    // Extract NW_I18N.register({ en: {...}, zh: {...}, th: {...} })
    // Strategy: find the register block, then for each language extract keys
    // by matching property-name patterns like `key_name: '...'` or `key_name: "..."`
    const langs = {};
    const registerMatch = html.match(/NW_I18N\.register\(\{([\s\S]*?)\}\s*\)\s*;/);
    if (!registerMatch) return null;

    const block = registerMatch[1];

    // Find language blocks: `en: {`, `zh: {`, `th: {`
    // Use a state machine approach to properly handle nested braces
    const langStarts = [];
    const langNamePattern = /\b(en|zh|th|jp|ja)\s*:\s*\{/g;
    let m;
    while ((m = langNamePattern.exec(block)) !== null) {
        langStarts.push({ lang: m[1], start: m.index + m[0].length });
    }

    langStarts.forEach(({ lang, start }) => {
        // Find the matching closing brace
        let depth = 1;
        let pos = start;
        while (depth > 0 && pos < block.length) {
            if (block[pos] === '{') depth++;
            else if (block[pos] === '}') depth--;
            // Skip strings to avoid false matches
            else if (block[pos] === "'" || block[pos] === '"') {
                const quote = block[pos];
                pos++;
                while (pos < block.length && block[pos] !== quote) {
                    if (block[pos] === '\\') pos++; // skip escaped chars
                    pos++;
                }
            }
            pos++;
        }
        const body = block.substring(start, pos - 1);

        // Extract keys: match `word_chars:` that appear after newline/comma/start
        // but NOT inside string values
        const keys = new Set();
        // Remove all string values first, then extract remaining identifiers before colons
        const stripped = body.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, '""');
        const keyPattern = /\b([a-z][a-z0-9_]*)\s*:/g;
        let km;
        while ((km = keyPattern.exec(stripped)) !== null) {
            keys.add(km[1]);
        }
        langs[lang] = keys;
    });

    return Object.keys(langs).length > 0 ? langs : null;
}

function extractFontSizes(html) {
    const sizes = [];
    // Match font-size declarations in CSS and inline styles
    const pattern = /font-size\s*:\s*([^;}\n]+)/g;
    let m;
    while ((m = pattern.exec(html)) !== null) {
        const val = m[1].trim();
        // Extract rem values
        const remMatch = val.match(/([\d.]+)\s*rem/);
        if (remMatch) {
            sizes.push({ value: parseFloat(remMatch[1]), raw: val });
        }
        // Extract from clamp — check the minimum (first value)
        const clampMatch = val.match(/clamp\(\s*([\d.]+)\s*rem/);
        if (clampMatch) {
            sizes.push({ value: parseFloat(clampMatch[1]), raw: val, isClamp: true });
        }
    }
    return sizes;
}

function extractDataI18nKeys(html) {
    const keys = new Set();
    const pattern = /data-i18n="([^"]+)"/g;
    let m;
    while ((m = pattern.exec(html)) !== null) {
        keys.add(m[1]);
    }
    return keys;
}

function countMediaBlocks(html, breakpoint) {
    const pattern = new RegExp(`@media\\s*\\([^)]*max-width\\s*:\\s*${breakpoint}px`, 'g');
    const matches = html.match(pattern);
    return matches ? matches.length : 0;
}

// ── Checks ──────────────────────────────────────────────────────

function checkI18nParity(html, pageName) {
    section(`i18n Key Parity — ${pageName}`);
    const langs = extractI18nKeys(html);

    if (!langs) {
        warn(`${pageName}: No NW_I18N.register() found — skipping i18n checks`);
        return;
    }

    const langNames = Object.keys(langs);
    if (langNames.length < 2) {
        fail(`${pageName}: Only ${langNames.length} language(s) registered (need at least 2)`);
        return;
    }
    pass(`${pageName}: ${langNames.length} languages registered: ${langNames.join(', ')}`);

    // Check parity — every key in any lang should be in all langs
    const allKeys = new Set();
    langNames.forEach(l => langs[l].forEach(k => allKeys.add(k)));

    let missingCount = 0;
    langNames.forEach(lang => {
        const missing = [...allKeys].filter(k => !langs[lang].has(k));
        if (missing.length > 0) {
            missingCount += missing.length;
            fail(`${pageName} [${lang}]: missing ${missing.length} keys: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
        } else {
            pass(`${pageName} [${lang}]: all ${allKeys.size} keys present`);
        }
    });

    if (missingCount === 0) {
        pass(`${pageName}: i18n parity — all ${allKeys.size} keys match across ${langNames.length} languages`);
    }

    // Check data-i18n attributes reference registered keys
    const htmlKeys = extractDataI18nKeys(html);
    const enKeys = langs['en'] || langs[langNames[0]];
    const unreg = [...htmlKeys].filter(k => !enKeys.has(k));
    if (unreg.length > 0) {
        fail(`${pageName}: ${unreg.length} data-i18n keys not in register(): ${unreg.slice(0, 5).join(', ')}`);
    } else if (htmlKeys.size > 0) {
        pass(`${pageName}: all ${htmlKeys.size} data-i18n attributes have registered translations`);
    }
}

function checkFontSizes(html, pageName) {
    section(`Font Size Floor — ${pageName}`);
    const sizes = extractFontSizes(html);

    if (sizes.length === 0) {
        warn(`${pageName}: No font-size declarations found`);
        return;
    }

    const violations = sizes.filter(s => s.value < MIN_FONT_REM && !s.isClamp);
    if (violations.length > 0) {
        violations.forEach(v => {
            fail(`${pageName}: font-size ${v.raw} (${(v.value * 16).toFixed(1)}px) below ${MIN_FONT_REM}rem floor`);
        });
    } else {
        pass(`${pageName}: all ${sizes.length} font-size values >= ${MIN_FONT_REM}rem (${MIN_FONT_REM * 16}px)`);
    }

    // Warn on sizes below 0.85rem (legibility concern)
    const legibility = sizes.filter(s => s.value >= MIN_FONT_REM && s.value < 0.85 && !s.isClamp);
    if (legibility.length > 0) {
        warn(`${pageName}: ${legibility.length} font-size(s) between ${MIN_FONT_REM}–0.85rem — may be hard to read on mobile`);
    }
}

function checkBrandIntegrity(html, pageName) {
    const brand = getBrand(pageName);
    if (brand === 'neutral') return;

    section(`Brand Integrity — ${pageName} [${brand}]`);

    if (brand === 'NW') {
        // NW pages should NOT have KINTSUGI signatures
        KINTSUGI_SIGNATURES.forEach(sig => {
            if (html.includes(sig)) {
                fail(`${pageName} [NW]: contains KINTSUGI signature "${sig}" — cross-contamination`);
            } else {
                pass(`${pageName} [NW]: no "${sig}" — clean`);
            }
        });

        // NW pages SHOULD have NW fonts
        NW_FONTS.forEach(font => {
            if (html.includes(font)) {
                pass(`${pageName} [NW]: uses ${font} font`);
            } else {
                fail(`${pageName} [NW]: missing ${font} font`);
            }
        });
    }

    if (brand === 'KINTSUGI') {
        // KINTSUGI pages should NOT have NW-only signatures
        NW_ONLY_SIGNATURES.forEach(sig => {
            if (html.includes(sig)) {
                warn(`${pageName} [KINTSUGI]: contains NW signature "${sig}" — may be cross-contamination`);
            } else {
                pass(`${pageName} [KINTSUGI]: no "${sig}" — clean`);
            }
        });
    }
}

function checkNWIncludes(html, pageName) {
    const brand = getBrand(pageName);
    if (brand !== 'NW') return;

    section(`NW System Includes — ${pageName}`);

    NW_REQUIRED_CSS.forEach(css => {
        if (html.includes(css)) {
            pass(`${pageName}: includes ${css}`);
        } else {
            fail(`${pageName}: missing required CSS: ${css}`);
        }
    });

    NW_REQUIRED_JS.forEach(js => {
        if (html.includes(js)) {
            pass(`${pageName}: includes ${js}`);
        } else {
            fail(`${pageName}: missing required JS: ${js}`);
        }
    });
}

function checkMobileSafety(html, pageName) {
    section(`Mobile Safety — ${pageName}`);

    // Viewport meta
    if (html.includes('viewport') && html.includes('width=device-width')) {
        pass(`${pageName}: viewport meta present`);
    } else {
        fail(`${pageName}: missing viewport meta tag`);
    }

    // Overflow protection
    if (html.includes('overflow-x') && html.includes('hidden')) {
        pass(`${pageName}: overflow-x: hidden present`);
    } else {
        warn(`${pageName}: no overflow-x: hidden found — risk of horizontal scroll`);
    }

    // Single 768px media block
    const count768 = countMediaBlocks(html, 768);
    if (count768 === 0) {
        warn(`${pageName}: no @media 768px block — no mobile styles?`);
    } else if (count768 === 1) {
        pass(`${pageName}: single @media 768px block — correct`);
    } else {
        fail(`${pageName}: ${count768} @media 768px blocks — MUST be single (L002). Last one wins via cascade.`);
    }
}

function checkTHelperUsage(html, pageName) {
    const brand = getBrand(pageName);
    if (brand !== 'NW') return;

    section(`t() Helper — ${pageName}`);

    // Check for t() helper definition
    if (html.includes("const t = ") && html.includes('NW_I18N')) {
        pass(`${pageName}: t() helper defined with NW_I18N fallback`);
    } else if (html.includes('NW_I18N.t(')) {
        pass(`${pageName}: using NW_I18N.t() directly`);
    } else {
        warn(`${pageName}: no t() helper or NW_I18N.t() usage found — JS strings may be untranslated`);
    }

    // Count showToast / addLogEntry calls and check if they use t()
    const toastCalls = (html.match(/showToast\(/g) || []).length;
    const toastWithT = (html.match(/showToast\(t\(/g) || []).length;
    if (toastCalls > 0) {
        if (toastWithT === toastCalls) {
            pass(`${pageName}: all ${toastCalls} showToast() calls use t()`);
        } else {
            warn(`${pageName}: ${toastWithT}/${toastCalls} showToast() calls use t() — ${toastCalls - toastWithT} may be untranslated`);
        }
    }
}

// ── Route registration check ────────────────────────────────────
function checkRouteRegistration() {
    section('Route Registration');

    const pagesTs = path.resolve(__dirname, '..', 'src', 'routes', 'pages.ts');
    if (!fs.existsSync(pagesTs)) {
        warn('src/routes/pages.ts not found — skipping route check');
        return;
    }

    const routeContent = fs.readFileSync(pagesTs, 'utf-8');
    const htmlFiles = fs.readdirSync(PUBLIC_DIR)
        .filter(f => f.endsWith('.html') && f !== 'index.html')
        .map(f => f.replace('.html', ''));

    let missing = 0;
    htmlFiles.forEach(page => {
        if (routeContent.includes(`'${page}'`)) {
            pass(`Route registered: /${page}`);
        } else {
            // Check if it's in a sub-route array
            if (routeContent.includes(page)) {
                pass(`Route registered: /${page} (sub-route)`);
            } else {
                warn(`/${page} — HTML exists but no route in pages.ts`);
                missing++;
            }
        }
    });

    if (missing === 0) {
        pass(`All ${htmlFiles.length} HTML pages have routes`);
    }
}

// ── Main ────────────────────────────────────────────────────────
function main() {
    console.log(`${C.bold}${C.info}`);
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     NW Design Guard v1.0                 ║');
    console.log('║     Automated Quality Checks             ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(C.reset);

    // Determine which files to check
    const specificFile = process.argv.find(a => a.endsWith('.html'));
    let files;

    if (specificFile) {
        const fullPath = path.join(PUBLIC_DIR, specificFile);
        if (!fs.existsSync(fullPath)) {
            console.error(`${C.fail}File not found: ${fullPath}${C.reset}`);
            process.exit(1);
        }
        files = [fullPath];
    } else {
        // Check all brand-classified pages + any with NW_I18N
        files = fs.readdirSync(PUBLIC_DIR)
            .filter(f => f.endsWith('.html'))
            .map(f => path.join(PUBLIC_DIR, f));
    }

    // Per-file checks
    files.forEach(filePath => {
        const pageName = getPageName(filePath);
        const html = fs.readFileSync(filePath, 'utf-8');
        const brand = getBrand(pageName);

        // Only run deep checks on brand-classified pages or pages with i18n
        const hasI18n = html.includes('NW_I18N');
        if (brand === 'neutral' && !hasI18n && !specificFile) return;

        console.log(`\n${C.bold}════ ${pageName}.html [${brand}] ════${C.reset}`);

        checkI18nParity(html, pageName);
        checkFontSizes(html, pageName);
        checkBrandIntegrity(html, pageName);
        checkNWIncludes(html, pageName);
        checkMobileSafety(html, pageName);
        checkTHelperUsage(html, pageName);
    });

    // Cross-file checks
    checkRouteRegistration();

    // ── Summary ─────────────────────────────
    console.log(`\n${C.bold}${C.info}━━━ SUMMARY ━━━${C.reset}`);
    console.log(`  Total checks: ${totalChecks}`);
    console.log(`  ${C.pass}Passed: ${passed}${C.reset}`);
    if (warnings > 0) console.log(`  ${C.warn}Warnings: ${warnings}${C.reset}`);
    if (failed > 0) console.log(`  ${C.fail}Failed: ${failed}${C.reset}`);

    if (failed > 0) {
        console.log(`\n${C.fail}${C.bold}DESIGN GUARD FAILED — ${failed} issue(s) need fixing${C.reset}`);
        failures.forEach(f => console.log(`${C.fail}  ✗ ${f}${C.reset}`));
        process.exit(1);
    } else if (warnings > 0) {
        console.log(`\n${C.warn}${C.bold}DESIGN GUARD PASSED with ${warnings} warning(s)${C.reset}`);
        process.exit(0);
    } else {
        console.log(`\n${C.pass}${C.bold}DESIGN GUARD PASSED — all clean ✓${C.reset}`);
        process.exit(0);
    }
}

main();
