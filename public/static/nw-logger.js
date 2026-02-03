/**
 * NumbahWan Unified Logger v1.0
 * Centralized logging system for all NWG pages
 * 
 * Features:
 * - Automatic page detection
 * - Log levels (debug, info, warn, error)
 * - Production mode (errors only)
 * - Performance tracking
 * - Event history for debugging
 * - Auto-reports to console with consistent formatting
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    // Set to 'production' to only show errors, 'development' for all logs
    mode: localStorage.getItem('nwg_log_mode') || 'production',
    
    // Max events to keep in history
    maxHistory: 100,
    
    // Log levels: 0=none, 1=error, 2=warn, 3=info, 4=debug
    levels: {
      production: 1,    // Only errors
      development: 4,   // Everything
      debug: 4          // Everything + verbose
    },
    
    // Colors for console
    colors: {
      debug: '#8b949e',
      info: '#00d4ff',
      warn: '#ffd700',
      error: '#ff3366',
      success: '#00ff88',
      api: '#a855f7'
    }
  };

  // Detect current page
  function detectPage() {
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') return 'Home';
    const page = path.replace(/^\/|\.html$/g, '');
    return page.charAt(0).toUpperCase() + page.slice(1);
  }

  // Event history for debugging
  const eventHistory = [];

  // Performance marks
  const perfMarks = {};

  // Main Logger Object
  const NW_LOGGER = {
    page: detectPage(),
    startTime: Date.now(),

    // Get current log level
    getLevel() {
      return CONFIG.levels[CONFIG.mode] || 1;
    },

    // Format message with timestamp and page
    format(level, message, data) {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
      const prefix = `[NWG:${this.page}]`;
      const time = `+${elapsed}s`;
      return { prefix, time, level, message, data };
    },

    // Add to history
    addToHistory(level, message, data) {
      eventHistory.push({
        timestamp: new Date().toISOString(),
        page: this.page,
        level,
        message,
        data
      });
      
      // Trim history
      if (eventHistory.length > CONFIG.maxHistory) {
        eventHistory.shift();
      }
    },

    // Debug level (only in development)
    debug(message, data = null) {
      if (this.getLevel() < 4) return;
      this.addToHistory('debug', message, data);
      const f = this.format('debug', message, data);
      console.log(
        `%c${f.prefix}%c ${f.time} %c${f.message}`,
        'color: #00d4ff; font-weight: bold',
        'color: #8b949e',
        'color: #8b949e',
        data || ''
      );
    },

    // Info level
    info(message, data = null) {
      if (this.getLevel() < 3) return;
      this.addToHistory('info', message, data);
      const f = this.format('info', message, data);
      console.log(
        `%c${f.prefix}%c ${f.time} %c${f.message}`,
        'color: #00d4ff; font-weight: bold',
        'color: #8b949e',
        'color: #fff',
        data || ''
      );
    },

    // Warning level
    warn(message, data = null) {
      if (this.getLevel() < 2) return;
      this.addToHistory('warn', message, data);
      const f = this.format('warn', message, data);
      console.warn(
        `%c${f.prefix}%c ${f.time} %c⚠️ ${f.message}`,
        'color: #00d4ff; font-weight: bold',
        'color: #8b949e',
        'color: #ffd700',
        data || ''
      );
    },

    // Error level (always shown)
    error(message, data = null) {
      this.addToHistory('error', message, data);
      const f = this.format('error', message, data);
      console.error(
        `%c${f.prefix}%c ${f.time} %c❌ ${f.message}`,
        'color: #00d4ff; font-weight: bold',
        'color: #8b949e',
        'color: #ff3366',
        data || ''
      );
    },

    // Success message (info level)
    success(message, data = null) {
      if (this.getLevel() < 3) return;
      this.addToHistory('success', message, data);
      const f = this.format('success', message, data);
      console.log(
        `%c${f.prefix}%c ${f.time} %c✅ ${f.message}`,
        'color: #00d4ff; font-weight: bold',
        'color: #8b949e',
        'color: #00ff88',
        data || ''
      );
    },

    // API call logging
    api(endpoint, status, data = null) {
      if (this.getLevel() < 3) return;
      const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : '🔄';
      const statusColor = status === 'success' ? '#00ff88' : status === 'error' ? '#ff3366' : '#a855f7';
      this.addToHistory('api', `${endpoint} - ${status}`, data);
      console.log(
        `%c${this.format('api', '', null).prefix}%c API %c${statusIcon} ${endpoint}`,
        'color: #00d4ff; font-weight: bold',
        'color: #a855f7',
        `color: ${statusColor}`,
        data || ''
      );
    },

    // Performance tracking
    perf: {
      start(label) {
        perfMarks[label] = performance.now();
      },
      
      end(label) {
        if (!perfMarks[label]) return;
        const duration = (performance.now() - perfMarks[label]).toFixed(2);
        delete perfMarks[label];
        if (NW_LOGGER.getLevel() >= 3) {
          console.log(
            `%c[NWG:${NW_LOGGER.page}]%c ⏱️ ${label}: %c${duration}ms`,
            'color: #00d4ff; font-weight: bold',
            'color: #8b949e',
            'color: #ffd700'
          );
        }
        return parseFloat(duration);
      }
    },

    // Event tracking (for analytics)
    event(category, action, label = null, value = null) {
      this.addToHistory('event', `${category}:${action}`, { label, value });
      if (this.getLevel() >= 4) {
        console.log(
          `%c[NWG:${this.page}]%c 📊 Event: %c${category}%c → %c${action}`,
          'color: #00d4ff; font-weight: bold',
          'color: #8b949e',
          'color: #ffd700',
          'color: #8b949e',
          'color: #fff',
          label ? `(${label})` : ''
        );
      }
    },

    // Get event history (for debugging)
    getHistory() {
      return [...eventHistory];
    },

    // Clear history
    clearHistory() {
      eventHistory.length = 0;
      this.info('History cleared');
    },

    // Set mode
    setMode(mode) {
      if (['production', 'development', 'debug'].includes(mode)) {
        CONFIG.mode = mode;
        localStorage.setItem('nwg_log_mode', mode);
        console.log(
          `%c[NWG]%c Logger mode set to: %c${mode}`,
          'color: #00d4ff; font-weight: bold',
          'color: #fff',
          'color: #ffd700; font-weight: bold'
        );
      }
    },

    // Get current mode
    getMode() {
      return CONFIG.mode;
    },

    // Print status
    status() {
      const mode = this.getMode();
      const level = this.getLevel();
      const levelNames = ['none', 'error', 'warn', 'info', 'debug'];
      
      console.log('%c╔══════════════════════════════════════╗', 'color: #00d4ff');
      console.log('%c║     NumbahWan Logger Status          ║', 'color: #00d4ff');
      console.log('%c╠══════════════════════════════════════╣', 'color: #00d4ff');
      console.log(`%c║ Page:    %c${this.page.padEnd(27)}%c║`, 'color: #00d4ff', 'color: #fff', 'color: #00d4ff');
      console.log(`%c║ Mode:    %c${mode.padEnd(27)}%c║`, 'color: #00d4ff', 'color: #ffd700', 'color: #00d4ff');
      console.log(`%c║ Level:   %c${levelNames[level].padEnd(27)}%c║`, 'color: #00d4ff', 'color: #00ff88', 'color: #00d4ff');
      console.log(`%c║ History: %c${(eventHistory.length + ' events').padEnd(27)}%c║`, 'color: #00d4ff', 'color: #8b949e', 'color: #00d4ff');
      console.log('%c╚══════════════════════════════════════╝', 'color: #00d4ff');
      console.log('%cCommands: NW_LOGGER.setMode("development") | NW_LOGGER.getHistory() | NW_LOGGER.status()', 'color: #8b949e; font-style: italic');
    },

    // Initialize
    init() {
      // Log page load in development mode
      if (this.getLevel() >= 3) {
        console.log(
          `%c[NWG:${this.page}]%c 🚀 Page loaded`,
          'color: #00d4ff; font-weight: bold',
          'color: #00ff88'
        );
      }
      
      // Track page view
      this.event('Page', 'View', this.page);
      
      // Performance: page load time
      if (window.performance && window.performance.timing) {
        window.addEventListener('load', () => {
          setTimeout(() => {
            const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
            this.addToHistory('perf', 'Page load', { ms: loadTime });
            if (this.getLevel() >= 4) {
              console.log(
                `%c[NWG:${this.page}]%c ⏱️ Page load: %c${loadTime}ms`,
                'color: #00d4ff; font-weight: bold',
                'color: #8b949e',
                'color: #ffd700'
              );
            }
          }, 0);
        });
      }

      // Global error handler
      window.addEventListener('error', (e) => {
        this.error(`Uncaught error: ${e.message}`, { 
          file: e.filename, 
          line: e.lineno, 
          col: e.colno 
        });
      });

      // Unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (e) => {
        this.error(`Unhandled promise rejection: ${e.reason}`);
      });

      return this;
    }
  };

  // Auto-initialize and expose globally
  window.NW_LOGGER = NW_LOGGER.init();

  // Shorthand
  window.nwlog = {
    d: (m, d) => NW_LOGGER.debug(m, d),
    i: (m, d) => NW_LOGGER.info(m, d),
    w: (m, d) => NW_LOGGER.warn(m, d),
    e: (m, d) => NW_LOGGER.error(m, d),
    s: (m, d) => NW_LOGGER.success(m, d),
    api: (e, s, d) => NW_LOGGER.api(e, s, d)
  };

})();
