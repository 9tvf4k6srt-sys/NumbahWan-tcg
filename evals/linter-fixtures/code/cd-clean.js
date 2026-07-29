// Retry with backoff because the auction API rate-limits bursts (429s observed
// under drop-day load); three attempts cover the documented window.
async function bidWithRetry(placeBid, payload, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await placeBid(payload);
    } catch (err) {
      if (err.status !== 429) throw err;
      lastErr = err;
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw lastErr;
}
module.exports = { bidWithRetry };
