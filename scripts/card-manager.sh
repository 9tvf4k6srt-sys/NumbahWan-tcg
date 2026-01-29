#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# NUMBAHWAN CARD MANAGER v1.0
# Single command to manage all card operations
# ═══════════════════════════════════════════════════════════════════════════

CARDS_DIR="/home/user/webapp/public/static/images/cards"
THUMBS_DIR="$CARDS_DIR/thumbs"
DATA_FILE="/home/user/webapp/public/static/data/cards-v2.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cmd="$1"

# ═══════════════════════════════════════════════════════════════════════
# THUMBNAIL GENERATION
# ═══════════════════════════════════════════════════════════════════════
if [ "$cmd" = "thumbs" ] || [ "$cmd" = "generate-thumbs" ]; then
    echo -e "${BLUE}═══ Generating Thumbnails ═══${NC}"
    mkdir -p "$THUMBS_DIR"
    
    count=0
    for f in "$CARDS_DIR"/*.png "$CARDS_DIR"/*.jpg "$CARDS_DIR"/*.jpeg; do
        [ -f "$f" ] || continue
        base=$(basename "$f")
        name="${base%.*}"
        thumb="$THUMBS_DIR/${name}.webp"
        
        if [ ! -f "$thumb" ] || [ "$f" -nt "$thumb" ]; then
            echo -e "  ${YELLOW}Converting:${NC} $base -> ${name}.webp"
            convert "$f" -resize 320x448 -quality 80 "$thumb" 2>/dev/null
            count=$((count + 1))
        fi
    done
    
    echo -e "${GREEN}✓ Generated $count new thumbnails${NC}"
    echo -e "  Total thumbs: $(ls "$THUMBS_DIR"/*.webp 2>/dev/null | wc -l)"
    echo -e "  Thumbs size: $(du -sh "$THUMBS_DIR" | cut -f1)"
    exit 0
fi

# ═══════════════════════════════════════════════════════════════════════
# ADD NEW CARD IMAGE
# ═══════════════════════════════════════════════════════════════════════
if [ "$cmd" = "add" ] || [ "$cmd" = "add-image" ]; then
    if [ -z "$2" ]; then
        echo -e "${RED}Usage: $0 add <image-path> [new-name]${NC}"
        echo "  Example: $0 add ~/download/my-card.png legendary-newboss"
        exit 1
    fi
    
    src="$2"
    if [ ! -f "$src" ]; then
        echo -e "${RED}Error: File not found: $src${NC}"
        exit 1
    fi
    
    # Determine output name
    if [ -n "$3" ]; then
        name="$3"
    else
        name=$(basename "$src" | sed 's/\.[^.]*$//')
    fi
    
    ext="${src##*.}"
    dest="$CARDS_DIR/${name}.${ext}"
    
    echo -e "${BLUE}═══ Adding Card Image ═══${NC}"
    cp "$src" "$dest"
    echo -e "  ${GREEN}✓${NC} Copied to: $dest"
    
    # Generate thumbnail
    thumb="$THUMBS_DIR/${name}.webp"
    convert "$dest" -resize 320x448 -quality 80 "$thumb"
    echo -e "  ${GREEN}✓${NC} Thumbnail: $thumb"
    
    echo -e "\n${YELLOW}Next step:${NC} Add card data to cards-v2.json"
    exit 0
fi

# ═══════════════════════════════════════════════════════════════════════
# VERIFY CARD DATA
# ═══════════════════════════════════════════════════════════════════════
if [ "$cmd" = "verify" ] || [ "$cmd" = "check" ]; then
    echo -e "${BLUE}═══ Verifying Card System ═══${NC}"
    
    # Count cards in JSON
    json_count=$(python3 -c "import json; print(len(json.load(open('$DATA_FILE'))['cards']))")
    echo -e "  Cards in JSON: ${GREEN}$json_count${NC}"
    
    # Count images
    img_count=$(ls "$CARDS_DIR"/*.png "$CARDS_DIR"/*.jpg 2>/dev/null | wc -l)
    echo -e "  Card images: ${GREEN}$img_count${NC}"
    
    # Count thumbnails
    thumb_count=$(ls "$THUMBS_DIR"/*.webp 2>/dev/null | wc -l)
    echo -e "  Thumbnails: ${GREEN}$thumb_count${NC}"
    
    # Check for missing images
    echo -e "\n${YELLOW}Checking for missing images...${NC}"
    python3 -c "
import json
data = json.load(open('$DATA_FILE'))
missing = 0
import os
for c in data['cards']:
    img = '$CARDS_DIR/' + c['img']
    if not os.path.exists(img):
        print(f'  ✗ Missing: {c[\"img\"]}')
        missing += 1
if missing == 0:
    print('  ✓ All images present!')
else:
    print(f'  {missing} images missing')
"
    exit 0
fi

# ═══════════════════════════════════════════════════════════════════════
# STATS
# ═══════════════════════════════════════════════════════════════════════
if [ "$cmd" = "stats" ]; then
    echo -e "${BLUE}═══ Card System Stats ═══${NC}"
    echo -e "\n${YELLOW}Storage:${NC}"
    echo -e "  Full images: $(du -sh "$CARDS_DIR" --exclude=thumbs 2>/dev/null | cut -f1)"
    echo -e "  Thumbnails:  $(du -sh "$THUMBS_DIR" 2>/dev/null | cut -f1)"
    echo -e "  JSON data:   $(du -sh "$DATA_FILE" 2>/dev/null | cut -f1)"
    
    echo -e "\n${YELLOW}Counts by Rarity:${NC}"
    python3 -c "
import json
from collections import Counter
data = json.load(open('$DATA_FILE'))
counts = Counter(c['rarity'] for c in data['cards'])
order = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common']
for r in order:
    bar = '█' * min(counts.get(r, 0), 30)
    print(f'  {r:10s}: {counts.get(r, 0):3d} {bar}')
print(f'  {\"TOTAL\":10s}: {len(data[\"cards\"]):3d}')
"
    exit 0
fi

# ═══════════════════════════════════════════════════════════════════════
# LIST CARDS
# ═══════════════════════════════════════════════════════════════════════
if [ "$cmd" = "list" ]; then
    echo -e "${BLUE}═══ Card Inventory ═══${NC}"
    python3 -c "
import json
data = json.load(open('$DATA_FILE'))
cards = data['cards']
by_rarity = {}
for c in cards:
    r = c['rarity']
    by_rarity.setdefault(r, []).append(c)

order = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common']
for r in order:
    if r in by_rarity:
        print(f'\n{r.upper()} ({len(by_rarity[r])}):')
        for c in by_rarity[r][:5]:
            print(f\"  {c['id']:3d} | {c['name'][:40]}\")
        if len(by_rarity[r]) > 5:
            print(f'  ... and {len(by_rarity[r])-5} more')
"
    exit 0
fi

# ═══════════════════════════════════════════════════════════════════════
# HELP (Default)
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}       NUMBAHWAN CARD MANAGER v1.0${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Usage:${NC} $0 <command>"
echo ""
echo -e "${GREEN}Commands:${NC}"
echo "  thumbs          Generate WebP thumbnails for all images"
echo "  add <file>      Add a new card image + generate thumbnail"
echo "  verify          Check for missing images/thumbnails"
echo "  list            List all cards by rarity"
echo "  stats           Show storage and count statistics"
echo ""
echo -e "${YELLOW}Examples:${NC}"
echo "  $0 thumbs                    # Regenerate all thumbnails"
echo "  $0 add ~/new-card.png        # Add new card image"
echo "  $0 add ~/img.png epic-boss   # Add with custom name"
echo "  $0 verify                    # Check system integrity"
echo ""
echo -e "${BLUE}Data Files:${NC}"
echo "  Cards JSON: $DATA_FILE"
echo "  Images:     $CARDS_DIR/"
echo "  Thumbnails: $THUMBS_DIR/"
