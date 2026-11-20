import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ffmpegArgs, parseOptions, svgSize } from '../tools/record.mjs';

test('parseOptions defaults to a webm next to the SVG and validates', () => {
  const o = parseOptions(['out/me.svg']);
  assert.equal(o.out, 'out/me.webm');
  assert.equal(o.seconds, 12);
  assert.equal(o.width, 840);
  assert.equal(parseOptions(['a.svg', '--width', '641']).width, 642); // even, for encoders
  assert.equal(parseOptions([]).help, true);
  assert.throws(() => parseOptions(['a.svg', '--out', 'a.avi']), /Unknown output format/);
  assert.throws(() => parseOptions(['a.svg', '--seconds', '0']), /--seconds must be between/);
  assert.throws(() => parseOptions(['a.svg', '--background', 'red;']), /hex color/);
});

test('svgSize reads the viewBox, then width/height', () => {
  assert.deepEqual(svgSize('<svg viewBox="0 0 840 440">'), { w: 840, h: 440 });
  assert.deepEqual(svgSize('<svg width="300" height="100">'), { w: 300, h: 100 });
  assert.deepEqual(svgSize('<svg>'), { w: 840, h: 440 });
});

test('ffmpeg gets a palette for GIFs and web-friendly H.264 for MP4', () => {
  const gif = ffmpegArgs('in.webm', 'out.gif', { fps: 30, width: 840 }).join(' ');
  assert.match(gif, /fps=20/);
  assert.match(gif, /palettegen/);
  const mp4 = ffmpegArgs('in.webm', 'out.mp4', { fps: 30, width: 840 }).join(' ');
  assert.match(mp4, /libx264 .*yuv420p/);
  assert.match(mp4, /\+faststart/);
});
