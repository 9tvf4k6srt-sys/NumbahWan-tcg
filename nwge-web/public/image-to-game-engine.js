// ═══════════════════════════════════════════════════════════════════════════════
//  NWGE Image-to-Game Engine v2.0 — Deep Image Analysis → Game Generation
//  
//  PIPELINE:
//  1. Deep Image Analysis (colors, edges, textures, composition, objects, mood)
//  2. Game Config Mapping (analysis → game parameters)
//  3. Procedural Level Generation (image-driven layouts)
//  4. Dynamic Sprite/Entity Generation (edge-detected shapes)
//  5. Atmosphere & Palette Extraction (pixel-perfect color mapping)
//
//  Supports: client-side analysis + optional server-side LLM vision boost
// ═══════════════════════════════════════════════════════════════════════════════

const ImageToGameEngine = (() => {
  'use strict';

  // ─── Canvas helpers ──────────────────────────────────────────────────────
  function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function getPixels(img, w, h) {
    const c = createCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h, s, l };
  }
  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  function colorDistance(c1, c2) {
    return Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PHASE 1: DEEP IMAGE ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  function analyzeImageDeep(imgElement) {
    const ANALYSIS_SIZE = 128; // Higher resolution for better analysis
    const imgData = getPixels(imgElement, ANALYSIS_SIZE, ANALYSIS_SIZE);
    const pixels = imgData.data;
    const W = ANALYSIS_SIZE, H = ANALYSIS_SIZE;

    const result = {
      // Core color analysis
      palette: null,
      dominantColors: [],
      colorHarmony: null,
      // Region analysis  
      regions: null,
      horizonLine: null,
      // Texture & complexity
      complexity: null,
      textureMap: null,
      // Edge detection
      edges: null,
      edgeDensity: 0,
      // Composition
      composition: null,
      focalPoints: [],
      // Mood & atmosphere
      mood: null,
      atmosphere: null,
      // Object detection (heuristic)
      detectedFeatures: null,
      // Game mapping
      suggestedGameType: null,
      suggestedTheme: null,
      suggestedMood: null,
      gameConfig: null,
    };

    // ─── 1a. Advanced Color Palette Extraction (k-means) ─────────────
    result.palette = extractPalette(pixels, W, H);
    result.dominantColors = result.palette.colors;
    result.colorHarmony = detectColorHarmony(result.palette);

    // ─── 1b. Region Analysis (sky, ground, midground) ────────────────
    result.regions = analyzeRegions(pixels, W, H);
    result.horizonLine = detectHorizonLine(pixels, W, H);

    // ─── 1c. Edge Detection (Sobel) ──────────────────────────────────
    result.edges = detectEdges(pixels, W, H);
    result.edgeDensity = result.edges.density;

    // ─── 1d. Texture Analysis ────────────────────────────────────────
    result.textureMap = analyzeTexture(pixels, W, H);
    result.complexity = computeComplexity(result.edges, result.textureMap, result.palette);

    // ─── 1e. Composition Analysis ────────────────────────────────────
    result.composition = analyzeComposition(pixels, W, H, result.edges);
    result.focalPoints = findFocalPoints(result.edges, result.palette, W, H);

    // ─── 1f. Feature Detection (heuristic) ──────────────────────────
    result.detectedFeatures = detectFeatures(pixels, W, H, result.regions, result.palette);

    // ─── 1g. Mood & Atmosphere ──────────────────────────────────────
    result.mood = detectMood(result.palette, result.regions, result.complexity);
    result.atmosphere = detectAtmosphere(result.palette, result.regions);

    // ─── 1h. Game Suggestions ───────────────────────────────────────
    const suggestions = suggestGameParameters(result);
    result.suggestedGameType = suggestions.gameType;
    result.suggestedTheme = suggestions.theme;
    result.suggestedMood = suggestions.mood;

    // ─── 1i. Build game config ──────────────────────────────────────
    result.gameConfig = buildGameConfig(result);

    return result;
  }

  // ─── K-Means Color Palette Extraction ────────────────────────────────
  function extractPalette(pixels, W, H, k = 8) {
    // Sample pixels
    const samples = [];
    const step = Math.max(1, Math.floor((W * H) / 2000));
    for (let i = 0; i < pixels.length; i += step * 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      samples.push({ r, g, b });
    }

    // Initialize centroids with k-means++
    const centroids = [samples[Math.floor(Math.random() * samples.length)]];
    for (let c = 1; c < k; c++) {
      let maxDist = -1, farthest = samples[0];
      for (const s of samples) {
        const minD = Math.min(...centroids.map(cn => colorDistance(s, cn)));
        if (minD > maxDist) { maxDist = minD; farthest = s; }
      }
      centroids.push({ ...farthest });
    }

    // Iterate k-means
    for (let iter = 0; iter < 12; iter++) {
      const clusters = centroids.map(() => []);
      for (const s of samples) {
        let minD = Infinity, minIdx = 0;
        for (let c = 0; c < centroids.length; c++) {
          const d = colorDistance(s, centroids[c]);
          if (d < minD) { minD = d; minIdx = c; }
        }
        clusters[minIdx].push(s);
      }
      for (let c = 0; c < k; c++) {
        if (clusters[c].length === 0) continue;
        centroids[c] = {
          r: Math.round(clusters[c].reduce((a, b) => a + b.r, 0) / clusters[c].length),
          g: Math.round(clusters[c].reduce((a, b) => a + b.g, 0) / clusters[c].length),
          b: Math.round(clusters[c].reduce((a, b) => a + b.b, 0) / clusters[c].length),
        };
        centroids[c].count = clusters[c].length;
      }
    }

    // Sort by frequency and add HSL
    const colors = centroids
      .filter(c => c.count > 0)
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .map(c => {
        const hsl = rgbToHsl(c.r, c.g, c.b);
        return {
          r: c.r, g: c.g, b: c.b,
          hex: rgbToHex(c.r, c.g, c.b),
          h: hsl.h, s: hsl.s, l: hsl.l,
          frequency: (c.count || 0) / samples.length,
        };
      });

    // Overall stats
    let totalR = 0, totalG = 0, totalB = 0;
    for (const s of samples) { totalR += s.r; totalG += s.g; totalB += s.b; }
    const n = samples.length;
    const avgColor = { r: Math.round(totalR / n), g: Math.round(totalG / n), b: Math.round(totalB / n) };
    const avgHsl = rgbToHsl(avgColor.r, avgColor.g, avgColor.b);

    return {
      colors,
      avgColor,
      brightness: avgHsl.l,
      saturation: avgHsl.s,
      warmth: avgColor.r > avgColor.b + 20 ? 'warm' : avgColor.b > avgColor.r + 20 ? 'cool' : 'neutral',
      isDark: avgHsl.l < 0.35,
      isLight: avgHsl.l > 0.65,
      isVivid: avgHsl.s > 0.6,
      isMuted: avgHsl.s < 0.25,
    };
  }

  function detectColorHarmony(palette) {
    const hues = palette.colors.slice(0, 5).map(c => c.h * 360);
    if (hues.length < 2) return 'monochrome';

    const hueSpread = Math.max(...hues) - Math.min(...hues);
    const complementaryCheck = hues.some((h, i) =>
      hues.some((h2, j) => i !== j && Math.abs(((h - h2 + 180) % 360) - 180) < 30)
    );
    const analogousCheck = hues.every((h, i) =>
      i === 0 || Math.abs(((h - hues[0] + 180) % 360) - 180) < 60
    );

    if (hueSpread < 30) return 'monochrome';
    if (analogousCheck) return 'analogous';
    if (complementaryCheck) return 'complementary';
    if (hueSpread > 180) return 'triadic';
    return 'split-complementary';
  }

  // ─── Region Analysis ─────────────────────────────────────────────────
  function analyzeRegions(pixels, W, H) {
    const regionH = Math.floor(H / 5); // 5 horizontal bands
    const bands = [];

    for (let band = 0; band < 5; band++) {
      let r = 0, g = 0, b = 0, count = 0;
      const yStart = band * regionH;
      const yEnd = Math.min((band + 1) * regionH, H);
      for (let y = yStart; y < yEnd; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2];
          count++;
        }
      }
      const avg = { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
      const hsl = rgbToHsl(avg.r, avg.g, avg.b);
      bands.push({ avg, hsl, label: ['top', 'upper', 'middle', 'lower', 'bottom'][band] });
    }

    // Detect sky vs ground
    const topBrightness = bands[0].hsl.l;
    const botBrightness = bands[4].hsl.l;
    const topIsBlue = bands[0].hsl.h > 0.5 && bands[0].hsl.h < 0.72 && bands[0].hsl.s > 0.15;
    const botIsGreen = bands[4].hsl.h > 0.2 && bands[4].hsl.h < 0.45 && bands[4].hsl.s > 0.1;
    const botIsBrown = bands[4].hsl.h > 0.04 && bands[4].hsl.h < 0.12 && bands[4].hsl.l < 0.5;

    // Quadrant analysis
    const quadrants = [];
    for (let qy = 0; qy < 3; qy++) {
      for (let qx = 0; qx < 3; qx++) {
        let r = 0, g = 0, b = 0, count = 0;
        const xs = Math.floor(qx * W / 3), xe = Math.floor((qx + 1) * W / 3);
        const ys = Math.floor(qy * H / 3), ye = Math.floor((qy + 1) * H / 3);
        for (let y = ys; y < ye; y++) {
          for (let x = xs; x < xe; x++) {
            const i = (y * W + x) * 4;
            r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; count++;
          }
        }
        quadrants.push({
          avg: { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) },
          label: `${['top', 'mid', 'bot'][qy]}-${['left', 'center', 'right'][qx]}`,
        });
      }
    }

    return {
      bands,
      quadrants,
      hasSky: topIsBlue || (topBrightness > botBrightness + 0.15),
      hasGround: botIsGreen || botIsBrown,
      skyColor: bands[0].avg,
      groundColor: bands[4].avg,
      midColor: bands[2].avg,
      gradientDirection: topBrightness > botBrightness ? 'top-bright' :
                         botBrightness > topBrightness ? 'bottom-bright' : 'uniform',
    };
  }

  function detectHorizonLine(pixels, W, H) {
    // Find the row with maximum color change between consecutive rows
    let maxDelta = 0, horizonY = Math.floor(H * 0.5);

    for (let y = Math.floor(H * 0.2); y < Math.floor(H * 0.8); y++) {
      let delta = 0;
      for (let x = 0; x < W; x += 4) {
        const i1 = (y * W + x) * 4;
        const i2 = ((y + 1) * W + x) * 4;
        delta += Math.abs(pixels[i1] - pixels[i2]) +
                 Math.abs(pixels[i1 + 1] - pixels[i2 + 1]) +
                 Math.abs(pixels[i1 + 2] - pixels[i2 + 2]);
      }
      if (delta > maxDelta) { maxDelta = delta; horizonY = y; }
    }

    return { y: horizonY / H, absolute: horizonY };
  }

  // ─── Edge Detection (Sobel) ──────────────────────────────────────────
  function detectEdges(pixels, W, H) {
    // Convert to grayscale
    const gray = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const pi = i * 4;
      gray[i] = pixels[pi] * 0.299 + pixels[pi + 1] * 0.587 + pixels[pi + 2] * 0.114;
    }

    // Sobel kernels
    const edgeMap = new Float32Array(W * H);
    const edgeDirMap = new Float32Array(W * H);
    let totalEdge = 0, edgeCount = 0;

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const idx = y * W + x;
        const gx = -gray[(y-1)*W+(x-1)] + gray[(y-1)*W+(x+1)]
                  - 2*gray[y*W+(x-1)] + 2*gray[y*W+(x+1)]
                  - gray[(y+1)*W+(x-1)] + gray[(y+1)*W+(x+1)];
        const gy = -gray[(y-1)*W+(x-1)] - 2*gray[(y-1)*W+x] - gray[(y-1)*W+(x+1)]
                  + gray[(y+1)*W+(x-1)] + 2*gray[(y+1)*W+x] + gray[(y+1)*W+(x+1)];
        const mag = Math.sqrt(gx * gx + gy * gy);
        edgeMap[idx] = mag;
        edgeDirMap[idx] = Math.atan2(gy, gx);
        totalEdge += mag;
        if (mag > 30) edgeCount++;
      }
    }

    const density = edgeCount / (W * H);
    const avgEdge = totalEdge / (W * H);

    // Detect dominant edge directions
    const dirBuckets = new Array(8).fill(0);
    for (let i = 0; i < W * H; i++) {
      if (edgeMap[i] > 30) {
        const bucket = Math.floor(((edgeDirMap[i] + Math.PI) / (2 * Math.PI)) * 8) % 8;
        dirBuckets[bucket]++;
      }
    }
    const totalDirEdges = dirBuckets.reduce((a, b) => a + b, 0) || 1;
    const horizontalRatio = (dirBuckets[0] + dirBuckets[4]) / totalDirEdges;
    const verticalRatio = (dirBuckets[2] + dirBuckets[6]) / totalDirEdges;
    const diagonalRatio = (dirBuckets[1] + dirBuckets[3] + dirBuckets[5] + dirBuckets[7]) / totalDirEdges;

    // Extract contours for level generation
    const contourPoints = [];
    const threshold = avgEdge * 2;
    for (let y = 2; y < H - 2; y += 4) {
      for (let x = 2; x < W - 2; x += 4) {
        if (edgeMap[y * W + x] > threshold) {
          contourPoints.push({
            x: x / W,
            y: y / H,
            strength: edgeMap[y * W + x] / 255,
            direction: edgeDirMap[y * W + x],
          });
        }
      }
    }

    return {
      map: edgeMap,
      dirMap: edgeDirMap,
      density,
      avgStrength: avgEdge,
      horizontalEdges: horizontalRatio,
      verticalEdges: verticalRatio,
      diagonalEdges: diagonalRatio,
      dominantDirection: horizontalRatio > verticalRatio && horizontalRatio > diagonalRatio ? 'horizontal' :
                         verticalRatio > diagonalRatio ? 'vertical' : 'diagonal',
      contourPoints,
      hasStrongEdges: density > 0.15,
      isSmooth: density < 0.05,
    };
  }

  // ─── Texture Analysis ────────────────────────────────────────────────
  function analyzeTexture(pixels, W, H) {
    const blockSize = 16;
    const bW = Math.floor(W / blockSize);
    const bH = Math.floor(H / blockSize);
    const blocks = [];
    let totalVariance = 0;

    for (let by = 0; by < bH; by++) {
      for (let bx = 0; bx < bW; bx++) {
        let sum = 0, sumSq = 0, count = 0;
        for (let y = by * blockSize; y < (by + 1) * blockSize && y < H; y++) {
          for (let x = bx * blockSize; x < (bx + 1) * blockSize && x < W; x++) {
            const i = (y * W + x) * 4;
            const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
            sum += gray; sumSq += gray * gray; count++;
          }
        }
        const mean = sum / count;
        const variance = (sumSq / count) - (mean * mean);
        blocks.push({ x: bx, y: by, variance, mean });
        totalVariance += variance;
      }
    }

    const avgVariance = totalVariance / blocks.length;
    const highVarianceBlocks = blocks.filter(b => b.variance > avgVariance * 2).length;
    const lowVarianceBlocks = blocks.filter(b => b.variance < avgVariance * 0.3).length;

    return {
      blocks,
      avgVariance,
      textureType: avgVariance > 2000 ? 'complex' :
                   avgVariance > 800 ? 'moderate' :
                   avgVariance > 200 ? 'simple' : 'flat',
      uniformity: lowVarianceBlocks / blocks.length,
      detailAreas: highVarianceBlocks / blocks.length,
      isPhotographic: avgVariance > 500 && avgVariance < 5000,
      isIllustration: avgVariance < 500 || (lowVarianceBlocks / blocks.length > 0.5),
      isPattern: avgVariance > 200 && (lowVarianceBlocks / blocks.length < 0.3),
    };
  }

  // ─── Complexity Score ────────────────────────────────────────────────
  function computeComplexity(edges, texture, palette) {
    const edgeScore = clamp(edges.density * 5, 0, 1);
    const textureScore = clamp(texture.avgVariance / 3000, 0, 1);
    const colorScore = clamp(palette.colors.filter(c => c.frequency > 0.03).length / 8, 0, 1);

    const overall = (edgeScore * 0.4 + textureScore * 0.35 + colorScore * 0.25);
    return {
      overall,
      edgeComplexity: edgeScore,
      textureComplexity: textureScore,
      colorComplexity: colorScore,
      level: overall > 0.7 ? 'high' : overall > 0.4 ? 'medium' : 'low',
    };
  }

  // ─── Composition Analysis ────────────────────────────────────────────
  function analyzeComposition(pixels, W, H, edges) {
    // Rule of thirds focal analysis
    const thirdPoints = [
      { x: W / 3, y: H / 3 },
      { x: 2 * W / 3, y: H / 3 },
      { x: W / 3, y: 2 * H / 3 },
      { x: 2 * W / 3, y: 2 * H / 3 },
    ];

    const focalStrengths = thirdPoints.map(p => {
      let strength = 0, count = 0;
      const r = 12;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const px = Math.floor(p.x + dx), py = Math.floor(p.y + dy);
          if (px >= 0 && px < W && py >= 0 && py < H) {
            strength += edges.map[py * W + px];
            count++;
          }
        }
      }
      return { ...p, strength: strength / count };
    });

    // Symmetry detection
    let symmetryScore = 0;
    const sampleCount = 500;
    for (let i = 0; i < sampleCount; i++) {
      const x = Math.floor(Math.random() * (W / 2));
      const y = Math.floor(Math.random() * H);
      const i1 = (y * W + x) * 4;
      const i2 = (y * W + (W - 1 - x)) * 4;
      const diff = Math.abs(pixels[i1] - pixels[i2]) +
                   Math.abs(pixels[i1 + 1] - pixels[i2 + 1]) +
                   Math.abs(pixels[i1 + 2] - pixels[i2 + 2]);
      if (diff < 60) symmetryScore++;
    }
    symmetryScore /= sampleCount;

    // Center vs periphery weight
    let centerWeight = 0, edgeWeight = 0, centerCount = 0, edgeCount = 0;
    const centerR = Math.min(W, H) * 0.3;
    const cx = W / 2, cy = H / 2;
    for (let y = 0; y < H; y += 4) {
      for (let x = 0; x < W; x += 4) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const val = edges.map[y * W + x];
        if (dist < centerR) { centerWeight += val; centerCount++; }
        else { edgeWeight += val; edgeCount++; }
      }
    }
    const centerFocus = (centerWeight / (centerCount || 1)) / ((edgeWeight / (edgeCount || 1)) || 1);

    return {
      focalStrengths,
      symmetry: symmetryScore,
      isSymmetrical: symmetryScore > 0.6,
      centerFocus,
      isCentered: centerFocus > 1.3,
      layout: symmetryScore > 0.6 ? 'symmetrical' :
              centerFocus > 1.5 ? 'centered' :
              edges.horizontalEdges > 0.4 ? 'layered' : 'dynamic',
    };
  }

  // ─── Focal Point Detection ───────────────────────────────────────────
  function findFocalPoints(edges, palette, W, H) {
    const gridSize = 16;
    const cells = [];
    const gW = Math.floor(W / gridSize), gH = Math.floor(H / gridSize);

    for (let gy = 0; gy < gH; gy++) {
      for (let gx = 0; gx < gW; gx++) {
        let totalEdge = 0, count = 0;
        for (let y = gy * gridSize; y < (gy + 1) * gridSize && y < H; y++) {
          for (let x = gx * gridSize; x < (gx + 1) * gridSize && x < W; x++) {
            totalEdge += edges.map[y * W + x]; count++;
          }
        }
        cells.push({ x: (gx + 0.5) / gW, y: (gy + 0.5) / gH, intensity: totalEdge / count });
      }
    }

    // Top focal points by edge intensity
    cells.sort((a, b) => b.intensity - a.intensity);
    return cells.slice(0, 6).map(c => ({
      x: c.x, y: c.y,
      importance: c.intensity / (cells[0].intensity || 1),
    }));
  }

  // ─── Feature Detection (heuristic) ──────────────────────────────────
  function detectFeatures(pixels, W, H, regions, palette) {
    const features = {
      hasWater: false,
      hasVegetation: false,
      hasSky: false,
      hasEarth: false,
      hasFire: false,
      hasSnow: false,
      hasNight: false,
      hasSunset: false,
      hasArchitecture: false,
      hasNature: false,
      hasCharacter: false,
      tags: [],
    };

    // Color-based feature detection across regions
    const checkColor = (r, g, b) => {
      const hsl = rgbToHsl(r, g, b);
      return { h: hsl.h * 360, s: hsl.s, l: hsl.l, r, g, b };
    };

    // Check each palette color
    for (const c of palette.colors.slice(0, 6)) {
      const col = checkColor(c.r, c.g, c.b);
      // Water: blue hue, moderate saturation
      if (col.h > 180 && col.h < 260 && col.s > 0.2 && col.l > 0.2 && col.l < 0.7) features.hasWater = true;
      // Vegetation: green hue
      if (col.h > 70 && col.h < 170 && col.s > 0.15 && col.l > 0.15 && col.l < 0.7) features.hasVegetation = true;
      // Earth: brown/tan
      if (col.h > 15 && col.h < 45 && col.s > 0.15 && col.l > 0.2 && col.l < 0.6) features.hasEarth = true;
      // Fire: red/orange, high saturation
      if (col.h < 30 && col.s > 0.5 && col.l > 0.3) features.hasFire = true;
      // Snow: very light, low saturation
      if (col.l > 0.85 && col.s < 0.15) features.hasSnow = true;
    }

    // Sky detection from top region
    const skyColor = checkColor(regions.skyColor.r, regions.skyColor.g, regions.skyColor.b);
    features.hasSky = (skyColor.h > 180 && skyColor.h < 260 && skyColor.l > 0.35) || skyColor.l > 0.6;
    features.hasNight = palette.brightness < 0.25;
    features.hasSunset = skyColor.h > 5 && skyColor.h < 50 && skyColor.s > 0.3;

    // Architecture detection: lots of straight edges + geometric patterns
    features.hasArchitecture = regions.quadrants.some(q => {
      const col = checkColor(q.avg.r, q.avg.g, q.avg.b);
      return col.s < 0.2 && col.l > 0.3 && col.l < 0.7;
    });

    features.hasNature = features.hasVegetation || features.hasWater;

    // Build tags
    if (features.hasWater) features.tags.push('water');
    if (features.hasVegetation) features.tags.push('vegetation');
    if (features.hasSky) features.tags.push('sky');
    if (features.hasEarth) features.tags.push('earth');
    if (features.hasFire) features.tags.push('fire');
    if (features.hasSnow) features.tags.push('snow');
    if (features.hasNight) features.tags.push('night');
    if (features.hasSunset) features.tags.push('sunset');
    if (features.hasArchitecture) features.tags.push('architecture');
    if (features.hasNature) features.tags.push('nature');

    return features;
  }

  // ─── Mood Detection ──────────────────────────────────────────────────
  function detectMood(palette, regions, complexity) {
    const b = palette.brightness;
    const s = palette.saturation;
    const w = palette.warmth;
    const c = complexity.overall;

    // Mood scoring
    const moods = {
      epic: 0, calm: 0, dark: 0, cute: 0, mysterious: 0,
      energetic: 0, melancholic: 0, adventurous: 0, horror: 0, peaceful: 0,
    };

    // Brightness effects
    if (b < 0.2) { moods.dark += 3; moods.horror += 2; moods.mysterious += 2; }
    else if (b < 0.35) { moods.dark += 1; moods.mysterious += 1; moods.melancholic += 1; }
    else if (b > 0.65) { moods.calm += 1; moods.cute += 1; moods.peaceful += 2; }
    else if (b > 0.5) { moods.adventurous += 1; moods.energetic += 1; }

    // Saturation effects
    if (s > 0.6) { moods.energetic += 2; moods.epic += 1; moods.cute += 1; }
    else if (s < 0.2) { moods.melancholic += 2; moods.mysterious += 1; moods.calm += 1; }

    // Warmth effects
    if (w === 'warm') { moods.adventurous += 1; moods.energetic += 1; moods.epic += 1; }
    else if (w === 'cool') { moods.calm += 1; moods.mysterious += 1; moods.melancholic += 1; }

    // Complexity effects
    if (c > 0.6) { moods.epic += 2; moods.adventurous += 1; }
    else if (c < 0.3) { moods.calm += 2; moods.peaceful += 1; }

    // Find top mood
    const sorted = Object.entries(moods).sort((a, b) => b[1] - a[1]);
    return {
      primary: sorted[0][0],
      secondary: sorted[1][0],
      scores: moods,
      confidence: sorted[0][1] / (sorted[0][1] + sorted[1][1] + 0.01),
    };
  }

  // ─── Atmosphere Detection ────────────────────────────────────────────
  function detectAtmosphere(palette, regions) {
    const features = [];
    if (palette.isDark) features.push('dark');
    if (palette.isLight) features.push('bright');
    if (palette.isVivid) features.push('vivid');
    if (palette.isMuted) features.push('muted');
    if (palette.warmth === 'warm') features.push('warm');
    if (palette.warmth === 'cool') features.push('cool');
    if (regions.hasSky) features.push('open-sky');
    if (regions.gradientDirection === 'top-bright') features.push('daylight');

    // Time of day estimation
    const skyHsl = rgbToHsl(regions.skyColor.r, regions.skyColor.g, regions.skyColor.b);
    let timeOfDay = 'day';
    if (skyHsl.l < 0.15) timeOfDay = 'night';
    else if (skyHsl.l < 0.3 && skyHsl.h > 0.55) timeOfDay = 'twilight';
    else if (skyHsl.h > 0.02 && skyHsl.h < 0.12 && skyHsl.s > 0.3) timeOfDay = 'sunset';
    else if (skyHsl.l > 0.7) timeOfDay = 'bright-day';

    return { features, timeOfDay };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PHASE 2: GAME PARAMETER MAPPING
  // ═══════════════════════════════════════════════════════════════════════════

  function suggestGameParameters(analysis) {
    const { palette, edges, complexity, composition, detectedFeatures, mood, regions } = analysis;

    // ─── Game Type Suggestion ──────────────────────
    const typeScores = {
      runner: 0, rpg: 0, platformer: 0, puzzle: 0, tower_defense: 0,
    };

    // Horizontal composition → runner
    if (edges.dominantDirection === 'horizontal') typeScores.runner += 2;
    if (composition.layout === 'layered') typeScores.runner += 2;
    if (regions.hasSky && regions.hasGround) typeScores.runner += 1;

    // Complex, dark images → RPG
    if (complexity.level === 'high') typeScores.rpg += 2;
    if (palette.isDark) typeScores.rpg += 1;
    if (mood.primary === 'epic' || mood.primary === 'dark' || mood.primary === 'mysterious') typeScores.rpg += 2;
    if (detectedFeatures.hasArchitecture) typeScores.rpg += 1;

    // Vertical edges + distinct levels → platformer
    if (edges.dominantDirection === 'vertical') typeScores.platformer += 2;
    if (regions.hasSky) typeScores.platformer += 1;
    if (composition.layout === 'dynamic') typeScores.platformer += 1;

    // Colorful, medium complexity → puzzle
    if (palette.isVivid) typeScores.puzzle += 2;
    if (palette.colors.filter(c => c.s > 0.4).length >= 4) typeScores.puzzle += 2;
    if (complexity.level === 'low') typeScores.puzzle += 1;
    if (mood.primary === 'cute' || mood.primary === 'calm') typeScores.puzzle += 1;
    if (composition.isSymmetrical) typeScores.puzzle += 1;

    // Structured layout + clear paths → tower defense
    if (composition.layout === 'centered') typeScores.tower_defense += 1;
    if (edges.hasStrongEdges && composition.isSymmetrical) typeScores.tower_defense += 2;
    if (detectedFeatures.hasArchitecture) typeScores.tower_defense += 1;

    const sortedTypes = Object.entries(typeScores).sort((a, b) => b[1] - a[1]);
    const gameType = sortedTypes[0][0];

    // ─── Theme Suggestion ──────────────────────────
    let theme = 'fantasy';
    if (detectedFeatures.hasWater && !detectedFeatures.hasVegetation) theme = 'ocean';
    else if (detectedFeatures.hasVegetation && detectedFeatures.hasEarth) theme = 'forest';
    else if (detectedFeatures.hasEarth && !detectedFeatures.hasVegetation) theme = 'desert';
    else if (detectedFeatures.hasFire) theme = 'volcanic';
    else if (detectedFeatures.hasSnow) theme = 'snow';
    else if (detectedFeatures.hasNight) theme = 'dungeon';
    else if (detectedFeatures.hasSunset) theme = 'sky';
    else if (detectedFeatures.hasArchitecture) theme = 'city';
    else if (palette.isDark) theme = 'cave';
    else if (palette.isLight && detectedFeatures.hasSky) theme = 'sky';
    else if (detectedFeatures.hasVegetation) theme = 'forest';
    else if (detectedFeatures.hasWater) theme = 'ocean';

    return {
      gameType,
      gameTypeScores: typeScores,
      alternativeTypes: sortedTypes.slice(1, 3).map(([t]) => t),
      theme,
      mood: mood.primary,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PHASE 3: GAME CONFIG BUILDER
  // ═══════════════════════════════════════════════════════════════════════════

  function buildGameConfig(analysis) {
    const { palette, edges, regions, horizonLine, composition, focalPoints,
            detectedFeatures, mood, atmosphere, complexity, suggestedGameType, suggestedTheme } = analysis;

    // ─── Build color palette for game ─────────────
    const gamePalette = buildGamePalette(palette, regions, detectedFeatures);

    // ─── Build level layout from image ────────────
    const levelLayout = buildLevelLayout(edges, composition, focalPoints, horizonLine);

    // ─── Build entity placements ──────────────────
    const entities = buildEntityPlacements(focalPoints, edges, palette, complexity);

    // ─── Build environment settings ───────────────
    const environment = buildEnvironment(atmosphere, regions, palette);

    // ─── Difficulty from complexity ───────────────
    const difficulty = complexity.overall > 0.6 ? 'hard' :
                       complexity.overall > 0.35 ? 'medium' : 'easy';

    // ─── Character from mood ─────────────────────
    const character = buildCharacter(mood, detectedFeatures, suggestedTheme);

    return {
      palette: gamePalette,
      levelLayout,
      entities,
      environment,
      difficulty,
      character,
      gameType: suggestedGameType,
      theme: suggestedTheme,
      mood: mood.primary,
      speed: complexity.overall > 0.5 ? 'fast' : 'normal',
      particleIntensity: palette.isVivid ? 'high' : palette.isMuted ? 'low' : 'medium',
    };
  }

  function buildGamePalette(palette, regions, features) {
    const colors = palette.colors;
    const skyRgb = regions.skyColor;
    const groundRgb = regions.groundColor;
    const midRgb = regions.midColor;

    // Pick the most saturated color for accent
    const accentColor = [...colors].sort((a, b) => b.s - a.s)[0] || colors[0];
    // Pick contrasting color for obstacles
    const obstacleColor = colors.find(c =>
      colorDistance(c, accentColor) > 80 && c.l < 0.5
    ) || colors[Math.min(2, colors.length - 1)];
    // Pick bright color for particles
    const particleColor = colors.find(c => c.l > 0.6 && c.s > 0.3) || accentColor;
    // Pick muted color for platforms
    const platformColor = colors.find(c => c.s < 0.4 && c.l > 0.3 && c.l < 0.7) || colors[1] || colors[0];

    return {
      sky: [`rgb(${skyRgb.r},${skyRgb.g},${skyRgb.b})`,
            `rgb(${Math.round(skyRgb.r * 0.7)},${Math.round(skyRgb.g * 0.7)},${Math.round(skyRgb.b * 0.7)})`],
      ground: [`rgb(${groundRgb.r},${groundRgb.g},${groundRgb.b})`,
               `rgb(${Math.round(groundRgb.r * 0.85)},${Math.round(groundRgb.g * 0.85)},${Math.round(groundRgb.b * 0.85)})`],
      accent: accentColor.hex,
      obstacle: obstacleColor.hex,
      platform: platformColor.hex,
      particle: particleColor.hex,
      bg: colors.slice(0, 3).map(c => c.hex),
      mid: `rgb(${midRgb.r},${midRgb.g},${midRgb.b})`,
      // Full palette for reference
      full: colors.map(c => c.hex),
    };
  }

  function buildLevelLayout(edges, composition, focalPoints, horizonLine) {
    // Convert edge contours to platform positions
    const platforms = [];
    const obstacles = [];

    // Use contour points as platform hints
    const contours = edges.contourPoints;

    // Group contours into horizontal runs (potential platforms)
    const yBuckets = {};
    for (const p of contours) {
      const yKey = Math.round(p.y * 20); // 20 vertical buckets
      if (!yBuckets[yKey]) yBuckets[yKey] = [];
      yBuckets[yKey].push(p);
    }

    for (const [yKey, points] of Object.entries(yBuckets)) {
      if (points.length < 2) continue;
      points.sort((a, b) => a.x - b.x);

      // Find runs of nearby points
      let runStart = points[0].x;
      let runEnd = points[0].x;
      for (let i = 1; i < points.length; i++) {
        if (points[i].x - runEnd < 0.1) {
          runEnd = points[i].x;
        } else {
          if (runEnd - runStart > 0.05) {
            platforms.push({
              x: runStart, y: parseInt(yKey) / 20,
              width: runEnd - runStart,
              fromImage: true,
            });
          }
          runStart = points[i].x;
          runEnd = points[i].x;
        }
      }
      if (runEnd - runStart > 0.05) {
        platforms.push({
          x: runStart, y: parseInt(yKey) / 20,
          width: runEnd - runStart,
          fromImage: true,
        });
      }
    }

    // Use focal points as obstacle/item positions
    for (const fp of focalPoints) {
      obstacles.push({ x: fp.x, y: fp.y, importance: fp.importance });
    }

    return {
      horizonLine: horizonLine.y,
      platforms: platforms.slice(0, 20), // Cap for performance
      obstacles: obstacles.slice(0, 10),
      isLayered: composition.layout === 'layered',
      isCentered: composition.isCentered,
      isSymmetrical: composition.isSymmetrical,
    };
  }

  function buildEntityPlacements(focalPoints, edges, palette, complexity) {
    const enemyCount = complexity.level === 'high' ? 8 :
                       complexity.level === 'medium' ? 5 : 3;
    const itemCount = Math.max(3, Math.round(focalPoints.length * 1.5));

    return {
      enemyCount,
      itemCount,
      bossAtFocalPoint: focalPoints.length > 0 ? focalPoints[0] : null,
      spawnZones: focalPoints.slice(0, 4).map(fp => ({
        x: fp.x, y: fp.y,
        radius: 0.15,
        type: fp.importance > 0.7 ? 'enemy' : 'item',
      })),
    };
  }

  function buildEnvironment(atmosphere, regions, palette) {
    const env = {
      timeOfDay: atmosphere.timeOfDay,
      fog: palette.isMuted || palette.isDark,
      fogDensity: palette.isMuted ? 0.4 : palette.isDark ? 0.6 : 0.2,
      ambientLight: palette.brightness,
      parallaxLayers: regions.hasSky ? 3 : 1,
      weatherEffect: null,
    };

    if (palette.warmth === 'cool' && palette.brightness > 0.6) env.weatherEffect = 'snow';
    else if (palette.isDark && palette.warmth === 'cool') env.weatherEffect = 'rain';
    else if (atmosphere.features.includes('warm') && !palette.isDark) env.weatherEffect = 'leaves';

    return env;
  }

  function buildCharacter(mood, features, theme) {
    const charMap = {
      epic: { type: 'warrior', weapon: 'greatsword', style: 'heavy' },
      dark: { type: 'shadow', weapon: 'dagger', style: 'stealth' },
      mysterious: { type: 'mage', weapon: 'staff', style: 'arcane' },
      calm: { type: 'wanderer', weapon: 'bow', style: 'ranger' },
      cute: { type: 'sprite', weapon: 'wand', style: 'cute' },
      energetic: { type: 'ninja', weapon: 'katana', style: 'fast' },
      melancholic: { type: 'bard', weapon: 'lute', style: 'magic' },
      adventurous: { type: 'explorer', weapon: 'sword', style: 'balanced' },
      horror: { type: 'survivor', weapon: 'torch', style: 'desperate' },
      peaceful: { type: 'farmer', weapon: 'staff', style: 'gentle' },
    };

    const themeOverrides = {
      ocean: { type: 'sailor', weapon: 'harpoon' },
      volcanic: { type: 'firewalker', weapon: 'flame-blade' },
      snow: { type: 'frostborn', weapon: 'ice-spear' },
      space: { type: 'cosmonaut', weapon: 'laser' },
    };

    const base = charMap[mood.primary] || charMap.adventurous;
    const override = themeOverrides[theme] || {};
    return { ...base, ...override };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PHASE 4: SERVER-SIDE LLM VISION INTEGRATION (optional boost)
  // ═══════════════════════════════════════════════════════════════════════════

  async function analyzeWithVision(imageDataUrl) {
    try {
      const resp = await fetch('/api/mobile/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.analysis || null;
    } catch {
      return null;
    }
  }

  // Merge server-side LLM analysis with client-side analysis
  function mergeAnalysis(clientAnalysis, serverAnalysis) {
    if (!serverAnalysis) return clientAnalysis;

    const merged = { ...clientAnalysis };

    // Server overrides for detected objects/scene
    if (serverAnalysis.objects) {
      merged.detectedObjects = serverAnalysis.objects;
    }
    if (serverAnalysis.sceneDescription) {
      merged.sceneDescription = serverAnalysis.sceneDescription;
    }
    if (serverAnalysis.suggestedGameType) {
      merged.suggestedGameType = serverAnalysis.suggestedGameType;
    }
    if (serverAnalysis.suggestedTheme) {
      merged.suggestedTheme = serverAnalysis.suggestedTheme;
    }
    if (serverAnalysis.suggestedMood) {
      merged.suggestedMood = serverAnalysis.suggestedMood;
    }
    if (serverAnalysis.characters) {
      merged.gameConfig.character = serverAnalysis.characters[0] || merged.gameConfig.character;
    }
    if (serverAnalysis.levelHints) {
      merged.gameConfig.levelHints = serverAnalysis.levelHints;
    }

    // Rebuild game config with merged data
    merged.gameConfig = buildGameConfig(merged);

    return merged;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PHASE 5: IMAGE → SPRITE GENERATOR
  // ═══════════════════════════════════════════════════════════════════════════

  // Extract a sprite-like silhouette from the image's most prominent shape
  function extractSpriteSilhouette(imgElement, analysis) {
    const size = 64;
    const imgData = getPixels(imgElement, size, size);
    const pixels = imgData.data;

    // Use edge detection to find the main shape
    const edges = analysis.edges;
    const threshold = edges.avgStrength * 1.5;

    // Find bounding box of strongest edge cluster
    let minX = size, maxX = 0, minY = size, maxY = 0;
    const edgePixels = [];
    for (let y = 2; y < size - 2; y++) {
      for (let x = 2; x < size - 2; x++) {
        // Recompute edge at this scale
        const i = y * size + x;
        const gray = (idx) => {
          const pi = idx * 4;
          return pixels[pi] * 0.299 + pixels[pi + 1] * 0.587 + pixels[pi + 2] * 0.114;
        };
        const gx = -gray((y-1)*size+(x-1)) + gray((y-1)*size+(x+1))
                  - 2*gray(y*size+(x-1)) + 2*gray(y*size+(x+1))
                  - gray((y+1)*size+(x-1)) + gray((y+1)*size+(x+1));
        const gy = -gray((y-1)*size+(x-1)) - 2*gray((y-1)*size+x) - gray((y-1)*size+(x+1))
                  + gray((y+1)*size+(x-1)) + 2*gray((y+1)*size+x) + gray((y+1)*size+(x+1));
        const mag = Math.sqrt(gx * gx + gy * gy);

        if (mag > 40) {
          edgePixels.push({ x, y, mag });
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Extract the region
    const regionW = maxX - minX + 1;
    const regionH = maxY - minY + 1;

    return {
      edgePixels,
      boundingBox: { x: minX / size, y: minY / size, w: regionW / size, h: regionH / size },
      silhouettePoints: edgePixels.map(p => ({
        x: (p.x - minX) / (regionW || 1),
        y: (p.y - minY) / (regionH || 1),
      })),
    };
  }

  // Generate terrain heightmap from image bottom region
  function extractTerrainProfile(imgElement, analysis) {
    const size = 128;
    const imgData = getPixels(imgElement, size, size);
    const pixels = imgData.data;

    // Use bottom 40% of image for terrain profile
    const startY = Math.floor(size * 0.6);
    const profile = new Array(size).fill(0);

    for (let x = 0; x < size; x++) {
      // Find the topmost "ground" pixel in this column
      for (let y = startY; y < size; y++) {
        const i = (y * size + x) * 4;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const hsl = rgbToHsl(r, g, b);

        // Is this pixel likely "ground"?
        const isGround = hsl.l < 0.6 && (
          (hsl.h > 0.05 && hsl.h < 0.15) || // Brown
          (hsl.h > 0.2 && hsl.h < 0.45 && hsl.s > 0.1) || // Green
          hsl.l < 0.3 // Dark
        );

        if (isGround) {
          profile[x] = 1 - (y - startY) / (size - startY);
          break;
        }
      }
    }

    // Smooth the profile
    const smoothed = new Array(size);
    for (let x = 0; x < size; x++) {
      let sum = 0, count = 0;
      for (let dx = -3; dx <= 3; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < size) { sum += profile[nx]; count++; }
      }
      smoothed[x] = sum / count;
    }

    return smoothed;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    analyzeImageDeep,
    analyzeWithVision,
    mergeAnalysis,
    extractSpriteSilhouette,
    extractTerrainProfile,
    buildGameConfig,
    buildGamePalette,
    suggestGameParameters,

    // Expose utilities for external use
    utils: {
      rgbToHsl,
      hslToRgb,
      rgbToHex,
      colorDistance,
      extractPalette,
      detectEdges,
      analyzeRegions,
      detectHorizonLine,
    },
  };
})();

if (typeof module !== 'undefined') module.exports = ImageToGameEngine;
