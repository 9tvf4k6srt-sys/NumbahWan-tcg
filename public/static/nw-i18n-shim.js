/* NW_I18N Shim — non-deferred, loads instantly.
 * Queues calls until the real nw-i18n-core.js (deferred) takes over.
 * Size: <600 bytes minified. */
(function(){
  if(window.NW_I18N && !window.NW_I18N._isShim) return;
  var q = window.__NW_I18N_QUEUE = window.__NW_I18N_QUEUE || [];
  window.NW_I18N = {
    register:     function(t)    { q.push({m:'register',     a:[t]}); return this; },
    registerPage: function(id,t) { q.push({m:'registerPage', a:[id,t]}); return this; },
    onChange:      function(cb)   { q.push({m:'onChange',      a:[cb]}); return this; },
    apply:        function(l)    { q.push({m:'apply',         a:[l]}); return this; },
    setLang:      function(l)    { q.push({m:'setLang',       a:[l]}); return this; },
    t:            function(k,fb) { return fb !== undefined ? fb : k; },
    getLang:      function()     { try{return localStorage.getItem('nw_lang')||'en';}catch(e){return 'en';} },
    get lang()                   { try{return localStorage.getItem('nw_lang')||'en';}catch(e){return 'en';} },
    refresh:      function()     { return this; },
    getAll:       function()     { return {}; },
    get ready()                  { return false; },
    init:         function()     { return this; },
    snapshotOriginals: function(){ return this; },
    enableDebug:  function()     { return this; },
    getMissingKeys: function()   { return []; },
    audit:        function()     { return []; },
    common:       {},
    pages:        {},
    _isShim: true
  };
})();
