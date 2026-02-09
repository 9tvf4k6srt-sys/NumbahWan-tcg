# NW-SENTINEL Upgrade Plan: The Path to 95+

> **Engine**: NW-SENTINEL v2.5.0  
> **Current Score**: 75/100 (B)  
> **Target Score**: 95/100 (A+)  
> **Date**: 2026-02-07  
> **Trend**: 54 (D) -> 67 (C) -> 75 (B) across 10 builds (8 tracked by engine)  

---

## Executive Summary

NW-SENTINEL v2.5 is a build-time, 10-module code health and optimization platform that produces a comprehensive `sentinel-report.json` consumed by 14 API endpoints, CI/CD pipelines, dashboards, and AI agents. This plan outlines the **cost-cutting, future-proof upgrade path** from the current **75 (B)** to a target **95+ (A+)**, organized in 6 phases with concrete actions, effort estimates, and expected score impact.

### Key Achievements So Far

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Composite Score | 54 (D) | 75 (B) | +21 pts |
| Critical Issues | 5 | 0 | -5 |
| Warnings | 73 | 61 | -12 |
| Modules | 6 | 10 | +4 |
| public/ Size | 177 MB | 77 MB | -100 MB (56%) |
| Images Compressed | 0 | 71 | 96.3 MB saved |
| WebP Conversions | 0 | 16 | 2.6 MB saved |
| Lazy-Loaded Images | 86 | 158 | +72 across 24 pages |
| RAG Token Cost | 181,360 tokens | 3,839 tokens | 98% reduction |
| Cost Savings | - | ~$1.78/query | AI token optimization |
| Security Score | 0 (F) | 92 (A) | +92 pts |
| Bundle Size | 411 KB | 405 KB | -6 KB |
| Tests | 149/149 | 149/149 | 100% green |

---

## Current Module Breakdown (v2.5.0 Build #10)

| # | Module | Weight | Score | Grade | Issues | Recovery |
|---|--------|--------|-------|-------|--------|----------|
| 1 | Architecture | 15% | 50 | D | 45 | +8 pts |
| 2 | Assets | 15% | 68 | C | 11 | +5 pts |
| 3 | i18n | 10% | 86 | A- | 7 | +1 pt |
| 4 | Dead Code | 10% | 100 | A+ | 0 | +0 pts |
| 5 | Security | 15% | 92 | A | 1 | +1 pt |
| 6 | Performance | 10% | 70 | B- | 4 | +3 pts |
| 7 | API Surface | 8% | 52 | D | 3 | +4 pts |
| 8 | Dependencies | 7% | 80 | B+ | 2 | +1 pt |
| 9 | Accessibility | 5% | 82 | B+ | 4 | +1 pt |
| 10 | SEO & Meta | 5% | 82 | B+ | 5 | +1 pt |

**Total recoverable points**: ~25 (theoretical max: 100)

### Bottleneck Analysis

The two **D-grade** modules are the biggest drags:

1. **Architecture (50/D, 15% weight)** = 7.5 weighted pts lost
   - 44 bloated static CSS/JS files exceeding 500-line threshold
   - Top offenders: `battle.css` (2,211 lines), `forge.css` (1,506 lines), `arcade.css` (1,082 lines)
   - Complexity warning: `sentinel.ts` at 16/15

2. **API Surface (52/D, 8% weight)** = 3.8 weighted pts lost
   - 186 total endpoints (GET 117, POST 62, PUT 3, DELETE 4)
   - 16 duplicate route patterns across 32 route files
   - Error coverage 88% (need 100%), validation 81% (need 100%)

---

## Phase 1: Complete i18n Coverage (Score Impact: +1 pt)

**Effort**: 2-4 hours | **Priority**: High | **Current**: 86/100 (A-)

### Current i18n State

- 86 HTML pages scanned; 84 have i18n script; 79 have `NW_I18N.register`
- 3,474 total i18n keys; 3,451 translated; 105 hardcoded English strings
- Overall coverage: ~92% (Grade A-)

### Actions

#### 1.1 Fix Remaining 7 Pages
Target pages without full `NW_I18N.register` blocks:

| Page | Status | Hardcoded Strings | Action |
|------|--------|------------------|--------|
| efficiency.html | translated | 12 | Replace hardcoded strings with `data-i18n` |
| arcade.html | translated | 10 | Replace hardcoded strings |
| cafeteria.html | partial | 1 | Add register block + replace strings |
| maintenance.html | partial | 1 | Add register block |
| museum.html | partial | 1 | Add register block |
| achievements.html | partial | 0 | Add register block (keys-only) |
| auction-house.html | partial | 0 | Add register block (keys-only) |

