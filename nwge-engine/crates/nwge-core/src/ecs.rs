//! ECS World wrapper and Game Loop
//!
//! Wraps `hecs::World` with game-specific conveniences:
//! - Fixed-timestep game loop
//! - System scheduling
//! - Entity prefab spawning from data definitions

use hecs;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};

/// The game world — holds all entities and their components.
pub struct World {
    /// The underlying ECS world
    pub ecs: hecs::World,
    /// Named entity lookup (e.g., "player" → entity id)
    pub named: HashMap<String, hecs::Entity>,
    /// Global game state (AI-writable key-value store)
    pub state: GameState,
    /// Frame counter
    pub frame: u64,
    /// Total elapsed time
    pub elapsed: f64,
}

/// Global game state — a simple key-value store that AI can read/write.
/// This is intentionally simple: AI generates state keys in YAML,
/// engine tracks them at runtime.
///
/// Cost efficiency: AI only needs to output `state.set("gold", 100)`
/// instead of defining custom structs.
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub numbers: HashMap<String, f64>,
    pub strings: HashMap<String, String>,
    pub flags: HashMap<String, bool>,
    pub lists: HashMap<String, Vec<String>>,
}

impl GameState {
    pub fn get_number(&self, key: &str) -> f64 {
        self.numbers.get(key).copied().unwrap_or(0.0)
    }

    pub fn set_number(&mut self, key: &str, val: f64) {
        self.numbers.insert(key.to_string(), val);
    }

    pub fn add_number(&mut self, key: &str, delta: f64) {
        let v = self.get_number(key);
        self.set_number(key, v + delta);
    }

    pub fn get_flag(&self, key: &str) -> bool {
        self.flags.get(key).copied().unwrap_or(false)
    }

    pub fn set_flag(&mut self, key: &str, val: bool) {
        self.flags.insert(key.to_string(), val);
    }

    pub fn get_string(&self, key: &str) -> &str {
        self.strings.get(key).map(|s| s.as_str()).unwrap_or("")
    }

    pub fn set_string(&mut self, key: &str, val: &str) {
        self.strings.insert(key.to_string(), val.to_string());
    }
}

impl World {
    pub fn new() -> Self {
        Self {
            ecs: hecs::World::new(),
            named: HashMap::new(),
            state: GameState::default(),
            frame: 0,
            elapsed: 0.0,
        }
    }

    /// Spawn an entity and optionally give it a name for lookup.
    pub fn spawn_named(&mut self, name: &str, components: impl hecs::DynamicBundle) -> hecs::Entity {
        let entity = self.ecs.spawn(components);
        self.named.insert(name.to_string(), entity);
        entity
    }

    /// Look up a named entity.
    pub fn get_named(&self, name: &str) -> Option<hecs::Entity> {
        self.named.get(name).copied()
    }
}

impl Default for World {
    fn default() -> Self {
        Self::new()
    }
}

// ─── Game Loop ──────────────────────────────────────────────────────

/// Fixed-timestep game loop configuration.
pub struct GameLoop {
    pub fixed_dt: f64,
    pub max_substeps: u32,
    accumulator: f64,
}

impl GameLoop {
    pub fn new(fps: f64) -> Self {
        Self {
            fixed_dt: 1.0 / fps,
            max_substeps: 5,
            accumulator: 0.0,
        }
    }

    /// Feed real elapsed time, returns an iterator of fixed timesteps to process.
    pub fn update(&mut self, real_dt: f64) -> FixedStepIter {
        // Clamp to prevent spiral of death
        let dt = real_dt.min(0.25);
        self.accumulator += dt;

        FixedStepIter {
            accumulator: &mut self.accumulator,
            fixed_dt: self.fixed_dt,
            max_steps: self.max_substeps,
            steps_taken: 0,
        }
    }

    /// Get interpolation alpha for rendering between physics steps.
    pub fn alpha(&self) -> f64 {
        self.accumulator / self.fixed_dt
    }
}

impl Default for GameLoop {
    fn default() -> Self {
        Self::new(60.0)
    }
}

pub struct FixedStepIter<'a> {
    accumulator: &'a mut f64,
    fixed_dt: f64,
    max_steps: u32,
    steps_taken: u32,
}

impl<'a> Iterator for FixedStepIter<'a> {
    type Item = f64;

    fn next(&mut self) -> Option<f64> {
        if *self.accumulator >= self.fixed_dt && self.steps_taken < self.max_steps {
            *self.accumulator -= self.fixed_dt;
            self.steps_taken += 1;
            Some(self.fixed_dt)
        } else {
            None
        }
    }
}

// ─── Common Components ──────────────────────────────────────────────
// These are the "standard library" of components that every game gets.
// AI doesn't need to define these — they're built-in.

/// 2D transform: position, rotation, scale
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transform2D {
    pub position: glam::Vec2,
    pub rotation: f32,
    pub scale: glam::Vec2,
    pub z_order: i32,
}

impl Default for Transform2D {
    fn default() -> Self {
        Self {
            position: glam::Vec2::ZERO,
            rotation: 0.0,
            scale: glam::Vec2::ONE,
            z_order: 0,
        }
    }
}

/// Velocity for physics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Velocity2D {
    pub linear: glam::Vec2,
    pub angular: f32,
}

/// Sprite reference — points to an atlas + frame
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpriteRef {
    pub atlas: String,
    pub frame: String,
    pub flip_x: bool,
    pub flip_y: bool,
    pub tint: [f32; 4],
    pub visible: bool,
}

impl Default for SpriteRef {
    fn default() -> Self {
        Self {
            atlas: String::new(),
            frame: String::new(),
            flip_x: false,
            flip_y: false,
            tint: [1.0, 1.0, 1.0, 1.0],
            visible: true,
        }
    }
}

/// Health component
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Health {
    pub current: f64,
    pub max: f64,
    pub invincible_timer: f64,
}

impl Default for Health {
    fn default() -> Self {
        Self { current: 100.0, max: 100.0, invincible_timer: 0.0 }
    }
}

/// Tag component — bitmask flags
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Tags {
    pub bits: u64,
}

impl Tags {
    pub const PLAYER: u64     = 1 << 0;
    pub const ENEMY: u64      = 1 << 1;
    pub const NPC: u64        = 1 << 2;
    pub const ITEM: u64       = 1 << 3;
    pub const PROJECTILE: u64 = 1 << 4;
    pub const TRIGGER: u64    = 1 << 5;
    pub const SOLID: u64      = 1 << 6;
    pub const INTERACTABLE: u64 = 1 << 7;

    pub fn has(&self, tag: u64) -> bool {
        self.bits & tag != 0
    }

    pub fn add(&mut self, tag: u64) {
        self.bits |= tag;
    }
}

/// Entity name (for AI reference in scripts)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityName(pub String);

/// AI-defined custom properties (key-value bag)
/// This is the escape hatch: AI can attach any data to any entity
/// without needing to define new Rust components.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CustomProperties {
    pub props: HashMap<String, serde_json::Value>,
}

impl CustomProperties {
    pub fn get_f64(&self, key: &str) -> f64 {
        self.props.get(key).and_then(|v| v.as_f64()).unwrap_or(0.0)
    }

    pub fn get_str(&self, key: &str) -> &str {
        self.props.get(key).and_then(|v| v.as_str()).unwrap_or("")
    }

    pub fn get_bool(&self, key: &str) -> bool {
        self.props.get(key).and_then(|v| v.as_bool()).unwrap_or(false)
    }

    pub fn set(&mut self, key: &str, val: serde_json::Value) {
        self.props.insert(key.to_string(), val);
    }
}
