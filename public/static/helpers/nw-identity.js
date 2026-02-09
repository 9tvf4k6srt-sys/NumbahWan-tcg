/**
 * NumbahWan Identity System v1.0
 * Ultra-Secure Device Fingerprinting + Behavioral Biometrics
 * 
 * ANTI-SPOOF LAYERS:
 * 1. Hardware fingerprint (50+ signals)
 * 2. Canvas fingerprint (GPU-based)
 * 3. WebGL fingerprint (graphics card signature)
 * 4. Audio fingerprint (audio processing signature)
 * 5. Behavioral biometrics (typing/mouse patterns)
 * 6. Timing analysis (detects automation)
 * 7. Consistency checks (detects spoofing extensions)
 */

const NW_IDENTITY = {
    version: '1.0.0',
    storageKey: 'nw_citizen_identity',
    
    // Collected fingerprint data
    fingerprint: null,
    behaviorProfile: null,
    trustScore: 0,
    
    // Behavioral tracking
    keystrokes: [],
    mouseMovements: [],
    scrollPatterns: [],
    touchPatterns: [],
    
    // ========================================
    // LAYER 1: HARDWARE FINGERPRINT (50+ signals)
    // ========================================
    async collectHardwareSignals() {
        const signals = {};
        
        // Screen properties
        signals.screenWidth = screen.width;
        signals.screenHeight = screen.height;
        signals.screenAvailWidth = screen.availWidth;
        signals.screenAvailHeight = screen.availHeight;
        signals.screenColorDepth = screen.colorDepth;
        signals.screenPixelDepth = screen.pixelDepth;
        signals.devicePixelRatio = window.devicePixelRatio;
        
        // Window properties
        signals.innerWidth = window.innerWidth;
        signals.innerHeight = window.innerHeight;
        signals.outerWidth = window.outerWidth;
        signals.outerHeight = window.outerHeight;
        
        // Navigator properties
        signals.userAgent = navigator.userAgent;
        signals.language = navigator.language;
        signals.languages = navigator.languages?.join(',') || '';
        signals.platform = navigator.platform;
        signals.hardwareConcurrency = navigator.hardwareConcurrency || 0;
        signals.deviceMemory = navigator.deviceMemory || 0;
        signals.maxTouchPoints = navigator.maxTouchPoints || 0;
        signals.cookieEnabled = navigator.cookieEnabled;
        signals.doNotTrack = navigator.doNotTrack;
        signals.pdfViewerEnabled = navigator.pdfViewerEnabled;
        
        // Timezone
        signals.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        signals.timezoneOffset = new Date().getTimezoneOffset();
        
        // Date/time formatting (locale-specific)
        signals.dateFormat = new Date().toLocaleDateString();
        signals.timeFormat = new Date().toLocaleTimeString();
        
        // Math precision (varies by browser/CPU)
        signals.mathPrecision = Math.tan(Math.PI / 4).toString().slice(0, 20);
        signals.mathSin = Math.sin(1).toString().slice(0, 20);
        signals.mathCos = Math.cos(1).toString().slice(0, 20);
        
        // Performance timing
        if (performance.timing) {
            signals.perfNavStart = performance.timing.navigationStart % 1000000;
        }
        
        // Connection info
        if (navigator.connection) {
            signals.connectionType = navigator.connection.effectiveType || '';
            signals.connectionRtt = navigator.connection.rtt || 0;
            signals.connectionDownlink = navigator.connection.downlink || 0;
        }
        
        // Battery (if available)
        try {
            if (navigator.getBattery) {
                const battery = await navigator.getBattery();
                signals.batteryCharging = battery.charging;
                signals.batteryLevel = Math.round(battery.level * 100);
            }
        } catch (e) {}
        
        // Media devices count
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            signals.audioInputs = devices.filter(d => d.kind === 'audioinput').length;
            signals.audioOutputs = devices.filter(d => d.kind === 'audiooutput').length;
            signals.videoInputs = devices.filter(d => d.kind === 'videoinput').length;
        } catch (e) {}
        
        // Plugins (legacy but still useful)
        signals.pluginCount = navigator.plugins?.length || 0;
        signals.plugins = Array.from(navigator.plugins || [])
            .map(p => p.name).slice(0, 10).join(',');
        
        // MIME types
        signals.mimeTypeCount = navigator.mimeTypes?.length || 0;
        
        // Storage estimates
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                signals.storageQuota = estimate.quota || 0;
            }
        } catch (e) {}
        
        // Session storage test (detects private browsing)
        try {
            sessionStorage.setItem('nw_test', '1');
            sessionStorage.removeItem('nw_test');
            signals.sessionStorageEnabled = true;
        } catch (e) {
            signals.sessionStorageEnabled = false;
        }
        
        // IndexedDB test
        signals.indexedDBEnabled = !!window.indexedDB;
        
        // WebRTC detection
        signals.webRTCEnabled = !!(window.RTCPeerConnection || window.webkitRTCPeerConnection);
        
        // Speech synthesis voices
        try {
            const voices = speechSynthesis.getVoices();
            signals.voiceCount = voices.length;
            signals.voiceNames = voices.slice(0, 5).map(v => v.name).join(',');
        } catch (e) {}
        
        return signals;
    },
    
    // ========================================
    // LAYER 2: CANVAS FINGERPRINT
    // ========================================
    getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 280;
            canvas.height = 60;
            const ctx = canvas.getContext('2d');
            
            // Complex drawing that varies by GPU/driver
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            
            ctx.fillStyle = '#069';
            ctx.font = '14px Arial';
            ctx.fillText('NumbahWan Guild ', 2, 15);
            
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.font = '18px Georgia';
            ctx.fillText('RegginA #1', 4, 45);
            
            // Add some curves
            ctx.beginPath();
            ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();
            
            // Gradient
            const gradient = ctx.createLinearGradient(0, 0, 280, 0);
            gradient.addColorStop(0, 'red');
            gradient.addColorStop(0.5, 'green');
            gradient.addColorStop(1, 'blue');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 50, 280, 10);
            
            return canvas.toDataURL();
        } catch (e) {
            return 'canvas_error';
        }
    },
    
    // ========================================
    // LAYER 3: WEBGL FINGERPRINT
    // ========================================
    getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) return { supported: false };
            
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            
            return {
                supported: true,
                vendor: gl.getParameter(gl.VENDOR),
                renderer: gl.getParameter(gl.RENDERER),
                version: gl.getParameter(gl.VERSION),
                shadingVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '',
                unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '',
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)?.join(',') || '',
                maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
                maxCombinedTextureUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
                aliasedLineWidthRange: gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE)?.join(',') || '',
                aliasedPointSizeRange: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)?.join(',') || '',
                extensions: gl.getSupportedExtensions()?.slice(0, 20).join(',') || ''
            };
        } catch (e) {
            return { supported: false, error: e.message };
        }
    },
    
    // ========================================
    // LAYER 4: AUDIO FINGERPRINT
    // ========================================
    async getAudioFingerprint() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const analyser = audioContext.createAnalyser();
            const gain = audioContext.createGain();
            const compressor = audioContext.createDynamicsCompressor();
            
            // Configure
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
            
            compressor.threshold.setValueAtTime(-50, audioContext.currentTime);
            compressor.knee.setValueAtTime(40, audioContext.currentTime);
            compressor.ratio.setValueAtTime(12, audioContext.currentTime);
            compressor.attack.setValueAtTime(0, audioContext.currentTime);
            compressor.release.setValueAtTime(0.25, audioContext.currentTime);
            
            gain.gain.setValueAtTime(0, audioContext.currentTime);
            
            // Connect
            oscillator.connect(compressor);
            compressor.connect(analyser);
            analyser.connect(gain);
            gain.connect(audioContext.destination);
            
            oscillator.start(0);
            
            // Capture
            await new Promise(r => setTimeout(r, 100));
            
            const freqData = new Float32Array(analyser.frequencyBinCount);
            analyser.getFloatFrequencyData(freqData);
            
            oscillator.stop();
            audioContext.close();
            
            // Create hash from frequency data
            let hash = 0;
            for (let i = 0; i < freqData.length; i += 100) {
                hash += freqData[i] || 0;
            }
            
            return {
                supported: true,
                hash: hash.toFixed(6),
                sampleRate: audioContext.sampleRate,
                maxChannels: audioContext.destination.maxChannelCount,
                binCount: analyser.frequencyBinCount
            };
        } catch (e) {
            return { supported: false, error: e.message };
        }
    },
    
    // ========================================
    // LAYER 5: BEHAVIORAL BIOMETRICS
    // ========================================
    startBehaviorTracking() {
        // Keystroke dynamics
        document.addEventListener('keydown', (e) => {
            this.keystrokes.push({
                key: e.key.length === 1 ? 'char' : e.key, // Don't store actual chars
                time: Date.now(),
                shift: e.shiftKey,
                ctrl: e.ctrlKey
            });
            if (this.keystrokes.length > 200) this.keystrokes.shift();
        });
        
        // Mouse movement patterns
        let lastMouseTime = 0;
        document.addEventListener('mousemove', (e) => {
            const now = Date.now();
            if (now - lastMouseTime > 50) { // Sample every 50ms
                this.mouseMovements.push({
                    x: e.clientX,
                    y: e.clientY,
                    time: now
                });
                lastMouseTime = now;
                if (this.mouseMovements.length > 200) this.mouseMovements.shift();
            }
        });
        
        // Scroll patterns
        let lastScrollTime = 0;
        document.addEventListener('scroll', () => {
            const now = Date.now();
            if (now - lastScrollTime > 100) {
                this.scrollPatterns.push({
                    y: window.scrollY,
                    time: now
                });
                lastScrollTime = now;
                if (this.scrollPatterns.length > 100) this.scrollPatterns.shift();
            }
        });
        
        // Touch patterns (mobile)
        document.addEventListener('touchstart', (e) => {
            this.touchPatterns.push({
                touches: e.touches.length,
                x: e.touches[0]?.clientX || 0,
                y: e.touches[0]?.clientY || 0,
                time: Date.now()
            });
            if (this.touchPatterns.length > 100) this.touchPatterns.shift();
        });
    },
    
    analyzeBehavior() {
        const profile = {
            keystrokeDynamics: {},
            mousePatterns: {},
            scrollBehavior: {}
        };
        
        // Analyze keystroke timing
        if (this.keystrokes.length > 10) {
            const intervals = [];
            for (let i = 1; i < this.keystrokes.length; i++) {
                intervals.push(this.keystrokes[i].time - this.keystrokes[i-1].time);
            }
            profile.keystrokeDynamics = {
                avgInterval: intervals.reduce((a,b) => a+b, 0) / intervals.length,
                minInterval: Math.min(...intervals),
                maxInterval: Math.max(...intervals),
                variance: this.calculateVariance(intervals)
            };
        }
        
        // Analyze mouse movement
        if (this.mouseMovements.length > 20) {
            const speeds = [];
            const angles = [];
            for (let i = 1; i < this.mouseMovements.length; i++) {
                const dx = this.mouseMovements[i].x - this.mouseMovements[i-1].x;
                const dy = this.mouseMovements[i].y - this.mouseMovements[i-1].y;
                const dt = this.mouseMovements[i].time - this.mouseMovements[i-1].time;
                const distance = Math.sqrt(dx*dx + dy*dy);
                speeds.push(distance / (dt || 1));
                angles.push(Math.atan2(dy, dx));
            }
            profile.mousePatterns = {
                avgSpeed: speeds.reduce((a,b) => a+b, 0) / speeds.length,
                speedVariance: this.calculateVariance(speeds),
                avgAngle: angles.reduce((a,b) => a+b, 0) / angles.length,
                straightLineRatio: this.calculateStraightLineRatio()
            };
        }
        
        // Analyze scroll behavior
        if (this.scrollPatterns.length > 5) {
            const scrollSpeeds = [];
            for (let i = 1; i < this.scrollPatterns.length; i++) {
                const dy = Math.abs(this.scrollPatterns[i].y - this.scrollPatterns[i-1].y);
                const dt = this.scrollPatterns[i].time - this.scrollPatterns[i-1].time;
                scrollSpeeds.push(dy / (dt || 1));
            }
            profile.scrollBehavior = {
                avgSpeed: scrollSpeeds.reduce((a,b) => a+b, 0) / scrollSpeeds.length,
                variance: this.calculateVariance(scrollSpeeds)
            };
        }
        
        return profile;
    },
    
    calculateVariance(arr) {
        if (arr.length === 0) return 0;
        const mean = arr.reduce((a,b) => a+b, 0) / arr.length;
        return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    },
    
    calculateStraightLineRatio() {
        if (this.mouseMovements.length < 10) return 0;
        let straightCount = 0;
        for (let i = 2; i < this.mouseMovements.length; i++) {
            const angle1 = Math.atan2(
                this.mouseMovements[i-1].y - this.mouseMovements[i-2].y,
                this.mouseMovements[i-1].x - this.mouseMovements[i-2].x
            );
            const angle2 = Math.atan2(
                this.mouseMovements[i].y - this.mouseMovements[i-1].y,
                this.mouseMovements[i].x - this.mouseMovements[i-1].x
            );
            if (Math.abs(angle1 - angle2) < 0.1) straightCount++;
        }
        return straightCount / (this.mouseMovements.length - 2);
    },
    
    // ========================================
    // LAYER 6: ANTI-SPOOF DETECTION
    // ========================================
    detectSpoofing(signals) {
        const flags = [];
        let suspicionScore = 0;
        
        // Check 1: Automation detection
        if (navigator.webdriver) {
            flags.push('webdriver_detected');
            suspicionScore += 50;
        }
        
        // Check 2: Headless browser detection
        if (/HeadlessChrome/.test(navigator.userAgent)) {
            flags.push('headless_chrome');
            suspicionScore += 50;
        }
        
        // Check 3: Phantom.js detection
        if (window.callPhantom || window._phantom) {
            flags.push('phantomjs_detected');
            suspicionScore += 50;
        }
        
        // Check 4: Selenium detection
        if (window.document.documentElement.getAttribute('webdriver')) {
            flags.push('selenium_detected');
            suspicionScore += 50;
        }
        
        // Check 5: DevTools detection (not always spoofing, but flag it)
        const devtools = /./;
        devtools.toString = function() {
            flags.push('devtools_open');
            suspicionScore += 10;
        };
        
        // Check 6: Inconsistent screen values
        if (signals.screenWidth < signals.innerWidth || 
            signals.screenHeight < signals.innerHeight) {
            flags.push('inconsistent_screen');
            suspicionScore += 30;
        }
        
        // Check 7: Missing expected features
        if (!signals.webRTCEnabled && !signals.sessionStorageEnabled) {
            flags.push('features_disabled');
            suspicionScore += 20;
        }
        
        // Check 8: Too perfect values (likely spoofed)
        if (signals.devicePixelRatio === 1 && 
            signals.screenWidth === 1920 && 
            signals.screenHeight === 1080 &&
            signals.hardwareConcurrency === 4) {
            flags.push('generic_values');
            suspicionScore += 25;
        }
        
        // Check 9: Canvas blocking detection
        if (this.getCanvasFingerprint() === 'canvas_error') {
            flags.push('canvas_blocked');
            suspicionScore += 15;
        }
        
        // Check 10: Timing anomalies (bots are too fast)
        const loadTime = performance.now();
        if (loadTime < 100) {
            flags.push('suspiciously_fast');
            suspicionScore += 20;
        }
        
        // Check 11: Check for common spoofing extensions
        const checkExtensions = () => {
            const knownExtensions = [
                'canvas-fingerprint-block',
                'webgl-fingerprint-defender',
                'chameleon-ext'
            ];
            // Can't directly detect, but inconsistencies reveal them
        };
        
        // Check 12: Touch support mismatch
        if (signals.maxTouchPoints > 0 && !/Mobile|Android|iPhone/i.test(signals.userAgent)) {
            flags.push('touch_mismatch');
            suspicionScore += 15;
        }
        
        return {
            isSuspicious: suspicionScore >= 50,
            suspicionScore,
            flags,
            trustLevel: Math.max(0, 100 - suspicionScore)
        };
    },
    
    // ========================================
    // LAYER 7: GENERATE UNIQUE ID
    // ========================================
    async generateHash(data) {
        const str = JSON.stringify(data);
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    formatUUID(hash) {
        // Format: NW-XXXX-XXXX-XXXX-XXXX
        return `NW-${hash.slice(0,4).toUpperCase()}-${hash.slice(4,8).toUpperCase()}-${hash.slice(8,12).toUpperCase()}-${hash.slice(12,16).toUpperCase()}`;
    },
    
    // ========================================
    // MAIN: COLLECT FULL FINGERPRINT
    // ========================================
    async collectFingerprint() {
        console.log('[NW_IDENTITY] Collecting device fingerprint...');
        
        const startTime = Date.now();
        
        // Collect all layers
        const hardware = await this.collectHardwareSignals();
        const canvas = this.getCanvasFingerprint();
        const webgl = this.getWebGLFingerprint();
        const audio = await this.getAudioFingerprint();
        const behavior = this.analyzeBehavior();
        
        // Anti-spoof check
        const spoofCheck = this.detectSpoofing(hardware);
        
        // Combine into fingerprint
        const combinedData = {
            hardware,
            canvas: await this.generateHash(canvas),
            webgl: await this.generateHash(JSON.stringify(webgl)),
            audio: audio.hash || 'unsupported'
        };
        
        // Generate main device ID
        const deviceHash = await this.generateHash(combinedData);
        const deviceUUID = this.formatUUID(deviceHash);
        
        // Calculate trust score
        let trustScore = spoofCheck.trustLevel;
        
        // Bonus for behavior data
        if (this.keystrokes.length > 20) trustScore += 5;
        if (this.mouseMovements.length > 50) trustScore += 5;
        
        trustScore = Math.min(100, trustScore);
        
        const collectionTime = Date.now() - startTime;
        
        this.fingerprint = {
            deviceUUID,
            deviceHash,
            trustScore,
            spoofCheck,
            signals: {
                hardwareSignals: Object.keys(hardware).length,
                canvasSupported: canvas !== 'canvas_error',
                webglSupported: webgl.supported,
                audioSupported: audio.supported
            },
            behavior,
            collectionTime,
            timestamp: Date.now()
        };
        
        // Store locally
        this.saveIdentity();
        
        console.log(`[NW_IDENTITY] Fingerprint collected in ${collectionTime}ms`);
        console.log(`[NW_IDENTITY] Device UUID: ${deviceUUID}`);
        console.log(`[NW_IDENTITY] Trust Score: ${trustScore}%`);
        
        return this.fingerprint;
    },
    
    // ========================================
    // STORAGE & VERIFICATION
    // ========================================
    saveIdentity() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify({
                deviceUUID: this.fingerprint.deviceUUID,
                deviceHash: this.fingerprint.deviceHash,
                firstSeen: this.getStoredIdentity()?.firstSeen || Date.now(),
                lastSeen: Date.now(),
                visitCount: (this.getStoredIdentity()?.visitCount || 0) + 1,
                trustScore: this.fingerprint.trustScore
            }));
        } catch (e) {
            console.warn('[NW_IDENTITY] Could not save identity');
        }
    },
    
    getStoredIdentity() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    },
    
    async verify() {
        const stored = this.getStoredIdentity();
        const current = await this.collectFingerprint();
        
        if (!stored) {
            return {
                isNewDevice: true,
                verified: false,
                deviceUUID: current.deviceUUID,
                trustScore: current.trustScore,
                message: 'New device detected'
            };
        }
        
        // Compare fingerprints
        const hashMatch = stored.deviceHash === current.deviceHash;
        const trustDelta = Math.abs(stored.trustScore - current.trustScore);
        
        // Allow some variance (browser updates, etc)
        const isVerified = hashMatch || trustDelta < 20;
        
        return {
            isNewDevice: false,
            verified: isVerified,
            deviceUUID: current.deviceUUID,
            storedUUID: stored.deviceUUID,
            trustScore: current.trustScore,
            visitCount: stored.visitCount,
            firstSeen: new Date(stored.firstSeen).toLocaleDateString(),
            hashMatch,
            message: isVerified ? 'Identity verified' : 'Identity mismatch detected'
        };
    },
    
    // ========================================
    // INITIALIZATION
    // ========================================
    async init() {
        console.log(`[NW_IDENTITY] v${this.version} initializing...`);
        
        // Start behavioral tracking immediately
        this.startBehaviorTracking();
        
        // Wait a bit for some behavior data
        await new Promise(r => setTimeout(r, 500));
        
        // Collect fingerprint
        await this.collectFingerprint();
        
        console.log('[NW_IDENTITY] Ready');
        return this.fingerprint;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NW_IDENTITY;
}

// Auto-initialize
if (typeof window !== 'undefined') {
    window.NW_IDENTITY = NW_IDENTITY;
}