#### 1.2 Eliminate Hardcoded Strings
```bash
# Detect remaining hardcoded strings
node sentinel.cjs --module i18n --json | jq '.modules.i18n.data.pages[] | select(.hardcoded > 0)'

# Auto-fix with i18n engine
node scripts/i18n-auto-fix.cjs
```

#### 1.3 Automate Full i18n Cycle
Build a single command that:
1. Detects untranslated strings in all HTML pages
2. Generates unique `data-i18n` keys per string
3. Injects `data-i18n` attributes into HTML elements
4. Generates `NW_I18N.register` blocks for `en`, `zh`, `th`
5. Re-runs `node sentinel.cjs --module i18n` to verify

**Target**: 100% pages with register blocks, 0 hardcoded strings, coverage 98%+

---

## Phase 2: Frontend & Asset Optimization (Score Impact: +13 pts)

**Effort**: 4-8 hours | **Priority**: High | **Targets**: Assets (68->90), Performance (70->85), Architecture (50->65)

### 2.1 Image Optimization (Assets +5)

**Current state**: 727 WebP images, 6 remaining PNG/JPG, 31 MB in `public/static/images/`

| Action | Files | Savings Est. | Auto-Fix ID |
|--------|-------|-------------|-------------|
| Convert remaining 6 PNG/JPG to WebP | 6 | ~0.5 MB | FIX-WEBP |
| Audit images > 500 KB | ~5 | ~1 MB | FIX-IMG-BATCH |
| Add width/height attributes for CLS | all | 0 (perf) | manual |

```bash
# Convert remaining non-WebP
find public -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" | \
  while read f; do python3 -c "from PIL import Image; Image.open('$f').save('${f%.*}.webp', 'webp', quality=82)"; done

# Update HTML references
find public -name "*.html" -exec sed -i "s/\.png/.webp/g; s/\.jpg/.webp/g" {} +
```

### 2.2 CSS Pruning & Splitting (Architecture +5, Assets +3)

**Top offenders** (exceed 500-line threshold):

| File | Lines | Action |
|------|-------|--------|
| battle.css | 2,211 | Split into battle-core.css + battle-animations.css + battle-ui.css |
| forge.css | 1,506 | Split into forge-core.css + forge-animations.css |
| arcade.css | 1,082 | Split into arcade-core.css + arcade-effects.css |
| nw-card-frames.css | 708 | Purge unused card frame styles |
| nw-battle-unified.css | 689 | Merge with battle-core.css or prune |
| nw-forge-engine.js | 3,216 | Split into forge-engine-core.js + forge-animations.js + forge-effects.js |

**Strategy**:
1. Identify unused CSS rules with a coverage audit (load page, check which rules fire)
2. Split files at logical boundaries (layout, animation, responsive, component)
3. Use `<link rel="stylesheet" media="print" onload="this.media='all'">` for non-critical CSS
4. Ensure each resulting file is < 500 lines

### 2.3 JavaScript Bundling & Code-Splitting (Performance +3)

**Current bundle**: 405 KB (`dist/_worker.js`), threshold 400 KB

| Action | Impact |
|--------|--------|
| Code-split large nw-* engines (lazy load per page) | -50 KB est. |
| Tree-shake unused Hono middleware | -5 KB est. |
| Defer non-critical static JS with `async`/`defer` | Faster FCP |
| Address 471 render-blocking `<script>` tags in `<head>` | Faster LCP |

```bash
# Find render-blocking scripts
grep -rn '<script src=' public/*.html | grep -v 'async\|defer\|type="module"' | wc -l
# => 471 — add defer attribute to all non-critical scripts
```

### 2.4 Cache Headers (Performance +2)

**Current**: Only 2 routes set `Cache-Control` headers.

| Route Pattern | Recommended Header |
|---------------|-------------------|
| `/static/*` (images, CSS, JS) | `public, max-age=31536000, immutable` |
| `/api/*` (dynamic data) | `public, max-age=60, stale-while-revalidate=300` |
| `/api/system/sentinel/*` | `public, max-age=3600` (build-time data) |
| HTML pages | `public, max-age=0, must-revalidate` |

Add ETag support for static assets in the Hono middleware:
```typescript
app.use('/static/*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
});
```

---

## Phase 3: CI/CD & Build Efficiency (Score Impact: +2 pts)

**Effort**: 2-3 hours | **Priority**: Medium

### 3.1 Incremental Builds

| Action | Benefit |
|--------|---------|
| Enable Vite's incremental build mode | Faster rebuilds |
| Cache sentinel-history.json across CI runs | Trend continuity |
| Only re-scan changed files in sentinel | 50%+ faster scans |

