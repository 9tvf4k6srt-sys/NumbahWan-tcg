#!/bin/bash
# =============================================================================
# NumbahWan Media Pipeline
# One-command download + compress workflow
# =============================================================================
#
# USAGE:
#   ./process-media.sh <manifest.json> <output_dir> [size] [quality]
#
# EXAMPLE:
#   ./process-media.sh wyckoff.json ./public/static/wyckoff 512 80
#
# MANIFEST FORMAT:
#   [
#     { "url": "https://www.genspark.ai/api/files/s/XXX", "name": "01-tsmc" },
#     { "url": "https://www.genspark.ai/api/files/s/YYY", "name": "02-aspeed" }
#   ]
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${BLUE}[PIPELINE]${NC} $1"; }
success() { echo -e "${GREEN}[DONE]${NC} $1"; }

# Parse arguments
MANIFEST="$1"
OUTPUT_DIR="$2"
SIZE="${3:-512}"
QUALITY="${4:-80}"

if [[ -z "$MANIFEST" || -z "$OUTPUT_DIR" ]]; then
    echo "Usage: $0 <manifest.json> <output_dir> [size] [quality]"
    echo ""
    echo "Example:"
    echo "  $0 wyckoff.json ./public/static/wyckoff 512 80"
    exit 1
fi

# Create temp and output directories
TEMP_DIR=$(mktemp -d)
mkdir -p "$OUTPUT_DIR"

log "Starting media pipeline..."
log "Manifest: $MANIFEST"
log "Output: $OUTPUT_DIR"
log "Size: ${SIZE}px, Quality: ${QUALITY}"
echo ""

# Step 1: Download
log "Step 1/3: Downloading files..."
node "$SCRIPT_DIR/download-media.js" "$MANIFEST" "$TEMP_DIR"

# Step 2: Compress to WebP
log "Step 2/3: Compressing to WebP..."
count=0
total=$(ls -1 "$TEMP_DIR"/*.png 2>/dev/null | wc -l)
total_before=0
total_after=0

for img in "$TEMP_DIR"/*.png; do
    [[ -f "$img" ]] || continue
    
    basename=$(basename "$img")
    name="${basename%.*}"
    output="$OUTPUT_DIR/${name}.webp"
    
    before=$(stat -c%s "$img" 2>/dev/null || stat -f%z "$img" 2>/dev/null)
    convert "$img" -resize "${SIZE}x${SIZE}" -quality "$QUALITY" "$output"
    after=$(stat -c%s "$output" 2>/dev/null || stat -f%z "$output" 2>/dev/null)
    
    total_before=$((total_before + before))
    total_after=$((total_after + after))
    count=$((count + 1))
    
    echo -ne "\r  Compressing: $count/$total files..."
done
echo ""

# Step 3: Cleanup
log "Step 3/3: Cleaning up..."
rm -rf "$TEMP_DIR"

# Summary
saved=$((total_before - total_after))
if [[ $total_before -gt 0 ]]; then
    percent=$((saved * 100 / total_before))
else
    percent=0
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Pipeline Complete                          ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
printf "║  Files processed: %-42s ║\n" "$count"
printf "║  Before:          %-42s ║\n" "$(numfmt --to=iec $total_before 2>/dev/null || echo "${total_before} bytes")"
printf "║  After:           %-42s ║\n" "$(numfmt --to=iec $total_after 2>/dev/null || echo "${total_after} bytes")"
printf "║  Saved:           %-42s ║\n" "$(numfmt --to=iec $saved 2>/dev/null || echo "${saved} bytes") (${percent}%)"
printf "║  Output:          %-42s ║\n" "$OUTPUT_DIR"
echo "╚═══════════════════════════════════════════════════════════════╝"

success "All done! Files ready at: $OUTPUT_DIR"
