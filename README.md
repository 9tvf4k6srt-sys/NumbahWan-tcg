# 台股戰情室 TWSE warroom

## Project Overview
- **Name**: 台股戰情室 TWSE warroom — TAIEX signal command
- **Goal**: Honest, intel-driven TAIEX wave-trading signal warroom: red = retreat next open, green = re-enter next open, with the full battle record (wins and misses) on the page.
- **Features**:
  - Award-tier bilingual (zh/en) landing page: hero, equity curve, 5-light signal board, walk-forward proof, method, CTA
  - **台股戰情室 TWSE warroom** — full-screen military radar console overlay: PPI scope with phosphor-persistence physics, HUD readouts, military scan sequence, classified-style intel brief verdict
  - Live TAIEX quote via TWSE mis API with session detection (pre-open/trading/closed/weekend) and full timestamp provenance on every answer
  - WebAudio sound design: sonar sweep ping, radio static, target lock-on chirp (synthesized, no audio files, iOS-gesture-safe)
  - Rigorous test suite: radar-math unit tests, API contract tests, in-browser pixel tests, and full E2E click-process tests (desktop + mobile)

## URLs
- **Sandbox preview**: served locally on `:3000` (PM2 app `webapp`)
- **Deploy status**: not deployed (previous hosted-deploy action was rejected by user)
- **Key routes**:
  - `GET /` — landing page + war room overlay
  - `GET /api/market-now` — live TAIEX quote `{ ok, source, fetchedAtUtc, fetchedAtTaipei, session, quote }`
  - `GET /__test__` — in-browser pixel test rig (renders radar frame, asserts canvas pixels, prints `[WR-TEST]` JSON)
  - Static: `/static/landing.js`, `/static/radar-core.js`, `/static/warroom.js`, `/static/landing.css`, `/static/img/warroom-bg.jpg`

## Data Architecture
- **Signal basis**: `trade-mode.json` champion policy (short_term, maxCashDays 15, holdMinDays 3, updatedAt 2026-08-01T16:15:00Z) — shown as provenance stamp on every verdict
- **Signal events** (radar contacts): 7 post-2023 champion events from `champion-signal-dates.json`, latest = 2026-06-05 EXIT_FULL (TAIEX 45,071); current order = HOLD POSITION (long since mandatory re-entry ~late June 2026)
- **Live quotes**: TWSE mis API (`mis.twse.com.tw/stock/api/getStockInfo.jsp`), 25s edge cache, weekend/stale guards (`isRealtime=false` off-session)
- **Storage**: none (stateless); sound/language prefs in localStorage (`xd-sound`, `xd-lang`)

## War Room Design
- **Radar**: canvas PPI scope — range rings, bearing ticks (0°=north), phosphor sweep trail (26 fading wedges), contact blips that flash as the beam passes and decay over 300°, idle sweep 9s / combat sweep 1.6s
- **Pure math core**: `radar-core.js` (polarToCartesian, sweepAngle, cwDelta, blipIntensity, phosphorDecay, trailAlpha, contactsFromEvents) — shared by browser, `/__test__`, and node unit tests
- **Verdict**: intel brief with THREAT LEVEL, CURRENT ORDER (維持持倉 / HOLD POSITION), live quote strip, 3-item intel trail, provenance stamps
- **Art**: AI-generated photorealistic 1980s radar-ops-room backdrop, passed automated realism gate (analyze_media_content, first candidate rejected for "AI smoothness", regenerated with film-grain prompt → accepted)

## Tests
```bash
npm test          # all suites (requires dev server on :3000 for api/e2e)
npm run test:unit # 42 radar-math unit tests (node)
npm run test:api  # 16 API contract + markup tests (curl + node)
npm run test:e2e  # 24 E2E click-process tests (playwright, desktop + mobile)
```
Latest: **82/82 green**. E2E pixel assertions verify the scope from compositor screenshots (headless SwiftShader `getImageData` readback is nondeterministic — documented in `scripts/test-e2e.cjs`).

## Deployment
- **Platform**: Cloudflare Pages (Hono + TypeScript + Vite + Wrangler)
- **Status**: ❌ Not deployed — `gsk hosted deploy` action was user-rejected; resubmit only on explicit user request
- **Dev**: `npm run build && pm2 start ecosystem.config.cjs` (wrangler pages dev dist, port 3000)
- **Last Updated**: 2026-08-02
