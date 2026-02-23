//! # NWGE Input — Unified input handling
//!
//! Abstracts keyboard, mouse, and gamepad into a simple API.
//! Supports both raw keys and semantic actions (move_up, interact, etc.)

use std::collections::{HashMap, HashSet};
use glam::Vec2;

/// Semantic input actions that games use.
/// AI defines key bindings in YAML, engine maps them here.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Action {
    MoveUp,
    MoveDown,
    MoveLeft,
    MoveRight,
    Interact,
    Attack,
    UseItem,
    OpenInventory,
    OpenMenu,
    Confirm,
    Cancel,
    NextItem,
    PrevItem,
    Sprint,
    Pause,
}

/// Key codes — simplified set covering keyboard essentials.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Key {
    Up, Down, Left, Right,
    W, A, S, D,
    Z, X, C, V,
    E, Q, R, F,
    Space, Enter, Escape, Tab, Shift, Ctrl,
    Num1, Num2, Num3, Num4, Num5, Num6, Num7, Num8, Num9, Num0,
}

/// Mouse button.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MouseButton {
    Left, Right, Middle,
}

/// The input state for one frame.
pub struct InputState {
    /// Keys currently held down.
    keys_down: HashSet<Key>,
    /// Keys that were just pressed this frame.
    keys_pressed: HashSet<Key>,
    /// Keys that were just released this frame.
    keys_released: HashSet<Key>,

    /// Mouse buttons currently held.
    mouse_down: HashSet<MouseButton>,
    /// Mouse buttons just pressed.
    mouse_pressed: HashSet<MouseButton>,

    /// Mouse position in screen coordinates.
    pub mouse_pos: Vec2,

    /// Key → Action mapping.
    bindings: HashMap<Key, Action>,
}

impl InputState {
    pub fn new() -> Self {
        let mut bindings = HashMap::new();
        // Default bindings
        bindings.insert(Key::Up, Action::MoveUp);
        bindings.insert(Key::Down, Action::MoveDown);
        bindings.insert(Key::Left, Action::MoveLeft);
        bindings.insert(Key::Right, Action::MoveRight);
        bindings.insert(Key::W, Action::MoveUp);
        bindings.insert(Key::S, Action::MoveDown);
        bindings.insert(Key::A, Action::MoveLeft);
        bindings.insert(Key::D, Action::MoveRight);
        bindings.insert(Key::Space, Action::Interact);
        bindings.insert(Key::Z, Action::Attack);
        bindings.insert(Key::X, Action::UseItem);
        bindings.insert(Key::E, Action::Interact);
        bindings.insert(Key::Tab, Action::OpenInventory);
        bindings.insert(Key::Escape, Action::OpenMenu);
        bindings.insert(Key::Enter, Action::Confirm);
        bindings.insert(Key::Shift, Action::Sprint);

        Self {
            keys_down: HashSet::new(),
            keys_pressed: HashSet::new(),
            keys_released: HashSet::new(),
            mouse_down: HashSet::new(),
            mouse_pressed: HashSet::new(),
            mouse_pos: Vec2::ZERO,
            bindings,
        }
    }

    /// Call at the start of each frame to clear per-frame state.
    pub fn begin_frame(&mut self) {
        self.keys_pressed.clear();
        self.keys_released.clear();
        self.mouse_pressed.clear();
    }

    /// Record a key press event.
    pub fn key_down(&mut self, key: Key) {
        if !self.keys_down.contains(&key) {
            self.keys_pressed.insert(key);
        }
        self.keys_down.insert(key);
    }

    /// Record a key release event.
    pub fn key_up(&mut self, key: Key) {
        self.keys_down.remove(&key);
        self.keys_released.insert(key);
    }

    /// Record a mouse button press.
    pub fn mouse_button_down(&mut self, button: MouseButton) {
        if !self.mouse_down.contains(&button) {
            self.mouse_pressed.insert(button);
        }
        self.mouse_down.insert(button);
    }

    /// Record a mouse button release.
    pub fn mouse_button_up(&mut self, button: MouseButton) {
        self.mouse_down.remove(&button);
    }

    // ─── Query API ──────────────────────────────────────────────

    /// Is a key currently held?
    pub fn is_key_down(&self, key: Key) -> bool {
        self.keys_down.contains(&key)
    }

    /// Was a key just pressed this frame?
    pub fn is_key_pressed(&self, key: Key) -> bool {
        self.keys_pressed.contains(&key)
    }

    /// Is an action active (any bound key held)?
    pub fn is_action_down(&self, action: Action) -> bool {
        self.bindings.iter().any(|(k, a)| *a == action && self.keys_down.contains(k))
    }

    /// Was an action just pressed this frame?
    pub fn is_action_pressed(&self, action: Action) -> bool {
        self.bindings.iter().any(|(k, a)| *a == action && self.keys_pressed.contains(k))
    }

    /// Get movement vector from directional input (normalized).
    pub fn movement_vector(&self) -> Vec2 {
        let mut v = Vec2::ZERO;
        if self.is_action_down(Action::MoveUp) { v.y -= 1.0; }
        if self.is_action_down(Action::MoveDown) { v.y += 1.0; }
        if self.is_action_down(Action::MoveLeft) { v.x -= 1.0; }
        if self.is_action_down(Action::MoveRight) { v.x += 1.0; }
        if v.length_squared() > 0.0 {
            v = v.normalize();
        }
        v
    }

    /// Is mouse button held?
    pub fn is_mouse_down(&self, button: MouseButton) -> bool {
        self.mouse_down.contains(&button)
    }

    /// Was mouse button just pressed?
    pub fn is_mouse_pressed(&self, button: MouseButton) -> bool {
        self.mouse_pressed.contains(&button)
    }
}

impl Default for InputState {
    fn default() -> Self {
        Self::new()
    }
}
