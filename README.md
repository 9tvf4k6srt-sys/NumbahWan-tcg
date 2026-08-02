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
- **Signal basis**: `active-policy.json` champion `hi1000_ft4` (walk-forward OOS mean excess **+23.6%**, folds [23.7, 0, 12.2, 58.4], 15bps cost, next-open fills, promoted 2026-08-02) — shown as provenance stamp on every verdict. Verified reproducible via `scripts/ship-hi1000-champ.mts` from the champion handoff package.
- **Signal events** (radar contacts): 9 events — 7 post-2023 from `champion-signal-dates.json` plus the 2026-07 retreat pair: 07-06 soft red (trim to 40%, amber contact) → 07-08 full retreat to CASH; buy & hold fell up to −11.9% since. Current order = **STAND BY IN CASH (空手待命)**, awaiting bottom green re-entry (ret1Min 0.8, ret5Max −3.5, minCashDays 3)
- **Champion card**: post-2023 +334% vs +203% (excess +131%, maxDD −8% vs −29%) · full 2019→ +957% vs +351% (excess +605%, maxDD −13% vs −32%)
- **Live quotes**: TWSE mis API (`mis.twse.com.tw/stock/api/getStockInfo.jsp`), 25s edge cache, weekend/stale guards (`isRealtime=false` off-session)
- **Storage**: none (stateless); sound/language prefs in localStorage (`xd-sound`, `xd-lang`)

## War Room Design
- **Radar**: canvas PPI scope — range rings, bearing ticks (0°=north), phosphor sweep trail (26 fading wedges), contact blips that flash as the beam passes and decay over 300°, idle sweep 9s / combat sweep 1.6s
- **Pure math core**: `radar-core.js` (polarToCartesian, sweepAngle, cwDelta, blipIntensity, phosphorDecay, trailAlpha, contactsFromEvents) — shared by browser, `/__test__`, and node unit tests
- **Verdict**: intel brief with THREAT LEVEL (high · red exit done), CURRENT ORDER (空手待命 / STAND BY IN CASH), live quote strip, 3-item intel trail, provenance stamps
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
- **Platform**: Cloudflare Workers for Platform via `gsk hosted deploy` (Hono + TypeScript + Vite + Wrangler)
- **Production**: https://1b14e018-f344-4c49-9508-f190297ff2ae.vip.gensparksite.com
- **Status**: ✅ Live (deployed 2026-08-02, user-approved)
- **Dev**: `npm run build && pm2 start ecosystem.config.cjs` (wrangler pages dev dist, port 3000)
- **Redeploy**: `gsk hosted deploy` (requires user approval each time)
- **Last Updated**: 2026-08-02
