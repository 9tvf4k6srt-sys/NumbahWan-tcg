// BackstopJS GATE config: the scoped, CI-enforceable visual regression gate.
//
// This is NOT backstop.config.cjs (119 pages x 4 viewports, exploratory).
// The gate trades coverage for reliability: critical pages only, 2 viewports,
// and every page is captured with animation FROZEN so motion-heavy pages
// (GSAP, Lenis, canvas) produce stable pixels instead of permanent false
// diffs. A flaky visual gate trains everyone to ignore it; a frozen one
// catches the real failure class no source lint can see: broken layout,
// dead CSS, black canvases, overlap at 375px.
//
// Commands (server must be running on :3000; BACKSTOP_URL overrides):
//   npm run visual:gate            # compare against committed baselines
//   npm run visual:gate:approve    # bless the current diffs as new baselines
//   npm run visual:gate:reference  # regenerate ALL baselines (after review)
//
// Baselines live in backstop_data/gate_reference/ and ARE committed to git.
// CI job: ci/page-quality.yml (visual job).

const BASE_URL = process.env.BACKSTOP_URL || 'http://localhost:3000';

// Critical pages: most changed, most breakage-prone (Mycelium hotspots),
// plus the cinematic landing example (the template every landing derives from).
const PAGES = [
  'index', 'battle', 'cards', 'forge', 'wallet', 'market',
  'auction-house', 'guide', 'academy', 'merch', 'exchange',
  'collection', 'tavern-tales', 'profile-card', 'pvp-battle',
  'example-cinematic',
];

const VIEWPORTS = [
  { label: 'phone', width: 375, height: 812 },
  { label: 'desktop', width: 1280, height: 800 },
];

const scenarios = PAGES.map((page) => ({
  label: page,
  url: `${BASE_URL}/${page === 'index' ? '' : page}`,
  readyEvent: '',
  delay: 2500,             // fonts + lazy content settle
  // 2.5%: seeding + freezing removes content randomness, but canvas/particle
  // surfaces still drift ~1-2% between runs. Real layout breakage (overlap,
  // dead CSS, black canvas) measures 5%+ on a viewport capture.
  misMatchThreshold: 2.5,
  requireSameDimensions: false,
  // viewport capture, not full document: tall pages (5000px+ with heavy
  // imagery) time out the screenshot on constrained runners, and the fold
  // is where visual breakage shows. Reliability > below-fold coverage.
  selectors: ['viewport'],
  onBeforeScript: 'gate-seed.cjs',   // seed Math.random + freeze Date pre-load
  onReadyScript: 'gate-freeze.cjs',  // freeze animation post-load
}));

module.exports = {
  id: 'nw_gate',
  viewports: VIEWPORTS,
  scenarios,
  paths: {
    bitmaps_reference: 'backstop_data/gate_reference',
    bitmaps_test: 'backstop_data/gate_test',
    engine_scripts: 'backstop_data/engine_scripts',
    html_report: 'backstop_data/gate_html_report',
    ci_report: 'backstop_data/gate_ci_report',
  },
  report: ['CI'],
  engine: 'playwright',
  engineOptions: {
    browser: 'chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    // domcontentloaded, not load: pages with a missing asset (404) can hang
    // the load event forever (tavern-tales did). The 2500ms scenario delay
    // plus gate-freeze give assets time to settle before capture.
    gotoParameters: { waitUntil: 'domcontentloaded', timeout: 30000 },
  },
  // capture limit 1: parallel Chromiums exhaust CI/sandbox memory; serial is
  // slower but never OOMs. Compare is cheap, stays parallel.
  asyncCaptureLimit: 1,
  asyncCompareLimit: 20,
  debug: false,
  debugWindow: false,
};
