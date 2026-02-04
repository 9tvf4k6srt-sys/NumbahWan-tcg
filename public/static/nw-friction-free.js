/**
 * NUMBAHWAN FRICTION-FREE SYSTEM v1.0
 * Eliminate ALL barriers to the flow state
 * 
 * Based on "Addiction by Design" principles:
 * - Remove decision fatigue
 * - Auto-handle confirmations
 * - Instant transitions
 * - Progressive disclosure
 * - Predictive preloading
 */

const NW_FRICTION_FREE = {
    version: '1.0.0',
    
    // =========================================
    // CONFIGURATION
    // =========================================
    config: {
        // Auto-confirm actions below this gold cost
        autoConfirmThreshold: 50,
        
        // Preload these pages
        preloadPages: ['/forge', '/battle', '/collection', '/wallet'],
        
        // Skip these dialogs after seeing them X times
        skipDialogAfter: 3,
        
        // Transition duration (ms)
        transitionSpeed: 200,
        
        // Enable smart defaults
        smartDefaults: true
    },
    
    // =========================================
    // TRACK SEEN DIALOGS
    // =========================================
    dialogsSeen: {},
    
    // =========================================
    // INITIALIZATION
    // =========================================
    init() {
        this.loadState();
        this.setupAutoConfirm();
        this.setupInstantTransitions();
        this.setupPreloading();
        this.setupSmartDefaults();
        this.eliminateConfirmationFatigue();
        this.setupProgressiveDisclosure();
        
        console.log(`✨ NW_FRICTION_FREE v${this.version} initialized - Smooth Sailing Mode`);
    },
    
    loadState() {
        const saved = localStorage.getItem('nw_friction_state');
        if (saved) {
            this.dialogsSeen = JSON.parse(saved).dialogsSeen || {};
        }
    },
    
    saveState() {
        localStorage.setItem('nw_friction_state', JSON.stringify({
            dialogsSeen: this.dialogsSeen
        }));
    },
    
    // =========================================
    // AUTO-CONFIRM LOW-COST ACTIONS
    // =========================================
    setupAutoConfirm() {
        // Intercept common confirmation patterns
        const originalConfirm = window.confirm;
        
        window.confirm = (message) => {
            // Check if this is a low-stakes confirmation
            const isLowStakes = this.isLowStakesAction(message);
            
            if (isLowStakes) {
                // Track for stats
                this.trackAutoConfirm(message);
                return true; // Auto-confirm
            }
            
            // Check if user has seen this many times
            const dialogId = this.hashMessage(message);
            this.dialogsSeen[dialogId] = (this.dialogsSeen[dialogId] || 0) + 1;
            this.saveState();
            
            if (this.dialogsSeen[dialogId] >= this.config.skipDialogAfter) {
                return true; // Auto-confirm after seeing multiple times
            }
            
            return originalConfirm(message);
        };
    },
    
    isLowStakesAction(message) {
        const lowStakesPatterns = [
            /open.*pack/i,
            /pull.*card/i,
            /start.*battle/i,
            /spend.*[0-4][0-9].*gold/i, // Under 50 gold
            /spend.*[1-9].*gold/i,
            /use.*[1-5].*wood/i,
            /continue/i,
            /proceed/i,
            /retry/i,
            /try.*again/i
        ];
        
        return lowStakesPatterns.some(pattern => pattern.test(message));
    },
    
    hashMessage(message) {
        return message.slice(0, 50).replace(/\d+/g, 'N'); // Normalize numbers
    },
    
    trackAutoConfirm(message) {
        const autoConfirms = parseInt(localStorage.getItem('nw_auto_confirms') || '0') + 1;
        localStorage.setItem('nw_auto_confirms', autoConfirms.toString());
    },
    
    // =========================================
    // INSTANT PAGE TRANSITIONS
    // =========================================
    setupInstantTransitions() {
        // Inject transition overlay
        const overlay = document.createElement('div');
        overlay.id = 'nw-page-transition';
        overlay.className = 'nw-page-transition';
        document.body.appendChild(overlay);
        
        // Intercept internal links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="/"], a[href^="./"]');
            if (!link) return;
            
            const href = link.getAttribute('href');
            if (!href || href.includes('#')) return;
            
            // Trigger smooth transition
            e.preventDefault();
            this.transitionTo(href);
        });
    },
    
    transitionTo(href) {
        const overlay = document.getElementById('nw-page-transition');
        if (!overlay) {
            location.href = href;
            return;
        }
        
        // Notify zone system
        if (typeof NW_ZONE !== 'undefined') {
            NW_ZONE.action('navigate');
        }
        
        // Quick fade out
        overlay.classList.add('active');
        
        setTimeout(() => {
            location.href = href;
        }, this.config.transitionSpeed);
    },
    
    // =========================================
    // PRELOADING SYSTEM
    // =========================================
    setupPreloading() {
        // Preload critical pages when idle
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => this.preloadCriticalPages());
        } else {
            setTimeout(() => this.preloadCriticalPages(), 2000);
        }
        
        // Preload on hover (for immediate interaction)
        document.addEventListener('mouseover', (e) => {
            const link = e.target.closest('a[href^="/"]');
            if (link) {
                const href = link.getAttribute('href');
                if (href && !this.preloadedUrls.has(href)) {
                    this.preloadPage(href);
                }
            }
        });
    },
    
    preloadedUrls: new Set(),
    
    preloadCriticalPages() {
        this.config.preloadPages.forEach(url => {
            this.preloadPage(url);
        });
    },
    
    preloadPage(url) {
        if (this.preloadedUrls.has(url)) return;
        
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
        
        this.preloadedUrls.add(url);
    },
    
    // =========================================
    // SMART DEFAULTS
    // =========================================
    setupSmartDefaults() {
        if (!this.config.smartDefaults) return;
        
        // Remember user preferences and auto-apply
        this.restoreUserPreferences();
        
        // Track selections for learning
        document.addEventListener('change', (e) => {
            const target = e.target;
            if (target.matches('select, input[type="radio"], input[type="checkbox"]')) {
                this.saveUserPreference(target);
            }
        });
    },
    
    saveUserPreference(element) {
        const prefs = JSON.parse(localStorage.getItem('nw_user_prefs') || '{}');
        const key = element.name || element.id || element.className;
        
        if (element.type === 'checkbox') {
            prefs[key] = element.checked;
        } else if (element.type === 'radio') {
            prefs[key] = element.value;
        } else {
            prefs[key] = element.value;
        }
        
        localStorage.setItem('nw_user_prefs', JSON.stringify(prefs));
    },
    
    restoreUserPreferences() {
        const prefs = JSON.parse(localStorage.getItem('nw_user_prefs') || '{}');
        
        Object.entries(prefs).forEach(([key, value]) => {
            const elements = document.querySelectorAll(`[name="${key}"], #${key}`);
            elements.forEach(el => {
                if (el.type === 'checkbox') {
                    el.checked = value;
                } else if (el.type === 'radio') {
                    if (el.value === value) el.checked = true;
                } else {
                    el.value = value;
                }
            });
        });
    },
    
    // =========================================
    // ELIMINATE CONFIRMATION FATIGUE
    // =========================================
    eliminateConfirmationFatigue() {
        // Replace modal confirmations with inline toast-style confirmations
        this.injectToastStyles();
        
        // Watch for and replace custom confirm modals
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && this.isConfirmationModal(node)) {
                        this.convertToQuickConfirm(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    },
    
    isConfirmationModal(node) {
        const text = node.textContent?.toLowerCase() || '';
        const hasConfirmWords = /(confirm|are you sure|proceed|continue\?|cancel)/i.test(text);
        const isModal = node.classList?.contains('modal') || 
                       node.classList?.contains('dialog') ||
                       node.classList?.contains('confirm') ||
                       node.getAttribute('role') === 'dialog';
        
        return hasConfirmWords && isModal;
    },
    
    convertToQuickConfirm(modal) {
        // Extract action and convert to quick inline confirm
        const confirmBtn = modal.querySelector('button.confirm, button.yes, button[data-confirm]');
        const cancelBtn = modal.querySelector('button.cancel, button.no, button[data-cancel]');
        
        if (confirmBtn && cancelBtn) {
            // Check if low stakes
            const modalText = modal.textContent;
            if (this.isLowStakesAction(modalText)) {
                // Auto-confirm and show toast
                this.showQuickToast('✓ Confirmed');
                confirmBtn.click();
                modal.remove();
            }
        }
    },
    
    showQuickToast(message) {
        const toast = document.createElement('div');
        toast.className = 'nw-quick-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => toast.classList.add('show'));
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 1500);
    },
    
    injectToastStyles() {
        if (document.getElementById('nw-friction-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'nw-friction-styles';
        style.textContent = `
            /* Quick Toast */
            .nw-quick-toast {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                background: rgba(34, 197, 94, 0.95);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                opacity: 0;
                transition: all 0.3s ease;
                z-index: 10000;
            }
            .nw-quick-toast.show {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            
            /* Page Transition */
            .nw-page-transition {
                position: fixed;
                inset: 0;
                background: #0a0a0f;
                z-index: 100000;
                opacity: 0;
                pointer-events: none;
                transition: opacity ${this.config.transitionSpeed}ms ease;
            }
            .nw-page-transition.active {
                opacity: 1;
                pointer-events: all;
            }
        `;
        document.head.appendChild(style);
    },
    
    // =========================================
    // PROGRESSIVE DISCLOSURE
    // =========================================
    setupProgressiveDisclosure() {
        // Show only essential UI initially, reveal more as user engages
        this.setupLazyTooltips();
        this.setupContextualHelp();
    },
    
    setupLazyTooltips() {
        // Only show tooltips after multiple visits
        const visits = parseInt(localStorage.getItem('nw_total_visits') || '0');
        localStorage.setItem('nw_total_visits', (visits + 1).toString());
        
        if (visits < 3) {
            // New user - show helpful tooltips
            document.body.classList.add('nw-show-hints');
        } else {
            // Experienced user - hide clutter
            document.body.classList.add('nw-minimal-ui');
        }
    },
    
    setupContextualHelp() {
        // Show help only when user seems stuck
        let idleInArea = 0;
        let lastPosition = { x: 0, y: 0 };
        
        document.addEventListener('mousemove', (e) => {
            const distance = Math.sqrt(
                Math.pow(e.clientX - lastPosition.x, 2) + 
                Math.pow(e.clientY - lastPosition.y, 2)
            );
            
            if (distance < 50) {
                idleInArea += 100;
                
                if (idleInArea > 5000) {
                    this.showContextualHelp(e.clientX, e.clientY);
                    idleInArea = 0;
                }
            } else {
                idleInArea = 0;
            }
            
            lastPosition = { x: e.clientX, y: e.clientY };
        });
    },
    
    showContextualHelp(x, y) {
        // Find nearest interactive element
        const elementAtPoint = document.elementFromPoint(x, y);
        const interactive = elementAtPoint?.closest('button, a, .card, .pack');
        
        if (interactive && !interactive.dataset.helpShown) {
            const helpText = this.getHelpText(interactive);
            if (helpText) {
                this.showMiniHelp(interactive, helpText);
                interactive.dataset.helpShown = 'true';
            }
        }
    },
    
    getHelpText(element) {
        const classList = element.className.toLowerCase();
        const text = element.textContent?.toLowerCase() || '';
        
        if (classList.includes('pack') || text.includes('open')) {
            return 'Click to open and reveal cards!';
        }
        if (classList.includes('battle') || text.includes('battle')) {
            return 'Start a quick battle to earn rewards!';
        }
        if (classList.includes('card')) {
            return 'Click to view card details';
        }
        
        return null;
    },
    
    showMiniHelp(element, text) {
        const help = document.createElement('div');
        help.className = 'nw-mini-help';
        help.textContent = text;
        
        const rect = element.getBoundingClientRect();
        help.style.top = `${rect.bottom + 8}px`;
        help.style.left = `${rect.left + rect.width / 2}px`;
        
        document.body.appendChild(help);
        requestAnimationFrame(() => help.classList.add('show'));
        
        setTimeout(() => {
            help.classList.remove('show');
            setTimeout(() => help.remove(), 300);
        }, 3000);
    },
    
    // =========================================
    // ONE-CLICK EVERYWHERE
    // =========================================
    enableOneClickMode() {
        // Everything should be achievable in ONE click
        
        // Auto-select first option in choice dialogs
        document.addEventListener('DOMNodeInserted', (e) => {
            if (e.target.classList?.contains('choice-dialog')) {
                const firstOption = e.target.querySelector('.choice-option');
                if (firstOption) {
                    firstOption.classList.add('nw-recommended');
                    firstOption.focus();
                }
            }
        });
        
        // Enable keyboard shortcuts for common actions
        document.addEventListener('keydown', (e) => {
            // Space = primary action
            if (e.key === ' ' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                const primaryBtn = document.querySelector('.primary-action, .cta, button.primary, .nw-fab-pulse');
                if (primaryBtn) primaryBtn.click();
            }
            
            // Enter = confirm
            if (e.key === 'Enter') {
                const confirmBtn = document.querySelector('.confirm-btn, .modal .primary, .dialog .yes');
                if (confirmBtn) confirmBtn.click();
            }
        });
    }
};

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NW_FRICTION_FREE.init());
} else {
    NW_FRICTION_FREE.init();
}

// Expose globally
window.NW_FRICTION_FREE = NW_FRICTION_FREE;

console.log('✨ NW_FRICTION_FREE module loaded - Zero Friction Mode');
