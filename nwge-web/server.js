import express from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import yaml from 'js-yaml';
import os from 'os';
import crypto from 'crypto';
import { createSignalDB, extractRenderMetrics, extractKeywords } from './signal.js';
import { expandPrompt, contextToYAML, expandedStats } from './prompt-expander.js';

// Prevent crashes from unhandled rejections
process.on('unhandledRejection', (err) => { console.error('[UNHANDLED]', err?.message || err); });
process.on('uncaughtException', (err) => { console.error('[UNCAUGHT]', err?.message || err); });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

// ─── Config ─────────────────────────────────────────────────
const PORT = 3000;
const NWGE_BIN = path.resolve(__dirname, '../nwge-engine/target/release/nwge');
const TMP_DIR = path.resolve(__dirname, 'tmp');
const PUBLIC_DIR = path.resolve(__dirname, 'public');

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(path.join(PUBLIC_DIR, 'renders'), { recursive: true });

// ─── Signal DB ──────────────────────────────────────────────
const signal = createSignalDB(path.join(__dirname, 'signal.db'));
console.log('[SIGNAL] Analytics database initialized');

// ─── LLM Client ─────────────────────────────────────────────
let llmConfig = {};
const configPath = path.join(os.homedir(), '.genspark_llm.yaml');
if (fs.existsSync(configPath)) {
  llmConfig = yaml.load(fs.readFileSync(configPath, 'utf8'));
}
const apiKey = process.env.OPENAI_API_KEY || llmConfig?.openai?.api_key;
const baseURL = process.env.OPENAI_BASE_URL || llmConfig?.openai?.base_url;
let openai = null;
let aiEnabled = false;
if (apiKey && baseURL) {
  openai = new OpenAI({ apiKey, baseURL, timeout: 8000 });
  // Quick test if AI is reachable
  (async () => {
    try {
      await openai.chat.completions.create({
        model: 'gpt-5-nano', messages: [{ role: 'user', content: 'hi' }], max_tokens: 5,
      });
      aiEnabled = true;
      console.log('[AI] LLM API verified - AI generation enabled');
    } catch (e) {
      console.log(`[AI] LLM API unavailable (${e.status || e.message?.substring(0,40)}) - using templates`);
      aiEnabled = false;
    }
  })();
}

// ─── Get NWGE system prompt and genres ──────────────────────
let SYSTEM_PROMPT = '';
try { SYSTEM_PROMPT = execSync(`${NWGE_BIN} prompt`, { encoding: 'utf8', timeout: 5000 }); } catch {}

let GENRES = [];
try {
  const out = execSync(`${NWGE_BIN} genres`, { encoding: 'utf8', timeout: 5000 });
  for (const line of out.split('\n')) {
    const m = line.match(/\(([a-z0-9-]+)\)\s+~(\d+)\s+tokens/);
    if (m) {
      const nm = line.match(/║\s+(.+?)\s{2,}(2d|3d)/);
      GENRES.push({ id: m[1], tokens: +m[2], dimension: nm?.[2] || '2d', name: nm?.[1]?.trim() || m[1] });
    }
  }
} catch {}

// ─── Get raw YAML templates from genres ─────────────────────
const GENRE_TEMPLATES = {};
for (const g of GENRES) {
  try {
    const out = execSync(`${NWGE_BIN} prompt --genre ${g.id}`, { encoding: 'utf8', timeout: 5000 });
    const yamlMatch = out.match(/```ya?ml?\n([\s\S]+?)```/);
    if (yamlMatch) GENRE_TEMPLATES[g.id] = yamlMatch[1].trim();
  } catch {}
}

console.log(`[NWGE] ${GENRES.length} genres, ${Object.keys(GENRE_TEMPLATES).length} templates loaded`);

// ════════════════════════════════════════════════════════════════
//  SMART LOCAL GAME GENERATOR
// ════════════════════════════════════════════════════════════════

function generateGameLocal(userPrompt, genreId, renderMode) {
  // ─── Try prompt expander first (handles "World of Warcraft", "Minecraft", etc.) ───
  const expanded = expandPrompt(userPrompt);
  if (expanded) {
    const gameName = extractGameName(userPrompt);
    const yamlObj = contextToYAML(expanded, gameName);
    const stats = expandedStats(expanded);
    console.log(`[EXPANDER] ${stats.label}: ${stats.entities} entities, ${stats.items} items, ${stats.scenes} scenes, ${stats.systems} systems, ${stats.events} events`);
    return yaml.dump(yamlObj, { lineWidth: 120, quotingType: '"' });
  }

  // ─── Fall through to keyword-based generators ───
  const is3D = renderMode === '3d' ||
    genreId === '3d-fps' || genreId === '3d-exploration' ||
    /3d|first.person|fps|walking.sim|open.world|exploration|landscape|mountain|beach|ocean|forest|cave|sunset|terrain|island|volcano|peak|cliff|snow|desert|temple|ruin|castle|floating|crystal|enchanted|mystic|magic|swamp|space|planet|lighthouse|pier|waterfall/i.test(userPrompt);

  const words = userPrompt.toLowerCase();
  const gameName = extractGameName(userPrompt);

  if (is3D) {
    return generate3DGame(gameName, words, genreId);
  } else {
    return generate2DGame(gameName, words, genreId);
  }
}

