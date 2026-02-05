#!/bin/bash
# NumbahWan Page Pre-Flight Checklist
# Run before pushing ANY new page to ensure quality standards

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_pass() { echo -e "${GREEN}✓ $1${NC}"; }
check_fail() { echo -e "${RED}✗ $1${NC}"; FAILED=1; }
check_warn() { echo -e "${YELLOW}⚠ $1${NC}"; }

FAILED=0

echo "═══════════════════════════════════════════════════"
echo "  NumbahWan Page Pre-Flight Checklist"
echo "═══════════════════════════════════════════════════"
echo ""

# Get page file(s) to check
if [ -n "$1" ]; then
    PAGES="$1"
else
    echo "Checking all HTML pages in public/..."
    PAGES=$(find public -name "*.html" -type f 2>/dev/null || echo "")
fi

if [ -z "$PAGES" ]; then
    echo "No HTML files found to check."
    exit 0
fi

for PAGE in $PAGES; do
    echo ""
    echo "Checking: $PAGE"
    echo "───────────────────────────────────────────────────"
    
    # 1. Check for uni nav (nw-nav.js)
    if grep -q 'nw-nav.js' "$PAGE"; then
        check_pass "Universal navigation (nw-nav.js)"
    else
        check_fail "Missing universal navigation! Add: <script src=\"/static/nw-nav.js\"></script>"
    fi
    
    # 2. Check for i18n core
    if grep -q 'nw-i18n-core.js' "$PAGE"; then
        check_pass "i18n core (nw-i18n-core.js)"
    else
        check_fail "Missing i18n! Add: <script src=\"/static/nw-i18n-core.js\"></script>"
    fi
    
    # 3. Check for pageTranslations object
    if grep -q 'pageTranslations' "$PAGE"; then
        check_pass "Page translations object defined"
    else
        check_fail "Missing pageTranslations object for i18n!"
    fi
    
    # 4. Check for initI18n call
    if grep -q 'initI18n' "$PAGE"; then
        check_pass "initI18n() called"
    else
        check_fail "Missing initI18n() call!"
    fi
    
    # 5. Check for essential scripts
    if grep -q 'nw-essentials.js' "$PAGE"; then
        check_pass "Essential scripts (nw-essentials.js)"
    else
        check_warn "Consider adding nw-essentials.js for consistency"
    fi
    
    # 6. Check for wallet integration
    if grep -q 'nw-wallet.js' "$PAGE"; then
        check_pass "Wallet integration (nw-wallet.js)"
    else
        check_warn "No wallet integration - okay if page doesn't need it"
    fi
    
    # 7. Check for favicon
    if grep -q 'favicon' "$PAGE"; then
        check_pass "Favicon defined"
    else
        check_warn "No favicon found"
    fi
    
    # 8. Check for mobile viewport
    if grep -q 'viewport' "$PAGE"; then
        check_pass "Mobile viewport meta tag"
    else
        check_fail "Missing viewport meta tag for mobile!"
    fi
    
    # 9. Check for data-i18n attributes (at least some)
    I18N_COUNT=$(grep -o 'data-i18n' "$PAGE" | wc -l)
    if [ "$I18N_COUNT" -gt 0 ]; then
        check_pass "Found $I18N_COUNT data-i18n attributes"
    else
        check_warn "No data-i18n attributes found - static text only?"
    fi
    
    # 10. Check lang attribute on html tag
    if grep -q '<html.*lang=' "$PAGE"; then
        check_pass "HTML lang attribute set"
    else
        check_warn "No lang attribute on <html> tag"
    fi
    
done

echo ""
echo "═══════════════════════════════════════════════════"
if [ "$FAILED" -eq 1 ]; then
    echo -e "${RED}CHECKLIST FAILED - Fix issues before pushing!${NC}"
    exit 1
else
    echo -e "${GREEN}ALL CHECKS PASSED ✓${NC}"
    exit 0
fi
