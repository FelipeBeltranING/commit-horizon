// Fetches the contribution calendar for a user.
// With GITHUB_TOKEN it uses the GraphQL API; without it, it reads the public
// contributions page (the same HTML GitHub uses for the profile graph).
import { toWeeks } from './stats.js';

const UA = { 'User-Agent': 'commit-horizon' };

const QUERY = `query($login: String!) {
  user(login: $login) {
    repositories(privacy: PUBLIC, ownerAffiliations: OWNER) { totalCount }
    contributionsCollection {
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

export async function fetchUserData(user, { token = process.env.GITHUB_TOKEN } = {}) {
  if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(user)) throw new Error(`Invalid GitHub username: ${user}`);
  return token ? viaGraphQL(user, token) : viaPublicPage(user);
}

async function viaGraphQL(user, token) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...UA, Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { login: user } }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  const u = json.data?.user;
  if (!u) throw new Error(`User not found: ${user}`);
  const days = u.contributionsCollection.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount }));
  return { user, repos: u.repositories.totalCount, weeks: toWeeks(days) };
}

async function viaPublicPage(user) {
  const res = await fetch(`https://github.com/users/${user}/contributions`, { headers: UA });
  if (!res.ok) throw new Error(`GitHub contributions page ${res.status} for ${user}`);
  const days = parseContributionsHtml(await res.text());
  if (!days.length) throw new Error('Could not read the contribution calendar');
  let repos = 20;
  try {
    const r = await fetch(`https://api.github.com/users/${user}`, { headers: UA });
    if (r.ok) repos = (await r.json()).public_repos ?? repos;
  } catch {
    /* keep default */
  }
  return { user, repos, weeks: toWeeks(days) };
}

export function parseContributionsHtml(html) {
  const tips = new Map();
  for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    tips.set(m[1], m[2].trim());
  }
  const days = [];
  for (const m of html.matchAll(/<td\b[^>]*>/g)) {
    const tag = m[0];
    const date = tag.match(/data-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
    if (!date) continue;
    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    const tip = id ? tips.get(id) : undefined;
    let count = 0;
    const n = tip?.match(/^([\d,]+)\s+contribution/);
    if (n) count = Number(n[1].replace(/,/g, ''));
    else if (!tip) {
      // Fallback: data-level gives only a bucket, better than nothing.
      count = Number(tag.match(/data-level="(\d)"/)?.[1] ?? 0);
    }
    days.push({ date, count });
  }
  return days;
}
