//! Software 3D Rasterizer — depth-buffered triangle rendering with per-pixel PBR shading
//!
//! This is a full CPU rasterizer that produces a framebuffer identical in concept to
//! what a GPU fragment shader pipeline would output. It's designed so that every stage
//! maps 1:1 to a future wgpu/Vulkan backend.

use glam::{Vec2, Vec3, Vec4, Mat4};
use crate::mesh::Vertex;
use crate::material::Material;
use crate::light::{Light, compute_pbr_lighting};
use crate::math3d;

/// A pixel in the framebuffer.
#[derive(Debug, Clone, Copy)]
pub struct Fragment {
    pub color: Vec3,       // HDR color (before tone mapping)
    pub alpha: f32,
    pub depth: f32,        // Depth value (0=near, 1=far)
    pub normal: Vec3,      // World-space normal (for post-processing)
    pub position: Vec3,    // World-space position (for post-processing)
}

impl Default for Fragment {
    fn default() -> Self {
        Self {
            color: Vec3::ZERO,
            alpha: 0.0,
            depth: f32::MAX,
            normal: Vec3::ZERO,
            position: Vec3::ZERO,
        }
    }
}

/// The G-buffer / framebuffer for our software renderer.
pub struct Framebuffer3D {
    pub width: u32,
    pub height: u32,
    pub fragments: Vec<Fragment>,
    pub color_buffer: Vec<[f32; 4]>,  // Final RGBA output
}

impl Framebuffer3D {
    pub fn new(width: u32, height: u32) -> Self {
        let size = (width * height) as usize;
        Self {
            width,
            height,
            fragments: vec![Fragment::default(); size],
            color_buffer: vec![[0.0, 0.0, 0.0, 1.0]; size],
        }
    }

    pub fn clear(&mut self, clear_color: Vec3) {
        for f in &mut self.fragments {
            *f = Fragment {
                color: clear_color,
                depth: f32::MAX,
                ..Default::default()
            };
        }
        for c in &mut self.color_buffer {
            *c = [clear_color.x, clear_color.y, clear_color.z, 1.0];
        }
    }

    #[inline]
    pub fn idx(&self, x: u32, y: u32) -> usize {
        (y * self.width + x) as usize
    }

    /// Write a fragment if it passes the depth test.
    #[inline]
    pub fn write_fragment(&mut self, x: u32, y: u32, frag: Fragment) {
        if x >= self.width || y >= self.height {
            return;
        }
        let idx = self.idx(x, y);
        if frag.depth < self.fragments[idx].depth {
            self.fragments[idx] = frag;
        }
    }

    /// Blit the fragment buffer to the color buffer (after lighting pass).
    pub fn resolve(&mut self) {
        for i in 0..self.fragments.len() {
            let f = &self.fragments[i];
            self.color_buffer[i] = [f.color.x, f.color.y, f.color.z, f.alpha.max(f.color.length().min(1.0))];
        }
    }

    /// Export to RGBA u8 buffer for image saving.
    pub fn to_rgba8(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity((self.width * self.height * 4) as usize);
        for c in &self.color_buffer {
            out.push((c[0].clamp(0.0, 1.0) * 255.0) as u8);
            out.push((c[1].clamp(0.0, 1.0) * 255.0) as u8);
            out.push((c[2].clamp(0.0, 1.0) * 255.0) as u8);
            out.push((c[3].clamp(0.0, 1.0) * 255.0) as u8);
        }
        out
    }
}

/// Interpolated vertex data for a fragment.
#[derive(Debug, Clone, Copy)]
struct InterpolatedVertex {
    world_pos: Vec3,
    normal: Vec3,
    uv: Vec2,
    color: [f32; 4],
    depth: f32,
}