function extractGameName(prompt) {
  const cleaned = prompt.replace(/^(create|make|build|generate|i want|give me|a |an |the )/gi, '').trim();
  const firstChunk = cleaned.split(/[,.\n]/)[0].trim();
  return (firstChunk.length > 40 ? firstChunk.substring(0, 40) : firstChunk) || 'My Game';
}

// ─── 3D Scene Generator ─────────────────────────────────────
function generate3DGame(name, words, genre) {
  const rng = seedRng(words);

  // ─── Detect atmosphere ───────────────────
  const isDark = /dark|night|cave|dungeon|horror|spooky|haunted|abyss|void|midnight/i.test(words);
  const isSunset = /sunset|dusk|evening|twilight|golden.hour|warm|orange.sky/i.test(words);
  const isSnow = /snow|ice|frozen|winter|arctic|tundra|cold|blizzard|frost/i.test(words);
  const isDesert = /desert|sand|arid|dune|canyon|mesa|sahara|oasis/i.test(words);
  const isOcean = /ocean|beach|sea|coast|island|tropical|palm|pier|lighthouse|wave/i.test(words);
  const isMountain = /mountain|peak|cliff|highland|alpine|summit|ridge|volcano/i.test(words);
  const isForest = /forest|wood|grove|jungle|tree|meadow|garden|park/i.test(words);
  const isCave = /cave|underground|crystal|gem|cavern|mine|grotto|tunnel/i.test(words);
  const isCity = /city|urban|building|tower|skyline|rooftop|downtown|neon/i.test(words);
  const isSpace = /space|planet|star|galaxy|nebula|asteroid|moon|cosmos|alien/i.test(words);
  const isSwamp = /swamp|marsh|bog|wetland|bayou|mist/i.test(words);
  const isVolcano = /volcano|lava|magma|eruption|molten/i.test(words);
  const isMystic = /magic|mystic|enchanted|fairy|fantasy|wizard|arcane|ethereal|portal/i.test(words);
  const isRuin = /ruin|ancient|temple|pillar|column|abandoned|castle|fortress/i.test(words);

  // ─── Environment presets ─────────────────
  let env;
  if (isDark || isCave) {
    env = {
      sky: [0.05, 0.03, 0.12], fog: [0.08, 0.06, 0.14], fogS: 6, fogE: 28,
      sun: [0.4, 0.3, 0.7], sunDir: [-0.2, -0.9, -0.1], sunI: 0.6, ambient: 0.1,
    };
  } else if (isVolcano) {
    env = {
      sky: [0.25, 0.08, 0.02], fog: [0.3, 0.12, 0.05], fogS: 15, fogE: 45,
      sun: [1.0, 0.4, 0.1], sunDir: [-0.3, -0.7, -0.4], sunI: 1.4, ambient: 0.15,
    };
  } else if (isSunset) {
    env = {
      sky: [0.85, 0.4, 0.15], fog: [0.65, 0.35, 0.18], fogS: 25, fogE: 60,
      sun: [1.0, 0.55, 0.25], sunDir: [-0.15, -0.25, -0.85], sunI: 1.6, ambient: 0.15,
    };
  } else if (isSnow) {
    env = {
      sky: [0.7, 0.8, 0.95], fog: [0.8, 0.85, 0.95], fogS: 20, fogE: 55,
      sun: [0.95, 0.95, 1.0], sunDir: [-0.3, -0.6, -0.4], sunI: 1.1, ambient: 0.25,
    };
  } else if (isDesert) {
    env = {
      sky: [0.5, 0.6, 0.9], fog: [0.7, 0.6, 0.4], fogS: 30, fogE: 80,
      sun: [1.0, 0.9, 0.7], sunDir: [-0.1, -0.9, -0.3], sunI: 1.6, ambient: 0.2,
    };
  } else if (isOcean) {
    env = {
      sky: [0.35, 0.55, 0.85], fog: [0.4, 0.6, 0.8], fogS: 25, fogE: 65,
      sun: [1.0, 0.95, 0.85], sunDir: [-0.4, -0.7, -0.3], sunI: 1.3, ambient: 0.2,
    };
  } else if (isSwamp) {
    env = {
      sky: [0.2, 0.3, 0.15], fog: [0.25, 0.3, 0.2], fogS: 8, fogE: 35,
      sun: [0.6, 0.7, 0.4], sunDir: [-0.3, -0.5, -0.4], sunI: 0.8, ambient: 0.15,
    };
  } else if (isSpace) {
    env = {
      sky: [0.02, 0.02, 0.08], fog: [0.03, 0.03, 0.1], fogS: 40, fogE: 100,
      sun: [0.9, 0.9, 1.0], sunDir: [-0.5, -0.3, -0.5], sunI: 1.5, ambient: 0.05,
    };
  } else if (isMystic) {
    env = {
      sky: [0.15, 0.1, 0.3], fog: [0.2, 0.15, 0.35], fogS: 15, fogE: 50,
      sun: [0.7, 0.5, 1.0], sunDir: [-0.3, -0.7, -0.4], sunI: 1.0, ambient: 0.12,
    };
  } else if (isForest) {
    env = {
      sky: [0.35, 0.55, 0.8], fog: [0.4, 0.55, 0.65], fogS: 20, fogE: 55,
      sun: [1.0, 0.95, 0.8], sunDir: [-0.4, -0.7, -0.5], sunI: 1.2, ambient: 0.18,
    };
  } else {
    env = {
      sky: [0.4, 0.6, 0.9], fog: [0.5, 0.6, 0.8], fogS: 30, fogE: 70,
      sun: [1.0, 0.95, 0.85], sunDir: [-0.5, -0.8, -0.3], sunI: 1.2, ambient: 0.2,
    };
  }

  // ─── Build objects from prompt keywords ──
  const objects = [];
  const add = (n, mesh, params, mat, pos) =>
    objects.push({ name: n, mesh, mesh_params: params, material: mat, position: pos });

  // Crystals / gems
  if (/crystal|gem|glow|amethyst|quartz|diamond/i.test(words)) {
    const colors = [[0.4, 0.1, 0.9], [0.9, 0.2, 0.5], [0.1, 0.9, 0.5], [0.2, 0.4, 1.0], [1.0, 0.6, 0.1]];
    const count = /many|cluster|field|everywhere/i.test(words) ? 8 : 5;
    for (let i = 0; i < count; i++) {
      const r = 0.5 + rng() * 1.0;
      const c = colors[i % colors.length];
      const x = (rng() - 0.5) * 16, z = (rng() - 0.5) * 16;
      const y = 1 + rng() * 4;
      add(`crystal_${i}`, 'sphere', { radius: r },
        { emissive: c, emissive_intensity: 3 + rng() * 3 }, [+x.toFixed(1), +y.toFixed(1), +z.toFixed(1)]);
    }
  }

  // Ruins / temples
  if (isRuin) {
    add('pillar_1', 'cylinder', { radius: 0.6, height: 5 }, 'stone', [7, 2.5, -3]);
    add('pillar_2', 'cylinder', { radius: 0.6, height: 4 }, 'stone', [-6, 2, -5]);
    add('pillar_3', 'cylinder', { radius: 0.5, height: 3.5 }, 'stone', [4, 1.75, 6]);
    add('arch_block', 'cube', {}, 'stone', [0, 4, -4]);
    add('fallen_pillar', 'cylinder', { radius: 0.4, height: 3 }, 'stone', [-3, 0.4, 2]);
  }

  // Metal / mechanical
  if (/metal|robot|mech|steel|iron|machine|gear|industrial/i.test(words)) {
    add('metal_orb', 'sphere', { radius: 1.0 }, 'chrome', [0, 6, -5]);
    add('metal_pillar', 'cylinder', { radius: 0.4, height: 4 }, 'metal', [-4, 2, -3]);
    add('gear_cube', 'cube', {}, 'metal', [5, 1, -2]);
  }

  // Fire / lava
  if (/fire|lava|ember|flame|torch|inferno/i.test(words)) {
    for (let i = 0; i < 4; i++) {
      const x = (rng() - 0.5) * 12, z = (rng() - 0.5) * 12;
      add(`ember_${i}`, 'sphere', { radius: 0.15 + rng() * 0.3 },
        { emissive: [1.0, 0.3 + rng() * 0.3, 0.05], emissive_intensity: 4 + rng() * 3 },
        [+x.toFixed(1), 2 + rng() * 4, +z.toFixed(1)]);
    }
  }

  // Moon / orb / planet
  if (/moon|orb|globe|planet|sphere/i.test(words)) {
    const c = isSpace ? [0.6, 0.65, 0.7] : [0.8, 0.85, 0.95];
    add('celestial_orb', 'sphere', { radius: 2.0 },
      { emissive: c, emissive_intensity: 2.5 }, [0, 14, -10]);
  }

  // Lighthouse
  if (/lighthouse|beacon|watchtower/i.test(words)) {
    add('lighthouse_base', 'cylinder', { radius: 1.2, height: 8 }, 'stone', [8, 4, -8]);
    add('lighthouse_light', 'sphere', { radius: 0.5 },
      { emissive: [1.0, 0.95, 0.7], emissive_intensity: 6 }, [8, 8.5, -8]);
  }

  // Pier / bridge
  if (/pier|dock|bridge|walkway/i.test(words)) {
    for (let i = 0; i < 5; i++) {
      add(`pier_plank_${i}`, 'cube', {}, 'wood', [i * 2 - 4, 0.5, 5]);
    }
    add('pier_post_1', 'cylinder', { radius: 0.15, height: 2 }, 'wood', [-4, 1, 5]);
    add('pier_post_2', 'cylinder', { radius: 0.15, height: 2 }, 'wood', [6, 1, 5]);
  }

  // Castle / fortress
  if (/castle|fortress|tower|turret|battlement/i.test(words)) {
    add('tower_main', 'cylinder', { radius: 2, height: 10 }, 'stone', [0, 5, -8]);
    add('tower_left', 'cylinder', { radius: 1.2, height: 7 }, 'stone', [-6, 3.5, -6]);
    add('tower_right', 'cylinder', { radius: 1.2, height: 7 }, 'stone', [6, 3.5, -6]);
    add('wall_1', 'cube', {}, 'stone', [0, 2.5, -5]);
  }

  // Portal / gateway
  if (/portal|gate|gateway|rift|doorway/i.test(words)) {
    add('portal_ring', 'cylinder', { radius: 2, height: 0.3 }, { emissive: [0.3, 0.1, 1.0], emissive_intensity: 5 }, [0, 5, -5]);
    add('portal_core', 'sphere', { radius: 1.2 }, { emissive: [0.6, 0.2, 1.0], emissive_intensity: 8 }, [0, 5, -5]);
  }

  // Mushrooms
  if (/mushroom|fungi|fungus|toadstool/i.test(words)) {
    for (let i = 0; i < 6; i++) {
      const x = (rng() - 0.5) * 14, z = (rng() - 0.5) * 14;
      const r = 0.3 + rng() * 0.5;
      const hue = rng();
      const c = hue < 0.33 ? [0.9, 0.2, 0.3] : hue < 0.66 ? [0.3, 0.9, 0.4] : [0.5, 0.3, 0.9];
      add(`mushroom_cap_${i}`, 'sphere', { radius: r }, { emissive: c, emissive_intensity: 2 },
        [+x.toFixed(1), 0.5 + r, +z.toFixed(1)]);
      add(`mushroom_stem_${i}`, 'cylinder', { radius: r * 0.3, height: r * 1.5 }, 'wood',
        [+x.toFixed(1), r * 0.75, +z.toFixed(1)]);
    }
  }

  // Floating islands / rocks
  if (/float|island|hover|suspended|flying/i.test(words)) {
    add('float_island_1', 'sphere', { radius: 3 }, 'stone', [5, 10, -5]);
    add('float_island_2', 'sphere', { radius: 2 }, 'stone', [-4, 12, -8]);
    add('float_island_3', 'sphere', { radius: 1.5 }, 'stone', [0, 15, -3]);
  }

  // Waterfall
  if (/waterfall|cascade|falls/i.test(words)) {
    for (let i = 0; i < 5; i++) {
      add(`water_drop_${i}`, 'sphere', { radius: 0.2 },
        { emissive: [0.3, 0.6, 1.0], emissive_intensity: 2 },
        [-8, 6 - i * 1.2, -6 + rng() * 0.5]);
    }
    add('cliff_face', 'cube', {}, 'stone', [-8, 3, -7]);
  }

  // Default objects if nothing matched
  if (objects.length === 0) {
    add('sphere_1', 'sphere', { radius: 0.8 }, { emissive: [0.3, 0.6, 1.0], emissive_intensity: 3 }, [3, 5, -2]);
    add('cube_1', 'cube', {}, 'stone', [-4, 1, -5]);
    add('cylinder_1', 'cylinder', { radius: 0.3, height: 3 }, 'wood', [6, 1.5, 3]);
    add('gold_sphere', 'sphere', { radius: 0.4 }, 'gold', [0, 3, 0]);
  }

  // ─── Terrain ─────────────────────────────
  let terrainSize = 50, terrainSub = 40, heightScale = 5;
  if (isMountain) { heightScale = 14; terrainSize = 70; terrainSub = 50; }
  if (isDesert) { heightScale = 3; terrainSize = 70; }
  if (isCave) { heightScale = 1.5; terrainSize = 25; terrainSub = 30; }
  if (isOcean) { heightScale = 2; terrainSize = 60; }
  if (isSpace) { heightScale = 0.5; terrainSize = 80; }
  if (isVolcano) { heightScale = 10; terrainSize = 50; }

  const seed = Math.floor(rng() * 999);

  // ─── Water ───────────────────────────────
  const hasWater = !isDesert && !isCave && !isSpace;
  const waterHeight = isOcean ? 2.5 : (isSwamp ? 1.0 : 1.5);

  // ─── Trees ───────────────────────────────
  const hasTrees = !isDesert && !isCave && !isSnow && !isSpace && !isVolcano;
  const treeCount = isForest ? 30 : (isOcean ? 8 : (isSwamp ? 12 : 15));

  // ─── Mountains (background objects) ──────
  const hasMountains = isMountain || isSnow || isForest;

  // ─── Camera ──────────────────────────────
  const camDist = isCave ? 10 : (isMountain ? 28 : 20);
  const camPitch = isCave ? 0.35 : (isMountain ? 0.55 : 0.45);
  const camFov = isCave ? 70 : (isSpace ? 75 : 60);

  const scene3d = {
    sky_color: env.sky,
    fog: { enabled: true, color: env.fog, start: env.fogS, end: env.fogE },
    ambient_light: env.ambient,
    lights: [{ type: 'directional', direction: env.sunDir, color: env.sun, intensity: env.sunI }],
    terrain: { size: terrainSize, subdivisions: terrainSub, height_scale: heightScale, seed },
  };

  if (hasWater) scene3d.water = { enabled: true, height: waterHeight, material: 'water' };
  if (hasTrees) scene3d.trees = { count: treeCount, seed };
  if (hasMountains) scene3d.mountains = { count: 4, seed };
  scene3d.objects = objects;

  const game = {
    game: {
      name,
      genre: genre || '3d-exploration',
      resolution: [1280, 720],
      render_mode: '3d',
      fps: 60,
      start_scene: 'main',
    },
    camera: { type: 'orbit', fov: camFov, distance: camDist, pitch: camPitch, target: [0, isCave ? 2 : 3, 0] },
    scene3d,
    entities: [{ name: 'player', position3d: [0, 3, 5], tags: ['player'] }],
    scenes: [{ name: 'main', size: [40, 30], entities: [{ entity: 'player' }] }],
    variables: { discoveries: 0, time_played: 0 },
  };

  return yaml.dump(game, { lineWidth: 120, quotingType: '"' });
}

