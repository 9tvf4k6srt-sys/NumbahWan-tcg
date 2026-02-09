#!/bin/bash
# ============================================
# NUMBAHWAN AUTO-HELPER SYSTEM v1.0
# ============================================
# Automatically creates and manages helper scripts
# based on detected pain points during development
#
# Usage:
#   ./scripts/auto-helper.sh list          - List all helpers
#   ./scripts/auto-helper.sh run <name>    - Run a specific helper
#   ./scripts/auto-helper.sh add <name>    - Add new helper interactively
#   ./scripts/auto-helper.sh detect        - Detect common issues
#   ./scripts/auto-helper.sh fix <issue>   - Auto-fix known issues

set -e
cd "$(dirname "$0")/.."

HELPERS_FILE="scripts/helpers.json"
HELPERS_DIR="scripts/generated"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Create generated helpers directory
mkdir -p "$HELPERS_DIR"

show_banner() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════╗"
    echo "║   🤖 NUMBAHWAN AUTO-HELPER SYSTEM v1.0    ║"
    echo "╚═══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# List all available helpers
list_helpers() {
    echo -e "${CYAN}📋 Available Helpers:${NC}"
    echo ""
    
    if command -v python3 &> /dev/null; then
        python3 << 'PYEOF'
import json
with open('scripts/helpers.json', 'r') as f:
    data = json.load(f)
    for key, helper in data.get('helpers', {}).items():
        print(f"  \033[1;33m{key}\033[0m - {helper.get('name', 'Unknown')}")
        print(f"    Problem: {helper.get('problem', 'N/A')}")
        print(f"    Usage: {helper.get('usage', 'N/A')}")
        print()
PYEOF
    else
        cat "$HELPERS_FILE"
    fi
}

