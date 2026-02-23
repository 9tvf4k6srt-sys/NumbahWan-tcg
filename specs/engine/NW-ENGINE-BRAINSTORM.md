# NumbahWan Game Engine — Design Brainstorm

> **Codename**: `NWGE` (NumbahWan Game Engine)
> **Status**: Brainstorm / Architecture Phase
> **Date**: 2026-02-22
> **Author**: NumbahWan Dev Team

---

## 1. WHY BUILD OUR OWN ENGINE?

### What We Already Have (Audit)
| Module | Lines | What It Does |
|--------|-------|-------------|
| `deadrift.html` | 1,653 | Full game: Canvas2D renderer, Verlet physics, bone-rig animation, side-scroll world gen, combat, gacha, prestige |
| `nw-3d-engine.js` | 966 | CSS 3D transforms, easing library, card flip animations |
| `nw-arcade-engine.js` | 897 | Arcade game loop, sprite management, collision detection |
| `nw-battle-engine.js` | 1,456 | Turn-based battle system, damage calc, status effects |
| `nw-card-engine.js` | — | Card rendering, gacha pulls, rarity system |
| `nw-forge-engine.js` | — | Item crafting / upgrade system |
| `nw-dnd-engine.js` | — | Drag-and-drop interaction engine |

**Key insight**: We've been building engine pieces *ad hoc* inside each game. DEADRIFT alone has a physics system, animation system, camera system, audio synth, particle system, and world generator — all inline. Time to extract and unify.

### Pain Points With Current Approach
1. **Code duplication** — Physics exists in DEADRIFT, arcade engine, and battle engine separately
2. **No shared renderer** — Each game bootstraps its own Canvas2D context
3. **No asset pipeline** — Images loaded raw, no atlas packing, no compression pipeline
4. **No scene graph** — Everything is flat arrays of objects
5. **No ECS** — Entity management is manual `G.enemies.push({...})` style
6. **No tooling** — Level design is done by editing code
7. **Testing is manual** — No replay system, no automated testing

### Goals for NWGE
- **Unify** all existing NW games under one engine
- **Ship fast** — Iterative development, working games at every milestone
- **Web-first** — Browser is our primary platform (zero install, instant play)
- **Expandable** — Support 2D now, optional 2.5D/3D later
- **Lightweight** — Target <200KB engine core (gzipped)
- **Open architecture** — Easy for team members to add game-specific logic

---

## 2. CORE ARCHITECTURE OPTIONS

### Option A: Monolithic Game Framework (like Phaser)
```
┌─────────────────────────────────────┐
│          NWGE Monolith              │
│  ┌─────────┐ ┌─────────┐ ┌──────┐ │
│  │ Renderer │ │ Physics │ │Audio │ │
│  │ (Canvas) │ │ (Verlet)│ │(WebA)│ │
│  ├─────────┤ ├─────────┤ ├──────┤ │
│  │  Input  │ │  Scene  │ │ Net  │ │
│  │ Manager │ │  Graph  │ │(opt) │ │
│  └─────────┘ └─────────┘ └──────┘ │
└─────────────────────────────────────┘
```
**Pros**: Simple, familiar, fast to build first version
**Cons**: Hard to tree-shake, tight coupling, doesn't scale

### Option B: ECS (Entity-Component-System) — **RECOMMENDED**
```
┌──────────────────────────────────────────┐
│                  NWGE                     │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  World   │  │ Systems  │  │ Events │ │
│  │(entities)│  │(updaters)│  │ (bus)  │ │
│  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │              │            │       │
│  Components:    Systems:     Signals:     │
│  - Transform    - Physics    - onSpawn    │
│  - Sprite       - Render     - onDeath    │
│  - Physics      - Input      - onHit      │
│  - Health       - Audio      - onWave     │
│  - AI           - Camera     - onPickup   │
│  - Weapon       - Collision  - onPrestige │
│  - Inventory    - Animation               │
│  - Loot         - Particle                │
└──────────────────────────────────────────┘
```
**Pros**: Cache-friendly, composable, testable, scales perfectly
**Cons**: More upfront design, unfamiliar pattern for some

