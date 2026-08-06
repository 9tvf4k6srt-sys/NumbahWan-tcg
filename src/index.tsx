import { Hono } from 'hono'

const app = new Hono()

// ─────────────────────────────────────────────────────────────
// 台股戰情室 TWSE warroom — landing page
// Identity: military intel room for TAIEX wave orders. Honesty is the brand.
// ─────────────────────────────────────────────────────────────

const Head = () => (
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>台股戰情室 TWSE warroom — 台股波段指令 | TAIEX wave orders</title>
    <meta
      name="description"
      content="紅燈撤退、綠燈回防，隔天開盤執行。Walk-forward 樣本外 +23.6%，最大回落 −13% vs 只抱 −32%。台股波段戰情室，戰績全公開。"
    />
    <meta name="theme-color" content="#08090b" />
    <link
      rel="icon"
      href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect x='8' y='4' width='48' height='56' rx='14' fill='%23000'/%3E%3Ccircle cx='32' cy='18' r='8' fill='%23ff5c5c'/%3E%3Ccircle cx='32' cy='32' r='8' fill='%23ffb84d'/%3E%3Ccircle cx='32' cy='46' r='8' fill='%233ddc97'/%3E%3C/svg%3E"
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Serif+TC:wght@600;700;900&family=Noto+Sans+TC:wght@400;500;700;900&family=JetBrains+Mono:wght@400;600;700&display=swap"
      rel="stylesheet"
    />
    <link href="/static/landing.css" rel="stylesheet" />
  </head>
)

// silence browser /favicon.ico requests — serve the inline three-light signal SVG
const FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="4" width="48" height="56" rx="14" fill="#000"/><circle cx="32" cy="18" r="8" fill="#ff5c5c"/><circle cx="32" cy="32" r="8" fill="#ffb84d"/><circle cx="32" cy="46" r="8" fill="#3ddc97"/></svg>'
app.get('/favicon.ico', (c) =>
  c.body(FAVICON_SVG, 200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400' }),
)

// ─────────────────────────────────────────────────────────────
// /api/market-now — live TAIEX snapshot with full timestamp provenance.
// Source: TWSE mis API (official exchange feed). Cached 30s at the edge.
// ─────────────────────────────────────────────────────────────

const TWSE_URL =
  'https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_t00.tw&json=1&delay=0'

type MarketNow = {
  ok: boolean
  source: 'twse-mis'
  fetchedAtUtc: string
  fetchedAtTaipei: string
  session: 'pre-open' | 'trading' | 'closed' | 'weekend'
  quote: {
    date: string | null // exchange trade date, e.g. 20260731
    time: string | null // exchange print time, e.g. 13:33:00
    price: number | null
    open: number | null
    high: number | null
    low: number | null
    prevClose: number | null
    changePct: number | null
    isRealtime: boolean // true if exchange print is from today's session
  }
  error?: string
}

function taipeiNow(): { date: Date; iso: string; hm: string; ymd: string; weekday: number } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const ymd = `${get('year')}${get('month')}${get('day')}`
  const hm = `${get('hour')}:${get('minute')}`
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    date: now,
    iso: `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`,
    hm,
    ymd,
    weekday: wdMap[get('weekday')] ?? 1,
  }
}

function sessionOf(tp: { hm: string; weekday: number }): MarketNow['session'] {
  if (tp.weekday === 0 || tp.weekday === 6) return 'weekend'
  const [h, m] = tp.hm.split(':').map(Number)
  const mins = h * 60 + m
  if (mins < 9 * 60) return 'pre-open'
  if (mins <= 13 * 60 + 33) return 'trading'
  return 'closed'
}

app.get('/api/market-now', async (c) => {
  const tp = taipeiNow()
  const fetchedAtUtc = new Date().toISOString()
  const base: MarketNow = {
    ok: false,
    source: 'twse-mis',
    fetchedAtUtc,
    fetchedAtTaipei: `${tp.iso} (台北)`,
    session: sessionOf(tp),
    quote: { date: null, time: null, price: null, open: null, high: null, low: null, prevClose: null, changePct: null, isRealtime: false },
  }
  try {
    const res = await fetch(TWSE_URL, {
      headers: { 'user-agent': 'twse-warroom/1.0', accept: 'application/json' },
      cf: { cacheTtl: 25, cacheEverything: true },
    } as RequestInit)
    if (!res.ok) throw new Error(`twse http ${res.status}`)
    const j = (await res.json()) as { msgArray?: Array<Record<string, string>> }
    const row = j.msgArray?.[0]
    if (!row) throw new Error('twse empty payload')
    const num = (v: string | undefined) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }
    const price = num(row.z)
    const prev = num(row.y)
    base.ok = true
    base.quote = {
      date: row.d ?? null,
      time: row.t ?? row['%'] ?? null,
      price,
      open: num(row.o),
      high: num(row.h),
      low: num(row.l),
      prevClose: prev,
      changePct: price != null && prev ? +(((price - prev) / prev) * 100).toFixed(2) : null,
      isRealtime: row.d === tp.ymd,
    }
    return c.json(base, 200, { 'cache-control': 'public, max-age=20' })
  } catch (e) {
    base.error = e instanceof Error ? e.message : 'fetch failed'
    return c.json(base, 502)
  }
})

