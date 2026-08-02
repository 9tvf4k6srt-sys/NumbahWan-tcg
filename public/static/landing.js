/* 台股戰情室 TWSE warroom — landing interactions */
(function () {
  "use strict";

  /* ── language toggle ── */
  var langBtn = document.getElementById("lang-toggle");
  function setLang(en) {
    document.body.classList.toggle("lang-en", en);
    if (langBtn) langBtn.textContent = en ? "中" : "EN";
    try { localStorage.setItem("xd-lang", en ? "en" : "zh"); } catch (e) {}
  }
  if (langBtn) {
    langBtn.addEventListener("click", function () {
      setLang(!document.body.classList.contains("lang-en"));
    });
    try { if (localStorage.getItem("xd-lang") === "en") setLang(true); } catch (e) {}
  }

  /* ── scroll reveal ── */
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  /* ── count-up stats ── */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var dec = target % 1 !== 0 ? 1 : 0;
    var t0 = null;
    var dur = 1400;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (target * eased).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var statIO = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          countUp(en.target);
          statIO.unobserve(en.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll(".stat-num").forEach(function (el) { statIO.observe(el); });

  /* ── signal light board ── */
  var LIGHTS = {
    sell: {
      tone: "sell", tag: "RED · EXIT",
      title: { zh: "紅燈 · 出場", en: "Red · exit" },
      doit: { zh: "隔天開盤賣出，先保護口袋。", en: "Sell at next open — protect capital first." },
      when: { zh: "市場壓力很大、風險偏高的時候。檢驗：之後約 10 日應該要跌（或我們躲過了痛）。", en: "When pressure is high and risk elevated. Graded on the next ~10 sessions dropping (or pain avoided)." },
      wit: { zh: "「會賣才是師傅」這句話老，但老話通常活得比帳戶久。", en: "\"Knowing when to sell makes the master\" — old saying, but old sayings outlive most portfolios." }
    },
    cash: {
      tone: "hold", tag: "CASH · WAIT",
      title: { zh: "空手 · 等綠", en: "Cash · wait green" },
      doit: { zh: "已經出場：耐心等綠燈再買回。", en: "Already out — patiently wait for green to re-enter." },
      when: { zh: "紅燈之後、綠燈之前。空手不是浪費時間，是在等好球。", en: "Between red and green. Cash isn't wasted time — it's waiting for a good pitch." },
      wit: { zh: "空手最難。這也是它值錢的原因。", en: "Doing nothing is the hardest trade. That's exactly why it pays." }
    },
    trim: {
      tone: "trim", tag: "AMBER · DE-RISK",
      title: { zh: "黃燈 · 先降壓", en: "Amber · de-risk" },
      doit: { zh: "可以先減一點部位，還不用全出。", en: "Trim some size — no full exit yet." },
      when: { zh: "氣氛開始緊，但還沒到紅燈。先繫安全帶，不用跳車。", en: "Getting tight, but not crash-red. Buckle up — no need to jump out." },
      wit: { zh: "黃燈不是叫你衝，是叫你別再加速了。", en: "Amber doesn't mean speed up. It means stop accelerating." }
    },
    hold: {
      tone: "hold", tag: "HOLD · STAY",
      title: { zh: "抱 · 維持", en: "Hold · stay" },
      doit: { zh: "繼續抱著，不用動作。", en: "Stay put — no action needed." },
      when: { zh: "沒有特別急的進出訊號。市場上班，你下班。", en: "No urgent signal either way. The market works; you clock out." },
      wit: { zh: "最好的交易，常常是你沒做的那一筆。", en: "The best trade is often the one you didn't make." }
    },
    buy: {
      tone: "buy", tag: "GREEN · ENTER",
      title: { zh: "綠燈 · 進場", en: "Green · enter" },
      doit: { zh: "隔天開盤買回或加碼。", en: "Buy back or add at next open." },
      when: { zh: "紅燈後深跌反彈、接近波段低點。檢驗：之後 2–3 日市場應該要漲。", en: "Deep bounce after red, near the swing low. Graded on the market rising within 2–3 sessions." },
      wit: { zh: "買在別人不敢買的時候——聽起來勇敢，其實只是照表操課。", en: "Buying when others won't sounds brave. Really, it's just following the schedule." }
    }
  };

  var detail = document.getElementById("light-detail");
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".light-btn"));
  function renderLight(id) {
    var L = LIGHTS[id];
    if (!L || !detail) return;
    detail.className = "light-detail tone-" + L.tone;
    detail.innerHTML =
      '<span class="ld-tag mono">' + L.tag + "</span>" +
      '<h3 class="ld-title"><span class="zh">' + L.title.zh + '</span><span class="en">' + L.title.en + "</span></h3>" +
      '<p class="ld-do"><span class="zh">' + L.doit.zh + '</span><span class="en">' + L.doit.en + "</span></p>" +
      '<p class="ld-when"><span class="zh">' + L.when.zh + '</span><span class="en">' + L.when.en + "</span></p>" +
      '<p class="ld-wit"><span class="zh">' + L.wit.zh + '</span><span class="en">' + L.wit.en + "</span></p>";
  }
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      buttons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      renderLight(btn.getAttribute("data-light"));
    });
  });
  renderLight("buy");

  /* ── equity curve canvas (illustrative path, honest endpoints) ── */
  var canvas = document.getElementById("equity-canvas");
  if (canvas) {
    var drawn = false;
    function drawCurve(progress) {
      var dpr = window.devicePixelRatio || 1;
      var w = canvas.clientWidth, h = canvas.clientHeight || 260;
      canvas.width = w * dpr; canvas.height = h * dpr;
      var ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      var padL = 8, padR = 8, padT = 18, padB = 10;
      var iw = w - padL - padR, ih = h - padT - padB;

      // synthetic but shape-honest paths:
      // B&H: 0% -> +351%, dips to -32% dd zone mid-way
      // Strategy: 0% -> +957%, shallow dips (max -13%), steps aside at corrections
      var N = 220;
      function bhPath(i) {
        var t = i / N;
        var base = 351 * t;
        var wave = Math.sin(t * 9.2) * 26 * (1 - t * 0.4) + Math.sin(t * 23) * 9;
        var crash = -Math.exp(-Math.pow((t - 0.62) / 0.09, 2)) * 95;   // 2024-style correction
        var crash2 = -Math.exp(-Math.pow((t - 0.3) / 0.07, 2)) * 55;
        return base + wave + crash + crash2;
      }
      function stPath(i) {
        var t = i / N;
        var base = 957 * Math.pow(t, 0.94);
        var wave = Math.sin(t * 9.2) * 12 * (1 - t * 0.4) + Math.sin(t * 21) * 5;
        var dodge = -Math.exp(-Math.pow((t - 0.62) / 0.09, 2)) * 22;   // shallow dip where BH crashed
        var dodge2 = -Math.exp(-Math.pow((t - 0.3) / 0.07, 2)) * 14;
        return base + wave + dodge + dodge2;
      }
      var maxV = 920, minV = -60;
      function X(i) { return padL + (i / N) * iw; }
      function Y(v) { return padT + ih - ((v - minV) / (maxV - minV)) * ih; }

      // zero line
      ctx.strokeStyle = "rgba(255,255,255,0.09)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(w - padR, Y(0)); ctx.stroke();
      ctx.setLineDash([]);

      var upto = Math.max(2, Math.floor(N * progress));

      // area fill under strategy
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      for (var a = 0; a <= upto; a++) ctx.lineTo(X(a), Y(stPath(a)));
      ctx.lineTo(X(upto), Y(0));
      ctx.closePath();
      var grad = ctx.createLinearGradient(0, padT, 0, h);
      grad.addColorStop(0, "rgba(61,220,151,0.16)");
      grad.addColorStop(1, "rgba(61,220,151,0)");
      ctx.fillStyle = grad;
      ctx.fill();

      // B&H line
      ctx.beginPath();
      for (var b = 0; b <= upto; b++) { var bx = X(b), by = Y(bhPath(b)); b ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by); }
      ctx.strokeStyle = "rgba(154,161,173,0.65)";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // strategy line
      ctx.beginPath();
      for (var s = 0; s <= upto; s++) { var sx = X(s), sy = Y(stPath(s)); s ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }
      ctx.strokeStyle = "#3ddc97";
      ctx.lineWidth = 2.6;
      ctx.shadowColor = "rgba(61,220,151,0.55)";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // endpoint dots
      if (progress >= 1) {
        [[stPath(N), "#3ddc97"], [bhPath(N), "#9aa1ad"]].forEach(function (p) {
          ctx.beginPath();
          ctx.arc(X(N) - 2, Y(p[0]), 4, 0, Math.PI * 2);
          ctx.fillStyle = p[1];
          ctx.fill();
        });
      }
    }
    drawCurve(0);
    var chartIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !drawn) {
            drawn = true;
            var t0 = null, dur = 2000;
            (function anim(ts) {
              if (!t0) t0 = ts;
              var p = Math.min(1, (ts - t0) / dur);
              drawCurve(1 - Math.pow(1 - p, 2.4));
              if (p < 1) requestAnimationFrame(anim);
            })(performance.now());
            chartIO.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    chartIO.observe(canvas);

    var rz;
    window.addEventListener("resize", function () {
      clearTimeout(rz);
      rz = setTimeout(function () { drawCurve(drawn ? 1 : 0); }, 160);
    });
  }

  /* ── footer year ── */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = String(new Date().getFullYear());
})();

