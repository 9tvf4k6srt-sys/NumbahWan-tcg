//! Sprite sheets and sprite rendering

use crate::framebuffer::Framebuffer;
use crate::color::Color;
use std::collections::HashMap;

/// A loaded spritesheet — a grid of frames from an image file.
pub struct SpriteSheet {
    /// Raw pixel data
    pub pixels: Framebuffer,
    /// Frame width in pixels
    pub frame_w: u32,
    /// Frame height in pixels
    pub frame_h: u32,
    /// Number of columns
    pub cols: u32,
    /// Number of rows
    pub rows: u32,
    /// Named frames for animation references
    pub named_frames: HashMap<String, u32>,
}

impl SpriteSheet {
    /// Create from a framebuffer with uniform grid.
    pub fn from_framebuffer(pixels: Framebuffer, frame_w: u32, frame_h: u32) -> Self {
        let cols = pixels.width / frame_w;
        let rows = pixels.height / frame_h;
        Self {
            pixels,
            frame_w,
            frame_h,
            cols,
            rows,
            named_frames: HashMap::new(),
        }
    }

    /// Load from PNG file.
    pub fn load(path: &str, frame_w: u32, frame_h: u32) -> Result<Self, String> {
        let img = image::open(path).map_err(|e| format!("Failed to load {path}: {e}"))?;
        let rgba = img.to_rgba8();
        let (w, h) = rgba.dimensions();

        let mut fb = Framebuffer::new(w, h);
        for y in 0..h {
            for x in 0..w {
                let p = rgba.get_pixel(x, y);
                fb.set(x as i32, y as i32, Color::new(p[0], p[1], p[2], p[3]));
            }
        }

        Ok(Self::from_framebuffer(fb, frame_w, frame_h))
    }

    /// Get total number of frames.
    pub fn frame_count(&self) -> u32 {
        self.cols * self.rows
    }

    /// Draw a frame to the target framebuffer.
    pub fn draw_frame(
        &self,
        target: &mut Framebuffer,
        frame: u32,
        x: i32,
        y: i32,
        flip_x: bool,
        flip_y: bool,
    ) {
        let col = frame % self.cols;
        let row = frame / self.cols;
        let src_x = (col * self.frame_w) as i32;
        let src_y = (row * self.frame_h) as i32;

        target.blit_region(
            &self.pixels,
            src_x, src_y,
            self.frame_w as i32, self.frame_h as i32,
            x, y,
            flip_x, flip_y,
        );
    }

    /// Draw a named frame.
    pub fn draw_named(
        &self,
        target: &mut Framebuffer,
        name: &str,
        x: i32,
        y: i32,
        flip_x: bool,
    ) {
        if let Some(&frame) = self.named_frames.get(name) {
            self.draw_frame(target, frame, x, y, flip_x, false);
        }
    }
}

/// Manages multiple spritesheets.
pub struct SpriteRenderer {
    sheets: HashMap<String, SpriteSheet>,
}

impl SpriteRenderer {
    pub fn new() -> Self {
        Self {
            sheets: HashMap::new(),
        }
    }

    pub fn add_sheet(&mut self, name: &str, sheet: SpriteSheet) {
        self.sheets.insert(name.to_string(), sheet);
    }

    pub fn get_sheet(&self, name: &str) -> Option<&SpriteSheet> {
        self.sheets.get(name)
    }

    pub fn draw(
        &self,
        target: &mut Framebuffer,
        sheet_name: &str,
        frame: u32,
        x: i32,
        y: i32,
        flip_x: bool,
    ) {
        if let Some(sheet) = self.sheets.get(sheet_name) {
            sheet.draw_frame(target, frame, x, y, flip_x, false);
        }
    }
}

impl Default for SpriteRenderer {
    fn default() -> Self {
        Self::new()
    }
}

