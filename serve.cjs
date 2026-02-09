#!/usr/bin/env node
/**
 * Local static server for previewing the site.
 * Binds 0.0.0.0 so sandbox proxy can reach it.
 * Handles clean URLs: /showcase -> /showcase.html
 * Zero dependencies — uses Node built-ins only.
 *
 * Usage: node serve.cjs [port]    (default: 8788)
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2] || '8788', 10);
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.ico':  'image/x-icon',
  '.mp3':  'audio/mpeg',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.txt':  'text/plain; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
};

function resolve(urlPath) {
  // Normalize: strip query string and hash
  const clean = urlPath.split('?')[0].split('#')[0];
  
  // Security: prevent directory traversal
  const decoded = decodeURIComponent(clean);
  const relative = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');
  const full = path.join(PUBLIC, relative);
  
  // Must be inside PUBLIC
  if (!full.startsWith(PUBLIC)) return null;

  // 1. Exact file exists
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;

  // 2. Directory: look for index.html
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
    const idx = path.join(full, 'index.html');
    if (fs.existsSync(idx)) return idx;
  }

  // 3. Clean URL: /showcase -> /showcase.html
  const withExt = full + '.html';
  if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) return withExt;

  return null;
}

const server = http.createServer((req, res) => {
  const filePath = resolve(req.url || '/');

  if (!filePath) {
    // Fallback: try index.html (SPA-style)
    const indexPath = path.join(PUBLIC, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[serve] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[serve] Serving: ${PUBLIC}`);
  console.log(`[serve] Try: /showcase, /battle, /cards, etc.`);
});
