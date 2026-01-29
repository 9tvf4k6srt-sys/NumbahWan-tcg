#!/bin/bash
# AI Context Script - Run this to get full project overview
# Usage: ./ai-context.sh

cd /home/user/webapp

echo "=============================================="
echo "  NUMBAHWAN GUILD - AI CONTEXT DUMP"
echo "=============================================="
echo ""

echo "=== PROJECT INFO ==="
echo "Path: $(pwd)"
echo "Name: $(cat package.json 2>/dev/null | grep '"name"' | head -1 | cut -d'"' -f4)"
echo ""

echo "=== SERVICE STATUS ==="
pm2 list 2>/dev/null | grep -E "id|numbahwan" || echo "PM2 not running"
echo ""

echo "=== PORT 3000 ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/api/health 2>/dev/null || echo "Not responding"
echo ""

echo "=== RECENT COMMITS (last 5) ==="
git log --oneline -5 2>/dev/null || echo "No git"
echo ""

echo "=== KEY FILES (line counts) ==="
wc -l src/index.tsx \
      public/static/nw-card-renderer.js \
      public/static/nw-card-frames.css \
      public/static/nw-wallet.js \
      public/static/nw-core.css \
      2>/dev/null | head -6
echo ""

echo "=== HTML PAGES ($(ls public/*.html 2>/dev/null | wc -l)) ==="
ls public/*.html 2>/dev/null | xargs -I{} basename {} | tr '\n' ' '
echo ""
echo ""

echo "=== STATIC JS/CSS FILES ==="
ls -1 public/static/*.{js,css} 2>/dev/null | xargs -I{} basename {}
echo ""

echo "=== CARD DATA ==="
if [ -f "public/static/data/cards.json" ]; then
  echo "Cards: $(cat public/static/data/cards.json | grep -o '"id":' | wc -l)"
  echo "Rarities: $(cat public/static/data/cards.json | grep -o '"rarity"' | wc -l) defined"
fi
echo ""

echo "=== CARD IMAGES ==="
echo "Total: $(ls public/static/cards/*.jpg 2>/dev/null | wc -l) in root"
echo "Legendary: $(ls public/static/cards/legendary/*.jpg 2>/dev/null | wc -l)"
echo "Epic: $(ls public/static/cards/epic/*.jpg 2>/dev/null | wc -l)"
echo "Rare: $(ls public/static/cards/rare/*.jpg 2>/dev/null | wc -l)"
echo "Uncommon: $(ls public/static/cards/uncommon/*.jpg 2>/dev/null | wc -l)"
echo ""

echo "=== QUICK COMMANDS ==="
echo "Build:   npm run build"
echo "Restart: pm2 restart all"
echo "Logs:    pm2 logs --nostream"
echo "Test:    curl http://localhost:3000/api/health"
echo ""

echo "=== READ AI_CONTEXT.json FOR FULL DETAILS ==="
