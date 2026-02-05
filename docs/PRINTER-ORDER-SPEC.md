# NumbahWan TCG - Print Order Specification
## "Origins of NumbahWan" First Edition

> **Document Type**: Printer Order Specification  
> **Status**: Ready for Quotation  
> **Created**: 2026-02-05

---

## 📋 Order Summary

| Item | Specification |
|------|---------------|
| **Product Type** | Custom Trading Cards |
| **Set Name** | Origins of NumbahWan |
| **Total Unique Designs** | 50 cards |
| **Recommended Print Partner** | MakePlayingCards.com |
| **Target Completion** | 4-6 weeks from order |

---

## 🎴 Card Specifications

### Physical Dimensions
| Attribute | Value |
|-----------|-------|
| **Card Size** | 63mm × 88mm (Standard Poker/TCG size) |
| **With Bleed** | 65mm × 90mm (1mm bleed on all sides) |
| **Safe Zone** | 59mm × 84mm (2mm margin from edge) |
| **Corner Radius** | 3mm rounded corners |

### Card Stock
| Attribute | Specification |
|-----------|---------------|
| **Material** | 350gsm Black Core Cardstock |
| **Core Color** | Black (prevents light bleed) |
| **Thickness** | ~0.32mm per card |
| **Recommended Code** | S33 (MPC) or equivalent |

### Finish Options
| Rarity | Recommended Finish |
|--------|-------------------|
| **Mythic** | Holographic Foil Stamping + Linen |
| **Legendary** | Spot UV + Linen Texture |
| **Epic** | Linen Texture (S30) |
| **Rare** | Linen Texture (S30) |
| **Uncommon** | Matte Finish |
| **Common** | Matte Finish |

### Printing
| Attribute | Specification |
|-----------|---------------|
| **Color Mode** | Full Color CMYK |
| **Print Sides** | Both sides (4/4) |
| **Resolution** | 300 DPI minimum |
| **File Format** | PDF/X-1a or High-Res PNG |
| **Color Profile** | US Web Coated (SWOP) v2 |

---

## 📦 Print Quantities

### Card Distribution (First Print Run)

| Rarity | Unique Cards | Prints Per Card | Total Cards | % of Run |
|--------|--------------|-----------------|-------------|----------|
| Mythic | 4 | 250 | 1,000 | 0.15% |
| Legendary | 6 | 1,000 | 6,000 | 0.91% |
| Epic | 8 | 4,000 | 32,000 | 4.86% |
| Rare | 12 | 10,000 | 120,000 | 18.21% |
| Uncommon | 10 | 20,000 | 200,000 | 30.35% |
| Common | 10 | 30,000 | 300,000 | 45.52% |
| **TOTAL** | **50** | - | **659,000** | **100%** |

### Sample Order (Pilot Run)
For initial quality validation:

| Rarity | Prints Per Card | Total |
|--------|-----------------|-------|
| Mythic | 25 | 100 |
| Legendary | 50 | 300 |
| Epic | 100 | 800 |
| Rare | 200 | 2,400 |
| Uncommon | 250 | 2,500 |
| Common | 250 | 2,500 |
| **TOTAL** | - | **8,600** |

---

## 🖼️ File Delivery Requirements

### Card Front Files
```
📁 card-fronts/
├── mythic/
│   ├── OG-001-mythic-front.pdf
│   ├── OG-002-mythic-front.pdf
│   ├── OG-003-mythic-front.pdf
│   └── OG-004-mythic-front.pdf
├── legendary/
│   ├── OG-005-legendary-front.pdf
│   └── ... (6 files)
├── epic/
│   └── ... (8 files)
├── rare/
│   └── ... (12 files)
├── uncommon/
│   └── ... (10 files)
└── common/
    └── ... (10 files)
```

### Card Back Files
```
📁 card-backs/
├── standard-back.pdf          # Universal back design
└── holographic-back.pdf       # For Mythic cards (optional)
```

### QR Code Files (Per Card Batch)
```
📁 qr-codes/
├── mythic/
│   ├── OG-001/
│   │   ├── OG-001-print-001.png  (300 DPI, 20mm × 20mm)
│   │   ├── OG-001-print-002.png
│   │   └── ... (250 files)
│   └── ...
├── legendary/
│   └── ... (1000 files per card)
└── ...
```

