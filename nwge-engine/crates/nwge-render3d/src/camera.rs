//! 3D Camera — Perspective, orbit, and FPS modes

use glam::{Vec3, Mat4};

/// Camera projection + view.
#[derive(Debug, Clone)]
pub struct Camera3D {
    pub position: Vec3,
    pub target: Vec3,
    pub up: Vec3,
    pub fov: f32,        // Field of view in radians
    pub aspect: f32,
    pub near: f32,
    pub far: f32,
    // Orbit mode
    pub yaw: f32,
    pub pitch: f32,
    pub distance: f32,
}

impl Camera3D {
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            position: Vec3::new(0.0, 5.0, 10.0),
            target: Vec3::ZERO,
            up: Vec3::Y,
            fov: std::f32::consts::FRAC_PI_4, // 45 degrees
            aspect: width as f32 / height as f32,
            near: 0.1,
            far: 1000.0,
            yaw: 0.0,
            pitch: 0.3,
            distance: 10.0,
        }
    }

    /// Update camera position from orbit parameters.
    pub fn update_orbit(&mut self) {
        self.pitch = self.pitch.clamp(-1.4, 1.4);
        self.distance = self.distance.max(1.0);

        self.position = self.target + Vec3::new(
            self.distance * self.pitch.cos() * self.yaw.sin(),
            self.distance * self.pitch.sin(),
            self.distance * self.pitch.cos() * self.yaw.cos(),
        );
    }

    /// Get the view matrix.
    pub fn view_matrix(&self) -> Mat4 {
        Mat4::look_at_rh(self.position, self.target, self.up)
    }

    /// Get the projection matrix.
    pub fn projection_matrix(&self) -> Mat4 {
        Mat4::perspective_rh(self.fov, self.aspect, self.near, self.far)
    }

    /// Get combined view-projection matrix.
    pub fn view_projection(&self) -> Mat4 {
        self.projection_matrix() * self.view_matrix()
    }

    /// Get the camera's forward direction.
    pub fn forward(&self) -> Vec3 {
        (self.target - self.position).normalize()
    }
}
