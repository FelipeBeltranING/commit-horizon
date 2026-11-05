// Top languages of a user, by bytes of code across their own (non-fork) repos.

const UA = { 'User-Agent': 'commit-horizon' };

// GitHub linguist colors, used for the glow and as fallback when a logo is missing.
export const LINGUIST_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Dart: '#00B4AB',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Shell: '#89e051',
  GDScript: '#355570',
  'Jupyter Notebook': '#DA5B0B',
  Lua: '#000080',
  R: '#198CE7',
  Haskell: '#5e5086',
  Scala: '#c22d40',
  Elixir: '#6e4a7e',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  MATLAB: '#e16737',
  Dockerfile: '#384d54',
  Julia: '#a270ba',
  Zig: '#ec915c',
  Assembly: '#6E4C13',
};

export function topLanguages(bytesByLang, { limit = 6, exclude = [] } = {}) {
  const skip = new Set(exclude.map((s) => s.trim().toLowerCase()).filter(Boolean));
  const entries = Object.entries(bytesByLang).filter(([name, b]) => b > 0 && !skip.has(name.toLowerCase()));
  const total = entries.reduce((acc, [, b]) => acc + b, 0) || 1;
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, bytes]) => ({ name, bytes, share: bytes / total, color: LINGUIST_COLORS[name] ?? '#8b949e' }));
}

export function demoLanguages(opts) {
  return topLanguages(
    { Python: 412000, JavaScript: 318000, GDScript: 201000, 'C++': 150000, Java: 96000, TypeScript: 71000 },
    opts,
  );
}

const QUERY = `query($login: String!) {
  user(login: $login) {
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: PUSHED_AT, direction: DESC}) {
      nodes { languages(first: 10, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name } } } }
    }
  }
}`;

export async function fetchLanguages(user, { token = process.env.GITHUB_TOKEN, ...opts } = {}) {
  const bytes = {};
  const add = (name, n) => (bytes[name] = (bytes[name] ?? 0) + n);

  if (token) {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { ...UA, Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { login: user } }),
    });
    if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    for (const repo of json.data?.user?.repositories?.nodes ?? []) {
      for (const e of repo.languages.edges) add(e.node.name, e.size);
    }
  } else {
    // Unauthenticated REST is limited to 60 requests/hour, so use a single request:
    // each repo's main language, weighted by the repo size. With GITHUB_TOKEN the
    // GraphQL path above counts the exact bytes of every language instead.
    const res = await fetch(`https://api.github.com/users/${user}/repos?per_page=100&type=owner&sort=pushed`, {
      headers: UA,
    });
    if (res.status === 403 || res.status === 429) {
      throw new Error('GitHub rate limit reached (60 requests/hour without a token) — set GITHUB_TOKEN or wait');
    }
    if (res.status === 404) throw new Error(`user not found: ${user}`);
    if (!res.ok) throw new Error(`GitHub repos ${res.status}`);
    for (const r of await res.json()) {
      if (r.fork || !r.language) continue;
      add(r.language, Math.max(1, r.size) * 1024);
    }
  }
  return topLanguages(bytes, opts);
}
