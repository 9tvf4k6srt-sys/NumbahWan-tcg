// =====================================================================
// MYTHIC FORGE - ULTRA PREMIUM CARD PULL EXPERIENCE
// Inspired by South Park: Phone Destroyer with NumbahWan Twist
// =====================================================================

// DEV_MODE flag - set to false for production
const DEV_MODE = false;

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 STUB FUNCTIONS - Replace missing external dependencies
// ═══════════════════════════════════════════════════════════════════════════
if (typeof NW_CORE === 'undefined') {
    window.NW_CORE = { throttle: (fn) => fn };
    console.log('[FORGE] NW_CORE stubbed');
}
// Early variable declarations (needed before updateUI calls)
var lastLogBalance = null;
var walletReady = false;

// NW_WALLET is now loaded from nw-wallet.js
// Initialize it when ready
if (typeof NW_WALLET !== 'undefined') {
    NW_WALLET.init().then(() => {
        console.log('[FORGE] NW_WALLET initialized, GM:', NW_WALLET.isGM);
        walletReady = true;
        updateUI();
    });
} else {
    console.warn('[FORGE] NW_WALLET not loaded!');
}
if (typeof NW_GUILD === 'undefined') {
    window.NW_GUILD = { getRarityColor: (r) => ({ mythic:'#ff00ff', legendary:'#ffd700', epic:'#a855f7', rare:'#3b82f6', uncommon:'#22c55e', common:'#888' }[r] || '#888') };
    console.log('[FORGE] NW_GUILD stubbed');
}
if (typeof PremiumAudio === 'undefined') {
    window.PremiumAudio = { play: () => {}, init: () => {} };
    console.log('[FORGE] PremiumAudio stubbed');
}
if (typeof NW_ANIM === 'undefined') {
    window.NW_ANIM = { 
        spring: () => {}, 
        animate: () => {}, 
        countTo: (el, val) => { if (el) el.textContent = val; },
        cssAnimate: () => {}
    };
    console.log('[FORGE] NW_ANIM stubbed');
}
if (typeof NW_JUICE === 'undefined') {
    window.NW_JUICE = { gacha: { anticipate: () => {} } };
    console.log('[FORGE] NW_JUICE stubbed');
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎵 PREMIUM GACHA AUDIO ENGINE - Casino-Grade Sound Design
// ═══════════════════════════════════════════════════════════════════════════
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let masterGain = null;
let reverbNode = null;

function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new AudioCtx();
            
            // Resume audio context (required for iOS)
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            
            // Master dynamics compressor for polish
            const comp = audioCtx.createDynamicsCompressor();
            comp.threshold.value = -20; comp.knee.value = 40; comp.ratio.value = 8;
            comp.attack.value = 0.002; comp.release.value = 0.15;
            
            // Master gain for volume control
            masterGain = audioCtx.createGain();
            masterGain.gain.value = 0.7;
            
            // Create reverb for spaciousness
            reverbNode = createReverb(audioCtx, 1.5, 2);
            
            // Chain: Source -> Compressor -> Reverb Mix -> Master -> Destination
            comp.connect(masterGain);
            masterGain.connect(audioCtx.destination);
            
            audioCtx.master = comp;
            audioCtx.masterGain = masterGain;
            
            console.log('[FORGE] 🔊 Audio context created, state:', audioCtx.state);
        } catch (e) {
            console.error('[FORGE] ❌ Audio init error:', e);
        }
    } else if (audioCtx.state === 'suspended') {
        // Resume if suspended
        audioCtx.resume().then(() => {
            console.log('[FORGE] 🔊 Audio resumed');
        });
    }
}

// Create impulse response reverb
function createReverb(ctx, duration, decay) {
    const length = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
        const channel = impulse.getChannelData(c);
        for (let i = 0; i < length; i++) {
            channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
}

// Create rich layered tone
function createTone(freq, type, gainVal, start, duration, dest, detune = 0) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(gainVal, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain).connect(dest);
    osc.start(start);
    osc.stop(start + duration + 0.1);
    return { osc, gain };
}

// Create noise burst (for impacts/swooshes)
function createNoise(duration, start, gainVal, dest, filter = null) {
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(gainVal, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    
    if (filter) {
        const filt = audioCtx.createBiquadFilter();
        filt.type = filter.type || 'lowpass';
        filt.frequency.value = filter.freq || 2000;
        filt.Q.value = filter.Q || 1;
        noise.connect(filt).connect(gain).connect(dest);
    } else {
        noise.connect(gain).connect(dest);
    }
    noise.start(start);
    return noise;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📳 HAPTIC FEEDBACK SYSTEM - Phone vibration patterns
// ═══════════════════════════════════════════════════════════════════════════
function haptic(pattern) {
    if (!navigator.vibrate) return;
    const patterns = {
        tap: [10],
        flip: [15, 30, 15],
        common: [20],
        uncommon: [25, 20, 25],
        rare: [30, 20, 30, 20, 30],
        epic: [50, 30, 50, 30, 50],
        legendary: [100, 50, 100, 50, 100, 50, 100],
        mythic: [200, 100, 200, 100, 200, 100, 200, 100, 300],
        impact: [80],
        shake: [50, 25, 50, 25, 50, 25, 50, 25, 50]
    };
    navigator.vibrate(patterns[pattern] || [20]);
}

// 📱 SCREEN SHAKE for epic moments - defined later in the file

// ═══════════════════════════════════════════════════════════════════════════
// 🔊 AUDIO SYSTEM - Using NW_AUDIO helper for better performance
// ═══════════════════════════════════════════════════════════════════════════

// Load all forge audio files through NW_AUDIO helper
const forgeAudioFiles = {
    anticipation: '/static/audio/gacha-anticipation.mp3',
    flip: '/static/audio/gacha-flip.mp3',
    common: '/static/audio/gacha-common.mp3',
    uncommon: '/static/audio/gacha-common.mp3',
    rare: '/static/audio/gacha-rare.mp3',
    epic: '/static/audio/gacha-epic.mp3',
    legendary: '/static/audio/gacha-legendary.mp3',
    mythic: '/static/audio/gacha-mythic.mp3',
    impact: '/static/audio/card-slam-heavy.mp3',
    select: '/static/audio/ui-select.mp3',
    // Battle sounds
    attack: '/static/audio/attack-slash.mp3',
    death: '/static/audio/card-death.mp3',
    draw: '/static/audio/card-draw.mp3',
    slam: '/static/audio/card-slam.mp3',
    tick: '/static/audio/countdown-tick.mp3',
    crit: '/static/audio/critical-hit.mp3',
    defeat: '/static/audio/defeat.mp3',
    energy: '/static/audio/energy-gain.mp3',
    fightStart: '/static/audio/fight-start.mp3',
    turnEnd: '/static/audio/turn-end.mp3',
    victory: '/static/audio/victory.mp3'
};

// Initialize audio when NW_AUDIO is ready
let audioLoaded = false;
async function initForgeAudio() {
    if (audioLoaded || typeof NW_AUDIO === 'undefined') return;
    try {
        await NW_AUDIO.loadAll(forgeAudioFiles);
        audioLoaded = true;
        console.log('[Forge Audio] ✅ Loaded all sounds via NW_AUDIO');
    } catch (e) {
        console.warn('[Forge Audio] Failed to load:', e);
    }
}

// Legacy wrapper for PremiumAudio - use synth sounds directly since NW_AUDIO not available
window.PremiumAudio = {
    initialized: false, // Set to false to force synth fallback
    init: () => initAudio(), // Use local audio init
    play: (name, vol = 1) => {
        // NW_AUDIO not available in standalone mode - use synth
        console.log('[PremiumAudio] play:', name, '(synth fallback)');
    },
    buffers: {} // Empty - so checks fail and synth is used
};

// ═══════════════════════════════════════════════════════════════════════════
// 🍎 iOS AUDIO UNLOCK - Must happen during user gesture!
// ═══════════════════════════════════════════════════════════════════════════
function unlockAudioForIOS() {
    console.log('[FORGE] 🔊 Unlocking audio for iOS...');
    
    // 1. Initialize NW_JUICE sound system (loads MP3 buffers)
    if (typeof NW_JUICE !== 'undefined' && NW_JUICE.sound) {
        NW_JUICE.sound.init().then(() => {
            console.log('[FORGE] ✅ NW_JUICE audio initialized');
            // Resume context if suspended
            if (NW_JUICE.sound.ctx && NW_JUICE.sound.ctx.state === 'suspended') {
                NW_JUICE.sound.ctx.resume().then(() => {
                    console.log('[FORGE] ✅ NW_JUICE AudioContext resumed');
                });
            }
        });
    }
    
    // 2. Also init local audio as fallback
    initForgeAudio();
    initAudio();
    
    // 3. Play a silent sound to fully unlock iOS audio
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log('[FORGE] ✅ Local AudioContext resumed');
        });
    }
}

// Initialize on first interaction - CRITICAL for iOS
document.addEventListener('click', unlockAudioForIOS, { once: true });
document.addEventListener('touchstart', unlockAudioForIOS, { once: true });
document.addEventListener('touchend', unlockAudioForIOS, { once: true });

