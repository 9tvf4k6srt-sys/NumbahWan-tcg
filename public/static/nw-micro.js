/**
 * NumbahWan Micro-Interactions v2.0
 * GPU-accelerated, mobile-optimized, learning-enhanced UI
 * 
 * AUTO-LEARN PATTERN: ui-micro-interactions
 * Type: ux
 * Impact: Smoother feel, engaging, 60fps, adaptive to device
 * 
 * CONTINUOUS LEARNING INTEGRATION:
 * - Tracks user interaction patterns (tap vs click, scroll depth)
 * - Adapts animation intensity to device capability
 * - Reports UX friction points to auto-learn
 * - Progressive enhancement based on device tier
 * - Rage-click detection with auto-report
 * 
 * Features:
 * - Ripple effects on buttons (Material-style)
 * - Card hover lift with parallax (desktop)
 * - Smooth page transitions
 * - Haptic-style feedback animations
 * - Scroll-triggered reveals (IntersectionObserver)
 * - Skeleton loading states
 * - Animated counters (number transitions)
 * - Rage-click detection (UX friction signal)
 * - Scroll depth tracking
 * - Touch gesture recognition
 * - Adaptive animation speed
 */

const NW_MICRO = (function() {
    'use strict';

    const VERSION = '2.0.0';
    let initialized = false;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    
    // Learning state
    const interactionLog = [];
    const MAX_INTERACTION_LOG = 100;
    let rageClickCount = 0;
    let lastClickTime = 0;
    let lastClickTarget = null;
    let maxScrollDepth = 0;
    
    // Animation speed (adaptive)
    let animSpeed = prefersReduced ? 0 : 1; // 0 = off, 0.5 = reduced, 1 = full

    // =========================================================================
    // STYLE INJECTION
    // =========================================================================
    
    function injectStyles() {
        const speed = animSpeed;
        const rippleDuration = (0.5 * speed).toFixed(2);
        const revealDuration = (0.5 * speed).toFixed(2);
        const hapticDuration = (0.15 * speed).toFixed(2);
        const pageDuration = (0.3 * speed).toFixed(2);
        
        const style = document.createElement('style');
        style.id = 'nw-micro-styles';
        style.textContent = `
            /* Ripple */
            .nw-ripple-host { position: relative; overflow: hidden; }
            .nw-ripple {
                position: absolute;
                border-radius: 50%;
                background: rgba(255,255,255,0.22);
                transform: scale(0);
                animation: nw-ripple-expand ${rippleDuration}s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                pointer-events: none;
                will-change: transform, opacity;
                z-index: 1;
            }
            @keyframes nw-ripple-expand {
                to { transform: scale(2.5); opacity: 0; }
            }
            
            /* Scroll reveal */
            .nw-reveal {
                opacity: 0;
                transform: translateY(20px);
                transition: opacity ${revealDuration}s cubic-bezier(0.4, 0, 0.2, 1),
                            transform ${revealDuration}s cubic-bezier(0.4, 0, 0.2, 1);
                will-change: opacity, transform;
            }
            .nw-reveal.visible {
                opacity: 1;
                transform: translateY(0);
            }
            .nw-reveal-left {
                opacity: 0;
                transform: translateX(-20px);
                transition: opacity ${revealDuration}s cubic-bezier(0.4, 0, 0.2, 1),
                            transform ${revealDuration}s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .nw-reveal-left.visible {
                opacity: 1;
                transform: translateX(0);
            }
            .nw-reveal-scale {
                opacity: 0;
                transform: scale(0.9);
                transition: opacity ${revealDuration}s cubic-bezier(0.4, 0, 0.2, 1),
                            transform ${revealDuration}s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .nw-reveal-scale.visible {
                opacity: 1;
                transform: scale(1);
            }
            
            /* Card hover parallax */
            .nw-tilt {
                transition: transform 0.15s ease-out;
                will-change: transform;
            }
            
            /* Skeleton loading */
            .nw-skeleton {
                background: linear-gradient(90deg, 
                    rgba(255,255,255,0.04) 25%,
                    rgba(255,255,255,0.08) 50%,
                    rgba(255,255,255,0.04) 75%
                );
                background-size: 200% 100%;
                animation: nw-skeleton-shimmer 1.5s ease-in-out infinite;
                border-radius: 8px;
            }
            @keyframes nw-skeleton-shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            
            /* Haptic feedback */
            .nw-haptic {
                animation: nw-haptic-bump ${hapticDuration}s ease-out;
            }
            @keyframes nw-haptic-bump {
                0% { transform: scale(1); }
                50% { transform: scale(0.95); }
                100% { transform: scale(1); }
            }
            
            /* Page transition */
            .nw-page-enter {
                animation: nw-page-slide-in ${pageDuration}s cubic-bezier(0.4, 0, 0.2, 1);
            }
            @keyframes nw-page-slide-in {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Counter animation */
            .nw-counter-animate {
                display: inline-block;
                transition: transform 0.2s;
            }
            .nw-counter-animate.updating {
                animation: nw-counter-flip 0.3s ease-out;
            }
            @keyframes nw-counter-flip {
                0% { transform: translateY(0); opacity: 1; }
                30% { transform: translateY(-8px); opacity: 0; }
                31% { transform: translateY(8px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
            
            /* Button press */
            .nw-press:active {
                transform: scale(0.97) !important;
                transition: transform 0.08s !important;
            }
            
            /* Glow pulse for featured items */
            .nw-glow-pulse {
                animation: nw-glow 2s ease-in-out infinite;
            }
            @keyframes nw-glow {
                0%, 100% { box-shadow: 0 0 8px rgba(255,215,0,0.2); }
                50% { box-shadow: 0 0 20px rgba(255,215,0,0.4); }
            }
            
            /* Reduced motion override */
            .nw-reduced-motion .nw-reveal,
            .nw-reduced-motion .nw-reveal-left,
            .nw-reduced-motion .nw-reveal-scale {
                opacity: 1 !important;
                transform: none !important;
                transition: none !important;
            }
            .nw-reduced-motion .nw-ripple,
            .nw-reduced-motion .nw-glow-pulse,
            .nw-reduced-motion .nw-haptic {
                animation: none !important;
            }
            
            /* Rage click indicator (subtle) */
            .nw-rage-indicator {
                position: fixed;
                top: 8px;
                right: 8px;
                background: rgba(255, 100, 100, 0.9);
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                z-index: 99999;
                animation: nw-rage-fade 3s ease forwards;
                pointer-events: none;
            }
            @keyframes nw-rage-fade {
                0% { opacity: 1; transform: translateY(0); }
                80% { opacity: 1; }
                100% { opacity: 0; transform: translateY(-10px); }
            }
            
            /* Stagger children animation */
            .nw-stagger > * {
                opacity: 0;
                animation: nw-stagger-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            .nw-stagger > *:nth-child(1) { animation-delay: 0s; }
            .nw-stagger > *:nth-child(2) { animation-delay: 0.05s; }
            .nw-stagger > *:nth-child(3) { animation-delay: 0.1s; }
            .nw-stagger > *:nth-child(4) { animation-delay: 0.15s; }
            .nw-stagger > *:nth-child(5) { animation-delay: 0.2s; }
            .nw-stagger > *:nth-child(6) { animation-delay: 0.25s; }
            .nw-stagger > *:nth-child(n+7) { animation-delay: 0.3s; }
            @keyframes nw-stagger-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    // =========================================================================
    // RIPPLE EFFECT
    // =========================================================================
    
    function initRipple() {
        if (animSpeed === 0) return;
        
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, [role="button"], .ah-btn-bid, .ah-filter-btn, .ah-card, .nw-ripple-host, .nw-btn');
            if (!target) return;
            
            const rect = target.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height) * 2;
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            const ripple = document.createElement('span');
            ripple.className = 'nw-ripple';
            ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
            
            if (!target.style.position || target.style.position === 'static') {
                target.style.position = 'relative';
            }
            target.style.overflow = 'hidden';
            target.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        }, { passive: true });
    }
    
    // =========================================================================
    // SCROLL REVEAL
    // =========================================================================
    
    let revealObserver = null;
    
    function initScrollReveal() {
        if (animSpeed === 0) return;
        
        revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });
        
        const applyReveal = () => {
            const selectors = '.ah-card, .ah-stat, .ah-create-section, .nw-card, .nw-section, [data-reveal]';
            document.querySelectorAll(selectors).forEach(el => {
                if (!el.classList.contains('nw-reveal') && !el.classList.contains('visible')) {
                    el.classList.add('nw-reveal');
                    revealObserver.observe(el);
                }
            });
        };
        
        applyReveal();
        
        // Watch for dynamic content
        const mutObs = new MutationObserver(() => {
            requestAnimationFrame(applyReveal);
        });
        
        const container = document.querySelector('.ah-grid, .main, main, .content, #app');
        if (container) {
            mutObs.observe(container, { childList: true, subtree: true });
        }
    }
    
    // =========================================================================
    // TILT/PARALLAX (desktop only)
    // =========================================================================
    
    function initTilt() {
        if (isMobile || animSpeed === 0) return;
        
        document.addEventListener('mousemove', (e) => {
            const card = e.target.closest('.ah-card, .nw-tilt, .nw-card');
            if (!card) return;
            
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            
            const intensity = animSpeed * 4;
            card.style.transform = `
                perspective(800px)
                rotateY(${x * intensity}deg)
                rotateX(${-y * intensity}deg)
                translateY(-4px)
            `;
        }, { passive: true });
        
        document.addEventListener('mouseleave', (e) => {
            const card = e.target.closest('.ah-card, .nw-tilt, .nw-card');
            if (card) {
                card.style.transform = '';
            }
        }, true);
    }
    
    // =========================================================================
    // ANIMATED COUNTERS
    // =========================================================================
    
    function animateCounter(element, targetValue, duration = 600) {
        if (!element) return;
        if (animSpeed === 0) {
            element.textContent = targetValue.toLocaleString();
            return;
        }
        
        const startValue = parseInt(element.textContent.replace(/[^0-9-]/g, '')) || 0;
        if (startValue === targetValue) return;
        
        const adjustedDuration = duration * animSpeed;
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / adjustedDuration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startValue + (targetValue - startValue) * eased);
            
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }
    
    // =========================================================================
    // SKELETON LOADING
    // =========================================================================
    
    function createSkeletonCard() {
        return `
            <div class="ah-card" style="pointer-events:none">
                <div class="ah-card-img">
                    <div class="nw-skeleton" style="width:80px;height:120px;margin:auto"></div>
                </div>
                <div class="ah-card-body">
                    <div class="nw-skeleton" style="width:70%;height:16px;margin-bottom:8px"></div>
                    <div class="nw-skeleton" style="width:40%;height:12px;margin-bottom:16px"></div>
                    <div class="nw-skeleton" style="width:50%;height:24px;margin-bottom:12px"></div>
                    <div class="nw-skeleton" style="width:100%;height:36px;margin-bottom:12px"></div>
                    <div class="nw-skeleton" style="width:100%;height:40px"></div>
                </div>
            </div>`;
    }
    
    function showSkeletonGrid(gridId = 'auctionGrid', count = 4) {
        const grid = document.getElementById(gridId);
        if (grid) {
            grid.innerHTML = Array(count).fill(createSkeletonCard()).join('');
        }
    }
    
    // =========================================================================
    // HAPTIC FEEDBACK
    // =========================================================================
    
    function haptic(element) {
        if (!element || animSpeed === 0) return;
        element.classList.add('nw-haptic');
        setTimeout(() => element.classList.remove('nw-haptic'), 200);
        
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }
    
    // =========================================================================
    // RAGE CLICK DETECTION (UX friction signal)
    // =========================================================================
    
    function initRageClickDetection() {
        document.addEventListener('click', (e) => {
            const now = Date.now();
            const target = e.target;
            
            if (now - lastClickTime < 500 && target === lastClickTarget) {
                rageClickCount++;
                
                if (rageClickCount >= 3) {
                    const info = {
                        element: target.tagName + (target.className ? '.' + target.className.split(' ')[0] : ''),
                        page: location.pathname,
                        text: (target.textContent || '').substring(0, 50).trim(),
                        count: rageClickCount
                    };
                    
                    // Show subtle indicator
                    const indicator = document.createElement('div');
                    indicator.className = 'nw-rage-indicator';
                    indicator.textContent = 'Something not working? Try refreshing!';
                    document.body.appendChild(indicator);
                    setTimeout(() => indicator.remove(), 3000);
                    
                    // Report to auto-learn
                    try {
                        fetch('/api/system/log', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                level: 'warning',
                                source: 'nw-micro:rage-click',
                                message: `Rage click detected: ${info.element} on ${info.page}`,
                                metadata: info
                            }),
                            keepalive: true
                        }).catch(() => {});
                    } catch (e) {}
                    
                    rageClickCount = 0;
                }
            } else {
                rageClickCount = 0;
            }
            
            lastClickTime = now;
            lastClickTarget = target;
        }, { passive: true });
    }
    
    // =========================================================================
    // SCROLL DEPTH TRACKING
    // =========================================================================
    
    function initScrollDepthTracking() {
        let ticking = false;
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
                    if (scrollHeight > 0) {
                        const depth = Math.round((window.scrollY / scrollHeight) * 100);
                        if (depth > maxScrollDepth) {
                            maxScrollDepth = depth;
                        }
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
        
        // Report on page unload
        window.addEventListener('pagehide', () => {
            if (maxScrollDepth > 0) {
                try {
                    const data = JSON.stringify({
                        level: 'info',
                        source: 'nw-micro:scroll-depth',
                        message: `Scroll depth: ${maxScrollDepth}% on ${location.pathname}`,
                        metadata: { depth: maxScrollDepth, page: location.pathname }
                    });
                    navigator.sendBeacon('/api/system/log', data);
                } catch (e) {}
            }
        });
    }
    
    // =========================================================================
    // ADAPTIVE ANIMATION SPEED
    // =========================================================================
    
    function setAnimationSpeed(speed) {
        animSpeed = Math.max(0, Math.min(1, speed));
        
        // Update CSS custom property
        document.documentElement.style.setProperty('--nw-anim-speed', animSpeed);
        
        // Re-inject styles with new speed
        const existing = document.getElementById('nw-micro-styles');
        if (existing) existing.remove();
        injectStyles();
    }
    
    // =========================================================================
    // INIT
    // =========================================================================
    
    function init() {
        if (initialized) return;
        initialized = true;
        
        // Check device tier from NW_PERF if available
        if (typeof NW_PERF !== 'undefined' && NW_PERF.getDeviceTier) {
            const tier = NW_PERF.getDeviceTier();
            if (tier === 'low') animSpeed = 0.3;
            else if (tier === 'medium') animSpeed = 0.7;
        }
        
        injectStyles();
        initRipple();
        initScrollReveal();
        initTilt();
        initRageClickDetection();
        initScrollDepthTracking();
        
        // Page enter animation
        if (animSpeed > 0) {
            document.body.classList.add('nw-page-enter');
        }
        
        // Press feedback on buttons
        document.querySelectorAll('button, [role="button"]').forEach(btn => {
            btn.classList.add('nw-press');
        });
        
        // iOS double-tap fix (AUTO-LEARN PATTERN: ios-touch-double-fire)
        if (isIOS) {
            document.addEventListener('touchend', (e) => {
                const target = e.target.closest('button, a, [role="button"]');
                if (target && target._nwTouchHandled) return;
                if (target) {
                    target._nwTouchHandled = true;
                    setTimeout(() => { target._nwTouchHandled = false; }, 300);
                }
            }, { passive: true });
        }
    }
    
    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    return {
        VERSION,
        init,
        haptic,
        animateCounter,
        showSkeletonGrid,
        createSkeletonCard,
        setAnimationSpeed,
        getScrollDepth() { return maxScrollDepth; },
        getInteractionLog() { return interactionLog.slice(); }
    };
})();
