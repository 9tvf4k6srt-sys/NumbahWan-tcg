#!/usr/bin/env node
/* tools/valuation.cjs — five-method fair-value engine for the desk.
 *
 * For each ticker, computes:
 *   1) PE multiple        — earnings × forward PE multiple from ledger
 *   2) EV/EBITDA          — derived from earnings, depreciation proxy, peer EV/EBITDA
 *   3) DCF (5-year)       — explicit 5-yr CF projection + terminal, simple WACC=10%
 *   4) Peer multiple      — peer-group median PE applied to our earnings
 *   5) Historical band    — 5-yr median PE applied to our earnings
 *
 * Output: weighted average + range + spread + driver method.
 * Weights (default): PE 25 / EV-EBITDA 20 / DCF 25 / Peer 15 / Historical 15.
 *
 * CLI:
 *   node tools/valuation.cjs <ticker>           # human-readable
 *   node tools/valuation.cjs --all              # run all five
 *   node tools/valuation.cjs --json <ticker>    # JSON for scan engine
 *   node tools/valuation.cjs --write            # write public/data/desk/scan.json
 *
 * Honest defaults: if any input is null, the method is skipped and weights
 * are renormalized over the methods that ran. Spread (max - min) / avg
 * surfaces low-conviction calls.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DESK = path.join(ROOT, 'public', 'data', 'desk');
const TICKERS = ['3037', '3017', '2308', '2449', '3443'];

const WEIGHTS = { pe: 0.25, ev_ebitda: 0.20, dcf: 0.25, peer: 0.15, historical: 0.15 };

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function tryLoad(p) {
  try { return loadJSON(p); } catch { return null; }
}

function inum(inputs, k) {
  const v = inputs && inputs[k];
  return (v && typeof v.value === 'number') ? v.value : null;
}

// Method 1: PE multiple from ledger inputs
// PT = (FY_rev × OP_margin% + non_AI) × multiple ÷ shares_out_m × 1000
function methodPE(d) {
  const pt = d.price_target || {};
  const inputs = pt.inputs || {};
  const fyR = inum(inputs, 'fy_revenue');
  const opM = inum(inputs, 'operating_margin');
  const nAI = inum(inputs, 'non_ai_contribution');
  const mlt = inum(inputs, 'multiple');
  const sho = (typeof d.shares_out_m === 'number' && d.shares_out_m > 0) ? d.shares_out_m : null;
  if (fyR == null || opM == null || nAI == null || mlt == null || sho == null) {
    return { ok: false, why: 'missing input(s) in price_target.inputs' };
  }
  const earningsB = fyR * (opM / 100) + nAI;
  const mktCapB = earningsB * mlt;
  const ps = mktCapB * 1000 / sho;
  return { ok: true, value: round1(ps), earnings_NTB: round1(earningsB), multiple: mlt, formula: `(${fyR} × ${opM}% + ${nAI}) × ${mlt} ÷ ${sho}M` };
}

// Method 2: EV/EBITDA — proxy: earnings × 1.35 (D&A buffer) × peer EV/EBITDA
function methodEV(d, peers) {
  const inputs = (d.price_target || {}).inputs || {};
  const fyR = inum(inputs, 'fy_revenue');
  const opM = inum(inputs, 'operating_margin');
  const nAI = inum(inputs, 'non_ai_contribution');
  const sho = d.shares_out_m;
  const layer = d.layer;
  const grp = peers && peers.groups && peers.groups[layer];
  if (fyR == null || opM == null || nAI == null || !sho || !grp) {
    return { ok: false, why: !grp ? `no peer group for layer "${layer}"` : 'missing earnings input(s)' };
  }
  // Operating profit (NT$B) → EBITDA proxy ×1.35 (industry rough D&A uplift)
  const opProfitB = fyR * (opM / 100) + nAI;
  const ebitdaB = opProfitB * 1.35;
  const evB = ebitdaB * grp.ev_ebitda_median;
  // Per-share EV ≈ per-share equity (assuming small net cash/debt; flag in note)
  const ps = evB * 1000 / sho;
  return { ok: true, value: round1(ps), peer_multiple: grp.ev_ebitda_median, ebitda_NTB: round1(ebitdaB), note: 'EV→equity approximated; ignores net cash/debt' };
}

// Method 3: 5-year DCF with WACC=10%, terminal g=3%
function methodDCF(d) {
  const inputs = (d.price_target || {}).inputs || {};
  const fyR = inum(inputs, 'fy_revenue');
  const opM = inum(inputs, 'operating_margin');
  const nAI = inum(inputs, 'non_ai_contribution');
  const sho = d.shares_out_m;
  if (fyR == null || opM == null || nAI == null || !sho) {
    return { ok: false, why: 'missing earnings input(s)' };
  }
  // Year-1 FCF proxy ≈ operating profit × 0.7 (tax + capex haircut)
  const op1 = fyR * (opM / 100) + nAI;
  const fcf1 = op1 * 0.70;
  // Growth: layer-aware default — substrate/asic high (15%), thermal/power mid (10%), test (8%)
  const layerGrowth = { substrate: 0.15, thermal: 0.12, power: 0.10, test: 0.08, asic: 0.18 };
  const g = layerGrowth[d.layer] != null ? layerGrowth[d.layer] : 0.10;
  const wacc = 0.10;
  const gTerm = 0.03;
  let pvSum = 0;
  let fcfPrev = fcf1;
  for (let t = 1; t <= 5; t++) {
    const fcfT = (t === 1) ? fcf1 : fcfPrev * (1 + g);
    fcfPrev = fcfT;
    pvSum += fcfT / Math.pow(1 + wacc, t);
  }
  // Terminal value at end of year 5
  const fcf6 = fcfPrev * (1 + gTerm);
  const tv = fcf6 / (wacc - gTerm);
  const pvTV = tv / Math.pow(1 + wacc, 5);
  const evB = pvSum + pvTV;
  const ps = evB * 1000 / sho;
  return { ok: true, value: round1(ps), growth_pct: round1(g * 100), wacc_pct: round1(wacc * 100), terminal_g_pct: round1(gTerm * 100), fcf1_NTB: round1(fcf1) };
}

// Method 4: Peer-group median PE × our earnings
function methodPeer(d, peers) {
  const inputs = (d.price_target || {}).inputs || {};
  const fyR = inum(inputs, 'fy_revenue');
  const opM = inum(inputs, 'operating_margin');
  const nAI = inum(inputs, 'non_ai_contribution');
  const sho = d.shares_out_m;
  const grp = peers && peers.groups && peers.groups[d.layer];
  if (fyR == null || opM == null || nAI == null || !sho || !grp) {
    return { ok: false, why: !grp ? `no peer group for layer "${d.layer}"` : 'missing earnings input(s)' };
  }
  const earnB = fyR * (opM / 100) + nAI;
  const mktCapB = earnB * grp.pe_median;
  const ps = mktCapB * 1000 / sho;
  return { ok: true, value: round1(ps), peer_pe: grp.pe_median, peers: grp.members };
}

// Method 5: Historical 5-yr median PE × our earnings
function methodHistorical(d, bands) {
  const inputs = (d.price_target || {}).inputs || {};
  const fyR = inum(inputs, 'fy_revenue');
  const opM = inum(inputs, 'operating_margin');
  const nAI = inum(inputs, 'non_ai_contribution');
  const sho = d.shares_out_m;
  const band = bands && bands.tickers && bands.tickers[d.ticker];
  if (fyR == null || opM == null || nAI == null || !sho || !band) {
    return { ok: false, why: !band ? `no historical band for ${d.ticker}` : 'missing earnings input(s)' };
  }
  const earnB = fyR * (opM / 100) + nAI;
  const mktCapB = earnB * band.pe_5y_median;
  const ps = mktCapB * 1000 / sho;
  return { ok: true, value: round1(ps), band_median_pe: band.pe_5y_median, band_low: band.pe_5y_low, band_high: band.pe_5y_high };
}

function round1(x) { return Math.round(x * 10) / 10; }

function valuate(ticker) {
  const ledger = tryLoad(path.join(DESK, ticker + '.json'));
  if (!ledger) return { ok: false, error: 'no ledger' };
  const peers = tryLoad(path.join(DESK, 'peers.json'));
  const bands = tryLoad(path.join(DESK, 'historical_bands.json'));
  const cycle = tryLoad(path.join(DESK, 'cycle.json'));

  const m = {
    pe:         methodPE(ledger),
    ev_ebitda:  methodEV(ledger, peers),
    dcf:        methodDCF(ledger),
    peer:       methodPeer(ledger, peers),
    historical: methodHistorical(ledger, bands)
  };

  // Renormalize weights over methods that returned ok
  const okKeys = Object.keys(m).filter(k => m[k].ok);
  const wSum = okKeys.reduce((s, k) => s + WEIGHTS[k], 0);
  let avg = null, lo = null, hi = null, spread = null;
  if (okKeys.length > 0 && wSum > 0) {
    avg = okKeys.reduce((s, k) => s + m[k].value * (WEIGHTS[k] / wSum), 0);
    const vals = okKeys.map(k => m[k].value);
    lo = Math.min.apply(null, vals);
    hi = Math.max.apply(null, vals);
    spread = avg > 0 ? round1(((hi - lo) / avg) * 100) : null;
    avg = round1(avg);
  }

  // Cycle-adjusted fair value (apply stage multiplier)
  const stage = cycle && cycle.stage ? cycle.stage : 'mid';
  const stageMult = (cycle && cycle.fair_value_band && cycle.fair_value_band[stage] && cycle.fair_value_band[stage].mult) || 1.0;
  const fvCeiling = avg != null ? round1(avg * stageMult) : null;
  const buyZoneFull = fvCeiling != null ? round1(fvCeiling * 0.85) : null;     // ≤ this = full size
  const buyZoneStarter = fvCeiling != null ? round1(fvCeiling * 0.92) : null;  // ≤ this = starter

  return {
    ok: true,
    ticker,
    name_en: ledger.name_en,
    name_zh: ledger.name_zh,
    layer: ledger.layer,
    layer_label_en: ledger.layer_label_en,
    methods: m,
    weighted_avg: avg,
    range_low: lo != null ? round1(lo) : null,
    range_high: hi != null ? round1(hi) : null,
    spread_pct: spread,
    methods_ran: okKeys.length,
    cycle_stage: stage,
    cycle_mult: stageMult,
    fair_value_ceiling: fvCeiling,
    buy_zone_full_size: buyZoneFull,
    buy_zone_starter: buyZoneStarter,
    live_price: (ledger.live_price && typeof ledger.live_price.value === 'number') ? ledger.live_price : null,
    last_contract: pickLatestContract(ledger),
    confirmed_receipts: countConfirmed(ledger),
    receipts_target: 4,
    as_of: new Date().toISOString().slice(0, 10)
  };
}

function pickLatestContract(d) {
  const arr = (d.contracts || []).slice().sort((a, b) => (b.dated || '').localeCompare(a.dated || ''));
  return arr[0] || null;
}

function countConfirmed(d) {
  const r = ((d.order_visibility || {}).receipts) || [];
  return r.filter(x => (x.verify_status || '').toLowerCase() === 'confirmed').length;
}

function fmtMethod(name, m) {
  if (!m.ok) return `  ${name.padEnd(12)}  —  skipped (${m.why})`;
  return `  ${name.padEnd(12)}  NT$${m.value.toString().padStart(8)}`;
}

function printHuman(v) {
  if (!v.ok) { console.log('  error:', v.error); return; }
  console.log(`\n  ${v.ticker} · ${v.name_en} · ${v.name_zh}  [${v.layer}]`);
  console.log('  ' + '─'.repeat(60));
  console.log(fmtMethod('PE',         v.methods.pe));
  console.log(fmtMethod('EV/EBITDA',  v.methods.ev_ebitda));
  console.log(fmtMethod('DCF',        v.methods.dcf));
  console.log(fmtMethod('Peer',       v.methods.peer));
  console.log(fmtMethod('Historical', v.methods.historical));
  console.log('  ' + '─'.repeat(60));
  console.log(`  weighted_avg  NT$${(v.weighted_avg || '—').toString().padStart(8)}    range NT$${v.range_low}–${v.range_high}    spread ${v.spread_pct}%`);
  console.log(`  cycle "${v.cycle_stage}" × ${v.cycle_mult}  →  fair-value ceiling NT$${v.fair_value_ceiling}`);
  console.log(`  buy zone:  full-size ≤ NT$${v.buy_zone_full_size}    starter ≤ NT$${v.buy_zone_starter}`);
  if (v.live_price) {
    console.log(`  live price: NT$${v.live_price.value}  (${v.live_price.as_of} · ${v.live_price.source || 'TWSE'})`);
  } else {
    console.log(`  live price: not fetched yet — run: node tools/live-fetch.cjs --price ${v.ticker}`);
  }
  console.log(`  confirmed receipts: ${v.confirmed_receipts}/${v.receipts_target}`);
}

function writeScan() {
  const out = {
    generated: new Date().toISOString(),
    weights: WEIGHTS,
    methodology: 'Five methods: PE multiple (ledger), EV/EBITDA (peer-derived, ×1.35 D&A), 5-yr DCF (WACC 10%, terminal g 3%, layer-aware growth), peer-group median PE, historical 5-yr median PE. Weighted average renormalizes over methods that have non-null inputs. Spread = (max - min) / avg as conviction signal. Cycle-stage multiplier from cycle.json applied on top.',
    tickers: TICKERS.map(t => valuate(t))
  };
  const dest = path.join(DESK, 'scan.json');
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  return dest;
}

// CLI
const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.log('usage:');
  console.log('  node tools/valuation.cjs <ticker>     human-readable');
  console.log('  node tools/valuation.cjs --all        all 5 tickers');
  console.log('  node tools/valuation.cjs --json <t>   JSON output');
  console.log('  node tools/valuation.cjs --write      write scan.json');
  process.exit(0);
}
if (argv[0] === '--write') {
  const dest = writeScan();
  console.log('  wrote', dest);
  process.exit(0);
}
if (argv[0] === '--all') {
  TICKERS.forEach(t => printHuman(valuate(t)));
  process.exit(0);
}
if (argv[0] === '--json') {
  const t = argv[1];
  console.log(JSON.stringify(valuate(t), null, 2));
  process.exit(0);
}
printHuman(valuate(argv[0]));
