#!/bin/bash
# ============================================
# Preflight Check Script v1.0
# Run before deploy to verify everything works
# ============================================
# Usage: ./preflight.sh [--fix]
#   --fix  Attempt to auto-fix issues

set -e
cd /home/user/webapp

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

AUTOFIX=false
[ "$1" == "--fix" ] && AUTOFIX=true

ERRORS=0
WARNINGS=0

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  PREFLIGHT CHECK v1.0${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Function to report status
check() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
    return 0
  else
    echo -e "${RED}✗${NC} $2"
    ((ERRORS++))
    return 1
  fi
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

# ============================================
# 1. BUILD CHECK
# ============================================
echo -e "${BLUE}[1/6] Build Check${NC}"

npm run build > /tmp/build-output.txt 2>&1
BUILD_EXIT=$?
check $BUILD_EXIT "Build passes"

if [ $BUILD_EXIT -ne 0 ]; then
  echo "     Build output:"
  tail -10 /tmp/build-output.txt | sed 's/^/     /'
fi

# Check dist exists
[ -f "dist/_worker.js" ]
check $? "dist/_worker.js exists"

WORKER_SIZE=$(ls -lh dist/_worker.js | awk '{print $5}')
info "Worker bundle size: $WORKER_SIZE"

# ============================================
# 2. SERVICE CHECK
# ============================================
echo ""
echo -e "${BLUE}[2/6] Service Check${NC}"

# Check PM2
PM2_STATUS=$(pm2 list 2>/dev/null | grep -c "online" || echo "0")
[ "$PM2_STATUS" -gt 0 ]
check $? "PM2 service running"

if [ "$PM2_STATUS" -eq 0 ] && [ "$AUTOFIX" == "true" ]; then
  echo "     Attempting fix: pm2 restart all"
  pm2 restart all > /dev/null 2>&1
  sleep 2
fi

# Check port 3000
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
[ "$HTTP_CODE" == "200" ]
check $? "Port 3000 responding (HTTP $HTTP_CODE)"

if [ "$HTTP_CODE" != "200" ] && [ "$AUTOFIX" == "true" ]; then
  echo "     Attempting fix: fuser -k 3000/tcp && pm2 restart all"
  fuser -k 3000/tcp 2>/dev/null || true
  pm2 restart all > /dev/null 2>&1
  sleep 3
fi

# ============================================
# 3. ASSETS CHECK
# ============================================
echo ""
echo -e "${BLUE}[3/6] Assets Check${NC}"

ASSETS=(
  "/static/nw-card-frames.css"
  "/static/nw-card-renderer.js"
  "/static/nw-wallet.js"
  "/static/nw-core.css"
  "/static/data/cards.json"
)

ASSET_ERRORS=0
for asset in "${ASSETS[@]}"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$asset" 2>/dev/null || echo "000")
  if [ "$CODE" == "200" ]; then
    echo -e "${GREEN}✓${NC} $asset"
  else
    echo -e "${RED}✗${NC} $asset (HTTP $CODE)"
    ((ASSET_ERRORS++))
  fi
done

[ $ASSET_ERRORS -eq 0 ]
check $? "All core assets loading"

# ============================================
# 4. CARD DATA CHECK
# ============================================
echo ""
echo -e "${BLUE}[4/6] Card Data Check${NC}"

CARD_COUNT=$(cat public/static/data/cards.json | jq '.totalCards' 2>/dev/null || echo "0")
ACTUAL_COUNT=$(cat public/static/data/cards.json | jq '.cards | length' 2>/dev/null || echo "0")

[ "$CARD_COUNT" == "$ACTUAL_COUNT" ]
check $? "Card count consistent (totalCards: $CARD_COUNT, actual: $ACTUAL_COUNT)"

if [ "$CARD_COUNT" != "$ACTUAL_COUNT" ] && [ "$AUTOFIX" == "true" ]; then
  echo "     Attempting fix: updating totalCards"
  cat public/static/data/cards.json | jq ".totalCards = (.cards | length)" > /tmp/cards-fix.json
  mv /tmp/cards-fix.json public/static/data/cards.json
fi

# Check for missing images
MISSING_IMAGES=0
for img in $(cat public/static/data/cards.json | jq -r '.cards[].img' | head -20); do
  if [ ! -f "public/static/cards/$img" ]; then
    ((MISSING_IMAGES++))
  fi
done

[ $MISSING_IMAGES -eq 0 ]
check $? "Card images exist (checked first 20)"

[ $MISSING_IMAGES -gt 0 ] && warn "$MISSING_IMAGES images missing from first 20 cards"

info "Total cards: $CARD_COUNT"

# Rarity breakdown
echo "     Rarity breakdown:"
for rarity in mythic legendary epic rare uncommon common; do
  COUNT=$(cat public/static/data/cards.json | jq "[.cards[] | select(.rarity == \"$rarity\")] | length")
  echo "       $rarity: $COUNT"
done

# ============================================
# 5. PAGE CHECK
# ============================================
echo ""
echo -e "${BLUE}[5/6] Page Check${NC}"

PAGES=("/" "/forge" "/market" "/wallet" "/card-frames-demo")
PAGE_ERRORS=0

for page in "${PAGES[@]}"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$page" 2>/dev/null || echo "000")
  if [ "$CODE" == "200" ]; then
    echo -e "${GREEN}✓${NC} $page"
  else
    echo -e "${RED}✗${NC} $page (HTTP $CODE)"
    ((PAGE_ERRORS++))
  fi
done

[ $PAGE_ERRORS -eq 0 ]
check $? "All key pages loading"

# ============================================
# 6. GIT CHECK
# ============================================
echo ""
echo -e "${BLUE}[6/6] Git Check${NC}"

UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l)
[ "$UNCOMMITTED" -eq 0 ]
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} No uncommitted changes"
else
  warn "$UNCOMMITTED uncommitted files"
  git status --short | head -5 | sed 's/^/     /'
fi

BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
info "Current branch: $BRANCH"

LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null || echo "unknown")
info "Last commit: $LAST_COMMIT"

# ============================================
# SUMMARY
# ============================================
echo ""
echo -e "${CYAN}============================================${NC}"
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}  ✓ PREFLIGHT PASSED${NC}"
  echo -e "${CYAN}============================================${NC}"
  echo ""
  echo -e "  Ready to deploy!"
  echo -e "  Run: ${BLUE}npm run deploy${NC}"
  [ $WARNINGS -gt 0 ] && echo -e "  (with $WARNINGS warnings)"
else
  echo -e "${RED}  ✗ PREFLIGHT FAILED${NC}"
  echo -e "${CYAN}============================================${NC}"
  echo ""
  echo -e "  ${RED}$ERRORS errors${NC}, ${YELLOW}$WARNINGS warnings${NC}"
  echo -e "  Fix issues and run again."
  [ "$AUTOFIX" != "true" ] && echo -e "  Or run: ${BLUE}./preflight.sh --fix${NC}"
  exit 1
fi
