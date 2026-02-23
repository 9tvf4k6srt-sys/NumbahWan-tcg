//! # NWGE Render — Software Pixel Renderer
//!
//! A CPU-based 2D renderer optimized for pixel art games.
//! Renders to an in-memory framebuffer that can be:
//! - Displayed via softbuffer (windowed mode)
//! - Saved as PNG (headless/screenshot mode)
//! - Streamed to web canvas (future WASM mode)
//!
//! ## Why CPU rendering?
//! 1. Works EVERYWHERE — no GPU required, no driver issues
//! 2. Perfect for pixel art — we're pushing 320x240, not 4K
//! 3. Deterministic — same pixels on every platform
//! 4. Simple — AI can understand and modify the renderer
//! 5. Fast enough — 320x240 @ 60fps is trivial for modern CPUs

pub mod framebuffer;
pub mod sprite;
pub mod tilemap;
pub mod camera;
pub mod text;
pub mod particles;
pub mod color;

pub use framebuffer::Framebuffer;
pub use sprite::{SpriteSheet, SpriteRenderer};
pub use camera::Camera2D;
pub use color::Color;
