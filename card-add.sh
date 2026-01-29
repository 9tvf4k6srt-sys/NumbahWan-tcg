#!/bin/bash
# ============================================
# Card Factory CLI v1.0
# Add cards with one command
# ============================================
# Usage: ./card-add.sh "Card Name" rarity "image_url" [--stats "ATK X | DEF Y"] [--set setname] [--desc "description"]
#
# Examples:
#   ./card-add.sh "Harlay, Dog of War" mythic "https://example.com/image.jpg"
#   ./card-add.sh "Fire Mage" epic "https://example.com/img.jpg" --stats "ATK 7 | DEF 5" --set origins
#   ./card-add.sh "Guild Slime" common "/local/path/image.jpg" --desc "A friendly slime"

set -e
cd /home/user/webapp

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
NAME="$1"
RARITY="$2"
IMAGE_URL="$3"
STATS=""
SET="core"
DESC=""

shift 3 || true

while [[ $# -gt 0 ]]; do
  case $1 in
    --stats)
      STATS="$2"
      shift 2
      ;;
    --set)
      SET="$2"
      shift 2
      ;;
    --desc)
      DESC="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Validation
if [ -z "$NAME" ] || [ -z "$RARITY" ] || [ -z "$IMAGE_URL" ]; then
  echo -e "${RED}ERROR: Missing required arguments${NC}"
  echo ""
  echo "Usage: ./card-add.sh \"Card Name\" rarity \"image_url\" [options]"
  echo ""
  echo "Arguments:"
  echo "  Card Name    - Name of the card (in quotes)"
  echo "  rarity       - mythic|legendary|epic|rare|uncommon|common"
  echo "  image_url    - URL to download or local file path"
  echo ""
  echo "Options:"
  echo "  --stats \"ATK X | DEF Y | COST Z\"  - Card stats"
  echo "  --set name                         - Set name (default: core)"
  echo "  --desc \"description\"              - Card description"
  echo ""
  echo "Example:"
  echo "  ./card-add.sh \"Dragon Knight\" legendary \"https://example.com/img.jpg\" --stats \"ATK 9 | DEF 7\""
  exit 1
fi

# Validate rarity
VALID_RARITIES="mythic legendary epic rare uncommon common"
if [[ ! " $VALID_RARITIES " =~ " $RARITY " ]]; then
  echo -e "${RED}ERROR: Invalid rarity '$RARITY'${NC}"
  echo "Valid options: $VALID_RARITIES"
  exit 1
fi

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  CARD FACTORY CLI v1.0${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Get next ID
NEXT_ID=$(cat public/static/data/cards.json | jq '.cards | map(.id) | max + 1')
echo -e "${BLUE}[1/5]${NC} Next card ID: ${GREEN}$NEXT_ID${NC}"

# Generate filename from name
FILENAME=$(echo "$NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')
FILENAME="${FILENAME}-${RARITY}.jpg"
FILEPATH="public/static/cards/$FILENAME"

echo -e "${BLUE}[2/5]${NC} Filename: ${GREEN}$FILENAME${NC}"

# Download or copy image
echo -e "${BLUE}[3/5]${NC} Getting image..."
if [[ "$IMAGE_URL" == http* ]]; then
  # It's a URL - try to download
  if command -v curl &> /dev/null; then
    # Check if it's a genspark file wrapper URL
    if [[ "$IMAGE_URL" == *"genspark.ai/api/files"* ]]; then
      echo -e "${YELLOW}     Detected Genspark file wrapper - use DownloadFileWrapper tool${NC}"
      echo -e "${YELLOW}     Saving URL for manual download: $IMAGE_URL${NC}"
      echo "$IMAGE_URL" > /tmp/pending_card_image.txt
      echo "PENDING:$FILEPATH" >> /tmp/pending_card_image.txt
      IMAGE_PENDING=true
    else
      curl -sL -o "$FILEPATH" "$IMAGE_URL"
      IMAGE_PENDING=false
    fi
  fi
elif [ -f "$IMAGE_URL" ]; then
  # It's a local file
  cp "$IMAGE_URL" "$FILEPATH"
  IMAGE_PENDING=false
else
  echo -e "${RED}ERROR: Cannot find image at '$IMAGE_URL'${NC}"
  exit 1
fi

if [ "$IMAGE_PENDING" != "true" ]; then
  FILESIZE=$(ls -lh "$FILEPATH" 2>/dev/null | awk '{print $5}')
  echo -e "     Downloaded: ${GREEN}$FILESIZE${NC}"
fi

# Build card JSON
echo -e "${BLUE}[4/5]${NC} Adding to cards.json..."

CARD_JSON=$(cat <<EOF
{
  "id": $NEXT_ID,
  "name": "$NAME",
  "rarity": "$RARITY",
  "img": "$FILENAME",
  "set": "$SET",
  "reserved": false
EOF
)

if [ -n "$DESC" ]; then
  CARD_JSON="$CARD_JSON,
  \"description\": \"$DESC\""
fi

if [ -n "$STATS" ]; then
  CARD_JSON="$CARD_JSON,
  \"stats\": \"$STATS\""
fi

CARD_JSON="$CARD_JSON
}"

# Add card to JSON
cat public/static/data/cards.json | jq ".cards += [$CARD_JSON] | .totalCards = (.cards | length)" > /tmp/cards-new.json
mv /tmp/cards-new.json public/static/data/cards.json

TOTAL=$(cat public/static/data/cards.json | jq '.totalCards')
echo -e "     Total cards: ${GREEN}$TOTAL${NC}"

# Build and restart
echo -e "${BLUE}[5/5]${NC} Building and restarting..."
npm run build > /dev/null 2>&1
pm2 restart all > /dev/null 2>&1

sleep 2

# Verify
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  CARD CREATED SUCCESSFULLY${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  ID:      ${CYAN}$NEXT_ID${NC}"
echo -e "  Name:    ${CYAN}$NAME${NC}"
echo -e "  Rarity:  ${CYAN}$RARITY${NC}"
echo -e "  Set:     ${CYAN}$SET${NC}"
echo -e "  Image:   ${CYAN}$FILENAME${NC}"
[ -n "$STATS" ] && echo -e "  Stats:   ${CYAN}$STATS${NC}"
[ -n "$DESC" ] && echo -e "  Desc:    ${CYAN}${DESC:0:50}...${NC}"
echo ""
echo -e "  View at: ${BLUE}/card-frames-demo${NC} (Mythic section)"
echo -e "  Image:   ${BLUE}/static/cards/$FILENAME${NC}"
echo ""

if [ "$IMAGE_PENDING" == "true" ]; then
  echo -e "${YELLOW}⚠ IMAGE PENDING: Use DownloadFileWrapper tool to download:${NC}"
  echo -e "${YELLOW}  URL: $IMAGE_URL${NC}"
  echo -e "${YELLOW}  Destination: $FILEPATH${NC}"
fi
