# NWG Pipeline — Permanent Feedback Learnings
> This file is the **fool-proof feedback loop memory**. Every correction from the owner is documented here.
> AI agents MUST read this file before generating ANY scene or character image.
> Last updated: 2026-02-16

---

## CRITICAL SKIN TONE RULES

| Character | Skin Tone | Hex | NEVER |
|-----------|-----------|-----|-------|
| **RegginA** | DARK BROWN, deep rich melanated skin | `#6B4226` | ❌ NOT fair, NOT pale, NOT tanned, NOT light |
| **RegginO** | DARK BROWN, deep rich melanated skin | `#5C3A1E` | ❌ NOT fair, NOT pale, NOT porcelain, NOT ivory |

> **Owner directive (2026-02-16):** "RegginO and RegginA skin tone is supposed to be dark."
> This overrides any earlier character bible entries. Both characters have DARK skin.

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
- ❌ NOT a 1900s steamship
- ❌ NOT wooden decks with oil lanterns
- ❌ NOT storm scenes (unless specifically requested)
- ❌ NOT dark/moody historical lighting
- ❌ NO smokestacks or masts

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
6. **Character positioning**: Characters should INTERACT with their environment, not just stand in front of it

---

## FEEDBACK LOG

| Date | Issue | Resolution | Scene |
|------|-------|------------|-------|
| 2026-02-16 | RegginA/RegginO shown with light skin | Updated bible to DARK BROWN (#6B4226, #5C3A1E) | Scene 09 |
| 2026-02-16 | Natehouoho wings protruding through water slide | Added wing-folding rule for enclosed spaces | Scene 09 |
| 2026-02-16 | Regina shown as historical steamship | Replaced with luxury mega-ship matching regina.json | Scene 09 |
| 2026-02-16 | Characters just standing on deck, not interacting with amenities | Added requirement: characters must INTERACT with ship features | Scene 09 |
