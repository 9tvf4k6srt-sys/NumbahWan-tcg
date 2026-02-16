# Cinematic Trailer Pipeline

## Overview

The NWG cinematic trailer pipeline is a structured system for generating, verifying, and iterating on AI-produced visual assets. It manages the production of a 2:45 trailer with 11 keyframe scenes across 4 narrative acts, 7 distinct characters, and multiple verification passes per scene.

The pipeline has completed 31 iterations across all scenes and is currently at version 6.0.

## Pipeline Phases

```
Phase 1: Character Design     ← COMPLETE (7 characters locked in bible)
Phase 2: Keyframe Generation  ← COMPLETE (11/11 scenes verified)
Phase 3: Video Generation     ← NEXT (keyframe → 5-10s video clips)
Phase 4: Assembly & Scoring   ← PENDING (concatenation, music, final encode)
```

## Phase 1 — Character Design

### Character Bible (`pipeline/characters/character-bible.json`)

Single source of truth for all character visual specifications. Every image generation request references this file. The bible defines:

- **Physical traits**: Skin hex, height, build, age range
- **Hair**: Color hex, highlight hex, style keywords, volume descriptors
- **Face**: Eye color, shape, expression, distinguishing features
- **Headwear**: Type, description, color, prompt keywords, negative prompts
- **Outfit**: Top, bottom, inner layer, material, colors (primary/secondary/accent)
- **Wings**: Type, colors (inner/outer/mechanical), span, prompt keywords
- **Weapon**: Type, description, colors
- **Accessories**: Ordered list with PRIMARY identifiers marked
- **Color palette**: Dominant, secondary, accent hex arrays
- **UE5 prompt**: Full generation prompt incorporating all specs
- **CRITICAL_NOTEs**: Permanent annotations from repeated generation failures

### Verification Checklist (4 Levels)

Every generated image — reference sheets and keyframes — is checked against:

| Level | Purpose | Checks |
|-------|---------|--------|
| L1: Silhouette | Shape recognition at thumbnail size | Wing type, hair volume, weapon shape |
| L2: Color | Hex value matching within tolerance | Hair, outfit, wings, skin — all ±15% |
| L3: Detail | Feature accuracy | Glasses, headband shape, specific accessories, text on vest |
| L4: Consistency | Cross-scene coherence | Art style (UE5, not anime), lighting, proportions |

### Recursive Refinement

```
Step 1: Generate using ue5Prompt + reference image
Step 2: Verify against checklist levels 1–4
Step 3: Log specific deviations
Step 4: Adjust prompt (add negatives, emphasize missed features)
Step 5: Regenerate with adjusted prompt + previous best as reference
Step 6: Compare new vs previous — keep the better one
Step 7: If L1–L3 checks still fail, recurse (max 3 iterations)
Step 8: When all checks pass AND owner approves → LOCK
```

## Phase 2 — Keyframe Generation

### Scene Manifest (`pipeline/keyframes/keyframe-manifest.json`)

Tracks every scene with:
- Scene ID, name, narrative act, timecode
- Current file name and version number
- `previousFiles[]` — full ancestry of all prior versions
- Source URL of the generation output
- Character references used
- Verification notes per version
- Revision log documenting every change across all versions

### The 12 Scenes

| # | Scene | Act | Duration | Characters | Version |
|---|-------|-----|----------|-----------|---------|
| 01 | Birth — Castle Reveal | 1 | 8s | — | v2 |
| 02 | The Living World — 8 Biomes | 1 | 22s | — | v2 |
| 03 | Companions — Player Meets CIA | 2 | 22s | CIA | v2 |
| 04 | Cards & Combat — Card Deck | 2 | 20s | Natehouoho | v4 |
| 05 | Castle Life — Tavern Strategy | 2 | 18s | RegginA, CIA | v3 |
| 06 | DLC 1: The Abyss — Frost Wyrm | 3 | 12s | RegginA | v4 |
| 07 | DLC 2&3: Sky Islands | 3 | 13s | Panthera, Santaboy | v3 |
| 08 | DLC 4: Forgotten Floor | 3 | 8s | RegginO, Sweetiez | v2 |
| 09 | DLC 5: R.M.S. REGINA — Luxury Amenities | 3 | 12s | RegginA, Natehouoho, RegginO, CIA | v8 |
| 10 | Samsara — Wheel of Rebirth | 4 | 20s | Panthera, RegginA, RegginO | v4 |
| 11 | Guild Assembles | 4 | 10s | All 7 | v3 |
| 12 | Raid Boss — Harpseal Zakum | Bonus | Boss | Harpseal Zakum, RegginA, Natehouoho | v1 |

