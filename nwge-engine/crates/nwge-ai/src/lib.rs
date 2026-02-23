//! # NWGE-AI — The AI-Native Game Creation Layer
//!
//! This crate makes NWGE "super easy" for any AI (GPT-4, Claude, Gemini, Llama, etc.)
//! to create games across ALL genres — 2D, 3D, or hybrid.
//!
//! ## Architecture
//! ```text
//! AI writes:    "Make me a zombie survival shooter"
//!       ↓
//! Prompt Layer: System prompt teaches AI the NWGE schema (~500 tokens)
//!       ↓
//! AI generates: game.yaml (~200-2000 tokens depending on complexity)
//!       ↓
//! Schema Layer: Validates, fills defaults, estimates token cost
//!       ↓
//! Engine Layer: nwge-runner executes the game
//! ```
//!
//! ## Key Features
//! - **Genre templates**: One word → complete game scaffold
//! - **Schema reference**: Machine-readable spec for AI
//! - **Token estimator**: Tells AI the cheapest way to generate
//! - **Validation + fix suggestions**: AI-friendly error messages
//! - **Prompt compiler**: Generates the system prompt for any LLM

pub mod genre_templates;
pub mod schema_ref;
pub mod validator;
pub mod token_cost;
pub mod prompt;

// Re-exports
pub use genre_templates::{GenreTemplate, get_template, list_genres};
pub use schema_ref::SchemaReference;
pub use validator::{validate_game, ValidationResult, ValidationError};
pub use token_cost::estimate_tokens;
pub use prompt::generate_system_prompt;
