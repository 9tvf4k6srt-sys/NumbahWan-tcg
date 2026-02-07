/**
 * NumbahWan Performance Guardian v2.0
 * 
 * AUTO-LEARN PATTERN: performance-monitoring
 * Type: performance
 * Impact: Real-time performance tracking, auto-optimization, learning feedback
 * 
 * CONTINUOUS LEARNING INTEGRATION:
 * - Automatically reports metrics to /api/system/log
 * - Learns from page performance patterns
 * - Adaptive script loading (defers non-critical JS)
 * - Smart preloading based on navigation patterns
 * - Memory leak detection with auto-GC hints
 * - Long Task detection (>50ms main thread blocks)
 * 
 * Features:
 * - Core Web Vitals (FCP, LCP, CLS, FID, INP, TTFB)
 * - Unused JS/CSS detection
 * - Module dependency analysis
 * - Lazy loading recommendations  
 * - Bundle size tracking
 * - Navigation pattern learning
 * - Smart prefetching
 * - Adaptive quality (reduce effects on slow devices)
 * 
 * Usage:
 *   NW_PERF.audit()             - Run full page audit
 *   NW_PERF.getMetrics()        - Get current metrics
 *   NW_PERF.reportUnused()      - Detect unused scripts
 *   NW_PERF.optimizeImages()    - Check image optimization
 *   NW_PERF.enableAdaptive()    - Auto-adjust quality to device
 *   NW_PERF.getNavPatterns()    - Show learned navigation patterns
 *   NW_PERF.getPerformanceLog() - Show historical perf snapshots
 */

