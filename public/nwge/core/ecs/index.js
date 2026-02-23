/**
 * NWGE — NumbahWan Game Engine
 * ECS Core: World, Component, System, Query
 * 
 * Design goals:
 *   - Lightweight (<5KB minified)
 *   - Cache-friendly component storage (SoA layout)
 *   - O(1) entity operations
 *   - Typed component access
 *   - System scheduling with priority ordering
 */

// ─── Component Registry ─────────────────────────────────────────────
let _nextComponentId = 0;
const _componentNames = new Map();

/**
 * Register a component type. Returns a numeric ID used for bitmask queries.
 * @param {string} name - Human-readable component name
 * @param {object} defaults - Default values for the component
 * @returns {{ id: number, name: string, defaults: object }}
 */
export function defineComponent(name, defaults = {}) {
  const id = _nextComponentId++;
  if (id >= 32) throw new Error('NWGE: Max 32 component types (bitmask limit). Use bigint extension for more.');
  const def = { id, name, defaults: Object.freeze({ ...defaults }) };
  _componentNames.set(id, name);
  return def;
}

// ─── Built-in Components ─────────────────────────────────────────────
export const Transform = defineComponent('Transform', {
  x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1
});

export const Velocity = defineComponent('Velocity', {
  vx: 0, vy: 0
});

export const Sprite = defineComponent('Sprite', {
  atlas: null, frame: 0, width: 32, height: 32,
  flipX: false, flipY: false, opacity: 1, tint: null, layer: 0
});

export const PhysicsBody = defineComponent('PhysicsBody', {
  mass: 1, friction: 0.8, restitution: 0.2,
  grounded: false, gravityScale: 1, colliderType: 'aabb',
  colliderW: 32, colliderH: 32
});

export const Health = defineComponent('Health', {
  current: 100, max: 100, iFrames: 0, hitStun: 0
});

export const AnimationState = defineComponent('AnimationState', {
  currentAnim: 'idle', frame: 0, timer: 0,
  speed: 1, loop: true, finished: false
});

export const AIBehavior = defineComponent('AIBehavior', {
  state: 'idle', target: -1, aggroRange: 200,
  attackRange: 40, cooldown: 0
});

export const Tag = defineComponent('Tag', {
  tags: 0  // bitmask: PLAYER=1, ENEMY=2, PROJECTILE=4, LOOT=8, etc.
});

// Tag constants
export const TAGS = {
  PLAYER:     1,
  ENEMY:      2,
  PROJECTILE: 4,
  LOOT:       8,
  TRIGGER:    16,
  PARTICLE:   32,
  UI:         64,
};

// ─── Entity Pool ─────────────────────────────────────────────────────
const INITIAL_CAPACITY = 1024;

// ─── World ───────────────────────────────────────────────────────────
export class World {
  constructor(capacity = INITIAL_CAPACITY) {
    this.capacity = capacity;
    this.entityCount = 0;
    this.nextEntityId = 0;

    // Bitmask of which components each entity has
    this.masks = new Uint32Array(capacity);

    // Component storage: SoA (Structure of Arrays)
    // Each component type gets a flat array slot per entity
    this._stores = new Map(); // componentId → { field: TypedArray|Array }

    // Alive flags
    this.alive = new Uint8Array(capacity);

    // Recycled entity IDs
    this._recycled = [];

    // Event listeners
    this._listeners = new Map();

    // Systems
    this._systems = [];
    this._systemsSorted = false;

    // Queries (cached)
    this._queries = new Map();
  }

  // ── Entity Operations ──

  /**
   * Create a new entity. Returns entity ID.
   */
  spawn() {
    let eid;
    if (this._recycled.length > 0) {
      eid = this._recycled.pop();
    } else {
      eid = this.nextEntityId++;
      if (eid >= this.capacity) this._grow();
    }
    this.alive[eid] = 1;
    this.masks[eid] = 0;
    this.entityCount++;
    return eid;
  }

  /**
   * Destroy an entity, recycling its ID.
   */
  destroy(eid) {
    if (!this.alive[eid]) return;
    this.alive[eid] = 0;
    this.masks[eid] = 0;
    this.entityCount--;
    this._recycled.push(eid);
    this.emit('entity:destroy', eid);
  }

