#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// SMOKE TEST v2 — Pages + API + Asset Integrity
// Catches: broken pages, missing images, wrong content-types
// Usage: node tests/smoke-test.cjs [--port=8788] [--verbose]
// ═══════════════════════════════════════════════════════════════

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || process.env.TEST_PORT || '8788');
const VERBOSE = process.argv.includes('--verbose');
const BASE = `http://localhost:${PORT}`;

// ── Find all HTML pages ──
function findPages(dir, prefix = '') {
  const pages = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.html')) {
      const route = prefix + entry.name.replace('.html', '');
      pages.push(route === 'index' ? '/' : `/${route}`);
    } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'static' && entry.name !== 'images' && entry.name !== 'data') {
      pages.push(...findPages(path.join(dir, entry.name), prefix + entry.name + '/'));
    }
  }
  return pages;
}

// ── HTTP helpers ──
function httpGet(url, opts = {}) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ status: 0, headers: {}, body: '', error: 'TIMEOUT' }), opts.timeout || 5000);
    http.get(url, (res) => {
      let body = '';
      if (opts.headOnly) {
        clearTimeout(timeout);
        resolve({ status: res.statusCode, headers: res.headers, body: '' });
        res.resume();
        return;
      }
      res.on('data', d => body += d);
      res.on('end', () => {
        clearTimeout(timeout);
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      resolve({ status: 0, headers: {}, body: '', error: err.message });
    });
  });
}

// Follow one redirect
async function httpGetFollow(url) {
  const res = await httpGet(url);
  if ((res.status === 301 || res.status === 302) && res.headers.location) {
    const loc = res.headers.location.startsWith('http') ? res.headers.location : `${BASE}${res.headers.location}`;
    return httpGet(loc);
  }
  return res;
}

// ═══════════════════════════════════════════
// PHASE 1: Page checks (existing)
// ═══════════════════════════════════════════
function checkPage(urlPath) {
  return httpGetFollow(`${BASE}${urlPath}`).then(res => {
    const body = res.body;
    const checks = {
      status: res.status,
      hasTitle: /<title[^>]*>/.test(body),
      hasViewport: /viewport/.test(body),
      hasPageId: /data-page-id/.test(body),
      hasBody: /<body/.test(body),
      size: body.length,
      noError: !/<pre>Error/.test(body) && !/<h1>500/.test(body),
    };
    const pass = checks.status === 200 && checks.hasBody && checks.noError;
    return { path: urlPath, ...checks, pass, error: res.error };
  });
}

// ═══════════════════════════════════════════
// PHASE 2: API contract checks
// ═══════════════════════════════════════════
async function checkAPIs() {
  const results = [];

  // Market listings — must return JSON with valid image paths
  const listingsRes = await httpGet(`${BASE}/api/market/listings`);
  if (listingsRes.status === 200) {
    try {
      const data = JSON.parse(listingsRes.body);
      results.push({ path: '/api/market/listings', pass: data.success === true, detail: `${data.count} listings` });

      // Check every listing image resolves to image/* content-type
      for (const listing of (data.listings || [])) {
        const img = listing.card?.img;
        if (!img) continue;
        const imgUrl = `${BASE}/static/images/cards/${img}`;
        const imgRes = await httpGet(imgUrl, { headOnly: true });
        const ct = imgRes.headers['content-type'] || '';
        const isImage = ct.startsWith('image/');
        results.push({
          path: `/static/images/cards/${img}`,
          pass: isImage && imgRes.status === 200,
          detail: isImage ? ct : `WRONG: ${ct || 'status ' + imgRes.status}`,
          error: !isImage ? `expected image/*, got ${ct || 'status ' + imgRes.status}` : undefined,
        });
      }
    } catch (e) {
      results.push({ path: '/api/market/listings', pass: false, error: 'Invalid JSON: ' + e.message });
    }
  } else {
    results.push({ path: '/api/market/listings', pass: false, error: `HTTP ${listingsRes.status}` });
  }

  // Card database — must return JSON
  const cardsRes = await httpGet(`${BASE}/static/data/cards-v2.json`, { headOnly: true });
  const cardsCt = cardsRes.headers['content-type'] || '';
  results.push({
    path: '/static/data/cards-v2.json',
    pass: cardsRes.status === 200 && cardsCt.includes('json'),
    detail: cardsCt,
    error: cardsRes.status !== 200 ? `HTTP ${cardsRes.status}` : (!cardsCt.includes('json') ? `content-type: ${cardsCt}` : undefined),
  });

  // Placeholder image — must be a real image
  const phRes = await httpGet(`${BASE}/static/images/cards/placeholder.webp`, { headOnly: true });
  const phCt = phRes.headers['content-type'] || '';
  results.push({
    path: '/static/images/cards/placeholder.webp',
    pass: phRes.status === 200 && phCt.startsWith('image/'),
    detail: phCt,
    error: !phCt.startsWith('image/') ? `expected image/*, got ${phCt}` : undefined,
  });

  return results;
}

