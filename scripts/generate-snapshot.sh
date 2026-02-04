#!/bin/bash
# Generate PROJECT-SNAPSHOT.md - complete project context in one file

OUT="PROJECT-SNAPSHOT.md"
echo "# NumbahWan Project Snapshot" > $OUT
echo "> Auto-generated: $(date '+%Y-%m-%d %H:%M')" >> $OUT
echo "" >> $OUT

# 1. All pages (what exists)
echo "## Pages ($(ls -1 public/*.html 2>/dev/null | wc -l) total)" >> $OUT
echo '```' >> $OUT
ls -1 public/*.html 2>/dev/null | sed 's|public/||' | sed 's|.html||' | sort | tr '\n' ', ' | sed 's/,$/\n/' >> $OUT
echo '```' >> $OUT
echo "" >> $OUT

# 2. Features by category (grep key patterns)
echo "## Features Implemented" >> $OUT
echo "" >> $OUT

echo "### Economy" >> $OUT
grep -l "NW_WALLET\|currency\|nwg\|wood\|gold" public/*.html public/static/*.js 2>/dev/null | wc -l | xargs -I{} echo "- {} files with economy logic" >> $OUT
echo "- Currencies: NWG, Wood, Gold, Diamond, Sacred Logs" >> $OUT
echo "- Daily login rewards (7-day streak)" >> $OUT
echo "- GM mode (infinite currency)" >> $OUT
echo "" >> $OUT

echo "### Cards & Collection" >> $OUT
echo "- $(ls -1 public/static/data/cards*.json 2>/dev/null | wc -l) card data files (seasons)" >> $OUT
echo "- Card upgrade system (1-5★)" >> $OUT
echo "- Card burning for Sacred Logs" >> $OUT
echo "- Forge/Gacha system" >> $OUT
echo "" >> $OUT

echo "### Battle" >> $OUT
echo "- Luck-based battle (3 cards)" >> $OUT
echo "- Difficulty levels" >> $OUT
echo "- Win streaks" >> $OUT
echo "" >> $OUT

echo "### Social/Guild" >> $OUT
echo "- Embassy system (cross-guild rewards)" >> $OUT
echo "- Sister guild: MatchaLatte" >> $OUT
echo "- Citizen ID system (NW-XXX)" >> $OUT
echo "- Cross-domain auth via URL params" >> $OUT
echo "" >> $OUT

echo "### i18n" >> $OUT
echo "- Languages: EN, 繁體中文, ไทย" >> $OUT
grep -l "data-i18n" public/*.html 2>/dev/null | wc -l | xargs -I{} echo "- {} pages with i18n" >> $OUT
echo "" >> $OUT

# 3. Recent commits (what changed)
echo "## Recent Changes (last 15 commits)" >> $OUT
echo '```' >> $OUT
git log --oneline -15 >> $OUT
echo '```' >> $OUT
echo "" >> $OUT

# 4. File structure (key dirs only)
echo "## Structure" >> $OUT
echo '```' >> $OUT
echo "public/           # 62 HTML pages" >> $OUT
echo "public/static/    # JS modules, CSS, images" >> $OUT
echo "public/static/data/  # Card JSON files" >> $OUT
echo "src/              # Hono backend" >> $OUT
echo "src/data/         # roster.json, translations" >> $OUT
echo '```' >> $OUT
echo "" >> $OUT

# 5. Key URLs
echo "## URLs" >> $OUT
echo "- Sandbox: https://3000-i8pqrv0s1id0a05f7rae2-583b4d74.sandbox.novita.ai" >> $OUT
echo "- MatchaLatte: https://3001-i8pqrv0s1id0a05f7rae2-583b4d74.sandbox.novita.ai" >> $OUT
echo "- GitHub: https://github.com/9tvf4k6srt-sys/NumbahWan-tcg" >> $OUT
echo "" >> $OUT

# 6. What's NOT built yet (grep for TODO/placeholder)
echo "## Potential Gaps (pages with minimal JS)" >> $OUT
for page in conspiracy intelligence museum research treasury citizenship invest; do
  if [ -f "public/${page}.html" ]; then
    lines=$(wc -l < "public/${page}.html")
    echo "- ${page}.html (${lines} lines)" >> $OUT
  fi
done
echo "" >> $OUT

# 7. Unique lore elements
echo "## Lore & Unique Elements" >> $OUT
echo "- The number 47 (recurring easter egg)" >> $OUT
echo "- RegginA misprint card" >> $OUT
echo "- Sacred Logs" >> $OUT
echo "- 13-floor Vault" >> $OUT
echo "- Zakum boss" >> $OUT
echo "- Therapy & HR departments (corporate satire)" >> $OUT
echo "- Court system" >> $OUT
echo "" >> $OUT

echo "---" >> $OUT
echo "*Run: bash scripts/generate-snapshot.sh to refresh*" >> $OUT

echo "Generated $OUT ($(wc -l < $OUT) lines)"