### Option C: Hybrid (ECS core + convenience wrappers)  — **OUR PICK**
Best of both worlds. ECS under the hood, but friendly API on top:
```js
// Game developer API (friendly)
const zombie = nw.spawn('Walker', { x: 400, y: ground });
zombie.hp = 30;
zombie.onDeath(() => nw.loot.drop(zombie));

// Under the hood: ECS
// Creates entity with [Transform, Sprite, Physics, Health, AI, Loot] components
// Systems (PhysicsSystem, RenderSystem, AISystem) process them each frame
```

---

## 3. TECH STACK DECISION MATRIX

### Language for Engine Core

| Language | Web? | Perf | Ecosystem | Learning Curve | Verdict |
|----------|------|------|-----------|----------------|---------|
| **JavaScript/TypeScript** | Native | Good (JIT) | Massive | Low | **Primary — web games** |
| **Rust + WASM** | Via wasm | Excellent | Growing | High | **Future — perf-critical modules** |
| **C++ + Emscripten** | Via wasm | Excellent | Mature | Very High | Overkill for our scale |
| **Go + WASM** | Via wasm | Good | Limited gamedev | Medium | Not ideal for games |
| **Zig + WASM** | Via wasm | Excellent | Tiny | High | Too early ecosystem |

### **Decision: TypeScript core, Rust WASM for hot paths**
- Engine core in TypeScript (90% of code)
- Physics solver, particle systems, pathfinding → Rust compiled to WASM (10%)
- This matches our team skills and ships fast

### Rendering Approach

| Renderer | Use Case | Perf | Complexity |
|----------|----------|------|-----------|
| **Canvas2D** | Current approach, good for sprites | Medium | Low |
| **WebGL2** | GPU-accelerated 2D, batched sprites | High | Medium |
| **WebGPU** | Next-gen, compute shaders | Highest | High |
| **PixiJS** | Wrapper over WebGL | High | Low |
| **Three.js** | 3D scenes | High | Medium |

### **Decision: Multi-backend renderer**
```
┌─────────────────────────────────┐
│     NWGE Render Interface       │
│  draw(sprite), drawParticles()  │
│  setCamera(), drawTilemap()     │
├────────┬────────┬───────────────┤
│Canvas2D│ WebGL2 │  WebGPU       │
│(fallbk)│(default│  (future)     │
│        │ batch) │               │
└────────┴────────┴───────────────┘
```
- Start with **Canvas2D** (already working in DEADRIFT)
- Add **WebGL2 batched sprite renderer** as primary (big perf win)
- **WebGPU** as future-proof path
- Auto-detect and fallback: WebGPU → WebGL2 → Canvas2D

### Physics System

| Option | Type | Web? | Perf |
|--------|------|------|------|
| **Custom Verlet** | We have this in DEADRIFT | Yes | Good for simple |
| **Rapier.js** | Rust WASM physics engine | Yes | Excellent |
| **Matter.js** | Pure JS 2D physics | Yes | Good |
| **Box2D WASM** | Classic, compiled to WASM | Yes | Great |
| **Custom AABB+SAT** | Lightweight custom | Yes | Tunable |

### **Decision: Custom physics core + optional Rapier**
- Keep our Verlet-based system from DEADRIFT for simple games
- Add **Rapier.js** (Rust WASM) as an option for complex physics
- Custom broadphase (spatial hash grid) for collision detection
- This gives us control and performance

---

## 4. ENGINE ARCHITECTURE (DETAILED)

