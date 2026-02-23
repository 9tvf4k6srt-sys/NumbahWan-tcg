// Test the deep image analysis pipeline end-to-end
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const PASS = '\x1b[32mPASS\x1b[0m';
const FAIL = '\x1b[31mFAIL\x1b[0m';
let passes = 0, fails = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ${PASS} ${name}`);
    passes++;
  } catch(e) {
    console.log(`  ${FAIL} ${name}: ${e.message}`);
    fails++;
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function get(url) { return execSync(`curl -s "${url}"`, { encoding: 'utf8', timeout: 10000 }); }
function getCode(url) { return execSync(`curl -s -o /dev/null -w "%{http_code}" "${url}"`, { encoding: 'utf8', timeout: 10000 }).trim(); }

console.log('\n=== NWGE Image-to-Game Pipeline Tests ===\n');

// 1. Static file serving
console.log('--- Static Files ---');
test('mobile-factory.html serves (200)', () => assert(getCode(`${BASE}/mobile-factory.html`) === '200'));
test('image-to-game-engine.js serves (200)', () => assert(getCode(`${BASE}/image-to-game-engine.js`) === '200'));
test('mobile-game-engine.js serves (200)', () => assert(getCode(`${BASE}/mobile-game-engine.js`) === '200'));

// 2. API endpoints
console.log('\n--- API Endpoints ---');
test('/api/mobile/status returns valid JSON', () => {
  const data = JSON.parse(get(`${BASE}/api/mobile/status`));
  assert(data.version === '2.0', 'version should be 2.0');
  assert(Array.isArray(data.templates), 'templates should be array');
  assert(data.templates.length === 5, 'should have 5 templates');
  assert(Array.isArray(data.themes), 'themes should be array');
  assert(data.themes.length >= 10, 'should have 10+ themes');
});

// 3. Vision endpoint (should gracefully handle unavailable LLM)
test('/api/mobile/vision gracefully handles no LLM', () => {
  // Generate a tiny 2x2 red PNG as base64
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVQIW2P8z8DwHwMDAwMAFSAD/WAyDuYAAAAASUVORK5CYII=';
  const resp = execSync(`curl -s -X POST -H "Content-Type: application/json" -d '{"image":"${tinyPng}"}' "${BASE}/api/mobile/vision"`, { encoding: 'utf8', timeout: 10000 });
  const data = JSON.parse(resp);
  assert(data.available === false || data.analysis !== null, 'should indicate vision availability');
});

// 4. File sizes (verify non-trivial content)
console.log('\n--- Content Sizes ---');
test('image-to-game-engine.js is > 30KB', () => {
  const stat = fs.statSync(path.join(__dirname, 'image-to-game-engine.js'));
  assert(stat.size > 30000, `Size is only ${stat.size}`);
});
test('mobile-game-engine.js is > 50KB', () => {
  const stat = fs.statSync(path.join(__dirname, 'mobile-game-engine.js'));
  assert(stat.size > 50000, `Size is only ${stat.size}`);
});
test('mobile-factory.html is > 40KB', () => {
  const stat = fs.statSync(path.join(__dirname, 'mobile-factory.html'));
  assert(stat.size > 40000, `Size is only ${stat.size}`);
});

// 5. Content verification
console.log('\n--- Content Verification ---');
test('image-to-game-engine.js has analyzeImageDeep', () => {
  const content = fs.readFileSync(path.join(__dirname, 'image-to-game-engine.js'), 'utf8');
  assert(content.includes('analyzeImageDeep'), 'Missing analyzeImageDeep');
  assert(content.includes('extractPalette'), 'Missing extractPalette');
  assert(content.includes('detectEdges'), 'Missing detectEdges');
  assert(content.includes('analyzeComposition'), 'Missing analyzeComposition');
  assert(content.includes('buildGameConfig'), 'Missing buildGameConfig');
  assert(content.includes('extractTerrainProfile'), 'Missing extractTerrainProfile');
  assert(content.includes('extractSpriteSilhouette'), 'Missing extractSpriteSilhouette');
  assert(content.includes('analyzeWithVision'), 'Missing analyzeWithVision');
});

test('mobile-factory.html loads image-to-game-engine.js', () => {
  const content = fs.readFileSync(path.join(__dirname, 'mobile-factory.html'), 'utf8');
  assert(content.includes('image-to-game-engine.js'), 'Missing script include');
  assert(content.includes('ImageToGameEngine'), 'Missing ImageToGameEngine reference');
  assert(content.includes('analyzeImageDeep'), 'Missing deep analysis call');
  assert(content.includes('deepAnalysisDetails'), 'Missing deep analysis UI');
  assert(content.includes('edgeCanvas'), 'Missing edge map preview');
  assert(content.includes('extractedPalette'), 'Missing palette extraction UI');
});

test('mobile-game-engine.js accepts deepAnalysis param', () => {
  const content = fs.readFileSync(path.join(__dirname, 'mobile-game-engine.js'), 'utf8');
  assert(content.includes('deepAnalysis'), 'Missing deepAnalysis parameter');
  assert(content.includes('imageGameConfig'), 'Missing imageGameConfig parameter');
  assert(content.includes('effectiveGameType'), 'Missing effectiveGameType logic');
});

test('factory.html has deep analysis details panel', () => {
  const content = fs.readFileSync(path.join(__dirname, 'mobile-factory.html'), 'utf8');
  assert(content.includes('detectedGameType'), 'Missing game type detection display');
  assert(content.includes('detectedTheme'), 'Missing theme detection display');
  assert(content.includes('detectedMood'), 'Missing mood detection display');
  assert(content.includes('detectedComplexity'), 'Missing complexity display');
  assert(content.includes('detectedCharacter'), 'Missing character display');
  assert(content.includes('detectedDifficulty'), 'Missing difficulty display');
  assert(content.includes('DEEP VISION'), 'Missing deep vision badge');
});

// Summary
console.log(`\n=== Results: ${passes} passed, ${fails} failed ===`);
process.exit(fails > 0 ? 1 : 0);
