const fs = require('fs');
const path = require('path');

// Cloudflare has a 100 rule limit — use wildcards, never enumerate HTML files
const routes = {
  version: 1,
  include: ["/*"],
  exclude: [
    "/static/*",
    "/lore/*",
    "/museum/*",
    "/vault/*",
    "/research/*",
    "/tabletop/*",
    "/.well-known/*",
    "/_headers",
    "/favicon.ico",
    "/favicon.svg",
    "/robots.txt",
    "/sitemap.xml",
    "/llms.txt",
    "/llms-full.txt"
  ]
};

// Write routes
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  fs.writeFileSync(
    path.join(distDir, '_routes.json'),
    JSON.stringify(routes, null, 2)
  );
  console.log(`Created _routes.json (${routes.include.length} include, ${routes.exclude.length} exclude)`);
} else {
  console.warn('dist/ not found — skipping _routes.json');
}
