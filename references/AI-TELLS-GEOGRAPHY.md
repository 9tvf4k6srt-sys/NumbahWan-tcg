# AI-Tells — Geography & Altitude

Running list of geographic, altitudinal, and architectural defaults that AI image models get wrong. Every entry started as a real catch on a real generation. Cite this file in every Taipei-bound or location-specific prompt.

**Rule**: every prompt must explicitly negate the relevant defaults. The model's training set is biased toward generic stock photography; we have to push it back to physics.

---

## Taipei high-rise office (30F+)

### TELL-TPE-001 — Scooter traffic streaks visible at street level

- **What the model does**: paints scooters or "scooter traffic streaks" below office windows because Taipei = scooters in training data.
- **Why it's wrong**: from a 30+ floor window you cannot see individual scooters. They are dots at most. Often you see no street at all because the angle is too steep.
- **What you actually see at altitude**:
  - Rooftops of mid-rise buildings (HVAC units, water tanks, faded waterproofing paint)
  - Other towers at peer height
  - Sliver of an **elevated expressway 高架道路** with concrete Jersey-barrier guardrails (**台灣高架護欄**) — vehicles indistinguishable as dots
  - Hazy mountain line on the horizon (陽明山 to the north, 觀音山 to the west)
  - Window reflection of the office interior partially visible on the glass
- **Prompt language to use**: "view from 38F window — distant tower rooftops, Taipei 101 silhouette mid-distance side-on, sliver of elevated expressway with concrete barriers far below, hazy mountain horizon, faint reflection of office interior on the glass"
- **Banned phrases**: `scooter streaks`, `street-level scooter traffic`, `motorbikes below`

### TELL-TPE-002 — Steel-mullion warehouse windows in a tower

- **What the model does**: paints heavy black steel-mullion warehouse windows because we asked for Van Duysen / Vervoordt aesthetic.
- **Why it's wrong**: Taipei tower offices use unitized curtain wall — large glass panes, thin aluminum joints, often dark anodized or matte black. Steel-mullion windows are a low-rise / warehouse / Antwerp tell.
- **What you actually see at altitude**:
  - 1.5m–3m wide vision panes
  - Thin aluminum vertical mullions every 1.5m, horizontal transom every 3.6m (typical floor-to-ceiling)
  - Sometimes a low spandrel panel at desk height
- **Prompt language to use**: "Taipei tower curtain-wall glazing, large panes, thin matte-black aluminum mullions, floor-to-ceiling, no steel-warehouse mullion grid"
- **Banned phrases**: `steel-mullion windows`, `factory-style mullions` (in tower contexts)

### TELL-TPE-003 — Magazine-cover oversized brand plaque

- **What the model does**: 80cm cast-brass logo plaque on the back wall, centered, magazine-cover scale.
- **Why it's wrong**: real working offices use 30–40cm plaques, off-center. The smaller the brand, the more confident the brand. Big logo = startup insecurity.
- **Prompt language to use**: "small cast-brass plaque, 30cm wide, off-center, dust on top edge"
- **Banned phrases**: `large brass emblem`, `hero logo wall`, `prominent brand mark`

### TELL-TPE-004 — Olive tree + leather chair + vinyl record stack-up

- **What the model does**: places a Mediterranean olive tree, oxblood leather lounge chair, and stack of vinyl records to signal "designer office".
- **Why it's wrong**: this exact set is the AD/Wallpaper cliché stack. Real Taipei wealth-management offices have ferns, banyan, or Buddha-pine 真柏, plus practical task furniture.
- **Prompt language to use**: name one specific plant ("a single 真柏 / Buddha-pine in a raw concrete planter"). No leather lounge chairs in working areas. No vinyl records in trading rooms.
- **Banned phrases**: `olive tree`, `vinyl records`, `oxblood leather lounge chair` (when stacked together)

### TELL-TPE-005 — Generic "Asian city skyline" silhouette

- **What the model does**: invents a fantasy skyline that reads "Asian city" but is no real place — wrong tower count, wrong proportions, no Taipei 101.
- **Why it's wrong**: Taipei skyline is dominated by Taipei 101 (508m, distinctive segmented bamboo form). Without it, the image could be Bangkok / KL / Shenzhen.
- **Prompt language to use**: "Taipei 101 silhouette mid-distance, side-on, segmented bamboo profile clearly readable, not centered in frame"
- **Banned phrases**: `Asian metropolis`, `futuristic skyline`, `glass towers cluster`

---

## Singapore CBD office (mid-floor 22–35F)

### TELL-SG-001 — Marina Bay Sands in every window

- **What the model does**: paints the iconic three-tower-with-ship MBS silhouette in every Singapore office window because SG = MBS in training data.
- **Why it's wrong**: most CBD offices (Tanjong Pagar, Shenton Way, Raffles Place) face peer towers — not Marina Bay. MBS is visible from a narrow arc, not 360°.
- **What you actually see**: peer-height curtain-wall towers (OUE Bayfront, Capital Tower, Guoco Tower, CapitaSpring), gaps showing the elevated AYE/ECP, a sliver of harbor with container ships at the edge of frame at most.
- **Prompt language to use**: "view from 28F Tanjong Pagar tower — adjacent CBD towers at peer height, sliver of elevated expressway far below, no Marina Bay Sands in frame, hazy equatorial horizon"
- **Banned phrases**: `Marina Bay Sands`, `MBS skyline`, `ship on towers`

