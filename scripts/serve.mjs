import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    // Mirror the repository subpath used by GitHub Pages.
    pathname = pathname.replace(/^\/T-Zero(?=\/|$)/, '') || '/';
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep) || !mime[extname(path)]) {
      res.writeHead(404).end('Not found'); return;
    }
    const file = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] + '; charset=utf-8', 'Cache-Control': 'no-store' }).end(file);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('T-Zero ready at http://127.0.0.1:4173/T-Zero/'));
