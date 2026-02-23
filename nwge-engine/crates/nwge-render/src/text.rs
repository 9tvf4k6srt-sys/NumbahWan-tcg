//! Simple bitmap text rendering

use crate::framebuffer::Framebuffer;
use crate::color::Color;

/// Built-in 4x6 pixel font (ASCII 32-126).
/// Each character is a bitmask of 4 columns × 6 rows = 24 bits stored in a u32.
/// Bit layout: row0(4 bits) | row1(4 bits) | ... | row5(4 bits)
const FONT_4X6: [u32; 95] = [
    0x000000, // space
    0x4444_04, // !
    0xAA0000, // "
    0xAFAFA0, // #
    0x6C6C60, // $
    0xA24800, // %  (simplified)
    0x4A4A60, // &  (simplified)
    0x440000, // '
    0x248840, // (
    0x844820, // )
    0x0A4A00, // *
    0x04E400, // +
    0x000048, // ,
    0x00E000, // -
    0x000004, // .
    0x224880, // /
    0x6AAAC0, // 0
    0x4C4440, // 1
    0xC24860, // 2  (simplified)
    0xC2C2C0, // 3  (simplified)
    0xAAE220, // 4
    0xE8C2C0, // 5
    0x68EAE0, // 6  (simplified)
    0xE24880, // 7
    0xEAEAE0, // 8  (simplified)
    0xEAE2C0, // 9  (simplified)
    0x040400, // :
    0x040480, // ;
    0x248420, // <
    0x0E0E00, // =
    0x842480, // >
    0xE24040, // ?
    0xEAEAC0, // @  (simplified)
    0x4AEAA0, // A
    0xCACAC0, // B
    0x688860, // C  (simplified)
    0xCAAAAC, // D  (simplified)
    0xE8E8E0, // E
    0xE8C880, // F
    0x68AAE0, // G  (simplified)
    0xAAEAA0, // H
    0xE444E0, // I
    0x222A40, // J
    0xAACAA0, // K  (simplified)
    0x8888E0, // L
    0xAEAAA0, // M  (simplified)
    0xAEEEA0, // N  (simplified)
    0x4AAA40, // O
    0xCAC880, // P
    0x4AAE60, // Q  (simplified)
    0xCACAA0, // R  (simplified)
    0x684260, // S  (simplified)
    0xE44440, // T
    0xAAAA60, // U  (simplified)
    0xAAAA40, // V  (simplified)
    0xAAEEA0, // W  (simplified)
    0xA44A00, // X  (simplified)
    0xAA4440, // Y
    0xE248E0, // Z  (simplified)
    0x644460, // [
    0x884220, // backslash
    0xC44C00, // ]  (simplified)
    0x4A0000, // ^
    0x0000E0, // _  (simplified)
    0x840000, // `
    0x06AA60, // a
    0x8CAAC0, // b
    0x068860, // c  (simplified)
    0x26AA60, // d
    0x06E860, // e  (simplified)
    0x64E440, // f
    0x06A624, // g  (simplified — drops below)
    0x8CAAA0, // h
    0x404440, // i
    0x202224, // j  (simplified)
    0x8ACAA0, // k  (simplified)
    0xC44460, // l
    0x0AEAA0, // m  (simplified)
    0x0CAAA0, // n
    0x04AA40, // o
    0x0CAAC8, // p  (simplified)
    0x06AA62, // q  (simplified)
    0x068880, // r  (simplified)
    0x064260, // s  (simplified)
    0x4E4460, // t
    0x0AAA60, // u
    0x0AAA40, // v  (simplified)
    0x0AAEA0, // w  (simplified)
    0x0A44A0, // x
    0x0AA624, // y  (simplified)
    0x0E24E0, // z  (simplified)
    0x648460, // {
    0x444440, // |
    0xC24C00, // }  (simplified)
    0x06A000, // ~  (simplified)
];

/// Draw a single character at (x, y) using built-in 4x6 font.
pub fn draw_char(fb: &mut Framebuffer, ch: char, x: i32, y: i32, color: Color) {
    let idx = ch as u32;
    if idx < 32 || idx > 126 {
        return;
    }
    let glyph = FONT_4X6[(idx - 32) as usize];

    for row in 0..6 {
        let row_bits = (glyph >> (20 - row * 4)) & 0xF;
        for col in 0..4 {
            if row_bits & (1 << (3 - col)) != 0 {
                fb.set(x + col, y + row, color);
            }
        }
    }
}

/// Draw a string at (x, y). Returns the width drawn.
pub fn draw_text(fb: &mut Framebuffer, text: &str, x: i32, y: i32, color: Color) -> i32 {
    let mut cx = x;
    for ch in text.chars() {
        draw_char(fb, ch, cx, y, color);
        cx += 5; // 4 pixels + 1 spacing
    }
    cx - x
}

/// Draw text with a shadow for readability.
pub fn draw_text_shadow(fb: &mut Framebuffer, text: &str, x: i32, y: i32, color: Color, shadow: Color) {
    draw_text(fb, text, x + 1, y + 1, shadow);
    draw_text(fb, text, x, y, color);
}

/// Draw text centered horizontally.
pub fn draw_text_centered(fb: &mut Framebuffer, text: &str, y: i32, color: Color) {
    let text_width = text.len() as i32 * 5 - 1;
    let x = (fb.width as i32 - text_width) / 2;
    draw_text(fb, text, x, y, color);
}
