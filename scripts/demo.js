// npm run demo  →  out/commit-horizon-{color,bw}.svg + out/preview.html
import { mkdir, writeFile } from 'node:fs/promises';
import { demoData } from '../src/demo.js';
import { renderSVG } from '../src/render.js';
import { previewPage } from './page.js';

await mkdir('out', { recursive: true });
const data = demoData();
const variants = {
  color: { theme: 'color' },
  bw: { theme: 'bw' },
};
for (const [name, opts] of Object.entries(variants)) {
  const svg = renderSVG(data, opts);
  await writeFile(`out/commit-horizon-${name}.svg`, svg);
  console.log(`✔ out/commit-horizon-${name}.svg (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)`);
}
await writeFile(
  'out/preview.html',
  previewPage({
    color: 'commit-horizon-color.svg',
    bw: 'commit-horizon-bw.svg',
    user: data.user,
    live: false,
  }),
);
console.log('✔ out/preview.html  → open it in your browser');
