//! Schema Reference — machine-readable spec of the NWGE YAML format.
//!
//! This module generates a compact reference that can be included in AI system prompts.
//! It tells the AI every field, its type, default value, and valid options.

/// The complete schema reference for AI consumption.
pub struct SchemaReference;

impl SchemaReference {
    /// Generate a compact schema reference (~800 tokens) for AI system prompts.
    /// This is the minimum an AI needs to generate valid NWGE YAML.
    pub fn compact() -> String {
        COMPACT_SCHEMA.to_string()
    }

    /// Generate a full schema reference (~2000 tokens) with examples.
    pub fn full() -> String {
        format!("{}\n\n{}", COMPACT_SCHEMA, EXAMPLES_SECTION)
    }

    /// List all valid genres.
    pub fn genres() -> &'static [&'static str] {
        &[
            "platformer", "farming-rpg", "rpg", "shooter", "roguelike",
            "tower-defense", "visual-novel", "idle", "puzzle", "horror",
            "racing", "sandbox", "3d-fps", "3d-exploration",
        ]
    }

    /// List all valid entity AI behaviors.
    pub fn ai_behaviors() -> &'static [&'static str] {
        &["none", "wander", "patrol", "chase", "flee", "follow", "idle"]
    }

    /// List all valid item types.
    pub fn item_types() -> &'static [&'static str] {
        &[
            "weapon", "tool", "seed", "crop", "food", "material",
            "potion", "key", "quest", "equipment", "junk", "building",
        ]
    }

    /// List all valid tool types.
    pub fn tool_types() -> &'static [&'static str] {
        &["axe", "pickaxe", "hoe", "watering_can", "fishing_rod", "hammer"]
    }

    /// List all valid equipment slots.
    pub fn equipment_slots() -> &'static [&'static str] {
        &["head", "body", "legs", "feet", "ring", "weapon", "shield"]
    }

    /// List all valid action types for events.
    pub fn action_types() -> &'static [&'static str] {
        &[
            "spawn", "destroy", "move", "set", "add", "sfx", "music",
            "dialog", "scene", "emit", "wait", "if", "repeat",
            "give_item", "take_item", "damage", "heal", "camera", "script",
        ]
    }

    /// List all valid system types.
    pub fn system_types() -> &'static [&'static str] {
        &[
            "physics", "combat", "farming", "inventory", "dialog", "quest",
            "crafting", "shop", "fishing", "day_night", "weather", "camera",
            "particles", "pathfinding", "save", "audio", "input", "animation",
            "tilemap", "lighting", "relationship", "cooking", "mining",
            "building", "gacha", "prestige", "idle",
        ]
    }

    /// List all valid lighting presets.
    pub fn lighting_presets() -> &'static [&'static str] {
        &["day", "night", "dawn", "dusk", "indoor", "cave"]
    }

    /// List all valid rarity levels.
    pub fn rarities() -> &'static [&'static str] {
        &["common", "uncommon", "rare", "epic", "legendary"]
    }

    /// List all valid 3D mesh types.
    pub fn mesh_types() -> &'static [&'static str] {
        &["cube", "sphere", "plane", "terrain", "cylinder"]
    }

    /// List all valid 3D material presets.
    pub fn material_presets() -> &'static [&'static str] {
        &["metal", "stone", "grass", "water", "wood", "emissive"]
    }
}

static COMPACT_SCHEMA: &str = r#"# NWGE YAML Schema (v0.3.0) — Compact Reference for AI

## Root Structure
game:         # REQUIRED
  name: str               # Game title
  genre: str              # platformer|farming-rpg|rpg|shooter|roguelike|tower-defense|visual-novel|idle|puzzle|horror|racing|sandbox|3d-fps|3d-exploration
  resolution: [w, h]      # Default: [320,240] for 2D, [1280,720] for 3D
  render_mode: str        # "2d" (default) | "3d"
  scale: int              # Pixel scale for 2D (default: 4)
  fps: int                # Default: 60
  gravity: float          # 0=top-down, 800=platformer
  start_scene: str        # Default: "main"

entities:     # Array of entity definitions
  - name: str             # REQUIRED, unique ID
    sprite: str           # Sprite name (2D)
    mesh: str             # Mesh type for 3D: cube|sphere|plane|terrain|cylinder
    position: [x, y]     # Starting position (2D)
    position3d: [x,y,z]  # Starting position (3D)
    speed: float
    size: [w, h]          # Collision box
    tags: [str]           # player|enemy|npc|animal|interactable|solid|pickup|hazard|building
    body: str             # none|dynamic|static|kinematic
    health: float
    ai: str               # none|wander|patrol|chase|flee|follow|idle
    inventory: { slots: int, starting_items: [{item: str, count: int}] }
    dialog: [{text: str, choices: [{text: str, actions: [...]}]}]
    props: {key: value}   # Any custom data
    on_collide: str       # Event name
    on_interact: str      # Event name
    on_spawn: str         # Event name

items:        # Array of item definitions
  - name: str             # REQUIRED
    type: str             # weapon|tool|seed|crop|food|material|potion|key|quest|equipment|junk|building
    damage: float         # For weapons
    tool_type: str        # axe|pickaxe|hoe|watering_can|fishing_rod
    crop: str             # For seeds: what crop it grows
    heal_amount: float    # For food/potions
    slot: str             # Equipment: head|body|legs|feet|ring|weapon|shield
    stats: {key: float}   # Stat bonuses
    recipe: {item: count} # Crafting ingredients
    buy_price: int
    sell_price: int
    rarity: str           # common|uncommon|rare|epic|legendary
    stackable: bool       # Default: true
    description: str
    on_use: str           # Event name

