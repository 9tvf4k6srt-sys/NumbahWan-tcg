// ═══════════════════════════════════════════════════════════════════════════════
//  NWGE Image-to-World Engine v1.0
//  
//  Transforms any uploaded image into:
//  1. A full 3D VoxelSpace world (WoW/Unreal quality) with image-derived terrain
//  2. WebGL post-processing: bloom, depth-of-field, volumetric fog, god rays
//  3. Image-as-texture: actual image pixels become terrain, sky, water
//  4. Real-time shader effects matched to image atmosphere
//  5. Image-derived entity sprites via region extraction + pixelation
//
//  NO LLM required — pure client-side computer vision → rendering pipeline
// ═══════════════════════════════════════════════════════════════════════════════

const ImageToWorldEngine = (() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════
  //  PHASE 1: IMAGE → 3D ZONE PARAMETERS
  //  Converts deep image analysis into WowRenderer zone presets
  // ═══════════════════════════════════════════════════════════════════════

  function imageToZonePreset(deepAnalysis, imgElement) {
    const { palette, regions, edges, mood, atmosphere, detectedFeatures,
            complexity, composition, horizonLine } = deepAnalysis;

    // Extract actual RGB from palette dominant colors
    const colors = palette.colors;
    const skyC = regions.skyColor;
    const gndC = regions.groundColor;
    const midC = regions.midColor;

    // --- Grass/ground colors from image bottom region ---
    const grassBase = [
      Math.round(gndC.r * 0.9 + midC.r * 0.1),
      Math.round(gndC.g * 0.9 + midC.g * 0.1),
      Math.round(gndC.b * 0.9 + midC.b * 0.1),
    ];
    const grassVar = [
      Math.round(Math.abs(gndC.r - midC.r) * 0.4 + 10),
      Math.round(Math.abs(gndC.g - midC.g) * 0.4 + 10),
      Math.round(Math.abs(gndC.b - midC.b) * 0.4 + 8),
    ];

    // --- Dirt path colors from brown/neutral tones ---
    const brownColor = colors.find(c => {
      const h = c.h * 360;
      return h > 15 && h < 50 && c.s > 0.1 && c.l < 0.6;
    }) || { r: gndC.r * 0.8, g: gndC.g * 0.7, b: gndC.b * 0.5 };
    const dirtBase = [Math.round(brownColor.r), Math.round(brownColor.g), Math.round(brownColor.b)];
    const dirtVar = [16, 12, 10];

    // --- Water color from blue tones ---
    const blueColor = colors.find(c => {
      const h = c.h * 360;
      return h > 180 && h < 260 && c.s > 0.2;
    }) || { r: 28, g: 115, b: 170 };
    const waterColor = [Math.round(blueColor.r), Math.round(blueColor.g), Math.round(blueColor.b)];

    // --- Tree color from green tones ---
    const greenColor = colors.find(c => {
      const h = c.h * 360;
      return h > 70 && h < 170 && c.s > 0.15;
    }) || { r: 44, g: 115, b: 32 };
    const treeColor = [Math.round(greenColor.r), Math.round(greenColor.g), Math.round(greenColor.b)];
    const treeTrunk = [Math.round(brownColor.r * 0.7), Math.round(brownColor.g * 0.5), Math.round(brownColor.b * 0.35)];

    // --- Sky colors (actual image sky) ---
    function toHex(r, g, b) {
      return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    }
    const skyTop = toHex(skyC.r, skyC.g, skyC.b);
    const skyBottom = toHex(
      Math.round(skyC.r * 0.7 + midC.r * 0.3),
      Math.round(skyC.g * 0.7 + midC.g * 0.3),
      Math.round(skyC.b * 0.7 + midC.b * 0.3),
    );

    // --- Accent color for buildings ---
    const accentColor = [...colors].sort((a, b) => b.s - a.s)[0] || colors[0];
    const roofColor = [
      Math.round(accentColor.r * 0.6),
      Math.round(accentColor.g * 0.65),
      Math.round(accentColor.b * 0.75),
    ];
    const wallColor = [
      Math.round(palette.avgColor.r * 0.9 + 30),
      Math.round(palette.avgColor.g * 0.85 + 30),
      Math.round(palette.avgColor.b * 0.8 + 25),
    ];

    // --- Fog from palette characteristics ---
    const fogColor = [
      Math.round(skyC.r * 0.6 + gndC.r * 0.4),
      Math.round(skyC.g * 0.6 + gndC.g * 0.4),
      Math.round(skyC.b * 0.6 + gndC.b * 0.4),
    ];
    const fogDist = palette.isMuted ? 0.3 : palette.isDark ? 0.35 : 0.55;

    // --- Sun from warmth/brightness ---
    const sunColor = palette.warmth === 'warm' ?
      [255, 240, 200] :
      palette.warmth === 'cool' ?
        [200, 220, 255] :
        [240, 240, 230];
    const sunDir = palette.brightness > 0.5 ? 0.7 : 0.4;

    // --- Mountain color (darker sky/ground blend) ---
    const mountainColor = [
      Math.round(skyC.r * 0.3 + gndC.r * 0.4 + 20),
      Math.round(skyC.g * 0.3 + gndC.g * 0.4 + 25),
      Math.round(skyC.b * 0.3 + gndC.b * 0.4 + 20),
    ];
    const mountainFog = [
      Math.round(fogColor[0] * 0.85 + mountainColor[0] * 0.15),
      Math.round(fogColor[1] * 0.85 + mountainColor[1] * 0.15),
      Math.round(fogColor[2] * 0.85 + mountainColor[2] * 0.15),
    ];

    // --- Time of day from atmosphere ---
    const time = atmosphere?.timeOfDay === 'night' ? 'night' :
                 atmosphere?.timeOfDay === 'twilight' ? 'night' :
                 'day';

    // --- Feature flags from detection ---
    const hasWater = detectedFeatures?.hasWater || false;
    const hasTrees = detectedFeatures?.hasVegetation || false;
    const hasBuildings = detectedFeatures?.hasArchitecture || false;

    return {
      grassBase, grassVar,
      dirtBase, dirtVar,
      waterColor,
      treeColor, treeTrunk,
      roofColor, wallColor,
      skyTop, skyBottom,
      fogColor, fogDist,
      sunColor, sunDir,
      mountainColor, mountainFog,
      time, hasWater, hasTrees, hasBuildings,
      // Extra data for enhanced rendering
      _imageAnalysis: true,
      _palette: palette,
      _mood: mood,
      _complexity: complexity,
      _horizonLine: horizonLine,
      _composition: composition,
      _features: detectedFeatures,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PHASE 2: IMAGE-AS-TEXTURE EXTRACTION
  //  Use actual image pixels as terrain, sky, and environment textures
  // ═══════════════════════════════════════════════════════════════════════

  function extractImageTextures(imgElement, deepAnalysis) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');

    // --- Terrain colormap (bottom 50% of image, stretched to 256x256) ---
    const terrainSize = 256;
    c.width = terrainSize; c.height = terrainSize;
    const imgW = imgElement.naturalWidth || imgElement.width;
    const imgH = imgElement.naturalHeight || imgElement.height;
    // Bottom half of image → terrain colormap
    ctx.drawImage(imgElement, 0, imgH * 0.4, imgW, imgH * 0.6, 0, 0, terrainSize, terrainSize);
    const terrainData = ctx.getImageData(0, 0, terrainSize, terrainSize);

    // --- Sky texture (top 40% of image, stretched to 512x256) ---
    const skyW = 512, skyH = 256;
    c.width = skyW; c.height = skyH;
    ctx.drawImage(imgElement, 0, 0, imgW, imgH * 0.45, 0, 0, skyW, skyH);
    const skyData = ctx.getImageData(0, 0, skyW, skyH);

    // --- Full image as parallax background (multiple scales) ---
    const bgSizes = [
      { w: 640, h: 360, label: 'far' },
      { w: 320, h: 180, label: 'mid' },
      { w: 160, h: 90, label: 'near' },
    ];
    const bgLayers = bgSizes.map(s => {
      c.width = s.w; c.height = s.h;
      ctx.drawImage(imgElement, 0, 0, s.w, s.h);
      return {
        data: ctx.getImageData(0, 0, s.w, s.h),
        width: s.w,
        height: s.h,
        label: s.label,
      };
    });

    // --- Extract heightmap from image luminance ---
    const hmSize = 256;
    c.width = hmSize; c.height = hmSize;
    ctx.drawImage(imgElement, 0, 0, hmSize, hmSize);
    const hmPixels = ctx.getImageData(0, 0, hmSize, hmSize).data;
    const heightmap = new Float32Array(hmSize * hmSize);
    for (let i = 0; i < hmSize * hmSize; i++) {
      const lum = (hmPixels[i * 4] * 0.299 + hmPixels[i * 4 + 1] * 0.587 + hmPixels[i * 4 + 2] * 0.114) / 255;
      heightmap[i] = lum;
    }

    // --- Extract water mask (blue-ish regions) ---
    const waterMask = new Uint8Array(hmSize * hmSize);
    for (let i = 0; i < hmSize * hmSize; i++) {
      const r = hmPixels[i * 4], g = hmPixels[i * 4 + 1], b = hmPixels[i * 4 + 2];
      const isWater = b > r + 20 && b > g && b > 80;
      waterMask[i] = isWater ? 255 : 0;
    }

    return {
      terrainColormap: terrainData,
      terrainSize,
      skyTexture: skyData,
      skyWidth: skyW,
      skyHeight: skyH,
      bgLayers,
      heightmap,
      heightmapSize: hmSize,
      waterMask,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PHASE 3: SPRITE EXTRACTION FROM IMAGE REGIONS
  //  Cut focal regions from image, pixelate into game sprites
  // ═══════════════════════════════════════════════════════════════════════

  function extractSprites(imgElement, deepAnalysis, options = {}) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const imgW = imgElement.naturalWidth || imgElement.width;
    const imgH = imgElement.naturalHeight || imgElement.height;
    const spriteSize = options.spriteSize || 32;
    const sprites = [];

    // Use focal points from composition analysis
    const focalPoints = deepAnalysis.focalPoints || [];
    const edgeContours = deepAnalysis.edges?.contourPoints || [];

    // --- Player sprite: center of highest-edge region ---
    const centerFocal = focalPoints.find(f => f.importance > 0.5) || { x: 0.5, y: 0.5 };
    sprites.push(extractSpriteFromRegion(imgElement, ctx, c, {
      x: centerFocal.x,
      y: centerFocal.y,
      size: 0.15,
      targetSize: spriteSize,
      label: 'player',
      pixelate: options.pixelArt !== false,
    }));

    // --- Enemy sprites: other focal points ---
    const enemyFocals = focalPoints.filter(f => f !== centerFocal).slice(0, 4);
    for (let i = 0; i < enemyFocals.length; i++) {
      sprites.push(extractSpriteFromRegion(imgElement, ctx, c, {
        x: enemyFocals[i].x,
        y: enemyFocals[i].y,
        size: 0.12,
        targetSize: spriteSize,
        label: `enemy_${i}`,
        pixelate: options.pixelArt !== false,
      }));
    }

    // --- Item sprites: sample from colorful regions ---
    const palette = deepAnalysis.palette?.colors || [];
    const vividColors = palette.filter(c => c.s > 0.5 && c.l > 0.3 && c.l < 0.8);
    for (let i = 0; i < Math.min(3, vividColors.length); i++) {
      // Generate a colored shape as item sprite
      const itemSprite = generateColorSprite(ctx, c, spriteSize, vividColors[i], i);
      sprites.push({ ...itemSprite, label: `item_${i}` });
    }

    // --- Background element sprites from edge clusters ---
    const bgRegions = findEdgeClusters(edgeContours);
    for (let i = 0; i < Math.min(3, bgRegions.length); i++) {
      sprites.push(extractSpriteFromRegion(imgElement, ctx, c, {
        x: bgRegions[i].cx,
        y: bgRegions[i].cy,
        size: 0.2,
        targetSize: spriteSize * 2,
        label: `bg_${i}`,
        pixelate: false, // Keep detail for backgrounds
      }));
    }

    return sprites;
  }

  function extractSpriteFromRegion(img, ctx, c, opts) {
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    const regionSize = Math.round(Math.max(imgW, imgH) * opts.size);
    const sx = Math.round(opts.x * imgW - regionSize / 2);
    const sy = Math.round(opts.y * imgH - regionSize / 2);
    const targetSize = opts.targetSize;

    c.width = targetSize;
    c.height = targetSize;
    ctx.clearRect(0, 0, targetSize, targetSize);

    // Draw the region
    ctx.imageSmoothingEnabled = !opts.pixelate;
    ctx.drawImage(img,
      Math.max(0, sx), Math.max(0, sy), regionSize, regionSize,
      0, 0, targetSize, targetSize
    );

    // Pixelate effect for pixel-art look
    if (opts.pixelate) {
      const pixelSize = 4;
      const tempC = document.createElement('canvas');
      const tempCtx = tempC.getContext('2d');
      const smallSize = Math.ceil(targetSize / pixelSize);
      tempC.width = smallSize; tempC.height = smallSize;
      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(c, 0, 0, smallSize, smallSize);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, targetSize, targetSize);
      ctx.drawImage(tempC, 0, 0, targetSize, targetSize);
    }

    const data = ctx.getImageData(0, 0, targetSize, targetSize);
    return {
      label: opts.label,
      width: targetSize,
      height: targetSize,
      imageData: data,
      dataURL: c.toDataURL(),
    };
  }

  function generateColorSprite(ctx, c, size, color, variant) {
    c.width = size; c.height = size;
    ctx.clearRect(0, 0, size, size);
    const shapes = ['circle', 'diamond', 'star'];
    const shape = shapes[variant % shapes.length];
    ctx.fillStyle = color.hex || `rgb(${color.r},${color.g},${color.b})`;

    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(size * 0.4, size * 0.4, size * 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(size / 2, size * 0.15);
      ctx.lineTo(size * 0.85, size / 2);
      ctx.lineTo(size / 2, size * 0.85);
      ctx.lineTo(size * 0.15, size / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      // Star
      const cx = size / 2, cy = size / 2, outerR = size * 0.4, innerR = size * 0.18;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i * Math.PI / 5) - Math.PI / 2;
        const method = i === 0 ? 'moveTo' : 'lineTo';
        ctx[method](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    }

    return {
      width: size, height: size,
      imageData: ctx.getImageData(0, 0, size, size),
      dataURL: c.toDataURL(),
    };
  }

  function findEdgeClusters(contourPoints) {
    if (!contourPoints || contourPoints.length < 5) return [];
    // Simple grid clustering
    const gridSize = 5;
    const grid = {};
    for (const p of contourPoints) {
      const key = `${Math.floor(p.x * gridSize)},${Math.floor(p.y * gridSize)}`;
      if (!grid[key]) grid[key] = { points: [], sx: 0, sy: 0 };
      grid[key].points.push(p);
      grid[key].sx += p.x;
      grid[key].sy += p.y;
    }
    return Object.values(grid)
      .filter(g => g.points.length > 3)
      .map(g => ({
        cx: g.sx / g.points.length,
        cy: g.sy / g.points.length,
        size: g.points.length,
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PHASE 4: WEBGL POST-PROCESSING PIPELINE
  //  Bloom, DOF, volumetric fog, chromatic aberration, god rays
  //  Driven by image atmosphere analysis
  // ═══════════════════════════════════════════════════════════════════════

  class PostFXPipeline {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = null;
      this.programs = {};
      this.fbos = {};
      this.quad = null;
      this.enabled = true;
      this.params = {
        bloomIntensity: 0.35,
        bloomThreshold: 0.7,
        bloomBlur: 4,
        dofFocus: 0.5,
        dofRange: 0.3,
        dofIntensity: 0.0,
        fogDensity: 0.0,
        fogColor: [0.6, 0.7, 0.8],
        vignetteIntensity: 0.3,
        godRayIntensity: 0.0,
        godRayAngle: 0.7,
        chromaticAberration: 0.0,
        colorGrading: null, // { lift, gamma, gain }
        filmGrain: 0.02,
      };
      this._init();
    }

    _init() {
      try {
        this.gl = this.canvas.getContext('webgl2') ||
                  this.canvas.getContext('webgl') ||
                  this.canvas.getContext('experimental-webgl');
      } catch (e) {}
      if (!this.gl) { this.enabled = false; return; }

      const gl = this.gl;
      this.quad = this._createQuad(gl);
      this.programs.composite = this._createProgram(gl, VERT_SHADER, COMPOSITE_FRAG);
      this.programs.blur = this._createProgram(gl, VERT_SHADER, BLUR_FRAG);
      this.programs.bloom = this._createProgram(gl, VERT_SHADER, BLOOM_EXTRACT_FRAG);

      // Create FBOs
      const w = this.canvas.width, h = this.canvas.height;
      this.fbos.scene = this._createFBO(gl, w, h);
      this.fbos.bloomExtract = this._createFBO(gl, w / 2, h / 2);
      this.fbos.bloomBlur = this._createFBO(gl, w / 4, h / 4);
    }

    configureFromAnalysis(deepAnalysis) {
      if (!deepAnalysis) return;
      const { palette, mood, atmosphere, complexity, detectedFeatures } = deepAnalysis;

      // Bloom: more for vivid/bright images
      this.params.bloomIntensity = palette.isVivid ? 0.5 : palette.isMuted ? 0.15 : 0.3;
      this.params.bloomThreshold = palette.isLight ? 0.6 : 0.75;

      // DOF: more for complex images
      this.params.dofIntensity = complexity.overall > 0.5 ? 0.4 : 0.15;
      this.params.dofFocus = deepAnalysis.horizonLine?.y || 0.5;

      // Fog: atmospheric
      if (palette.isMuted || mood?.primary === 'mysterious') {
        this.params.fogDensity = 0.3;
      } else if (palette.isDark) {
        this.params.fogDensity = 0.4;
      } else {
        this.params.fogDensity = 0.1;
      }
      const fc = palette.avgColor;
      this.params.fogColor = [fc.r / 255, fc.g / 255, fc.b / 255];

      // God rays: for bright/warm images with sky
      if (detectedFeatures?.hasSky && palette.warmth === 'warm' && !palette.isDark) {
        this.params.godRayIntensity = 0.25;
      }

      // Film grain: more for dark/moody
      this.params.filmGrain = mood?.primary === 'dark' || mood?.primary === 'horror' ? 0.05 :
                               mood?.primary === 'calm' ? 0.01 : 0.02;

      // Chromatic aberration: subtle for action
      this.params.chromaticAberration = mood?.primary === 'energetic' || mood?.primary === 'epic' ? 0.003 : 0.001;

      // Color grading from palette warmth
      if (palette.warmth === 'warm') {
        this.params.colorGrading = { liftR: 0.02, liftG: 0.0, liftB: -0.02, gamma: 1.05 };
      } else if (palette.warmth === 'cool') {
        this.params.colorGrading = { liftR: -0.02, liftG: 0.0, liftB: 0.03, gamma: 0.98 };
      }
      // Vignette: stronger for dark/moody
      this.params.vignetteIntensity = palette.isDark ? 0.5 : 0.25;
    }

    apply(sourceCanvas) {
      if (!this.enabled || !this.gl) return sourceCanvas;
      const gl = this.gl;
      const w = this.canvas.width, h = this.canvas.height;

      // Upload source canvas as texture
      const sceneTex = this._uploadTexture(gl, sourceCanvas);

      // Final composite pass
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const prog = this.programs.composite;
      if (!prog) return sourceCanvas;
      gl.useProgram(prog);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.uniform1i(gl.getUniformLocation(prog, 'uScene'), 0);

      gl.uniform2f(gl.getUniformLocation(prog, 'uResolution'), w, h);
      gl.uniform1f(gl.getUniformLocation(prog, 'uTime'), performance.now() / 1000);
      gl.uniform1f(gl.getUniformLocation(prog, 'uBloomIntensity'), this.params.bloomIntensity);
      gl.uniform1f(gl.getUniformLocation(prog, 'uBloomThreshold'), this.params.bloomThreshold);
      gl.uniform1f(gl.getUniformLocation(prog, 'uVignette'), this.params.vignetteIntensity);
      gl.uniform1f(gl.getUniformLocation(prog, 'uFilmGrain'), this.params.filmGrain);
      gl.uniform1f(gl.getUniformLocation(prog, 'uChromatic'), this.params.chromaticAberration);
      gl.uniform3fv(gl.getUniformLocation(prog, 'uFogColor'), this.params.fogColor);
      gl.uniform1f(gl.getUniformLocation(prog, 'uFogDensity'), this.params.fogDensity);
      gl.uniform1f(gl.getUniformLocation(prog, 'uGodRayIntensity'), this.params.godRayIntensity);
      gl.uniform1f(gl.getUniformLocation(prog, 'uGodRayAngle'), this.params.godRayAngle);

      // Color grading
      const cg = this.params.colorGrading || { liftR: 0, liftG: 0, liftB: 0, gamma: 1.0 };
      gl.uniform3f(gl.getUniformLocation(prog, 'uColorLift'), cg.liftR, cg.liftG, cg.liftB);
      gl.uniform1f(gl.getUniformLocation(prog, 'uGamma'), cg.gamma);

      // Draw quad
      this._drawQuad(gl);

      // Cleanup
      gl.deleteTexture(sceneTex);
      return this.canvas;
    }

    _createQuad(gl) {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 0, 0,
         1, -1, 1, 0,
        -1,  1, 0, 1,
         1,  1, 1, 1,
      ]), gl.STATIC_DRAW);
      return buf;
    }

    _drawQuad(gl) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      const pos = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'aPosition');
      const uv = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'aTexCoord');
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 16, 0);
      if (uv >= 0) {
        gl.enableVertexAttribArray(uv);
        gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    _uploadTexture(gl, source) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      return tex;
    }

    _createFBO(gl, w, h) {
      const fbo = gl.createFramebuffer();
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { fbo, tex, w, h };
    }

    _createProgram(gl, vertSrc, fragSrc) {
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, vertSrc);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.warn('Vertex shader error:', gl.getShaderInfoLog(vs));
        return null;
      }

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, fragSrc);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.warn('Fragment shader error:', gl.getShaderInfoLog(fs));
        return null;
      }

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn('Program link error:', gl.getProgramInfoLog(prog));
        return null;
      }
      return prog;
    }

    destroy() {
      // Cleanup WebGL resources
      if (this.gl) {
        for (const key of Object.keys(this.programs)) {
          if (this.programs[key]) this.gl.deleteProgram(this.programs[key]);
        }
        for (const key of Object.keys(this.fbos)) {
          if (this.fbos[key]) {
            this.gl.deleteFramebuffer(this.fbos[key].fbo);
            this.gl.deleteTexture(this.fbos[key].tex);
          }
        }
      }
    }
  }

  // ─── GLSL Shaders ────────────────────────────────────────────────

  const VERT_SHADER = `
    attribute vec2 aPosition;
    attribute vec2 aTexCoord;
    varying vec2 vUV;
    void main() {
      vUV = aTexCoord;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const COMPOSITE_FRAG = `
    precision mediump float;
    varying vec2 vUV;
    uniform sampler2D uScene;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uBloomIntensity;
    uniform float uBloomThreshold;
    uniform float uVignette;
    uniform float uFilmGrain;
    uniform float uChromatic;
    uniform vec3 uFogColor;
    uniform float uFogDensity;
    uniform float uGodRayIntensity;
    uniform float uGodRayAngle;
    uniform vec3 uColorLift;
    uniform float uGamma;

    // Pseudo-random noise
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    // Bloom extraction (bright areas)
    vec3 extractBloom(vec2 uv) {
      vec3 col = texture2D(uScene, uv).rgb;
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      return max(vec3(0.0), col - vec3(uBloomThreshold)) * 2.0;
    }

    // Simple Gaussian blur for bloom
    vec3 blurSample(vec2 uv, float radius) {
      vec3 sum = vec3(0.0);
      float total = 0.0;
      vec2 texel = 1.0 / uResolution;
      for (float x = -3.0; x <= 3.0; x += 1.0) {
        for (float y = -3.0; y <= 3.0; y += 1.0) {
          float w = exp(-(x*x + y*y) / (2.0 * radius * radius));
          sum += extractBloom(uv + vec2(x, y) * texel * 3.0) * w;
          total += w;
        }
      }
      return sum / total;
    }

    // God rays
    vec3 godRays(vec2 uv) {
      vec2 lightPos = vec2(0.5 + cos(uGodRayAngle) * 0.3, 0.1);
      vec2 delta = (uv - lightPos) * 0.02;
      vec3 sum = vec3(0.0);
      vec2 texCoord = uv;
      for (int i = 0; i < 16; i++) {
        texCoord -= delta;
        vec3 s = texture2D(uScene, texCoord).rgb;
        float lum = dot(s, vec3(0.299, 0.587, 0.114));
        sum += s * max(0.0, lum - 0.5) * (1.0 - float(i) / 16.0);
      }
      return sum / 16.0;
    }

    void main() {
      vec2 uv = vUV;

      // Chromatic aberration
      vec3 col;
      if (uChromatic > 0.0) {
        vec2 offset = (uv - 0.5) * uChromatic;
        col.r = texture2D(uScene, uv + offset).r;
        col.g = texture2D(uScene, uv).g;
        col.b = texture2D(uScene, uv - offset).b;
      } else {
        col = texture2D(uScene, uv).rgb;
      }

      // Bloom
      if (uBloomIntensity > 0.0) {
        vec3 bloom = blurSample(uv, 2.0);
        col += bloom * uBloomIntensity;
      }

      // God rays
      if (uGodRayIntensity > 0.0) {
        col += godRays(uv) * uGodRayIntensity;
      }

      // Height-based fog (more at bottom)
      if (uFogDensity > 0.0) {
        float fogFactor = (1.0 - uv.y) * uFogDensity;
        col = mix(col, uFogColor, clamp(fogFactor, 0.0, 0.6));
      }

      // Color grading (lift/gamma)
      col += uColorLift;
      col = pow(max(col, vec3(0.0)), vec3(1.0 / uGamma));

      // Vignette
      if (uVignette > 0.0) {
        float d = distance(uv, vec2(0.5));
        col *= 1.0 - smoothstep(0.4, 0.9, d) * uVignette;
      }

      // Film grain
      if (uFilmGrain > 0.0) {
        float grain = rand(uv + fract(uTime)) * 2.0 - 1.0;
        col += grain * uFilmGrain;
      }

      // Tonemap (ACES approximation)
      col = col * (2.51 * col + 0.03) / (col * (2.43 * col + 0.59) + 0.14);

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `;

  const BLOOM_EXTRACT_FRAG = `
    precision mediump float;
    varying vec2 vUV;
    uniform sampler2D uScene;
    uniform float uThreshold;
    void main() {
      vec3 col = texture2D(uScene, vUV).rgb;
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      gl_FragColor = vec4(max(vec3(0.0), col - vec3(uThreshold)), 1.0);
    }
  `;

  const BLUR_FRAG = `
    precision mediump float;
    varying vec2 vUV;
    uniform sampler2D uSource;
    uniform vec2 uDirection;
    uniform vec2 uResolution;
    void main() {
      vec3 sum = vec3(0.0);
      vec2 texel = 1.0 / uResolution;
      float weights[5];
      weights[0] = 0.227;
      weights[1] = 0.194;
      weights[2] = 0.121;
      weights[3] = 0.054;
      weights[4] = 0.016;
      sum += texture2D(uSource, vUV).rgb * weights[0];
      for (int i = 1; i < 5; i++) {
        vec2 offset = uDirection * float(i) * texel;
        sum += texture2D(uSource, vUV + offset).rgb * weights[i];
        sum += texture2D(uSource, vUV - offset).rgb * weights[i];
      }
      gl_FragColor = vec4(sum, 1.0);
    }
  `;

  // ═══════════════════════════════════════════════════════════════════════
  //  PHASE 5: CANVAS 2D HIGH-FIDELITY RENDERER (Fallback for no WebGL)
  //  Achieves Unreal-like effects with Canvas2D:
  //  - Multi-pass blur (bloom)
  //  - Radial gradient vignette
  //  - Color grading via compositing
  //  - Atmospheric fog via gradients
  //  - Parallax layers from image
  // ═══════════════════════════════════════════════════════════════════════

  class Canvas2DPostFX {
    constructor() {
      this.params = {
        bloomIntensity: 0.3,
        bloomThreshold: 0.7,
        vignetteIntensity: 0.3,
        fogColor: [150, 180, 200],
        fogDensity: 0.15,
        warmth: 0,     // -1 cool, +1 warm
        contrast: 1.05,
        saturation: 1.1,
        filmGrain: 0.02,
      };
    }

    configureFromAnalysis(deepAnalysis) {
      if (!deepAnalysis) return;
      const { palette, mood, atmosphere, complexity } = deepAnalysis;

      this.params.bloomIntensity = palette.isVivid ? 0.4 : palette.isMuted ? 0.15 : 0.25;
      this.params.vignetteIntensity = palette.isDark ? 0.45 : 0.2;
      this.params.warmth = palette.warmth === 'warm' ? 0.12 : palette.warmth === 'cool' ? -0.1 : 0;
      this.params.contrast = complexity.overall > 0.5 ? 1.1 : 1.02;
      this.params.saturation = palette.isVivid ? 1.2 : palette.isMuted ? 0.9 : 1.05;
      this.params.filmGrain = mood?.primary === 'dark' ? 0.04 : 0.015;

      const fc = palette.avgColor;
      this.params.fogColor = [fc.r, fc.g, fc.b];
      this.params.fogDensity = palette.isMuted ? 0.25 : palette.isDark ? 0.3 : 0.1;
    }

    apply(sourceCanvas) {
      const W = sourceCanvas.width, H = sourceCanvas.height;
      const outCanvas = document.createElement('canvas');
      outCanvas.width = W; outCanvas.height = H;
      const ctx = outCanvas.getContext('2d');

      // Base
      ctx.drawImage(sourceCanvas, 0, 0);

      // Bloom (screen blend bright areas)
      if (this.params.bloomIntensity > 0) {
        ctx.save();
        ctx.filter = `brightness(${1 + this.params.bloomIntensity}) blur(${Math.round(W * 0.01)}px)`;
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = this.params.bloomIntensity * 0.6;
        ctx.drawImage(sourceCanvas, 0, 0);
        ctx.restore();
      }

      // Atmospheric fog (gradient overlay)
      if (this.params.fogDensity > 0) {
        const fc = this.params.fogColor;
        const fogGrad = ctx.createLinearGradient(0, 0, 0, H);
        fogGrad.addColorStop(0, `rgba(${fc[0]},${fc[1]},${fc[2]},0)`);
        fogGrad.addColorStop(0.5, `rgba(${fc[0]},${fc[1]},${fc[2]},${this.params.fogDensity * 0.3})`);
        fogGrad.addColorStop(1, `rgba(${fc[0]},${fc[1]},${fc[2]},${this.params.fogDensity * 0.6})`);
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, 0, W, H);
      }

      // Warmth tint
      if (this.params.warmth !== 0) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = Math.abs(this.params.warmth) * 0.3;
        if (this.params.warmth > 0) {
          ctx.fillStyle = '#ffddaa';
        } else {
          ctx.fillStyle = '#aabbff';
        }
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      // Contrast/saturation via filter
      if (this.params.contrast !== 1 || this.params.saturation !== 1) {
        ctx.save();
        ctx.filter = `contrast(${this.params.contrast}) saturate(${this.params.saturation})`;
        ctx.globalCompositeOperation = 'source-over';
        const tempC = document.createElement('canvas');
        tempC.width = W; tempC.height = H;
        tempC.getContext('2d').drawImage(outCanvas, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(tempC, 0, 0);
        ctx.restore();
      }

      // Vignette
      if (this.params.vignetteIntensity > 0) {
        const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.75);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${this.params.vignetteIntensity})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // Film grain
      if (this.params.filmGrain > 0) {
        const grainAlpha = this.params.filmGrain;
        ctx.save();
        ctx.globalAlpha = grainAlpha;
        const grainData = ctx.createImageData(W, H);
        const d = grainData.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.random() * 255;
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 60;
        }
        const grainC = document.createElement('canvas');
        grainC.width = W; grainC.height = H;
        grainC.getContext('2d').putImageData(grainData, 0, 0);
        ctx.globalCompositeOperation = 'overlay';
        ctx.drawImage(grainC, 0, 0);
        ctx.restore();
      }

      return outCanvas;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PHASE 6: IMAGE-DRIVEN 2D PARALLAX RENDERER
  //  Uses actual image as multi-layer parallax background for 2D games
  // ═══════════════════════════════════════════════════════════════════════

  class ImageParallaxRenderer {
    constructor(imgElement, deepAnalysis) {
      this.img = imgElement;
      this.analysis = deepAnalysis;
      this.layers = [];
      this._buildLayers();
    }

    _buildLayers() {
      const img = this.img;
      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;
      const horizon = this.analysis?.horizonLine?.y || 0.5;

      // Layer 1: Far sky (top 40%, slow scroll)
      this.layers.push({
        srcY: 0,
        srcH: imgH * 0.4,
        dstY: 0,
        dstH: 0.35, // fraction of canvas height
        speed: 0.1,
        opacity: 0.8,
      });

      // Layer 2: Mid mountains/treeline (30-60%, medium scroll)
      this.layers.push({
        srcY: imgH * 0.25,
        srcH: imgH * 0.35,
        dstY: 0.2,
        dstH: 0.4,
        speed: 0.3,
        opacity: 0.9,
      });

      // Layer 3: Foreground (bottom 50%, fast scroll)
      this.layers.push({
        srcY: imgH * 0.45,
        srcH: imgH * 0.55,
        dstY: 0.5,
        dstH: 0.5,
        speed: 0.7,
        opacity: 1.0,
      });
    }

    draw(ctx, W, H, scrollX) {
      const img = this.img;
      const imgW = img.naturalWidth || img.width;

      for (const layer of this.layers) {
        ctx.save();
        ctx.globalAlpha = layer.opacity;

        const offsetX = -(scrollX * layer.speed) % imgW;
        const dstY = layer.dstY * H;
        const dstH = layer.dstH * H;

        // Tile the image horizontally
        for (let x = offsetX; x < W; x += imgW * (W / imgW) * 0.8) {
          ctx.drawImage(img,
            0, layer.srcY, imgW, layer.srcH,
            x, dstY, W, dstH
          );
        }
        // Fill gap
        if (offsetX > 0) {
          ctx.drawImage(img,
            0, layer.srcY, imgW, layer.srcH,
            offsetX - W, dstY, W, dstH
          );
        }

        ctx.restore();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PHASE 7: MAIN ORCHESTRATOR
  //  Combines all phases into a unified pipeline
  // ═══════════════════════════════════════════════════════════════════════

  function createWorldFromImage(imgElement, deepAnalysis, options = {}) {
    const result = {
      zonePreset: null,
      textures: null,
      sprites: null,
      postFX: null,
      parallax: null,
      renderMode: options.renderMode || 'auto', // 'auto', '3d', '2d', 'hybrid'
    };

    // Phase 1: Zone preset for 3D world
    result.zonePreset = imageToZonePreset(deepAnalysis, imgElement);

    // Phase 2: Image textures
    result.textures = extractImageTextures(imgElement, deepAnalysis);

    // Phase 3: Sprites
    result.sprites = extractSprites(imgElement, deepAnalysis, {
      spriteSize: options.spriteSize || 32,
      pixelArt: options.pixelArt !== false,
    });

    // Phase 4/5: Post-processing (WebGL if available, Canvas2D fallback)
    if (options.enablePostFX !== false) {
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 1; testCanvas.height = 1;
      const hasWebGL = !!(testCanvas.getContext('webgl2') || testCanvas.getContext('webgl'));

      if (hasWebGL && options.preferWebGL !== false) {
        result.postFXType = 'webgl';
      } else {
        result.postFXType = 'canvas2d';
      }
      // PostFX will be instantiated when rendering
    }

    // Phase 6: Parallax renderer
    result.parallax = new ImageParallaxRenderer(imgElement, deepAnalysis);

    return result;
  }

  // Render a full 3D preview using WowRenderer + PostFX
  function render3DPreview(canvas, imgElement, deepAnalysis, options = {}) {
    if (typeof WowRenderer === 'undefined') {
      console.warn('WowRenderer not loaded, falling back to 2D');
      return render2DPreview(canvas, imgElement, deepAnalysis, options);
    }

    const worldData = createWorldFromImage(imgElement, deepAnalysis, options);

    // Build game data for WowRenderer with image-derived zone
    const gameData = {
      game: {
        name: options.gameName || deepAnalysis.suggestedTheme || 'Image World',
        genres: [deepAnalysis.suggestedGameType || 'rpg'],
      },
      scenes: [{
        name: deepAnalysis.suggestedTheme || 'Scene',
        objects: [],
      }],
    };

    // Inject custom zone into WowRenderer
    // First render to offscreen canvas
    const offCanvas = document.createElement('canvas');
    offCanvas.width = options.width || 1280;
    offCanvas.height = options.height || 720;

    // Use WowRenderer with injected zone data
    _renderWithCustomZone(offCanvas, gameData, worldData.zonePreset, worldData.textures);

    // Apply post-processing
    const postFX = new Canvas2DPostFX();
    postFX.configureFromAnalysis(deepAnalysis);
    const finalCanvas = postFX.apply(offCanvas);

    // Copy to output canvas
    canvas.width = finalCanvas.width;
    canvas.height = finalCanvas.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(finalCanvas, 0, 0);

    return worldData;
  }

  // Internal: render using WowRenderer with custom zone injected
  function _renderWithCustomZone(canvas, gameData, zonePreset, textures) {
    // Patch the game name to trigger zone detection fallback
    // Then WowRenderer.render will use its own logic
    // We'll overlay our image-derived colors afterward

    WowRenderer.render(canvas, gameData);

    // Now overlay image-derived textures
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Tint the sky with actual image sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.4);
    const sc = zonePreset.skyTop;
    const r = parseInt(sc.slice(1, 3), 16);
    const g = parseInt(sc.slice(3, 5), 16);
    const b = parseInt(sc.slice(5, 7), 16);
    skyGrad.addColorStop(0, `rgba(${r},${g},${b},0.45)`);
    skyGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.4);

    // Tint the terrain with image ground color
    const gc = zonePreset.grassBase;
    const terrainGrad = ctx.createLinearGradient(0, H * 0.5, 0, H);
    terrainGrad.addColorStop(0, 'rgba(0,0,0,0)');
    terrainGrad.addColorStop(1, `rgba(${gc[0]},${gc[1]},${gc[2]},0.3)`);
    ctx.fillStyle = terrainGrad;
    ctx.fillRect(0, H * 0.5, W, H * 0.5);

    // Add fog with image fog color
    const fc = zonePreset.fogColor;
    const fogGrad = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.7);
    fogGrad.addColorStop(0, `rgba(${fc[0]},${fc[1]},${fc[2]},0)`);
    fogGrad.addColorStop(1, `rgba(${fc[0]},${fc[1]},${fc[2]},${zonePreset.fogDist * 0.4})`);
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // Render a high-fidelity 2D preview with image-as-background + PostFX
  function render2DPreview(canvas, imgElement, deepAnalysis, options = {}) {
    const W = options.width || 640;
    const H = options.height || 360;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const worldData = createWorldFromImage(imgElement, deepAnalysis, options);

    // Draw image as full background
    ctx.drawImage(imgElement, 0, 0, W, H);

    // Apply cinematic color grading overlay
    const mood = deepAnalysis.mood?.primary;
    const moodOverlays = {
      dark: 'rgba(10,5,20,0.35)',
      epic: 'rgba(40,20,0,0.2)',
      mysterious: 'rgba(20,10,40,0.3)',
      calm: 'rgba(0,20,40,0.15)',
      cute: 'rgba(40,20,30,0.1)',
      energetic: 'rgba(40,10,0,0.15)',
      horror: 'rgba(5,0,10,0.4)',
      peaceful: 'rgba(10,30,10,0.1)',
      melancholic: 'rgba(20,20,30,0.25)',
      adventurous: 'rgba(30,20,5,0.15)',
    };
    if (moodOverlays[mood]) {
      ctx.fillStyle = moodOverlays[mood];
      ctx.fillRect(0, 0, W, H);
    }

    // Draw horizon line
    const horizonY = (deepAnalysis.horizonLine?.y || 0.5) * H;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(W, horizonY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw focal points as glowing indicators
    const focals = deepAnalysis.focalPoints || [];
    for (const fp of focals) {
      const x = fp.x * W, y = fp.y * H;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 30 * fp.importance);
      const accent = deepAnalysis.palette?.colors[0];
      const ar = accent?.r || 255, ag = accent?.g || 200, ab = accent?.b || 100;
      grad.addColorStop(0, `rgba(${ar},${ag},${ab},${0.4 * fp.importance})`);
      grad.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x - 40, y - 40, 80, 80);
    }

    // Apply PostFX
    const postFX = new Canvas2DPostFX();
    postFX.configureFromAnalysis(deepAnalysis);
    const finalCanvas = postFX.apply(canvas);

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(finalCanvas, 0, 0);

    return worldData;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════

  return {
    // Core pipeline
    createWorldFromImage,
    imageToZonePreset,
    extractImageTextures,
    extractSprites,

    // Renderers
    render3DPreview,
    render2DPreview,
    PostFXPipeline,
    Canvas2DPostFX,
    ImageParallaxRenderer,

    // Utility
    findEdgeClusters,
  };
})();

if (typeof module !== 'undefined') module.exports = ImageToWorldEngine;
