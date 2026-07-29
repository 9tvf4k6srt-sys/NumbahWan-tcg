function tally(cards) {
  // increment the counter
  let count = 0;
  for (const c of cards) {
    count += c.owned;
  }
  // return the result
  return count;
}
module.exports = { tally };
