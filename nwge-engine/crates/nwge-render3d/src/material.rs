//! PBR-style materials for 3D objects

use glam::Vec3;

/// Material defines how a surface looks under lighting.
/// Based on metallic-roughness PBR workflow (same as glTF / Unreal / Unity).
#[derive(Debug, Clone)]
pub struct Material {
    /// Base color (albedo)
    pub base_color: Vec3,
    /// Alpha transparency (1.0 = opaque)
    pub alpha: f32,
    /// Metallic factor (0.0 = dielectric, 1.0 = metal)
    pub metallic: f32,
    /// Roughness (0.0 = mirror, 1.0 = fully rough)
    pub roughness: f32,
    /// Emissive color (self-illumination)
    pub emissive: Vec3,
    /// Ambient occlusion factor
    pub ao: f32,
    /// Normal map strength
    pub normal_strength: f32,
    /// Name
    pub name: String,
}

impl Material {
    pub fn new(name: &str) -> Self {
        Self {
            base_color: Vec3::new(0.8, 0.8, 0.8),
            alpha: 1.0,
            metallic: 0.0,
            roughness: 0.5,
            emissive: Vec3::ZERO,
            ao: 1.0,
            normal_strength: 1.0,
            name: name.to_string(),
        }
    }

    /// Preset: polished metal
    pub fn metal(color: Vec3) -> Self {
        Self {
            base_color: color,
            alpha: 1.0,
            metallic: 1.0,
            roughness: 0.2,
            emissive: Vec3::ZERO,
            ao: 1.0,
            normal_strength: 1.0,
            name: "metal".to_string(),
        }
    }

    /// Preset: rough stone/rock
    pub fn stone() -> Self {
        Self {
            base_color: Vec3::new(0.5, 0.5, 0.45),
            alpha: 1.0,
            metallic: 0.0,
            roughness: 0.9,
            emissive: Vec3::ZERO,
            ao: 0.8,
            normal_strength: 1.0,
            name: "stone".to_string(),
        }
    }

    /// Preset: grass/foliage
    pub fn grass() -> Self {
        Self {
            base_color: Vec3::new(0.2, 0.55, 0.15),
            alpha: 1.0,
            metallic: 0.0,
            roughness: 0.8,
            emissive: Vec3::ZERO,
            ao: 0.9,
            normal_strength: 0.5,
            name: "grass".to_string(),
        }
    }

    /// Preset: water
    pub fn water() -> Self {
        Self {
            base_color: Vec3::new(0.1, 0.3, 0.6),
            alpha: 0.7,
            metallic: 0.1,
            roughness: 0.1,
            emissive: Vec3::ZERO,
            ao: 1.0,
            normal_strength: 1.0,
            name: "water".to_string(),
        }
    }

    /// Preset: glowing/emissive
    pub fn emissive(color: Vec3, intensity: f32) -> Self {
        Self {
            base_color: color,
            alpha: 1.0,
            metallic: 0.0,
            roughness: 0.5,
            emissive: color * intensity,
            ao: 1.0,
            normal_strength: 0.0,
            name: "emissive".to_string(),
        }
    }

    /// Preset: wood
    pub fn wood() -> Self {
        Self {
            base_color: Vec3::new(0.55, 0.35, 0.15),
            alpha: 1.0,
            metallic: 0.0,
            roughness: 0.7,
            emissive: Vec3::ZERO,
            ao: 0.85,
            normal_strength: 0.8,
            name: "wood".to_string(),
        }
    }
}

impl Default for Material {
    fn default() -> Self {
        Self::new("default")
    }
}
