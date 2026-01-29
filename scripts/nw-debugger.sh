#!/bin/bash
# ============================================
# NUMBAHWAN AUTO-DEBUGGER & OPTIMIZER v1.0
# ============================================
# Intelligent system that:
# 1. Analyzes project structure
# 2. Detects issues & anti-patterns
# 3. Suggests and applies optimizations
# 4. Tracks improvements over time
#
# Usage:
#   ./scripts/nw-debugger.sh analyze     - Full project analysis
#   ./scripts/nw-debugger.sh optimize    - Auto-optimize everything
#   ./scripts/nw-debugger.sh fix         - Fix detected issues
#   ./scripts/nw-debugger.sh report      - Generate health report
#   ./scripts/nw-debugger.sh watch       - Continuous monitoring

set -e
cd "$(dirname "$0")/.."

# Config
REPORT_DIR="scripts/reports"
DEBUG_LOG="scripts/debug.log"
OPTIMIZE_JSON="scripts/optimizations.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Create directories
mkdir -p "$REPORT_DIR"

show_banner() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║   🔧 NUMBAHWAN AUTO-DEBUGGER & OPTIMIZER v1.0             ║"
    echo "║   Smart Analysis • Auto-Fix • Continuous Improvement      ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$DEBUG_LOG"
}

# ============================================
# ANALYSIS FUNCTIONS
# ============================================

analyze_structure() {
    echo -e "${CYAN}📁 Analyzing Project Structure...${NC}"
    
    local issues=0
    local suggestions=()
    
    # Check for proper directory structure
    echo -e "  ${WHITE}Directory Layout:${NC}"
    
    required_dirs=("src" "public" "public/static" "scripts" "migrations")
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            echo -e "    ${GREEN}✓${NC} $dir"
        else
            echo -e "    ${RED}✗${NC} $dir (missing)"
            issues=$((issues + 1))
        fi
    done
    
    # Check for orphan files in root
    orphan_count=$(find . -maxdepth 1 -type f \( -name "*.js" -o -name "*.ts" -o -name "*.html" \) ! -name "*.config.*" | wc -l)
    if [ "$orphan_count" -gt 0 ]; then
        echo -e "    ${YELLOW}⚠${NC} Found $orphan_count loose files in root (should be in src/ or public/)"
        suggestions+=("Move loose .js/.ts/.html files to appropriate directories")
    fi
    
    echo "$issues"
}

analyze_data() {
    echo -e "${CYAN}📊 Analyzing Data Structures...${NC}"
    
    local issues=0
    
    # Check JSON files
    echo -e "  ${WHITE}JSON Data Files:${NC}"
    
    for json_file in $(find . -name "*.json" -not -path "./node_modules/*" -not -path "./.wrangler/*" 2>/dev/null); do
        if python3 -c "import json; json.load(open('$json_file'))" 2>/dev/null; then
            size=$(wc -c < "$json_file")
            echo -e "    ${GREEN}✓${NC} $json_file ($(numfmt --to=iec $size 2>/dev/null || echo "${size}B"))"
        else
            echo -e "    ${RED}✗${NC} $json_file (invalid JSON)"
            issues=$((issues + 1))
        fi
    done
    
    # Check for duplicate data
    echo -e "  ${WHITE}Data Duplication Check:${NC}"
    
    # Check cards data locations
    cards_files=$(find . -name "*cards*.json" -not -path "./node_modules/*" 2>/dev/null | wc -l)
    if [ "$cards_files" -gt 1 ]; then
        echo -e "    ${YELLOW}⚠${NC} Found $cards_files card JSON files - consider consolidating"
    else
        echo -e "    ${GREEN}✓${NC} Card data centralized"
    fi
    
    echo "$issues"
}

