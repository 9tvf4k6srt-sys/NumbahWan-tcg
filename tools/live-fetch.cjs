#!/usr/bin/env node
/* tools/live-fetch.cjs — pull live data from free public sources.
 *
 * Sources:
 *   TWSE 證交所 — 20-min delayed price quote (free, no key)
 *   MOPS 公開資訊觀測站 — 重大訊息 contract disclosures (free, no key)
 *
 * Honest about latency: every entry stamped with as_of_ts. TWSE is
 * 20-min delayed during market hours, end-of-day after close. MOPS
 * is real-time on filing.
 *
 * CLI:
 *   node tools/live-fetch.cjs --price <ticker>          one ticker
 *   node tools/live-fetch.cjs --price-all               all 5
 *   node tools/live-fetch.cjs --mops <ticker>           list latest 重大訊息
 *   node tools/live-fetch.cjs --mops-all                all 5
 *   node tools/live-fetch.cjs --refresh                 prices + scan.json regen
 *
 * Writes price into ledger.live_price = { value, as_of_ts, source, source_url, delayed_minutes }.
 * MOPS writes into ledger.contracts[] (append, dedup by filing_id).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DESK = path.join(ROOT, 'public', 'data', 'desk');
const TICKERS = ['3037', '3017', '2308', '2449', '3443'];

function fetchURL(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: Object.assign({
        'User-Agent': 'Mozilla/5.0 (compatible; pinforge-desk/1.0; +https://pinforge.example)',
        'Accept': 'application/json,text/html,*/*'
      }, opts.headers || {}),
      timeout: 12000
    }, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchURL(new URL(res.headers.location, url).href, opts).then(resolve, reject);
        }
        resolve({ status: res.statusCode, body, headers: res.headers });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// TWSE delayed quote — public endpoint
// https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_3037.tw
async function fetchTWSEPrice(ticker) {
  const ts = Date.now();
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${ticker}.tw&json=1&delay=0&_=${ts}`;
  try {
    const r = await fetchURL(url, {
      headers: { 'Referer': 'https://mis.twse.com.tw/stock/fibest.jsp?stock=' + ticker }
    });
    if (r.status !== 200) return { ok: false, why: `HTTP ${r.status}` };
    let j;
    try { j = JSON.parse(r.body); } catch (e) { return { ok: false, why: 'non-JSON response' }; }
    const arr = j.msgArray || [];
    if (!arr.length) return { ok: false, why: 'no msgArray (after market or unknown ticker)' };
    const m = arr[0];
    // z = latest match price; if "-" use y (yesterday close) as fallback
    const px = (m.z && m.z !== '-') ? parseFloat(m.z) : (m.y ? parseFloat(m.y) : null);
    if (px == null || isNaN(px)) return { ok: false, why: 'no price field (z/y missing)' };
    const closeFallback = (m.z === '-') ? true : false;
    return {
      ok: true,
      value: px,
      as_of_ts: new Date().toISOString(),
      market_date: m.d || null,
      market_time: m.t || null,
      yesterday_close: m.y ? parseFloat(m.y) : null,
      open: m.o ? parseFloat(m.o) : null,
      high: m.h ? parseFloat(m.h) : null,
      low: m.l ? parseFloat(m.l) : null,
      volume: m.v ? parseInt(m.v, 10) : null,
      source: 'TWSE 證交所 (delayed 20m)',
      source_url: `https://mis.twse.com.tw/stock/fibest.jsp?stock=${ticker}`,
      delayed_minutes: 20,
      using_yesterday_close: closeFallback,
      raw_status: m.z === '-' ? 'pre-open or market closed; using yesterday close' : 'live (delayed)'
    };
  } catch (e) {
    return { ok: false, why: 'fetch error: ' + (e.message || e) };
  }
}

