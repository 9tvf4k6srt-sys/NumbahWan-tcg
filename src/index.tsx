import { Hono } from 'hono'

const app = new Hono()

// ─────────────────────────────────────────────────────────────
// 訊號燈 XunDeng — Signal Lab landing page
// Identity: scientific signal desk with wit. Honesty is the brand.
// ─────────────────────────────────────────────────────────────

const Head = () => (
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>訊號燈 XunDeng — 台股進出燈號 | TAIEX signal lights</title>
    <meta
      name="description"
      content="紅燈賣、綠燈買，隔天開盤執行。Walk-forward 樣本外 +16.8%，最大回落 −12% vs 只抱 −29%。誠實的台股波段燈號。"
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

// silence browser /favicon.ico requests — serve the inline traffic-light SVG
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
      headers: { 'user-agent': 'xundeng-signal-desk/1.0', accept: 'application/json' },
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
              <span class="zh">訊號燈</span><span class="en">XunDeng</span>
            </span>
            <span class="brand-sub mono">TAIEX WAVE DESK</span>
          </a>
          <nav class="nav-links">
            <a href="#lights"><span class="zh">燈號</span><span class="en">Lights</span></a>
            <a href="#proof"><span class="zh">成績</span><span class="en">Proof</span></a>
            <a href="#method"><span class="zh">方法</span><span class="en">Method</span></a>
          </nav>
          <div class="nav-actions">
            <button id="lang-toggle" class="lang-toggle mono" type="button" aria-label="switch language">EN</button>
            <button class="btn btn-primary btn-nav" type="button" data-desk-open>
              <span class="zh">進入戰情室</span><span class="en">Enter war room</span>
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
                  <span class="zh">廢話不多說。</span><span class="en">No fortune-telling.</span>
                </span>
              </h1>
              <p class="hero-sub reveal d4">
                <span class="zh">
                  別人給你水晶球，我們給你紅綠燈。隔天開盤照著做，
                  崩盤前先下車、低點附近再上車——成績單全部貼在下面，輸贏都誠實。
                </span>
                <span class="en">
                  Others sell crystal balls. We give you a traffic light. Act at next open,
                  step off before corrections, re-enter near lows — the full report card is below, wins and misses alike.
                </span>
              </p>
              <div class="hero-cta reveal d5">
                <button class="btn btn-primary btn-lg" type="button" data-desk-open>
                  <span class="zh">進入台股戰情室</span><span class="en">Enter the war room</span>
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
                    <span class="lg lg-st"><i />XunDeng <b id="legend-st">+895%</b></span>
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
                    <em>WALK-FORWARD OOS +16.8%</em><i>◆</i>
                    <em class="m-a">MAX DD −12% vs −29%</em><i>◆</i>
                    <em>NOT A CRYSTAL BALL</em><i>◆</i>
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ── PAIN / WIT ── */}
          <section class="section pain" id="pain">
            <div class="wrap">
              <p class="kicker mono reveal"><span class="zh">先說個笑話</span><span class="en">A joke first</span></p>
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
                  <p><span class="zh">2024 年只抱者的最大回落。抱得很緊，跌得很深。</span>
                     <span class="en">Max drawdown for buy-and-holders in 2024. Held tight, fell hard.</span></p>
                </div>
                <div class="pain-card reveal d3">
                  <span class="pain-num mono">−32%</span>
                  <p><span class="zh">2019 至今只抱的最大回落。時間是你的朋友，但波段不是。</span>
                     <span class="en">Max drawdown for buy &amp; hold since 2019. Time is your friend; waves are not.</span></p>
                </div>
                <div class="pain-card reveal d4">
                  <span class="pain-num mono accent-g">−12%</span>
                  <p><span class="zh">同一期間訊號燈策略的最大回落。躲過的跌，就是賺到的。</span>
                     <span class="en">Max drawdown for the signal strategy over the same period. Dodged drops are earned returns.</span></p>
                </div>
              </div>
            </div>
          </section>

          {/* ── LIGHTS ── */}
          <section class="section lights" id="lights">
            <div class="wrap">
              <p class="kicker mono reveal"><span class="zh">整個產品就五個字</span><span class="en">The whole product in five words</span></p>
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
              <p class="kicker mono reveal"><span class="zh">誠實成績單</span><span class="en">The honest report card</span></p>
              <h2 class="h2 reveal d1">
                <span class="zh">贏要貼，輸也要貼</span>
                <span class="en">Wins posted. Losses too.</span>
              </h2>
              <p class="sub reveal d2">
                <span class="zh">規則只用「樣本外」walk-forward 挑出來——先考試，後翻書是作弊，我們不作弊。</span>
                <span class="en">Rules are selected on out-of-sample walk-forward only. Peeking at the test set is cheating; we don't cheat.</span>
              </p>

              {/* big stat row */}
              <div class="stat-row reveal d3">
                <div class="stat">
                  <span class="stat-num mono" data-count="16.8" data-suffix="%">0%</span>
                  <span class="stat-label"><span class="zh">樣本外平均超額（出廠門檻）</span><span class="en">Mean out-of-sample excess (ship gate)</span></span>
                </div>
                <div class="stat">
                  <span class="stat-num mono" data-count="78" data-prefix="+" data-suffix="%">0</span>
                  <span class="stat-label"><span class="zh">2023 後超額（+281% vs +203%）</span><span class="en">Post-2023 excess (+281% vs +203%)</span></span>
                </div>
                <div class="stat">
                  <span class="stat-num mono" data-count="544" data-prefix="+" data-suffix="%">0</span>
                  <span class="stat-label"><span class="zh">2019 至今超額（+895% vs +351%）</span><span class="en">Since-2019 excess (+895% vs +351%)</span></span>
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
                  <div class="fold"><span class="fold-val mono">+25.6</span><div class="fold-bar"><i style="--h:81%" /></div><span class="fold-yr mono">2022</span></div>
                  <div class="fold"><span class="fold-val mono">0.0</span><div class="fold-bar"><i class="flat" style="--h:3%" /></div><span class="fold-yr mono">2023</span></div>
                  <div class="fold"><span class="fold-val mono">+10.1</span><div class="fold-bar"><i style="--h:32%" /></div><span class="fold-yr mono">2024</span></div>
                  <div class="fold"><span class="fold-val mono">+31.5</span><div class="fold-bar"><i style="--h:100%" /></div><span class="fold-yr mono">2025+</span></div>
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
                    <span class="tl-out"><span class="zh">之後 10 日 </span><span class="en">Next 10d </span><b class="neg">−6.2%</b> <span class="zh">· 躲過</span><span class="en">· dodged</span></span>
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
                </ol>
              </div>
            </div>
          </section>

          {/* ── METHOD ── */}
          <section class="section method" id="method">
            <div class="wrap">
              <p class="kicker mono reveal"><span class="zh">為什麼可以信</span><span class="en">Why it's trustworthy</span></p>
              <h2 class="h2 reveal d1">
                <span class="zh">不神準，但誠實</span>
                <span class="en">Not magic. Just honest.</span>
              </h2>
              <div class="method-grid">
                <article class="m-card reveal d2">
                  <span class="m-idx mono">01</span>
                  <h3><span class="zh">Walk-forward 樣本外</span><span class="en">Walk-forward OOS</span></h3>
                  <p><span class="zh">規則只用過去資料挑，在沒看過的年份考試。四個考區全過才准出廠，過不了就繼續關在實驗室。</span>
                     <span class="en">Rules are picked on the past and tested on unseen years. All four folds must pass before shipping; failures stay in the lab.</span></p>
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
                  <p><span class="zh">每月把最新行情記進 live-paper 日誌，連續兩輪改進 &lt;1% 就宣布高原期，不硬凹。</span>
                     <span class="en">Each month logs fresh live-paper results; two improvement rounds under 1% and we call a plateau. No forcing it.</span></p>
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
                <span class="zh">訊號燈 XunDeng</span><span class="en">XunDeng</span>
              </div>
              <p class="footer-disclaimer">
                <span class="zh">
                  研究與教育工具，不是投資建議。歷史績效不代表未來。你的部位，你的風險——
                  賺了不用分我們，賠了……嗯，這就是為什麼有紅燈。
                </span>
                <span class="en">
                  Research &amp; education tool — not investment advice. Past performance doesn't guarantee the future.
                  Your positions, your risk. Profits are yours to keep; losses… well, that's what the red light is for.
                </span>
              </p>
              <p class="footer-meta mono">
                TAIEX WAVE DESK · WALK-FORWARD VERIFIED · <span id="year">2026</span>
              </p>
            </div>
          </footer>
        </main>

        {/* ── 台股戰情室 TWSE WAR ROOM OVERLAY ── */}
        <div class="wr" id="warroom" role="dialog" aria-modal="true" aria-label="台股戰情室 TWSE war room" hidden>
          <div class="wr-bg" aria-hidden="true" />
          <div class="wr-scanlines" aria-hidden="true" />
          <div class="wr-frame">
            <header class="wr-topbar">
              <div class="wr-top-left">
                <span class="wr-dot" aria-hidden="true" />
                <span class="mono wr-title">
                  <span class="zh">台股戰情室</span><span class="en">TWSE WAR ROOM</span>
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
                  <div class="wr-threat mono" id="wr-threat" data-level="low">
                    <span class="wr-threat-k">THREAT LEVEL</span>
                    <span class="wr-threat-v" id="wr-threat-v">
                      <span class="zh">低 · 無新紅燈</span><span class="en">LOW · no new red</span>
                    </span>
                  </div>
                  <p class="wr-order-sub mono">
                    <span class="zh">當前指令 CURRENT ORDER</span><span class="en">CURRENT ORDER</span>
                  </p>
                  <p class="wr-order">
                    <span class="zh">維持持倉</span><span class="en">HOLD POSITION</span>
                  </p>
                  <p class="wr-order-detail">
                    <span class="zh">部位做多中。雷達未偵測到新紅燈——原地不動，就是現在的戰術。</span>
                    <span class="en">Position LONG. No new red contact on scope — holding position is the maneuver.</span>
                  </p>

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
                      <span class="mono wr-intel-tag tag-amber">15D CAP</span>
                      <span class="wr-intel-txt">
                        <span class="zh">空手滿 15 交易日上限 → 六月底依規則強制回補</span>
                        <span class="en">15-trading-day cash cap hit → mandatory re-entry ~late June</span>
                      </span>
                    </li>
                    <li>
                      <span class="mono wr-intel-tag tag-green">NOW</span>
                      <span class="wr-intel-txt">
                        <span class="zh">無新紅燈 → 部位持續做多 → 指令：維持</span>
                        <span class="en">No new red → still long → order: HOLD</span>
                      </span>
                    </li>
                  </ul>

                  {/* provenance stamps */}
                  <div class="desk-stamps mono">
                    <div class="ds-row">
                      <span class="ds-k"><span class="zh">訊號依據</span><span class="en">Signal basis</span></span>
                      <span class="ds-v" id="ds-policy">trade-mode.json · 2026-08-01 16:15 UTC</span>
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
