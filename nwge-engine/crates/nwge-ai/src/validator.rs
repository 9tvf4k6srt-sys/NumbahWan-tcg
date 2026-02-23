//! Validator — checks game YAML and returns AI-friendly fix suggestions.
//!
//! Instead of cryptic parse errors, this tells the AI exactly what's wrong
//! and how to fix it.

use nwge_data::GameDefinition;

/// Result of validating a game definition.
#[derive(Debug)]
pub struct ValidationResult {
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationWarning>,
    pub stats: GameStats,
    pub valid: bool,
}

impl ValidationResult {
    /// Format as AI-readable string for self-correction.
    pub fn to_ai_string(&self) -> String {
        let mut out = String::new();

        if self.valid {
            out.push_str("VALID\n");
        } else {
            out.push_str("INVALID — fix the following errors:\n\n");
        }

        for (i, e) in self.errors.iter().enumerate() {
            out.push_str(&format!("ERROR {}: {}\n  FIX: {}\n\n", i + 1, e.message, e.fix_suggestion));
        }

        for (i, w) in self.warnings.iter().enumerate() {
            out.push_str(&format!("WARNING {}: {}\n  SUGGESTION: {}\n\n", i + 1, w.message, w.suggestion));
        }

        out.push_str(&format!("{}\n", self.stats));
        out
    }
}

#[derive(Debug)]
pub struct ValidationError {
    pub message: String,
    pub fix_suggestion: String,
    pub path: String,
}

#[derive(Debug)]
pub struct ValidationWarning {
    pub message: String,
    pub suggestion: String,
}

/// Stats about the game definition.
#[derive(Debug)]
pub struct GameStats {
    pub entity_count: usize,
    pub item_count: usize,
    pub scene_count: usize,
    pub system_count: usize,
    pub event_count: usize,
    pub variable_count: usize,
    pub estimated_tokens: u32,
}

impl std::fmt::Display for GameStats {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Stats: {} entities, {} items, {} scenes, {} systems, {} events, {} variables (~{} tokens)",
            self.entity_count, self.item_count, self.scene_count,
            self.system_count, self.event_count, self.variable_count,
            self.estimated_tokens)
    }
}

