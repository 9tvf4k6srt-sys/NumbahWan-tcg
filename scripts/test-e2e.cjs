#!/usr/bin/env node
/* End-to-end war room interaction test — requires playwright + dev server on :3000
   Run: node scripts/test-e2e.cjs [baseUrl]
   Verifies the full click process: CTA → war room opens → radar animates →
   auto-scan runs → intel log fills → verdict brief + live quote appear. */
"use strict";
const { chromium } = require("playwright");
const { PNG } = require("pngjs");

/* count hot phosphor-green pixels in a PNG screenshot buffer, restricted to a rect.
   Uses the compositor render path — reliable where headless SwiftShader's
   canvas getImageData readback returns blank buffers nondeterministically. */
function hotPixelsInPng(buf, rect) {
  const png = PNG.sync.read(buf);
  const x0 = Math.max(0, Math.round(rect.x)), y0 = Math.max(0, Math.round(rect.y));
  const x1 = Math.min(png.width, Math.round(rect.x + rect.width));
  const y1 = Math.min(png.height, Math.round(rect.y + rect.height));
  let lit = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * png.width + x) << 2;
      const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
      // hot phosphor pixels: bright green, clearly green-led (beam/blips/labels).
      // scope background is a deliberate dark green (~g=23) and must NOT count.
      if (g > 90 && g > r + 30 && g > b + 30) lit++;
    }
  }
  return lit;
}

