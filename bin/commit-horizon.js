#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { demoData } from '../src/demo.js';
import { fetchUserData } from '../src/github.js';
import { renderSVG, THEME_NAMES } from '../src/render.js';

const { values } = parseArgs({
  options: {
    user: { type: 'string', short: 'u' },
    theme: { type: 'string', short: 't', default: 'color' },
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
  --out file.svg

Set GITHUB_TOKEN to use the GraphQL API (otherwise public endpoints are used).`);
  process.exit(values.help ? 0 : 1);
}

if (!THEME_NAMES.includes(values.theme)) {
  console.error(`Unknown theme "${values.theme}". Use: ${THEME_NAMES.join(', ')}`);
  process.exit(1);
}

try {
  const user = values.user ?? 'demo-astronaut';
  const data = values.demo ? demoData({ user }) : await fetchUserData(user);
  const svg = renderSVG(data, { theme: values.theme });
  await mkdir(dirname(values.out), { recursive: true });
  await writeFile(values.out, svg);
  console.log(`✔ ${values.out} (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error(`✖ ${err.message}`);
  process.exit(1);
}
