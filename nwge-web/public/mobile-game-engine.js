// ═══════════════════════════════════════════════════════════════════════
//  NWGE Mobile Game Engine v1.0 — Touch-First Game Templates
//  Generates playable mobile games from prompts, images, or both
//  Templates: Runner, RPG, Platformer, Puzzle, Tower Defense
//  Features: touch controls, responsive canvas, PWA-ready
// ═══════════════════════════════════════════════════════════════════════

const MobileGameEngine = (() => {
  'use strict';

  // ─── Seeded RNG ────────────────────────────────────────────
  class RNG {
    constructor(seed) { this.s = seed | 0 || 42; }
    next() { this.s = (this.s * 1103515245 + 12345) & 0x7fffffff; return this.s / 0x7fffffff; }
    range(a, b) { return a + this.next() * (b - a); }
    int(a, b) { return Math.floor(this.range(a, b)); }
    pick(arr) { return arr[this.int(0, arr.length)]; }
  }

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h) || 1;
  }

  // ─── Color Utilities ───────────────────────────────────────
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return { r, g, b };
  }
  function rgbStr(r, g, b, a) {
    return a !== undefined ? `rgba(${r|0},${g|0},${b|0},${a})` : `rgb(${r|0},${g|0},${b|0})`;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // ─── Image Analysis (extract colors/features from uploaded image) ──
  function analyzeImage(imgElement) {
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgElement, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    // Extract dominant colors
    const colorBuckets = {};
    let avgR = 0, avgG = 0, avgB = 0, count = 0;
    const skyR = [], skyG = [], skyB = [];
    const groundR = [], groundG = [], groundB = [];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2];
        avgR += r; avgG += g; avgB += b; count++;

        // Bucket colors (quantize to 32 levels)
        const qr = (r >> 3) << 3, qg = (g >> 3) << 3, qb = (b >> 3) << 3;
        const key = `${qr},${qg},${qb}`;
        colorBuckets[key] = (colorBuckets[key] || 0) + 1;

        // Sky region (top 25%)
        if (y < size * 0.25) { skyR.push(r); skyG.push(g); skyB.push(b); }
        // Ground region (bottom 25%)
        if (y > size * 0.75) { groundR.push(r); groundG.push(g); groundB.push(b); }
      }
    }

    avgR = (avgR / count) | 0;
    avgG = (avgG / count) | 0;
    avgB = (avgB / count) | 0;

    const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) | 0 : 128;

    // Sort colors by frequency
    const sortedColors = Object.entries(colorBuckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k]) => {
        const [r, g, b] = k.split(',').map(Number);
        return { r, g, b };
      });

    // Detect brightness
    const brightness = (avgR * 0.299 + avgG * 0.587 + avgB * 0.114) / 255;
    const isDark = brightness < 0.35;
    const isLight = brightness > 0.65;

    // Detect warmth
    const warmth = avgR > avgB ? 'warm' : avgB > avgR + 30 ? 'cool' : 'neutral';

    // Detect features
    const hasBlue = sortedColors.some(c => c.b > 150 && c.r < 100 && c.g < 150);
    const hasGreen = sortedColors.some(c => c.g > 120 && c.r < c.g && c.b < c.g);
    const hasBrown = sortedColors.some(c => c.r > 100 && c.g > 60 && c.g < c.r && c.b < 80);
    const hasRed = sortedColors.some(c => c.r > 180 && c.g < 100 && c.b < 100);

    return {
      avgColor: { r: avgR, g: avgG, b: avgB },
      skyColor: { r: avg(skyR), g: avg(skyG), b: avg(skyB) },
      groundColor: { r: avg(groundR), g: avg(groundG), b: avg(groundB) },
      dominantColors: sortedColors,
      brightness, isDark, isLight, warmth,
      features: { hasBlue, hasGreen, hasBrown, hasRed },
      suggestedTheme: hasBlue && !hasGreen ? 'ocean' :
                       hasGreen && hasBrown ? 'forest' :
                       hasBrown && !hasGreen ? 'desert' :
                       hasRed ? 'volcanic' :
                       isDark ? 'dungeon' :
                       isLight && hasBlue ? 'sky' : 'fantasy',
    };
  }

  // ─── Prompt Analysis ───────────────────────────────────────
  function analyzePrompt(text) {
    const lower = text.toLowerCase();
    const themes = [];
    const mechanics = [];

    // Theme detection
    if (/runner|run|dash|speed|race|sprint|endless/i.test(lower)) themes.push('runner');
    if (/rpg|quest|adventure|hero|dragon|sword|magic|dungeon|level.up/i.test(lower)) themes.push('rpg');
    if (/platform|jump|mario|sonic|side.*scrol/i.test(lower)) themes.push('platformer');
    if (/puzzle|match|tetris|brain|logic|block|tile/i.test(lower)) themes.push('puzzle');
    if (/tower|defense|td|defend|wave|turret|strategy/i.test(lower)) themes.push('tower_defense');
    if (/shoot|gun|bullet|space.*shoot|invader|galaga/i.test(lower)) themes.push('shooter');
    if (/farm|garden|plant|harvest|crop|animal/i.test(lower)) themes.push('farming');
    if (/card|deck|tcg|poker|solitaire/i.test(lower)) themes.push('card');
    if (/idle|clicker|tap|incremental/i.test(lower)) themes.push('idle');

    // Environment detection
    const env = {};
    if (/forest|wood|tree|jungle/i.test(lower)) env.biome = 'forest';
    else if (/desert|sand|dune|pyramid/i.test(lower)) env.biome = 'desert';
    else if (/ocean|sea|water|beach|island/i.test(lower)) env.biome = 'ocean';
    else if (/space|star|galaxy|planet|alien/i.test(lower)) env.biome = 'space';
    else if (/cave|dungeon|underground|mine/i.test(lower)) env.biome = 'cave';
    else if (/city|urban|building|neon|cyber/i.test(lower)) env.biome = 'city';
    else if (/snow|ice|frozen|winter|arctic/i.test(lower)) env.biome = 'snow';
    else if (/volcano|lava|fire|hell/i.test(lower)) env.biome = 'volcanic';
    else if (/sky|cloud|heaven|float/i.test(lower)) env.biome = 'sky';
    else env.biome = 'fantasy';

    // Character detection
    const characters = [];
    if (/knight|warrior|soldier/i.test(lower)) characters.push({ type: 'warrior', weapon: 'sword' });
    if (/mage|wizard|witch/i.test(lower)) characters.push({ type: 'mage', weapon: 'staff' });
    if (/archer|ranger|bow/i.test(lower)) characters.push({ type: 'archer', weapon: 'bow' });
    if (/ninja|assassin|rogue|thief/i.test(lower)) characters.push({ type: 'rogue', weapon: 'dagger' });
    if (/robot|mech|android/i.test(lower)) characters.push({ type: 'robot', weapon: 'laser' });
    if (/cat|dog|animal|pet|bunny|fox/i.test(lower)) characters.push({ type: 'animal', weapon: 'claw' });

    if (characters.length === 0) characters.push({ type: 'hero', weapon: 'sword' });
    if (themes.length === 0) themes.push('runner'); // default to runner

    // Mood detection
    const mood = /dark|horror|spooky|scary|evil/i.test(lower) ? 'dark' :
                  /cute|kawaii|happy|cheerful|bright|colorful/i.test(lower) ? 'cute' :
                  /epic|battle|war|fierce|intense/i.test(lower) ? 'epic' :
                  /calm|peaceful|relax|zen|serene/i.test(lower) ? 'calm' : 'adventure';

    return { themes, env, characters, mood, rawText: text };
  }

  // ═══════════════════════════════════════════════════════════
  //  THEME PALETTES
  // ═══════════════════════════════════════════════════════════
  const PALETTES = {
    forest: {
      sky: ['#87CEEB', '#5BA3D9'], ground: ['#2D5A27', '#4A8C3F'],
      accent: '#FFD700', obstacle: '#8B4513', platform: '#6B8E23',
      bg: ['#1B4332', '#2D6A4F', '#40916C'], particle: '#90EE90',
    },
    desert: {
      sky: ['#F4A460', '#DEB887'], ground: ['#C2B280', '#D4A76A'],
      accent: '#FF6347', obstacle: '#8B6914', platform: '#CD853F',
      bg: ['#EDC9AF', '#DEB887', '#C2B280'], particle: '#FFE4B5',
    },
    ocean: {
      sky: ['#4682B4', '#87CEEB'], ground: ['#2E8B57', '#3CB371'],
      accent: '#FF7F50', obstacle: '#006994', platform: '#20B2AA',
      bg: ['#1B4965', '#2D6A8B', '#62B6CB'], particle: '#E0FFFF',
    },
    space: {
      sky: ['#0B0B2B', '#1A1A4E'], ground: ['#2C2C54', '#474787'],
      accent: '#00FFFF', obstacle: '#6C5CE7', platform: '#A29BFE',
      bg: ['#0B0B2B', '#1A1A4E', '#2C2C54'], particle: '#FFFFFF',
    },
    cave: {
      sky: ['#1A1A2E', '#16213E'], ground: ['#3D3D5C', '#52527A'],
      accent: '#FF6B6B', obstacle: '#4A4E69', platform: '#6D6875',
      bg: ['#0F0E17', '#1A1A2E', '#2D2D44'], particle: '#FFD93D',
    },
    city: {
      sky: ['#2C3E50', '#34495E'], ground: ['#7F8C8D', '#95A5A6'],
      accent: '#E74C3C', obstacle: '#2C3E50', platform: '#3498DB',
      bg: ['#1A1A2E', '#2C3E50', '#34495E'], particle: '#F1C40F',
    },
    snow: {
      sky: ['#B0C4DE', '#E0E7EE'], ground: ['#F0F8FF', '#E8EEF2'],
      accent: '#4169E1', obstacle: '#708090', platform: '#87CEEB',
      bg: ['#CCD5DE', '#D6DEE8', '#E0E8F0'], particle: '#FFFFFF',
    },
    volcanic: {
      sky: ['#3D0C02', '#8B0000'], ground: ['#4A1C00', '#6B2500'],
      accent: '#FF4500', obstacle: '#2F1100', platform: '#CD3700',
      bg: ['#1A0500', '#3D0C02', '#5A1500'], particle: '#FF6347',
    },
    sky: {
      sky: ['#87CEEB', '#B0E0E6'], ground: ['#F0F8FF', '#E6F0FA'],
      accent: '#FFD700', obstacle: '#87CEEB', platform: '#B0E0E6',
      bg: ['#87CEEB', '#ADD8E6', '#B0E0E6'], particle: '#FFFFFF',
    },
    fantasy: {
      sky: ['#6A5ACD', '#9370DB'], ground: ['#2E8B57', '#3CB371'],
      accent: '#FFD700', obstacle: '#8B008B', platform: '#DA70D6',
      bg: ['#2E1065', '#4A1A8A', '#6A5ACD'], particle: '#E6E6FA',
    },
    dungeon: {
      sky: ['#0D0D1A', '#1A1A33'], ground: ['#2D2D2D', '#3D3D3D'],
      accent: '#FF4444', obstacle: '#1A1A1A', platform: '#444444',
      bg: ['#0A0A0A', '#1A1A1A', '#2D2D2D'], particle: '#666666',
    },
  };

  // ═══════════════════════════════════════════════════════════
  //  SVG SPRITE ENGINE — Pre-render SVG to offscreen canvas
  // ═══════════════════════════════════════════════════════════
  const _spriteCache = {};
  function renderSVGSprite(svgString, w, h) {
    const key = svgString.length + '_' + w + '_' + h + '_' + svgString.slice(40, 80);
    if (_spriteCache[key]) return _spriteCache[key];
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const sprite = { canvas, ready: false };
    img.onload = () => { ctx.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url); sprite.ready = true; };
    img.onerror = () => { URL.revokeObjectURL(url); };
    img.src = url;
    _spriteCache[key] = sprite;
    return sprite;
  }

  // ═══════════════════════════════════════════════════════════
  //  SVG SPRITE LIBRARY — Chibi-style, bold shapes for small sizes
  // ═══════════════════════════════════════════════════════════
  const SVG = {
    hero: (accent = '#3498DB') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <ellipse cx="24" cy="46" rx="14" ry="3" fill="rgba(0,0,0,0.25)"/>
      <ellipse cx="17" cy="44" rx="6" ry="3" fill="#C0392B"/>
      <ellipse cx="31" cy="44" rx="6" ry="3" fill="#C0392B"/>
      <rect x="12" y="26" width="24" height="18" rx="6" fill="${accent}" stroke="#1a1a2e" stroke-width="2"/>
      <rect x="14" y="36" width="20" height="3" rx="1" fill="#DAA520"/>
      <rect x="22" y="35" width="4" height="5" rx="1" fill="#FFD700"/>
      <circle cx="24" cy="18" r="16" fill="#FFE0BD" stroke="#D4A373" stroke-width="1.5"/>
      <path d="M8 16 Q8 3 24 2 Q40 3 40 16 Q38 8 24 6 Q10 8 8 16Z" fill="#5C3317"/>
      <ellipse cx="18" cy="18" rx="4" ry="5" fill="white"/>
      <ellipse cx="30" cy="18" rx="4" ry="5" fill="white"/>
      <circle cx="19.5" cy="19" r="3" fill="#2C1810"/>
      <circle cx="31.5" cy="19" r="3" fill="#2C1810"/>
      <circle cx="18.5" cy="17" r="1.5" fill="white"/>
      <circle cx="30.5" cy="17" r="1.5" fill="white"/>
      <ellipse cx="12" cy="22" rx="3" ry="2" fill="rgba(255,120,120,0.45)"/>
      <ellipse cx="36" cy="22" rx="3" ry="2" fill="rgba(255,120,120,0.45)"/>
      <path d="M20 24 Q24 28 28 24" fill="none" stroke="#A0522D" stroke-width="2" stroke-linecap="round"/>
      <rect x="38" y="6" width="4" height="22" rx="2" fill="#C0C0C0" stroke="#888" stroke-width="1"/>
      <rect x="36" y="26" width="8" height="4" rx="1" fill="#DAA520"/>
    </svg>`,

    spike: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48">
      <ellipse cx="20" cy="46" rx="18" ry="4" fill="#444"/>
      <polygon points="10,46 14,10 18,46" fill="#E04080" stroke="#B03060" stroke-width="2"/>
      <polygon points="10,46 14,10 13,28" fill="rgba(255,255,255,0.3)"/>
      <polygon points="16,46 22,2 28,46" fill="#FF5090" stroke="#D04070" stroke-width="2"/>
      <polygon points="16,46 22,2 20,22" fill="rgba(255,255,255,0.35)"/>
      <polygon points="24,46 28,14 32,46" fill="#E04080" stroke="#B03060" stroke-width="2"/>
      <polygon points="24,46 28,14 27,30" fill="rgba(255,255,255,0.3)"/>
      <circle cx="14" cy="10" r="3" fill="white" opacity="0.9"/>
      <circle cx="22" cy="2" r="3.5" fill="white" opacity="0.95"/>
      <circle cx="28" cy="14" r="2.5" fill="white" opacity="0.8"/>
    </svg>`,

    crate: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="4" y="4" width="36" height="36" rx="4" fill="rgba(0,0,0,0.3)"/>
      <rect x="2" y="2" width="36" height="36" rx="4" fill="#CD9B1D" stroke="#8B6914" stroke-width="3"/>
      <line x1="2" y1="2" x2="38" y2="38" stroke="#A07818" stroke-width="3"/>
      <line x1="38" y1="2" x2="2" y2="38" stroke="#A07818" stroke-width="3"/>
      <rect x="0" y="17" width="40" height="5" rx="1" fill="#888" stroke="#666" stroke-width="1"/>
      <circle cx="6" cy="6" r="3" fill="#BBB"/>
      <circle cx="34" cy="6" r="3" fill="#BBB"/>
      <circle cx="6" cy="34" r="3" fill="#BBB"/>
      <circle cx="34" cy="34" r="3" fill="#BBB"/>
    </svg>`,

    coin: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="15" fill="rgba(255,215,0,0.3)"/>
      <circle cx="16" cy="16" r="12" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
      <circle cx="16" cy="16" r="9" fill="none" stroke="#DAA520" stroke-width="1"/>
      <polygon points="16,7 18,13 24,13 19,17 21,23 16,19 11,23 13,17 8,13 14,13" fill="#FFF5CC"/>
      <ellipse cx="12" cy="11" rx="3" ry="4" fill="rgba(255,255,255,0.4)" transform="rotate(-20 12 11)"/>
    </svg>`,

    heart: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <path d="M16 28 Q2 18 2 10 Q2 4 8 4 Q14 4 16 10 Q18 4 24 4 Q30 4 30 10 Q30 18 16 28Z" fill="#E74C3C"/>
      <ellipse cx="10" cy="10" rx="3" ry="2" fill="rgba(255,255,255,0.35)" transform="rotate(-30 10 10)"/>
    </svg>`,

    gem: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <polygon points="16,2 28,12 24,28 8,28 4,12" fill="#5DADE2" stroke="#2E86C1" stroke-width="2"/>
      <polygon points="16,2 10,12 22,12" fill="rgba(255,255,255,0.3)"/>
      <polygon points="10,12 8,28 16,22" fill="rgba(0,0,0,0.1)"/>
      <circle cx="14" cy="10" r="2" fill="rgba(255,255,255,0.6)"/>
    </svg>`,

    potion: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32">
      <rect x="8" y="2" width="8" height="6" rx="2" fill="#AAA"/>
      <rect x="9" y="0" width="6" height="3" rx="1" fill="#888"/>
      <path d="M6 10 Q4 10 3 14 L2 28 Q2 30 4 30 L20 30 Q22 30 22 28 L21 14 Q20 10 18 10 Z" fill="#E74C3C" stroke="#C0392B" stroke-width="1.5"/>
      <ellipse cx="12" cy="20" rx="6" ry="4" fill="rgba(255,255,255,0.2)"/>
      <circle cx="9" cy="18" r="2" fill="rgba(255,255,255,0.4)"/>
    </svg>`,

    // RPG enemy types — distinct shapes
    slime: (color = '#7BC67E') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 36">
      <ellipse cx="20" cy="34" rx="16" ry="3" fill="rgba(0,0,0,0.2)"/>
      <ellipse cx="20" cy="24" rx="18" ry="14" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
      <ellipse cx="14" cy="18" rx="5" ry="6" fill="white"/>
      <ellipse cx="28" cy="18" rx="5" ry="6" fill="white"/>
      <circle cx="15.5" cy="19.5" r="3.5" fill="#2A5E2E"/>
      <circle cx="29.5" cy="19.5" r="3.5" fill="#2A5E2E"/>
      <circle cx="14" cy="17" r="1.5" fill="white"/>
      <circle cx="28" cy="17" r="1.5" fill="white"/>
      <path d="M16 27 Q20 31 24 27" fill="none" stroke="#2A5E2E" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="12" cy="16" rx="5" ry="3" fill="rgba(255,255,255,0.25)" transform="rotate(-20 12 16)"/>
    </svg>`,

    goblin: (color = '#6B8E23') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 44">
      <ellipse cx="20" cy="42" rx="12" ry="3" fill="rgba(0,0,0,0.2)"/>
      <rect x="10" y="26" width="20" height="16" rx="5" fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>
      <circle cx="20" cy="18" r="14" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
      <polygon points="6,14 1,4 12,12" fill="${color}"/>
      <polygon points="34,14 39,4 28,12" fill="${color}"/>
      <ellipse cx="15" cy="17" rx="4" ry="5" fill="white"/>
      <ellipse cx="25" cy="17" rx="4" ry="5" fill="white"/>
      <circle cx="16" cy="18" r="3" fill="#800"/>
      <circle cx="26" cy="18" r="3" fill="#800"/>
      <circle cx="15" cy="16" r="1.5" fill="white"/>
      <circle cx="25" cy="16" r="1.5" fill="white"/>
      <path d="M15 24 Q20 28 25 24" fill="none" stroke="#333" stroke-width="2"/>
    </svg>`,

    bat: (color = '#555') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
      <circle cx="24" cy="18" r="10" fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>
      <path d="M14,18 Q4,4 2,16 Q4,10 10,14 Z" fill="${color}"/>
      <path d="M34,18 Q44,4 46,16 Q44,10 38,14 Z" fill="${color}"/>
      <circle cx="20" cy="16" r="3.5" fill="#F00"/>
      <circle cx="28" cy="16" r="3.5" fill="#F00"/>
      <circle cx="20" cy="15" r="1.5" fill="white"/>
      <circle cx="28" cy="15" r="1.5" fill="white"/>
    </svg>`,

    wolf: (color = '#888') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 36">
      <ellipse cx="22" cy="34" rx="14" ry="3" fill="rgba(0,0,0,0.2)"/>
      <ellipse cx="22" cy="24" rx="16" ry="10" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
      <circle cx="32" cy="16" r="8" fill="${color}"/>
      <polygon points="28,10 25,2 32,8" fill="${color}"/>
      <polygon points="36,10 39,2 33,8" fill="${color}"/>
      <circle cx="33" cy="15" r="2.5" fill="#FF0"/>
      <circle cx="30" cy="20" r="2" fill="#111"/>
      <rect x="8" y="30" width="4" height="6" rx="1" fill="${color}"/>
      <rect x="14" y="30" width="4" height="6" rx="1" fill="${color}"/>
      <rect x="26" y="30" width="4" height="6" rx="1" fill="${color}"/>
      <rect x="32" y="30" width="4" height="6" rx="1" fill="${color}"/>
    </svg>`,

    skeleton: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 40">
      <ellipse cx="18" cy="38" rx="10" ry="3" fill="rgba(0,0,0,0.2)"/>
      <rect x="10" y="22" width="16" height="16" rx="3" fill="#DDD" stroke="#AAA" stroke-width="1.5"/>
      <circle cx="18" cy="14" r="12" fill="#EEE" stroke="#CCC" stroke-width="1.5"/>
      <ellipse cx="13" cy="13" rx="4" ry="5" fill="#333"/>
      <ellipse cx="23" cy="13" rx="4" ry="5" fill="#333"/>
      <circle cx="13" cy="13" r="2" fill="#F00"/>
      <circle cx="23" cy="13" r="2" fill="#F00"/>
      <rect x="14" y="22" width="2" height="4" fill="#CCC"/>
      <rect x="18" y="22" width="2" height="4" fill="#CCC"/>
      <rect x="22" y="22" width="2" height="4" fill="#CCC"/>
    </svg>`,

    spider: (color = '#333') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 32">
      <circle cx="20" cy="18" r="10" fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>
      <line x1="12" y1="12" x2="2" y2="4" stroke="${color}" stroke-width="2.5"/>
      <line x1="10" y1="18" x2="0" y2="18" stroke="${color}" stroke-width="2.5"/>
      <line x1="12" y1="24" x2="2" y2="30" stroke="${color}" stroke-width="2.5"/>
      <line x1="28" y1="12" x2="38" y2="4" stroke="${color}" stroke-width="2.5"/>
      <line x1="30" y1="18" x2="40" y2="18" stroke="${color}" stroke-width="2.5"/>
      <line x1="28" y1="24" x2="38" y2="30" stroke="${color}" stroke-width="2.5"/>
      <circle cx="16" cy="16" r="3" fill="#F00"/>
      <circle cx="24" cy="16" r="3" fill="#F00"/>
      <circle cx="16" cy="15" r="1" fill="white"/>
      <circle cx="24" cy="15" r="1" fill="white"/>
    </svg>`,

    // TD tower types
    towerArrow: (color = '#4ECDC4') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48">
      <rect x="10" y="20" width="16" height="28" rx="2" fill="#8B6914" stroke="#6B4914" stroke-width="2"/>
      <rect x="6" y="12" width="24" height="14" rx="3" fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="2"/>
      <rect x="8" y="6" width="6" height="8" rx="1" fill="${color}"/>
      <rect x="16" y="4" width="6" height="10" rx="1" fill="${color}"/>
      <rect x="24" y="6" width="6" height="8" rx="1" fill="${color}"/>
      <rect x="14" y="28" width="8" height="10" rx="1" fill="#333"/>
    </svg>`,

    towerCannon: (color = '#FF6B6B') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 44">
      <rect x="8" y="16" width="24" height="28" rx="4" fill="#7F8C8D" stroke="#555" stroke-width="2"/>
      <rect x="6" y="10" width="28" height="10" rx="3" fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="2"/>
      <rect x="24" y="20" width="16" height="8" rx="3" fill="#2C3E50" stroke="#1a1a2e" stroke-width="1.5"/>
      <circle cx="40" cy="24" r="3" fill="#111"/>
      <rect x="16" y="32" width="8" height="10" rx="1" fill="#333"/>
    </svg>`,

    towerMage: (color = '#A29BFE') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 52">
      <path d="M8,48 L10,18 L26,18 L28,48 Z" fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="2"/>
      <polygon points="18,0 8,18 28,18" fill="#5B2C87" stroke="#3D1A5E" stroke-width="1.5"/>
      <circle cx="18" cy="4" r="5" fill="rgba(200,150,255,0.8)"/>
      <circle cx="17" cy="3" r="2" fill="rgba(255,255,255,0.6)"/>
      <rect x="14" y="26" width="8" height="6" rx="2" fill="rgba(200,150,255,0.4)"/>
      <rect x="14" y="36" width="8" height="10" rx="1" fill="#333"/>
    </svg>`,

    // TD enemy blob
    enemyBlob: (color = '#E74C3C') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <ellipse cx="16" cy="30" rx="12" ry="3" fill="rgba(0,0,0,0.2)"/>
      <ellipse cx="16" cy="20" rx="14" ry="12" fill="${color}" stroke="rgba(0,0,0,0.25)" stroke-width="1.5"/>
      <ellipse cx="11" cy="17" rx="4" ry="5" fill="white"/>
      <ellipse cx="21" cy="17" rx="4" ry="5" fill="white"/>
      <circle cx="12" cy="18" r="2.5" fill="#111"/>
      <circle cx="22" cy="18" r="2.5" fill="#111"/>
      <line x1="7" y1="10" x2="14" y2="13" stroke="#111" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="25" y1="10" x2="18" y2="13" stroke="#111" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M12 24 Q16 28 20 24" fill="#800" stroke="none"/>
      <polygon points="8,10 5,2 13,8" fill="${color}"/>
      <polygon points="24,10 27,2 19,8" fill="${color}"/>
    </svg>`,

    cloud: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 40">
      <ellipse cx="25" cy="28" rx="20" ry="12" fill="rgba(255,255,255,0.7)"/>
      <ellipse cx="45" cy="22" rx="22" ry="15" fill="rgba(255,255,255,0.8)"/>
      <ellipse cx="60" cy="28" rx="18" ry="11" fill="rgba(255,255,255,0.7)"/>
      <ellipse cx="35" cy="15" rx="16" ry="12" fill="rgba(255,255,255,0.9)"/>
    </svg>`,

    // Puzzle tile symbols
    puzzleStar: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <polygon points="16,2 20,12 30,12 22,18 25,28 16,22 7,28 10,18 2,12 12,12" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
      <polygon points="16,6 18,12 24,12 19,16" fill="rgba(255,255,255,0.3)"/>
    </svg>`,

    puzzleHeart: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <path d="M16 28 Q4 18 4 12 Q4 6 10 6 Q14 6 16 10 Q18 6 22 6 Q28 6 28 12 Q28 18 16 28Z" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
      <ellipse cx="11" cy="12" rx="3" ry="2" fill="rgba(255,255,255,0.3)" transform="rotate(-20 11 12)"/>
    </svg>`,

    puzzleDiamond: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <polygon points="16,2 30,16 16,30 2,16" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
      <polygon points="16,4 6,16 16,14" fill="rgba(255,255,255,0.25)"/>
    </svg>`,

    puzzleMoon: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="12" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
      <circle cx="20" cy="14" r="9" fill="rgba(0,0,0,0.15)"/>
    </svg>`,

    puzzleCircle: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="13" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
      <circle cx="16" cy="16" r="8" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.3)"/>
    </svg>`,

    puzzleTriangle: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <polygon points="16,3 30,28 2,28" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
      <polygon points="16,7 8,24 16,20" fill="rgba(255,255,255,0.2)"/>
    </svg>`,
  };

  // ═══════════════════════════════════════════════════════════
  //  JUICE ENGINE — Screen shake, popups, flash effects
  // ═══════════════════════════════════════════════════════════
  class Juice {
    constructor() { this.shakeAmt = 0; this.popups = []; this.flashes = []; }
    shake(n = 8) { this.shakeAmt = Math.max(this.shakeAmt, n); }
    popup(text, x, y, color = '#FFD700', size = 20) {
      this.popups.push({ text, x, y, vy: -2.5, life: 1, color, size, scale: 1.5 });
    }
    flash(color = 'white', alpha = 0.4) { this.flashes.push({ alpha, decay: 0.92, color }); }
    update() {
      this.shakeAmt *= 0.9; if (this.shakeAmt < 0.5) this.shakeAmt = 0;
      this.popups = this.popups.filter(p => { p.y += p.vy; p.vy *= 0.96; p.life -= 0.015; p.scale = Math.max(1, p.scale * 0.95); return p.life > 0; });
      this.flashes = this.flashes.filter(f => { f.alpha *= f.decay; return f.alpha > 0.01; });
    }
    getShake() { return this.shakeAmt > 0 ? { x: (Math.random() - 0.5) * this.shakeAmt, y: (Math.random() - 0.5) * this.shakeAmt } : { x: 0, y: 0 }; }
    renderPopups(ctx) {
      for (const p of this.popups) {
        ctx.save(); ctx.globalAlpha = p.life;
        ctx.font = `bold ${p.size * p.scale | 0}px sans-serif`; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(p.text, p.x + 2, p.y + 2);
        ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      }
    }
    renderFlashes(ctx, W, H) {
      for (const f of this.flashes) { ctx.save(); ctx.globalAlpha = f.alpha; ctx.fillStyle = f.color; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
  }

  function getPalette(theme, imageAnalysis) {
    if (imageAnalysis) {
      const base = PALETTES[imageAnalysis.suggestedTheme] || PALETTES.fantasy;
      // Override with image colors
      const d = imageAnalysis.dominantColors;
      if (d.length >= 3) {
        return {
          ...base,
          sky: [rgbStr(imageAnalysis.skyColor.r, imageAnalysis.skyColor.g, imageAnalysis.skyColor.b),
                rgbStr(imageAnalysis.skyColor.r * 0.8, imageAnalysis.skyColor.g * 0.8, imageAnalysis.skyColor.b * 0.8)],
          ground: [rgbStr(imageAnalysis.groundColor.r, imageAnalysis.groundColor.g, imageAnalysis.groundColor.b),
                   rgbStr(imageAnalysis.groundColor.r * 0.85, imageAnalysis.groundColor.g * 0.85, imageAnalysis.groundColor.b * 0.85)],
          accent: rgbStr(d[0].r, d[0].g, d[0].b),
          particle: rgbStr(d[1].r, d[1].g, d[1].b),
        };
      }
      return base;
    }
    return PALETTES[theme] || PALETTES.fantasy;
  }

  // ═══════════════════════════════════════════════════════════
  //  GAME TEMPLATE: ENDLESS RUNNER
  // ═══════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════
  //  GAME TEMPLATE: ENDLESS RUNNER (v2 — SVG sprites, juice, parallax)
  // ═══════════════════════════════════════════════════════════
  function createRunner(canvas, config) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pal = config.palette;
    const rng = new RNG(config.seed || 42);
    const juice = new Juice();

    const deep = config.deepAnalysis || {};
    const gc = deep.gameConfig || {};
    const env = gc.environment || config.environmentConfig || {};
    const weatherEffect = env.weatherEffect || null;

    // Pre-render SVG sprites
    const sp = {
      hero: renderSVGSprite(SVG.hero(pal.accent), 80, 80),
      spike: renderSVGSprite(SVG.spike(), 56, 68),
      crate: renderSVGSprite(SVG.crate(), 52, 52),
      coin: renderSVGSprite(SVG.coin(), 36, 36),
      heart: renderSVGSprite(SVG.heart(), 24, 24),
      cloud: renderSVGSprite(SVG.cloud(), 120, 60),
    };

    let gameState = 'ready';
    let score = 0, highScore = 0, combo = 0, comboTimer = 0, speed = 5, frame = 0, distance = 0, lives = 3;
    const GROUND_Y = H * 0.78, PLAYER_SIZE = 80;
    let player = { x: W * 0.18, y: GROUND_Y - PLAYER_SIZE, vy: 0, jumping: false, squash: 1 };
    const GRAVITY = 0.7, JUMP_FORCE = -14;
    let obstacles = [], coins = [], particles = [];
    let bgScroll = [0, 0, 0];
    let clouds = [];
    for (let i = 0; i < 5; i++) clouds.push({ x: rng.range(0, W * 2), y: 20 + rng.range(0, 100), speed: 0.2 + rng.next() * 0.3, size: 0.5 + rng.next() * 0.8 });

    const weatherParticles = [];
    if (weatherEffect) { for (let i = 0; i < 50; i++) weatherParticles.push({ x: rng.range(0, W), y: rng.range(-H, H), vx: rng.range(-1, 1), vy: weatherEffect === 'rain' ? rng.range(4, 8) : rng.range(0.5, 2), size: weatherEffect === 'rain' ? 2 : rng.range(2, 5), opacity: rng.range(0.3, 0.7) }); }

    let obsTimer = 0, coinTimer = 0;

    function spawnObs() {
      const type = rng.next() > 0.5 ? 'spike' : 'crate';
      obstacles.push({ x: W + 20, y: GROUND_Y - (type === 'spike' ? 68 : 52), w: type === 'spike' ? 56 : 52, h: type === 'spike' ? 68 : 52, type, passed: false });
    }
    function spawnCoins() {
      const count = 1 + rng.int(0, 3);
      const baseY = GROUND_Y - 60 - rng.range(0, 80);
      for (let i = 0; i < count; i++) coins.push({ x: W + 20 + i * 36, y: baseY + Math.sin(i * 0.8) * 15, collected: false, bob: rng.range(0, Math.PI * 2) });
    }
    function addParticles(x, y, count, colors) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, spd = 2 + Math.random() * 5;
        particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 3, life: 1, color: colors[Math.floor(Math.random() * colors.length)], size: 3 + Math.random() * 5 });
      }
    }

    function update() {
      if (gameState !== 'playing') return;
      frame++; distance += speed;
      speed = Math.min(12, 5 + distance * 0.0001);

      player.vy += GRAVITY; player.y += player.vy;
      if (player.y >= GROUND_Y - PLAYER_SIZE) { player.y = GROUND_Y - PLAYER_SIZE; player.vy = 0; if (player.jumping) { player.jumping = false; player.squash = 0.75; } }
      player.squash += (1 - player.squash) * 0.15;

      if (comboTimer > 0) { comboTimer--; if (comboTimer === 0) combo = 0; }

      obsTimer--;
      if (obsTimer <= 0) { spawnObs(); obsTimer = Math.max(30, Math.floor(60 + rng.range(0, 40) - speed * 2)); }
      coinTimer--;
      if (coinTimer <= 0) { spawnCoins(); coinTimer = Math.floor(45 + rng.range(0, 30)); }

      for (const o of obstacles) { o.x -= speed; if (!o.passed && o.x + o.w < player.x) { o.passed = true; score += 10; } }
      obstacles = obstacles.filter(o => o.x > -60);

      for (const c of coins) { if (!c.collected) c.x -= speed; }
      coins = coins.filter(c => c.x > -40 || !c.collected);

      // Collision: obstacles
      const px1 = player.x + 12, py1 = player.y + 10, px2 = player.x + PLAYER_SIZE - 12, py2 = player.y + PLAYER_SIZE - 4;
      for (const o of obstacles) {
        if (px2 > o.x + 8 && px1 < o.x + o.w - 8 && py2 > o.y + 8 && py1 < o.y + o.h) {
          lives--; juice.shake(12); juice.flash('#FF0000', 0.35);
          addParticles(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2, 20, ['#FFD700', '#3498DB', '#E74C3C', '#FFF']);
          o.x = -100;
          if (lives <= 0) { gameState = 'dead'; if (score > highScore) highScore = score; return; }
          break;
        }
      }

      // Collision: coins
      for (const c of coins) {
        if (c.collected) continue;
        const cx = c.x + 18, cy = c.y + 18;
        if (Math.abs(cx - (player.x + PLAYER_SIZE / 2)) < 28 && Math.abs(cy - (player.y + PLAYER_SIZE / 2)) < 28) {
          c.collected = true; combo++; comboTimer = 90;
          const pts = 25 * Math.min(combo, 5);
          score += pts;
          juice.popup(`+${pts}`, cx, cy - 10, combo >= 3 ? '#FF6B6B' : '#FFD700', combo >= 3 ? 24 : 18);
          if (combo >= 3) juice.popup(`${combo}x COMBO!`, W / 2, H * 0.3, '#FF4444', 28);
          addParticles(cx, cy, 8, ['#FFD700']);
          juice.shake(2);
        }
      }

      bgScroll[0] = (bgScroll[0] + speed * 0.15) % (W + 10);
      bgScroll[1] = (bgScroll[1] + speed * 0.35) % (W + 10);
      bgScroll[2] = (bgScroll[2] + speed * 0.6) % (W + 10);
      for (const c of clouds) { c.x -= c.speed + speed * 0.05; if (c.x < -150) c.x = W + 100 + rng.range(0, 200); }
      particles = particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.02; p.size *= 0.98; return p.life > 0; });
      juice.update();
    }

    function render() {
      ctx.save();
      const sk = juice.getShake(); ctx.translate(sk.x, sk.y);
      ctx.clearRect(-10, -10, W + 20, H + 20);

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#5BAEE8'); sky.addColorStop(0.4, '#88CCF0'); sky.addColorStop(0.7, '#B8E0B0'); sky.addColorStop(0.85, '#5AAF4B'); sky.addColorStop(1, '#3D7A34');
      ctx.fillStyle = sky; ctx.fillRect(-10, -10, W + 20, H + 20);

      // Clouds
      for (const c of clouds) {
        if (sp.cloud.ready) { ctx.globalAlpha = 0.6; const cw = 120 * c.size, ch = 60 * c.size; ctx.drawImage(sp.cloud.canvas, c.x, c.y, cw, ch); ctx.globalAlpha = 1; }
      }

      // Parallax BG (layered tree silhouettes)
      for (let layer = 0; layer < 3; layer++) {
        ctx.globalAlpha = 0.15 + layer * 0.12;
        const col = ['#0A2A1A', '#153A22', '#1E4A2C'][layer];
        const yBase = H - 280 + layer * 30;
        const scroll = bgScroll[layer];
        for (let x = -scroll; x < W + 80; x += 60 + layer * 20) {
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(x, yBase + 60, 30 + layer * 8, Math.PI, 0); ctx.fill();
          ctx.fillRect(x - 3, yBase + 60, 6, 40 + layer * 10);
        }
        ctx.globalAlpha = 1;
      }

      // Ground
      const gg = ctx.createLinearGradient(0, GROUND_Y, 0, H);
      gg.addColorStop(0, '#4A8C3F'); gg.addColorStop(0.05, '#3D7A34'); gg.addColorStop(0.3, '#2D5A27'); gg.addColorStop(1, '#1B3B1A');
      ctx.fillStyle = gg; ctx.fillRect(-10, GROUND_Y, W + 20, H - GROUND_Y + 10);
      ctx.fillStyle = '#5AAF4B'; ctx.fillRect(-10, GROUND_Y, W + 20, 4);
      ctx.fillStyle = '#6BC05B';
      for (let i = 0; i < 30; i++) {
        const gx = ((i * 47 + frame * speed * 0.5) % (W + 40)) - 20;
        ctx.fillRect(gx, GROUND_Y - 3, 3, 6); ctx.fillRect(gx + 4, GROUND_Y - 5, 2, 8); ctx.fillRect(gx + 7, GROUND_Y - 2, 3, 5);
      }

      // Obstacles
      for (const o of obstacles) {
        if (o.x > W + 20 || o.x < -60) continue;
        const s = o.type === 'spike' ? sp.spike : sp.crate;
        if (s && s.ready) ctx.drawImage(s.canvas, o.x, o.y, o.w, o.h);
        else { ctx.fillStyle = '#E74C3C'; ctx.fillRect(o.x, o.y, o.w, o.h); }
      }

      // Coins
      for (const c of coins) {
        if (c.collected || c.x > W + 20 || c.x < -40) continue;
        const bob = Math.sin(c.bob + frame * 0.08) * 6;
        if (sp.coin.ready) ctx.drawImage(sp.coin.canvas, c.x, c.y + bob, 36, 36);
        else { ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(c.x + 18, c.y + 18 + bob, 14, 0, Math.PI * 2); ctx.fill(); }
      }

      // Player
      const heroSp = player.jumping ? sp.hero : sp.hero;
      if (heroSp && heroSp.ready) {
        ctx.save();
        const cx = player.x + PLAYER_SIZE / 2, cy = player.y + PLAYER_SIZE / 2;
        ctx.translate(cx, cy);
        ctx.scale(1 / player.squash, player.squash);
        const bob = gameState === 'playing' && !player.jumping ? Math.sin(frame * 0.15) * 2 : 0;
        ctx.drawImage(heroSp.canvas, -PLAYER_SIZE / 2, -PLAYER_SIZE / 2 + bob, PLAYER_SIZE, PLAYER_SIZE);
        ctx.restore();
      } else { ctx.fillStyle = pal.accent; ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE); }

      // Particles
      for (const p of particles) { ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }

      // Weather
      if (weatherEffect && weatherParticles.length) {
        ctx.save();
        for (const wp of weatherParticles) {
          wp.x += wp.vx; wp.y += wp.vy;
          if (wp.y > H) { wp.y = -10; wp.x = rng.range(0, W); }
          ctx.globalAlpha = wp.opacity;
          if (weatherEffect === 'rain') { ctx.strokeStyle = 'rgba(180,200,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wp.x, wp.y); ctx.lineTo(wp.x + wp.vx * 2, wp.y + wp.vy * 2); ctx.stroke(); }
          else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.globalAlpha = 1; ctx.restore();
      }

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(10, 10, 130, 36, 8); ctx.fill();
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`Score: ${score}`, 20, 34);

      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(W - 110, 10, 100, 36, 8); ctx.fill();
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(`Speed: ${speed.toFixed(1)}`, W - 20, 34);

      for (let i = 0; i < 3; i++) {
        const hx = W / 2 - 42 + i * 30;
        ctx.globalAlpha = i < lives ? 1 : 0.25;
        if (sp.heart.ready) ctx.drawImage(sp.heart.canvas, hx, 14, 24, 24);
        else { ctx.fillStyle = '#E74C3C'; ctx.fillRect(hx, 14, 24, 24); }
        ctx.globalAlpha = 1;
      }

      if (combo >= 2) {
        ctx.fillStyle = combo >= 5 ? '#FF4444' : combo >= 3 ? '#FF8800' : '#FFD700';
        ctx.font = `bold ${14 + combo}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(`${combo}x Combo!`, W / 2, 64);
      }

      juice.renderFlashes(ctx, W + 20, H + 20);
      juice.renderPopups(ctx);

      // Ready screen
      if (gameState === 'ready') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(-10, -10, W + 20, H + 20);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(config.gameName || 'Forest Runner', W / 2, H * 0.25);
        ctx.fillStyle = '#A8D8A8'; ctx.font = '13px sans-serif';
        ctx.fillText(`${(config.characters[0] || {}).type || 'HERO'} in ${(config.env || {}).biome || 'FOREST'}`.toUpperCase(), W / 2, H * 0.32);
        ctx.fillStyle = '#27AE60'; ctx.beginPath(); ctx.roundRect(W / 2 - 100, H * 0.42, 200, 56, 14); ctx.fill();
        ctx.strokeStyle = '#2ECC71'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('TAP TO PLAY', W / 2, H * 0.42 + 36);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '13px sans-serif';
        ctx.fillText('Tap / Space to jump', W / 2, H * 0.6);
        ctx.fillText('Collect coins, dodge obstacles!', W / 2, H * 0.66);
        if (highScore > 0) { ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px sans-serif'; ctx.fillText(`High Score: ${highScore}`, W / 2, H * 0.78); }
      }

      // Dead screen
      if (gameState === 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(-10, -10, W + 20, H + 20);
        ctx.fillStyle = '#FF4444'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', W / 2, H * 0.25);
        ctx.fillStyle = '#FFF'; ctx.font = '18px sans-serif'; ctx.fillText(`Score: ${score}`, W / 2, H * 0.35);
        if (score >= highScore && score > 0) { ctx.fillStyle = '#FFD700'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('NEW HIGH SCORE!', W / 2, H * 0.42); }
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px sans-serif'; ctx.fillText(`Best: ${highScore}`, W / 2, H * 0.48);
        ctx.fillStyle = '#E74C3C'; ctx.beginPath(); ctx.roundRect(W / 2 - 100, H * 0.56, 200, 56, 14); ctx.fill();
        ctx.strokeStyle = '#FF6B6B'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('TAP TO RETRY', W / 2, H * 0.56 + 36);
      }

      ctx.restore();
    }

    function handleInput() {
      if (gameState === 'ready') { gameState = 'playing'; score = 0; combo = 0; comboTimer = 0; speed = 5; frame = 0; distance = 0; lives = 3; obstacles = []; coins = []; particles = []; player.y = GROUND_Y - PLAYER_SIZE; player.vy = 0; player.jumping = false; return; }
      if (gameState === 'dead') { gameState = 'ready'; return; }
      if (gameState === 'playing' && !player.jumping) { player.vy = JUMP_FORCE; player.jumping = true; player.squash = 1.3; }
    }

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(); }, { passive: false });
    canvas.addEventListener('click', () => handleInput());
    document.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); handleInput(); } });

    function gameLoop() { update(); render(); requestAnimationFrame(gameLoop); }
    gameLoop();
    return { getState: () => gameState };
  }

  // ═══════════════════════════════════════════════════════════
  //  GAME TEMPLATE: RPG ADVENTURE (v2 — SVG entities, tileset, juice)
  // ═══════════════════════════════════════════════════════════
  function createRPG(canvas, config) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pal = config.palette;
    const rng = new RNG(config.seed || 42);
    const juice = new Juice();

    const deep = config.deepAnalysis || {};
    const gc = deep.gameConfig || {};
    const env = gc.environment || config.environmentConfig || {};
    const weatherEffect = env.weatherEffect || null;

    const TILE = Math.max(36, Math.min(48, Math.floor(Math.min(W / 12, H / 10))));
    const MAP_W = Math.floor(W / TILE), MAP_H = Math.floor((H - 60) / TILE);

    // Pre-render sprites
    const sp = {
      hero: renderSVGSprite(SVG.hero(pal.accent), 64, 64),
      slime: renderSVGSprite(SVG.slime('#7BC67E'), 52, 48),
      goblin: renderSVGSprite(SVG.goblin('#6B8E23'), 52, 56),
      bat: renderSVGSprite(SVG.bat('#555'), 60, 40),
      wolf: renderSVGSprite(SVG.wolf('#888'), 56, 46),
      skeleton: renderSVGSprite(SVG.skeleton(), 48, 52),
      spider: renderSVGSprite(SVG.spider('#333'), 52, 42),
      coin: renderSVGSprite(SVG.coin(), 28, 28),
      potion: renderSVGSprite(SVG.potion(), 24, 32),
      gem: renderSVGSprite(SVG.gem(), 28, 28),
      heart: renderSVGSprite(SVG.heart(), 20, 20),
    };

    const ENEMY_TYPES = ['slime', 'goblin', 'bat', 'wolf', 'skeleton', 'spider'];
    const ENEMY_STATS = {
      slime: { hp: 12, atk: 3, def: 1, exp: 8, color: '#7BC67E' },
      goblin: { hp: 18, atk: 5, def: 2, exp: 12, color: '#6B8E23' },
      bat: { hp: 8, atk: 4, def: 0, exp: 6, color: '#555' },
      wolf: { hp: 22, atk: 7, def: 3, exp: 16, color: '#888' },
      skeleton: { hp: 25, atk: 8, def: 4, exp: 20, color: '#DDD' },
      spider: { hp: 14, atk: 6, def: 1, exp: 10, color: '#333' },
    };

    // Generate map
    const GRASS = 0, WALL = 1, WATER = 2, PATH = 3, TREE = 4;
    const TILE_COLORS = {
      [GRASS]: ['#4A8C3F', '#3D7A34', '#53984A'],
      [WALL]: ['#666', '#555', '#777'],
      [WATER]: ['#3498DB', '#2E86C1', '#5DADE2'],
      [PATH]: ['#C4A76C', '#B8976B', '#D4B77C'],
      [TREE]: ['#2D5A27', '#1B4332', '#3D7A34'],
    };

    const map = [];
    for (let y = 0; y < MAP_H; y++) {
      map[y] = [];
      for (let x = 0; x < MAP_W; x++) {
        if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) { map[y][x] = WALL; continue; }
        const r = rng.next();
        if (r < 0.08) map[y][x] = WALL;
        else if (r < 0.12) map[y][x] = WATER;
        else if (r < 0.18) map[y][x] = TREE;
        else map[y][x] = GRASS;
      }
    }
    // Central paths
    const midY = Math.floor(MAP_H / 2), midX = Math.floor(MAP_W / 2);
    for (let x = 1; x < MAP_W - 1; x++) { map[midY][x] = PATH; if (midY + 1 < MAP_H - 1) map[midY + 1][x] = PATH; }
    for (let y = 1; y < MAP_H - 1; y++) { map[y][midX] = PATH; if (midX + 1 < MAP_W - 1) map[y][midX + 1] = PATH; }

    // Entities
    let player = { x: midX, y: midY, hp: 50, maxHp: 50, mp: 20, maxMp: 20, atk: 8, def: 3, level: 1, exp: 0, gold: 0, bob: 0 };
    let enemies = [];
    const numEnemies = 6 + rng.int(0, 4);
    for (let i = 0; i < numEnemies; i++) {
      let ex, ey;
      do { ex = rng.int(2, MAP_W - 2); ey = rng.int(2, MAP_H - 2); } while (map[ey][ex] === WALL || map[ey][ex] === WATER || (Math.abs(ex - midX) < 3 && Math.abs(ey - midY) < 3));
      const type = rng.pick(ENEMY_TYPES);
      const stats = ENEMY_STATS[type];
      enemies.push({ x: ex, y: ey, type, hp: stats.hp, maxHp: stats.hp, atk: stats.atk, def: stats.def, exp: stats.exp, color: stats.color, bob: rng.range(0, Math.PI * 2) });
    }

    let items = [];
    for (let i = 0; i < 5; i++) {
      let ix, iy;
      do { ix = rng.int(1, MAP_W - 1); iy = rng.int(1, MAP_H - 1); } while (map[iy][ix] === WALL || map[iy][ix] === WATER);
      const type = rng.pick(['coin', 'potion', 'gem']);
      items.push({ x: ix, y: iy, type, bob: rng.range(0, Math.PI * 2) });
    }

    let gameState = 'ready', frame = 0, particles = [];
    let combatLog = '', combatLogTimer = 0;

    // Weather
    const weatherParticles = [];
    if (weatherEffect) { for (let i = 0; i < 35; i++) weatherParticles.push({ x: rng.range(0, W), y: rng.range(-H, H), vx: rng.range(-1, 1), vy: weatherEffect === 'rain' ? rng.range(4, 8) : rng.range(0.5, 2), size: weatherEffect === 'rain' ? 2 : rng.range(2, 4), opacity: rng.range(0.3, 0.6) }); }

    function tryMove(dx, dy) {
      const nx = player.x + dx, ny = player.y + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) return;
      if (map[ny][nx] === WALL || map[ny][nx] === WATER) return;

      // Check enemy
      const enemy = enemies.find(e => e.x === nx && e.y === ny && e.hp > 0);
      if (enemy) {
        const dmg = Math.max(1, player.atk - enemy.def + rng.int(-2, 3));
        enemy.hp -= dmg;
        juice.shake(6); juice.flash('#FF0000', 0.2);
        juice.popup(`-${dmg}`, nx * TILE + TILE / 2, ny * TILE + TILE / 2, '#FF4444', 18);
        addParticles(nx * TILE + TILE / 2, ny * TILE + TILE / 2, 6, ['#FF4444', '#FF8800']);

        if (enemy.hp <= 0) {
          player.exp += enemy.exp; player.gold += 5 + rng.int(0, 10);
          juice.popup(`+${enemy.exp} EXP`, nx * TILE + TILE / 2, ny * TILE + TILE / 2 - 20, '#FFD700', 16);
          combatLog = `Defeated ${enemy.type}!`; combatLogTimer = 120;
          // Level up
          if (player.exp >= player.level * 20) {
            player.level++; player.maxHp += 10; player.hp = player.maxHp; player.maxMp += 5; player.mp = player.maxMp; player.atk += 2; player.def += 1; player.exp = 0;
            juice.popup('LEVEL UP!', W / 2, H * 0.3, '#00FF88', 28); juice.flash('#00FF88', 0.3);
            combatLog = `Level ${player.level}!`; combatLogTimer = 180;
          }
        } else {
          const eDmg = Math.max(1, enemy.atk - player.def + rng.int(-1, 2));
          player.hp -= eDmg;
          juice.popup(`-${eDmg}`, player.x * TILE + TILE / 2, player.y * TILE, '#FF6B6B', 16);
          if (player.hp <= 0) { gameState = 'dead'; }
        }
        return;
      }

      // Check items
      const item = items.find(it => it.x === nx && it.y === ny);
      if (item) {
        if (item.type === 'coin') { player.gold += 10; juice.popup('+10G', nx * TILE + TILE / 2, ny * TILE, '#FFD700', 18); }
        else if (item.type === 'potion') { const heal = 15; player.hp = Math.min(player.maxHp, player.hp + heal); juice.popup(`+${heal} HP`, nx * TILE + TILE / 2, ny * TILE, '#E74C3C', 18); }
        else if (item.type === 'gem') { player.gold += 25; juice.popup('+25G', nx * TILE + TILE / 2, ny * TILE, '#5DADE2', 18); }
        addParticles(nx * TILE + TILE / 2, ny * TILE + TILE / 2, 8, ['#FFD700', '#FFF']);
        juice.shake(2);
        items = items.filter(it2 => it2 !== item);
      }

      player.x = nx; player.y = ny;
    }

    function addParticles(x, y, count, colors) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, spd = 1.5 + Math.random() * 3;
        particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 2, life: 1, color: colors[Math.floor(Math.random() * colors.length)], size: 2 + Math.random() * 4 });
      }
    }

    function update() {
      if (gameState !== 'playing') return;
      frame++;
      if (combatLogTimer > 0) combatLogTimer--;
      particles = particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= 0.025; p.size *= 0.97; return p.life > 0; });
      juice.update();
      // Win condition
      if (enemies.every(e => e.hp <= 0) && items.length === 0) { gameState = 'won'; }
    }

    function render() {
      ctx.save();
      const sk = juice.getShake(); ctx.translate(sk.x, sk.y);
      ctx.clearRect(0, 0, W, H);

      // Draw map tiles
      for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
          const t = map[y][x];
          const tx = x * TILE, ty = y * TILE;
          const cols = TILE_COLORS[t] || TILE_COLORS[GRASS];
          ctx.fillStyle = cols[(x + y) % cols.length];
          ctx.fillRect(tx, ty, TILE, TILE);

          // Tile decorations
          if (t === GRASS) {
            ctx.fillStyle = '#5AAF4B';
            if ((x * 7 + y * 13) % 5 === 0) {
              ctx.fillRect(tx + TILE * 0.3, ty + TILE * 0.6, 2, 5);
              ctx.fillRect(tx + TILE * 0.6, ty + TILE * 0.4, 2, 6);
            }
          } else if (t === WATER) {
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            const shimmer = Math.sin(frame * 0.03 + x + y) * 3;
            ctx.fillRect(tx + 4 + shimmer, ty + TILE / 3, TILE * 0.5, 2);
          } else if (t === WALL) {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(tx, ty + TILE - 3, TILE, 3);
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(tx, ty, TILE, 2);
          } else if (t === TREE) {
            ctx.fillStyle = '#3D2817';
            ctx.fillRect(tx + TILE * 0.4, ty + TILE * 0.5, TILE * 0.2, TILE * 0.5);
            ctx.fillStyle = '#2D5A27';
            ctx.beginPath(); ctx.arc(tx + TILE / 2, ty + TILE * 0.35, TILE * 0.35, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#3D7A34';
            ctx.beginPath(); ctx.arc(tx + TILE / 2 - 3, ty + TILE * 0.3, TILE * 0.2, 0, Math.PI * 2); ctx.fill();
          } else if (t === PATH) {
            // Dirt speckles
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            if ((x * 3 + y * 7) % 3 === 0) ctx.fillRect(tx + 8, ty + 10, 3, 2);
          }

          // Grid line
          ctx.strokeStyle = 'rgba(0,0,0,0.06)';
          ctx.strokeRect(tx, ty, TILE, TILE);
        }
      }

      // Items
      for (const it of items) {
        const ix = it.x * TILE, iy = it.y * TILE;
        const bob = Math.sin(it.bob + frame * 0.06) * 3;
        const s = sp[it.type];
        if (s && s.ready) {
          const sw = it.type === 'potion' ? 24 : 28, sh = it.type === 'potion' ? 32 : 28;
          ctx.drawImage(s.canvas, ix + (TILE - sw) / 2, iy + (TILE - sh) / 2 + bob, sw, sh);
        } else {
          ctx.fillStyle = it.type === 'coin' ? '#FFD700' : it.type === 'potion' ? '#E74C3C' : '#5DADE2';
          ctx.beginPath(); ctx.arc(ix + TILE / 2, iy + TILE / 2 + bob, 10, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Enemies
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const ex = e.x * TILE, ey = e.y * TILE;
        const bob = Math.sin(e.bob + frame * 0.04) * 2;
        const s = sp[e.type];
        if (s && s.ready) {
          const sw = s.canvas.width, sh = s.canvas.height;
          const scale = Math.min((TILE * 1.1) / sw, (TILE * 1.1) / sh);
          const dw = sw * scale, dh = sh * scale;
          ctx.drawImage(s.canvas, ex + (TILE - dw) / 2, ey + (TILE - dh) / 2 + bob, dw, dh);
        } else {
          ctx.fillStyle = e.color;
          ctx.beginPath(); ctx.arc(ex + TILE / 2, ey + TILE / 2 + bob, TILE * 0.35, 0, Math.PI * 2); ctx.fill();
        }
        // HP bar
        if (e.hp < e.maxHp) {
          const bw = TILE * 0.8, bh = 4;
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(ex + (TILE - bw) / 2, ey - 4, bw, bh);
          ctx.fillStyle = e.hp > e.maxHp * 0.3 ? '#2ECC71' : '#E74C3C'; ctx.fillRect(ex + (TILE - bw) / 2, ey - 4, bw * (e.hp / e.maxHp), bh);
        }
      }

      // Player
      const px = player.x * TILE, py = player.y * TILE;
      const pBob = Math.sin(frame * 0.08) * 1.5;
      if (sp.hero.ready) {
        const s = TILE * 1.3;
        ctx.drawImage(sp.hero.canvas, px + (TILE - s) / 2, py + (TILE - s) / 2 + pBob, s, s);
      } else {
        ctx.fillStyle = pal.accent;
        ctx.beginPath(); ctx.arc(px + TILE / 2, py + TILE / 2 + pBob, TILE * 0.4, 0, Math.PI * 2); ctx.fill();
      }

      // Particles
      for (const p of particles) { ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }

      // Weather
      if (weatherEffect && weatherParticles.length) {
        ctx.save();
        for (const wp of weatherParticles) {
          wp.x += wp.vx; wp.y += wp.vy;
          if (wp.y > H) { wp.y = -10; wp.x = rng.range(0, W); }
          ctx.globalAlpha = wp.opacity;
          if (weatherEffect === 'rain') { ctx.strokeStyle = 'rgba(180,200,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wp.x, wp.y); ctx.lineTo(wp.x + wp.vx * 2, wp.y + wp.vy * 2); ctx.stroke(); }
          else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.globalAlpha = 1; ctx.restore();
      }

      // HUD
      const hudY = MAP_H * TILE;
      ctx.fillStyle = 'rgba(20,15,30,0.9)'; ctx.fillRect(0, hudY, W, H - hudY);

      // HP bar
      const barW = W * 0.28, barH = 12, barX = 10, barY = hudY + 8;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 3); ctx.fill();
      ctx.fillStyle = '#E74C3C'; ctx.beginPath(); ctx.roundRect(barX, barY, barW * (player.hp / player.maxHp), barH, 3); ctx.fill();
      if (sp.heart.ready) ctx.drawImage(sp.heart.canvas, barX + barW + 4, barY - 4, 20, 20);
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${player.hp}/${player.maxHp}`, barX + 4, barY + 10);

      // MP bar
      const mpY = barY + barH + 4;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(barX, mpY, barW, barH, 3); ctx.fill();
      ctx.fillStyle = '#3498DB'; ctx.beginPath(); ctx.roundRect(barX, mpY, barW * (player.mp / player.maxMp), barH, 3); ctx.fill();
      ctx.fillText(`${player.mp}/${player.maxMp}`, barX + 4, mpY + 10);

      // Stats
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`Lv.${player.level}`, W / 2, hudY + 16);
      ctx.fillStyle = '#FFF'; ctx.font = '11px sans-serif';
      ctx.fillText(`ATK:${player.atk} DEF:${player.def}`, W / 2, hudY + 32);

      // EXP bar
      const expW = W * 0.25, expX = W / 2 - expW / 2, expY = hudY + 38;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(expX, expY, expW, 6, 2); ctx.fill();
      ctx.fillStyle = '#A29BFE'; ctx.beginPath(); ctx.roundRect(expX, expY, expW * (player.exp / (player.level * 20)), 6, 2); ctx.fill();

      // Gold
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(`Gold: ${player.gold}`, W - 10, hudY + 16);

      // Combat log
      if (combatLogTimer > 0) {
        ctx.globalAlpha = Math.min(1, combatLogTimer / 30);
        ctx.fillStyle = '#FFF'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(combatLog, W - 10, hudY + 34);
        ctx.globalAlpha = 1;
      }

      // Juice
      juice.renderFlashes(ctx, W, H);
      juice.renderPopups(ctx);

      // Ready / Dead / Won screens
      if (gameState === 'ready') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(config.gameName || 'RPG Adventure', W / 2, H * 0.22);
        ctx.fillStyle = '#A8D8A8'; ctx.font = '13px sans-serif';
        ctx.fillText(`${(config.characters[0] || {}).type || 'HERO'} | ${(config.env || {}).biome || 'FANTASY WORLD'}`.toUpperCase(), W / 2, H * 0.30);
        ctx.fillStyle = '#27AE60'; ctx.beginPath(); ctx.roundRect(W / 2 - 100, H * 0.40, 200, 56, 14); ctx.fill();
        ctx.strokeStyle = '#2ECC71'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('TAP TO BEGIN', W / 2, H * 0.40 + 36);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px sans-serif';
        ctx.fillText('Swipe/Arrow Keys to move, tap enemies to fight', W / 2, H * 0.58);
      }
      if (gameState === 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FF4444'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('DEFEATED', W / 2, H * 0.3);
        ctx.fillStyle = '#FFF'; ctx.font = '16px sans-serif'; ctx.fillText(`Level ${player.level} | Gold: ${player.gold}`, W / 2, H * 0.4);
        ctx.fillStyle = '#E74C3C'; ctx.beginPath(); ctx.roundRect(W / 2 - 90, H * 0.5, 180, 48, 12); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('TAP TO RETRY', W / 2, H * 0.5 + 30);
      }
      if (gameState === 'won') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VICTORY!', W / 2, H * 0.28);
        ctx.fillStyle = '#FFF'; ctx.font = '16px sans-serif'; ctx.fillText(`Level ${player.level} | Gold: ${player.gold}`, W / 2, H * 0.38);
        ctx.fillStyle = '#27AE60'; ctx.beginPath(); ctx.roundRect(W / 2 - 90, H * 0.48, 180, 48, 12); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('TAP TO REPLAY', W / 2, H * 0.48 + 30);
      }

      ctx.restore();
    }

    function handleInput(clientX, clientY) {
      if (gameState === 'ready') { gameState = 'playing'; return; }
      if (gameState === 'dead' || gameState === 'won') {
        // Reset
        gameState = 'ready';
        player.x = midX; player.y = midY; player.hp = 50; player.maxHp = 50; player.mp = 20; player.maxMp = 20; player.atk = 8; player.def = 3; player.level = 1; player.exp = 0; player.gold = 0;
        // Respawn enemies/items
        enemies.length = 0;
        for (let i = 0; i < numEnemies; i++) {
          let ex, ey;
          do { ex = rng.int(2, MAP_W - 2); ey = rng.int(2, MAP_H - 2); } while (map[ey][ex] === WALL || map[ey][ex] === WATER || (Math.abs(ex - midX) < 3 && Math.abs(ey - midY) < 3));
          const type = rng.pick(ENEMY_TYPES);
          const stats = ENEMY_STATS[type];
          enemies.push({ x: ex, y: ey, type, hp: stats.hp, maxHp: stats.hp, atk: stats.atk, def: stats.def, exp: stats.exp, color: stats.color, bob: rng.range(0, Math.PI * 2) });
        }
        items.length = 0;
        for (let i = 0; i < 5; i++) {
          let ix, iy;
          do { ix = rng.int(1, MAP_W - 1); iy = rng.int(1, MAP_H - 1); } while (map[iy][ix] === WALL || map[iy][ix] === WATER);
          items.push({ x: ix, y: iy, type: rng.pick(['coin', 'potion', 'gem']), bob: rng.range(0, Math.PI * 2) });
        }
        return;
      }

      // Determine direction from tap
      const rect = canvas.getBoundingClientRect();
      const sx = (clientX - rect.left) * (W / rect.width);
      const sy = (clientY - rect.top) * (H / rect.height);
      const pcx = player.x * TILE + TILE / 2, pcy = player.y * TILE + TILE / 2;
      const dx = sx - pcx, dy = sy - pcy;
      if (Math.abs(dx) > Math.abs(dy)) tryMove(dx > 0 ? 1 : -1, 0);
      else tryMove(0, dy > 0 ? 1 : -1);
    }

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    canvas.addEventListener('click', (e) => { handleInput(e.clientX, e.clientY); });
    let lastKey = 0;
    document.addEventListener('keydown', (e) => {
      if (Date.now() - lastKey < 120) return; lastKey = Date.now();
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); tryMove(0, -1); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); tryMove(0, 1); }
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); tryMove(-1, 0); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); tryMove(1, 0); }
      if (gameState === 'ready') gameState = 'playing';
    });

    function gameLoop() { update(); render(); requestAnimationFrame(gameLoop); }
    gameLoop();
    return { getState: () => gameState };
  }

  // ═══════════════════════════════════════════════════════════
  //  GAME TEMPLATE: PLATFORMER (v2 — visible platforms, parallax, juice)
  // ═══════════════════════════════════════════════════════════
  function createPlatformer(canvas, config) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pal = config.palette;
    const rng = new RNG(config.seed || 42);
    const juice = new Juice();

    const sp = {
      hero: renderSVGSprite(SVG.hero(pal.accent), 64, 64),
      coin: renderSVGSprite(SVG.coin(), 32, 32),
      gem: renderSVGSprite(SVG.gem(), 28, 28),
      heart: renderSVGSprite(SVG.heart(), 22, 22),
      cloud: renderSVGSprite(SVG.cloud(), 100, 50),
      spike: renderSVGSprite(SVG.spike(), 40, 48),
    };

    const PLAYER_W = 48, PLAYER_H = 48;
    let gameState = 'ready';
    let score = 0, frame = 0, lives = 3;
    let cameraX = 0;

    let player = { x: 60, y: H * 0.5, vx: 0, vy: 0, onGround: false, facing: 1, squash: 1 };
    const GRAVITY = 0.55, JUMP_VEL = -12, MOVE_SPEED = 4;

    // Generate level
    let platforms = [], gems = [], hazards = [];
    const levelLength = 30;

    // Ground segments
    for (let i = 0; i < 5; i++) {
      platforms.push({ x: i * W * 0.5, y: H * 0.82, w: W * 0.55, h: 40, ground: true });
    }

    // Floating platforms
    for (let i = 0; i < levelLength; i++) {
      const px = 200 + i * rng.range(120, 200);
      const py = H * 0.3 + rng.range(0, H * 0.4);
      const pw = rng.range(80, 160);
      platforms.push({ x: px, y: py, w: pw, h: 22, ground: false });

      // Gem above platform
      if (rng.next() > 0.3) {
        gems.push({ x: px + pw / 2 - 14, y: py - 40, collected: false, bob: rng.range(0, Math.PI * 2), type: rng.next() > 0.7 ? 'gem' : 'coin' });
      }

      // Occasional hazard
      if (rng.next() > 0.7 && i > 3) {
        hazards.push({ x: px + pw / 2 - 20, y: py - 48, w: 40, h: 48 });
      }
    }

    let particles = [];
    let clouds = [];
    for (let i = 0; i < 8; i++) clouds.push({ x: rng.range(0, W * 5), y: rng.range(10, 120), speed: 0.1 + rng.next() * 0.3, size: 0.6 + rng.next() * 0.6 });

    // Decoration objects (background trees, rocks)
    let decorations = [];
    for (let i = 0; i < 40; i++) {
      decorations.push({ x: rng.range(-100, levelLength * 200), y: H * 0.6 + rng.range(0, H * 0.15), type: rng.pick(['tree', 'bush', 'rock']), size: 0.5 + rng.next() * 0.8 });
    }

    function addParticles(x, y, count, colors) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, spd = 1 + Math.random() * 4;
        particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 2, life: 1, color: colors[Math.floor(Math.random() * colors.length)], size: 2 + Math.random() * 4 });
      }
    }

    // Input state
    let keys = { left: false, right: false };
    let touchX = null;

    function update() {
      if (gameState !== 'playing') return;
      frame++;

      // Movement
      if (keys.left) player.vx = -MOVE_SPEED;
      else if (keys.right) player.vx = MOVE_SPEED;
      else player.vx *= 0.8;

      if (Math.abs(player.vx) > 0.5) player.facing = player.vx > 0 ? 1 : -1;

      player.vy += GRAVITY;
      player.x += player.vx;
      player.y += player.vy;
      player.onGround = false;

      // Platform collision
      for (const plat of platforms) {
        const inX = player.x + PLAYER_W > plat.x && player.x < plat.x + plat.w;
        if (inX && player.vy >= 0 && player.y + PLAYER_H >= plat.y && player.y + PLAYER_H <= plat.y + plat.h + 12) {
          player.y = plat.y - PLAYER_H;
          player.vy = 0;
          player.onGround = true;
          if (player.squash > 1.05 || player.squash < 0.95) player.squash = 0.8;
        }
      }

      player.squash += (1 - player.squash) * 0.15;

      // Fall death
      if (player.y > H + 100) {
        lives--;
        juice.shake(10); juice.flash('#FF0000', 0.3);
        if (lives <= 0) { gameState = 'dead'; return; }
        player.x = Math.max(0, cameraX + 60); player.y = H * 0.3; player.vy = 0; player.vx = 0;
      }

      // Gem collection
      for (const g of gems) {
        if (g.collected) continue;
        if (Math.abs((g.x + 14) - (player.x + PLAYER_W / 2)) < 28 && Math.abs((g.y + 14) - (player.y + PLAYER_H / 2)) < 28) {
          g.collected = true;
          const pts = g.type === 'gem' ? 50 : 25;
          score += pts;
          juice.popup(`+${pts}`, g.x + 14, g.y, g.type === 'gem' ? '#5DADE2' : '#FFD700', 20);
          addParticles(g.x + 14, g.y + 14, 8, [g.type === 'gem' ? '#5DADE2' : '#FFD700', '#FFF']);
          juice.shake(2);
        }
      }

      // Hazard collision
      for (const h of hazards) {
        if (player.x + PLAYER_W > h.x + 8 && player.x < h.x + h.w - 8 && player.y + PLAYER_H > h.y + 10 && player.y < h.y + h.h) {
          lives--;
          juice.shake(12); juice.flash('#FF0000', 0.3);
          addParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, 15, ['#FF4444', '#FFD700', '#FFF']);
          player.vy = -8; player.x -= player.facing * 40;
          if (lives <= 0) { gameState = 'dead'; return; }
          break;
        }
      }

      // Camera follow
      const targetCam = player.x - W * 0.3;
      cameraX += (targetCam - cameraX) * 0.08;
      if (cameraX < 0) cameraX = 0;

      // Clouds
      for (const c of clouds) { c.x -= c.speed; if (c.x < cameraX - 200) c.x = cameraX + W + rng.range(0, 200); }

      particles = particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= 0.025; p.size *= 0.97; return p.life > 0; });
      juice.update();
    }

    function render() {
      ctx.save();
      const sk = juice.getShake(); ctx.translate(sk.x, sk.y);

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#4A90D9'); sky.addColorStop(0.5, '#87CEEB'); sky.addColorStop(0.8, '#B8E0B0'); sky.addColorStop(1, '#4A8C3F');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      // Clouds (no camera offset — parallax)
      for (const c of clouds) {
        const sx = (c.x - cameraX * 0.1);
        if (sx > -200 && sx < W + 200) {
          if (sp.cloud.ready) { ctx.globalAlpha = 0.5; ctx.drawImage(sp.cloud.canvas, sx, c.y, 100 * c.size, 50 * c.size); ctx.globalAlpha = 1; }
        }
      }

      ctx.save();
      ctx.translate(-cameraX, 0);

      // Background decorations (parallax offset)
      for (const d of decorations) {
        const dx = d.x - cameraX * 0.3 + cameraX;
        if (dx < cameraX - 100 || dx > cameraX + W + 100) continue;
        ctx.globalAlpha = 0.4;
        if (d.type === 'tree') {
          ctx.fillStyle = '#3D2817'; ctx.fillRect(dx + 8 * d.size, d.y + 20 * d.size, 6 * d.size, 30 * d.size);
          ctx.fillStyle = '#2D6A27'; ctx.beginPath(); ctx.arc(dx + 11 * d.size, d.y + 10 * d.size, 16 * d.size, 0, Math.PI * 2); ctx.fill();
        } else if (d.type === 'bush') {
          ctx.fillStyle = '#3A7A34'; ctx.beginPath(); ctx.arc(dx + 10 * d.size, d.y + 20 * d.size, 12 * d.size, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = '#777'; ctx.beginPath(); ctx.arc(dx + 8 * d.size, d.y + 22 * d.size, 8 * d.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Platforms
      for (const p of platforms) {
        if (p.x + p.w < cameraX - 50 || p.x > cameraX + W + 50) continue;
        if (p.ground) {
          // Thick ground with gradient
          const gg = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
          gg.addColorStop(0, '#4A8C3F'); gg.addColorStop(0.15, '#3D7A34'); gg.addColorStop(1, '#2D5A27');
          ctx.fillStyle = gg; ctx.fillRect(p.x, p.y, p.w, p.h + 100);
          // Grass line
          ctx.fillStyle = '#5AAF4B'; ctx.fillRect(p.x, p.y, p.w, 4);
          // Grass tufts
          ctx.fillStyle = '#6BC05B';
          for (let gx = p.x; gx < p.x + p.w; gx += 15) {
            ctx.fillRect(gx, p.y - 3, 3, 6); ctx.fillRect(gx + 5, p.y - 5, 2, 7);
          }
        } else {
          // Floating platform with outline, gradient, grass strip
          ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.roundRect(p.x + 2, p.y + 4, p.w, p.h, 6); ctx.fill();
          const pg = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
          pg.addColorStop(0, '#6B8E5B'); pg.addColorStop(1, '#4A6B3A');
          ctx.fillStyle = pg; ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 6); ctx.fill();
          ctx.strokeStyle = '#3A5A2A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 6); ctx.stroke();
          // Grass top
          ctx.fillStyle = '#7BC05B'; ctx.fillRect(p.x + 4, p.y, p.w - 8, 4);
          // Highlight
          ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(p.x + 4, p.y + 2, p.w - 8, 3);
        }
      }

      // Hazards
      for (const h of hazards) {
        if (h.x + h.w < cameraX - 50 || h.x > cameraX + W + 50) continue;
        if (sp.spike.ready) ctx.drawImage(sp.spike.canvas, h.x, h.y, h.w, h.h);
        else { ctx.fillStyle = '#E74C3C'; ctx.fillRect(h.x, h.y, h.w, h.h); }
      }

      // Gems
      for (const g of gems) {
        if (g.collected) continue;
        if (g.x + 28 < cameraX - 50 || g.x > cameraX + W + 50) continue;
        const bob = Math.sin(g.bob + frame * 0.06) * 5;
        const s = g.type === 'gem' ? sp.gem : sp.coin;
        const sz = g.type === 'gem' ? 28 : 32;
        if (s && s.ready) ctx.drawImage(s.canvas, g.x, g.y + bob, sz, sz);
        else { ctx.fillStyle = g.type === 'gem' ? '#5DADE2' : '#FFD700'; ctx.beginPath(); ctx.arc(g.x + sz / 2, g.y + sz / 2 + bob, 12, 0, Math.PI * 2); ctx.fill(); }
      }

      // Player
      if (sp.hero.ready) {
        ctx.save();
        const cx = player.x + PLAYER_W / 2, cy = player.y + PLAYER_H / 2;
        ctx.translate(cx, cy);
        ctx.scale(player.facing, 1);
        ctx.scale(1 / player.squash, player.squash);
        const bob = player.onGround ? Math.sin(frame * 0.15) * 1.5 : 0;
        ctx.drawImage(sp.hero.canvas, -PLAYER_W / 2, -PLAYER_H / 2 + bob, PLAYER_W, PLAYER_H);
        ctx.restore();
      } else { ctx.fillStyle = pal.accent; ctx.fillRect(player.x, player.y, PLAYER_W, PLAYER_H); }

      // Particles
      for (const p of particles) { ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }

      ctx.restore(); // end camera translate

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(10, 10, 120, 36, 8); ctx.fill();
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`Score: ${score}`, 20, 34);

      for (let i = 0; i < 3; i++) {
        const hx = W / 2 - 36 + i * 28;
        ctx.globalAlpha = i < lives ? 1 : 0.25;
        if (sp.heart.ready) ctx.drawImage(sp.heart.canvas, hx, 14, 22, 22);
        else { ctx.fillStyle = '#E74C3C'; ctx.fillRect(hx, 14, 22, 22); }
        ctx.globalAlpha = 1;
      }

      // Touch controls indicator
      if (gameState === 'playing') {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#FFF'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('< LEFT | RIGHT >', W / 2, H - 10);
        ctx.globalAlpha = 1;
      }

      juice.renderFlashes(ctx, W, H);
      juice.renderPopups(ctx);

      // Ready screen
      if (gameState === 'ready') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(config.gameName || 'Platformer', W / 2, H * 0.22);
        ctx.fillStyle = '#A8D8A8'; ctx.font = '13px sans-serif';
        ctx.fillText(`${(config.characters[0] || {}).type || 'HERO'} | ${(config.env || {}).biome || 'FANTASY'}`.toUpperCase(), W / 2, H * 0.30);
        ctx.fillStyle = '#27AE60'; ctx.beginPath(); ctx.roundRect(W / 2 - 100, H * 0.40, 200, 56, 14); ctx.fill();
        ctx.strokeStyle = '#2ECC71'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('TAP TO PLAY', W / 2, H * 0.40 + 36);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px sans-serif';
        ctx.fillText('Left/Right to move, Tap/Up to jump', W / 2, H * 0.58);
      }

      // Dead screen
      if (gameState === 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FF4444'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', W / 2, H * 0.28);
        ctx.fillStyle = '#FFF'; ctx.font = '18px sans-serif'; ctx.fillText(`Score: ${score}`, W / 2, H * 0.38);
        ctx.fillStyle = '#E74C3C'; ctx.beginPath(); ctx.roundRect(W / 2 - 90, H * 0.48, 180, 48, 12); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('TAP TO RETRY', W / 2, H * 0.48 + 30);
      }

      ctx.restore();
    }

    function handleTap(x) {
      if (gameState === 'ready') {
        gameState = 'playing'; score = 0; lives = 3; frame = 0; cameraX = 0;
        player.x = 60; player.y = H * 0.5; player.vx = 0; player.vy = 0;
        gems.forEach(g => g.collected = false);
        return;
      }
      if (gameState === 'dead') { gameState = 'ready'; return; }
      if (gameState === 'playing') {
        if (player.onGround) { player.vy = JUMP_VEL; player.squash = 1.3; }
      }
    }

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const tx = (e.touches[0].clientX - rect.left) * (W / rect.width);
      touchX = tx;
      if (gameState !== 'playing') { handleTap(tx); return; }
      if (player.onGround) { player.vy = JUMP_VEL; player.squash = 1.3; }
      keys.left = tx < W * 0.4;
      keys.right = tx > W * 0.6;
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const tx = (e.touches[0].clientX - rect.left) * (W / rect.width);
      keys.left = tx < W * 0.4;
      keys.right = tx > W * 0.6;
    }, { passive: false });
    canvas.addEventListener('touchend', () => { keys.left = false; keys.right = false; touchX = null; });
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const tx = (e.clientX - rect.left) * (W / rect.width);
      handleTap(tx);
    });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.left = true; e.preventDefault(); }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.right = true; e.preventDefault(); }
      if ((e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') && player.onGround && gameState === 'playing') {
        player.vy = JUMP_VEL; player.squash = 1.3; e.preventDefault();
      }
      if (gameState === 'ready') gameState = 'playing';
    });
    document.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    });

    function gameLoop() { update(); render(); requestAnimationFrame(gameLoop); }
    gameLoop();
    return { getState: () => gameState };
  }

  // ═══════════════════════════════════════════════════════════
  //  GAME TEMPLATE: PUZZLE (v2 — SVG tile symbols, match animations, combo)
  // ═══════════════════════════════════════════════════════════
  function createPuzzle(canvas, config) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pal = config.palette;
    const rng = new RNG(config.seed || 42);
    const juice = new Juice();

    const COLS = 7, ROWS = 8;
    const TILE = Math.min(Math.floor((W - 40) / COLS), Math.floor((H - 120) / ROWS));
    const GRID_X = (W - COLS * TILE) / 2, GRID_Y = 65;

    const SHAPES = ['star', 'heart', 'diamond', 'moon', 'circle', 'triangle'];
    const COLORS = ['#E74C3C', '#FFD700', '#5DADE2', '#A29BFE', '#2ECC71', '#FF8C00'];
    const SHAPE_SVG = {
      star: SVG.puzzleStar, heart: SVG.puzzleHeart, diamond: SVG.puzzleDiamond,
      moon: SVG.puzzleMoon, circle: SVG.puzzleCircle, triangle: SVG.puzzleTriangle,
    };

    // Pre-render all tile sprites
    const tileSp = {};
    for (let s = 0; s < SHAPES.length; s++) {
      const fn = SHAPE_SVG[SHAPES[s]];
      if (fn) tileSp[`${SHAPES[s]}_${s}`] = renderSVGSprite(fn(COLORS[s]), TILE - 4, TILE - 4);
    }
    const sp = { heart: renderSVGSprite(SVG.heart(), 22, 22) };

    let grid = [];
    let gameState = 'ready';
    let score = 0, moves = 30, combo = 0, frame = 0;
    let selected = null;
    let animating = false;
    let particles = [];
    let fallingTiles = []; // { col, row, targetRow, progress }

    function makeGrid() {
      grid = [];
      for (let r = 0; r < ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < COLS; c++) {
          const idx = rng.int(0, SHAPES.length);
          grid[r][c] = { shape: SHAPES[idx], colorIdx: idx, scale: 1, alpha: 1, offset: 0 };
        }
      }
      // Ensure no initial matches
      removeMatches(false);
    }

    function swap(r1, c1, r2, c2) {
      const tmp = grid[r1][c1];
      grid[r1][c1] = grid[r2][c2];
      grid[r2][c2] = tmp;
    }

    function findMatches() {
      const matches = new Set();
      // Horizontal
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 2; c++) {
          if (grid[r][c].shape === grid[r][c + 1].shape && grid[r][c].shape === grid[r][c + 2].shape) {
            matches.add(`${r},${c}`); matches.add(`${r},${c + 1}`); matches.add(`${r},${c + 2}`);
          }
        }
      }
      // Vertical
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 2; r++) {
          if (grid[r][c].shape === grid[r + 1][c].shape && grid[r][c].shape === grid[r + 2][c].shape) {
            matches.add(`${r},${c}`); matches.add(`${r + 1},${c}`); matches.add(`${r + 2},${c}`);
          }
        }
      }
      return matches;
    }

    function removeMatches(addScore = true) {
      let totalRemoved = 0;
      let iterations = 0;
      while (iterations < 20) {
        const matches = findMatches();
        if (matches.size === 0) break;
        iterations++;

        if (addScore) {
          combo++;
          const pts = matches.size * 10 * combo;
          score += pts;
          // Popup at center of matched tiles
          let mx = 0, my = 0;
          for (const key of matches) {
            const [r, c] = key.split(',').map(Number);
            mx += GRID_X + c * TILE + TILE / 2;
            my += GRID_Y + r * TILE + TILE / 2;
          }
          mx /= matches.size; my /= matches.size;
          juice.popup(`+${pts}`, mx, my, combo >= 2 ? '#FF4444' : '#FFD700', combo >= 2 ? 22 : 18);
          if (combo >= 2) juice.popup(`${combo}x COMBO!`, W / 2, GRID_Y - 10, '#FF6B6B', 24);
          juice.shake(combo >= 2 ? 6 : 3);
          totalRemoved += matches.size;

          // Particles
          for (const key of matches) {
            const [r, c] = key.split(',').map(Number);
            addParticles(GRID_X + c * TILE + TILE / 2, GRID_Y + r * TILE + TILE / 2, 4, [COLORS[grid[r][c].colorIdx], '#FFF']);
          }
        }

        // Remove matched
        for (const key of matches) {
          const [r, c] = key.split(',').map(Number);
          grid[r][c] = null;
        }

        // Gravity — drop tiles down
        for (let c = 0; c < COLS; c++) {
          let writeRow = ROWS - 1;
          for (let r = ROWS - 1; r >= 0; r--) {
            if (grid[r][c]) {
              grid[writeRow][c] = grid[r][c];
              if (writeRow !== r) grid[r][c] = null;
              writeRow--;
            }
          }
          // Fill empty top
          for (let r = writeRow; r >= 0; r--) {
            const idx = rng.int(0, SHAPES.length);
            grid[r][c] = { shape: SHAPES[idx], colorIdx: idx, scale: 1, alpha: 1, offset: 0 };
          }
        }
      }
      if (addScore && totalRemoved > 0 && combo > 0) {
        juice.flash('#FFD700', 0.1 * combo);
      }
      combo = 0;
      return totalRemoved;
    }

    function addParticles(x, y, count, colors) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, spd = 1.5 + Math.random() * 3;
        particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 2, life: 1, color: colors[Math.floor(Math.random() * colors.length)], size: 2 + Math.random() * 4 });
      }
    }

    function trySwap(r1, c1, r2, c2) {
      if (r1 < 0 || r1 >= ROWS || c1 < 0 || c1 >= COLS) return false;
      if (r2 < 0 || r2 >= ROWS || c2 < 0 || c2 >= COLS) return false;
      swap(r1, c1, r2, c2);
      const matches = findMatches();
      if (matches.size === 0) { swap(r1, c1, r2, c2); return false; }
      moves--;
      removeMatches(true);
      if (moves <= 0) gameState = 'dead';
      return true;
    }

    makeGrid();

    function update() {
      if (gameState !== 'playing') return;
      frame++;
      particles = particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= 0.03; p.size *= 0.97; return p.life > 0; });
      juice.update();
    }

    function render() {
      ctx.save();
      const sk = juice.getShake(); ctx.translate(sk.x, sk.y);

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#2C1654'); bg.addColorStop(0.5, '#3D1F6D'); bg.addColorStop(1, '#1A0F3C');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Sparkle decorations
      for (let i = 0; i < 20; i++) {
        const sx = (i * 73 + frame * 0.2) % W;
        const sy = (i * 97 + Math.sin(frame * 0.01 + i) * 30) % H;
        ctx.globalAlpha = 0.1 + Math.sin(frame * 0.03 + i) * 0.1;
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(10, 8, 120, 34, 8); ctx.fill();
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 20, 30);

      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(W - 130, 8, 120, 34, 8); ctx.fill();
      ctx.fillStyle = moves <= 5 ? '#FF4444' : '#FFF'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(`Moves: ${moves}`, W - 20, 30);

      // Grid background
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.roundRect(GRID_X - 6, GRID_Y - 6, COLS * TILE + 12, ROWS * TILE + 12, 10); ctx.fill();

      // Draw tiles
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = grid[r][c];
          if (!tile) continue;
          const tx = GRID_X + c * TILE, ty = GRID_Y + r * TILE;

          // Cell background
          ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)';
          ctx.fillRect(tx, ty, TILE, TILE);

          // Selected highlight
          if (selected && selected.r === r && selected.c === c) {
            ctx.strokeStyle = '#FFF'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.roundRect(tx + 2, ty + 2, TILE - 4, TILE - 4, 4); ctx.stroke();
          }

          // Draw sprite
          const key = `${tile.shape}_${tile.colorIdx}`;
          const s = tileSp[key];
          if (s && s.ready) {
            const sz = TILE - 8;
            ctx.drawImage(s.canvas, tx + 4, ty + 4, sz, sz);
          } else {
            // Fallback
            ctx.fillStyle = COLORS[tile.colorIdx];
            ctx.beginPath(); ctx.arc(tx + TILE / 2, ty + TILE / 2, TILE * 0.3, 0, Math.PI * 2); ctx.fill();
          }
        }
      }

      // Particles
      for (const p of particles) { ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }

      juice.renderFlashes(ctx, W, H);
      juice.renderPopups(ctx);

      // Ready screen
      if (gameState === 'ready') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(config.gameName || 'Puzzle Match', W / 2, H * 0.22);
        ctx.fillStyle = '#E8C8FF'; ctx.font = '13px sans-serif';
        ctx.fillText('Match 3 or more tiles!', W / 2, H * 0.30);
        ctx.fillStyle = '#A29BFE'; ctx.beginPath(); ctx.roundRect(W / 2 - 100, H * 0.40, 200, 56, 14); ctx.fill();
        ctx.strokeStyle = '#B8A8FF'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('TAP TO PLAY', W / 2, H * 0.40 + 36);
      }

      // Dead screen
      if (gameState === 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('NO MOVES LEFT', W / 2, H * 0.25);
        ctx.fillStyle = '#FFF'; ctx.font = '18px sans-serif'; ctx.fillText(`Final Score: ${score}`, W / 2, H * 0.35);
        ctx.fillStyle = '#A29BFE'; ctx.beginPath(); ctx.roundRect(W / 2 - 90, H * 0.45, 180, 48, 12); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('TAP TO RETRY', W / 2, H * 0.45 + 30);
      }

      ctx.restore();
    }

    function handleInput(clientX, clientY) {
      if (gameState === 'ready') { gameState = 'playing'; return; }
      if (gameState === 'dead') { gameState = 'ready'; makeGrid(); score = 0; moves = 30; return; }

      const rect = canvas.getBoundingClientRect();
      const sx = (clientX - rect.left) * (W / rect.width);
      const sy = (clientY - rect.top) * (H / rect.height);
      const c = Math.floor((sx - GRID_X) / TILE), r = Math.floor((sy - GRID_Y) / TILE);
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) { selected = null; return; }

      if (!selected) { selected = { r, c }; return; }

      // Check adjacency
      const dr = Math.abs(r - selected.r), dc = Math.abs(c - selected.c);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        trySwap(selected.r, selected.c, r, c);
        selected = null;
      } else {
        selected = { r, c };
      }
    }

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    canvas.addEventListener('click', (e) => { handleInput(e.clientX, e.clientY); });

    function gameLoop() { update(); render(); requestAnimationFrame(gameLoop); }
    gameLoop();
    return { getState: () => gameState };
  }

  // ═══════════════════════════════════════════════════════════
  //  GAME TEMPLATE: TOWER DEFENSE (v2 — SVG towers & enemies, rich HUD, juice)
  // ═══════════════════════════════════════════════════════════
  function createTowerDefense(canvas, config) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pal = config.palette;
    const rng = new RNG(config.seed || 42);
    const juice = new Juice();

    const deep = config.deepAnalysis || {};
    const gc = deep.gameConfig || {};
    const env = gc.environment || config.environmentConfig || {};
    const weatherEffect = env.weatherEffect || null;
    const difficulty = (config.mood === 'dark' || config.mood === 'epic') ? 'hard' : config.mood === 'calm' ? 'easy' : 'normal';

    const TILE = Math.max(32, Math.min(48, Math.floor(Math.min(W / 12, (H - 55) / 9))));
    const GRID_W = 12, GRID_H = 9;

    // Pre-render SVG sprites
    const sp = {
      towerArrow: renderSVGSprite(SVG.towerArrow('#4ECDC4'), 36, 48),
      towerCannon: renderSVGSprite(SVG.towerCannon('#FF6B6B'), 40, 44),
      towerMage: renderSVGSprite(SVG.towerMage('#A29BFE'), 36, 52),
      enemy: renderSVGSprite(SVG.enemyBlob('#E74C3C'), 32, 32),
      enemyFast: renderSVGSprite(SVG.enemyBlob('#FF8C00'), 32, 32),
      enemyTank: renderSVGSprite(SVG.enemyBlob('#8B0000'), 32, 32),
      heart: renderSVGSprite(SVG.heart(), 18, 18),
      coin: renderSVGSprite(SVG.coin(), 20, 20),
    };

    // Path for enemies
    const path = [
      { x: 0, y: 4 }, { x: 3, y: 4 }, { x: 3, y: 2 }, { x: 6, y: 2 },
      { x: 6, y: 6 }, { x: 9, y: 6 }, { x: 9, y: 4 }, { x: 11, y: 4 },
    ];
    const pathColor = '#B8A88A';
    const groundColor = '#4A8C3F';

    const towerTypes = [
      { name: 'Arrow', cost: 25, range: 100, dmg: 5, rate: 40, color: '#4ECDC4', spKey: 'towerArrow' },
      { name: 'Cannon', cost: 50, range: 80, dmg: 15, rate: 80, color: '#FF6B6B', spKey: 'towerCannon' },
      { name: 'Mage', cost: 75, range: 120, dmg: 8, rate: 50, color: '#A29BFE', spKey: 'towerMage' },
    ];

    const startGold = difficulty === 'easy' ? 150 : difficulty === 'hard' ? 75 : 100;
    let gameState = 'ready';
    let gold = startGold, lives = 10, wave = 0, score = 0, frame = 0;
    let enemies = [], towers = [], bullets = [], particles = [];
    let selectedTower = null;

    const weatherParticles = [];
    if (weatherEffect) { for (let i = 0; i < 35; i++) weatherParticles.push({ x: rng.range(0, W), y: rng.range(-H, H), vx: rng.range(-1, 1), vy: weatherEffect === 'rain' ? rng.range(4, 8) : rng.range(0.5, 2), size: weatherEffect === 'rain' ? 2 : rng.range(2, 4), opacity: rng.range(0.3, 0.6) }); }

    function getPathPoint(t) {
      if (t <= 0) return { x: path[0].x * TILE + TILE / 2, y: path[0].y * TILE + TILE / 2 };
      let totalLen = 0;
      const segs = [];
      for (let i = 0; i < path.length - 1; i++) {
        const dx = (path[i + 1].x - path[i].x) * TILE;
        const dy = (path[i + 1].y - path[i].y) * TILE;
        const len = Math.sqrt(dx * dx + dy * dy);
        segs.push({ sx: path[i].x * TILE + TILE / 2, sy: path[i].y * TILE + TILE / 2, dx, dy, len });
        totalLen += len;
      }
      let dist = t * totalLen;
      for (const seg of segs) {
        if (dist <= seg.len) {
          const f = dist / seg.len;
          return { x: seg.sx + seg.dx * f, y: seg.sy + seg.dy * f };
        }
        dist -= seg.len;
      }
      return { x: path[path.length - 1].x * TILE + TILE / 2, y: path[path.length - 1].y * TILE + TILE / 2 };
    }

    function spawnWave() {
      wave++;
      const count = 3 + wave * 2;
      for (let i = 0; i < count; i++) {
        const type = rng.next() > 0.8 ? (rng.next() > 0.5 ? 'tank' : 'fast') : 'normal';
        const hpMult = type === 'tank' ? 2.5 : type === 'fast' ? 0.6 : 1;
        const spdMult = type === 'fast' ? 1.6 : type === 'tank' ? 0.6 : 1;
        enemies.push({
          t: -i * 0.06,
          hp: (15 + wave * 8) * hpMult,
          maxHp: (15 + wave * 8) * hpMult,
          speed: (0.0008 + wave * 0.00005) * spdMult,
          reward: 5 + wave,
          type,
          x: 0, y: 0,
        });
      }
    }

    function addParticles(x, y, count, colors) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, spd = 1 + Math.random() * 3;
        particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 1, life: 1, color: colors[Math.floor(Math.random() * colors.length)], size: 2 + Math.random() * 3 });
      }
    }

    function update() {
      if (gameState !== 'playing') return;
      frame++;

      // Enemies
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        e.t += e.speed;
        const pos = getPathPoint(e.t);
        e.x = pos.x; e.y = pos.y;
        if (e.t >= 1) {
          e.hp = 0; lives--;
          juice.shake(8); juice.flash('#FF0000', 0.2);
          if (lives <= 0) { gameState = 'dead'; return; }
        }
      }
      enemies = enemies.filter(e => e.hp > 0 || e.t < 0);

      // Spawn next wave when clear
      if (enemies.length === 0 && gameState === 'playing') spawnWave();

      // Towers shoot
      for (const t of towers) {
        if (t.cooldown > 0) { t.cooldown--; continue; }
        let target = null, minDist = t.range;
        for (const e of enemies) {
          if (e.hp <= 0 || e.t < 0) continue;
          const dist = Math.sqrt((e.x - t.x) ** 2 + (e.y - t.y) ** 2);
          if (dist < minDist) { minDist = dist; target = e; }
        }
        if (target) {
          bullets.push({ x: t.x, y: t.y, tx: target.x, ty: target.y, dmg: t.dmg, color: t.color, speed: 6, target });
          t.cooldown = t.rate;
        }
      }

      // Bullets
      for (const b of bullets) {
        const dx = b.tx - b.x, dy = b.ty - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < b.speed) {
          if (b.target && b.target.hp > 0) {
            b.target.hp -= b.dmg;
            addParticles(b.x, b.y, 4, [b.color, '#FFF']);
            if (b.target.hp <= 0) {
              gold += b.target.reward; score += b.target.reward * 2;
              juice.popup(`+${b.target.reward}G`, b.target.x, b.target.y - 10, '#FFD700', 14);
              addParticles(b.target.x, b.target.y, 10, ['#FF4444', '#FFD700', '#FFF']);
              juice.shake(3);
            }
          }
          b.done = true;
        } else {
          b.x += (dx / dist) * b.speed;
          b.y += (dy / dist) * b.speed;
        }
      }
      bullets = bullets.filter(b => !b.done);

      particles = particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.02; p.size *= 0.98; return p.life > 0; });
      juice.update();
    }

    function render() {
      ctx.save();
      const sk = juice.getShake(); ctx.translate(sk.x, sk.y);
      ctx.clearRect(0, 0, W, H);

      // Ground
      ctx.fillStyle = groundColor;
      ctx.fillRect(0, 0, W, GRID_H * TILE);

      // Grid tiles
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const tx = x * TILE, ty = y * TILE;
          ctx.fillStyle = (x + y) % 2 === 0 ? '#4A8C3F' : '#438237';
          ctx.fillRect(tx, ty, TILE, TILE);
          // Grass detail
          if ((x * 7 + y * 13) % 5 === 0) {
            ctx.fillStyle = '#5AAF4B';
            ctx.fillRect(tx + TILE * 0.3, ty + TILE * 0.5, 2, 4);
            ctx.fillRect(tx + TILE * 0.7, ty + TILE * 0.3, 2, 5);
          }
        }
      }

      // Path
      ctx.strokeStyle = pathColor; ctx.lineWidth = TILE * 0.7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(path[0].x * TILE + TILE / 2, path[0].y * TILE + TILE / 2);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x * TILE + TILE / 2, path[i].y * TILE + TILE / 2);
      ctx.stroke();
      // Path border
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = TILE * 0.75; ctx.beginPath();
      ctx.moveTo(path[0].x * TILE + TILE / 2, path[0].y * TILE + TILE / 2);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x * TILE + TILE / 2, path[i].y * TILE + TILE / 2);
      ctx.stroke();
      ctx.strokeStyle = pathColor; ctx.lineWidth = TILE * 0.6; ctx.beginPath();
      ctx.moveTo(path[0].x * TILE + TILE / 2, path[0].y * TILE + TILE / 2);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x * TILE + TILE / 2, path[i].y * TILE + TILE / 2);
      ctx.stroke();

      // Towers
      const towerR = Math.max(16, TILE * 0.44);
      for (const t of towers) {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(t.x + 2, t.y + towerR * 0.6, towerR * 0.8, towerR * 0.3, 0, 0, Math.PI * 2); ctx.fill();

        // Draw SVG sprite
        const s = sp[t.spKey];
        if (s && s.ready) {
          const sw = s.canvas.width, sh = s.canvas.height;
          const scale = towerR * 2.2 / Math.max(sw, sh);
          ctx.drawImage(s.canvas, t.x - sw * scale / 2, t.y - sh * scale * 0.7, sw * scale, sh * scale);
        } else {
          ctx.fillStyle = t.color;
          ctx.beginPath(); ctx.arc(t.x, t.y - towerR * 0.3, towerR, 0, Math.PI * 2); ctx.fill();
        }

        // Range circle (when selected type matches)
        if (selectedTower !== null && towerTypes[selectedTower].name === t.name) {
          ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2); ctx.stroke();
        }
      }

      // Enemies
      const enemyR = Math.max(12, TILE * 0.38);
      for (const e of enemies) {
        if (e.hp <= 0 || e.t < 0) continue;
        const bob = Math.sin(frame * 0.08 + e.t * 100) * 2;

        const eKey = e.type === 'fast' ? 'enemyFast' : e.type === 'tank' ? 'enemyTank' : 'enemy';
        const s = sp[eKey];
        if (s && s.ready) {
          const sz = e.type === 'tank' ? enemyR * 2.6 : enemyR * 2;
          ctx.drawImage(s.canvas, e.x - sz / 2, e.y - sz / 2 + bob, sz, sz);
        } else {
          ctx.fillStyle = e.type === 'fast' ? '#FF8C00' : e.type === 'tank' ? '#8B0000' : '#E74C3C';
          ctx.beginPath(); ctx.arc(e.x, e.y + bob, enemyR, 0, Math.PI * 2); ctx.fill();
        }

        // HP bar
        const bw = enemyR * 2, bh = 4;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x - bw / 2, e.y - enemyR - 6 + bob, bw, bh);
        const hpRatio = e.hp / e.maxHp;
        ctx.fillStyle = hpRatio > 0.5 ? '#2ECC71' : hpRatio > 0.25 ? '#FFD700' : '#E74C3C';
        ctx.fillRect(e.x - bw / 2, e.y - enemyR - 6 + bob, bw * hpRatio, bh);
      }

      // Bullets
      for (const b of bullets) {
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(b.x - 1, b.y - 1, 2, 0, Math.PI * 2); ctx.fill();
      }

      // Particles
      for (const p of particles) { ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }

      // Weather
      if (weatherEffect && weatherParticles.length) {
        ctx.save();
        for (const wp of weatherParticles) {
          wp.x += wp.vx; wp.y += wp.vy;
          if (wp.y > H) { wp.y = -10; wp.x = rng.range(0, W); }
          ctx.globalAlpha = wp.opacity;
          if (weatherEffect === 'rain') { ctx.strokeStyle = 'rgba(180,200,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wp.x, wp.y); ctx.lineTo(wp.x + wp.vx * 2, wp.y + wp.vy * 2); ctx.stroke(); }
          else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.globalAlpha = 1; ctx.restore();
      }

      // HUD
      const hudY = GRID_H * TILE;
      ctx.fillStyle = 'rgba(20,15,30,0.9)'; ctx.fillRect(0, hudY, W, H - hudY);

      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`Gold: ${gold}`, 10, hudY + 18);
      ctx.fillStyle = '#FF6B6B'; ctx.fillText(`Lives: ${lives}`, 10, hudY + 36);
      ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'; ctx.fillText(`Wave ${wave}`, W / 2, hudY + 18);
      ctx.fillText(`Score: ${score}`, W / 2, hudY + 36);

      // Tower buttons
      const btnCount = towerTypes.length;
      const btnW = Math.max(70, Math.min(90, (W * 0.55) / btnCount - 8));
      const btnH = 42;
      const btnStartX = W - (btnW + 8) * btnCount;
      for (let i = 0; i < btnCount; i++) {
        const bx = btnStartX + i * (btnW + 8);
        const by = hudY + 6;
        const tt = towerTypes[i];
        ctx.fillStyle = gold >= tt.cost ? tt.color : 'rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.roundRect(bx, by, btnW, btnH, 6); ctx.fill();
        if (selectedTower === i) { ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(bx - 1, by - 1, btnW + 2, btnH + 2, 7); ctx.stroke(); }
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(tt.name, bx + btnW / 2, by + 16);
        ctx.font = '10px sans-serif'; ctx.fillText(`${tt.cost}G`, bx + btnW / 2, by + 30);
      }

      juice.renderFlashes(ctx, W, H);
      juice.renderPopups(ctx);

      // Ready screen
      if (gameState === 'ready') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(config.gameName || 'Tower Defense', W / 2, H * 0.22);
        ctx.fillStyle = '#FFD700'; ctx.font = '13px sans-serif';
        ctx.fillText('Place towers to defend!', W / 2, H * 0.30);
        ctx.fillStyle = '#27AE60'; ctx.beginPath(); ctx.roundRect(W / 2 - 100, H * 0.40, 200, 56, 14); ctx.fill();
        ctx.strokeStyle = '#2ECC71'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('TAP TO START', W / 2, H * 0.40 + 36);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px sans-serif';
        ctx.fillText('Tap grid to place towers, defend the path!', W / 2, H * 0.58);
      }

      // Dead screen
      if (gameState === 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FF4444'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('BASE DESTROYED', W / 2, H * 0.28);
        ctx.fillStyle = '#FFF'; ctx.font = '16px sans-serif'; ctx.fillText(`Wave ${wave} | Score ${score}`, W / 2, H * 0.38);
        ctx.fillStyle = '#E74C3C'; ctx.beginPath(); ctx.roundRect(W / 2 - 90, H * 0.48, 180, 48, 12); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('TAP TO RETRY', W / 2, H * 0.48 + 30);
      }

      ctx.restore();
    }

    function handleInput(clientX, clientY) {
      if (gameState === 'ready') { gameState = 'playing'; spawnWave(); return; }
      if (gameState === 'dead') {
        gameState = 'ready'; gold = startGold; lives = 10; wave = 0; score = 0; frame = 0;
        enemies = []; towers = []; bullets = []; selectedTower = null;
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const sx = (clientX - rect.left) * (W / rect.width);
      const sy = (clientY - rect.top) * (H / rect.height);

      // Check tower buttons
      const hudY = GRID_H * TILE;
      const btnCount2 = towerTypes.length;
      const btnW = Math.max(70, Math.min(90, (W * 0.55) / btnCount2 - 8));
      const btnH = 42;
      const btnStartX = W - (btnW + 8) * btnCount2;
      for (let i = 0; i < towerTypes.length; i++) {
        const bx = btnStartX + i * (btnW + 8);
        const by = hudY + 6;
        if (sx >= bx && sx <= bx + btnW && sy >= by && sy <= by + btnH) {
          selectedTower = selectedTower === i ? null : i;
          return;
        }
      }

      // Place tower
      if (selectedTower !== null) {
        const tt = towerTypes[selectedTower];
        if (gold >= tt.cost) {
          const gx = Math.floor(sx / TILE), gy = Math.floor(sy / TILE);
          if (gy >= GRID_H) return;
          const onPath = path.some((p, i) => {
            if (i === path.length - 1) return false;
            const np = path[i + 1];
            const minX = Math.min(p.x, np.x), maxX = Math.max(p.x, np.x);
            const minY = Math.min(p.y, np.y), maxY = Math.max(p.y, np.y);
            return gx >= minX - 1 && gx <= maxX + 1 && gy >= minY - 1 && gy <= maxY + 1;
          });
          if (!onPath && !towers.some(t => Math.abs(t.gx - gx) < 1 && Math.abs(t.gy - gy) < 1)) {
            towers.push({ x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2, gx, gy, ...tt, cooldown: 0 });
            gold -= tt.cost;
            juice.popup(`-${tt.cost}G`, gx * TILE + TILE / 2, gy * TILE, '#FF6B6B', 14);
            addParticles(gx * TILE + TILE / 2, gy * TILE + TILE / 2, 6, [tt.color, '#FFF']);
          }
        }
      }
    }

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    canvas.addEventListener('click', (e) => { handleInput(e.clientX, e.clientY); });

    function gameLoop() { update(); render(); requestAnimationFrame(gameLoop); }
    gameLoop();
    return { getState: () => gameState };
  }

  // ═══════════════════════════════════════════════════════════
  //  MAIN FACTORY — Generate game from config
  // ═══════════════════════════════════════════════════════════
  const TEMPLATE_MAP = {
    runner: createRunner,
    rpg: createRPG,
    platformer: createPlatformer,
    puzzle: createPuzzle,
    tower_defense: createTowerDefense,
    // Aliases
    shooter: createRunner,
    farming: createRPG,
    card: createPuzzle,
    idle: createRunner,
  };

  function generateGame(canvas, options = {}) {
    const { prompt, imageElement, palette: customPalette, deepAnalysis, imageGameConfig } = options;

    // Analyze inputs
    let promptData = prompt ? analyzePrompt(prompt) : { themes: ['runner'], env: { biome: 'fantasy' }, characters: [{ type: 'hero', weapon: 'sword' }], mood: 'adventure' };
    let imageData = imageElement ? analyzeImage(imageElement) : null;

    // ─── Deep Analysis Integration (from ImageToGameEngine) ──────
    // If we have deep analysis from the image-to-game engine, use it
    let effectiveGameType = promptData.themes[0];
    let effectiveTheme = imageData?.suggestedTheme || promptData.env.biome;
    let effectiveMood = promptData.mood;
    let effectiveCharacter = promptData.characters[0] || { type: 'hero', weapon: 'sword' };
    let effectivePalette = null;
    let levelLayout = null;
    let entityConfig = null;
    let environmentConfig = null;

    if (deepAnalysis && deepAnalysis.gameConfig) {
      const gc = deepAnalysis.gameConfig;
      // Override game type from image analysis if prompt is generic
      if (!prompt || prompt.length < 10) {
        effectiveGameType = gc.gameType || effectiveGameType;
      }
      effectiveTheme = gc.theme || effectiveTheme;
      effectiveMood = gc.mood || effectiveMood;
      if (gc.character) {
        effectiveCharacter = {
          type: gc.character.type || 'hero',
          weapon: gc.character.weapon || 'sword',
        };
      }
      if (gc.palette) {
        effectivePalette = gc.palette;
      }
      if (gc.levelLayout) {
        levelLayout = gc.levelLayout;
      }
      if (gc.entities) {
        entityConfig = gc.entities;
      }
      if (gc.environment) {
        environmentConfig = gc.environment;
      }
    }

    // If explicit imageGameConfig was passed (from combined mode)
    if (imageGameConfig) {
      if (imageGameConfig.gameType) effectiveGameType = imageGameConfig.gameType;
      if (imageGameConfig.theme) effectiveTheme = imageGameConfig.theme;
      if (imageGameConfig.palette) effectivePalette = imageGameConfig.palette;
    }

    // Build final palette
    const theme = effectiveTheme;
    const palette = effectivePalette || customPalette || getPalette(theme, imageData);
    const gameType = effectiveGameType;
    const gameName = prompt ?
      prompt.split(/[,.!?]/)[0].trim().substring(0, 50) || 'Mobile Game' :
      `${theme.charAt(0).toUpperCase() + theme.slice(1)} ${gameType.charAt(0).toUpperCase() + gameType.slice(1)}`;

    // Set up canvas for mobile
    const displayW = Math.min(640, window.innerWidth);
    const displayH = Math.min(540, window.innerHeight * 0.65);
    canvas.style.width = displayW + 'px';
    canvas.style.height = displayH + 'px';
    canvas.width = displayW;
    canvas.height = displayH;

    const config = {
      gameName,
      palette,
      seed: hashStr(prompt || theme || 'default'),
      env: { biome: theme, ...promptData.env },
      characters: [effectiveCharacter],
      mood: effectiveMood,
      imageAnalysis: imageData,
      deepAnalysis,
      levelLayout,
      entityConfig,
      environmentConfig,
      // ─── New: pass image element + world data for high-fidelity rendering
      _imageElement: imageElement || null,
      _terrainProfile: null,
      _worldData: null,
    };

    // Extract terrain profile from image if available
    if (imageElement && typeof ImageToGameEngine !== 'undefined' && deepAnalysis) {
      try {
        config._terrainProfile = ImageToGameEngine.extractTerrainProfile(imageElement, deepAnalysis);
      } catch (e) { /* non-critical */ }
    }

    // Build world data if ImageToWorldEngine is available
    if (imageElement && typeof ImageToWorldEngine !== 'undefined' && deepAnalysis) {
      try {
        config._worldData = ImageToWorldEngine.createWorldFromImage(imageElement, deepAnalysis, {
          spriteSize: 32,
          pixelArt: true,
          enablePostFX: true,
        });
      } catch (e) { /* non-critical */ }
    }

    // Select and create the game template
    const createFn = TEMPLATE_MAP[gameType] || createRunner;
    const game = createFn(canvas, config);

    return {
      gameType,
      gameName,
      theme,
      palette,
      imageAnalysis: imageData,
      deepAnalysis,
      promptAnalysis: promptData,
      game,
    };
  }

  // ─── Public API ────────────────────────────────────────────
  return {
    generateGame,
    analyzeImage,
    analyzePrompt,
    getPalette,
    PALETTES,
    TEMPLATE_MAP,
    templates: Object.keys(TEMPLATE_MAP).filter(k => !['shooter', 'farming', 'card', 'idle'].includes(k)),
  };
})();

if (typeof module !== 'undefined') module.exports = MobileGameEngine;
