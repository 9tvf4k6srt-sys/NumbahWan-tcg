//! Transform hierarchy — parent-child relationships for entities

use glam::Vec2;

/// Represents a parent relationship.
/// Note: hecs::Entity doesn't impl Serde, so these are runtime-only.
#[derive(Debug, Clone)]
pub struct Parent(pub hecs::Entity);

/// Represents children entities.
#[derive(Debug, Clone, Default)]
pub struct Children(pub Vec<hecs::Entity>);

/// Compute world position from local position + parent chain.
pub fn compute_world_position(
    world: &hecs::World,
    entity: hecs::Entity,
    local_pos: Vec2,
) -> Vec2 {
    if let Ok(parent) = world.get::<&Parent>(entity) {
        let parent_entity = parent.0;
        if let Ok(parent_transform) = world.get::<&super::ecs::Transform2D>(parent_entity) {
            let parent_world = compute_world_position(world, parent_entity, parent_transform.position);
            return parent_world + local_pos;
        }
    }
    local_pos
}