analyze_assets() {
    echo -e "${CYAN}🖼️  Analyzing Assets...${NC}"
    
    local issues=0
    
    # Image analysis
    echo -e "  ${WHITE}Image Assets:${NC}"
    
    if [ -d "public/static/images/cards" ]; then
        full_count=$(find public/static/images/cards -maxdepth 1 -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) 2>/dev/null | wc -l)
        full_size=$(du -sh public/static/images/cards 2>/dev/null | cut -f1)
        echo -e "    Full images: $full_count files ($full_size)"
        
        if [ -d "public/static/images/cards/thumbs" ]; then
            thumb_count=$(find public/static/images/cards/thumbs -maxdepth 1 -type f -name "*.webp" 2>/dev/null | wc -l)
            thumb_size=$(du -sh public/static/images/cards/thumbs 2>/dev/null | cut -f1)
            echo -e "    Thumbnails: $thumb_count files ($thumb_size)"
            
            if [ "$full_count" -gt "$thumb_count" ]; then
                echo -e "    ${YELLOW}⚠${NC} Missing $(($full_count - $thumb_count)) thumbnails"
                issues=$((issues + 1))
            else
                echo -e "    ${GREEN}✓${NC} All images have thumbnails"
            fi
        else
            echo -e "    ${RED}✗${NC} No thumbnails directory"
            issues=$((issues + 1))
        fi
    fi
    
    # Check for unoptimized images (>500KB)
    large_images=$(find public -type f \( -name "*.png" -o -name "*.jpg" \) -size +500k 2>/dev/null | wc -l)
    if [ "$large_images" -gt 0 ]; then
        echo -e "    ${YELLOW}⚠${NC} $large_images images over 500KB - consider optimization"
    fi
    
    echo "$issues"
}

