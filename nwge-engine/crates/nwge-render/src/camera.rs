//! Camera2D — viewport into the game world

use glam::Vec2;

/// A 2D camera that controls what portion of the world is visible.
pub struct Camera2D {
    /// Camera position (center of viewport)
    pub position: Vec2,
    /// Target position (for smooth follow)
    pub target: Vec2,
    /// Viewport size in pixels (matches internal resolution)
    pub viewport: Vec2,
    /// Zoom level (1.0 = normal)
    pub zoom: f32,
    /// Smoothing factor (0 = instant, 1 = no movement)
    pub smoothing: f32,
    /// Screen shake intensity
    pub shake_intensity: f32,
    /// Shake timer
    pub shake_timer: f32,
    /// Current shake offset
    pub shake_offset: Vec2,
}

impl Camera2D {
    pub fn new(viewport_w: f32, viewport_h: f32) -> Self {
        Self {
            position: Vec2::new(viewport_w / 2.0, viewport_h / 2.0),
            target: Vec2::new(viewport_w / 2.0, viewport_h / 2.0),
            viewport: Vec2::new(viewport_w, viewport_h),
            zoom: 1.0,
            smoothing: 0.1,
            shake_intensity: 0.0,
            shake_timer: 0.0,
            shake_offset: Vec2::ZERO,
        }
    }

    /// Set the camera to follow a position.
    pub fn follow(&mut self, world_pos: Vec2) {
        self.target = world_pos;
    }

    /// Update camera position with smoothing.
    pub fn update(&mut self, dt: f32) {
        // Smooth follow
        let diff = self.target - self.position;
        let factor = 1.0 - self.smoothing.powf(dt * 60.0);
        self.position += diff * factor;

        // Shake
        if self.shake_timer > 0.0 {
            self.shake_timer -= dt;
            let t = self.shake_timer.max(0.0);
            let intensity = self.shake_intensity * (t / 0.3).min(1.0);
            self.shake_offset = Vec2::new(
                (fastrand::f32() - 0.5) * intensity * 2.0,
                (fastrand::f32() - 0.5) * intensity * 2.0,
            );
        } else {
            self.shake_offset = Vec2::ZERO;
        }
    }

    /// Trigger screen shake.
    pub fn shake(&mut self, intensity: f32, duration: f32) {
        self.shake_intensity = intensity;
        self.shake_timer = duration;
    }

    /// Convert world position to screen position.
    pub fn world_to_screen(&self, world_pos: Vec2) -> Vec2 {
        let cam_pos = self.position + self.shake_offset;
        let half_vp = self.viewport / 2.0;
        (world_pos - cam_pos) * self.zoom + half_vp
    }

    /// Convert screen position to world position.
    pub fn screen_to_world(&self, screen_pos: Vec2) -> Vec2 {
        let cam_pos = self.position + self.shake_offset;
        let half_vp = self.viewport / 2.0;
        (screen_pos - half_vp) / self.zoom + cam_pos
    }

    /// Get the visible world bounds.
    pub fn visible_bounds(&self) -> (Vec2, Vec2) {
        let half = self.viewport / (2.0 * self.zoom);
        let min = self.position - half;
        let max = self.position + half;
        (min, max)
    }
}

impl Default for Camera2D {
    fn default() -> Self {
        Self::new(320.0, 240.0)
    }
}
