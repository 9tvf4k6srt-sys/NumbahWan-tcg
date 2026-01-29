/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NW_API - HTTP Client & Data Fetching
 * ═══════════════════════════════════════════════════════════════════════════
 * Version: 2.0.0
 * 
 * Features:
 * - Fetch wrapper with automatic JSON handling
 * - Request/response interceptors
 * - Error handling & retry logic
 * - Request caching
 * - Loading state management
 * - File upload with progress
 * - API endpoint builder
 * - Mock data support for development
 */

const NW_API = (function() {
    'use strict';

    const VERSION = '2.0.0';
    
    // Configuration
    const config = {
        baseUrl: '',
        timeout: 30000,
        retries: 0,
        retryDelay: 1000,
        cache: true,
        cacheDuration: 60000, // 1 minute
        headers: {
            'Content-Type': 'application/json'
        }
    };

    // State
    const cache = new Map();
    const pendingRequests = new Map();
    const interceptors = {
        request: [],
        response: [],
        error: []
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    function configure(options) {
        Object.assign(config, options);
    }

    function setHeader(key, value) {
        config.headers[key] = value;
    }

    function removeHeader(key) {
        delete config.headers[key];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERCEPTORS
    // ═══════════════════════════════════════════════════════════════════════════

    function addRequestInterceptor(fn) {
        interceptors.request.push(fn);
        return () => {
            const idx = interceptors.request.indexOf(fn);
            if (idx > -1) interceptors.request.splice(idx, 1);
        };
    }

    function addResponseInterceptor(fn) {
        interceptors.response.push(fn);
        return () => {
            const idx = interceptors.response.indexOf(fn);
            if (idx > -1) interceptors.response.splice(idx, 1);
        };
    }

    function addErrorInterceptor(fn) {
        interceptors.error.push(fn);
        return () => {
            const idx = interceptors.error.indexOf(fn);
            if (idx > -1) interceptors.error.splice(idx, 1);
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CORE REQUEST FUNCTION
    // ═══════════════════════════════════════════════════════════════════════════

    async function request(url, options = {}) {
        let requestConfig = {
            method: 'GET',
            headers: { ...config.headers },
            timeout: config.timeout,
            retries: config.retries,
            cache: config.cache,
            ...options
        };

        // Build full URL
        const fullUrl = url.startsWith('http') ? url : config.baseUrl + url;

        // Apply request interceptors
        for (const interceptor of interceptors.request) {
            requestConfig = await interceptor(requestConfig, fullUrl) || requestConfig;
        }

        // Handle body serialization
        if (requestConfig.body && typeof requestConfig.body === 'object' && 
            !(requestConfig.body instanceof FormData)) {
            requestConfig.body = JSON.stringify(requestConfig.body);
        }

        // Cache key for GET requests
        const cacheKey = requestConfig.method === 'GET' ? fullUrl : null;

        // Check cache
        if (cacheKey && requestConfig.cache) {
            const cached = cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < config.cacheDuration) {
                return cached.data;
            }
        }

        // Dedupe pending requests
        if (cacheKey && pendingRequests.has(cacheKey)) {
            return pendingRequests.get(cacheKey);
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), requestConfig.timeout);
        requestConfig.signal = controller.signal;

        // Execute request with retry logic
        const executeRequest = async (attempt = 0) => {
            try {
                const response = await fetch(fullUrl, requestConfig);
                clearTimeout(timeoutId);

                // Handle non-ok responses
                if (!response.ok) {
                    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                    error.status = response.status;
                    error.response = response;
                    
                    try {
                        error.data = await response.json();
                    } catch {}
                    
                    throw error;
                }

                // Parse response
                let data;
                const contentType = response.headers.get('content-type');
                if (contentType?.includes('application/json')) {
                    data = await response.json();
                } else if (contentType?.includes('text/')) {
                    data = await response.text();
                } else {
                    data = await response.blob();
                }

                // Apply response interceptors
                for (const interceptor of interceptors.response) {
                    data = await interceptor(data, response) || data;
                }

                // Cache successful GET responses
                if (cacheKey && requestConfig.cache) {
                    cache.set(cacheKey, { data, timestamp: Date.now() });
                }

                return data;

            } catch (err) {
                clearTimeout(timeoutId);

                // Apply error interceptors
                for (const interceptor of interceptors.error) {
                    const handled = await interceptor(err, requestConfig);
                    if (handled) return handled;
                }

                // Retry logic
                if (attempt < requestConfig.retries && !err.name?.includes('Abort')) {
                    await new Promise(r => setTimeout(r, config.retryDelay * (attempt + 1)));
                    return executeRequest(attempt + 1);
                }

                throw err;
            }
        };

        // Store pending request promise
        const promise = executeRequest().finally(() => {
            if (cacheKey) pendingRequests.delete(cacheKey);
        });

        if (cacheKey) {
            pendingRequests.set(cacheKey, promise);
        }

        return promise;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HTTP METHOD SHORTCUTS
    // ═══════════════════════════════════════════════════════════════════════════

    function get(url, options = {}) {
        return request(url, { ...options, method: 'GET' });
    }

    function post(url, body, options = {}) {
        return request(url, { ...options, method: 'POST', body });
    }

    function put(url, body, options = {}) {
        return request(url, { ...options, method: 'PUT', body });
    }

    function patch(url, body, options = {}) {
        return request(url, { ...options, method: 'PATCH', body });
    }

    function del(url, options = {}) {
        return request(url, { ...options, method: 'DELETE' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FILE UPLOAD
    // ═══════════════════════════════════════════════════════════════════════════

    function upload(url, file, options = {}) {
        const {
            fieldName = 'file',
            extraData = {},
            onProgress = null,
            ...fetchOptions
        } = options;

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            
            // Add file(s)
            if (Array.isArray(file)) {
                file.forEach((f, i) => formData.append(`${fieldName}[${i}]`, f));
            } else {
                formData.append(fieldName, file);
            }

            // Add extra data
            Object.entries(extraData).forEach(([key, val]) => {
                formData.append(key, val);
            });

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    onProgress({
                        loaded: e.loaded,
                        total: e.total,
                        percent: Math.round((e.loaded / e.total) * 100)
                    });
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Upload error')));
            xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

            const fullUrl = url.startsWith('http') ? url : config.baseUrl + url;
            xhr.open('POST', fullUrl);

            // Add headers (excluding Content-Type for FormData)
            Object.entries(config.headers).forEach(([key, val]) => {
                if (key.toLowerCase() !== 'content-type') {
                    xhr.setRequestHeader(key, val);
                }
            });

            xhr.send(formData);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CACHE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    function clearCache(pattern = null) {
        if (pattern) {
            for (const key of cache.keys()) {
                if (key.includes(pattern)) cache.delete(key);
            }
        } else {
            cache.clear();
        }
    }

    function getCacheKeys() {
        return [...cache.keys()];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // API ENDPOINT BUILDER
    // ═══════════════════════════════════════════════════════════════════════════

    function createEndpoint(basePath) {
        return {
            list: (params = {}) => {
                const query = new URLSearchParams(params).toString();
                return get(`${basePath}${query ? '?' + query : ''}`);
            },
            get: (id) => get(`${basePath}/${id}`),
            create: (data) => post(basePath, data),
            update: (id, data) => put(`${basePath}/${id}`, data),
            patch: (id, data) => patch(`${basePath}/${id}`, data),
            delete: (id) => del(`${basePath}/${id}`),
            custom: (path, method = 'GET', data = null) => {
                const url = `${basePath}${path}`;
                return request(url, { method, body: data });
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POLLING
    // ═══════════════════════════════════════════════════════════════════════════

    function poll(url, options = {}) {
        const {
            interval = 5000,
            maxAttempts = Infinity,
            condition = () => false,
            onUpdate = null,
            ...fetchOptions
        } = options;

        let attempts = 0;
        let stopped = false;

        const execute = async () => {
            if (stopped || attempts >= maxAttempts) return;
            attempts++;

            try {
                const data = await get(url, { ...fetchOptions, cache: false });
                onUpdate?.(data, attempts);

                if (condition(data)) {
                    return data;
                }

                await new Promise(r => setTimeout(r, interval));
                return execute();
            } catch (err) {
                onUpdate?.(null, attempts, err);
                await new Promise(r => setTimeout(r, interval));
                return execute();
            }
        };

        const promise = execute();
        promise.stop = () => { stopped = true; };
        return promise;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BATCH REQUESTS
    // ═══════════════════════════════════════════════════════════════════════════

    async function batch(requests) {
        return Promise.all(
            requests.map(req => {
                if (typeof req === 'string') return get(req);
                return request(req.url, req);
            })
        );
    }

    async function sequential(requests) {
        const results = [];
        for (const req of requests) {
            if (typeof req === 'string') {
                results.push(await get(req));
            } else {
                results.push(await request(req.url, req));
            }
        }
        return results;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MOCK DATA (for development)
    // ═══════════════════════════════════════════════════════════════════════════

    const mocks = new Map();

    function mock(url, data, delay = 100) {
        mocks.set(url, { data, delay });
        return () => mocks.delete(url);
    }

    // Add mock interceptor
    addRequestInterceptor(async (config, url) => {
        const mockEntry = mocks.get(url);
        if (mockEntry) {
            await new Promise(r => setTimeout(r, mockEntry.delay));
            throw { isMock: true, data: mockEntry.data };
        }
        return config;
    });

    addErrorInterceptor(async (err) => {
        if (err.isMock) return err.data;
        return null;
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    function init() {
        console.log(`[NW_API] v${VERSION} initialized`);
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
        configure, setHeader, removeHeader,
        
        // Core
        request, get, post, put, patch, delete: del,
        
        // Upload
        upload,
        
        // Cache
        clearCache, getCacheKeys,
        
        // Interceptors
        addRequestInterceptor, addResponseInterceptor, addErrorInterceptor,
        
        // Builders
        createEndpoint,
        
        // Advanced
        poll, batch, sequential,
        
        // Mock
        mock
    };
})();

window.NW_API = NW_API;
