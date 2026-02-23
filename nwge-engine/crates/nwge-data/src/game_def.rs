//! Top-level game definition — the root YAML file AI generates.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ─── 3D Scene definitions (for render_mode: "3d") ─────────────────

/// The root game definition. AI generates one of these to define an entire game.
///
/// ## AI Cost Analysis
/// - Minimum viable game definition: ~50 tokens
/// - Full game with 10 items, 5 NPCs, 3 scenes: ~800 tokens
/// - Complete Stardew-like farming RPG: ~2000 tokens
///
/// Compare to Unity: A basic scene setup in C# is 200+ tokens for "Hello World"
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameDefinition {
    /// Game metadata
    pub game: GameMeta,

    /// Scene definitions (maps/levels)
    #[serde(default)]
    pub scenes: Vec<super::scene_def::SceneDef>,

    /// Entity prefab definitions (reusable templates)
    #[serde(default)]
    pub entities: Vec<super::entity_def::EntityDef>,

    /// Item definitions
    #[serde(default)]
    pub items: Vec<super::item_def::ItemDef>,

    /// Game systems to enable
    #[serde(default)]
    pub systems: Vec<super::system_def::SystemDef>,

    /// Global variables (initial state)
    #[serde(default)]
    pub variables: HashMap<String, serde_json::Value>,

    /// Event handlers — the core of AI-defined game logic
    /// Format: event_name → list of actions
    #[serde(default)]
    pub events: HashMap<String, Vec<Action>>,

    /// 3D scene definition (only used when render_mode == "3d")
    #[serde(default)]
    pub scene3d: Option<Scene3dDef>,

    /// Camera definition for 3D games
    #[serde(default)]
    pub camera: Option<CameraDef>,
}

// ─── 3D Scene Schema (AI generates these for 3D games) ─────────────

/// 3D scene definition — the `scene3d:` section in game.yaml.
/// AI uses this to define 3D worlds with lights, objects, terrain, and water.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scene3dDef {
    /// Sky color [r, g, b] in 0.0-1.0 range
    #[serde(default = "default_sky_color")]
    pub sky_color: [f32; 3],

    /// Fog settings
    #[serde(default)]
    pub fog: Option<FogDef>,

    /// Ambient light intensity 0.0-1.0
    #[serde(default = "default_ambient")]
    pub ambient_light: f32,

    /// 3D lights
    #[serde(default)]
    pub lights: Vec<LightDef>,

    /// Terrain generation settings
    #[serde(default)]
    pub terrain: Option<TerrainDef>,

    /// Water plane
    #[serde(default)]
    pub water: Option<WaterDef>,

    /// 3D objects (meshes with materials)
    #[serde(default)]
    pub objects: Vec<Object3dDef>,

    /// Tree generation settings
    #[serde(default)]
    pub trees: Option<TreesDef>,

    /// Post-processing overrides
    #[serde(default)]
    pub post_processing: Option<PostProcessDef>,
}

/// Fog settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FogDef {
    #[serde(default = "default_true_val")]
    pub enabled: bool,
    #[serde(default = "default_fog_color")]
    pub color: [f32; 3],
    #[serde(default = "default_fog_start")]
    pub start: f32,
    #[serde(default = "default_fog_end")]
    pub end: f32,
}

/// Light definition for 3D scenes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LightDef {
    /// "directional", "point", or "ambient"
    #[serde(rename = "type")]
    pub light_type: String,

    /// Direction vector (for directional lights)
    #[serde(default)]
    pub direction: Option<[f32; 3]>,

    /// Position (for point lights)
    #[serde(default)]
    pub position: Option<[f32; 3]>,

    /// Light color [r, g, b]
    #[serde(default = "default_white_color")]
    pub color: [f32; 3],

    /// Light intensity
    #[serde(default = "default_intensity")]
    pub intensity: f32,

    /// Attenuation radius (for point lights)
    #[serde(default)]
    pub radius: Option<f32>,
}

/// Terrain generation definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerrainDef {
    #[serde(default = "default_terrain_size")]
    pub size: f32,
    #[serde(default = "default_terrain_subdivisions")]
    pub subdivisions: u32,
    #[serde(default = "default_height_scale")]
    pub height_scale: f32,
    #[serde(default = "default_terrain_seed")]
    pub seed: u64,
}

/// Water plane definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaterDef {
    #[serde(default = "default_true_val")]
    pub enabled: bool,
    #[serde(default = "default_water_height")]
    pub height: f32,
    /// Optional material override (default: "water" preset)
    #[serde(default)]
    pub material: Option<String>,
}

