// One pipeline for the CLI, the GitHub Action and the web generator:
// validate the options, fetch (or fake) the data, render the SVG.
import { demoData } from './demo.js';
import { fetchUserData } from './github.js';
import { withIcons } from './icons.js';
import { demoLanguages, fetchLanguages } from './languages.js';
import { BACKGROUNDS, renderSVG, THEME_NAMES } from './render.js';
import { computeStats, localDate } from './stats.js';

export const MODES = ['disk', 'languages'];
export const STYLES = ['logos', 'planets'];
// GitHub usernames: alphanumerics and single hyphens, up to 39 chars.
export const USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** "true", "1", "yes", "on" → true; "false", "0", "no", "off" → false; anything else → fallback. */
export function parseBool(value, fallback) {
  if (typeof value === 'boolean') return value;
  const v = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(v)) return true;
  if (['false', '0', 'no', 'off'].includes(v)) return false;
  return fallback;
}

const oneOf = (name, value, allowed, fallback) => {
  const v = String(value ?? '').trim().toLowerCase() || fallback;
  if (!allowed.includes(v)) throw new Error(`Unknown ${name} "${value}". Use: ${allowed.join(', ')}`);
  return v;
};

/** Validates and normalizes options coming from CLI flags, Action inputs or query strings. */
export function normalizeOptions(raw = {}) {
  const demo = parseBool(raw.demo, false);
  const user = String(raw.user ?? '').trim().replace(/^@/, '');
  if (!demo && !USERNAME.test(user)) {
    throw new Error(user ? `Invalid GitHub username: ${user}` : 'Missing GitHub username');
  }
  const langs = Number.parseInt(raw.langs ?? 6, 10);
  const timeZone = String(raw.timeZone ?? '').trim() || 'UTC';
  localDate(timeZone); // throws a readable error for unknown zones
  return {
    demo,
    user: user || 'demo-astronaut',
    token: raw.token ?? undefined, // '' forces the public endpoints even if GITHUB_TOKEN is set
    theme: oneOf('theme', raw.theme, THEME_NAMES, 'color'),
    background: oneOf('background', raw.background, BACKGROUNDS, 'space'),
    mode: oneOf('mode', raw.mode, MODES, 'disk'),
    style: oneOf('style', raw.style, STYLES, 'logos'),
    langs: Number.isFinite(langs) ? Math.min(8, Math.max(1, langs)) : 6,
    exclude: (Array.isArray(raw.exclude) ? raw.exclude : String(raw.exclude ?? '').split(','))
      .map((s) => s.trim())
      .filter(Boolean),
    labels: parseBool(raw.labels, true),
    timeZone,
  };
}

/**
 * @returns {Promise<{ svg: string, stats: object, languages: object[]|undefined, warnings: string[], partial: boolean, options: object }>}
 *   partial: something optional (the languages) failed and was left out; worth retrying soon.
 */
export async function buildHole(raw) {
  const o = normalizeOptions(raw);
  const warnings = [];
  let partial = false;

  const data = o.demo ? demoData({ user: o.user }) : await fetchUserData(o.user, { token: o.token, timeZone: o.timeZone });

  let languages;
  if (o.mode === 'languages') {
    const opts = { limit: o.langs, exclude: o.exclude };
    try {
      languages = withIcons(o.demo ? demoLanguages(opts) : await fetchLanguages(o.user, { token: o.token, ...opts }));
      if (!languages.length) warnings.push(`no languages found for ${o.user} (only forks, or repos without code)`);
    } catch (err) {
      languages = [];
      partial = true;
      warnings.push(`languages: ${err.message}`);
    }
    const missing = languages.filter((l) => !l.icon).map((l) => l.name);
    if (missing.length) warnings.push(`no logo for: ${missing.join(', ')} (they show initials)`);
  }

  const svg = renderSVG(data, {
    theme: o.theme,
    background: o.background,
    languages,
    style: o.style,
    labels: o.labels,
    note: partial ? warnings[0] : undefined,
  });
  return { svg, stats: computeStats(data.weeks.slice(-53)), languages, warnings, partial, options: o };
}
