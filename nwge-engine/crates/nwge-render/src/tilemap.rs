//! Tilemap renderer — draws tile-based worlds

use crate::framebuffer::Framebuffer;
use crate::color::Color;
use crate::camera::Camera2D;
use glam::Vec2;

/// A tile in the map.
#[derive(Debug, Clone, Copy)]
pub struct Tile {
    pub tile_id: u16,
    pub solid: bool,
    pub color: Color,
}

impl Default for Tile {
    fn default() -> Self {
        Self {
            tile_id: 0,
            solid: false,
            color: Color::DARK_GREEN,
        }
    }
}

/// A simple tilemap with multiple layers.
pub struct TileMap {
    pub width: u32,
    pub height: u32,
    pub tile_size: u32,
    pub layers: Vec<Vec<Tile>>,
}

impl TileMap {
    pub fn new(width: u32, height: u32, tile_size: u32) -> Self {
        let size = (width * height) as usize;
        Self {
            width,
            height,
            tile_size,
            layers: vec![vec![Tile::default(); size]],
        }
    }

    /// Generate a simple procedural farm map.
    pub fn generate_farm(width: u32, height: u32, tile_size: u32) -> Self {
        let size = (width * height) as usize;
        let mut ground = vec![Tile::default(); size];

        for y in 0..height {
            for x in 0..width {
                let idx = (y * width + x) as usize;
                let r = fastrand::u8(..);

                // Grass variations
                if r < 200 {
                    ground[idx] = Tile {
                        tile_id: 0,
                        solid: false,
                        color: Color::rgb(
                            60 + fastrand::u8(..20),
                            140 + fastrand::u8(..40),
                            50 + fastrand::u8(..20),
                        ),
                    };
                } else if r < 230 {
                    // Darker grass patch
                    ground[idx] = Tile {
                        tile_id: 1,
                        solid: false,
                        color: Color::rgb(
                            40 + fastrand::u8(..15),
                            110 + fastrand::u8(..30),
                            35 + fastrand::u8(..15),
                        ),
                    };
                } else if r < 245 {
                    // Flower
                    ground[idx] = Tile {
                        tile_id: 2,
                        solid: false,
                        color: Color::rgb(
                            200 + fastrand::u8(..55),
                            180 + fastrand::u8(..55),
                            50 + fastrand::u8(..50),
                        ),
                    };
                } else {
                    // Small stone
                    ground[idx] = Tile {
                        tile_id: 3,
                        solid: false,
                        color: Color::rgb(
                            140 + fastrand::u8(..30),
                            130 + fastrand::u8(..30),
                            120 + fastrand::u8(..30),
                        ),
                    };
                }

                // Water on the right side
                if x > width - 6 && y > 5 && y < height - 5 {
                    ground[idx] = Tile {
                        tile_id: 10,
                        solid: true,
                        color: Color::rgb(
                            40 + fastrand::u8(..15),
                            100 + fastrand::u8(..30),
                            200 + fastrand::u8(..55),
                        ),
                    };
                }

                // Dirt path
                if (x >= 8 && x <= 10 && y >= 5 && y < height - 5) ||
                   (y >= 20 && y <= 22 && x >= 3 && x < width - 8) {
                    ground[idx] = Tile {
                        tile_id: 5,
                        solid: false,
                        color: Color::rgb(
                            160 + fastrand::u8(..20),
                            130 + fastrand::u8(..20),
                            90 + fastrand::u8(..15),
                        ),
                    };
                }

                // Fence around farm plot
                if ((x == 3 || x == 18) && y >= 5 && y <= 18) ||
                   ((y == 5 || y == 18) && x >= 3 && x <= 18) {
                    ground[idx] = Tile {
                        tile_id: 20,
                        solid: true,
                        color: Color::rgb(139, 90, 43),
                    };
                }

                // Tilled soil in farm plot
                if x > 3 && x < 18 && y > 5 && y < 18 {
                    ground[idx] = Tile {
                        tile_id: 6,
                        solid: false,
                        color: Color::rgb(
                            100 + fastrand::u8(..20),
                            70 + fastrand::u8(..15),
                            40 + fastrand::u8(..10),
                        ),
                    };
                }

                // Border walls
                if x == 0 || y == 0 || x == width - 1 || y == height - 1 {
                    ground[idx] = Tile {
                        tile_id: 30,
                        solid: true,
                        color: Color::rgb(60, 80, 60),
                    };
                }
            }
        }

        Self {
            width,
            height,
            tile_size,
            layers: vec![ground],
        }
    }

