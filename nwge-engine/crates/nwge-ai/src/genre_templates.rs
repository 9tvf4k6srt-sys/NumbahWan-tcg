//! Genre Templates — one word activates a complete game scaffold.
//!
//! When AI says `genre: "zombie-shooter"`, the engine doesn't just enable systems —
//! it generates a COMPLETE starter game with entities, items, scenes, events, and variables.
//! The AI then only needs to customize what it wants different.
//!
//! This is the single biggest cost savings: instead of 2000 tokens to define a game,
//! AI writes 50 tokens and gets a playable game, then spends 200 tokens customizing.

/// A complete game template ready to be serialized to YAML.
#[derive(Debug, Clone)]
pub struct GenreTemplate {
    pub genre: &'static str,
    pub display_name: &'static str,
    pub description: &'static str,
    pub render_mode: &'static str,  // "2d", "3d", or "hybrid"
    pub yaml: &'static str,         // Complete minimal YAML
    pub token_cost: u32,            // Approximate tokens for AI to generate this
    pub ai_customization_hints: &'static [&'static str], // What AI typically changes
}

/// Get all available genres.
pub fn list_genres() -> Vec<&'static str> {
    TEMPLATES.iter().map(|t| t.genre).collect()
}

/// Get a specific genre template.
pub fn get_template(genre: &str) -> Option<&'static GenreTemplate> {
    // Prefer exact match first
    TEMPLATES.iter().find(|t| t.genre == genre)
        .or_else(|| TEMPLATES.iter().find(|t| genre.contains(t.genre) || t.genre.contains(genre)))
}