app.get('/', (c) => {
  return c.html(
    <html lang="zh-Hant">
      <Head />
      <body>
        {/* ambient background layers */}
        <div class="bg-grid" aria-hidden="true" />
        <div class="bg-glow" aria-hidden="true" />

        {/* ── NAV ── */}
        <header class="nav">
          <a class="nav-brand" href="#top">
            <span class="brand-light" aria-hidden="true">
              <i class="dot dot-r" /><i class="dot dot-a" /><i class="dot dot-g" />
            </span>
            <span class="brand-word">
              <span class="zh">台股戰情室</span><span class="en">TWSE warroom</span>
            </span>
            <span class="brand-sub mono">TAIEX SIGNAL COMMAND</span>
          </a>
          <nav class="nav-links">
            <a href="#lights"><span class="zh">燈號</span><span class="en">Lights</span></a>
            <a href="#proof"><span class="zh">成績</span><span class="en">Proof</span></a>
            <a href="#method"><span class="zh">方法</span><span class="en">Method</span></a>
          </nav>
          <div class="nav-actions">
            <button id="lang-toggle" class="lang-toggle mono" type="button" aria-label="switch language">EN</button>
            <button class="btn btn-primary btn-nav" type="button" data-desk-open>
              <span class="zh">進入戰情室</span><span class="en">Enter TWSE warroom</span>
            </button>
          </div>
        </header>

        <main id="top">
          {/* ── HERO ── */}
          <section class="hero" id="hero">
            <div class="hero-inner">
              <p class="kicker mono reveal">
                <span class="zh">台股加權指數 · 波段進出燈號</span>
                <span class="en">TAIEX wave-trading signal desk</span>
              </p>
              <h1 class="hero-title">
                <span class="line reveal d1"><span class="zh">紅燈賣。</span><span class="en">Red: sell.</span></span>
                <span class="line reveal d2"><span class="zh">綠燈買。</span><span class="en">Green: buy.</span></span>
                <span class="line serif reveal d3 accent">
                  <span class="zh">指令就這麼短。</span><span class="en">Orders stay this short.</span>
                </span>
              </h1>
              <p class="hero-sub reveal d4">
                <span class="zh">
                  沒有預言，只有情資。收盤後運算燈號，隔天開盤執行——
                  崩盤前撤退，低點附近回防。全部戰績如下，輸贏如實上報。
                </span>
                <span class="en">
                  No prophecy — only intel. Signals computed after close, executed at next open:
                  retreat before corrections, re-enter near lows. Full battle record below, wins and misses reported alike.
                </span>
              </p>
              <div class="hero-cta reveal d5">
                <button class="btn btn-primary btn-lg" type="button" data-desk-open>
                  <span class="zh">進入台股戰情室</span><span class="en">Enter TWSE warroom</span>
                  <span class="btn-arrow" aria-hidden="true">→</span>
                </button>
                <a class="btn btn-ghost btn-lg" href="#proof">
                  <span class="zh">先看誠實成績單</span><span class="en">See the honest proof</span>
                </a>
              </div>

              {/* hero equity curve */}
              <div class="hero-chart reveal d6" id="proof-chart-card">
                <div class="chart-head">
                  <div>
                    <span class="chart-label mono">
                      <span class="zh">2019 → 現在 · 策略 vs 只抱</span>
                      <span class="en">2019 → now · strategy vs buy &amp; hold</span>
                    </span>
                  </div>
                  <div class="chart-legend mono">
                    <span class="lg lg-st"><i />TWSE warroom <b id="legend-st">+957%</b></span>
                    <span class="lg lg-bh"><i /><span class="zh">只抱</span><span class="en">B&amp;H</span> <b id="legend-bh">+351%</b></span>
                  </div>
                </div>
                <canvas id="equity-canvas" height="260" aria-label="equity curve strategy versus buy and hold" />
                <p class="chart-note mono">
                  <span class="zh">示意路徑 · 端點與最大回落為真實回測數字（含 15bps 成本、隔天開盤成交）</span>
                  <span class="en">Illustrative path · endpoints &amp; drawdowns are real backtest figures (15 bps cost, next-open fills)</span>
                </p>
              </div>
            </div>

            {/* marquee */}
            <div class="marquee" aria-hidden="true">
              <div class="marquee-track mono">
                {Array.from({ length: 2 }).map(() => (
                  <span class="marquee-seq">
                    <em class="m-r">RED = EXIT NEXT OPEN</em><i>◆</i>
                    <em class="m-g">GREEN = RE-ENTER NEAR LOWS</em><i>◆</i>
                    <em>WALK-FORWARD OOS +23.6%</em><i>◆</i>
                    <em class="m-a">MAX DD −13% vs −32%</em><i>◆</i>
                    <em>INTEL, NOT PROPHECY</em><i>◆</i>
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ── PAIN / WIT ── */}
          <section class="section pain" id="pain">
            <div class="wrap">
              <p class="kicker mono reveal"><span class="zh">前線實錄</span><span class="en">Field reports</span></p>
              <h2 class="h2 reveal d1">
                <span class="zh">「這次我一定抱得住。」</span>
                <span class="en">“This time I'll just hold through it.”</span>
              </h2>
              <p class="lead serif reveal d2">
                <span class="zh">——每位股民，在每次崩盤之前</span>
                <span class="en">— every investor, right before every correction</span>
              </p>
              <div class="pain-grid">
                <div class="pain-card reveal d2">
                  <span class="pain-num mono">−29%</span>
                  <p><span class="zh">2023 之後只抱者的最大回落。抱得很緊，跌得很深。</span>
                     <span class="en">Max drawdown for buy-and-holders post-2023. Held tight, fell hard.</span></p>
                </div>
                <div class="pain-card reveal d3">
                  <span class="pain-num mono">−32%</span>
                  <p><span class="zh">2019 至今只抱的最大回落。時間是你的朋友，但波段不是。</span>
                     <span class="en">Max drawdown for buy &amp; hold since 2019. Time is your friend; waves are not.</span></p>
                </div>
                <div class="pain-card reveal d4">
                  <span class="pain-num mono accent-g">−13%</span>
                  <p><span class="zh">同一期間戰情室策略的最大回落。躲過的跌，就是賺到的。</span>
                     <span class="en">Max drawdown for the warroom strategy over the same period. Dodged drops are earned returns.</span></p>
                </div>
              </div>
            </div>
          </section>

          {/* ── LIGHTS ── */}
          <section class="section lights" id="lights">
            <div class="wrap">
              <p class="kicker mono reveal"><span class="zh">全部指令，五個字</span><span class="en">All orders: five words</span></p>
              <h2 class="h2 reveal d1">
                <span class="zh">賣、空、減、抱、買</span>
                <span class="en">Sell · Cash · Trim · Hold · Buy</span>
              </h2>
              <p class="sub reveal d2">
                <span class="zh">點一盞燈看看。沒有 47 頁 PDF，沒有神秘指標——只有隔天開盤要做的事。</span>
                <span class="en">Tap a light. No 47-page PDFs, no mystic indicators — just what to do at next open.</span>
              </p>

              <div class="lights-board reveal d3">
                <div class="lights-col" role="tablist" aria-label="signal lights">
                  <button class="light-btn" data-light="sell" role="tab" type="button">
                    <i class="lamp lamp-r" aria-hidden="true" /><span class="light-verb">賣</span>
                    <span class="light-name mono">RED</span>
                  </button>
                  <button class="light-btn" data-light="cash" role="tab" type="button">
                    <i class="lamp lamp-c" aria-hidden="true" /><span class="light-verb">空</span>
                    <span class="light-name mono">CASH</span>
                  </button>
                  <button class="light-btn" data-light="trim" role="tab" type="button">
                    <i class="lamp lamp-a" aria-hidden="true" /><span class="light-verb">減</span>
                    <span class="light-name mono">AMBER</span>
                  </button>
                  <button class="light-btn" data-light="hold" role="tab" type="button">
                    <i class="lamp lamp-h" aria-hidden="true" /><span class="light-verb">抱</span>
                    <span class="light-name mono">HOLD</span>
                  </button>
                  <button class="light-btn active" data-light="buy" role="tab" type="button">
                    <i class="lamp lamp-g" aria-hidden="true" /><span class="light-verb">買</span>
                    <span class="light-name mono">GREEN</span>
                  </button>
                </div>
                <div class="light-detail" id="light-detail" aria-live="polite">
                  {/* filled by JS */}
                </div>
              </div>

              <p class="fineprint mono reveal d4">
                <span class="zh">檢驗標準：綠燈看之後 2–3 日有沒有反彈；紅燈看之後約 10 日有沒有躲過下跌。不拿 10 日成績冒充綠燈準度。</span>
                <span class="en">How we're graded: greens are judged on the next 2–3 sessions, reds on the next ~10. We never pass off a 10-day result as green accuracy.</span>
              </p>
            </div>
          </section>

          {/* ── PROOF ── */}
          <section class="section proof" id="proof">
            <div class="wrap">
              <p class="kicker mono reveal"><span class="zh">戰績報告</span><span class="en">Battle record</span></p>
              <h2 class="h2 reveal d1">
                <span class="zh">贏要貼，輸也要貼</span>
                <span class="en">Wins posted. Losses too.</span>
              </h2>
              <p class="sub reveal d2">
                <span class="zh">規則只用樣本外 walk-forward 篩選——拿沒見過的年份驗證，沒通過的戰術不上線。</span>
                <span class="en">Rules are screened on out-of-sample walk-forward only — validated on years the model never saw. Tactics that fail don't deploy.</span>
              </p>

              {/* big stat row */}
              <div class="stat-row reveal d3">
                <div class="stat">
                  <span class="stat-num mono" data-count="23.6" data-suffix="%">0%</span>
                  <span class="stat-label"><span class="zh">樣本外平均超額（出廠門檻）</span><span class="en">Mean out-of-sample excess (ship gate)</span></span>
                </div>
                <div class="stat">
                  <span class="stat-num mono" data-count="131" data-prefix="+" data-suffix="%">0</span>
                  <span class="stat-label"><span class="zh">2023 後超額（+334% vs +203%）</span><span class="en">Post-2023 excess (+334% vs +203%)</span></span>
                </div>
                <div class="stat">
                  <span class="stat-num mono" data-count="605" data-prefix="+" data-suffix="%">0</span>
                  <span class="stat-label"><span class="zh">2019 至今超額（+957% vs +351%）</span><span class="en">Since-2019 excess (+957% vs +351%)</span></span>
                </div>
                <div class="stat">
                  <span class="stat-num mono" data-count="100" data-suffix="%">0</span>
                  <span class="stat-label"><span class="zh">OOS 四個區間全部 ≥ 只抱</span><span class="en">All 4 OOS folds ≥ buy &amp; hold</span></span>
                </div>
              </div>

              {/* fold bars */}
              <div class="folds reveal d4">
                <p class="folds-title mono"><span class="zh">逐年樣本外超額（%）</span><span class="en">Out-of-sample excess by fold (%)</span></p>
                <div class="fold-bars">
                  <div class="fold"><span class="fold-val mono">+23.7</span><div class="fold-bar"><i style="--h:41%" /></div><span class="fold-yr mono">2022</span></div>
                  <div class="fold"><span class="fold-val mono">0.0</span><div class="fold-bar"><i class="flat" style="--h:3%" /></div><span class="fold-yr mono">2023</span></div>
                  <div class="fold"><span class="fold-val mono">+12.2</span><div class="fold-bar"><i style="--h:21%" /></div><span class="fold-yr mono">2024</span></div>
                  <div class="fold"><span class="fold-val mono">+58.4</span><div class="fold-bar"><i style="--h:100%" /></div><span class="fold-yr mono">2025+</span></div>
                </div>
                <p class="fineprint mono">
                  <span class="zh">2023 打平只抱——我們把它留在榜上，因為誠實比好看重要。</span>
                  <span class="en">2023 was a tie with buy &amp; hold. It stays on the board, because honest beats pretty.</span>
                </p>
              </div>

              {/* real signal timeline */}
              <div class="timeline reveal d5">
                <p class="folds-title mono"><span class="zh">最近的真實燈號（回測重播）</span><span class="en">Recent real signals (backtest replay)</span></p>
                <ol class="tl" id="tl">
                  <li class="tl-item tl-r">
                    <span class="tl-date mono">2024-07-18</span>
                    <span class="tl-kind"><i class="dot dot-r" /><span class="zh">紅燈 · 出場</span><span class="en">RED · exit</span></span>
                    <span class="tl-out"><span class="zh">之後 10 日大盤 </span><span class="en">Next 10d TAIEX </span><b class="neg">−15.2%</b> <span class="zh">· 躲過</span><span class="en">· dodged</span></span>
                  </li>
                  <li class="tl-item tl-g">
                    <span class="tl-date mono">2024-09-06</span>
                    <span class="tl-kind"><i class="dot dot-g" /><span class="zh">綠燈 · 進場</span><span class="en">GREEN · enter</span></span>
                    <span class="tl-out"><span class="zh">之後 10 日 </span><span class="en">Next 10d </span><b class="pos">+4.0%</b></span>
                  </li>
                  <li class="tl-item tl-r">
                    <span class="tl-date mono">2025-02-26</span>
                    <span class="tl-kind"><i class="dot dot-r" /><span class="zh">紅燈 · 出場</span><span class="en">RED · exit</span></span>
                    <span class="tl-out"><span class="zh">軟紅減碼 → 03-04 全退；之後 10 日 </span><span class="en">Soft red trim → full exit 03-04; next 10d </span><b class="neg">−6.2%</b> <span class="zh">· 躲過</span><span class="en">· dodged</span></span>
                  </li>
                  <li class="tl-item tl-g">
                    <span class="tl-date mono">2025-04-10</span>
                    <span class="tl-kind"><i class="dot dot-g" /><span class="zh">綠燈 · 進場</span><span class="en">GREEN · enter</span></span>
                    <span class="tl-out"><span class="zh">低點 19,000 附近上車，前一日反彈 </span><span class="en">Re-entry near the 19,000 low, prior day </span><b class="pos">+9.2%</b></span>
                  </li>
                  <li class="tl-item tl-r">
                    <span class="tl-date mono">2026-03-04</span>
                    <span class="tl-kind"><i class="dot dot-r" /><span class="zh">紅燈 · 出場</span><span class="en">RED · exit</span></span>
                    <span class="tl-out"><span class="zh">高分紅燈（score 100）· 10 日內最低 </span><span class="en">Score-100 red · 10d low </span><b class="neg">−2.2%</b></span>
                  </li>
                  <li class="tl-item tl-g">
                    <span class="tl-date mono">2026-03-10</span>
                    <span class="tl-kind"><i class="dot dot-g" /><span class="zh">綠燈 · 進場</span><span class="en">GREEN · enter</span></span>
                    <span class="tl-out"><span class="zh">3 日內 </span><span class="en">Within 3d </span><b class="pos">+1.9%</b></span>
                  </li>
                  <li class="tl-item tl-r">
                    <span class="tl-date mono">2026-06-05</span>
                    <span class="tl-kind"><i class="dot dot-r" /><span class="zh">紅燈 · 出場</span><span class="en">RED · exit</span></span>
                    <span class="tl-out"><span class="zh">之後 5 日最低 </span><span class="en">Next 5d low </span><b class="neg">−4.3%</b> <span class="zh">· 躲過</span><span class="en">· dodged</span></span>
                  </li>
                  <li class="tl-item tl-r">
                    <span class="tl-date mono">2026-07-08</span>
                    <span class="tl-kind"><i class="dot dot-r" /><span class="zh">紅燈 · 全數撤退</span><span class="en">RED · full retreat</span></span>
                    <span class="tl-out"><span class="zh">07-06 軟紅減碼 → 07-08 空手；只抱其後最深 </span><span class="en">Soft red 07-06 → cash 07-08; B&amp;H max drop since </span><b class="neg">−11.9%</b></span>
                  </li>
                </ol>
              </div>
            </div>
          </section>

          {/* ── COMPARE: with vs without ── */}
          <section class="section compare" id="compare">
            <div class="wrap">
              <p class="kicker mono reveal"><span class="zh">用 vs 不用</span><span class="en">With vs without</span></p>
              <h2 class="h2 reveal d1">
                <span class="zh">用戰情室 vs 只抱不動</span>
                <span class="en">With warroom vs buy &amp; hold</span>
              </h2>
              <p class="sub reveal d2">
                <span class="zh">左邊：照戰情室燈號進出。右邊：買進持有、什麼都不做。同一期間、同一市場，成本已扣除。</span>
                <span class="en">Left: entries and exits follow warroom signals. Right: buy and hold, untouched. Same period, same market, costs included.</span>
              </p>

              {/* post-2023 board */}
              <div class="vs-board reveal d3">
                <p class="vs-period mono">
                  <span class="zh">2023 至今 · 近三年</span><span class="en">Post-2023 · last ~3 years</span>
                </p>
                <div class="vs-table">
                  <div class="vs-row vs-head mono">
                    <span />
                    <span><i class="dot dot-g" /><span class="zh">用戰情室</span><span class="en">With warroom</span></span>
                    <span><i class="dot dot-r" /><span class="zh">不用 · 只抱</span><span class="en">Without · B&amp;H</span></span>
                  </div>
                  <div class="vs-row">
                    <span class="vs-k"><span class="zh">100 萬變成</span><span class="en">NT$1M became</span></span>
                    <span class="vs-v vs-win mono">434 萬<b class="vs-tag">+334%</b></span>
                    <span class="vs-v mono">303 萬<b class="vs-tag">+203%</b></span>
                  </div>
                  <div class="vs-row">
                    <span class="vs-k"><span class="zh">最慘的時刻</span><span class="en">Worst moment</span></span>
                    <span class="vs-v vs-win mono">−8%<b class="vs-tag"><span class="zh">剩 92 萬</span><span class="en">920k left</span></b></span>
                    <span class="vs-v mono">−29%<b class="vs-tag"><span class="zh">剩 71 萬</span><span class="en">710k left</span></b></span>
                  </div>
                  <div class="vs-row vs-total">
                    <span class="vs-k"><span class="zh">多賺的</span><span class="en">Extra gained</span></span>
                    <span class="vs-v vs-win mono">+131 萬<b class="vs-tag"><span class="zh">來自躲過的下跌</span><span class="en">from dodged drawdowns</span></b></span>
                    <span class="vs-v mono">—</span>
                  </div>
                </div>
              </div>

              {/* 2019 board */}
              <div class="vs-board reveal d4">
                <p class="vs-period mono">
                  <span class="zh">2019 至今 · 完整回測</span><span class="en">2019 → now · full backtest</span>
                </p>
                <div class="vs-table">
                  <div class="vs-row">
                    <span class="vs-k"><span class="zh">100 萬變成</span><span class="en">NT$1M became</span></span>
                    <span class="vs-v vs-win mono">1,057 萬<b class="vs-tag">+957%</b></span>
                    <span class="vs-v mono">451 萬<b class="vs-tag">+351%</b></span>
                  </div>
                  <div class="vs-row">
                    <span class="vs-k"><span class="zh">最慘的時刻</span><span class="en">Worst moment</span></span>
                    <span class="vs-v vs-win mono">−13%<b class="vs-tag"><span class="zh">剩 87 萬</span><span class="en">870k left</span></b></span>
                    <span class="vs-v mono">−32%<b class="vs-tag"><span class="zh">剩 68 萬</span><span class="en">680k left</span></b></span>
                  </div>
                  <div class="vs-row vs-total">
                    <span class="vs-k"><span class="zh">多賺的</span><span class="en">Extra gained</span></span>
                    <span class="vs-v vs-win mono">+606 萬<b class="vs-tag"><span class="zh">約 6 倍本金</span><span class="en">~6× principal</span></b></span>
                    <span class="vs-v mono">—</span>
                  </div>
                </div>
              </div>

              {/* live episode — July 2026 */}
              <div class="vs-live reveal d5">
                <p class="vs-period mono">
                  <span class="zh">實測 · 就在上個月</span><span class="en">Live fire · just last month</span>
                </p>
                <div class="vs-live-grid">
                  <div class="vs-live-col">
                    <span class="vs-live-tag mono"><i class="dot dot-g" /><span class="zh">戰情室</span><span class="en">Warroom</span></span>
                    <p><span class="zh">07-08 紅燈全數撤退 @45,734 → 空手待命。一個月後：本金 100% 完整。</span>
                       <span class="en">Full retreat on red 07-08 @45,734 → stood by in cash. A month later: principal 100% intact.</span></p>
                  </div>
                  <div class="vs-live-col">
                    <span class="vs-live-tag mono"><i class="dot dot-r" /><span class="zh">只抱</span><span class="en">Buy &amp; hold</span></span>
                    <p><span class="zh">原地不動 → 07-30 最低 39,933（−12.7%）；月底 43,120（−5.7%），100 萬剩 94.3 萬。</span>
                       <span class="en">Sat still → low 39,933 on 07-30 (−12.7%); ended the month at 43,120 (−5.7%), NT$1M became 943k.</span></p>
                  </div>
                </div>
                <p class="vs-live-note mono">
                  <span class="zh">這個月，燈號讓部位避開 −12.7% 的低點；月底結算，兩邊相差 5.7 個百分點。</span>
                  <span class="en">This month, the signal kept the position out of a −12.7% drop; at month-end the two sides were 5.7 percentage points apart.</span>
                </p>
              </div>

              {/* honesty methodology */}
              <div class="vs-honest reveal d6">
                <p class="folds-title mono"><span class="zh">我們怎麼比，才算誠實</span><span class="en">How we compare — honestly</span></p>
                <ul class="vs-rules">
                  <li><b class="mono">01</b><span><span class="zh">同一段時間、同一個市場、同一套數據。不挑區間，不換標的。</span><span class="en">Same period, same market, same data. No cherry-picked windows, no swapped benchmarks.</span></span></li>
                  <li><b class="mono">02</b><span><span class="zh">規則只用樣本外驗證：拿沒看過的年份考試，考過才部署。</span><span class="en">Rules validated out-of-sample only: tested on years the model never saw, deployed only after passing.</span></span></li>
                  <li><b class="mono">03</b><span><span class="zh">成本照算：每次進出扣 15bps，隔天開盤才成交。回測不打折。</span><span class="en">Costs included: 15bps per flip, filled at next open. No discounted backtests.</span></span></li>
                  <li><b class="mono">04</b><span><span class="zh">輸的也貼：2023 年打平只抱（+0.0%），照常留在榜上。</span><span class="en">Losses posted too: 2023 tied buy &amp; hold (+0.0%) and stays on the board.</span></span></li>
                </ul>
              </div>
            </div>
          </section>

          {/* ── METHOD ── */}
          <section class="section method" id="method">
            <div class="wrap">
              <p class="kicker mono reveal"><span class="zh">為什麼可以信</span><span class="en">Why it's trustworthy</span></p>
              <h2 class="h2 reveal d1">
                <span class="zh">不預言，只回報</span>
                <span class="en">No prophecy. Just intel.</span>
              </h2>
              <div class="method-grid">
                <article class="m-card reveal d2">
                  <span class="m-idx mono">01</span>
                  <h3><span class="zh">Walk-forward 樣本外</span><span class="en">Walk-forward OOS</span></h3>
                  <p><span class="zh">規則只用過去資料篩選，在沒看過的年份驗證。四個考區全過才准部署，沒過的戰術不上前線。</span>
                     <span class="en">Rules are screened on the past and validated on unseen years. All four folds must pass before deployment; failures never reach the front line.</span></p>
                </article>
                <article class="m-card reveal d3">
                  <span class="m-idx mono">02</span>
                  <h3><span class="zh">真實成本</span><span class="en">Real-world costs</span></h3>
                  <p><span class="zh">每次進出扣約 15bps，隔天開盤才成交。回測不打折，成績不灌水。</span>
                     <span class="en">~15 bps charged per flip, fills at next open. No discounted backtests, no inflated numbers.</span></p>
                </article>
                <article class="m-card reveal d4">
                  <span class="m-idx mono">03</span>
                  <h3><span class="zh">雙重檢驗</span><span class="en">Dual-horizon test</span></h3>
                  <p><span class="zh">綠燈看 2–3 日反彈，紅燈看 10 日避險。各考各的，不混分。</span>
                     <span class="en">Greens judged on 2–3 day bounces, reds on 10-day protection. Each graded on its own exam.</span></p>
                </article>
                <article class="m-card reveal d5">
                  <span class="m-idx mono">04</span>
                  <h3><span class="zh">認輸機制</span><span class="en">Built-in humility</span></h3>
                  <p><span class="zh">每月把最新行情記進 live-paper 日誌，連續兩輪改進 &lt;1% 就宣布高原期，如實上報。</span>
                     <span class="en">Each month logs fresh live-paper results; two improvement rounds under 1% and a plateau is officially declared. Reported as-is.</span></p>
                </article>
              </div>

              <blockquote class="honest-quote reveal d6 serif">
                <span class="zh">「如果哪一天輸給只抱，我們會照實貼在這裡。<br />這句話本身就是風控。」</span>
                <span class="en">“If we ever lose to buy &amp; hold, it gets posted right here.<br />That sentence is itself risk control.”</span>
              </blockquote>
            </div>
          </section>

          {/* ── CTA ── */}
          <section class="section cta" id="cta">
            <div class="wrap cta-inner reveal">
              <div class="cta-lights" aria-hidden="true">
                <i class="dot dot-r" /><i class="dot dot-a" /><i class="dot dot-g on" />
              </div>
              <h2 class="cta-title">
                <span class="zh">今天，是什麼燈？</span>
                <span class="en">So — what's today's light?</span>
              </h2>
              <p class="sub">
                <span class="zh">開盤前看一眼，就夠了。</span>
                <span class="en">One glance before the open. That's all it takes.</span>
              </p>
              <button class="btn btn-primary btn-xl" type="button" data-desk-open>
                <span class="zh">免費啟動掃描</span><span class="en">Run a scan — free</span>
                <span class="btn-arrow" aria-hidden="true">→</span>
              </button>
              <p class="fineprint mono">
                <span class="zh">不用信用卡。不用個資。只需要面對現實的勇氣。</span>
                <span class="en">No credit card. No personal data. Just the courage to face reality.</span>
              </p>
            </div>
          </section>

          {/* ── FOOTER ── */}
          <footer class="footer">
            <div class="wrap footer-inner">
              <div class="footer-brand">
                <span class="brand-light" aria-hidden="true"><i class="dot dot-r" /><i class="dot dot-a" /><i class="dot dot-g" /></span>
                <span class="zh">台股戰情室</span><span class="en">TWSE warroom</span>
              </div>
              <p class="footer-disclaimer">
                <span class="zh">
                  研究與教育工具，不是投資建議。歷史績效不代表未來。部位是你的，風險也是你的——
                  本戰情室只負責一件事：如實回報燈號。
                </span>
                <span class="en">
                  Research &amp; education tool — not investment advice. Past performance doesn't guarantee the future.
                  Your positions, your risk. This warroom has exactly one job: report the signal as-is.
                </span>
              </p>
              <p class="footer-meta mono">
                TAIEX SIGNAL COMMAND · WALK-FORWARD VERIFIED · <span id="year">2026</span>
              </p>
            </div>
          </footer>
        </main>

        {/* ── 台股戰情室 TWSE WAR ROOM OVERLAY ── */}
        <div class="wr" id="warroom" role="dialog" aria-modal="true" aria-label="台股戰情室 TWSE warroom" hidden>
          <div class="wr-bg" aria-hidden="true" />
          <div class="wr-scanlines" aria-hidden="true" />
          <div class="wr-frame">
            <header class="wr-topbar">
              <div class="wr-top-left">
                <span class="wr-dot" aria-hidden="true" />
                <span class="mono wr-title">
                  <span class="zh">台股戰情室</span><span class="en">TWSE warroom</span>
                </span>
                <span class="mono wr-class">
                  <span class="zh">公開情資 // 僅供研究</span>
                  <span class="en">PUBLIC INTEL // RESEARCH ONLY</span>
                </span>
              </div>
              <div class="wr-top-right">
                <span class="mono wr-clock" id="wr-clock">--:--:--</span>
                <button class="desk-snd mono" type="button" id="desk-sound" aria-label="sound">SOUND ON</button>
                <button class="wr-x mono" type="button" data-desk-close aria-label="close">✕</button>
              </div>
            </header>

            <div class="wr-main">
              {/* LEFT — radar console */}
              <section class="wr-console" aria-label="radar console">
                <div class="wr-scope-wrap">
                  <canvas id="wr-radar" aria-label="PPI radar scope" />
                  <div class="wr-scope-tag mono">AN/TAIEX-26 · PPI SCOPE · 加權指數波段</div>
                </div>
                <div class="wr-readouts mono">
                  <div class="wr-ro"><span class="wr-ro-k">BRG</span><span class="wr-ro-v" id="wr-brg">000.0°</span></div>
                  <div class="wr-ro"><span class="wr-ro-k">SWEEP</span><span class="wr-ro-v" id="wr-swp">9.0s</span></div>
                  <div class="wr-ro"><span class="wr-ro-k">CONTACTS</span><span class="wr-ro-v" id="wr-contacts">—</span></div>
                  <div class="wr-ro"><span class="wr-ro-k">MODE</span><span class="wr-ro-v" id="wr-mode">STANDBY</span></div>
                </div>
                <button class="wr-scan mono" id="wr-scan" type="button">
                  <span class="zh">▶ 啟動掃描 INITIATE SWEEP</span>
                  <span class="en">▶ INITIATE SWEEP</span>
                </button>
              </section>

              {/* RIGHT — intel brief */}
              <aside class="wr-brief" aria-label="intel brief">
                <div class="wr-brief-head mono">
                  <span><span class="zh">情資簡報</span><span class="en">INTEL BRIEF</span></span>
                  <span class="wr-brief-id">№ 2026-08 · TAIEX</span>
                </div>

                <div class="wr-standby" id="wr-standby">
                  <p class="mono wr-standby-big">— STANDBY —</p>
                  <p class="wr-standby-sub">
                    <span class="zh">雷達待命。按下「啟動掃描」，讀取今日燈號與最新指令。</span>
                    <span class="en">Scope on standby. Hit INITIATE SWEEP to read today's signal and standing order.</span>
                  </p>
                </div>

                <ol class="wr-log mono" id="wr-log" hidden />

                {/* verdict — id kept as desk-result so quote/provenance plumbing stays intact */}
                <div class="wr-verdict" id="desk-result" hidden>
                  <div class="wr-threat mono" id="wr-threat" data-level="high">
                    <span class="wr-threat-k">THREAT LEVEL</span>
                    <span class="wr-threat-v" id="wr-threat-v">
                      <span class="zh">高 · 紅燈已撤退</span><span class="en">HIGH · red exit done</span>
                    </span>
                  </div>
                  <p class="wr-order-sub mono">
                    <span class="zh">當前指令 CURRENT ORDER</span><span class="en">CURRENT ORDER</span>
                  </p>
                  <p class="wr-order">
                    <span class="zh">空手待命</span><span class="en">STAND BY IN CASH</span>
                  </p>
                  <p class="wr-order-detail">
                    <span class="zh">07-06 軟紅減碼，07-08 全數撤退。空手觀望——等綠燈回防訊號，再進場。</span>
                    <span class="en">Soft red trimmed on 07-06, full retreat to cash on 07-08. Standing by — next green re-entry signal brings us back in.</span>
                  </p>

                  {/* re-entry pre-flight — five gates, exact values vs thresholds */}
                  <div class="wr-gates mono" id="wr-gates">
                    <div class="wr-gates-head">
                      <span class="wr-gates-title">
                        <span class="zh">回防進度 · 五道閘門</span><span class="en">RE-ENTRY PRE-FLIGHT · 5 GATES</span>
                      </span>
                      <span class="wr-gates-status" data-state="waiting">
                        <span class="zh">2/5 就位 · 尚未達到回防條件</span><span class="en">2/5 IN PLACE · RE-ENTRY NOT MET</span>
                      </span>
                    </div>

                    <div class="wr-gate ok">
                      <span class="wr-gate-name"><span class="zh">空手天數 ≥ 3 天</span><span class="en">Cash days ≥ 3</span></span>
                      <span class="wr-gate-track"><i class="wr-gate-zone" style="left:15%;width:85%" /><i class="wr-gate-tick" style="left:15%" /><i class="wr-gate-marker" style="left:100%" /></span>
                      <span class="wr-gate-val">20 <span class="zh">天</span><span class="en">sessions</span> <b class="wr-gate-pill ok">✓ <span class="zh">就位</span><span class="en">MET</span></b></span>
                    </div>

                    <div class="wr-gate ok">
                      <span class="wr-gate-name"><span class="zh">SOX 單日 &gt; −2%</span><span class="en">SOX 1d &gt; −2%</span></span>
                      <span class="wr-gate-track"><i class="wr-gate-zone" style="left:33.3%;width:66.7%" /><i class="wr-gate-tick" style="left:33.3%" /><i class="wr-gate-marker" style="left:38.3%" /></span>
                      <span class="wr-gate-val">−1.4% <b class="wr-gate-pill ok">✓ <span class="zh">就位</span><span class="en">MET</span></b></span>
                    </div>

                    <div class="wr-gate no">
                      <span class="wr-gate-name"><span class="zh">今日收綠 ≥ +0.8%</span><span class="en">Green day ≥ +0.8%</span></span>
                      <span class="wr-gate-track"><i class="wr-gate-zone" style="left:63.3%;width:36.7%" /><i class="wr-gate-tick" style="left:63.3%" /><i class="wr-gate-marker" style="left:42%" /></span>
                      <span class="wr-gate-val">−0.5% <b class="wr-gate-pill no">✗ <span class="zh">未達</span><span class="en">NOT MET</span></b></span>
                    </div>

                    <div class="wr-gate no">
                      <span class="wr-gate-name"><span class="zh">五日漲跌 ≤ −3.5%</span><span class="en">5-day return ≤ −3.5%</span></span>
                      <span class="wr-gate-track"><i class="wr-gate-zone" style="left:0;width:13.9%" /><i class="wr-gate-tick" style="left:13.9%" /><i class="wr-gate-marker" style="left:95.4%" /></span>
                      <span class="wr-gate-val">+11.2% <b class="wr-gate-pill no">✗ <span class="zh">未達</span><span class="en">NOT MET</span></b></span>
                    </div>

                    <div class="wr-gate no">
                      <span class="wr-gate-name"><span class="zh">20 日區間位置 ≤ 40%</span><span class="en">20d range position ≤ 40%</span></span>
                      <span class="wr-gate-track"><i class="wr-gate-zone" style="left:0;width:40%" /><i class="wr-gate-tick" style="left:40%" /><i class="wr-gate-marker" style="left:78.3%" /></span>
                      <span class="wr-gate-val">78% <b class="wr-gate-pill no">✗ <span class="zh">未達</span><span class="en">NOT MET</span></b></span>
                    </div>

                    <p class="wr-gates-note">
                      <span class="zh">數據截至 2026-08-06 收盤；系統於每次收盤後重算。五道全綠 → 試單 0.4 倉；其後 7 日內回測不破低 → 補滿。另有「評分降溫」路徑：未再破低且威脅評分降至 46 以下，可不經回測直接回場。</span>
                      <span class="en">Data as of 2026-08-06 close; recomputed after every close. All five gates green → 0.4 probe position; no new low within 7 sessions → full size. A separate score-cooldown path re-enters without a retest once threat score falls to 46 or below.</span>
                    </p>
                  </div>

                  {/* live quote strip — filled by JS from /api/market-now */}
                  <div class="desk-live wr-live" id="desk-live" data-state="loading">
                    <div class="dl-row">
                      <span class="dl-label mono"><span class="zh">大盤即時</span><span class="en">TAIEX live</span></span>
                      <span class="dl-price mono" id="dl-price">—</span>
                      <span class="dl-chg mono" id="dl-chg" />
                    </div>
                    <div class="dl-meta mono" id="dl-meta">
                      <span class="zh">連線交易所中…</span><span class="en">Contacting exchange…</span>
                    </div>
                  </div>

                  {/* intel trail — why this order, with dates */}
                  <ul class="wr-intel">
                    <li>
                      <span class="mono wr-intel-tag tag-red">2026-06-05</span>
                      <span class="wr-intel-txt">
                        <span class="zh">紅燈出場（TAIEX 45,071）→ 5 日最低 −4.3%，成功規避</span>
                        <span class="en">Red exit (TAIEX 45,071) → next 5d low −4.3%, dodged</span>
                      </span>
                    </li>
                    <li>
                      <span class="mono wr-intel-tag tag-red">2026-07-08</span>
                      <span class="wr-intel-txt">
                        <span class="zh">軟紅兩日不轉強 → 全數撤退空手；只抱其後最深 −11.9%，成功規避</span>
                        <span class="en">Soft red stayed weak 2 sessions → full retreat to cash; B&amp;H fell up to −11.9% since, dodged</span>
                      </span>
                    </li>
                    <li>
                      <span class="mono wr-intel-tag tag-amber">NOW</span>
                      <span class="wr-intel-txt">
                        <span class="zh">空手觀望中 → 等底部綠燈（反彈 +0.8% 且接近波段低點）→ 指令：待命</span>
                        <span class="en">In cash, scope sweeping → awaiting bottom green (+0.8% bounce near swing low) → order: STAND BY</span>
                      </span>
                    </li>
                  </ul>

                  {/* provenance stamps */}
                  <div class="desk-stamps mono">
                    <div class="ds-row">
                      <span class="ds-k"><span class="zh">訊號依據</span><span class="en">Signal basis</span></span>
                      <span class="ds-v" id="ds-policy">active-policy.json · hi1000_ft4 · 2026-08-02 UTC</span>
                    </div>
                    <div class="ds-row">
                      <span class="ds-k"><span class="zh">行情時間</span><span class="en">Quote as of</span></span>
                      <span class="ds-v" id="ds-quote">—</span>
                    </div>
                    <div class="ds-row">
                      <span class="ds-k"><span class="zh">本次讀取</span><span class="en">This read</span></span>
                      <span class="ds-v" id="ds-read">—</span>
                    </div>
                  </div>
                  <p class="desk-stamp mono">
                    <span class="zh">盤中讀數為參考值：正式燈號以收盤計算、隔天開盤執行。</span>
                    <span class="en">Intraday readings are reference-only: official signals computed at close, executed next open.</span>
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </div>

        <script src="/static/landing.js" defer />
        <script src="/static/radar-core.js" defer />
        <script src="/static/warroom.js" defer />
      </body>
    </html>,
  )
})

// In-browser pixel test rig — open /__test__ in a real browser.
// Draws a deterministic radar frame via RadarCore and asserts on actual pixels.
app.get('/__test__', (c) => {
  return c.html(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>warroom pixel tests</title></head>' +
    '<body style="background:#000;color:#39ff6a;font-family:monospace">' +
    '<canvas id="t" width="160" height="160"></canvas>' +
    '<pre id="out">RUNNING</pre>' +
    '<script src="/static/radar-core.js"></' + 'script>' +
    '<script>(function(){' +
    'var R=window.RadarCore,out=[],ok=true;' +
    'function t(n,c){out.push({name:n,pass:!!c});if(!c)ok=false;}' +
    'try{' +
    'var cv=document.getElementById("t"),g=cv.getContext("2d",{willReadFrequently:true});' +
    'g.fillStyle="#000";g.fillRect(0,0,160,160);' +
    'var cx=80,cy=80,r=70;' +
    'var tip=R.polarToCartesian(cx,cy,r,90);' +
    'g.strokeStyle="#39ff6a";g.lineWidth=2;' +
    'g.beginPath();g.moveTo(cx,cy);g.lineTo(tip.x,tip.y);g.stroke();' +
    'g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.stroke();' +
    'function px(x,y){var d=g.getImageData(Math.round(x),Math.round(y),1,1).data;return{r:d[0],g:d[1],b:d[2]};}' +
    'var mid=R.polarToCartesian(cx,cy,r*0.5,90),pm=px(mid.x,mid.y);' +
    'var ring=px(cx,cy-r),corner=px(4,4),ctr=px(cx,cy);' +
    't("RadarCore loaded",!!R&&typeof R.sweepAngle==="function");' +
    't("90deg bearing renders due east",Math.abs(tip.x-(cx+r))<0.6&&Math.abs(tip.y-cy)<0.6);' +
    't("beam origin painted at center",ctr.g>40);' +
    't("sweep ray visible at mid-radius (green dominant)",pm.g>60&&pm.g>pm.r&&pm.g>pm.b);' +
    't("range ring visible at 12 oclock",ring.g>60&&ring.g>ring.r);' +
    't("corner pixel stays dark",corner.g<25&&corner.r<25&&corner.b<25);' +
    't("blipIntensity zero ahead of sweep",R.blipIntensity(180,90,28)===0);' +
    't("blipIntensity hot just behind sweep",R.blipIntensity(88,90,28)>0.85);' +
    't("phosphor decay is monotonic",R.phosphorDecay(10,30)>R.phosphorDecay(20,30));' +
    '}catch(e){ok=false;out.push({name:"exception: "+e.message,pass:false});}' +
    'var payload={suite:"warroom-pixel",pass:ok,checks:out};' +
    'document.getElementById("out").textContent=JSON.stringify(payload,null,2);' +
    'console.log("[WR-TEST]"+JSON.stringify(payload));' +
    'document.title=(ok?"PASS":"FAIL")+" warroom pixel tests";' +
    '})();</' + 'script></body></html>',
  )
})

export default app
