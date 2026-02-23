//! # NWGE Physics — 2D collision detection & resolution
//!
//! Lightweight AABB physics suitable for top-down RPGs and platformers.
//! AI defines body types and collision layers in YAML; this module handles the rest.
//!
//! ## Cost for AI
//! ```yaml
//! body: dynamic      # 2 tokens
//! size: [14, 14]     # 4 tokens
//! tags: [solid]       # 3 tokens
//! ```

use glam::Vec2;
use std::collections::HashMap;

// ─── AABB ─────────────────────────────────────────────────────────

/// Axis-Aligned Bounding Box.
#[derive(Debug, Clone, Copy)]
pub struct AABB {
    pub min: Vec2,
    pub max: Vec2,
}

impl AABB {
    pub fn new(x: f32, y: f32, w: f32, h: f32) -> Self {
        Self {
            min: Vec2::new(x, y),
            max: Vec2::new(x + w, y + h),
        }
    }

    pub fn from_center(center: Vec2, half_size: Vec2) -> Self {
        Self {
            min: center - half_size,
            max: center + half_size,
        }
    }

    pub fn center(&self) -> Vec2 {
        (self.min + self.max) * 0.5
    }

    pub fn size(&self) -> Vec2 {
        self.max - self.min
    }

    pub fn half_size(&self) -> Vec2 {
        self.size() * 0.5
    }

    pub fn overlaps(&self, other: &AABB) -> bool {
        self.min.x < other.max.x
            && self.max.x > other.min.x
            && self.min.y < other.max.y
            && self.max.y > other.min.y
    }

    pub fn contains_point(&self, point: Vec2) -> bool {
        point.x >= self.min.x
            && point.x <= self.max.x
            && point.y >= self.min.y
            && point.y <= self.max.y
    }

    /// Minimum translation vector to push this AABB out of `other`.
    pub fn mtv(&self, other: &AABB) -> Option<Vec2> {
        if !self.overlaps(other) {
            return None;
        }

        let dx_right = other.max.x - self.min.x;
        let dx_left = self.max.x - other.min.x;
        let dy_down = other.max.y - self.min.y;
        let dy_up = self.max.y - other.min.y;

        let min_x = if dx_right < dx_left { dx_right } else { -dx_left };
        let min_y = if dy_down < dy_up { dy_down } else { -dy_up };

        if min_x.abs() < min_y.abs() {
            Some(Vec2::new(-min_x, 0.0))
        } else {
            Some(Vec2::new(0.0, -min_y))
        }
    }

    /// Expand AABB by a margin on all sides.
    pub fn expanded(&self, margin: f32) -> Self {
        Self {
            min: self.min - Vec2::splat(margin),
            max: self.max + Vec2::splat(margin),
        }
    }
}

// ─── Collision Body ──────────────────────────────────────────────

/// Physics body types (mirroring YAML body field).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BodyType {
    /// No physics processing
    None,
    /// Moves and responds to collisions
    Dynamic,
    /// Never moves, blocks dynamic bodies
    Static,
    /// Moves but not affected by collisions (triggers, platforms)
    Kinematic,
}

impl BodyType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "dynamic" => BodyType::Dynamic,
            "static" => BodyType::Static,
            "kinematic" => BodyType::Kinematic,
            _ => BodyType::None,
        }
    }
}

/// A collision body for an entity.
#[derive(Debug, Clone)]
pub struct CollisionBody {
    pub body_type: BodyType,
    pub half_size: Vec2,
    pub offset: Vec2, // Offset from entity position (for feet-based collision)
}

impl CollisionBody {
    pub fn new(body_type: BodyType, width: f32, height: f32) -> Self {
        Self {
            body_type,
            half_size: Vec2::new(width * 0.5, height * 0.5),
            offset: Vec2::ZERO,
        }
    }

    pub fn aabb_at(&self, position: Vec2) -> AABB {
        let center = position + self.offset;
        AABB::from_center(center, self.half_size)
    }
}

// ─── Collision Event ─────────────────────────────────────────────

/// A collision between two entities in a frame.
#[derive(Debug, Clone)]
pub struct CollisionEvent {
    pub entity_a: u64,
    pub entity_b: u64,
    pub mtv: Vec2,
    pub overlap: f32,
}

// ─── Tile Collision ──────────────────────────────────────────────

/// Check collision against solid tiles in a tilemap.
pub fn resolve_tile_collision(
    position: &mut Vec2,
    half_size: Vec2,
    tile_solids: &[bool],
    map_width: u32,
    map_height: u32,
    tile_size: f32,
) {
    let body = AABB::from_center(*position, half_size);

    // Check tiles the body overlaps
    let start_x = ((body.min.x / tile_size).floor() as i32).max(0) as u32;
    let start_y = ((body.min.y / tile_size).floor() as i32).max(0) as u32;
    let end_x = ((body.max.x / tile_size).ceil() as u32).min(map_width);
    let end_y = ((body.max.y / tile_size).ceil() as u32).min(map_height);

    for ty in start_y..end_y {
        for tx in start_x..end_x {
            let idx = (ty * map_width + tx) as usize;
            if idx < tile_solids.len() && tile_solids[idx] {
                let tile_aabb = AABB::new(
                    tx as f32 * tile_size,
                    ty as f32 * tile_size,
                    tile_size,
                    tile_size,
                );
                let body_current = AABB::from_center(*position, half_size);
                if let Some(mtv) = body_current.mtv(&tile_aabb) {
                    *position += mtv;
                }
            }
        }
    }
}

// ─── Spatial Hash for Broad-Phase ──────────────────────────────────