/// Validate a game definition and return AI-friendly results.
pub fn validate_game(game: &GameDefinition) -> ValidationResult {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    // ─── Required fields ────────────────────────────────────
    if game.game.name.is_empty() {
        errors.push(ValidationError {
            message: "game.name is empty".into(),
            fix_suggestion: "Add: game: { name: \"My Game\" }".into(),
            path: "game.name".into(),
        });
    }

    // ─── Genre validation ───────────────────────────────────
    let valid_genres = [
        "rpg", "platformer", "farming", "farming-rpg", "shooter", "puzzle",
        "idle", "visual-novel", "roguelike", "tower-defense", "horror",
        "racing", "sandbox", "3d-fps", "3d-exploration",
    ];
    if !valid_genres.contains(&game.game.genre.as_str()) {
        warnings.push(ValidationWarning {
            message: format!("Unknown genre: '{}'. Engine will use defaults.", game.game.genre),
            suggestion: format!("Use one of: {}", valid_genres.join(", ")),
        });
    }

    // ─── Entity validation ──────────────────────────────────
    let entity_names: Vec<&str> = game.entities.iter().map(|e| e.name.as_str()).collect();

    for entity in &game.entities {
        if entity.name.is_empty() {
            errors.push(ValidationError {
                message: "Entity has empty name".into(),
                fix_suggestion: "Every entity needs: name: \"some_name\"".into(),
                path: "entities[?].name".into(),
            });
        }

        // Check duplicate names
        if entity_names.iter().filter(|&&n| n == entity.name).count() > 1 {
            errors.push(ValidationError {
                message: format!("Duplicate entity name: '{}'", entity.name),
                fix_suggestion: format!("Rename one of the '{}' entities to be unique", entity.name),
                path: format!("entities.{}", entity.name),
            });
        }

        // Validate AI behavior
        if let Some(ref ai) = entity.ai {
            let valid_ai = ["none", "wander", "patrol", "chase", "flee", "follow", "idle"];
            if !valid_ai.contains(&ai.as_str()) {
                errors.push(ValidationError {
                    message: format!("Entity '{}' has invalid AI: '{}'", entity.name, ai),
                    fix_suggestion: format!("Use one of: {}", valid_ai.join(", ")),
                    path: format!("entities.{}.ai", entity.name),
                });
            }
        }

        // Validate body type
        let valid_bodies = ["none", "dynamic", "static", "kinematic"];
        if !valid_bodies.contains(&entity.body.as_str()) {
            errors.push(ValidationError {
                message: format!("Entity '{}' has invalid body: '{}'", entity.name, entity.body),
                fix_suggestion: format!("Use one of: {}", valid_bodies.join(", ")),
                path: format!("entities.{}.body", entity.name),
            });
        }

        // Check for player entity
        if entity.tags.contains(&"player".to_string()) && entity.speed.is_none() {
            warnings.push(ValidationWarning {
                message: format!("Player entity '{}' has no speed set", entity.name),
                suggestion: "Add: speed: 80 (or appropriate value)".into(),
            });
        }
    }

    // Must have at least one player entity
    let has_player = game.entities.iter().any(|e| e.tags.contains(&"player".to_string()));
    if !has_player && !game.entities.is_empty() {
        warnings.push(ValidationWarning {
            message: "No entity has 'player' tag".into(),
            suggestion: "Add tags: [player] to the main character entity".into(),
        });
    }

    // ─── Item validation ────────────────────────────────────
    let valid_item_types = [
        "weapon", "tool", "seed", "crop", "food", "material",
        "potion", "key", "quest", "equipment", "junk", "building",
    ];

    for item in &game.items {
        if item.name.is_empty() {
            errors.push(ValidationError {
                message: "Item has empty name".into(),
                fix_suggestion: "Every item needs: name: \"some_item\"".into(),
                path: "items[?].name".into(),
            });
        }

        if !valid_item_types.contains(&item.r#type.as_str()) {
            warnings.push(ValidationWarning {
                message: format!("Item '{}' has unknown type: '{}'", item.name, item.r#type),
                suggestion: format!("Use one of: {}", valid_item_types.join(", ")),
            });
        }

        // Weapon without damage
        if item.r#type == "weapon" && item.damage.is_none() {
            warnings.push(ValidationWarning {
                message: format!("Weapon '{}' has no damage value", item.name),
                suggestion: "Add: damage: 10 (or appropriate value)".into(),
            });
        }

        // Seed without crop
        if item.r#type == "seed" && item.crop.is_none() {
            errors.push(ValidationError {
                message: format!("Seed '{}' has no crop defined", item.name),
                fix_suggestion: "Add: crop: \"turnip\" (or the crop it grows into)".into(),
                path: format!("items.{}.crop", item.name),
            });
        }
    }

    // ─── Scene validation ───────────────────────────────────
    let scene_names: Vec<&str> = game.scenes.iter().map(|s| s.name.as_str()).collect();

    if game.scenes.is_empty() {
        warnings.push(ValidationWarning {
            message: "No scenes defined".into(),
            suggestion: "Add at least one scene: scenes: [{ name: \"main\" }]".into(),
        });
    }

    // Check start_scene exists (only error if explicitly set and not matching)
    if !game.game.start_scene.is_empty() && !scene_names.contains(&game.game.start_scene.as_str()) && !game.scenes.is_empty() {
        // If it's the default "main" and there are scenes, just warn — engine will use first scene
        if game.game.start_scene == "main" {
            warnings.push(ValidationWarning {
                message: format!("start_scene 'main' not found; engine will use first scene '{}'", scene_names[0]),
                suggestion: format!("Add `start_scene: {}` to game section", scene_names[0]),
            });
        } else {
            errors.push(ValidationError {
                message: format!("start_scene '{}' not found in scenes", game.game.start_scene),
                fix_suggestion: format!("Add a scene named '{}' or change start_scene to one of: {}",
                    game.game.start_scene, scene_names.join(", ")),
                path: "game.start_scene".into(),
            });
        }
    }

    for scene in &game.scenes {
        // Check entity references
        for placement in &scene.entities {
            if !entity_names.contains(&placement.entity.as_str()) {
                errors.push(ValidationError {
                    message: format!("Scene '{}' references unknown entity '{}'", scene.name, placement.entity),
                    fix_suggestion: format!("Define entity '{}' in the entities section, or fix the name", placement.entity),
                    path: format!("scenes.{}.entities", scene.name),
                });
            }
        }

        // Check exit references
        for exit in &scene.exits {
            if !scene_names.contains(&exit.to.as_str()) {
                warnings.push(ValidationWarning {
                    message: format!("Scene '{}' has exit to unknown scene '{}'", scene.name, exit.to),
                    suggestion: format!("Add a scene named '{}'", exit.to),
                });
            }
        }
    }

    // ─── Event validation ───────────────────────────────────
    for (event_name, actions) in &game.events {
        if actions.is_empty() {
            warnings.push(ValidationWarning {
                message: format!("Event '{}' has no actions", event_name),
                suggestion: "Add at least one action or remove the event".into(),
            });
        }
    }

    // Check referenced events exist
    for entity in &game.entities {
        if let Some(ref on_collide) = entity.on_collide {
            if !game.events.contains_key(on_collide) {
                warnings.push(ValidationWarning {
                    message: format!("Entity '{}' references undefined event '{}'", entity.name, on_collide),
                    suggestion: format!("Add: events: {{ {}: [...] }}", on_collide),
                });
            }
        }
        if let Some(ref on_interact) = entity.on_interact {
            if !game.events.contains_key(on_interact) {
                warnings.push(ValidationWarning {
                    message: format!("Entity '{}' references undefined event '{}'", entity.name, on_interact),
                    suggestion: format!("Add: events: {{ {}: [...] }}", on_interact),
                });
            }
        }
    }

    // ─── Calculate stats ────────────────────────────────────
    let stats = GameStats {
        entity_count: game.entities.len(),
        item_count: game.items.len(),
        scene_count: game.scenes.len(),
        system_count: game.systems.len(),
        event_count: game.events.len(),
        variable_count: game.variables.len(),
        estimated_tokens: crate::token_cost::estimate_tokens(game),
    };

    let valid = errors.is_empty();

    ValidationResult { errors, warnings, stats, valid }
}
