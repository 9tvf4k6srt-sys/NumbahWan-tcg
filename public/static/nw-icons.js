/**
 * NW-ICONS v1.0 — NumbahWan SVG Icon System
 * Replaces ALL emojis with crisp, fast-loading inline SVGs.
 * Icons are 100% vector, no external loads, instant render.
 */
const NW_ICONS = (() => {
  'use strict';

  // ═══ ABILITY ICONS (12 abilities) ═══
  const abilities = {
    RUSH: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    CRIT_BOOST: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`,
    LIFESTEAL: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C9 6 4 10 4 14a8 8 0 0016 0c0-4-5-8-8-12zm0 18a6 6 0 01-6-6c0-2.5 2-5.5 6-9.5 4 4 6 7 6 9.5a6 6 0 01-6 6z"/><path d="M12 20a4 4 0 004-4c0-1.5-1-3-4-6-3 3-4 4.5-4 6a4 4 0 004 4z" opacity=".4"/></svg>`,
    SELF_DESTRUCT: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 6h5l-4 3.5 1.5 5.5-4.5-3-4.5 3 1.5-5.5L5 8h5l2-6z"/><circle cx="12" cy="14" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="9" y1="11" x2="15" y2="17" stroke="currentColor" stroke-width="1.5"/></svg>`,
    DEBUFF: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z"/><path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
    TAUNT: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c-4.97 0-9-2-9-4.5V17l3-3V7a6 6 0 0112 0v7l3 3v.5c0 2.5-4.03 4.5-9 4.5z"/><rect x="10" y="3" width="4" height="2" rx="1" fill="currentColor"/></svg>`,
    SHIELD: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 6v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm0 2.18l6 3v4.32c0 4.55-3.2 8.86-6 10.18-2.8-1.32-6-5.63-6-10.18V7.18l6-3z"/><path d="M10 12l2 2 4-4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    DODGE: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M15 6l-4 6 4 6"/><path d="M9 6l-4 6 4 6" opacity=".4"/></svg>`,
    DODGE_BOOST: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/><path d="M12 6v6l4 2" stroke-linecap="round"/><path d="M8 16l-2 2m10-2l2 2" stroke-linecap="round" opacity=".6"/></svg>`,
    HEAL: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18a8 8 0 110-16 8 8 0 010 16z"/><path d="M10 8h4v3h3v4h-3v3h-4v-3H7v-4h3V8z" fill="currentColor"/></svg>`,
    BUFF: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6 6.5 1-4.75 4.5L18 20l-6-3.5L6 20l1.25-6.5L2.5 9l6.5-1L12 2z"/></svg>`,
    STEALTH: `<svg viewBox="0 0 24 24" fill="currentColor" opacity=".85"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5a5 5 0 110-10 5 5 0 010 10z"/><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`
  };

  // ═══ UI ICONS (battle, navigation, status) ═══
  const ui = {
    swords: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.5 3.5L21 10l-2 2-2-2-5 5 2 2-2 2-6.5-6.5L2 15l2-2 2 2 5-5-2-2 2-2z"/><path d="M17 3l4 4M3 21l4-4"/></svg>`,
    bolt: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    skip: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l10 8-10 8V4z"/><rect x="16" y="4" width="3" height="16" rx="1"/></svg>`,
    explosion: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.5 5 5.5.8-4 3.9.9 5.3-4.9-2.6-4.9 2.6.9-5.3-4-3.9 5.5-.8L12 2z"/></svg>`,
    back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`,
    menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
    robot: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="8" width="14" height="12" rx="3"/><circle cx="9" cy="13" r="1.5"/><circle cx="15" cy="13" r="1.5"/><rect x="10" y="16" width="4" height="2" rx="1"/><line x1="12" y1="2" x2="12" y2="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="2" r="1.5"/><rect x="2" y="11" width="3" height="4" rx="1.5"/><rect x="19" y="11" width="3" height="4" rx="1.5"/></svg>`,
    trophy: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>`,
    skull: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10c0 2.76 1.34 5.2 3.4 6.72L7 21h3l.5-2h3l.5 2h3l-.4-4.28C18.66 15.2 20 12.76 20 10c0-4.42-3.58-8-8-8zm-2.5 10a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>`,
    player: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 5v1h16v-1c0-2-2-5-8-5z"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
    atk: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 2.1L22 8.6 19.9 10.7 18 8.8 11 15.8 13 17.8 10.9 19.9 4.4 13.4 6.5 11.3 8.4 13.2 15.4 6.2 13.4 4.2z"/></svg>`,
    shield_status: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 6v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"/></svg>`,
    dice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/></svg>`,
    diamond: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l10 10-10 10L2 12z"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6a5 5 0 00-10 0v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zm-6 9a2 2 0 110-4 2 2 0 010 4zM9 8V6a3 3 0 016 0v2H9z"/></svg>`,
    coin: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity=".2"/><circle cx="12" cy="12" r="8"/><text x="12" y="16" text-anchor="middle" fill="#000" font-weight="900" font-size="10">$</text></svg>`,
    fire: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-4 6-8 9-8 13a8 8 0 0016 0c0-4-4-7-8-13zm0 19a5 5 0 01-5-5c0-2.5 2-5 5-8.5 3 3.5 5 6 5 8.5a5 5 0 01-5 5z"/></svg>`,
    star: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
    delivery: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v10l4 2"/><circle cx="12" cy="12" r="10"/></svg>`,
    guarantee: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 8 12 .65-.2 1.29-.46 1.92-.77A9.96 9.96 0 0022 12c0-1.03-.16-2.02-.44-2.96L12 1z"/><path d="M10 15.5l-3.5-3.5 1.41-1.41L10 12.67l5.59-5.59L17 8.5l-7 7z" fill="#fff"/></svg>`,
    people: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="7" r="3"/><path d="M9 12c-3.87 0-7 2.13-7 4v2h14v-2c0-1.87-3.13-4-7-4z"/><circle cx="17" cy="8" r="2.5"/><path d="M17 12.5c-.73 0-1.42.12-2.06.34C16.22 13.78 17 15.12 17 16v2h5v-2c0-1.54-2.37-3.5-5-3.5z"/></svg>`,
    log: `<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="17" rx="8" ry="4"/><ellipse cx="12" cy="13" rx="8" ry="4"/><ellipse cx="12" cy="9" rx="8" ry="4" opacity=".7"/><ellipse cx="12" cy="5" rx="8" ry="4" opacity=".5"/></svg>`,
    pulse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`
  };

  /**
   * Get an inline SVG string for an ability.
   * @param {string} abilityKey e.g. 'RUSH', 'TAUNT'
   * @param {number} size pixel size (default 16)
   * @param {string} color CSS color (default 'currentColor')
   */
  function ability(key, size, color) {
    size = size || 16;
    color = color || 'currentColor';
    const svg = abilities[key];
    if (!svg) return '';
    return `<span class="nw-icon" style="display:inline-flex;width:${size}px;height:${size}px;color:${color};vertical-align:middle">${svg}</span>`;
  }

  /**
   * Get an inline SVG string for a UI icon.
   * @param {string} name e.g. 'swords', 'bolt', 'robot'
   * @param {number} size pixel size (default 20)
   * @param {string} color CSS color
   */
  function icon(name, size, color) {
    size = size || 20;
    color = color || 'currentColor';
    const svg = ui[name];
    if (!svg) return '';
    return `<span class="nw-icon" style="display:inline-flex;width:${size}px;height:${size}px;color:${color};vertical-align:middle">${svg}</span>`;
  }

  /**
   * Get raw SVG string (no wrapper) for embedding in elements.
   */
  function raw(name) {
    return ui[name] || abilities[name] || '';
  }

  return { ability, icon, raw, abilities, ui };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = NW_ICONS;
if (typeof window !== 'undefined') window.NW_ICONS = NW_ICONS;