/* ── SOUND DESIGN (WebAudio, synthesized — no audio files) ── */
var SOUND = (function () {
  "use strict";
  var ctx = null;
  var enabled = true;
  try { enabled = localStorage.getItem("xd-sound") !== "off"; } catch (e) {}

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(opts) {
    if (!enabled) return;
    var c = ac();
    if (!c) return;
    var t0 = c.currentTime + (opts.delay || 0);
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.glide) osc.frequency.exponentialRampToValueAtTime(opts.glide, t0 + (opts.dur || 0.12));
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(opts.vol || 0.12, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.dur || 0.12));
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + (opts.dur || 0.12) + 0.05);
  }

  /* radio static loop (band-passed noise) */
  var staticNodes = null;
  function staticStop() {
    if (staticNodes) {
      try { staticNodes.src.stop(); } catch (e) {}
      try { staticNodes.src.disconnect(); } catch (e) {}
      staticNodes = null;
    }
  }
  function staticStart() {
    if (!enabled) return;
    var c = ac();
    if (!c) return;
    staticStop();
    var len = 1.2;
    var buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    var f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1500;
    f.Q.value = 0.5;
    var g = c.createGain();
    g.gain.value = 0.011;
    src.connect(f).connect(g).connect(c.destination);
    src.start();
    staticNodes = { src: src, g: g };
  }

  return {
    isEnabled: function () { return enabled; },
    toggle: function () {
      enabled = !enabled;
      try { localStorage.setItem("xd-sound", enabled ? "on" : "off"); } catch (e) {}
      if (!enabled) staticStop();
      return enabled;
    },
    click: function () { tone({ freq: 620, type: "triangle", dur: 0.07, vol: 0.08 }); },
    tick: function (i) { tone({ freq: 440 + i * 90, type: "sine", dur: 0.09, vol: 0.07 }); },
    reveal: function () {
      tone({ freq: 523.25, type: "sine", dur: 0.22, vol: 0.11 });          // C5
      tone({ freq: 784.0, type: "sine", dur: 0.3, vol: 0.09, delay: 0.09 }); // G5
    },
    close: function () { tone({ freq: 520, glide: 300, type: "triangle", dur: 0.14, vol: 0.07 }); },
    whoosh: function () {
      if (!enabled) return;
      var c = ac();
      if (!c) return;
      var t0 = c.currentTime;
      var len = 0.35;
      var buf = c.createBuffer(1, c.sampleRate * len, c.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      var src = c.createBufferSource();
      src.buffer = buf;
      var filter = c.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(400, t0);
      filter.frequency.exponentialRampToValueAtTime(2600, t0 + len);
      filter.Q.value = 1.2;
      var g = c.createGain();
      g.gain.setValueAtTime(0.14, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
      src.connect(filter).connect(g).connect(c.destination);
      src.start(t0);
    },
    /* sonar ping — one per sweep revolution */
    ping: function () { tone({ freq: 1180, type: "sine", dur: 0.5, vol: 0.042 }); },
    /* target lock-on — two rising chirps + confirm tone */
    lockOn: function () {
      tone({ freq: 740, glide: 988, type: "square", dur: 0.09, vol: 0.055 });
      tone({ freq: 740, glide: 988, type: "square", dur: 0.09, vol: 0.055, delay: 0.13 });
      tone({ freq: 1318.5, type: "sine", dur: 0.26, vol: 0.07, delay: 0.27 });
    },
    radioOn: staticStart,
    radioOff: staticStop
  };
})();

