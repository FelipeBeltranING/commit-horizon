#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { buildHole } from '../src/build.js';

const { values } = parseArgs({
  options: {
    user: { type: 'string', short: 'u' },
    theme: { type: 'string', short: 't', default: 'color' },
    background: { type: 'string', short: 'b', default: 'space' },
    mode: { type: 'string', short: 'm', default: 'disk' },
    style: { type: 'string', default: 'logos' },
    langs: { type: 'string', default: '6' },
    exclude: { type: 'string', default: '' },
    'no-labels': { type: 'boolean', default: false },
    timezone: { type: 'string', short: 'z' },
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
  --background space|transparent   dark space card (default) or float on your README
  --mode disk|languages     languages = your top languages orbit as planets
  --style logos|planets     floating logos (default) or logos inside planets
  --langs 6                 how many languages in orbit (1-8)
  --exclude "HTML,CSS"      languages to leave out
  --no-labels               hide "Python 24%" under each planet
  --timezone America/Bogota your time zone, so "today" is yours (default: this machine's)
  --out file.svg

Set GITHUB_TOKEN to use the GraphQL API (otherwise public endpoints are used).
Logos: icons/<language>.svg|png first (e.g. icons/python.png), then icons/devicon/.`);
  process.exit(values.help ? 0 : 1);
}

try {
  const { svg, warnings } = await buildHole({
    ...values,
    labels: !values['no-labels'],
    timeZone: values.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  for (const w of warnings) console.warn(`ⓘ ${w}`);
  await mkdir(dirname(values.out), { recursive: true });
  await writeFile(values.out, svg);
  console.log(`✔ ${values.out} (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error(`✖ ${err.message}`);
  process.exit(1);
}
