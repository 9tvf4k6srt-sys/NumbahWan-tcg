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
    // Castle world images (20 WebP pixel-art scenes)
    { path: '/world/img/aerial.webp', expectType: 'image/' },
    { path: '/world/img/exterior.webp', expectType: 'image/' },
    { path: '/world/img/gates.webp', expectType: 'image/' },
    { path: '/world/img/courtyard.webp', expectType: 'image/' },
    { path: '/world/img/mountain.webp', expectType: 'image/' },
    { path: '/world/img/market.webp', expectType: 'image/' },
    { path: '/world/img/tavern.webp', expectType: 'image/' },
    { path: '/world/img/barracks.webp', expectType: 'image/' },
    { path: '/world/img/quarters.webp', expectType: 'image/' },
    { path: '/world/img/warroom.webp', expectType: 'image/' },
    { path: '/world/img/forge.webp', expectType: 'image/' },
    { path: '/world/img/officers.webp', expectType: 'image/' },
    { path: '/world/img/library.webp', expectType: 'image/' },
    { path: '/world/img/gmsuite.webp', expectType: 'image/' },
    { path: '/world/img/shrine.webp', expectType: 'image/' },
    { path: '/world/img/observatory.webp', expectType: 'image/' },
    { path: '/world/img/dungeon.webp', expectType: 'image/' },
    { path: '/world/img/maids.webp', expectType: 'image/' },
    { path: '/world/img/afk.webp', expectType: 'image/' },
    { path: '/world/img/drama.webp', expectType: 'image/' },
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
// PHASE 5: Castle world page validation
// Check images referenced in HTML actually serve,
// and that all data-i18n keys have ZH + TH translations
// ═══════════════════════════════════════════
async function checkCastlePage() {
  const results = [];
  
  // 1. Fetch castle page
  const res = await httpGetFollow(`${BASE}/world/castle`);
  if (res.status !== 200) {
    results.push({ path: '/world/castle', pass: false, error: `HTTP ${res.status}` });
    return results;
  }
  
  const html = res.body;
  
  // 2. Check all <img src="/world/img/..."> tags serve correctly
  const imgMatches = html.match(/src=["']([^"']*\/world\/img\/[^"']+)["']/g) || [];
  const checkedImgs = new Set();
  for (const match of imgMatches) {
    const src = match.replace(/src=["']/, '').replace(/["']$/, '');
    if (checkedImgs.has(src)) continue;
    checkedImgs.add(src);
    const imgRes = await httpGet(`${BASE}${src}`, { headOnly: true });
    const ct = imgRes.headers['content-type'] || '';
    const ok = imgRes.status === 200 && ct.startsWith('image/');
    results.push({
      path: `/world/castle → ${src}`,
      pass: ok,
      error: ok ? undefined : `${imgRes.status} ${ct || 'no content-type'}`,
    });
  }
  
  // 3. Check that all data-i18n attributes have matching PAGE_I18N keys
  // Extract all data-i18n key names from HTML
  const i18nKeys = new Set();
  const i18nMatches = html.match(/data-i18n="([^"]+)"/g) || [];
  i18nMatches.forEach(m => {
    i18nKeys.add(m.replace('data-i18n="', '').replace('"', ''));
  });
  
  // Extract PAGE_I18N block
  const pageI18nMatch = html.match(/const PAGE_I18N\s*=\s*\{([\s\S]*?)\n\};/);
  if (!pageI18nMatch) {
    results.push({ path: '/world/castle i18n', pass: false, error: 'PAGE_I18N not found' });
    return results;
  }
  
  // Check for each language
  const i18nBlock = pageI18nMatch[1];
  for (const lang of ['en', 'zh', 'th']) {
    const langBlock = i18nBlock.match(new RegExp(`${lang}:\\s*\\{([\\s\\S]*?)\\}`, 'm'));
    if (!langBlock) {
      results.push({ path: `/world/castle i18n:${lang}`, pass: false, error: `${lang} block missing` });
      continue;
    }
    const langKeys = new Set();
    const keyMatches = langBlock[1].match(/'([^']+)':\s*'/g) || [];
    keyMatches.forEach(m => langKeys.add(m.match(/'([^']+)'/)[1]));
    
    const missing = [...i18nKeys].filter(k => !langKeys.has(k));
    if (missing.length > 0) {
      results.push({
        path: `/world/castle i18n:${lang}`,
        pass: false,
        error: `${missing.length} keys missing: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`,
      });
    } else {
      results.push({ path: `/world/castle i18n:${lang}`, pass: true, detail: `${langKeys.size} keys` });
    }
  }
  
  // 4. Check that ALL visible text elements have data-i18n
  // Strip script blocks to only check actual HTML
  const htmlBody = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  
  // Paragraphs in the body should have data-i18n
  const pWithout = (htmlBody.match(/<p>(?![\s]*<)[^<]{30,}/g) || []).length;
  if (pWithout > 0) {
    results.push({
      path: '/world/castle untranslated-p',
      pass: false,
      error: `${pWithout} <p> tags without data-i18n`,
    });
  } else {
    results.push({ path: '/world/castle untranslated-p', pass: true, detail: 'all paragraphs translated' });
  }
  
  // Detail item spans should have data-i18n
  const spanWithout = (htmlBody.match(/<strong[^>]*data-i18n[^>]*>[^<]*<\/strong><span>(?![\s]*data-i18n)/g) || []).length;
  if (spanWithout > 0) {
    results.push({
      path: '/world/castle untranslated-spans',
      pass: false,
      error: `${spanWithout} detail spans without data-i18n`,
    });
  } else {
    results.push({ path: '/world/castle untranslated-spans', pass: true, detail: 'all spans translated' });
  }
  
  // Summary
  results.push({
    path: '/world/castle summary',
    pass: true,
    detail: `${checkedImgs.size} images, ${i18nKeys.size} i18n keys`,
  });
  
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

  // ── PHASE 5: Castle world page ──
  process.stdout.write('  Phase 5: Castle world page...');
  const castleResults = await checkCastlePage();
  const castleFailed = castleResults.filter(r => !r.pass);
  const castlePassed = castleResults.filter(r => r.pass);
  console.log(`  ${castleFailed.length === 0 ? '✓' : '✗'} ${castlePassed.length}/${castleResults.length} (${castleFailed.length} failures)`);

  console.log('');

  // ── Collect all failures ──
  const allFailed = [...pageFailed, ...apiFailed, ...imgFailed, ...assetFailed, ...castleFailed];

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
  const totalChecks = pages.length + apiResults.length + imgResults.length + assetResults.length + castleResults.length;
  const totalPassed = totalChecks - allFailed.length;

  console.log('┌───────────────────────────────────────────────┐');
  console.log(`│ SMOKE TEST v2: ${totalPassed}/${totalChecks} passed${' '.repeat(Math.max(0, 28 - String(totalPassed).length - String(totalChecks).length))}│`);
  console.log(`│   Pages:        ${String(pagePassed).padStart(4)}/${String(pages.length).padEnd(4)}                      │`);
  console.log(`│   API/images:   ${String(apiResults.length - apiFailed.length).padStart(4)}/${String(apiResults.length).padEnd(4)}                      │`);
  console.log(`│   Page images:  ${String(imgResults.length - imgFailed.length).padStart(4)}/${String(imgResults.length).padEnd(4)} checked                 │`);
  console.log(`│   Assets:       ${String(assetResults.length - assetFailed.length).padStart(4)}/${String(assetResults.length).padEnd(4)}                      │`);
  console.log(`│   Castle:       ${String(castlePassed.length).padStart(4)}/${String(castleResults.length).padEnd(4)}                      │`);
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
      castle: { total: castleResults.length, passed: castlePassed.length, failed: castleFailed.length },
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
