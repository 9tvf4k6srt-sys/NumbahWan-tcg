/**
 * gate-seed.cjs: Backstop onBefore script, runs BEFORE page load.
 *
 * Kills the two sources of nondeterminism that survive gate-freeze.cjs
 * (which runs after load, too late for content chosen during render):
 *   1. Math.random: pages like tavern-tales and exchange pick random cards,
 *      shuffle features, jitter prices. Replaced with a seeded PRNG so every
 *      capture renders the SAME "random" content.
 *   2. Date/clocks: countdowns, "time ago" labels, date-keyed rotations.
 *      Frozen to a fixed instant (2026-01-01T00:00:00Z). Date.now, new Date()
 *      and performance-derived times all agree.
 */
module.exports = async (page, scenario) => {
  await page.addInitScript(() => {
    // 1. seeded PRNG (mulberry32), same sequence every load
    let s = 0x9e3779b9;
    Math.random = function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // 2. frozen clock
    const FIXED = 1767225600000; // 2026-01-01T00:00:00Z
    const RealDate = Date;
    const FrozenDate = class extends RealDate {
      constructor(...args) {
        if (args.length === 0) super(FIXED);
        else super(...args);
      }
      static now() { return FIXED; }
    };
    FrozenDate.parse = RealDate.parse;
    FrozenDate.UTC = RealDate.UTC;
    // eslint-disable-next-line no-global-assign
    Date = FrozenDate;
    window.Date = FrozenDate;
  });
};
