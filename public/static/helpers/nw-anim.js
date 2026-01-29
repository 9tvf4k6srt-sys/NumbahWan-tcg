/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NW_ANIM - Animation Utilities
 * ═══════════════════════════════════════════════════════════════════════════
 * Version: 2.0.0
 * 
 * Features:
 * - CSS class-based animations
 * - JavaScript animation engine
 * - Easing functions library
 * - Stagger animations
 * - Scroll-triggered animations
 * - Number/counter animations
 * - Color transitions
 * - Spring physics
 */

const NW_ANIM = (function() {
    'use strict';

    const VERSION = '2.0.0';
    let animationId = 0;
    const runningAnimations = new Map();

    // ═══════════════════════════════════════════════════════════════════════════
    // EASING FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    const easing = {
        linear: t => t,
        
        // Quad
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        
        // Cubic
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        
        // Quart
        easeInQuart: t => t * t * t * t,
        easeOutQuart: t => 1 - (--t) * t * t * t,
        easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
        
        // Expo
        easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
        easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
        easeInOutExpo: t => {
            if (t === 0 || t === 1) return t;
            return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
        },
        
        // Back
        easeInBack: t => t * t * (2.70158 * t - 1.70158),
        easeOutBack: t => 1 + (--t) * t * (2.70158 * t + 1.70158),
        easeInOutBack: t => {
            const c = 1.70158 * 1.525;
            return t < 0.5
                ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
                : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
        },
        
        // Elastic
        easeInElastic: t => {
            if (t === 0 || t === 1) return t;
            return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI / 3));
        },
        easeOutElastic: t => {
            if (t === 0 || t === 1) return t;
            return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
        },
        easeInOutElastic: t => {
            if (t === 0 || t === 1) return t;
            return t < 0.5
                ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI / 4.5))) / 2
                : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI / 4.5))) / 2 + 1;
        },
        
        // Bounce
        easeOutBounce: t => {
            if (t < 1 / 2.75) return 7.5625 * t * t;
            if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
            if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        },
        easeInBounce: t => 1 - easing.easeOutBounce(1 - t),
        easeInOutBounce: t => t < 0.5 
            ? (1 - easing.easeOutBounce(1 - 2 * t)) / 2 
            : (1 + easing.easeOutBounce(2 * t - 1)) / 2,
            
        // Spring (custom)
        spring: (t, damping = 0.5, frequency = 15) => {
            return 1 - Math.exp(-damping * t * 10) * Math.cos(frequency * t);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // CORE ANIMATION ENGINE
    // ═══════════════════════════════════════════════════════════════════════════

    /** Animate properties */
    function animate(target, properties, options = {}) {
        const {
            duration = 400,
            easing: easingFn = 'easeOutCubic',
            delay = 0,
            onStart = null,
            onUpdate = null,
            onComplete = null
        } = options;

        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return Promise.reject('Element not found');

        const id = ++animationId;
        const easeFn = typeof easingFn === 'function' ? easingFn : easing[easingFn] || easing.linear;

        return new Promise((resolve) => {
            // Get initial values
            const computedStyle = getComputedStyle(el);
            const startValues = {};
            const endValues = {};
            const units = {};

            Object.entries(properties).forEach(([prop, value]) => {
                const current = computedStyle[prop] || '0';
                const currentNum = parseFloat(current);
                const endNum = parseFloat(value);
                const unit = String(value).replace(/[\d.-]/g, '') || String(current).replace(/[\d.-]/g, '') || '';

                startValues[prop] = currentNum;
                endValues[prop] = endNum;
                units[prop] = unit;
            });

            let startTime = null;

            const tick = (timestamp) => {
                if (!startTime) {
                    startTime = timestamp + delay;
                    onStart?.();
                }

                if (timestamp < startTime) {
                    runningAnimations.set(id, requestAnimationFrame(tick));
                    return;
                }

                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easeFn(progress);

                // Update properties
                Object.entries(properties).forEach(([prop, _]) => {
                    const start = startValues[prop];
                    const end = endValues[prop];
                    const unit = units[prop];
                    const current = start + (end - start) * easedProgress;
                    el.style[prop] = current + unit;
                });

                onUpdate?.(easedProgress);

                if (progress < 1) {
                    runningAnimations.set(id, requestAnimationFrame(tick));
                } else {
                    runningAnimations.delete(id);
                    onComplete?.();
                    resolve(el);
                }
            };

            runningAnimations.set(id, requestAnimationFrame(tick));
        });
    }

    /** Stop animation */
    function stop(target) {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        runningAnimations.forEach((frameId, id) => {
            cancelAnimationFrame(frameId);
        });
        runningAnimations.clear();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CSS CLASS ANIMATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Add animation class and resolve when done */
    function cssAnimate(target, className, options = {}) {
        const { remove = true, delay = 0 } = options;
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return Promise.reject('Element not found');

        return new Promise((resolve) => {
            setTimeout(() => {
                el.classList.add(className);

                const handleEnd = () => {
                    if (remove) el.classList.remove(className);
                    el.removeEventListener('animationend', handleEnd);
                    el.removeEventListener('transitionend', handleEnd);
                    resolve(el);
                };

                el.addEventListener('animationend', handleEnd, { once: true });
                el.addEventListener('transitionend', handleEnd, { once: true });
            }, delay);
        });
    }

    /** Inject common animation keyframes */
    function injectAnimations() {
        if (document.getElementById('nw-anim-keyframes')) return;

        const style = document.createElement('style');
        style.id = 'nw-anim-keyframes';
        style.textContent = `
            @keyframes nw-fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes nw-fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes nw-fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes nw-fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes nw-fadeInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes nw-fadeInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes nw-scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
            @keyframes nw-scaleOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.8); } }
            @keyframes nw-bounceIn { 
                0% { opacity: 0; transform: scale(0.3); }
                50% { transform: scale(1.05); }
                70% { transform: scale(0.9); }
                100% { opacity: 1; transform: scale(1); }
            }
            @keyframes nw-pulse { 
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            @keyframes nw-shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            @keyframes nw-swing {
                20% { transform: rotate(15deg); }
                40% { transform: rotate(-10deg); }
                60% { transform: rotate(5deg); }
                80% { transform: rotate(-5deg); }
                100% { transform: rotate(0deg); }
            }
            @keyframes nw-rubberBand {
                0% { transform: scale(1); }
                30% { transform: scaleX(1.25) scaleY(0.75); }
                40% { transform: scaleX(0.75) scaleY(1.25); }
                50% { transform: scaleX(1.15) scaleY(0.85); }
                65% { transform: scaleX(0.95) scaleY(1.05); }
                75% { transform: scaleX(1.05) scaleY(0.95); }
                100% { transform: scale(1); }
            }
            @keyframes nw-flip {
                0% { transform: perspective(400px) rotateY(0); }
                100% { transform: perspective(400px) rotateY(360deg); }
            }
            
            .nw-fadeIn { animation: nw-fadeIn 0.3s ease-out forwards; }
            .nw-fadeOut { animation: nw-fadeOut 0.3s ease-out forwards; }
            .nw-fadeInUp { animation: nw-fadeInUp 0.4s ease-out forwards; }
            .nw-fadeInDown { animation: nw-fadeInDown 0.4s ease-out forwards; }
            .nw-fadeInLeft { animation: nw-fadeInLeft 0.4s ease-out forwards; }
            .nw-fadeInRight { animation: nw-fadeInRight 0.4s ease-out forwards; }
            .nw-scaleIn { animation: nw-scaleIn 0.3s ease-out forwards; }
            .nw-scaleOut { animation: nw-scaleOut 0.3s ease-out forwards; }
            .nw-bounceIn { animation: nw-bounceIn 0.5s ease-out forwards; }
            .nw-pulse { animation: nw-pulse 0.5s ease-in-out; }
            .nw-shake { animation: nw-shake 0.5s ease-in-out; }
            .nw-swing { animation: nw-swing 0.5s ease-out; transform-origin: top center; }
            .nw-rubberBand { animation: nw-rubberBand 0.5s ease-out; }
            .nw-flip { animation: nw-flip 0.6s ease-in-out; }
        `;
        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGGER ANIMATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Animate multiple elements with stagger */
    function stagger(targets, className, options = {}) {
        const { delay = 50, startDelay = 0 } = options;
        const elements = typeof targets === 'string' 
            ? [...document.querySelectorAll(targets)] 
            : [...targets];

        return Promise.all(elements.map((el, index) => {
            return cssAnimate(el, className, { 
                ...options, 
                delay: startDelay + (index * delay) 
            });
        }));
    }

    /** Stagger with custom animation */
    function staggerAnimate(targets, properties, options = {}) {
        const { staggerDelay = 50, startDelay = 0, ...animOptions } = options;
        const elements = typeof targets === 'string' 
            ? [...document.querySelectorAll(targets)] 
            : [...targets];

        return Promise.all(elements.map((el, index) => {
            return animate(el, properties, {
                ...animOptions,
                delay: startDelay + (index * staggerDelay)
            });
        }));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SCROLL ANIMATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    const scrollObservers = new Map();

    /** Animate on scroll */
    function onScroll(target, options = {}) {
        const {
            animation = 'nw-fadeInUp',
            threshold = 0.2,
            once = true,
            rootMargin = '0px'
        } = options;

        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        el.classList.add(animation);
                        if (once) {
                            observer.disconnect();
                            scrollObservers.delete(el);
                        }
                    } else if (!once) {
                        el.classList.remove(animation);
                    }
                });
            },
            { threshold, rootMargin }
        );

        observer.observe(el);
        scrollObservers.set(el, observer);

        return () => {
            observer.disconnect();
            scrollObservers.delete(el);
        };
    }

    /** Batch scroll animations */
    function onScrollBatch(selector, options = {}) {
        const elements = document.querySelectorAll(selector);
        const cleanups = [];
        
        elements.forEach((el, index) => {
            const cleanup = onScroll(el, {
                ...options,
                rootMargin: `0px 0px -${10 + (index * 2)}% 0px`
            });
            cleanups.push(cleanup);
        });

        return () => cleanups.forEach(fn => fn?.());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NUMBER/COUNTER ANIMATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Animate number counting */
    function countTo(target, endValue, options = {}) {
        const {
            duration = 1000,
            easing: easingFn = 'easeOutCubic',
            decimals = 0,
            prefix = '',
            suffix = '',
            separator = ',',
            onUpdate = null
        } = options;

        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return Promise.reject('Element not found');

        const startValue = parseFloat(el.textContent.replace(/[^\d.-]/g, '')) || 0;
        const easeFn = typeof easingFn === 'function' ? easingFn : easing[easingFn] || easing.linear;

        return new Promise((resolve) => {
            let startTime = null;

            const formatNumber = (num) => {
                const fixed = num.toFixed(decimals);
                const parts = fixed.split('.');
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
                return prefix + parts.join('.') + suffix;
            };

            const tick = (timestamp) => {
                if (!startTime) startTime = timestamp;

                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easeFn(progress);
                const current = startValue + (endValue - startValue) * easedProgress;

                el.textContent = formatNumber(current);
                onUpdate?.(current, progress);

                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    resolve(el);
                }
            };

            requestAnimationFrame(tick);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COLOR TRANSITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Animate color */
    function colorTo(target, property, endColor, options = {}) {
        const { duration = 400, easing: easingFn = 'easeOutCubic' } = options;
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return Promise.reject('Element not found');

        const easeFn = typeof easingFn === 'function' ? easingFn : easing[easingFn] || easing.linear;

        // Parse colors
        const parseColor = (color) => {
            const temp = document.createElement('div');
            temp.style.color = color;
            document.body.appendChild(temp);
            const computed = getComputedStyle(temp).color;
            document.body.removeChild(temp);
            const match = computed.match(/\d+/g);
            return match ? match.map(Number) : [0, 0, 0];
        };

        const startColor = parseColor(getComputedStyle(el)[property]);
        const endRGB = parseColor(endColor);

        return new Promise((resolve) => {
            let startTime = null;

            const tick = (timestamp) => {
                if (!startTime) startTime = timestamp;

                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easeFn(progress);

                const r = Math.round(startColor[0] + (endRGB[0] - startColor[0]) * easedProgress);
                const g = Math.round(startColor[1] + (endRGB[1] - startColor[1]) * easedProgress);
                const b = Math.round(startColor[2] + (endRGB[2] - startColor[2]) * easedProgress);

                el.style[property] = `rgb(${r}, ${g}, ${b})`;

                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    resolve(el);
                }
            };

            requestAnimationFrame(tick);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SPRING PHYSICS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Spring animation */
    function spring(target, property, endValue, options = {}) {
        const {
            stiffness = 100,
            damping = 10,
            mass = 1,
            velocity = 0,
            onUpdate = null
        } = options;

        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return Promise.reject('Element not found');

        const startValue = parseFloat(getComputedStyle(el)[property]) || 0;
        const unit = String(endValue).replace(/[\d.-]/g, '') || 'px';
        const endNum = parseFloat(endValue);

        return new Promise((resolve) => {
            let position = startValue;
            let vel = velocity;
            let lastTime = null;

            const tick = (timestamp) => {
                if (!lastTime) lastTime = timestamp;
                const delta = Math.min((timestamp - lastTime) / 1000, 0.064); // Cap at ~15fps
                lastTime = timestamp;

                // Spring physics
                const springForce = -stiffness * (position - endNum);
                const dampingForce = -damping * vel;
                const acceleration = (springForce + dampingForce) / mass;

                vel += acceleration * delta;
                position += vel * delta;

                el.style[property] = position + unit;
                onUpdate?.(position, vel);

                // Check if settled
                const settled = Math.abs(vel) < 0.01 && Math.abs(position - endNum) < 0.01;

                if (!settled) {
                    requestAnimationFrame(tick);
                } else {
                    el.style[property] = endNum + unit;
                    resolve(el);
                }
            };

            requestAnimationFrame(tick);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    function init() {
        injectAnimations();
        console.log(`[NW_ANIM] v${VERSION} initialized`);
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════

    return {
        VERSION,
        
        // Easing
        easing,
        
        // Core
        animate, stop, cssAnimate,
        
        // Stagger
        stagger, staggerAnimate,
        
        // Scroll
        onScroll, onScrollBatch,
        
        // Numbers
        countTo,
        
        // Colors
        colorTo,
        
        // Spring
        spring
    };
})();

window.NW_ANIM = NW_ANIM;
