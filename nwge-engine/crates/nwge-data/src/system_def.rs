//! System definitions — AI enables/configures built-in game systems
//!
//! Instead of writing code, AI just says "enable farming" and the engine
//! activates the farming system with its defaults.
//!
//! ## AI Cost: ~10 tokens per system
//! ```yaml
//! systems:
//!   - type: farming
//!     config: { seasons_enabled: true, quality_stars: true }
//!   - type: combat
//!     config: { style: "action", crit_chance: 0.1 }
//! ```

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemDef {
    /// System type — references a built-in engine system
    /// Built-in systems:
    ///   - "physics"     — 2D physics with gravity, collisions
    ///   - "combat"      — Damage, health, attacks, knockback
    ///   - "farming"     — Crops, watering, harvesting, seasons
    ///   - "inventory"   — Item management, stacking, equipment
    ///   - "dialog"      — NPC conversations, choices
    ///   - "quest"       — Quest tracking, objectives, rewards
    ///   - "crafting"    — Item recipes, workbenches
    ///   - "shop"        — Buy/sell with NPCs
    ///   - "fishing"     — Fishing minigame
    ///   - "day_night"   — Time of day cycle, seasons
    ///   - "weather"     — Rain, snow, sun effects
    ///   - "camera"      — Smooth follow, shake, zoom
    ///   - "particles"   — Particle effects system
    ///   - "pathfinding" — A* navigation for NPCs
    ///   - "save"        — Auto-save, save slots
    ///   - "audio"       — Background music, SFX
    ///   - "input"       — Keyboard, gamepad, touch mapping
    ///   - "animation"   — Sprite animation state machine
    ///   - "tilemap"     — Tile-based world rendering
    ///   - "lighting"    — 2D dynamic lighting
    ///   - "relationship"— NPC friendship/romance system
    ///   - "cooking"     — Combine items to make food
    ///   - "mining"      — Rock breaking, ore collection
    ///   - "building"    — Place structures on the map
    ///   - "gacha"       — Loot box / pull system
    ///   - "prestige"    — Prestige/rebirth/ascension
    ///   - "idle"        — Offline progress, auto-play
    pub r#type: String,

    /// Enable/disable this system
    #[serde(default = "default_enabled")]
    pub enabled: bool,

    /// System-specific configuration (flat key-value)
    /// The engine knows what config each system accepts.
    #[serde(default)]
    pub config: HashMap<String, serde_json::Value>,
}

fn default_enabled() -> bool { true }

/// Genre presets — when AI says `genre: "farming"`, these systems auto-enable.
/// This is the biggest cost savings: one word activates 10+ systems.
pub fn systems_for_genre(genre: &str) -> Vec<SystemDef> {
    match genre {
        "farming" | "farming-rpg" => vec![
            sys("physics", &[("gravity", "0")]),
            sys("farming", &[]),
            sys("inventory", &[]),
            sys("day_night", &[("day_length", "600")]),
            sys("weather", &[]),
            sys("dialog", &[]),
            sys("shop", &[]),
            sys("crafting", &[]),
            sys("fishing", &[]),
            sys("relationship", &[]),
            sys("cooking", &[]),
            sys("save", &[]),
            sys("camera", &[("style", "\"follow\"")]),
            sys("animation", &[]),
            sys("tilemap", &[]),
            sys("audio", &[]),
        ],
        "platformer" => vec![
            sys("physics", &[("gravity", "800")]),
            sys("combat", &[("style", "\"action\"")]),
            sys("inventory", &[("slots", "8")]),
            sys("camera", &[("style", "\"follow\"")]),
            sys("animation", &[]),
            sys("particles", &[]),
            sys("audio", &[]),
            sys("save", &[]),
        ],
        "rpg" => vec![
            sys("physics", &[("gravity", "0")]),
            sys("combat", &[("style", "\"turn-based\"")]),
            sys("inventory", &[]),
            sys("dialog", &[]),
            sys("quest", &[]),
            sys("crafting", &[]),
            sys("shop", &[]),
            sys("save", &[]),
            sys("camera", &[("style", "\"follow\"")]),
            sys("animation", &[]),
            sys("tilemap", &[]),
            sys("audio", &[]),
            sys("pathfinding", &[]),
        ],
        "shooter" => vec![
            sys("physics", &[("gravity", "0")]),
            sys("combat", &[("style", "\"action\""), ("crit_chance", "0.15")]),
            sys("inventory", &[("slots", "4")]),
            sys("camera", &[("style", "\"follow\""), ("shake_enabled", "true")]),
            sys("animation", &[]),
            sys("particles", &[]),
            sys("audio", &[]),
            sys("save", &[]),
        ],
        "idle" => vec![
            sys("idle", &[("offline_progress", "true")]),
            sys("prestige", &[]),
            sys("gacha", &[]),
            sys("save", &[("auto_interval", "30")]),
            sys("audio", &[]),
        ],
        "visual-novel" => vec![
            sys("dialog", &[]),
            sys("save", &[("slots", "20")]),
            sys("audio", &[]),
            sys("relationship", &[]),
        ],
        "puzzle" => vec![
            sys("physics", &[("gravity", "0")]),
            sys("camera", &[("style", "\"fixed\"")]),
            sys("animation", &[]),
            sys("audio", &[]),
            sys("save", &[]),
        ],
        _ => vec![
            sys("physics", &[]),
            sys("animation", &[]),
            sys("camera", &[("style", "\"follow\"")]),
            sys("audio", &[]),
            sys("save", &[]),
        ],
    }
}

fn sys(type_name: &str, config_pairs: &[(&str, &str)]) -> SystemDef {
    let mut config = HashMap::new();
    for (k, v) in config_pairs {
        if let Ok(val) = serde_json::from_str(v) {
            config.insert(k.to_string(), val);
        }
    }
    SystemDef {
        r#type: type_name.to_string(),
        enabled: true,
        config,
    }
}
