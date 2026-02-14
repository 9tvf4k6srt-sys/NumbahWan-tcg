#!/usr/bin/env node
/**
 * NWG Trailer Pipeline — Manifest Generator v2
 * 
 * Generates trailer manifests with:
 * - 6 presets with punchy marketing captions
 * - Music file references per preset
 * - Transition types per scene cut
 * - Camera motion presets
 * 
 * Usage: node pipeline/generate-manifest.js <preset> [output.json]
 *        node pipeline/generate-manifest.js --list
 */

import { writeFileSync } from 'fs';

// ─── Preset Styles ──────────────────────────────────────────────

export const STYLES = {
  epic: {
    music_style: 'Epic orchestral trailer music with war drums, brass fanfares, building intensity, heroic theme, 110 BPM',
    music_file: 'pipeline/music/nwg-social-30s-epic.mp3',
    caption_style: {
      font: 'Rajdhani', weight: 700, color: '#FFD700',
      shadow: '0 0 20px rgba(255,215,0,0.5), 2px 2px 4px rgba(0,0,0,0.9)',
      position: 'bottom-center', animation: 'fade-up'
    }
  },
  dark: {
    music_style: 'Dark cinematic tension, deep bass, eerie strings, sparse piano, suspenseful buildup, 90 BPM',
    music_file: 'pipeline/music/nwg-samsara-dark.mp3',
    caption_style: {
      font: 'Rajdhani', weight: 700, color: '#FF4444',
      shadow: '0 0 20px rgba(255,0,0,0.3), 2px 2px 4px rgba(0,0,0,0.9)',
      position: 'bottom-center', animation: 'fade-up'
    }
  },
  adventure: {
    music_style: 'Adventure fantasy orchestral, playful flutes, sweeping strings, whimsical exploration theme, 120 BPM',
    music_file: 'pipeline/music/nwg-sky-islands-adventure.mp3',
    caption_style: {
      font: 'Rajdhani', weight: 700, color: '#00D4FF',
      shadow: '0 0 20px rgba(0,212,255,0.5), 2px 2px 4px rgba(0,0,0,0.9)',
      position: 'bottom-center', animation: 'fade-up'
    }
  },
  hype: {
    music_style: 'High energy electronic trailer music, heavy bass drops, fast cuts, EDM meets orchestral, 140 BPM',
    music_file: 'pipeline/music/nwg-social-30s-epic.mp3',
    caption_style: {
      font: 'Orbitron', weight: 900, color: '#FFFFFF',
      shadow: '0 0 30px rgba(255,255,255,0.5), 2px 2px 4px rgba(0,0,0,0.9)',
      position: 'center', animation: 'fade-up'
    }
  }
};

// ─── Camera + Transition Presets ────────────────────────────────

const CAMERAS = ['slow-zoom-in', 'slow-zoom-out', 'slow-pan-right', 'slow-pan-left', 'slow-dolly-forward', 'slow-tilt-down', 'static'];
function pickCamera(idx) { return CAMERAS[idx % CAMERAS.length]; }

const TRANSITIONS = ['crossfade', 'dip-to-black', 'crossfade', 'flash-white', 'crossfade', 'dip-to-black'];
function pickTransition(idx) { return TRANSITIONS[idx % TRANSITIONS.length]; }

// ─── Quick Trailer Builder ──────────────────────────────────────

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
      music_file: style.music_file,
      caption_style: style.caption_style
    },
    scenes: scenes.map((s, i) => {
      const base = {
        id: `s${(i + 1).toString().padStart(2, '0')}`,
        caption: s.caption || '',
        caption_delay: s.caption_delay || 0.5,
        caption_duration: s.caption_duration || ((s.duration || 5) - 1.5),
        transition_out: s.transition || pickTransition(i)
      };

      if (s.video) {
        return { ...base, type: 'video', source: s.video, trim: s.trim || undefined, duration: s.duration };
      } else {
        return { ...base, type: 'image-to-video', source: s.image, duration: s.duration || 5, camera: s.camera || pickCamera(i) };
      }
    })
  };

  // End title card
  if (options.endTitle !== false) {
    manifest.scenes.push({
      id: `s${(manifest.scenes.length + 1).toString().padStart(2, '0')}`,
      type: 'title-card',
      background: '#000000',
      duration: 4,
      caption: options.endTitle || title.toUpperCase(),
      caption_style_override: { color: style.caption_style.color, size: 'xlarge', animation: 'fade-up', position: 'center' },
      transition_out: 'fade-to-black',
      music_cue: 'final-note-sustain'
    });
  }

  return manifest;
}

