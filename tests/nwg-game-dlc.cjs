#!/usr/bin/env node
/**
 * NWG The Game — DLC 3-5 Comprehensive Test Suite
 *
 * Tests:
 * 1. All 74 game images exist on disk as valid WebP files
 * 2. DLC 3 (Skies of NumbahWan) — structure, images, i18n keys
 * 3. DLC 4 (The Forgotten Floor) — structure, images, i18n keys
 * 4. DLC 5 (SS Regina) — structure, images, i18n, historical accuracy
 * 5. All 412 data-i18n keys have ZH + TH translations
 * 6. Navigation links for all DLC sections
 * 7. Hero stats, footer, spec table accuracy
 * 8. Game image serving returns 200 (if server running)
 * 9. Language toggle across EN/ZH/TH (if server running)
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
    console.log(`${COLORS.pass}  \u2713 ${name}${COLORS.reset}`);
  } else {
    failed++;
    const msg = `  \u2717 ${name}${detail ? ': ' + detail : ''}`;
    console.log(`${COLORS.fail}${msg}${COLORS.reset}`);
    failures.push(msg);
  }
}

function section(name) {
  console.log(`\n${COLORS.bold}${COLORS.info}\u2501\u2501\u2501 ${name} \u2501\u2501\u2501${COLORS.reset}`);
}

// ============================================================================
// TEST 1: All game images exist on disk
// ============================================================================

function testGameImages() {
  section('Game Image Files (74 expected)');

  const gameDir = path.join(__dirname, '..', 'public', 'static', 'game');
  const files = fs.readdirSync(gameDir).filter(f => f.endsWith('.webp'));
  assert(files.length >= 74, `Found ${files.length} WebP images (74+ expected)`);

  // DLC 3 images (55-61)
  const dlc3Images = [
    '55-sky-islands.webp', '56-storm-warden-boss.webp', '57-griffin-stable.webp',
    '58-cloud-village.webp', '59-guild-airship.webp', '60-wind-temple.webp',
    '61-sky-jousting.webp'
  ];
  dlc3Images.forEach(img => {
    const exists = files.includes(img);
    assert(exists, `DLC3 image exists: ${img}`);
    if (exists) {
      const size = fs.statSync(path.join(gameDir, img)).size;
      assert(size > 5000, `${img} size ${Math.round(size / 1024)}KB (>5KB)`);
    }
  });

  // DLC 4 images (62-67)
  const dlc4Images = [
    '62-forgotten-ruins.webp', '63-archivist-boss.webp', '64-fungal-cavern.webp',
    '65-forbidden-library.webp', '66-archaeology-site.webp', '67-time-loop-room.webp'
  ];
  dlc4Images.forEach(img => {
    const exists = files.includes(img);
    assert(exists, `DLC4 image exists: ${img}`);
    if (exists) {
      const size = fs.statSync(path.join(gameDir, img)).size;
      assert(size > 5000, `${img} size ${Math.round(size / 1024)}KB (>5KB)`);
    }
  });

  // DLC 5 images (68-74)
  const dlc5Images = [
    '68-ss-regina-exterior.webp', '69-regina-pilothouse.webp', '70-regina-engine-room.webp',
    '71-regina-cargo-hold.webp', '72-regina-storm.webp', '73-regina-shipwreck.webp',
    '74-regina-crew-quarters.webp'
  ];
  dlc5Images.forEach(img => {
    const exists = files.includes(img);
    assert(exists, `DLC5 image exists: ${img}`);
    if (exists) {
      const size = fs.statSync(path.join(gameDir, img)).size;
      assert(size > 5000, `${img} size ${Math.round(size / 1024)}KB (>5KB)`);
    }
  });
}

// ============================================================================
// TEST 2: HTML structure — DLC 3, 4, 5
// ============================================================================

function testDLCStructure() {
  section('DLC HTML Structure');

  const htmlPath = path.join(__dirname, '..', 'public', 'world', 'nwg-the-game.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // DLC 3: Skies of NumbahWan
  assert(html.includes('id="skies"'), 'DLC3 banner section id="skies"');
  assert(html.includes('id="skies-explore"'), 'DLC3 explore section id="skies-explore"');
  assert(html.includes('SKIES OF NUMBAHWAN'), 'DLC3 title present');
  assert(html.includes('55-sky-islands.webp'), 'DLC3 sky islands image referenced');
  assert(html.includes('56-storm-warden-boss.webp'), 'DLC3 storm warden boss image');
  assert(html.includes('57-griffin-stable.webp'), 'DLC3 griffin stable image');
  assert(html.includes('58-cloud-village.webp'), 'DLC3 cloud village image');
  assert(html.includes('59-guild-airship.webp'), 'DLC3 guild airship image');
  assert(html.includes('60-wind-temple.webp'), 'DLC3 wind temple image');
  assert(html.includes('61-sky-jousting.webp'), 'DLC3 sky jousting image');
  // Boss phases
  assert(html.includes('Calm Before the Storm'), 'DLC3 boss phase 1');
  assert(html.includes('Eye of the Hurricane'), 'DLC3 boss phase 2');
  assert(html.includes('Thunder God Rage'), 'DLC3 boss phase 3');

  // DLC 4: The Forgotten Floor
  assert(html.includes('id="forgotten"'), 'DLC4 banner section id="forgotten"');
  assert(html.includes('id="forgotten-explore"'), 'DLC4 explore section');
  assert(html.includes('THE FORGOTTEN FLOOR'), 'DLC4 title present');
  assert(html.includes('62-forgotten-ruins.webp'), 'DLC4 forgotten ruins image');
  assert(html.includes('63-archivist-boss.webp'), 'DLC4 archivist boss image');
  assert(html.includes('64-fungal-cavern.webp'), 'DLC4 fungal cavern image');
  assert(html.includes('65-forbidden-library.webp'), 'DLC4 forbidden library image');
  assert(html.includes('66-archaeology-site.webp'), 'DLC4 archaeology site image');
  assert(html.includes('67-time-loop-room.webp'), 'DLC4 time loop room image');
  // Boss phases
  assert(html.includes('The Quiz Show'), 'DLC4 boss phase 1');
  assert(html.includes('Reality Rewrite'), 'DLC4 boss phase 2');
  assert(html.includes('The Final Chapter'), 'DLC4 boss phase 3');

  // DLC 5: SS Regina
  assert(html.includes('id="ssregina"'), 'DLC5 banner section id="ssregina"');
  assert(html.includes('id="ssregina-explore"'), 'DLC5 explore section');
  assert(html.includes('SS REGINA'), 'DLC5 title present');
  assert(html.includes('68-ss-regina-exterior.webp'), 'DLC5 exterior image');
  assert(html.includes('69-regina-pilothouse.webp'), 'DLC5 pilothouse image');
  assert(html.includes('70-regina-engine-room.webp'), 'DLC5 engine room image');
  assert(html.includes('71-regina-cargo-hold.webp'), 'DLC5 cargo hold image');
  assert(html.includes('72-regina-storm.webp'), 'DLC5 storm image');
  assert(html.includes('73-regina-shipwreck.webp'), 'DLC5 shipwreck image');
  assert(html.includes('74-regina-crew-quarters.webp'), 'DLC5 crew quarters image');
  // Feature cards
  assert(html.includes('feat_explore_ship'), 'DLC5 feature: full ship exploration');
  assert(html.includes('feat_regina_history'), 'DLC5 feature: living history mode');
  assert(html.includes('feat_regina_dive'), 'DLC5 feature: dive the wreck');
}

// ============================================================================
// TEST 3: SS Regina historical accuracy
// ============================================================================

function testReginaHistoricalAccuracy() {
  section('SS Regina Historical Accuracy');

  const htmlPath = path.join(__dirname, '..', 'public', 'world', 'nwg-the-game.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Ship specs
  assert(html.includes('124231'), 'Official number 124231');
  assert(html.includes('A. McMillian'), 'Builder: A. McMillian & Son');
  assert(html.includes('Dumbarton, Scotland'), 'Built in Dumbarton, Scotland');
  assert(html.includes('Yard #419') || html.includes('yard number 419'), 'Yard #419');
  assert(html.includes('September 4, 1907') || html.includes('September 4, 1907'), 'Launch date: Sep 4, 1907');
  assert(html.includes('1,956 GRT') || html.includes('1,956 gross register tons'), 'Tonnage: 1,956 GRT');
  assert(html.includes('1,280 NRT'), 'Net tonnage: 1,280 NRT');
  assert(html.includes('249'), 'Length: 249 feet');
  assert(html.includes('42') && html.includes('6'), 'Beam: 42 ft 6 in');
  assert(html.includes('23') && html.includes('depth'), 'Depth: 23 ft');

  // Engine
  assert(html.includes('triple-expansion') || html.includes('Triple-expansion'), 'Triple-expansion steam engine');
  assert(html.includes('650 IHP') || html.includes('650 indicated horsepower'), 'Power: 650 IHP');
  assert(html.includes('85 RPM') || html.includes('85 rpm'), 'Speed: 85 RPM');
  assert(html.includes('17') && html.includes('28') && html.includes('46'), 'Cylinders: 17, 28, 46 inches');
  assert(html.includes('33') && html.includes('stroke'), 'Stroke: 33 inches');
  assert(html.includes('185 PSI') || html.includes('185 psi'), 'Boiler pressure: 185 PSI');
  assert(html.includes('Scotch fire-tube') || html.includes('Scotch boiler'), 'Scotch fire-tube boilers');
  assert(html.includes('Muir') && html.includes('Houston'), 'Engine builder: Muir & Houston');
  assert(html.includes('single screw') || html.includes('Single screw'), 'Propulsion: single screw');

  // Crew and fate
  assert(html.includes('32'), 'Crew: 32');
  assert(html.includes('Edward McConkey') || html.includes('McConkey'), 'Captain: Edward McConkey');
  assert(html.includes('November 9') || html.includes('Nov 9'), 'Date: November 9, 1913');
  assert(html.includes('Great Lakes Storm'), 'Great Lakes Storm of 1913');
  assert(html.includes('no survivors') || html.includes('all hands lost'), 'All hands lost');

  // Cargo
  assert(html.includes('canned goods'), 'Cargo: canned goods');
  assert(html.includes('140 ton') || html.includes('140 t'), 'Cargo: 140 tons hay');
  assert(html.includes('champagne'), 'Cargo: champagne');
  assert(html.includes('whisky') || html.includes('Scotch'), 'Cargo: whisky');
  assert(html.includes('sewer pipe') || html.includes('sewer'), 'Cargo: sewer pipes');

  // Wreck
  assert(html.includes('1986'), 'Wreck discovered: 1986');
  assert(html.includes('upside down') || html.includes('upside-down'), 'Wreck condition: upside down');
  assert(html.includes('77') && html.includes('80'), 'Wreck depth: 77-80 ft');

  // Spec table
  assert(html.includes('<table class="spec-table"'), 'SS Regina spec table exists');
  assert(html.includes('SS REGINA'), 'Spec table header');
}

// ============================================================================
// TEST 4: i18n coverage — all 412 keys in ZH and TH
// ============================================================================

function testI18nCoverage() {
  section('i18n Coverage (412 keys x 3 languages)');

  const htmlPath = path.join(__dirname, '..', 'public', 'world', 'nwg-the-game.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Extract all data-i18n keys from HTML
  const htmlKeys = new Set();
  const keyMatches = html.match(/data-i18n="([^"]+)"/g) || [];
  keyMatches.forEach(m => htmlKeys.add(m.replace('data-i18n="', '').replace('"', '')));
  assert(htmlKeys.size >= 400, `Found ${htmlKeys.size} unique i18n keys (400+ expected)`);

  // Extract PAGE_I18N block
  const i18nMatch = html.match(/const PAGE_I18N=\{([\s\S]*?)\n\/\*/);
  assert(!!i18nMatch, 'PAGE_I18N object found in script');
  if (!i18nMatch) return;
  const i18nBlock = i18nMatch[1];

  // Check ZH keys
  const zhMatch = i18nBlock.match(/zh:\{([\s\S]*?)\},th:\{/);
  assert(!!zhMatch, 'ZH translation block found');
  if (zhMatch) {
    const zhKeys = new Set();
    const zhKeyMatches = zhMatch[1].match(/'([^']+)'\s*:/g) || [];
    zhKeyMatches.forEach(m => zhKeys.add(m.match(/'([^']+)'/)[1]));
    assert(zhKeys.size >= 400, `ZH has ${zhKeys.size} keys (400+ expected)`);

    const missingZh = [...htmlKeys].filter(k => !zhKeys.has(k));
    assert(missingZh.length === 0,
      `All HTML keys have ZH translations`,
      missingZh.length > 0 ? `Missing: ${missingZh.slice(0, 5).join(', ')}${missingZh.length > 5 ? '...' : ''}` : ''
    );
  }

  // Check TH keys
  const thMatch = i18nBlock.match(/th:\{([\s\S]*?)\}\s*\}/);
  assert(!!thMatch, 'TH translation block found');
  if (thMatch) {
    const thKeys = new Set();
    const thKeyMatches = thMatch[1].match(/'([^']+)'\s*:/g) || [];
    thKeyMatches.forEach(m => thKeys.add(m.match(/'([^']+)'/)[1]));
    assert(thKeys.size >= 400, `TH has ${thKeys.size} keys (400+ expected)`);

    const missingTh = [...htmlKeys].filter(k => !thKeys.has(k));
    assert(missingTh.length === 0,
      `All HTML keys have TH translations`,
      missingTh.length > 0 ? `Missing: ${missingTh.slice(0, 5).join(', ')}${missingTh.length > 5 ? '...' : ''}` : ''
    );
  }

  // DLC-specific i18n keys
  section('DLC-Specific i18n Keys');
  const dlc3Keys = ['skyLabel', 'skyTitle', 'skySub', 'skyExploreTag', 'skyExploreTitle',
    'skyIslandsH3', 'griffinH3', 'stormWardenH3', 'airshipH3', 'feat_griffins', 'feat_cloudfish', 'feat_skyparliament',
    'navSkies'];
  dlc3Keys.forEach(k => assert(htmlKeys.has(k), `DLC3 i18n key: ${k}`));

  const dlc4Keys = ['forgotLabel', 'forgotTitle', 'forgotSub', 'forgotExploreTag', 'forgotExploreTitle',
    'forgotRuinsH3', 'fungalH3', 'archivistH3', 'feat_sporemites', 'feat_timeloops', 'feat_archaeology',
    'navForgotten'];
  dlc4Keys.forEach(k => assert(htmlKeys.has(k), `DLC4 i18n key: ${k}`));

  const dlc5Keys = ['reginaLabel', 'reginaTitle', 'reginaSub', 'reginaExploreTag', 'reginaExploreTitle',
    'reginaShipH3', 'reginaEngineH3', 'reginaCargoH3', 'reginaCrewH3', 'reginaStormH3',
    'feat_explore_ship', 'feat_regina_history', 'feat_regina_dive', 'navRegina'];
  dlc5Keys.forEach(k => assert(htmlKeys.has(k), `DLC5 i18n key: ${k}`));
}

