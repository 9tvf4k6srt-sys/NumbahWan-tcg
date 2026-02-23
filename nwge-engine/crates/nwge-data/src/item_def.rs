//! Item definitions for inventory/crafting/shops
//!
//! ## AI Cost: ~15 tokens per item
//! ```yaml
//! - name: iron_sword
//!   type: weapon
//!   damage: 12
//!   sell_price: 200
//! ```

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemDef {
    /// Unique item name (used as ID)
    pub name: String,

    /// Item category
    /// Built-in types: "weapon", "tool", "seed", "crop", "food", "material",
    /// "potion", "key", "quest", "equipment", "junk"
    #[serde(default = "default_item_type")]
    pub r#type: String,

    /// Display name (defaults to prettified `name`)
    #[serde(default)]
    pub display_name: Option<String>,

    /// Description text
    #[serde(default)]
    pub description: Option<String>,

    /// Sprite name
    #[serde(default)]
    pub sprite: Option<String>,

    /// Can stack in inventory?
    #[serde(default = "default_true")]
    pub stackable: bool,

    /// Max stack size
    #[serde(default = "default_stack")]
    pub max_stack: u32,

    /// Rarity: "common", "uncommon", "rare", "epic", "legendary"
    #[serde(default = "default_rarity")]
    pub rarity: String,

    /// Buy price (0 = cannot buy)
    #[serde(default)]
    pub buy_price: u32,

    /// Sell price (0 = cannot sell)
    #[serde(default)]
    pub sell_price: u32,

    // ── Type-specific fields ──

    /// Weapon/tool damage
    #[serde(default)]
    pub damage: Option<f64>,

    /// Weapon attack speed multiplier
    #[serde(default)]
    pub attack_speed: Option<f32>,

    /// Tool type for interactions: "axe", "pickaxe", "hoe", "watering_can", "fishing_rod"
    #[serde(default)]
    pub tool_type: Option<String>,

    /// Seed → what crop it grows
    #[serde(default)]
    pub crop: Option<String>,

    /// Food → health restored when consumed
    #[serde(default)]
    pub heal_amount: Option<f64>,

    /// Food → energy restored
    #[serde(default)]
    pub energy: Option<f64>,

    /// Equipment slot: "head", "body", "legs", "feet", "ring", "weapon", "shield"
    #[serde(default)]
    pub slot: Option<String>,

    /// Stat bonuses when equipped
    #[serde(default)]
    pub stats: HashMap<String, f64>,

    /// Crafting recipe: { "iron_ore": 3, "wood": 1 }
    #[serde(default)]
    pub recipe: HashMap<String, u32>,

    /// Event to fire when item is used
    #[serde(default)]
    pub on_use: Option<String>,

    /// Custom properties
    #[serde(default)]
    pub props: HashMap<String, serde_json::Value>,
}

fn default_item_type() -> String { "junk".to_string() }
fn default_true() -> bool { true }
fn default_stack() -> u32 { 99 }
fn default_rarity() -> String { "common".to_string() }

/// Crop definition for farming games
/// Separate from items because crops have growth stages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CropDef {
    pub name: String,

    /// Number of growth stages (visual)
    #[serde(default = "default_stages")]
    pub stages: u32,

    /// Days per growth stage
    #[serde(default = "default_growth")]
    pub growth_time: f64,

    /// What seasons can it grow in?
    #[serde(default = "default_seasons")]
    pub seasons: Vec<String>,

    /// Item produced on harvest
    pub harvest_item: String,

    /// How many items per harvest
    #[serde(default = "default_yield")]
    pub harvest_count: u32,

    /// Does it regrow after harvest? (like strawberries)
    #[serde(default)]
    pub regrows: bool,

    /// Days to regrow after harvest
    #[serde(default)]
    pub regrow_time: Option<f64>,

    /// Does it need watering?
    #[serde(default = "default_true2")]
    pub needs_water: bool,

    /// Sprite prefix (engine appends _stage1, _stage2, etc.)
    #[serde(default)]
    pub sprite: Option<String>,
}

fn default_stages() -> u32 { 4 }
fn default_growth() -> f64 { 3.0 }
fn default_seasons() -> Vec<String> { vec!["spring".to_string(), "summer".to_string(), "fall".to_string()] }
fn default_yield() -> u32 { 1 }
fn default_true2() -> bool { true }
