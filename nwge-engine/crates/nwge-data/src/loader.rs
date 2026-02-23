//! Game loader — reads YAML/JSON files into GameDefinition
//!
//! Supports:
//! - Single-file games (one big YAML)
//! - Multi-file games (directory with separate files per system)
//! - Hot-reloading (watch files for changes)

use std::path::Path;
use super::game_def::GameDefinition;

/// Load a game from a single YAML file.
pub fn load_game(path: &Path) -> Result<GameDefinition, LoadError> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| LoadError::Io(e.to_string()))?;

    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    match ext {
        "yaml" | "yml" => {
            serde_yaml::from_str(&content)
                .map_err(|e| LoadError::Parse(format!("YAML parse error: {e}")))
        }
        "json" => {
            serde_json::from_str(&content)
                .map_err(|e| LoadError::Parse(format!("JSON parse error: {e}")))
        }
        _ => Err(LoadError::Parse(format!("Unknown file extension: {ext}"))),
    }
}

/// Load a game from a directory (multi-file layout).
/// Expected structure:
/// ```text
/// game/
///   game.yaml      — GameMeta + variables
///   entities.yaml  — Entity prefab definitions
///   items.yaml     — Item definitions
///   scenes/
///     farm.yaml    — Scene definition
///     town.yaml    — Scene definition
///   systems.yaml   — System configurations
///   events.yaml    — Event handlers
/// ```
pub fn load_game_dir(dir: &Path) -> Result<GameDefinition, LoadError> {
    let game_file = dir.join("game.yaml");
    if !game_file.exists() {
        return Err(LoadError::Io(format!("No game.yaml found in {}", dir.display())));
    }

    let mut game_def: GameDefinition = load_game(&game_file)?;

    // Load entities
    let entities_file = dir.join("entities.yaml");
    if entities_file.exists() {
        let content = std::fs::read_to_string(&entities_file)
            .map_err(|e| LoadError::Io(e.to_string()))?;
        let entities: Vec<super::entity_def::EntityDef> = serde_yaml::from_str(&content)
            .map_err(|e| LoadError::Parse(format!("entities.yaml: {e}")))?;
        game_def.entities.extend(entities);
    }

    // Load items
    let items_file = dir.join("items.yaml");
    if items_file.exists() {
        let content = std::fs::read_to_string(&items_file)
            .map_err(|e| LoadError::Io(e.to_string()))?;
        let items: Vec<super::item_def::ItemDef> = serde_yaml::from_str(&content)
            .map_err(|e| LoadError::Parse(format!("items.yaml: {e}")))?;
        game_def.items.extend(items);
    }

    // Load scenes from scenes/ directory
    let scenes_dir = dir.join("scenes");
    if scenes_dir.is_dir() {
        for entry in std::fs::read_dir(&scenes_dir).map_err(|e| LoadError::Io(e.to_string()))? {
            let entry = entry.map_err(|e| LoadError::Io(e.to_string()))?;
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("yaml") {
                let content = std::fs::read_to_string(&path)
                    .map_err(|e| LoadError::Io(e.to_string()))?;
                let scene: super::scene_def::SceneDef = serde_yaml::from_str(&content)
                    .map_err(|e| LoadError::Parse(format!("{}: {e}", path.display())))?;
                game_def.scenes.push(scene);
            }
        }
    }

    // Load systems
    let systems_file = dir.join("systems.yaml");
    if systems_file.exists() {
        let content = std::fs::read_to_string(&systems_file)
            .map_err(|e| LoadError::Io(e.to_string()))?;
        let systems: Vec<super::system_def::SystemDef> = serde_yaml::from_str(&content)
            .map_err(|e| LoadError::Parse(format!("systems.yaml: {e}")))?;
        game_def.systems.extend(systems);
    }

    // Load events
    let events_file = dir.join("events.yaml");
    if events_file.exists() {
        let content = std::fs::read_to_string(&events_file)
            .map_err(|e| LoadError::Io(e.to_string()))?;
        let events: std::collections::HashMap<String, Vec<super::game_def::Action>> =
            serde_yaml::from_str(&content)
                .map_err(|e| LoadError::Parse(format!("events.yaml: {e}")))?;
        game_def.events.extend(events);
    }

    Ok(game_def)
}

#[derive(Debug)]
pub enum LoadError {
    Io(String),
    Parse(String),
}

impl std::fmt::Display for LoadError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LoadError::Io(msg) => write!(f, "IO error: {msg}"),
            LoadError::Parse(msg) => write!(f, "Parse error: {msg}"),
        }
    }
}

impl std::error::Error for LoadError {}
