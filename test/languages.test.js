import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pngIcon, sanitizeIcon } from '../src/icons.js';
import { demoLanguages, topLanguages } from '../src/languages.js';
import { demoData } from '../src/demo.js';
import { renderSVG } from '../src/render.js';

const today = new Date('2026-10-31T12:00:00Z');

// A generic test icon (not a real logo) with the tricky bits real exports have.
const FIXTURE = `<?xml version="1.0"?><!-- exported -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" onload="alert(1)">
<style>.st0{fill:url(#grad)} .st1{opacity:.5}</style>
<defs><linearGradient id="grad"><stop offset="0" stop-color="#fff"/></linearGradient></defs>
<script>alert(1)</script>
<path class="st0 st1" d="M0 0h10v10z"/><use xlink:href="#grad"/><image href="https://evil.example/x.png"/>
</svg>`;

test('sanitizeIcon namespaces ids, classes and strips scripts', () => {
  const icon = sanitizeIcon(FIXTURE, 'ci3');
  assert.equal(icon.viewBox, '0 0 128 128');
  assert.match(icon.body, /id="ci3-grad"/);
  assert.match(icon.body, /url\(#ci3-grad\)/);
  assert.match(icon.body, /xlink:href="#ci3-grad"/);
  assert.match(icon.body, /class="ci3-st0 ci3-st1"/);
  assert.match(icon.body, /\.ci3-st0\{/);
  assert.match(icon.body, /opacity:\.5/); // numbers untouched
  assert.doesNotMatch(icon.body, /<script|onload|evil\.example/);
});

test('topLanguages sorts, limits, excludes and computes shares', () => {
  const langs = topLanguages({ HTML: 900, Python: 300, Go: 100, CSS: 50 }, { limit: 2, exclude: ['html'] });
  assert.deepEqual(
    langs.map((l) => l.name),
    ['Python', 'Go'],
  );
  assert.ok(Math.abs(langs[0].share - 300 / 450) < 1e-9);
  assert.match(langs[0].color, /^#/);
});

test('languages mode renders one orbit per language, front and back copies', () => {
  const languages = demoLanguages({ limit: 4 }).map((l, i) => ({
    ...l,
    icon: i === 0 ? sanitizeIcon(FIXTURE, 'ci0') : null,
  }));
  const svg = renderSVG(demoData({ today }), { languages });
  for (let i = 0; i < 4; i++) assert.match(svg, new RegExp(`@keyframes x${i}\\{`));
  assert.equal((svg.match(/class="pv"/g) ?? []).length, 4);
  assert.equal((svg.match(/class="bk"/g) ?? []).length, 4);
  assert.match(svg, /viewBox="0 0 128 128"/); // inlined icon
  assert.match(svg, />JS</); // fallback initials for JavaScript
  assert.doesNotMatch(svg, /<script/i);
  assert.ok(Buffer.byteLength(svg) < 300 * 1024);
});

test('disk mode is unchanged when no languages are given', () => {
  const svg = renderSVG(demoData({ today }));
  assert.doesNotMatch(svg, /class="pv"/);
});

test('fetchLanguages without token: one request, forks skipped, clear rate-limit error', async () => {
  const { fetchLanguages } = await import('../src/languages.js');
  const realFetch = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => {
      calls++;
      return new Response(
        JSON.stringify([
          { fork: false, language: 'Python', size: 300 },
          { fork: false, language: 'GDScript', size: 100 },
          { fork: true, language: 'Rust', size: 9000 },
          { fork: false, language: null, size: 50 },
        ]),
        { status: 200 },
      );
    };
    const langs = await fetchLanguages('someone', { token: '' });
    assert.equal(calls, 1);
    assert.deepEqual(langs.map((l) => l.name), ['Python', 'GDScript']);

    globalThis.fetch = async () => new Response('{}', { status: 403 });
    await assert.rejects(fetchLanguages('someone', { token: '' }), /rate limit/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('logos style (default) has no planet discs; planets style keeps them', () => {
  const languages = demoLanguages({ limit: 3 }).map((l) => ({ ...l, icon: sanitizeIcon(FIXTURE, 'ci0') }));
  const logos = renderSVG(demoData({ today }), { languages });
  assert.match(logos, /class="sw"/);
  assert.doesNotMatch(logos, /url\(#pg0\)/);
  const planets = renderSVG(demoData({ today }), { languages, style: 'planets' });
  assert.match(planets, /url\(#pg0\)/);
});

test('pngIcon embeds a PNG as a data URI with its size', () => {
  // 1x1 transparent PNG
  const buf = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  );
  const icon = pngIcon(buf);
  assert.equal(icon.viewBox, '0 0 1 1');
  assert.match(icon.body, /href="data:image\/png;base64,/);
  assert.equal(pngIcon(Buffer.from('not a png at all, nope')), null);
});