/// A 3D object definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Object3dDef {
    /// Object name
    pub name: String,

    /// Mesh type: "cube", "sphere", "plane", "cylinder", "terrain"
    pub mesh: String,

    /// Mesh generation parameters (size, radius, height, segments, rings, subdivisions)
    #[serde(default)]
    pub mesh_params: HashMap<String, serde_json::Value>,

    /// Material: either a preset name ("stone", "metal") or inline definition
    #[serde(default)]
    pub material: serde_json::Value,

    /// Position [x, y, z]
    #[serde(default)]
    pub position: Option<[f32; 3]>,

    /// Rotation (euler angles in radians) [x, y, z]
    #[serde(default)]
    pub rotation: Option<[f32; 3]>,

    /// Scale: either [x, y, z] or a single float for uniform scale
    #[serde(default)]
    pub scale: Option<serde_json::Value>,
}

/// Camera definition for 3D games
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraDef {
    /// "orbit" or "fps"
    #[serde(rename = "type", default = "default_camera_type")]
    pub camera_type: String,

    /// Field of view in degrees
    #[serde(default = "default_fov")]
    pub fov: f32,

    /// Near clip plane
    #[serde(default = "default_near")]
    pub near: f32,

    /// Far clip plane
    #[serde(default = "default_far")]
    pub far: f32,

    /// Orbit distance
    #[serde(default = "default_orbit_distance")]
    pub distance: f32,

    /// Orbit pitch (radians)
    #[serde(default)]
    pub pitch: Option<f32>,

    /// Orbit yaw (radians)
    #[serde(default)]
    pub yaw: Option<f32>,

    /// Look-at target [x, y, z]
    #[serde(default)]
    pub target: Option<[f32; 3]>,

    /// Camera height (for FPS mode)
    #[serde(default = "default_camera_height")]
    pub height: f32,
}

/// Tree generation settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreesDef {
    #[serde(default = "default_tree_count")]
    pub count: u32,
    #[serde(default)]
    pub trunk: Option<TrunkDef>,
    #[serde(default)]
    pub canopy: Option<CanopyDef>,
    #[serde(default = "default_tree_min_height")]
    pub min_height: f32,
    #[serde(default = "default_terrain_seed")]
    pub seed: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrunkDef {
    #[serde(default = "default_trunk_radius")]
    pub radius: f32,
    #[serde(default = "default_trunk_height")]
    pub height: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanopyDef {
    #[serde(default = "default_canopy_radius")]
    pub radius: f32,
    #[serde(default = "default_canopy_segments")]
    pub segments: u32,
}

/// Post-processing overrides for 3D scenes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostProcessDef {
    #[serde(default)]
    pub tone_mapping: Option<bool>,
    #[serde(default)]
    pub bloom: Option<bool>,
    #[serde(default)]
    pub ssao: Option<bool>,
    #[serde(default)]
    pub vignette: Option<bool>,
    #[serde(default)]
    pub exposure: Option<f32>,
    #[serde(default)]
    pub gamma: Option<f32>,
}

// ─── 3D default helpers ─────────────────────────────────────────────

fn default_sky_color() -> [f32; 3] { [0.4, 0.6, 0.9] }
fn default_fog_color() -> [f32; 3] { [0.5, 0.6, 0.8] }
fn default_fog_start() -> f32 { 40.0 }
fn default_fog_end() -> f32 { 100.0 }
fn default_white_color() -> [f32; 3] { [1.0, 1.0, 1.0] }
fn default_intensity() -> f32 { 1.0 }
fn default_terrain_size() -> f32 { 80.0 }
fn default_terrain_subdivisions() -> u32 { 60 }
fn default_height_scale() -> f32 { 8.0 }
fn default_terrain_seed() -> u64 { 42 }
fn default_water_height() -> f32 { 1.0 }
fn default_ambient() -> f32 { 0.15 }
fn default_camera_type() -> String { "orbit".to_string() }
fn default_fov() -> f32 { 60.0 }
fn default_near() -> f32 { 0.1 }
fn default_far() -> f32 { 1000.0 }
fn default_orbit_distance() -> f32 { 15.0 }
fn default_camera_height() -> f32 { 1.8 }
fn default_true_val() -> bool { true }
fn default_tree_count() -> u32 { 15 }
fn default_tree_min_height() -> f32 { 1.5 }
fn default_trunk_radius() -> f32 { 0.15 }
fn default_trunk_height() -> f32 { 2.0 }
fn default_canopy_radius() -> f32 { 1.2 }
fn default_canopy_segments() -> u32 { 12 }

/// Basic game metadata. Minimal required fields for AI.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameMeta {
    pub name: String,

    /// Game genre hint — engine enables relevant built-in systems
    /// Options: "rpg", "platformer", "farming", "shooter", "puzzle", "idle", "visual-novel"
    #[serde(default = "default_genre")]
    pub genre: String,

    /// Resolution in pixels (internal render resolution)
    #[serde(default = "default_resolution")]
    pub resolution: [u32; 2],

    /// Pixel-art scale factor (e.g., 4 = 320x240 → 1280x960 window)
    #[serde(default = "default_scale")]
    pub scale: u32,

    /// Target FPS
    #[serde(default = "default_fps")]
    pub fps: u32,

    /// Gravity (0 = no gravity, e.g., top-down RPG)
    #[serde(default)]
    pub gravity: f32,

    /// Starting scene name
    #[serde(default = "default_start_scene")]
    pub start_scene: String,

    /// Window title
    #[serde(default)]
    pub title: Option<String>,

    /// Author
    #[serde(default)]
    pub author: Option<String>,

    /// Version
    #[serde(default = "default_version")]
    pub version: String,

    /// Render mode: "2d" (default), "3d", or "hybrid"
    #[serde(default = "default_render_mode")]
    pub render_mode: String,
}

