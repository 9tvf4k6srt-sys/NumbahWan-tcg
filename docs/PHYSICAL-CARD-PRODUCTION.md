# NumbahWan TCG - Physical Card Production Guide
## "Origins of NumbahWan" First Edition Set

> **Status**: Ready for Production  
> **Last Updated**: 2026-02-05

---

## 📋 Quick Reference

| Specification | Value |
|--------------|-------|
| **Set Name** | Origins of NumbahWan |
| **Set ID** | `origins-v1` |
| **Total Cards** | 50 unique designs |
| **Card Size** | 63mm × 88mm (Standard TCG) |
| **Print Material** | 350gsm black core cardstock |
| **Finish** | Linen texture (S30) |
| **Print Type** | Full color CMYK, both sides |

---

## 🎴 Card Distribution

### Rarity Breakdown

| Rarity | Count | Print Per Card | Total Cards Printed | Pull Rate |
|--------|-------|----------------|---------------------|-----------|
| **Mythic** | 4 | 250 | 1,000 | 0.5% |
| **Legendary** | 6 | 1,000 | 6,000 | 2% |
| **Epic** | 8 | 4,000 | 32,000 | 8% |
| **Rare** | 12 | 10,000 | 120,000 | 18% |
| **Uncommon** | 10 | 20,000 | 200,000 | 30% |
| **Common** | 10 | 30,000 | 300,000 | 41.5% |
| **TOTAL** | **50** | - | **659,000** | 100% |

### Card List by Rarity

#### MYTHIC (4 cards)
| Set # | Card ID | Name | NWG Value |
|-------|---------|------|-----------|
| OG-001 | 1 | RegginA, The Eternal Flame | 1,500 |
| OG-002 | 2 | Harlay, Dog of War | 1,500 |
| OG-003 | 3 | RegginA, Paladin of Light | 1,500 |
| OG-004 | 107 | The Sacred Log | 1,500 |

#### LEGENDARY (6 cards)
| Set # | Card ID | Name | NWG Value |
|-------|---------|------|-----------|
| OG-005 | 101 | RegginA - Practicing Trainee | 500 |
| OG-006 | 102 | RegginA - Chain of the Undead | 500 |
| OG-007 | 103 | RegginA - Infernal Warlord | 500 |
| OG-008 | 104 | RegginA - Sky Sovereign | 500 |
| OG-009 | 105 | RegginA - Holy Paladin | 500 |
| OG-010 | 106 | Harlay, The Dog of War | 500 |

#### EPIC (8 cards)
| Set # | Card ID | Name | NWG Value |
|-------|---------|------|-----------|
| OG-011 | 202 | Burnout, The Eternal Grinder | 200 |
| OG-012 | 203 | Whaleford, The Unlimited Budget | 200 |
| OG-013 | 204 | Veteran, The Day-One Player | 200 |
| OG-014 | 205 | Webweaver, The Drama Spinner | 200 |
| OG-015 | 206 | AFK Luna, The Moonlit Slacker | 200 |
| OG-016 | 208 | Mochi, The Devoted Simp | 200 |
| OG-017 | 209 | 404, The Ghost Member | 200 |
| OG-018 | 211 | CAPS_LOCK, The Rage Quitter | 200 |

#### RARE (12 cards)
OG-019 to OG-030 - Server Crash, Ninja Loot, Rage Quit Spectacular, Accidental Pull, The Carry Diff, Maintenance Day, The Promised Update, Guild Drama Bomb, Newbie with Potential, The Alt Account, Dedicated Healer, One-Trick Pony

#### UNCOMMON (10 cards)
OG-031 to OG-040 - Various "Moment" cards

#### COMMON (10 cards)
OG-041 to OG-050 - Various "Vibe" and "Gear" cards

---

## 📐 Card Template Specifications

### Dimensions
```
┌────────────────────────────────────────┐
│  Card Size: 63mm × 88mm                │
│  Safe Zone: 59mm × 84mm (2mm inset)    │
│  Bleed Zone: 65mm × 90mm (1mm bleed)   │
│                                        │
│  Resolution: 300 DPI minimum           │
│  File Format: PDF/X-1a or PNG          │
│  Color Space: CMYK                     │
└────────────────────────────────────────┘
```

