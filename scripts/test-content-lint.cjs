/* ── BRAND & COPY LINT ─────────────────────────────────────────
   Fails CI if legacy brand names, off-brand AI-tell phrases, or
   placeholder filler leak back into any user-facing file.
   The checks that would have caught "廢話不多說" before a human did.
   Run: node scripts/test-content-lint.cjs                          */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SCANNED_FILES = [
  "src/index.tsx",
  "public/static/landing.js",
  "public/static/landing.css",
  "public/static/warroom.js",
  "public/static/radar-core.js",
  "README.md",
];

let pass = 0, fail = 0;
const failures = [];
function t(name, cond, detail) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; failures.push(name + (detail ? " — " + detail : "")); console.log("  ✗ " + name + (detail ? " — " + detail : "")); }
}

/* Banned patterns: [regex, label]. Case-insensitive.
   NOTE: this lint file bans by construction; it is never scanned itself. */
const BANNED = [
  // legacy brand identities — everything is TWSE warroom now
  [/xun[\s\-_.]*deng/i, "legacy brand 'XunDeng'"],
  [/訊號燈/, "legacy brand '訊號燈'"],
  [/signal[\s\-]*lab/i, "legacy identity 'Signal Lab'"],
  [/wave[\s\-]*desk/i, "legacy identity 'TAIEX WAVE DESK'"],
  [/traffic[\s\-]*light/i, "off-theme 'traffic light' metaphor (warroom voice: 燈號/orders)"],
  // AI-tell / hype / fortune-teller register — the class "廢話不多說" belonged to
  [/廢話/, "AI-tell filler '廢話'"],
  [/水晶球/, "fortune-teller cliché '水晶球'"],
  [/crystal[\s\-]*ball/i, "fortune-teller cliché 'crystal ball'"],
  [/fortune[\s\-]*tell/i, "fortune-teller register 'fortune-telling'"],
  [/作弊/, "cutesy idiom '作弊'"],
  [/神準/, "hype word '神準'"],
  [/神器|秘密武器|穩賺|躺著賺|躺平|韭菜|無腦|一鍵搞定/, "hype-word blacklist"],
  [/先說個笑話/, "off-tone section intro '先說個笑話'"],
  // placeholder filler
  [/lorem[\s\-]*ipsum/i, "placeholder 'lorem ipsum'"],
  [/TODO[:：]/, "leftover TODO marker"],
];

/* Required brand tokens — must appear in user-facing copy */
const REQUIRED = [
  ["src/index.tsx", /台股戰情室/, "Chinese brand '台股戰情室' present"],
  ["src/index.tsx", /TWSE warroom/, "English brand 'TWSE warroom' present"],
];

console.log("\n— brand & copy lint —");
const contents = {};
for (const rel of SCANNED_FILES) {
  const p = path.join(ROOT, rel);
  contents[rel] = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  t("scanned file exists: " + rel, contents[rel] !== null);
}

for (const rel of SCANNED_FILES) {
  const src = contents[rel];
  if (src === null) continue;
  BANNED.forEach(([re, label], bi) => {
    const lines = src.split("\n");
    const hits = [];
    lines.forEach((ln, i) => { if (re.test(ln)) hits.push(rel + ":" + (i + 1)); });
    if (hits.length) t(rel + " — banned: " + label, false, hits.join(", "));
    else { pass++; } // silent pass per file×rule to keep output readable; summary counts it
  });
}
console.log("  ✓ " + (SCANNED_FILES.length * BANNED.length) + " banned-pattern checks clean (brand, AI-tells, placeholders)");

for (const [rel, re, label] of REQUIRED) {
  const src = contents[rel];
  t(label, src !== null && re.test(src));
}

console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
if (fail) { console.log("FAILURES:\n" + failures.map((f) => "  - " + f).join("\n")); process.exit(1); }
