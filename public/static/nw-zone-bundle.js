/**
 * NUMBAHWAN ZONE BUNDLE v1.0
 * Single file to include for full zone system
 * 
 * Include this after other NW scripts:
 * <script src="/static/nw-zone-bundle.js" defer></script>
 * 
 * This will load:
 * - NW_ZONE: Flow state and variable rewards
 * - NW_LOOPS: Seamless action loops
 * - NW_FRICTION_FREE: Friction elimination
 * - NW_HOOKS: Engagement hooks (pity whisper, comeback, set radar, streaks, momentum)
 */

(function() {
    'use strict';
    
    const ZONE_SCRIPTS = [
        '/static/nw-zone.js',
        '/static/nw-seamless-loops.js',
        '/static/nw-friction-free.js',
        '/static/nw-engagement-hooks.js'
    ];
    
    // Load scripts in sequence
    let loadedCount = 0;
    
    function loadNext() {
        if (loadedCount >= ZONE_SCRIPTS.length) {
            console.log('NW ZONE BUNDLE - All systems active');
            document.dispatchEvent(new CustomEvent('nw-zone-ready'));
            return;
        }
        
        const script = document.createElement('script');
        script.src = ZONE_SCRIPTS[loadedCount];
        script.onload = () => {
            loadedCount++;
            loadNext();
        };
        script.onerror = () => {
            console.warn(`Failed to load: ${ZONE_SCRIPTS[loadedCount]}`);
            loadedCount++;
            loadNext();
        };
        document.head.appendChild(script);
    }
    
    // Start loading after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadNext);
    } else {
        loadNext();
    }
})();