/// Rasterize a single triangle with PBR lighting.
pub fn rasterize_triangle(
    fb: &mut Framebuffer3D,
    v0: &Vertex, v1: &Vertex, v2: &Vertex,
    model_matrix: &Mat4,
    vp_matrix: &Mat4,
    normal_matrix: &Mat4,
    material: &Material,
    lights: &[Light],
    camera_pos: Vec3,
) {
    // Transform vertices to world space
    let wp0 = (*model_matrix * Vec4::new(v0.position.x, v0.position.y, v0.position.z, 1.0)).truncate();
    let wp1 = (*model_matrix * Vec4::new(v1.position.x, v1.position.y, v1.position.z, 1.0)).truncate();
    let wp2 = (*model_matrix * Vec4::new(v2.position.x, v2.position.y, v2.position.z, 1.0)).truncate();

    // Transform normals
    let wn0 = (*normal_matrix * Vec4::new(v0.normal.x, v0.normal.y, v0.normal.z, 0.0)).truncate().normalize_or_zero();
    let wn1 = (*normal_matrix * Vec4::new(v1.normal.x, v1.normal.y, v1.normal.z, 0.0)).truncate().normalize_or_zero();
    let wn2 = (*normal_matrix * Vec4::new(v2.normal.x, v2.normal.y, v2.normal.z, 0.0)).truncate().normalize_or_zero();

    // Transform to clip space
    let mvp = *vp_matrix * *model_matrix;
    let clip0 = math3d::transform_point(&mvp, v0.position);
    let clip1 = math3d::transform_point(&mvp, v1.position);
    let clip2 = math3d::transform_point(&mvp, v2.position);

    // Near-plane clipping (simple reject)
    if clip0.w <= 0.0 && clip1.w <= 0.0 && clip2.w <= 0.0 {
        return;
    }

    // Perspective divide
    let ndc0 = math3d::perspective_divide(clip0);
    let ndc1 = math3d::perspective_divide(clip1);
    let ndc2 = math3d::perspective_divide(clip2);

    // NDC to screen
    let w = fb.width as f32;
    let h = fb.height as f32;
    let s0 = math3d::ndc_to_screen(ndc0, w, h);
    let s1 = math3d::ndc_to_screen(ndc1, w, h);
    let s2 = math3d::ndc_to_screen(ndc2, w, h);

    // Back-face culling (CW winding in screen space = back face)
    let edge1_2d = Vec2::new(s1.x - s0.x, s1.y - s0.y);
    let edge2_2d = Vec2::new(s2.x - s0.x, s2.y - s0.y);
    let cross_z = edge1_2d.x * edge2_2d.y - edge1_2d.y * edge2_2d.x;
    if cross_z <= 0.0 {
        return; // Back face
    }

    // Bounding box (clipped to screen)
    let min_x = s0.x.min(s1.x).min(s2.x).max(0.0) as u32;
    let max_x = s0.x.max(s1.x).max(s2.x).min(w - 1.0) as u32;
    let min_y = s0.y.min(s1.y).min(s2.y).max(0.0) as u32;
    let max_y = s0.y.max(s1.y).max(s2.y).min(h - 1.0) as u32;

    if min_x > max_x || min_y > max_y {
        return;
    }

    let screen_a = Vec2::new(s0.x, s0.y);
    let screen_b = Vec2::new(s1.x, s1.y);
    let screen_c = Vec2::new(s2.x, s2.y);

    // Inverse W for perspective-correct interpolation
    let inv_w0 = if clip0.w.abs() > 1e-6 { 1.0 / clip0.w } else { 0.0 };
    let inv_w1 = if clip1.w.abs() > 1e-6 { 1.0 / clip1.w } else { 0.0 };
    let inv_w2 = if clip2.w.abs() > 1e-6 { 1.0 / clip2.w } else { 0.0 };

    // Rasterize
    for py in min_y..=max_y {
        for px in min_x..=max_x {
            let p = Vec2::new(px as f32 + 0.5, py as f32 + 0.5);
            let (bary_a, bary_b, bary_c) = math3d::barycentric(p, screen_a, screen_b, screen_c);

            // Inside triangle?
            if bary_a < 0.0 || bary_b < 0.0 || bary_c < 0.0 {
                continue;
            }

            // Perspective-correct interpolation
            let inv_w = bary_a * inv_w0 + bary_b * inv_w1 + bary_c * inv_w2;
            if inv_w.abs() < 1e-8 {
                continue;
            }
            let w_correct = 1.0 / inv_w;

            // Interpolate depth
            let depth = bary_a * s0.z + bary_b * s1.z + bary_c * s2.z;

            // Depth test (early out)
            let idx = fb.idx(px, py);
            if depth >= fb.fragments[idx].depth {
                continue;
            }

            // Interpolate attributes with perspective correction
            let interp = InterpolatedVertex {
                world_pos: (bary_a * wp0 * inv_w0 + bary_b * wp1 * inv_w1 + bary_c * wp2 * inv_w2) * w_correct,
                normal: (bary_a * wn0 * inv_w0 + bary_b * wn1 * inv_w1 + bary_c * wn2 * inv_w2).normalize_or_zero() * w_correct,
                uv: (bary_a * v0.uv * inv_w0 + bary_b * v1.uv * inv_w1 + bary_c * v2.uv * inv_w2) * w_correct,
                color: [
                    (bary_a * v0.color[0] * inv_w0 + bary_b * v1.color[0] * inv_w1 + bary_c * v2.color[0] * inv_w2) * w_correct,
                    (bary_a * v0.color[1] * inv_w0 + bary_b * v1.color[1] * inv_w1 + bary_c * v2.color[1] * inv_w2) * w_correct,
                    (bary_a * v0.color[2] * inv_w0 + bary_b * v1.color[2] * inv_w1 + bary_c * v2.color[2] * inv_w2) * w_correct,
                    (bary_a * v0.color[3] * inv_w0 + bary_b * v1.color[3] * inv_w1 + bary_c * v2.color[3] * inv_w2) * w_correct,
                ],
                depth,
            };

            // Per-pixel PBR shading
            let frag_normal = interp.normal.normalize_or_zero();
            let view_dir = (camera_pos - interp.world_pos).normalize_or_zero();

            // Combine vertex color with material base color
            let pixel_color = material.base_color * Vec3::new(interp.color[0], interp.color[1], interp.color[2]);

            let lit_color = compute_pbr_lighting(
                interp.world_pos,
                frag_normal,
                view_dir,
                pixel_color,
                material.metallic,
                material.roughness,
                material.ao,
                lights,
            );

            // Add emissive
            let final_color = lit_color + material.emissive;

            fb.fragments[idx] = Fragment {
                color: final_color,
                alpha: material.alpha * interp.color[3],
                depth: interp.depth,
                normal: frag_normal,
                position: interp.world_pos,
            };
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mesh::Mesh;
    use crate::material::Material;
    use crate::light::Light;

    #[test]
    fn test_framebuffer_clear() {
        let mut fb = Framebuffer3D::new(64, 64);
        fb.clear(Vec3::new(0.5, 0.5, 0.5));
        for f in &fb.fragments {
            assert!((f.color.x - 0.5).abs() < 0.001);
            assert_eq!(f.depth, f32::MAX);
        }
    }

    #[test]
    fn test_framebuffer_depth_test() {
        let mut fb = Framebuffer3D::new(10, 10);
        fb.clear(Vec3::ZERO);

        // Write a fragment
        fb.write_fragment(5, 5, Fragment {
            color: Vec3::new(1.0, 0.0, 0.0),
            alpha: 1.0,
            depth: 0.5,
            normal: Vec3::Y,
            position: Vec3::ZERO,
        });
        assert_eq!(fb.fragments[fb.idx(5, 5)].depth, 0.5);

        // Write closer fragment — should overwrite
        fb.write_fragment(5, 5, Fragment {
            color: Vec3::new(0.0, 1.0, 0.0),
            alpha: 1.0,
            depth: 0.3,
            normal: Vec3::Y,
            position: Vec3::ZERO,
        });
        assert_eq!(fb.fragments[fb.idx(5, 5)].depth, 0.3);
        assert!(fb.fragments[fb.idx(5, 5)].color.y > 0.5);

        // Write farther fragment — should NOT overwrite
        fb.write_fragment(5, 5, Fragment {
            color: Vec3::new(0.0, 0.0, 1.0),
            alpha: 1.0,
            depth: 0.8,
            normal: Vec3::Y,
            position: Vec3::ZERO,
        });
        assert_eq!(fb.fragments[fb.idx(5, 5)].depth, 0.3); // Still 0.3
    }

    #[test]
    fn test_draw_cube_produces_pixels() {
        let mut fb = Framebuffer3D::new(128, 128);
        fb.clear(Vec3::ZERO);

        let cube = Mesh::cube(2.0);
        let model = Mat4::IDENTITY;
        let camera_pos = Vec3::new(0.0, 2.0, 5.0);
        let view = Mat4::look_at_rh(camera_pos, Vec3::ZERO, Vec3::Y);
        let proj = Mat4::perspective_rh(std::f32::consts::FRAC_PI_4, 1.0, 0.1, 100.0);
        let vp = proj * view;
        let lights = vec![
            Light::sun(Vec3::new(-1.0, -1.0, -1.0), 1.0),
            Light::ambient(0.2),
        ];

        draw_mesh(&mut fb, &cube, &model, &vp, &Material::stone(), &lights, camera_pos);

        // Some pixels should have been drawn (depth < MAX)
        let drawn = fb.fragments.iter().filter(|f| f.depth < f32::MAX * 0.9).count();
        assert!(drawn > 100, "Cube should produce many drawn pixels, got {}", drawn);
    }

    #[test]
    fn test_to_rgba8_output() {
        let fb = Framebuffer3D::new(4, 4);
        let rgba = fb.to_rgba8();
        assert_eq!(rgba.len(), 4 * 4 * 4); // 4x4 pixels, 4 bytes each
    }
}

/// Draw a complete mesh with the given transform and material.
pub fn draw_mesh(
    fb: &mut Framebuffer3D,
    mesh: &crate::mesh::Mesh,
    model_matrix: &Mat4,
    vp_matrix: &Mat4,
    material: &Material,
    lights: &[Light],
    camera_pos: Vec3,
) {
    // Normal matrix = transpose(inverse(model))
    let normal_matrix = model_matrix.inverse().transpose();

    for i in (0..mesh.indices.len()).step_by(3) {
        if i + 2 >= mesh.indices.len() { break; }

        let i0 = mesh.indices[i] as usize;
        let i1 = mesh.indices[i + 1] as usize;
        let i2 = mesh.indices[i + 2] as usize;

        if i0 >= mesh.vertices.len() || i1 >= mesh.vertices.len() || i2 >= mesh.vertices.len() {
            continue;
        }

        rasterize_triangle(
            fb,
            &mesh.vertices[i0],
            &mesh.vertices[i1],
            &mesh.vertices[i2],
            model_matrix,
            vp_matrix,
            &normal_matrix,
            material,
            lights,
            camera_pos,
        );
    }
}