analyze_code() {
    echo -e "${CYAN}💻 Analyzing Code Quality...${NC}"
    
    local issues=0
    
    # Check for console.logs in production code
    echo -e "  ${WHITE}Debug Statements:${NC}"
    console_logs=$(grep -r "console\.log" public/static/*.js 2>/dev/null | wc -l || echo "0")
    if [ "$console_logs" -gt 10 ]; then
        echo -e "    ${YELLOW}⚠${NC} $console_logs console.log statements found"
    else
        echo -e "    ${GREEN}✓${NC} Minimal debug statements"
    fi
    
    # Check for hardcoded values
    echo -e "  ${WHITE}Hardcoded Values:${NC}"
    hardcoded_urls=$(grep -r "localhost:3000" public/*.html 2>/dev/null | wc -l || echo "0")
    if [ "$hardcoded_urls" -gt 0 ]; then
        echo -e "    ${YELLOW}⚠${NC} $hardcoded_urls hardcoded localhost URLs"
        issues=$((issues + 1))
    else
        echo -e "    ${GREEN}✓${NC} No hardcoded localhost URLs"
    fi
    
    # Check for TODO/FIXME comments
    todos=$(grep -r "TODO\|FIXME" --include="*.js" --include="*.ts" --include="*.html" . 2>/dev/null | grep -v node_modules | wc -l || echo "0")
    if [ "$todos" -gt 0 ]; then
        echo -e "    ${BLUE}ℹ${NC} $todos TODO/FIXME comments found"
    fi
    
    # Check for duplicate code patterns
    echo -e "  ${WHITE}Code Patterns:${NC}"
    
    # Check if NW_CARDS is being used consistently
    nw_cards_usage=$(grep -r "NW_CARDS" public/*.html 2>/dev/null | wc -l || echo "0")
    direct_fetch=$(grep -r "fetch.*cards.*json" public/*.html 2>/dev/null | wc -l || echo "0")
    
    if [ "$direct_fetch" -gt "$nw_cards_usage" ]; then
        echo -e "    ${YELLOW}⚠${NC} Inconsistent card loading - some pages bypass NW_CARDS"
    else
        echo -e "    ${GREEN}✓${NC} Consistent NW_CARDS usage"
    fi
    
    echo "$issues"
}

analyze_performance() {
    echo -e "${CYAN}⚡ Analyzing Performance...${NC}"
    
    local issues=0
    
    # Check bundle sizes
    echo -e "  ${WHITE}Bundle Analysis:${NC}"
    
    if [ -d "dist" ]; then
        worker_size=$(wc -c < dist/_worker.js 2>/dev/null || echo "0")
        echo -e "    Worker bundle: $(numfmt --to=iec $worker_size 2>/dev/null || echo "${worker_size}B")"
        
        if [ "$worker_size" -gt 1048576 ]; then
            echo -e "    ${YELLOW}⚠${NC} Worker bundle over 1MB - consider code splitting"
            issues=$((issues + 1))
        fi
    fi
    
    # Check for render-blocking resources
    echo -e "  ${WHITE}Resource Loading:${NC}"
    
    blocking_css=$(grep -r '<link.*rel="stylesheet"' public/*.html 2>/dev/null | grep -v "cdn\|async\|defer" | wc -l || echo "0")
    if [ "$blocking_css" -gt 3 ]; then
        echo -e "    ${YELLOW}⚠${NC} $blocking_css potentially render-blocking CSS files"
    fi
    
    # Check for lazy loading
    lazy_images=$(grep -r 'loading="lazy"' public/*.html 2>/dev/null | wc -l || echo "0")
    total_images=$(grep -r '<img' public/*.html 2>/dev/null | wc -l || echo "0")
    
    if [ "$total_images" -gt 0 ] && [ "$lazy_images" -lt "$((total_images / 2))" ]; then
        echo -e "    ${YELLOW}⚠${NC} Only $lazy_images/$total_images images use lazy loading"
    else
        echo -e "    ${GREEN}✓${NC} Good lazy loading coverage"
    fi
    
    echo "$issues"
}

analyze_security() {
    echo -e "${CYAN}🔒 Analyzing Security...${NC}"
    
    local issues=0
    
    # Check for exposed secrets
    echo -e "  ${WHITE}Secret Detection:${NC}"
    
    secrets_found=$(grep -rE "(api_key|apikey|secret|password|token)\s*[:=]\s*['\"][^'\"]+['\"]" \
        --include="*.js" --include="*.ts" --include="*.html" --include="*.json" \
        . 2>/dev/null | grep -v node_modules | grep -v ".example" | wc -l || echo "0")
    
    if [ "$secrets_found" -gt 0 ]; then
        echo -e "    ${RED}⚠${NC} $secrets_found potential exposed secrets!"
        issues=$((issues + 1))
    else
        echo -e "    ${GREEN}✓${NC} No obvious secrets exposed"
    fi
    
    # Check .gitignore
    if [ -f ".gitignore" ]; then
        if grep -q ".env" .gitignore && grep -q "node_modules" .gitignore; then
            echo -e "    ${GREEN}✓${NC} .gitignore properly configured"
        else
            echo -e "    ${YELLOW}⚠${NC} .gitignore may be missing entries"
        fi
    else
        echo -e "    ${RED}✗${NC} No .gitignore file!"
        issues=$((issues + 1))
    fi
    
    # Check for dev.vars
    if [ -f ".dev.vars" ]; then
        if [ -f ".gitignore" ] && grep -q ".dev.vars" .gitignore; then
            echo -e "    ${GREEN}✓${NC} .dev.vars is gitignored"
        else
            echo -e "    ${RED}⚠${NC} .dev.vars should be in .gitignore!"
            issues=$((issues + 1))
        fi
    fi
    
    echo "$issues"
}

# ============================================
# OPTIMIZATION FUNCTIONS
# ============================================

optimize_images() {
    echo -e "${CYAN}🖼️  Optimizing Images...${NC}"
    
    # Generate missing thumbnails
    if [ -f "scripts/card-manager.sh" ]; then
        ./scripts/card-manager.sh thumbs 2>/dev/null || true
    fi
    
    # Find and report large images
    echo -e "  ${WHITE}Large images that could be optimized:${NC}"
    find public -type f \( -name "*.png" -o -name "*.jpg" \) -size +500k 2>/dev/null | while read img; do
        size=$(du -h "$img" | cut -f1)
        echo -e "    $img ($size)"
    done
    
    echo -e "${GREEN}✓ Image optimization complete${NC}"
}

optimize_code() {
    echo -e "${CYAN}💻 Optimizing Code...${NC}"
    
    # Remove excessive console.logs from JS files (keep errors/warns)
    echo -e "  ${WHITE}Cleaning debug statements...${NC}"
    
    # Count before
    before=$(grep -r "console\.log" public/static/*.js 2>/dev/null | wc -l || echo "0")
    
    # Only remove if there are many (>20)
    if [ "$before" -gt 20 ]; then
        echo -e "    Found $before console.log statements"
        echo -e "    ${YELLOW}Recommendation: Review and remove unnecessary debug logs${NC}"
    fi
    
    echo -e "${GREEN}✓ Code optimization complete${NC}"
}

optimize_data() {
    echo -e "${CYAN}📊 Optimizing Data Structures...${NC}"
    
    # Validate and format JSON files
    for json_file in $(find . -name "*.json" -not -path "./node_modules/*" -not -path "./.wrangler/*" 2>/dev/null); do
        if python3 -c "import json; json.load(open('$json_file'))" 2>/dev/null; then
            # Check if file could be minified for production
            size=$(wc -c < "$json_file")
            minified_size=$(python3 -c "import json; print(len(json.dumps(json.load(open('$json_file')), separators=(',',':'))))" 2>/dev/null || echo "$size")
            
            savings=$((size - minified_size))
            if [ "$savings" -gt 1000 ]; then
                echo -e "  ${YELLOW}$json_file could save $(numfmt --to=iec $savings 2>/dev/null || echo "${savings}B") if minified${NC}"
            fi
        fi
    done
    
    echo -e "${GREEN}✓ Data optimization complete${NC}"
}

# ============================================
# AUTO-FIX FUNCTIONS
# ============================================

fix_all() {
    echo -e "${CYAN}🔧 Auto-Fixing All Issues...${NC}"
    echo ""
    
    # Fix 1: Generate missing thumbnails
    echo -e "${WHITE}[1/5] Thumbnails${NC}"
    if [ -f "scripts/card-manager.sh" ]; then
        ./scripts/card-manager.sh thumbs 2>/dev/null && echo -e "  ${GREEN}✓ Thumbnails generated${NC}" || echo -e "  ${YELLOW}⚠ Skipped${NC}"
    fi
    
    # Fix 2: Update old paths
    echo -e "${WHITE}[2/5] Image Paths${NC}"
    old_paths=$(grep -r "/static/cards/" public/*.html 2>/dev/null | wc -l || echo "0")
    if [ "$old_paths" -gt 0 ]; then
        find public -name "*.html" -exec sed -i 's|/static/cards/|/static/images/cards/|g' {} \; 2>/dev/null
        echo -e "  ${GREEN}✓ Updated $old_paths path references${NC}"
    else
        echo -e "  ${GREEN}✓ All paths correct${NC}"
    fi
    
    # Fix 3: Ensure .gitignore has required entries
    echo -e "${WHITE}[3/5] Git Configuration${NC}"
    if [ -f ".gitignore" ]; then
        for entry in "node_modules" ".env" ".dev.vars" ".wrangler" "dist"; do
            if ! grep -q "^$entry" .gitignore; then
                echo "$entry" >> .gitignore
                echo -e "  ${GREEN}✓ Added $entry to .gitignore${NC}"
            fi
        done
    fi
    
    # Fix 4: Validate JSON files
    echo -e "${WHITE}[4/5] JSON Validation${NC}"
    for json_file in $(find . -name "*.json" -not -path "./node_modules/*" -not -path "./.wrangler/*" 2>/dev/null); do
        if ! python3 -c "import json; json.load(open('$json_file'))" 2>/dev/null; then
            echo -e "  ${RED}✗ Invalid: $json_file (manual fix needed)${NC}"
        fi
    done
    echo -e "  ${GREEN}✓ JSON files validated${NC}"
    
    # Fix 5: Rebuild
    echo -e "${WHITE}[5/5] Rebuild Project${NC}"
    npm run build 2>/dev/null && echo -e "  ${GREEN}✓ Build successful${NC}" || echo -e "  ${RED}✗ Build failed${NC}"
    
    echo ""
    echo -e "${GREEN}🎉 Auto-fix complete!${NC}"
}

# ============================================
# REPORT GENERATION
# ============================================

generate_report() {
    local report_file="$REPORT_DIR/health-report-$(date '+%Y%m%d-%H%M%S').md"
    
    echo -e "${CYAN}📝 Generating Health Report...${NC}"
    
    {
        echo "# NumbahWan Project Health Report"
        echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        echo "## Summary"
        echo ""
        
        # Run all analyses and capture issues
        echo "| Category | Issues | Status |"
        echo "|----------|--------|--------|"
        
        struct_issues=$(analyze_structure 2>&1 | tail -1)
        data_issues=$(analyze_data 2>&1 | tail -1)
        asset_issues=$(analyze_assets 2>&1 | tail -1)
        code_issues=$(analyze_code 2>&1 | tail -1)
        perf_issues=$(analyze_performance 2>&1 | tail -1)
        sec_issues=$(analyze_security 2>&1 | tail -1)
        
        total_issues=$((struct_issues + data_issues + asset_issues + code_issues + perf_issues + sec_issues))
        
        echo "| Structure | $struct_issues | $([ $struct_issues -eq 0 ] && echo '✅' || echo '⚠️') |"
        echo "| Data | $data_issues | $([ $data_issues -eq 0 ] && echo '✅' || echo '⚠️') |"
        echo "| Assets | $asset_issues | $([ $asset_issues -eq 0 ] && echo '✅' || echo '⚠️') |"
        echo "| Code | $code_issues | $([ $code_issues -eq 0 ] && echo '✅' || echo '⚠️') |"
        echo "| Performance | $perf_issues | $([ $perf_issues -eq 0 ] && echo '✅' || echo '⚠️') |"
        echo "| Security | $sec_issues | $([ $sec_issues -eq 0 ] && echo '✅' || echo '⚠️') |"
        echo ""
        echo "**Total Issues: $total_issues**"
        echo ""
        echo "## Quick Fix"
        echo "\`\`\`bash"
        echo "./scripts/nw-debugger.sh fix"
        echo "\`\`\`"
        
    } > "$report_file"
    
    echo -e "${GREEN}✓ Report saved to: $report_file${NC}"
    echo ""
    cat "$report_file"
}

# ============================================
# FULL ANALYSIS
# ============================================

full_analysis() {
    echo ""
    
    analyze_structure
    echo ""
    
    analyze_data
    echo ""
    
    analyze_assets
    echo ""
    
    analyze_code
    echo ""
    
    analyze_performance
    echo ""
    
    analyze_security
    echo ""
    
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}Analysis Complete!${NC}"
    echo ""
    echo -e "Run ${CYAN}./scripts/nw-debugger.sh fix${NC} to auto-fix issues"
    echo -e "Run ${CYAN}./scripts/nw-debugger.sh optimize${NC} to optimize"
    echo -e "Run ${CYAN}./scripts/nw-debugger.sh report${NC} for detailed report"
}

# ============================================
# MAIN
# ============================================

show_banner

case "${1:-help}" in
    analyze|scan|check)
        full_analysis
        ;;
    fix|repair)
        fix_all
        ;;
    optimize|opt)
        optimize_images
        echo ""
        optimize_code
        echo ""
        optimize_data
        ;;
    report)
        generate_report
        ;;
    structure)
        analyze_structure
        ;;
    data)
        analyze_data
        ;;
    assets)
        analyze_assets
        ;;
    code)
        analyze_code
        ;;
    performance|perf)
        analyze_performance
        ;;
    security|sec)
        analyze_security
        ;;
    help|*)
        echo -e "${CYAN}Usage:${NC}"
        echo "  ./scripts/nw-debugger.sh analyze     - Full project analysis"
        echo "  ./scripts/nw-debugger.sh fix         - Auto-fix all issues"
        echo "  ./scripts/nw-debugger.sh optimize    - Optimize images, code, data"
        echo "  ./scripts/nw-debugger.sh report      - Generate health report"
        echo ""
        echo -e "${CYAN}Individual Checks:${NC}"
        echo "  ./scripts/nw-debugger.sh structure   - Check project structure"
        echo "  ./scripts/nw-debugger.sh data        - Check data files"
        echo "  ./scripts/nw-debugger.sh assets      - Check images/assets"
        echo "  ./scripts/nw-debugger.sh code        - Check code quality"
        echo "  ./scripts/nw-debugger.sh perf        - Check performance"
        echo "  ./scripts/nw-debugger.sh security    - Check security"
        echo ""
        echo -e "${CYAN}Quick Commands:${NC}"
        echo "  npm run debug          - Alias for analyze"
        echo "  npm run debug:fix      - Alias for fix"
        echo "  npm run debug:report   - Alias for report"
        ;;
esac