const BASE = process.argv[2] || "http://localhost:3000";
let pass = 0, fail = 0;
const failures = [];
function t(name, cond) {
  if (cond) pass++;
  else { fail++; failures.push(name); }
  console.log((cond ? "  ✓ " : "  ✗ ") + name);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  console.log("\n— page load —");
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  t("no JS errors on landing", errors.length === 0);

  console.log("\n— enter war room —");
  await page.click(".hero [data-desk-open]");
  await page.waitForSelector("#warroom.open", { timeout: 4000 });
  t("war room overlay opens on CTA click", true);
  t("body scroll locked", await page.evaluate(() => document.body.classList.contains("desk-locked")));

  const radarInfo = await page.evaluate(() => {
    const c = document.getElementById("wr-radar");
    const r = c.getBoundingClientRect();
    return { w: r.width, h: r.height, bw: c.width, bh: c.height };
  });
  t("radar canvas has visible size", radarInfo.w > 200 && radarInfo.h > 200);
  t("radar canvas DPR-backed backing store", radarInfo.bw >= Math.floor(radarInfo.w));

  // REGRESSION (reported iOS bug): scope must be an exact square at all times.
  // Old bug: flex-stretched CSS box vs once-measured backing store → scope
  // rendered tall at open, snapped square when the verdict brief appeared.
  t("radar scope is square at open (aspect 1:1)", Math.abs(radarInfo.w - radarInfo.h) < 1.5);

  // REGRESSION (sweep-jump bug): sample the bearing readout across the auto-scan
  // speed change (idle 9s → combat 1.6s at ~+900ms). The phase-accumulator sweep
  // must never move the beam backward; 359→0 wraps are normalised out.
  const sweepSamples = await page.evaluate(async () => {
    const el = document.getElementById("wr-brg");
    const out = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 2600) {
      out.push(parseFloat(el.textContent));
      await new Promise((r) => setTimeout(r, 90));
    }
    return out;
  });
  let backJumps = 0;
  for (let si = 1; si < sweepSamples.length; si++) {
    const d = (sweepSamples[si] - sweepSamples[si - 1] + 360) % 360;
    if (d > 200) backJumps++; // huge apparent forward step within 90ms = backward motion
  }
  t("sweep never jumps backward across speed change (" + sweepSamples.length + " samples, " + backJumps + " jumps)",
    sweepSamples.length > 15 && backJumps === 0);

  // radar painting + animates — verified from compositor screenshots.
  // Rationale: the compositor render path has painted correctly in every run,
  // while headless SwiftShader getImageData readback flips per-session (proven
  // above: identical sequences read 1523 px in some sessions, 0 in others).
  await page.waitForTimeout(900); // let a few frames render
  const radarBox = await page.evaluate(() => {
    const r = document.getElementById("wr-radar").getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  const shotA = await page.screenshot();
  await page.waitForTimeout(600);
  const shotB = await page.screenshot();
  const hotA = hotPixelsInPng(shotA, radarBox);
  const hotB = hotPixelsInPng(shotB, radarBox);
  t("radar scope is painting green phosphor (hot=" + hotA + "," + hotB + ")", Math.max(hotA, hotB) > 60);
  // animation: screenshots taken 600ms apart must differ inside the scope
  let changedPx = 0;
  {
    const pa = PNG.sync.read(shotA), pb = PNG.sync.read(shotB);
    const x0 = Math.round(radarBox.x), y0 = Math.round(radarBox.y);
    const x1 = Math.min(pa.width, Math.round(radarBox.x + radarBox.width));
    const y1 = Math.min(pa.height, Math.round(radarBox.y + radarBox.height));
    for (let y = y0; y < y1; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        const i = (y * pa.width + x) << 2;
        if (Math.abs(pa.data[i + 1] - pb.data[i + 1]) > 6) changedPx++;
      }
    }
  }
  t("radar sweep animates (screenshot diff=" + changedPx + " over 600ms)", changedPx > 40);

  console.log("\n— auto-scan → verdict —");
  await page.waitForSelector("#desk-result:not([hidden])", { timeout: 12000 });
  t("verdict brief appears after auto-scan", true);

  // REGRESSION: scope must stay square AND keep its size after the verdict
  // reveal — the exact moment the iOS distortion used to snap in.
  await page.waitForTimeout(600); // reveal transition + ResizeObserver settle
  const radarInfoAfter = await page.evaluate(() => {
    const r = document.getElementById("wr-radar").getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  t("radar scope still square after verdict reveal", Math.abs(radarInfoAfter.w - radarInfoAfter.h) < 1.5);
  t("radar scope size stable open→verdict (Δ=" + Math.abs(radarInfoAfter.w - radarInfo.w).toFixed(1) + "px)",
    Math.abs(radarInfoAfter.w - radarInfo.w) < 20);

  const mode = await page.textContent("#wr-mode");
  t("mode readout flips to LOCK", (mode || "").trim() === "LOCK");

  const logCount = await page.evaluate(() => document.querySelectorAll("#wr-log li").length);
  t("intel log recorded 4 scan steps", logCount === 4);

  const order = await page.textContent(".wr-order");
  t("order reads STAND BY IN CASH (空手待命)", /空手待命|STAND BY IN CASH/.test(order || ""));

  // live quote strip populated from /api/market-now
  await page.waitForFunction(() => {
    const s = document.getElementById("desk-live");
    return s && s.getAttribute("data-state") !== "loading";
  }, { timeout: 10000 });
  const quoteState = await page.getAttribute("#desk-live", "data-state");
  t("quote strip resolved (live|stale|error tolerated offline)", ["live", "stale", "error"].includes(quoteState || ""));
  const price = await page.textContent("#dl-price");
  t("price populated or graceful dash", (price || "").trim().length > 0);

  const dsRead = await page.textContent("#ds-read");
  t("read timestamp stamped", (dsRead || "").trim().length > 4);
  const dsPolicy = await page.textContent("#ds-policy");
  t("policy provenance stamped", /active-policy\.json.*hi1000_ft4/.test(dsPolicy || ""));

  await page.screenshot({ path: "scripts/warroom-verdict.png", fullPage: false });
  console.log("  (screenshot: scripts/warroom-verdict.png)");

  console.log("\n— manual re-sweep —");
  await page.click("#wr-scan");
  await page.waitForFunction(() => document.getElementById("wr-mode").textContent === "SCAN", { timeout: 3000 });
  t("re-sweep re-enters SCAN mode", true);
  await page.waitForSelector("#desk-result:not([hidden])", { timeout: 12000 });
  t("verdict returns after re-sweep", true);

  console.log("\n— close —");
  await page.keyboard.press("Escape");
  await page.waitForSelector("#warroom[hidden]", { state: "attached", timeout: 4000 });
  t("ESC closes war room", true);
  t("body scroll unlocked", await page.evaluate(() => !document.body.classList.contains("desk-locked")));

  console.log("\n— mobile viewport (iPhone-ish) —");
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const merr = [];
  mob.on("pageerror", (e) => merr.push(e.message));
  await mob.goto(BASE + "/", { waitUntil: "networkidle" });
  await mob.tap(".nav [data-desk-open]");
  await mob.waitForSelector("#warroom.open", { timeout: 4000 });
  t("mobile: war room opens on tap", true);
  const mRadarOpen = await mob.evaluate(() => {
    const r = document.getElementById("wr-radar").getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  t("mobile: scope square at open", Math.abs(mRadarOpen.w - mRadarOpen.h) < 1.5);
  const roFit = await mob.evaluate(() => {
    const el = document.querySelector(".wr-readouts");
    return el.getBoundingClientRect().width <= window.innerWidth - 8;
  });
  t("mobile: readout grid fits viewport", roFit);
  await mob.waitForSelector("#desk-result:not([hidden])", { timeout: 14000 });
  t("mobile: auto-scan verdict appears", true);
  await mob.waitForTimeout(700); // reveal transition + ResizeObserver settle
  const mRadarSettled = await mob.evaluate(() => {
    const r = document.getElementById("wr-radar").getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  t("mobile: scope stays square after verdict (the reported iOS bug)",
    Math.abs(mRadarSettled.w - mRadarSettled.h) < 1.5);
  t("mobile: scope size stable open→verdict (Δ=" + Math.abs(mRadarSettled.w - mRadarOpen.w).toFixed(1) + "px)",
    Math.abs(mRadarSettled.w - mRadarOpen.w) < 25);

  // REGRESSION (user report: "report area very very small, locked, can't scroll on iPhone").
  // Wise fix: brief grows to full content height; .wr-main is the single natural scroller.
  const scrollInfo = await mob.evaluate(() => {
    const main = document.querySelector(".wr-main");
    const brief = document.querySelector(".wr-brief");
    const cs = getComputedStyle(brief);
    return {
      briefOverflow: cs.overflowY,
      briefFitsNaturally: brief.scrollHeight <= brief.clientHeight + 2,
      mainScrollable: main.scrollHeight > main.clientHeight + 10,
      mainClientH: main.clientHeight,
    };
  });
  t("mobile: brief is NOT a nested scroll-trap (overflow=" + scrollInfo.briefOverflow + ")",
    scrollInfo.briefOverflow === "visible" && scrollInfo.briefFitsNaturally);
  t("mobile: full report flows in one scroller (page height " + scrollInfo.mainClientH + "px)",
    scrollInfo.mainScrollable);

  // scroll to the very bottom of the war room — the provenance stamps must be reachable
  await mob.evaluate(() => {
    const main = document.querySelector(".wr-main");
    main.scrollTo({ top: main.scrollHeight, behavior: "instant" });
  });
  await mob.waitForTimeout(300);
  const bottomInfo = await mob.evaluate(() => {
    const stamps = document.querySelector("#desk-result .desk-stamps");
    const topbar = document.querySelector(".wr-topbar");
    const sr = stamps.getBoundingClientRect();
    const tr = topbar.getBoundingClientRect();
    return {
      stampsVisible: sr.bottom <= window.innerHeight + 2 && sr.top > 0,
      topbarPinned: Math.abs(tr.top - document.querySelector(".wr-frame").getBoundingClientRect().top - 14) < 24,
    };
  });
  t("mobile: scroll down reaches report bottom (provenance stamps visible)", bottomInfo.stampsVisible);
  t("mobile: topbar stays pinned while scrolling the report", bottomInfo.topbarPinned);

  await mob.screenshot({ path: "scripts/warroom-mobile.png" });
  console.log("  (screenshot: scripts/warroom-mobile.png)");
  t("mobile: no JS errors", merr.length === 0);

  console.log("\n— zero runtime errors overall —");
  t("no page/console errors across flows", errors.length === 0);
  if (errors.length) console.log("  errors:\n  " + errors.join("\n  "));

  await browser.close();
  console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
  if (fail) { console.log("FAILURES:\n" + failures.map((f) => "  - " + f).join("\n")); process.exit(1); }
})().catch((e) => { console.error("E2E crashed:", e); process.exit(1); });