/* ── live quote + provenance stamps ──
   Global on purpose: the war room verdict panel (warroom.js) calls loadQuote()
   and consumes the desk-live / dl-* / ds-* element IDs.
   Only state: none. Errors degrade to a labeled error state, never throw. */
function loadQuote() {
  "use strict";
  var isEn = function () { return document.body.classList.contains("lang-en"); };
  function fmtNum(n) {
    return n == null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  var strip = document.getElementById("desk-live");
  var priceEl = document.getElementById("dl-price");
  var chgEl = document.getElementById("dl-chg");
  var metaEl = document.getElementById("dl-meta");
  var dsQuote = document.getElementById("ds-quote");
  var dsRead = document.getElementById("ds-read");
  if (!strip) return;
  strip.setAttribute("data-state", "loading");
  if (dsRead) dsRead.textContent = new Date().toLocaleString(isEn() ? "en-US" : "zh-TW", { hour12: false });
  fetch("/api/market-now", { cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.ok) throw new Error((d && d.error) || "no data");
      var q = d.quote;
      if (priceEl) priceEl.textContent = fmtNum(q.price);
      if (chgEl && q.changePct != null) {
        var up = q.changePct >= 0;
        chgEl.textContent = (up ? "▲ +" : "▼ ") + q.changePct.toFixed(2) + "%";
        chgEl.className = "dl-chg mono " + (up ? "up" : "down");
      }
      var quoteStamp = (q.date || "?") + " " + (q.time || "");
      var sessionZh = { "pre-open": "開盤前", trading: "盤中", closed: "已收盤", weekend: "休市" };
      var sessionEn = { "pre-open": "pre-open", trading: "TRADING", closed: "closed", weekend: "weekend" };
      var sLabel = isEn() ? sessionEn[d.session] : sessionZh[d.session];
      var stale = !q.isRealtime;
      strip.setAttribute("data-state", stale ? "stale" : "live");
      if (metaEl) {
        metaEl.textContent = isEn()
          ? sLabel + " · exchange print " + quoteStamp + " · fetched " + d.fetchedAtTaipei
          : sLabel + " · 交易所時間 " + quoteStamp + " · 讀取於 " + d.fetchedAtTaipei;
      }
      if (dsQuote) dsQuote.textContent = quoteStamp + (stale ? (isEn() ? " (last close)" : "（最近收盤）") : " (live)");
    })
    .catch(function () {
      strip.setAttribute("data-state", "error");
      if (priceEl) priceEl.textContent = "—";
      if (metaEl) metaEl.textContent = isEn() ? "Live feed unreachable — signal basis still valid" : "即時行情連不上——訊號依據仍然有效";
      if (dsQuote) dsQuote.textContent = isEn() ? "unavailable" : "無法取得";
    });
}

/* sound toggle button wiring */
(function () {
  "use strict";
  var btn = document.getElementById("desk-sound");
  if (!btn || typeof SOUND === "undefined") return;
  function paint() {
    var on = SOUND.isEnabled();
    btn.textContent = on ? "SOUND ON" : "SOUND OFF";
    btn.classList.toggle("off", !on);
  }
  btn.addEventListener("click", function () {
    var on = SOUND.toggle();
    paint();
    if (on) SOUND.click();
  });
  paint();
})();
