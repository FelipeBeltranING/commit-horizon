// Copies the devicon logos listed in DEVICON_SLUGS into icons/devicon/, so the GitHub Action
// and the web generator show real logos without installing devicon (139 MB) at runtime.
// Usage: npm install && npm run vendor-icons
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEVICON_SLUGS } from '../src/icons.js';

const root = dirname(createRequire(import.meta.url).resolve('devicon/package.json'));
const out = fileURLToPath(new URL('../icons/devicon/', import.meta.url));
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

let n = 0;
for (const [lang, slug] of Object.entries(DEVICON_SLUGS)) {
  const variant = ['original', 'plain', 'original-wordmark'].find((v) => existsSync(join(root, 'icons', slug, `${slug}-${v}.svg`)));
  if (!variant) { console.warn(`ⓘ devicon has no logo for ${lang} (${slug})`); continue; }
  copyFileSync(join(root, 'icons', slug, `${slug}-${variant}.svg`), join(out, `${slug}.svg`));
  n++;
}
copyFileSync(join(root, 'LICENSE'), join(out, 'LICENSE'));
console.log(`✔ ${n} logos in icons/devicon/ (${readdirSync(out).length - 1} files + LICENSE)`);
