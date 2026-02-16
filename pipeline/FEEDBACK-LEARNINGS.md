# NWG Pipeline — Permanent Feedback Learnings
> This file is the **fool-proof feedback loop memory**. Every correction from the owner is documented here.
> AI agents MUST read this file before generating ANY scene or character image.
> Last updated: 2026-02-16

---

## CRITICAL SKIN TONE RULES

| Character | Skin Tone | Hex | NEVER |
|-----------|-----------|-----|-------|
| **RegginA** | Warm golden-brown caramel, honey-bronze tanned skin | `#B8875A` | NOT fair, NOT pale, NOT very dark chocolate, NOT extremely dark |
| **RegginO** | Warm golden-brown caramel, honey-bronze tanned skin | `#B8875A` | NOT fair, NOT pale, NOT porcelain, NOT very dark chocolate, NOT extremely dark |

> **Owner directive (2026-02-16):** "RegginO and RegginA skin tone is supposed to be dark."
> **Owner refinement (2026-02-16):** "slightly brighten up the skin color a bit to be consistent throughout" — The very dark (#6B4226) was overcorrected vs. existing scenes (05, 10, 11) which show warm golden-brown. Adjusted first to #A0734B, then refined to #B8875A for best cross-scene consistency.
> Both characters have dark skin — warm golden-brown caramel, NOT fair/pale but NOT extremely dark either. Must MATCH each other in the same scene.

---

## WING POSITIONING RULES

| Character | Rule | Rationale |
|-----------|------|-----------|
| **Natehouoho** | Butterfly wings must be **FOLDED/RETRACTED** when in enclosed spaces (water slides, tunnels, corridors, vehicles) | Owner feedback: "the butterfly wings are protruding out of the slide, very dangerous positioning that affects our end result" |
| **Natehouoho** | Wings **FULLY SPREAD** only in open-air scenes (battlefields, outdoor arenas, guild halls, ship decks) | Logical physics consistency |
| **Panthera** | Same logic applies — angel wings retracted in tight spaces | Consistency |

> **Prompt engineering rule:** When a character with wings is INSIDE something (slide, vehicle, building), add to prompt:
> `"wings folded close to body, retracted for safety, NOT protruding through walls or structures"`

---

## R.M.S. REGINA SHIP ACCURACY

The R.M.S. Regina is a **MODERN LUXURY MEGA-SHIP**, NOT a historical steamship.

### Required Visual Elements (from regina.json):
- **22 decks**, 1,100m length — MASSIVE modern vessel
- **Aqua Rush Water Park**: 12 transparent-tube water slides (clear tubes, ocean views mid-slide)
- **12 swimming pools** (infinity pools, family pools, adults-only pools)
- **Horizon Coaster**: ocean-facing roller coaster on upper deck
- **Shark Tunnel Aquarium**: glass walk-through tunnel
- **Glass Biodome Safari**: visible dome with animals
- **Sky Deck Nightclub**: rooftop entertainment
- **Modern architecture**: glass, steel, LED lighting, luxury finishes

### NEVER for Regina scenes:
- NOT a 1900s steamship
- NOT wooden decks with oil lanterns
- NOT storm scenes (unless specifically requested)
- NOT dark/moody historical lighting
- NO smokestacks or masts

### Scene 09 Specific Requirements:
- Characters should be **ENJOYING the amenities** (swimming, sliding, lounging, eating)
- **Golden-hour sunset lighting** on the pool deck
- **Transparent tube water slides** visible in background
- Characters **interacting with the ship features**, not just standing on a generic deck

---

## GENERAL GENERATION RULES

1. **Always check this file** before generating character images
2. **Always cross-reference character-bible.json** for latest specs
3. **Physics consistency**: Wings, weapons, and accessories must respect the physical environment
4. **Ship accuracy**: When depicting named locations (Regina, guild hall, etc.), match the established specs
5. **Skin tones are NON-NEGOTIABLE**: Use the exact hex values from the bible
6. **Cross-scene consistency**: Skin tones, hair colors, outfits must match across ALL trailer scenes
7. **Character positioning**: Characters should INTERACT with their environment, not just stand in front of it

---

## FEEDBACK LOG

| Date | Issue | Resolution | Scene |
|------|-------|------------|-------|
| 2026-02-16 | RegginA/RegginO shown with light skin | Updated bible to DARK (#6B4226, #5C3A1E) — then refined to warm golden-brown #B8875A for cross-scene consistency | Scene 09 |
| 2026-02-16 | Skin tones too dark vs other scenes | Brightened from #6B4226 to #A0734B, then to #B8875A (warm golden-brown caramel) to match scenes 05, 10, 11 | Scene 09 |
| 2026-02-16 | RegginO skin darker than RegginA in same scene | Both must share EXACT SAME skin tone (#B8875A) — ensure matching within scenes | Scene 09 |
| 2026-02-16 | Natehouoho wings protruding through water slide | Added wing-folding rule for enclosed spaces | Scene 09 |
| 2026-02-16 | Regina shown as historical steamship | Replaced with luxury mega-ship matching regina.json | Scene 09 |
| 2026-02-16 | Characters just standing on deck, not interacting | Added requirement: characters must INTERACT with ship features | Scene 09 |
| 2026-02-16 | RegginA missing black headband prongs | Ensured headband with angular prong shapes visible in all generations | Scene 09 |
| 2026-02-16 | Natehouoho missing grey beanie | Added grey beanie to generation prompts | Scene 09 |