fn default_genre() -> String { "rpg".to_string() }
fn default_resolution() -> [u32; 2] { [320, 240] }
fn default_scale() -> u32 { 4 }
fn default_fps() -> u32 { 60 }
fn default_start_scene() -> String { "main".to_string() }
fn default_version() -> String { "0.1.0".to_string() }
fn default_render_mode() -> String { "2d".to_string() }

/// An action that AI can define in event handlers.
/// These are the "verbs" of the engine — what happens when events fire.
///
/// ## Cost Efficiency
/// Each action is ~5-15 tokens for AI to generate:
/// ```yaml
/// - action: spawn
///   entity: zombie
///   at: [100, 200]
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "action")]
pub enum Action {
    /// Spawn an entity from a prefab
    #[serde(rename = "spawn")]
    Spawn {
        entity: String,
        #[serde(default)]
        at: Option<[f32; 2]>,
        #[serde(default)]
        props: HashMap<String, serde_json::Value>,
    },

    /// Destroy an entity
    #[serde(rename = "destroy")]
    Destroy {
        target: String,
    },

    /// Move an entity
    #[serde(rename = "move")]
    Move {
        target: String,
        to: [f32; 2],
        #[serde(default = "default_speed")]
        speed: f32,
    },

    /// Set a game variable
    #[serde(rename = "set")]
    SetVar {
        var: String,
        value: serde_json::Value,
    },

    /// Add to a numeric variable
    #[serde(rename = "add")]
    AddVar {
        var: String,
        amount: f64,
    },

    /// Play a sound effect
    #[serde(rename = "sfx")]
    PlaySound {
        sound: String,
        #[serde(default = "default_volume")]
        volume: f32,
    },

    /// Play music
    #[serde(rename = "music")]
    PlayMusic {
        track: String,
        #[serde(default)]
        r#loop: bool,
    },

    /// Show dialog text
    #[serde(rename = "dialog")]
    ShowDialog {
        speaker: Option<String>,
        text: String,
        #[serde(default)]
        choices: Vec<DialogChoice>,
    },

    /// Change scene
    #[serde(rename = "scene")]
    ChangeScene {
        to: String,
        #[serde(default = "default_transition")]
        transition: String,
    },

    /// Emit a custom event (chain events together)
    #[serde(rename = "emit")]
    EmitEvent {
        event: String,
        #[serde(default)]
        data: HashMap<String, serde_json::Value>,
    },

    /// Wait/delay before next action
    #[serde(rename = "wait")]
    Wait {
        seconds: f64,
    },

    /// Conditional — only run if condition is true
    #[serde(rename = "if")]
    Conditional {
        condition: String,  // Simple expression: "gold >= 100", "has_item sword"
        then: Vec<Action>,
        #[serde(default)]
        r#else: Vec<Action>,
    },

    /// Repeat actions
    #[serde(rename = "repeat")]
    Repeat {
        count: u32,
        actions: Vec<Action>,
    },

    /// Add item to player inventory
    #[serde(rename = "give_item")]
    GiveItem {
        item: String,
        #[serde(default = "default_count")]
        count: u32,
    },

    /// Remove item from player inventory
    #[serde(rename = "take_item")]
    TakeItem {
        item: String,
        #[serde(default = "default_count")]
        count: u32,
    },

    /// Apply damage to a target
    #[serde(rename = "damage")]
    Damage {
        target: String,
        amount: f64,
        #[serde(default)]
        damage_type: Option<String>,
    },

    /// Heal a target
    #[serde(rename = "heal")]
    Heal {
        target: String,
        amount: f64,
    },

    /// Camera action
    #[serde(rename = "camera")]
    Camera {
        #[serde(default)]
        follow: Option<String>,
        #[serde(default)]
        shake: Option<f32>,
        #[serde(default)]
        zoom: Option<f32>,
    },

    /// Run a Lua script snippet (escape hatch for complex logic)
    #[serde(rename = "script")]
    RunScript {
        code: String,
    },
}

fn default_speed() -> f32 { 100.0 }
fn default_volume() -> f32 { 1.0 }
fn default_transition() -> String { "fade".to_string() }
fn default_count() -> u32 { 1 }

/// A dialog choice for branching conversations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogChoice {
    pub text: String,
    #[serde(default)]
    pub condition: Option<String>,
    #[serde(default)]
    pub actions: Vec<Action>,
}
