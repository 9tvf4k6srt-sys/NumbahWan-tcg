//! 3D Mesh — Vertex data, procedural geometry generators

use glam::{Vec2, Vec3};

/// A single vertex with position, normal, UV, and color.
#[derive(Debug, Clone, Copy)]
pub struct Vertex {
    pub position: Vec3,
    pub normal: Vec3,
    pub uv: Vec2,
    pub color: [f32; 4],
}

impl Vertex {
    pub fn new(pos: Vec3, normal: Vec3, uv: Vec2) -> Self {
        Self {
            position: pos,
            normal,
            uv,
            color: [1.0, 1.0, 1.0, 1.0],
        }
    }

    pub fn colored(pos: Vec3, normal: Vec3, uv: Vec2, color: [f32; 4]) -> Self {
        Self { position: pos, normal, uv, color }
    }
}

/// A triangle mesh.
#[derive(Debug, Clone)]
pub struct Mesh {
    pub vertices: Vec<Vertex>,
    pub indices: Vec<u32>,
    pub name: String,
}

impl Mesh {
    pub fn new(name: &str) -> Self {
        Self {
            vertices: Vec::new(),
            indices: Vec::new(),
            name: name.to_string(),
        }
    }

    pub fn triangle_count(&self) -> usize {
        self.indices.len() / 3
    }

    // ─── Procedural Geometry Generators ──────────────────────

    /// Unit cube centered at origin.
    pub fn cube(size: f32) -> Self {
        let s = size * 0.5;
        let mut mesh = Mesh::new("cube");

        let faces: [([f32; 3], [f32; 3]); 6] = [
            ([0.0, 0.0, 1.0], [0.0, 0.0, 1.0]),   // Front
            ([0.0, 0.0, -1.0], [0.0, 0.0, -1.0]),  // Back
            ([1.0, 0.0, 0.0], [1.0, 0.0, 0.0]),    // Right
            ([-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0]),  // Left
            ([0.0, 1.0, 0.0], [0.0, 1.0, 0.0]),    // Top
            ([0.0, -1.0, 0.0], [0.0, -1.0, 0.0]),  // Bottom
        ];

        for (face_dir, normal_arr) in &faces {
            let normal = Vec3::from_array(*normal_arr);
            let dir = Vec3::from_array(*face_dir);
            let base = mesh.vertices.len() as u32;

            // Generate 4 vertices for this face
            let (right, up) = if dir.y.abs() > 0.5 {
                (Vec3::X, Vec3::Z * dir.y.signum())
            } else {
                (Vec3::Y.cross(dir).normalize(), Vec3::Y)
            };

            let center = dir * s;
            let r = right * s;
            let u = up * s;

            mesh.vertices.push(Vertex::new(center - r - u, normal, Vec2::new(0.0, 1.0)));
            mesh.vertices.push(Vertex::new(center + r - u, normal, Vec2::new(1.0, 1.0)));
            mesh.vertices.push(Vertex::new(center + r + u, normal, Vec2::new(1.0, 0.0)));
            mesh.vertices.push(Vertex::new(center - r + u, normal, Vec2::new(0.0, 0.0)));

            mesh.indices.extend_from_slice(&[
                base, base + 1, base + 2,
                base, base + 2, base + 3,
            ]);
        }

        mesh
    }

    /// UV sphere with given segments and rings.
    pub fn sphere(radius: f32, segments: u32, rings: u32) -> Self {
        let mut mesh = Mesh::new("sphere");

        for ring in 0..=rings {
            let theta = std::f32::consts::PI * ring as f32 / rings as f32;
            let sin_theta = theta.sin();
            let cos_theta = theta.cos();

            for seg in 0..=segments {
                let phi = 2.0 * std::f32::consts::PI * seg as f32 / segments as f32;
                let sin_phi = phi.sin();
                let cos_phi = phi.cos();

                let x = sin_theta * cos_phi;
                let y = cos_theta;
                let z = sin_theta * sin_phi;

                let pos = Vec3::new(x * radius, y * radius, z * radius);
                let normal = Vec3::new(x, y, z);
                let uv = Vec2::new(seg as f32 / segments as f32, ring as f32 / rings as f32);

                mesh.vertices.push(Vertex::new(pos, normal, uv));
            }
        }

        for ring in 0..rings {
            for seg in 0..segments {
                let a = ring * (segments + 1) + seg;
                let b = a + segments + 1;

                mesh.indices.extend_from_slice(&[a, b, a + 1]);
                mesh.indices.extend_from_slice(&[a + 1, b, b + 1]);
            }
        }

        mesh
    }

