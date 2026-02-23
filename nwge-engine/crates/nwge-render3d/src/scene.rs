//! Scene3D — container for 3D scene objects, lights, and camera
//!
//! The scene graph is intentionally flat (no hierarchy) for simplicity.
//! Each object is a mesh + material + transform. The AI generates scenes
//! from YAML by populating this structure.

use glam::{Vec3, Mat4, Quat};
use crate::mesh::Mesh;
use crate::material::Material;
use crate::light::Light;
use crate::camera::Camera3D;

/// A single object in the scene.
#[derive(Clone)]
pub struct SceneObject {
    pub mesh: Mesh,
    pub material: Material,
    pub position: Vec3,
    pub rotation: Quat,
    pub scale: Vec3,
    pub name: String,
    pub visible: bool,
}

impl SceneObject {
    pub fn new(mesh: Mesh, material: Material) -> Self {
        let name = mesh.name.clone();
        Self {
            mesh,
            material,
            position: Vec3::ZERO,
            rotation: Quat::IDENTITY,
            scale: Vec3::ONE,
            name,
            visible: true,
        }
    }

    pub fn with_position(mut self, pos: Vec3) -> Self {
        self.position = pos;
        self
    }

    pub fn with_rotation(mut self, rot: Quat) -> Self {
        self.rotation = rot;
        self
    }

    pub fn with_scale(mut self, s: Vec3) -> Self {
        self.scale = s;
        self
    }

    pub fn with_uniform_scale(mut self, s: f32) -> Self {
        self.scale = Vec3::splat(s);
        self
    }

    pub fn with_name(mut self, name: &str) -> Self {
        self.name = name.to_string();
        self
    }

    /// Compute the model matrix (TRS order: scale, then rotate, then translate).
    pub fn model_matrix(&self) -> Mat4 {
        Mat4::from_scale_rotation_translation(self.scale, self.rotation, self.position)
    }
}

/// A complete 3D scene.
pub struct Scene3D {
    pub objects: Vec<SceneObject>,
    pub lights: Vec<Light>,
    pub camera: Camera3D,
    pub sky_color: Vec3,
    pub fog_color: Vec3,
    pub fog_start: f32,
    pub fog_end: f32,
    pub fog_enabled: bool,
    pub ambient_intensity: f32,
    pub name: String,
}

impl Scene3D {
    pub fn new(name: &str, width: u32, height: u32) -> Self {
        Self {
            objects: Vec::new(),
            lights: Vec::new(),
            camera: Camera3D::new(width, height),
            sky_color: Vec3::new(0.4, 0.6, 0.9),   // Sky blue
            fog_color: Vec3::new(0.5, 0.6, 0.8),
            fog_start: 50.0,
            fog_end: 200.0,
            fog_enabled: true,
            ambient_intensity: 0.15,
            name: name.to_string(),
        }
    }

    pub fn add_object(&mut self, obj: SceneObject) {
        self.objects.push(obj);
    }

    pub fn add_light(&mut self, light: Light) {
        self.lights.push(light);
    }

    /// Get total triangle count across all objects.
    pub fn triangle_count(&self) -> usize {
        self.objects.iter().map(|o| o.mesh.triangle_count()).sum()
    }

    /// Get total vertex count across all objects.
    pub fn vertex_count(&self) -> usize {
        self.objects.iter().map(|o| o.mesh.vertices.len()).sum()
    }

    // ─── Demo Scene Builders ──────────────────────────────────────

