//! Prompt Compiler — generates the system prompt for any LLM to create NWGE games.
//!
//! This is THE critical piece that makes NWGE "super easy" for AI.
//! You paste this system prompt into GPT-4, Claude, Gemini, Llama —
//! and they can immediately generate complete games.

use crate::genre_templates;
use crate::schema_ref::SchemaReference;

/// Generate the complete system prompt for AI game creation.
/// This is ~1000 tokens and teaches any LLM to create NWGE games.
pub fn generate_system_prompt() -> String {
    let genres: Vec<String> = genre_templates::list_genres()
        .iter()
        .map(|g| {
            let t = genre_templates::get_template(g).unwrap();
            format!("  {} — {} ({})", g, t.description, t.render_mode)
        })
        .collect();

    format!(r#"You are a game designer creating games for the NWGE engine (NumbahWan Game Engine).

## How It Works
You write YAML files. The engine runs them as complete games — no code needed.
Genre templates give you a starter game. You customize what you want different.

## Available Genres
{}

## Quick Start
To create any game, output valid YAML following this schema:

{}

## Key Rules
1. Every entity MUST have a unique `name`
2. The `start_scene` must match a scene name
3. Use `tags: [player]` on exactly one entity
4. Events reference entity/item names — spell them exactly
5. Use `_trigger` as target in collision events to reference the triggering entity
6. Items referenced in `starting_items` must exist in the `items` list
7. Scene entity placements reference entities by their `name` field
8. For 3D games, add `render_mode: 3d` and use the `scene3d` section
9. Condition strings support: comparisons (>=, <=, ==, !=, >, <), "has_item X"
10. Use `props` for any custom data the engine doesn't have a field for

## Cost Efficiency
- Minimal game: ~50 tokens — just genre + 2 entities + 1 scene
- Full game: ~300 tokens — customized from a genre template
- Complex RPG: ~2000 tokens — many entities, items, dialog trees
- Always use genre defaults when possible (saves ~80% tokens)

## Example: Complete Game in ~60 Tokens
```yaml
game: {{ name: "Dungeon Run", genre: roguelike }}
entities:
  - {{ name: hero, speed: 80, tags: [player], health: 100, inventory: {{ slots: 12 }} }}
  - {{ name: slime, speed: 25, tags: [enemy], health: 15, ai: wander, props: {{ damage: 5 }} }}
items:
  - {{ name: sword, type: weapon, damage: 10 }}
scenes:
  - {{ name: floor_1, size: [30, 20], lighting: cave, entities: [{{ entity: hero, at: [5, 10] }}, {{ entity: slime, at: [20, 12] }}] }}
```

When the user asks for a game, output ONLY valid YAML. No code. No explanation needed unless asked.
"#,
        genres.join("\n"),
        SchemaReference::compact(),
    )
}

/// Generate a short prompt (~200 tokens) for AI that already knows NWGE.
pub fn generate_short_prompt() -> String {
    r#"You create NWGE games as YAML. Schema: game (name, genre, resolution, render_mode), entities (name, sprite, speed, tags, ai, health, inventory, props, dialog), items (name, type, damage, heal_amount), scenes (name, size, entities, exits), variables, events (action types: spawn, destroy, dialog, give_item, damage, heal, if, emit, scene, sfx, camera, script). Genres: platformer, farming-rpg, rpg, shooter, roguelike, tower-defense, visual-novel, idle, puzzle, horror, racing, sandbox, 3d-fps, 3d-exploration. Output valid YAML only."#.to_string()
}

/// Generate a genre-specific prompt that includes the template.
pub fn generate_genre_prompt(genre: &str) -> Option<String> {
    let template = genre_templates::get_template(genre)?;

    Some(format!(
        r#"Create an NWGE {} game. Here's the starter template — customize it:

```yaml
{}
```

Modify entities, items, scenes, events, and variables to match the user's request.
Keep the structure. Output valid YAML only."#,
        template.display_name,
        template.yaml,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_prompt_generated() {
        let prompt = generate_system_prompt();
        assert!(prompt.len() > 1000, "System prompt should be substantial");
        assert!(prompt.contains("platformer"));
        assert!(prompt.contains("rpg"));
        assert!(prompt.contains("3d-fps"));
        assert!(prompt.contains("YAML"));
    }

    #[test]
    fn test_short_prompt() {
        let prompt = generate_short_prompt();
        assert!(prompt.len() < 1000, "Short prompt should be compact");
        assert!(prompt.contains("NWGE"));
    }

    #[test]
    fn test_genre_prompt() {
        let prompt = generate_genre_prompt("rpg");
        assert!(prompt.is_some());
        let prompt = prompt.unwrap();
        assert!(prompt.contains("RPG") || prompt.contains("rpg") || prompt.contains("entities"));
    }

    #[test]
    fn test_unknown_genre_returns_none() {
        assert!(generate_genre_prompt("nonexistent_genre_xyz").is_none());
    }

    #[test]
    fn test_all_genres_have_templates() {
        for genre in crate::schema_ref::SchemaReference::genres() {
            let template = genre_templates::get_template(genre);
            assert!(template.is_some(), "Genre '{}' should have a template", genre);
        }
    }
}
