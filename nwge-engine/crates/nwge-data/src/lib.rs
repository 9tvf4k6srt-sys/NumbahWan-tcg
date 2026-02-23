//! # NWGE Data — AI-Native Game Definition Format
//!
//! This crate defines the YAML/JSON schema that AI generates to create games.
//!
//! ## Design Principles for AI Cost Efficiency
//!
//! 1. **Minimal tokens**: A crop definition is ~30 tokens, not 300
//! 2. **Smart defaults**: Omit anything that has a sensible default
//! 3. **Convention over configuration**: `sprite: "turnip"` auto-resolves to `sprites/turnip.png`
//! 4. **Composable**: Reference other definitions by name, not by ID
//! 5. **Flat hierarchy**: No deep nesting — AI makes fewer mistakes with flat structures
//!
//! ## Example: AI generates a complete farming game in ~2000 tokens
//! ```yaml
//! game:
//!   name: "Sunny Harvest"
//!   type: farming-rpg
//!   resolution: [320, 240]
//!   scale: 4
//!
//! entities:
//!   - name: player
//!     sprite: farmer
//!     position: [160, 120]
//!     speed: 80
//!     tags: [player]
//!     inventory: { slots: 24 }
//!
//! items:
//!   - name: turnip_seeds
//!     type: seed
//!     crop: turnip
//!     buy_price: 20
//!
//! crops:
//!   - name: turnip
//!     stages: 4
//!     growth_time: 3
//!     harvest_item: turnip
//!     sell_price: 60
//! ```

pub mod game_def;
pub mod entity_def;
pub mod item_def;
pub mod system_def;
pub mod scene_def;
pub mod loader;

