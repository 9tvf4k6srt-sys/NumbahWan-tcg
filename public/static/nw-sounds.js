/**
 * NumbahWan Sound System v1.0
 * Global audio manager for the site
 */

const NW_SOUNDS = {
    // Sound library mapping
    sounds: {
        // UI
        click: '/static/audio/ui-select.mp3',
        select: '/static/audio/ui-select.mp3',
        
        // Trading/Exchange
        buy: '/static/audio/energy-gain.mp3',
        sell: '/static/audio/card-death.mp3',
        trade: '/static/audio/card-slam.mp3',
        profit: '/static/audio/victory.mp3',
        loss: '/static/audio/defeat.mp3',
        breaking: '/static/audio/fight-start.mp3',
        ticker: '/static/audio/countdown-tick.mp3',
        
        // Cards/Gacha
        anticipation: '/static/audio/gacha-anticipation.mp3',
        flip: '/static/audio/gacha-flip.mp3',
        common: '/static/audio/gacha-common.mp3',
        rare: '/static/audio/gacha-rare.mp3',
        epic: '/static/audio/gacha-epic.mp3',
        legendary: '/static/audio/gacha-legendary.mp3',
        mythic: '/static/audio/gacha-mythic.mp3',
        draw: '/static/audio/card-draw.mp3',
        slam: '/static/audio/card-slam.mp3',
        
        // Battle
        attack: '/static/audio/attack-slash.mp3',
        critical: '/static/audio/critical-hit.mp3',
        death: '/static/audio/card-death.mp3',
        turnEnd: '/static/audio/turn-end.mp3',
        victory: '/static/audio/victory.mp3',
        defeat: '/static/audio/defeat.mp3',
        fightStart: '/static/audio/fight-start.mp3',
        
        // Ambient
        bgm: '/static/kerning-bgm.mp3'
    },
    
    // Audio cache
    cache: {},
    
    // Settings
    enabled: true,
    volume: 0.5,
    
    // Initialize
    init() {
        // Load settings from localStorage
        const saved = localStorage.getItem('nw_sound_settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.enabled = settings.enabled ?? true;
                this.volume = settings.volume ?? 0.5;
            } catch (e) {}
        }
        
        // Preload ALL common UI sounds immediately for instant playback
        this.preload(['click', 'select', 'buy', 'sell', 'trade', 'profit', 'loss', 'draw', 'slam', 'flip']);
        
        console.log('🔊 NW Sound System initialized');
        return this;
    },
    
    // Preload sounds - actually load the audio data
    preload(keys) {
        keys.forEach(key => {
            if (this.sounds[key] && !this.cache[key]) {
                const audio = new Audio();
                audio.preload = 'auto';
                audio.src = this.sounds[key];
                // Force browser to actually load the audio
                audio.load();
                this.cache[key] = audio;
            }
        });
    },
    
    // Play a sound - optimized for instant playback
    play(key, options = {}) {
        if (!this.enabled) return;
        
        const src = this.sounds[key];
        if (!src) {
            console.warn(`Sound "${key}" not found`);
            return;
        }
        
        try {
            // Check if we have a cached and ready audio
            let audio = this.cache[key];
            
            if (audio && audio.readyState >= 2) {
                // Audio is loaded - clone it for overlapping playback
                const clone = audio.cloneNode();
                clone.volume = (options.volume ?? 1) * this.volume;
                clone.playbackRate = options.rate ?? 1;
                clone.play().catch(() => {});
                return clone;
            } else {
                // Not cached or not ready - create new and cache
                audio = new Audio(src);
                audio.volume = (options.volume ?? 1) * this.volume;
                audio.playbackRate = options.rate ?? 1;
                this.cache[key] = audio;
                audio.play().catch(() => {});
                return audio;
            }
        } catch (e) {
            console.warn('Sound play failed:', e);
        }
    },
    
    // Play with random pitch variation
    playVaried(key, variance = 0.1) {
        this.play(key, { rate: 1 + (Math.random() - 0.5) * variance * 2 });
    },
    
    // Stop a sound
    stop(key) {
        const audio = this.cache[key];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    },
    
    // Stop all
    stopAll() {
        Object.values(this.cache).forEach(audio => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
    },
    
    // Toggle sound
    toggle() {
        this.enabled = !this.enabled;
        this.saveSettings();
        return this.enabled;
    },
    
    // Set volume
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        this.saveSettings();
    },
    
    // Save settings
    saveSettings() {
        localStorage.setItem('nw_sound_settings', JSON.stringify({
            enabled: this.enabled,
            volume: this.volume
        }));
    },
    
    // Quick access methods
    ui: {
        click: () => NW_SOUNDS.play('click'),
        select: () => NW_SOUNDS.play('select')
    },
    
    trade: {
        buy: () => NW_SOUNDS.play('buy'),
        sell: () => NW_SOUNDS.play('sell'),
        execute: () => NW_SOUNDS.play('trade'),
        profit: () => NW_SOUNDS.play('profit'),
        loss: () => NW_SOUNDS.play('loss'),
        breaking: () => NW_SOUNDS.play('breaking')
    },
    
    gacha: {
        anticipation: () => NW_SOUNDS.play('anticipation'),
        flip: () => NW_SOUNDS.play('flip'),
        reveal: (rarity) => NW_SOUNDS.play(rarity || 'common')
    }
};

// Auto-initialize
if (typeof window !== 'undefined') {
    window.NW_SOUNDS = NW_SOUNDS;
    document.addEventListener('DOMContentLoaded', () => NW_SOUNDS.init());
}
