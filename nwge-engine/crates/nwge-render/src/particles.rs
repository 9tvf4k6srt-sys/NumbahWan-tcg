//! Simple particle system for visual effects

use crate::framebuffer::Framebuffer;
use crate::color::Color;
use crate::camera::Camera2D;
use glam::Vec2;

/// A single particle.
#[derive(Debug, Clone)]
pub struct Particle {
    pub position: Vec2,
    pub velocity: Vec2,
    pub color: Color,
    pub size: f32,
    pub life: f32,
    pub max_life: f32,
    pub gravity: f32,
}

/// Particle emitter and manager.
pub struct ParticleSystem {
    pub particles: Vec<Particle>,
    pub max_particles: usize,
}

impl ParticleSystem {
    pub fn new(max: usize) -> Self {
        Self {
            particles: Vec::with_capacity(max),
            max_particles: max,
        }
    }

    /// Emit particles at a position.
    pub fn emit(&mut self, pos: Vec2, count: usize, color: Color, speed: f32, life: f32, gravity: f32) {
        for _ in 0..count {
            if self.particles.len() >= self.max_particles {
                break;
            }
            let angle = fastrand::f32() * std::f32::consts::TAU;
            let spd = speed * (0.5 + fastrand::f32() * 0.5);
            self.particles.push(Particle {
                position: pos,
                velocity: Vec2::new(angle.cos() * spd, angle.sin() * spd),
                color,
                size: 1.0 + fastrand::f32() * 2.0,
                life: life * (0.5 + fastrand::f32() * 0.5),
                max_life: life,
                gravity,
            });
        }
    }

    /// Update all particles.
    pub fn update(&mut self, dt: f32) {
        self.particles.retain_mut(|p| {
            p.life -= dt;
            if p.life <= 0.0 {
                return false;
            }
            p.velocity.y += p.gravity * dt;
            p.position += p.velocity * dt;
            true
        });
    }

    /// Draw all particles.
    pub fn draw(&self, fb: &mut Framebuffer, camera: &Camera2D) {
        for p in &self.particles {
            let screen = camera.world_to_screen(p.position);
            let alpha = ((p.life / p.max_life) * 255.0) as u8;
            let color = Color::new(p.color.r, p.color.g, p.color.b, alpha);
            let size = p.size as i32;
            if size <= 1 {
                fb.set(screen.x as i32, screen.y as i32, color);
            } else {
                fb.fill_rect(
                    screen.x as i32 - size / 2,
                    screen.y as i32 - size / 2,
                    size, size, color,
                );
            }
        }
    }
}

impl Default for ParticleSystem {
    fn default() -> Self {
        Self::new(500)
    }
}
