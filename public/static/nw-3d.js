/*!
 * nw-3d.js — the house 3D runtime for landing pages
 * Doctrine: references/LANDING-3D.md · Gate: tools/landing-lint.cjs (D-rules)
 *
 * Lifecycle contract (LANDING-3D §4):
 *   capability check → lazy init → render on demand → pause off-screen → dispose
 *
 * How a page uses it:
 *
 *   <div class="nwl-3d" data-nwl-3d="/static/my-scene.js">
 *     <canvas role="img" aria-label="…" tabindex="0" width="1200" height="800"></canvas>
 *     <div class="nwl-3d-cue">Drag to explore</div>
 *   </div>
 *   <script src="/static/nw-3d.js" defer></script>
 *
 * nw-3d auto-mounts every [data-nwl-3d] stage after window load, IF the
 * device qualifies (see NW3D.capable). Otherwise the stage stays inert and
 * the poster/HTML underneath carries the beat (fallback ladder, rung free).
 *
 * Scene module contract (an ES module at the data-nwl-3d path):
 *
 *   export async function createScene(ctx) {
 *     // ctx: { THREE, canvas, renderer, scene, camera, size, addons }
 *     // addons: { GLTFLoader, DRACOLoader } lazy getters (await ctx.addons.gltf())
 *     // Build the scene. Return the per-scene API:
 *     return {
 *       setProgress(p) {},          // 0..1 from the page's scrubbed ScrollTrigger
 *       setPointer(x, y) {},        // optional, -0.5..0.5 each, desktop only
 *       update(dt) { return false } // optional; return true while self-animating
 *       dispose() {}                // free anything createScene allocated
 *     };
 *   }
 *
 * Page-side bridge (LANDING-3D §5): the page owns scroll, the scene reads it.
 *
 *   const stage = await NW3D.get(el);                 // resolves when mounted
 *   ScrollTrigger: onUpdate(self){ stage.setProgress(self.progress); }
 *
 * Rules encoded here so pages cannot forget them:
 *   · Three.js is version-pinned and imported only after load + near-viewport
 *   · No unconditional rAF loop: renders happen on demand and stop when idle
 *   · IntersectionObserver pauses everything off-screen
 *   · dispose() walks the scene graph, frees GPU resources, drops the context
 *   · reduced-motion / Save-Data / no-WebGL users never download the library
 */
