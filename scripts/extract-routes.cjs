#!/usr/bin/env node
/**
 * Route Extraction Script — Splits index.tsx monolith into domain modules
 * Run: node scripts/extract-routes.cjs
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const INDEX = path.join(SRC, 'index.tsx');
const ROUTES = path.join(SRC, 'routes');

const content = fs.readFileSync(INDEX, 'utf8');
const lines = content.split('\n');

// Define extraction domains: { name, filePrefix, routePrefix, startLine, endLine }
// We identify them by looking for section headers and route patterns
const EXTRACTIONS = [
  { name: 'market', prefix: '/api/market', startPattern: 'MARKET API', endPattern: 'CARD DATABASE API', mountPath: '/api/market' },
  { name: 'card-db', prefix: '/api/cards', startPattern: 'CARD DATABASE API', endPattern: 'ADMIN CARD API', mountPath: '/api' },
  { name: 'admin-cards', prefix: '/api/admin', startPattern: 'ADMIN CARD API', endPattern: 'WALLET & ECONOMY API', mountPath: '/api/admin' },
  { name: 'wallet-economy', prefix: '/api/wallet', startPattern: 'WALLET & ECONOMY API', endPattern: 'LIVE MARKET PRICES', mountPath: '/api' },
  { name: 'market-prices', prefix: '/api/market-prices', startPattern: 'LIVE MARKET PRICES', endPattern: 'AUTO-LEARNING', mountPath: '/api' },
  { name: 'auto-learn', prefix: '/api/system', startPattern: 'AUTO-LEARNING', endPattern: 'GAMIFICATION SYSTEM', mountPath: '/api' },
  { name: 'gamification', prefix: '/api/game', startPattern: 'GAMIFICATION SYSTEM', endPattern: 'CARD-NWG BRIDGE', mountPath: '/api/game' },
  { name: 'card-bridge', prefix: '/api/card-bridge', startPattern: 'CARD-NWG BRIDGE', endPattern: 'PURCHASE API', mountPath: '/api/card-bridge' },
  { name: 'purchase', prefix: '/api/purchase', startPattern: 'PURCHASE API', endPattern: 'UTILITY ECOSYSTEM', mountPath: '/api/purchase' },
  { name: 'utility', prefix: '/api/events', startPattern: 'UTILITY ECOSYSTEM', endPattern: 'SHRINE API', mountPath: '/api' },
  { name: 'shrine', prefix: '/api/shrine', startPattern: 'SHRINE API', endPattern: 'CARD ENGINE API', mountPath: '/api/shrine' },
  { name: 'card-engine', prefix: '/api/card-engine', startPattern: 'CARD ENGINE API', endPattern: 'export default', mountPath: '/api/card-engine' },
  { name: 'physical', prefix: '/api/physical', startPattern: 'PHYSICAL CARD CLAIM', endPattern: 'AVATAR STUDIO', mountPath: '/api/physical' },
  { name: 'avatar', prefix: '/api/avatar', startPattern: 'AVATAR STUDIO', endPattern: 'AI GUIDE API', mountPath: '/api/avatar' },
  { name: 'guide', prefix: '/api/guide', startPattern: 'AI GUIDE API', endPattern: 'This API translates', mountPath: '/api/guide' },
  { name: 'translate', prefix: '/api/translate', startPattern: 'This API translates', endPattern: 'GM VERIFICATION', mountPath: '/api' },
  { name: 'gm', prefix: '/api/gm', startPattern: 'GM VERIFICATION', endPattern: null, mountPath: '/api/gm' },
];

function findLine(pattern, startFrom = 0) {
  for (let i = startFrom; i < lines.length; i++) {
    if (lines[i].includes(pattern)) return i;
  }
  return -1;
}

// Find actual line ranges
for (const ex of EXTRACTIONS) {
  ex.startLine = findLine(ex.startPattern);
  if (ex.endPattern) {
    ex.endLine = findLine(ex.endPattern, ex.startLine + 1);
    if (ex.endLine === -1) ex.endLine = lines.length;
    // Back up to before the next section header
    while (ex.endLine > ex.startLine && lines[ex.endLine - 1].match(/^\/\/ =+$/)) ex.endLine--;
    ex.endLine -= 1;
  } else {
    ex.endLine = lines.length - 1;
  }
  
  if (ex.startLine === -1) {
    console.log(`SKIP: ${ex.name} — pattern "${ex.startPattern}" not found`);
    continue;
  }
  
  const sectionLines = lines.slice(ex.startLine, ex.endLine + 1);
  const handlers = sectionLines.filter(l => l.match(/^\s*app\.(get|post|put|delete|all)\s*\(/)).length;
  console.log(`  ${ex.name.padEnd(20)} lines ${ex.startLine}-${ex.endLine} (${ex.endLine - ex.startLine + 1} lines, ${handlers} handlers)`);
}

// Generate route files
let extractedCount = 0;
const routeImports = [];
const routeMounts = [];

for (const ex of EXTRACTIONS) {
  if (ex.startLine === -1) continue;
  
  const sectionLines = lines.slice(ex.startLine, ex.endLine + 1);
  const sectionCode = sectionLines.join('\n');
  
  // Skip if no actual route handlers
  if (!sectionCode.match(/app\.(get|post|put|delete)\s*\(/)) continue;
  
  // Replace app.xxx with router.xxx
  let routerCode = sectionCode.replace(/\bapp\.(get|post|put|delete|all)\s*\(/g, 'router.$1(');
  
  // Strip the route prefix from paths (since it'll be mounted with that prefix)
  // e.g., router.get('/api/market/listings' → router.get('/listings'
  if (ex.mountPath !== '/api') {
    const prefix = ex.mountPath;
    routerCode = routerCode.replace(new RegExp(`router\\.(get|post|put|delete|all)\\('${prefix.replace(/\//g, '\\/')}`, 'g'), "router.$1('");
  } else {
    // For /api mount, keep full paths  
  }
  
  // Build the file
  const fileName = `${ex.name}.ts`;
  const varName = ex.name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + 'Routes';
  
  const fileContent = `/**
 * ${ex.name} Routes — Extracted from index.tsx monolith
 * Auto-generated by scripts/extract-routes.cjs
 */
import { Hono } from 'hono'

type Bindings = { GUILD_DB: D1Database; MARKET_CACHE: KVNamespace }
const router = new Hono<{ Bindings: Bindings }>()

${routerCode}

export default router;
`;
  
  const outPath = path.join(ROUTES, fileName);
  // Don't overwrite existing extracted routes
  if (fs.existsSync(outPath)) {
    console.log(`  EXISTS: ${fileName} — skipping`);
  } else {
    fs.writeFileSync(outPath, fileContent);
    console.log(`  WROTE: ${fileName}`);
  }
  
  routeImports.push(`import ${varName} from './${ex.name}'`);
  routeMounts.push(`app.route('${ex.mountPath}', ${varName})`);
  extractedCount++;
}

console.log(`\nExtracted ${extractedCount} route modules.`);
console.log('\nAdd to src/routes/index.ts:');
routeImports.forEach(i => console.log('  ' + i));
console.log('\nMount in src/index.tsx:');
routeMounts.forEach(m => console.log('  ' + m));
