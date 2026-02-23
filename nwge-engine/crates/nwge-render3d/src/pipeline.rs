//! Render Pipeline — orchestrates rendering, post-processing, and output
//!
//! Stages:
//! 1. Geometry pass — rasterize all scene objects with PBR shading
//! 2. Post-processing — tone mapping, fog, bloom (approximated), SSAO
//! 3. Output — final RGBA framebuffer ready for PNG export

use glam::Vec3;
use crate::rasterizer::{Framebuffer3D, draw_mesh};
use crate::scene::Scene3D;

/// Post-processing settings.
#[derive(Debug, Clone)]
pub struct PostProcessSettings {
    /// ACES filmic tone mapping
    pub tone_mapping: bool,
    /// Exposure for tone mapping
    pub exposure: f32,
    /// Distance fog
    pub fog: bool,
    /// Bloom (glow from bright areas)
    pub bloom: bool,
    pub bloom_threshold: f32,
    pub bloom_intensity: f32,
    /// SSAO (screen-space ambient occlusion)
    pub ssao: bool,
    pub ssao_radius: f32,
    pub ssao_intensity: f32,
    /// Vignette darkening at edges
    pub vignette: bool,
    pub vignette_intensity: f32,
    /// Gamma correction
    pub gamma: f32,
}

impl Default for PostProcessSettings {
    fn default() -> Self {
        Self {
            tone_mapping: true,
            exposure: 1.0,
            fog: true,
            bloom: true,
            bloom_threshold: 1.0,
            bloom_intensity: 0.3,
            ssao: true,
            ssao_radius: 1.5,
            ssao_intensity: 0.5,
            vignette: true,
            vignette_intensity: 0.3,
            gamma: 2.2,
        }
    }
}

/// The complete render pipeline.
pub struct RenderPipeline {
    pub framebuffer: Framebuffer3D,
    pub settings: PostProcessSettings,
}