// ═══════════════════════════════════════════════════════════════════════════
// 🎰 PREMIUM SOUND LIBRARY - Each rarity has unique audio identity
// Uses MP3 files when available, falls back to synth
// ═══════════════════════════════════════════════════════════════════════════
function playSound(type) {
    console.log('[FORGE] 🔊 playSound:', type, 'audioCtx:', !!audioCtx);
    
    // Always trigger haptic
    haptic(type);
    
    // Skip MP3 - go directly to synth since NW_AUDIO not available
    // (PremiumAudio is stubbed to force synth fallback)
    
    // Fallback to synth audio - init if needed
    if (!audioCtx) {
        try {
            initAudio();
        } catch (e) {
            console.log('[FORGE] ⚠️ Audio init failed:', e);
            return;
        }
    }
    if (!audioCtx) {
        console.log('[FORGE] ⚠️ No audio context available');
        return;
    }
    
    // Resume if suspended (iOS requirement)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;
    const dest = audioCtx.master || audioCtx.destination;
    
    // Trigger haptic with sound
    haptic(type);
    
    const sounds = {
        // ═══════════════════════════════════════════════════════════════════
        // PACK OPENING - Building anticipation
        // ═══════════════════════════════════════════════════════════════════
        anticipation: () => {
            // Magical shimmer buildup - like slot machine spinning up
            const freqs = [220, 330, 440, 550, 660, 770, 880];
            freqs.forEach((f, i) => {
                setTimeout(() => {
                    createTone(f, 'sine', 0.08, audioCtx.currentTime, 0.3, dest, Math.random() * 10 - 5);
                    createTone(f * 1.5, 'triangle', 0.04, audioCtx.currentTime, 0.2, dest, Math.random() * 20);
                }, i * 80);
            });
            // Subtle sub bass rumble
            createTone(60, 'sine', 0.15, now, 0.8, dest);
            // Sparkle noise
            createNoise(0.6, now + 0.2, 0.03, dest, { type: 'highpass', freq: 8000, Q: 0.5 });
        },
        
        // ═══════════════════════════════════════════════════════════════════
        // CARD FLIP - Satisfying whoosh
        // ═══════════════════════════════════════════════════════════════════
        flip: () => {
            // Whoosh sweep
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(2000, now + 0.15);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.25);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, now);
            filter.frequency.exponentialRampToValueAtTime(4000, now + 0.15);
            filter.frequency.exponentialRampToValueAtTime(1000, now + 0.25);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.connect(filter).connect(gain).connect(dest);
            osc.start(now); osc.stop(now + 0.35);
            // Air swoosh
            createNoise(0.2, now, 0.08, dest, { type: 'bandpass', freq: 3000, Q: 2 });
        },
        
        // ═══════════════════════════════════════════════════════════════════
        // COMMON REVEAL - Subtle but satisfying
        // ═══════════════════════════════════════════════════════════════════
        common: () => {
            // Soft bell chime - not disappointing, just calm
            const notes = [392, 523]; // G4, C5
            notes.forEach((f, i) => {
                createTone(f, 'sine', 0.1, now + i * 0.1, 0.4, dest);
                createTone(f * 2, 'triangle', 0.03, now + i * 0.1 + 0.05, 0.2, dest);
            });
            // Soft click
            createNoise(0.05, now, 0.05, dest, { type: 'highpass', freq: 2000 });
        },
        
        // ═══════════════════════════════════════════════════════════════════
        // UNCOMMON REVEAL - Slightly more exciting
        // ═══════════════════════════════════════════════════════════════════
        uncommon: () => {
            // Pleasant major chord arpeggio
            const notes = [392, 494, 587]; // G4, B4, D5
            notes.forEach((f, i) => {
                createTone(f, 'sine', 0.12, now + i * 0.08, 0.5, dest, i * 5);
                createTone(f * 2, 'triangle', 0.05, now + i * 0.08 + 0.02, 0.3, dest);
            });
            // Light sparkle
            createNoise(0.15, now + 0.1, 0.04, dest, { type: 'highpass', freq: 6000 });
        },
        
        // ═══════════════════════════════════════════════════════════════════
        // RARE REVEAL - Getting exciting!
        // ═══════════════════════════════════════════════════════════════════
        rare: () => {
            // Rising arpeggio with shimmer
            const notes = [392, 494, 587, 784]; // G4, B4, D5, G5
            notes.forEach((f, i) => {
                createTone(f, 'sine', 0.14, now + i * 0.07, 0.6, dest, Math.random() * 8);
                createTone(f * 1.5, 'triangle', 0.06, now + i * 0.07 + 0.02, 0.4, dest, Math.random() * 12);
                // Octave shimmer
                createTone(f * 2, 'sine', 0.03, now + i * 0.07 + 0.03, 0.3, dest);
            });
            // Bright burst
            createNoise(0.2, now + 0.15, 0.06, dest, { type: 'highpass', freq: 5000, Q: 1 });
            // Subtle sub hit
            createTone(80, 'sine', 0.1, now + 0.25, 0.3, dest);
        },
        
        // ═══════════════════════════════════════════════════════════════════
        // EPIC REVEAL - Dopamine rush!
        // ═══════════════════════════════════════════════════════════════════
        epic: () => {
            // Power chord with shimmer cascade
            const chordNotes = [294, 440, 587, 880]; // D4, A4, D5, A5
            chordNotes.forEach((f, i) => {
                createTone(f, 'sine', 0.15, now + i * 0.05, 0.8, dest, Math.random() * 10);
                createTone(f, 'triangle', 0.08, now + i * 0.05, 0.6, dest, Math.random() * 15 - 7);
                createTone(f * 2, 'sine', 0.04, now + i * 0.05 + 0.03, 0.4, dest);
            });
            // Sparkle cascade
            for (let i = 0; i < 5; i++) {
                createTone(1200 + i * 200, 'sine', 0.03, now + 0.3 + i * 0.06, 0.2, dest);
            }
            // Impact sub
            createTone(50, 'sine', 0.2, now + 0.15, 0.4, dest);
            createTone(100, 'sine', 0.1, now + 0.15, 0.3, dest);
            // Shimmer noise
            createNoise(0.3, now + 0.2, 0.08, dest, { type: 'highpass', freq: 4000 });
        },
        
        // ═══════════════════════════════════════════════════════════════════
        // LEGENDARY REVEAL - HYPE MODE! 🔥
        // ═══════════════════════════════════════════════════════════════════
        legendary: () => {
            // Epic fanfare - triumphant ascending progression
            const fanfare = [
                { notes: [294, 440, 587], time: 0 },      // D minor power
                { notes: [330, 494, 659], time: 0.15 },   // E minor 
                { notes: [392, 587, 784], time: 0.3 },    // G major - lift!
                { notes: [440, 659, 880], time: 0.45 }    // A major - triumph!
            ];
            fanfare.forEach(({ notes, time }) => {
                notes.forEach((f, i) => {
                    createTone(f, 'sine', 0.18, now + time, 0.9 - time * 0.5, dest, i * 3);
                    createTone(f, 'sawtooth', 0.05, now + time, 0.6, dest, i * 5);
                    createTone(f * 2, 'sine', 0.06, now + time + 0.02, 0.5, dest);
                });
            });
            // Golden shimmer cascade
            for (let i = 0; i < 8; i++) {
                createTone(1000 + i * 150, 'sine', 0.04, now + 0.5 + i * 0.04, 0.3, dest);
            }
            // IMPACT - chest thump
            createTone(40, 'sine', 0.35, now + 0.1, 0.5, dest);
            createTone(80, 'sine', 0.2, now + 0.1, 0.4, dest);
            // Bright explosion
            createNoise(0.4, now + 0.15, 0.12, dest, { type: 'highpass', freq: 3000, Q: 0.5 });
            // Tail shimmer
            createNoise(0.5, now + 0.5, 0.05, dest, { type: 'highpass', freq: 8000 });
        },
        
        // ═══════════════════════════════════════════════════════════════════
        // MYTHIC REVEAL - MAXIMUM HYPE! 🌟💎✨
        // ═══════════════════════════════════════════════════════════════════
        mythic: () => {
            // LEGENDARY ASCENSION - Multi-layered orchestral hit
            // Phase 1: Deep power chord (0-0.3s)
            const phase1 = [147, 220, 294, 440]; // D3, A3, D4, A4
            phase1.forEach((f, i) => {
                createTone(f, 'sine', 0.25, now, 1.2, dest, i * 2);
                createTone(f, 'sawtooth', 0.08, now, 0.8, dest, i * 4);
            });
            
            // Phase 2: Rising triumph (0.2-0.6s)
            const phase2 = [
                { notes: [330, 440, 659], time: 0.2 },
                { notes: [392, 523, 784], time: 0.35 },
                { notes: [440, 587, 880], time: 0.5 },
                { notes: [523, 659, 1047], time: 0.65 }  // Climax!
            ];
            phase2.forEach(({ notes, time }) => {
                notes.forEach((f, i) => {
                    createTone(f, 'sine', 0.2, now + time, 1.0 - time * 0.3, dest, i * 3);
                    createTone(f, 'triangle', 0.08, now + time, 0.7, dest, i * 5);
                    createTone(f * 2, 'sine', 0.05, now + time + 0.015, 0.4, dest);
                });
            });
            
            // Phase 3: Celestial shimmer (0.6s+)
            for (let i = 0; i < 12; i++) {
                const shimmerFreq = 1200 + i * 180 + Math.random() * 100;
                createTone(shimmerFreq, 'sine', 0.04, now + 0.7 + i * 0.03, 0.4, dest, Math.random() * 20);
            }
            
            // MEGA IMPACT - earthquake bass
            createTone(30, 'sine', 0.4, now + 0.1, 0.7, dest);
            createTone(60, 'sine', 0.3, now + 0.1, 0.5, dest);
            createTone(90, 'sine', 0.15, now + 0.15, 0.4, dest);
            
            // Second impact at climax
            createTone(35, 'sine', 0.35, now + 0.65, 0.6, dest);
            createTone(70, 'sine', 0.25, now + 0.65, 0.5, dest);
            
            // Explosion noise burst
            createNoise(0.5, now + 0.1, 0.15, dest, { type: 'lowpass', freq: 2000, Q: 1 });
            createNoise(0.6, now + 0.15, 0.1, dest, { type: 'highpass', freq: 3000 });
            
            // Magical sparkle rain
            for (let i = 0; i < 20; i++) {
                setTimeout(() => {
                    createTone(2000 + Math.random() * 2000, 'sine', 0.02, audioCtx.currentTime, 0.15, dest);
                }, 700 + i * 50);
            }
            
            // Tail reverb shimmer
            createNoise(0.8, now + 1.0, 0.04, dest, { type: 'highpass', freq: 6000 });
        },
        
        // ═══════════════════════════════════════════════════════════════════
        // IMPACT - Heavy bass thump for legendary+
        // ═══════════════════════════════════════════════════════════════════
        impact: () => {
            // Deep chest-thumping bass
            createTone(40, 'sine', 0.4, now, 0.4, dest);
            createTone(80, 'sine', 0.25, now, 0.3, dest);
            createTone(60, 'triangle', 0.1, now + 0.02, 0.25, dest);
            // Punch transient
            createNoise(0.08, now, 0.15, dest, { type: 'lowpass', freq: 500, Q: 2 });
        },
        
        // ═══════════════════════════════════════════════════════════════════
        // LEGACY - Keep 'reveal' working for backwards compatibility
        // ═══════════════════════════════════════════════════════════════════
        reveal: () => {
            sounds.rare(); // Default to rare sound
        }
    };
    
    sounds[type]?.();
}

// ═══════════════════════════════════════════════════════════════════════════
// CARD DATABASE - Loaded dynamically from NW_CARDS (cards-v2.json)
// Single source of truth for all 108 cards!
// ═══════════════════════════════════════════════════════════════════════════
let CARDS = [];
const IMAGE_BASE = '/static/images/cards/thumbs/'; // WebP thumbnails
const IMAGE_FULL = '/static/images/cards/'; // Full resolution

// DEV MODE: Generate sample cards using ACTUAL card images from the server
function generateSampleCards() {
    console.log('[FORGE] Generating sample cards with real images...');
    
    // Use actual existing images from the server
    const cardImages = {
        mythic: [
            '01-reggina-mythic.webp',
            'harlay-dog-of-war-mythic.webp',
            '01-reggina-mythic.webp',  // Repeat for variety
            'harlay-dog-of-war-mythic.webp'
        ],
        legendary: [
            '02-reggino-legendary.webp',
            'legendary-404.webp',
            'legendary-afk-luna.webp',
            'legendary-bigbrain.webp',
            'legendary-burnout.webp',
            'legendary-capslock.webp',
            '02-reggino-legendary.webp',
            'legendary-404.webp'
        ],
        epic: [
            'epic-onca.webp',
            'epic-panthera.webp',
            'epic-fenneko.webp',
            'epic-glimmer.webp',
            'epic-grimhelm.webp',
            'epic-hype.webp',
            'epic-mumbles.webp',
            'epic-snipe.webp',
            'epic-zephyra.webp',
            'epic-chonk.webp',
            'epic-drama-bomb.webp',
            'epic-rage-quit.webp'
        ],
        rare: [
            '27-elder-dragon.webp',
            'common-limited-banner.webp',
            'common-guild-chat.webp',
            'common-loot-pile.webp'
        ],
        uncommon: [
            'common-daily-login.webp',
            'common-free-summon.webp',
            'common-notification.webp',
            'common-spawn-point.webp'
        ],
        common: [
            'common-1star-review.webp',
            'common-afk-spot.webp',
            'common-auto-battle.webp',
            'common-charging-cable.webp',
            'common-connection-lost.webp',
            'common-cracked-phone.webp',
            'common-expired-coupon.webp',
            'common-loading-tip.webp',
            'common-maintenance-comp.webp',
            'common-newbie-zone.webp',
            'common-salt-shaker.webp',
            'common-skip-button.webp',
            'common-the-void.webp',
            'common-tiny-crown.webp',
            'common-unread-messages.webp',
            'common-wifi-1bar.webp'
        ]
    };
    
    const names = {
        mythic: ['RegginA', 'Harlay', 'Phoenix', 'Void Emperor'],
        legendary: ['Reggino', '404 Error', 'AFK Luna', 'Big Brain', 'Burnout', 'Capslock', 'Shadow', 'Titan'],
        epic: ['Onça', 'Panthera', 'Fenneko', 'Glimmer', 'Grimhelm', 'Hype', 'Mumbles', 'Snipe', 'Zephyra', 'Chonk', 'Drama Bomb', 'Rage Quit'],
        rare: ['Elder Dragon', 'Limited Banner', 'Guild Chat', 'Loot Pile'],
        uncommon: ['Daily Login', 'Free Summon', 'Notification', 'Spawn Point'],
        common: ['1-Star Review', 'AFK Spot', 'Auto Battle', 'Charging Cable', 'Connection Lost', 'Cracked Phone', 'Expired Coupon', 'Loading Tip', 'Maintenance', 'Newbie Zone', 'Salt Shaker', 'Skip Button', 'The Void', 'Tiny Crown', 'Unread Msgs', 'Wifi 1-Bar']
    };
    
    const cards = [];
    let id = 1;
    
    // Generate cards for each rarity using actual images
    ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'].forEach(rarity => {
        const images = cardImages[rarity];
        const nameList = names[rarity];
        const count = images.length;
        
        for (let i = 0; i < count; i++) {
            cards.push({
                id: id++,
                name: { en: nameList[i] || `${rarity} Card ${i+1}`, zh: nameList[i], th: nameList[i] },
                rarity: rarity,
                img: images[i],  // Use actual image filename
                desc: `A ${rarity} card`,
                role: 'fighter',
                category: 'character',
                gameStats: { atk: 10 + id, hp: 20 + id, cost: Math.ceil(id/10) },
                abilities: [],
                special: null
            });
        }
    });
    
    console.log('[FORGE] Generated', cards.length, 'cards with real images');
    return cards;
}

// Convert image filename to WebP thumbnail URL (20-40KB, FAST)
function getCardThumbUrl(img) {
    if (!img) return '/static/images/cards/placeholder.webp';
    // If already .webp, use as-is. Otherwise convert extension
    if (img.endsWith('.webp')) return IMAGE_BASE + img;
    return IMAGE_BASE + img.replace(/\.(png|jpg|jpeg)$/i, '.webp');
}

// Full resolution URL - NOW ALSO WEBP (50-100KB instead of 1-2MB!)
function getCardFullUrl(img) {
    if (!img) return '/static/images/cards/placeholder.webp';
    // If already .webp, use as-is. Otherwise convert extension
    if (img.endsWith('.webp')) return IMAGE_FULL + img;
    return IMAGE_FULL + img.replace(/\.(png|jpg|jpeg)$/i, '.webp');
}

// 🚀 PRELOAD CACHE - Store preloaded images for instant reveal
const preloadedImages = new Map();
let preloadQueue = [];
let isPreloading = false;