    /// Create a dramatic terrain scene with mountains, trees, and water.
    pub fn demo_landscape(width: u32, height: u32) -> Self {
        let mut scene = Scene3D::new("Landscape Demo", width, height);

        // Camera — elevated view to see the full landscape
        scene.camera.target = Vec3::new(0.0, 3.0, 0.0);
        scene.camera.distance = 40.0;
        scene.camera.pitch = 0.55;
        scene.camera.yaw = 0.6;
        scene.camera.fov = std::f32::consts::FRAC_PI_3; // 60 degrees for wider view
        scene.camera.update_orbit();

        // Lights
        scene.add_light(Light::sun(Vec3::new(-0.4, -0.7, -0.6), 1.3));
        scene.add_light(Light::ambient(0.2));
        scene.add_light(Light::point(Vec3::new(5.0, 8.0, 3.0), Vec3::new(1.0, 0.9, 0.7), 2.0, 25.0));

        // Terrain
        let terrain = Mesh::terrain(80.0, 80, 8.0, 42);
        scene.add_object(SceneObject::new(terrain, Material::grass())
            .with_name("terrain"));

        // Water plane (slightly below terrain)
        let water = Mesh::plane(80.0, 4);
        scene.add_object(SceneObject::new(water, Material::water())
            .with_position(Vec3::new(0.0, 0.8, 0.0))
            .with_name("water"));

        // Scattered trees (cylinders for trunks, spheres for canopy)
        let tree_positions = [
            Vec3::new(-8.0, 0.0, -5.0),
            Vec3::new(-3.0, 0.0, -10.0),
            Vec3::new(5.0, 0.0, -8.0),
            Vec3::new(12.0, 0.0, -3.0),
            Vec3::new(-12.0, 0.0, 3.0),
            Vec3::new(8.0, 0.0, 5.0),
            Vec3::new(-6.0, 0.0, 10.0),
            Vec3::new(15.0, 0.0, -12.0),
        ];

        for (i, &pos) in tree_positions.iter().enumerate() {
            // Compute terrain height at tree position
            let h = crate::mesh::height_at(pos.x, pos.z, 42, 8.0);

            // Skip trees in water
            if h < 1.5 { continue; }

            // Trunk
            let trunk = Mesh::cylinder(0.15, 2.0, 8);
            scene.add_object(SceneObject::new(trunk, Material::wood())
                .with_position(Vec3::new(pos.x, h + 1.0, pos.z))
                .with_name(&format!("tree_trunk_{}", i)));

            // Canopy
            let canopy = Mesh::sphere(1.2, 12, 8);
            let canopy_mat = Material {
                base_color: Vec3::new(0.15, 0.45 + fastrand::f32() * 0.15, 0.1),
                roughness: 0.9,
                ..Material::grass()
            };
            scene.add_object(SceneObject::new(canopy, canopy_mat)
                .with_position(Vec3::new(pos.x, h + 2.5, pos.z))
                .with_name(&format!("tree_canopy_{}", i)));
        }

        // Rocks
        let rock_positions = [
            Vec3::new(3.0, 0.0, 2.0),
            Vec3::new(-5.0, 0.0, -2.0),
            Vec3::new(10.0, 0.0, -7.0),
        ];

        for (i, &pos) in rock_positions.iter().enumerate() {
            let h = crate::mesh::height_at(pos.x, pos.z, 42, 8.0);
            if h < 1.0 { continue; }
            let rock = Mesh::sphere(0.6 + fastrand::f32() * 0.4, 8, 6);
            scene.add_object(SceneObject::new(rock, Material::stone())
                .with_position(Vec3::new(pos.x, h + 0.3, pos.z))
                .with_scale(Vec3::new(1.0, 0.6, 1.0))
                .with_name(&format!("rock_{}", i)));
        }

        // Glowing crystal (emissive object)
        let crystal = Mesh::sphere(0.5, 10, 8);
        let crystal_h = crate::mesh::height_at(0.0, 0.0, 42, 8.0);
        scene.add_object(SceneObject::new(crystal, Material::emissive(Vec3::new(0.2, 0.5, 1.0), 3.0))
            .with_position(Vec3::new(0.0, crystal_h + 1.5, 0.0))
            .with_name("crystal"));

        // Metal sphere showcase
        let metal_sphere = Mesh::sphere(0.8, 16, 12);
        let metal_h = crate::mesh::height_at(-2.0, 5.0, 42, 8.0);
        scene.add_object(SceneObject::new(metal_sphere, Material::metal(Vec3::new(0.9, 0.7, 0.2)))
            .with_position(Vec3::new(-2.0, metal_h + 1.0, 5.0))
            .with_name("gold_sphere"));

        scene.fog_enabled = true;
        scene.fog_start = 35.0;
        scene.fog_end = 80.0;

        scene
    }

