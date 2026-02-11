// BackstopJS Visual Regression Config
// Auto-generated from 119 HTML pages in public/
// Critical pages tested at 4 viewports, standard pages at 2

const BASE_URL = process.env.BACKSTOP_URL || 'http://localhost:8788';

// Critical pages — most changed, most breakage-prone (from Mycelium hotspots)
const CRITICAL_PAGES = [
  'battle', 'cards', 'forge', 'wallet', 'market', 'auction-house',
  'index', 'guide', 'academy', 'merch', 'exchange', 'collection',
  'tavern-tales', 'system-dashboard', 'profile-card', 'pvp-battle'
];

// All viewports for critical pages
const CRITICAL_VIEWPORTS = [
  { label: 'phone-sm', width: 320, height: 568 },
  { label: 'phone', width: 375, height: 812 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'desktop', width: 1280, height: 800 }
];

// Standard pages — just tablet + desktop
const STANDARD_VIEWPORTS = [
  { label: 'phone', width: 375, height: 812 },
  { label: 'desktop', width: 1280, height: 800 }
];

// Build all page routes from filesystem
const fs = require('fs');
const path = require('path');

function findPages(dir, prefix = '') {
  const pages = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.html')) {
      const route = prefix + entry.name.replace('.html', '');
      pages.push(route);
    } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'static' && entry.name !== 'images') {
      pages.push(...findPages(path.join(dir, entry.name), prefix + entry.name + '/'));
    }
  }
  return pages;
}

const allPages = findPages(path.join(__dirname, 'public'));

const scenarios = allPages.map(page => {
  const isCritical = CRITICAL_PAGES.includes(page.split('/').pop()) || CRITICAL_PAGES.includes(page);
  const urlPath = page === 'index' ? '/' : `/${page}`;
  
  return {
    label: page,
    url: `${BASE_URL}${urlPath}`,
    delay: 1500,           // Wait for fonts + lazy content
    misMatchThreshold: 5,  // 5% tolerance for anti-aliasing
    requireSameDimensions: false,
    viewports: isCritical ? CRITICAL_VIEWPORTS : STANDARD_VIEWPORTS
  };
});

module.exports = {
  id: 'numbahwan',
  viewports: STANDARD_VIEWPORTS, // Default fallback
  scenarios,
  paths: {
    bitmaps_reference: 'backstop_data/bitmaps_reference',
    bitmaps_test: 'backstop_data/bitmaps_test',
    engine_scripts: 'backstop_data/engine_scripts',
    html_report: 'backstop_data/html_report',
    ci_report: 'backstop_data/ci_report'
  },
  report: ['browser', 'CI'],
  engine: 'puppeteer',
  engineOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  },
  asyncCaptureLimit: 5,    // Parallel captures
  asyncCompareLimit: 50,
  debug: false,
  debugWindow: false
};

// Summary
console.log(`[backstop] ${scenarios.length} pages configured`);
console.log(`[backstop] ${scenarios.filter(s => s.viewports.length === 4).length} critical (4 viewports)`);
console.log(`[backstop] ${scenarios.filter(s => s.viewports.length === 2).length} standard (2 viewports)`);
