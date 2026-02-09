/**
 * NW UI Guardian v3.0
 * AUTOMATIC Overlap Detection & Auto-Fix System
 * 
 * This runs AUTOMATICALLY on every page load:
 * 1. Detects all overlapping UI elements
 * 2. Auto-fixes them by repositioning
 * 3. Reports issues to console with CSS fix suggestions
 * 
 * For developers: Check console for [UI_GUARDIAN] messages
 */

const NW_UI_GUARDIAN = {
    version: '3.0.0',
    enabled: true,
    autoFix: true, // AUTOMATICALLY fix overlaps
    
    // Elements to monitor with priority (higher = stays put, lower = gets moved)
    monitored: [
        { sel: '.hdr', priority: 10, zone: 'top', desc: 'Header' },
        { sel: '.season-selector', priority: 9, zone: 'top', desc: 'Season Selector' },
        { sel: '.name-banner', priority: 8, zone: 'top', desc: 'Name Banner' },
        { sel: '.nav-wrap', priority: 8, zone: 'bottom', desc: 'Navigation' },
        { sel: '.filters', priority: 7, zone: 'bottom', desc: 'Filter Buttons' },
        { sel: '.nw-nav-toggle', priority: 6, zone: 'corner', desc: 'Menu Toggle' },
        { sel: '.nw-nav-home', priority: 6, zone: 'corner', desc: 'Home Button' },
        { sel: '.ctr', priority: 4, zone: 'bottom-left', desc: 'Card Counter' },
        { sel: '.hint', priority: 3, zone: 'bottom', desc: 'Hint Text' }
    ],
    
    MIN_GAP: 10, // Minimum gap between elements
    issues: [],
    fixes: [],
    
    // Initialize on load
    init() {
        if (!this.enabled) return;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.run());
        } else {
            // Run after a short delay to let CSS render
            setTimeout(() => this.run(), 500);
        }
        
        // Also run on resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.run(), 300);
        });
    },
    
    // Main run function - called automatically
    run() {
        this.issues = [];
        this.fixes = [];
        
        const overlaps = this.detectOverlaps();
        
        if (overlaps.length > 0) {
            this.reportIssues(overlaps);
            
            if (this.autoFix) {
                this.fixOverlaps(overlaps);
            }
        }
        
        return overlaps;
    },
    
    // Get element bounding box
    getRect(el) {
        const rect = el.getBoundingClientRect();
        return {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2
        };
    },
    
    // Check if element is visible
    isVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               parseFloat(style.opacity) > 0;
    },
    
    // Check if two rectangles overlap
    rectsOverlap(r1, r2, gap = 0) {
        return !(r1.right + gap <= r2.left || 
                 r1.left >= r2.right + gap || 
                 r1.bottom + gap <= r2.top || 
                 r1.top >= r2.bottom + gap);
    },
    
    // Detect all overlapping elements
    detectOverlaps() {
        const elements = [];
        
        // Gather visible elements
        this.monitored.forEach(m => {
            const el = document.querySelector(m.sel);
            if (el && this.isVisible(el)) {
                elements.push({
                    el: el,
                    sel: m.sel,
                    priority: m.priority,
                    zone: m.zone,
                    desc: m.desc,
                    rect: this.getRect(el)
                });
            }
        });
        
        const overlaps = [];
        
        // Check each pair
        for (let i = 0; i < elements.length; i++) {
            for (let j = i + 1; j < elements.length; j++) {
                if (this.rectsOverlap(elements[i].rect, elements[j].rect)) {
                    // Calculate overlap area
                    const r1 = elements[i].rect;
                    const r2 = elements[j].rect;
                    const overlapWidth = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left);
                    const overlapHeight = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
                    const area = overlapWidth * overlapHeight;
                    
                    if (area > 50) { // Ignore tiny overlaps
                        overlaps.push({
                            el1: elements[i],
                            el2: elements[j],
                            area: area,
                            width: overlapWidth,
                            height: overlapHeight
                        });
                    }
                }
            }
        }
        
        return overlaps;
    },
    
    // Report issues to console with CSS fix suggestions
    reportIssues(overlaps) {
        console.log('%c[UI_GUARDIAN] v3.0 - OVERLAP DETECTED!', 'background: #ff0000; color: white; padding: 4px 8px; font-weight: bold;');
        console.log('%c Found ' + overlaps.length + ' overlapping element pair(s)', 'color: #ff6b00; font-weight: bold;');
        
        overlaps.forEach((o, i) => {
            const lower = o.el1.priority < o.el2.priority ? o.el1 : o.el2;
            const higher = o.el1.priority < o.el2.priority ? o.el2 : o.el1;
            
            console.group(`%c#${i+1}: ${o.el1.desc} ↔ ${o.el2.desc}`, 'color: #ff6b00');
            console.log(`Overlap: ${o.width.toFixed(0)}×${o.height.toFixed(0)}px (${o.area.toFixed(0)}px²)`);
            console.log(`Elements:`, o.el1.el, o.el2.el);
            
            // Generate CSS fix suggestion
            const style = window.getComputedStyle(lower.el);
            const suggestion = this.generateFixSuggestion(lower, higher, o);
            console.log('%cSuggested CSS fix:', 'color: #00ff00');
            console.log(`%c${suggestion}`, 'background: #1a1a2e; color: #00ff00; padding: 8px; font-family: monospace;');
            
            console.groupEnd();
        });
    },
    
    // Generate CSS fix suggestion
    generateFixSuggestion(toMove, fixed, overlap) {
        const style = window.getComputedStyle(toMove.el);
        const fixedStyle = window.getComputedStyle(fixed.el);
        
        let css = `${toMove.sel} {\n`;
        
        if (toMove.zone === 'bottom-left' || toMove.zone === 'bottom') {
            // Move further down or to the side
            const currentBottom = parseFloat(style.bottom) || 0;
            const newBottom = currentBottom + overlap.height + this.MIN_GAP;
            css += `  bottom: ${newBottom}px; /* was ${currentBottom}px */\n`;
            
            // If centered and overlapping centered element, move to left
            if (style.left === '50%' && style.transform.includes('translateX')) {
                css += `  left: 12px; /* move to left side */\n`;
                css += `  transform: none; /* remove centering */\n`;
            }
        } else if (toMove.zone === 'top') {
            const currentTop = parseFloat(style.top) || 0;
            const newTop = currentTop + overlap.height + this.MIN_GAP;
            css += `  top: ${newTop}px; /* was ${currentTop}px */\n`;
        }
        
        css += `}`;
        return css;
    },
    
    // Auto-fix overlaps
    fixOverlaps(overlaps) {
        console.log('%c[UI_GUARDIAN] Auto-fixing...', 'color: #00ff00');
        
        overlaps.forEach(o => {
            const toMove = o.el1.priority < o.el2.priority ? o.el1 : o.el2;
            const fixed = o.el1.priority < o.el2.priority ? o.el2 : o.el1;
            
            this.repositionElement(toMove, fixed, o);
        });
        
        // Verify fix worked
        setTimeout(() => {
            const remaining = this.detectOverlaps();
            if (remaining.length === 0) {
                console.log('%c[UI_GUARDIAN] All overlaps fixed!', 'color: #00ff00; font-weight: bold');
            } else {
                console.log('%c[UI_GUARDIAN] Some overlaps remain - may need manual CSS fix', 'color: #ff6b00');
            }
        }, 100);
    },
    
    // Reposition an element
    repositionElement(toMove, fixed, overlap) {
        const el = toMove.el;
        const style = window.getComputedStyle(el);
        
        // Strategy based on zone
        if (toMove.zone === 'bottom-left') {
            // Move to corner
            el.style.left = '12px';
            el.style.transform = 'none';
            el.style.right = 'auto';
            
            // Also check vertical positioning
            const currentBottom = parseFloat(style.bottom) || 0;
            if (overlap.height > 20) {
                el.style.bottom = (currentBottom + overlap.height + this.MIN_GAP) + 'px';
            }
            
            this.fixes.push(`Moved ${toMove.desc} to left corner`);
            console.log(`%c  Moved ${toMove.desc} to left corner`, 'color: #00ff00');
            
        } else if (toMove.zone === 'bottom') {
            // Move down
            const currentBottom = parseFloat(style.bottom) || 0;
            const newBottom = currentBottom + overlap.height + this.MIN_GAP;
            el.style.bottom = newBottom + 'px';
            
            this.fixes.push(`Moved ${toMove.desc} down to bottom: ${newBottom}px`);
            console.log(`%c  Moved ${toMove.desc} down (bottom: ${newBottom}px)`, 'color: #00ff00');
            
        } else if (toMove.zone === 'top') {
            // Move down from top
            const currentTop = parseFloat(style.top) || 0;
            const newTop = currentTop + overlap.height + this.MIN_GAP;
            el.style.top = newTop + 'px';
            
            this.fixes.push(`Moved ${toMove.desc} down to top: ${newTop}px`);
            console.log(`%c  Moved ${toMove.desc} down (top: ${newTop}px)`, 'color: #00ff00');
        }
    },
    
    // Manual commands
    check() {
        return this.detectOverlaps();
    },
    
    fix() {
        const overlaps = this.detectOverlaps();
        if (overlaps.length > 0) {
            this.fixOverlaps(overlaps);
        } else {
            console.log('%c[UI_GUARDIAN] No overlaps to fix!', 'color: #00ff00');
        }
        return overlaps;
    },
    
    status() {
        const overlaps = this.detectOverlaps();
        return {
            version: this.version,
            overlaps: overlaps.length,
            autoFix: this.autoFix,
            fixes: this.fixes,
            elements: this.monitored.map(m => ({
                selector: m.sel,
                desc: m.desc,
                visible: this.isVisible(document.querySelector(m.sel))
            }))
        };
    },
    
    // Debug mode - highlight overlaps
    debug(enable = true) {
        if (enable) {
            const overlaps = this.detectOverlaps();
            overlaps.forEach(o => {
                o.el1.el.style.outline = '3px solid red';
                o.el2.el.style.outline = '3px solid red';
            });
            console.log('%c[UI_GUARDIAN] Debug: Highlighted overlapping elements in red', 'color: #ff0000');
        } else {
            this.monitored.forEach(m => {
                const el = document.querySelector(m.sel);
                if (el) el.style.outline = '';
            });
        }
    }
};

// AUTO-INITIALIZE
NW_UI_GUARDIAN.init();

// Expose to window
if (typeof window !== 'undefined') {
    window.NW_UI_GUARDIAN = NW_UI_GUARDIAN;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NW_UI_GUARDIAN;
}
