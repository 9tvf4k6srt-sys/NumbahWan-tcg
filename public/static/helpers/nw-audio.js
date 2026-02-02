/**
 * NW Audio Helper Library v1.0
 * Audio utilities for NumbahWan Guild
 * Note: Main sound system is in nw-sounds.js - this provides additional helpers
 */

const NW_AUDIO = {
    version: '1.0.0',
    initialized: false,
    
    // Audio context for advanced features
    audioContext: null,

    // Initialize audio system
    init() {
        if (this.initialized) return this;
        this.initialized = true;
        
        // Create audio context lazily (requires user interaction)
        this.setupUserInteractionHandler();
        
        console.log('[NW_AUDIO] v1.0.0 initialized');
        return this;
    },

    // Setup handler to create audio context on first user interaction
    setupUserInteractionHandler() {
        const createContext = () => {
            if (!this.audioContext) {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) {
                    console.warn('[NW_AUDIO] AudioContext not available');
                }
            }
            document.removeEventListener('click', createContext);
            document.removeEventListener('touchstart', createContext);
        };
        
        document.addEventListener('click', createContext, { once: true });
        document.addEventListener('touchstart', createContext, { once: true });
    },

    // Play sound effect with NW_SOUNDS fallback
    play(soundKey, options = {}) {
        // Use main sound system if available
        if (window.NW_SOUNDS && typeof NW_SOUNDS.play === 'function') {
            return NW_SOUNDS.play(soundKey, options);
        }
        
        // Fallback: log warning
        console.warn(`[NW_AUDIO] Sound "${soundKey}" not found - NW_SOUNDS not loaded`);
    },

    // Volume control
    setVolume(volume) {
        if (window.NW_SOUNDS && typeof NW_SOUNDS.setVolume === 'function') {
            NW_SOUNDS.setVolume(volume);
        }
    },

    // Mute/unmute
    toggleMute() {
        if (window.NW_SOUNDS && typeof NW_SOUNDS.toggle === 'function') {
            return NW_SOUNDS.toggle();
        }
        return false;
    },

    // Check if audio is enabled
    isEnabled() {
        if (window.NW_SOUNDS) {
            return NW_SOUNDS.enabled !== false;
        }
        return true;
    },

    // Preload sounds
    preload(soundKeys) {
        if (window.NW_SOUNDS && typeof NW_SOUNDS.preload === 'function') {
            NW_SOUNDS.preload(soundKeys);
        }
    },

    // Play UI click sound (convenience method)
    click() {
        this.play('click');
    },

    // Play select sound (convenience method)
    select() {
        this.play('select');
    },

    // Play success sound (convenience method)
    success() {
        this.play('profit');
    },

    // Play error sound (convenience method)  
    error() {
        this.play('loss');
    }
};

// Auto-initialize
if (typeof window !== 'undefined') {
    window.NW_AUDIO = NW_AUDIO;
    document.addEventListener('DOMContentLoaded', () => NW_AUDIO.init());
}