# Detect common issues
detect_issues() {
    echo -e "${CYAN}🔍 Detecting common issues...${NC}"
    echo ""
    
    issues_found=0
    
    # Check for missing thumbnails
    full_count=$(find public/static/images/cards -maxdepth 1 -type f \( -name "*.png" -o -name "*.jpg" \) 2>/dev/null | wc -l)
    thumb_count=$(find public/static/images/cards/thumbs -maxdepth 1 -type f -name "*.webp" 2>/dev/null | wc -l)
    
    if [ "$full_count" -gt "$thumb_count" ]; then
        echo -e "${YELLOW}⚠️  Missing thumbnails: $full_count images, only $thumb_count thumbnails${NC}"
        echo "   Fix: ./scripts/auto-helper.sh fix thumbnails"
        issues_found=$((issues_found + 1))
    else
        echo -e "${GREEN}✓ Thumbnails OK ($thumb_count)${NC}"
    fi
    
    # Check for old image paths in HTML files
    old_paths=$(grep -r "/static/cards/" public/*.html 2>/dev/null | wc -l || echo "0")
    if [ "$old_paths" -gt "0" ]; then
        echo -e "${YELLOW}⚠️  Found $old_paths references to old /static/cards/ path${NC}"
        echo "   Fix: ./scripts/auto-helper.sh fix paths"
        issues_found=$((issues_found + 1))
    else
        echo -e "${GREEN}✓ Image paths OK${NC}"
    fi
    
    # Check for hardcoded card data
    hardcoded=$(grep -r "const CARDS = \[" public/*.html 2>/dev/null | wc -l || echo "0")
    if [ "$hardcoded" -gt "0" ]; then
        echo -e "${YELLOW}⚠️  Found $hardcoded files with hardcoded CARDS array${NC}"
        echo "   Should use NW_CARDS.js instead"
        issues_found=$((issues_found + 1))
    else
        echo -e "${GREEN}✓ Card data centralized${NC}"
    fi
    
    # Check cards-v2.json exists and is valid
    if [ -f "public/static/data/cards-v2.json" ]; then
        card_count=$(python3 -c "import json; print(len(json.load(open('public/static/data/cards-v2.json'))['cards']))" 2>/dev/null || echo "0")
        echo -e "${GREEN}✓ cards-v2.json OK ($card_count cards)${NC}"
    else
        echo -e "${RED}✗ cards-v2.json MISSING${NC}"
        issues_found=$((issues_found + 1))
    fi
    
    echo ""
    if [ "$issues_found" -eq "0" ]; then
        echo -e "${GREEN}🎉 No issues detected!${NC}"
    else
        echo -e "${YELLOW}Found $issues_found issue(s) that can be auto-fixed${NC}"
    fi
}

# Auto-fix known issues
fix_issue() {
    local issue="$1"
    
    case "$issue" in
        thumbnails|thumbs)
            echo -e "${CYAN}🔧 Generating missing thumbnails...${NC}"
            ./scripts/card-manager.sh thumbs
            ;;
        paths)
            echo -e "${CYAN}🔧 Fixing old image paths...${NC}"
            # Replace /static/cards/ with /static/images/cards/
            find public -name "*.html" -exec sed -i 's|/static/cards/|/static/images/cards/|g' {} \;
            echo -e "${GREEN}✓ Paths updated${NC}"
            ;;
        build)
            echo -e "${CYAN}🔧 Rebuilding project...${NC}"
            npm run build
            pm2 restart numbahwan-guild 2>/dev/null || pm2 start ecosystem.config.cjs
            echo -e "${GREEN}✓ Build complete${NC}"
            ;;
        all)
            fix_issue "thumbnails"
            fix_issue "paths"
            fix_issue "build"
            ;;
        *)
            echo -e "${RED}Unknown issue: $issue${NC}"
            echo "Available fixes: thumbnails, paths, build, all"
            exit 1
            ;;
    esac
}

# Add a new helper
add_helper() {
    local name="$1"
    echo -e "${CYAN}➕ Adding new helper: $name${NC}"
    
    read -p "Problem description: " problem
    read -p "Solution: " solution
    read -p "Command/Usage: " usage
    
    # Add to helpers.json using Python
    python3 << PYEOF
import json
from datetime import datetime

with open('scripts/helpers.json', 'r') as f:
    data = json.load(f)

data['helpers']['$name'] = {
    'name': '$name',
    'problem': '$problem',
    'solution': '$solution',
    'usage': '$usage',
    'created': datetime.now().strftime('%Y-%m-%d'),
    'timesUsed': 0
}
data['lastUpdated'] = datetime.now().strftime('%Y-%m-%d')

with open('scripts/helpers.json', 'w') as f:
    json.dump(data, f, indent=2)

print(f"✓ Helper '{name}' added successfully!")
PYEOF
}

# Record a pain point for future automation
record_pain() {
    local description="$1"
    
    python3 << PYEOF
import json
from datetime import datetime

with open('scripts/helpers.json', 'r') as f:
    data = json.load(f)

data['painPoints'].append({
    'description': '$description',
    'timestamp': datetime.now().isoformat(),
    'resolved': False
})

with open('scripts/helpers.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Pain point recorded for future automation")
PYEOF
}

# Quick fixes - common one-liners
quick() {
    local cmd="$1"
    
    case "$cmd" in
        rebuild)
            npm run build && pm2 restart numbahwan-guild
            ;;
        thumb)
            ./scripts/card-manager.sh thumbs
            ;;
        verify)
            ./scripts/card-manager.sh verify
            ;;
        stats)
            ./scripts/card-manager.sh stats
            ;;
        port)
            fuser -k 3000/tcp 2>/dev/null || true
            echo "Port 3000 cleared"
            ;;
        *)
            echo "Quick commands: rebuild, thumb, verify, stats, port"
            ;;
    esac
}

# Main
show_banner

case "${1:-help}" in
    list|ls)
        list_helpers
        ;;
    detect|scan)
        detect_issues
        ;;
    fix)
        fix_issue "${2:-all}"
        ;;
    add)
        add_helper "$2"
        ;;
    pain)
        record_pain "$2"
        ;;
    quick|q)
        quick "$2"
        ;;
    run)
        echo "Running helper: $2"
        # TODO: Execute specific helper
        ;;
    help|*)
        echo -e "${CYAN}Usage:${NC}"
        echo "  ./scripts/auto-helper.sh list          - List all helpers"
        echo "  ./scripts/auto-helper.sh detect        - Detect common issues"
        echo "  ./scripts/auto-helper.sh fix <issue>   - Auto-fix (thumbnails|paths|build|all)"
        echo "  ./scripts/auto-helper.sh add <name>    - Add new helper"
        echo "  ./scripts/auto-helper.sh pain \"desc\"   - Record pain point"
        echo "  ./scripts/auto-helper.sh quick <cmd>   - Quick commands (rebuild|thumb|verify|stats|port)"
        echo ""
        echo -e "${CYAN}Examples:${NC}"
        echo "  ./scripts/auto-helper.sh detect        # Find issues"
        echo "  ./scripts/auto-helper.sh fix all       # Fix everything"
        echo "  ./scripts/auto-helper.sh quick rebuild # Quick rebuild"
        ;;
esac
