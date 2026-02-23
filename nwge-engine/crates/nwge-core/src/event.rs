//! Event bus — typed pub/sub for decoupled communication.
//!
//! AI defines events in YAML, engine dispatches them.
//! Example: `on_event: { type: "item_pickup", item: "turnip", run: "add_inventory" }`

use std::any::{Any, TypeId};
use std::collections::HashMap;

type Callback = Box<dyn Fn(&dyn Any) + Send + Sync>;

/// A simple typed event bus.
/// Systems can emit events, other systems can subscribe.
pub struct EventBus {
    listeners: HashMap<TypeId, Vec<Callback>>,
    /// String-keyed events for AI-generated game logic.
    /// These don't need Rust types — AI defines event names as strings.
    string_listeners: HashMap<String, Vec<Box<dyn Fn(&serde_json::Value) + Send + Sync>>>,
}

impl EventBus {
    pub fn new() -> Self {
        Self {
            listeners: HashMap::new(),
            string_listeners: HashMap::new(),
        }
    }

    /// Subscribe to a typed event (for engine-internal use).
    pub fn on<E: 'static>(&mut self, callback: impl Fn(&E) + Send + Sync + 'static) {
        let type_id = TypeId::of::<E>();
        let wrapped = Box::new(move |event: &dyn Any| {
            if let Some(e) = event.downcast_ref::<E>() {
                callback(e);
            }
        });
        self.listeners.entry(type_id).or_default().push(wrapped);
    }

    /// Emit a typed event.
    pub fn emit<E: 'static>(&self, event: &E) {
        let type_id = TypeId::of::<E>();
        if let Some(listeners) = self.listeners.get(&type_id) {
            for listener in listeners {
                listener(event as &dyn Any);
            }
        }
    }

    /// Subscribe to a string-named event (for AI-generated logic).
    /// This is the primary way AI connects game events.
    ///
    /// Cost efficiency: AI writes `on: "crop_harvested"` instead of
    /// defining Rust event types. ~5 tokens vs ~50 tokens.
    pub fn on_named(&mut self, name: &str, callback: impl Fn(&serde_json::Value) + Send + Sync + 'static) {
        self.string_listeners
            .entry(name.to_string())
            .or_default()
            .push(Box::new(callback));
    }

    /// Emit a string-named event with JSON payload.
    pub fn emit_named(&self, name: &str, data: &serde_json::Value) {
        if let Some(listeners) = self.string_listeners.get(name) {
            for listener in listeners {
                listener(data);
            }
        }
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new()
    }
}

// ─── Common Engine Events ───────────────────────────────────────────

/// Entity was spawned
pub struct EntitySpawned {
    pub entity: hecs::Entity,
    pub name: Option<String>,
}

/// Entity was destroyed
pub struct EntityDestroyed {
    pub entity: hecs::Entity,
}

/// Collision between two entities
pub struct CollisionEvent {
    pub entity_a: hecs::Entity,
    pub entity_b: hecs::Entity,
    pub normal: glam::Vec2,
    pub depth: f32,
}

/// Scene transition requested
pub struct SceneChange {
    pub from: String,
    pub to: String,
}
