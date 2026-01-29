/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NW_STATE - Global State Management
 * ═══════════════════════════════════════════════════════════════════════════
 * Version: 2.0.0
 * 
 * Features:
 * - Reactive state with subscriptions
 * - Persistent state (localStorage sync)
 * - Computed values
 * - State history (undo/redo)
 * - State slices for modular management
 * - DevTools integration
 */

const NW_STATE = (function() {
    'use strict';

    const VERSION = '2.0.0';
    
    // Core state
    let state = {};
    const subscribers = new Map();
    const computed = new Map();
    const history = [];
    let historyIndex = -1;
    const MAX_HISTORY = 50;

    // Config
    const config = {
        persist: false,
        persistKey: 'nw_state',
        debug: false
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    function configure(options) {
        Object.assign(config, options);
        if (config.persist) {
            loadFromStorage();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE GETTERS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Get entire state or specific path */
    function get(path = null) {
        if (!path) return { ...state };
        
        return path.split('.').reduce((obj, key) => {
            return obj && obj[key] !== undefined ? obj[key] : undefined;
        }, state);
    }

    /** Check if path exists */
    function has(path) {
        return get(path) !== undefined;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE SETTERS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Set state value at path */
    function set(path, value, options = {}) {
        const { silent = false, persist = config.persist } = options;
        
        const oldState = { ...state };
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        let current = state;
        for (const key of keys) {
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        const oldValue = current[lastKey];
        current[lastKey] = value;

        if (config.debug) {
            console.log(`[NW_STATE] Set ${path}:`, { oldValue, newValue: value });
        }

        // Record history
        if (!silent) {
            recordHistory(oldState);
        }

        // Persist
        if (persist) {
            saveToStorage();
        }

        // Notify subscribers
        if (!silent) {
            notifySubscribers(path, value, oldValue);
        }

        return value;
    }

    /** Update state with object merge */
    function update(path, updates, options = {}) {
        const current = get(path) || {};
        if (typeof current !== 'object' || typeof updates !== 'object') {
            return set(path, updates, options);
        }
        return set(path, { ...current, ...updates }, options);
    }

    /** Delete state at path */
    function remove(path, options = {}) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        let current = state;
        for (const key of keys) {
            if (!(key in current)) return false;
            current = current[key];
        }
        
        if (!(lastKey in current)) return false;
        
        const oldValue = current[lastKey];
        delete current[lastKey];

        if (!options.silent) {
            recordHistory({ ...state, [path]: oldValue });
            notifySubscribers(path, undefined, oldValue);
        }

        if (options.persist ?? config.persist) {
            saveToStorage();
        }

        return true;
    }

    /** Reset entire state */
    function reset(initialState = {}, options = {}) {
        const oldState = { ...state };
        state = { ...initialState };

        if (!options.silent) {
            recordHistory(oldState);
            notifySubscribers('*', state, oldState);
        }

        if (options.persist ?? config.persist) {
            saveToStorage();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SUBSCRIPTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Subscribe to state changes */
    function subscribe(pathOrCallback, callback = null) {
        let path, cb;
        
        if (typeof pathOrCallback === 'function') {
            path = '*';
            cb = pathOrCallback;
        } else {
            path = pathOrCallback;
            cb = callback;
        }

        if (!subscribers.has(path)) {
            subscribers.set(path, new Set());
        }
        subscribers.get(path).add(cb);

        // Return unsubscribe function
        return () => {
            subscribers.get(path)?.delete(cb);
        };
    }

    /** Subscribe once */
    function once(path, callback) {
        const unsubscribe = subscribe(path, (...args) => {
            unsubscribe();
            callback(...args);
        });
        return unsubscribe;
    }

    /** Notify subscribers */
    function notifySubscribers(path, newValue, oldValue) {
        // Notify exact path subscribers
        subscribers.get(path)?.forEach(cb => {
            try {
                cb(newValue, oldValue, path);
            } catch (err) {
                console.error(`[NW_STATE] Subscriber error for ${path}:`, err);
            }
        });

        // Notify wildcard subscribers
        subscribers.get('*')?.forEach(cb => {
            try {
                cb(state, path, { newValue, oldValue });
            } catch (err) {
                console.error('[NW_STATE] Wildcard subscriber error:', err);
            }
        });

        // Notify parent path subscribers
        const parts = path.split('.');
        while (parts.length > 1) {
            parts.pop();
            const parentPath = parts.join('.');
            subscribers.get(parentPath)?.forEach(cb => {
                try {
                    cb(get(parentPath), undefined, path);
                } catch (err) {
                    console.error(`[NW_STATE] Parent subscriber error for ${parentPath}:`, err);
                }
            });
        }

        // Update computed values
        updateComputed();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COMPUTED VALUES
    // ═══════════════════════════════════════════════════════════════════════════

    /** Create computed value */
    function compute(name, dependencies, computeFn) {
        computed.set(name, {
            dependencies,
            fn: computeFn,
            value: null
        });
        
        // Initial computation
        updateComputedValue(name);

        return () => computed.delete(name);
    }

    function updateComputedValue(name) {
        const comp = computed.get(name);
        if (!comp) return;

        const values = comp.dependencies.map(dep => get(dep));
        const newValue = comp.fn(...values);
        
        if (newValue !== comp.value) {
            comp.value = newValue;
            notifySubscribers(`computed.${name}`, newValue);
        }
    }

    function updateComputed() {
        computed.forEach((_, name) => updateComputedValue(name));
    }

    function getComputed(name) {
        return computed.get(name)?.value;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HISTORY (UNDO/REDO)
    // ═══════════════════════════════════════════════════════════════════════════

    function recordHistory(oldState) {
        // Remove any future history if we're not at the end
        if (historyIndex < history.length - 1) {
            history.splice(historyIndex + 1);
        }

        history.push(JSON.stringify(oldState));
        
        // Limit history size
        if (history.length > MAX_HISTORY) {
            history.shift();
        } else {
            historyIndex++;
        }
    }

    function undo() {
        if (historyIndex < 0) return false;

        const currentState = JSON.stringify(state);
        const previousState = JSON.parse(history[historyIndex]);
        
        history[historyIndex] = currentState;
        historyIndex--;
        
        state = previousState;
        notifySubscribers('*', state);

        if (config.persist) saveToStorage();
        return true;
    }

    function redo() {
        if (historyIndex >= history.length - 1) return false;

        historyIndex++;
        const nextState = JSON.parse(history[historyIndex]);
        
        state = nextState;
        notifySubscribers('*', state);

        if (config.persist) saveToStorage();
        return true;
    }

    function canUndo() {
        return historyIndex >= 0;
    }

    function canRedo() {
        return historyIndex < history.length - 1;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PERSISTENCE
    // ═══════════════════════════════════════════════════════════════════════════

    function saveToStorage() {
        try {
            localStorage.setItem(config.persistKey, JSON.stringify(state));
        } catch (err) {
            console.error('[NW_STATE] Failed to save to storage:', err);
        }
    }

    function loadFromStorage() {
        try {
            const saved = localStorage.getItem(config.persistKey);
            if (saved) {
                state = JSON.parse(saved);
                if (config.debug) {
                    console.log('[NW_STATE] Loaded from storage:', state);
                }
            }
        } catch (err) {
            console.error('[NW_STATE] Failed to load from storage:', err);
        }
    }

    function clearStorage() {
        localStorage.removeItem(config.persistKey);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE SLICES
    // ═══════════════════════════════════════════════════════════════════════════

    /** Create a state slice for modular management */
    function createSlice(name, initialState = {}, reducers = {}) {
        // Initialize slice state
        set(name, initialState, { silent: true });

        // Create actions from reducers
        const actions = {};
        Object.entries(reducers).forEach(([actionName, reducer]) => {
            actions[actionName] = (payload) => {
                const currentState = get(name);
                const newState = reducer(currentState, payload);
                set(name, newState);
                return newState;
            };
        });

        return {
            name,
            get: () => get(name),
            set: (value) => set(name, value),
            update: (updates) => update(name, updates),
            subscribe: (cb) => subscribe(name, cb),
            actions,
            select: (selector) => selector(get(name))
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BATCH UPDATES
    // ═══════════════════════════════════════════════════════════════════════════

    let batchUpdates = [];
    let isBatching = false;

    function batch(fn) {
        isBatching = true;
        batchUpdates = [];
        
        try {
            fn();
        } finally {
            isBatching = false;
            
            // Apply all updates
            const oldState = { ...state };
            batchUpdates.forEach(({ path, value }) => {
                set(path, value, { silent: true });
            });
            
            // Single notification
            recordHistory(oldState);
            notifySubscribers('*', state, oldState);
            
            if (config.persist) saveToStorage();
            batchUpdates = [];
        }
    }

    // Override set for batching
    const originalSet = set;
    set = function(path, value, options = {}) {
        if (isBatching) {
            batchUpdates.push({ path, value });
            return value;
        }
        return originalSet(path, value, options);
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // DEVTOOLS
    // ═══════════════════════════════════════════════════════════════════════════

    function enableDevTools() {
        if (typeof window === 'undefined') return;

        window.__NW_STATE_DEVTOOLS__ = {
            getState: () => ({ ...state }),
            getHistory: () => [...history],
            getSubscribers: () => {
                const subs = {};
                subscribers.forEach((set, path) => {
                    subs[path] = set.size;
                });
                return subs;
            },
            getComputed: () => {
                const comps = {};
                computed.forEach((comp, name) => {
                    comps[name] = comp.value;
                });
                return comps;
            }
        };

        console.log('[NW_STATE] DevTools enabled. Access via window.__NW_STATE_DEVTOOLS__');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    function init() {
        if (config.debug) {
            enableDevTools();
        }
        console.log(`[NW_STATE] v${VERSION} initialized`);
    }

    // Auto-init
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════

    return {
        VERSION,
        
        // Config
        configure,
        
        // Getters
        get, has, getComputed,
        
        // Setters
        set, update, remove, reset,
        
        // Subscriptions
        subscribe, once,
        
        // Computed
        compute,
        
        // History
        undo, redo, canUndo, canRedo,
        
        // Persistence
        saveToStorage, loadFromStorage, clearStorage,
        
        // Slices
        createSlice,
        
        // Batch
        batch,
        
        // DevTools
        enableDevTools
    };
})();

window.NW_STATE = NW_STATE;
