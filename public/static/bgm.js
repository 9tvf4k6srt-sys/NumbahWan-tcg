/**
 * NumbahWan Guild - BGM System
 * Local MP3 playback - main page only
 * Simple toggle: click to play/stop
 */

(function() {
  'use strict';

  const CONFIG = {
    audioSrc: '/static/kerning-bgm.mp3',
    volume: 0.5
  };

  let audio = null;
  let isPlaying = false;

  // Icons
  const ICONS = {
    playing: `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    </svg>`,
    muted: `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
    </svg>`
  };

  // Inject styles
  function injectStyles() {
    if (document.getElementById('bgm-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'bgm-styles';
    style.textContent = `
      #bgm-btn {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ff6b00 0%, #cc5500 100%);
        border: 3px solid rgba(255, 255, 255, 0.3);
        color: white;
        cursor: pointer;
        z-index: 99998;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(255, 107, 0, 0.5);
        transition: all 0.3s ease;
        outline: none;
      }
      #bgm-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px rgba(255, 107, 0, 0.7);
      }
      #bgm-btn.playing {
        animation: bgmPulse 2s infinite;
        border-color: #00ff00;
      }
      #bgm-btn.playing::after {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid rgba(0, 255, 0, 0.5);
        animation: bgmWave 1.5s ease-out infinite;
      }
      #bgm-btn.muted {
        background: linear-gradient(135deg, #666 0%, #333 100%);
        border-color: rgba(255, 255, 255, 0.2);
      }
      @keyframes bgmPulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(255, 107, 0, 0.5); }
        50% { box-shadow: 0 4px 30px rgba(0, 255, 0, 0.6), 0 0 40px rgba(255, 107, 0, 0.4); }
      }
      @keyframes bgmWave {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Update button
  function updateButton(playing) {
    const btn = document.getElementById('bgm-btn');
    if (!btn) return;

    btn.classList.remove('playing', 'muted');
    
    if (playing) {
      btn.classList.add('playing');
      btn.innerHTML = ICONS.playing;
      btn.title = 'Click to Stop Music';
    } else {
      btn.classList.add('muted');
      btn.innerHTML = ICONS.muted;
      btn.title = 'Click to Play Music';
    }
  }

  // Create audio
  function createAudio() {
    if (audio) return audio;

    audio = new Audio(CONFIG.audioSrc);
    audio.loop = true;
    audio.volume = CONFIG.volume;
    audio.preload = 'auto';

    audio.addEventListener('playing', () => {
      isPlaying = true;
      updateButton(true);
    });

    audio.addEventListener('pause', () => {
      isPlaying = false;
      updateButton(false);
    });

    audio.addEventListener('error', (e) => {
      console.error('BGM error:', e);
      isPlaying = false;
      updateButton(false);
    });

    return audio;
  }

  // Toggle
  function toggleBGM() {
    const a = createAudio();
    
    if (isPlaying) {
      a.pause();
    } else {
      a.play().catch(e => console.error('Play failed:', e));
    }
  }

  // Create button
  function createButton() {
    if (document.getElementById('bgm-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'bgm-btn';
    btn.className = 'muted';
    btn.innerHTML = ICONS.muted;
    btn.title = 'Click to Play Music';
    btn.addEventListener('click', toggleBGM);
    document.body.appendChild(btn);
  }

  // Initialize
  function init() {
    injectStyles();
    createButton();
  }

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API
  window.NumbahWanBGM = {
    play: () => { createAudio(); audio.play().catch(() => {}); },
    stop: () => { if (audio) audio.pause(); },
    toggle: toggleBGM,
    isPlaying: () => isPlaying
  };

})();