impl RenderPipeline {
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            framebuffer: Framebuffer3D::new(width, height),
            settings: PostProcessSettings::default(),
        }
    }

    /// Render an entire scene.
    pub fn render(&mut self, scene: &Scene3D) {
        // Clear framebuffer with sky color
        self.framebuffer.clear(scene.sky_color);

        let vp = scene.camera.view_projection();
        let cam_pos = scene.camera.position;

        // Geometry pass: rasterize all visible objects
        for obj in &scene.objects {
            if !obj.visible { continue; }
            let model = obj.model_matrix();
            draw_mesh(
                &mut self.framebuffer,
                &obj.mesh,
                &model,
                &vp,
                &obj.material,
                &scene.lights,
                cam_pos,
            );
        }

        // Post-processing pass
        self.post_process(scene);
    }

    /// Apply post-processing effects.
    fn post_process(&mut self, scene: &Scene3D) {
        let w = self.framebuffer.width;
        let h = self.framebuffer.height;
        let total = (w * h) as usize;

        // 1. SSAO (approximate)
        if self.settings.ssao {
            self.apply_ssao();
        }

        // 2. Fog
        if self.settings.fog && scene.fog_enabled {
            self.apply_fog(scene.camera.position, scene.fog_color, scene.fog_start, scene.fog_end);
        }

        // 3. Bloom (approximate: bright areas glow)
        if self.settings.bloom {
            self.apply_bloom();
        }

        // 4. Tone mapping + gamma correction → resolve to color buffer
        for i in 0..total {
            let mut color = self.framebuffer.fragments[i].color;

            // Exposure
            color *= self.settings.exposure;

            // ACES filmic tone mapping
            if self.settings.tone_mapping {
                color = aces_tonemap(color);
            }

            // Vignette
            if self.settings.vignette {
                let x = (i % w as usize) as f32 / w as f32 * 2.0 - 1.0;
                let y = (i / w as usize) as f32 / h as f32 * 2.0 - 1.0;
                let dist = (x * x + y * y).sqrt();
                let vignette = 1.0 - dist * dist * self.settings.vignette_intensity;
                color *= vignette.max(0.0);
            }

            // Gamma correction
            let inv_gamma = 1.0 / self.settings.gamma;
            color = Vec3::new(
                color.x.powf(inv_gamma),
                color.y.powf(inv_gamma),
                color.z.powf(inv_gamma),
            );

            // Clamp to [0, 1]
            color = color.clamp(Vec3::ZERO, Vec3::ONE);

            let alpha = self.framebuffer.fragments[i].alpha;
            self.framebuffer.color_buffer[i] = [color.x, color.y, color.z, if alpha > 0.0 { alpha } else { 1.0 }];
        }
    }

    /// Approximate SSAO — check depth differences with neighbors.
    fn apply_ssao(&mut self) {
        let w = self.framebuffer.width as i32;
        let h = self.framebuffer.height as i32;
        let radius = self.settings.ssao_radius;
        let intensity = self.settings.ssao_intensity;

        // Sample offsets (simple kernel)
        let offsets: [(i32, i32); 8] = [
            (-1, -1), (0, -1), (1, -1),
            (-1,  0),          (1,  0),
            (-1,  1), (0,  1), (1,  1),
        ];

        // Compute AO factors (we need a copy to avoid read/write conflict)
        let mut ao_factors: Vec<f32> = vec![1.0; (w * h) as usize];

        for y in 0..h {
            for x in 0..w {
                let idx = (y * w + x) as usize;
                let center_depth = self.framebuffer.fragments[idx].depth;
                let center_normal = self.framebuffer.fragments[idx].normal;

                if center_depth >= f32::MAX * 0.9 {
                    continue; // Sky
                }

                let mut occlusion = 0.0f32;
                let mut samples = 0.0f32;

                for &(dx, dy) in &offsets {
                    let scale = (radius as i32).max(1);
                    let nx = x + dx * scale;
                    let ny = y + dy * scale;

                    if nx < 0 || nx >= w || ny < 0 || ny >= h {
                        continue;
                    }

                    let nidx = (ny * w + nx) as usize;
                    let neighbor_depth = self.framebuffer.fragments[nidx].depth;
                    let neighbor_normal = self.framebuffer.fragments[nidx].normal;

                    if neighbor_depth < f32::MAX * 0.9 {
                        let depth_diff = (center_depth - neighbor_depth).abs();
                        let normal_diff = 1.0 - center_normal.dot(neighbor_normal).max(0.0);

                        if depth_diff > 0.001 && depth_diff < 0.1 {
                            occlusion += depth_diff * 10.0 + normal_diff * 0.5;
                        }
                    }
                    samples += 1.0;
                }

                if samples > 0.0 {
                    let ao = 1.0 - (occlusion / samples).min(1.0) * intensity;
                    ao_factors[idx] = ao.max(0.2);
                }
            }
        }

        // Apply AO to fragment colors
        for i in 0..ao_factors.len() {
            self.framebuffer.fragments[i].color *= ao_factors[i];
        }
    }

    /// Distance fog.
    fn apply_fog(&mut self, camera_pos: Vec3, fog_color: Vec3, fog_start: f32, fog_end: f32) {
        for f in &mut self.framebuffer.fragments {
            if f.depth >= f32::MAX * 0.9 {
                continue; // Don't fog the sky
            }

            let dist = (f.position - camera_pos).length();
            let fog_factor = ((dist - fog_start) / (fog_end - fog_start)).clamp(0.0, 1.0);
            f.color = f.color.lerp(fog_color, fog_factor);
        }
    }

    /// Simple bloom — extract bright areas and blur them back.
    fn apply_bloom(&mut self) {
        let w = self.framebuffer.width as usize;
        let h = self.framebuffer.height as usize;
        let threshold = self.settings.bloom_threshold;
        let bloom_intensity = self.settings.bloom_intensity;

        // Extract bright pixels
        let mut bright: Vec<Vec3> = vec![Vec3::ZERO; w * h];
        for i in 0..w * h {
            let c = self.framebuffer.fragments[i].color;
            let luminance = c.x * 0.2126 + c.y * 0.7152 + c.z * 0.0722;
            if luminance > threshold {
                bright[i] = c * (luminance - threshold);
            }
        }

        // Simple box blur (2 passes for approximate gaussian)
        let blurred = box_blur(&bright, w, h, 4);
        let blurred = box_blur(&blurred, w, h, 4);

        // Add bloom back
        for i in 0..w * h {
            self.framebuffer.fragments[i].color += blurred[i] * bloom_intensity;
        }
    }

    /// Get the final image as RGBA u8 bytes.
    pub fn to_rgba8(&self) -> Vec<u8> {
        self.framebuffer.to_rgba8()
    }

    /// Get stats about the last render.
    pub fn stats(&self) -> RenderStats {
        let mut drawn_pixels = 0u64;
        for f in &self.framebuffer.fragments {
            if f.depth < f32::MAX * 0.9 {
                drawn_pixels += 1;
            }
        }

        RenderStats {
            width: self.framebuffer.width,
            height: self.framebuffer.height,
            total_pixels: (self.framebuffer.width as u64) * (self.framebuffer.height as u64),
            drawn_pixels,
            fill_rate: drawn_pixels as f64 / ((self.framebuffer.width as u64) * (self.framebuffer.height as u64)) as f64,
        }
    }
}

/// Stats from a render pass.
#[derive(Debug)]
pub struct RenderStats {
    pub width: u32,
    pub height: u32,
    pub total_pixels: u64,
    pub drawn_pixels: u64,
    pub fill_rate: f64,
}

impl std::fmt::Display for RenderStats {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}x{} | {}/{} pixels drawn ({:.1}% fill)",
               self.width, self.height,
               self.drawn_pixels, self.total_pixels,
               self.fill_rate * 100.0)
    }
}

// ─── Helper functions ───────────────────────────────────────────

/// ACES filmic tone mapping (industry standard, same as Unreal Engine).
fn aces_tonemap(color: Vec3) -> Vec3 {
    let a = 2.51;
    let b = 0.03;
    let c = 2.43;
    let d = 0.59;
    let e = 0.14;

    let x = color;
    let mapped = (x * (a * x + Vec3::splat(b))) / (x * (c * x + Vec3::splat(d)) + Vec3::splat(e));
    mapped.clamp(Vec3::ZERO, Vec3::ONE)
}

/// Simple box blur for bloom.
fn box_blur(input: &[Vec3], width: usize, height: usize, radius: i32) -> Vec<Vec3> {
    let mut output = vec![Vec3::ZERO; width * height];

    for y in 0..height {
        for x in 0..width {
            let mut sum = Vec3::ZERO;
            let mut count = 0.0f32;

            for dy in -radius..=radius {
                for dx in -radius..=radius {
                    let nx = x as i32 + dx;
                    let ny = y as i32 + dy;
                    if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                        sum += input[(ny as usize) * width + (nx as usize)];
                        count += 1.0;
                    }
                }
            }

            output[y * width + x] = sum / count;
        }
    }

    output
}