### Module Map
```
nwge/
├── core/
│   ├── ecs/
│   │   ├── World.ts          — Entity storage, archetype management
│   │   ├── Component.ts      — Component type registry
│   │   ├── System.ts         — System base class, scheduling
│   │   └── Query.ts          — Efficient entity queries
│   ├── Engine.ts             — Main game loop (fixed timestep + interpolation)
│   ├── EventBus.ts           — Typed pub/sub event system
│   └── Clock.ts              — Time management, pause, slow-mo
│
├── render/
│   ├── Renderer.ts           — Abstract renderer interface
│   ├── Canvas2DRenderer.ts   — Canvas2D backend
│   ├── WebGLRenderer.ts      — WebGL2 batched sprite backend
│   ├── Camera.ts             — Smooth follow, shake, zoom, parallax
│   ├── SpriteAtlas.ts        — Texture atlas management
│   └── ParticleRenderer.ts   — GPU-instanced particles
│
├── physics/
│   ├── PhysicsWorld.ts       — Simulation container
│   ├── Body.ts               — Rigid body (position, velocity, forces)
│   ├── Collider.ts           — AABB, circle, polygon colliders
│   ├── SpatialHash.ts        — Broadphase collision grid
│   ├── Solver.ts             — Narrow-phase + resolution
│   └── Verlet.ts             — Verlet integration (from DEADRIFT)
│
├── animation/
│   ├── Animator.ts           — State machine for sprite animations
│   ├── BoneRig.ts            — Procedural bone/IK animation
│   ├── Tween.ts              — Easing/tweening library
│   └── SquashStretch.ts      — Juice: squash, stretch, anticipation
│
├── input/
│   ├── InputManager.ts       — Keyboard, mouse, touch, gamepad
│   ├── InputBuffer.ts        — Fighting-game style input buffering
│   └── Gestures.ts           — Swipe, tap, hold detection (mobile)
│
├── audio/
│   ├── AudioManager.ts       — Web Audio API wrapper
│   ├── SynthEngine.ts        — Procedural sound effects (from DEADRIFT)
│   ├── MusicPlayer.ts        — Background music with crossfade
│   └── SFXPool.ts            — Sound effect pooling and priorities
│
├── assets/
│   ├── AssetLoader.ts        — Async loading with progress callbacks
│   ├── SpriteSheet.ts        — Spritesheet parsing (JSON atlas)
│   ├── TileMap.ts            — Tiled-compatible map loader
│   └── AssetPack.ts          — Binary asset pack format (.nwpak)
│
├── scene/
│   ├── Scene.ts              — Scene lifecycle (enter, update, exit)
│   ├── SceneManager.ts       — Scene stack with transitions
│   └── Transitions.ts        — Fade, wipe, dissolve, custom
│
├── ai/
│   ├── StateMachine.ts       — FSM for enemy behavior
│   ├── BehaviorTree.ts       — BT for complex AI
│   └── Pathfinding.ts        — A* on grid/navmesh
│
├── net/ (future)
│   ├── NetClient.ts          — WebSocket client
│   ├── NetSync.ts            — State synchronization
│   └── Lobby.ts              — Room management
│
├── ui/
│   ├── UICanvas.ts           — In-game UI rendering (HUD, menus)
│   ├── Dialog.ts             — Dialog/text box system
│   └── FloatingText.ts       — Damage numbers, XP popups
│
├── tools/ (dev-only, tree-shaken in prod)
│   ├── Inspector.ts          — Runtime entity inspector
│   ├── Profiler.ts           — FPS, draw calls, memory overlay
│   ├── ReplayRecorder.ts     — Deterministic input recording
│   └── LevelEditor.ts        — In-browser level editor
│
└── plugins/
    ├── nwge-gacha/            — Gacha/loot system (from NW cards)
    ├── nwge-prestige/         — Prestige/rebirth system (from DEADRIFT)
    ├── nwge-crafting/         — Crafting system (from forge)
    └── nwge-combat/           — Damage calc, crits, status effects
```

