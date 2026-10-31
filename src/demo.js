// Believable fake contribution data so the widget can be previewed offline.
import { hashString, mulberry32 } from './prng.js';
import { toWeeks } from './stats.js';

const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);

export function demoData({ user = 'demo-astronaut', today = new Date(), repos = 42 } = {}) {
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  let start = end - 364 * DAY;
  start -= new Date(start).getUTCDay() * DAY; // back to Sunday, like GitHub's calendar

  const rnd = mulberry32(hashString(`${user}|${iso(end)}|demo`));
  const n = Math.round((end - start) / DAY) + 1;

  // Two "vacations" with no activity.
  const gaps = [
    [Math.floor(n * 0.18), 9],
    [Math.floor(n * 0.55), 12],
  ];
  const inGap = (k) => gaps.some(([s, len]) => k >= s && k < s + len);

  const days = [];
  for (let k = 0; k < n; k++) {
    const t = k / n;
    const weekday = new Date(start + k * DAY).getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    // Slow seasonal waves + a trend that grows towards today.
    const intensity = 0.35 + 0.25 * Math.sin(t * 9.5) + 0.2 * Math.sin(t * 23 + 1) + 0.45 * t;
    let p = Math.min(0.95, Math.max(0.05, intensity * (weekend ? 0.55 : 1)));
    let count = 0;
    if (!inGap(k) && rnd() < p) {
      const mean = 1.5 + 6 * Math.max(0, intensity);
      count = 1 + Math.floor(-Math.log(1 - rnd()) * mean);
    }
    if (k >= n - 17) count = Math.max(count, 1 + Math.floor(rnd() * 6)); // a live streak
    days.push({ date: iso(start + k * DAY), count });
  }
  // One legendary day.
  const legend = Math.floor(n * 0.71);
  days[legend].count = 38;

  return { user, repos, weeks: toWeeks(days) };
}
