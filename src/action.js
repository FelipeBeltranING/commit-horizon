// GitHub Action entry point. Inputs arrive as INPUT_<NAME> env vars (see action.yml);
// writes the SVG, a job summary and the outputs `svg`, `total` and `streak`.
// No @actions/core: the workflow-command protocol is a few lines of file appends.
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildHole } from './build.js';

export function readInputs(env = process.env) {
  const get = (name) => (env[`INPUT_${name.toUpperCase()}`] ?? '').trim();
  return {
    user: get('github_user_name'),
    token: get('github_token'),
    output: get('output') || 'dist/commit-horizon.svg',
    theme: get('theme'),
    background: get('background'),
    mode: get('mode'),
    style: get('style'),
    langs: get('langs') || undefined,
    exclude: get('exclude'),
    labels: get('labels'),
    timeZone: get('timezone'),
    demo: get('demo'),
  };
}

export function summary({ output, stats, options, warnings, bytes }) {
  const best = stats.best ? `${stats.best.date} (${stats.best.count})` : '—';
  return [
    `### 🕳️ Commit Horizon · @${options.user}`,
    '',
    '| | |',
    '| --- | --- |',
    `| Contributions (last 12 months) | **${stats.total.toLocaleString('en-US')}** |`,
    `| Current streak | ${stats.currentStreak} days |`,
    `| Longest streak | ${stats.longestStreak} days |`,
    `| Best day | ${best} |`,
    `| Mode · theme · background | ${options.mode} · ${options.theme} · ${options.background} |`,
    `| Output | \`${output}\` (${(bytes / 1024).toFixed(1)} KB) |`,
    ...(warnings.length ? ['', ...warnings.map((w) => `> ⚠️ ${w}`)] : []),
    '',
  ].join('\n');
}

export async function run(env = process.env) {
  const inputs = readInputs(env);
  const result = await buildHole(inputs);
  for (const w of result.warnings) console.log(`::warning::${w}`);

  await mkdir(dirname(inputs.output), { recursive: true });
  await writeFile(inputs.output, result.svg);
  const bytes = Buffer.byteLength(result.svg);
  console.log(`✔ ${inputs.output} (${(bytes / 1024).toFixed(1)} KB) · ${result.stats.total} contributions`);

  if (env.GITHUB_OUTPUT) {
    await appendFile(env.GITHUB_OUTPUT, `svg=${inputs.output}\ntotal=${result.stats.total}\nstreak=${result.stats.currentStreak}\n`);
  }
  if (env.GITHUB_STEP_SUMMARY) {
    await appendFile(env.GITHUB_STEP_SUMMARY, summary({ output: inputs.output, ...result, bytes }));
  }
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  run().catch((err) => {
    console.log(`::error::${err.message}`);
    process.exit(1);
  });
}
