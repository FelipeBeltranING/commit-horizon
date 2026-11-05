#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { demoData } from '../src/demo.js';
import { fetchUserData } from '../src/github.js';
import { withIcons } from '../src/icons.js';
import { demoLanguages, fetchLanguages } from '../src/languages.js';
import { renderSVG, THEME_NAMES } from '../src/render.js';

const { values } = parseArgs({
  options: {
    user: { type: 'string', short: 'u' },
    theme: { type: 'string', short: 't', default: 'color' },
    mode: { type: 'string', short: 'm', default: 'disk' },
    style: { type: 'string', default: 'logos' },
    langs: { type: 'string', default: '6' },
    exclude: { type: 'string', default: '' },
    'no-labels': { type: 'boolean', default: false },
    out: { type: 'string', short: 'o', default: 'out/commit-horizon.svg' },
    demo: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help || (!values.user && !values.demo)) {
  console.log(`commit-horizon — your GitHub year falling into a black hole

Usage:
  commit-horizon --demo [options]
  commit-horizon --user <github-user> [options]

Options:
  --theme color|bw          color palette (default color)
  --mode disk|languages     languages = your top languages orbit as planets
  --style logos|planets     floating logos (default) or logos inside planets
  --langs 6                 how many languages in orbit (1-8)
  --exclude "HTML,CSS"      languages to leave out
  --no-labels               hide "Python 24%" under each planet
  --out file.svg

Set GITHUB_TOKEN to use the GraphQL API (otherwise public endpoints are used).
Logos: icons/<language>.svg|png first (e.g. icons/python.png), then the devicon package (npm install).`);
  process.exit(values.help ? 0 : 1);
}

if (!THEME_NAMES.includes(values.theme)) {
  console.error(`Unknown theme "${values.theme}". Use: ${THEME_NAMES.join(', ')}`);
  process.exit(1);
}
if (!['disk', 'languages'].includes(values.mode)) {
  console.error(`Unknown mode "${values.mode}". Use: disk, languages`);
  process.exit(1);
}

try {
  const user = values.user ?? 'demo-astronaut';
  const data = values.demo ? demoData({ user }) : await fetchUserData(user);
  let languages;
  if (values.mode === 'languages') {
    const opts = { limit: Math.min(8, Math.max(1, Number(values.langs) || 6)), exclude: values.exclude.split(',') };
    languages = withIcons(values.demo ? demoLanguages(opts) : await fetchLanguages(user, opts));
    const missing = languages.filter((l) => !l.icon).map((l) => l.name);
    if (missing.length) console.warn(`ⓘ no logo for: ${missing.join(', ')} (run npm install, or they show initials)`);
  }
  const svg = renderSVG(data, { theme: values.theme, languages, style: values.style, labels: !values['no-labels'] });
  await mkdir(dirname(values.out), { recursive: true });
  await writeFile(values.out, svg);
  console.log(`✔ ${values.out} (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error(`✖ ${err.message}`);
  process.exit(1);
}