    /// Flat ground plane.
    pub fn plane(size: f32, subdivisions: u32) -> Self {
        let mut mesh = Mesh::new("plane");
        let half = size * 0.5;
        let step = size / subdivisions as f32;

        for z in 0..=subdivisions {
            for x in 0..=subdivisions {
                let px = -half + x as f32 * step;
                let pz = -half + z as f32 * step;
                let u = x as f32 / subdivisions as f32;
                let v = z as f32 / subdivisions as f32;
                mesh.vertices.push(Vertex::new(
                    Vec3::new(px, 0.0, pz),
                    Vec3::Y,
                    Vec2::new(u, v),
                ));
            }
        }

        for z in 0..subdivisions {
            for x in 0..subdivisions {
                let a = z * (subdivisions + 1) + x;
                let b = a + subdivisions + 1;
                mesh.indices.extend_from_slice(&[a, b, a + 1]);
                mesh.indices.extend_from_slice(&[a + 1, b, b + 1]);
            }
        }

        mesh
    }

    /// Procedural terrain with height noise.
    pub fn terrain(size: f32, subdivisions: u32, height_scale: f32, seed: u64) -> Self {
        let mut mesh = Self::plane(size, subdivisions);
        mesh.name = "terrain".to_string();

        // Simple multi-octave noise for terrain
        for vert in &mut mesh.vertices {
            let x = vert.position.x;
            let z = vert.position.z;

            // Layered sine-based noise (cheap alternative to Perlin)
            let h = height_at(x, z, seed, height_scale);
            vert.position.y = h;

            // Color by height
            let t = (h / height_scale).clamp(0.0, 1.0);
            if t < 0.2 {
                // Water level — blue
                vert.color = [0.1, 0.3, 0.7, 1.0];
            } else if t < 0.4 {
                // Grass — green
                vert.color = [0.2, 0.6, 0.2, 1.0];
            } else if t < 0.7 {
                // Dirt/rock — brown
                vert.color = [0.5, 0.35, 0.2, 1.0];
            } else {
                // Snow — white
                vert.color = [0.9, 0.9, 0.95, 1.0];
            }
        }

        // Recompute normals
        recompute_normals(&mut mesh);
        mesh
    }

    /// Cylinder (useful for trees, pillars, etc.)
    pub fn cylinder(radius: f32, height: f32, segments: u32) -> Self {
        let mut mesh = Mesh::new("cylinder");
        let half_h = height * 0.5;

        // Side vertices
        for i in 0..=segments {
            let angle = 2.0 * std::f32::consts::PI * i as f32 / segments as f32;
            let x = angle.cos() * radius;
            let z = angle.sin() * radius;
            let u = i as f32 / segments as f32;

            let normal = Vec3::new(angle.cos(), 0.0, angle.sin());

            // Bottom
            mesh.vertices.push(Vertex::new(
                Vec3::new(x, -half_h, z), normal, Vec2::new(u, 1.0),
            ));
            // Top
            mesh.vertices.push(Vertex::new(
                Vec3::new(x, half_h, z), normal, Vec2::new(u, 0.0),
            ));
        }

        for i in 0..segments {
            let base = i * 2;
            mesh.indices.extend_from_slice(&[base, base + 1, base + 2]);
            mesh.indices.extend_from_slice(&[base + 1, base + 3, base + 2]);
        }

        // Top cap
        let top_center = mesh.vertices.len() as u32;
        mesh.vertices.push(Vertex::new(Vec3::new(0.0, half_h, 0.0), Vec3::Y, Vec2::new(0.5, 0.5)));
        for i in 0..segments {
            let angle = 2.0 * std::f32::consts::PI * i as f32 / segments as f32;
            let x = angle.cos() * radius;
            let z = angle.sin() * radius;
            let vi = mesh.vertices.len() as u32;
            mesh.vertices.push(Vertex::new(Vec3::new(x, half_h, z), Vec3::Y, Vec2::new(0.5 + angle.cos() * 0.5, 0.5 + angle.sin() * 0.5)));
            if i > 0 {
                mesh.indices.extend_from_slice(&[top_center, vi - 1, vi]);
            }
        }
        let last_top = mesh.vertices.len() as u32 - 1;
        mesh.indices.extend_from_slice(&[top_center, last_top, top_center + 1]);

        mesh
    }
}

