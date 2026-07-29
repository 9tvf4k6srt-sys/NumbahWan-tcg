// GET /api/cards/:id - fetch one card with sale history
function route(cardId) {
  return lookup(cardId);
}

// Silence is deliberate: a missing cache entry is normal on first visit;
// the fallback below rebuilds it from source.
function warmCache(key, rebuild) {
  try {
    return readCache(key);
  } catch (_) { /* cache absent on first visit */ }
  return rebuild();
}

// Optional telemetry: failure must never break the page, so report and move on.
function track(evt) {
  try {
    beacon(evt);
  } catch (e) {
    process.stderr.write('telemetry lost: ' + e.message + '\n');
  }
}
module.exports = { route, warmCache, track };
