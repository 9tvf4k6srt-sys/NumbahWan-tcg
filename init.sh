#!/usr/bin/env bash
# init.sh — restart dev server + smoke-test the three live surfaces.
# Used at the start of every PINFORGE session. Idempotent.
#
#   ./init.sh           # restart + smoke
#   ./init.sh --skip-restart  # smoke only (server already running)
#   ./init.sh --quiet   # only print FAIL lines

set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT" || exit 1

PORT="${PORT:-8765}"
SKIP_RESTART=0
QUIET=0
for arg in "$@"; do
  case "$arg" in
    --skip-restart) SKIP_RESTART=1 ;;
    --quiet) QUIET=1 ;;
  esac
done

say() { [ "$QUIET" -eq 0 ] && echo "$@"; }
fail() { echo "  ✗ $*" >&2; FAILED=1; }
pass() { say "  ✓ $*"; }

FAILED=0

# ─── 1. Restart dev server ────────────────────────────────────────────────
if [ "$SKIP_RESTART" -eq 0 ]; then
  say "[1/3] restarting anchor-preview on :$PORT …"
  pkill -f anchor-preview 2>/dev/null || true
  sleep 1
  PORT="$PORT" nohup node tools/anchor-preview.cjs > /tmp/anchor.log 2>&1 &
  sleep 2
  if ! curl -fsS "http://localhost:$PORT/" -o /dev/null; then
    fail "dev server did not come up on :$PORT (see /tmp/anchor.log)"
    exit 1
  fi
  pass "dev server up on :$PORT"
else
  say "[1/3] skipping restart"
fi

# ─── 2. Smoke routes ──────────────────────────────────────────────────────
say "[2/3] smoke routes …"
smoke() {
  local path="$1" min_bytes="$2" must_grep="$3"
  local out
  out="$(curl -sS -w "%{http_code} %{size_download}" -o /tmp/_smoke.html "http://localhost:$PORT$path")"
  local code="${out%% *}"
  local size="${out##* }"
  if [ "$code" != "200" ]; then
    fail "$path → HTTP $code"
    return
  fi
  if [ "$size" -lt "$min_bytes" ]; then
    fail "$path → only $size B (expected ≥ $min_bytes)"
    return
  fi
  if [ -n "$must_grep" ] && ! grep -q "$must_grep" /tmp/_smoke.html; then
    fail "$path → missing required marker: $must_grep"
    return
  fi
  pass "$path → 200 · ${size} B"
}

smoke "/invest"                      400000  "like our own"
smoke "/loading"                       4000  "pinforge-emblem-brass"
smoke "/playbooks/dumpling-shop-tw"   100000  "What we'd refuse to risk for them"

# ─── 3. Sensors (advisory; pre-commit enforces) ───────────────────────────
say "[3/3] sensors (advisory) …"
node tools/ai-tell-lint.cjs --all --quiet >/dev/null 2>&1 && pass "ai-tell-lint" || fail "ai-tell-lint (run manually)"
node tools/check-routes.cjs >/dev/null 2>&1 && pass "check-routes"   || fail "check-routes"
node tools/check-assets.cjs >/dev/null 2>&1 && pass "check-assets"   || fail "check-assets"
node tools/check-motto.cjs  >/dev/null 2>&1 && pass "check-motto"    || fail "check-motto"

[ "$FAILED" -eq 0 ] && say "" && say "ready." && exit 0
echo "" >&2
echo "init.sh failed — fix the ✗ lines above." >&2
exit 1
