//! Time utilities — stopwatch, timers, scheduling

use serde::{Deserialize, Serialize};

/// A simple timer that counts down.
/// AI can create timers in YAML: `timer: { duration: 2.5, repeat: true }`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Timer {
    pub duration: f64,
    pub remaining: f64,
    pub repeat: bool,
    pub finished: bool,
    pub just_finished: bool,
}

impl Timer {
    pub fn new(duration: f64, repeat: bool) -> Self {
        Self {
            duration,
            remaining: duration,
            repeat,
            finished: false,
            just_finished: false,
        }
    }

    pub fn once(duration: f64) -> Self {
        Self::new(duration, false)
    }

    pub fn repeating(duration: f64) -> Self {
        Self::new(duration, true)
    }

    pub fn tick(&mut self, dt: f64) {
        self.just_finished = false;
        if self.finished && !self.repeat {
            return;
        }

        self.remaining -= dt;
        if self.remaining <= 0.0 {
            self.just_finished = true;
            if self.repeat {
                self.remaining += self.duration;
            } else {
                self.remaining = 0.0;
                self.finished = true;
            }
        }
    }

    pub fn reset(&mut self) {
        self.remaining = self.duration;
        self.finished = false;
        self.just_finished = false;
    }

    /// Progress from 0.0 (just started) to 1.0 (finished)
    pub fn progress(&self) -> f64 {
        1.0 - (self.remaining / self.duration).clamp(0.0, 1.0)
    }
}

/// A stopwatch that counts up.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Stopwatch {
    pub elapsed: f64,
    pub running: bool,
}

impl Stopwatch {
    pub fn new() -> Self {
        Self { elapsed: 0.0, running: false }
    }

    pub fn start(&mut self) {
        self.running = true;
    }

    pub fn stop(&mut self) {
        self.running = false;
    }

    pub fn reset(&mut self) {
        self.elapsed = 0.0;
    }

    pub fn tick(&mut self, dt: f64) {
        if self.running {
            self.elapsed += dt;
        }
    }
}