(function () {
  'use strict';

  var THREE_VER = '0.166.1';
  var CDN = 'https://cdn.jsdelivr.net/npm/three@' + THREE_VER;
  var MOD = CDN + '/build/three.module.js';
  var JSM = CDN + '/examples/jsm/';
  var DRACO_CDN = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

  // ── capability ladder (LANDING-3D §6) ──
  function capable() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    var conn = navigator.connection;
    if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return false;
    if (navigator.deviceMemory && navigator.deviceMemory < 2) return false;
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return false;
      gl.getExtension('WEBGL_lose_context') && gl.getExtension('WEBGL_lose_context').loseContext();
    } catch (e) { return false; }
    return true;
  }

  var isFine = window.matchMedia('(pointer: fine)').matches;
  var threePromise = null;
  function loadThree() {
    if (!threePromise) threePromise = import(MOD);
    return threePromise;
  }

  // ── one mounted stage ──
  function Stage(el) {
    this.el = el;
    this.canvas = el.querySelector('canvas');
    this.moduleUrl = el.getAttribute('data-nwl-3d');
    this.mounted = false;
    this.visible = false;
    this.needsRender = false;
    this.selfAnimating = false;
    this.disposed = false;
    this._raf = 0;
    this._last = 0;
    this._listeners = [];
  }

  Stage.prototype.mount = async function () {
    if (this.mounted || this.disposed || !this.canvas || !this.moduleUrl) return this;
    this.mounted = true;

    var THREE = await loadThree();
    var mod = await import(this.moduleUrl);
    if (this.disposed) return this;

    var canvas = this.canvas;
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: isFine, alpha: true, powerPreference: 'high-performance'
    });
    // Cap pixel ratio: retina x3 rendering is the classic silent perf killer.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isFine ? 2 : 1.5));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.z = 5;

    var self = this;
    this.THREE = THREE;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Lazy addon getters so simple scenes never pay for loaders.
    var addons = {
      gltf: async function () {
        var L = await import(JSM + 'loaders/GLTFLoader.js');
        var D = await import(JSM + 'loaders/DRACOLoader.js');
        var draco = new D.DRACOLoader();
        draco.setDecoderPath(DRACO_CDN);
        var loader = new L.GLTFLoader();
        loader.setDRACOLoader(draco);
        self._draco = draco;
        return loader;
      },
      composer: function () { return import(JSM + 'postprocessing/EffectComposer.js'); }
    };

    var size = this._resize();
    this.api = await mod.createScene({
      THREE: THREE, canvas: canvas, renderer: renderer,
      scene: scene, camera: camera, size: size, addons: addons
    }) || {};
    if (this.disposed) { this._teardownGL(); return this; }

    // resize
    var onResize = function () { self._resize(); self.invalidate(); };
    window.addEventListener('resize', onResize);
    this._listeners.push([window, 'resize', onResize]);

    // pointer (desktop only: costs nothing on touch, per MOTION-CRAFT §4)
    if (isFine && this.api.setPointer) {
      var onMove = function (e) {
        var r = canvas.getBoundingClientRect();
        self.api.setPointer(
          (e.clientX - r.left) / r.width - 0.5,
          (e.clientY - r.top) / r.height - 0.5
        );
        self.invalidate();
      };
      var onLeave = function () { self.api.setPointer(0, 0); self.invalidate(); };
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerleave', onLeave);
      this._listeners.push([canvas, 'pointermove', onMove], [canvas, 'pointerleave', onLeave]);
      // keyboard mirror: arrows nudge the same pointer channel (LANDING-3D §7)
      var onKey = function (e) {
        var map = { ArrowLeft: [-0.3, 0], ArrowRight: [0.3, 0], ArrowUp: [0, -0.3], ArrowDown: [0, 0.3] };
        if (map[e.key]) { self.api.setPointer(map[e.key][0], map[e.key][1]); self.invalidate(); e.preventDefault(); }
      };
      canvas.addEventListener('keydown', onKey);
      this._listeners.push([canvas, 'keydown', onKey]);
    }

    // pause off-screen (LANDING-3D §4.4)
    var io = new IntersectionObserver(function (entries) {
      self.visible = entries[0].isIntersecting;
      if (self.visible) self.invalidate(); else self._stopLoop();
    }, { rootMargin: '80px' });
    io.observe(this.el);
    this._io = io;

    this.el.classList.add('nwl-3d--live');
    this.invalidate();
    return this;
  };

  // ── render on demand: loop runs only while there is work ──
  Stage.prototype.invalidate = function () {
    this.needsRender = true;
    if (!this._raf && this.visible && !this.disposed) this._startLoop();
  };

  Stage.prototype._startLoop = function () {
    var self = this;
    this._last = performance.now();
    var tick = function (now) {
      self._raf = 0;
      if (self.disposed || !self.visible) return;
      var dt = Math.min((now - self._last) / 1000, 0.1);
      self._last = now;
      var busy = false;
      if (self.api.update) busy = !!self.api.update(dt);
      if (self.needsRender || busy) {
        self.needsRender = false;
        self.renderer.render(self.scene, self.camera);
      }
      if (busy || self.needsRender) self._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  };

  Stage.prototype._stopLoop = function () {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
  };

  Stage.prototype._resize = function () {
    var w = this.el.clientWidth || 1200;
    var h = this.el.clientHeight || Math.round(w * 2 / 3);
    if (this.renderer) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    return { width: w, height: h };
  };

  // scroll bridge: the page calls this from its scrubbed ScrollTrigger
  Stage.prototype.setProgress = function (p) {
    if (this.api && this.api.setProgress) { this.api.setProgress(p); this.invalidate(); }
  };

  // ── dispose (LANDING-3D §4.5): the part everyone skips, so we don't ──
  Stage.prototype.dispose = function () {
    if (this.disposed) return;
    this.disposed = true;
    this._stopLoop();
    if (this._io) this._io.disconnect();
    this._listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2]); });
    this._listeners.length = 0;
    if (this.api && this.api.dispose) { try { this.api.dispose(); } catch (e) {} }
    this._teardownGL();
    this.el.classList.remove('nwl-3d--live');
  };

  Stage.prototype._teardownGL = function () {
    var renderer = this.renderer;
    if (this.scene) {
      this.scene.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        var mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
        mats.forEach(function (m) {
          for (var k in m) {
            if (m[k] && m[k].isTexture) m[k].dispose();
          }
          m.dispose();
        });
      });
      this.scene.clear();
    }
    if (this._draco) this._draco.dispose();
    if (renderer) {
      renderer.dispose();
      var gl = renderer.getContext();
      var lose = gl && gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
    this.renderer = this.scene = this.camera = this.api = null;
  };

  // ── auto-mount ──
  var registry = new Map();   // el -> Stage
  var pending = new Map();    // el -> resolve queue

  function get(el) {
    var stage = registry.get(el);
    if (stage) return Promise.resolve(stage.mounted ? stage : stage.mount());
    return new Promise(function (resolve) {
      var q = pending.get(el) || [];
      q.push(resolve);
      pending.set(el, q);
    });
  }

  function mountAll() {
    if (!capable()) return; // ladder rungs 3–4: stage stays inert, poster carries the beat
    document.querySelectorAll('[data-nwl-3d]').forEach(function (el) {
      if (registry.has(el)) return;
      var stage = new Stage(el);
      registry.set(el, stage);
      // near-viewport lazy init: don't import Three.js for a stage 5 screens away
      var io = new IntersectionObserver(function (entries, obs) {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        stage.mount().then(function () {
          (pending.get(el) || []).forEach(function (r) { r(stage); });
          pending.delete(el);
          el.dispatchEvent(new CustomEvent('nwl3d:ready', { detail: stage }));
        });
      }, { rootMargin: '400px' });
      io.observe(el);
    });
  }

  function disposeAll() {
    registry.forEach(function (s) { s.dispose(); });
    registry.clear();
  }

  window.NW3D = { get: get, mountAll: mountAll, disposeAll: disposeAll, capable: capable, version: THREE_VER };

  // Never compete with first paint: mount after load (LANDING-3D §4.2).
  if (document.readyState === 'complete') setTimeout(mountAll, 0);
  else window.addEventListener('load', function () { setTimeout(mountAll, 0); });

  // SPA-ish safety: free GPU memory when the page is going away.
  window.addEventListener('pagehide', disposeAll);
})();