    /// Create a material showcase scene.
    pub fn demo_materials(width: u32, height: u32) -> Self {
        let mut scene = Scene3D::new("Material Showcase", width, height);

        scene.camera.target = Vec3::new(0.0, 1.2, -1.0);
        scene.camera.distance = 14.0;
        scene.camera.pitch = 0.3;
        scene.camera.yaw = 0.0;
        scene.camera.update_orbit();

        scene.add_light(Light::sun(Vec3::new(-0.5, -0.8, -0.3), 1.5));
        scene.add_light(Light::ambient(0.2));
        scene.add_light(Light::point(Vec3::new(3.0, 5.0, 2.0), Vec3::new(0.3, 0.5, 1.0), 3.0, 15.0));
        scene.add_light(Light::point(Vec3::new(-3.0, 3.0, 4.0), Vec3::new(1.0, 0.5, 0.2), 2.0, 12.0));

        // Floor
        let floor = Mesh::plane(20.0, 8);
        scene.add_object(SceneObject::new(floor, Material::stone())
            .with_name("floor"));

        // Material spheres in a row
        let materials: Vec<(&str, Material)> = vec![
            ("Rough Stone", Material::stone()),
            ("Polished Gold", Material::metal(Vec3::new(1.0, 0.84, 0.0))),
            ("Chrome", Material::metal(Vec3::new(0.8, 0.8, 0.8))),
            ("Copper", Material::metal(Vec3::new(0.72, 0.45, 0.2))),
            ("Plastic Red", Material {
                base_color: Vec3::new(0.8, 0.1, 0.1),
                metallic: 0.0,
                roughness: 0.3,
                ..Material::new("plastic")
            }),
            ("Glass-like", Material {
                base_color: Vec3::new(0.9, 0.95, 1.0),
                metallic: 0.1,
                roughness: 0.05,
                alpha: 0.5,
                ..Material::new("glass")
            }),
            ("Emissive Blue", Material::emissive(Vec3::new(0.2, 0.4, 1.0), 2.0)),
        ];

        let total = materials.len();
        let spacing = 2.5;
        let start_x = -((total as f32 - 1.0) * spacing) * 0.5;

        for (i, (name, mat)) in materials.into_iter().enumerate() {
            let sphere = Mesh::sphere(0.8, 20, 14);
            let x = start_x + i as f32 * spacing;
            scene.add_object(SceneObject::new(sphere, mat)
                .with_position(Vec3::new(x, 1.5, 0.0))
                .with_name(name));
        }

        // Cubes behind the spheres
        for i in 0..5 {
            let cube = Mesh::cube(1.5);
            let x = -5.0 + i as f32 * 2.5;
            let mat = Material {
                base_color: Vec3::new(
                    0.3 + (i as f32 * 0.15),
                    0.5 - (i as f32 * 0.05),
                    0.2 + (i as f32 * 0.1),
                ),
                roughness: 0.1 + i as f32 * 0.2,
                metallic: if i % 2 == 0 { 0.8 } else { 0.0 },
                ..Material::new(&format!("cube_mat_{}", i))
            };
            scene.add_object(SceneObject::new(cube, mat)
                .with_position(Vec3::new(x, 0.75, -4.0))
                .with_name(&format!("cube_{}", i)));
        }

        scene.fog_enabled = false;
        scene
    }

    /// Create a sunset scene with dramatic lighting.
    pub fn demo_sunset(width: u32, height: u32) -> Self {
        let mut scene = Scene3D::new("Sunset Scene", width, height);

        scene.camera.target = Vec3::new(0.0, 2.0, -3.0);
        scene.camera.distance = 30.0;
        scene.camera.pitch = 0.35;
        scene.camera.yaw = 0.4;
        scene.camera.fov = std::f32::consts::FRAC_PI_3;
        scene.camera.update_orbit();

        scene.sky_color = Vec3::new(0.7, 0.3, 0.15);

        scene.add_light(Light::sunset_sun());
        scene.add_light(Light::Ambient {
            color: Vec3::new(0.4, 0.25, 0.15),
            intensity: 0.3,
        });

        // Terrain
        let terrain = Mesh::terrain(60.0, 60, 5.0, 7);
        scene.add_object(SceneObject::new(terrain, Material {
            base_color: Vec3::new(0.3, 0.35, 0.15),
            roughness: 0.85,
            ..Material::grass()
        }).with_name("terrain"));

        // Water (orange-tinted for sunset reflection)
        let water = Mesh::plane(60.0, 4);
        let sunset_water = Material {
            base_color: Vec3::new(0.2, 0.15, 0.3),
            metallic: 0.2,
            roughness: 0.05,
            ..Material::water()
        };
        scene.add_object(SceneObject::new(water, sunset_water)
            .with_position(Vec3::new(0.0, 0.5, 0.0))
            .with_name("water"));

        // Silhouette trees
        for i in 0..6 {
            let angle = i as f32 * 1.1;
            let r = 8.0 + fastrand::f32() * 5.0;
            let x = angle.cos() * r;
            let z = angle.sin() * r - 5.0;
            let h = crate::mesh::height_at(x, z, 7, 5.0);
            if h < 1.0 { continue; }

            let trunk = Mesh::cylinder(0.12, 2.5, 6);
            scene.add_object(SceneObject::new(trunk, Material {
                base_color: Vec3::new(0.15, 0.1, 0.05),
                roughness: 0.9,
                ..Material::wood()
            }).with_position(Vec3::new(x, h + 1.25, z))
              .with_name(&format!("sunset_trunk_{}", i)));

            let canopy = Mesh::sphere(1.0, 10, 8);
            scene.add_object(SceneObject::new(canopy, Material {
                base_color: Vec3::new(0.1, 0.2, 0.05),
                roughness: 0.9,
                ..Material::grass()
            }).with_position(Vec3::new(x, h + 3.0, z))
              .with_name(&format!("sunset_canopy_{}", i)));
        }

        scene.fog_enabled = true;
        scene.fog_color = Vec3::new(0.6, 0.35, 0.2);
        scene.fog_start = 25.0;
        scene.fog_end = 55.0;

        scene
    }
}
