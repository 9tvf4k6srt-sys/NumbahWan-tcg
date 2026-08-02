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
            <a class="btn btn-primary btn-nav" href="#cta">
              <span class="zh">看今天的燈</span><span class="en">Today's light</span>
            </a>
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
                <a class="btn btn-primary btn-lg" href="#cta">
                  <span class="zh">開啟燈號台</span><span class="en">Open the desk</span>
                  <span class="btn-arrow" aria-hidden="true">→</span>
                </a>
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
              <a class="btn btn-primary btn-xl" href="#top" data-app-link>
                <span class="zh">免費看燈號</span><span class="en">See the light — free</span>
                <span class="btn-arrow" aria-hidden="true">→</span>
              </a>
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

        <script src="/static/landing.js" defer />
      </body>
    </html>,
  )
})

export default app
