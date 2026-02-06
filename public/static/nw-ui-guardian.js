/**
 * NW UI Guardian v2.0
 * Automatic Overlap Detection & Fix System
 * 
 * FEATURES:
 * - Detects overlapping fixed/absolute UI elements
 * - Auto-repositions elements to prevent overlap
 * - Reports issues in console for developers
 * - Debug mode shows visual outlines
 * - Smart priority-based repositioning
 * 
 * USAGE:
 * NW_UI_GUARDIAN.debug(true)  - Enable debug mode (shows overlaps visually)
 * NW_UI_GUARDIAN.check()      - Manual check for overlaps
 * NW_UI_GUARDIAN.status()     - Get current overlap status
 * NW_UI_GUARDIAN.fix()        - Force auto-fix now
 */

const NW_UI_GUARDIAN = {
    version: '2.0.0',
    enabled: true,
    debugMode: false,
    checkInterval: null,
    
    // Elements to monitor (CSS selectors) with their priority (higher = more important = don't move)
    monitored: [
        { sel: '.season-selector', priority: 9, zone: 'top' },
        { sel: '.name-banner', priority: 8, zone: 'top' },
        { sel: '.ctr', priority: 4, zone: 'bottom-left' },
        { sel: '.filters', priority: 7, zone: 'bottom' },
        { sel: '.nav-wrap', priority: 8, zone: 'bottom' },
        { sel: '.hint', priority: 3, zone: 'bottom' },
        { sel: '.nw-nav-toggle', priority: 6, zone: 'corner' },
        { sel: '.nw-nav-home', priority: 6, zone: 'corner' },
        { sel: '.hdr', priority: 10, zone: 'top' }
    ],
    
    // Min gap between elements (in pixels)
    MIN_GAP: 8,
    
    init() {
        if (!this.enabled) return;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.start());
        } else {
            this.start();
        }
    },
    
    start() {
        // Initial check after rendering
        setTimeout(() => this.checkAndFix(), 800);
        
        // Re-check on resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.checkAndFix(), 300);
        });
        
        // Re-check on orientation change (mobile)
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.checkAndFix(), 500);
        });
        
        console.log(`%c[NW_UI_GUARDIAN] v${this.version} initialized`, 'color: #00ff00; font-weight: bold');
        console.log('%c  Commands: NW_UI_GUARDIAN.debug(true), .check(), .status()', 'color: #888');
    },
    
    // Get element info including bounding rect
    getElementInfo(selector) {
        const el = document.querySelector(selector);
        if (!el || !this.isVisible(el)) return null;
        
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        
        return {
            element: el,
            selector: selector,
            rect: {
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                width: rect.width,
                height: rect.height,
                centerX: rect.left + rect.width / 2,
                centerY: rect.top + rect.height / 2
            },
            style: {
                position: style.position,
                top: style.top,
                bottom: style.bottom,
                left: style.left,
                right: style.right
            }
        };
    },
    
    // Check if element is visible
    isVisible(el) {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               parseFloat(style.opacity) > 0 &&
               el.offsetParent !== null;
    },
    
    // Check if two rectangles overlap
    rectsOverlap(r1, r2) {
        return !(r1.right <= r2.left || 
                 r1.left >= r2.right || 
                 r1.bottom <= r2.top || 
                 r1.top >= r2.bottom);
    },
    
    // Calculate overlap details
    getOverlapDetails(r1, r2) {
        if (!this.rectsOverlap(r1, r2)) return null;
        
        const overlapLeft = Math.max(r1.left, r2.left);
        const overlapRight = Math.min(r1.right, r2.right);
        const overlapTop = Math.max(r1.top, r2.top);
        const overlapBottom = Math.min(r1.bottom, r2.bottom);
        
        return {
            area: (overlapRight - overlapLeft) * (overlapBottom - overlapTop),
            width: overlapRight - overlapLeft,
            height: overlapBottom - overlapTop,
            horizontal: r1.centerX < r2.centerX ? 'left' : 'right',
            vertical: r1.centerY < r2.centerY ? 'above' : 'below'
        };
    },
    
    // Main check function
    check() {
        return this.checkAndFix(false);
    },
    
    // Check and optionally fix overlaps
    checkAndFix(autoFix = true) {
        const elements = [];
        
        // Gather all visible monitored elements
        this.monitored.forEach(m => {
            const info = this.getElementInfo(m.sel);
            if (info) {
                info.priority = m.priority;
                info.zone = m.zone;
                elements.push(info);
            }
        });
        
        const overlaps = [];
        
        // Check each pair for overlap
        for (let i = 0; i < elements.length; i++) {
            for (let j = i + 1; j < elements.length; j++) {
                const details = this.getOverlapDetails(elements[i].rect, elements[j].rect);
                if (details && details.area > 25) { // Ignore tiny overlaps < 25px squared
                    overlaps.push({
                        el1: elements[i],
                        el2: elements[j],
                        ...details
                    });
                }
            }
        }
        
        if (overlaps.length > 0) {
            this.reportOverlaps(overlaps);
            
            if (this.debugMode) {
                this.highlightOverlaps(overlaps);
            }
            
            if (autoFix) {
                this.autoFixOverlaps(overlaps);
            }
        } else {
            if (this.debugMode) {
                console.log('%c[NW_UI_GUARDIAN] No overlaps detected', 'color: #00ff00');
                this.clearHighlights();
            }
        }
        
        return overlaps;
    },
    
    // Report overlaps to console
    reportOverlaps(overlaps) {
        console.group('%c[NW_UI_GUARDIAN] OVERLAPS DETECTED', 'color: #ff6b00; font-weight: bold');
        overlaps.forEach((o, i) => {
            console.warn(
                `#${i + 1}: "${o.el1.selector}" overlaps "${o.el2.selector}"`,
                `(${o.area.toFixed(0)}px, ${o.width.toFixed(0)}x${o.height.toFixed(0)})`
            );
            console.log('  ', o.el1.element, '  vs  ', o.el2.element);
        });
        console.log('%cRun NW_UI_GUARDIAN.fix() to attempt auto-fix', 'color: #888');
        console.groupEnd();
    },
    
    // Visual highlight for debugging
    highlightOverlaps(overlaps) {
        this.clearHighlights();
        
        const colors = ['#ff0000', '#ff6600', '#ffcc00'];
        overlaps.forEach((o, i) => {
            const color = colors[i % colors.length];
            [o.el1.element, o.el2.element].forEach(el => {
                el.style.outline = `3px solid ${color}`;
                el.style.outlineOffset = '2px';
                el.dataset.nwGuardianOverlap = 'true';
            });
        });
    },
    
    clearHighlights() {
        document.querySelectorAll('[data-nw-guardian-overlap]').forEach(el => {
            el.style.outline = '';
            el.style.outlineOffset = '';
            delete el.dataset.nwGuardianOverlap;
        });
    },
    
    // Auto-fix overlaps
    autoFixOverlaps(overlaps) {
        overlaps.forEach(o => {
            // Move the lower priority element
            const toMove = o.el1.priority < o.el2.priority ? o.el1 : o.el2;
            const fixed = o.el1.priority < o.el2.priority ? o.el2 : o.el1;
            
            this.repositionElement(toMove, fixed, o);
        });
    },
    
    // Force fix (manual trigger)
    fix() {
        const overlaps = this.check();
        if (overlaps.length > 0) {
            this.autoFixOverlaps(overlaps);
            console.log(`%c[NW_UI_GUARDIAN] Fixed ${overlaps.length} overlap(s)`, 'color: #00ff00');
        }
        return overlaps;
    },
    
    // Reposition an element to avoid overlap
    repositionElement(toMove, fixed, overlap) {
        const el = toMove.element;
        const style = window.getComputedStyle(el);
        
        if (style.position !== 'fixed' && style.position !== 'absolute') {
            console.log(`[NW_UI_GUARDIAN] Cannot move "${toMove.selector}" - not fixed/absolute`);
            return;
        }
        
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        
        // Strategy based on zone
        switch (toMove.zone) {
            case 'bottom-left':
                // Move further left
                el.style.left = '10px';
                el.style.transform = 'none';
                console.log(`%c[NW_UI_GUARDIAN] Moved "${toMove.selector}" to left corner`, 'color: #00ff00');
                break;
                
            case 'bottom':
                // Move down (increase bottom value)
                const currentBottom = parseFloat(style.bottom) || 0;
                const newBottom = currentBottom + overlap.height + this.MIN_GAP;
                el.style.bottom = `${newBottom}px`;
                console.log(`%c[NW_UI_GUARDIAN] Moved "${toMove.selector}" down (bottom: ${newBottom}px)`, 'color: #00ff00');
                break;
                
            case 'top':
                // Move down (increase top value)
                const currentTop = parseFloat(style.top) || 0;
                const newTop = currentTop + overlap.height + this.MIN_GAP;
                el.style.top = `${newTop}px`;
                console.log(`%c[NW_UI_GUARDIAN] Moved "${toMove.selector}" down (top: ${newTop}px)`, 'color: #00ff00');
                break;
                
            case 'corner':
                // Move to opposite corner if possible
                const spaceLeft = fixed.rect.left;
                const spaceRight = screenW - fixed.rect.right;
                
                if (spaceLeft > toMove.rect.width + 20) {
                    el.style.left = '10px';
                    el.style.right = 'auto';
                } else if (spaceRight > toMove.rect.width + 20) {
                    el.style.right = '10px';
                    el.style.left = 'auto';
                }
                console.log(`%c[NW_UI_GUARDIAN] Moved "${toMove.selector}" to corner`, 'color: #00ff00');
                break;
                
            default:
                // Generic: move in the direction with most space
                if (overlap.vertical === 'below') {
                    const top = parseFloat(style.top);
                    if (!isNaN(top)) {
                        el.style.top = `${top + overlap.height + this.MIN_GAP}px`;
                    }
                } else {
                    const bottom = parseFloat(style.bottom);
                    if (!isNaN(bottom)) {
                        el.style.bottom = `${bottom + overlap.height + this.MIN_GAP}px`;
                    }
                }
        }
    },
    
    // Enable/disable debug mode
    debug(enable = true) {
        this.debugMode = enable;
        
        if (enable) {
            console.log('%c[NW_UI_GUARDIAN] Debug mode ON - overlaps will be highlighted', 'color: #00ff00');
            this.checkAndFix();
            
            // Periodic check in debug mode
            if (!this.checkInterval) {
                this.checkInterval = setInterval(() => this.checkAndFix(), 3000);
            }
        } else {
            console.log('%c[NW_UI_GUARDIAN] Debug mode OFF', 'color: #888');
            this.clearHighlights();
            
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
        }
    },
    
    // Get current status
    status() {
        const overlaps = this.check();
        const status = {
            version: this.version,
            enabled: this.enabled,
            debugMode: this.debugMode,
            overlapsFound: overlaps.length,
            overlaps: overlaps.map(o => ({
                elements: [o.el1.selector, o.el2.selector],
                area: o.area,
                size: `${o.width.toFixed(0)}x${o.height.toFixed(0)}`
            })),
            monitored: this.monitored.map(m => m.sel)
        };
        
        console.table(status.overlaps);
        return status;
    },
    
    // Add new element to monitor
    addMonitor(selector, priority = 5, zone = 'auto') {
        this.monitored.push({ sel: selector, priority, zone });
        console.log(`%c[NW_UI_GUARDIAN] Now monitoring: ${selector}`, 'color: #00ff00');
    }
};

// Auto-initialize
NW_UI_GUARDIAN.init();

// Expose globally for console access
if (typeof window !== 'undefined') {
    window.NW_UI_GUARDIAN = NW_UI_GUARDIAN;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NW_UI_GUARDIAN;
}
