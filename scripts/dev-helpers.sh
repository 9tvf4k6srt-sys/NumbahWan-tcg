#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# NumbahWan TCG - Developer Helper Scripts
# Usage: ./scripts/dev-helpers.sh [command]
# ═══════════════════════════════════════════════════════════════════════════

set -e
cd "$(dirname "$0")/.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ═══════════════════════════════════════════════════════════════════════════
# COMMANDS
# ═══════════════════════════════════════════════════════════════════════════

cmd_help() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  NumbahWan TCG - Developer Helpers${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}Build & Server:${NC}"
    echo "  dev          - Build and start dev server"
    echo "  build        - Build production"
    echo "  restart      - Restart PM2 server"
    echo "  logs         - Show server logs"
    echo ""
    echo -e "${GREEN}Cards & Images:${NC}"
    echo "  add-card     - Add a new card (interactive)"
    echo "  thumbs       - Generate missing thumbnails"
    echo "  optimize     - Convert images to WebP"
    echo "  check-images - Verify all card images exist"
    echo ""
    echo -e "${GREEN}Code Quality:${NC}"
    echo "  lint         - Check for common issues"
    echo "  size         - Show project size breakdown"
    echo "  cleanup      - Remove temp files"
    echo ""
    echo -e "${GREEN}Backup & Deploy:${NC}"
    echo "  backup       - Create lightweight backup"
    echo "  deploy       - Deploy to Cloudflare"
    echo ""
    echo -e "${YELLOW}Usage: ./scripts/dev-helpers.sh [command]${NC}"
}

cmd_dev() {
    echo -e "${BLUE}🔨 Building and starting dev server...${NC}"
    npm run build
    fuser -k 3000/tcp 2>/dev/null || true
    pm2 restart numbahwan-guild 2>/dev/null || pm2 start ecosystem.config.cjs
    echo -e "${GREEN}✓ Server running at http://localhost:3000${NC}"
}

cmd_build() {
    echo -e "${BLUE}🔨 Building production...${NC}"
    npm run build
    echo -e "${GREEN}✓ Build complete: dist/${NC}"
}

cmd_restart() {
    echo -e "${BLUE}🔄 Restarting server...${NC}"
    fuser -k 3000/tcp 2>/dev/null || true
    pm2 restart numbahwan-guild
    echo -e "${GREEN}✓ Server restarted${NC}"
}

cmd_logs() {
    pm2 logs numbahwan-guild --nostream --lines 50
}