### Game Loop Design
```
┌──────────────────────────────────────────────────┐
│                NWGE Game Loop                     │
│                                                   │
│  ┌─── Fixed Timestep (1/60s) ──────────────────┐ │
│  │                                              │ │
│  │  1. Input.poll()         — gather input      │ │
│  │  2. Physics.step(dt)     — simulate physics  │ │
│  │  3. AI.update(dt)        — run AI behaviors  │ │
│  │  4. Animation.update(dt) — advance anims     │ │
│  │  5. Scripts.update(dt)   — game-specific     │ │
│  │  6. Collision.resolve()  — resolve overlaps  │ │
│  │  7. Events.flush()       — dispatch events   │ │
│  │  8. Cleanup.sweep()      — remove dead ents  │ │
│  │                                              │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ┌─── Variable Timestep (vsync) ───────────────┐ │
│  │                                              │ │
│  │  9. Camera.update(alpha)  — interpolate cam  │ │
│  │ 10. Render.draw(alpha)    — draw everything  │ │
│  │ 11. Particles.draw()      — particle overlay │ │
│  │ 12. UI.draw()             — HUD overlay      │ │
│  │ 13. Debug.draw()          — dev overlays     │ │
│  │                                              │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## 5. GAMES WE'LL BUILD WITH IT

### Immediate (extract from existing code)
1. **DEADRIFT** — Side-scrolling zombie survival (already working, extract engine)
2. **NW Battle** — Turn-based card battles (nw-battle-engine.js → NWGE plugin)
3. **NW Arcade** — Quick minigames (nw-arcade-engine.js → NWGE plugin)

### Near-term (new games, same engine)
4. **VoidBloom** — Space shooter (spec exists in specs/games/voidbloom.yaml)
5. **PulseDrift** — Racing game (spec exists in specs/games/pulse-drift.yaml)
6. **NW Tower Defense** — Guild cooperative tower defense

### Long-term
7. **NW MMO Lite** — Multiplayer guild world (needs net/ module)
8. **NW RPG** — Full narrative RPG with dialog trees

---

## 6. TARGET PLATFORMS

| Platform | Method | Priority |
|----------|--------|----------|
| **Web (Desktop)** | Direct — HTML5 Canvas/WebGL | P0 (primary) |
| **Web (Mobile)** | Direct — touch input, responsive | P0 |
| **PWA** | Service worker, installable | P1 |
| **Discord Activity** | Embedded iframe SDK | P1 |
| **Electron** | Desktop wrapper | P2 |
| **Capacitor/Cordova** | Native mobile wrapper | P2 |
| **Steam (Greenworks)** | Electron + Steam SDK | P3 |

---

## 7. ASSET PIPELINE

### Current State (Manual)
```
Artist draws PNG → Manually placed in public/games/art/ → Loaded at runtime
```

### Target Pipeline
```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Source  │───▶│  Process  │───▶│  Pack    │───▶│  Deploy  │
│  Assets  │    │  (tools)  │    │ (.nwpak) │    │  (CDN)   │
└─────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │
     ├─ PSD/ASE      ├─ Trim alpha   ├─ Binary atlas
     ├─ Sprite sheets├─ Pack atlas   ├─ Compressed textures
     ├─ Tiled maps   ├─ Compress     ├─ Manifest JSON
     ├─ Audio (WAV)  ├─ Generate     ├─ Versioned hashes
     └─ Font files   │  mipmaps      └─ Lazy-load chunks
                     └─ Convert to
                        WebP/AVIF

Tool: `nwge-cli pack` — runs the whole pipeline
```

### Asset Pack Format (.nwpak)
```
Header (16 bytes):
  Magic: "NWPK"
  Version: u16
  EntryCount: u32
  IndexOffset: u32
  Flags: u16

Index Table:
  [name_hash: u32, offset: u32, size: u32, type: u8, compression: u8] × N

Data:
  Raw or LZ4-compressed asset blobs
```

---

## 8. EDITOR FEATURES (FUTURE)

### In-Browser Level Editor
- **Tilemap painter** — place tiles, set collision layers
- **Entity placer** — drag-and-drop enemies, items, triggers
- **Property inspector** — edit component values live
- **Play-test button** — instant preview in editor
- **Export** — save as JSON scene files
- **Undo/redo** — command pattern with history stack

### Debug Tools (Built into engine, dev-mode only)
- **Entity Inspector** — click any entity, see all components
- **Physics visualizer** — draw colliders, velocities, spatial hash grid
- **Performance overlay** — FPS, entities, draw calls, memory, system timings
- **Replay system** — record inputs, replay deterministically for debugging
- **Console** — in-game command console for testing (`/spawn walker 10`, `/godmode`, `/tp 400 200`)

---

## 9. SCRIPTING / GAME-SPECIFIC LOGIC

### Approach: TypeScript with Hot Module Replacement
```typescript
// games/deadrift/DeadriftGame.ts
import { Game, System, Query } from '@nwge/core';
import { PhysicsBody, Sprite, Health, AI } from '@nwge/components';