  /**
   * Check if entity is alive.
   */
  isAlive(eid) {
    return this.alive[eid] === 1;
  }

  // ── Component Operations ──

  /**
   * Add a component to an entity with optional initial values.
   */
  addComponent(eid, componentDef, values = {}) {
    if (!this.alive[eid]) return;
    const { id, defaults } = componentDef;

    // Ensure storage exists for this component type
    if (!this._stores.has(id)) {
      this._initStore(id, defaults);
    }

    // Set the bitmask
    this.masks[eid] |= (1 << id);

    // Write values
    const store = this._stores.get(id);
    const merged = { ...defaults, ...values };
    for (const key in merged) {
      if (store[key]) {
        store[key][eid] = merged[key];
      }
    }
    return this;
  }

  /**
   * Remove a component from an entity.
   */
  removeComponent(eid, componentDef) {
    this.masks[eid] &= ~(1 << componentDef.id);
    return this;
  }

  /**
   * Check if entity has a component.
   */
  hasComponent(eid, componentDef) {
    return (this.masks[eid] & (1 << componentDef.id)) !== 0;
  }

  /**
   * Get a component value object for an entity. Returns a proxy-like accessor.
   */
  getComponent(eid, componentDef) {
    if (!this.hasComponent(eid, componentDef)) return null;
    const store = this._stores.get(componentDef.id);
    if (!store) return null;

    // Return a lightweight accessor object
    const accessor = {};
    for (const key in store) {
      Object.defineProperty(accessor, key, {
        get: () => store[key][eid],
        set: (v) => { store[key][eid] = v; },
        enumerable: true
      });
    }
    return accessor;
  }

  /**
   * Direct store access for hot-path systems (avoids accessor overhead).
   */
  getStore(componentDef) {
    return this._stores.get(componentDef.id);
  }

  // ── Queries ──

  /**
   * Query entities that match a bitmask of components.
   * Returns an iterable of entity IDs.
   * Results are cached per mask.
   */
  query(...componentDefs) {
    let mask = 0;
    for (const def of componentDefs) mask |= (1 << def.id);
    return this._queryByMask(mask);
  }

  *_queryByMask(mask) {
    const { alive, masks } = this;
    const len = this.nextEntityId;
    for (let i = 0; i < len; i++) {
      if (alive[i] && (masks[i] & mask) === mask) {
        yield i;
      }
    }
  }

  /**
   * Collect query results into an array (when you need random access).
   */
  queryArray(...componentDefs) {
    return [...this.query(...componentDefs)];
  }

  // ── Systems ──

  /**
   * Register a system.
   * @param {object} system - { name, priority, components, update(world, dt, entities) }
   */
  addSystem(system) {
    if (!system.priority) system.priority = 0;
    if (!system.components) system.components = [];
    this._systems.push(system);
    this._systemsSorted = false;
    return this;
  }

  /**
   * Run all systems in priority order.
   */
  update(dt) {
    if (!this._systemsSorted) {
      this._systems.sort((a, b) => a.priority - b.priority);
      this._systemsSorted = true;
    }

    for (const sys of this._systems) {
      if (sys.enabled === false) continue;

      if (sys.components.length > 0) {
        // System with component query
        const entities = this.queryArray(...sys.components);
        sys.update(this, dt, entities);
      } else {
        // Global system (no specific query)
        sys.update(this, dt, null);
      }
    }
  }

  // ── Events ──

