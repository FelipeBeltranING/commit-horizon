// npm run preview  →  http://localhost:4321
// In VS Code: Ctrl+Shift+P → "Simple Browser: Show" → paste the URL.
// Every reload re-renders, so you can edit src/render.js and refresh.
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { previewPage } from './page.js';

const PORT = Number(process.env.PORT) || 4321;
const cache = new Map(); // user -> { at, promise }
const TIME_ZONE = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

async function load(user) {
  // Re-import on each request so edits to src/ show up without restarting.
  const bust = `?t=${Date.now()}`;
  const imp = (p) => import(pathToFileURL(resolve(p)).href + bust);
  const [{ renderSVG }, { demoData }, { fetchUserData }, { withIcons }, { demoLanguages, fetchLanguages }] =
    await Promise.all([
      imp('src/render.js'),
      imp('src/demo.js'),
      imp('src/github.js'),
      imp('src/icons.js'),
      imp('src/languages.js'),
    ]);
  if (!user) return { renderSVG, data: demoData(), languages: withIcons(demoLanguages()), langError: null };

  // The page loads 3 images at once: share ONE in-flight fetch per user so we
  // don't triple the GitHub requests (and hit the 60/hour unauthenticated limit).
  let hit = cache.get(user);
  if (!hit || Date.now() - hit.at > 10 * 60 * 1000) {
    const promise = Promise.all([
      fetchUserData(user, { timeZone: TIME_ZONE }),
      fetchLanguages(user).then(
        (langs) => ({ langs, langError: langs.length ? null : 'no languages found in public non-fork repos' }),
        (err) => ({ langs: [], langError: err.message }),
      ),
    ]);
    hit = { at: Date.now(), promise };
    cache.set(user, hit);
    promise
      .then(([, l]) => l.langError && console.warn(`ⓘ languages for ${user}: ${l.langError}`))
      .catch(() => cache.delete(user));
  }
  const [data, { langs, langError }] = await hit.promise;
  return { renderSVG, data, languages: withIcons(langs), langError };
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const user = (url.searchParams.get('user') || '').trim();
  try {
    if (url.pathname === '/hole.svg') {
      const theme = url.searchParams.get('theme') === 'bw' ? 'bw' : 'color';
      const mode = url.searchParams.get('mode') === 'languages' ? 'languages' : 'disk';
      const { renderSVG, data, languages, langError } = await load(user);
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
      const langOpts = mode === 'languages' ? { languages, note: langError && `languages: ${langError}` } : {};
      return res.end(renderSVG(data, { theme, ...langOpts }));
    }
    if (url.pathname === '/') {
      const q = user ? `user=${encodeURIComponent(user)}&` : '';
      const t = Date.now();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(
        previewPage({
          color: `/hole.svg?${q}theme=color&t=${t}`,
          bw: `/hole.svg?${q}theme=bw&t=${t}`,
          languages: `/hole.svg?${q}mode=languages&t=${t}`,
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