### Front Design Layout
```
┌──────────────────────────────────────────┐
│ ┌─[1ST ED]────────────[RARITY BADGE]─┐  │
│ │                                     │  │
│ │                                     │  │
│ │           CARD ART                  │  │
│ │         (Full Bleed)                │  │
│ │                                     │  │
│ │                                     │  │
│ │                                     │  │
│ ├─[SET #]──────────────[PRINT #]─────┤  │
│ │                                     │  │
│ │         CARD NAME                   │  │
│ │         Category • Role             │  │
│ │                                     │  │
│ │  NWG: ◆1,500     YIELD: 5.0/day    │  │
│ │                                     │  │
│ └────────────────────────[NW LOGO]───┘  │
└──────────────────────────────────────────┘
```

### Back Design
```
┌──────────────────────────────────────────┐
│                                          │
│         ╔═══════════════════╗           │
│         ║   NUMBAHWAN TCG   ║           │
│         ║                   ║           │
│         ║   [NW EMBLEM]     ║           │
│         ║                   ║           │
│         ║   ORIGINS SET     ║           │
│         ╚═══════════════════╝           │
│                                          │
│         ┌─────────────────┐             │
│         │  [QR CODE HERE] │             │
│         │                 │             │
│         │  Scan to claim  │             │
│         │  digital card!  │             │
│         └─────────────────┘             │
│                                          │
│         nwg.gg/claim                    │
│                                          │
│  © 2026 NumbahWan Guild                 │
└──────────────────────────────────────────┘
```

---

## 🔲 QR Code System

### URL Format
```
https://nwg.gg/claim?code={UNIQUE_CODE}

Example: https://nwg.gg/claim?code=OG47MYTHX1A2
```

### Code Generation Rules
```javascript
// Code format: {SET}{RARITY}{PRINT#}{CHECKSUM}
// Example: OG-47-MYTH-X1A2

// Components:
// OG = Origins set prefix
// 47 = Print number (1-250 for mythics)
// MYTH = Rarity code (MYTH, LGND, EPIC, RARE, UNCM, COMM)
// X1A2 = 4-character checksum (anti-counterfeit)

function generateCode(setNumber, printNumber, rarity) {
  const setPrefix = 'OG';
  const rarityCode = { mythic: 'MY', legendary: 'LG', epic: 'EP', rare: 'RA', uncommon: 'UC', common: 'CO' };
  const base = `${setPrefix}${printNumber.toString().padStart(3, '0')}${rarityCode[rarity]}`;
  const checksum = crc16(base).toString(16).toUpperCase().padStart(4, '0');
  return `${base}${checksum}`;
}

// Example output: OG047MYA7B2
```

### QR Code Specifications
- **Size**: 20mm × 20mm on card back
- **Error Correction**: Level M (15%)
- **Module Size**: Minimum 0.3mm
- **Quiet Zone**: 4 modules minimum
- **Format**: PNG at 300 DPI

---

## 🏭 Production Partners

### Recommended Printers

#### 1. MakePlayingCards.com (Primary)
- **Pros**: High quality, TCG expertise, good pricing
- **Card Stock**: S30 (310gsm smooth) or S33 (350gsm linen)
- **Finish**: Matte or Linen recommended
- **MOQ**: No minimum
- **Lead Time**: 2-3 weeks
- **Pricing**: ~$0.10-0.15 per card at volume

#### 2. The Game Crafter (US Alternative)
- **Pros**: US-based, fast shipping, good for prototypes
- **Card Stock**: 310gsm
- **MOQ**: 1 card
- **Lead Time**: 1-2 weeks
- **Pricing**: ~$0.20 per card

#### 3. Alibaba/DHgate (Bulk)
- **Pros**: Cheapest at scale (10,000+)
- **Cons**: Longer lead time, QC variability
- **MOQ**: Usually 1,000+
- **Pricing**: ~$0.03-0.08 per card

### Order Specifications Template
```
Product: Custom Trading Cards
Quantity: [X] cards
Size: 63mm x 88mm (Poker size)
Material: 350gsm Black Core
Finish: Linen (S33) or Matte
Printing: Full color both sides (4/4)
Packaging: [See below]
File Format: PDF/X-1a with 1mm bleed
```

