const fs = require('fs');
const path = require('path');

// Cloudflare has a 100 rule limit, so we use wildcards for directories
const routes = {
  version: 1,
  include: ["/*"],
  exclude: [
    // Root level HTML files that should bypass worker
    "/index.html",
    "/efficiency.html",
    "/lore.html",
    "/favicon.svg",
    "/manifest.json",
    // Static assets
    "/static/*",
    // Subdirectory wildcards
    "/lore/*",
    "/museum/*",
    "/vault/*",
    "/research/*",
    "/.well-known/*"
  ]
};

// Write routes
fs.writeFileSync(
  path.join(__dirname, 'dist', '_routes.json'),
  JSON.stringify(routes)
);
console.log('Created _routes.json with', routes.exclude.length, 'excludes');
