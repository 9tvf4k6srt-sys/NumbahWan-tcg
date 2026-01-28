#!/bin/bash
# NumbahWan Guild - Quick Restore Script
# Usage: ./restore.sh [backup_url]

set -e

BACKUP_URL="${1:-https://www.genspark.ai/api/files/s/mxiiyZG5}"
WEBAPP_DIR="/home/user/webapp"

echo "🚀 NumbahWan Guild Restore Script"
echo "=================================="

# Check if we're restoring from URL or if files exist
if [ ! -f "$WEBAPP_DIR/package.json" ]; then
    echo "📦 Downloading backup from: $BACKUP_URL"
    curl -L "$BACKUP_URL" -o /tmp/backup.tar.gz
    
    echo "📂 Extracting to /home/user/"
    tar -xzf /tmp/backup.tar.gz -C /home/user/
    rm /tmp/backup.tar.gz
fi

echo "📁 Navigating to $WEBAPP_DIR"
cd "$WEBAPP_DIR"

echo "📥 Installing dependencies..."
npm install

echo "🔨 Building project..."
npm run build

echo "🚀 Starting server with PM2..."
pm2 delete numbahwan-guild 2>/dev/null || true
pm2 start ecosystem.config.cjs

echo "⏳ Waiting for server to start..."
sleep 3

echo "✅ Testing endpoints..."
echo "  Health: $(curl -s http://localhost:3000/api/health | head -c 50)"
echo "  Cards:  $(curl -s http://localhost:3000/api/cards/stats | jq -r '.stats.total') cards"

echo ""
echo "=================================="
echo "✅ Restore Complete!"
echo ""
echo "📍 Local URL: http://localhost:3000"
echo "📖 Debug API: http://localhost:3000/api/debug"
echo "📚 AI Guide:  $WEBAPP_DIR/AI-README.md"
echo ""
echo "Quick Commands:"
echo "  pm2 logs numbahwan-guild --nostream  # View logs"
echo "  pm2 restart numbahwan-guild          # Restart server"
echo "  npm run build                        # Rebuild after changes"
