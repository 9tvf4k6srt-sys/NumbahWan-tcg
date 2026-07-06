// Simple static server with clean URL routing
// Serves public/ directory with /markets → /markets.html mapping
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.mp3':  'audio/mpeg',
  '.mp4':  'video/mp4',
  '.wav':  'audio/wav',
  '.webm': 'video/webm',
  '.xml':  'application/xml',
  '.txt':  'text/plain; charset=utf-8',
};

function getMime(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  
  // Security: block path traversal
  if (url.includes('..')) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  let filePath = path.join(PUBLIC, url);

  // If file exists directly, serve it (with Range support so <video> can seek)
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const stat = fs.statSync(filePath);
    const range = req.headers.range;
    const baseHeaders = {
      'Content-Type': getMime(filePath),
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes'
    };
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] ? parseInt(m[1], 10) : 0;
      let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
      if (isNaN(start) || isNaN(end) || start > end || start >= stat.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        res.end();
        return;
      }
      end = Math.min(end, stat.size - 1);
      res.writeHead(206, Object.assign({}, baseHeaders, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': end - start + 1
      }));
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, Object.assign({}, baseHeaders, { 'Content-Length': stat.size }));
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Clean URL: /markets → /markets.html
  const htmlPath = filePath + '.html';
  if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
    const content = fs.readFileSync(htmlPath);
    res.writeHead(200, { 
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
    return;
  }

  // Directory: try index.html inside it
  const indexPath = path.join(filePath, 'index.html');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath);
    res.writeHead(200, { 
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
    return;
  }

  // Root
  if (url === '/') {
    const rootIndex = path.join(PUBLIC, 'index.html');
    if (fs.existsSync(rootIndex)) {
      const content = fs.readFileSync(rootIndex);
      res.writeHead(200, { 
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`NW static server running on http://0.0.0.0:${PORT}`);
  console.log(`Serving: ${PUBLIC}`);
  console.log(`Clean URLs enabled: /markets → /markets.html`);
});