scenes:       # Array of scene/level definitions
  - name: str             # REQUIRED
    size: [w, h]          # In tiles (default: [40,30])
    tile_size: int        # Default: 16
    spawn_point: [x, y]
    lighting: str         # day|night|dawn|dusk|indoor|cave
    music: str
    ambience: [str]
    entities: [{entity: str, at: [x,y], name: str, props: {}}]
    exits: [{to: str, at: [x,y], direction: str, target_spawn: [x,y]}]
    on_enter: [actions]
    on_exit: [actions]

## 3D Scene (for render_mode: 3d)
scene3d:
  sky_color: [r, g, b]   # 0.0-1.0
  fog: { enabled: bool, color: [r,g,b], start: float, end: float }
  ambient_light: float    # 0.0-1.0
  lights:
    - type: str           # directional|point|ambient
      direction: [x,y,z]  # For directional
      position: [x,y,z]   # For point
      color: [r,g,b]
      intensity: float
      radius: float        # For point lights
  terrain: { size: float, subdivisions: int, height_scale: float, seed: int }
  water: { enabled: bool, height: float }
  objects:
    - name: str
      mesh: str           # cube|sphere|plane|cylinder|terrain
      mesh_params: {}     # size, radius, height, segments, rings, subdivisions
      material: str|{}    # Preset name OR { base_color, metallic, roughness, emissive, ... }
      position: [x,y,z]
      rotation: [x,y,z]   # Euler angles in radians
      scale: [x,y,z]|float

## 3D Materials (inline or preset)
material presets: metal|stone|grass|water|wood|emissive
material custom: { base_color: [r,g,b], metallic: 0-1, roughness: 0-1, emissive: [r,g,b], emissive_intensity: float, alpha: 0-1 }

variables:    # Initial game state (key: value)
  gold: 500
  score: 0
  any_name: any_value

events:       # Event handlers (event_name: [actions])
  event_name:
    - action: str         # spawn|destroy|move|set|add|sfx|music|dialog|scene|emit|wait|if|repeat|give_item|take_item|damage|heal|camera|script
      # Each action has specific fields — see Action Types below

## Action Types Quick Reference
  spawn:     { entity: str, at: [x,y], props: {} }
  destroy:   { target: str }  # "_trigger" = the triggering entity
  move:      { target: str, to: [x,y], speed: float }
  set:       { var: str, value: any }
  add:       { var: str, amount: float }
  sfx:       { sound: str, volume: float }
  music:     { track: str, loop: bool }
  dialog:    { speaker: str, text: str, choices: [{text: str, actions: [...]}] }
  scene:     { to: str, transition: fade|cut|slide }
  emit:      { event: str, data: {} }
  wait:      { seconds: float }
  if:        { condition: str, then: [actions], else: [actions] }
  repeat:    { count: int, actions: [...] }
  give_item: { item: str, count: int }
  take_item: { item: str, count: int }
  damage:    { target: str, amount: float }
  heal:      { target: str, amount: float }
  camera:    { follow: str, shake: float, zoom: float }
  script:    { code: str }  # Lua escape hatch

systems:      # Enable/configure built-in systems
  - type: str             # physics|combat|farming|inventory|dialog|quest|crafting|shop|fishing|day_night|weather|camera|particles|pathfinding|save|audio|input|animation|tilemap|lighting|relationship|cooking|mining|building|gacha|prestige|idle
    config: {}
"#;

static EXAMPLES_SECTION: &str = r#"## Minimal Viable Games (by genre)

### Platformer (~50 tokens)
```yaml
game: { name: "Jump!", genre: platformer, gravity: 800 }
entities:
  - { name: player, speed: 120, tags: [player], body: dynamic, props: { jump_force: 300 } }
  - { name: slime, speed: 30, tags: [enemy], health: 20, ai: patrol }
scenes:
  - { name: level_1, size: [60, 15], entities: [{ entity: player, at: [5, 10] }, { entity: slime, at: [30, 10] }] }
```

### RPG (~60 tokens)
```yaml
game: { name: "Quest", genre: rpg }
entities:
  - { name: hero, speed: 80, tags: [player], health: 100, inventory: { slots: 20 } }
  - { name: goblin, speed: 40, tags: [enemy], health: 25, ai: chase, props: { damage: 8 } }
items:
  - { name: sword, type: weapon, damage: 12 }
  - { name: potion, type: potion, heal_amount: 50 }
scenes:
  - { name: village, entities: [{ entity: hero, at: [20, 15] }] }
```

### 3D Exploration (~80 tokens)
```yaml
game: { name: "Wander", genre: 3d-exploration, render_mode: 3d, resolution: [1280, 720] }
camera: { type: orbit, fov: 60, distance: 15 }
scene3d:
  sky_color: [0.4, 0.6, 0.9]
  lights: [{ type: directional, direction: [-0.4, -0.7, -0.5], intensity: 1.3 }]
  terrain: { size: 80, subdivisions: 60, height_scale: 8, seed: 42 }
  water: { enabled: true, height: 1.0 }
```

## Cost Guide
| Complexity | Tokens | Cost (GPT-4o) |
|-----------|--------|--------------|
| Minimal game | 50-80 | $0.001 |
| Basic game | 150-300 | $0.005 |
| Full game | 800-2000 | $0.02 |
| Complex RPG | 2000-5000 | $0.05 |
"#;