export class DeadriftGame extends Game {
  setup() {
    // Register game-specific components
    this.register(ZombieAI, Weapon, Loot, PrestigeLevel);
    
    // Add systems
    this.addSystem(new WaveSpawnerSystem());
    this.addSystem(new CombatSystem());
    this.addSystem(new LootDropSystem());
    this.addSystem(new PrestigeSystem());
    
    // Load assets
    this.assets.loadPack('deadrift-core.nwpak');
  }
  
  start() {
    this.scene.push('gameplay');
    this.spawn('Player', { x: 100, y: this.ground });
  }
}
```

### Alternative: Lightweight DSL for Non-Programmers
```yaml
# deadrift-waves.nwscript
wave 1:
  spawn: 3x Walker at random_x
  spawn: 1x Runner at edge_right
  on clear: loot_drop common_crate

wave 2:
  spawn: 5x Walker
  spawn: 2x Spitter
  boss_chance: 10%

every 10 waves:
  spawn_boss: zone_boss
  prestige_check: true
```

---

## 10. PERFORMANCE BUDGETS

| Metric | Target | Notes |
|--------|--------|-------|
| **Frame time** | <16ms (60fps) | Critical for action games |
| **Entity count** | 500+ active | Spatial hash for broadphase |
| **Draw calls** | <100 per frame | Batched sprite renderer |
| **Texture memory** | <64MB | Atlas packing, compressed |
| **Engine size** | <200KB gzipped | Tree-shakeable modules |
| **Load time** | <3s on 4G | Lazy loading, code split |
| **Input latency** | <1 frame | No input buffering delay |
| **Physics step** | <2ms | Spatial hash + sweep |
| **GC pauses** | <4ms | Object pooling everywhere |

---

## 11. DEVELOPMENT ROADMAP

### Phase 1: Extract & Unify (Weeks 1-3)
- [ ] Extract DEADRIFT physics into `physics/` module
- [ ] Extract DEADRIFT renderer into `render/Canvas2DRenderer.ts`
- [ ] Build minimal ECS (`World`, `Component`, `System`, `Query`)
- [ ] Create `Engine.ts` with fixed-timestep game loop
- [ ] Port DEADRIFT to run on extracted engine
- [ ] **Milestone**: DEADRIFT plays identically on new engine

### Phase 2: Core Systems (Weeks 4-6)
- [ ] Input manager (keyboard, mouse, touch, gamepad)
- [ ] Audio manager (Web Audio wrapper, synth from DEADRIFT)
- [ ] Camera system (smooth follow, shake, parallax)
- [ ] Animation state machine
- [ ] Scene manager with transitions
- [ ] Asset loader with progress tracking
- [ ] **Milestone**: Two games running (DEADRIFT + NW Battle)

### Phase 3: Performance & Renderer (Weeks 7-9)
- [ ] WebGL2 batched sprite renderer
- [ ] Sprite atlas packing tool
- [ ] Particle system (GPU-instanced)
- [ ] Object pooling for entities, particles, projectiles
- [ ] Spatial hash broadphase collision
- [ ] **Milestone**: 500+ entities at 60fps

### Phase 4: Tooling (Weeks 10-12)
- [ ] `nwge-cli` command-line tool
- [ ] Asset pipeline (`nwge-cli pack`)
- [ ] Runtime inspector (dev overlay)
- [ ] Performance profiler overlay
- [ ] Replay recorder
- [ ] **Milestone**: Dev tools usable for level design

### Phase 5: Polish & Ship (Weeks 13-16)
- [ ] In-browser level editor prototype
- [ ] PWA support (service worker, offline)
- [ ] Discord Activity SDK integration
- [ ] Port VoidBloom and PulseDrift to engine
- [ ] Documentation site
- [ ] **Milestone**: 5 games running, engine documented

### Phase 6: Advanced (Ongoing)
- [ ] WebGPU renderer backend
- [ ] Rust WASM physics module (Rapier integration)
- [ ] Networking module (WebSocket + WebRTC)
- [ ] Pathfinding (A* + navmesh)
- [ ] Behavior trees for complex AI
- [ ] 3D/2.5D rendering mode

---

## 12. COMPARISON WITH EXISTING ENGINES

| Feature | NWGE (Ours) | Phaser 3 | PixiJS | Godot (Web) | Defold |
|---------|-------------|----------|--------|-------------|--------|
| **Size** | <200KB | ~1MB | ~400KB | >20MB | ~3MB |
| **Architecture** | ECS | Scene+GO | Display tree | Node+Scene | GO+Comp |
| **Renderer** | Multi-backend | WebGL | WebGL | WebGL | OpenGL |
| **Physics** | Custom+Rapier | Arcade/Matter | None | Built-in | Built-in |
| **Custom for NW** | 100% | 0% | 0% | 0% | 0% |
| **Load time** | <3s | ~5s | ~3s | >10s | ~5s |
| **Guild integration** | Native | Plugin | Manual | Manual | Manual |
| **Gacha/loot** | Built-in plugin | Custom | Custom | Custom | Custom |
| **Learning curve** | Team knows it | Medium | Low | Medium | Medium |

### Why not just use Phaser/PixiJS?
1. **Size** — Our games need instant load. Phaser is 1MB+ before your game code.
2. **Control** — We need custom physics tuning (coyote time, i-frames, dodge mechanics) that frameworks make hard.
3. **Integration** — Guild features, TCG, gacha, prestige systems are first-class in our engine.
4. **Learning** — Building the engine teaches us everything about game architecture.
5. **Fun** — It's our engine. We own it. We understand every line.

---

## 13. OPEN QUESTIONS & DECISIONS NEEDED

| # | Question | Options | Leaning |
|---|----------|---------|---------|
| 1 | Repo structure? | Monorepo vs multi-repo | Monorepo (pnpm workspaces) |
| 2 | Build tool? | Vite / esbuild / Rollup | Vite (fast HMR for dev) |
| 3 | Testing framework? | Vitest / Jest / custom | Vitest (Vite-native) |
| 4 | ECS implementation? | bitECS / our own / miniplex | Our own (learning + control) |
| 5 | Sprite format? | Aseprite JSON / TexturePacker / custom | Aseprite JSON (our artists use it) |
| 6 | Networking model? | Authoritative server / P2P / lockstep | Authoritative (for fairness) |
| 7 | State persistence? | localStorage / IndexedDB / server | IndexedDB + optional cloud sync |
| 8 | License? | MIT / Apache / proprietary | MIT (for community) |

---

## 14. IMMEDIATE NEXT STEPS

1. **Create `nwge/` directory** in the repo with initial structure
2. **Extract ECS core** — World, Component, System, Query (~300 lines)
3. **Extract DEADRIFT physics** into standalone module
4. **Build minimal Canvas2D renderer** abstraction
5. **Port DEADRIFT to use extracted modules** (proof of concept)
6. **Benchmark**: Compare original DEADRIFT vs engine-based DEADRIFT
7. **Decide on monorepo structure** (pnpm workspaces with Vite)

---

## 15. INSPIRATION & REFERENCES

### Engines to Study
- **bitECS** — Minimal ECS in JS, great performance patterns
- **Bevy** (Rust) — Modern ECS architecture, incredible design docs
- **LÖVE** (Lua) — Simple API that's fun to use
- **Raylib** (C) — Minimalist, no dependencies, great learning resource
- **ct.js** — Friendly game editor, good UX for level tools
- **Excalibur.js** — TypeScript game engine, similar goals to ours

### Technical Papers
- "Data-Oriented Design and C++" (Richard Fabian) — Why ECS works
- "Fix Your Timestep!" (Glenn Fiedler) — Game loop design
- "Spatial Hashing" — Broadphase collision optimization
- "Texture Atlas Packing" — Bin packing algorithms for sprites

---

*This is a living document. Update as decisions are made and prototypes are built.*