/// Simple spatial hash for broad-phase collision detection.
/// Divides the world into cells; only entities in the same cell are checked.
pub struct SpatialHash {
    cell_size: f32,
    cells: HashMap<(i32, i32), Vec<(u64, AABB)>>,
}

impl SpatialHash {
    pub fn new(cell_size: f32) -> Self {
        Self {
            cell_size,
            cells: HashMap::new(),
        }
    }

    pub fn clear(&mut self) {
        self.cells.clear();
    }

    pub fn insert(&mut self, id: u64, aabb: AABB) {
        let min_cx = (aabb.min.x / self.cell_size).floor() as i32;
        let min_cy = (aabb.min.y / self.cell_size).floor() as i32;
        let max_cx = (aabb.max.x / self.cell_size).floor() as i32;
        let max_cy = (aabb.max.y / self.cell_size).floor() as i32;

        for cy in min_cy..=max_cy {
            for cx in min_cx..=max_cx {
                self.cells.entry((cx, cy)).or_default().push((id, aabb));
            }
        }
    }

    /// Find all overlapping pairs.
    pub fn query_pairs(&self) -> Vec<(u64, u64, Vec2)> {
        let mut results = Vec::new();
        let mut seen = std::collections::HashSet::new();

        for cell in self.cells.values() {
            for i in 0..cell.len() {
                for j in (i + 1)..cell.len() {
                    let (id_a, aabb_a) = &cell[i];
                    let (id_b, aabb_b) = &cell[j];

                    let key = if *id_a < *id_b {
                        (*id_a, *id_b)
                    } else {
                        (*id_b, *id_a)
                    };

                    if seen.contains(&key) {
                        continue;
                    }

                    if let Some(mtv) = aabb_a.mtv(aabb_b) {
                        results.push((*id_a, *id_b, mtv));
                        seen.insert(key);
                    }
                }
            }
        }

        results
    }

    /// Query all entities overlapping with a point.
    pub fn query_point(&self, point: Vec2) -> Vec<u64> {
        let cx = (point.x / self.cell_size).floor() as i32;
        let cy = (point.y / self.cell_size).floor() as i32;

        self.cells.get(&(cx, cy))
            .map(|cell| {
                cell.iter()
                    .filter(|(_, aabb)| aabb.contains_point(point))
                    .map(|(id, _)| *id)
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Query all entities overlapping with an AABB.
    pub fn query_aabb(&self, query: &AABB) -> Vec<u64> {
        let mut results = Vec::new();
        let mut seen = std::collections::HashSet::new();

        let min_cx = (query.min.x / self.cell_size).floor() as i32;
        let min_cy = (query.min.y / self.cell_size).floor() as i32;
        let max_cx = (query.max.x / self.cell_size).floor() as i32;
        let max_cy = (query.max.y / self.cell_size).floor() as i32;

        for cy in min_cy..=max_cy {
            for cx in min_cx..=max_cx {
                if let Some(cell) = self.cells.get(&(cx, cy)) {
                    for (id, aabb) in cell {
                        if !seen.contains(id) && query.overlaps(aabb) {
                            results.push(*id);
                            seen.insert(*id);
                        }
                    }
                }
            }
        }

        results
    }
}

/// Raycast result.
#[derive(Debug, Clone)]
pub struct RayHit {
    pub entity_id: u64,
    pub point: Vec2,
    pub distance: f32,
}

/// Simple ray vs AABB intersection test.
pub fn ray_vs_aabb(origin: Vec2, dir: Vec2, aabb: &AABB) -> Option<f32> {
    let inv_dir = Vec2::new(1.0 / dir.x, 1.0 / dir.y);

    let t1 = (aabb.min.x - origin.x) * inv_dir.x;
    let t2 = (aabb.max.x - origin.x) * inv_dir.x;
    let t3 = (aabb.min.y - origin.y) * inv_dir.y;
    let t4 = (aabb.max.y - origin.y) * inv_dir.y;

    let tmin = t1.min(t2).max(t3.min(t4));
    let tmax = t1.max(t2).min(t3.max(t4));

    if tmax < 0.0 || tmin > tmax {
        None
    } else {
        Some(if tmin < 0.0 { tmax } else { tmin })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_aabb_overlap() {
        let a = AABB::new(0.0, 0.0, 10.0, 10.0);
        let b = AABB::new(5.0, 5.0, 10.0, 10.0);
        assert!(a.overlaps(&b));

        let c = AABB::new(20.0, 20.0, 10.0, 10.0);
        assert!(!a.overlaps(&c));
    }

    #[test]
    fn test_mtv() {
        let a = AABB::new(0.0, 0.0, 10.0, 10.0);
        let b = AABB::new(8.0, 0.0, 10.0, 10.0);
        let mtv = a.mtv(&b).unwrap();
        // MTV pushes a out of b, so the x displacement is non-zero
        assert!(mtv.x.abs() > 0.0);
        assert_eq!(mtv.y, 0.0); // No vertical overlap resolution needed
    }

    #[test]
    fn test_spatial_hash() {
        let mut hash = SpatialHash::new(32.0);
        hash.insert(1, AABB::new(0.0, 0.0, 16.0, 16.0));
        hash.insert(2, AABB::new(8.0, 8.0, 16.0, 16.0));
        hash.insert(3, AABB::new(100.0, 100.0, 16.0, 16.0));

        let pairs = hash.query_pairs();
        assert_eq!(pairs.len(), 1); // Only 1 and 2 overlap
    }

    #[test]
    fn test_point_in_aabb() {
        let a = AABB::new(10.0, 10.0, 20.0, 20.0);
        assert!(a.contains_point(Vec2::new(15.0, 15.0)));
        assert!(!a.contains_point(Vec2::new(5.0, 5.0)));
    }
}