### TELL-SG-002 — Supertrees framed in window

- **What the model does**: places Gardens by the Bay Supertrees in the window backdrop because SG = Supertrees in tourism training data.
- **Why it's wrong**: Supertrees are visible from a narrow southern arc and are dwarfed by tower-floor altitude. They don't appear in CBD-office reference photography.
- **Banned phrases**: `Supertrees`, `Gardens by the Bay`, `vertical garden towers outside`

### TELL-SG-003 — Hotel-lobby tropical luxury cliché

- **What the model does**: defaults to Aman / Raffles / Capella hotel-lobby aesthetics — koi ponds, palm clusters, lacquered black surfaces, infinity-edge water features.
- **Why it's wrong**: this is a working wealth-desk, not a hospitality lobby. Real CBD offices have used desks, cluttered books, kopi rings on teak.
- **Banned phrases**: `tropical luxury lobby`, `koi pond`, `infinity water feature`, `palm cluster indoors`

### TELL-SG-004 — Wrong electrical socket type

- **What the model does**: paints US flat-blade NEMA sockets in Singapore offices because Western training data dominates.
- **Why it's wrong**: Singapore uses **UK Type G** — three rectangular pins, switched, with a built-in shutter. Always.
- **Prompt language to use**: "UK Type G three-pin rectangular sockets with switches, plugs angled with the cable curving down"
- **Banned phrases**: `US sockets`, `flat-blade outlets` (in SG context)

### TELL-SG-005 — Generic Asian skyline without SG markers

- **What the model does**: invents a fantasy skyline with no identifiable Singapore towers.
- **What's correct**: include OUE Bayfront's distinctive sloped crown, CapitaSpring's vertical-garden cutout, Guoco Tower's stepped form. Or just keep peer-height office glass with no horizon "money shot" at all.

### TELL-SG-006 — Tropical foliage clichés stacked indoors

- **What the model does**: stacks palm tree + monstera + bird-of-paradise + fiddle-leaf fig in the same frame.
- **What's correct**: ONE plant. Climate-appropriate. Tembusu sapling, OR a single low monstera, OR a young rain tree — in a raw board-formed concrete planter. Restraint reads as confidence.
- **Banned phrases**: `lush tropical foliage`, `indoor jungle`, `verdant tropical greenery`

### TELL-SG-007 — Always-sunny equatorial light

- **What the model does**: cloudless blue-sky golden-hour light in every SG frame.
- **Why it's wrong**: Singapore's signature light is monsoon afternoons — heavy rain on the glass, grey-green tonality, interior practicals warm against cool exterior. Two of every six SG frames should be monsoon variant.
- **Prompt language to use**: "monsoon afternoon, heavy rain streaks on the curtain wall, grey-green diffuse light outside, 2700K tungsten practicals warming the interior"

---

## General altitude / location physics

### TELL-ALT-001 — Streetscape detail visible from high windows

Same family as TPE-001 but generalizable: from any window above ~10F you cannot see human-scale detail at street level. No faces, no individual vehicles, no shop signs. The model loves to add these because most training photos are taken at street level.

### TELL-ALT-002 — Indoor plants matched to wrong climate

Tropical/Mediterranean plants in cold-climate offices and vice versa. Olive trees in Taipei, snake plants in Stockholm. Pick climate-appropriate species.

### TELL-ALT-003 — Wrong electrical socket type

Three-prong sockets shown in countries that use two-prong, vice versa. Taiwan = NEMA 1-15 / 5-15 (two flat blades, optional ground), same as US/Japan. Not the chunky UK Type G or the European round Type F. The model often defaults to UK or EU sockets.

---

## How to use this file

1. **Before generating**: scan this list for any tells that apply to your scene type.
2. **In the prompt**: explicitly negate every applicable tell. Example: `Avoid: scooter traffic streaks, steel-mullion windows, oversized brand plaque (TELL-TPE-001/002/003).`
3. **After generating**: review against this list. Any tell present = automatic reject, regenerate.
4. **When you catch a new tell**: add a numbered entry here with what the model does, why it's wrong, the correction, and banned phrases. The corpus grows every time we catch one.

## Open entries needing more work

- TELL-TPE-006 — Taiwan signage typeface defaults (model often uses Simplified Chinese 简体 instead of Traditional 繁體)
- TELL-TPE-007 — Wrong newspaper format (Taipei broadsheets vs the model's default tabloid)
- TELL-TPE-008 — Wrong currency on documents (NT$ symbol vs ¥ vs $)
- TELL-ALT-004 — Window reflection physics (model often "forgets" the glass exists at altitude)
