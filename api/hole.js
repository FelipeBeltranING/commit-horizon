// Serverless endpoint (Vercel): GET /api/hole?user=octocat&mode=languages&theme=color&tz=America/Bogota
// Returns the black hole SVG, cached at the edge so GitHub's image proxy can embed it.
import { buildHole } from '../src/build.js';

const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A small SVG in the same style, so a broken README image still says what went wrong. */
export function errorSvg(message) {
  const text = String(message).slice(0, 90); // cut before escaping, never inside an entity
  const w = Math.max(320, Math.round(text.length * 6.8) + 96);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="64" viewBox="0 0 ${w} 64" role="img" aria-label="${esc(text)}" data-commit-horizon-error="true">` +
    `<rect width="${w}" height="64" rx="12" fill="#03040a"/>` +
    `<circle cx="36" cy="32" r="13" fill="#000" stroke="#ffb45e" stroke-width="1.5"/>` +
    `<ellipse cx="36" cy="32" rx="22" ry="4" fill="none" stroke="#ff8f3d" stroke-opacity=".6" stroke-dasharray="2 3"/>` +
    `<text x="68" y="36" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="12" fill="#e9edf6">${esc(text)}</text></svg>`
  );
}

function send(res, status, body, cache) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(body);
}

/** Query string → buildHole options. Short names keep README URLs readable. */
export function optionsFromQuery(q) {
  return {
    user: q.user,
    demo: q.demo,
    theme: q.theme,
    background: q.background ?? q.bg,
    mode: q.mode,
    style: q.style,
    langs: q.langs,
    exclude: q.exclude,
    labels: q.labels,
    timeZone: q.tz ?? q.timezone,
    token: process.env.GITHUB_TOKEN || '',
  };
}

export default async function handler(req, res) {
  const q = req.query ?? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
  if (!q.user && !q.demo) {
    return send(res, 400, errorSvg('Add ?user=your-github-username'), 'public, max-age=300');
  }
  try {
    const { svg, partial } = await buildHole(optionsFromQuery(q));
    // Contributions change during the day: refresh every few hours, serve stale while revalidating.
    // A partial hole (e.g. languages rate limited) is retried soon instead of sticking for hours.
    const cache = partial ? 'public, max-age=300' : 'public, max-age=3600, s-maxage=14400, stale-while-revalidate=86400';
    return send(res, 200, svg, cache);
  } catch (err) {
    const message = /fetch failed|ENOTFOUND|ETIMEDOUT|timeout/i.test(err.message)
      ? 'Could not reach GitHub, try again in a minute'
      : err.message;
    const bad = /^(Invalid|Missing|Unknown)/.test(message);
    return send(res, bad ? 400 : 200, errorSvg(message), 'public, max-age=300');
  }
}
