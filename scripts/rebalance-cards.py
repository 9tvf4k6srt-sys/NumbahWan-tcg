#!/usr/bin/env python3
"""
NUMBAHWAN TCG - CARD RARITY REBALANCER
======================================
Rebalances card distribution for competitive TCG gameplay.

Target Distribution (Industry Standard):
- Mythic:    1-2%  (2-3 cards per 150)
- Legendary: 5%    (7-8 cards per 150)
- Epic:      10%   (15 cards per 150)
- Rare:      20%   (30 cards per 150)
- Uncommon:  30%   (45 cards per 150)
- Common:    35%   (52 cards per 150)

Current: 108 cards
Target:  Keep 108, redistribute rarities
"""

import json
import shutil
from datetime import datetime

# Load current data
with open('public/static/data/cards-v2.json', 'r') as f:
    data = json.load(f)

cards = data['cards']

# Create backup
backup_name = f'public/static/data/cards-v2-backup-{datetime.now().strftime("%Y%m%d-%H%M%S")}.json'
shutil.copy('public/static/data/cards-v2.json', backup_name)
print(f"✓ Backup created: {backup_name}")

# REBALANCING RULES
# =================
# Mythic (keep 2): RegginA Eternal Flame (1), The Sacred Log (107)
# Demote to Legendary: 101-106 (RegginA variants + Harlay)

MYTHIC_KEEP = [1, 107]  # Only the OG RegginA and Sacred Log stay mythic

# Legendary demotions to Epic
LEGENDARY_TO_EPIC = [205, 206, 209, 211]  # Webweaver, AFK Luna, 404, CAPS_LOCK

# Epic demotions to Rare  
EPIC_TO_RARE = [309, 310, 311, 312, 317, 318]  # Event cards -> Rare

# Track changes
changes = []

for card in cards:
    old_rarity = card['rarity']
    new_rarity = old_rarity
    
    # Mythic -> Legendary (except keepers)
    if card['rarity'] == 'mythic' and card['id'] not in MYTHIC_KEEP:
        new_rarity = 'legendary'
        
    # Legendary -> Epic (selected)
    elif card['id'] in LEGENDARY_TO_EPIC:
        new_rarity = 'epic'
        
    # Epic -> Rare (event cards)
    elif card['id'] in EPIC_TO_RARE:
        new_rarity = 'rare'
    
    if new_rarity != old_rarity:
        changes.append(f"  {card['id']}: {card['name']}: {old_rarity} → {new_rarity}")
        card['rarity'] = new_rarity

# Count new distribution
new_count = {}
for c in cards:
    r = c['rarity']
    new_count[r] = new_count.get(r, 0) + 1

print("\n" + "=" * 50)
print("REBALANCING COMPLETE")
print("=" * 50)

print(f"\nChanges made ({len(changes)}):")
for change in changes:
    print(change)

print("\n" + "-" * 50)
print("NEW DISTRIBUTION:")
print("-" * 50)

total = len(cards)
order = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common']
targets = {'mythic': 2, 'legendary': 5, 'epic': 10, 'rare': 20, 'uncommon': 30, 'common': 33}

for r in order:
    count = new_count.get(r, 0)
    pct = (count / total) * 100
    target_pct = targets[r]
    status = "✓" if abs(pct - target_pct) < 5 else "⚠"
    bar = '█' * int(pct / 2)
    print(f"{status} {r.upper():12} {count:3} cards ({pct:5.1f}%) target:{target_pct}% {bar}")

print("-" * 50)
print(f"TOTAL: {total} cards")

# Save updated data
with open('public/static/data/cards-v2.json', 'w') as f:
    json.dump(data, f, indent=2)

print(f"\n✓ Updated cards-v2.json")
print(f"✓ Backup at: {backup_name}")

# Recommendations
print("\n" + "=" * 50)
print("RECOMMENDATIONS FOR FUTURE:")
print("=" * 50)
print("""
To reach ideal competitive distribution, consider:

1. ADD MORE COMMON CARDS (+15-20):
   - Basic items, consumables, meme moments
   - These are "filler" for gacha but still fun

2. ADD MORE UNCOMMON CARDS (+10-15):
   - More gaming moments, minor characters
   - Good fodder for crafting/fusion systems

3. KEEP MYTHICS ULTRA-RARE:
   - Only 2 mythics keeps them special
   - Consider "limited banner" mythics for events

4. GACHA RATE SUGGESTIONS:
   - Mythic:    0.3% (1 in 333 pulls)
   - Legendary: 2%   (1 in 50 pulls)  
   - Epic:      8%   (1 in 12 pulls)
   - Rare:      20%  (1 in 5 pulls)
   - Uncommon:  35%  
   - Common:    34.7%

5. PITY SYSTEM (already implemented):
   - Mythic: 200 pull hard pity ✓
   - Legendary: 80 pull hard pity ✓
""")