// Preload a single image and cache it
function preloadImage(url) {
    return new Promise((resolve) => {
        if (preloadedImages.has(url)) {
            resolve(preloadedImages.get(url));
            return;
        }
        const img = new Image();
        img.onload = () => {
            preloadedImages.set(url, img);
            resolve(img);
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

// Preload cards that will be revealed (call before reveal starts)
async function preloadRevealCards(cards) {
    const urls = cards.map(c => getCardThumbUrl(c.img));
    // Preload all thumbnails in parallel (fast, ~20-40KB each)
    await Promise.all(urls.map(url => preloadImage(url)));
}

// Background preload common cards when page loads
async function preloadCommonCards() {
    if (CARDS.length === 0) return;
    // Preload common/uncommon cards first (most likely to pull)
    const commonCards = CARDS.filter(c => ['common', 'uncommon', 'rare'].includes(c.rarity));
    for (const card of commonCards.slice(0, 30)) { // First 30
        await preloadImage(getCardThumbUrl(card.img));
    }
}

// Current set/season
let currentSet = 1;
const SET_FILES = {
    1: '/static/data/cards-v2.json',
    2: '/static/data/cards-s2.json'
};

// Switch forge set
async function switchForgeSet(setId) {
    if (setId === currentSet) return;
    
    currentSet = setId;
    
    // Update UI
    document.querySelectorAll('.set-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.set) === setId);
    });
    
    // Reload cards from new set
    await loadGachaCards(setId);
    
    // Show toast
    const setNames = { 1: 'Origins', 2: 'Hounds of War' };
    showToast(`Switched to ${setNames[setId]}!`, 'info');
    
    console.log(`[FORGE] Switched to Set ${setId}: ${CARDS.length} cards`);
}

// Load cards from central NW_CARDS system or specific set file
async function loadGachaCards(setId = 1) {
    try {
        // For set 2+, load directly from JSON file
        if (setId >= 2) {
            const response = await fetch(SET_FILES[setId] + '?v=' + Date.now());
            const data = await response.json();
            CARDS = data.cards.map(c => ({
                id: c.id,
                name: c.name,
                rarity: c.rarity,
                img: c.img,
                desc: c.description,
                role: c.role,
                category: c.category,
                gameStats: c.gameStats || null,
                abilities: c.abilities || [],
                special: c.special || null
            }));
            console.log(`[FORGE] Loaded ${CARDS.length} cards from Set ${setId}`);
            return CARDS;
        }
        
        // Set 1: Use NW_CARDS if available
        if (typeof NW_CARDS === 'undefined' || !NW_CARDS.init) {
            console.log('[FORGE] DEV MODE: Using sample cards');
            CARDS = generateSampleCards();
            console.log(`[FORGE] Loaded ${CARDS.length} sample cards`);
            return CARDS;
        }
        
        await NW_CARDS.init();
        const allCards = NW_CARDS.getAll();
        CARDS = allCards.map(c => ({
            id: c.id,
            name: { en: c.name, zh: c.name, th: c.name }, // Use same name for all langs
            rarity: c.rarity,
            img: c.img,
            desc: c.description,
            role: c.role,
            category: c.category,
            // Include full gameStats for card rendering
            gameStats: c.gameStats || null,
            abilities: c.abilities || [],
            special: c.special || null
        }));
        console.log(`Gacha loaded ${CARDS.length} cards from NW_CARDS`);
        return CARDS;
    } catch (err) {
        console.error('Failed to load cards for gacha:', err);
        // Fallback to sample cards
        CARDS = generateSampleCards();
        console.log(`[FORGE] Fallback: Loaded ${CARDS.length} sample cards`);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════════
// 🎰 ADDICTIVE GACHA DROP RATES - Psychological Optimization
// ═══════════════════════════════════════════════════════════════════
// MYTHIC:     0.01% (1 in 10,000) - Ultra chase card, whale bait
// LEGENDARY:  1.00% (1 in 100)    - Achievable goal, keeps hope alive  
// EPIC:       8.00% (1 in 12.5)   - Frequent dopamine, "almost there!"
// RARE:      20.00% (1 in 5)      - Satisfying progress feeling
// UNCOMMON:  35.00% (1 in 2.86)   - Base satisfaction layer
// COMMON:    35.99% (remainder)   - Filler, makes rares feel good
// ═══════════════════════════════════════════════════════════════════
const RATES = { 
    mythic: 0.0001,      // 0.01% - 1 in 10,000 pulls
    legendary: 0.01,     // 1.00% - 1 in 100 pulls
    epic: 0.08,          // 8.00% - 1 in 12.5 pulls
    rare: 0.20,          // 20.0% - 1 in 5 pulls
    uncommon: 0.35,      // 35.0% - Common satisfaction
    common: 0.3599       // 35.99% - Filler (ensures total = 100%)
};

// 🔥 PITY SYSTEM - Guarantees to prevent frustration & drive spending
const PITY = {
    mythic: { soft: 150, hard: 200 },    // Soft pity at 150, guaranteed at 200
    legendary: { soft: 50, hard: 80 },   // Soft pity at 50, guaranteed at 80
    epic: { soft: 15, hard: 25 }         // Soft pity at 15, guaranteed at 25
};

// 📈 SOFT PITY MULTIPLIERS - Rates increase as you approach hard pity
// Creates "I'm so close!" psychology
function getAdjustedRates(pityCounters) {
    const adjusted = { ...RATES };
    
    // Mythic soft pity - rate increases after 150 pulls
    if (pityCounters.mythic >= PITY.mythic.soft) {
        const pullsOverSoft = pityCounters.mythic - PITY.mythic.soft;
        const boost = Math.min(pullsOverSoft * 0.005, 0.25); // Up to 25% at hard pity
        adjusted.mythic = Math.min(RATES.mythic + boost, 1);
    }
    
    // Legendary soft pity - rate increases after 50 pulls
    if (pityCounters.legendary >= PITY.legendary.soft) {
        const pullsOverSoft = pityCounters.legendary - PITY.legendary.soft;
        const boost = Math.min(pullsOverSoft * 0.02, 0.60); // Up to 60% at hard pity
        adjusted.legendary = Math.min(RATES.legendary + boost, 1);
    }
    
    // Epic soft pity - rate increases after 15 pulls
    if (pityCounters.epic >= PITY.epic.soft) {
        const pullsOverSoft = pityCounters.epic - PITY.epic.soft;
        const boost = Math.min(pullsOverSoft * 0.05, 0.50); // Up to 50% at hard pity
        adjusted.epic = Math.min(RATES.epic + boost, 1);
    }
    
    // Hard pity guarantees
    if (pityCounters.mythic >= PITY.mythic.hard) adjusted.mythic = 1;
    if (pityCounters.legendary >= PITY.legendary.hard) adjusted.legendary = 1;
    if (pityCounters.epic >= PITY.epic.hard) adjusted.epic = 1;
    
    return adjusted;
}

// State
const TEST_MODE = false; // Set to true for infinite logs
let lang = 'en';
let selectedPulls = 1;
let currentIndex = 0;
let cardsToReveal = [];
let forgeState = { 
    pityCounter: 0,  // Legacy - kept for backwards compatibility
    totalPulls: 0, 
    recentCards: [], 
    collection: new Set(), 
    mythicsOwned: 0,
    // 🎰 Individual pity counters for addictive mechanics
    pity: {
        mythic: 0,      // Resets when mythic pulled
        legendary: 0,   // Resets when legendary+ pulled  
        epic: 0         // Resets when epic+ pulled
    },
    // 📊 Statistics for "almost there!" psychology
    stats: {
        totalMythics: 0,
        totalLegendaries: 0,
        totalEpics: 0,
        totalRares: 0,
        lastMythicPull: null,
        lastLegendaryPull: null,
        longestDryStreak: 0,
        currentStreak: 0  // Pulls since last epic+
    }
};
// walletReady declared at top of script

// =====================================================
// 🔧 GM MODE - Uses wallet GM system for testing
// =====================================================
// GM mode is activated via: NW_WALLET.activateGM("numbahwan-gm-2026")
// Or add ?gm=true to URL

function isGMMode() {
    return typeof NW_WALLET !== 'undefined' && NW_WALLET.isGM;
}

// Initialize wallet and load cards
setTimeout(async () => {
    // Wait for wallet
    if (typeof NW_WALLET !== 'undefined') {
        await NW_WALLET.init();
        walletReady = true;
        console.log('[FORGE] Wallet initialized, isGM:', NW_WALLET.isGM);
    }
    
    // Load cards
    if (CARDS.length === 0) {
        await loadGachaCards();
        console.log('[FORGE] Loaded', CARDS.length, 'cards');
    }
    
    // Update UI AFTER wallet is initialized (important for GM mode)
    setupModeUI();
    updateUI();
}, 100);

// UI setup - shows GM badge if in GM mode
function setupModeUI() {
    const isGM = isGMMode();
    
    const guestIdEl = document.getElementById('guestId');
    if (guestIdEl) {
        guestIdEl.innerHTML = isGM ? '<svg class="nw-icon" width="14" height="14" style="vertical-align:middle;"><use href="/static/icons/nw-icons.svg#crown"></use></svg> GM' : (NW_WALLET?.getGuestId()?.slice(0,10) || 'Guest');
    }
    
    const logsEl = document.getElementById('logBalance');
    if (logsEl) {
        logsEl.textContent = isGM ? '∞' : (NW_WALLET?.getBalance('wood') || 0).toLocaleString();
    }
    
    // Show GM badge
    const testBadge = document.getElementById('testBadge');
    if (testBadge && isGM) {
        testBadge.style.display = 'inline-flex';
        testBadge.innerHTML = '<svg class="nw-icon" width="14" height="14" style="vertical-align:middle;"><use href="/static/icons/nw-icons.svg#crown"></use></svg> GM MODE';
        testBadge.style.background = 'linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,107,0,0.2))';
        testBadge.style.border = '1px solid #ffd700';
        testBadge.style.color = '#ffd700';
    }
    
    console.log('[FORGE] UI updated, GM:', isGM);
}

// Call on multiple events to ensure it runs
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupModeUI);
} else {
    setupModeUI();
}

// Listen for GM mode changes (user activates/deactivates via console)
window.addEventListener('nw-gm-activated', () => {
    console.log('[FORGE] GM mode activated - updating UI');
    setupModeUI();
    updateUI();
});
window.addEventListener('nw-gm-deactivated', () => {
    console.log('[FORGE] GM mode deactivated - updating UI');
    setupModeUI();
    updateUI();
});
// DEV MODE only
function setupDevModeUI() {
    // Dev mode UI setup - only runs when DEV_MODE = true
    if (!DEV_MODE) return;
    console.log('[FORGE] Dev mode UI initialized');
}
// =====================================================

// GM MODE: Uses wallet-based GM system for infinite resources
// Activate GM mode: visit /wallet and enter code "numbahwan-gm-2026"
// Or add your Guest ID to GM_WHITELIST in nw-wallet.js

// Wait for wallet to be ready
window.addEventListener('nw-wallet-ready', (e) => {
    if (DEV_MODE) return; // Skip if dev mode
    walletReady = true;
    console.log('[FORGE] Wallet ready:', NW_WALLET.getGuestId());
    
    // Sync forge state from wallet
    const walletForge = NW_WALLET.getForgeState();
    if (walletForge.totalPulls > 0) {
        forgeState.pityCounter = walletForge.pityCounter;
        forgeState.totalPulls = walletForge.totalPulls;
    }
    forgeState.collection = new Set(NW_WALLET.getCollection());
    
    // Show guest ID
    const guestIdEl = document.getElementById('guestId');
    if (guestIdEl) guestIdEl.textContent = NW_WALLET.getGuestId();
    
    // Show GM status
    showGMStatus();
    
    loadState();
    updateUI();
});

function showGMStatus() {
    if (NW_WALLET.isGMMode()) {
        // Update test badge to show GM mode
        const testBadge = document.querySelector('.test-badge');
        if (testBadge) {
            testBadge.style.display = 'flex';
            testBadge.innerHTML = '<svg class="nw-icon" width="14" height="14" style="vertical-align:middle;"><use href="/static/icons/nw-icons.svg#crown"></use></svg> GM MODE';
            testBadge.style.background = 'linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,107,0,0.2))';
            testBadge.style.borderColor = '#ffd700';
            testBadge.style.color = '#ffd700';
            testBadge.style.animation = 'gmPulse 2s infinite';
        }
        
        // Add GM indicator to guest ID area
        const guestBar = document.querySelector('.guest-bar');
        if (guestBar && !document.getElementById('forgeGmBadge')) {
            const gmBadge = document.createElement('div');
            gmBadge.id = 'forgeGmBadge';
            gmBadge.innerHTML = '<svg class="nw-icon" width="14" height="14" style="vertical-align:middle;"><use href="/static/icons/nw-icons.svg#crown"></use></svg> INFINITE';
            gmBadge.style.cssText = `
                background: linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,107,0,0.2));
                border: 2px solid #ffd700;
                color: #ffd700;
                padding: 4px 12px;
                border-radius: 6px;
                font-family: 'Orbitron', sans-serif;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 1px;
                animation: gmPulse 2s infinite;
                margin-left: 10px;
            `;
            guestBar.appendChild(gmBadge);
        }
        
        // Add GM pulse animation if not exists
        if (!document.getElementById('gmPulseStyle')) {
            const style = document.createElement('style');
            style.id = 'gmPulseStyle';
            style.textContent = `
                @keyframes gmPulse {
                    0%, 100% { box-shadow: 0 0 10px rgba(255,215,0,0.3); }
                    50% { box-shadow: 0 0 25px rgba(255,215,0,0.6); }
                }
            `;
            document.head.appendChild(style);
        }
        
        console.log('%c[FORGE] GM MODE ACTIVE - Infinite Logs for testing!', 
            'background: linear-gradient(90deg, #ffd700, #ff6b00); color: black; font-weight: bold; padding: 8px;');
    }
}

// XP table for card progression
function getXPForRarity(rarity) {
    const XP_TABLE = { common: 10, uncommon: 20, rare: 50, epic: 100, legendary: 250, mythic: 500 };
    return XP_TABLE[rarity] || 10;
}

// Wallet-based currency operations (GM mode handled by wallet)
function getLogs() { 
    if (!walletReady || typeof NW_WALLET === 'undefined') return 0;
    // GM mode is handled in NW_WALLET.getBalance() - returns 999999 for GMs
    return NW_WALLET.getBalance('wood') || 0; 
}

function spendLogs(n, purpose = 'FORGE_PULL') {
    // GM mode - always allow
    if (isGMMode()) {
        console.log('[FORGE] GM Mode - free pull!');
        return true;
    }
    if (!walletReady || typeof NW_WALLET === 'undefined') return false;
    return NW_WALLET.spend('wood', n, purpose);
}

function addLogs(n, source = 'MYTHIC_BONUS') {
    if (!walletReady || typeof NW_WALLET === 'undefined') return;
    // GM mode is handled in NW_WALLET.earn() - no-op for GMs
    NW_WALLET.earn('wood', n, source);
}

// Forge State
function loadState() {
    try {
        const s = localStorage.getItem('nw_forge_state');
        if (s) { 
            const p = JSON.parse(s); 
            forgeState = { ...forgeState, ...p, collection: new Set(p.collection || []) }; 
        }
    } catch(e) {}
    updateUI();
}

function saveState() {
    localStorage.setItem('nw_forge_state', JSON.stringify({ ...forgeState, collection: Array.from(forgeState.collection) }));
    
    // Sync with secure wallet
    if (walletReady) {
        NW_WALLET.updateForge(forgeState.pityCounter, forgeState.totalPulls);
        // Sync collection
        forgeState.collection.forEach(cardId => NW_WALLET.addToCollection(cardId));
    }
}

// UI - Multi-Tier Pity Display
function updateUI() {
    const currentLogs = getLogs();
    const logEl = document.getElementById('logBalance');
    
    // \ud83c\udfae Animate log balance changes with NW_ANIM.countTo
    if (typeof NW_ANIM !== 'undefined' && lastLogBalance !== null && lastLogBalance !== currentLogs) {
        const diff = currentLogs - lastLogBalance;
        
        // Count animation
        NW_ANIM.countTo(logEl, currentLogs, {
            duration: 600,
            easing: 'easeOutCubic',
            separator: ','
        });
        
        // Pulse effect on change
        if (diff > 0) {
            logEl.style.color = '#22c55e'; // Green for gains
            NW_ANIM.cssAnimate(logEl, 'nw-pulse');
        } else {
            logEl.style.color = '#ef4444'; // Red for spend
        }
        setTimeout(() => logEl.style.color = '', 800);
    } else {
        logEl.textContent = currentLogs;
    }
    lastLogBalance = currentLogs;
    
    // 🎰 UPDATE ALL THREE PITY BARS
    // Mythic Pity (0-200, soft at 150)
    const mythicPity = forgeState.pity?.mythic || forgeState.pityCounter || 0;
    const mythicEl = document.getElementById('pityFillMythic');
    const mythicCountEl = document.getElementById('pityMythic');
    if (mythicEl) mythicEl.style.width = Math.min(100, (mythicPity / 200) * 100) + '%';
    if (mythicCountEl) mythicCountEl.textContent = mythicPity;
    
    // Legendary Pity (0-80, soft at 50)
    const legendaryPity = forgeState.pity?.legendary || 0;
    const legendaryEl = document.getElementById('pityFillLegendary');
    const legendaryCountEl = document.getElementById('pityLegendary');
    if (legendaryEl) legendaryEl.style.width = Math.min(100, (legendaryPity / 80) * 100) + '%';
    if (legendaryCountEl) legendaryCountEl.textContent = legendaryPity;
    
    // Epic Pity (0-25, soft at 15)
    const epicPity = forgeState.pity?.epic || 0;
    const epicEl = document.getElementById('pityFillEpic');
    const epicCountEl = document.getElementById('pityEpic');
    if (epicEl) epicEl.style.width = Math.min(100, (epicPity / 25) * 100) + '%';
    if (epicCountEl) epicCountEl.textContent = epicPity;
    
    // Highlight rows when close to pity
    document.querySelector('.mythic-pity')?.classList.toggle('close', mythicPity >= 150);
    document.querySelector('.legendary-pity')?.classList.toggle('close', legendaryPity >= 50);
    document.querySelector('.epic-pity')?.classList.toggle('close', epicPity >= 15);
    
    // Update displayed rates with soft pity boosts
    const rates = getAdjustedRates(forgeState.pity || { mythic: 0, legendary: 0, epic: 0 });
    const mythicRateEl = document.getElementById('mythicRate');
    if (mythicRateEl) mythicRateEl.textContent = (rates.mythic * 100).toFixed(2) + '%';
    
    const totalPullsEl = document.getElementById('totalPulls');
    if (totalPullsEl) totalPullsEl.textContent = forgeState.totalPulls;
    
    // Collection progress
    const collCountEl = document.getElementById('collectionCount');
    if (collCountEl && walletReady) {
        const owned = NW_WALLET.getCollection().length;
        collCountEl.textContent = owned;
    }
    const totalCardsEl = document.getElementById('totalCards');
    if (totalCardsEl) totalCardsEl.textContent = CARDS.length || 108;
    
    document.querySelectorAll('.pull-option').forEach(o => {
        // DEV MODE: Never disable options
        if (DEV_MODE) {
            o.classList.remove('disabled');
        } else {
            o.classList.toggle('disabled', getLogs() < parseInt(o.dataset.pulls));
        }
    });
    
    const badges = { 1: '1 CARD', 5: '6 CARDS', 10: '12 CARDS' };
    const packBadgeEl = document.getElementById('packBadge');
    if (packBadgeEl) packBadgeEl.textContent = badges[selectedPulls];
    
    renderHistory();
}

function renderHistory() {
    const grid = document.getElementById('historyGrid');
    const cards = forgeState.recentCards.slice(-5).reverse();
    grid.innerHTML = '';
    
    cards.forEach(c => {
        const thumbUrl = getCardThumbUrl(c.img);
        const wrapper = document.createElement('div');
        wrapper.className = `history-card ${c.rarity}`;
        
        // Use card renderer if available for mini framed cards
        if (typeof NW_CARD_RENDERER !== 'undefined') {
            const cardData = {
                id: c.id,
                name: c.name[lang] || c.name?.en || c.name,
                rarity: c.rarity,
                img: thumbUrl,
                gameStats: c.gameStats
            };
            const renderedCard = NW_CARD_RENDERER.render(cardData, { 
                size: 'sm',
                showStats: false, // Too small for stats
                showRarityBadge: false
            });
            wrapper.appendChild(renderedCard);
        } else {
            // Fallback to simple image
            const img = document.createElement('img');
            img.src = thumbUrl;
            img.alt = c.name?.en || '';
            img.onerror = () => { img.src = getCardFullUrl(c.img); };
            wrapper.appendChild(img);
        }
        grid.appendChild(wrapper);
    });
    
    // Fill remaining slots with empty placeholders
    for (let i = cards.length; i < 5; i++) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'history-card empty-slot';
        emptySlot.textContent = '?';
        grid.appendChild(emptySlot);
    }
}

function selectPull(el) {
    if (el.classList.contains('disabled')) return;
    document.querySelectorAll('.pull-option').forEach(o => o.classList.remove('active'));
    el.classList.add('active');
    selectedPulls = parseInt(el.dataset.pulls);
    
    // Update pack image based on selection
    const packImg = document.getElementById('packMainImg');
    if (packImg) {
        if (selectedPulls >= 10) {
            packImg.src = '/static/images/packs/pack-mega10.webp';
        } else if (selectedPulls >= 5) {
            packImg.src = '/static/images/packs/pack-multi5.webp';
        } else {
            packImg.src = '/static/images/packs/pack-single.webp';
        }
    }
    
    updateUI();
}

function toggleRates() {
    const g = document.getElementById('ratesGrid');
    const t = document.getElementById('ratesToggle');
    g.style.display = g.style.display === 'none' ? 'grid' : 'none';
    t.textContent = g.style.display === 'none' ? '▼' : '▲';
}

// 🎰 ADDICTIVE ROLL SYSTEM with Multi-Tier Pity
function rollRarity() {
    // Get adjusted rates based on current pity counters
    const rates = getAdjustedRates(forgeState.pity);
    
    // ═══════════════════════════════════════════════════
    // HARD PITY GUARANTEES - Prevents infinite frustration
    // ═══════════════════════════════════════════════════
    if (forgeState.pity.mythic >= PITY.mythic.hard) {
        console.log('🎉 MYTHIC HARD PITY TRIGGERED @ ' + forgeState.pity.mythic + ' pulls!');
        return 'mythic';
    }
    if (forgeState.pity.legendary >= PITY.legendary.hard) {
        console.log('⭐ LEGENDARY HARD PITY TRIGGERED @ ' + forgeState.pity.legendary + ' pulls!');
        return 'legendary';
    }
    if (forgeState.pity.epic >= PITY.epic.hard) {
        console.log('💜 EPIC HARD PITY TRIGGERED @ ' + forgeState.pity.epic + ' pulls!');
        return 'epic';
    }
    
    // ═══════════════════════════════════════════════════
    // WEIGHTED ROLL with Soft Pity Boosts
    // ═══════════════════════════════════════════════════
    const r = Math.random(); 
    let cumulative = 0;
    
    // Check Mythic (0.01% base, boosted after 150 pulls)
    cumulative += rates.mythic;
    if (r <= cumulative) return 'mythic';
    
    // Check Legendary (1% base, boosted after 50 pulls)
    cumulative += rates.legendary;
    if (r <= cumulative) return 'legendary';
    
    // Check Epic (8% base, boosted after 15 pulls)
    cumulative += rates.epic;
    if (r <= cumulative) return 'epic';
    
    // Check Rare (20%)
    cumulative += rates.rare;
    if (r <= cumulative) return 'rare';
    
    // Check Uncommon (35%)
    cumulative += rates.uncommon;
    if (r <= cumulative) return 'uncommon';
    
    // Common (35.99%)
    return 'common';
}

// 🔄 Update pity counters after a pull
function updatePityCounters(rarity) {
    const tierOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    const pulledTier = tierOrder.indexOf(rarity);
    
    // Always increment all pity counters first
    forgeState.pity.mythic++;
    forgeState.pity.legendary++;
    forgeState.pity.epic++;
    
    // Reset counters based on what was pulled
    if (rarity === 'mythic') {
        forgeState.pity.mythic = 0;
        forgeState.pity.legendary = 0;
        forgeState.pity.epic = 0;
        forgeState.stats.totalMythics++;
        forgeState.stats.lastMythicPull = forgeState.totalPulls;
        forgeState.stats.currentStreak = 0;
    } else if (rarity === 'legendary') {
        forgeState.pity.legendary = 0;
        forgeState.pity.epic = 0;
        forgeState.stats.totalLegendaries++;
        forgeState.stats.lastLegendaryPull = forgeState.totalPulls;
        forgeState.stats.currentStreak = 0;
    } else if (rarity === 'epic') {
        forgeState.pity.epic = 0;
        forgeState.stats.totalEpics++;
        forgeState.stats.currentStreak = 0;
    } else if (rarity === 'rare') {
        forgeState.stats.totalRares++;
        forgeState.stats.currentStreak++;
    } else {
        forgeState.stats.currentStreak++;
    }
    
    // Track longest dry streak (pulls without epic+)
    if (forgeState.stats.currentStreak > forgeState.stats.longestDryStreak) {
        forgeState.stats.longestDryStreak = forgeState.stats.currentStreak;
    }
    
    // Legacy compatibility
    forgeState.pityCounter = forgeState.pity.mythic;
}

function getCard(rarity) {
    console.log('[FORGE] getCard called, CARDS.length:', CARDS.length, 'rarity:', rarity);
    if (CARDS.length === 0) {
        console.error('[FORGE] ❌ CARDS array is empty! Generating sample cards...');
        CARDS = generateSampleCards();
    }
    const pool = CARDS.filter(c => c.rarity === rarity);
    console.log('[FORGE] Pool size for', rarity, ':', pool.length);
    if (pool.length === 0) {
        console.warn('[FORGE] No cards for rarity', rarity, ', using first card');
        return CARDS[0];
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

// ═══════════════════════════════════════════════════════════════════
// 🎰 SWIPE-TO-TEAR PACK OPENING SYSTEM
// Maximum anticipation and satisfaction!
// ═══════════════════════════════════════════════════════════════════
let packOpeningResolve = null;
let highestRarityInPack = 'common';
let swipeState = {
    active: false,
    startY: 0,
    currentY: 0,
    threshold: 150, // Pixels needed to tear
    progress: 0
};

// ========================================
// UNIFIED PACK SIZING - BIG SIZE
// Pack = Card = 80vw width
// ========================================
const PACK_CONFIG = {
    // BIG - 80% of viewport width
    WIDTH: '80vw',
    get HEIGHT() { return `calc(${this.WIDTH} * 1.4)`; },
    BORDER_RADIUS: '16px',
    // Pack images by card count
    getImage(cardCount) {
        if (cardCount >= 10) return '/static/images/packs/pack-mega10.webp';
        if (cardCount >= 5) return '/static/images/packs/pack-multi5.webp';
        return '/static/images/packs/pack-single.webp';
    }
};

// ═══════════════════════════════════════════════════════════════════
// 🎴 FLASH MASK TEAR SYSTEM - Based on South Park: Phone Destroyer
// The "tear" is actually:
// 1. One image split into TOP/BOTTOM using clip-path
// 2. A bright flash hides the transition
// 3. Both halves fly apart with rotation
// ═══════════════════════════════════════════════════════════════════

function createPackBag(cardCount, highestRarity) {
    console.log('[FORGE] Creating tearable pack for', cardCount, 'cards');
    
    const packEl = document.createElement('div');
    packEl.dataset.cardCount = cardCount;
    packEl.classList.add('pack-bag');
    
    const packImage = PACK_CONFIG.getImage(cardCount);
    
    // Container - same size as reveal card
    packEl.style.cssText = `
        position: relative;
        width: ${PACK_CONFIG.WIDTH};
        height: ${PACK_CONFIG.HEIGHT};
        cursor: grab;
        touch-action: none;
        user-select: none;
        background: transparent;
    `;
    
    // === TOP HALF (will fly up) ===
    const topHalf = document.createElement('div');
    topHalf.className = 'pack-half pack-top';
    topHalf.style.cssText = `
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: url('${packImage}') center/contain no-repeat;
        background-position: top center;
        clip-path: inset(0 0 50% 0);
        transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s;
        transform-origin: bottom center;
    `;
    
    // === BOTTOM HALF (will fly down) ===
    const bottomHalf = document.createElement('div');
    bottomHalf.className = 'pack-half pack-bottom';
    bottomHalf.style.cssText = `
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: url('${packImage}') center/contain no-repeat;
        background-position: bottom center;
        clip-path: inset(50% 0 0 0);
        transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s;
        transform-origin: top center;
    `;
    
    // === TEAR FLASH (hides the split moment) ===
    const tearFlash = document.createElement('div');
    tearFlash.className = 'pack-tear-flash';
    tearFlash.style.cssText = `
        position: absolute;
        top: 45%; left: -20%;
        width: 140%; height: 10%;
        background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(255,255,255,0.9) 20%,
            rgba(255,220,180,1) 50%,
            rgba(255,255,255,0.9) 80%,
            transparent 100%);
        opacity: 0;
        transform: scaleY(0);
        transition: opacity 0.15s, transform 0.15s;
        pointer-events: none;
        z-index: 10;
        filter: blur(8px);
    `;
    
    // === ENERGY LINE (the "rip" visual) ===
    const energyLine = document.createElement('div');
    energyLine.className = 'pack-energy-line';
    energyLine.style.cssText = `
        position: absolute;
        top: 48%; left: 0;
        width: 100%; height: 4%;
        background: linear-gradient(90deg,
            transparent 0%,
            #ff69b4 15%,
            #fff 30%,
            #ffff00 50%,
            #fff 70%,
            #ff69b4 85%,
            transparent 100%);
        opacity: 0;
        transform: scaleX(0);
        transition: transform 0.2s ease-out, opacity 0.3s;
        pointer-events: none;
        z-index: 11;
        box-shadow: 0 0 30px #ff69b4, 0 0 60px #ffff00;
    `;
    
    // === CARD COUNT LABEL ===
    const label = document.createElement('div');
    label.className = 'pack-count-label';
    label.style.cssText = `
        position: absolute;
        bottom: 10%;
        width: 100%;
        text-align: center;
        color: white;
        font-family: Orbitron, sans-serif;
        font-size: 20px;
        font-weight: bold;
        text-shadow: 0 2px 8px black, 0 0 20px black;
        pointer-events: none;
        z-index: 5;
    `;
    label.textContent = cardCount === 1 ? '1 CARD' : `${cardCount} CARDS`;
    
    // === SWIPE HINT ===
    const hint = document.createElement('div');
    hint.className = 'pack-swipe-hint';
    hint.style.cssText = `
        position: absolute;
        bottom: 5%;
        width: 100%;
        text-align: center;
        color: rgba(255,215,0,0.9);
        font-family: Orbitron, sans-serif;
        font-size: 14px;
        font-weight: bold;
        text-shadow: 0 2px 8px black;
        pointer-events: none;
        z-index: 5;
        animation: swipeHintPulse 1.5s infinite;
    `;
    hint.textContent = '← SWIPE →';
    
    packEl.appendChild(topHalf);
    packEl.appendChild(bottomHalf);
    packEl.appendChild(tearFlash);
    packEl.appendChild(energyLine);
    packEl.appendChild(label);
    packEl.appendChild(hint);
    
    console.log('[FORGE] Tearable pack created:', packImage);
    
    return packEl;
}

// Create box pack for 10 pulls (swipe up to open lid) - 3D BOX STYLE
function createPackBox(cardCount, highestRarity) {
    console.log('[FORGE] Creating 3D pack box for', cardCount, 'cards, rarity:', highestRarity);
    
    const packEl = document.createElement('div');
    packEl.dataset.cardCount = cardCount;
    packEl.classList.add('pack-box');
    
    // Calculate rarity glow
    let glowColor = 'rgba(255,107,0,0.6)';
    let glowSize = '30px';
    if (highestRarity === 'mythic') {
        glowColor = 'rgba(255,0,255,0.8)';
        glowSize = '50px';
    } else if (highestRarity === 'legendary') {
        glowColor = 'rgba(255,215,0,0.8)';
        glowSize = '40px';
    } else if (highestRarity === 'epic') {
        glowColor = 'rgba(168,85,247,0.8)';
        glowSize = '35px';
    }
    
    // 3D Box Container
    packEl.style.cssText = `
        position: relative;
        width: 240px;
        height: 180px;
        cursor: grab;
        touch-action: none;
        user-select: none;
        transform-style: preserve-3d;
        transform: rotateX(10deg);
        transition: transform 0.3s ease;
    `;
    
    // === LID (Top openable part) ===
    const lid = document.createElement('div');
    lid.className = 'pack-box-lid';
    lid.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 50px;
        background: linear-gradient(180deg, #ffd700 0%, #ff8c00 50%, #cc6600 100%);
        border-radius: 10px 10px 0 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: Orbitron, sans-serif;
        font-size: 14px;
        font-weight: bold;
        color: #1a0a30;
        letter-spacing: 2px;
        transform-origin: bottom center;
        transition: transform 0.4s ease;
        z-index: 10;
        border: 3px solid #ffcc00;
        box-shadow: 0 -2px 15px rgba(255,215,0,0.5), inset 0 2px 5px rgba(255,255,255,0.3);
        transform: translateZ(10px);
    `;
    lid.innerHTML = `
        <span style="text-shadow: 0 1px 2px rgba(0,0,0,0.3);"><svg class="nw-icon" width="14" height="14" style="vertical-align:middle;"><use href="/static/icons/nw-icons.svg#gift"></use></svg> MEGA BOX</span>
        <span style="font-size:9px;opacity:0.8;margin-top:2px;">↑ SWIPE UP ↑</span>
    `;
    
    // === 3D BOX BODY ===
    const body = document.createElement('div');
    body.className = 'pack-box-body';
    body.style.cssText = `
        position: absolute;
        top: 48px;
        left: 0;
        width: 100%;
        height: 132px;
        transform-style: preserve-3d;
    `;
    
    // Front face with art
    const front = document.createElement('div');
    front.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        background: url(/static/images/packs/pack-box-art.webp) center/cover no-repeat;
        border: 3px solid #ffd700;
        border-top: none;
        border-radius: 0 0 10px 10px;
        box-shadow: 
            0 15px 35px rgba(0,0,0,0.7),
            0 0 ${glowSize} ${glowColor},
            inset 0 0 25px rgba(255,215,0,0.1);
        overflow: hidden;
        transform: translateZ(10px);
    `;
    
    // Glossy overlay
    const gloss = document.createElement('div');
    gloss.style.cssText = `
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.15) 100%);
        border-radius: 0 0 10px 10px;
        pointer-events: none;
    `;
    front.appendChild(gloss);
    
    // Right edge (3D depth)
    const rightEdge = document.createElement('div');
    rightEdge.style.cssText = `
        position: absolute;
        top: 0;
        right: -10px;
        width: 10px;
        height: 100%;
        background: linear-gradient(90deg, #2d1050 0%, #1a0a30 100%);
        border: 2px solid #cc9900;
        border-left: none;
        border-radius: 0 6px 6px 0;
        transform: rotateY(90deg);
        transform-origin: left center;
    `;
    
    // Bottom edge (3D depth)
    const bottomEdge = document.createElement('div');
    bottomEdge.style.cssText = `
        position: absolute;
        bottom: -10px;
        left: 0;
        width: 100%;
        height: 10px;
        background: linear-gradient(180deg, #1a0a30 0%, #0d0515 100%);
        border: 2px solid #cc9900;
        border-top: none;
        border-radius: 0 0 6px 6px;
        transform: rotateX(-90deg);
        transform-origin: top center;
    `;
    
    // Card count badge
    const badge = document.createElement('div');
    badge.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: linear-gradient(135deg, #ff6b00, #ffd700);
        color: #000;
        font-weight: 900;
        font-size: 14px;
        padding: 5px 10px;
        border-radius: 12px;
        font-family: Orbitron, sans-serif;
        box-shadow: 0 4px 15px rgba(255,107,0,0.8);
        border: 2px solid rgba(255,255,255,0.5);
        z-index: 5;
        transform: translateZ(15px);
    `;
    badge.textContent = '×' + cardCount;
    
    body.appendChild(front);
    body.appendChild(rightEdge);
    body.appendChild(bottomEdge);
    body.appendChild(badge);
    packEl.appendChild(lid);
    packEl.appendChild(body);
    
    console.log('[FORGE] Pack box created');
    return packEl;
}

// Create pack - ALWAYS use bag style, just thicker for more cards
function createPack3D(cardCount, highestRarity) {
    // Always use bag - add 'pack-thick' class for 10+ cards for realistic thickness
    const pack = createPackBag(cardCount, highestRarity);
    
    if (cardCount >= 10) {
        pack.classList.add('pack-thick');
        
        // Add visual card stack indicator for thick packs
        const stackIndicator = document.createElement('div');
        stackIndicator.className = 'pack-stack-indicator';
        // Show 5-6 mini cards stacked
        for (let i = 0; i < Math.min(6, Math.ceil(cardCount / 2)); i++) {
            const miniCard = document.createElement('div');
            miniCard.className = 'pack-stack-card';
            stackIndicator.appendChild(miniCard);
        }
        pack.querySelector('.pack-bag-body')?.appendChild(stackIndicator);
    }
    
    return pack;
}

async function showPackOpening(cards) {
    console.log('[FORGE] showPackOpening called with', cards.length, 'cards');
    return new Promise((resolve) => {
        packOpeningResolve = resolve;
        
        // Determine highest rarity for glow effect
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
        highestRarityInPack = cards.reduce((highest, card) => {
            return rarityOrder.indexOf(card.rarity) > rarityOrder.indexOf(highest) 
                ? card.rarity : highest;
        }, 'common');
        
        console.log('[FORGE] Highest rarity:', highestRarityInPack);
        
        const overlay = document.getElementById('packOverlay');
        const container = document.getElementById('packContainer');
        const instruction = document.getElementById('packInstruction');
        const progressBar = document.getElementById('swipeProgress');
        
        console.log('[FORGE] Elements found:', { overlay: !!overlay, container: !!container, instruction: !!instruction, progressBar: !!progressBar });
        
        // Clear previous pack
        container.innerHTML = '';
        instruction.classList.remove('hidden');
        
        // Update instruction text based on pack type
        const swipeText = instruction.querySelector('.swipe-text');
        if (cards.length > 6) {
            swipeText.innerHTML = '<svg class="nw-icon" width="14" height="14"><use href="/static/icons/nw-icons.svg#arrow-up"></use></svg> SWIPE UP TO OPEN <svg class="nw-icon" width="14" height="14"><use href="/static/icons/nw-icons.svg#arrow-up"></use></svg>';
        } else {
            swipeText.innerHTML = '<svg class="nw-icon" width="14" height="14"><use href="/static/icons/nw-icons.svg#arrow-left"></use></svg> SWIPE TO TEAR <svg class="nw-icon" width="14" height="14"><use href="/static/icons/nw-icons.svg#arrow-right"></use></svg>';
        }
        
        // Create and add new pack
        const pack = createPack3D(cards.length, highestRarityInPack);
        console.log('[FORGE] Created pack element:', pack.className);
        container.appendChild(pack);
        
        // Show overlay
        overlay.classList.add('show');
        console.log('[FORGE] Overlay shown');
        
        // Play anticipation sound on show
        if (typeof NW_JUICE !== 'undefined') {
            NW_JUICE.sound.play('anticipation');
        } else if (typeof PremiumAudio !== 'undefined') {
            PremiumAudio.play('anticipation');
        }
        
        // Setup swipe handlers
        setupSwipeHandlers(pack, cards, progressBar);
        console.log('[FORGE] Swipe handlers setup complete');
    });
}

// Setup swipe-to-tear handlers
// BAG: Swipe LEFT or RIGHT to tear seal sideways
// BOX: Swipe UP to open lid
function setupSwipeHandlers(packEl, cards, progressBar) {
    const isBox = packEl.classList.contains('pack-box');
    let opened = false;
    
    // Reset swipe state - track both X and Y for different gestures
    swipeState = {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        threshold: isBox ? 100 : 120, // Sideways needs less distance
        progress: 0,
        direction: 0 // -1 = left, 1 = right
    };
    
    // \ud83c\udfae Use NW_CORE.throttle for buttery smooth 60fps swipe updates
    const throttledVisualUpdate = typeof NW_CORE !== 'undefined' 
        ? NW_CORE.throttle(updateSwipeVisuals, 16) // ~60fps
        : updateSwipeVisuals;
    
    function updateSwipeVisuals() {
        if (!swipeState.active || opened) return;
        
        // Update progress bar
        const progressFill = document.getElementById('swipeProgressFill');
        progressFill.style.width = (swipeState.progress * 100) + '%';
        
        // Visual feedback during swipe
        if (isBox) {
            const lid = packEl.querySelector('.pack-box-lid');
            if (lid) {
                lid.style.transform = `rotateX(${-swipeState.progress * 120}deg)`;
            }
        } else {
            // Flash Mask system: show energy line building up
            const energyLine = packEl.querySelector('.pack-energy-line');
            const topHalf = packEl.querySelector('.pack-top');
            const bottomHalf = packEl.querySelector('.pack-bottom');
            
            // Subtle squash effect during swipe
            const squash = 1 + swipeState.progress * 0.05;
            packEl.style.transform = `scaleY(${squash}) scaleX(${2 - squash})`;
            
            // Energy line grows with progress
            if (energyLine && swipeState.progress > 0.5) {
                const lineProgress = (swipeState.progress - 0.5) * 2; // 0-1 in last half
                energyLine.style.opacity = lineProgress * 0.7;
                energyLine.style.transform = `scaleX(${lineProgress})`;
            }
            
            // Halves start to separate slightly at high progress
            if (swipeState.progress > 0.7) {
                const sep = (swipeState.progress - 0.7) * 20;
                if (topHalf) topHalf.style.transform = `translateY(${-sep}px)`;
                if (bottomHalf) bottomHalf.style.transform = `translateY(${sep}px)`;
            }
        }
        
        // Shake effect - use NW_ANIM if available for smoother shake
        if (swipeState.progress > 0.3) {
            const shakeX = (Math.random() - 0.5) * swipeState.progress * 8;
            const shakeY = (Math.random() - 0.5) * swipeState.progress * 4;
            packEl.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
        }
        
        // Rarity glow hint
        if (swipeState.progress > 0.7 && ['mythic', 'legendary', 'epic'].includes(highestRarityInPack)) {
            packEl.classList.add('glow-' + highestRarityInPack);
        }
    }
    
    const handleStart = (e) => {
        if (opened) return;
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        swipeState.active = true;
        swipeState.startX = touch.clientX;
        swipeState.startY = touch.clientY;
        swipeState.direction = 0;
        progressBar.classList.add('active');
        
        // Start subtle shake
        packEl.classList.add('shaking');
        haptic('tap');
    };
    
    const handleMove = (e) => {
        if (!swipeState.active || opened) return;
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        swipeState.currentX = touch.clientX;
        swipeState.currentY = touch.clientY;
        
        let delta;
        if (isBox) {
            delta = swipeState.startY - swipeState.currentY;
        } else {
            const deltaX = swipeState.currentX - swipeState.startX;
            delta = Math.abs(deltaX);
            swipeState.direction = deltaX > 0 ? 1 : -1;
        }
        
        swipeState.progress = Math.max(0, Math.min(1, delta / swipeState.threshold));
        
        // \ud83c\udfae Throttled visual updates for butter-smooth 60fps
        throttledVisualUpdate();
        
        // Haptic at milestones (not throttled - needs to be responsive)
        if (swipeState.progress > 0.5 && swipeState.progress < 0.55) haptic('flip');
        if (swipeState.progress > 0.8 && swipeState.progress < 0.85) haptic('impact');
    };
    
    const handleEnd = (e) => {
        if (!swipeState.active || opened) return;
        e.preventDefault();
        swipeState.active = false;
        packEl.classList.remove('shaking');
        progressBar.classList.remove('active');
        packEl.style.transform = '';
        
        // If progress reached threshold, TEAR OPEN!
        if (swipeState.progress >= 0.9) {
            opened = true;
            tearOpenPack(packEl, cards, isBox);
        } else {
            // Snap back
            resetPackVisual(packEl, isBox);
            document.getElementById('swipeProgressFill').style.width = '0%';
            packEl.classList.remove('glow-mythic', 'glow-legendary', 'glow-epic');
        }
    };
    
    // Touch events
    packEl.addEventListener('touchstart', handleStart, { passive: false });
    packEl.addEventListener('touchmove', handleMove, { passive: false });
    packEl.addEventListener('touchend', handleEnd, { passive: false });
    
    // Mouse events (for desktop testing)
    packEl.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    
    // Also allow tap/click to open (accessibility)
    packEl.addEventListener('click', () => {
        if (!opened && swipeState.progress < 0.5) {
            // Quick tap animation then open
            opened = true;
            packEl.classList.add('shaking');
            swipeState.direction = Math.random() > 0.5 ? 1 : -1; // Random direction for tap
            setTimeout(() => tearOpenPack(packEl, cards, isBox), 500);
        }
    });
}

function resetPackVisual(packEl, isBox) {
    packEl.style.transform = '';
    if (isBox) {
        const lid = packEl.querySelector('.pack-box-lid');
        if (lid) lid.style.transform = '';
    } else {
        // Reset Flash Mask elements
        const topHalf = packEl.querySelector('.pack-top');
        const bottomHalf = packEl.querySelector('.pack-bottom');
        const energyLine = packEl.querySelector('.pack-energy-line');
        
        if (topHalf) topHalf.style.transform = '';
        if (bottomHalf) bottomHalf.style.transform = '';
        if (energyLine) {
            energyLine.style.opacity = '0';
            energyLine.style.transform = 'scaleX(0)';
        }
    }
}

async function tearOpenPack(packEl, cards, isBox) {
    console.log('[FORGE] 🎴 tearOpenPack START - isBox:', isBox, 'cards:', cards.length);
    const instruction = document.getElementById('packInstruction');
    instruction.classList.add('hidden');
    
    // TEAR SOUND + HAPTIC - Use NW_JUICE if available
    if (typeof NW_JUICE !== 'undefined') {
        NW_JUICE.sound.play('impact_heavy');
        NW_JUICE.screen.shake('medium');
        NW_JUICE.haptic.heavy();
    } else {
        PremiumAudio.play('impact');
        haptic('impact');
        screenShake(8, 300);
    }
    
    if (isBox) {
        // === BOX OPENING - Lid pops off realistically ===
        packEl.classList.add('opening');
        const lid = packEl.querySelector('.pack-box-lid');
        
        if (lid) {
            // Phase 1: Lid pops up with bounce
            lid.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            lid.style.transform = 'translateZ(50px) rotateX(-30deg) translateY(-20px)';
            
            await sleep(150);
            if (typeof NW_JUICE !== 'undefined') NW_JUICE.sound.play('flip');
            else PremiumAudio.play('flip');
            
            // Phase 2: Lid flies off and spins away
            lid.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            const flyDir = Math.random() > 0.5 ? 1 : -1;
            lid.style.transform = `translateX(${flyDir * 200}px) translateY(-150px) translateZ(100px) rotateX(-90deg) rotateZ(${flyDir * 30}deg) scale(0.6)`;
            lid.style.opacity = '0';
            
            await sleep(200);
        }
    } else {
        // === FLASH MASK TEAR - South Park: Phone Destroyer style ===
        const dir = swipeState.direction || (Math.random() > 0.5 ? 1 : -1);
        
        // Get the halves
        const topHalf = packEl.querySelector('.pack-top');
        const bottomHalf = packEl.querySelector('.pack-bottom');
        const tearFlash = packEl.querySelector('.pack-tear-flash');
        const energyLine = packEl.querySelector('.pack-energy-line');
        
        // === PHASE 1: SQUASH & ANTICIPATION (150ms) ===
        packEl.style.transition = 'transform 0.15s ease-out';
        packEl.style.transform = 'scaleY(1.08) scaleX(0.96)';
        await sleep(150);
        
        // === PHASE 2: THE FLASH (hides the split) ===
        if (typeof NW_JUICE !== 'undefined') NW_JUICE.sound.play('flip');
        else PremiumAudio.play('flip');
        
        // Trigger flash and energy line
        if (tearFlash) {
            tearFlash.style.opacity = '1';
            tearFlash.style.transform = 'scaleY(3)';
        }
        if (energyLine) {
            energyLine.style.opacity = '1';
            energyLine.style.transform = 'scaleX(1.2)';
        }
        
        // Screen flash
        screenFlash('#fff', 0.6);
        haptic('impact');
        
        await sleep(80);
        
        // === PHASE 3: THE SPLIT (halves fly apart) ===
        packEl.style.transform = '';
        
        if (topHalf) {
            topHalf.style.transform = `translateY(-120%) rotate(${-dir * 12}deg) scale(0.7)`;
            topHalf.style.opacity = '0';
        }
        if (bottomHalf) {
            bottomHalf.style.transform = `translateY(120%) rotate(${dir * 12}deg) scale(0.7)`;
            bottomHalf.style.opacity = '0';
        }
        
        // Fade the flash
        if (tearFlash) {
            tearFlash.style.transition = 'opacity 0.3s';
            tearFlash.style.opacity = '0';
        }
        if (energyLine) {
            energyLine.style.transition = 'opacity 0.3s';
            energyLine.style.opacity = '0';
        }
        
        // Create bokeh particles from center
        createTearParticles(packEl, dir);
        
        // Hide the count label
        const countLabel = packEl.querySelector('.pack-count-label');
        if (countLabel) countLabel.style.opacity = '0';
        
        await sleep(300);
    }
    
    // Rarity glow
    if (['mythic', 'legendary', 'epic'].includes(highestRarityInPack)) {
        packEl.classList.add('glow-' + highestRarityInPack);
        if (highestRarityInPack === 'mythic') {
            screenFlash('#ff00ff');
            haptic('mythic');
        } else if (highestRarityInPack === 'legendary') {
            screenFlash('#ffd700');
            haptic('legendary');
        }
    }
    
    // Create burst particles
    console.log('[FORGE] 🎴 Creating burst particles...');
    createPackParticles(highestRarityInPack);
    
    // Cards fly out preview
    console.log('[FORGE] 🎴 Waiting 400ms before flying cards...');
    await sleep(400);
    console.log('[FORGE] 🎴 Showing cards flying...');
    await showCardsFlying(packEl, cards);
    
    // Transition to reveal
    console.log('[FORGE] 🎴 Waiting 600ms before reveal...');
    await sleep(600);
    
    console.log('[FORGE] 🎴 Removing pack overlay, showing reveal...');
    document.getElementById('packOverlay').classList.remove('show');
    document.getElementById('tearEffect').classList.remove('active', 'tearing');
    
    await sleep(400);
    
    // Cleanup - reset all elements for next time
    const topHalf = packEl.querySelector('.pack-top');
    const bottomHalf = packEl.querySelector('.pack-bottom');
    const tearFlash = packEl.querySelector('.pack-tear-flash');
    const energyLine = packEl.querySelector('.pack-energy-line');
    const countLabel = packEl.querySelector('.pack-count-label');
    const lid = packEl.querySelector('.pack-box-lid');
    
    [topHalf, bottomHalf].forEach(el => {
        if (el) {
            el.style.transition = '';
            el.style.transform = '';
            el.style.opacity = '';
        }
    });
    if (tearFlash) {
        tearFlash.style.transition = '';
        tearFlash.style.transform = 'scaleY(0)';
        tearFlash.style.opacity = '0';
    }
    if (energyLine) {
        energyLine.style.transition = '';
        energyLine.style.transform = 'scaleX(0)';
        energyLine.style.opacity = '0';
    }
    if (countLabel) countLabel.style.opacity = '';
    if (lid) {
        lid.style.transition = '';
        lid.style.transform = '';
        lid.style.opacity = '';
    }
    packEl.style.transform = '';
    packEl.classList.remove('opening', 'tearing', 'glow-mythic', 'glow-legendary', 'glow-epic');
    
    if (packOpeningResolve) {
        packOpeningResolve();
        packOpeningResolve = null;
    }
}

// Create bokeh particles when pack tears (South Park style)
function createTearParticles(packEl, direction) {
    const rect = packEl.getBoundingClientRect();
    const centerY = rect.top + rect.height * 0.5; // Center tear line
    const centerX = rect.left + rect.width / 2;
    
    // Mix of white bokeh + colored sparks
    const particleCount = 15 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        const isBokeh = Math.random() > 0.4;
        const size = isBokeh ? (8 + Math.random() * 16) : (3 + Math.random() * 6);
        
        // Start along the tear line
        const startX = centerX + (Math.random() - 0.5) * rect.width;
        const startY = centerY + (Math.random() - 0.5) * 30;
        
        // Colors: white bokeh or pink/yellow sparks
        const colors = isBokeh 
            ? ['rgba(255,255,255,0.9)', 'rgba(255,240,200,0.8)', 'rgba(255,200,255,0.7)']
            : ['#ff69b4', '#ffff00', '#fff', '#ff00ff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        particle.style.cssText = `
            position: fixed;
            left: ${startX}px;
            top: ${startY}px;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50%;
            z-index: 10001;
            pointer-events: none;
            opacity: 1;
            ${isBokeh ? `box-shadow: 0 0 ${size}px ${color};` : ''}
        `;
        document.body.appendChild(particle);
        
        // Fly outward from center
        const angle = (Math.random() - 0.5) * Math.PI; // -90 to +90 degrees
        const distance = 80 + Math.random() * 150;
        const flyX = Math.cos(angle) * distance;
        const flyY = Math.sin(angle) * distance - 50; // Bias upward
        const duration = 0.5 + Math.random() * 0.4;
        
        particle.style.transition = `all ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
        
        requestAnimationFrame(() => {
            particle.style.transform = `translate(${flyX}px, ${flyY}px) scale(${isBokeh ? 0.3 : 0})`;
            particle.style.opacity = '0';
        });
        
        setTimeout(() => particle.remove(), duration * 1000 + 100);
    }
}

async function showCardsFlying(packEl, cards) {
    const rect = packEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < Math.min(cards.length, 6); i++) {
        const card = cards[i];
        
        setTimeout(() => {
            const cardEl = document.createElement('div');
            cardEl.className = 'flying-card';
            cardEl.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                width: 80px;
                height: 112px;
                background: url('${getCardThumbUrl(card.img)}') center/cover, linear-gradient(135deg, #2d1050, #1a0a30);
                border-radius: 6px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.5), 0 0 20px ${getRarityColor(card.rarity)};
                z-index: ${10000 + i};
                transform: translate(-50%, -50%) scale(0) rotateY(180deg);
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            `;
            document.body.appendChild(cardEl);
            
            if (typeof NW_JUICE !== 'undefined') NW_JUICE.sound.play('flip');
            else PremiumAudio.play('flip');
            
            // \ud83c\udfae Use NW_ANIM spring physics for buttery card flying
            const angle = (i / Math.min(cards.length, 6)) * Math.PI * 0.6 - Math.PI * 0.3;
            const distance = 120 + i * 15;
            const targetX = Math.sin(angle) * distance;
            const targetY = -80 - i * 10;
            
            if (typeof NW_ANIM !== 'undefined') {
                cardEl.style.opacity = '1';
                NW_ANIM.spring(cardEl, 'transform', `translate(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px)) scale(1) rotateY(0)`, {
                    stiffness: 150 + i * 20,
                    damping: 12,
                    mass: 0.8
                });
            } else {
                requestAnimationFrame(() => {
                    cardEl.style.transform = `translate(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px)) scale(1) rotateY(0)`;
                    cardEl.style.opacity = '1';
                });
            }
            
            setTimeout(() => cardEl.remove(), 700);
        }, i * 80);
    }
}

// Old openPack3D removed - replaced by swipe-to-tear system above

function createPackParticles(rarity) {
    const colors = {
        mythic: ['#ff00ff', '#00ffff', '#ffff00', '#ffffff'],
        legendary: ['#ffd700', '#ff6b00', '#ffff00'],
        epic: ['#a855f7', '#c084fc', '#e879f9'],
        rare: ['#3b82f6', '#60a5fa'],
        uncommon: ['#22c55e'],
        common: ['#9ca3af']
    };
    
    const particleColors = colors[rarity] || colors.common;
    const particleCount = rarity === 'mythic' ? 50 : rarity === 'legendary' ? 35 : 20;
    const container = document.getElementById('packParticles');
    
    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        const color = particleColors[Math.floor(Math.random() * particleColors.length)];
        const size = 4 + Math.random() * 8;
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 200;
        const duration = 600 + Math.random() * 400;
        
        p.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50%;
            box-shadow: 0 0 ${size * 2}px ${color};
            transform: translate(-50%, -50%);
            animation: particleFly ${duration}ms ease-out forwards;
            --fly-x: ${Math.cos(angle) * distance}px;
            --fly-y: ${Math.sin(angle) * distance}px;
        `;
        container.appendChild(p);
        
        setTimeout(() => p.remove(), duration);
    }
}

function getRarityColor(rarity) {
    // 🎮 Use NW_GUILD if available
    if (typeof NW_GUILD !== 'undefined') {
        return NW_GUILD.getRarityColor(rarity);
    }
    // Fallback
    const colors = {
        mythic: '#ff00ff',
        legendary: '#ffd700',
        epic: '#a855f7',
        rare: '#3b82f6',
        uncommon: '#22c55e',
        common: '#71717a'
    };
    return colors[rarity] || colors.common;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Pull - SIMPLIFIED FOR MOBILE
async function executePull() {
    // Show immediate feedback
    showToast('Opening pack...');
    console.log('[FORGE] 🎴 executePull CALLED!');
    
    try {
        console.log('[FORGE] 🎴 executePull START - DEV_MODE:', DEV_MODE, 'selectedPulls:', selectedPulls, 'CARDS:', CARDS.length);
        
        // Make sure we have cards
        if (CARDS.length === 0) {
            console.log('[FORGE] ⚠️ No cards! Generating...');
            CARDS = generateSampleCards();
        }
        
        // ALWAYS init audio on first pull (required for mobile)
        initAudio();
        console.log('[FORGE] 🔊 Audio initialized');
        
        // DEV MODE: Skip wallet checks entirely
        if (!DEV_MODE) {
            if (!spendLogs(selectedPulls)) {
                showToast('Not enough Logs! Go to Arcade to earn more!');
                return;
            }
        }
        
        let actual = selectedPulls;
        if (selectedPulls === 5) actual = 6;
        if (selectedPulls === 10) actual = 12;
        
        console.log('[FORGE] 🎴 Pulling', actual, 'cards...');
    
    cardsToReveal = [];
    let gotMythic = false, gotLegendary = false, gotEpic = false;
    
    for (let i = 0; i < actual; i++) {
        const rarity = rollRarity();
        const card = getCard(rarity);
        cardsToReveal.push(card);
        forgeState.totalPulls++;
        forgeState.collection.add(card.id);
        forgeState.recentCards.push(card);
        if (forgeState.recentCards.length > 50) forgeState.recentCards.shift();
        
        // 🎰 Update pity counters with new system
        updatePityCounters(rarity);
        
        // Record in wallet with progression system
        if (walletReady) {
            NW_WALLET.recordPull(rarity);
            const cardProgress = NW_WALLET.addToCollection(card.id, rarity);
            
            // Show level-up notification for duplicates
            if (cardProgress && cardProgress.count > 1) {
                const prevLevel = Math.floor((cardProgress.xp - getXPForRarity(rarity)) / 100) + 1;
                if (cardProgress.level > prevLevel) {
                    setTimeout(() => {
                        showToast(`⬆️ ${card.name[lang] || card.name.en} LEVEL UP! Lv.${cardProgress.level}`, 'legendary');
                        if (typeof NW_JUICE !== 'undefined') NW_JUICE.haptic.success();
                    }, 500);
                } else {
                    showToast(`+${getXPForRarity(rarity)} XP (x${cardProgress.count})`, 'info');
                }
            }
        }
        
        // Track what we got for bonuses
        if (rarity === 'mythic') { 
            gotMythic = true;
            forgeState.mythicsOwned++; 
            addLogs(100, 'MYTHIC_PULL_BONUS');  // Increased bonus!
            showToast('🎉 MYTHIC! +100 Sacred Logs Bonus!', 'mythic');
            // Announce to global chat!
            announcePull(card.id, 'mythic', card.name);
        } else if (rarity === 'legendary') {
            gotLegendary = true;
            addLogs(20, 'LEGENDARY_PULL_BONUS');
            // Announce to global chat!
            announcePull(card.id, 'legendary', card.name);
        } else if (rarity === 'epic') {
            gotEpic = true;
            addLogs(5, 'EPIC_PULL_BONUS');
        }
    }
    
    // Sort by rarity - best cards LAST for maximum suspense (Phone Destroyer style)
    const order = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    cardsToReveal.sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
    
    saveState();
    updateUI();
    
    // 🚀 PRELOAD ALL REVEAL IMAGES BEFORE SHOWING (instant reveals!)
    // Show quick loading feedback
    const pullBtn = document.querySelector('.pull-btn');
    if (pullBtn) {
        pullBtn.disabled = true;
        pullBtn.innerHTML = '<svg class="nw-icon nw-spin" width="16" height="16"><use href="/static/icons/nw-icons.svg#sparkles"></use></svg> Loading...';
    }
    
    console.log('[FORGE] 🎴 Preloading card images...');
    await preloadRevealCards(cardsToReveal);
    console.log('[FORGE] 🎴 Preload complete!');
    
    if (pullBtn) {
        pullBtn.disabled = false;
        pullBtn.innerHTML = '<svg class="nw-icon" width="16" height="16"><use href="/static/icons/nw-icons.svg#fire"></use></svg> PULL';
    }
    
    // ===== PACK OPENING ANIMATION =====
    // showPackOpening returns a Promise that resolves AFTER user swipes to open
    // tearOpenPack handles hiding the overlay after animations complete
    console.log('[FORGE] 🎴 Starting pack opening animation...');
    try {
        await showPackOpening(cardsToReveal);
        console.log('[FORGE] 🎴 Pack animation complete!');
    } catch (err) {
        console.error('[FORGE] ❌ Pack animation error:', err);
        // Fallback: hide overlay if animation fails
        const packOverlay = document.getElementById('packOverlay');
        if (packOverlay) packOverlay.classList.remove('show');
    }
    
    currentIndex = 0;
    console.log('[FORGE] 🎴 Calling showReveal with', cardsToReveal.length, 'cards');
    showReveal();
    console.log('[FORGE] 🎴 executePull COMPLETE!');
    } catch (error) {
        console.error('[FORGE] ❌ executePull ERROR:', error);
        console.error('[FORGE] ❌ Error details:', error.message, error.stack);
        showToast('Error: ' + error.message);
    }
}

// ===== GLOBAL PULL ANNOUNCEMENT =====
// Announce legendary+ pulls to global market chat
async function announcePull(cardId, rarity, cardName) {
    try {
        const wallet = NW_WALLET?.getWalletInfo();
        const userId = wallet?.guestId || 'Guest';
        const userName = userId.substring(0, 8);
        
        await fetch('/api/market/pull-announce', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                userName,
                cardId,
                rarity
            })
        });
        
        console.log(`📢 Announced ${rarity} pull: ${cardName}`);
    } catch (err) {
        console.log('Pull announcement failed (non-critical):', err);
    }
}

// ===== ULTRA PREMIUM REVEAL SYSTEM =====
function showReveal() {
    try {
        console.log('[FORGE] 🎴 showReveal called, cardsToReveal:', cardsToReveal.length);
        
        const overlay = document.getElementById('revealOverlay');
        console.log('[FORGE] 🎴 revealOverlay found:', !!overlay);
        
        if (!overlay) {
            console.error('[FORGE] ❌ revealOverlay not found!');
            showToast('Error: Reveal overlay missing');
            return;
        }
        
        overlay.classList.add('show');
        console.log('[FORGE] 🎴 Overlay shown');
        
        // Safe element access
        const cardInner = document.getElementById('cardInner');
        const rarityBadge = document.getElementById('rarityBadge');
        const cardInfo = document.getElementById('cardInfo');
        const revealContinue = document.getElementById('revealContinue');
        const cardFront = document.getElementById('cardFront');
        const revealCardEl = document.getElementById('revealCard');
        const cardHolo = document.getElementById('cardHolo');
        const cardSparkle = document.getElementById('cardSparkle');
        
        if (cardInner) cardInner.classList.remove('flipped');
        if (rarityBadge) rarityBadge.classList.remove('show');
        if (cardInfo) cardInfo.classList.remove('show');
        if (revealContinue) revealContinue.classList.remove('show');
        if (cardFront) cardFront.classList.remove('glow-mythic', 'glow-legendary', 'glow-epic', 'glow-rare', 'glow-uncommon');
        if (revealCardEl) revealCardEl.classList.remove('card-entrance');
        if (cardHolo) cardHolo.classList.remove('active');
        if (cardSparkle) cardSparkle.classList.remove('active');
        
        console.log('[FORGE] 🎴 Calling revealCard()');
        revealCard();
    } catch (err) {
        console.error('[FORGE] ❌ showReveal ERROR:', err);
        showToast('Reveal error: ' + err.message);
    }
}

function revealCard() {
    try {
        console.log('[FORGE] 🎴 revealCard called, currentIndex:', currentIndex, 'total:', cardsToReveal.length);
        
        if (currentIndex >= cardsToReveal.length) { 
            console.log('[FORGE] 🎴 All cards revealed, closing');
            closeReveal(); 
            return; 
        }
        
        const card = cardsToReveal[currentIndex];
        console.log('[FORGE] 🎴 Revealing card:', card.name.en, card.rarity, 'img:', card.img);
        
        // Reset state - with null checks
        const cardInner = document.getElementById('cardInner');
        const revealCardEl = document.getElementById('revealCard');
        const rarityBadge = document.getElementById('rarityBadge');
        const cardInfo = document.getElementById('cardInfo');
        const revealContinue = document.getElementById('revealContinue');
        const cardFront = document.getElementById('cardFront');
        const cardHolo = document.getElementById('cardHolo');
        const cardSparkle = document.getElementById('cardSparkle');
        const revealRays = document.getElementById('revealRays');
        const revealCounter = document.getElementById('revealCounter');
        const cardImg = document.getElementById('cardImg');
        const cardName = document.getElementById('cardName');
        const cardStats = document.getElementById('cardStats');
        
        if (cardInner) cardInner.classList.remove('flipped');
        if (rarityBadge) rarityBadge.classList.remove('show');
        if (cardInfo) cardInfo.classList.remove('show');
        if (revealContinue) revealContinue.classList.remove('show');
        if (cardFront) cardFront.classList.remove('glow-mythic', 'glow-legendary', 'glow-epic', 'glow-rare', 'glow-uncommon');
        if (cardHolo) cardHolo.classList.remove('active');
        if (cardSparkle) cardSparkle.classList.remove('active');
        if (revealRays) revealRays.classList.remove('active');
        
        // Update counter
        if (revealCounter) revealCounter.textContent = `${currentIndex + 1} / ${cardsToReveal.length}`;
        
        // 🎴 SIMPLE CARD IMAGE - Clean, no frames or overlays
        const thumbUrl = getCardThumbUrl(card.img);
        console.log('[FORGE] 🎴 Card image URL:', thumbUrl);
        
        if (cardImg) {
            cardImg.src = thumbUrl;
            cardImg.onerror = () => {
                console.error('[FORGE] ❌ Image failed to load:', thumbUrl);
                cardImg.src = '/static/images/cards/placeholder.webp';
            };
        }
        
        // Update info panel
        if (cardName) cardName.textContent = card.name[lang] || card.name.en || 'Unknown Card';
        
        // Format stats string from gameStats
        const stats = card.gameStats;
        const statsText = stats 
            ? `⚔️ ${stats.atk} | ❤️ ${stats.hp} | 💎 ${stats.cost}`
            : '';
        if (cardStats) cardStats.textContent = statsText;
        
        // Set rarity badge
        if (rarityBadge) {
            rarityBadge.textContent = card.rarity.toUpperCase();
            rarityBadge.className = 'rarity-badge ' + card.rarity;
        }
    
    // Card entrance animation - CSS-first approach with NW_ANIM enhancement
    // IMPORTANT: Always use CSS classes to ensure proper sizing
    revealCardEl.classList.remove('card-entrance-end');
    revealCardEl.classList.add('card-entrance-start');
    
    // Force reflow
    void revealCardEl.offsetWidth;
    
    // Start animation
    requestAnimationFrame(() => {
        if (typeof NW_ANIM !== 'undefined') {
            // Use NW_ANIM spring physics for premium feel
            NW_ANIM.animate(revealCardEl, {
                opacity: '1'
            }, { duration: 200, easing: 'easeOutQuad' });
            
            NW_ANIM.spring(revealCardEl, 'transform', 'scale(1) translateY(0)', {
                stiffness: 180,
                damping: 12,
                mass: 1
            }).then(() => {
                // Ensure final state
                revealCardEl.classList.remove('card-entrance-start');
                revealCardEl.style.transform = 'scale(1) translateY(0)';
                revealCardEl.style.opacity = '1';
            });
        } else {
            // Pure CSS fallback - always works
            revealCardEl.classList.remove('card-entrance-start');
            revealCardEl.classList.add('card-entrance-end');
        }
        
        // SAFETY NET: Ensure card reaches full size after 600ms no matter what
        setTimeout(() => {
            revealCardEl.classList.remove('card-entrance-start');
            revealCardEl.style.transform = 'scale(1) translateY(0)';
            revealCardEl.style.opacity = '1';
        }, 600);
    });
    
    // Create rays based on rarity
    createRays(card.rarity);
    
    // Add sparkles for rare+
    if (['rare', 'epic', 'legendary', 'mythic'].includes(card.rarity)) {
        createSparkles();
    }
    
    // Play anticipation sound - prefer NW_JUICE
    if (typeof NW_JUICE !== 'undefined') {
        NW_JUICE.sound.play('anticipation', 0.5);
    } else {
        playSound('anticipation');
    }
    
    // 🎰 RARITY HINT SYSTEM - Build suspense with color tease!
    const rarityColors = {
        common: '#6b7280',
        uncommon: '#22c55e', 
        rare: '#3b82f6',
        epic: '#a855f7',
        legendary: '#ffd700',
        mythic: '#ff00ff'
    };
    const hintColor = rarityColors[card.rarity];
    
    // Show subtle glow hint during anticipation
    const cardBack = document.querySelector('.card-back');
    if (cardBack) {
        cardBack.style.boxShadow = `0 0 30px ${hintColor}40, 0 0 60px ${hintColor}20`;
    }
    
    // Dramatic delay based on rarity - build suspense!
    // REDUCED for mobile testing - show effects faster
    const delayMap = { 
        common: 200,     // Quick reveal
        uncommon: 250,   
        rare: 300,       
        epic: 400,       
        legendary: 500,  
        mythic: 600      
    };
    const delay = delayMap[card.rarity] || 300;
    
    // Add pulsing glow during anticipation for high rarity
    if (['epic', 'legendary', 'mythic'].includes(card.rarity)) {
        revealCardEl.classList.add('rarity-tease');
        revealCardEl.style.setProperty('--tease-color', hintColor);
        
        // 🎮 NW_JUICE anticipation with escalating haptics
        if (typeof NW_JUICE !== 'undefined') {
            NW_JUICE.gacha.anticipate(revealCardEl, delay);
        }
    }
    
    setTimeout(() => {
        // Remove tease effect
        revealCardEl.classList.remove('rarity-tease');
        if (cardBack) cardBack.style.boxShadow = '';
        
        // Play flip sound - prefer NW_JUICE
        if (typeof NW_JUICE !== 'undefined') NW_JUICE.sound.play('flip');
        else playSound('flip');
        // DISABLED flip since card front is already visible
        // cardInner.classList.add('flipped');
        
        // \ud83c\udfae NW_ANIM bounce effect on flip for high rarity
        if (typeof NW_ANIM !== 'undefined' && ['epic', 'legendary', 'mythic'].includes(card.rarity)) {
            NW_ANIM.spring(revealCardEl, 'transform', 'scale(1.05)', {
                stiffness: 300,
                damping: 8
            }).then(() => {
                NW_ANIM.spring(revealCardEl, 'transform', 'scale(1)', {
                    stiffness: 200,
                    damping: 15
                });
            });
        }
        
        // 🎮 Haptic feedback on flip
        if (typeof NW_JUICE !== 'undefined') {
            NW_JUICE.haptic.medium();
        }
        
        // Impact sound for legendary+ (delayed for dramatic effect)
        if (['legendary', 'mythic'].includes(card.rarity)) {
            setTimeout(() => {
                if (typeof NW_JUICE !== 'undefined') NW_JUICE.sound.play('impact_heavy');
                else playSound('impact');
            }, 250);
        }
        
        // After flip, show effects - REDUCED delay for mobile
        setTimeout(() => {
            console.log('[FORGE] 🎴 Showing rarity effects for:', card.rarity);
            showRarityEffects(card);
        }, 200);
    }, delay);
    
    } catch (err) {
        console.error('[FORGE] ❌ revealCard ERROR:', err);
        showToast('Card reveal error: ' + err.message);
    }
}

function showRarityEffects(card) {
    const rarity = card.rarity;
    const revealCard = document.getElementById('revealCard');
    
    // 🎮 Use NW_JUICE for optimized effects
    if (typeof NW_JUICE !== 'undefined') {
        NW_JUICE.gacha.reveal(revealCard, rarity);
    }
    
    // Activate glow - Applied to card-front (box-shadow matches card shape perfectly)
    const cardFront = document.getElementById('cardFront');
    // Remove any previous glow classes
    cardFront.classList.remove('glow-mythic', 'glow-legendary', 'glow-epic', 'glow-rare', 'glow-uncommon');
    // Add new glow class
    cardFront.classList.add('glow-' + rarity);
    
    // Activate holo for epic+
    if (['epic', 'legendary', 'mythic'].includes(rarity)) {
        document.getElementById('cardHolo').classList.add('active');
        document.getElementById('cardSparkle').classList.add('active');
    }
    
    // Show badge with animation
    document.getElementById('rarityBadge').classList.add('show');
    
    // Show info
    document.getElementById('cardInfo').classList.add('show');
    
    // Show rays
    document.getElementById('revealRays').classList.add('active');
    
    // Energy ring pulse
    const energyRing = document.getElementById('energyRing');
    
    // ═══════════════════════════════════════════════════════════════════
    // 🎰 NW_JUICE PREMIUM EFFECTS - Full game juice experience!
    // ═══════════════════════════════════════════════════════════════════
    if (typeof NW_JUICE !== 'undefined') {
        // Use the premium NW_JUICE system for all effects
        const revealCardEl = document.getElementById('revealCard');
        console.log('[FORGE] 🎮 NW_JUICE.gacha.reveal:', rarity);
        NW_JUICE.gacha.reveal(revealCardEl, rarity);
        
        // Extra effects for high rarities
        if (rarity === 'mythic') {
            energyRing.classList.add('pulse');
            setTimeout(() => energyRing.classList.remove('pulse'), 1200);
            startSparkleRain('#ff00ff', 3000);
            setTimeout(() => showMythicCelebration(card), 2500);
            showToast(`💎 MYTHIC! ${card.name[lang] || card.name.en}`, 'mythic');
            // NW_FX Premium celebration!
            if (window.NW_FX) {
                NW_FX.celebrate.epicPull('mythic');
                NW_FX.toast.activity('You', 'pulled a MYTHIC card!', 'mythic');
            }
        } else if (rarity === 'legendary') {
            energyRing.classList.add('pulse');
            setTimeout(() => energyRing.classList.remove('pulse'), 800);
            startSparkleRain('#ffd700', 1500);
            showToast(`⭐ LEGENDARY! ${card.name[lang] || card.name.en}`, 'legendary');
            // NW_FX Premium celebration!
            if (window.NW_FX) {
                NW_FX.celebrate.epicPull('legendary');
                NW_FX.toast.activity('You', 'pulled a Legendary card!', 'legendary');
            }
        } else if (rarity === 'epic') {
            startSparkleRain('#a855f7', 800);
            showToast(`💜 EPIC! ${card.name[lang] || card.name.en}`, 'epic');
        }
    } else {
        // Fallback to local functions if NW_JUICE not loaded
        console.warn('[FORGE] NW_JUICE not available, using fallback');
        playSound(rarity);
        if (['mythic', 'legendary', 'epic'].includes(rarity)) {
            const colors = { mythic: '#ff00ff', legendary: '#ffd700', epic: '#a855f7' };
            screenFlash(colors[rarity]);
            screenShake(rarity === 'mythic' ? 15 : rarity === 'legendary' ? 10 : 5, 400);
            createParticles(colors[rarity], 100);
            energyRing.classList.add('pulse');
            setTimeout(() => energyRing.classList.remove('pulse'), 800);
            if (rarity === 'mythic') setTimeout(() => showMythicCelebration(card), 2500);
            showToast(`${rarity.toUpperCase()}! ${card.name[lang] || card.name.en}`, rarity);
        } else {
            createParticles(rarity === 'rare' ? '#3b82f6' : rarity === 'uncommon' ? '#22c55e' : '#9ca3af', 40);
        }
    }
    
    // Show continue button
    setTimeout(() => {
        document.getElementById('revealContinue').classList.add('show');
    }, rarity === 'mythic' ? 0 : 1200);
}

function createRays(rarity) {
    const container = document.getElementById('revealRays');
    container.innerHTML = '';
    container.classList.remove('active');
    
    const colors = {
        mythic: ['#ff00ff', '#00ffff', '#ff00ff', '#ffff00', '#ff00ff', '#00ffff'],
        legendary: ['#ffd700', '#ff6b00', '#ffd700', '#ffaa00'],
        epic: ['#a855f7', '#7c3aed', '#a855f7'],
        rare: ['#3b82f6', '#60a5fa'],
        uncommon: ['#22c55e'],
        common: ['#6b7280']
    };
    const cols = colors[rarity] || colors.common;
    const count = rarity === 'mythic' ? 32 : rarity === 'legendary' ? 20 : 12;
    
    for (let i = 0; i < count; i++) {
        const ray = document.createElement('div');
        ray.className = 'reveal-ray';
        ray.style.background = `linear-gradient(to top, transparent, ${cols[i % cols.length]}80, transparent)`;
        ray.style.transform = `rotate(${(360 / count) * i}deg)`;
        const speed = 12 + Math.random() * 8;
        ray.style.animation = `rayRotate ${speed}s linear infinite`;
        ray.style.animationDelay = `${i * 0.1}s`;
        ray.style.width = rarity === 'mythic' ? '10px' : '6px';
        container.appendChild(ray);
    }
}

function createSparkles() {
    const container = document.getElementById('cardSparkle');
    container.innerHTML = '';
    for (let i = 0; i < 15; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = Math.random() * 100 + '%';
        sparkle.style.top = Math.random() * 100 + '%';
        sparkle.style.animationDelay = Math.random() * 1.5 + 's';
        container.appendChild(sparkle);
    }
}

function createParticles(color, count) {
    const container = document.getElementById('revealParticles');
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        const size = 4 + Math.random() * 10;
        const isSquare = Math.random() > 0.7;
        p.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:${color};
            border-radius:${isSquare ? '2px' : '50%'};left:50%;top:50%;box-shadow:0 0 ${size * 2}px ${color};pointer-events:none;`;
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const vel = 180 + Math.random() * 400;
        const vx = Math.cos(angle) * vel;
        const vy = Math.sin(angle) * vel - 150;
        const rotation = Math.random() * 720 - 360;
        p.animate([
            { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
            { transform: `translate(calc(-50% + ${vx}px), calc(-50% + ${vy}px)) scale(0) rotate(${rotation}deg)`, opacity: 0 }
        ], { duration: 1400 + Math.random() * 800, easing: 'cubic-bezier(0,0,0.2,1)' });
        container.appendChild(p);
        setTimeout(() => p.remove(), 2200);
    }
}

function screenFlash(color, delay = 0, intensity = 0.6) {
    console.log('[FORGE] ⚡ screenFlash:', color);
    setTimeout(() => {
        const f = document.getElementById('screenFlash');
        if (!f) return;
        f.style.background = color;
        f.style.opacity = intensity;
        f.style.display = 'block';
        f.classList.add('flash');
        
        setTimeout(() => {
            f.classList.remove('flash');
            f.style.opacity = '0';
            setTimeout(() => f.style.display = 'none', 100);
        }, 300);
    }, delay);
}

function screenShake(intensity = 8, duration = 500) {
    console.log('[FORGE] 📳 screenShake:', intensity, duration);
    // Shake the entire overlay for maximum impact
    const overlay = document.getElementById('revealOverlay');
    const stage = document.getElementById('cardStage');
    const target = overlay || stage || document.body;
    
    const smoothIntensity = Math.min(intensity * 0.8, 15);
    target.style.setProperty('--shake-intensity', smoothIntensity + 'px');
    target.style.animation = `shake ${duration}ms ease-in-out`;
    
    // Also trigger haptic
    haptic('shake');
    
    setTimeout(() => {
        target.style.animation = '';
    }, duration);
}

// 🌟 Sparkle rain effect for high rarity reveals
function startSparkleRain(color, duration) {
    const container = document.getElementById('revealParticles');
    const interval = setInterval(() => {
        for (let i = 0; i < 3; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'rain-sparkle';
            sparkle.style.left = Math.random() * 100 + '%';
            sparkle.style.background = color;
            sparkle.style.boxShadow = `0 0 6px ${color}, 0 0 12px ${color}`;
            sparkle.style.animationDuration = (1 + Math.random()) + 's';
            container.appendChild(sparkle);
            setTimeout(() => sparkle.remove(), 2000);
        }
    }, 100);
    setTimeout(() => clearInterval(interval), duration);
}

function advanceReveal() {
    if (cardsToReveal[currentIndex]?.rarity === 'mythic') return; // Handled by celebration
    currentIndex++;
    if (currentIndex < cardsToReveal.length) {
        revealCard();
    } else {
        closeReveal();
    }
}

function closeReveal() {
    document.getElementById('revealOverlay').classList.remove('show');
    document.getElementById('revealRays').classList.remove('active');
    document.getElementById('revealParticles').innerHTML = '';
    
    // Show "Go to Battle" toast after pulling
    const pulledCount = cardsToReveal.length;
    if (pulledCount > 0) {
        setTimeout(() => {
            showBattlePrompt(pulledCount);
        }, 500);
    }
    
    cardsToReveal = [];
    currentIndex = 0;
    updateUI();
}

// Show battle prompt after pulling cards
function showBattlePrompt(count) {
    // Create toast with battle button
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, rgba(255,107,0,0.95), rgba(255,215,0,0.95));
        color: #000;
        padding: 16px 24px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(255,107,0,0.5);
        animation: slideUp 0.3s ease;
    `;
    toast.innerHTML = `
        <span>🎴 ${count} card${count > 1 ? 's' : ''} added!</span>
        <button onclick="location.href='/battle'" style="
            background: #000;
            color: #ffd700;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Orbitron', sans-serif;
        ">⚔️ BATTLE NOW</button>
        <button onclick="this.parentElement.remove()" style="
            background: transparent;
            border: none;
            color: #000;
            font-size: 18px;
            cursor: pointer;
        ">✕</button>
    `;
    document.body.appendChild(toast);
    
    // Auto-remove after 8 seconds
    setTimeout(() => toast.remove(), 8000);
}

// Mythic Celebration
function showMythicCelebration(card) {
    const modal = document.getElementById('mythicModal');
    // Use thumbnail for fast load (already preloaded!)
    document.getElementById('mythicImg').src = getCardThumbUrl(card.img);
    document.getElementById('mythicPrize').textContent = card.prize || 'Physical Card + Lifetime VIP';
    
    const container = document.getElementById('mythicRaysContainer');
    container.innerHTML = '';
    for (let i = 0; i < 20; i++) {
        const ray = document.createElement('div');
        ray.className = 'mythic-ray';
        ray.style.transform = `rotate(${i * 18}deg)`;
        ray.style.animationDelay = `${i * 0.1}s`;
        container.appendChild(ray);
    }
    
    modal.classList.add('show');
}

document.getElementById('mythicClose').addEventListener('click', () => {
    document.getElementById('mythicModal').classList.remove('show');
    addLogs(50);
    showToast('+50 LOGS BONUS for pulling a MYTHIC!');
    currentIndex++;
    if (currentIndex < cardsToReveal.length) revealCard();
    else closeReveal();
    updateUI();
});

// Events
document.getElementById('revealContinue').addEventListener('click', advanceReveal);
document.getElementById('revealCard').addEventListener('click', advanceReveal);

// Language
document.querySelectorAll('.lang button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.lang button').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        lang = btn.dataset.l;
        updateUI();
    });
});

