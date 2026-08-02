#!/usr/bin/env bash
# API contract tests — requires dev server on :3000
set -u
BASE="${1:-http://localhost:3000}"
pass=0; fail=0
check() { # name, condition(0/1)
  if [ "$2" -eq 0 ]; then pass=$((pass+1)); echo "  ✓ $1"; else fail=$((fail+1)); echo "  ✗ $1"; fi
}

echo "— routes —"
code=$(curl -s -o /tmp/wr_home.html -w "%{http_code}" "$BASE/")
[ "$code" = "200" ]; check "GET / → 200" $?

code=$(curl -s -o /tmp/wr_market.json -w "%{http_code}" "$BASE/api/market-now")
[ "$code" = "200" ]; check "GET /api/market-now → 200" $?

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/__test__")
[ "$code" = "200" ]; check "GET /__test__ → 200" $?

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/static/radar-core.js")
[ "$code" = "200" ]; check "GET /static/radar-core.js → 200" $?

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/static/warroom.js")
[ "$code" = "200" ]; check "GET /static/warroom.js → 200" $?

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/static/img/warroom-bg.jpg")
[ "$code" = "200" ]; check "GET /static/img/warroom-bg.jpg → 200 (console art present)" $?

echo "— market-now contract —"
node -e '
const d = JSON.parse(require("fs").readFileSync("/tmp/wr_market.json", "utf8"));
const checks = [
  ["ok === true", d.ok === true],
  ["source is twse-mis", d.source === "twse-mis"],
  ["fetchedAtUtc is ISO", /^\d{4}-\d{2}-\d{2}T/.test(d.fetchedAtUtc || "")],
  ["session is valid", ["pre-open","trading","closed","weekend"].includes(d.session)],
  ["quote object exists", d.quote && typeof d.quote === "object"],
  ["price is a positive number", typeof d.quote.price === "number" && d.quote.price > 0],
  ["changePct is a number", typeof d.quote.changePct === "number"],
  ["isRealtime is boolean", typeof d.quote.isRealtime === "boolean"],
  ["isRealtime=false when quote.date is not today (weekend guard)", d.session === "weekend" ? d.quote.isRealtime === false : true],
];
let fail = 0;
for (const [n, c] of checks) { console.log((c ? "  ✓ " : "  ✗ ") + n); if (!c) fail++; }
process.exit(fail ? 1 : 0);
'
check "market-now payload contract" $?

echo "— war room markup present on / —"
grep -q 'id="warroom"' /tmp/wr_home.html; check "warroom overlay exists" $?
grep -q 'id="wr-radar"' /tmp/wr_home.html; check "radar canvas exists" $?
grep -q 'id="wr-scan"' /tmp/wr_home.html; check "scan button exists" $?
grep -q 'id="desk-result"' /tmp/wr_home.html; check "verdict panel (desk-result) exists" $?
grep -q 'id="dl-price"' /tmp/wr_home.html; check "live quote slot exists" $?
grep -q 'id="ds-policy"' /tmp/wr_home.html; check "provenance slot exists" $?
grep -q 'radar-core.js' /tmp/wr_home.html; check "radar-core script included" $?
grep -q 'warroom.js' /tmp/wr_home.html; check "warroom script included" $?
grep -q '台股戰情室' /tmp/wr_home.html; check "台股戰情室 title present" $?

echo ""
echo "═══ $pass passed, $fail failed ═══"
[ "$fail" -eq 0 ]
