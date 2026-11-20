import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { errorSvg, optionsFromQuery } from '../api/hole.js';

function call(query) {
  return new Promise((resolve) => {
    const headers = {};
    const res = {
      statusCode: 0,
      setHeader: (k, v) => (headers[k.toLowerCase()] = v),
      end: (body) => resolve({ status: res.statusCode, headers, body }),
    };
    handler({ query }, res);
  });
}

test('demo renders an SVG with a long edge cache', async () => {
  const r = await call({ demo: '1', mode: 'languages' });
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /image\/svg\+xml/);
  assert.match(r.headers['cache-control'], /s-maxage=14400/);
  assert.match(r.body, /^<svg/);
  assert.match(r.body, /class="pv"/);
});

test('missing or bad input answers 400 with an error image', async () => {
  const missing = await call({});
  assert.equal(missing.status, 400);
  assert.match(missing.body, /Add \?user=your-github-username/);
  const bad = await call({ user: 'octocat', theme: 'neon' });
  assert.equal(bad.status, 400);
  assert.match(bad.body, /Unknown theme &#34;neon&#34;/);
  assert.match(bad.headers['cache-control'], /max-age=300/);
});

test('short query names map to the build options', () => {
  const o = optionsFromQuery({ user: 'a', bg: 'transparent', tz: 'America/Bogota' });
  assert.equal(o.background, 'transparent');
  assert.equal(o.timeZone, 'America/Bogota');
});

test('error image escapes and truncates the message', () => {
  const svg = errorSvg(`<script>${'x'.repeat(200)}`);
  assert.doesNotMatch(svg, /<script/);
  assert.match(svg, /&#60;script/);
  assert.ok(svg.length < 1200);
});
