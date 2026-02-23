//! 3D math utilities — matrices, transforms, projections

use glam::{Vec3, Vec4, Mat4};

/// Create a perspective projection matrix.
pub fn perspective(fov_y_radians: f32, aspect: f32, near: f32, far: f32) -> Mat4 {
    Mat4::perspective_rh(fov_y_radians, aspect, near, far)
}

/// Create a look-at view matrix.
pub fn look_at(eye: Vec3, target: Vec3, up: Vec3) -> Mat4 {
    Mat4::look_at_rh(eye, target, up)
}

/// Transform a Vec3 by a Mat4, returning projected screen coords + depth.
pub fn transform_point(mvp: &Mat4, point: Vec3) -> Vec4 {
    *mvp * Vec4::new(point.x, point.y, point.z, 1.0)
}

/// Perspective divide: clip space → NDC.
pub fn perspective_divide(clip: Vec4) -> Vec3 {
    if clip.w.abs() < 1e-6 {
        return Vec3::ZERO;
    }
    Vec3::new(clip.x / clip.w, clip.y / clip.w, clip.z / clip.w)
}

/// NDC → screen coordinates.
pub fn ndc_to_screen(ndc: Vec3, width: f32, height: f32) -> Vec3 {
    Vec3::new(
        (ndc.x + 1.0) * 0.5 * width,
        (1.0 - ndc.y) * 0.5 * height, // Flip Y
        ndc.z, // Depth
    )
}

/// Compute face normal from triangle vertices (counter-clockwise winding).
pub fn triangle_normal(v0: Vec3, v1: Vec3, v2: Vec3) -> Vec3 {
    let edge1 = v1 - v0;
    let edge2 = v2 - v0;
    edge1.cross(edge2).normalize()
}

/// Reflect a vector around a normal.
pub fn reflect(incident: Vec3, normal: Vec3) -> Vec3 {
    incident - 2.0 * incident.dot(normal) * normal
}

/// Barycentric coordinates for point P in triangle (A, B, C).
/// Returns (u, v, w) where P = u*A + v*B + w*C.
pub fn barycentric(p: glam::Vec2, a: glam::Vec2, b: glam::Vec2, c: glam::Vec2) -> (f32, f32, f32) {
    let v0 = c - a;
    let v1 = b - a;
    let v2 = p - a;

    let dot00 = v0.dot(v0);
    let dot01 = v0.dot(v1);
    let dot02 = v0.dot(v2);
    let dot11 = v1.dot(v1);
    let dot12 = v1.dot(v2);

    let inv_denom = 1.0 / (dot00 * dot11 - dot01 * dot01);
    let u = (dot11 * dot02 - dot01 * dot12) * inv_denom;
    let v = (dot00 * dot12 - dot01 * dot02) * inv_denom;
    let w = 1.0 - u - v;

    (w, v, u)
}