// ─── 2D Game Generator ──────────────────────────────────────
function generate2DGame(name, words, genreId) {
  // If we have a template for this genre, use it with customization
  if (genreId && GENRE_TEMPLATES[genreId]) {
    let tmpl = GENRE_TEMPLATES[genreId];
    tmpl = tmpl.replace(/name:\s*"[^"]*"/, `name: "${name}"`);
    return tmpl;
  }

  // Smart 2D generation based on keywords
  const entities = [];
  const items = [];
  const events = {};
  const scenes = [];
  let startScene = 'main';

  // Always a player
  entities.push({
    name: 'player', sprite: 'player', position: [160, 120], speed: 80,
    size: [14, 14], tags: ['player'], body: 'dynamic',
    inventory: { slots: 20 },
  });

  // Farming keywords
  if (/farm|crop|plant|harvest|seed|chicken|barn|cow/i.test(words)) {
    genreId = genreId || 'farming-rpg';
    entities.push({ name: 'chicken', sprite: 'chicken', speed: 15, size: [10, 10], tags: ['npc', 'animal'], ai: 'wander', props: { produces: 'egg', produce_interval: 120 } });
    if (/cow|cattle/i.test(words)) entities.push({ name: 'cow', sprite: 'cow', speed: 10, size: [16, 14], tags: ['npc', 'animal'], ai: 'wander', props: { produces: 'milk' } });
    items.push({ name: 'hoe', type: 'tool', tool_type: 'hoe' });
    items.push({ name: 'watering_can', type: 'tool', tool_type: 'watering_can' });
    items.push({ name: 'turnip_seeds', type: 'seed', crop: 'turnip', buy_price: 20 });
    items.push({ name: 'turnip', type: 'crop', sell_price: 60 });
    scenes.push({ name: 'farm', size: [60, 45], tile_size: 16, spawn_point: [10, 22], entities: [{ entity: 'player', at: [10, 22] }, { entity: 'chicken', at: [6, 30] }] });
    startScene = 'farm';
  }
  // Combat keywords
  else if (/monster|enemy|combat|fight|battle|zombie|dragon|sword|dungeon|warrior/i.test(words)) {
    genreId = genreId || 'rpg';
    entities.push({ name: 'enemy', sprite: 'enemy', position: [250, 150], speed: 40, tags: ['enemy'], ai: 'chase', health: 50 });
    if (/dragon/i.test(words)) entities.push({ name: 'dragon', sprite: 'dragon', position: [280, 80], speed: 30, health: 200, tags: ['enemy', 'boss'], ai: 'chase' });
    if (/zombie/i.test(words)) entities.push({ name: 'zombie', sprite: 'zombie', position: [200, 200], speed: 25, health: 30, tags: ['enemy'], ai: 'chase' });
    items.push({ name: 'sword', type: 'weapon', damage: 15, description: 'A trusty blade' });
    items.push({ name: 'health_potion', type: 'food', heal_amount: 30, buy_price: 50 });
    scenes.push({ name: 'main', size: [50, 40], tile_size: 16, entities: entities.map(e => ({ entity: e.name, position: e.position || [100, 100] })) });
  }
  // Shop / town
  else if (/shop|store|merchant|buy|sell|village|town/i.test(words)) {
    genreId = genreId || 'rpg';
    entities.push({ name: 'merchant', sprite: 'npc', position: [200, 80], tags: ['npc', 'interactable'], ai: 'idle', dialog: [{ text: `Welcome to my shop! Browse my wares.` }] });
    entities.push({ name: 'villager', sprite: 'npc', position: [130, 150], tags: ['npc', 'interactable'], ai: 'wander', dialog: [{ text: 'What a nice day in the village!' }] });
    items.push({ name: 'health_potion', type: 'food', heal_amount: 30, buy_price: 50 });
    items.push({ name: 'map', type: 'key', description: 'Shows nearby areas' });
    scenes.push({ name: 'main', size: [40, 30], tile_size: 16, entities: entities.map(e => ({ entity: e.name, position: e.position || [100, 100] })) });
  }
  // Default RPG
  else {
    genreId = genreId || 'rpg';
    entities.push({ name: 'guide', sprite: 'npc', position: [200, 100], tags: ['npc', 'interactable'], ai: 'idle', dialog: [{ text: `Welcome to ${name}!` }] });
    items.push({ name: 'potion', type: 'food', heal_amount: 20, buy_price: 30 });
    scenes.push({ name: 'main', size: [40, 30], tile_size: 16, entities: entities.map(e => ({ entity: e.name, position: e.position || [100, 100] })) });
  }

  if (scenes.length === 0) {
    scenes.push({ name: 'main', size: [40, 30], tile_size: 16, entities: entities.map(e => ({ entity: e.name, position: e.position || [100, 100] })) });
  }

  events.game_start = [{ action: 'dialog', speaker: 'System', text: `Welcome to ${name}! Press E to interact.` }];

  const game = {
    game: { name, genre: genreId, resolution: [320, 240], scale: 4, fps: 60, start_scene: startScene },
    entities,
    items,
    scenes,
    variables: { gold: 100, level: 1, health: 100 },
    events,
  };

  return yaml.dump(game, { lineWidth: 120, quotingType: '"' });
}