### 3.2 Health Gates

Progressively tighten the sentinel CI gate:

| Timeline | Gate Threshold | Flag |
|----------|---------------|------|
| Now | 50 (current) | `--ci` exits code 1 if < 50 |
| Phase 2 complete | 70 | Raise after asset fixes |
| Phase 4 complete | 80 | Raise after architecture fixes |
| Phase 6 complete | 90 | Final production gate |

```bash
# Current CI gate
node sentinel.cjs --ci                    # Fail if < 50
# Regression gate
node sentinel.cjs --ci --no-regress       # Fail if score drops > 5 pts
# Custom threshold
node sentinel.cjs --ci --threshold 80     # Fail if < 80
```

### 3.3 Pre-Merge Checks

Add to CI pipeline (GitHub Actions / Wrangler):
```yaml
# .github/workflows/sentinel.yml
- name: Sentinel Health Gate
  run: |
    node sentinel.cjs --ci --no-regress --threshold 70
    # Upload report as artifact
    cp public/static/data/sentinel-report.json $ARTIFACTS/
```

---

## Phase 4: Extend Sentinel Functionality (Score Impact: +5 pts)

**Effort**: 4-6 hours | **Priority**: Medium

### 4.1 Enhanced Module Capabilities

| Module | Enhancement | Impact |
|--------|------------|--------|
| Architecture | Track cyclomatic complexity per function (not just per file) | More precise scoring |
| Assets | Track per-page total weight with breakdown (HTML + CSS + JS + images) | Actionable budgets |
| i18n | Historical coverage trend per page; detect regression when keys removed | Quality gate |
| Security | Full CSP validation; check for SRI on CDN scripts | +5 security pts |
| Performance | Lighthouse-style budgets per resource type | Enforced limits |
| API Surface | OpenAPI spec generation from route scan | Documentation |
| Accessibility | WCAG 2.1 Level A compliance checklist | Standards tracking |
| SEO | Structured data (JSON-LD) detection; Core Web Vitals proxy | Richer signals |

### 4.2 New Module Candidates (v3.0)

| Module | Purpose | Weight |
|--------|---------|--------|
| Cache & CDN Audit | Verify cache headers, CDN coverage, KV utilization | 5% |
| Error Budget | Track error rates, 5xx responses, failed requests | 5% |
| Cost Tracking | Token usage, bandwidth, compute time per endpoint | 5% |

### 4.3 Richer i18n Endpoint

The existing `GET /api/system/sentinel/i18n` returns coverage summary. Enhance with:

```json
{
  "engine": "nw-sentinel v2.5.0",
  "summary": { "totalPages": 86, "coveragePct": 92, "grade": "A-" },
  "perPage": [
    {
      "page": "forge.html",
      "status": "translated",
      "keys": 138,
      "langs": ["en", "zh", "th"],
      "hardcoded": 7,
      "trend": [
        { "build": 1, "keys": 50, "hardcoded": 25 },
        { "build": 8, "keys": 138, "hardcoded": 7 }
      ]
    }
  ],
  "hardcodedHotspots": [
    { "page": "efficiency.html", "count": 12, "samples": ["...", "..."] }
  ],
  "trend": {
    "coverageHistory": [
      { "build": 1, "coverage": 72 },
      { "build": 10, "coverage": 92 }
    ]
  }
}
```

---

## Phase 5: Observability & Governance (Score Impact: +3 pts)

**Effort**: 3-5 hours | **Priority**: Medium-Low

### 5.1 Dashboards

Build a sentinel dashboard page (`/system-dashboard`) that visualizes:

| Panel | Data Source | Purpose |
|-------|------------|---------|
| Health Score Trend | `GET /api/system/sentinel/trend` | Track score over builds |
| Module Heatmap | `GET /api/system/sentinel/modules` | Identify weak spots |
| Per-Page i18n Status | `GET /api/system/sentinel/i18n` | Translation progress |
| Asset Weight Budget | `GET /api/system/sentinel/module/assets` | Bandwidth monitoring |
| Auto-Fix Queue | `GET /api/system/sentinel/auto-fix` | Actionable items |
| API Surface Map | `GET /api/system/sentinel/api-surface` | Endpoint inventory |

### 5.2 Cost Impact Tracking

| Metric | Current | Target | Savings |
|--------|---------|--------|---------|
| AI Token Cost per Query | ~$1.78 saved | Maintain | RAG compression |
| RAG Cache Tokens | 3,839 (was 181,360) | < 4,000 | 98% reduction |
| Bandwidth (public/) | 77 MB | < 50 MB | Further image/CSS optimization |
| Bundle Size (worker) | 405 KB | < 350 KB | Code-splitting |
| Build Time | 1.9s | < 2.0s | Maintain |