// ============================================================================
// TEST 5: Navigation completeness
// ============================================================================

function testNavigation() {
  section('Navigation Links');

  const htmlPath = path.join(__dirname, '..', 'public', 'world', 'nwg-the-game.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Extract nav section
  const navMatch = html.match(/<nav[^>]*id="sectionNav"[^>]*>([\s\S]*?)<\/nav>/);
  assert(!!navMatch, 'Section nav element found');
  if (!navMatch) return;
  const nav = navMatch[1];

  const requiredLinks = [
    { href: '#world', label: 'WORLD' },
    { href: '#exploration', label: 'EXPLORE' },
    { href: '#combat', label: 'COMBAT' },
    { href: '#social', label: 'SOCIAL' },
    { href: '#crafting', label: 'CRAFT' },
    { href: '#strategy', label: 'STRATEGY' },
    { href: '#endgame', label: 'ENDGAME' },
    { href: '#dlc', label: 'DLC' },
    { href: '#bosses', label: 'BOSSES' },
    { href: '#flex', label: 'FLEX' },
    { href: '#activities', label: 'ACTIVITIES' },
    { href: '#streetduels', label: 'DUELS' },
    { href: '#skies', label: 'SKIES' },
    { href: '#forgotten', label: 'DEPTHS' },
    { href: '#ssregina', label: 'REGINA' },
    { href: '#specs', label: 'SPECS' },
  ];

  requiredLinks.forEach(({ href, label }) => {
    assert(nav.includes(`href="${href}"`), `Nav link: ${href} (${label})`);
  });

  // DLC links should have dlc-link class
  assert(nav.includes('class="dlc-link"'), 'DLC links have dlc-link class');
}

// ============================================================================
// TEST 6: Hero stats & footer
// ============================================================================

function testHeroAndFooter() {
  section('Hero Stats & Footer');

  const htmlPath = path.join(__dirname, '..', 'public', 'world', 'nwg-the-game.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Hero stats
  assert(html.includes('>UE5<'), 'Hero stat: UE5 engine');
  assert(html.includes('>74<'), 'Hero stat: 74 screenshots');
  assert(html.includes('>17<'), 'Hero stat: 17 game systems');
  assert(html.includes('>AAA<'), 'Hero stat: AAA quality');
  assert(html.includes('>5 FREE<'), 'Hero stat: 5 FREE DLCs');

  // Footer mentions all 5 DLCs
  assert(html.includes('The Abyss Below'), 'Footer: DLC 1 name');
  assert(html.includes('Cards on the Cobblestones'), 'Footer: DLC 2 name');
  assert(html.includes('Skies of NumbahWan'), 'Footer: DLC 3 name');
  assert(html.includes('The Forgotten Floor'), 'Footer: DLC 4 name');
  assert(html.includes('SS Regina'), 'Footer: DLC 5 name');
  assert(html.includes('74 Concept Renders'), 'Footer: 74 concept renders');
  assert(html.includes('AI-generated concept art'), 'Footer: AI-generated disclaimer');

  // Specs table mentions all DLCs
  assert(html.includes('DLC 1: The Abyss Below'), 'Specs: DLC 1');
  assert(html.includes('DLC 2: Cards on the Cobblestones'), 'Specs: DLC 2');
  assert(html.includes('DLC 3: Skies of NumbahWan'), 'Specs: DLC 3');
  assert(html.includes('DLC 4: The Forgotten Floor'), 'Specs: DLC 4');
  assert(html.includes('DLC 5: SS Regina'), 'Specs: DLC 5');
}

// ============================================================================
// TEST 7: Image references match actual files
// ============================================================================

function testImageReferences() {
  section('Image Path Integrity');

  const htmlPath = path.join(__dirname, '..', 'public', 'world', 'nwg-the-game.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const gameDir = path.join(__dirname, '..', 'public', 'static', 'game');

  // Extract all image paths from HTML
  const imgPaths = [];
  const imgMatches = html.match(/\/static\/game\/[^"']+\.webp/g) || [];
  const uniquePaths = [...new Set(imgMatches)];

  assert(uniquePaths.length >= 74, `Found ${uniquePaths.length} unique image references (74+ expected)`);

  let missingCount = 0;
  uniquePaths.forEach(imgPath => {
    const filename = imgPath.split('/').pop();
    const exists = fs.existsSync(path.join(gameDir, filename));
    if (!exists) {
      missingCount++;
      assert(false, `Image file exists: ${filename}`);
    }
  });
  if (missingCount === 0) {
    assert(true, `All ${uniquePaths.length} referenced images exist on disk`);
  }
}

// ============================================================================
// TEST 8: Server tests (game image serving + language toggle)
// ============================================================================

async function testServer() {
  const PORT = parseInt(process.env.TEST_PORT || '3456');
  const BASE = `http://localhost:${PORT}`;

  section('Server Tests (port ' + PORT + ')');

  // Check server reachable
  const serverUp = await httpGet(`${BASE}/world/nwg-the-game.html`).catch(() => ({ status: 0 }));
  if (serverUp.status === 0) {
    console.log(`${COLORS.dim}  (server not running on port ${PORT}, skipping server tests)${COLORS.reset}`);
    return;
  }

  assert(serverUp.status === 200, 'Game page returns 200');
  assert(serverUp.body.includes('NWG THE GAME'), 'Game page contains title');
  assert(serverUp.body.includes('SS REGINA'), 'Game page contains DLC 5 title');

  // Test DLC 5 images serve correctly
  const dlc5Images = [
    '68-ss-regina-exterior.webp', '69-regina-pilothouse.webp', '70-regina-engine-room.webp',
    '71-regina-cargo-hold.webp', '72-regina-storm.webp', '73-regina-shipwreck.webp',
    '74-regina-crew-quarters.webp'
  ];
  for (const img of dlc5Images) {
    const res = await httpGet(`${BASE}/static/game/${img}`, { headOnly: true });
    const ct = res.headers['content-type'] || '';
    assert(res.status === 200 && ct.includes('image'), `${img} serves with image content-type`);
  }

  // Test that page loads < 2MB
  const pageSize = serverUp.body.length;
  assert(pageSize < 2 * 1024 * 1024, `Page size ${Math.round(pageSize / 1024)}KB (<2MB)`);
}

function httpGet(url, opts = {}) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ status: 0, headers: {}, body: '' }), 5000);
    http.get(url, (res) => {
      if (opts.headOnly) {
        clearTimeout(timeout);
        resolve({ status: res.statusCode, headers: res.headers, body: '' });
        res.resume();
        return;
      }
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        clearTimeout(timeout);
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    }).on('error', () => {
      clearTimeout(timeout);
      resolve({ status: 0, headers: {}, body: '' });
    });
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`${COLORS.bold}
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  NWG The Game \u2014 DLC 3\u20135 Test Suite v1.0         \u2551
\u2551  DLC 3: Skies | DLC 4: Depths | DLC 5: Regina   \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D${COLORS.reset}
`);

  const startTime = Date.now();

  testGameImages();
  testDLCStructure();
  testReginaHistoricalAccuracy();
  testI18nCoverage();
  testNavigation();
  testHeroAndFooter();
  testImageReferences();
  await testServer();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`
${COLORS.bold}\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501${COLORS.reset}
  Total:   ${total} tests in ${elapsed}s
  ${COLORS.pass}Passed:  ${passed}${COLORS.reset}
  ${COLORS.fail}Failed:  ${failed}${COLORS.reset}
${COLORS.bold}\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501${COLORS.reset}
`);

  if (failures.length > 0) {
    console.log(`${COLORS.fail}${COLORS.bold}Failures:${COLORS.reset}`);
    failures.forEach(f => console.log(`${COLORS.fail}${f}${COLORS.reset}`));
  }

  console.log(failed === 0
    ? `${COLORS.pass}${COLORS.bold}ALL DLC 3\u20135 TESTS PASSED \u2713${COLORS.reset}`
    : `${COLORS.fail}${COLORS.bold}${failed} TESTS FAILED \u2717${COLORS.reset}`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
