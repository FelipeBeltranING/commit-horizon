import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHole, normalizeOptions, parseBool } from '../src/build.js';

test('parseBool understands the usual spellings', () => {
  assert.equal(parseBool('TRUE', false), true);
  assert.equal(parseBool('off', true), false);
  assert.equal(parseBool('', true), true);
  assert.equal(parseBool(undefined, false), false);
});

test('normalizeOptions validates and fills defaults', () => {
  const o = normalizeOptions({ user: '@octocat', langs: '99', exclude: 'HTML, CSS ,', labels: 'false' });
  assert.equal(o.user, 'octocat');
  assert.equal(o.theme, 'color');
  assert.equal(o.mode, 'disk');
  assert.equal(o.langs, 8);
  assert.deepEqual(o.exclude, ['HTML', 'CSS']);
  assert.equal(o.labels, false);
  assert.equal(o.timeZone, 'UTC');
  assert.throws(() => normalizeOptions({}), /Missing GitHub username/);
  assert.throws(() => normalizeOptions({ user: 'bad--name' }), /Invalid GitHub username/);
  assert.throws(() => normalizeOptions({ user: 'a', theme: 'neon' }), /Unknown theme "neon"/);
  assert.throws(() => normalizeOptions({ user: 'a', timeZone: 'Mars/Base' }), /Unknown time zone/);
  assert.equal(normalizeOptions({ demo: 'true' }).user, 'demo-astronaut');
});

test('buildHole renders the demo in both modes', async () => {
  const disk = await buildHole({ demo: true });
  assert.match(disk.svg, /^<svg/);
  assert.equal(disk.partial, false);
  assert.ok(disk.stats.total > 0);
  const langs = await buildHole({ demo: true, mode: 'languages', langs: 3 });
  assert.equal(langs.languages.length, 3);
  assert.equal((langs.svg.match(/class="pv"/g) ?? []).length, 3);
});

test('a languages failure is partial, not fatal', async () => {
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      if (String(url).includes('/contributions')) {
        return new Response('<td data-date="2026-11-18" id="d0"></td><tool-tip for="d0">3 contributions on a day.</tool-tip>');
      }
      if (String(url).includes('/repos')) return new Response('{}', { status: 403 });
      return new Response('{"public_repos":2}');
    };
    const r = await buildHole({ user: 'someone', token: '', mode: 'languages' });
    assert.equal(r.partial, true);
    assert.match(r.warnings[0], /rate limit/);
    assert.match(r.svg, /rate limit/); // the note is inside the SVG
  } finally {
    globalThis.fetch = realFetch;
  }
});
