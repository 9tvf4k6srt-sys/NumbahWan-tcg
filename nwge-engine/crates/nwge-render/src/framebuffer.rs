//! # Framebuffer — The core rendering surface
//!
//! A 2D pixel buffer with drawing primitives.
//! This is the "canvas" that everything draws to.

use crate::color::Color;

/// A 2D RGBA pixel buffer.
pub struct Framebuffer {
    pub width: u32,
    pub height: u32,
    pub pixels: Vec<Color>,
}

impl Framebuffer {
    pub fn new(width: u32, height: u32) -> Self {
        let size = (width * height) as usize;
        Self {
            width,
            height,
            pixels: vec![Color::BLACK; size],
        }
    }

    /// Clear to a solid color.
    pub fn clear(&mut self, color: Color) {
        self.pixels.fill(color);
    }

    /// Get pixel at (x, y).
    pub fn get(&self, x: i32, y: i32) -> Color {
        if x < 0 || y < 0 || x >= self.width as i32 || y >= self.height as i32 {
            return Color::TRANSPARENT;
        }
        self.pixels[(y as u32 * self.width + x as u32) as usize]
    }

    /// Set pixel at (x, y) with alpha blending.
    pub fn set(&mut self, x: i32, y: i32, color: Color) {
        if x < 0 || y < 0 || x >= self.width as i32 || y >= self.height as i32 {
            return;
        }
        let idx = (y as u32 * self.width + x as u32) as usize;
        if color.a == 255 {
            self.pixels[idx] = color;
        } else if color.a > 0 {
            self.pixels[idx] = color.blend_over(self.pixels[idx]);
        }
    }

    /// Set pixel WITHOUT bounds checking (caller must ensure valid coords).
    #[inline(always)]
    pub unsafe fn set_unchecked(&mut self, x: u32, y: u32, color: Color) {
        let idx = (y * self.width + x) as usize;
        *self.pixels.get_unchecked_mut(idx) = color;
    }

    // ─── Drawing Primitives ──────────────────────────────────────

    /// Fill a rectangle.
    pub fn fill_rect(&mut self, x: i32, y: i32, w: i32, h: i32, color: Color) {
        if w <= 0 || h <= 0 { return; }
        let x0 = x.max(0);
        let y0 = y.max(0);
        let x1 = (x + w).min(self.width as i32);
        let y1 = (y + h).min(self.height as i32);
        if x0 >= x1 || y0 >= y1 { return; }

        if color.a == 255 {
            // Fast path: no blending needed
            for py in y0..y1 {
                let row_start = (py as u32 * self.width + x0 as u32) as usize;
                let row_end = (py as u32 * self.width + x1 as u32) as usize;
                self.pixels[row_start..row_end].fill(color);
            }
        } else {
            for py in y0..y1 {
                for px in x0..x1 {
                    self.set(px, py, color);
                }
            }
        }
    }

    /// Draw a rectangle outline.
    pub fn draw_rect(&mut self, x: i32, y: i32, w: i32, h: i32, color: Color) {
        self.fill_rect(x, y, w, 1, color);         // top
        self.fill_rect(x, y + h - 1, w, 1, color); // bottom
        self.fill_rect(x, y, 1, h, color);          // left
        self.fill_rect(x + w - 1, y, 1, h, color);  // right
    }

    /// Draw a filled circle.
    pub fn fill_circle(&mut self, cx: i32, cy: i32, radius: i32, color: Color) {
        let r2 = radius * radius;
        for dy in -radius..=radius {
            for dx in -radius..=radius {
                if dx * dx + dy * dy <= r2 {
                    self.set(cx + dx, cy + dy, color);
                }
            }
        }
    }

    /// Draw a line (Bresenham's algorithm).
    pub fn draw_line(&mut self, x0: i32, y0: i32, x1: i32, y1: i32, color: Color) {
        let dx = (x1 - x0).abs();
        let dy = -(y1 - y0).abs();
        let sx = if x0 < x1 { 1 } else { -1 };
        let sy = if y0 < y1 { 1 } else { -1 };
        let mut err = dx + dy;
        let mut x = x0;
        let mut y = y0;

        loop {
            self.set(x, y, color);
            if x == x1 && y == y1 { break; }
            let e2 = 2 * err;
            if e2 >= dy {
                err += dy;
                x += sx;
            }
            if e2 <= dx {
                err += dx;
                y += sy;
            }
        }
    }

    /// Blit a source framebuffer onto this one at (dx, dy).
    pub fn blit(&mut self, src: &Framebuffer, dx: i32, dy: i32) {
        for sy in 0..src.height as i32 {
            for sx in 0..src.width as i32 {
                let color = src.get(sx, sy);
                if color.a > 0 {
                    self.set(dx + sx, dy + sy, color);
                }
            }
        }
    }

    /// Blit a sub-region of a source framebuffer (for spritesheet extraction).
    pub fn blit_region(
        &mut self,
        src: &Framebuffer,
        src_x: i32, src_y: i32, src_w: i32, src_h: i32,
        dst_x: i32, dst_y: i32,
        flip_x: bool, flip_y: bool,
    ) {
        for sy in 0..src_h {
            for sx in 0..src_w {
                let read_x = src_x + if flip_x { src_w - 1 - sx } else { sx };
                let read_y = src_y + if flip_y { src_h - 1 - sy } else { sy };
                let color = src.get(read_x, read_y);
                if color.a > 0 {
                    self.set(dst_x + sx, dst_y + sy, color);
                }
            }
        }
    }

    /// Scale blit — draw src scaled by factor at (dx, dy).
    pub fn blit_scaled(&mut self, src: &Framebuffer, dx: i32, dy: i32, scale: u32) {
        for sy in 0..src.height as i32 {
            for sx in 0..src.width as i32 {
                let color = src.get(sx, sy);
                if color.a > 0 {
                    let bx = dx + sx * scale as i32;
                    let by = dy + sy * scale as i32;
                    self.fill_rect(bx, by, scale as i32, scale as i32, color);
                }
            }
        }
    }

    /// Convert to a flat u32 buffer (0xAARRGGBB) for softbuffer display.
    pub fn to_u32_buffer(&self) -> Vec<u32> {
        self.pixels.iter().map(|c| c.to_u32()).collect()
    }

    /// Save as PNG file.
    pub fn save_png(&self, path: &str) -> Result<(), String> {
        let mut img = image::RgbaImage::new(self.width, self.height);
        for y in 0..self.height {
            for x in 0..self.width {
                let c = self.pixels[(y * self.width + x) as usize];
                img.put_pixel(x, y, image::Rgba([c.r, c.g, c.b, c.a]));
            }
        }
        img.save(path).map_err(|e| e.to_string())
    }
}
