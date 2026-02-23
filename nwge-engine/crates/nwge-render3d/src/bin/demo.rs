//! NWGE 3D Renderer Demo — generates three showcase PNG images
//!
//! Usage: cargo run --bin nwge-3d-demo
//!
//! Outputs:
//!   nwge3d_landscape.png  — terrain with trees, water, rocks, lighting
//!   nwge3d_materials.png  — PBR material showcase (metal, stone, glass, etc.)
//!   nwge3d_sunset.png     — dramatic sunset scene with fog

use nwge_render3d::{Scene3D, RenderPipeline, PostProcessSettings};
use std::time::Instant;

const WIDTH: u32 = 1280;
const HEIGHT: u32 = 720;

fn main() {
    println!("============================================================");
    println!("  NWGE 3D Renderer v0.1.0 — Software PBR Rasterizer");
    println!("  Resolution: {}x{}", WIDTH, HEIGHT);
    println!("============================================================\n");

    // ─── Scene 1: Landscape ─────────────────────────────────────
    render_scene(
        "Landscape",
        "nwge3d_landscape.png",
        Scene3D::demo_landscape(WIDTH, HEIGHT),
        PostProcessSettings {
            exposure: 1.2,
            bloom_intensity: 0.25,
            ssao_intensity: 0.6,
            vignette_intensity: 0.25,
            ..Default::default()
        },
    );

    // ─── Scene 2: Materials ─────────────────────────────────────
    render_scene(
        "Materials",
        "nwge3d_materials.png",
        Scene3D::demo_materials(WIDTH, HEIGHT),
        PostProcessSettings {
            exposure: 1.0,
            bloom_intensity: 0.3,
            fog: false,
            ssao_intensity: 0.4,
            vignette_intensity: 0.15,
            ..Default::default()
        },
    );

    // ─── Scene 3: Sunset ────────────────────────────────────────
    render_scene(
        "Sunset",
        "nwge3d_sunset.png",
        Scene3D::demo_sunset(WIDTH, HEIGHT),
        PostProcessSettings {
            exposure: 1.4,
            bloom_intensity: 0.4,
            bloom_threshold: 0.8,
            ssao_intensity: 0.3,
            vignette_intensity: 0.4,
            ..Default::default()
        },
    );

    println!("\n============================================================");
    println!("  All 3 scenes rendered successfully!");
    println!("  Files: nwge3d_landscape.png, nwge3d_materials.png, nwge3d_sunset.png");
    println!("============================================================");
}

fn render_scene(name: &str, filename: &str, scene: Scene3D, settings: PostProcessSettings) {
    println!("--- {} Scene ---", name);
    println!("  Objects: {}", scene.objects.len());
    println!("  Triangles: {}", scene.triangle_count());
    println!("  Vertices: {}", scene.vertex_count());
    println!("  Lights: {}", scene.lights.len());

    let mut pipeline = RenderPipeline::new(WIDTH, HEIGHT);
    pipeline.settings = settings;

    let start = Instant::now();
    pipeline.render(&scene);
    let elapsed = start.elapsed();

    let stats = pipeline.stats();
    println!("  Render time: {:.2?}", elapsed);
    println!("  {}", stats);

    // Save as PNG
    let rgba = pipeline.to_rgba8();
    let img = image::RgbaImage::from_raw(WIDTH, HEIGHT, rgba)
        .expect("Failed to create image");
    img.save(filename).expect("Failed to save PNG");
    println!("  Saved: {}\n", filename);
}