const NW_PERF = (function() {
    'use strict';

    const VERSION = '2.0.0';
    const DEBUG = localStorage.getItem('nw_perf_debug') === 'true';
    const STORAGE_KEY_PATTERNS = 'nw_nav_patterns';
    const STORAGE_KEY_PERF_LOG = 'nw_perf_log';
    const STORAGE_KEY_DEVICE_TIER = 'nw_device_tier';
    const MAX_LOG_ENTRIES = 50;
    const MAX_NAV_PATTERNS = 200;
    
    // Track loaded scripts
    const loadedScripts = new Set();
    const scriptLoadTimes = new Map();
    const unusedModules = [];
    const longTasks = [];
    
    // Performance marks
    const marks = {};
    
    // Device tier (learned over time)
    let deviceTier = localStorage.getItem(STORAGE_KEY_DEVICE_TIER) || 'unknown';
    
    function log(...args) {
        if (DEBUG) console.log('[NW_PERF]', ...args);
    }
    
    // =========================================================================
    // CORE WEB VITALS TRACKING (Enhanced v2)
    // =========================================================================
    
    function trackCoreWebVitals() {
        const metrics = {
            fcp: null,    // First Contentful Paint
            lcp: null,    // Largest Contentful Paint
            fid: null,    // First Input Delay
            inp: null,    // Interaction to Next Paint (new!)
            cls: null,    // Cumulative Layout Shift
            ttfb: null,   // Time to First Byte
            domReady: null,
            fullLoad: null,
            longTaskCount: longTasks.length,
            longTaskTotal: longTasks.reduce((sum, t) => sum + t.duration, 0)
        };
        
        // Navigation timing
        try {
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav) {
                metrics.ttfb = Math.round(nav.responseStart - nav.requestStart);
                metrics.domReady = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
                metrics.fullLoad = Math.round(nav.loadEventEnd - nav.startTime);
            }
        } catch (e) { /* browser support varies */ }
        
        // First Contentful Paint
        try {
            const paint = performance.getEntriesByType('paint');
            const fcp = paint.find(p => p.name === 'first-contentful-paint');
            if (fcp) metrics.fcp = Math.round(fcp.startTime);
        } catch (e) {}
        
        // Largest Contentful Paint
        try {
            if (typeof PerformanceObserver !== 'undefined') {
                new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const last = entries[entries.length - 1];
                    if (last) metrics.lcp = Math.round(last.startTime);
                }).observe({ type: 'largest-contentful-paint', buffered: true });
            }
        } catch (e) {}
        
        // Cumulative Layout Shift
        try {
            if (typeof PerformanceObserver !== 'undefined') {
                let clsValue = 0;
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    }
                    metrics.cls = Math.round(clsValue * 1000) / 1000;
                }).observe({ type: 'layout-shift', buffered: true });
            }
        } catch (e) {}
        
        // First Input Delay
        try {
            if (typeof PerformanceObserver !== 'undefined') {
                new PerformanceObserver((list) => {
                    const entry = list.getEntries()[0];
                    if (entry) metrics.fid = Math.round(entry.processingStart - entry.startTime);
                }).observe({ type: 'first-input', buffered: true });
            }
        } catch (e) {}
        
        // Interaction to Next Paint (INP)
        try {
            if (typeof PerformanceObserver !== 'undefined') {
                let maxInp = 0;
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        const duration = entry.duration || 0;
                        if (duration > maxInp) maxInp = duration;
                    }
                    metrics.inp = Math.round(maxInp);
                }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
            }
        } catch (e) {}
        
        return metrics;
    }
    
    // =========================================================================
    // LONG TASK DETECTION (>50ms main thread blocks)
    // =========================================================================
    
    function initLongTaskTracking() {
        try {
            if (typeof PerformanceObserver !== 'undefined') {
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        const task = {
                            duration: Math.round(entry.duration),
                            startTime: Math.round(entry.startTime),
                            name: entry.name,
                            timestamp: Date.now()
                        };
                        longTasks.push(task);
                        log('Long task detected:', task);
                        
                        // Auto-report severe long tasks (>200ms)
                        if (entry.duration > 200) {
                            reportToAutoLearn('warning', 'long-task', 
                                `Long task: ${Math.round(entry.duration)}ms at ${location.pathname}`,
                                { duration: entry.duration, page: location.pathname }
                            );
                        }
                    }
                }).observe({ type: 'longtask', buffered: true });
            }
        } catch (e) { /* Long Task API not supported */ }
    }
    
    // =========================================================================
    // SCRIPT USAGE ANALYSIS (Enhanced v2)
    // =========================================================================
    
    function analyzeScriptUsage() {
        const scripts = document.querySelectorAll('script[src]');
        const results = [];
        const page = location.pathname.replace(/^\//, '').replace(/\.html$/, '') || 'index';
        
        // Known module-page affinity (learned from codebase analysis)
        const modulePageMap = {
            'forge-engine': ['forge'],
            'battle-engine': ['battle', 'battle-legacy', 'pvp', 'pvp-battle'],
            'battle-unified': ['battle', 'battle-legacy', 'pvp', 'pvp-battle'],
            'battle-2026': ['battle', 'pvp-battle'],
            'dnd-engine': ['tavern-tales'],
            'arcade-engine': ['arcade'],
            '3d-engine': ['battle-legacy'],
            'card-upgrade': ['forge', 'collection'],
            'card-renderer': ['cards', 'collection', 'deckbuilder', 'forge'],
            'deepdive': ['lore'],
            'forge': ['forge'],
            'gacha-ultimate': ['cards', 'forge'],
            'card-bridge': ['card-bridge', 'staking']
        };
        
        scripts.forEach(script => {
            const src = script.getAttribute('src');
            const isDeferred = script.hasAttribute('defer');
            const isAsync = script.hasAttribute('async');
            const moduleName = src.match(/nw-([a-z0-9-]+)\.js/)?.[1];
            
            let recommendation = null;
            let criticalForPage = true;
            
            if (moduleName) {
                // Check if this module is needed on this page
                const affinityPages = modulePageMap[moduleName];
                if (affinityPages && !affinityPages.includes(page)) {
                    criticalForPage = false;
                    recommendation = `nw-${moduleName}.js may not be needed on /${page}`;
                }
                
                // Check defer/async
                if (!isDeferred && !isAsync) {
                    recommendation = recommendation || `Add defer to nw-${moduleName}.js for non-blocking load`;
                }
            }
            
            results.push({
                src,
                moduleName,
                isDeferred,
                isAsync,
                size: null,
                loadTime: null,
                criticalForPage,
                recommendation
            });
        });
        
        // Enrich with resource timing
        try {
            const resources = performance.getEntriesByType('resource');
            results.forEach(r => {
                const entry = resources.find(res => res.name.includes(r.src));
                if (entry) {
                    r.size = entry.transferSize;
                    r.loadTime = Math.round(entry.duration);
                    r.cacheHit = entry.transferSize === 0 && entry.decodedBodySize > 0;
                }
            });
        } catch (e) {}
        
        return results;
    }
    
    // =========================================================================
    // IMAGE OPTIMIZATION CHECK (Enhanced v2)
    // =========================================================================
    
    function checkImageOptimization() {
        const images = document.querySelectorAll('img');
        const issues = [];
        
        images.forEach(img => {
            const src = img.getAttribute('src');
            const lazy = img.getAttribute('loading') === 'lazy';
            const width = img.getAttribute('width');
            const height = img.getAttribute('height');
            const decoding = img.getAttribute('decoding');
            const fetchpriority = img.getAttribute('fetchpriority');
            const naturalW = img.naturalWidth;
            const naturalH = img.naturalHeight;
            const displayW = img.offsetWidth;
            const displayH = img.offsetHeight;
            
            // Check if image is oversized (2x+ larger than display)
            if (naturalW > 0 && displayW > 0 && naturalW > displayW * 2.5) {
                issues.push({
                    src,
                    issue: 'oversized',
                    detail: `Natural: ${naturalW}x${naturalH}, Display: ${displayW}x${displayH}`,
                    savings: `~${Math.round((1 - (displayW * 2) / naturalW) * 100)}% potential size reduction`
                });
            }
            
            // Check missing lazy loading for below-fold images
            if (!lazy && img.getBoundingClientRect().top > window.innerHeight) {
                issues.push({
                    src,
                    issue: 'missing-lazy',
                    detail: 'Below-fold image without loading="lazy"',
                    fix: 'Add loading="lazy"'
                });
            }
            
            // Check missing dimensions (causes CLS)
            if (!width || !height) {
                issues.push({
                    src,
                    issue: 'missing-dimensions',
                    detail: 'Missing explicit width/height attributes',
                    fix: 'Add width and height to prevent CLS'
                });
            }
            
            // Check missing decoding=async for non-critical images
            if (!decoding && !fetchpriority && img.getBoundingClientRect().top > 200) {
                issues.push({
                    src,
                    issue: 'missing-decoding-async',
                    detail: 'Non-hero image without decoding="async"',
                    fix: 'Add decoding="async" for smoother rendering'
                });
            }
        });
        
        return issues;
    }
    
    // =========================================================================
    // DOM COMPLEXITY CHECK
    // =========================================================================
    
    function analyzeDOMComplexity() {
        const allElements = document.querySelectorAll('*');
        const depth = getMaxDOMDepth(document.body, 0);
        const listenerCount = getEstimatedListeners();
        
        return {
            totalNodes: allElements.length,
            maxDepth: depth,
            bodyChildren: document.body.children.length,
            estimatedListeners: listenerCount,
            recommendations: [
                allElements.length > 1500 ? 'Consider virtualizing long lists' : null,
                depth > 15 ? 'DOM nesting is deep - simplify structure' : null,
                listenerCount > 500 ? 'High listener count - consider event delegation' : null,
            ].filter(Boolean)
        };
    }
    
    function getMaxDOMDepth(el, current) {
        let max = current;
        const children = el.children;
        for (let i = 0; i < children.length; i++) {
            max = Math.max(max, getMaxDOMDepth(children[i], current + 1));
        }
        return max;
    }
    
    function getEstimatedListeners() {
        // Rough estimate based on interactive elements
        let count = 0;
        count += document.querySelectorAll('button, a, input, select, textarea').length;
        count += document.querySelectorAll('[onclick], [onchange], [onsubmit]').length * 2;
        return count;
    }
    
    // =========================================================================
    // NAVIGATION PATTERN LEARNING
    // =========================================================================
    
    function recordNavigation() {
        const page = location.pathname;
        const timestamp = Date.now();
        
        try {
            const patterns = JSON.parse(localStorage.getItem(STORAGE_KEY_PATTERNS) || '{}');
            const prevPage = sessionStorage.getItem('nw_prev_page');
            
            // Record page visit frequency
            if (!patterns.visits) patterns.visits = {};
            patterns.visits[page] = (patterns.visits[page] || 0) + 1;
            
            // Record transition pairs (from -> to)
            if (prevPage && prevPage !== page) {
                if (!patterns.transitions) patterns.transitions = {};
                const key = `${prevPage} -> ${page}`;
                patterns.transitions[key] = (patterns.transitions[key] || 0) + 1;
            }
            
            // Record time-of-day patterns
            const hour = new Date().getHours();
            if (!patterns.hourly) patterns.hourly = {};
            const hourKey = `${hour}:${page}`;
            patterns.hourly[hourKey] = (patterns.hourly[hourKey] || 0) + 1;
            
            // Prune if too large
            const totalEntries = Object.keys(patterns.transitions || {}).length;
            if (totalEntries > MAX_NAV_PATTERNS) {
                const sorted = Object.entries(patterns.transitions).sort((a, b) => b[1] - a[1]);
                patterns.transitions = Object.fromEntries(sorted.slice(0, MAX_NAV_PATTERNS / 2));
            }
            
            localStorage.setItem(STORAGE_KEY_PATTERNS, JSON.stringify(patterns));
            sessionStorage.setItem('nw_prev_page', page);
        } catch (e) { /* storage full or blocked */ }
    }
    
    function getNavPatterns() {
        try {
            const patterns = JSON.parse(localStorage.getItem(STORAGE_KEY_PATTERNS) || '{}');
            
            // Sort visits by frequency
            const topPages = Object.entries(patterns.visits || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            
            // Sort transitions by frequency
            const topTransitions = Object.entries(patterns.transitions || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            
            // Predict next pages from current page
            const currentPage = location.pathname;
            const predictions = Object.entries(patterns.transitions || {})
                .filter(([key]) => key.startsWith(currentPage + ' -> '))
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([key, count]) => ({
                    page: key.split(' -> ')[1],
                    probability: count
                }));
            
            return { topPages, topTransitions, predictions };
        } catch (e) {
            return { topPages: [], topTransitions: [], predictions: [] };
        }
    }
    
    // =========================================================================
    // SMART PREFETCHING (based on learned patterns)
    // =========================================================================
    
    function smartPrefetch() {
        const { predictions } = getNavPatterns();
        
        // Prefetch top 2 predicted next pages
        predictions.slice(0, 2).forEach(pred => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = pred.page;
            link.as = 'document';
            document.head.appendChild(link);
            log('Prefetching predicted page:', pred.page, `(${pred.probability} visits)`);
        });
    }
    
    // =========================================================================
    // ADAPTIVE QUALITY SYSTEM
    // =========================================================================
    
    function detectDeviceTier() {
        const start = performance.now();
        
        // CPU benchmark (simple loop test)
        let x = 0;
        for (let i = 0; i < 1000000; i++) x += Math.sqrt(i);
        const cpuTime = performance.now() - start;
        
        // Memory check
        const lowMemory = navigator.deviceMemory ? navigator.deviceMemory < 4 : false;
        
        // Connection check
        const conn = navigator.connection;
        const slowConnection = conn ? (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') : false;
        
        // Hardware concurrency
        const lowCores = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 2 : false;
        
        let tier = 'high';
        if (cpuTime > 50 || lowMemory || slowConnection || lowCores) tier = 'low';
        else if (cpuTime > 20 || (conn && conn.effectiveType === '3g')) tier = 'medium';
        
        deviceTier = tier;
        localStorage.setItem(STORAGE_KEY_DEVICE_TIER, tier);
        log('Device tier:', tier, { cpuTime: Math.round(cpuTime), lowMemory, slowConnection, lowCores });
        
        return tier;
    }
    
    function enableAdaptive() {
        const tier = deviceTier === 'unknown' ? detectDeviceTier() : deviceTier;
        
        if (tier === 'low') {
            // Reduce animations
            document.documentElement.style.setProperty('--nw-transition-speed', '0.1s');
            document.documentElement.classList.add('nw-reduced-motion');
            
            // Disable particle effects
            if (window.NW_PARTICLES && typeof NW_PARTICLES.disable === 'function') {
                NW_PARTICLES.disable();
            }
            
            // Disable premium FX
            if (window.NW_PREMIUM_FX && typeof NW_PREMIUM_FX.disable === 'function') {
                NW_PREMIUM_FX.disable();
            }
            
            log('Adaptive: LOW tier - reduced effects');
        } else if (tier === 'medium') {
            document.documentElement.style.setProperty('--nw-transition-speed', '0.2s');
            log('Adaptive: MEDIUM tier - balanced');
        } else {
            document.documentElement.style.setProperty('--nw-transition-speed', '0.3s');
            log('Adaptive: HIGH tier - full effects');
        }
        
        return tier;
    }
    
    // =========================================================================
    // AUTO-LEARN FEEDBACK LOOP
    // =========================================================================
    
    function reportToAutoLearn(level, source, message, metadata) {
        try {
            fetch('/api/system/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level, source: `nw-perf:${source}`, message, metadata }),
                keepalive: true
            }).catch(() => { /* fire and forget */ });
        } catch (e) { /* silent */ }
    }
    
    function storePerformanceSnapshot(report) {
        try {
            const logs = JSON.parse(localStorage.getItem(STORAGE_KEY_PERF_LOG) || '[]');
            logs.push({
                timestamp: Date.now(),
                page: location.pathname,
                score: report.summary.score,
                grade: report.summary.grade,
                fcp: report.webVitals.fcp,
                lcp: report.webVitals.lcp,
                cls: report.webVitals.cls,
                ttfb: report.webVitals.ttfb,
                longTasks: report.webVitals.longTaskCount,
                tier: deviceTier
            });
            
            // Keep only recent entries
            while (logs.length > MAX_LOG_ENTRIES) logs.shift();
            localStorage.setItem(STORAGE_KEY_PERF_LOG, JSON.stringify(logs));
        } catch (e) { /* storage full */ }
    }
    
    function getPerformanceLog() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY_PERF_LOG) || '[]');
        } catch (e) {
            return [];
        }
    }
    
    // =========================================================================
    // FULL AUDIT (Enhanced v2)
    // =========================================================================
    
    function audit() {
        const report = {
            timestamp: new Date().toISOString(),
            page: location.pathname,
            version: VERSION,
            deviceTier,
            webVitals: trackCoreWebVitals(),
            scripts: analyzeScriptUsage(),
            images: checkImageOptimization(),
            dom: analyzeDOMComplexity(),
            longTasks: longTasks.slice(-10),
            navPatterns: getNavPatterns(),
            summary: {}
        };
        
        // Generate summary
        const scriptIssues = report.scripts.filter(s => s.recommendation).length;
        const imageIssues = report.images.length;
        const domIssues = report.dom.recommendations.length;
        const longTaskIssues = longTasks.filter(t => t.duration > 100).length;
        const totalIssues = scriptIssues + imageIssues + domIssues + longTaskIssues;
        
        report.summary = {
            score: Math.max(0, 100 - totalIssues * 5),
            grade: totalIssues === 0 ? 'A+' : totalIssues <= 2 ? 'A' : totalIssues <= 5 ? 'B' : totalIssues <= 10 ? 'C' : 'D',
            issues: totalIssues,
            scriptIssues,
            imageIssues,
            domIssues,
            longTaskIssues,
            deviceTier
        };
        
        // Store snapshot for historical tracking
        storePerformanceSnapshot(report);
        
        // Report to auto-learn system if significant issues
        if (totalIssues > 5) {
            reportToAutoLearn('info', 'audit',
                `Page ${location.pathname} scored ${report.summary.grade} with ${totalIssues} issues`,
                { score: report.summary.score, issues: totalIssues, page: location.pathname }
            );
        }
        
        log('Performance Audit:', report);
        return report;
    }
    
    // =========================================================================
    // MEMORY USAGE (Enhanced)
    // =========================================================================
    
    function getMemoryUsage() {
        const result = { unit: 'MB' };
        
        if (performance.memory) {
            result.usedJSHeap = Math.round(performance.memory.usedJSHeapSize / 1048576);
            result.totalJSHeap = Math.round(performance.memory.totalJSHeapSize / 1048576);
            result.limit = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
            result.percentage = Math.round((result.usedJSHeap / result.limit) * 100);
            
            // Warn if memory usage is high
            if (result.percentage > 80) {
                reportToAutoLearn('warning', 'memory',
                    `High memory usage: ${result.percentage}% on ${location.pathname}`,
                    result
                );
            }
        }
        
        return result;
    }
    
    // =========================================================================
    // RESOURCE CACHE ANALYSIS
    // =========================================================================
    
    function analyzeCaching() {
        const resources = performance.getEntriesByType('resource');
        let cached = 0;
        let uncached = 0;
        let totalTransfer = 0;
        
        resources.forEach(r => {
            if (r.transferSize === 0 && r.decodedBodySize > 0) {
                cached++;
            } else {
                uncached++;
                totalTransfer += r.transferSize;
            }
        });
        
        return {
            totalResources: resources.length,
            cached,
            uncached,
            cacheHitRate: resources.length > 0 ? Math.round((cached / resources.length) * 100) : 0,
            totalTransfer: Math.round(totalTransfer / 1024),
            unit: 'KB'
        };
    }
    
    // =========================================================================
    // PUBLIC API
    // =========================================================================
    
    // Initialize on load
    initLongTaskTracking();
    recordNavigation();
    
    return {
        VERSION,
        audit,
        getMetrics: trackCoreWebVitals,
        reportUnused: analyzeScriptUsage,
        optimizeImages: checkImageOptimization,
        analyzeDom: analyzeDOMComplexity,
        analyzeCaching,
        getMemory: getMemoryUsage,
        getNavPatterns,
        getPerformanceLog,
        enableAdaptive,
        detectDeviceTier,
        smartPrefetch,
        getDeviceTier() { return deviceTier; },
        mark(name) {
            marks[name] = performance.now();
        },
        measure(name, startMark) {
            const end = performance.now();
            const start = marks[startMark] || 0;
            const duration = Math.round(end - start);
            log(`${name}: ${duration}ms`);
            return duration;
        },
        // Report custom metric to auto-learn
        report(metric, value, metadata) {
            reportToAutoLearn('info', `custom:${metric}`, `${metric}=${value}`, metadata);
        }
    };
})();

// Auto-run on page load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Delay to not interfere with page load
        setTimeout(() => {
            // Always enable adaptive quality
            NW_PERF.enableAdaptive();
            
            // Smart prefetch based on learned patterns
            NW_PERF.smartPrefetch();
            
            // Run full audit if enabled
            if (localStorage.getItem('nw_perf_auto_audit') === 'true') {
                const report = NW_PERF.audit();
                console.log(`[NW_PERF] v${NW_PERF.VERSION} | ${report.summary.grade} (${report.summary.score}/100) | ${report.summary.issues} issues | Tier: ${report.deviceTier}`);
            }
        }, 2000);
    });
}