// MOPS 重大訊息 — there's no clean JSON endpoint, but the search HTML page is parseable.
// We hit the t146sb05 page and extract dated rows that mention contract keywords.
async function fetchMOPSContracts(ticker) {
  // Public landing — we record the URL even if scrape fails, so analyst can click through.
  const url = `https://mops.twse.com.tw/mops/web/t146sb05?step=1&firstin=true&TYPEK=&co_id=${ticker}`;
  try {
    const r = await fetchURL(url, {
      headers: { 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8' }
    });
    // MOPS often returns a frameset / requires POST. Be honest about partial coverage.
    const html = r.body || '';
    // Heuristic regex pull: rows with date YYYY/MM/DD and a contract keyword
    const keywords = /取得|簽訂|合約|訂單|承攬|承製|得標|簽約|MOU|備忘錄|資本支出|擴產/;
    const rowRe = /(\d{3,4}\/\d{2}\/\d{2})[^<\n]{0,80}([^<\n]{0,300})/g;
    const hits = [];
    let mm;
    while ((mm = rowRe.exec(html)) !== null) {
      const txt = (mm[1] + ' ' + mm[2]).replace(/\s+/g, ' ').trim();
      if (keywords.test(txt) && hits.length < 8) {
        hits.push({ date_raw: mm[1], snippet: txt.slice(0, 220) });
      }
    }
    return {
      ok: true,
      ticker,
      as_of_ts: new Date().toISOString(),
      source: 'MOPS 公開資訊觀測站 · 重大訊息',
      source_url: url,
      hits_count: hits.length,
      hits,
      note: hits.length === 0
        ? 'No contract keywords found on landing page. MOPS often requires POST/iframe interaction; analyst should click through.'
        : 'Heuristic scrape — verify each hit on the live page before treating as a confirmed contract receipt.'
    };
  } catch (e) {
    return { ok: false, ticker, why: 'fetch error: ' + (e.message || e), source_url: url };
  }
}

// Write live_price into ledger
function writePriceToLedger(ticker, priceObj) {
  const lp = path.join(DESK, ticker + '.json');
  const d = JSON.parse(fs.readFileSync(lp, 'utf8'));
  d.live_price = {
    value: priceObj.value,
    as_of_ts: priceObj.as_of_ts,
    market_date: priceObj.market_date,
    market_time: priceObj.market_time,
    yesterday_close: priceObj.yesterday_close,
    open: priceObj.open,
    high: priceObj.high,
    low: priceObj.low,
    volume: priceObj.volume,
    source: priceObj.source,
    source_url: priceObj.source_url,
    delayed_minutes: priceObj.delayed_minutes,
    using_yesterday_close: priceObj.using_yesterday_close,
    raw_status: priceObj.raw_status
  };
  fs.writeFileSync(lp, JSON.stringify(d, null, 2));
}

// Append MOPS hits into ledger.contracts[] (dedup by snippet hash)
function writeMOPSToLedger(ticker, mopsObj) {
  const lp = path.join(DESK, ticker + '.json');
  const d = JSON.parse(fs.readFileSync(lp, 'utf8'));
  d.contracts = d.contracts || [];
  const seen = new Set(d.contracts.map(c => c.snippet_hash));
  let added = 0;
  for (const h of mopsObj.hits) {
    const hashSrc = h.date_raw + '::' + h.snippet.slice(0, 80);
    const hashed = require('crypto').createHash('md5').update(hashSrc).digest('hex').slice(0, 12);
    if (!seen.has(hashed)) {
      d.contracts.push({
        dated: h.date_raw.replace(/\//g, '-'),
        snippet: h.snippet,
        snippet_hash: hashed,
        source: mopsObj.source,
        source_url: mopsObj.source_url,
        fetched_ts: mopsObj.as_of_ts,
        verify_status: 'unverified-scrape',
        analyst_note: '[draft — analyst must open MOPS, paste verbatim 重大訊息 text into contract_disclosure block, set value/counterparty/tenor]'
      });
      seen.add(hashed);
      added++;
    }
  }
  d.contracts_meta = {
    last_fetched_ts: mopsObj.as_of_ts,
    last_source_url: mopsObj.source_url,
    last_hits_count: mopsObj.hits_count,
    last_note: mopsObj.note
  };
  fs.writeFileSync(lp, JSON.stringify(d, null, 2));
  return added;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.log('usage:');
    console.log('  node tools/live-fetch.cjs --price <ticker>');
    console.log('  node tools/live-fetch.cjs --price-all');
    console.log('  node tools/live-fetch.cjs --mops <ticker>');
    console.log('  node tools/live-fetch.cjs --mops-all');
    console.log('  node tools/live-fetch.cjs --refresh        # all prices + write scan.json');
    return;
  }
  if (argv[0] === '--price') {
    const t = argv[1];
    const r = await fetchTWSEPrice(t);
    if (r.ok) {
      writePriceToLedger(t, r);
      console.log(`  ${t}  NT$${r.value}  ${r.market_date} ${r.market_time}  (${r.source})`);
      if (r.using_yesterday_close) console.log('  note:', r.raw_status);
    } else {
      console.log(`  ${t}  FAIL  ${r.why}`);
    }
    return;
  }
  if (argv[0] === '--price-all') {
    for (const t of TICKERS) {
      const r = await fetchTWSEPrice(t);
      if (r.ok) {
        writePriceToLedger(t, r);
        console.log(`  ${t}  NT$${r.value}  ${r.market_date || '—'} ${r.market_time || '—'}${r.using_yesterday_close ? ' [y-close]' : ''}`);
      } else {
        console.log(`  ${t}  FAIL  ${r.why}`);
      }
    }
    return;
  }
  if (argv[0] === '--mops') {
    const t = argv[1];
    const r = await fetchMOPSContracts(t);
    console.log(JSON.stringify(r, null, 2));
    if (r.ok) {
      const added = writeMOPSToLedger(t, r);
      console.log(`  appended ${added} new contract(s) to ${t}.json`);
    }
    return;
  }
  if (argv[0] === '--mops-all') {
    for (const t of TICKERS) {
      const r = await fetchMOPSContracts(t);
      if (r.ok) {
        const added = writeMOPSToLedger(t, r);
        console.log(`  ${t}  hits=${r.hits_count}  appended=${added}`);
      } else {
        console.log(`  ${t}  FAIL  ${r.why}`);
      }
    }
    return;
  }
  if (argv[0] === '--refresh') {
    console.log('--- prices ---');
    for (const t of TICKERS) {
      const r = await fetchTWSEPrice(t);
      if (r.ok) { writePriceToLedger(t, r); console.log(`  ${t}  NT$${r.value}${r.using_yesterday_close ? ' [y-close]' : ''}`); }
      else console.log(`  ${t}  FAIL  ${r.why}`);
    }
    console.log('--- regen scan.json ---');
    const { execSync } = require('child_process');
    execSync('node ' + path.join(__dirname, 'valuation.cjs') + ' --write', { stdio: 'inherit' });
    return;
  }
  console.log('unknown command:', argv[0]);
}
main().catch(e => { console.error(e); process.exit(1); });
