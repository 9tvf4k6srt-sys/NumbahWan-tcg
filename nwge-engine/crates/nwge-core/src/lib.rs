//! # NWGE Core — AI-Native Game Engine
//!
//! The heart of the NumbahWan Game Engine.
//! Everything is **data-driven** so AI can generate game definitions cheaply.
//!
//! ## Architecture
//! ```text
//! AI generates YAML/JSON → nwge-data parses → nwge-core runs ECS → nwge-render draws
//! ```
//!
//! ## Design Principles
//! 1. **Data over code**: Game logic defined in YAML, not Rust
//! 2. **AI-cost-efficient**: Minimal tokens to define a game system
//! 3. **Hot-reloadable**: Change data files → see results instantly
//! 4. **Composable**: Mix and match systems like LEGO blocks

pub mod ecs;
pub mod time;
pub mod event;
pub mod math;
pub mod transform;

// Re-exports for convenience
pub use ecs::{World, GameLoop};
pub use event::EventBus;
pub use glam::{Vec2, Vec3, Vec4, Mat4};
pub use hecs;
