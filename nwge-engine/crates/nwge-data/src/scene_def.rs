//! Scene definitions — maps, levels, rooms
//!
//! ## AI Cost: ~40 tokens per scene
//! ```yaml
//! scenes:
//!   - name: farm
//!     tilemap: farm_map
//!     size: [40, 30]
//!     spawn_point: [20, 15]
//!     entities:
//!       - entity: chicken
//!         at: [10, 12]
//!     exits:
//!       - to: town
//!         at: [39, 15]
//!         direction: right
//! ```

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneDef {
    /// Scene name (unique identifier)
    pub name: String,

    /// Tilemap file reference (auto-resolves to maps/name.json)
    #[serde(default)]
    pub tilemap: Option<String>,

    /// Scene size in tiles [width, height]
    #[serde(default = "default_size")]
    pub size: [u32; 2],

    /// Tile size in pixels
    #[serde(default = "default_tile_size")]
    pub tile_size: u32,

    /// Player spawn point [x, y] in tiles
    #[serde(default)]
    pub spawn_point: Option<[f32; 2]>,

    /// Background color [r, g, b, a]
    #[serde(default = "default_bg_color")]
    pub bg_color: [f32; 4],

    /// Background image (parallax)
    #[serde(default)]
    pub background: Option<String>,

    /// Entity placements in this scene
    #[serde(default)]
    pub entities: Vec<EntityPlacement>,

    /// Scene exits / transitions
    #[serde(default)]
    pub exits: Vec<SceneExit>,

    /// Ambient music track
    #[serde(default)]
    pub music: Option<String>,

    /// Ambient sounds (layered)
    #[serde(default)]
    pub ambience: Vec<String>,

    /// Scene-specific variables
    #[serde(default)]
    pub variables: HashMap<String, serde_json::Value>,

    /// Events triggered when entering this scene
    #[serde(default)]
    pub on_enter: Vec<super::game_def::Action>,

    /// Events triggered when leaving this scene
    #[serde(default)]
    pub on_exit: Vec<super::game_def::Action>,

    /// Lighting preset: "day", "night", "dawn", "dusk", "indoor", "cave"
    #[serde(default = "default_lighting")]
    pub lighting: String,
}

fn default_size() -> [u32; 2] { [40, 30] }
fn default_tile_size() -> u32 { 16 }
fn default_bg_color() -> [f32; 4] { [0.1, 0.1, 0.15, 1.0] }
fn default_lighting() -> String { "day".to_string() }

/// An entity placed in a scene
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityPlacement {
    /// Entity prefab name (references entities list)
    pub entity: String,

    /// Position in tiles or pixels (engine auto-detects)
    #[serde(default)]
    pub at: Option<[f32; 2]>,

    /// Override properties for this specific instance
    #[serde(default)]
    pub props: HashMap<String, serde_json::Value>,

    /// Optional unique instance name
    #[serde(default)]
    pub name: Option<String>,
}

/// A transition/exit to another scene
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneExit {
    /// Target scene name
    pub to: String,

    /// Position of the exit trigger
    pub at: [f32; 2],

    /// Size of the exit trigger area [w, h]
    #[serde(default = "default_exit_size")]
    pub size: Option<[f32; 2]>,

    /// Direction hint for transition animation
    #[serde(default)]
    pub direction: Option<String>,

    /// Where to spawn player in the target scene
    #[serde(default)]
    pub target_spawn: Option<[f32; 2]>,
}

fn default_exit_size() -> Option<[f32; 2]> { Some([1.0, 2.0]) }