### File Naming Convention
```
{SET_NUMBER}-{RARITY}-{SIDE}-{PRINT_NUMBER}.pdf

Examples:
- OG-001-mythic-front.pdf
- OG-001-mythic-back-print-047.pdf
- standard-back.pdf
```

---

## 📐 Print Layout Specifications

### Card Front Template
```
┌──────────────────────────────────────────────────┐
│  ← 1mm BLEED ZONE →                              │
│  ┌────────────────────────────────────────────┐  │
│  │ ← 2mm SAFE MARGIN →                        │  │
│  │                                            │  │
│  │  [1ST ED]              [RARITY BADGE]      │  │
│  │                                            │  │
│  │                                            │  │
│  │           CARD ART AREA                    │  │
│  │          (Full Bleed OK)                   │  │
│  │                                            │  │
│  │                                            │  │
│  │  [SET #]                      [PRINT #]    │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │        CARD INFO PANEL               │  │  │
│  │  │   Name • Category • Role             │  │  │
│  │  │   NWG: ◆1,500    YIELD: 5.0/day     │  │  │
│  │  │                          [NW LOGO]   │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
     63mm (65mm with bleed) × 88mm (90mm with bleed)
```

### Card Back Template
```
┌──────────────────────────────────────────────────┐
│                                                  │
│            ═══════════════════                   │
│               NUMBAHWAN TCG                      │
│            ═══════════════════                   │
│                                                  │
│                  ╔═══════╗                       │
│                  ║  NW   ║                       │
│                  ╚═══════╝                       │
│                                                  │
│               ORIGINS SET                        │
│                                                  │
│           ┌─────────────────┐                    │
│           │                 │                    │
│           │   [QR CODE]     │  ← 20mm × 20mm    │
│           │                 │                    │
│           └─────────────────┘                    │
│                                                  │
│          Scan to claim your                      │
│            digital card!                         │
│                                                  │
│            nwg.gg/claim                         │
│                                                  │
│        © 2026 NumbahWan Guild                   │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 💰 Cost Estimation

### Per-Card Costs (Estimated)

| Component | Low Estimate | High Estimate |
|-----------|--------------|---------------|
| Card printing (350gsm) | $0.08 | $0.12 |
| Linen finish | $0.02 | $0.04 |
| Holographic foil (Mythic only) | $0.15 | $0.25 |
| QR code printing | $0.01 | $0.02 |
| **Base card total** | **$0.11** | **$0.18** |

### Volume Pricing (MPC Estimates)

| Quantity | Price Per Card |
|----------|---------------|
| 1,000 | ~$0.20 |
| 10,000 | ~$0.12 |
| 50,000 | ~$0.10 |
| 100,000+ | ~$0.08 |

### First Print Run Budget

| Item | Quantity | Unit Cost | Total |
|------|----------|-----------|-------|
| Mythic cards (foil) | 1,000 | $0.35 | $350 |
| Legendary cards | 6,000 | $0.15 | $900 |
| Epic cards | 32,000 | $0.12 | $3,840 |
| Rare cards | 120,000 | $0.10 | $12,000 |
| Uncommon cards | 200,000 | $0.09 | $18,000 |
| Common cards | 300,000 | $0.08 | $24,000 |
| **Subtotal (cards)** | 659,000 | - | **$59,090** |
| Packaging materials | - | - | $8,000 |
| Shipping to warehouse | - | - | $3,000 |
| **TOTAL ESTIMATE** | - | - | **$70,090** |

---

## 📦 Packaging Requirements

### Standard Booster Pack ($5 MSRP)
- **Contents**: 5 cards per pack
- **Packaging**: Polybag with custom header card
- **Header Card Size**: 63mm × 50mm
- **Seal**: Top-fold with adhesive or heat seal
- **Features**: NW branding, rarity hint, pack number

### Premium Pack ($15 MSRP)
- **Contents**: 8 cards per pack
- **Packaging**: Foil polybag with holographic header
- **Header Card**: Premium design with foil elements
- **Includes**: Guaranteed rare+ card indicator

### Collector Box ($99 MSRP)
- **Contents**: 24 Standard + 2 Premium packs + promo card
- **Box Type**: 2-piece setup box (lid + base)
- **Box Size**: 180mm × 120mm × 80mm (approximate)
- **Material**: 1200gsm greyboard with printed wrap
- **Features**:
  - Full color printed exterior
  - Magnetic closure (premium option)
  - Foam insert for card protection
  - Collector's booklet pocket

---

## ✅ Pre-Flight Checklist

### Before Submitting to Printer

- [ ] All 50 card front designs at 300 DPI with 1mm bleed
- [ ] Card back design finalized with QR placeholder marked
- [ ] Color proofs reviewed and approved
- [ ] Text checked for typos and readability at print size
- [ ] All fonts outlined/embedded in PDF
- [ ] Black values set to rich black (C:40 M:40 Y:40 K:100)
- [ ] File names follow naming convention
- [ ] Test print ordered for quality check

### After Receiving Test Prints

- [ ] Color accuracy verified against screen proof
- [ ] Text legibility confirmed (especially small print)
- [ ] QR codes scan successfully
- [ ] Card stock opacity tested (no show-through)
- [ ] Corner cutting quality acceptable
- [ ] Finish (linen/matte) matches expectation
- [ ] Holographic elements (if applicable) look correct

---

## 📞 Recommended Print Partners

### Primary: MakePlayingCards.com
- **Website**: https://www.makeplayingcards.com
- **Product**: Custom Trading Cards (Poker Size)
- **Card Stock Options**: S30, S33 (recommended)
- **MOQ**: None (but better pricing at 1000+)
- **Lead Time**: 2-3 weeks (standard), 1 week (rush)
- **Shipping**: Worldwide, DHL/FedEx
- **Notes**: TCG specialty, excellent quality, good communication

### Alternative: The Game Crafter
- **Website**: https://www.thegamecrafter.com
- **Best For**: US-based, small runs, prototypes
- **MOQ**: 1 card
- **Lead Time**: 1-2 weeks

### Bulk Option: Alibaba Suppliers
- **Best For**: 50,000+ cards, maximum cost savings
- **MOQ**: Usually 5,000-10,000
- **Lead Time**: 4-6 weeks + shipping
- **Notes**: Requires careful QC, sample approval essential

---

## 📧 Order Template Email

```
Subject: Quote Request - NumbahWan TCG "Origins" Set