// ─── Preset Trailers (punchy marketing captions) ────────────────

export const PRESETS = {
  'social-30s': () => quickTrailer('NWG — Coming Soon', [
    { image: '/static/game/01-title-cinematic.webp', caption: 'WHAT IF YOUR GUILD WAS A AAA GAME?', duration: 5, camera: 'slow-zoom-out' },
    { image: '/static/game/02-open-world.webp', caption: 'Open world. Unreal Engine 5. Zero compromises.', duration: 4, transition: 'crossfade' },
    { image: '/static/game/05-card-battle.webp', caption: 'Every duel rewrites history.', duration: 4, transition: 'flash-white' },
    { image: '/static/game/17-monkey-king-boss.webp', caption: '80+ companions. They choose you.', duration: 4, transition: 'crossfade' },
    { image: '/static/game/55-sky-islands.webp', caption: '6 FREE DLCs at launch.', duration: 4, transition: 'dip-to-black' },
    { image: '/static/game/72-regina-storm.webp', caption: 'A real 1907 shipwreck. Explore every deck.', duration: 4, transition: 'dip-to-black' },
  ], { style: 'hype', endTitle: 'NWG THE GAME - COMING SOON' }),

  'trailer-60s': () => quickTrailer('NWG Cinematic Trailer', [
    { image: '/static/game/01-title-cinematic.webp', caption: 'In a world where every creature has a soul...', duration: 6, camera: 'slow-zoom-out', transition: 'crossfade' },
    { image: '/static/game/02-open-world.webp', caption: 'A guild built something no one thought possible.', duration: 5, transition: 'crossfade' },
    { video: '/static/video/scene1-castle-reveal.mp4', caption: 'CASTLE NUMBAHWAN', duration: 6, trim: { start: 0, end: 6 }, transition: 'dip-to-black' },
    { image: '/static/game/05-card-battle.webp', caption: 'Where card duels decide the fate of nations.', duration: 5, transition: 'flash-white' },
    { video: '/static/video/scene2-card-duel.mp4', caption: '', duration: 5, trim: { start: 0, end: 5 }, transition: 'crossfade' },
    { image: '/static/game/17-monkey-king-boss.webp', caption: '80+ companions. Each with their own story.', duration: 5, transition: 'crossfade' },
    { video: '/static/video/scene4-monkey-king.mp4', caption: 'MONKEY KING - PHASE 2', duration: 5, trim: { start: 1, end: 6 }, transition: 'dip-to-black' },
    { image: '/static/game/55-sky-islands.webp', caption: '6 massive FREE DLCs. No paywalls. No compromises.', duration: 5, transition: 'crossfade' },
    { video: '/static/video/scene5-regina-storm.mp4', caption: 'A real 1907 shipwreck - rebuilt deck by deck.', duration: 5, trim: { start: 0, end: 5 }, transition: 'dip-to-black' },
    { image: '/static/game/08-dungeon-raid.webp', caption: 'Kill too many creatures... and the wheel turns.', duration: 5, transition: 'dip-to-black' },
  ], { style: 'epic', endTitle: 'THE CYCLE CONTINUES...' }),

  'dlc-sky-islands': () => quickTrailer('Sky Islands DLC', [
    { image: '/static/game/55-sky-islands.webp', caption: 'Above the clouds, a forgotten world awaits.', duration: 6, camera: 'slow-zoom-out', transition: 'crossfade' },
    { image: '/static/game/56-storm-warden-boss.webp', caption: 'NEW BOSS: The Storm Warden.', duration: 5, transition: 'flash-white' },
    { image: '/static/game/57-griffin-stable.webp', caption: 'Tame griffins. Own the sky.', duration: 5, transition: 'crossfade' },
    { image: '/static/game/58-cloud-village.webp', caption: 'Cloud Village - your new home above the world.', duration: 5, transition: 'crossfade' },
    { image: '/static/game/59-guild-airship.webp', caption: 'Guild Airship raids. 20 players. One sky.', duration: 5, transition: 'dip-to-black' },
    { image: '/static/game/60-wind-temple.webp', caption: 'The Wind Temple holds the final answer.', duration: 5, transition: 'dip-to-black' },
  ], { style: 'adventure', endTitle: 'SKY ISLANDS - FREE DLC' }),

  'samsara-dark': () => quickTrailer('The Wheel of Samsara', [
    { image: '/static/game/08-dungeon-raid.webp', caption: 'Kill without mercy...', duration: 6, camera: 'slow-zoom-in', transition: 'dip-to-black' },
    { video: '/static/video/scene9-samsara-v2.mp4', caption: '...and the wheel remembers.', duration: 5, transition: 'dip-to-black' },
    { image: '/static/game/07-monkey-mountain.webp', caption: 'BANISHED. To the realm between worlds.', duration: 5, camera: 'slow-zoom-in', transition: 'crossfade' },
    { image: '/static/game/06-siege.webp', caption: 'Only good deeds can break the cycle.', duration: 5, transition: 'dip-to-black' },
    { video: '/static/video/scene10-ending-v2.mp4', caption: '', duration: 5, transition: 'dip-to-black' },
  ], { style: 'dark', endTitle: 'THE CYCLE CONTINUES...' }),

  'companions': () => quickTrailer('Companion System', [
    { image: '/static/game/01-title-cinematic.webp', caption: "We don't kill animals in this game.", duration: 5, camera: 'slow-zoom-out', transition: 'crossfade' },
    { video: '/static/video/scene7-taming-v2.mp4', caption: 'We earn their trust.', duration: 5, transition: 'crossfade' },
    { video: '/static/video/scene8-companion-battle-v2.mp4', caption: 'And they fight beside us - because they choose to.', duration: 5, transition: 'dip-to-black' },
    { image: '/static/game/04-tavern.webp', caption: '80+ unique companions. Each one unforgettable.', duration: 5, transition: 'dip-to-black' },
  ], { style: 'epic', endTitle: '80+ COMPANIONS - ZERO CRUELTY' }),

  'regina-dlc': () => quickTrailer('SS Regina DLC', [
    { image: '/static/game/68-ss-regina-exterior.webp', caption: '1907. Lake Huron. She vanished with all hands.', duration: 5, camera: 'slow-zoom-out', transition: 'crossfade' },
    { image: '/static/game/69-regina-pilothouse.webp', caption: 'Now you can walk her decks.', duration: 4, transition: 'crossfade' },
    { image: '/static/game/70-regina-engine-room.webp', caption: 'Every rivet. Every ghost.', duration: 4, transition: 'dip-to-black' },
    { image: '/static/game/71-regina-cargo-hold.webp', caption: 'What was she really carrying?', duration: 4, transition: 'crossfade' },
    { video: '/static/video/scene5-regina-storm.mp4', caption: 'Survive the storm that took her.', duration: 5, trim: { start: 0, end: 5 }, transition: 'dip-to-black' },
    { image: '/static/game/73-regina-shipwreck.webp', caption: 'The wreck remembers everything.', duration: 5, transition: 'dip-to-black' },
  ], { style: 'dark', endTitle: 'SS REGINA - FREE DLC' }),
};