### 5.3 Translation Maintenance Policy

| Policy | Details |
|--------|---------|
| Review Cadence | Weekly automated scan; monthly human review of high-value pages |
| Fallback Behavior | English fallback for missing keys; log warnings for untranslated strings |
| QA Process | Auto-run `node sentinel.cjs --module i18n` in CI; fail if coverage < 90% |
| Key Management | Generate keys with `page.section.element` naming; avoid duplicates |
| New Page Checklist | Must include i18n script + register block for en/zh/th before merge |

---

## Phase 6: Operational Safeguards (Score Impact: +1 pt)

**Effort**: 2-3 hours | **Priority**: Low

### 6.1 Automated Rollback & Feature Flags

| Safeguard | Implementation |
|-----------|---------------|
| Sentinel version flag | `sentinel.cjs --version` reports engine version; API includes in every response |
| Build regression block | `--no-regress` flag prevents score drops > 5 pts |
| Module-level gates | `--module security --threshold 80` for per-module CI gates |
| Feature flags | KV-based flags for new sentinel modules (enable/disable per environment) |

### 6.2 Edge-Case Testing

| Scenario | Test Coverage |
|----------|-------------|
| No active vaults / empty KV | Return graceful 503 with message |
| sentinel-report.json missing | 404 with "Run: node sentinel.cjs" guidance |
| sentinel-history.json missing | Trend shows "baseline" instead of error |
| Corrupt report JSON | Parse error caught; return 500 with diagnostic |
| Zero pages scanned | i18n module returns score 100 (nothing to translate) |
| No route files found | API Surface returns score 100 (no endpoints = no issues) |

### 6.3 Test Coverage Matrix

| Area | Current Tests | Target |
|------|--------------|--------|
| Unit (sentinel.cjs) | 10 assertions | 25+ (per-module validation) |
| API Endpoints | 14 endpoints tested | 14 (100%) |
| Integration (build+test) | 149/149 green | 160+ (add edge cases) |
| Regression | Trend tracker | Automated score comparison |

---

## Implementation Timeline

```
Week 1: Phase 1 (i18n 100%) + Phase 2 Quick Wins
         Expected: 75 -> 82 (B+)

Week 2: Phase 2 Full (CSS/JS split, cache headers)
         Expected: 82 -> 88 (A-)

Week 3: Phase 3 (CI/CD) + Phase 4 (Enhanced Modules)
         Expected: 88 -> 93 (A)

Week 4: Phase 5 (Dashboards) + Phase 6 (Safeguards)
         Expected: 93 -> 95+ (A+)
```

---

## Quick Wins Reference (Immediate Actions)

These can be executed right now for maximum impact with minimal effort:

| # | Action | Time | Score Impact | Command |
|---|--------|------|-------------|---------|
| 1 | Remove unused deps | 1 min | +0.5 | `npm uninstall @tailwindcss/vite autoprefixer postcss tailwindcss` |
| 2 | Add `defer` to scripts | 10 min | +1.0 | `sed -i 's/<script src=/<script defer src=/g' public/*.html` |
| 3 | Add meta descriptions | 15 min | +0.5 | Add `<meta name="description">` to top 20 pages |
| 4 | Add `<main>` landmarks | 10 min | +0.5 | Wrap main content in `<main>` on 71 missing pages |
| 5 | Convert 6 remaining images | 5 min | +0.3 | Run FIX-WEBP auto-fix |
| 6 | Split battle.css (2211 lines) | 30 min | +1.5 | Split into 3 files |
| 7 | Split forge.css (1506 lines) | 20 min | +1.0 | Split into 2 files |
| 8 | Consolidate 16 duplicate routes | 1 hr | +2.0 | Merge `/listings`, `/:id`, `/health` |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Translation quality gaps | Medium | High | Pair auto-fixer with human review for high-value pages; track hardcoded string count |
| Bundle/asset bloat re-emergence | Medium | Medium | CI gate with `--no-regress`; monthly asset audit; performance budgets |
| KV/storage edge-cases | Low | High | Stateless fallbacks; auto-creation paths for vaults; graceful 503 responses |
| CSS split breaks layouts | Medium | High | Visual regression testing; test each page after split; maintain source maps |
| Sentinel false positives | Medium | Low | Whitelist patterns (in-game lore text, CSS class names); tune thresholds |
| CI gate too aggressive | Low | Medium | Progressive threshold increases (50 -> 70 -> 80 -> 90); escape hatch flag |

