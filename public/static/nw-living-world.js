/* ═══════════════════════════════════════════════════════════════
   NW LIVING WORLD — Dynamic Stats, Time-Based Events & Easter Eggs
   Makes nwg-the-game.html feel alive. Stats change, events trigger,
   the ghostly monkey walks at 3:33 AM.
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  // ── Seed-based pseudo-random (deterministic per day) ──────
  function dayHash(offset) {
    var d = new Date();
    var seed = d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate() + (offset || 0);
    seed = ((seed * 1103515245 + 12345) & 0x7fffffff);
    return seed;
  }
  function dayRand(min, max, offset) {
    var h = dayHash(offset);
    return min + (h % (max - min + 1));
  }

  // ── Dynamic stat values that change daily ─────────────────
  var LIVING_STATS = {
    // Gerald's incident reports this month
    geraldReports: function() { return dayRand(38, 67, 1); },
    // Monkey escapes this week
    monkeyEscapes: function() { return dayRand(3, 7, 2); },
    // Karen's complaints filed
    karenComplaints: function() { return dayRand(298, 330, 3); },
    // Tavern stories told tonight
    tavernStories: function() { return dayRand(12, 34, 4); },
    // Grand Market active traders
    marketTraders: function() { return dayRand(89, 156, 5); },
    // Monkey King mood
    monkeyMood: function() {
      var moods = ['Judgmental', 'Royally Annoyed', 'Surprisingly Philosophical', 'Banana-Deprived', 'Regally Bored', 'Plotting Something'];
      return moods[dayRand(0, moods.length - 1, 6)];
    },
    // Gerald Jr. stolen items today
    geraldJrThefts: function() { return dayRand(2, 11, 7); },
    // Oracle accuracy today
    oracleAccuracy: function() { return '100%'; }, // always 100%
    // Duel snack boxes remaining
    snackBoxes: function() {
      var h = new Date().getHours();
      if (h < 8) return dayRand(40, 50, 8);
      if (h < 12) return Math.max(0, dayRand(40, 50, 8) - h * 4);
      return 0; // sold out after noon
    },
    // Current weather
    weather: function() {
      var w = ['Clear Skies (Aurora Tonight)', 'Light Enchanted Rain', 'Bioluminescent Fog', 'Cherry Blossom Wind', 'Monkey Cloud Formation', 'Starfall Evening'];
      return w[dayRand(0, w.length - 1, 9)];
    }
  };

  // ── Inject dynamic stats into existing text ───────────────
  function animateStat(el, target) {
    var start = 0;
    var dur = 800;
    var t0 = performance.now();
    function step(ts) {
      var p = Math.min(1, (ts - t0) / dur);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * ease);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function injectLivingStats() {
    // Update Gerald's incident reports
    document.querySelectorAll('.highlight').forEach(function(el) {
      var text = el.textContent || '';
      if (text.match(/312 formal complaints/i)) {
        var count = LIVING_STATS.karenComplaints();
        el.textContent = count + ' formal complaints';
        el.title = 'Updated today — Karen never stops filing';
      }
      if (text.match(/47 incident reports/i) || text.match(/47 report/i)) {
        // This is in a paragraph, harder to target
      }
    });

    // Find specific data-i18n paragraphs and inject living data
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (!key) return;

      // Add living data tooltips
      if (key === 'feat_monkeys_p' && el.textContent) {
        el.setAttribute('data-living', 'true');
      }
    });
  }

  // ── Time-based events ─────────────────────────────────────
  function checkTimeEvents() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();

    // 3:33 AM — Ghostly Monkey Easter Egg
    if (h === 3 && m === 33) {
      triggerGhostlyMonkey();
    }

    // Dusk (6-7 PM) — Beacon Tower glow
    if (h >= 18 && h < 19) {
      document.body.classList.add('nw-dusk');
    }

    // Midnight — bioluminescent effect
    if (h === 0) {
      document.body.classList.add('nw-midnight');
    }

    // Golden hour styling
    if (h >= 6 && h < 8) {
      document.body.classList.add('nw-dawn');
    }
  }

  // ── Ghostly Monkey at 3:33 AM ─────────────────────────────
  function triggerGhostlyMonkey() {
    if (document.getElementById('nw-ghostly-monkey')) return;

    var ghost = document.createElement('div');
    ghost.id = 'nw-ghostly-monkey';
    ghost.innerHTML = '🐒';
    ghost.title = 'The dev team says it\'s a feature. The QA team says they never added it.';
    ghost.style.cssText = 'position:fixed;bottom:20%;font-size:3rem;opacity:0;z-index:9999;pointer-events:none;filter:drop-shadow(0 0 20px rgba(0,212,255,.6)) brightness(1.5) saturate(0.3);transition:opacity 2s ease;';

    document.body.appendChild(ghost);

    // Walk across screen
    var x = -60;
    ghost.style.left = x + 'px';
    setTimeout(function() { ghost.style.opacity = '0.6'; }, 100);

    var walkInterval = setInterval(function() {
      x += 1.5;
      ghost.style.left = x + 'px';
      if (x > window.innerWidth + 60) {
        clearInterval(walkInterval);
        ghost.style.opacity = '0';
        setTimeout(function() { ghost.remove(); }, 2000);
      }
    }, 30);
  }

  // ── Living World Status Bar ───────────────────────────────
  function createStatusBar() {
    // Only add to nwg-the-game.html
    if (!window.location.pathname.includes('nwg-the-game')) return;

    var bar = document.createElement('div');
    bar.className = 'nw-living-bar';
    bar.innerHTML = [
      '<div class="nw-living-item" title="Gerald\'s incident reports (updates daily)">',
      '  <span class="nw-living-icon">🐸</span>',
      '  <span class="nw-living-label">Gerald Reports:</span>',
      '  <span class="nw-living-val" id="nw-live-gerald">' + LIVING_STATS.geraldReports() + '</span>',
      '</div>',
      '<div class="nw-living-item" title="Monkey King\'s mood (changes daily)">',
      '  <span class="nw-living-icon">🐵</span>',
      '  <span class="nw-living-label">King\'s Mood:</span>',
      '  <span class="nw-living-val">' + LIVING_STATS.monkeyMood() + '</span>',
      '</div>',
      '<div class="nw-living-item" title="Castle weather (changes daily)">',
      '  <span class="nw-living-icon">🌤️</span>',
      '  <span class="nw-living-label">Weather:</span>',
      '  <span class="nw-living-val">' + LIVING_STATS.weather() + '</span>',
      '</div>',
      '<div class="nw-living-item" title="Karen\'s Duel-Day Snack Boxes (sells out by noon)">',
      '  <span class="nw-living-icon">📦</span>',
      '  <span class="nw-living-label">Snack Boxes:</span>',
      '  <span class="nw-living-val">' + (LIVING_STATS.snackBoxes() || 'SOLD OUT') + '</span>',
      '</div>',
      '<div class="nw-living-item" title="Gerald Jr.\'s stolen items today">',
      '  <span class="nw-living-icon">🏴‍☠️</span>',
      '  <span class="nw-living-label">Gerald Jr. Thefts:</span>',
      '  <span class="nw-living-val">' + LIVING_STATS.geraldJrThefts() + '</span>',
      '</div>'
    ].join('');

    // Insert after hero section
    var hero = document.querySelector('.hero');
    if (hero && hero.nextSibling) {
      hero.parentNode.insertBefore(bar, hero.nextSibling);
    } else {
      var nav = document.querySelector('.section-nav');
      if (nav) nav.parentNode.insertBefore(bar, nav);
    }
  }

  // ── NPC Chat Widget removed — handled by nw-npc-chat.js ──

  // ── Init ──────────────────────────────────────────────────
  function init() {
    createStatusBar();
    injectLivingStats();
    checkTimeEvents();

    // Re-check time events every minute
    setInterval(checkTimeEvents, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.NW_LIVING_WORLD = {
    stats: LIVING_STATS,
    triggerGhostlyMonkey: triggerGhostlyMonkey
  };
})();
