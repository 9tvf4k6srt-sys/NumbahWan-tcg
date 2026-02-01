#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# NumbahWan Icon Cropper - Automated icon generation from card art
# ═══════════════════════════════════════════════════════════════════════════
# Usage: ./scripts/icon-cropper.sh <input_image> <output_name> [crop_mode]
# 
# Crop Modes:
#   center    - Crop center square (default)
#   subject   - Smart crop focusing on main subject (requires coordinates)
#   custom    - Custom crop with specified coordinates
#
# Examples:
#   ./scripts/icon-cropper.sh image.png my-icon center
#   ./scripts/icon-cropper.sh image.png my-icon subject 50,50,200,200
#   ./scripts/icon-cropper.sh image.png my-icon custom 100,100,300,300
# ═══════════════════════════════════════════════════════════════════════════

set -e

INPUT="$1"
OUTPUT_NAME="$2"
CROP_MODE="${3:-center}"
CROP_COORDS="$4"

ICON_DIR="public/static/icons"
SIZES="64 128 256"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  NumbahWan Icon Cropper${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

# Validate input
if [ -z "$INPUT" ] || [ -z "$OUTPUT_NAME" ]; then
    echo -e "${RED}Error: Missing arguments${NC}"
    echo "Usage: $0 <input_image> <output_name> [crop_mode] [coordinates]"
    echo ""
    echo "Crop modes:"
    echo "  center  - Crop center square (default)"
    echo "  subject - Crop to coordinates: x1,y1,x2,y2"
    echo "  custom  - Same as subject"
    exit 1
fi

if [ ! -f "$INPUT" ]; then
    echo -e "${RED}Error: Input file not found: $INPUT${NC}"
    exit 1
fi

# Get image dimensions
DIMENSIONS=$(identify -format "%wx%h" "$INPUT")
WIDTH=$(echo $DIMENSIONS | cut -d'x' -f1)
HEIGHT=$(echo $DIMENSIONS | cut -d'x' -f2)

echo -e "${GREEN}Input:${NC} $INPUT ($DIMENSIONS)"
echo -e "${GREEN}Output:${NC} $OUTPUT_NAME"
echo -e "${GREEN}Mode:${NC} $CROP_MODE"

# Create temp directory
TEMP_DIR=$(mktemp -d)
CROPPED="$TEMP_DIR/cropped.png"

# Perform crop based on mode
case "$CROP_MODE" in
    center)
        # Calculate center square crop
        if [ "$WIDTH" -gt "$HEIGHT" ]; then
            SIZE=$HEIGHT
            OFFSET=$(( (WIDTH - HEIGHT) / 2 ))
            CROP_GEOMETRY="${SIZE}x${SIZE}+${OFFSET}+0"
        else
            SIZE=$WIDTH
            OFFSET=$(( (HEIGHT - WIDTH) / 2 ))
            CROP_GEOMETRY="${SIZE}x${SIZE}+0+${OFFSET}"
        fi
        echo -e "${YELLOW}Center crop:${NC} $CROP_GEOMETRY"
        convert "$INPUT" -crop "$CROP_GEOMETRY" +repage "$CROPPED"
        ;;
    
    subject|custom)
        if [ -z "$CROP_COORDS" ]; then
            echo -e "${RED}Error: Coordinates required for $CROP_MODE mode${NC}"
            echo "Format: x1,y1,x2,y2 (e.g., 50,50,200,200)"
            exit 1
        fi
        
        # Parse coordinates
        X1=$(echo $CROP_COORDS | cut -d',' -f1)
        Y1=$(echo $CROP_COORDS | cut -d',' -f2)
        X2=$(echo $CROP_COORDS | cut -d',' -f3)
        Y2=$(echo $CROP_COORDS | cut -d',' -f4)
        
        CROP_W=$((X2 - X1))
        CROP_H=$((Y2 - Y1))
        
        # Make it square (use larger dimension)
        if [ "$CROP_W" -gt "$CROP_H" ]; then
            DIFF=$(( (CROP_W - CROP_H) / 2 ))
            Y1=$((Y1 - DIFF))
            Y2=$((Y2 + DIFF))
            CROP_H=$CROP_W
        elif [ "$CROP_H" -gt "$CROP_W" ]; then
            DIFF=$(( (CROP_H - CROP_W) / 2 ))
            X1=$((X1 - DIFF))
            X2=$((X2 + DIFF))
            CROP_W=$CROP_H
        fi
        
        # Ensure bounds
        [ "$X1" -lt 0 ] && X1=0
        [ "$Y1" -lt 0 ] && Y1=0
        
        echo -e "${YELLOW}Subject crop:${NC} ${CROP_W}x${CROP_H}+${X1}+${Y1}"
        convert "$INPUT" -crop "${CROP_W}x${CROP_H}+${X1}+${Y1}" +repage "$CROPPED"
        ;;
    
    *)
        echo -e "${RED}Error: Unknown crop mode: $CROP_MODE${NC}"
        exit 1
        ;;
esac

# Generate multiple sizes
echo -e "\n${CYAN}Generating icon sizes...${NC}"

for SIZE in $SIZES; do
    OUTPUT_FILE="$ICON_DIR/${OUTPUT_NAME}-${SIZE}.webp"
    convert "$CROPPED" -resize ${SIZE}x${SIZE} -quality 90 "$OUTPUT_FILE"
    FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
    echo -e "  ${GREEN}✓${NC} ${OUTPUT_NAME}-${SIZE}.webp (${FILE_SIZE})"
done

# Also create a PNG version for maximum compatibility
OUTPUT_PNG="$ICON_DIR/${OUTPUT_NAME}-256.png"
convert "$CROPPED" -resize 256x256 "$OUTPUT_PNG"
FILE_SIZE=$(ls -lh "$OUTPUT_PNG" | awk '{print $5}')
echo -e "  ${GREEN}✓${NC} ${OUTPUT_NAME}-256.png (${FILE_SIZE})"

# Cleanup
rm -rf "$TEMP_DIR"

echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Done! Icons saved to $ICON_DIR/${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

# Show usage hint
echo -e "\n${CYAN}To use in HTML:${NC}"
echo -e "  <img src=\"/static/icons/${OUTPUT_NAME}-64.webp\" width=\"64\" height=\"64\">"
