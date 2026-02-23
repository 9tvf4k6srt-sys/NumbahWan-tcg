//! Color type — RGBA pixel operations

/// A 32-bit RGBA color.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: u8,
}

impl Color {
    pub const TRANSPARENT: Color = Color { r: 0, g: 0, b: 0, a: 0 };
    pub const BLACK: Color = Color { r: 0, g: 0, b: 0, a: 255 };
    pub const WHITE: Color = Color { r: 255, g: 255, b: 255, a: 255 };
    pub const RED: Color = Color { r: 255, g: 0, b: 0, a: 255 };
    pub const GREEN: Color = Color { r: 0, g: 200, b: 0, a: 255 };
    pub const BLUE: Color = Color { r: 0, g: 100, b: 255, a: 255 };
    pub const YELLOW: Color = Color { r: 255, g: 220, b: 0, a: 255 };
    pub const ORANGE: Color = Color { r: 255, g: 149, b: 0, a: 255 };
    pub const BROWN: Color = Color { r: 139, g: 90, b: 43, a: 255 };
    pub const DARK_GREEN: Color = Color { r: 34, g: 120, b: 34, a: 255 };
    pub const SKY_BLUE: Color = Color { r: 135, g: 206, b: 235, a: 255 };
    pub const DARK_BLUE: Color = Color { r: 20, g: 20, b: 60, a: 255 };
    pub const GRAY: Color = Color { r: 128, g: 128, b: 128, a: 255 };
    pub const DARK_GRAY: Color = Color { r: 64, g: 64, b: 64, a: 255 };
    pub const PINK: Color = Color { r: 255, g: 150, b: 180, a: 255 };

    pub const fn new(r: u8, g: u8, b: u8, a: u8) -> Self {
        Self { r, g, b, a }
    }

    pub const fn rgb(r: u8, g: u8, b: u8) -> Self {
        Self { r, g, b, a: 255 }
    }

    /// Pack into 0xAARRGGBB format (for softbuffer).
    pub const fn to_u32(self) -> u32 {
        (self.a as u32) << 24
            | (self.r as u32) << 16
            | (self.g as u32) << 8
            | (self.b as u32)
    }

    /// Unpack from 0xAARRGGBB.
    pub const fn from_u32(v: u32) -> Self {
        Self {
            a: (v >> 24) as u8,
            r: (v >> 16) as u8,
            g: (v >> 8) as u8,
            b: v as u8,
        }
    }

    /// Alpha-blend `self` over `dst`.
    pub fn blend_over(self, dst: Color) -> Color {
        if self.a == 255 {
            return self;
        }
        if self.a == 0 {
            return dst;
        }
        let sa = self.a as u16;
        let da = 255 - sa;
        Color {
            r: ((self.r as u16 * sa + dst.r as u16 * da) / 255) as u8,
            g: ((self.g as u16 * sa + dst.g as u16 * da) / 255) as u8,
            b: ((self.b as u16 * sa + dst.b as u16 * da) / 255) as u8,
            a: 255,
        }
    }

    /// Tint this color by multiplying with another.
    pub fn tint(self, t: Color) -> Color {
        Color {
            r: ((self.r as u16 * t.r as u16) / 255) as u8,
            g: ((self.g as u16 * t.g as u16) / 255) as u8,
            b: ((self.b as u16 * t.b as u16) / 255) as u8,
            a: ((self.a as u16 * t.a as u16) / 255) as u8,
        }
    }

    /// Lighten by amount (0-255)
    pub fn lighten(self, amount: u8) -> Color {
        Color {
            r: self.r.saturating_add(amount),
            g: self.g.saturating_add(amount),
            b: self.b.saturating_add(amount),
            a: self.a,
        }
    }

    /// Darken by amount (0-255)
    pub fn darken(self, amount: u8) -> Color {
        Color {
            r: self.r.saturating_sub(amount),
            g: self.g.saturating_sub(amount),
            b: self.b.saturating_sub(amount),
            a: self.a,
        }
    }
}

impl From<[f32; 4]> for Color {
    fn from(c: [f32; 4]) -> Self {
        Color::new(
            (c[0] * 255.0) as u8,
            (c[1] * 255.0) as u8,
            (c[2] * 255.0) as u8,
            (c[3] * 255.0) as u8,
        )
    }
}
