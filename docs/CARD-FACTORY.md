# 🏭 CARD FACTORY - Ultra Fast Card Creation

## 🚀 QUICK ADD (Copy-Paste Ready)

### Method 1: Add Cards via JSON (FASTEST - No Image Gen)
Just edit `/public/static/data/cards.json` and add to the `cards` array:

```json
{
  "id": 106,
  "name": "Dragon Emperor",
  "rarity": "mythic",
  "img": "mythic-106-dragon-emperor.jpg",
  "set": "origins",
  "reserved": false,
  "description": "Ancient dragon ruler"
}
```

Then rebuild: `npm run build && pm2 restart numbahwan-guild`

---

## 🎨 IMAGE GENERATION PROMPTS (Copy-Paste for AI)

### Mythic Card Prompt Template:
```
Generate a mythic trading card game artwork:
- Character: [CHARACTER NAME/DESCRIPTION]
- Style: Epic fantasy TCG art, legendary mythic creature, dramatic lighting, golden divine aura, ultra detailed
- Background: Dark purple gradient with golden particles and holy light rays
- Format: Centered character portrait, 768x1024, trading card game style
- Model: nano-banana-pro
- Aspect: 3:4
```

### Legendary Card Prompt Template:
```
Generate a legendary trading card game artwork:
- Character: [CHARACTER NAME/DESCRIPTION]
- Style: Fantasy TCG art, powerful boss creature, dramatic pose, glowing [ELEMENT] effects
- Background: Dark gradient with [COLOR] energy effects
- Format: Centered portrait, 768x1024, TCG style
- Model: nano-banana-pro
- Aspect: 3:4
```

### Epic Card Prompt Template:
```
Generate an epic trading card game artwork:
- Character: [CHARACTER NAME/DESCRIPTION]  
- Style: Fantasy card art, elite warrior, dynamic action pose, magical effects
- Background: Purple gradient with magical particles
- Format: Centered character, 768x1024
- Model: nano-banana-pro
- Aspect: 3:4
```

---

## 📦 BATCH ADD CARDS (AI Instructions)

When user says "Add these cards: [list]", AI should:

1. **Parse the list** into card objects
2. **Auto-assign IDs** (next available in each rarity range):
   - Mythic: 105+ 
   - Legendary: 209+
   - Epic: 309+
   - Rare: 409+
   - Uncommon: 500+
   - Common: 600+

3. **Generate image filename**: `{rarity}-{id}-{slug}.jpg`

4. **Add to cards.json** in one edit

5. **If images needed**, batch generate with prompts from templates

---

## 🔢 CURRENT ID RANGES

| Rarity | Reserved IDs | Next Available |
|--------|--------------|----------------|
| Mythic | 1, 101-105 | **106** |
| Legendary | 2, 27, 49, 201-208 | **209** |
| Epic | 3, 4, 6, 18-22, 29-30, 51, 54, 301-308 | **309** |
| Rare | 5, 8, 9, 11, 401-408 | **409** |
| Uncommon | 7, 12, 15, 501-530 | **531** |
| Common | 16, 17, 20, 601-640 | **641** |

---

## ⚡ SUPER FAST WORKFLOW

### Adding 1 Card (30 seconds):
```bash
# 1. Edit cards.json - add the card object
# 2. Rebuild
npm run build && pm2 restart numbahwan-guild
```

### Adding 10+ Cards (2 minutes):
```bash
# 1. Prepare card list in JSON format
# 2. AI batch-edits cards.json
# 3. Rebuild once
npm run build && pm2 restart numbahwan-guild
```

### Adding Cards WITH Images:
```bash
# 1. AI generates images using templates (batch if multiple)
# 2. Save to /public/static/cards/
# 3. Add card entries to cards.json
# 4. Rebuild once
npm run build && pm2 restart numbahwan-guild
```

---

## 📝 CARD OBJECT SCHEMA

```typescript
interface Card {
  id: number;           // Unique ID
  name: string;         // Display name
  rarity: "mythic" | "legendary" | "epic" | "rare" | "uncommon" | "common";
  img: string;          // Filename in /static/cards/
  set?: string;         // Card set (core, origins, legends, champions, warriors, basics, starters)
  reserved?: boolean;   // If true, cannot be pulled from gacha
  description?: string; // Flavor text
}
```

---

## 🎯 AI QUICK COMMANDS

User says → AI does:

- "Add card X" → Add to cards.json, rebuild
- "Add card X with image" → Generate image, save, add to JSON, rebuild
- "Add 5 new mythics" → Batch add 5 cards, optionally generate images
- "Show card template" → Show this document
- "What's the next mythic ID?" → Check cards.json, report next available

---

## 📁 FILE LOCATIONS

- **Card Database**: `/public/static/data/cards.json`
- **Card Images**: `/public/static/cards/`
- **Templates**: `/public/static/data/card-templates.json`
- **This Guide**: `/CARD-FACTORY.md`