/// Generate a simple placeholder sprite as a colored rectangle with features.
/// This is used when no art assets exist — AI can describe what the sprite
/// should look like, and we generate colored placeholders.
pub fn generate_placeholder(w: u32, h: u32, base_color: Color, label: &str) -> Framebuffer {
    let mut fb = Framebuffer::new(w, h);

    // Fill with base color
    fb.fill_rect(0, 0, w as i32, h as i32, base_color);

    // Add outline
    fb.draw_rect(0, 0, w as i32, h as i32, base_color.darken(60));

    // Add simple features based on label
    match label {
        "player" | "farmer" => {
            // Head
            let head_color = Color::rgb(255, 220, 180);
            fb.fill_rect((w/4) as i32, 1, (w/2) as i32, (h/3) as i32, head_color);
            // Eyes
            fb.set((w/3) as i32, (h/6) as i32, Color::BLACK);
            fb.set((w*2/3) as i32, (h/6) as i32, Color::BLACK);
            // Body
            fb.fill_rect((w/4) as i32, (h/3) as i32, (w/2) as i32, (h/2) as i32, Color::BLUE);
            // Legs
            fb.fill_rect((w/4) as i32, (h*5/6) as i32, (w/5) as i32, (h/6) as i32, Color::rgb(80, 60, 40));
            fb.fill_rect((w*11/20) as i32, (h*5/6) as i32, (w/5) as i32, (h/6) as i32, Color::rgb(80, 60, 40));
        }
        "chicken" => {
            // White body
            fb.fill_circle((w/2) as i32, (h*3/5) as i32, (w/3) as i32, Color::WHITE);
            // Red comb
            fb.fill_rect((w/3) as i32, 0, (w/3) as i32, (h/5) as i32, Color::RED);
            // Eye
            fb.set((w*2/5) as i32, (h/3) as i32, Color::BLACK);
            // Beak
            fb.fill_rect((w/5) as i32, (h*2/5) as i32, (w/5) as i32, (h/8) as i32, Color::YELLOW);
        }
        "cat" => {
            // Body
            fb.fill_circle((w/2) as i32, (h*3/5) as i32, (w/3) as i32, Color::ORANGE);
            // Ears
            fb.fill_rect((w/5) as i32, 0, (w/5) as i32, (h/4) as i32, Color::ORANGE);
            fb.fill_rect((w*3/5) as i32, 0, (w/5) as i32, (h/4) as i32, Color::ORANGE);
            // Eyes
            fb.set((w/3) as i32, (h/3) as i32, Color::rgb(0, 200, 0));
            fb.set((w*2/3) as i32, (h/3) as i32, Color::rgb(0, 200, 0));
        }
        "npc" | "mayor" | "shopkeeper" => {
            // Head
            let head_color = Color::rgb(255, 220, 180);
            fb.fill_rect((w/4) as i32, 1, (w/2) as i32, (h/3) as i32, head_color);
            // Eyes
            fb.set((w/3) as i32, (h/6) as i32, Color::BLACK);
            fb.set((w*2/3) as i32, (h/6) as i32, Color::BLACK);
            // Different colored shirt
            fb.fill_rect((w/4) as i32, (h/3) as i32, (w/2) as i32, (h/2) as i32, Color::rgb(180, 50, 50));
        }
        "tree" => {
            // Trunk
            fb.fill_rect((w*2/5) as i32, (h/2) as i32, (w/5) as i32, (h/2) as i32, Color::BROWN);
            // Canopy
            fb.fill_circle((w/2) as i32, (h/3) as i32, (w*2/5) as i32, Color::DARK_GREEN);
        }
        "rock" => {
            fb.fill_circle((w/2) as i32, (h/2) as i32, (w*2/5) as i32, Color::GRAY);
            fb.fill_circle((w*2/5) as i32, (h*2/5) as i32, (w/5) as i32, Color::GRAY.lighten(30));
        }
        "shipping_bin" | "crate" | "chest" => {
            fb.fill_rect(1, (h/4) as i32, (w-2) as i32, (h*3/4) as i32, Color::BROWN);
            fb.draw_rect(1, (h/4) as i32, (w-2) as i32, (h*3/4) as i32, Color::BROWN.darken(40));
            // Lid
            fb.fill_rect(0, (h/6) as i32, w as i32, (h/5) as i32, Color::BROWN.lighten(20));
            // Handle
            fb.fill_rect((w*2/5) as i32, (h*3/7) as i32, (w/5) as i32, 2, Color::YELLOW);
        }
        _ => {
            // Generic: just the colored rectangle with a question mark pattern
            fb.set((w/2) as i32, (h/3) as i32, Color::WHITE);
            fb.fill_rect((w/3) as i32, (h/2) as i32, (w/3) as i32, 2, Color::WHITE);
            fb.set((w/2) as i32, (h*2/3) as i32, Color::WHITE);
        }
    }

    fb
}