function showToast(msg, rarity = null) {
    // Use NW_UI toast if available (much better!)
    if (typeof NW_UI !== 'undefined') {
        const rarityColors = {
            mythic: { bg: 'linear-gradient(135deg, #ff00ff, #8b00ff)', icon: '💎' },
            legendary: { bg: 'linear-gradient(135deg, #ffd700, #ff6b00)', icon: '⭐' },
            epic: { bg: 'linear-gradient(135deg, #a855f7, #7c3aed)', icon: '💜' },
            rare: { bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', icon: '💙' },
            uncommon: { bg: 'linear-gradient(135deg, #22c55e, #16a34a)', icon: '💚' },
            common: { bg: 'linear-gradient(135deg, #6b7280, #4b5563)', icon: '⚪' }
        };
        
        if (rarity && rarityColors[rarity]) {
            const style = rarityColors[rarity];
            // Custom styled toast for rarity reveals
            const toastEl = NW_UI.toast(`${style.icon} ${msg}`, rarity === 'mythic' ? 'success' : 'info', 4000);
            if (toastEl) {
                toastEl.style.background = style.bg;
                toastEl.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${rarity === 'mythic' ? '#ff00ff' : rarity === 'legendary' ? '#ffd700' : 'transparent'}50`;
            }
        } else {
            NW_UI.toast(msg, 'info', 3000);
        }
        return;
    }
    
    // Fallback to original toast
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// Init - Load cards first, then state, then preload common images
(async function() {
    try {
        console.log('[FORGE] 🚀 Initializing...');
        
        await loadGachaCards();
        console.log('[FORGE] ✅ Cards loaded:', CARDS.length);
        
        loadState();
        console.log('[FORGE] ✅ State loaded');
        
        // DEV MODE: Setup UI immediately
        if (DEV_MODE) {
            setupDevModeUI();
            updateUI();
            console.log('[FORGE] ✅ DEV MODE UI ready');
        }
        
        // 🎮 Initialize NW_FORGE with card pool (skip if undefined)
        if (typeof NW_FORGE !== 'undefined' && NW_FORGE.setCards) {
            NW_FORGE.setCards(CARDS);
            await NW_FORGE.init();
            NW_FORGE.on('mythic', (card) => console.log('🎉 MYTHIC PULLED!', card));
            NW_FORGE.on('legendary', (card) => console.log('⭐ LEGENDARY!', card));
            console.log('[FORGE] ✅ NW_FORGE initialized');
        }
        
        // 🎮 Initialize NW_STATE for persistence (skip if undefined)
        if (typeof NW_STATE !== 'undefined' && NW_STATE.configure) {
            NW_STATE.configure({ persist: true, debug: false });
            console.log('[FORGE] ✅ NW_STATE persistence enabled');
        }
        
        console.log('[FORGE] 🎮 READY with', CARDS.length, 'pullable cards');
    } catch (err) {
        console.error('[FORGE] ❌ Init error:', err);
        // Still try to set up DEV MODE UI
        if (DEV_MODE) setupDevModeUI();
    }
    
    // 🚀 Background preload common cards for instant reveals
    setTimeout(() => {
        preloadCommonCards().then(() => {
            console.log(`Preloaded ${preloadedImages.size} card thumbnails`);
        });
    }, 1000);
})();

// 🔥 Generate floating embers
function createEmbers() {
    const container = document.getElementById('embers');
    if (!container) return;
    for (let i = 0; i < 15; i++) {
        const ember = document.createElement('div');
        ember.className = 'ember';
        ember.style.left = Math.random() * 100 + '%';
        ember.style.animationDelay = Math.random() * 4 + 's';
        ember.style.animationDuration = (3 + Math.random() * 3) + 's';
        container.appendChild(ember);
    }
}
createEmbers();

// Show test mode badge if enabled
if (TEST_MODE) {
    document.getElementById('testBadge').style.display = 'inline';
    console.log('🎮 TEST MODE ENABLED - Infinite Logs!');
}

setInterval(() => {
    // DEV MODE: Skip balance sync - always infinite
    if (DEV_MODE) return;
    const current = parseInt(document.getElementById('logBalance').textContent);
    if (!isNaN(current) && current !== getLogs()) updateUI();
}, 1000);