---

## Success Metrics Dashboard

### Score Targets by Phase

| Phase | Target Score | Grade | Key Metric |
|-------|-------------|-------|------------|
| Current | 75 | B | Baseline |
| After Phase 1 | 76 | B | i18n 98%+ coverage |
| After Phase 2 | 88 | A- | Assets 90+, Architecture 65+ |
| After Phase 3 | 90 | A | CI gate at 80 |
| After Phase 4 | 93 | A | All modules 70+ |
| After Phase 5+6 | 95+ | A+ | Full observability |

### Cost Savings Targets

| Metric | Current | Phase 2 Target | Phase 6 Target |
|--------|---------|---------------|----------------|
| public/ Size | 77 MB | 50 MB | 40 MB |
| Bundle Size | 405 KB | 350 KB | 300 KB |
| AI Token/Query | $1.78 saved | $1.80 saved | $2.00 saved |
| RAG Tokens | 3,839 | < 3,500 | < 3,000 |
| Build Time | 1.9s | < 2.0s | < 1.5s |
| Bandwidth/page | ~3 MB avg | < 2 MB avg | < 1.5 MB avg |

### Monitoring Endpoints

| Endpoint | Purpose | Poll Frequency |
|----------|---------|---------------|
| `GET /api/system/sentinel/quick` | CI/CD gate check | Every build |
| `GET /api/system/sentinel/trend` | Score history | After each build |
| `GET /api/system/sentinel/modules` | Module health | Weekly review |
| `GET /api/system/sentinel/auto-fix` | Fix queue | Before each sprint |
| `GET /api/system/sentinel/i18n` | Translation coverage | Weekly |
| `GET /api/system/sentinel/security` | Security posture | Every build |

---

## Sentinel Architecture Reference

```
Build Time                          Runtime (Edge/Workers)
===========                         ======================

node sentinel.cjs                   GET /api/system/sentinel/*
    |                                   |
    v                                   v
[10 Module Scanners]               [Hono Router - sentinel.ts]
    |                                   |
    v                                   v
sentinel-report.json  ------->    import sentinelReport
sentinel-history.json ------->    import sentinelHistory
    |                                   |
    v                                   v
[Auto-Fix Engine]                  [14 API Endpoints]
[Trend Tracker]                    [Dashboard / AI Agent]
[CI/CD Gate]                       [Cost Monitoring]
```

### File Inventory

| File | Size | Purpose |
|------|------|---------|
| `sentinel.cjs` | 1,576 lines | Build-time scanner (10 modules + trend + auto-fix) |
| `src/routes/sentinel.ts` | 236 lines | Runtime API (14 endpoints) |
| `public/static/data/sentinel-report.json` | 127 KB | Full health report |
| `public/static/data/sentinel-history.json` | 6 KB | Score trend across 10 builds |
| `tests/run-tests.cjs` | 149 test assertions | Full test suite |

### Module Weight Distribution (v2.5)

```
Architecture  ████████████████ 15%
Assets        ████████████████ 15%
Security      ████████████████ 15%
i18n          ████████████     10%
Dead Code     ████████████     10%
Performance   ████████████     10%
API Surface   █████████        8%
Dependencies  ████████         7%
Accessibility ██████           5%
SEO & Meta    ██████           5%
```

---

## Appendix: Auto-Fix Commands Reference

| Fix ID | Category | Type | Command |
|--------|----------|------|---------|
| FIX-WEBP | Image Format | Auto | `find public -name "*.png" -o -name "*.jpg" \| while read f; do cwebp -q 80 "$f" -o "${f%.*}.webp"; done` |
| FIX-I18N | i18n | Auto | `node scripts/i18n-auto-fix.cjs` |
| FIX-DEPS | Dependencies | Auto | `npm uninstall @tailwindcss/vite autoprefixer postcss tailwindcss` |
| FIX-LAZY | Performance | Auto | `find public -name "*.html" -exec sed -i 's/<img /<img loading="lazy" /g' {} +` |
| FIX-SPLIT | Architecture | Manual | Split 10 oversized CSS/JS files by component boundary |
| FIX-ALT | Accessibility | Manual | Add descriptive `alt` text to 8 images missing it |
| FIX-SEO | SEO | Manual | Add `<meta name="description">` and OG tags to 110+ pages |
| FIX-HEADERS | Security | Manual | Add CSP, HSTS, X-Frame-Options, X-Content-Type-Options middleware |

---

*Generated from NW-SENTINEL v2.5.0 Build #10 data. Re-run `node sentinel.cjs` after each phase to track progress.*