    /// Generate a town map with cobblestone streets and building footprints.
    pub fn generate_town(width: u32, height: u32, tile_size: u32) -> Self {
        let size = (width * height) as usize;
        let mut ground = vec![Tile::default(); size];

        for y in 0..height {
            for x in 0..width {
                let idx = (y * width + x) as usize;

                // Default: cobblestone
                ground[idx] = Tile {
                    tile_id: 0,
                    solid: false,
                    color: Color::rgb(
                        150 + fastrand::u8(..20),
                        140 + fastrand::u8(..20),
                        130 + fastrand::u8(..20),
                    ),
                };

                // Main road (horizontal)
                if y >= height / 2 - 2 && y <= height / 2 + 2 {
                    ground[idx] = Tile {
                        tile_id: 5,
                        solid: false,
                        color: Color::rgb(
                            120 + fastrand::u8(..15),
                            110 + fastrand::u8(..15),
                            100 + fastrand::u8(..15),
                        ),
                    };
                }

                // Cross road (vertical)
                if x >= width / 3 - 1 && x <= width / 3 + 1 {
                    ground[idx] = Tile {
                        tile_id: 5,
                        solid: false,
                        color: Color::rgb(
                            120 + fastrand::u8(..15),
                            110 + fastrand::u8(..15),
                            100 + fastrand::u8(..15),
                        ),
                    };
                }

                // Building footprints (shops, houses)
                // Shop area (top-left)
                if x >= 4 && x <= 12 && y >= 4 && y <= 10 {
                    ground[idx] = Tile {
                        tile_id: 20,
                        solid: true,
                        color: Color::rgb(80 + fastrand::u8(..10), 60, 50),
                    };
                }
                // House (top-right)
                if x >= width - 15 && x <= width - 6 && y >= 4 && y <= 10 {
                    ground[idx] = Tile {
                        tile_id: 21,
                        solid: true,
                        color: Color::rgb(100, 70 + fastrand::u8(..10), 60),
                    };
                }
                // Town square (center)
                if x >= width / 2 - 5 && x <= width / 2 + 5 && y >= height / 2 - 5 && y <= height / 2 + 5 {
                    ground[idx] = Tile {
                        tile_id: 6,
                        solid: false,
                        color: Color::rgb(
                            180 + fastrand::u8(..15),
                            170 + fastrand::u8(..15),
                            140 + fastrand::u8(..15),
                        ),
                    };
                }

                // Grass patches
                if (x < 3 || x > width - 3) && y > 3 && y < height - 3 {
                    ground[idx] = Tile {
                        tile_id: 1,
                        solid: false,
                        color: Color::rgb(60 + fastrand::u8(..20), 140 + fastrand::u8(..30), 50 + fastrand::u8(..15)),
                    };
                }

                // Border
                if x == 0 || y == 0 || x == width - 1 || y == height - 1 {
                    ground[idx] = Tile {
                        tile_id: 30,
                        solid: true,
                        color: Color::rgb(70, 70, 60),
                    };
                }
            }
        }

        Self { width, height, tile_size, layers: vec![ground] }
    }

    /// Generate a beach map with sand, water, and rocks.
    pub fn generate_beach(width: u32, height: u32, tile_size: u32) -> Self {
        let size = (width * height) as usize;
        let mut ground = vec![Tile::default(); size];

        for y in 0..height {
            for x in 0..width {
                let idx = (y * width + x) as usize;

                // Sand by default
                ground[idx] = Tile {
                    tile_id: 0,
                    solid: false,
                    color: Color::rgb(
                        220 + fastrand::u8(..30),
                        200 + fastrand::u8(..30),
                        150 + fastrand::u8(..30),
                    ),
                };

                // Water on right side (ocean)
                let water_start = width * 2 / 3;
                if x > water_start {
                    let depth = (x - water_start) as u8;
                    ground[idx] = Tile {
                        tile_id: 10,
                        solid: true,
                        color: Color::rgb(
                            (40_u8).saturating_sub(depth),
                            (140_u8).saturating_sub(depth * 2) + fastrand::u8(..15),
                            200 + fastrand::u8(..55),
                        ),
                    };
                }

                // Wet sand near water
                if x > water_start - 3 && x <= water_start {
                    ground[idx] = Tile {
                        tile_id: 7,
                        solid: false,
                        color: Color::rgb(
                            180 + fastrand::u8(..20),
                            170 + fastrand::u8(..20),
                            130 + fastrand::u8(..20),
                        ),
                    };
                }

                // Rocks scattered
                if fastrand::u8(..) > 250 && x < water_start - 3 {
                    ground[idx] = Tile {
                        tile_id: 3,
                        solid: true,
                        color: Color::rgb(
                            130 + fastrand::u8(..25),
                            120 + fastrand::u8(..25),
                            110 + fastrand::u8(..25),
                        ),
                    };
                }

                // Grass on left side
                if x < 5 {
                    ground[idx] = Tile {
                        tile_id: 1,
                        solid: false,
                        color: Color::rgb(60 + fastrand::u8(..20), 140 + fastrand::u8(..30), 50 + fastrand::u8(..15)),
                    };
                }

                // Border
                if x == 0 || y == 0 || x == width - 1 || y == height - 1 {
                    ground[idx] = Tile {
                        tile_id: 30,
                        solid: true,
                        color: Color::rgb(70, 70, 60),
                    };
                }
            }
        }

        Self { width, height, tile_size, layers: vec![ground] }
    }

    /// Draw the tilemap to a framebuffer with camera transform.
    pub fn draw(&self, fb: &mut Framebuffer, camera: &Camera2D) {
        let ts = self.tile_size as f32;

        for layer in &self.layers {
            // Calculate visible tile range
            let (cam_min, cam_max) = camera.visible_bounds();
            let start_x = ((cam_min.x / ts).floor() as i32).max(0) as u32;
            let start_y = ((cam_min.y / ts).floor() as i32).max(0) as u32;
            let end_x = ((cam_max.x / ts).ceil() as u32 + 1).min(self.width);
            let end_y = ((cam_max.y / ts).ceil() as u32 + 1).min(self.height);

            for y in start_y..end_y {
                for x in start_x..end_x {
                    let idx = (y * self.width + x) as usize;
                    let tile = &layer[idx];

                    let world_pos = Vec2::new(x as f32 * ts, y as f32 * ts);
                    let screen_pos = camera.world_to_screen(world_pos);

                    let sx = screen_pos.x as i32;
                    let sy = screen_pos.y as i32;
                    let size = (ts * camera.zoom) as i32;

                    fb.fill_rect(sx, sy, size, size, tile.color);
                }
            }
        }
    }
}
