/**
 * NW-LOADER: Shared loading screen for NumbahWan pages
 * 
 * Usage (in <head>, before other scripts):
 *   <link rel="stylesheet" href="/static/nw-loader.css">
 *   <script src="/static/nw-loader.js"></script>
 * 
 * The loader auto-creates itself and auto-hides on window.load.
 * For manual control:  NW_LOADER.hide()  or  NW_LOADER.status('Loading cards...')
 */
(function () {
  'use strict';

  // --- Inject HTML immediately (before DOM ready) ---
  var html = '<div id="instant-loader">' +
    '<div class="il-aurora"></div>' +
    '<div style="position:relative;display:flex;flex-direction:column;align-items:center;z-index:10">' +
      '<div style="position:relative;width:120px;height:120px;display:flex;align-items:center;justify-content:center">' +
        '<div class="il-ring il-ring-1" style="position:absolute;top:50%;left:50%;margin-top:-75px;margin-left:-75px"></div>' +
        '<div class="il-ring il-ring-2" style="position:absolute;top:50%;left:50%;margin-top:-85px;margin-left:-85px"></div>' +
        '<svg class="il-emblem" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
          '<defs><linearGradient id="ilGrad" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" stop-color="#ffcc70"/><stop offset="30%" stop-color="#ff9500"/>' +
            '<stop offset="60%" stop-color="#ff6b00"/><stop offset="100%" stop-color="#8B4513"/>' +
          '</linearGradient></defs>' +
          '<rect x="10" y="8" width="24" height="84" rx="3" fill="url(#ilGrad)"/>' +
          '<rect x="66" y="8" width="24" height="84" rx="3" fill="url(#ilGrad)"/>' +
          '<polygon points="10,8 34,8 90,92 66,92" fill="url(#ilGrad)"/>' +
        '</svg>' +
      '</div>' +
      '<div class="il-title">NumbahWan</div>' +
      '<div class="il-status" id="il-status"></div>' +
      '<div class="il-progress-track"><div class="il-progress-bar" id="il-progress"></div></div>' +
      '<div class="il-dots"><div class="il-dot"></div><div class="il-dot"></div><div class="il-dot"></div></div>' +
    '</div>' +
  '</div>';

  // Write directly so it appears before anything renders
  document.write(html);

  // --- Progress tracking ---
  var startTime = Date.now();
  var minDisplay = 800;   // min 0.8s so user sees branding
  var maxDisplay = 6000;  // safety: force hide after 6s
  var progressBar = null;
  var statusEl = null;
  var currentProgress = 0;
  var targetProgress = 0;
  var done = false;

  function setStatus(msg) {
    if (!statusEl) statusEl = document.getElementById('il-status');
    if (statusEl) statusEl.textContent = msg;
  }

  function animateProgress() {
    if (done) return;
    if (!progressBar) progressBar = document.getElementById('il-progress');
    if (currentProgress < targetProgress) {
      currentProgress += Math.max(1, (targetProgress - currentProgress) * 0.15);
      if (currentProgress > targetProgress) currentProgress = targetProgress;
    }
    if (progressBar) progressBar.style.width = Math.min(currentProgress, 100) + '%';
    if (currentProgress < 100) requestAnimationFrame(animateProgress);
  }

  function hide() {
    if (done) return;
    done = true;
    var elapsed = Date.now() - startTime;
    var remaining = Math.max(0, minDisplay - elapsed);
    targetProgress = 100;
    setStatus('Ready!');
    setTimeout(function () {
      var loader = document.getElementById('instant-loader');
      if (loader) {
        loader.classList.add('hidden');
        setTimeout(function () { loader.remove(); }, 600);
      }
    }, remaining);
  }

  // --- Auto hooks ---
  requestAnimationFrame(animateProgress);
  setStatus('Loading...');

  // DOM ready  ~30%
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      targetProgress = 30;
      setStatus('Initializing...');
    });
  } else {
    targetProgress = 30;
  }

  // window.load  ~90%
  window.addEventListener('load', function () {
    targetProgress = 90;
    setStatus('Almost ready...');
    // Small grace period for any async rendering, then hide
    setTimeout(hide, 300);
  });

  // Safety timeout
  setTimeout(hide, maxDisplay);

  // --- Public API ---
  window.NW_LOADER = {
    hide: hide,
    status: setStatus,
    progress: function (pct) { targetProgress = Math.min(100, pct); }
  };
})();
