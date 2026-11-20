#!/usr/bin/env node
// Local preview of the web generator, same routes as Vercel: npm run dev → http://localhost:3000
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const PORT = Number(process.env.PORT ?? 3000);
const PUBLIC = new URL('../public/', import.meta.url);
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/api/hole') {
    // Re-import on every request so edits to src/ show up without restarting.
    const { default: handler } = await import(`../api/hole.js?t=${Date.now()}`);
    return handler({ query: Object.fromEntries(url.searchParams), url: req.url }, res);
  }
  const path = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  if (path.includes('..')) return res.writeHead(400).end();
  try {
    const body = await readFile(new URL(path, PUBLIC));
    res.writeHead(200, { 'Content-Type': `${TYPES[extname(path)] ?? 'application/octet-stream'}; charset=utf-8` });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(PORT, () => console.log(`🕳️  Commit Horizon web → http://localhost:${PORT}`));
