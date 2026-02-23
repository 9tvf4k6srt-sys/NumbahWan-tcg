// game-screenshot-server.cjs
// Starts a tiny server on port 3001 that serves pre-captured game screenshots
// Usage: node game-screenshot-server.cjs
// Then: curl http://localhost:3001/screenshots  -> list available shots
//       GET http://localhost:3001/shot/spawn.png -> get specific screenshot

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const SHOTS_DIR = path.join(__dirname, 'test-output');

// Ensure output dir
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/screenshots' || url.pathname === '/') {
    const files = fs.readdirSync(SHOTS_DIR).filter(f => f.endsWith('.png'));
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({screenshots: files, count: files.length}));
    return;
  }

  if (url.pathname.startsWith('/shot/')) {
    const name = url.pathname.slice(6);
    const filePath = path.join(SHOTS_DIR, name);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, {'Content-Type':'image/png'});
      res.end(fs.readFileSync(filePath));
    } else {
      res.writeHead(404, {'Content-Type':'text/plain'});
      res.end('Not found: ' + name);
    }
    return;
  }

  // Gallery page
  if (url.pathname === '/gallery') {
    const files = fs.readdirSync(SHOTS_DIR).filter(f => f.endsWith('.png'));
    let html = '<!DOCTYPE html><html><head><title>Screenshots</title><style>body{background:#111;color:#ccc;font-family:Arial;}img{max-width:640px;border:1px solid #444;margin:4px;}</style></head><body>';
    html += '<h1>Game Screenshots</h1>';
    for (const f of files) {
      html += `<div><img src="/shot/${f}"><br><small>${f}</small></div>`;
    }
    html += '</body></html>';
    res.writeHead(200, {'Content-Type':'text/html'});
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Screenshot server running at http://0.0.0.0:${PORT}`);
  console.log(`Gallery: http://localhost:${PORT}/gallery`);
  console.log(`API: http://localhost:${PORT}/screenshots`);
});
