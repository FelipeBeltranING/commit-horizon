// npm run demo  →  examples/commit-horizon-{color,bw,languages}.svg + out/preview.html
import { mkdir, writeFile } from 'node:fs/promises';
import { demoData } from '../src/demo.js';
import { withIcons } from '../src/icons.js';
import { demoLanguages } from '../src/languages.js';
import { renderSVG } from '../src/render.js';
import { previewPage } from './page.js';

await mkdir('examples', { recursive: true });
await mkdir('out', { recursive: true });
const data = demoData();
const languages = withIcons(demoLanguages());
const variants = {
  color: { theme: 'color' },
  bw: { theme: 'bw' },
  languages: { theme: 'color', languages },
};
for (const [name, opts] of Object.entries(variants)) {
  const svg = renderSVG(data, opts);
  await writeFile(`examples/commit-horizon-${name}.svg`, svg);
  console.log(`✔ examples/commit-horizon-${name}.svg (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)`);
}
const missing = languages.filter((l) => !l.icon).map((l) => l.name);
if (missing.length) console.warn(`ⓘ no logo for: ${missing.join(', ')} — run npm install to get devicon`);
await writeFile(
  'out/preview.html',
  previewPage({
    color: '../examples/commit-horizon-color.svg',
    bw: '../examples/commit-horizon-bw.svg',
    languages: '../examples/commit-horizon-languages.svg',
    user: data.user,
    live: false,
  }),
);
console.log('✔ out/preview.html  → open it in your browser');
