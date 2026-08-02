/* ── RadarCore — pure radar math, no DOM. Shared by warroom.js, /__test__, and node unit tests. ── */
(function (root) {
  "use strict";

  var TAU = Math.PI * 2;

  /* canvas angle for a bearing in degrees (0° = 12 o'clock, clockwise) */
  function bearingRad(deg) {
    return ((deg - 90) * Math.PI) / 180;
  }

  function polarToCartesian(cx, cy, r, deg) {
    var a = bearingRad(deg);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  /* sweep angle after elapsed ms, period ms per revolution */
  function sweepAngle(elapsedMs, periodMs) {
    if (periodMs <= 0) return 0;
    return ((elapsedMs % periodMs) / periodMs) * 360;
  }

  /* shortest clockwise distance from `from` to `to` in degrees, 0..360 */
  function cwDelta(from, to) {
    var d = (to - from) % 360;
    if (d < 0) d += 360;
    return d;
  }

  /* Blip brightness for a target at targetDeg given sweep at sweepDeg.
     Target lights up just after the beam passes it and decays over decayDeg.
     Returns 0 while the beam has not yet (re)reached the target. */
  function blipIntensity(targetDeg, sweepDeg, decayDeg) {
    var behind = cwDelta(targetDeg, sweepDeg); // how far the beam has moved past the target
    if (behind === 0) return 1;
    if (behind >= decayDeg) return 0;
    return 1 - behind / decayDeg;
  }

  /* Exponential phosphor persistence: brightness left after dtMs with half-life hlMs */
  function phosphorDecay(dtMs, halfLifeMs) {
    if (halfLifeMs <= 0) return 0;
    return Math.pow(0.5, dtMs / halfLifeMs);
  }

  /* Trail alpha for the wedge slice i of n behind the sweep (0 = at the beam) */
  function trailAlpha(i, n, maxAlpha) {
    if (n <= 1) return maxAlpha;
    return maxAlpha * Math.pow(1 - i / n, 2.2);
  }

  /* Convert signal event history into radar contacts.
     events: [{date:"YYYY-MM-DD", kind:"red"|"green"}] sorted oldest→newest.
     Bearing spreads events around the dial by index; radius: newer = closer to rim. */
  function contactsFromEvents(events, nowDeg) {
    var out = [];
    var n = events.length;
    for (var i = 0; i < n; i++) {
      var bearing = (i * 360) / Math.max(n, 1);
      var recency = n <= 1 ? 1 : i / (n - 1); // 0 oldest … 1 newest
      out.push({
        id: "c" + i,
        bearing: Math.round(bearing * 10) / 10,
        radius: 0.42 + recency * 0.5, // 0.42 … 0.92 of scope radius
        kind: events[i].kind,
        date: events[i].date,
        intensity: blipIntensity(bearing, nowDeg, 300),
      });
    }
    return out;
  }

  var api = {
    TAU: TAU,
    bearingRad: bearingRad,
    polarToCartesian: polarToCartesian,
    sweepAngle: sweepAngle,
    cwDelta: cwDelta,
    blipIntensity: blipIntensity,
    phosphorDecay: phosphorDecay,
    trailAlpha: trailAlpha,
    contactsFromEvents: contactsFromEvents,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RadarCore = api;
})(typeof window !== "undefined" ? window : globalThis);
