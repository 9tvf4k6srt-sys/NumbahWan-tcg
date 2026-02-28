const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.txt': 'text/plain',
  '.xml': 'application/xml', '.manifest': 'application/manifest+json',
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'RenderView/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // === IKEA SEARCH API PROXY ===
  if (url.pathname === '/api/ikea-search') {
    const query = url.searchParams.get('q') || 'sofa';
    const size = url.searchParams.get('size') || '20';
    const ikeaUrl = `https://sik.search.blue.cdtapps.com/us/en/search-result-page?q=${encodeURIComponent(query)}&size=${size}&types=PRODUCT`;
    
    try {
      const result = await fetchUrl(ikeaUrl);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1 hour
      res.writeHead(result.status);
      res.end(result.data);
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'IKEA API unavailable', message: err.message }));
    }
    return;
  }

  // === IKEA PRODUCT DETAIL PROXY ===
  if (url.pathname === '/api/ikea-product') {
    const id = url.searchParams.get('id');
    if (!id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing id parameter' }));
    }
    const ikeaUrl = `https://sik.search.blue.cdtapps.com/us/en/product/${id}`;
    try {
      const result = await fetchUrl(ikeaUrl);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.writeHead(result.status);
      res.end(result.data);
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'IKEA API unavailable' }));
    }
    return;
  }

  // === STATIC FILE SERVING (with clean URLs) ===
  let filePath = url.pathname;
  
  // Clean URL support: /renderview -> /renderview.html
  let fullPath = path.join(DIST_DIR, filePath);
  
  // Security: prevent directory traversal
  if (!fullPath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  // Try exact file first
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    // serve it
  } 
  // Try with .html extension
  else if (fs.existsSync(fullPath + '.html')) {
    fullPath = fullPath + '.html';
  }
  // Try index.html in directory
  else if (fs.existsSync(path.join(fullPath, 'index.html'))) {
    fullPath = path.join(fullPath, 'index.html');
  }
  // Fallback to index.html for SPA
  else {
    fullPath = path.join(DIST_DIR, 'index.html');
  }

  try {
    const ext = path.extname(fullPath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(fullPath);
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`RenderView server running on http://0.0.0.0:${PORT}`);
  console.log(`  - Static files: ${DIST_DIR}`);
  console.log(`  - IKEA API proxy: /api/ikea-search?q=sofa`);
  console.log(`  - Clean URLs: /renderview -> /renderview.html`);
});