Hello,

I'm requesting a quote for a custom trading card print run:

PRODUCT: Custom Trading Cards
SET NAME: Origins of NumbahWan (First Edition)
UNIQUE DESIGNS: 50 cards
CARD SIZE: 63mm × 88mm (Poker/TCG standard)

CARD STOCK: 350gsm Black Core (S33 or equivalent)
FINISH: Mix of Linen and Matte (details attached)
PRINTING: Full color, both sides (4/4)

QUANTITIES:
- 4 Mythic designs × 250 each = 1,000 cards (with holographic foil)
- 6 Legendary designs × 1,000 each = 6,000 cards (with spot UV)
- 8 Epic designs × 4,000 each = 32,000 cards (linen)
- 12 Rare designs × 10,000 each = 120,000 cards (linen)
- 10 Uncommon designs × 20,000 each = 200,000 cards (matte)
- 10 Common designs × 30,000 each = 300,000 cards (matte)

TOTAL: 659,000 cards (50 unique designs)

SPECIAL REQUIREMENTS:
- Each card back has unique QR code (we will provide individual back files)
- Black core essential for opacity
- Corner radius: 3mm

TIMELINE: Need quote within 1 week, production 4-6 weeks preferred

Please provide:
1. Unit pricing at this volume
2. Pricing for sample order (8,600 cards for testing)
3. Turnaround time
4. Shipping options to [YOUR LOCATION]

I can provide print-ready PDF files upon confirmation.

Thank you,
[Your Name]
NumbahWan Guild
```

---

## 📁 File Locations in Project

```
webapp/
├── public/static/templates/print/
│   ├── card-front-template.svg    # Front design template
│   └── card-back-template.svg     # Back design with QR area
├── public/static/data/
│   └── physical-origins-set.json  # Complete set data
├── scripts/
│   └── generate-qr-codes.cjs      # QR code generator
├── migrations/
│   └── 003_physical_cards.sql     # Database schema
└── docs/
    ├── PHYSICAL-CARD-PRODUCTION.md  # Main production guide
    └── PRINTER-ORDER-SPEC.md        # This document
```

---

*Document Version: 1.0*  
*Created: 2026-02-05*  
*For: NumbahWan TCG Physical Cards Team*