cmd_thumbs() {
    echo -e "${BLUE}🖼️  Generating missing thumbnails...${NC}"
    CARDS_DIR="public/static/images/cards"
    THUMBS_DIR="$CARDS_DIR/thumbs"
    mkdir -p "$THUMBS_DIR"
    
    count=0
    for img in "$CARDS_DIR"/*.webp; do
        [ -f "$img" ] || continue
        name=$(basename "$img")
        thumb="$THUMBS_DIR/$name"
        if [ ! -f "$thumb" ]; then
            convert "$img" -resize 320x448 -quality 80 "$thumb"
            echo "  Created: $name"
            ((count++))
        fi
    done
    
    echo -e "${GREEN}✓ Generated $count new thumbnails${NC}"
}

cmd_optimize() {
    echo -e "${BLUE}🗜️  Converting images to WebP...${NC}"
    CARDS_DIR="public/static/images/cards"
    
    count=0
    for img in "$CARDS_DIR"/*.png "$CARDS_DIR"/*.jpg; do
        [ -f "$img" ] || continue
        name=$(basename "${img%.*}")
        webp="$CARDS_DIR/$name.webp"
        if [ ! -f "$webp" ]; then
            convert "$img" -quality 85 -resize "1024x1024>" "$webp"
            rm "$img"
            echo "  Converted: $name"
            ((count++))
        fi
    done
    
    echo -e "${GREEN}✓ Converted $count images to WebP${NC}"
}

cmd_check_images() {
    echo -e "${BLUE}🔍 Checking card images...${NC}"
    
    missing=0
    total=0
    
    # Get all img fields from cards-v2.json
    for img in $(grep -o '"img": "[^"]*"' public/static/data/cards-v2.json | sed 's/"img": "//;s/"$//'); do
        total=$((total + 1))
        if [ ! -f "public/static/images/cards/$img" ]; then
            echo -e "  ${RED}✗ Missing: $img${NC}"
            missing=$((missing + 1))
        fi
    done
    
    if [ $missing -eq 0 ]; then
        echo -e "${GREEN}✓ All $total card images present${NC}"
    else
        echo -e "${RED}✗ Missing $missing of $total images${NC}"
    fi
}

cmd_lint() {
    echo -e "${BLUE}🔍 Checking code quality...${NC}"
    
    # Count console.logs
    logs=$(grep -r "console\.log" public/*.html public/static/*.js 2>/dev/null | wc -l)
    echo "  Console.log statements: $logs"
    
    # Check for TODO/FIXME
    todos=$(grep -r "TODO\|FIXME" public/*.html public/static/*.js 2>/dev/null | wc -l)
    echo "  TODO/FIXME comments: $todos"
    
    # Check for hardcoded URLs
    hardcoded=$(grep -r "localhost\|127\.0\.0\.1" public/*.html 2>/dev/null | wc -l)
    echo "  Hardcoded localhost: $hardcoded"
    
    echo -e "${GREEN}✓ Lint complete${NC}"
}

cmd_size() {
    echo -e "${BLUE}📊 Project Size Breakdown:${NC}"
    echo ""
    echo "Total project:"
    du -sh .
    echo ""
    echo "By folder:"
    du -sh */ .git 2>/dev/null | sort -hr | head -10
    echo ""
    echo "Static assets:"
    du -sh public/static/*/ 2>/dev/null | sort -hr
    echo ""
    echo "Card images:"
    ls public/static/images/cards/*.webp 2>/dev/null | wc -l | xargs -I {} echo "  {} full images"
    ls public/static/images/cards/thumbs/*.webp 2>/dev/null | wc -l | xargs -I {} echo "  {} thumbnails"
}

cmd_cleanup() {
    echo -e "${BLUE}🧹 Cleaning up...${NC}"
    
    rm -rf .wrangler/tmp/* 2>/dev/null
    rm -f *.log 2>/dev/null
    rm -rf dist 2>/dev/null
    
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

cmd_backup() {
    echo -e "${BLUE}💾 Creating lightweight backup...${NC}"
    
    BACKUP_NAME="numbahwan-tcg-$(date +%Y%m%d-%H%M%S).tar.gz"
    cd ..
    tar --exclude='webapp/node_modules' \
        --exclude='webapp/.git' \
        --exclude='webapp/dist' \
        --exclude='webapp/.wrangler' \
        -czf "$BACKUP_NAME" webapp
    
    SIZE=$(ls -lh "$BACKUP_NAME" | awk '{print $5}')
    echo -e "${GREEN}✓ Created: $BACKUP_NAME ($SIZE)${NC}"
}

cmd_deploy() {
    echo -e "${BLUE}🚀 Deploying to Cloudflare...${NC}"
    npm run build
    npx wrangler pages deploy dist --project-name numbahwan-tcg
    echo -e "${GREEN}✓ Deployed!${NC}"
}

cmd_add_card() {
    echo -e "${BLUE}🎴 Add New Card (Interactive)${NC}"
    echo ""
    
    read -p "Card ID (e.g., 109): " card_id
    read -p "Card Name: " card_name
    read -p "Rarity (common/uncommon/rare/epic/legendary/mythic): " rarity
    read -p "Role (grinder/whale/lurker/simp/troll/carry/leech): " role
    read -p "Category (member/moment/gear/vibe/spot): " category
    read -p "Image filename (without extension): " img_name
    read -p "Description: " desc
    
    # Generate stats based on rarity
    case $rarity in
        mythic)    atk=$((8 + RANDOM % 5)); hp=$((12 + RANDOM % 5)); cost=$((7 + RANDOM % 3)) ;;
        legendary) atk=$((6 + RANDOM % 4)); hp=$((10 + RANDOM % 4)); cost=$((6 + RANDOM % 3)) ;;
        epic)      atk=$((5 + RANDOM % 3)); hp=$((8 + RANDOM % 3)); cost=$((5 + RANDOM % 2)) ;;
        rare)      atk=$((4 + RANDOM % 3)); hp=$((6 + RANDOM % 3)); cost=$((4 + RANDOM % 2)) ;;
        uncommon)  atk=$((3 + RANDOM % 2)); hp=$((4 + RANDOM % 3)); cost=$((3 + RANDOM % 2)) ;;
        *)         atk=$((2 + RANDOM % 2)); hp=$((3 + RANDOM % 2)); cost=$((2 + RANDOM % 2)) ;;
    esac
    
    echo ""
    echo -e "${YELLOW}Card Preview:${NC}"
    echo "  ID: $card_id"
    echo "  Name: $card_name"
    echo "  Rarity: $rarity"
    echo "  Stats: ATK $atk | HP $hp | Cost $cost"
    echo "  Image: $img_name.webp"
    echo ""
    
    read -p "Add to cards-v2.json? (y/n): " confirm
    if [ "$confirm" = "y" ]; then
        echo -e "${GREEN}✓ Card template ready. Add to cards-v2.json manually.${NC}"
        echo ""
        echo "JSON snippet:"
        cat << EOF
{
  "id": $card_id,
  "name": { "en": "$card_name", "zh": "$card_name", "th": "$card_name" },
  "rarity": "$rarity",
  "role": "$role",
  "category": "$category",
  "img": "$img_name.webp",
  "desc": { "en": "$desc" },
  "set": "core",
  "gameStats": { "atk": $atk, "hp": $hp, "cost": $cost, "spd": 5, "crit": 5, "dodge": 5 },
  "abilities": [],
  "special": ""
}
EOF
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

case "${1:-help}" in
    dev)          cmd_dev ;;
    build)        cmd_build ;;
    restart)      cmd_restart ;;
    logs)         cmd_logs ;;
    thumbs)       cmd_thumbs ;;
    optimize)     cmd_optimize ;;
    check-images) cmd_check_images ;;
    lint)         cmd_lint ;;
    size)         cmd_size ;;
    cleanup)      cmd_cleanup ;;
    backup)       cmd_backup ;;
    deploy)       cmd_deploy ;;
    add-card)     cmd_add_card ;;
    *)            cmd_help ;;
esac