pub use game_def::GameDefinition;
pub use entity_def::EntityDef;
pub use item_def::ItemDef;
pub use system_def::SystemDef;
pub use scene_def::SceneDef;
pub use loader::load_game;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_minimal_2d_game_parses() {
        let yaml = r#"
game:
  name: "Test Game"
  genre: rpg
entities:
  - name: hero
    tags: [player]
scenes:
  - name: main
"#;
        let def: GameDefinition = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(def.game.name, "Test Game");
        assert_eq!(def.game.render_mode, "2d"); // default
        assert_eq!(def.entities.len(), 1);
        assert_eq!(def.scenes.len(), 1);
    }

    #[test]
    fn test_3d_game_parses() {
        let yaml = r#"
game:
  name: "3D World"
  genre: 3d-exploration
  resolution: [1280, 720]
  render_mode: 3d

camera:
  type: orbit
  fov: 60
  distance: 15
  pitch: 0.4
  target: [0, 3, 0]

scene3d:
  sky_color: [0.4, 0.6, 0.9]
  fog:
    enabled: true
    color: [0.5, 0.6, 0.8]
    start: 40
    end: 100
  ambient_light: 0.2
  lights:
    - type: directional
      direction: [-0.4, -0.7, -0.5]
      color: [1, 0.95, 0.8]
      intensity: 1.3
    - type: point
      position: [0, 5, 0]
      color: [1, 0.8, 0.4]
      intensity: 3
      radius: 15
  terrain:
    size: 100
    subdivisions: 80
    height_scale: 10
    seed: 42
  water:
    enabled: true
    height: 1.0
  objects:
    - name: crystal
      mesh: sphere
      mesh_params: { radius: 0.5 }
      material: { emissive: [0.2, 0.5, 1.0], emissive_intensity: 3 }
      position: [0, 5, 0]
    - name: wall
      mesh: cube
      material: stone
      position: [5, 1, -3]
      scale: [10, 2, 0.5]
  trees:
    count: 20
    trunk: { radius: 0.15, height: 2 }
    canopy: { radius: 1.2, segments: 12 }
    min_height: 1.5
    seed: 42
"#;
        let def: GameDefinition = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(def.game.render_mode, "3d");
        assert_eq!(def.game.resolution, [1280, 720]);

        let cam = def.camera.as_ref().unwrap();
        assert_eq!(cam.camera_type, "orbit");
        assert_eq!(cam.fov, 60.0);
        assert_eq!(cam.distance, 15.0);

        let s3d = def.scene3d.as_ref().unwrap();
        assert_eq!(s3d.lights.len(), 2);
        assert_eq!(s3d.objects.len(), 2);
        assert!(s3d.terrain.is_some());
        assert!(s3d.water.is_some());
        assert!(s3d.trees.is_some());

        let fog = s3d.fog.as_ref().unwrap();
        assert!(fog.enabled);
        assert_eq!(fog.start, 40.0);

        let terrain = s3d.terrain.as_ref().unwrap();
        assert_eq!(terrain.size, 100.0);
        assert_eq!(terrain.seed, 42);

        let trees = s3d.trees.as_ref().unwrap();
        assert_eq!(trees.count, 20);
    }

    #[test]
    fn test_3d_entity_with_mesh() {
        let yaml = r#"
game:
  name: "Entity Test"
  render_mode: 3d

entities:
  - name: drone
    speed: 3
    health: 40
    tags: [enemy]
    mesh: sphere
    mesh_params: { radius: 0.4 }
    material: { base_color: [0.8, 0.1, 0.1], metallic: 0.8, roughness: 0.2 }
    position3d: [5, 2, -3]
"#;
        let def: GameDefinition = serde_yaml::from_str(yaml).unwrap();
        let entity = &def.entities[0];
        assert_eq!(entity.mesh.as_deref(), Some("sphere"));
        assert_eq!(entity.position3d, Some([5.0, 2.0, -3.0]));
        assert!(entity.material.is_some());
    }

    #[test]
    fn test_3d_fps_template_parses() {
        let yaml = r#"
game:
  name: "Dark Corridor"
  genre: 3d-fps
  resolution: [1280, 720]
  render_mode: 3d

camera:
  type: fps
  fov: 75

scene3d:
  sky_color: [0.1, 0.1, 0.15]
  lights:
    - type: directional
      direction: [-0.3, -0.8, -0.5]
      intensity: 0.6
  objects:
    - name: floor
      mesh: plane
      mesh_params: { size: 100 }
      material: stone
      position: [0, 0, 0]
    - name: pillar
      mesh: cylinder
      mesh_params: { radius: 0.3, height: 4, segments: 12 }
      material: stone
      position: [-5, 2, -3]

entities:
  - name: player
    position3d: [0, 1.8, 5]
    speed: 5
    health: 100
    tags: [player]

variables:
  score: 0
"#;
        let def: GameDefinition = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(def.game.render_mode, "3d");
        assert_eq!(def.scene3d.as_ref().unwrap().objects.len(), 2);
        assert_eq!(def.entities[0].position3d, Some([0.0, 1.8, 5.0]));
    }

    #[test]
    fn test_2d_game_has_no_scene3d() {
        let yaml = r#"
game:
  name: "2D RPG"
  genre: rpg
entities:
  - name: hero
    tags: [player]
"#;
        let def: GameDefinition = serde_yaml::from_str(yaml).unwrap();
        assert!(def.scene3d.is_none());
        assert!(def.camera.is_none());
        assert_eq!(def.game.render_mode, "2d");
    }

    #[test]
    fn test_material_preset_string() {
        let yaml = r#"
game:
  name: "Mat Test"
  render_mode: 3d
scene3d:
  objects:
    - name: rock
      mesh: sphere
      material: stone
"#;
        let def: GameDefinition = serde_yaml::from_str(yaml).unwrap();
        let obj = &def.scene3d.unwrap().objects[0];
        assert!(obj.material.is_string());
        assert_eq!(obj.material.as_str().unwrap(), "stone");
    }

    #[test]
    fn test_material_inline_object() {
        let yaml = r#"
game:
  name: "Mat Test 2"
  render_mode: 3d
scene3d:
  objects:
    - name: custom_obj
      mesh: cube
      material:
        base_color: [0.8, 0.1, 0.1]
        metallic: 0.5
        roughness: 0.3
"#;
        let def: GameDefinition = serde_yaml::from_str(yaml).unwrap();
        let obj = &def.scene3d.unwrap().objects[0];
        assert!(obj.material.is_object());
        let mat = obj.material.as_object().unwrap();
        assert!(mat.contains_key("base_color"));
        assert!(mat.contains_key("metallic"));
    }

    #[test]
    fn test_defaults_applied() {
        let yaml = r#"
game:
  name: "Defaults Test"
"#;
        let def: GameDefinition = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(def.game.genre, "rpg");
        assert_eq!(def.game.resolution, [320, 240]);
        assert_eq!(def.game.scale, 4);
        assert_eq!(def.game.fps, 60);
        assert_eq!(def.game.start_scene, "main");
        assert_eq!(def.game.render_mode, "2d");
        assert_eq!(def.game.version, "0.1.0");
    }
}
