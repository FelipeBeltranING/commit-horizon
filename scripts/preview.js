// npm run preview  →  http://localhost:4321
// In VS Code: Ctrl+Shift+P → "Simple Browser: Show" → paste the URL.
// Every reload re-renders, so you can edit src/render.js and refresh.
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { previewPage } from './page.js';

const PORT = Number(process.env.PORT) || 4321;
const cache = new Map(); // user -> { at, data }

async function load(user) {
  // Re-import on each request so edits to src/ show up without restarting.
  const bust = `?t=${Date.now()}`;
  const imp = (p) => import(pathToFileURL(resolve(p)).href + bust);
  const [{ renderSVG }, { demoData }, { fetchUserData }] = await Promise.all([
    imp('src/render.js'),
    imp('src/demo.js'),
    imp('src/github.js'),
  ]);
  if (!user) return { renderSVG, data: demoData() };

  let hit = cache.get(user);
  if (!hit || Date.now() - hit.at > 10 * 60 * 1000) {
    hit = { at: Date.now(), data: await fetchUserData(user) };
    cache.set(user, hit);
  }
  return { renderSVG, data: hit.data };
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const user = (url.searchParams.get('user') || '').trim();
  try {
    if (url.pathname === '/hole.svg') {
      const theme = url.searchParams.get('theme') === 'bw' ? 'bw' : 'color';
      const { renderSVG, data } = await load(user);
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
      return res.end(renderSVG(data, { theme }));
    }
    if (url.pathname === '/') {
      const q = user ? `user=${encodeURIComponent(user)}&` : '';
      const t = Date.now();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(
        previewPage({
          color: `/hole.svg?${q}theme=color&t=${t}`,
          bw: `/hole.svg?${q}theme=bw&t=${t}`,
          user,
          live: true,
        }),
      );
    }
    res.writeHead(404).end('not found');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end(`Error: ${err.message}`);
  }
}).listen(PORT, () => {
  console.log(`🕳️  Commit Horizon preview → http://localhost:${PORT}`);
  console.log(`   real user:            http://localhost:${PORT}/?user=FelipeBeltranING`);
});