### Iteration History

Total: 39 iterations across 12 scenes. Key corrections:

| Issue | Affected | Resolution |
|-------|----------|------------|
| Castle architecture inconsistency | Scenes 01, 02 | Regenerated using shared reference image |
| Wolf instead of French Bulldog | Scene 03 | Character bible corrected, CIA breed locked |
| RegginA skin/hair/outfit wrong | Scenes 05, 06, 11 | Reference sheet v5 created, all scenes regenerated |
| RegginA headband wrong shape | Scenes 05, 06, 10 | CRITICAL_NOTE added to bible, 5+ iterations |
| Panthera wings gold instead of dark | Scene 07 | Explicit color emphasis in prompt, wings now #1A237E/#4A0066 |
| Card scene showed dragon summon | Scene 04 | Replaced with character checking card deck from pocket |
| Scenes 09/10 had no guild characters | Scenes 09, 10 | Regenerated with characters to show game depth |
| Raid boss ref sheet missing elements | Harpseal Zakum v1–v2 | Iterated 3 times: v1 missing shades/beard/armor; v2 added shades+beard; v3 all checks passed. Locked. |
| RegginA/RegginO shown with light skin | Scene 09 | Owner directive: both have DARK BROWN skin. Bible updated #6B4226/#5C3A1E. Scene 09 regenerated 8 times. |
| Natehouoho wings protruding through slide | Scene 09 | Wing-folding rule added: wings retracted in enclosed spaces, spread in open air only |
| Scene 09 used historical SS Regina | Scene 09 | Replaced with luxury R.M.S. Regina matching regina.json specs (transparent slides, pools, modern mega-ship) |

### Review Dashboard (`pipeline/keyframes/review.html`)

Interactive HTML page for scene-by-scene review:
- Visual timeline showing all 11 scenes across 4 acts
- Character roster with scene presence tracking
- Per-scene cards with: image, metadata, version tag, emotion summary, verification checks
- Approve / Flag buttons per scene
- Export feedback as JSON for pipeline integration

## Phase 3 — Video Generation (Next)

### Plan

```
For each verified keyframe:
  1. Use keyframe PNG as first-frame reference
  2. Generate 5–10s video clip with camera motion + VFX
  3. Model: Seedance v1.5 Pro or equivalent
  4. Resolution: 1280×720 → scale to 854×480 (mobile target)
  5. Verify anatomical consistency + art style match
  6. Use last frame of Scene N as first frame of Scene N+1 for continuity
```

### Known Limitations

- Walking characters facing camera produce backwards-head glitches
- Back-facing / side-profile compositions work best
- Battle scenes: animate VFX, not character bodies
- Multi-character scenes lose identity at >3 characters

## Phase 4 — Assembly (Planned)

```
1. Scene concatenation with crossfades (ffmpeg)
2. Music generation (elevenlabs/music, epic orchestral)
3. Audio-video merge with fade alignment
4. Final encode: H.264 Constrained Baseline, Level 3.1
   - 800kbps target / 1200kbps max
   - Keyframes every 2s
   - movflags +faststart
   - AAC 96kbps stereo
   - Target: <10MB for mobile delivery
```

## File Structure

```
pipeline/
├── characters/
│   └── character-bible.json              # 8 characters, full visual specs (7 guild + 1 raid boss)
├── keyframes/
│   ├── keyframe-manifest.json            # Scene registry, versions, revision log
│   ├── review.html                       # Interactive review dashboard
│   ├── scene-{01..12}-*.png              # Keyframe images (all versions kept)
│   └── verify-scene-*.jpg                # 800px verification thumbnails
├── ref-sheets/
│   ├── reggina-ue5-refsheet-v{1..5}.png  # RegginA evolution (5 versions)
│   ├── harpseal-zakum-reggina-refsheet-v{1..3}.png  # Raid boss (3 versions, v3 locked)
│   ├── {character}-ue5-refsheet-v1.png   # Other character sheets
│   └── {character}-original-reference.png # MapleStory source references
├── verification/
│   └── verification-report.json          # 4-level check results per scene
├── verify.cjs                            # Verification runner
├── ASSEMBLER-SPEC.md                     # Phase 4 encoding spec
└── TODO.md                               # Pipeline task tracker
```

---

Last updated: 2026-02-16 · Pipeline version: 7.0
