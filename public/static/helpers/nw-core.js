/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NW_CORE - Base Utilities & Foundation
 * ═══════════════════════════════════════════════════════════════════════════
 * Version: 2.0.0
 * The backbone of NumbahWan helper system
 * 
 * Features:
 * - DOM helpers (query, create, manipulate)
 * - Event handling (delegate, debounce, throttle)
 * - Local storage with encryption option
 * - Unique ID generation
 * - Deep clone/merge utilities
 * - Date/time formatting
 * - Number formatting (currency, compact, percentage)
 * - String utilities (slugify, truncate, capitalize)
 * - URL/Query string helpers
 * - Device detection
 * - Performance timing
 */

const NW_CORE = (function() {
    'use strict';

    const VERSION = '2.0.0';
    const PREFIX = 'nw_';

    // ═══════════════════════════════════════════════════════════════════════════
    // DOM HELPERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /** Query selector shorthand */
    function $(selector, context = document) {
        return context.querySelector(selector);
    }

    /** Query selector all shorthand */
    function $$(selector, context = document) {
        return [...context.querySelectorAll(selector)];
    }

    /** Create element with attributes and children */
    function create(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        
        Object.entries(attrs).forEach(([key, val]) => {
            if (key === 'className' || key === 'class') {
                el.className = val;
            } else if (key === 'style' && typeof val === 'object') {
                Object.assign(el.style, val);
            } else if (key === 'data' && typeof val === 'object') {
                Object.entries(val).forEach(([k, v]) => el.dataset[k] = v);
            } else if (key.startsWith('on') && typeof val === 'function') {
                el.addEventListener(key.slice(2).toLowerCase(), val);
            } else if (key === 'html') {
                el.innerHTML = val;
            } else if (key === 'text') {
                el.textContent = val;
            } else {
                el.setAttribute(key, val);
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                el.appendChild(child);
            }
        });

        return el;
    }

    /** Insert HTML safely */
    function html(el, content, position = 'replace') {
        const target = typeof el === 'string' ? $(el) : el;
        if (!target) return;
        
        if (position === 'replace') target.innerHTML = content;
        else if (position === 'before') target.insertAdjacentHTML('beforebegin', content);
        else if (position === 'prepend') target.insertAdjacentHTML('afterbegin', content);
        else if (position === 'append') target.insertAdjacentHTML('beforeend', content);
        else if (position === 'after') target.insertAdjacentHTML('afterend', content);
    }

    /** Add/remove/toggle class */
    function addClass(el, ...classes) { el?.classList?.add(...classes); }
    function removeClass(el, ...classes) { el?.classList?.remove(...classes); }
    function toggleClass(el, className, force) { el?.classList?.toggle(className, force); }
    function hasClass(el, className) { return el?.classList?.contains(className); }

    /** Show/hide element */
    function show(el, display = 'block') {
        const target = typeof el === 'string' ? $(el) : el;
        if (target) target.style.display = display;
    }

    function hide(el) {
        const target = typeof el === 'string' ? $(el) : el;
        if (target) target.style.display = 'none';
    }

    function toggle(el, display = 'block') {
        const target = typeof el === 'string' ? $(el) : el;
        if (target) {
            target.style.display = target.style.display === 'none' ? display : 'none';
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENT HANDLING
    // ═══════════════════════════════════════════════════════════════════════════

    /** Event delegation - handle events on dynamically added elements */
    function delegate(parent, eventType, selector, handler) {
        const container = typeof parent === 'string' ? $(parent) : parent;
        if (!container) return;

        container.addEventListener(eventType, function(e) {
            const target = e.target.closest(selector);
            if (target && container.contains(target)) {
                handler.call(target, e, target);
            }
        });
    }

    /** Debounce - wait for pause in calls */
    function debounce(func, wait = 300) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /** Throttle - limit call frequency */
    function throttle(func, limit = 100) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /** One-time event listener */
    function once(el, event, handler) {
        const target = typeof el === 'string' ? $(el) : el;
        target?.addEventListener(event, handler, { once: true });
    }

    /** Wait for DOM ready */
    function ready(callback) {
        if (document.readyState !== 'loading') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LOCAL STORAGE
    // ═══════════════════════════════════════════════════════════════════════════

    const storage = {
        set(key, value, expireMs = null) {
            const data = {
                value,
                timestamp: Date.now(),
                expire: expireMs ? Date.now() + expireMs : null
            };
            localStorage.setItem(PREFIX + key, JSON.stringify(data));
        },

        get(key, defaultValue = null) {
            try {
                const raw = localStorage.getItem(PREFIX + key);
                if (!raw) return defaultValue;
                
                const data = JSON.parse(raw);
                if (data.expire && Date.now() > data.expire) {
                    localStorage.removeItem(PREFIX + key);
                    return defaultValue;
                }
                return data.value;
            } catch {
                return defaultValue;
            }
        },

        remove(key) {
            localStorage.removeItem(PREFIX + key);
        },

        clear(pattern = null) {
            if (pattern) {
                Object.keys(localStorage)
                    .filter(k => k.startsWith(PREFIX) && k.includes(pattern))
                    .forEach(k => localStorage.removeItem(k));
            } else {
                Object.keys(localStorage)
                    .filter(k => k.startsWith(PREFIX))
                    .forEach(k => localStorage.removeItem(k));
            }
        },

        keys() {
            return Object.keys(localStorage)
                .filter(k => k.startsWith(PREFIX))
                .map(k => k.slice(PREFIX.length));
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // ID GENERATION
    // ═══════════════════════════════════════════════════════════════════════════

    /** Generate unique ID */
    function uid(prefix = 'nw') {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    }

    /** Generate short ID (6 chars) */
    function shortId() {
        return Math.random().toString(36).slice(2, 8);
    }

    /** Generate UUID v4 */
    function uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OBJECT UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════

    /** Deep clone object */
    function clone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => clone(item));
        if (obj instanceof Object) {
            return Object.fromEntries(
                Object.entries(obj).map(([k, v]) => [k, clone(v)])
            );
        }
        return obj;
    }

    /** Deep merge objects */
    function merge(...objects) {
        return objects.reduce((acc, obj) => {
            if (!obj) return acc;
            Object.keys(obj).forEach(key => {
                if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                    acc[key] = merge(acc[key] || {}, obj[key]);
                } else {
                    acc[key] = obj[key];
                }
            });
            return acc;
        }, {});
    }

    /** Pick specific keys from object */
    function pick(obj, keys) {
        return keys.reduce((acc, key) => {
            if (key in obj) acc[key] = obj[key];
            return acc;
        }, {});
    }

    /** Omit specific keys from object */
    function omit(obj, keys) {
        return Object.fromEntries(
            Object.entries(obj).filter(([k]) => !keys.includes(k))
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NUMBER FORMATTING
    // ═══════════════════════════════════════════════════════════════════════════

    /** Format number with commas */
    function formatNumber(num, decimals = 0) {
        return Number(num).toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /** Format as currency */
    function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency
        }).format(amount);
    }

    /** Format compact (1K, 1M, etc.) */
    function formatCompact(num) {
        const formatter = new Intl.NumberFormat('en', { notation: 'compact' });
        return formatter.format(num);
    }

    /** Format percentage */
    function formatPercent(value, decimals = 1) {
        return `${(value * 100).toFixed(decimals)}%`;
    }

    /** Clamp number between min and max */
    function clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
    }

    /** Random number between min and max */
    function random(min, max, integer = true) {
        const val = Math.random() * (max - min) + min;
        return integer ? Math.floor(val) : val;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STRING UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════

    /** Slugify string */
    function slugify(str) {
        return str.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /** Truncate with ellipsis */
    function truncate(str, length = 50, suffix = '...') {
        if (str.length <= length) return str;
        return str.slice(0, length - suffix.length) + suffix;
    }

    /** Capitalize first letter */
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /** Title case */
    function titleCase(str) {
        return str.replace(/\b\w/g, c => c.toUpperCase());
    }

    /** Escape HTML */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /** Template literal with object */
    function template(str, data) {
        return str.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DATE/TIME UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════

    /** Format date */
    function formatDate(date, format = 'short') {
        const d = new Date(date);
        const options = {
            short: { month: 'short', day: 'numeric', year: 'numeric' },
            long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit' },
            datetime: { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' },
            iso: null
        };
        
        if (format === 'iso') return d.toISOString().split('T')[0];
        return d.toLocaleString('en-US', options[format] || options.short);
    }

    /** Relative time (e.g., "2 hours ago") */
    function timeAgo(date) {
        const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
        
        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'week', seconds: 604800 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 }
        ];

        for (const { label, seconds: s } of intervals) {
            const count = Math.floor(seconds / s);
            if (count >= 1) {
                return `${count} ${label}${count > 1 ? 's' : ''} ago`;
            }
        }
        return 'just now';
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // URL/QUERY STRING
    // ═══════════════════════════════════════════════════════════════════════════

    /** Get query params as object */
    function getParams(url = window.location.href) {
        const params = new URLSearchParams(new URL(url).search);
        return Object.fromEntries(params);
    }

    /** Set query params */
    function setParams(params, push = false) {
        const url = new URL(window.location.href);
        Object.entries(params).forEach(([k, v]) => {
            if (v === null || v === undefined) {
                url.searchParams.delete(k);
            } else {
                url.searchParams.set(k, v);
            }
        });
        
        if (push) {
            window.history.pushState({}, '', url);
        } else {
            window.history.replaceState({}, '', url);
        }
    }

    /** Build URL with params */
    function buildUrl(base, params = {}) {
        const url = new URL(base, window.location.origin);
        Object.entries(params).forEach(([k, v]) => {
            if (v !== null && v !== undefined) {
                url.searchParams.set(k, v);
            }
        });
        return url.toString();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DEVICE DETECTION
    // ═══════════════════════════════════════════════════════════════════════════

    const device = {
        get isMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        },
        get isIOS() {
            return /iPad|iPhone|iPod/.test(navigator.userAgent);
        },
        get isAndroid() {
            return /Android/.test(navigator.userAgent);
        },
        get isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        },
        get isOnline() {
            return navigator.onLine;
        },
        get screenWidth() {
            return window.innerWidth;
        },
        get screenHeight() {
            return window.innerHeight;
        },
        get isSmall() {
            return window.innerWidth < 640;
        },
        get isMedium() {
            return window.innerWidth >= 640 && window.innerWidth < 1024;
        },
        get isLarge() {
            return window.innerWidth >= 1024;
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // PERFORMANCE
    // ═══════════════════════════════════════════════════════════════════════════

    const perf = {
        marks: {},
        
        start(label) {
            this.marks[label] = performance.now();
        },
        
        end(label) {
            if (!this.marks[label]) return null;
            const duration = performance.now() - this.marks[label];
            delete this.marks[label];
            return duration;
        },
        
        log(label) {
            const duration = this.end(label);
            if (duration !== null) {
                console.log(`[NW_CORE] ${label}: ${duration.toFixed(2)}ms`);
            }
            return duration;
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // ASYNC UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════

    /** Wait for milliseconds */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /** Wait for condition */
    async function waitFor(condition, timeout = 5000, interval = 100) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (condition()) return true;
            await sleep(interval);
        }
        return false;
    }

    /** Retry async function */
    async function retry(fn, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (err) {
                if (i === retries - 1) throw err;
                await sleep(delay);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    function init() {
        console.log(`[NW_CORE] v${VERSION} initialized`);
    }

    // Auto-init
    ready(init);

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════

    return {
        VERSION,
        
        // DOM
        $, $$, create, html,
        addClass, removeClass, toggleClass, hasClass,
        show, hide, toggle,
        
        // Events
        delegate, debounce, throttle, once, ready,
        
        // Storage
        storage,
        
        // IDs
        uid, shortId, uuid,
        
        // Objects
        clone, merge, pick, omit,
        
        // Numbers
        formatNumber, formatCurrency, formatCompact, formatPercent,
        clamp, random,
        
        // Strings
        slugify, truncate, capitalize, titleCase, escapeHtml, template,
        
        // Dates
        formatDate, timeAgo,
        
        // URLs
        getParams, setParams, buildUrl,
        
        // Device
        device,
        
        // Performance
        perf,
        
        // Async
        sleep, waitFor, retry
    };
})();

// Make globally available
window.NW_CORE = NW_CORE;
window.$ = NW_CORE.$;
window.$$ = NW_CORE.$$;
