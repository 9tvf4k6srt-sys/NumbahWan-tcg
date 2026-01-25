/**
 * NumbahWan Guild - Persistent BGM System
 * Music continues playing across all page navigations
 * Uses YouTube iframe API with localStorage persistence
 */

(function() {
  'use strict';

  // Configuration
  const BGM_CONFIG = {
    videoId: 'QvSpcNrF7-E', // YouTube video ID
    volume: 50,
    storageKeys: {
      enabled: 'numbahwan_bgm_enabled',
      position: 'numbahwan_bgm_position',
      lastUpdate: 'numbahwan_bgm_lastupdate'
    }
  };

  // State
  let ytPlayer = null;
  let isReady = false;
  let isPlaying = false;
  let positionInterval = null;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  // Create BGM button and container
  function createBGMElements() {
    // Check if already exists
    if (document.getElementById('bgm-btn')) return;

    // Create container for YouTube player (hidden)
    const ytContainer = document.createElement('div');
    ytContainer.id = 'yt-bgm-container';
    ytContainer.style.cssText = `
      position: fixed;
      bottom: -9999px;
      left: -9999px;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
      z-index: -1;
    `;
    document.body.appendChild(ytContainer);

    // Create floating music button
    const btn = document.createElement('button');
    btn.id = 'bgm-btn';
    btn.innerHTML = `
      <svg id="bgm-icon" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path id="bgm-icon-path" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
      </svg>
    `;
    
    // Button styles
    const style = document.createElement('style');
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
      
      #bgm-btn.loading {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        border-color: #fbbf24;
        animation: bgmSpin 1s linear infinite;
      }
      
      #bgm-btn.muted {
        background: linear-gradient(135deg, #666 0%, #333 100%);
        border-color: rgba(255, 255, 255, 0.2);
      }
      
      @keyframes bgmPulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(255, 107, 0, 0.5); }
        50% { box-shadow: 0 4px 30px rgba(0, 255, 0, 0.6), 0 0 40px rgba(255, 107, 0, 0.4); }
      }
      
      @keyframes bgmSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Sound wave animation for playing state */
      #bgm-btn.playing::after {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid rgba(0, 255, 0, 0.5);
        animation: bgmWave 1.5s ease-out infinite;
      }
      
      @keyframes bgmWave {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(btn);

    // Click handler
    btn.addEventListener('click', toggleBGM);

    return btn;
  }

  // SVG paths
  const ICONS = {
    playing: "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
    muted: "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z",
    loading: "M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"
  };

  // Update button state
  function updateButtonState(state) {
    const btn = document.getElementById('bgm-btn');
    const iconPath = document.getElementById('bgm-icon-path');
    if (!btn || !iconPath) return;

    btn.classList.remove('playing', 'muted', 'loading');
    
    switch(state) {
      case 'playing':
        btn.classList.add('playing');
        iconPath.setAttribute('d', ICONS.playing);
        btn.title = 'Click to Stop Music';
        break;
      case 'loading':
        btn.classList.add('loading');
        iconPath.setAttribute('d', ICONS.loading);
        btn.title = 'Loading BGM...';
        break;
      case 'muted':
      default:
        btn.classList.add('muted');
        iconPath.setAttribute('d', ICONS.muted);
        btn.title = 'Click to Play Music';
        break;
    }
  }

  // Save current position to localStorage
  function savePosition() {
    if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      try {
        const currentTime = ytPlayer.getCurrentTime();
        localStorage.setItem(BGM_CONFIG.storageKeys.position, currentTime.toString());
        localStorage.setItem(BGM_CONFIG.storageKeys.lastUpdate, Date.now().toString());
      } catch (e) {
        // Ignore errors
      }
    }
  }

  // Get saved position from localStorage
  function getSavedPosition() {
    try {
      const position = parseFloat(localStorage.getItem(BGM_CONFIG.storageKeys.position) || '0');
      const lastUpdate = parseInt(localStorage.getItem(BGM_CONFIG.storageKeys.lastUpdate) || '0');
      const now = Date.now();
      
      // If last update was more than 5 seconds ago, estimate current position
      if (lastUpdate > 0 && isPlaying) {
        const elapsed = (now - lastUpdate) / 1000;
        return position + elapsed;
      }
      return position;
    } catch (e) {
      return 0;
    }
  }

  // Check if BGM should be playing
  function shouldAutoPlay() {
    return localStorage.getItem(BGM_CONFIG.storageKeys.enabled) === 'true';
  }

  // Set BGM enabled state
  function setBGMEnabled(enabled) {
    localStorage.setItem(BGM_CONFIG.storageKeys.enabled, enabled.toString());
  }

  // Load YouTube IFrame API
  function loadYouTubeAPI() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        // Wait for it to load
        const checkInterval = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('YouTube API load timeout'));
        }, 10000);
        return;
      }

      // Load the script
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => reject(new Error('Failed to load YouTube API'));
      
      window.onYouTubeIframeAPIReady = () => {
        resolve();
      };
      
      document.head.appendChild(tag);
      
      // Timeout
      setTimeout(() => {
        reject(new Error('YouTube API load timeout'));
      }, 10000);
    });
  }

  // Create YouTube player
  function createPlayer(startPosition = 0) {
    return new Promise((resolve, reject) => {
      const container = document.getElementById('yt-bgm-container');
      if (!container) {
        reject(new Error('Container not found'));
        return;
      }

      // Clear existing player
      container.innerHTML = '<div id="yt-bgm-player"></div>';

      try {
        ytPlayer = new YT.Player('yt-bgm-player', {
          height: '1',
          width: '1',
          videoId: BGM_CONFIG.videoId,
          playerVars: {
            autoplay: 1,
            loop: 1,
            playlist: BGM_CONFIG.videoId,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            start: Math.floor(startPosition)
          },
          events: {
            onReady: (event) => {
              isReady = true;
              event.target.setVolume(BGM_CONFIG.volume);
              
              // Seek to exact position if needed
              if (startPosition > 0) {
                event.target.seekTo(startPosition, true);
              }
              
              event.target.playVideo();
              resolve(event.target);
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                isPlaying = true;
                updateButtonState('playing');
                startPositionTracking();
              } else if (event.data === YT.PlayerState.PAUSED) {
                isPlaying = false;
                savePosition();
              } else if (event.data === YT.PlayerState.ENDED) {
                // Loop - restart from beginning
                event.target.seekTo(0);
                event.target.playVideo();
              }
            },
            onError: (event) => {
              console.error('YouTube player error:', event.data);
              reject(new Error('Player error: ' + event.data));
            }
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // Start tracking position
  function startPositionTracking() {
    stopPositionTracking();
    positionInterval = setInterval(savePosition, 1000);
  }

  // Stop tracking position
  function stopPositionTracking() {
    if (positionInterval) {
      clearInterval(positionInterval);
      positionInterval = null;
    }
  }

  // Start BGM
  async function startBGM() {
    updateButtonState('loading');
    
    try {
      await loadYouTubeAPI();
      
      const savedPosition = getSavedPosition();
      await createPlayer(savedPosition);
      
      setBGMEnabled(true);
      isPlaying = true;
      retryCount = 0;
      updateButtonState('playing');
      
    } catch (error) {
      console.error('Failed to start BGM:', error);
      
      // Retry logic
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(startBGM, 1000);
      } else {
        updateButtonState('muted');
        setBGMEnabled(false);
      }
    }
  }

  // Stop BGM
  function stopBGM() {
    savePosition();
    stopPositionTracking();
    
    if (ytPlayer) {
      try {
        if (typeof ytPlayer.stopVideo === 'function') {
          ytPlayer.stopVideo();
        }
        if (typeof ytPlayer.destroy === 'function') {
          ytPlayer.destroy();
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
      ytPlayer = null;
    }
    
    const container = document.getElementById('yt-bgm-container');
    if (container) {
      container.innerHTML = '';
    }
    
    isPlaying = false;
    isReady = false;
    setBGMEnabled(false);
    updateButtonState('muted');
  }

  // Toggle BGM
  function toggleBGM() {
    if (isPlaying) {
      stopBGM();
    } else {
      startBGM();
    }
  }

  // Handle page visibility change
  function handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden - save position
      savePosition();
    } else {
      // Page is visible - check if we should be playing
      if (shouldAutoPlay() && !isPlaying) {
        startBGM();
      }
    }
  }

  // Handle before unload - save position
  function handleBeforeUnload() {
    savePosition();
  }

  // Initialize
  function init() {
    // Create UI elements
    createBGMElements();
    
    // Set initial state based on localStorage
    if (shouldAutoPlay()) {
      // Small delay to let page load first
      setTimeout(startBGM, 500);
    } else {
      updateButtonState('muted');
    }
    
    // Event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    
    // Handle page show (back/forward navigation)
    window.addEventListener('pageshow', (event) => {
      // Check if this is a back/forward navigation
      if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        if (shouldAutoPlay() && !isPlaying) {
          setTimeout(startBGM, 300);
        }
      }
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  window.NumbahWanBGM = {
    start: startBGM,
    stop: stopBGM,
    toggle: toggleBGM,
    isPlaying: () => isPlaying,
    getPosition: getSavedPosition
  };

})();