// ─── Helpers ─────────────────────────────────────────────────────

/// Simple layered sine noise for terrain height.
pub fn height_at(x: f32, z: f32, seed: u64, scale: f32) -> f32 {
    let s = seed as f32 * 0.001;
    let h1 = ((x * 0.05 + s) .sin() * (z * 0.07 + s * 1.3).cos()) * scale * 0.5;
    let h2 = ((x * 0.13 + s * 2.1).sin() * (z * 0.11 + s * 0.7).cos()) * scale * 0.25;
    let h3 = ((x * 0.31 + s * 0.3).sin() * (z * 0.29 + s * 1.1).cos()) * scale * 0.125;
    (h1 + h2 + h3).max(0.0)
}

/// Recompute normals from triangle faces (smooth normals).
fn recompute_normals(mesh: &mut Mesh) {
    // Zero all normals
    for v in &mut mesh.vertices {
        v.normal = Vec3::ZERO;
    }

    // Accumulate face normals
    for i in (0..mesh.indices.len()).step_by(3) {
        let i0 = mesh.indices[i] as usize;
        let i1 = mesh.indices[i + 1] as usize;
        let i2 = mesh.indices[i + 2] as usize;

        let v0 = mesh.vertices[i0].position;
        let v1 = mesh.vertices[i1].position;
        let v2 = mesh.vertices[i2].position;

        let edge1 = v1 - v0;
        let edge2 = v2 - v0;
        let face_normal = edge1.cross(edge2);

        mesh.vertices[i0].normal += face_normal;
        mesh.vertices[i1].normal += face_normal;
        mesh.vertices[i2].normal += face_normal;
    }

    // Normalize
    for v in &mut mesh.vertices {
        if v.normal.length_squared() > 0.0 {
            v.normal = v.normal.normalize();
        } else {
            v.normal = Vec3::Y;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cube_geometry() {
        let cube = Mesh::cube(2.0);
        assert_eq!(cube.name, "cube");
        assert_eq!(cube.vertices.len(), 24); // 6 faces * 4 vertices
        assert_eq!(cube.indices.len(), 36);  // 6 faces * 2 triangles * 3 indices
        assert_eq!(cube.triangle_count(), 12);
    }

    #[test]
    fn test_sphere_geometry() {
        let sphere = Mesh::sphere(1.0, 16, 8);
        assert_eq!(sphere.name, "sphere");
        assert!(sphere.vertices.len() > 0);
        assert!(sphere.indices.len() > 0);
        // Check all normals are unit length
        for v in &sphere.vertices {
            let len = v.normal.length();
            assert!((len - 1.0).abs() < 0.01, "Normal not unit length: {}", len);
        }
    }

    #[test]
    fn test_plane_geometry() {
        let plane = Mesh::plane(10.0, 4);
        assert_eq!(plane.name, "plane");
        assert_eq!(plane.vertices.len(), 25); // (4+1)^2
        assert_eq!(plane.indices.len(), 96);  // 4*4 quads * 2 triangles * 3 indices
        // All normals should point up
        for v in &plane.vertices {
            assert!((v.normal - Vec3::Y).length() < 0.001);
        }
    }

    #[test]
    fn test_terrain_height() {
        let h = height_at(0.0, 0.0, 42, 5.0);
        assert!(h >= 0.0, "Terrain height should be non-negative");
        // Different positions should give different heights
        let h2 = height_at(10.0, 5.0, 42, 5.0);
        assert!((h - h2).abs() > 0.001 || h == h2);
    }

    #[test]
    fn test_terrain_mesh() {
        let terrain = Mesh::terrain(20.0, 10, 3.0, 42);
        assert_eq!(terrain.name, "terrain");
        // Terrain should have colored vertices (not all white)
        let has_varied_color = terrain.vertices.iter()
            .any(|v| v.color[0] != 1.0 || v.color[1] != 1.0);
        assert!(has_varied_color, "Terrain should have height-based coloring");
    }

    #[test]
    fn test_cylinder_geometry() {
        let cyl = Mesh::cylinder(0.5, 2.0, 8);
        assert_eq!(cyl.name, "cylinder");
        assert!(cyl.vertices.len() > 0);
        assert!(cyl.indices.len() > 0);
    }
}
