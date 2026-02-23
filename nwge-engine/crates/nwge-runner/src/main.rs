//! # NWGE Runner — Full game runtime with all systems
//!
//! Modes:
//!   nwge run game.yaml            — Simulate & render (headless)
//!   nwge render game.yaml         — Render frames as PNG
//!   nwge validate game.yaml       — Check for errors (AI-friendly)
//!   nwge new my-game              — Scaffold a new project
//!   nwge info game.yaml           — Display game details
//!   nwge prompt                   — Print AI system prompt for game creation
//!   nwge prompt --short           — Print compact AI prompt
//!   nwge prompt --genre rpg       — Print genre-specific prompt with template
//!   nwge genres                   — List all available genres

use std::path::Path;
use std::collections::HashMap;
use glam::Vec2;
use nwge_core::ecs::*;
use nwge_data::{load_game, GameDefinition};
use nwge_data::game_def::Action;
use nwge_render::{
    Framebuffer, Camera2D, Color,
    sprite::{SpriteRenderer, generate_placeholder},
    text,
    tilemap::TileMap,
    particles::ParticleSystem,
};
use nwge_input::InputState;
use nwge_physics::{CollisionBody, BodyType, SpatialHash, resolve_tile_collision};

fn main() {
    env_logger::init();

    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        print_usage();
        return;
    }

    match args[1].as_str() {
        "run" => {
            let path = args.get(2).map(|s| s.as_str()).unwrap_or("game.yaml");
            cmd_run(path);
        }
        "render" => {
            let path = args.get(2).map(|s| s.as_str()).unwrap_or("game.yaml");
            let frames: u32 = args.iter()
                .position(|a| a == "--frames")
                .and_then(|i| args.get(i + 1))
                .and_then(|s| s.parse().ok())
                .unwrap_or(1);
            let output = args.iter()
                .position(|a| a == "--output")
                .and_then(|i| args.get(i + 1))
                .map(|s| s.as_str())
                .unwrap_or("frame.png");
            cmd_render(path, frames, output);
        }
        "validate" => {
            let path = args.get(2).map(|s| s.as_str()).unwrap_or("game.yaml");
            cmd_validate(path);
        }
        "new" => {
            let name = args.get(2).map(|s| s.as_str()).unwrap_or("my-game");
            cmd_new(name);
        }
        "info" => {
            let path = args.get(2).map(|s| s.as_str()).unwrap_or("game.yaml");
            cmd_info(path);
        }
        "prompt" => {
            let is_short = args.iter().any(|a| a == "--short");
            let genre = args.iter()
                .position(|a| a == "--genre")
                .and_then(|i| args.get(i + 1))
                .map(|s| s.as_str());
            cmd_prompt(is_short, genre);
        }
        "genres" => {
            cmd_genres();
        }
        _ => {
            cmd_run(&args[1]);
        }
    }
}

