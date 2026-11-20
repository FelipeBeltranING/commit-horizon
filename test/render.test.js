import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoData } from '../src/demo.js';
import { renderSVG } from '../src/render.js';
import { computeStats, localDate, toWeeks } from '../src/stats.js';
import { hashString, mulberry32 } from '../src/prng.js';
import { fetchUserData, parseContributionsHtml } from '../src/github.js';

const today = new Date('2026-10-31T12:00:00Z');

test('prng is deterministic', () => {
  const a = mulberry32(hashString('felipe'));
  const b = mulberry32(hashString('felipe'));
  for (let i = 0; i < 10; i++) assert.equal(a(), b());
});

test('toWeeks groups Sunday-first', () => {
  const weeks = toWeeks([
    { date: '2026-10-24', count: 1 }, // Sat
    { date: '2026-10-25', count: 2 }, // Sun
    { date: '2026-10-26', count: 0 }, // Mon
  ]);
  assert.equal(weeks.length, 2);
  assert.equal(weeks[1][0].date, '2026-10-25');
});

test('streaks: empty today does not break the current streak', () => {
  const days = [
    { date: '2026-10-25', count: 3 },
    { date: '2026-10-26', count: 0 },
    { date: '2026-10-27', count: 1 },
    { date: '2026-10-28', count: 2 },
    { date: '2026-10-29', count: 5 },
    { date: '2026-10-30', count: 0 },
  ];
  const s = computeStats(toWeeks(days));
  assert.equal(s.currentStreak, 3);
  assert.equal(s.longestStreak, 3);
  assert.equal(s.total, 11);
  assert.equal(s.best.date, '2026-10-29');
});

test('demo covers ~53 weeks ending today', () => {
  const d = demoData({ today });
  const days = d.weeks.flat();
  assert.ok(d.weeks.length >= 52 && d.weeks.length <= 54);
  assert.equal(days.at(-1).date, '2026-10-31');
});

test('svg is valid-looking, script-free, small and deterministic', () => {
  const data = demoData({ today });
  const a = renderSVG(data, { theme: 'color' });
  const b = renderSVG(data, { theme: 'color' });
  assert.equal(a, b);
  assert.match(a, /^<svg[\s\S]*<\/svg>\s*$/);
  assert.doesNotMatch(a, /<script/i);
  assert.ok(Buffer.byteLength(a) < 300 * 1024, 'under 300 KB');
  const rings = a.match(/class="o"/g) ?? [];
  assert.equal(rings.length, data.weeks.slice(-53).length);
  assert.match(a, /class="pulse"/); // today
  assert.match(a, /class="flare"/); // best day
});

test('bw theme has no warm colors', () => {
  const svg = renderSVG(demoData({ today }), { theme: 'bw' });
  assert.doesNotMatch(svg, /#ff8f3d|#ffb45e/);
});

test('user name is escaped', () => {
  const data = { ...demoData({ today }), user: '<x>&' };
  assert.match(renderSVG(data), /@&lt;x&gt;&amp;/);
});

test('parses the public contributions page', () => {
  const html = `
    <td data-date="2026-10-29" id="contribution-day-component-4-52" data-level="2" class="ContributionCalendar-day"></td>
    <td data-date="2026-10-30" id="contribution-day-component-5-52" data-level="0" class="ContributionCalendar-day"></td>
    <tool-tip for="contribution-day-component-4-52" class="sr-only">1,204 contributions on October 29th.</tool-tip>
    <tool-tip for="contribution-day-component-5-52" class="sr-only">No contributions on October 30th.</tool-tip>`;
  assert.deepEqual(parseContributionsHtml(html), [
    { date: '2026-10-29', count: 1204 },
    { date: '2026-10-30', count: 0 },
  ]);
});

test('localDate follows the time zone and rejects unknown zones', () => {
  const now = new Date('2026-11-20T01:35:00Z'); // 20:35 in Bogotá
  assert.equal(localDate('UTC', now), '2026-11-20');
  assert.equal(localDate('America/Bogota', now), '2026-11-19');
  assert.throws(() => localDate('Mars/Olympus_Mons', now), /Unknown time zone/);
});

test('the UTC "tomorrow" of the public page does not break the streak', async () => {
  const realFetch = globalThis.fetch;
  const cell = (date, i) => `<td data-date="${date}" id="d${i}" class="ContributionCalendar-day"></td>`;
  const tip = (i, n) => `<tool-tip for="d${i}">${n ? `${n} contributions` : 'No contributions'} on a day.</tool-tip>`;
  const counts = [['2026-11-15', 4], ['2026-11-16', 40], ['2026-11-17', 4], ['2026-11-18', 3], ['2026-11-19', 0], ['2026-11-20', 0]];
  const html = counts.map(([d], i) => cell(d, i)).join('') + counts.map(([, n], i) => tip(i, n)).join('');
  try {
    globalThis.fetch = async (url) =>
      String(url).includes('/contributions') ? new Response(html) : new Response('{"public_repos":13}');
    const now = new Date('2026-11-20T01:35:00Z');
    const utc = await fetchUserData('someone', { token: '', timeZone: 'UTC', now });
    const bog = await fetchUserData('someone', { token: '', timeZone: 'America/Bogota', now });
    assert.equal(computeStats(utc.weeks).currentStreak, 0);
    assert.equal(computeStats(bog.weeks).currentStreak, 4);
    assert.equal(bog.weeks.flat().at(-1).date, '2026-11-19');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('quiet years get more visible dust; dormant holes get no extra glow', () => {
  const year = (active) =>
    Array.from({ length: 364 }, (_, k) => ({
      date: new Date(Date.UTC(2025, 10, 30) + k * 86400000).toISOString().slice(0, 10),
      count: k % Math.ceil(364 / Math.max(1, active)) === 0 && active ? 3 : 0,
    }));
  const dust = (svg) => [...svg.matchAll(/r="([\d.]+)" fill="#[0-9a-f]{6}" fill-opacity="([\d.]+)"\/>/g)].filter((m) => Number(m[1]) < 2);
  const busyish = renderSVG({ user: 'a', repos: 5, weeks: toWeeks(year(300)) });
  const quiet = renderSVG({ user: 'a', repos: 5, weeks: toWeeks(year(20)) });
  const dormant = renderSVG({ user: 'a', repos: 5, weeks: toWeeks(year(0)) });
  assert.ok(Number(dust(quiet)[0][2]) > Number(dust(busyish)[0][2]), 'quiet dust is brighter');
  assert.ok(Number(dust(quiet)[0][1]) > Number(dust(busyish)[0][1]), 'quiet dust is bigger');
  assert.match(dormant, /stop-color="[^"]+" stop-opacity="0\.9"\/>/); // haze not boosted
  assert.doesNotMatch(quiet, /stop-opacity="0\.9"\/>\n<stop offset="[\d.]+" stop-color="[^"]+" stop-opacity="0\.6"/);
});