// Simple seeded RNG from prompt string
function seedRng(str) {
  let seed = 0;
  for (let i = 0; i < str.length; i++) seed = ((seed << 5) - seed + str.charCodeAt(i)) | 0;
  return () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
}

// ─── Helper: render a YAML file (async) ─────────────────────
async function renderGame(yamlContent) {
  const jobId = crypto.randomBytes(8).toString('hex');
  const jobDir = path.join(TMP_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });
  const renderDir = path.join(PUBLIC_DIR, 'renders', jobId);
  fs.mkdirSync(renderDir, { recursive: true });

  const yamlPath = path.join(jobDir, 'game.yaml');
  fs.writeFileSync(yamlPath, yamlContent);

  let validation = '';
  try {
    const { stdout } = await execAsync(`${NWGE_BIN} validate "${yamlPath}" 2>&1`, { timeout: 10000 });
    validation = stdout;
  } catch (e) { validation = e.stdout || e.stderr || ''; }

  let renderOutput = '';
  let images = [];
  try {
    const { stdout } = await execAsync(`${NWGE_BIN} run "${yamlPath}" 2>&1`, { timeout: 30000, cwd: renderDir });
    renderOutput = stdout;
    images = fs.readdirSync(renderDir).filter(f => f.endsWith('.png')).map(f => `/renders/${jobId}/${f}`);
  } catch (e) {
    renderOutput = e.stdout || e.stderr || e.message || 'Render failed';
    // Still check for images that may have been written before failure
    try { images = fs.readdirSync(renderDir).filter(f => f.endsWith('.png')).map(f => `/renders/${jobId}/${f}`); } catch {}
  }

  let gameInfo = '';
  try {
    const { stdout } = await execAsync(`${NWGE_BIN} info "${yamlPath}" 2>&1`, { timeout: 5000 });
    gameInfo = stdout;
  } catch {}

  return { jobId, images, validation: validation.trim(), renderOutput: renderOutput.trim(), gameInfo: gameInfo.trim() };
}

