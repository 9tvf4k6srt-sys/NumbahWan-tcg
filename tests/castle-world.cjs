#!/usr/bin/env node
/**
 * Castle World Page — Comprehensive Test Suite
 * 
 * Tests:
 * 1. All 20 images exist on disk and are valid WebP files
 * 2. Image paths in castle.html match actual files
 * 3. All data-i18n attributes have translations in en, zh, th
 * 4. No corrupted translations (HTML tags, truncated text)
 * 5. Room cards, paragraphs, detail spans all have i18n
 * 6. Image serving returns 200 with correct content-type (if server running)
 * 7. Castle page returns 200 (if server running)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const COLORS = {
  pass: '\x1b[32m', fail: '\x1b[31m', warn: '\x1b[33m',
  info: '\x1b[36m', dim: '\x1b[2m', reset: '\x1b[0m', bold: '\x1b[1m'
};

let total = 0, passed = 0, failed = 0;
const failures = [];

function assert(condition, name, detail = '') {
  total++;
  if (condition) {
    passed++;
    console.log(`${COLORS.pass}  ✓ ${name}${COLORS.reset}`);
  } else {
    failed++;
    const msg = `  ✗ ${name}${detail ? ': ' + detail : ''}`;
    console.log(`${COLORS.fail}${msg}${COLORS.reset}`);
    failures.push(msg);
  }
}

function section(name) {
  console.log(`\n${COLORS.bold}${COLORS.info}━━━ ${name} ━━━${COLORS.reset}`);
}

// ============================================================================
// TEST 1: Image files exist on disk
// ============================================================================

function testImageFiles() {
  section('Image Files on Disk');
  
  const expectedImages = [
    'aerial', 'exterior', 'gates', 'courtyard', 'mountain',
    'market', 'tavern', 'barracks', 'quarters', 'warroom',
    'forge', 'officers', 'library', 'gmsuite', 'shrine',
    'observatory', 'dungeon', 'maids', 'afk', 'drama'
  ];
  
  const staticWorldDir = path.join(__dirname, '..', 'public', 'static', 'world');
  const worldImgDir = path.join(__dirname, '..', 'public', 'world', 'img');
  
  // Check /static/world/ directory (production path)
  assert(fs.existsSync(staticWorldDir), '/public/static/world/ directory exists');
  
  expectedImages.forEach(img => {
    const filePath = path.join(staticWorldDir, `${img}.webp`);
    const exists = fs.existsSync(filePath);
    assert(exists, `Image exists: /static/world/${img}.webp`);
    
    if (exists) {
      const stat = fs.statSync(filePath);
      assert(stat.size > 10000, `Image ${img}.webp is >10KB (${Math.round(stat.size / 1024)}KB)`,
        `Only ${stat.size} bytes`);
      
      // Check WebP magic bytes (RIFF....WEBP)
      const buf = Buffer.alloc(12);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buf, 0, 12, 0);
      fs.closeSync(fd);
      const isWebP = buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
      assert(isWebP, `Image ${img}.webp is valid WebP format`);
    }
  });
  
  // Verify dist has copies too
  const distStaticWorld = path.join(__dirname, '..', 'dist', 'static', 'world');
  if (fs.existsSync(distStaticWorld)) {
    const distFiles = fs.readdirSync(distStaticWorld).filter(f => f.endsWith('.webp'));
    assert(distFiles.length >= expectedImages.length, 
      `dist/static/world/ has all ${expectedImages.length}+ images (found ${distFiles.length})`);
  }
}

// ============================================================================
// TEST 2: Image paths in HTML match real files
// ============================================================================

function testImagePaths() {
  section('Image Paths in castle.html');
  
  const castlePath = path.join(__dirname, '..', 'public', 'world', 'castle.html');
  assert(fs.existsSync(castlePath), 'castle.html exists');
  
  const content = fs.readFileSync(castlePath, 'utf8');
  
  // Extract all image src attributes
  const imgSrcs = [];
  const imgRegex = /src="([^"]*\.webp)"/g;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    imgSrcs.push(match[1]);
  }
  
  assert(imgSrcs.length === 20, `Found ${imgSrcs.length} WebP image references (expected 20)`);
  
  // All should use /static/world/ path (not /world/img/)
  const wrongPaths = imgSrcs.filter(s => s.startsWith('/world/img/'));
  assert(wrongPaths.length === 0, 'No images use old /world/img/ path',
    wrongPaths.length > 0 ? `Found: ${wrongPaths.join(', ')}` : '');
  
  const correctPaths = imgSrcs.filter(s => s.startsWith('/static/world/'));
  assert(correctPaths.length === 20, `All ${correctPaths.length}/20 images use /static/world/ path`);
  
  // Verify each referenced image file exists
  imgSrcs.forEach(src => {
    const localPath = path.join(__dirname, '..', 'public', src);
    assert(fs.existsSync(localPath), `Referenced image exists: ${src}`);
  });
}

// ============================================================================
// TEST 3: Translation completeness — ALL data-i18n have en, zh, th
// ============================================================================

function testTranslations() {
  section('Translation Completeness');
  
  const castlePath = path.join(__dirname, '..', 'public', 'world', 'castle.html');
  const content = fs.readFileSync(castlePath, 'utf8');
  
  // Extract all data-i18n keys from HTML
  const htmlKeys = new Set();
  const i18nRegex = /data-i18n="([^"]+)"/g;
  let match;
  while ((match = i18nRegex.exec(content)) !== null) {
    htmlKeys.add(match[1]);
  }
  
  assert(htmlKeys.size >= 360, `Found ${htmlKeys.size} data-i18n attributes (expected 360+)`);
  
  // Check for duplicate keys
  const allI18nMatches = content.match(/data-i18n="([^"]+)"/g) || [];
  const keyCount = {};
  allI18nMatches.forEach(m => {
    const key = m.match(/"([^"]+)"/)[1];
    keyCount[key] = (keyCount[key] || 0) + 1;
  });
  const duplicates = Object.entries(keyCount).filter(([k, v]) => v > 1);
  assert(duplicates.length === 0, 'No duplicate data-i18n keys in HTML',
    duplicates.length > 0 ? `Duplicates: ${duplicates.map(([k,v]) => `${k}(${v}x)`).join(', ')}` : '');
  
  // Extract PAGE_I18N script content
  const scriptStart = content.indexOf('const PAGE_I18N = {');
  const scriptEnd = content.indexOf('\n};', scriptStart) + 3;
  assert(scriptStart > 0, 'PAGE_I18N block found');
  
  const scriptBlock = content.substring(scriptStart, scriptEnd);
  
  // Check each language section exists
  assert(scriptBlock.includes('en: {'), 'PAGE_I18N has English section');
  assert(scriptBlock.includes('zh: {'), 'PAGE_I18N has Chinese section');
  assert(scriptBlock.includes('th: {'), 'PAGE_I18N has Thai section');
  
  // Parse translation keys for each language
  function extractKeys(block, lang) {
    const langStart = block.indexOf(`${lang}: {`);
    if (langStart < 0) return new Set();
    // Find the closing brace for this language section
    let braceCount = 0;
    let langEnd = langStart;
    for (let i = langStart; i < block.length; i++) {
      if (block[i] === '{') braceCount++;
      if (block[i] === '}') {
        braceCount--;
        if (braceCount === 0) { langEnd = i; break; }
      }
    }
    const langBlock = block.substring(langStart, langEnd);
    const keys = new Set();
    const keyRegex = /'([^']+)'\s*:/g;
    let m;
    while ((m = keyRegex.exec(langBlock)) !== null) {
      keys.add(m[1]);
    }
    return keys;
  }
  
  const enKeys = extractKeys(scriptBlock, 'en');
  const zhKeys = extractKeys(scriptBlock, 'zh');
  const thKeys = extractKeys(scriptBlock, 'th');
  
  assert(enKeys.size >= 360, `English has ${enKeys.size} translations (expected 360+)`);
  assert(zhKeys.size >= 360, `Chinese has ${zhKeys.size} translations (expected 360+)`);
  assert(thKeys.size >= 360, `Thai has ${thKeys.size} translations (expected 360+)`);
  
  // Every HTML key must be in all 3 languages
  let enMissing = [], zhMissing = [], thMissing = [];
  htmlKeys.forEach(key => {
    if (!enKeys.has(key)) enMissing.push(key);
    if (!zhKeys.has(key)) zhMissing.push(key);
    if (!thKeys.has(key)) thMissing.push(key);
  });
  
  assert(enMissing.length === 0, `All HTML keys have English translation`,
    enMissing.length > 0 ? `Missing: ${enMissing.slice(0, 5).join(', ')}${enMissing.length > 5 ? '...' : ''}` : '');
  assert(zhMissing.length === 0, `All HTML keys have Chinese translation`,
    zhMissing.length > 0 ? `Missing: ${zhMissing.slice(0, 5).join(', ')}${zhMissing.length > 5 ? '...' : ''}` : '');
  assert(thMissing.length === 0, `All HTML keys have Thai translation`,
    thMissing.length > 0 ? `Missing: ${thMissing.slice(0, 5).join(', ')}${thMissing.length > 5 ? '...' : ''}` : '');
}

// ============================================================================
// TEST 4: No corrupted translations
// ============================================================================

function testTranslationQuality() {
  section('Translation Quality — No Corruption');
  
  const castlePath = path.join(__dirname, '..', 'public', 'world', 'castle.html');
  const content = fs.readFileSync(castlePath, 'utf8');
  
  // Extract all translations from en block
  const enStart = content.indexOf("  en: {");
  const enEnd = content.indexOf("\n  },\n  zh:");
  const enBlock = content.substring(enStart, enEnd);
  
  // Check for HTML contamination in translations
  const htmlTags = ['</h3>', '</p>', '</div>', '</span>', '<h3', '<p ', '<div', '<span'];
  let htmlContamination = 0;
  const contaminated = [];
  
  const transRegex = /'([^']+)'\s*:\s*'((?:[^'\\]|\\.)*)'/g;
  let match;
  while ((match = transRegex.exec(enBlock)) !== null) {
    const key = match[1];
    const val = match[2];
    for (const tag of htmlTags) {
      if (val.includes(tag)) {
        htmlContamination++;
        contaminated.push(key);
        break;
      }
    }
  }
  
  assert(htmlContamination === 0, 'No HTML tags in English translations',
    contaminated.length > 0 ? `Contaminated keys: ${contaminated.join(', ')}` : '');
  
  // Check paragraph translations are not truncated (should be >50 chars for paragraphs)
  const paraKeys = [];
  const paraRegex = /'([a-z]+_p\d+)'\s*:\s*'((?:[^'\\]|\\.)*)'/g;
  while ((match = paraRegex.exec(enBlock)) !== null) {
    paraKeys.push({ key: match[1], len: match[2].length });
  }
  
  const truncated = paraKeys.filter(p => p.len < 50);
  assert(truncated.length === 0, `No truncated paragraph translations (all >50 chars)`,
    truncated.length > 0 ? `Truncated: ${truncated.map(p => `${p.key}(${p.len}ch)`).join(', ')}` : '');
  
  assert(paraKeys.length >= 39, `Found ${paraKeys.length} paragraph translations (expected 39+)`);
}

// ============================================================================
// TEST 5: Structural completeness — all content types have i18n
// ============================================================================

function testStructuralCoverage() {
  section('Structural i18n Coverage');
  
  const castlePath = path.join(__dirname, '..', 'public', 'world', 'castle.html');
  const content = fs.readFileSync(castlePath, 'utf8');
  const htmlPart = content.substring(0, content.indexOf('<script>\nconst PAGE_I18N'));
  
  // Count elements that SHOULD have data-i18n
  // All <p> in .deep-caption should have data-i18n
  const allParagraphs = (htmlPart.match(/<p[^>]*>/g) || []);
  const paraWithI18n = (htmlPart.match(/<p[^>]*data-i18n="[^"]+"/g) || []);
  
  // Paragraphs inside deep-caption (which are the lore paragraphs)
  assert(paraWithI18n.length >= 39, 
    `${paraWithI18n.length} paragraphs have data-i18n (expected 39+)`);
  
  // All .detail-item span should have data-i18n
  const detailSpans = (htmlPart.match(/<span\s+data-i18n="desc_[^"]+"/g) || []);
  assert(detailSpans.length >= 72, 
    `${detailSpans.length} detail-item spans have data-i18n (expected 72+)`);
  
  // All room-card name/role/desc should have data-i18n
  const roomNames = (htmlPart.match(/class="name"\s+data-i18n="room\d+_name"/g) || []);
  const roomRoles = (htmlPart.match(/class="role"\s+data-i18n="room\d+_role"/g) || []);
  const roomDescs = (htmlPart.match(/class="desc"\s+data-i18n="room\d+_desc"/g) || []);
  
  assert(roomNames.length === 14, `${roomNames.length} room names have data-i18n (expected 14)`);
  assert(roomRoles.length === 14, `${roomRoles.length} room roles have data-i18n (expected 14)`);
  assert(roomDescs.length === 14, `${roomDescs.length} room descs have data-i18n (expected 14)`);
  
  // Nav links
  const navLinks = (htmlPart.match(/class="floor-nav"[\s\S]*?<\/nav>/g) || [''])[0];
  const navI18n = (navLinks.match(/data-i18n="/g) || []);
  assert(navI18n.length >= 20, `${navI18n.length} nav links have data-i18n (expected 20)`);
  
  // Cross-section map
  const csLinks = (htmlPart.match(/data-i18n="cs[A-Z]/g) || []);
  assert(csLinks.length >= 10, `${csLinks.length} cross-section entries have data-i18n (expected 10)`);
}

// ============================================================================
// TEST 6: Routing configuration
// ============================================================================

function testRouting() {
  section('Routing Configuration');
  
  // Check src/index.tsx has /static/* serveStatic
  const indexPath = path.join(__dirname, '..', 'src', 'index.tsx');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  assert(indexContent.includes("'/static/*', serveStatic()"), 
    'src/index.tsx has /static/* serveStatic route');
  
  // Check pages.ts has world route
  const pagesPath = path.join(__dirname, '..', 'src', 'routes', 'pages.ts');
  const pagesContent = fs.readFileSync(pagesPath, 'utf8');
  assert(pagesContent.includes("worldPages") && pagesContent.includes("'castle'"),
    'pages.ts has castle in worldPages');
  assert(pagesContent.includes("/world/${page}"),
    'pages.ts has /world/:page route');
  
  // Check vite.config.ts excludes /world/*
  const vitePath = path.join(__dirname, '..', 'vite.config.ts');
  const viteContent = fs.readFileSync(vitePath, 'utf8');
  assert(viteContent.includes("'/world/*'"), 
    'vite.config.ts excludes /world/* from worker routing');
  
  // Check post-build.cjs handles world
  const postBuildPath = path.join(__dirname, '..', 'post-build.cjs');
  const postBuildContent = fs.readFileSync(postBuildPath, 'utf8');
  assert(postBuildContent.includes('/world/img/*') || postBuildContent.includes('/world/*'),
    'post-build.cjs excludes world assets from routing');
}

// ============================================================================
// TEST 7: Server tests (only if server is running)
// ============================================================================

async function testServer() {
  section('Server Tests (if running)');
  
  const TEST_PORT = process.env.TEST_PORT || 3000;
  
  function fetchHead(urlPath) {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: urlPath,
        method: 'HEAD',
        timeout: 3000
      }, (res) => {
        resolve({ status: res.statusCode, headers: res.headers });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.end();
    });
  }
  
  // Check if server is running
  const health = await fetchHead('/world/castle');
  if (!health) {
    console.log(`${COLORS.dim}  ○ Server not running on port ${TEST_PORT} — skipping server tests${COLORS.reset}`);
    return;
  }
  
  assert(health.status === 200, 'GET /world/castle returns 200');
  
  // Test all 20 images
  const images = [
    'aerial', 'exterior', 'gates', 'courtyard', 'mountain',
    'market', 'tavern', 'barracks', 'quarters', 'warroom',
    'forge', 'officers', 'library', 'gmsuite', 'shrine',
    'observatory', 'dungeon', 'maids', 'afk', 'drama'
  ];
  
  for (const img of images) {
    const res = await fetchHead(`/static/world/${img}.webp`);
    if (res) {
      assert(res.status === 200, `GET /static/world/${img}.webp returns 200`);
      const ct = res.headers['content-type'] || '';
      assert(ct.includes('image/webp') || ct.includes('application/octet-stream'), 
        `${img}.webp content-type is image/webp (got: ${ct})`);
    } else {
      assert(false, `GET /static/world/${img}.webp`, 'No response');
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`${COLORS.bold}
╔══════════════════════════════════════════════════╗
║   Castle NumbahWan — World Page Test Suite        ║
║   Images, Translations, Routing                   ║
╚══════════════════════════════════════════════════╝${COLORS.reset}`);
  
  testImageFiles();
  testImagePaths();
  testTranslations();
  testTranslationQuality();
  testStructuralCoverage();
  testRouting();
  await testServer();
  
  // Results
  console.log(`
${COLORS.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}
  Total:   ${total} tests
  ${COLORS.pass}Passed:  ${passed}${COLORS.reset}
  ${COLORS.fail}Failed:  ${failed}${COLORS.reset}
${COLORS.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  
  if (failures.length > 0) {
    console.log(`\n${COLORS.fail}${COLORS.bold}Failures:${COLORS.reset}`);
    failures.forEach(f => console.log(`${COLORS.fail}${f}${COLORS.reset}`));
  }
  
  console.log(failed === 0
    ? `\n${COLORS.pass}${COLORS.bold}ALL CASTLE TESTS PASSED ✓${COLORS.reset}`
    : `\n${COLORS.fail}${COLORS.bold}${failed} TESTS FAILED ✗${COLORS.reset}`);
  
  process.exit(failed > 0 ? 1 : 0);
}

main();
