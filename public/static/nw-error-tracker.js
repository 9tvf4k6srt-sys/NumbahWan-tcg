/**
 * NW-ERROR-TRACKER — Lightweight runtime error monitoring
 * Catches unhandled errors and reports to /api/errors
 * Zero dependencies, ~1KB, non-blocking
 */
(function() {
  'use strict';
  
  const MAX_ERRORS = 10; // Max errors per page load (prevent spam)
  const DEBOUNCE_MS = 1000; // Debounce identical errors
  let errorCount = 0;
  const seen = new Set();
  
  function getPageId() {
    return document.documentElement.getAttribute('data-page-id') || 
           location.pathname.replace(/^\//, '').replace(/\.html$/, '') || 'index';
  }
  
  function reportError(data) {
    if (errorCount >= MAX_ERRORS) return;
    
    // Deduplicate by message+line
    const key = data.message + ':' + (data.line || 0);
    if (seen.has(key)) return;
    seen.add(key);
    errorCount++;
    
    // Fire-and-forget beacon (non-blocking, survives page unload)
    const payload = JSON.stringify({
      page: getPageId(),
      url: location.href,
      ...data,
      ua: navigator.userAgent.substring(0, 120),
      ts: Date.now(),
      viewport: window.innerWidth + 'x' + window.innerHeight
    });
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/errors', payload);
    } else {
      fetch('/api/errors', { method: 'POST', body: payload, keepalive: true }).catch(function(){});
    }
  }
  
  // Global error handler
  window.onerror = function(message, source, line, col, error) {
    reportError({
      type: 'uncaught',
      message: String(message).substring(0, 200),
      source: String(source || '').split('/').pop(),
      line: line,
      col: col,
      stack: error && error.stack ? error.stack.substring(0, 300) : ''
    });
  };
  
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    reportError({
      type: 'promise',
      message: (reason && reason.message ? reason.message : String(reason)).substring(0, 200),
      stack: reason && reason.stack ? reason.stack.substring(0, 300) : ''
    });
  });
  
  // Resource load failures (images, scripts, stylesheets)
  window.addEventListener('error', function(event) {
    if (event.target && event.target !== window) {
      var el = event.target;
      var tag = el.tagName || 'unknown';
      var src = el.src || el.href || '';
      if (src) {
        reportError({
          type: 'resource',
          message: tag + ' failed to load',
          source: src.split('/').pop().substring(0, 80),
          tag: tag.toLowerCase()
        });
      }
    }
  }, true); // Capture phase to catch resource errors
  
})();
