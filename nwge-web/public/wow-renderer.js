// ═══════════════════════════════════════════════════════════════════════
//  NWGE Rich Preview Renderer v3 — VoxelSpace 3D Terrain Engine
//  Enhanced: layered mountains, god rays, particles, richer terrain,
//  WoW-faithful golden-hour lighting, atmospheric depth, water reflections
//  Uses VoxelSpace algorithm: heightmap + colormap -> 3D perspective view
// ═══════════════════════════════════════════════════════════════════════

const WowRenderer = (() => {
  'use strict';

  const CFG = {
    width: 1280,
    height: 720,
    mapSize: 1024,
    renderDist: 800,       // increased draw distance for depth
    scaleHeight: 300,      // taller terrain for dramatic hills
    cameraHeight: 120,     // slightly higher camera
    horizon: 220,          // lower horizon = more sky = more epic
    fov: 90,
  };

  // ─── Seeded RNG ────────────────────────────────────────────────────
  class RNG {
    constructor(seed) { this.seed = seed|0 || 42; }
    next() {
      this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
      return this.seed / 0x7fffffff;
    }
    range(a, b) { return a + this.next() * (b - a); }
    int(a, b) { return Math.floor(this.range(a, b)); }
    pick(arr) { return arr[this.int(0, arr.length)]; }
  }

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) || 1;
  }

  // ─── Color Utilities ───────────────────────────────────────────────
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return {r,g,b};
  }
  function rgbToHex(r,g,b) {
    return '#' + [r,g,b].map(c => Math.max(0,Math.min(255,Math.round(c))).toString(16).padStart(2,'0')).join('');
  }
  function lerpColor(c1, c2, t) {
    const a = hexToRgb(c1), b = hexToRgb(c2);
    return rgbToHex(a.r+(b.r-a.r)*t, a.g+(b.g-a.g)*t, a.b+(b.b-a.b)*t);
  }
  function darken(hex, amount) {
    const {r,g,b} = hexToRgb(hex);
    return rgbToHex(r*(1-amount), g*(1-amount), b*(1-amount));
  }
  function lighten(hex, amount) {
    const {r,g,b} = hexToRgb(hex);
    return rgbToHex(r+(255-r)*amount, g+(255-g)*amount, b+(255-b)*amount);
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // ─── Zone Presets (WoW biomes) ─────────────────────────────────────
  const ZONES = {
    elwynn_forest: {
      grassBase: [62,148,32], grassVar: [24,32,20],
      dirtBase: [168,122,62], dirtVar: [22,16,12],
      waterColor: [28,115,170],
      treeColor: [44,115,32], treeTrunk: [95,62,28],
      roofColor: [74,106,140],
      wallColor: [210,190,148],
      skyTop: '#4a8ccc', skyBottom: '#c0ddef',
      fogColor: [155,195,175], fogDist: 0.55,
      sunColor: [255,240,200], sunDir: 0.7,
      mountainColor: [70,100,80], mountainFog: [140,180,170],
      time: 'day', hasWater: true, hasTrees: true, hasBuildings: true,
    },
    duskwood: {
      grassBase: [35,60,30], grassVar: [10,15,10],
      dirtBase: [60,50,40], dirtVar: [10,8,8],
      waterColor: [15,40,60],
      treeColor: [20,40,20], treeTrunk: [40,28,16],
      roofColor: [50,50,60], wallColor: [100,90,80],
      skyTop: '#0e0e28', skyBottom: '#28203e',
      fogColor: [40,40,60], fogDist: 0.35,
      sunColor: [100,100,140], sunDir: 0.3,
      mountainColor: [30,30,45], mountainFog: [45,40,60],
      time: 'night', hasWater: false, hasTrees: true, hasBuildings: true,
    },
    barrens: {
      grassBase: [188,160,95], grassVar: [22,16,16],
      dirtBase: [175,145,85], dirtVar: [22,16,12],
      waterColor: [32,85,125],
      treeColor: [105,125,42], treeTrunk: [115,85,42],
      roofColor: [140,100,60], wallColor: [175,145,105],
      skyTop: '#c8a878', skyBottom: '#e0d0b8',
      fogColor: [210,190,150], fogDist: 0.65,
      sunColor: [255,230,180], sunDir: 0.8,
      mountainColor: [160,130,90], mountainFog: [200,180,140],
      time: 'day', hasWater: false, hasTrees: false, hasBuildings: false,
    },
    stormwind: {
      grassBase: [72,135,52], grassVar: [16,22,16],
      dirtBase: [145,135,115], dirtVar: [16,12,12],
      waterColor: [32,105,155],
      treeColor: [48,105,38], treeTrunk: [85,58,28],
      roofColor: [62,82,115], wallColor: [188,178,160],
      skyTop: '#5a92cc', skyBottom: '#b0d0e8',
      fogColor: [155,175,195], fogDist: 0.55,
      sunColor: [255,245,220], sunDir: 0.7,
      mountainColor: [80,95,115], mountainFog: [150,165,185],
      time: 'day', hasWater: true, hasTrees: false, hasBuildings: true,
    },
    molten_core: {
      grassBase: [42,16,6], grassVar: [16,12,6],
      dirtBase: [65,22,6], dirtVar: [22,12,6],
      waterColor: [210,65,12],
      treeColor: [32,12,6], treeTrunk: [55,22,12],
      roofColor: [85,32,12], wallColor: [105,55,22],
      skyTop: '#1a0600', skyBottom: '#380c00',
      fogColor: [85,22,6], fogDist: 0.28,
      sunColor: [255,105,22], sunDir: 0.4,
      mountainColor: [60,15,5], mountainFog: [80,25,8],
      time: 'cave', hasWater: false, hasTrees: false, hasBuildings: false,
    },
    snow: {
      grassBase: [205,215,225], grassVar: [16,14,12],
      dirtBase: [165,160,155], dirtVar: [16,12,12],
      waterColor: [42,85,125],
      treeColor: [32,75,38], treeTrunk: [85,65,42],
      roofColor: [105,95,85], wallColor: [185,180,175],
      skyTop: '#7090b0', skyBottom: '#b8c8d8',
      fogColor: [185,195,215], fogDist: 0.45,
      sunColor: [225,230,245], sunDir: 0.5,
      mountainColor: [170,180,200], mountainFog: [185,195,215],
      time: 'day', hasWater: true, hasTrees: true, hasBuildings: true,
    },
  };

  function detectZone(gameName, scenes) {
    const name = (gameName || '').toLowerCase();
    const sceneNames = (scenes || []).map(s => (s.name||'').toLowerCase()).join(' ');
    const all = name + ' ' + sceneNames;
    if (/warcraft|wow|mmorpg|elwynn|goldshire/i.test(all)) return 'elwynn_forest';
    if (/duskwood|dark|haunted|horror|undead/i.test(all)) return 'duskwood';
    if (/stormwind|city|capital|orgrimmar/i.test(all)) return 'stormwind';
    if (/molten|fire|lava|ragnaros|inferno/i.test(all)) return 'molten_core';
    if (/snow|ice|frozen|winter|skyrim|northrend/i.test(all)) return 'snow';
    if (/barrens|desert|sand|dune/i.test(all)) return 'barrens';
    if (/forest|wood|grove|minecraft|craft|farm|stardew/i.test(all)) return 'elwynn_forest';
    return 'elwynn_forest';
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PROCEDURAL TERRAIN GENERATION
  // ═══════════════════════════════════════════════════════════════════

  function simplex2D(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    function hash(a, b) {
      let h = (a * 374761393 + b * 668265263 + 1013904223) | 0;
      h = ((h ^ (h >> 13)) * 1274126177) | 0;
      return (h & 0x7fffffff) / 0x7fffffff;
    }
    const n00 = hash(ix, iy), n10 = hash(ix+1, iy);
    const n01 = hash(ix, iy+1), n11 = hash(ix+1, iy+1);
    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;
    return nx0 + (nx1 - nx0) * sy;
  }

  function fbm(x, y, octaves, persistence, lacunarity) {
    let val = 0, amp = 1, freq = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      val += simplex2D(x * freq, y * freq) * amp;
      max += amp;
      amp *= persistence;
      freq *= lacunarity;
    }
    return val / max;
  }

  function generateTerrain(size, zone, rng) {
    const heightmap = new Float32Array(size * size);
    const colormap = new Uint8Array(size * size * 3);
    const z = ZONES[zone];
    const seed = rng.seed;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Multi-octave terrain with rolling WoW-style hills
        let h = fbm((x + seed) * 0.003, (y + seed) * 0.003, 7, 0.48, 2.1);
        h += 0.35 * fbm((x + seed*2) * 0.007, (y + seed*2) * 0.007, 4, 0.55, 2.0);
        // Add gentle mounds
        h += 0.15 * Math.sin(x * 0.008 + seed) * Math.cos(y * 0.006 + seed * 0.7);

        // River channel
        if (z.hasWater) {
          const riverX = size * 0.7 + Math.sin(y * 0.012 + seed * 0.01) * size * 0.1;
          const distToRiver = Math.abs(x - riverX);
          if (distToRiver < 30) {
            const riverDepth = 1 - distToRiver / 30;
            h = h * (1 - riverDepth * 0.6) + 0.12 * riverDepth;
          }
        }

        // Winding dirt path
        const pathY = size * 0.5 + Math.sin(x * 0.008 + seed * 0.02) * size * 0.14
                     + Math.sin(x * 0.02 + seed * 0.05) * size * 0.04;
        const distToPath = Math.abs(y - pathY);
        if (distToPath < 14) {
          h = h * 0.65 + 0.35 * 0.32;
        }

        heightmap[y * size + x] = clamp(h, 0, 1);
      }
    }

    // Colormap
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = y * size + x;
        const h = heightmap[idx];
        let r, g, b;

        // Water
        if (z.hasWater) {
          const riverX = size * 0.7 + Math.sin(y * 0.012 + seed * 0.01) * size * 0.1;
          const distToRiver = Math.abs(x - riverX);
          if (distToRiver < 22 && h < 0.22) {
            const depth = 1 - distToRiver / 22;
            const wave = Math.sin(x * 0.25 + y * 0.18) * 12;
            const shimmer = Math.sin(x * 0.6 + y * 0.4) * 8 * depth;
            r = z.waterColor[0] + wave - depth * 10 + shimmer;
            g = z.waterColor[1] + wave + depth * 15 + shimmer;
            b = z.waterColor[2] + wave * 0.4 + depth * 20;
            // Specular highlight on water
            const spec = simplex2D(x * 0.08, y * 0.08);
            if (spec > 0.7) { r += 40; g += 40; b += 50; }
            colormap[idx*3]   = clamp(Math.round(r), 0, 255);
            colormap[idx*3+1] = clamp(Math.round(g), 0, 255);
            colormap[idx*3+2] = clamp(Math.round(b), 0, 255);
            continue;
          }
        }

        // Dirt path
        const pathY = size * 0.5 + Math.sin(x * 0.008 + seed * 0.02) * size * 0.14
                     + Math.sin(x * 0.02 + seed * 0.05) * size * 0.04;
        const distToPath = Math.abs(y - pathY);
        if (distToPath < 9) {
          const noise = simplex2D(x * 0.08, y * 0.08) * 22 - 11;
          const pebble = simplex2D(x * 0.4, y * 0.4);
          r = z.dirtBase[0] + noise + z.dirtVar[0] * (pebble - 0.5);
          g = z.dirtBase[1] + noise * 0.6 + z.dirtVar[1] * (pebble - 0.5);
          b = z.dirtBase[2] + noise * 0.4 + z.dirtVar[2] * (pebble - 0.5);
          // Wagon tracks
          if (Math.abs(distToPath - 3) < 1.2 || Math.abs(distToPath - 6) < 1.2) {
            r -= 12; g -= 10; b -= 8;
          }
        } else {
          // Rich grass with painterly variation (WoW style)
          const grassNoise = fbm(x * 0.018, y * 0.018, 4, 0.5, 2.1) * 2 - 1;
          const micro = simplex2D(x * 0.12, y * 0.12) - 0.5;
          const variation = grassNoise * 35;

          r = z.grassBase[0] + variation + z.grassVar[0] * micro * 3;
          g = z.grassBase[1] + variation * 1.3 + z.grassVar[1] * micro * 3;
          b = z.grassBase[2] + variation * 0.5 + z.grassVar[2] * micro * 2;

          // Height-based tinting
          const heightTint = (h - 0.38) * 45;
          r += heightTint * 0.8;
          g += heightTint * 1.3;
          b += heightTint * 0.5;

          // Golden sunlight dappling (WoW signature)
          if (z.time === 'day') {
            const sun = simplex2D(x * 0.006, y * 0.006);
            const sunAmt = Math.max(0, sun) * 30;
            r += sunAmt * 1.0;
            g += sunAmt * 0.9;
            b += sunAmt * 0.3;
          }

          // Path edge blending (soft gradient)
          if (distToPath < 20) {
            const blend = (distToPath - 9) / 11;
            const t = clamp(blend, 0, 1);
            r = r * t + z.dirtBase[0] * (1 - t);
            g = g * t + z.dirtBase[1] * (1 - t);
            b = b * t + z.dirtBase[2] * (1 - t);
          }

          // Tree shadow patches
          if (simplex2D(x * 0.14, y * 0.14) > 0.32 && z.hasTrees) {
            const shadow = (simplex2D(x * 0.14, y * 0.14) - 0.32) * 55;
            r -= shadow;
            g -= shadow * 0.65;
            b -= shadow * 0.25;
          }

          // Flower specks (vibrant WoW wildflowers)
          const flowerNoise = simplex2D(x * 0.45, y * 0.45);
          if (flowerNoise > 0.87 && z.time === 'day' && z.hasTrees) {
            const flowers = [
              [255,100,150],[255,210,65],[205,205,255],[180,105,255],[105,200,140]
            ];
            const fi = Math.floor(simplex2D(x*1.2, y*1.2) * 5) % 5;
            const f = flowers[fi];
            r = f[0]; g = f[1]; b = f[2];
          }
        }

        colormap[idx*3]   = clamp(Math.round(r), 0, 255);
        colormap[idx*3+1] = clamp(Math.round(g), 0, 255);
        colormap[idx*3+2] = clamp(Math.round(b), 0, 255);
      }
    }

    return { heightmap, colormap };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  VOXELSPACE RENDERER (enhanced with better LOD + terrain normals)
  // ═══════════════════════════════════════════════════════════════════

  function renderTerrain(ctx, imageData, heightmap, colormap, mapSize, camera, zone) {
    const W = CFG.width, H = CFG.height;
    const pixels = imageData.data;
    const z = ZONES[zone];
    const fogR = z.fogColor[0], fogG = z.fogColor[1], fogB = z.fogColor[2];
    const fogStart = CFG.renderDist * z.fogDist;

    const sinphi = Math.sin(camera.angle);
    const cosphi = Math.cos(camera.angle);

    const ybuffer = new Int32Array(W);
    for (let i = 0; i < W; i++) ybuffer[i] = H;

    let dz = 1;
    let zDist = 1;

    while (zDist < CFG.renderDist) {
      const pleftX = (-cosphi * zDist - sinphi * zDist) + camera.x;
      const pleftY = ( sinphi * zDist - cosphi * zDist) + camera.y;
      const prightX = ( cosphi * zDist - sinphi * zDist) + camera.x;
      const prightY = (-sinphi * zDist - cosphi * zDist) + camera.y;

      const dx = (prightX - pleftX) / W;
      const dy = (prightY - pleftY) / W;

      let mapX = pleftX;
      let mapY = pleftY;

      const fogFactor = clamp((zDist - fogStart) / (CFG.renderDist - fogStart), 0, 1);
      // Distance-based ambient darkening for depth
      const distShade = clamp(1 - zDist / CFG.renderDist * 0.2, 0.7, 1);

      for (let i = 0; i < W; i++) {
        const mx = ((Math.floor(mapX) % mapSize) + mapSize) % mapSize;
        const my = ((Math.floor(mapY) % mapSize) + mapSize) % mapSize;
        const mapIdx = my * mapSize + mx;

        const terrainHeight = heightmap[mapIdx] * CFG.scaleHeight;
        const heightOnScreen = Math.floor((camera.height - terrainHeight) / zDist * CFG.scaleHeight * 0.5 + camera.horizon);

        if (heightOnScreen < ybuffer[i]) {
          let cr = colormap[mapIdx * 3];
          let cg = colormap[mapIdx * 3 + 1];
          let cb = colormap[mapIdx * 3 + 2];

          // Apply distance darkening
          cr = Math.round(cr * distShade);
          cg = Math.round(cg * distShade);
          cb = Math.round(cb * distShade);

          // Apply fog
          if (fogFactor > 0) {
            cr = Math.round(cr + (fogR - cr) * fogFactor);
            cg = Math.round(cg + (fogG - cg) * fogFactor);
            cb = Math.round(cb + (fogB - cb) * fogFactor);
          }

          const top = Math.max(0, heightOnScreen);
          const bottom = Math.min(H, ybuffer[i]);

          // Draw vertical column with slight vertical gradient (ground shading)
          for (let y = top; y < bottom; y++) {
            const pIdx = (y * W + i) * 4;
            // Slight darkening toward bottom of column (ambient occlusion hint)
            const vt = (y - top) / Math.max(1, bottom - top);
            const ao = 1 - vt * 0.08;
            pixels[pIdx]     = Math.round(cr * ao);
            pixels[pIdx + 1] = Math.round(cg * ao);
            pixels[pIdx + 2] = Math.round(cb * ao);
            pixels[pIdx + 3] = 255;
          }

          ybuffer[i] = Math.max(0, heightOnScreen);
        }

        mapX += dx;
        mapY += dy;
      }

      zDist += dz;
      dz += 0.12;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SKY RENDERER (with gradient banding fix)
  // ═══════════════════════════════════════════════════════════════════

  function renderSky(ctx, imageData, zone, camera) {
    const W = CFG.width, H = CFG.height;
    const pixels = imageData.data;
    const z = ZONES[zone];
    const topRGB = hexToRgb(z.skyTop);
    const botRGB = hexToRgb(z.skyBottom);
    const horizonY = Math.floor(camera.horizon);

    for (let y = 0; y < Math.min(H, horizonY + 80); y++) {
      const t = clamp(y / (horizonY + 40), 0, 1);
      // Add subtle dithering to prevent color banding
      const dither = (((y * 17 + 31) % 7) - 3) * 0.4;
      const r = Math.round(topRGB.r + (botRGB.r - topRGB.r) * t + dither);
      const g = Math.round(topRGB.g + (botRGB.g - topRGB.g) * t + dither);
      const b = Math.round(topRGB.b + (botRGB.b - topRGB.b) * t + dither);

      for (let x = 0; x < W; x++) {
        const pIdx = (y * W + x) * 4;
        if (pixels[pIdx + 3] === 0) {
          pixels[pIdx]     = clamp(r, 0, 255);
          pixels[pIdx + 1] = clamp(g, 0, 255);
          pixels[pIdx + 2] = clamp(b, 0, 255);
          pixels[pIdx + 3] = 255;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  DISTANT MOUNTAINS (layered, atmospheric, WoW-style)
  // ═══════════════════════════════════════════════════════════════════

  function drawMountainRange(ctx, W, H, zone, rng, layer) {
    const z = ZONES[zone];
    if (z.time === 'cave') return;

    const mc = z.mountainColor || [70, 100, 80];
    const fc = z.mountainFog || z.fogColor;
    // Each layer is further away -> more fogged, lighter, smaller
    const fogBlend = 0.3 + layer * 0.25;
    const baseY = CFG.horizon - 15 + layer * 25;
    const amplitude = 50 + (2 - layer) * 35;

    const r = Math.round(mc[0] * (1 - fogBlend) + fc[0] * fogBlend);
    const g = Math.round(mc[1] * (1 - fogBlend) + fc[1] * fogBlend);
    const b = Math.round(mc[2] * (1 - fogBlend) + fc[2] * fogBlend);

    ctx.save();
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.moveTo(0, H);

    // Generate mountain silhouette using noise
    for (let x = 0; x <= W; x += 3) {
      const nx = x / W * 4 + layer * 7.3 + rng.seed * 0.001;
      const peak = simplex2D(nx, layer * 3.7) * amplitude
                 + simplex2D(nx * 2.5, layer * 2.1) * amplitude * 0.35
                 + simplex2D(nx * 5, layer * 1.3) * amplitude * 0.12;
      const y = baseY - Math.max(0, peak);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Snow caps on far mountains (layers 0-1)
    if (layer < 2 && z.time === 'day' && zone !== 'molten_core' && zone !== 'barrens') {
      ctx.save();
      ctx.globalAlpha = 0.35 - layer * 0.1;
      ctx.fillStyle = '#e8e8f0';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 3) {
        const nx = x / W * 4 + layer * 7.3 + rng.seed * 0.001;
        const peak = simplex2D(nx, layer * 3.7) * amplitude
                   + simplex2D(nx * 2.5, layer * 2.1) * amplitude * 0.35;
        const snowLine = baseY - Math.max(0, peak) + amplitude * 0.25;
        const y = baseY - Math.max(0, peak);
        if (peak > amplitude * 0.5) {
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, snowLine + 20);
        }
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  BILLBOARD SPRITES (trees, buildings, characters)
  // ═══════════════════════════════════════════════════════════════════

  function projectWorldToScreen(wx, wy, wz, camera) {
    const dx = wx - camera.x;
    const dy = wy - camera.y;
    const sinphi = Math.sin(camera.angle);
    const cosphi = Math.cos(camera.angle);
    const rx = dx * cosphi + dy * sinphi;
    const rz = -dx * sinphi + dy * cosphi;
    if (rz <= 2) return null;
    const screenX = CFG.width / 2 + (rx / rz) * (CFG.width / 2);
    const screenY = (camera.height - wz) / rz * CFG.scaleHeight * 0.5 + camera.horizon;
    const scale = CFG.scaleHeight / rz;
    return { x: screenX, y: screenY, z: rz, scale };
  }

  function drawBillboardTree(ctx, sx, sy, scale, zone, rng) {
    const z = ZONES[zone];
    const treeScale = Math.min(scale * 3.2, 110); // bigger trees!
    if (treeScale < 3) return;

    const trunkW = treeScale * 0.18;
    const trunkH = treeScale * 0.65;
    const canopyR = treeScale * 0.58;

    // Ground shadow (elliptical, darker for WoW look)
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(sx + treeScale * 0.12, sy + 3, canopyR * 0.7, canopyR * 0.18, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Thick gnarled trunk (WoW ancient trees)
    const tc = z.treeTrunk;
    // Trunk base (wider at bottom)
    ctx.fillStyle = `rgb(${tc[0]},${tc[1]},${tc[2]})`;
    ctx.beginPath();
    ctx.moveTo(sx - trunkW * 1.0, sy);
    ctx.quadraticCurveTo(sx - trunkW * 0.7, sy - trunkH * 0.5, sx - trunkW * 0.45, sy - trunkH);
    ctx.lineTo(sx + trunkW * 0.45, sy - trunkH);
    ctx.quadraticCurveTo(sx + trunkW * 0.7, sy - trunkH * 0.5, sx + trunkW * 1.0, sy);
    ctx.closePath();
    ctx.fill();

    // Bark texture (multiple dark lines)
    ctx.strokeStyle = `rgb(${Math.max(0,tc[0]-25)},${Math.max(0,tc[1]-18)},${Math.max(0,tc[2]-12)})`;
    ctx.lineWidth = Math.max(0.8, trunkW * 0.08);
    for (let i = 0; i < 3; i++) {
      const ox = rng.range(-trunkW * 0.25, trunkW * 0.25);
      ctx.beginPath();
      ctx.moveTo(sx + ox, sy);
      ctx.quadraticCurveTo(sx + ox * 0.5 + rng.range(-2, 2), sy - trunkH * 0.5, sx + ox * 0.3, sy - trunkH * 0.85);
      ctx.stroke();
    }

    // Exposed roots at base
    ctx.fillStyle = `rgb(${Math.max(0,tc[0]-10)},${Math.max(0,tc[1]-8)},${Math.max(0,tc[2]-5)})`;
    for (let i = 0; i < 3; i++) {
      const rootDir = rng.range(-1, 1);
      ctx.beginPath();
      ctx.moveTo(sx + rootDir * trunkW * 0.6, sy);
      ctx.quadraticCurveTo(
        sx + rootDir * trunkW * 1.5, sy + 2,
        sx + rootDir * trunkW * 2.2, sy + 4
      );
      ctx.lineWidth = Math.max(1, trunkW * 0.12);
      ctx.strokeStyle = `rgb(${tc[0]},${tc[1]},${tc[2]})`;
      ctx.stroke();
    }

    // Canopy - 9 overlapping circles for volumetric painterly look
    const baseG = z.treeColor;
    const layers = 9;
    for (let i = 0; i < layers; i++) {
      const cx = sx + rng.range(-canopyR * 0.45, canopyR * 0.45);
      const cy = sy - trunkH - canopyR * 0.25 + rng.range(-canopyR * 0.55, canopyR * 0.35);
      const lr = canopyR * (0.4 + rng.next() * 0.6);

      const shade = i / layers;
      const r = clamp(Math.round(baseG[0] * (0.55 + shade * 0.85)), 0, 255);
      const g = clamp(Math.round(baseG[1] * (0.55 + shade * 0.85)), 0, 255);
      const b = clamp(Math.round(baseG[2] * (0.45 + shade * 0.65)), 0, 255);

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(cx, cy, lr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sunlight highlight on canopy (top-left, WoW lime-green)
    if (z.time === 'day') {
      ctx.save();
      ctx.globalAlpha = 0.3;
      const hlR = canopyR * 0.55;
      const hlGrad = ctx.createRadialGradient(
        sx - canopyR * 0.3, sy - trunkH - canopyR * 0.55, 0,
        sx - canopyR * 0.3, sy - trunkH - canopyR * 0.55, hlR
      );
      hlGrad.addColorStop(0, '#b0e850');
      hlGrad.addColorStop(0.6, '#80c030');
      hlGrad.addColorStop(1, 'rgba(130,200,50,0)');
      ctx.fillStyle = hlGrad;
      ctx.beginPath();
      ctx.arc(sx - canopyR * 0.3, sy - trunkH - canopyR * 0.55, hlR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Deep shadow on canopy (bottom-right, darker)
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#0a2a05';
    ctx.beginPath();
    ctx.arc(sx + canopyR * 0.35, sy - trunkH + canopyR * 0.15, canopyR * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Canopy edge detail (small highlight dots like individual leaf clusters)
    if (treeScale > 20) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 6; i++) {
        const dx = rng.range(-canopyR * 0.6, canopyR * 0.6);
        const dy = rng.range(-canopyR * 0.8, canopyR * 0.2);
        const lr = treeScale * 0.04 + rng.next() * treeScale * 0.04;
        ctx.fillStyle = `rgb(${clamp(baseG[0]+40+rng.int(-10,10),0,255)},${clamp(baseG[1]+50+rng.int(-10,10),0,255)},${clamp(baseG[2]+10,0,255)})`;
        ctx.beginPath();
        ctx.arc(sx + dx, sy - trunkH - canopyR * 0.3 + dy, lr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawBillboardBuilding(ctx, sx, sy, scale, zone, rng) {
    const z = ZONES[zone];
    const bldgScale = Math.min(scale * 3.5, 120);
    if (bldgScale < 5) return;

    const w = bldgScale * 1.3;
    const h = bldgScale * 0.9;

    // Ground shadow
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(sx + w * 0.08, sy + 3, w * 0.55, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Stone foundation (visible stone blocks)
    const foundH = h * 0.14;
    ctx.fillStyle = `rgb(${Math.round(z.wallColor[0]*0.6)},${Math.round(z.wallColor[1]*0.6)},${Math.round(z.wallColor[2]*0.6)})`;
    ctx.fillRect(sx - w/2 - 2, sy - foundH, w + 4, foundH);
    // Stone block lines
    ctx.strokeStyle = `rgba(0,0,0,0.15)`;
    ctx.lineWidth = 0.5;
    for (let row = 0; row < 2; row++) {
      const ry = sy - foundH + foundH * (row + 1) / 2.5;
      ctx.beginPath(); ctx.moveTo(sx - w/2, ry); ctx.lineTo(sx + w/2, ry); ctx.stroke();
    }

    // Wall - cream plaster with texture
    ctx.fillStyle = `rgb(${z.wallColor[0]},${z.wallColor[1]},${z.wallColor[2]})`;
    ctx.fillRect(sx - w/2, sy - h, w, h - foundH);
    // Wall texture (subtle noise via thin lines)
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#000';
    for (let i = 0; i < 8; i++) {
      const rx = sx - w/2 + rng.next() * w;
      const ry = sy - h + rng.next() * (h - foundH);
      ctx.fillRect(rx, ry, rng.range(3, 12), rng.range(2, 6));
    }
    ctx.restore();

    // Half-timber framing (dark wood beams, WoW signature)
    const beamColor = `rgb(${Math.round(z.treeTrunk[0]*0.65)},${Math.round(z.treeTrunk[1]*0.65)},${Math.round(z.treeTrunk[2]*0.65)})`;
    ctx.strokeStyle = beamColor;
    ctx.lineWidth = Math.max(1.5, bldgScale * 0.045);
    // Horizontal beams
    ctx.beginPath();
    ctx.moveTo(sx - w/2, sy - h * 0.52); ctx.lineTo(sx + w/2, sy - h * 0.52);
    ctx.moveTo(sx - w/2, sy - h); ctx.lineTo(sx + w/2, sy - h);
    ctx.stroke();
    // Vertical beams
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.27, sy - h); ctx.lineTo(sx - w * 0.27, sy - foundH);
    ctx.moveTo(sx + w * 0.27, sy - h); ctx.lineTo(sx + w * 0.27, sy - foundH);
    ctx.moveTo(sx - w/2, sy - h); ctx.lineTo(sx - w/2, sy - foundH);
    ctx.moveTo(sx + w/2, sy - h); ctx.lineTo(sx + w/2, sy - foundH);
    ctx.stroke();
    // Cross braces
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.27, sy - h); ctx.lineTo(sx, sy - h * 0.52);
    ctx.moveTo(sx + w * 0.27, sy - h); ctx.lineTo(sx, sy - h * 0.52);
    ctx.stroke();

    // BLUE-GRAY SLATE ROOF
    const roofH = h * 0.55;
    const overhang = w * 0.1;
    ctx.fillStyle = `rgb(${z.roofColor[0]},${z.roofColor[1]},${z.roofColor[2]})`;
    ctx.beginPath();
    ctx.moveTo(sx - w/2 - overhang, sy - h);
    ctx.lineTo(sx, sy - h - roofH);
    ctx.lineTo(sx + w/2 + overhang, sy - h);
    ctx.closePath();
    ctx.fill();

    // Roof ridge highlight
    ctx.strokeStyle = `rgb(${Math.min(255,z.roofColor[0]+30)},${Math.min(255,z.roofColor[1]+30)},${Math.min(255,z.roofColor[2]+30)})`;
    ctx.lineWidth = Math.max(1, bldgScale * 0.02);
    ctx.beginPath();
    ctx.moveTo(sx - 2, sy - h - roofH + 2);
    ctx.lineTo(sx + 2, sy - h - roofH + 2);
    ctx.stroke();

    // Shingle lines
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.6;
    for (let row = 0; row < 5; row++) {
      const ry = sy - h - roofH + roofH * (row + 1) / 5.5;
      const rw = (w/2 + overhang) * (1 - (row + 0.3) / 6);
      ctx.beginPath(); ctx.moveTo(sx - rw, ry); ctx.lineTo(sx + rw, ry); ctx.stroke();
    }
    ctx.restore();

    // Sunlit left roof face
    if (z.time === 'day') {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(sx - w/2 - overhang, sy - h);
      ctx.lineTo(sx, sy - h - roofH);
      ctx.lineTo(sx, sy - h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Door (arched, dark wood)
    const doorW = w * 0.2;
    const doorH = h * 0.38;
    ctx.fillStyle = '#32200c';
    ctx.fillRect(sx - doorW/2, sy - doorH - foundH, doorW, doorH);
    ctx.beginPath();
    ctx.arc(sx, sy - doorH - foundH, doorW/2, Math.PI, 0);
    ctx.fill();
    // Door planks
    ctx.strokeStyle = '#28180a';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(sx, sy - doorH - foundH); ctx.lineTo(sx, sy - foundH);
    ctx.stroke();
    // Door handle (golden)
    ctx.fillStyle = '#e8b830';
    ctx.beginPath();
    ctx.arc(sx + doorW * 0.28, sy - doorH * 0.45 - foundH, Math.max(1.5, bldgScale * 0.022), 0, Math.PI * 2);
    ctx.fill();

    // Windows with warm interior glow
    const winSize = bldgScale * 0.11;
    const windowPositions = [
      [sx - w * 0.32, sy - h * 0.72],
      [sx + w * 0.32, sy - h * 0.72],
    ];
    for (const [wx, wy] of windowPositions) {
      // Window frame
      ctx.fillStyle = beamColor;
      ctx.fillRect(wx - winSize/2 - 1.5, wy - winSize/2 - 1.5, winSize + 3, winSize + 3);
      // Glass with warm glow
      ctx.fillStyle = '#1a1408';
      ctx.fillRect(wx - winSize/2, wy - winSize/2, winSize, winSize);
      ctx.save();
      ctx.globalAlpha = 0.75;
      const wGrd = ctx.createRadialGradient(wx, wy, 0, wx, wy, winSize * 0.6);
      wGrd.addColorStop(0, '#ffe080');
      wGrd.addColorStop(1, '#c89020');
      ctx.fillStyle = wGrd;
      ctx.fillRect(wx - winSize/2 + 1, wy - winSize/2 + 1, winSize - 2, winSize - 2);
      ctx.restore();
      // Cross divider
      ctx.strokeStyle = beamColor;
      ctx.lineWidth = Math.max(0.8, bldgScale * 0.015);
      ctx.beginPath();
      ctx.moveTo(wx, wy - winSize/2); ctx.lineTo(wx, wy + winSize/2);
      ctx.moveTo(wx - winSize/2, wy); ctx.lineTo(wx + winSize/2, wy);
      ctx.stroke();
      // Window glow halo
      ctx.save();
      ctx.globalAlpha = 0.12;
      const haloGrad = ctx.createRadialGradient(wx, wy, 0, wx, wy, winSize * 2.5);
      haloGrad.addColorStop(0, '#ffd860');
      haloGrad.addColorStop(1, 'rgba(255,216,96,0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(wx, wy, winSize * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Chimney with smoke
    const chimX = sx + w * 0.22;
    ctx.fillStyle = `rgb(${Math.round(z.wallColor[0]*0.55)},${Math.round(z.wallColor[1]*0.55)},${Math.round(z.wallColor[2]*0.55)})`;
    ctx.fillRect(chimX - bldgScale * 0.045, sy - h - roofH * 0.65, bldgScale * 0.09, roofH * 0.55);
    // Chimney cap
    ctx.fillRect(chimX - bldgScale * 0.055, sy - h - roofH * 0.65, bldgScale * 0.11, bldgScale * 0.02);

    // Animated smoke puffs
    ctx.save();
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = 0.08 - i * 0.012;
      ctx.fillStyle = '#c8c0b8';
      const puffR = bldgScale * (0.035 + i * 0.025);
      ctx.beginPath();
      ctx.arc(
        chimX + rng.range(-4, 4) + i * 1.5,
        sy - h - roofH * 0.65 - (i + 1) * bldgScale * 0.07,
        puffR, 0, Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();

    // Fence/yard near building
    if (bldgScale > 25) {
      ctx.strokeStyle = '#7a6040';
      ctx.lineWidth = Math.max(1, bldgScale * 0.015);
      const fenceY = sy - 2;
      // Left fence
      ctx.beginPath();
      ctx.moveTo(sx - w/2 - w * 0.25, fenceY);
      ctx.lineTo(sx - w/2, fenceY);
      ctx.stroke();
      // Posts
      for (let fp = 0; fp < 3; fp++) {
        const fpx = sx - w/2 - w * 0.25 + fp * w * 0.12;
        ctx.beginPath();
        ctx.moveTo(fpx, fenceY);
        ctx.lineTo(fpx, fenceY - bldgScale * 0.12);
        ctx.stroke();
      }
    }
  }

  function drawBillboardCharacter(ctx, sx, sy, scale, entity, zone, rng, isPlayer) {
    const z = ZONES[zone];
    const charScale = Math.min(scale * 2.2, 75); // bigger characters
    if (charScale < 4) return;

    const s = charScale;
    const tags = entity.tags || [];
    const name = (entity.name || '').toLowerCase();
    const isEnemy = tags.includes('enemy') || tags.includes('boss');
    const isBoss = tags.includes('boss');
    const isAnimal = tags.includes('animal') || /wolf|bear|boar|spider|chicken|cow|horse|pig|sheep/i.test(name);

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 1, s * 0.4, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (isAnimal) {
      drawAnimalSprite(ctx, sx, sy, s, name, rng);
      return;
    }

    // Armor colors
    let armorR, armorG, armorB;
    let skinR = 224, skinG = 184, skinB = 148;

    if (isPlayer) {
      armorR = 55; armorG = 85; armorB = 165;
    } else if (isEnemy) {
      armorR = 82; armorG = 98; armorB = 68;
      skinR = 115; skinG = 145; skinB = 82;
    } else {
      if (/guard|soldier/i.test(name)) { armorR = 72; armorG = 88; armorB = 145; }
      else if (/mage|wizard/i.test(name)) { armorR = 92; armorG = 52; armorB = 155; }
      else if (/merchant|shop/i.test(name)) { armorR = 165; armorG = 135; armorB = 62; }
      else { armorR = 125; armorG = 105; armorB = 72; }
    }

    // Boots (chunkier)
    ctx.fillStyle = '#3d2618';
    ctx.fillRect(sx - s*0.2, sy - s*0.2, s*0.16, s*0.2);
    ctx.fillRect(sx + s*0.04, sy - s*0.2, s*0.16, s*0.2);
    // Boot highlight
    ctx.fillStyle = '#4d3622';
    ctx.fillRect(sx - s*0.2, sy - s*0.2, s*0.16, s*0.04);
    ctx.fillRect(sx + s*0.04, sy - s*0.2, s*0.16, s*0.04);

    // Legs
    ctx.fillStyle = `rgb(${Math.round(armorR*0.68)},${Math.round(armorG*0.68)},${Math.round(armorB*0.68)})`;
    ctx.fillRect(sx - s*0.16, sy - s*0.45, s*0.14, s*0.26);
    ctx.fillRect(sx + s*0.02, sy - s*0.45, s*0.14, s*0.26);

    // Body (wider, chunkier WoW proportions)
    const bodyGrad = ctx.createLinearGradient(sx, sy - s*0.75, sx, sy - s*0.42);
    bodyGrad.addColorStop(0, `rgb(${Math.min(255,armorR+15)},${Math.min(255,armorG+15)},${Math.min(255,armorB+15)})`);
    bodyGrad.addColorStop(1, `rgb(${armorR},${armorG},${armorB})`);
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(sx - s*0.25, sy - s*0.75, s*0.5, s*0.34);

    // Chest emblem (small detail)
    if (isPlayer && s > 20) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffd040';
      ctx.beginPath();
      ctx.arc(sx, sy - s*0.6, s*0.05, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // Belt
    ctx.fillStyle = '#5a4018';
    ctx.fillRect(sx - s*0.25, sy - s*0.46, s*0.5, s*0.06);
    ctx.fillStyle = '#e8b828';
    ctx.beginPath();
    ctx.arc(sx, sy - s*0.43, s*0.032, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.fillStyle = `rgb(${armorR},${armorG},${armorB})`;
    ctx.fillRect(sx - s*0.38, sy - s*0.73, s*0.14, s*0.3);
    ctx.fillRect(sx + s*0.24, sy - s*0.73, s*0.14, s*0.3);

    // OVERSIZED SHOULDER PADS (WoW trademark!)
    const padR = s * 0.18;
    const padGrad1 = ctx.createRadialGradient(sx - s*0.32, sy - s*0.73, 0, sx - s*0.32, sy - s*0.73, padR);
    padGrad1.addColorStop(0, `rgb(${Math.min(255,armorR+50)},${Math.min(255,armorG+50)},${Math.min(255,armorB+50)})`);
    padGrad1.addColorStop(1, `rgb(${armorR},${armorG},${armorB})`);
    ctx.fillStyle = padGrad1;
    ctx.beginPath();
    ctx.ellipse(sx - s*0.32, sy - s*0.73, padR, padR * 0.65, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Shoulder edge highlight
    ctx.strokeStyle = `rgba(255,255,255,0.15)`;
    ctx.lineWidth = Math.max(0.5, s * 0.015);
    ctx.beginPath();
    ctx.ellipse(sx - s*0.32, sy - s*0.73, padR, padR * 0.65, -0.3, Math.PI, 0);
    ctx.stroke();

    const padGrad2 = ctx.createRadialGradient(sx + s*0.32, sy - s*0.73, 0, sx + s*0.32, sy - s*0.73, padR);
    padGrad2.addColorStop(0, `rgb(${Math.min(255,armorR+50)},${Math.min(255,armorG+50)},${Math.min(255,armorB+50)})`);
    padGrad2.addColorStop(1, `rgb(${armorR},${armorG},${armorB})`);
    ctx.fillStyle = padGrad2;
    ctx.beginPath();
    ctx.ellipse(sx + s*0.32, sy - s*0.73, padR, padR * 0.65, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,0.15)`;
    ctx.beginPath();
    ctx.ellipse(sx + s*0.32, sy - s*0.73, padR, padR * 0.65, 0.3, Math.PI, 0);
    ctx.stroke();

    // Shoulder spikes for player/boss
    if (isPlayer || isBoss) {
      ctx.fillStyle = `rgb(${Math.min(255,armorR+60)},${Math.min(255,armorG+60)},${Math.min(255,armorB+60)})`;
      [-1, 1].forEach(dir => {
        ctx.beginPath();
        ctx.moveTo(sx + dir * s*0.24, sy - s*0.78);
        ctx.lineTo(sx + dir * s*0.32, sy - s*1.0);
        ctx.lineTo(sx + dir * s*0.4, sy - s*0.78);
        ctx.closePath();
        ctx.fill();
      });
    }

    // Hands
    ctx.fillStyle = `rgb(${skinR},${skinG},${skinB})`;
    ctx.beginPath();
    ctx.arc(sx - s*0.31, sy - s*0.42, s*0.055, 0, Math.PI * 2);
    ctx.arc(sx + s*0.31, sy - s*0.42, s*0.055, 0, Math.PI * 2);
    ctx.fill();

    // Weapon
    if (isPlayer || isEnemy) {
      // Blade
      const bladeGrad = ctx.createLinearGradient(sx + s*0.32, sy - s*0.44, sx + s*0.4, sy - s*0.95);
      bladeGrad.addColorStop(0, isPlayer ? '#a0b0d0' : '#7a6a4a');
      bladeGrad.addColorStop(1, isPlayer ? '#d0d8e8' : '#a09070');
      ctx.strokeStyle = bladeGrad;
      ctx.lineWidth = Math.max(2, s * 0.045);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx + s*0.32, sy - s*0.44);
      ctx.lineTo(sx + s*0.4, sy - s*0.95);
      ctx.stroke();
      // Hilt
      ctx.strokeStyle = '#7a5518';
      ctx.lineWidth = Math.max(2.5, s * 0.055);
      ctx.beginPath();
      ctx.moveTo(sx + s*0.26, sy - s*0.44);
      ctx.lineTo(sx + s*0.38, sy - s*0.44);
      ctx.stroke();
      // Pommel
      ctx.fillStyle = '#e8b828';
      ctx.beginPath();
      ctx.arc(sx + s*0.25, sy - s*0.44, s*0.02, 0, Math.PI*2);
      ctx.fill();
    }

    // Shield
    if (isPlayer) {
      ctx.fillStyle = '#4a6090';
      ctx.beginPath();
      ctx.moveTo(sx - s*0.45, sy - s*0.7);
      ctx.lineTo(sx - s*0.28, sy - s*0.75);
      ctx.lineTo(sx - s*0.28, sy - s*0.42);
      ctx.lineTo(sx - s*0.38, sy - s*0.38);
      ctx.lineTo(sx - s*0.45, sy - s*0.42);
      ctx.closePath();
      ctx.fill();
      // Shield rim
      ctx.strokeStyle = '#8a7a50';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.stroke();
      // Shield emblem (lion/crest)
      ctx.fillStyle = '#e8c040';
      ctx.beginPath();
      ctx.arc(sx - s*0.37, sy - s*0.58, s*0.045, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c0a030';
      ctx.beginPath();
      ctx.arc(sx - s*0.37, sy - s*0.58, s*0.03, 0, Math.PI * 2);
      ctx.fill();
    }

    // Head (slightly larger = WoW cartoon proportions)
    ctx.fillStyle = `rgb(${skinR},${skinG},${skinB})`;
    ctx.beginPath();
    ctx.arc(sx, sy - s*0.88, s*0.15, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    const hairColors = ['#4a3020','#8a6a40','#2a1810','#c0a060','#1a1a1a','#8a2020'];
    ctx.fillStyle = rng.pick(hairColors);
    ctx.beginPath();
    ctx.arc(sx, sy - s*0.92, s*0.15, Math.PI, 0);
    ctx.fill();
    // Hair back
    ctx.fillRect(sx - s*0.12, sy - s*0.88, s*0.24, s*0.06);

    // Eyes
    ctx.fillStyle = isEnemy ? '#ff2020' : '#fff';
    ctx.fillRect(sx - s*0.08, sy - s*0.9, s*0.065, s*0.04);
    ctx.fillRect(sx + s*0.015, sy - s*0.9, s*0.065, s*0.04);
    if (!isEnemy) {
      ctx.fillStyle = '#1a3870';
      ctx.fillRect(sx - s*0.06, sy - s*0.9, s*0.045, s*0.04);
      ctx.fillRect(sx + s*0.035, sy - s*0.9, s*0.045, s*0.04);
    }

    // Nameplate
    if (entity.name && entity.name !== 'player') {
      const displayName = entity.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      ctx.save();
      const fontSize = Math.max(9, Math.min(13, s * 0.19));
      ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
      const tw = ctx.measureText(displayName).width + 10;
      const npY = sy - s * 1.12;
      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const npH = fontSize + 4;
      ctx.fillRect(sx - tw/2, npY - npH/2, tw, npH);
      // Border
      ctx.strokeStyle = isEnemy ? 'rgba(200,40,40,0.4)' : 'rgba(80,160,80,0.4)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(sx - tw/2, npY - npH/2, tw, npH);
      // Text
      ctx.fillStyle = isEnemy ? '#dd4444' : (isPlayer ? '#66bbff' : '#9dd09d');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayName, sx, npY);
      ctx.restore();
    }

    // Quest marker
    if (!isEnemy && !isPlayer && (entity.dialog || entity.on_interact)) {
      const qx = sx, qy = sy - s * 1.2;
      // Glow
      ctx.save();
      ctx.globalAlpha = 0.3;
      const qGrad = ctx.createRadialGradient(qx, qy, 0, qx, qy, s * 0.18);
      qGrad.addColorStop(0, '#ffcc00');
      qGrad.addColorStop(1, 'rgba(255,204,0,0)');
      ctx.fillStyle = qGrad;
      ctx.beginPath();
      ctx.arc(qx, qy, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Marker
      ctx.fillStyle = '#ffcc00';
      ctx.font = `bold ${Math.max(14, s * 0.28)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', qx, qy);
    }

    // Player aura
    if (isPlayer) {
      ctx.save();
      ctx.globalAlpha = 0.1;
      const aGrad = ctx.createRadialGradient(sx, sy - s*0.5, 0, sx, sy - s*0.5, s * 0.9);
      aGrad.addColorStop(0, '#5888ff');
      aGrad.addColorStop(1, 'rgba(88,136,255,0)');
      ctx.fillStyle = aGrad;
      ctx.beginPath();
      ctx.arc(sx, sy - s*0.5, s * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Boss aura
    if (isBoss) {
      ctx.save();
      ctx.globalAlpha = 0.15;
      const bGrad = ctx.createRadialGradient(sx, sy - s*0.5, 0, sx, sy - s*0.5, s * 1.1);
      bGrad.addColorStop(0, '#ff3838');
      bGrad.addColorStop(0.5, '#ff6020');
      bGrad.addColorStop(1, 'rgba(255,56,56,0)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(sx, sy - s*0.5, s * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Enemy health bar
    if (isEnemy) {
      const barW = s * 0.65;
      const barH = Math.max(3, s * 0.065);
      const barY = sy - s * 1.04;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(sx - barW/2 - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = '#aa1818';
      ctx.fillRect(sx - barW/2, barY, barW, barH);
      const hpGrad = ctx.createLinearGradient(sx - barW/2, barY, sx - barW/2, barY + barH);
      hpGrad.addColorStop(0, isBoss ? '#ff5050' : '#50cc50');
      hpGrad.addColorStop(1, isBoss ? '#cc2020' : '#308030');
      ctx.fillStyle = hpGrad;
      ctx.fillRect(sx - barW/2, barY, barW * 0.85, barH);
    }
  }

  function drawAnimalSprite(ctx, sx, sy, s, name, rng) {
    let bodyR = 185, bodyG = 155, bodyB = 105;
    if (/wolf/i.test(name)) { bodyR = 95; bodyG = 95; bodyB = 105; }
    if (/bear/i.test(name)) { bodyR = 95; bodyG = 65; bodyB = 32; }
    if (/boar/i.test(name)) { bodyR = 115; bodyG = 85; bodyB = 62; }
    if (/chicken/i.test(name)) { bodyR = 235; bodyG = 225; bodyB = 205; }
    if (/cow/i.test(name)) { bodyR = 215; bodyG = 195; bodyB = 165; }
    if (/horse/i.test(name)) { bodyR = 145; bodyG = 105; bodyB = 62; }
    if (/sheep/i.test(name)) { bodyR = 240; bodyG = 232; bodyB = 218; }

    // Body
    ctx.fillStyle = `rgb(${bodyR},${bodyG},${bodyB})`;
    ctx.beginPath();
    ctx.ellipse(sx, sy - s*0.2, s*0.42, s*0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly highlight
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(sx, sy - s*0.15, s*0.3, s*0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs
    ctx.fillStyle = `rgb(${Math.round(bodyR*0.7)},${Math.round(bodyG*0.7)},${Math.round(bodyB*0.7)})`;
    [-0.22, -0.08, 0.08, 0.22].forEach(xOff => {
      ctx.fillRect(sx + s*xOff - s*0.035, sy - s*0.08, s*0.07, s*0.11);
    });

    // Head
    ctx.fillStyle = `rgb(${bodyR},${bodyG},${bodyB})`;
    ctx.beginPath();
    ctx.arc(sx + s*0.38, sy - s*0.3, s*0.13, 0, Math.PI * 2);
    ctx.fill();

    // Ear
    ctx.beginPath();
    ctx.arc(sx + s*0.35, sy - s*0.4, s*0.05, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(sx + s*0.42, sy - s*0.32, s*0.025, 0, Math.PI * 2);
    ctx.fill();
    // Eye highlight
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sx + s*0.425, sy - s*0.325, s*0.01, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.strokeStyle = `rgb(${bodyR},${bodyG},${bodyB})`;
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath();
    ctx.moveTo(sx - s*0.4, sy - s*0.25);
    ctx.quadraticCurveTo(sx - s*0.55, sy - s*0.4, sx - s*0.48, sy - s*0.45);
    ctx.stroke();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CLOUDS (volumetric, layered)
  // ═══════════════════════════════════════════════════════════════════

  function drawClouds(ctx, W, H, zone, rng) {
    const z = ZONES[zone];
    if (z.time === 'cave') return;

    const isNight = z.time === 'night';
    const horizonY = CFG.horizon;

    // Multiple cloud layers for depth
    for (let layer = 0; layer < 2; layer++) {
      const alpha = isNight ? 0.12 : (0.3 - layer * 0.08);
      const yRange = [15 + layer * 40, 80 + layer * 50];
      const cloudCount = 4 - layer;

      for (let i = 0; i < cloudCount; i++) {
        const cx = rng.range(40, W - 40);
        const cy = rng.range(yRange[0], yRange[1]);
        const cloudW = 90 + rng.next() * 60 - layer * 20;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Cloud base (soft white/gray blobs)
        const cloudColor = isNight ? '#2a2a40' : '#ffffff';
        for (let j = 0; j < 8; j++) {
          const bx = cx + (j - 3.5) * (cloudW / 7) + rng.range(-8, 8);
          const by = cy + rng.range(-12, 12);
          const br = 16 + rng.next() * 28;

          // Gradient for each blob
          const bGrad = ctx.createRadialGradient(bx, by - br * 0.2, 0, bx, by, br);
          bGrad.addColorStop(0, cloudColor);
          bGrad.addColorStop(1, isNight ? 'rgba(42,42,64,0)' : 'rgba(255,255,255,0)');
          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }

        // Subtle golden tint on cloud bottom (reflected sunlight)
        if (z.time === 'day') {
          ctx.globalAlpha = 0.08;
          ctx.fillStyle = '#e8c880';
          for (let j = 0; j < 4; j++) {
            ctx.beginPath();
            ctx.arc(cx + (j - 1.5) * cloudW / 5, cy + 10, 15 + rng.next() * 10, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GOD RAYS / LIGHT SHAFTS (WoW signature effect)
  // ═══════════════════════════════════════════════════════════════════

  function drawGodRays(ctx, W, H, zone, rng) {
    const z = ZONES[zone];
    if (z.time !== 'day') return;

    const sunX = W * 0.72;
    const sunY = H * 0.06;

    ctx.save();
    for (let i = 0; i < 6; i++) {
      const angle = rng.range(-0.4, 0.8);
      const rayW = rng.range(20, 60);
      const rayLen = rng.range(200, 450);

      ctx.globalAlpha = 0.025 + rng.next() * 0.02;
      ctx.fillStyle = '#ffe8a0';

      ctx.beginPath();
      const cos = Math.cos(angle + Math.PI * 0.4);
      const sin = Math.sin(angle + Math.PI * 0.4);
      ctx.moveTo(sunX - rayW * sin * 0.3, sunY + rayW * cos * 0.3);
      ctx.lineTo(sunX + cos * rayLen - rayW * sin, sunY + sin * rayLen + rayW * cos);
      ctx.lineTo(sunX + cos * rayLen + rayW * sin, sunY + sin * rayLen - rayW * cos);
      ctx.lineTo(sunX + rayW * sin * 0.3, sunY - rayW * cos * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ATMOSPHERIC PARTICLES (dust motes, leaves, fireflies)
  // ═══════════════════════════════════════════════════════════════════

  function drawParticles(ctx, W, H, zone, rng) {
    const z = ZONES[zone];

    if (z.time === 'day' && (zone === 'elwynn_forest' || zone === 'stormwind')) {
      // Floating golden dust motes (lit by sun)
      ctx.save();
      for (let i = 0; i < 35; i++) {
        const px = rng.range(0, W);
        const py = rng.range(H * 0.15, H * 0.75);
        const pr = 1 + rng.next() * 2.5;
        ctx.globalAlpha = 0.15 + rng.next() * 0.2;
        ctx.fillStyle = '#ffe880';
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Falling leaves (occasional)
      ctx.save();
      for (let i = 0; i < 8; i++) {
        const lx = rng.range(0, W);
        const ly = rng.range(H * 0.1, H * 0.6);
        const ls = 2 + rng.next() * 4;
        ctx.globalAlpha = 0.25 + rng.next() * 0.2;
        ctx.fillStyle = rng.pick(['#5a9030','#80b040','#c8a030','#a87020']);
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rng.range(0, Math.PI * 2));
        ctx.beginPath();
        ctx.ellipse(0, 0, ls, ls * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    if (z.time === 'night') {
      // Fireflies
      ctx.save();
      for (let i = 0; i < 15; i++) {
        const fx = rng.range(0, W);
        const fy = rng.range(H * 0.3, H * 0.75);
        ctx.globalAlpha = 0.4 + rng.next() * 0.3;
        const ffGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 6);
        ffGrad.addColorStop(0, '#aaffaa');
        ffGrad.addColorStop(1, 'rgba(170,255,170,0)');
        ctx.fillStyle = ffGrad;
        ctx.beginPath();
        ctx.arc(fx, fy, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (zone === 'molten_core') {
      // Floating embers
      ctx.save();
      for (let i = 0; i < 25; i++) {
        const ex = rng.range(0, W);
        const ey = rng.range(H * 0.1, H * 0.8);
        ctx.globalAlpha = 0.5 + rng.next() * 0.3;
        ctx.fillStyle = rng.pick(['#ff6020','#ffaa30','#ff3010','#ffd040']);
        ctx.beginPath();
        ctx.arc(ex, ey, 1 + rng.next() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (zone === 'snow') {
      // Snowflakes
      ctx.save();
      ctx.fillStyle = '#e8e8f8';
      for (let i = 0; i < 40; i++) {
        const sx2 = rng.range(0, W);
        const sy2 = rng.range(0, H * 0.85);
        ctx.globalAlpha = 0.3 + rng.next() * 0.4;
        ctx.beginPath();
        ctx.arc(sx2, sy2, 1 + rng.next() * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  VIGNETTE & COLOR GRADING
  // ═══════════════════════════════════════════════════════════════════

  function drawVignette(ctx, W, H) {
    const grad = ctx.createRadialGradient(W/2, H/2, W * 0.3, W/2, H/2, W * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  WOW-STYLE UI CHROME
  // ═══════════════════════════════════════════════════════════════════

  function drawWoWUI(ctx, W, H, gameData, zone) {
    drawPlayerFrame(ctx, 20, 20, gameData);

    if (gameData.entities?.length > 1) {
      const target = gameData.entities.find(e =>
        (e.tags||[]).includes('enemy') || (e.tags||[]).includes('boss')
      );
      if (target) drawTargetFrame(ctx, 20, 80, target);
    }

    drawMinimap(ctx, W - 145, 8, 132, gameData, zone);
    drawActionBar(ctx, W, H, gameData);
    drawChatBox(ctx, 10, H - 170, gameData);
    drawQuestTracker(ctx, W - 225, 165, gameData);
    drawXPBar(ctx, W, H);
    drawBagSlots(ctx, W - 205, H - 58);
  }

  function drawResourceBar(ctx, x, y, w, h, color, darkColor, fill, label) {
    ctx.fillStyle = '#080808';
    ctx.fillRect(x, y, w, h);
    const grd = ctx.createLinearGradient(x, y, x, y + h);
    grd.addColorStop(0, lighten(color, 0.25));
    grd.addColorStop(0.4, color);
    grd.addColorStop(1, darkColor);
    ctx.fillStyle = grd;
    ctx.fillRect(x + 1, y + 1, (w - 2) * fill, h - 2);
    // Glass shine
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 1, y + 1, (w - 2) * fill, (h - 2) / 2);
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = '9px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w/2, y + h - 3);
    ctx.strokeStyle = '#505050';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }

  function drawPlayerFrame(ctx, x, y, gameData) {
    const w = 210, h = 52;
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(x, y, w, h);
    // Gold border
    ctx.strokeStyle = '#b8a458';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);
    // Inner bevel
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

    // Portrait area
    ctx.fillStyle = '#0e0e1a';
    ctx.fillRect(x + 3, y + 3, 46, 46);
    ctx.strokeStyle = '#c8a858';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, 46, 46);
    // Head
    ctx.fillStyle = '#dbb090';
    ctx.beginPath(); ctx.arc(x + 26, y + 23, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3020';
    ctx.beginPath(); ctx.arc(x + 26, y + 19, 14, Math.PI, 0); ctx.fill();
    // Eyes
    ctx.fillStyle = '#204080';
    ctx.fillRect(x + 21, y + 21, 3, 3);
    ctx.fillRect(x + 28, y + 21, 3, 3);

    // Level badge
    ctx.fillStyle = '#c0a040';
    ctx.beginPath(); ctx.arc(x + 3, y + h - 3, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#806020';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x + 3, y + h - 3, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 11px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((gameData.variables?.level || 1).toString(), x + 3, y + h - 3);
    ctx.textBaseline = 'alphabetic';

    const barX = x + 54, barY = y + 6, barW = 148, barH = 17;
    drawResourceBar(ctx, barX, barY, barW, barH, '#22aa22', '#108010', 0.92, 'HP');
    drawResourceBar(ctx, barX, barY + 23, barW, barH, '#4065cc', '#203585', 0.78, 'MP');

    ctx.fillStyle = '#ffd040';
    ctx.font = 'bold 11px Inter, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText((gameData.game?.name || 'Hero').substring(0, 16), barX + 5, barY + 13);
  }

  function drawTargetFrame(ctx, x, y, target) {
    const w = 210, h = 42;
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#8a3535';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    const name = (target.name || 'Enemy').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    ctx.fillStyle = '#ff5858';
    ctx.font = 'bold 10px Inter, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name, x + 8, y + 15);
    drawResourceBar(ctx, x + 6, y + 21, 198, 15, '#cc2020', '#801010', 0.85, `${target.health || 100} HP`);
  }

  function drawMinimap(ctx, x, y, size, gameData, zone) {
    const z = ZONES[zone];
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
    ctx.clip();

    // Minimap terrain background
    ctx.fillStyle = '#0e1e0e';
    ctx.fillRect(x, y, size, size);
    const mrng = new RNG(12345);
    for (let i = 0; i < 70; i++) {
      const gc = z.grassBase;
      const shade = mrng.range(0.4, 1.0);
      ctx.fillStyle = `rgb(${Math.round(gc[0]*shade)},${Math.round(gc[1]*shade)},${Math.round(gc[2]*shade)})`;
      ctx.fillRect(x + mrng.next() * size, y + mrng.next() * size, 5 + mrng.next() * 12, 5 + mrng.next() * 12);
    }
    // Path on minimap
    ctx.strokeStyle = `rgb(${z.dirtBase[0]},${z.dirtBase[1]},${z.dirtBase[2]})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + size * 0.1, y + size * 0.5);
    ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.4, x + size * 0.9, y + size * 0.55);
    ctx.stroke();

    if (z.hasWater) {
      ctx.fillStyle = `rgb(${z.waterColor[0]},${z.waterColor[1]},${z.waterColor[2]})`;
      ctx.beginPath();
      ctx.ellipse(x + size * 0.72, y + size * 0.42, 10, 28, 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player arrow
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    const pcx = x + size/2, pcy = y + size/2;
    ctx.moveTo(pcx, pcy - 6);
    ctx.lineTo(pcx - 4, pcy + 4);
    ctx.lineTo(pcx + 4, pcy + 4);
    ctx.closePath();
    ctx.fill();
    // Entity dots
    const entities = gameData.entities || [];
    for (let i = 0; i < entities.length && i < 12; i++) {
      const e = entities[i];
      if ((e.tags||[]).includes('player')) continue;
      ctx.fillStyle = (e.tags||[]).includes('enemy') ? '#ff4040' : '#40ff40';
      ctx.beginPath();
      ctx.arc(pcx + mrng.range(-35, 35), pcy + mrng.range(-35, 35), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Gold border ring with ornate detail
    ctx.strokeStyle = '#a89848';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2 + 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#c8b868';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2 + 1, 0, Math.PI * 2);
    ctx.stroke();

    // N indicator with small ornament
    ctx.fillStyle = '#ffd040';
    ctx.font = 'bold 12px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', x + size/2, y + 14);

    // Zone name below minimap
    const scenes = gameData.scenes || [];
    const zoneName = (scenes[0]?.name || 'Elwynn Forest').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    ctx.fillStyle = '#e0d0b0';
    ctx.font = 'bold 10px Inter, Arial, sans-serif';
    ctx.fillText(zoneName, x + size/2, y + size + 18);
  }

  function drawActionBar(ctx, W, H, gameData) {
    const slotSize = 38;
    const slots = 12;
    const gap = 4;
    const barW = slots * (slotSize + gap) + 8;
    const barX = (W - barW) / 2;
    const barY = H - 58;

    // Darker background
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(barX - 8, barY - 8, barW + 16, slotSize + 20);
    // Gold border
    ctx.strokeStyle = '#b0a058';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 8, barY - 8, barW + 16, slotSize + 20);
    // Inner bevel
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 6, barY - 6, barW + 12, slotSize + 16);

    // Griffin ornaments (left and right)
    for (const ox of [barX - 18, barX + barW + 18]) {
      ctx.fillStyle = '#6a5a38';
      ctx.beginPath(); ctx.arc(ox, barY + slotSize/2 + 2, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c0a858';
      ctx.beginPath(); ctx.arc(ox, barY + slotSize/2 + 2, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a7a48';
      ctx.beginPath(); ctx.arc(ox, barY + slotSize/2 + 2, 5, 0, Math.PI * 2); ctx.fill();
    }

    const abilityColors = ['#cc3838','#38cc38','#3838cc','#cc7838','#7838cc','#38cccc','#cccc38','#cc38cc','#78cc38','#3878cc'];
    const abilityIcons = ['S','H','F','B','T','M','I','P','A','D','R','E'];

    for (let i = 0; i < slots; i++) {
      const sx = barX + i * (slotSize + gap) + 4;
      const sy = barY;
      // Slot background
      ctx.fillStyle = '#12121e';
      ctx.fillRect(sx, sy, slotSize, slotSize);
      ctx.strokeStyle = '#3a3a4a';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, slotSize, slotSize);

      if (i < 10) {
        const ic = abilityColors[i];
        const grd = ctx.createLinearGradient(sx, sy, sx, sy + slotSize);
        grd.addColorStop(0, lighten(ic, 0.15));
        grd.addColorStop(0.5, ic);
        grd.addColorStop(1, darken(ic, 0.35));
        ctx.fillStyle = grd;
        ctx.fillRect(sx + 2, sy + 2, slotSize - 4, slotSize - 4);
        // Ability letter
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 17px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(abilityIcons[i], sx + slotSize/2, sy + slotSize/2);
        ctx.textBaseline = 'alphabetic';
        // Cooldown overlay on some slots
        if (i === 3 || i === 7) {
          ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#000';
          ctx.fillRect(sx + 2, sy + 2, slotSize - 4, (slotSize - 4) * 0.55);
          ctx.restore();
          // Cooldown text
          ctx.fillStyle = '#ffd040';
          ctx.font = 'bold 11px Inter, Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(i === 3 ? '3s' : '8s', sx + slotSize/2, sy + slotSize/2 - 4);
        }
      }
      // Keybind number
      ctx.fillStyle = '#a09878';
      ctx.font = '9px Inter, Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(i < 9 ? (i+1).toString() : (i===9?'0':i===10?'-':'='), sx + slotSize - 2, sy + slotSize - 2);
    }
  }

  function drawChatBox(ctx, x, y, gameData) {
    const w = 330, h = 155;
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    ctx.fillRect(x, y, w, h);
    // Tab
    ctx.fillStyle = 'rgba(80,80,80,0.5)';
    ctx.fillRect(x, y - 19, 65, 19);
    ctx.fillStyle = '#b0a078';
    ctx.font = '10px Inter, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('General', x + 8, y - 5);

    const gameName = gameData.game?.name || 'the world';
    const msgs = [
      { color: '#ffcc00', text: `[System] Welcome to ${gameName}!` },
      { color: '#aaddff', text: '[Local] LFG Deadmines need tank and healer' },
      { color: '#ff8080', text: '[Trade] WTS [Copper Ore] x20 - 50s each' },
      { color: '#aaffaa', text: `[Guild] ${gameName} is recruiting!` },
      { color: '#aaddff', text: '[General] Any quest help in the area?' },
      { color: '#ffaaff', text: '[Whisper] Hey, nice armor!' },
      { color: '#ffcc00', text: '[System] You have discovered a new area.' },
    ];
    ctx.font = '10px Inter, Arial, sans-serif';
    for (let i = 0; i < msgs.length; i++) {
      ctx.fillStyle = msgs[i].color;
      ctx.fillText(msgs[i].text, x + 6, y + 16 + i * 18);
    }
    // Input field
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y + h, w, 22);
    ctx.strokeStyle = '#3a3a4a'; ctx.lineWidth = 1; ctx.strokeRect(x, y + h, w, 22);
    ctx.fillStyle = '#555';
    ctx.fillText('Press Enter to chat...', x + 8, y + h + 15);
  }

  function drawQuestTracker(ctx, x, y, gameData) {
    ctx.save(); ctx.globalAlpha = 0.88;
    // Header
    ctx.fillStyle = '#ffd040';
    ctx.font = 'bold 11px Inter, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Quest Log', x, y);
    // Underline
    ctx.strokeStyle = 'rgba(255,208,64,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x + 100, y + 3); ctx.stroke();

    const quests = [];
    const gn = gameData.game?.name || '';
    if (/warcraft|wow|mmorpg/i.test(gn)) {
      quests.push({ name: 'Wolves at the Gate', progress: '6/8 Timber Wolves', pct: 0.75 });
      quests.push({ name: 'Report to Guard Thomas', progress: 'Speak to Guard Thomas', pct: 0 });
      quests.push({ name: 'Collecting Candles', progress: '4/10 Kobold Candles', pct: 0.4 });
    } else if (/minecraft/i.test(gn)) {
      quests.push({ name: 'Getting Wood', progress: 'Chop 3 trees', pct: 0.3 });
      quests.push({ name: 'Build a Shelter', progress: 'Place 16 blocks', pct: 0.5 });
    } else {
      quests.push({ name: 'Welcome to ' + gn, progress: 'Explore the area', pct: 0.1 });
      quests.push({ name: 'First Steps', progress: 'Talk to an NPC', pct: 0 });
    }
    let qy = y + 20;
    for (const q of quests) {
      // Quest name
      ctx.fillStyle = '#ffd858'; ctx.font = 'bold 10px Inter, Arial, sans-serif';
      ctx.fillText('  ' + q.name, x, qy); qy += 14;
      // Progress text
      ctx.fillStyle = '#a8a8a8'; ctx.font = '9px Inter, Arial, sans-serif';
      ctx.fillText('   - ' + q.progress, x, qy);
      // Mini progress bar
      if (q.pct > 0) {
        const pbX = x + 140, pbY = qy - 7, pbW = 55, pbH = 5;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(pbX, pbY, pbW, pbH);
        ctx.fillStyle = '#50a850';
        ctx.fillRect(pbX, pbY, pbW * q.pct, pbH);
      }
      qy += 16;
    }
    ctx.restore();
  }

  function drawXPBar(ctx, W, H) {
    const barH = 11, barY = H - 11;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, barY, W, barH);
    const grd = ctx.createLinearGradient(0, barY, 0, barY + barH);
    grd.addColorStop(0, '#6842c0'); grd.addColorStop(1, '#4230a0');
    ctx.fillStyle = grd;
    ctx.fillRect(0, barY, W * 0.4, barH);
    // Shine
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, barY, W * 0.4, barH / 2);
    ctx.restore();
    // Notches
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    for (let i = 1; i < 20; i++) { const nx = (W/20)*i; ctx.beginPath(); ctx.moveTo(nx,barY); ctx.lineTo(nx,barY+barH); ctx.stroke(); }
    ctx.fillStyle = '#b0a0d0'; ctx.font = '8px Inter, Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('40% to Level 2', W/2, barY + 9);
  }

  function drawBagSlots(ctx, x, y) {
    for (let i = 0; i < 5; i++) {
      const bx = x + i * 34;
      ctx.fillStyle = '#1a1a2a'; ctx.fillRect(bx, y, 30, 30);
      ctx.strokeStyle = '#5a5a6a'; ctx.lineWidth = 1; ctx.strokeRect(bx, y, 30, 30);
      // Bag icon
      ctx.fillStyle = '#7a6040';
      ctx.fillRect(bx+7, y+5, 16, 20);
      ctx.fillRect(bx+10, y+2, 10, 5);
      // Bag clasp
      ctx.fillStyle = '#c0a040';
      ctx.fillRect(bx+13, y+4, 4, 3);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MAIN RENDER FUNCTION
  // ═══════════════════════════════════════════════════════════════════

  function render(canvas, gameData) {
    const ctx = canvas.getContext('2d');
    const W = CFG.width, H = CFG.height;
    canvas.width = W;
    canvas.height = H;

    const rng = new RNG(hashString(gameData.game?.name || 'default'));
    const zoneName = detectZone(gameData.game?.name, gameData.scenes);
    const z = ZONES[zoneName];

    // Generate terrain
    const mapSize = CFG.mapSize;
    const terrain = generateTerrain(mapSize, zoneName, new RNG(hashString(gameData.game?.name || 'terrain')));

    // Camera setup
    const camX = mapSize * 0.35;
    const camY = mapSize * 0.5;
    const camAngle = Math.PI * 0.08;
    const groundH = terrain.heightmap[Math.floor(camY) * mapSize + Math.floor(camX)] * CFG.scaleHeight;

    const camera = {
      x: camX,
      y: camY,
      height: groundH + CFG.cameraHeight,
      angle: camAngle,
      horizon: CFG.horizon,
    };

    // ── Layered rendering: sky → mountains → terrain (proper compositing) ──

    // Step 1: Render terrain into an off-screen canvas (terrain = opaque, sky = transparent)
    const imageData = ctx.createImageData(W, H);
    renderTerrain(ctx, imageData, terrain.heightmap, terrain.colormap, mapSize, camera, zoneName);
    // Note: undrawn pixels remain alpha=0 (transparent)

    // Step 2: Draw sky gradient as background on main canvas
    const skyGrad = ctx.createLinearGradient(0, 0, 0, camera.horizon + 60);
    skyGrad.addColorStop(0, z.skyTop);
    skyGrad.addColorStop(1, z.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Step 3: Draw distant mountain ranges on top of sky (behind terrain)
    const mtRng = new RNG(hashString(gameData.game?.name || 'mountains'));
    drawMountainRange(ctx, W, H, zoneName, mtRng, 0);
    drawMountainRange(ctx, W, H, zoneName, mtRng, 1);
    drawMountainRange(ctx, W, H, zoneName, mtRng, 2);

    // Step 4: Put terrain imageData onto a temp canvas, then draw it over sky+mountains
    // (putImageData ignores compositing, so we use a temp canvas + drawImage)
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = W; tmpCanvas.height = H;
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(tmpCanvas, 0, 0);

    // 3. Clouds
    drawClouds(ctx, W, H, zoneName, new RNG(5555 + rng.seed));

    // 4. Sun/moon
    if (z.time === 'day') {
      // Large sun glow
      ctx.save(); ctx.globalAlpha = 0.18;
      const sunGrad = ctx.createRadialGradient(W*0.72, H*0.06, 8, W*0.72, H*0.06, 100);
      sunGrad.addColorStop(0, '#fffae0');
      sunGrad.addColorStop(0.4, '#ffe8a0');
      sunGrad.addColorStop(1, 'rgba(255,248,224,0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath(); ctx.arc(W*0.72, H*0.06, 100, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      // Sun disc
      ctx.fillStyle = '#fff8e0';
      ctx.beginPath(); ctx.arc(W*0.72, H*0.06, 14, 0, Math.PI*2); ctx.fill();
    } else if (z.time === 'night') {
      // Moon
      ctx.fillStyle = '#d8d0c0';
      ctx.beginPath(); ctx.arc(W*0.78, H*0.08, 18, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = hexToRgb(z.skyTop).r < 30 ? '#0e0e28' : '#1a1a3a';
      ctx.beginPath(); ctx.arc(W*0.78 - 5, H*0.08 - 3, 16, 0, Math.PI*2); ctx.fill();
      // Stars
      ctx.save();
      const starRng = new RNG(7777);
      for (let i = 0; i < 50; i++) {
        ctx.globalAlpha = 0.3 + starRng.next() * 0.5;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(starRng.range(0, W), starRng.range(0, CFG.horizon * 0.7), 0.5 + starRng.next() * 1.2, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. God rays
    drawGodRays(ctx, W, H, zoneName, new RNG(3333 + rng.seed));

    // 6. Place billboard sprites
    const spriteList = [];
    const spriteRng = new RNG(hashString(gameData.game?.name || 'sprites'));

    // Trees (more of them, varied distances)
    if (z.hasTrees) {
      for (let i = 0; i < 55; i++) {
        const wx = camX + spriteRng.range(-180, 350);
        const wy = camY + spriteRng.range(-250, 250);
        const mx = ((Math.floor(wx) % mapSize) + mapSize) % mapSize;
        const my = ((Math.floor(wy) % mapSize) + mapSize) % mapSize;
        const th = terrain.heightmap[my * mapSize + mx] * CFG.scaleHeight;
        if (z.hasWater) {
          const riverX = mapSize * 0.7 + Math.sin(wy * 0.012 + rng.seed * 0.01) * mapSize * 0.1;
          if (Math.abs(wx - riverX) < 30) continue;
        }
        spriteList.push({ type: 'tree', wx, wy, wz: th, rng: new RNG(i * 31 + 7) });
      }
    }

    // Buildings
    if (z.hasBuildings) {
      const buildingCount = 3 + spriteRng.int(0, 4);
      for (let i = 0; i < buildingCount; i++) {
        const wx = camX + 50 + i * 90 + spriteRng.range(-25, 25);
        const wy = camY + spriteRng.range(-90, 90);
        const mx = ((Math.floor(wx) % mapSize) + mapSize) % mapSize;
        const my = ((Math.floor(wy) % mapSize) + mapSize) % mapSize;
        const th = terrain.heightmap[my * mapSize + mx] * CFG.scaleHeight;
        spriteList.push({ type: 'building', wx, wy, wz: th, rng: new RNG(i * 97 + 13) });
      }
    }

    // Entities (characters)
    const entities = gameData.entities || [];
    for (let i = 0; i < Math.min(entities.length, 15); i++) {
      const e = entities[i];
      const isPlayer = (e.tags || []).includes('player');
      let wx, wy;
      if (isPlayer) {
        wx = camX + 22;
        wy = camY + 6;
      } else {
        wx = camX + spriteRng.range(25, 220);
        wy = camY + spriteRng.range(-130, 130);
      }
      const mx = ((Math.floor(wx) % mapSize) + mapSize) % mapSize;
      const my = ((Math.floor(wy) % mapSize) + mapSize) % mapSize;
      const th = terrain.heightmap[my * mapSize + mx] * CFG.scaleHeight;
      spriteList.push({
        type: 'character', wx, wy, wz: th,
        entity: e, isPlayer,
        rng: new RNG(hashString(e.name || 'e' + i)),
      });
    }

    // Project and sort (far first for painter's algorithm)
    const projectedSprites = [];
    for (const sprite of spriteList) {
      const proj = projectWorldToScreen(sprite.wx, sprite.wy, sprite.wz, camera);
      if (proj && proj.z > 3 && proj.x > -250 && proj.x < W + 250) {
        projectedSprites.push({ ...sprite, ...proj });
      }
    }
    projectedSprites.sort((a, b) => b.z - a.z);

    // 7. Draw sprites with fog
    for (const sp of projectedSprites) {
      const fogFactor = clamp((sp.z - CFG.renderDist * z.fogDist) / (CFG.renderDist * (1 - z.fogDist)), 0, 0.85);
      if (fogFactor > 0.78) continue;

      ctx.save();
      if (fogFactor > 0) ctx.globalAlpha = 1 - fogFactor;

      if (sp.type === 'tree') {
        drawBillboardTree(ctx, sp.x, sp.y, sp.scale, zoneName, sp.rng);
      } else if (sp.type === 'building') {
        drawBillboardBuilding(ctx, sp.x, sp.y, sp.scale, zoneName, sp.rng);
      } else if (sp.type === 'character') {
        drawBillboardCharacter(ctx, sp.x, sp.y, sp.scale, sp.entity, zoneName, sp.rng, sp.isPlayer);
      }
      ctx.restore();
    }

    // 8. Atmospheric particles
    drawParticles(ctx, W, H, zoneName, new RNG(8888 + rng.seed));

    // 9. Color grading overlays
    if (z.time === 'day') {
      // Golden hour warm wash
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#e8c060';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } else if (z.time === 'night') {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#080828';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } else if (z.time === 'cave') {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#180800';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // 10. Cinematic vignette
    drawVignette(ctx, W, H);

    // 11. WoW UI chrome
    drawWoWUI(ctx, W, H, gameData, zoneName);

    return canvas;
  }

  // ─── Public API ────────────────────────────────────────────────────
  return {
    render,
    renderToDataURL(gameData) {
      const canvas = document.createElement('canvas');
      render(canvas, gameData);
      return canvas.toDataURL('image/png');
    },
    renderToBlob(gameData) {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        render(canvas, gameData);
        canvas.toBlob(resolve, 'image/png');
      });
    },
    CFG,
  };
})();

// Export for module usage
if (typeof module !== 'undefined') module.exports = WowRenderer;
