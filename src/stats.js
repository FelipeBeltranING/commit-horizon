// Turns a flat list of days into Sunday-first weeks and computes the numbers
// the renderer needs (streaks, best day, a robust scale, recent activity).

/** @typedef {{ date: string, count: number }} Day */

export function toWeeks(days) {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : 1));
  const weeks = [];
  let current = null;
  for (const d of sorted) {
    const weekday = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    if (!current || weekday === 0) {
      current = [];
      weeks.push(current);
    }
    current.push({ date: d.date, count: Math.max(0, Number(d.count) || 0) });
  }
  return weeks;
}

/**
 * Today's date (YYYY-MM-DD) in an IANA time zone, e.g. 'America/Bogota'.
 * Throws a readable error for an unknown zone.
 */
export function localDate(timeZone = 'UTC', now = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    throw new Error(`Unknown time zone: ${timeZone} (use an IANA name like America/Bogota)`);
  }
}

/**
 * GitHub's public contributions page is bucketed in UTC, so in the evening west of
 * UTC it already shows an empty "tomorrow". Dropping the days after the local today
 * keeps that empty day from breaking the current streak.
 */
export function dropFutureDays(days, today) {
  return today ? days.filter((d) => d.date <= today) : days;
}

export function percentile(values, p) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))));
  return s[idx];
}

export function computeStats(weeks) {
  const days = weeks.flat();
  const total = days.reduce((acc, d) => acc + d.count, 0);

  // Current streak: today may still be empty without breaking the streak.
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i--;
  let currentStreak = 0;
  while (i >= 0 && days[i].count > 0) {
    currentStreak++;
    i--;
  }

  let longestStreak = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > longestStreak) longestStreak = run;
  }

  let best = null;
  for (const d of days) if (d.count > 0 && (!best || d.count > best.count)) best = d;

  const nonZero = days.filter((d) => d.count > 0).map((d) => d.count);
  const scale = Math.max(1, percentile(nonZero, 0.95));

  const last30 = days.slice(-30);
  const activeLast30 = last30.filter((d) => d.count > 0).length;

  return {
    total,
    currentStreak,
    longestStreak,
    best,
    scale,
    activeDays: nonZero.length,
    activeLast30,
    today: days.length ? days[days.length - 1].date : null,
  };
}