  on(event, callback) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(callback);
    return this;
  }

  off(event, callback) {
    const list = this._listeners.get(event);
    if (!list) return;
    const idx = list.indexOf(callback);
    if (idx >= 0) list.splice(idx, 1);
  }

  emit(event, ...args) {
    const list = this._listeners.get(event);
    if (!list) return;
    for (const cb of list) cb(...args);
  }

  // ── Internals ──

  _initStore(componentId, defaults) {
    const store = {};
    for (const key in defaults) {
      const val = defaults[key];
      if (typeof val === 'number') {
        store[key] = new Float64Array(this.capacity);
      } else {
        // Non-numeric: use regular array
        store[key] = new Array(this.capacity).fill(val);
      }
    }
    this._stores.set(componentId, store);
  }

  _grow() {
    const newCap = this.capacity * 2;

    // Grow alive and masks
    const newAlive = new Uint8Array(newCap);
    newAlive.set(this.alive);
    this.alive = newAlive;

    const newMasks = new Uint32Array(newCap);
    newMasks.set(this.masks);
    this.masks = newMasks;

    // Grow all stores
    for (const [compId, store] of this._stores) {
      for (const key in store) {
        const old = store[key];
        if (old instanceof Float64Array) {
          const newArr = new Float64Array(newCap);
          newArr.set(old);
          store[key] = newArr;
        } else if (Array.isArray(old)) {
          old.length = newCap;
        }
      }
    }

    this.capacity = newCap;
  }

  // ── Debug ──

  stats() {
    return {
      entities: this.entityCount,
      capacity: this.capacity,
      systems: this._systems.length,
      recycled: this._recycled.length,
      components: this._stores.size
    };
  }

  debug(eid) {
    if (!this.alive[eid]) return `Entity ${eid}: DEAD`;
    const comps = [];
    for (let i = 0; i < _nextComponentId; i++) {
      if (this.masks[eid] & (1 << i)) {
        comps.push(_componentNames.get(i) || `#${i}`);
      }
    }
    return `Entity ${eid}: [${comps.join(', ')}]`;
  }
}

// ─── Engine (Game Loop) ──────────────────────────────────────────────
export class Engine {
  constructor(world, options = {}) {
    this.world = world;
    this.fixedDt = options.fixedDt || 1 / 60;
    this.maxSubSteps = options.maxSubSteps || 5;
    this.running = false;
    this.paused = false;
    this.timeScale = 1;
    this.accumulator = 0;
    this.time = 0;
    this.frame = 0;
    this._rafId = null;
    this._lastTime = 0;

    // Callbacks for variable-rate work (rendering)
    this.onRender = null;  // (alpha) => void
    this.onPreUpdate = null;
    this.onPostUpdate = null;
  }

  start() {
    this.running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._loop(t));
  }

  stop() {
    this.running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  _loop(now) {
    if (!this.running) return;
    this._rafId = requestAnimationFrame((t) => this._loop(t));

    let rawDt = (now - this._lastTime) / 1000;
    this._lastTime = now;

    // Clamp to prevent spiral of death
    if (rawDt > 0.25) rawDt = 0.25;

    const dt = rawDt * this.timeScale;
    if (this.paused) {
      // Still render, just don't update
      if (this.onRender) this.onRender(1);
      return;
    }

    this.accumulator += dt;

    // Pre-update hook
    if (this.onPreUpdate) this.onPreUpdate(dt);

    // Fixed timestep updates
    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < this.maxSubSteps) {
      this.world.update(this.fixedDt);
      this.accumulator -= this.fixedDt;
      this.time += this.fixedDt;
      this.frame++;
      steps++;
    }

    // Post-update hook
    if (this.onPostUpdate) this.onPostUpdate(dt);

    // Render with interpolation alpha
    const alpha = this.accumulator / this.fixedDt;
    if (this.onRender) this.onRender(alpha);
  }
}

// ─── Convenience: Prefab System ──────────────────────────────────────
const _prefabs = new Map();

/**
 * Define a prefab (entity template).
 * @param {string} name - Prefab name
 * @param {Array<[componentDef, values]>} components - Component definitions with default values
 */
export function definePrefab(name, components) {
  _prefabs.set(name, components);
}

/**
 * Spawn an entity from a prefab.
 * @param {World} world
 * @param {string} prefabName
 * @param {object} overrides - Per-component overrides: { Transform: { x: 100 }, Health: { max: 50 } }
 * @returns {number} Entity ID
 */
export function spawnPrefab(world, prefabName, overrides = {}) {
  const template = _prefabs.get(prefabName);
  if (!template) throw new Error(`NWGE: Unknown prefab "${prefabName}"`);

  const eid = world.spawn();
  for (const [compDef, defaultValues] of template) {
    const over = overrides[compDef.name] || {};
    world.addComponent(eid, compDef, { ...defaultValues, ...over });
  }
  return eid;
}

// ─── Export All ──────────────────────────────────────────────────────
export default { World, Engine, defineComponent, definePrefab, spawnPrefab };
