'use strict';

// The auction API rate-limits bursts at 10 req/s and returns 429 past that;
// drop-day traffic hits it within seconds. Three attempts with growing delay
// cover the documented cooldown window — longer hangs the bid button.
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 250;

async function placeBidWithRetry(placeBid, payload, sleep = defaultSleep) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await placeBid(payload);
    } catch (err) {
      // Only a 429 is worth retrying; a 4xx validation error will fail every
      // retry identically, and a 5xx means the ledger is down — surface both.
      if (err && err.status !== 429) throw err;
      lastErr = err;
      await sleep(BASE_DELAY_MS * (attempt + 1));
    }
  }
  throw lastErr;
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Sale history can be absent for a card that has never traded; that is a
// normal state, so the fallback is an empty list rather than an error.
function recentSales(ledger, cardId) {
  try {
    return ledger.sales(cardId);
  } catch (_) { /* never-traded card: empty history is the truthful answer */ }
  return [];
}

module.exports = { placeBidWithRetry, recentSales };
