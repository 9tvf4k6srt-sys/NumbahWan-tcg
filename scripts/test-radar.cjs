#!/usr/bin/env node
/* Rigorous unit tests for RadarCore — run: node scripts/test-radar.cjs */
"use strict";
// package.json is "type":"module", so require() of the .js source returns an
// empty namespace. Load it manually and capture its CommonJS-style export.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../public/static/radar-core.js"), "utf8");
const mod = { exports: {} };
new Function("module", "exports", src)(mod, mod.exports);
const R = mod.exports;
if (typeof R.polarToCartesian !== "function") {
  console.error("FATAL: RadarCore export missing — file failed to load");
  process.exit(1);
}

let pass = 0, fail = 0;
const failures = [];
function t(name, cond) {
  if (cond) pass++;
  else { fail++; failures.push(name); }
  console.log((cond ? "  ✓ " : "  ✗ ") + name);
}
function approx(a, b, eps) { return Math.abs(a - b) < (eps || 1e-9); }

console.log("\n— bearingRad / polarToCartesian —");
t("bearing 0° points north (up)", (() => { const p = R.polarToCartesian(0, 0, 10, 0); return approx(p.x, 0, 1e-9) && approx(p.y, -10, 1e-9); })());
t("bearing 90° points east (right)", (() => { const p = R.polarToCartesian(0, 0, 10, 90); return approx(p.x, 10, 1e-9) && approx(p.y, 0, 1e-9); })());
t("bearing 180° points south", (() => { const p = R.polarToCartesian(0, 0, 10, 180); return approx(p.x, 0, 1e-9) && approx(p.y, 10, 1e-9); })());
t("bearing 270° points west", (() => { const p = R.polarToCartesian(0, 0, 10, 270); return approx(p.x, -10, 1e-9) && approx(p.y, 0, 1e-9); })());
t("center offset respected", (() => { const p = R.polarToCartesian(80, 80, 70, 90); return approx(p.x, 150) && approx(p.y, 80); })());
t("radius 0 stays at center", (() => { const p = R.polarToCartesian(5, 5, 0, 123); return p.x === 5 && p.y === 5; })());
t("all bearings land on circle of radius r", (() => {
  for (let d = 0; d < 360; d += 7) {
    const p = R.polarToCartesian(50, 50, 33, d);
    if (!approx(Math.hypot(p.x - 50, p.y - 50), 33, 1e-6)) return false;
  }
  return true;
})());

console.log("\n— sweepAngle —");
t("t=0 → 0°", R.sweepAngle(0, 9000) === 0);
t("half period → 180°", approx(R.sweepAngle(4500, 9000), 180));
t("full period wraps to 0°", approx(R.sweepAngle(9000, 9000), 0));
t("quarter period → 90°", approx(R.sweepAngle(2250, 9000), 90));
t("wraps across many revolutions", approx(R.sweepAngle(9000 * 10 + 2250, 9000), 90));
t("monotonic within one revolution", (() => {
  let prev = -1;
  for (let ms = 0; ms < 9000; ms += 100) {
    const a = R.sweepAngle(ms, 9000);
    if (a <= prev) return false;
    prev = a;
  }
  return true;
})());
t("non-positive period is safe (0°)", R.sweepAngle(100, 0) === 0 && R.sweepAngle(100, -5) === 0);

console.log("\n— cwDelta —");
t("90→180 = 90", R.cwDelta(90, 180) === 90);
t("350→10 wraps to 20", R.cwDelta(350, 10) === 20);
t("same angle = 0", R.cwDelta(45, 45) === 0);
t("reverse never negative", R.cwDelta(10, 350) === 340);

console.log("\n— blipIntensity (phosphor flash-behind-beam) —");
t("target directly under beam = full brightness", R.blipIntensity(90, 90, 300) === 1);
t("target ahead of beam = dark (0)", R.blipIntensity(100, 90, 300) === 0); // 10° ahead = 350° behind, outside 300° decay
t("target 150° behind with 300° decay = 0.5", approx(R.blipIntensity(300, 90, 300), 0.5));
t("target just behind beam is hot", R.blipIntensity(88, 90, 300) > 0.85);
t("target beyond decay window is dark", R.blipIntensity(90 - 301 + 360, 90, 300) === 0);
t("wrap-around: beam at 10°, target at 350° is behind → lit", R.blipIntensity(350, 10, 300) > 0);
t("intensity strictly decreasing behind the beam", (() => {
  const a = R.blipIntensity(50, 90, 300), b = R.blipIntensity(0, 90, 300), c = R.blipIntensity(310, 90, 300);
  return a > b && b > c;
})());

console.log("\n— phosphorDecay —");
t("0ms elapsed = 1", R.phosphorDecay(0, 30) === 1);
t("one half-life = 0.5", approx(R.phosphorDecay(30, 30), 0.5));
t("two half-lives = 0.25", approx(R.phosphorDecay(60, 30), 0.25));
t("decay is monotonic", R.phosphorDecay(10, 30) > R.phosphorDecay(20, 30));
t("non-positive half-life is safe (0)", R.phosphorDecay(10, 0) === 0);

console.log("\n— trailAlpha —");
t("slice 0 (at beam) = max alpha", R.trailAlpha(0, 26, 0.16) === 0.16);
t("last slice ≈ 0", R.trailAlpha(26, 26, 0.16) < 0.001);
t("trail fades monotonically", (() => {
  let prev = Infinity;
  for (let i = 0; i <= 26; i++) {
    const a = R.trailAlpha(i, 26, 0.16);
    if (a > prev) return false;
    prev = a;
  }
  return true;
})());
t("all alphas within [0, maxAlpha]", (() => {
  for (let i = 0; i <= 26; i++) {
    const a = R.trailAlpha(i, 26, 0.16);
    if (a < 0 || a > 0.16) return false;
  }
  return true;
})());

console.log("\n— contactsFromEvents (real signal events) —");
const EVENTS = [
  { date: "2024-07-18", kind: "red" }, { date: "2024-09-06", kind: "green" },
  { date: "2025-02-26", kind: "red" }, { date: "2025-04-10", kind: "green" },
  { date: "2026-03-04", kind: "red" }, { date: "2026-03-10", kind: "green" },
  { date: "2026-06-05", kind: "red" },
];
const contacts = R.contactsFromEvents(EVENTS, 0);
t("one contact per event", contacts.length === 7);
t("all bearings unique & within [0,360)", (() => {
  const set = new Set(contacts.map((c) => c.bearing));
  return set.size === contacts.length && contacts.every((c) => c.bearing >= 0 && c.bearing < 360);
})());
t("radii within scope (0 < r ≤ 0.95)", contacts.every((c) => c.radius > 0 && c.radius <= 0.95));
t("newest event (2026-06-05 red) rides the outer rim", (() => {
  const newest = contacts[contacts.length - 1];
  return newest.date === "2026-06-05" && newest.kind === "red" && newest.radius === Math.max(...contacts.map((c) => c.radius));
})());
t("kinds preserved", contacts.every((c, i) => c.kind === EVENTS[i].kind));
t("dates preserved", contacts.every((c, i) => c.date === EVENTS[i].date));
t("contact under the beam is lit", (() => {
  const atBeam = R.contactsFromEvents(EVENTS, contacts[0].bearing);
  return atBeam[0].intensity === 1;
})());
t("empty events → no contacts", R.contactsFromEvents([], 0).length === 0);

console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
if (fail > 0) {
  console.log("FAILURES:\n" + failures.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
