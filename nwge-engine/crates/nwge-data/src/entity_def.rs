//! Entity definitions — prefab templates AI generates.
//!
//! An entity def is a template. When spawned, the engine creates
//! an ECS entity with the specified components.
//!
//! ## AI Cost: ~20-40 tokens per entity definition
//! ```yaml
//! - name: chicken
//!   sprite: chicken_idle
//!   position: [50, 80]
//!   speed: 30
//!   tags: [npc, animal]
//!   ai: wander
//!   props:
//!     produces: egg
//!     produce_interval: 120
//! ```

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityDef {
    /// Unique name for this entity prefab
    pub name: String,

    /// Sprite name (auto-resolves to atlas)
    #[serde(default)]
    pub sprite: Option<String>,

    /// Starting position [x, y] (2D)
    #[serde(default)]
    pub position: Option<[f32; 2]>,

    /// Starting position [x, y, z] (3D)
    #[serde(default)]
    pub position3d: Option<[f32; 3]>,

    /// Mesh type for 3D entities: "cube", "sphere", "plane", "cylinder"
    #[serde(default)]
    pub mesh: Option<String>,

    /// Mesh generation parameters for 3D entities
    #[serde(default)]
    pub mesh_params: HashMap<String, serde_json::Value>,

    /// Material for 3D entities: preset name or inline definition
    #[serde(default)]
    pub material: Option<serde_json::Value>,

    /// Movement speed (pixels/sec for 2D, units/sec for 3D)
    #[serde(default)]
    pub speed: Option<f32>,

    /// Entity size [width, height] for collision
    #[serde(default)]
    pub size: Option<[f32; 2]>,

    /// Tags for identification and collision filtering
    #[serde(default)]
    pub tags: Vec<String>,

    /// AI behavior preset
    /// Options: "none", "wander", "patrol", "chase", "flee", "follow", "idle"
    #[serde(default)]
    pub ai: Option<String>,

    /// Health points (omit for invincible/non-damageable)
    #[serde(default)]
    pub health: Option<f64>,

    /// Physics body type
    /// Options: "none", "dynamic", "static", "kinematic"
    #[serde(default = "default_body")]
    pub body: String,

    /// Z-order layer for rendering (higher = in front)
    #[serde(default)]
    pub z_order: i32,

    /// Animation definitions
    #[serde(default)]
    pub animations: HashMap<String, AnimDef>,

    /// Custom properties — AI can attach any data here
    #[serde(default)]
    pub props: HashMap<String, serde_json::Value>,

    /// Inventory (for player/NPCs that carry items)
    #[serde(default)]
    pub inventory: Option<InventoryDef>,

    /// Dialog tree (for NPCs)
    #[serde(default)]
    pub dialog: Option<Vec<DialogNode>>,

    /// Collision callbacks — events to emit on collision
    #[serde(default)]
    pub on_collide: Option<String>,

    /// Interaction callback — event to emit when player interacts
    #[serde(default)]
    pub on_interact: Option<String>,

    /// Spawn callback — event to emit when entity is created
    #[serde(default)]
    pub on_spawn: Option<String>,
}

fn default_body() -> String { "none".to_string() }

/// Animation definition — minimal tokens for AI
/// ```yaml
/// animations:
///   idle: { frames: [0, 1, 2, 3], fps: 4 }
///   walk: { frames: [4, 5, 6, 7], fps: 8 }
///   attack: { frames: [8, 9, 10, 11], fps: 12, loop: false }
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimDef {
    /// Frame indices in the spritesheet
    pub frames: Vec<u32>,

    /// Playback speed
    #[serde(default = "default_anim_fps")]
    pub fps: f32,

    /// Loop the animation?
    #[serde(default = "default_true")]
    pub r#loop: bool,
}

fn default_anim_fps() -> f32 { 8.0 }
fn default_true() -> bool { true }

/// Inventory definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryDef {
    #[serde(default = "default_slots")]
    pub slots: u32,
    #[serde(default)]
    pub starting_items: Vec<StartingItem>,
}

fn default_slots() -> u32 { 20 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartingItem {
    pub item: String,
    #[serde(default = "default_item_count")]
    pub count: u32,
}

fn default_item_count() -> u32 { 1 }

/// Dialog node for NPC conversations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogNode {
    pub text: String,
    #[serde(default)]
    pub condition: Option<String>,
    #[serde(default)]
    pub choices: Vec<DialogBranch>,
    #[serde(default)]
    pub actions: Vec<super::game_def::Action>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogBranch {
    pub text: String,
    #[serde(default)]
    pub next: Option<String>,
    #[serde(default)]
    pub actions: Vec<super::game_def::Action>,
}