// ─── CLI ────────────────────────────────────────────────────────
if (process.argv[1]?.includes('generate-manifest')) {
  const presetName = process.argv[2];
  const outPath = process.argv[3] || `pipeline/${presetName || 'custom'}-manifest.json`;

  if (presetName === '--list' || !presetName) {
    console.log('\n  Available presets:\n');
    Object.keys(PRESETS).forEach(k => {
      const m = PRESETS[k]();
      const dur = m.meta.duration_target_seconds;
      console.log(`    ${k.padEnd(20)} ${m.meta.title.padEnd(30)} ${m.scenes.length} scenes  ~${dur}s`);
    });
    console.log(`\n  Usage: node pipeline/generate-manifest.js <preset> [output.json]`);
    console.log(`  Build: node pipeline/assemble.js <manifest.json> [--vertical] [--preview]\n`);
  } else if (PRESETS[presetName]) {
    const manifest = PRESETS[presetName]();
    writeFileSync(outPath, JSON.stringify(manifest, null, 2));
    console.log(`\n  Generated: ${outPath}`);
    console.log(`    Title:    ${manifest.meta.title}`);
    console.log(`    Scenes:   ${manifest.scenes.length}`);
    console.log(`    Duration: ~${manifest.meta.duration_target_seconds}s`);
    console.log(`    Music:    ${manifest.meta.music_file || '(none)'}`);
    console.log(`\n  To build:`);
    console.log(`    node pipeline/assemble.js ${outPath}`);
    console.log(`    node pipeline/assemble.js ${outPath} --vertical   # + 9:16 TikTok`);
    console.log(`    node pipeline/assemble.js ${outPath} --preview    # fast low-res\n`);
  } else {
    console.error(`  Unknown preset: "${presetName}". Use --list to see available presets.`);
    process.exit(1);
  }
}
