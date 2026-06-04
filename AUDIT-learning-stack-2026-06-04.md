# Ultra-audit: did the self-improvement stack actually learn & improve? (2026-06-04)

Scope: a live audit of the four systems that are supposed to make this repo get
better on its own — **heartbeat** (session survival), **learning loop** (turn
signals into rules), **mining** (extract lessons from history), and **token /
efficiency** tracking. Verdict per system, the root-cause bugs found, and the
fixes shipped. Written so the next agent inherits the diagnosis, not just the
patch.

---

## Verdict at a glance

| System | Before | Root issue |
|---|---|---|
| Heartbeat | ✅ working | All 9 systems pinged < 1d ago. The session-survival design holds. |
| Mining | ✅ good | quality-report 97/100 A+ (enrichment/patterns/hotspots 100, lessons 89). |
| Learning loop | ⚠️ half-deaf | Ran, but derived **0** rules — it never listened for `trend_signal`, its own early-warning channel. |
| Token / efficiency | ❌ not running | The ledger had **1 manual entry** ever. Nothing logged per commit → no series. |
| Trend detector | ❌ false alarm | Read `memory.snapshots` (frozen 115 days at 2026-02-10) and screamed "score 63→40" while the **live** sentinel composite was a steady B- (73). |

The headline: the systems were **alive but mis-wired**. The heartbeat kept them
breathing across chat windows, but the signal path from "we noticed something"
to "we enforce something" was broken in two places, and the cost meter was
unplugged.

---

## The three root causes (and the fix for each)

### 1. The trend detector alarmed on a dead file
`snapshot-score-decline` and `score-oscillation` both read `memory.snapshots`.
That array stopped updating on 2026-02-10 — 115 days stale — so the regression
slope was computed over 4-month-old noise. Meanwhile the real, current quality
signal (the sentinel **composite**, written to `.mycelium/telemetry.json` on
every commit) was never consulted.

**Fix:** added `liveScoreSeries()` (reads sentinel composite from telemetry) and
a `STALE_DAYS = 21` freshness guard. Detectors now prefer the live series and
**refuse to treat a stale series as a trend** — "old and unchanging" is a frozen
file, not a regression. Result: the false `63→40` alarm is gone; the detector
now tracks the metric that actually moves.

### 2. The learning loop was deaf to its own signals
The trend detector emitted `trend_signal` events, but `learning-loop.cjs` had no
derivation that consumed them — it only watched `test_fail`, `build_metrics`,
`score_drop`, etc. So early-warnings logged forever and never became rules. The
loop derived 0 patterns despite a high-severity signal sitting in the bus.

**Fix:** added **Rule 8 — `trend-signal-ingest`**. High/medium `trend_signal`
events in the last 14d become constraints (latest-per-id, low-severity and
heartbeat noise ignored). Trends now close the loop: detect → derive → enforce.

### 3. The efficiency ledger was never invoked
Token optimization existed as a tool (`efficiency-ledger.cjs`) but was only ever
run once, by hand. No series = no optimization, just a number from one day.

**Fix:** added `log --auto` (measures the just-made commit's own churn via
`HEAD~1...HEAD`, names the slice from the commit subject, dedups by commit hash)
and wired it into `.husky/post-commit`. Every commit now logs one leanness slice,
idempotently. The series grows on its own.

---

## New: one command to see all of it

`node bin/ai.cjs sysaudit` runs the whole stack health in one shot — heartbeat
liveness, hook wiring, trend signals, learning derivation, efficiency series,
mining grade. Run it any session to confirm the machine that improves the work
is itself healthy.

---

## What the live quality number actually is

Ignore the false alarm. The honest current score is the sentinel composite:
**73/100 (B-)**, steady. The drag is concentrated and specific:

- **i18n = 28** — the single biggest lever. Missing/!partial translations.
- **assets = 47** — asset weight / alpha / naming.
- **performance = 70**, **accessibility = 74** — secondary.

That is the real backlog the now-fixed trend detector will watch. Next quality
push should start at i18n, because it is both the lowest module and the one with
the most enforceable, mechanical fixes.
