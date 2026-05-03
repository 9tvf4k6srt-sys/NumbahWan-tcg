const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = '/home/user/webapp';
const PORT = 8765;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

function safeJoin(base, rel) {
  const p = path.normalize(path.join(base, rel));
  if (!p.startsWith(base)) return null;
  return p;
}

function indexHtml() {
  const anchors = path.join(ROOT, 'references/visual-anchors');
  const cats = ['designer-real', 'materials', 'taipei-real', 'imperfection'];
  let html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PINFORGE — Visual Anchors</title>
<style>
body{margin:0;padding:24px;font-family:-apple-system,Inter,system-ui,sans-serif;background:#EFE7D6;color:#1A1612;max-width:1200px;margin:0 auto}
h1{font-family:"Times New Roman",serif;font-weight:500;letter-spacing:.04em;font-size:1.6rem;border-bottom:1px solid #8B6F3A;padding-bottom:10px}
h2{font-family:"Times New Roman",serif;font-weight:500;color:#4A3820;margin-top:32px;font-size:1.15rem;letter-spacing:.06em;text-transform:uppercase}
.muted{color:#6B5E4F;font-size:.85rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin:14px 0}
.tile{background:#F7F1E3;border:1px solid rgba(139,111,58,.22);border-radius:4px;overflow:hidden;display:block;text-decoration:none;color:inherit}
.tile img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;background:#E4D9C2}
.tile .cap{padding:6px 8px;font-size:.7rem;color:#6B5E4F;line-height:1.3;font-family:"JetBrains Mono",monospace;word-break:break-all}
.empty{padding:14px;background:#F7F1E3;border:1px dashed rgba(139,111,58,.4);border-radius:4px;color:#6B5E4F;font-size:.85rem}
nav{margin:14px 0 0;font-size:.8rem;font-family:"JetBrains Mono",monospace;letter-spacing:.06em}
nav a{color:#9B2C2C;margin-right:14px}
.seal{display:inline-block;width:8px;height:8px;border-radius:50%;background:#9B2C2C;margin-right:8px;vertical-align:middle;box-shadow:0 0 0 2px rgba(247,241,227,1)}
</style></head><body>
<h1><span class="seal"></span>PINFORGE — Visual Anchors</h1>
<p class="muted">Real-photo ground-truth library. Every file has provenance in <code>SOURCES.md</code> + a <code>.meta.json</code> sidecar. Ingest tool refuses AI-suspect uploads.</p>
<nav>
  <a href="/lock">VISUAL-LOCK.md</a>
  <a href="/sources">SOURCES.md</a>
  <a href="/readme">README.md</a>
</nav>`;
  for (const cat of cats) {
    const dir = path.join(anchors, cat);
    const files = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      : [];
    html += `<h2>${cat} <span class="muted">— ${files.length} file(s)</span></h2>`;
    if (files.length === 0) {
      html += `<div class="empty">empty — pending sourcing</div>`;
    } else {
      html += `<div class="grid">`;
      for (const f of files) {
        const meta = path.join(anchors, '_meta', f + '.meta.json');
        let credit = f;
        try {
          if (fs.existsSync(meta)) {
            const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
            const who = m.source.photographer || m.source.designer || '—';
            const what = m.source.material || m.source.subject || '';
            credit = `${who}${what ? ' · ' + what : ''}`;
          }
        } catch (_) {}
        html += `<a class="tile" href="/img/${cat}/${encodeURIComponent(f)}" target="_blank">
          <img src="/img/${cat}/${encodeURIComponent(f)}" loading="lazy" alt="">
          <div class="cap">${credit}</div>
        </a>`;
      }
      html += `</div>`;
    }
  }
  html += `</body></html>`;
  return html;
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const p = url.pathname;
    if (p === '/' || p === '/index.html') {
      const gallery = path.join(ROOT, 'public/office-gallery.html');
      if (fs.existsSync(gallery)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(gallery));
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(indexHtml());
    }
    if (p === '/invest' || p === '/invest.html') {
      const f = path.join(ROOT, 'public/invest.html');
      if (fs.existsSync(f)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(f));
      }
    }
    // Stock thesis route — /stock, /stock/, /stock/index.html, /stock/?t=NNNN
    // all serve public/stock/index.html (the page reads ?t= client-side).
    if (p === '/stock' || p === '/stock/' || p === '/stock/index.html') {
      const f = path.join(ROOT, 'public/stock/index.html');
      if (fs.existsSync(f)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(f));
      }
    }
    if (p === '/anchors') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(indexHtml());
    }
    if (p === '/lock') {
      const txt = fs.readFileSync(path.join(ROOT, 'references/PINFORGE-VISUAL-LOCK.md'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(txt);
    }
    if (p === '/branch-sg') {
      const txt = fs.readFileSync(path.join(ROOT, 'references/PINFORGE-BRANCH-SG.md'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(txt);
    }
    if (p === '/tells') {
      const txt = fs.readFileSync(path.join(ROOT, 'references/AI-TELLS-GEOGRAPHY.md'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(txt);
    }
    if (p === '/sources') {
      const txt = fs.readFileSync(path.join(ROOT, 'references/visual-anchors/SOURCES.md'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(txt);
    }
    if (p === '/readme') {
      const txt = fs.readFileSync(path.join(ROOT, 'references/visual-anchors/README.md'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(txt);
    }
    // Static room images for the gallery
    if (p.startsWith('/static/')) {
      const file = safeJoin(path.join(ROOT, 'public'), p);
      if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
        const ext = path.extname(file).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': 'public, max-age=300',
        });
        return fs.createReadStream(file).pipe(res);
      }
    }
    if (p.startsWith('/img/')) {
      const rel = decodeURIComponent(p.replace('/img/', ''));
      const file = safeJoin(path.join(ROOT, 'references/visual-anchors'), rel);
      if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
        const ext = path.extname(file).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': 'public, max-age=300',
        });
        return fs.createReadStream(file).pipe(res);
      }
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('error: ' + e.message);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`anchor-preview listening on :${PORT}`);
});
