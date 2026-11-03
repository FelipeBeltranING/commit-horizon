import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeIcon } from '../src/icons.js';
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