// ═══════════════════════════════════════════
// PHASE 3: Image integrity on key pages
// Fetches HTML, extracts <img src=...> from
// card-heavy pages, HEAD-checks each image
// ═══════════════════════════════════════════
async function checkPageImages() {
  const results = [];
  const keyPages = ['/market', '/forge', '/collection', '/battle'];
  const checked = new Set();

  for (const page of keyPages) {
    const res = await httpGetFollow(`${BASE}${page}`);
    if (res.status !== 200) continue;

    // Strip <script> blocks so we only scan static HTML img tags
    const htmlOnly = res.body.replace(/<script[\s\S]*?<\/script>/gi, '');

    // Extract img srcs pointing to card images
    const imgMatches = htmlOnly.match(/src=["']([^"']*\/images\/cards\/[^"']+)["']/g) || [];
    for (const match of imgMatches) {
      const src = match.replace(/src=["']/, '').replace(/["']$/, '');
      // Skip dynamic/unresolved template expressions
      if (src.includes('${') || src.includes('{%')) continue;
      if (checked.has(src)) continue;
      checked.add(src);

      const imgUrl = src.startsWith('http') ? src : `${BASE}${src}`;
      const imgRes = await httpGet(imgUrl, { headOnly: true });
      const ct = imgRes.headers['content-type'] || '';
      const isImage = ct.startsWith('image/');
      if (!isImage) {
        results.push({
          path: `${page} → ${src}`,
          pass: false,
          error: `expected image/*, got ${ct || 'status ' + imgRes.status}`,
        });
      } else {
        results.push({ path: `${page} → ${src}`, pass: true, detail: ct });
      }
    }
  }
  return results;
}

// ═══════════════════════════════════════════
// PHASE 4: Static asset spot-checks
// Verify critical JS/CSS files load correctly
// ═══════════════════════════════════════════
async function checkCriticalAssets() {
  const results = [];
  const assets = [
    { path: '/static/nw-wallet.js', expectType: 'javascript' },
    { path: '/static/nw-cards.js', expectType: 'javascript' },
    { path: '/static/nw-mint.js', expectType: 'javascript' },
    { path: '/static/nw-nav.js', expectType: 'javascript' },
    { path: '/static/favicon.svg', expectType: 'image/' },
  ];

  for (const asset of assets) {
    const res = await httpGet(`${BASE}${asset.path}`, { headOnly: true });
    const ct = res.headers['content-type'] || '';
    const ok = res.status === 200 && ct.includes(asset.expectType);
    if (!ok) {
      results.push({
        path: asset.path,
        pass: false,
        error: res.status !== 200 ? `HTTP ${res.status}` : `expected ${asset.expectType}, got ${ct}`,
      });
    }
  }
  return results;
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════
async function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  const pages = findPages(publicDir).sort();

  console.log(`\n🔥 SMOKE TEST v2 — ${pages.length} pages + API + images @ ${BASE}\n`);

  // Server check
  const serverUp = await httpGet(`${BASE}/`);
  if (serverUp.status === 0) {
    console.error(`❌ Server not reachable at ${BASE}`);
    console.error('   Start with: npm run dev:d1 or npm run dev');
    process.exit(1);
  }

  // ── PHASE 1: Pages ──
  process.stdout.write('  Phase 1: Pages...');
  const BATCH = 10;
  const pageResults = [];
  for (let i = 0; i < pages.length; i += BATCH) {
    const batch = pages.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(checkPage));
    pageResults.push(...batchResults);
    const done = Math.min(i + BATCH, pages.length);
    process.stdout.write(`\r  Phase 1: Pages... ${done}/${pages.length}`);
  }
  const pagePassed = pageResults.filter(r => r.pass).length;
  const pageFailed = pageResults.filter(r => !r.pass);
  console.log(`  ✓ ${pagePassed}/${pages.length}`);

  // ── PHASE 2: APIs & listing images ──
  process.stdout.write('  Phase 2: APIs & listing images...');
  const apiResults = await checkAPIs();
  const apiFailed = apiResults.filter(r => !r.pass);
  console.log(`  ✓ ${apiResults.length - apiFailed.length}/${apiResults.length}`);

  // ── PHASE 3: Page image integrity ──
  process.stdout.write('  Phase 3: Page image integrity...');
  const imgResults = await checkPageImages();
  const imgFailed = imgResults.filter(r => !r.pass);
  console.log(`  ${imgFailed.length === 0 ? '✓' : '✗'} ${imgFailed.length} broken`);

  // ── PHASE 4: Critical assets ──
  process.stdout.write('  Phase 4: Critical assets...');
  const assetResults = await checkCriticalAssets();
  const assetFailed = assetResults.filter(r => !r.pass);
  console.log(`  ${assetFailed.length === 0 ? '✓' : '✗'} ${assetFailed.length} broken`);

  console.log('');

  // ── Collect all failures ──
  const allFailed = [...pageFailed, ...apiFailed, ...imgFailed, ...assetFailed];

  if (allFailed.length > 0) {
    console.log('❌ FAILURES:');
    allFailed.forEach(r => {
      console.log(`  ${r.path} — ${r.error || `HTTP ${r.status}`}`);
    });
    console.log('');
  }

  // Warnings (pages only)
  const noPageId = pageResults.filter(r => r.pass && !r.hasPageId);
  const noViewport = pageResults.filter(r => r.pass && !r.hasViewport);
  const noTitle = pageResults.filter(r => r.pass && !r.hasTitle);

  if (VERBOSE && noPageId.length > 0) {
    console.log(`⚠ Missing data-page-id (${noPageId.length}):`);
    noPageId.forEach(r => console.log(`  ${r.path}`));
    console.log('');
  }

  // ── Summary ──
  const totalChecks = pages.length + apiResults.length + imgResults.length + assetResults.length;
  const totalPassed = totalChecks - allFailed.length;

  console.log('┌───────────────────────────────────────────────┐');
  console.log(`│ SMOKE TEST v2: ${totalPassed}/${totalChecks} passed${' '.repeat(Math.max(0, 28 - String(totalPassed).length - String(totalChecks).length))}│`);
  console.log(`│   Pages:        ${String(pagePassed).padStart(4)}/${String(pages.length).padEnd(4)}                      │`);
  console.log(`│   API/images:   ${String(apiResults.length - apiFailed.length).padStart(4)}/${String(apiResults.length).padEnd(4)}                      │`);
  console.log(`│   Page images:  ${String(imgResults.length - imgFailed.length).padStart(4)}/${String(imgResults.length).padEnd(4)} checked                 │`);
  console.log(`│   Assets:       ${String(assetResults.length - assetFailed.length).padStart(4)}/${String(assetResults.length).padEnd(4)}                      │`);
  console.log(`│   Warnings:     ${String(noPageId.length).padStart(4)} (no page-id)              │`);
  console.log('└───────────────────────────────────────────────┘');

  // JSON report
  const report = {
    version: 2,
    timestamp: new Date().toISOString(),
    total: totalChecks,
    passed: totalPassed,
    failed: allFailed.length,
    phases: {
      pages: { total: pages.length, passed: pagePassed, failed: pageFailed.length },
      api: { total: apiResults.length, passed: apiResults.length - apiFailed.length, failed: apiFailed.length },
      images: { total: imgResults.length, broken: imgFailed.length },
      assets: { total: assetResults.length, broken: assetFailed.length },
    },
    failures: allFailed.map(r => ({ path: r.path, error: r.error || `HTTP ${r.status}` })),
    warnings: { noPageId: noPageId.length, noViewport: noViewport.length, noTitle: noTitle.length },
  };

  const reportPath = path.join(__dirname, '..', '.mycelium', 'smoke-report.json');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    if (VERBOSE) console.log(`\nReport saved: ${reportPath}`);
  } catch { /* ignore */ }

  process.exit(allFailed.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
