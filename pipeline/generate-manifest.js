#!/usr/bin/env node
/**
 * NWG Trailer Pipeline — Manifest Generator
 * 
 * Generates trailer manifests from simple scene lists.
 * Makes it trivial to create new trailers by just picking images + captions.
 * 
 * Usage: node pipeline/generate-manifest.js
 * 
 * Or import and use programmatically:
 *   import { quickTrailer } from './generate-manifest.js';
 *   quickTrailer('My Trailer', scenes, options);
 */

import { writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// ─── Preset Styles ──────────────────────────────────────────────────

export const STYLES = {
  epic: {
    music_style: 'Epic orchestral trailer music with war drums, brass fanfares, building intensity, heroic theme, 110 BPM',
    caption_style: {
      font: 'Rajdhani', weight: 700, color: '#FFD700',
      shadow: '0 0 20px rgba(255,215,0,0.5), 2px 2px 4px rgba(0,0,0,0.9)',
      position: 'bottom-center', animation: 'fade-up'
    }
  },
  dark: {
    music_style: 'Dark cinematic tension, deep bass, eerie strings, sparse piano, suspenseful buildup, 90 BPM',
    caption_style: {
      font: 'Rajdhani', weight: 700, color: '#FF4444',
      shadow: '0 0 20px rgba(255,0,0,0.3), 2px 2px 4px rgba(0,0,0,0.9)',
      position: 'bottom-center', animation: 'fade-up'
    }
  },
  adventure: {
    music_style: 'Adventure fantasy orchestral, playful flutes, sweeping strings, whimsical exploration theme, 120 BPM',
    caption_style: {
      font: 'Rajdhani', weight: 700, color: '#00D4FF',
      shadow: '0 0 20px rgba(0,212,255,0.5), 2px 2px 4px rgba(0,0,0,0.9)',
      position: 'bottom-center', animation: 'fade-up'
    }
  },
  hype: {
    music_style: 'High energy electronic trailer music, heavy bass drops, fast cuts, EDM meets orchestral, 140 BPM',
    caption_style: {
      font: 'Orbitron', weight: 900, color: '#FFFFFF',
      shadow: '0 0 30px rgba(255,255,255,0.5), 2px 2px 4px rgba(0,0,0,0.9)',
      position: 'center', animation: 'scale-in'
    }
  }
};

// ─── Camera Presets ─────────────────────────────────────────────────

const CAMERAS = [
  'slow-zoom-in', 'slow-zoom-out', 'slow-pan-right', 'slow-pan-left',
  'slow-dolly-forward', 'static'
];

function pickCamera(idx) {
  // Alternate cameras for visual variety
  return CAMERAS[idx % CAMERAS.length];
}

// ─── Quick Trailer Builder ──────────────────────────────────────────

/**
 * Build a trailer manifest from a simple scene list.
 * 
 * @param {string} title - Trailer title
 * @param {Array} scenes - Array of { image, caption, duration?, camera? } or { video, caption, trim? }
 * @param {Object} options - { style: 'epic'|'dark'|'adventure'|'hype', endTitle?, resolution?, fps? }
 * @returns {Object} The manifest object
 */
export function quickTrailer(title, scenes, options = {}) {
  const style = STYLES[options.style || 'epic'];
  const res = options.resolution || '1280x720';
  const fps = options.fps || 24;

  const manifest = {
    meta: {
      title,
      aspect_ratio: '16:9',
      resolution: res,
      fps,
      duration_target_seconds: scenes.reduce((sum, s) => sum + (s.duration || 5), 0),
      music_style: style.music_style,
      caption_style: style.caption_style
    },
    scenes: scenes.map((s, i) => {
      if (s.video) {
        // Video scene
        return {
          id: `s${(i + 1).toString().padStart(2, '0')}`,
          type: 'video',
          source: s.video,
          trim: s.trim || undefined,
          duration: s.duration,
          caption: s.caption || '',
          caption_delay: s.caption_delay || 0.5,
          caption_duration: s.caption_duration || ((s.duration || 5) - 1.5),
          transition_out: s.transition || 'cut-on-beat'
        };
      } else {
        // Image-to-video scene
        return {
          id: `s${(i + 1).toString().padStart(2, '0')}`,
          type: 'image-to-video',
          source: s.image,
          duration: s.duration || 5,
          camera: s.camera || pickCamera(i),
          caption: s.caption || '',
          caption_delay: s.caption_delay || 0.5,
          caption_duration: s.caption_duration || ((s.duration || 5) - 1.5),
          transition_out: s.transition || 'cut-on-beat'
        };
      }
    })
  };

  // Add end title card
  if (options.endTitle !== false) {
    manifest.scenes.push({
      id: `s${(manifest.scenes.length + 1).toString().padStart(2, '0')}`,
      type: 'title-card',
      background: '#000000',
      duration: 4,
      caption: options.endTitle || title.toUpperCase(),
      caption_style_override: {
        color: style.caption_style.color,
        size: 'xlarge',
        animation: 'fade-in-slow',
        font: 'Orbitron'
      },
      transition_out: 'fade-to-black',
      music_cue: 'final-note-sustain'
    });
  }

  return manifest;
}

// ─── Preset Trailers ────────────────────────────────────────────────

export const PRESETS = {
  // 30-second social media cut
  'social-30s': () => quickTrailer('NWG — Coming Soon', [
    { image: '/static/game/01-title-cinematic.webp', caption: 'What if your guild was a AAA game?', duration: 5, camera: 'slow-zoom-out' },
    { image: '/static/game/02-open-world.webp', caption: 'Open world. Unreal Engine 5.', duration: 4 },
    { image: '/static/game/05-card-battle.webp', caption: 'Card duels decide fate', duration: 4 },
    { image: '/static/game/17-monkey-king-boss.webp', caption: '80+ companions', duration: 4 },
    { image: '/static/game/55-sky-islands.webp', caption: '6 FREE DLCs', duration: 4 },
    { image: '/static/game/72-regina-storm.webp', caption: 'A real 1907 shipwreck', duration: 4 },
  ], { style: 'hype', endTitle: 'NWG THE GAME' }),

  // 60-second full trailer
  'trailer-60s': () => quickTrailer('NWG Cinematic Trailer', [
    { image: '/static/game/01-title-cinematic.webp', caption: 'In a world where every creature has a soul...', duration: 6, camera: 'slow-zoom-out' },
    { image: '/static/game/02-open-world.webp', caption: 'A guild built an empire', duration: 5 },
    { video: '/static/video/scene1-castle-reveal.mp4', caption: 'CASTLE NUMBAHWAN', duration: 6, trim: { start: 0, end: 6 } },
    { image: '/static/game/05-card-battle.webp', caption: 'Where card duels decide fate', duration: 5 },
    { video: '/static/video/scene2-card-duel.mp4', caption: '', duration: 5, trim: { start: 0, end: 5 } },
    { image: '/static/game/17-monkey-king-boss.webp', caption: '80+ companions fight beside you', duration: 5 },
    { video: '/static/video/scene4-monkey-king.mp4', caption: 'MONKEY KING — PHASE 2', duration: 5, trim: { start: 1, end: 6 } },
    { image: '/static/game/55-sky-islands.webp', caption: '6 massive FREE DLCs', duration: 5 },
    { video: '/static/video/scene5-regina-storm.mp4', caption: 'A real 1907 shipwreck', duration: 5, trim: { start: 0, end: 5 } },
    { image: '/static/game/08-dungeon-raid.webp', caption: 'The wheel of Samsara turns', duration: 5 },
  ], { style: 'epic', endTitle: 'THE CYCLE CONTINUES...' }),

  // DLC-specific: Sky Islands
  'dlc-sky-islands': () => quickTrailer('Sky Islands DLC', [
    { image: '/static/game/55-sky-islands.webp', caption: 'Above the clouds...', duration: 6, camera: 'slow-zoom-out' },
    { image: '/static/game/56-storm-warden-boss.webp', caption: 'New boss: The Storm Warden', duration: 5 },
    { image: '/static/game/57-griffin-stable.webp', caption: 'Tame flying mounts', duration: 5 },
    { image: '/static/game/58-cloud-village.webp', caption: 'Cloud Village — a new hub', duration: 5 },
    { image: '/static/game/59-guild-airship.webp', caption: 'Guild Airship raids', duration: 5 },
    { image: '/static/game/60-wind-temple.webp', caption: 'The Wind Temple awaits', duration: 5 },
  ], { style: 'adventure', endTitle: 'SKY ISLANDS — FREE DLC' }),

  // Horror/dark: Samsara
  'samsara-dark': () => quickTrailer('The Wheel of Samsara', [
    { image: '/static/game/08-dungeon-raid.webp', caption: 'Kill too many creatures...', duration: 6, camera: 'slow-zoom-in' },
    { video: '/static/video/scene9-samsara-v2.mp4', caption: 'And the wheel turns', duration: 5 },
    { image: '/static/game/07-monkey-mountain.webp', caption: 'You will be sent to the Hell Dimension', duration: 5, camera: 'slow-zoom-in' },
    { image: '/static/game/06-siege.webp', caption: 'Good deeds are your only way back', duration: 5 },
    { video: '/static/video/scene10-ending-v2.mp4', caption: '', duration: 5 },
  ], { style: 'dark', endTitle: 'THE CYCLE CONTINUES...' }),

  // Companion system showcase
  'companions': () => quickTrailer('Companion System', [
    { image: '/static/game/01-title-cinematic.webp', caption: "We don't kill animals", duration: 5, camera: 'slow-zoom-out' },
    { video: '/static/video/scene7-taming-v2.mp4', caption: 'We tame them', duration: 5 },
    { video: '/static/video/scene8-companion-battle-v2.mp4', caption: 'They fight beside us', duration: 5 },
    { image: '/static/game/04-tavern.webp', caption: 'Because they choose to', duration: 5 },
  ], { style: 'epic', endTitle: '80+ COMPANIONS' }),

  // Ship DLC
  'regina-dlc': () => quickTrailer('SS Regina DLC', [
    { image: '/static/game/68-ss-regina-exterior.webp', caption: 'A real 1907 shipwreck', duration: 5, camera: 'slow-zoom-out' },
    { image: '/static/game/69-regina-pilothouse.webp', caption: 'Explore every deck', duration: 4 },
    { image: '/static/game/70-regina-engine-room.webp', caption: 'Uncover its secrets', duration: 4 },
    { image: '/static/game/71-regina-cargo-hold.webp', caption: 'What lies in the cargo hold?', duration: 4 },
    { video: '/static/video/scene5-regina-storm.mp4', caption: 'Survive the storm', duration: 5, trim: { start: 0, end: 5 } },
    { image: '/static/game/73-regina-shipwreck.webp', caption: 'The wreck remembers', duration: 5 },
  ], { style: 'dark', endTitle: 'SS REGINA — FREE DLC' }),
};

// ─── CLI ────────────────────────────────────────────────────────────
if (process.argv[1]?.includes('generate-manifest')) {
  const presetName = process.argv[2];
  const outPath = process.argv[3] || `pipeline/${presetName || 'custom'}-manifest.json`;

  if (presetName && PRESETS[presetName]) {
    const manifest = PRESETS[presetName]();
    writeFileSync(outPath, JSON.stringify(manifest, null, 2));
    console.log(`Generated: ${outPath}`);
    console.log(`  Title:  ${manifest.meta.title}`);
    console.log(`  Scenes: ${manifest.scenes.length}`);
    console.log(`  Style:  ${manifest.meta.music_style.slice(0, 60)}...`);
    console.log(`\nTo build: node pipeline/assemble.js ${outPath} [music.mp3]`);
  } else {
    console.log('Available presets:');
    Object.keys(PRESETS).forEach(k => {
      const m = PRESETS[k]();
      console.log(`  ${k.padEnd(20)} — ${m.meta.title} (${m.scenes.length} scenes)`);
    });
    console.log(`\nUsage: node pipeline/generate-manifest.js <preset> [output.json]`);
  }
}
