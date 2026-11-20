import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readInputs, run } from '../src/action.js';

test('readInputs maps INPUT_* env vars and keeps defaults empty', () => {
  const i = readInputs({ INPUT_GITHUB_USER_NAME: ' octocat ', INPUT_MODE: 'languages', INPUT_TIMEZONE: 'America/Bogota' });
  assert.equal(i.user, 'octocat');
  assert.equal(i.mode, 'languages');
  assert.equal(i.timeZone, 'America/Bogota');
  assert.equal(i.output, 'dist/commit-horizon.svg');
  assert.equal(i.theme, '');
});

test('run writes the SVG, the outputs and a job summary', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ch-action-'));
  const env = {
    INPUT_DEMO: 'true',
    INPUT_MODE: 'languages',
    INPUT_OUTPUT: join(dir, 'nested', 'hole.svg'),
    GITHUB_OUTPUT: join(dir, 'output.txt'),
    GITHUB_STEP_SUMMARY: join(dir, 'summary.md'),
  };
  await run(env);
  assert.match(await readFile(env.INPUT_OUTPUT, 'utf8'), /^<svg/);
  const out = await readFile(env.GITHUB_OUTPUT, 'utf8');
  assert.match(out, /^svg=.*hole\.svg$/m);
  assert.match(out, /^total=\d+$/m);
  assert.match(out, /^streak=\d+$/m);
  const summary = await readFile(env.GITHUB_STEP_SUMMARY, 'utf8');
  assert.match(summary, /Commit Horizon · @demo-astronaut/);
  assert.match(summary, /languages · color · space/);
});

test('run fails with a readable error for a bad input', async () => {
  await assert.rejects(run({ INPUT_GITHUB_USER_NAME: 'octocat', INPUT_THEME: 'neon' }), /Unknown theme "neon"/);
});
