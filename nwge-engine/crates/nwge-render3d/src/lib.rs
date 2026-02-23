//! # NWGE Render3D — Software 3D Rasterizer with PBR Lighting
//!
//! A CPU-based 3D renderer that proves the engine's 3D capability.
//! Designed to map 1:1 to wgpu when GPU acceleration is available.
//!
//! Features:
//! - Perspective camera with orbit/FPS modes
//! - Triangle rasterization with depth buffer
//! - Per-pixel PBR-style lighting (diffuse + specular + ambient)
//! - Directional and point lights with shadow estimation
//! - Procedural geometry: cube, sphere, plane, terrain, cylinder
//! - Vertex color and UV coordinate support
//! - Normal mapping for surface detail
//! - Post-processing: ACES tone mapping, fog, bloom, SSAO, vignette
//! - Headless PNG output for AI verification

pub mod math3d;
pub mod camera;
pub mod mesh;
pub mod material;
pub mod light;
pub mod rasterizer;
pub mod scene;
pub mod pipeline;

// Re-exports for convenience
pub use camera::Camera3D;
pub use mesh::{Mesh, Vertex};
pub use material::Material;
pub use light::Light;
pub use rasterizer::{Framebuffer3D, Fragment, draw_mesh, rasterize_triangle};
pub use scene::{Scene3D, SceneObject};
pub use pipeline::{RenderPipeline, PostProcessSettings, RenderStats};