// ════════════════════════════════════════════════════════════════
//  EXPRESS APP
// ════════════════════════════════════════════════════════════════
const app = express();
app.use(express.json({ limit: '10mb' })); // Larger limit for image uploads
app.use(express.static(PUBLIC_DIR));

// ════════════════════════════════════════════════════════════════
//  MOBILE GAME FACTORY — Image Vision Analysis API
// ════════════════════════════════════════════════════════════════

// POST /api/mobile/vision — LLM-powered image analysis for picture-to-game
app.post('/api/mobile/vision', async (req, res) => {
  const { image } = req.body; // base64 data URL
  if (!image || !image.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Valid base64 image data URL required' });
  }

  // Check if LLM with vision is available
  if (!openai || !aiEnabled) {
    return res.json({
      available: false,
      analysis: null,
      message: 'LLM vision not available — using client-side analysis',
    });
  }

  try {
    const systemPrompt = `You are a game designer AI that analyzes images to generate mobile game parameters.
Analyze the provided image and return a JSON object with EXACTLY this structure (no markdown, no fences, just pure JSON):
{
  "sceneDescription": "Brief 1-sentence description of what's in the image",
  "objects": ["list", "of", "detected", "objects"],
  "suggestedGameType": "runner|rpg|platformer|puzzle|tower_defense",
  "suggestedTheme": "forest|desert|ocean|space|cave|city|snow|volcanic|sky|fantasy|dungeon",
  "suggestedMood": "epic|calm|dark|cute|mysterious|energetic|melancholic|adventurous|horror|peaceful",
  "characters": [{"type": "warrior|mage|archer|rogue|robot|animal|explorer", "weapon": "sword|staff|bow|dagger|laser|wand|harpoon"}],
  "levelHints": {
    "hasOpenSpace": true,
    "hasPlatforms": false,
    "hasMaze": false,
    "hasVerticalLayers": true,
    "suggestedObstacles": ["rocks", "trees"],
    "suggestedCollectibles": ["coins", "gems"]
  },
  "colorMood": "warm|cool|neutral|dark|bright|neon",
  "environmentDetails": {
    "timeOfDay": "day|night|sunset|dawn|twilight",
    "weather": "clear|rain|snow|fog|storm",
    "season": "spring|summer|autumn|winter"
  }
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: [
          { type: 'text', text: 'Analyze this image for mobile game generation. Return only valid JSON.' },
          { type: 'image_url', image_url: { url: image } },
        ]},
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const raw = completion.choices[0]?.message?.content || '';
    // Strip any markdown fences
    const jsonStr = raw.replace(/^```json?\n?/m, '').replace(/\n?```\s*$/m, '').trim();
    const analysis = JSON.parse(jsonStr);

    console.log(`[VISION] Analyzed image: ${analysis.sceneDescription?.substring(0, 60)}`);
    res.json({ available: true, analysis, tokens: completion.usage?.total_tokens });
  } catch (err) {
    console.log(`[VISION] Error: ${err.message?.substring(0, 80)}`);
    res.json({
      available: false,
      analysis: null,
      message: `Vision analysis failed: ${err.message?.substring(0, 100)}`,
    });
  }
});

// GET /api/mobile/status — Check if vision/AI features are available
app.get('/api/mobile/status', (req, res) => {
  res.json({
    visionAvailable: !!(openai && aiEnabled),
    templates: ['runner', 'rpg', 'platformer', 'puzzle', 'tower_defense'],
    themes: ['forest', 'desert', 'ocean', 'space', 'cave', 'city', 'snow', 'volcanic', 'sky', 'fantasy', 'dungeon'],
    version: '2.0',
  });
});

app.get('/api/genres', (req, res) => res.json({ genres: GENRES }));

app.get('/api/genre/:id', (req, res) => {
  const id = req.params.id.replace(/[^a-z0-9-]/g, '');
  try {
    const template = execSync(`${NWGE_BIN} prompt --genre ${id}`, { encoding: 'utf8', timeout: 5000 });
    res.json({ template });
  } catch { res.status(404).json({ error: 'Genre not found' }); }
});

app.post('/api/generate', async (req, res) => {
  const { prompt: userPrompt, genre, renderMode, useAI, sessionId } = req.body;
  if (!userPrompt || userPrompt.length < 3) {
    return res.status(400).json({ error: 'Please describe the game you want.' });
  }

  const sid = sessionId || 'anon-' + crypto.randomBytes(4).toString('hex');
  const is3D = renderMode === '3d' || genre === '3d-fps' || genre === '3d-exploration' ||
    /3d|first.person|fps|walking.sim|exploration|landscape|mountain|beach|ocean|forest|cave|sunset|terrain|island|volcano|peak|cliff|snow|desert|temple|ruin|castle|floating|crystal|enchanted|mystic|magic|swamp|space|planet|lighthouse|pier|waterfall/i.test(userPrompt);

  try {
    let yamlContent, tokens = 0, method = 'template';

    // Try AI generation first if available and verified
    if (useAI !== false && openai && aiEnabled) {
      try {
        const systemMsg = SYSTEM_PROMPT + `\nCRITICAL: Output ONLY valid YAML. No fences, no explanation.${
          is3D ? '\nThis must be a 3D game with render_mode: 3d, camera section, scene3d section.' : ''
        }`;
        const completion = await openai.chat.completions.create({
          model: 'gpt-5',
          messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: `Create: ${userPrompt}` }],
          temperature: 0.7, max_tokens: 4000,
        });
        yamlContent = (completion.choices[0]?.message?.content || '').replace(/^```ya?ml?\n?/m, '').replace(/\n?```\s*$/m, '').trim();
        tokens = completion.usage?.total_tokens || 0;
        method = 'ai';
        yaml.load(yamlContent); // validate
      } catch (aiErr) {
        console.log(`[AI] Fallback to template: ${aiErr.message?.substring(0, 80)}`);
        if (aiErr.status === 401 || /401|unauthorized/i.test(aiErr.message || '')) {
          console.log('[AI] Disabling AI due to auth failure');
          globalThis._aiDisabled = true;
        }
        yamlContent = null;
      }
    }

    // Fallback: smart local generator
    if (!yamlContent) {
      yamlContent = generateGameLocal(userPrompt, genre, renderMode);
      method = 'template';
    }

    const parsed = yaml.load(yamlContent);
    const result = await renderGame(yamlContent);

    console.log(`[${result.jobId}] ${method} | ${result.images.length} imgs | "${parsed?.game?.name}"`);

    // ─── Log to signal DB ─────────────────────
    const metrics = extractRenderMetrics(result.renderOutput);
    const keywords = extractKeywords(userPrompt);
    signal.logGeneration({
      id: result.jobId,
      sessionId: sid,
      prompt: userPrompt,
      genre: parsed?.game?.genre || genre || 'custom',
      renderMode: parsed?.game?.render_mode || (is3D ? '3d' : '2d'),
      method,
      gameName: parsed?.game?.name || 'Untitled',
      tokens,
      imageCount: result.images?.length || 0,
      fillRate: metrics.fillRate || null,
      renderTime: metrics.renderTime || null,
      resolution: metrics.resolution || null,
      triangles: metrics.triangles || null,
      vertices: metrics.vertices || null,
      success: 1,
      error: null,
      yamlSize: yamlContent.length,
      keywordHits: JSON.stringify(keywords),
    });
    signal.logEvent(sid, 'generate', { jobId: result.jobId, prompt: userPrompt.substring(0, 100) });

    res.json({
      ...result,
      yaml: yamlContent,
      tokens,
      method,
      gameName: parsed?.game?.name || 'Untitled',
      genre: parsed?.game?.genre || genre || 'custom',
      renderMode: parsed?.game?.render_mode || (is3D ? '3d' : '2d'),
    });
  } catch (err) {
    console.error(`Error:`, err.message);
    signal.logGeneration({
      id: crypto.randomBytes(8).toString('hex'),
      sessionId: sid, prompt: userPrompt, genre: genre || null,
      renderMode: renderMode || null, method: 'error', gameName: null,
      tokens: 0, imageCount: 0, fillRate: null, renderTime: null,
      resolution: null, triangles: null, vertices: null,
      success: 0, error: err.message?.substring(0, 500),
      yamlSize: 0, keywordHits: JSON.stringify(extractKeywords(userPrompt)),
    });
    res.status(500).json({ error: 'Generation failed: ' + err.message });
  }
});

app.post('/api/render', async (req, res) => {
  const { yaml: yamlContent } = req.body;
  if (!yamlContent) return res.status(400).json({ error: 'No YAML' });
  try {
    const result = await renderGame(yamlContent);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message?.substring(0, 300) });
  }
});

app.get('/api/gallery', (req, res) => {
  res.json({ gallery: [
    { id: 'landscape', title: '3D Landscape', description: 'Terrain with water, trees, and PBR materials', image: '/gallery/landscape.png', mode: '3d' },
    { id: 'materials', title: 'Material Showcase', description: '7 PBR materials: stone, gold, chrome, copper, plastic, glass, emissive', image: '/gallery/materials.png', mode: '3d' },
    { id: 'sunset', title: 'Sunset Scene', description: 'Atmospheric sunset with fog, silhouette trees, warm lighting', image: '/gallery/sunset.png', mode: '3d' },
    { id: 'forest', title: 'Forest Walk', description: 'AI-generated 3D exploration scene from YAML', image: '/gallery/forest.png', mode: '3d' },
    { id: 'gameplay', title: '2D RPG Gameplay', description: 'Pixel-art top-down RPG with tilemap, sprites, HUD', image: '/gallery/gameplay_2d.png', mode: '2d' },
  ]});
});

app.get('/api/status', (req, res) => {
  res.json({ engine: 'NWGE v0.4.0', genres: GENRES.length, ai: aiEnabled, templates: Object.keys(GENRE_TEMPLATES).length });
});

// ════════════════════════════════════════════════════════════════
//  SIGNAL API — Feedback & Analytics
// ════════════════════════════════════════════════════════════════

// Session heartbeat
app.post('/api/signal/session', (req, res) => {
  const { sessionId, fingerprint, userAgent, screenSize, referrer } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  signal.touchSession({ id: sessionId, fingerprint: fingerprint || null, userAgent: userAgent || null, screenSize: screenSize || null, referrer: referrer || null });
  res.json({ ok: true });
});

// Submit feedback
app.post('/api/signal/feedback', (req, res) => {
  const { jobId, sessionId, rating, comment } = req.body;
  if (!jobId || rating === undefined) return res.status(400).json({ error: 'jobId and rating required' });
  signal.logFeedback({ jobId, sessionId: sessionId || 'anon', rating: parseInt(rating), comment: comment || null });
  signal.logEvent(sessionId || 'anon', 'feedback', { jobId, rating, comment: comment?.substring(0, 200) });
  res.json({ ok: true });
});

// Log client event
app.post('/api/signal/event', (req, res) => {
  const { sessionId, type, data } = req.body;
  if (!type) return res.status(400).json({ error: 'type required' });
  signal.logEvent(sessionId || 'anon', type, data || null);
  res.json({ ok: true });
});

// ─── Analytics Dashboard API ────────────────────────────────
app.get('/api/signal/overview', (req, res) => {
  res.json(signal.getOverview());
});

app.get('/api/signal/distributions', (req, res) => {
  res.json(signal.getDistributions());
});

app.get('/api/signal/recent', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  res.json(signal.getRecent(limit));
});

app.get('/api/signal/timeline', (req, res) => {
  res.json(signal.getTimeline());
});

// ─── Admin Dashboard ────────────────────────────────────────
app.get('/admin/signals', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin-signals.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎮 NWGE Game Factory — http://0.0.0.0:${PORT}`);
  console.log(`   ${GENRES.length} genres | AI: ${aiEnabled ? 'enabled' : 'templates only'}`);
  console.log(`   Engine: ${NWGE_BIN}\n`);
});
