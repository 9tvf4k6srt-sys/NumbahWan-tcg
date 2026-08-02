/* ── TWSE WAR ROOM — PPI radar console with phosphor persistence ──
   Depends on: window.SOUND (landing.js), window.RadarCore (radar-core.js)
   Verdict panel reuses the desk-* IDs so quote/provenance plumbing stays identical. */
(function () {
  "use strict";
  var wr = document.getElementById("warroom");
  if (!wr || typeof RadarCore === "undefined") return;

  var R = RadarCore;
  var isEn = function () { return document.body.classList.contains("lang-en"); };
  var reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var canvas = document.getElementById("wr-radar");
  // willReadFrequently: force software canvas so getImageData readback is
  // deterministic (headless SwiftShader otherwise returns blank buffers
  // from GPU-backed canvases — pixel tests depend on this).
  var ctx = canvas.getContext("2d", { willReadFrequently: true });
  var scanBtn = document.getElementById("wr-scan");
  var clockEl = document.getElementById("wr-clock");
  var brgEl = document.getElementById("wr-brg");
  var swpEl = document.getElementById("wr-swp");
  var contactsEl = document.getElementById("wr-contacts");
  var modeEl = document.getElementById("wr-mode");
  var logEl = document.getElementById("wr-log");
  var standbyEl = document.getElementById("wr-standby");
  var verdictEl = document.getElementById("desk-result");

  /* Real signal events → radar contacts (from data/champion-signal-dates.json, post-2023) */
  /* New champion hi1000_ft4: same signal dates + July 2026 retreat pair.
     07-06 soft red (size→0.4) plotted amber; 07-08 full retreat plotted red. */
  var EVENTS = [
    { date: "2024-07-18", kind: "red" },
    { date: "2024-09-06", kind: "green" },
    { date: "2025-02-26", kind: "red" },
    { date: "2025-04-10", kind: "green" },
    { date: "2026-03-04", kind: "red" },
    { date: "2026-03-10", kind: "green" },
    { date: "2026-06-05", kind: "red" },
    { date: "2026-07-06", kind: "amber" },
    { date: "2026-07-08", kind: "red" },
  ];

  var SWEEP_MS = 9000;          // idle sweep period
  var SCAN_SWEEP_MS = 1600;     // combat sweep period during a scan
  var TRAIL_SLICES = 26;        // phosphor trail wedges behind the beam
  var BLIP_DECAY_DEG = 300;

  var running = false;
  var scanning = false;
  var rafId = 0;
  var lastAngle = 0;
  var timers = [];
  var clockTimer = 0;

  /* ── sizing: JS locks the scope to an EXACT square, centered in the wrap.
     Fixes iOS bug where flex-stretched CSS box + fixed backing store made the
     scope start tall and snap to normal size when the verdict brief appeared. ── */
  var cw = 0, ch = 0, cx = 0, cy = 0, radius = 0;
  function resize() {
    var wrap = canvas.parentElement;
    if (!wrap) return;
    var rect = wrap.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var side = Math.max(200, Math.floor(Math.min(rect.width, rect.height)));
    if (rect.width < 4 || rect.height < 4) return; // hidden — nothing to measure
    if (cw === side && ch === side) return;        // already square at this size
    cw = side;
    ch = side;
    canvas.style.width = side + "px";
    canvas.style.height = side + "px";
    canvas.width = Math.floor(side * dpr);
    canvas.height = Math.floor(side * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = cw / 2;
    cy = ch / 2;
    radius = side / 2 - 10;
    if (!running) drawFrame(0);
  }

  /* re-square on ANY layout shift: verdict reveal, iOS URL-bar collapse, rotation */
  var ro = null;
  try {
    if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
      ro = new ResizeObserver(function () { resize(); });
      ro.observe(canvas.parentElement);
    }
  } catch (e) {}

  /* ── draw one frame. sweepDeg: beam bearing in degrees ── */
  function drawFrame(sweepDeg) {
    ctx.clearRect(0, 0, cw, ch);

    /* scope background — deep phosphor green-black with radial falloff */
    var bg = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
    bg.addColorStop(0, "#06170c");
    bg.addColorStop(0.75, "#041008");
    bg.addColorStop(1, "#010603");
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(cx, cy, radius + 8, 0, R.TAU); ctx.fill();

    /* bezel */
    ctx.strokeStyle = "rgba(57,255,106,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, radius + 6, 0, R.TAU); ctx.stroke();

    /* range rings at 25/50/75/100% */
    ctx.strokeStyle = "rgba(57,255,106,0.16)";
    ctx.lineWidth = 1;
    for (var ri = 1; ri <= 4; ri++) {
      ctx.beginPath(); ctx.arc(cx, cy, (radius * ri) / 4, 0, R.TAU); ctx.stroke();
    }

    /* crosshair axes */
    ctx.strokeStyle = "rgba(57,255,106,0.13)";
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    /* bearing ticks every 30°, cardinal labels */
    ctx.fillStyle = "rgba(57,255,106,0.5)";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (var t = 0; t < 360; t += 30) {
      var p1 = R.polarToCartesian(cx, cy, radius - 1, t);
      var p2 = R.polarToCartesian(cx, cy, radius - 7, t);
      ctx.strokeStyle = "rgba(57,255,106,0.4)";
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      if (t % 90 === 0) {
        var lp = R.polarToCartesian(cx, cy, radius - 16, t);
        ctx.fillText(String(t).padStart(3, "0"), lp.x, lp.y);
      }
    }

    /* phosphor sweep trail — wedges fading behind the beam */
    for (var i = TRAIL_SLICES; i >= 0; i--) {
      var a = R.trailAlpha(i, TRAIL_SLICES, 0.16);
      if (a < 0.004) continue;
      var degFrom = sweepDeg - i * (TRAIL_SLICES > 0 ? 300 / TRAIL_SLICES : 0);
      var degTo = sweepDeg - (i - 1) * (TRAIL_SLICES > 0 ? 300 / TRAIL_SLICES : 0);
      ctx.fillStyle = "rgba(57,255,106," + a.toFixed(4) + ")";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, R.bearingRad(degFrom), R.bearingRad(degTo));
      ctx.closePath();
      ctx.fill();
    }

    /* the beam itself */
    var tip = R.polarToCartesian(cx, cy, radius, sweepDeg);
    var beam = ctx.createLinearGradient(cx, cy, tip.x, tip.y);
    beam.addColorStop(0, "rgba(57,255,106,0.25)");
    beam.addColorStop(1, "rgba(140,255,180,0.95)");
    ctx.strokeStyle = beam;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tip.x, tip.y); ctx.stroke();

    /* contacts — blips whose brightness follows phosphor persistence */
    var contacts = R.contactsFromEvents(EVENTS, sweepDeg);
    var lit = 0;
    contacts.forEach(function (c) {
      var inten = reduced ? 0.85 : R.blipIntensity(c.bearing, sweepDeg, BLIP_DECAY_DEG);
      if (inten <= 0.01) return;
      lit++;
      var p = R.polarToCartesian(cx, cy, radius * c.radius, c.bearing);
      var col = c.kind === "red" ? "255,92,92" : c.kind === "amber" ? "255,184,77" : "57,255,106";
      var sz = 3 + inten * 2.5;
      ctx.fillStyle = "rgba(" + col + "," + (0.25 + inten * 0.75).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, R.TAU); ctx.fill();
      if (inten > 0.5) {
        ctx.strokeStyle = "rgba(" + col + "," + ((inten - 0.5) * 0.5).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, sz + 6 * (1 - inten), 0, R.TAU); ctx.stroke();
      }
    });

    /* center pip */
    ctx.fillStyle = "rgba(140,255,180,0.9)";
    ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, R.TAU); ctx.fill();

    if (contactsEl) contactsEl.textContent = String(lit);
  }

  /* ── animation loop: phase-accumulator sweep.
     Angle advances by (dt × current speed) each frame — so switching between
     idle (9s) and combat (1.6s) sweep changes VELOCITY, never position.
     Fixes the visible beam jump when a scan starts/ends. ── */
  var phase = 0;      // accumulated sweep angle in degrees, 0..360
  var lastTs = 0;     // last rAF timestamp
  function frame(now) {
    if (!running) return;
    if (!lastTs) lastTs = now;
    var dt = Math.min(now - lastTs, 100); // clamp tab-switch gaps
    lastTs = now;
    var period = scanning ? SCAN_SWEEP_MS : SWEEP_MS;
    phase = (phase + (dt / period) * 360) % 360;
    var angle = reduced ? 0 : phase;
    drawFrame(angle);

    /* sonar ping each time the beam crosses 12 o'clock */
    if (!reduced && angle < lastAngle && typeof SOUND !== "undefined") SOUND.ping();
    lastAngle = angle;

    if (brgEl) brgEl.textContent = angle.toFixed(1).padStart(5, "0") + "°";
    rafId = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (running || reduced) { if (reduced) drawFrame(0); return; }
    running = true;
    lastTs = 0;
    rafId = requestAnimationFrame(frame);
  }
  function stopLoop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  /* ── scan sequence: military sweep → intel log → verdict brief ── */
  var LOG_LINES = [
    { zh: "▸ 建立台股資料鏈路… OK", en: "▸ UPLINK TAIEX FEED… OK" },
    { zh: "▸ 運算壓力分數… 完成", en: "▸ PRESSURE SCORE… COMPUTED" },
    { zh: "▸ 比對波段低點閘門… 通過", en: "▸ SWING-LOW GATES… PASS" },
    { zh: "▸ 鎖定燈號… 空手待命", en: "▸ SIGNAL LOCK… STAND BY IN CASH" },
  ];

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function resetPanels() {
    if (logEl) { logEl.innerHTML = ""; logEl.hidden = true; }
    if (verdictEl) { verdictEl.hidden = true; verdictEl.classList.remove("reveal-in"); }
    if (standbyEl) standbyEl.hidden = true;
    if (modeEl) modeEl.textContent = "SCAN";
  }

  function runScan() {
    if (scanning) return;
    clearTimers();
    scanning = true;
    if (scanBtn) {
      scanBtn.disabled = true;
      scanBtn.querySelector(".zh").textContent = "◉ 掃描中 SWEEPING…";
      scanBtn.querySelector(".en").textContent = "◉ SWEEPING…";
    }
    resetPanels();
    if (typeof loadQuote === "function") loadQuote(); // defined in landing.js desk IIFE — global hook below
    if (typeof SOUND !== "undefined") SOUND.radioOn();

    var step = reduced ? 80 : 620;
    LOG_LINES.forEach(function (line, i) {
      timers.push(setTimeout(function () {
        if (logEl) {
          logEl.hidden = false;
          var li = document.createElement("li");
          li.textContent = isEn() ? line.en : line.zh;
          logEl.appendChild(li);
          while (logEl.children.length > 4) logEl.removeChild(logEl.firstChild);
        }
        if (typeof SOUND !== "undefined") SOUND.tick(i);
      }, 350 + i * step));
    });

    timers.push(setTimeout(function () {
      scanning = false;
      if (modeEl) modeEl.textContent = "LOCK";
      if (verdictEl) { verdictEl.hidden = false; verdictEl.classList.add("reveal-in"); }
      if (typeof SOUND !== "undefined") { SOUND.lockOn(); SOUND.radioOff(); }
      try { if (navigator.vibrate) navigator.vibrate(20); } catch (e) {}
      if (scanBtn) {
        scanBtn.disabled = false;
        scanBtn.querySelector(".zh").textContent = "▶ 重新掃描 RE-SWEEP";
        scanBtn.querySelector(".en").textContent = "▶ RE-SWEEP";
      }
    }, 350 + LOG_LINES.length * step + 700));
  }

  /* ── open / close ── */
  function openRoom() {
    wr.hidden = false;
    void wr.offsetWidth;
    wr.classList.add("open");
    document.body.classList.add("desk-locked");
    if (typeof SOUND !== "undefined") SOUND.whoosh();
    resize();
    startLoop();
    if (standbyEl) standbyEl.hidden = false;
    if (modeEl) modeEl.textContent = "STANDBY";
    if (swpEl) swpEl.textContent = (SWEEP_MS / 1000).toFixed(1) + "s";
    /* auto-scan shortly after arrival — "click → realistic scan" is the core ask */
    timers.push(setTimeout(runScan, 900));
  }

  function closeRoom() {
    clearTimers();
    stopLoop();
    wr.classList.remove("open");
    document.body.classList.remove("desk-locked");
    if (typeof SOUND !== "undefined") { SOUND.close(); SOUND.radioOff(); }
    scanning = false;
    timers.push(setTimeout(function () { wr.hidden = true; }, 420));
  }

  /* ── clock ── */
  function tickClock() {
    if (!clockEl) return;
    clockEl.textContent = new Date().toLocaleTimeString("en-GB", { hour12: false }) + " LOCAL";
  }

  /* ── wiring ── */
  document.querySelectorAll("[data-desk-open]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof SOUND !== "undefined") SOUND.click();
      openRoom();
    });
  });
  wr.querySelectorAll("[data-desk-close]").forEach(function (el) {
    el.addEventListener("click", function (e) { e.preventDefault(); closeRoom(); });
  });
  if (scanBtn) scanBtn.addEventListener("click", function () {
    if (typeof SOUND !== "undefined") SOUND.click();
    runScan();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !wr.hidden) closeRoom();
  });
  window.addEventListener("resize", function () { if (!wr.hidden) resize(); });

  clockTimer = setInterval(tickClock, 1000);
  tickClock();
})();
