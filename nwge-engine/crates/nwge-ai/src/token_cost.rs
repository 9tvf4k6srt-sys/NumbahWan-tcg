//! Token Cost Estimator — tells AI the cheapest way to generate games.
//!
//! This helps AI make cost-efficient decisions:
//! - Use genre templates (50 tokens) instead of writing from scratch (2000 tokens)
//! - Skip optional fields that have good defaults
//! - Use shorthand YAML syntax

use nwge_data::GameDefinition;

/// Estimate the number of AI tokens to generate this game definition.
/// Based on average YAML token density of ~3.5 characters per token.
pub fn estimate_tokens(game: &GameDefinition) -> u32 {
    let mut tokens: u32 = 0;

    // Game metadata: ~20 tokens
    tokens += 20;

    // Entities: ~25-40 tokens each
    for entity in &game.entities {
        tokens += 15; // name, position, speed
        tokens += entity.tags.len() as u32 * 2; // tags
        tokens += entity.animations.len() as u32 * 8; // animations
        tokens += entity.props.len() as u32 * 5; // props

        if entity.inventory.is_some() { tokens += 15; }
        if entity.dialog.is_some() { tokens += 30; }
        if entity.ai.is_some() { tokens += 3; }
        if entity.health.is_some() { tokens += 3; }
    }

    // Items: ~12-20 tokens each
    for item in &game.items {
        tokens += 8; // name, type
        tokens += item.stats.len() as u32 * 4;
        tokens += item.recipe.len() as u32 * 4;
        if item.description.is_some() { tokens += 10; }
        if item.damage.is_some() { tokens += 3; }
        if item.heal_amount.is_some() { tokens += 3; }
    }

    // Scenes: ~30-60 tokens each
    for scene in &game.scenes {
        tokens += 12; // name, size, spawn
        tokens += scene.entities.len() as u32 * 6; // placements
        tokens += scene.exits.len() as u32 * 8; // exits
        tokens += scene.on_enter.len() as u32 * 10; // events
    }

    // Systems: ~5 tokens each
    tokens += game.systems.len() as u32 * 5;

    // Variables: ~4 tokens each
    tokens += game.variables.len() as u32 * 4;

    // Events: ~10-30 tokens each
    for (_name, actions) in &game.events {
        tokens += 5; // event name
        tokens += actions.len() as u32 * 8; // actions
    }

    tokens
}

/// Generate a cost comparison report.
pub fn cost_report(game: &GameDefinition) -> String {
    let tokens = estimate_tokens(game);
    let gpt4o_cost = tokens as f64 * 0.0000025; // $2.50 per 1M input tokens
    let claude_cost = tokens as f64 * 0.000003;  // $3.00 per 1M input tokens

    format!(
        r#"=== Token Cost Report ===
Game: {}
Estimated tokens: {}
Cost (GPT-4o): ${:.4}
Cost (Claude 3.5): ${:.4}
Cost (Local LLM): $0.0000

Breakdown:
  Entities: {} ({} tokens each avg)
  Items: {} ({} tokens each avg)
  Scenes: {} ({} tokens each avg)
  Systems: {}
  Events: {}
  Variables: {}

Savings tip: Use `genre: "{}"` to get defaults for free.
"#,
        game.game.name,
        tokens,
        gpt4o_cost,
        claude_cost,
        game.entities.len(),
        if game.entities.is_empty() { 0 } else { (tokens / 3) / game.entities.len() as u32 },
        game.items.len(),
        if game.items.is_empty() { 0 } else { (tokens / 5) / game.items.len().max(1) as u32 },
        game.scenes.len(),
        if game.scenes.is_empty() { 0 } else { (tokens / 4) / game.scenes.len() as u32 },
        game.systems.len(),
        game.events.len(),
        game.variables.len(),
        game.game.genre,
    )
}