fn print_usage() {
    println!(r#"
 ╔══════════════════════════════════════════════════════╗
 ║   NWGE — NumbahWan Game Engine v0.3.0               ║
 ║   AI-Native • Data-Driven • 2D + 3D PBR             ║
 ╠══════════════════════════════════════════════════════╣
 ║                                                      ║
 ║   nwge run <game.yaml>       Simulate & render       ║
 ║   nwge render <game.yaml>    Render frame as PNG     ║
 ║     --frames N               Render N frames         ║
 ║     --output path            Output path/dir         ║
 ║   nwge validate <game.yaml>  AI-friendly validation  ║
 ║   nwge new <name>            Create new project      ║
 ║   nwge info <game.yaml>      Show game details       ║
 ║   nwge prompt                AI system prompt         ║
 ║     --short                  Compact prompt (~200t)   ║
 ║     --genre <name>           Genre-specific prompt    ║
 ║   nwge genres                List all genres          ║
 ║                                                      ║
 ╚══════════════════════════════════════════════════════╝
"#);
}

// ─── Inventory System ────────────────────────────────────────────

#[derive(Debug, Clone)]
struct InventorySlot {
    item_name: String,
    count: u32,
}

#[derive(Debug, Clone)]
struct Inventory {
    slots: Vec<Option<InventorySlot>>,
    max_slots: usize,
    selected: usize,
}

impl Inventory {
    fn new(max_slots: usize) -> Self {
        Self {
            slots: vec![None; max_slots],
            max_slots,
            selected: 0,
        }
    }

    fn add_item(&mut self, item_name: &str, count: u32) -> bool {
        // Try to stack first
        for slot in self.slots.iter_mut().flatten() {
            if slot.item_name == item_name {
                slot.count += count;
                return true;
            }
        }
        // Find empty slot
        for slot in self.slots.iter_mut() {
            if slot.is_none() {
                *slot = Some(InventorySlot {
                    item_name: item_name.to_string(),
                    count,
                });
                return true;
            }
        }
        false // Inventory full
    }

    fn remove_item(&mut self, item_name: &str, count: u32) -> bool {
        for slot in self.slots.iter_mut() {
            if let Some(s) = slot {
                if s.item_name == item_name {
                    if s.count > count {
                        s.count -= count;
                    } else {
                        *slot = None;
                    }
                    return true;
                }
            }
        }
        false
    }

    fn has_item(&self, item_name: &str) -> bool {
        self.slots.iter().flatten().any(|s| s.item_name == item_name)
    }

    fn item_count(&self, item_name: &str) -> u32 {
        self.slots.iter().flatten()
            .filter(|s| s.item_name == item_name)
            .map(|s| s.count)
            .sum()
    }

    fn selected_item(&self) -> Option<&InventorySlot> {
        self.slots.get(self.selected).and_then(|s| s.as_ref())
    }
}

// ─── Dialog System ──────────────────────────────────────────────

#[derive(Debug, Clone)]
struct DialogState {
    active: bool,
    speaker: String,
    text: String,
    choices: Vec<String>,
    char_index: usize,
    timer: f32,
    full_text: String,
    typewriter_speed: f32,
}

impl DialogState {
    fn new() -> Self {
        Self {
            active: false,
            speaker: String::new(),
            text: String::new(),
            choices: Vec::new(),
            char_index: 0,
            timer: 0.0,
            full_text: String::new(),
            typewriter_speed: 30.0,
        }
    }

    fn show(&mut self, speaker: &str, text: &str) {
        self.active = true;
        self.speaker = speaker.to_string();
        self.full_text = text.to_string();
        self.text.clear();
        self.char_index = 0;
        self.timer = 0.0;
        self.choices.clear();
    }

    fn update(&mut self, dt: f32) {
        if !self.active || self.char_index >= self.full_text.len() {
            return;
        }
        self.timer += dt * self.typewriter_speed;
        while self.timer >= 1.0 && self.char_index < self.full_text.len() {
            self.timer -= 1.0;
            self.char_index += 1;
            self.text = self.full_text[..self.char_index].to_string();
        }
    }

    fn is_complete(&self) -> bool {
        self.char_index >= self.full_text.len()
    }

    fn skip(&mut self) {
        self.char_index = self.full_text.len();
        self.text = self.full_text.clone();
    }

    fn dismiss(&mut self) {
        self.active = false;
    }
}

// ─── Farming System ─────────────────────────────────────────────

#[derive(Debug, Clone)]
struct CropPlot {
    position: Vec2,
    crop_name: String,
    growth_stage: u32,
    max_stage: u32,
    watered: bool,
    days_planted: u32,
    grow_days: u32,
}

#[derive(Debug, Clone)]
struct FarmingSystem {
    plots: Vec<CropPlot>,
}

impl FarmingSystem {
    fn new() -> Self {
        Self { plots: Vec::new() }
    }

    fn plant(&mut self, pos: Vec2, crop_name: &str, grow_days: u32) {
        self.plots.push(CropPlot {
            position: pos,
            crop_name: crop_name.to_string(),
            growth_stage: 0,
            max_stage: 4,
            watered: false,
            days_planted: 0,
            grow_days,
        });
    }

    fn water_at(&mut self, pos: Vec2) -> bool {
        let mut watered = false;
        for plot in &mut self.plots {
            let dist = (plot.position - pos).length();
            if dist < 16.0 && !plot.watered {
                plot.watered = true;
                watered = true;
            }
        }
        watered
    }

    fn advance_day(&mut self) -> Vec<(Vec2, String)> {
        let mut harvestable = Vec::new();
        for plot in &mut self.plots {
            if plot.watered {
                plot.days_planted += 1;
                let stages_per_day = plot.max_stage as f32 / plot.grow_days as f32;
                plot.growth_stage = ((plot.days_planted as f32 * stages_per_day) as u32)
                    .min(plot.max_stage);
            }
            plot.watered = false;
            if plot.growth_stage >= plot.max_stage {
                harvestable.push((plot.position, plot.crop_name.clone()));
            }
        }
        harvestable
    }

    fn harvest_at(&mut self, pos: Vec2) -> Option<String> {
        let idx = self.plots.iter().position(|p| {
            (p.position - pos).length() < 16.0 && p.growth_stage >= p.max_stage
        });
        if let Some(i) = idx {
            let crop = self.plots.remove(i);
            Some(crop.crop_name)
        } else {
            None
        }
    }
}

// ─── Day/Night System ───────────────────────────────────────────

#[derive(Debug, Clone)]
struct DayNightSystem {
    time_of_day: f32,  // 0.0-24.0 (hours)
    day_speed: f32,    // How fast time passes (1.0 = real speed relative to game speed)
    paused: bool,
}

impl DayNightSystem {
    fn new() -> Self {
        Self {
            time_of_day: 6.0, // Start at 6 AM
            day_speed: 2.0,   // 2 hours per real minute at 60fps
            paused: false,
        }
    }

    fn update(&mut self, dt: f32) {
        if self.paused { return; }
        self.time_of_day += dt * self.day_speed / 60.0;
        if self.time_of_day >= 24.0 {
            self.time_of_day -= 24.0;
        }
    }

    fn tint_color(&self) -> Color {
        let hour = self.time_of_day;
        if hour < 5.0 || hour > 21.0 {
            // Night
            Color::new(40, 40, 100, 80)
        } else if hour < 7.0 {
            // Dawn
            let t = (hour - 5.0) / 2.0;
            let r = (40.0 + t * 215.0) as u8;
            let g = (40.0 + t * 180.0) as u8;
            let b = (100.0 + t * 50.0) as u8;
            let a = (80.0 - t * 60.0) as u8;
            Color::new(r, g, b, a)
        } else if hour < 17.0 {
            // Day — no tint
            Color::new(255, 255, 240, 20)
        } else if hour < 19.0 {
            // Sunset
            let t = (hour - 17.0) / 2.0;
            let r = 255;
            let g = (240.0 - t * 100.0) as u8;
            let b = (240.0 - t * 140.0) as u8;
            let a = (20.0 + t * 40.0) as u8;
            Color::new(r, g, b, a)
        } else {
            // Dusk
            let t = (hour - 19.0) / 2.0;
            let r = (255.0 - t * 215.0) as u8;
            let g = (140.0 - t * 100.0) as u8;
            let b = (100.0 + t * 0.0) as u8;
            let a = (60.0 + t * 20.0) as u8;
            Color::new(r, g, b, a)
        }
    }

    fn time_string(&self) -> String {
        let h = self.time_of_day as u32;
        let m = ((self.time_of_day - h as f32) * 60.0) as u32;
        let period = if h < 12 { "AM" } else { "PM" };
        let display_h = if h == 0 { 12 } else if h > 12 { h - 12 } else { h };
        format!("{display_h}:{m:02}{period}")
    }
}

// ─── Scene Manager ──────────────────────────────────────────────

#[derive(Debug, Clone)]
struct SceneManager {
    current_scene: String,
    transition_timer: f32,
    transitioning_to: Option<String>,
    transition_alpha: f32,
}

impl SceneManager {
    fn new(start: &str) -> Self {
        Self {
            current_scene: start.to_string(),
            transition_timer: 0.0,
            transitioning_to: None,
            transition_alpha: 0.0,
        }
    }

    fn start_transition(&mut self, to: &str) {
        self.transitioning_to = Some(to.to_string());
        self.transition_timer = 0.0;
    }

    fn update(&mut self, dt: f32) -> Option<String> {
        if let Some(ref target) = self.transitioning_to {
            self.transition_timer += dt;
            self.transition_alpha = (self.transition_timer * 3.0).min(1.0);
            if self.transition_timer > 0.5 {
                let scene_name = target.clone();
                self.current_scene = scene_name.clone();
                self.transitioning_to = None;
                self.transition_timer = 0.0;
                self.transition_alpha = 0.0;
                return Some(scene_name);
            }
        }
        None
    }
}

// ─── Action Event Queue ─────────────────────────────────────────

#[derive(Debug)]
struct EventQueue {
    pending: Vec<(String, HashMap<String, serde_json::Value>)>,
}

impl EventQueue {
    fn new() -> Self {
        Self { pending: Vec::new() }
    }

    fn emit(&mut self, event: &str) {
        self.pending.push((event.to_string(), HashMap::new()));
    }

    fn emit_with_data(&mut self, event: &str, data: HashMap<String, serde_json::Value>) {
        self.pending.push((event.to_string(), data));
    }

    fn drain(&mut self) -> Vec<(String, HashMap<String, serde_json::Value>)> {
        std::mem::take(&mut self.pending)
    }
}

// ─── Game State ──────────────────────────────────────────────────

struct GameRuntime {
    world: World,
    game_def: GameDefinition,
    framebuffer: Framebuffer,
    camera: Camera2D,
    tilemap: TileMap,
    particles: ParticleSystem,
    input: InputState,
    sprites: SpriteRenderer,
    _game_loop: GameLoop,
    entity_sprites: HashMap<hecs::Entity, EntityVisual>,
    // New systems
    collision_bodies: HashMap<hecs::Entity, CollisionBody>,
    spatial_hash: SpatialHash,
    dialog: DialogState,
    inventory: Inventory,
    farming: FarmingSystem,
    day_night: DayNightSystem,
    scene_mgr: SceneManager,
    events: EventQueue,
    show_inventory: bool,
    interaction_cooldown: f32,
    log_messages: Vec<(String, f32)>, // (message, timer)
}

struct EntityVisual {
    sprite_name: String,
    frame: u32,
    flip_x: bool,
    width: u32,
    height: u32,
    color: Color,
    anim_timer: f32,
    anim_frames: Vec<u32>,
    anim_fps: f32,
}

impl GameRuntime {
    fn new(game_def: GameDefinition) -> Self {
        let res = game_def.game.resolution;
        let mut world = World::new();
        let framebuffer = Framebuffer::new(res[0], res[1]);
        let mut camera = Camera2D::new(res[0] as f32, res[1] as f32);

        // Generate tilemap
        let scene = game_def.scenes.first();
        let (map_w, map_h, tile_size) = scene
            .map(|s| (s.size[0], s.size[1], s.tile_size))
            .unwrap_or((40, 30, 16));

        let scene_name = scene.map(|s| s.name.as_str()).unwrap_or("main");
        let tilemap = generate_tilemap(scene_name, map_w, map_h, tile_size);

        let particles = ParticleSystem::new(500);
        let input = InputState::new();
        let sprites = SpriteRenderer::new();
        let game_loop = GameLoop::new(game_def.game.fps as f64);

        let mut entity_sprites = HashMap::new();
        let mut collision_bodies = HashMap::new();
        let spatial_hash = SpatialHash::new(64.0);

        // Create inventory from player def
        let player_def = game_def.entities.iter().find(|e| e.tags.contains(&"player".to_string()));
        let mut inventory = Inventory::new(
            player_def
                .and_then(|p| p.inventory.as_ref())
                .map(|inv| inv.slots as usize)
                .unwrap_or(24)
        );
        // Add starting items
        if let Some(inv_def) = player_def.and_then(|p| p.inventory.as_ref()) {
            for item in &inv_def.starting_items {
                inventory.add_item(&item.item, item.count);
            }
        }

        // Spawn entities
        for edef in &game_def.entities {
            let pos = edef.position.unwrap_or([160.0, 120.0]);
            let size = edef.size.unwrap_or([16.0, 16.0]);

            let transform = Transform2D {
                position: Vec2::new(pos[0], pos[1]),
                z_order: edef.z_order,
                ..Default::default()
            };

            let velocity = Velocity2D::default();
            let sprite_ref = SpriteRef {
                atlas: edef.sprite.clone().unwrap_or_default(),
                ..Default::default()
            };

            let mut tags = Tags::default();
            for tag in &edef.tags {
                match tag.as_str() {
                    "player" => tags.add(Tags::PLAYER),
                    "enemy" => tags.add(Tags::ENEMY),
                    "npc" => tags.add(Tags::NPC),
                    "item" => tags.add(Tags::ITEM),
                    "solid" => tags.add(Tags::SOLID),
                    "interactable" => tags.add(Tags::INTERACTABLE),
                    _ => {}
                }
            }

            let name = EntityName(edef.name.clone());
            let mut custom_props = CustomProperties::default();
            if let Some(spd) = edef.speed {
                custom_props.set("speed", serde_json::json!(spd));
            }
            if let Some(ai) = &edef.ai {
                custom_props.set("ai_behavior", serde_json::json!(ai));
            }
            for (k, v) in &edef.props {
                custom_props.set(k, v.clone());
            }

            let entity = world.ecs.spawn((transform, velocity, sprite_ref, tags, name, custom_props));
            world.named.insert(edef.name.clone(), entity);

            // Create collision body
            let body_type = BodyType::from_str(&edef.body);
            if body_type != BodyType::None {
                collision_bodies.insert(
                    entity,
                    CollisionBody::new(body_type, size[0], size[1]),
                );
            }

            let color = match edef.tags.first().map(|s| s.as_str()) {
                Some("player") => Color::rgb(60, 120, 255),
                Some("enemy") => Color::rgb(200, 50, 50),
                Some("npc") => Color::rgb(200, 150, 80),
                Some("animal") => Color::rgb(230, 200, 150),
                _ => Color::rgb(150, 150, 150),
            };

            let (anim_frames, anim_fps) = edef.animations.get("idle_down")
                .or(edef.animations.get("idle"))
                .map(|a| (a.frames.clone(), a.fps))
                .unwrap_or((vec![0], 4.0));

            entity_sprites.insert(entity, EntityVisual {
                sprite_name: edef.sprite.clone().unwrap_or_else(|| edef.name.clone()),
                frame: 0,
                flip_x: false,
                width: size[0] as u32,
                height: size[1] as u32,
                color,
                anim_timer: 0.0,
                anim_frames,
                anim_fps,
            });
        }

        // Set initial game state
        for (key, value) in &game_def.variables {
            match value {
                serde_json::Value::Number(n) => {
                    world.state.set_number(key, n.as_f64().unwrap_or(0.0));
                }
                serde_json::Value::Bool(b) => {
                    world.state.set_flag(key, *b);
                }
                serde_json::Value::String(s) => {
                    world.state.set_string(key, s);
                }
                _ => {}
            }
        }

        // Camera at player
        let player_pos = world.named.get("player")
            .and_then(|&e| world.ecs.get::<&Transform2D>(e).ok().map(|t| t.position));

        if let Some(pos) = player_pos {
            camera.position = pos;
            camera.target = pos;
        }

        let scene_mgr = SceneManager::new(
            &game_def.game.start_scene
        );

        Self {
            world, game_def, framebuffer, camera,
            tilemap, particles, input, sprites,
            _game_loop: game_loop,
            entity_sprites,
            collision_bodies,
            spatial_hash,
            dialog: DialogState::new(),
            inventory,
            farming: FarmingSystem::new(),
            day_night: DayNightSystem::new(),
            scene_mgr,
            events: EventQueue::new(),
            show_inventory: false,
            interaction_cooldown: 0.0,
            log_messages: Vec::new(),
        }
    }

    fn add_log(&mut self, msg: &str) {
        self.log_messages.push((msg.to_string(), 3.0));
    }

    // ─── Execute YAML-defined actions ───────────────────────────

    fn execute_actions(&mut self, actions: &[Action]) {
        for action in actions {
            match action {
                Action::ShowDialog { speaker, text, .. } => {
                    let speaker_name = speaker.as_deref().unwrap_or("");
                    // Resolve variables in text
                    let resolved = self.resolve_template(text);
                    self.dialog.show(speaker_name, &resolved);
                }
                Action::SetVar { var, value } => {
                    match value {
                        serde_json::Value::Number(n) => {
                            self.world.state.set_number(var, n.as_f64().unwrap_or(0.0));
                        }
                        serde_json::Value::Bool(b) => {
                            self.world.state.set_flag(var, *b);
                        }
                        serde_json::Value::String(s) => {
                            self.world.state.set_string(var, s);
                        }
                        _ => {}
                    }
                }
                Action::AddVar { var, amount } => {
                    self.world.state.add_number(var, *amount);
                }
                Action::GiveItem { item, count } => {
                    if self.inventory.add_item(item, *count) {
                        self.add_log(&format!("+{count} {item}"));
                    }
                }
                Action::TakeItem { item, count } => {
                    self.inventory.remove_item(item, *count);
                    self.add_log(&format!("-{count} {item}"));
                }
                Action::EmitEvent { event, data } => {
                    self.events.emit_with_data(event, data.clone());
                }
                Action::ChangeScene { to, .. } => {
                    self.scene_mgr.start_transition(to);
                    self.add_log(&format!("Moving to {to}..."));
                }
                Action::Camera { shake, zoom, .. } => {
                    if let Some(intensity) = shake {
                        self.camera.shake(*intensity, 0.3);
                    }
                    if let Some(z) = zoom {
                        self.camera.zoom = *z;
                    }
                }
                Action::PlaySound { sound, .. } => {
                    self.add_log(&format!("[SFX: {sound}]"));
                }
                Action::PlayMusic { track, .. } => {
                    self.add_log(&format!("[Music: {track}]"));
                }
                Action::Conditional { condition, then, r#else } => {
                    if self.evaluate_condition(condition) {
                        self.execute_actions(then);
                    } else {
                        self.execute_actions(r#else);
                    }
                }
                Action::Damage { target, amount, .. } => {
                    if let Some(&entity) = self.world.named.get(target.as_str()) {
                        if let Ok(mut health) = self.world.ecs.get::<&mut Health>(entity) {
                            health.current = (health.current - amount).max(0.0);
                        }
                    }
                    self.camera.shake(3.0, 0.2);
                }
                Action::Heal { target, amount } => {
                    if let Some(&entity) = self.world.named.get(target.as_str()) {
                        if let Ok(mut health) = self.world.ecs.get::<&mut Health>(entity) {
                            health.current = (health.current + amount).min(health.max);
                        }
                    }
                }
                _ => {}
            }
        }
    }

    fn resolve_template(&self, template: &str) -> String {
        let mut result = template.to_string();
        for (key, val) in &self.world.state.numbers {
            result = result.replace(&format!("{{{key}}}"), &format!("{}", *val as i64));
        }
        for (key, val) in &self.world.state.strings {
            result = result.replace(&format!("{{{key}}}"), val);
        }
        result
    }

    fn evaluate_condition(&self, condition: &str) -> bool {
        let parts: Vec<&str> = condition.split_whitespace().collect();
        if parts.len() == 3 {
            let var_name = parts[0];
            let op = parts[1];
            let val_str = parts[2];
            let var_val = self.world.state.get_number(var_name);
            let cmp_val: f64 = val_str.parse().unwrap_or(0.0);
            match op {
                ">=" => var_val >= cmp_val,
                "<=" => var_val <= cmp_val,
                ">" => var_val > cmp_val,
                "<" => var_val < cmp_val,
                "==" => (var_val - cmp_val).abs() < 0.001,
                "!=" => (var_val - cmp_val).abs() >= 0.001,
                _ => false,
            }
        } else if parts.len() == 2 && parts[0] == "has_item" {
            self.inventory.has_item(parts[1])
        } else if parts.len() == 1 {
            self.world.state.get_flag(parts[0])
        } else {
            false
        }
    }

    // ─── Process pending events ─────────────────────────────────

    fn process_events(&mut self) {
        let pending = self.events.drain();
        for (event_name, _data) in pending {
            if let Some(actions) = self.game_def.events.get(&event_name).cloned() {
                self.execute_actions(&actions);
            }
        }
    }

    // ─── Main Update ────────────────────────────────────────────

    fn update(&mut self, dt: f32) {
        // Update log timers
        self.log_messages.retain_mut(|(_, timer)| {
            *timer -= dt;
            *timer > 0.0
        });

        // Handle interaction cooldown
        if self.interaction_cooldown > 0.0 {
            self.interaction_cooldown -= dt;
        }

        // Dialog takes priority
        if self.dialog.active {
            self.dialog.update(dt);
            if self.input.is_action_pressed(nwge_input::Action::Confirm)
                || self.input.is_action_pressed(nwge_input::Action::Interact) {
                if self.dialog.is_complete() {
                    self.dialog.dismiss();
                } else {
                    self.dialog.skip();
                }
            }
            return;
        }

        // Toggle inventory
        if self.input.is_action_pressed(nwge_input::Action::OpenInventory) {
            self.show_inventory = !self.show_inventory;
        }

        if self.show_inventory {
            // Navigate inventory
            if self.input.is_key_pressed(nwge_input::Key::Right) {
                self.inventory.selected = (self.inventory.selected + 1) % self.inventory.max_slots;
            }
            if self.input.is_key_pressed(nwge_input::Key::Left) {
                if self.inventory.selected > 0 {
                    self.inventory.selected -= 1;
                } else {
                    self.inventory.selected = self.inventory.max_slots - 1;
                }
            }
            return;
        }

        // Day/night
        self.day_night.update(dt);

        // Scene transitions
        if let Some(_new_scene) = self.scene_mgr.update(dt) {
            // Scene transition complete — would reload tilemap and entities
            self.add_log("Scene loaded!");
        }

        // ─── Player movement ─────────────────────────────
        let move_dir = self.input.movement_vector();
        let is_sprinting = self.input.is_action_down(nwge_input::Action::Sprint);

        if let Some(&player_e) = self.world.named.get("player") {
            let speed = {
                let props = self.world.ecs.get::<&CustomProperties>(player_e).ok();
                let base = props.map(|p| p.get_f64("speed") as f32).unwrap_or(80.0);
                if is_sprinting { base * 1.5 } else { base }
            };

            let new_pos = {
                let t = self.world.ecs.get::<&Transform2D>(player_e).ok();
                t.map(|t| t.position + move_dir * speed * dt)
            };

            if let Some(mut pos) = new_pos {
                // Tile collision
                let tile_solids: Vec<bool> = self.tilemap.layers.first()
                    .map(|layer| layer.iter().map(|t| t.solid).collect())
                    .unwrap_or_default();
                let half = Vec2::new(7.0, 7.0);
                resolve_tile_collision(
                    &mut pos,
                    half,
                    &tile_solids,
                    self.tilemap.width,
                    self.tilemap.height,
                    self.tilemap.tile_size as f32,
                );

                // Clamp to world
                let tile_size = self.tilemap.tile_size as f32;
                let world_w = self.tilemap.width as f32 * tile_size;
                let world_h = self.tilemap.height as f32 * tile_size;
                pos.x = pos.x.clamp(8.0, world_w - 8.0);
                pos.y = pos.y.clamp(8.0, world_h - 8.0);

                if let Ok(mut t) = self.world.ecs.get::<&mut Transform2D>(player_e) {
                    t.position = pos;
                }
                self.camera.target = pos;
            }

            // Update flip
            if move_dir.x != 0.0 {
                if let Some(vis) = self.entity_sprites.get_mut(&player_e) {
                    vis.flip_x = move_dir.x < 0.0;
                }
            }

            // ─── Interaction ─────────────────────────────
            if self.input.is_action_pressed(nwge_input::Action::Interact)
                && self.interaction_cooldown <= 0.0
            {
                self.interaction_cooldown = 0.3;
                let player_pos = self.world.ecs.get::<&Transform2D>(player_e)
                    .ok().map(|t| t.position).unwrap_or(Vec2::ZERO);

                let facing_dir = if let Some(vis) = self.entity_sprites.get(&player_e) {
                    if vis.flip_x { Vec2::new(-1.0, 0.0) } else { Vec2::new(1.0, 0.0) }
                } else {
                    Vec2::new(1.0, 0.0)
                };
                let interact_pos = player_pos + facing_dir * 16.0;

                // Check NPCs for interaction
                let mut interacted = false;
                let entities_to_check: Vec<(hecs::Entity, String)> = self.world.named.iter()
                    .map(|(name, &e)| (e, name.clone()))
                    .collect();

                for (entity, name) in &entities_to_check {
                    if *entity == player_e { continue; }
                    let e_pos = self.world.ecs.get::<&Transform2D>(*entity)
                        .ok().map(|t| t.position);
                    let is_interactable = self.world.ecs.get::<&Tags>(*entity)
                        .ok().map(|t| t.has(Tags::INTERACTABLE) || t.has(Tags::NPC))
                        .unwrap_or(false);

                    if let Some(pos) = e_pos {
                        if is_interactable && (pos - interact_pos).length() < 24.0 {
                            // Find entity def for this NPC
                            let entity_def = self.game_def.entities.iter()
                                .find(|e| e.name == *name);

                            // Check for on_interact event
                            if let Some(edef) = entity_def {
                                if let Some(event_name) = &edef.on_interact {
                                    self.events.emit(event_name);
                                    interacted = true;
                                    break;
                                }
                                // Check for dialog
                                if let Some(dialog_nodes) = &edef.dialog {
                                    if let Some(node) = dialog_nodes.first() {
                                        self.dialog.show(&edef.name, &node.text);
                                        interacted = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                if !interacted {
                    // Try farming actions
                    if let Some(selected) = self.inventory.selected_item() {
                        let item_name = selected.item_name.clone();
                        let item_def = self.game_def.items.iter()
                            .find(|i| i.name == item_name);

                        if let Some(idef) = item_def {
                            match idef.r#type.as_str() {
                                "seed" => {
                                    if let Some(crop) = &idef.crop {
                                        self.farming.plant(interact_pos, crop, 4);
                                        self.inventory.remove_item(&item_name, 1);
                                        self.add_log(&format!("Planted {}", item_name));
                                        self.particles.emit(
                                            interact_pos, 8,
                                            Color::rgb(139, 90, 43),
                                            20.0, 0.5, 30.0,
                                        );
                                    }
                                }
                                "tool" if idef.tool_type.as_deref() == Some("watering_can") => {
                                    if self.farming.water_at(interact_pos) {
                                        self.add_log("Watered crops");
                                        self.particles.emit(
                                            interact_pos, 5,
                                            Color::rgb(80, 150, 255),
                                            15.0, 0.3, 10.0,
                                        );
                                    }
                                }
                                "tool" if idef.tool_type.as_deref() == Some("hoe") => {
                                    self.add_log("Tilled soil");
                                    self.particles.emit(
                                        interact_pos, 6,
                                        Color::rgb(139, 90, 43),
                                        15.0, 0.3, 40.0,
                                    );
                                }
                                _ => {}
                            }
                        }
                    }

                    // Try harvest
                    if let Some(crop) = self.farming.harvest_at(interact_pos) {
                        self.inventory.add_item(&crop, 1);
                        self.add_log(&format!("Harvested {crop}!"));
                        self.events.emit("crop_harvested");
                        self.particles.emit(
                            interact_pos, 12,
                            Color::YELLOW,
                            30.0, 0.8, -20.0,
                        );
                    }
                }
            }

            // ─── Cycle held item ──────────────────────────
            if self.input.is_action_pressed(nwge_input::Action::NextItem) {
                self.inventory.selected = (self.inventory.selected + 1) % self.inventory.max_slots;
            }
            if self.input.is_action_pressed(nwge_input::Action::PrevItem) {
                if self.inventory.selected > 0 {
                    self.inventory.selected -= 1;
                } else {
                    self.inventory.selected = self.inventory.max_slots - 1;
                }
            }
        }

        // ─── NPC AI ──────────────────────────────────────
        let mut wander_updates: Vec<(hecs::Entity, Vec2)> = Vec::new();
        let player_entity = self.world.named.get("player").copied();

        for (&entity, _visual) in &self.entity_sprites {
            if Some(entity) == player_entity { continue; }
            if let Ok(props) = self.world.ecs.get::<&CustomProperties>(entity) {
                let behavior = props.get_str("ai_behavior").to_string();
                match behavior.as_str() {
                    "wander" => {
                        if fastrand::f32() < 0.02 {
                            let angle = fastrand::f32() * std::f32::consts::TAU;
                            wander_updates.push((entity, Vec2::new(angle.cos() * 20.0, angle.sin() * 20.0)));
                        }
                    }
                    "follow" => {
                        if let Some(&pe) = self.world.named.get("player") {
                            let player_pos = self.world.ecs.get::<&Transform2D>(pe)
                                .ok().map(|t| t.position);
                            let npc_pos = self.world.ecs.get::<&Transform2D>(entity)
                                .ok().map(|t| t.position);
                            if let (Some(pp), Some(np)) = (player_pos, npc_pos) {
                                let dir = pp - np;
                                if dir.length() > 30.0 {
                                    wander_updates.push((entity, dir.normalize() * 40.0));
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        }

        for (entity, vel) in wander_updates {
            if let Ok(mut v) = self.world.ecs.get::<&mut Velocity2D>(entity) {
                v.linear = vel;
            }
        }

        // Apply velocity
        for (_id, (transform, velocity)) in self.world.ecs.query_mut::<(&mut Transform2D, &Velocity2D)>() {
            transform.position += velocity.linear * dt;
        }

        // Friction
        for (_id, velocity) in self.world.ecs.query_mut::<(&mut Velocity2D,)>() {
            velocity.0.linear *= 0.95;
        }

        // ─── Collision broad phase ───────────────────────
        self.spatial_hash.clear();
        for (&entity, body) in &self.collision_bodies {
            if let Ok(t) = self.world.ecs.get::<&Transform2D>(entity) {
                let aabb = body.aabb_at(t.position);
                self.spatial_hash.insert(entity.to_bits().into(), aabb);
            }
        }

        // Animate sprites
        for vis in self.entity_sprites.values_mut() {
            vis.anim_timer += dt;
            let frame_duration = 1.0 / vis.anim_fps;
            if vis.anim_timer >= frame_duration && !vis.anim_frames.is_empty() {
                vis.anim_timer -= frame_duration;
                let current_idx = vis.anim_frames.iter().position(|&f| f == vis.frame).unwrap_or(0);
                let next_idx = (current_idx + 1) % vis.anim_frames.len();
                vis.frame = vis.anim_frames[next_idx];
            }
        }

        // Camera
        self.camera.update(dt);

        // Particles
        self.particles.update(dt);

        // Process events
        self.process_events();

        self.world.frame += 1;
        self.world.elapsed += dt as f64;
    }

    // ─── Render ─────────────────────────────────────────────────

    fn render(&mut self) {
        let fb = &mut self.framebuffer;
        fb.clear(Color::rgb(135, 206, 180));

        // Draw tilemap
        self.tilemap.draw(fb, &self.camera);

        // Draw crop plots
        for plot in &self.farming.plots {
            let screen = self.camera.world_to_screen(plot.position);
            let sx = screen.x as i32;
            let sy = screen.y as i32;

            // Tilled soil
            fb.fill_rect(sx - 8, sy - 8, 16, 16, Color::rgb(100, 70, 40));

            if plot.growth_stage == 0 {
                // Seed
                fb.fill_rect(sx - 1, sy - 1, 3, 3, Color::rgb(139, 90, 43));
            } else if plot.growth_stage < plot.max_stage {
                // Growing
                let height = 2 + plot.growth_stage as i32 * 3;
                let green = Color::rgb(50 + plot.growth_stage as u8 * 30, 180, 50);
                fb.fill_rect(sx - 1, sy - height, 3, height, green);
                if plot.growth_stage >= 2 {
                    fb.fill_rect(sx - 3, sy - height - 2, 7, 3, green.lighten(20));
                }
            } else {
                // Ready to harvest!
                let crop_color = match plot.crop_name.as_str() {
                    "turnip" => Color::rgb(220, 200, 255),
                    "melon" => Color::rgb(100, 200, 50),
                    "pumpkin" => Color::ORANGE,
                    "strawberry" => Color::RED,
                    _ => Color::YELLOW,
                };
                fb.fill_circle(sx, sy - 6, 5, crop_color);
                fb.fill_rect(sx - 1, sy - 2, 3, 4, Color::rgb(40, 120, 40));
                // Sparkle
                if self.world.frame % 30 < 15 {
                    fb.set(sx + 4, sy - 10, Color::YELLOW);
                    fb.set(sx - 3, sy - 8, Color::YELLOW);
                }
            }

            // Watered indicator
            if plot.watered {
                fb.fill_rect(sx - 8, sy + 6, 16, 2, Color::rgb(80, 120, 200));
            }
        }

        // Collect entities sorted by z-order
        let mut render_list: Vec<(i32, hecs::Entity)> = Vec::new();
        for (entity, transform) in self.world.ecs.query_mut::<(&Transform2D,)>() {
            render_list.push((transform.0.z_order, entity));
        }
        render_list.sort_by_key(|(z, _)| *z);

        // Draw entities
        for (_, entity) in &render_list {
            let pos = {
                let Ok(t) = self.world.ecs.get::<&Transform2D>(*entity) else { continue };
                t.position
            };
            let screen = self.camera.world_to_screen(pos);
            let sx = screen.x as i32;
            let sy = screen.y as i32;

            if let Some(vis) = self.entity_sprites.get(entity) {
                let w = vis.width as i32;
                let h = vis.height as i32;

                let placeholder = generate_placeholder(
                    vis.width, vis.height, vis.color, &vis.sprite_name,
                );
                fb.blit_region(
                    &placeholder,
                    0, 0, w, h,
                    sx - w / 2, sy - h / 2,
                    vis.flip_x, false,
                );

                // Shadow
                fb.fill_rect(sx - w / 2 + 2, sy + h / 2 - 2, w - 4, 3,
                    Color::new(0, 0, 0, 40));

                // Name labels for NPCs
                if let Ok(name) = self.world.ecs.get::<&EntityName>(*entity) {
                    if let Ok(tags) = self.world.ecs.get::<&Tags>(*entity) {
                        if tags.has(Tags::NPC) || tags.has(Tags::INTERACTABLE) {
                            let label = &name.0;
                            let label_x = sx - (label.len() as i32 * 5) / 2;
                            text::draw_text_shadow(
                                fb, label, label_x, sy - h / 2 - 10,
                                Color::WHITE, Color::BLACK,
                            );
                        }
                    }
                }
            }
        }

        // Particles
        self.particles.draw(fb, &self.camera);

        // ─── Day/night tint overlay ──────────────────────
        let tint = self.day_night.tint_color();
        if tint.a > 10 {
            let fw = fb.width as i32;
            let fh = fb.height as i32;
            fb.fill_rect(0, 0, fw, fh, tint);
        }

        // ─── HUD ────────────────────────────────────────

        let fw = fb.width as i32;
        let fh = fb.height as i32;

        // Top bar
        fb.fill_rect(0, 0, fw, 14, Color::new(0, 0, 0, 200));

        // Game title
        text::draw_text(fb, &self.game_def.game.name, 2, 2, Color::ORANGE);

        // Gold
        let gold = self.world.state.get_number("gold") as i32;
        let gold_str = format!("{}G", gold);
        text::draw_text(fb, &gold_str, fw / 2 - 15, 2, Color::YELLOW);

        // Time
        let time_str = self.day_night.time_string();
        let time_w = time_str.len() as i32 * 5;
        text::draw_text(fb, &time_str, fw - time_w - 2, 2, Color::WHITE);

        // Day & Season
        let day = self.world.state.get_number("day") as i32;
        let season = self.world.state.get_string("season").to_string();
        let day_str = format!("D{} {}", day, season);
        let day_w = day_str.len() as i32 * 5;
        text::draw_text(fb, &day_str, fw - day_w - 2, 8, Color::YELLOW);

        // ─── Hotbar ─────────────────────────────────────
        let hotbar_slots = 8.min(self.inventory.max_slots);
        let slot_w = 18;
        let hotbar_w = hotbar_slots as i32 * slot_w + 4;
        let hotbar_x = (fw - hotbar_w) / 2;
        let hotbar_y = fh - 22;

        fb.fill_rect(hotbar_x - 2, hotbar_y - 2, hotbar_w + 4, 22, Color::new(0, 0, 0, 180));

        for i in 0..hotbar_slots {
            let sx = hotbar_x + i as i32 * slot_w + 2;
            let sy = hotbar_y;

            // Slot background
            let bg = if i == self.inventory.selected {
                Color::rgb(80, 80, 120)
            } else {
                Color::rgb(40, 40, 50)
            };
            fb.fill_rect(sx, sy, 16, 16, bg);
            fb.draw_rect(sx, sy, 16, 16, Color::rgb(100, 100, 120));

            // Item icon
            if let Some(slot) = &self.inventory.slots[i] {
                let item_color = match self.game_def.items.iter().find(|it| it.name == slot.item_name) {
                    Some(idef) => match idef.r#type.as_str() {
                        "tool" => Color::rgb(180, 180, 200),
                        "seed" => Color::rgb(139, 90, 43),
                        "crop" | "food" => Color::rgb(100, 200, 80),
                        _ => Color::GRAY,
                    },
                    None => Color::GRAY,
                };
                fb.fill_rect(sx + 2, sy + 2, 12, 12, item_color);

                // Show count
                if slot.count > 1 {
                    let count_str = format!("{}", slot.count);
                    text::draw_text(fb, &count_str,
                        sx + 16 - count_str.len() as i32 * 5, sy + 10,
                        Color::WHITE);
                }

                // Item initial
                let initial = slot.item_name.chars().next().unwrap_or('?').to_uppercase().to_string();
                text::draw_text(fb, &initial, sx + 5, sy + 4, Color::WHITE);
            }
        }

        // Selected item name
        if let Some(slot) = self.inventory.selected_item() {
            let name = &slot.item_name;
            let name_w = name.len() as i32 * 5;
            text::draw_text_shadow(fb, name, (fw - name_w) / 2, hotbar_y - 10,
                Color::WHITE, Color::BLACK);
        }

        // ─── Inventory screen ───────────────────────────
        if self.show_inventory {
            render_inventory_screen(
                fb, &self.inventory, &self.game_def, self.world.frame,
            );
        }

        // ─── Dialog box ─────────────────────────────────
        if self.dialog.active {
            render_dialog_box(
                fb, &self.dialog, self.world.frame,
            );
        }

        // ─── Log messages ───────────────────────────────
        let mut log_y = fh - 45;
        for (msg, timer) in self.log_messages.iter().rev().take(4) {
            let alpha = ((*timer / 3.0) * 255.0).min(255.0) as u8;
            if alpha > 20 {
                let color = Color::new(255, 255, 200, alpha);
                text::draw_text_shadow(fb, msg, 2, log_y, color, Color::new(0, 0, 0, alpha));
                log_y -= 8;
            }
        }

        // Bottom bar
        fb.fill_rect(0, fh - 8, fw, 8, Color::new(0, 0, 0, 160));
        let controls = format!(
            "WASD:Move E:Act Tab:Inv Shift:Run [{}]",
            self.scene_mgr.current_scene
        );
        text::draw_text(fb, &controls, 2, fh - 7, Color::GRAY);

        // Frame/FPS
        let frame_str = format!("F:{}", self.world.frame);
        text::draw_text(fb, &frame_str, fw - 30, fh - 7, Color::DARK_GRAY);

        // Scene transition fade
        if self.scene_mgr.transition_alpha > 0.0 {
            let a = (self.scene_mgr.transition_alpha * 255.0) as u8;
            fb.fill_rect(0, 0, fw, fh, Color::new(0, 0, 0, a));
        }
    }

    fn save_frame(&self, path: &str) -> Result<(), String> {
        let scale = self.game_def.game.scale;
        let out_w = self.framebuffer.width * scale;
        let out_h = self.framebuffer.height * scale;
        let mut scaled = Framebuffer::new(out_w, out_h);
        scaled.blit_scaled(&self.framebuffer, 0, 0, scale);
        scaled.save_png(path)
    }
}

// ─── Free rendering helpers (to avoid borrow conflicts) ─────────

fn render_dialog_box(fb: &mut Framebuffer, dialog: &DialogState, frame: u64) {
    let fw = fb.width as i32;
    let fh = fb.height as i32;

    let box_h = 50;
    let box_y = fh - box_h - 30;
    let box_x = 10;
    let box_w = fw - 20;

    fb.fill_rect(box_x, box_y, box_w, box_h, Color::new(10, 10, 30, 220));
    fb.draw_rect(box_x, box_y, box_w, box_h, Color::rgb(100, 100, 200));
    fb.draw_rect(box_x + 1, box_y + 1, box_w - 2, box_h - 2, Color::rgb(60, 60, 140));

    if !dialog.speaker.is_empty() {
        let name_w = dialog.speaker.len() as i32 * 5 + 8;
        fb.fill_rect(box_x + 4, box_y - 8, name_w, 10, Color::rgb(60, 60, 140));
        fb.draw_rect(box_x + 4, box_y - 8, name_w, 10, Color::rgb(100, 100, 200));
        text::draw_text(fb, &dialog.speaker, box_x + 8, box_y - 6, Color::ORANGE);
    }

    let max_chars_per_line = (box_w - 16) / 5;
    let words: Vec<&str> = dialog.text.split_whitespace().collect();
    let mut lines: Vec<String> = Vec::new();
    let mut current_line = String::new();

    for word in &words {
        if current_line.len() + word.len() + 1 > max_chars_per_line as usize {
            lines.push(current_line.clone());
            current_line.clear();
        }
        if !current_line.is_empty() {
            current_line.push(' ');
        }
        current_line.push_str(word);
    }
    if !current_line.is_empty() {
        lines.push(current_line);
    }

    for (i, line) in lines.iter().enumerate().take(4) {
        text::draw_text(fb, line, box_x + 8, box_y + 6 + i as i32 * 9, Color::WHITE);
    }

    if dialog.is_complete() {
        let blink = (frame / 20) % 2 == 0;
        if blink {
            text::draw_text(fb, ">", box_x + box_w - 12, box_y + box_h - 10, Color::YELLOW);
        }
    }
}

fn render_inventory_screen(
    fb: &mut Framebuffer,
    inventory: &Inventory,
    game_def: &GameDefinition,
    _frame: u64,
) {
    let fw = fb.width as i32;
    let fh = fb.height as i32;

    fb.fill_rect(0, 0, fw, fh, Color::new(0, 0, 0, 120));

    let panel_w = 200;
    let panel_h = 150;
    let panel_x = (fw - panel_w) / 2;
    let panel_y = (fh - panel_h) / 2;

    fb.fill_rect(panel_x, panel_y, panel_w, panel_h, Color::new(20, 20, 40, 230));
    fb.draw_rect(panel_x, panel_y, panel_w, panel_h, Color::rgb(100, 100, 200));

    text::draw_text_shadow(fb, "INVENTORY", panel_x + 70, panel_y + 4, Color::ORANGE, Color::BLACK);

    let cols = 6;
    let slot_size = 20;
    let grid_x = panel_x + 10;
    let grid_y = panel_y + 16;

    for i in 0..inventory.max_slots.min(24) {
        let col = i % cols;
        let row = i / cols;
        let sx = grid_x + col as i32 * (slot_size + 2);
        let sy = grid_y + row as i32 * (slot_size + 2);

        let bg = if i == inventory.selected {
            Color::rgb(80, 80, 140)
        } else {
            Color::rgb(30, 30, 50)
        };
        fb.fill_rect(sx, sy, slot_size, slot_size, bg);
        fb.draw_rect(sx, sy, slot_size, slot_size, Color::rgb(80, 80, 100));

        if let Some(slot) = &inventory.slots[i] {
            let item_color = Color::rgb(120, 200, 120);
            fb.fill_rect(sx + 3, sy + 3, slot_size - 6, slot_size - 6, item_color);
            let initial = slot.item_name.chars().next().unwrap_or('?').to_uppercase().to_string();
            text::draw_text(fb, &initial, sx + 6, sy + 6, Color::WHITE);
            if slot.count > 1 {
                let c = format!("{}", slot.count);
                text::draw_text(fb, &c, sx + slot_size - c.len() as i32 * 5 - 1,
                    sy + slot_size - 7, Color::YELLOW);
            }
        }
    }

    if let Some(slot) = inventory.selected_item() {
        let detail_y = grid_y + (inventory.max_slots.min(24) / cols + 1) as i32 * (slot_size + 2) + 4;
        text::draw_text(fb, &slot.item_name, panel_x + 10, detail_y, Color::WHITE);
        text::draw_text(fb, &format!("x{}", slot.count), panel_x + 10, detail_y + 8, Color::YELLOW);

        if let Some(idef) = game_def.items.iter().find(|i| i.name == slot.item_name) {
            if let Some(desc) = &idef.description {
                text::draw_text(fb, desc, panel_x + 10, detail_y + 16, Color::GRAY);
            }
        }
    }
}

// ─── Tilemap Generation ─────────────────────────────────────────

fn generate_tilemap(scene_name: &str, w: u32, h: u32, tile_size: u32) -> TileMap {
    match scene_name {
        "town" => TileMap::generate_town(w, h, tile_size),
        "beach" => TileMap::generate_beach(w, h, tile_size),
        _ => TileMap::generate_farm(w, h, tile_size),
    }
}

// ─── Commands ────────────────────────────────────────────────────

fn cmd_run(path_str: &str) {
    let game_def = load_game_file(path_str);

    println!("🎮 NWGE Engine v0.3.0");
    println!("✅ Loaded: {} ({}) [{}]", game_def.game.name, game_def.game.genre, game_def.game.render_mode);
    println!("   {} entities, {} items, {} scenes",
        game_def.entities.len(), game_def.items.len(), game_def.scenes.len());
    println!("   {} systems, {} event handlers",
        game_def.systems.len(), game_def.events.len());

    // Check if this is a 3D game
    if game_def.game.render_mode == "3d" || game_def.scene3d.is_some() {
        println!("\n🎲 Detected 3D game — rendering with PBR pipeline...\n");
        render_3d_game(&game_def, &format!("nwge3d_{}.png",
            game_def.game.name.to_lowercase().replace(' ', "_")));
        return;
    }

    // 2D game runtime (existing code below)
    println!("   {} entities, {} items, {} scenes",
        game_def.entities.len(), game_def.items.len(), game_def.scenes.len());
    println!("   {} systems, {} event handlers",
        game_def.systems.len(), game_def.events.len());

    let mut runtime = GameRuntime::new(game_def);

    // Fire game_start event
    runtime.events.emit("game_start");
    runtime.process_events();

    // Simulate 300 frames (5 seconds)
    println!("\n⏱  Simulating 300 frames (5 seconds)...");
    let dt = 1.0 / 60.0;
    let total_frames = 300u32;

    for frame in 0..total_frames {
        runtime.input.begin_frame();

        // Simulate a rich play session
        match frame {
            // Walk right for 60 frames
            0..=59 => {
                runtime.input.key_down(nwge_input::Key::D);
            }
            // Stop, interact with mayor
            60..=64 => {
                runtime.input.key_up(nwge_input::Key::D);
            }
            65 => {
                runtime.input.key_down(nwge_input::Key::E); // interact
            }
            66..=89 => {
                runtime.input.key_up(nwge_input::Key::E);
                // Wait for dialog to finish
                runtime.input.key_down(nwge_input::Key::Enter);
                runtime.input.key_up(nwge_input::Key::Enter);
            }
            // Walk down
            90..=119 => {
                runtime.input.key_down(nwge_input::Key::S);
            }
            // Select seeds and plant
            120..=124 => {
                runtime.input.key_up(nwge_input::Key::S);
                // Find seed slot
                for i in 0..runtime.inventory.max_slots {
                    if let Some(slot) = &runtime.inventory.slots[i] {
                        if slot.item_name.contains("seed") {
                            runtime.inventory.selected = i;
                            break;
                        }
                    }
                }
            }
            125 => {
                runtime.input.key_down(nwge_input::Key::E); // plant
            }
            126..=139 => {
                runtime.input.key_up(nwge_input::Key::E);
            }
            // Walk right some more, try watering
            140..=169 => {
                // Select watering can
                for i in 0..runtime.inventory.max_slots {
                    if let Some(slot) = &runtime.inventory.slots[i] {
                        if slot.item_name == "watering_can" {
                            runtime.inventory.selected = i;
                            break;
                        }
                    }
                }
                runtime.input.key_down(nwge_input::Key::D);
            }
            170 => {
                runtime.input.key_up(nwge_input::Key::D);
                runtime.input.key_down(nwge_input::Key::E); // water
            }
            // Open inventory briefly
            180 => {
                runtime.input.key_up(nwge_input::Key::E);
                runtime.input.key_down(nwge_input::Key::Tab);
            }
            190 => {
                runtime.input.key_up(nwge_input::Key::Tab);
                runtime.input.key_down(nwge_input::Key::Tab); // close
            }
            // Sprint around
            200..=249 => {
                runtime.input.key_up(nwge_input::Key::Tab);
                runtime.input.key_down(nwge_input::Key::A);
                runtime.input.key_down(nwge_input::Key::Shift);
            }
            // Walk down to shipping bin
            250..=279 => {
                runtime.input.key_up(nwge_input::Key::A);
                runtime.input.key_up(nwge_input::Key::Shift);
                runtime.input.key_down(nwge_input::Key::S);
                runtime.input.key_down(nwge_input::Key::D);
            }
            _ => {
                runtime.input.key_up(nwge_input::Key::S);
                runtime.input.key_up(nwge_input::Key::D);
            }
        }

        runtime.update(dt);

        // Emit particles occasionally
        if frame % 40 == 0 {
            if let Some(&player_e) = runtime.world.named.get("player") {
                if let Ok(t) = runtime.world.ecs.get::<&Transform2D>(player_e) {
                    runtime.particles.emit(
                        t.position, 4, Color::rgb(100, 200, 100), 25.0, 0.8, 40.0,
                    );
                }
            }
        }
    }

    // Render multiple frames showing different states
    let frames_to_render = vec![
        ("nwge_gameplay.png", "Main gameplay frame"),
    ];

    runtime.render();
    for (filename, desc) in &frames_to_render {
        match runtime.save_frame(filename) {
            Ok(_) => println!("📸 {desc}: {filename}"),
            Err(e) => eprintln!("❌ Failed to save {filename}: {e}"),
        }
    }

    // Also render inventory screen
    runtime.show_inventory = true;
    runtime.render();
    match runtime.save_frame("nwge_inventory.png") {
        Ok(_) => println!("📸 Inventory screen: nwge_inventory.png"),
        Err(e) => eprintln!("❌ Failed: {e}"),
    }
    runtime.show_inventory = false;

    // Render with dialog
    runtime.dialog.show("Mayor", "Welcome to Sunflower Valley! This farm has been waiting for someone like you.");
    runtime.dialog.skip();
    runtime.render();
    match runtime.save_frame("nwge_dialog.png") {
        Ok(_) => println!("📸 Dialog: nwge_dialog.png"),
        Err(e) => eprintln!("❌ Failed: {e}"),
    }

    // Stats
    println!("\n✅ Simulation complete!");
    println!("   Frames:     {}", runtime.world.frame);
    println!("   Elapsed:    {:.2}s", runtime.world.elapsed);
    println!("   Entities:   {}", runtime.world.ecs.len());
    println!("   Particles:  {}", runtime.particles.particles.len());
    println!("   Crop plots: {}", runtime.farming.plots.len());
    println!("   Inventory:  {} items", runtime.inventory.slots.iter().flatten().count());
    println!("   Gold:       {}G", runtime.world.state.get_number("gold") as i64);
    println!("   Time:       {}", runtime.day_night.time_string());
    println!("   Scene:      {}", runtime.scene_mgr.current_scene);
}

fn cmd_render(path_str: &str, frames: u32, output: &str) {
    let game_def = load_game_file(path_str);
    println!("🎮 Rendering {} frame(s) of '{}'", frames, game_def.game.name);

    // 3D game path
    if game_def.game.render_mode == "3d" || game_def.scene3d.is_some() {
        render_3d_game(&game_def, output);
        return;
    }

    // 2D game rendering

    let mut runtime = GameRuntime::new(game_def);
    runtime.events.emit("game_start");
    runtime.process_events();

    let dt = 1.0 / 60.0;

    for frame in 0..frames.max(1) {
        runtime.input.begin_frame();
        if frame < frames / 2 {
            runtime.input.key_down(nwge_input::Key::D);
        } else {
            runtime.input.key_up(nwge_input::Key::D);
            runtime.input.key_down(nwge_input::Key::S);
        }
        runtime.update(dt);
    }

    runtime.render();

    if frames == 1 {
        let out = if output.ends_with(".png") { output.to_string() } else { format!("{output}.png") };
        match runtime.save_frame(&out) {
            Ok(_) => println!("📸 Saved: {out}"),
            Err(e) => eprintln!("❌ Error: {e}"),
        }
    } else {
        std::fs::create_dir_all(output).ok();
        let out = format!("{}/frame_{:04}.png", output, frames);
        match runtime.save_frame(&out) {
            Ok(_) => println!("📸 Saved: {out}"),
            Err(e) => eprintln!("❌ Error: {e}"),
        }
    }
}

fn cmd_validate(path_str: &str) {
    let path = Path::new(path_str);
    println!("🔍 Validating: {}", path.display());
    match try_load(path) {
        Ok(def) => {
            // Use AI-friendly validator from nwge-ai
            let result = nwge_ai::validate_game(&def);
            print!("{}", result.to_ai_string());
            if result.valid {
                println!("✅ Game definition is valid!");
            } else {
                println!("❌ Fix the errors above and re-validate.");
                std::process::exit(1);
            }
        }
        Err(e) => {
            eprintln!("❌ YAML parse error: {e}");
            eprintln!("   FIX: Check YAML syntax — indentation, colons, dashes");
            std::process::exit(1);
        }
    }
}

fn cmd_new(name: &str) {
    let dir = Path::new(name);
    if dir.exists() {
        eprintln!("❌ Directory '{}' already exists", name);
        std::process::exit(1);
    }
    std::fs::create_dir_all(dir.join("assets")).unwrap();
    std::fs::create_dir_all(dir.join("scenes")).unwrap();

    let yaml = format!(r#"# {name} — Generated by NWGE
game:
  name: "{name}"
  genre: rpg
  resolution: [320, 240]
  scale: 4
  fps: 60
  start_scene: main

entities:
  - name: player
    sprite: player
    position: [160, 120]
    speed: 80
    size: [14, 14]
    tags: [player]
    body: dynamic
    inventory:
      slots: 20

  - name: npc_guide
    sprite: npc
    position: [200, 100]
    tags: [npc, interactable]
    ai: idle
    dialog:
      - text: "Hello! Welcome to {name}!"

scenes:
  - name: main
    size: [40, 30]
    tile_size: 16

items:
  - name: potion
    type: food
    heal_amount: 20
    buy_price: 50
    description: "Restores 20 HP"

variables:
  gold: 100
  level: 1

events:
  game_start:
    - action: dialog
      speaker: "System"
      text: "Welcome to {name}! Press E to interact with NPCs."
"#);
    std::fs::write(dir.join("game.yaml"), yaml).unwrap();
    println!("🎮 Created: {name}/game.yaml");
    println!("   Run with: nwge run {name}/game.yaml");
}

fn cmd_info(path_str: &str) {
    let path = Path::new(path_str);
    match try_load(path) {
        Ok(def) => {
            println!("\n╔══════════════════════════════════════════════════════╗");
            println!("║  📋 {}",  def.game.name);
            println!("╠══════════════════════════════════════════════════════╣");
            println!("║  Genre:      {}", def.game.genre);
            println!("║  Render:     {}", def.game.render_mode);
            println!("║  Resolution: {}x{} ({}x scale)", def.game.resolution[0], def.game.resolution[1], def.game.scale);
            println!("║  Window:     {}x{}", def.game.resolution[0] * def.game.scale, def.game.resolution[1] * def.game.scale);
            println!("║  FPS:        {}", def.game.fps);
            println!("║  Start:      {}", def.game.start_scene);
            println!("╠══════════════════════════════════════════════════════╣");
            println!("║  Entities:   {}", def.entities.len());
            for e in &def.entities {
                println!("║    • {} [{}] @ {:?}", e.name, e.tags.join(", "), e.position.unwrap_or([0.0, 0.0]));
            }
            println!("║  Items:      {}", def.items.len());
            for i in &def.items {
                println!("║    • {} ({})", i.name, i.r#type);
            }
            println!("║  Scenes:     {}", def.scenes.len());
            for s in &def.scenes {
                println!("║    • {} ({}x{} tiles)", s.name, s.size[0], s.size[1]);
            }
            println!("║  Systems:    {}", def.systems.len());
            println!("║  Events:     {}", def.events.len());
            println!("║  Variables:  {}", def.variables.len());
            println!("╚══════════════════════════════════════════════════════╝");
        }
        Err(e) => eprintln!("❌ {e}"),
    }
}

// ─── Helpers ─────────────────────────────────────────────────────

fn load_game_file(path_str: &str) -> GameDefinition {
    let path = Path::new(path_str);
    match try_load(path) {
        Ok(def) => def,
        Err(e) => {
            eprintln!("❌ Failed to load: {e}");
            std::process::exit(1);
        }
    }
}

fn try_load(path: &Path) -> Result<GameDefinition, String> {
    if path.is_dir() {
        nwge_data::loader::load_game_dir(path).map_err(|e| e.to_string())
    } else {
        load_game(path).map_err(|e| e.to_string())
    }
}

// ─── AI Commands ────────────────────────────────────────────────

fn cmd_prompt(short: bool, genre: Option<&str>) {
    if let Some(g) = genre {
        match nwge_ai::prompt::generate_genre_prompt(g) {
            Some(prompt) => println!("{}", prompt),
            None => {
                eprintln!("Unknown genre: '{}'", g);
                eprintln!("Available: {:?}", nwge_ai::genre_templates::list_genres());
                std::process::exit(1);
            }
        }
    } else if short {
        println!("{}", nwge_ai::prompt::generate_short_prompt());
    } else {
        println!("{}", nwge_ai::prompt::generate_system_prompt());
    }
}

fn cmd_genres() {
    println!("\n ╔══════════════════════════════════════════════════════╗");
    println!(" ║  NWGE Genre Templates — Available for AI            ║");
    println!(" ╠══════════════════════════════════════════════════════╣");
    for genre in nwge_ai::genre_templates::list_genres() {
        if let Some(t) = nwge_ai::genre_templates::get_template(genre) {
            println!(" ║  {:20} {:4} ({}) ~{} tokens",
                t.display_name, t.render_mode, genre, t.token_cost);
            println!(" ║    {}", t.description);
            println!(" ║");
        }
    }
    println!(" ║  Usage: AI writes `genre: \"<name>\"` in game.yaml    ║");
    println!(" ║  Template: `nwge prompt --genre <name>`             ║");
    println!(" ╚══════════════════════════════════════════════════════╝");
}

// ─── 3D Scene Builder (YAML → Scene3D) ─────────────────────────

/// Build a nwge_render3d::Scene3D from a GameDefinition with render_mode: 3d.
/// This bridges the YAML schema (nwge-data) to the 3D renderer (nwge-render3d).
fn build_scene3d_from_yaml(game_def: &GameDefinition) -> nwge_render3d::Scene3D {
    use glam::Vec3;

    let res = game_def.game.resolution;
    let mut scene = nwge_render3d::Scene3D::new(&game_def.game.name, res[0], res[1]);

    // Configure camera from YAML
    if let Some(cam_def) = &game_def.camera {
        scene.camera.fov = cam_def.fov.to_radians();
        scene.camera.near = cam_def.near;
        scene.camera.far = cam_def.far;
        scene.camera.distance = cam_def.distance;
        if let Some(pitch) = cam_def.pitch {
            scene.camera.pitch = pitch;
        }
        if let Some(yaw) = cam_def.yaw {
            scene.camera.yaw = yaw;
        }
        if let Some(target) = cam_def.target {
            scene.camera.target = Vec3::from_array(target);
        }
        scene.camera.update_orbit();
    }

    // Configure scene3d settings from YAML
    if let Some(s3d) = &game_def.scene3d {
        scene.sky_color = Vec3::from_array(s3d.sky_color);
        scene.ambient_intensity = s3d.ambient_light;

        // Fog
        if let Some(fog) = &s3d.fog {
            scene.fog_enabled = fog.enabled;
            scene.fog_color = Vec3::from_array(fog.color);
            scene.fog_start = fog.start;
            scene.fog_end = fog.end;
        }

        // Lights
        for light_def in &s3d.lights {
            let light = match light_def.light_type.as_str() {
                "directional" => {
                    let dir = light_def.direction.unwrap_or([-0.4, -0.7, -0.5]);
                    let color = Vec3::from_array(light_def.color);
                    nwge_render3d::Light::Directional {
                        direction: Vec3::from_array(dir).normalize(),
                        color,
                        intensity: light_def.intensity,
                    }
                }
                "point" => {
                    let pos = light_def.position.unwrap_or([0.0, 5.0, 0.0]);
                    let color = Vec3::from_array(light_def.color);
                    nwge_render3d::Light::Point {
                        position: Vec3::from_array(pos),
                        color,
                        intensity: light_def.intensity,
                        radius: light_def.radius.unwrap_or(15.0),
                    }
                }
                "ambient" => {
                    let color = Vec3::from_array(light_def.color);
                    nwge_render3d::Light::Ambient {
                        color,
                        intensity: light_def.intensity,
                    }
                }
                _ => continue,
            };
            scene.add_light(light);
        }

        // Terrain
        if let Some(terrain_def) = &s3d.terrain {
            let terrain = nwge_render3d::Mesh::terrain(
                terrain_def.size,
                terrain_def.subdivisions,
                terrain_def.height_scale,
                terrain_def.seed,
            );
            scene.add_object(nwge_render3d::SceneObject::new(
                terrain,
                nwge_render3d::Material::grass(),
            ).with_name("terrain"));
        }

        // Water
        if let Some(water_def) = &s3d.water {
            if water_def.enabled {
                let water = nwge_render3d::Mesh::plane(
                    s3d.terrain.as_ref().map(|t| t.size).unwrap_or(80.0),
                    4,
                );
                scene.add_object(nwge_render3d::SceneObject::new(
                    water,
                    nwge_render3d::Material::water(),
                ).with_position(Vec3::new(0.0, water_def.height, 0.0))
                 .with_name("water"));
            }
        }

        // Trees
        if let Some(trees_def) = &s3d.trees {
            let terrain_seed = s3d.terrain.as_ref().map(|t| t.seed).unwrap_or(42);
            let terrain_height_scale = s3d.terrain.as_ref().map(|t| t.height_scale).unwrap_or(8.0);
            let trunk_r = trees_def.trunk.as_ref().map(|t| t.radius).unwrap_or(0.15);
            let trunk_h = trees_def.trunk.as_ref().map(|t| t.height).unwrap_or(2.0);
            let canopy_r = trees_def.canopy.as_ref().map(|c| c.radius).unwrap_or(1.2);
            let canopy_s = trees_def.canopy.as_ref().map(|c| c.segments).unwrap_or(12);

            for i in 0..trees_def.count {
                let angle = i as f32 * 2.399; // golden angle
                let r = 5.0 + (i as f32 * 1.7).sin().abs() * 15.0;
                let x = angle.cos() * r;
                let z = angle.sin() * r;
                let h = nwge_render3d::mesh::height_at(x, z, terrain_seed, terrain_height_scale);
                if h < trees_def.min_height { continue; }

                let trunk = nwge_render3d::Mesh::cylinder(trunk_r, trunk_h, 8);
                scene.add_object(nwge_render3d::SceneObject::new(
                    trunk,
                    nwge_render3d::Material::wood(),
                ).with_position(Vec3::new(x, h + trunk_h / 2.0, z))
                 .with_name(&format!("tree_trunk_{}", i)));

                let canopy = nwge_render3d::Mesh::sphere(canopy_r, canopy_s, 8);
                scene.add_object(nwge_render3d::SceneObject::new(
                    canopy,
                    nwge_render3d::Material::grass(),
                ).with_position(Vec3::new(x, h + trunk_h + canopy_r * 0.5, z))
                 .with_name(&format!("tree_canopy_{}", i)));
            }
        }

        // Custom objects
        for obj_def in &s3d.objects {
            let mesh = build_mesh_from_def(&obj_def.mesh, &obj_def.mesh_params);
            let material = build_material_from_value(&obj_def.material);
            let mut obj = nwge_render3d::SceneObject::new(mesh, material)
                .with_name(&obj_def.name);

            if let Some(pos) = obj_def.position {
                obj = obj.with_position(Vec3::from_array(pos));
            }
            if let Some(rot) = obj_def.rotation {
                use glam::Quat;
                obj = obj.with_rotation(
                    Quat::from_euler(glam::EulerRot::XYZ, rot[0], rot[1], rot[2])
                );
            }
            if let Some(scale_val) = &obj_def.scale {
                match scale_val {
                    serde_json::Value::Number(n) => {
                        let s = n.as_f64().unwrap_or(1.0) as f32;
                        obj = obj.with_uniform_scale(s);
                    }
                    serde_json::Value::Array(arr) if arr.len() == 3 => {
                        let sx = arr[0].as_f64().unwrap_or(1.0) as f32;
                        let sy = arr[1].as_f64().unwrap_or(1.0) as f32;
                        let sz = arr[2].as_f64().unwrap_or(1.0) as f32;
                        obj = obj.with_scale(Vec3::new(sx, sy, sz));
                    }
                    _ => {}
                }
            }
            scene.add_object(obj);
        }
    }

    // Add lights from entities that have emissive materials
    // (entities with mesh definitions also get added as 3D objects)
    for edef in &game_def.entities {
        if let Some(mesh_type) = &edef.mesh {
            let mesh = build_mesh_from_def(mesh_type, &edef.mesh_params);
            let material = edef.material.as_ref()
                .map(|v| build_material_from_value(v))
                .unwrap_or_default();

            let pos = edef.position3d.map(Vec3::from_array)
                .or_else(|| edef.position.map(|p| Vec3::new(p[0], 0.0, p[1])))
                .unwrap_or(Vec3::ZERO);

            scene.add_object(nwge_render3d::SceneObject::new(mesh, material)
                .with_position(pos)
                .with_name(&edef.name));
        }
    }

    // Ensure at least one light
    if scene.lights.is_empty() {
        scene.add_light(nwge_render3d::Light::sun(Vec3::new(-0.4, -0.7, -0.5), 1.3));
        scene.add_light(nwge_render3d::Light::ambient(0.2));
    }

    scene
}

/// Build a Mesh from a type name and params map.
fn build_mesh_from_def(mesh_type: &str, params: &HashMap<String, serde_json::Value>) -> nwge_render3d::Mesh {
    let get_f32 = |key: &str, default: f32| -> f32 {
        params.get(key).and_then(|v| v.as_f64()).map(|v| v as f32).unwrap_or(default)
    };
    let get_u32 = |key: &str, default: u32| -> u32 {
        params.get(key).and_then(|v| v.as_u64()).map(|v| v as u32).unwrap_or(default)
    };
    let get_u64 = |key: &str, default: u64| -> u64 {
        params.get(key).and_then(|v| v.as_u64()).unwrap_or(default)
    };

    match mesh_type {
        "cube" => nwge_render3d::Mesh::cube(get_f32("size", 1.0)),
        "sphere" => nwge_render3d::Mesh::sphere(
            get_f32("radius", 1.0),
            get_u32("segments", 16),
            get_u32("rings", 12),
        ),
        "plane" => nwge_render3d::Mesh::plane(
            get_f32("size", 10.0),
            get_u32("subdivisions", 4),
        ),
        "cylinder" => nwge_render3d::Mesh::cylinder(
            get_f32("radius", 0.5),
            get_f32("height", 2.0),
            get_u32("segments", 12),
        ),
        "terrain" => nwge_render3d::Mesh::terrain(
            get_f32("size", 80.0),
            get_u32("subdivisions", 60),
            get_f32("height_scale", 8.0),
            get_u64("seed", 42),
        ),
        _ => nwge_render3d::Mesh::cube(1.0), // fallback
    }
}

/// Build a Material from a YAML value (preset name string or inline object).
fn build_material_from_value(value: &serde_json::Value) -> nwge_render3d::Material {
    use glam::Vec3;

    match value {
        serde_json::Value::String(name) => match name.as_str() {
            "metal" => nwge_render3d::Material::metal(Vec3::new(0.8, 0.8, 0.8)),
            "stone" => nwge_render3d::Material::stone(),
            "grass" => nwge_render3d::Material::grass(),
            "water" => nwge_render3d::Material::water(),
            "wood" => nwge_render3d::Material::wood(),
            "emissive" => nwge_render3d::Material::emissive(Vec3::ONE, 2.0),
            _ => nwge_render3d::Material::new(name),
        },
        serde_json::Value::Object(map) => {
            let get_color = |key: &str, default: Vec3| -> Vec3 {
                map.get(key).and_then(|v| v.as_array()).map(|a| {
                    Vec3::new(
                        a.first().and_then(|v| v.as_f64()).unwrap_or(default.x as f64) as f32,
                        a.get(1).and_then(|v| v.as_f64()).unwrap_or(default.y as f64) as f32,
                        a.get(2).and_then(|v| v.as_f64()).unwrap_or(default.z as f64) as f32,
                    )
                }).unwrap_or(default)
            };
            let get_f32 = |key: &str, default: f32| -> f32 {
                map.get(key).and_then(|v| v.as_f64()).map(|v| v as f32).unwrap_or(default)
            };

            let base_color = get_color("base_color", Vec3::new(0.8, 0.8, 0.8));
            let emissive_color = get_color("emissive", Vec3::ZERO);
            let emissive_intensity = get_f32("emissive_intensity", 1.0);

            nwge_render3d::Material {
                base_color,
                alpha: get_f32("alpha", 1.0),
                metallic: get_f32("metallic", 0.0),
                roughness: get_f32("roughness", 0.5),
                emissive: emissive_color * emissive_intensity,
                ao: get_f32("ao", 1.0),
                normal_strength: get_f32("normal_strength", 1.0),
                name: "custom".to_string(),
            }
        }
        serde_json::Value::Null => nwge_render3d::Material::default(),
        _ => nwge_render3d::Material::default(),
    }
}

/// Render a 3D game from YAML and save as PNG.
fn render_3d_game(game_def: &GameDefinition, output: &str) {
    let res = game_def.game.resolution;
    let scene = build_scene3d_from_yaml(game_def);

    println!("🎮 3D Scene: {}", scene.name);
    println!("   Objects:    {}", scene.objects.len());
    println!("   Triangles:  {}", scene.triangle_count());
    println!("   Vertices:   {}", scene.vertex_count());
    println!("   Lights:     {}", scene.lights.len());

    // Build render pipeline
    let mut pipeline = nwge_render3d::RenderPipeline::new(res[0], res[1]);

    // Apply post-processing overrides from YAML
    if let Some(s3d) = &game_def.scene3d {
        if let Some(pp) = &s3d.post_processing {
            if let Some(v) = pp.tone_mapping { pipeline.settings.tone_mapping = v; }
            if let Some(v) = pp.bloom { pipeline.settings.bloom = v; }
            if let Some(v) = pp.ssao { pipeline.settings.ssao = v; }
            if let Some(v) = pp.vignette { pipeline.settings.vignette = v; }
            if let Some(v) = pp.exposure { pipeline.settings.exposure = v; }
            if let Some(v) = pp.gamma { pipeline.settings.gamma = v; }
        }
    }

    let start = std::time::Instant::now();
    pipeline.render(&scene);
    let elapsed = start.elapsed();

    println!("   Render time: {:.2}s", elapsed.as_secs_f64());
    println!("   {}", pipeline.stats());

    // Save PNG
    let rgba = pipeline.to_rgba8();
    let img = image::RgbaImage::from_raw(res[0], res[1], rgba)
        .expect("Failed to create image from render buffer");
    let save_path = if output.ends_with(".png") {
        output.to_string()
    } else {
        format!("{}.png", output)
    };
    img.save(&save_path).expect("Failed to save PNG");
    println!("📸 Saved: {}", save_path);
}