---

## 📦 Packaging Options

### Standard Booster Pack ($5)
- 5 cards per pack
- Polybag with header card
- At least 1 Uncommon guaranteed
- Include: Pack art, NWG branding, scan code

### Premium Pack ($15)
- 8 cards per pack
- Foil header card
- At least 1 Rare guaranteed
- Includes: 200 NWG bonus code card

### Collector Box ($99)
- 24 Standard Packs + 2 Premium Packs
- Sturdy printed box (2-piece setup)
- Exclusive promo card (not in packs)
- 1 Legendary guaranteed
- 500 NWG bonus code
- Collector's booklet (optional)

---

## 💰 Cost Estimates

### Per-Card Production Costs
| Component | Cost/Unit |
|-----------|-----------|
| Card printing (350gsm linen) | $0.10 |
| QR code generation | $0.01 |
| Pack packaging | $0.15 |
| Box packaging | $2.50 |
| Shipping (unit) | ~$0.50 |
| **Total per card** | **~$0.75** |

### Revenue Projections (First Print Run)
| Product | Units | Unit Cost | Revenue | Margin |
|---------|-------|-----------|---------|--------|
| Standard Pack | 10,000 | $0.75 | $50,000 | 85% |
| Premium Pack | 3,000 | $1.50 | $45,000 | 90% |
| Collector Box | 1,000 | $30 | $99,000 | 70% |
| **Total** | - | - | **$194,000** | **~78%** |

---

## 🔒 Anti-Counterfeiting Measures

1. **Unique QR Codes** - One-time use, server validated
2. **Code Checksums** - CRC16 validation on claim
3. **Rate Limiting** - Max 10 claims per device per day
4. **IP Logging** - Track claim locations
5. **Print Numbering** - Every card has unique # (e.g., #47/250)
6. **Special Inks** (optional) - UV reactive elements for premium cards

---

## 📋 Pre-Production Checklist

### Art Assets
- [ ] All 50 card fronts at 300 DPI (2000×2800px minimum)
- [ ] Card back design finalized
- [ ] Rarity badge designs (6 variants)
- [ ] NW emblem/logo vectorized
- [ ] Font files licensed for print

### Technical
- [ ] QR code generation script tested
- [ ] Claim API deployed and tested
- [ ] Database seeded with 50 code templates
- [ ] Print-ready PDF templates created

### Business
- [ ] Production partner selected and quoted
- [ ] Payment terms agreed
- [ ] Shipping logistics planned
- [ ] Pre-sale page ready

### Quality
- [ ] Sample cards ordered
- [ ] Color proofs approved
- [ ] QR codes scan tested
- [ ] Packaging mockups reviewed

---

## 🚀 Launch Timeline

### Week 1-2: Preparation
- Finalize all card art
- Create print-ready files
- Order sample pack from MPC

### Week 3: Pre-Sale
- Announce set on guild Discord
- Open Collector Box pre-orders
- Reveal 30/50 cards

### Week 4-5: Production
- Submit final files to printer
- Generate all QR codes
- Seed database with claim codes

### Week 6: Fulfillment
- Receive printed cards
- Pack into packs/boxes
- Ship to early backers

### Week 7+: General Sale
- Full reveal of all 50 cards
- Open general sales
- Live pack opening streams

---

## 📁 File Locations

```
webapp/
├── public/static/data/
│   └── physical-origins-set.json    # Card data for physical set
├── public/static/images/cards/      # All card art
├── migrations/
│   └── 003_physical_cards.sql       # Database schema
├── src/index.tsx                    # API endpoints
├── public/claim.html                # Claim page UI
└── docs/
    └── PHYSICAL-CARD-PRODUCTION.md  # This document
```

---

## 🎯 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Pre-sale conversion | 30% of guild | Discord survey |
| Claim rate | 80% within 30 days | Database tracking |
| Resale value | 2x+ for Mythics | Secondary market |
| Customer satisfaction | 4.5+/5 stars | Post-purchase survey |
| Return customers | 40%+ | Box 2 pre-orders |

---

*Document Version: 1.0*  
*Created: 2026-02-05*  
*Author: NumbahWan Development Team*
