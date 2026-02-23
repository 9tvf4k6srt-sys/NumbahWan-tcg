//! Lighting system — directional, point, and ambient lights

use glam::Vec3;

/// Light types available in the engine.
#[derive(Debug, Clone)]
pub enum Light {
    /// Directional light (sun) — infinite distance, parallel rays
    Directional {
        direction: Vec3,
        color: Vec3,
        intensity: f32,
    },
    /// Point light — emits in all directions from a position
    Point {
        position: Vec3,
        color: Vec3,
        intensity: f32,
        radius: f32,
    },
    /// Ambient light — uniform illumination everywhere
    Ambient {
        color: Vec3,
        intensity: f32,
    },
}

impl Light {
    pub fn sun(direction: Vec3, intensity: f32) -> Self {
        Light::Directional {
            direction: direction.normalize(),
            color: Vec3::new(1.0, 0.95, 0.8),
            intensity,
        }
    }

    pub fn sunset_sun() -> Self {
        Light::Directional {
            direction: Vec3::new(-0.5, -0.3, -0.8).normalize(),
            color: Vec3::new(1.0, 0.6, 0.3),
            intensity: 1.2,
        }
    }

    pub fn point(position: Vec3, color: Vec3, intensity: f32, radius: f32) -> Self {
        Light::Point { position, color, intensity, radius }
    }

    pub fn ambient(intensity: f32) -> Self {
        Light::Ambient {
            color: Vec3::new(0.6, 0.7, 0.9),
            intensity,
        }
    }
}

/// Compute PBR-style lighting for a surface point.
/// Simplified Cook-Torrance BRDF for software rendering.
pub fn compute_pbr_lighting(
    position: Vec3,
    normal: Vec3,
    view_dir: Vec3,
    base_color: Vec3,
    metallic: f32,
    roughness: f32,
    ao: f32,
    lights: &[Light],
) -> Vec3 {
    let mut total = Vec3::ZERO;

    let f0 = Vec3::splat(0.04).lerp(base_color, metallic);

    for light in lights {
        match light {
            Light::Ambient { color, intensity } => {
                total += *color * *intensity * base_color * ao;
            }
            Light::Directional { direction, color, intensity } => {
                let light_dir = -*direction;
                let n_dot_l = normal.dot(light_dir).max(0.0);

                if n_dot_l > 0.0 {
                    // Diffuse (Lambertian)
                    let diffuse = base_color * (1.0 - metallic);

                    // Specular (Blinn-Phong approximation of Cook-Torrance)
                    let half_vec = (light_dir + view_dir).normalize();
                    let n_dot_h = normal.dot(half_vec).max(0.0);
                    let shininess = (2.0 / (roughness * roughness + 0.001)).max(1.0);
                    let spec_power = n_dot_h.powf(shininess);
                    let specular = f0 * spec_power;

                    total += (diffuse + specular) * *color * *intensity * n_dot_l;
                }
            }
            Light::Point { position: light_pos, color, intensity, radius } => {
                let to_light = *light_pos - position;
                let distance = to_light.length();

                if distance < *radius {
                    let light_dir = to_light / distance;
                    let n_dot_l = normal.dot(light_dir).max(0.0);

                    if n_dot_l > 0.0 {
                        // Attenuation (physically-based inverse square with radius falloff)
                        let attenuation = (1.0 - (distance / radius).powi(2)).max(0.0);
                        let attenuation = attenuation * attenuation;

                        let diffuse = base_color * (1.0 - metallic);

                        let half_vec = (light_dir + view_dir).normalize();
                        let n_dot_h = normal.dot(half_vec).max(0.0);
                        let shininess = (2.0 / (roughness * roughness + 0.001)).max(1.0);
                        let spec_power = n_dot_h.powf(shininess);
                        let specular = f0 * spec_power;

                        total += (diffuse + specular) * *color * *intensity * n_dot_l * attenuation;
                    }
                }
            }
        }
    }

    // Clamp to [0, HDR_MAX] — tone mapping happens later
    total.clamp(Vec3::ZERO, Vec3::splat(10.0))
}
