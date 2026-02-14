/* ═══════════════════════════════════════════════════════════════
   NW GAME ICONS — AAA-Quality SVG Icon System
   Hand-crafted vector icons with gold/amber gradients,
   glow effects, and fine detail for a premium fantasy RPG feel.
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  // Shared SVG defs for golden gradients & glow filters
  const DEFS = `<defs>
    <linearGradient id="nw-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd700"/>
      <stop offset="50%" stop-color="#fff4b0"/>
      <stop offset="100%" stop-color="#ffb300"/>
    </linearGradient>
    <linearGradient id="nw-gold-v" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff4b0"/>
      <stop offset="100%" stop-color="#c8960c"/>
    </linearGradient>
    <linearGradient id="nw-accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00d4ff"/>
      <stop offset="100%" stop-color="#0088cc"/>
    </linearGradient>
    <linearGradient id="nw-fire" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff4400"/>
      <stop offset="50%" stop-color="#ffb300"/>
      <stop offset="100%" stop-color="#ffd700"/>
    </linearGradient>
    <linearGradient id="nw-purple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b44aff"/>
      <stop offset="100%" stop-color="#7b2dff"/>
    </linearGradient>
    <linearGradient id="nw-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00ff88"/>
      <stop offset="100%" stop-color="#00aa55"/>
    </linearGradient>
    <filter id="nw-glow">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>`;

  function svg(paths, vb) {
    vb = vb || '0 0 48 48';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" fill="none" class="nw-icon">${DEFS}${paths}</svg>`;
  }

  const g = 'url(#nw-gold)';
  const gv = 'url(#nw-gold-v)';
  const acc = 'url(#nw-accent)';
  const fire = 'url(#nw-fire)';
  const purp = 'url(#nw-purple)';
  const em = 'url(#nw-emerald)';

  /* ── The icon library ─────────────────────────────────────── */
  const ICONS = {

    /* ═══ WORLD ═══ */
    'biomes': svg(`
      <path d="M24 4L6 20h6v20h24V20h6L24 4z" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <path d="M24 4l-14 13h4v6l5-4 5 6 5-6 5 4v-6h4L24 4z" fill="${g}" opacity=".9"/>
      <path d="M18 28c0-3 2-5 6-8 4 3 6 5 6 8s-2.5 5-6 5-6-2-6-5z" fill="${acc}" opacity=".7"/>
      <path d="M12 32v8M20 30v10M28 31v9M36 33v7" stroke="${gv}" stroke-width="1" opacity=".5"/>
      <circle cx="24" cy="14" r="2" fill="#fff" opacity=".8"/>
    `),

    'monkeys': svg(`
      <circle cx="24" cy="18" r="11" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <circle cx="24" cy="18" r="8" fill="${g}" opacity=".15"/>
      <circle cx="20" cy="16" r="2" fill="${g}"/>
      <circle cx="28" cy="16" r="2" fill="${g}"/>
      <ellipse cx="24" cy="21" rx="4" ry="2.5" fill="${gv}" opacity=".6"/>
      <circle cx="22.5" cy="20.5" r=".8" fill="#111"/>
      <circle cx="25.5" cy="20.5" r=".8" fill="#111"/>
      <path d="M22 23q2 2 4 0" stroke="#111" stroke-width=".8" fill="none"/>
      <path d="M13 12q-4-6-2-8 3-1 5 3" stroke="${g}" stroke-width="1.2" fill="none"/>
      <path d="M35 12q4-6 2-8-3-1-5 3" stroke="${g}" stroke-width="1.2" fill="none"/>
      <path d="M20 29q-2 4-4 8M28 29q2 4 4 8" stroke="${g}" stroke-width="1.2" fill="none"/>
      <path d="M24 29v10" stroke="${g}" stroke-width="1" opacity=".5"/>
      <text x="24" y="43" text-anchor="middle" font-size="6" fill="${g}" font-family="Orbitron,sans-serif" font-weight="700" opacity=".8">200+</text>
    `),

    'day-night': svg(`
      <circle cx="18" cy="22" r="9" fill="${g}" opacity=".2" filter="url(#nw-glow)"/>
      <circle cx="18" cy="22" r="7" fill="${g}" opacity=".3"/>
      <path d="M18 13v-3M18 34v-3M9 22H6M30 22h-3" stroke="${g}" stroke-width="1.2"/>
      <path d="M11.6 15.6l-2-2M26.4 28.4l-2-2M11.6 28.4l-2 2M26.4 15.6l-2 2" stroke="${g}" stroke-width="1"/>
      <path d="M32 18a9 9 0 0 1-3 14 11 11 0 0 0 3-14z" fill="${acc}" opacity=".7"/>
      <circle cx="35" cy="16" r="1" fill="${acc}" opacity=".5"/>
      <circle cx="38" cy="20" r=".6" fill="${acc}" opacity=".4"/>
      <circle cx="40" cy="14" r=".8" fill="${acc}" opacity=".3"/>
      <path d="M4 38h40" stroke="${gv}" stroke-width="1" opacity=".3"/>
    `),

    'action-rpg': svg(`
      <path d="M24 4l3 14h-6l3-14z" fill="${g}" filter="url(#nw-glow)"/>
      <path d="M21 18h6l1 4h-8l1-4z" fill="${gv}"/>
      <path d="M24 22v20" stroke="${g}" stroke-width="2.5"/>
      <path d="M16 26h16" stroke="${g}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="24" cy="26" r="3" fill="none" stroke="${g}" stroke-width="1.2"/>
      <circle cx="24" cy="26" r="1" fill="${g}"/>
      <path d="M20 42h8" stroke="${gv}" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M20 8l-8 8M28 8l8 8" stroke="${fire}" stroke-width="1" opacity=".5"/>
    `),

    'tcg': svg(`
      <rect x="8" y="6" width="22" height="32" rx="3" fill="none" stroke="${g}" stroke-width="1.5" transform="rotate(-8 19 22)" filter="url(#nw-glow)"/>
      <rect x="18" y="8" width="22" height="32" rx="3" fill="none" stroke="${g}" stroke-width="1.5" transform="rotate(8 29 24)"/>
      <rect x="13" y="7" width="22" height="32" rx="3" fill="${g}" opacity=".12"/>
      <rect x="13" y="7" width="22" height="32" rx="3" fill="none" stroke="${g}" stroke-width="1.8"/>
      <path d="M24 15l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z" fill="${g}" opacity=".9"/>
      <path d="M17 33h14" stroke="${gv}" stroke-width="1" opacity=".5"/>
    `),

    'pvp': svg(`
      <path d="M24 6l16 10v12L24 42 8 28V16L24 6z" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <path d="M24 6l16 10v12L24 42 8 28V16L24 6z" fill="${g}" opacity=".08"/>
      <path d="M16 20l-4 8 4 4 4-4v-6z" fill="${fire}" opacity=".7"/>
      <path d="M32 20l4 8-4 4-4-4v-6z" fill="${acc}" opacity=".7"/>
      <path d="M22 24h4v2h-4z" fill="${g}"/>
      <text x="24" y="19" text-anchor="middle" font-size="7" fill="${g}" font-family="Orbitron,sans-serif" font-weight="900">VS</text>
      <path d="M18 36l6-4 6 4" stroke="${gv}" stroke-width="1" fill="none" opacity=".5"/>
    `),

    'feast': svg(`
      <ellipse cx="24" cy="30" rx="18" ry="8" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <ellipse cx="24" cy="30" rx="15" ry="6" fill="${g}" opacity=".1"/>
      <path d="M14 26c0-8 4-14 10-16 6 2 10 8 10 16" fill="none" stroke="${gv}" stroke-width="1.2"/>
      <ellipse cx="24" cy="26" rx="10" ry="4" fill="${g}" opacity=".2"/>
      <path d="M20 22v-4M24 20v-6M28 22v-4" stroke="${fire}" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>
      <circle cx="20" cy="17" r="1.5" fill="${fire}" opacity=".5"/>
      <circle cx="24" cy="13" r="1.5" fill="${fire}" opacity=".6"/>
      <circle cx="28" cy="17" r="1.5" fill="${fire}" opacity=".5"/>
      <path d="M10 34h28" stroke="${gv}" stroke-width=".8" opacity=".3"/>
    `),

    'concert': svg(`
      <path d="M14 14v22M14 14l18-6v22" fill="none" stroke="${g}" stroke-width="2" filter="url(#nw-glow)"/>
      <rect x="10" y="32" width="8" height="10" rx="4" fill="${g}" opacity=".8"/>
      <rect x="28" y="26" width="8" height="10" rx="4" fill="${g}" opacity=".8"/>
      <path d="M20 20l2-1M20 24l2-1M20 28l2-1" stroke="${gv}" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>
      <circle cx="38" cy="12" r="1.5" fill="${acc}" opacity=".6"/>
      <circle cx="42" cy="16" r="1" fill="${acc}" opacity=".4"/>
      <circle cx="40" cy="8" r="1" fill="${acc}" opacity=".3"/>
    `),

    'photo': svg(`
      <rect x="6" y="12" width="36" height="28" rx="4" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <rect x="6" y="12" width="36" height="28" rx="4" fill="${g}" opacity=".08"/>
      <circle cx="24" cy="28" r="8" fill="none" stroke="${g}" stroke-width="1.5"/>
      <circle cx="24" cy="28" r="5" fill="${g}" opacity=".2"/>
      <circle cx="24" cy="28" r="2" fill="${g}" opacity=".6"/>
      <rect x="18" y="8" width="12" height="6" rx="2" fill="${gv}" opacity=".4"/>
      <circle cx="36" cy="18" r="2" fill="${fire}" opacity=".6"/>
    `),

    'forge': svg(`
      <path d="M24 6l-4 14h8L24 6z" fill="${fire}" opacity=".7" filter="url(#nw-glow)"/>
      <rect x="12" y="28" width="24" height="6" rx="2" fill="${g}" opacity=".8"/>
      <rect x="8" y="34" width="32" height="4" rx="1" fill="${gv}" opacity=".6"/>
      <path d="M22 20h4v8h-4z" fill="${g}" opacity=".5"/>
      <path d="M18 22l-4-10M30 22l4-10" stroke="${fire}" stroke-width="1" opacity=".4"/>
      <circle cx="24" cy="12" r="2" fill="#fff" opacity=".7"/>
      <path d="M16 38v4M24 38v6M32 38v4" stroke="${gv}" stroke-width="1.5" opacity=".4"/>
    `),

    'market': svg(`
      <path d="M8 18h32l-4 22H12L8 18z" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <path d="M8 18h32l-2 4H10l-2-4z" fill="${g}" opacity=".6"/>
      <path d="M8 18l6-12h20l6 12" fill="none" stroke="${gv}" stroke-width="1.2"/>
      <path d="M14 6h20" stroke="${g}" stroke-width="1.5"/>
      <circle cx="20" cy="30" r="3" fill="${g}" opacity=".4"/>
      <circle cx="28" cy="28" r="2" fill="${acc}" opacity=".4"/>
      <path d="M24 26v8" stroke="${gv}" stroke-width="1" opacity=".5"/>
      <path d="M17 36h14" stroke="${gv}" stroke-width=".8" opacity=".3"/>
    `),

    'vault': svg(`
      <rect x="8" y="10" width="32" height="32" rx="4" fill="none" stroke="${g}" stroke-width="1.8" filter="url(#nw-glow)"/>
      <rect x="8" y="10" width="32" height="32" rx="4" fill="${g}" opacity=".06"/>
      <circle cx="24" cy="26" r="8" fill="none" stroke="${g}" stroke-width="1.5"/>
      <circle cx="24" cy="26" r="5" fill="none" stroke="${gv}" stroke-width="1"/>
      <circle cx="24" cy="26" r="2" fill="${g}"/>
      <path d="M24 18v-2M24 36v-2M16 26h-2M34 26h-2" stroke="${g}" stroke-width="1" opacity=".5"/>
      <path d="M12 10h24l2-4H10l2 4z" fill="${gv}" opacity=".4"/>
    `),

    'bosses': svg(`
      <circle cx="24" cy="20" r="14" fill="none" stroke="${fire}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <circle cx="24" cy="20" r="14" fill="${fire}" opacity=".06"/>
      <circle cx="18" cy="18" r="3" fill="none" stroke="${g}" stroke-width="1.2"/>
      <circle cx="30" cy="18" r="3" fill="none" stroke="${g}" stroke-width="1.2"/>
      <circle cx="18" cy="18" r="1" fill="${fire}" opacity=".8"/>
      <circle cx="30" cy="18" r="1" fill="${fire}" opacity=".8"/>
      <path d="M18 26q6 4 12 0" stroke="${g}" stroke-width="1.2" fill="none"/>
      <path d="M14 10l-4-4M34 10l4-4" stroke="${fire}" stroke-width="1.5" opacity=".6"/>
      <path d="M18 36l-2 6M30 36l2 6M24 34v8" stroke="${gv}" stroke-width="1" opacity=".4"/>
    `),

    'forbidden': svg(`
      <path d="M24 8l-2 12h4L24 8z" fill="${g}" opacity=".8" filter="url(#nw-glow)"/>
      <circle cx="24" cy="24" r="3" fill="${purp}" opacity=".6"/>
      <path d="M16 28c-4 2-6 6-4 10l12-4 12 4c2-4 0-8-4-10" fill="none" stroke="${g}" stroke-width="1.5"/>
      <path d="M24 28v6" stroke="${g}" stroke-width="1.2"/>
      <circle cx="24" cy="36" r="1.5" fill="${g}" opacity=".6"/>
      <path d="M14 20l-6-2M34 20l6-2" stroke="${purp}" stroke-width="1" opacity=".5"/>
      <path d="M10 40h28" stroke="${gv}" stroke-width=".8" opacity=".3"/>
    `),

    'seasons': svg(`
      <circle cx="24" cy="24" r="16" fill="none" stroke="${g}" stroke-width="1.2" filter="url(#nw-glow)"/>
      <path d="M24 8v6M24 34v6M8 24h6M34 24h6" stroke="${g}" stroke-width="1.5"/>
      <path d="M14 14l4 4M30 30l4 4M14 34l4-4M30 14l4-4" stroke="${gv}" stroke-width="1" opacity=".6"/>
      <circle cx="24" cy="24" r="4" fill="${g}" opacity=".3"/>
      <path d="M20 12a5 5 0 0 1 8 0" stroke="${acc}" stroke-width="1.2" fill="none" opacity=".7"/>
      <path d="M34 20a5 5 0 0 1 0 8" stroke="${fire}" stroke-width="1.2" fill="none" opacity=".7"/>
      <path d="M28 36a5 5 0 0 1-8 0" stroke="${em}" stroke-width="1.2" fill="none" opacity=".7"/>
      <path d="M14 28a5 5 0 0 1 0-8" stroke="${acc}" stroke-width="1.2" fill="none" opacity=".7"/>
    `),

    /* ═══ DLC: FLEX ═══ */
    'skins': svg(`
      <path d="M24 6c-8 0-14 6-14 14v4l14 18 14-18v-4c0-8-6-14-14-14z" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <path d="M24 6c-8 0-14 6-14 14v4l14 18 14-18v-4c0-8-6-14-14-14z" fill="${g}" opacity=".08"/>
      <path d="M24 14l2 4 4.5.7-3.2 3.1.8 4.5-4.1-2.2-4.1 2.2.8-4.5-3.2-3.1 4.5-.7z" fill="${g}" opacity=".8"/>
      <path d="M14 30l10 12 10-12" fill="none" stroke="${gv}" stroke-width="1" opacity=".5"/>
    `),

    'mounts': svg(`
      <path d="M12 32l4-14 4 4 4-8 4 8 4-4 4 14z" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <path d="M12 32l4-14 4 4 4-8 4 8 4-4 4 14z" fill="${g}" opacity=".1"/>
      <circle cx="24" cy="18" r="6" fill="none" stroke="${g}" stroke-width="1.2"/>
      <path d="M20 17l3 3 5-5" stroke="${g}" stroke-width="1.5" fill="none"/>
      <path d="M10 36l7-4M38 36l-7-4" stroke="${gv}" stroke-width="1" opacity=".4"/>
      <path d="M16 40h16" stroke="${gv}" stroke-width="1" opacity=".3"/>
    `),

    'decor': svg(`
      <rect x="8" y="8" width="32" height="32" rx="2" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <rect x="12" y="12" width="24" height="24" rx="1" fill="${g}" opacity=".06"/>
      <path d="M12 24h24M24 12v24" stroke="${gv}" stroke-width=".8" opacity=".3"/>
      <rect x="14" y="14" width="8" height="8" rx="1" fill="${g}" opacity=".2"/>
      <circle cx="32" cy="18" r="3" fill="${acc}" opacity=".3"/>
      <path d="M26 30h8v4h-8z" fill="${g}" opacity=".15"/>
      <path d="M14 30l4-4 4 4" stroke="${g}" stroke-width="1" fill="none" opacity=".5"/>
    `),

    'emotes': svg(`
      <circle cx="24" cy="24" r="16" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <circle cx="24" cy="24" r="16" fill="${g}" opacity=".06"/>
      <circle cx="18" cy="20" r="2.5" fill="${g}" opacity=".6"/>
      <circle cx="30" cy="20" r="2.5" fill="${g}" opacity=".6"/>
      <path d="M16 30q8 6 16 0" stroke="${g}" stroke-width="1.5" fill="none"/>
      <path d="M10 10l4 4M38 10l-4 4M6 24h4M38 24h4M10 38l4-4M38 38l-4-4" stroke="${fire}" stroke-width="1" opacity=".4"/>
    `),

    /* ═══ DLC: ACTIVITIES ═══ */
    'hotsprings': svg(`
      <ellipse cx="24" cy="34" rx="16" ry="8" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <ellipse cx="24" cy="34" rx="13" ry="6" fill="${acc}" opacity=".15"/>
      <path d="M16 26c0-2 2-3 2-5s-2-3-2-5" stroke="${g}" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>
      <path d="M24 24c0-2 2-3 2-5s-2-3-2-5" stroke="${g}" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>
      <path d="M32 26c0-2 2-3 2-5s-2-3-2-5" stroke="${g}" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>
    `),

    'pets': svg(`
      <ellipse cx="24" cy="28" rx="10" ry="12" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <ellipse cx="24" cy="28" rx="7" ry="9" fill="${g}" opacity=".1"/>
      <circle cx="20" cy="24" r="2" fill="${g}" opacity=".6"/>
      <circle cx="28" cy="24" r="2" fill="${g}" opacity=".6"/>
      <path d="M22 30q2 2 4 0" stroke="${g}" stroke-width="1" fill="none"/>
      <path d="M14 20q-4-8 0-12" stroke="${g}" stroke-width="1.2" fill="none"/>
      <path d="M34 20q4-8 0-12" stroke="${g}" stroke-width="1.2" fill="none"/>
      <circle cx="24" cy="34" r="1.5" fill="${fire}" opacity=".5"/>
    `),

    'arcade': svg(`
      <rect x="10" y="6" width="28" height="36" rx="4" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <rect x="14" y="10" width="20" height="14" rx="2" fill="${g}" opacity=".12"/>
      <circle cx="18" cy="32" r="3" fill="none" stroke="${g}" stroke-width="1.2"/>
      <path d="M28 29v6M25 32h6" stroke="${g}" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M18 16l2 2 4-4" stroke="${acc}" stroke-width="1.5" fill="none"/>
    `),

    'festivals': svg(`
      <path d="M24 4v14" stroke="${g}" stroke-width="1.5"/>
      <path d="M24 18l-12 8h24l-12-8z" fill="${fire}" opacity=".3" filter="url(#nw-glow)"/>
      <circle cx="24" cy="6" r="3" fill="${g}" opacity=".7"/>
      <path d="M14 30l-4 12M34 30l4 12" stroke="${g}" stroke-width="1" opacity=".5"/>
      <path d="M18 26l-6 4M30 26l6 4" stroke="${fire}" stroke-width="1" opacity=".4"/>
      <circle cx="10" cy="32" r="1.5" fill="${fire}" opacity=".5"/>
      <circle cx="38" cy="32" r="1.5" fill="${acc}" opacity=".5"/>
      <circle cx="16" cy="38" r="1" fill="${purp}" opacity=".5"/>
      <circle cx="32" cy="38" r="1" fill="${em}" opacity=".5"/>
      <path d="M20 34h8" stroke="${gv}" stroke-width="1" opacity=".4"/>
    `),

    /* ═══ DLC: DUEL ═══ */
    'duel-table': svg(`
      <rect x="6" y="16" width="36" height="24" rx="4" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <rect x="6" y="16" width="36" height="24" rx="4" fill="${g}" opacity=".06"/>
      <path d="M24 16v24" stroke="${gv}" stroke-width="1" stroke-dasharray="3 2"/>
      <rect x="10" y="20" width="10" height="14" rx="2" fill="${g}" opacity=".15" transform="rotate(-5 15 27)"/>
      <rect x="28" y="20" width="10" height="14" rx="2" fill="${acc}" opacity=".15" transform="rotate(5 33 27)"/>
      <circle cx="15" cy="27" r="2" fill="${g}" opacity=".5"/>
      <circle cx="33" cy="27" r="2" fill="${acc}" opacity=".5"/>
      <path d="M10 12l4 4M38 12l-4 4" stroke="${g}" stroke-width="1" opacity=".4"/>
    `),

    'holographic': svg(`
      <path d="M24 6l14 10v16L24 42 10 32V16L24 6z" fill="none" stroke="${acc}" stroke-width="1.2" filter="url(#nw-glow)"/>
      <path d="M24 6l14 10v16L24 42 10 32V16L24 6z" fill="${acc}" opacity=".06"/>
      <path d="M24 14l8 5v10l-8 5-8-5V19l8-5z" fill="none" stroke="${g}" stroke-width="1.5"/>
      <path d="M24 14v20M16 19l16 10M16 29l16-10" stroke="${g}" stroke-width=".8" opacity=".4"/>
      <circle cx="24" cy="24" r="3" fill="${acc}" opacity=".5"/>
    `),

    'challenge': svg(`
      <circle cx="24" cy="24" r="16" fill="none" stroke="${fire}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <circle cx="24" cy="24" r="12" fill="none" stroke="${g}" stroke-width="1"/>
      <circle cx="24" cy="24" r="8" fill="none" stroke="${fire}" stroke-width="1"/>
      <circle cx="24" cy="24" r="3" fill="${fire}" opacity=".7"/>
      <path d="M24 4v4M24 40v4M4 24h4M40 24h4" stroke="${g}" stroke-width="1" opacity=".5"/>
    `),

    /* ═══ DLC: SPECTATOR ═══ */
    'replay': svg(`
      <rect x="6" y="10" width="36" height="28" rx="4" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <rect x="6" y="10" width="36" height="28" rx="4" fill="${g}" opacity=".06"/>
      <path d="M20 20v12l10-6z" fill="${g}" opacity=".7"/>
      <path d="M36 14h4v4" stroke="${acc}" stroke-width="1.2" fill="none" opacity=".6"/>
      <path d="M12 14h-4v4" stroke="${acc}" stroke-width="1.2" fill="none" opacity=".6"/>
    `),

    'crowd': svg(`
      <path d="M6 34h36" stroke="${gv}" stroke-width="1" opacity=".3"/>
      <circle cx="14" cy="18" r="4" fill="none" stroke="${g}" stroke-width="1.2"/>
      <circle cx="24" cy="14" r="4" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <circle cx="34" cy="18" r="4" fill="none" stroke="${g}" stroke-width="1.2"/>
      <path d="M14 22v10M24 18v14M34 22v10" stroke="${g}" stroke-width="1.5"/>
      <path d="M10 26l4-4 4 4M20 22l4-4 4 4M30 26l4-4 4 4" stroke="${fire}" stroke-width="1" opacity=".4"/>
      <path d="M8 38l6-4M40 38l-6-4" stroke="${gv}" stroke-width=".8" opacity=".3"/>
    `),

    'streetcred': svg(`
      <path d="M24 4l6 12h13l-10.5 7.6 4 12.4L24 28l-12.5 8 4-12.4L5 16h13l6-12z" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <path d="M24 4l6 12h13l-10.5 7.6 4 12.4L24 28l-12.5 8 4-12.4L5 16h13l6-12z" fill="${g}" opacity=".12"/>
      <path d="M24 12l3 6h6.5l-5.3 3.8 2 6.2L24 23.5 17.8 28l2-6.2L14.5 18H21l3-6z" fill="${g}" opacity=".3"/>
    `),

    'spectator-kit': svg(`
      <rect x="8" y="8" width="32" height="32" rx="4" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <path d="M14 16h20v16H14z" fill="${g}" opacity=".08"/>
      <circle cx="20" cy="24" r="4" fill="none" stroke="${g}" stroke-width="1.2"/>
      <circle cx="32" cy="24" r="4" fill="none" stroke="${acc}" stroke-width="1.2"/>
      <path d="M24 24h4" stroke="${g}" stroke-width="1"/>
      <path d="M18 14l2-4M30 14l-2-4" stroke="${gv}" stroke-width="1" opacity=".5"/>
    `),

    /* ═══ DLC: EXOTIC BIOMES ═══ */
    'griffin': svg(`
      <path d="M20 14c-6 0-10 6-8 12l12 14 12-14c2-6-2-12-8-12" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <path d="M24 10l-8 4 8 8 8-8-8-4z" fill="${g}" opacity=".2"/>
      <path d="M12 22l-6 4 6 6" fill="none" stroke="${g}" stroke-width="1.2" opacity=".6"/>
      <path d="M36 22l6 4-6 6" fill="none" stroke="${g}" stroke-width="1.2" opacity=".6"/>
      <circle cx="21" cy="18" r="1.5" fill="${g}" opacity=".7"/>
      <circle cx="27" cy="18" r="1.5" fill="${g}" opacity=".7"/>
      <path d="M22 22q2 2 4 0" stroke="${g}" stroke-width="1" fill="none"/>
    `),

    'cloud-fishing': svg(`
      <path d="M12 10c0-4 4-6 8-4 2-4 8-4 10 0 4 0 6 4 4 8H10c-2-4 0-8 2-8z" fill="${g}" opacity=".15" filter="url(#nw-glow)"/>
      <path d="M12 10c0-4 4-6 8-4 2-4 8-4 10 0 4 0 6 4 4 8H10c-2-4 0-8 2-8z" fill="none" stroke="${g}" stroke-width="1.2"/>
      <path d="M24 18v18" stroke="${g}" stroke-width="1.5"/>
      <path d="M24 36l-4 4" stroke="${g}" stroke-width="1.2"/>
      <path d="M20 40q-2 4 0 4" stroke="${acc}" stroke-width="1.2" fill="none"/>
      <path d="M30 14l-6 4" stroke="${gv}" stroke-width=".8" opacity=".5"/>
    `),

    'parliament': svg(`
      <path d="M24 6l-16 14h32L24 6z" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <path d="M24 6l-16 14h32L24 6z" fill="${g}" opacity=".1"/>
      <rect x="10" y="20" width="28" height="18" fill="none" stroke="${g}" stroke-width="1.2"/>
      <path d="M16 20v18M24 20v18M32 20v18" stroke="${gv}" stroke-width="1" opacity=".4"/>
      <path d="M8 38h32" stroke="${g}" stroke-width="1.5"/>
      <circle cx="24" cy="12" r="2" fill="${g}" opacity=".6"/>
    `),

    /* ═══ DLC: TIME RIFT ═══ */
    'sporemite': svg(`
      <path d="M24 12c-6 0-10 4-10 10 0 8 4 16 10 18 6-2 10-10 10-18 0-6-4-10-10-10z" fill="none" stroke="${em}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <path d="M24 12c-6 0-10 4-10 10 0 8 4 16 10 18 6-2 10-10 10-18 0-6-4-10-10-10z" fill="${em}" opacity=".08"/>
      <circle cx="20" cy="22" r="2" fill="${em}" opacity=".5"/>
      <circle cx="28" cy="22" r="2" fill="${em}" opacity=".5"/>
      <circle cx="24" cy="28" r="1.5" fill="${em}" opacity=".4"/>
      <path d="M18 8l2 4M30 8l-2 4M24 6v6" stroke="${em}" stroke-width="1.2" opacity=".6"/>
    `),

    'timeloop': svg(`
      <circle cx="24" cy="24" r="16" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <circle cx="24" cy="24" r="16" fill="${g}" opacity=".04"/>
      <path d="M24 12v12l8 8" stroke="${g}" stroke-width="2" stroke-linecap="round"/>
      <path d="M36 12l-4 4M38 20l-4 1" stroke="${acc}" stroke-width="1.2" opacity=".6"/>
      <path d="M8 18a16 16 0 0 1 28-6" fill="none" stroke="${acc}" stroke-width="1.5" opacity=".5"/>
      <path d="M36 12l2-4 4 2" stroke="${acc}" stroke-width="1.2" fill="none" opacity=".6"/>
    `),

    'archaeology': svg(`
      <path d="M18 8l-8 32h28l-8-32z" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <path d="M18 8l-8 32h28l-8-32z" fill="${g}" opacity=".06"/>
      <path d="M14 24h20" stroke="${gv}" stroke-width="1" opacity=".4"/>
      <circle cx="24" cy="18" r="4" fill="none" stroke="${g}" stroke-width="1.2"/>
      <path d="M22 18h4M24 16v4" stroke="${g}" stroke-width="1" opacity=".6"/>
      <path d="M18 30h12" stroke="${gv}" stroke-width=".8" opacity=".3"/>
      <circle cx="20" cy="34" r="1.5" fill="${fire}" opacity=".4"/>
      <circle cx="28" cy="32" r="1" fill="${acc}" opacity=".4"/>
    `),

    /* ═══ DLC: REGINA ═══ */
    'ship': svg(`
      <path d="M8 28h32l-4 8H12l-4-8z" fill="${g}" opacity=".2" filter="url(#nw-glow)"/>
      <path d="M8 28h32l-4 8H12l-4-8z" fill="none" stroke="${g}" stroke-width="1.5"/>
      <path d="M24 8v20" stroke="${g}" stroke-width="2"/>
      <path d="M24 8l14 10v8H24z" fill="${g}" opacity=".15"/>
      <path d="M24 8l14 10v8H24" fill="none" stroke="${g}" stroke-width="1.2"/>
      <path d="M10 40q7-4 14-2t14-2" stroke="${acc}" stroke-width="1" opacity=".4"/>
    `),

    'history': svg(`
      <path d="M12 6h24v36H12z" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <path d="M12 6h24v36H12z" fill="${g}" opacity=".06"/>
      <path d="M16 14h16M16 20h16M16 26h12M16 32h8" stroke="${gv}" stroke-width="1" opacity=".5"/>
      <path d="M10 6l2-2h24l2 2" stroke="${g}" stroke-width="1.2" opacity=".6"/>
      <circle cx="34" cy="38" r="3" fill="${acc}" opacity=".3"/>
    `),

    'dive': svg(`
      <path d="M24 6v32" stroke="${acc}" stroke-width="1.5"/>
      <circle cx="24" cy="12" r="6" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <circle cx="24" cy="12" r="3" fill="${g}" opacity=".2"/>
      <path d="M18 20l-4 8M30 20l4 8" stroke="${g}" stroke-width="1.2" opacity=".6"/>
      <path d="M16 32l8 6 8-6" fill="none" stroke="${acc}" stroke-width="1.2" opacity=".5"/>
      <circle cx="12" cy="36" r="1.5" fill="${acc}" opacity=".3"/>
      <circle cx="36" cy="34" r="1" fill="${acc}" opacity=".3"/>
      <circle cx="8" cy="42" r="1" fill="${acc}" opacity=".2"/>
    `),

    /* ═══ DLC: REGINA EXTRA ═══ */
    'adventure': svg(`
      <path d="M24 4l-14 20h28L24 4z" fill="none" stroke="${fire}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <path d="M24 4l-14 20h28L24 4z" fill="${fire}" opacity=".08"/>
      <circle cx="24" cy="14" r="3" fill="${fire}" opacity=".4"/>
      <path d="M14 28v12M34 28v12" stroke="${g}" stroke-width="1.2" opacity=".5"/>
      <path d="M14 40h20" stroke="${g}" stroke-width="1.5"/>
      <path d="M20 32h8v8h-8z" fill="${g}" opacity=".15"/>
    `),

    'dining': svg(`
      <ellipse cx="24" cy="28" rx="16" ry="10" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <ellipse cx="24" cy="28" rx="13" ry="7" fill="${g}" opacity=".1"/>
      <path d="M16 18v-8M20 18v-10M24 18v-8" stroke="${g}" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M30 10v8M30 18c3-2 4-6 2-8" stroke="${g}" stroke-width="1.2" stroke-linecap="round" fill="none"/>
      <circle cx="24" cy="28" r="4" fill="${g}" opacity=".15"/>
    `),

    'suites': svg(`
      <rect x="6" y="10" width="36" height="28" rx="3" fill="none" stroke="${g}" stroke-width="1.5" filter="url(#nw-glow)"/>
      <rect x="6" y="10" width="36" height="28" rx="3" fill="${g}" opacity=".06"/>
      <path d="M10 28h28v8H10z" fill="${g}" opacity=".15"/>
      <path d="M14 28v-8h8v8" fill="none" stroke="${gv}" stroke-width="1"/>
      <circle cx="33" cy="22" r="3" fill="${acc}" opacity=".3"/>
      <path d="M6 14h36" stroke="${gv}" stroke-width=".8" opacity=".3"/>
      <path d="M24 14v-4" stroke="${g}" stroke-width="1.5"/>
      <circle cx="24" cy="8" r="2" fill="${g}" opacity=".5"/>
    `)
  };

  /* ── Inject icons into the DOM ────────────────────────────── */
  // Map data-i18n keys → icon keys
  const KEY_MAP = {
    'feat_biomes': 'biomes',
    'feat_monkeys': 'monkeys',
    'feat_cycle': 'day-night',
    'feat_action': 'action-rpg',
    'feat_tcg': 'tcg',
    'feat_pvp': 'pvp',
    'feat_feast': 'feast',
    'feat_concert': 'concert',
    'feat_photo': 'photo',
    'feat_forge': 'forge',
    'feat_market': 'market',
    'feat_vault': 'vault',
    'feat_bosses': 'bosses',
    'feat_forbidden': 'forbidden',
    'feat_seasons': 'seasons',
    // DLC Flex
    'feat_skins': 'skins',
    'feat_mounts': 'mounts',
    'feat_decor': 'decor',
    'feat_emotes': 'emotes',
    // DLC Activities
    'feat_hotsprings': 'hotsprings',
    'feat_pets': 'pets',
    'feat_arcade': 'arcade',
    'feat_festival': 'festivals',
    // DLC Duel
    'feat_portable': 'duel-table',
    'feat_holo': 'holographic',
    'feat_challenge': 'challenge',
    // DLC Spectator
    'feat_replay': 'replay',
    'feat_crowdsurge': 'crowd',
    'feat_streaks': 'streetcred',
    'feat_spectatorkit': 'spectator-kit',
    // DLC Exotic
    'feat_griffins': 'griffin',
    'feat_cloudfish': 'cloud-fishing',
    'feat_skyparliament': 'parliament',
    // DLC Time Rift
    'feat_sporemites': 'sporemite',
    'feat_timeloops': 'timeloop',
    'feat_archaeology': 'archaeology',
    // DLC Regina
    'feat_explore_ship': 'ship',
    'feat_regina_history': 'history',
    'feat_regina_dive': 'dive',
    // DLC Regina Extra
    'feat_rms_adventure': 'adventure',
    'feat_rms_dining': 'dining',
    'feat_rms_suites': 'suites'
  };

  function init() {
    // Strategy: find each .feature-icon, look at its sibling h3's data-i18n key
    document.querySelectorAll('.feature-icon').forEach(function(iconEl) {
      var card = iconEl.closest('.feature-card');
      if (!card) return;
      var h3 = card.querySelector('h3[data-i18n]');
      if (!h3) return;
      var key = h3.getAttribute('data-i18n');
      var iconKey = KEY_MAP[key];
      if (iconKey && ICONS[iconKey]) {
        iconEl.innerHTML = ICONS[iconKey];
        iconEl.classList.add('nw-icon-loaded');
      }
    });
  }

  // Run on DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for external use
  window.NW_GAME_ICONS = { icons: ICONS, keyMap: KEY_MAP, init: init };
})();
