#!/usr/bin/env node
// Records an animated SVG as a video so it can be shared where SVGs don't play (Reddit, X, Discord…).
//
//   npm install                                   # once: Playwright is a dev dependency
//   node tools/record.mjs out/me.svg --out me.webm   # works with nothing else installed
//   node tools/record.mjs out/me.svg --out me.mp4    # needs ffmpeg on your PATH
//   node tools/record.mjs out/me.svg --out me.gif    # needs ffmpeg on your PATH
//   node tools/record.mjs out/me.svg --out me.png    # a still frame (poster / social preview)
//
// Options: --seconds 12  --width 840  --fps 30  --background "#0d1117"
// The browser: Playwright's Chromium if installed (npx playwright install chromium),
// otherwise your installed Chrome or Edge.
import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const FORMATS = ['.webm', '.mp4', '.gif', '.png'];

export function parseOptions(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      out: { type: 'string', short: 'o' },
      seconds: { type: 'string', default: '12' },
      width: { type: 'string', default: '840' },
      fps: { type: 'string', default: '30' },
      background: { type: 'string', default: '#0d1117' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help || !positionals[0]) return { help: true };
  const input = positionals[0];
  const out = values.out ?? input.replace(/\.svg$/i, '') + '.webm';
  const ext = extname(out).toLowerCase();
  if (!FORMATS.includes(ext)) throw new Error(`Unknown output format "${ext}". Use: ${FORMATS.join(', ')}`);
  const num = (name, min, max) => {
    const n = Number(values[name]);
    if (!Number.isFinite(n) || n < min || n > max) throw new Error(`--${name} must be between ${min} and ${max}`);
    return n;
  };
  if (!/^#[0-9a-f]{3,8}$|^transparent$/i.test(values.background)) throw new Error('--background must be a hex color');
  return {
    input,
    out,
    ext,
    seconds: num('seconds', 1, 60),
    width: Math.round(num('width', 200, 1920) / 2) * 2, // even sizes for video encoders
    fps: num('fps', 5, 60),
    background: values.background,
  };
}

/** Width/height from the SVG's viewBox (or width/height attributes), defaulting to 840×440. */
export function svgSize(svg) {
  const vb = svg.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/);
  if (vb) return { w: Number(vb[1]), h: Number(vb[2]) };
  const w = svg.match(/\bwidth="([\d.]+)"/)?.[1];
  const h = svg.match(/\bheight="([\d.]+)"/)?.[1];
  return w && h ? { w: Number(w), h: Number(h) } : { w: 840, h: 440 };
}

export function ffmpegArgs(src, out, { fps, width }) {
  if (out.endsWith('.gif')) {
    // Two-pass palette in one filter graph: GIFs look much better with their own palette.
    const scale = `fps=${Math.min(fps, 20)},scale=${width}:-1:flags=lanczos`;
    return ['-y', '-i', src, '-vf', `${scale},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`, '-loop', '0', out];
  }
  return ['-y', '-i', src, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', '-r', String(fps), out];
}

async function launch(chromium) {
  const tries = [{}, { channel: 'chrome' }, { channel: 'msedge' }];
  let last;
  for (const opts of tries) {
    try {
      return await chromium.launch(opts);
    } catch (err) {
      last = err;
    }
  }
  throw new Error(`No browser found. Run: npx playwright install chromium\n${last?.message.split('\n')[0] ?? ''}`);
}

async function record(o) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is missing. Run: npm install');
  }
  if (['.mp4', '.gif'].includes(o.ext) && spawnSync('ffmpeg', ['-version']).status !== 0) {
    throw new Error(`${o.ext} needs ffmpeg on your PATH (https://ffmpeg.org/download.html). Without it, use --out file.webm`);
  }

  const svg = await readFile(o.input, 'utf8');
  const { w, h } = svgSize(svg);
  const size = { width: o.width, height: Math.round((o.width * h) / w / 2) * 2 };
  const html = `<!doctype html><html><body style="margin:0;background:${o.background}">` +
    `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="display:block;width:${size.width}px;height:${size.height}px"></body></html>`;

  const browser = await launch(chromium);
  const dir = await mkdtemp(join(tmpdir(), 'commit-horizon-'));
  try {
    if (o.ext === '.png') {
      const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2 });
      await page.setContent(html);
      await page.waitForTimeout(1500); // let the orbits move away from frame 0
      await page.screenshot({ path: o.out, omitBackground: o.background === 'transparent' });
      return;
    }
    const context = await browser.newContext({ viewport: size, recordVideo: { dir, size } });
    const page = await context.newPage();
    await page.setContent(html);
    await page.waitForTimeout(o.seconds * 1000);
    const video = page.video();
    await context.close(); // flushes the video file
    const webm = await video.path();
    if (o.ext === '.webm') {
      await copyFile(webm, o.out);
      return;
    }
    const r = spawnSync('ffmpeg', ffmpegArgs(webm, o.out, o), { stdio: ['ignore', 'ignore', 'pipe'] });
    if (r.status !== 0) throw new Error(`ffmpeg failed:\n${r.stderr.toString().split('\n').slice(-6).join('\n')}`);
  } finally {
    await browser.close();
    await rm(dir, { recursive: true, force: true });
  }
}

async function main() {
  const o = parseOptions(process.argv.slice(2));
  if (o.help) {
    console.log('Usage: node tools/record.mjs <file.svg> [--out file.webm|mp4|gif|png] [--seconds 12] [--width 840] [--fps 30] [--background "#0d1117"]');
    return;
  }
  const t0 = Date.now();
  await record(o);
  const { size } = await stat(o.out);
  console.log(`✔ ${resolve(o.out)} (${(size / 1024 / 1024).toFixed(2)} MB, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  main().catch((err) => {
    console.error(`✖ ${err.message}`);
    process.exit(1);
  });
}
