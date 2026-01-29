/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NW_AUDIO - Audio & Sound Effects
 * ═══════════════════════════════════════════════════════════════════════════
 * Version: 2.0.0
 * 
 * Features:
 * - Background music with fade in/out
 * - Sound effects (pooled for performance)
 * - Volume control & muting
 * - Audio sprites
 * - Spatial audio (panning)
 * - Audio visualization
 */

const NW_AUDIO = (function() {
    'use strict';

    const VERSION = '2.0.0';
    
    // State
    let audioContext = null;
    let masterGain = null;
    const sounds = new Map();
    const musicTracks = new Map();
    let currentMusic = null;
    let isMuted = false;
    let masterVolume = 1;
    let musicVolume = 0.5;
    let sfxVolume = 1;

    // Sound pool for performance
    const soundPool = new Map();
    const POOL_SIZE = 5;

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    function init() {
        // Create audio context on user interaction (required by browsers)
        const initContext = () => {
            if (audioContext) return;
            
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioContext.createGain();
            masterGain.connect(audioContext.destination);
            masterGain.gain.value = masterVolume;
            
            // Resume context if suspended
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            console.log('[NW_AUDIO] AudioContext initialized');
        };

        // Initialize on first user interaction
        ['click', 'touchstart', 'keydown'].forEach(event => {
            document.addEventListener(event, initContext, { once: true });
        });

        // Load saved preferences
        const savedMuted = localStorage.getItem('nw_audio_muted');
        const savedVolume = localStorage.getItem('nw_audio_volume');
        if (savedMuted !== null) isMuted = savedMuted === 'true';
        if (savedVolume !== null) masterVolume = parseFloat(savedVolume);

        console.log(`[NW_AUDIO] v${VERSION} initialized`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LOADING
    // ═══════════════════════════════════════════════════════════════════════════

    /** Load a sound file */
    async function load(name, url, options = {}) {
        const { type = 'sfx', loop = false } = options;

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            
            if (!audioContext) {
                // Store for later decoding
                sounds.set(name, { buffer: arrayBuffer, decoded: false, type, loop });
                return;
            }

            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            sounds.set(name, { buffer: audioBuffer, decoded: true, type, loop });

            // Pre-populate pool for SFX
            if (type === 'sfx') {
                soundPool.set(name, []);
            }

            console.log(`[NW_AUDIO] Loaded: ${name}`);
        } catch (err) {
            console.error(`[NW_AUDIO] Failed to load ${name}:`, err);
        }
    }

    /** Load multiple sounds */
    async function loadAll(soundsConfig) {
        return Promise.all(
            Object.entries(soundsConfig).map(([name, config]) => {
                if (typeof config === 'string') {
                    return load(name, config);
                }
                return load(name, config.url, config);
            })
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SOUND EFFECTS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Play a sound effect */
    function play(name, options = {}) {
        if (!audioContext || isMuted) return null;
        
        const sound = sounds.get(name);
        if (!sound) {
            console.warn(`[NW_AUDIO] Sound not found: ${name}`);
            return null;
        }

        const {
            volume = sfxVolume,
            rate = 1,
            pan = 0,
            loop = sound.loop,
            delay = 0,
            onEnd = null
        } = options;

        // Decode if needed
        if (!sound.decoded && audioContext) {
            audioContext.decodeAudioData(sound.buffer.slice(0))
                .then(decoded => {
                    sound.buffer = decoded;
                    sound.decoded = true;
                    play(name, options);
                });
            return null;
        }

        // Create source
        const source = audioContext.createBufferSource();
        source.buffer = sound.buffer;
        source.loop = loop;
        source.playbackRate.value = rate;

        // Create gain node
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume * masterVolume;

        // Create panner for spatial audio
        const panNode = audioContext.createStereoPanner();
        panNode.pan.value = pan;

        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(panNode);
        panNode.connect(masterGain);

        // Handle end
        source.onended = () => {
            onEnd?.();
        };

        // Play
        source.start(audioContext.currentTime + delay);

        return {
            source,
            gainNode,
            panNode,
            stop: () => source.stop(),
            setVolume: (v) => { gainNode.gain.value = v * masterVolume; },
            setPan: (p) => { panNode.pan.value = p; },
            setRate: (r) => { source.playbackRate.value = r; }
        };
    }

    /** Play sound with random pitch variation */
    function playVariant(name, options = {}) {
        const { pitchRange = 0.1, ...rest } = options;
        const rate = 1 + (Math.random() - 0.5) * pitchRange * 2;
        return play(name, { ...rest, rate });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BACKGROUND MUSIC
    // ═══════════════════════════════════════════════════════════════════════════

    /** Play background music with fade */
    function playMusic(name, options = {}) {
        if (!audioContext || isMuted) return null;

        const sound = sounds.get(name);
        if (!sound) {
            console.warn(`[NW_AUDIO] Music not found: ${name}`);
            return null;
        }

        const {
            volume = musicVolume,
            fadeIn = 1,
            crossfade = true
        } = options;

        // Stop current music
        if (currentMusic && crossfade) {
            stopMusic({ fadeOut: fadeIn });
        } else if (currentMusic) {
            currentMusic.source.stop();
        }

        // Create new music source
        const source = audioContext.createBufferSource();
        source.buffer = sound.decoded ? sound.buffer : sound.buffer;
        source.loop = true;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;

        source.connect(gainNode);
        gainNode.connect(masterGain);

        source.start();

        // Fade in
        gainNode.gain.linearRampToValueAtTime(
            volume * masterVolume,
            audioContext.currentTime + fadeIn
        );

        currentMusic = { source, gainNode, name, volume };

        return currentMusic;
    }

    /** Stop background music with fade */
    function stopMusic(options = {}) {
        if (!currentMusic) return;

        const { fadeOut = 1 } = options;
        const { gainNode, source } = currentMusic;

        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeOut);
        
        setTimeout(() => {
            source.stop();
        }, fadeOut * 1000);

        currentMusic = null;
    }

    /** Pause music */
    function pauseMusic() {
        if (audioContext) {
            audioContext.suspend();
        }
    }

    /** Resume music */
    function resumeMusic() {
        if (audioContext) {
            audioContext.resume();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VOLUME CONTROL
    // ═══════════════════════════════════════════════════════════════════════════

    function setMasterVolume(volume) {
        masterVolume = Math.max(0, Math.min(1, volume));
        if (masterGain) {
            masterGain.gain.value = isMuted ? 0 : masterVolume;
        }
        localStorage.setItem('nw_audio_volume', masterVolume.toString());
    }

    function getMasterVolume() {
        return masterVolume;
    }

    function setMusicVolume(volume) {
        musicVolume = Math.max(0, Math.min(1, volume));
        if (currentMusic) {
            currentMusic.gainNode.gain.value = musicVolume * masterVolume;
            currentMusic.volume = musicVolume;
        }
    }

    function setSfxVolume(volume) {
        sfxVolume = Math.max(0, Math.min(1, volume));
    }

    function mute() {
        isMuted = true;
        if (masterGain) masterGain.gain.value = 0;
        localStorage.setItem('nw_audio_muted', 'true');
    }

    function unmute() {
        isMuted = false;
        if (masterGain) masterGain.gain.value = masterVolume;
        localStorage.setItem('nw_audio_muted', 'false');
    }

    function toggleMute() {
        if (isMuted) unmute();
        else mute();
        return isMuted;
    }

    function getIsMuted() {
        return isMuted;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AUDIO SPRITES
    // ═══════════════════════════════════════════════════════════════════════════

    const sprites = new Map();

    /** Define audio sprite */
    function defineSprite(name, soundName, segments) {
        sprites.set(name, { soundName, segments });
    }

    /** Play sprite segment */
    function playSprite(spriteName, segmentName, options = {}) {
        const sprite = sprites.get(spriteName);
        if (!sprite) return null;

        const segment = sprite.segments[segmentName];
        if (!segment) return null;

        const sound = sounds.get(sprite.soundName);
        if (!sound || !audioContext) return null;

        const { start, duration } = segment;
        const source = audioContext.createBufferSource();
        source.buffer = sound.buffer;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = (options.volume || sfxVolume) * masterVolume;

        source.connect(gainNode);
        gainNode.connect(masterGain);

        source.start(audioContext.currentTime, start, duration);

        return source;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VISUALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    let analyzer = null;
    let analyzerData = null;

    function createAnalyzer() {
        if (!audioContext || analyzer) return analyzer;

        analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        masterGain.connect(analyzer);
        analyzerData = new Uint8Array(analyzer.frequencyBinCount);

        return analyzer;
    }

    function getFrequencyData() {
        if (!analyzer) createAnalyzer();
        if (!analyzer) return null;

        analyzer.getByteFrequencyData(analyzerData);
        return analyzerData;
    }

    function getAverageFrequency() {
        const data = getFrequencyData();
        if (!data) return 0;

        const sum = data.reduce((a, b) => a + b, 0);
        return sum / data.length;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRESETS - Common game sounds
    // ═══════════════════════════════════════════════════════════════════════════

    const presets = {
        // Generate oscillator-based sounds
        beep: (frequency = 440, duration = 0.1, type = 'sine') => {
            if (!audioContext) return;

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = type;
            oscillator.frequency.value = frequency;
            gainNode.gain.value = sfxVolume * masterVolume * 0.3;

            oscillator.connect(gainNode);
            gainNode.connect(masterGain);

            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
            oscillator.stop(audioContext.currentTime + duration);
        },

        click: () => presets.beep(800, 0.05, 'square'),
        success: () => {
            presets.beep(523, 0.1);
            setTimeout(() => presets.beep(659, 0.1), 100);
            setTimeout(() => presets.beep(784, 0.15), 200);
        },
        error: () => presets.beep(200, 0.2, 'sawtooth'),
        coin: () => {
            presets.beep(987, 0.05);
            setTimeout(() => presets.beep(1319, 0.1), 50);
        },
        powerUp: () => {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => presets.beep(400 + i * 100, 0.08), i * 50);
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════

    init();

    return {
        VERSION,
        
        // Loading
        load, loadAll,
        
        // SFX
        play, playVariant,
        
        // Music
        playMusic, stopMusic, pauseMusic, resumeMusic,
        
        // Volume
        setMasterVolume, getMasterVolume,
        setMusicVolume, setSfxVolume,
        mute, unmute, toggleMute, getIsMuted,
        
        // Sprites
        defineSprite, playSprite,
        
        // Visualization
        createAnalyzer, getFrequencyData, getAverageFrequency,
        
        // Presets
        presets,
        
        // Direct access
        get context() { return audioContext; },
        get isReady() { return !!audioContext; }
    };
})();

window.NW_AUDIO = NW_AUDIO;