/// All built-in genre templates.
static TEMPLATES: &[GenreTemplate] = &[
    // ─── 2D Genres ──────────────────────────────────────
    GenreTemplate {
        genre: "platformer",
        display_name: "2D Platformer",
        description: "Side-scrolling jump-and-run with physics, enemies, collectibles",
        render_mode: "2d",
        token_cost: 150,
        ai_customization_hints: &[
            "Change player speed/jump height",
            "Add enemy types with different AI",
            "Design levels with platforms and hazards",
            "Add power-ups and collectibles",
        ],
        yaml: r#"game:
  name: "Platform Adventure"
  genre: platformer
  resolution: [320, 180]
  scale: 4
  gravity: 800

entities:
  - name: player
    sprite: hero
    position: [40, 140]
    speed: 120
    size: [12, 16]
    tags: [player]
    body: dynamic
    health: 100
    props:
      jump_force: 300
      double_jump: false
      coins: 0

  - name: slime
    sprite: slime
    speed: 30
    size: [12, 12]
    tags: [enemy]
    body: dynamic
    health: 20
    ai: patrol
    props:
      damage: 10
      xp_reward: 5

  - name: coin
    sprite: coin
    size: [8, 8]
    tags: [collectible]
    on_collide: collect_coin

  - name: spike
    sprite: spike
    size: [16, 8]
    tags: [hazard]
    body: static
    on_collide: hit_hazard

  - name: spring
    sprite: spring
    size: [16, 8]
    tags: [interactable]
    body: static
    on_collide: spring_bounce

items:
  - name: health_potion
    type: potion
    heal_amount: 50
    description: "Restores 50 HP"

scenes:
  - name: level_1
    size: [80, 20]
    tile_size: 16
    spawn_point: [2, 14]
    lighting: day
    music: level_theme
    entities:
      - entity: player
        at: [2, 14]
      - entity: slime
        at: [30, 14]
      - entity: slime
        at: [50, 14]
      - entity: coin
        at: [20, 10]
      - entity: coin
        at: [40, 8]
      - entity: coin
        at: [60, 12]
    exits:
      - to: level_2
        at: [79, 14]
        direction: right

variables:
  lives: 3
  score: 0
  level: 1
  total_coins: 0

events:
  collect_coin:
    - action: add
      var: score
      amount: 100
    - action: add
      var: total_coins
      amount: 1
    - action: sfx
      sound: coin_collect
    - action: destroy
      target: _trigger

  hit_hazard:
    - action: damage
      target: player
      amount: 25
    - action: camera
      shake: 0.3
    - action: sfx
      sound: hurt

  spring_bounce:
    - action: script
      code: "player.vy = -500"
    - action: sfx
      sound: spring

  player_death:
    - action: add
      var: lives
      amount: -1
    - action: if
      condition: "lives <= 0"
      then:
        - action: scene
          to: game_over
      else:
        - action: scene
          to: level_1

systems:
  - type: physics
    config: { gravity: 800 }
  - type: combat
    config: { style: action }
  - type: camera
    config: { style: follow, smoothing: 0.1 }
  - type: animation
  - type: particles
  - type: save
"#,
    },

    GenreTemplate {
        genre: "farming-rpg",
        display_name: "Farming RPG",
        description: "Stardew Valley-style farm life with crops, animals, NPCs, seasons",
        render_mode: "2d",
        token_cost: 300,
        ai_customization_hints: &[
            "Add crop types and growth times",
            "Create NPCs with dialog trees",
            "Design farm layout and town map",
            "Add seasonal events and festivals",
        ],
        yaml: r#"game:
  name: "Harvest Dreams"
  genre: farming-rpg
  resolution: [320, 240]
  scale: 4
  gravity: 0
  start_scene: farm

entities:
  - name: player
    sprite: farmer
    position: [160, 140]
    speed: 80
    size: [14, 14]
    tags: [player]
    body: dynamic
    inventory:
      slots: 24
      starting_items:
        - { item: hoe, count: 1 }
        - { item: watering_can, count: 1 }
        - { item: turnip_seeds, count: 10 }
    props:
      energy: 100
      max_energy: 100

  - name: chicken
    sprite: chicken
    speed: 15
    size: [10, 10]
    tags: [npc, animal]
    ai: wander
    props:
      produces: egg
      produce_interval: 120

items:
  - name: hoe
    type: tool
    tool_type: hoe
    stackable: false
  - name: watering_can
    type: tool
    tool_type: watering_can
    stackable: false
  - name: turnip_seeds
    type: seed
    crop: turnip
    buy_price: 20
  - name: turnip
    type: crop
    sell_price: 60

scenes:
  - name: farm
    size: [60, 45]
    tile_size: 16
    spawn_point: [10, 22]
    lighting: day
    entities:
      - entity: player
        at: [10, 22]
      - entity: chicken
        at: [6, 30]
    exits:
      - to: town
        at: [59, 22]
        direction: right

  - name: town
    size: [80, 60]
    tile_size: 16
    exits:
      - to: farm
        at: [0, 15]
        direction: left

variables:
  gold: 500
  day: 1
  season: spring
  year: 1
"#,
    },

    GenreTemplate {
        genre: "rpg",
        display_name: "RPG / Action RPG",
        description: "Top-down RPG with combat, quests, dialog, inventory, dungeons",
        render_mode: "2d",
        token_cost: 250,
        ai_customization_hints: &[
            "Design enemy types and boss encounters",
            "Create quest chains with branching outcomes",
            "Add equipment with stat bonuses",
            "Build dungeon layouts and puzzles",
        ],
        yaml: r#"game:
  name: "Realm of Shadows"
  genre: rpg
  resolution: [320, 240]
  scale: 4
  gravity: 0
  start_scene: village

entities:
  - name: hero
    sprite: hero
    position: [160, 120]
    speed: 90
    size: [14, 16]
    tags: [player]
    body: dynamic
    health: 100
    inventory:
      slots: 20
      starting_items:
        - { item: wooden_sword, count: 1 }
        - { item: health_potion, count: 3 }
    props:
      level: 1
      xp: 0
      xp_to_level: 100
      attack: 10
      defense: 5

  - name: skeleton
    sprite: skeleton
    speed: 40
    size: [14, 16]
    tags: [enemy]
    body: dynamic
    health: 30
    ai: chase
    props:
      damage: 8
      xp_reward: 15
      drop_table:
        bone: 0.5
        gold_coin: 0.3

  - name: elder
    sprite: npc_elder
    tags: [npc, interactable]
    ai: idle
    dialog:
      - text: "Dark creatures have emerged from the caves. Will you help us?"
        choices:
          - text: "I'll stop them!"
            actions:
              - action: set
                var: quest_caves
                value: active
              - action: dialog
                text: "Take this shield. You'll need it."
              - action: give_item
                item: iron_shield
          - text: "Not right now"
            actions:
              - action: dialog
                text: "Please reconsider..."

items:
  - name: wooden_sword
    type: weapon
    damage: 10
    slot: weapon
  - name: iron_shield
    type: equipment
    slot: shield
    stats: { defense: 8 }
  - name: health_potion
    type: potion
    heal_amount: 50
  - name: bone
    type: material
    sell_price: 5
  - name: gold_coin
    type: material
    sell_price: 10

scenes:
  - name: village
    size: [60, 45]
    tile_size: 16
    spawn_point: [30, 22]
    lighting: day
    music: village_theme
    entities:
      - entity: hero
        at: [30, 22]
      - entity: elder
        at: [20, 15]
    exits:
      - to: overworld
        at: [59, 22]
        direction: right

  - name: overworld
    size: [100, 80]
    tile_size: 16
    lighting: day
    entities:
      - entity: skeleton
        at: [40, 30]
      - entity: skeleton
        at: [60, 50]
    exits:
      - to: village
        at: [0, 22]
        direction: left
      - to: dungeon
        at: [80, 60]
        direction: down

variables:
  quest_caves: inactive
  bosses_killed: 0
  reputation: 0

events:
  enemy_killed:
    - action: add
      var: hero.xp
      amount: 15
    - action: sfx
      sound: enemy_death
    - action: if
      condition: "hero.xp >= hero.xp_to_level"
      then:
        - action: emit
          event: level_up
"#,
    },

    GenreTemplate {
        genre: "shooter",
        display_name: "Top-Down Shooter",
        description: "Twin-stick or top-down shooter with waves, weapons, power-ups",
        render_mode: "2d",
        token_cost: 200,
        ai_customization_hints: &[
            "Add weapon types with different fire rates",
            "Design enemy wave patterns",
            "Add boss encounters",
            "Create power-up system",
        ],
        yaml: r#"game:
  name: "Bullet Storm"
  genre: shooter
  resolution: [320, 240]
  scale: 4
  gravity: 0
  start_scene: arena

entities:
  - name: player
    sprite: soldier
    position: [160, 120]
    speed: 150
    size: [12, 12]
    tags: [player]
    body: dynamic
    health: 100
    props:
      weapon: pistol
      ammo: 30
      fire_rate: 0.2
      damage: 10

  - name: zombie
    sprite: zombie
    speed: 40
    size: [12, 14]
    tags: [enemy]
    body: dynamic
    health: 25
    ai: chase
    props:
      damage: 15
      xp_reward: 10

  - name: fast_zombie
    sprite: zombie_fast
    speed: 80
    size: [10, 12]
    tags: [enemy]
    body: dynamic
    health: 15
    ai: chase
    props:
      damage: 10

  - name: ammo_pickup
    sprite: ammo
    size: [8, 8]
    tags: [pickup]
    on_collide: pickup_ammo

  - name: health_pickup
    sprite: medkit
    size: [8, 8]
    tags: [pickup]
    on_collide: pickup_health

items:
  - name: pistol
    type: weapon
    damage: 10
    attack_speed: 0.2
  - name: shotgun
    type: weapon
    damage: 30
    attack_speed: 0.8

scenes:
  - name: arena
    size: [40, 30]
    tile_size: 16
    spawn_point: [20, 15]
    lighting: night
    music: combat_theme

variables:
  wave: 1
  score: 0
  kills: 0
  high_score: 0

events:
  wave_start:
    - action: dialog
      speaker: System
      text: "Wave {wave}!"
    - action: repeat
      count: 5
      actions:
        - action: spawn
          entity: zombie
          at: [0, 0]
        - action: wait
          seconds: 0.5

  enemy_killed:
    - action: add
      var: kills
      amount: 1
    - action: add
      var: score
      amount: 100

  pickup_ammo:
    - action: add
      var: player.ammo
      amount: 15
    - action: sfx
      sound: ammo_pickup
    - action: destroy
      target: _trigger

  pickup_health:
    - action: heal
      target: player
      amount: 25
    - action: destroy
      target: _trigger
"#,
    },

    GenreTemplate {
        genre: "roguelike",
        display_name: "Roguelike / Roguelite",
        description: "Procedural dungeons, permadeath, random loot, increasing difficulty",
        render_mode: "2d",
        token_cost: 250,
        ai_customization_hints: &[
            "Add procedural room generation rules",
            "Design item/weapon pool with rarities",
            "Create enemy variety per floor",
            "Add meta-progression between runs",
        ],
        yaml: r#"game:
  name: "Depths Unknown"
  genre: roguelike
  resolution: [320, 240]
  scale: 4
  gravity: 0
  start_scene: floor_1

entities:
  - name: player
    sprite: adventurer
    speed: 80
    size: [14, 14]
    tags: [player]
    body: dynamic
    health: 80
    inventory:
      slots: 12
    props:
      attack: 8
      defense: 3
      floor: 1
      gold: 0

  - name: rat
    sprite: rat
    speed: 30
    size: [10, 10]
    tags: [enemy]
    health: 12
    ai: wander
    props: { damage: 5, xp: 5 }

  - name: bat
    sprite: bat
    speed: 60
    size: [10, 10]
    tags: [enemy]
    health: 8
    ai: chase
    props: { damage: 8, xp: 8 }

  - name: chest
    sprite: chest
    tags: [interactable]
    body: static
    on_interact: open_chest

  - name: stairs
    sprite: stairs
    tags: [interactable]
    body: static
    on_interact: descend

items:
  - name: rusty_sword
    type: weapon
    damage: 8
    rarity: common
  - name: iron_sword
    type: weapon
    damage: 15
    rarity: uncommon
  - name: fire_blade
    type: weapon
    damage: 25
    rarity: rare
    props: { element: fire }
  - name: health_potion
    type: potion
    heal_amount: 30
    rarity: common
  - name: shield_scroll
    type: potion
    rarity: uncommon
    props: { effect: shield, duration: 30 }

scenes:
  - name: floor_1
    size: [40, 30]
    tile_size: 16
    lighting: cave
    entities:
      - entity: player
        at: [5, 5]
      - entity: rat
        at: [20, 15]
      - entity: rat
        at: [30, 10]
      - entity: chest
        at: [35, 25]
      - entity: stairs
        at: [38, 28]

variables:
  floor: 1
  run_number: 1
  meta_currency: 0
  best_floor: 0

events:
  open_chest:
    - action: sfx
      sound: chest_open
    - action: give_item
      item: health_potion
    - action: dialog
      text: "Found a Health Potion!"
    - action: destroy
      target: _trigger

  descend:
    - action: add
      var: floor
      amount: 1
    - action: dialog
      speaker: System
      text: "Descending to floor {floor}..."
    - action: scene
      to: floor_1

  player_death:
    - action: if
      condition: "floor > best_floor"
      then:
        - action: set
          var: best_floor
          value: "{floor}"
    - action: add
      var: run_number
      amount: 1
    - action: dialog
      text: "You died on floor {floor}. Starting new run..."
    - action: set
      var: floor
      value: 1
"#,
    },

    GenreTemplate {
        genre: "tower-defense",
        display_name: "Tower Defense",
        description: "Place towers, upgrade them, stop waves of enemies from reaching the base",
        render_mode: "2d",
        token_cost: 200,
        ai_customization_hints: &[
            "Add tower types with unique abilities",
            "Design enemy wave composition",
            "Create upgrade paths for towers",
            "Add special abilities and power-ups",
        ],
        yaml: r#"game:
  name: "Last Bastion"
  genre: tower-defense
  resolution: [320, 240]
  scale: 4
  gravity: 0
  start_scene: map_1

entities:
  - name: arrow_tower
    sprite: tower_arrow
    size: [16, 16]
    tags: [tower, building]
    body: static
    props:
      damage: 10
      range: 48
      fire_rate: 1.0
      cost: 50
      level: 1

  - name: cannon_tower
    sprite: tower_cannon
    size: [16, 16]
    tags: [tower, building]
    body: static
    props:
      damage: 30
      range: 32
      fire_rate: 2.0
      cost: 100
      splash: 16

  - name: goblin
    sprite: goblin
    speed: 25
    size: [10, 12]
    tags: [enemy]
    health: 30
    ai: patrol
    props:
      reward: 10

  - name: orc
    sprite: orc
    speed: 15
    size: [14, 16]
    tags: [enemy]
    health: 80
    ai: patrol
    props:
      reward: 25

  - name: base
    sprite: castle
    size: [32, 32]
    tags: [base]
    body: static
    health: 1000

scenes:
  - name: map_1
    size: [40, 30]
    tile_size: 16
    entities:
      - entity: base
        at: [35, 15]

variables:
  gold: 200
  wave: 0
  lives: 20
  score: 0

events:
  wave_start:
    - action: add
      var: wave
      amount: 1
    - action: dialog
      text: "Wave {wave} incoming!"
    - action: repeat
      count: 5
      actions:
        - action: spawn
          entity: goblin
          at: [0, 15]
        - action: wait
          seconds: 2

  enemy_killed:
    - action: add
      var: gold
      amount: 10
    - action: add
      var: score
      amount: 50

  enemy_reached_base:
    - action: add
      var: lives
      amount: -1
    - action: camera
      shake: 0.2
    - action: if
      condition: "lives <= 0"
      then:
        - action: dialog
          text: "Game Over! Score: {score}"
"#,
    },

    GenreTemplate {
        genre: "visual-novel",
        display_name: "Visual Novel",
        description: "Story-driven game with branching dialog, character portraits, choices",
        render_mode: "2d",
        token_cost: 300,
        ai_customization_hints: &[
            "Write character dialog and personalities",
            "Design branching story paths",
            "Add relationship mechanics",
            "Create multiple endings",
        ],
        yaml: r#"game:
  name: "Starlight Academy"
  genre: visual-novel
  resolution: [320, 180]
  scale: 4
  start_scene: prologue

entities:
  - name: narrator
    tags: [system]
  - name: akira
    sprite: char_akira
    tags: [npc, romanceable]
    props:
      affection: 0
      personality: kind
  - name: rei
    sprite: char_rei
    tags: [npc, romanceable]
    props:
      affection: 0
      personality: mysterious

scenes:
  - name: prologue
    lighting: day
    music: gentle_piano
    on_enter:
      - action: dialog
        speaker: Narrator
        text: "Spring. The cherry blossoms danced in the warm breeze as you approached the academy gates."
      - action: dialog
        speaker: Narrator
        text: "This was supposed to be a fresh start. A new school, a new life."
      - action: dialog
        speaker: "???"
        text: "Hey! Watch out!"
        choices:
          - text: "Dodge left"
            actions:
              - action: dialog
                speaker: Akira
                text: "Whew, that was close! Sorry about that — lost control of my bike."
              - action: add
                var: akira.affection
                amount: 5
              - action: scene
                to: chapter_1_akira
          - text: "Stand still"
            actions:
              - action: dialog
                speaker: Rei
                text: "...You should be more careful."
              - action: add
                var: rei.affection
                amount: 5
              - action: scene
                to: chapter_1_rei

  - name: chapter_1_akira
    music: upbeat_theme
  - name: chapter_1_rei
    music: mysterious_theme

variables:
  chapter: 1
  route: none
  trust_level: 0

events:
  check_ending:
    - action: if
      condition: "akira.affection >= 50"
      then:
        - action: scene
          to: ending_akira
    - action: if
      condition: "rei.affection >= 50"
      then:
        - action: scene
          to: ending_rei
"#,
    },

    GenreTemplate {
        genre: "idle",
        display_name: "Idle / Clicker Game",
        description: "Incremental game with auto-progress, upgrades, prestige, offline gains",
        render_mode: "2d",
        token_cost: 150,
        ai_customization_hints: &[
            "Add generators and upgrade tiers",
            "Design prestige multipliers",
            "Create achievement milestones",
            "Add auto-buy and bulk-buy options",
        ],
        yaml: r#"game:
  name: "Gold Rush Tycoon"
  genre: idle
  resolution: [320, 480]
  scale: 2

entities:
  - name: mine
    sprite: mine
    tags: [generator]
    props:
      output: 1
      rate: 1.0
      level: 1
      cost: 10
      cost_multiplier: 1.15

  - name: factory
    sprite: factory
    tags: [generator]
    props:
      output: 10
      rate: 5.0
      level: 0
      cost: 100
      cost_multiplier: 1.2

  - name: bank
    sprite: bank
    tags: [generator]
    props:
      output: 100
      rate: 30.0
      level: 0
      cost: 5000
      cost_multiplier: 1.25

scenes:
  - name: main
    size: [20, 30]

variables:
  gold: 0
  total_gold: 0
  prestige_multiplier: 1
  prestige_currency: 0
  clicks: 0
  click_power: 1

events:
  click:
    - action: add
      var: gold
      amount: 1
    - action: add
      var: clicks
      amount: 1

  buy_upgrade:
    - action: if
      condition: "gold >= 10"
      then:
        - action: add
          var: gold
          amount: -10
        - action: add
          var: mine.level
          amount: 1

  prestige:
    - action: if
      condition: "total_gold >= 1000000"
      then:
        - action: add
          var: prestige_currency
          amount: 1
        - action: set
          var: gold
          value: 0
        - action: dialog
          text: "Prestige! Starting fresh with bonus multiplier!"

systems:
  - type: idle
    config: { offline_progress: true }
  - type: prestige
  - type: save
    config: { auto_interval: 30 }
"#,
    },

    GenreTemplate {
        genre: "puzzle",
        display_name: "Puzzle Game",
        description: "Logic puzzles, matching, sokoban, grid-based challenges",
        render_mode: "2d",
        token_cost: 150,
        ai_customization_hints: &[
            "Design puzzle mechanics and rules",
            "Create progressive difficulty levels",
            "Add hint system",
            "Design level select and star ratings",
        ],
        yaml: r#"game:
  name: "Block Logic"
  genre: puzzle
  resolution: [240, 240]
  scale: 4
  gravity: 0
  start_scene: level_1

entities:
  - name: player
    sprite: player_block
    size: [16, 16]
    tags: [player]
    body: dynamic
    speed: 160

  - name: crate
    sprite: crate
    size: [16, 16]
    tags: [pushable]
    body: dynamic

  - name: target
    sprite: target_tile
    size: [16, 16]
    tags: [goal]
    body: static

  - name: wall
    sprite: wall
    size: [16, 16]
    tags: [solid]
    body: static

scenes:
  - name: level_1
    size: [10, 10]
    tile_size: 16
    entities:
      - entity: player
        at: [2, 5]
      - entity: crate
        at: [4, 5]
      - entity: target
        at: [7, 5]
    on_enter:
      - action: dialog
        text: "Push the crate onto the target!"

variables:
  level: 1
  moves: 0
  total_stars: 0

events:
  check_win:
    - action: if
      condition: "crate_on_target"
      then:
        - action: dialog
          text: "Level complete in {moves} moves!"
        - action: sfx
          sound: victory
        - action: add
          var: total_stars
          amount: 1

systems:
  - type: physics
    config: { gravity: 0 }
  - type: camera
    config: { style: fixed }
  - type: save
"#,
    },

    // ─── 3D Genres ──────────────────────────────────────

    GenreTemplate {
        genre: "3d-fps",
        display_name: "3D First-Person Shooter",
        description: "First-person shooter with 3D environments, weapons, enemies",
        render_mode: "3d",
        token_cost: 250,
        ai_customization_hints: &[
            "Add weapon types with different models",
            "Design enemy AI patterns",
            "Create 3D level layouts",
            "Add pickups and power-ups",
        ],
        yaml: r#"game:
  name: "Dark Corridor"
  genre: 3d-fps
  resolution: [1280, 720]
  render_mode: 3d
  fps: 60

camera:
  type: fps
  fov: 75
  near: 0.1
  far: 500
  height: 1.8

scene3d:
  sky_color: [0.1, 0.1, 0.15]
  fog:
    enabled: true
    color: [0.05, 0.05, 0.1]
    start: 20
    end: 80
  ambient_light: 0.1

  lights:
    - type: directional
      direction: [-0.3, -0.8, -0.5]
      color: [0.3, 0.35, 0.4]
      intensity: 0.6
    - type: point
      position: [0, 3, 0]
      color: [1, 0.8, 0.4]
      intensity: 3
      radius: 15

  objects:
    - name: floor
      mesh: plane
      mesh_params: { size: 100, subdivisions: 4 }
      material: stone
      position: [0, 0, 0]

    - name: wall_north
      mesh: cube
      mesh_params: { size: 1 }
      material: { base_color: [0.4, 0.4, 0.38], roughness: 0.9 }
      position: [0, 2, -10]
      scale: [20, 4, 0.5]

    - name: pillar_1
      mesh: cylinder
      mesh_params: { radius: 0.3, height: 4, segments: 12 }
      material: stone
      position: [-5, 2, -3]

    - name: pillar_2
      mesh: cylinder
      mesh_params: { radius: 0.3, height: 4, segments: 12 }
      material: stone
      position: [5, 2, -3]

    - name: light_orb
      mesh: sphere
      mesh_params: { radius: 0.3, segments: 12, rings: 8 }
      material: { emissive: [0.5, 0.8, 1.0], emissive_intensity: 5 }
      position: [0, 3.5, 0]

entities:
  - name: player
    position3d: [0, 1.8, 5]
    speed: 5
    health: 100
    tags: [player]
    props:
      weapon: pistol
      ammo: 30

  - name: drone_enemy
    speed: 3
    health: 40
    tags: [enemy]
    ai: chase
    mesh: sphere
    mesh_params: { radius: 0.4 }
    material: { base_color: [0.8, 0.1, 0.1], metallic: 0.8, roughness: 0.2 }
    props:
      damage: 15
      fire_rate: 1.5

items:
  - name: pistol
    type: weapon
    damage: 15
  - name: shotgun
    type: weapon
    damage: 40
  - name: ammo_box
    type: material
    props: { ammo_restore: 20 }

variables:
  score: 0
  kills: 0
  wave: 1
"#,
    },

    GenreTemplate {
        genre: "3d-exploration",
        display_name: "3D Exploration / Walking Sim",
        description: "Beautiful 3D world to explore with terrain, trees, water, day/night",
        render_mode: "3d",
        token_cost: 200,
        ai_customization_hints: &[
            "Design terrain height and biomes",
            "Place trees, rocks, and landmarks",
            "Add ambient sounds and music",
            "Create points of interest with dialog",
        ],
        yaml: r#"game:
  name: "Wanderer"
  genre: 3d-exploration
  resolution: [1280, 720]
  render_mode: 3d
  fps: 60

camera:
  type: orbit
  fov: 60
  distance: 15
  pitch: 0.4
  target: [0, 3, 0]

scene3d:
  sky_color: [0.4, 0.6, 0.9]
  fog:
    enabled: true
    color: [0.5, 0.6, 0.8]
    start: 40
    end: 100
  ambient_light: 0.2

  lights:
    - type: directional
      direction: [-0.4, -0.7, -0.5]
      color: [1, 0.95, 0.8]
      intensity: 1.3

  terrain:
    size: 100
    subdivisions: 80
    height_scale: 10
    seed: 42

  water:
    enabled: true
    height: 1.0
    material: water

  objects:
    - name: crystal
      mesh: sphere
      mesh_params: { radius: 0.5 }
      material: { emissive: [0.2, 0.5, 1.0], emissive_intensity: 3 }
      position: [0, 5, 0]

  trees:
    count: 20
    trunk: { radius: 0.15, height: 2 }
    canopy: { radius: 1.2, segments: 12 }
    min_height: 1.5
    seed: 42

variables:
  discoveries: 0
  distance_walked: 0
"#,
    },

    GenreTemplate {
        genre: "horror",
        display_name: "Horror / Survival Horror",
        description: "Dark atmosphere, limited resources, jump scares, tense exploration",
        render_mode: "2d",
        token_cost: 200,
        ai_customization_hints: &[
            "Design dark/claustrophobic environments",
            "Add sound-based tension building",
            "Create limited resources and inventory",
            "Design enemy encounters (flee, not fight)",
        ],
        yaml: r#"game:
  name: "Hollowed Halls"
  genre: horror
  resolution: [320, 240]
  scale: 4
  gravity: 0
  start_scene: entrance

entities:
  - name: player
    sprite: survivor
    speed: 60
    size: [12, 14]
    tags: [player]
    body: dynamic
    health: 80
    inventory:
      slots: 6
      starting_items:
        - { item: flashlight, count: 1 }
    props:
      sanity: 100
      battery: 100

  - name: shadow
    sprite: shadow_creature
    speed: 35
    tags: [enemy, unkillable]
    ai: chase
    props:
      damage: 50
      detection_range: 80
      chase_range: 120
      sound: shadow_growl

  - name: note
    sprite: note
    tags: [interactable]
    body: static
    on_interact: read_note

  - name: locked_door
    sprite: door
    tags: [interactable, solid]
    body: static
    props:
      key_required: rusty_key

items:
  - name: flashlight
    type: tool
    stackable: false
    props: { drains_battery: 0.5 }
  - name: battery
    type: material
    props: { charge: 50 }
  - name: rusty_key
    type: key
    description: "An old rusty key. What does it open?"
  - name: first_aid
    type: potion
    heal_amount: 30

scenes:
  - name: entrance
    size: [30, 20]
    lighting: cave
    music: ambient_horror
    ambience: [wind_howl, dripping]
    on_enter:
      - action: dialog
        speaker: Inner Voice
        text: "...Something isn't right. The air is cold and stale."
    entities:
      - entity: player
        at: [5, 10]
      - entity: note
        at: [20, 8]
    exits:
      - to: corridor
        at: [29, 10]

variables:
  notes_found: 0
  sanity: 100
  doors_unlocked: 0

events:
  read_note:
    - action: add
      var: notes_found
      amount: 1
    - action: dialog
      speaker: Note
      text: "Day 3. The shadows are watching. I can hear them breathing in the walls."
    - action: sfx
      sound: paper_rustle
    - action: add
      var: sanity
      amount: -5
    - action: destroy
      target: _trigger

  sanity_check:
    - action: if
      condition: "sanity <= 30"
      then:
        - action: camera
          shake: 0.1
        - action: sfx
          sound: heartbeat
"#,
    },

    GenreTemplate {
        genre: "racing",
        display_name: "Racing Game",
        description: "Top-down or 3D racing with tracks, vehicles, power-ups",
        render_mode: "2d",
        token_cost: 150,
        ai_customization_hints: &[
            "Design track layouts with turns",
            "Add vehicle stats (speed, handling)",
            "Create power-ups and hazards",
            "Add lap tracking and ghost racing",
        ],
        yaml: r#"game:
  name: "Nitro Rush"
  genre: racing
  resolution: [320, 240]
  scale: 4
  gravity: 0
  start_scene: track_1

entities:
  - name: player_car
    sprite: car_red
    speed: 200
    size: [10, 16]
    tags: [player, vehicle]
    body: dynamic
    props:
      max_speed: 200
      acceleration: 150
      handling: 5
      boost: 100
      lap: 0

  - name: rival_car
    sprite: car_blue
    speed: 180
    size: [10, 16]
    tags: [rival, vehicle]
    ai: patrol
    props:
      max_speed: 180
      rubber_band: true

  - name: boost_pad
    sprite: boost
    size: [16, 16]
    tags: [powerup]
    on_collide: apply_boost

  - name: oil_slick
    sprite: oil
    size: [16, 16]
    tags: [hazard]
    on_collide: slip

scenes:
  - name: track_1
    size: [100, 80]
    tile_size: 16
    music: race_theme
    entities:
      - entity: player_car
        at: [50, 70]
      - entity: rival_car
        at: [52, 72]

variables:
  lap: 0
  total_laps: 3
  race_time: 0
  best_time: 999
  position: 1

events:
  apply_boost:
    - action: add
      var: player_car.boost
      amount: 50
    - action: sfx
      sound: boost
    - action: destroy
      target: _trigger

  lap_complete:
    - action: add
      var: lap
      amount: 1
    - action: if
      condition: "lap >= total_laps"
      then:
        - action: dialog
          text: "Race complete! Time: {race_time}s"
"#,
    },

    GenreTemplate {
        genre: "sandbox",
        display_name: "Sandbox / Building Game",
        description: "Open-world building, crafting, resource gathering, base construction",
        render_mode: "2d",
        token_cost: 250,
        ai_customization_hints: &[
            "Design buildable structures and recipes",
            "Add resource types and gathering mechanics",
            "Create crafting progression",
            "Add environmental hazards",
        ],
        yaml: r#"game:
  name: "Terra Craft"
  genre: sandbox
  resolution: [320, 240]
  scale: 4
  gravity: 0
  start_scene: overworld

entities:
  - name: player
    sprite: builder
    speed: 80
    size: [14, 14]
    tags: [player]
    body: dynamic
    health: 100
    inventory:
      slots: 30
      starting_items:
        - { item: stone_pickaxe, count: 1 }
        - { item: wood, count: 10 }

  - name: tree
    sprite: tree
    tags: [harvestable, solid]
    body: static
    health: 30
    props:
      drops: [{ item: wood, count: 3 }, { item: stick, count: 2 }]
      tool_required: axe

  - name: rock
    sprite: rock
    tags: [harvestable, solid]
    body: static
    health: 50
    props:
      drops: [{ item: stone, count: 3 }, { item: iron_ore, count: 1, chance: 0.3 }]
      tool_required: pickaxe

  - name: workbench
    sprite: workbench
    tags: [interactable, building]
    body: static
    on_interact: open_crafting

items:
  - name: wood
    type: material
    sell_price: 2
  - name: stone
    type: material
    sell_price: 3
  - name: stick
    type: material
    sell_price: 1
  - name: iron_ore
    type: material
    sell_price: 10
  - name: stone_pickaxe
    type: tool
    tool_type: pickaxe
    damage: 8
    stackable: false
  - name: workbench_item
    type: building
    description: "Craft more items here"
    recipe: { wood: 5, stone: 3 }
  - name: wall
    type: building
    recipe: { wood: 3 }
  - name: door
    type: building
    recipe: { wood: 4, iron_ore: 1 }

scenes:
  - name: overworld
    size: [100, 80]
    tile_size: 16
    lighting: day
    entities:
      - entity: player
        at: [50, 40]
      - entity: tree
        at: [30, 35]
      - entity: tree
        at: [45, 50]
      - entity: rock
        at: [60, 30]

variables:
  day: 1
  buildings_placed: 0

systems:
  - type: crafting
  - type: building
  - type: day_night
  - type: inventory
  - type: save
"#,
    },
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_genres_listed() {
        let genres = list_genres();
        assert!(genres.len() >= 12, "Should have at least 12 genres, got {}", genres.len());
        assert!(genres.contains(&"platformer"));
        assert!(genres.contains(&"rpg"));
        assert!(genres.contains(&"3d-fps"));
        assert!(genres.contains(&"3d-exploration"));
        assert!(genres.contains(&"farming-rpg"));
        assert!(genres.contains(&"idle"));
    }

    #[test]
    fn test_get_template_exact() {
        let t = get_template("platformer");
        assert!(t.is_some());
        assert_eq!(t.unwrap().render_mode, "2d");
    }

    #[test]
    fn test_get_template_3d() {
        let t = get_template("3d-fps");
        assert!(t.is_some());
        assert_eq!(t.unwrap().render_mode, "3d");
    }

    #[test]
    fn test_all_templates_have_valid_yaml() {
        for template in TEMPLATES {
            let result: Result<nwge_data::GameDefinition, _> = serde_yaml::from_str(template.yaml);
            assert!(result.is_ok(),
                "Genre '{}' template has invalid YAML: {:?}",
                template.genre,
                result.err()
            );
        }
    }

    #[test]
    fn test_all_templates_pass_validation() {
        for template in TEMPLATES {
            let game_def: nwge_data::GameDefinition = serde_yaml::from_str(template.yaml)
                .expect(&format!("Failed to parse genre '{}' YAML", template.genre));
            let result = crate::validate_game(&game_def);
            assert!(result.valid,
                "Genre '{}' template fails validation:\n{}",
                template.genre,
                result.to_ai_string()
            );
        }
    }

    #[test]
    fn test_3d_templates_have_render_mode_3d() {
        for template in TEMPLATES {
            if template.genre.starts_with("3d") {
                assert_eq!(template.render_mode, "3d",
                    "Genre '{}' should have render_mode '3d'", template.genre);
            }
        }
    }

    #[test]
    fn test_token_costs_reasonable() {
        for template in TEMPLATES {
            assert!(template.token_cost >= 100 && template.token_cost <= 500,
                "Genre '{}' has unreasonable token_cost: {}", template.genre, template.token_cost);
        }
    }
}
